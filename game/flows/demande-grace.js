/**
 * S14 « Demande de grâce » — LGC art. 103–104.
 *
 * ★ Lifecycle dédié `cycle-grace` + flag secretBallot sur le scrutin.
 * ★ Cadrage V3 : préambule hors carte ; démarrage SGC.
 */

/** @type {object} */
export const DEMANDE_GRACE = {
  id: "demande-de-grace",
  title: "La demande de grâce",
  subtitle: "S14 — Scrutin secret sans discussion (art. 103–104)",
  objectId: "obj-grace-s14",
  objectType: "demande-de-grace",
  objectLabel: "Demande de grâce",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-grace",
  noPublication: true,
  citizenPreamble: true,
  steps: [
    {
      id: "gr-0-preambule",
      from: "ebauche",
      to: "ebauche",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Préambule — hors carte",
      actLabel: "Comprendre le parcours préalable",
      successLesson:
        "Préambule : requête individuelle préparée hors institutions cartographiées. ★ Le modèle ne cartographie pas le citoyen comme acteur — entrée au SGC.",
    },
    {
      id: "gr-1-depot",
      from: "ebauche",
      to: "recue-sgc",
      by: "handover",
      siteId: "parlement",
      actorLabel: "SGC — réception",
      actLabel: "Recevoir la demande de grâce",
      successLesson:
        "Demande reçue au Secrétariat général du Grand Conseil (art. 103 LGC).",
    },
    {
      id: "gr-2-rapport",
      from: "recue-sgc",
      to: "rapport-distribue",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission / rapport",
      actLabel: "Distribuer le rapport (≥ 5 jours)",
      successLesson:
        "Rapport distribué au moins 5 jours avant le scrutin (art. 104 LGC).",
    },
    {
      id: "gr-3-scrutin",
      from: "rapport-distribue",
      to: "votee-secret",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin secret",
      actLabel: "Voter sans discussion (secret)",
      /** active l'UI « secret » du Mode Parcours */
      secretBallot: true,
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "★ Scrutin secret, sans discussion (art. 104). Aucun débat public, résultat global seulement.",
      rejectAlt: {
        decisionType: "refuse",
        to: "refusee-secret",
        actLabel: "Rejeter la grâce (secret)",
        successLesson:
          "Rejet en scrutin secret — fin de la procédure de grâce (art. 103–104).",
      },
    },
  ],
  branches: {
    adopte: { label: "Grâce accordée (secret)" },
    rejete: { label: "Grâce refusée (secret)" },
  },
};

export default DEMANDE_GRACE;
