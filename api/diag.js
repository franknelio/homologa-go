import Anthropic from "@anthropic-ai/sdk";
// TEMPORÁRIO: diagnóstico da leitura, remover em seguida
const client = new Anthropic();
const IMG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z";
export default async function handler(req, res) {
  if (req.query.k !== "341be3b6a6f895b3b126d116") return res.status(404).end();
  const out = {};
  const tentar = async (nome, extra) => {
    try { const r = await client.messages.create({ model: "claude-haiku-5-5", max_tokens: 2000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: IMG } }, { type: "text", text: "Devolva {\"a\": null}" }] }], ...extra }); out[nome] = "ok " + r.stop_reason }
    catch (e) { out[nome] = String(e.status) + " " + String(e.error?.error?.message || e.message).slice(0, 300) }
  };
  await tentar("schema_effort", { output_config: { effort: "low", format: { type: "json_schema", schema: { type: "object", properties: { a: { type: ["string", "null"] } }, required: ["a"], additionalProperties: false } } } });
  await tentar("simples", {});
  res.status(200).json(out);
}
