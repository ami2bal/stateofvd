/**
 * Central UI mode (TASK-113) — replaces boolean matrix.
 *
 * | Mode              | pin | hover flux | inspector institution | board lock |
 * |-------------------|-----|------------|----------------------|------------|
 * | EXPLORE           | ✅  | ❌         | hover/pin            | ❌         |
 * | PINNED            | ✅  | ✅         | pin fiche            | ❌         |
 * | PARCOURS_PLAYING  | ❌  | ❌         | silent / hide        | ✅         |
 * | PARCOURS_PAUSED   | ✅  | ✅ si pin  | silent if card open  | ❌         |
 */

export const UIMode = {
  EXPLORE: "explore",
  PINNED: "pinned",
  PARCOURS_PLAYING: "parcours_playing",
  PARCOURS_PAUSED: "parcours_paused",
};

/**
 * @param {{
 *   playing?: boolean,
 *   pinned?: boolean,
 *   cardOpen?: boolean,
 *   dossierFollowing?: boolean,
 * }} st
 */
export function deriveUiMode(st) {
  const playing = !!st?.playing;
  if (playing) return UIMode.PARCOURS_PLAYING;
  const cardOpen = !!st?.cardOpen;
  const dossierFollowing = !!st?.dossierFollowing;
  // paused parcours: card or mid-travel without play
  if (cardOpen || dossierFollowing) return UIMode.PARCOURS_PAUSED;
  if (st?.pinned) return UIMode.PINNED;
  return UIMode.EXPLORE;
}

/**
 * @param {string} mode
 * @returns {{
 *   allowsPin: boolean,
 *   allowsHoverFlow: boolean,
 *   silentInspector: boolean,
 *   showInstitutionInspector: boolean,
 *   lockBoard: boolean,
 * }}
 */
export function modePolicy(mode) {
  switch (mode) {
    case UIMode.PARCOURS_PLAYING:
      return {
        allowsPin: false,
        allowsHoverFlow: false,
        silentInspector: true,
        showInstitutionInspector: false,
        lockBoard: true,
      };
    case UIMode.PARCOURS_PAUSED:
      return {
        allowsPin: true,
        allowsHoverFlow: true,
        silentInspector: true, // card parcours owns narrative
        showInstitutionInspector: false,
        lockBoard: false,
      };
    case UIMode.PINNED:
      return {
        allowsPin: true,
        allowsHoverFlow: true,
        silentInspector: false,
        showInstitutionInspector: true,
        lockBoard: false,
      };
    case UIMode.EXPLORE:
    default:
      return {
        allowsPin: true,
        allowsHoverFlow: false,
        silentInspector: false,
        showInstitutionInspector: true,
        lockBoard: false,
      };
  }
}
