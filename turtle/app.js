// app.js -- Turtle Quest in the browser (Onyx's user/Apps/turtle/main.cpp): the packs of levels and their stars, the
// program (an editor with its words coloured, the words the level knows as chips), Run / Step / Stop / Reset at the
// speed chosen -- the run recorded by world.js, played back on the board, the line being run lit --, the level's card
// (Hint, Lesson), the message bar. The progress is kept in the browser.
//
// Keys: Ctrl+Enter Run, F8 Step, F9 Reset, Esc Stop; H the hint, L the lesson (outside the program).
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';
const $ = (id) => document.getElementById (id);
const t = (en, fr) => Site.t (en, fr);
const STORE = 'codeisfun.turtle';

// ---- the progress -----------------------------------------------------------------------------------------------------------
const P = Object.assign ({ stars: {}, best: {}, code: {}, seen: {}, pack: 0, level: 0, speed: Site.reducedMotion ? 10 : 5 }, Site.store.get (STORE, {}));
const save = () => Site.store.set (STORE, P);

// ---- the packs ----------------------------------------------------------------------------------------------------------------
const packs = [];
for (const p of window.TURTLE_PACKS || [])
{
	try { packs.push (Turtle.parsePack (p.text)); }
	catch (e) { console.error (p.name, e.message); }
}
let pk = Math.min (P.pack === 'free' ? 0 : P.pack | 0, packs.length - 1), lv = 0, L = null, target = null;
let free = false;				// the free mode (the last pack): the computer's screen, BASIC whole

// ---- the colours (Onyx's) -------------------------------------------------------------------------------------------------------
const hex = (n) => '#' + n.toString (16).padStart (6, '0');
const PEN = [0x202020, 0x2F6FD0, 0x2E9E44, 0x1E9FAF, 0xD0342C, 0x9C3FB5, 0x9A6234, 0xA8A8A8, 0x606060, 0x5B9BFF, 0x5CCB5F, 0x4FD8E8, 0xFF6B5E, 0xE07BEF, 0xF2C230, 0xFFFFFF];
const GEM_C = [0, 0xD0342C, 0xE8822A, 0xF2C230, 0x2E9E44, 0x1E9FAF, 0x2F6FD0, 0x9C3FB5, 0xE07BEF, 0xF4F4F4];
const GEM_INK = [0, 0xFFFFFF, 0xFFFFFF, 0x4A3500, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0x5A1D66, 0x505050];
const PAD_RING = [0x1E9FAF, 0x9C3FB5], PAD_FACE = [0x9FE9F1, 0xF0C2F7];
function mix (a, b, k) { const f = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255]; const A = f (a), B = f (b); return (Math.round (A[0] + (B[0] - A[0]) * k / 255) << 16) | (Math.round (A[1] + (B[1] - A[1]) * k / 255) << 8) | Math.round (A[2] + (B[2] - A[2]) * k / 255); }

// ---- the level list -------------------------------------------------------------------------------------------------------------
function renderPacks ()
{
	const html = packs.map ((p, i) => '<option value="' + i + '">' + Site.esc (p.title[Site.L] || p.title[0]) + '</option>').join ('') +
		'<option value="free">' + (packs.length + 1) + '. ' + Site.esc (t ('Free mode', 'Mode libre')) + '</option>';
	for (const sel of [$('packSel'), $('freePack')]) { sel.innerHTML = html; sel.value = free ? 'free' : String (pk); }
}
function packStars (p) { return p.levels.reduce ((s, l) => s + (P.stars[l.id] | 0), 0); }
function renderList ()
{
	const p = packs[pk];
	$('levelList').innerHTML = p.levels.map ((l, i) =>
	{
		const s = P.stars[l.id] | 0;
		return '<li><button type="button" class="lv" data-i="' + i + '"' + (i === lv ? ' aria-current="true"' : '') + '>' +
			'<span class="num' + (s ? ' won' : '') + '">' + (i + 1) + '</span><span class="t">' + Site.esc (l.titleOf (Site.L)) + '</span>' + Site.starsHtml (s) + '</button></li>';
	}).join ('');
	const got = packStars (p), all = 3 * p.levels.length;
	$('packFoot').innerHTML = '<span class="on">★</span> ' + Site.esc (t ('This pack: ', 'Ce recueil : ')) + got + ' / ' + all;
	document.querySelector ('.pack-stars').textContent = '★ ' + got + '/' + all;
}
$('levelList').addEventListener ('click', (e) =>
{
	const b = e.target.closest ('.lv'); if (!b) return;
	showLevel (pk, +b.dataset.i);
	Site.openLevels (false);
});
for (const sel of [$('packSel'), $('freePack')])
	sel.addEventListener ('change', () => { if (sel.value === 'free') enterFree (); else showLevel (+sel.value, 0); Site.openLevels (false); });
document.querySelector ('.open-pack').addEventListener ('click', () => $('packFile').click ());
$('packFile').addEventListener ('change', async () =>
{
	const f = $('packFile').files[0]; if (!f) return;
	try
	{
		const p = Turtle.parsePack (await f.text ());
		if (!p.title[0]) p.title[0] = f.name.replace (/\.turtle$/i, '');
		packs.push (p);
		renderPacks (); showLevel (packs.length - 1, 0);
	}
	catch (err) { alert (t ('Not a pack of levels:', "Ce n'est pas un recueil de niveaux :") + '\n' + err.message); }
	$('packFile').value = '';
});

// ---- the editor --------------------------------------------------------------------------------------------------------------------
const ed = $('code'), hl = $('hl'), gutter = $('gutter');
let hiLine = 0, badLine = 0;
const KNOWN = new Set ([...Basic.KEYWORDS, ...Object.keys (Basic.FRENCH), ...Turtle.WORDS.flatMap ((w) => [w[0], w[1]]), ...Object.keys (Turtle.DIALECT.aliases),
	...Object.keys (Basic.BUILTINS), ...Object.keys (Basic.HOSTFN), 'TAB', 'SPC', 'LBOUND', 'UBOUND', 'ERR', 'ERL', 'B', 'BF']);
function colour (line)
{
	let out = '', i = 0;
	while (i < line.length)
	{
		const rest = line.slice (i);
		let m;
		if (rest[0] === "'") { out += '<span class="c">' + Site.esc (rest) + '</span>'; break; }
		if ((m = /^"[^"]*"?/.exec (rest))) { out += '<span class="s">' + Site.esc (m[0]) + '</span>'; i += m[0].length; continue; }
		if ((m = /^[\p{L}_][\p{L}\p{N}_]*[$%!#&]?/u.exec (rest)))
		{
			const u = Basic.plain (m[0]);
			if (u === 'REM' && !line.slice (0, i).replace (/.*:/, '').trim ()) { out += '<span class="c">' + Site.esc (rest) + '</span>'; break; }
			out += KNOWN.has (u) ? '<span class="k">' + Site.esc (m[0]) + '</span>' : Site.esc (m[0]);
			i += m[0].length; continue;
		}
		if ((m = /^\d+\.?\d*/.exec (rest))) { out += '<span class="n">' + m[0] + '</span>'; i += m[0].length; continue; }
		out += Site.esc (rest[0]); i++;
	}
	return out;
}
function renderCode ()
{
	const lines = ed.value.split ('\n');
	hl.innerHTML = lines.map ((l, i) => '<span class="l' + (i + 1 === hiLine ? ' cur' : i + 1 === badLine ? ' bad' : '') + '">' + colour (l) + '</span>').join ('');
	gutter.innerHTML = lines.map ((l, i) => '<div class="' + (i + 1 === hiLine ? 'cur' : i + 1 === badLine ? 'bad' : '') + '">' + (i + 1) + '</div>').join ('');
	syncScroll ();
}
function syncScroll () { hl.scrollTop = ed.scrollTop; hl.scrollLeft = ed.scrollLeft; gutter.scrollTop = ed.scrollTop; }
function showLine (n)
{
	if (n < 1) return;
	const lh = parseFloat (getComputedStyle (ed).lineHeight) || 24, y = (n - 1) * lh;
	if (y < ed.scrollTop || y + lh > ed.scrollTop + ed.clientHeight - 20) ed.scrollTop = Math.max (0, y - ed.clientHeight / 3);
	syncScroll ();
}
function setHi (n) { hiLine = n; renderCode (); if (n) showLine (n); }
ed.addEventListener ('scroll', syncScroll);
ed.addEventListener ('input', () =>
{
	badLine = 0; renderCode (); refreshCount ();
	if (mode === 'done') mode = 'idle';
	clearTimeout (ed._t); ed._t = setTimeout (saveCode, 400);
});
ed.addEventListener ('keydown', (e) =>
{
	if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault (); insert (e.shiftKey ? '' : '  '); }
	else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey)
	{
		// the new line keeps the indentation
		const s = ed.value.slice (0, ed.selectionStart), ind = /[ \t]*/.exec (s.slice (s.lastIndexOf ('\n') + 1))[0];
		if (ind) { e.preventDefault (); insert ('\n' + ind); }
	}
});
function insert (text)
{
	if (ed.readOnly) return;
	ed.focus ();
	if (!document.execCommand || !document.execCommand ('insertText', false, text))
	{
		ed.setRangeText (text, ed.selectionStart, ed.selectionEnd, 'end');
		ed.dispatchEvent (new Event ('input'));
	}
}
function saveCode ()
{
	const key = free ? '__free' : L && L.id;
	if (!key) return;
	if (P.code[key] !== ed.value) { P.code[key] = ed.value; save (); }
}

// ---- the chips: the words the level knows, a tap writes one -----------------------------------------------------------------------------
const ORDER = ['repeat', 'for', 'if', 'sensor', 'while', 'maze', 'variable', 'sub', 'pen', 'draw', 'gems', 'teleport', 'color', 'params', 'function', 'recursion'];
const CONTROL = [['REPEAT', 'REPETER', 0, 'REPEAT 4\n  \nEND REPEAT', 'REPETER 4\n  \nFIN REPETER'], ['FOR', 'POUR', 1, 'FOR i = 1 TO 5\n  \nNEXT', 'POUR i = 1 JUSQUE 5\n  \nSUITE'],
	['IF', 'SI', 2, 'IF  THEN\n  \nEND IF', 'SI  ALORS\n  \nFIN SI'], ['WHILE', 'TANTQUE', 4, 'WHILE NOT ONGOAL ()\n  \nWEND', 'TANTQUE NON SURBUT ()\n  \nFIN TANTQUE'],
	['SUB', 'SUB', 7, 'SUB MyWord\n  \nEND SUB', 'SUB MonMot\n  \nFIN SUB'], ['FUNCTION', 'FONCTION', 14, 'FUNCTION MyValue (x)\n  MyValue = x\nEND FUNCTION', 'FONCTION MaValeur (x)\n  MaValeur = x\nFIN FONCTION']];
// The empty program's reminder: one instruction per line
function renderPlaceholder ()
{
	if (free) { ed.placeholder = t ('Any BASIC program, for example:\nSCREEN 12\nCIRCLE (320, 240), 100, 14\nPRINT "Hello!"\n\n(or choose an example above the screen)', 'N\'importe quel programme BASIC, par exemple :\nSCREEN 12\nCIRCLE (320, 240), 100, 14\nAFFICHER "Bonjour !"\n\n(ou choisis un exemple au-dessus de l\'écran)'); return; }
	ed.placeholder = t ("One instruction per line:\nFORWARD 2\nFORWARD 1\n(Enter after each one)", "Une instruction par ligne :\nAVANCER 2\nAVANCER 1\n(Entrée après chacune)");
}
function renderChips ()
{
	if (!L) return;
	const fr = Site.lang === 'fr';
	let html = '';
	for (const [en, frn, kind] of Turtle.WORDS)
		if (L.knows (en))
		{
			const help = Turtle.WORD_HELP[en][fr ? 1 : 0];
			html += '<button type="button" class="chip" data-w="' + en + '" data-kind="' + kind + '" title="' + Site.esc (help) + '" aria-label="' + Site.esc (help) + '">' + (fr ? frn : en) + '</button>';
		}
	const at = ORDER.indexOf (L.topic);
	CONTROL.forEach ((c, k) => { if (at >= c[2]) html += '<button type="button" class="chip block" data-c="' + k + '">' + (fr ? c[1] : c[0]) + '</button>'; });
	$('chips').innerHTML = html;
}
$('chips').addEventListener ('click', (e) =>
{
	const b = e.target.closest ('.chip'); if (!b) return;
	const before = ed.value.slice (0, ed.selectionStart), cur = before.slice (before.lastIndexOf ('\n') + 1);
	const nl = cur.trim () && b.dataset.kind !== 'n' ? '\n' + /^[ \t]*/.exec (cur)[0] : '';
	if (b.dataset.c !== undefined) { const c = CONTROL[+b.dataset.c]; insert (nl + (Site.lang === 'fr' ? c[4] : c[3])); }
	else insert (nl + b.textContent + (b.dataset.kind === 'n' ? ' ()' : ' '));
});
$('chips').addEventListener ('mousedown', (e) => { if (e.target.closest ('.chip')) e.preventDefault (); });	// (the caret stays)

function refreshCount ()
{
	if (!L) return;
	const n = Turtle.countInstructions (ed.value), best = P.best[L.id] | 0;
	let h = '<span>' + t ('Instructions: ', 'Instructions : ') + n + '</span>';
	if (L.par3) h += '<span><span class="st">★★★</span> ≤ ' + L.par3 + '</span><span><span class="st">★★</span> ≤ ' + L.par2 + '</span>';
	if (best) h += '<span>' + t ('Best: ', 'Record : ') + best + '</span>';
	$('count').innerHTML = h;
}

// ---- the card, the hint, the lesson ------------------------------------------------------------------------------------------------
let showHint = false;
function renderCard ()
{
	if (!L) return;
	$('lvTitle').textContent = (lv + 1) + '. ' + L.titleOf (Site.L);
	$('lvText').textContent = L.textOf (Site.L);
	$('lvHint').textContent = t ('Hint: ', 'Indice : ') + L.hintOf (Site.L);
	$('lvHint').hidden = !showHint;
	$('btHint').setAttribute ('aria-pressed', String (showHint));
	$('btLesson').disabled = !Turtle.CONCEPTS[L.topic];
	requestAnimationFrame (() => { const p = $('lvText'); $('lvMore').hidden = !$('card').classList.contains ('compact') || p.scrollHeight <= p.clientHeight + 2; });
}
$('lvMore').addEventListener ('click', () => { $('card').classList.remove ('compact'); $('lvMore').hidden = true; });
function doHint () { showHint = !showHint; if (showHint) $('card').classList.remove ('compact'); renderCard (); }
$('btHint').addEventListener ('click', doHint);
function showLesson ()
{
	const c = L && Turtle.CONCEPTS[L.topic]; if (!c) return;
	const i = Site.L;
	$('lessonTitle').textContent = t ('New idea: ', 'Nouvelle idée : ') + c[0][i];
	let html = '', code = [];
	const flush = () => { if (code.length) { html += '<pre>' + Site.esc (code.join ('\n')) + '</pre>'; code = []; } };
	for (const line of c[1][i].split ('\n'))
	{
		if (line.startsWith ('  ')) { code.push (line.slice (2)); continue; }
		flush ();
		if (line === '@palette')
			html += '<div class="palette">' + PEN.map ((p, k) => '<span style="background:' + hex (p) + ';color:' + (k === 7 || k >= 9 ? '#202020' : '#fff') + (k === 15 ? ';outline:1px solid #bbb' : '') + '">' + k + '</span>').join ('') + '</div>';
		else if (line) html += '<p>' + Site.esc (line) + '</p>';
	}
	flush ();
	$('lessonBody').innerHTML = html;
	P.seen[L.topic] = 1; save ();
	const d = $('lesson');
	if (!d.open) { if (d.showModal) d.showModal (); else d.setAttribute ('open', ''); }
}
$('btLesson').addEventListener ('click', showLesson);
$('lessonOk').addEventListener ('click', () => { $('lesson').close (); });

// ---- the run and its playback ------------------------------------------------------------------------------------------------------
let run = null, view = null, mode = 'idle', idx = 0, tEv = 0, stepping = false, lastT = 0, raf = 0;
function setRunning (on)
{
	ed.readOnly = on;
	document.body.classList.toggle ('running', on);
	$('btRun').disabled = on && mode === 'run' && !stepping;
	$('btStop').disabled = !on;
}
function message (kind, text, stars, extra)
{
	Site.message ($('msg'), kind, text, stars, true);
	if (extra) $('msg').appendChild (extra);
	if ((kind === 'err' || kind === 'ok') && Site.isPhone () && $('msg').getBoundingClientRect ().top < 60) $('msg').scrollIntoView ({ block: 'start' });
}
function resetView ()
{
	cancelAnimationFrame (raf); raf = 0;
	if (L) view = new Turtle.World ().reset (L);
	mode = 'idle'; idx = 0; tEv = 0; stepping = false;
	setHi (0);
	setRunning (false);
	draw ();
}
function evMs (e)
{
	const SCALE = [4, 2.6, 1.7, 1.15, 0.8, 0.55, 0.36, 0.22, 0.1, 0];
	const k = SCALE[Math.min (10, Math.max (1, +$('speed').value)) - 1];
	switch (e.kind)
	{
	case 'line': return 110 * k;
	case 'move': return 320 * k * Math.hypot (e.c - e.a, e.d - e.b);
	case 'turn': { let d = Math.abs (e.b - e.a); if (d > 180) d = 360 - d; return 240 * k * Math.max (0.4, d / 90); }
	case 'bump': return k ? 420 * Math.max (0.5, k) : 0;
	case 'pick': case 'door': return 260 * k;
	case 'teleport': return 420 * k;
	}
	return 0;
}
function showPane (p)
{
	document.body.dataset.pane = p;
	$('tabCode').setAttribute ('aria-selected', String (p === 'code'));
	$('tabBoard').setAttribute ('aria-selected', String (p === 'board'));
	if (p === 'board') requestAnimationFrame (draw);
}
document.querySelectorAll ('.tabs button').forEach ((b) => b.addEventListener ('click', () => showPane (b.dataset.pane)));
function startRun (step)
{
	if (!L) return false;
	if ($('lesson').open) $('lesson').close ();
	resetView ();
	badLine = 0;
	saveCode ();
	run = Turtle.runProgram (L, ed.value, Site.L, L.draw ? target : null);
	if (run.result === 'compile')
	{
		badLine = run.errLine; renderCode (); showLine (run.errLine);
		showPane ('code');
		message ('err', run.msg);
		return false;
	}
	message ('info', step ? t ('Step by step: F8 (or Step) runs the lit line.', 'Pas à pas : F8 (ou Pas à pas) exécute la ligne éclairée.') : t ('Running...', 'En route...'));
	mode = 'run'; stepping = step; lastT = 0;
	setRunning (true);
	showPane ('board');
	return true;
}
function finishRun ()
{
	cancelAnimationFrame (raf); raf = 0;
	mode = 'done';
	setRunning (false);
	hiLine = 0;
	const R = run;
	if (R.result === 'won')
	{
		const m = R.stars === 3 ? t ('Perfect!', 'Parfait !') : R.stars === 2 ? t ('Well done!', 'Bravo !') : t ('You made it!', 'Réussi !');
		const more = R.stars < 3 && L.par3 ? t ('%d instructions: aim for %e for three stars.', '%d instructions : vise %e pour 3 étoiles.').replace ('%d', R.count).replace ('%e', L.par3)
			: t ('%d instruction(s).', '%d instruction(s).').replace ('%d', R.count);
		if (R.stars > (P.stars[L.id] | 0)) P.stars[L.id] = R.stars;
		if (R.count > 0 && (!P.best[L.id] || R.count < P.best[L.id])) P.best[L.id] = R.count;
		save ();
		let next = null;
		if (lv + 1 < packs[pk].levels.length || pk + 1 < packs.length)
		{
			next = document.createElement ('button');
			next.type = 'button'; next.className = 'btn primary small'; next.textContent = t ('Next level', 'Niveau suivant');
			next.addEventListener ('click', doNext);
		}
		message ('ok', m + '\n' + more, R.stars, next);
		renderList (); refreshCount ();
	}
	else
	{
		let show = null;
		if (R.errLine > 0)
		{
			badLine = R.errLine;
			if (Site.isPhone ())
			{
				show = document.createElement ('button');
				show.type = 'button'; show.className = 'btn small'; show.textContent = t ('Show the line', 'Voir la ligne');
				show.addEventListener ('click', () => { showPane ('code'); showLine (badLine); });
			}
		}
		message (R.result === 'lost' ? 'info' : 'err', R.msg, 0, show);
	}
	renderCode (); if (badLine) showLine (badLine);
	draw ();
}
function tick (now)
{
	raf = 0;
	if (mode !== 'run') return;
	let dt = lastT ? now - lastT : 16;
	lastT = now;
	dt = Math.min (100, Math.max (1, dt));
	let guard = 0, linePassed = false;
	while (mode === 'run' && idx < run.ev.length && guard++ < 4000)
	{
		const e = run.ev[idx];
		if (e.kind === 'line' && stepping && linePassed) { mode = 'pause'; setRunning (true); break; }
		const ms = evMs (e);
		if (ms > 0)
		{
			tEv += dt / ms;
			if (tEv < 1) { dt = 0; break; }
			dt = (tEv - 1) * ms; tEv = 0;
		}
		Turtle.apply (view, e);
		if (e.kind === 'line') { setHi (e.line); if (stepping) linePassed = true; }
		if (e.kind === 'print')
		{
			const s = run.out[e.i].replace (/\s+$/, '');
			if (s) message ('info', t ('The turtle says: ', 'La tortue dit : ') + s);
		}
		idx++;
		if (dt <= 0 && ms > 0) break;
	}
	if (mode === 'run' && idx >= run.ev.length) { finishRun (); return; }
	draw ();
	if (mode === 'run') raf = requestAnimationFrame (tick);
}
function go () { if (!raf) raf = requestAnimationFrame (tick); }
function doRun ()
{
	if (free) { freeRun (); return; }
	if (mode === 'pause') { stepping = false; mode = 'run'; lastT = 0; setRunning (true); showPane ('board'); go (); return; }
	if (mode === 'run') { stepping = false; setRunning (true); return; }
	if (startRun (false)) go ();
}
function doStep ()
{
	if (free) return;
	if (mode === 'pause') { stepping = true; mode = 'run'; lastT = 0; showPane ('board'); go (); return; }
	if (mode === 'run') { stepping = true; return; }
	if (startRun (true))
	{
		while (idx < run.ev.length && run.ev[idx].kind !== 'line') Turtle.apply (view, run.ev[idx++]);
		if (idx < run.ev.length) { setHi (run.ev[idx].line); Turtle.apply (view, run.ev[idx++]); }
		mode = 'pause'; setRunning (true);
		if (idx >= run.ev.length) finishRun ();
		draw ();
	}
}
function doStop ()
{
	if (free) { if (pc && pc.running ()) pc.stop (null); return; }
	if (mode !== 'run' && mode !== 'pause') return;
	cancelAnimationFrame (raf); raf = 0;
	mode = 'idle'; tEv = 0;
	setHi (0);
	setRunning (false);
	message ('info', t ('Stopped. Reset puts the turtle back at its start.', 'Arrêté. « Au départ » remet la tortue à sa place.'));
	draw ();
}
function doReset () { if (free) { if (pc && !pc.running ()) { pc.screen.setMode (0); pc.screen.cls (); pc.turtle = null; pc.show (); fitScreen (); } badLine = 0; renderCode (); message ('none'); return; } resetView (); badLine = 0; renderCode (); message ('none'); }
function doNext ()
{
	if (lv + 1 < packs[pk].levels.length) showLevel (pk, lv + 1);
	else if (pk + 1 < packs.length) showLevel (pk + 1, 0);
}
$('btRun').addEventListener ('click', doRun);
$('btStep').addEventListener ('click', doStep);
$('btStop').addEventListener ('click', doStop);
$('btReset').addEventListener ('click', doReset);
$('speed').value = P.speed;
$('speed').addEventListener ('input', () => { P.speed = +$('speed').value; save (); });
$('btSpeed').addEventListener ('click', () =>
{
	const open = !$('actions').classList.contains ('speed-open');
	$('actions').classList.toggle ('speed-open', open);
	$('btSpeed').setAttribute ('aria-expanded', String (open));
});
document.addEventListener ('click', (e) => { if (!e.target.closest ('#actions')) { $('actions').classList.remove ('speed-open'); $('btSpeed').setAttribute ('aria-expanded', 'false'); } });

document.addEventListener ('keydown', (e) =>
{
	if (free && pc && pc.running () && e.target.tagName !== 'SELECT' && !(e.key === 'Enter' && (e.ctrlKey || e.metaKey)))
	{
		if (pc.keyDown (e)) e.preventDefault ();
		return;
	}
	const inEd = e.target === ed || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT';
	if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault (); doRun (); }
	else if (e.key === 'F8') { e.preventDefault (); doStep (); }
	else if (e.key === 'F9') { e.preventDefault (); doReset (); }
	else if (e.key === 'F5') { e.preventDefault (); doRun (); }		// (Onyx's key: not the page reloaded)
	else if (e.key === 'Escape' && (mode === 'run' || mode === 'pause')) { e.preventDefault (); doStop (); }
	else if (!inEd && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'h' || e.key === 'H')) doHint ();
	else if (!inEd && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'l' || e.key === 'L')) showLesson ();
});

// ---- the board ---------------------------------------------------------------------------------------------------------------------
const cv = $('board'), g = cv.getContext ('2d');
let cs = 32, ox = 0, oy = 0, cw = 0, ch = 0;
function layoutBoard ()
{
	if (!L) return;
	const area = $('boardArea'), aw = area.clientWidth, desk = !matchMedia ('(max-width: 1099px)').matches;
	const ah = desk ? area.clientHeight : Infinity;
	cs = Math.floor (Math.min ((aw - 16) / L.w, (ah - 16) / L.h, 64));
	if (cs < 8) cs = 8;
	cw = desk ? cs * L.w + 16 : aw; ch = cs * L.h + 16;
	const dpr = window.devicePixelRatio || 1;
	cv.width = Math.round (cw * dpr); cv.height = Math.round (ch * dpr);
	cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
	g.setTransform (dpr, 0, 0, dpr, 0, 0);
	ox = Math.floor ((cw - cs * L.w) / 2); oy = 8;
	draw ();
}
new ResizeObserver (() => layoutBoard ()).observe ($('boardArea'));
const px = (x) => ox + x * cs + cs / 2, py = (y) => oy + y * cs + cs / 2;
function rrect (x, y, w, h, r) { g.beginPath (); g.roundRect ? g.roundRect (x, y, w, h, r) : g.rect (x, y, w, h); }
function circle (x, y, r, col, alpha = 1) { g.globalAlpha = alpha; g.beginPath (); g.arc (x, y, Math.max (0.1, r), 0, Math.PI * 2); g.fillStyle = col; g.fill (); g.globalAlpha = 1; }
function line (x1, y1, x2, y2, w, col) { g.beginPath (); g.moveTo (x1, y1); g.lineTo (x2, y2); g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = col; g.stroke (); }
function star (cx, cy, r, col)
{
	g.beginPath ();
	for (let i = 0; i < 10; i++) { const rr = i & 1 ? r * 2 / 5 : r, a = i * 36 * Math.PI / 180; g.lineTo (cx + Math.sin (a) * rr, cy - Math.cos (a) * rr); }
	g.closePath (); g.fillStyle = col; g.fill ();
}
function gem (cx, cy, s, n, k = 1, digit = true)
{
	if (n < 1 || n > 9 || k < 0.02) return;
	const r = s * 0.34 * k, c = GEM_C[n], a = r * 0.62, b = r * 0.12;
	const P5 = [[cx - a, cy - a], [cx + a, cy - a], [cx + r, cy - b], [cx, cy + r], [cx - r, cy - b]];
	const poly = (pts, col) => { g.beginPath (); pts.forEach (([x, y]) => g.lineTo (x, y)); g.closePath (); g.fillStyle = col; g.fill (); };
	poly (P5, hex (mix (c, 0, n === 9 ? 70 : 50)));
	poly ([[P5[0][0] + 1, P5[0][1] + 1], [P5[1][0] - 1, P5[1][1] + 1], [P5[2][0] - 1.2, P5[2][1]], [P5[3][0], P5[3][1] - 1.5], [P5[4][0] + 1.2, P5[4][1]]], hex (c));
	const tb = r * 0.42;
	poly ([[P5[0][0] + 1, P5[0][1] + 1], [P5[1][0] - 1, P5[1][1] + 1], [cx + tb, cy - b], [cx - tb, cy - b]], hex (mix (c, 0xFFFFFF, 110)));
	if (digit && s >= 16 && k > 0.6)
	{
		g.fillStyle = hex (GEM_INK[n]); g.font = '700 ' + Math.round (r * 1.05) + 'px ' + getComputedStyle (document.body).fontFamily;
		g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText (String (n), cx, cy + r * 0.12);
	}
}
function ring (cx, cy, s, col = '#FFFFFF', edge = '#6A5A30')
{
	const r = s * 0.46;
	g.beginPath (); g.arc (cx, cy, r, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = edge; g.globalAlpha = 0.6; g.stroke (); g.globalAlpha = 1;
	g.beginPath (); g.arc (cx, cy, r - 1.5, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = col; g.stroke ();
}
function pad (cx, cy, s, q, glow = 0)
{
	const r = s * 0.40;
	if (glow > 0) circle (cx, cy, r + s * 0.25 * glow, hex (PAD_FACE[q]), 0.8 * (1 - glow));
	circle (cx, cy, r, hex (PAD_RING[q]));
	circle (cx, cy, r - s / 9, hex (PAD_FACE[q]));
	g.beginPath (); g.arc (cx, cy, r * 0.55 - s / 40, 0, Math.PI * 2); g.lineWidth = s / 20 + 0.5; g.strokeStyle = hex (PAD_RING[q]); g.globalAlpha = 0.67; g.stroke (); g.globalAlpha = 1;
	const dr = s / 16 + 1;
	if (q === 0) circle (cx, cy, dr, hex (PAD_RING[q]));
	else { circle (cx - dr - 1, cy, dr, hex (PAD_RING[q])); circle (cx + dr + 1, cy, dr, hex (PAD_RING[q])); }
}
function tile (c, r, k, w, pickT, pickCell)
{
	const x = ox + c * cs, y = oy + r * cs, s = cs;
	if (k === ' ') return;
	if (k === '#')
	{
		rrect (x + 1, y + 1, s - 2, s - 2, s / 8);
		const gr = g.createLinearGradient (0, y, 0, y + s); gr.addColorStop (0, '#8E9AAA'); gr.addColorStop (1, '#6C7889');
		g.fillStyle = gr; g.fill ();
		g.fillStyle = '#7C889A'; g.fillRect (x + s / 5, y + s / 2, s * 3 / 5, 1);
		return;
	}
	if (L.draw) { g.fillStyle = '#D6D1C2'; g.fillRect (x + s / 2 - 1, y + s / 2 - 1, 2, 2); return; }
	g.fillStyle = ((c + r) & 1) ? '#EFE4C2' : '#F4EBCD'; g.fillRect (x, y, s, s);
	if (k === 'p')
	{
		if (w.painted[r][c]) { g.fillStyle = hex (mix (0xF4EBCD, PEN[w.color & 15], 150)); g.fillRect (x + 2, y + 2, s - 4, s - 4); }
		g.fillStyle = '#B06BD8';
		for (let q = 3; q < s - 3; q += 6) { g.fillRect (x + q, y + 2, 3, 2); g.fillRect (x + q, y + s - 4, 3, 2); g.fillRect (x + 2, y + q, 2, 3); g.fillRect (x + s - 4, y + q, 2, 3); }
	}
	const cx = x + s / 2, cy = y + s / 2, sc = pickCell === c + r * 256 ? 1 - pickT : 1;
	if (k === '*')
	{
		g.globalAlpha = 0.47; g.beginPath (); g.ellipse (cx - s / 6, y + s * 5 / 6, s / 6, s / 16 + 1, 0, 0, Math.PI * 2); g.fillStyle = '#5A4632'; g.fill (); g.globalAlpha = 1;
		line (cx - s / 6, y + s / 6, cx - s / 6, y + s * 5 / 6, 2, '#5A4632');
		g.beginPath (); g.moveTo (cx - s / 6, y + s / 6); g.lineTo (cx + s / 3, y + s / 6 + s / 8); g.lineTo (cx - s / 6, y + s / 6 + s / 4); g.closePath (); g.fillStyle = '#E0483E'; g.fill ();
	}
	else if (k === 'c' && sc > 0.02)
	{
		const rr = s * 0.24 * sc + 1;
		circle (cx, cy, rr, '#C8961E'); circle (cx, cy, rr * 3 / 4, '#F6CF3C'); circle (cx - rr / 3, cy - rr / 3, rr / 4, '#FFF3B0', 0.8);
	}
	else if (k === 'k' && sc > 0.02)
	{
		const rr = s * 0.14 * sc + 1;
		g.beginPath (); g.arc (cx - rr, cy, rr * 0.75, 0, Math.PI * 2); g.lineWidth = rr / 2; g.strokeStyle = '#D9A21B'; g.stroke ();
		line (cx - rr / 2, cy, cx + rr * 2, cy, rr * 3 / 5, '#D9A21B');
		line (cx + rr * 3 / 2, cy, cx + rr * 3 / 2, cy + rr, rr / 2, '#D9A21B');
	}
	else if (k === 'T' || k === 'U') pad (cx, cy, s, k === 'T' ? 0 : 1);
	else if (k === 'D')
	{
		rrect (x + 2, y + 2, s - 4, s - 4, s / 6);
		const gr = g.createLinearGradient (0, y, 0, y + s); gr.addColorStop (0, '#B0773F'); gr.addColorStop (1, '#8A5A2B'); g.fillStyle = gr; g.fill ();
		g.fillStyle = '#6E4520'; g.fillRect (x + s / 2, y + 4, 1, s - 8);
		circle (cx + s / 5, cy - s / 16, s / 14 + 1, '#2A1A0C');
		line (cx + s / 5, cy, cx + s / 5, cy + s / 8, s / 18 + 1, '#2A1A0C');
	}
}
function turtle (x, y, hd, k = 1)
{
	if (k < 0.04) return;
	const cx = px (x), cy = py (y), s = cs * k, a = hd * Math.PI / 180;
	const at = (deg, dist) => { const b = a + deg * Math.PI / 180; return [cx + Math.sin (b) * dist * s, cy - Math.cos (b) * dist * s]; };
	for (const d of [45, -45, 135, -135]) { const [lx, ly] = at (d, 0.33); circle (lx, ly, s / 9, '#6FB86A'); }
	{ const [lx, ly] = at (180, 0.38); circle (lx, ly, s / 16, '#6FB86A'); }
	{ const [lx, ly] = at (0, 0.40); circle (lx, ly, s * 0.15, '#7CC576'); }
	for (const d of [-16, 16]) { const [ex, ey] = at (d, 0.45); circle (ex, ey, s / 34 + 0.5, '#1E2A1E'); }
	circle (cx, cy, s * 0.34, '#2F7A35'); circle (cx, cy, s * 0.27, '#4FA052');
	for (let q = 0; q < 6; q++) { const [lx, ly] = at (q * 60 + 30, 0.19); circle (lx, ly, s / 19, '#3B8A3F'); }
	circle (cx, cy, s / 10, '#5DB560');
}
function ink (c) { return hex (L.draw ? PEN[c & 15] : mix (0xF1E7C6, PEN[c & 15], 150)); }
function draw ()
{
	if (!L || !view || !cw) return;
	const w = view, e = (mode === 'run' || mode === 'pause') && run && idx < run.ev.length ? run.ev[idx] : null, tt = tEv;
	g.clearRect (0, 0, cw, ch);
	rrect (0, 0, cw, ch, 12);
	const bg = g.createLinearGradient (0, 0, 0, ch);
	if (L.draw) { bg.addColorStop (0, '#FBFAF5'); bg.addColorStop (1, '#F4F2EA'); } else { bg.addColorStop (0, '#9CCB7E'); bg.addColorStop (1, '#86B96A'); }
	g.fillStyle = bg; g.fill ();
	const pickCell = e && (e.kind === 'pick' || e.kind === 'door') ? e.i : -1;
	for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) tile (c, r, w.cell[r][c], w, tt, pickCell);
	if (L.draw && target)
		for (const s of target) line (px (s.x1), py (s.y1), px (s.x2), py (s.y2), cs / 6 + 3, L.draw === 2 ? hex (mix (0xFBFAF5, PEN[s.color & 15], 85)) : '#D9D6CC');
	const lw = L.draw ? 3 : cs / 10 + 2;
	for (const s of w.segs) line (px (s.x1), py (s.y1), px (s.x2), py (s.y2), lw, ink (s.color));
	let tx = w.x, ty = w.y, th = w.h, tk = 1;
	if (e && e.kind === 'move')
	{
		tx = e.a + (e.c - e.a) * tt; ty = e.b + (e.d - e.b) * tt;
		if (w.pen) line (px (e.a), py (e.b), px (tx), py (ty), lw, ink (w.color));
	}
	else if (e && e.kind === 'turn') { let d = e.b - e.a; while (d > 180) d -= 360; while (d < -180) d += 360; th = e.a + d * tt; }
	else if (e && e.kind === 'bump') { const k = Math.sin (tt * Math.PI) * 0.28; tx = e.a + (e.c - e.a) * k; ty = e.b + (e.d - e.b) * k; }
	if (!L.draw)
		for (let r = 0; r < L.h; r++)
			for (let c = 0; c < L.w; c++)
			{
				const k = w.cell[r][c];
				if (k < '1' || k > '9') continue;
				const sc = pickCell === c + r * 256 ? 1 - tt : 1;
				if (sc <= 0.02) continue;
				if (+k === w.gems + 1 && pickCell !== c + r * 256) ring (px (c), py (r), cs);
				gem (px (c), py (r), cs, +k, sc);
			}
	if (e && e.kind === 'teleport')
	{
		const q = w.padAt (e.a, e.b) === 2 ? 1 : 0, ax = px (e.a), ay = py (e.b), bx = px (e.c), by = py (e.d);
		const lift = Math.hypot (bx - ax, by - ay) / 3, mx = (ax + bx) / 2, my = (ay + by) / 2 - lift;
		for (let i = 1; i < 24; i++)
		{
			const u = i / 24; if (u > tt + 0.04) break;
			circle ((1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * bx, (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * my + u * u * by, 2.2, hex (PAD_RING[q]), 0.67);
		}
		if (tt < 0.5) { pad (ax, ay, cs, q, tt * 2); tx = e.a; ty = e.b; tk = 1 - tt * 2; }
		else { pad (bx, by, cs, q, (1 - tt) * 2); tx = e.c; ty = e.d; tk = tt * 2 - 1; }
	}
	turtle (tx, ty, th, tk);
	if (e && e.kind === 'bump' && tt > 0.3 && tt < 0.9) star (px (e.a + (e.c - e.a) * 0.5), py (e.b + (e.d - e.b) * 0.5), cs / 4 + 2, '#FFD23F');
	// what is left to do
	const parts = [];
	if (w.coinsTotal) parts.push (t ('Coins', 'Pièces') + ' ' + w.coins + ' / ' + w.coinsTotal);
	if (w.gemsTotal) parts.push ('\u0000' + t ('Gems', 'Gemmes') + ' ' + w.gems + ' / ' + w.gemsTotal);
	if (w.keys) parts.push (t ('Keys', 'Clés') + ' ' + w.keys);
	if (parts.length)
	{
		g.font = '700 13px ' + getComputedStyle (document.body).fontFamily; g.textBaseline = 'middle'; g.textAlign = 'left';
		const widths = parts.map ((p) => g.measureText (p.replace ('\u0000', '')).width + (p[0] === '\u0000' ? 20 : 0));
		const bw = widths.reduce ((a, b) => a + b, 0) + 18 * (parts.length - 1) + 20;
		const bx = cw - bw - 8;
		g.globalAlpha = 0.85; rrect (bx, 6, bw, 24, 12); g.fillStyle = '#FFFFFF'; g.fill (); g.globalAlpha = 1;
		let x = bx + 10;
		parts.forEach ((p, i) =>
		{
			if (p[0] === '\u0000')
			{
				if (w.gems < w.gemsTotal) gem (x + 8, 18, 22, w.gems + 1, 1, false);
				else { g.fillStyle = '#3E9B4F'; g.fillText ('✓', x + 2, 18); }
				x += 20; p = p.slice (1);
			}
			g.fillStyle = '#303030'; g.fillText (p, x, 18.5);
			x += g.measureText (p).width + 18;
		});
	}
	cv.setAttribute ('aria-label', t ('The board: the turtle at column %c, row %r.', 'Le plateau : la tortue colonne %c, ligne %r.').replace ('%c', w.cx () + 1).replace ('%r', w.cy () + 1) + (parts.length ? ' ' + parts.join (', ').replace ('\u0000', '') : ''));
}

// ---- the free mode: the computer's screen (screen.js), any BASIC program --------------------------------------------------------------
let pc = null;
const MY_EXAMPLES = [
	{ title: ['Hello, who are you?', 'Bonjour, qui es-tu ?'], src: ['INPUT "What is your name"; name$\nINPUT "How old are you"; age\nPRINT "Hello, "; name$; "! In ten years you will be"; age + 10\n',
		'SAISIR "Comment t\'appelles-tu"; nom$\nSAISIR "Quel âge as-tu"; age\nAFFICHER "Bonjour, "; nom$; " ! Dans dix ans tu auras"; age + 10; "ans."\n'] },
	{ title: ['A bouncing ball (arrows, Esc)', 'Une balle qui rebondit (flèches, Échap)'], src: [
		"' A ball bounces: the arrows push it, Esc stops\nSCREEN 13\nx = 160: y = 100: dx = 2: dy = 1.5\nDO\n  CIRCLE (x, y), 6, 0, , , , F\n  x = x + dx: y = y + dy\n  IF x < 6 OR x > 313 THEN dx = -dx: PLAY \"MB T255 L64 O5 C\"\n  IF y < 6 OR y > 193 THEN dy = -dy: PLAY \"MB T255 L64 O4 G\"\n  IF KEYDOWN(\"LEFT\") THEN dx = dx - .1\n  IF KEYDOWN(\"RIGHT\") THEN dx = dx + .1\n  IF KEYDOWN(\"UP\") THEN dy = dy - .1\n  IF KEYDOWN(\"DOWN\") THEN dy = dy + .1\n  CIRCLE (x, y), 6, 14, , , , F\n  PAUSE 16\nLOOP UNTIL INKEY$ = CHR$(27)\n",
		"' Une balle rebondit : les flèches la poussent, Échap arrête\nSCREEN 13\nx = 160: y = 100: dx = 2: dy = 1.5\nFAIRE\n  CIRCLE (x, y), 6, 0, , , , F\n  x = x + dx: y = y + dy\n  SI x < 6 OU x > 313 ALORS dx = -dx: PLAY \"MB T255 L64 O5 C\"\n  SI y < 6 OU y > 193 ALORS dy = -dy: PLAY \"MB T255 L64 O4 G\"\n  SI KEYDOWN(\"LEFT\") ALORS dx = dx - .1\n  SI KEYDOWN(\"RIGHT\") ALORS dx = dx + .1\n  SI KEYDOWN(\"UP\") ALORS dy = dy - .1\n  SI KEYDOWN(\"DOWN\") ALORS dy = dy + .1\n  CIRCLE (x, y), 6, 14, , , , F\n  PAUSE 16\nBOUCLE JUSQUA INKEY$ = CHR$(27)\n"] },
	{ title: ['The turtle on the screen', 'La tortue sur l\'écran'], src: [
		"' The turtle's words draw on the screen too\nSCREEN 12\nFOR i = 1 TO 120\n  COLOR 1 + i MOD 15\n  FORWARD i * 2\n  RIGHT 61\nNEXT\n",
		"' Les mots de la tortue dessinent aussi sur l'écran\nSCREEN 12\nPOUR i = 1 JUSQUE 120\n  COULEUR 1 + i MOD 15\n  AVANCER i * 2\n  DROITE 61\nSUITE\n"] },
	{ title: ['256 colours', '256 couleurs'], src: [
		"' SCREEN 13: the 256 colours of the VGA palette\nSCREEN 13\nFOR c = 0 TO 255\n  x = (c MOD 16) * 20: y = (c \\ 16) * 12\n  LINE (x, y)-(x + 18, y + 10), c, BF\nNEXT\nLOCATE 25, 1: PRINT \"Press a key\";\nSLEEP\n",
		"' SCREEN 13 : les 256 couleurs de la palette VGA\nSCREEN 13\nPOUR c = 0 JUSQUE 255\n  x = (c MOD 16) * 20: y = (c \\ 16) * 12\n  LINE (x, y)-(x + 18, y + 10), c, BF\nSUITE\nLOCATE 25, 1: AFFICHER \"Appuie sur une touche\";\nSLEEP\n"] },
	{ title: ['A tune', 'Un air de musique'], src: [
		"' PLAY: QBasic's music language\nPRINT \"Ode to Joy\"\nPLAY \"T120 O3 L4 E E F G G F E D C C D E E. D8 D2\"\nPLAY \"E E F G G F E D C C D E D. C8 C2\"\n",
		"' PLAY : le langage de musique de QBasic\nAFFICHER \"L'Hymne à la joie\"\nPLAY \"T120 O3 L4 E E F G G F E D C C D E E. D8 D2\"\nPLAY \"E E F G G F E D C C D E D. C8 C2\"\n"] }];
function renderExamples ()
{
	let h = '<option value="">' + Site.esc (t ('Examples...', 'Exemples...')) + '</option>';
	MY_EXAMPLES.forEach ((x, i) => { h += '<option value="m' + i + '">' + Site.esc (x.title[Site.L]) + '</option>'; });
	const ONYX = { 'hello.bas': ['Hello, world (Onyx)', 'Hello, world (Onyx)'], 'guess.bas': ['Guess the number (Onyx)', 'Devine le nombre (Onyx)'],
		'graphics.bas': ['Lines and circles (Onyx)', 'Lignes et cercles (Onyx)'], 'arkanoid.bas': ['Arkanoid, a brick breaker (Onyx)', 'Arkanoid, un casse-briques (Onyx)'],
		'invaders.bas': ['Space Invaders', 'Space Invaders'] };
	(window.ONYX_EXAMPLES || []).forEach ((x, i) => { h += '<option value="o' + i + '">' + Site.esc ((ONYX[x.name] || [x.name, x.name])[Site.L]) + '</option>'; });
	$('examples').innerHTML = h;
}
$('examples').addEventListener ('change', () =>
{
	const v = $('examples').value; $('examples').value = '';
	if (!v) return;
	const src = v[0] === 'm' ? MY_EXAMPLES[+v.slice (1)].src[Site.L] : window.ONYX_EXAMPLES[+v.slice (1)].text;
	if (ed.value.trim () && ed.value !== src && !confirm (t ('Replace your program with this example?', 'Remplacer ton programme par cet exemple ?'))) return;
	if (pc && pc.running ()) pc.stop ();
	ed.value = src; badLine = 0; renderCode (); saveCode ();
	ed.scrollTop = 0; syncScroll ();
	message ('info', t ('An example: press Run.', 'Un exemple : appuie sur Lancer.'));
});
// the screen fitted to its room, its proportions kept (a 320-wide mode shown doubled, as in Onyx)
function fitScreen ()
{
	if (!pc) return;
	const wrap = $('screenWrap'), sc = pc.screen, aw = sc.W * sc.sx, ah = sc.H * sc.sy;
	const W = wrap.clientWidth - 16, H = wrap.clientHeight - 16;
	if (W <= 0 || H <= 0) return;
	const k = Math.min (W / aw, H / ah);
	$('screen').style.width = Math.floor (aw * k) + 'px'; $('screen').style.height = Math.floor (ah * k) + 'px';
}
new ResizeObserver (fitScreen).observe ($('screenWrap'));
function makeComputer ()
{
	if (pc) return pc;
	pc = new BasicScreen.Computer ($('screen'), {
		onEnd: freeEnded,
		onNeedKeyboard () { if (matchMedia ('(pointer: coarse)').matches) $('kbd').focus ({ preventScroll: true }); },
		onFullscreen (on) { const w = $('screenArea'); try { if (on && !document.fullscreenElement) w.requestFullscreen (); else if (!on && document.fullscreenElement) document.exitFullscreen (); } catch (e) { /* (a gesture needed) */ } } });
	pc.screen.onMode = fitScreen;
	pc.show ();
	return pc;
}
function freeRun ()
{
	makeComputer ();
	if (pc.running ()) return;
	if ($('lesson').open) $('lesson').close ();
	saveCode ();
	badLine = 0; renderCode ();
	let prog;
	try { prog = Basic.compile (ed.value, BasicScreen.FREE_DIALECT); }
	catch (e)
	{
		if (!(e instanceof Basic.BasicError)) throw e;
		badLine = e.line; renderCode (); showLine (e.line); showPane ('code');
		message ('err', Turtle.friendly (Site.L, e.line, e.message));
		return;
	}
	ed.readOnly = true; document.body.classList.add ('running');
	$('btRun').disabled = true; $('btStop').disabled = false;
	message ('info', t ('The program runs: its keys go to the screen. Stop ends it.', 'Le programme tourne : les touches vont à l\'écran. « Arrêter » le termine.'));
	showPane ('board');
	pc.start (prog, BasicScreen.FREE_DIALECT);
	fitScreen ();
	$('screen').focus ({ preventScroll: true });
}
function freeEnded (e)
{
	ed.readOnly = false; document.body.classList.remove ('running');
	$('btRun').disabled = false; $('btStop').disabled = true;
	if (e === null || e === undefined) { message ('info', t ('The program has ended.', 'Le programme est terminé.')); return; }
	if (e instanceof Basic.BasicError)
	{
		badLine = e.line; renderCode (); if (e.line) showLine (e.line);
		let show = null;
		if (Site.isPhone () && e.line)
		{
			show = document.createElement ('button');
			show.type = 'button'; show.className = 'btn small'; show.textContent = t ('Show the line', 'Voir la ligne');
			show.addEventListener ('click', () => { showPane ('code'); showLine (badLine); });
		}
		message ('err', Turtle.friendly (Site.L, e.line, e.message), 0, show);
		return;
	}
	message ('err', String (e && e.message || e));
	console.error (e);
}
function enterFree ()
{
	if (free) return;
	if (L) saveCode ();
	resetView ();
	free = true;
	document.body.classList.add ('free');
	P.pack = 'free'; save ();
	makeComputer ();
	ed.value = P.code.__free || '';
	badLine = 0; renderCode (); renderPlaceholder ();
	renderPacks ();
	const tb = $('tabBoard'); tb.dataset.en = 'Screen'; tb.dataset.fr = 'Écran'; tb.textContent = t ('Screen', 'Écran');
	if (matchMedia ('(pointer: coarse)').matches) { $('keypad').hidden = false; $('btKeys').setAttribute ('aria-pressed', 'true'); }
	message ('info', t ('Free mode: write any BASIC program, then Run. The screen is the computer\'s.', 'Mode libre : écris n\'importe quel programme BASIC, puis Lancer. L\'écran est celui de l\'ordinateur.'));
	showPane ('code');
	requestAnimationFrame (fitScreen);
}
function leaveFree ()
{
	if (!free) return;
	if (pc && pc.running ()) pc.stop ();
	saveCode ();
	free = false;
	document.body.classList.remove ('free');
	const tb = $('tabBoard'); tb.dataset.en = 'Board'; tb.dataset.fr = 'Plateau'; tb.textContent = t ('Board', 'Plateau');
	renderPlaceholder ();
}
$('btFull').addEventListener ('click', () => { const w = $('screenArea'); if (document.fullscreenElement) document.exitFullscreen (); else if (w.requestFullscreen) w.requestFullscreen ().then (() => setTimeout (fitScreen, 100)).catch (() => {}); $('screen').focus (); });
document.addEventListener ('fullscreenchange', () => setTimeout (fitScreen, 100));
$('btKeys').addEventListener ('click', () => { const on = $('keypad').hidden; $('keypad').hidden = !on; $('btKeys').setAttribute ('aria-pressed', String (on)); requestAnimationFrame (fitScreen); });
// the on-screen keys: held while pressed (KEYDOWN), typed once (INKEY$)
$('keypad').addEventListener ('pointerdown', (e) =>
{
	const b = e.target.closest ('button'); if (!b) return;
	e.preventDefault ();
	if (b.dataset.kbd) { $('kbd').focus (); return; }
	b.classList.add ('down');
	if (pc) pc.keyDown ({ key: b.dataset.key });
	const up = () => { b.classList.remove ('down'); if (pc) pc.keyUp ({ key: b.dataset.key }); b.removeEventListener ('pointerup', up); b.removeEventListener ('pointercancel', up); b.removeEventListener ('pointerleave', up); };
	b.addEventListener ('pointerup', up); b.addEventListener ('pointercancel', up); b.addEventListener ('pointerleave', up);
});
// a phone's keyboard: what is typed in the hidden field goes to the program
$('kbd').addEventListener ('input', () => { const v = $('kbd').value; $('kbd').value = ''; if (pc && v) for (const ch of v) pc.keyDown ({ key: ch }); });
$('kbd').addEventListener ('beforeinput', (e) => { if (e.inputType === 'deleteContentBackward' && pc && !$('kbd').value) { pc.keyDown ({ key: 'Backspace' }); } if (e.inputType === 'insertLineBreak' && pc) { e.preventDefault (); pc.keyDown ({ key: 'Enter' }); } });
document.addEventListener ('keyup', (e) => { if (free && pc) pc.keyUp (e); });

// ---- a level shown -----------------------------------------------------------------------------------------------------------------
function showLevel (p, l)
{
	if (!packs.length) return;
	leaveFree ();
	if (L) saveCode ();
	pk = p; lv = l; L = packs[p].levels[l];
	target = L.draw ? Turtle.targetOf (L) : null;
	ed.value = P.code[L.id] !== undefined ? P.code[L.id] : (L.start || '');
	badLine = 0; showHint = false;
	$('card').classList.add ('compact');
	P.pack = p; P.level = l; save ();
	$('packSel').value = String (p); $('freePack').value = String (p);
	resetView ();
	message ('none');
	renderList (); renderCard (); renderChips (); refreshCount ();
	layoutBoard ();
	showPane ('code');
	if (Turtle.CONCEPTS[L.topic] && !P.seen[L.topic]) showLesson ();
	const cur = document.querySelector ('.levels [aria-current="true"]'); if (cur) cur.scrollIntoView ({ block: 'nearest' });
}

let ready = false;
Site.onLang (() =>
{
	if (!ready) return;
	renderPacks (); renderList (); renderCard (); renderChips (); renderPlaceholder (); refreshCount (); draw (); renderExamples ();
	if (mode === 'idle' && !free) message ('none');
});
document.addEventListener ('DOMContentLoaded', () =>
{
	ready = true;
	renderPacks (); renderPlaceholder (); renderExamples ();
	const levels = packs[pk] ? packs[pk].levels.length : 0;
	showLevel (pk, Math.min (P.level | 0, Math.max (0, levels - 1)));
	if (P.pack === 'free' || new URLSearchParams (location.search).has ('free')) enterFree ();
});
}) ();
