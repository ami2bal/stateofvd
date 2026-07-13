/**
 * Pastilles n° d'étapes (screen-space HD) — source unique walkthrough + scenario-preview.
 * Plages successives « 4-7 », position au-dessus de l'icône de salle.
 */
/* global PIXI */
import { metaForStep } from "./walkthrough-meta.js";

export function badgeTextRes() {
  if (typeof window === "undefined") return 3;
  return Math.max(2, Math.ceil((window.devicePixelRatio || 1) * 2));
}

/**
 * Groupes d'étapes successives même site+room.
 * @param {object[]} steps
 * @param {(s:object)=>object} [metaFn]
 */
export function collectScenarioStops(steps, metaFn = metaForStep) {
  const list = steps || [];
  const stops = [];
  for (let i = 0; i < list.length; i++) {
    const step = list[i];
    if (!step?.siteId) continue;
    const meta = metaFn(step) || {};
    const siteId = step.siteId;
    const roomId = meta.roomId || null;
    const key = `${siteId}::${roomId || ""}`;
    const last = stops[stops.length - 1];
    if (last && last.key === key) {
      last.endI = i;
    } else {
      stops.push({ key, startI: i, endI: i, siteId, roomId });
    }
  }
  return stops.map((st) => ({
    ...st,
    nLabel:
      st.startI === st.endI
        ? String(st.startI + 1)
        : `${st.startI + 1}-${st.endI + 1}`,
    stepI: st.startI,
  }));
}

/**
 * Position monde du n° (au-dessus de l'icône de salle).
 * @param {object} scene
 * @param {string} siteId
 * @param {string|null} roomId
 * @param {(siteId:string, roomId?:string|null)=>object|null} [siteWorldCenter]
 */
export function roomBadgeWorldPos(scene, siteId, roomId, siteWorldCenter) {
  const entry = scene.siteViews?.[siteId];
  const v = entry?.view;
  if (!v) return null;
  const roomsY = v.__roomsLayer?.y || 0;
  const icon = roomId ? v.__roomIcons?.[roomId] : null;
  if (icon && Number.isFinite(icon.x) && Number.isFinite(icon.y)) {
    const rect = icon.__roomRect;
    const rw = rect?.w || 40;
    const rh = rect?.h || 40;
    const iconS = Math.max(16, Math.min(rw, rh) * 0.58);
    return {
      x: v.x + icon.x,
      y: v.y + roomsY + icon.y - iconS * 0.58,
    };
  }
  if (roomId && v.__roomDoors) {
    const rd = v.__roomDoors.find((d) => d.roomId === roomId);
    if (rd?.rect) {
      const ox = v.x;
      const oy = v.y + roomsY;
      return {
        x: ox + rd.rect.x + rd.rect.w / 2,
        y: oy + rd.rect.y + rd.rect.h * 0.28,
      };
    }
  }
  if (typeof siteWorldCenter === "function") {
    const c = siteWorldCenter(siteId, roomId);
    if (c) return { x: c.x, y: c.y - 14 };
  }
  return {
    x: v.x + (v.__w || 0) / 2,
    y: v.y + (v.__h || 0) * 0.35,
  };
}

export function badgeLayer(scene) {
  const layer =
    scene.__screenLabelLayer ||
    scene.screenLabels?.layer ||
    scene.tilemap?.buildingsLayer;
  if (layer) layer.sortableChildren = true;
  return layer || null;
}

/**
 * @param {PIXI.Graphics} disc
 * @param {string} nLabel
 * @param {"done"|"next"|"idle"|"choice"} kind
 */
export function paintBadgeDisc(disc, nLabel, kind) {
  if (!disc) return;
  disc.clear();
  const wide = String(nLabel || "1").length > 2;
  const r = wide ? 13 : 12;
  let fill = 0x2f6b45;
  let alpha = 0.94;
  let stroke = 0xffffff;
  let strokeW = 2.2;
  if (kind === "done") {
    fill = 0x3a4f6e;
    alpha = 0.72;
    stroke = 0xe8eef6;
    strokeW = 1.8;
  } else if (kind === "next") {
    fill = 0xd4a017;
    alpha = 1;
    stroke = 0xffffff;
    strokeW = 2.4;
  } else if (kind === "choice") {
    fill = 0xe09200;
    alpha = 1;
    stroke = 0xffffff;
  }
  disc.beginFill(0x1a2740, 0.22);
  if (wide) disc.drawRoundedRect(-r - 1, -r + 1.5, (r + 3) * 2, r * 2, r);
  else disc.drawCircle(0.6, 1.4, r);
  disc.endFill();
  disc.beginFill(fill, alpha);
  disc.lineStyle(strokeW, stroke, 0.98);
  if (wide) disc.drawRoundedRect(-r - 3, -r, (r + 3) * 2, r * 2, r);
  else disc.drawCircle(0, 0, r);
  disc.endFill();
}

/**
 * Contrôleur pastilles (rebuild / highlight / reposition dirty-cam).
 * @param {{ scene: object, camera: object, siteWorldCenter?: Function }} opts
 */
export function createStepBadgeController(opts) {
  const { scene, camera, siteWorldCenter } = opts;
  /** @type {PIXI.Container[]} */
  let badges = [];
  let lastCamKey = "";
  let lastStateKey = "";

  function camKey() {
    if (typeof camera.camKey === "function") return camera.camKey(1);
    return `${camera.x.toFixed(2)}|${camera.y.toFixed(2)}|${camera.scale.toFixed(4)}`;
  }

  function clear() {
    for (const b of badges) {
      if (b.parent) b.parent.removeChild(b);
      b.destroy({ children: true });
    }
    badges = [];
    lastCamKey = "";
    lastStateKey = "";
  }

  /**
   * @param {object[]} stops from collectScenarioStops
   * @param {{ zIndex?: number }} [opt]
   */
  function rebuild(stops, opt = {}) {
    clear();
    const layer = badgeLayer(scene);
    if (!layer || !stops?.length) return;
    const res = badgeTextRes();
    const z = opt.zIndex ?? 2500;
    for (const st of stops) {
      const cont = new PIXI.Container();
      cont.zIndex = z;
      cont.eventMode = "none";
      cont.__startI = st.startI;
      cont.__endI = st.endI;
      cont.__stepI = st.stepI ?? st.startI;
      cont.__siteId = st.siteId;
      cont.__roomId = st.roomId;
      cont.__nLabel = st.nLabel;
      cont.__show = true;
      cont.__kind = "idle";

      const disc = new PIXI.Graphics();
      cont.__disc = disc;
      cont.addChild(disc);

      const t = new PIXI.Text(st.nLabel, {
        fontFamily:
          'system-ui, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: st.nLabel.length > 2 ? 12 : 14,
        fontWeight: "800",
        fill: 0xffffff,
        align: "center",
        stroke: 0x1a2740,
        strokeThickness: 0.5,
      });
      t.anchor.set(0.5, 0.5);
      t.resolution = res;
      t.roundPixels = true;
      cont.__label = t;
      cont.addChild(t);
      paintBadgeDisc(disc, st.nLabel, "idle");
      layer.addChild(cont);
      badges.push(cont);
    }
    reposition({ force: true });
  }

  /**
   * @param {{
   *   index: number,
   *   travelTo?: { siteId: string, roomId?: string|null, stepI: number }|null,
   *   followDossier?: boolean,
   *   awaitingChoice?: boolean,
   *   curSite?: string|null,
   *   curRoom?: string|null,
   *   hideAll?: boolean,
   * }} st
   */
  function updateHighlight(st) {
    if (!badges.length) return;
    const stateKey = [
      st.index,
      st.travelTo?.stepI ?? "",
      st.travelTo?.siteId ?? "",
      st.followDossier ? 1 : 0,
      st.awaitingChoice ? 1 : 0,
      st.curSite ?? "",
      st.curRoom ?? "",
      st.hideAll ? 1 : 0,
    ].join("|");
    if (stateKey === lastStateKey) {
      // still may need next-pulse scale only — leave to caller
      return;
    }
    lastStateKey = stateKey;

    const destSite = st.travelTo?.siteId || null;
    const destRoom = st.travelTo?.roomId ?? null;
    const destStepI = st.travelTo?.stepI;
    const index = st.index ?? 0;

    for (const cont of badges) {
      if (st.hideAll) {
        cont.__show = false;
        cont.visible = false;
        continue;
      }
      const inRange = index >= cont.__startI && index <= cont.__endI;
      const coversDest =
        st.travelTo &&
        destStepI >= cont.__startI &&
        destStepI <= cont.__endI;
      const sameRoomAsDest =
        st.travelTo &&
        cont.__siteId === destSite &&
        (cont.__roomId || null) === (destRoom || null);
      const dossierOccupies =
        !st.travelTo &&
        !st.followDossier &&
        inRange &&
        cont.__siteId === st.curSite &&
        (cont.__roomId || null) === (st.curRoom || null);

      cont.__show = !dossierOccupies;

      let kind = "idle";
      if (sameRoomAsDest || coversDest) kind = "next";
      else if (cont.__endI < (st.travelTo ? destStepI : index)) kind = "done";
      if (
        !st.travelTo &&
        st.awaitingChoice &&
        index >= cont.__startI &&
        index <= cont.__endI
      ) {
        kind = "choice";
      }
      cont.__kind = kind;
      paintBadgeDisc(cont.__disc, cont.__nLabel, kind);
      if (kind !== "next") {
        cont.scale.set(1);
        cont.alpha = kind === "done" ? 0.78 : 1;
      }
    }
    reposition({ force: true });
  }

  /**
   * @param {{ force?: boolean }} [opt]
   * @returns {boolean} true si repositionné
   */
  function reposition(opt = {}) {
    if (!badges.length) return false;
    const key = camKey();
    if (!opt.force && key === lastCamKey) return false;
    lastCamKey = key;
    const sc = camera.scale;
    for (const cont of badges) {
      const pos = roomBadgeWorldPos(
        scene,
        cont.__siteId,
        cont.__roomId,
        siteWorldCenter
      );
      if (!pos) {
        cont.__posOk = false;
        cont.visible = false;
        continue;
      }
      cont.__posOk = true;
      cont.x = camera.x + pos.x * sc;
      cont.y = camera.y + pos.y * sc;
      if (cont.__kind !== "next") cont.scale.set(1);
      cont.visible = cont.__show !== false && cont.__posOk;
    }
    return true;
  }

  return {
    clear,
    rebuild,
    updateHighlight,
    reposition,
    get badges() {
      return badges;
    },
    invalidateState() {
      lastStateKey = "";
    },
    invalidateCam() {
      lastCamKey = "";
    },
  };
}
