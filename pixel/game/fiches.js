/**
 * Fiches = source main (inspector.js) + resolve pour hotspots pixel.
 */
import {
  FICHES,
  ACRONYM_FULL,
  expandTitleAcronyms,
} from "./from-main.js";

export { FICHES, ACRONYM_FULL, expandTitleAcronyms };

const ROOM_INDEX = (() => {
  const map = {};
  for (const [siteId, fiche] of Object.entries(FICHES)) {
    for (const room of fiche.rooms || []) {
      map[room.id] = { siteId, room, site: fiche };
    }
  }
  return map;
})();

/**
 * @param {{ id?:string, kind?:string, siteId?:string, siteKind?:string, label?:string, sub?:string }} hs
 */
export function resolveFiche(hs) {
  if (!hs) return null;
  const id = hs.id || "";
  if (hs.kind === "room" || ROOM_INDEX[id]) {
    const hit = ROOM_INDEX[id];
    if (hit) {
      return {
        title: expandTitleAcronyms(hit.room.title),
        subtitle: `${hit.site.title} · salle`,
        body: hit.room.text,
        accent: hit.site.accent,
        badge: "Salle",
        rooms: null,
        siteId: hit.siteId,
        siteTitle: hit.site.title,
      };
    }
    const siteKey = hs.siteId || "";
    const site = FICHES[siteKey];
    let roomTitle = hs.label || id;
    if (/cabinet/i.test(id)) roomTitle = "Cabinet du chef de département";
    else if (/-sg$/i.test(id)) roomTitle = "SG — Secrétariat général";
    else if (/projet|empd/i.test(id))
      roomTitle = "Projet EMPD — exposé des motifs et projet de décret";
    if (site) {
      return {
        title: expandTitleAcronyms(roomTitle),
        subtitle: `${site.title} · salle`,
        body: site.body,
        accent: site.accent,
        badge: "Salle",
        rooms: null,
        siteId: siteKey,
        siteTitle: site.title,
      };
    }
    return {
      title: expandTitleAcronyms(roomTitle),
      subtitle: hs.sub || "Salle",
      body: "Espace de travail institutionnel.",
      accent: "#5c6e8a",
      badge: "Salle",
      rooms: null,
    };
  }
  const siteKey = hs.siteId || id;
  const fiche = FICHES[siteKey];
  if (fiche) {
    return {
      title: expandTitleAcronyms(fiche.title),
      subtitle: fiche.subtitle,
      body: fiche.body,
      accent: fiche.accent,
      badge:
        hs.siteKind === "parlement" || siteKey === "parlement"
          ? "Grand Conseil"
          : hs.siteKind === "chateau" || siteKey === "chateau"
            ? "Conseil d'État"
            : "Département",
      rooms: fiche.rooms || null,
      siteId: siteKey,
      siteTitle: fiche.title,
    };
  }
  return {
    title: expandTitleAcronyms(hs.label || id),
    subtitle: hs.sub || "Lieu",
    body: "",
    accent: "#2f4266",
    badge: "Lieu",
    rooms: null,
  };
}
