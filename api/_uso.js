// Limite diário de leituras por IA, por usuário (tabela uso_ia + função conta_uso_ia no Supabase).
// LIMITE_IA_DIA define o máximo por dia (padrão 150). Se o banco falhar, a leitura segue (não trava o trabalho).
export async function dentroDoLimite(authorization) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const limite = Math.max(1, parseInt(process.env.LIMITE_IA_DIA, 10) || 150);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/conta_uso_ia`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, authorization, "content-type": "application/json" },
      body: JSON.stringify({ limite }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) { console.error("uso_ia", r.status); return { ok: true } }
    const n = await r.json();
    return n === -1 ? { ok: false, limite } : { ok: true, n, limite };
  } catch (e) { console.error("uso_ia", String(e.message || e)); return { ok: true } }
}
