import Anthropic from "@anthropic-ai/sdk";

// Lê fotos de RG/CNH, CPF/CNPJ e conta de energia e devolve os campos do projeto.
// Variáveis de ambiente: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY e
// EMAILS_PERMITIDOS (lista separada por vírgulas de quem pode usar a leitura; vazia libera todos os logados).
// Só usuários com login válido no Supabase podem usar a leitura (evita gastos de terceiros).
const client = new Anthropic();

const CAMPOS = {
  nome: "nome completo da pessoa do RG/CNH (ou razão social do cartão CNPJ), copiado letra por letra do campo NOME, com TODAS as palavras, inclusive o primeiro nome (não corte o início nem o fim; confira com a assinatura e com a filiação se ajudar). NUNCA use o nome que aparece na conta de energia",
  doc: "CPF do RG/CNH (ou CNPJ do cartão CNPJ). NUNCA use o CPF/CNPJ da conta de energia",
  rg: "RG com órgão emissor/UF, do documento de identidade",
  uc: "número da unidade consumidora / conta contrato",
  classe: "classe: Residencial, Comercial, Industrial, Rural ou Poder público",
  tel: "telefone",
  email: "e-mail",
  end: "logradouro e número do endereço da instalação (não o de correspondência)",
  bairro: "bairro ou setor da instalação",
  cidade: "município da instalação",
  cep: "CEP da instalação",
  uf: "UF",
  ligacao: "tipo de fornecimento/ligação da UC: Monofásico, Bifásico ou Trifásico. Procure na conta os textos \"Tipo de Fornecimento\", \"Ligação\", \"Fases\", a classe (ex. \"B1 RESIDENCIAL TRIFÁSICO\", \"MONOFASICO\", \"TRIFASICO\", \"BIFASICO\") ou a tensão (\"380/220 V\" costuma ser trifásico). Se não estiver escrito, deduza pelo custo de disponibilidade cobrado: 30 kWh = Monofásico, 50 kWh = Bifásico, 100 kWh = Trifásico. Só deixe vazio se não houver nenhuma pista",
  consumo: "consumo em kWh dos últimos 12 meses, do mais antigo ao mais recente, separado por vírgulas",
  lat: "latitude aproximada do endereço em graus decimais, como texto (estimada pelo endereço se não constar)",
  lon: "longitude aproximada do endereço em graus decimais, como texto",
};

// "identidade" = RG/CNH/cartão CNPJ (só dados pessoais); "fatura" = conta de energia (nunca dados pessoais)
const PESSOAIS = ["nome", "doc", "rg"];
const camposDo = (tipo) => Object.fromEntries(Object.entries(CAMPOS).filter(([k]) => (tipo === "identidade" ? PESSOAIS.includes(k) : tipo === "fatura" ? !PESSOAIS.includes(k) : true)));
const schemaDe = (campos) => ({
  type: "object",
  properties: Object.fromEntries(Object.keys(campos).map((k) => [k, { type: "string" }])),
  required: Object.keys(campos),
  additionalProperties: false,
});
const promptDe = (tipo, campos) => {
  const lista = Object.entries(campos).map(([k, d]) => `- ${k}: ${d}`).join("\n");
  if (tipo === "identidade") return `As imagens são o documento de identidade (RG ou CNH) ou o cartão CNPJ do cliente. Preencha só com o que estiver legível no documento e use "" quando não encontrar. Não invente.\n${lista}`;
  if (tipo === "fatura") return `As imagens são a conta de energia da Equatorial Goiás. A conta muitas vezes NÃO está no nome do cliente, por isso aqui só interessam os dados da instalação. Preencha com o que estiver legível e use "" quando não encontrar. Não invente, exceto latitude e longitude aproximadas pelo endereço.\n${lista}`;
  return PROMPT;
};

const PROMPT = `As imagens são documentos de um cliente de energia solar em Goiás: documento de identidade (RG/CNH), CPF ou cartão CNPJ e a conta de energia da Equatorial Goiás.
REGRA PRINCIPAL: a conta de energia muitas vezes NÃO está no nome do cliente. Por isso: nome, CPF/CNPJ e RG vêm SOMENTE do documento de identidade (RG/CNH) ou do cartão CNPJ; endereço, bairro, cidade, CEP, UF, UC, classe, ligação e consumo vêm SOMENTE da conta de energia. Se não houver RG/CNH/CNPJ nas imagens, deixe nome, doc e rg vazios (nunca copie da conta).
Preencha cada campo com o que estiver legível nos documentos e use texto vazio "" quando não encontrar. Não invente dados, exceto latitude e longitude aproximadas pelo endereço.
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

// "material" = equipamentos do sistema (mensagens do grupo de WhatsApp, proposta, foto do material)
const CAMPOS_MAT = {
  iP: "potência nominal de UM inversor em kW (ex. 15). Se vier em W, converta para kW",
  iQ: "quantidade de inversores (1 se não disser)",
  iFab: "fabricante/marca do inversor",
  iMod: "modelo do inversor",
  mP: "potência de UM módulo em W (ex. 620)",
  mQ: "quantidade de módulos/placas",
  mFab: "fabricante/marca do módulo",
  mMod: "modelo do módulo",
};
const PROMPT_MAT = (texto) => `Abaixo estão mensagens de um grupo de WhatsApp e/ou imagens (proposta, pedido, nota, foto do material) de uma venda de energia solar. Extraia os equipamentos do sistema fotovoltaico vendido. Use "" para o que não encontrar. Não invente. Números só com dígitos e ponto decimal.
${Object.entries(CAMPOS_MAT).map(([k, d]) => `- ${k}: ${d}`).join("\n")}
${texto ? "\nMENSAGENS:\n" + texto : ""}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  if (!(await usuarioLogado(req.headers.authorization))) {
    return res.status(401).json({ error: "seu usuário não tem permissão para a leitura automática" });
  }
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 5) : [];
  const tipo = ["identidade", "fatura", "material"].includes(req.body?.tipo) ? req.body.tipo : "";
  const texto = String(req.body?.texto || "").slice(0, 20000);
  const campos = tipo === "material" ? CAMPOS_MAT : camposDo(tipo), schema = schemaDe(campos);
  if (!images.length && !(tipo === "material" && texto)) return res.status(400).json({ error: "nenhuma imagem enviada" });

  try {
    const response = await client.messages.create({
      model: tipo ? "claude-sonnet-5-5" : "claude-haiku-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
            { type: "text", text: tipo === "material" ? PROMPT_MAT(texto) : promptDe(tipo, campos) },
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
      console.error("Anthropic API", error.status, error.message);
      const motivo = String(error.error?.error?.message || error.message || "").slice(0, 200);
      if (/credit balance/i.test(motivo)) return res.status(402).json({ error: "a conta da Anthropic está sem créditos; adicione créditos em console.anthropic.com > Billing" });
      return res.status(502).json({ error: `falha na API (${error.status}): ${motivo}` });
    }
    return res.status(500).json({ error: "falha ao ler os documentos" });
  }
}
