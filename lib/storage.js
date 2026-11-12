import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { SEED } from "../shared/seed.js";

const PATH = "lenta/catalog.json";
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const hasStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));

export async function readCatalog() {
 if (!hasStore()) return { data: clone(SEED), etag: null, persistent: false };
 const file = await get(PATH, { access: "private", useCache: false });
 if (!file) return { data: clone(SEED), etag: null, persistent: true };
 if (file.statusCode !== 200 || !file.stream) throw new Error("Falha ao ler o catálogo");
 const data = await new Response(file.stream).json();
 return { data, etag: file.blob.etag, persistent: true };
}
export async function saveCatalog(data, etag) {
 if (!hasStore()) throw new Error("Armazenamento não configurado");
 const options = { access:"private", allowOverwrite:true, addRandomSuffix:false, contentType:"application/json", cacheControlMaxAge:60 };
 if (etag) options.ifMatch = etag;
 try {
  await put(PATH, JSON.stringify(data), options);
 } catch (error) {
  if (error instanceof BlobPreconditionFailedError) {
   const conflict = new Error("O catálogo foi alterado em outra sessão. Atualize a página antes de salvar.");
   conflict.status = 409; throw conflict;
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
 if(!isString(obj.settings.brand,65)||!isString(obj.settings.description,500)||!isString(obj.settings.city,120)||!isString(obj.settings.deliveryNote||"",400)||!isString(obj.settings.pickupNote||"",400))throw new Error("Dados da empresa inválidos.");
 if(!/^\d{10,15}$/.test(String(obj.settings.whatsapp||"").replace(/\D/g,"")))throw new Error("WhatsApp inválido.");
 return true;
}
