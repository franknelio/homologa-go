import { pdfRegistro } from "./inmetro.js";
export default async function handler(req, res) {
  try { const b = await pdfRegistro(req.query.det); res.status(200).json({ bytes: b.length, head: b.subarray(0, 8).toString() }) } catch (e) { res.status(200).json({ erro: String(e) }) }
}
