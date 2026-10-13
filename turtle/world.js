// world.js -- Turtle Quest's engine, from Onyx's user/Apps/turtle/world.h: the levels (their packs, a text file), the
// turtle's world and a program's run recorded (every statement, move, turn, pick an event the page plays back).
// No user interface here: app.js draws and plays; tools/test.js checks every level's solution with it.
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function (global) {
'use strict';
const Basic = global.Basic || (typeof require !== 'undefined' ? require ('./basic.js') : null);

const LANG_EN = 0, LANG_FR = 1;
const MAXW = 24, MAXH = 18;

// ---- the words ----------------------------------------------------------------------------------------------------------
// [English, French, kind ('s' a statement, 'n' a value), min args, max args]
const WORDS = [
	['FORWARD', 'AVANCER', 's', 0, 1], ['BACK', 'RECULER', 's', 0, 1], ['LEFT', 'GAUCHE', 's', 0, 1], ['RIGHT', 'DROITE', 's', 0, 1],
	['PENUP', 'LEVERCRAYON', 's', 0, 0], ['PENDOWN', 'BAISSERCRAYON', 's', 0, 0], ['COLOR', 'COULEUR', 's', 1, 1], ['PICK', 'RAMASSER', 's', 0, 0],
	['WALL', 'MUR', 'n', 0, 0], ['WALLLEFT', 'MURGAUCHE', 'n', 0, 0], ['WALLRIGHT', 'MURDROITE', 'n', 0, 0], ['FRONT', 'DEVANT', 'n', 0, 0],
	['ONGOAL', 'SURBUT', 'n', 0, 0], ['ITEM', 'OBJET', 'n', 0, 0], ['KEYS', 'CLES', 'n', 0, 0], ['HEADING', 'CAP', 'n', 0, 0],
	['GEM', 'GEMME', 'n', 0, 0]];
const ALIASES_FR = {
	AVANCER: 'FORWARD', AVANCE: 'FORWARD', AV: 'FORWARD', RECULER: 'BACK', RECULE: 'BACK', RE: 'BACK',
	GAUCHE: 'LEFT', TG: 'LEFT', DROITE: 'RIGHT', TD: 'RIGHT',
	LEVERCRAYON: 'PENUP', LEVECRAYON: 'PENUP', LC: 'PENUP', BAISSERCRAYON: 'PENDOWN', BAISSECRAYON: 'PENDOWN', BC: 'PENDOWN',
	COULEUR: 'COLOR', RAMASSER: 'PICK', RAMASSE: 'PICK',
	MUR: 'WALL', MURGAUCHE: 'WALLLEFT', MURDROITE: 'WALLRIGHT', DEVANT: 'FRONT', SURBUT: 'ONGOAL', OBJET: 'ITEM',
	CLES: 'KEYS', CAP: 'HEADING', GEMME: 'GEM' };
// One dialect whatever the language: a program is written in English or in French (or both)
const DIALECT = { words: {}, aliases: ALIASES_FR };
const SHOWN_FR = {};
for (const [en, fr, kind, min, max] of WORDS) { DIALECT.words[en] = { kind, min, max }; SHOWN_FR[en] = fr; }

function wordName (en, lang) { const w = WORDS.find ((x) => x[0] === en); return w ? w[lang === LANG_FR ? 1 : 0] : en; }
const WORD_HELP = {
	FORWARD: ['FORWARD [n] -- moves n squares ahead (1 if no n)', 'AVANCER [n] -- avance de n cases (1 sans n)'],
	BACK: ['BACK [n] -- moves n squares back', 'RECULER [n] -- recule de n cases'],
	LEFT: ['LEFT [degrees] -- turns left (90 if none)', 'GAUCHE [degrés] -- tourne à gauche (90 sans nombre)'],
	RIGHT: ['RIGHT [degrees] -- turns right (90 if none)', 'DROITE [degrés] -- tourne à droite (90 sans nombre)'],
	PENUP: ['PENUP -- lifts the pen: no more trail', 'LEVERCRAYON -- lève le crayon : plus de tracé'],
	PENDOWN: ['PENDOWN -- puts the pen down: the turtle draws', 'BAISSERCRAYON -- baisse le crayon : la tortue dessine'],
	COLOR: ["COLOR n -- the pen's colour (0 to 15)", 'COULEUR n -- la couleur du crayon (0 à 15)'],
	PICK: ['PICK -- picks up the key, the coin or the gem under the turtle', 'RAMASSER -- ramasse la clé, la pièce ou la gemme sous la tortue'],
	WALL: ['WALL () -- true when a wall (or a locked door) is just ahead', 'MUR () -- vrai quand un mur (ou une porte fermée) est juste devant'],
	WALLLEFT: ['WALLLEFT () -- true when a wall is on the left', 'MURGAUCHE () -- vrai quand un mur est à gauche'],
	WALLRIGHT: ['WALLRIGHT () -- true when a wall is on the right', 'MURDROITE () -- vrai quand un mur est à droite'],
	FRONT: ['FRONT () -- what is ahead: 0 free, 1 wall, 2 something to pick, 3 the goal, 4 a door, 5 a portal', "DEVANT () -- ce qu'il y a devant : 0 libre, 1 mur, 2 objet, 3 l'arrivée, 4 une porte, 5 un portail"],
	ONGOAL: ['ONGOAL () -- true when the turtle is on the goal', "SURBUT () -- vrai quand la tortue est sur l'arrivée"],
	ITEM: ['ITEM () -- true when there is something to pick under the turtle', "OBJET () -- vrai quand il y a quelque chose à ramasser ici"],
	KEYS: ['KEYS () -- how many keys the turtle carries', 'CLES () -- le nombre de clés que porte la tortue'],
	HEADING: ['HEADING () -- where the turtle looks, in degrees (0 north, 90 east)', 'CAP () -- où regarde la tortue, en degrés (0 nord, 90 est)'],
	GEM: ['GEM () -- the number of the gem under the turtle (0: none)', 'GEMME () -- le numéro de la gemme sous la tortue (0 : aucune)'] };

// ---- the concepts' help cards -------------------------------------------------------------------------------------------------
const CONCEPTS = {
	move: [['Moving', 'Avancer'], ['The turtle obeys your program, one line after the other.\n\nFORWARD 3 moves it three squares ahead. FORWARD alone: one square.\n\nOne instruction per line: after each one, press Enter to start a new line.\n\n  FORWARD 2\n  FORWARD 1\n\nWrite the instructions, then press Run.',
		"La tortue obéit à ton programme, une ligne après l'autre.\n\nAVANCER 3 la fait avancer de trois cases. AVANCER seul : une case.\n\nUne seule instruction par ligne : après chacune, appuie sur Entrée pour passer à la ligne suivante.\n\n  AVANCER 2\n  AVANCER 1\n\nÉcris les instructions, puis appuie sur Lancer."]],
	turn: [['Turning', 'Tourner'], ['LEFT and RIGHT turn the turtle a quarter of a turn, where it stands.\n\nFORWARD then goes the new way. Think as if you were the turtle: its left is not always yours!',
		"GAUCHE et DROITE font tourner la tortue d'un quart de tour, sur place.\n\nAVANCER part alors dans la nouvelle direction. Mets-toi à la place de la tortue : sa gauche n'est pas toujours la tienne !"]],
	pick: [['Picking up', 'Ramasser'], ['Coins and keys lie on the floor. Stop on one and write PICK to take it.\n\nA level is won only when every coin is picked.',
		"Des pièces et des clés traînent par terre. Arrête-toi dessus et écris RAMASSER pour la prendre.\n\nUn niveau n'est gagné que si toutes les pièces sont ramassées."]],
	door: [['Doors and keys', 'Portes et clés'], ['A door is locked. Walk into it with a key and it opens (the key stays in the lock).\n\nPick the key first!',
		"Une porte est fermée à clé. Avance dedans avec une clé et elle s'ouvre (la clé reste dans la serrure).\n\nRamasse d'abord la clé !"]],
	repeat: [['Loops: REPEAT', 'Les boucles : REPETER'], ['Writing the same lines again and again is long. A loop repeats them for you:\n\n  REPEAT 4\n    FORWARD 2\n    RIGHT\n  END REPEAT\n\nFewer instructions = more stars.',
		"Écrire les mêmes lignes encore et encore, c'est long. Une boucle les répète pour toi :\n\n  REPETER 4\n    AVANCER 2\n    DROITE\n  FIN REPETER\n\nMoins d'instructions = plus d'étoiles."]],
	for: [['Loops that count: FOR', 'Les boucles qui comptent : POUR'], ['FOR counts for you, and the counter is a variable you can use:\n\n  FOR i = 1 TO 5\n    FORWARD i\n    RIGHT\n  NEXT\n\ni is 1, then 2, then 3...',
		'POUR compte pour toi, et le compteur est une variable que tu peux utiliser :\n\n  POUR i = 1 JUSQUE 5\n    AVANCER i\n    DROITE\n  SUITE\n\ni vaut 1, puis 2, puis 3...']],
	if: [['Deciding: IF', 'Décider : SI'], ['IF tests something and does the lines after THEN only when it is true:\n\n  IF ITEM () THEN PICK\n\nWith ELSE, other lines when it is false. A block IF ends with END IF.',
		"SI teste quelque chose et fait les lignes après ALORS seulement quand c'est vrai :\n\n  SI OBJET () ALORS RAMASSER\n\nAvec SINON, d'autres lignes quand c'est faux. Un bloc SI se termine par FIN SI."]],
	sensor: [["The turtle's senses", 'Les sens de la tortue'], ['The turtle can look around: WALL () is true when a wall is just ahead, WALLLEFT () and WALLRIGHT () look aside.\n\n  IF WALL () THEN RIGHT\n\nThe program works whatever the level looks like.',
		"La tortue peut regarder autour d'elle : MUR () est vrai quand un mur est juste devant, MURGAUCHE () et MURDROITE () regardent sur les côtés.\n\n  SI MUR () ALORS DROITE\n\nLe programme marche quelle que soit la forme du niveau."]],
	while: [['Until it is done: WHILE', 'Tant que : TANTQUE'], ['WHILE repeats its lines as long as a condition is true -- no need to count:\n\n  WHILE NOT ONGOAL ()\n    FORWARD\n  WEND',
		"TANTQUE répète ses lignes aussi longtemps qu'une condition est vraie -- pas besoin de compter :\n\n  TANTQUE NON SURBUT ()\n    AVANCER\n  FIN TANTQUE"]],
	maze: [['Mazes', 'Les labyrinthes'], ['A trick to leave any maze: keep a hand on the wall on your right.\n\nIf there is no wall on the right, turn right and step. Else, if the way ahead is free, step. Else turn left.',
		"Une astuce pour sortir de n'importe quel labyrinthe : garde une main sur le mur de droite.\n\nS'il n'y a pas de mur à droite, tourne à droite et avance. Sinon, si la voie est libre, avance. Sinon tourne à gauche."]],
	variable: [['Variables', 'Les variables'], ['A variable is a box with a name that holds a number:\n\n  n = 1\n  REPEAT 6\n    FORWARD n\n    RIGHT\n    n = n + 1\n  END REPEAT\n\nEach turn, n grows: a spiral!',
		'Une variable est une boîte avec un nom qui garde un nombre :\n\n  n = 1\n  REPETER 6\n    AVANCER n\n    DROITE\n    n = n + 1\n  FIN REPETER\n\nÀ chaque tour n grandit : une spirale !']],
	sub: [['Your own words: SUB', 'Tes propres mots : SUB'], ['Teach the turtle a new word with SUB, then use it as many times as you like:\n\n  SUB Step3\n    FORWARD 3\n    PICK\n  END SUB\n\n  Step3\n  Step3\n\nA SUB can take values: SUB Square (size).',
		'Apprends un nouveau mot à la tortue avec SUB, puis utilise-le autant que tu veux :\n\n  SUB Pas3\n    AVANCER 3\n    RAMASSER\n  FIN SUB\n\n  Pas3\n  Pas3\n\nUn SUB peut recevoir des valeurs : SUB Carre (cote).']],
	pen: [['The pen', 'Le crayon'], ['The turtle draws where it walks: its pen is down. PENUP lifts it (to move without drawing), PENDOWN puts it back, COLOR changes its colour.\n\nPaint every marked tile!',
		'La tortue dessine là où elle passe : son crayon est baissé. LEVERCRAYON le lève (pour bouger sans dessiner), BAISSERCRAYON le remet, COULEUR change sa couleur.\n\nPeins toutes les cases marquées !']],
	draw: [['Drawing figures', 'Dessiner des figures'], ["Reproduce the grey figure. The turtle can turn by any angle: RIGHT 120 for a triangle's corner, RIGHT 60 for a hexagon's.\n\nThe turns of a closed figure always add up to 360 degrees.",
		"Reproduis la figure grise. La tortue peut tourner de n'importe quel angle : DROITE 120 pour le coin d'un triangle, DROITE 60 pour un hexagone.\n\nLes virages d'une figure fermée font toujours 360 degrés en tout."]],
	gems: [['Gems in order', "Les gemmes dans l'ordre"], ['Each gem has a number: pick them in order, 1, then 2, then 3... The next one to pick wears a white ring.\n\nGEM () gives the number of the gem under the turtle (0: none). A variable remembers which one comes next:\n\n  n = 1\n  IF GEM () = n THEN\n    PICK\n    n = n + 1\n  END IF',
		'Chaque gemme a un numéro : ramasse-les dans l\'ordre, 1, puis 2, puis 3... La prochaine porte un anneau blanc.\n\nGEMME () donne le numéro de la gemme sous la tortue (0 : aucune). Une variable retient laquelle vient ensuite :\n\n  n = 1\n  SI GEMME () = n ALORS\n    RAMASSER\n    n = n + 1\n  FIN SI']],
	teleport: [['Portals', 'Les portails'], ['Step on a portal: the turtle comes out of its twin at once, still facing the same way. Two pads of the same colour are a pair.\n\nA FORWARD not finished goes on from the twin:\n\n  FORWARD 3\n\nwith a portal one square ahead: one step, the jump, two steps.\n\nFRONT () is 5 when a portal is just ahead.',
		'Pose-toi sur un portail : la tortue ressort aussitôt par son jumeau, tournée du même côté. Deux portails de la même couleur forment une paire.\n\nUn AVANCER pas fini continue depuis le jumeau :\n\n  AVANCER 3\n\navec un portail juste devant : un pas, le saut, deux pas.\n\nDEVANT () vaut 5 quand un portail est juste devant.']],
	color: [['Colours are numbers', 'Les couleurs sont des nombres'], ["Each colour of the pen is a number:\n@palette\nA loop's counter can choose it -- a rainbow:\n\n  FOR i = 1 TO 12\n    COLOR i MOD 6 + 1\n    FORWARD i\n    RIGHT\n  NEXT\n\nHere the colours count: each line in the colour of the light line under it.",
		"Chaque couleur du crayon est un nombre :\n@palette\nLe compteur d'une boucle peut la choisir -- un arc-en-ciel :\n\n  POUR i = 1 JUSQUE 12\n    COULEUR i MOD 6 + 1\n    AVANCER i\n    DROITE\n  SUITE\n\nIci les couleurs comptent : chaque trait de la couleur du trait clair dessous."]],
	params: [['Words that take values', 'Des mots à paramètres'], ['A SUB can take values -- its parameters, in brackets after its name:\n\n  SUB Polygon (sides, size)\n    REPEAT sides\n      FORWARD size\n      RIGHT 360 / sides\n    END REPEAT\n  END SUB\n\n  Polygon 5, 3\n\nOne word for every polygon: give it 6, 2 and it draws a hexagon.',
		'Un SUB peut recevoir des valeurs -- ses paramètres, entre parenthèses après son nom :\n\n  SUB Polygone (cotes, taille)\n    REPETER cotes\n      AVANCER taille\n      DROITE 360 / cotes\n    FIN REPETER\n  FIN SUB\n\n  Polygone 5, 3\n\nUn seul mot pour tous les polygones : avec 6, 2 il dessine un hexagone.']],
	function: [['Words that give back', 'Des mots qui répondent'], ['A FUNCTION computes a value and gives it back: put the value in its own name.\n\n  FUNCTION Half (x)\n    Half = x / 2\n  END FUNCTION\n\n  FORWARD Half (8)\n\nThe turtle goes 4 squares. A function is used inside an instruction, as WALL () or GEM () are.',
		"Une FONCTION calcule une valeur et la rend : range la valeur dans son propre nom.\n\n  FONCTION Moitie (x)\n    Moitie = x / 2\n  FIN FONCTION\n\n  AVANCER Moitie (8)\n\nLa tortue avance de 4 cases. Une fonction s'utilise dans une instruction, comme MUR () ou GEMME ()."]],
	recursion: [['A word that calls itself', "Un mot qui s'appelle"], ['A snail is one side, then a smaller snail. A SUB can say just that -- it calls itself:\n\n  SUB Snail (size)\n    IF size < 1 THEN EXIT SUB\n    FORWARD size\n    RIGHT\n    Snail size - 1\n  END SUB\n\nThe IF stops it when the size is small. Without it, the word would call itself for ever.',
		"Un escargot, c'est un côté, puis un plus petit escargot. Un SUB peut dire exactement ça -- il s'appelle lui-même :\n\n  SUB Escargot (taille)\n    SI taille < 1 ALORS SORTIR SUB\n    AVANCER taille\n    DROITE\n    Escargot taille - 1\n  FIN SUB\n\nLe SI l'arrête quand la taille est petite. Sans lui, le mot s'appellerait sans fin."]] };

// ---- the levels ----------------------------------------------------------------------------------------------------------------
function drawMode (v)
{
	const u = String (v).trim ().toUpperCase ();
	if (u === 'COLOR' || u === 'COLOUR' || u === '2') return 2;
	if (u === 'SHAPE') return 1;
	return parseInt (u, 10) ? 1 : 0;
}
function levelOf (raw)
{
	return {
		id: '', title: ['', ''], text: ['', ''], hint: ['', ''], topic: '', words: '', par3: 0, par2: 0, draw: 0,
		w: 0, h: 0, map: [], start: null, solution: null, ...raw,
		titleOf (l) { return this.title[l] || this.title[0]; },
		textOf (l) { return this.text[l] || this.text[0]; },
		hintOf (l) { return this.hint[l] || this.hint[0]; },
		knows (en)
		{
			if (!this.words.trim ()) return true;
			return this.words.toUpperCase ().split (/[ ,]+/).includes (en);
		} };
}
// A level's gems (1 ... N, no gap, no repeat) and portals (each letter twice or not at all) -> null, or the fault
function checkLevel (L)
{
	if (L.draw) return null;
	const cnt = new Array (10).fill (0), first = [], second = [], pads = [[], []];
	let top = 0;
	for (let r = 0; r < L.h; r++)
		for (let c = 0; c < L.w; c++)
		{
			const k = L.map[r][c];
			if (k >= '1' && k <= '9') { const d = +k; if (!cnt[d]) first[d] = [c, r]; else if (cnt[d] === 1) second[d] = [c, r]; cnt[d]++; if (d > top) top = d; }
			if (k === 'T' || k === 'U') pads[k === 'T' ? 0 : 1].push ([c, r]);
		}
	for (let d = 1; d <= top; d++)
	{
		if (!cnt[d]) { let e = d + 1; while (!cnt[e]) e++; return { kind: 'gem-missing', n: d, at: first[e] }; }
		if (cnt[d] > 1) return { kind: 'gem-twice', n: d, at: second[d] };
	}
	for (let q = 0; q < 2; q++)
	{
		if (pads[q].length === 1) return { kind: 'pad-alone', n: q + 1, at: pads[q][0] };
		if (pads[q].length > 2) return { kind: 'pad-many', n: q + 1, at: pads[q][2], count: pads[q].length };
	}
	return null;
}
function faultReason (f)
{
	const letter = f.n === 2 ? 'U' : 'T';
	switch (f.kind)
	{
	case 'gem-missing': return 'gem ' + f.n + ' is missing';
	case 'gem-twice': return 'two gems ' + f.n;
	case 'pad-alone': return 'the teleporter ' + letter + ' has no twin';
	case 'pad-many': return f.count + ' teleporters ' + letter;
	}
	return '';
}
// A pack's text -> { title: [en, fr], levels } (throws an Error: why)
function parsePack (src)
{
	const pack = { title: ['', ''], levels: [] };
	let L = null, inPack = false, key = '', lang = 0, multi = null;
	const flush = () =>
	{
		if (multi === null) return;
		if (L)
		{
			if (key === 'map')
			{
				const rows = multi.split ('\n').slice (0, MAXH).map ((r) => r.slice (0, MAXW));
				L.h = rows.length; L.w = Math.max (0, ...rows.map ((r) => r.length));
				L.map = rows.map ((r) => r.padEnd (L.w, ' ').split (''));
			}
			else if (key === 'solution') L.solution = multi;
			else if (key === 'start') L.start = multi;
			else if (key === 'text') L.text[lang] = multi;
			else if (key === 'hint') L.hint[lang] = multi;
		}
		multi = null;
	};
	for (let line of src.replace (/\r/g, '').split ('\n'))
	{
		if (line[0] === '|')
		{
			const v = line[1] === ' ' ? line.slice (2) : line.slice (1);
			multi = multi === null ? v : multi + '\n' + v;
			continue;
		}
		flush ();
		const s = line.trim ();
		if (!s || s[0] === '#' || s[0] === ';') continue;
		if (s[0] === '[')
		{
			if (s.startsWith ('[pack]')) { inPack = true; L = null; }
			else if (s.startsWith ('[level]')) { inPack = false; L = levelOf ({ title: ['', ''], text: ['', ''], hint: ['', ''] }); pack.levels.push (L); }
			continue;
		}
		const eq = s.indexOf ('='); if (eq < 0) continue;
		let k = s.slice (0, eq).trim (); const v = s.slice (eq + 1).trim ();
		lang = 0;
		if (k.endsWith ('.fr')) { k = k.slice (0, -3); lang = 1; }
		key = k;
		if (inPack) { if (k === 'title') pack.title[lang] = v; continue; }
		if (!L) continue;
		switch (k)
		{
		case 'id': L.id = v; break;
		case 'title': L.title[lang] = v; break;
		case 'text': L.text[lang] = v; break;
		case 'hint': L.hint[lang] = v; break;
		case 'concept': L.topic = v; break;
		case 'words': L.words = v; break;
		case 'par': { const p = v.split (/\s+/); L.par3 = parseInt (p[0], 10) || 0; L.par2 = p.length > 1 ? parseInt (p[1], 10) || 0 : L.par3 * 2; break; }
		case 'draw': L.draw = drawMode (v); break;
		case 'solution': if (v) L.solution = v; break;
		case 'start': if (v) L.start = v; break;
		}
	}
	flush ();
	pack.levels.forEach ((l, i) =>
	{
		if (!l.w || !l.h) throw new Error ('level ' + (i + 1) + ' (' + l.id + ') has no map');
		if (!l.id) l.id = 'level' + (i + 1);
		const f = checkLevel (l);
		if (f) throw new Error ('level ' + (i + 1) + ' (' + l.id + '): ' + faultReason (f));
	});
	if (!pack.levels.length) throw new Error ('no [level] in the pack');
	return pack;
}

// ---- counting the instructions (the ends of blocks and the comments do not count; "a: b" are two) -------------------------------
function countInstructions (src)
{
	let count = 0;
	for (const line of src.replace (/\r/g, '').split ('\n'))
	{
		let q = false, st = 0;
		for (let i = 0; ; i++)
		{
			const c = i < line.length ? line[i] : '';
			if (c === '"') q = !q;
			const cut = !c || (!q && (c === ':' || c === "'"));
			if (!cut) continue;
			const s = Basic.plain (line.slice (st, i)).trim ();
			const w = s.split (/\s+/), w1 = w[0] || '', w2 = w[1] || '';
			let closing = !s || ['NEXT', 'WEND', 'LOOP', 'ELSE', 'REM', 'END', 'FIN', 'SUITE', 'SUIVANT', 'FINTANTQUE', 'BOUCLE', 'SINON'].includes (w1);
			if ((w1 === 'END' || w1 === 'FIN') && s.length <= 3) closing = false;
			if ((w1 === 'SINON' && w2 === 'SI') || (w1 === 'ELSE' && w2 === 'IF')) closing = false;
			if (!closing) count++;
			if (!c || c === "'") break;
			st = i + 1;
		}
	}
	return count;
}

// ---- the world -----------------------------------------------------------------------------------------------------------------
class World
{
	reset (L)
	{
		this.L = L; this.x = 0; this.y = 0; this.h = 90; this.pen = true; this.color = 1;
		this.keys = 0; this.coins = 0; this.coinsTotal = 0; this.gems = 0; this.gemsTotal = 0;
		this.hasGoal = false; this.gx = 0; this.gy = 0; this.pads = [[], []];
		this.segs = [];
		this.cell = []; this.painted = [];
		for (let r = 0; r < L.h; r++)
		{
			this.cell.push ([]); this.painted.push (new Array (L.w).fill (false));
			for (let c = 0; c < L.w; c++)
			{
				let k = L.map[r][c];
				if ('^>v<'.includes (k)) { this.x = c; this.y = r; this.h = { '^': 0, '>': 90, v: 180, '<': 270 }[k]; k = '.'; }
				if (k === '*') { this.hasGoal = true; this.gx = c; this.gy = r; }
				if (k === 'c') this.coinsTotal++;
				if (!L.draw && k >= '1' && k <= '9') this.gemsTotal++;
				if (!L.draw && (k === 'T' || k === 'U')) this.pads[k === 'T' ? 0 : 1].push ([c, r]);
				this.cell[r].push (k);
			}
		}
		this.paintHere ();
		return this;
	}
	at (c, r) { return c < 0 || r < 0 || !this.L || c >= this.L.w || r >= this.L.h ? '#' : this.cell[r][c]; }
	cx () { return Math.floor (this.x + 0.5); }
	cy () { return Math.floor (this.y + 0.5); }
	paintHere () { const c = this.cx (), r = this.cy (); if (this.pen && c >= 0 && r >= 0 && c < this.L.w && r < this.L.h) this.painted[r][c] = true; }
	static dir (hd) { const a = hd * Math.PI / 180; let dx = Math.sin (a), dy = -Math.cos (a); if (Math.abs (dx) < 1e-9) dx = 0; if (Math.abs (dy) < 1e-9) dy = 0; return [dx, dy]; }
	look (off) { const [dx, dy] = World.dir (this.h + off); const c = Math.floor (this.x + dx + 0.5), r = Math.floor (this.y + dy + 0.5); return [this.at (c, r), c, r]; }
	gemAt (c, r) { const k = this.at (c, r); return !this.L.draw && k >= '1' && k <= '9' ? +k : 0; }
	padAt (c, r) { const k = this.at (c, r); return !this.L.draw && (k === 'T' || k === 'U') ? (k === 'T' ? 1 : 2) : 0; }
	twin (c, r)
	{
		const q = this.padAt (c, r) - 1;
		if (q < 0 || this.pads[q].length !== 2) return null;
		const p = this.pads[q], o = p[0][0] === c && p[0][1] === r ? 1 : 0;
		return p[o];
	}
	blocks (k) { return k === '#' || k === ' ' || (k === 'D' && this.keys === 0); }
	won ()
	{
		if (this.hasGoal && (this.cx () !== this.gx || this.cy () !== this.gy)) return false;
		if (this.coins < this.coinsTotal || this.gems < this.gemsTotal) return false;
		for (let r = 0; r < this.L.h; r++) for (let c = 0; c < this.L.w; c++) if (this.L.map[r][c] === 'p' && !this.painted[r][c]) return false;
		return true;
	}
}

// One event applied to a world: { kind, line, a, b, c, d, i }
function apply (w, e)
{
	switch (e.kind)
	{
	case 'move':
		if (w.pen) w.segs.push ({ x1: e.a, y1: e.b, x2: e.c, y2: e.d, color: w.color });
		w.x = e.c; w.y = e.d; w.paintHere (); break;
	case 'turn': w.h = e.b; break;
	case 'pen': w.pen = !!e.i; if (w.pen) w.paintHere (); break;
	case 'color': w.color = e.i; break;
	case 'pick':
	{
		const c = e.i & 255, r = e.i >> 8, k = w.at (c, r);
		if (k === 'k') w.keys++;
		if (k === 'c') w.coins++;
		if (w.gemAt (c, r)) w.gems++;
		if (c < w.L.w && r < w.L.h) w.cell[r][c] = '.';
		break;
	}
	case 'teleport': w.x = e.c; w.y = e.d; w.paintHere (); break;
	case 'door': { const c = e.i & 255, r = e.i >> 8; if (w.keys > 0) w.keys--; if (c < w.L.w && r < w.L.h) w.cell[r][c] = '.'; break; }
	}
}

const T = (lang, en, fr) => lang === LANG_FR ? fr : en;

// A message of the language made friendlier
function friendly (lang, line, msg)
{
	const MAP = [
		['Syntax error', 'I do not understand line %d.', 'Je ne comprends pas la ligne %d.'],
		['FOR without NEXT', 'Line %d: this FOR has no NEXT to close it.', "Ligne %d : ce POUR n'a pas de SUITE pour le fermer."],
		['REPEAT without END REPEAT', 'Line %d: this REPEAT has no END REPEAT to close it.', "Ligne %d : ce REPETER n'a pas de FIN REPETER pour le fermer."],
		['IF without END IF', 'Line %d: this IF has no END IF to close it.', "Ligne %d : ce SI n'a pas de FIN SI pour le fermer."],
		['WHILE without WEND', 'Line %d: this WHILE has no WEND to close it.', "Ligne %d : ce TANTQUE n'a pas de FIN TANTQUE pour le fermer."],
		['DO without LOOP', 'Line %d: this DO has no LOOP to close it.', "Ligne %d : ce FAIRE n'a pas de BOUCLE pour le fermer."],
		['SUB without END SUB', 'Line %d: this SUB has no END SUB.', "Ligne %d : ce SUB n'a pas de FIN SUB."],
		['FUNCTION without END FUNCTION', 'Line %d: this FUNCTION has no END FUNCTION.', "Ligne %d : cette FONCTION n'a pas de FIN FONCTION."],
		['SELECT without END SELECT', 'Line %d: this SELECT CASE has no END SELECT.', "Ligne %d : ce SELON CAS n'a pas de FIN SELON."],
		['Wrong number of arguments', 'Line %d: not the right number of values for this word.', 'Ligne %d : pas le bon nombre de valeurs pour ce mot.'],
		['Type mismatch', 'Line %d: a number was expected here.', 'Ligne %d : il fallait un nombre ici.'],
		['Division by zero', 'Line %d: a division by zero.', 'Ligne %d : une division par zéro.'],
		['Out of stack space', 'Line %d: the word calls itself without end -- does it have a test that stops it?', "Ligne %d : le mot s'appelle lui-même sans fin -- a-t-il un test qui l'arrête ?"]];
	for (const [k, en, fr] of MAP) if (msg.startsWith (k)) return (lang === LANG_FR ? fr : en).replace ('%d', line);
	if (msg.startsWith ('Two instructions: '))
	{
		const w = msg.slice (18);
		return T (lang, 'Line %d: careful, you can put only one instruction per line! Put %s on a new line (press Enter before it).', 'Ligne %d : attention, tu ne peux mettre qu\'une instruction par ligne ! Mets %s sur une nouvelle ligne (appuie sur Entrée devant).').replace ('%d', line).replace ('%s', w);
	}
	if (msg.startsWith ('Sub or function not defined'))
	{
		const name = msg.split (': ')[1] || '';
		return T (lang, 'Line %d: I do not know this word (%s).', 'Ligne %d : je ne connais pas ce mot (%s).').replace ('%d', line).replace ('%s', name);
	}
	if (lang !== LANG_FR) return 'Line ' + line + ': ' + msg;
	return 'Ligne ' + line + ' : ' + Basic.frenchMessage (msg, SHOWN_FR);
}

// ---- the run: the program run at once on a copy of the level, every step recorded --------------------------------------------------
const MAX_EVENTS = 40000, MAX_STATEMENTS = 3000000;
class TurtleError extends Basic.BasicError { constructor (m) { super (m); this.own = true; } }

function runProgram (L, src, lang, target)
{
	const R = { ev: [], result: 'lost', errLine: 0, msg: '', out: [], count: countInstructions (src), stars: 0 };
	let prog;
	try { prog = Basic.compile (src, DIALECT); }
	catch (e)
	{
		if (!(e instanceof Basic.BasicError)) throw e;
		R.result = 'compile'; R.errLine = e.line; R.msg = friendly (lang, e.line, e.message);
		return R;
	}
	const w = new World ().reset (L);
	let line = 0, statements = 0, endless = false;
	const push = (e) => { e.line = line; if (R.ev.length < MAX_EVENTS) R.ev.push (e); apply (w, e); };
	const full = () => { if (R.ev.length < MAX_EVENTS) return false; endless = true; return true; };
	const fail = (en, fr) => { throw new TurtleError (T (lang, en, fr)); };
	const move = (dist) =>
	{
		const [dx, dy] = World.dir (w.h);
		const sign = dist < 0 ? -1 : 1;
		let left = Math.abs (dist);
		const grid = !L.draw;
		while (left > 1e-9)
		{
			if (full ()) throw new Basic.Endless ();
			const st = left >= 1 ? 1 : left; left -= st;
			const nx = w.x + sign * dx * st, ny = w.y + sign * dy * st;
			const c = Math.floor (nx + 0.5), r = Math.floor (ny + 0.5), k = w.at (c, r);
			if (grid && (c !== w.cx () || r !== w.cy ()))
			{
				if (k === 'D' && w.keys > 0) push ({ kind: 'door', i: c + r * 256 });
				else if (w.blocks (k))
				{
					push ({ kind: 'bump', a: w.x, b: w.y, c: nx, d: ny });
					if (k === 'D') fail ('The door is locked: the turtle needs a key.', 'La porte est fermée : la tortue a besoin d\'une clé.');
					if (k === ' ' || c < 0 || r < 0 || c >= L.w || r >= L.h) fail ('The turtle almost fell off the board!', 'La tortue a failli tomber du plateau !');
					fail ('Bump! The turtle hit a wall.', 'Bong ! La tortue s\'est cognée dans un mur.');
				}
			}
			else if (!grid && (nx < -0.5 || ny < -0.5 || nx > L.w - 0.5 || ny > L.h - 0.5))
			{
				push ({ kind: 'bump', a: w.x, b: w.y, c: nx, d: ny });
				fail ('The turtle went off the page!', 'La tortue est sortie de la page !');
			}
			push ({ kind: 'move', a: w.x, b: w.y, c: nx, d: ny });
			const tw = grid && Math.abs (nx - c) < 1e-6 && Math.abs (ny - r) < 1e-6 ? w.twin (c, r) : null;
			if (tw)
			{
				if (full ()) throw new Basic.Endless ();
				push ({ kind: 'teleport', a: c, b: r, c: tw[0], d: tw[1] });
			}
		}
	};
	const turn = (deg) =>
	{
		if (full ()) throw new Basic.Endless ();
		let h = (w.h + deg) % 360; if (h < 0) h += 360;
		if (Math.abs (h - Math.round (h)) < 1e-6) h = Math.round (h);
		if (h >= 360) h -= 360;
		push ({ kind: 'turn', a: w.h, b: h });
	};
	const yes = (b) => b ? -1 : 0;
	const host = {
		onStatement (ln)
		{
			if (full () || ++statements > MAX_STATEMENTS) { endless = true; return false; }
			line = ln; push ({ kind: 'line' });
			return true;
		},
		print (text) { push ({ kind: 'print', i: R.out.length }); R.out.push (text); },
		ext (name, a)
		{
			if (!L.knows (name)) throw new TurtleError (T (lang, 'This level does not know %s yet.', 'Ce niveau ne connaît pas encore %s.').replace ('%s', wordName (name, lang)));
			const n = a.length ? a[0] : 0;
			switch (name)
			{
			case 'FORWARD': return move (a.length ? n : 1);
			case 'BACK': return move (-(a.length ? n : 1));
			case 'LEFT': return turn (-(a.length ? n : 90));
			case 'RIGHT': return turn (a.length ? n : 90);
			case 'PENUP': case 'PENDOWN': push ({ kind: 'pen', i: name === 'PENDOWN' ? 1 : 0 }); return;
			case 'COLOR':
				if (n < 0 || n > 15) fail ('COLOR takes a number from 0 to 15.', 'COULEUR prend un nombre de 0 à 15.');
				push ({ kind: 'color', i: Math.trunc (n) }); return;
			case 'PICK':
			{
				const k = w.at (w.cx (), w.cy ()), g = w.gemAt (w.cx (), w.cy ());
				if (g && g !== w.gems + 1) throw new TurtleError (T (lang, 'Gem %d first! This is gem %e.', "D'abord la gemme %d ! Celle-ci est la %e.").replace ('%d', w.gems + 1).replace ('%e', g));
				if (k !== 'k' && k !== 'c' && !g) fail ('There is nothing to pick up here.', 'Il n\'y a rien à ramasser ici.');
				push ({ kind: 'pick', i: w.cx () + w.cy () * 256 }); return;
			}
			case 'WALL': return yes (w.blocks (w.look (0)[0]));
			case 'WALLLEFT': return yes (w.blocks (w.look (-90)[0]));
			case 'WALLRIGHT': return yes (w.blocks (w.look (90)[0]));
			case 'FRONT':
			{
				const [k, c, r] = w.look (0);
				return k === 'D' ? 4 : w.blocks (k) ? 1 : (k === 'k' || k === 'c' || w.gemAt (c, r)) ? 2 : w.padAt (c, r) ? 5 : (w.hasGoal && c === w.gx && r === w.gy) ? 3 : 0;
			}
			case 'ONGOAL': return yes (w.hasGoal && w.cx () === w.gx && w.cy () === w.gy);
			case 'ITEM': { const k = w.at (w.cx (), w.cy ()); return yes (k === 'k' || k === 'c' || w.gemAt (w.cx (), w.cy ())); }
			case 'GEM': return w.gemAt (w.cx (), w.cy ());
			case 'KEYS': return w.keys;
			case 'HEADING': return w.h;
			}
			fail ('Unknown word.', 'Mot inconnu.');
		} };
	try { Basic.run (prog, host, DIALECT); }
	catch (e)
	{
		if (e instanceof Basic.Endless) endless = true;
		else if (e instanceof Basic.BasicError)
		{
			R.result = 'error'; R.errLine = e.line || line;
			R.msg = e.own ? T (lang, 'Line %d: ', 'Ligne %d : ').replace ('%d', R.errLine) + e.message : friendly (lang, R.errLine, e.message);
			return R;
		}
		else throw e;
	}
	if (endless)
	{
		R.result = 'endless'; R.errLine = line;
		R.msg = T (lang, 'The turtle is tired: the program does not seem to end (a loop that never stops?).',
			'La tortue est fatiguée : le programme ne semble pas finir (une boucle qui ne s\'arrête jamais ?).');
		return R;
	}
	let ok = w.won (), shape = ok;
	if (ok && L.draw && target) ok = shape = sameDrawing (w.segs, target);
	if (ok && L.draw === 2 && target) ok = sameColours (w.segs, target);
	R.result = ok ? 'won' : 'lost';
	if (ok) R.stars = !L.par3 || R.count <= L.par3 ? 3 : R.count <= L.par2 ? 2 : 1;
	else if (L.draw === 2 && shape) R.msg = T (lang, 'The right figure, but not the right colours.\nEach line takes the colour of the light line under it.', 'La bonne figure, mais pas les bonnes couleurs.\nChaque trait prend la couleur du trait clair dessous.');
	else if (L.draw === 2) R.msg = T (lang, 'Not quite the same figure: compare with the light one.', 'Pas tout à fait la même figure : compare avec la figure claire.');
	else if (L.draw) R.msg = T (lang, 'Not quite the same figure: compare with the grey one.', 'Pas tout à fait la même figure : compare avec la grise.');
	else if (w.coins < w.coinsTotal) R.msg = T (lang, 'The program ended, but %d coin(s) are still on the floor.', 'Le programme est fini, mais il reste %d pièce(s) par terre.').replace ('%d', w.coinsTotal - w.coins);
	else if (w.gems < w.gemsTotal) R.msg = T (lang, 'The program ended, but %d gem(s) are still on the floor.', 'Le programme est fini, mais il reste %d gemme(s) par terre.').replace ('%d', w.gemsTotal - w.gems);
	else if (w.hasGoal && (w.cx () !== w.gx || w.cy () !== w.gy)) R.msg = T (lang, 'The program ended before the turtle reached the flag.', 'Le programme est fini avant que la tortue arrive au drapeau.');
	else R.msg = T (lang, 'Some tiles are not painted yet.', 'Il reste des cases à peindre.');
	return R;
}

// ---- a drawing compared with the target -------------------------------------------------------------------------------------------
function segDist (s, px, py)
{
	const dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy;
	let t = l2 > 0 ? ((px - s.x1) * dx + (py - s.y1) * dy) / l2 : 0;
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	const ex = s.x1 + t * dx - px, ey = s.y1 + t * dy - py;
	return Math.sqrt (ex * ex + ey * ey);
}
// Every point of a's lines (every 0.1 square) near a line of b (of the same colour when colour)
function covered (a, b, colour)
{
	for (const s of a)
	{
		const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.sqrt (dx * dx + dy * dy), k = Math.floor (len / 0.1) + 1;
		for (let j = 0; j <= k; j++)
		{
			const px = s.x1 + dx * j / k, py = s.y1 + dy * j / k;
			if (!b.some ((m) => (!colour || m.color === s.color) && segDist (m, px, py) < 0.15)) return false;
		}
	}
	return true;
}
function sameDrawing (mine, target) { return !target.length || (mine.length > 0 && covered (mine, target, false) && covered (target, mine, false)); }
function sameColours (mine, target) { return !target.length || (covered (mine, target, true) && covered (target, mine, true)); }
// A drawing level's figure: its solution's lines (null: no solution, or it fails)
function targetOf (L)
{
	if (!L.solution) return null;
	const R = runProgram (L, L.solution, LANG_EN, null);
	if (R.result !== 'won') return null;
	const w = new World ().reset (L);
	for (const e of R.ev) apply (w, e);
	return w.segs;
}

const Turtle = { LANG_EN, LANG_FR, WORDS, WORD_HELP, CONCEPTS, DIALECT, friendly, wordName, parsePack, checkLevel, countInstructions, World, apply, runProgram, targetOf };
if (typeof module !== 'undefined' && module.exports) module.exports = Turtle; else global.Turtle = Turtle;
}) (typeof window !== 'undefined' ? window : globalThis);
