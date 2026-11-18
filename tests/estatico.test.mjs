// Sintaxe e regras de forma: tudo o que quebraria o app ou os favoritos antes mesmo de abrir.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const raiz = path.resolve(import.meta.dirname, "..");
const ler = (f) => fs.readFileSync(path.join(raiz, f), "utf8");
const checa = (codigo, ext = ".mjs") => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hgo-")), "x" + ext);
  fs.writeFileSync(f, codigo);
  execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
};

test("funções da pasta api compilam", () => {
  for (const f of fs.readdirSync(path.join(raiz, "api")).filter((f) => f.endsWith(".js"))) {
    assert.doesNotThrow(() => checa(ler("api/" + f)), f);
  }
});

test("scripts do app compilam juntos (sem nome declarado duas vezes)", () => {
  const html = ler("public/index.html");
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const arquivos = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.ok(arquivos.length > 0);
  for (const f of arquivos) assert.ok(ler("public/sw.js").includes(`"${f}"`), `${f} fora do cache do service worker`);
  assert.doesNotThrow(() => checa([...arquivos.map((f) => ler("public/" + f)), ...inline].join("\n;\n")));
});

for (const fav of ["public/sinceti.js", "public/equatorial.js"]) {
  test(`favorito ${fav}: só ASCII (acentos como \\uXXXX) e compila`, () => {
    const s = ler(fav);
    const fora = [...s].findIndex((c) => c.charCodeAt(0) > 126);
    assert.equal(fora, -1, `caractere não ASCII perto de: ${s.slice(Math.max(0, fora - 30), fora + 10)}`);
    assert.doesNotThrow(() => checa(s, ".cjs"));
  });
  test(`favorito ${fav}: não manda dados para fora (diagnóstico removido)`, () => {
    assert.doesNotMatch(ler(fav), /api\/diag/);
  });
}

test("service worker tem versão de cache", () => {
  assert.match(ler("public/sw.js"), /const CACHE = "homologago-v\d+"/);
});

test("não existe endpoint de diagnóstico público", () => {
  assert.ok(!fs.existsSync(path.join(raiz, "api/diag.js")));
  assert.doesNotMatch(ler("api/inmetro.js"), /query\.diag/);
});
