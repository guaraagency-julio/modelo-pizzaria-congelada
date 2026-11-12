import { SEED } from "./shared/seed.js";
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n)||0);
const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const months=m=>new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(m+"-05T12:00:00"));
const pad=n=>String(n).padStart(2,"0");
const range=(m,w)=>{const [year,month]=m.split("-").map(Number);return pad([1,8,15,22][w])+"–"+pad(w===3?new Date(year,month,0).getDate():[7,14,21][w])+"/"+pad(month);};
const goodImg=src=>{try{const u=new URL(src);return u.protocol==="https:"?u.href:SEED.products[0].image;}catch{return SEED.products[0].image;}};
let catalog=null,editedProduct=null,selectedWeek=0,selectedMonth="2026-11",dirty=false,toastTime;
let stockMonth="",stockWeek=0,stockSelectedDays=new Set(),stockSelectedFlavors=new Set();
const pendingPhotos={p:null,q:null};
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
 ["schedule","quick","products","stock","settings"].forEach(id=>$("#"+id+"-panel").hidden=id!==name);
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
function monthShift(month,delta) {
 const [year,m]=month.split("-").map(Number); const d=new Date(year,m-1+delta,1);
 return d.getFullYear()+"-"+pad(d.getMonth()+1);
}
function programNewMonths(){
 const start=$("#admin-month").value||selectedMonth;
 const active=catalog.products.filter(p=>p.active!==false).map(p=>p.id);
 if(active.length<4)return toast("Cadastre pelo menos quatro sabores ativos.");
 let added=0;
 for(let i=0;i<12;i++){
  const month=monthShift(start,i);
  if(catalog.schedules[month])continue;
  if(Object.keys(catalog.schedules).length>=60){toast("Limite de 60 meses atingido.");break;}
  const offset=i*3;
  catalog.schedules[month]=[0,1,2,3].map(week=>Array.from({length:4},(_,j)=>active[(offset+week*4+j)%active.length]));
  added++;
 }
 selectedMonth=start; selectedWeek=0;$("#admin-month").value=start;
 if(added){markDirty();renderSchedule();toast(added+" meses programados. Revise os sabores e publique.");}
 else toast("Os próximos 12 meses já estão programados.");
}
function addMonth(m){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))return;
 if(!catalog.schedules[m]){
  if(Object.keys(catalog.schedules).length>=60)return toast("Limite de 60 meses atingido.");
  const first=catalog.products.filter(p=>p.active!==false).slice(0,16).map(p=>p.id);
  if(first.length<4)return toast("Cadastre ao menos quatro sabores ativos antes de criar um mês.");
  catalog.schedules[m]=[0,1,2,3].map(i=>Array.from({length:4},(_,j)=>first[(i*4+j)%first.length]));
  markDirty();toast("Novo mês criado. Revise cada semana e publique.");
 }
 selectedMonth=m;selectedWeek=0;renderSchedule();stockMonth=m;stockWeek=0;stockSelectedDays.clear();stockSelectedFlavors.clear();renderStock();
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
 pendingPhotos.p=null;$("#p-photo-status").textContent="Escolha uma foto ou mantenha a URL existente.";
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
async function saveProduct(e){
 e.preventDefault();
 const submit=$("#product-form").querySelector('[type="submit"]');
 submit.disabled=true;
 try {
 if(pendingPhotos.p) {
  $("#p-photo-status").textContent="Enviando foto...";
  const response=await api("/api/upload",{method:"POST",body:JSON.stringify({image:pendingPhotos.p})});
  $("#p-image").value=response.url; pendingPhotos.p=null;
  $("#p-photo-status").textContent="Foto enviada com sucesso.";
 }
 const name=$("#p-name").value.trim(),description=$("#p-description").value.trim(),image=$("#p-image").value.trim();
 const price=Number($("#p-price").value),active=$("#p-active").checked;
 if(!name||!Number.isFinite(price)||price<0||!/^https:\/\//.test(image))return toast("Preencha corretamente nome, preço e URL HTTPS da imagem.");
 if(!active&&editedProduct&&Object.values(catalog.schedules).some(weeks=>weeks.some(week=>week.includes(editedProduct))))return toast("Retire esse sabor das semanas programadas antes de desativar.");
 if(!editedProduct&&catalog.products.length>=300)return toast("O limite deste modelo é 300 sabores.");
 const id=editedProduct||"pizza-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
 const updated={id,name,description,price,category:$("#p-category").value.trim()||"Clássicas",image,tag:$("#p-tag").value.trim(),active};
 const idx=catalog.products.findIndex(p=>p.id===id);
 if(idx===-1)catalog.products.push(updated);else catalog.products[idx]=updated;
 editedProduct=id;markDirty();renderProducts();renderSchedule();renderStock();toast("Sabor atualizado. Publique para aparecer no site.");
 }catch(err){toast(err.message);$("#p-photo-status").textContent=err.message;}
 finally{submit.disabled=false;}
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
 if(!dirty){toast("Não há alterações para publicar.");return true;}
 const weeks=catalog.schedules;
 if(Object.entries(weeks).some(([,rows])=>rows.length!==4||rows.some(ids=>ids.length!==4||new Set(ids).size!==4))){toast("Complete os quatro sabores de todas as semanas antes de publicar.");return false;}
 $("#save-all").disabled=true;$("#save-all").textContent="Publicando...";
 try{
  const response=await api("/api/admin?action=save",{method:"POST",body:JSON.stringify({catalog,version:catalog.version})});
  catalog=response.catalog;markClean();renderAll();toast("Programação publicada! Atualize a vitrine para conferir.");return true;
 }catch(err){toast(err.message);$("#save-state").textContent="Erro na publicação";return false;}
 finally{$("#save-all").disabled=false;$("#save-all").innerHTML='Publicar alterações <span>↗</span>';}
}
function renderAll(){
 if(!catalog)return;
 $("#dashboard").hidden=false;$("#login-area").hidden=true;$("#logout").hidden=false;
 const now=new Date(),key=now.getFullYear()+"-"+pad(now.getMonth()+1);
 selectedMonth=Object.keys(catalog.schedules).includes(selectedMonth)?selectedMonth:(Object.keys(catalog.schedules).includes(key)?key:Object.keys(catalog.schedules).sort().at(-1));
 catalog.stockOut??={};
 if(!stockMonth || !catalog.schedules[stockMonth])stockMonth=selectedMonth;
 $("#admin-month").value=selectedMonth;
 renderSchedule();renderProducts();renderStock();settingsToForm();
 if(catalog.products.length)editProduct(catalog.products[0].id);
}
async function refresh(){
 const response=await api("/api/admin");
 catalog=response.catalog;markClean();renderAll();
 if(!response.persistent)toast("Atenção: armazenamento persistente não configurado.");
}

let photoTarget="q";
function stockDates(month,week){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return [];
 const [y,m]=month.split("-").map(Number),start=[1,8,15,22][week],end=week===3?new Date(y,m,0).getDate():[7,14,21][week];
 return Array.from({length:end-start+1},(_,i)=>month+"-"+pad(i+start));
}
function renderStock(){
 if(!catalog)return;
 catalog.stockOut??={};
 $("#stock-month").value=stockMonth;
 $("#stock-week").value=String(stockWeek);
 const days=stockDates(stockMonth,stockWeek);
 const ids=catalog.schedules[stockMonth]?.[stockWeek]||[];
 const dayGrid=$("#stock-days"),flavors=$("#stock-flavors");
 if(!catalog.schedules[stockMonth]){
  dayGrid.innerHTML='<p class="stock-empty">Mês ainda não programado. Use a aba Programação semanal para criar a programação.</p>';
  flavors.innerHTML=""; return;
 }
 if(!stockSelectedDays.size)stockSelectedDays.add(days.find(d=>d===new Date().toLocaleDateString("en-CA"))||days[0]);
 const products=ids.map(id=>catalog.products.find(p=>p.id===id)).filter(Boolean);
 dayGrid.innerHTML=days.map(date=>{
  const affected=(catalog.stockOut[date]||[]).filter(id=>ids.includes(id)).length;
  return '<button type="button" data-day="'+date+'" aria-pressed="'+stockSelectedDays.has(date)+'" class="stock-day '+(stockSelectedDays.has(date)?"selected":"")+'"><strong>'+date.split("-")[2]+'</strong><small>'+new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","")+'</small>'+(affected?'<span>'+affected+' esgotado(s)</span>':'<span>Disponível</span>')+'</button>';
 }).join("");
 dayGrid.querySelectorAll("[data-day]").forEach(b=>b.addEventListener("click",()=>{
  const d=b.dataset.day;
  if(stockSelectedDays.has(d))stockSelectedDays.delete(d);else stockSelectedDays.add(d);
  renderStock();
 }));
 flavors.innerHTML=products.map(p=>{
   const count=[...stockSelectedDays].filter(d=>(catalog.stockOut[d]||[]).includes(p.id)).length;
   return '<label class="stock-flavor '+(stockSelectedFlavors.has(p.id)?"picked":"")+'"><input type="checkbox" data-stock-flavor="'+clean(p.id)+'" '+(stockSelectedFlavors.has(p.id)?"checked":"")+'><img src="'+clean(goodImg(p.image))+'" loading="lazy" alt=""><span><strong>'+clean(p.name)+'</strong><small>'+count+'/'+stockSelectedDays.size+' dia(s) esgotado(s)</small></span></label>';
 }).join("")||'<p class="stock-empty">Esta semana ainda não tem sabores programados.</p>';
 flavors.querySelectorAll("[data-stock-flavor]").forEach(b=>b.addEventListener("change",()=>{
  if(b.checked)stockSelectedFlavors.add(b.dataset.stockFlavor);else stockSelectedFlavors.delete(b.dataset.stockFlavor);
  renderStock();
 }));
}
function applyStock(soldout){
 if(!stockSelectedDays.size||!stockSelectedFlavors.size)return toast("Selecione pelo menos um dia e um sabor.");
 for(const day of stockSelectedDays){
  const ids=new Set(catalog.stockOut[day]||[]);
  for(const id of stockSelectedFlavors){if(soldout)ids.add(id);else ids.delete(id);}
  if(ids.size)catalog.stockOut[day]=[...ids];else delete catalog.stockOut[day];
 }
 markDirty();renderStock();
 toast(soldout?"Sabores esgotados nos dias selecionados. Publique as alterações.":"Sabores liberados nesses dias. Publique as alterações.");
}
async function optimizedImage(file){
 if(!file || file.size>25*1024*1024)throw new Error("A foto deve ter no máximo 25 MB antes da otimização.");
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  let max=1440, quality=.82, encoded="";
  for(let step=0;step<7;step++){
   const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext("2d");
   if(!ctx)throw new Error("Seu navegador não permite otimizar imagens.");
   ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   encoded=canvas.toDataURL("image/jpeg",quality);
   canvas.width=canvas.height=0;
   if(encoded.length<1800000)return encoded;
   max=Math.round(max*.79);quality=Math.max(.5,quality-.055);
  }
  throw new Error("Essa imagem é grande demais. Tente uma foto com menor resolução.");
 }finally{URL.revokeObjectURL(url);}
}
async function handlePhotoSelection(event){
 const file=event.currentTarget.files?.[0];event.currentTarget.value="";
 if(!file)return;
 const target=photoTarget;
 const status=$("#"+target+"-photo-status");
 status.textContent="Preparando foto...";
 try{
  const data=await optimizedImage(file);
  pendingPhotos[target]=data;
  if(target==="q"){
   $("#quick-photo-preview").innerHTML='<img alt="Prévia da foto escolhida" src="'+data+'">';
   $("#q-image").value="";
  }else{
   $("#image-preview").src=data;
  }
  status.textContent="Foto pronta para enviar · "+Math.round(data.length*.75/1024)+" KB";
 }catch(err){status.textContent=err.message;toast(err.message);}
}
async function quickSave(event){
 event.preventDefault();
 const button=$("#quick-submit");button.disabled=true;button.textContent="Salvando sabor...";
 try{
  const name=$("#q-name").value.trim(),price=Number($("#q-price").value);
  if(!name||!Number.isFinite(price)||price<0||price>10000)throw new Error("Confira o nome e preço do sabor.");
  if(catalog.products.length>=300)throw new Error("Limite de 300 sabores atingido.");
  let image=$("#q-image").value.trim();
  if(pendingPhotos.q){
   $("#q-photo-status").textContent="Enviando foto ao armazenamento...";
   const response=await api("/api/upload",{method:"POST",body:JSON.stringify({image:pendingPhotos.q})});
   image=response.url;
  }
  if(!/^https:\/\//i.test(image))throw new Error("Escolha uma foto na galeria, use a câmera ou informe um link HTTPS.");
  const id="pizza-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  const product={id,name,description:$("#q-description").value.trim(),price,category:$("#q-category").value.trim()||"Clássicas",image,tag:$("#q-tag").value.trim(),active:true};
  catalog.products.push(product);markDirty();
  renderProducts();renderSchedule();renderStock();
  pendingPhotos.q=null;$("#q-photo-status").textContent="Foto salva.";
  const published=await publish();
  if(published){
   $("#quick-form").reset();$("#quick-photo-preview").innerHTML='<span class="quick-camera-icon">✓</span><strong>Sabor publicado</strong><small>Você pode cadastrar outro</small>';
   $("#q-category").value="Clássicas";toast("Sabor cadastrado e publicado! Programe a semana em que ele aparecerá.");
  }else toast("Sabor cadastrado localmente. Tente publicar novamente no topo.");
 }catch(err){toast(err.message);$("#q-photo-status").textContent=err.message;}
 finally{button.disabled=false;button.innerHTML='Cadastrar e publicar sabor <span>↗</span>';}
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
 $("#prev-month").addEventListener("click",()=>addMonth(monthShift(selectedMonth,-1)));
 $("#next-month").addEventListener("click",()=>addMonth(monthShift(selectedMonth,1)));
 $("#generate-months").addEventListener("click",programNewMonths);
 $("#schedule-search").addEventListener("input",renderPicker);
 $("#product-search").addEventListener("input",renderProducts);
 $("#new-product").addEventListener("click",()=>editProduct(null));
 $("#p-image").addEventListener("change",()=>$("#image-preview").src=goodImg($("#p-image").value));
 $("#product-form").addEventListener("submit",saveProduct);
 $("#quick-form").addEventListener("submit",quickSave);
 document.querySelectorAll("[data-photo-target]").forEach(b=>b.addEventListener("click",()=>{
  photoTarget=b.dataset.photoTarget;
  $("#"+(b.dataset.source==="camera"?"camera-input":"gallery-input")).click();
 }));
 ["gallery","camera"].forEach(type=>$("#"+type+"-input").addEventListener("change",handlePhotoSelection));
 $("#stock-month").addEventListener("change",e=>{stockMonth=e.target.value;stockWeek=0;stockSelectedDays.clear();stockSelectedFlavors.clear();renderStock();});
 $("#stock-week").addEventListener("change",e=>{stockWeek=Number(e.target.value);stockSelectedDays.clear();stockSelectedFlavors.clear();renderStock();});
 $("#mark-sold-out").addEventListener("click",()=>applyStock(true));
 $("#restore-stock").addEventListener("click",()=>applyStock(false));
 $("#settings-form").addEventListener("submit",saveSettings);
 $("#save-all").addEventListener("click",publish);
 window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
 setTab("schedule");
 refresh().catch(()=>{});
}
setup();