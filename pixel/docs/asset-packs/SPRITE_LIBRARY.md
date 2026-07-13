# SPRITE LIBRARY — dictionnaire sémantique & manuel d'assemblage (TASK-117)

> **SSOT machine** : `assets/sprite-library/library.json` (2091 entrées, 44 familles) · `combinatorics.json` (règles) · `mapping.json` (DA ↔ plan de masse).
> **Preuves** : `assets/sprite-library/sheets/` (24 planches par famille, `*` = tuile qualifiée finement) · `assets/packs/_catalog/` (crops labellés).
> **Validation** : `python tools/validate_sprite_library.py` — toute référence doit résoudre.
> Régénération : `python tools/build_sprite_library.py`.

## 1. Les sources

| Pack | Rôle | Licence |
|---|---|---|
| **Sunnyside V2.1** | **MAÎTRE** (tout le rendu) | ⚠ non incluse dans l'archive — **vérifier avant usage publié** |
| Sprout Lands Basic | appoint ponctuel | **non-commercial strict** |
| Kenney Roguelike | runtime actuel du compose (playbook v10.1, indépendant) | CC0 |

**Convention tileset Sunnyside** : `spr_tileset_sunnysideworld_16px.png`, 64×64 tuiles de 16 px, **sans spacing** ; adresse = `(col,row)` ; id librairie = `sun_c{col}r{row}`.

## 2bis. ★ LA méthode d'assemblage : PREFABS vérité terrain (Room1)

Le pack contient sa **démo officielle** (`Sunnyside_World_Gamemaker/rooms/Room1/Room1.yy`, 86×48, couches sea/land/paths/building/walls/decoration). Décodée par `tools/extract_sunnyside_room1.py` → **`room1_ground_truth.json` : 25 PREFABS réels** (maisons complètes toits orange/rouge/bleu/vert **+ un intérieur meublé entier** = la vue ouverte de la DA), en matrices exactes (index tileset par cellule). Rendus : `assets/sprite-library/prefabs/`.

**Règle d'or : TAMPONNER les prefabs** (base + overlays) — c'est le dessin de l'artiste, véracité par construction. L'assemblage tuile-par-tuile from scratch a **échoué visuellement** (proofs v1) : les tuiles de kit sont des fragments d'exemples, pas des autotiles.

**Transposition couleur** (pour GC=vert, CE=rouge…) : toute tuile de bande kit (cols 15-35, rows 8-48) → `row2 = row + (band_dst − band_src)` ; bandes blue=8/green=16/orange=24/red=32/purple=40 ; slot cible vide → **repli tuile source**. **Prouvé** : `proofs/proof_3_transposition_gc_ce.png` (bleu → vert GC → rouge CE).

**Redimensionner** : dupliquer les colonnes CENTRALES du prefab (jamais bords/pignons) ; idem rangées de pente médianes.

## 2. La découverte clé : 5 kits de bâtiment palette-swap

Les bâtiments existent en **5 couleurs de toit** — bandes de 8 rows à **mise en page identique** (cols 15-35) :

| Kit | Rows | Usage State of VD (cf. mapping.json) |
|---|---|---|
| `blue` | 8-16 | départements (alternance) |
| `green` | 16-24 | **Grand Conseil** (vert GC) |
| `orange` | 24-32 | départements (alternance) |
| `red` | 32-40 | **Conseil d'État** |
| `purple` | 40-48 | départements (alternance) |

→ **Toute recette apprise sur un kit vaut pour les 5** (substituer la bande). Les recettes détaillées (toit E-W, façade, tour, pignon-front, aile N-S, cheminée+fumée) sont dans `combinatorics.json › building_kit`.

## 3. Grammaire d'assemblage (l'ordre qui marche)

**Extérieur (LOD dézoom = `da_cible_toits.jpg`)** :
1. **Sol** : herbe autotile (fill + transitions bitmask) ; eau + berges ; allées pierre **une seule largeur**.
2. **Façades** (couche walls) : `wall_plain` × largeur, **une `wall_door` alignée sur l'allée**, fenêtres `window_dark_panel` symétriques, volets en accent.
3. **Toit** (couche roofs, au-dessus) : `roof_top_edge` → `ridge_chevron(+peaks)` → pentes (`slope_edge_W|shingles|roof_face_light|slope_edge_E`) → `eaves_beam` → `eaves_shingle_bottom`. Cheminée + **vfx fumée** (strip5) une tuile au-dessus.
4. **Végétal/props** : arbres sur herbe (jamais sur allée), rochers en accents, clôtures.

**Intérieur (LOD zoom = `da_cible_ouvert.jpg`)** — grammaire héritée de Kenney (TASK-116) :
1. Masse mur (couleur du kit) sur le footprint → 2. **sols de salle découpés** (bois=halls, pierre=bureaux) → 3. cloisons + **trouées** (portes de salle) → 4. **meubles overlay sur sol uniquement** (1 signature par programme de salle) → 5. tapis en overlay centré.

**Z-order global** : `ground < paths < walls < furniture < entities < roofs < vfx < ui`.
**Dual-LOD** : le bâtiment est composé DEUX fois (fermé/ouvert) ; on bascule la couche `roofs` selon le zoom — exactement les deux images de la DA cible.

## 4. Personnages (système en couches)

`Characters/Human/<STATE>/<variant>_<state>_strip8.png` → 8 frames de **96×64**, ancrage bas-centre.
**Composer** : frame *i* de `base_…` **+** frame *i* d'une variante cheveux (`bowlhair`…`spikeyhair`) (+`tools`).
20 états ; pour le jeu : **IDLE** (en salle), **WALKING** (sur allées), **CARRY** (★ porte un dossier — le fil conducteur du Mode Parcours). Échelle : ≈1,5 tuile de haut, **taille native ×zoom entier** (jamais d'étirement).

## 5. UI & VFX

- **`ui_9slice`** (27 tuiles) → tous les panneaux redimensionnables (inspecteur, cards, HUD).
- **`ui_icons`** → flèches/barres/outils (transport du Parcours).
- **`vfx_smoke/fire/glint`** (strips) → cheminées vivantes, accents.

## 6. Best practices (le métier)

1. **Un pack maître par scène** — ne jamais mélanger les palettes Sunnyside/Sprout sans validation DA.
2. **Prouver avant de poser** : chaque tuile utilisée doit exister dans `library.json` (le validateur casse sinon) ; en cas de doute visuel → crop labellé (méthode TASK-116).
3. **Autotiles au masque de voisins** (4/8-bitmask) pour herbe/eau/chemins — pas de pose manuelle des transitions.
4. **Les portes regardent les allées** ; une seule entrée principale par bâtiment ; jamais de porte dans une rangée de toit.
5. **Cohérence intérieur/extérieur** : les murs intérieurs réutilisent le `wall_plain` du kit couleur du bâtiment.
6. **Meubles = signatures** : une pièce se lit par UN meuble signature (hémicycle → bancs en arc ; collège → grande table ; bureau → pupitre+étagère), pas par l'accumulation.
7. **`fine:true` d'abord** : pour l'assemblage, ne piocher que des tuiles qualifiées ; les `fine:false` exigent une vérification visuelle préalable (planche de famille).
8. **Pièges** (`forbidden` de combinatorics.json) : curseurs `ui_inline` ≠ props ; étal de marché ≠ architecture ; ne pas upscaler les persos.

## 7. Limites connues (honnêtes)

- Les régions des familles **non prioritaires** (props/food/misc) sont calibrées à ±1-2 tuiles — vérifier la planche avant usage fin.
- Sunnyside n'a **pas de plan intérieur natif** : les intérieurs sont **composés** (grammaire §3) — c'est voulu et prouvé faisable (assemblages Kenney).
- Le **runtime actuel** (compose) reste sur Kenney ; la bascule Sunnyside = WO séparé (décision user).
