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
