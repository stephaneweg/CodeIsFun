// art.js -- ZOOMO!: the look of the cartoon anti-gravity racer for Code is Fun. The six pilots and their hover pods
// (seen from behind, as the chase camera sees them), their portraits, the four track themes (colours, scenery, the
// horizon and the sky), the items (the "?" box, the rocket, the gum, the shield, the turbo) and the comic bursts.
// Everything is drawn with the Canvas 2D API in the house style of Briko Boom! and Drako!: thick ink outlines, flat
// candy colours, a white highlight on top. Every function is pure: it draws around the origin of the context it is
// given, in world units (1 unit = 1 metre, y down), with the ink line width it is passed. No image, no library.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';

const OL = '#2B2340', CREAM = '#FFFDF8', TAU = Math.PI * 2, NO = {};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const RAINBOW = ['#FF5A5F', '#FF9F1C', '#FFD23F', '#3DD68C', '#3FA7FF', '#A66CFF'];

// ---- the pilots ---------------------------------------------------------------------------------------------------
// c1: the pod, c2: its stripe and fins, skin: the head, suit: the shoulders (what shows of the pilot under the head)
const PILOTS = [
	{ id: 'tito', name: ['Tito', 'Tito'], kind: 'turtle', c1: '#2E7BFF', c2: '#FF4B4B', skin: '#7DD35F', suit: '#3E9B45' },
	{ id: 'mimi', name: ['Mimi', 'Mimi'], kind: 'cat', c1: '#9B5CFF', c2: '#FFD23F', skin: '#FF9F43', suit: '#FFD23F' },
	{ id: 'lulu', name: ['Lulu', 'Lulu'], kind: 'bunny', c1: '#FF4FA0', c2: '#FFFFFF', skin: '#FFFFFF', suit: '#FF9CCB' },
	{ id: 'pepin', name: ['Pépin', 'Pépin'], kind: 'pig', c1: '#FFC928', c2: '#25B9F2', skin: '#FFB0C4', suit: '#25B9F2' },
	{ id: 'bruno', name: ['Bruno', 'Bruno'], kind: 'bear', c1: '#F2382E', c2: '#FFE14D', skin: '#A8693A', suit: '#FFE14D' },
	{ id: 'drako', name: ['Drako', 'Drako'], kind: 'dragon', c1: '#16B866', c2: '#FF9F1C', skin: '#52CC4A', suit: '#FFB020' } ];
const DRAGON = { light: '#A8EE7A', belly: '#D8F27A', plate: '#FFB020', horn: '#FFF1C9' };

// ---- small drawing helpers (each takes the context) ----------------------------------------------------------------
function circ (g, x, y, r) { g.beginPath (); g.arc (x, y, Math.max (0, r), 0, TAU); }
function ell (g, x, y, rx, ry, rot) { g.beginPath (); g.ellipse (x, y, Math.max (0, rx), Math.max (0, ry), rot || 0, 0, TAU); }
function rr (g, x, y, w, h, r)
{
	r = Math.max (0, Math.min (r, w / 2, h / 2));
	g.beginPath (); g.moveTo (x + r, y); g.arcTo (x + w, y, x + w, y + h, r); g.arcTo (x + w, y + h, x, y + h, r);
	g.arcTo (x, y + h, x, y, r); g.arcTo (x, y, x + w, y, r); g.closePath ();
}
function poly (g, p)
{
	g.beginPath (); g.moveTo (p[0], p[1]);
	for (let i = 2; i < p.length; i += 2) g.lineTo (p[i], p[i + 1]);
	g.closePath ();
}
function starPath (g, x, y, R, r, n, rot)
{
	g.beginPath ();
	for (let i = 0; i < n * 2; i++) { const a = (rot || 0) - Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; g.lineTo (x + Math.cos (a) * q, y + Math.sin (a) * q); }
	g.closePath ();
}
// fill the current path, then outline it in ink
function inked (g, fill, lw) { if (fill) { g.fillStyle = fill; g.fill (); } g.lineWidth = lw; g.strokeStyle = OL; g.stroke (); }
function stroke (g, col, lw) { g.lineWidth = lw; g.strokeStyle = col; g.stroke (); }
function shine (g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a || 0.45) + ')'; ell (g, x, y, rx, ry, rot); g.fill (); }
// an inked tube along the current path: the ink wider, then the colour
function tube (g, w, col, lw) { stroke (g, OL, w + lw * 2); stroke (g, col, w); }
// several circles merged into one blob with a single outline (trees, clouds, bushes)
function blob (g, cs, fill, lw)
{
	g.beginPath ();
	for (const c of cs) { g.moveTo (c[0] + c[2], c[1]); g.arc (c[0], c[1], c[2], 0, TAU); }
	stroke (g, OL, lw * 2); g.fillStyle = fill; g.fill ();
}
// outlined text at any scale (the font is laid out at 100 px, then scaled: tiny world-unit fonts stay crisp)
function otext (g, txt, x, y, size, fill, lw, maxW)
{
	g.save (); g.translate (x, y);
	let k = size / 100;
	g.font = '900 100px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
	if (maxW) { const w = g.measureText (txt).width * k; if (w > maxW) k *= maxW / w; }
	g.scale (k, k);
	if (lw) { g.lineJoin = 'round'; g.lineWidth = lw * 2 / k; g.strokeStyle = OL; g.strokeText (txt, 0, 4); }
	g.fillStyle = fill; g.fillText (txt, 0, 4);
	g.restore ();
}
// a lighter (k > 0) or darker (k < 0) version of a '#RRGGBB' colour
const shadeCache = new Map ();
function shade (hex, k)
{
	const key = hex + k; let v = shadeCache.get (key);
	if (v) return v;
	const n = parseInt (hex.slice (1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map ((u) => k < 0 ? u * (1 + k) : u + (255 - u) * k);
	v = '#' + ((1 << 24) | (Math.round (c[0]) << 16) | (Math.round (c[1]) << 8) | Math.round (c[2])).toString (16).slice (1);
	shadeCache.set (key, v);
	return v;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash (n) { const s = Math.sin (n * 127.1 + 311.7) * 43758.5453; return s - Math.floor (s); }

// ---- the craft, seen from behind ------------------------------------------------------------------------------
// the anchor is the middle of the pod at its hover height. Width 2.8 (fin tip to fin tip), from the top of the head
// (y -1.0, ears higher) to the bottom of the pod (y +0.46).
function drawShip (g, p, o)
{
	o = o || NO;
	const lw = o.ink || 0.06, t = o.t || 0, spin = clamp (o.spin || 0, 0, 1), drift = clamp (o.drift || 0, -1, 1);
	const lean = clamp ((o.lean || 0) + drift * 0.8, -1, 1), trick = clamp (o.trick || 0, 0, 1), air = !!o.air || trick > 0;
	const thrust = o.thrust == null ? 0.6 : clamp (o.thrust, 0, 1), stuck = !!o.stuck, turbo = !!o.turbo && !stuck, star = !!o.star;
	// the invincibility star: the pod flashes through the rainbow
	const fi = star ? Math.floor (t * 14) : 0, c1 = star ? RAINBOW[fi % 6] : p.c1, c2 = star ? RAINBOW[(fi + 3) % 6] : p.c2;
	g.save ();
	g.lineJoin = 'round'; g.lineCap = 'round';
	if (star) { g.fillStyle = 'rgba(255,225,77,.35)'; ell (g, 0, -0.25, 1.7, 1.25); g.fill (); }
	if (trick > 0)
	{	// the trick: a barrel roll (seen from behind it is a spin in the screen plane) with a little hop and squash
		const e = trick * trick * (3 - 2 * trick);
		g.translate (0, -0.3 - Math.sin (trick * Math.PI) * 0.35); g.rotate (e * TAU * (o.trickDir < 0 ? -1 : 1)); g.translate (0, 0.3);
		const q = 1 - Math.sin (trick * Math.PI * 2) * 0.08; g.scale (q, 2 - q);
	}
	else if (air) g.translate (0, -0.04 + Math.sin (t * 8) * 0.03);
	g.rotate (lean * 0.06 + drift * 0.1);
	if (drift) g.scale (1 - Math.abs (drift) * 0.1, 1);
	// the hover glow under the pod
	g.fillStyle = stuck ? 'rgba(255,122,192,.4)' : turbo ? 'rgba(255,200,80,.45)' : 'rgba(127,230,255,.4)';
	ell (g, 0, 0.5, 0.8, 0.1); g.fill ();
	// the winglets: the one on the inside of the turn rises
	for (const s of [-1, 1])
	{
		const fy = -lean * s * 0.14;
		g.beginPath (); g.moveTo (s * 0.8, -0.22); g.lineTo (s * 1.3, -0.54 + fy); g.quadraticCurveTo (s * 1.46, -0.5 + fy, s * 1.42, -0.36 + fy);
		g.lineTo (s * 1.14, 0.24 + fy * 0.4); g.lineTo (s * 0.8, 0.24); g.closePath ();
		inked (g, c2, lw);
		g.beginPath (); g.moveTo (s * 0.95, -0.12); g.lineTo (s * 1.3, -0.36 + fy); stroke (g, shade (c2, -0.22), lw * 1.1);
		const on = Math.sin (t * 6 + (s > 0 ? 0 : 3)) > 0;
		circ (g, s * 1.35, -0.46 + fy, 0.07); inked (g, on ? (s < 0 ? '#FF5A5F' : '#3DD68C') : '#FFFFFF', lw * 0.8);
	}
	// the glass bubble in front of the pilot (the far side of the cockpit)
	ell (g, 0, -0.42, 0.7, 0.58); g.fillStyle = 'rgba(178,236,255,.62)'; g.fill (); stroke (g, OL, lw);
	g.beginPath (); g.ellipse (0, -0.42, 0.56, 0.45, 0, -2.75, -2.0); stroke (g, 'rgba(255,255,255,.85)', lw * 1.6);
	// the pilot
	const wob = spin ? Math.sin (t * 9) * spin : 0;
	const hx = lean * 0.09 + wob * 0.06, hy = -0.68, ha = lean * 0.16 + wob * 0.22;
	pilotBack (g, p, hx, hy, ha, lw, t, lean);
	if (air) cheerArms (g, p, hx, lw, t, trick);
	// the pod: a darker belly, the body, the racing stripe, the highlight band
	rr (g, -0.84, -0.04, 1.68, 0.5, 0.25); inked (g, shade (c1, -0.32), lw);
	g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect (-0.6, 0.36, 1.2, 0.04);
	rr (g, -1.0, -0.34, 2.0, 0.62, 0.31); g.fillStyle = c1; g.fill ();
	g.fillStyle = c2; g.fillRect (-0.15, -0.34, 0.3, 0.62);
	g.fillStyle = OL; g.fillRect (-0.15 - lw * 0.3, -0.34, lw * 0.6, 0.62); g.fillRect (0.15 - lw * 0.3, -0.34, lw * 0.6, 0.62);
	rr (g, -0.86, -0.28, 1.72, 0.12, 0.06); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill ();
	rr (g, -1.0, -0.34, 2.0, 0.62, 0.31); stroke (g, OL, lw);
	// the antenna and its ball
	const sw = Math.sin (t * 7) * 0.05 - lean * 0.14;
	g.beginPath (); g.moveTo (0.7, -0.32); g.quadraticCurveTo (0.74, -0.72, 0.8 + sw, -1.02); stroke (g, OL, lw * 1.1);
	circ (g, 0.8 + sw, -1.04, 0.085); inked (g, c2 === '#FFFFFF' ? '#FFD23F' : c2, lw * 0.9);
	shine (g, 0.77 + sw, -1.07, 0.03, 0.02, 0, 0.8);
	// the two thrusters: a jet plume streaming back toward the camera (down on screen), the nozzle over it
	for (const s of [-1, 1])
	{
		const x = s * 0.5, y = 0.04, fl = 0.9 + 0.08 * Math.sin (t * 47 + s * 2) + 0.05 * Math.sin (t * 31 + s);
		if (turbo)
		{
			plume (g, x, y, 0.26, 0.95 * fl, '#FF7A1C', lw);
			plume (g, x, y, 0.18, 0.7 * fl, '#FFD23F', 0);
			plume (g, x, y, 0.09, 0.42 * fl, '#FFFFFF', 0);
		}
		else
		{
			const k = stuck ? 0.25 : 0.45 + 0.55 * thrust;
			plume (g, x, y, 0.21, (0.2 + 0.32 * k) * fl, stuck ? 'rgba(184,194,204,.6)' : 'rgba(79,216,255,.55)', 0);
			plume (g, x, y, 0.13, (0.14 + 0.22 * k) * fl, stuck ? 'rgba(255,255,255,.6)' : 'rgba(200,250,255,.8)', 0);
		}
		circ (g, x, y, 0.23); inked (g, '#5B5470', lw);
		circ (g, x, y, 0.23 - lw * 0.5); g.lineWidth = lw * 0.9; g.strokeStyle = '#A9A2C2'; g.stroke ();
		const hot = turbo ? '#FFE14D' : stuck ? '#DDE3EE' : '#7FE6FF';
		circ (g, x, y, 0.15 * (turbo ? 1.05 : 0.9 + 0.1 * fl)); g.fillStyle = hot; g.fill ();
		circ (g, x, y, 0.08); g.fillStyle = '#FFFFFF'; g.fill ();
		g.beginPath (); g.arc (x, y, 0.19, -2.6, -1.7); stroke (g, 'rgba(255,255,255,.75)', lw * 0.8);
	}
	if (stuck) gumStrands (g, lw, t);
	if (drift) dust (g, drift, lw, t);
	if (o.spark >= 1) sparks (g, Math.min (3, Math.floor (o.spark)), lw, t);
	if (star) starSparkles (g, lw, t);
	if (spin > 0.02) dizzy (g, hx, hy - 0.48, lw, t, spin);
	if (o.shield) shieldBubble (g, lw, t);
	g.restore ();
}

// airborne: both arms up, "wheee!" (waving faster during a trick)
function cheerArms (g, p, hx, lw, t, trick)
{
	const arm = p.kind === 'turtle' ? p.skin : p.suit, w = trick > 0 ? 18 : 9;
	for (const s of [-1, 1])
	{
		const wv = Math.sin (t * w + s) * 0.07, x0 = hx * 0.5 + s * 0.3, x1 = hx + s * 0.66 + wv, y1 = -1.12 + Math.abs (wv);
		g.beginPath (); g.moveTo (x0, -0.42); g.quadraticCurveTo (s * 0.62 + hx * 0.5, -0.62, x1, y1); tube (g, 0.13, arm, lw);
		circ (g, x1, y1, 0.1); inked (g, p.skin, lw * 0.9);
	}
}
// drifting: puffs of dust thrown out at the outer rear corner
function dust (g, drift, lw, t)
{
	const s = drift > 0 ? -1 : 1, a = Math.abs (drift);
	for (let i = 0; i < 3; i++)
	{
		const k = (t * 2.6 + i / 3) % 1, r = (0.14 + k * 0.3) * (0.6 + a * 0.6);
		g.globalAlpha = (1 - k) * 0.85;
		circ (g, s * (1.0 + k * 0.7), 0.42 + k * 0.25 - i * 0.03, r); inked (g, '#F2EEF8', lw * 0.5 * (1 - k));
	}
	g.globalAlpha = 1;
}
// the mini-turbo charge: sparks spraying from the rear corners (1 blue, 2 orange, 3 purple-pink)
const SPARK = [null, ['#3FA7FF', '#BFE6FF'], ['#FF9F1C', '#FFE14D'], ['#D65CFF', '#FF8CE0']];
function sparks (g, lv, lw, t)
{
	const c = SPARK[lv], n = 3 + lv;
	for (const s of [-1, 1])
	{
		const x = s * 0.92, y = 0.38;
		circ (g, x, y, 0.14 + lv * 0.03 + Math.sin (t * 40 + s) * 0.03); g.fillStyle = c[1]; g.fill ();
		g.beginPath ();
		for (let i = 0; i < n; i++)
		{
			const h = hash (i * 7.3 + s * 3 + Math.floor (t * 24)), a = Math.PI * (0.5 - s * (0.15 + h * 0.55)), l = (0.25 + h * 0.3) * (0.8 + lv * 0.25);
			g.moveTo (x + Math.cos (a) * 0.1, y + Math.sin (a) * 0.1); g.lineTo (x + Math.cos (a) * l, y + Math.sin (a) * l);
		}
		stroke (g, OL, lw * 2.2); stroke (g, c[0], lw * 1.1);
		starPath (g, x, y, 0.16 + lv * 0.03, 0.06, 4, t * 10); inked (g, '#FFFFFF', lw * 0.6);
	}
}
// the invincibility star: sparkles orbiting the craft
function starSparkles (g, lw, t)
{
	for (let i = 0; i < 5; i++)
	{
		const a = t * 3 + i * TAU / 5, k = (Math.sin (t * 9 + i * 2) + 1) / 2;
		starPath (g, Math.cos (a) * 1.55, -0.3 + Math.sin (a) * 0.95, 0.1 + k * 0.1, 0.04, 4, 0); g.fillStyle = i % 2 ? '#FFFFFF' : '#FFE14D'; g.fill ();
	}
}

// the pilot from behind: shoulders, the head (rotated by ha around hx, hy) and what makes each kind recognisable
function pilotBack (g, p, hx, hy, ha, lw, t, lean)
{
	const R = 0.36, k = p.kind, skin = p.skin, dark = shade (skin, -0.22);
	// what sticks out behind the shoulders
	if (k === 'cat')
	{
		const sw = Math.sin (t * 3) * 0.08 - lean * 0.1;
		g.beginPath (); g.moveTo (-0.36, -0.3); g.bezierCurveTo (-0.7, -0.35, -0.82 + sw, -0.7, -0.66 + sw, -0.95);
		g.quadraticCurveTo (-0.56 + sw, -1.08, -0.48 + sw, -0.98);
		tube (g, 0.15, skin, lw);
		g.beginPath (); g.moveTo (-0.62 + sw, -1.0); g.quadraticCurveTo (-0.56 + sw, -1.08, -0.48 + sw, -0.98); stroke (g, CREAM, 0.15);
	}
	else if (k === 'pig') pigTail (g, 0.3, -0.3, lw, t, skin);
	// the shoulders
	if (k === 'turtle')
	{	// the shell
		ell (g, hx * 0.5, -0.38, 0.48, 0.2); inked (g, p.suit, lw);
		g.beginPath (); g.moveTo (hx * 0.5 - 0.2, -0.56); g.lineTo (hx * 0.5 - 0.14, -0.3); g.moveTo (hx * 0.5 + 0.2, -0.56); g.lineTo (hx * 0.5 + 0.14, -0.3);
		stroke (g, shade (p.suit, -0.3), lw * 0.9);
		ell (g, hx * 0.5, -0.5, 0.3, 0.06); g.fillStyle = 'rgba(255,255,255,.3)'; g.fill ();
	}
	else
	{
		ell (g, hx * 0.5, -0.36, 0.42, 0.16); inked (g, p.suit, lw);
		ell (g, hx * 0.5 - 0.1, -0.45, 0.2, 0.04); g.fillStyle = 'rgba(255,255,255,.4)'; g.fill ();
	}
	if (k === 'dragon') for (const [x, y, s] of [[0, -0.5, 0.13], [0, -0.38, 0.1]])
	{ poly (g, [hx * 0.7 + x - s, y + s * 0.5, hx * 0.7 + x, y - s * 0.9, hx * 0.7 + x + s, y + s * 0.5]); inked (g, DRAGON.plate, lw * 0.9); }
	g.save (); g.translate (hx, hy); g.rotate (ha);
	// behind the head: ears, horns
	if (k === 'cat') for (const s of [-1, 1])
	{
		poly (g, [s * R * 0.2, -R * 0.8, s * R * 0.78, -R * 1.5, s * R * 1.0, -R * 0.3]); inked (g, skin, lw);
		poly (g, [s * R * 0.45, -R * 0.85, s * R * 0.76, -R * 1.3, s * R * 0.85, -R * 0.6]); g.fillStyle = dark; g.fill ();
	}
	else if (k === 'bunny')
	{
		const fl = Math.sin (t * 4) * 0.05;
		for (const s of [-1, 1])
		{
			g.save (); g.translate (s * R * 0.42, -R * 0.75); g.rotate (s * (0.2 + fl) - lean * 0.12);
			ell (g, 0, -R * 0.95, R * 0.27, R * 0.95); inked (g, skin, lw);
			ell (g, s * R * 0.07, -R * 0.95, R * 0.11, R * 0.7); g.fillStyle = '#FFB3D1'; g.fill ();
			g.restore ();
		}
	}
	else if (k === 'bear') for (const s of [-1, 1])
	{
		circ (g, s * R * 0.72, -R * 0.72, R * 0.36); inked (g, skin, lw);
		circ (g, s * R * 0.72, -R * 0.72, R * 0.18); g.fillStyle = dark; g.fill ();
	}
	else if (k === 'pig') for (const s of [-1, 1])
	{	// big floppy ears: up and out, the tips folded down
		g.beginPath (); g.moveTo (s * R * 0.15, -R * 0.85); g.quadraticCurveTo (s * R * 0.7, -R * 1.55, s * R * 1.25, -R * 1.2);
		g.quadraticCurveTo (s * R * 1.15, -R * 0.6, s * R * 0.85, -R * 0.35); g.closePath (); inked (g, skin, lw);
		g.beginPath (); g.moveTo (s * R * 0.78, -R * 1.33); g.quadraticCurveTo (s * R * 1.1, -R * 1.3, s * R * 1.25, -R * 1.2);
		g.quadraticCurveTo (s * R * 1.45, -R * 0.85, s * R * 1.42, -R * 0.62); g.quadraticCurveTo (s * R * 1.05, -R * 0.85, s * R * 0.78, -R * 1.33); g.closePath ();
		inked (g, dark, lw);
	}
	if (k === 'dragon') for (const s of [-1, 1])
	{
		g.beginPath (); g.moveTo (s * R * 0.25, -R * 0.75); g.quadraticCurveTo (s * R * 0.65, -R * 1.45, s * R * 1.15, -R * 1.5);
		g.quadraticCurveTo (s * R * 0.9, -R * 1.1, s * R * 0.75, -R * 0.45); g.closePath (); inked (g, DRAGON.horn, lw);
	}
	if (k === 'dragon')
	{
		for (const a of [-0.4, 0, 0.4])
		{
			const ca = Math.cos (a - Math.PI / 2), sa = Math.sin (a - Math.PI / 2), px = -sa, py = ca, b = R * (a ? 0.2 : 0.26);
			poly (g, [ca * R * 0.8 + px * b, sa * R * 0.8 + py * b, ca * R * (a ? 1.5 : 1.7), sa * R * (a ? 1.5 : 1.7), ca * R * 0.8 - px * b, sa * R * 0.8 - py * b]);
			inked (g, DRAGON.plate, lw * 0.9);
		}
	}
	// the head
	circ (g, 0, 0, R); inked (g, skin, lw);
	if (k === 'turtle')
	{	// the red bandana and its knot, the tails flapping in the wind
		g.save (); circ (g, 0, 0, R); g.clip ();
		g.fillStyle = p.c2; g.fillRect (-R, -R * 0.36, R * 2, R * 0.4);
		g.beginPath (); g.moveTo (-R, -R * 0.36); g.lineTo (R, -R * 0.36); g.moveTo (-R, R * 0.04); g.lineTo (R, R * 0.04); stroke (g, OL, lw * 0.9);
		g.restore ();
		const side = lean > 0.3 ? -1 : 1;
		for (const [dy, ph] of [[-0.45, 0], [0.2, 1.9]])
		{	// the two tails stream out to one side in the wind
			const w = Math.sin (t * 13 + ph) * R * 0.14, w2 = Math.sin (t * 13 + ph - 1.4) * R * 0.22, s = side;
			g.beginPath (); g.moveTo (s * R * 0.05, -R * 0.22); g.quadraticCurveTo (s * R * 0.9, dy * R * 0.5 - R * 0.2 + w, s * R * 1.75, dy * R + w2);
			g.lineTo (s * R * 1.7, dy * R + R * 0.3 + w2); g.quadraticCurveTo (s * R * 0.9, dy * R * 0.5 + R * 0.08 + w, s * R * 0.05, -R * 0.04); g.closePath ();
			inked (g, p.c2, lw);
		}
		circ (g, 0, -R * 0.14, R * 0.19); inked (g, p.c2, lw);
	}
	else if (k === 'cat')
	{
		g.beginPath ();
		for (const x of [-0.3, 0, 0.3]) { g.moveTo (x * R, -R * 0.95); g.lineTo (x * R * 0.85, -R * (x ? 0.55 : 0.45)); }
		stroke (g, dark, R * 0.13);
	}
	else if (k === 'bunny')
	{	// a pink bow between the ears
		poly (g, [0, -R * 0.82, -R * 0.42, -R * 1.08, -R * 0.42, -R * 0.56]); inked (g, '#FF4FA0', lw);
		poly (g, [0, -R * 0.82, R * 0.42, -R * 1.08, R * 0.42, -R * 0.56]); inked (g, '#FF4FA0', lw);
		circ (g, 0, -R * 0.82, R * 0.14); inked (g, '#FF8CC6', lw);
	}

	if (k !== 'turtle') shine (g, -R * 0.38, -R * 0.45, R * 0.24, R * 0.12, -0.7, 0.5);
	else shine (g, -R * 0.42, -R * 0.62, R * 0.16, R * 0.07, -0.6, 0.5);
	g.restore ();
}
// a teardrop jet plume hanging from a nozzle at x, y: half width w, length len
function plume (g, x, y, w, len, col, lw)
{
	g.beginPath (); g.moveTo (x - w, y); g.bezierCurveTo (x - w, y + len * 0.55, x - w * 0.2, y + len * 0.8, x, y + len);
	g.bezierCurveTo (x + w * 0.2, y + len * 0.8, x + w, y + len * 0.55, x + w, y); g.closePath ();
	if (lw) inked (g, col, lw); else { g.fillStyle = col; g.fill (); }
}
function pigTail (g, x, y, lw, t, col)
{
	const sw = Math.sin (t * 5) * 0.03;
	g.beginPath (); g.moveTo (x, y + 0.04);
	for (let i = 1; i <= 14; i++) { const a = i * 0.62, r = 0.03 + i * 0.008; g.lineTo (x + 0.12 + sw + Math.cos (a + 3.6) * r, y - 0.14 - i * 0.004 + Math.sin (a + 3.6) * r); }
	tube (g, 0.06, col, lw * 0.9);
}
function gumStrands (g, lw, t)
{
	for (const [x, len] of [[-0.62, 0.3], [-0.08, 0.42], [0.5, 0.34]])
	{
		const l = len * (0.85 + 0.15 * Math.sin (t * 4 + x * 5));
		g.beginPath (); g.moveTo (x - 0.13, 0.36); g.quadraticCurveTo (x - 0.04, 0.42 + l * 0.5, x - 0.03, 0.4 + l);
		g.arc (x, 0.4 + l, 0.045, Math.PI, 0, true); g.quadraticCurveTo (x + 0.05, 0.42 + l * 0.5, x + 0.15, 0.36); g.closePath ();
		inked (g, '#FF7AC0', lw * 0.9);
	}
	g.beginPath (); g.moveTo (-0.8, 0.33);
	for (let i = 1; i <= 8; i++) g.quadraticCurveTo (-0.8 + (i - 0.5) * 0.2, 0.46 + (i % 2) * 0.05, -0.8 + i * 0.2, 0.33);
	g.lineTo (0.8, 0.26); g.lineTo (-0.8, 0.26); g.closePath (); inked (g, '#FF7AC0', lw * 0.9);
	shine (g, -0.3, 0.33, 0.12, 0.03, 0, 0.6);
}
function dizzy (g, x, y, lw, t, k)
{
	g.globalAlpha = Math.min (1, k * 1.5);
	for (let i = 0; i < 3; i++)
	{
		const a = t * 5 + i * TAU / 3, sx = x + Math.cos (a) * 0.48, sy = y + Math.sin (a) * 0.13;
		starPath (g, sx, sy, 0.13, 0.06, 5, a * 0.5); inked (g, i === 1 ? '#FFFFFF' : '#FFD23F', lw * 0.8);
	}
	g.globalAlpha = 1;
}
function shieldBubble (g, lw, t)
{
	const r = 1.62, y = -0.28;
	circ (g, 0, y, r); g.fillStyle = 'rgba(120,225,255,.2)'; g.fill ();
	stroke (g, 'rgba(70,200,255,.95)', lw * 1.6);
	g.beginPath (); g.arc (0, y, Math.max (0, r - lw * 1.6), 0, TAU); stroke (g, 'rgba(255,255,255,.55)', lw * 0.8);
	g.beginPath (); g.arc (0, y, r * 0.84, -2.7, -1.95); stroke (g, 'rgba(255,255,255,.85)', lw * 1.8);
	g.beginPath (); g.arc (0, y, r * 0.84, -1.75, -1.6); stroke (g, 'rgba(255,255,255,.85)', lw * 1.8);
	const a = t * 1.7;
	starPath (g, Math.cos (a) * r, y + Math.sin (a) * r, 0.16, 0.05, 4, 0); g.fillStyle = '#FFFFFF'; g.fill ();
	starPath (g, Math.cos (a + 2.6) * r, y + Math.sin (a + 2.6) * r, 0.11, 0.04, 4, 0); g.fill ();
}

// ---- the portraits (front, for the HUD and the menus): r is the radius, ink the line width (default r * 0.07) ----
function drawFace (g, p, r, mood, ink)
{
	const lw = ink || r * 0.07, R = r * 0.74, k = p.kind, skin = p.skin, dark = shade (skin, -0.22);
	const win = mood === 'win', ouch = mood === 'ouch';
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	g.translate (0, r * 0.18);
	if (ouch) g.rotate (-0.08);
	// behind the head
	if (k === 'cat') for (const s of [-1, 1])
	{
		poly (g, [s * R * 0.18, -R * 0.82, s * R * 0.78, -R * 1.42, s * R * 0.98, -R * 0.3]); inked (g, skin, lw);
		poly (g, [s * R * 0.42, -R * 0.78, s * R * 0.74, -R * 1.16, s * R * 0.82, -R * 0.52]); g.fillStyle = '#FFB3D1'; g.fill ();
	}
	else if (k === 'bunny') for (const s of [-1, 1])
	{
		g.save (); g.translate (s * R * 0.4, -R * 0.75); g.rotate (s * (ouch ? 0.7 : 0.25));
		ell (g, 0, -R * 0.62, R * 0.24, R * 0.66); inked (g, skin, lw);
		ell (g, 0, -R * 0.6, R * 0.12, R * 0.48); g.fillStyle = '#FFB3D1'; g.fill ();
		g.restore ();
	}
	else if (k === 'bear') for (const s of [-1, 1])
	{
		circ (g, s * R * 0.74, -R * 0.72, R * 0.34); inked (g, skin, lw);
		circ (g, s * R * 0.74, -R * 0.72, R * 0.18); g.fillStyle = '#E8B07A'; g.fill ();
	}
	else if (k === 'pig') for (const s of [-1, 1])
	{
		g.beginPath (); g.moveTo (s * R * 0.25, -R * 0.85); g.quadraticCurveTo (s * R * 1.05, -R * 1.25, s * R * 1.12, -R * 0.42);
		g.quadraticCurveTo (s * R * 0.8, -R * 0.55, s * R * 0.7, -R * 0.35); g.closePath (); inked (g, dark, lw);
	}
	else if (k === 'dragon')
	{
		for (const s of [-1, 1])
		{
			g.beginPath (); g.moveTo (s * R * 0.3, -R * 0.75); g.quadraticCurveTo (s * R * 0.7, -R * 1.35, s * R * 1.1, -R * 1.3);
			g.quadraticCurveTo (s * R * 0.9, -R * 1.0, s * R * 0.78, -R * 0.45); g.closePath (); inked (g, DRAGON.horn, lw);
		}
		for (const [x, s] of [[-0.3, 0.2], [0, 0.26], [0.3, 0.2]])
		{ poly (g, [x * R - R * s, -R * 0.85, x * R, -R * 0.98 - R * s * 1.3, x * R + R * s, -R * 0.85]); inked (g, DRAGON.plate, lw); }
	}
	// the head
	if (k === 'turtle') { ell (g, 0, 0, R * 1.02, R * 0.95); inked (g, skin, lw); }
	else { circ (g, 0, 0, R); inked (g, skin, lw); }
	if (k !== 'turtle') shine (g, -R * 0.4, -R * 0.58, R * 0.26, R * 0.12, -0.5, 0.5);
	// what is on the face
	const ey = k === 'turtle' ? -R * 0.02 : -R * 0.08, ex = R * 0.36;
	let my = R * 0.42;
	if (k === 'turtle')
	{	// the bandana across the forehead, its tails on the side
		g.save (); ell (g, 0, 0, R * 1.02, R * 0.95); g.clip ();
		g.fillStyle = p.c2; g.fillRect (-R * 1.1, -R * 0.66, R * 2.2, R * 0.36);
		g.beginPath (); g.moveTo (-R * 1.1, -R * 0.66); g.lineTo (R * 1.1, -R * 0.66); g.moveTo (-R * 1.1, -R * 0.3); g.lineTo (R * 1.1, -R * 0.3); stroke (g, OL, lw);
		g.restore ();
		g.beginPath (); g.moveTo (R * 0.92, -R * 0.55); g.quadraticCurveTo (R * 1.2, -R * 0.75, R * 1.42, -R * 0.62); g.lineTo (R * 1.32, -R * 0.38);
		g.quadraticCurveTo (R * 1.15, -R * 0.4, R * 0.95, -R * 0.38); g.closePath (); inked (g, p.c2, lw);
		g.beginPath (); g.moveTo (R * 0.92, -R * 0.45); g.quadraticCurveTo (R * 1.2, -R * 0.2, R * 1.3, R * 0.02); g.lineTo (R * 1.1, R * 0.1);
		g.quadraticCurveTo (R * 1.0, -R * 0.15, R * 0.9, -R * 0.35); g.closePath (); inked (g, p.c2, lw);
		shine (g, -R * 0.5, -R * 0.56, R * 0.2, R * 0.06, -0.2, 0.5);
	}
	else if (k === 'cat')
	{
		g.beginPath (); for (const x of [-0.22, 0, 0.22]) { g.moveTo (x * R, -R * 0.98); g.lineTo (x * R * 0.85, -R * (x ? 0.66 : 0.58)); }
		stroke (g, dark, R * 0.1);
		ell (g, 0, R * 0.34, R * 0.42, R * 0.26); g.fillStyle = CREAM; g.fill ();
	}
	else if (k === 'bear') { ell (g, 0, R * 0.38, R * 0.42, R * 0.32); inked (g, '#E8B07A', lw); }
	else if (k === 'dragon') { ell (g, 0, R * 0.4, R * 0.5, R * 0.34); inked (g, DRAGON.belly, lw); }
	else if (k === 'bunny') { ell (g, 0, R * 0.36, R * 0.38, R * 0.24); g.fillStyle = '#FFF0F6'; g.fill (); }
	// the eyes
	for (const s of [-1, 1])
	{
		const x = s * ex;
		if (win)
		{
			g.beginPath (); g.arc (x, ey + R * 0.08, R * 0.17, Math.PI * 1.1, Math.PI * 1.9); stroke (g, OL, lw * 1.5);
		}
		else if (ouch)
		{
			g.beginPath (); g.moveTo (x + s * R * 0.16, ey - R * 0.14); g.lineTo (x - s * R * 0.12, ey); g.lineTo (x + s * R * 0.16, ey + R * 0.14);
			stroke (g, OL, lw * 1.5);
		}
		else
		{
			ell (g, x, ey, R * 0.2, R * 0.25); inked (g, '#FFFFFF', lw * 0.9);
			circ (g, x + s * -R * 0.04, ey + R * 0.04, R * 0.13); g.fillStyle = OL; g.fill ();
			circ (g, x + s * -R * 0.04 - R * 0.05, ey - R * 0.03, R * 0.05); g.fillStyle = '#FFFFFF'; g.fill ();
		}
	}
	// the cheeks
	g.fillStyle = 'rgba(255,90,140,.38)'; for (const s of [-1, 1]) { ell (g, s * R * 0.62, R * 0.24, R * 0.14, R * 0.09); g.fill (); }
	// the nose
	if (k === 'pig')
	{
		ell (g, 0, R * 0.3, R * 0.34, R * 0.23); inked (g, shade (skin, -0.12), lw);
		g.fillStyle = shade (skin, -0.5); for (const s of [-1, 1]) { ell (g, s * R * 0.12, R * 0.3, R * 0.06, R * 0.1); g.fill (); }
		shine (g, -R * 0.12, R * 0.17, R * 0.12, R * 0.04, 0, 0.5);
		my = R * 0.66;
	}
	else if (k === 'bear') { ell (g, 0, R * 0.24, R * 0.15, R * 0.1); inked (g, OL, lw * 0.6); shine (g, -R * 0.04, R * 0.2, R * 0.05, R * 0.025, 0, 0.6); my = R * 0.5; }
	else if (k === 'dragon') { g.fillStyle = OL; for (const s of [-1, 1]) { ell (g, s * R * 0.15, R * 0.26, R * 0.05, R * 0.04); g.fill (); } my = R * 0.5; }
	else if (k === 'cat' || k === 'bunny')
	{
		poly (g, [-R * 0.09, R * 0.2, R * 0.09, R * 0.2, 0, R * 0.3]); inked (g, '#FF7AA8', lw * 0.7);
		my = R * 0.36;
		g.beginPath ();
		if (k === 'cat') for (const s of [-1, 1]) for (const d of [-0.1, 0.06]) { g.moveTo (s * R * 0.48, R * 0.3 + d * R * 0.6); g.lineTo (s * R * 1.08, R * 0.24 + d * R * 2); }
		stroke (g, OL, lw * 0.6);
	}
	// the mouth
	if (win)
	{
		g.beginPath (); g.moveTo (-R * 0.3, my - R * 0.04); g.quadraticCurveTo (0, my + R * 0.06, R * 0.3, my - R * 0.04);
		g.quadraticCurveTo (R * 0.22, my + R * 0.4, 0, my + R * 0.4); g.quadraticCurveTo (-R * 0.22, my + R * 0.4, -R * 0.3, my - R * 0.04); g.closePath ();
		inked (g, '#B8263A', lw);
		g.save (); g.clip (); ell (g, 0, my + R * 0.38, R * 0.18, R * 0.12); g.fillStyle = '#FF7A9A'; g.fill (); g.restore ();
		if (k === 'bunny') { rr (g, -R * 0.11, my - R * 0.02, R * 0.22, R * 0.14, R * 0.03); inked (g, '#FFFFFF', lw * 0.7); }
	}
	else if (ouch)
	{
		g.beginPath (); g.moveTo (-R * 0.24, my + R * 0.1);
		for (let i = 1; i <= 4; i++) g.lineTo (-R * 0.24 + i * R * 0.12, my + R * (i % 2 ? 0.02 : 0.1));
		stroke (g, OL, lw * 1.2);
		// a sweat drop and a bump
		g.beginPath (); g.moveTo (R * 0.86, -R * 0.62); g.quadraticCurveTo (R * 1.04, -R * 0.36, R * 0.9, -R * 0.28); g.quadraticCurveTo (R * 0.72, -R * 0.3, R * 0.86, -R * 0.62);
		inked (g, '#7AD3FF', lw * 0.8);
		starPath (g, -R * 0.78, -R * 0.84, R * 0.2, R * 0.09, 5, 0.3); inked (g, '#FFD23F', lw * 0.8);
	}
	else
	{
		g.beginPath ();
		if (k === 'cat') { g.arc (-R * 0.09, my + R * 0.02, R * 0.09, 0.2, Math.PI - 0.2); g.moveTo (R * 0.18, my + R * 0.04); g.arc (R * 0.09, my + R * 0.02, R * 0.09, 0.2, Math.PI - 0.2); }
		else g.arc (0, my - R * 0.08, R * 0.2, 0.35, Math.PI - 0.35);
		stroke (g, OL, lw * 1.1);
		if (k === 'bunny') { rr (g, -R * 0.08, my + R * 0.1, R * 0.16, R * 0.12, R * 0.02); inked (g, '#FFFFFF', lw * 0.7); g.beginPath (); g.moveTo (0, my + R * 0.1); g.lineTo (0, my + R * 0.22); stroke (g, OL, lw * 0.5); }
	}
	if (win)
	{	// sparkles
		for (const [x, y, s] of [[-1.05, -0.95, 0.2], [1.1, -0.7, 0.15], [1.0, 0.75, 0.12]])
		{ starPath (g, x * R, y * R, s * R, s * R * 0.35, 4, 0); inked (g, '#FFE14D', lw * 0.7); }
	}
	g.restore ();
}

// ---- the track themes --------------------------------------------------------------------------------------------
const THEMES = [
	{ id: 'candy', name: ['Candy Hills', 'Collines Bonbons'],
		skyTop: '#4FB8FF', skyBot: '#C8F0FF', ground: '#6CCB4C', groundFar: '#9FE07A', hills: '#58BE4E', hills2: '#B9E6A6',
		sun: true, night: false, track1: '#9A86E8', track2: '#8E79DE', line: '#FFFFFF', rumbleA: '#FF4FA0', rumbleB: '#FFFFFF',
		wall: '#FF8CC6', wallTop: '#FFFFFF', skirt: '#D45594', pillar: '#FFE1F0', tunnel1: '#FF6FB5', tunnel2: '#FFF3F9',
		arch: ['#FF5A5F', '#FF9F1C', '#FFD23F', '#3DD68C', '#3FA7FF'],
		deco: [['tree', 3], ['lollipop', 3], ['candycane', 2], ['bush', 2], ['cloud', 1]], fog: '#E2F5FF', cloud: '#FFFFFF',
		ramp1: '#FFD23F', ramp2: '#2B2340', edge: '#FFE14D', void: '#7FD0FF' },
	{ id: 'beach', name: ['Sunny Beach', 'Plage Soleil'],
		skyTop: '#2FAEF5', skyBot: '#BDF0FF', ground: '#1FC2CF', groundFar: '#86E4EA', hills: '#3FB06A', hills2: '#A8DDE6',
		sun: true, night: false, track1: '#F6C27A', track2: '#EEB46A', line: '#FFFFFF', rumbleA: '#FF5A5F', rumbleB: '#FFFFFF',
		wall: '#FFD23F', wallTop: '#FFFFFF', skirt: '#C9803E', pillar: '#E9D3A8', tunnel1: '#2E9BFF', tunnel2: '#FFFFFF',
		arch: ['#FF5A5F', '#FF9F1C', '#FFE14D', '#2FD9A0', '#2E9BFF'],
		deco: [['palm', 5], ['umbrella', 2], ['rock', 2], ['boat', 2], ['cloud', 1]], fog: '#D6F6FF', cloud: '#FFFFFF',
		ramp1: '#2E9BFF', ramp2: '#FFFFFF', edge: '#2E9BFF', void: '#1FC2CF' },
	{ id: 'lava', name: ['Lava Canyon', 'Canyon de Lave'],
		skyTop: '#3D2370', skyBot: '#FF8A55', ground: '#3B2236', groundFar: '#6A2E48', hills: '#2A1530', hills2: '#7A3A6A',
		sun: true, night: false, track1: '#8C82A6', track2: '#80769B', line: '#FFD23F', rumbleA: '#FFD23F', rumbleB: '#2B2340',
		wall: '#FF6A2B', wallTop: '#FFD23F', skirt: '#4A3550', pillar: '#5E4A6E', tunnel1: '#FF7A2B', tunnel2: '#3B2A4A',
		arch: ['#FF3D3D', '#FF7A1C', '#FFB020', '#FFE14D', '#FFF3B0'],
		deco: [['rockspire', 4], ['crystal', 3], ['volcano', 1], ['lavafall', 1]], fog: '#D8708A', cloud: '#FFC2CF',
		ramp1: '#FFD23F', ramp2: '#2B2340', edge: '#FF3D3D', void: '#FF6A2B' },
	{ id: 'space', name: ['Star Loop', 'Boucle des Étoiles'],
		skyTop: '#090A2A', skyBot: '#3B1F78', ground: '#1B1446', groundFar: '#3A2780', hills: '#24185A', hills2: '#4A3296',
		sun: false, night: true, track1: '#3E3592', track2: '#362D85', line: '#46F0FF', rumbleA: '#FF3DD8', rumbleB: '#46F0FF',
		wall: '#46F0FF', wallTop: '#FFFFFF', skirt: '#1E1650', pillar: '#4A3FA0', tunnel1: '#FF3DD8', tunnel2: '#2A1F70',
		arch: ['#FF3DD8', '#B85CFF', '#46F0FF', '#3DFFA0', '#FFE14D'],
		deco: [['asteroid', 4], ['planet', 1], ['satellite', 2], ['crystal', 2]], fog: '#4E2E96', cloud: '#8F7FD6',
		ramp1: '#3DFFA0', ramp2: '#2A1F70', edge: '#FFE14D', void: '#090A2A' } ];
const themeOf = (th) => typeof th === 'string' ? THEMES.find ((x) => x.id === th) || THEMES[0] : th || THEMES[0];

// ---- the scenery ---------------------------------------------------------------------------------------------------
// h: height in units (w: width), float: hangs in the air (anchor = its centre) instead of standing on the ground
const DECO_INFO = {
	lollipop: { h: 13, w: 7, float: false }, candycane: { h: 12.5, w: 6, float: false }, tree: { h: 15, w: 10, float: false },
	cloud: { h: 6, w: 13, float: true }, bush: { h: 4, w: 7, float: false }, palm: { h: 16, w: 12, float: false },
	umbrella: { h: 7.5, w: 7, float: false }, rock: { h: 4.5, w: 7, float: false }, boat: { h: 11, w: 8, float: false },
	volcano: { h: 30, w: 34, float: false }, rockspire: { h: 18, w: 7, float: false }, crystal: { h: 9, w: 7, float: false },
	lavafall: { h: 16, w: 11, float: false }, planet: { h: 11, w: 20, float: true }, asteroid: { h: 5, w: 5, float: true },
	satellite: { h: 5, w: 11, float: true } };
const POPS = ['#FF4FA0', '#FF9F1C', '#3FA7FF', '#A66CFF', '#3DD68C'];
function drawDeco (g, kind, o)
{
	o = o || NO;
	const lw = o.ink || 0.25, t = o.t || 0, seed = o.seed == null ? 0.5 : o.seed;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	const f = DECO[kind];
	if (f) f (g, lw, t, seed, o.tint);
	g.restore ();
}
// a little sand island with a ring of foam (beach things stand in the sea)
function islet (g, r, lw, t, seed)
{
	const fo = 1 + Math.sin (t * 2 + seed * 5) * 0.05;
	ell (g, 0, 0.1, r * 1.12 * fo, r * 0.3 * fo); inked (g, '#FFFFFF', lw);
	ell (g, 0, 0, r, r * 0.24); inked (g, '#F7D98E', lw);
	ell (g, -r * 0.3, -r * 0.06, r * 0.35, r * 0.06); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill ();
}
const DECO = {
	lollipop (g, lw, t, seed)
	{
		const c = POPS[Math.floor (seed * 5) % 5], c2 = POPS[(Math.floor (seed * 5) + 2) % 5];
		g.beginPath (); g.moveTo (0, 0); g.lineTo (0, -9); tube (g, 0.55, '#FFFFFF', lw);
		circ (g, 0, -10, 3.2); g.fillStyle = c; g.fill ();
		g.beginPath ();
		for (let i = 0; i <= 44; i++) { const a = i * 0.45 + seed * 6, r = 2.95 * i / 44; g.lineTo (Math.cos (a) * r, -10 + Math.sin (a) * r); }
		stroke (g, '#FFFFFF', 0.5);
		circ (g, 0, -10, 3.2); stroke (g, OL, lw);
		shine (g, -1.2, -11.6, 1.1, 0.5, -0.6, 0.55);
		poly (g, [0, -6.8, -1.3, -7.6, -1.3, -6.0]); inked (g, c2, lw * 0.8);
		poly (g, [0, -6.8, 1.3, -7.6, 1.3, -6.0]); inked (g, c2, lw * 0.8);
	},
	candycane (g, lw, t, seed)
	{
		if (seed > 0.5) g.scale (-1, 1);
		g.beginPath (); g.moveTo (0, 0); g.lineTo (0, -9.6); g.arc (2.2, -9.6, 2.2, Math.PI, TAU); g.lineTo (4.4, -7.8);
		tube (g, 1.35, '#FFFFFF', lw);
		g.setLineDash ([0.75, 0.75]); g.lineCap = 'butt'; stroke (g, seed < 0.25 || seed > 0.75 ? '#FF3D5A' : '#3DD68C', 1.35); g.setLineDash ([]); g.lineCap = 'round';
		g.beginPath (); g.moveTo (-0.32, -1); g.lineTo (-0.32, -9.4); stroke (g, 'rgba(255,255,255,.55)', 0.28);
	},
	tree (g, lw, t, seed)
	{
		const s = 0.85 + seed * 0.35; g.scale (s, s); lw /= s;
		const pink = seed < 0.3, c = pink ? '#FF8CC6' : seed > 0.7 ? '#7ED957' : '#4CC85A';
		rr (g, -0.65, -6, 1.3, 6, 0.4); inked (g, '#A0612F', lw);
		const cs = [[0, -10, 3.6], [-2.6, -8, 2.6], [2.6, -8.2, 2.7], [0, -7, 2.8], [-1.4, -12.3, 2.3], [1.6, -12, 2.3]];
		blob (g, cs, c, lw);
		shine (g, -1.6, -12.8, 1.4, 0.7, -0.5, 0.45);
		shine (g, -3.0, -8.9, 0.8, 0.45, -0.6, 0.35);
		g.fillStyle = pink ? '#FFFFFF' : '#FF5A5F';
		for (const [x, y] of [[1.8, -9.6], [-1.2, -9.2], [0.6, -12.4], [2.8, -7.2], [-2.6, -6.9]]) { circ (g, x, y, 0.42); g.fill (); stroke (g, OL, lw * 0.6); }
	},
	cloud (g, lw, t, seed, tint)
	{
		const s = 0.8 + seed * 0.4; g.scale (s, s); lw /= s;
		g.translate (Math.sin (t * 0.5 + seed * 9) * 0.3, 0);
		const cs = [[-4.2, 0.8, 2.2], [-1.6, -0.6, 3.1], [1.8, -0.3, 2.7], [4.3, 0.9, 1.9], [0, 1.3, 2.3]];
		blob (g, cs, tint || '#FFFFFF', lw);
		g.save (); g.beginPath (); for (const c of cs) { g.moveTo (c[0] + c[2], c[1]); g.arc (c[0], c[1], c[2], 0, TAU); } g.clip ();
		ell (g, 0, 3.7, 7, 1.6); g.fillStyle = tint && tint !== '#FFFFFF' ? 'rgba(120,60,120,.3)' : 'rgba(160,205,255,.45)'; g.fill ();
		g.restore ();
		shine (g, -2.2, -2.2, 1.0, 0.4, -0.4, 0.9);
	},
	bush (g, lw, t, seed)
	{
		const c = seed < 0.5 ? '#46B84A' : '#5CC95A';
		blob (g, [[-1.8, -1.3, 1.5], [0, -2.1, 1.9], [1.9, -1.3, 1.5], [0, -0.9, 1.6]], c, lw);
		shine (g, -0.7, -3.1, 0.8, 0.35, -0.4, 0.45);
		const fc = seed < 0.5 ? '#FF8CC6' : '#FFE14D';
		for (const [x, y] of [[-1.7, -1.8], [0.5, -2.8], [1.9, -1.4], [-0.4, -1.2]]) { circ (g, x, y, 0.38); inked (g, fc, lw * 0.6); }
	},
	palm (g, lw, t, seed)
	{
		islet (g, 4.6, lw, t, seed);
		const lean = (seed - 0.5) * 7, top = -13.5;
		const sw = Math.sin (t * 1.2 + seed * 7) * 0.06;
		// the trunk: stacked rings along a curve
		for (let i = 0; i < 9; i++)
		{
			const a = i / 9, b = (i + 1) / 9;
			const xa = lean * a * a, ya = top * a, xb = lean * b * b, yb = top * b, wa = 0.75 - a * 0.25, wb = 0.75 - b * 0.25;
			poly (g, [xa - wa, ya + 0.1, xb - wb * 1.15, yb, xb + wb * 1.15, yb, xa + wa, ya + 0.1]); inked (g, i % 2 ? '#C98A4B' : '#B57638', lw);
		}
		g.translate (lean, top); g.rotate (sw);
		for (const [s, e, L] of [[1, -0.25, 5.8], [-1, -0.2, 5.6], [1, 0.45, 5.2], [-1, 0.5, 5.4], [1, 1.15, 4.2], [-1, 1.1, 4]])
		{
			g.save (); g.scale (s, 1); g.rotate (-e);
			g.beginPath (); g.moveTo (0, 0); g.quadraticCurveTo (L * 0.5, -1.7, L, 1.2); g.quadraticCurveTo (L * 0.55, 0.4, 0, 0.5); g.closePath ();
			inked (g, s > 0 ? '#3DBE5A' : '#32A84E', lw);
			g.beginPath (); g.moveTo (0.4, 0.15); g.quadraticCurveTo (L * 0.5, -0.65, L * 0.92, 1.0); stroke (g, '#22863A', lw * 0.7);
			g.restore ();
		}
		for (const [x, y] of [[-0.55, 0.55], [0.5, 0.6], [0, 0.95]]) { circ (g, x, y, 0.55); inked (g, '#8A5A2B', lw); }
		shine (g, -0.7, 0.4, 0.2, 0.12, 0, 0.6);
	},
	umbrella (g, lw, t, seed)
	{
		const c = POPS[Math.floor (seed * 5) % 5];
		islet (g, 4, lw, t, seed);
		rr (g, -2.6, -0.35, 5.2, 0.35, 0.1); inked (g, seed < 0.5 ? '#3FA7FF' : '#FFD23F', lw * 0.8);
		g.save (); g.rotate (-0.12);
		g.beginPath (); g.moveTo (0, 0); g.lineTo (0, -6); tube (g, 0.22, '#FFFFFF', lw);
		const canopy = () => { g.beginPath (); g.moveTo (-3.4, -5.4); g.quadraticCurveTo (0, -9.4, 3.4, -5.4); for (let i = 3; i >= 0; i--) g.quadraticCurveTo (-3.4 + (i + 0.5) * 1.7, -5.0, -3.4 + i * 1.7, -5.4); g.closePath (); };
		canopy (); g.fillStyle = '#FFFFFF'; g.fill ();
		g.save (); g.clip (); g.fillStyle = c;
		for (let i = 0; i < 4; i += 2) { g.beginPath (); g.moveTo (0, -7.6); g.lineTo (-3.4 + i * 1.7, -5.2); g.lineTo (-3.4 + (i + 1) * 1.7, -5.2); g.closePath (); g.fill (); }
		g.restore ();
		canopy (); stroke (g, OL, lw);
		shine (g, -1.2, -6.9, 0.9, 0.3, -0.4, 0.5);
		circ (g, 0, -7.6, 0.3); inked (g, c, lw * 0.7);
		g.restore ();
	},
	rock (g, lw, t, seed)
	{
		const fo = 1 + Math.sin (t * 2 + seed * 5) * 0.06;
		ell (g, 0, 0, 3.6 * fo, 0.75 * fo); inked (g, '#FFFFFF', lw);
		const pts = [];
		for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8, r = 2.6 + hash (seed * 10 + i) * 0.9; pts.push (Math.cos (a) * r * 1.1, Math.sin (a) * r * 1.3); }
		poly (g, pts); inked (g, '#9C8FA8', lw);
		poly (g, [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6] * 0.4, pts[7] * 0.4, 0, 0]); g.fillStyle = '#B8ADC4'; g.fill ();
		shine (g, -1.2, -2.4, 0.8, 0.35, -0.3, 0.45);
		ell (g, 0, 0, 3.0, 0.4); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill ();
	},
	boat (g, lw, t, seed)
	{
		const b = Math.sin (t * 2 + seed * 6) * 0.25, c = POPS[Math.floor (seed * 5) % 5];
		ell (g, 0, 0, 4.4, 0.7); inked (g, 'rgba(255,255,255,.9)', lw);
		g.save (); g.translate (0, b); g.rotate (Math.sin (t * 1.6 + seed * 6) * 0.05);
		g.beginPath (); g.moveTo (0.3, -1.8); g.lineTo (0.3, -10.4); tube (g, 0.25, '#8A5A2B', lw);
		poly (g, [0.3, -10.6, 2, -10.1, 0.3, -9.6]); inked (g, '#FF5A5F', lw * 0.8);
		g.beginPath (); g.moveTo (0.7, -9.6); g.quadraticCurveTo (3.6, -6.4, 3.6, -2.4); g.lineTo (0.7, -2.4); g.closePath (); inked (g, '#FFFFFF', lw);
		g.beginPath (); g.moveTo (-0.1, -8.6); g.quadraticCurveTo (-2.6, -5.4, -2.9, -2.4); g.lineTo (-0.1, -2.4); g.closePath (); inked (g, c, lw);
		g.beginPath (); g.moveTo (-4, -2); g.lineTo (4.2, -2); g.lineTo (3, 0); g.quadraticCurveTo (0, 0.5, -3, 0); g.closePath (); inked (g, '#FF5A5F', lw);
		g.fillStyle = '#FFFFFF'; g.fillRect (-3.6, -1.45, 7.4, 0.42);
		for (const x of [-2, 0, 2]) { circ (g, x, -0.7, 0.25); inked (g, '#BFF4FF', lw * 0.6); }
		g.restore ();
	},
	volcano (g, lw, t, seed)
	{
		// smoke puffs rising
		for (let i = 0; i < 3; i++)
		{
			const k = (t * 0.25 + i / 3 + seed) % 1, r = 1.8 + k * 3;
			g.globalAlpha = 0.85 * (1 - k); circ (g, Math.sin (k * 5 + i) * 2, -24 - k * 12, r); inked (g, '#9A8AA8', lw); g.globalAlpha = 1;
		}
		poly (g, [-17, 0, -4.5, -22.5, 4.5, -22.5, 17, 0]); inked (g, '#5A3550', lw);
		poly (g, [-17, 0, -4.5, -22.5, -1.5, -22.5, -7, 0]); g.fillStyle = '#6E4466'; g.fill ();
		g.beginPath (); g.moveTo (-17, 0); g.lineTo (-4.5, -22.5); g.lineTo (4.5, -22.5); g.lineTo (17, 0); stroke (g, OL, lw);
		// the glowing crater and the lava running down
		ell (g, 0, -22.5, 4.6, 1.2); inked (g, '#FF6A2B', lw);
		ell (g, 0, -22.7, 3, 0.6); g.fillStyle = '#FFE14D'; g.fill ();
		for (const pts of [[-1.5, -22, -3, -16, -1, -11, -4, -5], [2, -22, 3.5, -17, 2, -13]])
		{
			g.beginPath (); g.moveTo (pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo (pts[i], pts[i + 1]);
			tube (g, 1.1, '#FF7A1C', lw); stroke (g, '#FFD23F', 0.4);
		}
	},
	rockspire (g, lw, t, seed)
	{
		if (seed > 0.5) g.scale (-1, 1);
		const s = 0.8 + seed * 0.4; g.scale (s, s); lw /= s;
		const pts = [-3.2, 0, -2.6, -6, -1.6, -9.5, -2, -13, -0.6, -18, 0.9, -14, 1.5, -10, 2.3, -6.5, 3.3, 0];
		poly (g, pts); inked (g, '#4A3550', lw);
		poly (g, [-3.2, 0, -2.6, -6, -1.6, -9.5, -2, -13, -0.6, -18, -0.3, -12, -0.8, -6, -1, 0]); g.fillStyle = '#6B4F72'; g.fill ();
		poly (g, pts); stroke (g, OL, lw);
		g.beginPath (); g.moveTo (0.6, -12); g.lineTo (1.2, -9); g.lineTo (0.4, -7); g.lineTo (1.4, -4); g.lineTo (0.8, -1.5);
		tube (g, 0.35 + 0.08 * Math.sin (t * 3 + seed * 9), '#FF7A1C', lw * 0.7);
		shine (g, -1.7, -11, 0.25, 1.4, 0.1, 0.25);
	},
	crystal (g, lw, t, seed)
	{
		const sets = [['#B58CFF', '#D8C2FF'], ['#FF7AC0', '#FFC2E0'], ['#46F0FF', '#BFFAFF']], c = sets[Math.floor (seed * 3) % 3];
		for (const [x, h, w, a] of [[-1.9, 5, 0.9, -0.38], [1.8, 6, 1.0, 0.32], [0, 8.4, 1.3, 0.04]])
		{
			g.save (); g.translate (x, 0.3); g.rotate (a);
			poly (g, [-w, 0, -w, -h, 0, -h - w * 1.4, w, -h, w, 0]); inked (g, c[0], lw);
			poly (g, [-w, 0, -w, -h, 0, -h - w * 1.4, -w * 0.15, -h, -w * 0.15, 0]); g.fillStyle = c[1]; g.fill ();
			poly (g, [-w, 0, -w, -h, 0, -h - w * 1.4, w, -h, w, 0]); stroke (g, OL, lw);
			g.restore ();
		}
		const k = (Math.sin (t * 3 + seed * 10) + 1) / 2;
		starPath (g, 0.6, -8.6, 0.5 + k * 0.4, 0.15, 4, 0); g.fillStyle = '#FFFFFF'; g.fill ();
	},
	lavafall (g, lw, t, seed)
	{
		poly (g, [-5.5, 0, -5.2, -13, -3.6, -15.8, -1.4, -14.6, 0.6, -16, 3.2, -14.4, 5.3, -15.2, 5.6, 0]); inked (g, '#4A3550', lw);
		poly (g, [-5.5, 0, -5.2, -13, -3.6, -15.8, -3.4, -9, -4, 0]); g.fillStyle = '#6B4F72'; g.fill ();
		rr (g, -1.6, -14.8, 3.2, 14.4, 0.6); inked (g, '#FF7A1C', lw);
		g.beginPath (); for (const x of [-0.7, 0.6]) { g.moveTo (x, -14.6); g.lineTo (x, -0.6); }
		g.setLineDash ([1.6, 1.4]); g.lineDashOffset = -t * 7; stroke (g, '#FFD23F', 0.45); g.setLineDash ([]); g.lineDashOffset = 0;
		ell (g, 0, -0.3, 4.4, 1.2); inked (g, '#FF6A2B', lw);
		ell (g, 0, -0.45, 2.8, 0.6); g.fillStyle = '#FFE14D'; g.fill ();
		for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; circ (g, (i - 1) * 1.6 * (0.5 + k), -1 - Math.sin (k * Math.PI) * 2.2, 0.35 * (1 - k * 0.5)); inked (g, '#FFB020', lw * 0.5); }
	},
	planet (g, lw, t, seed)
	{
		const sets = [['#FF8CC6', '#FFD23F'], ['#7FE6FF', '#FF7AC0'], ['#B58CFF', '#3DFFA0'], ['#FFB86B', '#7FE6FF']], c = sets[Math.floor (seed * 4) % 4];
		const r = 3.5 + seed * 2;
		g.rotate (-0.35 + seed * 0.3);
		g.beginPath (); g.ellipse (0, 0, r * 1.75, r * 0.42, 0, Math.PI, TAU); tube (g, r * 0.16, c[1], lw);
		circ (g, 0, 0, r); inked (g, c[0], lw);
		g.save (); circ (g, 0, 0, r); g.clip ();
		g.fillStyle = shade (c[0], -0.14); g.fillRect (-r, -r * 0.35, r * 2, r * 0.22); g.fillRect (-r, r * 0.25, r * 2, r * 0.3);
		g.restore ();
		circ (g, 0, 0, r); stroke (g, OL, lw);
		shine (g, -r * 0.4, -r * 0.5, r * 0.32, r * 0.14, -0.6, 0.5);
		g.beginPath (); g.ellipse (0, 0, r * 1.75, r * 0.42, 0, 0, Math.PI); tube (g, r * 0.16, c[1], lw);
	},
	asteroid (g, lw, t, seed)
	{
		const s = 0.7 + seed * 0.6; g.scale (s, s); lw /= s;
		g.rotate (t * 0.3 * (seed > 0.5 ? 1 : -1) + seed * 6);
		const pts = [];
		for (let i = 0; i < 9; i++) { const a = i * TAU / 9, r = 2.1 + hash (seed * 7 + i) * 0.7; pts.push (Math.cos (a) * r, Math.sin (a) * r); }
		poly (g, pts); inked (g, '#8C84A8', lw);
		for (const [x, y, r] of [[-0.7, -0.5, 0.6], [0.9, 0.6, 0.45], [0.2, 1.2, 0.3]]) { ell (g, x, y, r, r * 0.8); inked (g, '#6E6690', lw * 0.6); }
		shine (g, -0.9, -1.4, 0.7, 0.25, -0.5, 0.4);
	},
	satellite (g, lw, t, seed)
	{
		g.rotate (Math.sin (t * 0.6 + seed * 6) * 0.15);
		for (const s of [-1, 1])
		{
			g.beginPath (); g.moveTo (s * 1.0, 0); g.lineTo (s * 1.6, 0); stroke (g, OL, lw * 1.4);
			rr (g, s > 0 ? 1.6 : -5.4, -1.0, 3.8, 2.0, 0.2); inked (g, '#3F6BFF', lw);
			g.beginPath (); for (const k of [1, 2]) { const x = (s > 0 ? 1.6 : -5.4) + k * 1.27; g.moveTo (x, -1); g.lineTo (x, 1); } g.moveTo (s > 0 ? 1.6 : -5.4, 0); g.lineTo (s > 0 ? 5.4 : -1.6, 0);
			stroke (g, '#9DB6FF', lw * 0.7);
		}
		rr (g, -1.1, -1.3, 2.2, 2.6, 0.4); inked (g, '#FFC83D', lw);
		g.beginPath (); g.moveTo (0, -1.3); g.lineTo (0, -2.2); stroke (g, OL, lw);
		g.beginPath (); g.ellipse (0, -2.3, 1.1, 0.45, 0, Math.PI, TAU); g.closePath (); inked (g, '#FFFFFF', lw);
		const on = Math.sin (t * 5 + seed * 9) > 0.3;
		circ (g, 0, 0.4, 0.3); inked (g, on ? '#FF3D5A' : '#7A1630', lw * 0.6);
		shine (g, -0.45, -0.85, 0.35, 0.15, 0, 0.55);
	} };

// ---- the horizon: a silhouette that wraps around (screen x -> world angle yaw + atan (x / F)) ---------------------
function tri (x) { x -= Math.floor (x); return 1 - Math.abs (x * 2 - 1); }
function backH (id, a, far)
{
	const q = a / TAU;
	switch (id)
	{
	case 'beach':
		return far ? Math.max (0, 0.035 * Math.sin (a * 3 + 0.5) + 0.03 * Math.sin (a * 7 + 1) + 0.01 * Math.sin (a * 19) - 0.012) + 0.004
			: Math.max (0, 0.03 * Math.sin (a * 5 + 2) + 0.02 * Math.sin (a * 11) - 0.03) * 1.6 + 0.0;
	case 'lava':
		return far ? 0.05 + 0.08 * Math.pow (tri (q * 5 + 0.1), 1.6) + 0.035 * tri (q * 13) + 0.012 * tri (q * 37)
			: 0.02 + 0.05 * Math.pow (tri (q * 7 + 0.3), 2) + 0.022 * tri (q * 19 + 0.2) + 0.008 * tri (q * 47);
	case 'space':
		return 0.025 + 0.012 * Math.sin (a * 4) + 0.006 * Math.sin (a * 13 + 1);
	default:
		return far ? 0.07 + 0.03 * Math.sin (a * 2 + 1) + 0.025 * Math.sin (a * 5) + 0.01 * Math.sin (a * 11 + 2)
			: 0.035 + 0.02 * Math.sin (a * 3 + 2) + 0.014 * Math.sin (a * 7 + 1) + 0.006 * Math.sin (a * 17);
	}
}
function ridge (g, id, o, far, fill, lw, rim)
{
	const F = o.F, yaw = o.yaw || 0, step = Math.max (4, F * 0.008), x0 = o.x0, x1 = o.x1;
	g.beginPath ();
	for (let x = x0; ; x += step)
	{
		if (x > x1) x = x1;
		const h = backH (id, yaw + Math.atan (x / F), far) * F;
		if (x === x0) g.moveTo (x, -h); else g.lineTo (x, -h);
		if (x === x1) break;
	}
	g.lineTo (x1, 6); g.lineTo (x0, 6); g.closePath ();
	g.fillStyle = fill; g.fill ();
	g.save (); g.clip (); stroke (g, OL, lw * 2); if (rim) { g.translate (0, lw * 1.6); stroke (g, rim, lw * 1.2); } g.restore ();
}
function drawBackdrop (g, theme, o)
{
	const th = themeOf (theme), lw = o.ink || 3, id = th.id;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	ridge (g, id, o, true, th.hills2, lw * 0.8, id === 'candy' ? 'rgba(255,255,255,.45)' : null);
	if (id === 'space') skyline (g, th, o, lw);
	else ridge (g, id, o, false, th.hills, lw, id === 'lava' ? 'rgba(255,120,60,.5)' : 'rgba(255,255,255,.35)');
	g.restore ();
}
// the space horizon: a little moon city of domes and towers with neon tops
function skyline (g, th, o, lw)
{
	const F = o.F, yaw = o.yaw || 0, N = 160, bw = TAU / N, t = o.t || 0;
	const a0 = yaw + Math.atan (o.x0 / F), a1 = yaw + Math.atan (o.x1 / F);
	for (let b = Math.floor (a0 / bw) - 1; b <= Math.floor (a1 / bw) + 1; b++)
	{
		const n = ((b % N) + N) % N, h = hash (n), kind = h < 0.35 ? 0 : h < 0.75 ? 1 : 2;
		if (kind === 0) continue;
		const xa = Math.tan (b * bw - yaw) * F, xb = Math.tan ((b + 0.8) * bw - yaw) * F, w = xb - xa;
		if (xb < o.x0 - 50 || xa > o.x1 + 50 || Math.abs (b * bw - yaw) > 1.4) continue;
		if (kind === 1)
		{
			const hh = F * (0.03 + hash (n + 50) * 0.06);
			rr (g, xa, -hh, w, hh + 6, w * 0.15); inked (g, th.hills, lw);
			g.beginPath (); g.moveTo (xa + w * 0.15, -hh + lw * 1.5); g.lineTo (xb - w * 0.15, -hh + lw * 1.5); stroke (g, hash (n + 9) < 0.5 ? th.rumbleA : th.line, lw * 1.2);
			g.fillStyle = 'rgba(255,225,77,.8)';
			for (let i = 0; i < 3; i++) if (hash (n * 3 + i) < 0.6) g.fillRect (xa + w * (0.25 + (i % 2) * 0.35), -hh + (i + 1) * hh * 0.25, w * 0.14, w * 0.14);
		}
		else
		{
			const r = w * 0.55, cx = (xa + xb) / 2;
			g.beginPath (); g.arc (cx, 0, r, Math.PI, TAU); g.closePath (); inked (g, th.hills2, lw);
			g.beginPath (); g.arc (cx, 0, r * 0.75, -2.6, -1.9); stroke (g, 'rgba(255,255,255,.45)', lw);
			g.beginPath (); g.moveTo (cx, -r); g.lineTo (cx, -r - r * 0.5); stroke (g, OL, lw * 0.8);
			circ (g, cx, -r - r * 0.5, lw * 1.2); g.fillStyle = Math.sin (t * 3 + n) > 0 ? th.rumbleA : th.line; g.fill ();
		}
	}
}
// the sun with a face (day), a low striped sun (the lava dusk), a ringed planet (space)
function drawSkyThing (g, theme, o)
{
	const th = themeOf (theme), r = o.r || 40, lw = o.ink || r * 0.06, t = o.t || 0;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	if (th.id === 'space')
	{
		circ (g, -r * 1.9, r * 0.5, r * 0.28); inked (g, '#E8E4FF', lw);
		for (const [x, y, s] of [[-0.08, -0.06, 0.06], [0.06, 0.08, 0.04]]) { circ (g, -r * 1.9 + x * r, r * 0.5 + y * r, s * r); g.fillStyle = '#C2BCEB'; g.fill (); }
		g.rotate (-0.3);
		g.beginPath (); g.ellipse (0, 0, r * 1.7, r * 0.42, 0, Math.PI, TAU); tube (g, r * 0.16, '#FFD23F', lw);
		circ (g, 0, 0, r); inked (g, '#B85CFF', lw);
		g.save (); circ (g, 0, 0, r); g.clip (); g.fillStyle = '#9A45E8'; g.fillRect (-r, -r * 0.3, r * 2, r * 0.2); g.fillRect (-r, r * 0.3, r * 2, r * 0.25); g.restore ();
		circ (g, 0, 0, r); stroke (g, OL, lw);
		shine (g, -r * 0.4, -r * 0.5, r * 0.3, r * 0.13, -0.6, 0.5);
		g.beginPath (); g.ellipse (0, 0, r * 1.7, r * 0.42, 0, 0, Math.PI); tube (g, r * 0.16, '#FFD23F', lw);
		g.restore ();
		return;
	}
	const dusk = th.id === 'lava', c = dusk ? '#FF6A3D' : '#FFE14D';
	if (!dusk)
	{
		g.save (); g.rotate (t * 0.15);
		for (let i = 0; i < 12; i++)
		{
			const a = i * TAU / 12, l = i % 2 ? 1.45 : 1.65;
			g.beginPath (); g.moveTo (Math.cos (a - 0.13) * r * 1.1, Math.sin (a - 0.13) * r * 1.1); g.lineTo (Math.cos (a) * r * l, Math.sin (a) * r * l);
			g.lineTo (Math.cos (a + 0.13) * r * 1.1, Math.sin (a + 0.13) * r * 1.1); g.closePath (); inked (g, '#FFB020', lw);
		}
		g.restore ();
	}
	circ (g, 0, 0, r); inked (g, c, lw);
	if (dusk)
	{
		g.save (); circ (g, 0, 0, r); g.clip (); g.fillStyle = '#FFB020'; g.fillRect (-r, -r, r * 2, r * 0.7);
		g.fillStyle = '#C23A6A'; for (let i = 0; i < 3; i++) g.fillRect (-r, r * (0.35 + i * 0.22), r * 2, r * (0.05 + i * 0.03)); g.restore ();
		circ (g, 0, 0, r); stroke (g, OL, lw);
	}
	shine (g, -r * 0.42, -r * 0.5, r * 0.3, r * 0.13, -0.6, 0.55);
	// the face
	for (const s of [-1, 1])
	{
		if (dusk) { g.beginPath (); g.arc (s * r * 0.32, -r * 0.08, r * 0.14, 0.2, Math.PI - 0.2); stroke (g, OL, lw * 1.2); }
		else { ell (g, s * r * 0.32, -r * 0.1, r * 0.09, r * 0.14); g.fillStyle = OL; g.fill (); circ (g, s * r * 0.32 - r * 0.03, -r * 0.15, r * 0.035); g.fillStyle = '#FFFFFF'; g.fill (); }
	}
	g.fillStyle = 'rgba(255,90,90,.45)'; for (const s of [-1, 1]) { ell (g, s * r * 0.55, r * 0.18, r * 0.13, r * 0.08); g.fill (); }
	g.beginPath (); g.arc (0, r * 0.12, r * 0.3, 0.3, Math.PI - 0.3); stroke (g, OL, lw * 1.2);
	g.restore ();
}

// ---- the items -----------------------------------------------------------------------------------------------------
// the "?" box: a spinning candy cube, 1.6 units, anchor its centre
function drawBox (g, o)
{
	o = o || NO;
	const lw = o.ink || 0.06, t = o.t || 0, s = 1.6, ang = t * 2.2;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	g.rotate (Math.sin (t * 1.7) * 0.08);
	const ph = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2), face = Math.floor (ang / (Math.PI / 2));
	const w1 = Math.cos (ph) * s * 0.72, w2 = Math.sin (ph) * s * 0.72, x0 = -(w1 + w2) / 2, h = s * 0.82;
	const faces = [[x0, w2, face + 1], [x0 + w2, w1, face]], W = w1 + w2, rad = 0.2;
	rr (g, x0, -h / 2, W, h, rad); g.save (); g.clip ();
	for (const [x, w, f] of faces)
	{
		g.fillStyle = RAINBOW[((f % 6) + 6) % 6]; g.fillRect (x, -h / 2, w + 0.01, h);
		g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect (x + w * 0.1, -h / 2 + 0.08, w * 0.8, h * 0.16);
		g.fillStyle = 'rgba(43,35,64,.12)'; g.fillRect (x, h / 2 - h * 0.14, w, h * 0.14);
	}
	g.restore ();
	if (w2 > 0.02 && w1 > 0.02) { g.beginPath (); g.moveTo (x0 + w2, -h / 2); g.lineTo (x0 + w2, h / 2); stroke (g, OL, lw); }
	rr (g, x0, -h / 2, W, h, rad); stroke (g, OL, lw * 1.2);
	for (const [x, w] of faces) if (w > 0.28) { g.save (); g.translate (x + w / 2, 0.02); g.scale (w / (s * 0.72), 1); otext (g, '?', 0, 0, h * 0.78, '#FFFFFF', lw * 1.2); g.restore (); }
	for (let i = 0; i < 3; i++)
	{
		const a = t * 2 + i * TAU / 3, k = (Math.sin (t * 5 + i * 2) + 1) / 2;
		starPath (g, Math.cos (a) * 0.95, Math.sin (a) * 0.7, 0.08 + k * 0.1, 0.03, 4, 0); g.fillStyle = '#FFFFFF'; g.fill ();
	}
	g.restore ();
}
// the rocket flying away (o.front: coming at you, angry face), about 0.8 units, anchor its middle
function drawRocket (g, o)
{
	o = o || NO;
	const lw = o.ink || 0.04, t = o.t || 0, fl = 0.85 + 0.15 * Math.sin (t * 50);
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	g.rotate (Math.sin (t * 9) * 0.1);
	if (o.front)
	{	// coming at you: the fins behind, the red nose cone, angry eyebrows
		for (const a of [0, Math.PI, Math.PI / 2]) { g.save (); g.rotate (a); poly (g, [0.2, -0.07, 0.42, -0.1, 0.42, 0.1, 0.2, 0.07]); inked (g, '#FFD23F', lw); g.restore (); }
		circ (g, 0, 0, 0.3); inked (g, '#FF3D3D', lw);
		circ (g, 0, 0.03, 0.2); g.fillStyle = '#FF6B6B'; g.fill ();
		for (const s of [-1, 1])
		{
			ell (g, s * 0.1, -0.02, 0.065, 0.075); inked (g, '#FFFFFF', lw * 0.6);
			circ (g, s * 0.085, 0.0, 0.035); g.fillStyle = OL; g.fill ();
			g.beginPath (); g.moveTo (s * 0.2, -0.15); g.lineTo (s * 0.04, -0.09); stroke (g, OL, lw * 1.3);
		}
		g.beginPath (); g.moveTo (-0.08, 0.14); g.lineTo (0.08, 0.14); stroke (g, OL, lw);
		shine (g, -0.13, -0.17, 0.08, 0.035, -0.6, 0.6);
		g.restore ();
		return;
	}
	// the flame (nearest), the body narrowing away to the nose
	starPath (g, 0, 0.28, 0.24 * fl, 0.14 * fl, 8, t * 9); inked (g, '#FF7A1C', lw);
	circ (g, 0, 0.28, 0.12 * fl); g.fillStyle = '#FFE14D'; g.fill ();
	circ (g, 0, 0.28, 0.06 * fl); g.fillStyle = '#FFFFFF'; g.fill ();
	for (const s of [-1, 1]) { poly (g, [s * 0.15, 0.12, s * 0.33, 0.24, s * 0.32, 0.08, s * 0.14, -0.06]); inked (g, '#FFD23F', lw); }
	g.beginPath (); g.moveTo (-0.2, 0.2); g.lineTo (-0.14, -0.2); g.quadraticCurveTo (0, -0.48, 0.14, -0.2); g.lineTo (0.2, 0.2); g.quadraticCurveTo (0, 0.28, -0.2, 0.2); g.closePath ();
	inked (g, '#FF3D3D', lw);
	g.beginPath (); g.moveTo (-0.15, -0.14); g.quadraticCurveTo (0, -0.42, 0.15, -0.14); g.quadraticCurveTo (0, -0.2, -0.15, -0.14); g.closePath (); inked (g, '#FFFFFF', lw * 0.8);
	poly (g, [-0.06, 0.12, 0, 0.36, 0.06, 0.12]); inked (g, '#FFD23F', lw);
	shine (g, -0.09, -0.02, 0.03, 0.12, 0.1, 0.55);
	g.restore ();
}
// the gum splat lying on the floor (flattened), 1.6 units wide, anchor its centre on the floor; o.flying: a ball in the air
function drawGum (g, o)
{
	o = o || NO;
	const lw = o.ink || 0.05, t = o.t || 0;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	if (o.flying)
	{
		g.rotate (t * 6);
		blob (g, [[0, 0, 0.42], [0.3, -0.2, 0.2], [-0.3, 0.15, 0.18]], '#FF7AC0', lw);
		shine (g, -0.14, -0.16, 0.14, 0.07, -0.6, 0.6);
		g.restore ();
		return;
	}
	const fy = 0.36, pts = [];
	for (let i = 0; i < 18; i++) { const a = i * TAU / 18, r = 0.8 * (1 + (i % 2 ? -0.12 : 0.08) + 0.06 * Math.sin (i * 2.3)); pts.push (Math.cos (a) * r, Math.sin (a) * r * fy); }
	g.beginPath (); g.moveTo (pts[0], pts[1]);
	for (let i = 2; i <= pts.length; i += 2) { const j = i % pts.length; const mx = (pts[i - 2] + pts[j]) / 2, my = (pts[i - 1] + pts[j + 1]) / 2; g.quadraticCurveTo (pts[i - 2], pts[i - 1], mx, my); }
	g.closePath (); inked (g, '#FF7AC0', lw);
	ell (g, -0.1, -0.04, 0.48, 0.15); g.fillStyle = '#FFA8D6'; g.fill ();
	for (const [x, y, r] of [[-0.45, 0.05, 0.06], [0.42, -0.06, 0.05], [0.15, 0.12, 0.04]]) { ell (g, x, y, r, r * fy); inked (g, '#E04F98', lw * 0.5); }
	// a bubble growing and popping
	const k = (t * 0.7) % 1, br = 0.12 + k * 0.22;
	if (k < 0.92) { circ (g, 0.18, -br * 0.9, br); g.fillStyle = 'rgba(255,140,200,.85)'; g.fill (); stroke (g, OL, lw * 0.8); shine (g, 0.18 - br * 0.4, -br * 1.3, br * 0.3, br * 0.15, -0.6, 0.7); }
	g.restore ();
}
// a rocket pointing up, for the icons (radius r)
function rocketIcon (g, r, lw)
{
	starPath (g, 0, r * 0.8, r * 0.3, r * 0.16, 7, 0); inked (g, '#FF7A1C', lw * 0.8);
	circ (g, 0, r * 0.78, r * 0.13); g.fillStyle = '#FFE14D'; g.fill ();
	for (const s of [-1, 1]) { poly (g, [s * r * 0.24, r * 0.1, s * r * 0.52, r * 0.6, s * r * 0.24, r * 0.55]); inked (g, '#FFD23F', lw); }
	g.beginPath (); g.moveTo (-r * 0.26, r * 0.6); g.lineTo (-r * 0.26, -r * 0.2); g.quadraticCurveTo (-r * 0.24, -r * 0.7, 0, -r * 0.92);
	g.quadraticCurveTo (r * 0.24, -r * 0.7, r * 0.26, -r * 0.2); g.lineTo (r * 0.26, r * 0.6); g.closePath (); inked (g, '#FF3D3D', lw);
	g.beginPath (); g.moveTo (-r * 0.2, -r * 0.48); g.quadraticCurveTo (0, -r * 0.6, r * 0.2, -r * 0.48); g.quadraticCurveTo (r * 0.1, -r * 0.8, 0, -r * 0.92); g.quadraticCurveTo (-r * 0.1, -r * 0.8, -r * 0.2, -r * 0.48); g.closePath (); inked (g, '#FFFFFF', lw * 0.8);
	circ (g, 0, -r * 0.05, r * 0.14); inked (g, '#7FE6FF', lw * 0.8);
	shine (g, -r * 0.14, r * 0.15, r * 0.05, r * 0.22, 0, 0.5);
}
// the invincibility star: gold with a rainbow fringe and a smile
function starIcon (g, r, lw, t)
{
	const R = r * 0.98, rot = Math.sin (t * 3) * 0.08;
	starPath (g, 0, r * 0.04, R * 1.04, R * 0.5, 5, rot + 0.14); g.fillStyle = '#FF4FA0'; g.fill ();
	starPath (g, 0, r * 0.04, R * 1.04, R * 0.5, 5, rot - 0.14); g.fillStyle = '#46C8FF'; g.fill ();
	starPath (g, 0, r * 0.04, R, R * 0.5, 5, rot); inked (g, '#FFD23F', lw);
	starPath (g, 0, r * 0.1, R * 0.7, R * 0.36, 5, rot); g.fillStyle = '#FFE98A'; g.fill ();
	shine (g, -r * 0.18, -r * 0.42, r * 0.08, r * 0.16, 0.5, 0.7);
	for (const s of [-1, 1]) { ell (g, s * r * 0.16, -r * 0.02, r * 0.07, r * 0.15); g.fillStyle = OL; g.fill (); circ (g, s * r * 0.16 - r * 0.02, -r * 0.08, r * 0.03); g.fillStyle = '#FFFFFF'; g.fill (); }
	g.beginPath (); g.arc (0, r * 0.14, r * 0.14, 0.3, Math.PI - 0.3); stroke (g, OL, lw);
	g.fillStyle = 'rgba(255,90,140,.45)'; for (const s of [-1, 1]) { ell (g, s * r * 0.34, r * 0.16, r * 0.08, r * 0.05); g.fill (); }
}
// the item in the HUD slot (radius r): 'rocket', 'rocket3', 'gum', 'shield', 'turbo', 'star'
function drawItemIcon (g, item, r)
{
	const lw = r * 0.09;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	if (item === 'rocket') { g.rotate (-Math.PI / 4); rocketIcon (g, r, lw); }
	else if (item === 'rocket3')
	{
		for (const [x, y, a] of [[-0.42, 0.22, -1.05], [0.42, 0.22, -0.52], [0, -0.2, -0.785]])
		{ g.save (); g.translate (x * r, y * r); g.rotate (a); rocketIcon (g, r * 0.62, lw * 0.75); g.restore (); }
	}
	else if (item === 'star') starIcon (g, r, lw, 0);
	else if (item === 'gum')
	{
		circ (g, r * 0.08, -r * 0.08, r * 0.72); inked (g, '#FF8CC6', lw);
		g.beginPath (); g.arc (r * 0.08, -r * 0.08, r * 0.52, -2.6, -1.9); stroke (g, 'rgba(255,255,255,.8)', lw * 1.4);
		circ (g, -r * 0.18, -r * 0.4, r * 0.1); g.fillStyle = '#FFFFFF'; g.fill ();
		g.save (); g.translate (-r * 0.42, r * 0.55); g.rotate (-0.35);
		rr (g, -r * 0.42, -r * 0.2, r * 0.84, r * 0.4, r * 0.1); inked (g, '#3DD68C', lw);
		g.fillStyle = '#FFFFFF'; g.fillRect (-r * 0.12, -r * 0.2, r * 0.24, r * 0.4); rr (g, -r * 0.42, -r * 0.2, r * 0.84, r * 0.4, r * 0.1); stroke (g, OL, lw);
		g.restore ();
	}
	else if (item === 'shield')
	{
		g.beginPath (); g.moveTo (0, -r * 0.9); g.quadraticCurveTo (r * 0.45, -r * 0.62, r * 0.78, -r * 0.66); g.quadraticCurveTo (r * 0.82, r * 0.35, 0, r * 0.92);
		g.quadraticCurveTo (-r * 0.82, r * 0.35, -r * 0.78, -r * 0.66); g.quadraticCurveTo (-r * 0.45, -r * 0.62, 0, -r * 0.9); g.closePath ();
		inked (g, '#3FA7FF', lw);
		g.beginPath (); g.moveTo (0, -r * 0.68); g.quadraticCurveTo (r * 0.35, -r * 0.46, r * 0.58, -r * 0.5); g.quadraticCurveTo (r * 0.6, r * 0.25, 0, r * 0.68);
		g.quadraticCurveTo (-r * 0.6, r * 0.25, -r * 0.58, -r * 0.5); g.quadraticCurveTo (-r * 0.35, -r * 0.46, 0, -r * 0.68); g.closePath (); g.fillStyle = '#7FE6FF'; g.fill ();
		starPath (g, 0, 0, r * 0.36, r * 0.16, 5, 0); inked (g, '#FFE14D', lw * 0.8);
		shine (g, -r * 0.36, -r * 0.4, r * 0.14, r * 0.06, -0.4, 0.7);
	}
	else if (item === 'turbo')
	{
		g.beginPath (); g.moveTo (0, -r * 0.95);
		g.bezierCurveTo (r * 0.25, -r * 0.55, r * 0.75, -r * 0.3, r * 0.68, r * 0.25); g.bezierCurveTo (r * 0.62, r * 0.75, r * 0.25, r * 0.92, 0, r * 0.92);
		g.bezierCurveTo (-r * 0.25, r * 0.92, -r * 0.62, r * 0.75, -r * 0.68, r * 0.25); g.bezierCurveTo (-r * 0.72, -r * 0.15, -r * 0.45, -r * 0.3, -r * 0.4, -r * 0.6);
		g.bezierCurveTo (-r * 0.2, -r * 0.35, -r * 0.1, -r * 0.6, 0, -r * 0.95); g.closePath (); inked (g, '#FF7A1C', lw);
		g.beginPath (); g.moveTo (0, -r * 0.35); g.bezierCurveTo (r * 0.15, -r * 0.1, r * 0.42, r * 0.1, r * 0.38, r * 0.4);
		g.bezierCurveTo (r * 0.32, r * 0.7, -r * 0.32, r * 0.7, -r * 0.38, r * 0.4); g.bezierCurveTo (-r * 0.4, r * 0.1, -r * 0.15, -r * 0.1, 0, -r * 0.35); g.closePath ();
		g.fillStyle = '#FFE14D'; g.fill ();
		g.beginPath (); for (const dx of [-0.24, 0.08]) { g.moveTo (r * (dx - 0.06), r * 0.2); g.lineTo (r * (dx + 0.12), r * 0.4); g.lineTo (r * (dx - 0.06), r * 0.6); }
		stroke (g, OL, lw * 1.1);
		shine (g, -r * 0.4, r * 0.05, r * 0.06, r * 0.18, 0.2, 0.6);
	}
	g.restore ();
}
// a comic burst with a word in it, radius r
function drawPow (g, text, r, t)
{
	t = t || 0;
	const lw = r * 0.06, k = 1 + 0.05 * Math.sin (t * 30);
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	g.rotate (-0.12 + Math.sin (t * 17) * 0.04); g.scale (k, k);
	const pts = [];
	for (let i = 0; i < 24; i++) { const a = i * TAU / 24 - Math.PI / 2, q = i % 2 ? 0.72 : 0.95 + 0.08 * Math.sin (i * 3.1); pts.push (Math.cos (a) * r * q * 1.15, Math.sin (a) * r * q * 0.92); }
	poly (g, pts); inked (g, '#FFD23F', lw * 1.3);
	for (let i = 0; i < pts.length; i++) pts[i] *= 0.74;
	poly (g, pts); g.fillStyle = '#FF5A5F'; g.fill ();
	shine (g, -r * 0.35, -r * 0.42, r * 0.28, r * 0.1, -0.3, 0.45);
	otext (g, text, 0, r * 0.02, r * 0.58, '#FFFFFF', lw * 1.4, r * 1.5);
	g.restore ();
}

// ---- coins, Pouf's rescue, trophies, speed classes ----------------------------------------------------------------
// a gold coin spinning about its vertical axis (diameter 1), anchor its centre
function coinFace (g, rx, ry, lw)
{
	ell (g, 0, 0, rx, ry); inked (g, '#FFC83D', lw);
	ell (g, 0, 0, rx * 0.74, ry * 0.74); stroke (g, '#E89A00', lw * 0.9);
	if (rx > ry * 0.35) { g.save (); g.scale (rx / ry, 1); otext (g, 'Z', 0, ry * 0.02, ry * 1.0, '#FFF3B0', lw * 0.8); g.restore (); }
}
function drawCoin (g, o)
{
	o = o || NO;
	const lw = o.ink || 0.05, t = o.t || 0, a = t * 4 + (o.phase || 0), c = Math.cos (a), r = 0.5, th = 0.09;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	g.translate (0, Math.sin (t * 3 + (o.phase || 0)) * 0.06);
	const rx = Math.max (0.035, Math.abs (c) * r), side = Math.sin (a) > 0 ? 1 : -1, ex = th * Math.abs (Math.sin (a));
	// the edge, then the face
	rr (g, -rx + side * ex * 0.5 - ex * 0.5, -r, rx * 2 + ex, r * 2, rx); inked (g, '#D99A00', lw);
	g.translate (-side * ex * 0.5, 0);
	coinFace (g, rx, r, lw);
	if (rx > 0.12) shine (g, -rx * 0.42, -r * 0.48, rx * 0.22, r * 0.12, -0.5, 0.7);
	const k = (Math.sin (t * 5 + (o.phase || 0) * 3) + 1) / 2;
	if (k > 0.6) { starPath (g, rx * 0.6, -r * 0.62, 0.1 + (k - 0.6) * 0.3, 0.035, 4, 0); g.fillStyle = '#FFFFFF'; g.fill (); }
	g.restore ();
}
function drawCoinIcon (g, r)
{
	const lw = r * 0.1;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	circ (g, r * 0.06, r * 0.08, r * 0.94); inked (g, '#D99A00', lw);
	coinFace (g, r * 0.9, r * 0.9, lw);
	shine (g, -r * 0.4, -r * 0.44, r * 0.2, r * 0.1, -0.6, 0.75);
	g.restore ();
}
// Pouf the cloud (Briko Boom!'s mascot) fishing a fallen craft back: the anchor is the hook, the craft hangs below it
function drawRescue (g, o)
{
	o = o || NO;
	const lw = o.ink || 0.06, t = o.t || 0, k = 0.055;
	const cx = -1.95 + Math.sin (t * 1.6) * 0.1, cy = -3.5 + Math.sin (t * 2.3) * 0.08, tx = 0.05, ty = -2.55;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	// the line and the hook
	g.beginPath (); g.moveTo (tx, ty); g.quadraticCurveTo (0.06, -1.4, 0, -0.3); stroke (g, OL, lw * 0.9);
	g.beginPath (); g.moveTo (0, -0.34); g.lineTo (0, -0.05); g.arc (0.11, -0.05, 0.11, Math.PI, 0, true); g.lineTo (0.22, -0.14);
	tube (g, 0.06, '#C9D2E0', lw * 0.8);
	circ (g, 0, -0.38, 0.09); inked (g, '#FF5A5F', lw * 0.8);
	// the rod, held under the cloud
	g.beginPath (); g.moveTo (cx + 0.55, cy + 0.85); g.quadraticCurveTo (cx + 1.4, cy + 0.2, tx, ty); tube (g, 0.08, '#B57638', lw);
	circ (g, cx + 0.72, cy + 0.68, 0.13); inked (g, '#FFD23F', lw * 0.8);
	// Pouf: merged puffs, a face, two little hands
	g.save (); g.translate (cx, cy); g.scale (k, k);
	const blobs = [[-14, 4, 13], [0, -6, 16], [15, 3, 13], [0, 8, 12]];
	blob (g, blobs, '#FFFFFF', lw / k);
	g.save (); g.beginPath (); for (const [a, b, r] of blobs) { g.moveTo (a + r, b); g.arc (a, b, r, 0, TAU); } g.clip ();
	ell (g, 0, 20, 30, 6); g.fillStyle = 'rgba(160,205,255,.45)'; g.fill (); g.restore ();
	shine (g, -7, -15, 6, 2.6, -0.4, 0.9);
	const blink = (t % 3.2) < 0.12;
	for (const e of [-6, 6])
	{
		if (blink) { g.beginPath (); g.moveTo (e - 2.6, -1); g.lineTo (e + 2.6, -1); stroke (g, OL, 1.6); }
		else { ell (g, e, -1.5, 2.4, 3); g.fillStyle = OL; g.fill (); circ (g, e - 0.8, -2.6, 0.9); g.fillStyle = '#FFFFFF'; g.fill (); }
	}
	g.fillStyle = 'rgba(255,122,182,.6)'; for (const e of [-12, 12]) { ell (g, e, 4, 3.5, 2.4); g.fill (); }
	g.beginPath (); g.arc (0, 3.5, 3.4, 0.15, Math.PI - 0.15); g.closePath (); inked (g, '#B8263A', 1.4);
	for (const [x, y] of [[14, 12], [7, 15]]) { circ (g, x, y, 3.2); inked (g, '#FFFFFF', lw / k * 0.8); }
	g.restore ();
	g.restore ();
}
// the Grand Prix cup: rank 1 gold, 2 silver, 3 bronze; r its half height, anchor its centre
const CUP = [null, ['#FFD23F', '#E89A00', '#FFF3B0'], ['#DDE3EE', '#9AA6BA', '#FFFFFF'], ['#E8A06A', '#B8652E', '#FFD7B5']];
function drawTrophy (g, rank, r, o)
{
	o = o || NO;
	const lw = o.ink || r * 0.07, t = o.t || 0, c = CUP[rank] || CUP[1];
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round'; g.scale (r, r);
	const L = lw / r;
	// the handles
	for (const s of [-1, 1]) { g.beginPath (); g.moveTo (s * 0.5, -0.72); g.bezierCurveTo (s * 1.0, -0.8, s * 1.0, -0.2, s * 0.36, -0.08); tube (g, 0.1, c[0], L); }
	// the plinth, the stem, the bowl
	rr (g, -0.56, 0.62, 1.12, 0.38, 0.08); inked (g, '#6B4FB8', L);
	rr (g, -0.4, 0.71, 0.8, 0.2, 0.05); g.fillStyle = c[2]; g.fill ();
	otext (g, String (rank || 1), 0, 0.815, 0.2, OL, 0);
	rr (g, -0.4, 0.46, 0.8, 0.18, 0.06); inked (g, c[0], L);
	g.beginPath (); g.moveTo (-0.1, 0.0); g.lineTo (-0.14, 0.48); g.lineTo (0.14, 0.48); g.lineTo (0.1, 0.0); g.closePath (); inked (g, c[1], L);
	g.beginPath (); g.moveTo (-0.66, -0.92); g.lineTo (0.66, -0.92); g.bezierCurveTo (0.66, -0.2, 0.36, 0.08, 0, 0.08); g.bezierCurveTo (-0.36, 0.08, -0.66, -0.2, -0.66, -0.92); g.closePath ();
	inked (g, c[0], L);
	g.beginPath (); g.moveTo (0.66, -0.92); g.bezierCurveTo (0.66, -0.2, 0.36, 0.08, 0, 0.08); g.bezierCurveTo (0.3, -0.05, 0.48, -0.4, 0.46, -0.92); g.closePath ();
	g.fillStyle = c[1]; g.fill ();
	ell (g, 0, -0.92, 0.66, 0.1); inked (g, c[1], L);
	g.beginPath (); g.moveTo (-0.46, -0.78); g.bezierCurveTo (-0.46, -0.5, -0.36, -0.3, -0.24, -0.2); stroke (g, 'rgba(255,255,255,.75)', 0.08);
	starPath (g, 0, -0.45, 0.24, 0.11, 5, 0); inked (g, rank === 1 ? '#FF5A5F' : rank === 2 ? '#3FA7FF' : '#3DD68C', L * 0.8);
	for (let i = 0; i < 3; i++)
	{
		const k = (Math.sin (t * 4 + i * 2.1) + 1) / 2, x = [-0.8, 0.85, 0.55][i], y = [-1.0, -0.55, -1.15][i];
		starPath (g, x, y, 0.06 + k * 0.12, 0.025, 4, 0); g.fillStyle = '#FFFFFF'; g.fill (); stroke (g, OL, L * 0.4);
	}
	g.restore ();
}
// the speed class icons: 0 a snail (relaxed), 1 a bunny arrow (fast), 2 a rocket (rocket fast); r the radius
function drawSpeedClass (g, k, r)
{
	const lw = r * 0.09;
	g.save (); g.lineJoin = 'round'; g.lineCap = 'round';
	if (k === 0)
	{
		g.beginPath (); g.moveTo (-r * 0.85, r * 0.62); g.lineTo (r * 0.55, r * 0.62); g.quadraticCurveTo (r * 0.78, r * 0.62, r * 0.75, r * 0.2);
		g.lineTo (r * 0.68, -r * 0.1); g.quadraticCurveTo (r * 0.5, -r * 0.2, r * 0.45, r * 0.25); g.lineTo (-r * 0.85, r * 0.38); g.closePath (); inked (g, '#B8E86A', lw);
		for (const [x, y] of [[0.58, -0.1], [0.74, -0.08]]) { g.beginPath (); g.moveTo (x * r, y * r); g.lineTo ((x + 0.06) * r, (y - 0.42) * r); stroke (g, OL, lw * 0.9); circ (g, (x + 0.06) * r, (y - 0.46) * r, r * 0.07); g.fillStyle = OL; g.fill (); }
		circ (g, -r * 0.18, -r * 0.02, r * 0.58); inked (g, '#FF8CC6', lw);
		g.beginPath (); for (let i = 0; i <= 26; i++) { const a = i * 0.48, q = r * 0.5 * (1 - i / 28); g.lineTo (-r * 0.18 + Math.cos (a) * q, -r * 0.02 + Math.sin (a) * q); }
		stroke (g, '#D9479A', lw);
		shine (g, -r * 0.42, -r * 0.34, r * 0.14, r * 0.06, -0.6, 0.7);
	}
	else if (k === 1)
	{
		for (const [x, a] of [[-0.12, -0.35], [0.14, -0.05]]) { g.save (); g.translate (x * r, -r * 0.2); g.rotate (a); ell (g, 0, -r * 0.42, r * 0.13, r * 0.4); inked (g, '#FFFFFF', lw); ell (g, 0, -r * 0.4, r * 0.06, r * 0.28); g.fillStyle = '#FFB3D1'; g.fill (); g.restore (); }
		poly (g, [-r * 0.9, -r * 0.2, r * 0.1, -r * 0.2, r * 0.1, -r * 0.55, r * 0.9, r * 0.15, r * 0.1, r * 0.85, r * 0.1, r * 0.5, -r * 0.9, r * 0.5]);
		inked (g, '#FF9F1C', lw);
		for (const s of [-1, 1]) { circ (g, r * (0.08 + s * 0.13), r * 0.1, r * 0.06); g.fillStyle = OL; g.fill (); }
		g.beginPath (); g.moveTo (-r * 0.75, -r * 0.05); g.lineTo (-r * 0.2, -r * 0.05); stroke (g, 'rgba(255,255,255,.6)', lw * 1.2);
	}
	else
	{
		g.rotate (Math.PI / 4); rocketIcon (g, r * 0.95, lw);
	}
	g.restore ();
}

window.ZoomoArt = { OL, PILOTS, THEMES, DECO_INFO, drawShip, drawFace, drawDeco, drawBackdrop, drawSkyThing, drawBox, drawRocket, drawGum, drawItemIcon, drawPow, shade,
	drawCoin, drawCoinIcon, drawRescue, drawTrophy, drawSpeedClass };
}) ();
