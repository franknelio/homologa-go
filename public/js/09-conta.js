"use strict";
/* ---------------- RT lembrado entre projetos ---------------- */
const RT_KEYS=["rtCpf","rtEmailEq","rtNome","rtTit","rtReg","rtTel","rtEmail","rtEmp","rtCidade","assinaCli"];
function guardarRT(o){const rt={},ant=load("hgo_rt")||{};RT_KEYS.forEach(x=>rt[x]=o[x]||ant[x]||"");store("hgo_rt",rt);if(sb&&sessao&&navigator.onLine)sb.auth.updateUser({data:{rt}})}
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.k;if(k&&RT_KEYS.includes(k)){const rt={},ant=load("hgo_rt")||{};RT_KEYS.forEach(x=>rt[x]=P[x]||ant[x]||"");rt[k]=e.target.value;store("hgo_rt",rt);clearTimeout(window._rtT);window._rtT=setTimeout(()=>{if(sb&&sessao&&navigator.onLine)sb.auth.updateUser({data:{rt}})},1500)}});

function blobToB64(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(b)})}
async function initAI(){
  if(window.pdfjsLib&&window.pdfjsWorker)pdfjsLib.GlobalWorkerOptions.workerSrc="";
  imgLimits={maxCount:5};
  sample={json:async(_prompt,{images,tipo,texto})=>{
    if(!navigator.onLine)throw new Error("sem internet; a leitura automática precisa de conexão");
    if(!sessao)throw new Error("entre na sua conta para usar a leitura automática");
    const body={images:await Promise.all((images||[]).map(blobToB64)),tipo:tipo||"",texto:texto||""};
    const r=await fetch("api/ler-documentos",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+sessao.access_token},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||("erro "+r.status));
    return j.dados||{};
  }};
}

/* ---------------- login ---------------- */
function mostrarUsuario(){$("#who").textContent=sessao?sessao.user.email:modoLocal?"Sem login (só neste aparelho)":"";$("#bSair").hidden=!sessao}
async function initAuth(){
  let cfg=null;
  try{const r=await fetch("api/config");if(r.ok){cfg=await r.json();store("hgo_cfg",cfg)}}catch(e){}
  cfg=cfg||load("hgo_cfg");
  if(!cfg||!window.supabase){modoLocal=true;mostrarUsuario();return}
  sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const {data}=await sb.auth.getSession();sessao=data.session;
  sb.auth.onAuthStateChange((_ev,s)=>{sessao=s;mostrarUsuario();if(s){$("#login").hidden=true;sincronizar();carregarAssin().catch(()=>{});carregarDocRT().catch(()=>{});carregarBiblioteca().catch(()=>{})}});
  if(!sessao){$("#login").hidden=false;$("#lOffline").hidden=navigator.onLine}
  else{$("#login").hidden=true;sincronizar();
    // o RT salvo na conta vale em qualquer aparelho e prevalece sobre o guardado no navegador
    carregarAssin().catch(()=>{});carregarDocRT().catch(()=>{});carregarBiblioteca().catch(()=>{});setTimeout(()=>{inmetroAuto();plantaAuto()},1500);
    sb.auth.getUser().then(({data:u})=>{const rt=u&&u.user&&u.user.user_metadata&&u.user.user_metadata.rt;if(rt)store("hgo_rt",{...(load("hgo_rt")||{}),...rt})}).catch(()=>{})}
  mostrarUsuario();
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const m=$("#lMsg");m.textContent="";
  if(!navigator.onLine){m.textContent="Sem internet. Conecte-se para entrar.";return}
  $("#lGo").disabled=true;
  const {error}=await sb.auth.signInWithPassword({email:$("#lEmail").value.trim(),password:$("#lSenha").value});
  $("#lGo").disabled=false;
  if(error)m.textContent=error.message==="Invalid login credentials"?"E-mail ou senha incorretos.":"Não foi possível entrar: "+error.message;
});
$("#lNova").addEventListener("click",async()=>{
  const m=$("#lMsg");m.textContent="";const email=$("#lEmail").value.trim(),senha=$("#lSenha").value;
  if(!email||senha.length<8){m.textContent="Informe o e-mail e uma senha com pelo menos 8 caracteres.";return}
  if(!navigator.onLine){m.textContent="Sem internet. Conecte-se para criar a conta.";return}
  const {data,error}=await sb.auth.signUp({email,password:senha,options:{emailRedirectTo:location.origin}});
  if(error){m.textContent="Não foi possível criar a conta: "+error.message;return}
  if(!data.session)m.textContent="Conta criada. Abra o e-mail de confirmação que enviamos e depois entre aqui (se o link abrir uma página de erro, a conta já foi confirmada: é só voltar e entrar).";
});
$("#lOffline").addEventListener("click",()=>{modoLocal=true;$("#login").hidden=true;mostrarUsuario()});
$("#bSair").addEventListener("click",async()=>{if(sb)await sb.auth.signOut();sessao=null;$("#drawer").hidden=true;$("#login").hidden=false;mostrarUsuario()});
if("serviceWorker" in navigator&&location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

/* ---------------- CRM SolarCity → Homologa (documentos do grupo de WhatsApp) ----------------
   O CRM abre esta página com ?crm=1. Quando ela fica pronta, avisa o CRM ("hgo-crm-pronto");
   o CRM responde com os dados da venda e os arquivos do grupo, que entram no "Novo projeto". */
if(/[?&]crm=1/.test(location.search)&&window.opener){
  const ORIGEM_CRM=/^https:\/\/(solarcity-crm\.web\.app|solarcity-crm\.firebaseapp\.com)$|^http:\/\/localhost(:\d+)?$/;
  let recebido=false;
  const aviso=t=>{let b=$("#crmAviso");if(!b){b=document.createElement("div");b.id="crmAviso";b.style.cssText="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;border-radius:10px;padding:10px 12px;margin:0 0 10px;font-size:13px;font-weight:600";const q=$(".quick");q.insertBefore(b,q.children[1]||null)}b.textContent=t};
  const b64File=a=>{const bin=atob(a.b64||""),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new File([u],a.nome||"arquivo",{type:a.mime||"application/octet-stream"})};
  const poe=(id,v)=>{if(v!=null&&v!==""&&$(id)){$(id).value=String(v);$(id).dispatchEvent(new Event("input",{bubbles:true}))}};
  const arquivoNoCampo=(id,f)=>{const dt=new DataTransfer();dt.items.add(f);$(id).files=dt.files;$(id).dispatchEvent(new Event("change",{bubbles:true}))};
  addEventListener("message",async e=>{
    if(!ORIGEM_CRM.test(e.origin)||!e.data||e.data.tipo!=="hgo-crm-dados"||recebido)return;
    recebido=true;
    const d=e.data.dados||{},arqs=e.data.arquivos||[];
    try{
      $("#bNew").click();
      const docs=arqs.filter(a=>a.papel==="doc"),fats=arqs.filter(a=>a.papel==="fatura"),procs=arqs.filter(a=>a.papel==="proc"&&!ehContrato(a.nome));
      if(docs[0])arquivoNoCampo("#q_docTit",b64File(docs[0]));
      if(fats.length)addFiles(fats.map(b64File));
      if(procs[0])arquivoNoCampo("#q_proc",b64File(procs[0]));
      poe("#q_iP",d.iP);poe("#q_iQ",d.iQ||1);poe("#q_mP",d.mP);poe("#q_mQ",d.mQ);
      poe("#q_iFab",d.iFab);poe("#q_iMod",d.iMod);poe("#q_mFab",d.mFab);poe("#q_mMod",d.mMod);
      poe("#q_loc",d.loc);
      // link do Google Maps: abre o link e troca pelas coordenadas
      if(/^https?:\/\//i.test(String(d.loc||"").trim())&&sessao){aviso("📥 Recebido do CRM: "+(d.cliente||"cliente")+". Abrindo o link da localização…");
        try{const r=await fetch("api/local?q="+encodeURIComponent(String(d.loc).trim()),{headers:{authorization:"Bearer "+sessao.access_token}});const j=await r.json();if(r.ok&&isFinite(j.lat))poe("#q_loc",`${(+j.lat).toFixed(7)}, ${(+j.lon).toFixed(7)}`)}catch(_){}}
      // equipamentos: se o CRM não mandou separados, a IA lê das mensagens do grupo e das outras fotos/arquivos
      if(!(n(d.iP)&&n(d.mP)&&n(d.mQ))&&sample){
        aviso("📥 Recebido do CRM: "+(d.cliente||"cliente")+". Lendo os equipamentos nas mensagens do grupo…");
        const textos=[];const junta=(o,p="")=>{if(o==null)return;if(typeof o==="string"||typeof o==="number"){if(String(o).length<5000)textos.push((p?p+": ":"")+o)}else if(Array.isArray(o))o.forEach(x=>junta(x,p));else if(typeof o==="object")for(const [k,v] of Object.entries(o))if(!/b64|base64/i.test(k))junta(v,k)};
        junta(d);for(const [k,v] of Object.entries(e.data))if(!["tipo","dados","arquivos"].includes(k))junta(v,k);
        const outros=arqs.filter(a=>!["doc","fatura"].includes(a.papel)&&!(a.papel==="proc"&&!ehContrato(a.nome)));
        const imgs=[];for(const a of outros.slice(0,4)){try{imgs.push(...await fileToImages(b64File(a)))}catch(_){}}
        try{const r=await sample.json("",{images:imgs.slice(0,4),tipo:"material",texto:textos.join("\n")});
          for(const k of ["iP","iQ","mP","mQ","iFab","iMod","mFab","mMod"])if(r[k]!=null&&r[k]!==""&&!d[k])d[k]=String(r[k]).replace(",",".");
          poe("#q_iP",d.iP);poe("#q_iQ",d.iQ||1);poe("#q_mP",d.mP);poe("#q_mQ",d.mQ);poe("#q_iFab",d.iFab);poe("#q_iMod",d.iMod);poe("#q_mFab",d.mFab);poe("#q_mMod",d.mMod);
          if(!(n(d.iP)&&n(d.mP)&&n(d.mQ)))d._diag=`Li ${textos.length} texto(s) e ${outros.length} arquivo(s) extra(s) do CRM e não achei os equipamentos`;
        }catch(er){d._diag="Leitura dos equipamentos falhou: "+er.message}
      }
      if(d.modalidade&&MODS.includes(d.modalidade)){qModSel=d.modalidade;desenharQMod()}
      const falta=[];if(!docs.length)falta.push("RG/CNH");if(!fats.length)falta.push("conta de energia");if(!(n(d.iP)&&n(d.mP)&&n(d.mQ)))falta.push("equipamentos");
      aviso(`📥 Recebido do CRM: ${d.cliente||"cliente"} · ${arqs.length} arquivo(s) do grupo de WhatsApp.`+(falta.length?` Falta: ${falta.join(", ")}. Complete e clique em Gerar projeto.`:" Gerando o projeto…")+(d._diag&&falta.includes("equipamentos")?` (${d._diag}. Arquivos: ${arqs.map(a=>(a.papel||"?")+"="+a.nome).join(", ")}; campos: ${Object.keys(d).filter(k=>k!=="_diag").join(", ")||"nenhum"})`:""));
      try{e.source.postMessage({tipo:"hgo-crm-recebido",n:arqs.length},e.origin)}catch(_){}
      crmJanela=e.source;crmOrigem=e.origin;botaoCRM();
      if(!falta.length&&qModSel){setTimeout(()=>$("#qGo").click(),400)}
    }catch(er){aviso("Não consegui usar os dados do CRM: "+er.message)}
  });
  // devolve os PDFs do projeto para a etapa 4 do CRM
  let crmJanela=null,crmOrigem="";
  function botaoCRM(){
    if($("#bCRM"))return;
    const bt=document.createElement("button");bt.id="bCRM";bt.type="button";bt.className="btn primary";bt.style.margin="0 0 10px";bt.textContent="📤 Enviar projeto ao CRM (etapa 4)";
    $(".quick").insertBefore(bt,$("#crmAviso").nextSibling);
    bt.onclick=async()=>{
      if(!crmJanela||crmJanela.closed){alert("A aba do CRM foi fechada. Abra o projeto pelo CRM de novo.");return}
      if(!P.nome){alert("Gere o projeto primeiro.");return}
      bt.disabled=true;const c=calc(),arqs=[],erros=[];
      for(const d of activeDocs()){bt.textContent=`Gerando ${d.short}…`;
        try{const blob=await docPdfBlob(d.id,c);arqs.push({nome:`${NAMES[d.id]}.pdf`,mime:"application/pdf",b64:await blobToB64(blob)})}catch(er){erros.push(d.short)}}
      if(artArq){try{arqs.push({nome:"00_ART_TRT_assinada.pdf",mime:"application/pdf",b64:await blobToB64(await artAssinadaBlob())})}catch(er){erros.push("ART/TRT")}}
      bt.textContent="Enviando ao CRM…";
      try{crmJanela.postMessage({tipo:"hgo-crm-projeto",cliente:P.nome,uc:P.uc||"",arquivos:arqs},crmOrigem)}catch(er){erros.push("envio: "+er.message)}
      bt.disabled=false;bt.textContent="📤 Enviar projeto ao CRM (etapa 4)";
      aviso(`✓ ${arqs.length} PDF(s) enviados para a etapa 4 do CRM.`+(erros.length?` Não gerou: ${erros.join(", ")}.`:""));
    };
  }
  // avisa o CRM até ele responder
  let tent=0;const ping=setInterval(()=>{if(recebido||++tent>40){clearInterval(ping);return}try{window.opener.postMessage({tipo:"hgo-crm-pronto"},"*")}catch(_){}},500);
}

/* ---------------- início ---------------- */
plantaImg=P.planta||null;
buildForm();render();initAI();initAuth();
