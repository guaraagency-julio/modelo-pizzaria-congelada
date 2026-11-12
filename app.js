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
let selectedDate = today();
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
function soldOut(id,date){return Array.isArray(catalog.stockOut?.[date])&&catalog.stockOut[date].includes(id);}
function choiceDate(month,week) {
 const r=rangeOf(month,week), earliest=r.start>today()?r.start:today();
 return earliest<=r.end?earliest:r.end;
}
function dateValid(date,month,week) {
 const r=rangeOf(month,week);
 return /^\d{4}-\d{2}-\d{2}$/.test(date||"")&&date>=today()&&date>=r.start&&date<=r.end;
}
function isPast(month,week){return rangeOf(month,week).end < today();}
function notify(message){els.toast.textContent=message;els.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove("show"),3100);}
function weekCaption(month,week){return "Semana "+(week+1)+" · "+rangeOf(month,week).label;}
function setWeek(month,week,scroll=false){selectedMonth=month;selectedWeek=week;renderScheduleAndMenu();if(scroll)document.querySelector("#cardapio").scrollIntoView({behavior:"smooth"});}
function renderScheduleAndMenu(){
 const months=Object.keys(catalog.schedules).sort();
 if (!months.includes(selectedMonth)) selectedMonth=months.find(x=>x>=monthOfToday())||months.at(-1)||monthOfToday();
 els.month.innerHTML=months.map(m=>'<option value="'+escapeHtml(m)+'">'+escapeHtml(formatMonth(m))+'</option>').join("");
 const weekRange=rangeOf(selectedMonth,selectedWeek);
 if(!dateValid(selectedDate,selectedMonth,selectedWeek))selectedDate=choiceDate(selectedMonth,selectedWeek);
 const shopDate=$("#shop-date");
 shopDate.min=weekRange.start>today()?weekRange.start:today();
 shopDate.max=weekRange.end;
 shopDate.disabled=isPast(selectedMonth,selectedWeek);
 shopDate.value=selectedDate;
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
 const unavailable=products.filter(p=>soldOut(p.id,selectedDate)).length;
 $("#shop-stock-note").textContent=past?"Semana encerrada":unavailable?unavailable+" de "+products.length+" sabores esgotados nesse dia":"Todos os sabores disponíveis nesse dia";
 els.grid.innerHTML=products.map(p=>{
  const image=validImage(p.image)||SEED.products[0].image;
  const unavailableToday=soldOut(p.id,selectedDate);
  return '<article class="product-card"><div class="product-photo"><img loading="lazy" src="'+escapeHtml(image)+'" alt="'+escapeHtml(p.name)+'">'+(p.tag?'<span class="product-badge">'+escapeHtml(p.tag)+'</span>':"")+(unavailableToday?'<span class="stock-badge">ESGOTADO EM '+selectedDate.slice(8,10)+'/'+selectedDate.slice(5,7)+'</span>':"")+'</div><div class="product-info"><div class="product-category">'+escapeHtml(p.category)+'</div><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.description)+'</p><div class="product-card-bottom"><div class="product-price"><small>Unidade · produto congelado</small>'+formatMoney(p.price)+'</div><button class="add-button" data-add="'+escapeHtml(p.id)+'" aria-label="Adicionar '+escapeHtml(p.name)+'" '+(past||unavailableToday?"disabled title='Indisponível nessa data'":"")+'>'+(unavailableToday?"×":"+")+'</button></div></div></article>';
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
 if(!dateValid(selectedDate,selectedMonth,selectedWeek))return notify("Escolha uma data válida para a encomenda.");
 if(soldOut(id,selectedDate))return notify("Esse sabor está esgotado para a data escolhida.");
 if(!weekProducts(selectedMonth,selectedWeek).some(p=>p.id===id))return notify("Esse sabor não está programado para a semana.");
 if(cart.length && (cartPeriod?.month !== selectedMonth || cartPeriod.week !== selectedWeek)){
  if(!confirm("Seu carrinho tem pizzas de outra semana. Deseja esvaziá-lo e começar um pedido para esta semana?"))return;
  cart=[];
 }
 if(cart.length && cartPeriod?.date && cartPeriod.date!==selectedDate){
  const removed=cart.filter(x=>soldOut(x.id,selectedDate));
  if(removed.length&&!confirm("Alguns sabores estão esgotados nessa data. Remover os indisponíveis do carrinho?"))return;
  cart=cart.filter(x=>!soldOut(x.id,selectedDate));
 }
 cartPeriod={month:selectedMonth,week:selectedWeek,date:selectedDate};
 const found=cart.find(x=>x.id===id);if(found)found.qty=Math.min(50,found.qty+1);else cart.push({id,qty:1});
 saveCart();renderCart();notify(item.name+" adicionado ao carrinho."); 
}
function cleanCart(){
 if (!cartPeriod || !catalog.schedules[cartPeriod.month]){cart=[];cartPeriod=null;return;}
 if(!dateValid(cartPeriod.date,cartPeriod.month,cartPeriod.week))cartPeriod.date=choiceDate(cartPeriod.month,cartPeriod.week);
 const allowed=weekProducts(cartPeriod.month,cartPeriod.week).map(p=>p.id);
 cart=cart.filter(x=>allowed.includes(x.id)&&!soldOut(x.id,cartPeriod.date));
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
  input.value=cartPeriod.date;
  input.disabled=r.end<today();
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
function isMobileCheckout(){
 const ua=navigator.userAgent||"";
 return navigator.userAgentData?.mobile===true || /Android|iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints>1);
}
function waWebHref(message){
 const phone=String(catalog.settings.whatsapp||SEED.settings.whatsapp).replace(/\D/g,"");
 return "https://web.whatsapp.com/send?phone="+phone+"&text="+encodeURIComponent(message);
}
function buildMessage(form){
 const lines=[
  "Olá! Quero fazer uma encomenda de pizzas congeladas da "+(catalog.settings.brand||"Pronta Pizzaria")+".",
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
 $("#shop-date").addEventListener("change",()=>{
  const date=$("#shop-date").value;
  if(!dateValid(date,selectedMonth,selectedWeek)){renderScheduleAndMenu();return notify("Escolha uma data dentro da semana selecionada.");}
  const prev=selectedDate;
  if(cart.length&&cartPeriod?.month===selectedMonth&&cartPeriod.week===selectedWeek) {
   const missing=cart.filter(x=>soldOut(x.id,date));
   if(missing.length&&!confirm("Alguns sabores do seu carrinho estão esgotados em "+date.split("-").reverse().join("/")+". Remover esses sabores?")){
    $("#shop-date").value=prev;return;
   }
   cart=cart.filter(x=>!soldOut(x.id,date));
   if(cart.length)cartPeriod.date=date;else cartPeriod=null;
   saveCart();
  }
  selectedDate=date;renderScheduleAndMenu();renderCart();
 });
 $("#open-cart").addEventListener("click",openCart);
 $("#close-cart").addEventListener("click",closeCart);
 $("#empty-shop").addEventListener("click",()=>{closeCart();$("#cardapio").scrollIntoView({behavior:"smooth"});});
 els.overlay.addEventListener("click",closeCart);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!els.overlay.hidden)closeCart();});
 $("#c-method").addEventListener("change",updateDelivery);
 $("#c-date").addEventListener("change",()=>{
  if(!cartPeriod)return;
  const date=$("#c-date").value;
  if(!dateValid(date,cartPeriod.month,cartPeriod.week)){
   $("#c-date").value=cartPeriod.date;return notify("Data fora da semana programada.");
  }
  const removed=cart.filter(x=>soldOut(x.id,date));
  if(removed.length&&!confirm("Alguns sabores acabaram nessa data. Deseja removê-los do pedido?")){
   $("#c-date").value=cartPeriod.date;return;
  }
  cart=cart.filter(x=>!soldOut(x.id,date));
  if(cart.length)cartPeriod.date=date;else cartPeriod=null;
  selectedDate=date;
  saveCart();renderCart();
  if(selectedMonth===cartPeriod?.month&&selectedWeek===cartPeriod?.week)renderScheduleAndMenu();
  if(removed.length)notify("Sabores indisponíveis foram retirados do carrinho.");
 });
 els.form.addEventListener("submit",async e=>{
  e.preventDefault();
  // currentTarget só existe durante o dispatch síncrono do evento.
  // Guardar a referência antes de consultar o estoque evita interromper o checkout.
  const form=e.currentTarget;
  const button=form.querySelector(".checkout-button");
  const fallback=$("#checkout-whatsapp-fallback");
  const status=$("#checkout-status");
  if(!form.reportValidity())return;

  // Em desktops, a guia precisa ser criada dentro do clique do usuário.
  // Criá-la após o fetch pode bloquear a abertura pelo navegador.
  const mobile=isMobileCheckout();
  let desktopTab=null;
  let openedDestination=false;
  if(!mobile){
   try{
    desktopTab=window.open("about:blank","_blank");
    if(desktopTab){
     desktopTab.opener=null;
     desktopTab.document.title="Abrindo WhatsApp Web | Pronta Pizzaria";
     desktopTab.document.body.innerHTML='<main style="max-width:520px;margin:12vh auto;padding:24px;text-align:center;font:600 18px Arial,sans-serif;color:#503e33"><h1>Pronta Pizzaria</h1><p>Conferindo seu pedido antes de abrir o WhatsApp Web…</p></main>';
    }
   }catch{desktopTab=null;}
  }
  fallback.hidden=true;
  fallback.removeAttribute("href");
  status.textContent="Conferindo disponibilidade dos sabores...";
  button.disabled=true;
  button.innerHTML='Conferindo pedido <span>…</span>';
  try{
   try{
    const response=await fetch("/api/catalog",{cache:"no-store"});
    if(response.ok){
     const latest=await response.json();
     if(!Array.isArray(latest.products)||!latest.schedules)throw new Error("O catálogo retornou dados inválidos.");
     catalog=latest;
    }else if(location.hostname.endsWith("vercel.app")){
     throw new Error("Não foi possível confirmar o estoque. Tente novamente.");
    }
   }catch(error){
    // A vitrine estática do GitHub Pages não tem API; ela utiliza o catálogo demonstrativo.
    if(location.hostname.endsWith("vercel.app"))throw error;
   }
   const before=cart.length;
   cleanCart();
   saveCart();
   renderCart();
   renderScheduleAndMenu();
   if(cart.length!==before){
    status.textContent="A disponibilidade mudou. Confira o carrinho atualizado antes de finalizar.";
    notify(status.textContent);
    return;
   }
   if(!cart.length||!cartPeriod){
    status.textContent="Adicione uma pizza ao carrinho para continuar.";
    notify(status.textContent);
    return;
   }
   const date=$("#c-date").value;
   if(!dateValid(date,cartPeriod.month,cartPeriod.week)){
    status.textContent="Escolha uma data válida dentro da semana programada.";
    notify(status.textContent);
    return;
   }
   if(cart.some(x=>soldOut(x.id,date))){
    status.textContent="Um dos sabores está esgotado nessa data. Ajuste o carrinho.";
    notify(status.textContent);
    return;
   }
   if(!form.reportValidity())return;
   const number=$("#c-phone").value.replace(/\D/g,"");
   if(number.length<10||number.length>13){
    status.textContent="Confira o número de WhatsApp informado.";
    notify(status.textContent);
    return;
   }
   const message=buildMessage(form);
   const link=mobile?waHref(message):waWebHref(message);
   fallback.href=link;
   fallback.target=mobile?"_self":"_blank";
   fallback.rel="noopener noreferrer";
   fallback.textContent=mobile?"↗ Abrir meu pedido no WhatsApp":"↗ Abrir meu pedido no WhatsApp Web";
   fallback.hidden=false;
   if(mobile){
    status.textContent="Pedido preparado! Abrindo o WhatsApp… Se não abrir, toque no link abaixo.";
    openedDestination=true;
    window.location.assign(link);
   }else if(desktopTab && !desktopTab.closed){
    desktopTab.location.replace(link);
    desktopTab.focus();
    openedDestination=true;
    status.textContent="Pedido pronto! O WhatsApp Web abriu em outra guia. Se necessário, use o link abaixo.";
   }else{
    status.textContent="Pedido pronto! Clique abaixo para abrir o WhatsApp Web.";
    notify(status.textContent);
   }
  }catch(error){
   status.textContent=error?.message||"Não conseguimos preparar seu pedido. Tente novamente.";
   notify(status.textContent);
  }finally{
   if(!openedDestination&&desktopTab&&!desktopTab.closed){
    try{desktopTab.close();}catch{}
   }
   button.disabled=false;
   button.innerHTML='Finalizar no WhatsApp <span>↗</span>';
  }
 });;
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