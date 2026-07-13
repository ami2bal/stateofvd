# Plan industriel — State of VD Pixel

> Objectif : rendu **asset-driven** pixel art, UX cinématique, ship GitHub Pages.

## Jalons

| Id | Jalon | Critère de done | Statut |
|---|---|---|---|
| **M0** | Pipeline & contrat art | ART_BIBLE + loaders + seed + validate | ✅ done |
| **M1** | Carte jouable asset-driven | Tiles riches + buildings + hotspots | ✅ done |
| **M2** | Double LOD | Calques `roofs` / `interiors` selon zoom | ✅ done |
| **M3** | Tokens parcours | Dossier spritesheet + trail + SFX WebAudio | ✅ done |
| **M4** | Catalogue scénarios | 8 parcours, room-ids hotspots | ✅ done |
| **M5** | Ship Pages | `/pixel/` sur stateofvd | 🔄 en cours |

## Stack

| Couche | Choix |
|---|---|
| Runtime | Pixi 7 · NEAREST · ES modules |
| Carte | Tiled JSON multi-calques |
| Assets | `tools/gen_full_assets.py` |
| Gate | `node tools/validate_assets.mjs` |
| Serve | `python serve.py 8771` |

## Commandes

```bash
python tools/gen_full_assets.py
node tools/validate_assets.mjs
python serve.py 8771
```

## Définition de done (produit)

- [x] Sol multi-variantes (herbe/path/eau/vigne/jura)
- [x] 2 LOD (zoom → intérieurs)
- [x] Dossier animé + trail
- [x] ≥ 6 parcours
- [x] validate_assets PASS
- [ ] URL publique Pages live
