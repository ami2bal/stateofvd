# Cartographie sémantique — Roguelike RPG Pack (v4)

## Principe

**Un seul pack** : [Roguelike RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) (Kenney CC0).  
Playbook : `assets/kenney/roguelike_playbook.json` **v4** — discipline Sample1.

## Règles dures (texture discipline)

| Règle | Détail |
|---|---|
| **Arbres** | Toujours paire 2-haut : cime `586` **au-dessus** tronc `643`. Jamais l’un sans l’autre. |
| **Chemins** | Mono-tuile `408` uniquement. Couloirs orthogonaux bout-à-bout (avenue + embranchements). Pas de mix aléatoire. |
| **Bâtiments** | Toit dominant ; seulement **2 rangs** bas = façade mur (`871`/`873`) + porte `201` + fenêtres. |
| **Fenêtres** | Uniquement façade sud (rangs mur), jamais au milieu du footprint, jamais en couche intérieur. |
| **Sols intérieurs** | Bois `698/756` (dépts + bureaux). Beige château. **Jamais** pavé `920` / path `408` en pièce. |
| **Meubles** | Props sparses intérieurs only (chaises/tables). |

```
roguelike_playbook.json v4
        ↓
compose_roguelike_world.py  →  composed/{ground,roofs,interiors}.png
        ↓
role_usage_sheet.png + shots/*.png
```

## Réseau de chemins

1. Avenue E–O en y=15 (devant les dépts)
2. Embranchement vertical depuis chaque `entry` → avenue
3. Lien esplanade → avenue
4. Apron 1 case au sud de chaque bâtiment  
→ tunnels directionnels, pas un gruyère tetris sous les footprints.
