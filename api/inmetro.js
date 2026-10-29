// Consulta o registro INMETRO de um equipamento fotovoltaico (módulo ou inversor)
// na consulta pública registro.inmetro.gov.br, pela marca e modelo.
// GET /api/inmetro?fab=Growatt&modelo=MIN%206000TL-XH  (exige login no app)

const BASE = "https://registro.inmetro.gov.br/consulta/";
const UA = { "user-agent": "Mozilla/5.0 (HomologaGO)" };
const cache = new Map(); // marca → { t, regs }, reaproveitado enquanto a função estiver quente

async function usuarioLogado(authorization) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authorization?.startsWith("Bearer ")) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, authorization },
  }).catch(() => null);
  return !!r?.ok;
}

const norm = (s) => String(s || "").toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, "");
const texto = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

function urlPesquisa(marca, pag) {
  const p = "ctl00$MainContent$ControlPesquisa1$";
  return BASE + "Default.aspx?" + new URLSearchParams({
    pag: String(pag), acao: "pesquisar", NumeroRegistro: "", [p + "Situacao"]: "", ObjetoProduto: "",
    [p + "SelectPacs"]: "181", MarcaModelo: marca, CodigodeBarra: "", Atestado: "",
    [p + "SelectModeloAvaliacaoConformidade"]: "", Fornecedor: "", CNPJ: "", [p + "SelectUF"]: "", Municipio: "",
  });
}

async function pagina(url, ms = 20000) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error("INMETRO respondeu " + r.status);
  return r.text();
}

function lerLista(h) {
  return [...h.matchAll(/NumeroRegistro=(\d{6}\/\d{4})"[\s\S]*?<abbr title="([^"]+)"/g)].map((m) => ({ reg: m[1], sit: m[2].trim() }));
}

function lerDetalhe(h) {
  const tds = (bloco) => [...bloco.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => texto(m[1]));
  const i = h.indexOf("<th>Nome de Família</th>");
  const cab = i > 0 ? tds(h.slice(i, h.indexOf("</table>", i))) : [];
  const j = h.indexOf("Histórico de alterações");
  const linhas = j > 0 ? h.slice(j, h.indexOf("</table>", j)).split(/<tr>/).slice(2) : [];
  const modelos = linhas.map(tds).filter((c) => c.length >= 5).map((c) => ({ acao: c[1], marca: c[2], modelo: c[3], desc: c[4] }));
  return { situacao: cab[0], empresa: cab[1], concessao: cab[2], familia: cab[6], modelos };
}

async function registrosDaMarca(marca, limite) {
  const c = cache.get(marca);
  if (c && Date.now() - c.t < 12 * 3600e3) return c.regs;
  const h1 = await pagina(urlPesquisa(marca, 1));
  const total = Math.min(Number(h1.match(/<b>(\d+)<\/b> página/)?.[1] || 1), 25);
  const resto = await Promise.all(Array.from({ length: total - 1 }, (_, k) => pagina(urlPesquisa(marca, k + 2)).catch(() => "")));
  const vistos = new Set();
  const regs = [h1, ...resto].flatMap(lerLista).filter((r) => !vistos.has(r.reg) && vistos.add(r.reg));
  // detalhes em lotes paralelos, ativos primeiro
  regs.sort((a, b) => (b.sit === "Ativo") - (a.sit === "Ativo"));
  let k = 0;
  const trab = async () => {
    while (k < regs.length && Date.now() < limite) {
      const r = regs[k++];
      try { Object.assign(r, lerDetalhe(await pagina(BASE + "detalhe.aspx?pag=1&NumeroRegistro=" + r.reg, 15000))) } catch { r.falhou = true }
    }
  };
  await Promise.all(Array.from({ length: 16 }, trab));
  if (regs.every((r) => r.modelos)) cache.set(marca, { t: Date.now(), regs });
  return regs;
}

export default async function handler(req, res) {
  if (!(await usuarioLogado(req.headers.authorization))) return res.status(401).json({ error: "entre na sua conta para consultar o INMETRO" });
  const fab = String(req.query.fab || "").trim(), modelo = String(req.query.modelo || "").trim();
  if (!fab || !modelo) return res.status(400).json({ error: "informe fabricante e modelo" });
  try {
    res.status(200).json(await consultar(fab, modelo));
  } catch (e) {
    res.status(502).json({ error: "não consegui consultar o INMETRO agora (" + (e.message || e) + ")" });
  }
}

export async function consultar(fab, modelo) {
  const t0 = Date.now();
  {
    // a busca do INMETRO casa pela marca; tenta o nome completo e depois só a primeira palavra
    const marcas = [...new Set([fab.toUpperCase(), fab.toUpperCase().split(/\s+/)[0]])];
    let regs = [];
    for (const m of marcas) { regs = await registrosDaMarca(m, t0 + 50000); if (regs.length) break }
    const alvo = norm(modelo), achados = [];
    for (const r of regs) for (const m of r.modelos || []) {
      if (/exclu/i.test(m.acao)) continue;
      const n = norm(m.modelo);
      const pts = n === alvo ? 3 : alvo.length >= 5 && (n.includes(alvo) || alvo.includes(n) && n.length >= 5) ? 2 : 0;
      if (pts) achados.push({ pts: pts + (r.situacao === "Ativo" || r.sit === "Ativo" ? 1 : 0), registro: r.reg, situacao: r.situacao || r.sit, empresa: r.empresa, familia: r.familia, concessao: r.concessao, marca: m.marca, modelo: m.modelo, descricao: m.desc });
    }
    achados.sort((a, b) => b.pts - a.pts);
    const vistos = new Set();
    const lista = achados.filter((a) => !vistos.has(a.registro + a.modelo) && vistos.add(a.registro + a.modelo)).slice(0, 8).map(({ pts, ...a }) => ({ ...a, exato: pts >= 3 }));
    return {
      ok: true, encontrado: lista[0] || null, opcoes: lista,
      consultados: regs.filter((r) => r.modelos).length, total: regs.length, ms: Date.now() - t0,
    };
  }
}
