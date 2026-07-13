/**
 * S10 « Question orale » — actualité (LGC art. 112).
 * ★ Lifecycle dédié `cycle-question` (même machine que simple question).
 */

/** @type {object} */
export const QUESTION_ORALE = {
  id: "question-orale",
  title: "La question orale",
  subtitle: "S10 — Actualité — réponse orale en séance",
  objectId: "obj-question-orale-s10",
  objectType: "question-orale",
  objectLabel: "Question orale d'actualité",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-question",
  noAct: true,
  noPublication: true,
  steps: [
    {
      id: "qo-1-depot",
      from: "ebauche",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e",
      actLabel: "Déposer (1er mardi du mois)",
      successLesson:
        "Question orale d'actualité (art. 112 LGC) : dépôt le 1er mardi du mois.",
    },
    {
      id: "qo-2-reponse",
      from: "deposee",
      to: "repondue",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "CE en plénum",
      actLabel: "Répondre oralement (2e mardi)",
      successLesson:
        "Réponse orale le 2e mardi. Format court, pas de discussion étendue ni d'acte — cycle-question clos.",
    },
  ],
};

export default QUESTION_ORALE;
