# Orientation spatiale des textures (playbook v6)

## Grille de lecture

Chaque tuile structurelle a une **orientation** (2 ou 4 directions).  
On ne place **jamais** une tuile « au hasard » : le choix dépend du **rôle spatial** (bord, coin, axe).

```
        N (1)
         │
  W (8) ─┼─ E (2)
         │
        S (4)
```

## Chemins (4-way)

| Masque voisins path | Tuile | Sens |
|---|---|---|
| N, S, N+S | `408` | grain **vertical** |
| E, W, E+W | `465` | grain **horizontal** |
| N+E | `407` | coin NE |
| E+S | `406` | coin ES |
| S+W | `464` | coin SW |
| N+W | `636` | coin NW |
| T NSW / ESW | `405` / `404` | jonctions (sample_map) |

Source : fréquences `sample_map.tmx` Objects + validation visuelle.

## Toits (kit gable 2-way L/R × 3 rangs)

| Rôle | ID | Face |
|---|---|---|
| TL / TR | 1217 / 1218 | pignon haut gauche / droite |
| ML / MR | 1331 / 1332 | rive gauche / droite |
| BL / BR | 1345 / 1346 | égout gauche / droite |
| TOP / FILL | 1288 / 1275 | faîtage / corps |

Multi-pignons = **répéter** le kit par segment (pas un fill aléatoire).

## Arbres (2-way vertical)

| Rôle | ID |
|---|---|
| Cime (au-dessus) | 586 |
| Tronc (en dessous) | 643 |

## Façade / intérieurs

- Porte **face sud** (entrée)
- Fenêtres extérieures sur rang mur sous égout (face sud)
- Fenêtres intérieures **uniquement** sur coque mur N/W/E (Sample2)
- `wall_top` (871) = arase sous toit · `wall` (873) = corps

## Dual LOD

| Zoom | Calque | Réf. |
|---|---|---|
| out | ground + roofs | Sample1 orienté |
| in | ground + interiors | Sample2 plans |

Preuves : `preview_roofs.png`, `preview_dual_lod.png`, `role_usage_sheet.png`.
