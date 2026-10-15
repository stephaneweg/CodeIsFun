// zap.js -- COSMO ZAP!: a cartoon Space Invaders for Code is Fun. Wobbly aliens (squids, crabs, blobs) march down and
// speed up as they fall; Zip in the bubble ship shoots them from behind cheese bunkers; a flying saucer crosses the sky
// and drops capsules (triple shot, rapid fire, bubble shield, extra life); combos, endless waves. Everything is drawn on
// the canvas and every sound is synthesized (WebAudio): no asset. Keyboard, mouse, a finger (the ship follows the
// finger's slide and fires while it is down), a gamepad. Test hooks: ?auto (the autopilot plays), ?seed=N, ?wave=N.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';

// ---- the words (EN | FR) ----------------------------------------------------------------------------------------
const T = {
	subtitle: ['Save the planet from the toon invaders!', 'Sauve la planète des envahisseurs !'], play: ['Play', 'Jouer'],
	settings: ['Settings', 'Réglages'], backSite: ['Back to Code is Fun', 'Retour à Code is Fun'],
	howBtn: ['How to play', 'Comment jouer'], ok: ['OK!', 'OK !'], paused: ['Paused', 'Pause'], resume: ['Resume', 'Reprendre'],
	restart: ['Restart', 'Recommencer'], menu: ['Menu', 'Menu'], retry: ['Play again', 'Rejouer'],
	gameOver: ['Game over', 'Perdu !'], newRecord: ['New record!', 'Nouveau record !'], sound: ['Sound', 'Son'],
	march: ['Alien march', 'La marche des envahisseurs'], reduced: ['Less motion', 'Moins d\'animations'],
	relaxed: ['Relaxed (5 lives, slower)', 'Tranquille (5 vies, plus lent)'], language: ['Language', 'Langue'],
	aliensT: ['The invaders', 'Les envahisseurs'], capsT: ['Capsules', 'Les capsules'],
	howKeys: ['← → (or A D, Q D) to move, Space to fire (hold it down). P or Esc: pause. Zap every invader before they land! Hide behind the cheese bunkers — the aliens nibble them too. Shoot the flying saucer: it drops a capsule, catch it with your ship.',
		'← → (ou Q D, A D) pour bouger, Espace pour tirer (garde-la appuyée). P ou Échap : pause. Zappe tous les envahisseurs avant qu\'ils atterrissent ! Cache-toi derrière les fromages — les aliens les grignotent aussi. Tire sur la soucoupe : elle lâche une capsule, attrape-la avec ton vaisseau.'],
	howTouch: ['Slide your finger anywhere on the screen: the ship follows it, and fires as long as your finger is down. Zap every invader before they land! Hide behind the cheese bunkers. Shoot the flying saucer: it drops a capsule, catch it with your ship.',
		'Fais glisser ton doigt n\'importe où sur l\'écran : le vaisseau le suit, et tire tant que ton doigt est posé. Zappe tous les envahisseurs avant qu\'ils atterrissent ! Cache-toi derrière les fromages. Tire sur la soucoupe : elle lâche une capsule, attrape-la avec ton vaisseau.'],
	a0: ['Squid: 30 points', 'Calmar : 30 points'], a1: ['Crab: 20 points', 'Crabe : 20 points'], a2: ['Blob: 10 points', 'Gloubi : 10 points'],
	a3: ['Saucer: a mystery bonus and a capsule', 'Soucoupe : un bonus mystère et une capsule'],
	cT: ['Triple shot', 'Tir triple'], cR: ['Rapid fire', 'Tir rapide'], cS: ['Bubble: saves you once', 'Bulle : te protège une fois'],
	cL: ['Extra life', 'Vie en plus'],
	wave: ['WAVE {n}', 'VAGUE {n}'], waveClear: ['WAVE CLEAR!', 'VAGUE NETTOYÉE !'], ready: ['Ready?', 'Prêt ?'],
	best: ['Best: {n} · wave {w}', 'Record : {n} · vague {w}'], extraLife: ['EXTRA LIFE!', 'VIE EN PLUS !'],
	combo: ['COMBO x{n}!', 'COMBO x{n} !'], invaded: ['They landed!', 'Ils ont atterri !'],
	overNote: ['You reached wave {n}.', 'Tu es arrivé à la vague {n}.'], score: ['SCORE', 'SCORE'], hi: ['BEST', 'RECORD'],
	bonus: ['BONUS +{n}', 'BONUS +{n}'], tripleOn: ['TRIPLE!', 'TRIPLE !'], rapidOn: ['RAPID!', 'RAFALE !'], bubbleOn: ['BUBBLE!', 'BULLE !'] };
const lang = () => (window.Site && Site.lang === 'fr') ? 1 : 0;
function tr (k, v) { let s = (T[k] || [k, k])[lang ()]; if (v) for (const n in v) s = s.split ('{' + n + '}').join (v[n]); return s; }
const $ = (id) => document.getElementById (id);
const Q = new URLSearchParams (location.search);

// ---- storage (every access may fail: private mode, blocked storage) ---------------------------------------------
const store = {
	get (k, d) { try { const v = localStorage.getItem ('codeisfun.invaders.' + k); return v === null ? d : JSON.parse (v); } catch (e) { return d; } },
	set (k, v) { try { localStorage.setItem ('codeisfun.invaders.' + k, JSON.stringify (v)); } catch (e) { /* this visit only */ } } };
const reducedOS = matchMedia ('(prefers-reduced-motion: reduce)').matches;
const CFG = Object.assign ({ sound: true, march: true, reduced: reducedOS, relaxed: false }, store.get ('settings', {}));
const rec = Object.assign ({ high: 0, wave: 0 }, store.get ('record', {}));

// ---- the playfield (logical units: 600 x 800, scaled to the screen) ---------------------------------------------
const W = 600, H = 800, HUDH = 54, GROUND = H - 44, PY = H - 84;
const DT = 1 / 120, TAU = Math.PI * 2;
const OL = '#251B3D', CREAM = '#FFFDF8';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const COLS = 9, ROWS = 5, CW = 52, CH = 46;
// one kind per row: the squids on top (30), the crabs (20), the blobs at the bottom (10)
const ROWKIND = [
	{ k: 'squid', pts: 30, col: '#B47CFF', edge: '#7E4BD6' }, { k: 'crab', pts: 20, col: '#3DD68C', edge: '#1F9E62' },
	{ k: 'crab', pts: 20, col: '#34D3E0', edge: '#1A97A3' }, { k: 'blob', pts: 10, col: '#FF7AB6', edge: '#D44A8C' },
	{ k: 'blob', pts: 10, col: '#FF9F1C', edge: '#C46F00' } ];
const CAPS = {
	T: { col: '#FFD23F', dur: 12, txt: '3' }, R: { col: '#FF5A5F', dur: 10, txt: '»' },
	S: { col: '#34D3E0', txt: '◯' }, L: { col: '#3DD68C', txt: '♥' } };
const POWS = ['POW!', 'ZAP!', 'BOOM!', 'SPLAT!', 'ZOING!', 'PAF!'];
// the cheese bunkers: 14 x 10 cells of 6 units
const BC = 6, BCOLS = 14, BROWS = 10, BUNKY = PY - 118;

// ---- small helpers ----------------------------------------------------------------------------------------------
let seed = (+Q.get ('seed') || (Math.random () * 1e9)) >>> 0;
function rnd () { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul (t ^ (t >>> 15), t | 1); t ^= t + Math.imul (t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const motion = () => !CFG.reduced;
const touchUI = matchMedia ('(pointer: coarse)').matches;

// ---- the canvas -------------------------------------------------------------------------------------------------
const cv = $('cv');
let g = cv.getContext ('2d');
let VW = 0, VH = 0, DPR = 1, S = 1, OX = 0, OY = 0;
function layout ()
{
	VW = window.innerWidth; VH = window.innerHeight;
	DPR = Math.min (2, window.devicePixelRatio || 1);
	cv.width = Math.round (VW * DPR); cv.height = Math.round (VH * DPR);
	const r = $('safe').getBoundingClientRect ();
	const t = r.top, l = r.left, rr = VW - r.right, b = VH - r.bottom;
	S = Math.min ((VW - l - rr) / W, (VH - t - b) / H);
	OX = l + ((VW - l - rr) - W * S) / 2; OY = t + ((VH - t - b) - H * S) / 2;
	const bp = $('btPause'), sz = Math.max (40, Math.round (44 * S));
	bp.style.width = bp.style.height = sz + 'px';
	bp.style.left = Math.round (OX + (W - 8) * S - sz) + 'px';
	bp.style.top = Math.round (OY + (HUDH / 2) * S - sz / 2) + 'px';
}

// ---- the sound (WebAudio, synthesized) --------------------------------------------------------------------------
const Snd = {
	ac: null, out: null, noiseBuf: null,
	init ()
	{
		if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume (); return; }
		try
		{
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			const ac = this.ac = new AC ();
			this.out = ac.createGain (); this.out.gain.value = 0.32; this.out.connect (ac.destination);
			const n = ac.sampleRate, buf = ac.createBuffer (1, n, n), d = buf.getChannelData (0);
			for (let i = 0; i < n; i++) d[i] = Math.random () * 2 - 1;
			this.noiseBuf = buf;
		}
		catch (e) { this.ac = null; }
	},
	ok () { return this.ac && CFG.sound && G && !G.demo; },
	tone (type, f0, f1, dur, gain, at)
	{
		const ac = this.ac, t = ac.currentTime + (at || 0), o = ac.createOscillator (), gn = ac.createGain ();
		o.type = type;
		o.frequency.setValueAtTime (f0, t);
		if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime (f1, t + dur);
		gn.gain.setValueAtTime (0.0001, t);
		gn.gain.linearRampToValueAtTime (gain, t + 0.005);
		gn.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		o.connect (gn); gn.connect (this.out);
		o.start (t); o.stop (t + dur + 0.03);
	},
	noise (dur, gain, ftype, f0, f1, at)
	{
		const ac = this.ac, t = ac.currentTime + (at || 0), s = ac.createBufferSource (), f = ac.createBiquadFilter (), gn = ac.createGain ();
		s.buffer = this.noiseBuf; f.type = ftype; f.frequency.setValueAtTime (f0, t);
		if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime (f1, t + dur);
		gn.gain.setValueAtTime (0.0001, t); gn.gain.linearRampToValueAtTime (gain, t + 0.005); gn.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		s.connect (f); f.connect (gn); gn.connect (this.out);
		s.start (t, Math.random () * 0.5); s.stop (t + dur + 0.03);
	},
	play (k, a)
	{
		if (k !== 'tap' && !this.ok ()) return;
		if (k === 'tap' && !(this.ac && CFG.sound)) return;
		const m = (n) => 440 * Math.pow (2, (n - 69) / 12);
		switch (k)
		{
		case 'shoot': this.tone ('square', 1400, 380, 0.1, 0.16); break;
		case 'pop': this.tone ('square', m (76 + Math.min (a || 0, 12)), m (60), 0.12, 0.28); this.noise (0.08, 0.3, 'bandpass', 2400, 600); break;
		case 'step': this.tone ('triangle', m ([45, 43, 41, 40][a & 3]), 0, 0.12, 0.6); break;
		case 'bomb': this.tone ('sine', 900, 500, 0.08, 0.06); break;
		case 'chomp': this.noise (0.07, 0.3, 'lowpass', 1200, 300); break;
		case 'ufo': this.tone ('sine', a ? 760 : 620, a ? 620 : 760, 0.16, 0.12); break;
		case 'ufoHit': [84, 79, 76, 72, 67].forEach ((n, i) => this.tone ('square', m (n), 0, 0.08, 0.2, i * 0.05)); this.noise (0.4, 0.4, 'lowpass', 3000, 200); break;
		case 'power': [72, 76, 79, 84].forEach ((n, i) => this.tone ('square', m (n), 0, 0.07, 0.22, i * 0.05)); break;
		case 'life': [72, 79, 84, 91].forEach ((n, i) => this.tone ('triangle', m (n), 0, 0.1, 0.4, i * 0.07)); break;
		case 'bubble': this.tone ('sine', 400, 1200, 0.25, 0.4); break;
		case 'die': this.noise (0.7, 0.8, 'lowpass', 2500, 80); this.tone ('sawtooth', 300, 40, 0.7, 0.3); break;
		case 'wave': [60, 64, 67, 72, 67, 72].forEach ((n, i) => this.tone ('square', m (n), 0, 0.1, 0.18, i * 0.09)); break;
		case 'clear': [72, 76, 79].forEach ((n, i) => this.tone ('square', m (n), 0, 0.12, 0.22, i * 0.12)); this.tone ('square', m (84), 0, 0.45, 0.22, 0.36); break;
		case 'over': [64, 63, 62].forEach ((n, i) => this.tone ('triangle', m (n), 0, 0.3, 0.4, i * 0.3)); this.tone ('triangle', m (61), m (49), 0.8, 0.4, 0.9); break;
		case 'tap': this.tone ('sine', 600, 0, 0.03, 0.3); break;
		}
	} };

// ---- the game ---------------------------------------------------------------------------------------------------
let G = null, screen = 'title', paused = false, settingsFrom = 'title';
// the sky: stars that twinkle, a ringed planet, a moon (fixed, drawn every frame)
const SKY = { stars: [] };
for (let i = 0; i < 200; i++) SKY.stars.push ({ x: -500 + Math.random () * (W + 1000), y: HUDH + Math.random () * (GROUND - HUDH - 30), r: 0.8 + Math.random () * 1.8, ph: Math.random () * TAU, sp: 0.5 + Math.random () * 2, v: 4 + Math.random () * 10 });

function newGame (demo)
{
	G = { demo: !!demo, score: 0, lives: CFG.relaxed && !demo ? 5 : 3, wave: 0, t: 0, nextLife: 5000, combo: 0, comboT: 0,
		p: { x: W / 2, tx: null, cool: 0, dead: 0, inv: 0, shield: false, triple: 0, rapid: 0, tilt: 0, happy: 0, recoil: 0 },
		parts: [], bursts: [], shake: 0, shakeA: 0, kills: 0, fired: 0, over: 0 };
	startWave (demo ? 1 + Math.floor (Math.random () * 3) : Math.max (1, +Q.get ('wave') || 1));
}
function startWave (n)
{
	G.wave = n;
	G.aliens = [];
	for (let r = 0; r < ROWS; r++)
		for (let c = 0; c < COLS; c++)
			G.aliens.push ({ r, c, alive: true, ...ROWKIND[r], blink: rnd () * 5, ph: rnd () * TAU, wx: 0, wy: 0 });
	G.total = G.aliens.length;
	G.fx = (W - (COLS - 1) * CW) / 2;
	G.fyT = HUDH + 96 + Math.min (n - 1, 6) * 14;
	G.fy = G.fyT - 380;
	G.dir = 1; G.drop = 0; G.marchT = 0.5; G.marchI = 0;
	G.shots = []; G.bombs = []; G.caps = [];
	G.ufo = null; G.ufoT = 10 + rnd () * 10; G.ufoBeep = 0;
	G.bombT = 2;
	G.bunkers = [];
	for (let i = 0; i < 4; i++) G.bunkers.push (makeBunker (W * (i + 1) / 5 - BCOLS * BC / 2, BUNKY));
	place ();
	G.state = 'intro'; G.stateT = 1.8;
	banner (tr ('wave', { n }), 1.8, '#FFD23F');
	Snd.play ('wave');
}
function makeBunker (x, y)
{
	const cells = new Uint8Array (BCOLS * BROWS);
	for (let r = 0; r < BROWS; r++)
		for (let c = 0; c < BCOLS; c++)
		{
			const cut = 3 - r;                                            // the rounded top corners
			if (cut > 0 && (c < cut || c > BCOLS - 1 - cut)) continue;
			if (r >= BROWS - 4 && c >= 4 && c <= BCOLS - 5)              // the arch underneath
			{
				if (r > BROWS - 4 || (c > 4 && c < BCOLS - 5)) continue;
			}
			cells[r * BCOLS + c] = 1;
		}
	return { x, y, cells };
}
function ax (a) { return G.fx + a.c * CW; }
function ay (a) { return G.fy + a.r * CH; }
function place () { for (const a of G.aliens) { a.wx = ax (a); a.wy = ay (a); } }
function aliveAliens () { return G.aliens.filter ((a) => a.alive); }
function frac () { return 1 - aliveAliens ().length / G.total; }
function banner (txt, life, col) { G.banner = { txt, life, max: life, col: col || '#FFD23F' }; }

// ---- input state ------------------------------------------------------------------------------------------------
const IN = { kl: false, kr: false, kdir: 0, fire: false, mouseX: null, touch: null, pad: 0 };

// ---- the simulation ---------------------------------------------------------------------------------------------
let acc = 0;
function update (ms)
{
	if (!G || paused) return;
	acc += ms / 1000;
	let n = 0;
	while (acc >= DT && n++ < 30) { step (DT); acc -= DT; }
	if (n >= 30) acc = 0;
}
function step (dt)
{
	const relaxed = CFG.relaxed && !G.demo;
	G.t += dt;
	stepFx (dt);
	if (G.state === 'over') { G.over += dt; if (G.over > 1.6 && !G.demo && screen === 'play') finish (); if (G.demo && G.over > 2.5) newGame (true); return; }
	if (G.comboT > 0 && (G.comboT -= dt) <= 0) G.combo = 0;
	stepPlayer (dt);
	stepShots (dt);
	stepCaps (dt);
	if (G.state === 'intro')
	{
		G.fy += (G.fyT - G.fy) * Math.min (1, dt * 3.5);
		place ();
		if ((G.stateT -= dt) <= 0) { G.fy = G.fyT; G.state = 'play'; }
		return;
	}
	if (G.state === 'clear')
	{
		if ((G.stateT -= dt) <= 0) startWave (G.wave + 1);
		return;
	}
	if (G.p.dead > 0 && G.lives <= 0) return;               // the end: everything freezes while the ship blows up
	stepAliens (dt * (relaxed ? 0.7 : 1));
	stepBombs (dt * (relaxed ? 0.8 : 1));
	stepUfo (dt);
	if (G.state === 'play' && !aliveAliens ().length) waveClear ();
}
function stepPlayer (dt)
{
	const p = G.p;
	if (p.dead > 0)
	{
		if ((p.dead -= dt) <= 0)
		{
			if (G.lives <= 0) { gameOver (); return; }
			p.x = W / 2; p.tx = null; p.inv = 2.2; p.dead = 0;
		}
		return;
	}
	if (p.inv > 0) p.inv -= dt;
	if (p.triple > 0) p.triple -= dt;
	if (p.rapid > 0) p.rapid -= dt;
	if (p.happy > 0) p.happy -= dt;
	if (p.recoil > 0) p.recoil = Math.max (0, p.recoil - dt * 6);
	p.cool -= dt;
	let dir = 0, fire = false;
	if (G.demo || Q.has ('auto')) { const a = autopilot (); dir = a.dir; fire = a.fire; p.tx = a.tx; }
	else
	{
		fire = IN.fire || !!IN.touch;
		if (IN.kdir) { dir = IN.kdir; p.tx = null; IN.mouseX = null; }
		else if (IN.touch) p.tx = clamp (IN.touch.px + (IN.touch.x - IN.touch.x0) * 1.3, 32, W - 32);
		else if (IN.mouseX !== null) p.tx = IN.mouseX;
	}
	const sp = 380, x0 = p.x;
	if (dir) p.x += dir * sp * dt;
	else if (p.tx !== null) { const d = p.tx - p.x; p.x += clamp (d, -760 * dt, 760 * dt); }
	p.x = clamp (p.x, 32, W - 32);
	const vx = (p.x - x0) / dt;
	p.tilt += (clamp (vx / 2600, -0.22, 0.22) - p.tilt) * Math.min (1, dt * 12);
	if (fire && p.cool <= 0 && G.state !== 'clear') shoot ();
}
function shoot ()
{
	const p = G.p, rapid = p.rapid > 0;
	const max = rapid ? 5 : 2;
	if (G.shots.length >= max) return;
	p.cool = rapid ? 0.11 : 0.3;
	const y = PY - 30;
	G.shots.push ({ x: p.x, y, vx: 0, vy: -760 });
	if (p.triple > 0) { G.shots.push ({ x: p.x - 8, y: y + 4, vx: -150, vy: -740 }); G.shots.push ({ x: p.x + 8, y: y + 4, vx: 150, vy: -740 }); }
	p.recoil = 1; G.fired++;
	part (p.x, y, 0, -40, '#FFF6A8', 0.15, 'r', 10);
	Snd.play ('shoot');
}
function stepShots (dt)
{
	for (let i = G.shots.length - 1; i >= 0; i--)
	{
		const s = G.shots[i];
		s.x += s.vx * dt; s.y += s.vy * dt;
		let hit = s.y < HUDH || s.x < 0 || s.x > W;
		// an alien
		if (!hit) for (const a of G.aliens)
		{
			if (!a.alive) continue;
			if (Math.abs (s.x - a.wx) < 21 && Math.abs (s.y - a.wy) < 19) { killAlien (a); hit = true; break; }
		}
		// the saucer
		if (!hit && G.ufo && Math.abs (s.x - G.ufo.x) < 36 && Math.abs (s.y - G.ufo.y) < 18) { hitUfo (); hit = true; }
		// a bomb (the shots cancel the bombs, sometimes)
		if (!hit) for (let j = G.bombs.length - 1; j >= 0; j--)
		{
			const b = G.bombs[j];
			if (Math.abs (s.x - b.x) < 9 && Math.abs (s.y - b.y) < 14)
			{
				G.bombs.splice (j, 1); hit = true;
				sparks (b.x, b.y, 8, '#FFF6A8'); addScore (5, b.x, b.y, true);
				break;
			}
		}
		// a bunker
		if (!hit && bunkerHit (s.x, s.y - 6, 1.4)) { hit = true; sparks (s.x, s.y - 6, 5, '#FFD23F'); }
		if (hit) G.shots.splice (i, 1);
	}
}
function stepAliens (dt)
{
	const live = aliveAliens (), n = live.length;
	if (!n) return;
	const f = frac ();
	const sp = (26 + Math.min (G.wave, 12) * 5) * (1 + f * 3.4) + (n === 1 ? 140 : n <= 3 ? 50 : 0);
	if (G.drop > 0) { const d = Math.min (G.drop, 140 * dt); G.fy += d; G.drop -= d; }
	else
	{
		G.fx += G.dir * sp * dt;
		let lo = Infinity, hi = -Infinity;
		for (const a of live) { const x = ax (a); if (x < lo) lo = x; if (x > hi) hi = x; }
		if (G.dir > 0 && hi + 24 > W - 10) { G.fx -= hi + 24 - (W - 10); G.dir = -1; G.drop = 18; }
		else if (G.dir < 0 && lo - 24 < 10) { G.fx += 10 - (lo - 24); G.dir = 1; G.drop = 18; }
	}
	// the march: four bass notes, faster as they fall
	if ((G.marchT -= dt) <= 0)
	{
		G.marchT = clamp (0.85 - f * 0.7 - G.wave * 0.02, 0.1, 0.85);
		G.marchI++;
		if (CFG.march) Snd.play ('step', G.marchI);
	}
	let low = 0;
	for (const a of live)
	{
		a.wx = ax (a); a.wy = ay (a);
		low = Math.max (low, a.wy + 18);
		// the aliens nibble the bunkers they walk through
		if (a.wy + 18 > BUNKY) for (let k = 0; k < 3; k++) if (bunkerHit (a.wx - 16 + k * 16, a.wy + 14, 1.6, true) && rnd () < 0.05) Snd.play ('chomp');
	}
	if (low >= PY - 26 && G.p.dead <= 0)
	{
		// they landed: the game is lost
		G.lives = 0;
		banner (tr ('invaded'), 2, '#FF5A5F');
		killPlayer (true);
	}
	// the bombs: a bottom alien of a column, often the one above the ship
	if ((G.bombT -= dt) <= 0)
	{
		G.bombT = Math.max (0.22, 1.35 - G.wave * 0.07 - f * 0.55) * (0.6 + rnd () * 0.8);
		const max = 2 + Math.min (4, Math.floor (G.wave / 2));
		if (G.bombs.length < max && G.p.dead <= 0)
		{
			const bottoms = {};
			for (const a of live) if (!bottoms[a.c] || a.r > bottoms[a.c].r) bottoms[a.c] = a;
			const list = Object.values (bottoms);
			let a = list[Math.floor (rnd () * list.length)];
			if (rnd () < 0.45) { let best = Infinity; for (const b of list) { const d = Math.abs (b.wx - G.p.x); if (d < best) { best = d; a = b; } } }
			a.shoot = 0.25;
			G.bombs.push ({ x: a.wx, y: a.wy + 18, vy: 190 + Math.min (G.wave, 10) * 12 + rnd () * 70, kind: rnd () < 0.5 ? 'goo' : 'zig', t: 0 });
			Snd.play ('bomb');
		}
	}
	for (const a of live) if (a.shoot > 0) a.shoot -= dt;
}
function stepBombs (dt)
{
	const p = G.p;
	for (let i = G.bombs.length - 1; i >= 0; i--)
	{
		const b = G.bombs[i];
		b.y += b.vy * dt; b.t += dt;
		let gone = false;
		if (bunkerHit (b.x, b.y + 8, 1.6)) { gone = true; sparks (b.x, b.y + 8, 6, b.kind === 'goo' ? '#8CF25A' : '#FFD23F'); Snd.play ('chomp'); }
		else if (p.dead <= 0 && Math.abs (b.x - p.x) < 26 && b.y + 8 > PY - 22 && b.y < PY + 14)
		{
			gone = true;
			if (p.inv > 0) { sparks (b.x, b.y, 6, '#FFFFFF'); }
			else if (p.shield) { p.shield = false; p.inv = 1.2; ring (p.x, PY - 6, '#34D3E0', 50); sparks (p.x, PY - 10, 14, '#34D3E0'); Snd.play ('bubble'); burst (p.x, PY - 70, 'BLOP!', 34); }
			else { killPlayer (false); return; }               // (it cleared every bomb)
		}
		else if (b.y > GROUND) { gone = true; splat (b.x, GROUND, b.kind === 'goo' ? '#8CF25A' : '#FFD23F'); }
		if (gone) G.bombs.splice (i, 1);
	}
}
function stepUfo (dt)
{
	if (!G.ufo)
	{
		if ((G.ufoT -= dt) <= 0 && aliveAliens ().length > 4)
		{
			const d = rnd () < 0.5 ? 1 : -1;
			G.ufo = { x: d > 0 ? -50 : W + 50, y: HUDH + 30, d, t: 0 };
		}
		return;
	}
	const u = G.ufo;
	u.t += dt; u.x += u.d * 130 * dt;
	if ((G.ufoBeep -= dt) <= 0) { G.ufoBeep = 0.18; Snd.play ('ufo', Math.floor (u.t / 0.18) & 1); }
	if (u.x < -70 || u.x > W + 70) { G.ufo = null; G.ufoT = 14 + rnd () * 12; }
}
function hitUfo ()
{
	const u = G.ufo, pts = [50, 100, 150, 300][Math.floor (rnd () * 4)];
	G.ufo = null; G.ufoT = 16 + rnd () * 12;
	addScore (pts, u.x, u.y + 20);
	for (let i = 0; i < 26; i++) part (u.x, u.y, (rnd () - 0.5) * 420, (rnd () - 0.7) * 320, ['#B8C2CC', '#FF7AB6', '#FFD23F', '#34D3E0'][i & 3], 0.9, 'c', 4 + rnd () * 4);
	ring (u.x, u.y, '#FFD23F', 70);
	burst (u.x, u.y + 40, '+' + pts, 40);
	shake (8, 0.35);
	Snd.play ('ufoHit');
	// it always drops a capsule
	const keys = G.lives < 5 && rnd () < 0.18 ? ['L'] : ['T', 'R', 'S'];
	G.caps.push ({ x: clamp (u.x, 30, W - 30), y: u.y + 10, k: keys[Math.floor (rnd () * keys.length)], t: 0 });
}
function stepCaps (dt)
{
	const p = G.p;
	for (let i = G.caps.length - 1; i >= 0; i--)
	{
		const c = G.caps[i];
		c.t += dt; c.y += 150 * dt;
		if (p.dead <= 0 && Math.abs (c.x - p.x) < 38 && c.y > PY - 30 && c.y < PY + 18) { G.caps.splice (i, 1); catchCap (c); continue; }
		if (c.y > GROUND + 10) G.caps.splice (i, 1);
	}
}
function catchCap (c)
{
	const p = G.p;
	p.happy = 1.2;
	ring (p.x, PY - 10, CAPS[c.k].col, 46);
	if (c.k === 'T') { p.triple = CAPS.T.dur; burst (p.x, PY - 80, tr ('tripleOn'), 36); Snd.play ('power'); }
	else if (c.k === 'R') { p.rapid = CAPS.R.dur; burst (p.x, PY - 80, tr ('rapidOn'), 36); Snd.play ('power'); }
	else if (c.k === 'S') { p.shield = true; burst (p.x, PY - 80, tr ('bubbleOn'), 36); Snd.play ('bubble'); }
	else if (c.k === 'L') { G.lives = Math.min (6, G.lives + 1); burst (p.x, PY - 80, tr ('extraLife'), 34); Snd.play ('life'); }
	addScore (50, p.x, PY - 40, true);
}
function killAlien (a)
{
	a.alive = false;
	G.kills++;
	G.combo = G.comboT > 0 ? G.combo + 1 : 1;
	G.comboT = 0.9;
	const mult = G.combo >= 9 ? 4 : G.combo >= 6 ? 3 : G.combo >= 3 ? 2 : 1;
	if (mult > 1 && (G.combo === 3 || G.combo === 6 || G.combo === 9)) burst (a.wx, a.wy - 30, tr ('combo', { n: mult }), 36);
	else if (rnd () < 0.12) burst (a.wx, a.wy - 26, POWS[Math.floor (rnd () * POWS.length)], 30);
	addScore (a.pts * mult, a.wx, a.wy);
	for (let i = 0; i < 14; i++) part (a.wx, a.wy, (rnd () - 0.5) * 340, (rnd () - 0.8) * 260, i & 1 ? a.col : a.edge, 0.7, 'c', 3 + rnd () * 4);
	part (a.wx, a.wy, 0, 0, a.col, 0.3, 'star', 30);
	ring (a.wx, a.wy, '#FFFFFF', 34);
	// the eyes fly off, a cartoon touch
	if (motion ()) part (a.wx, a.wy, (rnd () - 0.5) * 120, -180, '#FFFFFF', 1, 'eye', 6);
	shake (2.5, 0.1);
	Snd.play ('pop', G.combo);
	if (!G.demo && rnd () < 0.025) G.caps.push ({ x: a.wx, y: a.wy, k: ['T', 'R', 'S'][Math.floor (rnd () * 3)], t: 0 });
}
function killPlayer (landed)
{
	const p = G.p;
	if (p.dead > 0) return;
	if (!landed) G.lives--;
	p.dead = landed ? 1.6 : 1.8; p.shield = false; p.triple = 0; p.rapid = 0;
	for (let i = 0; i < 34; i++) part (p.x, PY - 6, (rnd () - 0.5) * 480, (rnd () - 0.9) * 380, ['#2F7F93', '#FF9F1C', '#FFD23F', '#FFFDF8'][i & 3], 1.1, 'c', 4 + rnd () * 5);
	ring (p.x, PY - 6, '#FF9F1C', 90);
	part (p.x, PY - 6, 0, 0, '#FFD23F', 0.4, 'star', 60);
	burst (p.x, PY - 90, landed ? 'NOOO!' : 'OUCH!', 44);
	G.bombs = [];
	shake (14, 0.5);
	Snd.play ('die');
	if (landed) G.lives = 0;
}
function waveClear ()
{
	G.state = 'clear'; G.stateT = 2.4;
	const bonus = 250 * G.wave;
	G.bombs = []; G.ufo = null;
	banner (tr ('waveClear'), 2.3, '#3DD68C');
	setTimeout (() => { if (G && G.state === 'clear') burst (W / 2, H / 2 + 50, tr ('bonus', { n: bonus }), 34); }, 500);
	addScore (bonus, W / 2, H / 2, true);
	G.p.happy = 2.4;
	for (let i = 0; i < 40; i++) part (rnd () * W, HUDH, (rnd () - 0.5) * 60, 60 + rnd () * 120, ['#FF5A5F', '#FFD23F', '#3DD68C', '#34D3E0', '#B47CFF'][i % 5], 2.2, 'conf', 5);
	Snd.play ('clear');
}
function gameOver ()
{
	G.state = 'over'; G.over = 0;
	if (!G.demo) Snd.play ('over');
}
function addScore (p, x, y, quiet)
{
	if (G.demo) return;
	G.score += p;
	if (!quiet && p >= 40) burst (x, y - 10, '+' + p, 22);
	while (G.score >= G.nextLife)
	{
		G.nextLife += 5000;
		if (G.lives < 6) { G.lives++; burst (W / 2, H / 2, tr ('extraLife'), 40); Snd.play ('life'); }
	}
}
// the bunkers: a point eats the cells around it (r in cells); 'quiet' means an alien walking through
function bunkerHit (x, y, r, quiet)
{
	for (const b of G.bunkers)
	{
		if (x < b.x - 2 || x > b.x + BCOLS * BC + 2 || y < b.y - 2 || y > b.y + BROWS * BC + 2) continue;
		const c = Math.floor ((x - b.x) / BC), rw = Math.floor ((y - b.y) / BC);
		if (c < 0 || c >= BCOLS || rw < 0 || rw >= BROWS || !b.cells[rw * BCOLS + c]) continue;
		const R = Math.ceil (r);
		for (let dr = -R; dr <= R; dr++)
			for (let dc = -R; dc <= R; dc++)
			{
				const cc = c + dc, rr = rw + dr;
				if (cc < 0 || cc >= BCOLS || rr < 0 || rr >= BROWS) continue;
				const d = Math.hypot (dc, dr);
				if (d <= r || (!quiet && d <= r + 1 && rnd () < 0.45)) b.cells[rr * BCOLS + cc] = 0;
			}
		if (!quiet) for (let i = 0; i < 4; i++) part (x, y, (rnd () - 0.5) * 160, (rnd () - 0.5) * 160, '#FFC83D', 0.4, 'c', 2.5);
		return true;
	}
	return false;
}
// the autopilot (the title's demo, ?auto): under the lowest alien, away from the bombs
function autopilot ()
{
	const p = G.p, live = aliveAliens ();
	let tx = W / 2;
	if (G.ufo && G.ufo.x > 40 && G.ufo.x < W - 40 && rnd () < 0.5) tx = G.ufo.x + G.ufo.d * 40;
	else if (live.length)
	{
		let best = null;
		for (const a of live) if (!best || a.wy > best.wy + 4 || (Math.abs (a.wy - best.wy) <= 4 && Math.abs (a.wx - p.x) < Math.abs (best.wx - p.x))) best = a;
		tx = best.wx + G.dir * 12;
	}
	for (const c of G.caps) if (c.y > PY - 260) tx = c.x;
	for (const b of G.bombs)
		if (b.y > PY - 190 && b.y < PY + 10 && Math.abs (b.x - tx) < 40) tx = b.x + (b.x < p.x ? 64 : -64);
	tx = clamp (tx, 32, W - 32);
	return { dir: 0, tx, fire: true };
}

// ---- effects ----------------------------------------------------------------------------------------------------
function part (x, y, vx, vy, col, life, kind, size) { if (G.parts.length < 500) G.parts.push ({ x, y, vx, vy, col, life, max: life, kind, size, rot: rnd () * TAU, vr: (rnd () - 0.5) * 12 }); }
function sparks (x, y, n, col) { for (let i = 0; i < n; i++) part (x, y, (rnd () - 0.5) * 260, (rnd () - 0.5) * 260, col, 0.35, 's', 3); }
function ring (x, y, col, r) { part (x, y, 0, 0, col, 0.4, 'r', r); }
function splat (x, y, col) { for (let i = 0; i < 6; i++) part (x, y, (rnd () - 0.5) * 160, -60 - rnd () * 120, col, 0.5, 'c', 3); part (x, y + 2, 0, 0, col, 1.2, 'pud', 12); }
function burst (x, y, txt, size) { G.bursts.push ({ x: clamp (x, 80, W - 80), y: clamp (y, HUDH + 30, H - 40), txt, size, life: 0.85, max: 0.85, rot: (rnd () - 0.5) * 0.3 }); }
function shake (a, d) { if (!motion ()) a *= 0.2; if (a >= G.shakeA * (G.shake > 0 ? 1 : 0)) { G.shakeA = a; G.shake = d; G.shakeD = d; } }
function stepFx (dt)
{
	for (let i = G.parts.length - 1; i >= 0; i--)
	{
		const q = G.parts[i];
		q.life -= dt;
		if (q.life <= 0) { G.parts.splice (i, 1); continue; }
		q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
		if (q.kind === 'c' || q.kind === 'eye') { q.vy += 700 * dt; if (q.y > GROUND && q.vy > 0) { q.y = GROUND; q.vy *= -0.4; q.vx *= 0.6; } }
		else if (q.kind === 'conf') { q.vx += Math.sin (q.life * 5 + q.rot) * 40 * dt; }
		else if (q.kind === 's') { q.vx *= 0.9; q.vy *= 0.9; }
	}
	for (let i = G.bursts.length - 1; i >= 0; i--) { const b = G.bursts[i]; b.life -= dt; b.y -= 30 * dt; if (b.life <= 0) G.bursts.splice (i, 1); }
	if (G.banner && (G.banner.life -= dt) <= 0) G.banner = null;
	if (G.shake > 0) G.shake -= dt;
}

// ---- drawing ----------------------------------------------------------------------------------------------------
function rr (x, y, w, h, r)
{
	r = Math.min (r, w / 2, h / 2);
	g.beginPath ();
	g.moveTo (x + r, y); g.arcTo (x + w, y, x + w, y + h, r); g.arcTo (x + w, y + h, x, y + h, r);
	g.arcTo (x, y + h, x, y, r); g.arcTo (x, y, x + w, y, r); g.closePath ();
}
function ink (fill, lw) { if (fill) { g.fillStyle = fill; g.fill (); } g.lineWidth = lw || 3; g.strokeStyle = OL; g.stroke (); }
function otext (txt, x, y, size, fill, lw, align, weight)
{
	g.font = (weight || 900) + ' ' + size + 'px ' + FONT;
	g.textAlign = align || 'center'; g.textBaseline = 'middle';
	g.lineJoin = 'round'; g.lineWidth = lw || size * 0.22; g.strokeStyle = OL;
	g.strokeText (txt, x, y + size * 0.06); g.strokeText (txt, x, y);
	g.fillStyle = fill; g.fillText (txt, x, y);
}
function starPath (x, y, R, r, n, rot)
{
	g.beginPath ();
	for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n - Math.PI / 2, d = i & 1 ? r : R; g.lineTo (x + Math.cos (a) * d, y + Math.sin (a) * d); }
	g.closePath ();
}
function heartPath (x, y, s)
{
	g.beginPath ();
	g.moveTo (x, y + s * 0.35);
	g.bezierCurveTo (x - s * 1.1, y - s * 0.3, x - s * 0.5, y - s * 1.05, x, y - s * 0.45);
	g.bezierCurveTo (x + s * 0.5, y - s * 1.05, x + s * 1.1, y - s * 0.3, x, y + s * 0.35);
	g.closePath ();
}
function drawSky (t)
{
	const gr = g.createLinearGradient (0, 0, 0, H);
	gr.addColorStop (0, '#2A1B5C'); gr.addColorStop (0.7, '#16123F'); gr.addColorStop (1, '#0B0B24');
	g.fillStyle = gr; g.fillRect (-2000, -2000, W + 4000, H + 4000);       // (beyond the field too: a tall phone, a wide screen)
	// the stars twinkle and drift slowly
	for (const s of SKY.stars)
	{
		const y = HUDH + ((s.y - HUDH + (motion () ? t * s.v : 0)) % (GROUND - HUDH - 20));
		const k = 0.5 + 0.5 * Math.sin (t * s.sp + s.ph);
		g.globalAlpha = 0.35 + 0.65 * k;
		g.fillStyle = s.r > 2.2 ? '#FFF6A8' : '#FFFFFF';
		if (s.r > 2.2) { starPath (s.x, y, s.r * 1.8, s.r * 0.7, 4, 0); g.fill (); }
		else { g.beginPath (); g.arc (s.x, y, s.r, 0, TAU); g.fill (); }
	}
	g.globalAlpha = 1;
	// a ringed planet (bottom left) and a moon (top right)
	g.save ();
	g.translate (86, 520);
	g.beginPath (); g.ellipse (0, 0, 74, 16, -0.35, Math.PI, TAU); g.lineWidth = 10; g.strokeStyle = '#7E57D6'; g.stroke ();
	g.beginPath (); g.arc (0, 0, 46, 0, TAU); ink ('#FF8FA3', 3);
	g.save (); g.beginPath (); g.arc (0, 0, 46, 0, TAU); g.clip ();
	g.fillStyle = '#F06A86'; g.fillRect (-50, -8, 100, 12); g.fillRect (-50, 18, 100, 8);
	g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath (); g.ellipse (-16, -22, 14, 8, -0.5, 0, TAU); g.fill ();
	g.restore ();
	g.beginPath (); g.arc (0, 0, 46, 0, TAU); g.lineWidth = 3; g.strokeStyle = OL; g.stroke ();
	g.beginPath (); g.ellipse (0, 0, 74, 16, -0.35, 0, Math.PI); g.lineWidth = 10; g.strokeStyle = '#B58CFF'; g.stroke ();
	g.restore ();
	g.save ();
	g.translate (520, 170);
	g.globalAlpha = 0.9;
	g.beginPath (); g.arc (0, 0, 30, 0, TAU); ink ('#FFF1C9', 3);
	g.fillStyle = '#E8D59E';
	for (const [x, y, r] of [[-9, -6, 7], [10, 8, 5], [6, -12, 4], [-6, 14, 3.5]]) { g.beginPath (); g.arc (x, y, r, 0, TAU); g.fill (); }
	g.restore ();
	g.globalAlpha = 1;
}
function drawGround (t)
{
	// a bumpy alien ground with craters
	g.beginPath ();
	g.moveTo (-1010, H + 2000); g.lineTo (-1010, GROUND + 2);
	for (let x = -1010; x <= W + 1000; x += 30) g.quadraticCurveTo (x + 15, GROUND - 6 + ((x / 30) & 1) * 4, x + 30, GROUND + 2);
	g.lineTo (W + 1020, H + 2000); g.closePath ();
	ink ('#6BCB77', 3);
	g.fillStyle = '#4FAE5C';
	for (let x = 20; x < W; x += 70) { g.beginPath (); g.ellipse (x + ((x * 7) % 23), GROUND + 22 + (x % 3) * 5, 14, 4, 0, 0, TAU); g.fill (); }
	g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect (-1000, GROUND + 6, W + 2000, 3);
}
function eye (x, y, r, a, blinkK)
{
	const shut = ((G.t + a.blink) % 4.2) < 0.13;
	g.beginPath (); g.arc (x, y, r, 0, TAU);
	if (shut || blinkK) { ink (a.col, 2.5); g.beginPath (); g.moveTo (x - r * 0.8, y); g.quadraticCurveTo (x, y + r * 0.6, x + r * 0.8, y); g.lineWidth = 2.5; g.stroke (); return; }
	ink ('#FFFFFF', 2.5);
	const dx = clamp ((G.p.x - a.wx) / 160, -1, 1) * r * 0.38, dy = r * 0.32;
	g.beginPath (); g.arc (x + dx, y + dy, r * 0.5, 0, TAU); g.fillStyle = OL; g.fill ();
	g.beginPath (); g.arc (x + dx - r * 0.18, y + dy - r * 0.2, r * 0.17, 0, TAU); g.fillStyle = '#FFFFFF'; g.fill ();
}
function drawAlien (a, x, y, t)
{
	const f = G.marchI & 1, angry = a.shoot > 0;
	g.save ();
	g.translate (x, y + (motion () ? Math.sin (t * 4 + a.ph) * 1.6 : 0));
	g.scale (1 + (f ? 0.04 : 0), 1 - (f ? 0.05 : 0));
	g.lineJoin = 'round'; g.lineCap = 'round';
	if (a.k === 'blob')
	{
		for (let i = -1; i <= 1; i++) { g.beginPath (); g.ellipse (i * 10, 12 - (((i + 1 + f) & 1) ? 3 : 0), 6, 5, 0, 0, TAU); ink (a.edge, 3); }
		g.beginPath (); g.moveTo (-18, 10); g.bezierCurveTo (-22, -20, 22, -20, 18, 10); g.quadraticCurveTo (0, 17, -18, 10); ink (a.col, 3);
		g.beginPath (); g.ellipse (-9, -7, 4.5, 2.6, -0.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill ();
		eye (0, -2, 7.5, a);
		g.beginPath ();
		if (angry) { g.ellipse (0, 8, 4, 3, 0, 0, TAU); g.fillStyle = OL; g.fill (); }
		else { g.moveTo (-4, 7); g.quadraticCurveTo (0, 10.5, 4, 7); g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke (); }
	}
	else if (a.k === 'crab')
	{
		// legs, claws up and down with the march
		g.lineWidth = 3; g.strokeStyle = OL;
		for (const s of [-1, 1]) { g.beginPath (); g.moveTo (s * 8, 10); g.lineTo (s * (12 + f * 3), 18); g.stroke (); }
		for (const s of [-1, 1])
		{
			g.save ();
			g.translate (s * 17, 0); g.rotate (s * (f ? -0.6 : 0.2));
			g.beginPath (); g.moveTo (0, 0); g.lineTo (s * 5, -8); g.lineWidth = 3; g.stroke ();
			g.beginPath (); g.ellipse (s * 3, -13, 3.6, 6, s * 0.5, 0, TAU); ink (a.edge, 2.5);
			g.beginPath (); g.ellipse (s * 9, -12, 3.2, 5.4, -s * 0.4, 0, TAU); ink (a.edge, 2.5);
			g.restore ();
		}
		g.lineWidth = 3;
		for (const s of [-1, 1]) { g.beginPath (); g.moveTo (s * 6, -8); g.lineTo (s * 9, -17); g.stroke (); }
		rr (-17, -10, 34, 22, 10); ink (a.col, 3);
		g.fillStyle = 'rgba(255,255,255,.45)'; rr (-12, -7, 16, 4, 2); g.fill ();
		eye (-9, -19, 5.5, a); eye (9, -19, 5.5, a);
		rr (-8, 1, 16, angry ? 8 : 6, 3); g.fillStyle = OL; g.fill ();
		g.fillStyle = '#FFFFFF'; g.fillRect (-5, 1, 3, 3); g.fillRect (2, 1, 3, 3);
	}
	else
	{
		// tentacles that wiggle
		for (let i = 0; i < 4; i++)
		{
			const x0 = -12 + i * 8, w = motion () ? Math.sin (t * 7 + i * 1.3 + a.ph) * 4 : 0;
			g.beginPath (); g.moveTo (x0, 2); g.quadraticCurveTo (x0 + w, 12, x0 + (f ? 3 : -3) + w * 0.5, 19);
			g.lineWidth = 9; g.strokeStyle = OL; g.stroke ();
			g.lineWidth = 4; g.strokeStyle = a.edge; g.stroke ();
		}
		g.beginPath (); g.moveTo (0, -17); g.lineTo (f ? 4 : -4, -27); g.lineWidth = 3; g.strokeStyle = OL; g.stroke ();
		g.beginPath (); g.arc (f ? 4 : -4, -28, 4, 0, TAU); ink ('#FFD23F', 2.5);
		g.beginPath (); g.arc (0, -1, 17, Math.PI, 0); g.lineTo (17, 5); g.quadraticCurveTo (0, 11, -17, 5); g.closePath (); ink (a.col, 3);
		g.beginPath (); g.ellipse (-8, -10, 5, 2.8, -0.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill ();
		eye (-6.5, -3, 5.2, a); eye (6.5, -3, 5.2, a);
		g.beginPath (); g.ellipse (0, 5.5, angry ? 3.4 : 2.4, angry ? 3 : 1.8, 0, 0, TAU); g.fillStyle = OL; g.fill ();
	}
	g.restore ();
}
function drawUfo (u, t)
{
	g.save ();
	g.translate (u.x, u.y + Math.sin (t * 5) * 3);
	g.rotate (Math.sin (t * 3) * 0.08);
	// the beam
	g.fillStyle = 'rgba(255,240,150,.12)';
	g.beginPath (); g.moveTo (-10, 8); g.lineTo (10, 8); g.lineTo (26, 60); g.lineTo (-26, 60); g.closePath (); g.fill ();
	// the dome and its pilot
	g.beginPath (); g.arc (0, -4, 15, Math.PI, 0); g.closePath (); ink ('#BFF3FF', 3);
	g.beginPath (); g.arc (0, -6, 7, 0, TAU); ink ('#3DD68C', 2);
	g.beginPath (); g.arc (-2.5, -7, 2, 0, TAU); g.arc (2.5, -7, 2, 0, TAU); g.fillStyle = OL; g.fill ();
	g.beginPath (); g.ellipse (0, 4, 34, 10, 0, 0, TAU); ink ('#B8C2CC', 3);
	g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath (); g.ellipse (-8, 0, 16, 3, 0, 0, TAU); g.fill ();
	for (let i = -2; i <= 2; i++)
	{
		const on = ((Math.floor (t * 8) + i) & 1);
		g.beginPath (); g.arc (i * 12, 6, 3.2, 0, TAU); ink (on ? '#FFD23F' : '#FF7AB6', 2);
	}
	g.restore ();
}
function drawShip (t)
{
	const p = G.p;
	if (p.dead > 0) return;
	if (p.inv > 0 && Math.floor (p.inv * 10) & 1) g.globalAlpha = 0.4;
	g.save ();
	g.translate (p.x, PY + p.recoil * 3);
	g.rotate (p.tilt);
	g.lineJoin = 'round'; g.lineCap = 'round';
	// thruster flames
	const fl = 6 + (motion () ? Math.sin (t * 40) * 3 : 0);
	for (const s of [-1, 1]) { g.beginPath (); g.moveTo (s * 18 - 5, 14); g.quadraticCurveTo (s * 18, 14 + fl * 2.2, s * 18 + 5, 14); g.closePath (); g.fillStyle = '#FF9F1C'; g.fill (); g.beginPath (); g.moveTo (s * 18 - 2.5, 14); g.quadraticCurveTo (s * 18, 14 + fl, s * 18 + 2.5, 14); g.fillStyle = '#FFF6A8'; g.fill (); }
	// the cannon (red, triple: three)
	const cannon = (dx, ang) => { g.save (); g.translate (dx, -14); g.rotate (ang); rr (-4.5, -18, 9, 16, 3); ink ('#FF5A5F', 3); g.restore (); };
	if (p.triple > 0) { cannon (-8, -0.35); cannon (8, 0.35); }
	cannon (0, 0);
	// fins
	for (const s of [-1, 1]) { g.beginPath (); g.moveTo (s * 22, -2); g.lineTo (s * 34, 12); g.lineTo (s * 20, 12); g.closePath (); ink ('#FF9F1C', 3); }
	// the body
	rr (-28, -4, 56, 20, 10); ink (p.rapid > 0 ? '#FF7A59' : '#2F7F93', 3);
	g.fillStyle = 'rgba(255,255,255,.3)'; rr (-24, -1, 48, 5, 2.5); g.fill ();
	for (const s of [-1, 1]) { g.beginPath (); g.arc (s * 17, 8, 3, 0, TAU); ink ('#FFD23F', 2); }
	// the glass dome and Zip the pilot
	g.beginPath (); g.arc (0, -4, 15, Math.PI, 0); g.closePath (); ink ('rgba(191,243,255,.9)', 3);
	g.save (); g.beginPath (); g.arc (0, -4, 13.5, Math.PI, 0); g.clip ();
	g.beginPath (); g.arc (0, -4, 8.5, 0, TAU); ink ('#FFD9A8', 2);
	const look = clamp ((G.p.tx !== null ? G.p.tx - p.x : 0) / 80, -1, 1) * 1.4;
	const scared = G.bombs.some ((b) => Math.abs (b.x - p.x) < 50 && b.y > PY - 140);
	g.fillStyle = OL;
	g.beginPath (); g.arc (-3 + look, -6, scared ? 2 : 1.6, 0, TAU); g.arc (3 + look, -6, scared ? 2 : 1.6, 0, TAU); g.fill ();
	g.beginPath ();
	if (scared) { g.ellipse (look * 0.5, -1, 2, 2.2, 0, 0, TAU); g.fill (); }
	else { g.arc (look * 0.5, -3, p.happy > 0 ? 3.6 : 2.6, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke (); }
	g.restore ();
	g.beginPath (); g.ellipse (-6, -11, 3.5, 1.8, -0.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill ();
	g.restore ();
	// the bubble shield
	if (p.shield)
	{
		const r = 40 + (motion () ? Math.sin (t * 6) * 2 : 0);
		g.beginPath (); g.arc (p.x, PY - 4, r, 0, TAU);
		g.fillStyle = 'rgba(52,211,224,.18)'; g.fill (); g.lineWidth = 3; g.strokeStyle = 'rgba(52,211,224,.9)'; g.stroke ();
		g.beginPath (); g.arc (p.x, PY - 4, r - 8, -2.4, -1.7); g.strokeStyle = 'rgba(255,255,255,.8)'; g.stroke ();
	}
	g.globalAlpha = 1;
}
function drawBunker (b)
{
	const C = b.cells;
	g.fillStyle = '#FFD23F';
	for (let r = 0; r < BROWS; r++)
		for (let c = 0; c < BCOLS; c++)
			if (C[r * BCOLS + c]) g.fillRect (b.x + c * BC - 0.3, b.y + r * BC - 0.3, BC + 0.6, BC + 0.6);
	// the cheese holes and the top shine
	g.fillStyle = '#E8A800';
	for (let r = 0; r < BROWS; r++)
		for (let c = 0; c < BCOLS; c++)
			if (C[r * BCOLS + c] && (r * 7 + c * 5) % 13 === 0) { g.beginPath (); g.arc (b.x + c * BC + BC / 2, b.y + r * BC + BC / 2, BC * 0.42, 0, TAU); g.fill (); }
	g.fillStyle = 'rgba(255,255,255,.55)';
	for (let c = 0; c < BCOLS; c++)
		for (let r = 0; r < BROWS; r++)
			if (C[r * BCOLS + c]) { if (r + 1 < BROWS && C[(r + 1) * BCOLS + c]) g.fillRect (b.x + c * BC, b.y + r * BC + 2, BC, 2); break; }
	// an ink outline that follows every bite
	const on = (c, r) => c >= 0 && c < BCOLS && r >= 0 && r < BROWS && C[r * BCOLS + c];
	g.beginPath ();
	for (let r = 0; r < BROWS; r++)
		for (let c = 0; c < BCOLS; c++)
		{
			if (!C[r * BCOLS + c]) continue;
			const x = b.x + c * BC, y = b.y + r * BC;
			if (!on (c, r - 1)) { g.moveTo (x, y); g.lineTo (x + BC, y); }
			if (!on (c, r + 1)) { g.moveTo (x, y + BC); g.lineTo (x + BC, y + BC); }
			if (!on (c - 1, r)) { g.moveTo (x, y); g.lineTo (x, y + BC); }
			if (!on (c + 1, r)) { g.moveTo (x + BC, y); g.lineTo (x + BC, y + BC); }
		}
	g.lineWidth = 2.5; g.lineCap = 'round'; g.strokeStyle = OL; g.stroke ();
}
function drawShot (s)
{
	g.save ();
	g.translate (s.x, s.y); g.rotate (Math.atan2 (s.vx, -s.vy));
	g.fillStyle = 'rgba(255,240,150,.35)'; rr (-6, -12, 12, 26, 6); g.fill ();
	rr (-3.5, -10, 7, 20, 3.5); ink ('#FFF6A8', 2.5);
	g.restore ();
}
function drawBomb (b, t)
{
	g.save ();
	g.translate (b.x, b.y);
	g.lineJoin = 'round';
	if (b.kind === 'goo')
	{
		const w = motion () ? Math.sin (b.t * 14) * 0.12 : 0;
		g.scale (1 + w, 1 - w);
		g.beginPath (); g.moveTo (0, -11); g.bezierCurveTo (6, -2, 8, 4, 0, 9); g.bezierCurveTo (-8, 4, -6, -2, 0, -11); ink ('#8CF25A', 2.5);
		g.beginPath (); g.arc (-2, 1, 1.8, 0, TAU); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill ();
	}
	else
	{
		if (Math.floor (b.t * 10) & 1) g.scale (-1, 1);
		g.beginPath (); g.moveTo (-2, -12); g.lineTo (5, -4); g.lineTo (-3, 0); g.lineTo (4, 10);
		g.lineWidth = 7; g.strokeStyle = OL; g.lineCap = 'round'; g.stroke ();
		g.lineWidth = 3.5; g.strokeStyle = '#FFD23F'; g.stroke ();
	}
	g.restore ();
}
function drawCap (c, t)
{
	const cp = CAPS[c.k];
	g.save ();
	g.translate (c.x, c.y);
	g.rotate (motion () ? Math.sin (t * 4 + c.t) * 0.2 : 0);
	g.beginPath (); g.arc (0, 0, 15 + Math.sin (t * 8) * 1.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill ();
	rr (-17, -11, 34, 22, 11); ink (cp.col, 3);
	g.fillStyle = 'rgba(255,255,255,.45)'; rr (-13, -8, 26, 6, 3); g.fill ();
	if (c.k === 'L') { heartPath (0, 2, 9); ink ('#FF5A5F', 2); }
	else if (c.k === 'S') { g.beginPath (); g.arc (0, 1, 6, 0, TAU); ink ('rgba(255,255,255,.7)', 2.5); }
	else otext (cp.txt, 0, 1, 17, '#FFFFFF', 4);
	g.restore ();
}
function drawParts ()
{
	for (const q of G.parts)
	{
		const k = q.life / q.max;
		g.globalAlpha = Math.min (1, k * 2);
		if (q.kind === 'r')
		{
			g.beginPath (); g.arc (q.x, q.y, q.size * (1.15 - k), 0, TAU);
			g.lineWidth = 4 * k + 1; g.strokeStyle = q.col; g.stroke ();
		}
		else if (q.kind === 'star')
		{
			starPath (q.x, q.y, q.size * (1.3 - k * 0.6), q.size * 0.45 * (1.3 - k * 0.6), 7, q.rot * 0.2);
			ink (q.col, 3);
		}
		else if (q.kind === 'eye')
		{
			g.beginPath (); g.arc (q.x, q.y, q.size, 0, TAU); ink ('#FFFFFF', 2);
			g.beginPath (); g.arc (q.x + Math.cos (q.rot) * 2, q.y + Math.sin (q.rot) * 2, q.size * 0.5, 0, TAU); g.fillStyle = OL; g.fill ();
		}
		else if (q.kind === 'conf')
		{
			g.save (); g.translate (q.x, q.y); g.rotate (q.rot); g.fillStyle = q.col; g.fillRect (-q.size / 2, -q.size / 4, q.size, q.size / 2); g.restore ();
		}
		else if (q.kind === 'pud')
		{
			g.beginPath (); g.ellipse (q.x, q.y, q.size * (1.2 - k * 0.4), 3.5, 0, 0, TAU); g.fillStyle = q.col; g.fill ();
		}
		else
		{
			g.beginPath (); g.arc (q.x, q.y, q.size * (q.kind === 's' ? k : 1), 0, TAU);
			if (q.kind === 'c') ink (q.col, 1.5); else { g.fillStyle = q.col; g.fill (); }
		}
	}
	g.globalAlpha = 1;
}
function drawBurst (b)
{
	const k = 1 - b.life / b.max;
	const sc = k < 0.15 ? k / 0.15 * 1.25 : k < 0.3 ? 1.25 - (k - 0.15) / 0.15 * 0.25 : 1;
	g.save ();
	g.globalAlpha = b.life < 0.25 ? b.life / 0.25 : 1;
	g.translate (b.x, b.y); g.rotate (b.rot); g.scale (sc, sc);
	otext (b.txt, 0, 0, b.size, b.txt[0] === '+' ? '#FFFFFF' : '#FFD23F');
	g.restore ();
}
function drawHUD ()
{
	g.fillStyle = 'rgba(11,11,36,.55)'; g.fillRect (-2000, -2000, W + 4000, HUDH + 2000);
	g.fillStyle = OL; g.fillRect (-2000, HUDH - 3, W + 4000, 3);
	otext (tr ('score'), 14, 16, 13, '#B8C2CC', 4, 'left', 800);
	otext (String (G.score), 14, 36, 24, '#FFFFFF', 6, 'left');
	const hi = Math.max (rec.high, G.demo ? 0 : G.score);
	otext (tr ('hi'), W / 2 - 40, 16, 13, '#B8C2CC', 4, 'center', 800);
	otext (String (hi), W / 2 - 40, 36, 22, '#FFD23F', 6, 'center');
	otext (tr ('wave', { n: G.wave }), W / 2 + 110, 28, 20, '#34D3E0', 6, 'center');
	// the lives on the ground, as little ships
	for (let i = 0; i < G.lives - (G.p.dead > 0 ? 0 : 1) && i < 6; i++)
	{
		const x = 26 + i * 34, y = H - 18;
		rr (x - 13, y - 3, 26, 10, 5); ink ('#2F7F93', 2.5);
		g.beginPath (); g.arc (x, y - 3, 7, Math.PI, 0); g.closePath (); ink ('#BFF3FF', 2.5);
	}
	// the power timers
	const p = G.p;
	let px = W - 20;
	for (const [k, v, d] of [['T', p.triple, CAPS.T.dur], ['R', p.rapid, CAPS.R.dur]])
	{
		if (v <= 0) continue;
		g.beginPath (); g.arc (px, H - 20, 13, 0, TAU); ink (CAPS[k].col, 2.5);
		g.beginPath (); g.moveTo (px, H - 20); g.arc (px, H - 20, 13, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - v / d)); g.closePath (); g.fillStyle = 'rgba(37,27,61,.55)'; g.fill ();
		otext (CAPS[k].txt, px, H - 20, 14, '#FFFFFF', 3.5);
		px -= 34;
	}
	if (G.combo >= 3)
	{
		const mult = G.combo >= 9 ? 4 : G.combo >= 6 ? 3 : 2;
		otext ('x' + mult, px - 4, H - 20, 22, '#FF7AB6', 6);
	}
}
function draw (t)
{
	g.setTransform (1, 0, 0, 1, 0, 0);
	g.fillStyle = '#0B0B24'; g.fillRect (0, 0, cv.width, cv.height);
	if (!G) return;
	let sx = 0, sy = 0;
	if (G.shake > 0) { const a = G.shakeA * (G.shake / G.shakeD); sx = (Math.random () - 0.5) * 2 * a; sy = (Math.random () - 0.5) * 2 * a; }
	g.setTransform (DPR * S, 0, 0, DPR * S, DPR * (OX + sx * S), DPR * (OY + sy * S));
	drawSky (t);
	drawGround (t);
	for (const b of G.bunkers) drawBunker (b);
	if (G.ufo) drawUfo (G.ufo, t);
	for (const a of G.aliens) if (a.alive) drawAlien (a, a.wx, a.wy, t);
	for (const c of G.caps) drawCap (c, t);
	for (const s of G.shots) drawShot (s);
	for (const b of G.bombs) drawBomb (b, t);
	drawShip (t);
	drawParts ();
	for (const b of G.bursts) drawBurst (b);
	if (G.banner && !G.demo)
	{
		const bn = G.banner, k = 1 - bn.life / bn.max;
		const sc = k < 0.12 ? k / 0.12 : 1, wob = motion () ? Math.sin (t * 6) * 0.04 : 0;
		g.save (); g.globalAlpha = bn.life < 0.3 ? bn.life / 0.3 : 1;
		g.translate (W / 2, H / 2 - 40); g.rotate (-0.05 + wob); g.scale (sc, sc);
		otext (bn.txt, 0, 0, 58, bn.col, 13);
		if (G.state === 'intro' && G.wave === 1 && !G.demo) otext (tr ('ready'), 0, 56, 28, '#FFFFFF', 7);
		g.restore ();
	}
	if (!G.demo) drawHUD ();
}

// ---- the screens ------------------------------------------------------------------------------------------------
function show (name)
{
	screen = name;
	document.querySelectorAll ('.screen').forEach ((s) => s.classList.toggle ('on', s.id === 'scr' + name[0].toUpperCase () + name.slice (1)));
	$('btPause').classList.toggle ('on', name === 'play');
	if (name === 'title') $('bestTitle').textContent = rec.high ? tr ('best', { n: rec.high, w: rec.wave }) : '';
	if (name === 'how') buildHow ();
	const s = document.querySelector ('.screen.on');
	const b = s && (s.querySelector ('.kbtn.big') || s.querySelector ('.kbtn'));
	if (b && !touchUI) setTimeout (() => b.focus ({ preventScroll: true }), 30);
}
function playing () { return screen === 'play' && G && !G.demo && !paused; }
function play ()
{
	Snd.init ();
	IN.fire = false; IN.touch = null;
	newGame (false);
	paused = false;
	show ('play');
}
function pause ()
{
	if (!playing () || G.state === 'over') return;
	paused = true; IN.fire = false; IN.touch = null; IN.kl = IN.kr = false; IN.kdir = 0;
	show ('pause');
}
function resume () { if (screen !== 'pause') return; paused = false; show ('play'); }
function menu () { paused = false; newGame (true); show ('title'); }
function finish ()
{
	let isRec = false;
	if (G.score > rec.high) { rec.high = G.score; rec.wave = G.wave; store.set ('record', rec); isRec = G.score > 0; }
	$('overNote').textContent = tr ('overNote', { n: G.wave });
	$('overScore').textContent = G.score;
	$('overRecord').classList.toggle ('on', isRec);
	$('overBest').textContent = rec.high ? tr ('best', { n: rec.high, w: rec.wave }) : '';
	show ('over');
	say (tr ('gameOver') + ' ' + G.score);
}
function say (s) { $('live').textContent = s; }
function mini (draw)
{
	const c = document.createElement ('canvas'); c.width = 92; c.height = 72;
	const saved = g, gg = c.getContext ('2d'); gg.scale (2, 2); gg.lineJoin = 'round'; gg.lineCap = 'round';
	g = gg; try { draw (); } finally { g = saved; }
	return c;
}
function buildHow ()
{
	$('howText').textContent = tr (touchUI ? 'howTouch' : 'howKeys');
	const ua = $('legendAliens'), uc = $('legendCaps'); ua.innerHTML = ''; uc.innerHTML = '';
	const add = (ul, canvas, txt) => { const li = document.createElement ('li'), s = document.createElement ('span'); s.textContent = txt; li.append (canvas, s); ul.appendChild (li); };
	[0, 1, 3].forEach ((r, i) => add (ua, mini (() => { g.translate (23, 20); g.scale (0.72, 0.72); drawAlien ({ ...ROWKIND[r], blink: 2, ph: 0, wx: 0, wy: 0 }, 0, 0, 0); }), tr ('a' + i)));
	add (ua, mini (() => { g.translate (23, 18); g.scale (0.6, 0.6); drawUfo ({ x: 0, y: 0 }, 0); }), tr ('a3'));
	for (const k of Object.keys (CAPS)) add (uc, mini (() => drawCap ({ x: 23, y: 18, k, t: 0 }, 0)), tr ('c' + k));
}
function applyLang ()
{
	document.documentElement.lang = lang () ? 'fr' : 'en';
	document.querySelectorAll ('[data-k]').forEach ((el) => { el.textContent = tr (el.dataset.k); });
	document.querySelectorAll ('[data-kl]').forEach ((el) => { el.setAttribute ('aria-label', tr (el.dataset.kl)); el.title = tr (el.dataset.kl); });
	document.querySelectorAll ('.seg button').forEach ((b) => b.setAttribute ('aria-pressed', String ((b.dataset.lang === 'fr') === !!lang ())));
	if (screen === 'how') buildHow ();
	if (screen === 'title') $('bestTitle').textContent = rec.high ? tr ('best', { n: rec.high, w: rec.wave }) : '';
}
const SETS = [['setSound', 'sound'], ['setMarch', 'march'], ['setReduced', 'reduced'], ['setRelaxed', 'relaxed']];
function saveSettings () { for (const [id, k] of SETS) CFG[k] = $(id).checked; store.set ('settings', CFG); }

// ---- input ------------------------------------------------------------------------------------------------------
const toField = (cx) => (cx - OX) / S;
const isLeft = (k) => k === 'ArrowLeft' || k === 'a' || k === 'q';
const isRight = (k) => k === 'ArrowRight' || k === 'd';
const isFire = (k) => k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'z';
function kdir () { IN.kdir = IN.kl && !IN.kr ? -1 : IN.kr && !IN.kl ? 1 : IN.kl && IN.kr ? IN.kdir : 0; }
document.addEventListener ('keydown', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	if (playing ())
	{
		if (isLeft (k)) { IN.kl = true; IN.kdir = -1; e.preventDefault (); return; }
		if (isRight (k)) { IN.kr = true; IN.kdir = 1; e.preventDefault (); return; }
		if (isFire (k)) { IN.fire = true; e.preventDefault (); return; }
		if (k === 'p' || k === 'Escape') { e.preventDefault (); pause (); return; }
	}
	if ((k === 'p' || k === 'Escape') && screen === 'pause') { e.preventDefault (); resume (); return; }
	if (k === 'Escape' && screen !== 'title' && screen !== 'play') { e.preventDefault (); back (); }
});
document.addEventListener ('keyup', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	if (isLeft (k)) IN.kl = false;
	if (isRight (k)) IN.kr = false;
	kdir ();
	if (isFire (k)) IN.fire = false;
});
function back ()
{
	if (screen === 'settings') { show (settingsFrom); return; }
	if (screen === 'pause') { resume (); return; }
	if (screen === 'over') { menu (); return; }
	show ('title');
}
// the mouse steers directly and fires while pressed; a finger steers by its slide and fires while it is down
cv.addEventListener ('pointerdown', (e) =>
{
	Snd.init ();
	if (!playing ()) return;
	if (e.pointerType === 'mouse') { IN.mouseX = toField (e.clientX); IN.fire = true; IN.kdir = 0; }
	else IN.touch = { id: e.pointerId, x0: toField (e.clientX), x: toField (e.clientX), px: G.p.x };
	try { cv.setPointerCapture (e.pointerId); } catch (er) { /* fine */ }
});
cv.addEventListener ('pointermove', (e) =>
{
	if (e.pointerType === 'mouse') { if (playing () && !IN.kl && !IN.kr) { IN.mouseX = toField (e.clientX); IN.kdir = 0; } return; }
	if (IN.touch && e.pointerId === IN.touch.id) IN.touch.x = toField (e.clientX);
});
function endPointer (e)
{
	if (e.pointerType === 'mouse') { IN.fire = false; return; }
	if (IN.touch && e.pointerId === IN.touch.id) IN.touch = null;
}
cv.addEventListener ('pointerup', endPointer);
cv.addEventListener ('pointercancel', endPointer);
cv.addEventListener ('contextmenu', (e) => e.preventDefault ());
document.addEventListener ('touchmove', (e) => { if (screen === 'play') e.preventDefault (); }, { passive: false });
// the gamepad: the stick or the cross steers, A fires, Start pauses, B goes back
let padPrev = 0, padFire = false;
function pollPad ()
{
	const gps = navigator.getGamepads ? navigator.getGamepads () : [];
	let b = 0, axv = 0, any = false;
	for (const gp of gps)
	{
		if (!gp) continue;
		any = true;
		const bt = (i) => gp.buttons[i] && gp.buttons[i].pressed;
		const a = gp.axes[0] || 0;
		if (Math.abs (a) > 0.25) axv = Math.sign (a);
		if (bt (14)) axv = -1; if (bt (15)) axv = 1;
		if (bt (0) || bt (2) || bt (7)) b |= 1; if (bt (9)) b |= 2; if (bt (1)) b |= 4;
	}
	if (!any) return;
	if (axv || IN.padSteer) { if (!IN.kl && !IN.kr) IN.kdir = axv; IN.padSteer = !!axv; if (axv) IN.mouseX = null; }
	const pr = b & ~padPrev; padPrev = b;
	if (playing ())
	{
		if (b & 1) { IN.fire = true; padFire = true; } else if (padFire) { IN.fire = false; padFire = false; }
		if (pr & 2) pause ();
		return;
	}
	if (screen === 'pause' && (pr & 2)) { resume (); return; }
	if (pr & 1) { const s = document.querySelector ('.screen.on'), btn = s && (document.activeElement && s.contains (document.activeElement) ? document.activeElement : s.querySelector ('.kbtn.big')); if (btn) btn.click (); }
	if (pr & 4) back ();
}

// ---- the buttons ------------------------------------------------------------------------------------------------
document.addEventListener ('pointerdown', (e) => { if (e.target.closest && e.target.closest ('.kbtn, .seg button, .toggle')) Snd.init (); }, { passive: true });
document.addEventListener ('click', (e) => { if (e.target.closest && e.target.closest ('.kbtn, .seg button')) Snd.play ('tap'); });
$('btPlay').addEventListener ('click', play);
$('btHow').addEventListener ('click', () => show ('how'));
$('btSettings').addEventListener ('click', () => { settingsFrom = 'title'; show ('settings'); });
$('btSettings2').addEventListener ('click', () => { settingsFrom = 'pause'; show ('settings'); });
$('btSetBack').addEventListener ('click', () => show (settingsFrom));
$('btPause').addEventListener ('click', () => pause ());
$('btResume').addEventListener ('click', resume);
$('btRestart').addEventListener ('click', play);
$('btRetry').addEventListener ('click', play);
document.querySelectorAll ('[data-go]').forEach ((b) => b.addEventListener ('click', () => { const go = b.dataset.go; if (go === 'menu') menu (); else show (go); }));
for (const [id, k] of SETS) { $(id).checked = !!CFG[k]; $(id).addEventListener ('change', saveSettings); }
document.querySelectorAll ('.seg button').forEach ((b) => b.addEventListener ('click', () => { if (window.Site) Site.setLang (b.dataset.lang); applyLang (); }));
if (window.Site) Site.onLang (applyLang);
document.addEventListener ('visibilitychange', () => { if (document.hidden) pause (); });
window.addEventListener ('blur', () => pause ());
window.addEventListener ('resize', layout);
if (window.visualViewport) visualViewport.addEventListener ('resize', layout);

// ---- the loop ---------------------------------------------------------------------------------------------------
let last = 0;
function loop (ts)
{
	const ms = last ? Math.min (100, ts - last) : 16;
	last = ts;
	pollPad ();
	update (ms);
	draw (ts / 1000);
	requestAnimationFrame (loop);
}
// test hooks: the state, the simulation advanced by hand
window.Zap = { get G () { return G; }, play, pause, resume, show, get screen () { return screen; },
	step: (n) => { for (let i = 0; i < n && G; i++) { if (G.state === 'over' && G.over > 1.6) break; step (DT); } }, draw: () => draw (performance.now () / 1000), killAlien, waveClear };

newGame (true);
layout ();
applyLang ();
show ('title');
if (Q.has ('auto') || Q.has ('wave')) play ();
requestAnimationFrame (loop);
}) ();
