/**
 * Continuous LOD for vector atelier (D-013).
 * Scale thresholds (not only integer): roofs → rooms → room labels.
 */

/**
 * @param {number} scale continuous zoom
 * @returns {{roofAlpha:number, roomLabels:boolean, buildingLabels:boolean, entityDetail:string, level:number, screenFontBuilding:number, screenFontRoom:number}}
 */
export function lodForScale(scale) {
  const s = Number(scale) || 1;
  // TASK-100 K7: plan d'architecte always shows rooms at contain overview.
  // level 1 was "roofs only" and hid rooms under opaque roofs → empty-looking plateau.
  // level 2: mid — rooms + soft roof
  // level 3: near — room labels
  let level = 2;
  let roofAlpha = 0.35;
  let roomLabels = false;
  let buildingLabels = true;
  let entityDetail = "normal";

  if (s < 1.85) {
    level = 2;
    // light roof so body + rooms stay painted at contain
    const t = Math.max(0, Math.min(1, (s - 0.9) / 0.95));
    roofAlpha = 0.55 - t * 0.35; // 0.55 → 0.20
    roomLabels = false;
    entityDetail = "normal";
  } else {
    level = 3;
    const t = Math.min(1, (s - 1.85) / 1.2);
    roofAlpha = Math.max(0.05, 0.2 * (1 - t));
    roomLabels = true;
    entityDetail = "full";
  }

  // Target screen-space font sizes (px) — auto-scaled via fontSize = screen / scale
  const screenFontBuilding = level === 1 ? 13 : level === 2 ? 12 : 11;
  const screenFontRoom = 10;

  return {
    roofAlpha,
    roomLabels,
    buildingLabels,
    entityDetail,
    level,
    screenFontBuilding,
    screenFontRoom,
    continuous: true,
  };
}

/** Compat discrete table for older QA that expects LOD_LEVELS[1|2|3] */
export const LOD_LEVELS = {
  1: lodForScale(1),
  2: lodForScale(1.5),
  3: lodForScale(2.5),
};

/**
 * @param {object} scene
 * @param {number} scale
 */
export function applyLod(scene, scale, opts) {
  opts = opts || {};
  const lod = lodForScale(scale);
  scene.__lod = lod;
  scene.__lodScale = scale;
  // keep fitScale for K9 title short/long threshold
  if (scene.camera?.fitScale != null) scene.__fitScale = scene.camera.fitScale;

  for (const id of Object.keys(scene.siteViews || {})) {
    const entry = scene.siteViews[id];
    const view = entry.view;
    if (!view) continue;

    // Continuous roof alpha on primary roof graphic
    if (view.__roof) {
      view.__roof.alpha = lod.roofAlpha;
      view.__roof.visible = lod.roofAlpha > 0.04;
    }
    // Hide discrete roof-by-lod layers if present (legacy)
    if (view.__roofByLod) {
      for (const k of Object.keys(view.__roofByLod)) {
        view.__roofByLod[k].visible = false;
      }
    }

    // Rooms plan — always on for plan d'architecte (level ≥ 2 always now)
    if (view.__roomsLayer) {
      view.__roomsLayer.visible = true;
      view.__roomsLayer.alpha = 1;
    }
    // Ensure shell never culled
    if (view.__body) {
      view.__body.visible = true;
      view.__body.alpha = 1;
    }
    if (view.__header) {
      view.__header.visible = true;
      view.__header.alpha = 1;
    }

    // TASK-094 K9: labels = screenLabels only; kill all world-space text
    if (view.__title) view.__title.visible = false;
    if (view.__roomLabels) {
      for (const lab of view.__roomLabels) lab.visible = false;
    }
  }

  if (scene.interior && typeof scene.interior.applyLod === "function") {
    scene.interior.applyLod(lod, scale);
  }

  for (const e of scene.entities?.list || []) {
    if (e.id && String(e.id).startsWith("stress-")) continue;
    const v = e.view;
    if (!v) continue;
    if (lod.entityDetail === "agg") {
      v.scale.set(0.55);
      if (e._dossier) e._dossier.visible = false;
    } else {
      v.scale.set(1);
      if (e._dossier) e._dossier.visible = true;
    }
  }

  // Zone labels layer
  if (scene.labels?.applyLodScale) {
    scene.labels.applyLodScale(scale, lod);
  }

  return lod;
}

export function tickLodFade() {
  /* no-op — continuous alpha set in applyLod */
}

export function lodSnapshot(scene) {
  const roofs = {};
  for (const id of Object.keys(scene.siteViews || {})) {
    const roof = scene.siteViews[id].view?.__roof;
    if (roof && roof.visible !== false) {
      roofs[id] = Number((roof.alpha != null ? roof.alpha : 1).toFixed(3));
    }
  }
  const lod = scene.__lod || lodForScale(scene.__lodScale || 1);
  let roomLabelsVisible = 0;
  let roomsTotal = 0;
  for (const id of Object.keys(scene.siteViews || {})) {
    const labs = scene.siteViews[id].view?.__roomLabels || [];
    for (const lab of labs) {
      roomsTotal++;
      if (lab.visible) roomLabelsVisible++;
    }
  }
  if (scene.interior?.getState) {
    const st = scene.interior.getState();
    for (const r of st.roomViews || []) {
      if (r.__isRoomLabelHost) {
        roomsTotal++;
        if (r.visible && r.__label?.visible) roomLabelsVisible++;
      }
    }
  }
  return {
    scale: scene.__lodScale || null,
    level: lod.level,
    roofAlphaTarget: lod.roofAlpha,
    roofs,
    meanRoofAlpha:
      Object.keys(roofs).length === 0
        ? null
        : Object.values(roofs).reduce((a, b) => a + b, 0) / Object.values(roofs).length,
    entityDetail: lod.entityDetail,
    roomLabels: lod.roomLabels,
    roomLabelsVisible,
    roomsTotal,
    entities: scene.entities?.count ?? 0,
    continuous: true,
    // for legacy allOk checks: mean roof near target
    ok:
      Object.keys(roofs).length === 0 ||
      Math.abs(
        Object.values(roofs).reduce((a, b) => a + b, 0) / Object.values(roofs).length -
          lod.roofAlpha
      ) <= 0.15,
  };
}
