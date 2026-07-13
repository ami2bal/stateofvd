# Inventaire assets

| Pack | Fichiers | Statut |
|---|---|---|
| refs DA | `refs/da_cible_*.jpg` | done |
| blueprint | `refs/blueprint_world.png` + `blueprint_rooms.md` | done |
| terrain_16 | `tilesets/terrain_16.png` (gid-stable, art pass) | **agent-v1** |
| buildings | `buildings/*_{roof,interior}.png` × 9 sites | **agent-v1** |
| map | `map/world.json` 38×24 aligned world.json | done |
| hotspots | 9 sites + 29 rooms | done |
| dossier | `characters/dossier_16.*` | **agent-v1** |
| UI panel | `ui/panel_9slice.png` | seed |

Régénération art :
```bash
python tools/gen_art_pass.py
# ou
python tools/gen_full_assets.py
```
