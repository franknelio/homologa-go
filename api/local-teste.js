import { resolver } from "./local.js";
export default async function handler(req, res) { try { res.status(200).json(await resolver(String(req.query.q))) } catch (e) { res.status(200).json({ erro: String(e) }) } }
