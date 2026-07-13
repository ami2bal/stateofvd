# Art Bible — State of VD Pixel

Contrat **non négociable** pour tout asset. Si ça viole la bible → rejeté par `validate_assets`.

## 1. Grille & projection

| Paramètre | Valeur |
|---|---|
| Tile | **16×16** px |
| Chunk logique carte | 30 × 23 tiles → **480 × 368** px monde (aligné MAP_W/H) |
| Projection | Top-down léger 3/4 (toits lisibles, murs 1 bande bas) |
| Scale runtime | ×2 … ×4, **NEAREST** uniquement |
| Origine | coin haut-gauche ; Y augmente vers le sud (Léman) |

## 2. Palette (48 max)

Couleurs **index** — hex exactes. Noms utilisés dans le code/tools.

| Id | Hex | Usage |
|---|---|---|
| ciel | `#D6E8F4` | ciel |
| jura_far | `#9DB3BC` | montagne lointaine |
| jura_near | `#6E8A6E` | forêt Jura |
| snow | `#F3F6F4` | cimes |
| herbe | `#8FBC6A` | sol principal |
| herbe_deep | `#6A9A4A` | ombre herbe |
| herbe_lite | `#A8D07A` | highlight herbe |
| path | `#C9B896` | chemins |
| pave | `#B8B0A0` | esplanade |
| pave_deep | `#968E80` | joints pavés |
| sable | `#D4C4A0` | plage |
| eau | `#4C83AB` | Léman |
| eau_lite | `#6BA4C8` | reflet |
| eau_deep | `#2E5A7A` | profondeur |
| molasse | `#D4C8B0` | murs |
| molasse_deep | `#B0A48C` | ombre mur |
| crepi | `#EDE8DC` | intérieur / enduit |
| brique | `#A4553E` | accent CE |
| brique_lite | `#C47058` | highlight brique |
| toit | `#B4674F` | tuiles |
| toit_deep | `#8E4838` | ombre toit |
| vert_gc | `#3E7A52` | header GC |
| or_ce | `#C9A45C` | or / statue |
| or_deep | `#A08040` | or ombre |
| encre | `#2F4266` | UI / texte carte |
| vitre | `#9FC2DC` | fenêtres |
| bois | `#8B6914` | portes / cale |
| bois_lite | `#B8893A` | bois clair |
| feuille | `#3D7A3A` | arbres |
| feuille_deep | `#2A5A28` | feuillage ombre |
| vigne | `#5A8A3A` | Lavaux |
| shadow | `#2A3028` | ombres (alpha OK) |
| paper | `#F4EFE4` | UI paper |
| white | `#FFFFFF` | highlights max |
| black | `#1A2030` | traits max |

Toute couleur hors liste → warning validate (error en mode `--strict`).

## 3. Calques carte (Tiled)

Ordre bas → haut :

| Layer | Type | Contenu |
|---|---|---|
| `ground` | tile | herbe, pave, path, sable, eau |
| `ground_deco` | tile | fleurs, joints, mousse |
| `paths` | tile | chemins prioritaires |
| `buildings_base` | tile/object | murs, sols intérieurs |
| `buildings_interior` | tile | meubles (LOD zoom-in) |
| `buildings_roof` | tile | toits (LOD zoom-out) |
| `props` | object | statue, drapeaux, bateau |
| `hotspots` | object | zones cliquables (name = room id) |
| `collision` | tile | walkable mask (option M3) |

**Règle LOD** :  
- `scale < 2.0` → roofs visibles, interiors alpha 0  
- `scale ≥ 2.0` → interiors visibles, roofs alpha 0 (crossfade 200 ms)

## 4. Naming fichiers

```
assets/
  refs/                 # concepts (non runtime)
  tilesets/
    terrain_16.png      # 8×8 tiles = 128×128 sheet min
    terrain_16.json     # meta (optionnel Tiled tsx export)
  buildings/
    gc_{base,roof,interior}.png
    ce_{base,roof,interior}.png
    rumine_{base,roof,interior}.png
    dept_strip.png
  characters/
    dossier_16.png      # 4 dir × 4 frames
    usher_16.png
  ui/
    panel_9slice.png
    icons_16.png
  atlases/
    main.json           # frame dict
    main.png
  map/
    world.json          # Tiled export
  hotspots.json         # room id → rects (runtime truth)
```

Convention frame atlas : `{pack}/{name}_{dir?}_{frame?}`  
Ex. `characters/dossier_s_0`, `buildings/gc_roof`.

## 5. Spéc sprites hero

### Dossier (token parcours)
- Canvas : 16×16 par frame  
- 4 directions N/E/S/O × 4 frames walk + 1 idle  
- Pivot : bas-centre  
- Couleur dominante : paper + or_ce

### Building module
- Multiple de 16 px  
- Ombre portée **dans** le PNG (sud-est, 2–3 px)  
- Contour 1 px `molasse_deep` max

## 6. Interdits

- ❌ JPEG pour tiles/sprites runtime (PNG 8 ou 32-bit only)  
- ❌ Scale LINEAR / flou  
- ❌ Texte produit interne / URLs privées dans l’art  
- ❌ Sprite unique 4K non découpé  
- ❌ Palette “proche” non listée  

## 7. Acceptation art (revue PO)

Pour chaque pack :

1. Capture in-game NEAREST ×3  
2. Côte-à-côte avec crop concept (même zone)  
3. Checklist : lisibilité à ×2, pas de banding violent, IDs hotspots OK  

