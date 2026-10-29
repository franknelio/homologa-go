const BASE = "https://registro.inmetro.gov.br/consulta/";
function campos(html) {
  const out = [];
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/name="([^"]*)"/)?.[1];
    if (!name || name.startsWith("__VIEWSTATE")) continue;
    out.push({ tipo: m[1], name, id: tag.match(/id="([^"]*)"/)?.[1], type: tag.match(/type="([^"]*)"/)?.[1], value: (tag.match(/value="([^"]*)"/)?.[1] || "").slice(0, 60) });
  }
  return out;
}
export default async function handler(req, res) {
  try {
    const r = await fetch(BASE, { headers: { "user-agent": "Mozilla/5.0" } });
    const html = await r.text();
    const opts = [...html.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*foto[^<]*)<\/option>/gi)].map(m => [m[1], m[2]]);
    const forms = [...html.matchAll(/<form[^>]*>/gi)].map(m => m[0]);
    const btns = [...html.matchAll(/__doPostBack\(&#39;([^&]*)&#39;/g)].map(m => m[1]);
    const recaptcha = /recaptcha|captcha/i.test(html);
    let resultado = null;
    if (req.query.busca) {
      const hidden = Object.fromEntries([...html.matchAll(/<input type="hidden" name="([^"]*)" id="[^"]*" value="([^"]*)"/g)].map(m => [m[1], m[2]]));
      const body = new URLSearchParams({ ...hidden, ...JSON.parse(req.query.busca) });
      const cookie = (r.headers.get("set-cookie") || "").split(",").map(s => s.split(";")[0]).join("; ");
      const r2 = await fetch(BASE, { method: "POST", headers: { "user-agent": "Mozilla/5.0", "content-type": "application/x-www-form-urlencoded", cookie }, body });
      const h2 = await r2.text();
      const i = h2.search(/<table[^>]*class="[^"]*table/i);
      resultado = { status: r2.status, len: h2.length, trecho: (i >= 0 ? h2.slice(i, i + 9000) : h2.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(-6000)) };
    }
    res.status(200).json({ status: r.status, recaptcha, forms, campos: campos(html), opts, btns: [...new Set(btns)], resultado });
  } catch (e) { res.status(200).json({ erro: String(e) }) }
}
