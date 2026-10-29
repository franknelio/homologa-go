import { consultar } from "./inmetro.js";
export default async function handler(req, res) {
  try { res.status(200).json(await consultar(req.query.fab, req.query.modelo)) } catch (e) { res.status(200).json({ erro: String(e) }) }
}
