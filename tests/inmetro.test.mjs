// Registro INMETRO já encontrado antes: o app usa o guardado e não consulta o site de novo.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav;
before(async () => { srv = await iniciar(); nav = await chromium.launch() });
after(async () => { await nav?.close(); srv?.fechar() });

test("busca do INMETRO usa o registro guardado e só vai ao site quando não tem", async () => {
  const p = await nav.newPage(), erros = [];
  let site = 0;
  p.on("pageerror", (e) => erros.push(e.message));
  await p.route("**/api/inmetro?fab=*", (r) => { site++; r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, encontrado: { registro: "016748/2024", modelo: "SUN-6K-G05P1-EU-AM2", situacao: "Ativo", empresa: "DEYE" }, opcoes: [], total: 1, consultados: 1 }) }) });
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof buscarInmetro === "function");
  const r = await p.evaluate(async () => {
    sessao = { user: { id: "u1" }, access_token: "x" };
    store("hgo_inm", { [chaveInm("Deye", "SUN-6K-G05P1-EU-CM2")]: { t: "i", fab: "Deye", mod: "SUN-6K-G05P1-EU-CM2", reg: "016493/2024", modelo: "SUN-6K-G05P1-EU-AM2", situacao: "Ativo" } });
    P = { ...P, iFab: "Deye", iMod: "SUN-6K-G05P1-EU-CM2", iReg: "" }; await buscarInmetro("i");
    const guardado = P.iReg;
    P = { ...P, iFab: "Growatt", iMod: "MIN 6000TL-X", iReg: "" }; await buscarInmetro("i");
    return [guardado, P.iReg, Object.keys(inmSalvos()).length];
  });
  assert.deepEqual(r, ["Registro INMETRO nº 016493/2024", "Registro INMETRO nº 016748/2024", 2]);
  assert.equal(site, 1);
  assert.deepEqual(erros, []);
});

test("datasheet sai da pasta Datasheets pelo modelo, e o lido ganha cópia com nome padrão", async () => {
  const p = await nav.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.route("**/api/ler-datasheet", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ dados: { iFab: "Deye", iMod: "SUN-3.6/4/5/6K-G05P1", iVmax: 550, iNmppt: 2 } }) }));
  await p.route("**/api/inmetro?fab=*", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, encontrado: null, opcoes: [], total: 0, consultados: 0 }) }));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof datasheetAuto === "function");
  const r = await p.evaluate(async () => {
    sessao = { user: { id: "u1" }, access_token: "x" };
    const raiz = await navigator.storage.getDirectory();
    pastaLiberada = async () => raiz;
    const inv = await (await raiz.getDirectoryHandle("Datasheets", { create: true })).getDirectoryHandle("Inversores", { create: true });
    const w = await (await inv.getFileHandle("Deye SUN-6K-G05P1.pdf", { create: true })).createWritable(); await w.write(new Blob(["%PDF-1.4 x"], { type: "application/pdf" })); await w.close();
    fileToImages = async () => [new Blob(["x"], { type: "image/jpeg" })];
    P = { ...P, iFab: "Deye", iMod: "SUN-6K-G05P1-EU-CM2", iVmax: "", iReg: "" };
    const lido = await datasheetAuto("i");
    const nada = await datasheetAuto("m");
    await guardarDatasheet("m", new File(["%PDF m"], "qualquer.pdf"), "JA Solar", "JAM72S30-550/MR");
    const mods = []; for await (const [nm] of (await (await raiz.getDirectoryHandle("Datasheets")).getDirectoryHandle("Modulos")).entries()) mods.push(nm);
    return [lido, nada, P.iMod, P.iVmax, mods];
  });
  assert.deepEqual(r, [true, false, "SUN-6K-G05P1-EU-CM2", 550, ["JA Solar JAM72S30-550 MR.pdf"]]);
  assert.deepEqual(erros, []);
});

test("datasheet guardado na conta volta sozinho em outro aparelho, sem a pasta", async () => {
  const p = await nav.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.route("**/api/ler-datasheet", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ dados: { iVmax: 600, iNmppt: 2 } }) }));
  await p.route("**/api/inmetro?fab=*", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, encontrado: null, opcoes: [], total: 0, consultados: 0 }) }));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof datasheetAuto === "function");
  const r = await p.evaluate(async () => {
    sessao = { user: { id: "u1" }, access_token: "x" }; pastaLiberada = async () => null;
    fileToImages = async () => [new Blob(["x"], { type: "image/jpeg" })];
    await guardarDatasheet("i", new File(["%PDF i"], "ds.pdf", { type: "application/pdf" }), "Solis", "S6-GR1P6K");
    P = { ...P, iFab: "Solis", iMod: "S6-GR1P6K", iVmax: "", iReg: "" };
    return [await datasheetAuto("i"), P.iVmax, Object.keys(dsSalvos())];
  });
  assert.deepEqual(r, [true, 600, ["DS|i|SOLIS|S6GR1P6K"]]);
  assert.deepEqual(erros, []);
});

test("passo a passo para subir na Equatorial abre pelo botão e pelo favorito", async () => {
  const p = await nav.newPage({ viewport: { width: 390, height: 844 } }), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof abrirEnvioEq === "function");
  await p.click("#bEnviarEq");
  const passos = await p.$$eval("#eqBox li", (x) => x.length);
  const link = await p.$eval('#eqBox a[target="_blank"]', (a) => a.href);
  await p.click("#eqBox [data-eqfechar]");
  await p.evaluate(() => document.querySelector("#bmEq").click());
  const reabriu = await p.$("#eqBox");
  const rolagem = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(passos, 4); assert.match(link, /equatorialenergia\.com\.br/); assert.ok(reabriu); assert.equal(rolagem, false);
  assert.deepEqual(erros, []);
});

test("entrada rápida mostra o inversor da biblioteca pela potência", async () => {
  const p = await nav.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof mostraEquipAuto === "function");
  await p.evaluate(() => { store("hgo_equip", { m: {}, i: { "DEYE|SUN-6K-G05P1-EU-CM2": { iFab: "Deye", iMod: "SUN-6K-G05P1-EU-CM2", iP: 6, iVmax: 550, iNmppt: 2, iReg: "Registro INMETRO nº 000774/2026" } } }) });
  await p.fill("#q_iP", "6");
  await p.waitForFunction(() => /biblioteca: Deye SUN-6K-G05P1-EU-CM2/.test(document.querySelector("#q_dsI_n").textContent), null, { timeout: 5000 });
  await p.fill("#q_iP", "8");
  await p.waitForFunction(() => document.querySelector("#q_dsI_n").textContent === "", null, { timeout: 5000 });
  assert.deepEqual(erros, []);
});

test("conferência automática: só para quando algo não bate", async () => {
  const p = await nav.newPage();
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof problemasLeitura === "function");
  const r = await p.evaluate(() => {
    const Q = { nome: "LETICIA RODRIGUES DA SILVA", doc: "701.528.811-74", uc: "4.477.145.012-91", end: "Rua Aroeira, Q. 03", cidade: "Pontalina" };
    const lidos = { ...Q }, imgs = { doc: [1], fat: [1] };
    return [docValido("701.528.811-74"), docValido("701.528.811-75"), docValido("11.222.333/0001-81"),
      problemasLeitura(Q, lidos, imgs, true).length, problemasLeitura({ ...Q, doc: "701.528.811-75" }, lidos, imgs, true).join(";")];
  });
  assert.deepEqual(r, [true, false, true, 0, "CPF/CNPJ inválido (dígitos não conferem)"]);
});

test("pasta já escolhida e bloqueada: pede só a liberação, sem abrir a janela de escolher pasta", async () => {
  const p = await nav.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof pastaBase === "function");
  const r = await p.evaluate(async () => {
    const raiz = await navigator.storage.getDirectory(); idb = async (op) => (op === "get" ? raiz : undefined);
    let picker = 0, perm = "prompt"; window.showDirectoryPicker = async () => { picker++; return raiz };
    FileSystemHandle.prototype.queryPermission = async () => perm;
    FileSystemHandle.prototype.requestPermission = async () => perm;
    const pr = pastaBase(); await new Promise((r) => setTimeout(r, 300));
    const modal = !!document.querySelector("#pastaPerm");
    perm = "granted"; document.querySelector('#pastaPerm [data-pp="ok"]').click();
    const h = await pr;
    return [modal, picker, h === raiz || h.name === raiz.name, !document.querySelector("#pastaPerm")];
  });
  assert.deepEqual(r, [true, 0, true, true]);
  assert.deepEqual(erros, []);
});

test("todos os documentos enviados à Equatorial saem com a assinatura do RT", async () => {
  const p = await nav.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof docPdfBlob === "function");
  const r = await p.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 300; c.height = 100; const g = c.getContext("2d"); g.lineWidth = 4; g.beginPath(); g.moveTo(10, 80); g.bezierCurveTo(80, 0, 150, 100, 290, 20); g.stroke();
    assinRT = c.toDataURL("image/png"); P = { ...EXAMPLE, modalidade: "Autoconsumo remoto", benef: "UC 1;123;Rua;x;50\nUC 2;456;Rua;y;50" };
    const o = {};
    for (const id of ["form", "memo", "unif", "blocos", "planta", "placa", "benef"]) o[id] = BUILD[id](calc()).join("").split(assinRT).length - 1 >= (id === "placa" || id === "benef" ? 2 : 1);
    await docPdfBlob("placa", calc());
    return o;
  });
  assert.deepEqual(r, { form: true, memo: true, unif: true, blocos: true, planta: true, placa: true, benef: true });
  assert.deepEqual(erros, []);
});
