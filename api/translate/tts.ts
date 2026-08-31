import type { VercelRequest, VercelResponse } from "../../lib/vercel";
import { synthesizeMultilingual } from "../../lib/translate";
import { streamSpeech } from "../../lib/tts-stream";
import { once } from "node:events";

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }

  try {
    const { text, voice, stream } = req.body || {};
    if (!text) {
      res.status(400).json({ ok: false, error: "Missing text" });
      return;
    }
    if (stream === true) {
      const controller = new AbortController();
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]);
      const disconnected = () => { if (!res.writableEnded) controller.abort(); };
      res.on("close", disconnected);
      try {
        for await (const chunk of streamSpeech(text, voice, signal)) {
          if (!res.headersSent) {
            res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
            res.setHeader("Cache-Control", "no-store, no-transform");
            res.setHeader("X-Accel-Buffering", "no");
          }
          if (!res.write(JSON.stringify(chunk) + "\n")) await once(res, "drain", { signal });
        }
        res.end(JSON.stringify({ done: true }) + "\n");
      } catch (err) {
        if (!controller.signal.aborted) {
          if (!res.headersSent) throw err;
          res.end(JSON.stringify({ error: "Speech stream interrupted. Please try Play again." }) + "\n");
        }
      } finally {
        controller.abort();
        res.off("close", disconnected);
      }
      return;
    }
    const audioBase64 = await synthesizeMultilingual(text, voice);
    res.json({ ok: true, data: { audioBase64 } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
}
