// zoomo.js -- ZOOMO!: a cartoon anti-gravity racer for Code is Fun (the Wipeout family; Antigrav, Turtle Quest's free
// mode example, the cartoon way). Six pilots, four circuits made from a number (a closed loop that climbs, dives and
// banks in its turns, on pillars, with tunnels, rainbow arches, speed pads and ? boxes), five rivals who race and fight
// back (rockets, gum, bubbles, turbos), three laps, stars. The picture is pseudo-3D on the Canvas 2D: the track drawn
// from far to near, segment by segment, each with what stands on it; the craft and the scenery are cartoon sprites
// (art.js). Every sound is synthesized (WebAudio): no asset. Keyboard, gamepad, a finger (hold the left or the right
// half of the screen). Test hooks: ?track=N (a race at once), ?auto (the player's craft flies itself), ?seed=N.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';
const A = window.ZoomoArt;

// ---- the words (EN | FR) ----------------------------------------------------------------------------------------
const T = {
	subtitle: ['Float, zoom, win!', 'Flotte, fonce, gagne !'], play: ['Play', 'Jouer'], settings: ['Settings', 'Réglages'],
	back: ['Back', 'Retour'], backSite: ['Back to Code is Fun', 'Retour à Code is Fun'], howBtn: ['How to play', 'Comment jouer'],
	ok: ['OK!', 'OK !'], paused: ['Paused', 'Pause'], resume: ['Resume', 'Reprendre'], restart: ['Restart', 'Recommencer'],
	menu: ['Menu', 'Menu'], next: ['Next circuit', 'Circuit suivant'], retry: ['Retry', 'Rejouer'], newRecord: ['New record!', 'Nouveau record !'],
	sound: ['Sound', 'Son'], music: ['Music', 'Musique'], reduced: ['Less motion (no tilting)', 'Moins d\'animations (sans pencher)'],
	easy: ['Easy (slower rivals)', 'Facile (rivaux plus lents)'], language: ['Language', 'Langue'],
	choose: ['Pick your racer', 'Choisis ton pilote'], starsRule: ['★ finish · ★★ on the podium · ★★★ first!', '★ finis la course · ★★ sur le podium · ★★★ premier !'],
	itemsT: ['The ? boxes', 'Les boîtes ?'], padsRule: ['Blue arrows on the track: a free boost!', 'Les flèches bleues sur la piste : un élan gratuit !'],
	howKeys: ['Your craft goes by itself! ← → (or A D / Q D) to steer, ↓ to brake. Space (or Enter) uses what you found in a ? box. P or Esc: pause. Three laps: be first!',
		'Ton vaisseau avance tout seul ! ← → (ou Q D) pour tourner, ↓ pour freiner. Espace (ou Entrée) utilise ce que tu as trouvé dans une boîte ?. P ou Échap : pause. Trois tours : sois premier !'],
	howTouch: ['Your craft goes by itself! Hold the left or the right side of the screen to steer. Tap the round button at the bottom to use what you found in a ? box. Three laps: be first!',
		'Ton vaisseau avance tout seul ! Garde le doigt sur le côté gauche ou droit de l\'écran pour tourner. Touche le bouton rond en bas pour utiliser ce que tu as trouvé dans une boîte ?. Trois tours : sois premier !'],
	iRocket: ['Rocket: flies to the racer ahead', 'Fusée : file vers le pilote devant'], iGum: ['Gum: dropped behind you, it sticks!', 'Chewing-gum : lâché derrière toi, ça colle !'],
	iShield: ['Bubble: nothing can hurt you', 'Bulle : rien ne peut te toucher'], iTurbo: ['Turbo: ZOOM!', 'Turbo : ZOOM !'],
	lap: ['LAP', 'TOUR'], lastLap: ['LAST LAP!', 'DERNIER TOUR !'], go: ['GO!', 'PARTEZ !'], finish: ['FINISH!', 'ARRIVÉE !'],
	pow: ['POW!', 'BAM !'], splat: ['SPLAT!', 'SPLAF !'], bonk: ['BONK!', 'BONK !'], pop: ['POP!', 'PLOP !'],
	place1: ['1st', '1er'], placeN: ['{n}th', '{n}e'], place2: ['2nd', '2e'], place3: ['3rd', '3e'],
	win: ['You win!', 'Gagné !'], podium: ['On the podium!', 'Sur le podium !'], done: ['Finish!', 'Arrivée !'],
	bestLap: ['Best lap {t}', 'Meilleur tour {t}'], bestTime: ['Best: {t}', 'Record : {t}'], locked: ['Locked', 'Verrouillé'],
	unlockNote: ['Finish in the top 3 to open the next circuit.', 'Finis dans les 3 premiers pour ouvrir le circuit suivant.'],
	opened: ['A new circuit is open!', 'Un nouveau circuit est ouvert !'], allStars: ['Stars: {n} / 12', 'Étoiles : {n} / 12'],
	circuit: ['Circuit {n}', 'Circuit {n}'] };
const lang = () => (window.Site && Site.lang === 'fr') ? 1 : 0;
function tr (k, v) { let s = (T[k] || [k, k])[lang ()]; if (v) for (const n in v) s = s.split ('{' + n + '}').join (v[n]); return s; }
const $ = (id) => document.getElementById (id);
const Q = new URLSearchParams (location.search);

// ---- storage (every access may fail: private mode, blocked storage) ---------------------------------------------
const store = {
	get (k, d) { try { const v = localStorage.getItem ('codeisfun.race.' + k); return v === null ? d : JSON.parse (v); } catch (e) { return d; } },
	set (k, v) { try { localStorage.setItem ('codeisfun.race.' + k, JSON.stringify (v)); } catch (e) { /* this visit only */ } } };
const reducedOS = matchMedia ('(prefers-reduced-motion: reduce)').matches;
const CFG = Object.assign ({ sound: true, music: true, reduced: reducedOS, easy: false }, store.get ('settings', {}));
const prog = Object.assign ({ unlocked: 1, stars: [], best: [], pilot: 0 }, store.get ('progress', {}));

// ---- the circuits -----------------------------------------------------------------------------------------------
const N = 480, SEGL0 = 5, HW = 6, WALLH = 1.1, NSHIP = 6, LAPS = 3, VD = 72, DT = 1 / 120;
const TRACKS = [
	{ theme: 'candy', seed: 1207, hills: 0.8, tunnels: 1, curve: 1 / 24 },
	{ theme: 'beach', seed: 912, hills: 0.6, tunnels: 1, curve: 1 / 22 },
	{ theme: 'lava', seed: 7781, hills: 1.2, tunnels: 2, curve: 1 / 21 },
	{ theme: 'space', seed: 6060, hills: 1.5, tunnels: 2, curve: 1 / 20 } ];
const NTRACK = TRACKS.length;
const ITEMS = ['rocket', 'gum', 'shield', 'turbo'];
const OL = '#2B2340';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ---- small helpers ----------------------------------------------------------------------------------------------
function mkRnd (s) { s = s >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul (t ^ (t >>> 15), t | 1); t ^= t + Math.imul (t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let rnd = mkRnd (+Q.get ('seed') || (Math.random () * 1e9));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;
const touchUI = matchMedia ('(pointer: coarse)').matches;
const theme = (id) => A.THEMES.find ((t) => t.id === id) || A.THEMES[0];
const hex = (c) => { const n = parseInt (c.slice (1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixc = (a, b, k) => 'rgb(' + Math.round (a[0] + (b[0] - a[0]) * k) + ',' + Math.round (a[1] + (b[1] - a[1]) * k) + ',' + Math.round (a[2] + (b[2] - a[2]) * k) + ')';
function clock (s)
{
	if (!(s >= 0)) return '--:--.-';
	const m = Math.floor (s / 60), r = s - m * 60;
	return m + ':' + (r < 10 ? '0' : '') + r.toFixed (1);
}
function placeName (n) { return n === 1 ? tr ('place1') : n === 2 ? tr ('place2') : n === 3 ? tr ('place3') : tr ('placeN', { n }); }

// ---- the circuit, from its number (Antigrav's way: a star-shaped loop that never crosses itself) ----------------
let TR = null;
function buildTrack (ti)
{
	const D = TRACKS[ti], R = mkRnd (D.seed), M = 4 * N;
	const px = new Float64Array (N + 1), py = new Float64Array (N + 1), pz = new Float64Array (N + 1);
	const tx = new Float64Array (N), ty = new Float64Array (N), tz = new Float64Array (N), cv = new Float64Array (N);
	const dx = new Float64Array (M + 1), dy = new Float64Array (M + 1), dz = new Float64Array (M + 1), dl = new Float64Array (M + 1);
	const f1 = 2 + Math.floor (R () * 2), f2 = f1 + 1 + Math.floor (R () * 2), f3 = 5 + Math.floor (R () * 3);
	const p1 = R () * TAU, p2 = R () * TAU, p3 = R () * TAU;
	const g1 = 1 + Math.floor (R () * 3), g2 = 3 + Math.floor (R () * 3), q1 = R () * TAU, q2 = R () * TAU;
	const h1 = D.hills * (7 + R () * 9), h2 = D.hills * (2 + R () * 4);
	let amp = 1, seglen = SEGL0, tlen = 0;
	for (let tries = 0; tries < 30; tries++)
	{
		const a1 = (0.16 + R () * 0.14) * amp, a2 = (0.08 + R () * 0.1) * amp, a3 = (0.03 + R () * 0.05) * amp;
		const rad = (th) => 1 + a1 * Math.sin (f1 * th + p1) + a2 * Math.sin (f2 * th + p2) + a3 * Math.sin (f3 * th + p3);
		let lh = 0, ox = 0, oz = 0;
		for (let i = 0; i <= M; i++)
		{
			const th = i * TAU / M, r = rad (th), x = r * Math.cos (th), z = r * Math.sin (th);
			if (i) lh += Math.hypot (x - ox, z - oz);
			ox = x; oz = z;
		}
		const r0 = N * SEGL0 / lh;
		for (let i = 0; i <= M; i++)
		{
			const th = i * TAU / M, r = r0 * rad (th);
			dx[i] = r * Math.cos (th); dz[i] = -r * Math.sin (th);
			dy[i] = h1 * Math.sin (g1 * th + q1) + h2 * Math.sin (g2 * th + q2);
			dl[i] = i ? dl[i - 1] + Math.hypot (dx[i] - dx[i - 1], dy[i] - dy[i - 1], dz[i] - dz[i - 1]) : 0;
		}
		tlen = dl[M]; seglen = tlen / N;
		for (let i = 0, j = 0; i < N; i++)
		{
			const d = i * seglen;
			while (dl[j + 1] < d) j++;
			const f = (d - dl[j]) / (dl[j + 1] - dl[j] + 1e-9);
			px[i] = dx[j] + (dx[j + 1] - dx[j]) * f; py[i] = dy[j] + (dy[j + 1] - dy[j]) * f; pz[i] = dz[j] + (dz[j + 1] - dz[j]) * f;
		}
		px[N] = px[0]; py[N] = py[0]; pz[N] = pz[0];
		for (let i = 0; i < N; i++)
		{
			const a = (i + N - 1) % N, b = (i + 1) % N;
			const x = px[b] - px[a], y = py[b] - py[a], z = pz[b] - pz[a], l = Math.hypot (x, y, z);
			tx[i] = x / l; ty[i] = y / l; tz[i] = z / l;
		}
		let kmax = 0;
		for (let i = 0; i < N; i++)
		{
			const a = (i + N - 1) % N, b = (i + 1) % N;
			let hx = -tz[i], hz = tx[i]; const l = Math.hypot (hx, hz); hx /= l; hz /= l;
			cv[i] = ((tx[b] - tx[a]) * hx + (tz[b] - tz[a]) * hz) / (2 * seglen);
			kmax = Math.max (kmax, Math.abs (cv[i]));
		}
		if (kmax < D.curve) break;
		amp *= 0.85;
	}
	// the curvature smoothed (the banking follows it), the frames: up tilted to the inside of the turn
	const sm = new Float64Array (N);
	for (let i = 0; i < N; i++) { let s = 0; for (let k = -5; k <= 5; k++) s += cv[(i + k + N) % N]; sm[i] = s / 11; }
	const rx = new Float64Array (N + 1), ry = new Float64Array (N + 1), rz = new Float64Array (N + 1);
	const ux = new Float64Array (N + 1), uy = new Float64Array (N + 1), uz = new Float64Array (N + 1);
	let minY = 1e9, maxY = -1e9;
	for (let i = 0; i < N; i++)
	{
		cv[i] = sm[i];
		let hx = -tz[i], hz = tx[i]; const l = Math.hypot (hx, hz); hx /= l; hz /= l;
		const bank = clamp (cv[i] * 14, -0.55, 0.55);
		const upx = hx * bank, upy = 1, upz = hz * bank;
		let x = ty[i] * upz - tz[i] * upy, y = tz[i] * upx - tx[i] * upz, z = tx[i] * upy - ty[i] * upx;
		const m = Math.hypot (x, y, z); rx[i] = x / m; ry[i] = y / m; rz[i] = z / m;
		ux[i] = ry[i] * tz[i] - rz[i] * ty[i]; uy[i] = rz[i] * tx[i] - rx[i] * tz[i]; uz[i] = rx[i] * ty[i] - ry[i] * tx[i];
		minY = Math.min (minY, py[i]); maxY = Math.max (maxY, py[i]);
	}
	rx[N] = rx[0]; ry[N] = ry[0]; rz[N] = rz[0]; ux[N] = ux[0]; uy[N] = uy[0]; uz[N] = uz[0];
	// tunnels (1), speed pads (2), ? boxes (4), arches (8); the pad's lane
	const kind = new Uint8Array (N + 1), lane = new Int8Array (N + 1);
	for (let k = 0; k < D.tunnels; k++)
	{
		const a = 70 + Math.floor ((k + R () * 0.6) * (N - 160) / D.tunnels), b = a + 20 + Math.floor (R () * 18);
		for (let i = a; i <= b; i++) kind[i % N] |= 1;
	}
	for (let i = 30; i < N - 12; i += 34 + Math.floor (R () * 8)) if (!(kind[i] & 1)) kind[i] |= 8;
	kind[0] |= 8;
	let boxes = 0;
	for (let i = 20; i < N - 10;)
	{
		if (Math.abs (cv[i]) < 0.02 && !(kind[i] & 9) && !(kind[i + 1] & 9))
		{
			const kk = boxes < 2 || R () < 0.45 ? 4 : 2;
			if (kk === 4) boxes++;
			kind[i] |= kk; lane[i] = Math.floor (R () * 3) - 1;
			i += 16 + Math.floor (R () * 18);
		}
		else i += 3;
	}
	kind[N] = kind[0]; lane[N] = lane[0];
	const groundY = minY - 14;
	// the scenery: on the ground beside the track (never on it), some floating
	const th = theme (D.theme), deco = [];
	for (let i = 0; i < N; i++) deco.push ([]);
	const pool = [];
	for (const d of th.deco || []) { const k = typeof d === 'string' ? d : d.kind || d[0], w = typeof d === 'string' ? 1 : d.w || d.weight || d[1] || 1; pool.push ([k, w]); }
	const tot = pool.reduce ((a, b) => a + b[1], 0);
	const pick = () => { let x = R () * tot; for (const [k, w] of pool) { x -= w; if (x <= 0) return k; } return pool[0][0]; };
	for (let i = 0; i < N; i += 2)
	{
		if (!pool.length || R () > 0.8) continue;
		const kd = pick (), info = (A.DECO_INFO && A.DECO_INFO[kd]) || { h: 10 };
		const side = R () < 0.5 ? -1 : 1, off = HW + 6 + R () * R () * 46 + (info.float ? 8 : 0);
		let hx = -tz[i], hz = tx[i]; const l = Math.hypot (hx, hz); hx /= l; hz /= l;
		const x = px[i] + hx * off * side, z = pz[i] + hz * off * side, rr = (info.w || info.h * 0.5 || 4) * 0.5;
		let clear = true;
		for (let k = 0; k < N; k += 3) if ((px[k] - x) ** 2 + (pz[k] - z) ** 2 < (HW + 2 + rr) ** 2) { clear = false; break; }
		if (!clear) continue;
		const y = info.float ? py[i] + 4 + R () * 14 : groundY;
		deco[i].push ({ kind: kd, x, y, z, seed: R (), float: !!info.float });
	}
	// the little map
	let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
	for (let i = 0; i < N; i++) { x0 = Math.min (x0, px[i]); x1 = Math.max (x1, px[i]); z0 = Math.min (z0, pz[i]); z1 = Math.max (z1, pz[i]); }
	const sc = 2 / Math.max (x1 - x0, z1 - z0), mm = [];
	for (let i = 0; i <= N; i += 6) mm.push ([(px[i % N] - (x0 + x1) / 2) * sc, (pz[i % N] - (z0 + z1) / 2) * sc]);
	// the colours, faded into the haze by distance (a table: one row a segment ahead)
	const fog = hex (th.fog || th.skyBot), keys = ['track1', 'track2', 'line', 'rumbleA', 'rumbleB', 'wall', 'wallTop', 'skirt', 'pillar', 'tunnel1', 'tunnel2'];
	const FOG = [];
	for (let k = 0; k <= VD + 6; k++)
	{
		const f = Math.min (0.9, Math.pow (Math.max (0, k) / VD, 1.5) * 0.85), row = {};
		for (const key of keys) row[key] = mixc (hex (th[key] || '#888888'), fog, f);
		row.arch = (th.arch || ['#FF5A5F', '#FF9F1C', '#FFD23F', '#3DD68C', '#3FA7FF']).map ((c) => mixc (hex (c), fog, f));
		row.ink = mixc (hex (OL), fog, f * 0.8);
		FOG.push (row);
	}
	TR = { ti, D, th, px, py, pz, tx, ty, tz, rx, ry, rz, ux, uy, uz, cv, kind, lane, seglen, tlen, groundY, deco, mm, FOG, maxY };
}
// Where a distance along the circuit is (d to the right, h up): W.x y z; and its frame (W.f* forward, W.r* right, W.u* up)
const W = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0, rx: 0, ry: 0, rz: 0, ux: 0, uy: 0, uz: 0, cv: 0, kind: 0, lane: 0, seg: 0 };
function trackAt (s, d, h)
{
	const L = TR, sw = s - Math.floor (s / L.tlen) * L.tlen;
	let f = sw / L.seglen, i = Math.floor (f); f -= i;
	if (i >= N) i = 0;
	const j = i + 1 >= N ? 0 : i + 1, g0 = 1 - f;
	W.fx = L.tx[i] * g0 + L.tx[j] * f; W.fy = L.ty[i] * g0 + L.ty[j] * f; W.fz = L.tz[i] * g0 + L.tz[j] * f;
	W.rx = L.rx[i] * g0 + L.rx[j] * f; W.ry = L.ry[i] * g0 + L.ry[j] * f; W.rz = L.rz[i] * g0 + L.rz[j] * f;
	W.ux = L.ux[i] * g0 + L.ux[j] * f; W.uy = L.uy[i] * g0 + L.uy[j] * f; W.uz = L.uz[i] * g0 + L.uz[j] * f;
	W.cv = L.cv[i] * g0 + L.cv[j] * f; W.kind = L.kind[i]; W.lane = L.lane[i]; W.seg = i;
	W.x = L.px[i] * g0 + L.px[j] * f + W.rx * d + W.ux * h;
	W.y = L.py[i] * g0 + L.py[j] * f + W.ry * d + W.uy * h;
	W.z = L.pz[i] * g0 + L.pz[j] * f + W.rz * d + W.uz * h;
}
const wrapD = (d) => d - TR.tlen * Math.floor (d / TR.tlen + 0.5);	// a distance along, the shortest way round

// ---- the sound (WebAudio, synthesized) --------------------------------------------------------------------------
const Snd = {
	ac: null, out: null, sfx: null, mus: null, noiseBuf: null, eng: null,
	init ()
	{
		if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume (); return; }
		try
		{
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			const ac = this.ac = new AC ();
			this.out = ac.createGain (); this.out.gain.value = 0.6; this.out.connect (ac.destination);
			this.sfx = ac.createGain (); this.sfx.gain.value = 0.5; this.sfx.connect (this.out);
			this.mus = ac.createGain (); this.mus.gain.value = 0.18; this.mus.connect (this.out);
			const n = ac.sampleRate, buf = ac.createBuffer (1, n, n), d = buf.getChannelData (0);
			for (let i = 0; i < n; i++) d[i] = Math.random () * 2 - 1;
			this.noiseBuf = buf;
		}
		catch (e) { this.ac = null; }
	},
	ok () { return this.ac && CFG.sound && G && !G.demo; },
	tone (type, f0, f1, dur, gain, at, dest)
	{
		const ac = this.ac, t = ac.currentTime + (at || 0), o = ac.createOscillator (), gn = ac.createGain ();
		o.type = type; o.frequency.setValueAtTime (f0, t);
		if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime (f1, t + dur);
		gn.gain.setValueAtTime (0.0001, t); gn.gain.linearRampToValueAtTime (gain, t + 0.005); gn.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		o.connect (gn); gn.connect (dest || this.sfx); o.start (t); o.stop (t + dur + 0.03);
	},
	noise (dur, gain, ftype, f0, f1, at)
	{
		const ac = this.ac, t = ac.currentTime + (at || 0), s = ac.createBufferSource (), f = ac.createBiquadFilter (), gn = ac.createGain ();
		s.buffer = this.noiseBuf; f.type = ftype; f.frequency.setValueAtTime (f0, t);
		if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime (f1, t + dur);
		gn.gain.setValueAtTime (0.0001, t); gn.gain.linearRampToValueAtTime (gain, t + 0.01); gn.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		s.connect (f); f.connect (gn); gn.connect (this.sfx); s.start (t, Math.random () * 0.5); s.stop (t + dur + 0.03);
	},
	play (k)
	{
		if (!this.ok ()) return;
		const m = (n) => 440 * Math.pow (2, (n - 69) / 12);
		switch (k)
		{
		case 'beep': this.tone ('square', m (69), 0, 0.18, 0.3); break;
		case 'go': this.tone ('square', m (81), 0, 0.45, 0.3); this.tone ('square', m (88), 0, 0.45, 0.15); break;
		case 'boost': this.noise (0.5, 0.5, 'bandpass', 400, 3000); this.tone ('sine', 200, 700, 0.3, 0.3); break;
		case 'box': [76, 79, 83, 88].forEach ((n, i) => this.tone ('square', m (n), 0, 0.07, 0.2, i * 0.05)); break;
		case 'rocket': this.noise (0.6, 0.5, 'lowpass', 3000, 300); this.tone ('sawtooth', 300, 120, 0.4, 0.15); break;
		case 'gum': this.tone ('sine', 300, 120, 0.15, 0.5); this.tone ('sine', 160, 90, 0.2, 0.4, 0.12); break;
		case 'shield': this.tone ('triangle', 500, 1300, 0.25, 0.4); this.tone ('sine', 1300, 1600, 0.3, 0.15, 0.1); break;
		case 'turbo': this.noise (0.9, 0.6, 'bandpass', 300, 4000); this.tone ('sawtooth', 110, 440, 0.6, 0.2); break;
		case 'pow': this.noise (0.45, 0.8, 'lowpass', 2500, 120); this.tone ('sine', 140, 50, 0.4, 0.7); break;
		case 'splat': this.noise (0.25, 0.5, 'lowpass', 900, 200); this.tone ('sine', 220, 70, 0.25, 0.5); break;
		case 'pop': this.tone ('sine', 900, 300, 0.12, 0.5); break;
		case 'bonk': this.tone ('triangle', 180, 90, 0.12, 0.45); this.noise (0.06, 0.3, 'bandpass', 600); break;
		case 'bump': this.tone ('triangle', 120, 70, 0.1, 0.35); break;
		case 'lap': [72, 76, 79].forEach ((n, i) => this.tone ('square', m (n), 0, 0.1, 0.2, i * 0.08)); break;
		case 'last': [72, 76, 79, 84, 79, 84].forEach ((n, i) => this.tone ('square', m (n), 0, 0.1, 0.22, i * 0.09)); break;
		case 'pass': this.tone ('sine', m (84), m (91), 0.12, 0.25); break;
		case 'finish': [72, 76, 79, 84].forEach ((n, i) => this.tone ('square', m (n), 0, 0.14, 0.25, i * 0.12)); this.tone ('square', m (88), 0, 0.6, 0.25, 0.5); break;
		case 'star': this.tone ('sine', 1320, 0, 0.15, 0.4); this.tone ('sine', 1980, 0, 0.12, 0.15, 0.03); break;
		case 'tap': this.tone ('sine', 600, 0, 0.03, 0.3); break;
		}
	},
	// the engine: a hum that follows the speed (on while racing)
	engine (on, v, turbo)
	{
		if (!this.ac) return;
		if (on && CFG.sound && !this.eng)
		{
			const ac = this.ac, o = ac.createOscillator (), o2 = ac.createOscillator (), f = ac.createBiquadFilter (), gn = ac.createGain ();
			o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 700; gn.gain.value = 0;
			o.connect (f); o2.connect (f); f.connect (gn); gn.connect (this.sfx); o.start (); o2.start ();
			this.eng = { o, o2, f, gn };
		}
		if (!this.eng) return;
		const t = this.ac.currentTime, e = this.eng;
		if (!on || !CFG.sound) { e.gn.gain.setTargetAtTime (0, t, 0.05); e.o.stop (t + 0.3); e.o2.stop (t + 0.3); this.eng = null; return; }
		const fr = 55 + v * 1.1 + (turbo ? 40 : 0);
		e.o.frequency.setTargetAtTime (fr, t, 0.05); e.o2.frequency.setTargetAtTime (fr * 0.503, t, 0.05);
		e.f.frequency.setTargetAtTime (500 + v * 12 + (turbo ? 900 : 0), t, 0.05);
		e.gn.gain.setTargetAtTime (0.07 + (turbo ? 0.04 : 0), t, 0.05);
	} };
// the music: a bouncy chiptune loop, one key a circuit
const Mus = {
	on: false, timer: 0, next: 0, step: 0, key: 0,
	LEAD: [72, 0, 76, 79, 81, 79, 76, 0, 74, 0, 77, 81, 79, 77, 74, 0, 72, 0, 76, 79, 84, 83, 81, 79, 77, 76, 74, 71, 72, 0, 0, 0],
	BASS: [48, 48, 50, 50, 53, 53, 55, 55],
	start (key)
	{
		if (!Snd.ac || !CFG.music) return;
		if (this.on && this.key === key) return;
		this.stop (); this.on = true; this.key = key; this.step = 0; this.next = Snd.ac.currentTime + 0.1;
		this.timer = setInterval (() => this.tick (), 25);
	},
	stop () { this.on = false; clearInterval (this.timer); },
	tick ()
	{
		const ac = Snd.ac; if (!ac) return;
		const beat = 0.17, m = (n) => 440 * Math.pow (2, (n + this.key - 69) / 12);
		while (this.next < ac.currentTime + 0.12)
		{
			const at = this.next - ac.currentTime, n = this.LEAD[this.step % 32];
			if (this.step % 2 === 0) Snd.tone ('triangle', m (this.BASS[(this.step >> 2) % 8] - 12), 0, beat * 1.6, 0.6, at, Snd.mus);
			if (n) Snd.tone ('square', m (n), 0, beat * 0.9, 0.18, at, Snd.mus);
			if (this.step % 4 === 2) Snd.noise (0.04, 0.12, 'highpass', 6000, 0, at);
			this.step++; this.next += beat;
		}
	} };
function musicFor ()
{
	const want = Snd.ac && CFG.music && G && !G.demo && screen === 'play' && !paused && G.phase !== 'done';
	if (want) Mus.start ([0, -3, 2, -5][G.ti]); else Mus.stop ();
}

// ---- the race ---------------------------------------------------------------------------------------------------
let G = null, screen = 'title', paused = false, settingsFrom = 'title';
function newRace (ti, pilot, demo)
{
	buildTrack (ti);
	const order = [0, 1, 2, 3, 4, 5];
	for (let n = 5; n > 0; n--) { const k = Math.floor (rnd () * (n + 1)); [order[n], order[k]] = [order[k], order[n]]; }
	// the player starts at the back of the grid (and passes everybody: the fun of it)
	if (!demo) { order.splice (order.indexOf (0), 1); order.push (0); }
	const ships = [];
	const others = [0, 1, 2, 3, 4, 5].filter ((p) => p !== pilot);
	for (let n = 0; n < NSHIP; n++)
	{
		const g = order.indexOf (n);
		const easy = CFG.easy ? 0.86 : 0.92;
		ships.push ({ n, pilot: n === 0 ? pilot : others[n - 1], human: n === 0 && !demo, s: -6 - g * 5.5, lx: 2.4 * (g % 2 ? -1 : 1), v: 0, vl: 0,
			steer: 0, thrust: 0, item: null, shield: 0, turbo: 0, spin: 0, stuck: 0, skill: Math.min (0.995, easy + rnd () * 0.05 + ti * 0.012),
			aioff: (rnd () - 0.5) * 2.4, fin: false, finT: 0, lapSt: 0, lap: -1, best: 0, place: g + 1, fireWait: 1, boxT: 0, bonkT: 0, mood: 0, brake: false });
	}
	G = { ti, demo, auto: demo || Q.has ('auto'), ships, me: ships[0], shots: [], fx: [], t: 0, raceT: 0, phase: 'count', cd: 3.99, lastBeep: 4,
		boxes: [], msg: '', msgT: 0, shake: 0, cam: { l: ships[0].lx * 0.6, h: 3.2, back: 8 }, doneT: 0, vmax: 92, lastPlace: 6, focus: 0, speedFx: 0 };
	for (let i = 0; i < N; i++) if (TR.kind[i] & 4) for (const ln of [-1, 0, 1]) G.boxes.push ({ i, s: (i + 0.5) * TR.seglen, l: ln * 3.2, wait: 0 });
	if (demo) { G.phase = 'race'; G.cd = 0; for (const s of G.ships) s.v = 40 + rnd () * 20; }
}
const playing = () => G && !G.demo && screen === 'play' && !paused;
const human = (s) => s.human && !G.auto;

function step (dt)
{
	G.t += dt;
	if (G.phase === 'count')
	{
		G.cd -= dt;
		if (Math.floor (G.cd) < G.lastBeep && G.cd > 0) { G.lastBeep = Math.floor (G.cd); Snd.play ('beep'); }
		if (G.cd <= 0) { G.phase = 'race'; Snd.play ('go'); say (tr ('go'), 1); for (const s of G.ships) if (!s.human) s.v = 4; }
	}
	else G.raceT += dt;
	for (const s of G.ships)
	{
		if (G.phase === 'count') { s.steer = 0; s.thrust = 0; continue; }
		if (s.human && !G.auto && !s.fin) controls (s, dt); else think (s, dt);
	}
	physics (dt);
	shots (dt);
	for (const b of G.boxes) if (b.wait > 0) b.wait -= dt;
	for (const f of G.fx) f.life -= dt;
	G.fx = G.fx.filter ((f) => f.life > 0);
	if (G.msgT > 0) G.msgT -= dt;
	if (G.shake > 0) G.shake -= dt;
	// the camera follows the craft watched, softly (its side, its height)
	const me = G.ships[G.focus], k = Math.min (1, dt * 5);
	G.cam.l += (me.lx * 0.6 - G.cam.l) * k;
	G.cam.h += (3.1 + me.v * 0.006 - G.cam.h) * k;
	G.speedFx += ((me.turbo > 0 ? 1 : 0) - G.speedFx) * Math.min (1, dt * 4);
	if (G.demo) { if (G.t > 25) { G.focus = (G.focus + 1) % NSHIP; G.t = 0; } if (G.raceT > 140) startDemo (); return; }
	// a pass, the end
	if (G.phase === 'race' && G.me.place < G.lastPlace && G.raceT > 2) Snd.play ('pass');
	G.lastPlace = G.me.place;
	if (G.phase === 'race' && G.me.fin)
	{
		G.phase = 'done'; G.doneT = 0; Snd.play ('finish'); say (tr ('finish'), 2.5); musicFor ();
		for (let i = 0; i < 40; i++) G.fx.push ({ k: 'conf', x: Math.random (), y: -Math.random () * 0.3, vx: (Math.random () - 0.5) * 0.2, vy: 0.2 + Math.random () * 0.3, c: ['#FF5A5F', '#FFD23F', '#3DD68C', '#3FA7FF', '#A66CFF'][i % 5], life: 3, rot: Math.random () * 6 });
	}
	if (G.phase === 'done')
	{
		G.doneT += dt;
		if (G.doneT > 3 && screen === 'play') results ();
	}
}
function say (txt, secs) { G.msg = txt; G.msgT = secs || 1.2; }

// the player's controls
const IN = { l: false, r: false, down: false, pad: 0, padBrake: false, touch: new Map () };
function controls (s, dt)
{
	let st = (IN.r ? 1 : 0) - (IN.l ? 1 : 0) + IN.pad;
	for (const v of IN.touch.values ()) st += v;
	st = clamp (st, -1, 1);
	s.steer += (st - s.steer) * Math.min (1, dt * 10);
	s.brake = IN.down || IN.padBrake;
	s.thrust = s.brake ? 0 : 1;
}
// the computer's pilots (Antigrav's Think): the inside of the coming turn, around the craft ahead, the pads
function think (s, dt)
{
	if (s.fin && !s.human) { s.thrust = 0.6; }
	trackAt (s.s + 22 + s.v * 0.25, 0, 0);
	const ka = W.cv;
	let tg = clamp (ka * 70 + s.aioff, -HW + 1.6, HW - 1.6);
	for (const m of G.ships)
	{
		if (m === s) continue;
		const d = wrapD (m.s - s.s);
		if (d > 0 && d < 10 && Math.abs (m.lx - tg) < 2.2) tg = m.lx > 0 ? m.lx - 2.6 : m.lx + 2.6;
	}
	for (const sh of G.shots) if (sh.k === 'gum') { const d = wrapD (sh.s - s.s); if (d > 0 && d < 18 && Math.abs (sh.l - tg) < 1.8) tg = sh.l > 0 ? sh.l - 2.6 : sh.l + 2.6; }
	trackAt (s.s + 14, 0, 0);
	if ((W.kind & 2) || ((W.kind & 4) && !s.item)) tg = W.lane * 3;
	const st = clamp ((tg - s.lx) * 0.55 - s.vl * 0.3, -1, 1);
	s.steer += (st - s.steer) * Math.min (1, dt * 8);
	let lim = G.vmax * s.skill;
	if (Math.abs (ka) > 0.001) lim = Math.min (lim, Math.sqrt (62 / (0.1 * Math.abs (ka))));
	// a little rubber band around the player
	if (!G.demo && !s.human)
	{
		const d = s.s - G.me.s;
		if (d > 90) lim *= CFG.easy ? 0.88 : 0.94;
		if (d < -90) lim *= 1.06;
	}
	s.thrust = s.v < lim ? 1 : 0;
	if (s.v > lim) s.v -= (s.v - lim) * 1.2 * dt;
	if (s.item)
	{
		s.fireWait -= dt;
		if (s.fireWait < 0)
		{
			const w = s.item;
			if (w === 'shield' || w === 'turbo') useItem (s);
			else if (w === 'gum') { if (behind (s, 40)) useItem (s); }
			else if (ahead (s, 80)) useItem (s);
			s.fireWait = 0.4 + rnd () * 1.2;
		}
	}
}
function ahead (s, dmax)
{
	let best = null, bd = dmax;
	for (const m of G.ships) { if (m === s) continue; const d = wrapD (m.s - s.s); if (d > 0 && d < bd) { bd = d; best = m; } }
	return best;
}
function behind (s, dmax)
{
	let best = null, bd = dmax;
	for (const m of G.ships) { if (m === s) continue; const d = wrapD (s.s - m.s); if (d > 0 && d < bd) { bd = d; best = m; } }
	return best;
}
function physics (dt)
{
	const L = TR;
	for (const s of G.ships)
	{
		trackAt (s.s, s.lx, 0);
		const fty = W.fy, fcv = W.cv, kind = W.kind, lane = W.lane;
		let top = G.vmax * s.skill;
		if (s.turbo > 0) { top *= 1.45; s.turbo -= dt; if (s.turbo < 0) s.turbo = 0; }
		if (s.stuck > 0) { top *= 0.5; s.stuck -= dt; }
		if (s.thrust) s.v += (top - s.v) * 0.75 * dt * s.thrust;
		else s.v -= s.v * (s.brake ? 1.4 : 0.45) * dt;
		if (s.v > top) s.v -= (s.v - top) * 1.5 * dt;
		s.v -= fty * 18 * dt;
		if (s.v < 0) s.v = 0;
		s.vl += s.steer * 46 * dt - fcv * s.v * s.v * 0.085 * dt;
		s.vl -= s.vl * 3 * dt;
		s.lx += s.vl * dt;
		const lim = HW - 1.2;
		if (Math.abs (s.lx) > lim)
		{
			s.lx = lim * Math.sign (s.lx); s.vl = -s.vl * 0.4;
			s.v -= s.v * 1.6 * dt;
			if (s.bonkT <= 0 && s.v > 20) { s.bonkT = 0.6; if (s.human) { Snd.play ('bonk'); pow (s, tr ('bonk'), 'bonk'); G.shake = 0.15; } }
		}
		if (s.bonkT > 0) s.bonkT -= dt;
		const sold = s.s;
		s.s += s.v * dt;
		if (s.spin > 0) s.spin = Math.max (0, s.spin - dt * 1.2);
		if (s.shield > 0) s.shield = Math.max (0, s.shield - dt);
		if (s.mood > 0) s.mood -= dt;
		// a speed pad
		if ((kind & 2) && Math.abs (s.lx - lane * 3) < 1.8)
		{
			if (s.turbo < 0.5) { s.turbo = 0.5; s.v += 10; if (s.human) Snd.play ('boost'); }
		}
		// a lap
		const lap = Math.floor (s.s / L.tlen);
		if (lap > Math.floor (sold / L.tlen) && s.s > 0 && !s.fin)
		{
			const lt = G.raceT - s.lapSt;
			if (lap >= 1 && (!s.best || lt < s.best)) s.best = lt;
			s.lapSt = G.raceT; s.lap = lap;
			if (s.s >= LAPS * L.tlen) { s.fin = true; s.finT = G.raceT; }
			else if (s.human && lap >= 1) { if (lap === LAPS - 1) { Snd.play ('last'); say (tr ('lastLap'), 1.6); } else { Snd.play ('lap'); say (tr ('lap') + ' ' + (lap + 1) + ' / ' + LAPS, 1.2); } }
		}
	}
	// the ? boxes
	for (const b of G.boxes)
	{
		if (b.wait > 0) continue;
		for (const s of G.ships)
			if (Math.abs (wrapD (s.s - b.s)) < 2.2 && Math.abs (s.lx - b.l) < 1.8)
			{
				b.wait = 3;
				if (!s.item) { s.item = rollItem (s); s.fireWait = 0.6 + rnd () * 1.5; if (s.human) Snd.play ('box'); }
				break;
			}
	}
	// the craft against each other
	const S = G.ships;
	for (let a = 0; a < NSHIP - 1; a++)
		for (let b = a + 1; b < NSHIP; b++)
		{
			const A1 = S[a], B1 = S[b], d = wrapD (B1.s - A1.s);
			if (Math.abs (d) < 2.8 && Math.abs (B1.lx - A1.lx) < 2.2)
			{
				const push = (2.2 - Math.abs (B1.lx - A1.lx)) / 2 + 0.02;
				if (B1.lx >= A1.lx) { B1.lx += push; A1.lx -= push; } else { B1.lx -= push; A1.lx += push; }
				const x = A1.vl; A1.vl = B1.vl * 0.6; B1.vl = x * 0.6;
				if (d > 0) A1.v *= 0.985; else B1.v *= 0.985;
				if ((A1.human || B1.human) && A1.bonkT <= 0 && B1.bonkT <= 0) { Snd.play ('bump'); A1.bonkT = B1.bonkT = 0.4; }
			}
		}
	// the places
	for (const s of S)
	{
		s.place = 1;
		for (const m of S)
		{
			if (m === s) continue;
			if (m.fin && s.fin) { if (m.finT < s.finT) s.place++; }
			else if (m.fin) s.place++;
			else if (!s.fin && m.s > s.s) s.place++;
		}
	}
}
// what a ? box gives: the leaders get gum and bubbles, those behind rockets and turbos
function rollItem (s)
{
	const p = s.place, r = rnd ();
	if (p <= 2) return r < 0.45 ? 'gum' : r < 0.75 ? 'shield' : r < 0.9 ? 'rocket' : 'turbo';
	if (p >= 5) return r < 0.45 ? 'turbo' : r < 0.85 ? 'rocket' : 'shield';
	return ITEMS[Math.floor (r * 4)];
}
function useItem (s)
{
	const w = s.item;
	if (!w) return;
	s.item = null;
	if (w === 'rocket')
	{
		const tgt = ahead (s, 160);
		G.shots.push ({ k: 'rocket', s: s.s + 3, l: s.lx, v: s.v + 60, own: s, tgt, life: 4 });
		if (s.human) Snd.play ('rocket');
	}
	else if (w === 'gum') { G.shots.push ({ k: 'gum', s: s.s - 3.5, l: s.lx, v: 0, own: s, life: 40, age: 0 }); if (s.human) Snd.play ('gum'); }
	else if (w === 'shield') { s.shield = 6; if (s.human) Snd.play ('shield'); }
	else if (w === 'turbo') { s.turbo = 1.8; s.v += 22; if (s.human) Snd.play ('turbo'); }
}
function shots (dt)
{
	for (const p of G.shots)
	{
		p.life -= dt;
		if (p.k === 'gum') { p.age += dt; }
		else
		{
			p.s += p.v * dt;
			if (p.tgt) p.l += Math.sign (p.tgt.lx - p.l) * Math.min (Math.abs (p.tgt.lx - p.l), 12 * dt);
			if (Math.abs (p.l) > HW - 0.6) p.life = 0;
		}
		for (const s of G.ships)
		{
			if (p.life <= 0) break;
			if (s === p.own && (p.k !== 'gum' || p.age < 0.6)) continue;
			if (Math.abs (wrapD (s.s - p.s)) < 2 && Math.abs (s.lx - p.l) < 1.5)
			{
				p.life = 0;
				hit (s, p.k);
			}
		}
	}
	G.shots = G.shots.filter ((p) => p.life > 0);
}
function hit (s, k)
{
	const seen = Math.abs (wrapD (s.s - G.ships[G.focus].s)) < 120;
	if (s.shield > 0) { s.shield = 0; if (seen) { Snd.play ('pop'); pow (s, tr ('pop'), 'pop'); } return; }
	if (k === 'gum') { s.stuck = 1.6; s.v *= 0.55; s.mood = 1.5; if (seen) { Snd.play ('splat'); pow (s, tr ('splat'), 'splat'); } }
	else { s.v *= 0.35; s.spin = 1; s.vl += (rnd () - 0.5) * 20; s.mood = 1.5; if (seen) { Snd.play ('pow'); pow (s, tr ('pow'), 'pow'); } }
	if (s.human) G.shake = 0.35;
}
function pow (s, txt, kind) { G.fx.push ({ k: 'pow', ship: s, txt, kind, life: 0.8, max: 0.8 }); }

// ---- the picture: a camera, the track from far to near ----------------------------------------------------------
const cv = $('cv');
const g = cv.getContext ('2d');
let VW = 0, VH = 0, DPR = 1, safe = { t: 0, l: 0, r: 0, b: 0 };
function layout ()
{
	VW = window.innerWidth; VH = window.innerHeight;
	DPR = Math.min (touchUI ? 1.5 : 2, window.devicePixelRatio || 1);
	cv.width = Math.round (VW * DPR); cv.height = Math.round (VH * DPR);
	const r = $('safe').getBoundingClientRect ();
	safe = { t: r.top, l: r.left, r: VW - r.right, b: VH - r.bottom };
	const bp = $('btPause'), sz = 46;
	bp.style.width = bp.style.height = sz + 'px';
	bp.style.left = Math.round (VW - safe.r - 10 - sz) + 'px'; bp.style.top = Math.round (safe.t + 10) + 'px';
}
const C = { ex: 0, ey: 0, ez: 0, rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, fx: 0, fy: 0, fz: -1, F: 500, cx: 0, cy: 0 };
const NEAR = 0.6;
function setCamera ()
{
	const me = G.ships[G.focus], cm = G.cam;
	trackAt (me.s - cm.back, cm.l, cm.h);
	let ex = W.x, ey = W.y, ez = W.z;
	const tux = W.ux, tuy = W.uy, tuz = W.uz;
	trackAt (me.s + 10, cm.l * 0.8, 1.1);
	if (G.shake > 0 && !CFG.reduced) { const a = G.shake * 1.2; ex += (Math.random () - 0.5) * a; ey += (Math.random () - 0.5) * a; }
	let fx = W.x - ex, fy = W.y - ey, fz = W.z - ez, l = Math.hypot (fx, fy, fz); fx /= l; fy /= l; fz /= l;
	const roll = CFG.reduced ? 0 : 0.8;
	let hx = tux * roll, hy = 1 - roll + tuy * roll, hz = tuz * roll;
	let rx = fy * hz - fz * hy, ry = fz * hx - fx * hz, rz = fx * hy - fy * hx; l = Math.hypot (rx, ry, rz); rx /= l; ry /= l; rz /= l;
	Object.assign (C, { ex, ey, ez, fx, fy, fz, rx, ry, rz, ux: ry * fz - rz * fy, uy: rz * fx - rx * fz, uz: rx * fy - ry * fx });
	// (a tall phone: a narrower view, the horizon higher, the craft bigger)
	const tall = VH > VW * 1.2;
	C.F = (tall ? VW * 1.05 : Math.min (VH * 0.78, VW * 0.62)) * (1 - G.speedFx * 0.08);
	C.cx = VW / 2; C.cy = VH * (tall ? 0.4 : 0.5);
}
// a point into the camera's space: [x right, y up, z ahead]
const CP = new Float64Array (3);
function toCam (x, y, z)
{
	const dx = x - C.ex, dy = y - C.ey, dz = z - C.ez;
	CP[0] = dx * C.rx + dy * C.ry + dz * C.rz; CP[1] = dx * C.ux + dy * C.uy + dz * C.uz; CP[2] = dx * C.fx + dy * C.fy + dz * C.fz;
}
// polygons: points added in the world (or on the track), clipped at the near plane, filled
const PB = new Float64Array (3 * 32), QB = new Float64Array (3 * 40);
let pn = 0;
function pReset () { pn = 0; }
function pAdd (x, y, z) { toCam (x, y, z); PB[pn * 3] = CP[0]; PB[pn * 3 + 1] = CP[1]; PB[pn * 3 + 2] = CP[2]; pn++; }
function pTrack (i, d, h) { const L = TR; pAdd (L.px[i] + L.rx[i] * d + L.ux[i] * h, L.py[i] + L.ry[i] * d + L.uy[i] * h, L.pz[i] + L.rz[i] * d + L.uz[i] * h); }
function pPath ()
{
	let n = 0;
	for (let a = 0; a < pn; a++)
	{
		const b = (a + 1) % pn, za = PB[a * 3 + 2], zb = PB[b * 3 + 2];
		if (za >= NEAR) { QB[n * 3] = PB[a * 3]; QB[n * 3 + 1] = PB[a * 3 + 1]; QB[n * 3 + 2] = za; n++; }
		if ((za >= NEAR) !== (zb >= NEAR))
		{
			const f = (NEAR - za) / (zb - za);
			QB[n * 3] = PB[a * 3] + (PB[b * 3] - PB[a * 3]) * f; QB[n * 3 + 1] = PB[a * 3 + 1] + (PB[b * 3 + 1] - PB[a * 3 + 1]) * f; QB[n * 3 + 2] = NEAR; n++;
		}
	}
	if (n < 3) return false;
	g.beginPath ();
	for (let k = 0; k < n; k++)
	{
		const z = QB[k * 3 + 2], sx = C.cx + QB[k * 3] / z * C.F, sy = C.cy - QB[k * 3 + 1] / z * C.F;
		if (k) g.lineTo (sx, sy); else g.moveTo (sx, sy);
	}
	g.closePath ();
	return true;
}
function pFill (fill, ink, lw) { if (!pPath ()) return; g.fillStyle = fill; g.fill (); if (ink) { g.strokeStyle = ink; g.lineWidth = lw; g.stroke (); } }
// a line between two world points (clipped), its width in world units
function wLine (x0, y0, z0, x1, y1, z1, col, wu, minPx)
{
	toCam (x0, y0, z0); let ax = CP[0], ay = CP[1], az = CP[2];
	toCam (x1, y1, z1); let bx = CP[0], by = CP[1], bz = CP[2];
	if (az < NEAR && bz < NEAR) return;
	if (az < NEAR) { const f = (NEAR - az) / (bz - az); ax += (bx - ax) * f; ay += (by - ay) * f; az = NEAR; }
	if (bz < NEAR) { const f = (NEAR - bz) / (az - bz); bx += (ax - bx) * f; by += (ay - by) * f; bz = NEAR; }
	g.strokeStyle = col; g.lineWidth = Math.min (6, Math.max (minPx || 1, wu * C.F / Math.min (az, bz)));
	g.beginPath (); g.moveTo (C.cx + ax / az * C.F, C.cy - ay / az * C.F); g.lineTo (C.cx + bx / bz * C.F, C.cy - by / bz * C.F); g.stroke ();
}
// where a world point lands: P.x P.y (pixels), P.k (pixels a unit there), false behind
const P = { x: 0, y: 0, k: 0, z: 0 };
function project (x, y, z)
{
	toCam (x, y, z);
	if (CP[2] < NEAR) return false;
	P.z = CP[2]; P.k = C.F / CP[2]; P.x = C.cx + CP[0] * P.k; P.y = C.cy - CP[1] * P.k;
	return true;
}

// the sky, the backdrop on the horizon (it turns with the heading, it tilts with the camera), the ground
function drawSky (t)
{
	const th = TR.th;
	let fhx = C.fx, fhz = C.fz; const fl = Math.hypot (fhx, fhz) || 1; fhx /= fl; fhz /= fl;
	const rhx = -fhz, rhz = fhx;
	const pd = (x, y, z) => { const a = x * C.rx + y * C.ry + z * C.rz, b = x * C.ux + y * C.uy + z * C.uz, c = x * C.fx + y * C.fy + z * C.fz; return [C.cx + a / c * C.F, C.cy - b / c * C.F]; };
	const h0 = pd (fhx, 0, fhz), h1 = pd (fhx + rhx * 0.3, 0, fhz + rhz * 0.3);
	const ang = Math.atan2 (h1[1] - h0[1], h1[0] - h0[0]);
	const yaw = Math.atan2 (fhx, -fhz);
	const R = Math.hypot (VW, VH);
	g.save ();
	g.translate (h0[0], h0[1]); g.rotate (ang);
	const sky = g.createLinearGradient (0, -R * 0.9, 0, 0);
	sky.addColorStop (0, th.skyTop); sky.addColorStop (1, th.skyBot);
	g.fillStyle = sky; g.fillRect (-R, -R * 2, R * 2, R * 2);
	if (th.night) { g.fillStyle = '#FFFFFF'; for (let i = 0; i < 90; i++) { const a = ((i * 2.399) % TAU), e = ((i * 0.618) % 1) * 0.9 + 0.05; const x = Math.tan (wrapA (a - yaw)) * C.F; if (Math.abs (wrapA (a - yaw)) < 1.3 && Math.abs (x) < R) { const s = 1 + (i % 3) * 0.6 + 0.6 * Math.sin (t * 2 + i); g.fillRect (x, -e * R * 0.8, s, s); } } }
	if (A.drawSkyThing) { const a = wrapA (0.9 - yaw); if (Math.abs (a) < 1.2) { g.save (); g.translate (Math.tan (a) * C.F, -C.F * 0.32); A.drawSkyThing (g, th, { r: Math.max (26, C.F * 0.09), t, ink: 3 }); g.restore (); } }
	// clouds far away
	if (!th.night) for (let i = 0; i < 9; i++)
	{
		const a = wrapA (i * 0.7 + 0.3 - yaw), x = Math.tan (a) * C.F;
		if (Math.abs (a) > 1.25 || Math.abs (x) > R) continue;
		const y = -C.F * (0.16 + (i % 3) * 0.08), s = C.F * (0.009 + (i % 2) * 0.005);
		g.save (); g.translate (x + Math.sin (t * 0.1 + i) * 6, y); g.scale (s, s);
		if (A.drawDeco) A.drawDeco (g, 'cloud', { ink: 2.6 / s, t, seed: (i * 0.37) % 1, tint: th.cloud });
		g.restore ();
	}
	if (A.drawBackdrop) A.drawBackdrop (g, th, { yaw, F: C.F, x0: -R, x1: R, ink: 3, t });
	// the ground: below the horizon, darker far away
	const gr = g.createLinearGradient (0, 0, 0, R);
	gr.addColorStop (0, th.groundFar || th.ground); gr.addColorStop (0.25, th.ground); gr.addColorStop (1, th.ground);
	g.fillStyle = gr; g.fillRect (-R, 0, R * 2, R * 2);
	g.strokeStyle = OL; g.lineWidth = 3; g.beginPath (); g.moveTo (-R, 0); g.lineTo (R, 0); g.stroke ();
	g.restore ();
}
const wrapA = (a) => a - TAU * Math.floor ((a + Math.PI) / TAU);

// a segment: the slab and the pillars under it, the floor, its kerbs and lines, the pads, the walls
function drawSegment (i, k, t)
{
	const L = TR, j = i + 1, c = L.FOG[Math.max (0, Math.min (L.FOG.length - 1, k))], ink = c.ink;
	toCam (L.px[i], L.py[i], L.pz[i]);
	const zc = Math.max (NEAR, CP[2]), lw = Math.max (1, Math.min (5, 0.13 * C.F / zc));
	const near = k < 40;
	// a pillar down to the ground (every 8 segments, not in tunnels)
	if (i % 8 === 4 && L.th.pillar && !L.th.night)
	{
		const x = L.px[i], y = L.py[i] - 0.9, z = L.pz[i], rx = L.rx[i], rz = L.rz[i];
		pReset (); pAdd (x - rx * 0.9, y, z - rz * 0.9); pAdd (x + rx * 0.9, y, z + rz * 0.9); pAdd (x + rx * 0.9, L.groundY, z + rz * 0.9); pAdd (x - rx * 0.9, L.groundY, z - rz * 0.9);
		pFill (c.pillar, ink, lw);
	}
	// the slab's sides (seen from outside the turns)
	for (const sd of [-1, 1])
	{
		pReset (); pTrack (i, sd * (HW + 0.45), WALLH); pTrack (j, sd * (HW + 0.45), WALLH); pTrack (j, sd * (HW + 0.45), -1); pTrack (i, sd * (HW + 0.45), -1);
		pFill (c.skirt, ink, lw);
	}
	// the floor
	const band = Math.floor (i / 3) % 2;
	pReset (); pTrack (i, -HW, 0); pTrack (i, HW, 0); pTrack (j, HW, 0); pTrack (j, -HW, 0);
	pFill (band ? c.track1 : c.track2);
	if (i === 0) { for (let q = 0; q < 8; q++) { pReset (); const a = -HW + q * HW / 4; pTrack (i, a, 0.01); pTrack (i, a + HW / 4, 0.01); pTrack (i + 1, a + HW / 4, 0.01); pTrack (i + 1, a, 0.01); pFill (q % 2 ? '#FFFFFF' : OL); } }
	if (near)
	{
		// the kerbs, the lane dashes
		const rb = Math.floor (i / 2) % 2 ? c.rumbleA : c.rumbleB;
		pReset (); pTrack (i, -HW, 0.01); pTrack (i, -HW + 0.9, 0.01); pTrack (j, -HW + 0.9, 0.01); pTrack (j, -HW, 0.01); pFill (rb);
		pReset (); pTrack (i, HW - 0.9, 0.01); pTrack (i, HW, 0.01); pTrack (j, HW, 0.01); pTrack (j, HW - 0.9, 0.01); pFill (rb);
		if (i % 4 < 2) for (const d of [-HW / 3, HW / 3]) { pReset (); pTrack (i, d - 0.15, 0.01); pTrack (i, d + 0.15, 0.01); pTrack (j, d + 0.15, 0.01); pTrack (j, d - 0.15, 0.01); pFill (c.line); }
	}
	// a speed pad: chevrons
	if (L.kind[i] & 2) drawPad (i, k, t);
	// the walls (their inner faces), their tops, the ink along them
	for (const sd of [-1, 1])
	{
		pReset (); pTrack (i, sd * HW, 0); pTrack (j, sd * HW, 0); pTrack (j, sd * HW, WALLH); pTrack (i, sd * HW, WALLH);
		pFill ((i % 2) ? c.wall : c.wall, null);
		pReset (); pTrack (i, sd * HW, WALLH); pTrack (j, sd * HW, WALLH); pTrack (j, sd * (HW + 0.45), WALLH); pTrack (i, sd * (HW + 0.45), WALLH);
		pFill (c.wallTop);
		const a = sd * HW;
		wLine (L.px[i] + L.rx[i] * a + L.ux[i] * WALLH, L.py[i] + L.ry[i] * a + L.uy[i] * WALLH, L.pz[i] + L.rz[i] * a + L.uz[i] * WALLH,
			L.px[j] + L.rx[j] * a + L.ux[j] * WALLH, L.py[j] + L.ry[j] * a + L.uy[j] * WALLH, L.pz[j] + L.rz[j] * a + L.uz[j] * WALLH, ink, 0.13, 1);
		if (near) wLine (L.px[i] + L.rx[i] * a, L.py[i] + L.ry[i] * a, L.pz[i] + L.rz[i] * a, L.px[j] + L.rx[j] * a, L.py[j] + L.ry[j] * a, L.pz[j] + L.rz[j] * a, ink, 0.08, 1);
		if (i % 2 === 0 && near) wLine (L.px[i] + L.rx[i] * a, L.py[i] + L.ry[i] * a, L.pz[i] + L.rz[i] * a, L.px[i] + L.rx[i] * a + L.ux[i] * WALLH, L.py[i] + L.ry[i] * a + L.uy[i] * WALLH, L.pz[i] + L.rz[i] * a + L.uz[i] * WALLH, ink, 0.06, 1);
	}
}
function drawPad (i, k, t)
{
	const L = TR, c = L.FOG[Math.min (L.FOG.length - 1, Math.max (0, k))], a = L.lane[i] * 3 - 1.5;
	pReset (); pTrack (i, a, 0.02); pTrack (i, a + 3, 0.02); pTrack (i + 1, a + 3, 0.02); pTrack (i + 1, a, 0.02);
	pFill (k > 40 ? c.line : '#1B5FD9', c.ink, 1.5);
	// chevrons (pointing ahead), blinking along
	for (let q = 0; q < 2; q++)
	{
		const on = (Math.floor (t * 8) + q) % 2 === 0;
		const s0 = i * L.seglen + q * L.seglen / 2, s1 = s0 + L.seglen * 0.45;
		pReset ();
		trackAt (s0, a + 0.4, 0.03); pAdd (W.x, W.y, W.z); trackAt (s1, a + 1.5, 0.03); pAdd (W.x, W.y, W.z); trackAt (s0, a + 2.6, 0.03); pAdd (W.x, W.y, W.z);
		trackAt (s0 + 0.9, a + 2.6, 0.03); pAdd (W.x, W.y, W.z); trackAt (s1 + 0.9, a + 1.5, 0.03); pAdd (W.x, W.y, W.z); trackAt (s0 + 0.9, a + 0.4, 0.03); pAdd (W.x, W.y, W.z);
		pFill (on ? '#7FF3FF' : '#3FA7FF');
	}
}
// a tunnel's vault over the segment (striped panels), drawn after what is in it
function drawVault (i, k)
{
	const L = TR, c = L.FOG[Math.min (L.FOG.length - 1, Math.max (0, k))], j = i + 1;
	toCam (L.px[i], L.py[i], L.pz[i]);
	const lw = Math.max (1, Math.min (5, 0.13 * C.F / Math.max (NEAR, CP[2])));
	for (let q = 0; q < 5; q++)
	{
		const a0 = q * Math.PI / 5, a1 = (q + 1) * Math.PI / 5;
		const d0 = -(HW + 0.45) * Math.cos (a0), h0 = WALLH + 6 * Math.sin (a0), d1 = -(HW + 0.45) * Math.cos (a1), h1 = WALLH + 6 * Math.sin (a1);
		pReset (); pTrack (i, d0, h0); pTrack (i, d1, h1); pTrack (j, d1, h1); pTrack (j, d0, h0);
		pFill ((Math.floor (i / 2) + q) % 2 ? c.tunnel1 : c.tunnel2);
	}
	// the ink of a ring at a tunnel's mouth and every 4 segments
	if (!(L.kind[(i + N - 1) % N] & 1) || i % 4 === 0)
	{
		let px0 = null;
		for (let q = 0; q <= 10; q++)
		{
			const a = q * Math.PI / 10, d = -(HW + 0.45) * Math.cos (a), h = WALLH + 6 * Math.sin (a);
			const x = L.px[i] + L.rx[i] * d + L.ux[i] * h, y = L.py[i] + L.ry[i] * d + L.uy[i] * h, z = L.pz[i] + L.rz[i] * d + L.uz[i] * h;
			if (px0) wLine (px0[0], px0[1], px0[2], x, y, z, c.ink, 0.25, lw);
			px0 = [x, y, z];
		}
	}
}
// an arch over the track: a rainbow (the start's: a chequered banner)
function drawArch (i, k)
{
	const L = TR, c = L.FOG[Math.min (L.FOG.length - 1, Math.max (0, k))];
	const pt = (d, h) => [L.px[i] + L.rx[i] * d + L.ux[i] * h, L.py[i] + L.ry[i] * d + L.uy[i] * h, L.pz[i] + L.rz[i] * d + L.uz[i] * h];
	if (i === 0)
	{
		for (const sd of [-1, 1])
		{
			pReset (); for (const [d, h] of [[sd * (HW + 0.3), 0], [sd * (HW + 1.1), 0], [sd * (HW + 1.1), 8], [sd * (HW + 0.3), 8]]) { const p = pt (d, h); pAdd (p[0], p[1], p[2]); }
			pFill ('#FFFFFF', c.ink, 2);
		}
		for (let q = 0; q < 12; q++) for (let r = 0; r < 2; r++)
		{
			const a = -HW - 1.1 + q * (2 * HW + 2.2) / 12, b = a + (2 * HW + 2.2) / 12, h = 6.4 + r * 0.8;
			pReset (); for (const [d, hh] of [[a, h], [b, h], [b, h + 0.8], [a, h + 0.8]]) { const p = pt (d, hh); pAdd (p[0], p[1], p[2]); }
			pFill ((q + r) % 2 ? '#FFFFFF' : OL);
		}
		pReset (); for (const [d, h] of [[-HW - 1.1, 6.4], [HW + 1.1, 6.4], [HW + 1.1, 8], [-HW - 1.1, 8]]) { const p = pt (d, h); pAdd (p[0], p[1], p[2]); }
		if (pPath ()) { g.strokeStyle = c.ink; g.lineWidth = 2.5; g.stroke (); }
		return;
	}
	const cols = c.arch;
	for (let b = 0; b < cols.length; b++)
	{
		const r0 = HW + 1.2 + b * 0.75, r1 = r0 + 0.75;
		for (let q = 0; q < 12; q++)
		{
			const a0 = q * Math.PI / 12, a1 = (q + 1) * Math.PI / 12;
			pReset ();
			let p = pt (-r0 * Math.cos (a0), r0 * Math.sin (a0) * 0.8); pAdd (p[0], p[1], p[2]);
			p = pt (-r0 * Math.cos (a1), r0 * Math.sin (a1) * 0.8); pAdd (p[0], p[1], p[2]);
			p = pt (-r1 * Math.cos (a1), r1 * Math.sin (a1) * 0.8); pAdd (p[0], p[1], p[2]);
			p = pt (-r1 * Math.cos (a0), r1 * Math.sin (a0) * 0.8); pAdd (p[0], p[1], p[2]);
			pFill (cols[cols.length - 1 - b], cols[cols.length - 1 - b], 1);
		}
	}
	// the ink along both edges
	for (const r of [HW + 1.2, HW + 1.2 + cols.length * 0.75])
	{
		let p0 = null;
		for (let q = 0; q <= 12; q++) { const a = q * Math.PI / 12, p = pt (-r * Math.cos (a), r * Math.sin (a) * 0.8); if (p0) wLine (p0[0], p0[1], p0[2], p[0], p[1], p[2], c.ink, 0.15, 1.5); p0 = p; }
	}
}
// the sprites: scenery, craft, boxes, shots -- each drawn with its segment
function sprite (fn, x, y, z, roll, minPx)
{
	if (!project (x, y, z)) return;
	if (P.x < -VW || P.x > VW * 2 || P.y < -VH || P.y > VH * 2) return;
	const k = P.k;
	if (k < (minPx || 0.6)) return;
	g.save (); g.translate (P.x, P.y); if (roll) g.rotate (roll); g.scale (k, k);
	g.lineJoin = 'round'; g.lineCap = 'round';
	fn (Math.max (k < 8 ? 0.7 : 1.3, Math.min (4, 0.11 * k)) / k, k);
	g.restore ();
}
function drawShipAt (s, t)
{
	const hov = 0.75 + 0.07 * Math.sin (t * 6 + s.n);
	trackAt (s.s, s.lx, 0);
	const ux = W.ux, uy = W.uy, uz = W.uz, bx = W.x, by = W.y, bz = W.z;
	// the shadow on the floor
	if (project (bx, by + 0.02, bz))
	{
		g.fillStyle = 'rgba(30,20,50,.35)'; g.beginPath (); g.ellipse (P.x, P.y, 1.3 * P.k, 0.42 * P.k, 0, 0, TAU); g.fill ();
	}
	const x = bx + ux * hov, y = by + uy * hov, z = bz + uz * hov;
	if (!project (x, y, z)) return;
	const sx = P.x, sy = P.y;
	if (!project (x + ux, y + uy, z + uz)) return;
	let roll = Math.atan2 (P.x - sx, sy - P.y) + s.steer * 0.25;
	if (s.spin > 0) roll += Math.sin (s.spin * 18) * 0.5 * s.spin;
	const pilot = A.PILOTS[s.pilot];
	sprite ((ink) => A.drawShip (g, pilot, { ink, t: t + s.n, lean: s.steer, thrust: s.thrust ? 1 : 0.3, turbo: s.turbo > 0, shield: s.shield > 0, spin: s.spin, stuck: s.stuck > 0 }), x, y, z, roll, 0.5);
}
function drawWorld (t)
{
	const L = TR, me = G.ships[G.focus];
	drawSky (t);
	const camS = me.s - G.cam.back, c0 = Math.floor (camS / L.seglen) - 1;
	// what stands on each segment
	const ON = [];
	for (let k = 0; k <= VD; k++) ON.push (null);
	// (d: how far ahead of the camera along the track; the segment it is on)
	const put = (d, o) => { const k = Math.floor ((camS + d) / L.seglen) - c0; if (k >= 0 && k <= VD) (ON[k] || (ON[k] = [])).push (o); o.z = d; };
	for (const s of G.ships) put (wrapD (s.s - camS), { f: () => drawShipAt (s, t) });
	for (const b of G.boxes) if (b.wait <= 0) put (wrapD (b.s - camS), { f: () => { trackAt (b.s, b.l, 1.3 + 0.2 * Math.sin (t * 3 + b.l)); sprite ((ink) => A.drawBox (g, { ink, t: t + b.l }), W.x, W.y, W.z); } });
	for (const p of G.shots)
	{
		const d = wrapD (p.s - camS);
		if (p.k === 'gum') put (d, { f: () => { const hh = p.age < 0.4 ? 1.2 * (1 - p.age / 0.4) : 0; trackAt (p.s, p.l, 0.05 + hh); sprite ((ink) => A.drawGum (g, { ink, t, flying: hh > 0 }), W.x, W.y, W.z); } });
		else put (d, { f: () => { trackAt (p.s, p.l, 0.8); sprite ((ink) => A.drawRocket (g, { ink, t }), W.x, W.y, W.z); } });
	}
	for (let k = VD; k >= 0; k--)
	{
		const i = ((c0 + k) % N + N) % N;
		drawSegment (i, k, t);
		// the scenery standing by this segment
		for (const d of L.deco[i])
		{
			sprite ((ink, kk) => A.drawDeco (g, d.kind, { ink, t, seed: d.seed }), d.x, d.y, d.z, 0, 0.12);
		}
		const on = ON[k];
		if (on) { on.sort ((a, b) => b.z - a.z); for (const o of on) o.f (); }
		if (L.kind[i] & 1) drawVault (i, k);
		if (L.kind[i] & 8) drawArch (i, k);
	}
}

// ---- what is written over the picture ---------------------------------------------------------------------------
function otext (txt, x, y, size, fill, align, lw)
{
	g.font = '900 ' + Math.round (size) + 'px ' + FONT; g.textAlign = align || 'center'; g.textBaseline = 'middle';
	g.lineJoin = 'round'; g.lineWidth = lw || Math.max (3, size * 0.16); g.strokeStyle = OL; g.strokeText (txt, x, y);
	g.fillStyle = fill; g.fillText (txt, x, y);
}
function panel (x, y, w, h, r)
{
	g.beginPath (); g.roundRect (x, y, w, h, r || 12);
	g.fillStyle = 'rgba(255,253,248,.92)'; g.fill (); g.lineWidth = 3; g.strokeStyle = OL; g.stroke ();
}
const itemBtn = { x: 0, y: 0, r: 0 };
function drawHUD (t)
{
	const me = G.me, u = Math.max (0.75, Math.min (1.3, Math.min (VW, VH) / 520));
	const x0 = safe.l + 10, y0 = safe.t + 10;
	// the place
	const pl = placeName (me.place);
	otext (pl, x0 + 4, y0 + 30 * u, 52 * u, me.place === 1 ? '#FFD23F' : me.place <= 3 ? '#FFFFFF' : '#FFB3B3', 'left');
	otext ('/ ' + NSHIP, x0 + 8 + g.measureText (pl).width, y0 + 40 * u, 20 * u, '#FFFFFF', 'left');
	// the lap and the time
	const lap = clamp (me.lap + 1, 1, LAPS);
	otext (tr ('lap') + ' ' + lap + '/' + LAPS, x0 + 4, y0 + 74 * u, 22 * u, '#FFFFFF', 'left');
	otext (clock (G.raceT), x0 + 4, y0 + 100 * u, 18 * u, '#FFFFFF', 'left');
	// the item: a slot at the top (keyboard), a big button at the bottom (touch)
	const r = (touchUI ? 40 : 30) * u;
	itemBtn.x = touchUI ? VW / 2 : VW / 2; itemBtn.y = touchUI ? VH - safe.b - r - 18 : y0 + r + 2; itemBtn.r = r;
	g.save (); g.translate (itemBtn.x, itemBtn.y);
	g.beginPath (); g.arc (0, 0, r, 0, TAU); g.fillStyle = me.item ? 'rgba(255,253,248,.95)' : 'rgba(255,253,248,.45)'; g.fill (); g.lineWidth = 3.5; g.strokeStyle = OL; g.stroke ();
	if (me.item) { const b = 1 + 0.06 * Math.sin (t * 8); g.scale (b, b); g.lineJoin = 'round'; g.lineCap = 'round'; A.drawItemIcon (g, me.item, r * 0.72); }
	else { g.fillStyle = 'rgba(43,35,64,.35)'; g.font = '900 ' + Math.round (r) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText ('?', 0, 2); }
	g.restore ();
	// the speed
	const sw = 150 * u, sh = 14 * u, sx = VW - safe.r - 14 - sw, sy = VH - safe.b - 16 - sh;
	if (!touchUI || VW > 600)
	{
		g.beginPath (); g.roundRect (sx, sy, sw, sh, sh / 2); g.fillStyle = 'rgba(43,35,64,.5)'; g.fill ();
		const f = clamp (me.v / (G.vmax * 1.45), 0, 1);
		g.beginPath (); g.roundRect (sx, sy, Math.max (sh, sw * f), sh, sh / 2); g.fillStyle = me.turbo > 0 ? '#FF9F1C' : '#3DD68C'; g.fill ();
		g.lineWidth = 3; g.strokeStyle = OL; g.beginPath (); g.roundRect (sx, sy, sw, sh, sh / 2); g.stroke ();
		otext (Math.round (me.v * 2.6) + ' km/h', sx + sw, sy - 14 * u, 16 * u, '#FFFFFF', 'right');
	}
	// the little map, the racers on it
	const mr = 46 * u, mx = VW - safe.r - 14 - mr, my = safe.t + 66 + mr;
	g.save (); g.translate (mx, my);
	g.lineJoin = 'round';
	g.beginPath (); TR.mm.forEach (([x, y], i) => { if (i) g.lineTo (x * mr, y * mr); else g.moveTo (x * mr, y * mr); });
	g.strokeStyle = OL; g.lineWidth = 8; g.stroke (); g.strokeStyle = '#FFFDF8'; g.lineWidth = 4; g.stroke ();
	const order = G.ships.slice ().sort ((a, b) => (a === me) - (b === me));
	for (const s of order)
	{
		trackAt (s.s, 0, 0);
		const i = W.seg, k = Math.floor (i / 6), f = (i % 6) / 6, a = TR.mm[k], b = TR.mm[Math.min (TR.mm.length - 1, k + 1)];
		const x = (a[0] + (b[0] - a[0]) * f) * mr, y = (a[1] + (b[1] - a[1]) * f) * mr;
		g.beginPath (); g.arc (x, y, s === me ? 6 : 4.5, 0, TAU); g.fillStyle = A.PILOTS[s.pilot].c1; g.fill (); g.lineWidth = 2; g.strokeStyle = OL; g.stroke ();
	}
	g.restore ();
	// the standings: faces in order
	const byPlace = G.ships.slice ().sort ((a, b) => a.place - b.place), fr = 13 * u;
	for (let q = 0; q < byPlace.length; q++)
	{
		const s = byPlace[q], fy = my + mr + 22 * u + q * (fr * 2 + 4);
		g.save (); g.translate (VW - safe.r - 14 - fr, fy);
		if (s === me) { g.beginPath (); g.arc (0, 0, fr + 4, 0, TAU); g.fillStyle = '#FFD23F'; g.fill (); }
		g.lineJoin = 'round'; g.lineCap = 'round';
		g.scale (fr, fr); A.drawFace (g, A.PILOTS[s.pilot], 1, s.mood > 0 ? 'ouch' : s.place === 1 ? 'win' : 'happy', 2.2 / fr);
		g.restore ();
		otext (String (q + 1), VW - safe.r - 14 - fr * 2 - 10, fy, 14 * u, '#FFFFFF', 'right', 3);
	}
	// the countdown, the words in the middle
	if (G.phase === 'count')
	{
		const n = Math.ceil (G.cd), f = G.cd - Math.floor (G.cd);
		otext (String (n), VW / 2, VH * 0.38, (90 + 50 * f) * u, ['#3DD68C', '#FFD23F', '#FF9F1C', '#FF5A5F'][n] || '#FFF', 'center', 10);
	}
	if (G.msgT > 0)
	{
		const a = Math.min (1, G.msgT * 3), sc = 1 + Math.max (0, (G.msgT - 0.9)) * 0.6;
		g.save (); g.globalAlpha = a; g.translate (VW / 2, VH * 0.36); g.rotate (-0.05); g.scale (sc, sc);
		otext (G.msg, 0, 0, 58 * u, G.phase === 'done' ? '#FFD23F' : '#FFFFFF', 'center', 9);
		g.restore ();
	}
	// touch: the steering halves
	if (touchUI && G.phase !== 'done')
	{
		g.globalAlpha = 0.3;
		for (const sd of [-1, 1])
		{
			const x = sd < 0 ? safe.l + 44 : VW - safe.r - 44, y = VH - safe.b - 58;
			g.beginPath (); g.arc (x, y, 30, 0, TAU); g.fillStyle = '#FFFDF8'; g.fill (); g.lineWidth = 3; g.strokeStyle = OL; g.stroke ();
			g.beginPath (); g.moveTo (x + sd * 12, y); g.lineTo (x - sd * 8, y - 13); g.lineTo (x - sd * 8, y + 13); g.closePath (); g.fillStyle = OL; g.fill ();
		}
		g.globalAlpha = 1;
	}
}
function drawFx (t)
{
	// speed lines in a turbo
	if (G.speedFx > 0.05 && !CFG.reduced)
	{
		g.save (); g.globalAlpha = G.speedFx * 0.6; g.strokeStyle = '#FFFFFF'; g.lineCap = 'round';
		for (let i = 0; i < 18; i++)
		{
			const a = i * 2.39 + Math.floor (t * 20) * 0.7, r0 = Math.hypot (VW, VH) * (0.32 + ((i * 37 + Math.floor (t * 30)) % 10) / 40);
			g.lineWidth = 2 + (i % 3);
			g.beginPath (); g.moveTo (C.cx + Math.cos (a) * r0, C.cy + Math.sin (a) * r0); g.lineTo (C.cx + Math.cos (a) * r0 * 1.35, C.cy + Math.sin (a) * r0 * 1.35); g.stroke ();
		}
		g.restore ();
	}
	for (const f of G.fx)
	{
		if (f.k === 'pow')
		{
			const s = f.ship;
			trackAt (s.s, s.lx, 2.6);
			if (!project (W.x, W.y, W.z)) continue;
			const a = 1 - f.life / f.max, sz = Math.min (90, VW * 0.14, Math.max (28, P.k * 2.2)) * (a < 0.2 ? a / 0.2 : 1);
			g.save (); g.translate (P.x, P.y - a * 20); g.globalAlpha = f.life < 0.25 ? f.life / 0.25 : 1; g.lineJoin = 'round';
			A.drawPow (g, f.txt, sz, t);
			g.restore ();
		}
		else if (f.k === 'conf')
		{
			const age = 3 - f.life, x = (f.x + f.vx * age) * VW, y = (f.y + f.vy * age) * VH;
			g.save (); g.translate (x, y); g.rotate (f.rot + age * 5); g.fillStyle = f.c; g.fillRect (-5, -3, 10, 6); g.restore ();
		}
	}
}
function draw (t)
{
	g.setTransform (DPR, 0, 0, DPR, 0, 0);
	if (!G) { g.fillStyle = '#5EC8FF'; g.fillRect (0, 0, VW, VH); return; }
	setCamera ();
	g.lineJoin = 'round'; g.lineCap = 'round';
	drawWorld (t);
	drawFx (t);
	if (!G.demo && screen !== 'title') drawHUD (t);
}

// ---- the screens ------------------------------------------------------------------------------------------------
function show (name)
{
	screen = name;
	document.querySelectorAll ('.screen').forEach ((s) => s.classList.toggle ('on', s.id === 'scr' + name[0].toUpperCase () + name.slice (1)));
	$('btPause').classList.toggle ('on', name === 'play');
	if (name === 'title') titleBest ();
	if (name === 'select') buildSelect ();
	if (name === 'how') buildHow ();
	if (name !== 'play') Snd.engine (false);
	musicFor ();
	const s = document.querySelector ('.screen.on');
	const b = s && (s.querySelector ('.kbtn.big') || s.querySelector ('.tile.next') || s.querySelector ('.tile:not(.locked)') || s.querySelector ('.kbtn'));
	if (b && !touchUI) setTimeout (() => b.focus ({ preventScroll: true }), 30);
}
function titleBest ()
{
	const n = prog.stars.reduce ((a, b) => a + (b | 0), 0);
	$('bestTitle').textContent = n ? tr ('allStars', { n }) : '';
}
function startDemo () { newRace (Math.floor (Math.random () * NTRACK), Math.floor (Math.random () * 6), true); paused = false; }
function play (ti)
{
	Snd.init ();
	newRace (ti, prog.pilot | 0, false);
	paused = false;
	show ('play');
}
function pause ()
{
	if (!playing () || G.phase === 'done') return;
	paused = true; show ('pause');
}
function resume () { if (screen !== 'pause') return; paused = false; show ('play'); }
function menu () { paused = false; startDemo (); show ('title'); }
function results ()
{
	const me = G.me, ti = G.ti;
	// those still racing: their time guessed from where they are
	for (const s of G.ships) if (!s.fin) s.finT = G.raceT + (LAPS * TR.tlen - s.s) / (s.v + 40);
	const order = G.ships.slice ().sort ((a, b) => a.finT - b.finT);
	const place = order.indexOf (me) + 1;
	const stars = place === 1 ? 3 : place <= 3 ? 2 : 1;
	const old = prog.stars[ti] | 0;
	prog.stars[ti] = Math.max (old, stars);
	let rec = false;
	if (!prog.best[ti] || me.finT < prog.best[ti]) { rec = !!prog.best[ti]; prog.best[ti] = me.finT; }
	let opened = false;
	if (place <= 3 && prog.unlocked < NTRACK && prog.unlocked === ti + 1) { prog.unlocked = ti + 2; opened = true; }
	store.set ('progress', prog);
	$('resTitle').textContent = place === 1 ? tr ('win') : place <= 3 ? tr ('podium') : tr ('done');
	$('resTitle').classList.toggle ('red', place > 3);
	$('resName').textContent = tr ('circuit', { n: ti + 1 }) + ' · ' + theme (TRACKS[ti].theme).name[lang ()];
	const tb = $('resRank'); tb.innerHTML = '';
	order.forEach ((s, q) =>
	{
		const tr0 = document.createElement ('tr'); if (s === me) tr0.className = 'me';
		const p = A.PILOTS[s.pilot];
		const td = (h) => { const c = document.createElement ('td'); if (typeof h === 'string') c.textContent = h; else c.append (...h); tr0.appendChild (c); return c; };
		td (placeName (q + 1));
		td ([faceCanvas (p, q === 0 ? 'win' : 'happy', 26), document.createTextNode (p.name[lang ()])]);
		td (clock (s.finT));
		tb.appendChild (tr0);
	});
	$('resNote').textContent = (me.best ? tr ('bestLap', { t: clock (me.best) }) + ' · ' : '') + tr ('bestTime', { t: clock (prog.best[ti]) }) + (opened ? '\n' + tr ('opened') : place > 3 && prog.unlocked === ti + 1 && ti < NTRACK - 1 ? '\n' + tr ('unlockNote') : '');
	$('resNote').style.whiteSpace = 'pre-line';
	$('resRecord').classList.toggle ('on', rec);
	const canNext = ti + 1 < prog.unlocked && ti < NTRACK - 1;
	$('btNext').style.display = canNext ? '' : 'none';
	const st = $('resStars').children;
	for (let i = 0; i < 3; i++) st[i].className = 'star' + (i === 1 ? ' mid' : '');
	show ('results');
	Snd.engine (false);
	for (let i = 0; i < 3; i++) setTimeout (() => { if (screen !== 'results') return; if (i < stars) { st[i].classList.add ('on', 'pop'); Snd.play ('star'); } }, 350 + i * 220);
	live (placeName (place) + ' — ' + stars + ' ★');
}
function live (s) { $('live').textContent = s; }
function faceCanvas (p, mood, px)
{
	const c = document.createElement ('canvas'); c.width = c.height = px * 2;
	const gg = c.getContext ('2d'); gg.translate (px, px); gg.scale (px * 0.86, px * 0.86); gg.lineJoin = 'round'; gg.lineCap = 'round';
	A.drawFace (gg, p, 1, mood, 2.4 / (px * 0.86));
	return c;
}
function buildSelect ()
{
	const box = $('pilots'); box.innerHTML = '';
	A.PILOTS.forEach ((p, i) =>
	{
		const b = document.createElement ('button'); b.type = 'button'; b.className = 'pilot';
		b.setAttribute ('aria-pressed', String (i === (prog.pilot | 0)));
		b.setAttribute ('aria-label', p.name[lang ()]);
		b.append (faceCanvas (p, i === (prog.pilot | 0) ? 'win' : 'happy', 32));
		const sp = document.createElement ('span'); sp.textContent = p.name[lang ()]; b.append (sp);
		b.addEventListener ('click', () => { prog.pilot = i; store.set ('progress', prog); buildSelect (); });
		box.appendChild (b);
	});
	$('pilotName').textContent = A.PILOTS[prog.pilot | 0].name[lang ()];
	const tb = $('tracks'); tb.innerHTML = '';
	const lock = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="#7A8794" stroke="#2B2340" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#2B2340" stroke-width="2.4"/></svg>';
	TRACKS.forEach ((D, i) =>
	{
		const th = theme (D.theme), open = i < prog.unlocked, st = prog.stars[i] | 0;
		const b = document.createElement ('button'); b.type = 'button';
		b.className = 'tile' + (open ? '' : ' locked') + (open && i === prog.unlocked - 1 && !st ? ' next' : '');
		b.style.setProperty ('--c', th.track1);
		if (open)
		{
			const c = document.createElement ('canvas'); c.width = 240; c.height = 92;
			const gg = c.getContext ('2d'), gr = gg.createLinearGradient (0, 0, 0, 92);
			gr.addColorStop (0, th.skyTop); gr.addColorStop (0.55, th.skyBot); gr.addColorStop (0.55, th.ground); gr.addColorStop (1, th.ground);
			gg.fillStyle = gr; gg.fillRect (0, 0, 240, 92);
			gg.beginPath (); gg.moveTo (60, 92); gg.lineTo (112, 50); gg.lineTo (128, 50); gg.lineTo (180, 92); gg.fillStyle = th.track1; gg.fill (); gg.lineWidth = 3; gg.strokeStyle = OL; gg.stroke ();
			const nm = th.name[lang ()];
			b.innerHTML = '<small>' + Site.esc (nm) + '</small><span class="mini">' + [0, 1, 2].map ((k) => '<i class="star' + (k < st ? ' on' : '') + '"></i>').join ('') + '</span>';
			b.prepend (c);
			b.setAttribute ('aria-label', tr ('circuit', { n: i + 1 }) + ' — ' + nm + ' — ' + st + ' ★');
			b.addEventListener ('click', () => play (i));
		}
		else { b.innerHTML = '<b>' + (i + 1) + '</b>' + lock; b.disabled = true; b.setAttribute ('aria-label', tr ('circuit', { n: i + 1 }) + ' — ' + tr ('locked')); }
		tb.appendChild (b);
	});
}
function buildHow ()
{
	$('howText').textContent = tr (touchUI ? 'howTouch' : 'howKeys');
	const ul = $('legendItems'); ul.innerHTML = '';
	for (const [it, key] of [['rocket', 'iRocket'], ['gum', 'iGum'], ['shield', 'iShield'], ['turbo', 'iTurbo']])
	{
		const li = document.createElement ('li'), c = document.createElement ('canvas'); c.className = 'ico'; c.width = c.height = 72;
		const gg = c.getContext ('2d'); gg.translate (36, 36); gg.lineJoin = 'round'; gg.lineCap = 'round'; A.drawItemIcon (gg, it, 30);
		const s = document.createElement ('span'); s.textContent = tr (key);
		li.append (c, s); ul.appendChild (li);
	}
}
function applyLang ()
{
	document.documentElement.lang = lang () ? 'fr' : 'en';
	document.querySelectorAll ('[data-k]').forEach ((el) => { el.textContent = tr (el.dataset.k); });
	document.querySelectorAll ('[data-kl]').forEach ((el) => { el.setAttribute ('aria-label', tr (el.dataset.kl)); el.title = tr (el.dataset.kl); });
	document.querySelectorAll ('.seg button').forEach ((b) => b.setAttribute ('aria-pressed', String ((b.dataset.lang === 'fr') === !!lang ())));
	if (screen === 'select') buildSelect ();
	if (screen === 'how') buildHow ();
	if (screen === 'title') titleBest ();
}
const SETS = [['setSound', 'sound'], ['setMusic', 'music'], ['setReduced', 'reduced'], ['setEasy', 'easy']];
function saveSettings ()
{
	for (const [id, k] of SETS) CFG[k] = $(id).checked;
	store.set ('settings', CFG);
	if (!CFG.sound) Snd.engine (false);
	musicFor ();
}

// ---- input ------------------------------------------------------------------------------------------------------
const KL = ['ArrowLeft', 'a', 'q'], KR = ['ArrowRight', 'd'], KD = ['ArrowDown', 's'], KF = [' ', 'Enter', 'Shift', 'x', 'Control'];
document.addEventListener ('keydown', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	if (playing ())
	{
		if (KL.includes (k)) { IN.l = true; e.preventDefault (); return; }
		if (KR.includes (k)) { IN.r = true; e.preventDefault (); return; }
		if (KD.includes (k)) { IN.down = true; e.preventDefault (); return; }
		if (KF.includes (k)) { e.preventDefault (); if (!e.repeat && G.phase === 'race') useItem (G.me); return; }
		if (k === 'ArrowUp' || k === 'w' || k === 'z') { e.preventDefault (); return; }
		if (k === 'p' || k === 'Escape') { e.preventDefault (); pause (); return; }
	}
	if ((k === 'p' || k === 'Escape') && screen === 'pause') { e.preventDefault (); resume (); return; }
	if (k === 'Escape' && screen !== 'title' && screen !== 'play') { e.preventDefault (); back (); }
});
document.addEventListener ('keyup', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	if (KL.includes (k)) IN.l = false;
	if (KR.includes (k)) IN.r = false;
	if (KD.includes (k)) IN.down = false;
});
function back ()
{
	if (screen === 'settings') { show (settingsFrom); return; }
	if (screen === 'pause') { resume (); return; }
	if (screen === 'results') { menu (); return; }
	show ('title');
}
// a finger (or the mouse): the item button, else hold a half to steer that way
cv.addEventListener ('pointerdown', (e) =>
{
	Snd.init ();
	if (!playing ()) return;
	if (Math.hypot (e.clientX - itemBtn.x, e.clientY - itemBtn.y) < itemBtn.r + 12) { if (G.phase === 'race') useItem (G.me); return; }
	IN.touch.set (e.pointerId, e.clientX < VW / 2 ? -1 : 1);
	try { cv.setPointerCapture (e.pointerId); } catch (er) { /* fine */ }
});
cv.addEventListener ('pointermove', (e) => { if (IN.touch.has (e.pointerId)) IN.touch.set (e.pointerId, e.clientX < VW / 2 ? -1 : 1); });
const endPtr = (e) => IN.touch.delete (e.pointerId);
cv.addEventListener ('pointerup', endPtr);
cv.addEventListener ('pointercancel', endPtr);
cv.addEventListener ('contextmenu', (e) => e.preventDefault ());
document.addEventListener ('touchmove', (e) => { if (screen === 'play') e.preventDefault (); }, { passive: false });
// the gamepad: the stick or the cross steers, A / X / RB use the item, B brakes, Start pauses
let padPrev = 0;
function pollPad ()
{
	const gps = navigator.getGamepads ? navigator.getGamepads () : [];
	let b = 0, ax = 0;
	for (const gp of gps)
	{
		if (!gp) continue;
		const bt = (i) => gp.buttons[i] && gp.buttons[i].pressed;
		const a = gp.axes[0] || 0;
		if (Math.abs (a) > 0.18) ax = a;
		if (bt (14)) ax = -1; if (bt (15)) ax = 1;
		if (bt (0) || bt (2) || bt (5) || bt (7)) b |= 1; if (bt (9)) b |= 2; if (bt (1) || bt (6)) b |= 4;
	}
	IN.pad = ax; IN.padBrake = !!(b & 4) && playing ();
	const pr = b & ~padPrev; padPrev = b;
	if (playing ()) { if ((pr & 1) && G.phase === 'race') useItem (G.me); if (pr & 2) pause (); return; }
	if (screen === 'pause' && (pr & 2)) { resume (); return; }
	if (pr & 1) { const s = document.querySelector ('.screen.on'), btn = s && (document.activeElement && s.contains (document.activeElement) ? document.activeElement : s.querySelector ('.kbtn.big')); if (btn) btn.click (); }
	if (pr & 4) back ();
}

// ---- the buttons ------------------------------------------------------------------------------------------------
document.addEventListener ('pointerdown', (e) => { if (e.target.closest && e.target.closest ('.kbtn, .tile, .pilot, .seg button, .toggle')) Snd.init (); }, { passive: true });
document.addEventListener ('click', (e) => { if (e.target.closest && e.target.closest ('.kbtn, .tile, .pilot, .seg button')) { if (Snd.ac && CFG.sound) Snd.tone ('sine', 600, 0, 0.03, 0.3); } });
$('btPlay').addEventListener ('click', () => show ('select'));
$('btHow').addEventListener ('click', () => show ('how'));
$('btSettings').addEventListener ('click', () => { settingsFrom = 'title'; show ('settings'); });
$('btSettings2').addEventListener ('click', () => { settingsFrom = 'pause'; show ('settings'); });
$('btSetBack').addEventListener ('click', () => show (settingsFrom));
$('btPause').addEventListener ('click', () => pause ());
$('btResume').addEventListener ('click', resume);
$('btRestart').addEventListener ('click', () => play (G.ti));
$('btRetry').addEventListener ('click', () => play (G.ti));
$('btNext').addEventListener ('click', () => play (Math.min (NTRACK - 1, G.ti + 1)));
document.querySelectorAll ('[data-go]').forEach ((b) => b.addEventListener ('click', () => { const go = b.dataset.go; if (go === 'menu') menu (); else show (go); }));
for (const [id, k] of SETS) { $(id).checked = !!CFG[k]; $(id).addEventListener ('change', saveSettings); }
document.querySelectorAll ('.seg button').forEach ((b) => b.addEventListener ('click', () => { if (window.Site) Site.setLang (b.dataset.lang); applyLang (); }));
if (window.Site) Site.onLang (applyLang);
document.addEventListener ('visibilitychange', () => { if (document.hidden) pause (); });
window.addEventListener ('blur', () => pause ());
window.addEventListener ('resize', layout);
if (window.visualViewport) visualViewport.addEventListener ('resize', layout);

// ---- the loop ---------------------------------------------------------------------------------------------------
let last = 0, acc = 0;
function update (ms)
{
	if (!G || (paused && !G.demo)) return;
	if (screen !== 'play' && !G.demo) return;
	acc += ms / 1000;
	let n = 0;
	while (acc >= DT && n < 12) { step (DT); acc -= DT; n++; }
	if (n >= 12) acc = 0;
	if (!G.demo) Snd.engine (G.phase !== 'done' && screen === 'play', G.me.v, G.me.turbo > 0);
}
function loop (ts)
{
	const ms = last ? Math.min (100, ts - last) : 16;
	last = ts;
	pollPad ();
	update (ms);
	draw (ts / 1000);
	requestAnimationFrame (loop);
}
// test hooks (tools/test-zoomo.js): the state, the simulation advanced by hand
window.Zoomo = { get G () { return G; }, get TR () { return TR; }, play, pause, resume, show, results, useItem, prog, TRACKS,
	step: (n) => { for (let i = 0; i < n && G; i++) { step (DT); if (screen !== 'play') break; } }, draw: () => draw (performance.now () / 1000), get screen () { return screen; } };

startDemo ();
layout ();
applyLang ();
if (Q.has ('track')) play (Math.max (0, Math.min (NTRACK - 1, (+Q.get ('track') || 1) - 1)));
requestAnimationFrame (loop);
}) ();
