import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(root, "data");
const dataFile = join(dataDir, "leaderboard.json");
const port = Number(process.env.PORT || 5178);
const maxRecords = 100;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp3": "audio/mpeg",
};

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

async function readRecords() {
  try {
    const data = JSON.parse(await readFile(dataFile, "utf8"));
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

async function writeRecords(records) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify({ records }, null, 2), "utf8");
}

function cleanRecord(input) {
  const time = Number(input.time);
  const attempts = Math.max(0, Math.min(999, Math.floor(Number(input.attempts) || 0)));
  const progress = Math.max(0, Math.min(100, Number(input.progress) || 0));
  if (!Number.isFinite(time) || time <= 0 || time > 600) return null;
  return {
    id: String(input.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 64),
    playerId: String(input.playerId || "anonymous").slice(0, 80),
    name: String(input.name || "Игрок").replace(/\s+/g, " ").trim().slice(0, 24) || "Игрок",
    time: Math.round(time * 100) / 100,
    attempts,
    progress,
    score: Math.max(1, Math.floor(Number(input.score) || 1)),
    createdAt: Math.floor(Number(input.createdAt) || Date.now()),
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) =>
    (b.progress ?? 0) - (a.progress ?? 0)
    || (a.attempts ?? 999) - (b.attempts ?? 999)
    || (a.time ?? 9999) - (b.time ?? 9999)
    || (b.score ?? 0) - (a.score ?? 0)
    || (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
}

async function handleLeaderboard(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }
  if (req.method === "GET") {
    json(res, 200, { records: sortRecords(await readRecords()).slice(0, 20) });
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "method not allowed" });
    return;
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 16_384) req.destroy();
  });
  req.on("end", async () => {
    try {
      const record = cleanRecord(JSON.parse(raw || "{}"));
      if (!record) {
        json(res, 400, { error: "bad record" });
        return;
      }
      const existing = await readRecords();
      const withoutOlderSamePlayer = existing.filter((item) => item.playerId !== record.playerId);
      const records = sortRecords([record, ...withoutOlderSamePlayer]).slice(0, maxRecords);
      await writeRecords(records);
      json(res, 200, { records: records.slice(0, 20) });
    } catch {
      json(res, 400, { error: "bad json" });
    }
  });
}

function staticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = resolve(root, normalize(relative));
  return resolved.startsWith(resolve(root)) ? resolved : null;
}

createServer(async (req, res) => {
  if (req.url?.startsWith("/api/leaderboard")) {
    await handleLeaderboard(req, res);
    return;
  }

  const path = staticPath(req.url || "/");
  if (!path) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const type = contentTypes[extname(path)] || "application/octet-stream";
  const stream = createReadStream(path);
  stream.on("open", () => {
    res.writeHead(200, { "content-type": type });
    stream.pipe(res);
  });
  stream.on("error", () => {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`FIL Dash with leaderboard: http://127.0.0.1:${port}/`);
});
