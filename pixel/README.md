# State of VD — Pixel (Roguelike RPG)

Fork **conceptuel** du simulateur `state-of-vd` : **mêmes** parcours, menus, zoom LOD, hotspots, tour dossier.  
Seul le **décor** change — [Kenney Roguelike RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) (CC0).

## Live

https://ami2bal.github.io/stateofvd/pixel/

## Dual LOD (in/out superposés)

| Zoom | Couche | Référence Kenney |
|---|---|---|
| Éloigné | `ground` + `roofs` | [Sample1](https://kenney.nl/media/pages/assets/roguelike-rpg-pack/6b88b8d663-1677697411/sample1.png) extérieur |
| Proche | `ground` + `interiors` | [Sample2](https://kenney.nl/media/pages/assets/roguelike-rpg-pack/5f73473862-1677697413/sample2.png) plan intérieur |

Crossfade inchangé (`engine/tiled.js` → `applyLod`).

## Grille

- SSOT structure : `../data/world.json`
- **Scale ×2** → grille pixel **76×48** (1216×768 px @ 16) pour des salles Sample2 spacieuses
- Hotspots régénérés par le compose

## Texture discipline (playbook v5)

- **Arbres** : paires cime+tronc
- **Chemins** : mono-tuile dirt, couloirs orthogonaux
- **Extérieur** : toits multi-pignons + façade courte (murs/porte/fenêtres)
- **Intérieur** : coque murs beige + sols par pièce + meubles ; fenêtres **dans** les murs

## Lancer

```bash
python serve.py 8771
```

→ **http://127.0.0.1:8771/pixel/**  

Le serveur monte la racine `` pour servir **à la fois** le pixel et les modules métier `state-of-vd/` (flows, flow-engine, inspector) — requis pour l’iso fonctionnel.


## Rebuild

```bash
python tools/compose_roguelike_world.py
python tools/screenshot_review.py
```

Crédit : *Assets by [Kenney](https://www.kenney.nl) (CC0)*.

