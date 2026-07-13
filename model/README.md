# State of VD — modèle civique (référence candidate V2)

Statut : **référence sémantique candidate**, itérative (v0.1). Cœur agnostique + profil Vaud.  
Pas une API applicative figée — le jeu et la future App V2 s’y branchent.

## Vue d’ensemble (3 familles)

| Famille | Entités (cœur EN) |
|---|---|
| **WHO** | `Person` · `Body` · `Mandate` · `Legislature` |
| **WHAT** | `CivicObject` · `Dossier` (relations, sans état propre) |
| **HOW** | `Sitting` · `AgendaItem` · `Decision` · `Ballot` · `Handover` · `Deadline` |
| Satellites | `TextVersion` · `Publication` |

Quatre catalogues fermés : `objectTypes` · `lifecycles` · `decisionTypes` · `deadlineTypes`.  
Provenance obligatoire (`sources[]` legal ou convention). Transitions : `by ∈ {decision, handover, author-act}` — jamais d’édition libre d’état.

## Table EN ↔ FR

| Cœur (EN) | Concept (FR) | Cœur (EN) | Concept (FR) |
|---|---|---|---|
| Person | Personne | Sitting | Séance |
| Body | Organe | AgendaItem | Point d’ODJ |
| Mandate | Mandat | Decision | Décision |
| Legislature | Législature | Ballot | Scrutin |
| CivicObject | Objet civique | Handover | Transmission |
| Dossier | Dossier | Deadline | Délai |
| TextVersion | Version de texte | Publication | Publication |

Ids/labels du **profil Vaud** restent en français (termes de droit : `motion`, `entree-en-matiere`…).

## Fichiers

```
model/schema/civic.core.schema.json   # JSON Schema 2020-12 (cœur EN)
model/profiles/vaud.json              # Instance vaudoise v0.1
tools/validate_model.py               # I1..I8 + legal_index
```

## Valider

```bash
python proto/state-of-vd/tools/validate_model.py
```

Dépendances : Python stdlib + `jsonschema`. Index légal requis : `data_is/legal_index.json`.

## Les 8 invariants (le contrat, au-delà du schéma)

| # | Garantie |
|---|---|
| I1 | Ids kebab-case, uniques (catalogues/structure d'une part, états de lifecycle d'autre part) |
| I2 | Toute transition référence des états déclarés du même lifecycle, `by` renseigné |
| I3 | Tout `deadlineType` a un `legal_ref` résolu dans l'index légal (article existant, non abrogé) |
| I4 | Tout `body` → institution déclarée ; hiérarchie `parent` sans cycle |
| I5 | `sources[]` non vide partout (provenance legal ou convention) |
| I6 | Chaque lifecycle : 1 état initial exactement, ≥ 1 terminal, tous les états atteignables |
| I7 | Toute transition `by=decision` porte un `decisionType` existant du catalogue |
| I8 | Cœur agnostique : zéro terme juridictionnel dans `civic.core.schema.json` |

## Exemple minimal (fixtures dans `vaud.json` → `examples`)

1. **Motion** `obj-motion-demo` (type `motion`, état `renvoyee-au-ce`, auteure fictive).  
2. **Handover** `ho-motion-vers-ce` : plénum GC → collège CE, démarre le délai `reponse-motion-postulat-initiative` (LGC art. 111, P1Y).  
3. **Deadline** `dl-reponse-motion` : `running`, due +1 an.  
4. **Dossier** relie la réponse fictive (`replies-to`) à la motion.

## Ajouter un élément

1. **Type d’objet** : entrée dans `catalogues.objectTypes` (id kebab, family, lifecycle ou `null`, `sources[]`).  
2. **État / transition** : dans le lifecycle concerné ; `by` obligatoire ; si `decision` → `decisionType` du catalogue.  
3. **Délai** : `deadlineTypes` avec `duration` ISO-8601 + `legal_ref` résoluble dans `legal_index.json`.  
4. **Organe** : `structure.bodies` + institution déclarée + `sources[]`.  
5. Relancer `validate_model.py` — tout écart doit faire échouer la gate.
