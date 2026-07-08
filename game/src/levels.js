import { level as level1 } from "./level.js?v=83";
import { level as level2 } from "./spaceLevel.js?v=13";
import { level as level3 } from "./jungleLevel.js?v=52";
import { level as level4 } from "./titanicLevel.js?v=62";

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
