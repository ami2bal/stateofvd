/**
 * S1 « EMPD — petit crédit d'investissement » — golden path (cycle-projet-acte).
 * EMPD = Exposé des motifs et projet de décret (véhicule CE → GC).
 * Substance = crédit d'investissement. Piloté DFA. 9 acts → promulgue.
 */

/** @type {import('../flow-engine.js').FlowEngine extends never ? any : object} */
export const PETIT_CREDIT = {
  id: "petit-credit",
  title: "EMPD — petit crédit d'investissement",
  subtitle:
    "Exposé des motifs et projet de décret accordant un crédit d'investissement (tutoriel)",
  objectId: "obj-empd-petit-credit",
  objectType: "decret",
  objectLabel:
    "EMPD (exposé des motifs et projet de décret) — crédit d'investissement",
  pilotBodyId: "dep-dfa",
  lifecycleId: "cycle-projet-acte",
  steps: [
    {
      id: "step-1-adopte-ce",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      actorLabel: "DFA → Collège du Conseil d'État",
      actLabel: "Présenter l'EMPD au collège et l'adopter",
      lessonWrongDay:
        "Le collège du CE siège le mercredi. Avancez l'horloge (cathédrale) jusqu'au mercredi.",
      successLesson:
        "Le collège adopte l'EMPD (projet de décret de crédit). La Chancellerie prépare la saisine.",
    },
    {
      id: "step-2-saisine",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "Transmettre au Grand Conseil (navette)",
      successLesson: "Navette dorée : le dossier part vers le Secrétariat du Grand Conseil.",
    },
    {
      id: "step-3-rapports",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission du Grand Conseil",
      actLabel: "Déposer le rapport de commission",
      successLesson: "La commission a rapporté. Le plénum peut entrer en matière.",
    },
    {
      id: "step-4-eem",
      from: "rapports-deposes",
      to: "entree-en-matiere",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Voter l'entrée en matière",
      lessonWrongDay:
        "Le Grand Conseil siège le mardi. Avancez l'horloge jusqu'au mardi.",
      successLesson: "Entrée en matière acceptée.",
    },
    {
      id: "step-5-debats",
      from: "entree-en-matiere",
      to: "en-debats",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Ouvrir les débats",
      lessonWrongDay:
        "Les débats se tiennent un mardi de séance du Grand Conseil.",
      successLesson: "Les débats sont ouverts.",
    },
    {
      id: "step-6-vote-final",
      from: "en-debats",
      to: "vote-final",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum du Grand Conseil",
      actLabel: "Clore les débats et mettre au vote",
      lessonWrongDay: "Le vote final a lieu un mardi de séance.",
      successLesson: "Le dossier est mis au vote final.",
    },
    {
      id: "step-7-adopte-gc",
      from: "vote-final",
      to: "mise-au-point",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin",
      actLabel: "Vote final favorable",
      lessonWrongDay: "Le scrutin a lieu un mardi de séance du Grand Conseil.",
      successLesson: "Vote final favorable. Mise au point du texte.",
      // Branche pédagogique : le GC peut aussi refuser (visible fil d'Ariane + carte)
      rejectAlt: {
        to: "rejete",
        decisionType: "refuse",
        actLabel: "Vote final — refus",
        successLesson:
          "Le Grand Conseil refuse le projet de décret. L'EMPD est rejeté — fin de parcours.",
      },
    },
    {
      id: "step-8-publication",
      from: "mise-au-point",
      to: "publie-delai-referendaire",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Chancellerie — publication FAO",
      actLabel: "Mettre au point et publier",
      successLesson: "Texte publié (Chancellerie / FAO). Le délai référendaire commence.",
      startDeadline: "delai-referendaire",
    },
    {
      id: "step-9-promulgue",
      from: "publie-delai-referendaire",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie / FAO",
      actLabel: "Promulguer",
      successLesson: "L'acte est promulgué. Tutoriel terminé.",
    },
  ],
};

export default PETIT_CREDIT;
