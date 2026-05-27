const http = require("http");
const fs = require("fs");
const path = require("path");

loadEnv(path.join(__dirname, ".env.local"));

const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 8787);

const handlers = {
  "/api/health": () => require("./dist/api/health.js").default,
  "/api/translate/languages": () => require("./dist/api/translate/languages.js").default,
  "/api/translate/text": () => require("./dist/api/translate/text.js").default,
  "/api/translate/tts": () => require("./dist/api/translate/tts.js").default,
  "/api/translate/voice": () => require("./dist/api/translate/voice.js").default,
  "/api/translate/image": () => require("./dist/api/translate/image.js").default,
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (handlers[url.pathname]) {
    await handleApi(req, res, url);
    return;
  }

  serveStatic(url, res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Translator local server: http://127.0.0.1:${port}`);
  console.log(`File mode API base: http://127.0.0.1:${port}/api`);
});

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function handleApi(req, res, url) {
  try {
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = await readBody(req);

    res.status = function status(statusCode) {
      res.statusCode = statusCode;
      return res;
    };
    res.json = function json(body) {
      if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
    };

    const handler = handlers[url.pathname]();
    await handler(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  }
}

async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    if (!buffer.length) return {};
    return JSON.parse(buffer.toString("utf8"));
  }

  return buffer;
}

function serveStatic(url, res) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}
