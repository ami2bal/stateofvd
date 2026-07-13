/**
 * World — plan d'architecte (TASK-094 + REVUE-1..3).
 */
/* global PIXI */
import { Tilemap } from "../engine/tilemap.js";
import { EntitySystem, buildWalkable } from "../engine/entities.js";
import { LabelSystem } from "../engine/labels.js";
import {
  makeBuildingSprite,
  applySmoothGlobal,
  hexToNum,
  RAMPS,
} from "../engine/shapes.js";
import { cellXY, footprintBaseline, TILE } from "../engine/render2d.js";
import { installAmbient, tickAmbient } from "./ambient.js";

const MAJOR_KINDS = new Set(["parlement", "chateau"]);

/** Sand fill for exterior paths (K15) — distinct from interior grey. */
const SAND = 0xd4c4a0;
const SAND_EDGE = 0x9a958a;

/**
 * Spine + branches OUTSIDE building footprints.
 * K26: department doors face NORTH. TASK-107: no Rumine branch.
 */
function drawExteriorPaths(g, sites) {
  const boxes = sites.map((s) => {
    const north = s.kind === "department";
    return {
      id: s.id,
      kind: s.kind,
      x0: s.gx * TILE,
      y0: s.gy * TILE,
      x1: (s.gx + s.fw) * TILE,
      y1: (s.gy + s.fh) * TILE,
      doorX: (s.gx + s.fw / 2) * TILE,
      doorY: north ? s.gy * TILE : (s.gy + s.fh) * TILE,
      side: north ? "n" : "s",
    };
  });
  if (!boxes.length) return;

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
  const xs = boxes.map((d) => d.doorX);
  const spineX0 = Math.min(...xs) - 16;
  const spineX1 = Math.max(...xs) + 16;

  function strokePath(pts, wFill, wEdge) {
    if (pts.length < 2) return;
    g.lineStyle(wEdge, SAND_EDGE, 0.55);
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.lineStyle(wFill, SAND, 0.9);
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  }

  strokePath(
    [
      { x: spineX0, y: spineY },
      { x: spineX1, y: spineY },
    ],
    9,
    12
  );

  for (const d of boxes) {
    if (d.side === "n") {
      strokePath(
        [
          { x: d.doorX, y: d.doorY - 1 },
          { x: d.doorX, y: spineY },
        ],
        6,
        8
      );
    } else {
      strokePath(
        [
          { x: d.doorX, y: d.doorY + 1 },
          { x: d.doorX, y: spineY },
        ],
        6,
        8
      );
    }
  }
}

export function buildWorld(world, root) {
  applySmoothGlobal();
  const sites = world.sites || [];
  const blockers = sites.map((s) => ({
    gx: s.gx,
    gy: s.gy,
    fw: s.fw,
    fh: s.fh,
    entry: s.entry,
  }));
  const tilemap = new Tilemap(world, root);
  tilemap.buildingsLayer.sortableChildren = true;
  root.sortableChildren = true;
  const walkable = buildWalkable(world.tiles, blockers);
  const entities = new EntitySystem(tilemap.entities, walkable);

  const pathsG = new PIXI.Graphics();
  pathsG.zIndex = -100;
  pathsG.eventMode = "none";
  tilemap.buildingsLayer.addChild(pathsG);
  drawExteriorPaths(pathsG, sites);
  // NOTE (100-K7 / 102): do NOT cacheAsBitmap body/header/paths — under contain-scale
  // Pixi raster caches often paint 0 pixels (user-confirmed empty plateau). Keep live Graphics.

  const siteViews = {};
  const buildingViews = {};

  for (const s of sites) {
    const view = makeBuildingSprite(s);
    view.eventMode = "static";
    view.cursor = "pointer";
    const base = cellXY(s.gx, s.gy);
    view.x = base.x;
    view.y = base.y;
    view.zIndex = footprintBaseline(s.gx, s.gy, s.fw, s.fh) + 100;
    view.hitArea = new PIXI.Rectangle(0, 0, view.__w, view.__h);
    // force visible shell (K7)
    view.visible = true;
    view.alpha = 1;
    if (view.__body) {
      view.__body.visible = true;
      view.__body.alpha = 1;
      view.__body.cacheAsBitmap = false;
    }
    if (view.__header) {
      view.__header.visible = true;
      view.__header.alpha = 1;
      view.__header.cacheAsBitmap = false;
    }
    if (view.__interiorPaths) view.__interiorPaths.cacheAsBitmap = false;
    if (view.__roomsLayer) {
      view.__roomsLayer.visible = true;
      view.__roomsLayer.alpha = 1;
    }
    tilemap.buildingsLayer.addChild(view);
    siteViews[s.id] = { def: s, view };

    if (MAJOR_KINDS.has(s.kind)) {
      const fromData = (world.buildings || []).find((b) => b.id === s.id);
      buildingViews[s.id] = {
        def: fromData || {
          id: s.id,
          label: s.displayName,
          institutionLabel: s.hostLabel || s.displayName,
          bodyId: s.hostBodyId || s.id,
          gx: s.gx,
          gy: s.gy,
          fw: s.fw,
          fh: s.fh,
          elev: s.elev,
          entry: s.entry,
        },
        view,
      };
    }
  }

  const labels = new LabelSystem(tilemap.labelsLayer, []);

  const wp = Object.fromEntries((world.waypoints || []).map((w) => [w.id, w]));
  const huissiers = [];
  for (const h of world.huissiers || []) {
    const start = wp[h.start] || world.waypoints[0];
    const e = entities.spawnUsher(h.id, start.gx, start.gy, 0);
    if (e.view) e.view.scale.set(0.42);
    e._route = (h.route || []).map((id) => wp[id]).filter(Boolean);
    e._routeI = 0;
    huissiers.push(e);
  }

  let animT = 0;

  const scene = {
    tilemap,
    entities,
    walkable,
    siteViews,
    buildingViews,
    labels,
    huissiers,
    world,
    pathsG,
    interior: null,
    ambient: null,
    tickCosmetics(dt) {
      animT += dt;
      tickAmbient(scene, dt);
    },
  };

  scene.ambient = installAmbient(scene, world);

  return scene;
}

export function updatePatrols(scene) {
  for (const e of scene.huissiers) {
    if (!e.path || e.path.length === 0 || e.pathI >= e.path.length - 1) {
      if (!e._route || !e._route.length) continue;
      e._routeI = (e._routeI + 1) % e._route.length;
      const t = e._route[e._routeI];
      scene.entities.pathTo(e, t.gx, t.gy);
    }
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function setBuildingHighlight(view, on) {
  if (!view) return;
  view.tint = on ? 0xc8d4e8 : 0xffffff;
}
