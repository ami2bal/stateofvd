/**
 * Always-open interiors (D-012 vector) — room labels under LOD.
 * Floor plans drawn in makeBuildingSprite; here we attach labels + QA.
 */
/* global PIXI */
import { writeQaOut } from "../engine/qa.js";

/**
 * @param {object} ctx
 * @param {object} ctx.scene
 */
export function installInterior(ctx) {
  const { scene } = ctx;
  const state = {
    roomViews: [],
    bySite: {},
  };

  for (const id of Object.keys(scene.siteViews)) {
    const entry = scene.siteViews[id];
    const site = entry.def;
    const rooms = site.rooms || [];
    if (!rooms.length && site.kind !== "rumine") continue;
    const roomList =
      rooms.length > 0
        ? rooms
        : (site.zones || []).map((z) => ({
            id: z.id,
            label: z.label,
            bodyId: null,
            decor: true,
            role: z.role,
          }));
    if (!roomList.length) continue;

    const slot = entry.view.__interiorSlot;
    if (!slot) continue;

    const siteRooms = [];
    const n = Math.max(1, roomList.length);
    const w = entry.view.__w || site.fw * 24;
    const h = entry.view.__h || site.fh * 24;

    roomList.forEach((room, i) => {
      const cont = new PIXI.Container();
      cont.__isRoomLabelHost = true;
      cont.__room = room;
      cont.__siteId = id;
      const u = (i + 0.5) / n;
      cont.x = Math.round(u * w);
      cont.y = Math.round(h * 0.55);
      cont.zIndex = 2;

      // furniture flags for QA (drawn on building roomsLayer; mirrored here)
      const g = new PIXI.Graphics();
      g.visible = false;
      if (room.role === "hemicycle") {
        g.__hasHemicycle = true;
        g.__furniture = true;
      }
      if (room.role === "council-table") {
        g.__hasCouncilTable = true;
        g.__furniture = true;
      }
      cont.addChild(g);
      cont.__furnitureG = g;

      // TASK-094 K9: no world-space room labels (screenLabels only) — ink 0x2f4266 was residual
      const label = new PIXI.Text(room.label, {
        fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
        fontSize: 10,
        fill: 0x2f4266,
        fontWeight: "600",
      });
      label.anchor.set(0.5, 1);
      label.y = -4;
      label.visible = false; // always off — K9
      cont.addChild(label);
      cont.__label = label;

      slot.addChild(cont);
      siteRooms.push(cont);
      state.roomViews.push(cont);
    });

    // Mark plan rooms furniture presence from building roomsLayer
    const planRooms = entry.view.__roomsLayer;
    if (planRooms) {
      for (const ch of planRooms.children) {
        if (ch.__hasHemicycle || ch.__hasCouncilTable) {
          const host = state.roomViews.find((v) => v.__siteId === id);
          if (host?.__furnitureG) {
            if (ch.__hasHemicycle) host.__furnitureG.__hasHemicycle = true;
            if (ch.__hasCouncilTable) host.__furnitureG.__hasCouncilTable = true;
          }
        }
      }
    }

    state.bySite[id] = siteRooms;
  }

  function applyLod(lod, scale) {
    for (const cont of state.roomViews) {
      if (!cont.__isRoomLabelHost) continue;
      // K9: never show world-space labels
      if (cont.__label) cont.__label.visible = false;
      cont.visible = true;
    }
  }

  async function runInteriorTour() {
    const result = { scenario: "interior-tour", sites: [], alwaysOpen: true };
    for (const id of ["parlement", "chateau"]) {
      const entry = scene.siteViews[id];
      if (!entry) continue;
      const site = entry.def;
      const rooms = (site.rooms || []).map((r) => ({
        id: r.id,
        label: r.label,
        bodyId: r.bodyId,
        decor: !!r.decor,
        role: r.role || null,
      }));
      const hosts = state.roomViews.filter((v) => v.__siteId === id);
      const plan = entry.view.__roomsLayer;
      const hasHemi =
        hosts.some((v) => v.__furnitureG?.__hasHemicycle) ||
        (plan &&
          plan.children.some((c) => c.__hasHemicycle)) ||
        rooms.some((r) => r.role === "hemicycle");
      const hasTable =
        hosts.some((v) => v.__furnitureG?.__hasCouncilTable) ||
        (plan &&
          plan.children.some((c) => c.__hasCouncilTable)) ||
        rooms.some((r) => r.role === "council-table");
      result.sites.push({
        id,
        displayName: site.displayName,
        rooms,
        hasHemicycle: id === "parlement" ? hasHemi : false,
        hasCouncilTable: id === "chateau" ? hasTable : false,
        roofHidden: false,
        alwaysVisible: true,
      });
    }
    result.roofRestored = true;
    writeQaOut(result);
    return result;
  }

  return {
    applyLod,
    runInteriorTour,
    getState: () => state,
  };
}
