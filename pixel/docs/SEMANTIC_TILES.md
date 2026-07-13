# Dual LOD — Sample1 extérieur / Sample2 intérieur (v5)

## Modèle

Le fork conserve la **dynamique** du jeu principal (parcours, menus, zoom, tour).  
Seules les textures changent, avec **deux langages Kenney superposés** :

| LOD | Calque | Réf. officielle | Contenu |
|---|---|---|---|
| Zoom out | `ground` + `roofs` | [Sample1](https://kenney.nl/media/pages/assets/roguelike-rpg-pack/6b88b8d663-1677697411/sample1.png) | Herbe, chemins dirt, arbres complets, maisons toit+façade |
| Zoom in | `ground` + `interiors` | [Sample2](https://kenney.nl/media/pages/assets/roguelike-rpg-pack/5f73473862-1677697413/sample2.png) | Coque murs beige, sols par pièce, fenêtres **dans** les murs, meubles |

Preuve côte-à-côte : `assets/composed/preview_dual_lod.png`.

## Grille ×2

`world.json` 38×24 → pixel **76×48** (scale=2) pour que le kit Sample2 (murs 1 tuile + meubles + tapis) tienne dans les salles.

## Règles dures

1. Arbres = paire cime `586` + tronc `643`
2. Chemins = mono `408`, tunnels orthogonaux (avenue + embranchements)
3. Extérieur = multi-pignons + façade 2–3 rangs (jamais un pavé beige plein)
4. Intérieur = shell mur + floors + props ; fenêtres uniquement sur coque mur
5. Pas de pavé outdoor en sol de département

Playbook : `assets/kenney/roguelike_playbook.json` v5.
