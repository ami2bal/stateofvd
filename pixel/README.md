# State of VD — Pixel (Roguelike RPG)

Simulation institutionnelle vaudoise en **pixel art**.  
**Source art unique** : [Kenney Roguelike RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) (CC0).

## Live

https://ami2bal.github.io/stateofvd/pixel/

## Direction artistique

Langage visuel calqué sur les samples Kenney du pack :

| Couche | Référence | Tiles (playbook v3) |
|---|---|---|
| Terrain | `Sample1` / `sample_map.tmx` | herbe `62`, chemins `408/465`, eau `60`, arbres `586/643`, pavés `920` |
| Bâtiments | maisons Sample1 | murs beige `872/873`, toits bruns modulaires `1217–1346`, portes `201`, fenêtres `215–218` |
| Intérieurs | `Sample2` / `sample_indoor.tmx` | sols pierre/bois, tapis vert hémicycle, **meubles en props sparses** |

**Invariants**

- Un seul pack — pas de mix Urban/Tiny Town/Dungeon.
- Les meubles ne sont **jamais** utilisés en mur / toit / sol.
- Layout = `../state-of-vd/data/world.json` (Parlement · Château · 7 dépts).

Crédit : *Assets by [Kenney](https://www.kenney.nl) (CC0) — Roguelike RPG Pack*.

## Lancer

```bash
python serve.py 8771
```

- Molette **zoom** → ouvre les toits (intérieurs)
- Glisser = pan · scénarios à gauche

## Rebuild

```bash
python tools/build_from_world.py         # hotspots + grille
python tools/compose_roguelike_world.py  # ground/roofs/interiors (playbook v3)
python tools/screenshot_review.py        # shots Playwright
node tools/validate_assets.mjs
```

Playbook machine-readable : `assets/kenney/roguelike_playbook.json`.

## Structure

```
assets/kenney/roguelike-rpg-pack/   pack CC0 brut
assets/kenney/roguelike_playbook.json
assets/composed/                    carte assemblée (runtime)
assets/hotspots.json
engine/tiled.js                     charge composed en priorité
tools/compose_roguelike_world.py
```
