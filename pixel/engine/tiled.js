/**
 * Map loader — Kenney composed layers preferred, Tiled fallback.
 */
/* global PIXI */
import { applyNearest } from "./pixel.js";

/**
 * @param {string} mapUrl  (kept for API; composed path derived)
 */
export async function loadTiledMap(mapUrl) {
  applyNearest();
  const base = new URL(mapUrl, location.href);

  // 1) Prefer Kenney-composed full-map layers
  try {
    const composed = await loadComposed(base);
    if (composed) return composed;
  } catch (e) {
    console.warn("[pixel] composed load failed", e);
  }

  // 2) Classic Tiled fallback
  return loadClassicTiled(mapUrl);
}

async function loadComposed(mapBase) {
  const metaUrl = new URL("../composed/meta.json", mapBase).href;
  const res = await fetch(metaUrl);
  if (!res.ok) return null;
  const meta = await res.json();
  const layersBase = new URL("../composed/", mapBase);

  const [groundTex, roofTex, intTex] = await Promise.all([
    PIXI.Assets.load(new URL(meta.layers.ground, layersBase).href),
    PIXI.Assets.load(new URL(meta.layers.roofs, layersBase).href),
    PIXI.Assets.load(new URL(meta.layers.interiors, layersBase).href),
  ]);
  for (const t of [groundTex, roofTex, intTex]) {
    t.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
  }

  const mapW = meta.width || groundTex.width;
  const mapH = meta.height || groundTex.height;

  const root = new PIXI.Container();
  root.sortableChildren = true;

  const groundLayer = new PIXI.Container();
  groundLayer.zIndex = 0;
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
    interiorsLayer,
    roofsLayer,
    ambientLayer,
    hotspotLayer,
    fxLayer
  );

  const g = new PIXI.Sprite(groundTex);
  g.roundPixels = true;
  groundLayer.addChild(g);
  const i = new PIXI.Sprite(intTex);
  i.roundPixels = true;
  interiorsLayer.addChild(i);
  const r = new PIXI.Sprite(roofTex);
  r.roundPixels = true;
  roofsLayer.addChild(r);

  interiorsLayer.alpha = 0;
  roofsLayer.alpha = 1;

  const { hotspots, markers } = await loadHotspots(mapBase, hotspotLayer);

  function applyLod(scale, reduced = false) {
    const t = scale < 1.65 ? 0 : scale > 2.45 ? 1 : (scale - 1.65) / 0.8;
    if (reduced) {
      interiorsLayer.alpha = scale >= 2 ? 1 : 0;
      roofsLayer.alpha = scale >= 2 ? 0.15 : 1;
      return;
    }
    // crossfade: roofs stay slightly visible for silhouette
    interiorsLayer.alpha = t;
    roofsLayer.alpha = 1 - t * 0.92;
  }

  return {
    root,
    hotspots,
    markers,
    fxLayer,
    ambientLayer,
    interiorsLayer,
    roofsLayer,
    mapW,
    mapH,
    tile: meta.tile || 16,
    source: "kenney-composed",
    credit: meta.credit,
    applyLod,
  };
}

async function loadHotspots(mapBase, hotspotLayer) {
  let hotspots = [];
  try {
    const hsDoc = await (
      await fetch(new URL("../hotspots.json", mapBase).href)
    ).json();
    hotspots = hsDoc.hotspots || [];
  } catch {
    /* empty */
  }

  const markers = {};
  const temp = [];
  for (const hs of hotspots) {
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
    temp.push(c);
    markers[hs.id] = c;
  }
  // sites under rooms for hit priority
  temp
    .filter((c) => c.__hs?.kind !== "room")
    .forEach((c) => hotspotLayer.addChild(c));
  temp
    .filter((c) => c.__hs?.kind === "room")
    .forEach((c) => hotspotLayer.addChild(c));

  return { hotspots, markers };
}

async function loadClassicTiled(mapUrl) {
  const map = await (await fetch(mapUrl)).json();
  const tile = map.tilewidth || 16;
  const mapW = (map.width || 38) * tile;
  const mapH = (map.height || 24) * tile;
  const ts = map.tilesets?.[0];
  if (!ts) throw new Error("No tileset");
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
    interiorsLayer,
    roofsLayer,
    ambientLayer,
    hotspotLayer,
    fxLayer
  );

  const hostFor = {
    ground: groundLayer,
    interiors: interiorsLayer,
    roofs: roofsLayer,
  };
  for (const layer of map.layers || []) {
    if (layer.type === "tilelayer" && layer.data && hostFor[layer.name]) {
      paintTileLayer(
        hostFor[layer.name],
        layer,
        texture,
        firstgid,
        columns,
        tile
      );
    }
  }
  interiorsLayer.alpha = 0;
  roofsLayer.alpha = 1;
  const { hotspots, markers } = await loadHotspots(base, hotspotLayer);
  return {
    root,
    hotspots,
    markers,
    fxLayer,
    ambientLayer,
    interiorsLayer,
    roofsLayer,
    mapW,
    mapH,
    tile,
    source: "tiled",
    applyLod(scale, reduced = false) {
      const t = scale < 1.7 ? 0 : scale > 2.4 ? 1 : (scale - 1.7) / 0.7;
      interiorsLayer.alpha = reduced ? (scale >= 2 ? 1 : 0) : t;
      roofsLayer.alpha = reduced ? (scale >= 2 ? 0 : 1) : 1 - t;
    },
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
      const local = (raw & 0x1fffffff) - firstgid;
      if (local < 0) continue;
      const sx = (local % columns) * tile;
      const sy = Math.floor(local / columns) * tile;
      const tr = new PIXI.Texture(
        texture.baseTexture,
        new PIXI.Rectangle(sx, sy, tile, tile)
      );
      const spr = new PIXI.Sprite(tr);
      spr.x = tx * tile;
      spr.y = ty * tile;
      spr.roundPixels = true;
      host.addChild(spr);
    }
  }
}
