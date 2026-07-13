# State of

**Simulation du fonctionnement institutionnel vaudois** — proto jouable.

Un dossier circule sur la place du Château (Parlement, Conseil d’État, départements) selon le cycle prévu par la législation (LGC · Cst-VD · LOCE).

<p align="center">
  <a href="https://ami2bal.github.io/stateofvd/"><strong>▶ Jouer en ligne</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/ami2bal/stateofvd">Code source</a>
</p>

---

## Jouer en local

```bash
python serve.py 8770
```

- **Simulation** → http://127.0.0.1:8770/

Serveur **no-cache** (un simple F5 recharge la dernière version).

## Contenu

| | |
|---|---|
| **Scénarios** | 24 (EMPD, instruments GC, séances, délai référendaire, urgence, navette…) |
| **Mode Parcours** | lecture auto · pause · stop · branches · fin Rejouer |
| **Exploration** | pin salle · flux colorés · fiche institutionnelle |
| **Gates** | `node tools/run_gates.mjs` |

## Textes de référence

1. 📜 [Constitution du canton de Vaud (Cst-VD)](https://www.lexfind.ch/tolv/230660/fr)
2. ⚖️ [Loi sur le Grand Conseil (LGC)](https://www.lexfind.ch/tolv/232876/fr)
3. 🏛️ [Loi d’organisation du Conseil d’État (LOCE)](https://www.lexfind.ch/tolv/212781/fr)

## Structure

```
index.html      → simulation (entrée unique)
play.html       → redirection vers ./
serve.py        → serveur dev no-cache
game/ flows/    → scénarios & moteur
engine/ model/  → rendu & profil vaudois
tools/          → gates machine
vendor/pixi     → runtime
```

## Licence / usage

Prototype pédagogique autour du système parlementaire vaudois.
