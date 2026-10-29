import Anthropic from "@anthropic-ai/sdk";

// Lê páginas do datasheet (PDF convertido em imagens no navegador) de um módulo ou inversor
// e devolve as especificações elétricas e mecânicas usadas nos documentos.
const client = new Anthropic();

const CAMPOS = {
  modulo: {
    mFab: "fabricante (marca)",
    mMod: "modelo exato do módulo escolhido, como impresso no datasheet",
    mP: "potência máxima Pmax em W (número)",
    mVoc: "tensão de circuito aberto Voc em V, condição STC (número)",
    mVmp: "tensão de máxima potência Vmp em V, STC (número)",
    mIsc: "corrente de curto-circuito Isc em A, STC (número)",
    mImp: "corrente de máxima potência Imp em A, STC (número)",
    mBeta: "coeficiente de temperatura de Voc em %/°C, negativo (ex. -0.25)",
    mEff: "eficiência do módulo em % (número)",
    mC: "comprimento em metros (ex. 2.278)",
    mL: "largura em metros (ex. 1.134)",
    mPeso: "peso em kg (número)",
    mCel: "número de células (número)",
    mTipo: "exatamente uma opção: Monocristalino, Policristalino ou Bifacial monocristalino",
  },
  inversor: {
    iFab: "fabricante (marca)",
    iMod: "modelo exato do inversor escolhido, como impresso no datasheet",
    iP: "potência nominal CA de saída em kW (número)",
    iFases: "exatamente uma opção: Monofásico 220 V ou Trifásico 380/220 V",
    iIout: "corrente máxima CA de saída em A (número)",
    iVmax: "tensão CC máxima de entrada em V (número)",
    iNmppt: "número de MPPTs (número)",
    iMin: "tensão mínima da faixa de MPPT em V (número)",
    iMax: "tensão máxima da faixa de MPPT em V (número)",
    iImax: "corrente máxima de entrada por MPPT em A (número)",
    iIsc: "corrente de curto-circuito máxima por MPPT em A (número)",
    iFp: "fator de potência nominal (ex. 1)",
    iEff: "eficiência máxima em % (número)",
    iDht: "distorção harmônica total de corrente THDi máxima em % (número)",
    iDim: "dimensões L x A x P em mm, ex. 375 x 350 x 160 mm",
    iPeso: "peso em kg (número)",
    iIP: "grau de proteção, ex. IP65",
  },
};

async function usuarioLogado(authorization) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authorization?.startsWith("Bearer ")) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, authorization },
  }).catch(() => null);
  if (!r?.ok) return false;
  const permitidos = (process.env.EMAILS_PERMITIDOS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!permitidos.length) return true;
  const usuario = await r.json().catch(() => null);
  return permitidos.includes(String(usuario?.email || "").toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  if (!(await usuarioLogado(req.headers.authorization))) {
    return res.status(401).json({ error: "seu usuário não tem permissão para a leitura automática" });
  }
  const tipo = req.body?.tipo === "inversor" ? "inversor" : "modulo";
  const campos = CAMPOS[tipo];
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 4) : [];
  if (!images.length) return res.status(400).json({ error: "nenhuma página enviada" });
  const pot = String(req.body?.potencia || "").slice(0, 20);
  const schema = {
    type: "object",
    properties: Object.fromEntries(Object.keys(campos).map((k) => [k, { type: ["string", "null"] }])),
    required: Object.keys(campos),
    additionalProperties: false,
  };
  const prompt = `As imagens são as páginas do datasheet de um ${tipo === "inversor" ? "inversor fotovoltaico" : "módulo fotovoltaico"}.
${pot ? `Se o datasheet cobrir vários modelos, use a coluna do modelo de ${pot}${tipo === "inversor" ? " kW" : " W"}.` : "Se o datasheet cobrir vários modelos, use o primeiro."}
Preencha cada campo com o valor do datasheet, números com ponto decimal e sem unidade. Use null quando o dado não constar.
${Object.entries(campos).map(([k, d]) => `- ${k}: ${d}`).join("\n")}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      messages: [{
        role: "user",
        content: [
          ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
          { type: "text", text: prompt },
        ],
      }],
    });
    if (response.stop_reason === "refusal") return res.status(422).json({ error: "a leitura foi recusada; preencha os dados manualmente" });
    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const dados = Object.fromEntries(Object.entries(JSON.parse(text)).filter(([, v]) => v !== null && v !== ""));
    return res.status(200).json({ dados });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "chave da API inválida no servidor" });
    } else if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "muitas leituras seguidas; tente em instantes" });
    } else if (error instanceof Anthropic.APIError) {
      const motivo = String(error.error?.error?.message || error.message || "").slice(0, 200);
      if (/credit balance/i.test(motivo)) return res.status(402).json({ error: "a conta da Anthropic está sem créditos; adicione créditos em console.anthropic.com > Billing" });
      return res.status(502).json({ error: `falha na API (${error.status}): ${motivo}` });
    }
    return res.status(500).json({ error: "falha ao ler o datasheet" });
  }
}
