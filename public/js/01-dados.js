"use strict";
/* ---------------- Esquema do formulário ---------------- */
const SECTIONS = [
 {id:"cli", t:"Titular e unidade consumidora", f:[
  ["nome","Nome do titular da UC","text","full"],["doc","CPF / CNPJ"],["rg","RG / Inscrição estadual"],
  ["uc","Nº da UC (conta contrato)"],["classe","Classe","sel",["Residencial","Comercial","Industrial","Rural","Poder público"]],
  ["tel","Telefone"],["email","E-mail"],["end","Logradouro e número","text","full"],["bairro","Bairro / Setor"],["cidade","Município"],
  ["cep","CEP"],["uf","UF"],["loc","Localização (link do Google Maps, coordenadas ou endereço)","text","full"],["lat","Latitude","num",null,"graus, ex. -16.6869"],["lon","Longitude","num",null,"graus, ex. -49.2648"]]},
 {id:"con", t:"Conexão e padrão de entrada", f:[
  ["tipoSolic","Tipo de solicitação","sel",["Conexão de GD em UC existente sem aumento de potência disponibilizada","Conexão de GD em UC existente com aumento de potência disponibilizada","Ligação nova com GD"],"full"],
  ["modalidade","Modalidade de compensação","chips",["Autoconsumo local","Autoconsumo remoto","Geração compartilhada","Múltiplas unidades consumidoras (EMUC)"],"full"],
  ["ligacao","Tipo de ligação","sel",["Monofásico","Bifásico","Trifásico"]],["tensao","Tensão de atendimento","sel",["220 V (F-N)","380/220 V"]],
  ["disj","Disjuntor de entrada","num",null,"A"],["poste","Nº do poste da rede","text",null,"aparece no diagrama unifilar"],["cabEnt","Condutor do ramal de entrada","num",null,"mm²"],
  ["carga","Carga instalada","num",null,"kW (vazio = soma do levantamento de carga)"],["demanda","Demanda estimada","num",null,"kW"],
  ["ramal","Ramal de ligação","sel",["Aéreo","Subterrâneo"]],["padrao","Padrão de entrada","sel",["Poste auxiliar","Muro / mureta","Fachada","Pontalete"]],
  ["catAtend","Categoria de atendimento","sel",["Automática","M1","M2","M3","B1","B2","T1","T2","T3","T4"]],["mudaPadrao","Haverá troca/mudança do padrão?","sel",["Não","Sim"]],["arrend","Telhado arrendado a terceiros?","sel",["Não","Sim"]],
  ["cxMat","Material da caixa de medição","sel",["METAL","POLICARBONATO"]],["cxDim","Dimensões da caixa de medição","text",null,"ex. 380mm X 500mm X 186,4mm"],
  ["cargas","Levantamento de carga (opcional)","area","full","Vazio = lista automática com 65% da potência do inversor. Ou um equipamento por linha: descrição ; potência W ; quantidade"],
  ["consumo","Histórico de consumo (12 meses, kWh)","area","full","Separe por vírgula, do mais antigo ao mais recente"]]},
 {id:"mod", t:"Módulos fotovoltaicos", f:[
  ["mFab","Fabricante"],["mMod","Modelo"],["mP","Potência nominal (Pmax)","num",null,"Wp"],["mQ","Quantidade","num",null,"un."],
  ["mVoc","Voc","num",null,"V"],["mVmp","Vmp","num",null,"V"],["mIsc","Isc","num",null,"A"],["mImp","Imp","num",null,"A"],
  ["mBeta","Coef. temperatura Voc","num",null,"%/°C (ex. -0,27)"],["mEff","Eficiência","num",null,"%"],
  ["mC","Comprimento","num",null,"m"],["mL","Largura","num",null,"m"],["mPeso","Peso","num",null,"kg"],["mCel","Nº de células","num",null,"un."],["mTipo","Tipo de células","sel",["Monocristalino","Policristalino","Bifacial monocristalino"]],["mReg","Registro INMETRO / certificado","text","full"]]},
 {id:"inv", t:"Inversor", f:[
  ["iFab","Fabricante"],["iMod","Modelo"],["iP","Potência nominal CA","num",null,"kW"],["iQ","Quantidade","num",null,"un."],
  ["iFases","Conexão CA","sel",["Monofásico 220 V","Trifásico 380/220 V"]],["iIout","Corrente CA máx. de saída","num",null,"A"],
  ["iVmax","Tensão CC máxima","num",null,"V"],["iNmppt","Nº de MPPTs","num",null,"un."],
  ["iMin","MPPT mínimo","num",null,"V"],["iMax","MPPT máximo","num",null,"V"],
  ["iImax","Corrente máx. entrada por MPPT","num",null,"A"],["iIsc","Corrente de curto máx. por MPPT","num",null,"A"],
  ["iFp","Fator de potência","num",null,"ex. 1 (ajustável 0,8 ind./cap.)"],["iEff","Eficiência máxima","num",null,"%"],
  ["iDht","DHT de corrente","num",null,"%"],["iDim","Dimensões","text",null,"ex. 375 x 350 x 160 mm"],["iPeso","Peso","num",null,"kg"],["iIP","Grau de proteção","text",null,"ex. IP65"],["iReg","Registro INMETRO / certificado","text","full"]]},
 {id:"arr", t:"Arranjo e instalação", f:[
  ["nStr","Nº de strings","num",null,"un."],["mPorStr","Módulos por string","num",null,"un."],
  ["strDet","Strings por MPPT (opcional, quando forem diferentes)","text","full","ex. 2x11; 2x10 = MPPT 1 com 2 strings de 11 e MPPT 2 com 2 strings de 10"],
  ["telhado","Tipo de telhado / estrutura","sel",["Cerâmico","Fibrocimento","Metálico (trapezoidal)","Laje","Solo"]],["orient","Orientação","sel",["Norte","Nordeste","Noroeste","Leste","Oeste","Sul"]],
  ["incl","Inclinação","num",null,"graus"],["hsp","Irradiação (HSP)","num",null,"kWh/m²·dia"],
  ["pr","Rendimento global (PR)","num",null,"ex. 0,80"],["tmin","Temperatura mínima","num",null,"°C"],
  ["dCC","Distância arranjo → inversor","num",null,"m"],["dCA","Distância inversor → quadro","num",null,"m"],
  ["locInv","Local do inversor","text","full","ex. Parede externa da garagem, a 1,30 m do piso"]]},
 {id:"rt", t:"Responsável técnico", f:[
  ["rtNome","Nome","text","full"],["rtTit","Título profissional","sel",["Engenheiro Eletricista","Técnico em Eletrotécnica","Engenheiro de Controle e Automação","Engenheiro Eletrônico"]],
  ["rtReg","CREA / CFT nº"],["rtCpf","CPF do responsável técnico"],["rtEmailEq","E-mail de acompanhamento (portal Equatorial)"],["rtArt","ART / TRT nº"],["rtTel","Telefone"],["rtEmail","E-mail"],["rtEmp","Empresa integradora"],["rtCidade","Cidade do RT (local e data)","text",null,"ex. Edealina - GO"],["dataDoc","Data dos documentos","date"],
  ["memoModelo","Modelo do memorial","sel",["Técnico descritivo (ANEXO III)","Simplificado"]],["rtAssin","Assinatura do responsável técnico","sig","full"],["assinaCli","Assinar também pelo cliente (procuração)","sel",["Sim","Não"]]]},
 {id:"ben", t:"Beneficiárias e anexos", f:[
  ["benef","UCs do rateio","area","full","Uma por linha: UC ; titular ; endereço ; % ; consumo médio kWh. Use os botões abaixo para ler as contas e calcular os %."],
  ["planta","Imagem de satélite para a planta","file","full","Print do Google Earth/Maps com o telhado e o padrão"]]}
];

const EXAMPLE = {
  _exemplo:true, projeto:"Exemplo · Residência 5 kW",
  nome:"Maria Aparecida dos Santos (exemplo)", doc:"000.000.000-00", rg:"0000000 SSP/GO", uc:"10000000000", classe:"Residencial",
  tel:"(62) 90000-0000", email:"cliente@exemplo.com", end:"Rua C-148, nº 120", bairro:"Jardim América", cidade:"Goiânia", cep:"74250-000", uf:"GO",
  lat:-16.7008, lon:-49.2803,
  tipoSolic:"Conexão de GD em UC existente sem aumento de potência disponibilizada", modalidade:"Autoconsumo local",
  ligacao:"Monofásico", tensao:"220 V (F-N)", disj:50, cabEnt:10, poste:"", carga:12.4, demanda:7.5, ramal:"Aéreo", padrao:"Muro / mureta", mudaPadrao:"Não", arrend:"Não",
  consumo:"610, 580, 655, 702, 690, 640, 598, 575, 620, 668, 712, 695",
  mFab:"JA Solar", mMod:"JAM72S30-550/MR", mP:550, mQ:10, mVoc:49.90, mVmp:41.96, mIsc:14.00, mImp:13.11, mBeta:-0.275, mEff:21.3, mC:2.278, mL:1.134, mPeso:28.6, mCel:144, mTipo:"Monocristalino", mReg:"Registro INMETRO nº 000000/2022 (preencher)",
  iFab:"Growatt", iMod:"MIN 5000TL-X", iP:5, iQ:1, iFases:"Monofásico 220 V", iIout:22.7, iVmax:550, iNmppt:2, iMin:80, iMax:550, iImax:13.5, iIsc:16.9, iFp:1, iEff:97.6, iDht:3, iDim:"375 x 350 x 160 mm", iPeso:10.8, iIP:"IP65", iReg:"Registro INMETRO nº 000000/2021 (preencher)",
  nStr:1, mPorStr:10, telhado:"Cerâmico", orient:"Norte", incl:15, hsp:5.35, pr:0.80, tmin:8, dCC:12, dCA:6, locInv:"Parede externa da garagem, base a 1,30 m do piso",
  rtNome:"Fulano de Tal (exemplo)", rtTit:"Engenheiro Eletricista", rtReg:"CREA-GO 0000000000/D", rtArt:"GO2026000000000", rtTel:"(62) 90000-0001", rtEmail:"rt@exemplo.com", rtEmp:"Solarcity Engenharia", dataDoc:new Date().toISOString().slice(0,10),
  benef:"", planta:""
};
const BLANK = {projeto:"Novo projeto", uf:"GO", classe:"Residencial", tipoSolic:SECTIONS[1].f[0][3][0], modalidade:"Autoconsumo local", ligacao:"Monofásico", tensao:"220 V (F-N)",
  ramal:"Aéreo", padrao:"Muro / mureta", mudaPadrao:"Não", arrend:"Não", iFases:"Monofásico 220 V", iQ:1, nStr:1, telhado:"Cerâmico", orient:"Norte",
  hsp:5.35, pr:0.80, tmin:8, mBeta:-0.28, iFp:1, rtTit:"Engenheiro Eletricista", dataDoc:new Date().toISOString().slice(0,10),
  cxMat:"METAL", cxDim:"380mm X 500mm X 186,4mm", memoModelo:"Técnico descritivo (ANEXO III)"};

let P = load("hgo_current") || {...EXAMPLE};
// inversor trifásico exige UC trifásica: corrige projetos antigos gravados como monofásicos
function ajustaAnexos(){if(P&&P._anexos&&/contrato/i.test(P._anexos.proc||"")&&!/procura/i.test(P._anexos.proc||"")){delete P._anexos.proc;return true}return false}
function ajustaLigacao(){if(P&&String(P.iFases||"").startsWith("Trif")&&P.ligacao!=="Trifásico"&&!P._ligManual){P.ligacao="Trifásico";P.tensao="380/220 V";return true}return false}
if(ajustaLigacao()|ajustaAnexos())store("hgo_current",P);
let currentDoc = "form";
let plantaImg = null; // data URL (não salva no localStorage se muito grande)

/* ---------------- utilidades ---------------- */
function load(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v));if(k==="hgo_current"&&typeof autoSalvar==="function")autoSalvar();return true}catch(e){return false}}
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const n=v=>{const x=parseFloat(String(v??"").replace(",","."));return isFinite(x)?x:0};
const fmt=(v,d=2)=>isFinite(v)?Number(v).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const val=k=>esc(P[k]??"");
function toast(t){const e=$("#toast");e.textContent=t;e.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>e.hidden=true,2800)}
// assinatura do RT (imagem), guardada no aparelho e na tabela perfil da conta
let assinRT=load("hgo_assin")||"";
setTimeout(()=>carregarArt().catch(()=>{}),0);
const imgAssin=(st="")=>assinRT?`<img class="assin" src="${assinRT}" alt="" style="${st}">`:"";
const assinaCli=()=>P.assinaCli!=="Não";
const svgAssin=(x,y,w,h)=>assinRT?`<image href="${assinRT}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`:"";
function dataBR(){const d=P.dataDoc?new Date(P.dataDoc+"T12:00:00"):new Date();return d.toLocaleDateString("pt-BR")}
function slug(){return (P.nome||"projeto").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,40)||"projeto"}

/* ---------------- cálculos ---------------- */
const BRK=[6,10,16,20,25,32,40,50,63,70,80,100,125,160,200];
// disjuntores de entrada existentes no padrão (regra do usuário: 60 A não existe)
const BRK_UC=[40,50,63,80,100,125,160,200];
const CAB=[[1.5,17.5],[2.5,24],[4,32],[6,41],[10,57],[16,76],[25,101],[35,125],[50,151],[70,192],[95,232]]; // NBR 5410 B1, Cu/PVC, 2 carregados
// lista de strings [{m: módulos em série, mppt: nº do MPPT}], do campo strDet ou de nStr × mPorStr
function listaStrings(){
  const det=String(P.strDet||"").trim(),out=[];
  if(det){det.split(/[;\n]/).map(x=>x.trim()).filter(Boolean).forEach((seg,i)=>seg.split("+").forEach(it=>{const m=it.trim().match(/^(?:(\d+)\s*[x×*]\s*)?(\d+)$/i);if(m)for(let k=0;k<(+m[1]||1);k++)out.push({m:+m[2],mppt:i+1})}));if(out.length)return out}
  const ns=Math.max(1,n(P.nStr)),ms=n(P.mPorStr),nm=Math.max(1,n(P.iNmppt)*Math.max(1,n(P.iQ))),spm=Math.ceil(ns/nm);
  for(let i=0;i<ns;i++)out.push({m:ms,mppt:Math.min(nm,Math.floor(i/spm)+1)});
  return out;
}
function porMppt(L){const g={};L.forEach(s=>{(g[s.mppt]??=[]).push(s.m)});return Object.entries(g).map(([mppt,ms])=>({mppt:+mppt,ms}))}
function calc(){
  const c={};
  c.qtd=n(P.mQ); c.pcc=c.qtd*n(P.mP)/1000; c.pca=n(P.iP)*Math.max(1,n(P.iQ));
  c.pinst=Math.min(c.pcc||Infinity,c.pca||Infinity); if(!isFinite(c.pinst))c.pinst=0;
  c.ratio=c.pca?c.pcc/c.pca:0;
  c.area=c.qtd*n(P.mC)*n(P.mL);
  c.anexo=c.pinst<=10?"I":"II"; c.categoria=c.pinst<=75?"Microgeração":"Minigeração"; c.anexoForm=c.pinst<=75?"I":"II";
  const vfn=220, vff=380;
  const I=n(P.disj);
  c.pdisp=n(P.disj)?pdEq().kw:0; // mesma PD dos documentos (V x I x FP 0,92)
  // strings
  const SL=listaStrings(), G=porMppt(SL), msMax=Math.max(...SL.map(x=>x.m)), msMin=Math.min(...SL.map(x=>x.m));
  c.strings=SL; c.mppts=G; c.qtdStr=SL.reduce((a,x)=>a+x.m,0);
  const ms=msMax, ns=SL.length, beta=n(P.mBeta)/100||-0.0028, tmin=P.tmin===""||P.tmin==null?8:n(P.tmin);
  c.vocStr=ms*n(P.mVoc); c.vocMax=c.vocStr*(1+beta*(tmin-25));
  c.vmpStr=ms*n(P.mVmp); c.vmpHot=msMin*n(P.mVmp)*(1+beta*(70-25));
  const nm=Math.max(1,n(P.iNmppt)*Math.max(1,n(P.iQ)));
  c.strPorMppt=Math.max(...G.map(g=>g.ms.length));
  c.iscMppt=c.strPorMppt*n(P.mIsc); c.impMppt=c.strPorMppt*n(P.mImp);
  // saída CA
  const vOut=P.iFases.startsWith("Trif")?vff:220;
  c.vOut=P.iFases.startsWith("Trif")?"380/220 V":"220 V";
  c.iout=n(P.iIout)||(P.iFases.startsWith("Trif")?n(P.iP)*1000/(Math.sqrt(3)*vff):n(P.iP)*1000/vOut);
  c.iTot=c.iout*Math.max(1,n(P.iQ));
  // disjuntor CA da geração igual ao disjuntor do padrão de entrada, como nos modelos aprovados pela Equatorial GO
  // o inversor limita a injeção à sua potência nominal, então basta a corrente nominal de saída
  c.disjCAcalc=BRK_UC.find(b=>b>=c.iTot)||BRK_UC[BRK_UC.length-1];
  c.disjCA=Math.max(disjPadrao(P.disj)||0,c.disjCAcalc);
  const ca=CAB.find(([s,a])=>a>=c.disjCA&&s>=2.5)||CAB[CAB.length-1]; c.cabCA=ca[0];
  const L=n(P.dCA), rho=0.0178;
  const vRef=P.iFases.startsWith("Trif")?vff:220;
  const dv=(s,i)=>P.iFases.startsWith("Trif")?(Math.sqrt(3)*L*i*rho/s)/vRef*100:(2*L*i*rho/s)/vRef*100;
  while(dv(c.cabCA,c.iout)>2 && c.cabCA<95){c.cabCA=CAB.find(([s])=>s>c.cabCA)[0]}
  c.dvCA=dv(c.cabCA,c.iout);
  // CC
  const Lcc=n(P.dCC), iscS=n(P.mIsc)*1.25;
  c.cabCC=4; const dvcc=s=>(2*Lcc*n(P.mImp)*rho/s)/(c.vmpStr||1)*100;
  if(dvcc(4)>1.5)c.cabCC=6; if(dvcc(6)>1.5)c.cabCC=10; c.dvCC=dvcc(c.cabCC);
  c.fusivel=ns/nm>=3?Math.ceil(iscS*1.25/5)*5:0;
  c.dpsCCv=Math.ceil(c.vocMax*1.2/50)*50; // Ucpv mínimo
  c.chaveCC=Math.max(25,Math.ceil(c.iscMppt*1.25/5)*5);
  // geração
  c.gerMes=c.pcc*n(P.hsp)*30*n(P.pr); c.gerAno=c.gerMes*12;
  const cons=String(P.consumo||"").split(/[,;\s]+/).map(n).filter(x=>x>0); c.cons=cons;
  c.consMed=cons.length?cons.reduce((a,b)=>a+b,0)/cons.length:0;
  c.cobertura=c.consMed?c.gerMes/c.consMed*100:0;
  c.benef=String(P.benef||"").split(/\n/).map(l=>l.split(";").map(s=>s.trim())).filter(r=>r[0]);
  c.ndiv=P.ligacao==="Monofásico"?"F+N":P.ligacao==="Bifásico"?"2F+N":"3F+N";
  c.condCA=P.iFases.startsWith("Trif")?"3F+N+T":P.iFases.startsWith("Bif")?"2F+T":"F+N+T";
  return c;
}
function checks(c){
  const r=[]; const add=(s,t)=>r.push([s,t]);
  if(!c.pinst){add("bad","Informe módulos e inversor para calcular a potência.");return r}
  add(c.pinst<=75?"ok":"warn",`${c.categoria} de ${fmt(c.pinst)} kW → formulário ANEXO ${c.anexoForm} da NT.00020.EQTL${c.anexo==="II"?"; acima de 10 kW também vai o diagrama de blocos":""}.`);
  if(c.pdisp) add(c.pinst<=c.pdisp?"ok":"bad",`Potência disponibilizada pelo padrão ≈ ${fmt(c.pdisp)} kW (disjuntor ${P.disj} A). ${c.pinst<=c.pdisp?"A geração cabe no padrão atual.":"A geração excede: é preciso aumento de carga/troca de padrão."}`);
  const qs=c.qtdStr; if(qs&&qs!==c.qtd) add("bad",`Strings somam ${qs} módulos, mas a quantidade informada é ${c.qtd}.`);
  if(c.vocMax&&n(P.iVmax)) add(c.vocMax<=n(P.iVmax)?"ok":"bad",`Voc da string a ${P.tmin??8} °C = ${fmt(c.vocMax,0)} V (limite do inversor ${P.iVmax} V).`);
  if(c.vmpHot&&n(P.iMin)) add(c.vmpHot>=n(P.iMin)&&c.vmpStr<=n(P.iMax)?"ok":"warn",`Vmp da string entre ${fmt(c.vmpHot,0)} V (70 °C) e ${fmt(c.vmpStr,0)} V (25 °C); faixa MPPT ${P.iMin}–${P.iMax} V.`);
  if(n(P.iIsc)) add(c.iscMppt<=n(P.iIsc)?"ok":"bad",`Isc por MPPT = ${fmt(c.iscMppt,1)} A (máx. ${P.iIsc} A).`);
  if(n(P.disj)&&c.disjCAcalc>n(P.disj)) add("warn",`A corrente de saída do inversor (${fmt(c.iout,1)} A) pede disjuntor de ${c.disjCAcalc} A, acima do disjuntor do padrão (${P.disj} A). Avalie aumento de carga.`);
  if(c.ratio) add(c.ratio<=1.35?"ok":"warn",`Relação CC/CA = ${fmt(c.ratio,2)} (${c.ratio<=1.35?"dentro do usual":"sobrecarregamento alto, confira o datasheet"}).`);
  for(const [t,nm] of [["m","módulo"],["i","inversor"]]){
    if(P[t+"Reg"])add(P["_inm"+t]?"warn":"ok",`INMETRO do ${nm}: ${esc(P[t+"Reg"])}${P["_inm"+t]?` (registro da ${esc(P["_inm"+t])}; o modelo exato não consta, confira)`:""}.`);
    else add("warn",inmBusca[t]?`Buscando o registro INMETRO do ${nm}…`:`Registro INMETRO do ${nm} não encontrado. Toque em “Buscar no INMETRO” em ${t==="m"?"Módulos":"Inversor"} ou informe o número.`);
  }
  if(P.modalidade!=="Autoconsumo local"&&!c.benef.length) add("warn","Modalidade com rateio: preencha a lista de UCs beneficiárias.");
  if(c.benef.length){const s=c.benef.reduce((a,r)=>a+n(r[3]),0); add(Math.abs(s-100)<0.01?"ok":"bad",`Rateio das beneficiárias soma ${fmt(s,1)}%.`)}
  if(!P.rtArt) add("warn","Informe o número da ART/TRT do responsável técnico.");
  if(P._equipEst) add("warn","Especificações elétricas do módulo e do inversor estimadas pela potência. Confira com o datasheet em “Módulos” e “Inversor” e informe marca, modelo e registro INMETRO.");
  if(P._coordAprox) add("warn","Coordenadas aproximadas pelo endereço. Confira no Google Maps antes de protocolar.");
  if(!n(P.carga)&&!String(P.cargas||"").trim()&&cargaInst()) add("ok",`Levantamento de carga gerado automaticamente com eletrodomésticos e eletrônicos: ${fmt(cargaInst())} kW (35% abaixo da potência do inversor).`);
  for(const x of conferenciaCruzada(c))if(!r.some(y=>y[1]===x[1]))r.push(x);
  if(P._disjPadrao) add("warn",`Disjuntor de entrada calculado pela corrente do inversor: ${P.disj} A (a conta não informa). Confirme no padrão.`);
  return r;
}

/* ---------------- conferência entre documentos ---------------- */
// o que diverge entre formulário, memorial, unifilar, blocos, TRT e INMETRO; "bad" bloqueia o Gerar todos
function conferenciaCruzada(c){
  const r=[];const add=(s,t)=>r.push([s,t]);const dg=x=>String(x||"").replace(/\D/g,"");const perto=(a,b)=>Math.abs(a-b)<0.006;
  if(!c.pinst)return r;
  // ligação da UC x inversor
  if(String(P.iFases||"").startsWith("Trif")&&P.ligacao!=="Trifásico")add("bad",`Inversor trifásico 380 V numa UC ${({Monofásico:"monofásica",Bifásico:"bifásica"})[P.ligacao]||"sem ligação definida"}: o formulário e o unifilar ficam incoerentes. Corrija o tipo de ligação ou o inversor.`);
  // disjuntor: o mesmo no padrão de entrada (formulário/unifilar) e na proteção CA da geração (memorial/blocos)
  if(n(P.disj)&&c.disjCA!==n(P.disj))add("bad",`Disjuntor diferente entre os documentos: padrão de entrada ${P.disj} A (formulário e unifilar) e proteção CA da geração ${c.disjCA} A (memorial, unifilar e blocos). Use ${c.disjCA} A no disjuntor de entrada ou revise o padrão.`);
  if(!n(P.disj))add("bad","Disjuntor de entrada vazio: formulário, memorial e unifilar ficariam sem o valor.");
  // dados do titular e da UC que aparecem em todos os documentos
  const falta=[["nome","nome do titular"],["doc","CPF/CNPJ"],["uc","UC / conta contrato"],["end","endereço"],["cidade","cidade"]].filter(([k])=>!String(P[k]||"").trim()).map(([,t])=>t);
  if(falta.length)add("bad","Faltam no projeto (saem em branco nos documentos): "+falta.join(", ")+".");
  if(P.nome&&!P._conferido)add("warn","Dados lidos dos documentos ainda não conferidos (nome, CPF, UC, ligação, disjuntor).");
  // TRT x projeto
  if(!artArq)add("warn","TRT/ART não anexada: não deu para conferir CPF e potência com o formulário.");
  else if(trtInfo&&trtInfo.ok&&trtInfo.texto){
    const cpf=dg(P.doc);
    if(cpf&&!trtInfo.dig.includes(cpf))add("bad",`A TRT anexada não tem o CPF/CNPJ ${P.doc} do titular. Pode ser a TRT de outro cliente.`);
    const k=trtInfo.kws;
    if(k.length){
      if(k.some(x=>perto(x,c.pca)))add("ok",`TRT com ${fmt(c.pca,3)} kW, igual à potência dos inversores no formulário.`);
      else if(k.some(x=>perto(x,c.pcc)))add("bad",`A TRT usa a potência dos módulos (${fmt(c.pcc,3)} kWp), mas o formulário usa a dos inversores (${fmt(c.pca,3)} kW). Foi o motivo da reprova de 03/11: emita a TRT com ${fmt(c.pca,3)}.`);
      else add("bad",`A potência da TRT (${k.map(x=>fmt(x,3)).join(", ")}) não bate com a dos inversores no formulário (${fmt(c.pca,3)} kW).`);
    }else add("warn","Não achei a potência no texto da TRT anexada; confira se é "+fmt(c.pca,3)+" kW.");
    if(P.rtArt&&!trtInfo.dig.includes(dg(P.rtArt)))add("warn",`O número da ART/TRT do projeto (${esc(P.rtArt)}) não aparece no PDF anexado.`);
  }else if(trtInfo&&trtInfo.ok&&!trtInfo.texto)add("warn","A TRT anexada é imagem (sem texto): confira CPF e potência à mão.");
  // INMETRO: relatório de ensaio do inversor é obrigatório no portal
  if(!P.iReg)add("bad","Sem registro INMETRO do inversor: o portal exige o relatório de ensaio.");
  return r;
}
