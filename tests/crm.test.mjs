// CRM → HomologaGO: arquivos do grupo de WhatsApp em formatos diferentes, papel pelo nome ou pela IA, e arquivos que chegam depois.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav, ctx, crm, app, base;
before(async () => {
  srv = await iniciar(); base = srv.url.replace("127.0.0.1", "localhost");
  nav = await chromium.launch(); ctx = await nav.newContext();
  await ctx.route("**/api/ler-documentos", (r) => {
    const tipo = JSON.parse(r.request().postData() || "{}").tipo;
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ dados: tipo === "classificar" ? { tipo: "rg_cnh" } : {} }) });
  });
  crm = await ctx.newPage();
  await crm.goto(base + "/app/view/sight/main.php?form=CRM");
  const [popup] = await Promise.all([ctx.waitForEvent("page"), crm.evaluate((u) => { window.__app = window.open(u + "/?crm=1") }, base)]);
  app = popup; await app.waitForFunction(() => typeof achaArquivos === "undefined" && typeof calc === "function");
  await app.evaluate(() => { sessao = { user: { id: "u1" }, access_token: "x" } });
});
after(async () => { await nav?.close(); srv?.fechar() });

test("RG sem papel (IA classifica), conta por nome em data URL e equipamentos", async () => {
  await crm.evaluate(async (base) => {
    const cv = document.createElement("canvas"); cv.width = 60; cv.height = 40; cv.getContext("2d").fillRect(0, 0, 30, 20);
    const jpg = cv.toDataURL("image/jpeg");
    window.__app.postMessage({ tipo: "hgo-crm-dados", dados: { cliente: "LETICIA TESTE", iP: 6, mP: 620, mQ: 12 },
      midias: [{ fileName: "WhatsApp Image 2026-11-23.jpeg", mimetype: "image/jpeg", base64: jpg.split(",")[1] },
               { name: "conta_luz.pdf", dataUrl: "data:application/pdf;base64," + btoa("%PDF-1.4 teste") }] }, base);
  }, base);
  await app.waitForFunction(() => /RG\/CNH 1, conta 1/.test(document.querySelector("#crmAviso")?.textContent || ""), null, { timeout: 15000 });
  const r = await app.evaluate(() => [document.querySelector("#q_docTit").files[0]?.name, qFiles.map((f) => f.name), document.querySelector("#q_iP").value]);
  assert.deepEqual(r, ["WhatsApp Image 2026-11-23.jpeg", ["conta_luz.pdf"], "6"]);
});

test("arquivo que chega depois entra; contrato nunca vira procuração", async () => {
  await crm.evaluate((base) => {
    window.__app.postMessage({ tipo: "hgo-crm-arquivos", arquivos: [{ nome: "CONTRATO SOLARCITY.pdf", papel: "proc", b64: btoa("%PDF-1.4 c") }, { nome: "fatura2.pdf", b64: btoa("%PDF-1.4 f") }] }, base);
  }, base);
  await app.waitForFunction(() => /conta 2/.test(document.querySelector("#crmAviso")?.textContent || ""), null, { timeout: 15000 });
  const r = await app.evaluate(() => [document.querySelector("#q_proc").files.length, qFiles.length]);
  assert.deepEqual(r, [0, 2]);
});
