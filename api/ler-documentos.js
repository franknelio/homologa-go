import Anthropic from "@anthropic-ai/sdk";

// Lê fotos de RG/CNH, CPF/CNPJ e conta de energia e devolve os campos do projeto.
// Variáveis de ambiente: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY e
// EMAILS_PERMITIDOS (lista separada por vírgulas de quem pode usar a leitura; vazia libera todos os logados).
// Só usuários com login válido no Supabase podem usar a leitura (evita gastos de terceiros).
const client = new Anthropic();

const CAMPOS = {
  nome: "nome completo do titular da UC (o nome que consta na conta de energia)",
  doc: "CPF ou CNPJ do titular",
  rg: "RG com órgão emissor/UF",
  uc: "número da unidade consumidora / conta contrato",
  classe: "classe: Residencial, Comercial, Industrial, Rural ou Poder público",
  tel: "telefone",
  email: "e-mail",
  end: "logradouro e número do endereço da instalação (não o de correspondência)",
  bairro: "bairro ou setor da instalação",
  cidade: "município da instalação",
  cep: "CEP da instalação",
  uf: "UF",
  ligacao: "tipo de fornecimento: Monofásico, Bifásico ou Trifásico",
  consumo: "consumo em kWh dos últimos 12 meses, do mais antigo ao mais recente, separado por vírgulas",
  lat: "latitude aproximada do endereço em graus decimais, como texto (estimada pelo endereço se não constar)",
  lon: "longitude aproximada do endereço em graus decimais, como texto",
};

const schema = {
  type: "object",
  properties: Object.fromEntries(Object.keys(CAMPOS).map((k) => [k, { type: ["string", "null"] }])),
  required: Object.keys(CAMPOS),
  additionalProperties: false,
};

const PROMPT = `As imagens são documentos de um cliente de energia solar em Goiás: documento de identidade (RG/CNH), CPF ou cartão CNPJ e a conta de energia da Equatorial Goiás.
Preencha cada campo com o que estiver legível nos documentos e use null quando não encontrar. Não invente dados, exceto latitude e longitude aproximadas pelo endereço.
${Object.entries(CAMPOS).map(([k, d]) => `- ${k}: ${d}`).join("\n")}`;

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
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 5) : [];
  if (!images.length) return res.status(400).json({ error: "nenhuma imagem enviada" });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "a leitura foi recusada; preencha os dados manualmente" });
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const bruto = JSON.parse(text);
    const dados = Object.fromEntries(Object.entries(bruto).filter(([, v]) => v !== null && v !== ""));
    return res.status(200).json({ dados });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "chave da API inválida no servidor" });
    } else if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "muitas leituras seguidas; tente em instantes" });
    } else if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `falha na API (${error.status})` });
    }
    return res.status(500).json({ error: "falha ao ler os documentos" });
  }
}
