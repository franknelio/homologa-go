// Rateio: tabela de UCs e % no app (entrada rápida e formulário) e Guia 2 assinada no formulário de solicitação.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav;
before(async () => { srv = await iniciar(); nav = await chromium.launch() });
after(async () => { await nav?.close(); srv?.fechar() });

test("rateio: digita UCs e % na tabela e sai na Guia 2 do formulário, assinada", async () => {
  const p = await nav.newPage({ viewport: { width: 390, height: 844 } }), erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(srv.url + "/"); await p.waitForFunction(() => typeof ratEditor === "function");
  // entrada rápida: escolher autoconsumo remoto mostra a tabela com a UC geradora
  await p.click('#qMod [data-qmod="Autoconsumo remoto"]');
  const rapida = await p.evaluate(() => ({ vis: !document.querySelector("#qRatBox").hidden, ger: !!document.querySelector("#qRatTab [data-rg]"), linhas: document.querySelectorAll("#qRatTab input[data-rc='0']").length }));
  assert.deepEqual(rapida, { vis: true, ger: true, linhas: 1 });
  await p.fill("#qRatTab [data-rg]", "60"); await p.fill("#qRatTab input[data-rc='0']", "1234567"); await p.fill("#qRatTab input[data-rc='3']", "40");
  assert.match(await p.textContent("#qRatTab .ratSoma"), /100,00%/);
  // formulário: tabela no lugar do texto
  const r = await p.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 300; c.height = 100; const g = c.getContext("2d"); g.lineWidth = 4; g.beginPath(); g.moveTo(10, 80); g.lineTo(290, 20); g.stroke();
    assinRT = c.toDataURL("image/png");
    P = { ...EXAMPLE, modalidade: "Autoconsumo remoto", benef: "" }; syncForm();
    const tab = document.querySelector("#ratTab");
    tab.querySelector("[data-radd]").click(); tab.querySelector("[data-radd]").click();
    const set = (i, c, v) => { const el = tab.querySelectorAll(`input[data-rc="${c}"]`)[i]; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })) };
    set(0, 0, P.uc); set(0, 3, "70"); set(1, 0, "9876543"); set(1, 1, "JOÃO DA SILVA"); set(1, 3, "30");
    const html = BUILD.form(calc()).join("");
    const guia = html.slice(html.indexOf("Guia 2"));
    return { benef: P.benef.split("\n").length, soma: tab.querySelector(".ratSoma").textContent, guia: /Guia 2/.test(html), ger: /70,00 %/.test(guia), outra: /9876543/.test(guia) && /30,00 %/.test(guia), dup: guia.split(P.uc).length - 1, assin: guia.includes(assinRT) };
  });
  assert.deepEqual(r, { benef: 2, soma: "Soma: 100,00%", guia: true, ger: true, outra: true, dup: 2, assin: true });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  assert.deepEqual(erros, []);
});
