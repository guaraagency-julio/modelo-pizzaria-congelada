import { SEED } from "./shared/seed.js";
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n)||0);
const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const months=m=>new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(m+"-05T12:00:00"));
const pad=n=>String(n).padStart(2,"0");
const range=(m,w)=>{const [year,month]=m.split("-").map(Number);return pad([1,8,15,22][w])+"–"+pad(w===3?new Date(year,month,0).getDate():[7,14,21][w])+"/"+pad(month);};
const goodImg=src=>{try{const u=new URL(src);return u.protocol==="https:"?u.href:SEED.products[0].image;}catch{return SEED.products[0].image;}};
let catalog=null,editedProduct=null,selectedWeek=0,selectedMonth="2026-11",dirty=false,toastTime;
function toast(msg){const el=$("#admin-toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTime);toastTime=setTimeout(()=>el.classList.remove("show"),3700);}
async function api(url,options={}){
 const res=await fetch(url,{credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},...options});
 let result;try{result=await res.json();}catch{throw new Error("Não foi possível acessar o servidor.");}
 if(!res.ok)throw new Error(result.error||"Falha na requisição.");
 return result;
}
function markDirty(){dirty=true;$("#save-state").textContent="Alterações aguardando publicação";$("#save-state").style.color="#a14a35";}
function markClean(){dirty=false;$("#save-state").textContent="Tudo publicado";$("#save-state").style.color="#6e8970";}
function setTab(name){
 document.querySelectorAll(".admin-tabs button").forEach(b=>{const on=b.dataset.tab===name;b.classList.toggle("active",on);b.setAttribute("aria-selected",String(on));});
 ["schedule","products","settings"].forEach(id=>$("#"+id+"-panel").hidden=id!==name);
}
function stats(){
 const active=catalog.products.filter(p=>p.active!==false);
 const month=catalog.schedules[selectedMonth]||[];
 $("#stats").innerHTML=[
  ["Sabores cadastrados",catalog.products.length],
  ["Sabores ativos",active.length],
  ["Sabores no mês",(new Set(month.flat())).size],
  ["Semanas programadas",month.filter(w=>w.length===4).length+"/4"]
 ].map(a=>'<div class="stat-card"><span>'+a[0]+'</span><strong>'+a[1]+'</strong></div>').join("");
}
function updateSelectedWeek(){
 const arr=catalog.schedules[selectedMonth]?.[selectedWeek]||[];
 $("#editing-week-title").textContent="Semana "+(selectedWeek+1);
 $("#editing-week-range").textContent="De "+range(selectedMonth,selectedWeek)+" · "+months(selectedMonth);
 $("#selected-count").textContent=arr.length;
}
function renderWeeks(){
 $("#admin-weeks").innerHTML=[0,1,2,3].map(i=>{
  const ids=catalog.schedules[selectedMonth]?.[i]||[];
  return '<button class="admin-week '+(selectedWeek===i?"active":"")+'" data-week="'+i+'"><strong>Semana '+(i+1)+'</strong><small>'+range(selectedMonth,i)+'</small><span class="names">'+ids.map(id=>'<span>'+clean(catalog.products.find(p=>p.id===id)?.name||"Sabor removido")+'</span>').join("")+'</span></button>';
 }).join("");
 document.querySelectorAll(".admin-week").forEach(btn=>btn.addEventListener("click",()=>{selectedWeek=Number(btn.dataset.week);renderSchedule();}));
}
function filteredProducts(search){
 const q=search.trim().toLocaleLowerCase("pt-BR");
 return catalog.products.filter(p=>p.active!==false&&[p.name,p.category,p.description].some(s=>s.toLocaleLowerCase("pt-BR").includes(q)));
}
function renderPicker(){
 const picks=catalog.schedules[selectedMonth]?.[selectedWeek]||[];
 const matches=filteredProducts($("#schedule-search").value);
 const list=$("#schedule-picker");
 if(!matches.length){list.innerHTML='<p>Nenhum sabor encontrado.</p>';return;}
 list.innerHTML=matches.map(p=>{
  const yes=picks.includes(p.id);
  return '<label class="pick-row '+(yes?"checked":"")+'"><input type="checkbox" data-pick="'+clean(p.id)+'" '+(yes?"checked":"")+'><img loading="lazy" src="'+clean(goodImg(p.image))+'" alt=""><span><span class="pick-name">'+clean(p.name)+'</span><span class="pick-price">'+money(p.price)+'</span></span></label>';
 }).join("");
 list.querySelectorAll("[data-pick]").forEach(input=>input.addEventListener("change",()=>{
  const id=input.dataset.pick,week=catalog.schedules[selectedMonth][selectedWeek];
  if(input.checked){
   if(week.length>=4){input.checked=false;return toast("Cada semana comporta quatro sabores. Desmarque um para trocar.");}
   week.push(id);
  }else{const ix=week.indexOf(id);if(ix!==-1)week.splice(ix,1);}
  markDirty();renderSchedule();
 }));
}
function renderSchedule(){stats();renderWeeks();updateSelectedWeek();renderPicker();}
function addMonth(m){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))return;
 if(!catalog.schedules[m]){
  const first=catalog.products.filter(p=>p.active!==false).slice(0,16).map(p=>p.id);
  if(first.length<4)return toast("Cadastre ao menos quatro sabores ativos antes de criar um mês.");
  catalog.schedules[m]=[0,1,2,3].map(i=>Array.from({length:4},(_,j)=>first[(i*4+j)%first.length]));
  markDirty();toast("Novo mês criado. Revise cada semana e publique.");
 }
 selectedMonth=m;selectedWeek=0;renderSchedule();
}
function editProduct(id){
 editedProduct=id||null;
 const p=catalog.products.find(p=>p.id===id);
 $("#product-editor-title").textContent=p?"Editar sabor":"Novo sabor";
 $("#p-id").value=p?.id||"";
 $("#p-name").value=p?.name||"";
 $("#p-description").value=p?.description||"";
 $("#p-price").value=p?.price??"";
 $("#p-category").value=p?.category||"Clássicas";
 $("#p-tag").value=p?.tag||"";
 $("#p-image").value=p?.image||SEED.products[0].image;
 $("#p-active").checked=p?.active!==false;
 $("#image-preview").src=goodImg($("#p-image").value);
 renderProducts();
}
function renderProducts(){
 const q=$("#product-search").value.trim().toLocaleLowerCase("pt-BR");
 const rows=catalog.products.filter(p=>[p.name,p.category,p.description].some(s=>s.toLocaleLowerCase("pt-BR").includes(q)));
 $("#admin-products").innerHTML=rows.map(p=>
 '<button class="admin-product-row '+(editedProduct===p.id?"selected":"")+'" data-edit="'+clean(p.id)+'"><img loading="lazy" src="'+clean(goodImg(p.image))+'" alt=""><span class="item-info"><strong>'+clean(p.name)+'</strong><small>'+clean(p.category)+(p.active===false?" · Inativo":"")+'</small></span><b>'+money(p.price)+'</b></button>'
 ).join("")||'<div class="empty-state">Nenhum sabor encontrado.</div>';
 document.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>{editProduct(btn.dataset.edit);if(innerWidth<780)$("#product-form").scrollIntoView({behavior:"smooth"});}));
}
function saveProduct(e){
 e.preventDefault();
 const name=$("#p-name").value.trim(),description=$("#p-description").value.trim(),image=$("#p-image").value.trim();
 const price=Number($("#p-price").value),active=$("#p-active").checked;
 if(!name||!Number.isFinite(price)||price<0||!/^https:\/\//.test(image))return toast("Preencha corretamente nome, preço e URL HTTPS da imagem.");
 if(!active&&editedProduct&&Object.values(catalog.schedules).some(weeks=>weeks.some(week=>week.includes(editedProduct))))return toast("Retire esse sabor das semanas programadas antes de desativar.");
 if(!editedProduct&&catalog.products.length>=300)return toast("O limite deste modelo é 300 sabores.");
 const id=editedProduct||"pizza-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
 const updated={id,name,description,price,category:$("#p-category").value.trim()||"Clássicas",image,tag:$("#p-tag").value.trim(),active};
 const idx=catalog.products.findIndex(p=>p.id===id);
 if(idx===-1)catalog.products.push(updated);else catalog.products[idx]=updated;
 editedProduct=id;markDirty();renderProducts();renderSchedule();toast("Sabor atualizado. Publique para aparecer no site.");
}
function settingsToForm(){
 const s=catalog.settings;
 $("#s-brand").value=s.brand||"";
 $("#s-whatsapp").value=s.whatsapp||"";
 $("#s-city").value=s.city||"";
 $("#s-description").value=s.description||"";
 $("#s-delivery").value=s.deliveryNote||"";
 $("#s-pickup").value=s.pickupNote||"";
}
function saveSettings(e){
 e.preventDefault();
 const phone=$("#s-whatsapp").value.replace(/\D/g,"");
 if(phone.length<10||phone.length>15)return toast("Informe um WhatsApp válido com DDI e DDD.");
 Object.assign(catalog.settings,{brand:$("#s-brand").value.trim(),whatsapp:phone,city:$("#s-city").value.trim(),description:$("#s-description").value.trim(),deliveryNote:$("#s-delivery").value.trim(),pickupNote:$("#s-pickup").value.trim()});
 markDirty();toast("Dados aplicados. Publique para atualizar o site.");
}
async function publish(){
 if(!dirty)return toast("Não há alterações para publicar.");
 const weeks=catalog.schedules;
 if(Object.entries(weeks).some(([,rows])=>rows.length!==4||rows.some(ids=>ids.length!==4||new Set(ids).size!==4)))return toast("Complete os quatro sabores de todas as semanas antes de publicar.");
 $("#save-all").disabled=true;$("#save-all").textContent="Publicando...";
 try{
  const response=await api("/api/admin?action=save",{method:"POST",body:JSON.stringify({catalog,version:catalog.version})});
  catalog=response.catalog;markClean();renderAll();toast("Programação publicada! Atualize a vitrine para conferir.");
 }catch(err){toast(err.message);$("#save-state").textContent="Erro na publicação";}
 finally{$("#save-all").disabled=false;$("#save-all").innerHTML='Publicar alterações <span>↗</span>';}
}
function renderAll(){
 if(!catalog)return;
 $("#dashboard").hidden=false;$("#login-area").hidden=true;$("#logout").hidden=false;
 const now=new Date(),key=now.getFullYear()+"-"+pad(now.getMonth()+1);
 selectedMonth=Object.keys(catalog.schedules).includes(selectedMonth)?selectedMonth:(Object.keys(catalog.schedules).includes(key)?key:Object.keys(catalog.schedules).sort().at(-1));
 $("#admin-month").value=selectedMonth;
 renderSchedule();renderProducts();settingsToForm();
 if(catalog.products.length)editProduct(catalog.products[0].id);
}
async function refresh(){
 const response=await api("/api/admin");
 catalog=response.catalog;markClean();renderAll();
 if(!response.persistent)toast("Atenção: armazenamento persistente não configurado.");
}
function setup(){
 $("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();$("#login-message").textContent="Verificando...";
  try{await api("/api/admin?action=login",{method:"POST",body:JSON.stringify({password:$("#login-password").value})});$("#login-password").value="";$("#login-message").textContent="";await refresh();}
  catch(err){$("#login-message").textContent=err.message;}
 });
 $("#logout").addEventListener("click",async()=>{
  if(dirty&&!confirm("Há alterações não publicadas. Deseja sair?"))return;
  try{await api("/api/admin?action=logout",{method:"POST",body:"{}"});}catch{}
  location.reload();
 });
 document.querySelectorAll(".admin-tabs button").forEach(btn=>btn.addEventListener("click",()=>setTab(btn.dataset.tab)));
 $("#admin-month").addEventListener("change",e=>addMonth(e.target.value));
 $("#schedule-search").addEventListener("input",renderPicker);
 $("#product-search").addEventListener("input",renderProducts);
 $("#new-product").addEventListener("click",()=>editProduct(null));
 $("#p-image").addEventListener("change",()=>$("#image-preview").src=goodImg($("#p-image").value));
 $("#product-form").addEventListener("submit",saveProduct);
 $("#settings-form").addEventListener("submit",saveSettings);
 $("#save-all").addEventListener("click",publish);
 window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
 setTab("schedule");
 refresh().catch(()=>{});
}
setup();