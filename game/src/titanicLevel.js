import { level as baseLevel } from "./level.js?v=65";

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

function replaceOpeningTiltedDeck() {
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
    start: { x: baseLevel.world.start.x, y: 1126, mode: "cube", gravity: 1 },
  };

  level.platforms.push(
    platform(-160, 1160, 780),
    platform(560, 1160, 430),
    platform(900, 1100, 560),
    platform(1380, 1100, 470),
    platform(1760, 1100, 520),
    platform(2220, 1120, 900),
  );
  level.hazards.push(
    floorSpike(285, 1126, 32, 34),
    ceilingSpike(590, 900, 86, 28),
    floorSpike(1080, 1066, 30, 34, { popup: popup({ triggerDistance: 245 }) }),
    floorSpike(1510, 1066, 58, 34),
    ceilingSpike(1665, 840, 106, 30),
    floorSpike(1990, 1066, 32, 34, { popup: popup({ triggerDistance: 235 }) }),
    floorSpike(2570, 1086, 42, 34),
    ceilingSpike(2815, 900, 92, 30),
  );
  level.orbs.push(
    trigger(1225, 955, 46, 46, "jumpOrb", { power: 590, color: "#7dd3fc" }),
    trigger(1920, 900, 46, 46, "jumpOrb", { power: 555, color: "#fbbf24" }),
  );
  level.speedZones.push(
    trigger(500, 1054, 90, 132, "fast", { speed: 456 }),
    trigger(2300, 1014, 90, 132, "fast", { speed: 480 }),
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
    mover(1680, 900, 50, 56, "y", 48, 2.2, 0.4, "#38bdf8"),
  );
  level.routeBands.push(
    routeBand(80, 880, 1328, 86, "diagonal", "#38bdf8", { dy: -190, label: "deck-opening-lift" }),
    routeBand(1040, 900, 835, 320, "tunnel3d", "#facc15", { vanishY: 690, label: "searchlight-opening-depth" }),
    routeBand(2080, 960, 1215, 80, "diagonal", "#60a5fa", { dy: 230, label: "deck-opening-drop" }),
  );
  level.testActions.push(
    jump(245, 130),
    jump(760, 210),
    jump(1060, 140),
    jump(1190, 190),
    jump(1495, 150),
    jump(1880, 190),
    jump(1970, 140),
    jump(2530, 170),
  );
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
  routeBand(8160, 1600, 325, 88, "horizontal", "#a78bfa", { label: "pipe-ceiling-lane" }),
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
  ceilingSpike(1580, 884, 74, 28, { popup: popup({ hiddenOffset: 24, triggerDistance: 215 }) }),
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
  floorSpike(4715, 1086, 26, 34, { popup: popup({ triggerDistance: 210 }) }),
  floorSpike(4850, 1086, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(4980, 904, 76, 28, { popup: popup({ hiddenOffset: 24, triggerDistance: 215 }) }),
  ceilingSpike(5200, 904, 104, 30),
  ceilingSpike(5785, 900, 106, 30),
  ceilingSpike(6420, 900, 100, 30),
  floorSpike(6890, 896, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(7045, 896, 30, 34),
  ceilingSpike(7445, 748, 88, 26, { popup: popup({ hiddenOffset: 24, triggerDistance: 225 }) }),
  ceilingSpike(7600, 748, 84, 26),
  floorSpike(7875, 896, 30, 34),
  ceilingSpike(8725, 542, 56, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 250 }) }),
  floorSpike(9120, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(9510, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(9880, 866, 26, 34, { popup: popup({ triggerDistance: 215 }) }),
  floorSpike(10290, 866, 30, 34),
  ceilingSpike(10435, 690, 76, 22, { popup: popup({ hiddenOffset: 22, triggerDistance: 215 }) }),
  floorSpike(10980, 866, 28, 34, { popup: popup({ triggerDistance: 232 }) }),
  floorSpike(11280, 1086, 34, 34),
  floorSpike(11580, 1086, 32, 34, { popup: popup({ triggerDistance: 230 }) }),
  floorSpike(11885, 866, 34, 34),
  floorSpike(12345, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(12710, 690, 92, 18, { popup: popup({ hiddenOffset: 18, triggerDistance: 220 }) }),
  floorSpike(12815, 876, 24, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 220 }) }),
  floorSpike(13030, 866, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  floorSpike(13205, 946, 30, 34, { popup: popup({ triggerDistance: 215 }) }),
  floorSpike(13420, 946, 36, 34),
  floorSpike(13595, 946, 34, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(13720, 690, 122, 16, { popup: popup({ hiddenOffset: 18, triggerDistance: 210 }) }),
  floorSpike(14170, 1086, 28, 34, { popup: popup({ triggerDistance: 220 }) }),
  ceilingSpike(14610, 760, 86, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 220 }) }),
  floorSpike(14935, 1086, 30, 34, { popup: popup({ triggerDistance: 210 }) }),
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

level.hazards = level.hazards.filter((hazard) =>
  !(hazard.dir === "up" && hazard.y === 1086 && hazard.x > 24120 && hazard.x < 24190)
);

level.movers = [
  ...level.movers,
  mover(9580, 730, 56, 60, "x", 88, 2.2, 0.7, "#94a3b8"),
  mover(11430, 920, 52, 62, "x", 92, 2.45, 1.4, "#38bdf8"),
  mover(13780, 850, 50, 58, "x", 86, 2.55, 0.9, "#7dd3fc"),
  mover(14370, 1088, 58, 62, "y", 48, 2.35, 2.2, "#fbbf24"),
];

level.movers = level.movers.filter((item) =>
  !(!item.color && item.x > 23530 && item.x < 23630 && item.y >= 900)
);

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

level.yellowZones = level.yellowZones.map((zone) =>
  Math.abs(zone.x - scaleX(3160)) < 4
    ? { ...zone, x: zone.x - 720, w: zone.w + 720, targetY: 805 }
    : zone
);

level.testActions = [
  ...level.testActions,
  jump(700), jump(790, 230), jump(830, 260), jump(940, 180), jump(1180, 230), jump(1220), jump(1390),
  jump(1545), jump(1840), jump(1990), jump(2110), jump(2290), jump(2520),
  jump(2810), jump(2990), hold(3160, 1240), jump(4400), jump(4540), jump(4700),
  hold(5180, 420), hold(5540, 360), hold(5780, 360), hold(6100, 460),
  jump(7000), jump(7240), jump(7560), jump(7830), hold(8690, 160),
  hold(9040, 160), hold(9380, 160), hold(9780, 150), jump(9870), jump(10255),
  jump(10945), jump(11160, 260), jump(11225, 240), jump(11535), jump(11840), jump(12340),
  jump(12570), jump(12780), jump(12885), jump(12990), jump(13190), jump(13390), jump(13555),
  hold(13690, 450), jump(14140), jump(14200), jump(14545), jump(14760), jump(14925), jump(14980),
].sort((a, b) => a.x - b.x);

replaceOpeningTiltedDeck();
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
