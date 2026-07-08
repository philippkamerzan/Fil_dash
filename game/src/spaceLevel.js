import { level as baseLevel } from "./level.js?v=65";

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

const sectionSkins = [
  ["launch", "Launch", "#38bdf8"],
  ["meteor-rhythm", "Meteor rhythm", "#f43f5e"],
  ["airlock", "Airlock trap", "#fb7185"],
  ["solar-hold", "Solar hold", "#facc15"],
  ["warp-drop", "Warp drop", "#fb923c"],
  ["ship-gate", "Ship gate", "#22d3ee"],
  ["orbit-return", "Orbit return", "#34d399"],
  ["gravity-well", "Gravity well", "#f97316"],
  ["ceiling-orbit", "Ceiling orbit", "#a78bfa"],
  ["re-entry", "Re-entry", "#38bdf8"],
  ["ghost-dock", "Ghost dock", "#c084fc"],
  ["mini-comets", "Mini comets", "#f472b6"],
  ["nova-mix", "Nova mix", "#fde047"],
  ["space-finish", "Space finish", "#4ade80"],
];

level.sections = level.sections.map((section, index) => {
  const [id, name, accent] = sectionSkins[index] || sectionSkins.at(-1);
  return { ...section, id, name, accent };
});

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
