import { level as baseLevel } from "./spaceLevel.js?v=2";

const clone = (value) => structuredClone(value);
const scaleX = (x) => Math.round(x * baseLevel.scale);
const scaleW = (w) => Math.max(1, Math.round(w * baseLevel.scale));

function floorSpike(sourceX, topY, w = 32, h = 34, extra = {}) {
  return {
    x: scaleX(sourceX),
    y: topY,
    w,
    h,
    dir: "up",
    kind: "spike",
    color: "#17351f",
    ...extra,
  };
}

function ceilingSpike(sourceX, topY, w = 48, h = 28, extra = {}) {
  return {
    x: scaleX(sourceX),
    y: topY,
    w,
    h,
    dir: "down",
    kind: "spike",
    color: "#17351f",
    ...extra,
  };
}

function popup(extra = {}) {
  return {
    triggerDistance: 292,
    extendDistance: 138,
    hiddenOffset: extra.hiddenOffset ?? 34,
    warningColor: extra.warningColor ?? "#f59e0b",
    ...extra,
  };
}

function mover(sourceX, y, w, h, axis, amp, speed, phase, color = "#16a34a") {
  return {
    x: scaleX(sourceX),
    y,
    w,
    h,
    axis,
    amp,
    speed,
    phase,
    color,
    kind: "movingHazard",
  };
}

function routeBand(sourceX, sourceW, y, h, kind, color, extra = {}) {
  return {
    x: scaleX(sourceX),
    y,
    w: scaleW(sourceW),
    h,
    kind,
    color,
    ...extra,
  };
}

function decor(sourceX, y, kind, color, extra = {}) {
  return {
    x: scaleX(sourceX),
    y,
    kind,
    color,
    ...extra,
  };
}

function jump(sourceX, w = 130) {
  return { x: scaleX(sourceX), w, kind: "jump" };
}

function hold(sourceX, sourceW) {
  return { x: scaleX(sourceX), w: scaleW(sourceW), kind: "hold" };
}

export const level = clone(baseLevel);

level.id = "level-3";
level.number = 3;
level.slug = "jungle-run";
level.title = "FIL Dash 3: Джунгли";
level.shortTitle = "L3";
level.renderMode = "canvas";
level.theme = "jungle";
level.targetDurationSeconds = 86;
level.speedMultiplier = 1.14;
level.maxCubeSpeed = 570;
level.maxYellowSpeed = 592;
level.testLookAhead = 154;
level.testMoverLookAhead = 210;
level.world = {
  ...level.world,
  start: { x: baseLevel.world.start.x, y: baseLevel.world.start.y, mode: "cube", gravity: 1 },
};

const sectionSkins = [
  ["canopy-gate", "Canopy Gate", "#22c55e"],
  ["thorn-floor", "Thorn Floor", "#84cc16"],
  ["snap-plant", "Snap Plant", "#f97316"],
  ["sun-vine", "Sun Vine", "#facc15"],
  ["root-drop", "Root Drop", "#fb923c"],
  ["swamp-flight", "Swamp Flight", "#06b6d4"],
  ["temple-return", "Temple Roots", "#34d399"],
  ["root-flip", "Root Flip", "#f97316"],
  ["canopy-ceiling", "Canopy Ceiling", "#a855f7"],
  ["waterfall", "Waterfall", "#38bdf8"],
  ["ghost-leaves", "Ghost Leaves", "#c084fc"],
  ["mini-thorns", "Mini Thorns", "#f472b6"],
  ["predator-mix", "Predator Mix", "#fde047"],
  ["jungle-finish", "Jungle Finish", "#4ade80"],
];

level.sections = level.sections.map((section, index) => {
  const [id, name, accent] = sectionSkins[index] || sectionSkins.at(-1);
  return { ...section, id, name, accent };
});

level.routeBands = [
  routeBand(140, 980, 1290, 84, "horizontal", "#22c55e", { label: "canopy-root-floor" }),
  routeBand(1020, 1180, 1330, 78, "diagonal", "#84cc16", { dy: -210, label: "thorn-diagonal-sweep" }),
  routeBand(2380, 118, 980, 330, "vertical", "#f97316", { dir: "down", scaleWidth: false, label: "falling-vine-drop" }),
  routeBand(3120, 1180, 840, 340, "tunnel3d", "#facc15", { vanishY: 690, label: "sun-vine-depth" }),
  routeBand(5080, 1440, 1000, 116, "horizontal", "#06b6d4", { label: "swamp-flight-lane" }),
  routeBand(6810, 980, 880, 82, "diagonal", "#34d399", { dy: -230, label: "temple-root-lift" }),
  routeBand(8500, 1220, 330, 88, "horizontal", "#a855f7", { label: "ceiling-canopy-lane" }),
  routeBand(10590, 170, 650, 520, "vertical", "#38bdf8", { dir: "down", scaleWidth: false, label: "waterfall-drop" }),
  routeBand(12180, 950, 895, 325, "tunnel3d", "#f472b6", { vanishY: 750, label: "mini-thorn-depth" }),
  routeBand(13530, 920, 770, 80, "diagonal", "#fde047", { dy: 250, label: "predator-dive" }),
];

const jungleDecor = [];
for (let x = 80, i = 0; x < baseLevel.baseWidth; x += 68, i++) {
  const accent = sectionSkins[i % sectionSkins.length][2];
  const canopyY = 90 + ((i * 61) % 470);
  const lowerY = 1030 + ((i * 83) % 430);
  jungleDecor.push(
    decor(x, canopyY, i % 4 === 0 ? "vine" : i % 4 === 1 ? "leaf" : i % 4 === 2 ? "flower" : "root", accent, {
      phase: i * 0.31,
      scale: 0.58 + (i % 5) * 0.1,
    }),
    decor(x + 28, lowerY, i % 3 === 0 ? "root" : i % 3 === 1 ? "leaf" : "flower", i % 2 ? "#fb7185" : "#14b8a6", {
      phase: i * 0.43,
      scale: 0.46 + (i % 4) * 0.1,
    }),
  );
}

level.decorations = jungleDecor;

const extraHazards = [
  ceilingSpike(610, 878, 92, 30),
  floorSpike(985, 1086, 30, 34, { popup: popup({ triggerDistance: 270 }) }),
  ceilingSpike(1445, 876, 76, 28),
  floorSpike(1700, 1086, 30, 34, { popup: popup({ triggerDistance: 270 }) }),
  floorSpike(2075, 1086, 28, 34, { popup: popup({ triggerDistance: 245 }) }),
  ceilingSpike(2325, 900, 82, 28),
  floorSpike(2965, 1086, 32, 34),
  ceilingSpike(3265, 760, 88, 34),
  floorSpike(3615, 1066, 72, 54, { scaleWidth: true }),
  ceilingSpike(3940, 760, 94, 36),
  floorSpike(4440, 1086, 30, 34),
  floorSpike(4560, 1086, 26, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(5230, 904, 112, 30),
  ceilingSpike(5750, 892, 96, 28),
  floorSpike(6040, 1132, 82, 38),
  ceilingSpike(6400, 902, 104, 28),
  floorSpike(7060, 896, 30, 34),
  ceilingSpike(7810, 750, 78, 26),
  ceilingSpike(8745, 542, 54, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 260 }) }),
  floorSpike(10300, 866, 32, 34),
  floorSpike(11025, 866, 30, 34, { popup: popup({ triggerDistance: 240 }) }),
  floorSpike(11495, 1086, 32, 34),
  floorSpike(11885, 866, 34, 34),
  floorSpike(13020, 866, 28, 34, { popup: popup({ triggerDistance: 230 }) }),
  floorSpike(13480, 946, 38, 34),
  ceilingSpike(13690, 690, 116, 16, { popup: popup({ hiddenOffset: 18, triggerDistance: 220 }) }),
];

level.hazards = [
  ...level.hazards,
  ...extraHazards,
];

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.y === 896 && hazard.x > scaleX(7420) && hazard.x < scaleX(7480))
);

level.movers = [
  ...level.movers,
  mover(11480, 920, 48, 56, "x", 82, 2.2, 0.9, "#22c55e"),
  mover(13760, 850, 48, 56, "x", 76, 2.35, 1.8, "#65a30d"),
];

level.mouths = [
  ...level.mouths,
  { x: scaleX(14120), top: 710, bottom: 1050, gapY: 840, gapH: 138, color: "#65a30d" },
];

level.speedZones = [
  ...level.speedZones,
  { x: scaleX(520), y: 1014, w: 90, h: 132, type: "fast", speed: 446 },
  { x: scaleX(2460), y: 1014, w: 90, h: 132, type: "fast", speed: 464 },
  { x: scaleX(7210), y: 824, w: 92, h: 132, type: "fast", speed: 480 },
  { x: scaleX(13360), y: 804, w: 92, h: 132, type: "fast", speed: 505 },
];

level.testActions = [
  ...level.testActions,
  jump(560), jump(850, 170), jump(940), jump(1180, 230), jump(1275), jump(1660), jump(2020),
  jump(2290), jump(2580), jump(2920), hold(3160, 1220), jump(4425),
  jump(4545), hold(5200, 410), hold(5750, 430), hold(6350, 360),
  jump(7015), jump(7375), jump(7760), hold(8710, 160), hold(9030, 150),
  hold(9730, 150), jump(10270), jump(10980), jump(11460), jump(11840),
  jump(12390), jump(12695), jump(12980), jump(13445), hold(13650, 420),
  jump(14250), jump(14785), jump(14900),
].sort((a, b) => a.x - b.x);
