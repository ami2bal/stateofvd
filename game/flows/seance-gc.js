/**
 * S15 « Séance du Grand Conseil » — rituel d'une journée de séance
 * (LGC art. 82–89, 97–99, 148–151 — repères pédagogiques).
 *
 * ★ Transverse aux instruments : montre le cadre (ODJ → ouverture → débat → vote → clôture),
 *   pas le cycle d'un seul type d'acte. L'objet à l'ODJ est un exemple neutre.
 * Couche de contenu — flow-engine / verdict INCHANGÉS.
 */

/** @type {object} */
export const SEANCE_GC = {
  id: "seance-gc",
  title: "Séance du Grand Conseil",
  subtitle: "S15 — Rituel d'une journée de séance (ODJ → vote → clôture)",
  objectId: "obj-seance-gc-s15",
  objectType: "motion",
  objectLabel: "Objet type à l'ordre du jour (ex. instrument parlementaire)",
  pilotBodyId: "parlement",
  lifecycleId: "cycle-projet-acte",
  noAct: true,
  noPublication: true,
  /** marqueur pédagogique : rituel de séance, pas un instrument */
  sessionRitual: true,
  steps: [
    {
      id: "ss15-1-odj",
      from: "en-elaboration",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Bureau du GC",
      actLabel: "Arrêter l'ordre du jour",
      successLesson:
        "Le Bureau arrête l'ordre du jour de la séance (attributions LGC) : objets, temps, priorités. ★ Cadre de la journée, pas encore le débat.",
    },
    {
      id: "ss15-2-convocation",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "SGC",
      actLabel: "Convoquer et préparer les dossiers",
      successLesson:
        "Le Secrétariat général convoque, distribue les rapports et prépare la salle / les dossiers (appui administratif).",
    },
    {
      id: "ss15-3-ouverture",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "handover",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Présidence — plénum",
      actLabel: "Ouvrir la séance",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Ouverture en hémicycle : quorum, communication, adoption éventuelle de l'ordre du jour. La séance est ouverte.",
    },
    {
      id: "ss15-4-debat",
      from: "entree-en-matiere",
      to: "en-debats",
      by: "handover",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Débattre l'objet à l'ordre du jour",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Débat en plénum sur l'objet appelé (instrument, projet d'acte, pétition…). ★ Le type d'objet change les règles (voir S1–S14) ; le rituel de séance reste le même.",
    },
    {
      id: "ss15-5-vote",
      from: "en-debats",
      to: "vote-final",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin",
      actLabel: "Mettre au vote",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson:
        "Scrutin (majorité simple, qualifiée ou secrète selon l'objet — art. 101/102/104). ★ Ici : vote pédagogique générique.",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejete",
        actLabel: "Rejeter l'objet",
        successLesson:
          "Objet rejeté en séance — classé ou renvoyé selon les règles de l'instrument.",
      },
    },
    {
      id: "ss15-6-cloture",
      from: "vote-final",
      to: "promulgue",
      by: "handover",
      siteId: "parlement",
      actorLabel: "SGC / Présidence",
      actLabel: "Clôturer et dresser le procès-verbal",
      successLesson:
        "Clôture de séance : procès-verbal, suite administrative. Les objets adoptés poursuivent leur cycle propre (publication, mandat CE…).",
    },
  ],
  branches: {
    adopte: { label: "Objet adopté en séance" },
    rejete: { label: "Objet rejeté en séance" },
  },
};

export default SEANCE_GC;
