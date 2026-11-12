import { readCatalog } from "../lib/storage.js";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store, max-age=0");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Método não permitido"});}
 try{
  const {data}=await readCatalog();
  return res.status(200).json(data);
 }catch(error){
  console.error("catalog_read_failed",error?.message);
  return res.status(503).json({error:"Catálogo temporariamente indisponível."});
 }
}
