import { GoogleGenAI } from "@google/genai";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const TRANSLATE_MODEL = process.env.TRANSLATE_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct";
const TTS_MODEL = process.env.TRANSLATE_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const TTS_VOICE = process.env.TRANSLATE_TTS_VOICE || "Kore";
const VISION_MODEL = process.env.TRANSLATE_VISION_MODEL || "gemini-2.5-flash";

export const SUPPORTED_LANGUAGES = [
  { code: "auto", name: "Auto-detect" },
  { code: "en", name: "English" },
  { code: "th", name: "Thai" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "fil", name: "Filipino" },
] as const;

export interface TranslateResult {
  translatedText: string;
  detectedLang?: string;
  phonetic?: string;
}

const NON_LATIN_LANGS = new Set(["th", "ja", "ko", "zh", "ar", "hi", "ru"]);

/** Translate text using Groq Llama */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResult> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const targetName = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang;
  const isAuto = sourceLang === "auto";
  const sourceName = isAuto
    ? "the source language (auto-detect it)"
    : SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;

  const wantPhonetic = NON_LATIN_LANGS.has(targetLang);
  const phoneticInstruction = wantPhonetic
    ? ` Also provide a phonetic romanization of the translation so someone who can't read the script can pronounce it.`
    : "";

  const systemPrompt = isAuto
    ? `You are a professional translator. Translate the user's text into ${targetName}. Auto-detect the source language.${phoneticInstruction} Respond with ONLY a JSON object: {"translatedText": "...", "detectedLang": "<ISO 639-1 code>"${wantPhonetic ? ', "phonetic": "..."' : ""}}. No extra text.`
    : `You are a professional translator. Translate the user's text from ${sourceName} into ${targetName}.${phoneticInstruction} Respond with ONLY a JSON object: {"translatedText": "..."${wantPhonetic ? ', "phonetic": "..."' : ""}}. No extra text.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TRANSLATE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 5000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Translation failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  const raw = data.choices[0]?.message?.content?.trim() || "";

  try {
    const parsed = JSON.parse(raw);
    return {
      translatedText: parsed.translatedText || raw,
      detectedLang: parsed.detectedLang,
      phonetic: parsed.phonetic,
    };
  } catch {
    return { translatedText: raw };
  }
}

/** Convert raw PCM to WAV by prepending a valid WAV header (no ffmpeg needed) */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

/** Synthesize multilingual TTS using Gemini Flash TTS. Returns base64 WAV. */
export async function synthesizeMultilingual(text: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: `Read the following text aloud exactly as written:\n\n${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No response from Gemini TTS");

  const audioPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));
  if (!audioPart?.inlineData?.data) throw new Error("Gemini TTS did not return audio");

  // Convert raw PCM to WAV (no ffmpeg needed)
  const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
  const wavBuffer = pcmToWav(pcmBuffer);
  return wavBuffer.toString("base64");
}

/** Transcribe audio using Groq Whisper. Accepts WebM directly (no ffmpeg). */
export async function transcribeAudio(audioBuffer: Buffer, filename = "audio.webm"): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const boundary = `----FormBoundary${Date.now()}`;
  const parts: Buffer[] = [];

  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`
  ));
  parts.push(audioBuffer);
  parts.push(Buffer.from("\r\n"));
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n`
  ));
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text ?? "";
}

/** Extract text from image using Gemini Vision (OCR) */
export async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
        { text: "Extract ALL text from this image exactly as written. Return only the extracted text, nothing else." },
      ],
    }],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("No text found in image");
  return text;
}

/** Describe/identify what's in an image using Gemini Vision */
export async function describeImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
        { text: "Identify and describe what is in this image in 1-3 concise sentences. If it's food, name the dish. If it's a product, name it. If there's text visible, include it. Be specific and practical — this is for a traveler who wants to know what they're looking at." },
      ],
    }],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Could not describe image");
  return text;
}
