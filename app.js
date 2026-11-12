import { SEED } from "./shared/seed.js";

const $ = (selector) => document.querySelector(selector);
const formatMoney = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const validImage = (url) => { try { const u = new URL(url); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };
const formatMonth = (key) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(key+"-05T12:00:00"));
const pad = (n) => String(n).padStart(2,"0");
const isoLocal = (d) => [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-");
const today = () => isoLocal(new Date());
const monthOfToday = () => today().slice(0,7);
const rangeOf = (month, index) => {
  const [year,mon] = month.split("-").map(Number);
  const first = [1,8,15,22][index];
  const last = index === 3 ? new Date(year,mon,0).getDate() : [7,14,21][index];
  return {start: month+"-"+pad(first),end:month+"-"+pad(last),label:pad(first)+" a "+pad(last)+"/"+pad(mon)};
};
const currentWeek = (d) => Math.min(3,Math.floor((d.getDate()-1)/7));
const els = {
 tabs:$("#week-tabs"), grid:$("#product-grid"), schedule:$("#schedule-grid"),
 month:$("#select-month"), count:$("#cart-count"), drawer:$("#cart-drawer"),
 overlay:$("#cart-overlay"), items:$("#cart-items"), empty:$("#cart-empty"),
 form:$("#checkout-form"), cartPeriod:$("#cart-period"), toast:$("#toast")
};
let catalog = structuredClone(SEED);
let selectedMonth = monthOfToday();
let selectedWeek = currentWeek(new Date());
let cart = [];
let cartPeriod = null;
let toastTimer;
try {
  const saved = JSON.parse(localStorage.getItem("lenta-cart-v1") || "{}");
  if (Array.isArray(saved.items)) cart = saved.items.filter(x => typeof x.id === "string" && Number.isInteger(x.qty) && x.qty>0 && x.qty<=50);
  if (saved.period && /^\d{4}-\d{2}$/.test(saved.period.month) && [0,1,2,3].includes(saved.period.week)) cartPeriod = saved.period;
} catch {}
function saveCart(){ try { localStorage.setItem("lenta-cart-v1", JSON.stringify({items:cart,period:cartPeriod})); } catch {} }
function product(id){return catalog.products.find((p)=>p.id===id && p.active !== false);}
function weekProducts(month,week){return (catalog.schedules[month]?.[week]||[]).map(product).filter(Boolean);}
function isPast(month,week){return rangeOf(month,week).end < today();}
function notify(message){els.toast.textContent=message;els.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove("show"),3100);}
function weekCaption(month,week){return "Semana "+(week+1)+" · "+rangeOf(month,week).label;}
function setWeek(month,week,scroll=false){selectedMonth=month;selectedWeek=week;renderScheduleAndMenu();if(scroll)document.querySelector("#cardapio").scrollIntoView({behavior:"smooth"});}
function renderScheduleAndMenu(){
 const months=Object.keys(catalog.schedules).sort();
 if (!months.includes(selectedMonth)) selectedMonth=months.find(x=>x>=monthOfToday())||months.at(-1)||monthOfToday();
 els.month.innerHTML=months.map(m=>'<option value="'+escapeHtml(m)+'">'+escapeHtml(formatMonth(m))+'</option>').join("");
 if(!months.includes(selectedMonth)) els.month.innerHTML='<option value="'+escapeHtml(selectedMonth)+'">'+escapeHtml(formatMonth(selectedMonth))+'</option>';
 els.month.value=selectedMonth;
 els.tabs.innerHTML=[0,1,2,3].map((i)=>{
   const r=rangeOf(selectedMonth,i);
   return '<button class="week-tab '+(selectedWeek===i?"active":"")+'" data-week="'+i+'" aria-pressed="'+(selectedWeek===i)+'"><span><span class="week-name">Semana '+(i+1)+'</span><span class="week-range">'+r.label+(isPast(selectedMonth,i)?" · encerrada":"")+'</span></span><span class="week-arrow">↗</span></button>';
 }).join("");
 els.tabs.querySelectorAll("[data-week]").forEach(b=>b.addEventListener("click",()=>setWeek(selectedMonth,Number(b.dataset.week))));
 $("#menu-period").textContent=weekCaption(selectedMonth,selectedWeek)+" · "+formatMonth(selectedMonth);
 const products=weekProducts(selectedMonth,selectedWeek);
 $("#no-products").hidden=products.length>0;
 const past=isPast(selectedMonth,selectedWeek);
 els.grid.innerHTML=products.map(p=>{
  const image=validImage(p.image)||SEED.products[0].image;
  return '<article class="product-card"><div class="product-photo"><img loading="lazy" src="'+escapeHtml(image)+'" alt="'+escapeHtml(p.name)+'">'+(p.tag?'<span class="product-badge">'+escapeHtml(p.tag)+'</span>':"")+'</div><div class="product-info"><div class="product-category">'+escapeHtml(p.category)+'</div><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.description)+'</p><div class="product-card-bottom"><div class="product-price"><small>Unidade · produto congelado</small>'+formatMoney(p.price)+'</div><button class="add-button" data-add="'+escapeHtml(p.id)+'" aria-label="Adicionar '+escapeHtml(p.name)+'" '+(past?"disabled title='Semana encerrada'":"")+'>+</button></div></div></article>';
 }).join("");
 els.grid.querySelectorAll("[data-add]").forEach(btn=>btn.addEventListener("click",()=>addItem(btn.dataset.add)));
 els.schedule.innerHTML=[0,1,2,3].map(i=>{
  const prods=weekProducts(selectedMonth,i);
  const isCurrent=selectedMonth===monthOfToday()&&i===currentWeek(new Date());
  const isSelected=selectedWeek===i;
  return '<article class="schedule-card '+(isSelected?"is-active":"")+'"><div class="schedule-top"><b>Semana '+(i+1)+'</b><span>'+(isCurrent?"SEMANA ATUAL":isPast(selectedMonth,i)?"ENCERRADA":"PROGRAMAÇÃO")+'</span></div><span class="schedule-dates">'+rangeOf(selectedMonth,i).label+'</span><ul>'+(prods.length?prods.map(p=>'<li>'+escapeHtml(p.name)+'</li>').join(""):'<li>A definir</li>')+'</ul><button data-go-week="'+i+'">'+(isPast(selectedMonth,i)?"Ver sabores":"Escolher esta semana")+' ↗</button></article>';
 }).join("");
 els.schedule.querySelectorAll("[data-go-week]").forEach(btn=>btn.addEventListener("click",()=>setWeek(selectedMonth,Number(btn.dataset.goWeek),true)));
}
function addItem(id) {
 const item=product(id);if(!item) return notify("Esse sabor não está mais disponível.");
 if(isPast(selectedMonth,selectedWeek))return notify("A programação dessa semana já encerrou.");
 if(!weekProducts(selectedMonth,selectedWeek).some(p=>p.id===id))return notify("Esse sabor não está programado para a semana.");
 if(cart.length && (cartPeriod?.month !== selectedMonth || cartPeriod.week !== selectedWeek)){
  if(!confirm("Seu carrinho tem pizzas de outra semana. Deseja esvaziá-lo e começar um pedido para esta semana?"))return;
  cart=[];
 }
 cartPeriod={month:selectedMonth,week:selectedWeek};
 const found=cart.find(x=>x.id===id);if(found)found.qty=Math.min(50,found.qty+1);else cart.push({id,qty:1});
 saveCart();renderCart();notify(item.name+" adicionado ao carrinho."); 
}
function cleanCart(){
 if (!cartPeriod || !catalog.schedules[cartPeriod.month]){cart=[];cartPeriod=null;return;}
 const allowed=weekProducts(cartPeriod.month,cartPeriod.week).map(p=>p.id);
 cart=cart.filter(x=>allowed.includes(x.id));
 if(!cart.length)cartPeriod=null;
}
function renderCart(){
 cleanCart();
 const count=cart.reduce((a,x)=>a+x.qty,0);
 els.count.textContent=count;$("#cart-title-count").textContent="("+count+")";
 els.empty.hidden=count>0;els.form.hidden=count===0;
 els.cartPeriod.textContent=cartPeriod?("Encomenda para "+weekCaption(cartPeriod.month,cartPeriod.week)+" · "+formatMonth(cartPeriod.month)):"";
 els.items.innerHTML=cart.map(x=>{
   const p=product(x.id);if(!p)return "";
   return '<div class="cart-item"><img src="'+escapeHtml(validImage(p.image)||SEED.products[0].image)+'" alt=""><div><h4>'+escapeHtml(p.name)+'</h4><small>'+formatMoney(p.price)+' / un.</small><div class="qty-controls"><button type="button" data-qty="'+escapeHtml(x.id)+'" data-action="minus" aria-label="Diminuir quantidade">−</button><span>'+x.qty+'</span><button type="button" data-qty="'+escapeHtml(x.id)+'" data-action="plus" aria-label="Aumentar quantidade">+</button></div></div><strong>'+formatMoney(p.price*x.qty)+'</strong></div>';
 }).join("");
 els.items.querySelectorAll("[data-qty]").forEach(btn=>btn.addEventListener("click",()=>{
  const i=cart.find(x=>x.id===btn.dataset.qty);if(!i)return;
  i.qty+=btn.dataset.action==="plus"?1:-1;
  if(i.qty>50)i.qty=50;
  if(i.qty<=0)cart=cart.filter(x=>x!==i);
  if(!cart.length)cartPeriod=null;
  saveCart();renderCart();
 }));
 const total=cart.reduce((s,x)=>s+(product(x.id)?.price||0)*x.qty,0);
 $("#cart-subtotal").textContent=formatMoney(total);
 if(cartPeriod){
  const r=rangeOf(cartPeriod.month,cartPeriod.week);
  const input=$("#c-date");
  input.min=r.start>today()?r.start:today();
  input.max=r.end;
  if(!input.value||input.value<input.min||input.value>input.max)input.value=input.min;
 }
}
function openCart(){
 els.drawer.inert=false;els.drawer.classList.add("open");els.overlay.hidden=false;document.body.classList.add("cart-open");
 $("#close-cart").focus();
}
function closeCart(){
 els.drawer.classList.remove("open");els.drawer.inert=true;els.overlay.hidden=true;document.body.classList.remove("cart-open");
 $("#open-cart").focus();
}
function updateDelivery(){
 const delivery=$("#c-method").value==="Entrega";
 $("#address-fields").hidden=!delivery;
 $("#c-address").required=delivery;
}
function waHref(text){
 const phone=String(catalog.settings.whatsapp||SEED.settings.whatsapp).replace(/\D/g,"");
 return "https://wa.me/"+phone+(text?"?text="+encodeURIComponent(text):"");
}
function buildMessage(form){
 const lines=[
  "Olá! Quero fazer uma encomenda de pizzas congeladas da "+(catalog.settings.brand||"LENTA")+".",
  "", "🍕 *MEU PEDIDO*",
  "Programação: "+weekCaption(cartPeriod.month,cartPeriod.week)+" ("+formatMonth(cartPeriod.month)+")",
  ""
 ];
 for (const entry of cart){const p=product(entry.id);if(p)lines.push(entry.qty+"x "+p.name+" — "+formatMoney(p.price*entry.qty));}
 const total=cart.reduce((s,x)=>s+(product(x.id)?.price||0)*x.qty,0);
 lines.push("","*Subtotal: "+formatMoney(total)+"*","","👤 *DADOS DO CLIENTE*",
  "Nome: "+$("#c-name").value.trim(),"WhatsApp: "+$("#c-phone").value.trim(),
  "Modalidade: "+$("#c-method").value,
  $("#c-method").value==="Entrega"?"Endereço: "+$("#c-address").value.trim():"",
  $("#c-method").value==="Entrega"&&$("#c-complement").value.trim()?"Referência: "+$("#c-complement").value.trim():"",
  "Data desejada: "+$("#c-date").value.split("-").reverse().join("/"),
  "Pagamento: "+$("#c-payment").value,
  $("#c-notes").value.trim()?"Observações: "+$("#c-notes").value.trim():"",
  "","Peço confirmação da disponibilidade, da data e da taxa de entrega, se houver."
 );
 return lines.filter(x=>x!==null&&x!==undefined).join("\n").replace(/\n{3,}/g,"\n\n");
}
function bind(){
 $("#year").textContent=new Date().getFullYear();
 els.month.addEventListener("change",()=>setWeek(els.month.value,0));
 $("#open-cart").addEventListener("click",openCart);
 $("#close-cart").addEventListener("click",closeCart);
 $("#empty-shop").addEventListener("click",()=>{closeCart();$("#cardapio").scrollIntoView({behavior:"smooth"});});
 els.overlay.addEventListener("click",closeCart);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!els.overlay.hidden)closeCart();});
 $("#c-method").addEventListener("change",updateDelivery);
 els.form.addEventListener("submit",e=>{
  e.preventDefault();cleanCart();if(!cart.length||!cartPeriod)return notify("Adicione uma pizza ao carrinho.");
  const date=$("#c-date").value,r=rangeOf(cartPeriod.month,cartPeriod.week);
  if(date<today()||date<r.start||date>r.end)return notify("Escolha uma data válida dentro da semana programada.");
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  const number=$("#c-phone").value.replace(/\D/g,"");
  if(number.length<10||number.length>13)return notify("Confira o número de WhatsApp informado.");
  const link=waHref(buildMessage(form));
  const a=document.createElement("a");a.href=link;a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();a.remove();
  notify("A mensagem foi preparada. Confira e envie pelo WhatsApp.");
 });
}
async function init(){
 bind();
 try{
  const response=await fetch("/api/catalog",{cache:"no-store"});
  if(response.ok){
   const json=await response.json();
   if(json && Array.isArray(json.products) && json.schedules) catalog=json;
  }
 }catch{}
 selectedMonth=Object.keys(catalog.schedules).includes(monthOfToday())?monthOfToday():Object.keys(catalog.schedules).sort().find(x=>x>=monthOfToday())||Object.keys(catalog.schedules).sort().at(-1)||monthOfToday();
 selectedWeek=selectedMonth===monthOfToday()?currentWeek(new Date()):0;
 $("#hero-description").textContent=catalog.settings.description||SEED.settings.description;
 $("#head-whatsapp").href=waHref("Olá! Quero saber mais sobre as pizzas congeladas.");
 $("#footer-whatsapp").href=waHref("Olá! Gostaria de fazer uma encomenda.");
 $("#footer-city").textContent=catalog.settings.city||"";
 renderScheduleAndMenu();renderCart();updateDelivery();
}
init();