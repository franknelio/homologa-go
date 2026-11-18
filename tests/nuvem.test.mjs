// Sincronização com a nuvem (Supabase simulado em memória): salvar, conflito entre aparelhos, abrir e excluir.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { iniciar } from "./servidor.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
let srv, nav, pag;

before(async () => {
  srv = await iniciar(); nav = await chromium.launch(); pag = await nav.newPage();
  await pag.goto(srv.url + "/");
  await pag.waitForFunction(() => typeof salvarProjeto === "function");
  await pag.evaluate(() => {
    // tabela "projetos" falsa com a mesma interface usada pelo app
    const T = (window.__nuvem = new Map());
    const q = (filtro = {}) => ({
      eq(c, v) { return q({ ...filtro, [c]: v }) },
      order() { return this }, limit() { return Promise.resolve({ data: [...T.values()].map(({ dados, ...r }) => r), error: null }) },
      maybeSingle() { const r = T.get(filtro.id); return Promise.resolve({ data: r ? structuredClone(r) : null, error: null }) },
      single() { return this.maybeSingle() },
    });
    sb = { from: () => ({
      select: () => q(),
      upsert: (r) => { T.set(r.id, structuredClone(r)); return Promise.resolve({ error: null }) },
      delete: () => ({ eq: (c, id) => { T.delete(id); return Promise.resolve({ error: null }) } }),
    }) };
    sessao = { user: { id: "u1" }, access_token: "x" };
    localStorage.removeItem("hgo_projects"); localStorage.removeItem("hgo_excluidos");
  });
});
after(async () => { await nav?.close(); srv?.fechar() });

test("salvar envia para a nuvem e marca a versão sincronizada", async () => {
  const r = await pag.evaluate(async () => {
    P = { ...BLANK, nome: "CLIENTE A", uc: "111" }; delete P._id; await salvarProjeto(true);
    const rec = projects()[P._id]; return [__nuvem.get(P._id)?.nome, rec._pendente, rec._nuvemEm === __nuvem.get(P._id).atualizado_em];
  });
  assert.deepEqual(r, ["CLIENTE A", false, true]);
});

test("alteração feita em outro aparelho não é sobrescrita: vira cópia", async () => {
  const r = await pag.evaluate(async () => {
    const id = P._id, row = __nuvem.get(id);
    __nuvem.set(id, { ...row, nome: "CLIENTE A (TABLET)", dados: { ...row.dados, nome: "CLIENTE A (TABLET)" }, atualizado_em: new Date(Date.now() + 1000).toISOString() });
    P.nome = "CLIENTE A (CELULAR)"; await salvarProjeto(true);
    const nomes = [...__nuvem.values()].map((x) => x.nome).sort();
    return [P.nome, nomes];
  });
  assert.deepEqual(r, ["CLIENTE A (TABLET)", ["CLIENTE A (CELULAR)", "CLIENTE A (TABLET)"]]);
});

test("abrir um projeto traz a versão mais nova da nuvem", async () => {
  const r = await pag.evaluate(async () => {
    const id = P._id, row = __nuvem.get(id);
    __nuvem.set(id, { ...row, dados: { ...row.dados, uc: "999" }, atualizado_em: new Date(Date.now() + 5000).toISOString() });
    return [await versaoNuvem(id)].map((x) => x && x.uc);
  });
  assert.deepEqual(r, ["999"]);
});

test("exclusão sem internet vai para a nuvem quando a conexão volta", async () => {
  const r = await pag.evaluate(async () => {
    const id = P._id, real = sessao; sessao = null; await excluirNuvem(id);
    const antes = __nuvem.has(id) && excluidos().includes(id);
    sessao = real; await sincronizar();
    return [antes, __nuvem.has(id), excluidos().length];
  });
  assert.deepEqual(r, [true, false, 0]);
});

test("edição comum salva sozinha depois de alguns segundos", { timeout: 20000 }, async () => {
  const r = await pag.evaluate(async () => {
    P = { ...BLANK, nome: "CLIENTE B" }; delete P._id; await salvarProjeto(true);
    P.uc = "222"; store("hgo_current", P);
    await new Promise((ok) => setTimeout(ok, 5000));
    return __nuvem.get(P._id)?.uc;
  });
  assert.equal(r, "222");
});
