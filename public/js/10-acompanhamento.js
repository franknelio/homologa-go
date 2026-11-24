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
  const B=biblioteca(),S=inmSalvos(),D=dsSalvos();for(const r of data){if(String(r.chave).startsWith("INM|"))S[r.chave]=r.dados;else if(String(r.chave).startsWith("DS|"))D[r.chave]=r.dados;else if(B[r.tipo])B[r.tipo][r.chave]=r.dados}store("hgo_equip",B);store("hgo_inm",S);store("hgo_ds",D);atualizaListasEq();
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
setTimeout(atualizaListasEq,0);

/* ---------------- certificados INMETRO já encontrados ---------------- */
// cada registro achado fica guardado na conta (vale em qualquer aparelho) e, no computador, o PDF vai para a pasta
// "Certificados INMETRO" dentro da pasta dos clientes. A próxima busca do mesmo modelo olha aí antes de ir ao site.
const nrmInm=x=>String(x||"").toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g,"");
const chaveInm=(fab,mod)=>"INM|"+nrmInm(fab).slice(0,12)+"|"+nrmInm(mod);
const inmSalvos=()=>load("hgo_inm")||{};
const nomeCert=d=>(`INMETRO ${d.fab} ${d.mod} - ${d.reg.replace("/","-")}.pdf`).replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ");
// pasta dos clientes já liberada neste navegador (não abre a janela de escolher pasta)
async function pastaLiberada(){
  if(typeof podePasta==="undefined"||!podePasta)return null;
  let h=null;try{h=await idb("get")}catch(e){}if(!h)return null;
  let p=await h.queryPermission({mode:"readwrite"});
  if(p==="prompt"&&navigator.userActivation&&navigator.userActivation.isActive)try{p=await h.requestPermission({mode:"readwrite"})}catch(e){}
  return p==="granted"?h:null;
}
async function pastaCert(){const h=await pastaLiberada();return h?h.getDirectoryHandle("Certificados INMETRO",{create:true}):null}
async function certNaPasta(reg){
  const dir=await pastaCert().catch(()=>null);if(!dir)return null;const fim=reg.replace("/","-")+".pdf";
  for await(const [nome,h] of dir.entries())if(h.kind==="file"&&nome.endsWith(fim))return h.getFile();
  return null;
}
async function salvarCertificado(d){
  const dir=await pastaCert();if(!dir)return;const nome=nomeCert(d);
  try{await dir.getFileHandle(nome);return}catch(e){}
  const blob=await pdfInmetro(d.reg);const w=await (await dir.getFileHandle(nome,{create:true})).createWritable();await w.write(blob);await w.close();
}
function guardarInm(t,fab,mod,a,familia){
  const d={t,fab,mod,reg:a.registro,modelo:a.modelo||mod,empresa:a.empresa||"",situacao:a.situacao||"",familia:!!familia,em:new Date().toISOString()};
  const S=inmSalvos();S[chaveInm(fab,mod)]=d;store("hgo_inm",S);
  if(sb&&sessao&&navigator.onLine)sb.from("equipamentos").upsert({user_id:sessao.user.id,tipo:t,chave:chaveInm(fab,mod),dados:d,atualizado_em:d.em}).then(()=>{},()=>{});
  salvarCertificado(d).catch(()=>{});
}
// procura primeiro na conta/biblioteca e na pasta "Certificados INMETRO"
async function inmetroGuardado(t,fab,mod){
  const d=inmSalvos()[chaveInm(fab,mod)];if(d)return {...d,fonte:"conta"};
  const e=Object.values(biblioteca()[t]||{}).find(x=>nrmInm(x[t+"Mod"])===nrmInm(mod)&&/\d{6}\/\d{4}/.test(x[t+"Reg"]||""));
  if(e)return {t,fab,mod,reg:String(e[t+"Reg"]).match(/\d{6}\/\d{4}/)[0],modelo:mod,fonte:"conta"};
  const dir=await pastaCert().catch(()=>null);
  if(dir){const alvo=nrmInm(mod);for await(const [nome,h] of dir.entries()){const m=nome.match(/(\d{6})-(\d{4})\.pdf$/i);if(h.kind==="file"&&m&&alvo.length>=5&&nrmInm(nome).includes(alvo))return {t,fab,mod,reg:m[1]+"/"+m[2],modelo:mod,fonte:"pasta"}}}
  return null;
}

/* ---------------- pasta Datasheets (Módulos / Inversores) ---------------- */
// o app procura o datasheet do modelo nessa pasta e lê sozinho; todo datasheet lido ganha uma cópia lá com nome padrão
async function pastaDs(t){const h=await pastaLiberada();if(!h)return null;return (await h.getDirectoryHandle("Datasheets",{create:true})).getDirectoryHandle(t==="i"?"Inversores":"Modulos",{create:true})}
const nomeDs=(fab,mod,ext)=>(`${fab||""} ${mod}`.trim()+(ext||".pdf")).replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ");
// datasheets guardados na conta (valem em qualquer aparelho, mesmo sem a pasta liberada)
const dsSalvos=()=>load("hgo_ds")||{};
const chaveDs=(t,fab,mod)=>"DS|"+t+"|"+nrmInm(fab).slice(0,12)+"|"+nrmInm(mod);
const notaDs=(nomeArq,fab,alvo)=>{const k=nrmInm(String(nomeArq).replace(/\.[^.]+$/,"")),semFab=k.replace(nrmInm(fab),"");return k.includes(alvo)?3:semFab.length>=6&&alvo.startsWith(semFab)?2:0};
async function datasheetDaConta(t,fab,mod){
  const alvo=nrmInm(mod);let melhor=null,nota=0;
  for(const d of Object.values(dsSalvos()))if(d.t===t){const p=notaDs(d.fab+" "+d.mod,d.fab,alvo);if(p>nota){nota=p;melhor=d}}
  if(!melhor)return null;
  const local=await kv("get","ds:"+melhor.path).catch(()=>null);if(local instanceof Blob&&local.size)return new File([local],melhor.nome,{type:local.type});
  if(!sb||!sessao||!navigator.onLine)return null;
  const {data,error}=await sb.storage.from("anexos").download(melhor.path);if(error||!data)return null;
  kv("put","ds:"+melhor.path,data).catch(()=>{});return new File([data],melhor.nome,{type:data.type||"application/pdf"});
}
async function datasheetNaPasta(t,fab,mod){
  const alvo=nrmInm(mod);if(alvo.length<5)return null;
  const dir=await pastaDs(t).catch(()=>null);if(!dir)return datasheetDaConta(t,fab,mod).catch(()=>null);
  let melhor=null,nota=0;
  for await(const [nome,h] of dir.entries()){
    if(h.kind!=="file"||!/\.(pdf|png|jpe?g|webp)$/i.test(nome))continue;
    // nome do arquivo tem o modelo inteiro, ou o modelo começa com o nome do arquivo (ex. "SUN-6K-G05P1.pdf")
    const pts=notaDs(nome,fab,alvo);
    if(pts>nota){nota=pts;melhor=h}
  }
  return melhor?melhor.getFile():datasheetDaConta(t,fab,mod).catch(()=>null);
}
async function guardarDatasheet(t,file,fab,mod){
  if(!file||!mod)return;
  const ext=((String(file.name||"").match(/\.[a-z0-9]{2,4}$/i)||[".pdf"])[0]).toLowerCase(),nome=nomeDs(fab,mod,ext);
  // na conta: arquivo no Storage + índice na tabela equipamentos
  const k=chaveDs(t,fab,mod);
  if(sessao&&!dsSalvos()[k]){const path=`${sessao.user.id}/datasheets/${t}/${nrmInm(fab)}_${nrmInm(mod)}${ext}`,d={t,fab:fab||"",mod,nome,path,em:new Date().toISOString()};
    kv("put","ds:"+path,file).catch(()=>{});
    let ok=!sb;if(sb&&navigator.onLine){const {error}=await sb.storage.from("anexos").upload(path,file,{upsert:true,contentType:file.type||"application/pdf"});ok=!error;
      if(ok)await sb.from("equipamentos").upsert({user_id:sessao.user.id,tipo:t,chave:k,dados:d,atualizado_em:d.em}).then(()=>{},()=>{})}
    if(ok){const D=dsSalvos();D[k]=d;store("hgo_ds",D)}}
  const dir=await pastaDs(t).catch(()=>null);if(!dir)return;
  try{await dir.getFileHandle(nome);return}catch(e){}
  const w=await (await dir.getFileHandle(nome,{create:true})).createWritable();await w.write(file);await w.close();
}
// trocou o modelo e a biblioteca não tinha: procura o datasheet na pasta e lê
async function datasheetAuto(t){
  const fab=(P[t+"Fab"]||"").trim(),mod=(P[t+"Mod"]||"").trim(),nome=t==="i"?"inversor":"módulo",st=x=>{const e=$("#inm_"+t);if(e)e.textContent=x};
  if(!mod||!sessao||!navigator.onLine)return false;
  const f=await datasheetNaPasta(t,fab,mod).catch(()=>null);if(!f)return false;
  st(`Lendo o datasheet guardado do ${nome} (${f.name})…`);
  try{const d=await lerDatasheet(t,f,t==="i"?n(P.iP):n(P.mP));
    // o modelo escrito pelo usuário continua valendo (o datasheet costuma listar a família toda)
    delete d[t+"Mod"];if(fab)delete d[t+"Fab"];
    Object.assign(P,d);P["_ds"+t]=1;if(P._dsi&&P._dsm)delete P._equipEst;delete P._exemplo;
    syncForm();store("hgo_current",P);render();st(`Datasheet guardado do ${nome} lido (${f.name}): ${Object.keys(d).length} campos preenchidos. Confira.`);
    toast(`Datasheet do ${nome} preenchido automaticamente`);if(!P[t+"Reg"]&&P[t+"Fab"])buscarInmetro(t);return true;
  }catch(e){st(`Achei ${f.name} na pasta Datasheets, mas não consegui ler: ${e.message}`);return false}
}
document.addEventListener("change",e=>{const k=e.target.closest("#form")&&e.target.dataset.k;if((k==="mMod"||k==="iMod")&&!aplicarBiblioteca(k[0]))datasheetAuto(k[0])});

/* ---------------- favoritos: os botões do app são para arrastar, não para clicar ---------------- */
document.addEventListener("click",e=>{const a=e.target.closest("#bmEq,#bmTrt,#bmEq2");if(!a)return;e.preventDefault();e.stopPropagation();
  if(a.id==="bmEq"){abrirEnvioEq();return}
  toast(a.id==="bmTrt"?"Arraste este botão para a barra de favoritos e clique nele na página do SINCETI (Preencher Termo de Responsabilidade Técnica).":"Arraste este botão para a barra de favoritos e clique nele no site da Equatorial (Orçamento de Conexão GD).")},true);

/* ---------------- passo a passo para subir o projeto na Equatorial ---------------- */
const PORTAL_EQ="https://go.equatorialenergia.com.br/sua-conta/geracao-distribuida/parecer-de-acesso/";
function abrirEnvioEq(gerou){
  let box=document.getElementById("eqBox");
  if(!box){box=document.createElement("div");box.id="eqBox";box.style.cssText="position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px";
    box.addEventListener("click",e=>{if(e.target===box||e.target.closest("[data-eqfechar]"))box.remove()});document.body.appendChild(box)}
  const bm=document.getElementById("bmEq"),href=bm?bm.getAttribute("href"):"";
  const gerado=gerou||P._geradoEm,passo=(nmr,ok,txt)=>`<li style="display:flex;gap:12px;margin:0 0 14px"><b style="flex:0 0 28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${ok?"#16a34a":"#f59e0b"};color:#fff">${ok?"✓":nmr}</b><div style="flex:1">${txt}</div></li>`;
  box.innerHTML=`<div style="background:#fff;color:#222;border-radius:12px;width:min(620px,100%);max-height:88vh;overflow:auto;padding:20px 22px;box-shadow:0 10px 40px rgba(0,0,0,.35)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><h3 style="margin:0;flex:1">Subir o projeto ${esc(P.nome||"")} na Equatorial</h3><button type="button" class="btn" data-eqfechar title="Fechar">×</button></div>
    <ol style="list-style:none;padding:0;margin:0">
      ${passo(1,!!gerado,`<b>Gerar todos os documentos</b>${gerado?" (feito: os PDFs estão na pasta do cliente)":` <button type="button" class="btn amber" id="eqGerar">Gerar agora</button>`}`)}
      ${passo(2,false,`<b>Abrir o site da Equatorial</b> em Orçamento de Conexão GD.<br><a class="btn" href="${PORTAL_EQ}" target="_blank" rel="noopener" style="margin-top:6px">Abrir o site da Equatorial ↗</a>`)}
      ${passo(3,false,`<b>Na página da Equatorial, clique no favorito ⭐ Preencher Equatorial</b> na barra de favoritos (no alto do Edge). Ele preenche tudo e anexa os PDFs.<br><small style="color:#666">Não tem o favorito? Mostre a barra com Ctrl+Shift+B e arraste este botão para ela: </small><a class="btn" id="bmEq2" draggable="true" href="${esc(href)}">⭐ Preencher Equatorial</a>`)}
      ${passo(4,false,`<b>Marque "Não sou um robô" e clique em Enviar</b>. Essa parte é sempre sua.`)}
    </ol></div>`;
  const g=document.getElementById("eqGerar");if(g)g.onclick=()=>{box.remove();$("#bAll").click()};
}
$("#bEnviarEq").addEventListener("click",()=>abrirEnvioEq());
