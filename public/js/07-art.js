"use strict";
/* ---------------- ART/TRT assinada: carimba a assinatura do RT (e pelo cliente) no PDF anexado ---------------- */
let artArq=null; // {nome, buf}
function kv(op,k,v){return new Promise((ok,erro)=>{const r=indexedDB.open("hgo-arq",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onerror=()=>erro(r.error);r.onsuccess=()=>{try{const t=r.result.transaction("kv",op==="get"?"readonly":"readwrite").objectStore("kv");
  const q=op==="get"?t.get(k):t.put(v,k);q.onsuccess=()=>ok(q.result);q.onerror=()=>erro(q.error)}catch(e){erro(e)}}})}
async function guardarArt(f){artArq={nome:f.name,tipo:"application/pdf",buf:await f.arrayBuffer()};analisarTRT();if(P._id){kv("put","art:"+P._id,artArq).catch(()=>{});anexoPut(P._id,"art",artArq).catch(()=>{})}}
async function carregarArt(){artArq=null;trtInfo=null;if(P._id)artArq=await kv("get","art:"+P._id).catch(()=>null)||await anexoGet(P._id,"art","ART_TRT.pdf").catch(()=>null)||null;analisarTRT()}
// lê o texto da TRT anexada (PDF do SINCETI) para conferir com o projeto: CPF do contratante e potência (kW)
let trtInfo=null;
async function analisarTRT(){
  trtInfo=null;if(!artArq||!artArq.buf||!window.pdfjsLib){render();return}
  try{const pdf=await pdfjsLib.getDocument({data:new Uint8Array(artArq.buf.slice(0))}).promise;let t="";
    for(let i=1;i<=Math.min(pdf.numPages,4);i++){const tc=await (await pdf.getPage(i)).getTextContent();t+=" "+tc.items.map(x=>x.str).join(" ")}
    const dig=t.replace(/\D/g,"");
    const kws=[...t.matchAll(/(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:kWp|kW|KWP|KW)\b/g)].map(m=>parseFloat(m[1].replace(",",".")));
    const qtd=[...t.matchAll(/Quantidade[^\d]{0,40}(\d{1,4}[.,]\d{1,3})/gi)].map(m=>+m[1].replace(",","."));
    trtInfo={ok:true,texto:t.length>50,dig,kws:[...new Set([...kws,...qtd])].filter(x=>x>0&&x<10000)};
  }catch(e){trtInfo={ok:false,erro:e.message}}
  render();
}
function carregarScript(src){return new Promise((ok,erro)=>{if(document.querySelector(`script[src="${src}"]`))return ok();const e=document.createElement("script");e.src=src;e.onload=ok;e.onerror=()=>erro(new Error("não carregou "+src));document.head.appendChild(e)})}
// procura no PDF onde assinar: o nome do RT e o do cliente (ou os rótulos "Assinatura do profissional/contratante")
async function locaisAssinatura(buf){
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise,out=[];
  const nm=s=>SEMAC(UP(s)).replace(/[^A-Z ]/g," ").replace(/\s+/g," ").trim();
  const chave=s=>{const w=nm(s).split(" ").filter(x=>x.length>2);return w.length>=2?[w[0],w[w.length-1]]:w};
  const alvos=[{q:"rt",k:chave(P.rtNome)},{q:"cli",k:chave(P.nome)}];
  for(let pg=pdf.numPages;pg>=1&&out.length<2;pg--){
    const page=await pdf.getPage(pg),tc=await page.getTextContent();
    const usados=[],itens=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({s:nm(it.str),x:it.transform[4],y:it.transform[5],w:it.width,h:Math.abs(it.transform[3])||8}));
    for(const a of alvos){
      if(out.some(o=>o.q===a.q)||!a.k.length)continue;
      // ocorrência mais baixa da página (as linhas de assinatura ficam no fim)
      // quando o cliente é o próprio RT (mesmo nome) cada assinatura precisa de uma ocorrência diferente,
      // de preferência na mesma linha da outra assinatura (as duas ficam lado a lado no fim da TRT)
      const livre=it=>!usados.includes(it),outra=out.find(o=>o.pg===pg);
      const perto=l=>outra?l.filter(i=>Math.abs(i.y-outra.it.y)<30).concat(l.filter(i=>Math.abs(i.y-outra.it.y)>=30)):l;
      const ac=perto(itens.filter(it=>livre(it)&&a.k.every(w=>it.s.includes(w))).sort((p1,p2)=>p1.y-p2.y));
      let it=ac[0];
      if(!it){const lab=itens.filter(i=>livre(i)&&/ASSINATURA/.test(i.s)&&(a.q==="rt"?/PROFISSIONAL|TECNICO|RESPONSAVEL/.test(i.s):/CONTRATANTE|PROPRIETARIO|CLIENTE/.test(i.s))).sort((p1,p2)=>p1.y-p2.y);it=lab[0]}
      if(it){usados.push(it);out.push({q:a.q,pg,it,x:it.x+it.w/2,y:it.y+it.h+1})}
    }
    if(out.length&&out.length<2&&pg<pdf.numPages)break;
  }
  return out;
}
async function artAssinadaBlob(){
  if(!artArq)throw new Error("anexe a ART/TRT em PDF");
  if(!assinRT)throw new Error("envie a imagem da assinatura em Responsável técnico");
  if(!/\.pdf$/i.test(artArq.nome))throw new Error("a ART/TRT precisa estar em PDF para ser assinada");
  const locais=await locaisAssinatura(artArq.buf);
  if(!locais.length)throw new Error("não encontrei o local das assinaturas no PDF");
  await carregarScript("vendor/pdf-lib.min.js");
  const doc=await PDFLib.PDFDocument.load(artArq.buf.slice(0)),png=await doc.embedPng(assinRT);
  const W=110,H=W*png.height/png.width;
  for(const l of locais){if(l.q==="cli"&&!assinaCli())continue;const pg=doc.getPage(l.pg-1);pg.drawImage(png,{x:l.x-W/2,y:l.y-H*0.08,width:W,height:H})}
  return new Blob([await doc.save()],{type:"application/pdf"});
}
document.addEventListener("click",async e=>{
  if(!e.target.closest("#bArtSig"))return;
  try{toast("Assinando a ART/TRT…");await saveFile(`00_ART_TRT_assinada_${slug()}.pdf`,await artAssinadaBlob())}catch(err){toast("ART/TRT: "+err.message)}
});

// pedido para o Claude do Chrome preencher a TRT no SINCETI (ele para antes de emitir)
// potência da TRT = potência dos inversores (kW CA), a mesma do formulário: a Equatorial reprova se a TRT diz o kWp dos módulos
function pedidoTRT(){
  const c=calc(),v=x=>String(x??"").trim()||"(não informado, pergunte)";
  const end=[P.end,P.bairro,P.cidade&&`${P.cidade} - ${P.uf||"GO"}`,P.cep&&"CEP "+P.cep].filter(Boolean).join(", ");
  return `Estou logado no SINCETI (servicos.sinceti.net.br). Preencha uma nova TRT com os dados abaixo.
REGRAS: não clique em emitir, gerar boleto, pagar ou finalizar. Quando tudo estiver preenchido, pare e me mostre o resumo para eu conferir. Se um campo pedir algo que não está aqui, ou se uma opção não existir igual, me pergunte em vez de inventar.

PROFISSIONAL: ${v(P.rtNome)} · ${v(P.rtTit)} · ${v(P.rtReg)}

CONTRATANTE (proprietário da obra)
- Nome: ${v(P.nome)}
- CPF/CNPJ: ${v(P.doc)}
- Telefone: ${v(P.tel)} · E-mail: ${v(P.email)}
- Endereço: ${v(end)}

OBRA / SERVIÇO
- Endereço: ${v(end)}
- Coordenadas: ${P.lat&&P.lon?`${n(P.lat).toFixed(6)}, ${n(P.lon).toFixed(6)}`:"(não informado)"}
- Unidade consumidora Equatorial: ${v(P.uc)}
- Finalidade: sistema de microgeração distribuída fotovoltaica conectado à rede da Equatorial Goiás (${c.categoria.toLowerCase()})

TRT (formulário "Preencher Termo de Responsabilidade Técnica")
- Forma de registro: INICIAL · Participação: INDIVIDUAL · Finalidade: ${/rural/i.test(P.classe||"")?"Rural":/comerc/i.test(P.classe||"")?"Comercial":"Residencial"} · Ação institucional: NENHUM
- Observação (copie exatamente): PROJETO DE MICROGERAÇÃO FOTOVOLTAICO CONECTADO A REDE ${fmt(c.pca,c.pca%1?2:0)}kWp. - EXECUÇÃO DE MICROGERAÇÃO FOTOVOLTAICO CONECTADO A REDE ${fmt(c.pca,c.pca%1?2:0)}kWp. - EXECUÇÃO DE CONEXÃO (EQUIPOTENCIALIZAÇÃO) DE MODULOS FOTOVOLTAICOS AO SISTEMA DE ATERRAMENTO. - VISTORIA COM LAUDO TECNICO DE MICROGERAÇÃO FOTOVOLTAICO CONECTADO A REDE ${fmt(c.pca,c.pca%1?2:0)}kWp.

ATIVIDADE CONTRATADA (Adicionar Atividade)
- Nível atividade: 13 - PROJETO · Atividade profissional: 50 - PROJETO E EXECUÇÃO
- Atividades (adicione os 4 códigos): 1761 (Produção de energia > Solar), 1789 (Geração de energia > Solar fotovoltaica), 3096 (Aterramento), 3159 (Sistema de geração distribuída)
- Unidade de medida: kWp - Quilowatt Pico · Quantidade: ${fmt(c.pca,3)}
- Potência do inversor: ${fmt(c.pca,2)} kW (${v(P.iQ)}x ${v(P.iFab)} ${v(P.iMod)})
- Módulos: ${v(P.mQ)}x ${v(P.mFab)} ${v(P.mMod)} de ${v(P.mP)} Wp

CONTRATO (Adicionar Contrato)
- Contratante: marque "Contratante Pessoa ${String(P.doc||"").replace(/\D/g,"").length>11?"Jurídica":"Física"}". No campo ${String(P.doc||"").replace(/\D/g,"").length>11?"CNPJ":"CPF"} que aparece, digite só os números ${String(P.doc||"").replace(/\D/g,"")||"(pergunte)"} devagar, ESPERE a lista de sugestões abrir e CLIQUE no nome ${v(P.nome)}. Confirme que apareceu o quadro INTERESSADO com nome, CPF e endereço, e marque o endereço dele. Se aparecer o botão "Contratante não encontrado. Clique aqui para cadastrar", clique nele. Abre uma janela "Cadastrar Contratante Pessoa Física": Nacional; Nome ${v(P.nome)}; Sexo: ${dadosTRT().sexo==="F"?"Feminino":"Masculino"}; Email: deixe em branco; País Brasil; CEP ${v(P.cep)} e clique em "Preencher endereço a partir do CEP"; confira Tipo Logradouro, Logradouro, Número, Bairro, Cidade e UF com o endereço da obra; Telefone ${v(P.tel)}; clique em "Cadastrar" dessa janela. Volte ao formulário e confirme que o cliente ficou selecionado no quadro INTERESSADO. Se você não conseguir agir na janela, me avise que eu preencho.
- Proprietário: marque "Aproveita Dados do Contratante" e confirme que o quadro INTERESSADO dele foi preenchido.
- Número do contrato e Celebrado em: deixe em branco
- Início da obra/serviço: ${new Date().toLocaleDateString("pt-BR")} · Previsão de término: ${new Date(Date.now()+2*864e5).toLocaleDateString("pt-BR")}
- Valor da obra/serviço: 500,00
- Preencher endereço: se o endereço do contratante que o SINCETI mostrar for o mesmo da obra, marque "Utilizar Endereço do Contratante" e confira os campos; senão marque "Utilizar Outro Endereço" e preencha o ENDEREÇO DA OBRA (confira com cuidado, só pode ser alterado até 5 dias após o pagamento):
  País BRA - Brasil · CEP ${v(P.cep)} · Tipo ${(String(P.end||"").match(/^(rua|avenida|av\.?|rodovia|estrada|travessa|alameda|praça|fazenda|chácara|sítio|quadra)/i)||["RUA"])[0].toUpperCase()} · Logradouro (sem o tipo e sem o número): ${v(String(P.end||"").replace(/^(rua|avenida|av\.?|rodovia|estrada|travessa|alameda|praça)\s+/i,"").replace(/(,\s*|\s+n[ºo°]\.?\s*)(n[ºo°]\.?\s*)?(\d+|s\/?n)\b.*$/i,""))} · Número ${(String(P.end||"").match(/(?:,\s*|n[ºo°]\.?\s*)(?:n[ºo°]\.?\s*)?(\d+)/i)||[,"S/N"])[1]} · Bairro ${v(P.bairro)}
  (se o endereço for rural sem número, use "S/N" e coloque a referência no complemento)
  Cidade: digite no campo "Pesquise pela cidade" e escolha ${v(P.cidade)} · UF ${P.uf||"GO"} · Telefone ${v(P.tel)}
  Coordenadas (IMPORTANTE: o SINCETI coloca Brasília -15.777074, -47.925623 sozinho; nunca deixe essas): Tipo "Grau Decimal", marque "Quero informar manualmente as coordenadas" e digite latitude ${P.lat?n(P.lat).toFixed(6):"(pergunte)"} e longitude ${P.lon?n(P.lon).toFixed(6):"(pergunte)"}

NO FIM: não digite o código de validação e não clique em "Cadastrar". Pare e me avise.`;
}
// dados para o favorito "Preencher TRT" (public/sinceti.js), que preenche o SINCETI direto na página
function dadosTRT(){
  const c=calc(),end=String(P.end||"").trim(),hoje=new Date(),d2=new Date(Date.now()+2*864e5),br=x=>x.toLocaleDateString("pt-BR");
  const tipos=/^(rua|avenida|av\.?|rodovia|estrada|travessa|alameda|praça|fazenda|chácara|sítio|quadra|setor|residencial|loteamento|vila|condominio|condomínio|povoado|distrito)\s+/i;
  const tm=end.match(tipos),tipo=tm?tm[1].toUpperCase().replace(/^AV\.?$/,"AVENIDA").replace("PRAÇA","PRAçA").replace("CHÁCARA","CHáCARA").replace("SÍTIO","SíTIO").replace("CONDOMÍNIO","CONDOMINIO"):"RUA";
  const semTipo=end.replace(tipos,""),num=(semTipo.match(/(?:,\s*|\s+n[ºo°]\.?\s*)(?:n[ºo°]\.?\s*)?(\d+[A-Za-z]?)/i)||[])[1];
  const logr=semTipo.replace(/(,\s*|\s+n[ºo°]\.?\s*)(n[ºo°]\.?\s*)?(\d+[A-Za-z]?|s\/?n)\b.*$/i,"").replace(/,\s*$/,"").trim();
  const cl=String(P.classe||"");
  const pn=String(P.nome||"").trim().split(/\s+/)[0].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const sexo=/^(LUCA|JOSHUA|ISAIA|JONA|ELIA|MATIA|NICOLA|BATISTA)S?$/.test(pn)?"M":/(A|ANE|ENE|ETE|ICE|INE|ELE|ILDE|IS|Y|EL)$/.test(pn)&&!/^(MANUEL|MIGUEL|DANIEL|GABRIEL|RAFAEL|SAMUEL|ISRAEL|NATANAEL|EMANUEL|ABEL|JOEL|MOISES|LUIS|DENIS|LUIZ|JOSE|ALEXIS|ELIS)$/.test(pn)?"F":"M";
  return {nome:P.nome||"",sexo,doc:String(P.doc||"").replace(/\D/g,""),tel:P.tel||"",kwp:fmt(c.pca,3),
    finalidade:/rural/i.test(cl)?"30":/comerc/i.test(cl)?"17":/indust/i.test(cl)?"23":"29",
    obs:`PROJETO DE MICROGERAÇÃO FOTOVOLTAICO CONECTADO A REDE ${fmt(c.pca,c.pca%1?2:0)}kWp. - EXECUÇÃO DE MICROGERAÇÃO FOTOVOLTAICO CONECTADO A REDE ${fmt(c.pca,c.pca%1?2:0)}kWp. - EXECUÇÃO DE CONEXÃO (EQUIPOTENCIALIZAÇÃO) DE MODULOS FOTOVOLTAICOS AO SISTEMA DE ATERRAMENTO. - VISTORIA COM LAUDO TECNICO DE MICROGERAÇÃO FOTOVOLTAICO CONECTADO A REDE ${fmt(c.pca,c.pca%1?2:0)}kWp.`,
    atividades:["1761","1789","3096","3159"],inicio:br(hoje),fim:br(d2),valor:"500,00",
    cep:String(P.cep||"").replace(/\D/g,"").replace(/^(\d{5})(\d{3})$/,"$1-$2"),tipoLog:tipo,logradouro:logr.toUpperCase(),numero:num||"S/N",
    bairro:String(P.bairro||"").toUpperCase(),cidade:P.cidade||"",uf:(P.uf||"GO").toUpperCase(),
    lat:P.lat?n(P.lat).toFixed(6):"",lon:P.lon?n(P.lon).toFixed(6):""};
}
document.addEventListener("click",async e=>{
  if(!e.target.closest("#bTrt"))return;
  const dd=JSON.stringify(dadosTRT());
  const t=`PRIMEIRO: execute este JavaScript na aba do SINCETI (página "Preencher Termo de Responsabilidade Técnica", já com "Li e Compreendi" clicado). Ele preenche o formulário inteiro sozinho e mostra um quadro laranja no canto com o resultado:\n\nwindow.__HGO_DADOS=${dd};var s=document.createElement('script');s.src='https://homologa-go.vercel.app/sinceti.js?'+Date.now();document.body.appendChild(s);\n\nEspere uns 30 segundos, leia o quadro laranja e resolva você mesmo os itens marcados com ⚠ (por exemplo, cadastrar o contratante se ele não existir: sem e-mail, sexo ${dadosTRT().sexo==="F"?"Feminino":"Masculino"}, endereço da obra). NÃO peça ao usuário para preencher nada: ele só digita o código de validação (CAPTCHA) e clica em Cadastrar. Se não conseguir executar JavaScript, preencha seguindo o pedido abaixo.\n\n`+pedidoTRT()+"\n\nHGO-TRT:"+dd;
  try{await navigator.clipboard.writeText(t);alert("Dados da TRT copiados.\n\nNo SINCETI: TRT → Preencher Termo de Responsabilidade Técnica → \"Li e Compreendi\" → clique no favorito \"Preencher TRT\" (barra de favoritos). Ele preenche tudo em segundos; você confere, digita o código e cadastra.\n\nSem o favorito: cole (Ctrl+V) no Claude do Chrome.")}
  catch(err){prompt("Copie o texto abaixo (Ctrl+C):",t)}
});

// ao trocar fabricante, modelo ou potência do módulo/inversor, busca de novo o registro INMETRO dos dois
document.addEventListener("change",e=>{
  const k=e.target.dataset&&e.target.dataset.k;if(!/^(i|m)(Fab|Mod|P)$/.test(k||""))return;
  setTimeout(()=>{["i","m"].forEach(t=>{if(t===k[0]||!P[t+"Reg"]){if(t===k[0]){P[t+"Reg"]="";delete P["_inm"+t];syncForm()}if(P[t+"Fab"]&&P[t+"Mod"]&&!inmBusca[t])buscarInmetro(t)}})},300);
});
