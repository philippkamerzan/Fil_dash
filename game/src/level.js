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
const routeBands = [];
const decorations = [];
const testActions = [];
const CEILING_BITE_DROPS = new Map([
  [610, 34],
  [1320, 34],
  [1690, 34],
  [2015, 34],
  [2295, 34],
  [2740, 34],
]);

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

function addPopupSpike(x, topY, w, h = 34, dir = "up", extra = {}) {
  const { popup = {}, ...rest } = extra;
  addSpike(x, topY, w, h, dir, {
    ...rest,
    popup: {
      triggerDistance: 300,
      extendDistance: 150,
      hiddenOffset: h,
      warningColor: "#ff9e23",
      ...popup,
    },
  });
}

function addSpikeRun(startX, baseY, groups, gap = 58, spikeW = 34) {
  let x = startX;
  for (const count of groups) {
    addSpike(x, baseY - 34, count * spikeW, 34, "up");
    x += count * spikeW + gap;
  }
}

function addCeilingBite(x, railY, w, h = 34, accent = "#2d68ff") {
  const y = railY + (CEILING_BITE_DROPS.get(x) || 0);
  addPlatform(x - 18, y - 28, w + 36, 28, "decor");
  addSpike(x, y, w, h, "down");
  addDecor(x + w / 2, y - 52, "spark", accent, { phase: x * 0.01, scale: 0.5 });
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

function addRouteBand(x, y, w, h, kind, color, extra = {}) {
  routeBands.push({ x, y, w, h, kind, color, ...extra });
}

function fillLowerLayer(section, startOffset = 70, endPad = 70) {
  const end = section.x + section.w - endPad;
  for (let x = section.x + startOffset, i = 0; x < end; x += 145, i++) {
    addDecor(x, section.lane + 215 + (i % 3) * 82, i % 2 === 0 ? "chevron" : "arrow", section.accent, {
      dir: "right",
      phase: i * 0.38,
      scale: 1.05 + (i % 2) * 0.18,
    });
    addDecor(x + 58, section.lane + 332 + (i % 2) * 92, i % 3 === 0 ? "miniBlock" : "rail", section.accent, {
      phase: i * 0.52,
      scale: 0.86,
    });
    if (i % 2 === 0) {
      addDecor(x + 104, section.lane + 462, "arc", section.accent, {
        phase: i * 0.7,
        scale: 0.95,
      });
    }
  }
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
sections
  .filter((section) => section.id !== "plane" && section.id !== "finish")
  .forEach((section) => fillLowerLayer(section, 45, 45));

addRouteBand(80, 1305, 820, 88, "horizontal", "#2d68ff", { label: "start-lower-pack" });
addRouteBand(1020, 1330, 1180, 78, "diagonal", "#22c7d7", { dy: -145, label: "spike-lower-sweep" });
addRouteBand(2260, 1285, 128, 350, "vertical", "#ff4d6d", { dir: "down", scaleWidth: false, label: "trap-lower-drop" });
addRouteBand(2520, 1325, 660, 82, "horizontal", "#ff4d6d", { label: "trap-lower-pack" });
addRouteBand(5120, 1050, 1500, 100, "horizontal", "#20c5d6", { label: "plane-tunnel" });
addRouteBand(10280, 520, 126, 540, "vertical", "#8b5cf6", { dir: "up", scaleWidth: false, label: "vertical-lift" });
addRouteBand(10920, 760, 150, 420, "vertical", "#9b7cff", { dir: "down", scaleWidth: false, label: "ghost-drop" });
addRouteBand(12260, 860, 820, 320, "tunnel3d", "#f472b6", { vanishY: 760, label: "mini-3d-tunnel" });
addRouteBand(13280, 935, 1180, 82, "diagonal", "#ffd84d", { dy: -250, label: "diagonal-climb" });
addRouteBand(14040, 850, 520, 76, "diagonal", "#34d399", { dy: 150, label: "diagonal-dive" });

// Section 1: acceleration on the lower floor.
addPlatform(-120, 1120, 1100);
addSpike(260, 1086, 34, 34, "up");
addCeilingBite(320, 910, 72, 32, "#2d68ff");
addSpikeRun(440, 1120, [1, 1], 190);
addCeilingBite(610, 890, 96, 34, "#2d68ff");
addSpike(780, 1086, 34, 34, "up");
addSpike(930, 1086, 30, 34, "up");
addCeilingBite(995, 900, 88, 34, "#2d68ff");
addSpike(1164, 1086, 30, 34, "up");
addJump(150);
addJump(292);
addJump(518);
addJump(742);
addJump(902);
addJump(960, 220);
addJump(1000);
addJump(1135);
boosters.push(trigger(825, 1057, 66, 66, "blueBoost", { power: 760 }));
speedZones.push(trigger(900, 1014, 92, 132, "fast", { speed: 410 }));
addPlatform(930, 1120, 280);

// Section 2: rhythmic spike groups and a down-dot drop cue.
addPlatform(1190, 1120, 1050);
addSpikeRun(1240, 1120, [1, 2, 1, 2], 190);
addCeilingBite(1320, 900, 86, 34, "#22c7d7");
addSpike(1478, 1086, 30, 34, "up");
addCeilingBite(1690, 890, 112, 34, "#22c7d7");
addPopupSpike(1900, 1086, 32, 34, "up", { popup: { triggerDistance: 340, extendDistance: 145 } });
addCeilingBite(2015, 905, 96, 34, "#22c7d7");
addSpike(2185, 1086, 38, 34, "up");
addJump(1180);
addJump(1398);
addJump(1460);
addJump(1590);
addJump(1812);
addJump(2040);
addJump(2145);
addJump(2205, 110);
downDots.push(trigger(2055, 820, 96, 130, "downImpulse", { power: 760 }));

// Section 3: bad jump trap that throws the player into visible spikes.
addPlatform(2240, 1120, 840);
addCeilingBite(2295, 910, 82, 32, "#ff4d6d");
traps.push(trigger(2440, 998, 46, 48, "badJump"));
addPopupSpike(2545, 1086, 30, 34, "up", { popup: { triggerDistance: 260, extendDistance: 125 } });
addSpike(2710, 1086, 78, 34, "up");
addCeilingBite(2740, 890, 104, 34, "#ff4d6d");
addSpike(2915, 1086, 54, 34, "up");
addSpike(2360, 1086, 52, 34, "up");
addJump(2505);
addJump(2825);
speedZones.push(trigger(2860, 1016, 94, 130, "slow", { speed: 338 }));

// Section 4: yellow hold-flight between ceiling and floor spikes.
addPlatform(3060, 1120, 180);
yellowZones.push(trigger(3160, 760, 1250, 340, "yellowFlight", { targetY: 850, minSpeed: 430 }));
addSpike(3200, 760, 1060, 62, "down", { scaleWidth: true });
addSpike(3250, 1066, 990, 54, "up", { scaleWidth: true });
addHold(3160, 1250);
addPlatform(4380, 1120, 370);
trampolines.push(trigger(4460, 1088, 88, 30, "trampoline", { vx: 380, vy: -640 }));
boosters.push(trigger(4670, 790, 120, 420, "portalDown", {
  target: { x: 5120, y: 1060, mode: "plane", gravity: 1 },
}));

// Section 6: plane corridor after the portal down.
addSpike(5100, 830, 1600, 38, "down", { scaleWidth: true });
addSpike(5100, 1282, 1600, 38, "up", { scaleWidth: true });
mouths.push(
  { x: 5570, top: 870, bottom: 1268, gapY: 962, gapH: 145, closed: false, passed: false },
  { x: 6230, top: 850, bottom: 1268, gapY: 990, gapH: 220, closed: false, passed: false },
  { x: 6480, top: 850, bottom: 1268, gapY: 1012, gapH: 195, closed: false, passed: false },
);
movers.push({ x: 6035, y: 1138, w: 48, h: 56, axis: "y", amp: 72, speed: 1.55, phase: 1.1, kind: "movingHazard" });
movers.push({ x: 6360, y: 935, w: 42, h: 54, axis: "y", amp: 58, speed: 1.9, phase: 0.55, kind: "movingHazard" });
movers.push({ x: 5805, y: 990, w: 38, h: 52, axis: "y", amp: 68, speed: 2.15, phase: 2.5, kind: "movingHazard" });
portals.push(trigger(6715, 982, 104, 170, "planeOut", {
  target: { x: 6900, y: 896, mode: "cube", gravity: 1 },
}));

// Section 7: cube return with short rhythmic patterns and jump rings.
addPlatform(6880, 930, 1210, 44);
addSpike(7040, 896, 36, 34, "up");
addSpikeRun(7240, 930, [1, 1, 2, 1], 178, 32);
addPopupSpike(7875, 896, 30, 34, "up", { popup: { triggerDistance: 330, extendDistance: 130 } });
orbs.push(
  trigger(7270, 790, 46, 46, "jumpOrb", { power: 620, color: "#34d399" }),
  trigger(7640, 775, 46, 46, "jumpOrb", { power: 660, color: "#ffd84d" }),
);
addJump(7220);
addJump(7250, 220);
addJump(7340, 260);
addJump(7630);
addJump(7788, 120);
addJump(7880);
addJump(7990);
addJump(6960);
speedZones.push(trigger(7780, 824, 100, 132, "fast", { speed: 442 }));

// Section 8 and 9: orange gravity portal and ceiling run.
portals.push(trigger(8110, 806, 104, 160, "gravityFlip", {
  target: { x: 8270, y: 542, mode: "cube", gravity: -1 },
}));
addPlatform(8240, 500, 470, 42);
addPlatform(8720, 500, 460, 42);
addPlatform(9220, 500, 780, 42);
addPopupSpike(9260, 542, 52, 24, "down", { popup: { triggerDistance: 300, extendDistance: 140 } });
addPopupSpike(9580, 542, 56, 24, "down", { popup: { triggerDistance: 300, extendDistance: 140 } });
addPopupSpike(9860, 542, 52, 24, "down", { popup: { triggerDistance: 300, extendDistance: 140 } });
addSpike(8740, 362, 96, 24, "up");
addSpike(9300, 362, 118, 24, "up");
addSpike(9695, 362, 90, 24, "up");
movers.push({ x: 9520, y: 760, w: 58, h: 58, axis: "x", amp: 90, speed: 1.35, phase: 0.2, kind: "movingHazard" });
gravityRings.push(trigger(9550, 620, 58, 58, "gravityRing", { targetGravity: -1, impulse: 520 }));
addHold(8420, 180);
addHold(8750, 380);
addHold(9260, 120);
addHold(9500, 260);
addHold(9780, 240);
portals.push(trigger(10030, 420, 108, 168, "gravityRestore", {
  target: { x: 10220, y: 866, mode: "cube", gravity: 1 },
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
addPopupSpike(11085, 866, 34, 34, "up", { popup: { triggerDistance: 300, extendDistance: 130 } });
addSpike(11320, 1086, 42, 34, "up");
addSpike(11695, 1086, 34, 34, "up");
addSpike(11900, 866, 170, 34, "up");
addSpike(12150, 866, 34, 34, "up");
addJump(10820);
addJump(10940);
addJump(11250);
addJump(11510);
addJump(11645);
addJump(11820);
addJump(12100);
movers.push({ x: 11760, y: 790, w: 52, h: 60, axis: "y", amp: 62, speed: 1.7, phase: 1.5, kind: "movingHazard" });
movers.push({ x: 11420, y: 940, w: 46, h: 56, axis: "x", amp: 72, speed: 1.95, phase: 0.4, kind: "movingHazard" });

// Section 12: mini mode and dense short jumps.
addPlatform(12200, 980, 360, 44);
addPlatform(12240, 900, 980, 44);
miniZones.push(trigger(12280, 760, 820, 300, "mini", { enabled: true }));
speedZones.push(trigger(12320, 804, 100, 132, "fast", { speed: 478 }));
addPopupSpike(12470, 876, 26, 24, "up", { popup: { triggerDistance: 260, extendDistance: 125 } });
addPopupSpike(12575, 876, 22, 24, "up", { popup: { triggerDistance: 260, extendDistance: 125 } });
addPopupSpike(12680, 876, 24, 24, "up", { popup: { triggerDistance: 260, extendDistance: 125 } });
addSpikeRun(12820, 900, [1, 1, 1], 104, 28);
orbs.push(
  trigger(12610, 760, 42, 42, "jumpOrb", { power: 540, color: "#f472b6" }),
  trigger(12920, 750, 42, 42, "jumpOrb", { power: 560, color: "#20c5d6" }),
);
addJump(12300, 150);
addJump(12410);
addJump(12535);
addJump(12560);
addJump(12880);
addJump(13100);

// Section 13: final mix with short gravity rings, moving hazards and a yellow burst.
addPlatform(13220, 980, 560, 44);
gravityRings.push(trigger(13440, 835, 62, 62, "gravityRing", { targetGravity: -1, impulse: 480 }));
addPlatform(13400, 650, 540, 42);
gravityRings.push(trigger(13860, 742, 62, 62, "gravityRing", { targetGravity: 1, impulse: 520 }));
addPlatform(13820, 980, 780, 44);
yellowZones.push(trigger(14020, 825, 390, 230, "yellowFlight", { targetY: 880, minSpeed: 438 }));
trampolines.push(trigger(14460, 948, 78, 30, "trampoline", { vx: 438, vy: -510 }));
addSpike(13405, 946, 90, 34, "up");
addPopupSpike(13680, 692, 120, 14, "down", { popup: { triggerDistance: 230, extendDistance: 160 } });
addSpike(13920, 946, 42, 34, "up");
movers.push({ x: 14370, y: 1100, w: 62, h: 62, axis: "y", amp: 44, speed: 1.9, phase: 2.1, kind: "movingHazard" });
movers.push({ x: 13780, y: 846, w: 46, h: 52, axis: "x", amp: 76, speed: 1.7, phase: 1.3, kind: "movingHazard" });
addJump(13310, 140);
addHold(13515, 70);
addJump(13610, 110);
addJump(13885, 160);
addHold(13940, 500);
addJump(14420, 150);

// Section 14: finish portal with a final safe runway.
addPlatform(14600, 1040, 720, 44);
addSpike(14735, 1006, 38, 34, "up");
addPopupSpike(14835, 1006, 32, 34, "up", { popup: { triggerDistance: 300, extendDistance: 120 } });
addSpike(14965, 1006, 42, 34, "up");
addSpike(15045, 1006, 32, 34, "up");
addJump(14640);
addJump(14900);
addJump(15010);
portals.push(trigger(15100, 896, 120, 190, "finish"));

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
}

function scaleRouteBand(item) {
  item.x = scaleCoord(item.x);
  if (item.scaleWidth !== false) item.w = scaleSize(item.w);
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
  ].forEach((items) => items.forEach((item) => scaleRectX(item)));
  decorations.forEach((item) => scaleRectX(item));
  routeBands.forEach(scaleRouteBand);

  mouths.forEach((mouth) => {
    mouth.x = scaleCoord(mouth.x);
  });

  [...boosters, ...portals].forEach(scalePortalTarget);

}

scaleLevelToGeometryDashLength();

const unreachableBaseSpikes = [
  { xMin: 2010, xMax: 2100, y: 900 },
  { xMin: 2360, xMax: 2430, y: 1086 },
  { xMin: 3980, xMax: 4100, y: 1086 },
  { xMin: 15320, xMax: 15440, y: 896 },
  { xMin: 25680, xMax: 25810, y: 876 },
  { xMin: 26980, xMax: 27060, y: 866 },
  { xMin: 28180, xMax: 28380, y: 692 },
  { xMin: 28680, xMax: 28820, y: 946 },
  { xMin: 30860, xMax: 30970, y: 1006 },
];

for (const marker of unreachableBaseSpikes) {
  const index = hazards.findIndex((hazard) =>
    hazard.y === marker.y
    && hazard.x > marker.xMin
    && hazard.x < marker.xMax
  );
  if (index >= 0) hazards.splice(index, 1);
}

const densityCeilingSpikes = [
  1085, 3482, 3714, 3946, 4178, 4885, 5335, 5570, 6198, 6587, 6813,
  7455, 8181, 8461, 9000, 10078, 10487, 10678, 13178, 13610, 14195,
];

densityCeilingSpikes.forEach((sourceX, index) => {
  hazards.push({
    x: scaleCoord(sourceX),
    y: sourceX > 13000 ? 610 : index % 3 === 0 ? 650 : index % 3 === 1 ? 700 : 745,
    w: index % 2 === 0 ? 72 : 58,
    h: 24,
    dir: "down",
    kind: "spike",
    color: "#11131b",
  });
});

export const level = {
  id: "level-1",
  number: 1,
  slug: "fil-dash-1",
  title: "FIL Dash 1",
  shortTitle: "L1",
  music: LEVEL_MUSIC,
  world: WORLD,
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
  routeBands,
  decorations,
  testActions,
};
