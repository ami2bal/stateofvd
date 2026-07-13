/**
 * Chargeur carte Tiled + sprites buildings dual LOD (art pass).
 */
/* global PIXI */
import { applyNearest } from "./pixel.js";

/**
 * @typedef {{ id:string, label:string, kind:string, sub:string, x:number, y:number, w:number, h:number, cx:number, cy:number }} Hotspot
 */

/**
 * @param {string} mapUrl
 */
export async function loadTiledMap(mapUrl) {
  applyNearest();
  const map = await (await fetch(mapUrl)).json();
  const tile = map.tilewidth || 16;
  const mapW = (map.width || 38) * tile;
  const mapH = (map.height || 24) * tile;

  const ts = map.tilesets?.[0];
  if (!ts) throw new Error("No tileset in map");
  const base = new URL(mapUrl, location.href);
  const imageUrl = new URL(ts.image, base).href;
  const firstgid = ts.firstgid || 1;
  const columns = ts.columns || 16;

  const texture = await PIXI.Assets.load(imageUrl);
  texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

  const root = new PIXI.Container();
  root.sortableChildren = true;

  const groundLayer = new PIXI.Container();
  groundLayer.zIndex = 0;
  const baseLayer = new PIXI.Container();
  baseLayer.zIndex = 3;
  const interiorsLayer = new PIXI.Container();
  interiorsLayer.zIndex = 6;
  const roofsLayer = new PIXI.Container();
  roofsLayer.zIndex = 8;
  const ambientLayer = new PIXI.Container();
  ambientLayer.zIndex = 12;
  const hotspotLayer = new PIXI.Container();
  hotspotLayer.zIndex = 20;
  const fxLayer = new PIXI.Container();
  fxLayer.zIndex = 30;
  root.addChild(
    groundLayer,
    baseLayer,
    interiorsLayer,
    roofsLayer,
    ambientLayer,
    hotspotLayer,
    fxLayer
  );

  // Building sprites?
  let buildingSprites = [];
  let useBuildingSprites = false;
  try {
    const manUrl = new URL("../buildings/manifest.json", base).href;
    const man = await (await fetch(manUrl)).json();
    if (man.buildings?.length) {
      useBuildingSprites = true;
      const assetsBase = new URL("../", base);
      for (const b of man.buildings) {
        const roofUrl = new URL(b.roof, assetsBase).href;
        const intUrl = new URL(b.interior, assetsBase).href;
        const [roofTex, intTex] = await Promise.all([
          PIXI.Assets.load(roofUrl),
          PIXI.Assets.load(intUrl),
        ]);
        roofTex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        intTex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        const roofSpr = new PIXI.Sprite(roofTex);
        roofSpr.position.set(b.x, b.y);
        roofSpr.roundPixels = true;
        roofsLayer.addChild(roofSpr);
        const intSpr = new PIXI.Sprite(intTex);
        intSpr.position.set(b.x, b.y);
        intSpr.roundPixels = true;
        interiorsLayer.addChild(intSpr);
        buildingSprites.push({ id: b.id, roof: roofSpr, interior: intSpr });
      }
    }
  } catch (e) {
    console.warn("[pixel] no building sprites", e);
  }

  const hostFor = {
    ground: groundLayer,
    buildings: baseLayer,
    buildings_base: baseLayer,
    interiors: interiorsLayer,
    roofs: roofsLayer,
  };

  for (const layer of map.layers || []) {
    if (layer.type !== "tilelayer" || !layer.data) continue;
    // When we have painted building sprites, skip tile roofs/interiors/base
    // (sprites replace them) — keep ground only for underlay.
    if (
      useBuildingSprites &&
      (layer.name === "roofs" ||
        layer.name === "interiors" ||
        layer.name === "buildings_base" ||
        layer.name === "buildings")
    ) {
      continue;
    }
    const host = hostFor[layer.name] || groundLayer;
    paintTileLayer(host, layer, texture, firstgid, columns, tile);
  }

  interiorsLayer.alpha = 0;
  roofsLayer.alpha = 1;
  baseLayer.alpha = useBuildingSprites ? 0 : 0.35;

  /** @type {Hotspot[]} */
  let hotspots = [];
  try {
    const hsDoc = await (await fetch(new URL("../hotspots.json", base).href)).json();
    hotspots = hsDoc.hotspots || [];
  } catch {
    /* ignore */
  }

  const markers = {};
  for (const hs of hotspots) {
    // Prefer room-level hits; site-level still ok for overview
    const c = new PIXI.Container();
    c.position.set(hs.cx, hs.cy);
    c.eventMode = "static";
    c.cursor = "pointer";
    const hit = new PIXI.Graphics();
    hit.beginFill(0xffffff, 0.001);
    hit.drawRect(-hs.w / 2, -hs.h / 2, hs.w, hs.h);
    hit.endFill();
    c.addChild(hit);
    const ring = new PIXI.Graphics();
    const color =
      hs.kind === "parlement" || hs.siteKind === "parlement"
        ? 0x3e7a52
        : hs.kind === "chateau" || hs.siteKind === "chateau"
          ? 0xa08040
          : hs.kind === "department" || hs.siteKind === "department"
            ? 0x5c6e8a
            : hs.kind === "nature"
              ? 0x4c83ab
              : 0x2f4266;
    ring.lineStyle(2, color, 0.95);
    ring.drawRoundedRect(-hs.w / 2 - 2, -hs.h / 2 - 2, hs.w + 4, hs.h + 4, 3);
    ring.visible = false;
    c.addChild(ring);
    c.__ring = ring;
    c.__hs = hs;
    // rooms above sites for pick priority: later children win in pixi hit
    // add rooms after sites by sorting
    hotspotLayer.addChild(c);
    markers[hs.id] = c;
  }
  // re-order: rooms on top of sites for hit testing
  const roomMarkers = hotspotLayer.children.filter((c) => c.__hs?.kind === "room");
  const otherMarkers = hotspotLayer.children.filter((c) => c.__hs?.kind !== "room");
  hotspotLayer.removeChildren();
  for (const c of otherMarkers) hotspotLayer.addChild(c);
  for (const c of roomMarkers) hotspotLayer.addChild(c);

  function applyLod(scale, reduced = false) {
    const t = scale < 1.7 ? 0 : scale > 2.5 ? 1 : (scale - 1.7) / 0.8;
    if (reduced) {
      interiorsLayer.alpha = scale >= 2 ? 1 : 0;
      roofsLayer.alpha = scale >= 2 ? 0 : 1;
      return;
    }
    interiorsLayer.alpha = t;
    roofsLayer.alpha = 1 - t;
  }

  return {
    root,
    hotspots,
    markers,
    fxLayer,
    ambientLayer,
    interiorsLayer,
    roofsLayer,
    baseLayer,
    buildingSprites,
    mapW,
    mapH,
    tile,
    source: useBuildingSprites ? "tiled+sprites" : "tiled",
    applyLod,
  };
}

function paintTileLayer(host, layer, texture, firstgid, columns, tile) {
  const data = layer.data;
  const h = layer.height;
  const w = layer.width;
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const raw = data[ty * w + tx] || 0;
      if (!raw) continue;
      const clean = raw & 0x1fffffff;
      const local = clean - firstgid;
      if (local < 0) continue;
      const sx = (local % columns) * tile;
      const sy = Math.floor(local / columns) * tile;
      const frame = new PIXI.Rectangle(sx, sy, tile, tile);
      const tr = new PIXI.Texture(texture.baseTexture, frame);
      const spr = new PIXI.Sprite(tr);
      spr.x = tx * tile;
      spr.y = ty * tile;
      spr.roundPixels = true;
      host.addChild(spr);
    }
  }
}
