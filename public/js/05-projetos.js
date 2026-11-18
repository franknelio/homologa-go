"use strict";
/* ---------------- projetos (nuvem + cópia no aparelho) ---------------- */
let sb=null,sessao=null,modoLocal=false;
// PDF oficial do registro INMETRO, guardado no aparelho para não baixar de novo
async function pdfInmetro(reg){
  const k="inm:"+reg,salvo=await kv("get",k).catch(()=>null);if(salvo instanceof Blob&&salvo.size)return salvo;
  if(!sessao)throw new Error("entre na sua conta para baixar");
  const r=await fetch(`api/inmetro?pdf=${encodeURIComponent(reg)}`,{headers:{authorization:"Bearer "+sessao.access_token}});
  if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||"erro "+r.status);
  const blob=await r.blob();kv("put",k,blob).catch(()=>{});return blob;
}
function projects(){return load("hgo_projects")||{}}
const novoId=()=>(crypto.randomUUID?crypto.randomUUID():"p"+Date.now());
function semImagemGrande(x){return {...x,planta:x.planta&&x.planta.length<400000?x.planta:""}}
async function salvarProjeto(silencioso){
  if(!P._id||!/^[0-9a-f-]{36}$/.test(P._id))P._id=novoId();
  P._saved=new Date().toISOString();
  const all=projects();all[P._id]={...semImagemGrande(P),_pendente:!!sb,_nuvemEm:(all[P._id]||{})._nuvemEm};store("hgo_projects",all);store("hgo_current",P);
  const ok=await enviarNuvem(P._id);
  if(!silencioso)toast(ok?"Projeto salvo na sua conta":sessao?"Sem conexão: salvo no aparelho, sobe quando a internet voltar":"Projeto salvo neste aparelho");
}
// envia um projeto; se outro aparelho mudou a nuvem depois da última sincronização, nada se perde:
// a versão da nuvem fica valendo e a deste aparelho vira uma cópia
async function enviarNuvem(id){
  if(!sb||!sessao||!navigator.onLine)return false;
  const all=projects();const x=all[id];if(!x)return false;
  const {_pendente,_nuvemEm,_soNuvem,...dados}=x;
  const {data:atual,error:e1}=await sb.from("projetos").select("atualizado_em,dados").eq("id",id).maybeSingle();
  if(e1)return false;
  if(atual&&_nuvemEm&&new Date(atual.atualizado_em)>new Date(_nuvemEm)){
    const copia=novoId(),agora=new Date().toISOString();
    all[copia]={...dados,_id:copia,nome:(dados.nome||"Sem titular"),_copiaDe:id,_saved:agora,_pendente:true};
    all[id]={...atual.dados,_id:id,_saved:atual.atualizado_em,_nuvemEm:atual.atualizado_em,_pendente:false};store("hgo_projects",all);
    if(P._id===id){P={...all[id]};delete P._pendente;delete P._nuvemEm;store("hgo_current",P);if(typeof buildFormFresh==="function"){buildFormFresh();render()}}
    toast("Este projeto foi alterado em outro aparelho: abri a versão mais nova e guardei a sua como cópia na lista");
    return enviarNuvem(copia);
  }
  const em=dados._saved||new Date().toISOString();
  const {error}=await sb.from("projetos").upsert({id,nome:dados.nome||"Sem titular",uc:dados.uc||null,dados,atualizado_em:em});
  if(error)return false;
  const all2=projects();if(all2[id]){all2[id]._pendente=false;all2[id]._nuvemEm=em;store("hgo_projects",all2)}
  return true;
}
// projetos excluídos sem internet: a exclusão vai para a nuvem quando a conexão voltar
const excluidos=()=>load("hgo_excluidos")||[];
async function excluirNuvem(id){
  if(!sb||!sessao||!navigator.onLine){store("hgo_excluidos",[...new Set([...excluidos(),id])]);return}
  const {error}=await sb.from("projetos").delete().eq("id",id);
  store("hgo_excluidos",excluidos().filter(x=>x!==id).concat(error?[id]:[]));
}
// versão da nuvem, se for mais nova que a deste aparelho e aqui não houver alteração por enviar
async function versaoNuvem(id){
  if(!sb||!sessao||!navigator.onLine)return null;
  const {data}=await sb.from("projetos").select("dados,atualizado_em").eq("id",id).maybeSingle();
  if(!data)return null;
  const loc=projects()[id];
  if(loc&&(loc._pendente||new Date(loc._saved||0)>=new Date(data.atualizado_em)))return null;
  return {...data.dados,_id:id,_saved:data.atualizado_em,_nuvemEm:data.atualizado_em};
}
let sincronizando=false;
async function sincronizar(){
  if(sincronizando)return;sincronizando=true;
  try{
    for(const id of excluidos())await excluirNuvem(id);
    const all=projects();for(const id of Object.keys(all))if(all[id]._pendente)await enviarNuvem(id);
    // o projeto aberto acompanha o que foi salvo em outro aparelho
    if(P._id&&!P._exemplo){const nv=await versaoNuvem(P._id);if(nv&&new Date(nv._saved)>new Date(P._saved||0)){const a=projects();a[P._id]={...nv,_pendente:false};store("hgo_projects",a);P={...nv};delete P._nuvemEm;plantaImg=P.planta||null;afterLoad();toast("Projeto atualizado com a versão salva em outro aparelho")}}
  }finally{sincronizando=false}
}
window.addEventListener("online",sincronizar);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")sincronizar().catch(()=>{})});
$("#bSave").addEventListener("click",()=>salvarProjeto(false));
async function openDrawer(){
  $("#drawer").hidden=false;$("#plist").innerHTML=`<p class="note">Carregando…</p>`;
  const all=projects();
  if(sb&&sessao&&navigator.onLine){
    const {data,error}=await sb.from("projetos").select("id,nome,uc,atualizado_em").order("atualizado_em",{ascending:false}).limit(200);
    if(!error)for(const r of data){if(excluidos().includes(r.id))continue;if(!all[r.id]||(all[r.id]._saved||"")<r.atualizado_em)all[r.id]={...(all[r.id]||{}),_id:r.id,nome:r.nome,uc:r.uc,_saved:r.atualizado_em,_soNuvem:!all[r.id]||(all[r.id]._saved||"")<r.atualizado_em}}
  }
  const ids=Object.keys(all).sort((a,b)=>(all[b]._saved||"").localeCompare(all[a]._saved||""));
  $("#plist").innerHTML=ids.length?ids.map(id=>`<div class="pitem"><div><b>${esc(all[id].nome||"Sem titular")}</b><small>UC ${esc(all[id].uc||"—")} · ${all[id]._saved?new Date(all[id]._saved).toLocaleString("pt-BR"):""}${all[id]._pendente?" · aguardando envio":""}</small></div><button class="btn" type="button" data-open="${id}">Abrir</button><button class="btn" type="button" data-del="${id}" aria-label="Excluir">Excluir</button></div>`).join(""):`<p class="note">Nenhum projeto salvo ainda.</p>`;
}
$("#bProjects").addEventListener("click",openDrawer);
$("#bClose").addEventListener("click",()=>$("#drawer").hidden=true);
$("#drawer").addEventListener("click",async e=>{
  if(e.target.id==="drawer"){$("#drawer").hidden=true;return}
  const o=e.target.closest("[data-open]"),d=e.target.closest("[data-del]");
  if(o){const id=o.dataset.open;let x=projects()[id];
    const nv=await versaoNuvem(id).catch(()=>null);if(nv){x=nv;const a=projects();a[id]={...nv,_pendente:false};store("hgo_projects",a)}
    if(x){P={...x,_id:id};delete P._pendente;delete P._soNuvem;delete P._nuvemEm;plantaImg=P.planta||null;afterLoad()}else toast("Não foi possível abrir este projeto sem internet")}
  if(d){if(d.dataset.armed){const id=d.dataset.del;const all=projects();delete all[id];store("hgo_projects",all);await excluirNuvem(id);openDrawer()}else{d.dataset.armed="1";d.textContent="Confirmar"}}
});
function afterLoad(){ajustaLigacao();ajustaAnexos();store("hgo_current",P);buildFormFresh();render();$("#drawer").hidden=true;carregarArt();inmetroAuto();plantaAuto()}
function buildFormFresh(){const f=$("#form");const nf=f.cloneNode(false);f.replaceWith(nf);buildForm()}
$("#bNew").addEventListener("click",()=>{P={...BLANK,...(load("hgo_rt")||{})};plantaImg=null;afterLoad();toast("Novo projeto em branco")});
$("#bExample").addEventListener("click",()=>{P={...EXAMPLE};plantaImg=null;afterLoad()});
$("#bImport").addEventListener("click",()=>$("#fImport").click());
$("#fImport").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{P=JSON.parse(r.result);P._id=novoId();plantaImg=P.planta||null;afterLoad();toast("Projeto importado")}catch(err){toast("Arquivo .json inválido")}};r.readAsText(f)});
