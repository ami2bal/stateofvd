/**
 * Compatibility shim — DA v6 uses vector shapes (D-012).
 * All rendering goes through engine/shapes.js (Graphics, LINEAR AA).
 */
export {
  TILE,
  USHER_W,
  USHER_H,
  RAMPS,
  RESP_GOLD,
  hexToNum,
  applySmoothGlobal,
  applyNearestGlobal,
  makeBuildingSprite,
  tileTexture,
  makeUsherSprite,
  makeUsherTextures,
  makeDossierTexture,
  makeGoldHaloSprite,
  makeCometParticle,
  makeTexture,
  makeSprite,
  drawShadowTexture,
} from "./shapes.js";
