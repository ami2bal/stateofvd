/**
 * S22 « Le délai référendaire » (B4-1)
 * Focus pédagogique : publication FAO + horloge de délai — sans urne sur la carte.
 *
 * ★ Distinct de S17 (référendum facultatif complet avec aboutissement / votation hors carte).
 *   Ici le nominal = **aucun aboutissement** → le délai expire → promulgation.
 *   Ancrage spatial : Chancellerie (FAO). Peuple hors géospatial (cadrage produit).
 * Couche contenu — flow-engine / verdict inchangés.
 */

/** @type {object} */
export const DELAI_REFERENDAIRE = {
  id: "delai-referendaire",
  title: "Le délai référendaire",
  subtitle:
    "S22 — Après adoption : publication FAO, horloge du délai, promulgation si silence",
  objectId: "obj-delai-ref-s22",
  objectType: "loi",
  objectLabel: "Acte soumis au référendum facultatif (ex. loi) — délai art. 84",
  pilotBodyId: "chateau",
  lifecycleId: "cycle-projet-acte",
  /** pas de votation sur plateau — focus délai institutionnel */
  citizenPreamble: false,
  deadlineFocus: true,
  steps: [
    {
      id: "s22-1-adopte",
      from: "en-elaboration",
      to: "mise-au-point",
      by: "handover",
      siteId: "parlement",
      actorLabel: "Grand Conseil — texte adopté",
      actLabel: "Constat : l'acte est adopté",
      successLesson:
        "Point de départ pédagogique : le GC a adopté l'acte (EMPL / décret soumis au référendum facultatif). ★ Ce n'est pas encore la fin — la publication ouvre un délai.",
    },
    {
      id: "s22-2-fao",
      from: "mise-au-point",
      to: "publie-delai-referendaire",
      by: "handover",
      siteId: "chateau",
      fromSiteId: "parlement",
      actorLabel: "Chancellerie d'État — FAO",
      actLabel: "Publier à la Feuille des avis officiels",
      startDeadline: "delai-referendaire",
      successLesson:
        "Publication FAO (Chancellerie) : le **délai référendaire** commence à courir (Cst-VD art. 84). ★ Point d'ancrage spatial = Chancellerie, pas le peuple.",
    },
    {
      id: "s22-3-horloge",
      from: "publie-delai-referendaire",
      to: "publie-delai-referendaire",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Horloge institutionnelle",
      actLabel: "Le délai court (tag / calendrier)",
      successLesson:
        "Pendant le délai, le corps électoral peut récolter des signatures — **hors carte** (Le modèle ne spatialise pas le peuple). Sur le plateau, on ne voit que l'institution qui a publié et l'horloge du délai. ★ Souvent mal compris en formation App V2.",
    },
    {
      id: "s22-4-silence",
      from: "publie-delai-referendaire",
      to: "promulgue",
      by: "handover",
      siteId: "chateau",
      actorLabel: "Chancellerie — fin de délai",
      actLabel: "Constater l'absence d'aboutissement",
      successLesson:
        "Aucune demande aboutie dans le délai : voie de la **promulgation**. ★ Cas « silence du corps électoral » — sans urne sur la carte. (Pour l'aboutissement + votation hors carte → voir S17.)",
    },
  ],
  branches: {
    silence: {
      id: "silence",
      finalState: "promulgue",
      label: "Pas d'aboutissement → promulgation",
    },
  },
};

export default DELAI_REFERENDAIRE;
