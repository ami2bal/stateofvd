/**
 * S17 « Référendum facultatif » — suite publication FAO (Cst-VD art. 84).
 *
 * ★ Cadrage V3 : le corps électoral n'est pas un acteur géospatial.
 *   Préambules narratifs hors carte ; démarrage = Chancellerie (institution
 *   qui publie / reçoit le constat). Alignement produit (citoyen hors acteurs
 *   du processus logiciel).
 * Couche de contenu — flow-engine / verdict INCHANGÉS.
 */

/** @type {object} */
export const REFERENDUM = {
  id: "referendum",
  title: "Le référendum facultatif",
  subtitle: "S17 — Après la FAO : délai, signatures, suite institutionnelle",
  objectId: "obj-referendum-s17",
  objectType: "loi",
  objectLabel: "Acte publié — délai référendaire (ex. loi)",
  pilotBodyId: "chateau",
  lifecycleId: "cycle-projet-acte",
  citizenPreamble: true,
  sessionRitual: false,
  steps: [
    {
      id: "ref-0-preambule",
      from: "en-elaboration",
      to: "en-elaboration",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Préambule — hors carte",
      actLabel: "Comprendre le délai référendaire",
      successLesson:
        "Préambule : un acte a été adopté. Pendant le délai référendaire (Cst-VD art. 84), le corps électoral peut récolter des signatures. ★ Hors plateau — Le modèle ne cartographie pas le peuple. On entre dans le flux à la Chancellerie.",
    },
    {
      id: "ref-1-publication",
      from: "en-elaboration",
      to: "publie-delai-referendaire",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie d'État",
      actLabel: "Publier à la FAO et ouvrir le délai",
      successLesson:
        "Publication FAO : le délai référendaire court. Point d'entrée institutionnel du parcours (art. 84 Cst-VD).",
    },
    {
      id: "ref-2-constat",
      from: "publie-delai-referendaire",
      to: "mise-au-point",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie — constat",
      actLabel: "Constater l'issue du délai",
      successLesson:
        "Fin de délai : soit aucune demande aboutie → voie de la promulgation ; soit dépôt de signatures suffisant → suite référendaire. ★ Ici : branche « aboutissement » pédagogique.",
    },
    {
      id: "ref-3-preambule-votation",
      from: "mise-au-point",
      to: "mise-au-point",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Préambule — votation hors carte",
      actLabel: "Votation populaire (hors plateau)",
      successLesson:
        "Préambule : si le référendum aboutit, le peuple vote (corps électoral). ★ Toujours hors carte — le résultat revient ensuite à l'institution pour formalisation.",
    },
    {
      id: "ref-4-suite",
      from: "mise-au-point",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie / CE",
      actLabel: "Formaliser le résultat",
      successLesson:
        "Résultat de la votation formalisé côté État (promulgation si acceptation, ou non-entrée en vigueur si refus). Fin du parcours institutionnel S17.",
    },
  ],
  branches: {
    sans_referendum: { label: "Pas d'aboutissement → promulgation" },
    abouti: { label: "Aboutissement → votation (hors carte) → formalisation" },
  },
};

export default REFERENDUM;
