import { DEFAULT_LEVEL_ID, getLevelById, levels } from "./levels.js?v=59";
import { startSpace3dLayer } from "./space3d.js?v=3";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const space3dCanvas = document.querySelector("#space3d");
const gameShell = document.querySelector(".game-shell");
const overlay = document.querySelector("#overlay");
const pauseOverlay = document.querySelector("#pauseOverlay");
const overlayTitle = overlay.querySelector(".overlay-title");
const levelPickerEl = document.querySelector("#levelPicker");
const testModePanelEl = document.querySelector("#testModePanel");
const checkpointPickerEl = document.querySelector("#checkpointPicker");
const startButton = document.querySelector("#startButton");
const menuToggle = document.querySelector("#menuToggle");
const pauseToggle = document.querySelector("#pauseToggle");
const soundToggle = document.querySelector("#soundToggle");
const levelNameEl = document.querySelector("#levelName");
const attemptsEl = document.querySelector("#attempts");
const bestTimeEl = document.querySelector("#bestTime");
const coinsCountEl = document.querySelector("#coinsCount");
const sectionEl = document.querySelector("#sectionName");
const progressEl = document.querySelector("#progressFill");
const lastResultEl = document.querySelector("#lastResult");
const bestResultEl = document.querySelector("#bestResult");
const rankResultEl = document.querySelector("#rankResult");
const rewardResultEl = document.querySelector("#rewardResult");
const localLeaderboardEl = document.querySelector("#localLeaderboard");
const globalLeaderboardEl = document.querySelector("#globalLeaderboard");
const skinShopEl = document.querySelector("#skinShop");

const searchParams = new URLSearchParams(window.location.search);
const level = getLevelById(searchParams.get("level") || searchParams.get("levelId"));
const WORLD = level.world;
const LEVEL_SCALE = level.scale;
const LEVEL_ID = level.id;
const SPACE_LEVEL = level.renderMode === "space3d";
const LEVEL_THEME = level.theme || (SPACE_LEVEL ? "space" : "classic");
const JUNGLE_LEVEL = LEVEL_THEME === "jungle";
const TITANIC_LEVEL = LEVEL_THEME === "titanic";
const TEST_RUN = searchParams.has("testRun");
const TEST_SECTION = searchParams.get("section") || "";
const TEST_MODE = queryFlag("testMode") || String(searchParams.get("mode") || "").toLowerCase() === "test" || searchParams.has("checkpoint");
const TEST_CHECKPOINT = searchParams.get("checkpoint") || searchParams.get("section") || "";
const TEST_TIME_SCALE = Number(searchParams.get("timeScale")) || 1;
const TEST_VARIANT = normalizeTestVariant(searchParams.get("variant"));
const SPACE_3D_SETTING = String(searchParams.get("space3d") || "").trim().toLowerCase();
const LEADERBOARD_API_URL = searchParams.get("leaderboardApi") || window.FIL_DASH_LEADERBOARD_API || "/api/leaderboard";
const LEGACY_LOCAL_RECORDS_KEY = "filDash.records.v1";
const LOCAL_RECORDS_KEY = `filDash.records.${LEVEL_ID}.v1`;
const RECORD_REWARDS_KEY = `filDash.recordRewards.${LEVEL_ID}.v1`;
const WALLET_KEY = "filDash.wallet.v1";
const SKINS_KEY = "filDash.skins.v1";
const SELECTED_SKIN_KEY = "filDash.selectedSkin.v1";
const PLAYER_ID_KEY = "filDash.playerId.v1";
const MAX_LOCAL_RECORDS = 12;
const HOLD_THRESHOLD_SECONDS = 0.1;
const HOLD_CAP_SECONDS = 0.32;
const INPUT_SPAM_GUARD_SECONDS = 0.08;
const TEST_VARIANT_TIME_SHIFT = TEST_VARIANT === "early" ? -0.08 : TEST_VARIANT === "late" ? 0.08 : 0;
const TOUCH_DEVICE = navigator.maxTouchPoints > 0 || window.matchMedia?.("(pointer: coarse)")?.matches;
const SMALL_VIEWPORT = Math.min(window.innerWidth, window.innerHeight) < 520;
const LOW_CPU_HINT = (navigator.hardwareConcurrency || 4) <= 4;
const SPACE_PERF_MODE = SPACE_LEVEL && !TEST_RUN && SPACE_3D_SETTING !== "high" && (TOUCH_DEVICE || SMALL_VIEWPORT || LOW_CPU_HINT || SPACE_3D_SETTING === "low");
const SPACE_3D_DISABLED = SPACE_LEVEL && (SPACE_3D_SETTING === "off" || SPACE_3D_SETTING === "0");
const MAX_CANVAS_DPR = SPACE_PERF_MODE ? 1.15 : 2;
const DEBUG_DATASET_INTERVAL_MS = TEST_RUN ? 0 : 180;
const SPACE_STAR_COUNT = SPACE_PERF_MODE ? 62 : 140;
const SPACE_GRID_ROWS = SPACE_PERF_MODE ? 10 : 18;
const SPACE_RAY_SPAN = SPACE_PERF_MODE ? 4 : 7;
const SPACE_STREAK_COUNT = SPACE_PERF_MODE ? 14 : 30;
const SPACE_TUNNEL_DEPTH = SPACE_PERF_MODE ? 6 : 11;
const SPACE_TUNNEL_ARROWS = SPACE_PERF_MODE ? 3 : 6;
const MAX_TRAIL_POINTS = SPACE_PERF_MODE ? 16 : 34;
const PLAYER_SPAWN_SIZE = 34;

document.body.classList.toggle("test-mode", TEST_MODE);

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

const PLAYER_SKINS = [
  { id: "classic", name: "FIL", price: 0, body: colors.blue, mini: colors.pink, eye: colors.cyan, trail: colors.orange, plane: colors.cyan },
  { id: "mint", name: "Mint", price: 12, body: "#10b981", mini: "#34d399", eye: "#ccfbf1", trail: "#2dd4bf", plane: "#5eead4" },
  { id: "gold", name: "Gold", price: 18, body: "#f59e0b", mini: "#facc15", eye: "#fff7ed", trail: "#fde047", plane: "#fbbf24" },
  { id: "ruby", name: "Ruby", price: 24, body: "#e11d48", mini: "#fb7185", eye: "#ffe4e6", trail: "#f43f5e", plane: "#fb7185" },
  { id: "neon", name: "Neon", price: 32, body: "#7c3aed", mini: "#a855f7", eye: "#67e8f9", trail: "#22d3ee", plane: "#8b5cf6" },
];
const DEFAULT_SKIN_ID = PLAYER_SKINS[0].id;

const MOUTH_CLOSE_SECONDS = 0.24;
const MOUTH_TOOTH_H = 26;
const MOUTH_TOOTH_HIT_H = 6;
const MOUTH_SEAM_OVERLAP = 2;

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
const TEST_CHECKPOINTS = buildTestCheckpoints();
const ACTIVE_TEST_CHECKPOINT = resolveTestCheckpoint(TEST_CHECKPOINT || TEST_SECTION);

function scaleLevelX(x) {
  return Math.round(x * LEVEL_SCALE);
}

function queryFlag(name) {
  const value = String(searchParams.get(name) || "").trim().toLowerCase();
  return searchParams.has(name) && value !== "0" && value !== "false" && value !== "off";
}

function buildTestCheckpoints() {
  return level.sections.map((section, index) => ({
    id: section.id || `checkpoint-${index + 1}`,
    index,
    name: section.name || `Checkpoint ${index + 1}`,
    spawn: spawnForSection(section, index),
  }));
}

function resolveTestCheckpoint(value) {
  const requested = String(value || "").trim().toLowerCase();
  if (!requested) return TEST_CHECKPOINTS[0] || null;
  const bySection = TEST_CHECKPOINTS.find((checkpoint) =>
    checkpoint.id.toLowerCase() === requested
    || checkpoint.name.toLowerCase() === requested
    || String(checkpoint.index + 1) === requested
  );
  if (bySection) return bySection;
  const legacy = sectionSpawns[requested];
  return legacy ? {
    id: requested,
    index: -1,
    name: requested,
    spawn: { ...legacy, checkpointId: requested },
  } : TEST_CHECKPOINTS[0] || null;
}

function spawnForSection(section, index) {
  const mode = index === 5 ? "plane" : "cube";
  const gravity = index === 8 ? -1 : 1;
  const x = checkpointSpawnX(section, gravity);
  const y = checkpointSpawnY(x, section, mode, gravity);
  return {
    x,
    y,
    mode,
    gravity,
    checkpointId: section.id,
    checkpointName: section.name,
  };
}

function checkpointSpawnX(section, gravity) {
  const sectionLeft = Math.max(WORLD.start.x, section.x + 54);
  const sectionRight = Math.min(playableEndX - 150, section.x + section.w - 90);
  const platforms = solidPlatformsInSection(section)
    .filter((platform) => gravity === -1 ? platform.y + platform.h <= (section.lane || 760) + 220 : platform.y >= (section.lane || 900) - 220)
    .sort((a, b) => Math.max(a.x, section.x) - Math.max(b.x, section.x));
  const platform = platforms[0];
  if (!platform) return clamp(section.x + 90, sectionLeft, Math.max(sectionLeft, sectionRight));
  const insidePlatform = clamp(Math.max(platform.x + 62, sectionLeft), sectionLeft, Math.min(sectionRight, platform.x + platform.w - PLAYER_SPAWN_SIZE - 12));
  return Number.isFinite(insidePlatform) ? insidePlatform : clamp(section.x + 90, sectionLeft, Math.max(sectionLeft, sectionRight));
}

function checkpointSpawnY(x, section, mode, gravity) {
  if (mode === "plane") return section.lane ? section.lane - 20 : WORLD.start.y;
  const support = solidPlatformAt(x, section, gravity);
  if (support && gravity === -1) return support.y + support.h;
  if (support) return support.y - PLAYER_SPAWN_SIZE;
  const lane = Number.isFinite(section.lane) ? section.lane : WORLD.start.y + PLAYER_SPAWN_SIZE;
  return gravity === -1 ? lane + 40 : lane - PLAYER_SPAWN_SIZE;
}

function solidPlatformsInSection(section) {
  return level.platforms.filter((platform) =>
    platform.kind !== "ghost-pass"
    && platform.kind !== "decor"
    && platform.x + platform.w > section.x + 4
    && platform.x < section.x + section.w - 4
  );
}

function solidPlatformAt(x, section, gravity) {
  const platforms = solidPlatformsInSection(section)
    .filter((platform) => x + PLAYER_SPAWN_SIZE > platform.x && x < platform.x + platform.w)
    .sort((a, b) => gravity === -1 ? (b.y + b.h) - (a.y + a.h) : a.y - b.y);
  return platforms[0] || null;
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

const inputState = {
  pressStartedAt: null,
  lastReleaseAt: -Infinity,
};

const economy = {
  coins: 0,
  ownedSkins: new Set([DEFAULT_SKIN_ID]),
  selectedSkinId: DEFAULT_SKIN_ID,
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
let lastDebugDatasetWrite = 0;

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

function normalizeTestVariant(value) {
  const normalized = String(value || "perfect").trim().toLowerCase();
  if (normalized === "early" || normalized === "early-jump") return "early";
  if (normalized === "late" || normalized === "late-jump") return "late";
  return "perfect";
}

function loadEconomy() {
  const wallet = safeParseJson(localStorage.getItem(WALLET_KEY), {});
  const skins = safeParseJson(localStorage.getItem(SKINS_KEY), {});
  const owned = Array.isArray(skins.owned) ? skins.owned.filter((id) => skinById(id)) : [];
  economy.coins = Math.max(0, Math.floor(Number(wallet.coins) || 0));
  economy.ownedSkins = new Set([DEFAULT_SKIN_ID, ...owned]);
  const selected = localStorage.getItem(SELECTED_SKIN_KEY) || skins.selected || DEFAULT_SKIN_ID;
  economy.selectedSkinId = economy.ownedSkins.has(selected) && skinById(selected) ? selected : DEFAULT_SKIN_ID;
}

function saveEconomy() {
  localStorage.setItem(WALLET_KEY, JSON.stringify({ coins: economy.coins }));
  localStorage.setItem(SKINS_KEY, JSON.stringify({
    owned: [...economy.ownedSkins],
    selected: economy.selectedSkinId,
  }));
  localStorage.setItem(SELECTED_SKIN_KEY, economy.selectedSkinId);
}

function skinById(id) {
  return PLAYER_SKINS.find((skin) => skin.id === id);
}

function currentSkin() {
  return skinById(economy.selectedSkinId) || PLAYER_SKINS[0];
}

function recordRewards() {
  const rewards = safeParseJson(localStorage.getItem(RECORD_REWARDS_KEY), []);
  return Array.isArray(rewards) ? rewards : [];
}

function saveRecordRewards(rewards) {
  localStorage.setItem(RECORD_REWARDS_KEY, JSON.stringify(rewards.slice(-60)));
}

function isBetterRecord(candidate, previous) {
  if (!previous) return true;
  if ((candidate.progress ?? 0) !== (previous.progress ?? 0)) return (candidate.progress ?? 0) > (previous.progress ?? 0);
  if ((candidate.attempts ?? 999) !== (previous.attempts ?? 999)) return (candidate.attempts ?? 999) < (previous.attempts ?? 999);
  return (candidate.time ?? 9999) < (previous.time ?? 9999) - 0.01;
}

function rewardCoinsForNewRecord(record, previousBest) {
  if (!isBetterRecord(record, previousBest)) return 0;
  const reward = Math.max(6, 6 + (level.number || 1) * 2);
  const rewards = recordRewards();
  rewards.push({
    id: `${record.id}:${LEVEL_ID}`,
    levelId: LEVEL_ID,
    recordId: record.id,
    coins: reward,
    createdAt: record.createdAt,
  });
  saveRecordRewards(rewards);
  economy.coins += reward;
  saveEconomy();
  return reward;
}

function renderSkinShop() {
  if (!skinShopEl) return;
  skinShopEl.replaceChildren();
  for (const skin of PLAYER_SKINS) {
    const owned = economy.ownedSkins.has(skin.id);
    const active = economy.selectedSkinId === skin.id;
    const affordable = economy.coins >= skin.price;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skin-choice";
    button.classList.toggle("active", active);
    button.disabled = !owned && !affordable;
    button.setAttribute("aria-pressed", String(active));
    button.dataset.skinId = skin.id;

    const swatch = document.createElement("span");
    swatch.className = "skin-swatch";
    swatch.style.background = skin.body;
    const copy = document.createElement("span");
    copy.className = "skin-copy";
    const title = document.createElement("b");
    title.textContent = skin.name;
    const meta = document.createElement("span");
    meta.textContent = active ? "Выбран" : owned ? "Есть" : `${skin.price} мон.`;
    copy.append(title, meta);
    button.append(swatch, copy);

    button.addEventListener("click", () => {
      if (!economy.ownedSkins.has(skin.id)) {
        if (economy.coins < skin.price) return;
        economy.coins -= skin.price;
        economy.ownedSkins.add(skin.id);
      }
      economy.selectedSkinId = skin.id;
      saveEconomy();
      updateRecordsUi();
    });
    skinShopEl.append(button);
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

function levelPickerName(item) {
  if (item.number === 1) return "Старт";
  return String(item.title || item.slug || item.id)
    .replace(/^FIL Dash\s*\d*:\s*/i, "")
    .replace(/^FIL Dash\s*\d*$/i, "Старт")
    .trim();
}

function levelHref(item) {
  const params = new URLSearchParams(window.location.search);
  params.set("level", String(item.number || item.id));
  for (const key of ["testRun", "timeScale", "section", "checkpoint", "variant", "r"]) params.delete(key);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function checkpointHref(checkpoint) {
  const params = new URLSearchParams(window.location.search);
  params.set("level", String(level.number || LEVEL_ID));
  params.set("testMode", "1");
  params.set("checkpoint", checkpoint.id);
  for (const key of ["testRun", "timeScale", "section", "variant", "r"]) params.delete(key);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function setupLevelPicker() {
  if (!levelPickerEl) return;
  levelPickerEl.replaceChildren();
  for (const item of levels) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-choice";
    button.classList.toggle("active", item.id === LEVEL_ID);
    button.setAttribute("aria-pressed", String(item.id === LEVEL_ID));
    button.setAttribute("title", item.title || item.id);
    button.dataset.levelId = item.id;

    const code = document.createElement("b");
    code.textContent = item.shortTitle || `L${item.number || ""}`;
    const name = document.createElement("span");
    name.textContent = levelPickerName(item);
    button.append(code, name);

    button.addEventListener("click", () => {
      if (item.id === LEVEL_ID) {
        if (state.running && state.paused && !state.finished) startGame();
        return;
      }
      window.location.assign(levelHref(item));
    });
    levelPickerEl.append(button);
  }
}

function setupCheckpointPicker() {
  if (!testModePanelEl || !checkpointPickerEl) return;
  testModePanelEl.classList.toggle("hidden", !TEST_MODE);
  checkpointPickerEl.replaceChildren();
  if (!TEST_MODE) return;

  for (const checkpoint of TEST_CHECKPOINTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "checkpoint-choice";
    button.classList.toggle("active", checkpoint.id === ACTIVE_TEST_CHECKPOINT?.id);
    button.setAttribute("aria-pressed", String(checkpoint.id === ACTIVE_TEST_CHECKPOINT?.id));
    button.dataset.checkpointId = checkpoint.id;

    const code = document.createElement("b");
    code.textContent = `C${checkpoint.index + 1}`;
    const name = document.createElement("span");
    name.textContent = checkpoint.name;
    button.append(code, name);

    button.addEventListener("click", () => {
      if (checkpoint.id === ACTIVE_TEST_CHECKPOINT?.id) {
        restartFromCheckpoint(false);
        startGame();
        return;
      }
      window.location.assign(checkpointHref(checkpoint));
    });
    checkpointPickerEl.append(button);
  }
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
  if (TEST_RUN || TEST_MODE) return;
  const record = currentRunRecord();
  const previousBest = sortRecords(getLocalRecords())[0];
  const rewardCoins = rewardCoinsForNewRecord(record, previousBest);
  const records = sortRecords([record, ...getLocalRecords()]).slice(0, MAX_LOCAL_RECORDS);
  saveLocalRecords(records);
  state.finishResult = { ...record, rank: localRank(record, records), rewardCoins };
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
  if (coinsCountEl) coinsCountEl.textContent = String(economy.coins);
  bestTimeEl.textContent = best ? formatDuration(best.time) : "--";
  bestResultEl.textContent = formatRecord(best);
  lastResultEl.textContent = state.finishResult ? formatRecord(state.finishResult) : "--";
  rankResultEl.textContent = state.finishResult?.rank ? `#${state.finishResult.rank}` : "--";
  if (rewardResultEl) rewardResultEl.textContent = state.finishResult?.rewardCoins ? `+${state.finishResult.rewardCoins}` : "--";
  renderLeaderboard(localLeaderboardEl, localRecords, "Пока пусто");
  renderLeaderboard(globalLeaderboardEl, state.globalLeaderboard, state.globalLeaderboardReady ? "Пока пусто" : "Нет связи");
  renderSkinShop();
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
  dpr = Math.max(1, Math.min(MAX_CANVAS_DPR, window.devicePixelRatio || 1));
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
  const pop = spikePopProgress(h);
  if (h.popup && pop < 0.48) return { x: h.x, y: h.y, w: 0, h: 0 };
  const spikeRect = animatedSpikeRect(h);
  const insetX = Math.min(6, h.w * 0.08);
  const activeH = (h.h - Math.min(6, h.h * 0.18)) * (h.popup ? Math.max(0.28, pop) : 1);
  return {
    x: spikeRect.x + insetX,
    y: spikeRect.dir === "down" ? spikeRect.y : spikeRect.y + spikeRect.h - activeH,
    w: Math.max(4, h.w - insetX * 2),
    h: activeH,
  };
}

function spikePopProgress(h) {
  if (!h.popup) return 1;
  const triggerDistance = h.popup.triggerDistance ?? 280;
  const extendDistance = h.popup.extendDistance ?? 150;
  const leadX = h.x - triggerDistance;
  return clamp01((player.x + player.w - leadX) / extendDistance);
}

function animatedSpikeRect(h) {
  if (!h.popup) return h;
  const pop = spikePopProgress(h);
  const hiddenOffset = h.popup.hiddenOffset ?? h.h;
  const shift = hiddenOffset * (1 - pop);
  return {
    ...h,
    y: h.dir === "down" ? h.y - shift : h.y + shift,
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
  const lowerRunSurfaceY = cameraLowerRunSurfaceY(compact, lowViewport, ceilingRun);
  const targetY = lowerRunSurfaceY == null
    ? player.y - viewH * focus + verticalLead
    : lowerRunSurfaceY;
  return {
    x: Math.max(0, Math.min(WORLD.width - viewW, player.x - desiredScreenX)),
    y: Math.max(0, Math.min(WORLD.height - viewH, targetY)),
  };
}

function cameraLowerRunSurfaceY(compact, lowViewport, ceilingRun) {
  if (player.mode !== "cube" || player.yellowActive || ceilingRun) return null;
  const sectionLane = state.currentSection?.lane;
  if (!Number.isFinite(sectionLane) || sectionLane < 760) return null;
  const surfaceY = Math.max(sectionLane, player.y + player.h);
  const laneScreenRatio = compact
    ? (lowViewport ? 0.88 : 0.82)
    : 0.79;
  return surfaceY - viewH * laneScreenRatio;
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
  updatePauseUi();
  overlay.classList.add("hidden");
  setMenuExpanded(false);
  playLevelMusic({ restart: true });
  playTone(420, 0.08, "triangle", 0.05);
}

function openLevelMenu() {
  if (TEST_RUN) return;
  if (state.running && !state.finished) setPaused(true);
  overlayTitle.textContent = "Уровни";
  startButton.textContent = state.running && !state.finished ? "Продолжить" : state.finished ? "Еще раз" : "Старт";
  overlay.classList.remove("hidden");
  pauseOverlay?.classList.add("hidden");
  pauseOverlay?.setAttribute("aria-hidden", "true");
  setMenuExpanded(true);
  updateRecordsUi();
}

function setMenuExpanded(expanded) {
  menuToggle?.classList.toggle("active", expanded);
  menuToggle?.setAttribute("aria-expanded", String(expanded));
}

function usesCheckpointSpawn() {
  return TEST_MODE || (TEST_RUN && !!ACTIVE_TEST_CHECKPOINT);
}

function restartFromCheckpoint(countAttempt = true) {
  const spawn = structuredClone(usesCheckpointSpawn() ? state.checkpoint : WORLD.start);
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
  state.checkpoint = structuredClone(usesCheckpointSpawn() ? ACTIVE_TEST_CHECKPOINT?.spawn || WORLD.start : WORLD.start);
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
  updatePauseUi();
  syncLevelMusic();
}

function updatePauseUi() {
  const visible = state.paused && state.running && !state.finished;
  pauseToggle.textContent = state.paused ? "▶" : "Ⅱ";
  pauseToggle.classList.toggle("active", state.paused);
  pauseToggle.setAttribute("aria-label", state.paused ? "Продолжить" : "Пауза");
  pauseToggle.setAttribute("aria-pressed", String(state.paused));
  pauseOverlay?.classList.toggle("hidden", !visible);
  pauseOverlay?.setAttribute("aria-hidden", String(!visible));
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
  const multiplier = level.speedMultiplier ?? 1;
  let speed = player.mini ? 426 : 384;
  if (section.id === "spikes" || section.id === "cube-return") speed = 404;
  if (section.id === "mini") speed = 438;
  if (section.id === "mix") speed = 424;
  for (const zone of level.speedZones) {
    if (rectsOverlap(playerRect(), zone)) speed = zone.speed;
  }
  return speed * multiplier;
}

function jumpPressAge() {
  return keys.jump && inputState.pressStartedAt != null ? Math.max(0, state.time - inputState.pressStartedAt) : 0;
}

function holdInputStrength() {
  if (!keys.jump) return 0;
  if (TEST_RUN) return 1;
  const age = jumpPressAge();
  if (age < HOLD_THRESHOLD_SECONDS) return 0;
  return Math.max(0, Math.min(1, (age - HOLD_THRESHOLD_SECONDS) / (HOLD_CAP_SECONDS - HOLD_THRESHOLD_SECONDS)));
}

function updateCube(dt) {
  const old = { x: player.x, y: player.y };
  player.yellowActive = false;
  updateMiniMode();

  const holdPower = holdInputStrength();
  for (const zone of level.yellowZones) {
    if (!rectsOverlap(playerRect(), zone)) continue;
    if (holdPower > 0) {
      player.yellowActive = true;
      player.vx = Math.max(player.vx, zone.minSpeed);
      player.vy += (zone.targetY - player.y) * (15 + holdPower * 3) * dt;
      player.vy *= 0.72 - holdPower * 0.06;
    } else if (player.x > zone.x + 70 && player.x < zone.x + zone.w - 30) {
      player.vy += 980 * dt;
    }
  }

  const target = player.yellowActive ? 488 * (level.speedMultiplier ?? 1) : targetSpeed();
  player.vx += (target - player.vx) * Math.min(1, dt * 7.2);
  const maxSpeed = player.yellowActive
    ? (level.maxYellowSpeed ?? 518)
    : (level.maxCubeSpeed ?? 486);
  player.vx = Math.max(290, Math.min(maxSpeed, player.vx));

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
  const holdPower = keys.jump ? Math.max(0.42, holdInputStrength()) : 0;
  player.vx += (402 - player.vx) * Math.min(1, dt * 7);
  player.vy += (holdPower > 0 ? -1420 * holdPower : 760) * dt;
  player.vy *= 0.982;
  player.vy = Math.max(-470, Math.min(430, player.vy));
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.angle = Math.max(-0.62, Math.min(0.62, player.vy / 470));
  updateTrail(dt, true);

  for (const mouth of level.mouths) {
    if (!mouth.passed && player.x > mouth.x + 58) {
      mouth.passed = true;
      mouth.closeTimer = MOUTH_CLOSE_SECONDS;
    }
    if (mouth.passed) {
      mouth.closeTimer -= dt;
      if (mouth.closeTimer <= 0 && !mouth.closed) {
        mouth.closed = true;
        state.shake = 0.09;
        playTone(150, 0.08, "square", 0.05);
      }
    }
    const { top: topHazard, bottom: bottomHazard } = mouthHazardRects(mouth);
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

function mouthCloseProgress(m) {
  if (m.closed) return 1;
  if (!m.passed) return 0;
  return clamp01(1 - Math.max(0, m.closeTimer) / MOUTH_CLOSE_SECONDS);
}

function mouthRects(m) {
  const progress = mouthCloseProgress(m);
  const maxClose = m.gapH / 2;
  const breathe = Math.sin(state.time * 6 + m.x) * 5 * (1 - progress);
  let topBottom = m.gapY + maxClose * progress + breathe;
  let bottomTop = m.gapY + m.gapH - maxClose * progress - breathe;

  if (progress >= 1) {
    const center = m.gapY + maxClose;
    topBottom = center + MOUTH_SEAM_OVERLAP;
    bottomTop = center - MOUTH_SEAM_OVERLAP;
  }

  return {
    progress,
    top: { x: m.x, y: m.top, w: 74, h: Math.max(1, topBottom - m.top) },
    bottom: { x: m.x, y: bottomTop, w: 74, h: Math.max(1, m.bottom - bottomTop) },
  };
}

function mouthHazardRects(m) {
  const { top, bottom } = mouthRects(m);
  return {
    top: { x: top.x, y: top.y, w: top.w, h: top.h + MOUTH_TOOTH_HIT_H },
    bottom: { x: bottom.x, y: bottom.y - MOUTH_TOOTH_HIT_H, w: bottom.w, h: bottom.h + MOUTH_TOOTH_HIT_H },
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
    if (player.trail.length > MAX_TRAIL_POINTS) player.trail.splice(0, player.trail.length - MAX_TRAIL_POINTS);
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
  if (SPACE_LEVEL) {
    drawSpaceBackground(section, beat);
    return;
  }
  if (JUNGLE_LEVEL) {
    drawJungleBackground(section, beat);
    return;
  }
  if (TITANIC_LEVEL) {
    drawTitanicBackground(section, beat);
    return;
  }
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

function drawSpaceBackground(section, beat) {
  const baseX = -camera.x * 0.08;
  const baseY = -camera.y * 0.05;
  const g = ctx.createLinearGradient(0, 0, viewW, viewH);
  g.addColorStop(0, "rgba(3, 7, 24, 0.72)");
  g.addColorStop(0.52, "rgba(10, 22, 58, 0.58)");
  g.addColorStop(1, "rgba(28, 13, 62, 0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.globalAlpha = 0.26 + beat * 0.08;
  ctx.strokeStyle = mixHex(section.accent, "#ffffff", 0.28);
  ctx.lineWidth = 1.8;
  for (let i = 0; i < SPACE_GRID_ROWS; i++) {
    const y = viewH * (0.18 + i * 0.05) + (baseY % 80);
    const half = viewW * (0.06 + i * 0.032);
    ctx.beginPath();
    ctx.moveTo(viewW / 2 - half, y);
    ctx.lineTo(viewW / 2 + half, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  for (let i = -SPACE_RAY_SPAN; i <= SPACE_RAY_SPAN; i++) {
    ctx.beginPath();
    ctx.moveTo(viewW / 2 + i * 26, viewH * 0.08);
    ctx.lineTo(viewW / 2 + i * 118 + (baseX % 120), viewH + 80);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < SPACE_STAR_COUNT; i++) {
    const x = (baseX * 2.4 + i * 97 + state.time * 28) % (viewW + 260) - 130;
    const y = (baseY * 2.1 + i * 53 + Math.sin(i * 1.7) * 92) % (viewH + 220) - 90;
    ctx.globalAlpha = 0.24 + (i % 5) * 0.07;
    ctx.fillStyle = i % 4 === 0 ? "#fde047" : i % 4 === 1 ? "#7dd3fc" : i % 4 === 2 ? "#f9a8d4" : section.accent;
    ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
    if (i % 11 === 0) {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 28, y + 6);
      ctx.lineTo(x + 36, y - 4);
      ctx.stroke();
    }
  }
  drawSpeedStreaks(section);
  ctx.globalAlpha = 1;
}

function drawJungleBackground(section, beat) {
  const baseX = -camera.x * 0.11;
  const baseY = -camera.y * 0.06;
  const g = ctx.createLinearGradient(0, 0, viewW, viewH);
  g.addColorStop(0, mixHex(section.accent, "#d9f99d", 0.54));
  g.addColorStop(0.48, mixHex(section.accent, "#ecfccb", 0.78));
  g.addColorStop(1, mixHex("#0891b2", "#fef3c7", 0.72));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.globalAlpha = 0.18 + beat * 0.05;
  ctx.fillStyle = "rgba(20, 83, 45, 0.72)";
  for (let i = 0; i < 44; i++) {
    const x = (baseX * 1.7 + i * 96) % (viewW + 180) - 90;
    const y = 34 + ((baseY + i * 43) % 290);
    ctx.beginPath();
    ctx.ellipse(x, y, 58 + (i % 4) * 18, 16 + (i % 3) * 8, -0.22 + (i % 5) * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#166534";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const x = (baseX * 2.3 + i * 132) % (viewW + 240) - 120;
    const top = -30;
    const len = 190 + (i % 6) * 44;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.bezierCurveTo(x - 34, top + len * 0.34, x + 48, top + len * 0.7, x + 8, top + len);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 70; i++) {
    const x = (baseX * 2.8 + i * 83) % (viewW + 220) - 100;
    const y = (baseY * 1.5 + i * 59 + Math.sin(i) * 80) % (viewH + 180) - 50;
    ctx.fillStyle = i % 5 === 0 ? "#fb7185" : i % 5 === 1 ? "#facc15" : i % 5 === 2 ? "#14b8a6" : section.accent;
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((i % 7) * 0.24);
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 + (i % 4) * 3, 6 + (i % 3), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  drawSpeedStreaks(section);
  ctx.globalAlpha = 1;
}

function drawTitanicBackground(section, beat) {
  const baseX = -camera.x * 0.08;
  const baseY = -camera.y * 0.04;
  const g = ctx.createLinearGradient(0, 0, viewW, viewH);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(0.44, mixHex(section.accent, "#172554", 0.32));
  g.addColorStop(1, "#0e7490");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.globalAlpha = 0.26 + beat * 0.04;
  ctx.fillStyle = "#fbbf24";
  for (let i = 0; i < 22; i++) {
    const x = (baseX * 1.4 + i * 132) % (viewW + 220) - 90;
    const y = 120 + ((baseY + i * 31) % 260);
    ctx.beginPath();
    ctx.roundRect(x, y, 44, 18, 8);
    ctx.fill();
  }

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const y = viewH * 0.58 + ((baseY * 2 + i * 34) % (viewH * 0.42));
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < viewW + 80; x += 80) {
      ctx.quadraticCurveTo(x + 40, y - 18 - (i % 3) * 4, x + 80, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.19;
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = (baseX * 2.2 + i * 97) % (viewW + 260) - 130;
    const y = (baseY + i * 53) % (viewH + 220) - 80;
    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y + 34);
      ctx.lineTo(x + 24, y - 18);
      ctx.lineTo(x + 52, y + 34);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 18 + (i % 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
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
  for (let i = 0; i < SPACE_STREAK_COUNT; i++) {
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
  ctx.shadowBlur = SPACE_PERF_MODE ? 0 : 18;
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
  const depth = SPACE_TUNNEL_DEPTH;
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
  ctx.shadowBlur = SPACE_PERF_MODE ? 0 : 20;
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
  for (let i = 0; i < SPACE_TUNNEL_ARROWS; i++) {
    const t = ((state.time * 0.24 + i / SPACE_TUNNEL_ARROWS) % 1);
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
    if (d.kind === "star") {
      ctx.shadowColor = d.color;
      ctx.shadowBlur = SPACE_PERF_MODE ? 0 : 12;
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(18, 0);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    if (d.kind === "comet") {
      ctx.shadowColor = d.color;
      ctx.shadowBlur = SPACE_PERF_MODE ? 0 : 14;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-34, 14);
      ctx.lineTo(8, -6);
      ctx.lineTo(34, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(35, -2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (d.kind === "asteroid") {
      ctx.fillStyle = mixHex(d.color, "#0f172a", 0.36);
      ctx.strokeStyle = mixHex(d.color, "#ffffff", 0.28);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, -8);
      ctx.lineTo(-4, -20);
      ctx.lineTo(18, -12);
      ctx.lineTo(23, 7);
      ctx.lineTo(5, 20);
      ctx.lineTo(-20, 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (d.kind === "ringPlanet") {
      ctx.save();
      ctx.rotate(-0.35);
      ctx.strokeStyle = mixHex(d.color, "#ffffff", 0.22);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = mixHex(d.color, "#ffffff", 0.24);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
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
    if (d.kind === "vine") {
      ctx.strokeStyle = mixHex(d.color, "#14532d", 0.35);
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -42);
      ctx.bezierCurveTo(-18, -12, 20, 16, -4, 48);
      ctx.stroke();
      ctx.fillStyle = mixHex(d.color, "#bbf7d0", 0.24);
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.translate(i * 14, i * 18);
        ctx.rotate(i * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (d.kind === "leaf") {
      ctx.fillStyle = mixHex(d.color, "#dcfce7", 0.28);
      ctx.strokeStyle = mixHex(d.color, "#14532d", 0.18);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 12, -0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, 3);
      ctx.lineTo(24, -3);
      ctx.stroke();
    }
    if (d.kind === "flower") {
      ctx.fillStyle = mixHex(d.color, "#ffffff", 0.12);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 9, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = colors.yellow;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (d.kind === "root") {
      ctx.strokeStyle = mixHex(d.color, "#422006", 0.5);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-34, 14);
      ctx.quadraticCurveTo(-12, -18, 8, 6);
      ctx.quadraticCurveTo(24, 24, 42, -6);
      ctx.stroke();
    }
    if (d.kind === "porthole") {
      ctx.fillStyle = "rgba(251, 191, 36, 0.32)";
      ctx.strokeStyle = mixHex(d.color, "#0f172a", 0.26);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.moveTo(0, -15);
      ctx.lineTo(0, 15);
      ctx.stroke();
    }
    if (d.kind === "wave") {
      ctx.strokeStyle = mixHex(d.color, "#e0f2fe", 0.22);
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-38, 8);
      for (let x = -38; x <= 42; x += 20) {
        ctx.quadraticCurveTo(x + 10, -12, x + 20, 8);
      }
      ctx.stroke();
    }
    if (d.kind === "steam") {
      ctx.strokeStyle = "rgba(226, 232, 240, 0.82)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 13, 28);
        ctx.bezierCurveTo(i * 7 - 10, 6, i * 16 + 16, -8, i * 8, -34);
        ctx.stroke();
      }
    }
    if (d.kind === "iceShard") {
      ctx.fillStyle = "rgba(219, 234, 254, 0.55)";
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, 26);
      ctx.lineTo(0, -30);
      ctx.lineTo(17, 22);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (d.kind === "rope") {
      ctx.strokeStyle = mixHex(d.color, "#78350f", 0.4);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-36, -18);
      ctx.quadraticCurveTo(-8, 18, 32, -10);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fde68a";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 14 - 4, -8);
        ctx.lineTo(i * 14 + 8, 8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawPlatforms() {
  for (const p of level.platforms) {
    if (!isVisible(p)) continue;
    if (SPACE_LEVEL && !p.kind.startsWith("ghost")) {
      drawSpacePlatform(p);
      continue;
    }
    if (JUNGLE_LEVEL && !p.kind.startsWith("ghost")) {
      drawJunglePlatform(p);
      continue;
    }
    if (TITANIC_LEVEL && !p.kind.startsWith("ghost")) {
      drawTitanicPlatform(p);
      continue;
    }
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

function drawSpacePlatform(p) {
  ctx.save();
  const glow = state.currentSection?.accent || colors.cyan;
  const top = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  top.addColorStop(0, "rgba(226, 242, 255, 0.96)");
  top.addColorStop(0.46, "rgba(191, 219, 254, 0.88)");
  top.addColorStop(1, "rgba(15, 23, 42, 0.88)");
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = top;
  ctx.strokeStyle = "#050816";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  for (let x = p.x + 22; x < p.x + p.w - 18; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + 10);
    ctx.lineTo(x + 30, p.y + p.h - 10);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = mixHex(glow, "#ffffff", 0.36);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + 8, p.y + 8);
  ctx.lineTo(p.x + p.w - 8, p.y + 8);
  ctx.stroke();
  ctx.restore();
}

function drawJunglePlatform(p) {
  ctx.save();
  const glow = state.currentSection?.accent || "#22c55e";
  const top = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  top.addColorStop(0, "#fef3c7");
  top.addColorStop(0.42, "#d9f99d");
  top.addColorStop(1, "#854d0e");
  ctx.fillStyle = top;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 5);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = mixHex(glow, "#14532d", 0.48);
  ctx.lineWidth = 3;
  for (let x = p.x + 18; x < p.x + p.w - 18; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + p.h - 11);
    ctx.quadraticCurveTo(x + 14, p.y + p.h - 23, x + 32, p.y + p.h - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 8, p.y + 9);
    ctx.lineTo(x + 30, p.y + 9);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#166534";
  for (let x = p.x + 24; x < p.x + p.w - 10; x += 76) {
    ctx.beginPath();
    ctx.ellipse(x, p.y - 3, 18, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTitanicPlatform(p) {
  ctx.save();
  const glow = state.currentSection?.accent || "#38bdf8";
  const top = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  top.addColorStop(0, "#f8fafc");
  top.addColorStop(0.5, "#cbd5e1");
  top.addColorStop(1, "#7c2d12");
  ctx.fillStyle = top;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 5);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 0.66;
  ctx.strokeStyle = mixHex(glow, "#ffffff", 0.18);
  ctx.lineWidth = 3;
  for (let x = p.x + 20; x < p.x + p.w - 14; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + 9);
    ctx.lineTo(x + 30, p.y + 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 16, p.y + p.h - 12, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.44;
  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 2;
  for (let x = p.x + 10; x < p.x + p.w - 20; x += 82) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + p.h + 8);
    ctx.quadraticCurveTo(x + 34, p.y + p.h - 4, x + 68, p.y + p.h + 8);
    ctx.stroke();
  }
  ctx.restore();
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
  const spikeRect = animatedSpikeRect(h);
  const pop = spikePopProgress(h);
  const count = Math.max(1, Math.floor(spikeRect.w / 24));
  const step = spikeRect.w / count;
  ctx.save();
  if (h.popup) drawPopupSpikeWarning(h, pop);
  ctx.fillStyle = h.color || (SPACE_LEVEL ? "#e2e8f0" : colors.ink);
  ctx.strokeStyle = h.color || (SPACE_LEVEL ? "#050816" : colors.ink);
  ctx.globalAlpha = h.popup ? 0.46 + pop * 0.54 : 1;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = spikeRect.x + i * step;
    if (spikeRect.dir === "down") {
      ctx.moveTo(x, spikeRect.y);
      ctx.lineTo(x + step / 2, spikeRect.y + spikeRect.h);
      ctx.lineTo(x + step, spikeRect.y);
    } else {
      ctx.moveTo(x, spikeRect.y + spikeRect.h);
      ctx.lineTo(x + step / 2, spikeRect.y);
      ctx.lineTo(x + step, spikeRect.y + spikeRect.h);
    }
  }
  ctx.fill();
  ctx.restore();
}

function drawPopupSpikeWarning(h, pop) {
  const surfaceY = h.dir === "down" ? h.y : h.y + h.h;
  const flash = 0.55 + Math.sin(state.time * 15 + h.x * 0.01) * 0.45;
  ctx.save();
  ctx.globalAlpha = 0.25 + flash * 0.2 + pop * 0.2;
  ctx.fillStyle = h.popup.warningColor || colors.orange;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 8 + pop * 10;
  if (h.dir === "down") {
    ctx.fillRect(h.x + 4, surfaceY - 4, Math.max(4, h.w - 8), 6);
  } else {
    ctx.fillRect(h.x + 4, surfaceY - 2, Math.max(4, h.w - 8), 6);
  }
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
    const { top, bottom, progress } = mouthRects(m);
    drawMouthBlock(top.x, top.y, top.w, top.h, "down", progress, m.color);
    drawMouthBlock(bottom.x, bottom.y, bottom.w, bottom.h, "up", progress, m.color);
  }
}

function drawMouthBlock(x, y, w, h, dir, progress = 0, color = colors.green) {
  ctx.fillStyle = color;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.stroke();
  const bitePulse = 1 + progress * 0.18;
  const teeth = {
    x: x - 2,
    y: dir === "down" ? y + h - 1 : y - MOUTH_TOOTH_H + 1,
    w: w + 4,
    h: MOUTH_TOOTH_H * bitePulse,
    dir,
  };
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
    const moverColor = m.color || colors.pink;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = moverColor;
    ctx.setLineDash([8, 10]);
    ctx.lineWidth = 3;
    ctx.strokeRect(m.axis === "x" ? m.x - m.amp : m.x, m.axis === "y" ? m.y - m.amp : m.y, m.axis === "x" ? m.w + m.amp * 2 : m.w, m.axis === "y" ? m.h + m.amp * 2 : m.h);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = moverColor;
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
  const skin = currentSkin();
  for (const t of player.trail) {
    ctx.globalAlpha = Math.max(0, t.life * 2.2);
    ctx.fillStyle = t.activeYellow ? colors.yellow : t.mode === "plane" ? skin.plane : t.mini ? skin.mini : skin.trail;
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
  const skin = currentSkin();
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.angle);
  ctx.scale(player.portalScale, player.portalScale);
  ctx.fillStyle = player.mini ? skin.mini : skin.body;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = player.mini ? 5 : 6;
  ctx.beginPath();
  ctx.roundRect(-player.w / 2, -player.h / 2, player.w, player.h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = skin.eye;
  ctx.fillRect(-player.w * 0.28, -player.h * 0.18, player.w * 0.2, player.h * 0.24);
  ctx.fillRect(player.w * 0.1, -player.h * 0.18, player.w * 0.2, player.h * 0.24);
  ctx.restore();
}

function drawPlane() {
  const skin = currentSkin();
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.angle);
  ctx.scale(player.portalScale, player.portalScale);
  ctx.fillStyle = skin.plane;
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
  ctx.fillStyle = skin.eye;
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

function setKey(value, { bypassSpam = false } = {}) {
  const next = !!value;
  if (next === keys.jump) return;
  if (next && !bypassSpam && state.running && state.time - inputState.lastReleaseAt < INPUT_SPAM_GUARD_SECONDS) return;
  keys.jump = next;
  if (next) inputState.pressStartedAt = state.time;
  else {
    inputState.lastReleaseAt = state.time;
    inputState.pressStartedAt = null;
  }
}

function readExternalTestInput() {
  const raw = canvas.dataset.testInput;
  if (!raw) return;
  try {
    const input = JSON.parse(raw);
    setKey(!!input.jump, { bypassSpam: true });
  } catch {
    canvas.dataset.testInput = "";
  }
}

function applyTestRunInput() {
  if (!TEST_RUN) return;
  let jump = false;
  const x = player.x;
  const variantOffset = testVariantOffset();

  if (player.mode === "plane") {
    const target = planeTargetY(x);
    jump = player.y + player.h / 2 > target;
  } else {
    const variantSlack = 0;
    const inShiftedAction = (action) =>
      x > action.x + variantOffset - variantSlack
      && x < action.x + action.w + variantOffset + variantSlack;
    const holdAction = level.testActions.some((action) => action.kind === "hold" && inShiftedAction(action));
    const jumpAction = level.testActions.some((action) => action.kind !== "hold" && inShiftedAction(action));
    jump = holdAction || (player.onGround && jumpAction);
    jump ||= seesFloorSpikeAhead();
    jump ||= seesMoverAhead();
    jump ||= level.yellowZones.some((zone) => x > zone.x + 10 && x < zone.x + zone.w - 95);
    jump ||= level.orbs.some((orb) => Math.abs((orb.x + orb.w / 2) - (player.x + player.w / 2)) < 42);
    jump ||= level.gravityRings.some((ring) => Math.abs((ring.x + ring.w / 2) - (player.x + player.w / 2)) < 42);
  }
  setKey(jump, { bypassSpam: true });
}

function testVariantOffset() {
  if (!TEST_VARIANT_TIME_SHIFT) return 0;
  return Math.round((player.vx || targetSpeed()) * TEST_VARIANT_TIME_SHIFT);
}

function seesFloorSpikeAhead() {
  if (!player.onGround) return false;
  const front = player.x + player.w;
  const bottom = player.y + player.h;
  const defaultLookAhead = player.mini
    ? 156
    : state.currentSection?.id === "start"
      ? 105
      : state.currentSection?.id === "spikes"
        ? 122
        : state.currentSection?.id === "trap"
          ? 80
          : 160;
  const lookAhead = Math.max(36, (level.testLookAhead ?? defaultLookAhead) - testVariantOffset());
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
  const lookAhead = Math.max(48, (level.testMoverLookAhead ?? 170) - testVariantOffset());
  return level.movers.some((m) => {
    const r = movingRect(m);
    const ahead = r.x >= front - 10 && r.x <= front + lookAhead;
    const sameLane = r.y + r.h >= player.y - 40 && r.y <= player.y + player.h + 120;
    return ahead && sameLane;
  });
}

function planeTargetY(x) {
  if (x < scaleLevelX(5520)) return 1060;
  if (x < scaleLevelX(5900)) return 1050;
  if (x < scaleLevelX(6040)) return 1010;
  if (x < scaleLevelX(6500)) return 1120;
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

menuToggle?.addEventListener("click", () => {
  const menuOpen = !overlay.classList.contains("hidden") && menuToggle.classList.contains("active");
  if (menuOpen && state.running && state.paused && !state.finished) {
    startGame();
    return;
  }
  openLevelMenu();
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
  callTelegramMethod(tg, "ready");
  requestTelegramGameViewport();
  callTelegramMethod(tg, "setHeaderColor", "6.1", "#10131f");
  callTelegramMethod(tg, "setBackgroundColor", "6.1", "#10131f");
}

function requestTelegramGameViewport() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  callTelegramMethod(tg, "expand");
  callTelegramMethod(tg, "requestFullscreen", "8.0");
  callTelegramMethod(tg, "disableVerticalSwipes", "7.7");
  if (window.innerWidth > window.innerHeight) callTelegramMethod(tg, "lockOrientation", "8.0");
}

function callTelegramMethod(tg, method, minVersion, ...args) {
  if (typeof minVersion !== "string") {
    args = minVersion == null ? args : [minVersion, ...args];
    minVersion = "";
  }
  if (typeof tg?.[method] !== "function") return;
  if (minVersion && !telegramVersionAtLeast(tg, minVersion)) return;
  try {
    tg[method](...args);
  } catch {
    // Telegram clients expose these methods by version; CSS fallback handles viewport/chrome.
  }
}

function telegramVersionAtLeast(tg, version) {
  if (typeof tg?.isVersionAtLeast === "function") {
    try {
      return tg.isVersionAtLeast(version);
    } catch {
      return false;
    }
  }
  return true;
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

function applyInitialCheckpoint() {
  if (!usesCheckpointSpawn()) return;
  state.checkpoint = structuredClone(ACTIVE_TEST_CHECKPOINT?.spawn || WORLD.start);
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
      id: state.checkpoint.checkpointId || "",
      name: state.checkpoint.checkpointName || "",
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
    input: {
      jump: keys.jump,
      holdAge: Math.round(jumpPressAge() * 1000) / 1000,
      holdStrength: Math.round(holdInputStrength() * 100) / 100,
      holdThresholdSeconds: HOLD_THRESHOLD_SECONDS,
      holdCapSeconds: HOLD_CAP_SECONDS,
      spamGuardSeconds: INPUT_SPAM_GUARD_SECONDS,
    },
    testRun: {
      enabled: TEST_RUN,
      variant: TEST_VARIANT,
      timeScale: TEST_TIME_SCALE,
      timeShiftMs: Math.round(TEST_VARIANT_TIME_SHIFT * 1000),
    },
    testMode: {
      enabled: TEST_MODE,
      checkpointId: ACTIVE_TEST_CHECKPOINT?.id || "",
      checkpointName: ACTIVE_TEST_CHECKPOINT?.name || "",
      checkpointCount: TEST_CHECKPOINTS.length,
    },
    economy: {
      coins: economy.coins,
      selectedSkinId: economy.selectedSkinId,
      ownedSkins: [...economy.ownedSkins],
      rewardKey: RECORD_REWARDS_KEY,
    },
    perf: {
      spacePerfMode: SPACE_PERF_MODE,
      space3dDisabled: SPACE_3D_DISABLED,
      maxCanvasDpr: MAX_CANVAS_DPR,
      dpr: Math.round(dpr * 100) / 100,
      debugDatasetIntervalMs: DEBUG_DATASET_INTERVAL_MS,
    },
  };
}

function writeDebugDataset(force = false) {
  const now = performance.now();
  if (!force && DEBUG_DATASET_INTERVAL_MS > 0 && now - lastDebugDatasetWrite < DEBUG_DATASET_INTERVAL_MS) return;
  lastDebugDatasetWrite = now;
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

if (SPACE_LEVEL && space3dCanvas && !SPACE_3D_DISABLED) {
  gameShell.classList.add("space3d-active");
  startSpace3dLayer(space3dCanvas, () => ({
    time: state.time,
    progress: levelProgress(),
    speed: player.vx,
    running: state.running && !state.paused && player.deadTimer <= 0,
    accent: state.currentSection?.accent || colors.cyan,
  }), {
    lowPower: SPACE_PERF_MODE,
    maxDpr: SPACE_PERF_MODE ? 0.8 : 1.2,
    fps: SPACE_PERF_MODE ? 24 : 30,
    idleFps: SPACE_PERF_MODE ? 6 : 10,
  }).catch(() => {
    space3dCanvas.dataset.failed = "true";
  });
}

resize();
initTelegram();
loadEconomy();
document.title = level.title || "FIL Dash";
if (levelNameEl) levelNameEl.textContent = level.shortTitle || `L${level.number || 1}`;
overlayTitle.textContent = level.title || "FIL Dash";
setupLevelPicker();
setupCheckpointPicker();
updateRecordsUi();
if (!TEST_RUN) refreshGlobalLeaderboard();
applyInitialCheckpoint();
restartFromCheckpoint(false);
writeDebugDataset(true);
updateHud();
if (TEST_RUN) {
  state.running = true;
  overlay.classList.add("hidden");
}
requestAnimationFrame(loop);
