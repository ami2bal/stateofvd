# Qualité graphique concept ↔ structure State of VD

## 1. Règle non négociable

| Source de vérité | Rôle |
|---|---|
| **`state-of-vd/data/world.json`** | Géométrie, sites, salles, dépts, waypoints |
| **`room-nomenclature.js`** | Libellés courts / complets |
| **Concepts `da_cible_*.jpg`** | Ambiance (palette, densité, charme) — **pas** le plan d’architectes |

Le concept Grok montre un **Rumine / cathédrale / plan libre**.  
Le **projet principal** n’a **pas** le Palais de Rumine comme site jouable. Sites :

1. **Parlement** (GC) — salles : `plenum-gc`, `bureau-gc`, `commission`, `sgc`, `pas-perdus`
2. **Château Saint-Maire** (CE) — `college-ce`, `csg`, `chancellerie`
3. **7 départements** — chacun `…-cabinet`, `…-sg`, `…-projet`
4. Cadre décor : Jura (N), Léman (S), Lavaux (E) via `borders` / `zoneLabels`

**Toute image « idéale » future doit être redessinée / re-générée sur cette structure**, pas l’inverse.

## 2. Comment atteindre la qualité du concept (concret)

### Ce qui fait le « wow » des JPG

1. **Densité de détails** (tuiles, lierre, ombres portées, props)
2. **Matériaux lisibles** (molasse, tuiles, pavés, eau animée)
3. **Cohérence d’échelle** et silhouette des bâtiments
4. **LOD** toits vs intérieurs meublés

### Ce qui ne marche **pas**

- Coller le JPG concept tel quel (mauvais plan, Rumine, hors salles)
- Espérer du procédural pur au niveau Stardew
- Peindre un building « joli » sans empreinte `fw×fh` du world

### Chemin en 4 couches (recommandé)

| Couche | Livrable | Qui | Effort |
|---|---|---|---|
| **L0 Structure** | Carte + hotspots **= world.json** | Engine ✅ | done (ce chantier) |
| **L1 Terrains** | Tileset 16×16 pro (herbe, pave, eau 4 frames, path autotile) | Art | 3–5 j |
| **L2 Buildings** | 1 sprite (ou kit) **par site** aux dimensions `fw*16 × fh*16` + calque roof + calque interior découpé **par room id** | Art | 8–15 j |
| **L3 Life** | Dossier 4-dir, huissier, drapeaux, VFX, SFX | Art+UX | 3–5 j |

### Process art (pas à pas)

1. **Exporter le plan technique**  
   `python tools/build_from_world.py --export-blueprint`  
   → PNG fil de fer aux bonnes empreintes + labels room id (brief artiste).

2. **Brief artiste (1 page)**  
   - Palette ART_BIBLE uniquement  
   - Empreintes exactes (px)  
   - Liste room id à peindre en interior  
   - Réf ambiance : crops concept **sans** copier le plan Rumine  

3. **Peindre / générer par site**  
   Pour chaque site : `base.png`, `roof.png`, `interior.png` (rooms marquées).  
   Outils : Aseprite (idéal) ou pipeline AI → **cleanup pixel manuel** (obligatoire).

4. **Drop-in**  
   Placer dans `assets/buildings/{siteId}_*.png`  
   Relancer `build_from_world.py` (compose la map Tiled ou atlas)  
   `validate_assets.mjs`  

5. **Gate quali**  
   Capture in-game NEAREST ×3 côte-à-côte avec crop concept **même zone fonctionnelle** (GC vs GC, pas Rumine vs Parlement).

### Option accélérée (hybrid)

| Étape | Action |
|---|---|
| A | Générer une **nouvelle** image concept **contrainte** (prompt + masque du blueprint world) |
| B | Découper en tiles / buildings (TexturePacker) |
| C | Mapper chaque pièce sur room id |

Utile pour valider l’ambiance ; le cleanup pixel reste nécessaire pour NEAREST propre.

### Budget indicatif pour « niveau concept »

| Pack | Ordre de grandeur |
|---|---|
| Tileset terrain pro | 1–2 k€ ou 1 sem artiste |
| 9 sites (GC+CE+7 dépts) dual LOD | 5–10 k€ ou 3–5 sem |
| Tokens + polish | 1–2 k€ |

Sans artiste : on reste en **seed structurel** (lisibilité métier OK, charme concept non).

## 3. Alignement technique (implémenté)

```
state-of-vd/data/world.json  ──build_from_world.py──►  pixel/assets/map/world.json
                                                     pixel/assets/hotspots.json
                                                     pixel/assets/blueprint.png
game/scenarios.js  ── room ids canoniques (plenum-gc, college-ce, …)
```

Interdit dans hotspots jouables : `palais`, `rumine`, `cathedrale` (décor optionnel hors bodyCoverage seulement si PO le demande explicitement — **défaut : non**).

## 4. Checklist PO

- [ ] Blueprint = même disposition que le main (esplanade, 7 dépts sud)
- [ ] Clic salle → id world (`plenum-gc`…)
- [ ] Parcours utilisent ces ids
- [ ] Aucune fiche « Palais de Rumine »
- [ ] Art packs respectent empreintes fw/fh
