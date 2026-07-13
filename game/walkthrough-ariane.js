/**
 * Fil d'Ariane DOM + anneau timer de carte (extrait walkthrough, lot A3).
 * L'orchestrateur garde la logique métier ; ce module = montage + helpers UI purs.
 */

export const ARIANE_INNER_HTML = `
  <div class="sa-label" id="sa-label"></div>
  <ol class="sa-steps" id="sa-steps"></ol>
  <div class="sa-await-hint" id="sa-await-hint">À vous de choisir une issue</div>
  <div class="sa-branch-row" id="sa-branch-row" role="group" aria-label="Choix d'issue"></div>
  <div class="sa-end-row" id="sa-end-row" role="group" aria-label="Fin de parcours"></div>
`;

/**
 * Monte (ou répare) le fil d'Ariane sous le HUD.
 * @param {HTMLElement} hudMount
 * @returns {{
 *   root: HTMLElement,
 *   label: HTMLElement|null,
 *   steps: HTMLElement|null,
 *   branchRow: HTMLElement|null,
 *   awaitHint: HTMLElement|null,
 *   endRow: HTMLElement|null,
 * }}
 */
export function mountAriane(hudMount) {
  let root = document.getElementById("sovd-step-ariane");
  if (!root) {
    root = document.createElement("div");
    root.id = "sovd-step-ariane";
    root.innerHTML = ARIANE_INNER_HTML;
    hudMount.appendChild(root);
  } else if (!root.querySelector("#sa-end-row")) {
    root.innerHTML = ARIANE_INNER_HTML;
  }
  return {
    root,
    label: root.querySelector("#sa-label"),
    steps: root.querySelector("#sa-steps"),
    branchRow: root.querySelector("#sa-branch-row"),
    awaitHint: root.querySelector("#sa-await-hint"),
    endRow: root.querySelector("#sa-end-row"),
  };
}

/** Circonférence SVG anneau r=12 (stroke-dasharray). */
export const TIMER_CIRC = 2 * Math.PI * 12;

/**
 * Contrôleur anneau timer sur la carte d'étape.
 * @param {HTMLElement} card
 */
export function createCardTimer(card) {
  /** @type {{ start: number, duration: number }|null} */
  let stepTimer = null;

  function stop() {
    stepTimer = null;
    card.classList.remove("has-timer");
    const arc = card.querySelector(".sc-timer-arc");
    if (arc) arc.style.strokeDashoffset = "0";
  }

  /**
   * @param {number} ms
   * @param {{ playing?: boolean, awaitingChoice?: boolean }} [opts]
   */
  function start(ms, opts = {}) {
    const playing = opts.playing !== false;
    const awaitingChoice = !!opts.awaitingChoice;
    if (!playing || awaitingChoice || !ms || ms < 120) {
      stop();
      return;
    }
    stepTimer = { start: performance.now(), duration: ms };
    card.classList.add("has-timer");
    tick();
  }

  function tick() {
    if (!stepTimer) return;
    const arc = card.querySelector(".sc-timer-arc");
    if (!arc) return;
    const u = Math.min(
      1,
      Math.max(0, (performance.now() - stepTimer.start) / stepTimer.duration)
    );
    // 0 = plein, 1 = vide
    arc.style.strokeDashoffset = String(TIMER_CIRC * u);
  }

  function active() {
    return !!stepTimer;
  }

  return { start, stop, tick, active };
}
