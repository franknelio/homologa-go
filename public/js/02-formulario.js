"use strict";
/* ---------------- formulário ---------------- */
function buildForm(){
  const open=load("hgo_open")||[];
  $("#form").innerHTML=SECTIONS.map((s,i)=>`<details class="sec" data-s="${s.id}" ${open.includes(s.id)?"open":""}><summary><span class="n">${String(i+1).padStart(2,"0")}</span>${s.t}<span class="chev">›</span></summary>
   <div class="fields">${s.f.map(fd).join("")}</div>${s.id==="ben"?'<p class="hint">Sem imagem, a planta de situação é gerada como croqui com as coordenadas e o link do mapa.</p>':""}</details>`).join("");
  document.querySelectorAll("details.sec").forEach(d=>d.addEventListener("toggle",()=>store("hgo_open",[...document.querySelectorAll("details.sec[open]")].map(x=>x.dataset.s))));
  $("#form").addEventListener("input",onInput);$("#form").addEventListener("change",onInput);
}
function fd([k,l,t="text",o,u]){
  const full=(o==="full"||u==="full"||(t==="area")||(t==="file"))?" full":"";
  const id="f_"+k;
  let inp;
  if(t==="sel") inp=`<select id="${id}" data-k="${k}">${o.map(x=>`<option ${P[k]===x?"selected":""}>${esc(x)}</option>`).join("")}</select>`;
  else if(t==="area") inp=`<textarea id="${id}" data-k="${k}" placeholder="${esc(u||"")}">${val(k)}</textarea>`;
  else if(t==="chips") inp=`<div class="chips" data-chips="${k}">${o.map(x=>`<button type="button" class="chip" data-chip="${esc(x)}" aria-pressed="${P[k]===x}">${esc(x.replace(" (EMUC)",""))}</button>`).join("")}</div>`;
  else if(t==="sig") inp=`<div class="sigbox">${assinRT?`<img src="${assinRT}" alt="Assinatura">`:"<span>Nenhuma assinatura salva</span>"}</div><div class="inm"><label class="btn">Enviar imagem da assinatura<input type="file" id="sigFile" accept="image/*" hidden></label>${assinRT?`<button class="btn" type="button" id="sigDel">Remover</button>`:""}<span id="sigSt">Entra sozinha em todos os documentos.</span></div><div class="inm" style="margin-top:8px"><label class="btn">${docRTnome?"Trocar":"Enviar"} CNH/RG do responsável técnico (PDF)<input type="file" id="docRTFile" accept="application/pdf,.pdf,image/*" hidden></label><span id="docRTSt">${docRTnome?"✓ "+esc(docRTnome)+" salvo na sua conta. Vai em todo projeto como documento do procurador.":"Nenhum documento do RT salvo."}</span></div>`;
  else if(t==="file") inp=`<input id="${id}" type="file" accept="image/*" data-file="1">`;
  else inp=`<input id="${id}" data-k="${k}" type="${t==="date"?"date":"text"}" ${t==="num"?'inputmode="decimal"':""} value="${val(k)}">`;
  const unit=(t==="num"||t==="file")&&u?`<span class="u">${esc(u)}</span>`:"";
  const loc=k==="loc"?`<div class="inm"><button class="btn" type="button" id="bLoc">Buscar localização e imagem</button><span id="locSt">Cole o link do ponto no Google Maps, as coordenadas ou o endereço.</span></div>`:"";
  const rat=k==="benef"?`<div class="inm"><label class="btn">Adicionar contas do rateio (PDF/foto)<input type="file" id="ratFiles" multiple accept="application/pdf,.pdf,image/*" hidden></label><button class="btn" type="button" id="bRat">Calcular % pelo consumo</button><span id="ratSt"></span></div>`:"";
  const inm=k==="rtArt"?`<div class="inm"><label class="btn">Ler ART/TRT (PDF)<input type="file" data-ds="a" accept="application/pdf,.pdf,image/*" hidden></label><button class="btn" type="button" id="bArtSig">Baixar ART/TRT assinada</button><button class="btn" type="button" id="bTrt" title="Copia os dados da TRT para o favorito Preencher TRT (ou para o Claude do Chrome)">Copiar dados da TRT (SINCETI)</button><a class="btn" id="bmTrt" draggable="true" href="javascript:(()=>{const s=document.createElement('script');s.src='https://homologa-go.vercel.app/sinceti.js?'+Date.now();document.body.appendChild(s)})()" onclick="alert('Arraste este botão para a barra de favoritos do Chrome (Ctrl+Shift+B mostra a barra). Depois use ele na página da TRT do SINCETI.');return false" title="Arraste para a barra de favoritos">⭐ Preencher TRT (arraste p/ favoritos)</a><span id="inm_a"></span></div>`:(k==="mReg"||k==="iReg")?`<div class="inm"><label class="btn">Ler datasheet (PDF)<input type="file" data-ds="${k[0]}" accept="application/pdf,.pdf,image/*" hidden></label><button class="btn" type="button" data-inm="${k[0]}">Buscar no INMETRO</button><span id="inm_${k[0]}"></span></div>`:"";
  return `<div class="f${full}"><label for="${id}">${esc(l)} ${unit}</label>${inp}${inm}${loc}${rat}</div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-chip]");if(!b)return;const g=b.closest("[data-chips]"),k=g.dataset.chips;P[k]=b.dataset.chip;delete P._exemplo;g.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c===b));store("hgo_current",P);render()});
function syncForm(){document.querySelectorAll("[data-chips]").forEach(g=>g.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",P[g.dataset.chips]===c.dataset.chip)));document.querySelectorAll("[data-k]").forEach(e=>{const k=e.dataset.k;if(e.tagName==="SELECT"){if(P[k])e.value=P[k]}else e.value=P[k]??""})}
let rT;
function onInput(e){
  const el=e.target;
  if(el.dataset.file){const f=el.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{plantaImg=r.result;P.planta=plantaImg.length<1500000?plantaImg:"";render()};r.readAsDataURL(f);return}
  const k=el.dataset.k;if(!k)return;P[k]=el.value;delete P._exemplo;if(k==="mReg"||k==="iReg")delete P["_inm"+k[0]];
  if(/^(m|i)[A-Z]/.test(k))delete P._equipEst;if(k==="lat"||k==="lon")delete P._coordAprox;if(k==="disj")delete P._disjPadrao;
  // UC trifásica: inversor sempre trifásico 380 V (regra do usuário)
  if(k==="ligacao"&&e.type==="change"){P._ligManual=P.ligacao!=="Trifásico"&&String(P.iFases||"").startsWith("Trif")?1:undefined;if(!P._ligManual)delete P._ligManual;P.tensao=P.ligacao==="Monofásico"?"220 V (F-N)":"380/220 V";if(P.ligacao==="Trifásico"&&!String(P.iFases||"").startsWith("Trif")){P.iFases="Trifásico 380/220 V";if(n(P.iP))P.iIout=+(n(P.iP)*1000/(Math.sqrt(3)*380)).toFixed(1)}store("hgo_current",P);buildFormFresh();render();return}
  clearTimeout(rT);rT=setTimeout(()=>{store("hgo_current",P);render()},250);
}
// salva sozinho alguns segundos depois da última edição: a nuvem é a cópia que vale entre aparelhos
const semMeta=x=>{const {_saved,_pendente,_nuvemEm,_soNuvem,...r}=semImagemGrande(x||{});return JSON.stringify(r)};
var aT;function autoSalvar(){if(P._exemplo||!(P._id||P.nome))return;clearTimeout(aT);aT=setTimeout(()=>{const rec=P._id&&projects()[P._id];if(rec&&semMeta(rec)===semMeta(P))return;salvarProjeto(true).catch(()=>{})},4000)}
