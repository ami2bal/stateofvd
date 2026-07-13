/**
 * Screen-space label layer (TASK-092 + TASK-094 K9/K10).
 * Sole source of building/room labels — crisp, non-decreasing size on zoom-in.
 */
/* global PIXI */

function dpr() {
  if (typeof window === "undefined") return 2;
  return Math.max(2, Math.ceil(window.devicePixelRatio || 1));
}

/** Raccourcis ultra-courts si le libellé déborde encore de la salle. */
function shortenRoomLabel(txt) {
  const t = String(txt || "").trim();
  if (!t) return t;
  const map = {
    Plénum: "Plén.",
    Bureau: "Bur.",
    Collège: "Coll.",
    Guichet: "Guich.",
    "Commis.": "Com.",
    Commissions: "Com.",
    Chancellerie: "Chanc.",
    "Chanc.": "Ch.",
    Hémicycle: "Hémic.",
    "Pas perdus": "Pas p.",
    Commissions: "Commis.",
    Chancellerie: "Chanc.",
    Collège: "Collège",
    Bureau: "Bureau",
    Cabinet: "Cabinet",
    SGC: "SGC",
    EMPD: "EMPD",
    CSG: "CSG",
    FAO: "FAO",
    SG: "SG",
  };
  if (map[t]) return map[t];
  if (t.length <= 4) return t;
  return `${t.slice(0, 3)}…`;
}

/**
 * @param {object} opts
 * @param {PIXI.Application} opts.app
 * @param {import('./camera.js').Camera} opts.camera
 * @param {object} opts.scene
 */
export function installScreenLabels(opts) {
  const { app, camera, scene } = opts;
  const layer = new PIXI.Container();
  layer.zIndex = 1000;
  app.stage.addChild(layer);
  scene.__screenLabelLayer = layer;

  const entries = [];
  /** @type {string} last camera key for dirty skip (TASK-110) */
  let lastCamKey = "";
  let lastLodBand = "";
  let skipCount = 0;
  let updateCount = 0;

  function makeText(str, style) {
    const t = new PIXI.Text(str, {
      fontFamily: "Segoe UI, system-ui, sans-serif",
      fontSize: style.fontSize || 13,
      fontWeight: style.fontWeight || "700",
      fill: style.fill != null ? style.fill : 0xffffff,
      align: "center",
      wordWrap: false,
    });
    t.anchor.set(0.5, 0.5);
    t.resolution = dpr();
    t.roundPixels = false;
    return t;
  }

  for (const id of Object.keys(scene.siteViews || {})) {
    const entry = scene.siteViews[id];
    const v = entry.view;
    const def = entry.def;
    if (!v) continue;
    // K9: force-hide any residual world text
    if (v.__title) v.__title.visible = false;
    if (v.__titleMask) v.__titleMask.visible = false;
    for (const lab of v.__roomLabels || []) lab.visible = false;

    const short = v.__titleShort || def.acronym || def.displayName || id;
    const long = v.__titleLong || def.displayName || short;
    // K23: CE white like others
    const fill = v.__titleFill != null ? v.__titleFill : 0xffffff;
    const t = makeText(short, { fontSize: 15, fill });
    t.__siteId = id;
    t.__short = short;
    t.__long = long;
    t.__kind = "building";
    t.__headerFill = fill;
    layer.addChild(t);
    entries.push({
      siteId: id,
      text: t,
      kind: "building",
      view: v,
      def,
    });

    for (const lab of v.__roomLabels || []) {
      lab.visible = false;
      const full = lab.__full || lab.text || lab.__roomId || "";
      const abbr = lab.__abbr || lab.text || lab.__roomId || "";
      const rt = makeText(abbr, {
        fontSize: 13,
        fontWeight: "600",
        fill: 0x6b5e48,
      });
      rt.__siteId = id;
      rt.__roomId = lab.__roomId;
      rt.__kind = "room";
      rt.__full = full;
      rt.__abbr = abbr;
      rt.visible = false;
      layer.addChild(rt);
      entries.push({
        siteId: id,
        text: rt,
        kind: "room",
        view: v,
        roomLab: lab,
        def,
      });
    }
  }

  // hide interior world labels if present
  if (scene.interior?.state?.roomViews) {
    for (const cont of scene.interior.state.roomViews) {
      if (cont.__label) cont.__label.visible = false;
    }
  }

  /**
   * @param {{ force?: boolean }} [opts]
   * @returns {boolean} true if positions recomputed
   */
  function update(opts) {
    const scale = camera.scale;
    const fitS = camera.fitScale || 1;
    // long names at moderate zoom-in (overview = short; zoom = full)
    const useLong = scale >= Math.max(1.4, fitS * 1.18);
    // salles un peu plus tôt pour lisibilité
    const showRooms = scale >= 1.55;
    const lod = scene.__lod;
    const lodBand = `${useLong ? 1 : 0}|${showRooms ? 1 : 0}|${lod?.roomLabels ? 1 : 0}|${Math.round(scale * 20)}`;
    const camKey =
      typeof camera.camKey === "function"
        ? camera.camKey(1)
        : `${camera.x}|${camera.y}|${camera.scale}`;
    if (!opts?.force && camKey === lastCamKey && lodBand === lastLodBand) {
      skipCount++;
      return false;
    }
    lastCamKey = camKey;
    lastLodBand = lodBand;
    updateCount++;
    // K10: screen font NON-decreasing with zoom-in
    // Plus lisible : bâtiments 17→26 ; salles 14→21 (ratios zoom conservés)
    const zoomT = Math.max(0, Math.min(1, (scale / fitS - 1) / 2.0));
    const fsBuilding = Math.round(17 + zoomT * 9); // 17..26
    const fsRoom = Math.round(14 + zoomT * 7); // 14..21

    for (const e of entries) {
      const v = e.view;
      if (!v) continue;
      // keep world copies dead
      if (v.__title) v.__title.visible = false;
      for (const lab of v.__roomLabels || []) lab.visible = false;

      if (e.kind === "building") {
        const txt = useLong ? e.text.__long : e.text.__short;
        if (e.text.text !== txt) {
          e.text.text = txt;
          e.text.resolution = dpr();
        }
        e.text.style.fontSize = fsBuilding;
        e.text.style.fontWeight = "750";
        e.text.style.wordWrap = useLong;
        // K28: reserve icon slot so text never overlaps icon at zoom
        const iconSlot = v.__iconSlotW || 22;
        const textAreaW = Math.max(24, (v.__w || 40) - iconSlot - 6);
        const headerScreenW = Math.max(48, textAreaW * scale);
        e.text.style.wordWrapWidth = headerScreenW;
        e.text.style.align = "center";
        e.text.resolution = dpr();
        // center of text area (right of icon); K32: depts header at bottom
        const headerY = v.__headerY != null ? v.__headerY : 0;
        const wx = v.x + iconSlot + textAreaW / 2;
        const wy = v.y + headerY + (v.__headerH || 18) / 2;
        e.text.x = camera.x + wx * scale;
        e.text.y = camera.y + wy * scale;
        e.text.visible = true;
        e.text.scale.set(1);
        if (e.text.width > headerScreenW + 4 && headerScreenW > 20) {
          const r = headerScreenW / e.text.width;
          // floor plus haut : on préfère un léger overflow au trop petit
          e.text.scale.set(Math.max(0.9, Math.min(1, r)));
        }
      } else if (e.kind === "room") {
        e.text.visible = showRooms && (!!lod?.roomLabels || scale >= 1.55);
        if (!e.text.visible) continue;
        const lab = e.roomLab;
        const roomsY = v.__roomsLayer?.y || 0;
        // Carte = libellé court ; nom complet → fiche détail.
        const rect = lab.__roomRect;
        const roomScreenW = rect ? rect.w * scale : 40 * scale;
        const roomScreenH = rect ? rect.h * scale : 40 * scale;
        // Trop petite à l'écran → masquer (évite débordements vilains)
        if (roomScreenW < 26 || roomScreenH < 22) {
          e.text.visible = false;
          continue;
        }
        const full = e.text.__full || lab.__full || lab.text || "";
        const abbr = e.text.__abbr || lab.__abbr || full;
        // marge intérieure stricte (px écran)
        const maxW = Math.max(10, roomScreenW - 6);
        // taille police bornée par largeur salle (empêche SGC/EMPD/Hall de déborder)
        const fsFit = Math.max(
          9,
          Math.min(fsRoom, Math.floor(maxW / Math.max(2.2, abbr.length * 0.55)))
        );
        let txt = abbr;
        if (e.text.text !== txt) {
          e.text.text = txt;
          e.text.resolution = dpr();
        }
        e.text.style.wordWrap = false;
        e.text.style.fontWeight = "700";
        e.text.style.fontSize = fsFit;
        e.text.resolution = dpr();
        e.text.scale.set(1);
        // Si encore trop large : raccourcis progressifs puis scale down
        if (e.text.width > maxW) {
          const shorter = shortenRoomLabel(txt);
          if (shorter !== txt) {
            txt = shorter;
            e.text.text = txt;
            e.text.resolution = dpr();
          }
        }
        if (e.text.width > maxW) {
          e.text.scale.set(Math.max(0.55, maxW / e.text.width));
        }
        // Clamp final : jamais plus large que la salle
        if (e.text.width > maxW + 0.5) {
          e.text.scale.set((e.text.scale.x || 1) * (maxW / e.text.width));
        }

        // Titre SOUS l'icône (icône relevée) — clamp bas pour ne pas déborder
        const roomId = e.text.__roomId || lab.__roomId;
        const icon = roomId ? v.__roomIcons?.[roomId] : null;
        let wx;
        let wy;
        if (rect) {
          const rx0 = v.x + rect.x;
          const ry0 = v.y + roomsY + rect.y;
          const rx1 = rx0 + rect.w;
          const ry1 = ry0 + rect.h;
          if (icon && Number.isFinite(icon.x) && Number.isFinite(icon.y)) {
            const rw = rect.w;
            const rh = rect.h;
            const iconS = Math.max(16, Math.min(rw, rh) * 0.58);
            wx = v.x + icon.x;
            // juste sous l'icône (relevée ~0.42 rh)
            wy = v.y + roomsY + icon.y + iconS * 0.48 + 2;
          } else {
            wx = (rx0 + rx1) / 2;
            wy = ry0 + rect.h * 0.72;
          }
          // demi-hauteur texte (px écran → world) pour ne jamais sortir par le bas
          const halfHScr = Math.max(6, (e.text.height || fsFit) * 0.5);
          const m = 2;
          const maxWy = ry1 - halfHScr / scale - m / scale;
          const minWy = ry0 + halfHScr / scale + m / scale;
          wx = Math.min(rx1 - m, Math.max(rx0 + m, wx));
          wy = Math.min(maxWy, Math.max(minWy, wy));
        } else {
          wx = v.x + lab.x;
          wy = v.y + roomsY + lab.y + 4;
        }
        e.text.x = camera.x + wx * scale;
        e.text.y = camera.y + wy * scale;
      }
    }
    return true;
  }

  return {
    layer,
    entries,
    update,
    dpr: dpr(),
    /** TASK-110 frame stats */
    getStats() {
      return { skipCount, updateCount };
    },
    resetStats() {
      skipCount = 0;
      updateCount = 0;
    },
  };
}
