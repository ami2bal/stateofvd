# Inventaire assets

## Source art (SSOT)

| Pack | URL | Licence | Rôle |
|---|---|---|---|
| **Roguelike RPG Pack** | https://kenney.nl/assets/roguelike-rpg-pack | CC0 | **Seul** pack pour la carte composée |

Playbook IDs : `assets/kenney/roguelike_playbook.json` **v3**  
(IDs validés via `sample_map.tmx` + `sample_indoor.tmx` + grilles visuelles `_sliced/`).

## Runtime

| Asset | Fichier | Statut |
|---|---|---|
| ground / roofs / interiors | `composed/*.png` | **roguelike v3** |
| meta + crédits | `composed/meta.json`, `CREDITS.txt` | done |
| hotspots | `hotspots.json` (9 sites + 29 rooms) | done |
| map grid | `map/world.json` 38×24 | aligned world principal |
| dossier sprite | `characters/dossier_16.*` | agent-v1 |
| refs DA | `refs/da_cible_*.jpg`, blueprint | done |

## Packs archivés (non utilisés runtime)

`rpg-urban-pack/`, `tiny-town/`, `tiny-dungeon/` restent sur disque pour référence historique.  
Le loader et `compose_roguelike_world.py` n’y touchent plus.

## Régénération

```bash
python tools/compose_roguelike_world.py
python tools/screenshot_review.py
```
