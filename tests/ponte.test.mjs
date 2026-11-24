// Favorito Preencher Equatorial: mesmo sem pasta escolhida, a janelinha gera os PDFs e manda para a Equatorial.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav;
before(async () => { srv = await iniciar(); nav = await chromium.launch() });
after(async () => { await nav?.close(); srv?.fechar() });

test("ponte sem pasta escolhida gera os documentos e envia", { timeout: 120000 }, async () => {
  const ctx = await nav.newContext(), p0 = await ctx.newPage();
  await p0.goto(srv.url + "/"); await p0.waitForFunction(() => typeof afterLoad === "function");
  await p0.evaluate(() => { P = { ...EXAMPLE, iReg: "", mReg: "" }; store("hgo_current", P) });
  const p = await ctx.newPage(), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/?ponte=1"); await p.waitForSelector("#pst");
  await p.evaluate(() => { const fr = document.createElement("iframe"); document.body.appendChild(fr); fr.contentWindow.postMessage = (d) => { window.__got = d }; window.dispatchEvent(new MessageEvent("message", { data: { tipo: "hgo-pronto" }, origin: "https://go.equatorialenergia.com.br", source: fr.contentWindow })) });
  await p.waitForFunction(() => window.__got, null, { timeout: 90000 });
  const nomes = await p.evaluate(() => window.__got.arquivos.map((a) => a.nome));
  assert.ok(nomes.includes("01_Formulario_Solicitacao.pdf"), nomes.join(","));
  assert.ok(nomes.includes("03_Diagrama_Unifilar.pdf"));
  assert.deepEqual(erros, []);
});
