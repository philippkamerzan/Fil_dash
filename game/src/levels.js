import { level as level1 } from "./level.js?v=74";
import { level as level2 } from "./spaceLevel.js?v=3";
import { level as level3 } from "./jungleLevel.js?v=41";
import { level as level4 } from "./titanicLevel.js?v=50";

export const levels = [
  level1,
  level2,
  level3,
  level4,
];

export const DEFAULT_LEVEL_ID = level1.id;

export function getLevelById(value) {
  const requested = String(value || DEFAULT_LEVEL_ID).trim().toLowerCase();
  return levels.find((item) =>
    item.id === requested
    || item.slug === requested
    || String(item.number) === requested
  ) || level1;
}
