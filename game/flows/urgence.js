/**
 * S23 « Urgence / procédure accélérée » (B4-3)
 * Contraste pédagogique avec S1 (cycle normal) : moins d'étapes, tag urgence.
 * ★ Scénario only — flow-engine / verdict inchangés.
 */

/** @type {object} */
export const URGENCE = {
  id: "urgence",
  title: "EMPD — procédure d'urgence",
  subtitle:
    "S23 — Cycle accéléré : moins de commission, tag urgence (contraste vs S1)",
  objectId: "obj-empd-urgence",
  objectType: "decret",
  objectLabel:
    "EMPD (exposé des motifs et projet de décret) — crédit d'urgence (fictif)",
  pilotBodyId: "dep-dfa",
  lifecycleId: "cycle-projet-acte",
  /** marqueur pédagogique pour UI / formation */
  urgency: true,
  steps: [
    {
      id: "s23-1-ce",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "DFA → Collège du CE",
      actLabel: "Adopter l'EMPD en urgence",
      lessonWrongDay: "Le collège du CE siège le mercredi.",
      successLesson:
        "★ Tag **urgence** : le collège adopte l'EMPD hors calendrier « confortable ». Contraste avec le tutoriel S1 (cycle normal).",
    },
    {
      id: "s23-2-navette",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "Saisir le GC en priorité",
      successLesson:
        "Navette accélérée : le dossier est priorisé à l'agenda du Grand Conseil.",
    },
    {
      id: "s23-3-commission",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission (examen express)",
      actLabel: "Rapport en délai court",
      successLesson:
        "★ Moins d'étapes commission : examen express, un seul rapport. Pas le temps long de S1/S2.",
    },
    {
      id: "s23-4-plenum",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Entrée en matière (urgence)",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson: "Entrée en matière acceptée en procédure accélérée.",
    },
    {
      id: "s23-5-vote",
      from: "entree-en-matiere",
      to: "mise-au-point",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin",
      actLabel: "Débat court et vote final",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Débat compressé + vote final le même temps pédagogique. ★ Contraste fort avec S1 (EEM → débats → clôture → scrutin séparés).",
    },
    {
      id: "s23-6-promulgue",
      from: "mise-au-point",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Chancellerie",
      actLabel: "Mettre au point et promulguer",
      successLesson:
        "Acte promulgué. Fin S23 — le joueur a vu un cycle **court** face au cycle normal S1.",
    },
  ],
  branches: {
    adopte: { label: "Urgence aboutie → promulgation" },
  },
};

export default URGENCE;
