// app.js -- Circuits in the browser (Onyx's user/Apps/circuits/main.cpp, board.h, views.h): the levels (opened one after
// the other), the level's card, the palette, the board -- gates placed, moved and wired with the mouse or a finger, the
// signals live (green at 1, dark at 0) --, the truth table (a row sets the switches), Step (depth by depth), Check and
// its stars, the lesson cards. The progress (stars, each level's board, the levels open) is kept in the browser.
//
// Keys: Ctrl+Enter Check, F8 Step, F9 Reset, Shift+F8 Live; 1-6 a gate, Del delete, Ctrl+Z / Ctrl+Y, the arrows move
// the gate selected, Esc cancels / deselects; H the hint, L the lesson.
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';
const $ = (id) => document.getElementById (id);
const t = (en, fr) => Site.t (en, fr);
const C = window.Circuits;
const { E, L0, L1, LX, P_SWITCH, P_LAMP, P_NOT, P_AND, P_OR, P_XOR, P_NAND, P_NOR, BOARD_W, BOARD_H, GATE_MINX, GATE_MAXX } = C;
const STORE = 'codeisfun.circuits';

// ---- the progress ---------------------------------------------------------------------------------------------------------
const P = Object.assign ({ stars: {}, circuit: {}, seen: {}, open: [], pack: 0, level: '', tip: false }, Site.store.get (STORE, {}));
const save = () => Site.store.set (STORE, P);

// ---- the packs ------------------------------------------------------------------------------------------------------------
const packs = [];
for (const p of window.CIRCUITS_PACKS || [])
{
	try { packs.push (Object.assign (C.parsePack (p.text), { opened: false, name: p.name })); }
	catch (e) { console.error (p.name, e.message); }
}
if (!P.open.length && packs.length) P.open.push (packs[0].levels[0].id);
const isOpen = (p, l) => packs[p].opened || P.open.includes (packs[p].levels[l].id);
function nextOf (p, l) { if (l + 1 < packs[p].levels.length) return [p, l + 1]; for (let q = p + 1; q < packs.length; q++) if (packs[q].levels.length) return [q, 0]; return null; }
function prevOf (p, l) { if (l > 0) return [p, l - 1]; for (let q = p - 1; q >= 0; q--) if (packs[q].levels.length) return [q, packs[q].levels.length - 1]; return null; }

// ---- the words --------------------------------------------------------------------------------------------------------------
const GATE_WORD = { [P_NOT]: ['NOT', 'NON'], [P_AND]: ['AND', 'ET'], [P_OR]: ['OR', 'OU'], [P_XOR]: ['XOR', 'OUX'], [P_NAND]: ['NAND', 'NON-ET'], [P_NOR]: ['NOR', 'NON-OU'] };
const gateWord = (ty) => GATE_WORD[ty] ? GATE_WORD[ty][Site.L] : '';
const gatesWord = (n) => n === 1 ? t ('gate', 'porte') : t ('gates', 'portes');
function errWord (e)
{
	switch (e)
	{
	case E.OVERLAP: return t ('No room there: parts cannot overlap.', 'Pas de place ici : les pièces ne peuvent pas se chevaucher.');
	case E.OUTSIDE: return t ('Gates go between the inputs and the outputs.', 'Les portes se posent entre les entrées et les sorties.');
	case E.FULL: return t ('The board is full: 48 gates at most.', 'Le plateau est plein : 48 portes au plus.');
	case E.LOOP: return t ('That wire would make a loop: in this game signals only go forward.', 'Ce fil ferait une boucle : dans ce jeu, les signaux vont seulement vers l\'avant.');
	case E.NOT_ALLOWED: return t ('This gate is not allowed in this level.', 'Cette porte n\'est pas permise dans ce niveau.');
	}
	return t ('A wire goes from an output to an input.', 'Un fil va d\'une sortie vers une entrée.');
}

// ---- the state ----------------------------------------------------------------------------------------------------------------
let pk = 0, lv = 0, L = null, c = null, hist = new C.History (), ev = null;
let row = 0, step = -1, sel = -1, selDst = -1, selPin = 0, errPart = -1, checked = false, res = null, armed = -1, showHint = false;

// ---- the message bar ------------------------------------------------------------------------------------------------------
function message (kind, text, stars)
{
	Site.message ($('msg'), kind, text, stars);
	if (kind === 'ok')
	{
		const n = nextOf (pk, lv);
		if (n && isOpen (n[0], n[1]))
		{
			const b = document.createElement ('button');
			b.type = 'button'; b.className = 'btn primary small'; b.textContent = t ('Next level', 'Niveau suivant');
			b.addEventListener ('click', doNext);
			$('msg').appendChild (b);
		}
	}
}
function prompt ()
{
	if (!L) return;
	if (pk === 0 && lv === 0 && !P.stars[L.id]) message ('info', t ('Welcome to Circuits! Wire the switch A to the lamp, then Check.', 'Bienvenue dans Circuits ! Relie l\'interrupteur A à la lampe, puis Vérifier.'));
	else message ('info', t ('Every lamp follows the switches. When you think it is right: Check.', 'Les lampes suivent les interrupteurs. Quand tu crois que c\'est juste : Vérifier.'));
}
function stepMessage ()
{
	const m = ev.maxDepth;
	if (step >= m) message ('info', t ('Step %d of %m: every lamp is computed. Reset: back to the start · Step again: live.', 'Pas %d sur %m : toutes les lampes sont calculées. Au départ : retour au début · Pas à pas : en direct.').replace ('%d', step).replace ('%m', m));
	else if (step === 0) message ('info', t ('Step 0 of %m: no gate is computed yet. Step: the first depth.', 'Pas 0 sur %m : aucune porte n\'est encore calculée. Pas à pas : la première profondeur.').replace ('%m', m));
	else message ('info', t ('Step %d of %m: the gates of depth %d are computed. Step: the next depth.', 'Pas %d sur %m : les portes de profondeur %d sont calculées. Pas à pas : la suivante.').replace (/%d/g, step).replace ('%m', m));
}

// ---- the level list -------------------------------------------------------------------------------------------------------------
function renderList ()
{
	let html = '', all = 0, got = 0;
	packs.forEach ((p, i) =>
	{
		const s = p.levels.reduce ((a, l) => a + (P.stars[l.id] | 0), 0);
		got += s; all += 3 * p.levels.length;
		html += '<li class="group"><span>' + Site.esc (p.title[Site.L] || p.title[0]) + '</span><span class="stars">★ ' + s + '/' + 3 * p.levels.length + '</span></li>';
		p.levels.forEach ((l, j) =>
		{
			const open = isOpen (i, j), st = P.stars[l.id] | 0, cur = i === pk && j === lv;
			html += '<li><button type="button" class="lv" data-p="' + i + '" data-l="' + j + '"' + (cur ? ' aria-current="true"' : '') + (open ? '' : ' aria-disabled="true"') + '>' +
				(open ? '<span class="num' + (st ? ' won' : '') + '">' + (j + 1) + '</span>' : '<span class="lock" aria-label="' + t ('locked', 'verrouillé') + '">🔒</span>') +
				'<span class="t">' + Site.esc (l.title[Site.L] || l.title[0]) + '</span>' + (open ? Site.starsHtml (st) : '') + '</button></li>';
		});
	});
	$('levelList').innerHTML = html;
	document.querySelector ('.pack-stars').textContent = '★ ' + got + '/' + all;
}
$('levelList').addEventListener ('click', (e) =>
{
	const b = e.target.closest ('.lv'); if (!b) return;
	const p = +b.dataset.p, l = +b.dataset.l;
	if (isOpen (p, l)) { if (p !== pk || l !== lv) showLevel (p, l); Site.openLevels (false); return; }
	const pr = prevOf (p, l);
	message ('info', pr ? t ('Locked: win “%s” first.', 'Verrouillé : réussis d\'abord « %s ».').replace ('%s', packs[pr[0]].levels[pr[1]].title[Site.L] || packs[pr[0]].levels[pr[1]].title[0]) : t ('This level is locked.', 'Ce niveau est verrouillé.'));
	Site.openLevels (false);
});
document.querySelector ('.open-pack').addEventListener ('click', () => $('packFile').click ());
$('packFile').addEventListener ('change', async () =>
{
	const f = $('packFile').files[0]; if (!f) return;
	try
	{
		const p = Object.assign (C.parsePack (await f.text ()), { opened: true, name: f.name });
		for (const l of p.levels) if (packs.some ((q) => q.levels.some ((x) => x.id === l.id))) throw new Error ('a level "' + l.id + '" is already loaded');
		if (!p.title[0]) p.title[0] = f.name.replace (/\.circuits$/i, '');
		packs.push (p); showLevel (packs.length - 1, 0);
	}
	catch (err) { alert (t ('“%s” cannot be opened:\n%e.\n\nNo level was added.', '« %s » ne peut pas être ouvert :\n%e.\n\nAucun niveau n\'a été ajouté.').replace ('%s', f.name).replace ('%e', err.message)); }
	$('packFile').value = '';
});

// ---- the card --------------------------------------------------------------------------------------------------------------
function renderCard ()
{
	if (!L) return;
	$('lvTitle').textContent = (pk + 1) + '.' + (lv + 1) + '  ' + (L.title[Site.L] || L.title[0]);
	$('lvText').textContent = L.text[Site.L] || L.text[0];
	$('lvHint').textContent = t ('Hint: ', 'Indice : ') + (L.hint[Site.L] || L.hint[0]);
	$('lvHint').hidden = !showHint;
	$('btHint').setAttribute ('aria-pressed', String (showHint));
	$('btLesson').disabled = !window.CIRCUITS_LESSONS[L.topic];
	requestAnimationFrame (() => { const p = $('lvText'); $('lvMore').hidden = !$('card').classList.contains ('compact') || p.scrollHeight <= p.clientHeight + 2; });
}
$('lvMore').addEventListener ('click', () => { $('card').classList.remove ('compact'); $('lvMore').hidden = true; });
function doHint () { showHint = !showHint; if (showHint) $('card').classList.remove ('compact'); renderCard (); }
$('btHint').addEventListener ('click', doHint);

// ---- the palette -------------------------------------------------------------------------------------------------------------
function gateSvg (ty, w = 34, h = 24)
{
	const L0x = 7, R0 = 28, T = 4, B = 20, rb = 2.4;
	const pts = outline (ty, L0x, T, R0, B, rb);
	let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">';
	const cy = 12;
	s += ty === P_NOT ? '<path d="M1 ' + cy + 'H' + (L0x + 1) + '"/>' : '<path d="M1 8H' + (L0x + 3) + 'M1 16H' + (L0x + 3) + '"/>';
	s += '<path d="M' + (R0 - 1) + ' ' + cy + 'H' + w + '"/>';
	s += '<path fill="var(--surface)" d="M' + pts.map ((p) => p[0].toFixed (2) + ' ' + p[1].toFixed (2)).join ('L') + 'Z"/>';
	if (ty === P_XOR) { const b = qbez ([], L0x, B, L0x + (R0 - L0x) * 0.24, cy, L0x, T, 8, false); s += '<path d="M' + b.map ((p) => p[0].toFixed (2) + ' ' + p[1].toFixed (2)).join ('L') + '"/>'; }
	if (ty === P_NOT || ty === P_NAND || ty === P_NOR) s += '<circle fill="var(--surface)" cx="' + (R0 - rb) + '" cy="' + cy + '" r="' + rb + '"/>';
	return s + '</g></svg>';
}
function renderPalette ()
{
	if (!L) return;
	let html = '<button type="button" class="tool sel" data-t="-1" aria-pressed="' + (armed < 0) + '"><svg viewBox="0 0 34 24" aria-hidden="true"><path d="M13 3v15l4-4 3 6 2-1-3-6h5z" fill="currentColor"/></svg>' + t ('Select', 'Choisir') + '</button>';
	let k = 0;
	for (let ty = P_NOT; ty <= P_NOR; ty++)
		if (L.parts & (1 << ty))
		{
			k++;
			const tip = t ('Put a gate: %s (%d)', 'Poser une porte : %s (%d)').replace ('%s', gateWord (ty)).replace ('%d', k);
			html += '<button type="button" class="tool" data-t="' + ty + '" aria-pressed="' + (armed === ty) + '" title="' + tip + '" aria-label="' + tip + '">' + gateSvg (ty) + Site.esc (gateWord (ty)) + '</button>';
		}
	$('tools').innerHTML = html;
	$('noGate').hidden = k > 0;
	$('btDel').disabled = sel < 0 && selDst < 0;
	$('btUndo').disabled = !hist.canUndo ();
	$('btRedo').disabled = !hist.canRedo ();
}
$('tools').addEventListener ('click', (e) =>
{
	const b = e.target.closest ('.tool'); if (!b) return;
	const ty = +b.dataset.t;
	arm (ty < 0 || armed === ty ? -1 : ty);
});
function arm (ty)
{
	armed = ty;
	if (ty >= 0) { sel = -1; selDst = -1; message ('info', t ('%s: tap a free place on the board to put it (Esc: cancel).', '%s : touche une place libre du plateau pour la poser (Échap : annuler).').replace ('%s', gateWord (ty))); }
	else if ($('msg').classList.contains ('info')) prompt ();
	renderPalette (); draw ();
}

// ---- the truth table, the count ----------------------------------------------------------------------------------------------
function renderTable ()
{
	if (!L) return;
	const ni = L.ninputs, no = L.noutputs, rows = 1 << ni;
	let h = '<thead><tr><th colspan="' + ni + '">' + (ni > 1 ? t ('IN', 'ENTRÉES') : t ('IN', 'ENTRÉE')) + '</th><th class="sep" colspan="' + no + '">' + t ('GOAL', 'BUT') + '</th>' +
		(checked ? '<th class="sep" colspan="' + no + '">' + t ('YOURS', 'OBTENU') + '</th>' : '') + '<th></th></tr><tr>';
	for (const n of L.inName) h += '<th>' + n + '</th>';
	L.outName.forEach ((n, k) => { h += '<th' + (k ? '' : ' class="sep"') + '>' + n + '</th>'; });
	if (checked) L.outName.forEach ((n, k) => { h += '<th' + (k ? '' : ' class="sep"') + '>' + n + '</th>'; });
	h += '<th></th></tr></thead><tbody>';
	for (let r = 0; r < rows; r++)
	{
		const wrong = checked && ((res.wrong >> r) & 1);
		h += '<tr data-r="' + r + '" class="' + (r === row ? 'cur ' : '') + (wrong ? 'wrong' : '') + '" tabindex="0">';
		for (let k = 0; k < ni; k++) { const b = (r >> (ni - 1 - k)) & 1; h += '<td class="' + (b ? 'one' : '') + '">' + b + '</td>'; }
		for (let k = 0; k < no; k++) { const b = (L.want[k] >> r) & 1; h += '<td class="out ' + (b ? 'one ' : '') + (k ? '' : 'sep') + '">' + b + '</td>'; }
		if (checked) for (let k = 0; k < no; k++) { const b = (res.got[k] >> r) & 1, w = (L.want[k] >> r) & 1; h += '<td class="out ' + (b ? 'one ' : '') + (b !== w ? 'bad ' : '') + (k ? '' : 'sep') + '">' + b + '</td>'; }
		h += '<td class="mark ' + (checked ? (wrong ? 'no' : 'ok') : r === row ? 'at' : '') + '">' + (checked ? (wrong ? '✕' : '✓') : r === row ? '◂' : '') + '</td></tr>';
	}
	$('table').innerHTML = h + '</tbody>';
}
$('table').addEventListener ('click', (e) => { const tr = e.target.closest ('tbody tr'); if (tr) setRow (+tr.dataset.r); });
$('table').addEventListener ('keydown', (e) => { const tr = e.target.closest ('tbody tr'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault (); setRow (+tr.dataset.r); } });
function renderCount ()
{
	if (!L) return;
	const n = c.gates ();
	let h = '<span class="big' + (n <= L.par3 ? ' good' : '') + '">' + n + '</span><span>' + gatesWord (n) + '</span>' +
		'<span class="par"><span class="st">★★★</span> ≤ ' + L.par3 + '</span><span class="par"><span class="st">★★</span> ≤ ' + L.par2 + '</span>';
	if (n) h += '<span class="depth">' + t ('Depth %d · Step to watch it', 'Profondeur %d · Pas à pas pour la voir').replace ('%d', ev.maxDepth) + '</span>';
	$('count').innerHTML = h;
	$('mode').textContent = step >= 0 ? t ('Step %d of %m · Shift+F8: back to live', 'Pas %d sur %m · Maj+F8 : en direct').replace ('%d', step).replace ('%m', ev.maxDepth) : t ('Live: tap a switch or a row.', 'En direct : touche un interrupteur ou une ligne.');
	$('mode').className = 'mode' + (step >= 0 ? ' step' : '');
	$('btStep').setAttribute ('aria-pressed', String (step >= 0));
	$('btReset').disabled = step < 0;
}

// ---- refresh, edits ------------------------------------------------------------------------------------------------------------
function refresh ()
{
	if (!L) return;
	ev = C.evaluate (c, row, step >= 0 ? step : -1);
	renderPalette (); renderTable (); renderCount (); draw ();
}
let saveT = 0;
function saveBoard () { clearTimeout (saveT); saveT = 0; if (L) { P.circuit[L.id] = C.writeText (c); save (); } }
function afterEdit (push)
{
	if (step >= 0) { step = -1; prompt (); }
	checked = false; errPart = -1;
	if (push) hist.push (c);
	if (sel >= c.n || (sel >= 0 && !C.isGate (c.p[sel].type))) sel = -1;
	if (selDst >= 0 && (selDst >= c.n || c.p[selDst].in[selPin] < 0)) selDst = -1;
	clearTimeout (saveT); saveT = setTimeout (saveBoard, 800);
	const m = $('msg');
	if (m.classList.contains ('err') || m.classList.contains ('ok')) prompt ();
	refresh ();
}
const boardChanged = () => afterEdit (true);
function selectGate (i) { sel = i; selDst = -1; renderPalette (); draw (); }
function selectWire (d, p) { selDst = d; selPin = p; sel = -1; renderPalette (); draw (); }
function setRow (r) { row = r; if (step >= 0) { step = 0; refresh (); stepMessage (); return; } refresh (); }
function toggleSwitch (k) { setRow (row ^ (1 << (c.ni - 1 - k))); }

// ---- the board: drawing ----------------------------------------------------------------------------------------------------------
const cv = $('board'), g = cv.getContext ('2d');
let cell = 12, ox = 0, oy = 0, cw = 0, ch = 0;
const X = (gx) => ox + gx * cell, Y = (gy) => oy + gy * cell;
const Z = (v) => v * cell / 12;					// px at a 12 px cell -> px at this one
const WIRE_1 = '#21A346', WIRE_0 = '#334A5E', WIRE_X = '#A9B3BC', WIRE_OPEN = '#808A94', GATE_INK = '#2B3440', ACCENT = '#2F7F93', ERR_RED = '#D0342C', OK_GREEN = '#3E9B4F';
function layoutBoard ()
{
	const area = $('boardArea'), aw = area.clientWidth;
	const desk = matchMedia ('(min-width: 900px)').matches && !matchMedia ('(orientation: landscape) and (max-height: 500px)').matches;
	const ah = desk ? area.clientHeight - ($('rotateTip').hidden ? 0 : 44) : Infinity;
	cell = Math.max (6, Math.floor (Math.min ((aw - 4) / BOARD_W, (ah - 4) / BOARD_H, 30) * 4) / 4);
	cw = Math.round (cell * BOARD_W + 4); ch = Math.round (cell * BOARD_H + 4);
	const dpr = window.devicePixelRatio || 1;
	cv.width = Math.round (cw * dpr); cv.height = Math.round (ch * dpr);
	cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
	g.setTransform (dpr, 0, 0, dpr, 0, 0);
	ox = 2; oy = 2;
	draw ();
}
new ResizeObserver (() => layoutBoard ()).observe ($('boardArea'));
function qbez (out, x0, y0, x1, y1, x2, y2, steps, skipFirst)
{
	for (let i = skipFirst ? 1 : 0; i <= steps; i++)
	{
		const u = i / steps, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
		out.push ([a * x0 + b * x1 + d * x2, a * y0 + b * y1 + d * y2]);
	}
	return out;
}
// A gate's body (Onyx's gates.h): in the box (Lx, T)-(R, B), the bubble's radius rb
function outline (ty, Lx, T, R, B, rb)
{
	const cy = (T + B) / 2, h2 = (B - T) / 2, bub = ty === P_NOT || ty === P_NAND || ty === P_NOR, Rb = bub ? R - 2 * rb : R;
	if (ty === P_NOT) return [[Lx, cy - h2 * 0.78], [Rb, cy], [Lx, cy + h2 * 0.78]];
	if (ty === P_AND || ty === P_NAND)
	{
		const r = h2, cx = Rb - r, pts = [[Lx, T]];
		for (let a = -90; a <= 90; a += 10) pts.push ([cx + r * Math.cos (a * Math.PI / 180), cy + r * Math.sin (a * Math.PI / 180)]);
		pts.push ([Lx, B]);
		return pts;
	}
	const l = ty === P_XOR ? Lx + (R - Lx) * 0.12 : Lx, pts = [];
	qbez (pts, l, T, l + (Rb - l) * 0.58, T, Rb, cy, 10, false);
	qbez (pts, Rb, cy, l + (Rb - l) * 0.58, B, l, B, 10, true);
	qbez (pts, l, B, l + (Rb - l) * 0.26, cy, l, T, 8, true);
	pts.pop ();
	return pts;
}
function seg (x0, y0, x1, y1, col, w, alpha = 1, dash = null)
{
	g.globalAlpha = alpha; g.beginPath (); g.moveTo (x0, y0); g.lineTo (x1, y1); g.lineWidth = w; g.strokeStyle = col; g.lineCap = dash ? 'butt' : 'round';
	g.setLineDash (dash || []); g.stroke (); g.setLineDash ([]); g.globalAlpha = 1;
}
function dot (x, y, r, col, alpha = 1) { g.globalAlpha = alpha; g.beginPath (); g.arc (x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill (); g.globalAlpha = 1; }
function ringAt (x, y, r0, r1, col, alpha = 1) { g.globalAlpha = alpha; g.beginPath (); g.arc (x, y, (r0 + r1) / 2, 0, Math.PI * 2); g.lineWidth = r1 - r0; g.strokeStyle = col; g.stroke (); g.globalAlpha = 1; }
function rbox (x, y, w, h, r, fill, stroke, lw = 1)
{
	g.beginPath (); g.roundRect ? g.roundRect (x, y, w, h, r) : g.rect (x, y, w, h);
	if (fill) { g.fillStyle = fill; g.fill (); }
	if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke (); }
}
const levelCol = (i) => { const v = ev.v[i]; return v === LX ? WIRE_X : v ? WIRE_1 : WIRE_0; };
const levelW = (col) => Z (col === WIRE_1 ? 3 : col === WIRE_X ? 2 : 2.5);
function font (px, bold) { return (bold ? '700 ' : '600 ') + Math.max (7, Math.round (px)) + 'px ' + getComputedStyle (document.body).fontFamily; }
function text (s, x, y, px, col, align = 'center', bold = false) { g.font = font (px, bold); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText (s, x, y); }
function drawWire (r)
{
	const col = levelCol (r.src), sel2 = r.dst === selDst && r.pin === selPin;
	const pts = r.pts.map (([x, y]) => [X (x), Y (y)]);
	const path = () => { g.beginPath (); pts.forEach (([x, y], i) => i ? g.lineTo (x, y) : g.moveTo (x, y)); };
	if (sel2) { path (); g.lineWidth = Z (8); g.lineJoin = 'round'; g.strokeStyle = ACCENT; g.globalAlpha = 0.35; g.stroke (); g.globalAlpha = 1; }
	path (); g.lineWidth = levelW (col); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = col;
	if (col === WIRE_X) g.setLineDash ([Math.max (3, cell * 0.45), Math.max (2, cell * 0.3)]);
	g.stroke (); g.setLineDash ([]);
}
function pinDot (gx, gy, col) { dot (X (gx), Y (gy), Z (2.5), col); }
function drawGate (i, ty, gx, gy, ok)
{
	const ghost = i < 0, q = ghost ? null : c.p[i], n = ty === P_NOT ? 1 : 2, alpha = ghost ? 0.8 : 1;
	for (let k = 0; k < n; k++)
	{
		const y = ty === P_NOT ? gy + 2 : gy + (k ? 3 : 1), s = ghost ? -1 : q.in[k], col = s >= 0 ? levelCol (s) : WIRE_OPEN;
		seg (X (gx), Y (y), X (gx + 2), Y (y), col, Z (s >= 0 && col === WIRE_1 ? 3 : 2), ghost ? 0.5 : 1);
	}
	const oc = ghost ? WIRE_OPEN : levelCol (i);
	seg (X (gx + 3.5), Y (gy + 2), X (gx + 5), Y (gy + 2), oc, Z (!ghost && oc === WIRE_1 ? 3 : 2), ghost ? 0.5 : 1);
	if (!ghost && (i === sel || i === hoverGate))
	{
		const x0 = X (gx + 9 / 16), y0 = Y (gy + 3 / 16), x1 = X (gx + 76 / 16), y1 = Y (gy + 61 / 16);
		if (i === sel) rbox (x0, y0, x1 - x0, y1 - y0, Z (6), 'rgba(47,127,147,.18)');
		g.globalAlpha = i === sel ? 1 : 0.35; rbox (x0, y0, x1 - x0, y1 - y0, Z (6), null, ACCENT, 1.2); g.globalAlpha = 1;
	}
	const Lx = X (gx + 1), R = X (gx + 66 / 16), cy = Y (gy + 2), h2 = cell * 1.45, rb = cell * 0.3;
	const face = ghost ? (ok ? '#E6F4EA' : '#FBE0DC') : ev.v[i] === LX ? '#F0F2F4' : ev.v[i] ? '#E3F5E7' : '#FFFFFF';
	const ink = ghost ? (ok ? OK_GREEN : ERR_RED) : i === errPart ? ERR_RED : GATE_INK;
	const pts = outline (ty, Lx, cy - h2, R, cy + h2, rb);
	g.globalAlpha = alpha;
	g.beginPath (); pts.forEach (([x, y], k) => k ? g.lineTo (x, y) : g.moveTo (x, y)); g.closePath ();
	g.fillStyle = face; g.fill (); g.lineWidth = Z (1.6); g.lineJoin = 'round'; g.strokeStyle = ink; g.stroke ();
	if (ty === P_XOR) { const b = qbez ([], Lx, cy + h2, Lx + (R - Lx) * 0.24, cy, Lx, cy - h2, 8, false); g.beginPath (); b.forEach (([x, y], k) => k ? g.lineTo (x, y) : g.moveTo (x, y)); g.stroke (); }
	if (ty === P_NOT || ty === P_NAND || ty === P_NOR) { g.beginPath (); g.arc (R - rb, cy, rb - Z (0.5), 0, Math.PI * 2); g.fillStyle = face; g.fill (); g.stroke (); }
	g.globalAlpha = 1;
	const tx = ty === P_NOT ? 18 : ty === P_XOR || ty === P_OR || ty === P_NOR ? 30 : 22, tw = ty === P_NOT ? 26 : ty === P_AND || ty === P_NAND ? 34 : 32;
	const nm = gateWord (ty);
	let fs = Z (10); g.font = font (fs); if (g.measureText (nm).width > Z (tw + 6)) fs = Z (8.5);
	text (nm, X (gx + (tx + tw / 2) / 16), cy + 0.5, fs, ghost ? ink : '#4A5560');
	if (step >= 0 && !ghost)
	{
		const bx = X (gx + 2.5), by = Y (gy) - Z (2), br = Z (7);
		dot (bx, by, br, ev.v[i] === LX ? '#B5BDC4' : ACCENT);
		text (String (ev.depth[i]), bx, by + 0.5, Z (10), '#FFFFFF', 'center', true);
	}
	for (let k = 0; k < n; k++) pinDot (gx, ty === P_NOT ? gy + 2 : gy + (k ? 3 : 1), ghost ? WIRE_OPEN : '#5A6570');
	pinDot (gx + 5, gy + 2, oc);
}
function drawSwitch (i)
{
	const q = c.p[i], on = ev.v[i] === L1;
	const kx = X (q.x + 38 / 16), ky = Y (q.y + 1 / 16), ks = Y (q.y + 31 / 16) - ky, kw = X (q.x + 72 / 16) - kx;
	seg (X (q.x + 69 / 16), Y (q.y + 1), X (q.x + 5), Y (q.y + 1), on ? WIRE_1 : WIRE_0, Z (on ? 3 : 2.5));
	text (q.name, kx - Z (5), ky + ks / 2, Z (13), GATE_INK, 'right', true);
	if (on) rbox (kx, ky, kw, ks, Z (5), WIRE_1, '#178036', 1);
	else rbox (kx, ky, kw, ks, Z (5), '#F7F4EE', '#B9B2A4', 1);
	text (on ? '1' : '0', kx + kw / 2, ky + ks / 2 + 0.5, Z (13), on ? '#FFFFFF' : '#2B2A26', 'center', true);
	pinDot (q.x + 5, q.y + 1, on ? WIRE_1 : WIRE_0);
}
function drawLamp (i)
{
	const q = c.p[i], s = q.in[0], col = s >= 0 ? levelCol (s) : WIRE_OPEN;
	seg (X (q.x), Y (q.y + 1), X (q.x + 1), Y (q.y + 1), col, Z (s >= 0 && col === WIRE_1 ? 3 : 2));
	const cx = X (q.x + 28 / 16), cy = Y (q.y + 1), r = cell * 0.9 + 1;
	const unknown = ev.v[i] === LX, on = !unknown && ev.v[i] === L1 && s >= 0;
	if (i === errPart) ringAt (cx, cy, r + Z (3), r + Z (6), ERR_RED);
	if (on) { dot (cx, cy, r + Z (7), '#FFD23F', 0.2); dot (cx, cy, r + Z (3), '#FFD23F', 0.35); }
	dot (cx, cy, r, on ? '#C99A12' : unknown ? '#9AA3AB' : '#403B30');
	dot (cx, cy, r - Z (2), on ? '#FFD23F' : unknown ? '#C3CAD0' : '#5B5648');
	dot (cx - r / 3, cy - r / 3, r / 3, '#FFFFFF', on ? 0.67 : 0.24);
	if (unknown) text ('?', cx, cy + 0.5, Z (13), '#FFFFFF', 'center', true);
	text (q.name, cx + r + Z (6), cy, Z (13), GATE_INK, 'left', true);
	pinDot (q.x, q.y + 1, col);
}
function drawHint ()
{
	const first = L.parts === 0;
	const msg = first ? t ('Press on the switch\'s pin, drag to the lamp\'s pin, let go.', 'Appuie sur la borne de l\'interrupteur, glisse jusqu\'à celle de la lampe, lâche.')
		: t ('Take a gate from the palette and put it on the board, then drag from a pin to a pin to wire it.', 'Prends une porte dans la palette, pose-la sur le plateau, puis glisse d\'une borne à une autre pour la relier.');
	const bx = X (9), by = Y (6), bw = X (31) - bx, fs = Math.max (11, Z (13));
	g.font = font (fs);
	const words = msg.split (' '), lines = [];
	let cur = '';
	for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText (tr).width > bw - 24 && cur) { lines.push (cur); cur = w; } else cur = tr; }
	lines.push (cur);
	const lh = fs * 1.35, bh = fs * 2.6 + lines.length * lh + 10;
	g.globalAlpha = 0.75; rbox (bx, by, bw, bh, 10, '#FFFFFF'); g.globalAlpha = 1;
	g.setLineDash ([5, 5]); rbox (bx, by, bw, bh, 10, null, '#9DB0A4', 1); g.setLineDash ([]);
	text (first ? t ('Lay a wire', 'Pose un fil') : t ('Build your circuit', 'Construis ton circuit'), bx + bw / 2, by + fs * 1.3, fs * 1.2, '#405048', 'center', true);
	lines.forEach ((l, k) => text (l, bx + bw / 2, by + fs * 2.6 + k * lh + lh / 2, fs, '#5A6A60'));
}
function draw ()
{
	if (!L || !ev || !cw) return;
	g.clearRect (0, 0, cw, ch);
	rbox (0, 0, cw, ch, 10, '#EEF3EF');
	g.save (); g.beginPath (); g.roundRect ? g.roundRect (0, 0, cw, ch, 10) : g.rect (0, 0, cw, ch); g.clip ();
	g.fillStyle = '#E2EAE4'; g.fillRect (0, 0, X (GATE_MINX), ch); g.fillRect (X (GATE_MAXX), 0, cw - X (GATE_MAXX), ch);
	g.restore ();
	g.fillStyle = '#C9D4CC';
	if (cell >= 7) for (let gy = 0; gy <= BOARD_H; gy++) for (let gx = GATE_MINX + 1; gx < GATE_MAXX; gx++) g.fillRect (X (gx) - 0.5, Y (gy) - 0.5, 1.5, 1);
	text (t ('INPUTS', 'ENTRÉES'), X (GATE_MINX) / 2, Z (10), Math.max (8, Z (10)), '#8A968E', 'center', true);
	text (t ('OUTPUTS', 'SORTIES'), (X (GATE_MAXX) + cw) / 2, Z (10), Math.max (8, Z (10)), '#8A968E', 'center', true);
	rbox (0.5, 0.5, cw - 1, ch - 1, 10, null, '#C6CEC8', 1);
	const routes = c.routes ();
	for (const r of routes) if (!(r.dst === selDst && r.pin === selPin)) drawWire (r);
	for (const r of routes) if (r.dst === selDst && r.pin === selPin) drawWire (r);
	for (const [x, y, src] of c.junctions (routes)) dot (X (x), Y (y), Z (3.5), levelCol (src));
	for (let i = 0; i < c.n; i++)
	{
		const q = c.p[i];
		if (q.type === P_SWITCH) drawSwitch (i);
		else if (q.type === P_LAMP) drawLamp (i);
		else if (!(drag === 'move' && i === mv.i)) drawGate (i, q.type, q.x, q.y, true);
	}
	if (c.gates () === 0 && c.wires () === 0 && !drag && armed < 0) drawHint ();
	if (drag === 'move') { drawGate (mv.i, c.p[mv.i].type, mv.x, mv.y, true); drawGate (-1, c.p[mv.i].type, mv.x, mv.y, c.placeErr (c.p[mv.i].type, mv.x, mv.y, mv.i) === E.OK); }
	else if (armed >= 0 && pointer.inside) { const [gx, gy] = ghostCell (); drawGate (-1, armed, gx, gy, c.placeErr (armed, gx, gy) === E.OK); }
	if (drag === 'wire') drawRubber ();
	else if (hoverOut >= 0 && armed < 0) { const [x, y] = c.pinOut (hoverOut); ringAt (X (x), Y (y), Z (4), Z (6), ACCENT, 0.45); }
	cv.setAttribute ('aria-label', t ('The board: %g gates, %w wires.', 'Le plateau : %g portes, %w fils.').replace ('%g', c.gates ()).replace ('%w', c.wires ()));
}
function drawRubber ()
{
	const [x0, y0] = c.pinOut (wire.src);
	const sx = X (x0), sy = Y (y0);
	let ex = pointer.x, ey = pointer.y, t16 = (pointer.x - ox) / cell;
	if (wire.tgt >= 0) { const [tx, ty] = c.pinIn (wire.tgt, wire.tpin); ex = X (tx); ey = Y (ty); t16 = tx; }
	const xm = t16 > x0 + 1 ? X (Math.floor ((x0 + t16) / 2)) : X (x0 + 1);
	const dash = [Math.max (4, cell * 0.45), Math.max (3, cell * 0.3)];
	seg (sx, sy, xm, sy, ACCENT, Z (2.5), 1, dash); seg (xm, sy, xm, ey, ACCENT, Z (2.5), 1, dash); seg (xm, ey, ex, ey, ACCENT, Z (2.5), 1, dash);
	if (wire.tgt >= 0) ringAt (ex, ey, Math.max (Z (5), 5), Math.max (Z (7), 8), wire.ok ? OK_GREEN : ERR_RED);
	ringAt (sx, sy, Math.max (Z (4), 4), Math.max (Z (6), 7), ACCENT);
}

// ---- the board: the pointer (a mouse or a finger) ------------------------------------------------------------------------------------
let drag = null, hoverGate = -1, hoverOut = -1;
const pointer = { x: -1, y: -1, inside: false, touch: false, downX: 0, downY: 0 };
const mv = { i: -1, dx: 0, dy: 0, x: 0, y: 0 };
const wire = { src: -1, pickDst: -1, pickPin: 0, tgt: -1, tpin: 0, ok: false };
function ghostCell () { return [Math.floor ((pointer.x - ox) / cell - 2.5 + 0.5), Math.floor ((pointer.y - oy) / cell - 2 + 0.5)]; }
function pinAt (mx, my)
{
	const r = Math.max (cell * 0.6, pointer.touch ? 22 : 9);
	let best = null, bestD = r * r + 1;
	for (let i = 0; i < c.n; i++)
	{
		if (c.p[i].type !== P_LAMP) { const [x, y] = c.pinOut (i), d = (mx - X (x)) ** 2 + (my - Y (y)) ** 2; if (d < bestD) { bestD = d; best = { i, out: true, pin: 0 }; } }
		for (let k = 0; k < c.pins (i); k++) { const [x, y] = c.pinIn (i, k), d = (mx - X (x)) ** 2 + (my - Y (y)) ** 2; if (d < bestD) { bestD = d; best = { i, out: false, pin: k }; } }
	}
	return best;
}
const gateAt = (mx, my) => c.at (Math.floor ((mx - ox) / cell), Math.floor ((my - oy) / cell));
function updateTarget ()
{
	wire.tgt = -1; wire.ok = false;
	const p = pinAt (pointer.x, pointer.y);
	if (p && !p.out) { wire.tgt = p.i; wire.tpin = p.pin; wire.ok = c.connectErr (wire.src, p.i, p.pin) === E.OK; }
}
function startWire (s, dst, pin)
{
	drag = 'wire'; wire.src = s; wire.pickDst = dst; wire.pickPin = pin;
	sel = -1; selDst = -1;
	message ('info', t ('Let go on an input pin to lay the wire (Esc: cancel).', 'Lâche sur une borne d\'entrée pour poser le fil (Échap : annuler).'));
	updateTarget ();
	if (dst >= 0) refresh ();
}
function cancelDrag ()
{
	if (drag === 'wire' && wire.pickDst >= 0) c.connect (wire.src, wire.pickDst, wire.pickPin);
	drag = null; wire.tgt = -1;
	refresh ();
}
function press (mx, my)
{
	if (armed >= 0) return;
	const p = pinAt (mx, my);
	if (p && p.out) { startWire (p.i, -1, 0); return; }
	if (p && !p.out && c.p[p.i].in[p.pin] >= 0)
	{
		const s = c.p[p.i].in[p.pin];
		c.disconnect (p.i, p.pin);
		startWire (s, p.i, p.pin);
		return;
	}
	const gi = gateAt (mx, my);
	if (gi >= 0 && c.p[gi].type === P_SWITCH) { toggleSwitch (gi); return; }
	if (gi >= 0 && C.isGate (c.p[gi].type))
	{
		selectGate (gi);
		drag = 'press'; mv.i = gi; mv.dx = (mx - ox) / cell - c.p[gi].x; mv.dy = (my - oy) / cell - c.p[gi].y; mv.x = c.p[gi].x; mv.y = c.p[gi].y;
		return;
	}
	const w = c.wireAt ((mx - ox) / cell, (my - oy) / cell, Math.max (1 / 3, (pointer.touch ? 12 : 5) / cell));
	if (w) { selectWire (w.dst, w.pin); return; }
	selectGate (-1);
}
function release (mx, my)
{
	const inside = mx >= 0 && my >= 0 && mx < cw && my < ch;
	if (armed >= 0 && !drag)
	{
		if (!inside) return;
		const [gx, gy] = ghostCell ();
		const r = c.add (armed, gx, gy);
		if (r.i < 0) { message ('err', errWord (r.err)); draw (); return; }
		armed = -1; sel = r.i; boardChanged ();
		prompt ();
		return;
	}
	const d = drag; drag = null;
	if (d === 'wire')
	{
		if (!inside) { drag = 'wire'; cancelDrag (); prompt (); return; }
		updateTarget ();
		const tg = wire.tgt; wire.tgt = -1;
		if (tg >= 0)
		{
			const e = c.connect (wire.src, tg, wire.tpin);
			if (e !== E.OK) { if (wire.pickDst >= 0) c.connect (wire.src, wire.pickDst, wire.pickPin); message ('err', errWord (e)); refresh (); return; }
		}
		else if (wire.pickDst < 0) { prompt (); refresh (); return; }
		prompt (); boardChanged ();
		return;
	}
	if (d === 'move')
	{
		if (!inside) { refresh (); return; }
		const e = c.move (mv.i, mv.x, mv.y);
		if (e !== E.OK) { message ('err', errWord (e)); refresh (); return; }
		boardChanged ();
		return;
	}
	draw ();
}
function at (e) { const r = cv.getBoundingClientRect (); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x < cw && pointer.y < ch; }
cv.addEventListener ('pointerdown', (e) =>
{
	if (e.button === 2) return;
	if (!L || $('lesson').open || $('result').open) return;
	pointer.touch = e.pointerType !== 'mouse';
	at (e); pointer.downX = pointer.x; pointer.downY = pointer.y;
	try { cv.setPointerCapture (e.pointerId); } catch (err) { /* (a pointer already gone) */ }
	e.preventDefault ();
	press (pointer.x, pointer.y);
	draw ();
});
cv.addEventListener ('pointermove', (e) =>
{
	if (!L) return;
	pointer.touch = e.pointerType !== 'mouse';
	at (e);
	if (drag === 'wire') updateTarget ();
	else if (drag === 'press' || drag === 'move')
	{
		const dx = pointer.x - pointer.downX, dy = pointer.y - pointer.downY, th = Math.max (cell / 2, pointer.touch ? 8 : 4);
		if (drag === 'press' && dx * dx + dy * dy >= th * th) drag = 'move';
		if (drag === 'move') { mv.x = Math.floor ((pointer.x - ox) / cell - mv.dx + 0.5); mv.y = Math.floor ((pointer.y - oy) / cell - mv.dy + 0.5); }
	}
	hoverGate = -1; hoverOut = -1;
	if (!drag && e.buttons === 0 && pointer.inside && armed < 0 && !pointer.touch)
	{
		const p = pinAt (pointer.x, pointer.y);
		if (p && p.out) hoverOut = p.i;
		else { const gi = gateAt (pointer.x, pointer.y); if (gi >= 0 && C.isGate (c.p[gi].type)) hoverGate = gi; }
	}
	cv.style.cursor = drag === 'move' ? 'grabbing' : hoverOut >= 0 || drag === 'wire' ? 'crosshair' : hoverGate >= 0 ? 'grab' : 'default';
	draw ();
});
cv.addEventListener ('pointerup', (e) => { if (!L) return; at (e); release (pointer.x, pointer.y); if (pointer.touch) pointer.inside = false; draw (); });
cv.addEventListener ('pointercancel', () => { if (drag) cancelDrag (); });
cv.addEventListener ('pointerleave', () => { if (!drag) { pointer.inside = false; hoverGate = hoverOut = -1; draw (); } });
cv.addEventListener ('contextmenu', (e) =>
{
	e.preventDefault ();
	if (!L || drag) return;
	at (e);
	if (armed >= 0) { arm (-1); return; }
	const gi = gateAt (pointer.x, pointer.y);
	if (gi >= 0 && C.isGate (c.p[gi].type) && !pinAt (pointer.x, pointer.y)) { c.remove (gi); sel = -1; boardChanged (); return; }
	const w = c.wireAt ((pointer.x - ox) / cell, (pointer.y - oy) / cell);
	if (w) { c.disconnect (w.dst, w.pin); selDst = -1; boardChanged (); }
});

// ---- the actions ---------------------------------------------------------------------------------------------------------------
const cardOpen = () => $('lesson').open || $('result').open;
function inputsText (r)
{
	return L.inName.map ((n, k) => (k === 0 ? '' : k + 1 === L.ninputs ? t (' and ', ' et ') : ', ') + n + ' = ' + ((r >> (L.ninputs - 1 - k)) & 1)).join ('');
}
function doCheck ()
{
	if (!L || cardOpen ()) return;
	if (drag) cancelDrag ();
	step = -1;
	const r = C.check (c, L);
	if (r.err === E.LAMP_OPEN)
	{
		errPart = r.errPart; checked = false;
		message ('err', t ('Lamp %s is not connected: wire a gate\'s output to it, then Check again.', 'La lampe %s n\'est pas reliée : relie-lui la sortie d\'une porte, puis vérifie encore.').replace ('%s', c.p[r.errPart].name));
		refresh (); return;
	}
	if (r.err !== E.OK)
	{
		errPart = r.errPart; checked = false;
		message ('err', t ('This %s gate (outlined in red) has an input not connected: wire it, then Check again.', 'Cette porte %s (entourée de rouge) a une entrée non reliée : relie-la, puis vérifie encore.').replace ('%s', gateWord (c.p[r.errPart].type)));
		refresh (); return;
	}
	errPart = -1; checked = true; res = r;
	if (!r.won)
	{
		row = r.firstWrong;
		let o = 0; while (o + 1 < L.noutputs && (((L.want[o] ^ r.got[o]) >> r.firstWrong) & 1) === 0) o++;
		const light = (L.want[o] >> r.firstWrong) & 1, ins = inputsText (r.firstWrong);
		const head = r.nwrong === 1 ? t ('1 row is wrong:', '1 ligne est fausse :') : t ('%d rows are wrong:', '%d lignes sont fausses :').replace ('%d', r.nwrong);
		const body = L.noutputs === 1
			? (light ? t ('with %s the lamp must light.', 'avec %s la lampe doit s\'allumer.') : t ('with %s the lamp must stay off.', 'avec %s la lampe doit rester éteinte.')).replace ('%s', ins)
			: (light ? t ('with %s lamp %o must light.', 'avec %s la lampe %o doit s\'allumer.') : t ('with %s lamp %o must stay off.', 'avec %s la lampe %o doit rester éteinte.')).replace ('%s', ins).replace ('%o', L.outName[o]);
		message ('err', head + ' ' + body + ' ' + t ('The switches are set on that row.', 'Les interrupteurs sont mis sur cette ligne.'));
		refresh (); return;
	}
	const rec = r.stars > (P.stars[L.id] | 0);
	if (rec) P.stars[L.id] = r.stars;
	const n = nextOf (pk, lv);
	if (n && !packs[pk].opened && !packs[n[0]].opened && !P.open.includes (packs[n[0]].levels[n[1]].id)) P.open.push (packs[n[0]].levels[n[1]].id);
	saveBoard ();
	message ('ok', r.stars === 3 ? t ('Well done! %d %g — the best possible.', 'Bravo ! %d %g — le meilleur possible.').replace ('%d', r.gates).replace ('%g', gatesWord (r.gates))
		: t ('Well done! %d %g. Three stars need %p.', 'Bravo ! %d %g. Trois étoiles : %p.').replace ('%d', r.gates).replace ('%g', gatesWord (r.gates)).replace ('%p', L.par3), r.stars);
	// the result card
	const last = !n;
	let h = '<div class="big-stars">' + Site.starsHtml (r.stars).replace ('class="stars"', 'class="stars" style="font-size:40px"') + '</div>';
	if (rec) h += '<p class="rec">' + t ('New record!', 'Nouveau record !') + '</p>';
	h += '<p><b>' + t ('%d %g — every row right', '%d %g — toutes les lignes justes').replace ('%d', r.gates).replace ('%g', gatesWord (r.gates)) + '</b></p><p>';
	if (last) h += t ('You finished every level!', 'Tu as fini tous les niveaux !');
	else if (r.stars < 3) h += t ('Three stars need %d %g or fewer. The best known circuit is smaller: can you find it?', 'Trois étoiles : %d %g ou moins. Le meilleur circuit connu est plus petit : sauras-tu le trouver ?').replace ('%d', L.par3).replace ('%g', gatesWord (L.par3));
	else h += t ('The best possible: %d %g.', 'Le meilleur possible : %d %g.').replace ('%d', r.gates).replace ('%g', gatesWord (r.gates));
	$('resultBody').innerHTML = h + '</p>';
	$('resStay').textContent = r.stars === 3 ? t ('Stay here', 'Rester ici') : t ('Try for ★★★', 'Viser ★★★');
	$('resNext').hidden = last;
	openDialog ($('result'));
	renderList (); refresh ();
}
function doStep ()
{
	if (!L || cardOpen ()) return;
	if (step < 0) step = 0;
	else { const e = C.evaluate (c, row); if (step < e.maxDepth) step++; else { doLive (); return; } }
	checked = false;
	refresh (); stepMessage ();
}
function doLive () { if (step < 0) return; step = -1; refresh (); prompt (); }
function doReset () { if (step < 0) return; step = 0; refresh (); stepMessage (); }
function doNext ()
{
	const n = nextOf (pk, lv);
	if (n && isOpen (n[0], n[1])) showLevel (n[0], n[1]);
	else message ('info', t ('No next level open yet.', 'Pas encore de niveau suivant ouvert.'));
}
function doDelete ()
{
	if (!L || cardOpen ()) return;
	if (sel >= 0) { c.remove (sel); sel = -1; boardChanged (); }
	else if (selDst >= 0) { c.disconnect (selDst, selPin); selDst = -1; boardChanged (); }
}
function doUndo () { if (!L || cardOpen ()) return; const r = hist.undo (L); if (r) { c = r; sel = selDst = -1; afterEdit (false); } }
function doRedo () { if (!L || cardOpen ()) return; const r = hist.redo (L); if (r) { c = r; sel = selDst = -1; afterEdit (false); } }
$('btCheck').addEventListener ('click', doCheck);
$('btStep').addEventListener ('click', doStep);
$('btReset').addEventListener ('click', doReset);
$('btDel').addEventListener ('click', doDelete);
$('btUndo').addEventListener ('click', doUndo);
$('btRedo').addEventListener ('click', doRedo);
$('resStay').addEventListener ('click', () => $('result').close ());
$('resNext').addEventListener ('click', () => { $('result').close (); doNext (); });
$('rotateOk').addEventListener ('click', () => { P.tip = true; save (); $('rotateTip').hidden = true; layoutBoard (); });

function openDialog (d) { if (!d.open) { if (d.showModal) d.showModal (); else d.setAttribute ('open', ''); } }
function showLesson (first)
{
	const ls = L && window.CIRCUITS_LESSONS[L.topic];
	if (!ls) { if (!first) message ('info', t ('This level has no lesson of its own: its idea was taught before.', 'Ce niveau n\'a pas de leçon à lui : son idée a déjà été vue.')); return false; }
	const i = Site.L;
	$('lessonTitle').textContent = (ls.gate ? t ('New gate: ', 'Nouvelle porte : ') + gateWord (ls.gate) : t ('New idea: ', 'Nouvelle idée : ') + ls.title[i]);
	let fig = '<div class="lesson-figure">';
	if (ls.gate)
	{
		fig += '<span style="color:#4B2E83">' + gateSvg (ls.gate, 34, 24).replace ('<svg ', '<svg width="102" height="72" ') + '</span>';
		const ni = ls.gate === P_NOT ? 1 : 2, names = ni === 1 ? ['A', 'Out'] : ['A', 'B', 'Out'];
		fig += '<table><tr>' + names.map ((n) => '<th>' + n + '</th>').join ('') + '</tr>';
		for (let r = 0; r < (1 << ni); r++)
		{
			const a = ni === 1 ? r : r >> 1, b = r & 1;
			const o = { [P_NOT]: a ? 0 : 1, [P_AND]: a & b, [P_OR]: a | b, [P_XOR]: a ^ b, [P_NAND]: (a & b) ? 0 : 1, [P_NOR]: (a | b) ? 0 : 1 }[ls.gate];
			fig += '<tr>' + (ni === 1 ? '<td>' + a + '</td>' : '<td>' + a + '</td><td>' + b + '</td>') + '<td class="' + (o ? 'on' : '') + '">' + o + '</td></tr>';
		}
		fig += '</table>';
	}
	else
	{
		fig += '<table><tr>' + [...L.inName, ...L.outName].map ((n) => '<th>' + n + '</th>').join ('') + '</tr>';
		for (let r = 0; r < (1 << L.ninputs); r++)
		{
			fig += '<tr>';
			for (let k = 0; k < L.ninputs; k++) fig += '<td>' + ((r >> (L.ninputs - 1 - k)) & 1) + '</td>';
			for (let k = 0; k < L.noutputs; k++) { const b = (L.want[k] >> r) & 1; fig += '<td class="' + (b ? 'on' : '') + '">' + b + '</td>'; }
			fig += '</tr>';
		}
		fig += '</table>';
	}
	$('lessonBody').innerHTML = fig + '</div><p>' + Site.esc (ls.text[i]) + '</p>';
	if (first) { P.seen[L.topic] = 1; save (); }
	message ('info', (ls.gate ? t ('New gate: %s. Read the card, then build.', 'Nouvelle porte : %s. Lis la carte, puis construis.').replace ('%s', gateWord (ls.gate))
		: t ('New idea: %s. Read the card, then build.', 'Nouvelle idée : %s. Lis la carte, puis construis.').replace ('%s', ls.title[i])));
	openDialog ($('lesson'));
	return true;
}
$('btLesson').addEventListener ('click', () => showLesson (false));
$('lessonOk').addEventListener ('click', () => { $('lesson').close (); prompt (); });

document.addEventListener ('keydown', (e) =>
{
	if (!L) return;
	const k = e.key, ctrl = e.ctrlKey || e.metaKey, field = /INPUT|SELECT|TEXTAREA/.test (e.target.tagName);
	if (k === 'Enter' && ctrl) { e.preventDefault (); doCheck (); }
	else if (k === 'F5') { e.preventDefault (); doCheck (); }
	else if (k === 'F8' && e.shiftKey) { e.preventDefault (); doLive (); }
	else if (k === 'F8') { e.preventDefault (); doStep (); }
	else if (k === 'F7') { e.preventDefault (); doLive (); }
	else if (k === 'F9') { e.preventDefault (); doReset (); }
	else if (ctrl && (k === 'z' || k === 'Z') && !e.shiftKey) { e.preventDefault (); doUndo (); }
	else if (ctrl && (k === 'y' || k === 'Y' || ((k === 'z' || k === 'Z') && e.shiftKey))) { e.preventDefault (); doRedo (); }
	else if (field || ctrl || e.altKey || cardOpen ()) return;
	else if (k === 'Escape')
	{
		if (drag) cancelDrag ();
		else if (armed >= 0) arm (-1);
		else if (sel >= 0 || selDst >= 0) { sel = -1; selDst = -1; refresh (); }
	}
	else if (k === 'Delete' || k === 'Backspace') { e.preventDefault (); doDelete (); }
	else if (/^[1-6]$/.test (k))
	{
		const allowed = [P_NOT, P_AND, P_OR, P_XOR, P_NAND, P_NOR].filter ((ty) => L.parts & (1 << ty));
		const ty = allowed[+k - 1];
		if (ty !== undefined) arm (armed === ty ? -1 : ty);
	}
	else if (k.startsWith ('Arrow') && sel >= 0)
	{
		e.preventDefault ();
		const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
		if (c.move (sel, c.p[sel].x + d[0], c.p[sel].y + d[1]) === E.OK) boardChanged ();
	}
	else if (k === 'h' || k === 'H') doHint ();
	else if (k === 'l' || k === 'L') showLesson (false);
});

// ---- a level shown ---------------------------------------------------------------------------------------------------------------
function showLevel (p, l)
{
	if (p < 0 || p >= packs.length || l < 0 || l >= packs[p].levels.length) return;
	if (drag) cancelDrag ();
	if (L) saveBoard ();
	pk = p; lv = l; L = packs[p].levels[l];
	c = new C.Circuit ().setup (L);
	const saved = P.circuit[L.id];
	if (saved) { const r = C.readText (L, saved); if (r.c) c = r.c; }
	hist = new C.History (); hist.start (c);
	row = 0; step = -1; sel = selDst = -1; errPart = -1; checked = false; showHint = false; armed = -1;
	P.pack = p; P.level = L.id; save ();
	$('card').classList.add ('compact');
	renderList (); renderCard ();
	ev = C.evaluate (c, row);
	layoutBoard ();
	refresh ();
	prompt ();
	if (L.topic && !P.seen[L.topic]) showLesson (true);
	const cur = document.querySelector ('.levels [aria-current="true"]'); if (cur) cur.scrollIntoView ({ block: 'nearest' });
}

let ready = false;
Site.onLang (() => { if (!ready) return; renderList (); renderCard (); refresh (); if ($('msg').classList.contains ('info')) prompt (); });
document.addEventListener ('DOMContentLoaded', () =>
{
	ready = true;
	$('rotateTip').hidden = P.tip || !matchMedia ('(max-width: 699px) and (orientation: portrait)').matches;
	let p = Math.min (P.pack | 0, packs.length - 1), l = packs[p] ? packs[p].levels.findIndex ((x) => x.id === P.level) : 0;
	if (l < 0 || !isOpen (p, l)) { p = 0; l = 0; }
	showLevel (p, l);
});
window.addEventListener ('pagehide', saveBoard);
}) ();
