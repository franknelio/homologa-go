// Converte o que o usuário colou (link do Google Maps, coordenadas ou endereço) em latitude/longitude.
// GET /api/local?q=...  (exige login no app)

async function usuarioLogado(authorization) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authorization?.startsWith("Bearer ")) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, authorization },
  }).catch(() => null);
  return !!r?.ok;
}

const UA = { "user-agent": "HomologaGO/1.0 (homologa-go.vercel.app)", "accept-language": "pt-BR" };
const ok = (lat, lon) => isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat || lon);

function coords(t) {
  t = decodeURIComponent(String(t)).replace(/\+/g, " ");
  // pino do Google Maps (!3d lat !4d lon), depois @lat,lon, depois "lat, lon" solto
  let m = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/(-?\d{1,2}[.,]\d{3,})\s*[,;\s]\s*(-?\d{1,3}[.,]\d{3,})/);
  if (m) { const lat = +m[1].replace(",", "."), lon = +m[2].replace(",", "."); if (ok(lat, lon)) return { lat, lon } }
  // graus, minutos e segundos: 16°42'02.9"S 49°16'49.1"W
  const g = [...t.matchAll(/(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:"|″|'')?\s*([NSLOWE])/gi)];
  if (g.length >= 2) {
    const v = (x) => (+x[1] + x[2] / 60 + x[3].replace(",", ".") / 3600) * (/[SOW]/i.test(x[4]) ? -1 : 1);
    return { lat: v(g[0]), lon: v(g[1]) };
  }
  return null;
}

async function seguirLink(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { redirect: "manual", headers: UA, signal: AbortSignal.timeout(8000) });
    const loc = r.headers.get("location");
    if (!loc) { const c = coords(url); if (c) return c; return coords((await r.text()).slice(0, 400000)) }
    url = new URL(loc, url).href;
    const c = coords(url);
    if (c) return c;
  }
  return null;
}

export default async function handler(req, res) {
  if (!(await usuarioLogado(req.headers.authorization))) return res.status(401).json({ error: "entre na sua conta para buscar a localização" });
  const q = String(req.query.q || "").trim().slice(0, 2000);
  if (!q) return res.status(400).json({ error: "informe a localização" });
  try {
    const r = await resolver(q);
    res.status(r.error ? r.status : 200).json(r.error ? { error: r.error } : r);
  } catch (e) {
    res.status(502).json({ error: "falha na busca (" + (e.message || e) + ")" });
  }
}

export async function resolver(q) {
  let c = coords(q);
  if (!c && /^https?:\/\//i.test(q)) c = await seguirLink(q);
  if (c) return c;
  if (/^https?:\/\//i.test(q)) return { status: 422, error: "não achei coordenadas nesse link; no Google Maps toque no ponto e copie as coordenadas" };
  const r = await fetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ q, format: "json", limit: "1", countrycodes: "br" }), { headers: UA, signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  if (!j[0]) return { status: 404, error: "endereço não encontrado; tente as coordenadas ou o link do Google Maps" };
  return { lat: +j[0].lat, lon: +j[0].lon, nome: j[0].display_name, aproximado: true };
}
