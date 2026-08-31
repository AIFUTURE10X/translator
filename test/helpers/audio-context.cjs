function createAudioContext() {
  return {
    currentTime: 0, state: "running", destination: {}, sources: [],
    resume: async () => {},
    createBuffer(_channels, length, sampleRate) {
      return { duration: length / sampleRate, sampleRate, data: new Float32Array(length),
        copyToChannel(data) { this.data.set(data); } };
    },
    createBufferSource() {
      const source = { playbackRate: { value: 1 }, connect() {}, disconnect() {},
        start(at, offset = 0) { this.at = at; this.offset = offset; },
        stop() { this.stopped = true; } };
      this.sources.push(source);
      return source;
    },
    finish() { for (const source of this.sources) if (!source.stopped) source.onended?.(); },
  };
}
module.exports = { createAudioContext };
