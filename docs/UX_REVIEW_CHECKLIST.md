# Checklist revue live UX — State of VD (B2)

**Durée** : ~10–12 min · **Build** : hard-refresh `proto/state-of-vd/` (no-cache)  
**Date baseline** : voir `baselines/LATEST.txt`

Cocher en live ; noter les écarts en bas.

---

## 0. Boot / cadrage

| # | Check | OK |
|---|---|:---:|
| 0.1 | Au chargement : **plein dézoom** (plateau entier lisible, pas collé sur un bâtiment) | ☐ |
| 0.2 | Brand haut-droite : **« State of » + écu** (pas le texte « VD »), **sans bordure** | ☐ |
| 0.3 | Bouton plein écran visible et cliquable | ☐ |

## 1. Sélecteur de scénarios

| # | Check | OK |
|---|---|:---:|
| 1.1 | Clic sur le sélecteur → **liste des scénarios visible** (pas de panel vide) | ☐ |
| 1.2 | Drawer ouvre en zoom-out total ; fermeture restaure le zoom précédent | ☐ |
| 1.3 | Hover d’un scénario → pastilles n° sur les salles | ☐ |
| 1.4 | Compteur discret « N ét. » visible sur chaque entrée jouable | ☐ |
| 1.5 | Sélection d’un scénario → **lecture auto** + fermeture drawer | ☐ |

## 2. Transport lecture

| # | Check | OK |
|---|---|:---:|
| 2.1 | Pastille d’état : Lecture / Pause / Choix / — cohérente | ☐ |
| 2.2 | Pendant lecture : ▶ grisé, ⏸ cliquable | ☐ |
| 2.3 | En pause : ⏸ grisé, ▶ cliquable | ☐ |
| 2.4 | **Stop (■)** → revient à « Aucun scénario » (ariane, badges, dossier off) | ☐ |
| 2.5 | Vitesse ×0,6 / ×1 / ×1,6 ; **×1 par défaut** ; pas de débordement hors panel | ☐ |

## 3. Chorégraphie dossier / salles

| # | Check | OK |
|---|---|:---:|
| 3.1 | Trajet : classeur **fermé** + pulse | ☐ |
| 3.2 | En salle : classeur **ouvert** + feuilles ; carte contextuelle blanche | ☐ |
| 3.3 | N° d’étape masqué quand le dossier occupe la salle ; revient au départ | ☐ |
| 3.4 | Anneau timer (haut-droite carte) pendant l’auto-avance (pas sur choix) | ☐ |
| 3.5 | Labels salles dans le cadre (Hémicycle, Pas perdus, SGC…) | ☐ |

## 4. Branches & fin

| # | Check | OK |
|---|---|:---:|
| 4.1 | Étape à issue → bannière « à vous » + chips accept/reject | ☐ |
| 4.2 | Fin parcours → panneau **✓ Rejouer** / **✕** (plus de fil d’étapes) | ☐ |
| 4.3 | Rejouer relance le même scénario | ☐ |
| 4.4 | ✕ ou ouverture sélecteur scénario → ferme le panneau fin | ☐ |

## 5. Inspecteur / pin (hors parcours)

| # | Check | OK |
|---|---|:---:|
| 5.1 | Pause → clic salle → flux colorés + fiche | ☐ |
| 5.2 | Titre fiche = nomenclature complète (acronyme développé) | ☐ |

---

## Écarts / notes

| # | Symptôme | Sévérité (P0/P1/P2) | Suite |
|---|---|---|---|
| | | | |

**Verdict session** : ☐ GO démo · ☐ GO avec réserves · ☐ NO-GO

*Responsable programme (interim) : Grok — 2026-07-12*
