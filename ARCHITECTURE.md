# ARCHITECTURE — ce dossier

Carte du prototype « State of Vaud » (carte institutionnelle 2D vectorielle).  
Stack : **PixiJS v7.4.2** vendored · **pas de bundler** · single-page (D-007 / D-010).

---

## Vue d'ensemble

```
model/ (LECTURE SEULE — vérité métier)
  profiles/vaud.json     → institutions, bodies, salles
  schema/                → civic.core

tools/build_data.py      → data/world.json (layout grille, sites, borders)
        ↓
app.js (boot + ticker)
  → game/qa-scenarios.js (QA scenarios — extrait lot 2)
  → engine/camera.js     (contain-fit, pan/zoom, focusOn)
  → engine/theme.js      (FlowKind FK + palette sémantique)
  → game/world.js        (tilemap + buildings + chemins)
  → engine/shapes.js     (sprites bâtiments/salles/icônes)
  → engine/screenLabels  (labels écran LOD)
  → game/ambient.js      (Jura/nuages/bateau)
  → game/inspector*      (fiche RBAC, kinds via FK)
  → game/connections.js  (liens IN/OUT sur chemins)
  → game/walkthrough*    (Mode Parcours + modules)
  → game/flow-engine.js  (machine — INTANGIBLE)
  → game/flows/*         (scénarios — INTANGIBLE)
```

---

## Modules

### `engine/` — rendu & caméra

| Module | Rôle |
|---|---|
| `camera.js` | Contain-fit (100), clamp, `focusOn` (097) |
| `shapes.js` | Building sprites, portes, pathMeta, icônes salles, `RAMPS` |
| `path-graph.js` | Routage Manhattan board (flux + dossier parcours) — source unique |
| `room-icons.js` | Vignettes sémantiques animées au survol |
| `tilemap.js` | Sol / cull |
| `screenLabels.js` | Labels bâtiments + salles (LOD full/abbr 101) |
| `lod.js` | Niveaux de détail |
| `theme.js` | FlowKind `FK` + `flowColorForKind` (palette flux) |
| `room-nomenclature.js` | Libellés salles court/full |
| `render2d.js` | TILE, cellXY |
| `entities.js` | Entités / dossier legacy |
| `clock.js` / `scheduler.js` | Temps sim (sous-jacent, HUD retiré) |

### `game/` — interactions & narration

| Module | Rôle |
|---|---|
| `world.js` | Assemble scène, chemins extérieurs (cacheAsBitmap 102) |
| `ambient.js` | Décor animé + overscan (100) |
| `inspector.js` + `inspector-data.js` | Fiche + RBAC + targets[] |
| `hover-overlay.js` | Hover/select bordure |
| `connections.js` | Lignes RBAC IN/OUT sur polylines |
| `walkthrough.js` + `scenario-panel.js` | Mode Parcours (orchestrateur) |
| `walkthrough-dossier.js` | Classeur Pixi (fermé/ouvert/feed) |
| `walkthrough-styles.js` | CSS carte d'étape + fil d'Ariane |
| `walkthrough-ariane.js` | Montage fil d'Ariane + anneau timer carte |
| `step-badges.js` | Pastilles n° d'étapes (walkthrough + preview) |
| `ui-tokens.js` | Design tokens CSS partagés |
| `scenario-preview.js` | Hover catalogue + zoom drawer |
| `walkthrough-meta.js` | Bases légales / activité (hors machine) |
| `qa-scenarios.js` | Scénarios QA (extrait d’app.js) |
| `resolve-target.js` | Cible RBAC → site/room (priorité structurée) |
| `flow-engine.js` + `flows/*` + `verdict.js` | **Logique flux — ne pas modifier** |
| `demo.js` | Démo or/navette |

### `data/` · `tools/` · `attic/` · `baselines/` · `docs/`

- `data/world.json` : généré, source de layout.
- `tools/build_data.py` : rebuild layout (099/100).
- `tools/run_gates.mjs` : runner A1+A2+A4+units+C2.
- `tools/measure_embed_budget.mjs` : budget embed (gate `--gate`).
- `tools/write_baseline.mjs` : snapshot machine-readable (`baselines/<date>/`).
- `tools/audit_structured_targets.mjs` : gate A4 targets structurés.
- `docs/UX_REVIEW_CHECKLIST.md` · `docs/PROPOSITIONS_B4.md`.
- `attic/` : code mort (iso/pixel) — voir `attic/README.md`.

---

## Flux de données

1. **Profil** `vaud.json` → inventaire D-008 (sites/salles).
2. **build_data** place footprints sur grille + borders jura/lake/lavaux.
3. **Boot** charge `world.json` → `buildWorld` → sprites + pathMeta.
4. **Caméra** contain-fit au boot ; zoom user libre (min = contain).
5. **Interactions** :
   - hover/clic → inspecteur + overlay + connections (098)
   - Mode Parcours lit `flows/*` steps → chorégraphie caméra/dossier (097)
6. **Machine** flow-engine/verdict : jouable en parallèle, non réécrite par le Parcours.

---

## Invariants

- Or `#E8C15A` réservé navette.
- Chemins Manhattan dans gouttières (094/099).
- Labels salles = `screenLabels` uniquement (094 K9).
- `model/**` + `flows/**` + `verdict` + `flow-engine` = **vérité intouchable**.
