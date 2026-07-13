/**
 * Verdict after the gesture (La Navette grammar).
 * Neutral attempt → ACCORDE | REFUS+lesson — never game over.
 * No Date.now / Math.random.
 */

/** States where CE may withdraw (art. 137 al. 4) — until definitive vote. */
export const WITHDRAW_PRE_VOTE = new Set([
  "en-elaboration",
  "adopte-ce",
  "saisine-commission",
  "rapports-deposes",
  "entree-en-matiere",
  "en-debats",
]);

/**
 * @typedef {object} ActAttempt
 * @property {string} stepId
 * @property {string} from
 * @property {string} to
 * @property {string} by
 * @property {string} [decisionType]
 * @property {string} [weekdayTag] required clock tag (ce|gc|…)
 * @property {string} [siteId]
 */

/**
 * @param {object} args
 * @param {ActAttempt} args.expected current golden-path step
 * @param {object} args.object { state, id, objectType }
 * @param {object} args.lifecycle profile lifecycle (states + transitions)
 * @param {object} args.clock { weekdayTag, day, formatHud }
 * @param {object} [args.attempt] optional override fields from UI
 * @param {object} [args.conflict] { support, threshold, majority } for qualified vote
 * @returns {{verdict:'ACCORDE'|'REFUS', lesson?:string, stamp:string, transition?:object, wrongDay?:boolean, support?:number}}
 */
export function evaluateAct({ expected, object, lifecycle, clock, attempt, conflict }) {
  attempt = attempt || {};
  const stamp = "verdict";

  if (!expected) {
    return {
      verdict: "REFUS",
      lesson: "Aucun acte n'est attendu pour le moment.",
      stamp,
    };
  }

  if (object.state !== expected.from) {
    return {
      verdict: "REFUS",
      lesson: `L'objet est en « ${object.state} », pas en « ${expected.from} ».`,
      stamp,
    };
  }

  // Temporal constraint (week-type)
  if (expected.weekdayTag && clock.weekdayTag !== expected.weekdayTag) {
    return {
      verdict: "REFUS",
      wrongDay: true,
      lesson:
        expected.lessonWrongDay ||
        `Ce n'est pas le bon jour (aujourd'hui : ${clock.weekdayTag}). Avancez l'horloge jusqu'au rendez-vous.`,
      stamp,
    };
  }

  // Transition must exist in profile lifecycle
  const tr = (lifecycle.transitions || []).find(
    (t) =>
      t.from === expected.from &&
      t.to === expected.to &&
      t.by === expected.by &&
      (expected.by !== "decision" || t.decisionType === expected.decisionType)
  );
  if (!tr) {
    return {
      verdict: "REFUS",
      lesson: "Transition hors profil (cycle-projet-acte) — acte impossible.",
      stamp,
    };
  }

  // Optional: player must target the expected step (id or stepId)
  const expectedId = expected.stepId || expected.id;
  if (attempt.stepId && expectedId && attempt.stepId !== expectedId) {
    return {
      verdict: "REFUS",
      lesson: "Ce n'est pas l'acte attendu à cette étape.",
      stamp,
    };
  }

  // Qualified majority (art. 102 absolute-members) on final scrutin adopte
  if (
    expected.qualifiedVote &&
    expected.decisionType === "adopte" &&
    conflict
  ) {
    const thr = conflict.threshold != null ? conflict.threshold : 76;
    const support = conflict.support != null ? conflict.support : 0;
    if (support < thr) {
      return {
        verdict: "REFUS",
        lesson: `Majorité absolue des membres non atteinte (soutien ${support}/150, seuil ${thr}). Art. 102 LGC.`,
        stamp,
        support,
        threshold: thr,
        majorityFail: true,
      };
    }
  }

  return {
    verdict: "ACCORDE",
    stamp,
    transition: tr,
    lesson: expected.successLesson || null,
    support: conflict ? conflict.support : undefined,
  };
}

/**
 * Can the author (CE) withdraw the project? (art. 137 al. 4)
 * @param {string} state
 * @param {string[]} [allowed] override list from scenario
 */
export function canWithdraw(state, allowed) {
  if (!state) return false;
  if (allowed && allowed.length) return allowed.includes(state);
  return WITHDRAW_PRE_VOTE.has(state);
}

/**
 * Evaluate CE withdrawal (author-act → retire).
 */
export function evaluateWithdraw({ object, lifecycle, allowedStates }) {
  const stamp = "verdict";
  if (!object) {
    return { verdict: "REFUS", lesson: "Aucun objet.", stamp };
  }
  if (!canWithdraw(object.state, allowedStates)) {
    return {
      verdict: "REFUS",
      lesson:
        "Le CE ne peut plus retirer son projet après l'ouverture du vote définitif (art. 137 al. 4 LGC).",
      stamp,
      withdrawTooLate: true,
    };
  }
  const tr = (lifecycle.transitions || []).find(
    (t) => t.from === object.state && t.to === "retire" && t.by === "author-act"
  );
  if (!tr) {
    return {
      verdict: "REFUS",
      lesson: "Retrait impossible depuis cet état (hors profil).",
      stamp,
    };
  }
  return {
    verdict: "ACCORDE",
    stamp,
    transition: tr,
    lesson: "Le Conseil d'État retire son projet (art. 137 al. 4).",
  };
}

/**
 * Admit amendment in 2nd debate → 3rd reading (stay en-debats, art. 101).
 * Pure check — engine applies counters.
 */
export function evaluateAmendment({ object, alreadyResolved }) {
  const stamp = "verdict";
  if (!object || object.state !== "en-debats") {
    return {
      verdict: "REFUS",
      lesson: "Un amendement ne s'admet qu'en débats (en-debats).",
      stamp,
    };
  }
  if (alreadyResolved) {
    return {
      verdict: "REFUS",
      lesson: "Le sort de l'amendement a déjà été tranché.",
      stamp,
    };
  }
  return {
    verdict: "ACCORDE",
    stamp,
    lesson:
      "Amendement admis — troisième débat requis (compteur de lecture +1). L'objet reste en débats.",
    stayInState: true,
  };
}

/**
 * Pure path replay (no clock) — for structural checks.
 * @returns {{ok:boolean, states:string[], errors:string[]}}
 */
export function replayGoldenPath(lifecycle, steps) {
  const states = [];
  const errors = [];
  let state = (lifecycle.states || []).find((s) => s.initial)?.id;
  if (!state) {
    errors.push("no initial state");
    return { ok: false, states, errors };
  }
  states.push(state);
  const trans = lifecycle.transitions || [];
  for (const step of steps) {
    if (state !== step.from) {
      errors.push(`expected state ${step.from}, got ${state} at ${step.id}`);
      break;
    }
    const ok = trans.some(
      (t) =>
        t.from === step.from &&
        t.to === step.to &&
        t.by === step.by &&
        (step.by !== "decision" || t.decisionType === step.decisionType)
    );
    if (!ok) {
      errors.push(`missing transition for ${step.id}: ${step.from}→${step.to}`);
      break;
    }
    state = step.to;
    states.push(state);
  }
  return { ok: errors.length === 0, states, errors, final: state };
}
