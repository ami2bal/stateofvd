/**
 * S19 « Révision constitutionnelle partielle » — portée institutionnelle (CE/GC).
 *
 * ★ Cadrage V3/E : aucun acteur peuple géospatial.
 *   Entrée = institutions déjà sur la carte (DPT → CE → GC → Chancellerie).
 *   Fin = votation obligatoire (préambule hors carte), comme le référendum S17
 *   mais *obligatoire* (Cst-VD art. 83 a), pas facultatif (art. 84).
 *
 * ★ Périmètre pédagogique : révision *partielle* proposée / portée par l'État.
 *   Révision totale, constituante, initiative constitutionnelle populaire :
 *   hors ce scénario (voir S18 + notes COVERAGE) — trop de branches pour un premier cut.
 *
 * Couche de contenu — flow-engine / verdict INCHANGÉS.
 */

/** @type {object} */
export const REVISION_CONSTITUTIONNELLE = {
  id: "revision-constitutionnelle",
  title: "Révision constitutionnelle (partielle)",
  subtitle: "S19 — Projet d'acte → GC → votation obligatoire (hors carte)",
  objectId: "obj-revision-cst-s19",
  objectType: "revision-constitutionnelle",
  objectLabel: "Projet de révision constitutionnelle partielle",
  pilotBodyId: "dep-dits",
  lifecycleId: "cycle-projet-acte",
  citizenPreamble: true,
  /** référendum obligatoire en fin de parcours */
  mandatoryReferendum: true,
  steps: [
    {
      id: "rev-1-dpt",
      from: "en-elaboration",
      to: "en-elaboration",
      by: "handover",
      siteId: "dep-dits",
      actorLabel: "Département — instruction",
      actLabel: "Élaborer le projet de révision partielle",
      successLesson:
        "Instruction départementale d'une révision *partielle* (dispositions intrinsèquement liées — Cst-VD art. 174). ★ Entrée institutionnelle ; pas d'acteur citoyen sur le plateau.",
    },
    {
      id: "rev-2-college",
      from: "en-elaboration",
      to: "adopte-ce",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "ce",
      siteId: "chateau",
      fromSiteId: "dep-dits",
      actorLabel: "Collège du CE",
      actLabel: "Adopter le projet au collège",
      lessonWrongDay: "Le collège du CE siège le mercredi.",
      successLesson:
        "Le collège adopte le projet de révision partielle et le transmet au Grand Conseil (même logique navette qu'un EMPL, rang constitutionnel).",
    },
    {
      id: "rev-3-saisine",
      from: "adopte-ce",
      to: "saisine-commission",
      by: "handover",
      siteId: "parlement",
      fromSiteId: "chateau",
      actorLabel: "Chancellerie → SGC",
      actLabel: "Transmettre au Grand Conseil",
      successLesson:
        "Saisine du GC via le SGC (Secrétariat général du Grand Conseil).",
    },
    {
      id: "rev-4-comm",
      from: "saisine-commission",
      to: "rapports-deposes",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Commission",
      actLabel: "Examiner et rapporter",
      successLesson:
        "Examen en commission et rapport avant les débats (LGC : au moins deux débats pour une révision constitutionnelle).",
    },
    {
      id: "rev-5-debats",
      from: "rapports-deposes",
      to: "en-debats",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum",
      actLabel: "Débattre (2 débats min.)",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Débats en plénum (minimum deux débats — LGC). ★ Rang constitutionnel : enjeu politique élevé.",
    },
    {
      id: "rev-6-vote",
      from: "en-debats",
      to: "mise-au-point",
      by: "decision",
      decisionType: "adopte",
      weekdayTag: "gc",
      siteId: "parlement",
      actorLabel: "Plénum — scrutin",
      actLabel: "Adopter le projet de révision",
      lessonWrongDay: "Le Grand Conseil siège le mardi.",
      successLesson:
        "Projet adopté par le GC. ★ Suite obligatoire : votation populaire (Cst-VD art. 83 a) — pas un simple délai facultatif art. 84.",
      rejectAlt: {
        decisionType: "refuse",
        to: "rejete",
        actLabel: "Rejeter le projet",
        successLesson: "Rejet en plénum — fin de branche pédagogique (pas de votation).",
      },
    },
    {
      id: "rev-7-preambule-votation",
      from: "mise-au-point",
      to: "publie-delai-referendaire",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Préambule — hors carte",
      actLabel: "Votation populaire obligatoire",
      successLesson:
        "Préambule (même logique que S17) : le corps électoral se prononce — *référendum obligatoire* (art. 83 a), pas de récolte de signatures. ★ Aucun site « urne » sur le plateau ; produit ne modélise pas le citoyen comme acteur du processus.",
    },
    {
      id: "rev-8-formalise",
      from: "publie-delai-referendaire",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie d'État",
      actLabel: "Formaliser le résultat",
      successLesson:
        "Retour institutionnel : la Chancellerie formalise le résultat de la votation (entrée en vigueur si acceptation, caducité si refus). Fin du parcours S19.",
    },
  ],
  branches: {
    adopte: { label: "Adoption GC → votation obligatoire → formalisation" },
    rejete: { label: "Rejet GC — pas de votation" },
  },
};

export default REVISION_CONSTITUTIONNELLE;
