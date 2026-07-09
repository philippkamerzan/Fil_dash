import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(root, "data");
const dataFile = join(dataDir, "leaderboard.json");
const port = Number(process.env.PORT || 5178);
const host = process.env.HOST || "127.0.0.1";
const maxRecordsPerLevel = 100;
const defaultLevelId = "level-1";

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
    levelId: cleanLevelId(input.levelId),
    levelNumber: Math.max(1, Math.min(999, Math.floor(Number(input.levelNumber) || 1))),
    levelTitle: String(input.levelTitle || "FIL Dash 1").replace(/\s+/g, " ").trim().slice(0, 40) || "FIL Dash 1",
    playerId: String(input.playerId || "anonymous").slice(0, 80),
    name: String(input.name || "Игрок").replace(/\s+/g, " ").trim().slice(0, 24) || "Игрок",
    time: Math.round(time * 100) / 100,
    attempts,
    progress,
    score: Math.max(1, Math.floor(Number(input.score) || 1)),
    createdAt: Math.floor(Number(input.createdAt) || Date.now()),
  };
}

function cleanLevelId(value) {
  const raw = String(value || defaultLevelId).trim().toLowerCase();
  return raw.replace(/[^a-z0-9_-]/g, "").slice(0, 40) || defaultLevelId;
}

function recordLevelId(record) {
  return cleanLevelId(record.levelId || defaultLevelId);
}

function recordsForLevel(records, levelId) {
  return records.filter((record) => recordLevelId(record) === levelId);
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
  const url = new URL(req.url || "/api/leaderboard", "http://127.0.0.1");
  const requestedLevelId = cleanLevelId(url.searchParams.get("levelId"));
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }
  if (req.method === "GET") {
    const records = recordsForLevel(await readRecords(), requestedLevelId);
    json(res, 200, { levelId: requestedLevelId, records: sortRecords(records).slice(0, 20) });
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
      const withoutOlderSamePlayer = existing.filter((item) =>
        item.playerId !== record.playerId || recordLevelId(item) !== record.levelId
      );
      const updated = [record, ...withoutOlderSamePlayer];
      const records = [
        ...updated.filter((item) => recordLevelId(item) !== record.levelId),
        ...sortRecords(recordsForLevel(updated, record.levelId)).slice(0, maxRecordsPerLevel),
      ];
      await writeRecords(records);
      json(res, 200, {
        levelId: record.levelId,
        records: sortRecords(recordsForLevel(records, record.levelId)).slice(0, 20),
      });
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
  const range = req.headers.range;
  if (range) {
    try {
      const fileStat = await stat(path);
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) throw new Error("bad range");
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : fileStat.size - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= fileStat.size) {
        res.writeHead(416, { "content-range": `bytes */${fileStat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        "content-type": type,
        "accept-ranges": "bytes",
        "content-range": `bytes ${start}-${end}/${fileStat.size}`,
        "content-length": end - start + 1,
      });
      createReadStream(path, { start, end }).pipe(res);
      return;
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
  }
  const stream = createReadStream(path);
  stream.on("open", () => {
    res.writeHead(200, {
      "content-type": type,
      "accept-ranges": "bytes",
    });
    stream.pipe(res);
  });
  stream.on("error", () => {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });
}).listen(port, host, () => {
  console.log(`FIL Dash with leaderboard: http://${host}:${port}/`);
});
