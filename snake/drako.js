// drako.js -- DRAKO! The Hungry Wyrm: a cartoon snake for Code is Fun. Drako, a baby dragon-snake, gobbles the
// village gold back from the goblins: 5 villages and an endless mode, 5 items (coin, elixir, gem, shield, frost),
// goblins that steal the coins. Everything is drawn on the canvas, every sound is synthesized (WebAudio): no asset.
// Phones first: swipe anywhere (or the on-screen arrows), portrait or landscape; arrows / WASD / ZQSD on a
// computer; a gamepad. Test hooks: ?level=N, ?endless, ?auto (the AI plays), ?seed=N.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';

// ---- the words (EN | FR) ----------------------------------------------------------------------------------------
const T = {
	subtitle: ['The Hungry Wyrm', 'Le dragon glouton'], play: ['Play', 'Jouer'], endless: ['Endless', 'Sans fin'],
	settings: ['Settings', 'Réglages'], back: ['Back', 'Retour'], backSite: ['Back to Code is Fun', 'Retour à Code is Fun'],
	levelSelect: ['Choose a village', 'Choisis un village'], level: ['Level {n}', 'Niveau {n}'], locked: ['Locked', 'Verrouillé'],
	l1: ['Meadow', 'La Prairie'], l2: ['Barrel Yard', 'La Cour aux Tonneaux'], l3: ['Town Walls', 'Les Remparts'],
	l4: ['Tower Ring', 'Le Cercle des Tours'], l5: ['Goblin Keep', 'Le Fort Gobelin'],
	goal: ['Eat {n} coins!', 'Mange {n} pièces !'], swipeStart: ['Swipe to start!', 'Glisse pour commencer !'],
	keyStart: ['Press an arrow to start!', 'Appuie sur une flèche !'], score: ['Score', 'Score'], best: ['Best', 'Record'],
	coins: ['{a} / {b} coins', '{a} / {b} pièces'], combo: ['COMBO x{n}!', 'COMBO x{n} !'], paused: ['Paused', 'Pause'],
	resume: ['Resume', 'Reprendre'], restart: ['Restart', 'Recommencer'], menu: ['Menu', 'Menu'], gameOver: ['Oh no!', 'Oh non !'],
	retry: ['Retry', 'Rejouer'], levelDone: ['Village saved!', 'Village sauvé !'], allDone: ['All villages saved!', 'Tous les villages sont sauvés !'],
	next: ['Next', 'Suivant'], newRecord: ['New record!', 'Nouveau record !'], sound: ['Sound', 'Son'], music: ['Music', 'Musique'],
	dpad: ['On-screen arrows', 'Flèches à l\'écran'], vibration: ['Vibration', 'Vibration'], language: ['Language', 'Langue'],
	shield: ['Shield!', 'Bouclier !'], frost: ['Slow time!', 'Temps ralenti !'], rush: ['Elixir rush!', 'Élan d\'élixir !'],
	gem: ['Gem!', 'Gemme !'], goblinStole: ['The goblin stole a coin!', 'Le gobelin a volé une pièce !'],
	goblinEaten: ['Goblin gobbled!', 'Gobelin croqué !'], saved: ['Saved by the shield!', 'Sauvé par le bouclier !'],
	rotate: ['Paused — screen turned', 'Pause — écran tourné'], ok: ['OK!', 'OK !'], howBtn: ['How to play', 'Comment jouer'],
	howTo: ['Swipe or use the arrows to steer Drako. Eat the coins, avoid the walls and your own tail!',
		'Glisse ou utilise les flèches pour guider Drako. Mange les pièces, évite les murs et ta propre queue !'],
	lgCoin: ['Coin: +10, Drako grows', 'Pièce : +10, Drako grandit'], lgElixir: ['Elixir: +30, a rush (points x2)', 'Élixir : +30, points x2'],
	lgGem: ['Gem: +100', 'Gemme : +100'], lgShield: ['Shield: saves you from one crash', 'Bouclier : te sauve d\'un choc'],
	lgFrost: ['Hourglass: slows the time', 'Sablier : ralentit le temps'], lgGoblin: ['Goblin: steals coins — gobble it! +50', 'Gobelin : vole les pièces — croque-le ! +50'],
	lgCombo: ['Eat fast for a combo: up to x4!', 'Mange vite pour un combo : jusqu\'à x4 !'],
	coinsOf: ['{a} / {b} coins', '{a} / {b} pièces'], bestIs: ['Best: {n}', 'Record : {n}'], scoreIs: ['Score: {n}', 'Score : {n}'],
	starsFor: ['★★ {a} · ★★★ {b}', '★★ {a} · ★★★ {b}'], endlessGo: ['Endless', 'Sans fin'] };
const lang = () => (window.Site && Site.lang === 'fr') ? 1 : 0;
function tr (k, v) { let s = (T[k] || [k, k])[lang ()]; if (v) for (const n in v) s = s.split ('{' + n + '}').join (v[n]); return s; }

// ---- storage (every access may fail: private mode, blocked storage) ---------------------------------------------
const store = {
	get (k, d) { try { const v = localStorage.getItem ('codeisfun.snake.' + k); return v === null ? d : JSON.parse (v); } catch (e) { return d; } },
	set (k, v) { try { localStorage.setItem ('codeisfun.snake.' + k, JSON.stringify (v)); } catch (e) { /* this visit only */ } } };
const set0 = { sound: true, music: true, dpad: false, vibrate: true };
const CFG = Object.assign ({}, set0, store.get ('settings', {}));
const prog = Object.assign ({ stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0] }, store.get ('progress', {}));
let bestEndless = +store.get ('best', 0) || 0;

// ---- the villages -----------------------------------------------------------------------------------------------
const MAPS = [
	['...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '...............', '.......S.......', '...............', '...............', '...............', '...............', '...............'],
	['...............', '...............', '..##.......##..', '..#.........#..', '...............', '...............', '...............', '....###.###....', '...............', '...............', '...............', '...............', '....###.###....', '...............', '...............', '..#....S....#..', '..##.......##..', '...............', '...............', '...............', '...............'],
	['...............', '...............', '...............', '...............', '...............', '######...######', '...............', '...............', '...............', '.......#.......', '.......#.......', '...............', '...............', '######...######', '...............', '.......S.......', '...............', '...............', '...............', '...............', '...............'],
	['...............', '.#...........#.', '...............', '...............', '....#######....', '....#.....#....', '....#.....#....', '...............', '....#.....#....', '....#.....#....', '....###.###....', '...............', '...............', '.#...........#.', '...............', '.......S.......', '...............', '...............', '...............', '.#...........#.', '...............'],
	['...............', '.#.#.......#.#.', '...............', '.#...#####...#.', '.....#...#.....', '.....#...#.....', '...............', '##...........##', '.....#...#.....', '.....#...#.....', '.....##.##.....', '...............', '##...........##', '...............', '....#.....#....', '....#..S..#....', '....#.....#....', '...............', '.#.#.......#.#.', '...............', '...............']];
const LEVELS = [
	{ name: 'l1', tick: 220, goal: 12, s2: 180, s3: 260, kind: 5 },
	{ name: 'l2', tick: 200, goal: 15, s2: 240, s3: 340, kind: 1 },
	{ name: 'l3', tick: 185, goal: 18, s2: 300, s3: 430, kind: 2 },
	{ name: 'l4', tick: 170, goal: 20, s2: 360, s3: 520, kind: 3 },
	{ name: 'l5', tick: 160, goal: 25, s2: 480, s3: 700, kind: 4 } ];
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], TD = [3, 2, 1, 0];	// up right down left; TD: the direction transposed

// ---- the palette (the art direction) ----------------------------------------------------------------------------
const P = {
	outline: '#2A1A0E', ink: '#3B2412', grassA: '#7CC242', grassB: '#71B53A', grassDark: '#4E8A2A', grassLight: '#A6DC5E', tuft: '#5C9E30',
	wood: '#B0703A', woodLight: '#D79A55', woodDark: '#7A4A22', stoneLight: '#C9CFD6', stone: '#9AA3AD', stoneDark: '#68717C',
	gold: '#FFCC2E', goldLight: '#FFF09A', goldDark: '#D8930F', goldEdge: '#A8650A',
	elixir: '#E04BD6', elixirLight: '#FF9CF5', elixirDark: '#8E1F9A', gem: '#8C7BFF', gemLight: '#C8BEFF', gemDark: '#4433B8',
	ice: '#9BE3FF', iceDark: '#3B9BD0', danger: '#E8392E', textShadow: '#1E120A', goblin: '#7BCF3A', goblinDark: '#4E9A22' };
const SKIN = { body: '#52CC4A', body2: '#2F9A32', light: '#A8EE7A', belly: '#D8F27A', scale: '#2A8A2C', plate: '#FFB020', plateDark: '#D9800C', wing: '#FFB020', horn: '#FFF1C9' };
const FONT = '"Lilita One","Arial Black","Segoe UI Black",Impact,system-ui,sans-serif';
const reduced = matchMedia ('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia ('(pointer: coarse)').matches || 'ontouchstart' in window;
const Q = new URLSearchParams (location.search);

// a small seeded random (for the board's decoration), Math.random for the play
function rng (seed) { let r = seed % 2147483647 || 1; return () => (r = (r * 16807) % 2147483647) / 2147483647; }

// ---- the sound (WebAudio, synthesized) --------------------------------------------------------------------------
const Snd = {
	ctx: null, sfx: null, mus: null, musF: null, nb: null, next: 0, beat: 0, timer: 0,
	init ()
	{
		if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume (); return; }
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		try { this.ctx = new AC (); } catch (e) { return; }
		const c = this.ctx;
		this.sfx = c.createGain (); this.sfx.gain.value = 0.5; this.sfx.connect (c.destination);
		this.musF = c.createBiquadFilter (); this.musF.type = 'lowpass'; this.musF.frequency.value = 18000; this.musF.connect (c.destination);
		this.mus = c.createGain (); this.mus.gain.value = 0.12; this.mus.connect (this.musF);
		const n = c.sampleRate; this.nb = c.createBuffer (1, n, n);
		const d = this.nb.getChannelData (0); for (let i = 0; i < n; i++) d[i] = Math.random () * 2 - 1;
		this.timer = setInterval (() => this.schedule (), 25);
	},
	ok () { return this.ctx && CFG.sound && this.ctx.state === 'running'; },
	tone (f, dur, type, g, at, f2, out)
	{
		const c = this.ctx, t = c.currentTime + (at || 0);
		const o = c.createOscillator (), a = c.createGain ();
		o.type = type || 'square'; o.frequency.setValueAtTime (f, t);
		if (f2) o.frequency.exponentialRampToValueAtTime (f2, t + dur);
		a.gain.setValueAtTime (0.0001, t); a.gain.exponentialRampToValueAtTime (g || 0.15, t + 0.006);
		a.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		o.connect (a); a.connect (out || this.sfx); o.start (t); o.stop (t + dur + 0.03);
		return o;
	},
	noise (dur, freq, type, g, at, out)
	{
		const c = this.ctx, t = c.currentTime + (at || 0);
		const s = c.createBufferSource (), f = c.createBiquadFilter (), a = c.createGain ();
		s.buffer = this.nb; f.type = type || 'lowpass'; f.frequency.value = freq || 1000;
		a.gain.setValueAtTime (g || 0.2, t); a.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		s.connect (f); f.connect (a); a.connect (out || this.sfx); s.start (t, Math.random () * 0.5); s.stop (t + dur + 0.02);
	},
	play (name, k)
	{
		if (!this.ok ()) return;
		const st = Math.pow (2, Math.min (8, k || 0) / 12);
		switch (name)
		{
		case 'coin': this.tone (988 * st, 0.06, 'square', 0.12); this.tone (1319 * st, 0.12, 'square', 0.12, 0.06); break;
		case 'elixir': { const o = this.tone (400, 0.3, 'sine', 0.22, 0, 1200); const l = this.ctx.createOscillator (), lg = this.ctx.createGain ();
			l.frequency.value = 18; lg.gain.value = 40; l.connect (lg); lg.connect (o.frequency); l.start (); l.stop (this.ctx.currentTime + 0.35); break; }
		case 'gem': [1568, 2093, 2637].forEach ((f, i) => { this.tone (f, 0.12, 'triangle', 0.16, i * 0.07); this.tone (f, 0.12, 'triangle', 0.05, i * 0.07 + 0.25); }); break;
		case 'power': [523, 659, 784, 1047].forEach ((f, i) => this.tone (f, 0.08, 'square', 0.1, i * 0.05)); break;
		case 'frost': this.play ('power'); this.noise (0.4, 6000, 'bandpass', 0.15, 0.1); break;
		case 'thud': this.tone (120, 0.18, 'sine', 0.35, 0, 60); this.noise (0.07, 800, 'lowpass', 0.3); break;
		case 'laugh': for (let i = 0; i < 3; i++) this.tone (500, 0.08, 'sawtooth', 0.08, i * 0.11, 420); break;
		case 'chomp': this.noise (0.08, 1500, 'lowpass', 0.35); this.tone (300, 0.16, 'sine', 0.25, 0.02, 150); break;
		case 'turn': this.tone (1800, 0.015, 'sine', 0.04); break;
		case 'death': this.tone (440, 0.6, 'sawtooth', 0.18, 0, 80); this.noise (0.35, 900, 'lowpass', 0.25, 0.25); break;
		case 'fanfare': [392, 523, 659, 784].forEach ((f, i) => { this.tone (f, 0.13, 'square', 0.09, i * 0.12); this.tone (f, 0.13, 'triangle', 0.12, i * 0.12); });
			this.tone (1047, 0.45, 'square', 0.09, 0.48); this.tone (1047, 0.45, 'triangle', 0.14, 0.48); break;
		case 'ding': this.tone (2093, 0.25, 'triangle', 0.18); this.tone (3136, 0.18, 'sine', 0.05); break;
		case 'tap': this.tone (660, 0.04, 'sine', 0.12); this.noise (0.012, 3000, 'highpass', 0.12); break;
		case 'poof': this.noise (0.18, 1200, 'bandpass', 0.18); break;
		case 'ready': this.tone (660, 0.09, 'square', 0.1); break;
		case 'go': this.tone (990, 0.14, 'square', 0.1); break;
		}
	},
	// the music: a lute-like loop in D Dorian, 112 BPM, 8 bars of eighths
	MEL: [62, 0, 65, 69, 67, 65, 64, 0, 62, 0, 57, 0, 62, 64, 65, 0, 67, 0, 69, 71, 72, 71, 69, 0, 67, 65, 64, 0, 62, 0, 0, 0,
		69, 0, 72, 69, 67, 0, 69, 0, 65, 67, 69, 0, 64, 0, 62, 0, 71, 0, 69, 67, 65, 0, 67, 69, 74, 0, 72, 69, 62, 0, 0, 0],
	BASS: [38, 45, 43, 38, 45, 41, 43, 38],
	schedule ()
	{
		const c = this.ctx;
		if (!c || c.state !== 'running') return;
		const want = CFG.music && G && !G.demo && G.state === 'play' && !paused;
		if (!want) { this.next = 0; return; }
		const rate = G.rush > 0 ? 1.06 : 1;
		this.musF.frequency.setTargetAtTime (G.frost > 0 ? 900 : 18000, c.currentTime, 0.1);
		const e = 60 / 112 / 2 / rate;
		if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
		while (this.next < c.currentTime + 0.12)
		{
			const i = this.beat % 64, t = this.next - c.currentTime;
			const m = this.MEL[i];
			if (m) this.tone (440 * Math.pow (2, (m - 69) / 12), 0.16, 'triangle', 0.5, t, 0, this.mus);
			if (i % 4 === 0) this.tone (440 * Math.pow (2, (this.BASS[i >> 3] - 69) / 12), 0.22, 'square', 0.35, t, 0, this.mus);
			this.noise (0.03, 7000, 'highpass', i % 2 ? 0.08 : 0.15, t, this.mus);
			this.beat++; this.next += e;
		}
	} };
function buzz (p) { const ua = navigator.userActivation; if (CFG.vibrate && navigator.vibrate && (!ua || ua.hasBeenActive)) try { navigator.vibrate (p); } catch (e) { /* (refused) */ } }

// ---- the canvas, the layout -------------------------------------------------------------------------------------
const cv = document.getElementById ('cv'), ctx = cv.getContext ('2d');
let VW = 0, VH = 0, DPR = 1, S = 24, OL = 2, F = 19, bx = 0, by = 0, board = null, hudBottom = 60, land = false;
const SAFE = { t: 0, b: 0, l: 0, r: 0 };
function layout ()
{
	VW = window.innerWidth; VH = window.innerHeight;
	DPR = Math.min (2, window.devicePixelRatio || 1);
	cv.width = Math.round (VW * DPR); cv.height = Math.round (VH * DPR);
	const r = document.getElementById ('safe').getBoundingClientRect ();
	SAFE.t = r.top; SAFE.l = r.left; SAFE.r = VW - r.right; SAFE.b = VH - r.bottom;
	land = VW > VH;
	if (G && G.land !== land) { transpose (); if (G.state === 'play' && !G.demo && !G.waiting) pause (tr ('rotate')); }
	const dp = document.getElementById ('dpad');
	const showPad = !!(CFG.dpad && G && !G.demo);
	dp.classList.toggle ('on', showPad); dp.classList.toggle ('side', land);
	const { top, bottom, left, right, k } = region (showPad);
	if (showPad) dp.style.setProperty ('--k', k + 'px');
	const cols = G ? G.cols : land ? 21 : 15, rows = G ? G.rows : land ? 15 : 21;
	S = Math.floor (Math.min ((right - left) / (cols + 1.7), (bottom - top) / (rows + 1.7)));
	S = Math.max (10, Math.min (S, 40));
	F = Math.round (S * 0.8); OL = Math.max (2, S * 0.09);
	bx = Math.round ((left + right) / 2 - cols * S / 2);
	by = Math.round ((top + bottom) / 2 - rows * S / 2);
	if (G) bake ();
}
// the board's room on the screen (below the HUD, beside the arrows)
function region (pad)
{
	hudBottom = SAFE.t + 8 + 48;
	let top = hudBottom + 6, bottom = VH - SAFE.b - 8, left = SAFE.l + 8, right = VW - SAFE.r - 8, k = 0;
	if (pad)
	{
		k = Math.max (48, Math.min (66, Math.floor ((land ? VH : VW) / 7)));
		if (land) right -= 3 * k + 8 + 18; else bottom -= 3 * k + 8 + 16;
	}
	return { top, bottom, left, right, k };
}
// a tall (or wide) screen gets more rows (columns in landscape), up to 6 more, so that the board fills it; the village's
// map stays in the middle
function extraRows ()
{
	const r = region (CFG.dpad);
	const long = land ? r.right - r.left : r.bottom - r.top, short = land ? r.bottom - r.top : r.right - r.left;
	const s = Math.min (short / 16.7, long / 22.7, 40);
	return Math.max (0, Math.min (6, Math.floor (long / s - 1.7) - 21));
}

// ---- drawing helpers --------------------------------------------------------------------------------------------
function rr (g, x, y, w, h, r) { g.beginPath (); if (g.roundRect) g.roundRect (x, y, w, h, r); else g.rect (x, y, w, h); }
function circle (g, x, y, r) { g.beginPath (); g.arc (x, y, Math.max (0.1, r), 0, 7); }
function ellipse (g, x, y, rx, ry, a) { g.beginPath (); g.ellipse (x, y, Math.max (0.1, rx), Math.max (0.1, ry), a || 0, 0, 7); }
function starPath (g, x, y, R, r, n, rot)
{
	g.beginPath ();
	for (let i = 0; i < 2 * n; i++) { const a = (rot || 0) - Math.PI / 2 + i * Math.PI / n, d = i & 1 ? r : R; g.lineTo (x + Math.cos (a) * d, y + Math.sin (a) * d); }
	g.closePath ();
}
function shadow (g, x, y, s) { g.fillStyle = 'rgba(0,0,0,.22)'; ellipse (g, x + s * 0.04, y + s * 0.36, s * 0.32, s * 0.1); g.fill (); }
function outlined (g, fill, lw) { g.fillStyle = fill; g.fill (); g.lineWidth = lw || OL; g.strokeStyle = P.outline; g.stroke (); }
function glossy (g, x, y, rx, ry, a, al) { g.fillStyle = 'rgba(255,255,255,' + (al || 0.5) + ')'; ellipse (g, x, y, rx, ry, a); g.fill (); }

// ---- the board, baked once (grass, decorations, frame, obstacles) -----------------------------------------------
function bake ()
{
	const W = G.cols * S + 2 * F, H = G.rows * S + 2 * F;
	board = board || document.createElement ('canvas');
	board.width = Math.ceil (W * DPR); board.height = Math.ceil (H * DPR);
	const g = board.getContext ('2d');
	g.setTransform (DPR, 0, 0, DPR, 0, 0); g.clearRect (0, 0, W, H);
	g.lineJoin = 'round'; g.lineCap = 'round';
	frame (g, W, H);
	g.save (); g.translate (F, F);
	for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) { g.fillStyle = (x + y) & 1 ? P.grassB : P.grassA; g.fillRect (x * S, y * S, S, S); }
	const v = g.createRadialGradient (G.cols * S / 2, G.rows * S / 2, S * 2, G.cols * S / 2, G.rows * S / 2, Math.max (G.cols, G.rows) * S * 0.7);
	v.addColorStop (0, 'rgba(255,255,200,.08)'); v.addColorStop (1, 'rgba(30,60,0,.25)');
	g.fillStyle = v; g.fillRect (0, 0, G.cols * S, G.rows * S);
	const rnd = rng (1234 + G.seed);
	for (let i = 0; i < G.cols * G.rows * 0.22; i++)
	{
		const x = rnd () * G.cols * S, y = rnd () * G.rows * S, k = rnd ();
		if (k < 0.6) tuft (g, x, y, S * (0.25 + rnd () * 0.15));
		else if (k < 0.85) flower (g, x, y, S * 0.1, ['#FFFFFF', '#FFE14D', '#FF7AB8'][rnd () * 3 | 0]);
		else pebble (g, x, y, S * 0.09);
	}
	g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect (0, 0, G.cols * S, S * 0.16);	// the frame's shadow on the grass
	// obstacles, top to bottom (so that a tower's roof goes over the row above)
	for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++)
	{
		const k = G.obst[y * G.cols + x];
		if (k) obstacle (g, k, x, y);
	}
	g.restore ();
}
function frame (g, W, H)
{
	rr (g, 1, 1, W - 2, H - 2, F * 0.6); g.fillStyle = P.stoneDark; g.fill (); g.lineWidth = Math.max (2, F * 0.12); g.strokeStyle = P.outline; g.stroke ();
	const B = F * 1.5;
	const block = (x, y, w, h) =>
	{
		if (w < 4 || h < 4) return;
		rr (g, x + 1.5, y + 1.5, w - 3, h - 3, F * 0.2); g.fillStyle = P.stone; g.fill ();
		g.fillStyle = P.stoneLight; g.fillRect (x + 4, y + 3.5, w - 8, Math.max (1, h * 0.22));
		g.lineWidth = Math.max (1.5, F * 0.09); g.strokeStyle = P.outline; rr (g, x + 1.5, y + 1.5, w - 3, h - 3, F * 0.2); g.stroke ();
	};
	const nx = Math.max (1, Math.round ((W - 2 * F) / B)), bw = (W - 2 * F) / nx;
	block (0, 0, F, F); block (W - F, 0, F, F); block (0, H - F, F, F); block (W - F, H - F, F, F);
	for (let i = 0; i < nx; i++) { block (F + i * bw, 0, bw, F); block (F + i * bw, H - F, bw, F); }
	const ny = Math.max (1, Math.round ((H - 2 * F) / B)), bh = (H - 2 * F) / ny;
	for (let j = 0; j < ny; j++) { block (0, F + j * bh, F, bh); block (W - F, F + j * bh, F, bh); }
	// gold studs on the corners
	for (const [x, y] of [[F / 2, F / 2], [W - F / 2, F / 2], [F / 2, H - F / 2], [W - F / 2, H - F / 2]])
	{ circle (g, x, y, F * 0.22); outlined (g, P.gold, Math.max (1.5, F * 0.08)); glossy (g, x - F * 0.06, y - F * 0.08, F * 0.08, F * 0.05); }
}
function tuft (g, x, y, h)
{
	g.strokeStyle = P.tuft; g.lineWidth = h * 0.18;
	for (const a of [-0.5, 0, 0.45]) { g.beginPath (); g.moveTo (x, y); g.quadraticCurveTo (x + a * h * 0.4, y - h * 0.5, x + a * h, y - h); g.stroke (); }
}
function flower (g, x, y, r, c)
{
	g.fillStyle = c;
	for (let i = 0; i < 5; i++) { const a = i * 1.2566; circle (g, x + Math.cos (a) * r, y + Math.sin (a) * r, r * 0.7); g.fill (); }
	g.fillStyle = '#FFB020'; circle (g, x, y, r * 0.55); g.fill ();
}
function pebble (g, x, y, r) { g.fillStyle = P.stone; ellipse (g, x, y, r * 1.3, r); g.fill (); g.fillStyle = P.stoneLight; ellipse (g, x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.3); g.fill (); }

// obstacles: 1 barrel, 2 stone wall, 3 tower, 4 goblin palisade, 5 bush
function obstacle (g, k, x, y)
{
	const cx = (x + 0.5) * S, cy = (y + 0.5) * S;
	const n = (dx, dy) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < G.cols && Y < G.rows && G.obst[Y * G.cols + X] === k; };
	if (k === 1) drawBarrel (g, cx, cy, S);
	else if (k === 5) drawBush (g, cx, cy, S);
	else if (k === 2)	// stone blocks, joined to their neighbours
	{
		g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect (x * S + S * 0.08, y * S + S * 0.2, S, S);
		const l = n (-1, 0) ? 0 : S * 0.06, r = n (1, 0) ? 0 : S * 0.06, t = n (0, -1) ? 0 : S * 0.04;
		rr (g, x * S + l, y * S + t - S * 0.12, S - l - r, S - t, S * 0.12); outlined (g, P.stone);
		g.fillStyle = P.stoneLight; g.fillRect (x * S + l + S * 0.1, y * S + t - S * 0.04, S - l - r - S * 0.2, S * 0.16);
		g.strokeStyle = P.stoneDark; g.lineWidth = OL * 0.6; g.beginPath ();
		g.moveTo (x * S + l + S * 0.08, cy); g.lineTo (x * S + S - r - S * 0.08, cy);
		g.moveTo (cx + ((x + y) & 1 ? -S * 0.2 : S * 0.2), cy); g.lineTo (cx + ((x + y) & 1 ? -S * 0.2 : S * 0.2), y * S + S * 0.82); g.stroke ();
	}
	else if (k === 3)	// a little tower: stone body, red cone roof, a flag
	{
		shadow (g, cx, cy, S * 1.1);
		rr (g, cx - S * 0.36, cy - S * 0.3, S * 0.72, S * 0.72, S * 0.08); outlined (g, P.stone);
		g.fillStyle = P.stoneDark; g.fillRect (cx - S * 0.1, cy + S * 0.08, S * 0.2, S * 0.3);
		g.beginPath (); g.moveTo (cx - S * 0.46, cy - S * 0.26); g.lineTo (cx, cy - S * 0.95); g.lineTo (cx + S * 0.46, cy - S * 0.26); g.closePath ();
		outlined (g, '#D9452F');
		g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath (); g.moveTo (cx - S * 0.3, cy - S * 0.32); g.lineTo (cx - S * 0.04, cy - S * 0.8); g.lineTo (cx - S * 0.12, cy - S * 0.32); g.fill ();
		g.strokeStyle = P.outline; g.lineWidth = OL * 0.7; g.beginPath (); g.moveTo (cx, cy - S * 0.95); g.lineTo (cx, cy - S * 1.2); g.stroke ();
		g.beginPath (); g.moveTo (cx, cy - S * 1.2); g.lineTo (cx + S * 0.28, cy - S * 1.12); g.lineTo (cx, cy - S * 1.04); g.closePath (); outlined (g, P.gold, OL * 0.6);
	}
	else if (k === 4)	// dark wooden stakes
	{
		g.fillStyle = 'rgba(0,0,0,.25)'; ellipse (g, cx + S * 0.05, cy + S * 0.38, S * 0.45, S * 0.12); g.fill ();
		for (const o of [-0.28, 0, 0.28])
		{
			const sx = cx + o * S, h = S * (o === 0 ? 0.95 : 0.8);
			g.beginPath (); g.moveTo (sx - S * 0.13, cy + S * 0.4); g.lineTo (sx - S * 0.13, cy + S * 0.4 - h + S * 0.15);
			g.lineTo (sx, cy + S * 0.4 - h); g.lineTo (sx + S * 0.13, cy + S * 0.4 - h + S * 0.15); g.lineTo (sx + S * 0.13, cy + S * 0.4); g.closePath ();
			outlined (g, o === 0 ? P.woodDark : '#6A3E1A', OL * 0.8);
		}
		g.fillStyle = '#4A2A10'; g.fillRect (cx - S * 0.42, cy + S * 0.05, S * 0.84, S * 0.1);
	}
}

// ---- items, goblin ---------------------------------------------------------------------------------------------
function bob (t, s) { return Math.sin (t * 4) * s * 0.05; }
function drawCoin (c, x, y, s, t)
{
	shadow (c, x, y, s);
	const sq = Math.max (0.4, Math.abs (Math.cos (t * 2.6))), r = s * 0.4, yy = y + bob (t, s);
	c.save (); c.translate (x, yy); c.scale (sq, 1);
	circle (c, 0, 0, r); c.fillStyle = P.goldDark; c.fill (); c.lineWidth = OL / sq; c.strokeStyle = P.outline; c.stroke ();
	circle (c, 0, -r * 0.06, r * 0.78); c.fillStyle = P.gold; c.fill ();
	c.fillStyle = P.goldEdge; starPath (c, 0, -r * 0.04, r * 0.48, r * 0.2, 5); c.fill ();
	glossy (c, -r * 0.32, -r * 0.42, r * 0.24, r * 0.12, -0.6, 0.8);
	c.restore ();
}
function drawElixir (c, x, y, s, t)
{
	shadow (c, x, y, s);
	const yy = y + bob (t, s) + s * 0.05, r = s * 0.31;
	c.save (); c.translate (x, yy);
	c.beginPath (); c.moveTo (0, -r * 1.55); c.bezierCurveTo (r * 0.9, -r * 0.4, r * 1.05, r * 0.1, r, r * 0.4);
	c.arc (0, r * 0.4, r, 0, Math.PI); c.bezierCurveTo (-r * 1.05, r * 0.1, -r * 0.9, -r * 0.4, 0, -r * 1.55);
	const gr = c.createLinearGradient (0, -r * 1.5, 0, r * 1.4); gr.addColorStop (0, P.elixirLight); gr.addColorStop (1, P.elixirDark);
	outlined (c, gr);
	glossy (c, -r * 0.4, 0, r * 0.17, r * 0.4, 0.3, 0.7);
	c.restore ();
}
function drawGem (c, x, y, s, t)
{
	shadow (c, x, y, s);
	const r = s * 0.42, yy = y + bob (t, s);
	c.save (); c.translate (x, yy);
	const v = [[0, -r * 0.8], [r * 0.95, -r * 0.2], [0, r * 0.95], [-r * 0.95, -r * 0.2]];
	c.beginPath (); v.forEach ((p, i) => (i ? c.lineTo (p[0], p[1]) : c.moveTo (p[0], p[1]))); c.closePath (); outlined (c, P.gemDark);
	c.beginPath (); c.moveTo (0, -r * 0.55); c.lineTo (r * 0.6, -r * 0.15); c.lineTo (0, r * 0.62); c.lineTo (-r * 0.6, -r * 0.15); c.closePath (); c.fillStyle = P.gem; c.fill ();
	c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath (); c.moveTo (-r * 0.6, -r * 0.15); c.lineTo (0, -r * 0.55); c.lineTo (-r * 0.12, -r * 0.1); c.closePath (); c.fill ();
	const sp = (t * 1.3) % 2;
	if (sp < 0.4) { c.fillStyle = '#fff'; const k = Math.sin (sp / 0.4 * Math.PI); starPath (c, r * 0.5, -r * 0.6, r * 0.45 * k, r * 0.1 * k, 4); c.fill (); }
	c.restore ();
}
function drawShield (c, x, y, s, t)
{
	shadow (c, x, y, s);
	const r = s * 0.42, yy = y + bob (t, s);
	c.save (); c.translate (x, yy);
	glowAt (c, 0, 0, r * 1.7, '#3FB4FF');
	circle (c, 0, 0, r); outlined (c, P.goldDark);
	circle (c, 0, 0, r * 0.76); c.fillStyle = P.wood; c.fill ();
	c.strokeStyle = P.woodDark; c.lineWidth = OL * 0.5; c.beginPath (); c.moveTo (-r * 0.75, -r * 0.25); c.lineTo (r * 0.75, -r * 0.25); c.moveTo (-r * 0.75, r * 0.25); c.lineTo (r * 0.75, r * 0.25); c.stroke ();
	circle (c, 0, 0, r * 0.3); outlined (c, '#3FB4FF', OL * 0.7);
	glossy (c, -r * 0.35, -r * 0.45, r * 0.25, r * 0.12, -0.5, 0.6);
	c.restore ();
}
function drawHourglass (c, x, y, s, t)
{
	shadow (c, x, y, s);
	const r = s * 0.4, yy = y + bob (t, s);
	c.save (); c.translate (x, yy); c.rotate (Math.sin (t * 2) * 0.12);
	glowAt (c, 0, 0, r * 1.7, '#9BE3FF');
	c.beginPath (); c.moveTo (-r * 0.6, -r * 0.85); c.lineTo (r * 0.6, -r * 0.85); c.lineTo (r * 0.08, 0); c.lineTo (r * 0.6, r * 0.85); c.lineTo (-r * 0.6, r * 0.85); c.lineTo (-r * 0.08, 0); c.closePath ();
	outlined (c, 'rgba(220,245,255,.9)');
	c.fillStyle = P.ice; c.beginPath (); c.moveTo (-r * 0.4, r * 0.75); c.lineTo (r * 0.4, r * 0.75); c.lineTo (0, r * 0.3); c.closePath (); c.fill ();
	c.beginPath (); c.moveTo (-r * 0.3, -r * 0.55); c.lineTo (r * 0.3, -r * 0.55); c.lineTo (0, -r * 0.15); c.closePath (); c.fill ();
	for (const yy2 of [-r * 0.95, r * 0.95]) { rr (c, -r * 0.8, yy2 - r * 0.15, r * 1.6, r * 0.3, r * 0.1); outlined (c, P.iceDark, OL * 0.8); }
	c.restore ();
}
function drawBarrel (c, x, y, s)
{
	shadow (c, x, y, s);
	const w = s * 0.66, h = s * 0.8;
	c.save (); c.translate (x, y - s * 0.04);
	ellipse (c, 0, 0, w / 2, h / 2); outlined (c, P.wood);
	c.strokeStyle = P.woodDark; c.lineWidth = OL * 0.6;
	for (const k of [-0.22, 0.22]) { c.beginPath (); c.moveTo (k * w, -h * 0.45); c.quadraticCurveTo (k * w * 1.3, 0, k * w, h * 0.45); c.stroke (); }
	c.fillStyle = P.stoneDark; for (const yy of [-h * 0.26, h * 0.26]) c.fillRect (-w * 0.47, yy - h * 0.05, w * 0.94, h * 0.1);
	c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect (-w * 0.3, -h * 0.38, w * 0.08, h * 0.56);
	c.restore ();
}
function drawBush (c, x, y, s)
{
	shadow (c, x, y, s);
	c.save (); c.translate (x, y); const r = s * 0.22;
	const bl = [[-r, r * 0.2], [r, r * 0.2], [0, -r * 0.5], [-r * 0.5, -r * 0.3], [r * 0.5, -r * 0.3]];
	c.lineWidth = OL * 2; c.strokeStyle = P.outline; bl.forEach (([a, b]) => { circle (c, a, b, r); c.stroke (); });
	bl.forEach (([a, b]) => { circle (c, a, b, r); c.fillStyle = P.grassDark; c.fill (); circle (c, a - r * 0.25, b - r * 0.3, r * 0.45); c.fillStyle = P.grassLight; c.fill (); });
	c.fillStyle = P.danger; [[-r * 0.6, 0], [r * 0.4, -r * 0.4], [r * 0.7, r * 0.4]].forEach (([a, b]) => { circle (c, a, b, r * 0.16); c.fill (); });
	c.restore ();
}
function drawGoblin (c, x, y, s, t, gb)
{
	shadow (c, x, y, s);
	const stun = gb && gb.stun > 0, run = gb && gb.mode === 'flee';
	const hop = stun ? 0 : -Math.abs (Math.sin (t * (run ? 14 : 8))) * s * 0.12, r = s * 0.3;
	c.save (); c.translate (x, y + hop);
	// the sack (full when it ran off with a coin)
	if (run) { circle (c, r * 0.9, r * 0.5, r * 0.55); outlined (c, '#C9935A'); c.fillStyle = P.gold; circle (c, r * 0.9, r * 0.2, r * 0.18); c.fill (); }
	for (const k of [-1, 1])
	{
		c.beginPath (); c.moveTo (k * r * 0.6, -r * 0.2); c.lineTo (k * r * 1.6, -r * 0.75); c.lineTo (k * r * 0.7, r * 0.25); c.closePath (); outlined (c, P.goblin);
		c.fillStyle = '#F28FA0'; c.beginPath (); c.moveTo (k * r * 0.75, -r * 0.05); c.lineTo (k * r * 1.3, -r * 0.5); c.lineTo (k * r * 0.8, r * 0.1); c.fill ();
	}
	circle (c, 0, 0, r); outlined (c, P.goblin);
	glossy (c, -r * 0.35, -r * 0.5, r * 0.3, r * 0.14, -0.4, 0.4);
	for (const k of [-1, 1])
	{
		circle (c, k * r * 0.35, -r * 0.1, r * 0.24); outlined (c, '#fff', OL * 0.6);
		c.fillStyle = '#111'; circle (c, k * r * 0.35 + (stun ? 0 : r * 0.06), -r * 0.08, r * 0.11); c.fill ();
		c.strokeStyle = P.outline; c.lineWidth = OL * 0.8; c.beginPath (); c.moveTo (k * r * 0.12, -r * 0.38); c.lineTo (k * r * 0.58, -r * 0.48); c.stroke ();
	}
	c.lineWidth = OL * 0.8; c.beginPath (); c.arc (0, r * 0.25, r * 0.4, 0.3, Math.PI - 0.3); c.stroke ();
	c.fillStyle = '#fff'; c.fillRect (-r * 0.18, r * 0.52, r * 0.14, r * 0.14); c.fillRect (r * 0.06, r * 0.52, r * 0.14, r * 0.14);
	if (stun) for (let i = 0; i < 3; i++)
	{
		const a = t * 5 + i * 2.09; c.fillStyle = P.gold;
		starPath (c, Math.cos (a) * r * 0.9, -r * 1.15 + Math.sin (a) * r * 0.25, r * 0.22, r * 0.09, 5); c.fill ();
	}
	c.restore ();
}
function glowAt (c, x, y, r, col)
{
	const g = c.createRadialGradient (x, y, 0, x, y, r);
	g.addColorStop (0, col + '88'); g.addColorStop (1, col + '00');
	c.fillStyle = g; circle (c, x, y, r); c.fill ();
}
const ITEM = {
	coin: { draw: drawCoin, pts: 10, grow: 1, col: P.goldLight },
	elixir: { draw: drawElixir, pts: 30, grow: 2, col: '#FFB3F7', ttl: 8000 },
	gem: { draw: drawGem, pts: 100, grow: 0, col: P.gemLight, ttl: 6000 },
	shield: { draw: drawShield, pts: 20, grow: 0, col: '#BFE6FF', ttl: 10000 },
	frost: { draw: drawHourglass, pts: 20, grow: 0, col: '#DDF6FF', ttl: 10000 } };

// ---- the game ---------------------------------------------------------------------------------------------------
let G = null, paused = false, pauseNote = '';
const parts = [], floats = [], banners = [];
let shakeA = 0, shakeT = 0, shakeD = 1;

function newGame (mode, li, opts)
{
	opts = opts || {};
	const lv = mode === 'level' ? LEVELS[li] : null;
	const map = MAPS[mode === 'level' ? li : 0];
	const ex = opts.demo ? 0 : extraRows (), top = ex >> 1, R = 21 + ex;
	G = {
		mode, li, lv, demo: !!opts.demo, ai: !!opts.ai, seed: (opts.seed | 0) || (mode === 'level' ? li * 7 : 3),
		cols: 15, rows: R, land: false, obst: new Uint8Array (15 * R), occ: new Uint8Array (15 * R),
		snake: [], from: [], dir: 0, queue: [], pending: 0, items: [], gobs: [],
		score: 0, coins: 0, eaten: 0, combo: 0, lastPick: -1e9, gemChain: false, mult: 1,
		rush: 0, frost: 0, shield: 0, invul: 0, time: 0, acc: 0, steps: 0,
		waiting: !opts.demo && !opts.ai, state: 'play', dieT: 0, winT: 0, popped: 0,
		gobNext: mode === 'level' && li === 2 ? 15000 : 10000, gobOn: mode === 'level' ? li >= 2 : false, gobMax: mode === 'level' && li === 4 ? 2 : 1,
		mouth: 0, blink: 0, blinkNext: 2000, eatT: 1e9, gulpT: 1e9, trail: [], newBest: false };
	for (let y = 0; y < 21; y++) for (let x = 0; x < 15; x++)
	{
		const ch = map[y][x];
		const Y = y + top;
		if (ch === '#') G.obst[Y * 15 + x] = lv ? lv.kind : 5;
		if (ch === 'S') G.snake = [{ x, y: Y }, { x, y: Y + 1 }, { x, y: Y + 2 }];
	}
	if (mode !== 'level') { /* the meadow has no obstacle: a few bushes for the eye, off the start */ }
	G.from = G.snake.map ((c) => ({ x: c.x, y: c.y }));
	if (land) transpose ();
	occupy ();
	spawn ('coin');
	parts.length = 0; floats.length = 0; banners.length = 0;
	layout ();
	hud ();
}
// portrait <-> landscape: every position (x, y) becomes (y, x)
function transpose ()
{
	const c = G.cols, r = G.rows, o = new Uint8Array (c * r);
	for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) o[x * r + y] = G.obst[y * c + x];
	G.obst = o; G.cols = r; G.rows = c; G.occ = new Uint8Array (c * r); G.land = !G.land;
	const sw = (p) => { const t = p.x; p.x = p.y; p.y = t; };
	G.snake.forEach (sw); G.from.forEach (sw); G.items.forEach (sw);
	G.gobs.forEach ((g) => { sw (g); sw (g.f); });
	G.dir = TD[G.dir]; G.queue = G.queue.map ((d) => TD[d]);
	parts.length = 0; floats.length = 0; G.trail.length = 0;
	occupy ();
}
function occupy () { G.occ.fill (0); for (const s of G.snake) G.occ[s.y * G.cols + s.x] = 1; }
const inside = (x, y) => x >= 0 && y >= 0 && x < G.cols && y < G.rows;
function itemAt (x, y) { return G.items.find ((i) => i.x === x && i.y === y); }
function gobAt (x, y) { return G.gobs.find ((g) => g.x === x && g.y === y); }
function free (x, y) { return inside (x, y) && !G.obst[y * G.cols + x] && !G.occ[y * G.cols + x] && !itemAt (x, y) && !gobAt (x, y); }
function blocked (x, y)
{
	if (!inside (x, y) || G.obst[y * G.cols + x]) return true;
	if (!G.occ[y * G.cols + x]) return false;
	const t = G.snake[G.snake.length - 1];
	return !(t.x === x && t.y === y && G.pending === 0);	// (the tail moves away this step)
}
function spawn (type)
{
	const h = G.snake[0], cells = [];
	for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++)
		if (free (x, y) && Math.abs (x - h.x) + Math.abs (y - h.y) > 2) cells.push ([x, y]);
	if (!cells.length) return null;
	const [x, y] = cells[Math.random () * cells.length | 0];
	const it = { type, x, y, born: G.time, t0: Math.random () * 6, pop: 0 };
	G.items.push (it);
	return it;
}
function tick ()
{
	const end = G.mode !== 'level';
	let t = end ? Math.max (75, 200 - 2 * G.eaten) : Math.max (90, G.lv.tick - 3 * G.eaten);
	if (G.demo) t = 150;
	if (G.rush > 0) t *= 0.75;
	if (G.frost > 0) t *= 1.5;
	return t;
}
function comboWin () { return Math.max (3000, 20 * tick ()); }
function multOf (c) { return c >= 10 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1; }

function turn (d)
{
	if (!G || G.demo || G.state !== 'play' || paused) return;
	if (G.waiting)
	{
		if (d === (G.dir + 2) % 4) return;	// (into its own body)
		G.waiting = false; G.queue = [d]; Snd.play ('go');
		return;
	}
	const last = G.queue.length ? G.queue[G.queue.length - 1] : G.dir;
	if (d === last || d === (last + 2) % 4 || G.queue.length >= 2) return;
	G.queue.push (d);
}

function step ()
{
	G.steps++;
	if (G.queue.length) { const d = G.queue.shift (); if (d !== G.dir) { G.dir = d; if (!G.demo) Snd.play ('turn'); } }
	const h = G.snake[0], nx = h.x + DX[G.dir], ny = h.y + DY[G.dir];
	if (blocked (nx, ny))
	{
		if (G.shield > 0 || G.invul > 0)
		{
			if (G.invul <= 0)
			{
				G.shield = 0; G.invul = 1000; G.combo = 0; G.mult = 1; G.gemChain = false;
				shake (6, 200); Snd.play ('thud'); buzz ([40, 30, 40]);
				banner (tr ('saved'), '#BFE6FF');
				burst (px (nx), py (ny), 'hit', 10);
			}
			const opts = [(G.dir + 1) % 4, (G.dir + 3) % 4].filter ((d) => !blocked (h.x + DX[d], h.y + DY[d]));
			if (opts.length) G.dir = opts.length > 1 ? (room (h.x + DX[opts[0]], h.y + DY[opts[0]]) >= room (h.x + DX[opts[1]], h.y + DY[opts[1]]) ? opts[0] : opts[1]) : opts[0];
			G.queue.length = 0;
			G.from = G.snake.map ((c) => ({ x: c.x, y: c.y }));
			return;
		}
		if (!G.grace && !G.ai) { G.grace = 1; G.from = G.snake.map ((c) => ({ x: c.x, y: c.y })); return; }	// (a late swipe forgiven once)
		die (nx, ny);
		return;
	}
	G.grace = 0;
	G.from = G.snake.map ((c) => ({ x: c.x, y: c.y }));
	G.snake.unshift ({ x: nx, y: ny });
	if (G.pending > 0) G.pending--; else G.snake.pop ();
	occupy ();
	const gb = gobAt (nx, ny);
	if (gb) eatGoblin (gb);
	const it = itemAt (nx, ny);
	if (it) eat (it);
	if (G.state !== 'play') return;
	moveGoblins ();
}

function pick (base, x, y, col)
{
	if (G.time - G.lastPick <= comboWin ()) G.combo++; else { G.combo = 0; G.gemChain = false; }
	G.lastPick = G.time;
	const m = multOf (G.combo) * (G.rush > 0 ? 2 : 1);
	if (multOf (G.combo) > G.mult && G.combo > 0) banner (tr ('combo', { n: multOf (G.combo) }), P.gold, true);
	G.mult = multOf (G.combo);
	const pts = base * m;
	G.score += pts;
	floats.push ({ x: px (x), y: py (y) - S * 0.7, text: '+' + pts, col, age: 0 });
	G.eatT = 0; G.gulpT = 0;
	return pts;
}
function eat (it)
{
	G.items.splice (G.items.indexOf (it), 1);
	const I = ITEM[it.type];
	pick (I.pts, it.x, it.y, I.col);
	G.pending += I.grow;
	G.eaten++;
	const x = px (it.x), y = py (it.y);
	switch (it.type)
	{
	case 'coin':
		G.coins++; burst (x, y, 'coin', 10); Snd.play ('coin', G.combo); buzz (10);
		if (G.mode === 'level' && G.coins >= G.lv.goal) { win (); return; }
		spawn ('coin');
		if (G.coins % 5 === 0 && Math.random () < 0.6) more ('elixir');
		if (G.combo >= 5 && !G.gemChain && G.items.length < 3) { G.gemChain = true; more ('gem'); }
		else if (Math.random () < 0.04) more ('gem');
		break;
	case 'elixir': G.rush = 4000; burst (x, y, 'elixir', 14); Snd.play ('elixir'); buzz (25); banner (tr ('rush'), '#FFB3F7'); break;
	case 'gem': burst (x, y, 'gem', 18); rings.push ({ x, y, age: 0 }); shake (4, 150); Snd.play ('gem'); buzz (25); break;
	case 'shield': G.shield = 15000; burst (x, y, 'ice', 12); Snd.play ('power'); buzz (25); banner (tr ('shield'), '#BFE6FF'); break;
	case 'frost': G.frost = 6000; burst (x, y, 'ice', 12); Snd.play ('frost'); buzz (25); banner (tr ('frost'), '#DDF6FF'); break;
	}
	const endless = G.mode !== 'level';
	if ((endless || G.li >= 1) && G.eaten % 12 === 0 && Math.random () < 0.5) more ('shield');
	if ((endless || G.li >= 2) && G.eaten % 15 === 0 && Math.random () < 0.5) more ('frost');
	if (endless && !G.demo && G.eaten % 10 === 0) dropBarrel ();
	if (endless && G.eaten >= 20 && !G.gobOn) { G.gobOn = true; G.gobNext = G.time + 3000; }
	hud ();
}
function more (type) { if (G.items.length < 3 && !G.items.some ((i) => i.type === type)) spawn (type); }
function eatGoblin (gb)
{
	G.gobs.splice (G.gobs.indexOf (gb), 1);
	pick (50, gb.x, gb.y, '#C8FF9A');
	G.pending += 1;
	burst (px (gb.x), py (gb.y), 'goblin', 12); Snd.play ('chomp'); buzz (30);
	banner (tr ('goblinEaten'), '#C8FF9A');
	G.gobNext = G.time + 8000;
	if (gb.mode === 'flee') spawnCoinIfNone ();
	hud ();
}
function spawnCoinIfNone () { if (!G.items.some ((i) => i.type === 'coin')) spawn ('coin'); }

// a barrel in the endless mode: never on a corridor (the free cells stay in one piece)
function dropBarrel ()
{
	let n = 0; for (let i = 0; i < G.obst.length; i++) if (G.obst[i] === 1) n++;
	if (n >= 12) return;
	const h = G.snake[0];
	for (let tries = 0; tries < 40; tries++)
	{
		const x = Math.random () * G.cols | 0, y = Math.random () * G.rows | 0;
		if (!free (x, y) || Math.abs (x - h.x) + Math.abs (y - h.y) < 3) continue;
		G.obst[y * G.cols + x] = 1;
		if (connected ()) { bake (); burst (px (x), py (y), 'hit', 8); Snd.play ('thud'); return; }
		G.obst[y * G.cols + x] = 0;
	}
}
function connected ()
{
	const seen = new Uint8Array (G.cols * G.rows); let total = 0, start = -1;
	for (let i = 0; i < seen.length; i++) if (!G.obst[i]) { total++; if (start < 0) start = i; }
	const st = [start]; seen[start] = 1; let n = 0;
	while (st.length) { const i = st.pop (); n++; const x = i % G.cols, y = i / G.cols | 0;
		for (let d = 0; d < 4; d++) { const X = x + DX[d], Y = y + DY[d], j = Y * G.cols + X; if (inside (X, Y) && !G.obst[j] && !seen[j]) { seen[j] = 1; st.push (j); } } }
	return n === total;
}
// the free cells reachable from (x, y) (capped): the AI and the shield's bounce
function room (x, y, cap)
{
	cap = cap || 400;
	if (!inside (x, y) || G.obst[y * G.cols + x] || G.occ[y * G.cols + x]) return 0;
	const seen = new Uint8Array (G.cols * G.rows), st = [y * G.cols + x]; seen[st[0]] = 1; let n = 0;
	while (st.length && n < cap) { const i = st.pop (); n++; const cx = i % G.cols, cy = i / G.cols | 0;
		for (let d = 0; d < 4; d++) { const X = cx + DX[d], Y = cy + DY[d], j = Y * G.cols + X; if (inside (X, Y) && !G.obst[j] && !G.occ[j] && !seen[j]) { seen[j] = 1; st.push (j); } } }
	return n;
}
// the first step of a shortest path from (x, y) to a cell where goal (x, y) holds (-1: none)
function bfs (x0, y0, goal, pass)
{
	const N = G.cols * G.rows, first = new Int8Array (N).fill (-1), seen = new Uint8Array (N), q = [y0 * G.cols + x0];
	seen[q[0]] = 1;
	for (let qi = 0; qi < q.length; qi++)
	{
		const i = q[qi], x = i % G.cols, y = i / G.cols | 0;
		if (qi > 0 && goal (x, y)) return first[i];
		for (let d = 0; d < 4; d++)
		{
			const X = x + DX[d], Y = y + DY[d], j = Y * G.cols + X;
			if (!inside (X, Y) || seen[j] || !pass (X, Y)) continue;
			seen[j] = 1; first[j] = qi === 0 ? d : first[i]; q.push (j);
		}
	}
	return -1;
}

// ---- the goblins ------------------------------------------------------------------------------------------------
function spawnGoblin ()
{
	const h = G.snake[0], cells = [];
	for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++)
		if ((x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) && free (x, y) && Math.abs (x - h.x) + Math.abs (y - h.y) >= 6) cells.push ([x, y]);
	if (!cells.length) return;
	const [x, y] = cells[Math.random () * cells.length | 0];
	G.gobs.push ({ x, y, f: { x, y }, mode: 'hunt', stun: 0, moved: G.steps, born: G.time });
	burst (px (x), py (y), 'goblin', 8); Snd.play ('laugh');
}
function moveGoblins ()
{
	for (const gb of G.gobs.slice ())
	{
		if (gb.stun > 0 || (G.steps - gb.moved) < 2) continue;
		gb.f = { x: gb.x, y: gb.y }; gb.moved = G.steps;
		const pass = (x, y) => !G.obst[y * G.cols + x] && !gobAt (x, y);
		let d;
		if (gb.avoid > 0) gb.avoid--;
		if (gb.mode === 'hunt') d = bfs (gb.x, gb.y, (x, y) => { const i = itemAt (x, y); return i && i.type === 'coin'; }, (x, y) => pass (x, y) && (!gb.avoid || !G.occ[y * G.cols + x]));
		else d = bfs (gb.x, gb.y, (x, y) => x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1, (x, y) => pass (x, y) && !G.occ[y * G.cols + x]);
		if (gb.mode === 'flee' && (gb.x === 0 || gb.y === 0 || gb.x === G.cols - 1 || gb.y === G.rows - 1))
		{	// gone, with the coin
			G.gobs.splice (G.gobs.indexOf (gb), 1); burst (px (gb.x), py (gb.y), 'goblin', 8); Snd.play ('poof');
			G.gobNext = G.time + 8000; continue;
		}
		if (d < 0)
		{	// no way: a random free step
			const ds = [0, 1, 2, 3].filter ((k) => { const X = gb.x + DX[k], Y = gb.y + DY[k]; return inside (X, Y) && pass (X, Y) && !G.occ[Y * G.cols + X]; });
			if (!ds.length) continue;
			d = ds[Math.random () * ds.length | 0];
		}
		const X = gb.x + DX[d], Y = gb.y + DY[d];
		if (G.occ[Y * G.cols + X])
		{
			const hd = G.snake[0];
			if (hd.x === X && hd.y === Y) { gb.x = X; gb.y = Y; eatGoblin (gb); continue; }
			gb.stun = 1500; gb.avoid = 6; continue;
		}
		gb.x = X; gb.y = Y;
		const it = itemAt (X, Y);
		if (it && it.type === 'coin' && gb.mode === 'hunt')
		{
			G.items.splice (G.items.indexOf (it), 1);
			gb.mode = 'flee'; G.combo = 0; G.mult = 1; G.gemChain = false;
			burst (px (X), py (Y), 'coin', 6); Snd.play ('laugh');
			banner (tr ('goblinStole'), '#FFB0A0');
			spawn ('coin'); hud ();
		}
	}
}

// ---- the end of a run ------------------------------------------------------------------------------------------
function die (x, y)
{
	G.state = 'dying'; G.dieT = 0; G.popped = 0; G.hitAt = { x, y };
	if (G.demo) return;
	Snd.play ('death'); buzz ([80, 40, 120]); shake (10, 350);
	if (G.mode === 'level') { prog.best[G.li] = Math.max (prog.best[G.li], G.score); store.set ('progress', prog); }
	else if (G.score > bestEndless) { bestEndless = G.score; store.set ('best', bestEndless); G.newBest = G.score > 0; }
}
function win ()
{
	G.state = 'won'; G.winT = 0;
	Snd.play ('fanfare'); buzz ([30, 50, 30, 50, 60]);
	const st = 1 + (G.score >= G.lv.s2 ? 1 : 0) + (G.score >= G.lv.s3 ? 1 : 0);
	G.stars = st;
	prog.stars[G.li] = Math.max (prog.stars[G.li], st); prog.best[G.li] = Math.max (prog.best[G.li], G.score); store.set ('progress', prog);
	G.items = G.items.filter ((i) => i.type !== 'coin');
	hud ();
}

// ---- effects ---------------------------------------------------------------------------------------------------
const rings = [];
function px (x) { return bx + (x + 0.5) * S; }
function py (y) { return by + (y + 0.5) * S; }
function shake (a, ms) { if (reduced) return; shakeA = a; shakeT = ms; shakeD = ms; }
function burst (x, y, kind, n)
{
	const cols = { coin: [P.gold, P.goldLight, '#fff'], elixir: [P.elixir, P.elixirLight, P.elixirDark], gem: [P.gem, P.gemLight, '#fff'],
		hit: [P.danger, '#FFB020', P.ink], goblin: [P.goblin, '#C8FF9A', P.goblinDark], ice: ['#BFE6FF', '#fff', P.iceDark], body: [SKIN.body, SKIN.belly, SKIN.scale] }[kind];
	if (reduced) n = Math.ceil (n / 2);
	for (let i = 0; i < n && parts.length < 300; i++)
	{
		const a = Math.random () * 6.283, v = S * (2.5 + Math.random () * 4);
		parts.push ({ x, y, vx: Math.cos (a) * v, vy: Math.sin (a) * v - S * 3, life: 0.5 + Math.random () * 0.3, age: 0,
			r: S * (0.07 + Math.random () * 0.08), col: cols[i % cols.length], star: kind === 'coin' || kind === 'gem' });
	}
}
function banner (text, col, big) { banners.length = 0; banners.push ({ text, col, big: !!big, age: 0 }); }

// ---- update ----------------------------------------------------------------------------------------------------
function update (ms)
{
	const dt = ms / 1000;
	for (const p of parts) { p.age += dt; p.vy += S * 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
	for (let i = parts.length; i--;) if (parts[i].age > parts[i].life) parts.splice (i, 1);
	for (const f of floats) f.age += dt;
	for (let i = floats.length; i--;) if (floats[i].age > 0.8) floats.splice (i, 1);
	for (const b of banners) b.age += dt;
	for (let i = banners.length; i--;) if (banners[i].age > (banners[i].big ? 0.9 : 1.3)) banners.splice (i, 1);
	for (const r of rings) r.age += dt;
	for (let i = rings.length; i--;) if (rings[i].age > 0.4) rings.splice (i, 1);
	if (shakeT > 0) shakeT -= ms;
	if (!G) return;
	// the eyes, the mouth (always: the title's demo too)
	G.blinkNext -= ms;
	if (G.blinkNext < 0) { G.blink += ms; if (G.blink > 140) { G.blink = 0; G.blinkNext = 2500 + Math.random () * 2500; } }
	G.eatT += ms; G.gulpT += ms;
	const h = G.snake[0];
	const near = G.items.some ((i) => Math.abs (i.x - h.x) + Math.abs (i.y - h.y) <= 2) || G.gobs.some ((g) => Math.abs (g.x - h.x) + Math.abs (g.y - h.y) <= 2);
	G.mouth += ((near ? 1 : 0) - G.mouth) * Math.min (1, dt * 12);
	if (paused) return;
	if (G.state === 'play' && !G.waiting)
	{
		G.time += ms;
		for (const k of ['rush', 'frost', 'shield', 'invul']) if (G[k] > 0) G[k] = Math.max (0, G[k] - ms);
		for (const gb of G.gobs) if (gb.stun > 0) gb.stun = Math.max (0, gb.stun - ms);
		for (let i = G.items.length; i--;)
		{
			const it = G.items[i], ttl = ITEM[it.type].ttl;
			if (ttl && G.time - it.born > ttl) { G.items.splice (i, 1); burst (px (it.x), py (it.y), 'ice', 6); }
		}
		if (G.gobOn && G.gobs.length < G.gobMax && G.time >= G.gobNext) { spawnGoblin (); G.gobNext = G.time + 8000; }
		if (G.combo > 0 && G.time - G.lastPick > comboWin ()) { G.combo = 0; G.mult = 1; G.gemChain = false; hud (); }
		G.acc += ms;
		let guard = 0;
		while (G.state === 'play' && G.acc >= tick () && guard++ < 5) { G.acc -= tick (); if (G.ai) think (); step (); }
		if (G.rush > 0) { G.trail.unshift ({ x: hx (), y: hy () }); if (G.trail.length > 12) G.trail.pop (); } else G.trail.length = 0;
		hudCombo ();
	}
	else if (G.state === 'dying')
	{
		G.dieT += ms;
		const n = G.snake.length, iv = Math.min (40, 1200 / n);
		if (G.dieT > 250)
		{
			const want = Math.min (n, Math.floor ((G.dieT - 250) / iv) + 1);
			while (G.popped < want) { const s = G.snake[n - 1 - G.popped]; burst (px (s.x), py (s.y), 'body', G.demo ? 3 : 6); if (!G.demo && G.popped % 3 === 0) Snd.play ('poof'); G.popped++; }
		}
		if (G.dieT > 250 + n * iv + 450) { if (G.demo) startDemo (); else over (); }
	}
	else if (G.state === 'won')
	{
		G.winT += ms;
		if (G.winT < 1500 && Math.random () < 0.6) parts.push ({ x: bx + Math.random () * G.cols * S, y: by - S, vx: (Math.random () - 0.5) * S * 2, vy: S * 2,
			life: 1.4, age: 0, r: S * (0.1 + Math.random () * 0.08), col: [P.gold, P.goldLight, '#fff'][Math.random () * 3 | 0], star: true });
		if (G.winT > 1600 && !G.shown) { G.shown = true; showWin (); }
	}
}

// ---- the AI (the title's demo, ?auto) --------------------------------------------------------------------------
function think ()
{
	const h = G.snake[0], n = G.snake.length;
	const pass = (x, y) => !blocked (x, y);
	const wants = (x, y) => { const i = itemAt (x, y); return (i && (i.type !== 'frost' || G.mode !== 'level')) || gobAt (x, y); };
	let d = bfs (h.x, h.y, wants, pass);
	const safe = (k) => { const X = h.x + DX[k], Y = h.y + DY[k]; return !blocked (X, Y) ? room (X, Y, n + 10) : 0; };
	if (d >= 0 && safe (d) < Math.min (n + 4, 30)) d = -1;
	if (d < 0) { let best = -1; for (let k = 0; k < 4; k++) { if (k === (G.dir + 2) % 4) continue; const r = safe (k); if (r > best) { best = r; d = k; } } }
	if (d >= 0 && d !== (G.dir + 2) % 4) G.queue = [d];
}

// ---- drawing ---------------------------------------------------------------------------------------------------
function lerp (a, b, t) { return a + (b - a) * t; }
let lastSamples = [];
function samples (a)
{
	const s = G.snake, f = G.from, n = s.length;
	const pts = [];
	const h0 = f[0] || s[0];
	pts.push ({ x: lerp (h0.x, s[0].x, a), y: lerp (h0.y, s[0].y, a) });
	for (let i = 1; i < n; i++) pts.push (s[i]);
	const ot = f[f.length - 1] || s[n - 1];
	pts.push ({ x: lerp (ot.x, s[n - 1].x, a), y: lerp (ot.y, s[n - 1].y, a) });
	const P2 = pts.map ((p) => ({ x: px (p.x), y: py (p.y) }));
	const sp = S * 0.28, out = [P2[0]];
	let carry = 0;
	for (let i = 0; i + 1 < P2.length; i++)
	{
		const p = P2[i], q = P2[i + 1], len = Math.hypot (q.x - p.x, q.y - p.y);
		if (len < 1e-6) continue;
		let d = sp - carry;
		while (d <= len) { out.push ({ x: lerp (p.x, q.x, d / len), y: lerp (p.y, q.y, d / len) }); d += sp; }
		carry = len - (d - sp);
	}
	return out;
}
function hx () { return lastSamples[0] ? lastSamples[0].x : px (G.snake[0].x); }
function hy () { return lastSamples[0] ? lastSamples[0].y : py (G.snake[0].y); }
function drawSnake (c, a, t)
{
	let pts = samples (a);
	lastSamples = pts;
	let n = pts.length;
	if (G.state === 'dying' && G.dieT > 250) pts = pts.slice (0, Math.max (0, Math.round (n * (1 - G.popped / G.snake.length))));
	const dead = G.state === 'dying' && G.popped >= G.snake.length;
	if (dead || !pts.length) return;
	const m = pts.length;
	const rad = (i) =>
	{
		const k = i / Math.max (1, n - 1);
		let r = S * (0.48 - 0.29 * k * k);
		const gi = G.gulpT / 40 * (1 / 0.28);	// the gulp bulge, one cell per 40 ms
		if (G.gulpT < 2000) r *= 1 + 0.28 * Math.exp (-((i - gi) * (i - gi)) / 8);
		r *= 1 + 0.04 * Math.sin (t * 4.2 - i * 0.35);
		return r;
	};
	const flash = G.state === 'dying' && G.dieT < 250 && (G.dieT / 42 | 0) % 2 === 0;
	const blinkInvul = G.invul > 0 && (G.time / 80 | 0) % 2 === 0;
	c.save ();
	if (blinkInvul) c.globalAlpha = 0.55;
	// the rush: pink ghosts behind
	for (let i = 3; i < G.trail.length; i += 4) { c.globalAlpha = 0.25 * (1 - i / 12); c.fillStyle = P.elixir; circle (c, G.trail[i].x, G.trail[i].y, S * 0.5); c.fill (); }
	c.globalAlpha = blinkInvul ? 0.55 : 1;
	// the tail's flame
	const tl = pts[m - 1], tp = pts[Math.max (0, m - 2)];
	if (m > 2)
	{
		const ang = Math.atan2 (tl.y - tp.y, tl.x - tp.x), fl = 1 + 0.25 * Math.sin (t * 22);
		c.save (); c.translate (tl.x, tl.y); c.rotate (ang);
		c.beginPath (); c.moveTo (0, -S * 0.14); c.quadraticCurveTo (S * 0.5 * fl, -S * 0.18, S * 0.55 * fl, 0); c.quadraticCurveTo (S * 0.5 * fl, S * 0.18, 0, S * 0.14); c.closePath ();
		outlined (c, '#FF8A1E', OL * 0.8);
		c.fillStyle = '#FFE14D'; ellipse (c, S * 0.18, 0, S * 0.18 * fl, S * 0.07); c.fill ();
		c.restore ();
	}
	// the little wings, behind the body (two cells behind the head), flapping
	const wi = Math.min (m - 1, 5);
	if (m > 14 && !flash)
	{
		const p = pts[wi], q = pts[wi - 1], r = rad (wi), ang = Math.atan2 (q.y - p.y, q.x - p.x), fl = 0.78 + 0.22 * Math.sin (t * 13);
		c.save (); c.translate (p.x, p.y); c.rotate (ang);
		for (const s of [-1, 1])
		{
			const L = S * 0.72 * fl;
			c.beginPath (); c.moveTo (r * 0.35, s * r * 0.5);
			c.quadraticCurveTo (r * 0.3, s * (r + L * 0.7), -r * 0.2, s * (r + L));	// the leading bone, out to the tip
			c.quadraticCurveTo (-r * 0.45, s * (r + L * 0.55), -r * 0.75, s * (r + L * 0.6));	// three scallops back to the body
			c.quadraticCurveTo (-r * 0.85, s * (r + L * 0.2), -r * 1.15, s * (r + L * 0.25));
			c.quadraticCurveTo (-r * 1.0, s * r * 0.7, -r * 0.6, s * r * 0.4); c.closePath ();
			outlined (c, SKIN.wing, OL);
			c.strokeStyle = SKIN.scale; c.lineWidth = Math.max (1, OL * 0.6); c.beginPath ();
			c.moveTo (r * 0.1, s * r * 0.7); c.lineTo (-r * 0.6, s * (r + L * 0.45)); c.stroke ();
		}
		c.restore ();
	}
	// the outline: every circle one size bigger, in one colour (the silhouette)
	c.fillStyle = P.outline;
	for (let i = m - 1; i >= 1; i--) { circle (c, pts[i].x, pts[i].y, rad (i) + OL); c.fill (); }
	// a round, shaded tube: the dark side, the body colour shifted to the light, a continuous gloss line
	c.fillStyle = flash ? '#fff' : SKIN.body2;
	for (let i = m - 1; i >= 1; i--) { circle (c, pts[i].x, pts[i].y, rad (i)); c.fill (); }
	if (!flash)
	{
		c.fillStyle = SKIN.body;
		for (let i = m - 1; i >= 1; i--) { const r = rad (i); circle (c, pts[i].x - r * 0.1, pts[i].y - r * 0.14, r * 0.84); c.fill (); }
		c.strokeStyle = SKIN.light; c.lineCap = 'round'; c.lineJoin = 'round';	// the gloss, one continuous line
		for (let i = m - 1; i >= 2; i--)
		{
			const r = rad (i), r2 = rad (i - 1); c.lineWidth = r * 0.5; c.beginPath ();
			c.moveTo (pts[i].x - r * 0.24, pts[i].y - r * 0.34); c.lineTo (pts[i - 1].x - r2 * 0.24, pts[i - 1].y - r2 * 0.34); c.stroke ();
		}
		// the back plates: round, glossy scutes along the spine (not arrows), bigger near the head
		for (let i = 3; i < m - 4; i += 4)
		{
			const p = pts[i], q = pts[i - 1], r = rad (i), ang = Math.atan2 (q.y - p.y, q.x - p.x);
			c.save (); c.translate (p.x, p.y); c.rotate (ang);
			ellipse (c, 0, 0, r * 0.4, r * 0.3); outlined (c, SKIN.plate, Math.max (1.2, OL * 0.7));
			c.fillStyle = SKIN.plateDark; ellipse (c, -r * 0.06, r * 0.08, r * 0.28, r * 0.17); c.fill ();
			c.fillStyle = SKIN.plate; ellipse (c, r * 0.02, -r * 0.03, r * 0.26, r * 0.17); c.fill ();
			glossy (c, r * 0.08, -r * 0.12, r * 0.13, r * 0.07, 0, 0.75);
			c.restore ();
		}
	}
	// the head
	const p = pts[0], q = pts[1] || { x: p.x - DX[G.dir], y: p.y - DY[G.dir] };
	let ang = Math.atan2 (p.y - q.y, p.x - q.x);
	if (Math.hypot (p.y - q.y, p.x - q.x) < 0.5) ang = Math.atan2 (DY[G.dir], DX[G.dir]);
	let sx = 1, sy = 1;
	if (G.eatT < 160) { const k = G.eatT / 160, e = 1 + 2.7 * Math.pow (k - 1, 3) + 1.7 * Math.pow (k - 1, 2); sx = lerp (1.25, 1, e); sy = lerp (0.8, 1, e); }
	if (G.state === 'won') { const k = Math.min (1, G.winT / 400); sx = sy = 1 + 0.2 * Math.sin (k * Math.PI); }
	const bobY = Math.sin (t * 12.6) * 0.8;
	drawHead (c, p.x, p.y + bobY, ang, sx, sy, flash);
	if (G.shield > 0 && G.state === 'play')
	{
		const k = 1 + 0.08 * Math.sin (t * 10.5);
		c.globalAlpha = G.shield < 2000 && (G.shield / 120 | 0) % 2 ? 0.25 : 0.7;
		c.strokeStyle = '#3FB4FF'; c.lineWidth = Math.max (2, S * 0.1); circle (c, p.x, p.y, S * 0.78 * k); c.stroke ();
		c.fillStyle = 'rgba(63,180,255,.15)'; c.fill ();
		c.globalAlpha = 1;
	}
	c.restore ();
}
function drawHead (c, x, y, ang, sx, sy, flash)
{
	const R = S * 0.66, mouth = G.mouth, blink = G.blink > 0 ? Math.sin (Math.PI * G.blink / 140) : 0;
	c.save (); c.translate (x, y); c.rotate (ang); c.scale (sx, sy);
	c.lineWidth = OL; c.strokeStyle = P.outline;
	for (const s of [-1, 1])	// the horns
	{
		c.beginPath (); c.moveTo (-R * 0.1, s * R * 0.62); c.quadraticCurveTo (-R * 0.75, s * R * 1.25, -R * 1.25, s * R * 1.0);
		c.quadraticCurveTo (-R * 0.95, s * R * 0.75, -R * 0.65, s * R * 0.3); c.closePath (); c.fillStyle = flash ? '#fff' : SKIN.horn; c.fill (); c.stroke ();
	}
	ellipse (c, 0, 0, R, R * 0.86); c.fillStyle = flash ? '#fff' : SKIN.body2; c.fill (); c.stroke ();
	if (!flash)
	{
		c.fillStyle = SKIN.body; ellipse (c, -R * 0.06, -R * 0.08, R * 0.9, R * 0.74); c.fill ();
		c.fillStyle = SKIN.belly; ellipse (c, R * 0.6, 0, R * 0.36, R * 0.5); c.fill ();	// the muzzle
		const jaw = mouth * 0.62;
		if (mouth > 0.05)
		{
			c.beginPath (); c.moveTo (R * 0.15, 0); c.arc (R * 0.15, 0, R * 0.78, -jaw, jaw); c.closePath ();
			c.fillStyle = '#7A1630'; c.fill (); c.stroke ();
			if (mouth > 0.35) { c.fillStyle = '#FF6F8A'; ellipse (c, R * 0.55, 0, R * 0.22, R * 0.1); c.fill (); }
			c.fillStyle = '#fff';	// two fangs
			for (const s of [-1, 1]) { c.beginPath (); c.moveTo (R * 0.6, s * R * 0.78 * Math.sin (jaw) * 0.9); c.lineTo (R * 0.7, s * R * 0.78 * Math.sin (jaw) * 0.55); c.lineTo (R * 0.5, s * R * 0.78 * Math.sin (jaw) * 0.6); c.fill (); }
		}
		glossy (c, -R * 0.15, -R * 0.45, R * 0.4, R * 0.15, 0, 0.45);
		c.fillStyle = 'rgba(255,120,140,.35)'; for (const s of [-1, 1]) { ellipse (c, R * 0.35, s * R * 0.72, R * 0.16, R * 0.1); c.fill (); }	// cheeks
		c.fillStyle = P.outline; for (const s of [-1, 1]) { circle (c, R * 0.86, s * R * 0.2, R * 0.06); c.fill (); }
	}
	for (const s of [-1, 1])	// the big eyes
	{
		c.save (); c.translate (R * 0.12, s * R * 0.42); c.scale (1, 1 - blink * 0.9);
		circle (c, 0, 0, R * 0.34); c.fillStyle = '#fff'; c.fill (); c.lineWidth = OL * 0.8; c.stroke ();
		if (!flash)
		{
			const dead = G.state === 'dying';
			if (dead)
			{	// x x
				c.strokeStyle = '#1B1B1B'; c.lineWidth = R * 0.08; c.beginPath ();
				c.moveTo (-R * 0.14, -R * 0.14); c.lineTo (R * 0.14, R * 0.14); c.moveTo (R * 0.14, -R * 0.14); c.lineTo (-R * 0.14, R * 0.14); c.stroke ();
			}
			else
			{
				c.fillStyle = '#1B1B1B'; circle (c, R * 0.12, 0, R * 0.19); c.fill ();
				c.fillStyle = '#fff'; circle (c, R * 0.05, -R * 0.08, R * 0.07); c.fill ();
			}
		}
		c.restore ();
	}
	c.restore ();
}
function drawFloat (c, f)
{
	const k = f.age / 0.8, sc = k < 0.19 ? lerp (0.6, 1.2, k / 0.19) : Math.max (1, 1.2 - (k - 0.19) * 2);
	c.save (); c.translate (f.x, f.y - k * S * 1.4); c.scale (sc, sc); c.globalAlpha = k > 0.69 ? (1 - k) / 0.31 : 1;
	c.font = '900 ' + Math.round (S * 0.72) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
	c.lineWidth = Math.max (3, S * 0.18); c.strokeStyle = P.textShadow; c.strokeText (f.text, 0, S * 0.07); c.strokeText (f.text, 0, 0);
	c.fillStyle = f.col; c.fillText (f.text, 0, 0); c.restore ();
}
function bigText (c, text, x, y, size, col, rot)
{
	c.save (); c.translate (x, y); if (rot) c.rotate (rot);
	c.font = '900 ' + Math.round (size) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
	let w = c.measureText (text).width;
	const maxW = G ? G.cols * S * 0.95 : VW * 0.9;
	if (w > maxW) { const s = maxW / w; c.scale (s, s); }
	c.lineWidth = Math.max (4, size * 0.22); c.strokeStyle = P.textShadow; c.strokeText (text, 0, size * 0.1); c.strokeText (text, 0, 0);
	c.fillStyle = col || '#fff'; c.fillText (text, 0, 0); c.restore ();
}
// the active power-ups: a round icon and its time ring
function drawPowers (c, t)
{
	const list = [];
	if (G.rush > 0) list.push (['elixir', G.rush / 4000]);
	if (G.shield > 0) list.push (['shield', G.shield / 15000]);
	if (G.frost > 0) list.push (['frost', G.frost / 6000]);
	if (!list.length) return;
	const r = Math.max (13, S * 0.62), gap = by - F - hudBottom;
	let x = bx - F + r + 4;
	const y = gap > r * 2 + 6 ? by - F - r - 4 : by + r * 0.4;
	for (const [k, f] of list)
	{
		circle (c, x, y, r); c.fillStyle = 'rgba(30,18,10,.75)'; c.fill (); c.lineWidth = 3; c.strokeStyle = P.outline; c.stroke ();
		c.beginPath (); c.arc (x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + f * 6.283); c.strokeStyle = ITEM[k].col; c.lineWidth = 4; c.stroke ();
		ITEM[k].draw (c, x, y - r * 0.05, r * 1.35, 0);
		x += r * 2 + 8;
	}
}
function draw (t)
{
	ctx.setTransform (DPR, 0, 0, DPR, 0, 0);
	ctx.clearRect (0, 0, VW, VH);
	if (!G || !board) return;
	ctx.save ();
	if (shakeT > 0) { const a = shakeA * (shakeT / shakeD); ctx.translate ((Math.random () - 0.5) * 2 * a, (Math.random () - 0.5) * 2 * a); }
	ctx.lineJoin = 'round'; ctx.lineCap = 'round';
	// the board's drop shadow, the board
	ctx.fillStyle = 'rgba(20,40,5,.35)'; rr (ctx, bx - F + 4, by - F + 8, G.cols * S + 2 * F, G.rows * S + 2 * F, F * 0.6); ctx.fill ();
	ctx.drawImage (board, bx - F, by - F, G.cols * S + 2 * F, G.rows * S + 2 * F);
	const a = G.waiting || G.state !== 'play' ? (G.state === 'play' ? 0 : 1) : Math.min (1, G.acc / tick ());
	// the items (sorted by row, blink before they go)
	const its = G.items.slice ().sort ((p, q) => p.y - q.y);
	for (const it of its)
	{
		const ttl = ITEM[it.type].ttl, left = ttl ? ttl - (G.time - it.born) : 1e9;
		if (left < 2000 && Math.floor (t * 8) % 2) continue;
		const age = (G.time - it.born) / 1000, sc = Math.min (1, age * 5);
		ctx.save (); ctx.translate (px (it.x), py (it.y)); ctx.scale (sc, sc);
		ITEM[it.type].draw (ctx, 0, 0, S, t + it.t0);
		ctx.restore ();
	}
	for (const gb of G.gobs)
	{
		const k = gb.stun > 0 ? 1 : Math.min (1, (G.steps - gb.moved + a) / 2);
		drawGoblin (ctx, px (lerp (gb.f.x, gb.x, k)), py (lerp (gb.f.y, gb.y, k)), S, t, gb);
	}
	drawSnake (ctx, a, t);
	for (const r of rings) { ctx.globalAlpha = 1 - r.age / 0.4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; circle (ctx, r.x, r.y, S * 2 * r.age / 0.4); ctx.stroke (); }
	ctx.globalAlpha = 1;
	for (const p of parts)
	{
		const k = 1 - p.age / p.life; ctx.globalAlpha = Math.max (0, k); ctx.fillStyle = p.col;
		if (p.star) { starPath (ctx, p.x, p.y, p.r * 2, p.r * 0.8, 4, p.age * 8); ctx.fill (); }
		else { circle (ctx, p.x, p.y, p.r * (0.5 + k * 0.5)); ctx.fill (); }
	}
	ctx.globalAlpha = 1;
	if (G.frost > 0)
	{	// a frosty board
		const g = ctx.createRadialGradient (bx + G.cols * S / 2, by + G.rows * S / 2, S * 3, bx + G.cols * S / 2, by + G.rows * S / 2, Math.max (G.cols, G.rows) * S * 0.75);
		g.addColorStop (0, 'rgba(190,235,255,.08)'); g.addColorStop (1, 'rgba(190,235,255,.5)');
		ctx.fillStyle = g; ctx.fillRect (bx, by, G.cols * S, G.rows * S);
	}
	for (const f of floats) drawFloat (ctx, f);
	ctx.restore ();
	if (G.demo) return;
	drawPowers (ctx, t);
	const cxm = bx + G.cols * S / 2, cym = by + G.rows * S / 2;
	if (G.waiting && G.state === 'play' && !paused)
	{
		const k = Math.sin (t * 4);
		ctx.fillStyle = 'rgba(30,18,10,.45)'; rr (ctx, bx + S * 0.5, cym - S * 4.4, G.cols * S - S, S * 10.4, S * 0.6); ctx.fill ();
		if (G.mode === 'level') bigText (ctx, tr ('goal', { n: G.lv.goal }), cxm, cym - S * 3.2, S * 1.05, P.gold);
		bigText (ctx, touch ? tr ('swipeStart') : tr ('keyStart'), cxm, cym + S * 3 + k * 3, S * 0.95, '#fff');
		// a hand / arrows hint
		ctx.save (); ctx.globalAlpha = 0.9; ctx.translate (cxm, cym + S * 5.2);
		const off = ((t * 1.2) % 1) * S * 2 - S;
		ctx.fillStyle = '#fff'; ctx.strokeStyle = P.outline; ctx.lineWidth = 3;
		circle (ctx, off, 0, S * 0.35); ctx.fill (); ctx.stroke ();
		ctx.beginPath (); ctx.moveTo (S * 1.6, 0); ctx.lineTo (S * 1.2, -S * 0.3); ctx.lineTo (S * 1.2, S * 0.3); ctx.closePath (); ctx.fill (); ctx.stroke ();
		ctx.restore ();
	}
	for (const b of banners)
	{
		const k = b.age / (b.big ? 0.9 : 1.3), sc = k < 0.15 ? lerp (0.4, 1.25, k / 0.15) : k < 0.3 ? lerp (1.25, 1, (k - 0.15) / 0.15) : 1;
		ctx.save (); ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
		ctx.translate (cxm, cym - S * (b.big ? 1 : 4)); ctx.scale (sc, sc);
		bigText (ctx, b.text, 0, 0, S * (b.big ? 1.6 : 0.95), b.col, b.big ? lerp (-0.14, 0, Math.min (1, k * 4)) : 0);
		ctx.restore ();
	}
}

// ---- the HUD ---------------------------------------------------------------------------------------------------
const $ = (id) => document.getElementById (id);
let shownScore = -1;
function hud ()
{
	if (!G || G.demo) return;
	if (G.score !== shownScore)
	{
		const p = $('hudScore').parentNode;
		$('hudScore').textContent = G.score;
		if (shownScore >= 0) { p.classList.remove ('bump'); void p.offsetWidth; p.classList.add ('bump'); }
		shownScore = G.score;
	}
	const goal = $('hudGoal').parentNode;
	goal.classList.toggle ('endless', G.mode !== 'level');
	if (G.mode === 'level')
	{
		$('hudGoal').textContent = tr ('coins', { a: Math.min (G.coins, G.lv.goal), b: G.lv.goal });
		$('hudBar').style.width = (100 * Math.min (1, G.coins / G.lv.goal)) + '%';
	}
	else $('hudGoal').textContent = tr ('bestIs', { n: Math.max (bestEndless, G.score) });
	hudCombo ();
}
function hudCombo ()
{
	const el = $('hudCombo'), m = G.mult * (G.rush > 0 ? 2 : 1);
	el.classList.toggle ('on', m > 1 && G.state === 'play');
	if (m > 1) { el.textContent = 'x' + m; el.style.setProperty ('--p', Math.max (0, 100 - 100 * (G.time - G.lastPick) / comboWin ()) + '%'); }
}

// ---- the screens -----------------------------------------------------------------------------------------------
let screen = 'title', settingsFrom = 'title';
function show (name)
{
	screen = name;
	document.querySelectorAll ('.screen').forEach ((s) => s.classList.toggle ('on', s.id === 'scr' + name[0].toUpperCase () + name.slice (1)));
	$('hud').classList.toggle ('on', !!G && !G.demo && (name === 'play' || name === 'pause'));
	if (name === 'title') $('bestTitle').textContent = bestEndless ? '★ ' + bestEndless : '';
	if (name === 'levels') buildLevels ();
}
function startDemo ()
{
	newGame ('endless', 0, { demo: true, ai: true, seed: 11 });
	G.gobOn = true; G.gobNext = 6000;
	paused = false;
}
function play (mode, li)
{
	Snd.init ();
	newGame (mode, li, { ai: Q.has ('auto') });
	if (document.activeElement) document.activeElement.blur ();
	paused = false; shownScore = -1; hud ();
	show ('play');
	Snd.play ('ready');
}
function pause (note)
{
	if (!G || G.demo || G.state !== 'play' || paused) return;
	paused = true; pauseNote = note || '';
	$('pauseNote').textContent = pauseNote;
	show ('pause');
}
function resume ()
{
	if (!paused) return;
	paused = false; show ('play');
	if (G.state === 'play' && !G.ai) { G.waiting = true; G.queue.length = 0; G.acc = 0; }	// (the finger comes back first)
	if (document.activeElement) document.activeElement.blur ();
}
function menu () { paused = false; startDemo (); layout (); show ('title'); }
function over ()
{
	$('overScore').textContent = G.score;
	$('overRecord').classList.toggle ('on', !!G.newBest);
	$('overNote').textContent = G.mode === 'level' ? tr ('coinsOf', { a: G.coins, b: G.lv.goal }) + ' · ' + tr ('bestIs', { n: prog.best[G.li] }) : tr ('bestIs', { n: bestEndless });
	show ('over');
}
function showWin ()
{
	const last = G.li === LEVELS.length - 1;
	$('winTitle').textContent = last ? tr ('allDone') : tr ('levelDone');
	$('winScore').textContent = G.score;
	$('winNote').textContent = tr ('starsFor', { a: G.lv.s2, b: G.lv.s3 });
	$('btNext').textContent = last ? tr ('endless') : tr ('next');
	const st = [...$('winStars').children];
	st.forEach ((s) => { s.classList.add ('off'); s.classList.remove ('pop'); });
	show ('win');
	st.forEach ((s, i) => { if (i < G.stars) setTimeout (() => { s.classList.remove ('off'); s.classList.add ('pop'); Snd.play ('ding'); }, 350 + i * 300); });
}
function buildLevels ()
{
	const m = $('levelMap'); m.innerHTML = '';
	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS (ns, 'svg'); svg.setAttribute ('class', 'path'); svg.setAttribute ('viewBox', '0 0 100 100'); svg.setAttribute ('preserveAspectRatio', 'none');
	svg.innerHTML = '<path d="M14 8 C 60 12, 90 20, 86 28 S 12 40, 14 48 S 88 60, 86 68 S 14 80, 14 90" fill="none" stroke="#C9935A" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".9"/>'
		+ '<path d="M14 8 C 60 12, 90 20, 86 28 S 12 40, 14 48 S 88 60, 86 68 S 14 80, 14 90" fill="none" stroke="#E3B77E" stroke-width="2" stroke-dasharray="6 8" vector-effect="non-scaling-stroke"/>';
	m.appendChild (svg);
	LEVELS.forEach ((lv, i) =>
	{
		const open = i === 0 || prog.stars[i - 1] > 0, st = prog.stars[i];
		const b = document.createElement ('button'); b.type = 'button';
		b.className = 'medal' + (open ? '' : ' locked') + (open && !st ? ' next' : '');
		b.innerHTML = '<span class="disc">' + (open ? (i + 1) : '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="#5E656D" stroke="#2A1A0E" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#2A1A0E" stroke-width="2.4"/></svg>') + '</span>'
			+ '<span><span class="name">' + tr (lv.name) + '</span><span class="mini">' + [0, 1, 2].map ((k) => '<i class="star' + (k < st ? '' : ' off') + '"></i>').join ('') + '</span></span>';
		b.setAttribute ('aria-label', tr ('level', { n: i + 1 }) + ' — ' + tr (lv.name) + (open ? '' : ' — ' + tr ('locked')));
		b.disabled = !open;
		b.addEventListener ('click', () => { Snd.init (); Snd.play ('tap'); play ('level', i); });
		m.appendChild (b);
	});
}
function buildLegend ()
{
	const ul = $('legend'); ul.innerHTML = '';
	const rows = [['coin', 'lgCoin'], ['elixir', 'lgElixir'], ['gem', 'lgGem'], ['shield', 'lgShield'], ['frost', 'lgFrost'], ['goblin', 'lgGoblin'], ['combo', 'lgCombo']];
	for (const [k, key] of rows)
	{
		const li = document.createElement ('li'), c = document.createElement ('canvas');
		c.width = c.height = 80; const g = c.getContext ('2d'); g.scale (2, 2); g.lineJoin = 'round';
		const saveOL = OL; OL = 2.4;
		if (k === 'goblin') drawGoblin (g, 20, 22, 36, 0, null);
		else if (k === 'combo') { g.font = '900 20px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = P.outline; g.strokeText ('x4', 20, 21); g.fillStyle = P.gold; g.fillText ('x4', 20, 21); }
		else ITEM[k].draw (g, 20, 20, 36, 0.3);
		OL = saveOL;
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
	buildLegend ();
	if (screen === 'levels') buildLevels ();
	if (screen === 'title') $('bestTitle').textContent = bestEndless ? '★ ' + bestEndless : '';
	hud ();
}
function saveSettings ()
{
	CFG.sound = $('setSound').checked; CFG.music = $('setMusic').checked; CFG.dpad = $('setDpad').checked; CFG.vibrate = $('setVibrate').checked;
	store.set ('settings', CFG); layout ();
}

// ---- input -----------------------------------------------------------------------------------------------------
const playing = () => G && !G.demo && G.state === 'play' && !paused && screen === 'play';
document.addEventListener ('keydown', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	const map = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, z: 0, d: 1, s: 2, a: 3, q: 3 };
	if (playing () && k in map) { e.preventDefault (); turn (map[k]); return; }
	if (k === ' ' || k === 'p' || k === 'Escape')
	{
		if (playing ()) { e.preventDefault (); pause (); return; }
		if (screen === 'pause') { e.preventDefault (); resume (); return; }
		if (k === 'Escape' && screen !== 'title' && screen !== 'play') { e.preventDefault (); back (); return; }
	}
	if (k === 'Enter' && screen !== 'play') { const b = primary (); if (b && document.activeElement !== b && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { e.preventDefault (); b.click (); } }
});
function primary ()
{
	const s = document.querySelector ('.screen.on');
	return s && (s.querySelector ('.btn.big') || s.querySelector ('.medal.next') || s.querySelector ('.btn:not(.back)'));
}
function back ()
{
	if (screen === 'settings') { show (settingsFrom); return; }
	if (screen === 'pause') { resume (); return; }
	if (screen === 'over' || screen === 'win') { menu (); return; }
	show ('title');
}
// swipes: anywhere on the screen while playing; a turn as soon as the finger went far enough
let sw = null;
window.addEventListener ('pointerdown', (e) =>
{
	if (!playing () || (e.target.closest && e.target.closest ('button'))) return;
	sw = { id: e.pointerId, x: e.clientX, y: e.clientY };
}, { passive: true });
window.addEventListener ('pointermove', (e) =>
{
	if (!sw || e.pointerId !== sw.id) return;
	const dx = e.clientX - sw.x, dy = e.clientY - sw.y, th = Math.max (18, 0.4 * S);
	if (Math.abs (dx) < th && Math.abs (dy) < th) return;
	turn (Math.abs (dx) > Math.abs (dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
	sw.x = e.clientX; sw.y = e.clientY;
}, { passive: true });
const endSwipe = (e) => { if (sw && e.pointerId === sw.id) sw = null; };
window.addEventListener ('pointerup', endSwipe); window.addEventListener ('pointercancel', endSwipe);
document.addEventListener ('touchmove', (e) => { if (screen === 'play') e.preventDefault (); }, { passive: false });
document.querySelectorAll ('#dpad button').forEach ((b) =>
{
	b.addEventListener ('pointerdown', (e) => { e.preventDefault (); b.classList.add ('pressed'); turn (+b.dataset.d); });
	for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener (ev, () => b.classList.remove ('pressed'));
});
// the gamepad
let padPrev = 0;
function pollPad ()
{
	const gps = navigator.getGamepads ? navigator.getGamepads () : [];
	let b = 0;
	for (const gp of gps)
	{
		if (!gp) continue;
		const bt = (i) => gp.buttons[i] && gp.buttons[i].pressed;
		const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
		if (bt (12) || ay < -0.5) b |= 1; if (bt (15) || ax > 0.5) b |= 2; if (bt (13) || ay > 0.5) b |= 4; if (bt (14) || ax < -0.5) b |= 8;
		if (bt (0)) b |= 16; if (bt (9)) b |= 32; if (bt (1)) b |= 64;
	}
	const pr = b & ~padPrev; padPrev = b;
	if (!pr) return;
	if (playing ()) { for (let d = 0; d < 4; d++) if (pr & (1 << d)) turn (d); if (pr & 32) pause (); return; }
	if (screen === 'pause' && (pr & 32)) { resume (); return; }
	if (pr & 16) { const p = primary (); if (p) p.click (); }
	if (pr & 64) back ();
}

// ---- the buttons -----------------------------------------------------------------------------------------------
document.addEventListener ('pointerdown', (e) => { if (e.target.closest && e.target.closest ('.btn, .medal, .seg button, .toggle')) { Snd.init (); } }, { passive: true });
document.addEventListener ('click', (e) => { if (e.target.closest && e.target.closest ('.btn, .seg button')) Snd.play ('tap'); });
$('btPlay').addEventListener ('click', () => show ('levels'));
$('btEndless').addEventListener ('click', () => play ('endless', 0));
$('btHow').addEventListener ('click', () => show ('how'));
$('btSettings').addEventListener ('click', () => { settingsFrom = 'title'; show ('settings'); });
$('btSettings2').addEventListener ('click', () => { settingsFrom = 'pause'; show ('settings'); });
$('btSetBack').addEventListener ('click', () => show (settingsFrom));
$('btPause').addEventListener ('click', () => pause ());
$('btResume').addEventListener ('click', resume);
$('btRestart').addEventListener ('click', () => play (G.mode, G.li));
$('btRetry').addEventListener ('click', () => play (G.mode, G.li));
$('btRetry2').addEventListener ('click', () => play (G.mode, G.li));
$('btNext').addEventListener ('click', () => { if (G.li < LEVELS.length - 1) play ('level', G.li + 1); else play ('endless', 0); });
document.querySelectorAll ('[data-go]').forEach ((b) => b.addEventListener ('click', () => { const g = b.dataset.go; if (g === 'menu') menu (); else show (g); }));
for (const [id, k] of [['setSound', 'sound'], ['setMusic', 'music'], ['setDpad', 'dpad'], ['setVibrate', 'vibrate']]) { $(id).checked = !!CFG[k]; $(id).addEventListener ('change', saveSettings); }
document.querySelectorAll ('.seg button').forEach ((b) => b.addEventListener ('click', () => { if (window.Site) Site.setLang (b.dataset.lang); applyLang (); }));
if (window.Site) Site.onLang (applyLang);
document.addEventListener ('visibilitychange', () => { if (document.hidden) pause (); });
window.addEventListener ('blur', () => pause ());
window.addEventListener ('resize', layout);
if (window.visualViewport) visualViewport.addEventListener ('resize', layout);

// ---- the loop --------------------------------------------------------------------------------------------------
let last = 0;
function loop (ts)
{
	const ms = last ? Math.min (50, ts - last) : 16;
	last = ts;
	pollPad ();
	update (ms);
	draw (ts / 1000);
	requestAnimationFrame (loop);
}
// test hooks (tools/shots-drako.js): the state, a frame advanced by hand
window.Drako = { get G () { return G; }, play, pause, resume, show, turn, update, draw: () => draw (performance.now () / 1000), layout, prog, get screen () { return screen; } };

startDemo ();
layout ();
applyLang ();
if (Q.has ('level')) play ('level', Math.max (0, Math.min (4, (+Q.get ('level') || 1) - 1)));
else if (Q.has ('endless')) play ('endless', 0);
requestAnimationFrame (loop);
}) ();
