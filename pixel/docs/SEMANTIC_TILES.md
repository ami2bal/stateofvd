# Cartographie sémantique Kenney + revue screenshots

## Principe

Ne plus assembler « au feeling ». Chaque tuile a un **rôle** documenté dans
`assets/kenney/semantic_playbook.json`, validé par **lecture visuelle** des
bandes `review_*.png`.

```
review strips  →  semantic_playbook.json  →  compose_kenney_world.py  →  composed/*.png
                         ↓
                 role_usage_sheet.png (preuve des IDs réellement utilisés)
                         ↓
                 screenshot_review.py → shots/*.png (runtime)
```

## Rôles (v2)

| Rôle | Pack | IDs | Usage |
|---|---|---|---|
| grass | town | 0–2 | Sol prairie |
| tree | town | 4–8, 16–17, 19, 30–32 | Lisières N/E |
| path | town | 12–14, 24, 36–38 | Chemins, sous-bâtiments |
| water | town | 48–49 | Léman |
| road | urban | **8–15 only** | Esplanade + avenue dépts |
| brick | urban | 16–22 | Murs GC / CE |
| roof | urban | **43–49 only** | Toits plats cohérents |
| door | town | 54–57 | Portes |
| house_wall | town | 50–53 | Murs dépts |
| floor | dungeon | 0–3, 16–23 | Intérieurs |
| furniture | dungeon | 4–7, 28, 32–33, 36–37 | Props sparses |

### Interdits

| Pack | IDs | Pourquoi |
|---|---|---|
| urban | **23–26** | Personnages |
| town | modular roof 66–76 | Fenêtres/pièces kit, pas fill |
| urban | props bruyants | Voitures, panneaux, PNJ |

## Outils

```bash
python tools/catalog_kenney_tiles.py   # atlas auto (aide, imperfect)
# Éditer semantic_playbook.json après revue visuelle des review_*.png
python tools/compose_kenney_world.py   # compose strict playbook
python tools/screenshot_review.py      # 5 captures runtime Playwright
```

## Revue screenshots (session agent)

Fichiers : `assets/composed/shots/`

| Shot | Constat |
|---|---|
| 01 overview | GC/CE/esplanade/7 dépts lisibles ; herbe + avenue OK |
| 02 zoom | Intérieurs visibles ; encore « carrelage » de salles |
| role_usage | Chaque rôle = tuiles homogènes (après filtre 8–15 / 43–49) |

### Écart restant vs concept Stardew

1. Bâtiments = **blocs monotiles** (pas façades multi-pièces Kenney kit)
2. Toits plats sans pente / lucarnes
3. Peu de props de vie (bancs, drapeaux, ombres portées)
4. Dépts trop similaires

**Prochaine hausse quali** : stamping de **kits multi-tiles** Tiny Town
(murs 50–53 + portes 54–57 + toits 58–65 en patterns 3×3), pas du fill.

## Crédit

Kenney.nl — CC0 (RPG Urban Pack, Tiny Town, Tiny Dungeon).
