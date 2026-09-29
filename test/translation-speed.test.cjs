const test = require("node:test");
const assert = require("node:assert/strict");
const { createUI, flush, deferred } = require("./helpers/translator-ui.cjs");

process.env.GOOGLE_AI_API_KEY = "local-fixture-only";
process.env.OPENAI_API_KEY = "local-fixture-only";
const textHandler = require("../dist/api/translate/text.js").default;
const ttsHandler = require("../dist/api/translate/tts.js").default;
const languagesHandler = require("../dist/api/translate/languages.js").default;

async function setup(t, autoPlay = false) {
  const speech = [];
  const requests = [];
  // Only the external provider is substituted. The frontend and API handlers are real.
  t.mock.method(global, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body);
    if (body.generationConfig?.responseModalities?.includes("AUDIO")) {
      const pending = deferred();
      speech.push({ ...pending, body });
      const outcome = await pending.promise;
      if (outcome === "fail") {
        return new Response(JSON.stringify({ error: { message: "Simulated speech failure" } }), { status: 503 });
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [
        { inlineData: { mimeType: "audio/pcm", data: Buffer.alloc(4).toString("base64") } },
      ] } }] }));
    }
    return new Response(JSON.stringify({ output: [{
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify({
        translatedText: "ขอบคุณ", detectedLang: "en", phonetic: "khop khun",
      }) }],
    }] }));
  });
  const ui = createUI({ autoPlay, fetch: async (url, options = {}) => {
    const route = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;
    requests.push({ route, body, signal: options.signal });
    const handler = {
      "/api/translate/text": textHandler,
      "/api/translate/tts": ttsHandler,
      "/api/translate/languages": languagesHandler,
    }[route];
    assert.ok(handler, `Unexpected API request: ${route}`);
    let result;
    await handler({ method: options.method || "GET", body, query: {} }, {
      status() { return this; }, json(data) { result = data; },
    });
    return { json: async () => result };
  } });
  await flush();
  ui.get("sourceText").value = "thank you";
  return { ...ui, speech, requests };
}

for (const autoPlay of [false, true]) {
  test(`shows and saves translated text before speech finishes (auto-play ${autoPlay})`, async (t) => {
    const ui = await setup(t, autoPlay);
    const translating = ui.get("translateBtn").dispatch("click");
    await flush();
    try {
      assert.equal(ui.get("outputText").textContent, "ขอบคุณ", "Text must not wait for speech synthesis");
      assert.equal(ui.get("loading").classList.contains("active"), false);
      assert.equal(ui.get("copyBtn").disabled, false);
      assert.equal(ui.get("saveCardBtn").disabled, false);
      await ui.get("saveCardBtn").dispatch("click");
      const card = JSON.parse(ui.storage.get("thai_learning_cards_v1"))[0];
      assert.equal(card.thaiText, "ขอบคุณ");
      assert.equal(card.phonetic, "khop khun");
      assert.equal(ui.speech.length, autoPlay ? 1 : 0);
    } finally {
      ui.speech.forEach((job) => job.resolve());
      await translating;
      await flush();
    }
  });
}

test("Play requests speech once, then reuses audio", async (t) => {
  const ui = await setup(t);
  const translating = ui.get("translateBtn").dispatch("click");
  await flush();
  // Release any legacy bundled speech so this test can reach the Play action before the fix.
  ui.speech.forEach((job) => job.resolve());
  await translating;
  const before = ui.speech.length;
  const playing = ui.get("playBtn").dispatch("click");
  await flush();
  try {
    assert.equal(ui.speech.length - before, 1, "Play should generate speech on demand");
    assert.equal(ui.get("playBtn").disabled, true);
    await ui.get("playBtn").dispatch("click");
    assert.equal(ui.speech.length - before, 1);
  } finally {
    ui.speech.forEach((job) => job.resolve());
    await playing;
    await flush();
  }
  assert.equal(ui.played.length, 1);
  await ui.get("playBtn").dispatch("click");
  assert.equal(ui.speech.length, 1);
  assert.equal(ui.played.length, 2);
});

for (const action of ["clearBtn", "stopAudioBtn", "translateBtn"]) {
  test(`pending speech cannot play after ${action}`, async (t) => {
    const ui = await setup(t);
    const translating = ui.get("translateBtn").dispatch("click");
    await flush();
    ui.speech.forEach((job) => job.resolve());
    await translating;
    const playing = ui.get("playBtn").dispatch("click");
    await flush();
    const actionDone = ui.get(action).dispatch("click");
    await flush();
    assert.equal(ui.requests.find((req) => req.route === "/api/translate/tts").signal.aborted, true);
    ui.speech.forEach((job) => job.resolve());
    await Promise.all([playing, actionDone]);
    await flush();
    assert.equal(ui.played.length, 0, "Cancelled/stale speech must never start playing");
  });
}

test("voice changes discard late audio and use the selected voice", async (t) => {
  const ui = await setup(t, true);
  await ui.get("translateBtn").dispatch("click");
  await flush();
  ui.get("voiceSelect").value = "Puck";
  await ui.get("voiceSelect").dispatch("change");
  await flush();
  assert.equal(ui.speech.length, 2);
  ui.speech[0].resolve();
  await flush();
  assert.equal(ui.played.length, 0);
  assert.equal(ui.get("playBtn").disabled, true, "Old request must not unlock the new request's button");
  assert.equal(ui.speech[1].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voice, "Puck");
  ui.speech[1].resolve();
  await flush();
  assert.equal(ui.played.length, 1);
  assert.equal(ui.get("playBtn").disabled, false);
});

test("turning auto-play off cancels pending automatic speech", async (t) => {
  const ui = await setup(t, true);
  await ui.get("translateBtn").dispatch("click");
  await flush();
  await ui.get("autoPlayToggle").dispatch("click");
  ui.speech[0].resolve();
  await flush();
  assert.equal(ui.played.length, 0);
  assert.equal(ui.get("playBtn").disabled, false);
  assert.equal(ui.get("outputText").textContent, "ขอบคุณ");
});

test("speech failures preserve the translation and allow Play to retry", async (t) => {
  const ui = await setup(t);
  await ui.get("translateBtn").dispatch("click");
  const failing = ui.get("playBtn").dispatch("click");
  await flush();
  ui.speech[0].resolve("fail");
  await failing;
  assert.equal(ui.get("outputText").textContent, "ขอบคุณ");
  assert.equal(ui.get("copyBtn").disabled, false);
  assert.equal(ui.get("playBtn").disabled, false);
  assert.match(ui.get("playBtn").title, /retry/);
  const retrying = ui.get("playBtn").dispatch("click");
  await flush();
  ui.speech[1].resolve();
  await retrying;
  assert.equal(ui.played.length, 1);
});

test("changing voice with auto-play off does not request speech until Play", async (t) => {
  const ui = await setup(t);
  await ui.get("translateBtn").dispatch("click");
  ui.get("voiceSelect").value = "Puck";
  await ui.get("voiceSelect").dispatch("change");
  assert.equal(ui.speech.length, 0);
  const playing = ui.get("playBtn").dispatch("click");
  await flush();
  assert.equal(ui.speech[0].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voice, "Puck");
  ui.speech[0].resolve();
  await playing;
  assert.equal(ui.played.length, 1);
});
