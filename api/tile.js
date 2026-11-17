// Repassa um bloco de imagem de satélite (Esri World Imagery) pelo mesmo domínio do app,
// para a imagem poder ser desenhada no canvas e entrar no PDF. Exige login no app.
const validos = new Map(); // token → validade (ms), enquanto a função estiver quente

async function usuarioLogado(authorization) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authorization?.startsWith("Bearer ") || authorization.length < 30) return false;
  const agora = Date.now(), v = validos.get(authorization);
  if (v && v > agora) return true;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, authorization } }).catch(() => null);
  if (!r?.ok) return false;
  if (validos.size > 500) validos.clear();
  validos.set(authorization, agora + 5 * 60 * 1000);
  return true;
}

export default async function handler(req, res) {
  const z = +req.query.z, x = +req.query.x, y = +req.query.y;
  if (![z, x, y].every(Number.isInteger) || z < 1 || z > 20 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return res.status(400).end();
  if (!(await usuarioLogado(req.headers.authorization))) return res.status(401).end();
  try {
    const r = await fetch(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}?blankTile=false`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return res.status(r.status).end();
    res.setHeader("content-type", r.headers.get("content-type") || "image/jpeg");
    res.setHeader("cache-control", "private, max-age=2592000");
    res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch { res.status(502).end() }
}
