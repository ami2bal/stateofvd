/**
 * S9 « Simple question » — contrôle écrit (LGC art. 113–114).
 * ★ Lifecycle dédié `cycle-question`.
 */

/** @type {object} */
export const SIMPLE_QUESTION = {
  id: "simple-question",
  title: "La simple question",
  subtitle: "S9 — Renseignement écrit — réponse sans discussion",
  objectId: "obj-simple-question-s9",
  objectType: "simple-question",
  objectLabel: "Simple question — demande écrite de renseignement",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-question",
  noAct: true,
  noPublication: true,
  steps: [
    {
      id: "sq-1-depot",
      from: "ebauche",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e",
      actLabel: "Déposer la simple question",
      successLesson:
        "Simple question écrite (art. 113 LGC) : demande de renseignement au CE.",
    },
    {
      id: "sq-2-ce",
      from: "deposee",
      to: "en-preparation-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "CE — instruction",
      actLabel: "Préparer la réponse écrite",
      successLesson:
        "Le CE prépare une réponse écrite (délai 4 semaines — art. 114).",
      startDeadline: "reponse-simple-question",
    },
    {
      id: "sq-3-reponse",
      from: "en-preparation-ce",
      to: "repondue",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "CE → GC",
      actLabel: "Remettre la réponse écrite",
      successLesson:
        "Réponse écrite sans discussion en plénum. ★ Pas d'acte, pas de vote — cycle-question clos.",
    },
  ],
};

export default SIMPLE_QUESTION;
