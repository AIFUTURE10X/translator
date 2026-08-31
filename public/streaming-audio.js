(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.StreamingAudio = api;
})(typeof window !== "undefined" ? window : this, function () {
  class Player {
    constructor({ context, rate = 1, signal, onstart = () => {}, onended = () => {} }) {
      this.context = context;
      this.rate = rate;
      this.signal = signal;
      this.onstart = onstart;
      this.onended = onended;
      this.queue = [];
      this.chunks = [];
      this.bytes = 0;
      this.nextAt = 0;
      this.stopped = false;
      this.complete = false;
      this.started = false;
      this.notified = false;
      this.cancelled = new Promise((resolve) => { this.resolveStop = resolve; });
      this.abort = () => this.stop();
      signal?.addEventListener("abort", this.abort, { once: true });
      if (signal?.aborted) this.stop();
    }

    async read(response) {
      if (!response.body) throw new Error("Streaming response unavailable");
      this.reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      try {
        await Promise.race([this.context.resume(), this.cancelled]);
        while (true) {
          this.checkActive();
          const { value, done } = await this.reader.read();
          this.checkActive();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          if (pending.length > 4 * 1024 * 1024) throw new Error("Audio event too large");
          let newline;
          while ((newline = pending.indexOf("\n")) !== -1) {
            const line = pending.slice(0, newline).trim();
            pending = pending.slice(newline + 1);
            if (!line) continue;
            const event = JSON.parse(line);
            if (event.error) throw new Error(event.error);
            if (event.done === true) this.complete = true;
            else {
              if (this.complete) throw new Error("Audio received after completion");
              this.append(event);
            }
          }
        }
        if (pending.trim() || !this.complete || !this.bytes) throw new Error("Incomplete audio stream. Press Play to retry.");
        this.notifyEnded();
        return this.wavBase64();
      } catch (err) {
        this.stop();
        throw err;
      } finally {
        await this.reader.cancel().catch(() => {});
        this.reader.releaseLock();
        this.reader = null;
        this.signal?.removeEventListener("abort", this.abort);
      }
    }

    checkActive() {
      if (this.stopped || this.signal?.aborted) throw new DOMException("Playback stopped", "AbortError");
    }

    append({ audioBase64, sampleRate }) {
      this.checkActive();
      if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000 || typeof audioBase64 !== "string") {
        throw new Error("Invalid audio format");
      }
      if (this.sampleRate && this.sampleRate !== sampleRate) throw new Error("Audio sample rate changed");
      this.sampleRate = sampleRate;
      const binary = atob(audioBase64);
      if (!binary.length || binary.length % 2) throw new Error("Invalid PCM audio");
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      this.bytes += bytes.length;
      if (this.bytes > 24 * 1024 * 1024) throw new Error("Audio clip too large");
      this.chunks.push(bytes);
      const view = new DataView(bytes.buffer);
      const samples = new Float32Array(bytes.length / 2);
      for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
      const buffer = this.context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      this.schedule(buffer, 0);
      if (!this.started) { this.started = true; this.onstart(); }
    }

    schedule(buffer, offset) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.rate;
      source.connect(this.context.destination);
      const at = Math.max(this.context.currentTime + 0.03, this.nextAt);
      const item = { source, buffer, at, offset };
      this.queue.push(item);
      this.nextAt = at + (buffer.duration - offset) / this.rate;
      source.onended = () => {
        source.disconnect();
        this.queue = this.queue.filter((entry) => entry !== item);
        this.notifyEnded();
      };
      source.start(at, offset);
    }

    setRate(rate) {
      if (!Number.isFinite(rate) || rate < 0.5 || rate > 1.5 || this.stopped) return;
      const now = this.context.currentTime;
      const remaining = this.queue.map((item) => ({
        buffer: item.buffer,
        offset: item.offset + Math.max(0, now - item.at) * this.rate,
      })).filter((item) => item.offset < item.buffer.duration);
      this.clearQueue();
      this.rate = rate;
      this.nextAt = now;
      for (const item of remaining) this.schedule(item.buffer, item.offset);
      this.notifyEnded();
    }

    clearQueue() {
      for (const item of this.queue) {
        item.source.onended = null;
        item.source.stop();
        item.source.disconnect();
      }
      this.queue = [];
    }

    notifyEnded() {
      if (!this.notified && (this.stopped || (this.complete && !this.queue.length))) {
        this.notified = true;
        this.onended();
      }
    }

    stop() {
      if (this.stopped) return;
      this.stopped = true;
      this.resolveStop();
      this.clearQueue();
      this.reader?.cancel().catch(() => {});
      this.notifyEnded();
    }

    wavBase64() {
      const wav = new Uint8Array(44 + this.bytes);
      const view = new DataView(wav.buffer);
      const tag = (offset, text) => { for (let i = 0; i < text.length; i++) wav[offset + i] = text.charCodeAt(i); };
      tag(0, "RIFF"); tag(8, "WAVE"); tag(12, "fmt "); tag(36, "data");
      view.setUint32(4, 36 + this.bytes, true); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, this.sampleRate, true); view.setUint32(28, this.sampleRate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, this.bytes, true);
      let offset = 44;
      for (const chunk of this.chunks) { wav.set(chunk, offset); offset += chunk.length; }
      let binary = "";
      for (let start = 0; start < wav.length; start += 8192) binary += String.fromCharCode(...wav.subarray(start, start + 8192));
      return btoa(binary);
    }
  }
  return { Player };
});
