// Fluxo completo, do jeito que o usuário trabalha: CRM manda o cliente → app lê RG/CNH e fatura → confere sozinho →
// gera o projeto → "Gerar todos" grava a pasta do cliente → favorito "Preencher Equatorial" num portal de mentira
// preenche e anexa tudo, sem clicar em Enviar. Os endereços reais (homologa-go.vercel.app, CRM, Equatorial)
// são servidos localmente pelo Playwright; a IA, o INMETRO e o mapa são respostas fixas.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const APP = "https://homologa-go.vercel.app", CRM = "https://solarcity-crm.web.app", EQ = "https://go.equatorialenergia.com.br/sua-conta/geracao-distribuida/parecer-de-acesso/";
let srv, nav;
before(async () => { srv = await iniciar(); nav = await chromium.launch() });
after(async () => { await nav?.close(); srv?.fechar() });

// portal da Equatorial de mentira, com os mesmos passos e rótulos do real
const PORTAL = `<!doctype html><html><head><meta charset=utf-8></head><body>
<div id=p1><h3>Digite o CPF / CNPJ</h3><label><input type=checkbox id=lgpd> Li e entendi o Aviso de Privacidade</label>
<label>CPF / CNPJ <input id=cpf placeholder="00000000000"></label><button id=env1>Enviar</button></div>
<div id=p2 hidden><h3>Selecione seu pedido</h3><button>Minigeração distribuída</button><button id=micro>Microgeração distribuída</button></div>
<div id=p3 hidden><button>Pessoa Jurídica</button><button id=pf>Pessoa Física</button></div>
<div id=p4 hidden>
 <h4>Dados do titular da unidade</h4><label>Nome* <input id=tNome></label><label>CPF* <input id=tCpf></label><label>Telefone <input id=tTel></label><label>Celular <input id=tCel></label>
 <h4>Responsável Técnico</h4><label>Nome* <input id=rNome></label><label>CREA/CRT* <input id=rReg></label><label>CPF* <input id=rCpf></label><label>E-mail* <input id=rMail></label><label>Telefone <input id=rTel></label><label>Celular <input id=rCel></label>
 <h4>Dados Técnicos:</h4><label>Disjuntor de entrada (A)* <input id=disj></label>
 <p>Envie abaixo a cópia dos documentos</p>
 <label>Documento de identificação do titular* <input type=file id=fTit></label>
 <label>Procuração <input type=file id=fProc></label>
 <label>Documento de identificação do procurador <input type=file id=fProcDoc></label>
 <label>Formulário de solicitação (ANEXO I)* <input type=file id=fForm></label>
 <label>Memorial técnico descritivo (ANEXO III)* <input type=file id=fMemo></label>
 <label>ART/TRT* <input type=file id=fArt></label>
 <label>Diagrama unifilar* <input type=file id=fUnif></label>
 <label>Diagrama de blocos* <input type=file id=fBlocos></label>
 <label>Relatório de ensaio atestando a conformidade de todos os conversores de potência* <input type=file id=fEnsaio></label>
 <label>Documentos adicionais <input type=file id=fAdic multiple></label>
 <label>E-mail para acompanhamento* <input id=eMail></label><label>Confirme o e-mail* <input id=eConf></label>
 <button id=enviarFinal onclick="window.__enviado=true">Enviar</button>
</div>
<script>
env1.onclick=()=>{if(!lgpd.checked){alert('Aceite os termos');return}if(cpf.value.replace(/\\D/g,'').length===11){p1.hidden=true;p2.hidden=false}};
micro.onclick=()=>{p2.hidden=true;p3.hidden=false};pf.onclick=()=>{p3.hidden=true;p4.hidden=false};
</script></body></html>`;

test("CRM → projeto → Gerar todos → Preencher Equatorial, tudo sozinho", { timeout: 240000 }, async () => {
  const ctx = await nav.newContext({ viewport: { width: 1300, height: 900 } }), erros = [];
  // endereços reais servidos daqui
  await ctx.route(APP + "/**", async (r) => {
    const u = new URL(r.request().url());
    const resp = await fetch(srv.url + u.pathname + u.search);
    r.fulfill({ status: resp.status, headers: { "content-type": resp.headers.get("content-type") || "text/html" }, body: Buffer.from(await resp.arrayBuffer()) });
  });
  await ctx.route(CRM + "/**", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>CRM</title><body>CRM</body>" }));
  await ctx.route("https://go.equatorialenergia.com.br/**", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: PORTAL }));
  // IA, INMETRO e mapa com respostas fixas
  await ctx.route("**/api/ler-documentos", (r) => {
    const t = JSON.parse(r.request().postData() || "{}").tipo;
    const dados = t === "identidade" ? { nome: "LETICIA RODRIGUES DA SILVA", doc: "701.528.811-74", rg: "6053831 SSP GO" }
      : t === "fatura" ? { uc: "4.477.145.012-91", end: "Rua Aroeira, Q. 03, L. 17, S/N", bairro: "Jardim Ipê II", cidade: "Pontalina", cep: "75620-000", ligacao: "Monofásico", classe: "Residencial", disj: "40" }
      : t === "classificar" ? { tipo: "rg_cnh" } : {};
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ dados }) });
  });
  await ctx.route("**/api/inmetro?pdf=*", (r) => r.fulfill({ contentType: "application/pdf", body: "%PDF-1.4 relatorio inmetro" }));
  await ctx.route("**/api/inmetro?fab=*", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, encontrado: null, opcoes: [], total: 0, consultados: 0 }) }));
  await ctx.route("**/api/local*", (r) => r.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await ctx.route("**/api/tile*", (r) => r.fulfill({ status: 404, body: "" }));
  // conta logada, biblioteca do usuário (Deye 6 kW + TSUN 600 W com INMETRO) e pasta dos clientes (OPFS no lugar da pasta do Windows)
  await ctx.addInitScript(() => {
    if (location.origin !== "https://homologa-go.vercel.app") return;
    localStorage.setItem("hgo_equip", JSON.stringify({
      i: { "DEYE|SUN-6K-G05P1-EU-CM2": { iFab: "Deye", iMod: "SUN-6K-G05P1-EU-CM2", iP: 6, iFases: "Monofásico 220 V", iIout: 27.3, iVmax: 550, iNmppt: 2, iMin: 125, iMax: 500, iImax: 13, iIsc: 17, iFp: 1, iEff: 97.6, iDht: 3, iDim: "330 x 457 x 184 mm", iPeso: 12, iIP: "IP65", iReg: "Registro INMETRO nº 000774/2026" } },
      m: { "TSUN|RIO600W-120BIF-2278": { mFab: "TSUN", mMod: "RIO600W-120BIF-2278", mP: 600, mVoc: 52.1, mVmp: 43.6, mIsc: 14.6, mImp: 13.8, mBeta: -0.25, mEff: 22.2, mC: 2.278, mL: 1.134, mPeso: 32, mCel: 120, mTipo: "Bifacial monocristalino", mReg: "Registro INMETRO nº 014057/2025" } } }));
    localStorage.setItem("hgo_rt", JSON.stringify({ rtNome: "FRANKNELIO APARECIDO ALVES SILVA", rtReg: "12345678901", rtCpf: "52998224725", rtEmail: "rt@exemplo.com", rtEmailEq: "rt@exemplo.com", rtTel: "(64) 98111-4051", rtTit: "Técnico em Eletrotécnica" }));
    addEventListener("DOMContentLoaded", () => {
      sessao = { user: { id: "u1", email: "teste@exemplo.com" }, access_token: "x" };
      idb = async (op) => (op === "get" ? navigator.storage.getDirectory() : undefined);
      window.showDirectoryPicker = async () => { window.__picker = (window.__picker || 0) + 1; return navigator.storage.getDirectory() };
    });
  });
  ctx.on("page", (p) => { p.on("pageerror", (e) => erros.push(p.url().slice(0, 40) + " " + e.message)); p.on("dialog", (d) => { if (d.type() === "alert") console.log("ALERTA", d.message().slice(0, 600)); d.accept() }) });

  // 1. CRM abre o app e manda o cliente com os arquivos do grupo de WhatsApp
  const crm = await ctx.newPage(); await crm.goto(CRM + "/");
  const [app] = await Promise.all([ctx.waitForEvent("page"), crm.evaluate((u) => { window.__app = window.open(u + "/?crm=1") }, APP)]);
  await app.waitForFunction(() => typeof achaArquivos === "undefined" && typeof calc === "function" && sessao);
  await crm.evaluate(async (APP) => {
    const img = (txt) => { const c = document.createElement("canvas"); c.width = 400; c.height = 260; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 260); g.fillStyle = "#000"; g.fillText(txt, 20, 40); return c.toDataURL("image/jpeg").split(",")[1] };
    window.__app.postMessage({ tipo: "hgo-crm-dados", dados: { cliente: "LETICIA RODRIGUES DA SILVA", iP: 6, mP: 600, mQ: 8, loc: "-17.5058403, -49.4609514", modalidade: "Autoconsumo local" },
      midias: [{ fileName: "CNH-e.jpeg", mimetype: "image/jpeg", base64: img("CNH") }, { fileName: "fatura equatorial.jpeg", mimetype: "image/jpeg", base64: img("FATURA") },
        { name: "PROCURACAO_EQUATORIAL_LETICIA_assinado.pdf", dataUrl: "data:application/pdf;base64," + btoa("%PDF-1.4 procuracao") }] }, APP);
  }, APP);

  // 2. o app lê, confere sozinho (sem abrir a tela de conferência) e gera o projeto
  await app.waitForFunction(() => P && P.nome === "LETICIA RODRIGUES DA SILVA" && P.uc, null, { timeout: 60000 });
  const proj = await app.evaluate(() => ({ nome: P.nome, doc: P.doc, uc: P.uc, cidade: P.cidade, iMod: P.iMod, mMod: P.mMod, iReg: P.iReg, mReg: P.mReg, est: !!P._equipEst, conf: !!document.querySelector("#confBox"), aviso: checks(calc()).some((x) => /ainda não conferidos/.test(x[1])) }));
  assert.deepEqual(proj, { nome: "LETICIA RODRIGUES DA SILVA", doc: "701.528.811-74", uc: "4.477.145.012-91", cidade: "Pontalina", iMod: "SUN-6K-G05P1-EU-CM2", mMod: "RIO600W-120BIF-2278", iReg: "Registro INMETRO nº 000774/2026", mReg: "Registro INMETRO nº 014057/2025", est: false, conf: false, aviso: false });

  // 3. Gerar todos: grava na subpasta do cliente sem abrir a janela de escolher pasta
  await app.evaluate(() => document.querySelector("#eqBox")?.remove());
  await app.click("#bAll");
  await app.waitForSelector("#eqBox", { timeout: 90000 });
  const pasta = await app.evaluate(async () => { const raiz = await navigator.storage.getDirectory(); const d = await raiz.getDirectoryHandle("LETICIA RODRIGUES DA SILVA"); const L = []; for await (const [n] of d.entries()) L.push(n); return { L: L.sort(), picker: window.__picker || 0 } });
  for (const f of ["01_Formulario_Solicitacao.pdf", "02_Memorial_Descritivo.pdf", "03_Diagrama_Unifilar.pdf", "04_Diagrama_de_Blocos.pdf", "05_Planta_Situacao.pdf", "08_INMETRO_inversor_000774-2026.pdf", "09_Documento_titular_RG_CNH.jpeg", "10_Procuracao.pdf"])
    assert.ok(pasta.L.includes(f), `falta ${f} na pasta: ${pasta.L.join(", ")}`);
  assert.equal(pasta.picker, 0, "abriu a janela de escolher pasta");

  // 4. favorito Preencher Equatorial no portal: preenche, anexa e NÃO envia
  const eq = await ctx.newPage(); await eq.goto(EQ);
  await eq.addScriptTag({ url: APP + "/equatorial.js?" + Date.now() });
  await eq.waitForSelector("#hgoPainelEq button:has-text('Sim, preencher')", { timeout: 90000 });
  await eq.click("#hgoPainelEq button:has-text('Sim, preencher')");
  await eq.waitForFunction(() => /marque "Não sou um robô"/.test(document.querySelector("#hgoEqLog")?.textContent || ""), null, { timeout: 60000 });
  const r = await eq.evaluate(() => {
    const f = (id) => [...document.getElementById(id).files].map((x) => x.name).join("+");
    return { nome: tNome.value, cpf: tCpf.value, rt: rNome.value, disj: disj.value, mail: eMail.value,
      tit: f("fTit"), proc: f("fProc"), procDoc: f("fProcDoc"), form: f("fForm"), memo: f("fMemo"), unif: f("fUnif"), blocos: f("fBlocos"), ensaio: f("fEnsaio"),
      avisos: [...document.querySelectorAll("#hgoEqLog div")].map((d) => d.textContent).filter((t) => /^⚠/.test(t)), enviado: !!window.__enviado };
  });
  assert.equal(r.nome, "LETICIA RODRIGUES DA SILVA"); assert.equal(r.cpf, "70152881174"); assert.equal(r.rt, "FRANKNELIO APARECIDO ALVES SILVA"); assert.ok(+r.disj >= 40); assert.equal(r.mail, "rt@exemplo.com");
  assert.equal(r.tit, "09_Documento_titular_RG_CNH.jpeg"); assert.equal(r.proc, "10_Procuracao.pdf");
  assert.equal(r.form, "01_Formulario_Solicitacao.pdf"); assert.equal(r.memo, "02_Memorial_Descritivo.pdf"); assert.equal(r.unif, "03_Diagrama_Unifilar.pdf"); assert.equal(r.blocos, "04_Diagrama_de_Blocos.pdf");
  assert.equal(r.ensaio, "08_INMETRO_inversor_000774-2026.pdf");
  assert.equal(r.enviado, false);
  assert.deepEqual(r.avisos.filter((a) => !/ART\/TRT/.test(a)), [], "avisos inesperados no portal");
  assert.deepEqual(erros, []);
  await ctx.close();
});
