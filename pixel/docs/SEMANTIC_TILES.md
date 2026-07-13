# SEMANTIC_TILES — catalogage PROUVÉ (Kenney Roguelike RPG Pack) · TASK-116

> Grille : spritesheet **968×526**, tuiles **16×16**, spacing **1 px**, **57 col × 31 row** = 1767 IDs.
> `index = row*57 + col` · rect px `(col*17, row*17, 16, 16)`.
> Preuve visuelle : `assets/kenney/refs/atlas_catalog/verify_core.png` (tuiles ×8 labellées).
> ⚠ Les IDs de v9 étaient des **hypothèses**. Ici, seuls les IDs **prouvés à l'œil (crop)** sont retenus ; le reste est **ambigu** (à trancher, pas à forcer).

## Grammaire observée (Sample1 extérieur · Sample2 intérieur)

**Intérieur (Sample2 — LOD plan) :**
1. Le bâtiment = **masse de mur beige** sur tout le footprint.
2. Les **sols de salle** sont *découpés* dedans (rectangles inset) : pierre grise · bois brun · tapis vert.
3. Les **cloisons** = bandes de mur beige ; **porte de salle** = trouée dans la cloison.
4. Les **fenêtres** = panneaux à carreaux sombres posés **sur la coque** (replace d'une cellule mur), surtout sur les murs **horizontaux**.
5. La **porte de bâtiment** = porte pleine **arquée** bois, centrée mur bas, avec **marches** devant.
6. Les **meubles** = overlay **sur sol uniquement**.

**Extérieur (Sample1 — LOD dézoom) :**
- **Herbe** (62) / **eau** (60) en *fill* ; berge + nénuphars/rochers.
- **Chemins** terre : **une seule largeur**, grain H/V (408/465) + **coins** (406/407/464/636) selon voisins.
- **Maisons** = mur beige sous **toit brun pentu** (pignons) ; porte sombre, petites fenêtres.

## Table PROUVÉE (crop `verify_core.png`)

| Rôle | ID prouvé | subtype | orient. | preuve |
|---|---|---|---|---|
| terrain | **62** | grass | none | herbe fill ✓ |
| terrain | **60** | water | none | eau fill ✓ |
| path | **408 / 465** | path (grain V / H) | NS / EW | ✓ |
| path coins | **406/407/464/636** | path_corner | ES/NE/SW/NW | ✓ (mapping fin par masque voisins à confirmer) |
| wall | **873** | wall_solid | none | beige plein ✓ |
| wall | **868/872/874** | wall_edge (bas/O/E) | none/W/E | bords beige ✓ |
| floor | **120** | floor_office (pierre grise) | none | sol dépts/bureaux ✓ |
| floor | **121** | floor_tiled (dalles) | none | alt ✓ |
| carpet | **922** | carpet_council (vert bordé) | none | **tapis collège CE** ✓ (≠ 983) |
| carpet | **923** | carpet_full | none | ✓ |
| window | **215** | window_rect (4 carreaux) | mur horizontal | + allumées **216/217/218** ✓ |
| window | **158 / 272** | window_arch | à préciser | + **159/160 / 273** ✓ |
| window | **274** | window_small | — | petit modèle |
| opening salle | **168** | door_room_arch (arche+tenture) | cloison | + **169/170** ; décoratif |

## Pièges confirmés (⛔ forbidden)

| ID | RÉEL | Faux rôle v9 |
|---|---|---|
| **201** | **miroir** arqué | ❌ « porte d'entrée » |
| **200** | miroir ovale | ❌ architecture |
| **202** | 2 objets ronds | ❌ architecture |
| **214** | **rocher** | ❌ « fenêtre » (voisin 215) |
| **333** | **champignon** | ❌ « porte » (voisin 331) |
| **867** | tuile orange | ❌ mur beige |

## Ambigus — TOUS TRANCHÉS (v10.1, vérité terrain sample_map.tmx + sample_indoor.tmx)

1. **Porte de bâtiment ✅** : **372/373** (porte double bois, imposte+poignée — posée sur chemin dans le TMX) ; portes simples **90** (imposte grise) et **33** (arrondie) ; vantaux grange sombres **484/485**. ❌ 331 = FENÊTRE (le stack façade = fenêtre 331 à l'étage AU-DESSUS de la porte 90 au rez). Preuve : `verify_doors_outdoor.png`.
2. **Hall bois ✅** : famille **697-701 / 756-758** (698 VALIDE, confirmé TMX indoor) ; brun-brique alt = 119.
3. **Fenêtres N/S vs E/W ✅** : modèle réel = **empilement** coiffe arquée (158/159/160) + corps (215/216/218) — pas d'orientation latérale.
4. **door_room ✅** : **trouée** dans la cloison (168 = arche à tentures décorative, non utilisée dans le TMX).

Nouveaux pièges (extérieur) : 425=poubelle métal · 67/296/10/240=étal de marché · 564-566/620-621/677-680=cimetière · 540/597/654=arbres morts.

## Programmes de salles (structure conservée, sols à re-confirmer)

| id | sol | mobilier |
|---|---|---|
| hemicycle | bois brun (⚠ ID à confirmer) + tapis | table + chaises conseil |
| college / meeting | bois brun | table + chaises |
| dept / office | pierre grise **120** ✓ | bureau + chaise + armoire |
| corridor | pierre **120** | — |
| conseil (tapis) | **922** ✓ | table à sept |

## Prochaines étapes (finir la DoD 116)
- Planches numérotées par famille (murs/sols/portes/fenêtres N-S/fenêtres E-W/chemins/toits/meubles).
- Trancher les 4 ambigus (crops ciblés + comparaison Sample2).
- ≥ 4 PNG d'assemblage (bureau dépt · 2 salles+cloison · hémicycle · collège CE).
- Playbook **v10** + régénération `compose_roguelike_world.py` sans régression.
