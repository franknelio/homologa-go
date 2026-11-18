"use strict";
/* ---------------- assinatura do RT ---------------- */
async function salvarAssin(d){
  assinRT=d||"";if(assinRT)store("hgo_assin",assinRT);else localStorage.removeItem("hgo_assin");
  buildFormFresh();render();
  if(sb&&sessao&&navigator.onLine){const {error}=await sb.from("perfil").upsert({user_id:sessao.user.id,assinatura:assinRT||null,atualizado_em:new Date().toISOString()});toast(error?"Assinatura salva só neste aparelho ("+error.message+")":assinRT?"Assinatura salva na sua conta":"Assinatura removida")}
}
document.addEventListener("change",e=>{
  if(e.target.id!=="sigFile"||!e.target.files[0])return;
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    // reduz para no máx. 400 px de largura e deixa o fundo branco transparente
    const k=Math.min(1,400/im.width),cv=document.createElement("canvas");cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);
    const g=cv.getContext("2d");g.drawImage(im,0,0,cv.width,cv.height);const d=g.getImageData(0,0,cv.width,cv.height);
    for(let i=0;i<d.data.length;i+=4){const m=(d.data[i]+d.data[i+1]+d.data[i+2])/3;if(m>200)d.data[i+3]=Math.max(0,Math.round((255-m)*4.6))}
    g.putImageData(d,0,0);salvarAssin(cv.toDataURL("image/png"))};im.src=r.result};r.readAsDataURL(e.target.files[0]);e.target.value="";
});
document.addEventListener("click",e=>{if(e.target.closest("#sigDel"))salvarAssin("")});
/* CNH/RG do responsável técnico: guardado na conta (perfil.doc_rt) e no aparelho; vai como 11_Documento_procurador */
let docRTnome=(()=>{try{return localStorage.getItem("hgo_docrt_nome")||""}catch(e){return ""}})();
const b64blob=d=>{const [h,b]=d.split(",");const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:(h.match(/data:([^;]+)/)||[])[1]||""})};
async function docRTBlob(){const d=await kv("get","docRT").catch(()=>null);return d?b64blob(d.url):null}
document.addEventListener("change",async e=>{
  if(e.target.id!=="docRTFile"||!e.target.files[0])return;const f=e.target.files[0];
  if(f.size>4e6){toast("Arquivo grande demais (máx. 4 MB)");return}
  const url=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});
  await kv("put","docRT",{nome:f.name,url});docRTnome=f.name;try{localStorage.setItem("hgo_docrt_nome",f.name)}catch(e){}
  let msgS="salvo neste aparelho";
  if(sb&&sessao&&navigator.onLine){const {error}=await sb.from("perfil").upsert({user_id:sessao.user.id,doc_rt:url,doc_rt_nome:f.name,atualizado_em:new Date().toISOString()});msgS=error?"salvo só neste aparelho ("+error.message+")":"salvo na sua conta"}
  buildFormFresh();render();toast("CNH/RG do responsável técnico "+msgS);
});
async function carregarAssin(){
  if(!sb||!sessao)return;
  const {data}=await sb.from("perfil").select("assinatura").eq("user_id",sessao.user.id).maybeSingle();
  if(data&&data.assinatura&&data.assinatura!==assinRT){assinRT=data.assinatura;store("hgo_assin",assinRT);buildFormFresh();render()}
}
async function carregarDocRT(){
  if(!sb||!sessao)return;
  const {data}=await sb.from("perfil").select("doc_rt,doc_rt_nome").eq("user_id",sessao.user.id).maybeSingle();
  if(data&&data.doc_rt){const atual=await kv("get","docRT").catch(()=>null);if(!atual||atual.url.length!==data.doc_rt.length){await kv("put","docRT",{nome:data.doc_rt_nome||"Documento_RT.pdf",url:data.doc_rt});docRTnome=data.doc_rt_nome||"Documento_RT.pdf";try{localStorage.setItem("hgo_docrt_nome",docRTnome)}catch(e){}buildFormFresh();render()}}
}

/* ---------------- rateio: lê as contas das UCs e calcula o % pelo consumo médio ---------------- */
const mediaCons=t=>{const v=String(t||"").split(/[,;\s]+/).map(n).filter(x=>x>0);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0};
function linhasRateio(){return String(P.benef||"").split(/\n/).map(l=>l.split(";").map(x=>x.trim())).filter(r=>r[0])}
function gravarRateio(L){P.benef=L.map(r=>[r[0],r[1]||"",r[2]||"",r[3]||"",r[4]||""].join(" ; ")).join("\n");delete P._exemplo;syncForm();store("hgo_current",P);render()}
function calcRateio(){
  const st=x=>{const e=$("#ratSt");if(e)e.textContent=x};
  let L=linhasRateio();
  // a UC geradora entra no rateio com o próprio consumo
  if(P.uc&&!L.some(r=>r[0].replace(/\D/g,"")===String(P.uc).replace(/\D/g,""))){const m=mediaCons(P.consumo);if(m)L.unshift([P.uc,P.nome||"",[P.end,P.bairro,P.cidade].filter(Boolean).join(", "),"",String(m)])}
  const sem=L.filter(r=>!n(r[4]));
  if(!L.length){st("Adicione as contas das UCs do rateio.");return}
  if(sem.length){st(`Falta o consumo médio (5ª coluna) de: ${sem.map(r=>r[0]).join(", ")}.`);return}
  const tot=L.reduce((a,r)=>a+n(r[4]),0);let soma=0;
  L.forEach((r,i)=>{let pc=i===L.length-1?Math.round((100-soma)*100)/100:Math.round(n(r[4])/tot*10000)/100;soma+=pc;r[3]=fmt(pc).replace(".","")});
  gravarRateio(L);st(`Rateio calculado pelo consumo médio de ${L.length} UCs (total ${fmt(tot,0)} kWh/mês).`);
}
document.addEventListener("click",e=>{if(e.target.closest("#bRat"))calcRateio()});
document.addEventListener("change",e=>{if(e.target.id!=="ratFiles"||!e.target.files.length)return;const fs=[...e.target.files];e.target.value="";lerContasRateio(fs)});
async function lerContasRateio(fs){
  const st=x=>{const s2=$("#ratSt");if(s2)s2.textContent=x;toast(x)};
  if(!navigator.onLine||!sessao){st("A leitura das contas precisa de internet e login.");return}
  if(P.modalidade==="Autoconsumo local"){P.modalidade="Autoconsumo remoto";syncForm()}
  const L=linhasRateio();let ok=0;
  for(const [i,f] of fs.entries()){
    st(`Lendo a conta ${i+1} de ${fs.length}…`);
    try{const d=await sample.json("",{images:await fileToImages(f,2)});
      const uc=String(d.uc||"").trim();if(!uc)throw new Error("UC não encontrada");
      const lin=[uc,d.nome||"",[d.end,d.bairro,d.cidade].filter(Boolean).join(", "),"",String(mediaCons(d.consumo)||"")];
      const j=L.findIndex(r=>r[0].replace(/\D/g,"")===uc.replace(/\D/g,""));if(j>=0)L[j]=lin;else L.push(lin);ok++;
    }catch(err){st(`Conta ${f.name}: ${err.message}`)}
  }
  gravarRateio(L);if(ok)calcRateio();
}

/* ---------------- registro INMETRO (consulta pública) ---------------- */
const inmBusca={},inmFeito=new Set();
function inmetroAuto(){if(!sessao||!navigator.onLine)return;["i","m"].forEach(t=>{const k=`${P._id}|${t}|${P[t+"Fab"]}|${P[t+"Mod"]}`;if(!P[t+"Reg"]&&P[t+"Fab"]&&P[t+"Mod"]&&!inmBusca[t]&&!inmFeito.has(k)){inmFeito.add(k);buscarInmetro(t)}})}
async function buscarInmetro(t){
  const nome=t==="m"?"módulo":"inversor",fab=(P[t+"Fab"]||"").trim(),mod=(P[t+"Mod"]||"").trim();
  const st=x=>{const e=$("#inm_"+t);if(e)e.textContent=x};
  if(!fab||!mod){st(`Informe fabricante e modelo do ${nome}.`);return}
  if(!navigator.onLine||!sessao){st("A consulta precisa de internet e login.");return}
  const b=document.querySelector(`[data-inm="${t}"]`);if(b)b.disabled=true;
  st("Consultando o INMETRO, pode levar até 1 minuto…");inmBusca[t]=true;render();
  try{
    const r=await fetch(`api/inmetro?fab=${encodeURIComponent(fab)}&modelo=${encodeURIComponent(mod)}&pot=${n(P[t+"P"])||""}`,{headers:{authorization:"Bearer "+sessao.access_token}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"erro "+r.status);
    let a=j.encontrado,familia=false;
    // sem o modelo exato, usa o registro ativo da mesma série (o registro do INMETRO vale para a família)
    if(!a&&j.opcoes&&j.opcoes.length){const serie=x=>String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);const f=j.opcoes.find(o=>serie(o.modelo)===serie(mod)&&/ativo/i.test(o.situacao||""));if(f){a=f;familia=true}}
    const opc=(lista)=>{const e=$("#inm_"+t);if(!e||!lista.length)return;e.insertAdjacentHTML("beforeend",`<span class="inmop">${lista.map(o=>`<button type="button" class="btn" data-inmreg="${t}|${esc(o.registro)}">${esc(o.modelo)} · ${esc(o.registro)} · ${esc(o.situacao||"")}</button>`).join("")}</span>`)};
    if(!a){st(`Não achei o modelo ${mod}${n(P[t+"P"])&&t==="m"?` de ${P.mP} W`:""} entre ${j.total} registros da marca ${fab}.${j.opcoes.length?" Parecidos (toque para usar):":" Confira o modelo ou consulte registro.inmetro.gov.br."}`);opc(j.opcoes.slice(0,6));const sec=document.querySelector(`details[data-s="${t==="m"?"mod":"inv"}"]`);if(sec)sec.open=true;toast(`Registro INMETRO do ${nome} não encontrado`);return}
    P[t+"Reg"]=`Registro INMETRO nº ${a.registro}`;P["_inm"+t]=familia?`família ${a.modelo}`:"";delete P._exemplo;syncForm();store("hgo_current",P);render();
    const outros=j.opcoes.filter(o=>o.registro!==a.registro).slice(0,3).map(o=>`${o.modelo} (${o.registro})`);
    st(`${a.registro} · ${a.situacao||""} · ${a.empresa||""} · modelo ${a.modelo}${familia?` (o INMETRO não tem o ${mod}; usei o registro da mesma série, confira)`:a.exato?"":" (nome parecido, confira)"}${outros.length?" · outras opções:":""}`);opc(j.opcoes.filter(o=>o.registro!==a.registro).slice(0,3));
    toast(`Registro INMETRO do ${nome}: ${a.registro}`);
  }catch(e){st("Não consegui consultar: "+e.message)}
  finally{if(b)b.disabled=false;inmBusca[t]=false;render()}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-inm]");if(b)buscarInmetro(b.dataset.inm)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-inmreg]");if(!b)return;const [t,reg]=b.dataset.inmreg.split("|");P[t+"Reg"]=`Registro INMETRO nº ${reg}`;syncForm();store("hgo_current",P);render();toast(`Registro ${reg} aplicado`)});

/* ---------------- localização e imagem de satélite ---------------- */
// sem imagem de satélite na planta: busca sozinha pelo link, coordenadas ou endereço (uma vez por projeto)
const plantaFeita=new Set();
function plantaAuto(forcar){
  if(P.planta||plantaImg||!sessao||!navigator.onLine)return;
  const tem=(P.loc||"").trim()||(n(P.lat)&&n(P.lon))||(P.end&&P.cidade);if(!tem)return;
  const k=P._id+"|"+(P.loc||"")+"|"+P.lat+"|"+P.lon;if(!forcar&&plantaFeita.has(k))return;plantaFeita.add(k);buscarLocal();
}
async function buscarLocal(){
  const st=x=>{const e=$("#locSt");if(e)e.textContent=x},b=$("#bLoc");
  const q=(P.loc||"").trim()||(n(P.lat)&&n(P.lon)?`${P.lat},${P.lon}`:"")||[P.end,P.bairro,P.cidade,P.uf].filter(Boolean).join(", ");
  if(!q){st("Informe a localização.");return}
  if(!navigator.onLine||!sessao){st("A busca precisa de internet e login.");return}
  if(b)b.disabled=true;st("Buscando a localização…");
  try{
    const r=await fetch("api/local?q="+encodeURIComponent(q),{headers:{authorization:"Bearer "+sessao.access_token}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"erro "+r.status);
    P.lat=+j.lat.toFixed(6);P.lon=+j.lon.toFixed(6);delete P._coordAprox;delete P._exemplo;syncForm();
    st("Baixando a imagem de satélite…");
    plantaImg=await imagemSatelite(j.lat,j.lon);P.planta=plantaImg.length<1500000?plantaImg:"";
    store("hgo_current",P);render();
    st(`Ponto ${fmt(P.lat,6)}, ${fmt(P.lon,6)}. Imagem inserida na planta de situação.${j.aproximado?" Localizado pelo endereço (aproximado); para o ponto exato cole o link ou as coordenadas do Google Maps.":" Confira se o telhado está no centro."}`);
    toast("Imagem de satélite adicionada");
  }catch(e){st("Não consegui: "+e.message)}
  finally{if(b)b.disabled=false}
}
// usa o maior zoom (até z) que tenha imagem em todos os blocos; em área rural o zoom 19 costuma faltar
async function imagemSatelite(lat,lon,z=19,W=1024,H=704){
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
  let erro;
  for(let zz=z;zz>=z-4;zz--){
    const s=2**(z-zz),T=256*s,N=2**zz,cx=(lon+180)/360*N*T,sl=Math.sin(lat*Math.PI/180),cy=(0.5-Math.log((1+sl)/(1-sl))/(4*Math.PI))*N*T;
    const x0=Math.floor((cx-W/2)/T),x1=Math.floor((cx+W/2)/T),y0=Math.floor((cy-H/2)/T),y1=Math.floor((cy+H/2)/T),ims=[];
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)ims.push(new Promise((ok,ko)=>{const erroT=()=>ko(new Error("sem imagem de satélite neste ponto"));fetch(`api/tile?v=2&z=${zz}&x=${x}&y=${y}`,{headers:{authorization:"Bearer "+(sessao&&sessao.access_token)}}).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(bl=>{const u=URL.createObjectURL(bl),im=new Image();im.onload=()=>{ok([im,x,y]);setTimeout(()=>URL.revokeObjectURL(u),60000)};im.onerror=erroT;im.src=u}).catch(erroT)}));
    try{
      const prontos=await Promise.all(ims);
      g.imageSmoothingQuality="high";
      for(const [im,x,y] of prontos)g.drawImage(im,x*T-(cx-W/2),y*T-(cy-H/2),T,T);
      g.fillStyle="rgba(255,255,255,.8)";g.fillRect(W-150,H-18,150,18);g.fillStyle="#333";g.font="11px Arial";g.fillText("Imagem: Esri World Imagery",W-144,H-5);
      return cv.toDataURL("image/jpeg",.85);
    }catch(e){erro=e}
  }
  throw erro;
}
document.addEventListener("click",e=>{if(e.target.closest("#bLoc"))buscarLocal()});
document.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.k==="loc"&&e.target.value.trim())buscarLocal()});
