/**
 * Gate M0+ — structure assets + palette approx + map integrity.
 * Usage: node tools/validate_assets.mjs [--strict]
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const strict = process.argv.includes("--strict");
let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error("FAIL", msg);
  failures++;
}
function warn(msg) {
  console.warn("WARN", msg);
  warnings++;
}
function ok(msg) {
  console.log("OK  ", msg);
}

const required = [
  "docs/PLAN.md",
  "docs/TEAM.md",
  "docs/ART_BIBLE.md",
  "docs/ASSETS.md",
  "assets/tilesets/terrain_16.png",
  "assets/tilesets/terrain_16.json",
  "assets/map/world.json",
  "assets/hotspots.json",
  "assets/characters/dossier_16.png",
  "assets/characters/dossier_16.json",
  "assets/ui/panel_9slice.png",
  "assets/composed/ground.png",
  "assets/composed/roofs.png",
  "assets/composed/interiors.png",
  "assets/composed/meta.json",
  "assets/composed/CREDITS.txt",
  "assets/refs/da_cible_ouvert.jpg",
  "assets/refs/da_cible_toits.jpg",
  "game/scenarios.js",
  "engine/tiled.js",
  "engine/sfx.js",
];

for (const r of required) {
  const p = join(ROOT, r);
  if (!existsSync(p)) fail(`missing ${r}`);
  else ok(r);
}

// tileset meta
const metaPath = join(ROOT, "assets/tilesets/terrain_16.json");
if (existsSync(metaPath)) {
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (meta.tile !== 16) fail("tile size must be 16");
  else ok("tile=16");
  if (!meta.tiles?.length) fail("no tiles in meta");
  else ok(`tiles count=${meta.tiles.length}`);
}

// map + LOD layers
const mapPath = join(ROOT, "assets/map/world.json");
if (existsSync(mapPath)) {
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  if (map.tilewidth !== 16 || map.tileheight !== 16) fail("map tile != 16");
  else ok("map tile 16");
  const names = (map.layers || []).map((l) => l.name);
  for (const need of ["ground", "interiors", "roofs"]) {
    if (!names.includes(need)) fail(`missing layer ${need}`);
    else ok(`layer ${need}`);
  }
  const ground = (map.layers || []).find((l) => l.name === "ground");
  if (!ground?.data?.length) fail("ground layer empty");
  else ok(`ground cells=${ground.data.length}`);
  const nonZero = ground.data.filter((g) => g > 0).length;
  if (nonZero < 100) fail("ground too empty");
  else ok(`ground filled=${nonZero}`);
  const roofs = (map.layers || []).find((l) => l.name === "roofs");
  const ints = (map.layers || []).find((l) => l.name === "interiors");
  if (roofs && roofs.data.filter((g) => g > 0).length < 20) fail("roofs too empty");
  else if (roofs) ok(`roofs filled=${roofs.data.filter((g) => g > 0).length}`);
  if (ints && ints.data.filter((g) => g > 0).length < 10) fail("interiors too empty");
  else if (ints) ok(`interiors filled=${ints.data.filter((g) => g > 0).length}`);
}

// hotspots — aligned to main world (no Rumine)
const hsPath = join(ROOT, "assets/hotspots.json");
if (existsSync(hsPath)) {
  const hs = JSON.parse(readFileSync(hsPath, "utf8"));
  const list = hs.hotspots || [];
  if (list.length < 15) fail("need ≥15 hotspots (sites+rooms)");
  else ok(`hotspots=${list.length}`);
  const ids = new Set();
  for (const h of list) {
    if (!h.id || !h.label) fail(`hotspot incomplete ${JSON.stringify(h)}`);
    if (ids.has(h.id)) fail(`duplicate hotspot ${h.id}`);
    ids.add(h.id);
  }
  for (const need of [
    "parlement",
    "chateau",
    "plenum-gc",
    "college-ce",
    "chancellerie",
    "dep-dfa-projet",
  ]) {
    if (!ids.has(need)) fail(`missing hotspot ${need}`);
  }
  for (const ban of ["palais", "rumine", "cathedrale"]) {
    if (ids.has(ban)) fail(`forbidden hotspot ${ban} (not in main world)`);
  }
  ok("no Rumine/cathédrale; core rooms present");
}

// forbidden strings in runtime assets text
function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(js|json|html|css|md)$/i.test(name)) acc.push(p);
  }
  return acc;
}

const forbid = [/dgnsiwiki/i, /Confluence/];
const scanRoots = [
  join(ROOT, "engine"),
  join(ROOT, "game"),
  join(ROOT, "assets/map"),
  join(ROOT, "assets/hotspots.json"),
  join(ROOT, "app.js"),
  join(ROOT, "index.html"),
];
for (const root of scanRoots) {
  const files = statSync(root).isDirectory?.()
    ? walk(root)
    : existsSync(root)
      ? [root]
      : [];
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    for (const re of forbid) {
      if (re.test(t)) {
        if (strict) fail(`forbidden ${re} in ${f}`);
        else warn(`forbidden pattern ${re} in ${f}`);
      }
    }
  }
}

// PNG signature checks
for (const rel of [
  "assets/composed/ground.png",
  "assets/composed/roofs.png",
  "assets/composed/interiors.png",
  "assets/characters/dossier_16.png",
]) {
  const png = join(ROOT, rel);
  if (!existsSync(png)) continue;
  const buf = readFileSync(png);
  const sig = buf.subarray(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") fail(`${rel} not a PNG`);
  else ok(`${rel} ${buf.length} bytes`);
}

// composed meta
const metaPath = join(ROOT, "assets/composed/meta.json");
if (existsSync(metaPath)) {
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (meta.source !== "kenney-mix") warn(`source=${meta.source}`);
  else ok("composed kenney-mix");
  if (!meta.credit) warn("missing credit");
  else ok("kenney credit present");
}

console.log("");
if (failures) {
  console.error(`FAILED ${failures} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`PASSED with ${warnings} warning(s)`);
