"use strict";
/* ---------------- equipamentos estimados pela potência ---------------- */
function estModulo(W){
  let voc,vmp,C,L,beta;
  if(W<=470){voc=41.6;vmp=34.6;C=W<=420?1.722:1.903;L=1.134;beta=-0.28}
  else if(W<=565){voc=49.7;vmp=41.8;C=2.278;L=1.134;beta=-0.275}
  else if(W<=640){voc=52.2;vmp=43.9;C=2.382;L=1.134;beta=-0.25}
  else{voc=46.2;vmp=38.6;C=2.384;L=1.303;beta=-0.25}
  const imp=W/vmp,isc=imp*1.065;
  return {mVoc:voc,mVmp:vmp,mImp:+imp.toFixed(2),mIsc:+isc.toFixed(2),mC:C,mL:L,mBeta:beta,mEff:+(W/(C*L*10)).toFixed(1),mPeso:+(C*L*11).toFixed(1),mCel:W<=470?108:W<=565?144:132,mTipo:"Monocristalino"};
}
function estInversor(kW,ligacao){
  const tri=ligacao==="Trifásico" || kW>10; // UC trifásica: inversor sempre trifásico 380 V (regra do usuário)
  if(tri){const nm=kW<=12?2:kW<=25?3:kW<=50?4:6;
    return {iFases:"Trifásico 380/220 V",iVmax:1100,iMin:180,iMax:1000,iNmppt:nm,iImax:32,iIsc:40,iIout:+(kW*1000/(Math.sqrt(3)*380)).toFixed(1),iEff:98.4,iDht:3,iFp:1,iIP:"IP66"}}
  return {iFases:"Monofásico 220 V",iVmax:600,iMin:80,iMax:550,iNmppt:kW<=3.6?1:kW<=6?2:3,iImax:16,iIsc:20,iIout:+(kW*1000/220).toFixed(1),iEff:97.6,iDht:3,iFp:1,iIP:"IP65"};
}
function autoStrings(){
  const q=n(P.mQ),voc=n(P.mVoc),vmp=n(P.mVmp),beta=n(P.mBeta)/100||-0.0028,tmin=n(P.tmin)||8;
  if(!q||!voc)return;
  const maxS=Math.max(1,Math.floor(n(P.iVmax)/(voc*(1+beta*(tmin-25)))));
  const minS=Math.max(1,Math.ceil(n(P.iMin)/(vmp*(1+beta*45))));
  const mppts=Math.max(1,n(P.iNmppt))*Math.max(1,n(P.iQ));
  let best=null;
  for(let ns=Math.ceil(q/maxS);ns<=q;ns++){if(q%ns)continue;const per=q/ns;if(per<minS)break;
    const iscOk=Math.ceil(ns/mppts)*n(P.mIsc)<=n(P.iIsc);best={ns,per};if(iscOk)break}
  if(!best){const ns=Math.ceil(q/maxS);best={ns,per:Math.ceil(q/ns)}}
  P.nStr=best.ns;P.mPorStr=best.per;
}

/* ---------------- documentos → imagens ---------------- */
let sample=null,imgLimits=null,qFiles=[];
function scaleToBlob(src,w,h,max=1800){
  const s=Math.min(1,max/Math.max(w,h));const cv=document.createElement("canvas");cv.width=Math.round(w*s);cv.height=Math.round(h*s);
  cv.getContext("2d").drawImage(src,0,0,cv.width,cv.height);return new Promise(r=>cv.toBlob(r,"image/jpeg",0.85));
}
async function fileToImages(f,maxPag=2){
  if(f.type==="application/pdf"||/\.pdf$/i.test(f.name)){
    if(!window.pdfjsLib)throw new Error("leitor de PDF indisponível");
    const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;const out=[];
    for(let i=1;i<=Math.min(pdf.numPages,maxPag);i++){const pg=await pdf.getPage(i);const vp=pg.getViewport({scale:2});
      const cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;
      out.push(await scaleToBlob(cv,cv.width,cv.height))}
    return out;
  }
  const url=URL.createObjectURL(f);
  try{const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});return [await scaleToBlob(im,im.naturalWidth,im.naturalHeight)]}
  finally{URL.revokeObjectURL(url)}
}
function renderChips(){$("#qChips").innerHTML=qFiles.map((f,i)=>`<span class="chip"><span>${esc(f.name)}</span><button type="button" data-rm="${i}" aria-label="Remover ${esc(f.name)}">×</button></span>`).join("")}
function addFiles(list){for(const f of list){if(f.type.startsWith("image/")||f.type==="application/pdf"||/\.pdf$/i.test(f.name))qFiles.push(f)}renderChips()}
$("#qFiles").addEventListener("change",e=>{addFiles(e.target.files);e.target.value=""});
$("#qChips").addEventListener("click",e=>{const b=e.target.closest("[data-rm]");if(b){qFiles.splice(+b.dataset.rm,1);renderChips()}});
const drop=$("#drop");
["dragenter","dragover"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>addFiles(e.dataTransfer.files));
{const dd=$("#dropDoc");["dragenter","dragover"].forEach(t=>dd.addEventListener(t,e=>{e.preventDefault();dd.classList.add("over")}));
 ["dragleave","drop"].forEach(t=>dd.addEventListener(t,e=>{e.preventDefault();dd.classList.remove("over")}));
 dd.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(!f)return;const dt=new DataTransfer();dt.items.add(f);$("#q_docTit").files=dt.files;$("#q_docTit").dispatchEvent(new Event("change",{bubbles:true}))})}

const DOC_KEYS={nome:"nome completo da pessoa do RG/CNH (nunca o nome da conta de energia)",doc:"CPF do RG/CNH ou CNPJ do cartão CNPJ (nunca o da conta)",rg:"RG com órgão emissor/UF",uc:"número da unidade consumidora / conta contrato",
  classe:"classe [Residencial | Comercial | Industrial | Rural | Poder público]",tel:"telefone",email:"e-mail",end:"logradouro e número da instalação (endereço da UC, não o de correspondência)",
  bairro:"bairro/setor da instalação",cidade:"município da instalação",cep:"CEP da instalação",uf:"UF",
  ligacao:"tipo de fornecimento [Monofásico | Bifásico | Trifásico] (procure Tipo de Fornecimento, Ligação, Fases, a classe ex. B1 RESIDENCIAL TRIFASICO ou a tensão 380/220 V; se não estiver escrito, deduza pelo custo de disponibilidade: 30 kWh Monofásico, 50 kWh Bifásico, 100 kWh Trifásico)",consumo:"histórico de consumo em kWh dos últimos 12 meses, do mais antigo ao mais recente, separado por vírgulas",
  lat:"latitude aproximada do endereço em graus decimais (estimativa pelo endereço, se não constar)",lon:"longitude aproximada do endereço em graus decimais"};

const MODS=["Autoconsumo local","Autoconsumo remoto","Geração compartilhada","Múltiplas unidades consumidoras (EMUC)"];
let qModSel="";
function desenharQMod(){$("#qMod").innerHTML=MODS.map(m=>`<button type="button" class="chip" data-qmod="${esc(m)}" aria-pressed="${m===qModSel}">${esc(m.replace(" (EMUC)",""))}</button>`).join("");$("#qRatBox").hidden=!qModSel||qModSel==="Autoconsumo local"}
desenharQMod();
$("#qMod").addEventListener("click",e=>{const b=e.target.closest("[data-qmod]");if(!b)return;qModSel=b.dataset.qmod;$("#qMod").classList.remove("falta");desenharQMod()});
$("#q_rat").addEventListener("change",e=>{const f=[...e.target.files];$("#q_rat_n").textContent=f.length?f.length+" conta(s)":""});
$("#qGo").addEventListener("click",async()=>{
  const msg=t=>$("#qMsg").textContent=t;
  const iP=n($("#q_iP").value),iQ=n($("#q_iQ").value)||1,mP=n($("#q_mP").value),mQ=n($("#q_mQ").value);
  if(!iP||!mP||!mQ){msg("Informe a potência do inversor, a potência e a quantidade de módulos.");return}
  if(!qModSel){msg("Escolha a modalidade de compensação.");$("#qMod").classList.add("falta");$("#qMod").scrollIntoView({block:"center",behavior:"smooth"});return}
  const btn=$("#qGo");btn.disabled=true;
  try{
    const rt=load("hgo_rt")||{};
    const Q={...BLANK,...rt,projeto:"Novo projeto",dataDoc:new Date().toISOString().slice(0,10)};
    let found=0,aiNote="",ligLida=false,lidos={},confImgs={doc:[],fat:[]};
    const fDoc=$("#q_docTit").files[0],docsLer=[...(fDoc?[fDoc]:[]),...qFiles];
    if(docsLer.length&&sample){
      msg("Preparando documentos…");
      const imgsDoc=[],imgs=[];
      if(fDoc)try{imgsDoc.push(...await fileToImages(fDoc))}catch(e){aiNote=`Não consegui abrir ${fDoc.name}. `}
      for(const f of qFiles){try{imgs.push(...await fileToImages(f))}catch(e){aiNote=`Não consegui abrir ${f.name}. `}}
      const max=imgLimits?.maxCount||5;
      const prompt=`As imagens são a conta de energia da Equatorial Goiás de um cliente de energia solar.
Devolva SOMENTE um objeto JSON com estas chaves, preenchendo apenas o que estiver legível (omita o que não encontrar):
${Object.entries(DOC_KEYS).filter(([k])=>!["nome","doc","rg"].includes(k)).map(([k,d])=>`- ${k}: ${d}`).join("\n")}
Regras: a conta muitas vezes NÃO está no nome do cliente, por isso não devolva nome, CPF nem RG; números (lat, lon) como número com ponto decimal; nos campos com opções use exatamente uma das opções; não invente dados, exceto lat/lon aproximados pelo endereço.`;
      const out={};lidos=out;confImgs={doc:imgsDoc,fat:imgs};
      // 1) RG/CNH: só nome, CPF/CNPJ e RG
      if(imgsDoc.length){msg("Lendo o RG/CNH…");
        try{const r=await sample.json("",{images:imgsDoc.slice(0,max),tipo:"identidade"});for(const k of ["nome","doc","rg"])if(r&&r[k])out[k]=r[k]}catch(e){aiNote+=`RG/CNH não lido (${e.message}). `}}
      // 2) fatura: endereço, UC, classe, ligação, consumo (nunca nome/CPF)
      for(let i=0;i<imgs.length;i+=max){
        msg(`Lendo a fatura${imgs.length>max?` (${i/max+1}/${Math.ceil(imgs.length/max)})`:""}…`);
        const r=await sample.json(prompt,{images:imgs.slice(i,i+max),tipo:"fatura"});
        for(const [k,v] of Object.entries(r||{})){if(k in DOC_KEYS&&!["nome","doc","rg"].includes(k)&&v!==null&&v!==""&&out[k]==null)out[k]=v}
      }
      ligLida=!!out.ligacao;if(qFiles.length&&!out.ligacao)aiNote+="Não achei na fatura se a ligação é monofásica, bifásica ou trifásica: confira em Titular e UC. ";else if(out.ligacao)aiNote+="Ligação lida da fatura: "+out.ligacao+(out.ligacao==="Trifásico"?" (inversor trifásico 380 V)":"")+". ";
      if(!fDoc)aiNote+="Sem RG/CNH: nome e CPF do titular ficaram em branco (a fatura pode não estar no nome do cliente). ";
      for(const [k,v] of Object.entries(out)){Q[k]=String(v);found++}
      if(out.lat!=null)Q._coordAprox=true;
      if(Q.ligacao==="Trifásico"){Q.tensao="380/220 V";Q.disj=Q.disj||""}else if(Q.ligacao==="Bifásico"){Q.tensao="380/220 V";Q.disj=Q.disj||""}else{Q.tensao="220 V (F-N)";Q.disj=Q.disj||""}
      if(!n(Q.disj))Q._disjPadrao=true;else delete Q._disjPadrao;
    } else if(docsLer.length&&!sample){aiNote="A leitura automática não está disponível nesta visualização; complete os dados do cliente abaixo. "}
    else {Q.disj="";Q._disjPadrao=true}
    Object.assign(Q,{iP,iQ,mP,mQ},estModulo(mP),estInversor(iP,Q.ligacao));
    // a fatura não disse a ligação e o inversor só cabe em trifásico (acima de 10 kW): a UC é trifásica 380/220 V
    if(!ligLida&&String(Q.iFases).startsWith("Trif")&&Q.ligacao!=="Trifásico"){Q.ligacao="Trifásico";Q.tensao="380/220 V";aiNote+="Ligação considerada Trifásico (inversor acima de 10 kW). "}
    const ds={i:$("#q_dsI").files[0],m:$("#q_dsM").files[0]},dsOk=[],dsPasta=[];
    // sem datasheet escolhido: procura pelo modelo na pasta Datasheets
    for(const t of ["i","m"])if(!ds[t]&&$(`#q_${t}Mod`).value.trim()){const f=await datasheetNaPasta(t,$(`#q_${t}Fab`).value.trim(),$(`#q_${t}Mod`).value.trim()).catch(()=>null);if(f){ds[t]=f;dsPasta.push(t)}}
    for(const t of ["i","m"])if(ds[t]){
      const nome=t==="i"?"inversor":"módulo";msg(`Lendo o datasheet do ${nome}…`);
      try{Object.assign(Q,await lerDatasheet(t,ds[t],t==="i"?iP:mP));dsOk.push(t)}catch(e){aiNote+=`Datasheet do ${nome} não lido (${e.message}). `}
    }
    // sem datasheet: usa a biblioteca de equipamentos (pelo modelo, ou pela potência quando só há um equipamento com ela)
    for(const t of ["i","m"])if(!dsOk.includes(t)){const e=equipDaBiblioteca(t,t==="i"?iP:mP,$(`#q_${t}Fab`).value.trim(),$(`#q_${t}Mod`).value.trim());
      if(e){const {[t+"P"]:_p,...resto}=e;Object.assign(Q,resto);dsOk.push(t);aiNote+=`${t==="i"?"Inversor":"Módulo"} ${e[t+"Fab"]||""} ${e[t+"Mod"]} preenchido pela sua biblioteca de equipamentos. `}}
    if($("#q_dsA").files[0]){msg("Lendo a ART/TRT…");await guardarArt($("#q_dsA").files[0]);try{const rt=await lerDatasheet("a",$("#q_dsA").files[0]);Object.assign(Q,rt);guardarRT(Q);aiNote+="ART/TRT lida. "}catch(e){aiNote+=`ART/TRT não lida (${e.message}). `}}
    ["iFab","iMod","mFab","mMod"].forEach(k=>{const v=$("#q_"+k).value.trim();if(v||Q[k]==null)Q[k]=v});
    if(dsPasta.length)aiNote+=`Datasheet ${dsPasta.map(t=>t==="i"?"do inversor":"do módulo").join(" e ")} guardado lido automaticamente. `;
    for(const t of dsOk)if(!dsPasta.includes(t))guardarDatasheet(t,ds[t],Q[t+"Fab"],Q[t+"Mod"]).catch(()=>{});
    if(Q.ligacao==="Trifásico"&&!String(Q.iFases||"").startsWith("Trif")){Q.iFases="Trifásico 380/220 V";Object.assign(Q,{iIout:+(iP*1000/(Math.sqrt(3)*380)).toFixed(1)})}
    Q.loc=$("#q_loc").value.trim();
    {const art=$("#q_art").value.trim();if(art)Q.rtArt=art}
    Q._equipEst=dsOk.length<2;Q.modalidade=qModSel;
    // gerou de novo o mesmo cliente (mesma UC) sem anexar o RG/CNH: mantém nome/CPF/RG, o mesmo projeto e os anexos já guardados
    const dg=x=>String(x||"").replace(/\D/g,""),ant=P||{},mesmo=!fDoc&&ant._id&&ant.nome&&dg(Q.uc)&&dg(Q.uc)===dg(ant.uc);
    if(mesmo){for(const k of ["nome","doc","rg","tel"])if(ant[k]&&!Q[k]){Q[k]=ant[k];lidos[k]=ant[k]}confImgs.mesmo=true;aiNote=aiNote.replace(/Sem RG\/CNH:[^.]*\([^)]*\)\. /,"")+"Mesmo cliente: nome, CPF e RG/CNH mantidos do projeto anterior. "}
    // conferência obrigatória do que a IA leu, ao lado das fotos, antes de gerar
    if(docsLer.length){msg("Conferindo os dados lidos…");if(!(await conferirLeitura(Q,lidos,confImgs,ligLida))){msg("Geração cancelada. Corrija os documentos ou os dados e clique em Gerar projeto de novo.");return}}
    P=Q;autoStrings();plantaImg=null;
    P._id=mesmo?ant._id:novoId();store("hgo_current",P);if(artArq){kv("put","art:"+P._id,artArq).catch(()=>{});anexoPut(P._id,"art",{tipo:"application/pdf",...artArq}).catch(()=>{})}{const id=P._id,novos=[];for(const [k,el] of [["docTit",$("#q_docTit")],["proc",$("#q_proc")],["procDoc",$("#q_procDoc")]])if(el.files[0]){novos.push([k,el.files[0]]);el.value=""}qFiles.forEach((f,i)=>novos.push(["doc"+(i+1),f]));P._anexos=mesmo?{...(ant._anexos||{})}:{};novos.forEach(([k,f])=>P._anexos[k]=f.name);Promise.all(novos.map(async([k,f])=>anexoPut(id,k,{nome:f.name,tipo:f.type,buf:await f.arrayBuffer()}))).catch(()=>{})}buildFormFresh();currentDoc="form";render();salvarProjeto(true);
    ["i","m"].forEach(t=>{if(P[t+"Fab"]&&P[t+"Mod"])buscarInmetro(t)});
    plantaAuto(true);
    const contas=qModSel!=="Autoconsumo local"?[...$("#q_rat").files]:[];
    qModSel="";desenharQMod();$("#q_rat").value="";$("#q_rat_n").textContent="";
    if(contas.length)lerContasRateio(contas);
    if(dsOk.length)aiNote+=dsOk.length>1?"Datasheets do inversor e do módulo lidos. ":`Datasheet do ${dsOk[0]==="i"?"inversor":"módulo"} lido. `;
    if(docsLer.length&&!problemasLeitura(P,lidos,confImgs,ligLida).length)aiNote+="Dados conferidos automaticamente (CPF válido, nome, UC e endereço lidos). ";
    const miss=["nome","doc","uc","end","cidade"].filter(k=>!P[k]);
    msg(`${aiNote}${found?found+" campos lidos dos documentos. ":""}${miss.length?"Faltam: "+miss.map(k=>SECTIONS.flatMap(s=>s.f).find(f=>f[0]===k)[1]).join(", ")+". ":""}Confira os alertas e os documentos ao lado.`);
  }catch(e){msg(e&&e.code==="not_granted"?"Permissão negada para o Claude ler os documentos.":e&&e.code==="rate_limited"?"Muitas leituras seguidas; tente de novo em instantes.":"Não foi possível ler os documentos ("+(e&&(e.code||e.message)||"erro")+").")}
  finally{btn.disabled=false}
});

/* ---------------- conferência da leitura ---------------- */
// mostra o que a IA leu ao lado das fotos do RG/CNH e da fatura; nada é gerado sem você confirmar
// CPF/CNPJ com dígitos verificadores certos
function docValido(x){const d=String(x||"").replace(/\D/g,"");
  const dv=(b,pesos)=>{const s=b.split("").reduce((a,c,i)=>a+c*pesos[i],0)%11;return s<2?0:11-s};
  if(d.length===11){if(/^(\d)\1+$/.test(d))return false;const p=k=>Array.from({length:k},(_,i)=>k+1-i);return dv(d.slice(0,9),p(9))==d[9]&&dv(d.slice(0,10),p(10))==d[10]}
  if(d.length===14){if(/^(\d)\1+$/.test(d))return false;const p1=[5,4,3,2,9,8,7,6,5,4,3,2],p2=[6,...p1];return dv(d.slice(0,12),p1)==d[12]&&dv(d.slice(0,13),p2)==d[13]}
  return false}
// o app confere sozinho; a tela de conferência só abre quando algo não bate
function problemasLeitura(Q,lidos,imgs,ligLida){
  const p=[];
  for(const [k,r] of [["nome","nome do titular"],["doc","CPF/CNPJ"],["uc","unidade consumidora"],["end","endereço"],["cidade","cidade"]])if(!String(Q[k]||"").trim())p.push(`falta ${r}`);else if(!(k in lidos))p.push(`${r} não foi lido dos documentos`);
  if(Q.doc&&!docValido(Q.doc))p.push("CPF/CNPJ inválido (dígitos não conferem)");
  if(Q.nome&&String(Q.nome).trim().split(/\s+/).length<2)p.push("nome do titular incompleto");
  if(Q.uc&&String(Q.uc).replace(/\D/g,"").length<6)p.push("unidade consumidora curta demais");
  if(!imgs.doc.length&&!imgs.mesmo)p.push("sem RG/CNH do titular");
  if(!ligLida)p.push("a fatura não diz se é monofásico, bifásico ou trifásico");
  return p;
}
function conferirLeitura(Q,lidos,imgs,ligLida){
  const prob=problemasLeitura(Q,lidos,imgs,ligLida);
  if(!prob.length){Q._conferido=new Date().toISOString();Q._conferidoAuto=true;return Promise.resolve(true)}
  return new Promise(ok=>{
  const urls=[];const im=(l,t)=>l.slice(0,3).map(b=>{const u=URL.createObjectURL(b);urls.push(u);return `<a href="${u}" target="_blank" title="abrir em tamanho grande"><img src="${u}" alt="${t}" style="width:100%;border:1px solid #ccc;border-radius:6px;margin-bottom:6px"></a>`}).join("");
  const F=[["nome","Nome do titular (do RG/CNH)",1],["doc","CPF / CNPJ (do RG/CNH)",1],["rg","RG",0],["uc","Unidade consumidora / conta contrato (da fatura)",1],["end","Endereço (da fatura)",1],["bairro","Bairro",0],["cidade","Cidade",1],["cep","CEP",0],["classe","Classe",0]];
  const linha=([k,r,obr])=>`<label style="display:block;margin:6px 0 2px;font-size:12px;color:#555">${r}${obr?" *":""}${!(k in lidos)?' <b style="color:#B45309">· não lido, confira</b>':""}</label><input data-cf="${k}" value="${esc(Q[k]||"")}" style="width:100%;padding:7px;border:1px solid #bbb;border-radius:6px;font-size:14px${!(k in lidos)?";background:#FEF3C7":""}">`;
  const lig=`<label style="display:block;margin:8px 0 2px;font-size:12px;color:#555">Tipo de ligação *${ligLida?"":' <b style="color:#B45309">· a fatura não diz, confira</b>'}</label><select data-cf="ligacao" style="width:100%;padding:7px;border-radius:6px;font-size:14px${ligLida?"":";background:#FEF3C7"}">${["Monofásico","Bifásico","Trifásico"].map(o=>`<option${o===Q.ligacao?" selected":""}>${o}</option>`).join("")}</select>`;
  const dj=`<label style="display:block;margin:8px 0 2px;font-size:12px;color:#555">Disjuntor de entrada (A)${Q._disjPadrao?' <b style="color:#B45309">· a conta não informa; vazio = calculado pela corrente do inversor (mínimo 40 A)</b>':""}</label><input data-cf="disj" inputmode="numeric" value="${esc(Q.disj||"")}" style="width:100%;padding:7px;border:1px solid #bbb;border-radius:6px;font-size:14px${Q._disjPadrao?";background:#FEF3C7":""}">`;
  const box=document.createElement("div");box.id="confBox";
  box.style.cssText="position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto";
  box.innerHTML=`<div style="background:#fff;color:#222;border-radius:12px;max-width:1100px;width:100%;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.4)">
   <h2 style="margin:0 0 4px;font-size:20px">Confira os dados lidos</h2>
   <p style="margin:0 0 6px;font-size:14px;color:#B91C1C"><b>O app conferiu e parou por isto:</b> ${esc(prob.join("; "))}.</p>
   <p style="margin:0 0 10px;font-size:13px;color:#555">Corrija só o que está acima, comparando com as fotos. Os campos em amarelo não foram lidos ou são valores padrão.</p>
   <div style="display:flex;flex-wrap:wrap;gap:16px">
    <div style="flex:1 1 300px;min-width:0">${F.map(linha).join("")}${lig}${dj}</div>
    <div style="flex:1 1 300px;min-width:0;max-height:70vh;overflow:auto">${imgs.doc.length?`<b style="font-size:13px">RG/CNH</b>${im(imgs.doc,"RG/CNH")}`:'<p style="color:#B91C1C;font-size:13px"><b>Sem RG/CNH:</b> nome e CPF precisam ser conferidos em outro documento.</p>'}${imgs.fat.length?`<b style="font-size:13px">Fatura</b>${im(imgs.fat,"Fatura")}`:'<p style="color:#B91C1C;font-size:13px"><b>Sem fatura.</b></p>'}</div>
   </div>
   <p id="confErro" style="color:#B91C1C;font-size:13px;margin:10px 0 0"></p>
   <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap">
    <button type="button" id="confNao" class="btn">Cancelar</button>
    <button type="button" id="confSim" class="btn" style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:700">Dados conferidos, gerar projeto</button>
   </div></div>`;
  document.body.appendChild(box);
  const fecha=v=>{box.remove();urls.forEach(u=>URL.revokeObjectURL(u));ok(v)};
  box.querySelector("#confNao").onclick=()=>fecha(false);
  box.querySelector("#confSim").onclick=()=>{
    const v={};box.querySelectorAll("[data-cf]").forEach(e=>v[e.dataset.cf]=e.value.trim());
    const falta=F.filter(([k,,o])=>o&&!v[k]).map(([,r])=>r.replace(/ \(.*\)/,""));
    const cpf=v.doc.replace(/\D/g,"");if(cpf&&!docValido(cpf))falta.push("CPF/CNPJ válido (os dígitos não conferem)");
    if(falta.length){box.querySelector("#confErro").textContent="Preencha: "+falta.join(", ")+".";return}
    for(const [k] of F)Q[k]=v[k];
    if(v.ligacao!==Q.ligacao){Q.ligacao=v.ligacao;Q.tensao=v.ligacao==="Monofásico"?"220 V (F-N)":"380/220 V";if(v.ligacao==="Trifásico"&&!String(Q.iFases||"").startsWith("Trif"))Object.assign(Q,{iFases:"Trifásico 380/220 V",iIout:+(n(Q.iP)*1000/(Math.sqrt(3)*380)).toFixed(1)})}
    if(n(v.disj)){Q.disj=v.disj;delete Q._disjPadrao}else{Q.disj="";Q._disjPadrao=true}
    Q._conferido=new Date().toISOString();fecha(true)};
})}

/* ---------------- datasheets de módulo e inversor ---------------- */
async function lerDatasheet(t,file,pot){
  if(!navigator.onLine||!sessao)throw new Error("a leitura precisa de internet e login");
  const imgs=(await fileToImages(file,4)).slice(0,4);
  const r=await fetch("api/ler-datasheet",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+sessao.access_token},body:JSON.stringify({tipo:t==="i"?"inversor":t==="a"?"art":"modulo",potencia:pot?String(pot):"",images:await Promise.all(imgs.map(blobToB64))})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||"erro "+r.status);
  const texto=["mFab","mMod","mTipo","iFab","iMod","iFases","iDim","iIP"],out={};
  if(t==="a"){for(const [k,v] of Object.entries(j.dados||{}))out[k]=String(v);return out}
  for(const [k,v] of Object.entries(j.dados||{})){
    if(k==="iP"&&pot||k==="mP"&&pot)continue; // mantém a potência escolhida pelo usuário
    const num=+String(v).replace(",",".");out[k]=texto.includes(k)||!isFinite(num)?String(v):num;
  }
  return out;
}
["I","M","A"].forEach(x=>$("#q_ds"+x).addEventListener("change",e=>{const f=e.target.files[0];$(`#q_ds${x}_n`).textContent=f?f.name:"";if(!f&&x!=="A")mostraEquipAuto()}));
// entrada rápida: mostra ao lado do botão o datasheet guardado ou o equipamento da biblioteca que será usado
function equipDaBiblioteca(t,pot,fab,mod){
  const L=Object.values((biblioteca()||{})[t]||{});
  if(mod){const a=L.filter(x=>nrmInm(x[t+"Mod"])===nrmInm(mod));return a.length===1?a[0]:null}
  if(!n(pot))return null;const a=L.filter(x=>n(x[t+"P"])===n(pot)&&(!fab||nrmInm(x[t+"Fab"])===nrmInm(fab)));if(a.length<2)return a[0]||null;
  // mais de um com a mesma potência: fica o que tem datasheet e INMETRO guardados, se só um tiver
  const D=dsSalvos(),S=inmSalvos(),nota=x=>(D[chaveDs(t,x[t+"Fab"],x[t+"Mod"])]?1:0)+(S[chaveInm(x[t+"Fab"],x[t+"Mod"])]||/\d{6}\/\d{4}/.test(x[t+"Reg"]||"")?1:0);
  const max=Math.max(...a.map(nota)),top=a.filter(x=>nota(x)===max);return max>0&&top.length===1?top[0]:null;
}
let eqAutoT;
function mostraEquipAuto(){clearTimeout(eqAutoT);eqAutoT=setTimeout(async()=>{if(!document.getElementById("q_dsI"))return;
  for(const [t,x] of [["i","I"],["m","M"]]){
    if($("#q_ds"+x).files[0])continue;const el=$(`#q_ds${x}_n`);if(!el)continue;
    const fab=$(`#q_${t}Fab`).value.trim(),mod=$(`#q_${t}Mod`).value.trim(),pot=n($(`#q_${t}P`).value);
    const f=mod?await datasheetNaPasta(t,fab,mod).catch(()=>null):null;
    const e=f?null:equipDaBiblioteca(t,pot,fab,mod);
    el.textContent=f?`✓ datasheet guardado: ${f.name}`:e?`✓ da sua biblioteca: ${e[t+"Fab"]||""} ${e[t+"Mod"]}`:"";
  }},400)}
["q_iP","q_mP","q_iFab","q_iMod","q_mFab","q_mMod"].forEach(id=>{const e=document.getElementById(id);if(e)e.addEventListener("input",mostraEquipAuto)});
setTimeout(mostraEquipAuto,1500);
// anexos do projeto (RG/CNH do titular, documentos do cliente, procuração, documento do procurador):
// guardados no aparelho e na conta (Supabase Storage "anexos"), então funcionam em qualquer navegador
const ANEXO_ARQ={proc:"10_Procuracao",procDoc:"11_Documento_procurador"};
const ANEXO_NOME={docTit:"RG/CNH do titular",proc:"Procuração",procDoc:"Documento do procurador"};
async function anexoPut(id,k,a){
  await kv("put",`anexo:${id}:${k}`,a).catch(()=>{});
  if(sb&&sessao&&navigator.onLine){const {error}=await sb.storage.from("anexos").upload(`${sessao.user.id}/${id}/${k}`,new Blob([a.buf],{type:a.tipo||"application/octet-stream"}),{upsert:true,contentType:a.tipo||"application/octet-stream"});if(error)throw new Error("não subiu para a conta: "+error.message)}
}
async function anexoGet(id,k,nome){
  const a=await kv("get",`anexo:${id}:${k}`).catch(()=>null);if(a&&a.buf)return a;
  if(!sb)return null;
  const uid=sessao?sessao.user.id:((await sb.auth.getSession()).data.session||{user:{}}).user.id;if(!uid)return null;
  const {data,error}=await sb.storage.from("anexos").download(`${uid}/${id}/${k}`);if(error||!data)return null;
  const b={nome:nome||k,tipo:data.type,buf:await data.arrayBuffer()};kv("put",`anexo:${id}:${k}`,b).catch(()=>{});return b;
}
// contrato da SolarCity não é procuração: nunca usar no lugar dela
const ehContrato=nome=>/contrato/i.test(String(nome||""))&&!/procura/i.test(String(nome||""));
async function anexosDoProjeto(){return (await anexosDoProjeto0()).filter(([k,a])=>!(k==="proc"&&ehContrato(a&&a.nome)))}
async function anexosDoProjeto0(){
  if(!P._id)return [];const out=[],vistos=new Set();
  for(const [k,nome] of Object.entries(P._anexos||{})){const a=await anexoGet(P._id,k,nome);if(a){out.push([k,a]);vistos.add(k)}}
  // projetos antigos (guardados só no aparelho)
  const dc=await kv("get","docs:"+P._id).catch(()=>null);if(dc)dc.forEach((d,i)=>{if(!vistos.has("doc"+(i+1)))out.push(["doc"+(i+1),d])});
  for(const k of ["proc","procDoc","docTit"])if(!vistos.has(k)){const a=await kv("get",`anexo:${P._id}:${k}`).catch(()=>null);if(a)out.push([k,a])}
  return out;
}
document.addEventListener("change",async e=>{
  const el=e.target.closest("[data-anexo]");if(!el||!el.files[0])return;const k=el.dataset.anexo,f=el.files[0],st=x=>{$("#"+el.id+"_n").textContent=x};
  if(!P.nome||!P._id||$("#q_iP").value.trim()||$("#q_mP").value.trim()||qFiles.length||!confirm(`Anexar "${f.name}" ao projeto aberto (${P.nome})?\n\nOK = anexar a ${P.nome}\nCancelar = é para um projeto novo`)){st("✓ "+f.name);return}
  try{
    const a={nome:f.name,tipo:f.type,buf:await f.arrayBuffer()};st("Guardando…");
    let aviso="";try{await anexoPut(P._id,k,a)}catch(er){aviso=" ("+er.message+")"}
    P._anexos={...(P._anexos||{}),[k]:f.name};store("hgo_current",P);salvarProjeto(true);
    // grava já na pasta do cliente, se o navegador já deu permissão
    let naPasta=false;
    try{const h=await idb("get");if(h&&await h.queryPermission({mode:"readwrite"})==="granted"){const d=await h.getDirectoryHandle(nomePasta(),{create:true});const ext=((f.name.match(/\.[a-z0-9]{2,4}$/i)||[".pdf"])[0]).toLowerCase();
      const nome=k==="docTit"?"09_Documento_titular_RG_CNH"+ext:ANEXO_ARQ[k]+ext;const w=await (await d.getFileHandle(nome,{create:true})).createWritable();await w.write(new Blob([a.buf],{type:a.tipo}));await w.close();naPasta=true}}catch(er){}
    st(`✓ ${ANEXO_NOME[k]} anexado ao projeto ${P.nome}${naPasta?" e salvo na pasta do cliente":". Clique em Gerar todos os documentos para salvar na pasta"}.${aviso}`);el.value="";
  }catch(err){st("Não consegui guardar: "+err.message)}
});
// ART/TRT anexada na entrada rápida com um projeto já aberto: vai direto para esse projeto (não precisa gerar de novo)
$("#q_dsA").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f||!P.nome||$("#q_iP").value.trim()||$("#q_mP").value.trim())return;
  const st=x=>{$("#q_dsA_n").textContent=x};st("Lendo a ART/TRT de "+P.nome+"…");
  await guardarArt(f);
  try{const d=await lerDatasheet("a",f);Object.assign(P,d);guardarRT(P);syncForm();store("hgo_current",P);render();st(`✓ ART/TRT anexada ao projeto ${P.nome}${P.rtArt?" (nº "+P.rtArt+")":""}. Não precisa gerar de novo.`);toast("ART/TRT anexada ao projeto aberto")}
  catch(err){st("Não consegui ler a ART/TRT: "+err.message)}
  e.target.value="";
});
document.addEventListener("change",async e=>{
  const el=e.target.closest("[data-ds]");if(!el||!el.files[0])return;
  const t=el.dataset.ds,nome=t==="i"?"inversor":"módulo",st=x=>{const s2=$("#inm_"+t);if(s2)s2.textContent=x};
  if(t==="a"){
    st("Lendo a ART/TRT…");
    await guardarArt(el.files[0]);
    try{const d=await lerDatasheet("a",el.files[0]);Object.assign(P,d);guardarRT(P);syncForm();store("hgo_current",P);render();st(`ART/TRT lida: ${Object.keys(d).length} campos do responsável técnico preenchidos. Confira.`)}
    catch(err){st("Não consegui ler a ART/TRT: "+err.message)}
    el.value="";return;
  }
  st(`Lendo o datasheet do ${nome}…`);
  try{
    const d=await lerDatasheet(t,el.files[0],t==="i"?n(P.iP):n(P.mP));
    Object.assign(P,d);P["_ds"+t]=1;if(P._dsi&&P._dsm)delete P._equipEst;delete P._exemplo;
    syncForm();store("hgo_current",P);render();st(`Datasheet do ${nome} lido: ${Object.keys(d).length} campos preenchidos. Confira.`);
    guardarDatasheet(t,el.files[0],P[t+"Fab"],P[t+"Mod"]).catch(()=>{});if(typeof guardarEquip==="function")guardarEquip().catch(()=>{});
    if(P[t+"Fab"]&&P[t+"Mod"])buscarInmetro(t);
  }catch(err){st("Não consegui ler o datasheet: "+err.message)}
  el.value="";
});
