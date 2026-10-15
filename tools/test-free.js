// test-free.js -- the free mode's computer run without a browser (node tools/test-free.js): Onyx's examples (Arkanoid
// played a little: the title, a round started, the paddle moved, Esc), QBasic's statements drawn on the screen.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
globalThis.window = globalThis;
const ctx = { createImageData: (w, h) => ({ data: new Uint8ClampedArray (w * h * 4) }), putImageData () {}, save () {}, restore () {}, fillRect () {} };
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
for (const f of ['font.js', 'onyx-examples.js', 'three3d.js']) require (path.join (__dirname, '..', 'turtle', f));
globalThis.Basic = require (path.join (__dirname, '..', 'turtle', 'basic.js'));
require (path.join (__dirname, '..', 'turtle', 'screen.js'));
const { Computer, FREE_DIALECT } = window.BasicScreen;
let bad = 0;
const canvas = () => ({ getContext: () => ctx, style: {}, addEventListener () {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 400 }) });
// Runs src, answering the waits at once; script: [ [ after so many waits, key ] ] -> { err, pc (the computer) }
function run (src, script = [], maxWaits = 4000, lines = [])
{
	const pc = new Computer (canvas (), {});
	pc.sound.ctx = () => null;
	const prog = Basic.compile (src, FREE_DIALECT);
	pc.gen = Basic.start (prog, pc.host (), FREE_DIALECT); pc.t0 = 0;
	let fake = 0; const realNow = performance.now.bind (performance);
	performance.now = () => realNow () + fake;
	let v, waits = 0, err = null;
	try
	{
		for (;;)
		{
			pc.sliceStart = performance.now ();
			const r = pc.gen.next (v); v = undefined;
			if (r.done) break;
			const w = r.value;
			for (const [at, k] of script) if (at === waits) { if (k.startsWith ('hold:')) pc.held.add (k.slice (5)); else if (k.startsWith ('up:')) pc.held.delete (k.slice (3)); else pc.keys.push (k); }
			if (++waits > maxWaits) break;
			if (w.wait === 'sleep') fake += w.ms;
			if (w.wait === 'line') v = lines.shift () ?? '';
			if (w.wait === 'chars') v = 'x'.repeat (w.n);
			if (w.wait === 'key') fake += 10;
		}
	}
	catch (e) { err = e; }
	performance.now = realNow;
	return { err, pc, waits };
}
const check = (name, ok, more) => { if (!ok) { bad++; console.log ('FAIL', name, more || ''); } else console.log ('ok  ', name); };
for (const ex of window.ONYX_EXAMPLES)
{
	if (ex.name === 'invaders.bas')
	{
		// the title (Space), a wave played: moved, fired again and again, then Esc twice
		const sc = [[30, ' ']];
		for (let k = 100; k < 2500; k += 40) sc.push ([k, ' ']);
		sc.push ([300, 'hold:LEFT'], [500, 'up:LEFT'], [700, 'hold:RIGHT'], [1100, 'up:RIGHT'], [2600, '\x1b'], [2800, '\x1b']);
		const r = run (ex.text, sc, 8000);
		check (ex.name, !r.err && r.pc.screen.mode === 13, r.err ? 'line ' + r.err.line + ': ' + r.err.message : 'waits ' + r.waits);
		continue;
	}
	if (ex.name === 'amanda.bas')
	{
		// a name typed, a sentence, F1 (the help) and Esc (Amanda says goodbye and ends): it answers from its DATA (MEMOIRE.DAT)
		const sc = [], type = (at, t) => { for (const c of t) sc.push ([at++, c]); return at; };
		let at = type (20, 'Ann\r');
		at = type (at + 40, "j'aime les chats\r");
		sc.push ([at + 40, '\x00;'], [at + 80, '\x1b']);
		const r = run (ex.text, sc, 3000);
		check (ex.name, !r.err && r.waits > at && r.waits < 3000, r.err ? 'line ' + r.err.line + ': ' + r.err.message : 'ended after ' + r.waits + ' waits');
		continue;
	}
	if (ex.name === 'zoomo.bas')
	{
		// the title (a pilot and a circuit changed), a race started, steered, an item used, paused, Esc twice (the title, quit)
		const r = run (ex.text, [[10, '\x00M'], [12, '\x00P'], [14, '\x00M'], [16, '\x00P'], [20, '\r'], [200, 'hold:RIGHT'], [260, 'up:RIGHT'], [270, ' '], [300, 'P'], [310, 'P'], [400, '\x1b'], [420, '\x1b']], 1000);
		check (ex.name, !r.err && r.pc.screen.mode === 12 && r.waits < 1000, r.err ? 'line ' + r.err.line + ': ' + r.err.message : 'waits ' + r.waits);
		continue;
	}
	if (ex.name === 'arkanoid.bas')
	{
		// the title (a key: Space), a round played with the arrow held, then Esc twice (the title, quit)
		const r = run (ex.text, [[30, ' '], [200, 'hold:LEFT'], [400, 'up:LEFT'], [400, 'hold:SPACE'], [420, 'up:SPACE'], [900, '\x1b'], [1100, '\x1b']], 6000);
		check (ex.name, !r.err && r.pc.screen.mode === 13, r.err ? 'line ' + r.err.line + ': ' + r.err.message : 'waits ' + r.waits);
		continue;
	}
	const r = run (ex.text, [], 200, ['50', '25', '12', '6', '3', '1', '2', '4', '5', '7', '8', '9', '10']);
	check (ex.name, !r.err, r.err && 'line ' + r.err.line + ': ' + r.err.message);
}
// the language's pieces
const cases = [
	['GOSUB / RETURN, labels', 'x = 1\nGOSUB Add\nGOSUB Add\nIF x <> 3 THEN ERROR 5\nEND\nAdd:\nx = x + 1\nRETURN'],
	['line numbers, GOTO', '10 i = 0\n20 i = i + 1\n30 IF i < 5 THEN GOTO 20\n40 IF i <> 5 THEN ERROR 5'],
	['DATA, READ, RESTORE', 'DATA 1, "two", 3\nREAD a, b$, c\nIF a + c <> 4 OR b$ <> "two" THEN ERROR 5\nRESTORE\nREAD a\nIF a <> 1 THEN ERROR 5'],
	['by reference', 'SUB Inc (n)\nn = n + 1\nEND SUB\nk = 1: Inc k: Inc k\nIF k <> 3 THEN ERROR 5'],
	['TYPE, arrays of records', 'TYPE P\nx AS INTEGER\nn AS STRING * 8\nEND TYPE\nDIM a(3) AS P\na(2).x = 7: a(2).n = "hi"\nIF a(2).x <> 7 OR a(2).n <> "hi" THEN ERROR 5'],
	['SWAP, LBOUND/UBOUND', 'DIM v(2 TO 6)\na = 1: b = 2: SWAP a, b\nIF a <> 2 OR LBOUND(v) <> 2 OR UBOUND(v) <> 6 THEN ERROR 5'],
	['ON ERROR, RESUME NEXT', 'ON ERROR GOTO H\nx = 1 / 0\nIF e <> 11 THEN ERROR 5\nEND\nH:\ne = ERR\nRESUME NEXT'],
	['PRINT USING', 'a$ = "x"\nPRINT USING "###.##"; 3.14159'],
	['graphics', 'SCREEN 12\nLINE (0,0)-(100,100), 4, BF\nCIRCLE (320,240), 50, 2\nPAINT (320,240), 14, 2\nIF POINT(320,240) <> 14 OR POINT(50,50) <> 4 THEN ERROR 5\nDRAW "C3 BM10,10 R20 D20"\nIF POINT(20,10) <> 3 THEN ERROR 5\nPSET (5,5), RGB(255,0,0)'],
	['GET / PUT', 'SCREEN 13\nDIM s(100)\nLINE (0,0)-(3,3), 9, BF\nGET (0,0)-(3,3), s\nCLS\nPUT (10,10), s, PSET\nIF POINT(11,11) <> 9 THEN ERROR 5'],
	['INPUT, INKEY$, INPUT$', 'INPUT "Name"; n$\nINPUT a, b\nIF n$ <> "Ann" OR a + b <> 5 THEN ERROR 5\nk$ = INPUT$(2)\nIF k$ <> "xx" THEN ERROR 5'],
	['in French', 'SI 1 = 1 ALORS\nPOUR i = 1 JUSQUE 3\nAFFICHER i\nSUITE\nFIN SI\nCOULEUR 2'],
	['the turtle on the screen', 'SCREEN 12\nREPEAT 4\nFORWARD 50\nRIGHT\nEND REPEAT\nIF HEADING <> 0 THEN ERROR 5'],
	['the sound', 'BEEP\nSOUND 440, 2\nPLAY "MB T120 L8 CDEFG"\nPLAY "MF O3 C4"\nx = PLAY(0)\nNOTEON 1, 440: NOTEOFF 1']];
for (const [name, src] of cases)
{
	const r = run (src, [], 200, ['Ann', '2, 3']);
	check (name, !r.err, r.err && 'line ' + r.err.line + ': ' + r.err.message);
}
console.log (bad ? bad + ' failure(s)' : 'all right');
process.exit (bad ? 1 : 0);
