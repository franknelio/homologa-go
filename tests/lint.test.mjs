// Pega variável ou função usada sem existir (ex. "tem is not defined"), que quebrava o Gerar todos sem aviso.
// Os scripts de public/js dividem o mesmo escopo global, então são checados juntos, na ordem de carga.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

let ESLint = null;
try { ({ ESLint } = createRequire(import.meta.url)("eslint")) } catch {}

test("nenhum nome indefinido nos scripts do app", { skip: !ESLint && "eslint não instalado" }, async () => {
  const dir = path.resolve(import.meta.dirname, "../public/js");
  const codigo = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  const lint = new ESLint({ useEslintrc: false, overrideConfig: { env: { browser: true, es2022: true }, parserOptions: { ecmaVersion: 2022 },
    globals: { supabase: "readonly", pdfjsLib: "readonly", pdfjsWorker: "readonly", jspdf: "readonly", JSZip: "readonly", XLSX: "readonly", html2canvas: "readonly", svg2pdf: "readonly", PDFLib: "readonly" },
    rules: { "no-undef": "error", "no-dupe-keys": "error", "no-redeclare": "error" } } });
  const [r] = await lint.lintText(codigo);
  assert.deepEqual(r.messages.map((m) => `${m.message} (linha ${m.line})`), []);
});
