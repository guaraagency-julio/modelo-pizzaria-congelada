import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { loggedIn, allowOrigin } from "./admin.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({error:"Método não permitido."}); }
  if (!allowOrigin(req)) return res.status(403).json({error:"Origem não autorizada."});
  if (!loggedIn(req)) return res.status(401).json({error:"Acesse o painel antes de enviar fotos."});
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return res.status(415).json({error:"Formato de envio inválido."});
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const data = body.image;
    if (typeof data !== "string" || !data.startsWith("data:image/jpeg;base64,")) return res.status(400).json({error:"Envie uma imagem JPEG válida."});
    const b64 = data.slice("data:image/jpeg;base64,".length);
    if (b64.length > 2000000 || b64.length < 100 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return res.status(413).json({error:"Foto inválida ou grande demais. Tente uma imagem menor."});
    const buffer = Buffer.from(b64, "base64");
    if (buffer.length > 1450000 || buffer.length < 100 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return res.status(400).json({error:"Arquivo JPEG inválido."});
    const id = randomUUID();
    const path = "lenta/photos/" + id + ".jpg";
    await put(path, buffer, {
      access: "private",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    const hostname = process.env.VERCEL_PROJECT_PRODUCTION_URL || "modelo-pizzaria-congelada.vercel.app";
    return res.status(201).json({ok:true,url:"https://" + hostname + "/api/photo?id=" + id});
  } catch (error) {
    console.error("photo_upload_failed", error?.message);
    return res.status(503).json({error:"Não foi possível armazenar a foto. Confira a conexão e tente novamente."});
  }
}
