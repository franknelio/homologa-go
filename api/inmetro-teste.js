export default async function handler(req, res) {
  const u = new URL(String(req.query.u || "/consulta/"), "http://registro.inmetro.gov.br");
  if (!/(^|\.)inmetro\.gov\.br$/.test(u.hostname)) return res.status(400).end();
  try {
    const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" }, redirect: "follow" });
    const t = await r.text();
    res.status(200).json({ status: r.status, url: r.url, len: t.length, body: t.slice(Number(req.query.o || 0), Number(req.query.o || 0) + 12000) });
  } catch (e) { res.status(200).json({ erro: String(e) }) }
}
