import { get, put, list } from "@vercel/blob";
import { SEED } from "../shared/seed.js";

// O histórico é imutável: um arquivo por publicação.
// Evita ETags conflitantes e leituras em cache de um único arquivo sobrescrito.
const LEGACY_PATH = "lenta/catalog.json";
const REVISION_PREFIX = "lenta/catalog-revisions/";
const clone = (obj) => JSON.parse(JSON.stringify(obj));
function normalizeDemoBrand(data) {
 // Migração de apresentação: preserva sabores, bloqueios de estoque,
 // programação e revisões existentes. A próxima publicação persiste a nova marca.
 const result = clone(data);
 if (result.settings && ["LENTA","PIZZA TOP"].includes(String(result.settings.brand||"").trim().toUpperCase())) {
  result.settings.brand = "Pronta Pizzaria";
 }
 return result;
}
const hasStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));

function versionPath(version) {
 if (!Number.isSafeInteger(version) || version < 2 || version > 999999999) throw new Error("Versão de catálogo inválida.");
 return REVISION_PREFIX + String(version).padStart(9, "0") + ".json";
}

async function latestRevision() {
 let cursor;
 let latest = null;
 let pages = 0;
 do {
  const page = await list({ prefix: REVISION_PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
  for (const blob of page.blobs || []) {
   const match = /^lenta\/catalog-revisions\/(\d{9})\.json$/.exec(blob.pathname);
   if (match) {
    const version = Number(match[1]);
    if (version >= 2 && (!latest || version > latest.version)) latest = { pathname: blob.pathname, version };
   }
  }
  cursor = page.hasMore ? page.cursor : undefined;
  if (++pages > 100) throw new Error("Histórico muito extenso para consultar.");
 } while (cursor);
 return latest;
}

async function getData(path) {
 const file = await get(path, { access: "private", useCache: false });
 if (!file) return null;
 if (file.statusCode !== 200 || !file.stream) throw new Error("Falha ao ler o catálogo.");
 return new Response(file.stream).json();
}

export async function readCatalog() {
 if (!hasStore()) return { data: clone(SEED), etag: null, persistent: false };
 const latest = await latestRevision();
 if (latest) {
  const data = await getData(latest.pathname);
  if (!data || data.version !== latest.version) throw new Error("Revisão do catálogo inconsistente.");
  return { data: normalizeDemoBrand(data), etag: null, persistent: true };
 }
 // Migração não destrutiva: mantém os dados já publicados no formato anterior.
 const legacy = await getData(LEGACY_PATH);
 return { data: normalizeDemoBrand(legacy || SEED), etag: null, persistent: true };
}

export async function saveCatalog(data, expectedVersion) {
 if (!hasStore()) throw new Error("Armazenamento não configurado.");
 const actual = await readCatalog();
 if (actual.data.version !== expectedVersion) {
  const err = new Error("Outra edição já foi publicada. Atualize o painel para revisar os dados antes de salvar.");
  err.status = 409;
  throw err;
 }
 if (data.version !== expectedVersion + 1) throw new Error("Número da nova revisão inválido.");
 const path = versionPath(data.version);
 try {
  await put(path, JSON.stringify(data), {
   access: "private",
   addRandomSuffix: false,
   contentType: "application/json",
   cacheControlMaxAge: 31536000
   // Não usar allowOverwrite: duas publicações concorrentes da mesma versão
   // competem pelo mesmo pathname; apenas a primeira pode ser criada.
  });
 } catch (error) {
  // Distingue falha por publicação concorrente de falha do armazenamento.
  const refreshed = await readCatalog();
  if (refreshed.data.version >= data.version) {
   const err = new Error("Uma edição mais recente foi publicada. Recarregue os dados antes de tentar novamente.");
   err.status = 409;
   throw err;
  }
  throw error;
 }
}

const isString=(s,max)=>typeof s==="string"&&s.length<=max;
export function validateCatalog(obj) {
 if(!obj||typeof obj!=="object"||!obj.settings||!Array.isArray(obj.products)||!obj.schedules)throw new Error("Estrutura do catálogo inválida.");
 if(obj.products.length>300)throw new Error("Limite de 300 sabores neste modelo.");
 const ids=new Set();
 for(const p of obj.products){
  if(!isString(p.id,60)||!p.id||ids.has(p.id))throw new Error("Identificador de sabor inválido ou duplicado.");
  ids.add(p.id);
  if(!isString(p.name,90)||!p.name.trim()||!isString(p.description,400)||!isString(p.category,80)||!isString(p.tag||"",45))throw new Error("Informações de sabor inválidas.");
  if(!Number.isFinite(p.price)||p.price<0||p.price>10000)throw new Error("Preço inválido.");
  if(typeof p.active!=="boolean")throw new Error("Status de sabor inválido.");
  if(!isString(p.image,600)||!/^https:\/\//i.test(p.image))throw new Error("A foto precisa ter uma URL HTTPS.");
 }
 if(Object.keys(obj.schedules).length>60)throw new Error("Limite de 60 meses programados.");
 for(const [month,weeks] of Object.entries(obj.schedules)){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Array.isArray(weeks)||weeks.length!==4)throw new Error("Programação mensal inválida.");
  for(const week of weeks){
   if(!Array.isArray(week)||week.length!==4||new Set(week).size!==4)throw new Error("Cada semana deve ter exatamente 4 sabores diferentes.");
   for(const id of week){if(!ids.has(id)||obj.products.find(p=>p.id===id)?.active===false)throw new Error("Programação com sabor inexistente ou inativo.");}
  }
 }
 const soldOut=obj.stockOut||{};
 if(!soldOut || typeof soldOut!=="object" || Array.isArray(soldOut))throw new Error("Estoque diário inválido.");
 if(Object.keys(soldOut).length>1200)throw new Error("Limite de dias com estoque bloqueado atingido.");
 for(const [day,flavors] of Object.entries(soldOut)){
  if(!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(day) || new Date(day+"T12:00:00").toISOString().slice(0,10)!==day)throw new Error("Data de bloqueio de estoque inválida.");
  if(!Array.isArray(flavors)||flavors.length>300||new Set(flavors).size!==flavors.length||flavors.some(id=>!ids.has(id)))throw new Error("Sabores bloqueados inválidos.");
 }
 if(!isString(obj.settings.brand,65)||!isString(obj.settings.description,500)||!isString(obj.settings.city,120)||!isString(obj.settings.deliveryNote||"",400)||!isString(obj.settings.pickupNote||"",400))throw new Error("Dados da empresa inválidos.");
 if(!/^\d{10,15}$/.test(String(obj.settings.whatsapp||"").replace(/\D/g,"")))throw new Error("WhatsApp inválido.");
 return true;
}
