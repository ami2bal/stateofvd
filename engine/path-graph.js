/**
 * Board path graph — single source for Manhattan routing.
 * Used by: connections (flux pin) · walkthrough (dossier Mode Parcours).
 *
 * Topology:
 *  - interior: room center → door → rail/corridor → gutter → building door
 *  - exterior: building door → spine (esplanade) → building door
 *  - never free diagonals across the plan
 */
import { TILE } from "./render2d.js";

/** Exterior door world position (matches world.js drawExteriorPaths). */
export function exteriorDoorWorld(scene, siteId) {
  const entry = scene.siteViews[siteId];
  const def = entry?.def;
  const v = entry?.view;
  if (def) {
    const north = def.kind === "department";
    return {
      x: (def.gx + def.fw / 2) * TILE,
      y: north ? def.gy * TILE : (def.gy + def.fh) * TILE,
      side: north ? "n" : "s",
    };
  }
  if (v) {
    const bd = v.__buildingDoor;
    if (bd) return { x: v.x + bd.x, y: v.y + bd.y, side: bd.side || "s" };
    return {
      x: v.x + (v.__w || 0) / 2,
      y: v.y + (v.__h || 0),
      side: "s",
    };
  }
  return null;
}

/** Spine Y identical to world.js drawExteriorPaths. */
export function computeSpineY(scene) {
  const sites = scene.world?.sites || [];
  if (!sites.length) return 0;
  const boxes = sites.map((s) => ({
    id: s.id,
    kind: s.kind,
    y0: s.gy * TILE,
    y1: (s.gy + s.fh) * TILE,
  }));
  const maj = boxes.filter((d) => ["parlement", "chateau"].includes(d.id));
  const depts = boxes.filter((d) => d.kind === "department");
  const majSouth = Math.max(...maj.map((d) => d.y1));
  const deptNorth = depts.length
    ? Math.min(...depts.map((d) => d.y0))
    : majSouth + 40;
  let spineY = (majSouth + deptNorth) / 2;
  for (const b of boxes) {
    if (spineY > b.y0 && spineY < b.y1) spineY = b.y1 + 6;
  }
  return spineY;
}

function roomsOrigin(view) {
  return {
    ox: view.x,
    oy: view.y + (view.__roomsLayer?.y || 0),
  };
}

/**
 * Interior polyline: room door → rail → gutter → building door (local→world).
 */
export function interiorRoomToDoor(view, roomId) {
  const { ox, oy } = roomsOrigin(view);
  const meta = view.__pathMeta;
  const doors = view.__roomDoors || [];
  const rd = roomId
    ? doors.find((d) => d.roomId === roomId) || doors[0]
    : null;
  const ext = view.__buildingDoor
    ? { x: view.x + view.__buildingDoor.x, y: view.y + view.__buildingDoor.y }
    : { x: view.x + (view.__w || 0) / 2, y: view.y + (view.__h || 0) };

  if (!rd || !meta) {
    const cx = view.x + (view.__w || 0) / 2;
    const cy = view.y + (view.__h || 0) / 2;
    return [
      { x: cx, y: cy },
      { x: ext.x, y: ext.y },
    ];
  }

  const doorPt = { x: ox + rd.x, y: oy + rd.y };
  const center = rd.rect
    ? {
        x: ox + rd.rect.x + rd.rect.w / 2,
        y: oy + rd.rect.y + rd.rect.h / 2,
      }
    : doorPt;

  let corridorY = rd.y + 4;
  for (const rail of meta.rails || []) {
    if ((rail.doors || []).some((d) => d.roomId === rd.roomId)) {
      corridorY = rail.y;
      break;
    }
  }
  const gutterX = meta.gutterX;
  const bdLocal = meta.buildDoor;

  return dedupeHV([
    center,
    doorPt,
    { x: ox + rd.x, y: oy + corridorY },
    { x: ox + gutterX, y: oy + corridorY },
    { x: ox + gutterX, y: oy + bdLocal.y },
    { x: ox + bdLocal.x, y: oy + bdLocal.y },
    { x: ext.x, y: ext.y },
  ]);
}

export function interiorDoorToRoom(view, roomId) {
  return interiorRoomToDoor(view, roomId).slice().reverse();
}

/** Same-building: room A → rail → gutter → rail → room B. */
export function interiorRoomToRoom(view, fromRoomId, toRoomId) {
  const { ox, oy } = roomsOrigin(view);
  const meta = view.__pathMeta;
  const doors = view.__roomDoors || [];
  const a = doors.find((d) => d.roomId === fromRoomId);
  const b = doors.find((d) => d.roomId === toRoomId);
  if (!a || !b) return [];
  const ca = a.rect
    ? {
        x: ox + a.rect.x + a.rect.w / 2,
        y: oy + a.rect.y + a.rect.h / 2,
      }
    : { x: ox + a.x, y: oy + a.y };
  const cb = b.rect
    ? {
        x: ox + b.rect.x + b.rect.w / 2,
        y: oy + b.rect.y + b.rect.h / 2,
      }
    : { x: ox + b.x, y: oy + b.y };
  if (!meta) {
    return dedupeHV([
      ca,
      { x: ox + a.x, y: oy + a.y },
      { x: ox + b.x, y: oy + b.y },
      cb,
    ]);
  }
  let railA = meta.rails[0]?.y ?? a.y + 4;
  let railB = meta.rails[0]?.y ?? b.y + 4;
  for (const rail of meta.rails || []) {
    if ((rail.doors || []).some((d) => d.roomId === a.roomId)) railA = rail.y;
    if ((rail.doors || []).some((d) => d.roomId === b.roomId)) railB = rail.y;
  }
  const g = meta.gutterX;
  return dedupeHV([
    ca,
    { x: ox + a.x, y: oy + a.y },
    { x: ox + a.x, y: oy + railA },
    { x: ox + g, y: oy + railA },
    { x: ox + g, y: oy + railB },
    { x: ox + b.x, y: oy + railB },
    { x: ox + b.x, y: oy + b.y },
    cb,
  ]);
}

/** Drop consecutive duplicates / collinear redundant points. */
export function dedupeHV(pts) {
  if (!pts.length) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const prev = out[out.length - 1];
    if (Math.abs(p.x - prev.x) < 0.5 && Math.abs(p.y - prev.y) < 0.5) continue;
    out.push(p);
  }
  const coll = [out[0]];
  for (let i = 1; i < out.length - 1; i++) {
    const a = coll[coll.length - 1];
    const b = out[i];
    const c = out[i + 1];
    const colX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5;
    const colY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5;
    if (colX || colY) continue;
    coll.push(b);
  }
  coll.push(out[out.length - 1]);
  return coll;
}

/**
 * Full path room → target strictly on board paths.
 */
export function pathPointsStrict(
  scene,
  fromSiteId,
  fromRoomId,
  toSiteId,
  toRoomId
) {
  const fromEntry = scene.siteViews[fromSiteId];
  const toEntry = scene.siteViews[toSiteId];
  if (!fromEntry?.view || !toEntry?.view) return [];

  if (fromSiteId === toSiteId) {
    if (fromRoomId && toRoomId) {
      return interiorRoomToRoom(fromEntry.view, fromRoomId, toRoomId);
    }
    if (fromRoomId && !toRoomId) {
      return interiorRoomToDoor(fromEntry.view, fromRoomId);
    }
    if (!fromRoomId && toRoomId) {
      return interiorDoorToRoom(toEntry.view, toRoomId);
    }
    return [];
  }

  const out = [];
  if (fromRoomId) {
    out.push(...interiorRoomToDoor(fromEntry.view, fromRoomId));
  } else {
    const d = exteriorDoorWorld(scene, fromSiteId);
    if (d) out.push({ x: d.x, y: d.y });
  }

  const spineY = computeSpineY(scene);
  const dFrom = exteriorDoorWorld(scene, fromSiteId);
  const dTo = exteriorDoorWorld(scene, toSiteId);
  if (dFrom && dTo) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - dFrom.x, last.y - dFrom.y) > 2) {
      out.push({ x: dFrom.x, y: dFrom.y });
    }
    out.push({ x: dFrom.x, y: spineY });
    out.push({ x: dTo.x, y: spineY });
    out.push({ x: dTo.x, y: dTo.y });
  }

  if (toRoomId) {
    const inbound = interiorDoorToRoom(toEntry.view, toRoomId);
    const startI =
      inbound.length &&
      out.length &&
      Math.hypot(
        inbound[0].x - out[out.length - 1].x,
        inbound[0].y - out[out.length - 1].y
      ) < 3
        ? 1
        : 0;
    for (let i = startI; i < inbound.length; i++) out.push(inbound[i]);
  }

  return dedupeHV(out);
}

/** True if every segment is axis-aligned (Manhattan). */
export function pathIsManhattan(pts) {
  if (!pts || pts.length < 2) return false;
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i].x - pts[i - 1].x);
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    if (dx > 1.5 && dy > 1.5) return false;
  }
  return true;
}

/** Expand diagonal segments into H+V (never cut corners). */
export function forceManhattanPolyline(pts) {
  if (!pts?.length) return pts || [];
  const out = [{ x: pts[0].x, y: pts[0].y }];
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    if (dx > 1.5 && dy > 1.5) {
      out.push({ x: b.x, y: a.y });
    }
    if (dx > 0.5 || dy > 0.5) out.push({ x: b.x, y: b.y });
  }
  return out;
}
