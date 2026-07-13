/**
 * Unit tests pure — room-nomenclature (industrialisation 2026).
 * Usage: node proto/state-of-vd/tools/test_room_nomenclature.mjs
 */
import {
  roomLabelShort,
  roomLabelFull,
  roomLabelDetail,
} from "../engine/room-nomenclature.js";
import { collectScenarioStops as collectStops } from "../game/step-badges.js";

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("  FAIL", msg);
    fails++;
  } else {
    console.log("  OK  ", msg);
  }
}

console.log("— room labels —");
assert(roomLabelShort("plenum-gc") === "Hémicycle", "plenum short = Hémicycle");
assert(
  roomLabelFull("plenum-gc").includes("Hémicycle"),
  "plenum full institutional"
);
assert(
  roomLabelFull("pas-perdus") === "Salle des pas perdus",
  "pas-perdus full"
);
assert(roomLabelShort("pas-perdus") === "Pas perdus", "pas-perdus short");
assert(roomLabelShort("sgc") === "SGC", "sgc short");
assert(
  roomLabelDetail("sgc").includes("Secrétariat"),
  "sgc detail expands acronym"
);
assert(roomLabelShort("college-ce") === "Collège", "college short");
assert(
  roomLabelFull("college-ce").includes("Conseil d'État"),
  "college full"
);
assert(roomLabelShort("dep-dfa-projet") === "EMPD", "dept projet short");
assert(
  roomLabelFull("dep-dfa-projet").toLowerCase().includes("empd"),
  "dept projet full"
);

console.log("— collect stops ranges —");
const steps = [
  { siteId: "a", id: "1" },
  { siteId: "a", id: "2" },
  { siteId: "b", id: "3" },
  { siteId: "a", id: "4" },
];
const metaFn = () => ({ roomId: "r" });
// same room for all via meta
const metaSame = (s) => ({
  roomId: s.siteId === "a" ? "ra" : "rb",
});
const stops = collectStops(steps, metaSame);
assert(stops.length === 3, `3 visits (a,a contigu →1) + b + a = 3 got ${stops.length}`);
assert(stops[0].nLabel === "1-2", `range 1-2 got ${stops[0].nLabel}`);
assert(stops[1].nLabel === "3", `single 3 got ${stops[1].nLabel}`);
assert(stops[2].nLabel === "4", `return visit 4 got ${stops[2].nLabel}`);

console.log(fails ? `\n${fails} FAIL(s)` : "\nAll OK");
process.exit(fails ? 1 : 0);
