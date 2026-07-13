/**
 * Catalogue scénarios = source unique main (state-of-vd/game/flows).
 * Conversion pixel via from-main.js.
 */
export {
  pixelScenarioCatalog,
  getPixelScenario,
  toPixelSteps,
  SCENARIO_DEFS,
  SCENARIOS,
  scenariosByEntry,
  getScenarioDef,
} from "./from-main.js";

import { pixelScenarioCatalog } from "./from-main.js";

/** Alias historique pour tour.js */
export const PIXEL_SCENARIOS = pixelScenarioCatalog();
