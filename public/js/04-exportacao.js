"use strict";
/* ---------------- renderização ---------------- */
// disjuntor de entrada: calculado pela corrente dos inversores e arredondado para cima nos valores do padrão (32/40/63 A…);
// um valor informado menor ou fora da lista (ex. 60 A) sobe para o próximo
function disjPadrao(v){v=n(v);return v?(BRK_UC.find(b=>b>=v)||v):v}
function render(){
  if(document.activeElement?.id!=="f_disj"&&(n(P.iP)||n(P.disj))){const d=Math.max(disjPadrao(P.disj)||0,calc().disjCAcalc);if(d!==n(P.disj)){P.disj=d;const e=$("#f_disj");if(e)e.value=d}}
  const c=calc();
  $("#kpis").innerHTML=[["Potência instalada",fmt(c.pinst)+" kW"],["Gerador CC",fmt(c.pcc)+" kWp"],["Geração estimada",fmt(c.gerMes,0)+" kWh/mês"],["Formulário","Anexo "+c.anexoForm]].map(([a,b])=>`<div class="kpi"><small>${a}</small><strong>${b}</strong></div>`).join("");
  $("#checks").innerHTML=checks(c).map(([s,t])=>`<div class="chk ${s}"><b>${s==="ok"?"✓":s==="warn"?"!":"✕"}</b><span>${t}</span></div>`).join("")+(P._exemplo?`<div class="chk warn"><b>!</b><span><span class="tag-ex">Exemplo</span> Dados fictícios de demonstração. Abra “Projetos → Novo projeto em branco” para começar o seu.</span></div>`:"");
  const docs=activeDocs(); if(!docs.find(d=>d.id===currentDoc))currentDoc="form";
  $("#tabs").innerHTML=docs.map(d=>`<button class="tab" role="tab" type="button" aria-selected="${d.id===currentDoc}" data-d="${d.id}"><span class="dot"></span>${d.short}</button>`).join("");
  const d=DOCS.find(x=>x.id===currentDoc);
  $("#docTitle").textContent=d.t;
  $("#docBtns").innerHTML=`<button class="btn" type="button" data-pdf="${d.id}">Baixar PDF</button>${d.id==="form"?' <button class="btn" type="button" id="bXlsx">Baixar Excel</button>':""}${["unif","blocos","planta","placa"].includes(d.id)?` <button class="btn" type="button" data-svg="${d.id}">SVG</button>`:""}`;
  const pages=BUILD[d.id](c);
  const desk=$("#desk");
  const avail=desk.clientWidth-28;
  desk.innerHTML=pages.map(p=>`<div class="pagebox">${p}</div>`).join("");
  desk.querySelectorAll(".pagebox").forEach(b=>{const sh=b.firstElementChild;const w=sh.classList.contains("land")?1123:794,h=sh.classList.contains("land")?794:1123;const s=Math.min(1,avail/w);b.style.width=w*s+"px";b.style.height=h*s+"px";sh.style.transform=`scale(${s})`;sh.style.transformOrigin="0 0"});
}
$("#tabs").addEventListener("click",e=>{const b=e.target.closest("[data-d]");if(b){currentDoc=b.dataset.d;render()}});
window.addEventListener("resize",()=>{clearTimeout(rT);rT=setTimeout(render,150)});

/* ---------------- exportação ---------------- */
let downloads=null;
async function saveFile(filename,data){
  try{
    const blob=data instanceof Blob?data:new Blob([data],{type:filename.endsWith(".svg")?"image/svg+xml":"application/octet-stream"});
    if(navigator.canShare&&/Android|iPhone|iPad/i.test(navigator.userAgent)){const f=new File([blob],filename,{type:blob.type||"application/octet-stream"});if(navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:filename});toast("Arquivo pronto: "+filename);return true}catch(e){if(e&&e.name==="AbortError"){toast("Compartilhamento cancelado.");return false}}}}
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast("Arquivo salvo: "+filename);return true;
  }catch(e){toast("Não foi possível salvar ("+e.message+").");return false}
}
// letras que as fontes padrão do PDF (WinAnsi) desenham; fora disso a página sai como imagem para não perder símbolo
const WINANSI=new Set([..."€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"]);
const TROCA_PDF={"≥":">=","≤":"<=","→":"->","←":"<-","⚠":"!","−":"-","≈":"~"};
const textoVetorial=sv=>[...(sv.textContent||"")].every(ch=>ch.charCodeAt(0)<256||WINANSI.has(ch)||TROCA_PDF[ch]);
// página que é só desenho (unifilar, blocos, planta): vai para o PDF como vetor, nítida em qualquer zoom e bem mais leve
function soDesenho(sh){const sv=sh.firstElementChild;return sh.children.length===1&&sv&&sv.tagName.toLowerCase()==="svg"&&!sv.querySelector("foreignObject")&&textoVetorial(sv)}
async function desenhoVetorial(pdf,sh,pw){
  const sv=sh.firstElementChild,sr=sh.getBoundingClientRect(),vr=sv.getBoundingClientRect(),k=pw/sr.width;
  const cl=sv.cloneNode(true);
  const tw=document.createTreeWalker(cl,NodeFilter.SHOW_TEXT);for(let t;(t=tw.nextNode());)t.nodeValue=t.nodeValue.replace(/[≥≤→←⚠−≈]/g,ch=>TROCA_PDF[ch]);
  // a fonte do texto vem do CSS da folha; o svg2pdf não lê CSS externo
  if(!cl.getAttribute("font-family"))cl.setAttribute("font-family",/times|serif/i.test(getComputedStyle(sv).fontFamily)&&!/sans/i.test(getComputedStyle(sv).fontFamily)?"times":"helvetica");
  await window.svg2pdf.svg2pdf(cl,pdf,{x:(vr.left-sr.left)*k,y:(vr.top-sr.top)*k,width:vr.width*k,height:vr.height*k});
}
async function docPdfBlob(id,c,{vetor=true}={}){
  const {jsPDF}=window.jspdf;
  const holder=document.createElement("div");holder.style.cssText="position:fixed;left:-20000px;top:0;";document.body.appendChild(holder);
  let pdf=null;
  try{
    const pages=BUILD[id](c);
    for(const html of pages){
      holder.innerHTML=html;const sh=holder.firstElementChild;const land=sh.classList.contains("land");
      // prancha A0: desenha no tamanho real do desenho para sair nítida na impressão
      const big=sh.classList.contains("big");
      if(big){const sv=sh.querySelector("svg");const [,, vw,vh]=sv.getAttribute("viewBox").split(" ").map(Number);sh.style.width=vw+"px";sh.style.height=vh+"px";sv.setAttribute("width",vw);sv.setAttribute("height",vh)}
      const fmtP=big?"a0":"a4",pw=big?1189:land?297:210,ph=big?841:land?210:297;
      if(!pdf)pdf=new jsPDF({orientation:land?"landscape":"portrait",unit:"mm",format:fmtP});else pdf.addPage(fmtP,land?"landscape":"portrait");
      if(vetor&&window.svg2pdf&&soDesenho(sh)){
        try{await desenhoVetorial(pdf,sh,pw);continue}
        catch(e){console.warn("PDF vetorial falhou, usando imagem",e);pdf.setFillColor(255,255,255);pdf.rect(0,0,pw,ph,"F")}
      }
      const canvas=await html2canvas(sh,{scale:big?2.6:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
      pdf.addImage(canvas.toDataURL("image/jpeg",0.92),"JPEG",0,0,pw,ph);
    }
  }finally{holder.remove()}
  return pdf.output("blob");
}
function svgOf(id,c){const html=BUILD[id](c)[0];const m=html.match(/<svg[\s\S]*<\/svg>/);return m?m[0].replace('width="1123" height="794"','width="2400" height="1697"'):""}
function xlsxBlob(c){
  const rows=[
   ["FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE CONEXÃO – MICRO E MINIGERAÇÃO DISTRIBUÍDA"],["Equatorial Goiás · NT.00020.EQTL · ANEXO "+c.anexoForm],[],
   ["1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA"],["Titular",P.nome],["CPF/CNPJ",P.doc],["Nº da UC",P.uc],["Classe",P.classe],["Endereço",P.end],["Bairro",P.bairro],["Município/UF",`${P.cidade}/${P.uf}`],["CEP",P.cep],["Telefone",P.tel],["E-mail",P.email],["Latitude",n(P.lat)],["Longitude",n(P.lon)],[],
   ["2. DADOS DA UNIDADE CONSUMIDORA"],["Carga instalada (kW)",cargaInst()],["Tensão de atendimento",P.tensao],["Tipo de conexão",P.ligacao],["Disjuntor de entrada (A)",n(P.disj)],["Ramal",P.ramal],["Tipo de solicitação",P.tipoSolic],["Modalidade",P.modalidade],[],
   ["3. DADOS DA GERAÇÃO"],["Potência instalada (kW)",+c.pinst.toFixed(2)],["Fonte","Solar fotovoltaica"],["Categoria",c.categoria],[],
   ["4. UNIDADES GERADORAS – SOLAR FOTOVOLTAICA"],["Item","Potência do módulo (W)","Quantidade","Potência de pico (kWp)","Área do arranjo (m²)","Fabricante","Modelo"],
   [1,n(P.mP),c.qtd,+c.pcc.toFixed(2),+c.area.toFixed(2),P.mFab,P.mMod],["TOTAL","",c.qtd,+c.pcc.toFixed(2),+c.area.toFixed(2)],[],
   ["5. DADOS DOS INVERSORES"],["Item","Fabricante","Modelo","Potência nominal (kW)","Faixa de tensão de operação (V)","Corrente nominal (A)","Fator de potência","Rendimento (%)","DHT de corrente (%)"],
   [1,P.iFab,P.iMod+" (x"+(n(P.iQ)||1)+")",+c.pca.toFixed(2),`${P.iMin}-${P.iMax}`,+c.iout.toFixed(1),n(P.iFp),n(P.iEff),n(P.iDht)],[],
   ["6. RESPONSÁVEL TÉCNICO"],["Nome",P.rtNome],["Título",P.rtTit],["Registro",P.rtReg],["ART/TRT",P.rtArt],["Telefone",P.rtTel],["E-mail",P.rtEmail]
  ];
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=[{wch:34},{wch:26},{wch:14},{wch:20},{wch:22},{wch:18},{wch:18},{wch:14},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws,"Solicitação");
  if(c.benef.length){const w2=XLSX.utils.aoa_to_sheet([["Nº da UC","Titular","Endereço","% dos créditos"],...c.benef.map(r=>[r[0],r[1]||"",r[2]||"",n(r[3])])]);XLSX.utils.book_append_sheet(wb,w2,"Beneficiárias")}
  const out=XLSX.write(wb,{bookType:"xlsx",type:"array"});return new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
const NAMES={form:"01_Formulario_Solicitacao",memo:"02_Memorial_Descritivo",unif:"03_Diagrama_Unifilar",blocos:"04_Diagrama_de_Blocos",planta:"05_Planta_Situacao",placa:"06_Placa_Advertencia",benef:"07_Lista_Beneficiarias",check:"00_Checklist_Protocolo"};
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-pdf],[data-svg],#bXlsx");if(!b)return;
  const c=calc();b.disabled=true;
  try{
    if(b.dataset.pdf){toast("Gerando PDF…");await saveFile(`${NAMES[b.dataset.pdf]}_${slug()}.pdf`,await docPdfBlob(b.dataset.pdf,c))}
    else if(b.dataset.svg){await saveFile(`${NAMES[b.dataset.svg]}_${slug()}.svg`,svgOf(b.dataset.svg,c))}
    else await saveFile(`${NAMES.form}_${slug()}.xlsx`,xlsxBlob(c));
  }catch(err){toast("Erro ao gerar: "+err.message)}finally{b.disabled=false}
});
/* pasta dos clientes: no computador (Edge/Chrome) grava os PDFs direto numa pasta com o nome do cliente */
const podePasta="showDirectoryPicker" in window;
function idb(op,val){return new Promise((ok,erro)=>{const r=indexedDB.open("hgo",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onerror=()=>erro(r.error);r.onsuccess=()=>{try{const t=r.result.transaction("kv",op==="get"?"readonly":"readwrite").objectStore("kv");
  const q=op==="get"?t.get("pasta"):t.put(val,"pasta");q.onsuccess=()=>ok(q.result);q.onerror=()=>erro(q.error)}catch(e){erro(e)}}})}
async function escolherPasta(){
  const h=await window.showDirectoryPicker({id:"hgo-clientes",mode:"readwrite",startIn:"documents"});
  try{await idb("put",h)}catch(e){}$("#bPasta").textContent="Pasta: "+h.name;toast("Os clientes serão salvos em: "+h.name);return h}
async function pastaBase(){
  let h=null;try{h=await idb("get")}catch(e){}
  if(h&&(await h.queryPermission({mode:"readwrite"})==="granted"||await h.requestPermission({mode:"readwrite"})==="granted")){
    // pasta renomeada, movida ou apagada: o navegador perde o caminho e é preciso escolher de novo
    try{await h.values().next();return h}catch(e){if(e.name!=="NotFoundError")throw e;toast(`A pasta "${h.name}" não existe mais (foi renomeada ou movida). Escolha a pasta de novo.`)}
  }else toast("Escolha a pasta onde ficarão as pastas dos clientes");
  return escolherPasta()}
function nomePasta(){return ((P.nome||"").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim().slice(0,80))||"Cliente sem nome"}
if(podePasta){idb("get").then(h=>{if(h)$("#bPasta").textContent="Pasta: "+h.name}).catch(()=>{})}else $("#bPasta").hidden=true;
/* botão "Abrir pasta": o navegador não abre o Explorador do Windows, então a pasta é mostrada aqui e cada arquivo abre numa aba */
let pastaPilha=[];
async function mostrarPasta(){
  const h=pastaPilha[pastaPilha.length-1],busca=($("#pastaBusca").value||"").trim().toLowerCase();
  $("#pastaCam").textContent=pastaPilha.map(x=>x.name).join(" › ");$("#pastaVoltar").hidden=pastaPilha.length<2;
  const it=[];for await(const e of h.values())it.push(e);
  const L=it.filter(e=>!busca||e.name.toLowerCase().includes(busca)).sort((a,b)=>(a.kind===b.kind?0:a.kind==="directory"?-1:1)||a.name.localeCompare(b.name,"pt-BR",{numeric:true}));
  const atual=nomePasta();
  $("#pastaLista").innerHTML=L.length?L.map((e,i)=>`<button type="button" data-pi="${i}" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:9px 10px;border:0;border-bottom:1px solid #f0f0f0;background:${e.kind==="directory"&&e.name===atual?"#fff3e0":"none"};cursor:pointer;font:inherit;color:inherit"><span>${e.kind==="directory"?"📁":/\.pdf$/i.test(e.name)?"📄":/\.(xlsx?|csv)$/i.test(e.name)?"📊":/\.(png|jpe?g|webp)$/i.test(e.name)?"🖼️":"📎"}</span><span style="flex:1">${esc(e.name)}</span>${e.kind==="directory"&&e.name===atual?'<small style="color:#b45309">projeto aberto</small>':""}</button>`).join(""):'<p style="padding:12px;color:#777">Pasta vazia.</p>';
  $("#pastaLista").onclick=async ev=>{const b=ev.target.closest("[data-pi]");if(!b)return;const e=L[+b.dataset.pi];
    if(e.kind==="directory"){pastaPilha.push(e);$("#pastaBusca").value="";mostrarPasta();return}
    const f=await e.getFile(),u=URL.createObjectURL(f);
    if(/\.(pdf|png|jpe?g|webp|txt)$/i.test(f.name))window.open(u,"_blank");else{const a=document.createElement("a");a.href=u;a.download=f.name;a.click()}
    setTimeout(()=>URL.revokeObjectURL(u),60000)};
}
async function abrirPasta(){
  const base=await pastaBase();pastaPilha=[base];
  // se o projeto aberto já tem pasta, entra direto nela
  if(P.nome)try{pastaPilha.push(await base.getDirectoryHandle(nomePasta()))}catch(e){}
  $("#pastaBusca").value="";$("#pastaBox").hidden=false;await mostrarPasta();
}
$("#bAbrirPasta").addEventListener("click",()=>abrirPasta().catch(e=>{if(e.name!=="AbortError")toast("Não foi possível abrir a pasta: "+e.message)}));
$("#pastaVoltar").addEventListener("click",()=>{if(pastaPilha.length>1){pastaPilha.pop();$("#pastaBusca").value="";mostrarPasta()}});
$("#pastaFechar").addEventListener("click",()=>{$("#pastaBox").hidden=true});
$("#pastaBox").addEventListener("click",e=>{if(e.target.id==="pastaBox")$("#pastaBox").hidden=true});
$("#pastaTrocar").addEventListener("click",async()=>{try{const h=await escolherPasta();pastaPilha=[h];mostrarPasta()}catch(e){}});
$("#pastaBusca").addEventListener("input",()=>mostrarPasta());
if(!podePasta)$("#bAbrirPasta").hidden=true;
/* ponte para o favorito "Preencher Equatorial": esta janelinha lê a pasta do cliente aberto e manda dados + PDFs para a página da Equatorial */
if(/[?&]ponte=1/.test(location.search))setTimeout(()=>{
  const c=calc(),cli=nomePasta();
  document.body.innerHTML=`<div style="font:16px Arial,sans-serif;padding:24px;text-align:center;color:#222"><h2 style="color:#FF6A00;margin:0 0 8px">HomologaGO → Equatorial</h2><p>Cliente: <b>${esc(P.nome||"(nenhum projeto aberto)")}</b></p><p id="pst">Esperando a página da Equatorial ou do SINCETI…</p><button id="pbt" hidden style="font-size:17px;padding:12px 22px;background:#FF6A00;color:#fff;border:0;border-radius:10px;cursor:pointer">Liberar a pasta e enviar os arquivos</button></div>`;
  const st=t=>{$("#pst").textContent=t};
  let pedido=null;
  async function arquivos(pedir){
    const h=await idb("get").catch(()=>null);if(!h)throw new Error("o app ainda não tem pasta escolhida");
    let perm=await h.queryPermission({mode:"readwrite"});
    if(perm!=="granted"){if(!pedir)return null;perm=await h.requestPermission({mode:"readwrite"});if(perm!=="granted")throw new Error("acesso à pasta negado")}
    const d=await h.getDirectoryHandle(cli).catch(()=>null);if(!d)throw new Error(`a pasta "${cli}" não existe; clique em Gerar todos os documentos antes`);
    const L=[];for await(const e of d.values())if(e.kind==="file"){const f=await e.getFile();L.push({nome:f.name,tipo:f.type,data:f.lastModified,buf:await f.arrayBuffer()})}
    // anexos guardados no projeto (RG/CNH, documentos do cliente, procuração) que ainda não estão na pasta: pega da conta e já grava na pasta
    try{
      const ext=n=>((String(n).match(/\.[a-z0-9]{2,4}$/i)||[".pdf"])[0]).toLowerCase(),limpa=n=>String(n).replace(/[\\/:*?"<>|]+/g,"_");
      const tem=re=>L.some(x=>re.test(x.nome));
      for(const [k,a] of await anexosDoProjeto()){
        let nome=null;
        if(k==="docTit"&&!tem(/^09_Documento_titular/i))nome="09_Documento_titular_RG_CNH"+ext(a.nome);
        else if(/^doc\d+$/.test(k)&&!tem(new RegExp("^09_Documento_cliente_"+k.slice(3)+"_","i")))nome=`09_Documento_cliente_${k.slice(3)}_${limpa(a.nome)}`;
        else if(ANEXO_ARQ[k]&&!tem(new RegExp("^"+ANEXO_ARQ[k],"i")))nome=ANEXO_ARQ[k]+ext(a.nome);
        if(!nome)continue;
        L.push({nome,tipo:a.tipo,data:Date.now(),buf:a.buf.slice(0)});
        try{const w=await (await d.getFileHandle(nome,{create:true})).createWritable();await w.write(new Blob([a.buf],{type:a.tipo||""}));await w.close()}catch(e){}
      }
      // ART/TRT assinada: se não está na pasta, gera da ART guardada no projeto (aparelho ou conta)
      if(!tem(/^00_ART_TRT/i)&&P._id){try{const a=await kv("get","art:"+P._id).catch(()=>null)||await anexoGet(P._id,"art","ART_TRT.pdf");
        if(a&&a.buf){artArq=a;const bl=await artAssinadaBlob(),nome="00_ART_TRT_assinada.pdf";L.push({nome,tipo:"application/pdf",data:Date.now(),buf:await bl.arrayBuffer()});try{const w=await (await d.getFileHandle(nome,{create:true})).createWritable();await w.write(bl);await w.close()}catch(e){}}}catch(e){}}
      // documento do procurador = CNH/RG do responsável técnico salvo na conta
      if(!tem(/^11_Documento_procurador/i)){let drt=await kv("get","docRT").catch(()=>null);
        if(!drt&&sb){try{const {data}=await sb.from("perfil").select("doc_rt,doc_rt_nome").maybeSingle();if(data&&data.doc_rt)drt={nome:data.doc_rt_nome||"Documento_RT.pdf",url:data.doc_rt}}catch(e){}}
        if(drt){const bl=b64blob(drt.url),nome="11_Documento_procurador_RT"+ext(drt.nome);L.push({nome,tipo:bl.type,data:Date.now(),buf:await bl.arrayBuffer()});try{const w=await (await d.getFileHandle(nome,{create:true})).createWritable();await w.write(bl);await w.close()}catch(e){}}}
    }catch(e){}
    return L;
  }
  async function enviar(pedir){
    if(sb){try{const {data:u}=await sb.auth.getUser();const rt=u&&u.user&&u.user.user_metadata&&u.user.user_metadata.rt;if(rt)store("hgo_rt",{...(load("hgo_rt")||{}),...Object.fromEntries(Object.entries(rt).filter(([k,v])=>v))})}catch(e){}}
    const L=await arquivos(pedir);if(!L){$("#pbt").hidden=false;st("Clique no botão para liberar a pasta "+cli+":");return}
    const doc=String(P.doc||"").replace(/\D/g,"");
    const dados={tipo:"hgo-dados",nome:P.nome||"",doc,pj:doc.length>11,tel:P.tel||P.rtTel||"",cel:P.tel||P.rtTel||"",rtNome:P.rtNome||"",rtReg:P.rtReg||"",rtCpf:String(P.rtCpf||(load("hgo_rt")||{}).rtCpf||"").replace(/\D/g,""),rtEmail:(load("hgo_rt")||{}).rtEmail||P.rtEmail||"",rtTel:P.rtTel||"",
      disj:String(n(P.disj)||c.disjCA||""),email:P.rtEmailEq||(load("hgo_rt")||{}).rtEmailEq||P.rtEmail||P.email||"",mini:c.pinst>75,modalidade:P.modalidade||"",arquivos:L};
    pedido.source.postMessage(dados,pedido.origin);
    $("#pbt").hidden=true;st(`✓ Enviados os dados e ${L.length} arquivos. Pode fechar esta janela.`);setTimeout(()=>window.close(),4000);
  }
  $("#pbt").onclick=()=>enviar(true).catch(e=>st("Erro: "+e.message));
  addEventListener("message",e=>{
    // favorito "Preencher TRT" no SINCETI: só os dados da TRT, sem arquivos
    if(/^https:\/\/([a-z0-9-]+\.)*sinceti\.net\.br$/.test(e.origin)&&e.data&&e.data.tipo==="hgo-pronto-trt"){
      if(!P.nome){st("Nenhum projeto aberto no HomologaGO. Abra o projeto do cliente e tente de novo.");return}
      e.source.postMessage({tipo:"hgo-trt",dados:dadosTRT()},e.origin);st("✓ Dados da TRT de "+P.nome+" enviados ao SINCETI. Pode fechar esta janela.");setTimeout(()=>window.close(),3000);return}
    if(!/^https:\/\/([a-z0-9-]+\.)*equatorialenergia\.com\.br$/.test(e.origin)||!e.data||e.data.tipo!=="hgo-pronto"||pedido)return;
    pedido=e;if(!P.nome){st("Nenhum projeto aberto no HomologaGO. Abra o projeto do cliente e tente de novo.");return}
    st("Lendo a pasta "+cli+"…");enviar(false).catch(er=>st("Erro: "+er.message));
  });
},300);
$("#bPasta").addEventListener("click",()=>escolherPasta().catch(e=>{if(e.name!=="AbortError")toast("Não foi possível usar a pasta: "+e.message)}));

$("#bAll").addEventListener("click",async()=>{
  {const cc=conferenciaCruzada(calc()),ruins=cc.filter(x=>x[0]==="bad"),av=cc.filter(x=>x[0]==="warn");
   const lim=t=>"• "+String(t).replace(/<[^>]+>/g,"");
   if(ruins.length&&!confirm(`Os documentos de ${P.nome||"este projeto"} têm ${ruins.length} divergência(s) que costumam reprovar:\n\n${ruins.map(x=>lim(x[1])).join("\n")}\n\nOK = gerar mesmo assim (não recomendado)\nCancelar = corrigir antes`))return;
   if(!ruins.length&&av.length&&!confirm(`Antes de gerar, confira:\n\n${av.map(x=>lim(x[1])).join("\n")}\n\nOK = gerar\nCancelar = conferir antes`))return;}
  const b=$("#bAll");b.disabled=true;const c=calc();
  const salvos=[],erros=[],pendentes=[];
  try{
    let destino=null;
    if(podePasta){try{const base=await pastaBase();destino=await base.getDirectoryHandle(nomePasta(),{create:true})}
      catch(e){if(e.name==="AbortError"){toast("Nenhuma pasta escolhida.");return}erros.push("pasta: "+e.message)}}
    // grava cada arquivo assim que fica pronto; se a pasta recusar, ele vai para o .zip
    const gravar=async(nome,blob)=>{
      if(destino){try{const w=await (await destino.getFileHandle(nome,{create:true})).createWritable();await w.write(blob);await w.close();salvos.push(nome);return}catch(e){erros.push(`${nome}: não gravou na pasta (${e.name}: ${e.message})`)}}
      pendentes.push([nome,blob]);
    };
    for(const d of activeDocs()){
      b.textContent=`Gerando ${d.short}…`;
      try{await gravar(`${NAMES[d.id]}.pdf`,await docPdfBlob(d.id,c))}catch(e){erros.push(`${d.short}: ${e&&e.message||e}`)}
    }
    for(const [t,rot] of [["i","inversor"],["m","modulo"]]){
      const reg=String(P[t+"Reg"]||"").match(/\d{6}\/\d{4}/)?.[0];if(!reg){erros.push(`INMETRO do ${rot}: o projeto está sem número de registro, não deu para baixar o PDF`);continue}
      b.textContent=`Baixando INMETRO do ${rot}…`;
      try{const blob=await pdfInmetro(reg);await gravar(`08_INMETRO_${rot}_${reg.replace("/","-")}.pdf`,blob)}catch(e){erros.push(`INMETRO do ${rot} (${reg}): ${e.message}`)}
    }
    // datasheets da pasta Datasheets entram na pasta do cliente
    for(const [t,rot] of [["i","inversor"],["m","modulo"]]){try{const f=await datasheetNaPasta(t,P[t+"Fab"],P[t+"Mod"]);if(f)await gravar(`12_Datasheet_${rot}${((f.name.match(/\.[a-z0-9]{2,4}$/i)||[".pdf"])[0]).toLowerCase()}`,f)}catch(e){}}
    {const ext=n=>((String(n).match(/\.[a-z0-9]{2,4}$/i)||[".pdf"])[0]).toLowerCase(),limpa=n=>String(n).replace(/[\\/:*?"<>|]+/g,"_");
     const lista=await anexosDoProjeto();
     for(const [k,a] of lista){const blob=new Blob([a.buf],{type:a.tipo||""});
       if(k==="docTit")await gravar("09_Documento_titular_RG_CNH"+ext(a.nome),blob);
       else if(/^doc\d+$/.test(k))await gravar(`09_Documento_cliente_${k.slice(3)}_${limpa(a.nome)}`,blob);
       else if(ANEXO_ARQ[k])await gravar(ANEXO_ARQ[k]+ext(a.nome),blob)}
     // sem procuração no projeto: tira da pasta uma 10_Procuracao antiga (ex. contrato gravado por engano)
     if(destino&&!lista.some(([k])=>k==="proc"))for await (const [nm,h] of destino.entries())if(/^10_Procuracao/i.test(nm)&&h.kind==="file")try{await destino.removeEntry(nm)}catch(_){}
     if(!lista.some(([k])=>k==="procDoc")){const d=await kv("get","docRT").catch(()=>null);if(d)await gravar("11_Documento_procurador_RT"+ext(d.nome),b64blob(d.url))}
     if(!lista.some(([k])=>k==="docTit"||/^doc\d+$/.test(k)))erros.push("RG/CNH do titular: não está no projeto. Anexe em \"RG/CNH do titular\" (entrada rápida) e gere de novo")}
    if(artArq){b.textContent="Assinando a ART/TRT…";try{await gravar("00_ART_TRT_assinada.pdf",await artAssinadaBlob())}catch(e){erros.push("ART/TRT: "+e.message)}}
    if(pendentes.length){
      b.textContent="Compactando…";const zip=new JSZip();const folder=zip.folder(nomePasta());pendentes.forEach(([nome,blob])=>folder.file(nome,blob));
      if(await saveFile(`${nomePasta()}.zip`,await zip.generateAsync({type:"blob"})))salvos.push(`${pendentes.length} no arquivo ${nomePasta()}.zip`);
    }
  }catch(err){erros.push(err.message)}
  finally{
    b.disabled=false;b.textContent="Gerar todos os documentos";
    const res=`${salvos.length?`Salvos${destino_ok(salvos)}: ${salvos.join(", ")}.`:"Nenhum arquivo foi salvo."}${erros.length?`\n\nProblemas:\n- ${erros.join("\n- ")}`:""}`;
    if(erros.length||!salvos.length)alert(res);else toast(`${salvos.length} arquivos salvos na pasta "${nomePasta()}"`);
  }
});
function destino_ok(l){return l.some(x=>/\.zip$/.test(x))?"":` na pasta "${nomePasta()}"`}
