import type { VercelRequest, VercelResponse } from "@vercel/node";
import { synthesizeMultilingual } from "../../lib/translate";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }

  try {
    const { text, voice } = req.body;
    if (!text) {
      res.status(400).json({ ok: false, error: "Missing text" });
      return;
    }
    const audioBase64 = await synthesizeMultilingual(text, voice);
    res.json({ ok: true, data: { audioBase64 } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
}
