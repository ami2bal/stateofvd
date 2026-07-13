/**
 * Unit tests resolveTargetLocation (P2).
 * Usage: node proto/state-of-vd/tools/test_resolve_target.mjs
 */
import {
  resolveTargetLocation,
  parseHierarchyLabel,
} from "../game/resolve-target.js";

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("  FAIL", msg);
    fails++;
  } else {
    console.log("  OK  ", msg);
  }
}

function eq(a, b) {
  return a && b && a.siteId === b.siteId && a.roomId === b.roomId;
}

console.log("— structured —");
assert(
  eq(resolveTargetLocation({ siteId: "parlement", roomId: "plenum-gc" }, "x"), {
    siteId: "parlement",
    roomId: "plenum-gc",
  }),
  "structured ref"
);

console.log("— hierarchy —");
const h = parseHierarchyLabel("grand conseil › hémicycle du grand conseil");
assert(h && h.building.includes("grand") && h.room.includes("hémicycle"), "parse ›");
assert(
  eq(
    resolveTargetLocation("Grand Conseil › Hémicycle du Grand Conseil", "x"),
    { siteId: "parlement", roomId: "plenum-gc" }
  ),
  "GC › Hémicycle"
);
assert(
  eq(
    resolveTargetLocation("Conseil d'État › Chancellerie d'État", "x"),
    { siteId: "chateau", roomId: "chancellerie" }
  ),
  "CE › Chancellerie"
);
assert(
  eq(
    resolveTargetLocation("Grand Conseil › Commissions parlementaires", "x"),
    { siteId: "parlement", roomId: "commission" }
  ),
  "GC › Commissions"
);

console.log("— free text / dept —");
assert(
  eq(resolveTargetLocation("publication FAO", "x"), {
    siteId: "chateau",
    roomId: "chancellerie",
  }),
  "FAO → chancellerie"
);
assert(
  eq(resolveTargetLocation("pétition citoyenne", "x"), {
    siteId: "parlement",
    roomId: "sgc",
  }),
  "pétition → sgc"
);
assert(
  eq(resolveTargetLocation("Cabinet", "dep-dfa"), {
    siteId: "dep-dfa",
    roomId: "dep-dfa-cabinet",
  }),
  "dept cabinet"
);
assert(
  eq(resolveTargetLocation("dossier instruction", "dep-dfa"), {
    siteId: "dep-dfa",
    roomId: "dep-dfa-sg",
  }),
  "dept sg"
);
assert(resolveTargetLocation(null, "x") === null, "null → null");

console.log(fails ? `\n${fails} FAIL(s)` : "\nAll OK");
process.exit(fails ? 1 : 0);
