# State of VD — Pixel (Kenney mix)

Simulation institutionnelle vaudoise en **pixel art**, assets **Kenney CC0**.

## Live

https://ami2bal.github.io/stateofvd/pixel/

## Stack assets

| Pack | Rôle |
|---|---|
| [RPG Urban Pack](https://kenney.nl/assets/rpg-urban-pack) | Trottoirs / avenues (greys filtrés) |
| [Tiny Town](https://kenney.nl/assets/tiny-town) | Herbe, arbres, eau, toits, murs bâtiments |
| [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | Sols intérieurs + props |

**Mix** : Urban pour le côté « ville », Tiny Town pour le campus lisible, Dungeon pour le zoom intérieur.  
**Layout** : `../state-of-vd/data/world.json` (Parlement · Château · 7 dépts — pas Rumine).

Crédit : *Assets by [Kenney](https://www.kenney.nl) (CC0)*.

## Lancer

```bash
python serve.py 8771
```

- Molette **zoom** → ouvre les toits (intérieurs)
- Glisser = pan · scénarios à gauche

## Rebuild

```bash
python tools/build_from_world.py      # hotspots + grille
python tools/compose_kenney_world.py  # ground/roofs/interiors PNG
node tools/validate_assets.mjs
```

## Structure

```
assets/kenney/          packs CC0 bruts
assets/composed/        carte assemblée (runtime)
assets/hotspots.json    salles world.json
engine/tiled.js         charge composed en priorité
```
