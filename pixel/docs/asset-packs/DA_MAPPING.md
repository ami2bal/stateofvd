# DA_MAPPING — de la DA cible au plan de masse assemblable (TASK-117)

> **Machine** : `assets/sprite-library/mapping.json` (à lire avec `library.json` + `combinatorics.json`).
> **DA cible** (page wiki 2192375815, sources locales) : `da_cible_toits.jpg` (LOD dézoom) · `da_cible_ouvert.jpg` (LOD zoom).
> **Plan de masse** : `proto/state-of-vd/data/world.json` (LECTURE SEULE) — 9 sites, grille 38×24 (compose ×2 → 76×48).

## Ce que dit la DA (check-list)

Cadre N→S (Jura + pics enneigés + forêt / Léman + rive + quai + barque), vignes **Lavaux** à l'Est, **cathédrale** à l'Ouest · toits pentus tuilés, **GC à accent VERT** (lanterne), **CE à toit ROUGE** + vigne · **esplanade pavée + statue DORÉE** (l'or = responsabilité, couleur réservée) · **départements = échoppes à auvents colorés** · chemins ocre/pavés, arbres, fleurs · **vue ouverte** : sols bois chauds, salles meublées · cheminées fumantes.

## Le mapping institutionnel (la DA rencontre les 5 kits)

| Site (world.json) | Kit couleur | Justification DA | Recettes |
|---|---|---|---|
| **parlement** (14×9) | **green** | lanterne verte GC | roof_EW + aile N-S + cheminées+fumée |
| **chateau** (12×9) | **red** | toit rouge Château + vigne | roof_EW + **tour** + volets + vigne (plants) |
| 7 départements (3×5) | **blue/orange/purple** alternés | échoppes à auvents colorés | gablefront + **auvent d'étal** (furniture_props) |

Vert et rouge sont **réservés** aux deux institutions — les départements tournent sur les 3 autres kits (l'ordre exact est dans `mapping.json › sites`).

## Programmes de salles (vue ouverte)

Sols : **bois** (halls politiques : plénum, bureau, commission, collège, cabinets) · **pierre** (services : SGC, CSG, chancellerie, SG/projet, corridors). **1 meuble signature par salle** (bancs en arc au plénum, grande table du collège, presse à la chancellerie…) + tapis aux 2 salles nobles. Détail par `roomId` dans `mapping.json › room_programs`.

## Extérieur

- **Jura (N)** : rangs d'arbres + rochers + bande neige. *(gap : pas de tileset « montagne » natif — composer, ou conserver la frange stylisée.)*
- **Léman (S)** : eau + berges bitmask, rive sable, **quai en platelage bois** (floor_wood_deck), **barque** (`spr_deco_coracle`).
- **Lavaux (E)** : rangs de **treillis** (fences_wood) + plants = vignes.
- **Esplanade + allées** : pierre, **une seule largeur**, portes alignées.

## ⚠ Gaps assumés (à valider DA — ne pas forcer)

1. **Statue dorée** : l'or est réservé (règle DA) et Sunnyside n'a pas de statue dorée → **sprite custom à produire** ou statue grise + halo doré runtime.
2. **Cathédrale (O)** : pas de modèle natif → **à composer** (tour violette + pignon + fenêtres sombres), à valider visuellement.
3. **Bande montagne** : rochers+neige composés, ou frange stylisée conservée.

## Pipeline d'assemblage (résumé pour Grok)

`world.json` (lecture) → sol+bordures → par site : façade puis toit selon **kit couleur** → par salle : sol du programme + cloisons + trouées + signature → props/vie (arbres, fumée, auvents, barque) → **dual-LOD** (couche roofs basculable) → `validate_sprite_library.py` doit rester PASS. Détail pas-à-pas : `mapping.json › assembly_pipeline_for_grok`.
