// Repassa um bloco de imagem de satélite (Esri World Imagery) pelo mesmo domínio do app,
// para a imagem poder ser desenhada no canvas e entrar no PDF.
export default async function handler(req, res) {
  const z = +req.query.z, x = +req.query.x, y = +req.query.y;
  if (![z, x, y].every(Number.isInteger) || z < 1 || z > 20 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return res.status(400).end();
  try {
    const r = await fetch(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}?blankTile=false`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return res.status(r.status).end();
    res.setHeader("content-type", r.headers.get("content-type") || "image/jpeg");
    res.setHeader("cache-control", "public, max-age=2592000, immutable");
    res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch { res.status(502).end() }
}
