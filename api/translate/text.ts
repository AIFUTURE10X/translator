import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAuth } from "../../lib/auth.js";
import { translateText, synthesizeMultilingual } from "../../lib/translate.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }
  if (!checkAuth(req, res)) return;

  try {
    const { text, sourceLang, targetLang, tts } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ ok: false, error: "Missing text or targetLang" });
      return;
    }

    const result = await translateText(text, sourceLang || "auto", targetLang);

    let audioBase64: string | undefined;
    if (tts && result.translatedText) {
      audioBase64 = await synthesizeMultilingual(result.translatedText);
    }

    res.json({
      ok: true,
      data: {
        originalText: text,
        translatedText: result.translatedText,
        detectedLang: result.detectedLang,
        audioBase64,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
}
