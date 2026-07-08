const { levels } = await import(`../game/src/levels.js?audit=${Date.now()}`);

const SOURCE_BUCKET = 250;
const Y_BUCKET = 44;
const REQUIRED_OVERALL_DIFF = 0.7;
const REQUIRED_SECTION_DIFF_RATIO = 0.7;

const gameplayKeys = [
  "platforms",
  "hazards",
  "yellowZones",
  "movers",
  "speedZones",
  "orbs",
  "portals",
];

const pairs = [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
];

const results = pairs.map(([leftNumber, rightNumber]) => {
  const left = byNumber(leftNumber);
  const right = byNumber(rightNumber);
  const overallDiff = diffRatio(fingerprint(left), fingerprint(right));
  const sectionDiffs = left.sections.map((section) =>
    diffRatio(fingerprint(left, section), fingerprint(right, section))
  );
  const sectionDiffRatio =
    sectionDiffs.filter((value) => value >= REQUIRED_OVERALL_DIFF).length / sectionDiffs.length;
  return {
    pair: `${leftNumber}-${rightNumber}`,
    overallDiff: round(overallDiff),
    sectionDiffRatio: round(sectionDiffRatio),
    ok: overallDiff >= REQUIRED_OVERALL_DIFF && sectionDiffRatio >= REQUIRED_SECTION_DIFF_RATIO,
  };
});

const metadata = levels
  .filter((level) => level.number > 1)
  .map((level) => ({
    level: level.number,
    uniqueMap: level.mapDesign?.uniqueMap === true,
    source: level.mapDesign?.source || null,
  }));

const ok = results.every((result) => result.ok)
  && metadata.every((item) => item.uniqueMap);

console.log(JSON.stringify({ ok, metadata, results }, null, 2));
if (!ok) process.exitCode = 1;

function byNumber(number) {
  const level = levels.find((item) => item.number === number);
  if (!level) throw new Error(`Missing level ${number}`);
  return level;
}

function fingerprint(level, section = null) {
  const set = new Set();
  for (const key of gameplayKeys) {
    for (const item of level[key] || []) {
      const centerSourceX = ((item.x || 0) + (item.w || 0) / 2) / level.scale;
      if (section) {
        const sectionLeft = section.x / level.scale;
        const sectionRight = (section.x + section.w) / level.scale;
        if (centerSourceX < sectionLeft || centerSourceX >= sectionRight) continue;
      }
      const sourceBucket = Math.floor(centerSourceX / SOURCE_BUCKET);
      const yBucket = Math.floor((item.y ?? item.top ?? item.gapY ?? 0) / Y_BUCKET);
      const hBucket = Math.floor((item.h ?? item.gapH ?? 0) / Y_BUCKET);
      const type = item.type || item.kind || item.dir || key;
      set.add(`${key}:${type}:x${sourceBucket}:y${yBucket}:h${hBucket}`);
    }
  }
  return set;
}

function diffRatio(left, right) {
  const union = new Set([...left, ...right]);
  if (!union.size) return 1;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return 1 - intersection / union.size;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
