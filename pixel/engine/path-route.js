/**
 * Routage dossier sur le réseau de chemins (BFS tuiles + Manhattan intérieur).
 * Graph SSOT: assets/composed/path_graph.json (export compose).
 */

/**
 * @typedef {{ x:number, y:number }} Pt
 * @typedef {{ tile:number, cells:number[][], doors: Record<string,{door:number[],apron:number[],face:string}> }} PathGraph
 */

/**
 * @param {PathGraph} doc
 */
export function buildPathIndex(doc) {
  const tile = doc.tile || 16;
  const cells = new Set((doc.cells || []).map(([x, y]) => `${x},${y}`));
  const doors = doc.doors || {};
  return { tile, cells, doors, grid: doc.grid || {} };
}

/**
 * BFS on path cells (4-neigh). Returns tile list from start to goal inclusive.
 * @param {Set<string>} cells
 * @param {[number,number]} start
 * @param {[number,number]} goal
 * @returns {[number,number][]|null}
 */
export function bfsTiles(cells, start, goal) {
  const sk = `${start[0]},${start[1]}`;
  const gk = `${goal[0]},${goal[1]}`;
  if (!cells.has(sk) || !cells.has(gk)) return null;
  if (sk === gk) return [start];
  const q = [start];
  const prev = new Map([[sk, null]]);
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (!cells.has(k) || prev.has(k)) continue;
      prev.set(k, `${x},${y}`);
      if (k === gk) {
        // reconstruct
        const path = [[nx, ny]];
        let cur = k;
        while (prev.get(cur)) {
          const p = prev.get(cur);
          const [px, py] = p.split(",").map(Number);
          path.push([px, py]);
          cur = p;
        }
        path.reverse();
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

/** Nearest path cell to a world pixel point (or tile). */
export function nearestPathTile(cells, tx, ty) {
  const key = `${tx},${ty}`;
  if (cells.has(key)) return [tx, ty];
  let best = null;
  let bestD = Infinity;
  for (const k of cells) {
    const [x, y] = k.split(",").map(Number);
    const d = Math.abs(x - tx) + Math.abs(y - ty);
    if (d < bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  return best;
}

/**
 * Site id for a room/site hotspot.
 * @param {{ siteId?:string, id?:string, kind?:string }} hs
 */
export function siteIdOf(hs) {
  if (!hs) return null;
  if (hs.kind === "room") return hs.siteId || null;
  return hs.siteId || hs.id || null;
}

/**
 * Tile center in world pixels.
 */
export function tileCenter(tx, ty, tile) {
  return { x: (tx + 0.5) * tile, y: (ty + 0.5) * tile };
}

/**
 * Route world polyline from hotspot A to B following roads.
 * Interior: room center → apron (Manhattan) · network BFS · apron → room.
 *
 * @param {object} fromHs hotspot
 * @param {object} toHs hotspot
 * @param {{ tile:number, cells:Set<string>, doors:object }} graph
 * @returns {Pt[]}
 */
export function routeHotspots(fromHs, toHs, graph) {
  if (!fromHs || !toHs) return [];
  const { tile, cells, doors } = graph;
  const fromSite = siteIdOf(fromHs);
  const toSite = siteIdOf(toHs);
  const start = { x: fromHs.cx, y: fromHs.cy };
  const end = { x: toHs.cx, y: toHs.cy };

  // Same site: Manhattan inside the building (no free diagonal)
  if (fromSite && fromSite === toSite) {
    return dedupePts(manhattan(start, end));
  }

  const fromDoor = fromSite ? doors[fromSite] : null;
  const toDoor = toSite ? doors[toSite] : null;

  // Fallback free Manhattan if no path network
  if (!fromDoor || !toDoor || !cells.size) {
    return dedupePts(manhattan(start, end));
  }

  const apronA = fromDoor.apron;
  const apronB = toDoor.apron;
  const apronAPt = tileCenter(apronA[0], apronA[1], tile);
  const apronBPt = tileCenter(apronB[0], apronB[1], tile);

  // Interior exit: room → door tile → apron
  const doorA = fromDoor.door;
  const doorB = toDoor.door;
  const doorAPt = tileCenter(doorA[0], doorA[1], tile);
  const doorBPt = tileCenter(doorB[0], doorB[1], tile);

  const exitLeg = dedupePts([
    ...manhattan(start, doorAPt),
    ...manhattan(doorAPt, apronAPt),
  ]);

  // Network BFS between aprons (snap if needed)
  let aTile = apronA;
  let bTile = apronB;
  if (!cells.has(`${aTile[0]},${aTile[1]}`)) {
    aTile = nearestPathTile(cells, aTile[0], aTile[1]) || aTile;
  }
  if (!cells.has(`${bTile[0]},${bTile[1]}`)) {
    bTile = nearestPathTile(cells, bTile[0], bTile[1]) || bTile;
  }
  const tilePath = bfsTiles(cells, aTile, bTile);
  let netPts = [];
  if (tilePath && tilePath.length) {
    netPts = tilePath.map(([x, y]) => tileCenter(x, y, tile));
  } else {
    netPts = manhattan(apronAPt, apronBPt);
  }

  const enterLeg = dedupePts([
    ...manhattan(apronBPt, doorBPt),
    ...manhattan(doorBPt, end),
  ]);

  return dedupePts([...exitLeg, ...netPts, ...enterLeg]);
}

/** Orthogonal polyline A→B (H then V). */
export function manhattan(a, b) {
  if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) return [a];
  const mid = { x: b.x, y: a.y };
  const out = [a];
  if (Math.abs(mid.x - a.x) > 0.5 || Math.abs(mid.y - a.y) > 0.5) out.push(mid);
  if (Math.abs(b.x - mid.x) > 0.5 || Math.abs(b.y - mid.y) > 0.5) out.push(b);
  return out;
}

function dedupePts(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push(p);
  }
  return out;
}

/**
 * Load path graph from composed assets.
 * @returns {Promise<ReturnType<typeof buildPathIndex>|null>}
 */
export async function loadPathGraph() {
  try {
    const url = new URL("../assets/composed/path_graph.json", import.meta.url).href;
    const doc = await (await fetch(url)).json();
    return buildPathIndex(doc);
  } catch (e) {
    console.warn("[pixel] path_graph load failed", e);
    return null;
  }
}
