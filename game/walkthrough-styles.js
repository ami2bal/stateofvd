/**
 * Styles Mode Parcours (carte d'étape + fil d'Ariane) — extrait walkthrough (lot 3).
 */
import { ensureUiTokens } from "./ui-tokens.js";

export const WALKTHROUGH_STYLES_ID = "sovd-step-card-css";

export const WALKTHROUGH_STYLES_CSS = `/* Carte d'étape contextuelle — blanc + léger glassomorphisme */
#sovd-step-card {
  position: absolute;
  z-index: 55;
  width: min(288px, calc(100% - 28px));
  max-height: min(58vh, 420px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 13px 11px;
  border-radius: 16px;
  /* Fond blanc (demande UX) + léger glass pour fondre sur le plan */
  background: var(--sovd-glass-card, rgba(255, 255, 255, 0.94)) !important;
  backdrop-filter: blur(12px) saturate(1.08);
  -webkit-backdrop-filter: blur(12px) saturate(1.08);
  border: 1px solid var(--sovd-glass-border, rgba(255,255,255,0.95));
  box-shadow:
    0 10px 32px rgba(36,48,63,0.14),
    0 1px 0 rgba(255,255,255,1) inset;
  color: #1e2d45;
  font-family: "Segoe UI", system-ui, sans-serif;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease, left 0.28s cubic-bezier(0.22,1,0.36,1),
    top 0.28s cubic-bezier(0.22,1,0.36,1);
}
#sovd-step-card.is-open {
  opacity: 1;
  pointer-events: auto; /* puces étapes + choix d'issue */
}
/* Anneau compte à rebours (lecture auto) — coin haut-droit, sans texte */
#sovd-step-card .sc-timer {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 20px;
  height: 20px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 2;
}
#sovd-step-card.has-timer .sc-timer { opacity: 1; }
#sovd-step-card.is-awaiting .sc-timer { opacity: 0; }
#sovd-step-card .sc-timer svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
#sovd-step-card .sc-timer-track {
  fill: none;
  stroke: rgba(47, 66, 102, 0.14);
  stroke-width: 2.75;
}
#sovd-step-card .sc-timer-arc {
  fill: none;
  stroke: #3e7a52;
  stroke-width: 2.75;
  stroke-linecap: round;
  /* C = 2π·12 ≈ 75.4 */
  stroke-dasharray: 75.4;
  stroke-dashoffset: 0;
}
#sovd-step-card.has-timer .sc-act,
#sovd-step-card.has-timer .sc-await-banner {
  padding-right: 22px;
}
@media (prefers-reduced-motion: reduce) {
  #sovd-step-card .sc-timer { opacity: 0.85; }
}
#sovd-step-card .sc-step-kicker {
  font-size: 10px; font-weight: 800; letter-spacing: 0.05em;
  text-transform: uppercase; color: #3a4a63;
  margin-bottom: 6px;
}
/* rail = puces horizontales compactes (remplace fil d'Ariane bas) */
#sovd-step-card .sc-rail {
  list-style: none; margin: 0 0 10px; padding: 0 0 8px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 5px;
  border-bottom: 1px solid rgba(47,66,102,0.1);
}
#sovd-step-card .sc-rail li {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; padding: 0 6px;
  border-radius: 999px;
  font-size: 10px; font-weight: 800; color: #5e6c84;
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(47,66,102,0.12);
  cursor: pointer;
}
#sovd-step-card .sc-rail li .sc-rail-n { opacity: 1; }
#sovd-step-card .sc-rail li .sc-rail-t { display: none; }
#sovd-step-card .sc-rail li.is-done {
  background: rgba(47,66,102,0.12); color: #2F4266;
}
#sovd-step-card .sc-rail li.is-active {
  background: rgba(62,122,82,0.28);
  border-color: rgba(62,122,82,0.5);
  color: #1e4a2c;
  box-shadow: 0 0 0 2px rgba(62,122,82,0.18);
}
#sovd-step-card .sc-act {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em;
  text-transform: uppercase; color: #2d6b42;
  margin-bottom: 3px;
}
#sovd-step-card .sc-title {
  font-size: 14px; font-weight: 750; line-height: 1.3;
  margin-bottom: 5px; color: #1a2740;
}
#sovd-step-card .sc-body {
  font-size: 12.5px; line-height: 1.45; margin-bottom: 8px;
  color: #243347;
}
#sovd-step-card .sc-legal {
  font-size: 10.5px; font-weight: 650; color: #3a4a63;
  border-top: 1px solid rgba(47,66,102,0.1); padding-top: 6px;
}
/* Bannière « à vous de jouer » — très visible */
#sovd-step-card .sc-await-banner {
  display: none;
  align-items: center; gap: 8px;
  margin: 0 0 10px; padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px; font-weight: 800;
  color: #5a3a08;
  background: linear-gradient(135deg, rgba(255,214,102,0.92), rgba(255,236,170,0.88));
  border: 1px solid rgba(201,162,39,0.55);
  box-shadow: 0 0 0 0 rgba(201,162,39,0.45);
  animation: sc-await-banner-pulse 1.1s ease-in-out infinite;
}
#sovd-step-card.has-choice.is-awaiting .sc-await-banner { display: flex; }
#sovd-step-card .sc-await-banner .sc-await-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #c98900; flex-shrink: 0;
  box-shadow: 0 0 0 0 rgba(201,137,0,0.55);
  animation: sc-await-dot 1.1s ease-out infinite;
}
@keyframes sc-await-banner-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(201,162,39,0.35); transform: scale(1); }
  50% { box-shadow: 0 0 0 8px rgba(201,162,39,0); transform: scale(1.015); }
}
@keyframes sc-await-dot {
  0% { box-shadow: 0 0 0 0 rgba(201,137,0,0.55); }
  70% { box-shadow: 0 0 0 10px rgba(201,137,0,0); }
  100% { box-shadow: 0 0 0 0 rgba(201,137,0,0); }
}
#sovd-step-card.has-choice.is-awaiting {
  border-color: rgba(201,162,39,0.75);
  box-shadow:
    0 10px 32px rgba(36,48,63,0.14),
    0 0 0 3px rgba(201,162,39,0.35),
    inset 0 1px 0 rgba(255,255,255,0.65);
  animation: sc-card-await 1.4s ease-in-out infinite;
}
@keyframes sc-card-await {
  0%, 100% { box-shadow: 0 10px 32px rgba(36,48,63,0.14), 0 0 0 3px rgba(201,162,39,0.28); }
  50% { box-shadow: 0 12px 36px rgba(36,48,63,0.16), 0 0 0 7px rgba(201,162,39,0.12); }
}
#sovd-step-card .sc-choice {
  display: flex; flex-direction: column; gap: 6px;
  margin-top: 8px; padding-top: 8px;
  border-top: 1px solid rgba(47,66,102,0.1);
}
#sovd-step-card .sc-choice-h {
  font-size: 10px; font-weight: 800; letter-spacing: 0.05em;
  text-transform: uppercase; color: #5e6c84; margin-bottom: 2px;
}
#sovd-step-card.is-awaiting .sc-choice-h {
  color: #8a5a00;
}
#sovd-step-card .sc-choice-btn {
  display: block; width: 100%; text-align: left;
  border: 1px solid rgba(47,66,102,0.18); border-radius: 10px;
  padding: 8px 10px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; line-height: 1.3;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(6px);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
#sovd-step-card .sc-choice-btn.accept {
  background: rgba(47,66,102,0.88); color: #fff; border-color: transparent;
}
#sovd-step-card .sc-choice-btn.reject {
  color: #2F4266;
}
#sovd-step-card .sc-choice-btn:hover { filter: brightness(1.05); }
#sovd-step-card.is-awaiting .sc-choice-btn.accept {
  animation: sc-choice-pulse 1.15s ease-in-out infinite;
}
#sovd-step-card.is-awaiting .sc-choice-btn.reject {
  animation: sc-choice-pulse 1.15s ease-in-out infinite 0.18s;
}
@keyframes sc-choice-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
@media (prefers-reduced-motion: reduce) {
  #sovd-step-card.has-choice.is-awaiting,
  #sovd-step-card .sc-await-banner,
  #sovd-step-card .sc-await-banner .sc-await-dot,
  #sovd-step-card.is-awaiting .sc-choice-btn.accept,
  #sovd-step-card.is-awaiting .sc-choice-btn.reject {
    animation: none;
  }
}
#sovd-step-card .sc-secret {
  display: inline-block; margin: 0 0 6px; padding: 3px 8px;
  border-radius: 999px; font-size: 10px; font-weight: 800;
  color: #f7f4ee; background: rgba(47,66,102,0.85);
}
#sovd-step-card .sc-secret-hint {
  font-size: 10.5px; line-height: 1.35; margin: 0 0 8px;
  padding: 6px 8px; border-radius: 8px;
  background: rgba(255,255,255,0.35);
}
#sovd-step-card .sc-urne {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 3px; height: 36px; margin: 6px 0 8px;
}
#sovd-step-card .sc-urne i {
  display: block; width: 5px; border-radius: 2px 2px 0 0;
  background: rgba(47,66,102,0.35);
  animation: sc-urne-drop 1.4s ease-in-out infinite;
}
#sovd-step-card .sc-urne i:nth-child(1) { height: 10px; animation-delay: 0s; }
#sovd-step-card .sc-urne i:nth-child(2) { height: 16px; animation-delay: 0.15s; }
#sovd-step-card .sc-urne i:nth-child(3) { height: 12px; animation-delay: 0.3s; }
#sovd-step-card .sc-urne i:nth-child(4) { height: 18px; animation-delay: 0.45s; }
#sovd-step-card .sc-urne i:nth-child(5) { height: 11px; animation-delay: 0.6s; }
@keyframes sc-urne-drop {
  0%, 100% { opacity: 0.35; transform: translateY(4px); }
  50% { opacity: 1; transform: translateY(0); background: rgba(62,122,82,0.75); }
}
#sovd-step-card.is-secret {
  background: rgba(30, 40, 55, 0.55);
  border-color: rgba(255,255,255,0.2);
  color: #f7f4ee;
}
#sovd-step-card.is-secret .sc-act { color: #8fd0a4; text-shadow: none; }
#sovd-step-card.is-secret .sc-title,
#sovd-step-card.is-secret .sc-body {
  color: #f7f4ee; text-shadow: 0 1px 8px rgba(0,0,0,0.35);
}
#sovd-step-card.is-secret .sc-step-kicker { color: rgba(247,244,238,0.75); text-shadow: none; }
#sovd-step-card.is-secret .sc-rail li {
  background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);
  color: rgba(247,244,238,0.8);
}
#sovd-step-card.is-secret .sc-rail li.is-active {
  background: rgba(62,122,82,0.4); color: #fff;
}
#sovd-step-card.is-secret .sc-legal {
  color: rgba(247,244,238,0.8);
  border-top-color: rgba(255,255,255,0.12);
}
#sovd-step-card.is-secret .sc-urne i { background: rgba(255,255,255,0.25); }
/* rail retiré de la carte — fil d'Ariane haut séparé */
#sovd-step-card .sc-rail { display: none !important; }
@media (prefers-reduced-motion: reduce) {
  #sovd-step-card .sc-urne i { animation: none; opacity: 0.7; }
}
/* ── Fil d'Ariane glass JUSTE AU-DESSUS de la barre scénario bas ── */
#sovd-step-ariane {
  position: absolute;
  z-index: 54;
  left: 50%;
  top: auto;
  bottom: 78px; /* au-dessus de #flow-hud bas */
  transform: translateX(-50%);
  max-width: min(820px, calc(100% - 24px));
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 14px 10px;
  border-radius: 22px;
  background: rgba(255, 252, 247, 0.38);
  backdrop-filter: blur(16px) saturate(1.15);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow: 0 8px 28px rgba(36,48,63,0.1);
  font-family: "Segoe UI", system-ui, sans-serif;
  pointer-events: auto;
}
#sovd-step-ariane.is-open { display: flex; }
/* Drawer scénarios ouvert → masquer fil d'étapes + carte contextuelle
   (scope shell #sovd-root — pas body hôte) */
#sovd-root.sovd-drawer-open #sovd-step-ariane,
.sovd-root.sovd-drawer-open #sovd-step-ariane {
  display: none !important;
}
#sovd-root.sovd-drawer-open #sovd-step-card,
.sovd-root.sovd-drawer-open #sovd-step-card {
  opacity: 0 !important;
  pointer-events: none !important;
}
#sovd-step-ariane.is-awaiting {
  border-color: rgba(201,162,39,0.65);
  box-shadow: 0 8px 28px rgba(36,48,63,0.12), 0 0 0 3px rgba(201,162,39,0.22);
}
#sovd-step-ariane .sa-label {
  font-size: 11.5px; font-weight: 700; color: #1e2d45;
  text-shadow: 0 0 10px rgba(255,252,247,0.9);
  min-height: 1.2em;
  max-width: 90vw;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: center;
}
#sovd-step-ariane .sa-label:empty { min-height: 0; }
#sovd-step-ariane .sa-steps {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 5px; align-items: center;
}
#sovd-step-ariane .sa-steps li {
  position: relative;
  min-width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: #3a4a63;
  background: rgba(255,255,255,0.45);
  border: 1px solid rgba(47,66,102,0.16);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  padding: 0 2px;
}
#sovd-step-ariane .sa-steps li .sa-n { line-height: 1; }
/* Branche mindmap : nœud de décision (fork) */
#sovd-step-ariane .sa-steps li.is-branch {
  border-radius: 10px;
  min-width: 34px;
  padding: 0 6px 0 4px;
  gap: 2px;
}
#sovd-step-ariane .sa-steps li.is-branch .sa-fork {
  font-size: 11px; line-height: 1; opacity: 0.85;
  color: #8a5a00;
}
#sovd-step-ariane .sa-steps li:hover,
#sovd-step-ariane .sa-steps li.is-hover {
  background: rgba(62,122,82,0.22);
  border-color: rgba(62,122,82,0.45);
  transform: scale(1.08);
}
#sovd-step-ariane .sa-steps li.is-active {
  background: rgba(62,122,82,0.35);
  border-color: rgba(62,122,82,0.55);
  color: #1e4a2c;
  box-shadow: 0 0 0 3px rgba(62,122,82,0.2);
}
#sovd-step-ariane .sa-steps li.is-done {
  background: rgba(47,66,102,0.14);
  color: #2F4266;
}
/* Prochaine étape pendant le déplacement du dossier */
#sovd-step-ariane .sa-steps li.is-next {
  background: rgba(62,122,82,0.42);
  border-color: rgba(62,122,82,0.75);
  color: #0f3d22;
  animation: sa-next-pulse 0.65s ease-in-out infinite;
}
/* Attente de choix utilisateur — pulse fort */
#sovd-step-ariane .sa-steps li.is-awaiting {
  background: rgba(255,214,102,0.75);
  border-color: rgba(201,137,0,0.85);
  color: #5a3a08;
  animation: sa-await-pulse 0.85s ease-in-out infinite;
  z-index: 2;
}
@keyframes sa-next-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 2px rgba(62,122,82,0.28);
  }
  50% {
    transform: scale(1.16);
    box-shadow: 0 0 0 7px rgba(62,122,82,0.12);
  }
}
@keyframes sa-await-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 2px rgba(201,137,0,0.4);
  }
  50% {
    transform: scale(1.18);
    box-shadow: 0 0 0 9px rgba(201,137,0,0.08);
  }
}
/* Mini mindmap sous le nœud de décision (accept / reject) */
#sovd-step-ariane .sa-branch-row {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 2px;
}
#sovd-step-ariane.is-awaiting .sa-branch-row { display: flex; }
/* Fin de parcours : Rejouer ✓ / ✕ à la place des n° d'étapes */
#sovd-step-ariane.is-end {
  border-radius: 18px;
  padding: 10px 16px 12px;
}
#sovd-step-ariane.is-end .sa-steps { display: none; }
#sovd-step-ariane.is-end .sa-branch-row { display: none !important; }
#sovd-step-ariane .sa-end-row {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-top: 2px;
}
#sovd-step-ariane.is-end .sa-end-row { display: flex; }
#sovd-step-ariane .sa-end-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid rgba(47,66,102,0.18);
  background: rgba(255,255,255,0.75);
  color: #2F4266;
  transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
}
#sovd-step-ariane .sa-end-btn:hover {
  filter: brightness(1.04);
  transform: scale(1.03);
}
#sovd-step-ariane .sa-end-btn.replay {
  background: rgba(62,122,82,0.92);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 10px rgba(62,122,82,0.25);
}
#sovd-step-ariane .sa-end-btn.dismiss {
  background: rgba(255,255,255,0.7);
  color: #8a3a32;
  border-color: rgba(160,70,60,0.35);
  min-width: 40px;
  justify-content: center;
  padding: 7px 12px;
}
#sovd-step-ariane .sa-end-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px; height: 20px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}
#sovd-step-ariane .sa-end-btn.replay .sa-end-ico {
  background: rgba(255,255,255,0.22);
  color: #fff;
}
#sovd-step-ariane .sa-end-btn.dismiss .sa-end-ico {
  background: rgba(180,60,50,0.12);
  color: #b04038;
}
#sovd-step-ariane.is-end.outcome-success .sa-label { color: #1e4a2c; }
#sovd-step-ariane.is-end.outcome-reject .sa-label { color: #7a3a2a; }
#sovd-step-ariane .sa-branch-chip {
  border: 1px solid rgba(47,66,102,0.2);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11px; font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  background: rgba(255,255,255,0.7);
  color: #2F4266;
  animation: sa-chip-pulse 1.1s ease-in-out infinite;
}
#sovd-step-ariane .sa-branch-chip.accept {
  background: rgba(47,66,102,0.9); color: #fff; border-color: transparent;
}
#sovd-step-ariane .sa-branch-chip.reject {
  border-color: rgba(160,80,60,0.35); color: #7a3a2a;
}
#sovd-step-ariane .sa-branch-chip:hover { filter: brightness(1.06); }
#sovd-step-ariane .sa-await-hint {
  display: none;
  font-size: 11px; font-weight: 800; color: #8a5a00;
  letter-spacing: 0.02em;
}
#sovd-step-ariane.is-awaiting .sa-await-hint { display: block; }
@keyframes sa-chip-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@media (prefers-reduced-motion: reduce) {
  #sovd-step-ariane .sa-steps li.is-next,
  #sovd-step-ariane .sa-steps li.is-awaiting,
  #sovd-step-ariane .sa-branch-chip { animation: none; }
}`;

/** Injecte CSS carte + ariane (idempotent : remplace si présent). */
export function ensureWalkthroughStyles() {
  ensureUiTokens();
  if (typeof document === "undefined") return;
  let st = document.getElementById(WALKTHROUGH_STYLES_ID);
  if (st) st.remove();
  st = document.createElement("style");
  st.id = WALKTHROUGH_STYLES_ID;
  st.textContent = WALKTHROUGH_STYLES_CSS;
  document.head.appendChild(st);
}