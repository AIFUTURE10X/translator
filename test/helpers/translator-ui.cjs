const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Learning = require("../../public/learning.js");

// A small DOM boundary for executing the real page script, not a copy of its logic.
function element() {
  const classes = new Set();
  const listeners = new Map();
  return {
    value: "", textContent: "", innerHTML: "", disabled: false, style: {}, children: [],
    classList: {
      add: (name) => classes.add(name), remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle(name, on = !classes.has(name)) { if (on) classes.add(name); else classes.delete(name); },
    },
    setAttribute() {},
    append(...items) { this.children.push(...items); },
    appendChild(item) { this.children.push(item); },
    addEventListener(type, fn) { listeners.set(type, [...(listeners.get(type) || []), fn]); },
    async dispatch(type) { for (const fn of listeners.get(type) || []) await fn({ preventDefault() {} }); },
  };
}

function createUI({ fetch, autoPlay = false, audioContext }) {
  const html = fs.readFileSync(path.join(__dirname, "../../public/index.html"), "utf8");
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map((match) => [`#${match[1]}`, element()]));
  elements.set('label[for="autoPlayToggle"]', element());
  elements.get("#voiceSelect").value = "Kore";
  elements.get("#speedSelect").value = "1";
  elements.get("#outputText").textContent = "Translation will appear here";
  const storage = new Map([["translator_autoplay", String(autoPlay)]]);
  const played = [];
  const context = vm.createContext({
    document: { querySelector: (selector) => elements.get(selector), createElement: element },
    location: { protocol: "http:", origin: "http://translator.test" },
    window: { ThaiLearning: Learning, ...(audioContext ? {
      StreamingAudio: require("../../public/streaming-audio.js"),
      AudioContext: class { constructor() { return audioContext; } },
    } : {}) },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    navigator: { clipboard: { writeText: async () => {} } },
    Audio: class {
      constructor(src) { this.src = src; }
      async play() { played.push(this.src); }
      pause() {}
      addEventListener() {}
    },
    fetch, AbortController, URLSearchParams, console, setTimeout, clearTimeout,
    ReadableStream, DOMException,
    alert(message) { throw new Error(message); }, confirm: () => true,
  });
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  vm.runInContext(script, context, { filename: "public/index.html" });
  return { get: (id) => elements.get(`#${id}`), played, storage };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

module.exports = { createUI, flush, deferred };
