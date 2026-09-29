const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { deferred, flush } = require("./helpers/translator-ui.cjs");
process.env.GOOGLE_AI_API_KEY = "fixture-only";
const handler = require("../dist/api/translate/tts.js").default;

function response() {
  return Object.assign(new EventEmitter(), {
    headers: {}, chunks: [], headersSent: false, writableEnded: false,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    write(chunk) { this.headersSent = true; this.chunks.push(String(chunk)); return true; },
    end(chunk) { if (chunk) this.write(chunk); this.writableEnded = true; },
    json(data) { this.jsonBody = data; this.end(); },
  });
}
const pcm = Buffer.from([0, 16, 0, 32]).toString("base64");
const packet = { candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;codec=pcm;rate=24000", data: pcm } }] } }] };
const event = (data) => new TextEncoder().encode(`data: ${JSON.stringify(data)}\r\n\r\n`);

test("streams the first speech chunk before generation finishes", async (t) => {
  let upstream;
  let requested;
  const release = deferred();
  t.mock.method(global, "fetch", async (url, options) => {
    requested = { url, options };
    if (url.includes(":streamGenerateContent")) {
      return new Response(new ReadableStream({ start(controller) { upstream = controller; } }));
    }
    await release.promise;
    return new Response(JSON.stringify(packet));
  });
  const res = response();
  const pending = handler({ method: "POST", body: { text: "ขอบคุณ", voice: "Puck", stream: true } }, res);
  await flush();
  if (upstream) {
    const bytes = event(packet);
    // Real network chunks can cut through JSON and SSE line separators.
    upstream.enqueue(bytes.slice(0, 31));
    upstream.enqueue(bytes.slice(31));
  }
  await flush();
  try {
    assert.equal(res.chunks.length, 1, "Client must receive audio before the provider finishes");
    assert.equal(res.writableEnded, false);
    assert.deepEqual(JSON.parse(res.chunks[0]), { audioBase64: pcm, sampleRate: 24000 });
    assert.match(requested.url, /gemini-3\.8-flash-tts:streamGenerateContent/);
    assert.ok(!requested.url.includes("key="));
    assert.equal(JSON.parse(requested.options.body).generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voice, "Puck");
  } finally {
    if (upstream) { upstream.enqueue(event({ candidates: [{ finishReason: "STOP" }] })); upstream.close(); }
    release.resolve();
    await pending;
  }
  assert.equal(JSON.parse(res.chunks.at(-1)).done, true);
});

test("a rejected provider request returns one error without retrying or leaking credentials", async (t) => {
  let calls = 0;
  t.mock.method(global, "fetch", async () => {
    calls++;
    return new Response("rate limited", { status: 429 });
  });
  const res = response();
  await handler({ method: "POST", body: { text: "hello", stream: true } }, res);
  assert.equal(calls, 1);
  assert.equal(res.statusCode, 500);
  assert.match(res.jsonBody.error, /429/);
  assert.ok(!res.jsonBody.error.includes("fixture-only"));
});

test("an incomplete provider stream cannot emit a successful completion", async (t) => {
  t.mock.method(global, "fetch", async () => new Response(event(packet)));
  const res = response();
  await handler({ method: "POST", body: { text: "hello", stream: true } }, res);
  const events = res.chunks.map((chunk) => JSON.parse(chunk));
  assert.ok(events[0].audioBase64);
  assert.ok(events.at(-1).error);
  assert.ok(!events.some((item) => item.done));
});

test("client disconnection aborts the provider request", async (t) => {
  let signal;
  let upstream;
  t.mock.method(global, "fetch", async (_url, options) => {
    signal = options.signal;
    return new Response(new ReadableStream({ start(c) { upstream = c; } }));
  });
  const res = response();
  const pending = handler({ method: "POST", body: { text: "hello", stream: true } }, res);
  await flush();
  upstream.enqueue(event(packet));
  await flush();
  res.emit("close");
  assert.equal(signal.aborted, true);
  upstream.close();
  await pending;
  assert.equal(res.chunks.length, 1, "Disconnected client must receive no completion or error writes");
});
