# Matrice de couverture fonctionnelle — State of VD

> **Cible exhaustive métier** (formation / App V2), pas un catalogue de mini-jeu.  
> Source machine : [`coverage-matrix.json`](./coverage-matrix.json) · Catalogue parcours : `game/flows/index.js`.

## Couches

| Code | Signification |
|------|----------------|
| **A** | Taxonomie (`objectType` dans `vaud.json`) |
| **B** | Lifecycle formalisé (machine d’états) |
| **C** | Parcours jouable (Mode Parcours) |
| **D** | Flux spatial RBAC (pin) |

| Statut | Sens |
|--------|------|
| `full` | A+B+C opérationnels |
| `partial` | A + (B ou C partiel) |
| `named` | A seulement |
| `gap` | Hors modèle |

## Matrice (cible exhaustive)

| Id | Libellé | Entrée | A | B | C | D | Statut | Scénario |
|----|---------|--------|---|---|---|---|--------|----------|
| act-decret-credit-simple | Décret — petit crédit | DPT→CE→GC | ✅ | ✅ | ✅ | ✅ | full | `petit-credit` |
| act-decret-credit-ouvrage | Décret — crédit d’ouvrage | DPT→CE→GC | ✅ | ✅ | ✅ | ✅ | full | `credit-qui-fache` |
| act-loi-ordinaire | Loi ordinaire (EMPL) | DPT→CE→GC | ✅ | ✅ | ✅ | ✅ | full | `empl-loi` |
| act-budget | Budget annuel | DFA→CE→GC | ✅ | ✅ | ✅ | ✅ | partial | `budget-annuel` (S7) |
| act-revision-cst | Révision constitutionnelle (partielle) | DPT→CE→GC | ✅ | ✅ | ✅ | ✅ | partial | `revision-constitutionnelle` (S19) |
| inst-motion | Motion | GC | ✅ | ✅ | ✅ | ✅ | full | `motion` (S3 · cycle-motion) |
| inst-postulat | Postulat | GC | ✅ | ✅ | ✅ | ✅ | partial | `postulat` (S8 · cycle-postulat) |
| inst-interpellation | Interpellation | GC | ✅ | ✅ | ✅ | ✅ | partial | `interpellation` (S4 · cycle-interpellation) |
| inst-simple-question | Simple question | GC | ✅ | ✅ | ✅ | ✅ | partial | `simple-question` (S9 · cycle-question) |
| inst-question-orale | Question orale | GC | ✅ | ✅ | ✅ | ✅ | partial | `question-orale` (S10 · cycle-question) |
| inst-determination | Détermination | GC | ✅ | ✅ | ✅ | ✅ | partial | `determination` (S12 · cycle-determination) |
| inst-resolution | Résolution | GC | ✅ | ✅ | ✅ | ✅ | partial | `resolution` (S11 · cycle-resolution) |
| inst-initiative | Initiative (parlementaire) | GC | ✅ | ✅ | ✅ | ✅ | partial | `initiative` (S13 · cycle-initiative-parlementaire) |
| inst-petition | Pétition | CIT→GC | ✅ | ✅ | ✅ | ✅ | partial | `petition` (S5 · cycle-petition) |
| inst-grace | Demande de grâce | CIT→GC | ✅ | ✅ | ✅ | ✅ | partial | `demande-de-grace` (S14 · cycle-grace + secret UI) |
| flux-legislatif-descendant | Circuit législatif | DPT/CE/GC | ✅ | ✅ | ✅ | ✅ | full | via S1/S2/S6 |
| flux-seance-gc | Séance GC (rituel) | GC | ✅ | ❌ | ✅ | ✅ | partial | `seance-gc` (S15) |
| flux-seance-ce | Séance CE (rituel) | CE | ✅ | ❌ | ✅ | ✅ | partial | `seance-ce` (S16) |
| flux-commission | Commission | GC | ✅ | ❌ | ✅ | ✅ | partial | via S2 |
| flux-publication-fao | Publication FAO / référendum | CE | ✅ | ✅ | ✅ | ✅ | partial | `referendum` (S17) + S6 |
| flux-corps-electoral | Corps électoral (narratif) | institution d’accueil | — | — | ✅ | — | partial | S17/S18 préambules |
| doc-rapport-commission | Rapport de commission | GC | ✅ | ❌ | ✅ | ❌ | partial | via S2 |

## Parcours jouables (par point d’entrée)

### Département
- S1 EMPD petit crédit · S2 EMPD crédit d’ouvrage · S6 EMPL loi  
- **S19** Révision constitutionnelle partielle ✅ E (entrée DPT ; votation obligatoire hors carte)

### Conseil d’État
- **S7** Budget annuel ✅ B (DFA → CSG → collège → COFI → plénum ; pas de réf. facultatif)  
- **S16** Séance du CE ✅ V2 · **S17** Référendum facultatif ✅ V3

### Grand Conseil
- S3 Motion · S8 Postulat · S4 Interpellation · S9 Simple question · S10 Question orale  
- **S11** Résolution · **S12** Détermination · **S13** Initiative parlementaire ✅ V1  
- **S15** Séance du GC (rituel journée) ✅ V2

### Citoyen / tiers (entrée catalogue, pas site géospatial)
- S5 Pétition · **S14** Demande de grâce ✅ V1 · **S18** Initiative populaire ✅ V3  
- Le libellé « Citoyen » = **point d’entrée du catalogue** (qui saisit). Le parcours jouable démarre toujours dans la **salle institutionnelle d’accueil** (ex. SGC / Chancellerie).

---

## Roadmap V1 → V3 (validée 2026-07-12)

| Vague | Contenu | Principe | État |
|-------|---------|----------|------|
| **V1** | Résolution · détermination · initiative · grâce | Catalogue instruments GC / saisine | ✅ **done** (S11–S14) |
| **V2** | Rituel **séance GC** + **séance CE** | ODJ → débat → vote · CSG → collège | ✅ **done** (S15–S16) |
| **V3** | Référendum + initiative populaire | Préambule hors carte + Chancellerie / SGC | ✅ **done** (S17–S18) |

### Cadrage V3 — peuple hors géospatial (alignement produit (hors citoyen comme acteur logiciel))

**But** : modéliser le **flux institutionnel**, pas un atlas du corps électoral.

1. **Démarrage** = salle de l’institution qui **reçoit** la demande / l’objet (Chancellerie, SGC, Bureau… selon l’instrument).
2. **Le peuple n’est pas un acteur géospatial** (pas de site « urne / canton / CIT » sur la carte) :
   - *praticité* (pas de zone hors institutions à cartographier) ;
   - *lien produit* : Le système métier ne traite pas le citoyen comme acteur du processus.
3. **Le peuple n’est pas exclu du récit** : en **préambule** à l’arrivée dans l’institution (carte d’étape / intro de scénario), on explique le parcours **préalable** (récolte de signatures, votation, dépôt, etc.) **avant** l’entrée dans le flux produit-like.
4. Conséquence matrice : `flux-corps-electoral` n’est plus un « gap site à construire » mais un **pattern narratif + étapes institutionnelles** (statut cible : partial/full via scénarios V3, sans couche D « lieu citoyen »).

### Suite post-V3 (validée 2026-07-12)

| Prio | Chantier | État |
|------|----------|------|
| **A** | Polish formation (libellés EMPD/EMPL/FAO, S17/S18, jargon horloge) | ✅ **done** |
| **B** | Budget S7 enrichi (jalons DFA/CSG/collège/COFI) | ✅ **done** |
| **E** | Révision constitutionnelle partielle S19 (entrée institutions, votation obligatoire hors carte) | ✅ **done** |
| **C** | Lifecycles B instruments (tous GC + pétition/grâce) | ✅ **done** (+ motion, interpellation, résolution, détermination, initiative) |
| **D** | UI vote secret (grâce S14) | ✅ **done** (carte sombre, badge, jeton scellé, hint « pas de voix individuelles ») |
| **R1** | Lifecycle B initiative populaire S18 | ✅ **done** (`cycle-initiative-populaire`) |
| **R3** | Branches jouables (`rejectAlt` → boutons sur carte d'étape) | ✅ **done** |
| **R9** | Smoke QA scénarios | ✅ **done** (`scripts/smoke_scenarios.mjs` + `tools/run_gates.mjs`) |
| **A1** | Gate taille embed | ✅ **done** (`tools/measure_embed_budget.mjs --gate`) |
| **A3** | Découpe walkthrough ariane/timer | ✅ **done** (`game/walkthrough-ariane.js`) |
| **A4** | Targets RBAC structurés | ✅ **done** (`audit_structured_targets.mjs`) |
| **C2** | Baseline snapshot | ✅ **done** (`baselines/2026-07-12/`) |
| **B2** | Checklist revue live UX | ✅ **done** (`docs/UX_REVIEW_CHECKLIST.md`) |
| **B4** | Propositions prochains parcours | 📋 **ouvert** — `docs/PROPOSITIONS_B4.md` (ordre reco BA) |
| **R8** | **Pont produit** (mapping objectType ↔ SI métier / droits / écrans) | 🛒 **shopping list** — différé jusqu'à consolidation proto |

### Shopping list (hors sprint courant) — détail

| Id | Sujet | En quoi ça consiste | Effort | ROI |
|----|--------|---------------------|--------|-----|
| **R8** | **Pont produit** | Document + éventuellement JSON de **mapping** : chaque `objectType` / lifecycle State of VD → concept produit (type d’affaire, instrument, droits, écrans uispec2 si connus). Pas de nouveau site sur la carte. Sert de brief modernisation / formation croisée BA–dev. **Différé jusqu’à consolidation proto.** | Moyen–élevé | Stratégique |
| **R2** | Budget multi-livrables | ✅ **done** (S7 : fonctionnement · investissement · comptes) | — | — |
| **R4** | UI secret « urne » | ✅ **done** (animation + jeton scellé + badge) | — | — |
| **R5** | Lifecycles rituel | Machines d’états séance/réf./révision (optionnel modèle) | Moyen | Modèle pur |
| **R7** | Polish UX | ✅ **partiel** (barre bas allégée, carte glass contextuelle) | Continu | Confort |

**Invariant E / S19** : comme S17 — **aucun acteur peuple spatialisé** ; préambule votation ; formalisation Chancellerie. Hors scope S19 : révision totale, assemblée constituante, initiative constitutionnelle pure (voir S18).

*Baseline régénérable via `tools/write_baseline.mjs`.*
