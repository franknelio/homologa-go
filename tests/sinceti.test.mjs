// Favorito do SINCETI numa imitação da tela real: contratante sem cadastro é cadastrado e selecionado sozinho.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav;
before(async () => { srv = await iniciar(); nav = await chromium.launch() });
after(async () => { await nav?.close(); srv?.fechar() });

test("cadastra o contratante novo e marca o aproveitamento de dados", { timeout: 150000 }, async () => {
  const p = await nav.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/app/view/sight/main.php?form=CadastrarTRT");
  await p.evaluate(() => { window.__HGO_DADOS = { nome: "FULANO DE TESTE", doc: "52998224725", sexo: "M", cep: "75555-000", tipoLog: "RUA", logradouro: "RUA DAS FLORES, Q. 1, L. 2", numero: "S/N", bairro: "CENTRO", cidade: "VICENTINOPOLIS", uf: "GO", tel: "", inicio: "13/11/2026", fim: "15/11/2026", valor: "500,00", atividades: [], kwp: "10,000", obs: "" } });
  await p.addScriptTag({ path: path.resolve(import.meta.dirname, "../public/sinceti.js") });
  await p.click("text=Sim, preencher");
  await p.waitForSelector("text=Fechar", { timeout: 120000 });
  const log = await p.evaluate(() => document.querySelector("#hgoLog").innerText);
  assert.match(log, /Contratante cadastrado/);
  assert.match(await p.evaluate(() => document.getElementById("contratante0_ResultPesquisa").innerText), /FULANO DE TESTE/);
  assert.ok(await p.evaluate(() => document.getElementById("proprietario0_AproveitaDados").checked));
  assert.deepEqual(erros, []);
});

test("painel do favorito tem botão de fechar e some sozinho quando não há o que fazer", { timeout: 60000 }, async () => {
  const p = await nav.newPage();
  await p.goto(srv.url + "/app/view/sight/main.php?form=CadastrarContratantePF");
  await p.addScriptTag({ path: path.resolve(import.meta.dirname, "../public/sinceti.js") });
  await p.waitForSelector("#hgoPainelTrt");
  await p.addScriptTag({ path: path.resolve(import.meta.dirname, "../public/sinceti.js") });
  await p.waitForTimeout(300);
  assert.equal(await p.locator("#hgoPainelTrt").count(), 1);
  await p.waitForSelector("#hgoPainelTrt", { state: "detached", timeout: 20000 });
  await p.addScriptTag({ path: path.resolve(import.meta.dirname, "../public/sinceti.js") });
  await p.click('#hgoPainelTrt button[title="Fechar"]');
  assert.equal(await p.locator("#hgoPainelTrt").count(), 0);
});

test("no próprio app, clicar no botão do favorito só explica (não abre painel)", async () => {
  const p = await nav.newPage();
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof calc === "function");
  await p.evaluate(() => document.querySelectorAll("details.sec").forEach((x) => (x.open = true)));
  await p.click("#bmTrt"); await p.waitForTimeout(500);
  assert.equal(await p.locator("#hgoPainelTrt").count(), 0);
  assert.match(await p.textContent("#toast"), /Arraste/);
});
