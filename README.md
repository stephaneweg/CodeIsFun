# Code is Fun

Des jeux pour apprendre à penser comme un programmeur (et un pour se détendre), dans le navigateur (ordinateur, tablette, téléphone),
en **français** ou en **anglais** :

- **[Turtle Quest](turtle/)** : écris des programmes en BASIC qui guident une tortue jusqu'à son drapeau,
  ramassent des pièces, ouvrent des portes, dessinent des figures. 5 recueils, 48 niveaux : déplacements,
  boucles, conditions, capteurs, variables, tes propres mots (`SUB`, `FUNCTION`), récursivité et fractales.
  Le BASIC se tape **en anglais ou en français** (`FORWARD` / `AVANCER`, `REPEAT` / `REPETER`, `IF … THEN` /
  `SI … ALORS`…), même mélangés, quelle que soit la langue de l'interface.
  **Le recueil 6, le mode libre** : à gauche l'écran d'un ordinateur, à droite le code — tout le BASIC de QBasic
  (et d'Onyx) : `SCREEN` 0 à 13, `PRINT`, `LOCATE`, `COLOR`, `PSET`, `LINE`, `CIRCLE`, `PAINT`,
  `DRAW`, `POINT`, `PALETTE`, `GET`/`PUT`, les pages (`SCREEN , , 1, 0` et `PCOPY` : une image dessinée hors de vue, montrée d'un coup), `INPUT`, `INKEY$`, `INPUT$`, `KEYDOWN`, la souris (`MOUSEX`…), le son
  (`BEEP`, `SOUND`, `PLAY`, `NOTEON`), `GOTO`/`GOSUB`, `DATA`/`READ`, `TYPE`, `ON ERROR`, `ON TIMER`, `WAIT &H3DA`…, la **3D** d'Onyx (`SCENE3D`, `MESH3D`, `CAMERA3D`, `DRAW3D`, `VIEW3D`… dessinée par **WebGL**, en logiciel
  à défaut), les **manettes** (`PAD`, `PADS`, `STICK` : l'API Gamepad du navigateur, jusqu'à 4), la **musique MIDI**
  (`MIDINOTE`, `MIDIPROGRAM`… un petit synthétiseur WebAudio) et les **fichiers** (`OPEN`, `PRINT #`, `INPUT #`,
  `LINE INPUT #`, `EOF`… gardés dans le stockage du navigateur). Des exemples, dont
  l'Arkanoid d'Onyx tel quel, **Antigrav** (la course antigravité en 3D d'Onyx, 1 à 4 joueurs à la manette), un Space Invaders (`turtle/bas/invaders.bas`), **Zoomo!** (la même course façon dessin animé, en BASIC : `turtle/bas/zoomo.bas`) et **Amanda 2.7** de Rémi Poulin
  (2001), l'amie qui parle — avec un nouveau portrait en pixel art qui cligne des yeux, parle et se fâche (`turtle/bas/amanda.bas`, produit par `tools/port-amanda.py` : sa mémoire
  `MEMOIRE.DAT` embarquée en `DATA`). Sur téléphone : un pavé de flèches et le clavier du téléphone pour `INPUT`.
- **[Circuits](circuits/)** : relie des portes logiques (NON, ET, OU, OUX, NON-ET, NON-OU) jusqu'à ce que les
  lampes suivent la table de vérité. 3 mondes, 20 niveaux, d'un simple fil jusqu'à un additionneur deux bits.
- **[Drako!](snake/)** : un snake façon dessin animé (l'esprit de Clash of Clans). Drako, un bébé dragon, reprend
  l'or du village aux gobelins : 5 villages (3 étoiles chacun) et un mode sans fin, des pièces, de l'élixir (un élan),
  des gemmes, un bouclier, un sablier qui ralentit le temps, des gobelins qui volent les pièces, des combos jusqu'à x4.
  Fait pour le téléphone : on glisse n'importe où sur l'écran (ou des flèches à l'écran, un réglage), en portrait ou
  en paysage ; flèches, WASD ou ZQSD et la manette sur un ordinateur. Tout est dessiné sur le canevas et chaque son
  est synthétisé (WebAudio) : aucune image, aucun fichier.
- **[Briko Boom!](brick/)** : un casse-briques façon dessin animé (la famille d'Arkanoid et de LBreakout). 12 niveaux
  dans trois mondes (le Pays des Bonbons, l'Océan, l'Espace), 3 étoiles chacun ; des briques solides, en métal,
  explosives (en chaîne), en or, surprises, qui bougent ; 11 capsules (grande et petite raquette, multi-balles, colle,
  laser, balle lente ou rapide, boule de feu, vie, bouclier, score x2) ; Pouf le nuage, des combos jusqu'à x4. La
  raquette a une tête : elle suit la balle des yeux, sourit, s'inquiète, crie « AÏE ! ». La souris, les flèches, la
  manette ; sur un téléphone le doigt glisse n'importe où et la raquette le suit sans être cachée. Des réglages : moins
  d'animations, icônes des briques marquées (sans se fier aux couleurs), mode tranquille. Aucune image, aucun fichier.
- **[Cosmo Zap!](invaders/)** : un Space Invaders façon dessin animé. Des calmars, des crabes et des gloubis qui
  clignent des yeux et te regardent descendent en marchant, de plus en plus vite ; Zip, dans son vaisseau à bulle, les
  zappe à l'abri de quatre fromages que les tirs (et les aliens) grignotent. Une soucoupe traverse le ciel et lâche des
  capsules (tir triple, tir rapide, bulle protectrice, vie en plus) ; des combos jusqu'à x4, une vie tous les 5000
  points, des vagues sans fin. Le clavier, la souris, la manette ; sur un téléphone le doigt glisse n'importe où et le
  vaisseau tire tant qu'il est posé. Des réglages : la marche des aliens, moins d'animations, mode tranquille. Aucune
  image, aucun fichier.

- **[Zoomo!](race/)** : une course antigravité façon dessin animé, entre Mario Kart et Antigrav (l'exemple du mode
  libre) : dérapages et mini-turbos (étincelles bleues, orange, roses), pièces (jusqu'à 10, chacune rend un peu plus
  rapide), boîtes ? et leur roulette (fusée, triple fusée, chewing-gum, bulle, turbo, étoile), tremplins au-dessus du
  vide avec figures, bords sans murs (Pouf le nuage repêche ceux qui tombent), départ turbo, trois classes de vitesse et
  un Grand Prix avec sa coupe. Six pilotes dans leurs vaisseaux — Tito la tortue, Mimi le chat, Lulu le lapin, Pépin le cochon,
  Bruno l'ours et Drako le dragon — quatre circuits faits à partir d'un nombre (une boucle qui monte, plonge et penche
  dans ses virages, sur ses piliers, avec des tunnels, des arcs-en-ciel, des flèches d'élan, des tremplins), les
  Collines Bonbons, la Plage Soleil, le Canyon de Lave et la Boucle des Étoiles ; cinq rivaux qui se défendent (fusées,
  chewing-gum, bulles, turbos), trois tours, 3 étoiles par circuit. Le vaisseau avance tout seul : flèches ou manette
  pour tourner, Maj pour déraper ; sur un téléphone on garde le doigt sur un côté de l'écran (longtemps : un dérapage). Du pseudo-3D dessiné sur le canevas, des
  dessins animés pour les vaisseaux et le décor (`race/art.js`), chaque son synthétisé : aucune image, aucun fichier.
  Sa petite sœur en BASIC est dans le mode libre de Turtle Quest (`turtle/bas/zoomo.bas`, avec la 3D d'Onyx).

Turtle Quest et Circuits viennent d'[Onyx](https://github.com/stephaneweg/onyx), un système d'exploitation fait maison pour le
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
| `turtle/` | `basic.js` (l'interpréteur BASIC, FR/EN), `world.js` (le moteur : niveaux, monde, exécution enregistrée), `screen.js` (l'ordinateur du mode libre : écran, clavier, souris, manettes, son, MIDI, fichiers), `three3d.js` (la 3D d'Onyx : la scène, le rendu WebGL et le rendu logiciel), `app.js` (l'interface), `levels.js`, `onyx-examples.js` et `font.js` (générés) |
| `circuits/` | `engine.js` (le moteur : plateau, routage des fils, évaluation, vérification), `lessons.js`, `app.js`, `levels.js` (généré) |
| `snake/` | `drako.js` (Drako! : le jeu, le dessin, le son, les villages), `drako.css`, `index.html` |
| `brick/` | `briko.js` (Briko Boom! : la physique, les niveaux, le dessin, le son, les écrans), `briko.css`, `index.html` |
| `invaders/` | `zap.js` (Cosmo Zap! : les vagues, les fromages, la soucoupe, le dessin, le son, les écrans), `zap.css`, `index.html` |
| `race/` | `zoomo.js` (Zoomo! : les circuits, la course, l'IA, la caméra, le son, les écrans), `art.js` (les dessins : vaisseaux, pilotes, décors, objets, thèmes), `zoomo.css`, `index.html` |
| `tools/` | `sync-levels.py` (recopie les niveaux et les exemples BASIC d'Onyx), `gen-font.py` (la police CP437 d'Onyx), `test-turtle.js`, `test-free.js` (le mode libre, Arkanoid et Antigrav compris), `test-circuits.js`, `test-drako.js` (Drako! dans Chromium : l'IA sauve le village 1, les écrans, captures), `test-briko.js` (Briko Boom! : le pilote automatique finit les 12 niveaux, le doigt et la souris, les écrans, captures), `test-zoomo.js` (Zoomo! : le pilote automatique finit les 4 circuits, le clavier et le doigt, les écrans, captures), `test-zap.js` (Cosmo Zap! : le pilote automatique, les capsules, le doigt, le clavier et la souris, les écrans, captures), `shots.js` (captures) |
| `docs/DESIGN.md` | la direction de l'interface (mises en page ordinateur / tablette / téléphone) |

## Les niveaux

Les niveaux sont ceux d'Onyx (`sdcard/apps/turtle.app/levels/*.turtle`, `sdcard/apps/circuits.app/levels/*.circuits`).
Pour les reprendre après un changement dans Onyx :

```sh
python3 tools/sync-levels.py ../Onyx      # turtle/levels.js et circuits/levels.js
node tools/test-turtle.js                 # chaque solution gagne avec 3 étoiles, en anglais et en français
node tools/test-free.js                   # le mode libre : les exemples d'Onyx (Arkanoid et Antigrav joués un peu), QBasic
node tools/test-circuits.js
node tools/test-drako.js [dossier]       # Drako! (Playwright) : téléphone portrait et paysage, ordinateur
node tools/test-briko.js [dossier]       # Briko Boom! (Playwright) : les 12 niveaux finis par le pilote automatique, les écrans
node tools/test-zoomo.js [dossier]       # Zoomo! (Playwright) : les 4 circuits courus par le pilote automatique, les écrans
node tools/test-zap.js [dossier]         # Cosmo Zap! (Playwright) : le pilote automatique passe les vagues, les écrans
```

Un recueil `.turtle` ou `.circuits` peut aussi être ouvert dans le jeu (le bouton dossier de la liste des niveaux).

## GitHub Pages

Settings ▸ Pages ▸ *Deploy from a branch* ▸ `main`, dossier `/ (root)`. Le fichier `.nojekyll` sert les fichiers tels quels.

## Licence

MIT (voir `LICENSE`).
