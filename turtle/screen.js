// screen.js -- the free mode's computer: QBasic's screen in a canvas (Onyx's basscreen.h in the browser) -- the screen
// modes 0, 1, 2, 7 to 13, the VGA palette, the text in the code page 437 fonts (font.js), PSET, LINE (B, BF, styles),
// CIRCLE (arcs, ellipses, Onyx's F), PAINT, DRAW, POINT, PALETTE, GET / PUT sprites, DRAWTEXT --, the keyboard (INKEY$,
// INPUT, INPUT$, KEYDOWN), the mouse (MOUSEX / MOUSEY / MOUSEB, a finger too), the sound (BEEP, SOUND, PLAY and its
// "MB" background, NOTEON / NOTEOFF) and the turtle (its words draw on the screen); and the runner that drives
// basic.js's generator: time slices (the screen shown), SLEEP / PAUSE, the program waiting for a key or a line.
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function (global) {
'use strict';
const FONT = global.BASIC_FONT;
const b64 = (s) => Uint8Array.from (atob (s), (c) => c.charCodeAt (0));
const F8 = b64 (FONT.f8), F14 = b64 (FONT.f14), F16 = b64 (FONT.f16);
// A text typed or written in a program (Unicode) -> code page 437: its own characters (É, █, ║, ░...), else Latin-1's
const UNI437 = new Map (); for (let i = 0; i < 128; i++) UNI437.set (FONT.cp437[i], 128 + i);
const toCP = (s) => { let o = ''; for (const ch of s) { const c = ch.codePointAt (0); o += String.fromCharCode (c < 128 ? c : UNI437.get (ch) ?? (c < 256 ? FONT.latin1[c] : 63)); } return o; };

// QBasic's screen modes: size, the text cell's height, colours, the display scale (Onyx's)
const MODES = { 0: [640, 400, 16, 16, 1, 1], 1: [320, 200, 8, 4, 2, 2], 2: [640, 200, 8, 2, 1, 2], 7: [320, 200, 8, 16, 2, 2], 8: [640, 200, 8, 16, 1, 2],
	9: [640, 350, 14, 16, 1, 1], 10: [640, 350, 14, 4, 1, 1], 11: [640, 480, 16, 2, 1, 1], 12: [640, 480, 16, 16, 1, 1], 13: [320, 200, 8, 256, 2, 2] };
const EGA16 = [0x000000, 0x0000AA, 0x00AA00, 0x00AAAA, 0xAA0000, 0xAA00AA, 0xAA5500, 0xAAAAAA, 0x555555, 0x5555FF, 0x55FF55, 0x55FFFF, 0xFF5555, 0xFF55FF, 0xFFFF55, 0xFFFFFF];
function vgaPalette ()
{
	const p = new Array (256).fill (0);
	for (let i = 0; i < 16; i++) p[i] = EGA16[i];
	const grey = [0, 5, 8, 11, 14, 17, 20, 24, 28, 32, 36, 40, 45, 50, 56, 63];
	for (let i = 0; i < 16; i++) { const g = Math.floor (grey[i] * 255 / 63); p[16 + i] = (g << 16) | (g << 8) | g; }
	const grp = [[63, 0, 16, 31, 47], [63, 31, 39, 47, 55], [63, 45, 49, 54, 58], [28, 0, 7, 14, 21], [28, 14, 17, 21, 24], [28, 20, 22, 24, 26], [16, 0, 4, 8, 12], [16, 8, 10, 12, 14], [16, 11, 12, 13, 15]];
	for (let g = 0; g < 9; g++)
	{
		const [H, L, m1, m2, m3] = grp[g];
		const ring = [[L, L, H], [m1, L, H], [m2, L, H], [m3, L, H], [H, L, H], [H, L, m3], [H, L, m2], [H, L, m1], [H, L, L], [H, m1, L], [H, m2, L], [H, m3, L],
			[H, H, L], [m3, H, L], [m2, H, L], [m1, H, L], [L, H, L], [L, H, m1], [L, H, m2], [L, H, m3], [L, H, H], [L, m3, H], [L, m2, H], [L, m1, H]];
		for (let k = 0; k < 24; k++) p[32 + g * 24 + k] = (Math.floor (ring[k][0] * 255 / 63) << 16) | (Math.floor (ring[k][1] * 255 / 63) << 8) | Math.floor (ring[k][2] * 255 / 63);
	}
	return p;
}
const RGBF = 0x1000000;		// a pixel holding RGB () rather than a palette index

// ---- the screen ---------------------------------------------------------------------------------------------------------
class Screen
{
	constructor (canvas)
	{
		this.cv = canvas; this.g = canvas.getContext ('2d');
		this.setMode (0);
	}
	setMode (m)
	{
		const d = MODES[m];
		if (!d) throw new Basic.BasicError ('Illegal function call');
		this.mode = m; [this.W, this.H, this.cellH, this.ncol, this.sx, this.sy] = d;
		this.pal = vgaPalette ();
		if (this.ncol === 4 && m === 1) this.pal = [0x000000, 0x55FFFF, 0xFF55FF, 0xFFFFFF].concat (this.pal.slice (4));
		if (this.ncol === 2) this.pal = [0x000000, 0xFFFFFF].concat (this.pal.slice (2));
		if (m === 10) this.pal = [0x000000, 0x808080, 0xAAAAAA, 0xFFFFFF].concat (this.pal.slice (4));
		this.buf = new Int32Array (this.W * this.H);
		this.cols = this.W / 8; this.rows = Math.floor (this.H / this.cellH);
		this.fg = m === 0 ? 7 : this.ncol - 1 > 15 ? 15 : this.ncol - 1; this.bg = 0;
		this.crow = 0; this.ccol = 0; this.lx = this.W / 2; this.ly = this.H / 2;
		this.cv.width = this.W; this.cv.height = this.H;
		this.cv.style.aspectRatio = (this.W * this.sx) + ' / ' + (this.H * this.sy);
		this.img = this.g.createImageData (this.W, this.H);
		this.px32 = new Uint32Array (this.img.data.buffer);
		this.dirty = true; this.textUsed = false;
		if (this.onMode) this.onMode ();
	}
	// a colour number -> 0xRRGGBB
	rgb (c) { return c >= RGBF ? c & 0xFFFFFF : this.pal[(c >>> 0) % 256]; }
	norm (c, def)
	{
		if (c === null || c === undefined) return def;
		c = Math.round (c);
		if (c >= RGBF || c < 0) return c < 0 ? def : c;
		return this.ncol >= 256 ? c & 255 : c % this.ncol;
	}
	plot (x, y, c) { x = Math.round (x); y = Math.round (y); if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.buf[y * this.W + x] = c; }
	fillRect (x, y, w, h, c)
	{
		const x0 = Math.max (0, Math.round (x)), y0 = Math.max (0, Math.round (y)), x1 = Math.min (this.W, Math.round (x + w)), y1 = Math.min (this.H, Math.round (y + h));
		for (let j = y0; j < y1; j++) this.buf.fill (c, j * this.W + x0, j * this.W + x1);
	}
	render (overlay)
	{
		const lut = new Uint32Array (256);
		for (let i = 0; i < 256; i++) { const v = this.pal[i]; lut[i] = 0xFF000000 | ((v & 0xFF) << 16) | (v & 0xFF00) | ((v >> 16) & 0xFF); }
		const b = this.buf, o = this.px32;
		for (let i = 0; i < b.length; i++) { const c = b[i]; o[i] = c < RGBF ? lut[c & 255] : 0xFF000000 | ((c & 0xFF) << 16) | (c & 0xFF00) | ((c >> 16) & 0xFF); }
		this.g.putImageData (this.img, 0, 0);
		if (overlay) overlay (this.g);
		this.dirty = false;
	}
	// ---- text ----
	glyph (x, y, code, c, h)
	{
		h = h || (this.cellH <= 8 ? 8 : this.cellH <= 14 ? 14 : 16);
		const f = h === 8 ? F8 : h === 14 ? F14 : F16, base = code * h;
		for (let r = 0; r < h; r++)
		{
			const py = y + r; if (py < 0 || py >= this.H) continue;
			let bits = f[base + r];
			for (let i = 0; i < 8 && bits; i++, bits = (bits << 1) & 0xFF)
				if ((bits & 0x80) && x + i >= 0 && x + i < this.W) this.buf[py * this.W + x + i] = c;
		}
	}
	scroll ()
	{
		const fh = this.cellH, W = this.W;
		this.buf.copyWithin (0, fh * W, this.rows * fh * W);
		this.buf.fill (this.norm (this.bg, 0), (this.rows - 1) * fh * W, this.rows * fh * W);
	}
	newline () { this.ccol = 0; if (++this.crow >= this.rows) { this.scroll (); this.crow = this.rows - 1; } }
	putch (ch)
	{
		if (ch === '\n') { this.newline (); return; }
		if (ch === '\r') { this.ccol = 0; return; }
		if (ch === '\t') { do this.putch (' '); while (this.ccol % 8); return; }
		if (this.ccol >= this.cols) this.newline ();
		const x = this.ccol * 8, y = this.crow * this.cellH;
		this.fillRect (x, y, 8, this.cellH, this.norm (this.bg, 0));
		this.glyph (x, y, ch.charCodeAt (0) & 255, this.norm (this.fg, 7));
		this.ccol++;
	}
	print (s) { this.textUsed = true; for (const ch of s) this.putch (ch); this.dirty = true; }
	back ()
	{
		if (this.ccol === 0 && this.crow > 0) { this.crow--; this.ccol = this.cols; }
		if (this.ccol > 0) this.ccol--;
		this.fillRect (this.ccol * 8, this.crow * this.cellH, 8, this.cellH, this.norm (this.bg, 0));
		this.dirty = true;
	}
	cls () { this.buf.fill (this.norm (this.bg, 0)); this.crow = 0; this.ccol = 0; this.lx = this.W / 2; this.ly = this.H / 2; this.dirty = true; }
	// ---- graphics ----
	at (p) { if (!p) return [this.lx, this.ly]; return p.step ? [this.lx + p.x, this.ly + p.y] : [p.x, p.y]; }
	line (x0, y0, x1, y1, c, style)
	{
		x0 = Math.round (x0); y0 = Math.round (y0); x1 = Math.round (x1); y1 = Math.round (y1);
		const dx = Math.abs (x1 - x0), dy = -Math.abs (y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
		let e = dx + dy, bit = 0x8000, n = 0;
		for (;;)
		{
			if (style === null || style === undefined || (style & bit)) this.plot (x0, y0, c);
			bit = bit === 1 ? 0x8000 : bit >> 1;
			if (x0 === x1 && y0 === y1) break;
			if (++n > 20000) break;
			const e2 = 2 * e;
			if (e2 >= dy) { e += dy; x0 += sx; }
			if (e2 <= dx) { e += dx; y0 += sy; }
		}
	}
	circle (cx, cy, r, c, start, end, aspect, fill)
	{
		let xr = r, yr = r;
		if (aspect !== null && aspect !== undefined && aspect > 0) { if (aspect < 1) yr = r * aspect; else { yr = r; xr = r / aspect; } }
		const arc = start !== null && start !== undefined || end !== null && end !== undefined;
		if (!arc)
		{
			if (fill)
			{
				for (let y = -Math.round (yr); y <= Math.round (yr); y++) { const w = yr ? xr * Math.sqrt (Math.max (0, 1 - (y * y) / (yr * yr))) : xr; this.fillRect (cx - w, cy + y, 2 * w + 1, 1, c); }
				return;
			}
			const steps = Math.max (16, Math.ceil ((xr + yr) * 4));
			let px = cx + xr, py = cy;
			for (let i = 1; i <= steps; i++) { const a = i / steps * 2 * Math.PI, x = cx + xr * Math.cos (a), y = cy - yr * Math.sin (a); this.line (px, py, x, y, c); px = x; py = y; }
			return;
		}
		// an arc (negative angles: a radius drawn too), angles in radians, counter-clockwise from 3 o'clock
		let a0 = start ?? 0, a1 = end ?? 2 * Math.PI;
		const r0 = a0 < 0, r1 = a1 < 0; a0 = Math.abs (a0); a1 = Math.abs (a1);
		if (a1 < a0) a1 += 2 * Math.PI;
		const steps = Math.max (8, Math.ceil ((a1 - a0) * (xr + yr) * 2));
		let px = cx + xr * Math.cos (a0), py = cy - yr * Math.sin (a0);
		if (r0) this.line (cx, cy, px, py, c);
		for (let i = 1; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps, x = cx + xr * Math.cos (a), y = cy - yr * Math.sin (a); this.line (px, py, x, y, c); px = x; py = y; }
		if (r1) this.line (cx, cy, px, py, c);
	}
	paint (x, y, fc, bc)
	{
		x = Math.round (x); y = Math.round (y);
		if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
		const W = this.W, b = this.buf, stop = (i) => b[i] === bc || b[i] === fc;
		if (stop (y * W + x)) return;
		const st = [x, y];
		while (st.length)
		{
			const py = st.pop (), px = st.pop ();
			if (stop (py * W + px)) continue;
			let x0 = px, x1 = px;
			while (x0 > 0 && !stop (py * W + x0 - 1)) x0--;
			while (x1 < W - 1 && !stop (py * W + x1 + 1)) x1++;
			b.fill (fc, py * W + x0, py * W + x1 + 1);
			for (const ny of [py - 1, py + 1])
			{
				if (ny < 0 || ny >= this.H) continue;
				let inRun = false;
				for (let i = x0; i <= x1; i++) { const open = !stop (ny * W + i); if (open && !inRun) st.push (i, ny); inRun = open; }
			}
		}
	}
	point (x, y) { x = Math.round (x); y = Math.round (y); return x < 0 || y < 0 || x >= this.W || y >= this.H ? -1 : this.buf[y * this.W + x]; }
	// DRAW: U D L R E F G H n, M x,y (+/- relative), B (no line), N (back after), C colour, S scale, A / TA angle
	draw (cmd, c0)
	{
		const s = cmd.toUpperCase ().replace (/\s+/g, '');
		let i = 0, c = c0, scale = 4, ang = 0;
		const numb = () => { const m = /^[+-]?\d+(\.\d+)?/.exec (s.slice (i)); if (!m) return null; i += m[0].length; return parseFloat (m[0]); };
		while (i < s.length)
		{
			let blank = false, back = false;
			while (s[i] === 'B' || s[i] === 'N') { if (s[i] === 'B') blank = true; else back = true; i++; }
			const k = s[i++];
			if (k === ';') continue;
			const ox = this.lx, oy = this.ly;
			let dx = 0, dy = 0, mv = true;
			switch (k)
			{
			case 'U': dy = -(numb () ?? 1); break; case 'D': dy = numb () ?? 1; break;
			case 'L': dx = -(numb () ?? 1); break; case 'R': dx = numb () ?? 1; break;
			case 'E': { const n = numb () ?? 1; dx = n; dy = -n; break; } case 'F': { const n = numb () ?? 1; dx = n; dy = n; break; }
			case 'G': { const n = numb () ?? 1; dx = -n; dy = n; break; } case 'H': { const n = numb () ?? 1; dx = -n; dy = -n; break; }
			case 'M':
			{
				const rel = s[i] === '+' || s[i] === '-';
				const x = numb (); if (s[i] === ',') i++; const y = numb ();
				let tx, ty;
				if (rel) { const a = -ang * Math.PI / 180; tx = ox + (x * Math.cos (a) - y * Math.sin (a)) * scale / 4; ty = oy + (x * Math.sin (a) + y * Math.cos (a)) * scale / 4; }
				else { tx = x; ty = y; }
				if (!blank) this.line (ox, oy, tx, ty, c);
				if (!back) { this.lx = tx; this.ly = ty; }
				mv = false; break;
			}
			case 'C': c = this.norm (numb () ?? 0, c); mv = false; break;
			case 'S': scale = numb () ?? 4; mv = false; break;
			case 'A': ang = (numb () ?? 0) * 90; mv = false; break;
			case 'T': if (s[i] === 'A') { i++; ang = numb () ?? 0; } mv = false; break;
			case 'P': { const f = numb (); if (s[i] === ',') i++; const bc = numb (); this.paint (ox, oy, this.norm (f, c), this.norm (bc, c)); mv = false; break; }
			default: mv = false;
			}
			if (mv)
			{
				const a = -ang * Math.PI / 180, rx = (dx * Math.cos (a) - dy * Math.sin (a)) * scale / 4, ry = (dx * Math.sin (a) + dy * Math.cos (a)) * scale / 4;
				if (!blank) this.line (ox, oy, ox + rx, oy + ry, c);
				if (!back) { this.lx = ox + rx; this.ly = oy + ry; }
			}
		}
		return c;
	}
	get (x0, y0, x1, y1)
	{
		[x0, x1] = [Math.min (x0, x1), Math.max (x0, x1)]; [y0, y1] = [Math.min (y0, y1), Math.max (y0, y1)];
		const w = Math.round (x1 - x0) + 1, h = Math.round (y1 - y0) + 1, d = new Int32Array (w * h);
		for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = this.point (x0 + i, y0 + j); d[j * w + i] = v < 0 ? 0 : v; }
		return { w, h, d };
	}
	put (x, y, spr, mode)
	{
		x = Math.round (x); y = Math.round (y);
		for (let j = 0; j < spr.h; j++)
			for (let i = 0; i < spr.w; i++)
			{
				const px = x + i, py = y + j;
				if (px < 0 || py < 0 || px >= this.W || py >= this.H) continue;
				const k = py * this.W + px, s = spr.d[j * spr.w + i], d = this.buf[k];
				let v = s;
				if (s < RGBF && d < RGBF)
					switch (mode) { case 'XOR': v = d ^ s; break; case 'AND': v = d & s; break; case 'OR': v = d | s; break; case 'PRESET': v = (this.ncol - 1) & ~s; break; }
				this.buf[k] = v;
			}
	}
}

// ---- the sound ------------------------------------------------------------------------------------------------------------
class Sound
{
	constructor () { this.ac = null; this.end = 0; this.notes = []; this.voices = {}; this.tempo = 120; this.len = 4; this.oct = 4; this.art = 7 / 8; this.bg = false; this.vol = 1; }
	ctx ()
	{
		if (!this.ac) { const AC = global.AudioContext || global.webkitAudioContext; if (!AC) return null; this.ac = new AC (); this.master = this.ac.createGain (); this.master.gain.value = 0.12; this.master.connect (this.ac.destination); }
		if (this.ac.state === 'suspended') this.ac.resume ();
		return this.ac;
	}
	tone (f, at, dur, type = 'square', vol = 1)
	{
		const ac = this.ctx (); if (!ac || f <= 0 || f > 20000) return;
		const o = ac.createOscillator (), g = ac.createGain ();
		o.type = type; o.frequency.value = f;
		g.gain.setValueAtTime (vol, at); g.gain.setValueAtTime (vol, at + Math.max (0, dur - 0.01)); g.gain.linearRampToValueAtTime (0, at + dur);
		o.connect (g); g.connect (this.master); o.start (at); o.stop (at + dur + 0.02);
	}
	// the time the next note starts (after the ones queued)
	cursor () { const ac = this.ctx (); const now = ac ? ac.currentTime : 0; if (this.end < now) this.end = now + 0.02; return this.end; }
	// -> the ms to wait (the foreground's), 0 in the background
	beep () { const t = this.cursor (); this.tone (800, t, 0.25); this.end = t + 0.25; return 250; }
	sound (f, ticks)
	{
		const d = ticks / 18.2, t = this.cursor ();
		if (f >= 37 && f < 32767) this.tone (f, t, d);
		this.end = t + d;
		return Math.round (d * 1000);
	}
	play (mml)
	{
		const s = mml.toUpperCase (); let i = 0;
		const numb = () => { const m = /^\d+/.exec (s.slice (i)); if (!m) return null; i += m[0].length; return +m[0]; };
		let t = this.cursor (); const start = t;
		const note = (n, len, dots) =>
		{
			let d = (60 / this.tempo) * 4 / len;
			let k = 0.5; while (dots-- > 0) { d += d * k; k /= 2; }
			if (n > 0) { this.tone (440 * Math.pow (2, (n - 46) / 12), t, d * this.art, 'square', this.vol); this.notes.push (t + d); }
			t += d;
		};
		while (i < s.length)
		{
			const c = s[i++];
			if (c === ' ' || c === ';') continue;
			if ('ABCDEFG'.includes (c))
			{
				let n = { C: 1, D: 3, E: 5, F: 6, G: 8, A: 10, B: 12 }[c] + this.oct * 12;
				if (s[i] === '#' || s[i] === '+') { n++; i++; } else if (s[i] === '-') { n--; i++; }
				const l = numb () || this.len; let dots = 0; while (s[i] === '.') { dots++; i++; }
				note (n, l, dots); continue;
			}
			switch (c)
			{
			case 'O': this.oct = Math.min (6, Math.max (0, numb () ?? 4)); break;
			case '<': this.oct = Math.max (0, this.oct - 1); break;
			case '>': this.oct = Math.min (6, this.oct + 1); break;
			case 'L': this.len = numb () || 4; break;
			case 'T': this.tempo = Math.min (255, Math.max (32, numb () || 120)); break;
			case 'N': { const n = numb () ?? 0; let dots = 0; while (s[i] === '.') { dots++; i++; } note (n, this.len, dots); break; }
			case 'P': case 'R': { const l = numb () || this.len; let dots = 0; while (s[i] === '.') { dots++; i++; } note (0, l, dots); break; }
			case 'V': this.vol = Math.min (1, (numb () ?? 100) / 100); break;
			case 'M':
			{
				const m = s[i++];
				if (m === 'N') this.art = 7 / 8; else if (m === 'L') this.art = 1; else if (m === 'S') this.art = 3 / 4;
				else if (m === 'B') this.bg = true; else if (m === 'F') this.bg = false;
				break;
			}
			}
		}
		this.end = t;
		return this.bg ? 0 : Math.round ((t - start) * 1000);
	}
	queued () { const ac = this.ac; if (!ac) return 0; const now = ac.currentTime; this.notes = this.notes.filter ((e) => e > now); return this.notes.length; }
	noteOn (v, f, wave, vol)
	{
		const ac = this.ctx (); if (!ac) return;
		this.noteOff (v);
		const o = ac.createOscillator (), g = ac.createGain ();
		o.type = ['square', 'sine', 'triangle', 'sawtooth'][(wave | 0) & 3]; o.frequency.value = f;
		g.gain.value = vol === null || vol === undefined ? 0.8 : Math.max (0, Math.min (1, vol / 127));
		o.connect (g); g.connect (this.master); o.start ();
		this.voices[v] = o;
	}
	noteOff (v)
	{
		const off = (k) => { try { this.voices[k].stop (); } catch (e) { /* (stopped) */ } delete this.voices[k]; };
		if (v === null || v === undefined) Object.keys (this.voices).forEach (off); else if (this.voices[v]) off (v);
	}
	stop () { this.noteOff (); this.notes = []; this.end = 0; if (this.ac) { this.master.disconnect (); this.master = this.ac.createGain (); this.master.gain.value = 0.12; this.master.connect (this.ac.destination); } this.bg = false; this.tempo = 120; this.len = 4; this.oct = 4; this.art = 7 / 8; }
}

// ---- the keys: INKEY$'s codes, KEYDOWN's names -----------------------------------------------------------------------
const EXT = { ArrowUp: 'H', ArrowDown: 'P', ArrowLeft: 'K', ArrowRight: 'M', Home: 'G', End: 'O', PageUp: 'I', PageDown: 'Q', Insert: 'R', Delete: 'S',
	F1: ';', F2: '<', F3: '=', F4: '>', F5: '?', F6: '@', F7: 'A', F8: 'B', F9: 'C', F10: 'D' };
function keyCode (e)
{
	if (EXT[e.key]) return '\0' + EXT[e.key];
	if (e.key === 'Enter') return '\r';
	if (e.key === 'Backspace') return '\b';
	if (e.key === 'Escape') return '\x1b';
	if (e.key === 'Tab') return '\t';
	if (e.key.length === 1)
	{
		if (e.ctrlKey && /[a-z]/i.test (e.key)) return String.fromCharCode (e.key.toUpperCase ().charCodeAt (0) - 64);
		return toCP (e.key);
	}
	return null;
}
function keyName (e)
{
	const N = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ' ': 'SPACE', Enter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BACKSPACE',
		Shift: 'SHIFT', Control: 'CTRL', Alt: 'ALT', Home: 'HOME', End: 'END', PageUp: 'PGUP', PageDown: 'PGDN', Delete: 'DEL', Insert: 'INS' };
	return N[e.key] || (e.key.length === 1 ? e.key.toUpperCase () : e.key.toUpperCase ());
}

// ---- the computer: a program run on the screen ------------------------------------------------------------------------
class Computer
{
	constructor (canvas, opts)
	{
		this.screen = new Screen (canvas);
		this.sound = new Sound ();
		this.opts = opts || {};
		this.keys = []; this.held = new Set (); this.mouse = { x: 0, y: 0, b: 0 };
		this.gen = null; this.wait = null; this.timer = 0; this.raf = 0;
		this.turtle = null;
		this.cv = canvas;
		const pos = (e) => { const r = canvas.getBoundingClientRect (); this.mouse.x = Math.floor ((e.clientX - r.left) * this.screen.W / r.width); this.mouse.y = Math.floor ((e.clientY - r.top) * this.screen.H / r.height); };
		canvas.addEventListener ('pointerdown', (e) => { pos (e); this.mouse.b |= e.button === 2 ? 2 : 1; canvas.focus ({ preventScroll: true }); if (this.wait && this.wait.wait === 'line' && this.opts.onNeedKeyboard) this.opts.onNeedKeyboard (); });
		canvas.addEventListener ('pointermove', (e) => { pos (e); if (e.pointerType !== 'mouse' && e.buttons) this.mouse.b |= 1; });
		const up = (e) => { this.mouse.b &= e.button === 2 ? ~2 : ~1; };
		canvas.addEventListener ('pointerup', up); canvas.addEventListener ('pointercancel', up);
		canvas.addEventListener ('contextmenu', (e) => { if (this.running ()) e.preventDefault (); });
	}
	running () { return !!this.gen; }
	// a key from the page (the screen focused, a hidden field on a phone, the on-screen pad)
	keyDown (e)
	{
		if (!this.running ()) return false;
		this.held.add (keyName (e));
		const k = keyCode (e);
		if (k === null) return false;
		if (this.wait && this.wait.wait === 'line') { this.lineKey (k); return true; }
		this.keys.push (k);
		if (this.keys.length > 64) this.keys.shift ();
		if (this.wait && (this.wait.wait === 'key' || (this.wait.wait === 'sleep' && !this.wait.noKey))) this.resume ();
		else if (this.wait && this.wait.wait === 'chars' && this.keys.length >= this.wait.n) this.resume (this.keys.splice (0, this.wait.n).join (''));
		return true;
	}
	keyUp (e) { this.held.delete (keyName (e)); }
	typeText (text) { for (const ch of text) this.keyDown ({ key: ch }); }
	// INPUT: the line typed, shown at the cursor
	lineKey (k)
	{
		const w = this.wait, sc = this.screen;
		if (k === '\r') { sc.print ('\n'); const ans = w.buf; w.buf = ''; this.resume (ans); return; }
		if (k === '\b') { if (w.buf.length) { w.buf = w.buf.slice (0, -1); sc.back (); } return; }
		if (k.length === 1 && k.charCodeAt (0) >= 32) { w.buf += k; sc.print (k); }
	}
	start (prog, dialect)
	{
		this.stop ();
		this.screen.setMode (0);
		this.screen.cls ();
		this.sound.ctx ();
		this.keys = []; this.held.clear ();
		this.turtle = null;
		this.t0 = performance.now ();
		this.statements = 0; this.sliceStart = performance.now ();
		this.gen = Basic.start (prog, this.host (), dialect);
		this.step ();
	}
	stop (msg)
	{
		if (this.gen) { try { this.gen.return (); } catch (e) { /* (ended) */ } }
		this.gen = null; this.wait = null;
		clearTimeout (this.timer); cancelAnimationFrame (this.raf);
		this.sound.stop ();
		this.show ();
		if (msg !== undefined && this.opts.onEnd) this.opts.onEnd (msg);
	}
	show () { this.screen.render ((g) => this.drawOverlay (g)); }
	resume (value) { if (!this.gen) return; this.wait = null; clearTimeout (this.timer); this.step (value); }
	step (value)
	{
		if (!this.gen) return;
		this.sliceStart = performance.now ();
		let r;
		try { r = this.gen.next (value); }
		catch (e)
		{
			this.gen = null; this.wait = null; this.show (); this.sound.noteOff ();
			if (this.opts.onEnd) this.opts.onEnd (e);
			return;
		}
		if (r.done) { this.gen = null; this.show (); if (this.opts.onEnd) this.opts.onEnd (null); return; }
		const w = r.value;
		this.show ();
		switch (w.wait)
		{
		case 'slice': this.raf = requestAnimationFrame (() => this.step ()); break;
		case 'sleep': this.wait = w; this.timer = setTimeout (() => this.resume (), Math.max (0, w.ms)); break;
		case 'key': this.wait = w; break;
		case 'chars': this.wait = w; if (this.keys.length >= w.n) this.resume (this.keys.splice (0, w.n).join ('')); break;
		case 'line': this.wait = Object.assign ({ buf: '' }, w); if (this.opts.onNeedKeyboard) this.opts.onNeedKeyboard (); this.blink (); break;
		}
	}
	blink ()
	{
		if (!this.wait || this.wait.wait !== 'line') return;
		this.show ();
		this.timer = setTimeout (() => this.blink (), 500);
	}
	drawOverlay (g)
	{
		const sc = this.screen;
		if (this.wait && this.wait.wait === 'line' && Math.floor (performance.now () / 500) % 2 === 0)
		{
			g.fillStyle = '#' + sc.rgb (sc.norm (sc.fg, 7)).toString (16).padStart (6, '0');
			g.fillRect (Math.min (sc.ccol, sc.cols - 1) * 8, sc.crow * sc.cellH + sc.cellH - 2, 8, 2);
		}
		if (this.turtle && this.turtle.shown)
		{
			const t = this.turtle, a = t.h * Math.PI / 180, s = Math.max (6, sc.W / 64);
			g.save (); g.translate (t.x, t.y); g.rotate (a);
			g.fillStyle = '#6FB86A'; for (const [lx, ly] of [[-s * .6, -s * .5], [s * .6, -s * .5], [-s * .6, s * .5], [s * .6, s * .5]]) { g.beginPath (); g.arc (lx, ly, s * .22, 0, 7); g.fill (); }
			g.beginPath (); g.arc (0, -s * .85, s * .28, 0, 7); g.fill ();
			g.fillStyle = '#2F7A35'; g.beginPath (); g.arc (0, 0, s * .6, 0, 7); g.fill ();
			g.fillStyle = '#4FA052'; g.beginPath (); g.arc (0, 0, s * .45, 0, 7); g.fill ();
			g.restore ();
		}
	}
	// ---- the host basic.js calls ----
	host ()
	{
		const sc = this.screen, me = this, E = (m) => new Basic.BasicError (m);
		const col = (c, def) => sc.norm (c, def);
		return {
			onStatement ()
			{
				if (++me.statements % 512) return true;
				return performance.now () - me.sliceStart > 24 ? 'yield' : true;
			},
			print (t) { sc.print (t); },
			ext (name, a) { return me.turtleWord (name, a); },
			fn (name, a)
			{
				switch (name)
				{
				case 'INKEY$': return me.keys.length ? me.keys.shift () : '';
				case 'INPUT$':
				{
					const n = Math.max (1, Math.round (a[0]));
					if (me.keys.length >= n) return me.keys.splice (0, n).join ('');
					return { wait: 'chars', n, then: true };
				}
				case 'POINT':
					if (a.length === 1) { const k = Math.round (a[0]); return k === 0 ? sc.lx : k === 1 ? sc.ly : k === 2 ? sc.lx : k === 3 ? sc.ly : 0; }
					return sc.point (a[0], a[1]);
				case 'CSRLIN': return sc.crow + 1;
				case 'POS': return sc.ccol + 1;
				case 'KEYDOWN':
				{
					const k = String (a[0]).toUpperCase ();
					if (k.length === 2 && k[0] === '\0') { const n = Object.keys (EXT).find ((x) => EXT[x] === a[0][1]); return me.held.has ({ ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' }[n] || n) ? -1 : 0; }
					const alias = { ESCAPE: 'ESC', RETURN: 'ENTER', ' ': 'SPACE', '\r': 'ENTER', '\x1b': 'ESC' };
					return me.held.has (alias[k] || k) ? -1 : 0;
				}
				case 'MOUSEX': return me.mouse.x;
				case 'MOUSEY': return me.mouse.y;
				case 'MOUSEB': return me.mouse.b;
				case 'PLAY': return me.sound.queued ();
				case 'RGB': return RGBF | ((Math.max (0, Math.min (255, a[0] | 0)) << 16) | (Math.max (0, Math.min (255, a[1] | 0)) << 8) | Math.max (0, Math.min (255, a[2] | 0)));
				case 'TICKS': return Math.floor (performance.now () - me.t0);
				}
				throw E (name + ' is not available here');
			},
			gfx (op, a)
			{
				switch (op)
				{
				case 'CLS': sc.cls (); return;
				case 'WAIT':	// WAIT &H3DA, 8: the VGA's vertical retrace -- the next of 70 frames a second; anything else: no wait
					if (Math.round (a[0]) === 0x3DA && (a[2] === null || a[2] === undefined)) { const f = 1000 / 70; return { wait: 'sleep', ms: f - (performance.now () % f), noKey: true }; }
					return;
				case 'SCREEN': if (a[0] !== null && a[0] !== undefined) { const m = Math.round (a[0]); if (m !== sc.mode) { sc.setMode (m); sc.cls (); if (me.turtle) me.turtleHome (); } } return;
				case 'WIDTH': return;
				case 'COLOR':
					if (a[0] !== null && a[0] !== undefined) sc.fg = Math.round (a[0]);
					if (a[1] !== null && a[1] !== undefined) sc.bg = Math.round (a[1]);
					return;
				case 'LOCATE':
					if (a[0] !== null && a[0] !== undefined) { const r = Math.round (a[0]); if (r < 1 || r > sc.rows) throw E ('Illegal function call'); sc.crow = r - 1; }
					if (a[1] !== null && a[1] !== undefined) { const c = Math.round (a[1]); if (c < 1 || c > sc.cols) throw E ('Illegal function call'); sc.ccol = c - 1; }
					return;
				case 'PSET': case 'PRESET':
				{
					const [x, y] = sc.at (a.p);
					sc.plot (x, y, col (a.c, op === 'PSET' ? sc.fg : sc.bg));
					sc.lx = x; sc.ly = y; sc.dirty = true; return;
				}
				case 'LINE':
				{
					const [x0, y0] = sc.at (a.a), b = a.b.step ? [x0 + a.b.x, y0 + a.b.y] : [a.b.x, a.b.y];
					const c = col (a.c, sc.fg);
					if (a.box === 'BF') sc.fillRect (Math.min (x0, b[0]), Math.min (y0, b[1]), Math.abs (b[0] - x0) + 1, Math.abs (b[1] - y0) + 1, c);
					else if (a.box === 'B') { sc.line (x0, y0, b[0], y0, c, a.style); sc.line (b[0], y0, b[0], b[1], c, a.style); sc.line (b[0], b[1], x0, b[1], c, a.style); sc.line (x0, b[1], x0, y0, c, a.style); }
					else sc.line (x0, y0, b[0], b[1], c, a.style);
					sc.lx = b[0]; sc.ly = b[1]; sc.dirty = true; return;
				}
				case 'CIRCLE':
				{
					const [x, y] = sc.at (a.p);
					sc.circle (x, y, a.r, col (a.c, sc.fg), a.start, a.end, a.aspect, a.fill);
					sc.lx = x; sc.ly = y; sc.dirty = true; return;
				}
				case 'PAINT':
				{
					const [x, y] = sc.at (a.p), c = col (typeof a.c === 'number' ? a.c : null, sc.fg);
					sc.paint (x, y, c, col (a.border, c));
					sc.lx = x; sc.ly = y; sc.dirty = true; return;
				}
				case 'DRAW': sc.draw (String (a[0]), col (sc.fg, 15)); sc.dirty = true; return;
				case 'PALETTE':
					if (a[0] === null || a[0] === undefined) { sc.pal = vgaPalette (); sc.dirty = true; return; }
					{
						let v = Math.round (a[1]);
						// QBasic's PALETTE colour: an EGA code 0-63 (rgbRGB) in the text and EGA modes; &H00BBGGRR (0-63 a
						// channel) in the VGA ones; or Onyx's RGB ()
						if (v >= RGBF) v &= 0xFFFFFF;
						else if ([0, 7, 8, 9, 10].includes (sc.mode) && v < 64)
							v = ((((v >> 2) & 1) * 0xAA + ((v >> 5) & 1) * 0x55) << 16) | ((((v >> 1) & 1) * 0xAA + ((v >> 4) & 1) * 0x55) << 8) | ((v & 1) * 0xAA + ((v >> 3) & 1) * 0x55);
						else v = (((v & 63) * 255 / 63) << 16) | ((((v >> 8) & 63) * 255 / 63) << 8) | (((v >> 16) & 63) * 255 / 63);
						sc.pal[Math.round (a[0]) & 255] = v; sc.dirty = true;
					}
					return;
				case 'GET': { const p0 = sc.at (a.a), p1 = a.b.step ? [p0[0] + a.b.x, p0[1] + a.b.y] : [a.b.x, a.b.y]; return sc.get (p0[0], p0[1], p1[0], p1[1]); }
				case 'PUT': { const [x, y] = sc.at (a.p); sc.put (x, y, a.spr, a.mode); sc.dirty = true; return; }
				case 'DRAWTEXT':
				{
					const x = Math.round (a[0]), y = Math.round (a[1]), s = String (a[2]), c = col (a[3], sc.fg);
					for (let i = 0; i < s.length; i++) sc.glyph (x + i * 8, y, s.charCodeAt (i) & 255, c, 16);
					sc.dirty = true; return;
				}
				case 'SLEEP': { const n = a[0]; if (n === null || n === undefined || n <= 0) return { wait: 'key' }; return { wait: 'sleep', ms: n * 1000 }; }
				case 'PAUSE': return { wait: 'sleep', ms: Math.max (0, a[0] || 0), noKey: true };
				case 'BEEP': return { wait: 'sleep', ms: me.sound.beep (), noKey: true };
				case 'SOUND': { const ms = me.sound.sound (a[0], a[1]); return ms ? { wait: 'sleep', ms, noKey: true } : undefined; }
				case 'PLAY': { const ms = me.sound.play (String (a[0])); return ms ? { wait: 'sleep', ms, noKey: true } : undefined; }
				case 'NOTEON': me.sound.noteOn (Math.round (a[0]), a[1], a[2], a[3]); return;
				case 'NOTEOFF': me.sound.noteOff (a.length && a[0] !== null ? Math.round (a[0]) : null); return;
				case 'FULLSCREEN': if (me.opts.onFullscreen) me.opts.onFullscreen (a.length ? a[0] !== 0 : true); return;
				}
				throw E (op + ' is not available here');
			} };
	}
	// ---- the turtle's words: Logo on the screen (FORWARD n pixels; its pen the COLOR) ----
	turtleHome () { const sc = this.screen; this.turtle = { x: sc.W / 2, y: sc.H / 2, h: 0, pen: true, shown: true }; }
	turtleWord (name, a)
	{
		if (!this.turtle) this.turtleHome ();
		const t = this.turtle, sc = this.screen, n = a.length ? a[0] : null;
		switch (name)
		{
		case 'FORWARD': case 'BACK':
		{
			const d = (n === null ? 10 : n) * (name === 'BACK' ? -1 : 1), r = t.h * Math.PI / 180;
			const x = t.x + Math.sin (r) * d, y = t.y - Math.cos (r) * d;
			if (t.pen) sc.line (t.x, t.y, x, y, sc.norm (sc.fg, 15));
			t.x = x; t.y = y; sc.dirty = true; return;
		}
		case 'LEFT': t.h = ((t.h - (n === null ? 90 : n)) % 360 + 360) % 360; sc.dirty = true; return;
		case 'RIGHT': t.h = ((t.h + (n === null ? 90 : n)) % 360 + 360) % 360; sc.dirty = true; return;
		case 'PENUP': t.pen = false; return;
		case 'PENDOWN': t.pen = true; return;
		case 'HEADING': return t.h;
		}
		throw new Basic.BasicError (name + ' is not available here');
	}
}

// The free mode's dialect: QBasic's labels and line numbers, strings in code page 437, the turtle's moving words
const FREE_WORDS = {
	FORWARD: { kind: 's', min: 0, max: 1 }, BACK: { kind: 's', min: 0, max: 1 }, LEFT: { kind: 's', min: 0, max: 1 }, RIGHT: { kind: 's', min: 0, max: 1 },
	PENUP: { kind: 's', min: 0, max: 0 }, PENDOWN: { kind: 's', min: 0, max: 0 }, HEADING: { kind: 'n', min: 0, max: 0 } };
const FREE_ALIASES = { AVANCER: 'FORWARD', AVANCE: 'FORWARD', RECULER: 'BACK', RECULE: 'BACK', GAUCHE: 'LEFT', DROITE: 'RIGHT',
	LEVERCRAYON: 'PENUP', LEVECRAYON: 'PENUP', BAISSERCRAYON: 'PENDOWN', BAISSECRAYON: 'PENDOWN', CAP: 'HEADING', COULEUR: 'COLOR' };
const FREE_DIALECT = { qbasic: true, words: FREE_WORDS, aliases: FREE_ALIASES, mapStr: toCP };

global.BasicScreen = { Screen, Sound, Computer, FREE_DIALECT, toCP };
}) (window);
