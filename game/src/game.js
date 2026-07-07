import { DEFAULT_LEVEL_ID, getLevelById, levels } from "./levels.js?v=1";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const gameShell = document.querySelector(".game-shell");
const overlay = document.querySelector("#overlay");
const overlayTitle = overlay.querySelector(".overlay-title");
const startButton = document.querySelector("#startButton");
const pauseToggle = document.querySelector("#pauseToggle");
const soundToggle = document.querySelector("#soundToggle");
const levelNameEl = document.querySelector("#levelName");
const attemptsEl = document.querySelector("#attempts");
const bestTimeEl = document.querySelector("#bestTime");
const sectionEl = document.querySelector("#sectionName");
const progressEl = document.querySelector("#progressFill");
const lastResultEl = document.querySelector("#lastResult");
const bestResultEl = document.querySelector("#bestResult");
const rankResultEl = document.querySelector("#rankResult");
const localLeaderboardEl = document.querySelector("#localLeaderboard");
const globalLeaderboardEl = document.querySelector("#globalLeaderboard");

const searchParams = new URLSearchParams(window.location.search);
const level = getLevelById(searchParams.get("level") || searchParams.get("levelId"));
const WORLD = level.world;
const LEVEL_SCALE = level.scale;
const LEVEL_ID = level.id;
const TEST_RUN = searchParams.has("testRun");
const TEST_SECTION = searchParams.get("section") || "";
const TEST_TIME_SCALE = Number(searchParams.get("timeScale")) || 1;
const LEADERBOARD_API_URL = searchParams.get("leaderboardApi") || window.FIL_DASH_LEADERBOARD_API || "/api/leaderboard";
const LEGACY_LOCAL_RECORDS_KEY = "filDash.records.v1";
const LOCAL_RECORDS_KEY = `filDash.records.${LEVEL_ID}.v1`;
const PLAYER_ID_KEY = "filDash.playerId.v1";
const MAX_LOCAL_RECORDS = 12;

const keys = {
  jump: false,
};

const colors = {
  ink: "#11131b",
  platform: "#20242e",
  platformFill: "#f8f0df",
  cyan: "#20c5d6",
  blue: "#2d68ff",
  violet: "#8b5cf6",
  orange: "#ff9e23",
  yellow: "#ffd84d",
  pink: "#ff4d8f",
  green: "#34d399",
  red: "#ff3f5f",
  paper: "#fbf3e4",
};

const finishPortal = level.portals.find((portal) => portal.type === "finish");
const playableEndX = finishPortal?.x ?? WORLD.width;

const sectionSpawns = {
  yellow: { x: scaleLevelX(3100), y: 1086, mode: "cube", gravity: 1 },
  plane: { x: scaleLevelX(5120), y: 1060, mode: "plane", gravity: 1 },
  gravity: { x: scaleLevelX(8270), y: 540, mode: "cube", gravity: -1 },
  ghost: { x: scaleLevelX(10670), y: 866, mode: "cube", gravity: 1 },
  mini: { x: scaleLevelX(12240), y: 866, mode: "cube", gravity: 1 },
  finish: { x: scaleLevelX(13220), y: 946, mode: "cube", gravity: 1 },
};

function scaleLevelX(x) {
  return Math.round(x * LEVEL_SCALE);
}

function levelProgress() {
  return Math.max(0, Math.min(1, (player.x + player.w) / playableEndX));
}

const state = {
  running: false,
  paused: false,
  finished: false,
  attempts: 0,
  time: 0,
  shake: 0,
  zoomPunch: 0,
  portalFlash: 0,
  checkpoint: structuredClone(WORLD.start),
  particles: [],
  muted: false,
  lastDeath: "",
  lastDeathAt: null,
  errors: [],
  currentSection: level.sections[0],
  finishResult: null,
  globalLeaderboard: [],
  globalLeaderboardReady: false,
  portalTransition: null,
};

const player = {
  x: WORLD.start.x,
  y: WORLD.start.y,
  w: 34,
  h: 34,
  vx: 0,
  vy: 0,
  mode: "cube",
  gravity: 1,
  onGround: false,
  angle: 0,
  trail: [],
  yellowActive: false,
  deadTimer: 0,
  jumpLatch: false,
  portalCooldown: 0,
  orbCooldown: 0,
  springCooldown: 0,
  mini: false,
  portalScale: 1,
};

let dpr = 1;
let viewW = 0;
let viewH = 0;
let camera = { x: 0, y: 0 };
let last = performance.now();
let audioCtx;
let levelMusic;
let levelMusicGestureRetryBound = false;
let levelMusicPlayWarningShown = false;

window.addEventListener("error", (event) => {
  state.errors.push(String(event.message || "window error"));
});
window.addEventListener("unhandledrejection", (event) => {
  state.errors.push(String(event.reason || "unhandled rejection"));
});

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getLocalRecords() {
  const records = safeParseJson(localStorage.getItem(LOCAL_RECORDS_KEY), []);
  if (Array.isArray(records) && records.length) {
    return records.map(normalizeRecordLevel).filter(recordBelongsToActiveLevel);
  }

  if (LEVEL_ID !== DEFAULT_LEVEL_ID) return [];
  const legacyRecords = safeParseJson(localStorage.getItem(LEGACY_LOCAL_RECORDS_KEY), []);
  return Array.isArray(legacyRecords)
    ? legacyRecords.map(normalizeRecordLevel).filter(recordBelongsToActiveLevel)
    : [];
}

function saveLocalRecords(records) {
  const scoped = records.map(normalizeRecordLevel).filter(recordBelongsToActiveLevel);
  localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(scoped.slice(0, MAX_LOCAL_RECORDS)));
}

function normalizeRecordLevel(record) {
  return {
    ...record,
    levelId: record.levelId || DEFAULT_LEVEL_ID,
  };
}

function recordBelongsToActiveLevel(record) {
  return (record.levelId || DEFAULT_LEVEL_ID) === LEVEL_ID;
}

function sortRecords(records) {
  return [...records].sort((a, b) =>
    (b.progress ?? 0) - (a.progress ?? 0)
    || (a.attempts ?? 999) - (b.attempts ?? 999)
    || (a.time ?? 9999) - (b.time ?? 9999)
    || (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return minutes > 0 ? `${minutes}:${rest.toFixed(2).padStart(5, "0")}` : `${rest.toFixed(2)}с`;
}

function formatRecord(record) {
  if (!record) return "--";
  return `${formatDuration(record.time)} · ${record.attempts}п`;
}

function scoreForRecord(record) {
  const progressScore = Math.round((record.progress ?? 0) * 1000);
  const timePenalty = Math.round((record.time ?? 0) * 18);
  const attemptPenalty = (record.attempts ?? 0) * 1400;
  return Math.max(1, progressScore - timePenalty - attemptPenalty);
}

function playerId() {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (telegramId) return `tg:${telegramId}`;
  const existing = localStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID?.() || `local:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(PLAYER_ID_KEY, generated);
  return generated;
}

function playerName() {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const telegramName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username;
  return String(telegramName || "Игрок").slice(0, 24);
}

function currentRunRecord() {
  const record = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    levelId: LEVEL_ID,
    levelNumber: level.number,
    levelTitle: level.title,
    playerId: playerId(),
    name: playerName(),
    time: Math.round(state.time * 100) / 100,
    attempts: state.attempts,
    progress: 100,
    createdAt: Date.now(),
  };
  record.score = scoreForRecord(record);
  return record;
}

function localRank(record, records) {
  const sorted = sortRecords(records);
  return sorted.findIndex((item) => item.id === record.id) + 1;
}

function recordFinishResult() {
  if (TEST_RUN) return;
  const record = currentRunRecord();
  const records = sortRecords([record, ...getLocalRecords()]).slice(0, MAX_LOCAL_RECORDS);
  saveLocalRecords(records);
  state.finishResult = { ...record, rank: localRank(record, records) };
  updateRecordsUi();
  submitGlobalRecord(record);
}

function renderLeaderboard(target, records, emptyText) {
  target.replaceChildren();
  if (!records.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyText;
    target.append(li);
    return;
  }
  records.slice(0, 5).forEach((record) => {
    const li = document.createElement("li");
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    name.textContent = record.name || "Игрок";
    meta.textContent = ` ${formatRecord(record)}`;
    li.append(name, meta);
    target.append(li);
  });
}

function updateRecordsUi() {
  const localRecords = sortRecords(getLocalRecords());
  const best = localRecords[0];
  bestTimeEl.textContent = best ? formatDuration(best.time) : "--";
  bestResultEl.textContent = formatRecord(best);
  lastResultEl.textContent = state.finishResult ? formatRecord(state.finishResult) : "--";
  rankResultEl.textContent = state.finishResult?.rank ? `#${state.finishResult.rank}` : "--";
  renderLeaderboard(localLeaderboardEl, localRecords, "Пока пусто");
  renderLeaderboard(globalLeaderboardEl, state.globalLeaderboard, state.globalLeaderboardReady ? "Пока пусто" : "Нет связи");
}

async function refreshGlobalLeaderboard() {
  try {
    const response = await fetch(levelLeaderboardUrl(), { cache: "no-store" });
    if (!response.ok) throw new Error(`leaderboard ${response.status}`);
    const data = await response.json();
    state.globalLeaderboard = sortRecords(Array.isArray(data.records) ? data.records : []);
    state.globalLeaderboardReady = true;
  } catch {
    state.globalLeaderboard = [];
    state.globalLeaderboardReady = false;
  }
  updateRecordsUi();
}

async function submitGlobalRecord(record) {
  try {
    const response = await fetch(levelLeaderboardUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`leaderboard submit ${response.status}`);
    const data = await response.json();
    state.globalLeaderboard = sortRecords(Array.isArray(data.records) ? data.records : []);
    state.globalLeaderboardReady = true;
  } catch {
    state.globalLeaderboardReady = false;
  }
  updateRecordsUi();
}

function levelLeaderboardUrl() {
  const url = new URL(LEADERBOARD_API_URL, window.location.href);
  url.searchParams.set("levelId", LEVEL_ID);
  return url.toString();
}

function resize() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const forcedLandscape = forcedLandscapeViewport();
  document.body.classList.toggle("force-landscape", forcedLandscape);
  viewW = Math.floor(forcedLandscape ? window.innerHeight : window.innerWidth);
  viewH = Math.floor(forcedLandscape ? window.innerWidth : window.innerHeight);
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function overlapX(a, b) {
  return a.x + a.w > b.x && a.x < b.x + b.w;
}

function playerRect() {
  return { x: player.x, y: player.y, w: player.w, h: player.h };
}

function playerHazardRect() {
  return { x: player.x + 5, y: player.y + 5, w: player.w - 10, h: player.h - 10 };
}

function spikeHitRect(h) {
  const insetX = Math.min(12, h.w * 0.18);
  const activeH = h.h * 0.68;
  return {
    x: h.x + insetX,
    y: h.dir === "down" ? h.y : h.y + h.h - activeH,
    w: Math.max(4, h.w - insetX * 2),
    h: activeH,
  };
}

function activeSection() {
  return level.sections.find((section) => player.x >= section.x && player.x < section.x + section.w) || level.sections.at(-1);
}

function compactViewport() {
  return viewW < 720 || viewH < 520;
}

function forcedLandscapeViewport() {
  return window.innerHeight > window.innerWidth;
}

function landscapeViewport() {
  return viewW >= viewH * 1.12;
}

function cameraTarget() {
  const compact = compactViewport();
  const landscape = landscapeViewport();
  const lowViewport = viewH < 520;
  const ceilingRun = player.mode !== "plane" && (player.gravity === -1 || state.currentSection?.lane < 700);
  const desiredScreenXRatio = landscape
    ? (player.mode === "plane" ? 0.32 : compact ? 0.29 : 0.31)
    : compact
      ? (player.mode === "plane" ? 0.44 : 0.42)
      : (player.mode === "plane" ? 0.36 : 0.37);
  const desiredScreenX = viewW * desiredScreenXRatio;
  const focus = ceilingRun
    ? (compact ? 0.63 : 0.58)
    : compact
      ? (lowViewport ? 0.62 : 0.5)
      : 0.54;
  const verticalLead = compact
    ? (player.mode === "plane" ? (lowViewport ? 38 : 50) : ceilingRun ? 22 : lowViewport ? 50 : 66)
    : ceilingRun
      ? 36
      : 118;
  return {
    x: Math.max(0, Math.min(WORLD.width - viewW, player.x - desiredScreenX)),
    y: Math.max(0, Math.min(WORLD.height - viewH, player.y - viewH * focus + verticalLead)),
  };
}

function snapCameraToPlayer() {
  const target = cameraTarget();
  camera.x = target.x;
  camera.y = target.y;
}

function startGame() {
  requestTelegramGameViewport();
  requestBrowserLandscapeLock();
  ensureAudio();
  state.running = true;
  state.paused = false;
  state.finished = false;
  state.finishResult = null;
  pauseToggle.textContent = "Ⅱ";
  overlay.classList.add("hidden");
  playLevelMusic({ restart: true });
  playTone(420, 0.08, "triangle", 0.05);
}

function restartFromCheckpoint(countAttempt = true) {
  const spawn = structuredClone(TEST_RUN && TEST_SECTION ? state.checkpoint : WORLD.start);
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = spawn.mode === "plane" ? 390 : 340;
  player.vy = 0;
  player.mode = spawn.mode;
  player.gravity = spawn.gravity;
  player.onGround = false;
  player.angle = 0;
  player.deadTimer = 0;
  player.jumpLatch = false;
  player.yellowActive = false;
  player.portalCooldown = 0;
  player.orbCooldown = 0;
  player.springCooldown = 0;
  player.portalScale = 1;
  player.trail = [];
  setMini(false);
  level.mouths.forEach((mouth) => {
    mouth.closed = false;
    mouth.passed = false;
    mouth.closeTimer = 0;
  });
  [...level.boosters, ...level.orbs, ...level.gravityRings, ...level.traps, ...level.autoPads, ...level.downDots].forEach((item) => {
    item.used = false;
  });
  state.finished = false;
  state.particles = [];
  state.shake = 0;
  state.zoomPunch = 0;
  state.portalFlash = 0;
  state.portalTransition = null;
  state.currentSection = activeSection();
  snapCameraToPlayer();
  if (countAttempt) state.attempts += 1;
  attemptsEl.textContent = String(state.attempts);
  if (state.running && countAttempt) playLevelMusic({ restart: true });
}

function kill(reason = "spike") {
  if (player.deadTimer > 0 || state.finished) return;
  state.lastDeath = reason;
  state.lastDeathAt = {
    x: Math.round(player.x),
    y: Math.round(player.y),
    section: state.currentSection?.id,
    progress: Math.round(levelProgress() * 1000) / 10,
  };
  player.deadTimer = 0.55;
  state.shake = 0.18;
  state.zoomPunch = 0.14;
  spawnBurst(player.x + player.w / 2, player.y + player.h / 2, reason, 18);
  playTone(reason === "portal" ? 260 : 120, 0.12, "sawtooth", 0.08);
}

function finish() {
  if (state.finished) return;
  state.portalTransition = null;
  player.portalScale = 1;
  state.finished = true;
  state.running = false;
  state.shake = 0.1;
  state.zoomPunch = 0.2;
  state.portalFlash = 0.35;
  spawnBurst(player.x + player.w / 2, player.y + player.h / 2, "finish", 36);
  pauseLevelMusic();
  playArpeggio([523, 659, 784, 1046], 0.08);
  recordFinishResult();
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "Финиш";
  startButton.textContent = "Еще раз";
  state.checkpoint = structuredClone(WORLD.start);
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function ensureLevelMusic() {
  if (!level.music?.src) return null;
  if (levelMusic) return levelMusic;
  levelMusic = new Audio(level.music.src);
  levelMusic.preload = "auto";
  levelMusic.loop = level.music.loop ?? true;
  levelMusic.volume = levelMusicVolume();
  levelMusic.addEventListener("error", () => {
    state.errors.push(`music load failed: ${level.music.src}`);
  }, { once: true });
  return levelMusic;
}

function levelMusicVolume() {
  const volume = level.music?.volume ?? 0.72;
  return state.muted ? 0 : Math.max(0, Math.min(1, volume));
}

function musicTimeForCurrentPosition() {
  const startAt = level.music?.startAt ?? 0;
  if (!levelMusic || !Number.isFinite(levelMusic.duration) || levelMusic.duration <= startAt) return startAt;
  return startAt + levelProgress() * (levelMusic.duration - startAt);
}

function playLevelMusic({ restart = false } = {}) {
  const music = ensureLevelMusic();
  if (!music || state.muted || state.paused || !state.running) return;
  music.volume = levelMusicVolume();
  if (restart) {
    try {
      music.currentTime = musicTimeForCurrentPosition();
    } catch {
      // Some browsers reject seeking before MP3 metadata is ready.
    }
  }
  const playPromise = music.play();
  if (playPromise?.catch) {
    playPromise.catch((error) => {
      const message = error?.message || String(error);
      if (error?.name === "NotAllowedError" || message.includes("user didn't interact")) {
        queueLevelMusicGestureRetry();
        return;
      }
      if (levelMusicPlayWarningShown) return;
      state.errors.push(`music play failed: ${message}`);
      levelMusicPlayWarningShown = true;
    });
  }
}

function queueLevelMusicGestureRetry() {
  if (levelMusicGestureRetryBound) return;
  levelMusicGestureRetryBound = true;
  const retry = () => {
    levelMusicGestureRetryBound = false;
    window.removeEventListener("pointerdown", retry, true);
    window.removeEventListener("keydown", retry, true);
    playLevelMusic();
  };
  window.addEventListener("pointerdown", retry, { capture: true, once: true });
  window.addEventListener("keydown", retry, { capture: true, once: true });
}

function pauseLevelMusic() {
  if (levelMusic) levelMusic.pause();
}

function syncLevelMusic() {
  if (levelMusic) levelMusic.volume = levelMusicVolume();
  if (state.running && !state.paused && !state.finished && !state.muted && player.deadTimer <= 0) {
    playLevelMusic();
  } else {
    pauseLevelMusic();
  }
}

function setPaused(paused) {
  state.paused = paused;
  pauseToggle.textContent = state.paused ? "▶" : "Ⅱ";
  syncLevelMusic();
}

function setMuted(muted) {
  state.muted = muted;
  soundToggle.textContent = state.muted ? "×" : "♪";
  syncLevelMusic();
}

function playTone(freq, duration = 0.08, type = "square", gain = 0.04) {
  if (state.muted || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(amp).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playArpeggio(notes, step) {
  notes.forEach((note, i) => setTimeout(() => playTone(note, step, "triangle", 0.05), i * step * 1000));
}

function spawnBurst(x, y, reason = "hit", count = 12) {
  const palette = reason === "finish"
    ? [colors.yellow, colors.cyan, colors.pink, colors.green]
    : reason === "boost"
      ? [colors.yellow, colors.orange, "#ffffff"]
      : reason === "portal"
        ? [colors.violet, colors.cyan, colors.orange]
        : [colors.red, colors.orange, colors.ink];
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const s = 90 + Math.random() * 260;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.42 + Math.random() * 0.42,
      size: 3 + Math.random() * 9,
      color: palette[i % palette.length],
    });
  }
}

function update(dt) {
  if (!state.running || state.paused) return;
  if (!TEST_RUN) readExternalTestInput();
  applyTestRunInput();

  state.time += dt;
  state.shake = Math.max(0, state.shake - dt);
  state.zoomPunch = Math.max(0, state.zoomPunch - dt);
  state.portalFlash = Math.max(0, state.portalFlash - dt);
  player.portalCooldown = Math.max(0, player.portalCooldown - dt);
  player.orbCooldown = Math.max(0, player.orbCooldown - dt);
  player.springCooldown = Math.max(0, player.springCooldown - dt);
  state.currentSection = activeSection();
  updateParticles(dt);

  if (player.deadTimer > 0) {
    player.deadTimer -= dt;
    if (player.deadTimer <= 0) restartFromCheckpoint(true);
    return;
  }

  if (state.portalTransition) {
    updatePortalTransition(dt);
    state.currentSection = activeSection();
    updateCamera(dt);
    updateHud();
    return;
  }

  if (player.mode === "plane") updatePlane(dt);
  else updateCube(dt);
  updateCommonInteractions(dt);
  updateCamera(dt);
  updateHud();
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function targetSpeed() {
  const section = activeSection();
  let speed = player.mini ? 426 : 384;
  if (section.id === "spikes" || section.id === "cube-return") speed = 404;
  if (section.id === "mini") speed = 438;
  if (section.id === "mix") speed = 424;
  for (const zone of level.speedZones) {
    if (rectsOverlap(playerRect(), zone)) speed = zone.speed;
  }
  return speed;
}

function updateCube(dt) {
  const old = { x: player.x, y: player.y };
  player.yellowActive = false;
  updateMiniMode();

  for (const zone of level.yellowZones) {
    if (!rectsOverlap(playerRect(), zone)) continue;
    if (keys.jump) {
      player.yellowActive = true;
      player.vx = Math.max(player.vx, zone.minSpeed);
      player.vy += (zone.targetY - player.y) * 18 * dt;
      player.vy *= 0.66;
    } else if (player.x > zone.x + 70 && player.x < zone.x + zone.w - 30) {
      player.vy += 980 * dt;
    }
  }

  const target = player.yellowActive ? 488 : targetSpeed();
  player.vx += (target - player.vx) * Math.min(1, dt * 7.2);
  player.vx = Math.max(290, Math.min(player.yellowActive ? 518 : 486, player.vx));

  if (keys.jump && player.onGround && !player.jumpLatch) {
    const jumpPower = player.mini ? 555 : 625;
    player.vy = -player.gravity * jumpPower;
    player.onGround = false;
    player.jumpLatch = true;
    spawnBurst(player.x + player.w / 2, player.gravity === 1 ? player.y + player.h : player.y, "boost", 5);
    playTone(player.gravity === -1 ? 300 : 360, 0.07, "square", 0.04);
  }
  if (!keys.jump) player.jumpLatch = false;

  player.vy += 1560 * player.gravity * dt;
  player.vy = Math.max(-980, Math.min(980, player.vy));
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  collidePlatforms(old);

  if (player.yellowActive) player.angle += 12.5 * dt;
  else if (!player.onGround) player.angle += player.vx * dt * 0.026 * player.gravity;
  else player.angle *= 0.8;

  updateTrail(dt, player.yellowActive || Math.abs(player.vx) > 315 || player.mini);
}

function updatePlane(dt) {
  player.vx += (402 - player.vx) * Math.min(1, dt * 7);
  player.vy += (keys.jump ? -1030 : 820) * dt;
  player.vy *= 0.988;
  player.vy = Math.max(-390, Math.min(390, player.vy));
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.angle = Math.max(-0.58, Math.min(0.58, player.vy / 430));
  updateTrail(dt, true);

  for (const mouth of level.mouths) {
    if (!mouth.passed && player.x > mouth.x + 58) {
      mouth.passed = true;
      mouth.closeTimer = 0.24;
    }
    if (mouth.passed) {
      mouth.closeTimer -= dt;
      if (mouth.closeTimer <= 0 && !mouth.closed) {
        mouth.closed = true;
        state.shake = 0.09;
        playTone(150, 0.08, "square", 0.05);
      }
    }
    const topHazard = { x: mouth.x, y: mouth.top, w: 74, h: mouth.gapY - mouth.top };
    const bottomHazard = { x: mouth.x, y: mouth.gapY + mouth.gapH, w: 74, h: mouth.bottom - (mouth.gapY + mouth.gapH) };
    if (rectsOverlap(playerHazardRect(), topHazard) || rectsOverlap(playerHazardRect(), bottomHazard)) kill("mouth");
  }
}

function collidePlatforms(old) {
  const solids = level.platforms.filter((p) => p.kind !== "ghost-pass" && p.kind !== "decor");
  const landingTolerance = player.gravity === 1 ? 54 : 62;
  for (const p of solids) {
    if (!overlapX(player, p)) continue;
    if (player.gravity === 1 && player.vy >= 0 && old.y + player.h <= p.y + landingTolerance && player.y + player.h >= p.y) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      if (Math.abs(player.vx) > 120) dust(player.x + player.w / 2, player.y + player.h);
    }
    if (player.gravity === -1 && player.vy <= 0 && old.y >= p.y + p.h - landingTolerance && player.y <= p.y + p.h) {
      player.y = p.y + p.h;
      player.vy = 0;
      player.onGround = true;
      if (Math.abs(player.vx) > 120) dust(player.x + player.w / 2, player.y);
    }
  }
}

function dust(x, y) {
  if (Math.random() > 0.28) return;
  state.particles.push({ x, y, vx: -55 + Math.random() * 35, vy: -40 - Math.random() * 80, life: 0.22, size: 4, color: "#d7c5a7" });
}

function updateCommonInteractions() {
  const pr = playerRect();
  const dangerRect = playerHazardRect();
  for (const h of level.hazards) if (rectsOverlap(dangerRect, spikeHitRect(h))) kill("spike");
  for (const m of level.movers) {
    const r = movingRect(m);
    if (rectsOverlap(dangerRect, r)) kill("spike");
  }
  for (const booster of level.boosters) {
    if (!rectsOverlap(pr, booster)) continue;
    if (booster.type === "blueBoost" && !booster.used) {
      applyImpulse(-player.gravity * booster.power, booster.x + booster.w / 2, booster.y + booster.h / 2, "boost");
      booster.used = true;
      setTimeout(() => { booster.used = false; }, 700);
    }
    if (booster.type === "portalDown") enterPortal(booster);
  }
  for (const dots of level.downDots) {
    if (rectsOverlap(pr, dots) && !dots.used) {
      player.vy = Math.abs(dots.power) * player.gravity;
      dots.used = true;
      state.shake = 0.08;
      playTone(210, 0.08, "triangle", 0.05);
      setTimeout(() => { dots.used = false; }, 900);
    }
  }
  for (const trap of level.traps) {
    if (!trap.used && rectsOverlap(pr, trap)) {
      player.vx = 430;
      player.vy = 570 * player.gravity;
      trap.used = true;
      state.shake = 0.12;
      state.zoomPunch = 0.1;
      playTone(170, 0.1, "sawtooth", 0.05);
      setTimeout(() => { trap.used = false; }, 1000);
    }
  }
  for (const spring of level.trampolines) {
    if (rectsOverlap(pr, spring) && player.springCooldown <= 0 && player.vy * player.gravity >= -40) {
      player.vx = spring.vx;
      player.vy = spring.vy;
      player.springCooldown = 0.4;
      state.shake = 0.05;
      state.zoomPunch = 0.06;
      spawnBurst(spring.x + spring.w / 2, spring.y + spring.h / 2, "boost", 12);
      playTone(500, 0.08, "triangle", 0.05);
    }
  }
  for (const pad of level.autoPads) {
    if (rectsOverlap(pr, pad) && !pad.used) {
      pad.used = true;
      player.vx = Math.max(player.vx, pad.vx);
      player.vy = -player.gravity * pad.power;
      player.onGround = false;
      spawnBurst(pad.x + pad.w / 2, pad.y + pad.h / 2, "boost", 14);
      setTimeout(() => { pad.used = false; }, 800);
    }
  }
  for (const orb of level.orbs) {
    if (circleRectOverlap(orb.x + orb.w / 2, orb.y + orb.h / 2, orb.w / 2 + 18, pr) && keys.jump && player.orbCooldown <= 0) {
      player.vy = -player.gravity * orb.power;
      player.orbCooldown = 0.22;
      player.onGround = false;
      spawnBurst(orb.x + orb.w / 2, orb.y + orb.h / 2, "boost", 12);
      playTone(690, 0.07, "triangle", 0.05);
    }
  }
  for (const ring of level.gravityRings) {
    if (circleRectOverlap(ring.x + ring.w / 2, ring.y + ring.h / 2, ring.w / 2 + 18, pr) && player.portalCooldown <= 0) {
      player.gravity = ring.targetGravity;
      player.vy = ring.targetGravity === -1 ? -Math.abs(ring.impulse) : Math.abs(ring.impulse);
      player.portalCooldown = 0.5;
      state.portalFlash = 0.2;
      state.shake = 0.08;
      spawnBurst(ring.x + ring.w / 2, ring.y + ring.h / 2, "portal", 18);
    }
  }
  for (const portal of level.portals) if (rectsOverlap(pr, portal)) enterPortal(portal);
  if (player.y > WORLD.height + 140 || player.y < -260) kill("fall");
}

function applyImpulse(vy, x, y, reason = "boost") {
  player.vy = vy;
  player.onGround = false;
  state.shake = 0.08;
  state.zoomPunch = 0.08;
  spawnBurst(x, y, reason, 12);
  playTone(620, 0.08, "triangle", 0.05);
}

function circleRectOverlap(cx, cy, radius, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= radius * radius;
}

function movingRect(m) {
  const offset = Math.sin(state.time * m.speed + m.phase) * m.amp;
  return {
    x: m.axis === "x" ? m.x + offset : m.x,
    y: m.axis === "y" ? m.y + offset : m.y,
    w: m.w,
    h: m.h,
    kind: m.kind,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(t) {
  const v = clamp01(t);
  return v < 0.5 ? 4 * v * v * v : 1 - ((-2 * v + 2) ** 3) / 2;
}

function easeOutBack(t) {
  const v = clamp01(t) - 1;
  return 1 + 2.2 * v * v * v + 1.2 * v * v;
}

function portalCenter(portal) {
  return {
    x: portal.x + portal.w / 2,
    y: portal.y + portal.h / 2,
  };
}

function portalTargetSnapshot(portal) {
  if (!portal.target) return null;
  return {
    x: portal.target.x,
    y: portal.target.y,
    mode: portal.target.mode,
    gravity: portal.target.gravity,
    vx: portal.target.mode === "plane" ? 318 : 300,
    vy: 0,
  };
}

function enterPortal(portal) {
  const type = portal.type || portal;
  if (state.portalTransition) return;
  if (type !== "finish" && player.portalCooldown > 0) return;

  const center = portalCenter(portal);
  const target = portalTargetSnapshot(portal);
  state.portalTransition = {
    portal,
    type,
    phase: "enter",
    timer: 0,
    enterDuration: type === "finish" ? 0.24 : 0.18,
    exitDuration: type === "finish" ? 0 : 0.18,
    from: {
      x: player.x,
      y: player.y,
      angle: player.angle,
      vx: player.vx,
      vy: player.vy,
    },
    center,
    target,
  };

  player.portalCooldown = 0.55;
  player.onGround = false;
  player.yellowActive = false;
  player.vx *= 0.35;
  player.vy *= 0.35;
  state.shake = 0.11;
  state.zoomPunch = 0.18;
  state.portalFlash = 0.18;
  spawnBurst(player.x + player.w / 2, player.y + player.h / 2, "portal", 20);
  playTone(type === "finish" ? 880 : 520, 0.1, "triangle", 0.05);
}

function updatePortalTransition(dt) {
  const transition = state.portalTransition;
  if (!transition) return;

  transition.timer += dt;
  player.deadTimer = 0;
  player.onGround = false;
  player.jumpLatch = true;
  player.vx = 0;
  player.vy = 0;

  if (transition.phase === "enter") {
    const t = easeInOutCubic(transition.timer / transition.enterDuration);
    const targetX = transition.center.x - player.w / 2;
    const targetY = transition.center.y - player.h / 2;
    player.x = lerp(transition.from.x, targetX, t);
    player.y = lerp(transition.from.y, targetY, t);
    player.angle = transition.from.angle + t * Math.PI * 1.35;
    player.portalScale = lerp(1, 0.28, t);
    state.portalFlash = Math.max(state.portalFlash, 0.08 + t * 0.18);

    if (transition.timer < transition.enterDuration) return;

    if (transition.type === "finish") {
      state.portalTransition = null;
      player.portalScale = 1;
      player.x = targetX;
      player.y = targetY;
      finish();
      return;
    }

    applyPortalTarget(transition);
    transition.phase = "exit";
    transition.timer = 0;
    transition.from = {
      x: player.x,
      y: player.y,
      angle: player.angle,
      vx: player.vx,
      vy: player.vy,
    };
    player.portalScale = 0.36;
    state.portalFlash = 0.3;
    state.zoomPunch = Math.max(state.zoomPunch, 0.16);
    snapCameraToPlayer();
    spawnBurst(player.x + player.w / 2, player.y + player.h / 2, "portal", 24);
    playTone(700, 0.08, "triangle", 0.045);
    return;
  }

  const t = easeOutBack(transition.timer / transition.exitDuration);
  player.portalScale = lerp(0.36, 1, t);
  player.angle = transition.from.angle + (1 - clamp01(t)) * Math.PI * 0.8;
  state.portalFlash = Math.max(0, Math.max(state.portalFlash, 0.18 * (1 - clamp01(t))));

  if (transition.timer >= transition.exitDuration) {
    player.portalScale = 1;
    player.jumpLatch = false;
    player.vx = transition.target?.vx ?? 300;
    player.vy = transition.target?.vy ?? 0;
    state.portalTransition = null;
  }
}

function applyPortalTarget(transition) {
  const target = transition.target;
  if (!target) return;
  setMini(false);
  player.mode = target.mode;
  player.gravity = target.gravity;
  player.x = target.x;
  player.y = target.y;
  player.vx = target.vx;
  player.vy = target.vy;
  player.onGround = false;
  player.jumpLatch = false;
  player.yellowActive = false;
}

function updateMiniMode() {
  const isMini = level.miniZones.some((zone) => rectsOverlap(playerRect(), zone));
  setMini(isMini);
}

function setMini(enabled) {
  const size = enabled ? 26 : 34;
  if (player.w === size) {
    player.mini = enabled;
    return;
  }
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  player.w = size;
  player.h = size;
  player.x = cx - size / 2;
  player.y = cy - size / 2;
  player.mini = enabled;
}

function updateTrail(dt, active) {
  if (active) {
    player.trail.push({
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      life: 0.34,
      mode: player.mode,
      activeYellow: player.yellowActive,
      gravity: player.gravity,
      mini: player.mini,
    });
  }
  for (const t of player.trail) t.life -= dt * (keys.jump ? 0.9 : 2.2);
  player.trail = player.trail.filter((t) => t.life > 0);
}

function updateCamera(dt) {
  const target = cameraTarget();
  camera.x += (target.x - camera.x) * Math.min(1, dt * 5.8);
  camera.y += (target.y - camera.y) * Math.min(1, dt * 5.0);
}

function updateHud() {
  sectionEl.textContent = state.currentSection.name;
  progressEl.style.transform = `scaleX(${levelProgress()})`;
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, viewW, viewH);
  drawBackground();
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * 10 : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
  const zoom = 1 + state.zoomPunch * 0.16;
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-viewW / 2 + shakeX, -viewH / 2 + shakeY);
  drawWorld();
  drawParticles();
  drawPlayer();
  drawPortalFlash();
  ctx.restore();
}

function drawBackground() {
  const section = state.currentSection || level.sections[0];
  const beat = 0.5 + Math.sin(state.time * 7.4) * 0.5;
  const g = ctx.createLinearGradient(0, 0, viewW, viewH);
  g.addColorStop(0, mixHex(section.accent, "#fbf3e4", 0.68));
  g.addColorStop(0.48, mixHex(section.accent, "#f7f0e4", 0.9));
  g.addColorStop(1, mixHex(section.accent, "#e9f5f6", 0.72));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  const baseX = -camera.x * 0.16;
  const baseY = -camera.y * 0.09;
  ctx.save();
  ctx.globalAlpha = 0.08 + beat * 0.03;
  ctx.strokeStyle = mixHex(section.accent, colors.ink, 0.35);
  ctx.lineWidth = 2;
  for (let x = (baseX * 1.8) % 92 - 92; x < viewW + 110; x += 92) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 180, viewH);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.12;
  for (let y = (baseY * 2.4) % 86 - 86; y < viewH + 100; y += 86) {
    ctx.fillStyle = y % 172 < 86 ? section.accent : colors.cyan;
    ctx.fillRect(0, y, viewW, 3);
  }
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 34; i++) {
    const x = (baseX * 2.2 + i * 132) % (viewW + 220) - 80;
    const y = viewH * 0.46 + ((baseY + i * 53) % (viewH * 0.62));
    ctx.fillStyle = i % 3 === 0 ? colors.pink : i % 3 === 1 ? colors.cyan : section.accent;
    ctx.fillRect(x, y, 46 + (i % 2) * 22, 7);
    if (i % 2 === 0) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 24);
      ctx.lineTo(x + 42, y + 44);
      ctx.lineTo(x + 18, y + 64);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (let i = 0; i < 116; i++) {
    const x = (baseX + i * 103) % (viewW + 260) - 100;
    const y = ((baseY + Math.sin(i * 1.9) * 112 + i * 57) % (viewH + 260)) - 80;
    ctx.globalAlpha = 0.19 + beat * 0.09;
    ctx.strokeStyle = i % 3 === 0 ? section.accent : i % 3 === 1 ? colors.pink : colors.cyan;
    ctx.lineWidth = 3 + (i % 3);
    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 12 + (i % 5) * 5, 0.2, Math.PI * (1.1 + (i % 4) * 0.15));
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 12);
      ctx.lineTo(x + 18, y + 12);
      ctx.moveTo(x + 18, y - 12);
      ctx.lineTo(x + 34, y + 12);
      ctx.stroke();
    }
  }
  drawSpeedStreaks(section);
  ctx.globalAlpha = 1;
}

function drawSpeedStreaks(section) {
  if (!state.running || state.paused || state.finished) return;
  const intensity = Math.max(0, Math.min(1, (Math.abs(player.vx) - 318) / 142));
  if (intensity <= 0.04) return;

  ctx.save();
  ctx.globalAlpha = 0.05 + intensity * 0.1;
  ctx.strokeStyle = mixHex(section.accent, "#ffffff", 0.16);
  ctx.lineWidth = 2.4 + intensity * 2.2;
  ctx.lineCap = "round";
  for (let i = 0; i < 30; i++) {
    const x = (viewW - ((camera.x * 0.62 + state.time * 240 + i * 117) % (viewW + 240))) + 90;
    const y = ((camera.y * 0.05 + i * 49 + Math.sin(state.time * 2 + i) * 18) % (viewH + 110)) - 55;
    const len = 62 + intensity * 96 + (i % 3) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y + 7 + intensity * 7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorld() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawSectionBands();
  drawDecorations();
  drawRouteBands();
  drawSpeedZones();
  drawPlatforms();
  drawHazards();
  drawYellowZones();
  drawBoosters();
  drawAutoPads();
  drawOrbs();
  drawGravityRings();
  drawTrampolines();
  drawPortals();
  drawMouths();
  drawMovers();
  ctx.restore();
}

function isVisible(obj, margin = 180) {
  return obj.x + (obj.w || 0) > camera.x - margin && obj.x < camera.x + viewW + margin;
}

function drawSectionBands() {
  for (const section of level.sections) {
    if (!isVisible(section, 120)) continue;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = section.accent;
    ctx.fillRect(section.x, 0, section.w, WORLD.height);
    ctx.globalAlpha = 0.16;
    ctx.fillRect(section.x, Math.max(90, section.lane - 270), section.w, 18);
    ctx.fillRect(section.x, Math.min(WORLD.height - 120, section.lane + 126), section.w, 12);
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = mixHex(section.accent, "#ffffff", 0.22);
    for (let x = section.x + 36; x < section.x + section.w; x += 118) {
      ctx.beginPath();
      ctx.moveTo(x, section.lane - 210);
      ctx.lineTo(x + 24, section.lane - 186);
      ctx.lineTo(x, section.lane - 162);
      ctx.lineTo(x + 10, section.lane - 186);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + 48, section.lane + 88, 46, 8);
    }
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = section.accent;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 18]);
    ctx.beginPath();
    ctx.moveTo(section.x, 80);
    ctx.lineTo(section.x, WORLD.height - 80);
    ctx.stroke();
    ctx.restore();
  }
}

function drawRouteBands() {
  for (const band of level.routeBands || []) {
    const visibility = band.kind === "vertical"
      ? { x: band.x, w: band.w }
      : { x: band.x, w: band.w + Math.abs(band.dy || 0) };
    if (!isVisible(visibility, 260)) continue;
    drawRouteBand(band);
  }
}

function drawRouteBand(band) {
  if (band.kind === "tunnel3d") {
    drawRouteTunnel3d(band);
    return;
  }

  const thick = band.kind === "vertical" ? band.w : band.h;
  let length = band.w;
  let angle = 0;
  let originX = band.x;
  let originY = band.y + band.h / 2;

  if (band.kind === "vertical") {
    length = band.h;
    angle = band.dir === "up" ? -Math.PI / 2 : Math.PI / 2;
    originX = band.x + band.w / 2;
    originY = band.dir === "up" ? band.y + band.h : band.y;
  } else if (band.kind === "diagonal") {
    angle = Math.atan2(band.dy || 0, band.w);
    length = Math.hypot(band.w, band.dy || 0);
    originY = band.y;
  }

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = mixHex(band.color, "#ffffff", 0.38);
  ctx.strokeStyle = band.color;
  ctx.shadowColor = band.color;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(0, -thick / 2, length, thick, 12);
  ctx.fill();
  ctx.globalAlpha = 0.68;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.setLineDash([18, 18]);
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = mixHex(band.color, "#ffffff", 0.22);
  ctx.beginPath();
  ctx.moveTo(0, -thick / 2 - 18);
  ctx.lineTo(length, -thick / 2 - 18);
  ctx.moveTo(0, thick / 2 + 18);
  ctx.lineTo(length, thick / 2 + 18);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = band.color;
  ctx.lineWidth = 7;
  const offset = (state.time * 120) % 92;
  for (let x = 42 + offset; x < length - 24; x += 92) {
    ctx.beginPath();
    ctx.moveTo(x - 24, -22);
    ctx.lineTo(x + 12, 0);
    ctx.lineTo(x - 24, 22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRouteTunnel3d(band) {
  const nearHalf = band.h / 2;
  const farHalf = band.h * 0.16;
  const farY = band.vanishY ?? band.y;
  const depth = 11;
  const phase = (state.time * 0.42) % (1 / depth);
  const left = band.x;
  const right = band.x + band.w;

  function point(t, side) {
    const cx = left + band.w * t;
    const cy = band.y + (farY - band.y) * t;
    const half = nearHalf + (farHalf - nearHalf) * t;
    return { x: cx, y: cy + half * side };
  }

  const nearTop = point(0, -1);
  const nearBottom = point(0, 1);
  const farTop = point(1, -1);
  const farBottom = point(1, 1);

  ctx.save();
  const fill = ctx.createLinearGradient(left, band.y - nearHalf, right, farY);
  fill.addColorStop(0, "rgba(244,114,182,0.34)");
  fill.addColorStop(0.48, "rgba(139,92,246,0.22)");
  fill.addColorStop(1, "rgba(32,197,214,0.18)");
  ctx.fillStyle = fill;
  ctx.strokeStyle = band.color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = band.color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(nearTop.x, nearTop.y);
  ctx.lineTo(farTop.x, farTop.y);
  ctx.lineTo(farBottom.x, farBottom.y);
  ctx.lineTo(nearBottom.x, nearBottom.y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.shadowBlur = 0;
  for (let i = 0; i <= depth; i++) {
    const t = Math.min(1, i / depth + phase);
    const top = point(t, -1);
    const bottom = point(t, 1);
    const half = Math.abs(bottom.y - top.y) / 2;
    const alpha = 0.82 - t * 0.44;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = i % 2 ? colors.cyan : band.color;
    ctx.lineWidth = Math.max(2, 7 - t * 4);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.56;
    ctx.setLineDash([18 - t * 8, 16]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + half * 0.36);
    ctx.lineTo(bottom.x, bottom.y - half * 0.36);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = mixHex(band.color, "#ffffff", 0.38);
  ctx.lineWidth = 4;
  for (let row = -2; row <= 2; row++) {
    const side = row / 2;
    const start = point(0, side);
    const end = point(1, side);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = colors.yellow;
  ctx.lineWidth = 7;
  for (let i = 0; i < 6; i++) {
    const t = ((state.time * 0.24 + i / 6) % 1);
    const center = point(t, 0);
    const scale = 1 - t * 0.58;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(-30, -26);
    ctx.lineTo(20, 0);
    ctx.lineTo(-30, 26);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawDecorations() {
  for (const d of level.decorations) {
    if (!isVisible({ x: d.x, w: 60 }, 120)) continue;
    const pulse = 1 + Math.sin(state.time * 4 + d.phase) * 0.08;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale((d.scale || 1) * pulse, (d.scale || 1) * pulse);
    ctx.globalAlpha = 0.68;
    ctx.strokeStyle = d.color;
    ctx.fillStyle = d.color;
    ctx.lineWidth = 5;
    if (d.kind === "arc") {
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0.2, Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (d.kind === "dotCluster") {
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i) * 24, Math.sin(i * 1.7) * 19, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (d.kind === "slash") {
      ctx.lineWidth = 7;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-22 + i * 18, -22);
        ctx.lineTo(-6 + i * 18, 22);
        ctx.stroke();
      }
    }
    if (d.kind === "spark") {
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();
      }
    }
    if (d.kind === "miniBlock") {
      ctx.fillStyle = mixHex(d.color, "#ffffff", 0.35);
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-18, -12, 36, 24, 4);
      ctx.fill();
      ctx.stroke();
    }
    if (d.kind === "arrow") {
      ctx.rotate(d.dir === "down" ? Math.PI / 2 : 0);
      ctx.beginPath();
      ctx.moveTo(-18, -16);
      ctx.lineTo(16, 0);
      ctx.lineTo(-18, 16);
      ctx.stroke();
    }
    if (d.kind === "chevron") {
      ctx.rotate(d.dir === "down" ? Math.PI / 2 : 0);
      ctx.lineWidth = 6;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-18 + i * 18, -18);
        ctx.lineTo(4 + i * 18, 0);
        ctx.lineTo(-18 + i * 18, 18);
        ctx.stroke();
      }
    }
    if (d.kind === "tile") {
      ctx.fillStyle = mixHex(d.color, "#ffffff", 0.28);
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-16, -16, 32, 32, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = d.color;
      ctx.fillRect(-8, -8, 16, 16);
    }
    if (d.kind === "rail") {
      ctx.lineWidth = 6;
      ctx.strokeStyle = mixHex(d.color, "#ffffff", 0.18);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-26 + i * 22, -10 + i * 10);
        ctx.lineTo(4 + i * 22, -10 + i * 10);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawPlatforms() {
  for (const p of level.platforms) {
    if (!isVisible(p)) continue;
    ctx.save();
    const ghost = p.kind.startsWith("ghost");
    ctx.globalAlpha = p.kind === "ghost-pass" ? 0.38 + Math.sin(state.time * 5 + p.x) * 0.12 : ghost ? 0.7 : 1;
    ctx.fillStyle = p.kind === "ghost-pass" ? "rgba(139,92,246,0.28)" : p.kind === "ghost-check" ? "rgba(32,197,214,0.34)" : colors.platformFill;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = ghost ? 3 : 7;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 5);
    ctx.fill();
    ctx.stroke();
    drawPlatformScribbles(p);
    if (p.kind === "ghost-check") drawCheck(p.x + p.w / 2, p.y - 22);
    if (p.kind === "ghost-pass") drawPassCue(p.x + p.w / 2, p.y - 20);
    ctx.restore();
  }
}

function drawPlatformScribbles(p) {
  ctx.save();
  ctx.globalAlpha = p.kind.startsWith("ghost") ? 0.5 : 0.34;
  ctx.strokeStyle = p.kind.startsWith("ghost") ? colors.cyan : "#a48c69";
  ctx.lineWidth = 2;
  for (let x = p.x + 14; x < p.x + p.w - 12; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + p.h - 10);
    ctx.quadraticCurveTo(x + 13, p.y + p.h - 18, x + 30, p.y + p.h - 9);
    ctx.stroke();
    if (x % 84 < 42) {
      ctx.beginPath();
      ctx.moveTo(x + 9, p.y + 10);
      ctx.lineTo(x + 27, p.y + 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHazards() {
  for (const h of level.hazards) {
    if (isVisible(h)) drawSpikeStrip(h);
  }
}

function drawSpikeStrip(h) {
  const count = Math.max(1, Math.floor(h.w / 24));
  const step = h.w / count;
  ctx.save();
  ctx.fillStyle = colors.ink;
  ctx.strokeStyle = colors.ink;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = h.x + i * step;
    if (h.dir === "down") {
      ctx.moveTo(x, h.y);
      ctx.lineTo(x + step / 2, h.y + h.h);
      ctx.lineTo(x + step, h.y);
    } else {
      ctx.moveTo(x, h.y + h.h);
      ctx.lineTo(x + step / 2, h.y);
      ctx.lineTo(x + step, h.y + h.h);
    }
  }
  ctx.fill();
  ctx.restore();
}

function drawSpeedZones() {
  for (const zone of level.speedZones) {
    if (!isVisible(zone)) continue;
    const fast = zone.type === "fast";
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = fast ? colors.green : colors.violet;
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const x = zone.x + 18 + i * 22;
      ctx.beginPath();
      ctx.moveTo(x, zone.y + 18);
      ctx.lineTo(x + (fast ? 20 : -4), zone.y + zone.h / 2);
      ctx.lineTo(x, zone.y + zone.h - 18);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawBoosters() {
  for (const b of level.boosters) {
    if (!isVisible(b)) continue;
    if (b.type === "portalDown") continue;
    const pulse = 1 + Math.sin(state.time * 8) * 0.04;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = colors.blue;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.cyan;
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 13 - 4, -23, 8, 30);
    ctx.restore();
  }
  for (const d of level.downDots) {
    if (!isVisible(d)) continue;
    ctx.fillStyle = colors.cyan;
    for (let i = 0; i < 9; i++) {
      const x = d.x + 16 + (i % 3) * 26;
      const y = d.y + 18 + Math.floor(i / 3) * 24 + Math.sin(state.time * 5 + i) * 3;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const trap of level.traps) {
    if (!isVisible(trap)) continue;
    ctx.fillStyle = "#28212a";
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(trap.x, trap.y, trap.w, trap.h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.orange;
    ctx.fillRect(trap.x + 12, trap.y + 15, 18, 17);
  }
}

function drawYellowZones() {
  for (const zone of level.yellowZones) {
    if (!isVisible(zone)) continue;
    const active = player.yellowActive && rectsOverlap(playerRect(), zone);
    const pulse = active ? 1 + Math.sin(state.time * 18) * 0.18 : 1;
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.82;
    ctx.strokeStyle = colors.yellow;
    ctx.lineWidth = active ? 8 : 5;
    const start = zone.x + ((state.time * (active ? 280 : 180)) % 42);
    for (let x = start; x < zone.x + zone.w - 30; x += 42) {
      const y = zone.y + zone.h / 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 24 * pulse);
      ctx.lineTo(x + 28 * pulse, y);
      ctx.lineTo(x, y + 24 * pulse);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawAutoPads() {
  for (const pad of level.autoPads) {
    if (!isVisible(pad)) continue;
    ctx.save();
    ctx.fillStyle = colors.green;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = colors.yellow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pad.x + 16, pad.y + 20);
    ctx.lineTo(pad.x + pad.w / 2, pad.y + 7);
    ctx.lineTo(pad.x + pad.w - 16, pad.y + 20);
    ctx.stroke();
    ctx.restore();
  }
}

function drawOrbs() {
  for (const orb of level.orbs) {
    if (!isVisible(orb)) continue;
    const cx = orb.x + orb.w / 2;
    const cy = orb.y + orb.h / 2;
    const pulse = 1 + Math.sin(state.time * 6 + orb.x) * 0.1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = orb.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, orb.w / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = mixHex(orb.color, "#ffffff", 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGravityRings() {
  for (const ring of level.gravityRings) {
    if (!isVisible(ring)) continue;
    const cx = ring.x + ring.w / 2;
    const cy = ring.y + ring.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.time * (ring.targetGravity === -1 ? 2.7 : -2.7));
    ctx.strokeStyle = ring.targetGravity === -1 ? colors.orange : colors.cyan;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, ring.w / 2, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = colors.violet;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ring.w / 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTrampolines() {
  for (const s of level.trampolines) {
    if (!isVisible(s)) continue;
    ctx.fillStyle = colors.green;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + s.h);
    ctx.lineTo(s.x + s.w / 2, s.y);
    ctx.lineTo(s.x + s.w, s.y + s.h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawPortals() {
  for (const b of level.boosters.filter((o) => o.type === "portalDown")) {
    if (isVisible(b)) drawPortal(b, ...portalPalette(b));
  }
  for (const p of level.portals) {
    if (!isVisible(p)) continue;
    drawPortal(p, ...portalPalette(p));
  }
}

function portalPalette(p) {
  if (p.type === "portalDown") return [colors.orange, colors.blue];
  if (p.type === "gravityFlip") return [colors.orange, colors.violet];
  if (p.type === "gravityRestore") return [colors.cyan, colors.violet];
  if (p.type === "finish") return [colors.violet, colors.yellow];
  return [colors.cyan, colors.green];
}

function drawPortal(p, c1, c2) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const active = state.portalTransition?.portal === p;
  const pulse = 1 + Math.sin(state.time * (active ? 18 : 7)) * (active ? 0.1 : 0.04);
  const spin = state.time * (active ? 5.2 : 2.4);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.shadowColor = c1;
  ctx.shadowBlur = active ? 34 : 18;
  ctx.globalAlpha = active ? 0.34 : 0.2;
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.w / 2.15 * pulse, p.h / 1.92 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = active ? 11 : 8;
  ctx.strokeStyle = c1;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.w / 2.55 * pulse, p.h / 2.2 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-spin * 1.8);
  ctx.lineWidth = active ? 6 : 4;
  ctx.strokeStyle = c2;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.w / 3.2, p.h / 3.1, 0, 0, Math.PI * (1.45 + Math.sin(state.time * 4) * 0.18));
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.globalAlpha = active ? 0.62 : 0.38;
  for (let i = 0; i < 5; i++) {
    const y = (i - 2) * p.h * 0.09;
    ctx.strokeStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.ellipse(0, y, p.w * (0.18 + i * 0.045), p.h * (0.05 + i * 0.012), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 10; i++) {
    const a = state.time * (active ? 4.4 : 2.2) + i * Math.PI / 5;
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * p.w * 0.36 * pulse, Math.sin(a) * p.h * 0.39 * pulse, active ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMouths() {
  for (const m of level.mouths) {
    if (!isVisible({ x: m.x, y: m.top, w: 90, h: m.bottom - m.top })) continue;
    const close = m.closed ? 52 : m.passed ? Math.max(0, 44 * (1 - m.closeTimer / 0.24)) : 0;
    const breathe = Math.sin(state.time * 6 + m.x) * 5;
    const topH = m.gapY - m.top + close + breathe;
    const bottomY = m.gapY + m.gapH - close - breathe;
    drawMouthBlock(m.x, m.top, 74, topH, "down");
    drawMouthBlock(m.x, bottomY, 74, m.bottom - bottomY, "up");
  }
}

function drawMouthBlock(x, y, w, h, dir) {
  ctx.fillStyle = "#28b6b8";
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.stroke();
  const teeth = { x, y: dir === "down" ? y + h - 20 : y, w, h: 22, dir };
  drawSpikeStrip(teeth);
  ctx.fillStyle = colors.orange;
  ctx.beginPath();
  ctx.arc(x + 20, y + 24, 6, 0, Math.PI * 2);
  ctx.arc(x + 54, y + 24, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawMovers() {
  for (const m of level.movers) {
    if (!isVisible({ x: m.x - m.amp - 20, y: m.y - m.amp - 20, w: m.w + m.amp * 2 + 40, h: m.h + m.amp * 2 + 40 })) continue;
    const r = movingRect(m);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = colors.pink;
    ctx.setLineDash([8, 10]);
    ctx.lineWidth = 3;
    ctx.strokeRect(m.axis === "x" ? m.x - m.amp : m.x, m.axis === "y" ? m.y - m.amp : m.y, m.axis === "x" ? m.w + m.amp * 2 : m.w, m.axis === "y" ? m.h + m.amp * 2 : m.h);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.pink;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawCheck(x, y) {
  ctx.strokeStyle = colors.cyan;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x - 4, y + 14);
  ctx.lineTo(x + 22, y - 18);
  ctx.stroke();
}

function drawPassCue(x, y) {
  ctx.strokeStyle = colors.violet;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    const xx = x + i * 18;
    ctx.beginPath();
    ctx.moveTo(xx - 8, y - 8);
    ctx.lineTo(xx, y + 6 + Math.sin(state.time * 5 + i) * 5);
    ctx.lineTo(xx + 8, y - 8);
    ctx.stroke();
  }
}

function drawParticles() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for (const t of player.trail) {
    ctx.globalAlpha = Math.max(0, t.life * 2.2);
    ctx.fillStyle = t.activeYellow ? colors.yellow : t.mode === "plane" ? colors.cyan : t.mini ? colors.pink : colors.orange;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.activeYellow ? 10 : t.mini ? 5 : 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (player.deadTimer <= 0) {
    if (player.mode === "plane") drawPlane();
    else drawCube();
  }
  ctx.restore();
}

function drawCube() {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.angle);
  ctx.scale(player.portalScale, player.portalScale);
  ctx.fillStyle = player.mini ? colors.pink : colors.blue;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = player.mini ? 5 : 6;
  ctx.beginPath();
  ctx.roundRect(-player.w / 2, -player.h / 2, player.w, player.h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.cyan;
  ctx.fillRect(-player.w * 0.28, -player.h * 0.18, player.w * 0.2, player.h * 0.24);
  ctx.fillRect(player.w * 0.1, -player.h * 0.18, player.w * 0.2, player.h * 0.24);
  ctx.restore();
}

function drawPlane() {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.angle);
  ctx.scale(player.portalScale, player.portalScale);
  ctx.fillStyle = colors.cyan;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-18, -18);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.yellow;
  ctx.fillRect(-5, -5, 13, 10);
  ctx.restore();
}

function drawPortalFlash() {
  if (state.portalFlash <= 0) return;
  ctx.save();
  const activePortal = state.portalTransition?.portal;
  const [primary, secondary] = activePortal ? portalPalette(activePortal) : [state.currentSection?.accent || colors.cyan, colors.yellow];
  ctx.globalAlpha = state.portalFlash * 1.15;
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, viewW, viewH);
  if (activePortal) {
    const cx = activePortal.x + activePortal.w / 2 - camera.x;
    const cy = activePortal.y + activePortal.h / 2 - camera.y;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(viewW, viewH) * 0.7);
    glow.addColorStop(0, secondary);
    glow.addColorStop(0.34, primary);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = Math.min(0.55, state.portalFlash * 2.4);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  ctx.restore();
}

function loop(now) {
  const rawDt = Math.max(0, (now - last) / 1000) * TEST_TIME_SCALE;
  last = now;
  let remaining = Math.min(TEST_RUN ? 0.18 : 0.04, rawDt);
  while (remaining > 0) {
    const dt = Math.min(0.02, remaining);
    update(dt);
    remaining -= dt;
  }
  draw();
  writeDebugDataset();
  requestAnimationFrame(loop);
}

function setKey(value) {
  keys.jump = value;
}

function readExternalTestInput() {
  const raw = canvas.dataset.testInput;
  if (!raw) return;
  try {
    const input = JSON.parse(raw);
    keys.jump = !!input.jump;
  } catch {
    canvas.dataset.testInput = "";
  }
}

function applyTestRunInput() {
  if (!TEST_RUN) return;
  let jump = false;
  const x = player.x;

  if (player.mode === "plane") {
    const target = planeTargetY(x);
    jump = player.y + player.h / 2 > target;
  } else {
    jump = level.testActions.some((action) => x > action.x && x < action.x + action.w);
    jump ||= seesFloorSpikeAhead();
    jump ||= seesMoverAhead();
    jump ||= level.yellowZones.some((zone) => x > zone.x + 10 && x < zone.x + zone.w - 95);
    jump ||= level.orbs.some((orb) => Math.abs((orb.x + orb.w / 2) - (player.x + player.w / 2)) < 42);
    jump ||= level.gravityRings.some((ring) => Math.abs((ring.x + ring.w / 2) - (player.x + player.w / 2)) < 42);
  }
  keys.jump = jump;
}

function seesFloorSpikeAhead() {
  if (!player.onGround) return false;
  const front = player.x + player.w;
  const bottom = player.y + player.h;
  const lookAhead = player.mini
    ? 156
    : state.currentSection?.id === "start"
      ? 105
      : state.currentSection?.id === "spikes"
        ? 122
        : state.currentSection?.id === "trap"
          ? 80
          : 160;
  return level.hazards.some((h) => {
    const ahead = h.x >= front - 8 && h.x <= front + lookAhead;
    if (!ahead) return false;
    if (player.gravity === 1) return h.dir === "up" && h.y >= bottom - 78 && h.y <= bottom + 18;
    return h.dir === "down" && h.y + h.h <= player.y + 86 && h.y + h.h >= player.y - 24;
  });
}

function seesMoverAhead() {
  if (!player.onGround) return false;
  const front = player.x + player.w;
  return level.movers.some((m) => {
    const r = movingRect(m);
    const ahead = r.x >= front - 10 && r.x <= front + 170;
    const sameLane = r.y + r.h >= player.y - 40 && r.y <= player.y + player.h + 120;
    return ahead && sameLane;
  });
}

function planeTargetY(x) {
  if (x < scaleLevelX(5520)) return 1060;
  if (x < scaleLevelX(5900)) return 1050;
  if (x < scaleLevelX(6130)) return 1010;
  if (x < scaleLevelX(6500)) return 1110;
  return 1070;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    event.preventDefault();
    setKey(true);
  }
  if (event.code === "KeyR") restartFromCheckpoint(true);
  if (event.code === "Escape") {
    setPaused(!state.paused);
  }
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") setKey(false);
});

function isUiPointerTarget(target) {
  return !!target.closest("button, .hud, .overlay, .touch-controls");
}

gameShell.addEventListener("pointerdown", (event) => {
  if (TEST_RUN || isUiPointerTarget(event.target)) return;
  event.preventDefault();
  setKey(true);
});

window.addEventListener("pointerup", () => {
  if (!TEST_RUN) setKey(false);
});

window.addEventListener("pointercancel", () => {
  if (!TEST_RUN) setKey(false);
});

document.querySelectorAll("[data-control='jump']").forEach((button) => {
  const down = (event) => {
    event.preventDefault();
    button.classList.add("active");
    setKey(true);
  };
  const up = (event) => {
    event.preventDefault();
    button.classList.remove("active");
    setKey(false);
  };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("pointerleave", up);
});

startButton.addEventListener("click", () => {
  if (state.finished) {
    overlayTitle.textContent = level.title || "FIL Dash";
    startButton.textContent = "Старт";
    restartFromCheckpoint(false);
  }
  startGame();
});
pauseToggle.addEventListener("click", () => {
  setPaused(!state.paused);
});
soundToggle.addEventListener("click", () => {
  setMuted(!state.muted);
});

function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  requestTelegramGameViewport();
  try {
    tg.setHeaderColor("#10131f");
    tg.setBackgroundColor("#10131f");
  } catch {
    // Older Telegram WebApp runtimes do not support all chrome-color methods.
  }
}

function requestTelegramGameViewport() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  try {
    tg.expand();
    tg.requestFullscreen?.();
    tg.disableVerticalSwipes?.();
    if (window.innerWidth > window.innerHeight) tg.lockOrientation?.();
  } catch {
    // Telegram clients expose these methods by version; CSS fallback handles the rest.
  }
}

function requestBrowserLandscapeLock() {
  if (window.innerWidth > window.innerHeight) return;
  try {
    const lockPromise = screen.orientation?.lock?.("landscape");
    lockPromise?.catch?.(() => {});
  } catch {
    // Browser orientation lock is best-effort inside Telegram.
  }
}

function debugSnapshot() {
  return {
    player: {
      x: Math.round(player.x),
      y: Math.round(player.y),
      vx: Math.round(player.vx),
      vy: Math.round(player.vy),
      mode: player.mode,
      gravity: player.gravity,
      onGround: player.onGround,
      activeYellow: player.yellowActive,
      mini: player.mini,
      portalScale: Math.round(player.portalScale * 100) / 100,
      dead: player.deadTimer > 0,
    },
    running: state.running,
    paused: state.paused,
    finished: state.finished,
    portalTransition: state.portalTransition ? {
      type: state.portalTransition.type,
      phase: state.portalTransition.phase,
      timer: Math.round(state.portalTransition.timer * 100) / 100,
    } : null,
    attempts: state.attempts,
    time: Math.round(state.time * 100) / 100,
    lastDeath: state.lastDeath,
    lastDeathAt: state.lastDeathAt,
    errors: [...state.errors],
    section: state.currentSection?.id,
    sectionName: state.currentSection?.name,
    progress: Math.round(levelProgress() * 1000) / 10,
    checkpoint: {
      x: Math.round(state.checkpoint.x),
      y: Math.round(state.checkpoint.y),
      mode: state.checkpoint.mode,
      gravity: state.checkpoint.gravity,
    },
    camera: {
      x: Math.round(camera.x),
      y: Math.round(camera.y),
      screenX: Math.round(player.x - camera.x),
      screenY: Math.round(player.y - camera.y),
      viewW,
      viewH,
      forcedLandscape: forcedLandscapeViewport(),
    },
    world: {
      levelId: LEVEL_ID,
      levelNumber: level.number,
      levelTitle: level.title,
      availableLevels: levels.length,
      width: WORLD.width,
      height: WORLD.height,
      targetDurationSeconds: level.targetDurationSeconds,
      baseWidth: level.baseWidth,
      scale: Math.round(level.scale * 1000) / 1000,
      playableEndX,
      sections: level.sections.length,
      hazards: level.hazards.length,
      platforms: level.platforms.length,
      routeBands: level.routeBands?.length ?? 0,
      decorations: level.decorations.length,
    },
    audio: {
      musicSrc: level.music?.src ?? "",
      musicReadyState: levelMusic?.readyState ?? 0,
      musicPaused: levelMusic?.paused ?? true,
      musicCurrentTime: Math.round((levelMusic?.currentTime ?? 0) * 100) / 100,
      musicDuration: Number.isFinite(levelMusic?.duration) ? Math.round(levelMusic.duration * 100) / 100 : 0,
      musicGestureRetryBound: levelMusicGestureRetryBound,
      muted: state.muted,
    },
  };
}

function writeDebugDataset() {
  canvas.dataset.debug = JSON.stringify(debugSnapshot());
}

function mixHex(a, b, amount) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v * (1 - amount) + cb[i] * amount));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(clean.slice(i, i + 2), 16));
}

window.__FIL_DASH_DEBUG__ = debugSnapshot;

resize();
initTelegram();
document.title = level.title || "FIL Dash";
if (levelNameEl) levelNameEl.textContent = level.shortTitle || `L${level.number || 1}`;
overlayTitle.textContent = level.title || "FIL Dash";
updateRecordsUi();
if (!TEST_RUN) refreshGlobalLeaderboard();
if (TEST_RUN && sectionSpawns[TEST_SECTION]) {
  state.checkpoint = { ...structuredClone(sectionSpawns[TEST_SECTION]), xKey: sectionSpawns[TEST_SECTION].x };
}
restartFromCheckpoint(false);
writeDebugDataset();
updateHud();
if (TEST_RUN) {
  state.running = true;
  overlay.classList.add("hidden");
}
requestAnimationFrame(loop);
