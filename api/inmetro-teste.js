export default async function handler(req, res) {
  const q = new URLSearchParams({ pag: req.query.pag || "1", acao: "pesquisar", NumeroRegistro: "", "ctl00$MainContent$ControlPesquisa1$Situacao": req.query.sit || "", ObjetoProduto: "", "ctl00$MainContent$ControlPesquisa1$SelectPacs": "181", MarcaModelo: req.query.m || "", CodigodeBarra: "", Atestado: "", "ctl00$MainContent$ControlPesquisa1$SelectModeloAvaliacaoConformidade": "", Fornecedor: req.query.f || "", CNPJ: "", "ctl00$MainContent$ControlPesquisa1$SelectUF": "", Municipio: "" });
  try {
    const t0 = Date.now();
    const r = await fetch(req.query.det ? "https://registro.inmetro.gov.br/consulta/detalhe.aspx?pag=1&NumeroRegistro=" + encodeURIComponent(req.query.det) : "https://registro.inmetro.gov.br/consulta/Default.aspx?" + (req.query.raw || q), { headers: { "user-agent": "Mozilla/5.0" } });
    const h = await r.text();
    const i = Math.max(0, h.indexOf('id="principal"'));
    const txt = h.slice(i).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<(tr|li|h\d|p|div)\b/gi, "\n<$1").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/[ \t\r]+/g, " ").replace(/\n\s+/g, "\n");
    const links = [...h.matchAll(/(?:href|onclick)="([^"]*(?:xport|xcel|xls|pdf|PDF|Excel)[^"]*)"/g)].map(m => m[1]).slice(0, 10);
    const fim = Math.max(txt.indexOf("Limpar"), txt.indexOf("Detalhe"), txt.indexOf("Marca"));
    res.status(200).json({ status: r.status, url: r.url, len: h.length, ms: Date.now() - t0, links, final: txt.slice(fim, fim + 6000), txt: txt.slice(Number(req.query.o || 0), Number(req.query.o || 0) + 7000) });
  } catch (e) { res.status(200).json({ erro: String(e) }) }
}
