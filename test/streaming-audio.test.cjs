const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createAudioContext } = require("./helpers/audio-context.cjs");
const { flush } = require("./helpers/translator-ui.cjs");
const modulePath = path.join(__dirname, "../public/streaming-audio.js");
const StreamingAudio = fs.existsSync(modulePath) ? require(modulePath) : null;
const packet = { audioBase64: Buffer.from([0, 0, 0, 64, 0, 128, 255, 127]).toString("base64"), sampleRate: 24000 };
const line = (data) => new TextEncoder().encode(JSON.stringify(data) + "\n");

test("plays received PCM before the response ends and caches a complete WAV", async () => {
  assert.ok(StreamingAudio, "Streaming player must be available");
  const context = createAudioContext();
  let upstream;
  let ended = 0;
  const player = new StreamingAudio.Player({ context, onended: () => ended++ });
  const pending = player.read(new Response(new ReadableStream({ start(c) { upstream = c; } })));
  const bytes = line(packet);
  upstream.enqueue(bytes.slice(0, 17));
  upstream.enqueue(bytes.slice(17));
  await flush();
  assert.equal(context.sources.length, 1, "Playback must start while the stream is still open");
  assert.deepEqual([...context.sources[0].buffer.data], [0, 0.5, -1, 32767 / 32768]);
  assert.equal(ended, 0);
  upstream.enqueue(line(packet));
  upstream.enqueue(line({ done: true }));
  upstream.close();
  const wav = Buffer.from(await pending, "base64");
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), 16);
  assert.equal(context.sources[1].at, context.sources[0].at + context.sources[0].buffer.duration);
  assert.equal(ended, 0, "Network completion must not hide Stop while buffered audio is playing");
  context.finish();
  assert.equal(ended, 1);
});

test("Stop cancels the stream and prevents late chunks from playing", async () => {
  assert.ok(StreamingAudio, "Streaming player must be available");
  const context = createAudioContext();
  const controller = new AbortController();
  let upstream;
  const player = new StreamingAudio.Player({ context, signal: controller.signal });
  const pending = player.read(new Response(new ReadableStream({ start(c) { upstream = c; } })));
  upstream.enqueue(line(packet));
  await flush();
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.ok(context.sources.every((source) => source.stopped));
});

test("an interrupted response is not cached as a complete clip", async () => {
  assert.ok(StreamingAudio, "Streaming player must be available");
  const context = createAudioContext();
  const player = new StreamingAudio.Player({ context });
  await assert.rejects(player.read(new Response(line(packet))), /incomplete/i);
  assert.ok(context.sources.every((source) => source.stopped));
});

test("speed changes reschedule remaining samples without replaying the beginning", async () => {
  assert.ok(StreamingAudio, "Streaming player must be available");
  const context = createAudioContext();
  const player = new StreamingAudio.Player({ context });
  const long = { ...packet, audioBase64: Buffer.alloc(48000).toString("base64") };
  await player.read(new Response(Buffer.concat([line(long), line(long), line({ done: true })])));
  context.currentTime = 0.53;
  player.setRate(1.5);
  const active = context.sources.filter((source) => !source.stopped);
  assert.equal(active.length, 2);
  assert.equal(active[0].playbackRate.value, 1.5);
  assert.ok(Math.abs(active[0].offset - 0.5) < 0.001);
  assert.ok(Math.abs(active[1].at - active[0].at - 0.5 / 1.5) < 0.001);
});

test("Stop also settles playback while the browser is waiting for audio permission", async () => {
  const context = createAudioContext();
  context.resume = () => new Promise(() => {});
  const controller = new AbortController();
  const player = new StreamingAudio.Player({ context, signal: controller.signal });
  const pending = player.read(new Response(line(packet)));
  controller.abort();
  const result = await Promise.race([
    pending.then(() => "resolved", (error) => error.name),
    new Promise((resolve) => setTimeout(() => resolve("still waiting"), 50)),
  ]);
  assert.equal(result, "AbortError");
});
