# Dictionnaire sémantique v9 — plan d’architecte animé

> **But** : serious game 2D type plan d’architecte (Sample1 outdoor / Sample2 indoor).  
> **SSOT** : `assets/kenney/roguelike_playbook.json`  
> **Preuve visuelle** : `assets/kenney/refs/atlas_v9/`

## Critères de qualification (chaque sprite)

| Critère | Question |
|---|---|
| **role** | mur / sol / ouverture / meuble / terrain / toit ? |
| **subtype** | office_floor, hall_wood, door_building, window_ew… |
| **orientation** | N/S/E/W ou isotrope |
| **layer** | ground · roofs · interiors |
| **assembly** | fill · replace · overlay · ring |
| **forbidden** | IDs ressemblants mais faux rôle |

## Ouvertures (point faible corrigé)

| Rôle | ID | Mur | Assemble |
|---|---|---|---|
| Porte bâtiment | **331** | façade d’entrée | **remplace** cellule mur |
| Porte salle | **168** | cloison entre 2 sols | **remplace** milieu de cloison |
| Fenêtre N/S | **215** | mur horizontal | **remplace** sur arête N/S |
| Fenêtre E/W | **158** | mur vertical | **remplace** sur arête E/W (arche latérale) |

**Interdits** : `201` comme porte · `215`/`272` sur murs E/W · flotter une ouverture hors mur.

## Sols

| Programme salle | ID | Illustre |
|---|---|---|
| `dept` / `office` / `corridor` | **120** (alt 119) | bureau pierre grise |
| `hemicycle` / `college` / `meeting` | **698** (alt 756) | hall bois |
| tapis conseil | **922** (alt 923) | carpet vert inset — **pas** 983 |

## Murs — grammaire d’assemblage

```
1. paint WALL mass sur tout le footprint
2. carve FLOOR dans chaque room rect (déjà inset)
3. partitions = bande WALL entre rooms + DOOR_ROOM
4. openings extérieures = REPLACE sur le shell (NS/EW)
5. door_building en dernier (gagne sur fenêtre)
6. furniture OVERLAY sols uniquement
```

## Façade / chemin

- `door_facade()` : entrée world au **nord** du footprint → porte **N** (dépts) ; au sud → porte **S** (GC/CE)
- Chemin mono-voie jusqu’à `outside_of_door()`
- Toit Sample1 : bande façade d’entrée **sans** toit

## Programmes de salles

| id | sol | mobilier |
|---|---|---|
| hemicycle | bois + carpet | table + chaises conseil |
| college | bois | table + chaises |
| meeting | bois | table + chaises |
| dept / office | pierre grise | bureau + chaise + armoire |
| corridor | pierre | — |
