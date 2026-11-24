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
