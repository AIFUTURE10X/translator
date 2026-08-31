const STREAM_MODEL = process.env.TRANSLATE_TTS_STREAM_MODEL || "gemini-3.1-flash-tts-preview";

/** Forward only PCM audio, never provider metadata or credentials, to the player. */
export async function* streamSpeech(text: string, voice: string | undefined, signal: AbortSignal) {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY not configured");
  if (!/^(models\/)?[a-zA-Z0-9.-]+$/.test(STREAM_MODEL) || STREAM_MODEL.includes("..")) {
    throw new Error("Invalid streaming speech model");
  }
  const model = STREAM_MODEL.replace(/^models\//, "");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `Synthesize speech. Read only the transcript below, exactly as written.\nTranscript: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || process.env.TRANSLATE_TTS_VOICE || "Kore" } } },
      },
    }),
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`Speech generation failed (${response.status}). Please try Play again.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let receivedAudio = false;
  let finished = false;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      if (pending.length > 4 * 1024 * 1024) throw new Error("Speech event too large");
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const event = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const payload = event.split(/\r?\n/).filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim()).join("\n");
        if (!payload || payload === "[DONE]") continue;
        const data = JSON.parse(payload);
        if (data.error) throw new Error("Speech generation failed. Please try Play again.");
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== "STOP") {
          throw new Error("Speech generation did not finish. Please try Play again.");
        }
        for (const part of candidate?.content?.parts || []) {
          const audio = part.inlineData;
          if (!audio?.data || !/^audio\/(L16|pcm)(;|$)/i.test(audio.mimeType || "")) continue;
          const sampleRate = Number(/(?:^|;)rate=(\d+)/.exec(audio.mimeType)?.[1] || 24000);
          const pcm = Buffer.from(audio.data, "base64");
          if (sampleRate < 8000 || sampleRate > 48000 || !pcm.length || pcm.length % 2) {
            throw new Error("Invalid speech audio format");
          }
          signal.throwIfAborted();
          receivedAudio = true;
          yield { audioBase64: pcm.toString("base64"), sampleRate };
        }
        if (candidate?.finishReason === "STOP") finished = true;
      }
    }
    signal.throwIfAborted();
    if (pending.trim() || !finished || !receivedAudio) throw new Error("Speech stream ended before completing. Please try Play again.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
