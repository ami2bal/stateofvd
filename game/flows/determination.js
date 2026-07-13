/**
 * S12 « La détermination » — suite d'interpellation (LGC art. 117).
 * ★ Lifecycle `cycle-determination` ; enchaîne typiquement après S4.
 */

/** @type {object} */
export const DETERMINATION = {
  id: "determination",
  title: "La détermination",
  subtitle: "S12 — Vœu suite à une interpellation (art. 117)",
  objectId: "obj-determination-s12",
  objectType: "determination",
  objectLabel: "Détermination — suite d'interpellation",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-determination",
  noAct: true,
  noPublication: true,
  afterScenarioId: "interpellation",
  steps: [
    {
      id: "det-1-contexte",
      from: "apres-interpellation",
      to: "apres-interpellation",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Après réponse du CE",
      actLabel: "Clôturer l'interpellation",
      successLesson:
        "L'interpellation a reçu réponse (cf. S4). Un·e député·e peut alors déposer une détermination (art. 117 LGC).",
    },
    {
      id: "det-2-depot",
      from: "apres-interpellation",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e",
      actLabel: "Déposer la détermination",
      successLesson:
        "Détermination déposée : déclaration ou vœu lié à l'objet de l'interpellation — pas un projet d'acte.",
    },
    {
      id: "det-3-vote",
      from: "deposee",
      to: "adoptee",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Adopter la détermination",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Détermination adoptée. Suivi du vœu (≈ 3 mois). ★ Pas d'acte d'obligation — cycle-determination clos.",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejetee",
        actLabel: "Rejeter la détermination",
        successLesson: "Détermination rejetée — l'interpellation reste close sans vœu.",
      },
    },
  ],
  branches: {
    adopte: { label: "Adoption du vœu" },
    rejete: { label: "Rejet" },
  },
};

export default DETERMINATION;
