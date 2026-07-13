/**
 * S13 « L'initiative » — projet rédigé (LGC art. 127–135).
 * ★ Lifecycle `cycle-initiative-parlementaire` (≠ initiative populaire S18).
 */

/** @type {object} */
export const INITIATIVE = {
  id: "initiative",
  title: "L'initiative",
  subtitle: "S13 — Projet rédigé de toutes pièces (art. 127–135)",
  objectId: "obj-initiative-s13",
  objectType: "initiative",
  objectLabel: "Initiative parlementaire — texte rédigé",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-initiative-parlementaire",
  steps: [
    {
      id: "ini-1-depot",
      from: "ebauche",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e·s",
      actLabel: "Déposer l'initiative (texte rédigé)",
      successLesson:
        "Initiative déposée (art. 127 LGC) : projet déjà rédigé — pas une simple invitation à légiférer (≠ motion).",
    },
    {
      id: "ini-2-preavis",
      from: "deposee",
      to: "preavisee-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "CE — préavis",
      actLabel: "Rendre le préavis du CE",
      successLesson:
        "Le CE rend un préavis dans le délai fixé par le GC (art. 127+). ★ Simplifié pédagogiquement.",
    },
    {
      id: "ini-3-comm",
      from: "preavisee-ce",
      to: "en-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Commission",
      actLabel: "Examiner et rapporter",
      successLesson:
        "Commission saisie après préavis ; rapport avant débat plénier.",
    },
    {
      id: "ini-4-plenum",
      from: "en-commission",
      to: "statuee-gc",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Débattre et statuer sur l'initiative",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Débat plénier. Issues typiques : adoption (→ circuit d'acte), rejet, transformation…",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejetee",
        actLabel: "Rejeter l'initiative",
        successLesson: "Initiative rejetée — classée (art. 127+).",
      },
    },
    {
      id: "ini-5-suite",
      from: "statuee-gc",
      to: "renvoyee-circuit-acte",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Si texte retenu",
      actLabel: "Entrer dans le circuit projet d'acte",
      successLesson:
        "Si le texte est retenu, il rejoint le circuit projet d'acte (loi/décret) — voir S1/S6. ★ Cycle-initiative-parlementaire clos.",
    },
  ],
  branches: {
    adopte: { label: "Adoption → circuit d'acte" },
    rejete: { label: "Rejet — classée" },
  },
};

export default INITIATIVE;
