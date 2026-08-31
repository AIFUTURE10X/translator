const test = require("node:test");
const assert = require("node:assert/strict");
const { createUI, flush } = require("./helpers/translator-ui.cjs");
const { createAudioContext } = require("./helpers/audio-context.cjs");
const json = (data) => new Response(JSON.stringify({ ok: true, data }));
const line = (data) => new TextEncoder().encode(JSON.stringify(data) + "\n");
const chunk = { audioBase64: Buffer.alloc(4800).toString("base64"), sampleRate: 24000 };

async function setup(autoPlay = false) {
  const context = createAudioContext();
  const speech = [];
  const ui = createUI({ audioContext: context, autoPlay, fetch: async (url, opts = {}) => {
    if (url.endsWith("/languages")) return json({ languages: [{ code: "auto", name: "Auto" }, { code: "th", name: "Thai" }] });
    if (url.endsWith("/text")) return json({ translatedText: "ขอบคุณ", originalText: "thank you", detectedLang: "en" });
    if (url.endsWith("/tts")) {
      const job = { body: JSON.parse(opts.body), signal: opts.signal };
      speech.push(job);
      return new Response(new ReadableStream({ start(controller) { job.controller = controller; } }), {
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  } });
  await flush();
  ui.get("sourceText").value = "thank you";
  await ui.get("translateBtn").dispatch("click");
  return { ...ui, context, speech };
}

for (const autoPlay of [false, true]) {
  test(`page plays streamed speech before completion and replays without a request (auto ${autoPlay})`, async () => {
    const ui = await setup(autoPlay);
    const pending = autoPlay ? Promise.resolve() : ui.get("playBtn").dispatch("click");
    await flush();
    const job = ui.speech[0];
    job.controller.enqueue(line(chunk));
    await flush();
    try {
      assert.equal(job.body.stream, true, "Page must request streaming audio");
      assert.equal(ui.context.sources.length, 1, "Page must play before response completion");
      assert.equal(ui.get("outputText").textContent, "ขอบคุณ");
      assert.equal(ui.get("copyBtn").disabled, false);
      assert.equal(ui.get("playBtn").textContent, "🔊 Playing...");
    } finally {
      job.controller.enqueue(line({ done: true })); job.controller.close();
      await pending;
      await flush();
    }
    assert.equal(ui.get("stopAudioBtn").style.display, "", "Keep Stop visible until buffered audio ends");
    await ui.get("playBtn").dispatch("click");
    assert.equal(ui.speech.length, 1);
    assert.equal(ui.played.length, 1);
    assert.ok(ui.context.sources.every((source) => source.stopped), "Replay stops the streaming tail");
    await ui.get("saveCardBtn").dispatch("click");
    assert.match(JSON.parse(ui.storage.get("thai_learning_cards_v1"))[0].audioBase64, /^UklGR/);
  });
}

test("clearing a streamed result aborts upstream and stops queued audio", async () => {
  const ui = await setup();
  const pending = ui.get("playBtn").dispatch("click");
  await flush();
  const job = ui.speech[0];
  job.controller.enqueue(line(chunk));
  await flush();
  await ui.get("clearBtn").dispatch("click");
  await pending;
  assert.equal(job.signal.aborted, true);
  assert.ok(ui.context.sources.every((source) => source.stopped));
  assert.equal(ui.get("playBtn").disabled, true);
});

test("learning cards stream missing audio and save it for replay", async () => {
  const ui = await setup();
  await ui.get("saveCardBtn").dispatch("click");
  const pending = ui.get("reviewPlayBtn").dispatch("click");
  await flush();
  const job = ui.speech[0];
  job.controller.enqueue(line(chunk));
  await flush();
  try {
    assert.equal(job.body.stream, true);
    assert.equal(ui.context.sources.length, 1);
  } finally {
    job.controller.enqueue(line({ done: true })); job.controller.close();
    await pending;
    await flush();
  }
  assert.match(JSON.parse(ui.storage.get("thai_learning_cards_v1"))[0].audioBase64, /^UklGR/);
});

test("starting translation playback cancels a playing learning-card stream", async () => {
  const ui = await setup();
  await ui.get("saveCardBtn").dispatch("click");
  const learning = ui.get("reviewPlayBtn").dispatch("click");
  await flush();
  ui.speech[0].controller.enqueue(line(chunk));
  await flush();
  const translation = ui.get("playBtn").dispatch("click");
  await flush();
  try {
    assert.equal(ui.speech[0].signal.aborted, true);
    assert.ok(ui.context.sources[0].stopped);
  } finally {
    // Settle both the unfixed and fixed implementations.
    if (!ui.speech[0].signal.aborted) { ui.speech[0].controller.enqueue(line({ done: true })); ui.speech[0].controller.close(); }
    ui.speech[1].controller.enqueue(line(chunk));
    ui.speech[1].controller.enqueue(line({ done: true })); ui.speech[1].controller.close();
    await Promise.all([learning, translation]);
  }
});

test("changing voice stops the old stream before starting the selected voice", async () => {
  const ui = await setup(true);
  await flush();
  ui.speech[0].controller.enqueue(line(chunk));
  await flush();
  ui.get("voiceSelect").value = "Puck";
  await ui.get("voiceSelect").dispatch("change");
  await flush();
  assert.equal(ui.speech[0].signal.aborted, true);
  assert.ok(ui.context.sources[0].stopped);
  assert.equal(ui.speech[1].body.voice, "Puck");
  ui.speech[1].controller.enqueue(line(chunk));
  ui.speech[1].controller.enqueue(line({ done: true })); ui.speech[1].controller.close();
  await flush();
  assert.equal(ui.context.sources.length, 2);
  assert.equal(ui.get("playBtn").disabled, false);
});

test("stream errors preserve text and enable retry without caching partial audio", async () => {
  const ui = await setup();
  const pending = ui.get("playBtn").dispatch("click");
  await flush();
  ui.speech[0].controller.enqueue(line(chunk));
  ui.speech[0].controller.enqueue(line({ error: "Interrupted" })); ui.speech[0].controller.close();
  await pending;
  assert.equal(ui.get("outputText").textContent, "ขอบคุณ");
  assert.match(ui.get("playBtn").title, /retry/);
  assert.ok(ui.context.sources.every((source) => source.stopped));
  await ui.get("saveCardBtn").dispatch("click");
  assert.equal(JSON.parse(ui.storage.get("thai_learning_cards_v1"))[0].audioBase64, "");
});
