# Code is Fun

Deux jeux pour apprendre à penser comme un programmeur, dans le navigateur (ordinateur, tablette, téléphone),
en **français** ou en **anglais** :

- **[Turtle Quest](turtle/)** : écris des programmes en BASIC qui guident une tortue jusqu'à son drapeau,
  ramassent des pièces, ouvrent des portes, dessinent des figures. 5 recueils, 48 niveaux : déplacements,
  boucles, conditions, capteurs, variables, tes propres mots (`SUB`, `FUNCTION`), récursivité et fractales.
  Le BASIC se tape **en anglais ou en français** (`FORWARD` / `AVANCER`, `REPEAT` / `REPETER`, `IF … THEN` /
  `SI … ALORS`…), même mélangés, quelle que soit la langue de l'interface.
- **[Circuits](circuits/)** : relie des portes logiques (NON, ET, OU, OUX, NON-ET, NON-OU) jusqu'à ce que les
  lampes suivent la table de vérité. 3 mondes, 20 niveaux, d'un simple fil jusqu'à un additionneur deux bits.

Ces jeux viennent d'[Onyx](https://github.com/stephaneweg/onyx), un système d'exploitation fait maison pour le
Raspberry Pi : mêmes niveaux, mêmes règles, mêmes étoiles, les moteurs portés en JavaScript.

## Jouer

Ouvre `index.html` (ou la page GitHub Pages du dépôt). Rien à installer : HTML, CSS et JavaScript, sans
bibliothèque ni étape de construction. Les pages marchent aussi ouvertes depuis le disque. La progression
(étoiles, programmes, circuits) reste dans le navigateur (`localStorage`).

Raccourcis : **Ctrl+Entrée** lancer / vérifier, **F8** pas à pas, **F9** au départ, **Échap** arrêter,
**H** indice, **L** leçon ; dans Circuits **1–6** une porte, **Suppr**, **Ctrl+Z / Ctrl+Y**, les flèches.

## Organisation

| Dossier | Contenu |
|---|---|
| `shared/` | le style commun (`site.css`), la langue et la progression (`site.js`), les icônes |
| `turtle/` | `basic.js` (l'interpréteur BASIC, FR/EN), `world.js` (le moteur : niveaux, monde, exécution enregistrée), `app.js` (l'interface), `levels.js` (généré) |
| `circuits/` | `engine.js` (le moteur : plateau, routage des fils, évaluation, vérification), `lessons.js`, `app.js`, `levels.js` (généré) |
| `tools/` | `sync-levels.py` (recopie les niveaux d'Onyx), `test-turtle.js`, `test-circuits.js`, `shots.js` (captures) |
| `docs/DESIGN.md` | la direction de l'interface (mises en page ordinateur / tablette / téléphone) |

## Les niveaux

Les niveaux sont ceux d'Onyx (`sdcard/apps/turtle.app/levels/*.turtle`, `sdcard/apps/circuits.app/levels/*.circuits`).
Pour les reprendre après un changement dans Onyx :

```sh
python3 tools/sync-levels.py ../Onyx      # turtle/levels.js et circuits/levels.js
node tools/test-turtle.js                 # chaque solution gagne avec 3 étoiles, en anglais et en français
node tools/test-circuits.js
```

Un recueil `.turtle` ou `.circuits` peut aussi être ouvert dans le jeu (le bouton dossier de la liste des niveaux).

## GitHub Pages

Settings ▸ Pages ▸ *Deploy from a branch* ▸ `main`, dossier `/ (root)`. Le fichier `.nojekyll` sert les fichiers tels quels.

## Licence

MIT (voir `LICENSE`).
