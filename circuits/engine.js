// engine.js -- Circuits' engine, from Onyx's user/Apps/circuits/circuit.cpp: the board (switches, lamps, gates, wires)
// in grid cells, the evaluation (live, and depth by depth for the step mode), the Check against a level's truth table
// and its stars, the circuit text (a solution, the board saved), the undo history, the wires' routes and the hit tests;
// the packs. No user interface here: app.js draws; tools/test-circuits.js checks every level's solution with it.
//
// The board is 40 x 30 cells. The switches stand in the left strip (x = 0, 5 x 2 cells, their output pin at
// (5, y + 1)), the lamps in the right one (x = 34, 6 x 2, their input pin at (34, y + 1)); a gate is 5 x 4 cells,
// between the strips, overlapping nothing: its inputs at (x, y + 1) and (x, y + 3) -- NOT's one at (x, y + 2) --, its
// output at (x + 5, y + 2). An output feeds any number of inputs, an input takes one wire, a loop is refused.
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function (global) {
'use strict';

const P_SWITCH = 0, P_LAMP = 1, P_NOT = 2, P_AND = 3, P_OR = 4, P_XOR = 5, P_NAND = 6, P_NOR = 7, P_COUNT = 8;
const TYPE_NAMES = ['', '', 'NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR'];
const MAXIO = 4, MAXGATES = 48;
const BOARD_W = 40, BOARD_H = 30, SWITCH_W = 5, SWITCH_H = 2, LAMP_X = 34, LAMP_W = 6, LAMP_H = 2, GATE_W = 5, GATE_H = 4, GATE_MINX = 6, GATE_MAXX = 33;
const L0 = 0, L1 = 1, LX = 2;
const E = { OK: 'ok', NOT_ALLOWED: 'not-allowed', FULL: 'full', OVERLAP: 'overlap', OUTSIDE: 'outside', FIXED: 'fixed', LOOP: 'loop', PIN: 'pin',
	LAMP_OPEN: 'lamp-open', GATE_OPEN: 'gate-open', SYNTAX: 'syntax', NAME: 'name', TYPE: 'type', DOUBLE: 'double' };

const typeOf = (name) => { const t = TYPE_NAMES.indexOf (name); return t >= P_NOT ? t : -1; };
const isGate = (t) => t >= P_NOT && t < P_COUNT;
const fixedRow = (k, n) => n > 0 ? Math.floor ((2 * k + 1) * BOARD_H / (2 * n)) - 1 : 0;

// ---- the board ---------------------------------------------------------------------------------------------------------------
class Circuit
{
	constructor () { this.p = []; this.ni = 0; this.no = 0; this.allowed = 0; }
	get n () { return this.p.length; }
	setup (L)
	{
		this.ni = Math.min (L.ninputs, MAXIO); this.no = Math.min (L.noutputs, MAXIO); this.allowed = L.parts; this.p = [];
		for (let k = 0; k < this.ni + this.no; k++)
		{
			const sw = k < this.ni;
			this.p.push ({ name: sw ? L.inName[k] : L.outName[k - this.ni], type: sw ? P_SWITCH : P_LAMP, x: sw ? 0 : LAMP_X,
				y: fixedRow (sw ? k : k - this.ni, sw ? this.ni : this.no), in: [-1, -1] });
		}
		return this;
	}
	clone () { const c = new Circuit (); c.ni = this.ni; c.no = this.no; c.allowed = this.allowed; c.p = this.p.map ((q) => ({ ...q, in: [...q.in] })); return c; }
	find (name) { return this.p.findIndex ((q) => q.name === name); }
	pins (i) { if (i < 0 || i >= this.n) return 0; const t = this.p[i].type; return t === P_SWITCH ? 0 : t === P_LAMP || t === P_NOT ? 1 : 2; }
	fixed (i) { return i < this.ni + this.no; }
	gates () { return this.n - this.ni - this.no; }
	wires () { let w = 0; for (let i = 0; i < this.n; i++) for (let k = 0; k < this.pins (i); k++) if (this.p[i].in[k] >= 0) w++; return w; }
	upstream (a, b)
	{
		if (a < 0 || a >= this.n) return false;
		const stack = [a], seen = new Set ();
		while (stack.length)
		{
			const i = stack.pop ();
			for (let k = 0; k < this.pins (i); k++)
			{
				const s = this.p[i].in[k];
				if (s < 0 || seen.has (s)) continue;
				if (s === b) return true;
				seen.add (s); stack.push (s);
			}
		}
		return false;
	}
	box (i)
	{
		const q = this.p[i];
		if (q.type === P_SWITCH) return [q.x, q.y, SWITCH_W, SWITCH_H];
		if (q.type === P_LAMP) return [q.x, q.y, LAMP_W, LAMP_H];
		return [q.x, q.y, GATE_W, GATE_H];
	}
	pinIn (i, k) { const q = this.p[i]; return [q.x, q.type === P_LAMP ? q.y + 1 : q.type === P_NOT ? q.y + 2 : q.y + (k ? 3 : 1)]; }
	pinOut (i) { const q = this.p[i]; return q.type === P_SWITCH ? [q.x + SWITCH_W, q.y + 1] : [q.x + GATE_W, q.y + 2]; }
	at (cx, cy)
	{
		for (let i = this.n - 1; i >= 0; i--) { const [x, y, w, h] = this.box (i); if (cx >= x && cx < x + w && cy >= y && cy < y + h) return i; }
		return -1;
	}
	placeErr (type, x, y, ignore = -1)
	{
		if (!isGate (type) || !(this.allowed & (1 << type))) return E.NOT_ALLOWED;
		if (ignore < 0 && this.gates () >= MAXGATES) return E.FULL;
		if (x < GATE_MINX || x + GATE_W > GATE_MAXX || y < 0 || y + GATE_H > BOARD_H) return E.OUTSIDE;
		for (let i = this.ni + this.no; i < this.n; i++)
		{
			if (i === ignore) continue;
			const q = this.p[i];
			if (x < q.x + GATE_W && q.x < x + GATE_W && y < q.y + GATE_H && q.y < y + GATE_H) return E.OVERLAP;
		}
		return E.OK;
	}
	add (type, x, y)
	{
		const r = this.placeErr (type, x, y);
		if (r !== E.OK) return { i: -1, err: r };
		let k = 1; while (this.find ('g' + k) >= 0) k++;
		this.p.push ({ name: 'g' + k, type, x, y, in: [-1, -1] });
		return { i: this.n - 1, err: E.OK };
	}
	move (i, x, y)
	{
		if (i < 0 || i >= this.n) return E.PIN;
		if (this.fixed (i)) return E.FIXED;
		const r = this.placeErr (this.p[i].type, x, y, i);
		if (r !== E.OK) return r;
		this.p[i].x = x; this.p[i].y = y;
		return E.OK;
	}
	connectErr (src, dst, pin)
	{
		if (src < 0 || src >= this.n || dst < 0 || dst >= this.n || this.p[src].type === P_LAMP || pin < 0 || pin >= this.pins (dst)) return E.PIN;
		if (src === dst || this.upstream (src, dst)) return E.LOOP;
		return E.OK;
	}
	connect (src, dst, pin) { const r = this.connectErr (src, dst, pin); if (r === E.OK) this.p[dst].in[pin] = src; return r; }
	disconnect (dst, pin) { if (dst >= 0 && dst < this.n && pin >= 0 && pin < 2) this.p[dst].in[pin] = -1; }
	remove (i)
	{
		if (i < 0 || i >= this.n) return E.PIN;
		if (this.fixed (i)) return E.FIXED;
		this.p.splice (i, 1);
		for (const q of this.p) for (let j = 0; j < 2; j++) { if (q.in[j] === i) q.in[j] = -1; else if (q.in[j] > i) q.in[j]--; }
		return E.OK;
	}
	clear () { this.p.length = this.ni + this.no; for (const q of this.p) q.in = [-1, -1]; }

	// ---- routes: every wire's polyline, in the canonical order (into the gates, pin 1 then 2; then into the lamps) ----
	routes ()
	{
		const order = [];
		for (let i = this.ni + this.no; i < this.n; i++) for (let k = 0; k < this.pins (i); k++) if (this.p[i].in[k] >= 0) order.push ([i, k]);
		for (let i = this.ni; i < this.ni + this.no; i++) if (this.p[i].in[0] >= 0) order.push ([i, 0]);
		const done = [];
		for (const [dst, pin] of order) done.push (this.makeRoute (done, dst, pin, this.p[dst].in[pin]));
		return done;
	}
	columnFree (done, src, x, y0, y1)
	{
		const a = Math.min (y0, y1), b = Math.max (y0, y1);
		for (const r of done)
		{
			if (r.src === src) continue;
			for (let s = 0; s + 1 < r.pts.length; s++)
			{
				const [x0, ya] = r.pts[s], [x1, yb] = r.pts[s + 1];
				if (x0 !== x || x1 !== x) continue;
				if (Math.min (ya, yb) <= b && a <= Math.max (ya, yb)) return false;
			}
		}
		for (let i = 0; i < this.n; i++)
		{
			const [px, py, pw, ph] = this.box (i);
			if (px < x && x < px + pw && Math.max (a, py) < Math.min (b, py + ph)) return false;
		}
		return true;
	}
	makeRoute (done, dst, pin, s)
	{
		const [sx, sy] = this.pinOut (s), [tx, ty] = this.pinIn (dst, pin);
		const r = { dst, pin, src: s, pts: null };
		if (tx > sx)
		{
			let xm = Math.floor ((sx + tx) / 2);
			if (tx - sx >= 2)
			{
				search: for (let d = 0; d <= tx - sx; d++)
				{
					const mid = Math.floor ((sx + tx) / 2), cand = [mid + d, mid - d];
					for (let j = 0; j < (d ? 2 : 1); j++)
						if (cand[j] > sx && cand[j] < tx && this.columnFree (done, s, cand[j], sy, ty)) { xm = cand[j]; break search; }
				}
			}
			else xm = tx;
			r.pts = [[sx, sy], [xm, sy], [xm, ty], [tx, ty]];
		}
		else
		{
			const [, by, , bh] = this.box (s), [, ey, , eh] = this.box (dst);
			let yb = Math.max (by + bh, ey + eh) + 1;
			if (yb > BOARD_H) yb = Math.min (by, ey) - 1;
			r.pts = [[sx, sy], [sx + 1, sy], [sx + 1, yb], [tx - 1, yb], [tx - 1, ty], [tx, ty]];
		}
		return r;
	}
	// The dots where a wire leaves another of the same source
	junctions (routes = this.routes ())
	{
		const inside = (q, x, y) =>
		{
			for (let s = 0; s + 1 < q.pts.length; s++)
			{
				const [x0, y0] = q.pts[s], [x1, y1] = q.pts[s + 1];
				if (x0 === x1 && x === x0 && y > Math.min (y0, y1) && y < Math.max (y0, y1)) return true;
				if (y0 === y1 && y === y0 && x > Math.min (x0, x1) && x < Math.max (x0, x1)) return true;
			}
			return false;
		};
		const leaves = (q, j) =>
		{
			if (j + 1 >= q.pts.length) return 0;
			const dx = q.pts[j + 1][0] - q.pts[j][0], dy = q.pts[j + 1][1] - q.pts[j][1];
			return dx > 0 ? 1 : dx < 0 ? 2 : dy > 0 ? 3 : dy < 0 ? 4 : 0;
		};
		const out = [];
		for (const a of routes)
			for (let j = 1; j + 1 < a.pts.length; j++)
			{
				const [x, y] = a.pts[j];
				let dot = false;
				for (const b of routes)
				{
					if (b === a || b.src !== a.src) continue;
					if (inside (b, x, y)) { dot = true; break; }
					for (let k = 1; k + 1 < b.pts.length; k++) if (b.pts[k][0] === x && b.pts[k][1] === y && leaves (b, k) !== leaves (a, j)) { dot = true; break; }
					if (dot) break;
				}
				if (dot && !out.some ((p) => p[0] === x && p[1] === y)) out.push ([x, y, a.src]);
			}
		return out;
	}
	// The wire within `tol` cells of a point (in cells) -> { dst, pin } or null
	wireAt (gx, gy, tol = 1 / 3, routes = this.routes ())
	{
		let best = null, bestD = tol;
		for (const r of routes)
			for (let s = 0; s + 1 < r.pts.length; s++)
			{
				const [x0, y0] = r.pts[s], [x1, y1] = r.pts[s + 1];
				let d;
				if (x0 === x1) d = gy < Math.min (y0, y1) ? Math.abs (gx - x0) + Math.min (y0, y1) - gy : gy > Math.max (y0, y1) ? Math.abs (gx - x0) + gy - Math.max (y0, y1) : Math.abs (gx - x0);
				else d = gx < Math.min (x0, x1) ? Math.abs (gy - y0) + Math.min (x0, x1) - gx : gx > Math.max (x0, x1) ? Math.abs (gy - y0) + gx - Math.max (x0, x1) : Math.abs (gy - y0);
				if (d < bestD) { bestD = d; best = { dst: r.dst, pin: r.pin }; }
			}
		return best;
	}
}

// ---- the evaluation -------------------------------------------------------------------------------------------------------------
function gateOut (t, a, b)
{
	switch (t)
	{
	case P_NOT: return a ? 0 : 1;
	case P_AND: return a & b;
	case P_OR: return a | b;
	case P_XOR: return a ^ b;
	case P_NAND: return (a & b) ? 0 : 1;
	case P_NOR: return (a | b) ? 0 : 1;
	}
	return 0;
}
// inputs: the row (switch k = bit ni - 1 - k); step < 0: live, else the gates of depth <= step computed, the others LX
function evaluate (c, inputs, step = -1)
{
	const n = c.n, v = new Array (n).fill (L0), det = new Array (n).fill (true), depth = new Array (n).fill (0), done = new Array (n).fill (false);
	let maxDepth = 0;
	for (let k = 0; k < c.ni; k++) { v[k] = (inputs >> (c.ni - 1 - k)) & 1; done[k] = true; }
	for (let left = n - c.ni; left > 0;)
	{
		const before = left;
		for (let i = c.ni; i < n; i++)
		{
			if (done[i]) continue;
			const np = c.pins (i), q = c.p[i];
			let ready = true;
			for (let k = 0; k < np; k++) if (q.in[k] >= 0 && !done[q.in[k]]) ready = false;
			if (!ready) continue;
			const val = [0, 0]; let d = 0, dt = true, unknown = false;
			for (let k = 0; k < np; k++)
			{
				const s = q.in[k];
				if (s < 0) { dt = false; continue; }
				val[k] = v[s] === L1 ? 1 : 0; dt = dt && det[s]; unknown = unknown || v[s] === LX;
				d = Math.max (d, depth[s]);
			}
			if (q.type === P_LAMP) { depth[i] = d; v[i] = unknown ? LX : val[0]; }
			else
			{
				depth[i] = d + 1; maxDepth = Math.max (maxDepth, d + 1);
				v[i] = (step >= 0 && d + 1 > step) || unknown ? LX : gateOut (q.type, val[0], val[1]);
			}
			det[i] = dt; done[i] = true; left--;
		}
		if (left === before) break;
	}
	return { v, det, depth, maxDepth };
}
const starsFor = (gates, par3, par2, won) => !won ? 0 : gates <= par3 ? 3 : gates <= par2 ? 2 : 1;
function check (c, L)
{
	const r = { err: E.OK, errPart: -1, got: new Array (MAXIO).fill (0), wrong: 0, nwrong: 0, firstWrong: -1, gates: c.gates (), stars: 0, won: false };
	for (let i = c.ni; i < c.ni + c.no; i++) if (c.p[i].in[0] < 0) { r.err = E.LAMP_OPEN; r.errPart = i; return r; }
	for (let i = c.ni + c.no; i < c.n; i++) for (let k = 0; k < c.pins (i); k++) if (c.p[i].in[k] < 0) { r.err = E.GATE_OPEN; r.errPart = i; return r; }
	for (let row = 0; row < (1 << L.ninputs); row++)
	{
		const e = evaluate (c, row);
		let bad = false;
		for (let o = 0; o < c.no; o++)
		{
			const got = e.v[c.ni + o] === L1 ? 1 : 0;
			if (got) r.got[o] |= 1 << row;
			if (got !== ((L.want[o] >> row) & 1)) bad = true;
		}
		if (bad) { r.wrong |= 1 << row; r.nwrong++; if (r.firstWrong < 0) r.firstWrong = row; }
	}
	r.won = r.nwrong === 0;
	r.stars = starsFor (r.gates, L.par3, L.par2, r.won);
	return r;
}

// ---- the circuit text --------------------------------------------------------------------------------------------------------------
function writeText (c)
{
	const out = [];
	for (let i = c.ni + c.no; i < c.n; i++) { const q = c.p[i]; out.push ('part ' + q.name + ' ' + TYPE_NAMES[q.type] + ' ' + q.x + ' ' + q.y); }
	for (let pass = 0; pass < 2; pass++)
		for (let i = pass ? c.ni : c.ni + c.no; i < (pass ? c.ni + c.no : c.n); i++)
			for (let k = 0; k < c.pins (i); k++)
			{
				const s = c.p[i].in[k];
				if (s >= 0) out.push ('wire ' + c.p[s].name + ' ' + c.p[i].name + (pass ? '' : k ? '.2' : '.1'));
			}
	return out.join ('\n');
}
// The text on a board set up for L -> { c } or { err, line }
function readText (L, text)
{
	const t = new Circuit ().setup (L), hasPos = [];
	let err = E.OK, ln = 0;
	const lines = (text || '').replace (/\r/g, '').split ('\n');
	for (let pass = 0; pass < 2 && err === E.OK; pass++)
		for (ln = 0; ln < lines.length && err === E.OK; ln++)
		{
			const w = lines[ln].trim ().split (/[ \t]+/).filter (Boolean);
			if (!w.length || w[0][0] === '#') continue;
			if (w[0] === 'part')
			{
				if (pass) continue;
				if (w.length !== 3 && w.length !== 5) { err = E.SYNTAX; break; }
				const type = typeOf (w[2]);
				if (type < 0) { err = E.TYPE; break; }
				if (!/^[a-z][a-z0-9]{0,7}$/.test (w[1]) || t.find (w[1]) >= 0) { err = E.NAME; break; }
				if (!(L.parts & (1 << type))) { err = E.NOT_ALLOWED; break; }
				if (t.gates () >= MAXGATES) { err = E.FULL; break; }
				let x = 0, y = 0;
				if (w.length === 5)
				{
					if (!/^-?\d+$/.test (w[3]) || !/^-?\d+$/.test (w[4])) { err = E.SYNTAX; break; }
					x = +w[3]; y = +w[4];
					const r = t.placeErr (type, x, y);
					if (r !== E.OK) { err = r; break; }
					hasPos[t.n] = true;
				}
				t.p.push ({ name: w[1], type, x, y, in: [-1, -1] });
			}
			else if (w[0] === 'wire')
			{
				if (!pass) continue;
				if (w.length !== 3) { err = E.SYNTAX; break; }
				const src = t.find (w[1]);
				if (src < 0) { err = w[1].includes ('.') ? E.PIN : E.NAME; break; }
				if (t.p[src].type === P_LAMP) { err = E.PIN; break; }
				let to = w[2], pin = 0;
				const dot = to.indexOf ('.');
				if (dot >= 0) { const pn = to.slice (dot + 1); to = to.slice (0, dot); if (pn === '1') pin = 0; else if (pn === '2') pin = 1; else { err = E.PIN; break; } }
				const dst = t.find (to);
				if (dst < 0) { err = E.NAME; break; }
				if (t.p[dst].type === P_SWITCH || (t.p[dst].type === P_LAMP) === (dot >= 0) || pin >= t.pins (dst)) { err = E.PIN; break; }
				if (t.p[dst].in[pin] >= 0) { err = E.DOUBLE; break; }
				err = t.connect (src, dst, pin);
			}
			else err = E.SYNTAX;
		}
	if (err !== E.OK) return { err, line: ln + 1 };
	// the gates without a place: in columns by their depth
	const ev = evaluate (t, 0), perDepth = {}, seen = {};
	for (let i = t.ni + t.no; i < t.n; i++) if (!hasPos[i]) perDepth[ev.depth[i]] = (perDepth[ev.depth[i]] || 0) + 1;
	for (let i = t.ni + t.no; i < t.n; i++)
	{
		if (hasPos[i]) continue;
		const d = ev.depth[i], k = seen[d] = (seen[d] || 0) + 1, m = perDepth[d];
		let x = GATE_MINX + 1 + 6 * (d - 1), y = Math.floor ((2 * (k - 1) + 1) * BOARD_H / (2 * m)) - 2;
		if (t.placeErr (t.p[i].type, x, y, i) !== E.OK)
		{
			let found = false;
			for (let cx = GATE_MINX; cx + GATE_W <= GATE_MAXX && !found; cx++)
				for (let cy = 0; cy + GATE_H <= BOARD_H && !found; cy++)
					if (t.placeErr (t.p[i].type, cx, cy, i) === E.OK) { x = cx; y = cy; found = true; }
			if (!found) return { err: E.FULL, line: 0 };
		}
		t.p[i].x = x; t.p[i].y = y; hasPos[i] = true;
	}
	return { c: t };
}
function truthTableText (L, r)
{
	const got = r && r.err === E.OK, out = [];
	out.push ([...L.inName, ...L.outName, ...(got ? L.outName.map ((n) => n + "'") : [])].join ('\t'));
	for (let row = 0; row < (1 << L.ninputs); row++)
	{
		const cells = [];
		for (let k = 0; k < L.ninputs; k++) cells.push ((row >> (L.ninputs - 1 - k)) & 1);
		for (let k = 0; k < L.noutputs; k++) cells.push ((L.want[k] >> row) & 1);
		if (got) for (let k = 0; k < L.noutputs; k++) cells.push ((r.got[k] >> row) & 1);
		out.push (cells.join ('\t'));
	}
	return out.join ('\n') + '\n';
}

// ---- undo / redo: the board's texts ------------------------------------------------------------------------------------------------
class History
{
	constructor () { this.s = []; this.cur = 0; }
	start (c) { this.s = [writeText (c)]; this.cur = 0; }
	push (c)
	{
		const t = writeText (c);
		if (this.s.length && this.s[this.cur] === t) return;
		this.s.length = this.cur + 1;
		this.s.push (t);
		if (this.s.length > 65) this.s.shift ();
		this.cur = this.s.length - 1;
	}
	canUndo () { return this.cur > 0; }
	canRedo () { return this.cur + 1 < this.s.length; }
	undo (L) { if (!this.canUndo ()) return null; const r = readText (L, this.s[this.cur - 1]); if (!r.c) return null; this.cur--; return r.c; }
	redo (L) { if (!this.canRedo ()) return null; const r = readText (L, this.s[this.cur + 1]); if (!r.c) return null; this.cur++; return r.c; }
}

// ---- the packs ([pack], then a [level] block a level; "key =" then "| ..." lines: a value on several lines) ------------------------
function parseKv (text)
{
	const blocks = [];
	let cur = null, last = null;
	text.replace (/\r/g, '').split ('\n').forEach ((line, i) =>
	{
		const ln = i + 1;
		if (line[0] === '|' && last)
		{
			const v = line[1] === ' ' ? line.slice (2) : line.slice (1);
			last.value = last.value === '' && !last.multi ? v : last.value + '\n' + v;
			last.multi = true;
			return;
		}
		last = null;
		const s = line.trim ();
		if (!s || s[0] === '#' || s[0] === ';') return;
		if (s[0] === '[') { cur = { name: s.slice (1, s.indexOf (']')), line: ln, entries: [] }; blocks.push (cur); return; }
		const eq = s.indexOf ('=');
		if (eq < 0 || !cur) return;
		last = { key: s.slice (0, eq).trim (), value: s.slice (eq + 1).trim (), line: ln, multi: false };
		cur.entries.push (last);
	});
	return blocks;
}
function parseLevel (b)
{
	const L = { id: '', title: ['', ''], text: ['', ''], hint: ['', ''], topic: '', ninputs: 0, noutputs: 0, inName: [], outName: [], parts: 0, par3: 0, par2: 0, want: [0, 0, 0, 0], solution: null };
	const seen = new Set ();
	let table = null;
	const bad = (ln, m) => { throw new Error ('line ' + ln + ': ' + m); };
	for (const { key: k0, value: v, line } of b.entries)
	{
		let key = k0, lang = 0;
		if (key.endsWith ('.fr')) { key = key.slice (0, -3); lang = 1; if (!['title', 'text', 'hint'].includes (key)) continue; }
		switch (key)
		{
		case 'id': if (!/^[a-z0-9-]{1,23}$/.test (v)) bad (line, "an id is made of a-z, 0-9 and '-' (23 at most)"); L.id = v; seen.add (key); break;
		case 'title': case 'text': L[key][lang] = v; if (!lang) seen.add (key); break;
		case 'hint': L.hint[lang] = v; break;
		case 'concept': L.topic = v; break;
		case 'inputs': case 'outputs':
		{
			const w = v.split (/\s+/).filter (Boolean);
			if (w.length < 1 || w.length > MAXIO) bad (line, w.length + ' ' + key + ', 1 to ' + MAXIO + ' expected');
			for (const x of w) if (!/^[A-Z][A-Za-z0-9]{0,3}$/.test (x)) bad (line, '"' + x + '": a name starts with a capital, 4 letters or digits at most');
			if (key === 'inputs') { L.inName = w; L.ninputs = w.length; } else { L.outName = w; L.noutputs = w.length; }
			seen.add (key); break;
		}
		case 'parts':
			L.parts = 0;
			for (const g of v.split (/\s+/).filter (Boolean)) { const t = typeOf (g); if (t < 0) bad (line, 'unknown part "' + g + '" (NOT AND OR XOR NAND NOR)'); L.parts |= 1 << t; }
			seen.add (key); break;
		case 'par':
		{
			const w = v.split (/\s+/).filter (Boolean);
			if (w.length !== 2 || !/^\d+$/.test (w[0]) || !/^\d+$/.test (w[1]) || +w[1] < +w[0]) bad (line, 'par is two gate counts, for three stars then for two: "par = 3 5"');
			L.par3 = +w[0]; L.par2 = +w[1]; seen.add (key); break;
		}
		case 'table': table = { v, line }; seen.add (key); break;
		case 'solution': L.solution = v; break;
		}
	}
	for (const k of ['id', 'title', 'text', 'inputs', 'outputs', 'parts', 'par', 'table']) if (!seen.has (k)) bad (b.line, 'this level has no "' + k + '"');
	const names = [...L.inName, ...L.outName];
	if (new Set (names).size !== names.length) bad (b.line, 'a name is used twice');
	// the table: a header naming the inputs and outputs, then the rows counting up in binary
	const rowsWanted = 1 << L.ninputs;
	let rows = 0;
	table.v.split ('\n').forEach ((ln, j) =>
	{
		const bar = ln.indexOf ('|');
		const w = bar >= 0 ? ln.slice (0, bar).trim ().split (/\s+/).filter (Boolean) : ln.trim ().split (/\s+/).filter (Boolean);
		const u = bar >= 0 ? ln.slice (bar + 1).trim ().split (/\s+/).filter (Boolean) : [];
		if (j === 0)
		{
			if (bar < 0 || w.join (' ') !== L.inName.join (' ') || u.join (' ') !== L.outName.join (' '))
				bad (table.line, 'the table\'s first line must name the inputs and the outputs, as "| ' + L.inName[0] + ' ... | ' + L.outName[0] + ' ..."');
			return;
		}
		if (!w.length && !u.length && bar < 0) return;
		if (rows === rowsWanted) bad (table.line + j, 'the table has more than ' + rowsWanted + ' rows');
		if (bar < 0 || w.length !== L.ninputs || u.length !== L.noutputs) bad (table.line + j, 'a row has ' + L.ninputs + ' inputs and ' + L.noutputs + ' outputs: "0 1 | 1"');
		if (![...w, ...u].every ((x) => x === '0' || x === '1')) bad (table.line + j, 'a row holds 0 and 1 only');
		if (parseInt (w.join (''), 2) !== rows) bad (table.line + j, 'the rows must count up in binary: row ' + (rows + 1) + ' out of order');
		u.forEach ((x, k) => { if (x === '1') L.want[k] |= 1 << rows; });
		rows++;
	});
	if (rows !== rowsWanted) bad (table.line, 'the table has ' + rows + ' rows, ' + rowsWanted + ' expected');
	return L;
}
function parsePack (text)
{
	const pack = { title: ['', ''], levels: [] };
	for (const b of parseKv (text))
	{
		if (b.name === 'pack') for (const e of b.entries) { if (e.key === 'title') pack.title[0] = e.value; else if (e.key === 'title.fr') pack.title[1] = e.value; }
		else if (b.name === 'level')
		{
			const L = parseLevel (b);
			if (pack.levels.some ((x) => x.id === L.id)) throw new Error ('line ' + b.line + ': the id "' + L.id + '" is used twice');
			pack.levels.push (L);
		}
	}
	if (!pack.levels.length) throw new Error ('no [level] in the pack');
	return pack;
}

const Circuits = {
	P_SWITCH, P_LAMP, P_NOT, P_AND, P_OR, P_XOR, P_NAND, P_NOR, P_COUNT, TYPE_NAMES, L0, L1, LX, E, MAXGATES,
	BOARD_W, BOARD_H, GATE_W, GATE_H, GATE_MINX, GATE_MAXX, SWITCH_W, LAMP_X, LAMP_W,
	typeOf, isGate, Circuit, evaluate, check, starsFor, writeText, readText, truthTableText, History, parsePack };
if (typeof module !== 'undefined' && module.exports) module.exports = Circuits; else global.Circuits = Circuits;
}) (typeof window !== 'undefined' ? window : globalThis);
