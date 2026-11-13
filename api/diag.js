// Recebe um retrato do HTML da página do SINCETI/Equatorial quando o favorito não acha algo,
// e grava no log da Vercel para diagnóstico. Só aceita essas origens.
export default async function handler(req, res) {
  const origem = String(req.headers.origin || "");
  if (req.method !== "POST" || !/^https:\/\/([a-z0-9-]+\.)*(sinceti\.net\.br|equatorialenergia\.com\.br)$/i.test(origem)) return res.status(403).end();
  let t = typeof req.body === "string" ? req.body : JSON.stringify(req.body || "");
  t = t.slice(0, 60000);
  const id = Date.now().toString(36);
  for (let i = 0; i < t.length; i += 3000) console.log(`HGO-DIAG ${id} ${i / 3000}: ${t.slice(i, i + 3000)}`);
  res.setHeader("access-control-allow-origin", origem);
  res.status(204).end();
}
