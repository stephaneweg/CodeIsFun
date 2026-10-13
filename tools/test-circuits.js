// test-circuits.js -- every Circuits level's solution read and checked (node tools/test-circuits.js): it must win
// with three stars; its text written back reads the same; a loop and a wrong row are said.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
globalThis.window = globalThis;
require (path.join (__dirname, '..', 'circuits', 'levels.js'));
const C = require (path.join (__dirname, '..', 'circuits', 'engine.js'));
let bad = 0, n = 0;
for (const p of window.CIRCUITS_PACKS)
{
	const pack = C.parsePack (p.text);
	for (const L of pack.levels)
	{
		n++;
		const r = C.readText (L, L.solution);
		if (!r.c) { console.log ('READ', L.id, r.err, r.line); bad++; continue; }
		const k = C.check (r.c, L);
		if (!k.won || k.stars !== 3) { console.log ('FAIL', L.id, k.err, k.nwrong, k.gates, '/', L.par3); bad++; }
		const t = C.writeText (r.c), r2 = C.readText (L, t);
		if (!r2.c || C.writeText (r2.c) !== t) { console.log ('TEXT', L.id); bad++; }
		r.c.routes (); r.c.junctions ();
	}
}
const L = C.parsePack (window.CIRCUITS_PACKS[0].text).levels[2];	// AND
const c = new C.Circuit ().setup (L);
const g = c.add (C.P_AND, 16, 12).i;
if (c.connect (g, g, 0) !== C.E.LOOP) { console.log ('LOOP'); bad++; }
c.connect (0, g, 0); c.connect (1, g, 1); c.connect (0, 2, 0);
const k = C.check (c, L);
if (k.won || k.firstWrong !== 2) { console.log ('WRONG', k); bad++; }
console.log (n + ' levels, ' + bad + ' failure(s)');
process.exit (bad ? 1 : 0);
