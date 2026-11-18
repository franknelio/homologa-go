// Etapa 6: situação do projeto, parecer de reprova lido por IA (resposta simulada), biblioteca de equipamentos e busca.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav, pag;
before(async () => {
  srv = await iniciar(); nav = await chromium.launch(); pag = await nav.newPage();
  await pag.route("**/api/ler-documentos", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ dados: {
    protocolo: "2026/123456", data: "05/11/2026",
    motivos: "TRT | Potência da TRT diferente da do formulário | Emitir a TRT com 10 kW\nDiagrama unifilar | Falta o quadro do inversor | Incluir o quadro de proteção CA" } }) }));
  await pag.goto(srv.url + "/");
  await pag.waitForFunction(() => typeof lerReprova === "function");
  await pag.evaluate(() => { localStorage.removeItem("hgo_equip"); localStorage.removeItem("hgo_projects"); sb = null; sessao = { user: { id: "u1" }, access_token: "x" } });
});
after(async () => { await nav?.close(); srv?.fechar() });

test("parecer de reprova vira motivos com correção e a situação muda para Reprovado", async () => {
  const r = await pag.evaluate(async () => {
    P = { ...BLANK, nome: "CLIENTE R", mP: 620, mQ: 20, iP: 10, iQ: 1, disj: 63 };
    await lerReprova({ texto: "Prezado, sua solicitação foi reprovada..." });
    return { sit: P.situacao, prot: P.protocolo, itens: P.reprovas[0].itens, checks: checks(calc()).filter(([, t]) => /^Reprova/.test(t)).length, hist: P._hist.map((h) => h.s) };
  });
  assert.equal(r.sit, "Reprovado"); assert.equal(r.prot, "2026/123456");
  assert.deepEqual(r.itens[1], { doc: "Diagrama unifilar", motivo: "Falta o quadro do inversor", corr: "Incluir o quadro de proteção CA" });
  assert.equal(r.checks, 2); assert.deepEqual(r.hist, ["Reprovado"]);
});

test("protocolado de novo: os avisos da reprova saem do checklist", async () => {
  const n = await pag.evaluate(() => { P.situacao = "Protocolado"; return checks(calc()).filter(([, t]) => /^Reprova/.test(t)).length });
  assert.equal(n, 0);
});

test("biblioteca guarda o equipamento e preenche o próximo projeto pelo modelo", async () => {
  const r = await pag.evaluate(async () => {
    P = { ...BLANK, nome: "CLIENTE C", mFab: "Honor", mMod: "HN21RN-66HT620W", mP: 620, mQ: 20, mVoc: 48.2, mVmp: 40.1, mIsc: 16.2, mImp: 15.5, mReg: "Registro INMETRO nº 012345/2025",
      iFab: "Deye", iMod: "SUN-10K-G05", iP: 10, iQ: 1, iFases: "Trifásico 380/220 V", iVmax: 1000, iNmppt: 2, iMin: 140, iMax: 1000 };
    await guardarEquip();
    P = { ...BLANK, nome: "CLIENTE D", mQ: 12, mMod: "hn21rn-66ht620w", iMod: "SUN-10K-G05" };
    const a = aplicarBiblioteca("m"), b = aplicarBiblioteca("i");
    return [a, b, P.mVoc, P.mReg, P.mQ, P.iVmax, P.ligacao, Object.keys(biblioteca().m).length];
  });
  assert.deepEqual(r, [true, true, 48.2, "Registro INMETRO nº 012345/2025", 12, 1000, "Trifásico", 1]);
});

test("lista de projetos busca por nome, UC e CPF e filtra por situação", async () => {
  const r = await pag.evaluate(async () => {
    store("hgo_projects", {
      a: { _id: "a", nome: "JOSE DA SILVA", uc: "1000111", doc: "529.982.247-25", situacao: "Aprovado", _saved: "2026-11-01T00:00:00Z" },
      b: { _id: "b", nome: "MARIA SOUZA", uc: "2000222", doc: "111.444.777-35", situacao: "Reprovado", _saved: "2026-11-02T00:00:00Z" },
    });
    await openDrawer();
    const nomes = () => [...document.querySelectorAll("#plist .pitem b")].map((b) => b.textContent);
    const todos = nomes();
    document.querySelector("#pbusca").value = "52998"; await listarProjetos(); const cpf = nomes();
    document.querySelector("#pbusca").value = "2000222"; await listarProjetos(); const uc = nomes();
    document.querySelector("#pbusca").value = ""; document.querySelector("#psit").value = "Reprovado"; await listarProjetos(); const sit = nomes();
    return { todos, cpf, uc, sit };
  });
  assert.deepEqual(r, { todos: ["MARIA SOUZA", "JOSE DA SILVA"], cpf: ["JOSE DA SILVA"], uc: ["MARIA SOUZA"], sit: ["MARIA SOUZA"] });
});
