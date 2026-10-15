// briko.js -- BRIKO BOOM!: a cartoon brick breaker for Code is Fun (the Arkanoid / LBreakout family). 12 levels in
// three worlds (Candy Land, the Ocean, Space), 8 kinds of brick (tough, metal, explosive, gold, surprise, moving...),
// 11 capsules (multi-ball, laser, glue, fireball, shield...), Puff the cloud, combos, stars. Everything is drawn on the
// canvas and every sound is synthesized (WebAudio): no asset. Mouse, keyboard, a finger (the paddle follows the
// finger's slide, so the thumb never hides it), a gamepad. Test hooks: ?level=N, ?auto (the autopilot plays), ?seed=N.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';

// ---- the words (EN | FR) ----------------------------------------------------------------------------------------
const T = {
	subtitle: ['Break them all!', 'Casse-les toutes !'], play: ['Play', 'Jouer'], levels: ['Levels', 'Niveaux'],
	settings: ['Settings', 'Réglages'], back: ['Back', 'Retour'], backSite: ['Back to Code is Fun', 'Retour à Code is Fun'],
	howBtn: ['How to play', 'Comment jouer'], ok: ['OK!', 'OK !'], paused: ['Paused', 'Pause'], resume: ['Resume', 'Reprendre'],
	restart: ['Restart', 'Recommencer'], menu: ['Menu', 'Menu'], next: ['Next', 'Suivant'], retry: ['Retry', 'Rejouer'],
	gameOver: ['Game over', 'Perdu !'], levelDone: ['Level clear!', 'Niveau réussi !'], allDone: ['You did it!', 'Bravo !'],
	newRecord: ['New record!', 'Nouveau record !'], sound: ['Sound', 'Son'], music: ['Music', 'Musique'],
	reduced: ['Less motion', 'Moins d\'animations'], bold: ['Bold brick icons', 'Icônes des briques marquées'],
	puffs: ['Puff the cloud', 'Pouf le nuage'], relaxed: ['Relaxed (5 lives, slower)', 'Tranquille (5 vies, plus lent)'],
	language: ['Language', 'Langue'], bricksT: ['Bricks', 'Les briques'], powersT: ['Capsules', 'Les capsules'],
	starsRule: ['★ clear the level · ★★ without losing a ball · ★★★ and under the par time', '★ finis le niveau · ★★ sans perdre de balle · ★★★ et en moins du temps visé'],
	howMouse: ['Move the mouse (or ← →) to steer the paddle; click or Space to launch the ball and to fire the laser. P or Esc: pause. Break every brick — the metal ones need not go.',
		'Bouge la souris (ou ← →) pour guider la raquette ; clic ou Espace pour lancer la balle et tirer au laser. P ou Échap : pause. Casse toutes les briques — sauf celles en métal.'],
	howTouch: ['Slide your finger anywhere on the screen: the paddle follows it. Tap to launch the ball and to fire the laser. Break every brick — the metal ones need not go.',
		'Fais glisser ton doigt n\'importe où sur l\'écran : la raquette le suit. Touche l\'écran pour lancer la balle et tirer au laser. Casse toutes les briques — sauf celles en métal.'],
	launchTap: ['Tap to launch!', 'Touche pour lancer !'], launchKey: ['Click or Space to launch!', 'Clic ou Espace pour lancer !'],
	lvl: ['Lvl {n}', 'Niv. {n}'], level: ['Level {n}', 'Niveau {n}'], best: ['Best: {n}', 'Record : {n}'], locked: ['Locked', 'Verrouillé'],
	bricksPts: ['Bricks', 'Briques'], clearBonus: ['Level bonus', 'Bonus de niveau'], timeBonus: ['Time bonus ({n} s)', 'Bonus de temps ({n} s)'],
	noMiss: ['No ball lost', 'Aucune balle perdue'], total: ['Score', 'Score'], extraLife: ['Extra life!', 'Vie en plus !'],
	ouch: ['OUCH!', 'AÏE !'], combo: ['COMBO x{n}!', 'COMBO x{n} !'], super: ['SUPER!', 'GÉNIAL !'], ready: ['Ready?', 'Prêt ?'],
	allNote: ['All 12 levels cleared!', 'Les 12 niveaux sont finis !'], overNote: ['You reached level {n}.', 'Tu es arrivé au niveau {n}.'],
	soloNote: ['Practice: this score does not count for the record.', 'Entraînement : ce score ne compte pas pour le record.'],
	w0: ['Candy Land', 'Pays des Bonbons'], w1: ['The Ocean', 'L\'Océan'], w2: ['Space', 'L\'Espace'],
	l1: ['Hello!', 'Coucou !'], l2: ['Smiley', 'Sourire'], l3: ['Big Heart', 'Grand Cœur'], l4: ['Rocket', 'Fusée'],
	l5: ['Kitty', 'Minou'], l6: ['Space Invader', 'Envahisseur'], l7: ['Candy Shop', 'Confiserie'], l8: ['Castle', 'Château'],
	l9: ['Mushroom', 'Champignon'], l10: ['Zigzag Fort', 'Fort Zigzag'], l11: ['Volcano', 'Volcan'], l12: ['Royal Crown', 'Couronne Royale'],
	kN: ['Plain brick: one hit', 'Brique simple : un coup'], kT: ['Tough brick: two hits', 'Brique solide : deux coups'],
	kU: ['Very tough: three hits', 'Très solide : trois coups'], kM: ['Metal: never breaks', 'Métal : incassable'],
	kX: ['Explosive: breaks its neighbours', 'Explosive : casse ses voisines'], kG: ['Gold: 500 points', 'Or : 500 points'],
	kS: ['Surprise: always drops a capsule', 'Surprise : lâche toujours une capsule'], km: ['Moving brick', 'Brique qui bouge'],
	pE: ['Big paddle', 'Grande raquette'], pR: ['Small paddle', 'Petite raquette'], pM: ['Multi-ball', 'Multi-balles'],
	pC: ['Glue: catch the ball', 'Colle : attrape la balle'], pZ: ['Laser', 'Laser'], pS: ['Slow ball', 'Balle lente'],
	pF: ['Fast ball', 'Balle rapide'], pB: ['Fireball: goes through', 'Boule de feu : traverse tout'], pL: ['Extra life', 'Vie en plus'],
	pW: ['Shield: saves one ball', 'Bouclier : sauve une balle'], pD: ['Score x2', 'Score x2'] };
const lang = () => (window.Site && Site.lang === 'fr') ? 1 : 0;
function tr (k, v) { let s = (T[k] || [k, k])[lang ()]; if (v) for (const n in v) s = s.split ('{' + n + '}').join (v[n]); return s; }
const $ = (id) => document.getElementById (id);
const Q = new URLSearchParams (location.search);

// ---- storage (every access may fail: private mode, blocked storage) ---------------------------------------------
const store = {
	get (k, d) { try { const v = localStorage.getItem ('codeisfun.brick.' + k); return v === null ? d : JSON.parse (v); } catch (e) { return d; } },
	set (k, v) { try { localStorage.setItem ('codeisfun.brick.' + k, JSON.stringify (v)); } catch (e) { /* this visit only */ } } };
const reducedOS = matchMedia ('(prefers-reduced-motion: reduce)').matches;
const CFG = Object.assign ({ sound: true, music: true, reduced: reducedOS, bold: false, puffs: true, relaxed: false }, store.get ('settings', {}));
const prog = Object.assign ({ unlocked: 1, stars: [], best: [] }, store.get ('progress', {}));
let high = +store.get ('high', 0) || 0;

// ---- the playfield (logical units: 600 x 800, taller on a tall phone, up to 1040; scaled to the screen) ----------
const W = 600, HUDH = 60, WALL = 12, TOPY = 72;
const COLS = 13, BW = 40, BH = 22, GX = 40, GY = 100;
const PH = 22, BR = 9;
let H = 800, PY = 744, SHIELDY = 782, PBW = 48;
const DT = 1 / 120;
const OL = '#2B2340', CREAM = '#FFFDF8';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SPEED0 = 440, SPEED_BRICK = 9.6, SPEED_PADDLE = 3.2, SPEED_CAP = 840;
const PW0 = 88, PWMIN = 56, PWMAX = 144;

const THEMES = [
	{ top: '#FFD6E8', bot: '#FFF4D6', wall: '#FF7AB6', wall2: '#FFFFFF', meta: '#FFD6E8' },
	{ top: '#7FE0F0', bot: '#1F6F9A', wall: '#3DBE8B', wall2: '#2A9C70', meta: '#7FE0F0' },
	{ top: '#2A1B5C', bot: '#0B0B24', wall: '#B58CFF', wall2: '#7E57D6', meta: '#2A1B5C' } ];
const COLORS = ['#FF5A5F', '#FF9F1C', '#FFD23F', '#3DD68C', '#3FA7FF', '#A66CFF'];
const ICONS = ['heart', 'circle', 'star', 'tri', 'square', 'diamond'];
const KIND = {
	n: { hp: 1, pts: [50, 60, 70, 80, 90, 100] }, T: { hp: 2, pts: 150, col: '#8C9BFF', edge: '#5E6BD6' },
	U: { hp: 3, pts: 250, col: '#7A63DB', edge: '#46389A' }, M: { hp: Infinity, pts: 0, col: '#B8C2CC', edge: '#7A8794' },
	X: { hp: 1, pts: 120, col: '#FF3D3D', edge: '#B81E28' }, G: { hp: 1, pts: 500, col: '#FFC83D', edge: '#D99A00' },
	S: { hp: 1, pts: 100, col: '#4FD1C5', edge: '#279C91' }, m: { hp: 1, pts: 200, col: '#FF7AB6', edge: '#D44A8C' } };
const POWERS = {
	E: { w: 14, good: 1, col: '#3DD68C', dur: 20, txt: 'E' }, R: { w: 8, good: 0, col: '#FF5A5F', dur: 15, txt: 'R' },
	M: { w: 10, good: 1, col: '#34D3E0', txt: 'M' }, C: { w: 10, good: 1, col: '#FFD23F', dur: 20, txt: 'C' },
	Z: { w: 8, good: 1, col: '#FF9F1C', dur: 12, txt: 'Z' }, S: { w: 10, good: 1, col: '#3FA7FF', dur: 15, txt: 'S' },
	F: { w: 6, good: 0, col: '#FF7AB6', dur: 12, txt: 'F' }, B: { w: 5, good: 1, col: '#FF6A2B', dur: 8, txt: 'B' },
	L: { w: 3, good: 1, col: '#FF5A5F', txt: '♥' }, W: { w: 6, good: 1, col: '#A66CFF', dur: 30, txt: 'W' },
	D: { w: 6, good: 1, col: '#FFC83D', dur: 20, txt: '×2' } };

// ---- the levels (13 columns; '.' empty, 1-6 plain bricks, T U tough, M metal, X explosive, G gold, S surprise, m moving)
const LEVELS = [
	{ name: 'l1', par: 90, rows: ['.............', '..111111111..', '..222222222..', '..333S33333..', '..444444444..', '..555555555..'] },
	{ name: 'l2', par: 100, rows: ['....33333....', '..333333333..', '.33313331333.', '.33313331333.', '3333333333333', '33G3333333G33', '.33133333133.', '..331111133..', '....33333....'] },
	{ name: 'l3', par: 110, rows: ['..111...111..', '.11111.11111.', '1111111111111', '1111T1S1T1111', '1111111111111', '.11111111111.', '..111111111..', '...111T111...', '....11111....', '.....111.....', '......1......'] },
	{ name: 'l4', par: 120, rows: ['......4......', '.....444.....', '....44444....', '....4TST4....', '....44444....', '....4T4T4....', '....44444....', '...M44444M...', '..MM44444MM..', '..M.X.X.X.M..', '....X.X.X....'] },
	{ name: 'l5', par: 120, rows: ['.5.........5.', '.55.......55.', '.55555555555.', '.55G55555G55.', '.55555555555.', '.55555T55555.', '.5U5551555U5.', '..555SSS555..', '...5555555...'] },
	{ name: 'l6', par: 130, rows: ['..m.......m..', '..2.......2..', '...2.....2...', '..222222222..', '.22X22222X22.', '2222222222222', '2.222S22222.2', '2.2.......2.2', '...22...22...'] },
	{ name: 'l7', par: 140, rows: ['6...44444...6', '66.4144414.66', '6664U4G4U4666', '66.4144414.66', '6...44444...6', '.............', '6...22222...6', '66.2T222T2.66', '6662S2X2S2666', '66.2T222T2.66', '6...22222...6'] },
	{ name: 'l8', par: 150, rows: ['1.1.......1.1', '111..1.1..111', '1T1.11111.1T1', '111.1T1T1.111', '1111111111111', '1TTT11G11TTT1', '1TTT1...1TTT1', '1111M...M1111', 'MMMM.....MMMM', '.m.........m.'] },
	{ name: 'l9', par: 150, rows: ['....11111....', '..113111311..', '.11111111111.', '.13111U11131.', '1111111111111', '1131111111311', '....TTTTT....', '....T6S6T....', '....TTTTT....', '..m.......m..'] },
	{ name: 'l10', par: 170, rows: ['3333333333333', 'M.M.M.M.M.M.M', '4U4U4X4U4U4U4', '.............', 'M..m.....m..M', '5555555555555', '5T5T5S5T5T5T5', '.M.M.M.M.M.M.', '6U6U6G6U6U6U6'] },
	{ name: 'l11', par: 180, rows: ['......X......', '.....X2X.....', '....U2X2U....', '...UU2G2UU...', '..UU22S22UU..', '.UU2222222UU.', 'UU222X2X222UU', 'M...........M', '.m....m....m.'] },
	{ name: 'l12', par: 200, rows: ['G.....G.....G', 'GG...GGG...GG', 'GUG.GUSUG.GUG', 'GUUGUUUUUGUUG', 'UUUUUUUUUUUUU', 'U6U6U6X6U6U6U', 'UUUUUUUUUUUUU', 'M.M.M...M.M.M', '.m....S....m.'] } ];
const NLEV = LEVELS.length;

// ---- small helpers ----------------------------------------------------------------------------------------------
let seed = (+Q.get ('seed') || (Math.random () * 1e9)) >>> 0;
function rnd () { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul (t ^ (t >>> 15), t | 1); t ^= t + Math.imul (t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const rad = (d) => d * Math.PI / 180;
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
	// a tall screen gets a taller field: the bricks stay, the paddle goes lower (more time to see the ball come)
	H = clamp (Math.round (W * (VH - t - b) / Math.max (1, VW - l - rr)), 800, 1040);
	PY = H - 56; SHIELDY = H - 18;
	S = Math.min ((VW - l - rr) / W, (VH - t - b) / H);
	OX = l + ((VW - l - rr) - W * S) / 2; OY = t + ((VH - t - b) - H * S) / 2;
	const bp = $('btPause'), sz = Math.max (40, Math.round (48 * S));
	bp.style.width = bp.style.height = sz + 'px'; PBW = sz / S;
	bp.style.left = Math.round (OX + (W - 6) * S - sz) + 'px';
	bp.style.top = Math.round (OY + (HUDH / 2) * S - sz / 2) + 'px';
}

// ---- the sound (WebAudio, synthesized) --------------------------------------------------------------------------
const Snd = {
	ac: null, out: null, sfx: null, mus: null, musF: null, noiseBuf: null, pw: null,
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
			this.musF = ac.createBiquadFilter (); this.musF.type = 'lowpass'; this.musF.frequency.value = 9000; this.musF.connect (this.out);
			this.mus = ac.createGain (); this.mus.gain.value = 0.22; this.mus.connect (this.musF);
			const n = ac.sampleRate, buf = ac.createBuffer (1, n, n), d = buf.getChannelData (0);
			for (let i = 0; i < n; i++) d[i] = Math.random () * 2 - 1;
			this.noiseBuf = buf;
			// a 25% pulse wave, for the chiptune lead
			const N = 32, re = new Float32Array (N), im = new Float32Array (N);
			for (let k = 1; k < N; k++) re[k] = 2 / (k * Math.PI) * Math.sin (k * Math.PI * 0.25);
			this.pw = ac.createPeriodicWave (re, im);
		}
		catch (e) { this.ac = null; }
	},
	ok () { return this.ac && CFG.sound && !(G && G.demo); },
	tone (type, f0, f1, dur, gain, at, dest)
	{
		const ac = this.ac, t = ac.currentTime + (at || 0), o = ac.createOscillator (), gn = ac.createGain ();
		if (type === 'pulse') o.setPeriodicWave (this.pw); else o.type = type;
		o.frequency.setValueAtTime (f0, t);
		if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime (f1, t + dur);
		gn.gain.setValueAtTime (0.0001, t);
		gn.gain.linearRampToValueAtTime (gain, t + 0.005);
		gn.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		o.connect (gn); gn.connect (dest || this.sfx);
		o.start (t); o.stop (t + dur + 0.03);
	},
	noise (dur, gain, ftype, f0, f1, at)
	{
		const ac = this.ac, t = ac.currentTime + (at || 0), s = ac.createBufferSource (), f = ac.createBiquadFilter (), gn = ac.createGain ();
		s.buffer = this.noiseBuf; f.type = ftype; f.frequency.setValueAtTime (f0, t);
		if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime (f1, t + dur);
		gn.gain.setValueAtTime (0.0001, t); gn.gain.linearRampToValueAtTime (gain, t + 0.005); gn.gain.exponentialRampToValueAtTime (0.0001, t + dur);
		s.connect (f); f.connect (gn); gn.connect (this.sfx);
		s.start (t, Math.random () * 0.5); s.stop (t + dur + 0.03);
	},
	play (k, a)
	{
		if (!this.ok ()) return;
		const m = (n) => 440 * Math.pow (2, (n - 69) / 12);
		switch (k)
		{
		case 'paddle': this.tone ('square', 220, 330, 0.07, 0.35); break;
		case 'wall': this.tone ('triangle', 440, 0, 0.04, 0.25); break;
		case 'brick': this.tone ('square', m (72 + 2 * Math.min (a || 0, 14)), 0, 0.09, 0.28); this.noise (0.03, 0.18, 'highpass', 3000); break;
		case 'tough': this.tone ('triangle', 150, 0, 0.06, 0.5); this.noise (0.06, 0.35, 'bandpass', 800); break;
		case 'metal': this.tone ('sine', 800, 0, 0.25, 0.22); this.tone ('sine', 1130, 0, 0.25, 0.18); break;
		case 'boom': this.noise (0.5, 0.8, 'lowpass', 2000, 100); this.tone ('sine', 80, 40, 0.5, 0.7); break;
		case 'power': [72, 76, 79, 84].forEach ((n, i) => this.tone ('square', m (n), 0, 0.07, 0.22, i * 0.05)); break;
		case 'bad': this.tone ('sawtooth', 400, 150, 0.3, 0.25); break;
		case 'laser': this.tone ('square', 1200, 300, 0.12, 0.12); break;
		case 'launch': this.tone ('sine', 300, 600, 0.1, 0.45); break;
		case 'puff': this.tone ('sine', 500, 900, 0.12, 0.4); this.tone ('sine', 900, 500, 0.12, 0.3, 0.1); break;
		case 'shield': this.tone ('triangle', 600, 1200, 0.15, 0.4); break;
		case 'lose': [67, 64, 60].forEach ((n, i) => this.tone ('triangle', m (n), 0, 0.16, 0.45, i * 0.15)); this.tone ('triangle', m (60), m (55), 0.4, 0.4, 0.45); break;
		case 'clear': [72, 76, 79].forEach ((n, i) => this.tone ('square', m (n), 0, 0.12, 0.25, i * 0.12)); this.tone ('square', m (84), 0, 0.45, 0.25, 0.36); break;
		case 'star': this.tone ('sine', 1320, 0, 0.15, 0.4); this.tone ('sine', 1980, 0, 0.12, 0.15, 0.03); break;
		case 'life': [72, 79, 84, 91].forEach ((n, i) => this.tone ('triangle', m (n), 0, 0.1, 0.4, i * 0.07)); break;
		case 'over': [64, 63, 62].forEach ((n, i) => this.tone ('triangle', m (n), 0, 0.3, 0.4, i * 0.3)); this.tone ('triangle', m (61), m (49), 0.8, 0.4, 0.9); break;
		case 'tap': this.tone ('sine', 600, 0, 0.03, 0.3); break;
		}
	} };
// the music: a little chiptune loop (C Am F G), one variant per world, a look-ahead scheduler
const Mus = {
	on: false, timer: 0, next: 0, step: 0, world: 0, delay: null,
	LEAD: [76, 79, 81, 79, 76, 74, 72, 0, 76, 79, 81, 84, 83, 79, 81, 0],
	BASS: [48, 45, 41, 43],
	start (world)
	{
		if (!Snd.ac || !CFG.music) return;
		if (this.on && this.world === world) return;
		this.stop ();
		this.on = true; this.world = world; this.step = 0; this.next = Snd.ac.currentTime + 0.1;
		Snd.musF.frequency.value = world === 1 ? 1600 : 9000;
		this.timer = setInterval (() => this.tick (), 25);
	},
	stop () { this.on = false; clearInterval (this.timer); },
	tick ()
	{
		const ac = Snd.ac; if (!ac) return;
		const beat = 0.5, tr2 = this.world === 1 ? -2 : 0, m = (n) => 440 * Math.pow (2, (n + tr2 - 69) / 12);
		while (this.next < ac.currentTime + 0.1)
		{
			const at = this.next - ac.currentTime, bar = (this.step >> 2) & 3, n = this.LEAD[this.step % 16];
			Snd.tone ('triangle', m (this.BASS[bar]), 0, beat * 0.9, 0.5, at, Snd.mus);
			if (n) Snd.tone (this.world === 2 ? 'sine' : 'pulse', m (n), 0, beat * 0.85, this.world === 2 ? 0.4 : 0.22, at, Snd.mus);
			if (n && this.world === 2) Snd.tone ('sine', m (n), 0, beat * 0.7, 0.12, at + 0.3, Snd.mus);
			this.step = (this.step + 1) % 32; this.next += beat;
		}
	} };
function musicFor ()
{
	const want = Snd.ac && CFG.music && G && !G.demo && screen === 'play' && !paused;
	if (want) Mus.start (G.world); else Mus.stop ();
}

// ---- the game ---------------------------------------------------------------------------------------------------
let G = null, screen = 'title', paused = false, settingsFrom = 'title';
// the decorations of the three worlds (in playfield units, spread wider than the field for the letterbox)
const DECO = { clouds: [], bubbles: [], stars: [], weeds: [] };
for (let i = 0; i < 9; i++) DECO.clouds.push ({ x: -500 + i * 200 + Math.random () * 120, y: 90 + Math.random () * 620, s: 0.6 + Math.random () * 0.8, v: 4 + Math.random () * 6 });
for (let i = 0; i < 34; i++) DECO.bubbles.push ({ x: -600 + Math.random () * 1800, y: Math.random () * 900, r: 3 + Math.random () * 9, v: 18 + Math.random () * 30, p: Math.random () * 6 });
for (let i = 0; i < 120; i++) DECO.stars.push ({ x: -700 + Math.random () * 2000, y: Math.random () * 820, s: 1 + Math.random () * 2.5, p: Math.random () * 6, f: 0.6 + Math.random () * 2 });
for (let i = 0; i < 16; i++) DECO.weeds.push ({ x: -560 + i * 110 + Math.random () * 50, h: 60 + Math.random () * 70, p: Math.random () * 6 });

function newGame (li, mode)
{
	G = { li, mode, demo: mode === 'demo', campaign: mode === 'campaign', auto: mode === 'demo' || Q.has ('auto'),
		score: 0, lives: CFG.relaxed ? 5 : 3, nextLife: 25000, t: 0 };
	startLevel (li);
}
function startLevel (li)
{
	const L = LEVELS[li];
	Object.assign (G, {
		li, world: Math.floor (li / 4), bricks: [], balls: [], caps: [], beams: [], parts: [], texts: [], bursts: [], queue: [],
		fx: {}, catchN: 0, time: 0, lostBall: false, combo: 0, lastMult: 1, levelStart: G.score, phase: 'play', phaseT: 0,
		shake: 0, shakeA: 0, hitstop: 0, puff: null, puffT: 20, helpT: L.par * 3, laserCD: 0, aim: 0, serveT: 0, flash: 0,
		paddle: { x: W / 2, w: PW0, vx: 0, kv: 0, sq: 0, mood: '', moodT: 0, blink: 2 + rnd () * 3, blinkT: 0, wave: 0 },
		speed: SPEED0 + 80 * li / (NLEV - 1), aiOff: 0, aiT: 0 });
	G.speed0 = G.speed;
	G.grid = new Array (COLS * 14).fill (null);
	L.rows.forEach ((row, r) =>
	{
		for (let c = 0; c < COLS; c++)
		{
			const ch = row[c];
			if (!ch || ch === '.') continue;
			const k = ch >= '1' && ch <= '6' ? 'n' : ch;
			const b = { k, c, r, x: GX + c * BW, y: GY + r * BH, col: k === 'n' ? +ch - 1 : 0, hp: KIND[k].hp, max: KIND[k].hp, alive: true,
				face: k !== 'M' && (c * 7 + r * 5) % 3 === 0, wob: 0, near: 0, vx: k === 'm' ? (c < 6 ? 60 : -60) : 0, ph: rnd () * 6 };
			G.bricks.push (b);
			if (k !== 'm') G.grid[r * COLS + c] = b;
		}
	});
	serve ();
	if (!G.demo) { G.texts.push ({ x: W / 2, y: H * 0.62, txt: tr ('level', { n: li + 1 }) + ' · ' + tr (L.name), life: 2, max: 2, size: 30, col: '#fff', big: true }); musicFor (); }
}
function serve ()
{
	const P = G.paddle;
	G.balls = [{ x: P.x, y: PY - PH / 2 - BR, vx: 0, vy: 0, stuck: true, serve: true, off: 0, sq: 0, squint: 0, trail: [] }];
	G.serveT = 0; G.combo = 0; G.lastMult = 1;
}
const breakable = (b) => b.alive && b.k !== 'M';
const comboMult = (n) => n <= 1 ? 1 : n <= 3 ? 1.5 : n <= 6 ? 2 : n <= 10 ? 3 : 4;
function curSpeed ()
{
	const cap = SPEED_CAP * (CFG.relaxed ? 0.85 : 1);
	let s = Math.min (G.speed, cap) * (CFG.relaxed ? 0.9 : 1);
	if (G.fx.S > 0) s *= 0.7;
	if (G.fx.F > 0) s *= 1.3;
	return s;
}
function paddleTarget () { let w = PW0; if (G.fx.E > 0) w *= 1.5; if (G.fx.R > 0) w *= 0.65; return clamp (w, PWMIN, PWMAX); }

// ---- input state ------------------------------------------------------------------------------------------------
const IN = { kdir: 0, held: false, ptr: null, mouseX: null, touch: null, pad: 0 };
const playing = () => G && !G.demo && screen === 'play' && !paused;

function action ()
{
	if (!playing () || G.phase !== 'play') return;
	if (G.balls.some ((b) => b.stuck)) { launch (); return; }
	fireLaser ();
}
function launch ()
{
	const P = G.paddle;
	let any = false;
	for (const b of G.balls)
	{
		if (!b.stuck) continue;
		const a = b.serve ? G.aim : clamp (b.off / (P.w / 2), -1, 1) * rad (60);
		const sp = curSpeed ();
		b.vx = Math.sin (a) * sp; b.vy = -Math.cos (a) * sp; b.stuck = false; b.serve = false; any = true;
	}
	if (any) Snd.play ('launch');
}
function fireLaser ()
{
	if (!(G.fx.Z > 0) || G.laserCD > 0) return;
	const P = G.paddle;
	G.laserCD = 1 / 3;
	G.beams.push ({ x: P.x - P.w / 2 + 8, y: PY - PH / 2 }, { x: P.x + P.w / 2 - 8, y: PY - PH / 2 });
	Snd.play ('laser');
}

// ---- the simulation ---------------------------------------------------------------------------------------------
function update (ms)
{
	if (!G) return;
	if (paused || (screen !== 'play' && !G.demo)) return;
	let dt = ms / 1000;
	if (G.hitstop > 0) { G.hitstop -= dt; stepFx (dt * 0.25); return; }
	G.acc = (G.acc || 0) + dt;
	let n = 0;
	while (G.acc >= DT && n < 30) { step (DT); G.acc -= DT; n++; }
	if (n >= 30) G.acc = 0;
}
function step (dt)
{
	const P = G.paddle;
	G.t += dt;
	stepFx (dt);
	if (G.phase === 'dying')
	{
		G.phaseT -= dt;
		if (G.phaseT <= 0)
		{
			if (G.lives > 0 || G.demo) { G.phase = 'play'; P.mood = ''; serve (); }
			else { G.phase = 'over'; finish (false); }
		}
		movePaddle (dt);
		return;
	}
	if (G.phase === 'cleared')
	{
		G.phaseT -= dt;
		if (motion () && rnd () < 0.5) confetti (rnd () * W, TOPY, 1, COLORS[(rnd () * 6) | 0], 0.5);
		P.wave += dt;
		if (G.phaseT <= 0) { G.phase = 'done'; if (G.demo) { startLevel ((G.li + 1) % NLEV); } else finish (true); }
		return;
	}
	if (G.phase !== 'play') return;
	G.time += dt;
	movePaddle (dt);
	// the power-ups' timers
	for (const k in G.fx)
	{
		if (!(G.fx[k] > 0)) continue;
		G.fx[k] -= dt;
		if (G.fx[k] <= 0) { G.fx[k] = 0; if (k === 'C') releaseStuck (); }
	}
	P.w = lerp (P.w, paddleTarget (), 1 - Math.pow (0.001, dt));
	if (G.laserCD > 0) G.laserCD -= dt;
	if (G.fx.Z > 0 && (IN.held || (G.auto && !G.balls.some ((b) => b.stuck)))) fireLaser ();
	// the serve: an aim that sweeps; it launches by itself after 4 s
	if (G.balls.some ((b) => b.stuck))
	{
		G.serveT += dt;
		G.aim = Math.sin (G.serveT * Math.PI * 1.1) * rad (30);
		if (G.serveT > (G.auto ? 0.6 + rnd () * 0.02 : 4)) launch ();
	}
	// the balls
	for (const b of G.balls) moveBall (b, dt);
	const before = G.balls.length;
	G.balls = G.balls.filter ((b) => !b.dead);
	if (before && !G.balls.length) loseBall ();
	// the capsules
	for (const c of G.caps)
	{
		c.y += 200 * dt; c.t += dt;
		if (c.y + 9 >= PY - PH / 2 && c.y - 9 <= PY + PH / 2 && Math.abs (c.x - P.x) <= P.w / 2 + 18) { c.dead = true; applyPower (c.k, c.x); }
		else if (c.y > H + 20) c.dead = true;
	}
	G.caps = G.caps.filter ((c) => !c.dead);
	// the laser beams
	for (const be of G.beams)
	{
		be.y -= 900 * dt;
		if (be.y < TOPY) { be.dead = true; continue; }
		for (const br of G.bricks)
			if (br.alive && be.x >= br.x && be.x <= br.x + BW && be.y >= br.y && be.y <= br.y + BH) { be.dead = true; damage (br, 'beam'); break; }
	}
	G.beams = G.beams.filter ((b) => !b.dead);
	// the moving bricks
	for (const br of G.bricks)
	{
		if (!br.alive || br.k !== 'm') continue;
		br.x += br.vx * dt;
		let hit = br.x < GX - 2 * BW + 4 || br.x + BW > GX + (COLS + 2) * BW - 4;
		if (!hit) for (const o of G.bricks) if (o !== br && o.alive && o.r === br.r && Math.abs (o.x - br.x) < BW - 1) { hit = true; break; }
		if (hit) { br.x -= br.vx * dt; br.vx = -br.vx; }
	}
	// the explosions' chain
	for (const q of G.queue)
	{
		q.t -= dt;
		if (q.t > 0) continue;
		q.dead = true;
		for (const br of G.bricks)
		{
			if (!br.alive || br === q.src) continue;
			if (Math.abs (br.x + BW / 2 - q.x) <= BW * 1.1 && Math.abs (br.y + BH / 2 - q.y) <= BH * 1.1)
			{
				if (br.k === 'M') continue;
				if (br.k === 'T' || br.k === 'U') damage (br, 'boom'); else destroy (br, 'boom');
			}
		}
	}
	G.queue = G.queue.filter ((q) => !q.dead);
	stepPuff (dt);
	// the level is clear when every breakable brick is gone
	if (!G.bricks.some (breakable) && !G.queue.length) { levelClear (); return; }
	// a level that lasts too long gets a free surprise capsule (no soft lock)
	if (G.time > G.helpT) { G.helpT += 30; G.caps.push ({ x: 60 + rnd () * (W - 120), y: TOPY + 20, k: pickPower (true), t: 0 }); }
}
function movePaddle (dt)
{
	const P = G.paddle, x0 = P.x;
	if (G.auto) autopilot (dt);
	else if (IN.kdir)
	{
		const v = IN.kdir * 720;
		P.kv = P.kv + clamp (v - P.kv, -6000 * dt, 6000 * dt);
		P.x += P.kv * dt; IN.mouseX = null;
	}
	else
	{
		P.kv = 0;
		const tx = IN.touch ? IN.touch.px + (IN.touch.x - IN.touch.x0) : IN.mouseX;
		if (tx != null) P.x += (tx - P.x) * (1 - Math.pow (0.5, dt * 60));
	}
	const lo = WALL + P.w / 2, hi = W - WALL - P.w / 2;
	P.x = clamp (P.x, lo, hi);
	// a finger that goes on past a wall moves the anchor: coming back moves the paddle at once
	if (IN.touch) { const tx = IN.touch.px + (IN.touch.x - IN.touch.x0); IN.touch.px += clamp (tx, lo, hi) - tx; }
	P.vx = (P.x - x0) / dt;
}
// the autopilot (the title's demo, ?auto): it predicts where the lowest falling ball lands, and aims a little
function autopilot (dt)
{
	const P = G.paddle;
	let best = null;
	for (const b of G.balls) if (!b.stuck && b.vy > 0 && (!best || b.y > best.y)) best = b;
	if (!best) for (const b of G.balls) if (!b.stuck) best = b;
	let tx = W / 2;
	if (best)
	{
		let x = best.x;
		if (best.vy > 0)
		{
			x = best.x + best.vx * (PY - PH / 2 - BR - best.y) / best.vy;
			const lo = WALL + BR, span = W - 2 * (WALL + BR);
			x = (x - lo) % (2 * span); if (x < 0) x += 2 * span;
			x = lo + (x > span ? 2 * span - x : x);
		}
		tx = x - G.aiOff * P.w / 2;
	}
	else if (G.caps.length) tx = G.caps[0].x;
	G.aiT -= dt;
	const sp = 1100;
	P.x += clamp (tx - P.x, -sp * dt, sp * dt);
}
function moveBall (b, dt)
{
	const P = G.paddle;
	if (b.squint > 0) b.squint -= dt;
	if (b.sq > 0) b.sq -= dt;
	if (b.stuck) { b.x = P.x + b.off; b.y = PY - PH / 2 - BR; b.trail.length = 0; return; }
	const sp = curSpeed (), m = Math.hypot (b.vx, b.vy) || 1;
	b.vx = b.vx / m * sp; b.vy = b.vy / m * sp;
	const n = Math.max (1, Math.ceil (sp * dt / 4));
	for (let i = 0; i < n && !b.dead && !b.stuck; i++)
	{
		const py = b.y;
		b.x += b.vx * dt / n; b.y += b.vy * dt / n;
		collide (b, py);
	}
	b.tt = (b.tt || 0) + 1;
	if (b.tt % 2 === 0) { b.trail.unshift ({ x: b.x, y: b.y }); if (b.trail.length > 6) b.trail.pop (); }
}
function fixAngle (b)
{
	// never (almost) horizontal: at least 12 degrees from the horizontal
	const sp = Math.hypot (b.vx, b.vy) || 1, minVy = Math.sin (rad (12)) * sp;
	if (Math.abs (b.vy) < minVy)
	{
		b.vy = (b.vy < 0 ? -1 : b.vy > 0 ? 1 : -1) * minVy;
		b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt (sp * sp - minVy * minVy);
	}
}
function collide (b, py)
{
	const P = G.paddle;
	// the walls
	if (b.x < WALL + BR) { b.x = WALL + BR; b.vx = Math.abs (b.vx); hitWall (b); }
	else if (b.x > W - WALL - BR) { b.x = W - WALL - BR; b.vx = -Math.abs (b.vx); hitWall (b); }
	if (b.y < TOPY + BR) { b.y = TOPY + BR; b.vy = Math.abs (b.vy); hitWall (b); }
	// the paddle
	const top = PY - PH / 2;
	if (b.vy > 0 && b.y + BR >= top && py + BR <= top + 8 && b.x >= P.x - P.w / 2 - BR * 0.7 && b.x <= P.x + P.w / 2 + BR * 0.7)
	{
		const t = clamp ((b.x - P.x) / (P.w / 2), -1, 1), a = t * rad (60), sp = Math.hypot (b.vx, b.vy);
		b.vx = Math.sin (a) * sp + 0.15 * P.vx; b.vy = -Math.cos (a) * sp;
		const m = Math.hypot (b.vx, b.vy); b.vx = b.vx / m * sp; b.vy = b.vy / m * sp;
		fixAngle (b);
		b.y = top - BR; b.sq = 0.08;
		G.combo = 0; G.lastMult = 1;
		G.speed = Math.min (G.speed + SPEED_PADDLE, SPEED_CAP);
		P.sq = 0.15; P.mood = 'happy'; P.moodT = 0.3;
		if (G.auto) G.aiOff = (rnd () - 0.5) * 1.3;
		Snd.play ('paddle');
		if (G.fx.C > 0 && G.catchN > 0) { b.stuck = true; b.off = b.x - P.x; G.catchN--; if (!G.catchN) G.fx.C = 0; }
		return;
	}
	// the shield
	if (G.fx.W > 0 && b.vy > 0 && b.y + BR >= SHIELDY)
	{
		b.y = SHIELDY - BR; b.vy = -Math.abs (b.vy); G.fx.W = 0;
		Snd.play ('shield'); burst (b.x, SHIELDY - 30, 'BOING!', 26);
		for (let i = 0; i < 16; i++) part (b.x + (rnd () - 0.5) * 80, SHIELDY, (rnd () - 0.5) * 200, -rnd () * 200, '#A66CFF', 0.6, 'c');
		return;
	}
	if (b.y - BR > H) { b.dead = true; return; }
	// Puff the cloud
	const pf = G.puff;
	if (pf && !pf.pop)
	{
		const dx = b.x - pf.x, dy = b.y - pf.y, d = Math.hypot (dx, dy), R = 24 + BR;
		if (d < R && d > 0.01)
		{
			const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
			if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
			b.x = pf.x + nx * R; b.y = pf.y + ny * R; fixAngle (b);
			hitPuff (pf);
		}
	}
	// the bricks
	if (b.y - BR > GY + 14 * BH) return;
	const fire = G.fx.B > 0;
	for (const br of G.bricks)
	{
		if (!br.alive) continue;
		const x0 = br.x + 1, y0 = br.y + 1, x1 = br.x + BW - 1, y1 = br.y + BH - 1;
		if (b.x + BR < x0 || b.x - BR > x1 || b.y + BR < y0 || b.y - BR > y1) continue;
		const cx = clamp (b.x, x0, x1), cy = clamp (b.y, y0, y1);
		let dx = b.x - cx, dy = b.y - cy;
		const d2 = dx * dx + dy * dy;
		if (d2 > BR * BR) continue;
		if (fire && br.k !== 'M') { destroy (br, 'ball'); b.squint = 0.1; continue; }
		if (d2 > 1e-6)
		{
			// a corner whose neighbour is a brick is a face: the flat side, not the corner
			if (dx && dy && br.k !== 'm')
			{
				const nh = cell (br.c + (dx > 0 ? 1 : -1), br.r), nv = cell (br.c, br.r + (dy > 0 ? 1 : -1));
				if (nh && !nv) dx = 0; else if (nv && !nh) dy = 0;
			}
			const d = Math.hypot (dx, dy) || 1, nx = dx / d, ny = dy / d;
			const dot = b.vx * nx + b.vy * ny;
			if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
			if (nx) b.x = nx > 0 ? x1 + BR : x0 - BR; else if (!ny) b.x = cx + nx * BR;
			if (ny) b.y = ny > 0 ? y1 + BR : y0 - BR;
			if (nx && ny) { b.x = cx + nx * BR; b.y = cy + ny * BR; }
		}
		else
		{
			// the centre inside: out by the shortest way
			const pl = b.x - x0, pr = x1 - b.x, pt = b.y - y0, pb = y1 - b.y, mn = Math.min (pl, pr, pt, pb);
			if (mn === pl) { b.x = x0 - BR; b.vx = -Math.abs (b.vx); } else if (mn === pr) { b.x = x1 + BR; b.vx = Math.abs (b.vx); }
			else if (mn === pt) { b.y = y0 - BR; b.vy = -Math.abs (b.vy); } else { b.y = y1 + BR; b.vy = Math.abs (b.vy); }
		}
		fixAngle (b);
		b.sq = 0.08; b.squint = 0.1;
		damage (br, 'ball');
		return;
	}
}
function cell (c, r) { if (c < 0 || c >= COLS || r < 0) return null; const b = G.grid[r * COLS + c]; return b && b.alive ? b : null; }
function hitWall (b) { b.sq = 0.06; fixAngle (b); Snd.play ('wall'); }

function damage (br, src)
{
	if (br.k === 'M')
	{
		br.wob = 1; Snd.play ('metal');
		for (let i = 0; i < 5; i++) part (br.x + BW / 2, br.y + BH, (rnd () - 0.5) * 220, rnd () * 120, '#FFF6A8', 0.3, 'c', 3);
		return;
	}
	br.hp--;
	if (br.hp > 0)
	{
		br.wob = 1; Snd.play ('tough');
		for (let i = 0; i < 4; i++) part (br.x + BW / 2, br.y + BH / 2, (rnd () - 0.5) * 160, -rnd () * 120, KIND[br.k].edge, 0.4, 'c', 4);
		if (src !== 'boom') { G.combo++; scoreCombo (br.x + BW / 2, br.y); }
		return;
	}
	destroy (br, src);
}
function destroy (br, src)
{
	if (!br.alive) return;
	br.alive = false;
	if (br.k !== 'm') G.grid[br.r * COLS + br.c] = null;
	const cx = br.x + BW / 2, cy = br.y + BH / 2;
	if (src !== 'boom') G.combo++;
	const mult = comboMult (G.combo);
	const base = br.k === 'n' ? KIND.n.pts[br.col] : KIND[br.k].pts;
	const pts = Math.round (base * mult * (G.fx.D > 0 ? 2 : 1) / 10) * 10;
	addScore (pts);
	G.texts.push ({ x: cx, y: cy, txt: '+' + pts, life: 0.7, max: 0.7, size: 15, col: '#fff' });
	const col = br.k === 'n' ? COLORS[br.col] : KIND[br.k].col;
	for (let i = 0; i < 10; i++) part (cx + (rnd () - 0.5) * BW, cy, (rnd () - 0.5) * 320, -60 - rnd () * 200, col, 0.6, 'c');
	for (let i = 0; i < 2; i++) part (cx, cy, (rnd () - 0.5) * 200, -80 - rnd () * 140, '#FFFFFF', 0.6, 's');
	Snd.play ('brick', G.combo);
	G.speed = Math.min (G.speed + SPEED_BRICK, SPEED_CAP);
	G.hitstop = Math.max (G.hitstop, 0.03);
	shake (3, 0.2);
	if (src !== 'boom') scoreCombo (cx, br.y);
	if (br.k === 'X')
	{
		G.queue.push ({ t: 0.08, x: cx, y: cy, src: br });
		burst (cx, cy - 6, 'BOOM!', 30); Snd.play ('boom');
		G.hitstop = Math.max (G.hitstop, 0.08); shake (8, 0.3);
		for (let i = 0; i < 24; i++) part (cx, cy, (rnd () - 0.5) * 520, (rnd () - 0.5) * 520, rnd () < 0.5 ? '#FF9F1C' : '#FFD23F', 0.7, rnd () < 0.3 ? 's' : 'c');
		G.parts.push ({ x: cx, y: cy, vx: 0, vy: 0, life: 0.35, max: 0.35, col: '#FFF6A8', kind: 'ring', size: 70 });
	}
	if (br.k === 'G') burst (cx, cy - 8, '+500', 22);
	maybeDrop (br, cx, cy);
}
function scoreCombo (x, y)
{
	const m = comboMult (G.combo);
	if (m > G.lastMult) { G.lastMult = m; if (m >= 2) G.texts.push ({ x, y: y - 14, txt: tr ('combo', { n: m }), life: 0.9, max: 0.9, size: 20, col: '#FFD23F' }); }
	if (G.combo === 5) burst (x, y - 10, 'POW!', 28);
	if (G.combo === 10) burst (x, y - 10, tr ('super'), 30);
}
function addScore (p)
{
	if (G.demo) return;
	G.score += p;
	while (G.score >= G.nextLife)
	{
		G.nextLife += 25000;
		if (G.lives < 6) { G.lives++; G.texts.push ({ x: W / 2, y: PY - 140, txt: tr ('extraLife'), life: 1.2, max: 1.2, size: 26, col: '#FF5A5F' }); Snd.play ('life'); }
	}
}
function pickPower (good)
{
	const ks = Object.keys (POWERS).filter ((k) => good === undefined || !!POWERS[k].good === good);
	let sum = 0; for (const k of ks) sum += POWERS[k].w;
	let r = rnd () * sum;
	for (const k of ks) { r -= POWERS[k].w; if (r <= 0) return k; }
	return ks[0];
}
function maybeDrop (br, x, y)
{
	let k = null;
	if (br.k === 'S') k = pickPower (rnd () < 0.8);
	else if (br.k === 'G') { if (rnd () < 0.4) k = pickPower (true); }
	else if (G.caps.length < 3 && rnd () < (br.k === 'T' || br.k === 'U' ? 0.18 : 0.12)) k = pickPower ();
	if (k) G.caps.push ({ x: clamp (x, 30, W - 30), y, k, t: 0 });
}
function applyPower (k, x)
{
	const P = G.paddle, p = POWERS[k];
	G.texts.push ({ x: clamp (x, 90, W - 90), y: PY - 40, txt: tr ('p' + k), life: 1, max: 1, size: 18, col: p.good ? '#3DD68C' : '#FF5A5F' });
	Snd.play (p.good ? 'power' : 'bad');
	P.mood = p.good ? 'happy' : 'ouch'; P.moodT = p.good ? 0.4 : 0.3;
	addScore (50);
	switch (k)
	{
	case 'E': G.fx.E = p.dur; G.fx.R = 0; break;
	case 'R': G.fx.R = p.dur; G.fx.E = 0; break;
	case 'S': G.fx.S = p.dur; G.fx.F = 0; break;
	case 'F': G.fx.F = p.dur; G.fx.S = 0; break;
	case 'C': G.fx.C = p.dur; G.catchN = 8; break;
	case 'L': if (G.lives < 6) G.lives++; Snd.play ('life'); break;
	case 'M':
	{
		releaseStuck ();
		const add = [];
		for (const b of G.balls)
			for (const a of [-20, 20])
			{
				if (G.balls.length + add.length >= 8) break;
				const c = Math.cos (rad (a)), s = Math.sin (rad (a));
				add.push ({ x: b.x, y: b.y, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c, stuck: false, off: 0, sq: 0, squint: 0, trail: [] });
			}
		for (const b of add) fixAngle (b);
		G.balls.push (...add);
		break;
	}
	default: G.fx[k] = p.dur;
	}
	if (k === 'Z') burst (P.x, PY - 50, 'ZAP!', 24);
}
function releaseStuck () { if (G.balls.some ((b) => b.stuck && !b.serve)) launch (); }
function loseBall ()
{
	const P = G.paddle;
	if (!G.demo) { G.lives--; G.lostBall = true; }
	G.phase = 'dying'; G.phaseT = 0.9;
	G.fx = {}; G.caps = []; G.beams = []; G.speed = G.speed0;
	P.mood = 'ouch'; P.moodT = 0.8;
	G.texts.push ({ x: P.x, y: PY - 50, txt: tr ('ouch'), life: 0.9, max: 0.9, size: 30, col: '#FF5A5F' });
	shake (10, 0.4);
	Snd.play ('lose');
}
function levelClear ()
{
	G.phase = 'cleared'; G.phaseT = 1.6;
	G.balls = []; G.caps = []; G.beams = [];
	G.paddle.mood = 'happy'; G.paddle.moodT = 2;
	if (G.demo) return;
	const L = LEVELS[G.li];
	const bricksPts = G.score - G.levelStart;
	const left = Math.max (0, Math.round (L.par - G.time));
	const bonus = { bricks: bricksPts, clear: 1000, time: 50 * left, left, miss: G.lostBall ? 0 : 500 };
	addScore (bonus.clear + bonus.time + bonus.miss);
	if (!G.lostBall && G.lives < 6) { G.lives++; G.texts.push ({ x: W / 2, y: PY - 140, txt: tr ('extraLife'), life: 1.4, max: 1.4, size: 26, col: '#FF5A5F' }); }
	const stars = 1 + (G.lostBall ? 0 : 1) + (!G.lostBall && G.time <= L.par ? 1 : 0);
	G.result = { stars, bonus, levelScore: G.score - G.levelStart };
	G.result.newBest = G.result.levelScore > (prog.best[G.li] || 0);
	prog.stars[G.li] = Math.max (prog.stars[G.li] || 0, stars);
	prog.best[G.li] = Math.max (prog.best[G.li] || 0, G.result.levelScore);
	prog.unlocked = Math.max (prog.unlocked, Math.min (NLEV, G.li + 2));
	store.set ('progress', prog);
	Snd.play ('clear');
	burst (W / 2, H * 0.58, tr ('super'), 40);
}

// ---- Puff the cloud (level 5 and on): the ball bounces off it; the second hit pops it ---------------------------
function stepPuff (dt)
{
	if (G.li < 4 || !CFG.puffs) { G.puff = null; return; }
	const pf = G.puff;
	if (!pf)
	{
		G.puffT -= dt;
		if (G.puffT <= 0)
		{
			G.puffT = 20;
			if (rnd () < 0.4)
			{
				let low = GY; for (const b of G.bricks) if (b.alive) low = Math.max (low, b.y + BH);
				const dir = rnd () < 0.5 ? 1 : -1;
				G.puff = { x: dir > 0 ? -40 : W + 40, y0: clamp (low + 80, 420, PY - 200), y: 0, dir, t: 0, hits: 0, hurt: 0, pop: 0 };
			}
		}
		return;
	}
	pf.t += dt;
	if (pf.hurt > 0) pf.hurt -= dt;
	if (pf.pop) { pf.pop -= dt; if (pf.pop <= 0) G.puff = null; return; }
	pf.x += pf.dir * 64 * dt; pf.y = pf.y0 + Math.sin (pf.t * 2) * 20;
	if (pf.x < -60 || pf.x > W + 60) G.puff = null;
}
function hitPuff (pf)
{
	if (pf.hurt > 0) return;
	pf.hits++; pf.hurt = 0.25;
	Snd.play ('puff');
	if (pf.hits >= 2)
	{
		pf.pop = 0.3; addScore (300);
		G.texts.push ({ x: pf.x, y: pf.y - 30, txt: '+300', life: 0.8, max: 0.8, size: 18, col: '#fff' });
		for (let i = 0; i < 16; i++) part (pf.x, pf.y, (rnd () - 0.5) * 300, (rnd () - 0.5) * 300, '#FFFFFF', 0.6, 'c', 7);
		if (rnd () < 0.5) G.caps.push ({ x: pf.x, y: pf.y, k: pickPower (true), t: 0 });
	}
	else burst (pf.x, pf.y - 34, 'BOING!', 20);
}

// ---- effects ----------------------------------------------------------------------------------------------------
function part (x, y, vx, vy, col, life, kind, size)
{
	if (G.parts.length > 300) G.parts.shift ();
	G.parts.push ({ x, y, vx, vy, col, life, max: life, kind, size: size || 5 + rnd () * 4, rot: rnd () * 6, vr: (rnd () - 0.5) * 14 });
}
function confetti (x, y, n, col, life) { for (let i = 0; i < n; i++) part (x, y, (rnd () - 0.5) * 80, 60 + rnd () * 80, col, life + 1.5, 'c'); }
function burst (x, y, txt, size) { G.bursts.push ({ x: clamp (x, 70, W - 70), y: clamp (y, TOPY + 40, H - 40), txt, size, life: 0.75, max: 0.75, rot: (rnd () - 0.5) * 0.3 }); }
function shake (a, d) { if (!motion ()) a *= 0.25; if (a >= G.shakeA * (G.shake > 0 ? 1 : 0)) { G.shakeA = a; G.shake = d; G.shakeD = d; } }
function stepFx (dt)
{
	if (!dt) return;
	const P = G.paddle;
	for (const p of G.parts)
	{
		p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
		if (p.kind !== 'ring') p.vy += (p.kind === 'flame' ? -300 : 600) * dt;
	}
	G.parts = G.parts.filter ((p) => p.life > 0);
	for (const t of G.texts) { t.life -= dt; t.y -= (t.big ? 8 : 40) * dt; }
	G.texts = G.texts.filter ((t) => t.life > 0);
	for (const b of G.bursts) b.life -= dt;
	G.bursts = G.bursts.filter ((b) => b.life > 0);
	if (G.shake > 0) G.shake -= dt;
	if (P.sq > 0) P.sq -= dt;
	if (P.moodT > 0) { P.moodT -= dt; if (P.moodT <= 0) P.mood = ''; }
	P.blink -= dt;
	if (P.blink <= 0) { P.blinkT = 0.12; P.blink = 3 + rnd () * 3; }
	if (P.blinkT > 0) P.blinkT -= dt;
	for (const br of G.bricks) if (br.wob > 0) br.wob = Math.max (0, br.wob - dt * 10);
	if (G.fx.B > 0 && motion ()) for (const b of G.balls) if (!b.stuck && rnd () < 0.6) part (b.x, b.y, (rnd () - 0.5) * 40, (rnd () - 0.5) * 40, rnd () < 0.5 ? '#FF9F1C' : '#FFD23F', 0.3, 'flame', 6);
}

// ---- drawing ----------------------------------------------------------------------------------------------------
function rr (x, y, w, h, r)
{
	r = Math.max (0, Math.min (r, w / 2, h / 2));
	g.beginPath (); g.moveTo (x + r, y); g.arcTo (x + w, y, x + w, y + h, r); g.arcTo (x + w, y + h, x, y + h, r);
	g.arcTo (x, y + h, x, y, r); g.arcTo (x, y, x + w, y, r); g.closePath ();
}
// a cartoon shape: a hard drop shadow, the flat fill, a highlight band on its top third, the ink outline
function toon (x, y, w, h, r, fill, lw, noShadow)
{
	if (!noShadow) { g.fillStyle = 'rgba(43,35,64,.25)'; rr (x, y + 3, w, h, r); g.fill (); }
	g.fillStyle = fill; rr (x, y, w, h, r); g.fill ();
	g.save (); rr (x, y, w, h, r); g.clip ();
	g.fillStyle = 'rgba(255,255,255,.35)'; rr (x + 3, y + 2, w - 6, h * 0.32, h * 0.16); g.fill ();
	g.restore ();
	g.lineWidth = lw || 2.5; g.strokeStyle = OL; rr (x, y, w, h, r); g.stroke ();
}
function otext (txt, x, y, size, fill, lw, align, weight)
{
	g.font = (weight || 900) + ' ' + size + 'px ' + FONT;
	g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
	if (lw) { g.lineWidth = lw; g.strokeStyle = OL; g.strokeText (txt, x, y); }
	g.fillStyle = fill; g.fillText (txt, x, y);
}
function starPath (x, y, R, r, n, rot)
{
	g.beginPath ();
	for (let i = 0; i < n * 2; i++) { const a = (rot || 0) - Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; g.lineTo (x + Math.cos (a) * q, y + Math.sin (a) * q); }
	g.closePath ();
}
function heartPath (x, y, s)
{
	g.beginPath ();
	g.moveTo (x, y + s * 0.8);
	g.bezierCurveTo (x - s * 1.2, y, x - s * 0.9, y - s * 0.9, x, y - s * 0.35);
	g.bezierCurveTo (x + s * 0.9, y - s * 0.9, x + s * 1.2, y, x, y + s * 0.8);
	g.closePath ();
}
function icon (kind, x, y, s)
{
	g.beginPath ();
	switch (kind)
	{
	case 'heart': heartPath (x, y, s); break;
	case 'circle': g.arc (x, y, s * 0.75, 0, Math.PI * 2); break;
	case 'star': starPath (x, y, s, s * 0.45, 5); break;
	case 'tri': g.moveTo (x, y - s * 0.85); g.lineTo (x + s * 0.9, y + s * 0.7); g.lineTo (x - s * 0.9, y + s * 0.7); g.closePath (); break;
	case 'square': g.rect (x - s * 0.65, y - s * 0.65, s * 1.3, s * 1.3); break;
	case 'diamond': g.moveTo (x, y - s); g.lineTo (x + s * 0.8, y); g.lineTo (x, y + s); g.lineTo (x - s * 0.8, y); g.closePath (); break;
	}
	g.fill ();
}

function drawBackground (t)
{
	const th = THEMES[G ? G.world : 0];
	// the whole screen (the letterbox too): the world's sky
	g.setTransform (DPR, 0, 0, DPR, 0, 0);
	const gr = g.createLinearGradient (0, OY, 0, OY + H * S);
	gr.addColorStop (0, th.top); gr.addColorStop (1, th.bot);
	g.fillStyle = gr; g.fillRect (0, 0, VW, VH);
	g.setTransform (DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
	const mv = motion () ? 1 : 0, w = G ? G.world : 0;
	if (w === 0)
	{
		// lollipops on the horizon, puffy clouds drifting
		for (let i = -5; i < 11; i++)
		{
			const x = i * 90 + 20, hh = 50 + ((i * 37) & 31);
			g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect (x - 2, H - hh, 4, hh);
			g.fillStyle = i & 1 ? 'rgba(255,122,182,.55)' : 'rgba(122,211,255,.55)';
			g.beginPath (); g.arc (x, H - hh, 16, 0, Math.PI * 2); g.fill ();
			g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath (); g.arc (x, H - hh, 8, 0, 4.5); g.stroke ();
		}
		for (const c of DECO.clouds)
		{
			const x = ((c.x + t * c.v * mv + 700) % 1900) - 700;
			g.fillStyle = 'rgba(255,255,255,.8)';
			g.beginPath (); g.arc (x, c.y, 22 * c.s, 0, 7); g.arc (x + 24 * c.s, c.y - 10 * c.s, 26 * c.s, 0, 7); g.arc (x + 50 * c.s, c.y, 20 * c.s, 0, 7); g.fill ();
		}
	}
	else if (w === 1)
	{
		for (const s of DECO.weeds)
		{
			const sw = Math.sin (t * 1.3 + s.p) * rad (8) * mv;
			g.save (); g.translate (s.x, H); g.rotate (sw);
			g.strokeStyle = 'rgba(61,190,139,.75)'; g.lineWidth = 9; g.lineCap = 'round';
			g.beginPath (); g.moveTo (0, 0); g.quadraticCurveTo (16, -s.h * 0.5, 0, -s.h); g.stroke ();
			g.restore ();
		}
		g.lineWidth = 2;
		for (const b of DECO.bubbles)
		{
			const y = ((b.y - t * b.v * mv) % 900 + 900) % 900 - 40, x = b.x + Math.sin (t * 2 + b.p) * 6 * mv;
			g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath (); g.arc (x, y, b.r, 0, 7); g.stroke ();
			g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath (); g.arc (x - b.r * 0.35, y - b.r * 0.35, b.r * 0.25, 0, 7); g.fill ();
		}
	}
	else
	{
		for (const s of DECO.stars)
		{
			const a = 0.45 + 0.55 * (mv ? Math.abs (Math.sin (t * s.f + s.p)) : 1);
			g.fillStyle = 'rgba(255,246,168,' + a.toFixed (2) + ')';
			starPath (s.x, s.y, s.s * 1.6, s.s * 0.45, 4); g.fill ();
		}
		// a ringed planet
		g.save (); g.translate (470, H * 0.7);
		g.fillStyle = 'rgba(181,140,255,.85)'; g.beginPath (); g.arc (0, 0, 46, 0, 7); g.fill ();
		g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath (); g.arc (-12, -14, 20, 0, 7); g.fill ();
		g.strokeStyle = 'rgba(255,214,232,.7)'; g.lineWidth = 6; g.beginPath (); g.ellipse (0, 0, 80, 16, -0.3, 0, 7); g.stroke ();
		g.restore ();
	}
}
function drawWalls ()
{
	const th = THEMES[G.world];
	const wall = (x, y, w, h) =>
	{
		g.fillStyle = th.wall; g.fillRect (x, y, w, h);
		g.save (); g.beginPath (); g.rect (x, y, w, h); g.clip ();
		g.strokeStyle = th.wall2; g.globalAlpha = G.world === 0 ? 0.8 : 0.5; g.lineWidth = 6;
		for (let k = -h; k < w + h; k += 18) { g.beginPath (); g.moveTo (x + k, y); g.lineTo (x + k + h, y + h); g.stroke (); }
		for (let k = 0; k < h; k += 18) { g.beginPath (); g.moveTo (x, y + k); g.lineTo (x + w, y + k + w); g.stroke (); }
		g.restore ();
		g.lineWidth = 3; g.strokeStyle = OL; g.strokeRect (x, y, w, h);
	};
	wall (0, HUDH, WALL, H - HUDH + 20);
	wall (W - WALL, HUDH, WALL, H - HUDH + 20);
	wall (0, HUDH, W, TOPY - HUDH);
}
function drawBrick (br, t)
{
	const w = BW - 3, h = BH - 3;
	let x = br.x + 1.5, y = br.y + 1.5;
	const s = 1 + (br.wob > 0 ? Math.sin (br.wob * Math.PI) * 0.12 : 0);
	g.save ();
	if (s !== 1) { g.translate (x + w / 2, y + h / 2); g.scale (s, s); g.translate (-(x + w / 2), -(y + h / 2)); }
	const K = KIND[br.k];
	const col = br.k === 'n' ? COLORS[br.col] : K.col;
	if (br.k === 'T' || br.k === 'U')
	{
		toon (x, y, w, h, 6, K.edge, 2.5);
		g.fillStyle = col; rr (x + 3, y + 3, w - 6, h - 6, 4); g.fill ();
		g.fillStyle = 'rgba(255,255,255,.3)'; rr (x + 4, y + 3, w - 8, 4, 2); g.fill ();
	}
	else toon (x, y, w, h, 6, col, 2.5);
	const cx = x + w / 2, cy = y + h / 2;
	const ink = CFG.bold ? 'rgba(43,35,64,.75)' : 'rgba(255,255,255,.55)';
	// what tells the bricks apart without the colour
	switch (br.k)
	{
	case 'n':
		g.fillStyle = ink;
		icon (ICONS[br.col], br.face ? x + w - 8 : cx, cy + 0.5, br.face ? 4 : 5.5);
		break;
	case 'T': case 'U':
		g.fillStyle = CFG.bold ? OL : '#fff';
		for (let i = 0; i < br.hp; i++) { g.beginPath (); g.arc (x + w - 7 - i * 6, y + h - 6, 2, 0, 7); g.fill (); }
		g.strokeStyle = OL; g.lineWidth = 1.5;
		for (let i = 0; i < br.max - br.hp; i++)
		{
			const ox = x + 8 + i * 12;
			g.beginPath (); g.moveTo (ox, y + 1); g.lineTo (ox + 4, y + 6); g.lineTo (ox + 1, y + 10); g.lineTo (ox + 6, y + h - 2); g.stroke ();
		}
		break;
	case 'M':
		g.fillStyle = '#7A8794';
		for (const [a, b] of [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]]) { g.beginPath (); g.arc (x + a, y + b, 2, 0, 7); g.fill (); }
		g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect (x + 10, y + 5, 3, h - 10); g.fillRect (x + 16, y + 5, 2, h - 10);
		break;
	case 'X':
		g.save (); rr (x, y, w, h, 6); g.clip ();
		g.strokeStyle = 'rgba(43,35,64,.45)'; g.lineWidth = 4;
		for (let k = -h; k < w; k += 10) { g.beginPath (); g.moveTo (x + k, y + h); g.lineTo (x + k + h, y); g.stroke (); }
		g.restore ();
		g.lineWidth = 2.5; g.strokeStyle = OL; rr (x, y, w, h, 6); g.stroke ();
		g.fillStyle = OL; g.beginPath (); g.arc (cx, cy + 1, 5.5, 0, 7); g.fill ();
		g.strokeStyle = OL; g.lineWidth = 2; g.beginPath (); g.moveTo (cx + 3, cy - 3); g.quadraticCurveTo (cx + 7, cy - 9, cx + 10, cy - 7); g.stroke ();
		if (Math.sin (t * 14 + br.ph) > -0.3) { g.fillStyle = '#FFD23F'; starPath (cx + 10, cy - 8, 4, 1.6, 4, t * 4); g.fill (); }
		break;
	case 'G':
		g.fillStyle = CFG.bold ? OL : '#fff'; icon ('star', cx, cy + 0.5, 5.5);
		if (((t + br.ph) % 1.5) < 0.35) { const k = ((t + br.ph) % 1.5) / 0.35; g.fillStyle = 'rgba(255,255,255,' + (1 - k).toFixed (2) + ')'; starPath (x + 6 + k * (w - 12), y + 5, 5, 1.5, 4); g.fill (); }
		break;
	case 'S':
		otext ('?', cx, cy + 1 + (motion () ? Math.sin (t * 4 + br.ph) * 1.2 : 0), 15, '#fff', 3.5);
		break;
	case 'm':
		g.fillStyle = CFG.bold ? OL : '#fff';
		g.beginPath (); g.moveTo (x + 5, cy); g.lineTo (x + 11, cy - 5); g.lineTo (x + 11, cy + 5); g.fill ();
		g.beginPath (); g.moveTo (x + w - 5, cy); g.lineTo (x + w - 11, cy - 5); g.lineTo (x + w - 11, cy + 5); g.fill ();
		break;
	}
	// a face on one brick in three: the eyes widen when the ball comes close
	if (br.face && br.k !== 'X')
	{
		let near = false;
		for (const b of G.balls) if (Math.abs (b.x - cx) < 60 && Math.abs (b.y - cy) < 60) near = true;
		const ex = br.k === 'n' ? x + 11 : cx - 5, er = near ? 2.6 : 1.8;
		g.fillStyle = OL;
		g.beginPath (); g.arc (ex - 4, cy - 2, er, 0, 7); g.arc (ex + 4, cy - 2, er, 0, 7); g.fill ();
		g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath ();
		if (near) { g.arc (ex, cy + 4, 2, 0, 7); }
		else if ((br.k === 'T' || br.k === 'U') && br.hp < br.max) { g.arc (ex, cy + 6, 3, Math.PI * 1.2, Math.PI * 1.8); }
		else { g.arc (ex, cy + 2, 3, Math.PI * 0.2, Math.PI * 0.8); }
		g.stroke ();
	}
	g.restore ();
}
function drawPaddle (t)
{
	const P = G.paddle;
	let sx = 1, sy = 1;
	if (P.sq > 0) { const k = P.sq / 0.15, a = Math.sin ((1 - k) * Math.PI); sx = 1 + 0.1 * a; sy = 1 - 0.2 * a; }
	const bob = motion () && G.phase !== 'dying' ? Math.sin (t * 2 * Math.PI) * 1 : 0;
	const w = P.w, x = P.x - w / 2, y = PY - PH / 2 + bob;
	g.save ();
	g.translate (P.x, PY); g.scale (sx, sy); g.translate (-P.x, -PY);
	// the laser's cannons
	if (G.fx.Z > 0) for (const cx of [x + 8, x + w - 8]) toon (cx - 4, y - 8, 8, 12, 3, '#7A8794', 2, true);
	toon (x, y, w, PH, PH * 0.45, '#2F7F93', 3);
	// the orange end caps
	g.save (); rr (x, y, w, PH, PH * 0.45); g.clip ();
	g.fillStyle = '#FF9F1C'; g.fillRect (x, y, 13, PH); g.fillRect (x + w - 13, y, 13, PH);
	g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect (x, y + 2, w, PH * 0.3);
	g.restore ();
	g.lineWidth = 3; g.strokeStyle = OL; rr (x, y, w, PH, PH * 0.45); g.stroke ();
	g.beginPath (); g.moveTo (x + 13, y); g.lineTo (x + 13, y + PH); g.moveTo (x + w - 13, y); g.lineTo (x + w - 13, y + PH); g.lineWidth = 2; g.stroke ();
	// the glue
	if (G.fx.C > 0)
	{
		g.fillStyle = '#3DD68C'; g.strokeStyle = OL; g.lineWidth = 1.5;
		for (let i = 0; i < 4; i++) { const dx = x + 22 + i * (w - 44) / 3; g.beginPath (); g.ellipse (dx, y + 1, 5, 3 + (i % 2) * 2, 0, 0, 7); g.fill (); g.stroke (); }
	}
	// the face
	let mood = G.phase === 'over' ? 'sad' : P.mood;
	let ball = null; for (const b of G.balls) if (!ball || b.y > ball.y) ball = b;
	if (!mood && ball && !ball.stuck && ball.vy > 0 && ball.y > H * 0.8 - 20 && Math.abs (ball.x - P.x) > P.w / 2 + 16) mood = 'worry';
	const ey = y + PH / 2 - 2, ex = [P.x - 11, P.x + 11];
	if (mood === 'ouch')
	{
		g.strokeStyle = OL; g.lineWidth = 2.2;
		for (const e of ex) { g.beginPath (); g.moveTo (e - 3.5, ey - 3.5); g.lineTo (e + 3.5, ey + 3.5); g.moveTo (e + 3.5, ey - 3.5); g.lineTo (e - 3.5, ey + 3.5); g.stroke (); }
		g.fillStyle = '#FF7AB6'; g.beginPath (); g.ellipse (P.x + 3, ey + 9, 3, 4, 0, 0, 7); g.fill (); g.stroke ();
	}
	else
	{
		for (const e of ex)
		{
			if (P.blinkT > 0) { g.strokeStyle = OL; g.lineWidth = 2; g.beginPath (); g.moveTo (e - 4, ey); g.lineTo (e + 4, ey); g.stroke (); continue; }
			g.fillStyle = '#fff'; g.strokeStyle = OL; g.lineWidth = 1.6;
			g.beginPath (); g.arc (e, ey, 5, 0, 7); g.fill (); g.stroke ();
			let px = 0, py = 0;
			if (ball) { const dx = ball.x - e, dy = ball.y - ey, d = Math.hypot (dx, dy) || 1; px = dx / d * 2; py = dy / d * 2; }
			g.fillStyle = OL; g.beginPath (); g.arc (e + px, ey + py, 2.5, 0, 7); g.fill ();
		}
		if (mood === 'worry')
		{
			g.strokeStyle = OL; g.lineWidth = 1.8;
			g.beginPath (); g.moveTo (ex[0] - 5, ey - 9); g.lineTo (ex[0] + 3, ey - 7); g.moveTo (ex[1] + 5, ey - 9); g.lineTo (ex[1] - 3, ey - 7); g.stroke ();
			g.fillStyle = '#7AD3FF'; g.beginPath (); g.moveTo (x + w + 4, y - 10); g.quadraticCurveTo (x + w + 9, y - 2, x + w + 4, y); g.quadraticCurveTo (x + w - 1, y - 2, x + w + 4, y - 10); g.fill (); g.lineWidth = 1.2; g.stroke ();
		}
	}
	// the mouth
	g.strokeStyle = OL; g.lineWidth = 1.8;
	if (mood === 'happy') { g.fillStyle = '#C2313A'; g.beginPath (); g.arc (P.x, ey + 4, 4, 0, Math.PI); g.closePath (); g.fill (); g.stroke (); }
	else if (mood === 'worry') { g.beginPath (); g.moveTo (P.x - 4, ey + 7); g.quadraticCurveTo (P.x - 2, ey + 5, P.x, ey + 7); g.quadraticCurveTo (P.x + 2, ey + 9, P.x + 4, ey + 7); g.stroke (); }
	else if (mood === 'sad')
	{
		g.beginPath (); g.arc (P.x, ey + 9, 3.5, Math.PI * 1.2, Math.PI * 1.8); g.stroke ();
		g.fillStyle = '#7AD3FF'; g.lineWidth = 1.2; g.beginPath (); g.moveTo (ex[1] + 2, ey + 3); g.quadraticCurveTo (ex[1] + 6, ey + 9, ex[1] + 2, ey + 11); g.quadraticCurveTo (ex[1] - 2, ey + 9, ex[1] + 2, ey + 3); g.fill (); g.stroke ();
	}
	else if (mood !== 'ouch') { g.beginPath (); g.arc (P.x, ey + 3, 3.5, Math.PI * 0.2, Math.PI * 0.8); g.stroke (); }
	g.restore ();
}
function drawBall (b)
{
	const fire = G.fx.B > 0;
	// the trail
	for (let i = b.trail.length - 1; i >= 0; i--)
	{
		const p = b.trail[i], a = 0.4 * (1 - i / 6);
		g.fillStyle = fire ? 'rgba(255,106,43,' + a.toFixed (2) + ')' : 'rgba(255,253,248,' + a.toFixed (2) + ')';
		g.beginPath (); g.arc (p.x, p.y, BR * (1 - i * 0.1), 0, 7); g.fill ();
	}
	const ang = Math.atan2 (b.vy, b.vx);
	let sx = 1, sy = 1;
	if (!b.stuck && motion ()) { sx = 1.15; sy = 0.87; }
	if (b.sq > 0 && motion ()) { sx = 0.75; sy = 1.3; }
	g.save (); g.translate (b.x, b.y); g.rotate (ang); g.scale (sx, sy);
	g.fillStyle = 'rgba(43,35,64,.25)'; g.beginPath (); g.arc (1, 3, BR, 0, 7); g.fill ();
	g.fillStyle = fire ? '#FF6A2B' : CREAM; g.beginPath (); g.arc (0, 0, BR, 0, 7); g.fill ();
	if (fire) { g.fillStyle = '#FFD23F'; g.beginPath (); g.arc (1, 0, BR * 0.5, 0, 7); g.fill (); }
	g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath (); g.arc (0, 0, BR, 0, 7); g.stroke ();
	g.restore ();
	// the eyes look where it goes
	g.save (); g.translate (b.x, b.y);
	const d = b.stuck ? -Math.PI / 2 + G.aim : ang, fx = Math.cos (d) * 2.5, fy = Math.sin (d) * 2.5, ox = -Math.sin (d) * 3, oy = Math.cos (d) * 3;
	g.fillStyle = OL; g.strokeStyle = OL; g.lineWidth = 1.4;
	for (const s of [-1, 1])
	{
		const ex = fx + ox * s, ey = fy + oy * s - 1;
		if (b.squint > 0) { g.beginPath (); g.moveTo (ex - 1.8 * s, ey - 1.8); g.lineTo (ex + 0.6 * s, ey); g.lineTo (ex - 1.8 * s, ey + 1.8); g.stroke (); }
		else { g.beginPath (); g.arc (ex, ey, 1.6, 0, 7); g.fill (); }
	}
	g.restore ();
}
function drawCapsule (c, t)
{
	const p = POWERS[c.k], w = 36, h = 18;
	g.save (); g.translate (c.x, c.y);
	if (motion ()) g.rotate (Math.sin (c.t * 6) * 0.12);
	toon (-w / 2, -h / 2, w, h, h / 2, p.col, 2.5);
	g.strokeStyle = p.good ? 'rgba(255,255,255,.8)' : OL; g.lineWidth = 1.5;
	if (!p.good) { g.setLineDash ([3, 3]); g.beginPath (); g.moveTo (-w / 2 + 6, h / 2 - 3); g.lineTo (w / 2 - 6, h / 2 - 3); g.stroke (); g.setLineDash ([]); }
	otext (p.txt, 0, 1, p.txt.length > 1 ? 11 : 12, '#fff', 3);
	g.restore ();
	void t;
}
function drawPuff (pf, t)
{
	const s = pf.pop ? 1 + (0.3 - pf.pop) * 3 : 1 + (pf.hurt > 0 ? Math.sin (pf.hurt * 25) * 0.08 : 0);
	g.save (); g.translate (pf.x, pf.y); g.scale (s, s);
	if (pf.pop) g.globalAlpha = Math.max (0, pf.pop / 0.3);
	const blobs = [[-14, 4, 13], [0, -6, 16], [15, 3, 13], [0, 8, 12]];
	g.fillStyle = 'rgba(43,35,64,.2)'; g.beginPath (); for (const [a, b, r] of blobs) { g.moveTo (a + r, b + 4); g.arc (a, b + 4, r, 0, 7); } g.fill ();
	g.strokeStyle = OL; g.lineWidth = 5; g.beginPath (); for (const [a, b, r] of blobs) { g.moveTo (a + r, b); g.arc (a, b, r, 0, 7); } g.stroke ();
	g.fillStyle = '#fff'; g.beginPath (); for (const [a, b, r] of blobs) { g.moveTo (a + r, b); g.arc (a, b, r, 0, 7); } g.fill ();
	g.fillStyle = OL;
	if (pf.hits) { g.strokeStyle = OL; g.lineWidth = 1.5; for (const e of [-6, 6]) { g.beginPath (); g.arc (e, -2, 3, 0, Math.PI * 1.6); g.stroke (); } }
	else { g.beginPath (); g.arc (-6, -2, 2.4, 0, 7); g.arc (6, -2, 2.4, 0, 7); g.fill (); }
	g.fillStyle = 'rgba(255,122,182,.6)'; g.beginPath (); g.arc (-12, 4, 3.5, 0, 7); g.arc (12, 4, 3.5, 0, 7); g.fill ();
	g.strokeStyle = OL; g.lineWidth = 1.6; g.beginPath (); g.arc (0, 3, 3, 0.2, Math.PI - 0.2); g.stroke ();
	g.restore ();
	void t;
}
function drawBurst (b)
{
	const k = 1 - b.life / b.max, tt = k * b.max;
	let s = tt < 0.15 ? (tt / 0.15) * 1.3 : tt < 0.25 ? 1.3 - (tt - 0.15) * 3 : 1;
	if (!motion ()) s = 1;
	const a = b.life < 0.2 ? b.life / 0.2 : 1;
	g.save (); g.globalAlpha = a; g.translate (b.x, b.y); g.rotate (b.rot); g.scale (s, s);
	g.font = '900 ' + b.size + 'px ' + FONT;
	const R = Math.max (b.size * 1.15, g.measureText (b.txt).width * 0.68);
	g.beginPath ();
	for (let i = 0; i < 24; i++) { const an = -Math.PI / 2 + i * Math.PI / 12, q = i % 2 ? R * 0.72 : R * (i % 4 ? 1 : 1.08); g.lineTo (Math.cos (an) * q, Math.sin (an) * q * 0.72); }
	g.closePath (); g.fillStyle = '#FFD23F'; g.fill (); g.lineWidth = 3; g.strokeStyle = OL; g.stroke ();
	otext (b.txt, 0, 1, b.size, '#FF3D3D', 4);
	g.restore ();
}
function drawHUD ()
{
	g.fillStyle = CREAM; g.fillRect (0, 0, W, HUDH);
	g.fillStyle = '#EFE6D4'; g.fillRect (0, HUDH - 6, W, 6);
	g.strokeStyle = OL; g.lineWidth = 3; g.beginPath (); g.moveTo (0, HUDH); g.lineTo (W, HUDH); g.stroke ();
	// the lives
	for (let i = 0; i < G.lives; i++)
	{
		g.fillStyle = '#FF5A5F'; heartPath (26 + i * 26, 31, 11); g.fill ();
		g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke ();
		g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath (); g.arc (21 + i * 26, 26, 2.5, 0, 7); g.fill ();
	}
	otext (String (G.score), W / 2, 31, 30, '#2F7F93', 5);
	const m = comboMult (G.combo);
	if (m > 1) otext ('x' + m, W / 2 + 12 + g.measureText (String (G.score)).width / 2 + 14, 33, 18, '#FF9F1C', 4);
	otext (tr ('lvl', { n: G.li + 1 }), W - 16 - PBW, 31, 20, OL, 0, 'right', 800);
	// the power-ups' timers: a shrinking ring
	let i = 0;
	for (const k of ['E', 'R', 'C', 'Z', 'S', 'F', 'B', 'W', 'D'])
	{
		if (!(G.fx[k] > 0)) continue;
		const x = 32 + i * 28, y = 87, p = POWERS[k];
		g.fillStyle = p.col; g.beginPath (); g.arc (x, y, 11, 0, 7); g.fill ();
		g.lineWidth = 2; g.strokeStyle = OL; g.stroke ();
		g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath (); g.arc (x, y, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.fx[k] / p.dur); g.stroke ();
		otext (p.txt, x, y + 1, p.txt.length > 1 ? 9 : 11, '#fff', 2.5);
		i++;
	}
}
function draw (t)
{
	if (!G) return;
	g.setTransform (1, 0, 0, 1, 0, 0);
	drawBackground (t);
	let sx = 0, sy = 0;
	if (G.shake > 0 && G.shakeA)
	{
		const k = G.shake / G.shakeD, a = G.shakeA * k * k;
		sx = (Math.random () - 0.5) * 2 * a; sy = (Math.random () - 0.5) * 2 * a;
	}
	g.setTransform (DPR * S, 0, 0, DPR * S, DPR * (OX + sx * S), DPR * (OY + sy * S));
	drawWalls ();
	g.lineJoin = 'round'; g.lineCap = 'round';
	for (const br of G.bricks) if (br.alive) drawBrick (br, t);
	if (G.puff) drawPuff (G.puff, t);
	for (const c of G.caps) drawCapsule (c, t);
	g.fillStyle = '#FF3D3D';
	for (const be of G.beams) { g.fillStyle = '#FFF6A8'; rr (be.x - 3, be.y - 12, 6, 16, 3); g.fill (); g.strokeStyle = '#FF3D3D'; g.lineWidth = 2; g.stroke (); }
	if (G.fx.W > 0)
	{
		const a = 0.65 + 0.3 * Math.sin (t * 6);
		g.globalAlpha = a; toon (WALL, SHIELDY, W - 2 * WALL, 8, 4, '#A66CFF', 2, true); g.globalAlpha = 1;
	}
	// the aim, while serving
	const sb = G.balls.find ((b) => b.serve);
	if (sb && G.phase === 'play')
	{
		g.fillStyle = 'rgba(255,255,255,.9)'; g.strokeStyle = OL; g.lineWidth = 1.5;
		for (let i = 1; i <= 5; i++) { const d = 16 + i * 16; g.beginPath (); g.arc (sb.x + Math.sin (G.aim) * d, sb.y - Math.cos (G.aim) * d, 3.2 - i * 0.3, 0, 7); g.fill (); g.stroke (); }
		if (!G.demo && G.serveT < 3.6 && Math.sin (t * 5) > -0.6) otext (tr (touchUI ? 'launchTap' : 'launchKey'), W / 2, PY - 104, 22, '#fff', 5);
	}
	drawPaddle (t);
	for (const b of G.balls) drawBall (b);
	for (const p of G.parts)
	{
		const a = Math.min (1, p.life / p.max * 1.5);
		g.globalAlpha = a;
		if (p.kind === 'ring') { const k = 1 - p.life / p.max; g.strokeStyle = p.col; g.lineWidth = 8 * (1 - k); g.beginPath (); g.arc (p.x, p.y, p.size * k, 0, 7); g.stroke (); }
		else if (p.kind === 's') { g.fillStyle = p.col; starPath (p.x, p.y, p.size, p.size * 0.45, 5, p.rot); g.fill (); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke (); }
		else if (p.kind === 'flame') { g.fillStyle = p.col; g.beginPath (); g.arc (p.x, p.y, p.size * (p.life / p.max), 0, 7); g.fill (); }
		else { g.save (); g.translate (p.x, p.y); g.rotate (p.rot); g.fillStyle = p.col; g.fillRect (-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore (); }
	}
	g.globalAlpha = 1;
	for (const tx of G.texts)
	{
		g.globalAlpha = Math.min (1, tx.life / tx.max * 3);
		otext (tx.txt, tx.x, tx.y, tx.size, tx.col, tx.size > 16 ? 5 : 3.5);
	}
	g.globalAlpha = 1;
	for (const b of G.bursts) drawBurst (b);
	g.setTransform (DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
	if (!G.demo) drawHUD ();
}

// ---- the screens ------------------------------------------------------------------------------------------------
function show (name)
{
	screen = name;
	document.querySelectorAll ('.screen').forEach ((s) => s.classList.toggle ('on', s.id === 'scr' + name[0].toUpperCase () + name.slice (1)));
	$('btPause').classList.toggle ('on', name === 'play');
	if (name === 'title') $('bestTitle').textContent = high ? tr ('best', { n: high }) : '';
	if (name === 'levels') buildLevels ();
	if (name === 'how') buildHow ();
	musicFor ();
	const s = document.querySelector ('.screen.on');
	const b = s && (s.querySelector ('.kbtn.big') || s.querySelector ('.tile.next') || s.querySelector ('.kbtn'));
	if (b && !touchUI) setTimeout (() => b.focus ({ preventScroll: true }), 30);
}
function startDemo ()
{
	newGame (Math.floor (Math.random () * 4), 'demo');
	paused = false;
}
function play (li, mode)
{
	Snd.init ();
	newGame (li, mode);
	paused = false;
	show ('play');
}
function pause (note)
{
	if (!playing () || G.phase === 'over' || G.phase === 'done') return;
	paused = true;
	$('pauseNote').textContent = note || '';
	show ('pause');
}
function resume () { if (screen !== 'pause') return; paused = false; show ('play'); }
function menu () { paused = false; startDemo (); show ('title'); }
function finish (won)
{
	musicFor ();
	if (won)
	{
		const r = G.result, last = G.li === NLEV - 1;
		$('clearTitle').textContent = tr (last && G.campaign ? 'allDone' : 'levelDone');
		$('clearName').textContent = tr ('level', { n: G.li + 1 }) + ' · ' + tr (LEVELS[G.li].name);
		const rows = [[tr ('bricksPts'), r.bonus.bricks], [tr ('clearBonus'), r.bonus.clear], [tr ('timeBonus', { n: r.bonus.left }), r.bonus.time], [tr ('noMiss'), r.bonus.miss]];
		$('clearTally').innerHTML = rows.map (([a, b]) => '<tr><td>' + a + '</td><td>' + (b ? '+' + b : '—') + '</td></tr>').join ('');
		$('clearScore').textContent = G.score;
		let rec = false;
		if (G.campaign && last && G.score > high) { high = G.score; store.set ('high', high); rec = true; }
		$('clearRecord').classList.toggle ('on', rec);
		$('btNext').textContent = tr (last ? 'menu' : 'next');
		const st = $('clearStars').children;
		for (let i = 0; i < 3; i++) { st[i].className = 'star' + (i === 1 ? ' mid' : ''); }
		show ('clear');
		for (let i = 0; i < 3; i++)
			setTimeout (() => { if (screen !== 'clear') return; if (i < r.stars) { st[i].classList.add ('on', 'pop'); Snd.play ('star'); } }, 350 + i * 220);
		say (tr ('levelDone') + ' ' + r.stars + ' ★');
	}
	else
	{
		Snd.play ('over');
		let rec = false;
		if (G.campaign && G.score > high) { high = G.score; store.set ('high', high); rec = true; }
		$('overName').textContent = tr ('level', { n: G.li + 1 }) + ' · ' + tr (LEVELS[G.li].name);
		$('overScore').textContent = G.score;
		$('overRecord').classList.toggle ('on', rec);
		$('overNote').textContent = G.campaign ? (high ? tr ('best', { n: high }) : '') : tr ('soloNote');
		show ('over');
		say (tr ('gameOver'));
	}
}
function say (s) { $('live').textContent = s; }
function buildLevels ()
{
	const box = $('levelGrid'); box.innerHTML = '';
	const lock = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="#7A8794" stroke="#2B2340" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#2B2340" stroke-width="2.4"/></svg>';
	for (let w = 0; w < 3; w++)
	{
		const sec = document.createElement ('div'); sec.className = 'world';
		sec.innerHTML = '<h3><i style="background:' + THEMES[w].wall + '"></i>' + tr ('w' + w) + '</h3>';
		const tiles = document.createElement ('div'); tiles.className = 'tiles';
		for (let i = w * 4; i < w * 4 + 4; i++)
		{
			const b = document.createElement ('button'); b.type = 'button';
			const open = i < prog.unlocked, st = prog.stars[i] || 0;
			b.className = 'tile' + (open ? '' : ' locked') + (open && i === prog.unlocked - 1 && !st ? ' next' : '');
			b.style.setProperty ('--c', COLORS[(i * 5) % 6]);
			const nm = tr (LEVELS[i].name);
			if (open)
			{
				b.innerHTML = '<b>' + (i + 1) + '</b><small>' + nm + '</small><span class="mini">' + [0, 1, 2].map ((k) => '<i class="star' + (k < st ? ' on' : '') + '"></i>').join ('') + '</span>';
				b.setAttribute ('aria-label', tr ('level', { n: i + 1 }) + ' — ' + nm + ' — ' + st + ' ★');
				b.addEventListener ('click', () => play (i, 'solo'));
			}
			else { b.innerHTML = '<b>' + (i + 1) + '</b>' + lock; b.disabled = true; b.setAttribute ('aria-label', tr ('level', { n: i + 1 }) + ' — ' + tr ('locked')); }
			tiles.appendChild (b);
		}
		sec.appendChild (tiles); box.appendChild (sec);
	}
}
function mini (draw)
{
	const c = document.createElement ('canvas'); c.width = 92; c.height = 56;
	const saved = g, gg = c.getContext ('2d'); gg.scale (2, 2); gg.lineJoin = 'round'; gg.lineCap = 'round';
	g = gg; try { draw (); } finally { g = saved; }
	return c;
}
function buildHow ()
{
	$('howText').textContent = tr (touchUI ? 'howTouch' : 'howMouse');
	const ub = $('legendBricks'), up = $('legendPowers'); ub.innerHTML = ''; up.innerHTML = '';
	const add = (ul, canvas, txt) => { const li = document.createElement ('li'), s = document.createElement ('span'); s.textContent = txt; li.append (canvas, s); ul.appendChild (li); };
	for (const [k, key] of [['n', 'kN'], ['T', 'kT'], ['U', 'kU'], ['M', 'kM'], ['X', 'kX'], ['G', 'kG'], ['S', 'kS'], ['m', 'km']])
		add (ub, mini (() => { drawBrick ({ k, c: 0, r: 0, x: 2, y: 3, col: 4, hp: KIND[k].hp === Infinity ? 1 : KIND[k].hp, max: KIND[k].hp, face: k === 'n', wob: 0, ph: 0 }, 0.2); }), tr (key));
	for (const k of Object.keys (POWERS))
		add (up, mini (() => { drawCapsule ({ x: 23, y: 14, k, t: 0 }, 0); }), tr ('p' + k));
}
function applyLang ()
{
	document.documentElement.lang = lang () ? 'fr' : 'en';
	document.querySelectorAll ('[data-k]').forEach ((el) => { el.textContent = tr (el.dataset.k); });
	document.querySelectorAll ('[data-kl]').forEach ((el) => { el.setAttribute ('aria-label', tr (el.dataset.kl)); el.title = tr (el.dataset.kl); });
	document.querySelectorAll ('.seg button').forEach ((b) => b.setAttribute ('aria-pressed', String ((b.dataset.lang === 'fr') === !!lang ())));
	if (screen === 'levels') buildLevels ();
	if (screen === 'how') buildHow ();
	if (screen === 'title') $('bestTitle').textContent = high ? tr ('best', { n: high }) : '';
}
function saveSettings ()
{
	for (const [id, k] of SETS) CFG[k] = $(id).checked;
	store.set ('settings', CFG);
	musicFor ();
}
const SETS = [['setSound', 'sound'], ['setMusic', 'music'], ['setReduced', 'reduced'], ['setBold', 'bold'], ['setPuffs', 'puffs'], ['setRelaxed', 'relaxed']];

// ---- input ------------------------------------------------------------------------------------------------------
const toField = (cx) => (cx - OX) / S;
document.addEventListener ('keydown', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	if (playing ())
	{
		if (k === 'ArrowLeft' || k === 'a' || k === 'q') { IN.kdir = -1; IN.kl = true; e.preventDefault (); return; }
		if (k === 'ArrowRight' || k === 'd') { IN.kdir = 1; IN.kr = true; e.preventDefault (); return; }
		if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'z') { e.preventDefault (); if (!e.repeat) action (); IN.held = true; return; }
		if (k === 'p' || k === 'Escape') { e.preventDefault (); pause (); return; }
	}
	if ((k === 'p' || k === 'Escape') && screen === 'pause') { e.preventDefault (); resume (); return; }
	if (k === 'Escape' && screen !== 'title' && screen !== 'play') { e.preventDefault (); back (); }
});
document.addEventListener ('keyup', (e) =>
{
	const k = e.key.length === 1 ? e.key.toLowerCase () : e.key;
	if (k === 'ArrowLeft' || k === 'a' || k === 'q') IN.kl = false;
	if (k === 'ArrowRight' || k === 'd') IN.kr = false;
	IN.kdir = IN.kl && !IN.kr ? -1 : IN.kr && !IN.kl ? 1 : IN.kl && IN.kr ? IN.kdir : 0;
	if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'z') IN.held = false;
});
function back ()
{
	if (screen === 'settings') { show (settingsFrom); return; }
	if (screen === 'pause') { resume (); return; }
	if (screen === 'over' || screen === 'clear') { menu (); return; }
	show ('title');
}
// the mouse steers directly; a finger steers by its slide (the paddle keeps its offset to the finger)
cv.addEventListener ('pointerdown', (e) =>
{
	Snd.init ();
	if (!playing ()) return;
	if (e.pointerType === 'mouse')
	{
		IN.mouseX = toField (e.clientX); IN.held = true;
		action ();
	}
	else
	{
		IN.touch = { id: e.pointerId, x0: toField (e.clientX), x: toField (e.clientX), px: G.paddle.x, t: performance.now (), moved: 0 };
		IN.held = true;
	}
	IN.mouseActive = e.pointerType === 'mouse';
	try { cv.setPointerCapture (e.pointerId); } catch (er) { /* fine */ }
});
cv.addEventListener ('pointermove', (e) =>
{
	if (e.pointerType === 'mouse') { if (playing ()) IN.mouseX = toField (e.clientX); return; }
	if (IN.touch && e.pointerId === IN.touch.id)
	{
		const x = toField (e.clientX);
		IN.touch.moved = Math.max (IN.touch.moved, Math.abs (x - IN.touch.x0) * S);
		IN.touch.x = x;
	}
});
function endPointer (e)
{
	if (e.pointerType === 'mouse') { IN.held = false; return; }
	if (IN.touch && e.pointerId === IN.touch.id)
	{
		const tap = performance.now () - IN.touch.t < 350 && IN.touch.moved < 14;
		IN.touch = null; IN.held = false;
		if (tap) action ();
	}
}
cv.addEventListener ('pointerup', endPointer);
cv.addEventListener ('pointercancel', endPointer);
cv.addEventListener ('contextmenu', (e) => e.preventDefault ());
document.addEventListener ('touchmove', (e) => { if (screen === 'play') e.preventDefault (); }, { passive: false });
// the gamepad: the stick or the cross steers, A launches / fires, Start pauses
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
		if (Math.abs (a) > 0.2) ax = a;
		if (bt (14)) ax = -1; if (bt (15)) ax = 1;
		if (bt (0)) b |= 1; if (bt (9)) b |= 2; if (bt (1)) b |= 4;
	}
	if (ax || IN.padSteer) { IN.kdir = ax; IN.padSteer = !!ax; IN.mouseX = null; }
	const pr = b & ~padPrev; padPrev = b;
	if (playing ()) { IN.held = IN.held || !!(b & 1); if (pr & 1) action (); if (pr & 2) pause (); return; }
	if (screen === 'pause' && (pr & 2)) { resume (); return; }
	if (pr & 1) { const s = document.querySelector ('.screen.on'), btn = s && (document.activeElement && s.contains (document.activeElement) ? document.activeElement : s.querySelector ('.kbtn.big')); if (btn) btn.click (); }
	if (pr & 4) back ();
}

// ---- the buttons ------------------------------------------------------------------------------------------------
document.addEventListener ('pointerdown', (e) => { if (e.target.closest && e.target.closest ('.kbtn, .tile, .seg button, .toggle')) Snd.init (); }, { passive: true });
document.addEventListener ('click', (e) => { if (e.target.closest && e.target.closest ('.kbtn, .tile, .seg button')) Snd.play ('tap'); });
$('btPlay').addEventListener ('click', () => play (0, 'campaign'));
$('btLevels').addEventListener ('click', () => show ('levels'));
$('btHow').addEventListener ('click', () => show ('how'));
$('btSettings').addEventListener ('click', () => { settingsFrom = 'title'; show ('settings'); });
$('btSettings2').addEventListener ('click', () => { settingsFrom = 'pause'; show ('settings'); });
$('btSetBack').addEventListener ('click', () => show (settingsFrom));
$('btPause').addEventListener ('click', () => pause ());
$('btResume').addEventListener ('click', resume);
$('btRestart').addEventListener ('click', () => { if (G.campaign) play (G.li, 'campaign'); else play (G.li, 'solo'); });
$('btRetry').addEventListener ('click', () => play (G.li, G.campaign ? 'campaign' : 'solo'));
$('btRetry2').addEventListener ('click', () => play (G.li, 'solo'));
$('btNext').addEventListener ('click', () =>
{
	if (G.li >= NLEV - 1) { menu (); return; }
	if (G.campaign) { startLevel (G.li + 1); show ('play'); }
	else play (G.li + 1, 'solo');
});
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
// test hooks (tools/test-briko.js): the state, the simulation advanced by hand
window.Briko = { get G () { return G; }, play, pause, resume, show, step: (n) => { for (let i = 0; i < n && G; i++) { if (G.hitstop > 0) G.hitstop = 0; if (G.phase === 'over' || G.phase === 'done') break; step (DT); } },
	draw: () => draw (performance.now () / 1000), layout, prog, LEVELS, get screen () { return screen; }, applyPower, destroy };

startDemo ();
layout ();
applyLang ();
if (Q.has ('level')) play (Math.max (0, Math.min (NLEV - 1, (+Q.get ('level') || 1) - 1)), 'solo');
requestAnimationFrame (loop);
}) ();
