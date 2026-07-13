# Reco — quel pack pour State of VD ? (Sunnyside vs Sprout Lands)

_Analyse concepteur, 2026-07-13. Notre jeu = serious-game institutionnel vue de dessus (bâtiments/salles/chemins/personnages/UI), fidèle au droit._

## Tableau comparatif

| Critère | **Sunnyside V2.1** | **Sprout Lands Basic** |
|---|---|---|
| **Quantité utile** | ~800 assets (hors doublon GameMaker) | 40 fichiers |
| **Qualité / finition** | Premium, palette chaude cohérente, ombrage soigné | Propre mais basique, pastel |
| **Bâtiments** | ★★★ **5 kits couleur** (bleu/vert/orange/rouge/violet), modulaires (murs+toits+portes+fenêtres+tour) | ★ **1 seul** style maison bois, sans couleurs |
| **Personnages** | ★★★ Humain **animé, en couches**, 20 états (IDLE/WALK/**CARRY**…) + Goblin/Skeleton | ★ 1 perso non-layered, peu d'états |
| **Sols / plan de salle** | Bois + pierre, variés | Terre labourée + herbe (farming) |
| **UI** | ★★ 9-slice + icônes (panneaux/HUD) | — |
| **VFX** | ★★ fumée cheminée, feu, glint | — |
| **Mobilier / props** | Riche (tables, tapis, fontaine, rochers, statue…) | Basique |
| **Licence** | ⚠ **non incluse** → à vérifier (probable payant/commercial) | ✅ claire mais **NON-COMMERCIALE** stricte |
| **Intégration** | Plus lourde (gros pack), ignorer le doublon GameMaker | Triviale (petit, fichiers auto-décrits) |

## Verdict : **Sunnyside**, nettement — sur quantité ET qualité ET fit

**Pourquoi il matche notre jeu :**
1. **Les 5 kits de bâtiment couleur** = on code les institutions par couleur de toit (GC vert, CE rouge/orange, départements bleu/violet…). C'est exactement notre besoin de différenciation institutionnelle — Sprout ne l'a pas.
2. **Personnages animés en couches** avec l'état **CARRY** = nos huissiers/agents qui **portent un dossier** dans le Mode Parcours. Sprout n'a qu'un perso figé.
3. **9-slice UI + VFX (fumée)** = panneaux inspecteur/HUD et vie des bâtiments, gratuitement.
4. Palette **premium cohérente** → rendu « presque studio » (l'objectif DA qu'on visait).

**Les 2 réserves à lever :**
- ⚠ **Licence Sunnyside à vérifier** (non fournie dans l'archive). Si usage publié/commercial : confirmer les termes d'itch.io. **C'est le seul vrai bloquant potentiel.**
- Pas de plan intérieur natif → composer les salles comme pour Kenney (grammaire déjà maîtrisée en TASK-116).

**Sprout Lands** reste utile comme **pack d'appoint/prototype** (léger, licence claire pour de l'interne non-commercial), ou si la licence Sunnyside s'avère incompatible → repli propre mais moins riche (1 style de bâtiment, pas de couleurs).

## Reco d'action
1. **Adopter Sunnyside comme pack maître** — après **vérif licence** (action user).
2. **Un seul pack maître** (ne pas mélanger les palettes ; Sprout en dépannage ponctuel seulement).
3. Prochaine tâche exécutable : **catalogue sémantique fin du tileset Sunnyside** (même méthode que Kenney 116 : régions → familles → assemblages prouvés → playbook), en priorisant **bâtiments couleur + sols + porte/fenêtre**.
