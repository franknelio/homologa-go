"use strict";
/* ---------------- documentos ---------------- */
const DOCS=[
 {id:"form",t:"Formulário de solicitação",short:"Formulário"},
 {id:"memo",t:"Memorial técnico descritivo",short:"Memorial"},
 {id:"unif",t:"Diagrama unifilar",short:"Unifilar"},
 {id:"blocos",t:"Diagrama de blocos",short:"Blocos"},
 {id:"planta",t:"Planta de situação e localização",short:"Planta"},
 {id:"placa",t:"Placa de advertência",short:"Placa"},
 {id:"benef",t:"Lista de UCs beneficiárias",short:"Beneficiárias",cond:()=>P.modalidade!=="Autoconsumo local"},
 {id:"check",t:"Checklist de protocolo",short:"Checklist"}
];
const activeDocs=()=>DOCS.filter(d=>!d.cond||d.cond());

function foot(doc,pg,tot){return `<div class="foot"><span>${esc(doc)} · ${esc(P.nome||"")} · UC ${esc(P.uc||"")}</span><span>Folha ${pg}/${tot}</span></div>`}
function hdr(title,sub){return `<div class="hdr"><div><h1>${title}</h1><div class="sub">${sub||""}</div></div><div class="r">${esc(P.rtEmp||"")}<br>RT: ${esc(P.rtNome||"")} · ${esc(P.rtReg||"")}<br>${dataBR()}</div></div>`}
const tr=(a,b,c,d)=>`<tr><th style="width:24%">${a}</th><td class="v"${c===undefined?' colspan="3"':""}>${b??""}</td>${c!==undefined?`<th style="width:22%">${c}</th><td class="v">${d??""}</td>`:""}</tr>`;
const box=on=>`<span class="x">[${on?"X":"&nbsp;"}]</span>`;

function protTable(){return `<table><tr><th>Função (ANSI)</th><th>Descrição</th><th>Ajuste</th><th>Tempo máx. de atuação</th></tr>
<tr><td>27</td><td>Subtensão</td><td class="v">V &lt; 0,8 pu (176 V)</td><td class="v">0,4 s</td></tr>
<tr><td>59</td><td>Sobretensão</td><td class="v">V &gt; 1,1 pu (242 V)</td><td class="v">0,2 s</td></tr>
<tr><td>81U</td><td>Subfrequência</td><td class="v">f &lt; 57,5 Hz</td><td class="v">0,2 s</td></tr>
<tr><td>81O</td><td>Sobrefrequência</td><td class="v">f &gt; 62,0 Hz</td><td class="v">0,2 s</td></tr>
<tr><td>78 / AI</td><td>Anti-ilhamento (IEC 62116)</td><td class="v">detecção ativa</td><td class="v">2,0 s</td></tr>
<tr><td>25</td><td>Sincronismo</td><td class="v">interno ao inversor</td><td class="v">—</td></tr>
<tr><td>—</td><td>Reconexão após restabelecimento</td><td class="v">tensão e frequência normais</td><td class="v">20 a 300 s</td></tr></table>`}

// carga instalada informada; se vazia, a soma do levantamento de carga (digitado ou automático)
function cargaInst(){
  if(n(P.carga))return n(P.carga);
  const lc=listaCargas();return Math.round(lc.reduce((a,r)=>a+r.p*r.q,0)/10)/100;
}
function catAtend(){
  if(P.catAtend&&P.catAtend!=="Automática")return P.catAtend;
  const d=n(P.disj);
  if(P.ligacao==="Monofásico")return d<=32?"M1":d<=50?"M2":"M3";
  if(P.ligacao==="Bifásico")return d<=50?"B1":"B2";
  return d<=50?"T1":d<=63?"T2":d<=100?"T3":"T4";
}
function descArranjo(c){
  const z=v=>String(v).padStart(2,"0"),iq=n(P.iQ)||1;
  const partes=c.mppts.flatMap(g=>{const cont={};g.ms.forEach(m=>cont[m]=(cont[m]||0)+1);return Object.entries(cont).map(([m,k])=>`${z(k)} arranjo de ${z(m)} módulos de ${fmt(n(P.mP),0)}W em série na ${g.mppt} MPPT`)});
  return `Sistema Fotovoltaico conectado à rede com ${partes.join(" + ")}. Conectado a ${z(iq)} inversor${iq>1?"es":""} de frequência ${esc(String(P.iFab||"").toUpperCase())} de ${fmt(n(P.iP),n(P.iP)%1?1:0)} kW.`;
}
function docMemoSimpl(c){
  const v=k=>esc(String(P[k]??"")),up=k=>esc(String(P[k]??"").toUpperCase());
  const rad=(on,t)=>`<span class="rd"><i class="${on?"on":""}"></i>${t}</span>`;
  const cat=catAtend(),z=x=>String(x).padStart(2,"0");
  const fasesInv=P.iFases.startsWith("Trif")?3:1,polos=P.iFases.startsWith("Trif")?"Tripolar":"Mono";
  const nMppt=c.mppts.length;
  const vDps=c.vocMax>1000?1500:1000;
  const benef=c.benef.length?c.benef.map(r=>[r[0],r[3]?fmt(n(r[3]),n(r[3])%1?2:0)+"%":""]):[[P.uc,"100%"]];
  const somaR=c.benef.length?c.benef.reduce((a,r)=>a+n(r[3]),0):100;
  const linhasR=[...benef,...Array(Math.max(0,5-benef.length)).fill(["",""])];
  const cabec=`<div class="mtit">Memorial Descritivo Simplificado - Geração Distribuída Fotovoltaica</div>`;
  const p1=`<div class="sheet memo">${cabec}
  <div class="mbox">
   <div class="ml">Nome do Cliente/Preposto:</div><div class="mv">${up("nome")}</div>
   <div class="mrow"><span class="ml">E-mail:</span><span class="mv f">${v("email")}</span><span class="ml">Telefone:</span><span class="mv">${v("tel")}</span></div>
   <div class="ml">CPF/CNPJ:</div><div class="mv">${v("doc")}</div>
   <div class="ml">Nome do Responsável Técnico:</div><div class="mv">${up("rtNome")}</div>
   <div class="mrow"><span class="ml">E-mail:</span><span class="mv f">${v("rtEmail")}</span><span class="ml">Telefone:</span><span class="mv">${v("rtTel")}</span></div>
   <div class="mrow"><span class="ml">Registro:</span><span class="mv f">${v("rtReg")}</span></div>
   <div class="mrow"><span class="ml">Título Profissional:</span><span class="mv f">${v("rtTit")}</span></div>
   <div class="ml">Endereço da obra:</div><div class="mv">${up("end")}</div>
   <div class="mrow"><span class="ml">Bairro:</span><span class="mv f">${up("bairro")}</span></div>
   <div class="mrow"><span class="ml">Cidade:</span><span class="mv f">${up("cidade")}-${up("uf")||"GO"}</span></div>
   <div class="mrow"><span class="ml">Unidade Consumidora:</span><span class="mv f">${v("uc")}</span></div>
  </div>
  <p class="mp">Compensação do excedente de Energia (caso exista)</p>
  <div class="mrat"><table><tr><th>Unidade Consumidora (UC)</th><th>Rateio (percentual - %)</th></tr>${linhasR.map(r=>`<tr><td>${esc(r[0]||"")}</td><td>${esc(r[1]||"")}</td></tr>`).join("")}<tr><td class="nb"></td><td class="nb"><b>${fmt(somaR,2)}%</b></td></tr></table>
   <span>${Math.abs(somaR-100)<0.01?"O rateio está correto.":"O rateio deve somar 100%."}</span></div>
  <div class="mrow mt"><span>Objetivo: Instalação de Sistema</span><span class="mv">${c.pinst<=75?"microgeração (≤ 75kWp)":"minigeração (&gt; 75kWp)"}</span><span>através de geração fotovoltaica</span><span class="mv">${fmt(c.pinst)}</span><span>kW.</span></div>
  <p class="mp">1 - Descrição do Sistema de Medição Existente</p>
  <div class="mopt"><div class="mrow">${rad(false,"Grupo A")}<span style="flex:1"></span>${rad(true,"Grupo B")}<span style="width:120px"></span></div>
   <div class="mrow"><span>Transformador:</span><span class="mv s"></span><span>kVA</span><span style="flex:1"></span><span>Categoria de Atendimento:</span><span class="mv s">${cat}</span><span style="width:60px"></span></div></div>
  <div class="mrow mt"><span class="mlab">Tipo de conexão:</span><div class="mopt mr">${rad(P.ligacao==="Monofásico","Monofásica")}${rad(P.ligacao==="Bifásico","Bifásica")}${rad(P.ligacao==="Trifásico","Trifásica")}</div></div>
  <div class="mrow mt"><span class="mlab">Tensão de Atendimento:</span><div class="mopt mr">${rad(true,"380/220V")}${rad(false,"13,8kV")}${rad(false,"34,5kV")}</div></div>
  <div class="mrow mt"><span class="mlab">Ramal:</span><div class="mopt mr">${rad(P.ramal!=="Subterrâneo","Aéreo")}${rad(P.ramal==="Subterrâneo","Subterrâneo")}<span></span></div></div>
  <div class="mrow mt"><span>Disjuntor:</span><span class="mv s">${v("disj")}</span><span>A</span><span style="width:30px"></span><span>Condutor:</span><span class="mv m">${cabEntUC()} mm²</span></div>
  <div class="mrow mt"><span>Número do poste de derivação para unidade consumidora:</span><span class="mv m">${v("poste")}</span></div>
  <p class="mp">2 - Sistema Fotovoltaico</p><p class="mp">Descrição</p>
  <div class="marea" style="height:64px">${descArranjo(c)}</div>
  </div>`;
  const p2=`<div class="sheet memo">${cabec}
  <div class="ml2">Inversor:</div><div class="mbar">${z(n(P.iQ)||1)} UNIDADE${(n(P.iQ)||1)>1?"S":""} - INVERSOR DE FREQUÊNCIA ${fmt(n(P.iP),n(P.iP)%1?1:0)} kW, ${up("iFab")} ${up("iMod")}</div>
  <div class="ml2">Módulo Fotovoltaico:</div><div class="mbar">${z(c.qtd)} UNIDADES - ${up("mFab")} ${up("mMod")}${/bifacial/i.test(P.mTipo||"")?" BIFACIAL":""} ${fmt(n(P.mP),0)}W ${/poli/i.test(P.mTipo||"")?"POLI":"MONO"}</div>
  <div class="mrow mt"><span>Condutor CA:</span><span class="mv m">${c.cabCA} mm²</span><span style="width:12px"></span><span>Condutor CC:</span><span class="mv m">${c.cabCC} mm²</span></div>
  <div class="ml2">Dispositivo de proteção CA:</div><div class="mbar">01 UNID - Disjuntor Termomagnético ${polos} C${c.disjCA}/${fasesInv>1?"400":"230"}V, ${fasesInv} UNID - Dispositivo Protetor Surto 10kA/275V</div>
  <div class="ml2">Dispositivo de proteção CC:</div><div class="mbar">${nMppt} UNID Dispositivo Protetor Surto 20kA/${vDps}V Bipolar</div>
  <div class="ml2">Observações</div>
  <div class="marea" style="height:150px">${P.rtArt?`N° DA ${/^[A-Za-z]/.test(P.rtArt)?"":/^Técnico/.test(P.rtTit||"")?"TRT ":"ART "}${v("rtArt")}<br>`:""}LATITUDE ${dms(n(P.lat),"N","S")}<br>LONGITUDE ${dms(n(P.lon),"E","W")}</div>
  <div class="msig">${imgAssin("height:56px;display:block;margin:0 0 -10px 120px")}<div class="ln"></div><div class="mrow"><span class="ml">Nome do Responsável Técnico:</span><span class="mv f">${up("rtNome")}</span></div><div class="mrow"><span class="ml">Registro:</span><span class="mv f">${v("rtReg")}</span></div></div>
  </div>`;
  return [p1,p2];
}

/* ---- modelos Equatorial GO: memorial técnico descritivo (ANEXO III, REV 06) e formulário ANEXO I (REV 06) ---- */
// coordenadas geográficas (SIRGAS 2000 ≈ WGS 84) → UTM
function utm(lat,lon){
  if(!lat||!lon)return null;
  const a=6378137,f=1/298.257222101,e2=f*(2-f),ep2=e2/(1-e2),k0=0.9996;
  const fuso=Math.floor((lon+180)/6)+1,l0=((fuso-1)*6-180+3)*Math.PI/180;
  const p=lat*Math.PI/180,l=lon*Math.PI/180,N=a/Math.sqrt(1-e2*Math.sin(p)**2),T=Math.tan(p)**2,C=ep2*Math.cos(p)**2,A=Math.cos(p)*(l-l0);
  const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*p-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*p)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*p)-(35*e2**3/3072)*Math.sin(6*p));
  const x=500000+k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep2)*A**5/120);
  let y=k0*(M+N*Math.tan(p)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*ep2)*A**6/720));
  if(lat<0)y+=10000000;
  return {fuso,x:x.toFixed(4),y:y.toFixed(4)};
}
const UP=s=>String(s??"").toUpperCase();
const SEMAC=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"");
function regRT(){const r=String(P.rtReg||"").trim();return r.replace(/^(CREA|CFT|CRT|CFTA)[\s\-–]*(\d{1,2}|[A-Z]{2})?[\s\-–]*(n[ºo°.]*)?\s*/i,"").trim()||r}
function ufRT(){const m=String(P.rtReg||"").match(/(?:CREA|CFT|CRT)[\s\-–]*([A-Z]{2})\b/i);return m?m[1].toUpperCase():(P.rtUF||"GO")}
function titRT(){const t=P.rtTit||"";return /Eletrot/i.test(t)?"ELETROTECNICO":SEMAC(UP(t))}
function cidRT(){return P.rtCidade||[P.cidade,P.uf].filter(Boolean).join(" - ")}
function cepFmt(s){const d=String(s||"").replace(/\D/g,"");return d.length===8?`${d.slice(0,2)}.${d.slice(2,5)}-${d.slice(5)}`:String(s||"")}
function mesAno(){const d=P.dataDoc?new Date(P.dataDoc+"T12:00:00"):new Date();return d.toLocaleDateString("pt-BR",{month:"long"})+", "+d.getFullYear()}
const kwTxt=v=>fmt(v,v%1?2:0).replace(/,00$/,"");
const nPal=k=>["","UM","DOIS","TRÊS","QUATRO"][k]||String(k);
function fasesUC(){return P.ligacao==="Trifásico"?3:P.ligacao==="Bifásico"?2:1}
function vnUC(){return P.ligacao==="Monofásico"?220:380}
// potência disponibilizada pelo modelo da Equatorial: PD = Vn × Idg × NF / 1000, PD(kW) = PD(kVA) × 0,92
// condutor do ramal de entrada: o informado ou o padrão Equatorial pelo disjuntor (mesmo valor em todos os documentos)
function cabEntUC(){const d=n(P.disj);return n(P.cabEnt)||(d<=50?10:d<=63?16:d<=80?25:d<=100?35:50)}
function pdEq(){const nf=P.ligacao==="Trifásico"?Math.sqrt(3):1,kva=vnUC()*n(P.disj)*nf/1000;return {nf,kva,kw:kva*0.92}}
// levantamento de carga: "descrição; potência W; quantidade" por linha
// levantamento de carga: o digitado em "cargas" ou, se vazio, eletrodomésticos e eletrônicos gerados
// automaticamente somando 65% da potência dos inversores (35% abaixo, regra do usuário) ou a carga informada
function listaCargas(){
  const dig=String(P.cargas||"").split(/\n/).map(l=>l.split(";").map(s=>s.trim())).filter(r=>r[0]&&n(r[1])).map(r=>({d:r[0],p:n(r[1]),q:n(r[2])||1}));
  return dig.length?dig:cargasAuto();
}
function cargasAuto(){
  const alvo=Math.round((n(P.carga)||n(P.iP)*(n(P.iQ)||1)*0.65)*1000);if(!alvo)return [];
  // [descrição, W, quantidade máxima], na ordem em que entram
  const k=Math.max(1,Math.floor(alvo/15000)); // instalações maiores repetem os equipamentos
  const CAT=[["GELADEIRA",150,k],["TELEVISOR",120,2*k],["LAMPADAS LED",10,0],["CHUVEIRO ELETRICO",5500,alvo>=7000?k:0],["MICRO-ONDAS",1200,k],["MAQUINA DE LAVAR",500,k],["COMPUTADOR",300,k],["FERRO DE PASSAR",1000,k],["AR COND. 12000 BTU",1200,3*k],["FREEZER",300,k],["VENTILADOR",100,3*k],["LIQUIDIFICADOR",300,k],["AIR FRYER",1500,k]];
  const out=[];let soma=0;
  const lamp={d:"LAMPADAS LED",p:10,q:Math.min(15,Math.floor(alvo*0.04/10))};
  for(const [d,p,max] of CAT){
    if(d==="LAMPADAS LED"){if(lamp.q&&soma+lamp.q*10<=alvo){out.push(lamp);soma+=lamp.q*10}continue}
    let q=0;while(q<max&&soma+p<=alvo){q++;soma+=p}
    if(q)out.push({d,p,q});
    if(out.length>=10)break;
  }
  const resto=alvo-soma;
  if(resto>=100){const q=Math.floor(resto/100);out.push({d:"TOMADAS DE USO GERAL",p:100,q});soma+=q*100}
  const fim=alvo-soma;if(fim>=10){const l=out.find(x=>x.d==="LAMPADAS LED");if(l)l.q+=Math.floor(fim/10);else out.push({d:"LAMPADAS LED",p:10,q:Math.floor(fim/10)})}
  return out;
}
function localCaixa(){return {"Muro / mureta":"MURO DO CLIENTE","Poste auxiliar":"POSTE AUXILIAR","Fachada":"FACHADA DO IMÓVEL","Pontalete":"PONTALETE"}[P.padrao]||UP(P.padrao||"MURO DO CLIENTE")}
const regInm=t=>String(P[t+"Reg"]||"").replace(/^Registro INMETRO\s*n[ºo°]?\s*/i,"").trim();
function invTab(){const t=P.iFases.startsWith("Trif");return {polos:t?3:1,v:t?380:220}}
const AMP_CC={2.5:30,4:38,6:46,10:64,16:85};

function docMemo(c){return P.memoModelo==="Simplificado"?docMemoSimpl(c):docMemoTec(c)}
function docMemoTec(c){
  const pg=h=>`<div class="sheet mt">${h}</div>`;
  const tit=(nr,t)=>`<h3>${nr}${nr?"&nbsp;&nbsp;&nbsp;&nbsp;":""}${t}</h3>`;
  const tb=rows=>`<table class="tq">${rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  const tg=rows=>`<table class="tg">${rows.map(([a,b])=>b===undefined?`<tr><td colspan="2" class="c">${a}</td></tr>`:`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  const lig=UP(P.ligacao||"Monofásico"),nf=fasesUC(),vn=vnUC(),cab=cabEntUC(),pd=pdEq(),mod=UP(P.modalidade||"Autoconsumo local");
  const pot=kwTxt(c.pca),iq=n(P.iQ)||1,u=utm(n(P.lat),n(P.lon)),nova=(P.tipoSolic||"").includes("nova");
  const titulo=`${c.categoria==="Minigeração"?"MINIGERAÇÃO":"MICROGERAÇÃO"} DISTRIBUÍDA UTILIZANDO UM SISTEMA DE ENERGIA SOLAR FOTOVOLTAICA DE ${pot}kW CONECTADO À REDE DE ENERGIA ELÉTRICA DE BAIXA TENSÃO EM ${vn}V, CARACTERIZADO COMO ${esc(mod)}`;
  const docCli=String(P.doc||"").replace(/\D/g,"").length>11?"CNPJ":"CPF";
  const assin=`<div class="masn">${imgAssin("height:62px;display:block;margin:0 auto -6px")}<div class="ln"></div>ASSINATURA DO RESPONSÁVEL TÉCNICO<br>${esc(UP(P.rtNome))}<br>REGISTRO: ${esc(regRT())} - ${esc(ufRT())}<br>${esc(cidRT())}</div>`;
  // 1. capa
  const p1=pg(`<div class="mcap"><b>MEMORIAL TECNICO DESCRITIVO</b><br>REV 06 - 12/2025</div>
   <div class="mcap" style="top:300px"><b>${titulo}</b></div>
   <div class="mcap" style="top:575px"><b>${esc(UP(P.nome))}<br>${docCli}: ${val("doc")}</b></div>
   <div class="mcap" style="top:735px"><b>${esc(UP(P.rtNome))}<br>${esc(titRT())}<br>REGISTRO: ${esc(regRT())} - ${esc(ufRT())}</b>${imgAssin("height:56px;display:block;margin:2px auto 0")}</div>
   <div class="mcap" style="top:990px"><b>${esc(cidRT())}<br>${esc(mesAno())}</b></div>`);
  // 2. siglas
  const SIG=[["ABNT","Associação Brasileira de Normas Técnicas"],["ANEEL","Agência Nacional de Energia Elétrica"],["BT","Baixa tensão (220/127 V, 380/220 V)"],["C.A","Corrente Alternada"],["C.C","Corrente Contínua"],["CD","Custo de disponibilidade (30 kWh, 50kWh ou 100 kWh em sistemas de baixa tensão monofásicos, bifásicos ou trifásicos, respectivamente)"],["CI","Carga Instalada"],["DSP","Dispositivo Supressor de Surto"],["DSV","Dispositivo de seccionamento visível"],["FP","Fator de potência"],["FV","Fotovoltaico"],["GD","Geração distribuída"],["HSP","Horas de sol pleno"],["IEC","International Electrotechnical Commission"],["IN","Corrente Nominal"],["IDG","Corrente nominal do disjuntor de entrada da unidade consumidora em ampéres (A)"],["Ist","Corrento de curto-circuito de módulo fotovoltaico em ampéres (A)"],["kW","kilo-watt"],["kWp","kilo-watt pico"],["kWh","kilo-watt-hora"],["MicroGD","Microgeração distribuída"],["MT","Média tensão (13.8 kV, 34.5 kV)"],["NF","Fator referente ao número de fases, igual a 1 para sistemas monofásicos e bifásicos ou √3&nbsp; para sistemas trifásicos"],["PRODIST","Procedimentos de Distribuição"],["PD","Potência disponibilizada para a unidade consumidora onde será instalada a geração distribuída"],["PR","Pára-raio"],["QGD","Quadro Geral de Distribuição"],["QGBT","Quadro Geral de Baixa Tensão"],["REN","Resolução Normativa"],["SPDA","Sistema de Proteção contra Descargas Atmosféricas"],["SFV","Sistema Fotovoltaico"],["SFVCR","Sistema Fotovoltaico Conectado à Rede"],["TC","Transformador de corrente"],["TP","Transformador de potencial"],["UC","Unidade Consumidora"],["UTM","Universal Transversa de Mercator"],["VN","Tensão nominal de atendimento em volts (V)"],["Voc","Tensão de circuito aberto de módulo fotovoltaico em volts (V)"]];
  const p2=pg(`<div class="mct"><b>LISTA DE SIGLAS E ABREVIATURAS</b></div><div class="msig">${SIG.map(([a,b])=>`<div>${a}: ${b}</div>`).join("")}</div>`);
  // 3. sumário
  const SUM=[["1.","OBJETIVO",4],["2.","REFERÊNCIAS NORMATIVAS E REGULATÓRIA",4],["3.","DADOS DA UNIDADE CONSUMIDORA",5],["4.","LEVANTAMENTO DE CARGA",5],["5.","PADRÃO DE ENTRADA",6],["5.1.","Tipo de Ligação e Tensão de Atendimento",6,1],["5.2.","Disjuntor de Entrada",6,1],["5.3.","Potência Disponibilizada",6,1],["5.4.","Caixa de Medição",7,1],["5.5.","Ramal de Entrada",7,1],["6.","DIMENSIONAMENTO DO GERADOR",8],["6.1.","Dimensionamento do gerador",8,1],["7.","DIMENSIONAMENTO DO INVERSOR",9],["8.","DIMENSIONAMENTO DA PROTEÇÃO",9],["8.1.","Fusíveis",9,1],["8.2.","Disjuntores",10,1],["8.3.","DPS",10,1],["8.4.","Aterramento",10,1],["8.5.","Requisitos de Proteção",10,1],["9.","DIMENSIONAMENTO DOS CABOS",11],["10.","PLACA DE ADVERTÊNCIA",11],["11.","ANEXOS",12]];
  const p3=pg(`<div class="mct"><b>SUMÁRIO</b></div><div class="msum">${SUM.map(([a,b,p,s])=>`<div class="${s?"s":""}"><span>${a}&nbsp;&nbsp;&nbsp;${b}</span><span>${p}</span></div>`).join("")}</div>`);
  // 4. objetivo e referências
  const REF=["ABNT NBR 5410: Instalações Elétricas de Baixa Tensão.","ABNT NBR 10899: Energia Solar Fotovoltaica – Terminologia.","ABNT NBR 11704: Sistemas Fotovoltaicos – Classificação.","ABNT NBR 16149: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição.","ABNT NBR 16150: Sistemas fotovoltaicos (FV) – Características da interface de conexão coma rede elétrica de distribuição – Procedimentos de ensaio de conformidade.","ABNT NBR IEC 62116: Procedimento de Ensaio de Anti-ilhamento para Inversores de Sistemas Fotovoltaicos Conectados à Rede Elétrica.","EQUATORIAL ENERGIA NT.00020.EQTL.Normas e Padrões – Conexão de Microgeração Distribuída ao Sistema de Baixa Tensão.","EQUATORIAL ENERGIA NT.00001.EQTL.Normas e Padrões – Fornecimento de Energia Elétrica em Baixa Tensão.","EQUATORIAL ENERGIA NT.00030.EQTL.Normas e Padrões - Padrões Construtivos de Caixas de Medição e Proteção.","ANEEL Procedimentos de Distribuição de Energia Elétrica no Sistema Elétrico Nacional – PRODIST: Módulo 3 – Conexão ao Sistema de Distribuição de Energia Elétrica.","ANEEL Resolução Normativa nº 1000, de 07 de dezembro de 2021, que estabelece as regras de prestação do serviço público de distribuição de energia elétrica.","ANEEL Resolução Homologatória nº 3171, de 7 de fevereiro de 2023, que homologa o formulário de Orçamento de Conexão e centrais de microgeração e minigeração distribuída e os valores de referência dos custos de investimento","IEC 61727 Photovoltaic (PV) Systems - Characteristics of the Utility Interface","IEC 62116:2014 Utility-interconnected photovoltaic inverters - Test procedure of islanding prevention measures"];
  const p4=pg(`${tit("1.","OBJETIVO")}<p>O presente memorial técnico descritivo tem como objetivo apresentar a metodologia utilizada para elaboração e apresentação à EQUATORIAL GO, dos documentos mínimos necessários, em conformidade com a REN 1000, com o PRODIST Módulo 3, com a REH 3171, com a NT.00020 e com as normas técnicas do corpo de bombeiros de cada estado, nacionais (ABNT) ou internacionais (europeia e americana), para SOLICITAÇÃO DO ORÇAMENTO DE CONEXÃO de uma micro ou minigeração distribuída conectada à rede de distribuição de energia elétrica através sistema de energia solar fotovoltaica de ${pot}kW, composto por ${iq} inversor(es) da marca ${esc(UP(P.iFab))} de potência ${kwTxt(n(P.iP))} kW e ${c.qtd} modulos da marca ${esc(UP(P.mFab))} de potência ${fmt(n(P.mP),0)} W, caracterizado como ${esc(mod)}.</p>
   ${tit("2.","REFERÊNCIAS NORMATIVAS E REGULATÓRIA")}<p>Para elaboração deste memorial técnico descritivo, no âmbito da área de concessão do estado de GOIAS foram utilizadas as normas e resoluções, nas respectivas revisões vigentes, conforme descritas abaixo:</p>
   <ol class="mref">${REF.map(r=>`<li>${r}</li>`).join("")}</ol>`);
  // 5. dados da UC e levantamento de carga
  const img=P.planta||plantaImg;
  const fig=img?`<img src="${img}" alt="">`:`<div class="mfigv">Localização: ${fmt(n(P.lat),6)}, ${fmt(n(P.lon),6)}<br>Adicione a imagem de satélite em “Titular e unidade consumidora”.</div>`;
  const LC=listaCargas(),linhas=LC.length?LC:[{d:"CARGA INSTALADA DECLARADA",p:cargaInst()*1000,q:1}];
  const rowsC=Array.from({length:Math.max(12,linhas.length)},(_,i)=>{const r=linhas[i];if(!r)return `<tr><td>${i+1}</td><td></td><td></td><td></td><td>0,00</td><td></td><td>0,00</td><td></td><td>0,00</td><td>0,00</td></tr>`;const ci=r.p*r.q/1000;return `<tr><td>${i+1}</td><td>${esc(UP(r.d))}</td><td>${fmt(r.p,0)}</td><td>${fmt(r.q)}</td><td>${fmt(ci)}</td><td>1,00</td><td>${fmt(ci)}</td><td>1,00</td><td>${fmt(ci)}</td><td>${fmt(ci)}</td></tr>`}).join("");
  const somaP=linhas.reduce((a,r)=>a+r.p,0),somaC=linhas.reduce((a,r)=>a+r.p*r.q/1000,0);
  const endC=[P.end,P.bairro,cepFmt(P.cep),[P.cidade,P.uf].filter(Boolean).join("/")].filter(Boolean).join(", ");
  const p5=pg(`${tit("3.","DADOS DA UNIDADE CONSUMIDORA")}
   <p>Número da Conta Contrato: ${val("uc")}</p><p>Classe: ${val("classe")}</p><p>Nome do Titular da CC: ${esc(UP(P.nome))}</p><p>Endereço Completo: ${esc(UP(endC))}</p><p>&nbsp;</p>
   <p>Número de identificação do poste e/ou transformador mais próximo: ${esc(UP(P.poste||"SEM NUMERO"))}</p>
   <p>Coordenadas georrefenciadas em UTM: ${u?`${u.x}, ${u.y}`:""}</p>
   <div class="mfig">${fig}</div><div class="mcap2">Figura 1: Localização da unidade consumidora.</div>
   <p class="b">Nota 1: A planta de situação é obrigatória somente para solicitação de ligação nova, porém, é aconselhável o seu envio em todas as solicitações a fim de garantir a correta identificação da localização da unidade consumidora.</p>
   <p class="b">Nota 2: São aceitas imagens de fundo de mapas disponíveis na internet em substituição aos mapas desenhados pelo projetista, contanto que, a planta de situação possua todas as informações solicitadas na NT.00020.</p>
   ${tit("4.","LEVANTAMENTO DE CARGA")}
   <table class="mlc"><tr><th>ITEM</th><th>DESCRIÇÃO</th><th>P (W)<br>[A]</th><th>QUANT.<br>[B]</th><th>CI (kW)<br>[C = (A*B)/1000]</th><th>FP<br>[D]</th><th>CI (kVA)<br>[E = C/D]</th><th>FD<br>[F]</th><th>D(kW)<br>[G=CxF]</th><th>D(kVA)<br>[H = ExF]</th></tr>${rowsC}
   <tr><td colspan="2">TOTAL</td><td>${fmt(somaP,0)}</td><td></td><td>${fmt(somaC)}</td><td></td><td>${fmt(somaC)}</td><td></td><td>${fmt(somaC)}</td><td>${fmt(somaC)}</td></tr></table>`);
  // 6. padrão de entrada
  const p6=pg(`${tit("5.","PADRÃO DE ENTRADA")}<h4>5.1.&nbsp;&nbsp; Tipo de Ligação e Tensão de Atendimento</h4>
   <p>A unidade consumidora é ligada em ramal de ligação em baixa tensão, através de um circuito ${esc(lig)} à ${nPal(nf+1)} condutores, sendo ${nPal(nf)} condutor(es) FASE de seção nominal ${fmt(cab,0)}mm² e um condutor NEUTRO de seção nominal ${fmt(cab,0)}mm², com tensão de atendimento em ${vn} V, derivado de uma rede ${esc(UP(P.ramal||"Aéreo"))} de distribuição secundária da EQUATORIAL ENERGIA no estado de Goias.</p>
   <h4>5.2.&nbsp;&nbsp; Disjuntor de Entrada</h4><p>No ponto de entrega/conexão é instalado um disjuntor termomagnético, em conformidade com a norma NT.00001.EQTL.Normas e Padrões da Equatorial Energia, com as seguintes características:</p>
   ${tb([["NUMERO DE POLOS",nf],["TENSÃO NOMINAL",vn],["CORRENTE NOMINAL (A)",val("disj")],["FREQUÊNCIA NOMINAL (Hz)",60],["ELEMENTO DE PROTEÇÃO","TERMOMAGNÉTICO"],["CAPACIDADE MÁXIMA DE INTERRUPÇÃO","3 kA"],["CURVA DE ATUAÇÃO","C"]])}
   <h4>5.3.&nbsp;&nbsp; Potência Disponibilizada</h4><p>A potência disponibilizada para unidades consumidora onde será instalada a microGD é (será) igual à:</p>
   ${tb([["PD [kVA]","(Vn [V] X Idg [A] X NF)/1000"],["PD [kW]","PD [kVA] x FP"],["Vn",vn],["Idg",val("disj")],["NF",pd.nf===1?1:"1,73"],["FP","0,92"],["PD (kVA)",fmt(pd.kva)],["PD (kW)",fmt(pd.kw)]])}
   <div class="mnot">NOTA 4: A potência de geração deve ser menor ou igual a potência disponibilizada PD em kW.<br>NOTA 5: Vn é a tensão nominal entre fase e neutro para instalações monofásicas ou entre fases para bifásicas e trifásicas.<br>NOTA 6: NF é um fator referente ao número de fases, igual a 1 para sistemas monofásicos e bifásicos ou √3&nbsp; para sistemas trifásicos.</div>`);
  // 7. caixa de medição e ramal
  const dims=String(P.cxDim||"380mm X 500mm X 186,4mm").split(/\s*[xX×]\s*/).map(s=>s.trim());
  const caixa=`<svg viewBox="0 0 420 380" width="420" height="380" xmlns="http://www.w3.org/2000/svg" font-family="Arial">
    <path d="M120 40 L330 40 L350 60 L350 330 L140 330 L120 310 Z" fill="#e9ecef" stroke="#555" stroke-width="2"/>
    <path d="M120 40 L140 60 L350 60" fill="none" stroke="#777" stroke-width="2"/><line x1="140" y1="60" x2="140" y2="330" stroke="#777" stroke-width="2"/>
    <rect x="250" y="95" width="70" height="80" rx="10" fill="#9fb6d6" stroke="#456" stroke-width="2"/><rect x="200" y="215" width="34" height="28" fill="#cfd4da" stroke="#666"/><rect x="290" y="280" width="34" height="28" fill="#cfd4da" stroke="#666"/>
    <line x1="100" y1="40" x2="100" y2="310" stroke="#111"/><line x1="94" y1="40" x2="106" y2="40" stroke="#111"/><line x1="94" y1="310" x2="106" y2="310" stroke="#111"/><text x="90" y="180" font-size="15" text-anchor="end">${esc(dims[1]||"")}</text>
    <line x1="140" y1="350" x2="350" y2="350" stroke="#111"/><line x1="140" y1="344" x2="140" y2="356" stroke="#111"/><line x1="350" y1="344" x2="350" y2="356" stroke="#111"/><text x="245" y="372" font-size="15" text-anchor="middle">${esc(dims[0]||"")}</text>
    <line x1="112" y1="322" x2="134" y2="344" stroke="#111"/><text x="105" y="356" font-size="15" text-anchor="end">${esc(dims[2]||"")}</text></svg>`;
  const p7=pg(`<h4>5.4. Caixa de Medição</h4>
   <p class="l2">A caixa de medição ${nova?"a ser instalada":"existente"} ${esc(lig)} em material ${esc(UP(P.cxMat||"METAL"))} com as dimensões de ${esc(P.cxDim||"380mm X 500mm X 186,4mm")} (comprimento, altura e largura),&nbsp; instalada em ${esc(localCaixa())}, no ponto de entrega caracterizado como o limite da via pública com a propriedade, atendendo aos requisitos de localização, facilidade de acesso e layout,&nbsp; conforme a FIGURA 2</p>
   <div class="mfig2">${caixa}</div><div class="mcap2">Figura 2: Desenho dimensional detalhado da caixa de medição.</div>
   <p class="l2">O aterramento da caixa de medição é com 3 haste de aterramento de 2,4m de comprimento, 5/8" de diametro, condutor de 6mm² com conexão com grampo para aterramento</p>
   <h4>5.5.&nbsp;&nbsp; Ramal de Entrada</h4>
   <p class="l2">O ramal de entrada da unidade consumidora é alimentada através de um circuito ${esc(lig)} à ${nPal(nf+1)} condutores, tipo ${P.ramal==="Subterrâneo"?"CABO DE COBRE":"ALUMINIO "+["","DUPLEX","TRIPLEX","QUADRUPLEX"][nf]}, sendo ${nPal(nf)} condutor(es) FASE de diâmetro nominal ${fmt(cab,0)}mm² e um condutor NEUTRO de diâmetro nominal ${fmt(cab,0)}mm², em ${vn}V.</p>
   ${tit("6.","DIMENSIONAMENTO DO GERADOR")}`);
  // 8. gerador
  const dimM=n(P.mC)&&n(P.mL)?`${fmt(n(P.mC)*1000,0)} x ${fmt(n(P.mL)*1000,0)} mm`:"";
  const p8=pg(`<h4>6.1.&nbsp;&nbsp; Dimensionamento do gerador</h4>
   <p>O gerador é formado por ${c.qtd} modulos da marca ${esc(UP(P.mFab))}, modelo ${esc(UP(P.mMod))} e potência de ${fmt(n(P.mP),0)} W, totalizando uma potência total de ${fmt(c.pcc,2)} kWp${regInm("m")?`, com registro INMETRO nº ${esc(regInm("m"))}`:""}. As informações do gerador são mostrados na tabela a seguir:</p>
   <div class="mds"><div class="mdsh">Características Elétricas · ${esc(UP(P.mFab))} ${esc(UP(P.mMod))}</div>
   ${tg([["Condição de Teste","STC"],["Potência Máxima (Pmax)",fmt(n(P.mP),0)+" W"],["Voltagem de Potência Máxima (Vmp)",fmt(n(P.mVmp))+" V"],["Corrente de Potência Máxima (Imp)",fmt(n(P.mImp))+" A"],["Voltagem de Circuito Aberto (Voc)",fmt(n(P.mVoc))+" V"],["Corrente de Curto-Circuito (Isc)",fmt(n(P.mIsc))+" A"],["Eficiência do Módulo (%)",fmt(n(P.mEff),1)+" %"],["Coeficiente de temperatura (Voc)",fmt(n(P.mBeta),2)+" %/°C"],["Tipo de células",esc(P.mTipo||"")],["Número de células",fmt(n(P.mCel),0)],["Dimensões",dimM],["Peso",fmt(n(P.mPeso),1)+" kg"],["Quantidade",c.qtd],["Potência total",fmt(c.pcc,2)+" kWp"],["Registro INMETRO",esc(regInm("m"))]])}
   <div class="mdsn">*STC: Irradiância 1000W/m², Temperatura da Célula 25°C, Massa de Ar 1,5</div></div>`);
  // 9. inversor
  const p9=pg(`${tit("7.","DIMENSIONAMENTO DO INVERSOR")}
   <p>O sistema contém ${iq} inversor(es) da marca ${esc(UP(P.iFab))}, modelo ${esc(UP(P.iMod))} e potência pico ${kwTxt(n(P.iP))} kW${regInm("i")?`, com registro INMETRO nº ${esc(regInm("i"))}`:""}. Na tabela a seguir são mostradas as informações a respeito do inversor:</p>
   <div class="mds"><div class="mdsh">Model · ${esc(UP(P.iMod))}</div>
   ${tg([["Input Side"],["Max. DC Input Voltage (V)",fmt(n(P.iVmax),0)],["MPPT Operating Range (V)",`${fmt(n(P.iMin),0)}~${fmt(n(P.iMax),0)}`],["Max. DC Input Current (A)",fmt(n(P.iImax),1)],["Max. DC Short-Circuit Current (A)",fmt(n(P.iIsc),1)],["Number of MPPT",fmt(n(P.iNmppt),0)],["Output Side"],["Rated Output Power (kW)",kwTxt(n(P.iP))],["Rated AC Grid Voltage (V)",P.iFases.startsWith("Trif")?"380/220":"220"],["Rated AC Grid Frequency (Hz)","60"],["Operating Phase",P.iFases.startsWith("Trif")?"Three phase":"Single phase"],["Max. AC Output Current (A)",fmt(c.iout,1)],["Output Power Factor",fmt(n(P.iFp)||1,2)],["Grid Current THD (%)","&lt;"+fmt(n(P.iDht)||3,0)],["Efficiency"],["Max. Efficiency (%)",fmt(n(P.iEff),1)],["Protection"],["Anti-islanding Protection","Yes"],["AC Output Overvoltage / Overcurrent Protection","Yes"],["Ingress Protection",esc(P.iIP||"")],["Dimensions",esc(P.iDim||"")],["Weight (kg)",fmt(n(P.iPeso),1)],["Registro INMETRO",esc(regInm("i"))]])}</div>
   ${tit("8.","DIMENSIONAMENTO DA PROTEÇÃO")}<h4>8.1.&nbsp;&nbsp; Fusíveis</h4>
   <p>${c.fusivel?`Serão instalados fusíveis de ${c.fusivel} A nos polos positivo e negativo de cada string.`:"Sistema não necessita de fusíveis."}</p>`);
  // 10. disjuntores, DPS, aterramento e requisitos (início)
  const it=invTab();
  const PROT=[["Proteção de subtensão (27)","SIM"],["Proteção de sobretensão (59)","SIM"],["Proteção de subfrequência (81U)","SIM"],["Proteção de sobrefrequência (81O)","SIM"],["Proteção contra desequilíbrio de corrente (46)","SIM"],["Proteção contra reversão e desbalanço de tensão (47)","SIM"],["Proteção de sobrecorrente (50/51 e 50N/51N)","SIM"],["Proteção contra perda de rede (proteção anti-ilhamento)","SIM"],["Check de sincronismo (25)","SIM"],["Tempo de reconexão – temporizador (62)","SIM"],["Proteção de Sobrecorrente com restrição de tensão (51V)","NÃO"],["Proteção de Sobrecorrente direcional (67-67N)","NÃO"],["Proteção direcional de potência (32)","SIM"],["Proteção contra falha de disjuntor (50BF)","NÃO"],["Proteção LINHA VIVA / BARRA MORTA","NÃO"]];
  const tprot=rows=>`<table class="mpr">${rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  const p10=pg(`<h4>8.2.&nbsp;&nbsp; Disjuntores</h4><p>Na tabela abaixo é descrito o disjuntor geral a ser instalado para o sistema de geração de energia solar:</p>
   ${tb([["NUMERO DE POLOS",it.polos],["TENSÃO NOMINAL",it.v],["CORRENTE NOMINAL (A)",c.disjCA],["FREQUÊNCIA NOMINAL (Hz)",60],["ELEMENTO DE PROTEÇÃO","TERMOMAGNÉTICO"],["CAPACIDADE MÁXIMA DE INTERRUPÇÃO","3 kA"],["CURVA DE ATUAÇÃO","C"]])}
   <h4>8.3.&nbsp;&nbsp; DPS</h4><p>Na tabela abaixo é descrito o DPS a ser instalado para o sistema de geração de energia solar:</p>
   ${tg([["Tipo CC ou CA:","CA"],["Classe:","CLASSE 2"],["Tensão CC ou CA [V]:","275V"],["Corrente nominal [kA]:","20kA"],["Corrente máxima [kA]:","40kA"]])}
   <h4>8.4.&nbsp;&nbsp; Aterramento</h4><p>Na tabela abaixo é descrito o sistema de aterramento a ser instalado para o sistema de geração de energia solar:</p>
   ${tg([["Geometria da malha:","HASTE ÚNICA"],["Descrição das hastes de aterramento:",`2,4m de comprimento, 5/8" de diametro`],["Quantidade de hastes:","3"],["Cabo de aterramento:","6"],["Valor da resistência de aterramento:","10 Ohms"],["Descrição do barramento de terra:","Barramento de cobre 80A"]])}
   <h4>8.5.&nbsp;&nbsp; Requisitos de Proteção</h4><div class="mcap2">Tabela 5 – Características técnicas do gerador</div>
   <table class="mpr"><tr><th>REQUISITOS DE PROTEÇÃO</th><th>INDICAR SE POSSUI</th></tr>${PROT.slice(0,3).map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`);
  // 11. requisitos (fim), cabos e placa
  const ampCA=(CAB.find(([s])=>s===c.cabCA)||[0,""])[1];
  const p11=pg(`${tprot(PROT.slice(3))}
   ${tit("9.","DIMENSIONAMENTO DOS CABOS")}<p>Dimensionar e descrever as características técnicas dos cabos CA e CC, informando no mínimo as seguintes características:</p>
   ${tg([["CABEAMENTO AC"],["Isolação:","PVC"],["Tensão de isolamento:","750V"],["Bitola [mm2]:",fmt(c.cabCA,c.cabCA%1?1:0)],["Capacidade de condução de corrente:",ampCA],["CABEAMENTO CC"],["Isolação:","HEPR"],["Tensão de isolamento:","1,8 Kv"],["Bitola [mm2]:",fmt(c.cabCC,0)+"mm"],["Capacidade de condução de corrente:",(AMP_CC[c.cabCC]||"")+"A"]])}
   ${tit("10.","PLACA DE ADVERTÊNCIA")}<p>A placa de advertência será instalada proxima ao padrão de entrada com as seguintes caracteristicas:</p>
   <ul class="mlst"><li>Espessura: 2 mm;</li><li>Material: Policarbonato com aditivos anti-raios UV (ultravioleta);</li><li>Gravação: As letras devem ser em Arial Black;</li><li>Acabamento: Deve possuir cor amarela, obtida por processo de masterização com 2%, assegurando opacidade que permita adequada visualização das marcações pintadas na superfície da placa;</li></ul>`);
  // 12. figura da placa, anexos e assinatura
  const placa=`<svg viewBox="0 0 300 200" width="300" height="200" xmlns="http://www.w3.org/2000/svg" font-family="Arial Black,Arial">
    <line x1="40" y1="14" x2="240" y2="14" stroke="#111"/><line x1="40" y1="8" x2="40" y2="20" stroke="#111"/><line x1="240" y1="8" x2="240" y2="20" stroke="#111"/><text x="140" y="10" font-size="9" text-anchor="middle" font-family="Arial">25 cm</text>
    <line x1="256" y1="30" x2="256" y2="174" stroke="#111"/><line x1="250" y1="30" x2="262" y2="30" stroke="#111"/><line x1="250" y1="174" x2="262" y2="174" stroke="#111"/><text x="266" y="104" font-size="9" font-family="Arial">18 cm</text>
    ${U.placaA(40,30,200)}</svg>`;
  const ANX=["Formulário de Solicitação de Orçamento.","Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente.","Diagrama unifilar contemplando, geração, inversor (se houver), cargas, proteção e medição.","Diagrama de blocos contemplando geração, inversor (se houver), cargas, proteção e medição.","Relatório de ensaio, em língua portuguesa, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão com a rede, sempre que houver a utilização de conversores ou registro INMETRO.","Dados de registro.","Lista de rateio dos créditos (Se houver)","Cópia de instrumento jurídico de solidariedade (Se houver).","Para cogeração documento que comprove o reconhecimento pela ANEEL (Se houver)."];
  const p12=pg(`<div class="mfig2" style="margin-top:20px">${placa}</div><div class="mcap2">Figura 3: Placa de advertência.</div>
   ${tit("11.","ANEXOS")}<ul class="mlst">${ANX.map(a=>`<li>${a}</li>`).join("")}</ul>${assin}`);
  const pags=[p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12];
  if(c.benef.length){
    const tot=c.benef.reduce((a,r)=>a+n(r[3]),0);
    pags.push(pg(`${tit("","ANEXO – LISTA DE RATEIO DOS CRÉDITOS")}<p>Modalidade de compensação: ${esc(mod)}. Os excedentes de energia gerados na unidade consumidora ${val("uc")} serão rateados entre as unidades consumidoras abaixo, conforme os percentuais indicados, calculados proporcionalmente ao consumo médio mensal de cada unidade:</p>
     <table class="mlc" style="font-size:9px"><tr><th>ITEM</th><th>CONTA CONTRATO (UC)</th><th>TITULAR</th><th>ENDEREÇO</th><th>CONSUMO MÉDIO (kWh/mês)</th><th>PERCENTUAL (%)</th></tr>
     ${c.benef.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r[0])}</td><td>${esc(UP(r[1]||""))}</td><td>${esc(UP(r[2]||""))}</td><td>${r[4]?fmt(n(r[4]),0):""}</td><td>${fmt(n(r[3]))}</td></tr>`).join("")}
     <tr><td colspan="4">TOTAL</td><td>${fmt(c.benef.reduce((a,r)=>a+n(r[4]),0),0)}</td><td>${fmt(tot)}</td></tr></table>${assin}`));
  }
  return pags;
}

// Formulário ANEXO I (NT.00020.EQTL, REV 06 de 04/11/2025) – Microgeração distribuída Grupo B
function docForm(c){
  const pd=pdEq(),pdKw=pd.kw,carga=cargaInst(),u=utm(n(P.lat),n(P.lon)),mod=UP(P.modalidade||"Autoconsumo local"),t=P.tipoSolic||"";
  const L=(s)=>`<div class="al">${s}</div>`,V=(s,cls="")=>`<div class="av ${cls}">${s??""}</div>`,SEL=`<span class="ar">(selecionar)</span>`;
  const tel=esc(P.tel||P.rtTel||""),mail=esc(P.email||P.rtEmail||"");
  const tipoTxt=t.includes("nova")?"LIGAÇÃO NOVA DE UNIDADE CONSUMIDORA COM GD":t.includes("com aumento")?"CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA (ver item abaixo)":"CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA (ver item abaixo)";
  const dIni=(()=>{const d=P.dataDoc?new Date(P.dataDoc+"T12:00:00"):new Date();d.setDate(d.getDate()+20);return d.toLocaleDateString("pt-BR")})();
  const okC=carga<=pdKw,okG=c.pca<=pdKw;
  const logo=`<div class="alogo">equatorial</div>`;
  const DOCS4=[["1. Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021.",""],["2. Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, que identifique o número do registro válido e o nome do responsável técnico, o local da obra ou serviço e as atividades profissionais desenvolvidas, caso seja exigível na legislação específica e na forma prevista nessa legislação",""],["3. Indicação do local do padrão ou da subestação de entrada no imóvel, exclusivamente nos casos em que ainda não estiverem instalados",""],["4. Diagrama unifilar e de blocos do sistema de geração, carga e proteção",""],["5. Memorial Técnico Descritivo da instalação (Conforme Modelo do ANEXO III - MODELO DE MEMORIAL TÉCNICO DESCRITIVO)",""],["6. Relatório de ensaio, em língua portuguesa, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão com a rede, sempre que houver a utilização de conversores.",""],["7. Dados necessários ao registro da central geradora distribuída conforme disponível no site da ANEEL.",""],["8. Lista de unidades consumidoras participantes do sistema de compensação (se houver), indicando o percentual ou a ordem de utilização dos excedentes(Opcional). (PLANILHA NA GUIA 2)","Para autoconsumo remoto, geração compartilhada e empreendimento de múltiplas unidades consumidoras"],["9. Cópia de instrumento jurídico que comprove a participação dos integrantes para os casos de múltiplas unidades consumidoras e geração compartilhada. (Caso aplicável)","Apenas para os casos de empreendimentos com múltiplas unidades consumidoras e geração compartilhada."],["10. Documento que comprove o reconhecimento pela ANEEL, da cogeração qualificada (se houver)","Apenas para cogeração qualificada"],["11. Dados de segurança das barragens no caso do uso de sistemas com fontes hídricas, conforme Resolução Normativa nº 696/2015. (Caso aplicável)",""],["12. Para centrais fotovoltaicas enquadradas como despacháveis, comprovação de que o sistema de armazenamento atende o disposto no art. 655-B da Resolução Normativa nº 1.000/2021. (Caso aplicável)",""],["13. Documento com data que comprove a propriedade ou posse do imóvel onde será implantada a unidade consumidora com microgeração ou minigeração distribuída, e que, no caso de unidade flutuante, deve ser complementado por autorização, licença ou documento equivalente exigível pelas autoridades competentes para a instalação flutuante, observada a possibilidade de dispensa prevista no §5º do art. 67 da Resolução Normativa nº 1.000/2021.","Apenas nos casos de Ligação Nova de UC com Microgeração ou Alteração da Potência Disponibilizada de UC Existente"],["14. Formulário de Troca de Padrão ( de monofásico para bifásico ou trifásico, de bifásico para trifásico, de trifásico para bifásico ou monofásico, de bifásico para monofásico) (Conforme ANEXO IV - FORMULÁRIO DE TROCA DE PADRÃO)","Apenas no caso de unidade consumidora existente com alteração de potência disponibilizada que implique em troca de padrão"],["15. Autorização de uso de área comum em condomínio (quando necessário, conforme observação)","Quando uma UC individualmente construir uma central geradora utilizando a área comum do condomínio"],["16. Procuração Autenticada (quando necesário, conforme observação)","Quando a solicitação for feita por terceiros"],["17. Apresentação de licença ou declaração emitida pelo órgão competente caso as instalações ou a extensão de rede de responsabilidade do consumidor e demais usuários ocuparem áreas protegidas pela legislação, tais como unidades de conservação, reservas legais, áreas de preservação permanente, territórios indígenas e quilombolas. (Caso aplicável)",""]];
  const p1=`<div class="sheet ax"><div class="afr">
   <div class="ahd">${logo}<div><b>NT.00020.EQTL.Normas e Qualidade</b><br><b>ANEXO I - Formulário de Solicitação de Orçamento de Microgeração Distribuída Grupo B</b></div></div>
   <div class="as">1. Identificação e Dados Cadastrais da Unidade Consumidora - <span class="ar">PREENCHER, OBRIGATORIAMENTE, TODOS OS CAMPOS NA COR VERMELHA</span></div>
   <div class="ag" style="grid-template-columns:3fr 1.2fr"><div>${L("Nome do Cliente / Razão Social (Titular da Unidade Consumidora)")}${V(esc(UP(P.nome)))}</div><div>${L("CPF/CNPJ","c")}${V(val("doc"),"c")}</div></div>
   <div class="ag" style="grid-template-columns:3fr 2.2fr"><div>${L("Endereço")}${V(esc(UP([P.end,P.bairro].filter(Boolean).join(" - "))))}</div><div>${L("Contatos telefônicos")}<div class="arow"><span class="al2">Celular</span>${V(tel,"c")}<span class="al2">Fixo</span>${V(tel,"c")}</div></div></div>
   <div class="arow"><span class="al">CEP:</span>${V(cepFmt(P.cep),"c w1")}<span class="al">Município</span>${V(esc(UP(SEMAC(P.cidade))),"c w2")}<span class="al">UF ${SEL}</span>${V("<b>"+val("uf")+"</b>","c w0")}<span class="al">E-mail</span>${V(`<u>${mail}</u>`,"f")}</div>
   <div class="arow"><span class="al w3">Tipo de orçamento desejado</span>${V("<b>Orçamento de Conexão</b>","c f")}<span class="al">Conta Contrato (Se UC existente)</span>${V(val("uc"),"c w2")}</div>
   <div class="arow"><span class="al w3">Tipo de Solicitação ${SEL}</span>${V("<b>"+tipoTxt+"</b>","c f")}</div>
   <div class="arow"><span class="w3"></span>${V(`<b>${t.includes("nova")?"ANEXAR A PLANTA DE SITUAÇÃO":"INFORMAR O NÚMERO DA CONTA CONTRATO"}</b>`,"c w4")}</div>
   <div class="arow"><span class="al w3">Tarifa Branca?</span>${V("<b>NÃO</b>","w0")}<span class="f"></span><span class="al">Terá adição de módulos em inversor existente?</span>${V("","w0")}</div>
   <div class="arow"><span class="al w3">Possui Cargas Especiais?</span>${V("<b>NÃO</b>","w0")}<span class="al">Detalhar - Cargas especiais</span>${V("","f")}</div>
   <div class="arow"><span class="al w3">Ramo de Atividade (Descrição)</span>${V("<b>"+val("classe")+"</b>","c f")}</div>
   <div class="arow"><span class="al w3">Classe ${SEL}</span>${V("<b>"+val("classe")+"</b>","c w2")}<span class="al">Tipo de Ligação ${SEL}</span>${V("<b>"+esc(UP(P.ligacao))+"</b>","c w1")}<span class="al">Tensão de Atendimento da UC</span>${V(`<b>${vnUC()}</b>&nbsp;&nbsp; V`,"c w1")}</div>
   <div class="arow"><span class="al w3">Carga Declarada da UC</span>${V(`<b>${fmt(carga)}</b>&nbsp; kW`,"c w1")}<span class="al">Disjuntor de Entrada da UC ${SEL}</span>${V(`<b>${val("disj")}</b>&nbsp;&nbsp; A`,"c w1")}<span class="al">Potência Disponibilizada (PD) para a UC</span>${V(`<b>${fmt(pdKw)}</b>&nbsp; kW`,"c w1")}</div>
   <div class="arow"><span class="aok ${okC?"":"no"}">${okC?"OK: Carga Declarada ≤ Potência Disponibilizada":"Carga Declarada &gt; Potência Disponibilizada"}</span><span class="al">Tipo de Ramal ${SEL}</span>${V("<b>"+esc(SEMAC(UP(P.ramal||"Aéreo")))+"</b>","c w1")}<span class="al">Nº de identificação do poste ou transformador mais próximo</span>${V(esc(UP(P.poste||"SEM NUMERO")),"c w1")}</div>
   <div class="arow"><span class="al f">Preencher as coordenadas do ponto de entrega do acessante em UTM Fuso 22, 23 ou Coordenadas Decimais</span>${V(u?u.fuso:"","c w0")}<span class="al2">X =</span>${V(u?"<b>"+u.x+"</b>":"","c w2")}<span class="al2">Y =</span>${V(u?"<b>"+u.y+"</b>":"","c w2")}</div>
   <div class="ag" style="grid-template-columns:2.2fr 1fr 1fr"><div>${L("Nome do Responsável Legal")}${V(esc(UP(P.nome)),"c")}</div><div>${L("Telefone do Responsável Legal")}${V(tel,"c")}</div><div>${L("E-mail do Responsável Legal")}${V(mail,"c")}</div></div>
   <div class="as">2. Dados Cadastrais do Responsável Técnico</div>
   <div class="ag" style="grid-template-columns:1.6fr 1.3fr 1.3fr"><div>${L("Nome Completo")}${V(esc(UP(P.rtNome)),"c")}</div><div>${L("Titulo Profissional")}${V(esc(titRT()),"c")}</div><div>${L("Registro Profissional")}<div class="arow"><span class="al2">Nº</span>${V(esc(regRT()),"c f")}<span class="al2">UF</span>${V(esc(ufRT()),"c w0")}</div></div></div>
   <div class="ag" style="grid-template-columns:1.6fr 1fr 1fr 1fr"><div>${L("E-mail")}${V(`<u>${esc(P.rtEmail||"")}</u>`)}</div><div>${L("Telefone Fixo")}${V(val("rtTel"),"c")}</div><div>${L("Telefone Celular")}${V(val("rtTel"),"c")}</div><div>${L("Empresa (opcional)")}${V(esc(UP(P.rtEmp||"")),"c")}</div></div>
   <div class="as">3. Características da Microgeração Distribuída<br><span style="font-weight:700">Dados Gerais da Central Geradora</span></div>
   <div class="arow"><span class="al w3">Tipo de Fonte Primária ${SEL}</span>${V("SOLAR FOTOVOLTAICA","c w4")}<span class="al">Especificar se necessário</span>${V("","f")}</div>
   <div class="arow"><span class="al w3">Tipo de Geração ${SEL}</span>${V("EMPREGANDO CONVERSOR ELETRÔNICO/INVERSOR","c w4")}<span class="al">Especificar se necessário</span>${V("","f")}</div>
   <div class="arow"><span class="al w3">Modalidade de Compensação ${SEL}</span>${V("<b>"+esc(mod)+"</b>","c f")}<span class="al">Potência Geração do Orçamento</span>${V(`<b>${fmt(c.pca)}</b>`,"c w1")}<span class="al2"><b>kW</b></span></div>
   <div class="arow">${V(`<b>${P.modalidade==="Autoconsumo local"?"NÃO É NECESSÁRIO PREENCHER A LISTA DE RATEIO":"PREENCHER A LISTA DE RATEIO (GUIA 2)"}</b>`,"c f nb")}<span class="al">Potência Geração Total da UC(PGT)</span>${V(`<b>${fmt(c.pca)}</b>`,"c w1")}<span class="al2"><b>kW</b></span></div>
   <div class="arow"><span class="al">Armazenamento (se houver)</span>${V("","f")}<span class="al">Potência Máxima Injetável (se aplicável)</span>${V("","c w1")}<span class="al2"><b>kW</b></span></div>
   <div class="arow"><span class="f"></span><span class="al">Data Início de Operação</span>${V("<b>"+dIni+"</b>","c w1")}<span class="aok ${okG?"":"no"} w2">${okG?"OK: PGT ≤ PD":"PGT &gt; PD"}</span></div>
   <div class="as">4. Documentos necessários que devem ser anexados à Solicitação de Orçamento de Conexão:</div>
   <table class="at"><tr><th>Descrição</th><th style="width:30%">Observações</th></tr>${DOCS4.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>
   <div class="as">5. Documentos necessários que devem ser anexados à Solicitação de Orçamento Estimado:</div>
   <table class="at"><tr><td>Para solicitar orçamento estimado é necessário preencher apenas os dados básicos da unidade consumidora, a tensão de atendimento e indicação da potência de geração no campo que surgirá ao lado do tipo de orçamento.</td></tr><tr><td>Caso o orçamento estimado seja solicitado para uma localização onde ainda não exista unidade consumidora, é necessário anexar à solicitação planta de situação conforme modelo da norma NT.00020.EQTL.</td></tr><tr><td>Devem ser enviados também documentos de identificação do consumidor e, caso existam, procurações e documentações dos representantes legais, conforme Tabela 3 da norma NT.00020.EQTL.</td></tr></table>
  </div></div>`;
  const D6=[["Solicito que a contagem do prazo para realização da vistoria pela CONCESSIONÁRIA, conforme art. 68 da Resolução Normativa nº 1.000/2021, inicie-se somente após minha solicitação.","SIM"],["Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade.","SIM"],["Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da Associação Brasileira de Normas Técnica - ABNT e às normas dos órgãos oficiais competentes, e ao art. 8º da Lei nº 9.074, de 1995, naquilo que for aplicável.","SIM"],["Solicito dispensa da análise de inversão de fluxo por enquadramento no art. 73-A da REN 1000, na seguinte regra:",null],["&nbsp;&nbsp;&nbsp;&nbsp;Não injeção na rede de distribuição de energia elétrica (“Grid Zero”)","NÃO"],["&nbsp;&nbsp;&nbsp;&nbsp;Enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência de geração compatível com o consumo no horário de geração","NÃO"],["&nbsp;&nbsp;&nbsp;&nbsp;Modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW, observado o item 7 (\"Fast Track\")","NÃO"],["Declaro, para todos os fins, que todas as informações prestadas neste documento são verdadeiras.","SIM"]];
  const rodape=`<div class="aft">GERÊNCIA CORPORATIVA DE NORMAS E QUALIDADE. NT.00020.EQTL Normas e Qualidade ANEXO I - FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE MICROGERAÇÃO DISTRIBUÍDA GRUPO B REVISÃO 06. DATA: 04/11/2025.</div>`;
  const p2=`<div class="sheet ax"><div class="afr">
   <div class="as">6. Solicitações e Declarações</div>
   <table class="at">${D6.map(([a,b])=>b===null?`<tr><td colspan="2" class="gr">${a}</td></tr>`:`<tr><td>${a}</td><td class="c" style="width:42px">${b}</td></tr>`).join("")}</table>
   <div class="as">7. Termo de Aceite das condições para afastamento da análise de inversão de fluxo (Opcional)</div>
   <div class="abx">Solicito o afastamento da análise de inversão de fluxo, nos termos do inciso III do caput do art. 73-A da Resolução Normativa nº 1.000/2021, e declaro estar ciente de que:<br>1) a unidade consumidora será enquadrada na modalidade autoconsumo local;<br>2) fica vedada, em qualquer hipótese, a alocação ou realocação de excedentes ou de créditos de energia em unidade consumidora distinta de onde ocorreu a geração de energia elétrica, afastando-se as disposições de que trata o art. 655-M da Resolução Normativa nº 1.000/2021; e<br>3) para alteração de enquadramento da modalidade da microgeração deverá ser encerrado o contrato e solicitado novo orçamento de conexão, vedada a aplicação do art. 655-M.<br>Declaro também reconhecer que essa opção é irrevogável e irretratável, implicando no meu dever de observar o que estabelece o art. 73-A da referida Resolução.<br><br><br>Local e Data:<br><br><br><br>Assinatura:<br><br></div>
   <div class="as">8. Este formulário deve ser preenchido e encaminhado aos canais de atendimento Corporativo da Concessionária</div>
   <div class="ag" style="grid-template-columns:1fr 1fr;border:1px solid #111"><div class="abx" style="border:0;border-right:1px solid #111"><b>ALAGOAS</b> - Sede de regionais (Maceio,Arapiraca, Matriz de Camaragibe e Santana do Ipanema)<br><b>AMAPÁ</b> - Sede de regionais (Macapá)<br><b>GOIÁS</b> - Sede de regionais (Goiânia, Luziânia, Anápolis, Rio Verde e Iporá)<br><b>MARANHÃO</b> - Sede de regionais (São Luís, Imperatriz, Timon, Balsas e Bacabal)<br><b>PARÁ</b> - Sede de regionais (Belém, Castanhal, Marabá, Santarém e Altamira)<br><b>PIAUÍ</b> - Sede de regionais (Teresina, Parnaíba, Picos, Bom Jesus e Floriano)<br><b>RIO GRANDE DO SUL</b> - Sede de regionais (Porto Alegre, Osório e Pelotas)<br><br>Em caso de dúvidas entrar em contato com os canais de atendimento disponibilizados na norma <b>NT.00020.EQTL.Normas e Qualidade</b>.</div>
   <div class="abx" style="border:0;position:relative;min-height:150px">Eu, acessante identificado neste formulário, venho por meio deste instrumento, solicitar o acesso para microgeração distribuída, fornecendo meus dados cadastrais assim como as documentos necessários, em conformidade com as normas e resoluções aplicáveis.
   <div class="asg"><div><span>${esc(cidRT())}</span>Local</div><div><span>${dataBR()}</span>Data</div><div><span>${imgAssin("height:40px;margin-top:-30px;margin-bottom:-8px")}</span>Assinatura do Responsável</div></div></div></div>
  </div>${rodape}</div>`;
  const pe=x=>`<td class="pe">${x??""}</td>`,cz=x=>`<td class="cz">${x??""}</td>`;
  const solar=Array.from({length:10},(_,i)=>i===0?`<tr><td>1</td>${pe(fmt(n(P.mP),0))}${pe(c.qtd)}${pe(fmt(c.pcc,2))}${pe(fmt(c.area))}${pe(esc(UP(P.mFab)))}${pe(esc(UP(P.mMod)))}</tr>`:`<tr><td>${i+1}</td>${pe()}${pe()}${pe(0)}${pe()}${pe()}${pe()}</tr>`).join("");
  const iq=Math.max(1,n(P.iQ)),vInv=P.iFases.startsWith("Trif")?380:220,inom=Math.round(n(P.iIout)||c.iout);
  const invs=Array.from({length:30},(_,i)=>i<iq?`<tr><td>${i+1}</td>${pe(esc(UP(P.iFab)))}${pe(esc(UP(P.iMod)))}${pe(fmt(n(P.iP)))}${pe(vInv)}${pe(inom)}${pe(fmt(n(P.iFp)||1,n(P.iFp)%1?2:0))}${pe(fmt(n(P.iEff),1))}${pe("&lt; "+fmt(n(P.iDht)||3,0))}</tr>`:`<tr><td>${i+1}</td>${pe()}${pe()}${pe()}${pe()}${pe()}${pe()}${pe()}${pe()}</tr>`).join("");
  const p3=`<div class="sheet ax ug"><div class="afr">
   <div class="as">Informações das Unidades Geradoras (UG): <span class="ar">( PREENCHER CONFORME O TIPO DE FONTE DE GERAÇÃO )</span></div>
   <div class="ah">1. Solar Fotovoltaica</div>
   <table class="ut"><tr><th>Item</th><th>Potência do Módulo (W)</th><th>Quantidade</th><th>Potência de Pico (kWp):</th><th>Área do arranjo (m²):</th><th>Fabricante(s) dos Módulos</th><th>Modelo</th></tr>${solar}
   <tr><th>TOTAL</th>${cz()}<td><b>${c.qtd}</b></td><td><b>${fmt(c.pcc)}</b></td><td><b>${fmt(c.area)}</b></td>${cz()}${cz()}</tr></table>
   <div class="aob">Obs: Célula fotovoltaica é a unidade básica, módulo é o conjunto de células e arranjo é o agrupamento de módulos, o gerador</div>
   <div class="ah">2. Dados dos Inversores</div>
   <table class="ut"><tr><th>Item</th><th>Fabricante*</th><th>Modelo*</th><th>Potência Nominal (kW)</th><th>Faixa de tensão de operação (V)</th><th>Corrente Nominal (A)</th><th>Fator de Potência</th><th>Rendimento (%)</th><th>DHT de Corrente (%)</th></tr>${invs}
   <tr><th>TOTAL</th>${cz()}${cz()}<td><b>${fmt(c.pca)}</b></td>${cz()}${cz()}${cz()}${cz()}${cz()}</tr></table>
   <div class="aob">Obs: Unidades Geradoras Fotovoltaiscas e Eólicas</div>
   <div class="ah">3. Eólica</div>
   <table class="ut"><tr><th rowspan="2">Item</th><th rowspan="2">Fabricante/Modelo</th><th rowspan="2">Eixo do rotor (horizontal/ vertical)*</th><th rowspan="2">Altura Máxima da Pá (m)*</th><th rowspan="2">Diâmetro do rotor (m)</th><th rowspan="2">Controle de Potência <sup>(1)</sup></th><th rowspan="2">Velocidade de rotação nominal / Sobrevelocidade de máxima (rpm)</th><th colspan="2">Velocidade do vento (m/s)</th><th colspan="2">Potência Gerada (kW)</th><th rowspan="2">Momento de Inércia da Massa Girante MD2/4 (kg.m2)</th><th rowspan="2">Documento de certificação da turbina <sup>(2)</sup></th></tr><tr><th>Entrada em serviço (cut-in)</th><th>Saída de seviço (cut-out)</th><th>Entrada em serviço (cut-in)</th><th>Saída de seviço (cut-out)</th></tr>
   ${Array.from({length:10},(_,i)=>`<tr><td>${i+1}</td>${pe().repeat(12)}</tr>`).join("")}<tr><th>TOTAL</th>${cz().repeat(8)}<td><b>0,00</b></td><td><b>0</b></td>${cz().repeat(2)}</tr></table>
   <div class="aob">Obs: No caso de aerogerador não convencional informar a altura máxima atingida pela estrutura.<br><sup>(1)</sup> Passo variável(Stall), Estol(pitch), Estol ativo (active stall), etc.<br><sup>(2)</sup> Data</div>
   <div class="ah">4. Hidráulica</div>
   <table class="ut"><tr><th>Item</th><th>Rio</th><th>Bacia / SubBacia</th><th>Tipo turbina</th><th>Fabricante Turbina</th><th>Potência Turbina (kVA)</th><th>Fabricante Gerador</th><th>Potência do Gerador (kVA)</th><th>Fator de Potência do Gerador</th><th>Potência do Gerador (kW)</th></tr>
   ${[1,2,3].map(i=>`<tr><td>${i}</td>${pe().repeat(8)}<td>0,00</td></tr>`).join("")}<tr><th>TOTAL</th>${cz().repeat(4)}<td><b>0</b></td>${cz()}<td><b>0</b></td>${cz()}<td><b>0,00</b></td></tr></table>
  </div></div>`;
  const TER=[["Fabricante das Turbinas*",""],["Tipo de Turbina* <sup>(1)</sup>",""],["Fabricante/Modelo do Gerador",""],["Potência Nominal de Placa","kVA"],["Potência Máxima em Regime Contínuo","kW","0,00"],["Corrente Nominal","A"],["Tensão Nominal","kV"],["Frequência Nominal","Hz"],["Velocidade Nominal","rpm"],["Número de fases",""],["Tipo e Ligação <sup>(2)</sup>",""],["Número de pólos",""],["Fator de Potência Máximo* <sup>(3)</sup>",""]];
  const p4=`<div class="sheet ax ug"><div class="afr">
   <div class="ah">5. Térmica (Biomassa/Solar Térmica/Cogeração)</div>
   <table class="ut"><tr><th style="width:30%">Informação</th><th>Especificação</th><th>Unidade</th><th>Periodicidade</th><th>Observação</th></tr>${TER.map(([a,u,v])=>`<tr><td style="text-align:left">${a}</td>${pe(v||"")}<td>${u}</td><td></td><td></td></tr>`).join("")}</table>
   <div class="aob"><sup>(1)</sup> G/V/O<br><sup>(2)</sup> Y ou Δ<br><sup>(3)</sup> Sobre-excitado ou Sub-excitado</div>
  </div></div>`;
  const ben=c.benef.length?[`<div class="sheet">${hdr("Guia 2 · Lista de unidades consumidoras participantes","Rateio dos créditos de energia · REN ANEEL 1.000/2021")}
  <table><tr><th>#</th><th>Nº da UC</th><th>Titular</th><th>Endereço</th><th>%</th></tr>${[["Geradora",P.uc,P.nome,P.end,""]].concat(c.benef).map((r,i)=>`<tr><td>${i?i:"G"}</td><td class="v">${esc(r[0]==="Geradora"?P.uc:r[0])}</td><td class="v">${esc(r[1])}</td><td class="v">${esc(r[2])}</td><td class="v">${esc(r[3])}</td></tr>`).join("")}</table></div>`]:[];
  return [p1,p2,p3,p4,...ben];
}

/* ---- elementos de desenho (SVG) ---- */
const S={
 line:(x1,y1,x2,y2,w=1.6,d="")=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="${w}" ${d?`stroke-dasharray="${d}"`:""}/>`,
 rect:(x,y,w,h,f="none",sw=1.4,d="")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" stroke="#111" stroke-width="${sw}" ${d?`stroke-dasharray="${d}"`:""}/>`,
 t:(x,y,s,o={})=>`<text x="${x}" y="${y}" font-size="${o.fs||10}" ${o.a?`text-anchor="${o.a}"`:""} ${o.b?'font-weight="700"':""} fill="${o.c||"#111"}" ${o.r?`transform="rotate(${o.r} ${x} ${y})"`:""}>${s}</text>`,
 lines:(x,y,arr,o={})=>arr.map((s,i)=>S.t(x,y+i*(o.lh||12),s,o)).join(""),
 gnd:(x,y)=>S.line(x,y,x,y+10)+S.line(x-9,y+10,x+9,y+10)+S.line(x-6,y+14,x+6,y+14)+S.line(x-3,y+18,x+3,y+18),
 brk:(x,y,lbl)=>/* vertical breaker on wire going down */ `${S.line(x,y,x,y+12)}<circle cx="${x}" cy="${y+12}" r="2" fill="#111"/>${S.line(x,y+12,x+11,y+32)}${S.line(x,y+34,x,y+48)}<circle cx="${x}" cy="${y+34}" r="2" fill="#111"/>${S.line(x-4,y+18,x+4,y+26)}${S.line(x+4,y+18,x-4,y+26)}`,
 hbrk:(x,y)=>/* horizontal breaker from x to x+48 */ `${S.line(x,y,x+12,y)}<circle cx="${x+12}" cy="${y}" r="2" fill="#111"/>${S.line(x+12,y,x+32,y-11)}<circle cx="${x+34}" cy="${y}" r="2" fill="#111"/>${S.line(x+34,y,x+48,y)}${S.line(x+17,y-4,x+25,y+4)}${S.line(x+25,y-4,x+17,y+4)}`,
 hsw:(x,y)=>`${S.line(x,y,x+12,y)}<circle cx="${x+12}" cy="${y}" r="2" fill="#111"/>${S.line(x+12,y,x+32,y-11)}<circle cx="${x+34}" cy="${y}" r="2" fill="#111"/>${S.line(x+34,y,x+48,y)}`,
 ticks:(x,y,k,vert=false)=>Array.from({length:k},(_,i)=>vert?S.line(x-5,y+i*5+3,x+5,y+i*5-3,1):S.line(x+i*5-3,y+5,x+i*5+3,y-5,1)).join(""),
 dps:(x,y)=>/* DPS hanging below point x,y */ `${S.line(x,y,x,y+10)}${S.rect(x-9,y+10,18,26,"#fff")}${S.line(x,y+14,x,y+32,1)}<path d="M${x-3} ${y+26} L${x} ${y+32} L${x+3} ${y+26}" fill="none" stroke="#111" stroke-width="1"/>${S.line(x,y+36,x,y+44)}${S.gnd(x,y+44)}`,
 inv:(x,y,w=70,h=70)=>`${S.rect(x,y,w,h,"#fff",1.8)}${S.line(x,y+h,x+w,y)}${S.t(x+14,y+22,"=",{fs:18,b:1})}${S.t(x+w-24,y+h-10,"~",{fs:20,b:1})}`,
 pv:(x,y,w=46,h=30)=>`${S.rect(x,y,w,h,"#fff",1.5)}${S.line(x,y+h,x+w/2,y)}${S.line(x+w/2,y,x+w,y+h)}`,
 meter:(x,y,r=18)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#111" stroke-width="1.6"/>${S.t(x,y+4,"kWh",{fs:9.5,a:"middle",b:1})}`,
};
function carimbo(x,y,w,h,title,folha){
  const c1=w*0.42;
  return `<g>${S.rect(x,y,w,h,"#fff",1.6)}${S.line(x+c1,y,x+c1,y+h,1)}${S.line(x,y+h*0.5,x+w,y+h*0.5,1)}${S.line(x+w*0.72,y+h*0.5,x+w*0.72,y+h,1)}
  ${S.t(x+6,y+12,"PROJETO",{fs:7})}${S.t(x+6,y+28,esc(title),{fs:12,b:1})}${S.t(x+6,y+42,`${esc(P.nome||"")} · UC ${esc(P.uc||"")}`,{fs:8.5})}
  ${S.t(x+c1+6,y+12,"LOCAL",{fs:7})}${S.t(x+c1+6,y+26,esc(`${P.end||""}`).slice(0,60),{fs:8.5})}${S.t(x+c1+6,y+38,esc(`${P.bairro||""} · ${P.cidade||""}/${P.uf||""}`),{fs:8.5})}
  ${svgAssin(x+c1-110,y+h*0.5+2,100,40)}${S.t(x+6,y+h*0.5+12,"RESPONSÁVEL TÉCNICO",{fs:7})}${S.t(x+6,y+h*0.5+26,esc(P.rtNome||""),{fs:9,b:1})}${S.t(x+6,y+h*0.5+38,esc(`${P.rtTit||""} · ${P.rtReg||""}`),{fs:8})}
  ${S.t(x+c1+6,y+h*0.5+12,"EMPRESA · ART",{fs:7})}${S.t(x+c1+6,y+h*0.5+26,esc(P.rtEmp||""),{fs:9})}${S.t(x+c1+6,y+h*0.5+38,esc("ART "+(P.rtArt||"")),{fs:8})}
  ${S.t(x+w*0.72+6,y+h*0.5+12,"ESCALA · DATA · FOLHA",{fs:7})}${S.t(x+w*0.72+6,y+h*0.5+26,"S/E · "+dataBR(),{fs:9})}${S.t(x+w*0.72+6,y+h*0.5+38,folha,{fs:9,b:1})}</g>`;
}

/* ---- diagrama unifilar em prancha A0, no modelo dos projetos aprovados pela Equatorial ---- */
const U={
 brk:(x,y,lbl)=>`${S.line(x,y,x+14,y,1.4)}<circle cx="${x+17}" cy="${y}" r="3" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M${x+17} ${y-3} Q${x+25} ${y-20} ${x+33} ${y-3}" fill="none" stroke="#111" stroke-width="1.4"/>${S.line(x+25,y-12,x+25,y-19,1.2)}<circle cx="${x+33}" cy="${y}" r="3" fill="#fff" stroke="#111" stroke-width="1.2"/>${S.line(x+36,y,x+50,y,1.4)}${lbl?S.t(x+25,y-24,lbl,{fs:11,a:"middle"}):""}`,
 vbrk:(x,y,lbl)=>`${S.line(x,y,x,y+14,1.4)}<circle cx="${x}" cy="${y+17}" r="3" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M${x+3} ${y+17} Q${x+20} ${y+25} ${x+3} ${y+33}" fill="none" stroke="#111" stroke-width="1.4"/>${S.line(x+12,y+25,x+19,y+25,1.2)}<circle cx="${x}" cy="${y+33}" r="3" fill="#fff" stroke="#111" stroke-width="1.2"/>${S.line(x,y+36,x,y+50,1.4)}${lbl?S.t(x+24,y+29,lbl,{fs:11}):""}`,
 cab:(x,y,nc,terra,lbls=[],below=[])=>{let g="";for(let i=0;i<nc;i++)g+=S.line(x+i*6,y-13,x+i*6,y+13,1.3);
   if(terra){const tx=x+nc*6;g+=S.line(tx,y-13,tx,y+13,1.3)+S.line(tx-4,y-13,tx+4,y-13,1.3)}
   const cx=x+(nc+(terra?1:0)-1)*3;
   lbls.forEach((s,i)=>g+=S.t(cx,y-22-(lbls.length-1-i)*13,s,{fs:10.5,a:"middle"}));
   below.forEach((s,i)=>g+=S.t(cx,y+30+i*11,s,{fs:9,a:"middle"}));return g},
 dps:(x,y,h=36)=>`${S.rect(x-7,y,14,h,"#fff",1.3)}${S.line(x-7,y+h-5,x+7,y+5,1.1)}${S.line(x+7,y+5,x+11,y+5,1.1)}`,
 gnd:(x,y)=>S.line(x,y,x,y+8,1.3)+S.line(x-9,y+8,x+9,y+8,1.3)+S.line(x-6,y+12,x+6,y+12,1.3)+S.line(x-3,y+16,x+3,y+16,1.3),
 meter:(x,y,r=24)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#111" stroke-width="1.6"/>${S.t(x,y+8,"M",{fs:r*.9,a:"middle"})}`,
 pv:(x,y,lbl)=>`${S.rect(x,y-16,74,32,"#fff",1.3)}<path d="M${x+74} ${y-16} L${x+56} ${y} L${x+74} ${y+16}" fill="none" stroke="#111" stroke-width="1.3"/>${S.t(x+8,y+5,lbl,{fs:12})}`,
 sw:(x,y)=>`${S.line(x,y,x+14,y,1.4)}<circle cx="${x+16}" cy="${y}" r="2.2" fill="#111"/>${S.line(x+16,y,x+38,y-12,1.4)}${S.line(x+38,y-4,x+38,y+4,1.4)}${S.line(x+38,y,x+50,y,1.4)}`,
 fus:(x,y)=>`${S.line(x,y,x+12,y,1.4)}${S.rect(x+12,y-6,24,12,"#fff",1.3)}${S.line(x+12,y,x+36,y,1)}${S.line(x+36,y,x+48,y,1.4)}`,
 dash:(x,y,w,h)=>S.rect(x,y,w,h,"none",1.4,"26 12"),
 placaA:(x,y,w)=>{const h=w*.72,s=w/250;return `<g>${`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${8*s}" fill="#F7D417" stroke="#111" stroke-width="1.6"/>`}<rect x="${x+w*.18}" y="${y+h*.1}" width="${w*.64}" height="${h*.22}" fill="#111"/>${S.t(x+w/2,y+h*.27,"CUIDADO",{fs:26*s,a:"middle",c:"#F7D417",b:1})}${S.t(x+w/2,y+h*.5,"RISCO DE CHOQUE",{fs:19*s,a:"middle",b:1})}${S.t(x+w/2,y+h*.64,"ELÉTRICO",{fs:19*s,a:"middle",b:1})}${S.t(x+w/2,y+h*.86,"GERAÇÃO PRÓPRIA",{fs:19*s,a:"middle",b:1})}</g>`},
 placaB:(x,y,w)=>{const h=w*.52,s=w/270;return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${6*s}" fill="#fff" stroke="#111" stroke-width="1.4"/><rect x="${x+3}" y="${y+3}" width="${w-6}" height="${h*.33}" fill="#F7A600"/>${S.t(x+w/2,y+h*.27,"⚠ CUIDADO",{fs:30*s,a:"middle",b:1})}${S.t(x+w*.38,y+h*.55,"Geração",{fs:19*s,a:"middle",b:1})}${S.t(x+w*.38,y+h*.72,"Distribuída",{fs:19*s,a:"middle",b:1})}${S.t(x+w*.38,y+h*.89,"no Circuito",{fs:19*s,a:"middle",b:1})}<path d="M${x+w*.78} ${y+h*.42} L${x+w*.9} ${y+h*.92} L${x+w*.66} ${y+h*.92} Z" fill="#fff" stroke="#111" stroke-width="${1.6*s}"/><path d="M${x+w*.79} ${y+h*.55} L${x+w*.76} ${y+h*.72} L${x+w*.8} ${y+h*.72} L${x+w*.77} ${y+h*.88}" fill="none" stroke="#111" stroke-width="${1.6*s}"/></g>`},
};
function wrapTxt(s,max){const out=[];let cur="";for(const w of String(s).split(/\s+/)){if((cur+" "+w).trim().length>max){if(cur)out.push(cur);cur=w}else cur=(cur+" "+w).trim()}if(cur)out.push(cur);return out}
function dms(v,pos,neg){if(!isFinite(v)||v===0)return "—";const a=Math.abs(v),d=Math.floor(a),m=Math.floor((a-d)*60),s=((a-d)*60-m)*60;return `${d}°${String(m).padStart(2,"0")}'${s.toFixed(1).padStart(4,"0").replace(".",",")}"${v<0?neg:pos}`}
const NOTAS_UNIF=[
 "NOTA 3: O FORNECEDOR DO INVERSOR GARANTE A DESCONEXÃO DA CENTRAL GERADORA DURANTE A MANUTENÇÃO DO SISTEMA DA EQUATORIAL.",
 "NOTA 4: QUANDO DA SOLICITAÇÃO DE VISTORIA SERÁ APRESENTADO O RELATÓRIO DE COMISSIONAMENTO DAS INSTALAÇÕES DE CONEXÃO DE ACORDO COM OS ITENS ESTABELECIDOS NA ABNT NBR 16274, DEVIDAMENTE ASSINADO PELO RESPONSÁVEL TÉCNICO, INDICANDO AS CARACTERÍSTICAS FINAIS DAS INSTALAÇÕES DE CONEXÃO, OS RESULTADOS DOS ENSAIOS E DOS TESTES E MEDIÇÕES REALIZADOS.",
 "NOTA 5: O ATERRAMENTO DO SISTEMA DE GERAÇÃO SERÁ CONECTADO AO SISTEMA DE ATERRAMENTO DA UNIDADE CONSUMIDORA.",
 "NOTA 6: AS INSTALAÇÕES ELÉTRICAS DA UNIDADE CONSUMIDORA NÃO FORAM ALTERADAS E O RESPONSÁVEL TÉCNICO DO PRESENTE PROJETO NÃO SE RESPONSABILIZA POR EQUIPAMENTOS, COMPONENTES, QUADROS E CIRCUITOS QUE COMPÕEM A EDIFICAÇÃO, INSTALADOS ANTES DO PROJETO SOLAR FOTOVOLTAICO.",
 "NOTA 7: OS INVERSORES ATENDEM AO ESTABELECIDO NAS ABNT NBR 16149, NBR 16150, ABNT NBR IEC 62116 E NA NORMA TÉCNICA NT.020.EQTL DA EQUATORIAL.",
 "NOTA 8: OS INVERSORES DEVERÃO ESTAR INSTALADOS EM LOCAIS DE FÁCIL ACESSO, PROTEGIDOS CONTRA INTEMPÉRIES DE ACORDO COM O SEU GRAU DE PROTEÇÃO (IP), QUE PERMITAM FACILMENTE A VERIFICAÇÃO DE SUAS CARACTERÍSTICAS TÉCNICAS DURANTE O PROCESSO DE FISCALIZAÇÃO/CONEXÃO DA G.D.",
 "NOTA 9: AS INSTALAÇÕES ELÉTRICAS NESTES LOCAIS DEVERÃO ESTAR EM CONFORMIDADE COM A NR-10, NORMAS TÉCNICAS/SEGURANÇA DA EQUATORIAL E ABNT.",
 "NOTA 10: O RESPONSÁVEL TÉCNICO/INTERESSADO DEVERÁ ESTABELECER, CONFORME NR-10, EM SEU PROJETO E SUAS INSTALAÇÕES ELÉTRICAS OS REQUISITOS E CONDIÇÕES MÍNIMAS, OBJETIVANDO A IMPLEMENTAÇÃO DE MEDIDAS DE CONTROLE E SISTEMAS PREVENTIVOS, DE FORMA A GARANTIR A SEGURANÇA E A SAÚDE DOS TRABALHADORES QUE, DIRETA OU INDIRETAMENTE, INTERAJAM EM INSTALAÇÕES ELÉTRICAS E SERVIÇOS COM ELETRICIDADE, ENTRE ELAS DISPOSITIVOS DE DESLIGAMENTO COM RECURSO DE IMPEDIMENTO DE REENERGIZAÇÃO E SINALIZAÇÃO DE ADVERTÊNCIA.",
 "NOTA 11: É DE RESPONSABILIDADE DO PROJETISTA O DIMENSIONAMENTO DO CONDUTOR DE ATERRAMENTO DOS MÓDULOS."
];
function docUnif(c){
  const W=2400,H=1697,up=s=>esc(String(s||"").toUpperCase());
  const nf=P.ligacao==="Monofásico"?2:P.ligacao==="Bifásico"?3:4;
  const fases=nf-1;
  const tri=P.iFases.startsWith("Trif");
  const nInv=tri?4:2;
  const iQ=Math.max(1,n(P.iQ)), per=Math.max(1,Math.max(...c.strings.map(x=>x.m))||c.qtd||1), ns=c.strings.length;
  const mP=n(P.mP), sec=c.cabCC;
  let g=S.rect(20,20,W-40,H-40,"none",3);
  g+=S.t(1000,78,"DIAGRAMA UNIFILAR",{fs:34,a:"middle"});

  /* ---------- rede, padrão de entrada e quadro geral ---------- */
  const yb=330;
  g+=S.line(230,yb-130,230,yb+130,1.6)+`<circle cx="230" cy="${yb}" r="4" fill="#111"/>`;
  g+=S.t(196,yb,`REDE ${P.ramal==="Subterrâneo"?"SUBTERRÂNEA":"AÉREA"} BAIXA TENSÃO ${tri||nf>2?"220/380V":"220V"} DA EQUATORIAL`,{fs:11.5,a:"middle",r:-90});
  g+=S.t(213,yb,`N° POSTE ${up(P.poste)||"________"}`,{fs:11.5,a:"middle",r:-90});
  g+=S.line(230,yb,580,yb,1.4);
  g+=U.cab(300,yb,nf,false,[`${nf}#${cabEntUC()}mm²`,"XLPE 90°C 0,6/1KV","Classe 02"],[`Ramal de Ligação ${P.ramal==="Subterrâneo"?"Subterrâneo":"Aéreo"}`,"Condutores de Alumínio"]);
  g+=`<circle cx="400" cy="${yb}" r="12" fill="#fff" stroke="#111" stroke-width="1.4"/>`;
  g+=U.cab(480,yb,nf,false,[`${nf}#${cabEntUC()}mm²`,"PVC 70°C 0,6/1KV","Classe 02"],["Ramal de Entrada","Condutores de Cobre","Eletroduto Aço Zincado"]);
  // padrão
  g+=U.dash(580,yb-110,330,220)+S.t(745,yb-130,"PADRÃO DE ENTRADA",{fs:20,a:"middle"});
  g+=U.brk(605,yb,esc(P.disj||"")+"A")+S.line(655,yb,690,yb,1.4);
  g+=U.cab(690,yb,nf,false,[`${nf}#${cabEntUC()}mm²`,"PVC 70°C 0,6/1KV","Classe 02"])+S.line(690+nf*6,yb,816,yb,1.4);
  g+=U.meter(840,yb)+S.line(864,yb,1010,yb,1.4)+S.t(840,yb+62,"Medidor Bidirecional a Instalar",{fs:11,a:"middle"});
  g+=S.line(910,yb+110,935,yb+135,1.2)+U.gnd(935,yb+135);
  g+=S.t(745,yb+150,`UC N° ${esc(P.uc||"")}`,{fs:24,a:"middle"});
  g+=S.t(745,yb+176,"Topo da Caixa do Padrão a 1,65 m do piso acabado",{fs:11,a:"middle"});
  g+=S.lines(590,yb+200,wrapTxt("NOTA: O PROJETO DE GD APROVADO NÃO CONTEMPLA QUALQUER ALTERAÇÃO NO CONJUNTO DE MEDIÇÃO EXISTENTE. CASO O CONJUNTO DE MEDIÇÃO INSTALADO NO LOCAL NÃO SEJA O MESMO INDICADO NESTE PROJETO OU NÃO ESTEJA DE ACORDO COM AS NORMAS E PADRÕES TÉCNICOS VIGENTES À ÉPOCA DA SUA PRIMEIRA LIGAÇÃO, ESTE DEVERÁ SER ADEQUADO PARA POSSIBILITAR A CONEXÃO DA GD.",62),{fs:10.5,lh:14});
  g+=U.placaA(420,92,130)+S.line(550,150,580,yb-110,1.2)+S.t(590,yb-94,"Quadro existente",{fs:10});
  g+=U.cab(950,yb,nf,false,[`${nf}#${cabEntUC()}mm²`,"PVC 70°C 0,6/1KV","Classe 02"]);
  // QGD (quadro existente da casa: só recebe o alimentador do quadro do inversor)
  const qx=1010,qy=yb-175,qw=310,qh=385;
  g+=U.dash(qx,qy,qw,qh)+S.t(qx+qw/2,qy-20,"QUADRO GERAL DE DISTRIBUIÇÃO",{fs:18,a:"middle"});
  g+=`<circle cx="1050" cy="${yb}" r="4" fill="#111"/>`+U.brk(1090,yb,esc(P.disj||"")+"A")+S.line(1140,yb,1210,yb,1.4);
  const yPV=yb-95;
  g+=S.line(1210,yPV,1210,yb+90,1.6);
  [yPV,yb-20,yb+35,yb+90].forEach(y=>g+=`<circle cx="1210" cy="${y}" r="4" fill="#111"/>`);
  [yb-20,yb+35,yb+90].forEach(y=>g+=U.brk(1225,y,"")+S.line(1275,y,qx+qw-8,y,1.4)+U.cab(1285,y,nf,false,[]));
  g+=S.lines(1265,yb+122,["CIRCUITOS EXISTENTES","VÃO PARA AS CARGAS"],{fs:10.5,a:"middle",lh:13});
  // DPS CA
  g+=S.line(1050,yb,1050,yb+20,1.4)+U.vbrk(1050,yb+20,`${fases>1?fases+"x":""}20A`)+S.line(1050,yb+70,1050,yb+90,1.4)+U.dps(1050,yb+90)+S.line(1050,yb+126,1050,yb+140,1.4)+U.gnd(1050,yb+140);
  g+=S.lines(1072,yb+102,["DPS CA Classe II 275V","In=20kA","Imax=40kA"],{fs:10.5,lh:13});
  g+=S.rect(1072,yb+142,46,22,"#fff",1.2)+S.t(1095,yb+158,"BEP",{fs:13,a:"middle"});
  g+=S.line(qx+qw,qy+qh,qx+qw+25,qy+qh+25,1.2)+U.gnd(qx+qw+25,qy+qh+25)+S.lines(qx+qw+40,qy+qh+20,["6mm²","EPR 90°C 0,6/1KV","Classe 05"],{fs:10.5,lh:13});
  g+=U.placaB(1335,40,115)+S.line(1350,40+115*.52,qx+qw+2,qy-2,1.2);
  // alimentador QGD → quadro CA do inversor
  const cx0=1420,cw=280;
  g+=S.line(1210,yPV,cx0+30,yPV,1.4)+U.cab(1352,yPV,nInv,true,[`${nInv}#${c.cabCA}mm²+T`,"PVC 750V"]);
  // QUADRO CA INVERSOR (separado do quadro da casa)
  g+=U.dash(cx0,qy,cw,qh)+S.t(cx0+cw/2,qy-20,"QUADRO CA INVERSOR",{fs:20,a:"middle"});
  const xd=cx0+30,xbus=cx0+80,nBr=Math.min(iQ,3),yS=Array.from({length:nBr},(_,k)=>yPV+k*62);
  g+=`<circle cx="${xd}" cy="${yPV}" r="4" fill="#111"/>`+S.line(xd,yPV,xbus,yPV,1.4)+S.line(xbus,yPV,xbus,yS[nBr-1],1.6);
  yS.forEach((y,k)=>{g+=`<circle cx="${xbus}" cy="${y}" r="4" fill="#111"/>`+U.brk(xbus+15,y,c.disjCA+"A")+S.line(xbus+65,y,1880-(k?20:0),y,1.4)+U.cab(cx0+cw-80,y,nInv,true,[`${nInv}#${c.cabCA}mm² + T${c.cabCA}mm²`,"PVC 70°C 750V","Classe 02"])
    +S.lines(1790,y-20,["SISTEMA FOTOVOLTAICO","CONECTADO À REDE"+(nBr>1?` (INV. ${k+1})`:"")],{fs:9.5,a:"middle",lh:11})});
  if(iQ>nBr)g+=S.t(1790,yS[nBr-1]+30,`+ ${iQ-nBr} INVERSOR(ES) IDÊNTICO(S)`,{fs:9.5,a:"middle"});
  const yD=Math.max(yS[nBr-1]+40,yPV+120);
  g+=S.line(xd,yPV,xd,yD,1.4)+U.vbrk(xd,yD,`${fases>1?fases+"x":""}20A`)+S.line(xd,yD+50,xd,yD+62,1.4)+U.dps(xd,yD+62)+S.line(xd,yD+98,xd,yD+110,1.4)+U.gnd(xd,yD+110);
  g+=S.lines(xd+22,yD+74,["DPS CA Classe II 275V","In=20kA","Imax=40kA"],{fs:10.5,lh:13});
  g+=S.rect(xd+22,yD+112,46,22,"#fff",1.2)+S.t(xd+45,yD+128,"BEP",{fs:13,a:"middle"});

  /* ---------- strings, string box e inversor ---------- */
  const nsDraw=Math.min(ns,4), y0=720, yMax=960;
  const sp=nsDraw>1?Math.min(150,(yMax-y0)/(nsDraw-1)):0, ret=Math.max(46,Math.min(70,sp?sp*.62:70));
  const nmTot=Math.max(1,n(P.iNmppt)*iQ), spm=Math.max(1,c.strPorMppt||1);
  let acum=0;const rows=Array.from({length:nsDraw},(_,i)=>{const s=c.strings[i],r={i,y:y0+i*sp,m:Math.min(nmTot-1,s.mppt-1),per:Math.max(1,s.m),ini:acum};acum+=s.m;return r});
  g+=S.t(560,y0-70,"O DIMENSIONAMENTO DO INVERSOR E MÓDULOS É DE RESPONSABILIDADE DO PROJETISTA.",{fs:13,a:"middle"});
  const bx=990,bxe=1380,x0=290;
  rows.forEach(r=>{
    const y=r.y,yr=y+ret;
    const per=r.per,idx=per<=7?Array.from({length:per},(_,j)=>j):[0,1,2,3,4,-1,per-1];
    let x=x0;
    g+=S.line(x0-25,y,x0,y,1.3)+S.line(x0-25,y,x0-25,yr,1.3)+S.line(x0-25,yr,bx+30,yr,1.3);
    idx.forEach((j,k)=>{
      if(j<0){g+=S.t(x+30,y+5,"· · ·",{fs:16,a:"middle",b:1})+S.line(x,y,x+12,y,1.3)+S.line(x+48,y,x+60,y,1.3);x+=60;return}
      g+=U.pv(x,y,`PV ${r.ini+j+1}`)+S.line(x+37,y+16,x+37,y+22,1.2)+U.gnd(x+37,y+22);
      if(k<idx.length-1){g+=S.line(x+74,y,x+84,y,1.3)+S.t(x+79,y-8,"+",{fs:11,a:"middle"})}
      x+=84;
    });
    const xe=x-10;
    g+=S.line(xe,y,bx+30,y,1.3);
    g+=S.t(xe+12,y-8,`+ 1#${sec}mm²`,{fs:10})+S.t(xe+12,yr-8,`– 1#${sec}mm²`,{fs:10})+S.t(xe+12,y+20,`SÉRIE N°${r.i+1} · MPPT ${r.m+1}`,{fs:10});
    g+=S.lines(50,y-24,[`${per} MÓDULOS EM SÉRIE`,`${up(P.mFab)} ${mP} W`,`Vmp = ${fmt(per*n(P.mVmp),1)} V`,`Imp = ${fmt(n(P.mImp),2)} A`,`P = ${fmt(per*mP/1000,2)} kWp`],{fs:9.5,lh:12});
    if(c.fusivel)g+=S.line(bx+30,y,bx+30,y,1)+U.fus(bx+2,y);
  });
  if(ns>nsDraw)g+=S.t(1180,yMax+ret+105,(new Set(c.strings.map(x=>x.m)).size>1?`+ ${ns-nsDraw} STRING(S) NÃO REPRESENTADA(S): ${ns} STRINGS (${c.mppts.map(g=>`MPPT ${g.mppt}: ${g.ms.length}x${g.ms[0]}`).join(" · ")}) · ${c.qtdStr} MÓDULOS NO TOTAL`:`+ ${ns-nsDraw} STRING(S) IDÊNTICA(S) NÃO REPRESENTADA(S): ${ns} STRINGS DE ${per} MÓDULOS NO TOTAL`),{fs:11,a:"middle"});
  const yNotas=y0+(nsDraw-1)*sp+ret+42+(ns>nsDraw?0:0);
  g+=S.lines(60,yNotas,["NOTA: TODOS OS CONDUTORES USADOS NO ATERRAMENTO DOS MÓDULOS SÃO: 6mm² EPR 90°C 0,6/1KV, Classe 05.",`CONDUTOR PARA CIRCUITO EM CORRENTE CONTÍNUA: ${sec}mm², tensão máxima 1800 Vcc, temperatura máxima 120 °C, resistente à radiação UV (ABNT NBR 16612).`],{fs:10,lh:13});
  // string box
  const lastY=rows[rows.length-1].y+ret;
  const sbTop=y0-60,sbBot=lastY+60;
  g+=U.dash(bx,sbTop,bxe-bx,sbBot-sbTop)+S.t(bx+(bxe-bx)/2,sbTop-12,"QUADRO DE PROTEÇÃO CC (STRING BOX)",{fs:14,a:"middle"});
  if(c.fusivel)g+=S.t(bx+6,sbBot-8,`Fusíveis gPV ${c.fusivel} A`,{fs:10});
  const ix=1520,iw=260;
  const groups=[];rows.forEach(r=>{(groups[r.m]=groups[r.m]||[]).push(r)});
  const gl=groups.filter(Boolean);
  gl.forEach(gr=>{
    const yp=gr[0].y,yr=yp+ret,last=gr[gr.length-1];
    if(gr.length>1){g+=S.line(bx+30,yp,bx+30,last.y,1.3)+S.line(bx+44,yr,bx+44,last.y+ret,1.3);gr.slice(1).forEach(r=>g+=S.line(bx+30,r.y+ret,bx+44,r.y+ret,1.3));
      gr.forEach(r=>g+=`<circle cx="${bx+30}" cy="${r.y}" r="3.5" fill="#111"/><circle cx="${bx+44}" cy="${r.y+ret}" r="3.5" fill="#111"/>`)}
    else g+=S.line(bx+30,yr,bx+44,yr,1.3);
    // DPS CC em Y: + e – para o terra
    const xd=bx+110,ym=yp+ret/2,hh=ret/2-10;
    g+=`<circle cx="${xd}" cy="${yp}" r="3.5" fill="#111"/><circle cx="${xd}" cy="${yr}" r="3.5" fill="#111"/>`;
    g+=S.line(xd,yp,xd,yp+3,1.2)+U.dps(xd,yp+3,hh)+S.line(xd,yp+3+hh,xd,yr-3-hh,1.2)+U.dps(xd,yr-3-hh,hh)+S.line(xd,yr-3,xd,yr,1.2);
    g+=S.line(xd,ym,xd+30,ym,1.2)+S.line(xd+30,ym,xd+30,ym+2,1.2)+U.gnd(xd+30,ym+2);
    g+=S.lines(xd+48,ym-4,[`DPS CC ${c.dpsCCv}V`,"In=20kA Imax=40kA"],{fs:9.5,lh:11});
    // chave seccionadora (2 polos)
    g+=S.line(bx+44,yp,bx+260,yp,1.3)+S.line(bx+44,yr,bx+260,yr,1.3);
    g+=U.sw(bx+260,yp)+U.sw(bx+260,yr)+S.line(bx+287,yp-6,bx+287,yr-6,1,"5 4")+S.t(bx+250,yr+18,`Chave secc. CC ${c.chaveCC}A`,{fs:9.5});
    g+=S.line(bx+310,yp,ix,yp,1.3)+S.line(bx+310,yr,ix,yr,1.3);
    g+=S.t(bx+400,yp-6,`+ 1#${sec}mm²`,{fs:10})+S.t(bx+400,yr-6,`– 1#${sec}mm²`,{fs:10});
  });
  g+=S.line(bxe,sbBot,bxe+22,sbBot+22,1.2)+U.gnd(bxe+22,sbBot+22)+S.t(bxe+38,sbBot+36,"6mm² EPR 90°C 0,6/1KV Classe 05",{fs:10});
  // inversor
  const iTop=y0-60, iBot=Math.max(iTop+330,lastY+60);
  g+=S.rect(ix,iTop,iw,iBot-iTop,"#fff",2)+S.line(ix,iBot,ix+iw,iTop,1.4);
  g+=S.line(ix+120,iTop+40,ix+210,iTop+40,1.3)+S.line(ix+120,iTop+58,ix+210,iTop+58,1.3,"8 5");
  g+=`<path d="M${ix+140} ${iBot-45} q22 -40 44 0 t44 0" fill="none" stroke="#111" stroke-width="1.4"/>`;
  gl.forEach((gr,k)=>g+=S.t(ix+8,gr[0].y+ret/2+4,`MPPT ${gr[0].m+1}`,{fs:11}));
  g+=S.t(ix+iw/2,iTop-40,`INVERSOR DE FREQUÊNCIA ${fmt(n(P.iP),n(P.iP)%1?1:0)} kW${iQ>1?` (x${iQ})`:""}`,{fs:17,a:"middle"})+S.t(ix+iw/2,iTop-18,`${up(P.iFab)} ${up(P.iMod)}`,{fs:17,a:"middle"});
  g+=S.line(ix+iw/2,iBot,ix+iw/2,iBot+18,1.3)+U.gnd(ix+iw/2,iBot+18)+S.lines(ix+iw/2+18,iBot+30,["6mm² EPR 90°C 0,6/1KV","Classe 05"],{fs:10,lh:12});
  const yAC=iTop+40;
  g+=S.line(ix+iw,yAC,1880,yAC,1.4)+S.line(1880,yAC,1880,yPV,1.4)+U.cab(1815,yAC,nInv,true,[`${nInv}#${c.cabCA}mm² + T`,"PVC 70°C 750V"]);
  // dados de entrada em STC
  const stc=[`ENTRADA DO INVERSOR EM CONDIÇÕES STC*`];
  c.mppts.forEach(g=>{const k=g.ms.length,mm=Math.max(...g.ms);stc.push(`MPPT ${g.mppt}: ${k} string(s) de ${mm} módulos · Vop = ${fmt(mm*n(P.mVmp),1)} V · I = ${fmt(k*n(P.mImp),2)} A · P = ${fmt(g.ms.reduce((a,b)=>a+b,0)*mP/1000,2)} kWp`)});
  stc.push(`POTÊNCIA PICO DE ENTRADA CC = ${fmt(c.pcc,2)} kWp · POTÊNCIA NOMINAL CA = ${fmt(c.pca,2)} kW`,"*STC: irradiância 1000 W/m², temperatura do módulo 25 °C, massa de ar 1,5");
  g+=S.lines(60,yNotas+40,stc,{fs:10.5,lh:14});

  /* ---------- faixa inferior: planta, especificações e placas ---------- */
  const by=1255;
  g+=S.line(40,by-20,1890,by-20,1);
  g+=S.t(300,by+8,"PLANTA DE SITUAÇÃO",{fs:20,a:"middle"});
  const img=plantaImg||P.planta;
  g+=S.rect(60,by+24,480,330,"#EEF0EA",1.3);
  if(img)g+=`<image href="${img}" x="60" y="${by+24}" width="480" height="330" preserveAspectRatio="xMidYMid slice"/><circle cx="300" cy="${by+189}" r="9" fill="#D7261E" stroke="#fff" stroke-width="3"/>`;
  else g+=S.lines(300,by+180,["Informe a localização no formulário","(Titular e unidade consumidora) e toque em","“Buscar localização e imagem”"],{fs:12,a:"middle",lh:16});
  g+=S.t(665,by+70,`LATITUDE ${dms(n(P.lat),"N","S")}`,{fs:13,a:"middle"})+S.t(665,by+90,`LONGITUDE ${dms(n(P.lon),"L","O")}`,{fs:13,a:"middle"});
  g+=S.t(665,by+130,"NORTE",{fs:15,a:"middle"});
  g+=`<g transform="translate(665,${by+205})"><circle r="44" fill="none" stroke="#111" stroke-width="1.2"/><path d="M0 -58 L9 -9 L58 0 L9 9 L0 58 L-9 9 L-58 0 L-9 -9 Z" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M0 -58 L9 -9 L0 0 Z M58 0 L9 9 L0 0 Z M0 58 L-9 9 L0 0 Z M-58 0 L-9 -9 L0 0 Z" fill="#111"/></g>`;
  g+=S.t(665,by+138+0,"",{})+S.t(600,by+210,"O",{fs:12,a:"middle"})+S.t(732,by+210,"L",{fs:12,a:"middle"})+S.t(665,by+285,"S",{fs:12,a:"middle"});
  g+=S.lines(300,by+372,[esc(`${P.end||""}, ${P.bairro||""}`).toUpperCase(),esc(`CEP ${P.cep||""}, ${P.cidade||""} - ${P.uf||""}`).toUpperCase()],{fs:11,a:"middle",lh:14});
  // tabelas
  const tab=(x,y,w,title,rowsT)=>{let t=S.lines(x+w/2,y,title,{fs:11,a:"middle",lh:14});const ty=y+title.length*14;
    rowsT.forEach((r,i)=>{t+=S.rect(x,ty+i*20,w,20,"#fff",1)+S.line(x+w*.52,ty+i*20,x+w*.52,ty+i*20+20,1)+S.t(x+5,ty+i*20+14,esc(r[0]),{fs:10})+S.t(x+w*.52+5,ty+i*20+14,esc(String(r[1]??"—")),{fs:10})});return t};
  const mm=v=>n(v)?Math.round(n(v)*1000):"";
  g+=tab(790,by+20,290,[`MÓDULOS ${up(P.mFab)} ${up(P.mMod)}`.slice(0,46),`${mP} W · EM CONDIÇÕES STC*`],[
    ["Dimensões",mm(P.mC)?`${mm(P.mC)} x ${mm(P.mL)} mm`:"—"],["Peso",P.mPeso?`${P.mPeso} kg`:"—"],["Tipo de células",P.mTipo||"Monocristalino"],["Número de células",P.mCel||"—"],
    ["Potência máxima",`${mP} W`],["Tensão de circuito aberto",`${fmt(n(P.mVoc),2)} V`],["Corrente de curto-circuito",`${fmt(n(P.mIsc),2)} A`],["Tensão de operação",`${fmt(n(P.mVmp),2)} V`],["Corrente de operação",`${fmt(n(P.mImp),2)} A`],["Eficiência",`${fmt(n(P.mEff),1)} %`],["Registro INMETRO",regInm("m")||"—"]]);
  g+=S.lines(935,by+282,["*CONDIÇÕES STC: irradiância 1000 W/m²,","temperatura do módulo 25 °C, massa de ar 1,5"],{fs:9.5,a:"middle",lh:12});
  // cabo CC
  const kx=1100;
  g+=S.lines(kx+95,by+20,["CONDUTOR CIRCUITO","CORRENTE CONTÍNUA"],{fs:11,a:"middle",lh:14});
  g+=S.rect(kx,by+48,190,190,"#fff",1);
  g+=`<g transform="translate(${kx+20},${by+70})"><rect x="0" y="40" width="80" height="18" rx="9" fill="#C8302A"/><rect x="0" y="45" width="100" height="8" fill="#B87333"/><path d="M100 45 l14 -4 M100 49 l16 0 M100 53 l14 4" stroke="#B87333" stroke-width="2"/><rect x="-6" y="38" width="40" height="22" rx="10" fill="#E2483F"/></g>`;
  g+=S.lines(kx+10,by+148,["1. Condutor: cobre estanhado flexível,","   classe 5","2. Isolação: elastômero termofixo","3. Cobertura: elastômero termofixo","Tensão máx. 1800 Vcc · 120 °C","Resistente a UV · ABNT NBR 16612"],{fs:9.5,lh:13});
  // inversor
  g+=tab(1310,by+20,270,[`INVERSOR DE FREQUÊNCIA ${fmt(n(P.iP),n(P.iP)%1?1:0)} kW`,`${up(P.iFab)} ${up(P.iMod)}`.slice(0,40)],[
    ["Dimensões",P.iDim||"—"],["Peso",P.iPeso?`${P.iPeso} kg`:"—"],["Modelo",P.iMod||"—"],["Fabricante",P.iFab||"—"],["Potência CA",`${fmt(n(P.iP))} kW`],
    ["Tensão CA",tri?"220 / 380 V":"220 V"],["Frequência","60 Hz"],["Tensão máx. entrada CC",`${esc(P.iVmax||"")} V`],["Nº de MPPT",P.iNmppt||"—"],["Grau de proteção",P.iIP||"IP65"],["Registro INMETRO",regInm("i")||"—"]]);
  // placas
  const px=1610;
  g+=S.t(px+130,by+8,"DETALHE – PLACAS DE ADVERTÊNCIA",{fs:13,a:"middle"});
  const pa=px+80;
  g+=U.placaA(pa,by+20,120)+S.line(pa,by+114,pa+120,by+114,1)+S.t(pa+60,by+126,"250 mm",{fs:9,a:"middle"})+S.line(pa-8,by+20,pa-8,by+106,1)+S.t(pa-12,by+63,"180 mm",{fs:9,a:"middle",r:-90});
  const n1=wrapTxt("NOTA 1: SERÁ INSTALADA JUNTO AO PADRÃO DE ENTRADA UMA PLACA DE ADVERTÊNCIA: espessura 2 mm; chapa galvalume nº 22 USG (0,79 mm), cantos arredondados; fundo amarelo em epóxi; letras pretas em tinta eletrostática em pó; fundo anticorrosivo de no mínimo 30 µm (frente e verso).",58);
  g+=S.lines(px-10,by+140,n1,{fs:8.5,lh:10.5});
  const pb=px+70,pby=by+140+n1.length*10.5+12;
  g+=U.placaB(pb,pby,140)+S.line(pb,pby+81,pb+140,pby+81,1)+S.t(pb+70,pby+93,"270 mm",{fs:9,a:"middle"})+S.line(pb-8,pby,pb-8,pby+73,1)+S.t(pb-12,pby+36,"140 mm",{fs:9,a:"middle",r:-90});
  const n2=wrapTxt("NOTA 2: SERÁ INSTALADA PELO INSTALADOR UMA PLACA DE ADVERTÊNCIA NO POSTE ONDE SE ENCONTRA O TRANSFORMADOR DE DISTRIBUIÇÃO E NO QUADRO GERAL DE DISTRIBUIÇÃO: chapa de fibra de vidro resistente às intempéries e à corrosão, cantos arredondados; 140 x 270 mm; fundo amarelo em epóxi; letras pretas em tinta eletrostática em pó.",58);
  g+=S.lines(px-10,pby+107,n2,{fs:8.5,lh:10.5});

  /* ---------- coluna direita: legenda, notas e carimbo ---------- */
  const lx=1910,lw=450;
  g+=S.t(lx+lw/2,82,"LEGENDA",{fs:24,a:"middle"});
  g+=S.rect(lx,100,lw,520,"#fff",1.4);
  const leg=[[U.brk(lx+20,0,""),"DISJUNTOR TERMOMAGNÉTICO"],[U.sw(lx+20,0),"SECCIONADORA PARA APLICAÇÕES EM CORRENTE CONTÍNUA"],[U.fus(lx+20,0),"PORTA-FUSÍVEL PARA APLICAÇÕES EM CORRENTE CONTÍNUA"],
    [U.dps(lx+45,-18),"DISPOSITIVO DE PROTEÇÃO CONTRA SURTOS (DPS)"],[S.rect(lx+28,-18,36,36,"#fff",1.3)+S.line(lx+28,18,lx+64,-18,1.1)+S.line(lx+34,-10,lx+46,-10,1)+`<path d="M${lx+46} 10 q5 -8 10 0" fill="none" stroke="#111"/>`,"INVERSOR FOTOVOLTAICO"],
    [U.meter(lx+45,0,16),"MEDIDOR DE ENERGIA BIDIRECIONAL A INSTALAR"],[U.cab(lx+38,0,2,true,[]),"CONDUTORES NEUTRO, FASE E CONDUTOR DE PROTEÇÃO, RESPECTIVAMENTE"],
    [S.line(lx+40,-13,lx+40,13,1.3)+S.line(lx+50,-13,lx+50,13,1.3)+S.t(lx+40,-17,"+",{fs:10,a:"middle"})+S.t(lx+50,-17,"–",{fs:10,a:"middle"}),"CONDUTOR POSITIVO E CONDUTOR NEGATIVO, RESPECTIVAMENTE"],
    [U.gnd(lx+45,-8),"LIGAÇÃO AO ATERRAMENTO"],[U.pv(lx+8,0,"PV"),"MÓDULO FOTOVOLTAICO"],[U.dash(lx+22,-14,46,28),"QUADRO / LIMITE DE EQUIPAMENTO"]];
  leg.forEach(([sym,txt],i)=>{const y=135+i*40;g+=`<g transform="translate(0,${y})">${sym}</g>`+S.lines(lx+105,y+4-(txt.length>44?6:0),wrapTxt(txt,46),{fs:10.5,lh:12})});
  g+=S.lines(lx+12,135+leg.length*40,["SEÇÃO NÃO INFORMADA = 2,5 mm² · ISOLAÇÃO NÃO INFORMADA = 750 V","ELETRODUTO NÃO INFORMADO = PVC FLEXÍVEL CORRUGADO Ø 3/4\""],{fs:9.5,lh:13});
  let ny=645;
  NOTAS_UNIF.map((t,i)=>t.replace(/^NOTA \d+/,"NOTA "+(i+3))).forEach(t=>{const ls=wrapTxt(t,84);g+=S.lines(lx,ny,ls,{fs:9,lh:11});ny+=ls.length*11+3});
  // carimbo
  const cy0=1040,ce=H-40;
  g+=S.rect(lx,cy0,lw,ce-cy0,"#fff",1.6);
  g+=S.t(lx+8,cy0+18,"RESERVADO À EQUATORIAL:",{fs:12});
  let y=cy0+150;g+=S.line(lx,y,lx+lw,y,1.2);
  g+=S.t(lx+lw/2,y+16,"REVISÕES",{fs:11,a:"middle"})+S.line(lx,y+22,lx+lw,y+22,1);
  const cols=[0,.34,.56,.78,1];["DESCRIÇÃO","DATA ENTREGA","DATA ANÁLISE","STATUS"].forEach((h,i)=>g+=S.t(lx+lw*(cols[i]+cols[i+1])/2,y+37,h,{fs:9.5,a:"middle"}));
  g+=S.line(lx,y+43,lx+lw,y+43,1)+S.t(lx+lw*.17,y+58,"EMISSÃO INICIAL",{fs:9.5,a:"middle"})+S.t(lx+lw*.45,y+58,dataBR(),{fs:9.5,a:"middle"});
  [1,2,3].forEach(i=>g+=S.line(lx+lw*cols[i],y+22,lx+lw*cols[i],y+66,1));
  y+=66;g+=S.line(lx,y,lx+lw,y,1.2);
  g+=S.lines(lx+lw/2,y+16,[up(`${P.end||""}, ${P.bairro||""}`).slice(0,70),up(`CEP ${P.cep||""}, ${P.cidade||""} - ${P.uf||""}`)],{fs:10,a:"middle",lh:13});
  y+=36;g+=S.line(lx,y,lx+lw,y,1.2);
  g+=S.t(lx+8,y+40,"RT:",{fs:11})+svgAssin(lx+lw/2-20,y-4,120,46)+S.line(lx+120,y+38,lx+lw-40,y+38,.8)+S.lines(lx+lw/2+40,y+52,[up(P.rtNome),esc(`${P.rtTit||""} · ${P.rtReg||""}`),esc(`ART/TRT nº ${P.rtArt||""}`)],{fs:10,a:"middle",lh:12});
  y+=96;g+=S.t(lx+8,y+30,"PROP.:",{fs:11})+(assinaCli()&&assinRT?S.t(lx+lw/2-34,y+18,"p.p.",{fs:9})+svgAssin(lx+lw/2-20,y-20,120,46):"")+S.line(lx+120,y+22,lx+lw-40,y+22,.8)+S.lines(lx+lw/2+40,y+36,[up(P.nome),`CPF/CNPJ: ${esc(P.doc||"")}`],{fs:10,a:"middle",lh:12});
  y+=62;g+=S.line(lx,y,lx+lw,y,1.2)+S.t(lx+6,y+12,"CONTEÚDO:",{fs:8})+S.lines(lx+lw*.25,y+26,["DIAGRAMA UNIFILAR","DETALHES","PLACAS DE ADVERTÊNCIA"],{fs:10,a:"middle",lh:12})+S.line(lx+lw*.5,y,lx+lw*.5,y+64,1)+S.t(lx+lw*.5+6,y+12,"RESPONSÁVEL TÉCNICO:",{fs:8})+S.t(lx+lw*.75,y+36,up(P.rtNome).slice(0,34),{fs:10,a:"middle"})+(P.rtEmp?S.t(lx+lw*.75,y+52,up(P.rtEmp).slice(0,34),{fs:9,a:"middle"}):"");
  y+=64;g+=S.line(lx,y,lx+lw,y,1.2);
  const cell=(x1,x2,yy,lab,v)=>S.line(lx+lw*x1,yy,lx+lw*x1,yy+44,1)+S.t(lx+lw*x1+5,yy+11,lab,{fs:7.5})+S.t(lx+lw*(x1+x2)/2,yy+33,v,{fs:10,a:"middle"});
  g+=S.t(lx+5,y+11,"ASSUNTO:",{fs:7.5})+S.t(lx+lw*.25,y+33,`${c.categoria.toUpperCase()} DISTRIBUÍDA FOTOVOLTAICA`,{fs:9.5,a:"middle"})+cell(.52,.7,y,"ESCALA:","INDICADA")+cell(.7,.82,y,"FOLHA:","1/1")+cell(.82,1,y,"DATA:",dataBR());
  y+=44;g+=S.line(lx,y,lx+lw,y,1.2);
  g+=S.t(lx+5,y+11,"CLIENTE:",{fs:7.5})+S.t(lx+lw*.25,y+33,up(P.nome).slice(0,40),{fs:9.5,a:"middle"})+cell(.52,.82,y,"REVISÃO:","EMISSÃO INICIAL")+cell(.82,1,y,"DIM. FOLHA:","A0");
  return [`<div class="sheet land big"><svg viewBox="0 0 ${W} ${H}" width="1123" height="794" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Arial, Helvetica, sans-serif">${g}</svg></div>`];
}

function docBlocos(c){
  const W=1079,H=750;let g=S.rect(4,4,W-8,H-8,"none",1.2);
  g+=S.t(20,30,"DIAGRAMA DE BLOCOS – SISTEMA FOTOVOLTAICO CONECTADO À REDE",{fs:15,b:1});
  g+=S.t(20,46,`${fmt(c.pinst)} kW · ${esc(P.nome||"")} · UC ${esc(P.uc||"")}`,{fs:10});
  const y=200,h=120,bw=138,gap=36;
  const blocks=[
   ["ARRANJO FV",[`${c.qtd} módulos ${esc(P.mP||"")} Wp`,`${fmt(c.pcc)} kWp`,`${esc(P.nStr||"")} × ${esc(P.mPorStr||"")} em série`,`Voc ${fmt(c.vocStr,0)} V`]],
   ["PROTEÇÃO CC",[`Chave seccionadora ${c.chaveCC} A`,`DPS Cl. II ≥${c.dpsCCv} V`,c.fusivel?`Fusível gPV ${c.fusivel} A`:"Sem fusível (≤2 strings/MPPT)",`Cabo ${c.cabCC} mm² solar`]],
   ["INVERSOR",[`${esc(P.iFab||"")} ${esc(P.iMod||"")}`,`${fmt(c.pca)} kW · ${c.vOut}`,"Prot. 27/59/81/78/25","INMETRO"]],
   ["PROTEÇÃO CA",[`Disjuntor ${c.disjCA} A curva C`,"DPS Cl. II 275 V",`Cabo ${c.cabCA} mm² ${c.condCA}`,""]],
   ["QUADRO GERAL",[`Disjuntor geral ${esc(P.disj||"")} A`,`Cargas ${fmt(cargaInst())} kW`,"BEP / aterramento",""]],
   ["MEDIÇÃO",["Medidor bidirecional","(instalado pela","distribuidora)",""]],
   ["REDE BT",["Equatorial Goiás",esc(P.tensao||""),esc(P.ligacao||""),""]]
  ];
  const x0=24;
  blocks.forEach((b,i)=>{const x=x0+i*(bw+gap);
    g+=`<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${i===2?"#FFF4DE":i===6?"#E9EEF0":"#fff"}" stroke="#111" stroke-width="1.6" rx="3"/>`;
    g+=S.t(x+bw/2,y+20,b[0],{fs:10.5,a:"middle",b:1})+S.line(x,y+28,x+bw,y+28,1);
    b[1].forEach((l,j)=>g+=S.t(x+bw/2,y+46+j*16,l,{fs:8.6,a:"middle"}));
    if(i<blocks.length-1){const ax=x+bw,ay=y+h/2;g+=S.line(ax,ay,ax+gap-6,ay,1.8)+`<path d="M${ax+gap-8} ${ay-5} L${ax+gap} ${ay} L${ax+gap-8} ${ay+5} Z" fill="#111"/>`;
      g+=S.t(ax+gap/2,ay-8,i<2?"CC":"CA",{fs:8,a:"middle",b:1});}
  });
  g+=S.t(x0+2*(bw+gap)+bw/2,y+h+30,"Sentido do fluxo de potência injetada →",{fs:9,a:"middle"});
  g+=S.line(x0+4*(bw+gap)+bw/2,y+h,x0+4*(bw+gap)+bw/2,y+h+70,1.4)+`<rect x="${x0+4*(bw+gap)+10}" y="${y+h+70}" width="${bw-20}" height="40" fill="#fff" stroke="#111" stroke-width="1.4"/>`+S.t(x0+4*(bw+gap)+bw/2,y+h+94,"CARGAS DA UC",{fs:9,a:"middle",b:1});
  g+=S.lines(24,560,["Notas:","1. Proteções de sub/sobretensão, sub/sobrefrequência, anti-ilhamento e sincronismo incorporadas ao inversor certificado (NBR 16149/16150, IEC 62116).","2. Massas metálicas, estruturas e DPS conectados ao BEP da unidade consumidora.","3. Diagrama exigido para potência acima de 10 kW (NT.020.EQTL), incluído para referência."],{fs:9,lh:13});
  g+=carimbo(20,H-118,W-40,96,"Diagrama de blocos","01/01");
  return [`<div class="sheet land"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg></div>`];
}

function docPlanta(c){
  const W=1079,H=750;let g=S.rect(4,4,W-8,H-8,"none",1.2);
  g+=S.t(20,30,"PLANTA DE SITUAÇÃO E LOCALIZAÇÃO",{fs:15,b:1});
  g+=S.t(20,46,`${esc(P.end||"")} · ${esc(P.bairro||"")} · ${esc(P.cidade||"")}/${esc(P.uf||"")} · Lat ${fmt(n(P.lat),6)} · Long ${fmt(n(P.lon),6)} (SIRGAS 2000)`,{fs:10});
  const mx=20,my=60,mw=700,mh=540;
  const img=plantaImg||P.planta;
  g+=S.rect(mx,my,mw,mh,"#F4F5F2",1.4);
  if(img){g+=`<image href="${img}" x="${mx}" y="${my}" width="${mw}" height="${mh}" preserveAspectRatio="xMidYMid slice"/>`;
    g+=`<rect x="${mx+mw/2-60}" y="${my+mh/2-40}" width="120" height="80" fill="none" stroke="#E0A010" stroke-width="3" stroke-dasharray="8 5"/>`;
    g+=`<rect x="${mx+mw/2-62}" y="${my+mh/2-62}" width="124" height="18" fill="#111"/>`+S.t(mx+mw/2,my+mh/2-49,"ÁREA DO GERADOR",{fs:10,a:"middle",b:1,c:"#fff"});
  } else {
    // croqui gerado
    g+=`<rect x="${mx}" y="${my+mh-90}" width="${mw}" height="60" fill="#DCDCD6" stroke="none"/>`+S.t(mx+mw/2,my+mh-55,esc((P.end||"VIA PÚBLICA").split(",")[0].toUpperCase()),{fs:12,a:"middle",b:1});
    g+=`<rect x="${mx+190}" y="${my+80}" width="320" height="360" fill="#fff" stroke="#111" stroke-width="1.4" stroke-dasharray="10 5"/>`+S.t(mx+200,my+96,"LIMITE DO LOTE",{fs:8.5});
    g+=`<rect x="${mx+230}" y="${my+130}" width="240" height="200" fill="#EFEDE6" stroke="#111" stroke-width="1.8"/>`+S.t(mx+350,my+318,"EDIFICAÇÃO",{fs:9,a:"middle",b:1});
    const cols=Math.min(10,Math.max(1,Math.ceil(Math.sqrt(c.qtd*2)))),rows=Math.ceil(c.qtd/cols)||1;const pw=Math.min(20,200/cols),ph=Math.min(30,120/rows);
    for(let i=0;i<c.qtd&&i<60;i++){const r=Math.floor(i/cols),cc=i%cols;g+=`<rect x="${mx+350-cols*pw/2+cc*pw}" y="${my+150+r*ph}" width="${pw-2}" height="${ph-2}" fill="#2B4A7A" stroke="#fff" stroke-width=".8"/>`}
    g+=S.t(mx+350,my+150+rows*ph+14,`${c.qtd} módulos · ${fmt(c.area)} m²`,{fs:8.5,a:"middle"});
    g+=`<rect x="${mx+250}" y="${my+440}" width="40" height="14" fill="#111"/>`+S.t(mx+300,my+451,"PADRÃO DE ENTRADA / MEDIÇÃO",{fs:8.5,b:1});
    g+=`<rect x="${mx+440}" y="${my+300}" width="16" height="22" fill="#E0A010" stroke="#111"/>`+S.t(mx+462,my+316,"INVERSOR",{fs:8.5,b:1});
    g+=`<circle cx="${mx+330}" cy="${my+mh-35}" r="6" fill="#fff" stroke="#111" stroke-width="1.4"/>`+S.t(mx+340,my+mh-14,"Poste da rede BT",{fs:8});
    g+=S.line(mx+270,my+454,mx+330,my+mh-41,1,"4 3");
    g+=S.t(mx+10,my+20,"Croqui ilustrativo · anexe a imagem de satélite em “Beneficiárias e anexos”",{fs:9,c:"#7A4A00"});
  }
  // norte
  g+=`<g transform="translate(${mx+mw-50},${my+50})"><circle r="28" fill="#fff" stroke="#111"/><path d="M0 -24 L9 10 L0 4 L-9 10 Z" fill="#111"/>${S.t(0,-30,"N",{fs:12,a:"middle",b:1})}</g>`;
  // painel direito
  const rx=740;
  g+=S.rect(rx,my,319,250,"#fff",1.2)+S.t(rx+8,my+16,"LOCALIZAÇÃO",{fs:10,b:1});
  // mini mapa esquemático com coordenadas
  g+=`<rect x="${rx+10}" y="${my+26}" width="299" height="140" fill="#EEF0EA" stroke="#999"/>`;
  for(let i=1;i<6;i++){g+=S.line(rx+10+i*50,my+26,rx+10+i*50,my+166,.4)+(i<3?S.line(rx+10,my+26+i*46,rx+309,my+26+i*46,.4):"")}
  g+=`<circle cx="${rx+160}" cy="${my+96}" r="7" fill="#C0392B" stroke="#fff" stroke-width="2"/>`+S.t(rx+172,my+92,`${fmt(n(P.lat),5)}`,{fs:8.5,b:1})+S.t(rx+172,my+104,`${fmt(n(P.lon),5)}`,{fs:8.5,b:1});
  g+=S.lines(rx+10,my+184,[`${esc(P.cidade||"")} – ${esc(P.uf||"")}`,`${esc(P.bairro||"")} · CEP ${esc(P.cep||"")}`,`Google Maps: ${fmt(n(P.lat),6).replace(",",".")}, ${fmt(n(P.lon),6).replace(",",".")}`],{fs:9,lh:14});
  g+=S.rect(rx,my+262,319,278,"#fff",1.2)+S.t(rx+8,my+278,"QUADRO DE INFORMAÇÕES",{fs:10,b:1});
  const info=[["UC",P.uc],["Titular",P.nome],["Potência instalada",fmt(c.pinst)+" kW"],["Módulos",`${c.qtd} × ${P.mP||""} Wp`],["Área do arranjo",fmt(c.area)+" m²"],["Inversor",`${P.iFab||""} ${P.iMod||""}`],["Telhado",`${P.telhado||""} · ${P.orient||""} · ${P.incl||""}°`],["Local do inversor",P.locInv],["Padrão",`${P.padrao||""} · ${P.ramal||""}`]];
  info.forEach((r,i)=>{g+=S.t(rx+8,my+300+i*25,esc(r[0]),{fs:8})+S.t(rx+8,my+312+i*25,esc(String(r[1]??"").slice(0,52)),{fs:9,b:1})});
  g+=carimbo(20,H-118,W-40,96,"Planta de situação e localização","01/01");
  return [`<div class="sheet land"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${g}</svg></div>`];
}

function docPlaca(){
  return [`<div class="sheet">${hdr("Placa de advertência","Sinalização do padrão de entrada · Micro e minigeração distribuída")}
  <p>Fixar junto à caixa de medição, em local visível, de forma permanente. Material: PVC ou alumínio, espessura mínima 1 mm, resistente a intempéries. Dimensões de referência: 25 × 18 cm (confirme na revisão vigente da NT.020.EQTL).</p>
  <div style="display:flex;justify-content:center;margin:24px 0">
  <svg viewBox="0 0 500 360" width="500" height="360" xmlns="http://www.w3.org/2000/svg">
   <rect x="2" y="2" width="496" height="356" rx="10" fill="#FFD200" stroke="#111" stroke-width="4"/>
   <rect x="16" y="16" width="468" height="328" rx="6" fill="none" stroke="#111" stroke-width="2"/>
   <path d="M250 40 L320 160 L180 160 Z" fill="#111"/><path d="M250 62 L302 150 L198 150 Z" fill="#FFD200"/>
   <path d="M256 78 L234 120 L250 120 L240 146 L268 104 L252 104 L262 78 Z" fill="#111"/>
   <text x="250" y="210" text-anchor="middle" font-size="44" font-weight="700" font-family="Arial,sans-serif" fill="#111">CUIDADO</text>
   <text x="250" y="254" text-anchor="middle" font-size="27" font-weight="700" font-family="Arial,sans-serif" fill="#111">RISCO DE CHOQUE ELÉTRICO</text>
   <rect x="40" y="276" width="420" height="50" fill="#111"/>
   <text x="250" y="311" text-anchor="middle" font-size="28" font-weight="700" font-family="Arial,sans-serif" fill="#FFD200">GERAÇÃO PRÓPRIA</text>
  </svg></div>
  <table>${tr("Unidade consumidora",val("uc"),"Potência instalada",fmt(calc().pinst)+" kW")}${tr("Endereço",`${val("end")} – ${val("bairro")} – ${val("cidade")}/${val("uf")}`)}</table>
  ${foot("Placa de advertência",1,1)}</div>`];
}

function docBenef(c){
  const rows=c.benef;
  return [`<div class="sheet">${hdr("Lista de unidades consumidoras beneficiárias","Rateio dos créditos · "+val("modalidade"))}
  <table>${tr("UC geradora",val("uc"),"Titular",val("nome"))}${tr("Potência instalada",fmt(c.pinst)+" kW","Geração estimada",fmt(c.gerMes,0)+" kWh/mês")}</table>
  <table><tr><th>#</th><th>Nº da UC</th><th>Titular</th><th>Endereço</th><th>% dos créditos</th><th>kWh/mês est.</th></tr>
  ${rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td class="v">${esc(r[0])}</td><td class="v">${esc(r[1]||"")}</td><td class="v">${esc(r[2]||"")}</td><td class="v">${esc(r[3]||"")}</td><td class="v">${fmt(c.gerMes*n(r[3])/100,0)}</td></tr>`).join(""):`<tr><td colspan="6">Nenhuma beneficiária informada.</td></tr>`}
  <tr><th colspan="4">Total</th><td class="v">${fmt(rows.reduce((a,r)=>a+n(r[3]),0),1)} %</td><td></td></tr></table>
  <p>As unidades listadas pertencem ao mesmo titular ou integram consórcio, cooperativa, condomínio ou associação, conforme a modalidade declarada (Lei 14.300/2022).</p>
  <div class="sign" style="margin-top:40px"><div style="position:relative">${assinaCli()&&assinRT?`<span style="position:absolute;left:50%;transform:translateX(-50%);top:-50px;white-space:nowrap">p.p. ${imgAssin("height:48px;vertical-align:bottom")}</span>`:""}${val("nome")}<br>Titular da UC geradora</div></div>
  ${foot("Lista de beneficiárias",1,1)}</div>`];
}

function docCheck(c){
  const items=[
   ["Formulário de solicitação de orçamento de conexão (ANEXO "+c.anexoForm+"), assinado",1,"Gerado"],
   ["ART/TRT de projeto e execução, assinada pelo RT e pelo contratante, com registro ativo",1,"RT"],
   ["Memorial técnico descritivo",1,"Gerado"],["Diagrama unifilar (PDF; CAD quando solicitado)",1,"Gerado"],
   ["Diagrama de blocos",c.anexo==="II","Gerado"],["Planta de situação georreferenciada e layout do arranjo",c.anexo==="II","Gerado"],
   ["Datasheets do módulo e do inversor",1,"Fabricante"],["Certificado / registro INMETRO do inversor (NBR 16149, 16150, IEC 62116)",1,"Fabricante"],
   ["Certificado / registro INMETRO dos módulos",1,"Fabricante"],["Fotos do padrão de entrada (caixa de medição) e do local do inversor",1,"Campo"],
   ["Documento de identificação do titular (RG/CNH ou CNPJ e contrato social)",1,"Cliente"],["Procuração do titular para o responsável pelo protocolo",1,"Cliente"],
   ["Lista de UCs beneficiárias com percentuais",P.modalidade!=="Autoconsumo local","Gerado"],
   ["Instrumento jurídico de solidariedade (consórcio, cooperativa, condomínio)",P.modalidade.includes("compartilhada")||P.modalidade.includes("EMUC"),"Cliente"],
   ["Contrato de aluguel/arrendamento do telhado ou do terreno",P.arrend==="Sim","Cliente"],
   ["Formulário de troca de padrão / aumento de carga",P.mudaPadrao==="Sim"||P.tipoSolic.includes("com aumento")||P.tipoSolic.includes("nova"),"Gerar no portal"],
   ["Placa de advertência instalada (verificada na vistoria)",1,"Gerado"]
  ].filter(i=>i[1]);
  return [`<div class="sheet">${hdr("Checklist de protocolo","Equatorial Goiás · Portal de Geração Distribuída / Agência Virtual")}
  <table><tr><th style="width:26px">#</th><th>Documento</th><th style="width:90px">Origem</th><th style="width:50px">OK</th></tr>
  ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${it[0]}</td><td>${it[2]}</td><td style="text-align:center">${it[2]==="Gerado"?"<span class='x'>[X]</span>":"<span class='x'>[&nbsp;]</span>"}</td></tr>`).join("")}</table>
  <h2>Prazos de referência (REN ANEEL 1.000/2021)</h2>
  <table><tr><th>Etapa</th><th>Prazo</th></tr><tr><td>Emissão do orçamento de conexão – microgeração sem obras</td><td class="v">15 dias</td></tr><tr><td>Emissão do orçamento – com obras na rede</td><td class="v">30 dias</td></tr><tr><td>Solicitação de vistoria após o orçamento</td><td class="v">até 120 dias</td></tr><tr><td>Realização da vistoria</td><td class="v">7 dias</td></tr><tr><td>Aprovação do ponto de conexão / troca do medidor</td><td class="v">7 dias após vistoria aprovada</td></tr></table>
  <h2>Resumo técnico</h2><table>${tr("Potência instalada",fmt(c.pinst)+" kW ("+c.categoria+")","Formulário","Anexo "+c.anexo)}${tr("Gerador",`${c.qtd} × ${val("mP")} Wp = ${fmt(c.pcc)} kWp`,"Inversor",`${val("iFab")} ${val("iMod")}`)}${tr("Geração estimada",fmt(c.gerMes,0)+" kWh/mês","Cobertura do consumo",fmt(c.cobertura,0)+" %")}</table>
  ${foot("Checklist de protocolo",1,1)}</div>`];
}
const BUILD={form:docForm,memo:docMemo,unif:docUnif,blocos:docBlocos,planta:docPlanta,placa:docPlaca,benef:docBenef,check:docCheck};
