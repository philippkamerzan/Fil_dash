export const TILE = 36;

export const WORLD = {
  width: 15400,
  height: 1600,
  start: { x: 72, y: 1086, mode: "cube", gravity: 1 },
};

export const GEOMETRY_DASH_TARGET_SECONDS = 90;
export const LEVEL_BASE_WIDTH = WORLD.width;
export const LEVEL_TARGET_WIDTH = 31800;
export const LEVEL_SCALE = LEVEL_TARGET_WIDTH / LEVEL_BASE_WIDTH;

export const LEVEL_MUSIC = {
  src: "./assets/audio/0707.mp3",
  volume: 0.72,
  loop: true,
};

const platform = (x, y, w, h, kind = "platform") => ({ x, y, w, h, kind });
const spike = (x, y, w, h, dir = "up", extra = {}) => ({ x, y, w, h, dir, kind: "spike", ...extra });
const trigger = (x, y, w, h, type, extra = {}) => ({ x, y, w, h, type, ...extra });

const platforms = [];
const hazards = [];
const boosters = [];
const downDots = [];
const traps = [];
const yellowZones = [];
const trampolines = [];
const portals = [];
const mouths = [];
const movers = [];
const speedZones = [];
const orbs = [];
const autoPads = [];
const gravityRings = [];
const miniZones = [];
const decorations = [];
const checkpoints = [];
const testActions = [];

export const sections = [
  { id: "start", name: "Разгон", x: 0, w: 1050, accent: "#2d68ff", lane: 1120 },
  { id: "spikes", name: "Ритм шипов", x: 1050, w: 1100, accent: "#22c7d7", lane: 1120 },
  { id: "trap", name: "Ловушка", x: 2150, w: 900, accent: "#ff4d6d", lane: 1120 },
  { id: "yellow", name: "Желтый пролет", x: 3050, w: 1550, accent: "#ffd84d", lane: 920 },
  { id: "down", name: "Портал вниз", x: 4600, w: 500, accent: "#ff9e23", lane: 980 },
  { id: "plane", name: "Самолетик", x: 5100, w: 1700, accent: "#20c5d6", lane: 1080 },
  { id: "cube-return", name: "Возврат", x: 6800, w: 1200, accent: "#34d399", lane: 930 },
  { id: "flip", name: "Переворот", x: 8000, w: 450, accent: "#ff9e23", lane: 930 },
  { id: "inverted", name: "Вверх ногами", x: 8450, w: 1550, accent: "#8b5cf6", lane: 500 },
  { id: "restore", name: "Обратно", x: 10000, w: 600, accent: "#20c5d6", lane: 900 },
  { id: "ghost", name: "Призрачные платформы", x: 10600, w: 1600, accent: "#9b7cff", lane: 900 },
  { id: "mini", name: "Мини-ритм", x: 12200, w: 1000, accent: "#f472b6", lane: 900 },
  { id: "mix", name: "Финальный микс", x: 13200, w: 1400, accent: "#ffd84d", lane: 980 },
  { id: "finish", name: "Финишный портал", x: 14600, w: 800, accent: "#34d399", lane: 1040 },
];

function addPlatform(x, y, w, h = 46, kind = "platform") {
  platforms.push(platform(x, y, w, h, kind));
}

function addSpike(x, topY, w, h = 34, dir = "up", extra = {}) {
  hazards.push(spike(x, topY, w, h, dir, extra));
}

function addSpikeRun(startX, baseY, groups, gap = 58, spikeW = 34) {
  let x = startX;
  for (const count of groups) {
    addSpike(x, baseY - 34, count * spikeW, 34, "up");
    x += count * spikeW + gap;
  }
}

function addJump(x, w = 78) {
  testActions.push({ x, w, kind: "jump" });
}

function addHold(x, w) {
  testActions.push({ x, w, kind: "hold" });
}

function addDecor(x, y, kind, color, extra = {}) {
  decorations.push({ x, y, kind, color, ...extra });
}

function fillDecor(section, density = 86) {
  const end = section.x + section.w;
  for (let x = section.x + 60; x < end; x += density) {
    const i = Math.floor((x - section.x) / density);
    const y = 145 + ((i * 89 + section.lane) % 1040);
    addDecor(x, y, i % 4 === 0 ? "arc" : i % 4 === 1 ? "slash" : i % 4 === 2 ? "miniBlock" : "spark", section.accent, {
      phase: i * 0.7,
      scale: 0.62 + (i % 5) * 0.12,
    });
    addDecor(x + 38, Math.max(110, section.lane - 230 + (i % 4) * 76), i % 2 === 0 ? "arrow" : "chevron", section.accent, {
      dir: i % 4 === 0 ? "down" : "right",
      phase: i * 0.33,
      scale: 0.7 + (i % 3) * 0.08,
    });
    if (i % 3 === 0) {
      addDecor(x + 72, Math.min(WORLD.height - 180, section.lane + 120 + (i % 2) * 88), "tile", section.accent, {
        phase: i * 0.33,
        scale: 0.7,
      });
    }
    addDecor(x + 18, Math.min(WORLD.height - 130, section.lane + 240 + (i % 4) * 72), i % 2 === 0 ? "rail" : "tile", section.accent, {
      phase: i * 0.41,
      scale: 0.58 + (i % 2) * 0.12,
    });
  }
}

sections.forEach((section) => fillDecor(section));

// Section 1: acceleration on the lower floor.
addPlatform(-120, 1120, 980);
addSpike(260, 1086, 34, 34, "up");
addSpikeRun(440, 1120, [1, 1], 190);
addSpike(780, 1086, 34, 34, "up");
addJump(150);
addJump(292);
addJump(518);
addJump(742);
boosters.push(trigger(825, 1057, 66, 66, "blueBoost", { power: 760 }));
speedZones.push(trigger(900, 1014, 92, 132, "fast", { speed: 320 }));
addPlatform(930, 1120, 280);

// Section 2: rhythmic spike groups and a down-dot drop cue.
addPlatform(1190, 1120, 1050);
addSpikeRun(1240, 1120, [1, 2, 1, 2], 190);
addJump(1180);
addJump(1398);
addJump(1590);
addJump(1812);
addJump(2040);
downDots.push(trigger(2055, 820, 96, 130, "downImpulse", { power: 760 }));

// Section 3: bad jump trap that throws the player into visible spikes.
addPlatform(2240, 1120, 840);
traps.push(trigger(2440, 998, 46, 48, "badJump"));
addSpike(2670, 1086, 90, 34, "up");
addSpike(2915, 1086, 54, 34, "up");
addSpike(2270, 1086, 52, 34, "up");
addJump(2825);
speedZones.push(trigger(2860, 1016, 94, 130, "slow", { speed: 260 }));

// Section 4: yellow hold-flight between ceiling and floor spikes.
addPlatform(3060, 1120, 180);
yellowZones.push(trigger(3160, 760, 1250, 340, "yellowFlight", { targetY: 850, minSpeed: 372 }));
addSpike(3200, 760, 1060, 42, "down", { scaleWidth: true });
addSpike(3250, 1090, 990, 30, "up", { scaleWidth: true });
addHold(3160, 1250);
addPlatform(4380, 1120, 370);
trampolines.push(trigger(4460, 1088, 88, 30, "trampoline", { vx: 380, vy: -640 }));
boosters.push(trigger(4670, 790, 120, 420, "portalDown", {
  target: { x: 5120, y: 1060, mode: "plane", gravity: 1 },
  checkpointX: 5050,
}));

// Section 6: plane corridor after the portal down.
addSpike(5100, 830, 1600, 38, "down", { scaleWidth: true });
addSpike(5100, 1282, 1600, 38, "up", { scaleWidth: true });
mouths.push(
  { x: 5570, top: 870, bottom: 1268, gapY: 960, gapH: 170, closed: false, passed: false },
  { x: 6230, top: 850, bottom: 1268, gapY: 1000, gapH: 215, closed: false, passed: false },
  { x: 6480, top: 850, bottom: 1268, gapY: 1005, gapH: 220, closed: false, passed: false },
);
movers.push({ x: 6035, y: 1138, w: 48, h: 56, axis: "y", amp: 72, speed: 1.55, phase: 1.1, kind: "movingHazard" });
portals.push(trigger(6715, 982, 104, 170, "planeOut", {
  target: { x: 6900, y: 896, mode: "cube", gravity: 1 },
  checkpointX: 6850,
}));

// Section 7: cube return with short rhythmic patterns and jump rings.
addPlatform(6880, 930, 1210, 44);
addSpike(7040, 896, 36, 34, "up");
addSpikeRun(7240, 930, [1, 1, 2], 180, 32);
orbs.push(
  trigger(7270, 790, 46, 46, "jumpOrb", { power: 620, color: "#34d399" }),
  trigger(7640, 775, 46, 46, "jumpOrb", { power: 660, color: "#ffd84d" }),
);
addJump(7220);
addJump(7250);
addJump(7630);
addJump(7880);
addJump(6960);
speedZones.push(trigger(7780, 824, 100, 132, "fast", { speed: 345 }));

// Section 8 and 9: orange gravity portal and ceiling run.
portals.push(trigger(8110, 806, 104, 160, "gravityFlip", {
  target: { x: 8270, y: 542, mode: "cube", gravity: -1 },
  checkpointX: 8120,
}));
addPlatform(8240, 500, 470, 42);
addPlatform(8720, 500, 460, 42);
addPlatform(9220, 500, 780, 42);
addSpike(9260, 542, 52, 16, "down");
addSpike(9580, 542, 56, 16, "down");
addSpike(9860, 542, 52, 16, "down");
addSpike(8740, 362, 96, 24, "up");
addSpike(9300, 362, 118, 24, "up");
movers.push({ x: 9520, y: 760, w: 58, h: 58, axis: "x", amp: 90, speed: 1.35, phase: 0.2, kind: "movingHazard" });
gravityRings.push(trigger(9550, 620, 58, 58, "gravityRing", { targetGravity: -1, impulse: 520 }));
addHold(8420, 180);
addHold(8750, 380);
addHold(9260, 120);
addHold(9500, 260);
addHold(9780, 240);
portals.push(trigger(10030, 420, 108, 168, "gravityRestore", {
  target: { x: 10220, y: 866, mode: "cube", gravity: 1 },
  checkpointX: 10190,
}));

// Section 10: safe platform after gravity restore.
addPlatform(10200, 900, 500, 44);
addSpike(10295, 866, 42, 34, "up");
autoPads.push(trigger(10420, 864, 78, 32, "autoPad", { power: 620, vx: 326 }));
addJump(10270);

// Section 11: ghost platforms, jump on checks and fall through empty marks.
addPlatform(10670, 900, 270, 44);
addPlatform(10960, 790, 170, 26, "ghost-check");
addPlatform(11250, 790, 170, 26, "ghost-pass");
addPlatform(11540, 790, 190, 26, "ghost-check");
addPlatform(11840, 900, 430, 44);
addPlatform(10960, 1120, 1300, 44);
autoPads.push(trigger(11600, 1084, 82, 32, "autoPad", { power: 650, vx: 330 }));
autoPads.push(trigger(12110, 1084, 82, 32, "autoPad", { power: 720, vx: 338 }));
addSpike(10870, 866, 34, 34, "up");
addSpike(11320, 1086, 42, 34, "up");
addSpike(11900, 866, 170, 34, "up");
addJump(10820);
addJump(10940);
addJump(11250);
addJump(11510);
addJump(11820);
movers.push({ x: 11760, y: 790, w: 52, h: 60, axis: "y", amp: 62, speed: 1.7, phase: 1.5, kind: "movingHazard" });

// Section 12: mini mode and dense short jumps.
addPlatform(12200, 980, 360, 44);
addPlatform(12240, 900, 980, 44);
miniZones.push(trigger(12280, 760, 820, 300, "mini", { enabled: true }));
speedZones.push(trigger(12320, 804, 100, 132, "fast", { speed: 370 }));
addSpike(12470, 884, 26, 16, "up");
addSpike(12680, 884, 24, 16, "up");
addSpikeRun(12820, 900, [1, 1], 132, 28);
orbs.push(
  trigger(12610, 760, 42, 42, "jumpOrb", { power: 540, color: "#f472b6" }),
  trigger(12920, 750, 42, 42, "jumpOrb", { power: 560, color: "#20c5d6" }),
);
addJump(12350);
addJump(12410);
addJump(12560);
addJump(12880);
addJump(13100);

// Section 13: final mix with short gravity rings, moving hazards and a yellow burst.
addPlatform(13220, 980, 560, 44);
gravityRings.push(trigger(13440, 835, 62, 62, "gravityRing", { targetGravity: -1, impulse: 480 }));
addPlatform(13400, 650, 540, 42);
gravityRings.push(trigger(13860, 742, 62, 62, "gravityRing", { targetGravity: 1, impulse: 520 }));
addPlatform(13910, 980, 690, 44);
yellowZones.push(trigger(14020, 825, 390, 230, "yellowFlight", { targetY: 880, minSpeed: 382 }));
trampolines.push(trigger(14460, 948, 78, 30, "trampoline", { vx: 382, vy: -510 }));
addSpike(13405, 946, 90, 34, "up");
addSpike(13580, 692, 160, 6, "down");
addSpike(14060, 946, 185, 34, "up");
addSpike(14520, 964, 90, 16, "up");
movers.push({ x: 14370, y: 1100, w: 62, h: 62, axis: "y", amp: 44, speed: 1.9, phase: 2.1, kind: "movingHazard" });
addJump(13310, 140);
addHold(13515, 150);
addHold(13980, 390);
addJump(14420);

// Section 14: finish portal with a final safe runway.
addPlatform(14600, 1040, 720, 44);
addSpike(14735, 1006, 38, 34, "up");
addSpike(14965, 1006, 42, 34, "up");
addJump(14640);
addJump(14900);
portals.push(trigger(15100, 896, 120, 190, "finish"));

checkpoints.push(
  { x: 0, spawn: { x: 72, y: 1086, mode: "cube", gravity: 1 } },
  { x: 5050, spawn: { x: 5120, y: 1060, mode: "plane", gravity: 1 } },
  { x: 6850, spawn: { x: 6900, y: 896, mode: "cube", gravity: 1 } },
  { x: 10190, spawn: { x: 10220, y: 866, mode: "cube", gravity: 1 } },
  { x: 12200, spawn: { x: 12240, y: 866, mode: "cube", gravity: 1 } },
);

function scaleCoord(value) {
  return Math.round(value * LEVEL_SCALE);
}

function scaleSize(value) {
  return Math.max(1, Math.round(value * LEVEL_SCALE));
}

function scaleRectX(item, scaleWidth = false) {
  item.x = scaleCoord(item.x);
  if (scaleWidth) item.w = scaleSize(item.w);
}

function scalePortalTarget(item) {
  if (item.target?.x != null) item.target.x = scaleCoord(item.target.x);
  if (item.checkpointX != null) item.checkpointX = scaleCoord(item.checkpointX);
}

function scaleLevelToGeometryDashLength() {
  const jumpTargets = [...hazards, ...movers, ...orbs, ...gravityRings]
    .map((item) => ({ x: item.x }))
    .sort((a, b) => a.x - b.x);

  WORLD.width = LEVEL_TARGET_WIDTH;
  sections.forEach((section, index) => {
    const next = sections[index + 1];
    section.x = scaleCoord(section.x);
    section.w = (next ? scaleCoord(next.x) : LEVEL_TARGET_WIDTH) - section.x;
  });
  platforms.forEach((item) => scaleRectX(item, true));
  hazards.forEach((item) => scaleRectX(item, item.scaleWidth));
  yellowZones.forEach((item) => scaleRectX(item, true));
  miniZones.forEach((item) => scaleRectX(item, true));
  testActions.forEach((item) => {
    if (item.kind === "hold") {
      scaleRectX(item, true);
      return;
    }
    const target = jumpTargets.find((candidate) => candidate.x >= item.x && candidate.x - item.x <= 260);
    item.x = target ? scaleCoord(target.x) - Math.min(160, target.x - item.x) : scaleCoord(item.x);
  });

  [
    boosters,
    downDots,
    traps,
    trampolines,
    portals,
    movers,
    speedZones,
    orbs,
    autoPads,
    gravityRings,
    decorations,
  ].forEach((items) => items.forEach((item) => scaleRectX(item)));

  mouths.forEach((mouth) => {
    mouth.x = scaleCoord(mouth.x);
  });

  [...boosters, ...portals].forEach(scalePortalTarget);

  checkpoints.forEach((checkpoint) => {
    checkpoint.x = scaleCoord(checkpoint.x);
    if (checkpoint.x > 0) checkpoint.spawn.x = scaleCoord(checkpoint.spawn.x);
  });
}

scaleLevelToGeometryDashLength();

export const level = {
  music: LEVEL_MUSIC,
  targetDurationSeconds: GEOMETRY_DASH_TARGET_SECONDS,
  baseWidth: LEVEL_BASE_WIDTH,
  scale: LEVEL_SCALE,
  sections,
  platforms,
  hazards,
  boosters,
  downDots,
  traps,
  yellowZones,
  trampolines,
  portals,
  mouths,
  movers,
  speedZones,
  orbs,
  autoPads,
  gravityRings,
  miniZones,
  decorations,
  checkpoints,
  testActions,
};
