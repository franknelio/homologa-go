// Entrega ao app a URL e a chave pública (anon) do Supabase, definidas nas variáveis de ambiente.
export default function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Supabase não configurado (SUPABASE_URL e SUPABASE_ANON_KEY)" });
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
