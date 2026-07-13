/**
 * Unit tests FlowKind / palette (industrialisation lot 2).
 * Usage: node proto/state-of-vd/tools/test_flow_kind.mjs
 */
import {
  FK,
  FLOW_KINDS,
  FLOW_SEMANTIC,
  flowColorForKind,
  isFlowKind,
} from "../engine/theme.js";

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("  FAIL", msg);
    fails++;
  } else {
    console.log("  OK  ", msg);
  }
}

console.log("— FlowKind —");
assert(FLOW_KINDS.length === 7, "7 semantic kinds");
for (const k of FLOW_KINDS) {
  assert(FK[k] === k, `FK.${k}`);
  assert(isFlowKind(k), `isFlowKind(${k})`);
  const c = flowColorForKind(k);
  assert(c.key === k || c.css, `color for ${k}`);
}
assert(flowColorForKind(null).key === "default", "null → default");
assert(flowColorForKind("unknown").key === "default", "unknown → default");
assert(
  flowColorForKind(FK.decision).css === FLOW_SEMANTIC.decision.css,
  "FK.decision matches semantic"
);
assert(
  new Set(Object.values(FLOW_SEMANTIC).map((x) => x.css)).size ===
    Object.keys(FLOW_SEMANTIC).length,
  "unique css colors"
);

console.log(fails ? `\n${fails} FAIL(s)` : "\nAll OK");
process.exit(fails ? 1 : 0);
