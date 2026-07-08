import { level as baseLevel } from "./level.js?v=80";

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

function falling(extra = {}) {
  return {
    triggerDistance: 525,
    armDistance: 255,
    fallDistance: 180,
    activeAt: 0.3,
    warningColor: "#f59e0b",
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

function platform(sourceX, y, sourceW, h = 46, kind = "platform") {
  return { x: scaleX(sourceX), y, w: scaleW(sourceW), h, kind };
}

function trigger(sourceX, y, w, h, type, extra = {}) {
  return { x: scaleX(sourceX), y, w, h, type, ...extra };
}

function outsideSourceRange(item, from, to) {
  const left = item.x;
  const right = item.x + (item.w || 0);
  return right < scaleX(from) || left > scaleX(to);
}

function replaceOpeningCanopyClimb() {
  const from = -160;
  const to = 3050;
  for (const key of [
    "platforms",
    "hazards",
    "boosters",
    "downDots",
    "traps",
    "yellowZones",
    "trampolines",
    "speedZones",
    "orbs",
    "autoPads",
    "gravityRings",
    "movers",
  ]) {
    level[key] = level[key].filter((item) => outsideSourceRange(item, from, to));
  }
  level.routeBands = level.routeBands.filter((item) => outsideSourceRange(item, from, to));
  level.testActions = level.testActions.filter((item) => outsideSourceRange(item, from, to));
  level.world = {
    ...level.world,
    start: { x: baseLevel.world.start.x, y: 1086, mode: "cube", gravity: 1 },
  };

  level.platforms.push(
    platform(-160, 1120, 820),
    platform(560, 1120, 390),
    platform(840, 1048, 620),
    platform(1360, 980, 560),
    platform(1840, 1048, 500),
    platform(2260, 1120, 850),
  );
  level.hazards.push(
    floorSpike(250, 1086, 34, 34),
    ceilingSpike(610, 850, 92, 30),
    floorSpike(980, 1014, 30, 34, { popup: popup({ triggerDistance: 245 }) }),
    floorSpike(1460, 946, 64, 34),
    ceilingSpike(1685, 800, 112, 30),
    floorSpike(2075, 1014, 32, 34, { popup: popup({ triggerDistance: 235 }) }),
    floorSpike(2585, 1086, 42, 34),
    ceilingSpike(2810, 900, 92, 30),
  );
  level.orbs.push(
    trigger(1240, 895, 46, 46, "jumpOrb", { power: 610, color: "#22c55e" }),
    trigger(1985, 945, 46, 46, "jumpOrb", { power: 560, color: "#facc15" }),
  );
  level.speedZones.push(
    trigger(520, 1014, 90, 132, "fast", { speed: 450 }),
    trigger(2350, 1014, 90, 132, "fast", { speed: 472 }),
  );
  level.yellowZones.push({
    x: scaleX(3120),
    y: 760,
    w: scaleW(1320),
    h: 340,
    type: "yellowFlight",
    targetY: 805,
    minSpeed: 430,
  });
  level.movers.push(
    mover(1720, 835, 46, 54, "y", 54, 2.05, 0.7, "#16a34a"),
  );
  level.routeBands.push(
    routeBand(80, 900, 1288, 84, "diagonal", "#22c55e", { dy: -230, label: "canopy-opening-rise" }),
    routeBand(980, 880, 780, 330, "tunnel3d", "#84cc16", { vanishY: 650, label: "leaf-canopy-depth" }),
    routeBand(2100, 920, 1220, 80, "diagonal", "#f97316", { dy: 210, label: "root-opening-drop" }),
  );
  level.testActions.push(
    jump(230, 130),
    jump(720, 210),
    jump(950, 140),
    jump(1210, 190),
    jump(1450, 150),
    jump(1935, 190),
    jump(2050, 145),
    jump(2540, 170),
  );
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
  routeBand(8160, 1560, 330, 88, "horizontal", "#a855f7", { label: "ceiling-canopy-lane" }),
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
  if (i % 5 === 0) {
    jungleDecor.push(decor(x + 46, 180 + ((i * 97) % 760), "firefly", "#fde047", {
      phase: i * 0.41,
      scale: 0.7 + (i % 3) * 0.1,
      alpha: 0.62,
    }));
  }
  if (i % 7 === 2) {
    jungleDecor.push(decor(x + 22, 140 + ((i * 109) % 620), "leafMoth", i % 2 ? "#fb7185" : "#22d3ee", {
      phase: i * 0.36,
      scale: 0.54 + (i % 4) * 0.09,
      alpha: 0.54,
    }));
  }
  if (i % 11 === 4) {
    jungleDecor.push(decor(x + 58, 120 + ((i * 131) % 560), "canopySilhouette", "#065f46", {
      phase: i * 0.24,
      scale: 0.58 + (i % 3) * 0.08,
      alpha: 0.3,
    }));
  }
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
  floorSpike(4710, 1086, 26, 34, { popup: popup({ triggerDistance: 210 }) }),
  floorSpike(4840, 1086, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(4970, 904, 76, 28, { popup: popup({ hiddenOffset: 24, triggerDistance: 215 }) }),
  ceilingSpike(5230, 904, 112, 30),
  ceilingSpike(5750, 892, 96, 28),
  floorSpike(6040, 1132, 82, 38),
  ceilingSpike(6400, 902, 104, 28),
  floorSpike(6890, 896, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(7060, 896, 30, 34),
  ceilingSpike(7460, 750, 84, 26, { popup: popup({ hiddenOffset: 24, triggerDistance: 230 }) }),
  ceilingSpike(7810, 750, 78, 26),
  ceilingSpike(8745, 542, 54, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 260 }) }),
  floorSpike(9120, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(9510, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(9880, 866, 26, 34, { popup: popup({ triggerDistance: 215 }) }),
  floorSpike(10300, 866, 32, 34),
  ceilingSpike(10435, 690, 76, 22, { popup: popup({ hiddenOffset: 22, triggerDistance: 215 }) }),
  floorSpike(11025, 866, 30, 34, { popup: popup({ triggerDistance: 240 }) }),
  floorSpike(11495, 1086, 32, 34),
  floorSpike(11885, 866, 34, 34),
  floorSpike(12395, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(12540, 690, 88, 18, { popup: popup({ hiddenOffset: 18, triggerDistance: 225 }) }),
  floorSpike(13020, 866, 28, 34, { popup: popup({ triggerDistance: 230 }) }),
  floorSpike(13215, 946, 30, 34, { popup: popup({ triggerDistance: 215 }) }),
  floorSpike(13480, 946, 38, 34),
  ceilingSpike(13690, 690, 116, 16, { popup: popup({ hiddenOffset: 18, triggerDistance: 220 }) }),
  ceilingSpike(13980, 710, 82, 22, { popup: popup({ hiddenOffset: 22, triggerDistance: 215 }) }),
  ceilingSpike(14280, 760, 76, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 215 }) }),
  floorSpike(14440, 1086, 30, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(14620, 760, 86, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 220 }) }),
  floorSpike(14935, 1086, 30, 34, { popup: popup({ triggerDistance: 210 }) }),
];

level.hazards = [
  ...level.hazards,
  ...extraHazards,
];

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.y === 896 && hazard.x > scaleX(7420) && hazard.x < scaleX(7480))
);

level.hazards = level.hazards.map((hazard) => {
  if (hazard.dir === "down" && hazard.y === 900 && hazard.x > 2000 && hazard.x < 2110) {
    return { ...hazard, y: 852, h: 28 };
  }
  if (hazard.dir === "up" && hazard.y === 1086 && hazard.x > 1880 && hazard.x < 1945) {
    return { ...hazard, x: hazard.x + 92 };
  }
  if (hazard.dir === "up" && hazard.y === 1086 && hazard.x > 2520 && hazard.x < 2585) {
    return { ...hazard, x: hazard.x + 104 };
  }
  if (hazard.dir === "up" && hazard.y === 1086 && hazard.x > 3470 && hazard.x < 3540) {
    return { ...hazard, x: hazard.x + 112, popup: popup({ triggerDistance: 245 }) };
  }
  if (hazard.dir === "up" && hazard.y === 1086 && hazard.x > 4840 && hazard.x < 4910) {
    return { ...hazard, x: hazard.x + 124 };
  }
  if (hazard.dir === "up" && hazard.y === 1086 && hazard.x > 23240 && hazard.x < 23820) {
    return { ...hazard, x: hazard.x + 136, popup: popup({ triggerDistance: 250 }) };
  }
  if (hazard.dir === "up" && hazard.y === 866 && hazard.x > 26700 && hazard.x < 26790) {
    return { ...hazard, x: hazard.x + 118, popup: popup({ triggerDistance: 230 }) };
  }
  return hazard;
});

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.dir === "up" && hazard.y === 1086 && hazard.x > 23240 && hazard.x < 23620)
);

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.dir === "up" && hazard.y === 1086 && hazard.x > 4950 && hazard.x < 5060)
);

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.dir === "down" && hazard.y === 542 && hazard.x > 18200 && hazard.x < 18350)
);

level.movers = [
  ...level.movers,
  mover(11480, 920, 48, 56, "x", 82, 2.2, 0.9, "#22c55e"),
  mover(13760, 850, 48, 56, "x", 76, 2.35, 1.8, "#65a30d"),
];

level.movers = level.movers.filter((item) =>
  !(!item.color && item.x > 23530 && item.x < 23630 && item.y >= 900)
);

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

level.yellowZones = level.yellowZones.map((zone) =>
  Math.abs(zone.x - scaleX(3160)) < 4
    ? { ...zone, x: zone.x - 720, w: zone.w + 720, targetY: 805 }
    : zone
);

level.testActions = [
  ...level.testActions,
  jump(560), jump(790, 230), jump(830, 260), jump(915, 170), jump(1180, 230), jump(1275), jump(1660), jump(2020),
  jump(2290), jump(2580), jump(2920), hold(3090, 1310), jump(4425),
  jump(4545), hold(5200, 410), hold(5750, 430), hold(6350, 360),
  jump(7015), jump(7375), jump(7760), hold(8710, 160), hold(9030, 150),
  hold(9730, 150), jump(9870), jump(10270), jump(10980), jump(11460), jump(11840),
  jump(12390), jump(12695), jump(12855, 240), jump(12930, 190), jump(13200), jump(13445), hold(13650, 420),
  jump(14250), jump(14415), jump(14785), jump(14900), jump(14930),
].sort((a, b) => a.x - b.x);

replaceOpeningCanopyClimb();
level.hazards = level.hazards.filter((hazard) =>
  !(
    (hazard.y === 896 || hazard.y === 750)
    && hazard.x > scaleX(7780)
    && hazard.x < scaleX(7925)
  )
  && !(
    hazard.dir === "down"
    && hazard.y === 542
    && hazard.x > scaleX(9200)
    && hazard.x < scaleX(9900)
  )
  && !(
    hazard.y === 1006
    && hazard.x > scaleX(14780)
    && hazard.x < scaleX(14900)
  )
);
level.testActions.sort((a, b) => a.x - b.x);

function resetGameplayForUniqueJungleMap() {
  for (const key of [
    "platforms",
    "hazards",
    "boosters",
    "downDots",
    "traps",
    "yellowZones",
    "trampolines",
    "portals",
    "mouths",
    "movers",
    "speedZones",
    "orbs",
    "autoPads",
    "gravityRings",
    "miniZones",
    "routeBands",
    "testActions",
  ]) {
    level[key] = [];
  }
}

function buildCompleteJungleMap() {
  resetGameplayForUniqueJungleMap();
  level.world = {
    ...level.world,
    start: { x: baseLevel.world.start.x, y: 1156, mode: "cube", gravity: 1 },
  };
  level.mapDesign = {
    uniqueMap: true,
    source: "hand-authored-jungle-run-v1",
    note: "Full gameplay arrays are rebuilt here; level 3 is not a decorated copy of level 1.",
  };

  const segments = [
    [-160, 880, 1190],
    [690, 620, 1190],
    [1190, 760, 1118],
    [1860, 660, 1118],
    [2440, 760, 1190],
    [3120, 1120, 1190],
    [4180, 620, 1130],
    [4720, 840, 1130],
    [5480, 760, 1210],
    [6160, 760, 1210],
    [6800, 920, 1090],
    [7660, 820, 1090],
    [8420, 820, 1180],
    [9140, 760, 1180],
    [9820, 920, 1060],
    [10660, 760, 1060],
    [11340, 820, 1160],
    [12100, 700, 1160],
    [12740, 960, 1080],
    [13620, 860, 1080],
    [14380, 1180, 1190],
  ];
  for (const [x, w, y] of segments) {
    level.platforms.push(platform(x, y, w));
  }

  const floorHazards = [
    [320, 1190, 34, false], [640, 1190, 32, true], [820, 1190, 28, true], [980, 1190, 34, false],
    [1380, 1118, 32, true], [1720, 1118, 72, false], [2140, 1118, 30, true],
    [2720, 1190, 34, false], [3185, 1190, 34, true], [3580, 1190, 80, false],
    [4020, 1190, 32, true], [4520, 1130, 34, false], [5120, 1130, 34, true],
    [5750, 1210, 34, false], [6310, 1210, 74, false], [6660, 1210, 32, true],
    [6960, 1090, 28, true], [7100, 1090, 34, true], [7490, 1090, 32, false], [8130, 1090, 34, true],
    [8750, 1180, 34, false], [9340, 1180, 34, true], [10150, 1060, 32, false],
    [10570, 1060, 78, false], [11100, 1060, 30, true], [11680, 1160, 34, false],
    [12320, 1160, 34, true], [12980, 1080, 28, true], [13145, 1080, 32, false], [13450, 1080, 34, true],
    [13940, 1080, 74, false], [14720, 1190, 34, true],
  ];
  for (const [x, platformY, w, hidden] of floorHazards) {
    level.hazards.push(floorSpike(x, platformY - 34, w, 34, hidden ? { popup: popup({ triggerDistance: 235 }) } : {}));
    level.testActions.push(jump(x - 108, hidden ? 166 : 132));
  }

  const ceilingHazards = [
    [540, 930, 96], [1110, 900, 92], [2280, 870, 104],
    [3340, 790, 88], [4420, 875, 96], [5240, 870, 104],
    [6480, 955, 90], [7280, 815, 96], [7940, 805, 102],
    [9240, 940, 88], [10380, 790, 112], [11860, 910, 94],
    [13320, 840, 108], [14220, 845, 100],
  ];
  const fallingCeilingHazards = new Map([
    [540, { y: 1005, h: 30, warningColor: "#84cc16" }],
    [2280, { y: 960, h: 30, warningColor: "#f97316", triggerDistance: 545 }],
    [6480, { y: 1010, h: 30, warningColor: "#06b6d4", fallDistance: 195 }],
    [9240, { y: 1000, h: 30, warningColor: "#a855f7" }],
    [11860, { y: 976, h: 30, warningColor: "#38bdf8", triggerDistance: 545 }],
    [14220, { y: 1020, h: 30, warningColor: "#4ade80" }],
  ]);
  for (const [x, y, w] of ceilingHazards) {
    const fallingSpec = fallingCeilingHazards.get(x);
    if (fallingSpec) {
      const { y: fallY = y, h = 30, ...fallingOptions } = fallingSpec;
      level.hazards.push(ceilingSpike(x, fallY, w, h, {
        falling: falling(fallingOptions),
      }));
    } else {
      level.hazards.push(ceilingSpike(x, y, w, 30, x > 10000 ? { popup: popup({ hiddenOffset: 24, triggerDistance: 220 }) } : {}));
    }
  }

  const densityCeilings = [
    1550, 1930, 2500, 2930, 4700, 5495, 5937, 6123, 7715, 8340,
    8995, 9610, 9880, 10835, 11293, 11487, 12480, 13695, 14470, 14930,
  ];
  const fallingDensityCeilings = new Set([2500, 8995, 12480]);
  densityCeilings.forEach((x, index) => {
    const y = index % 3 === 0 ? 680 : index % 3 === 1 ? 730 : 775;
    const extra = fallingDensityCeilings.has(x)
      ? { falling: falling({ fallDistance: 150, triggerDistance: 500, armDistance: 238, warningColor: "#22c55e" }) }
      : {};
    level.hazards.push(ceilingSpike(x, y, index % 2 ? 60 : 74, 24, extra));
  });

  level.yellowZones.push({
    x: scaleX(3140),
    y: 780,
    w: scaleW(1260),
    h: 430,
    type: "yellowFlight",
    targetY: 870,
    minSpeed: 460,
  });
  level.hazards.push(
    ceilingSpike(3310, 720, 126, 34),
    ceilingSpike(3820, 720, 126, 34),
    floorSpike(3560, 1156, 90, 34, { scaleWidth: true }),
    floorSpike(4070, 1156, 90, 34, { scaleWidth: true }),
  );
  level.testActions.push(hold(3110, 1380));

  level.orbs.push(
    trigger(1260, 980, 46, 46, "jumpOrb", { power: 590, color: "#22c55e" }),
    trigger(7080, 945, 46, 46, "jumpOrb", { power: 610, color: "#facc15" }),
    trigger(12870, 930, 46, 46, "jumpOrb", { power: 570, color: "#84cc16" }),
  );
  level.speedZones.push(
    trigger(700, 1084, 90, 132, "fast", { speed: 470 }),
    trigger(4210, 1018, 90, 132, "fast", { speed: 488 }),
    trigger(6800, 980, 90, 132, "fast", { speed: 510 }),
    trigger(12640, 970, 90, 132, "fast", { speed: 526 }),
  );
  level.movers.push(
    mover(4880, 790, 50, 58, "y", 42, 2.25, 0.2, "#16a34a"),
    mover(8550, 780, 48, 56, "x", 78, 2.45, 1.1, "#65a30d"),
    mover(12080, 800, 52, 58, "y", 40, 2.5, 2.0, "#22c55e"),
  );
  level.testActions.push(jump(4780, 180), jump(8440, 180), jump(11980, 176));

  const bands = [
    [80, 1200, 1325, 84, "horizontal", "#22c55e", { label: "new-root-floor" }],
    [1200, 1120, 870, 320, "tunnel3d", "#84cc16", { vanishY: 700, label: "new-canopy-depth" }],
    [3080, 1400, 835, 350, "tunnel3d", "#facc15", { vanishY: 690, label: "new-vine-flight" }],
    [5400, 1480, 1280, 82, "horizontal", "#06b6d4", { label: "new-swamp-lowline" }],
    [6740, 1200, 940, 82, "diagonal", "#34d399", { dy: -220, label: "new-temple-lift" }],
    [9800, 1160, 760, 88, "horizontal", "#a855f7", { label: "new-high-canopy" }],
    [12680, 1200, 900, 330, "tunnel3d", "#f472b6", { vanishY: 745, label: "new-predator-depth" }],
    [14380, 1060, 1300, 80, "diagonal", "#4ade80", { dy: -120, label: "new-jungle-finish" }],
  ];
  for (const [x, w, y, h, kind, color, extra] of bands) {
    level.routeBands.push(routeBand(x, w, y, h, kind, color, extra));
  }

  level.testActions.push(
    jump(1060, 220), jump(1180, 220), jump(6680, 230), jump(9720, 220),
    jump(12600, 210), jump(12820, 280), jump(14320, 190),
  );
  level.portals.push(trigger(15120, 1010, 120, 200, "finish"));
  level.testActions.sort((a, b) => a.x - b.x);
}

buildCompleteJungleMap();
