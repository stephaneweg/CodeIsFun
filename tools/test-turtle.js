// test-turtle.js -- every Turtle Quest level's solution run (node tools/test-turtle.js): it must win, with three
// stars; the start programs must compile. The French words are tried too: a solution translated word by word.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
globalThis.window = globalThis;
require (path.join (__dirname, '..', 'turtle', 'levels.js'));
const Basic = require (path.join (__dirname, '..', 'turtle', 'basic.js'));
globalThis.Basic = Basic;
const Turtle = require (path.join (__dirname, '..', 'turtle', 'world.js'));
let bad = 0, n = 0;
const FR = { FORWARD: 'AVANCER', BACK: 'RECULER', LEFT: 'GAUCHE', RIGHT: 'DROITE', PICK: 'RAMASSER', REPEAT: 'REPETER', 'END REPEAT': 'FIN REPETER',
	IF: 'SI', THEN: 'ALORS', ELSEIF: 'SINON SI', ELSE: 'SINON', 'END IF': 'FIN SI', WHILE: 'TANTQUE', WEND: 'FIN TANTQUE', NOT: 'NON', AND: 'ET', OR: 'OU',
	FOR: 'POUR', TO: 'JUSQUE', STEP: 'PAS', NEXT: 'SUITE', 'END SUB': 'FIN SUB', 'EXIT SUB': 'SORTIR SUB', FUNCTION: 'FONCTION', 'END FUNCTION': 'FIN FONCTION',
	WALL: 'MUR', WALLLEFT: 'MURGAUCHE', WALLRIGHT: 'MURDROITE', ONGOAL: 'SURBUT', ITEM: 'OBJET', GEM: 'GEMME', FRONT: 'DEVANT', KEYS: 'CLES',
	PENUP: 'LEVERCRAYON', PENDOWN: 'BAISSERCRAYON', COLOR: 'COULEUR', MOD: 'MOD' };
const toFr = (s) => s.replace (/\b(END REPEAT|END IF|END SUB|EXIT SUB|END FUNCTION|[A-Z]+)\b/g, (w) => FR[w] || w);
for (const p of window.TURTLE_PACKS)
{
	const pack = Turtle.parsePack (p.text);
	for (const L of pack.levels)
	{
		n++;
		const target = L.draw ? Turtle.targetOf (L) : null;
		if (L.draw && !target) { console.log ('FAIL', p.name, L.id, 'no target'); bad++; continue; }
		for (const [lang, src] of [[0, L.solution], [1, toFr (L.solution)]])
		{
			const R = Turtle.runProgram (L, src, lang, target);
			if (R.result !== 'won' || R.stars !== 3) { console.log ('FAIL', p.name, L.id, lang ? 'fr' : 'en', R.result, R.stars, R.count, '/', L.par3, R.msg); bad++; }
		}
		if (L.start) { try { Basic.compile (L.start, Turtle.DIALECT); } catch (e) { console.log ('START', p.name, L.id, e.message, e.line); bad++; } }
	}
}
// a few errors said right
const L0 = Turtle.parsePack (window.TURTLE_PACKS[0].text).levels[0];
for (const [src, want] of [['FORWARD 99', 'Bump'], ['FORWARD\nFOR i = 1 TO 3', 'no NEXT'], ['SUB A\nA\nEND SUB\nA', 'calls itself'], ['WHILE 1\nx = x + 1\nWEND', 'tired'], ['FOO 3', 'do not know'], ['IF 1 THEN', 'END IF']])
{
	const R = Turtle.runProgram (L0, src, 0, null);
	if (!R.msg.includes (want)) { console.log ('MSG', JSON.stringify (src), R.result, R.msg); bad++; }
}
console.log (n + ' levels, ' + bad + ' failure(s)');
process.exit (bad ? 1 : 0);
