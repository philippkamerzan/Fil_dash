import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { levels } = await import(`../game/src/levels.js?acceptance=${Date.now()}`);

const GAMEPLAY_MAX_GAP_SECONDS = 1.2;
const NEW_LEVEL_MAX_GAP_SECONDS = 1.1;
const HITBOX_MAX_ABS_DELTA = 6;
const HITBOX_MAX_REL_DELTA = 0.08;
const MOBILE_VIEWPORTS = [
  { width: 812, height: 375 },
  { width: 844, height: 390 },
  { width: 900, height: 420 },
];

const checks = [
  scriptedVariantsCheck(),
  mobileAttemptsCheck(),
  geometryUniquenessCheck(),
  planeModeStageAudit(),
  stageVarietyAudit(),
  densityAudit(),
  hitboxAudit(),
  mobileSafeZoneAudit(),
  inputTimingAudit(),
  economyAndLeaderboardAudit(),
];

const ok = checks.every((check) => check.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
if (!ok) process.exitCode = 1;

function scriptedVariantsCheck() {
  const report = runJsonTool("playtest-levels.mjs", [
    "--levels=1,2,3,4",
    "--variants=perfect,early,late",
    "--maxSeconds=220",
  ]);
  const variants = new Set(report.results.map((result) => result.variant));
  return {
    name: "scripted-run variants",
    ok: report.ok && variants.has("perfect") && variants.has("early") && variants.has("late"),
    variants: [...variants].sort(),
    attempts: report.results.length,
    failed: report.results.filter((result) => !result.ok),
  };
}

function mobileAttemptsCheck() {
  const variants = Array.from({ length: 15 }, (_, index) => ["perfect", "early", "late"][index % 3]).join(",");
  const report = runJsonTool("playtest-levels.mjs", [
    "--levels=3,4",
    `--variants=${variants}`,
    "--maxSeconds=220",
  ]);
  return {
    name: "30 mobile scripted attempts",
    ok: report.ok && report.results.length === 30,
    attempts: report.results.length,
    levels: [3, 4],
    failed: report.results.filter((result) => !result.ok),
  };
}

function geometryUniquenessCheck() {
  const report = runJsonTool("audit-level-geometry.mjs", []);
  return {
    name: "new-map geometry diff",
    ok: report.ok,
    metadata: report.metadata,
    results: report.results,
  };
}

function planeModeStageAudit() {
  const results = levels.map((level) => {
    const planeSections = (level.sections || []).filter((section) =>
      section.spawnMode === "plane" || section.planeStage === true
    );
    const portalDowns = (level.boosters || []).filter((booster) =>
      booster.type === "portalDown" && booster.target?.mode === "plane"
    );
    const planeOuts = (level.portals || []).filter((portal) =>
      portal.type === "planeOut" && portal.target?.mode === "cube"
    );
    const coveredSections = planeSections.filter((section) =>
      portalDowns.some((booster) => booster.target.x >= section.x && booster.target.x <= section.x + section.w)
      && planeOuts.some((portal) => portal.x >= section.x && portal.x <= section.x + section.w + 220)
    );
    return {
      level: level.number,
      ok: planeSections.length > 0
        && portalDowns.length > 0
        && planeOuts.length > 0
        && coveredSections.length === planeSections.length,
      planeSections: planeSections.map((section) => ({
        id: section.id,
        name: section.name,
        x: Math.round(section.x),
        w: Math.round(section.w),
      })),
      portalDowns: portalDowns.map((booster) => ({
        x: Math.round(booster.x),
        targetMode: booster.target.mode,
        targetX: Math.round(booster.target.x),
      })),
      planeOuts: planeOuts.map((portal) => ({
        x: Math.round(portal.x),
        targetMode: portal.target.mode,
        targetX: Math.round(portal.target.x),
      })),
    };
  });
  return {
    name: "plane-mode stages",
    ok: results.every((result) => result.ok),
    results,
  };
}

function stageVarietyAudit() {
  const scopedLevels = levels.filter((level) => level.number > 1);
  const results = scopedLevels.map((level) => {
    const verticalSections = (level.sections || []).filter((section) => section.verticalStage === true);
    const depthSections = (level.sections || []).filter((section) => section.depth3dStage === true);
    const invertedSections = (level.sections || []).filter((section) =>
      section.invertedStage === true || section.spawnGravity === -1
    );
    const verticalBands = (level.routeBands || []).filter((band) => band.kind === "vertical");
    const depthBands = (level.routeBands || []).filter((band) => band.kind === "tunnel3d");
    const flipPortals = (level.portals || []).filter((portal) =>
      portal.type === "gravityFlip" && portal.target?.gravity === -1
    );
    const restorePortals = (level.portals || []).filter((portal) =>
      portal.type === "gravityRestore" && portal.target?.gravity === 1
    );
    return {
      level: level.number,
      ok: verticalSections.some((section) => overlapsAny(section, verticalBands))
        && depthSections.some((section) => overlapsAny(section, depthBands))
        && invertedSections.length > 0
        && flipPortals.length > 0
        && restorePortals.length > 0,
      verticalSections: verticalSections.map(sectionSummary),
      depth3dSections: depthSections.map(sectionSummary),
      invertedSections: invertedSections.map(sectionSummary),
      verticalBands: verticalBands.map(bandSummary),
      depth3dBands: depthBands.map(bandSummary),
      flipPortals: flipPortals.map(portalSummary),
      restorePortals: restorePortals.map(portalSummary),
    };
  });
  return {
    name: "vertical 3d inverted stages",
    ok: results.every((result) => result.ok),
    results,
  };
}

function overlapsAny(section, bands) {
  return bands.some((band) => band.x < section.x + section.w && band.x + band.w > section.x);
}

function sectionSummary(section) {
  return {
    id: section.id,
    name: section.name,
    x: Math.round(section.x),
    w: Math.round(section.w),
  };
}

function bandSummary(band) {
  return {
    label: band.label,
    kind: band.kind,
    x: Math.round(band.x),
    w: Math.round(band.w),
  };
}

function portalSummary(portal) {
  return {
    type: portal.type,
    x: Math.round(portal.x),
    targetX: Math.round(portal.target.x),
    targetGravity: portal.target.gravity,
  };
}

function densityAudit() {
  const results = levels.map((level) => {
    const events = gameplayEvents(level);
    let maxGapPx = 0;
    let pair = null;
    for (let index = 1; index < events.length; index += 1) {
      const gap = events[index].x - events[index - 1].x;
      if (gap > maxGapPx) {
        maxGapPx = gap;
        pair = [events[index - 1], events[index]];
      }
    }
    const speed = level.maxCubeSpeed || 486;
    const maxGapSeconds = maxGapPx / speed;
    const limit = level.number > 1 ? NEW_LEVEL_MAX_GAP_SECONDS : GAMEPLAY_MAX_GAP_SECONDS;
    return {
      level: level.number,
      events: events.length,
      maxGapSeconds: round(maxGapSeconds),
      limit,
      ok: maxGapSeconds <= limit,
      pair: pair?.map((event) => ({ type: event.type, x: Math.round(event.x) })),
    };
  });
  return {
    name: "density audit",
    ok: results.every((result) => result.ok),
    results,
  };
}

function gameplayEvents(level) {
  const finishX = level.portals.find((portal) => portal.type === "finish")?.x ?? level.world.width;
  const events = [{ x: level.world.start.x, type: "start" }];
  const add = (item, type, x = item.x) => {
    if (!Number.isFinite(x) || x < level.world.start.x || x > finishX) return;
    events.push({ x, type });
  };
  for (const item of level.hazards || []) add(item, "hazard");
  for (const item of level.movers || []) add(item, "mover");
  for (const item of level.orbs || []) add(item, "orb");
  for (const item of level.speedZones || []) add(item, "speed");
  for (const item of level.trampolines || []) add(item, "trampoline");
  for (const item of level.boosters || []) add(item, "booster");
  for (const item of level.traps || []) add(item, "trap");
  for (const item of level.gravityRings || []) add(item, "gravity");
  for (const item of level.yellowZones || []) {
    add(item, "yellow-start");
    add(item, "yellow-end", item.x + item.w);
  }
  for (const item of level.portals || []) add(item, item.type || "portal");
  return events.sort((a, b) => a.x - b.x);
}

function hitboxAudit() {
  const results = [];
  for (const level of levels) {
    for (const hazard of level.hazards || []) {
      if (hazard.kind !== "spike") continue;
      const visual = { x: hazard.x, y: hazard.y, w: hazard.w, h: hazard.h, dir: hazard.dir };
      const hit = spikeHitRectAtFullPop(hazard);
      const dx = Math.max(hit.x - visual.x, visual.x + visual.w - (hit.x + hit.w));
      const dy = visual.dir === "down"
        ? Math.abs((visual.y + visual.h) - (hit.y + hit.h))
        : Math.abs(visual.y - hit.y);
      const xLimit = Math.max(HITBOX_MAX_ABS_DELTA, visual.w * HITBOX_MAX_REL_DELTA);
      const yLimit = Math.max(HITBOX_MAX_ABS_DELTA, visual.h * HITBOX_MAX_REL_DELTA);
      const ok = dx <= xLimit + 0.01 && dy <= yLimit + 0.01;
      if (!ok) {
        results.push({
          level: level.number,
          x: Math.round(hazard.x),
          y: hazard.y,
          dx: round(dx),
          dy: round(dy),
          xLimit: round(xLimit),
          yLimit: round(yLimit),
        });
      }
    }
  }
  return {
    name: "visual/collider hitbox audit",
    ok: results.length === 0,
    tolerance: { px: HITBOX_MAX_ABS_DELTA, relative: HITBOX_MAX_REL_DELTA },
    failed: results.slice(0, 12),
    failedCount: results.length,
  };
}

function spikeHitRectAtFullPop(hazard) {
  const insetX = Math.min(6, hazard.w * 0.08);
  const activeH = hazard.h - Math.min(6, hazard.h * 0.18);
  return {
    x: hazard.x + insetX,
    y: hazard.dir === "down" ? hazard.y : hazard.y + hazard.h - activeH,
    w: Math.max(4, hazard.w - insetX * 2),
    h: activeH,
  };
}

function mobileSafeZoneAudit() {
  const results = [];
  for (const viewport of MOBILE_VIEWPORTS) {
    const landscapeRect = landscapeButtonRect(viewport.width, viewport.height);
    const portraitRect = forcedLandscapeButtonRect(viewport.height, viewport.width);
    results.push(checkButtonRect(`${viewport.width}x${viewport.height}`, viewport.width, viewport.height, landscapeRect));
    results.push(checkButtonRect(`${viewport.height}x${viewport.width} forced`, viewport.height, viewport.width, portraitRect));
  }
  return {
    name: "mobile jump button safe-zone",
    ok: results.every((result) => result.ok),
    results,
  };
}

function landscapeButtonRect(width, height) {
  const size = 90;
  const margin = 10;
  return { x: width - margin - size, y: height - margin - size, w: size, h: size };
}

function forcedLandscapeButtonRect(width, height) {
  const localWidth = height;
  const localHeight = width;
  const size = 90;
  const margin = 10;
  const local = { x: localWidth - margin - size, y: margin, w: size, h: size };
  return {
    x: width - (local.y + local.h),
    y: local.x,
    w: local.h,
    h: local.w,
    localWidth,
    localHeight,
  };
}

function checkButtonRect(label, width, height, rect) {
  const bottomBand = rect.y + rect.h >= height - 112;
  const rightBand = rect.x + rect.w >= width - 112;
  const clearOfHud = rect.y >= 58;
  const minSize = rect.w >= 80 && rect.h >= 80;
  return {
    viewport: label,
    ok: bottomBand && rightBand && clearOfHud && minSize,
    rect: roundRect(rect),
    bottomBand,
    rightBand,
    clearOfHud,
    minSize,
  };
}

function inputTimingAudit() {
  const source = readFileSync(join(root, "game", "src", "game.js"), "utf8");
  const holdThreshold = numberConst(source, "HOLD_THRESHOLD_SECONDS");
  const holdCap = numberConst(source, "HOLD_CAP_SECONDS");
  const spamGuard = numberConst(source, "INPUT_SPAM_GUARD_SECONDS");
  const variantShift = /TEST_VARIANT_TIME_SHIFT\s*=/.test(source) && /function testVariantOffset\(\)/.test(source);
  return {
    name: "tap/hold/anti-spam timing",
    ok: holdThreshold >= 0.09
      && holdThreshold <= 0.12
      && holdCap >= 0.26
      && holdCap <= 0.34
      && spamGuard === 0.08
      && variantShift,
    holdThresholdSeconds: holdThreshold,
    holdCapSeconds: holdCap,
    antiSpamSeconds: spamGuard,
    variantShift,
  };
}

function economyAndLeaderboardAudit() {
  const source = readFileSync(join(root, "game", "src", "game.js"), "utf8");
  const server = readFileSync(join(root, "game", "server.mjs"), "utf8");
  const checks = {
    levelScopedLocalRecords: /LOCAL_RECORDS_KEY\s*=\s*`filDash\.records\.\$\{LEVEL_ID\}\.v1`/.test(source),
    globalLevelIdQuery: /url\.searchParams\.set\("levelId", LEVEL_ID\)/.test(source),
    serverStoresLevelId: /levelId:\s*cleanLevelId\(input\.levelId\)/.test(server),
    recordCoinReward: /function rewardCoinsForNewRecord/.test(source) && /economy\.coins \+= reward/.test(source),
    skinShop: /const PLAYER_SKINS = \[/.test(source) && /function renderSkinShop/.test(source) && /economy\.ownedSkins\.add/.test(source),
  };
  return {
    name: "records coins skins leaderboard",
    ok: Object.values(checks).every(Boolean),
    checks,
  };
}

function numberConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)`));
  return match ? Number(match[1]) : NaN;
}

function runJsonTool(scriptName, args) {
  const output = execFileSync(process.execPath, [join(root, "tools", scriptName), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function roundRect(rect) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.round(rect.w),
    h: Math.round(rect.h),
  };
}
