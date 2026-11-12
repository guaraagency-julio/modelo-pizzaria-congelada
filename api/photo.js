import { Readable } from "node:stream";
import { get } from "@vercel/blob";

export default async function handler(req,res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if(req.method !== "GET"){res.setHeader("Allow","GET");return res.status(405).end();}
  const id = typeof req.query.id === "string" ? req.query.id : "";
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))return res.status(404).end();
  try {
    const blob = await get("lenta/photos/"+id+".jpg", {access:"private",useCache:true});
    if(!blob || blob.statusCode !== 200 || !blob.stream)return res.status(404).end();
    res.setHeader("Content-Type","image/jpeg");
    res.setHeader("Cache-Control","public, max-age=31536000, s-maxage=31536000, immutable");
    res.setHeader("Content-Disposition",'inline; filename="pizza.jpg"');
    res.setHeader("Cross-Origin-Resource-Policy","cross-origin");
    if(Number.isFinite(blob.blob?.size))res.setHeader("Content-Length",String(blob.blob.size));
    return Readable.fromWeb(blob.stream).pipe(res);
  }catch(error){
    console.error("photo_read_failed",error?.message);
    if(!res.headersSent)return res.status(404).end();
    res.end();
  }
}
