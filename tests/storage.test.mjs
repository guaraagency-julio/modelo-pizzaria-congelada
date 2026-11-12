import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/storage.js", import.meta.url), "utf8");
const seed = (await import("../shared/seed.js")).SEED;

function backend(legacy) {
 const files = new Map();
 if (legacy) files.set("lenta/catalog.json", JSON.stringify(legacy));
 const context = vm.createContext({
  Response, process: {env:{BLOB_READ_WRITE_TOKEN:"testing"}}, console,
 });
 const blob = new vm.SyntheticModule(["get","put","list"],function(){
  this.setExport("get", async pathname => {
   const contents = files.get(pathname);
   return contents ? {statusCode:200,stream:new Blob([contents]).stream()} : null;
  });
  this.setExport("put", async (pathname, contents, options={}) => {
   if (files.has(pathname) && !options.allowOverwrite) throw new Error("Object already exists");
   files.set(pathname,contents);
   return {pathname};
  });
  this.setExport("list", async ({prefix})=>({
   blobs:[...files.keys()].filter(path=>path.startsWith(prefix)).map(pathname=>({pathname})),
   hasMore:false,
  }));
 },{context});
 const seedModule = new vm.SyntheticModule(["SEED"],function(){this.setExport("SEED",seed);},{context});
 const module = new vm.SourceTextModule(source,{context});
 return { files, ready:(async()=>{await module.link(specifier=>{
   if(specifier==="@vercel/blob")return blob;
   if(specifier==="../shared/seed.js")return seedModule;
   throw new Error(specifier);
  });await module.evaluate();return module.namespace;})()};
}

test("first save creates an immutable revision without mutating the seed",async()=>{
 const store=backend();
 const api=await store.ready;
 assert.equal((await api.readCatalog()).data.version,1);
 const revision={...structuredClone(seed),version:2,stockOut:{"2026-11-12":["pizza-01"]}};
 await api.saveCatalog(revision,1);
 assert.equal(store.files.has("lenta/catalog.json"),false);
 assert.equal((await api.readCatalog()).data.version,2);
 assert.deepEqual(Array.from((await api.readCatalog()).data.stockOut["2026-11-12"]),["pizza-01"]);
});
test("concurrent edits for same version do not overwrite a published revision",async()=>{
 const store=backend();const api=await store.ready;
 await Promise.all([
  api.saveCatalog({...structuredClone(seed),version:2,stockOut:{"2026-11-12":["pizza-01"]}},1),
  api.saveCatalog({...structuredClone(seed),version:2,stockOut:{"2026-11-12":["pizza-02"]}},1)
 ].map(p=>p.catch(e=>e)));
 const read=await api.readCatalog();
 assert.equal(read.data.version,2);
 assert.equal(Object.keys(read.data.stockOut["2026-11-12"]).length,1);
 assert.equal([...store.files.keys()].filter(p=>p.startsWith("lenta/catalog-revisions/")).length,1);
});
test("legacy persisted catalog is preserved on migration",async()=>{
 const original={...structuredClone(seed),version:7,stockOut:{"2026-11-13":["pizza-05"]}};
 const store=backend(original);const api=await store.ready;
 assert.equal((await api.readCatalog()).data.version,7);
 const next={...structuredClone(original),version:8,stockOut:{"2026-11-13":["pizza-05","pizza-06"]}};
 await api.saveCatalog(next,7);
 assert.equal((await api.readCatalog()).data.version,8);
 assert.equal(JSON.parse(store.files.get("lenta/catalog.json")).version,7);
 await assert.rejects(api.saveCatalog({...next,version:8},7),{status:409});
});
