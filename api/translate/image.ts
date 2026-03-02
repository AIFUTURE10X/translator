import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAuth } from "../../lib/auth";
import { extractTextFromImage, describeImage, translateText, synthesizeMultilingual } from "../../lib/translate";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }
  if (!checkAuth(req, res)) return;

  try {
    const sourceLang = (req.query.sourceLang as string) || "auto";
    const targetLang = req.query.targetLang as string;
    const tts = req.query.tts === "true";
    const mode = (req.query.mode as string) || "ocr";
    const contentType = req.headers["content-type"] || "image/jpeg";

    if (!targetLang) {
      res.status(400).json({ ok: false, error: "Missing targetLang query param" });
      return;
    }

    // Get image buffer
    let imageBuffer: Buffer;
    if (Buffer.isBuffer(req.body)) {
      imageBuffer = req.body;
    } else if (typeof req.body === "string") {
      imageBuffer = Buffer.from(req.body, "base64");
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) {
        chunks.push(Buffer.from(chunk));
      }
      imageBuffer = Buffer.concat(chunks);
    }

    if (imageBuffer.length === 0) {
      res.status(400).json({ ok: false, error: "Empty image body" });
      return;
    }

    const extractedText = mode === "describe"
      ? await describeImage(imageBuffer, contentType)
      : await extractTextFromImage(imageBuffer, contentType);

    if (!extractedText.trim()) {
      res.status(400).json({ ok: false, error: "No text found in image" });
      return;
    }

    const result = await translateText(extractedText, sourceLang, targetLang);

    let audioBase64: string | undefined;
    if (tts && result.translatedText) {
      audioBase64 = await synthesizeMultilingual(result.translatedText);
    }

    res.json({
      ok: true,
      data: {
        originalText: extractedText,
        translatedText: result.translatedText,
        phonetic: result.phonetic,
        detectedLang: result.detectedLang,
        audioBase64,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
}
