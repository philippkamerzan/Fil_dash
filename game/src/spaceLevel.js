import { level as baseLevel } from "./level.js?v=80";

const clone = (value) => structuredClone(value);

function scaleX(x) {
  return Math.round(x * baseLevel.scale);
}

function scaleW(w) {
  return Math.max(1, Math.round(w * baseLevel.scale));
}

function floorSpike(sourceX, topY, w = 32, h = 34, extra = {}) {
  return {
    x: scaleX(sourceX),
    y: topY,
    w,
    h,
    dir: "up",
    kind: "spike",
    ...extra,
  };
}

function ceilingSpike(sourceX, topY, w = 44, h = 24, extra = {}) {
  return {
    x: scaleX(sourceX),
    y: topY,
    w,
    h,
    dir: "down",
    kind: "spike",
    ...extra,
  };
}

function popup(extra = {}) {
  return {
    triggerDistance: 330,
    extendDistance: 142,
    hiddenOffset: extra.hiddenOffset ?? 34,
    warningColor: extra.warningColor ?? "#7dd3fc",
    ...extra,
  };
}

function falling(extra = {}) {
  return {
    triggerDistance: 540,
    armDistance: 270,
    fallDistance: 190,
    activeAt: 0.3,
    warningColor: "#38bdf8",
    ...extra,
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

function platform(sourceX, y, sourceW, h = 46, kind = "platform") {
  return { x: scaleX(sourceX), y, w: scaleW(sourceW), h, kind };
}

function trigger(sourceX, y, w, h, type, extra = {}) {
  return { x: scaleX(sourceX), y, w, h, type, ...extra };
}

function applySectionLayout(layout) {
  level.sections = layout.map((spec, index) => {
    const x = scaleX(spec.x);
    const next = layout[index + 1];
    const end = next ? scaleX(next.x) : level.world.width;
    return {
      ...(level.sections[index] || {}),
      id: spec.id,
      name: spec.name,
      accent: spec.accent,
      x,
      w: Math.max(1, end - x),
      lane: spec.lane,
      ...(spec.extra || {}),
    };
  });
}

function outsideSourceRange(item, from, to) {
  const left = item.x;
  const right = item.x + (item.w || 0);
  return right < scaleX(from) || left > scaleX(to);
}

function replaceOpeningOrbitDeck() {
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
    start: { x: baseLevel.world.start.x, y: 1011, mode: "cube", gravity: 1 },
  };

  level.platforms.push(
    platform(-160, 1045, 760),
    platform(520, 1045, 520),
    platform(930, 980, 560),
    platform(1410, 980, 520),
    platform(1860, 1045, 520),
    platform(2310, 1120, 820),
  );
  level.hazards.push(
    floorSpike(330, 1011, 30, 34),
    ceilingSpike(660, 840, 88, 30),
    floorSpike(1160, 946, 30, 34, { popup: popup({ triggerDistance: 255 }) }),
    floorSpike(1510, 946, 62, 34),
    ceilingSpike(1745, 812, 112, 30),
    floorSpike(2135, 1011, 32, 34, { popup: popup({ triggerDistance: 250 }) }),
    floorSpike(2580, 1086, 44, 34),
    ceilingSpike(2800, 900, 92, 30),
  );
  level.orbs.push(
    trigger(1215, 830, 46, 46, "jumpOrb", { power: 620, color: "#38bdf8" }),
    trigger(1980, 910, 46, 46, "jumpOrb", { power: 585, color: "#fde047" }),
  );
  level.speedZones.push(
    trigger(560, 940, 92, 120, "fast", { speed: 448 }),
    trigger(2360, 1014, 92, 132, "fast", { speed: 460 }),
  );
  level.routeBands.push(
    routeBand(120, 820, 1190, 82, "diagonal", "#38bdf8", { dy: -210, label: "orbit-opening-rise" }),
    routeBand(930, 1010, 800, 290, "tunnel3d", "#f43f5e", { vanishY: 710, label: "meteor-opening-tunnel" }),
    routeBand(2100, 900, 1280, 80, "diagonal", "#facc15", { dy: 190, label: "re-entry-opening-drop" }),
  );
  level.testActions.push(
    { x: scaleX(285), w: 120, kind: "jump" },
    { x: scaleX(835), w: 170, kind: "jump" },
    { x: scaleX(1110), w: 190, kind: "jump" },
    { x: scaleX(1480), w: 150, kind: "jump" },
    { x: scaleX(1935), w: 190, kind: "jump" },
    { x: scaleX(2100), w: 150, kind: "jump" },
    { x: scaleX(2535), w: 170, kind: "jump" },
  );
}

export const level = clone(baseLevel);

level.id = "level-2";
level.number = 2;
level.slug = "space-3d";
level.title = "FIL Dash 2: Space Run";
level.shortTitle = "L2";
level.renderMode = "space3d";
level.theme = "space";
level.targetDurationSeconds = 82;
level.speedMultiplier = 1.12;
level.maxCubeSpeed = 548;
level.maxYellowSpeed = 578;
level.testLookAhead = 170;
level.testMoverLookAhead = 216;
level.world = {
  ...level.world,
  start: { x: baseLevel.world.start.x, y: baseLevel.world.start.y, mode: "cube", gravity: 1 },
};

const sectionLayout = [
  { id: "launch", name: "Launch", x: 0, lane: 1120, accent: "#38bdf8" },
  { id: "asteroid-hop", name: "Asteroid hop", x: 690, lane: 1048, accent: "#f43f5e" },
  { id: "meteor-steps", name: "Meteor steps", x: 1540, lane: 1048, accent: "#fb7185" },
  { id: "solar-drift", name: "Solar drift", x: 2920, lane: 860, accent: "#facc15" },
  { id: "airlock-drop", name: "Airlock drop", x: 4440, lane: 1060, accent: "#fb923c" },
  { id: "ship-flight", name: "Space Jet", x: 5060, lane: 1010, accent: "#22d3ee", extra: { spawnMode: "plane", planeStage: true } },
  { id: "orbit-return", name: "Orbit return", x: 6800, lane: 1040, accent: "#34d399" },
  { id: "gravity-well", name: "Gravity well", x: 7750, lane: 910, accent: "#f97316" },
  { id: "ceiling-orbit", name: "Ceiling orbit", x: 8420, lane: 520, accent: "#a78bfa" },
  { id: "station-drop", name: "Station drop", x: 9840, lane: 1120, accent: "#38bdf8" },
  { id: "ghost-dock", name: "Ghost dock", x: 11160, lane: 1120, accent: "#c084fc" },
  { id: "mini-comets", name: "Mini comets", x: 12180, lane: 1110, accent: "#f472b6" },
  { id: "nova-mix", name: "Nova mix", x: 13260, lane: 1110, accent: "#fde047" },
  { id: "space-finish", name: "Space finish", x: 14500, lane: 1120, accent: "#4ade80" },
];

const sectionSkins = sectionLayout.map((section) => [section.id, section.name, section.accent]);
applySectionLayout(sectionLayout);

level.hazards = [
  ...level.hazards,
  floorSpike(1340, 1086, 28, 34, { popup: popup({ triggerDistance: 320 }) }),
  floorSpike(1710, 1086, 30, 34, { popup: popup({ triggerDistance: 300 }) }),
  floorSpike(3025, 1086, 36, 34, { popup: popup({ triggerDistance: 290 }) }),
  floorSpike(7150, 896, 28, 34, { popup: popup({ triggerDistance: 260 }) }),
  floorSpike(7495, 896, 30, 34, { popup: popup({ triggerDistance: 260 }) }),
  ceilingSpike(8850, 542, 58, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 280 }) }),
  ceilingSpike(9425, 542, 56, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 260 }) }),
  floorSpike(11135, 866, 32, 34, { popup: popup({ triggerDistance: 260 }) }),
  floorSpike(12525, 876, 22, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 230 }) }),
  floorSpike(12735, 876, 24, 24, { popup: popup({ hiddenOffset: 24, triggerDistance: 230 }) }),
  floorSpike(13580, 946, 44, 34, { popup: popup({ triggerDistance: 250 }) }),
  floorSpike(14090, 946, 34, 34, { popup: popup({ triggerDistance: 245 }) }),
];
level.hazards = level.hazards.filter((hazard) =>
  !(Math.abs(hazard.x - scaleX(1048)) <= 1 && hazard.y === 1086 && hazard.w === 34)
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.x >= scaleX(1050) && hazard.x <= scaleX(2150) && hazard.y >= 1078)
);
level.hazards = level.hazards.filter((hazard) =>
  !(Math.abs(hazard.x - scaleX(2185)) <= 1 && hazard.y === 1086)
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.y === 1086 && hazard.x > 1880 && hazard.x < 1945)
  && !(hazard.y === 1086 && hazard.x > 2520 && hazard.x < 2585)
);
level.hazards = level.hazards.filter((hazard) =>
  !(
    (Math.abs(hazard.x - scaleX(7150)) <= 1 || Math.abs(hazard.x - scaleX(7495)) <= 1)
    && hazard.y === 896
  )
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.popup && hazard.x > scaleX(7800) && hazard.x < scaleX(7900) && hazard.y === 896)
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.popup && hazard.dir === "down" && hazard.x > scaleX(9200) && hazard.x < scaleX(9900))
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.popup && hazard.x > scaleX(12400) && hazard.x < scaleX(12850) && hazard.y === 876)
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.x > scaleX(13070) && hazard.x < scaleX(13110) && hazard.y === 866)
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.x > scaleX(13640) && hazard.x < scaleX(13940) && (hazard.popup || hazard.y === 946))
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.popup && hazard.x > scaleX(14000))
);
level.hazards = level.hazards.filter((hazard) =>
  !(hazard.x > scaleX(14880) && hazard.y === 1006)
);
level.hazards.push(
  floorSpike(1240, 1086, 30, 34),
  floorSpike(1565, 1086, 30, 34, { popup: popup({ triggerDistance: 285 }) }),
  floorSpike(1885, 1086, 32, 34),
  floorSpike(2110, 1086, 28, 34, { popup: popup({ triggerDistance: 270 }) }),
);

level.speedZones = [
  ...level.speedZones,
  { x: scaleX(1460), y: 1014, w: 92, h: 132, type: "fast", speed: 438 },
  { x: scaleX(7070), y: 824, w: 92, h: 132, type: "fast", speed: 456 },
  { x: scaleX(12490), y: 804, w: 92, h: 132, type: "fast", speed: 492 },
];
level.speedZones = level.speedZones.filter((zone) =>
  !(Math.abs(zone.x - scaleX(7070)) <= 1 && zone.y === 824)
  && !(Math.abs(zone.x - scaleX(12490)) <= 1 && zone.y === 804)
);

level.movers = [
  ...level.movers,
  { x: scaleX(7215), y: 828, w: 42, h: 48, axis: "y", amp: 58, speed: 2.25, phase: 2.2, kind: "movingHazard" },
  { x: scaleX(13040), y: 790, w: 38, h: 50, axis: "x", amp: 64, speed: 2.35, phase: 0.9, kind: "movingHazard" },
];
level.movers = level.movers.filter((mover) =>
  !(mover.x >= scaleX(5550) && mover.x <= scaleX(6550))
  && !(Math.abs(mover.x - scaleX(7215)) <= 1)
  && !(mover.x > scaleX(9400) && mover.x < scaleX(9700))
  && !(Math.abs(mover.x - scaleX(13040)) <= 1)
  && !(mover.x > scaleX(13680) && mover.x < scaleX(13820))
  && !(mover.x > scaleX(14050))
);

level.mouths = level.mouths.map((mouth) => ({
  ...mouth,
  gapY: mouth.gapY - 24,
  gapH: mouth.gapH + 96,
}));

level.routeBands = [
  ...level.routeBands,
  routeBand(180, 980, 1285, 88, "horizontal", "#38bdf8", { label: "space-launch-lower" }),
  routeBand(1050, 1380, 990, 310, "tunnel3d", "#f43f5e", { vanishY: 735, label: "meteor-depth-tunnel" }),
  routeBand(3120, 1190, 840, 360, "tunnel3d", "#facc15", { vanishY: 700, label: "solar-depth-tunnel" }),
  routeBand(6760, 980, 870, 82, "diagonal", "#34d399", { dy: -230, label: "orbit-diagonal-lift" }),
  routeBand(8500, 1230, 330, 88, "horizontal", "#a78bfa", { label: "ceiling-orbit-lane" }),
  routeBand(12180, 950, 900, 330, "tunnel3d", "#f472b6", { vanishY: 760, label: "mini-comet-tunnel" }),
  routeBand(13540, 840, 770, 76, "diagonal", "#fde047", { dy: 260, label: "nova-dive" }),
];

const spaceDecor = [];
for (let x = 120, i = 0; x < baseLevel.baseWidth; x += 92, i++) {
  const highY = 125 + ((i * 137) % 880);
  const lowY = 1060 + ((i * 79) % 360);
  const color = sectionSkins[i % sectionSkins.length][2];
  spaceDecor.push(
    decor(x, highY, i % 5 === 0 ? "ringPlanet" : i % 5 === 1 ? "star" : i % 5 === 2 ? "asteroid" : "comet", color, {
      phase: i * 0.41,
      scale: 0.44 + (i % 5) * 0.11,
    }),
    decor(x + 38, lowY, i % 3 === 0 ? "star" : "asteroid", color, {
      phase: i * 0.27,
      scale: 0.32 + (i % 4) * 0.08,
    }),
  );
}

level.decorations = [
  ...level.decorations,
  ...spaceDecor,
];

level.testActions = [
  ...level.testActions,
  { x: scaleX(1290), w: 150, kind: "jump" },
  { x: scaleX(1280), w: scaleW(240), kind: "jump" },
  { x: scaleX(1490), w: scaleW(170), kind: "jump" },
  { x: scaleX(1810), w: scaleW(170), kind: "jump" },
  { x: scaleX(2025), w: scaleW(150), kind: "jump" },
  { x: scaleX(1645), w: 160, kind: "jump" },
  { x: scaleX(2975), w: 130, kind: "jump" },
  { x: scaleX(3500), w: 170, kind: "jump" },
  { x: scaleX(7110), w: 190, kind: "jump" },
  { x: scaleX(7445), w: 170, kind: "jump" },
  { x: scaleX(8800), w: 190, kind: "hold" },
  { x: scaleX(9370), w: 170, kind: "hold" },
  { x: scaleX(11090), w: 150, kind: "jump" },
  { x: scaleX(12480), w: 170, kind: "jump" },
  { x: scaleX(12690), w: 170, kind: "jump" },
  { x: scaleX(13525), w: 170, kind: "jump" },
  { x: scaleX(14045), w: 170, kind: "jump" },
];

level.testActions = level.testActions
  .filter((action) => !(action.x >= scaleX(1080) && action.x <= scaleX(2220)))
  .concat(
    { x: scaleX(1164), w: 96, kind: "jump" },
    { x: scaleX(1488), w: 96, kind: "jump" },
    { x: scaleX(1808), w: 96, kind: "jump" },
    { x: scaleX(2032), w: 96, kind: "jump" },
  );

replaceOpeningOrbitDeck();
level.testActions.sort((a, b) => a.x - b.x);

function resetGameplayForUniqueSpaceMap() {
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

function runJump(sourceX, w = 136) {
  return { x: scaleX(sourceX), w, kind: "jump" };
}

function runHold(sourceX, sourceW) {
  return { x: scaleX(sourceX), w: scaleW(sourceW), kind: "hold" };
}

function addSpaceFlightSetpiece() {
  level.hazards = level.hazards.filter((item) => outsideSourceRange(item, 5060, 6740));
  level.movers = level.movers.filter((item) => outsideSourceRange(item, 5060, 6740));
  level.boosters = level.boosters.filter((item) => outsideSourceRange(item, 5060, 6740));
  level.portals = level.portals.filter((item) => item.type === "finish" || outsideSourceRange(item, 5060, 6740));

  level.boosters.push(trigger(4920, 820, 120, 380, "portalDown", {
    target: { x: scaleX(5140), y: 990, mode: "plane", gravity: 1 },
  }));
  level.portals.push(trigger(6620, 900, 116, 250, "planeOut", {
    target: { x: scaleX(6900), y: 1006, mode: "cube", gravity: 1 },
  }));
  level.hazards.push(
    ceilingSpike(5120, 812, scaleW(1540), 34, { color: "#dbeafe" }),
    floorSpike(5120, 1210, scaleW(1540), 38, { scaleWidth: true, color: "#dbeafe" }),
    ceilingSpike(5320, 870, 82, 28, { color: "#bfdbfe", falling: falling({ warningColor: "#38bdf8", fallDistance: 120, triggerDistance: 500 }) }),
    ceilingSpike(5480, 930, 110, 32, { color: "#bfdbfe", falling: falling({ warningColor: "#38bdf8", fallDistance: 160, triggerDistance: 530 }) }),
    ceilingSpike(5660, 872, 76, 26, { color: "#dbeafe" }),
    floorSpike(5980, 1142, 88, 36, { color: "#bfdbfe" }),
    ceilingSpike(6260, 948, 112, 30, { color: "#bfdbfe", falling: falling({ warningColor: "#60a5fa", fallDistance: 165, triggerDistance: 545 }) }),
  );
  level.mouths.push(
    { x: scaleX(5580), top: 820, bottom: 1205, gapY: 928, gapH: 212, color: "#38bdf8" },
    { x: scaleX(6220), top: 820, bottom: 1205, gapY: 948, gapH: 214, color: "#818cf8" },
  );
  level.movers.push(
    { x: scaleX(5830), y: 905, w: 48, h: 56, axis: "y", amp: 44, speed: 2.25, phase: 0.9, kind: "movingHazard", color: "#38bdf8" },
    { x: scaleX(6430), y: 1124, w: 42, h: 46, axis: "y", amp: 34, speed: 2.45, phase: 2.1, kind: "movingHazard", color: "#facc15" },
  );
  level.routeBands.push(
    routeBand(5040, 1660, 955, 210, "horizontal", "#38bdf8", { label: "ship-flight-corridor" }),
    routeBand(5350, 1150, 820, 360, "tunnel3d", "#818cf8", { vanishY: 720, label: "ship-flight-depth" }),
  );
}

function buildCompleteSpaceRunMap() {
  resetGameplayForUniqueSpaceMap();
  level.world = {
    ...level.world,
    start: { x: baseLevel.world.start.x, y: 1086, mode: "cube", gravity: 1 },
  };
  level.mapDesign = {
    uniqueMap: true,
    source: "hand-authored-space-run-v2",
    note: "Full gameplay arrays are rebuilt here; level 2 does not inherit the level 1 route.",
  };

  const segments = [
    [-160, 760, 1120],
    [560, 470, 1120],
    [920, 700, 1048],
    [1540, 500, 1048],
    [1960, 620, 1120],
    [2500, 620, 1120],
    [3040, 1320, 1120],
    [4260, 820, 1060],
    [5000, 760, 1060],
    [5680, 780, 1135],
    [6380, 720, 1135],
    [7040, 1120, 1040],
    [8100, 760, 1040],
    [8840, 760, 1120],
    [9500, 760, 1120],
    [10140, 1180, 1120],
    [11260, 620, 1120],
    [11860, 780, 1110],
    [12580, 660, 1110],
    [13200, 960, 1110],
    [14080, 760, 1110],
    [14760, 980, 1120],
  ];
  for (const [x, w, y] of segments) {
    level.platforms.push(platform(x, y, w));
  }

  const floorHazards = [
    [310, 1120, 32, false], [760, 1120, 30, true], [1220, 1048, 34, false],
    [1510, 1048, 68, false], [2140, 1120, 30, true], [2685, 1120, 42, false],
    [3330, 1120, 32, true], [3660, 1120, 32, false], [4130, 1120, 30, true],
    [4640, 1060, 34, false], [5360, 1060, 30, true], [5905, 1135, 36, false],
    [6280, 1135, 70, false], [6810, 1135, 30, true], [7205, 1040, 28, true], [7340, 1040, 32, true],
    [7725, 1040, 34, false], [8460, 1040, 30, true], [9150, 1120, 36, false],
    [9720, 1120, 32, true], [10460, 1120, 30, false], [10920, 1120, 68, false],
    [11640, 1120, 30, true], [12140, 1110, 34, false], [12760, 1110, 34, true],
    [13520, 1110, 34, false], [13840, 1110, 34, true], [14195, 1110, 30, true], [14360, 1110, 72, false],
    [15020, 1120, 32, true],
  ];
  for (const [x, platformY, w, hidden] of floorHazards) {
    level.hazards.push(floorSpike(x, platformY - 34, w, 34, hidden ? { popup: popup({ triggerDistance: 250 }) } : {}));
    level.testActions.push(runJump(x - 105, hidden ? 160 : 132));
  }

  const ceilingHazards = [
    [650, 890, 90], [1780, 895, 112], [2380, 910, 82],
    [3860, 880, 102], [4870, 875, 88], [6170, 905, 92],
    [7560, 860, 84], [8330, 785, 92], [9310, 932, 96],
    [10840, 750, 114], [12480, 930, 92], [13680, 805, 108],
    [14520, 930, 94],
  ];
  const fallingCeilingHazards = new Map([
    [650, { y: 968, h: 30, warningColor: "#38bdf8" }],
    [2380, { y: 960, h: 30, warningColor: "#f43f5e", triggerDistance: 520 }],
    [8330, { y: 880, h: 34, warningColor: "#38bdf8", triggerDistance: 565, fallDistance: 205 }],
    [10840, { y: 900, h: 30, warningColor: "#a78bfa" }],
    [13680, { y: 940, h: 30, warningColor: "#fde047", triggerDistance: 560 }],
  ]);
  for (const [x, y, w] of ceilingHazards) {
    const fallingSpec = fallingCeilingHazards.get(x);
    if (fallingSpec) {
      const { y: fallY = y, h = 30, ...fallingOptions } = fallingSpec;
      level.hazards.push(ceilingSpike(x, fallY, w, h, {
        falling: falling(fallingOptions),
      }));
      continue;
    }
    level.hazards.push(ceilingSpike(x, y, w, 28, x > 10000 ? { popup: popup({ hiddenOffset: 24, triggerDistance: 230 }) } : {}));
  }

  const densityCeilings = [
    957, 1960, 2533, 2862, 5115, 5742, 6545, 7927, 8128, 8935,
    9515, 9967, 10213, 10650, 11160, 11400, 11790, 12310, 12950, 14100, 14770,
  ];
  const fallingDensityCeilings = new Set([1960, 2533, 5742, 7927, 9515, 12950, 14770]);
  densityCeilings.forEach((x, index) => {
    const y = index % 3 === 0 ? 805 : index % 3 === 1 ? 850 : 890;
    const extra = fallingDensityCeilings.has(x)
      ? { falling: falling({ fallDistance: 170, triggerDistance: 500, armDistance: 240, warningColor: "#60a5fa" }) }
      : {};
    level.hazards.push(ceilingSpike(x, y, index % 2 ? 58 : 72, 24, extra));
  });

  level.yellowZones.push({
    x: scaleX(3040),
    y: 735,
    w: scaleW(1360),
    h: 430,
    type: "yellowFlight",
    targetY: 835,
    minSpeed: 456,
  });
  level.hazards.push(
    ceilingSpike(3200, 760, 118, 34),
    ceilingSpike(3620, 760, 118, 34),
    floorSpike(3460, 1086, 86, 34, { scaleWidth: true }),
    floorSpike(3980, 1086, 86, 34, { scaleWidth: true }),
  );
  level.testActions.push(runHold(3020, 1420));

  level.orbs.push(
    trigger(1155, 925, 46, 46, "jumpOrb", { power: 600, color: "#38bdf8" }),
    trigger(7340, 900, 46, 46, "jumpOrb", { power: 570, color: "#facc15" }),
    trigger(13290, 910, 46, 46, "jumpOrb", { power: 585, color: "#f472b6" }),
  );
  level.speedZones.push(
    trigger(540, 1014, 92, 132, "fast", { speed: 462 }),
    trigger(4380, 948, 92, 132, "fast", { speed: 482 }),
    trigger(7060, 928, 92, 132, "fast", { speed: 500 }),
    trigger(13140, 936, 92, 132, "fast", { speed: 520 }),
  );
  level.movers.push(
    { x: scaleX(5580), y: 760, w: 44, h: 52, axis: "y", amp: 42, speed: 2.2, phase: 0.4, kind: "movingHazard", color: "#38bdf8" },
    { x: scaleX(8720), y: 750, w: 46, h: 54, axis: "x", amp: 76, speed: 2.35, phase: 1.2, kind: "movingHazard", color: "#f43f5e" },
    { x: scaleX(11940), y: 740, w: 42, h: 50, axis: "y", amp: 38, speed: 2.5, phase: 2.1, kind: "movingHazard", color: "#facc15" },
  );
  level.testActions.push(runJump(5500, 170), runJump(8620, 180), runJump(11840, 170));
  addSpaceFlightSetpiece();

  const bands = [
    [80, 950, 1255, 86, "diagonal", "#38bdf8", { dy: -210, label: "new-orbit-takeoff" }],
    [1040, 1000, 840, 310, "tunnel3d", "#f43f5e", { vanishY: 650, label: "new-meteor-canopy" }],
    [3000, 1440, 790, 370, "tunnel3d", "#facc15", { vanishY: 690, label: "new-solar-flight" }],
    [5120, 1440, 1208, 78, "horizontal", "#fb923c", { label: "new-lower-airlock" }],
    [6900, 1260, 890, 84, "diagonal", "#34d399", { dy: -185, label: "new-orbit-lift" }],
    [10000, 1320, 700, 92, "horizontal", "#a78bfa", { label: "new-high-station" }],
    [12900, 1200, 870, 330, "tunnel3d", "#f472b6", { vanishY: 740, label: "new-nova-depth" }],
    [14320, 980, 1242, 82, "diagonal", "#4ade80", { dy: 160, label: "new-dock-drop" }],
  ];
  for (const [x, w, y, h, kind, color, extra] of bands) {
    level.routeBands.push(routeBand(x, w, y, h, kind, color, extra));
  }

  level.testActions.push(
    runJump(720, 210), runJump(860, 210), runJump(1900, 170), runJump(6900, 210),
    runJump(9900, 210), runJump(12940, 190), runJump(14680, 180),
  );
  level.portals.push(trigger(15105, 940, 120, 190, "finish"));
  level.testActions.sort((a, b) => a.x - b.x);
}

buildCompleteSpaceRunMap();

function addDenseOrbitCircles() {
  const extraRings = [];
  const palette = ["#38bdf8", "#60a5fa", "#818cf8", "#22d3ee", "#facc15", "#34d399"];
  for (let x = 190, i = 0; x < baseLevel.baseWidth - 120; x += 245, i++) {
    const color = palette[i % palette.length];
    extraRings.push(decor(x, 160 + ((i * 173) % 790), "ringPlanet", color, {
      phase: i * 0.33,
      scale: 0.68 + (i % 4) * 0.12,
      alpha: 0.48 + (i % 3) * 0.08,
    }));
  }
  for (let x = 330, i = 0; x < baseLevel.baseWidth - 160; x += 360, i++) {
    const color = palette[(i + 2) % palette.length];
    extraRings.push(decor(x, 915 + ((i * 97) % 260), "ringPlanet", color, {
      phase: i * 0.47,
      scale: 0.5 + (i % 3) * 0.1,
      alpha: 0.38 + (i % 2) * 0.08,
    }));
  }
  level.decorations.push(...extraRings);
}

addDenseOrbitCircles();
