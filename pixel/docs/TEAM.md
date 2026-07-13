# Team — State of VD Pixel

Organisation légère **proto BA + agents**. Pas une boîte de prod : des **rôles clairs**, des **livrables**, des **gates**.

## 1. Organigramme

```
                    ┌─────────────────┐
                    │  PO / Directeur │
                    │     (toi)       │
                    └────────┬────────┘
                             │ go / no-go jalons
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌────────────┐   ┌────────────┐   ┌────────────────┐
    │ Art Lead   │   │ Engine     │   │ UX / Scénarios  │
    │ (Grok+PO)  │   │ Lead(Grok) │   │ (Grok + PO)    │
    └─────┬──────┘   └─────┬──────┘   └───────┬────────┘
          │                │                  │
          ▼                ▼                  ▼
    tilesets/build   loaders/render     tour/hotspots
    palette/LOD      Tiled/atlas        catalogue parent
```

## 2. RACI (jalons M0–M3)

| Livrable | PO (toi) | Art Lead | Engine | UX |
|---|---|---|---|---|
| ART_BIBLE / palette | **A** | R | C | C |
| Seed tileset + packs | C | **R** | C | I |
| Map Tiled world | C | R | **R** | C |
| Loaders Pixi | I | C | **R** | I |
| Double LOD | A | R | **R** | C |
| Parcours / cards | A | C | C | **R** |
| Publish Pages | **A/R** | I | R | C |
| Gate validate_assets | I | C | **R** | I |

**R** = réalise · **A** = accountable (valide) · **C** = consulté · **I** = informé

## 3. Fiches de rôle

### PO / Directeur artistique (toi)
- Valide ambiance vs concepts (go / no-go chaque jalon)
- Tranche scope (16 vs 32, publish ou non)
- OK humain pour tout publish GitHub public
- Temps estimé : **30–45 min / jalon** de revue

### Art Lead (agent + validation PO)
- Respecte ART_BIBLE (grille, palette, naming)
- Produit / régénère tiles, buildings, tokens
- Tient `docs/ASSETS.md` à jour (statuts)
- Ne commit **pas** de raw AI flou non nettoyé

### Engine Lead (agent)
- Loaders, fallback, perf, validate tool
- Zéro secret, zéro SIEL dans bundle public
- Compat GitHub Pages (chemins relatifs)

### UX / Scénarios (agent + PO)
- Hotspots room-id, tour, cards, reduced-motion
- Alignement catalogue `state-of-vd` parent (M4)

### QA Gate (automatique)
- `node tools/validate_assets.mjs`
- Smoke HTTP local (index, atlas, map)

## 4. Cadence

| Rituel | Quand | Format |
|---|---|---|
| Stand-up écrit | début de session agent | 5 lignes dans PLAN §statuts |
| Revue PO | fin de jalon M* | checklist PLAN §7 + captures |
| Art pass | à chaque pack | PNG + entrée ASSETS.md |
| Ship | M5 | OK PO explicite |

## 5. Canaux & artefacts

| Quoi | Où |
|---|---|
| Plan live | `docs/PLAN.md` |
| Inventaire art | `docs/ASSETS.md` |
| Contrat pixels | `docs/ART_BIBLE.md` |
| Code | `engine/`, `game/`, `tools/` |
| Assets | `assets/` (voir ASSETS.md) |
| Hand-off LLM | optionnel `tasks/TASK-11x-sovd-pixel-*.md` |

## 6. Escalade

1. **Bloqué art** → seed procédural + track A, ne pas arrêter engine  
2. **Bloqué perf** → bake static layer, réduire ambient  
3. **Désaccord DA** → PO tranche sur capture côte-à-côte concept vs build  

## 7. Kickoff — affectations immédiates (M0)

| Qui | Mission maintenant |
|---|---|
| **Engine** | Scaffold assets, loaders, validate, brancher app |
| **Art** | Seed tileset 16×16 + placeholders buildings |
| **UX** | Garder tour/hotspots compatibles `hotspots.json` |
| **PO** | Revue M0 dès smoke vert (5–10 min) |
