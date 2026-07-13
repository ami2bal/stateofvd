/**
 * Design tokens UI Mode Parcours (industrialisation 2026).
 * Une seule source pour couleurs / rayons / glass — injectée une fois dans le document.
 */

export const UI = {
  ink: "#1e2d45",
  inkMuted: "#5e6c84",
  inkSoft: "#2F4266",
  gc: "#3E7A52",
  gcDeep: "#1e4a2c",
  gold: "#c9a227",
  reject: "#b04038",
  cream: "#f7f4ee",
  white: "#ffffff",
  glassBg: "rgba(255, 255, 255, 0.34)",
  glassCard: "rgba(255, 255, 255, 0.94)",
  glassBorder: "rgba(255, 255, 255, 0.55)",
  shadow: "0 8px 28px rgba(36, 48, 63, 0.1)",
  radiusPill: "999px",
  radiusCard: "16px",
  font: '"Segoe UI", system-ui, sans-serif',
  zAriane: 54,
  zCard: 55,
  zHud: 22,
};

/** CSS custom properties sur :root / #sovd-root */
export const UI_TOKENS_CSS = `
  :root, #sovd-root {
    --sovd-ink: ${UI.ink};
    --sovd-ink-muted: ${UI.inkMuted};
    --sovd-ink-soft: ${UI.inkSoft};
    --sovd-gc: ${UI.gc};
    --sovd-gc-deep: ${UI.gcDeep};
    --sovd-gold: ${UI.gold};
    --sovd-reject: ${UI.reject};
    --sovd-cream: ${UI.cream};
    --sovd-glass-bg: ${UI.glassBg};
    --sovd-glass-card: ${UI.glassCard};
    --sovd-glass-border: ${UI.glassBorder};
    --sovd-shadow: ${UI.shadow};
    --sovd-radius-pill: ${UI.radiusPill};
    --sovd-radius-card: ${UI.radiusCard};
    --sovd-font: ${UI.font};
  }
`;

const STYLE_ID = "sovd-ui-tokens-css";

/** Injecte les tokens une seule fois (idempotent). */
export function ensureUiTokens() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = UI_TOKENS_CSS;
  document.head.appendChild(st);
}
