// Regras de negócio do app, rodando o index.html de verdade num navegador sem login.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav, pag, erros = [];

before(async () => {
  srv = await iniciar();
  nav = await chromium.launch();
  pag = await nav.newPage();
  pag.on("pageerror", (e) => erros.push(e.message));
  await pag.goto(srv.url + "/");
  await pag.waitForFunction(() => typeof calc === "function");
});
after(async () => { await nav?.close(); srv?.fechar() });

// projeto base coerente; cada teste muda só o que interessa
const base = () => pag.evaluate(() => {
  P = { ...BLANK, nome: "FULANO DE TESTE", doc: "529.982.247-25", uc: "123456", end: "RUA 1", cidade: "INHUMAS",
    mP: 620, mQ: 20, iP: 10, iQ: 1, iFases: "Monofásico 220 V", ligacao: "Monofásico", disj: 63, iReg: "001234/2024", _conferido: true };
  artArq = null; trtInfo = null;
});
const conf = () => pag.evaluate(() => conferenciaCruzada(calc()));
const tem = (lista, sev, re) => lista.some(([s, t]) => s === sev && re.test(t));

test("o app abre sem erro de JavaScript", () => assert.deepEqual(erros, []));

test("inversor trifásico leva a UC para trifásica 380/220 V", async () => {
  await base();
  const r = await pag.evaluate(() => { P.iFases = "Trifásico 380/220 V"; const m = ajustaLigacao(); return [m, P.ligacao, P.tensao] });
  assert.deepEqual(r, [true, "Trifásico", "380/220 V"]);
});

test("UC monofásica com inversor trifásico bloqueia o Gerar todos", async () => {
  await base();
  await pag.evaluate(() => { P.iFases = "Trifásico 380/220 V"; P._ligManual = true });
  assert.ok(tem(await conf(), "bad", /Inversor trifásico/));
});

test("disjuntor de entrada nunca abaixo de 40 A", async () => {
  const r = await pag.evaluate(() => [disjPadrao(25), disjPadrao(32), disjPadrao(40), disjPadrao(45), Math.min(...BRK_UC)]);
  assert.deepEqual(r, [40, 40, 40, 50, 40]);
});

test("disjuntor vazio e dados do titular faltando bloqueiam", async () => {
  await base();
  await pag.evaluate(() => { P.disj = ""; P.uc = "" });
  const c = await conf();
  assert.ok(tem(c, "bad", /Disjuntor de entrada vazio/));
  assert.ok(tem(c, "bad", /UC \/ conta contrato/));
});

test("TRT com a potência dos módulos é recusada; com a do inversor passa", async () => {
  await base();
  const modulos = await pag.evaluate(() => { artArq = { nome: "trt.pdf" }; trtInfo = { ok: true, texto: "x", dig: "52998224725", kws: [12.4] }; return conferenciaCruzada(calc()) });
  assert.ok(tem(modulos, "bad", /potência dos módulos/));
  const inversor = await pag.evaluate(() => { trtInfo.kws = [10]; return conferenciaCruzada(calc()) });
  assert.ok(tem(inversor, "ok", /igual à potência dos inversores/));
  assert.ok(!inversor.some(([s]) => s === "bad"));
});

test("TRT de outro CPF é recusada", async () => {
  await base();
  const r = await pag.evaluate(() => { artArq = { nome: "trt.pdf" }; trtInfo = { ok: true, texto: "x", dig: "11111111111", kws: [10] }; return conferenciaCruzada(calc()) });
  assert.ok(tem(r, "bad", /não tem o CPF/));
});

test("dados lidos e não conferidos geram aviso", async () => {
  await base();
  await pag.evaluate(() => { P._conferido = false });
  assert.ok(tem(await conf(), "warn", /ainda não conferidos/));
});

test("contrato nunca entra como procuração", async () => {
  const r = await pag.evaluate(() => {
    P = { ...BLANK, _anexos: { proc: "Contrato Solarcity.pdf" } }; const a = ajustaAnexos(); const sem = !("proc" in P._anexos);
    P = { ...BLANK, _anexos: { proc: "Procuracao assinada.pdf" } }; const b = ajustaAnexos();
    return [a, sem, b, ehContrato("CONTRATO.pdf"), ehContrato("procuração.pdf")];
  });
  assert.deepEqual(r, [true, true, false, true, false]);
});

test("potência usada no formulário é a do inversor (pca), não a dos módulos", async () => {
  await base();
  const c = await pag.evaluate(() => { const c = calc(); return [c.pcc, c.pca, c.pinst] });
  assert.deepEqual(c, [12.4, 10, 10]);
});

test("unifilar, blocos e planta saem em PDF vetorial (texto de verdade, arquivo leve)", { timeout: 120000 }, async () => {
  const r = await pag.evaluate(async () => {
    const out = {};
    for (const id of ["unif", "blocos", "planta"]) { const t = await (await docPdfBlob(id, calc())).text(); out[id] = [t.length, /DIAGRAMA|PLANTA|BLOCOS/.test(t)] }
    return out;
  }).catch((e) => ({ erro: e.message }));
  for (const [id, [tam, temTexto]] of Object.entries(r)) { assert.ok(tam < 600000, `${id} com ${tam} bytes`); assert.ok(temTexto, `${id} sem texto`) }
});
