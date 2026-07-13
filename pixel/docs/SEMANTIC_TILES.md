# Cartographie sémantique — Roguelike RPG Pack

## Principe

**Un seul pack** : [Roguelike RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) (Kenney CC0).  
Chaque tuile a un **rôle** dans `assets/kenney/roguelike_playbook.json` **v3**, validé par :

1. Fréquences `sample_map.tmx` / `sample_indoor.tmx`
2. Grilles visuelles `_sliced/building_kit.png`, `furn_ids.png`, `candidates_48.png`
3. Preuve runtime `composed/role_usage_sheet.png` + `shots/*.png`

```
TMX + sheet visuelle
        ↓
roguelike_playbook.json v3
        ↓
compose_roguelike_world.py  →  composed/{ground,roofs,interiors}.png
        ↓
screenshot_review.py → shots/*.png
```

## Rôles (v3)

| Rôle | IDs | Usage |
|---|---|---|
| grass | 62 | Prairie (sample Ground 9858×) |
| dirt_path | 408, 465 | Chemins |
| cobble | 920, 919 | Esplanade |
| water_fill | 60 | Léman |
| tree | 586, 643 | Lisières N/E |
| wall_beige | 873, 872 | Murs bâtiments |
| roof_fill | 1275, 1288, 1274 | Corps de toit brun |
| roof_peak_l/r | 1217 / 1218 | Pignons |
| roof_eave_l/r | 1331–1346 | Avant-toits |
| door | 201 | Portes |
| window | 215–218 | Fenêtres mur |
| floor_stone | 119, 120 | Intérieur |
| floor_wood | 698, 756 | Hémicycle |
| carpet_green | 983… | Tapis plénum |
| furniture_* | 180–191, 160–163… | **Props sparses uniquement** |

## Invariants

- Meubles **jamais** en mur / toit / sol.
- Bâtiments = kit modulaire Sample1 (pignon + corps + mur beige + porte/fenêtre).
- Intérieurs = Sample2 (sol + ≤3 props / salle).
- Pas de mix Urban / Tiny Town / Tiny Dungeon au runtime.
