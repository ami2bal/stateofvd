/**
 * S4 « L'interpellation » — contrôle / haute surveillance (LGC art. 115/137).
 * ★ 0 acte, 0 publication. Lifecycle `cycle-interpellation`.
 */

/** @type {object} */
export const INTERPELLATION = {
  id: "interpellation",
  title: "L'interpellation",
  subtitle: "S4 — Contrôle / haute surveillance (pas d'acte)",
  objectId: "obj-interpellation-s4",
  objectType: "interpellation",
  objectLabel: "Interpellation — demande d'explications au CE",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-interpellation",
  noAct: true,
  noPublication: true,
  steps: [
    {
      id: "s4-1-depot",
      from: "ebauche",
      to: "deposee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Député·e — dépôt",
      actLabel: "Adresser une demande d'explications",
      successLesson:
        "Interpellation déposée (art. 115 LGC) : demande d'explications sur un fait du gouvernement ou de l'administration.",
    },
    {
      id: "s4-2-developpement",
      from: "deposee",
      to: "developpee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Interpellateur·rice — plénum",
      actLabel: "Développer la demande en plénum",
      successLesson:
        "L'interpellateur·rice développe sa demande à l'hémicycle (art. 115).",
    },
    {
      id: "s4-3-preparation-ce",
      from: "developpee",
      to: "en-preparation-ce",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Conseil d'État — préparation",
      actLabel: "Préparer la réponse (CE représenté)",
      successLesson:
        "Le CE prépare sa réponse ; il doit être représenté (art. 137 LGC).",
    },
    {
      id: "s4-4-reponse-ce",
      from: "en-preparation-ce",
      to: "repondue",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "CE — réponse en plénum",
      actLabel: "Répondre (oral / écrit)",
      successLesson:
        "Réponse du CE en plénum (art. 115) ; délai applicable si différé (art. 111).",
    },
    {
      id: "s4-5-satisfaction",
      from: "repondue",
      to: "closee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Interpellateur·rice — satisfaction",
      actLabel: "Déclarer être satisfait·e ou non",
      successLesson:
        "★ Clôture sans acte : discussion + déclaration de satisfaction. Aucun vote contraignant, aucune publication (art. 115). Cycle-interpellation clos.",
    },
    {
      id: "s4-6-resolution-optionnelle",
      from: "closee",
      to: "closee",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Assemblée — vœu optionnel",
      actLabel: "Éventuelle résolution (20 députés)",
      successLesson:
        "Option : résolution (art. 136) ou détermination (art. 117 / S12) — hors acte législatif. Voir S11/S12.",
    },
  ],
  branches: {
    satisfait: { label: "Satisfait — clôturée" },
    non_satisfait: {
      label: "Non satisfait — clôturée (éventuelle motion/résolution hors S4)",
    },
    differe: { label: "Réponse différée (délai art. 111)" },
  },
};

export default INTERPELLATION;
