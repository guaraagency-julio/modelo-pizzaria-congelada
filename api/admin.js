import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { readCatalog, saveCatalog, validateCatalog } from "../lib/storage.js";

const COOKIE="lenta_admin_session";
const MAX_AGE=6*60*60;
const secret=()=>process.env.ADMIN_SESSION_SECRET||"";
const configured=()=>!!(process.env.ADMIN_PASSWORD&&secret());
const equal=(a,b)=> {
 const x=Buffer.from(createHash("sha256").update(String(a)).digest("hex"));
 const y=Buffer.from(createHash("sha256").update(String(b)).digest("hex"));
 return timingSafeEqual(x,y);
};
const signature=(expiry,agent)=>createHmac("sha256",secret()).update(expiry+"|"+agent).digest("hex");
function loggedIn(req){
 if(!configured())return false;
 const header=req.headers.cookie||"";
 const token=header.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.split("=")[1];
 if(!token)return false;
 const [exp,sign]=decodeURIComponent(token).split(".");
 if(!/^\d{10,14}$/.test(exp||"")||Number(exp)<Date.now()||!/^[a-f0-9]{64}$/.test(sign||""))return false;
 return equal(sign,signature(exp,req.headers["user-agent"]||""));
}
function cookie(req){
 const exp=String(Date.now()+MAX_AGE*1000);
 return COOKIE+"="+exp+"."+signature(exp,req.headers["user-agent"]||"")+"; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age="+MAX_AGE;
}
function allowOrigin(req){
 if(!req.headers.origin)return true;
 try {return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store, max-age=0");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("X-Frame-Options","DENY");
 res.setHeader("Vary","Cookie");
 if(!["GET","POST"].includes(req.method))return res.status(405).json({error:"Método não permitido"});
 if(req.method==="POST"&&!allowOrigin(req))return res.status(403).json({error:"Origem não permitida"});
 if(!configured())return res.status(503).json({error:"Painel protegido ainda não foi configurado no servidor."});
 const action=String(req.query.action||"");
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
 if(req.method==="POST"&&action==="login"){
  if(typeof body.password!=="string"||body.password.length>256||!equal(body.password,process.env.ADMIN_PASSWORD))return res.status(401).json({error:"Senha incorreta."});
  res.setHeader("Set-Cookie",cookie(req));
  return res.status(200).json({authenticated:true});
 }
 if(req.method==="POST"&&action==="logout"){
  res.setHeader("Set-Cookie",COOKIE+"=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0");
  return res.status(200).json({ok:true});
 }
 if(!loggedIn(req))return res.status(401).json({authenticated:false,error:"Sessão encerrada. Entre novamente."});
 if(req.method==="GET"){
  try{const {data,persistent}=await readCatalog();return res.status(200).json({authenticated:true,catalog:data,persistent});}
  catch(error){console.error("admin_read_failed",error?.message);return res.status(503).json({error:"Não foi possível carregar a programação."});}
 }
 if(action!=="save")return res.status(400).json({error:"Ação inválida"});
 try{
  if(!body.catalog||JSON.stringify(body.catalog).length>280000)return res.status(413).json({error:"Catálogo muito grande"});
  const {data,etag,persistent}=await readCatalog();
  if(!persistent)return res.status(503).json({error:"Armazenamento persistente ainda não configurado."});
  if(body.version!==data.version)return res.status(409).json({error:"Outra edição foi publicada. Atualize e tente novamente."});
  const next=body.catalog;
  validateCatalog(next);
  next.version=data.version+1;
  next.demo=true;
  next.updatedAt=new Date().toISOString();
  await saveCatalog(next,etag);
  return res.status(200).json({ok:true,catalog:next});
 }catch(error){
  console.error("admin_save_failed",error?.message);
  return res.status(error.status||400).json({error:error.status?error.message:"Não foi possível salvar: "+error.message});
 }
}
