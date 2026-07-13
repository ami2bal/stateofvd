/**
 * Mode Parcours — barre BAS + drawer scénarios (UX allégée).
 * Fil d'Ariane horizontal ; hover étape = focus salle (preview).
 * Catalogue scénarios : source unique `flows/index.js` (TASK-109).
 */
import {
  SCENARIO_DEFS,
  SCENARIOS,
  getScenarioDef,
  scenariosByEntry,
} from "./flows/index.js";
import { ensureUiTokens } from "./ui-tokens.js";

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root  #flow-hud
 * @param {object} opts.walkthrough
 * @param {(siteId:string, roomId?:string|null) => void} [opts.setHoverFocus]
 * @param {{ preview:(id:string)=>void, clear:()=>void }} [opts.scenarioPreview]
 * @param {() => void} [opts.onDrawerOpen]  désélection plan / inspecteur
 */
export function installScenarioPanel(opts) {
  const { root, walkthrough, setHoverFocus, scenarioPreview, onDrawerOpen } = opts;
  ensureUiTokens();
  root.hidden = false;
  root.id = root.id || "flow-hud";
  root.classList.add("sovd-glass", "scenario-panel", "flow-hud-bottom");
  root.setAttribute("data-side", "bottom");
  root.setAttribute("data-panel", "parcours");

  const SPEED_STEPS = [
    { value: 0.6, bars: 1, label: "×0,6" },
    { value: 1, bars: 2, label: "×1" },
    { value: 1.6, bars: 3, label: "×1,6" },
  ];

  root.innerHTML = `
    <div class="sp-bar" role="toolbar" aria-label="Mode Parcours">
      <div class="sp-bar-left">
        <span class="sp-scen-kicker" id="sp-scen-kicker">Scénario</span>
        <button type="button" class="sp-drawer-btn" id="sp-drawer-btn" aria-expanded="false" aria-controls="sp-drawer" title="Choisir un scénario">
          <span class="sp-drawer-ico" aria-hidden="true">☰</span>
          <span class="sp-scen-label" id="sp-scen-label">Aucun scénario</span>
          <span class="sp-chev" aria-hidden="true">▴</span>
        </button>
        <span class="sp-step-count" id="sp-step-count" title="Étape courante">— / —</span>
      </div>
      <!-- Fil d'Ariane retiré : étapes = panneau contextuel près de la salle -->
      <div class="sp-bar-right">
        <div class="sp-transport" role="group" aria-label="Transport lecture">
          <span class="sp-state-pill" id="sp-state-pill" aria-live="polite">—</span>
          <button type="button" id="sp-play" class="sp-btn primary" title="Lecture" aria-pressed="false">▶</button>
          <button type="button" id="sp-pause" class="sp-btn" title="Pause" aria-pressed="false" disabled>⏸</button>
          <button type="button" id="sp-stop" class="sp-btn stop" title="Arrêter — aucun scénario" disabled aria-label="Arrêter le scénario">■</button>
          <button type="button" id="sp-speed" class="sp-speed-btn" title="Vitesse ×1" aria-label="Vitesse de lecture" data-speed-i="1">
            <span class="sp-speed-bars" aria-hidden="true">
              <i class="on"></i><i class="on"></i><i></i>
            </span>
            <span class="sp-speed-lab">×1</span>
          </button>
        </div>
      </div>
    </div>
    <!-- stack flex : drawer | panel info (jamais superposés) -->
    <div class="sp-drawer-stack" id="sp-drawer-stack" hidden>
      <div class="sp-drawer" id="sp-drawer" role="dialog" aria-label="Scénarios" tabindex="-1">
        <div class="sp-drawer-head">
          <span>Scénarios · par entrée</span>
          <button type="button" class="sp-drawer-close" id="sp-drawer-close" title="Fermer">✕</button>
        </div>
        <div class="sp-drawer-list" id="sp-picker">
          ${scenariosByEntry()
            .map(
              (g) => `
            <div class="sp-entry-group" data-entry="${g.id}">
              <div class="sp-entry-h">
                <span class="sp-entry-tag">${escHtml(g.label)}</span>
                <span class="sp-entry-hint">${escHtml(g.hint || "")}</span>
              </div>
              ${g.items
                .map((s) => {
                  const nSteps =
                    (s.playable && SCENARIOS[s.id]?.steps?.length) ||
                    s.scenario?.steps?.length ||
                    0;
                  const stepsInfo = nSteps
                    ? `<span class="sp-scen-steps" title="${nSteps} étapes">${nSteps}&nbsp;ét.</span>`
                    : "";
                  return `<button type="button" class="sp-scen${s.playable ? "" : " is-locked"}" data-scen="${s.id}" data-playable="${s.playable ? "1" : "0"}" ${s.playable ? "" : 'aria-disabled="true"'}>
                <span class="sp-scen-name">${escHtml(s.label)}</span>
                ${stepsInfo}
                ${s.playable ? "" : '<span class="sp-scen-badge">cible</span>'}
              </button>`;
                })
                .join("")}
            </div>`
            )
            .join("")}
        </div>
        <div class="sp-drawer-obj" id="sp-obj"></div>
      </div>
      <div class="sp-scen-tip" id="sp-scen-tip" hidden>
        <div class="sp-tip-title" id="sp-tip-title"></div>
        <p class="sp-tip-sum" id="sp-tip-sum"></p>
        <p class="sp-tip-cond"><span>Conditions</span> <span id="sp-tip-cond"></span></p>
        <p class="sp-tip-legal"><span>Source</span> <a id="sp-tip-legal" href="#" target="_blank" rel="noopener"></a></p>
      </div>
    </div>
    <div class="sp-drawer-backdrop" id="sp-drawer-backdrop" hidden></div>
  `;

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  {
    const prevCss = document.getElementById("sovd-scenario-panel-css");
    if (prevCss) prevCss.remove();
    const st = document.createElement("style");
    st.id = "sovd-scenario-panel-css";
    st.textContent = `
      /* ── bottom bar — glasso (pas blanc plein) ── */
      #flow-hud.scenario-panel.flow-hud-bottom,
      .scenario-panel.flow-hud-bottom,
      #flow-hud.sovd-glass.scenario-panel {
        position: fixed;
        left: 50%;
        right: auto;
        top: auto;
        bottom: 14px;
        transform: translateX(-50%);
        width: min(600px, calc(100vw - 24px));
        max-width: calc(100vw - 24px);
        max-height: none;
        /* visible = le drawer s'ouvre AU-DESSUS (absolute bottom:100%) ;
           le clip transport se fait sur .sp-bar uniquement */
        overflow: visible;
        padding: 8px 10px 6px;
        border-radius: 16px;
        box-sizing: border-box;
        z-index: 22;
        background: var(--sovd-glass-bg, rgba(255, 255, 255, 0.34)) !important;
        backdrop-filter: blur(18px) saturate(1.2) !important;
        -webkit-backdrop-filter: blur(18px) saturate(1.2) !important;
        border: 1px solid var(--sovd-glass-border, rgba(255,255,255,0.55));
        box-shadow:
          var(--sovd-shadow, 0 8px 28px rgba(36,48,63,0.1)),
          inset 0 1px 0 rgba(255,255,255,0.45);
        font-family: var(--sovd-font, system-ui, sans-serif);
        color: var(--sovd-ink-soft, #2F4266);
      }
      /* ★ FIX : drawer AU-DESSUS du backdrop (sinon clics/scroll bloqués)
         Scope #sovd-root (pas body) — sous un hôte iframe body = page hôte entière. */
      #sovd-root.sovd-drawer-open #flow-hud.scenario-panel.flow-hud-bottom,
      #sovd-root.sovd-drawer-open #flow-hud,
      .sovd-root.sovd-drawer-open #flow-hud.scenario-panel.flow-hud-bottom,
      .sovd-root.sovd-drawer-open #flow-hud {
        z-index: 50 !important;
      }
      .sp-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
        justify-content: space-between;
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden; /* anti-débordement vitesse, sans clipper le drawer */
      }
      .sp-bar-left {
        min-width: 0;
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        gap: 6px;
        overflow: hidden;
      }
      .sp-scen-kicker {
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #5e6c84;
        flex-shrink: 0;
      }
      .sp-bar-right {
        flex: 0 1 auto;
        min-width: 0;
        margin-left: 6px;
        max-width: 55%;
      }
      .sp-drawer-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid rgba(47,66,102,0.18);
        background: rgba(255,255,255,0.72);
        color: #2F4266;
        border-radius: 999px;
        padding: 7px 12px 7px 10px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        max-width: min(200px, 42vw);
        min-width: 0;
      }
      .sp-drawer-btn:hover { background: #fff; border-color: rgba(47,66,102,0.28); }
      .sp-drawer-btn[aria-expanded="true"] {
        background: #2F4266; color: #fff; border-color: #2F4266;
      }
      .sp-drawer-btn[aria-expanded="true"] .sp-chev { transform: rotate(180deg); }
      .sp-scen-label {
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .sp-chev { font-size: 10px; opacity: 0.75; transition: transform 0.2s ease; }
      .sp-step-count {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
        color: #3E7A52;
        background: rgba(62,122,82,0.12);
        border: 1px solid rgba(62,122,82,0.22);
        border-radius: 999px;
        padding: 5px 10px;
        white-space: nowrap;
      }
      .sp-transport {
        display: flex;
        flex-wrap: nowrap;
        gap: 4px;
        align-items: center;
        justify-content: flex-end;
        min-width: 0;
        max-width: 100%;
      }
      /* Pastille d'état lecture (source de vérité visuelle) */
      .sp-state-pill {
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        border-radius: 999px;
        padding: 3px 6px;
        white-space: nowrap;
        border: 1px solid rgba(47,66,102,0.14);
        background: rgba(255,255,255,0.55);
        color: #5e6c84;
        min-width: 0;
        max-width: 4.8em;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        flex-shrink: 1;
      }
      .sp-state-pill.is-playing {
        background: rgba(62,122,82,0.16);
        border-color: rgba(62,122,82,0.35);
        color: #1e4a2c;
      }
      .sp-state-pill.is-paused {
        background: rgba(47,66,102,0.1);
        border-color: rgba(47,66,102,0.2);
        color: #2F4266;
      }
      .sp-state-pill.is-choice {
        background: rgba(255,214,102,0.45);
        border-color: rgba(201,137,0,0.4);
        color: #5a3a08;
      }
      .sp-state-pill.is-idle {
        opacity: 0.75;
      }
      .sp-btn {
        border: 1px solid rgba(47,66,102,0.2); background: rgba(255,255,255,0.85);
        color: #2F4266; border-radius: 8px; padding: 5px 8px; font-size: 13px; cursor: pointer;
        transition: background 0.12s ease, opacity 0.12s ease, border-color 0.12s ease;
        flex-shrink: 0;
        min-width: 2.1em;
        min-height: 2.1em;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      /* ■ optique plus petit que ▶/⏸ → un cran au-dessus pour s'aligner */
      .sp-btn.stop {
        font-size: 15px;
        padding: 5px 8px;
      }
      .sp-btn.primary { background: #2F4266; color: #fff; border-color: #2F4266; }
      .sp-btn:hover:not(:disabled) { filter: brightness(1.05); }
      /* État courant = grisé, non cliquable (évite double-play / double-pause) */
      .sp-btn.is-current,
      .sp-btn:disabled {
        opacity: 0.38;
        cursor: not-allowed;
        filter: none;
        pointer-events: none;
      }
      .sp-btn.is-current.primary {
        background: rgba(47,66,102,0.35);
        border-color: rgba(47,66,102,0.25);
        color: rgba(255,255,255,0.75);
      }
      /* vitesse : 3 barres crescendo (×0,6 · ×1 · ×1,6) — compact anti-overflow */
      .sp-speed-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid rgba(47,66,102,0.2);
        border-radius: 8px;
        padding: 4px 6px;
        background: rgba(255,255,255,0.85);
        color: #2F4266;
        cursor: pointer;
        font-size: 10.5px;
        font-weight: 700;
        flex-shrink: 0;
        max-width: 100%;
      }
      .sp-speed-btn:hover { background: #fff; border-color: rgba(47,66,102,0.32); }
      .sp-speed-bars {
        display: inline-flex;
        align-items: flex-end;
        gap: 1.5px;
        height: 12px;
        flex-shrink: 0;
      }
      .sp-speed-bars i {
        display: block;
        width: 3px;
        border-radius: 1px;
        background: rgba(47,66,102,0.22);
      }
      .sp-speed-bars i:nth-child(1) { height: 4px; }
      .sp-speed-bars i:nth-child(2) { height: 8px; }
      .sp-speed-bars i:nth-child(3) { height: 12px; }
      .sp-speed-bars i.on { background: #3E7A52; }
      .sp-speed-lab {
        min-width: 0;
        max-width: 2.6em;
        text-align: left;
        letter-spacing: 0.01em;
        overflow: hidden;
        white-space: nowrap;
      }
      @media (max-width: 520px) {
        .sp-scen-kicker { display: none; }
        .sp-state-pill { display: none; }
        .sp-speed-lab { max-width: 2.2em; }
      }
      /* lecture scénario : barre signale le verrou plan */
      #sovd-root.sovd-parcours-playing .scenario-panel.flow-hud-bottom,
      .sovd-root.sovd-parcours-playing .scenario-panel.flow-hud-bottom {
        box-shadow: 0 0 0 2px rgba(62, 122, 82, 0.35),
          0 10px 32px rgba(36, 48, 63, 0.12);
      }
      /* Voile drawer : ABSOLUTE dans #sovd-root uniquement.
         Jamais position:fixed + 100vw/100vh (ça grise toute la page hôte). */
      #sovd-root > #sp-drawer-backdrop.sp-drawer-backdrop,
      #sovd-root > .sp-drawer-backdrop,
      .sovd-root > #sp-drawer-backdrop.sp-drawer-backdrop,
      .sovd-root > .sp-drawer-backdrop {
        position: absolute !important;
        inset: 0 !important;
        left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important;
        width: auto !important; height: auto !important;
        z-index: 40 !important;
        background: rgba(36,48,63,0.14);
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        cursor: pointer;
        margin: 0; padding: 0; border: none;
        filter: none !important;
        pointer-events: auto;
      }
      #sp-drawer-backdrop[hidden],
      .sp-drawer-backdrop[hidden] {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
      /* stack : drawer | tip côte à côte (flex), jamais superposés.
         pointer-events auto + padding interne = hit area continue
         (évite mouseleave en traversant l'espace entre les deux). */
      .sp-drawer-stack {
        position: absolute;
        left: 12px;
        bottom: calc(100% + 8px);
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: flex-end;
        gap: 0;
        z-index: 2; /* relatif au flow-hud (déjà z=50 drawer-open) */
        max-width: min(640px, calc(100vw - 28px));
        pointer-events: auto;
        animation: sp-drawer-up 0.22s cubic-bezier(0.22,1,0.36,1);
      }
      .sp-drawer-stack[hidden] { display: none !important; }
      .sp-drawer {
        position: relative;
        left: auto;
        right: auto;
        bottom: auto;
        flex: 0 0 auto;
        width: min(300px, calc(100vw - 40px));
        max-height: min(70vh, 520px);
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        padding: 10px;
        margin-right: 10px;
        border-radius: 14px;
        background: rgba(237,232,220,0.96);
        border: 1px solid rgba(255,255,255,0.6);
        box-shadow: 0 12px 36px rgba(36,48,63,0.16);
        backdrop-filter: blur(14px);
        pointer-events: auto;
        touch-action: pan-y;
      }
      .sp-drawer-list {
        pointer-events: auto;
      }
      .sp-scen {
        pointer-events: auto;
      }
      .sp-entry-group { margin-bottom: 10px; }
      .sp-entry-group:last-of-type { margin-bottom: 4px; }
      .sp-entry-h {
        display: flex; flex-direction: column; gap: 1px;
        margin: 6px 2px 5px;
      }
      .sp-entry-tag {
        font-size: 10px; font-weight: 800; letter-spacing: 0.07em;
        text-transform: uppercase; color: #3E7A52;
      }
      .sp-entry-hint { font-size: 10px; color: #5e6c84; line-height: 1.3; }
      .sp-scen.is-locked {
        opacity: 0.55; cursor: default;
        border-style: dashed;
      }
      .sp-scen.is-locked:hover { background: rgba(255,255,255,0.55); }
      .sp-scen {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        text-align: left;
      }
      .sp-scen-name { flex: 1 1 auto; min-width: 0; }
      .sp-scen-steps {
        flex: 0 0 auto;
        font-size: 10px;
        font-weight: 650;
        letter-spacing: 0.02em;
        color: #7a8799;
        opacity: 0.9;
        white-space: nowrap;
      }
      .sp-scen-badge {
        flex: 0 0 auto;
        margin-left: 0; font-size: 9px; font-weight: 800;
        letter-spacing: 0.04em; text-transform: uppercase;
        color: #8A6A16; background: #FFF3D6; border-radius: 999px;
        padding: 2px 7px;
      }
      /* panel info : frère flex du drawer, toujours à sa droite, jamais superposé */
      .sp-scen-tip {
        position: relative;
        flex: 0 0 auto;
        width: min(300px, calc(100vw - 340px));
        min-width: 200px;
        max-width: 300px;
        max-height: min(70vh, 520px);
        overflow-y: auto;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(237,232,220,0.96);
        border: 1px solid rgba(255,255,255,0.65);
        box-shadow: 0 12px 36px rgba(36,48,63,0.16);
        backdrop-filter: blur(14px);
        font-size: 12px; line-height: 1.45; color: #2F4266;
        pointer-events: auto;
      }
      .sp-scen-tip[hidden] { display: none !important; }
      .sp-tip-title { font-weight: 800; font-size: 13.5px; margin-bottom: 6px; color: #2F4266; }
      .sp-tip-sum { margin: 0 0 10px; }
      .sp-tip-cond, .sp-tip-legal { margin: 6px 0 0; font-size: 11.5px; }
      .sp-tip-cond span:first-child,
      .sp-tip-legal span:first-child {
        display: block; font-size: 10px; font-weight: 800;
        letter-spacing: 0.06em; text-transform: uppercase;
        color: #5e6c84; margin-bottom: 3px;
      }
      .sp-tip-legal a { color: #3E7A52; font-weight: 700; text-decoration: none; }
      .sp-tip-legal a:hover { text-decoration: underline; }
      @media (max-width: 720px) {
        .sp-drawer-stack {
          flex-direction: column;
          align-items: stretch;
          max-width: min(320px, calc(100vw - 28px));
          max-height: min(78vh, 640px);
        }
        .sp-drawer {
          width: min(320px, calc(100vw - 40px));
          max-height: 42vh;
          margin-right: 0;
          margin-bottom: 10px;
        }
        .sp-scen-tip {
          width: min(320px, calc(100vw - 40px));
          max-width: none;
          max-height: 28vh;
        }
      }
      @keyframes sp-drawer-up {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .sp-drawer-head {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 11px; font-weight: 800; letter-spacing: 0.06em;
        text-transform: uppercase; color: #2F4266; opacity: 0.75;
        margin-bottom: 8px; padding: 0 2px;
      }
      .sp-drawer-close {
        border: none; background: transparent; cursor: pointer;
        color: #2F4266; font-size: 14px; padding: 2px 6px; border-radius: 6px;
      }
      .sp-drawer-close:hover { background: rgba(47,66,102,0.08); }
      .sp-drawer-list { display: flex; flex-direction: column; gap: 4px; }
      .sp-scen {
        display: flex; align-items: center; gap: 10px;
        text-align: left; border: 1px solid rgba(47,66,102,0.14);
        background: rgba(255,255,255,0.6); color: #2F4266;
        border-radius: 10px; padding: 9px 11px; font-size: 12.5px;
        font-weight: 600; cursor: pointer;
      }
      .sp-scen:hover { background: #fff; border-color: rgba(47,66,102,0.28); }
      .sp-scen.on {
        background: #2F4266; color: #fff; border-color: #2F4266;
      }
      .sp-scen.on .sp-scen-steps { color: rgba(255,255,255,0.72); }
      .sp-scen-short {
        font-size: 11px; font-weight: 800; opacity: 0.75;
        min-width: 1.6em;
      }
      .sp-scen.on .sp-scen-short { opacity: 0.9; }
      .sp-drawer-obj {
        margin-top: 8px; padding-top: 8px;
        border-top: 1px solid rgba(47,66,102,0.1);
        font-size: 11px; color: #3E7A52; font-weight: 600; line-height: 1.35;
      }
      /* Carte d'étape : styles canoniques dans walkthrough.js
         (fond blanc + glass, ancrée à la salle). Ne pas re-forcer
         position/fond ici — ça écrasait le placement contextuel. */
      #sovd-step-card {
        /* filet de sécurité si walkthrough CSS pas encore injecté */
        background: rgba(255, 255, 255, 0.94) !important;
        backdrop-filter: blur(12px) saturate(1.1);
        -webkit-backdrop-filter: blur(12px) saturate(1.1);
        border: 1px solid rgba(255, 255, 255, 0.9);
        color: #1e2d45;
      }
      #sovd-step-card.is-open { opacity: 1; }
      #sovd-step-card.has-choice { pointer-events: auto; }
      #sovd-step-card .sc-rail {
        list-style: none; margin: 0 0 12px; padding: 0;
        display: flex; flex-direction: column; gap: 2px;
        max-height: 28vh; overflow-y: auto;
        border-bottom: 1px solid rgba(47,66,102,0.1);
        padding-bottom: 10px;
      }
      #sovd-step-card .sc-rail li {
        display: flex; align-items: center; gap: 8px;
        font-size: 11px; line-height: 1.25; font-weight: 600;
        color: #5e6c84; padding: 4px 6px; border-radius: 8px;
      }
      #sovd-step-card .sc-rail li .sc-rail-n {
        flex: 0 0 1.4em; font-size: 10px; font-weight: 800;
        opacity: 0.65; text-align: right;
      }
      #sovd-step-card .sc-rail li .sc-rail-t {
        flex: 1; min-width: 0; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
      }
      #sovd-step-card .sc-rail li.is-done { opacity: 0.72; }
      #sovd-step-card .sc-rail li.is-active {
        background: rgba(62,122,82,0.14);
        color: #2F4266; font-weight: 800;
      }
      #sovd-step-card .sc-rail li.is-active .sc-rail-n { color: #3E7A52; opacity: 1; }
      #sovd-step-card .sc-step-kicker {
        font-size: 10px; font-weight: 800; letter-spacing: 0.06em;
        text-transform: uppercase; color: #5e6c84; margin-bottom: 6px;
      }
      #sovd-step-card .sc-choice {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid rgba(47,66,102,0.12);
      }
      #sovd-step-card .sc-choice-h {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #5e6c84;
        margin-bottom: 2px;
      }
      #sovd-step-card .sc-choice-btn {
        display: block;
        width: 100%;
        text-align: left;
        border: 1px solid rgba(47,66,102,0.2);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        line-height: 1.3;
      }
      #sovd-step-card .sc-choice-btn.accept {
        background: #2F4266;
        color: #fff;
        border-color: #2F4266;
      }
      #sovd-step-card .sc-choice-btn.reject {
        background: rgba(255,255,255,0.75);
        color: #2F4266;
      }
      #sovd-step-card .sc-choice-btn:hover { filter: brightness(1.06); }
      #sovd-step-card.is-secret .sc-choice {
        border-top-color: rgba(255,255,255,0.12);
      }
      #sovd-step-card.is-secret .sc-choice-h { color: rgba(247,244,238,0.7); }
      #sovd-step-card.is-secret .sc-choice-btn.accept {
        background: #3E7A52;
        border-color: #3E7A52;
      }
      #sovd-step-card.is-secret .sc-choice-btn.reject {
        background: rgba(255,255,255,0.1);
        color: #f7f4ee;
        border-color: rgba(255,255,255,0.25);
      }
      #sovd-step-card .sc-act {
        font-size: 11px; font-weight: 800; letter-spacing: 0.05em;
        text-transform: uppercase; color: #3E7A52; margin-bottom: 4px;
      }
      #sovd-step-card .sc-secret {
        display: inline-block;
        margin: 0 0 6px;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.03em;
        color: #f7f4ee;
        background: #2F4266;
        border: 1px solid rgba(255,255,255,0.2);
      }
      #sovd-step-card.is-secret {
        background: rgba(36, 48, 63, 0.92);
        color: #f7f4ee;
        border-color: rgba(255,255,255,0.18);
        box-shadow: 0 10px 32px rgba(20, 28, 40, 0.35);
      }
      #sovd-step-card.is-secret .sc-act { color: #8fd0a4; }
      #sovd-step-card.is-secret .sc-title { color: #f7f4ee; }
      #sovd-step-card.is-secret .sc-body { color: rgba(247,244,238,0.9); }
      #sovd-step-card.is-secret .sc-legal {
        color: rgba(247,244,238,0.75);
        border-top-color: rgba(255,255,255,0.12);
      }
      #sovd-step-card .sc-secret-hint {
        font-size: 10.5px;
        line-height: 1.35;
        margin: 0 0 8px;
        padding: 6px 8px;
        border-radius: 8px;
        background: rgba(255,255,255,0.08);
        border: 1px dashed rgba(255,255,255,0.2);
        color: rgba(247,244,238,0.88);
      }
      /* pas de filter canvas en secret (blur/assombrissement plein écran = UX cassée) */
      #sovd-step-card .sc-title { font-size: 14.5px; font-weight: 700; line-height: 1.3; margin-bottom: 6px; }
      #sovd-step-card .sc-body { font-size: 12.5px; line-height: 1.45; margin-bottom: 8px; }
      @media (max-width: 720px) {
        #sovd-step-card {
          left: 10px !important;
          width: min(280px, calc(100vw - 20px));
          max-height: min(58vh, calc(100% - 90px));
        }
      }
      #sovd-step-card .sc-legal {
        font-size: 10.5px; font-weight: 600; opacity: 0.8;
        border-top: 1px solid rgba(47,66,102,0.12); padding-top: 6px;
      }
      #sovd-step-icon {
        position: absolute; z-index: 49; width: 36px; height: 36px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        background: rgba(47,66,102,0.92); color: #fff; font-size: 16px;
        box-shadow: 0 4px 14px rgba(36,48,63,0.2);
        pointer-events: none; opacity: 0; transition: opacity 0.2s ease;
      }
      #sovd-step-icon.is-open { opacity: 1; }
      @media (max-width: 720px) {
        .sp-bar { flex-wrap: wrap; }
        .sp-bar-right { margin-left: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .sp-drawer { animation: none; }
        #sovd-step-card { transition: opacity 0.15s ease; }
      }
    `;
    document.head.appendChild(st);
  }

  // Override legacy left positioning from style.css
  root.style.left = "";
  root.style.right = "";
  root.style.top = "";

  const elObj = root.querySelector("#sp-obj");
  const elLabel = root.querySelector("#sp-scen-label");
  const elCount = root.querySelector("#sp-step-count");
  const elStack = root.querySelector("#sp-drawer-stack");
  const elDrawer = root.querySelector("#sp-drawer");
  // Backdrop hors du #flow-hud : monté dans #sovd-root en absolute (jamais body/fixed).
  let elBackdrop = root.querySelector("#sp-drawer-backdrop");
  const shell =
    document.getElementById("sovd-root") ||
    document.querySelector(".sovd-root") ||
    document.body;
  if (elBackdrop && elBackdrop.parentElement !== shell) {
    shell.appendChild(elBackdrop);
  }
  if (elBackdrop) {
    elBackdrop.classList.add("sp-drawer-backdrop");
    elBackdrop.setAttribute("aria-hidden", "true");
  }
  /** Classes d'état UI : toujours sur le shell (embed iframe ≠ document.body). */
  function setShellClass(name, on) {
    shell.classList.toggle(name, !!on);
    // Nettoyage legacy si d'anciennes sessions avaient posé la classe sur body
    if (shell !== document.body) document.body.classList.remove(name);
  }
  const elDrawerBtn = root.querySelector("#sp-drawer-btn");
  const elSpeed = root.querySelector("#sp-speed");
  const elTip = root.querySelector("#sp-scen-tip");
  const elTipTitle = root.querySelector("#sp-tip-title");
  const elTipSum = root.querySelector("#sp-tip-sum");
  const elTipCond = root.querySelector("#sp-tip-cond");
  const elTipLegal = root.querySelector("#sp-tip-legal");

  let drawerOpen = false;
  let speedI = 1; // 0=×0,6 · 1=×1 (défaut) · 2=×1,6

  function setDrawer(open) {
    drawerOpen = !!open;
    if (elStack) elStack.hidden = !drawerOpen;
    elDrawer.hidden = !drawerOpen;
    if (elBackdrop) {
      elBackdrop.hidden = !drawerOpen;
      elBackdrop.style.display = drawerOpen ? "block" : "none";
      elBackdrop.style.pointerEvents = drawerOpen ? "auto" : "none";
      // filet de sécurité anti-blur / voile collé
      if (!drawerOpen) {
        elBackdrop.style.backdropFilter = "none";
        elBackdrop.style.webkitBackdropFilter = "none";
      }
    }
    setShellClass("sovd-drawer-open", drawerOpen);
    elDrawerBtn.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
    if (drawerOpen) {
      // ouverture catalogue → ferme le panneau « Rejouer » de fin de parcours
      if (typeof walkthrough.dismissEndChoice === "function") {
        walkthrough.dismissEndChoice();
      }
      // sélection plan + fiche : off pendant le choix de scénario
      if (typeof onDrawerOpen === "function") onDrawerOpen();
      // session preview (n° chambres au hover) — sans re-cadrage caméra
      if (typeof scenarioPreview?.beginSession === "function") {
        scenarioPreview.beginSession();
      }
      requestAnimationFrame(() => {
        elDrawer?.focus?.({ preventScroll: true });
        if (elDrawer) elDrawer.scrollTop = 0;
      });
    } else {
      if (elTip) elTip.hidden = true;
      if (typeof scenarioPreview?.endSession === "function") {
        scenarioPreview.endSession();
      } else if (typeof scenarioPreview?.clear === "function") {
        scenarioPreview.clear();
      }
    }
  }

  function scenMeta(id) {
    return getScenarioDef(id);
  }

  function syncSpeedBtn() {
    const s = SPEED_STEPS[speedI] || SPEED_STEPS[0];
    elSpeed.dataset.speedI = String(speedI);
    elSpeed.title = `Vitesse ${s.label}`;
    elSpeed.setAttribute("aria-label", `Vitesse ${s.label} — cliquer pour changer`);
    const lab = elSpeed.querySelector(".sp-speed-lab");
    if (lab) lab.textContent = s.label;
    const bars = elSpeed.querySelectorAll(".sp-speed-bars i");
    bars.forEach((b, i) => b.classList.toggle("on", i < s.bars));
    walkthrough.setSpeed(s.value);
  }

  /** Rafraîchit barre bas (label scénario + compteur + transport). */
  function renderAriane() {
    const st = walkthrough.getState();
    const steps = st.steps || [];
    const n = steps.length;
    const idx = Math.min(st.index || 0, Math.max(0, n - 1));
    if (elObj) elObj.textContent = st.objectLabel || st.scenarioTitle || "";
    const end = st.endState;
    const sm = st.scenarioId
      ? scenMeta(st.scenarioId)
      : end?.scenarioId
        ? scenMeta(end.scenarioId)
        : null;
    if (elLabel) {
      elLabel.textContent = sm?.label || "Aucun scénario";
    }
    if (elCount) {
      if (end) {
        elCount.textContent = end.outcome === "reject" ? "✕" : "✓";
        elCount.title =
          end.outcome === "reject" ? "Fin par rejet" : "Parcours abouti";
      } else {
        elCount.textContent = n ? `${idx + 1} / ${n}` : "— / —";
        elCount.title = "Étape courante";
      }
    }
    root.querySelectorAll(".sp-scen").forEach((b) => {
      b.classList.toggle(
        "on",
        !!st.scenarioId && b.getAttribute("data-scen") === st.scenarioId
      );
    });
    const elPlay = root.querySelector("#sp-play");
    const elPause = root.querySelector("#sp-pause");
    const elStop = root.querySelector("#sp-stop");
    const elPill = root.querySelector("#sp-state-pill");
    const hasScen = !!st.scenarioId;
    const hasEnd = !!st.endState;
    const isPlaying = !!st.playing;
    const isChoice = !!st.awaitingChoice;
    // UX 2026 : l'état courant est grisé/disabled ; seule l'action opposée est cliquable
    if (elPlay) {
      const playAvail = hasScen && !isPlaying && !isChoice;
      elPlay.disabled = !playAvail;
      elPlay.classList.toggle("primary", playAvail);
      elPlay.classList.toggle("is-current", isPlaying);
      elPlay.setAttribute("aria-pressed", isPlaying ? "true" : "false");
      elPlay.title = !hasScen
        ? "Choisissez un scénario"
        : isPlaying
          ? "Lecture en cours"
          : isChoice
            ? "Choisissez une issue sur la carte"
            : "Lancer / reprendre la lecture";
    }
    if (elPause) {
      const pauseAvail = hasScen && isPlaying;
      elPause.disabled = !pauseAvail;
      elPause.classList.toggle("primary", pauseAvail);
      elPause.classList.toggle("is-current", hasScen && !isPlaying && !isChoice);
      elPause.setAttribute("aria-pressed", !isPlaying && hasScen ? "true" : "false");
      elPause.title = !hasScen
        ? "—"
        : isPlaying
          ? "Mettre en pause"
          : "Déjà en pause";
    }
    if (elStop) {
      // Stop actif dès qu'un scénario tourne ou qu'un panneau fin est affiché
      const stopAvail = hasScen || hasEnd;
      elStop.disabled = !stopAvail;
      elStop.title = stopAvail
        ? "Arrêter — revenir à aucun scénario"
        : "Aucun scénario actif";
    }
    if (elPill) {
      elPill.classList.remove("is-playing", "is-paused", "is-choice", "is-idle");
      if (!hasScen && !st.endState) {
        elPill.textContent = "—";
        elPill.classList.add("is-idle");
        elPill.title = "Aucun scénario";
      } else if (isChoice) {
        elPill.textContent = "Choix";
        elPill.classList.add("is-choice");
        elPill.title = "En attente de votre issue";
      } else if (isPlaying) {
        elPill.textContent = "Lecture";
        elPill.classList.add("is-playing");
        elPill.title = "Lecture automatique en cours";
      } else if (st.endState) {
        elPill.textContent = st.endState.outcome === "reject" ? "Rejet" : "Fin";
        elPill.classList.add("is-idle");
        elPill.title =
          st.endState.outcome === "reject"
            ? "Fin par rejet"
            : "Parcours abouti";
      } else if (hasScen) {
        elPill.textContent = "Pause";
        elPill.classList.add("is-paused");
        elPill.title = "Lecture en pause";
      } else {
        elPill.textContent = "—";
        elPill.classList.add("is-idle");
      }
    }
    root.classList.toggle("is-playing", isPlaying);
    root.classList.toggle("no-scenario", !hasScen && !st.endState);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function previewStep(i) {
    const st = walkthrough.getState();
    const step = (st.steps || [])[i];
    if (!step) return;
    const meta = step.meta || {};
    const roomId = meta.roomId || null;
    // soft focus like hover — walkthrough.preview if available
    if (typeof walkthrough.preview === "function") {
      walkthrough.preview(i);
    } else if (typeof setHoverFocus === "function") {
      setHoverFocus(step.siteId, roomId);
    }
  }

  function clearPreview() {
    if (typeof walkthrough.clearPreview === "function") {
      walkthrough.clearPreview();
    } else if (typeof setHoverFocus === "function") {
      setHoverFocus(null);
    }
  }

  root.querySelector("#sp-play").addEventListener("click", () => {
    setDrawer(false);
    walkthrough.play();
    renderAriane();
  });
  root.querySelector("#sp-pause").addEventListener("click", () => {
    walkthrough.pause();
    renderAriane();
  });
  root.querySelector("#sp-stop")?.addEventListener("click", () => {
    setDrawer(false);
    if (typeof walkthrough.clearScenario === "function") {
      walkthrough.clearScenario();
    } else if (typeof walkthrough.setScenario === "function") {
      walkthrough.setScenario(null);
    }
    renderAriane();
  });
  elSpeed.addEventListener("click", () => {
    speedI = (speedI + 1) % SPEED_STEPS.length;
    syncSpeedBtn();
  });

  elDrawerBtn.addEventListener("click", () => setDrawer(!drawerOpen));
  root.querySelector("#sp-drawer-close").addEventListener("click", () =>
    setDrawer(false)
  );
  elBackdrop?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrawer(false);
  });
  // Escape ferme le drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawerOpen) setDrawer(false);
  });

  function showScenTip(id) {
    const def = getScenarioDef(id);
    if (!def?.info) {
      elTip.hidden = true;
      return;
    }
    elTipTitle.textContent = def.label;
    elTipSum.textContent = def.info.summary || "";
    elTipCond.textContent = def.info.conditions || "";
    elTipLegal.textContent = def.info.legal || "";
    if (def.info.legalUrl) {
      elTipLegal.href = def.info.legalUrl;
      elTipLegal.style.pointerEvents = "auto";
    } else {
      elTipLegal.removeAttribute("href");
      elTipLegal.style.pointerEvents = "none";
    }
    elTip.hidden = false;
    // n° d'étapes sur les chambres (aide sélection) — sans voile
    if (typeof scenarioPreview?.preview === "function") {
      scenarioPreview.preview(id);
    }
  }

  function hideScenTip() {
    elTip.hidden = true;
    if (typeof scenarioPreview?.clearOverlays === "function") {
      scenarioPreview.clearOverlays();
    } else if (typeof scenarioPreview?.clear === "function") {
      scenarioPreview.clear();
    }
  }

  root.querySelector("#sp-picker").addEventListener("click", (e) => {
    const b = e.target.closest("[data-scen]");
    if (!b) return;
    const id = b.getAttribute("data-scen");
    const playable = b.getAttribute("data-playable") === "1";
    if (!playable) {
      showScenTip(id);
      return;
    }
    walkthrough.setScenario(id);
    setDrawer(false); // endSession + clear preview
    renderAriane();
  });

  root.querySelector("#sp-picker").addEventListener("mouseover", (e) => {
    const b = e.target.closest("[data-scen]");
    if (!b || !elDrawer.contains(b)) return;
    showScenTip(b.getAttribute("data-scen"));
  });
  root.querySelector("#sp-picker").addEventListener("mouseleave", () => {
    // keep tip if mouse moves to tip panel
  });
  elStack?.addEventListener("mouseleave", () => {
    hideScenTip();
  });

  walkthrough.onChange = () => renderAriane();
  syncSpeedBtn();
  renderAriane();

  return { refresh: renderAriane, root, setDrawer };
}
