"use strict";
/* ---------------- parecer de reprova: motivos e correções (o acompanhamento do protocolo fica no CRM) ---------------- */
function htmlReprovas(){
  const L=P.reprovas||[];
  return `<div class="inm"><label class="btn">Ler parecer de reprova (PDF, foto ou print do e-mail)<input type="file" id="repFile" multiple accept="application/pdf,.pdf,image/*" hidden></label><span id="repSt"></span></div>
  <textarea id="repTxt" placeholder="Ou cole aqui o texto do e-mail da Equatorial e toque em Ler texto"></textarea><div class="inm"><button class="btn" type="button" id="bRepTxt">Ler texto</button></div>
  ${L.length&&!L[L.length-1].resolvida?`<div class="inm"><button class="btn" type="button" id="bRepOk">Já fiz as correções</button></div>`:""}${L.length?`<div class="replist">${L.slice().reverse().map(r=>`<div class="chk ${r.resolvida?"ok":"bad"}"><b>${r.resolvida?"✓":"✕"}</b><span><b>Reprova ${esc(r.data||new Date(r.em).toLocaleDateString("pt-BR"))}${r.protocolo?` · protocolo ${esc(r.protocolo)}`:""}</b>${r.itens.map(i=>`<br>${i.doc?`<b>${esc(i.doc)}:</b> `:""}${esc(i.motivo)}${i.corr?` <i>→ ${esc(i.corr)}</i>`:""}`).join("")}</span></div>`).join("")}</div>`:""}`;
}
function lerItensReprova(txt){return String(txt||"").split(/\n+/).map(l=>l.split("|").map(x=>x.trim())).filter(p=>p.join("").length>3).map(p=>p.length>=3?{doc:p[0],motivo:p[1],corr:p.slice(2).join(" | ")}:p.length===2?{doc:p[0],motivo:p[1],corr:""}:{doc:"",motivo:p[0],corr:""})}
async function lerReprova({files=[],texto=""}){
  const st=x=>{const e=$("#repSt");if(e)e.textContent=x};
  if(!navigator.onLine||!sessao){st("A leitura precisa de internet e login.");return}
  st("Lendo o parecer…");
  try{
    const imgs=[];for(const f of files)imgs.push(...await fileToImages(f,3));
    const r=await fetch("api/ler-documentos",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+sessao.access_token},body:JSON.stringify({tipo:"reprova",texto,images:await Promise.all(imgs.slice(0,5).map(blobToB64))})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"erro "+r.status);
    const d=j.dados||{},itens=lerItensReprova(d.motivos);
    if(!itens.length)throw new Error("não achei motivos de reprova nesse arquivo");
    P.reprovas=[...(P.reprovas||[]),{em:new Date().toISOString(),data:d.data||"",protocolo:d.protocolo||"",itens,resolvida:false}];
    store("hgo_current",P);buildFormFresh();render();
    const sec=document.querySelector('details[data-s="acomp"]');if(sec)sec.open=true;
    toast(`${itens.length} motivo(s) de reprova lidos; veja a correção de cada um na seção do parecer`);
  }catch(e){st("Não consegui ler: "+e.message)}
}
document.addEventListener("change",e=>{if(e.target.id==="repFile"&&e.target.files.length)lerReprova({files:[...e.target.files]})});
document.addEventListener("click",e=>{if(e.target.id==="bRepOk"){const L=P.reprovas||[];if(L.length){L[L.length-1].resolvida=true;store("hgo_current",P);buildFormFresh();render();const sec=document.querySelector('details[data-s="acomp"]');if(sec)sec.open=true}}});
document.addEventListener("click",e=>{if(e.target.id==="bRepTxt"){const t=($("#repTxt")||{}).value||"";if(t.trim())lerReprova({texto:t.slice(0,20000)})}});
// a última reprova aparece no checklist até você marcar "Já fiz as correções"
function avisosReprova(){
  const L=P.reprovas||[];if(!L.length||L[L.length-1].resolvida)return [];
  const r=L[L.length-1];return r.itens.map(i=>["warn",`Reprova ${esc(r.data||"")}: ${i.doc?esc(i.doc)+" — ":""}${esc(i.motivo)}${i.corr?` → ${esc(i.corr)}`:""}`]);
}

/* ---------------- biblioteca de equipamentos ---------------- */
// módulos e inversores já usados, com especificações e registro INMETRO, para não ler o datasheet de novo
const EQ_CAMPOS={m:["mFab","mMod","mP","mVoc","mVmp","mIsc","mImp","mBeta","mEff","mC","mL","mPeso","mCel","mTipo","mReg"],
  i:["iFab","iMod","iP","iFases","iIout","iVmax","iNmppt","iMin","iMax","iImax","iIsc","iFp","iEff","iDht","iDim","iPeso","iIP","iReg"]};
const chaveEq=(fab,mod)=>(String(fab||"")+"|"+String(mod||"")).toUpperCase().replace(/\s+/g," ").trim();
const biblioteca=()=>load("hgo_equip")||{m:{},i:{}};
function equipCompleto(t,x){return t==="m"?n(x.mP)&&n(x.mVoc)&&n(x.mIsc):n(x.iP)&&n(x.iVmax)&&n(x.iNmppt)}
async function guardarEquip(){
  if(P._exemplo||P._equipEst)return;
  const B=biblioteca();let mudou=[];
  for(const t of ["m","i"]){
    if(!P[t+"Fab"]||!P[t+"Mod"]||!equipCompleto(t,P))continue;
    const d=Object.fromEntries(EQ_CAMPOS[t].filter(k=>P[k]!==undefined&&P[k]!==""&&!(k.endsWith("Reg")&&P["_inm"+t])).map(k=>[k,P[k]]));
    const k=chaveEq(P[t+"Fab"],P[t+"Mod"]);if(JSON.stringify(B[t][k])===JSON.stringify(d))continue;
    B[t][k]=d;mudou.push([t,k,d]);
  }
  if(!mudou.length)return;store("hgo_equip",B);atualizaListasEq();
  if(sb&&sessao&&navigator.onLine)for(const [t,k,d] of mudou){const {error}=await sb.from("equipamentos").upsert({user_id:sessao.user.id,tipo:t,chave:k,dados:d,atualizado_em:new Date().toISOString()});if(error)break}
}
async function carregarBiblioteca(){
  if(!sb||!sessao||!navigator.onLine)return;
  const {data,error}=await sb.from("equipamentos").select("tipo,chave,dados");if(error||!data)return;
  const B=biblioteca();for(const r of data)if(B[r.tipo])B[r.tipo][r.chave]=r.dados;store("hgo_equip",B);atualizaListasEq();
}
function atualizaListasEq(){
  const B=biblioteca();
  for(const t of ["m","i"]){
    let dl=document.getElementById("lib_"+t);if(!dl){dl=document.createElement("datalist");dl.id="lib_"+t;document.body.appendChild(dl)}
    dl.innerHTML=Object.values(B[t]).map(d=>`<option value="${esc(d[t+"Mod"])}">${esc(d[t+"Fab"])}${d[t+"P"]?` · ${esc(d[t+"P"])}${t==="m"?" W":" kW"}`:""}</option>`).join("");
    const inp=document.getElementById(`f_${t}Mod`);if(inp)inp.setAttribute("list","lib_"+t);
  }
}
// escolheu um modelo que já está na biblioteca: preenche o resto (quantidade fica como está)
function aplicarBiblioteca(t){
  const B=biblioteca(),mod=String(P[t+"Mod"]||"").trim().toUpperCase();if(!mod)return false;
  const achados=Object.values(B[t]).filter(d=>String(d[t+"Mod"]||"").trim().toUpperCase()===mod&&(!P[t+"Fab"]||chaveEq(d[t+"Fab"],"")===chaveEq(P[t+"Fab"],"")));
  if(achados.length!==1)return false;
  const d=achados[0];Object.assign(P,d);delete P["_inm"+t];delete P._equipEst;
  if(t==="i"&&String(P.iFases).startsWith("Trif")){P.ligacao="Trifásico";P.tensao="380/220 V"}
  syncForm();store("hgo_current",P);render();toast(`${t==="m"?"Módulo":"Inversor"} ${d[t+"Mod"]} preenchido pela sua biblioteca de equipamentos`);return true;
}
document.addEventListener("change",e=>{const k=e.target.closest("#form")&&e.target.dataset.k;if(k==="mMod"||k==="iMod")aplicarBiblioteca(k[0])});
setTimeout(atualizaListasEq,0);
