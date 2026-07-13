/**
 * Design tokens State of VD (TASK-109).
 * Une teinte = une source. Flux sémantiques + ramps d’ambiance.
 */

/**
 * Familles d’actes institutionnels (FlowKind).
 * @typedef {'decision'|'transmission'|'instruction'|'publication'|'controle'|'citoyen'|'coordination'|'default'} FlowKind
 */

/**
 * Palette flux — bijection kind → couleur (stream + pastille tip).
 * @type {Record<FlowKind, { hex: number, css: string, key: FlowKind }>}
 */
export const FLOW_SEMANTIC = {
  decision: { hex: 0x3e7a52, css: "#3E7A52", key: "decision" },
  transmission: { hex: 0x4a6fa5, css: "#4A6FA5", key: "transmission" },
  instruction: { hex: 0xb8893a, css: "#B8893A", key: "instruction" },
  publication: { hex: 0x3d8a7a, css: "#3D8A7A", key: "publication" },
  controle: { hex: 0x7a6a8c, css: "#7A6A8C", key: "controle" },
  citoyen: { hex: 0x8a5c6e, css: "#8A5C6E", key: "citoyen" },
  coordination: { hex: 0x5c7a8a, css: "#5C7A8A", key: "coordination" },
  default: { hex: 0x6a7a8a, css: "#6A7A8A", key: "default" },
};

/** @type {FlowKind[]} */
export const FLOW_KINDS = [
  "decision",
  "transmission",
  "instruction",
  "publication",
  "controle",
  "citoyen",
  "coordination",
];

/**
 * Constantes nommées (évite les strings magiques dans inspector-data / connections).
 * @type {{ [K in FlowKind]: K }}
 */
export const FK = Object.freeze({
  decision: "decision",
  transmission: "transmission",
  instruction: "instruction",
  publication: "publication",
  controle: "controle",
  citoyen: "citoyen",
  coordination: "coordination",
  default: "default",
});

/**
 * @param {string|undefined|null} kind
 * @returns {{ hex: number, css: string, key: FlowKind }}
 */
export function flowColorForKind(kind) {
  const k = String(kind || "default");
  return FLOW_SEMANTIC[k] || FLOW_SEMANTIC.default;
}

/** @param {string|undefined|null} kind */
export function isFlowKind(kind) {
  return !!FLOW_SEMANTIC[String(kind || "")];
}
