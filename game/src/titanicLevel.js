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
    color: "#dbeafe",
    ...extra,
  };
}

function ceilingSpike(sourceX, topY, w = 52, h = 28, extra = {}) {
  return {
    x: scaleX(sourceX),
    y: topY,
    w,
    h,
    dir: "down",
    kind: "spike",
    color: "#dbeafe",
    ...extra,
  };
}

function popup(extra = {}) {
  return {
    triggerDistance: 284,
    extendDistance: 132,
    hiddenOffset: extra.hiddenOffset ?? 34,
    warningColor: extra.warningColor ?? "#fb7185",
    ...extra,
  };
}

function mover(sourceX, y, w, h, axis, amp, speed, phase, color = "#64748b") {
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

function jump(sourceX, w = 128) {
  return { x: scaleX(sourceX), w, kind: "jump" };
}

function hold(sourceX, sourceW) {
  return { x: scaleX(sourceX), w: scaleW(sourceW), kind: "hold" };
}

export const level = clone(baseLevel);

level.id = "level-4";
level.number = 4;
level.slug = "titanic-run";
level.title = "FIL Dash 4: Титаник";
level.shortTitle = "L4";
level.renderMode = "canvas";
level.theme = "titanic";
level.targetDurationSeconds = 90;
level.speedMultiplier = 1.14;
level.maxCubeSpeed = 570;
level.maxYellowSpeed = 592;
level.testLookAhead = 148;
level.testMoverLookAhead = 218;
level.world = {
  ...level.world,
  start: { x: baseLevel.world.start.x, y: baseLevel.world.start.y, mode: "cube", gravity: 1 },
};

const sectionSkins = [
  ["upper-deck", "Upper Deck", "#38bdf8"],
  ["ice-warning", "Ice Warning", "#67e8f9"],
  ["bulkhead-trap", "Bulkhead Trap", "#fb7185"],
  ["searchlight-hold", "Searchlight Hold", "#facc15"],
  ["water-drop", "Water Drop", "#60a5fa"],
  ["boiler-flight", "Boiler Flight", "#f97316"],
  ["deck-return", "Deck Return", "#22d3ee"],
  ["tilt-flip", "Tilt Flip", "#f59e0b"],
  ["ceiling-pipes", "Ceiling Pipes", "#a78bfa"],
  ["flooded-hall", "Flooded Hall", "#38bdf8"],
  ["lifeboat-rails", "Lifeboat Rails", "#c084fc"],
  ["mini-ice", "Mini Ice", "#f472b6"],
  ["iceberg-mix", "Iceberg Mix", "#fde047"],
  ["final-iceberg", "Final Iceberg", "#7dd3fc"],
];

level.sections = level.sections.map((section, index) => {
  const [id, name, accent] = sectionSkins[index] || sectionSkins.at(-1);
  return { ...section, id, name, accent };
});

level.routeBands = [
  routeBand(100, 1080, 1288, 88, "horizontal", "#38bdf8", { label: "upper-deck-run" }),
  routeBand(1050, 1280, 1340, 78, "diagonal", "#67e8f9", { dy: -240, label: "ice-tilt-sweep" }),
  routeBand(2320, 126, 955, 360, "vertical", "#fb7185", { dir: "down", scaleWidth: false, label: "bulkhead-drop" }),
  routeBand(3140, 1200, 835, 350, "tunnel3d", "#facc15", { vanishY: 690, label: "searchlight-depth" }),
  routeBand(5060, 1480, 1004, 112, "horizontal", "#f97316", { label: "boiler-steam-lane" }),
  routeBand(6750, 1050, 870, 82, "diagonal", "#22d3ee", { dy: -250, label: "deck-tilt-lift" }),
  routeBand(8500, 1260, 325, 88, "horizontal", "#a78bfa", { label: "pipe-ceiling-lane" }),
  routeBand(10580, 150, 650, 540, "vertical", "#38bdf8", { dir: "down", scaleWidth: false, label: "flooded-drop" }),
  routeBand(12180, 940, 900, 330, "tunnel3d", "#f472b6", { vanishY: 740, label: "mini-ice-depth" }),
  routeBand(13280, 1120, 940, 80, "diagonal", "#fde047", { dy: -310, label: "iceberg-climb" }),
  routeBand(14060, 500, 810, 78, "diagonal", "#7dd3fc", { dy: 190, label: "lifeboat-dive" }),
];

const titanicDecor = [];
for (let x = 70, i = 0; x < baseLevel.baseWidth; x += 72, i++) {
  const accent = sectionSkins[i % sectionSkins.length][2];
  const upperY = 120 + ((i * 73) % 520);
  const lowerY = 1040 + ((i * 91) % 390);
  titanicDecor.push(
    decor(x, upperY, i % 5 === 0 ? "porthole" : i % 5 === 1 ? "steam" : i % 5 === 2 ? "rope" : i % 5 === 3 ? "iceShard" : "wave", accent, {
      phase: i * 0.28,
      scale: 0.5 + (i % 5) * 0.1,
    }),
    decor(x + 36, lowerY, i % 4 === 0 ? "wave" : i % 4 === 1 ? "porthole" : i % 4 === 2 ? "rope" : "iceShard", i % 2 ? "#fbbf24" : "#38bdf8", {
      phase: i * 0.37,
      scale: 0.42 + (i % 4) * 0.1,
    }),
  );
}

level.decorations = titanicDecor;

const extraHazards = [
  ceilingSpike(520, 892, 84, 28),
  floorSpike(1015, 1086, 30, 34, { popup: popup({ triggerDistance: 250 }) }),
  ceilingSpike(1420, 884, 90, 30),
  floorSpike(1880, 1086, 30, 34),
  ceilingSpike(2020, 890, 94, 30),
  ceilingSpike(2325, 902, 78, 28),
  floorSpike(2840, 1086, 30, 34),
  floorSpike(3030, 1086, 30, 34, { popup: popup({ triggerDistance: 235 }) }),
  ceilingSpike(3200, 760, 110, 34),
  floorSpike(3440, 1066, 76, 54, { scaleWidth: true }),
  ceilingSpike(3700, 760, 98, 34),
  floorSpike(3995, 1066, 84, 54, { scaleWidth: true }),
  floorSpike(4425, 1086, 28, 34),
  floorSpike(4575, 1086, 30, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(5200, 904, 104, 30),
  ceilingSpike(5785, 900, 106, 30),
  ceilingSpike(6420, 900, 100, 30),
  floorSpike(7045, 896, 30, 34),
  ceilingSpike(7600, 748, 84, 26),
  floorSpike(7875, 896, 30, 34),
  ceilingSpike(8725, 542, 56, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 250 }) }),
  floorSpike(10290, 866, 30, 34),
  floorSpike(10980, 866, 28, 34, { popup: popup({ triggerDistance: 232 }) }),
  floorSpike(11280, 1086, 34, 34),
  floorSpike(11580, 1086, 32, 34, { popup: popup({ triggerDistance: 230 }) }),
  floorSpike(11885, 866, 34, 34),
  floorSpike(12815, 876, 24, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 220 }) }),
  floorSpike(13030, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(13420, 946, 36, 34),
  floorSpike(13595, 946, 34, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(13720, 690, 122, 16, { popup: popup({ hiddenOffset: 18, triggerDistance: 210 }) }),
];

level.hazards = [
  ...level.hazards,
  ...extraHazards,
];

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.y === 896 && hazard.x > scaleX(7420) && hazard.x < scaleX(7480))
);

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.y === 1086 && hazard.x > scaleX(1540) && hazard.x < scaleX(1585))
);

level.movers = [
  ...level.movers,
  mover(9580, 730, 56, 60, "x", 88, 2.2, 0.7, "#94a3b8"),
  mover(11430, 920, 52, 62, "x", 92, 2.45, 1.4, "#38bdf8"),
  mover(13780, 850, 50, 58, "x", 86, 2.55, 0.9, "#7dd3fc"),
  mover(14370, 1088, 58, 62, "y", 48, 2.35, 2.2, "#fbbf24"),
];

level.mouths = [
  ...level.mouths,
  { x: scaleX(13940), top: 710, bottom: 1050, gapY: 835, gapH: 132, color: "#94a3b8" },
];

level.speedZones = [
  ...level.speedZones,
  { x: scaleX(500), y: 1014, w: 90, h: 132, type: "fast", speed: 454 },
  { x: scaleX(2060), y: 1014, w: 90, h: 132, type: "fast", speed: 468 },
  { x: scaleX(7200), y: 824, w: 92, h: 132, type: "fast", speed: 490 },
  { x: scaleX(13380), y: 804, w: 92, h: 132, type: "fast", speed: 520 },
  { x: scaleX(14550), y: 930, w: 92, h: 132, type: "fast", speed: 525 },
];

level.testActions = [
  ...level.testActions,
  jump(700), jump(850, 170), jump(980), jump(1180, 230), jump(1220), jump(1390),
  jump(1545), jump(1840), jump(1990), jump(2110), jump(2290), jump(2520),
  jump(2810), jump(2990), hold(3160, 1240), jump(4400), jump(4540),
  hold(5180, 420), hold(5540, 360), hold(5780, 360), hold(6100, 460),
  jump(7000), jump(7240), jump(7560), jump(7830), hold(8690, 160),
  hold(9040, 160), hold(9380, 160), hold(9780, 150), jump(10255),
  jump(10945), jump(11240), jump(11535), jump(11840), jump(12340),
  jump(12570), jump(12780), jump(12990), jump(13390), jump(13555),
  hold(13690, 450), jump(14200), jump(14545), jump(14760), jump(14980),
].sort((a, b) => a.x - b.x);
