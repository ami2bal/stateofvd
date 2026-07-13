# Guide d'usage des packs d'assets (pour Grok) — State of VD Pixel

> **SSOT machine** : `PACK_sunnyside.json` · `PACK_sprout_lands.json` (structure, grilles, régions, licences).
> **Preuves visuelles** : `assets/packs/_catalog/` (`sunnyside_tileset_grid.png` = grille coord · `sunnyside_buildings_zoom.png` = kits bâtiments).
> Même méthode que le playbook Kenney (TASK-116) : **prouver** avant de câbler ; documenter l'ambigu, ne pas forcer.

## Conventions communes
- **Tuiles 16×16** dans les deux packs (Sunnyside a aussi un tileset forêt 32px).
- **Autotiles** = poser selon **masque de voisins (bitmask)**. Sprout fournit un guide (`Tilesets/Bitmask references*.png`) ; Sunnyside idem par blocs.
- **Index tuile** (atlas mono-fichier) : raisonner en `(col, row)` ; `index = col + row*colonnes`.

## Sunnyside — comment l'utiliser
- **Ne PAS crawler** `Sunnyside_World_Gamemaker/` (5439 PNG = doublon projet). Tout est dans `Sunnyside_World_Assets/`.
- **Tileset principal** `Tileset/spr_tileset_sunnysideworld_16px.png` (64×64). Régions dans le JSON (`tilesets.main_16px.regions_approx`) ; coords exactes via `sunnyside_tileset_grid.png`.
- **★ Bâtiments = 5 kits couleur** (toit bleu/vert/orange/rouge/violet), bandes de ~8 rows (blue 8-16 … purple 40-48), cols 12-36. Chaque kit = **modulaire** (toits pentus + corps mur + portes + fenêtres + tour) → composer des bâtiments de taille libre, couleur = institution.
- **Personnages** : `Characters/Human/<STATE>/<variant>_<state>_strip8.png` (768×64 = 8 frames 96×64). **Layered** : superposer `base_*` + une variante cheveux. 20 états dont **IDLE / WALKING / CARRY** (porter un dossier). Goblin/Skeleton en bonus.
- **UI** : `UI/9slice_box_white/` (27 tuiles) → panneaux 9-slice redimensionnables (inspecteur, HUD) ; + icônes flèches/barres/outils.
- **VFX** : `Elements/VFX/` fumée de cheminée (strip5), feu, glint → animer les toits.
- **Sols/props** : sols bois+pierre (cols 0-14 rows 8-16) pour les plans de salle ; mobilier/tapis/rochers dans la bande droite.

## Sprout Lands — comment l'utiliser
- **Tuiles déjà splittées par fonction** → la sémantique = le **nom de fichier** (pas de scan pénible). Cf. `PACK_sprout_lands.json`.
- **Maison bois** = `Tilesets/Wooden_House_Walls_Tilset.png` + `..._Roof_Tilset.png` (1 seul style, pas de couleurs).
- **Autotiles** grass/paths + guide bitmask fourni. Perso unique (`Basic Charakter Spritesheet.png`, 12×12), peu d'états.
- ⚠ **Doublons** fichiers (espaces vs underscores) — garder une seule version.

## Combiner les deux (si besoin)
- Même taille (16px) → **compatibles à la pose**. Mais **palettes différentes** (Sunnyside chaud/premium vs Sprout pastel doux) → mélanger jure ; choisir un **pack maître** et n'emprunter à l'autre que ponctuellement (ex. un autotile manquant).
- Recommandation de cohérence : **un seul pack maître** pour tout le rendu ; l'autre = dépannage.

## Grammaire plan-d'architecte (réutiliser l'acquis Kenney)
Aucun des deux n'a de **plan intérieur natif** (vue de dessus découpée en salles). On **compose** comme pour Kenney (TASK-116) : masse mur → sols de salle découpés → cloisons+trouées → fenêtres → meubles overlay. Les kits Sunnyside (murs+toits) servent le LOD dézoom (extérieur) ; les sols bois/pierre servent le LOD zoom (plan).

## Licences — À RESPECTER
- **Sprout Lands** : **NON-COMMERCIAL** strict (pas de NFT/IA/redistribution du pack). OK pour serious-game interne non-commercial.
- **Sunnyside** : **licence NON incluse dans l'archive** → ⚠ **vérifier les termes** (souvent pack payant, licence commerciale) avant tout usage publié.
