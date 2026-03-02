import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAuth } from "../../lib/auth";
import { transcribeAudio, translateText, synthesizeMultilingual } from "../../lib/translate";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }
  if (!checkAuth(req, res)) return;

  try {
    const sourceLang = (req.query.sourceLang as string) || "auto";
    const targetLang = req.query.targetLang as string;
    const tts = req.query.tts === "true";

    if (!targetLang) {
      res.status(400).json({ ok: false, error: "Missing targetLang query param" });
      return;
    }

    // Vercel parses the body — get raw buffer
    const chunks: Buffer[] = [];
    if (Buffer.isBuffer(req.body)) {
      chunks.push(req.body);
    } else if (typeof req.body === "string") {
      chunks.push(Buffer.from(req.body, "base64"));
    } else {
      // Raw body from stream
      for await (const chunk of req as any) {
        chunks.push(Buffer.from(chunk));
      }
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      res.status(400).json({ ok: false, error: "Empty audio body" });
      return;
    }

    // Groq Whisper accepts WebM directly — no ffmpeg needed
    const transcript = await transcribeAudio(audioBuffer);

    if (!transcript.trim()) {
      res.status(400).json({ ok: false, error: "Could not transcribe audio" });
      return;
    }

    const result = await translateText(transcript, sourceLang, targetLang);

    let audioBase64: string | undefined;
    if (tts && result.translatedText) {
      audioBase64 = await synthesizeMultilingual(result.translatedText);
    }

    res.json({
      ok: true,
      data: {
        originalText: transcript,
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
