// basic.js -- Onyx BASIC (QBasic's language) in the browser, for Turtle Quest's levels and its free mode.
//
// The language: variables (numbers, strings$), arrays (DIM a(10), a(1 TO 5, 3), REDIM, ERASE, LBOUND / UBOUND),
// TYPE ... END TYPE records, IF / ELSEIF / ELSE, FOR / NEXT, WHILE / WEND, DO / LOOP, REPEAT / END REPEAT (Onyx),
// SELECT CASE, SUB and FUNCTION (arguments by reference, recursion), DEF FN, CONST, GOTO / GOSUB / RETURN with labels
// and line numbers, ON ... GOTO / GOSUB, ON ERROR GOTO / RESUME, DATA / READ / RESTORE, SWAP, PRINT (; , TAB SPC
// USING), INPUT, LINE INPUT, and the string and math functions. Its French words are always known beside the
// English ones (SI ... ALORS, POUR ... JUSQUE ... SUITE, TANTQUE, REPETER, FONCTION...), even mixed in one program.
//
// The screen, the keyboard, the mouse and the sound are the host's: the statements CLS, SCREEN, COLOR, LOCATE, PSET,
// PRESET, LINE, CIRCLE, PAINT, DRAW, PALETTE, GET / PUT (sprites), DRAWTEXT, SLEEP, PAUSE, BEEP, SOUND, PLAY, NOTEON,
// NOTEOFF, FULLSCREEN go to host.gfx (op, args); the functions INKEY$, INPUT$, POINT, CSRLIN, POS, KEYDOWN, MOUSEX,
// MOUSEY, MOUSEB, PLAY, RGB to host.fn (name, args). A host's own words (the turtle's: FORWARD, WALL ()...) go to
// host.ext (name, args). No files (a page has none).
//
// Basic.compile (src, dialect) -> a program, or throws a BasicError (its line, its message).
// Basic.run (prog, host, dialect) runs it at once (Turtle Quest's levels: host.onStatement (line) before each
// statement, false stops it -- "endless"). Basic.start (prog, host, dialect) -> a generator for a program that
// waits (the free mode): it yields { wait: 'slice' } when host.onStatement returns 'yield' (time to show the screen),
// { wait: 'sleep', ms }, { wait: 'key' }, { wait: 'line' } (INPUT: the answer is passed back to next ()),
// { wait: 'chars', n } (INPUT$).
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function (global) {
'use strict';

class BasicError extends Error {
	constructor (msg, line, code) { super (msg); this.line = line || 0; this.code = code || 0; }
}
class Endless extends Error {}
class Jump { constructor (target) { this.target = target; } }		// GOTO: to a label of a block
class GosubReturn {}
class ResumeSig { constructor (kind, target) { this.kind = kind; this.target = target; } }
class Exit { constructor (what) { this.what = what; } }

// ---- the words -------------------------------------------------------------------------------------------------------
const KEYWORDS = new Set ([
	'AND', 'AS', 'CALL', 'CASE', 'CONST', 'DIM', 'DO', 'ELSE', 'ELSEIF', 'END', 'EQV', 'EXIT', 'FOR', 'FUNCTION',
	'GOSUB', 'GOTO', 'IF', 'IMP', 'INPUT', 'IS', 'LET', 'LOOP', 'MOD', 'NEXT', 'NOT', 'OR', 'PRINT', 'REM', 'RETURN',
	'SELECT', 'SHARED', 'STATIC', 'STEP', 'SUB', 'THEN', 'TO', 'UNTIL', 'WEND', 'WHILE', 'XOR', 'REPEAT', 'RANDOMIZE',
	'INTEGER', 'REAL', 'STRING', 'BYTE', 'LONG', 'SINGLE', 'DOUBLE', 'INTEGER16', 'INTEGER32', 'INTEGER64', 'REAL32', 'REAL64',
	'BYVAL', 'BYREF', 'DECLARE', 'STOP', 'SYSTEM',
	'DATA', 'READ', 'RESTORE', 'SWAP', 'REDIM', 'PRESERVE', 'ERASE', 'TYPE', 'ON', 'OFF', 'ERROR', 'RESUME', 'OPTION', 'DEF',
	'USING', 'CLS', 'SCREEN', 'COLOR', 'LOCATE', 'PSET', 'PRESET', 'LINE', 'CIRCLE', 'PAINT', 'DRAW', 'PALETTE', 'SLEEP',
	'BEEP', 'SOUND', 'PLAY', 'WIDTH', 'VIEW', 'WINDOW', 'GET', 'PUT', 'FULLSCREEN', 'PAUSE', 'DRAWTEXT', 'NOTEON', 'NOTEOFF',
	'OPEN', 'CLOSE', 'KILL', 'CHAIN', 'SHELL', 'FILES', 'KEY', 'PCOPY', 'WAIT']);
// BASIC's own French words (Onyx BASIC's bas::FRENCH): French -> English
const FRENCH = {
	SI: 'IF', ALORS: 'THEN', SINON: 'ELSE', SINONSI: 'ELSEIF', FIN: 'END',
	POUR: 'FOR', JUSQUE: 'TO', PAS: 'STEP', SUITE: 'NEXT', SUIVANT: 'NEXT',
	REPETER: 'REPEAT', REPETE: 'REPEAT', TANTQUE: 'WHILE', FINTANTQUE: 'WEND', FAIRE: 'DO', BOUCLE: 'LOOP', JUSQUA: 'UNTIL',
	FONCTION: 'FUNCTION', PROCEDURE: 'SUB', RETOUR: 'RETURN', APPELER: 'CALL', APPELLE: 'CALL', SORTIR: 'EXIT',
	COMME: 'AS', ENTIER: 'INTEGER', REEL: 'REAL', CHAINE: 'STRING', OCTET: 'BYTE',
	ENTIER16: 'INTEGER16', ENTIER32: 'INTEGER32', ENTIER64: 'INTEGER64', REEL32: 'REAL32', REEL64: 'REAL64',
	CONSTANTE: 'CONST', PARTAGE: 'SHARED', STATIQUE: 'STATIC',
	SELON: 'SELECT', CAS: 'CASE', ET: 'AND', OU: 'OR', NON: 'NOT', SUR: 'ON', ARRET: 'OFF',
	AFFICHER: 'PRINT', AFFICHE: 'PRINT', SAISIR: 'INPUT', 'TOUCHE$': 'INKEY$' };
// The English words as a French message shows them
const SHOWN_FR = {
	IF: 'SI', THEN: 'ALORS', ELSE: 'SINON', ELSEIF: 'SINON SI', END: 'FIN', FOR: 'POUR', TO: 'JUSQUE', STEP: 'PAS',
	NEXT: 'SUITE', REPEAT: 'REPETER', WHILE: 'TANTQUE', WEND: 'FIN TANTQUE', DO: 'FAIRE', LOOP: 'BOUCLE', UNTIL: 'JUSQUA',
	FUNCTION: 'FONCTION', SUB: 'SUB', EXIT: 'SORTIR', CALL: 'APPELER', SELECT: 'SELON', CASE: 'CAS', PRINT: 'AFFICHER',
	AND: 'ET', OR: 'OU', NOT: 'NON', CONST: 'CONSTANTE', AS: 'COMME', INPUT: 'SAISIR' };
// QBasic's error numbers (ERR)
const ERRNO = { 'NEXT without': 1, 'Syntax error': 2, 'RETURN without GOSUB': 3, 'Out of DATA': 4, 'Illegal function call': 5,
	'Overflow': 6, 'Subscript out of range': 9, 'Duplicate definition': 10, 'Division by zero': 11, 'Type mismatch': 13,
	'Out of stack space': 7, 'Label not defined': 8, 'Sub or function not defined': 35, 'Wrong number of arguments': 61,
	'not available': 73 };
const errNo = (msg) => { for (const k in ERRNO) if (msg.startsWith (k) || msg.includes (k)) return ERRNO[k]; return 5; };

// ---- the built-in functions ------------------------------------------------------------------------------------------
function num (v, line) { if (typeof v !== 'number') throw new BasicError ('Type mismatch', line); return v; }
function str (v, line) { if (typeof v !== 'string') throw new BasicError ('Type mismatch', line); return v; }
function fmtNum (n)
{
	if (!isFinite (n)) throw new BasicError ('Overflow');
	if (Number.isInteger (n) && Math.abs (n) < 1e16) return String (n);
	let s = Math.abs (n) >= 1e16 || (Math.abs (n) < 1e-7 && n !== 0) ? n.toExponential (6).replace (/\.?0+e/, 'E').replace ('e', 'E') : String (Number (n.toPrecision (7)));
	if (s.startsWith ('0.')) s = s.slice (1); else if (s.startsWith ('-0.')) s = '-' + s.slice (2);
	return s;
}
const ill = (l) => new BasicError ('Illegal function call', l);
let rndLast = 0;
const BUILTINS = {
	ABS: [1, 1, (a) => Math.abs (num (a[0]))], SGN: [1, 1, (a) => Math.sign (num (a[0]))],
	INT: [1, 1, (a) => Math.floor (num (a[0]))], FIX: [1, 1, (a) => Math.trunc (num (a[0]))],
	CINT: [1, 1, (a) => Math.round (num (a[0]))], CLNG: [1, 1, (a) => Math.round (num (a[0]))], CDBL: [1, 1, (a) => num (a[0])], CSNG: [1, 1, (a) => num (a[0])],
	SQR: [1, 1, (a, l) => { const x = num (a[0]); if (x < 0) throw ill (l); return Math.sqrt (x); }],
	SIN: [1, 1, (a) => Math.sin (num (a[0]))], COS: [1, 1, (a) => Math.cos (num (a[0]))], TAN: [1, 1, (a) => Math.tan (num (a[0]))],
	ATN: [1, 1, (a) => Math.atan (num (a[0]))], EXP: [1, 1, (a) => Math.exp (num (a[0]))],
	LOG: [1, 1, (a, l) => { const x = num (a[0]); if (x <= 0) throw ill (l); return Math.log (x); }],
	RND: [0, 1, (a) => { if (a.length && num (a[0]) === 0) return rndLast; rndLast = Math.random (); return rndLast; }],
	TIMER: [0, 0, () => { const d = new Date (); return d.getHours () * 3600 + d.getMinutes () * 60 + d.getSeconds () + d.getMilliseconds () / 1000; }],
	MIN: [2, 2, (a) => Math.min (num (a[0]), num (a[1]))], MAX: [2, 2, (a) => Math.max (num (a[0]), num (a[1]))],
	LEN: [1, 1, (a) => str (a[0]).length], ASC: [1, 1, (a, l) => { const s = str (a[0]); if (!s) throw ill (l); return s.charCodeAt (0); }],
	'CHR$': [1, 1, (a, l) => { const n = Math.round (num (a[0])); if (n < 0 || n > 255) throw ill (l); return String.fromCharCode (n); }],
	'STR$': [1, 1, (a) => { const n = num (a[0]); return (n >= 0 ? ' ' : '') + fmtNum (n); }],
	VAL: [1, 1, (a) => { const s = str (a[0]).trim (); if (/^&H/i.test (s)) return parseInt (s.slice (2), 16) || 0; const v = parseFloat (s.replace (/\s+/g, '')); return isNaN (v) ? 0 : v; }],
	'LEFT$': [2, 2, (a) => str (a[0]).slice (0, Math.max (0, num (a[1])))],
	'RIGHT$': [2, 2, (a) => { const s = str (a[0]), n = Math.max (0, num (a[1])); return n ? s.slice (-n) : ''; }],
	'MID$': [2, 3, (a) => { const s = str (a[0]), st = Math.max (1, num (a[1])); return a.length > 2 ? s.substr (st - 1, Math.max (0, num (a[2]))) : s.substr (st - 1); }],
	'UCASE$': [1, 1, (a) => str (a[0]).toUpperCase ()], 'LCASE$': [1, 1, (a) => str (a[0]).toLowerCase ()],
	'LTRIM$': [1, 1, (a) => str (a[0]).replace (/^ +/, '')], 'RTRIM$': [1, 1, (a) => str (a[0]).replace (/ +$/, '')],
	'TRIM$': [1, 1, (a) => str (a[0]).trim ()], 'SPACE$': [1, 1, (a) => ' '.repeat (Math.max (0, num (a[0])))],
	'STRING$': [2, 2, (a) => (typeof a[1] === 'string' ? a[1][0] || '' : String.fromCharCode (num (a[1]))).repeat (Math.max (0, num (a[0])))],
	'HEX$': [1, 1, (a) => (Math.round (num (a[0])) >>> 0).toString (16).toUpperCase ()], 'OCT$': [1, 1, (a) => (Math.round (num (a[0])) >>> 0).toString (8)],
	INSTR: [2, 3, (a) => { if (a.length === 3) return str (a[1]).indexOf (str (a[2]), Math.max (0, num (a[0]) - 1)) + 1; return str (a[0]).indexOf (str (a[1])) + 1; }],
	'DATE$': [0, 0, () => { const d = new Date (), p = (n) => String (n).padStart (2, '0'); return p (d.getMonth () + 1) + '-' + p (d.getDate ()) + '-' + d.getFullYear (); }],
	'TIME$': [0, 0, () => new Date ().toTimeString ().slice (0, 8)],
	FRE: [0, 1, () => 600000] };
// The functions the screen gives (host.fn); their arguments' counts
const HOSTFN = { 'INKEY$': [0, 0], 'INPUT$': [1, 2], POINT: [1, 2], CSRLIN: [0, 0], POS: [0, 1], KEYDOWN: [1, 1], MOUSEX: [0, 0], MOUSEY: [0, 0],
	MOUSEB: [0, 0], PLAY: [1, 1], RGB: [3, 3], TICKS: [0, 0] };

// ---- the tokens ----------------------------------------------------------------------------------------------------------
// A word's key: upper case, its accents dropped (RÉPÉTER is REPETER)
function plain (w) { return w.normalize ('NFD').replace (/[̀-ͯ]/g, '').toUpperCase (); }

function tokenize (src, dialect)
{
	const qb = !!(dialect && dialect.qbasic), mapStr = dialect && dialect.mapStr;
	const toks = [];
	const lines = src.replace (/\r/g, '').split ('\n');
	const word = (raw) =>
	{
		let u = plain (raw);
		if (FRENCH[u]) u = FRENCH[u];
		else if (dialect && dialect.aliases && dialect.aliases[u]) u = dialect.aliases[u];
		return u;
	};
	for (let ln = 0; ln < lines.length; ln++)
	{
		const s = lines[ln], line = ln + 1;
		let i = 0, stmtStart = true, lineStart = true;
		while (i < s.length)
		{
			const c = s[i];
			if (c === ' ' || c === '\t') { i++; continue; }
			if (c === "'") break;
			if (c === '"')
			{
				let j = i + 1; while (j < s.length && s[j] !== '"') j++;
				const v = s.slice (i + 1, j);
				toks.push ({ t: 'str', v: mapStr ? mapStr (v) : v, line });
				i = j + 1; stmtStart = false; lineStart = false; continue;
			}
			if (c === '&' && /[HhOo]/.test (s[i + 1] || ''))
			{
				const m = /^&([Hh][0-9A-Fa-f]+|[Oo][0-7]+)/.exec (s.slice (i));
				if (m) { toks.push ({ t: 'num', v: parseInt (m[1].slice (1), /[Hh]/.test (m[1][0]) ? 16 : 8), line }); i += m[0].length; stmtStart = lineStart = false; continue; }
			}
			if (/[0-9.]/.test (c) && (c !== '.' || /[0-9]/.test (s[i + 1] || '')))
			{
				const m = /^(\d*\.?\d*)([eEdD][+-]?\d+)?[!#%&]?/.exec (s.slice (i));
				const v = parseFloat (m[0].replace (/[dD]/, 'e').replace (/[!#%&]$/, ''));
				if (qb && lineStart) toks.push ({ t: 'label', v: String (v), line });	// (a line number)
				else toks.push ({ t: 'num', v, line });
				i += m[0].length; stmtStart = false; lineStart = false; continue;
			}
			if (/[\p{L}_]/u.test (c))
			{
				let j = i + 1; while (j < s.length && /[\p{L}\p{N}_.]/u.test (s[j])) j++;
				while (j > i + 1 && s[j - 1] === '.') j--;
				if (j < s.length && /[$%!#&]/.test (s[j])) j++;
				const raw = s.slice (i, j);
				const u = word (raw);
				i = j;
				if (u === 'REM' && stmtStart) break;
				// a label: a name, then ':' (not ':='), first on its line (the free mode)
				if (qb && lineStart && !KEYWORDS.has (u) && !(dialect.words && dialect.words[u]) && /^\s*:/.test (s.slice (i)))
				{
					toks.push ({ t: 'label', v: u, line });
					i = s.indexOf (':', i) + 1; lineStart = false; stmtStart = true; continue;
				}
				lineStart = false;
				if (u === 'DATA' && stmtStart)
				{
					// DATA: its items, raw text (quoted: as they are), to the end of the line or a ':'
					const items = []; let k = i;
					for (;;)
					{
						while (k < s.length && (s[k] === ' ' || s[k] === '\t')) k++;
						let v = '';
						if (s[k] === '"') { const e = s.indexOf ('"', k + 1); v = e < 0 ? s.slice (k + 1) : s.slice (k + 1, e); k = e < 0 ? s.length : e + 1; while (k < s.length && s[k] !== ',' && s[k] !== ':') k++; items.push ({ q: true, v: mapStr ? mapStr (v) : v }); }
						else { const st = k; while (k < s.length && s[k] !== ',' && s[k] !== ':') k++; v = s.slice (st, k).trim (); items.push ({ q: false, v }); }
						if (s[k] === ',') { k++; continue; }
						break;
					}
					toks.push ({ t: 'data', items, line });
					i = k; stmtStart = false; continue;
				}
				if (KEYWORDS.has (u) && !(dialect && dialect.words && dialect.words[u])) toks.push ({ t: 'kw', v: u, raw, line });
				else toks.push ({ t: 'id', v: u, raw, line });
				stmtStart = false; continue;
			}
			lineStart = false;
			const two = s.slice (i, i + 2);
			if (two === '<=' || two === '>=' || two === '<>' || two === '=<' || two === '=>' || two === '><')
			{ toks.push ({ t: 'op', v: two === '=<' ? '<=' : two === '=>' ? '>=' : two === '><' ? '<>' : two, line }); i += 2; stmtStart = false; continue; }
			if (c === ':') { toks.push ({ t: 'sep', v: ':', line }); i++; stmtStart = true; continue; }
			if ('+-*/\\^=<>(),;#.'.includes (c)) { toks.push ({ t: 'op', v: c, line }); i++; stmtStart = false; continue; }
			throw new BasicError ('Syntax error', line);
		}
		toks.push ({ t: 'eol', line });
	}
	toks.push ({ t: 'eof', line: lines.length });
	return toks;
}

// ---- the parser ----------------------------------------------------------------------------------------------------------
const GFX_ONLY = ['WAIT', 'CLS', 'SCREEN', 'COLOR', 'LOCATE', 'PSET', 'PRESET', 'CIRCLE', 'PAINT', 'DRAW', 'PALETTE', 'SLEEP', 'BEEP', 'SOUND',
	'PLAY', 'GET', 'PUT', 'FULLSCREEN', 'PAUSE', 'DRAWTEXT', 'NOTEON', 'NOTEOFF', 'WIDTH'];
class Parser
{
	constructor (toks, dialect)
	{
		this.toks = toks; this.p = 0; this.dialect = dialect || {}; this.procs = {}; this.inProc = null;
		this.labels = { '': {} };	// scope ('' the module, or a procedure's name) -> label -> { arr, idx, data }
		this.refs = [];			// the labels used: { scope, name, line } (checked at the end)
		this.data = []; this.types = {};
	}
	peek (k = 0) { return this.toks[Math.min (this.p + k, this.toks.length - 1)]; }
	next () { return this.toks[this.p++]; }
	isKw (w, k = 0) { const t = this.peek (k); return t.t === 'kw' && t.v === w; }
	isOp (o, k = 0) { const t = this.peek (k); return t.t === 'op' && t.v === o; }
	err (msg, line) { throw new BasicError (msg || 'Syntax error', line || this.peek ().line); }
	expectKw (w) { if (!this.isKw (w)) this.err ('Expected ' + w); return this.next (); }
	expectOp (o) { if (!this.isOp (o)) this.err ('Expected ' + o); return this.next (); }
	stmtEnd (k = 0) { const t = this.peek (k); return t.t === 'sep' || t.t === 'eol' || t.t === 'eof' || (t.t === 'kw' && t.v === 'ELSE'); }
	// A statement ended: another word after it is a second instruction on the same line
	endStmt ()
	{
		if (this.stmtEnd ()) return;
		const t = this.peek ();
		if (t.t === 'id' || t.t === 'kw') throw new BasicError ('Two instructions: ' + t.raw, t.line);
		this.err ();
	}
	scope () { return this.inProc ? this.inProc.name : ''; }
	labelRef (line, module) { const t = this.next (); if (t.t !== 'id' && t.t !== 'num' && t.t !== 'label') this.err (); const name = t.t === 'num' ? String (t.v) : t.v; this.refs.push ({ scope: module ? '' : this.scope (), name, line }); return name; }

	program ()
	{
		const body = this.block ([], 'top');
		for (const r of this.refs)
			if (!this.labels[r.scope][r.name]) throw new BasicError ('Label not defined: ' + r.name, r.line);
		return { body: body.stmts, procs: this.procs, labels: this.labels, data: this.data, types: this.types };
	}
	// What closes a block, at a statement's start: 'NEXT', 'WEND', 'LOOP', 'ELSE', 'ELSEIF', 'CASE', 'END IF'...
	closer ()
	{
		const t = this.peek ();
		if (t.t !== 'kw') return null;
		switch (t.v)
		{
		case 'NEXT': case 'WEND': case 'LOOP': case 'ELSEIF': case 'CASE': return t.v;
		case 'ELSE': return this.isKw ('IF', 1) ? 'ELSEIF' : 'ELSE';
		case 'END':
		{
			const n = this.peek (1);
			if (n.t === 'kw' && ['IF', 'SUB', 'FUNCTION', 'SELECT', 'REPEAT', 'WHILE', 'TYPE'].includes (n.v)) return 'END ' + n.v;
			return null;
		}
		}
		return null;
	}
	// Statements until one of the closers `ends` (not consumed) -> { stmts, closer }
	block (ends, opener, openLine)
	{
		const stmts = [];
		for (;;)
		{
			const t = this.peek ();
			if (t.t === 'sep' || t.t === 'eol') { this.next (); continue; }
			if (t.t === 'label')
			{
				this.next ();
				const sc = this.labels[this.scope ()];
				if (sc[t.v]) this.err ('Duplicate label: ' + t.v, t.line);
				sc[t.v] = { arr: stmts, idx: stmts.length, data: this.data.length };
				continue;
			}
			if (t.t === 'data') { this.next (); for (const it of t.items) this.data.push (it); continue; }
			if (t.t === 'eof')
			{
				if (opener === 'top') return { stmts, closer: null };
				this.err (opener + ' without ' + ends[ends.length - 1], openLine);
			}
			const c = this.closer ();
			if (c)
			{
				if (ends.includes (c) || (c === 'END WHILE' && ends.includes ('WEND'))) return { stmts, closer: c };
				const OPEN = { NEXT: 'FOR', WEND: 'WHILE', 'END WHILE': 'WHILE', LOOP: 'DO', ELSE: 'IF', ELSEIF: 'IF', CASE: 'SELECT CASE',
					'END IF': 'IF', 'END SUB': 'SUB', 'END FUNCTION': 'FUNCTION', 'END SELECT': 'SELECT', 'END REPEAT': 'REPEAT', 'END TYPE': 'TYPE' };
				if (opener !== 'top') this.err (opener + ' without ' + ends[ends.length - 1], openLine);
				this.err (c + ' without ' + OPEN[c]);
			}
			const s = this.statement (opener === 'top');
			if (s) stmts.push (s);
		}
	}
	skipEnd2 () { this.next (); this.next (); }		// END X
	// ( x, y ) with STEP before it -> { step, x, y }
	point ()
	{
		let step = false;
		if (this.isKw ('STEP')) { this.next (); step = true; }
		this.expectOp ('('); const x = this.expr (); this.expectOp (','); const y = this.expr (); this.expectOp (')');
		return { step, x, y };
	}
	// an optional argument: an expression, or nothing before ',' / the end
	opt () { return this.stmtEnd () || this.isOp (',') ? null : this.expr (); }
	comma () { if (this.isOp (',')) { this.next (); return true; } return false; }
	// an lvalue: a name, an array's element, a record's field (a(i).x)
	lvalue ()
	{
		const id = this.next (); if (id.t !== 'id') this.err ();
		let idx = null, name = id.v;
		if (this.isOp ('(')) { this.next (); idx = this.argList (')'); this.expectOp (')'); }
		if (idx && this.isOp ('.') && this.peek (1).t === 'id') { this.next (); name += '.' + this.next ().v; }
		return { name, idx, line: id.line };
	}
	statement (top)
	{
		const t = this.peek (), line = t.line;
		if (t.t === 'kw')
		{
			switch (t.v)
			{
			case 'IF': return this.ifStmt ();
			case 'FOR': return this.forStmt ();
			case 'WHILE':
			{
				this.next (); const cond = this.expr (); this.endStmt ();
				const b = this.block (['WEND', 'END WHILE'], 'WHILE', line);
				if (b.closer === 'WEND') this.next (); else this.skipEnd2 ();
				return { k: 'while', cond, body: b.stmts, line };
			}
			case 'DO':
			{
				this.next ();
				let pre = null, post = null;
				if (this.isKw ('WHILE') || this.isKw ('UNTIL')) { const u = this.next ().v === 'UNTIL'; pre = { until: u, cond: this.expr () }; }
				this.endStmt ();
				const b = this.block (['LOOP'], 'DO', line);
				const lline = this.next ().line;
				if (this.isKw ('WHILE') || this.isKw ('UNTIL')) { const u = this.next ().v === 'UNTIL'; post = { until: u, cond: this.expr (), line: lline }; }
				return { k: 'do', pre, post, body: b.stmts, line };
			}
			case 'REPEAT':
			{
				this.next (); const n = this.expr (); this.endStmt ();
				const b = this.block (['END REPEAT'], 'REPEAT', line);
				this.skipEnd2 ();
				return { k: 'repeat', n, body: b.stmts, line };
			}
			case 'SELECT': return this.selectStmt ();
			case 'SUB': case 'FUNCTION':
				if (!top || this.inProc) this.err (t.v + ' inside a block');
				this.procDef ();
				return null;
			case 'DEF':
			{
				// DEF FNname (params) = expression
				this.next ();
				const id = this.next (); if (id.t !== 'id' || !id.v.startsWith ('FN')) this.err ();
				const params = [];
				if (this.isOp ('(')) { this.next (); while (!this.isOp (')')) { const p = this.next (); if (p.t !== 'id') this.err (); params.push ({ name: p.v, arr: false }); if (!this.comma ()) break; } this.expectOp (')'); }
				this.expectOp ('=');
				const e = this.expr (); this.endStmt ();
				this.procs[id.v] = { name: id.v, kind: 'FUNCTION', params, body: [{ k: 'assign', name: id.v, idx: null, expr: e, line }], line, def: true };
				return null;
			}
			case 'DECLARE': while (!this.stmtEnd ()) this.next (); return null;
			case 'TYPE':
			{
				if (!top) this.err ('TYPE inside a block');
				this.next ();
				const id = this.next (); if (id.t !== 'id') this.err ();
				const fields = [];
				for (;;)
				{
					while (this.peek ().t === 'eol' || this.peek ().t === 'sep') this.next ();
					if (this.isKw ('END') && this.isKw ('TYPE', 1)) { this.skipEnd2 (); break; }
					if (this.peek ().t === 'eof') this.err ('TYPE without END TYPE', line);
					const f = this.next (); if (f.t !== 'id') this.err ();
					this.expectKw ('AS');
					const ty = this.next ();
					if (this.isOp ('*')) { this.next (); this.next (); }
					fields.push ({ name: f.v, isStr: ty.v === 'STRING' || f.v.endsWith ('$'), type: ty.v });
				}
				this.types[id.v] = fields;
				return null;
			}
			case 'EXIT':
			{
				this.next ();
				const w = this.next ();
				if (w.t !== 'kw' || !['SUB', 'FUNCTION', 'FOR', 'DO', 'WHILE', 'REPEAT', 'DEF'].includes (w.v)) this.err ();
				return { k: 'exit', what: w.v === 'DEF' ? 'FUNCTION' : w.v, line };
			}
			case 'RETURN': this.next (); if (!this.stmtEnd ()) this.labelRef (line); return { k: 'return', line };
			case 'GOTO': { this.next (); const name = this.labelRef (line); return { k: 'goto', name, line }; }
			case 'GOSUB': { this.next (); const name = this.labelRef (line); return { k: 'gosub', name, line }; }
			case 'ON': return this.onStmt ();
			case 'RESUME':
			{
				this.next ();
				if (this.isKw ('NEXT')) { this.next (); return { k: 'resume', kind: 'next', line }; }
				if (this.stmtEnd () || (this.peek ().t === 'num' && this.peek ().v === 0)) { if (!this.stmtEnd ()) this.next (); return { k: 'resume', kind: 'again', line }; }
				return { k: 'resume', kind: 'label', name: this.labelRef (line, true), line };
			}
			case 'ERROR': this.next (); return { k: 'error', e: this.expr (), line };
			case 'END': case 'STOP': case 'SYSTEM': this.next (); this.endStmt (); return { k: 'end', line };
			case 'PRINT': return this.printStmt ();
			case 'INPUT': return this.inputStmt (false);
			case 'LINE':
				if (this.isKw ('INPUT', 1)) { this.next (); return this.inputStmt (true); }
				return this.lineStmt ();
			case 'DIM': case 'REDIM': case 'STATIC': return this.dimStmt ();
			case 'ERASE': { this.next (); const names = []; do { const id = this.next (); if (id.t !== 'id') this.err (); names.push (id.v); } while (this.comma ()); return { k: 'erase', names, line }; }
			case 'SHARED':
			{
				this.next (); const names = [];
				do { const id = this.next (); if (id.t !== 'id') this.err (); names.push (id.v); if (this.isOp ('(')) { this.next (); this.expectOp (')'); } this.asType (); } while (this.comma ());
				return { k: 'shared', names, line };
			}
			case 'CONST':
			{
				this.next (); const out = [];
				do { const id = this.next (); if (id.t !== 'id') this.err (); this.asType (); this.expectOp ('='); out.push ({ k: 'const', name: id.v, expr: this.expr (), line }); } while (this.comma ());
				return out.length === 1 ? out[0] : { k: 'seq', body: out, line };
			}
			case 'LET': this.next (); return this.assignOrCall (true);
			case 'CALL':
			{
				this.next ();
				const id = this.next (); if (id.t !== 'id') this.err ();
				let args = [];
				if (this.isOp ('(')) { this.next (); args = this.argList (')'); this.expectOp (')'); }
				this.endStmt ();
				return { k: 'call', name: id.v, args, line };
			}
			case 'RANDOMIZE': this.next (); if (!this.stmtEnd ()) this.expr (); return null;
			case 'OPTION':
			{
				this.next ();
				if (this.peek ().v === 'BASE') { this.next (); const n = this.next (); return { k: 'base', n: n.v, line }; }
				while (!this.stmtEnd ()) this.next ();
				return null;
			}
			case 'READ': { this.next (); const vars = []; do vars.push (this.lvalue ()); while (this.comma ()); return { k: 'read', vars, line }; }
			case 'RESTORE': { this.next (); return { k: 'restore', name: this.stmtEnd () ? null : this.labelRef (line, true), line }; }
			case 'SWAP': { this.next (); const a = this.lvalue (); this.expectOp (','); const b = this.lvalue (); return { k: 'swap', a, b, line }; }
			case 'OPEN': case 'CLOSE': case 'KILL': case 'CHAIN': case 'SHELL': case 'FILES':
				this.err (t.v + ' is not available here (no files in a web page)');
			case 'VIEW': case 'WINDOW': case 'KEY': case 'PCOPY':
				this.err (t.v + ' is not available here');
			}
			if (GFX_ONLY.includes (t.v)) return this.gfxStmt ();
			this.err ();
		}
		if (t.t === 'id' && t.v === 'TIMER' && (this.isKw ('ON', 1) || this.isKw ('OFF', 1) || this.isKw ('STOP', 1)))
		{ this.next (); return { k: 'timer', mode: this.next ().v, line }; }
		if (t.t === 'id') return this.assignOrCall (false);
		this.err ();
	}
	asType () { if (this.isKw ('AS')) { this.next (); const ty = this.next (); if (ty.t !== 'kw' && ty.t !== 'id') this.err (); if (this.isOp ('*')) { this.next (); this.next (); } return ty.v; } return null; }
	assignOrCall (letOnly)
	{
		const id = this.next (), line = id.line;
		if (this.isOp ('=')) { this.next (); const e = this.expr (); this.endStmt (); return { k: 'assign', name: id.v, idx: null, expr: e, line }; }
		if (this.isOp ('('))
		{
			const save = this.p;
			this.next (); const args = this.argList (')'); this.expectOp (')');
			let name = id.v;
			if (this.isOp ('.') && this.peek (1).t === 'id') { this.next (); name += '.' + this.next ().v; }
			if (this.isOp ('=')) { this.next (); const e = this.expr (); this.endStmt (); return { k: 'assign', name, idx: args, expr: e, line }; }
			if (letOnly) this.err ();
			if (this.stmtEnd ()) return { k: 'call', name: id.v, args, line };
			this.p = save;
		}
		if (letOnly) this.err ();
		const n = this.peek ();
		if (n.t === 'id' && this.dialect.words && this.dialect.words[n.v] && this.dialect.words[n.v].kind === 's')
			throw new BasicError ('Two instructions: ' + n.raw, n.line);	// (FORWARD RIGHT: two words, not a value)
		const args = this.stmtEnd () ? [] : this.argList (null);
		this.endStmt ();
		return { k: 'call', name: id.v, args, line };
	}
	argList (close)
	{
		const a = [];
		if (close && this.isOp (close)) return a;
		a.push (this.arg ());
		while (this.isOp (',')) { this.next (); a.push (this.arg ()); }
		return a;
	}
	// an argument: an expression, or an array whole (a ())
	arg ()
	{
		if (this.peek ().t === 'id' && this.isOp ('(', 1) && this.isOp (')', 2)) { const id = this.next (); this.next (); this.next (); return { k: 'arrref', name: id.v }; }
		return this.expr ();
	}
	ifStmt ()
	{
		const line = this.next ().line;
		const cond = this.expr ();
		if (this.isKw ('GOTO')) { this.next (); const name = this.labelRef (line); return { k: 'if', conds: [{ cond, body: [{ k: 'goto', name, line }], line }], els: null, line }; }
		this.expectKw ('THEN');
		if (!this.stmtEnd () || this.peek ().t === 'sep' || this.isKw ('ELSE'))
		{
			// a single-line IF: THEN's statements, ELSE's, to the end of the line
			if (this.peek ().t === 'sep') this.next ();
			const body = this.lineStmts (true), els = this.isKw ('ELSE') ? (this.next (), this.lineStmts (false)) : null;
			return { k: 'if', conds: [{ cond, body, line }], els, line };
		}
		const conds = [], openLine = line;
		let c = cond, cl = line, els = null;
		for (;;)
		{
			const b = this.block (['ELSEIF', 'ELSE', 'END IF'], 'IF', openLine);
			conds.push ({ cond: c, body: b.stmts, line: cl });
			if (b.closer === 'END IF') { this.skipEnd2 (); break; }
			if (b.closer === 'ELSEIF')
			{
				cl = this.peek ().line;
				if (this.isKw ('ELSE')) this.next ();
				this.next ();
				c = this.expr (); this.expectKw ('THEN');
				continue;
			}
			this.next ();						// ELSE
			const e = this.block (['END IF'], 'IF', openLine);
			els = e.stmts; this.skipEnd2 ();
			break;
		}
		return { k: 'if', conds, els, line };
	}
	// A single-line IF's statements (to ELSE when stopAtElse, or to the line's end); a number alone: GOTO it
	lineStmts (stopAtElse)
	{
		const out = [];
		for (;;)
		{
			const t = this.peek ();
			if (t.t === 'eol' || t.t === 'eof') break;
			if (t.t === 'sep') { this.next (); continue; }
			if (stopAtElse && this.isKw ('ELSE')) break;
			if (t.t === 'num' || t.t === 'label') { const name = this.labelRef (t.line); out.push ({ k: 'goto', name, line: t.line }); continue; }
			const s = this.statement (false);
			if (s) out.push (s);
		}
		return out;
	}
	forStmt ()
	{
		const line = this.next ().line;
		const v = this.next (); if (v.t !== 'id') this.err ();
		this.expectOp ('='); const from = this.expr ();
		this.expectKw ('TO'); const to = this.expr ();
		let step = null; if (this.isKw ('STEP')) { this.next (); step = this.expr (); }
		this.endStmt ();
		const b = this.block (['NEXT'], 'FOR', line);
		this.next ();
		if (this.peek ().t === 'id')
		{
			this.next ();
			// NEXT j, i: this NEXT closes the outer FOR too -- leave a NEXT for it
			if (this.isOp (',')) { const t = this.peek (); t.t = 'kw'; t.v = 'NEXT'; }
		}
		return { k: 'for', v: v.v, from, to, step, body: b.stmts, line };
	}
	selectStmt ()
	{
		const line = this.next ().line;
		this.expectKw ('CASE');
		const e = this.expr (); this.endStmt ();
		const cases = []; let els = null;
		let b = this.block (['CASE', 'END SELECT'], 'SELECT', line);
		while (b.closer === 'CASE')
		{
			const cl = this.next ().line;
			if (this.isKw ('ELSE'))
			{
				this.next ();
				const eb = this.block (['END SELECT'], 'SELECT', line);
				els = eb.stmts; b = eb; break;
			}
			const tests = [];
			do
			{
				if (this.isKw ('IS')) { this.next (); const op = this.next (); if (op.t !== 'op') this.err (); tests.push ({ op: op.v, a: this.expr () }); }
				else { const a = this.expr (); if (this.isKw ('TO')) { this.next (); tests.push ({ op: 'TO', a, b: this.expr () }); } else tests.push ({ op: '=', a }); }
			} while (this.comma ());
			const cb = this.block (['CASE', 'END SELECT'], 'SELECT', line);
			cases.push ({ tests, body: cb.stmts, line: cl });
			b = cb;
		}
		this.skipEnd2 ();
		return { k: 'select', e, cases, els, line };
	}
	onStmt ()
	{
		const line = this.next ().line;
		if (this.peek ().t === 'id' && this.peek ().v === 'TIMER')
		{
			this.next (); this.expectOp ('('); const e = this.expr (); this.expectOp (')');
			this.expectKw ('GOSUB');
			return { k: 'ontimer', e, name: this.labelRef (line, true), line };
		}
		if (this.isKw ('ERROR'))
		{
			this.next (); this.expectKw ('GOTO');
			const t = this.peek ();
			if (t.t === 'num' && t.v === 0) { this.next (); return { k: 'onerror', name: null, line }; }
			return { k: 'onerror', name: this.labelRef (line, true), line };
		}
		const e = this.expr ();
		const how = this.next ();
		if (how.t !== 'kw' || (how.v !== 'GOTO' && how.v !== 'GOSUB')) this.err ();
		const names = []; do names.push (this.labelRef (line)); while (this.comma ());
		return { k: 'on', e, gosub: how.v === 'GOSUB', names, line };
	}
	procDef ()
	{
		const kw = this.next (), line = kw.line;
		const id = this.next (); if (id.t !== 'id') this.err ();
		const params = [];
		if (this.isOp ('('))
		{
			this.next ();
			while (!this.isOp (')'))
			{
				if (this.isKw ('BYVAL') || this.isKw ('BYREF')) this.next ();
				const p = this.next (); if (p.t !== 'id') this.err ();
				let arr = false;
				if (this.isOp ('(')) { this.next (); this.expectOp (')'); arr = true; }
				this.asType ();
				params.push ({ name: p.v, arr });
				if (this.isOp (',')) this.next (); else break;
			}
			this.expectOp (')');
		}
		this.asType ();
		if (this.isKw ('STATIC')) this.next ();
		this.endStmt ();
		if (this.procs[id.v]) this.err ('Duplicate definition', line);
		const proc = { name: id.v, kind: kw.v, params, body: null, line };
		this.procs[id.v] = proc;
		this.inProc = proc; this.labels[id.v] = {};
		const b = this.block (['END ' + kw.v], kw.v, line);
		this.skipEnd2 ();
		this.inProc = null;
		proc.body = b.stmts;
	}
	printStmt ()
	{
		const line = this.next ().line, items = [];
		if (this.isOp ('#')) this.err ('PRINT # is not available here (no files in a web page)');
		let using = null;
		if (this.isKw ('USING')) { this.next (); using = this.expr (); if (!this.isOp (';') && !this.isOp (',')) this.err (); this.next (); }
		while (!this.stmtEnd ())
		{
			if (this.isOp (';') || this.isOp (',')) { items.push ({ sep: this.next ().v }); continue; }
			const t = this.peek ();
			if (t.t === 'id' && (t.v === 'TAB' || t.v === 'SPC') && this.isOp ('(', 1))
			{
				this.next (); this.next (); const e = this.expr (); this.expectOp (')');
				items.push (t.v === 'TAB' ? { tab: e } : { spc: e });
				continue;
			}
			items.push ({ e: this.expr () });
		}
		return { k: 'print', items, using, line };
	}
	inputStmt (lineInput)
	{
		const line = this.next ().line;
		if (this.isOp ('#')) this.err ('INPUT # is not available here (no files in a web page)');
		let noNl = false, prompt = null, q = true;
		if (this.isOp (';')) { this.next (); noNl = true; }
		if (this.peek ().t === 'str')
		{
			prompt = this.next ().v;
			if (this.isOp (',')) { this.next (); q = false; } else this.expectOp (';');
		}
		const vars = [];
		do vars.push (this.lvalue ()); while (!lineInput && this.comma ());
		return { k: 'input', vars, prompt, q: lineInput ? false : q, noNl, lineInput, line };
	}
	lineStmt ()
	{
		const line = this.next ().line;
		let a = null;
		if (!this.isOp ('-')) a = this.point ();
		this.expectOp ('-');
		const b = this.point ();
		let c = null, box = '', style = null;
		if (this.comma ())
		{
			c = this.opt ();
			if (this.comma ())
			{
				if (this.peek ().t === 'id' && (this.peek ().v === 'B' || this.peek ().v === 'BF')) box = this.next ().v;
				if (this.comma ()) style = this.opt ();
			}
		}
		return { k: 'gfx', op: 'LINE', a, b, c, box, style, line };
	}
	gfxStmt ()
	{
		const t = this.next (), op = t.v, line = t.line;
		const args = [];
		const list = () => { if (this.stmtEnd ()) return; do args.push (this.opt ()); while (this.comma ()); };
		switch (op)
		{
		case 'PSET': case 'PRESET':
		{
			const p = this.point (); let c = null;
			if (this.comma ()) c = this.opt ();
			return { k: 'gfx', op, p, c, line };
		}
		case 'CIRCLE':
		{
			const p = this.point (); this.expectOp (','); const r = this.expr ();
			const rest = [];
			while (this.comma ()) rest.push (this.peek ().t === 'id' && this.peek ().v === 'F' ? (this.next (), { fill: true }) : this.opt ());
			return { k: 'gfx', op, p, r, rest, line };
		}
		case 'PAINT':
		{
			const p = this.point (); const rest = [];
			while (this.comma ()) rest.push (this.opt ());
			return { k: 'gfx', op, p, rest, line };
		}
		case 'GET':
		{
			if (this.isOp ('#')) this.err ('GET # is not available here (no files in a web page)');
			const a = this.point (); this.expectOp ('-'); const b = this.point (); this.expectOp (',');
			const v = this.lvalue ();
			return { k: 'gfx', op, a, b, v, line };
		}
		case 'PUT':
		{
			if (this.isOp ('#')) this.err ('PUT # is not available here (no files in a web page)');
			const p = this.point (); this.expectOp (',');
			const v = this.lvalue ();
			let mode = 'XOR';
			if (this.comma ()) { const m = this.next (); mode = m.v; }
			return { k: 'gfx', op, p, v, mode, line };
		}
		case 'FULLSCREEN':
			if (this.isKw ('ON') || this.isKw ('OFF')) args.push (this.next ().v === 'ON' ? -1 : 0);
			return { k: 'gfx', op, args: args.map ((v) => ({ k: 'num', v })), line };
		case 'SCREEN': case 'WIDTH': list (); return { k: 'gfx', op, args, line };
		}
		list ();
		return { k: 'gfx', op, args, line };
	}
	dimStmt ()
	{
		const kw = this.next (), line = kw.line, decls = [];
		let shared = false, preserve = false;
		if (this.isKw ('SHARED')) { this.next (); shared = true; }
		if (this.isKw ('PRESERVE')) { this.next (); preserve = true; }
		do
		{
			const id = this.next (); if (id.t !== 'id') this.err ();
			let dims = null;
			if (this.isOp ('('))
			{
				this.next (); dims = [];
				while (!this.isOp (')'))
				{
					const a = this.expr ();
					if (this.isKw ('TO')) { this.next (); dims.push ({ lo: a, hi: this.expr () }); } else dims.push ({ lo: null, hi: a });
					if (!this.comma ()) break;
				}
				this.expectOp (')');
			}
			const ty = this.asType ();
			decls.push ({ name: id.v, dims, isStr: id.v.endsWith ('$') || ty === 'STRING', type: ty && this.types[ty] ? ty : null });
		} while (this.comma ());
		return { k: 'dim', decls, shared, redim: kw.v === 'REDIM', preserve, line };
	}

	// ---- expressions (QBasic's precedence) ----
	expr () { return this.bin (0); }
	bin (lv)
	{
		const LEVELS = [['IMP'], ['EQV'], ['XOR'], ['OR'], ['AND']];
		if (lv < LEVELS.length)
		{
			let a = this.bin (lv + 1);
			while (this.peek ().t === 'kw' && LEVELS[lv].includes (this.peek ().v)) { const op = this.next ().v; a = { k: 'bin', op, a, b: this.bin (lv + 1) }; }
			return a;
		}
		return this.notExpr ();
	}
	notExpr ()
	{
		if (this.isKw ('NOT')) { this.next (); return { k: 'un', op: 'NOT', a: this.notExpr () }; }
		return this.cmp ();
	}
	cmp ()
	{
		let a = this.add ();
		while (this.peek ().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes (this.peek ().v)) { const op = this.next ().v; a = { k: 'bin', op, a, b: this.add () }; }
		return a;
	}
	add ()
	{
		let a = this.mod ();
		while (this.isOp ('+') || this.isOp ('-')) { const op = this.next ().v; a = { k: 'bin', op, a, b: this.mod () }; }
		return a;
	}
	mod ()
	{
		let a = this.idiv ();
		while (this.isKw ('MOD')) { this.next (); a = { k: 'bin', op: 'MOD', a, b: this.idiv () }; }
		return a;
	}
	idiv ()
	{
		let a = this.mul ();
		while (this.isOp ('\\')) { this.next (); a = { k: 'bin', op: '\\', a, b: this.mul () }; }
		return a;
	}
	mul ()
	{
		let a = this.unary ();
		while (this.isOp ('*') || this.isOp ('/')) { const op = this.next ().v; a = { k: 'bin', op, a, b: this.unary () }; }
		return a;
	}
	unary ()
	{
		if (this.isOp ('-')) { this.next (); return { k: 'un', op: '-', a: this.unary () }; }
		if (this.isOp ('+')) { this.next (); return this.unary (); }
		return this.pow ();
	}
	pow ()
	{
		let a = this.primary ();
		while (this.isOp ('^')) { this.next (); const b = this.isOp ('-') ? (this.next (), { k: 'un', op: '-', a: this.primary () }) : this.primary (); a = { k: 'bin', op: '^', a, b }; }
		return a;
	}
	primary ()
	{
		const t = this.next ();
		if (t.t === 'num') return { k: 'num', v: t.v };
		if (t.t === 'str') return { k: 'str', v: t.v };
		if (t.t === 'op' && t.v === '(') { const e = this.expr (); this.expectOp (')'); return e; }
		// the words that are also functions: PLAY (0), SCREEN (r, c) is not here; INPUT$ is a name
		if (t.t === 'kw' && t.v === 'PLAY' && this.isOp ('(')) { this.next (); const args = this.argList (')'); this.expectOp (')'); return { k: 'ref', name: 'PLAY', args, parens: true, line: t.line }; }
		if (t.t === 'id')
		{
			if (this.isOp ('('))
			{
				this.next (); const args = this.argList (')'); this.expectOp (')');
				let name = t.v;
				if (this.isOp ('.') && this.peek (1).t === 'id') { this.next (); name += '.' + this.next ().v; }
				return { k: 'ref', name, args, parens: true, line: t.line };
			}
			return { k: 'ref', name: t.v, args: [], parens: false, line: t.line };
		}
		this.p--;
		this.err ();
	}
}

// ---- the run -------------------------------------------------------------------------------------------------------------
const MAX_DEPTH = 400;
const SLICE = { wait: 'slice' };

class Interp
{
	constructor (prog, host, dialect)
	{
		this.prog = prog; this.host = host; this.dialect = dialect || {};
		this.qb = !!this.dialect.qbasic;
		this.globals = new Map (); this.consts = new Map (); this.sharedG = new Set ();
		this.frames = [{ proc: null, vars: this.globals, shared: null, ret: 0, gosub: 0 }];
		this.line = 0; this.base = 0; this.dataPtr = 0;
		this.onErr = null; this.inHandler = false; this.err = 0; this.erl = 0;
		this.sprites = new WeakMap ();		// an array -> { index -> a sprite (GET) }
	}
	get frame () { return this.frames[this.frames.length - 1]; }
	isStrName (n) { return n.endsWith ('$'); }
	scopeOf (name)
	{
		const f = this.frame;
		if (!f.proc) return this.globals;
		if (f.vars.has (name)) return f.vars;
		if (f.shared.has (name) || this.sharedG.has (name)) return this.globals;
		return f.vars;
	}
	getVar (name)
	{
		if (this.consts.has (name)) return this.consts.get (name);
		const s = this.scopeOf (name);
		let v = s.get (name);
		if (v && v.ref) v = v.scope.get (v.name);
		if (v === undefined) return this.isStrName (name) ? '' : 0;
		return v;
	}
	setVar (name, v, line)
	{
		if (this.consts.has (name)) throw new BasicError ('Duplicate definition', line);
		let s = this.scopeOf (name), n = name, old = s.get (name);
		if (old && old.ref) { s = old.scope; n = old.name; old = s.get (n); }
		if (old && old.arr) throw new BasicError ('Type mismatch', line);
		const wantStr = old !== undefined ? typeof old === 'string' : this.isStrName (name);
		if (wantStr ? typeof v !== 'string' : typeof v !== 'number') throw new BasicError ('Type mismatch', line);
		s.set (n, v);
	}
	*run ()
	{
		try { yield* this.block (this.prog.body); }
		catch (e)
		{
			if (e instanceof Exit) return;
			if (e instanceof Jump) throw new BasicError ('Label not defined', this.line);
			if (e instanceof GosubReturn) throw new BasicError ('RETURN without GOSUB', this.line);
			if (e instanceof ResumeSig) throw new BasicError ('RESUME without error', this.line);
			if (e instanceof BasicError && !e.line) e.line = this.line;
			if (e instanceof RangeError) throw new BasicError ('Out of stack space', this.line);
			throw e;
		}
	}
	*stmt (line)
	{
		this.line = line;
		const r = this.host.onStatement ? this.host.onStatement (line) : true;
		if (r === false) throw new Endless ();
		if (r === 'yield') yield SLICE;
		// ON TIMER: its GOSUB when the time has come (at the module's level, not inside another event)
		const tv = this.tev;
		if (tv && tv.on && !this.inEvent && this.now () >= tv.next)
		{
			tv.next = this.now () + tv.ms;
			const saved = this.frames;
			this.frames = [saved[0]]; this.inEvent = true;
			try { yield* this.gosub (tv.target); }
			finally { this.inEvent = false; this.frames = saved; this.line = line; }
		}
	}
	now () { return typeof performance !== 'undefined' ? performance.now () : Date.now (); }
	*block (stmts, start = 0)
	{
		for (let i = start; i < stmts.length; i++)
		{
			try { const r = yield* this.exec (stmts[i]); if (r) return r; }
			catch (e)
			{
				if (e instanceof Jump && e.target.arr === stmts) { i = e.target.idx - 1; continue; }
				throw e;
			}
		}
		return null;
	}
	target (name, line)
	{
		const sc = this.prog.labels[this.frame.proc ? this.frame.proc.name : ''];
		const t = sc && sc[name];
		if (!t) throw new BasicError ('Label not defined: ' + name, line);
		return t;
	}
	// a statement, under ON ERROR when one is set
	*exec (s)
	{
		if (!this.onErr || this.inHandler) return yield* this.exec1 (s);
		for (;;)
		{
			try { return yield* this.exec1 (s); }
			catch (e)
			{
				if (!(e instanceof BasicError) || this.inHandler) throw e;
				const sig = yield* this.handle (e);
				if (sig.kind === 'next') return null;
				if (sig.kind === 'again') continue;
				throw new Jump (this.prog.labels[''][sig.target]);
			}
		}
	}
	// ON ERROR's handler run (at the module's level), to its RESUME -> the RESUME
	*handle (e)
	{
		this.err = e.code || errNo (e.message); this.erl = e.line || this.line;
		const saved = this.frames;
		this.frames = [saved[0]];
		this.inHandler = true;
		try { yield* this.block (this.onErr.arr, this.onErr.idx); }
		catch (sig)
		{
			if (sig instanceof ResumeSig) return sig;
			throw sig;
		}
		finally { this.inHandler = false; this.frames = saved; }
		throw new BasicError ('No RESUME', this.line);
	}
	truth (v, line) { return num (v, line) !== 0; }
	*exec1 (s)
	{
		if (s.k !== 'seq') yield* this.stmt (s.line);
		switch (s.k)
		{
		case 'seq': return yield* this.block (s.body);
		case 'assign':
		{
			const v = yield* this.eval (s.expr);
			const f = this.frame;
			if (!s.idx && f.proc && f.proc.kind === 'FUNCTION' && s.name === f.proc.name)
			{
				if (this.isStrName (s.name) ? typeof v !== 'string' : typeof v !== 'number') throw new BasicError ('Type mismatch', s.line);
				f.ret = v; return null;
			}
			if (s.idx) { yield* this.arrayCell (s.name, s.idx, s.line, v); return null; }
			this.setVar (s.name, v, s.line);
			return null;
		}
		case 'call': yield* this.call (s.name, s.args, s.line, false, true); return null;
		case 'if':
			for (const c of s.conds)
			{
				if (c !== s.conds[0]) yield* this.stmt (c.line);
				if (this.truth (yield* this.eval (c.cond), c.line)) return yield* this.block (c.body);
			}
			return s.els ? yield* this.block (s.els) : null;
		case 'for':
		{
			const from = num (yield* this.eval (s.from), s.line), to = num (yield* this.eval (s.to), s.line), step = s.step ? num (yield* this.eval (s.step), s.line) : 1;
			this.setVar (s.v, from, s.line);
			for (;;)
			{
				const i = this.getVar (s.v);
				if (step >= 0 ? i > to + 1e-9 : i < to - 1e-9) break;
				const r = yield* this.block (s.body);
				if (r === 'FOR') break;
				if (r) return r;
				this.setVar (s.v, this.getVar (s.v) + step, s.line);
				yield* this.stmt (s.line);
			}
			return null;
		}
		case 'while':
			for (;;)
			{
				if (!this.truth (yield* this.eval (s.cond), s.line)) break;
				const r = yield* this.block (s.body);
				if (r === 'WHILE') break;
				if (r) return r;
				yield* this.stmt (s.line);
			}
			return null;
		case 'do':
			for (;;)
			{
				if (s.pre && this.truth (yield* this.eval (s.pre.cond), s.line) === s.pre.until) break;
				const r = yield* this.block (s.body);
				if (r === 'DO') break;
				if (r) return r;
				if (s.post) { yield* this.stmt (s.post.line); if (this.truth (yield* this.eval (s.post.cond), s.post.line) === s.post.until) break; }
				else yield* this.stmt (s.line);
			}
			return null;
		case 'repeat':
		{
			const n = Math.round (num (yield* this.eval (s.n), s.line));
			for (let i = 0; i < n; i++)
			{
				const r = yield* this.block (s.body);
				if (r === 'REPEAT') break;
				if (r) return r;
				if (i + 1 < n) yield* this.stmt (s.line);
			}
			return null;
		}
		case 'select':
		{
			const v = yield* this.eval (s.e);
			for (const c of s.cases)
			{
				let hit = false;
				for (const t of c.tests)
				{
					const a = yield* this.eval (t.a);
					if (t.op === 'TO') hit = this.compare (v, a, '>=', s.line) && this.compare (v, yield* this.eval (t.b), '<=', s.line);
					else hit = this.compare (v, a, t.op, s.line);
					if (hit) break;
				}
				if (hit) return yield* this.block (c.body);
			}
			return s.els ? yield* this.block (s.els) : null;
		}
		case 'exit':
			if ((s.what === 'SUB' || s.what === 'FUNCTION') && !this.frame.proc) throw new BasicError ('EXIT ' + s.what + ' outside a ' + s.what, s.line);
			return s.what;
		case 'return':
			if (this.frame.gosub > 0) throw new GosubReturn ();
			if (this.frame.proc) return this.frame.proc.kind;
			throw new BasicError ('RETURN without GOSUB', s.line);
		case 'goto': throw new Jump (this.target (s.name, s.line));
		case 'gosub': yield* this.gosub (this.target (s.name, s.line)); return null;
		case 'on':
		{
			const n = Math.round (num (yield* this.eval (s.e), s.line));
			if (n < 1 || n > s.names.length) return null;
			const t = this.target (s.names[n - 1], s.line);
			if (s.gosub) { yield* this.gosub (t); return null; }
			throw new Jump (t);
		}
		case 'ontimer':
		{
			const sec = num (yield* this.eval (s.e), s.line);
			this.tev = { ms: Math.max (1, sec) * 1000, target: this.prog.labels[''][s.name], on: this.tev ? this.tev.on : false, next: this.now () + Math.max (1, sec) * 1000 };
			return null;
		}
		case 'timer':
			if (!this.tev) return null;
			if (s.mode === 'ON') { if (!this.tev.on) this.tev.next = this.now () + this.tev.ms; this.tev.on = true; }
			else this.tev.on = false;
			return null;
		case 'onerror': this.onErr = s.name ? this.prog.labels[''][s.name] : null; return null;
		case 'resume':
			if (!this.inHandler) throw new BasicError ('RESUME without error', s.line);
			throw new ResumeSig (s.kind, s.name);
		case 'error': { const n = Math.round (num (yield* this.eval (s.e), s.line)); throw new BasicError ('Error ' + n, s.line, n); }
		case 'end': throw new Exit ('END');
		case 'print': yield* this.print (s); return null;
		case 'input': yield* this.input (s); return null;
		case 'dim':
			for (const d of s.decls)
			{
				const scope = s.shared || !this.frame.proc ? this.globals : this.frame.vars;
				const fields = d.type ? this.prog.types[d.type] : null;
				const names = fields ? fields.map ((f) => ({ name: d.name + '.' + f.name, isStr: f.isStr })) : [{ name: d.name, isStr: d.isStr }];
				for (const { name, isStr } of names)
				{
					if (s.shared) this.sharedG.add (name);
					if (d.dims)
					{
						const lo = [], dims = [];
						for (const r of d.dims)
						{
							const l = r.lo ? Math.round (num (yield* this.eval (r.lo), s.line)) : this.base, h = Math.round (num (yield* this.eval (r.hi), s.line));
							if (h < l || h - l > 1000000) throw new BasicError ('Subscript out of range', s.line);
							lo.push (l); dims.push (h - l + 1);
						}
						const old = scope.get (name);
						if (old && old.arr && !s.redim) throw new BasicError ('Array already dimensioned', s.line);
						const a = { arr: true, lo, dims, isStr, data: new Array (dims.reduce ((x, y) => x * y, 1)).fill (isStr ? '' : 0) };
						if (s.preserve && old && old.arr) for (let k = 0; k < Math.min (old.data.length, a.data.length); k++) a.data[k] = old.data[k];
						scope.set (name, a);
					}
					else if (!scope.has (name)) scope.set (name, isStr ? '' : 0);
				}
			}
			return null;
		case 'erase':
			for (const n of s.names) { const a = this.scopeOf (n).get (n); if (a && a.arr) a.data.fill (a.isStr ? '' : 0); }
			return null;
		case 'shared':
			if (this.frame.proc) for (const n of s.names) this.frame.shared.add (n);
			return null;
		case 'const':
			if (this.consts.has (s.name)) throw new BasicError ('Duplicate definition', s.line);
			this.consts.set (s.name, yield* this.eval (s.expr));
			return null;
		case 'base': this.base = s.n | 0; return null;
		case 'read':
			for (const v of s.vars)
			{
				if (this.dataPtr >= this.prog.data.length) throw new BasicError ('Out of DATA', s.line);
				const it = this.prog.data[this.dataPtr++];
				const isStr = this.lvIsStr (v);
				let val;
				if (isStr) val = it.v;
				else { if (it.q) throw new BasicError ('Type mismatch', s.line); val = it.v === '' ? 0 : Number (it.v); if (isNaN (val)) throw new BasicError ('Syntax error', s.line); }
				yield* this.setLv (v, val, s.line);
			}
			return null;
		case 'restore': this.dataPtr = s.name ? this.prog.labels[''][s.name].data : 0; return null;
		case 'swap':
		{
			const a = yield* this.getLv (s.a, s.line), b = yield* this.getLv (s.b, s.line);
			if (typeof a !== typeof b) throw new BasicError ('Type mismatch', s.line);
			yield* this.setLv (s.a, b, s.line); yield* this.setLv (s.b, a, s.line);
			return null;
		}
		case 'gfx': yield* this.gfx (s); return null;
		}
		return null;
	}
	lvIsStr (v) { if (v.idx) { const a = this.scopeOf (v.name).get (v.name); return a && a.arr ? a.isStr : this.isStrName (v.name); } const x = this.getVar (v.name); return typeof x === 'string'; }
	*getLv (v, line) { return v.idx ? yield* this.arrayCell (v.name, v.idx, line) : this.getVar (v.name); }
	*setLv (v, val, line) { if (v.idx) yield* this.arrayCell (v.name, v.idx, line, val); else this.setVar (v.name, val, line); }
	*gosub (t)
	{
		const f = this.frame;
		f.gosub++;
		try { yield* this.block (t.arr, t.idx); }
		catch (e) { if (!(e instanceof GosubReturn)) throw e; }
		finally { f.gosub--; }
	}
	// The array of a name (made, 0 .. 10 a dimension, the first time it is used in the free mode)
	arrayOf (name, n, line)
	{
		const sc = this.scopeOf (name);
		let a = sc.get (name);
		if (a && a.ref) a = a.scope.get (a.name);
		if (a && a.arr) return a;
		if (!this.qb || a !== undefined) return null;
		const dims = new Array (n).fill (11 - this.base), isStr = this.isStrName (name);
		a = { arr: true, lo: new Array (n).fill (this.base), dims, isStr, data: new Array (dims.reduce ((x, y) => x * y, 1)).fill (isStr ? '' : 0) };
		sc.set (name, a);
		return a;
	}
	*arrayCell (name, idx, line, set)
	{
		const a = this.arrayOf (name, idx.length, line);
		if (!a) throw new BasicError ('Sub or function not defined: ' + name, line);
		if (idx.length !== a.dims.length) throw new BasicError ('Wrong number of dimensions', line);
		let k = 0;
		for (let i = 0; i < idx.length; i++)
		{
			const v = Math.round (num (yield* this.eval (idx[i]), line)) - a.lo[i];
			if (v < 0 || v >= a.dims[i]) throw new BasicError ('Subscript out of range', line);
			k = k * a.dims[i] + v;
		}
		if (set === undefined) return a.data[k];
		if (typeof set !== typeof a.data[k]) throw new BasicError ('Type mismatch', line);
		a.data[k] = set;
		return set;
	}
	// A name called: a statement (asStmt) or in an expression
	*call (name, argExprs, line, inExpr, asStmt)
	{
		const d = this.dialect;
		if (d.words && d.words[name])
		{
			const w = d.words[name];
			if (inExpr && w.kind === 's') throw new BasicError ('Type mismatch', line);
			const args = [];
			for (const e of argExprs) args.push (yield* this.eval (e));
			if (args.length < w.min || args.length > w.max) throw new BasicError ('Wrong number of arguments', line);
			for (const a of args) num (a, line);
			const r = this.host.ext (name, args);
			return r === undefined ? 0 : r;
		}
		const p = this.prog.procs[name];
		if (p)
		{
			if (inExpr && p.kind === 'SUB') throw new BasicError ('Type mismatch', line);
			if (argExprs.length !== p.params.length) throw new BasicError ('Wrong number of arguments', line);
			const vars = new Map ();
			for (let i = 0; i < p.params.length; i++)
			{
				const pr = p.params[i], e = argExprs[i];
				if (pr.arr)
				{
					const a = e.k === 'arrref' ? this.arrayOf (e.name, 1, line) : null;
					if (!a) throw new BasicError ('Type mismatch', line);
					vars.set (pr.name, a); continue;
				}
				if (e.k === 'arrref') throw new BasicError ('Type mismatch', line);
				// a plain variable goes by reference (QBasic's way); an expression by value
				if (!p.def && e.k === 'ref' && !e.parens && !this.consts.has (e.name) && !this.prog.procs[e.name] && !(d.words && d.words[e.name]) && !BUILTINS[e.name] && !HOSTFN[e.name])
				{
					const sc = this.scopeOf (e.name);
					let v = sc.get (e.name);
					if (v && v.ref) { vars.set (pr.name, v); v = v.scope.get (v.name); }
					else
					{
						if (v === undefined) { v = this.isStrName (e.name) ? '' : 0; sc.set (e.name, v); }
						if (v && v.arr) throw new BasicError ('Type mismatch', line);
						vars.set (pr.name, { ref: true, scope: sc, name: e.name });
					}
					if (this.isStrName (pr.name) ? typeof v !== 'string' : typeof v !== 'number') throw new BasicError ('Type mismatch', line);
					continue;
				}
				const v = yield* this.eval (e);
				if (this.isStrName (pr.name) ? typeof v !== 'string' : typeof v !== 'number') throw new BasicError ('Type mismatch', line);
				vars.set (pr.name, v);
			}
			if (this.frames.length > MAX_DEPTH) throw new BasicError ('Out of stack space', line);
			const f = { proc: p, vars, shared: new Set (), ret: this.isStrName (p.name) ? '' : 0, gosub: 0 };
			this.frames.push (f);
			try { yield* this.block (p.body); }
			catch (e) { if (e instanceof Jump) throw new BasicError ('Label not defined', this.line); throw e; }
			finally { this.frames.pop (); this.line = line; }
			return f.ret;
		}
		if (BUILTINS[name] || (HOSTFN[name] && this.host.fn))
		{
			const [mn, mx, fn] = BUILTINS[name] || HOSTFN[name];
			if (asStmt) throw new BasicError ('Syntax error', line);
			if (argExprs.length < mn || argExprs.length > mx) throw new BasicError ('Wrong number of arguments', line);
			const args = [];
			for (const e of argExprs) args.push (yield* this.eval (e));
			try
			{
				if (fn) return fn (args, line);
				let r = this.host.fn (name, args);
				if (r && r.wait) r = yield r;
				return r;
			}
			catch (e) { if (e instanceof BasicError && !e.line) e.line = line; throw e; }
		}
		if (name === 'ERR' && !argExprs.length) return this.err;
		if (name === 'ERL' && !argExprs.length) return this.erl;
		if ((name === 'LBOUND' || name === 'UBOUND') && argExprs.length >= 1 && argExprs[0].k === 'ref')
		{
			const a = this.arrayOf (argExprs[0].name, 1, line);
			if (!a) throw new BasicError ('Type mismatch', line);
			const dim = argExprs.length > 1 ? Math.round (num (yield* this.eval (argExprs[1]), line)) - 1 : 0;
			if (dim < 0 || dim >= a.dims.length) throw new BasicError ('Subscript out of range', line);
			return name === 'LBOUND' ? a.lo[dim] : a.lo[dim] + a.dims[dim] - 1;
		}
		if (HOSTFN[name]) throw new BasicError (name + ' is not available here', line);
		throw new BasicError ('Sub or function not defined: ' + name, line);
	}
	compare (a, b, op, line)
	{
		if (typeof a !== typeof b) throw new BasicError ('Type mismatch', line);
		switch (op)
		{
		case '=': return typeof a === 'number' ? Math.abs (a - b) < 1e-9 : a === b;
		case '<>': return typeof a === 'number' ? Math.abs (a - b) >= 1e-9 : a !== b;
		case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b;
		}
		return false;
	}
	*eval (e)
	{
		switch (e.k)
		{
		case 'num': return e.v;
		case 'str': return e.v;
		case 'arrref': throw new BasicError ('Type mismatch', this.line);
		case 'ref':
		{
			const n = e.name, d = this.dialect;
			if (d.words && d.words[n]) return yield* this.call (n, e.args, e.line, true, false);
			const p = this.prog.procs[n];
			if (p && p.kind === 'FUNCTION')
			{
				const f = this.frame;
				if (!e.parens && f.proc === p && p.params.length > 0) return f.ret;
				if (e.parens || p.params.length === 0) return yield* this.call (n, e.args, e.line, true, false);
			}
			if (e.parens)
			{
				let a = this.scopeOf (n).get (n);
				if (a && a.ref) a = a.scope.get (a.name);
				if (a && a.arr) return yield* this.arrayCell (n, e.args, e.line);
				if (BUILTINS[n] || HOSTFN[n] || n === 'LBOUND' || n === 'UBOUND' || p || !this.qb) return yield* this.call (n, e.args, e.line, true, false);
				return yield* this.arrayCell (n, e.args, e.line);
			}
			if (p) throw new BasicError ('Type mismatch', e.line);
			if ((BUILTINS[n] && BUILTINS[n][0] === 0) || (HOSTFN[n] && HOSTFN[n][0] === 0 && this.host.fn)) return yield* this.call (n, [], e.line, true, false);
			if (n === 'ERR' || n === 'ERL') return n === 'ERR' ? this.err : this.erl;
			const v = this.getVar (n);
			if (v && v.arr) throw new BasicError ('Type mismatch', e.line);
			return v;
		}
		case 'un':
		{
			const a = num (yield* this.eval (e.a), this.line);
			return e.op === '-' ? -a : ~Math.round (a);
		}
		case 'bin':
		{
			const op = e.op;
			const a = yield* this.eval (e.a), b = yield* this.eval (e.b);
			if (op === '=' || op === '<>' || op === '<' || op === '>' || op === '<=' || op === '>=') return this.compare (a, b, op, this.line) ? -1 : 0;
			if (op === '+' && typeof a === 'string') return a + str (b, this.line);
			const x = num (a, this.line), y = num (b, this.line);
			switch (op)
			{
			case '+': return x + y;
			case '-': return x - y;
			case '*': return x * y;
			case '/': if (y === 0) throw new BasicError ('Division by zero', this.line); return x / y;
			case '\\': { const q = Math.round (y); if (q === 0) throw new BasicError ('Division by zero', this.line); return Math.trunc (Math.round (x) / q); }
			case 'MOD': { const p = Math.round (x), q = Math.round (y); if (q === 0) throw new BasicError ('Division by zero', this.line); return p % q; }
			case '^': return Math.pow (x, y);
			case 'AND': return Math.round (x) & Math.round (y);
			case 'OR': return Math.round (x) | Math.round (y);
			case 'XOR': return Math.round (x) ^ Math.round (y);
			case 'EQV': return ~(Math.round (x) ^ Math.round (y));
			case 'IMP': return ~Math.round (x) | Math.round (y);
			}
		}
		}
		throw new BasicError ('Syntax error', this.line);
	}

	// ---- PRINT, INPUT -----------------------------------------------------------------------------------------------
	pos () { return this.host.fn ? this.host.fn ('POS', [0]) : (this.col || 1); }
	out (text)
	{
		if (this.host.print) this.host.print (text);
		const nl = text.lastIndexOf ('\n');
		this.col = nl >= 0 ? text.length - nl : (this.col || 1) + text.length;
	}
	*print (s)
	{
		let nl = true;
		const fmt = s.using ? str (yield* this.eval (s.using), s.line) : null;
		const vals = [];
		for (const it of s.items)
		{
			if (it.sep === ';') { nl = false; continue; }
			if (it.sep === ',') { if (!fmt) { const p = this.pos () - 1; this.out (' '.repeat (14 - (p % 14))); } nl = false; continue; }
			if (it.tab) { const n = Math.round (num (yield* this.eval (it.tab), s.line)), p = this.pos (); if (n > p) this.out (' '.repeat (n - p)); else if (n < p) { this.out ('\n'); if (n > 1) this.out (' '.repeat (n - 1)); } nl = false; continue; }
			if (it.spc) { this.out (' '.repeat (Math.max (0, Math.round (num (yield* this.eval (it.spc), s.line))))); nl = false; continue; }
			const v = yield* this.eval (it.e);
			if (fmt) vals.push (v);
			else this.out (typeof v === 'number' ? (v >= 0 ? ' ' : '') + fmtNum (v) + ' ' : v);
			nl = true;
		}
		if (fmt) this.out (using (fmt, vals, s.line));
		if (nl) this.out ('\n');
	}
	*input (s)
	{
		if (!this.host.fn) throw new BasicError ('INPUT is not available here', s.line);
		for (;;)
		{
			if (s.prompt !== null) this.out (s.prompt);
			if (s.q) this.out ('? ');
			const ans = yield { wait: 'line', noNl: s.noNl };
			if (s.lineInput) { yield* this.setLv (s.vars[0], ans, s.line); return; }
			// the answers, separated by commas (a quoted one may hold a comma)
			const parts = [];
			const re = /\s*("([^"]*)"|[^,]*)\s*(,|$)/g;
			let m;
			while ((m = re.exec (ans)) && parts.length < 64) { parts.push (m[2] !== undefined ? m[2] : m[1].trim ()); if (!m[3]) break; }
			let ok = parts.length === s.vars.length;
			const vals = [];
			for (let i = 0; ok && i < s.vars.length; i++)
			{
				if (this.lvIsStr (s.vars[i])) vals.push (parts[i]);
				else { const v = parts[i] === '' ? 0 : Number (parts[i]); if (isNaN (v)) ok = false; vals.push (v); }
			}
			if (!ok) { this.out ('Redo from start\n'); continue; }
			for (let i = 0; i < vals.length; i++) yield* this.setLv (s.vars[i], vals[i], s.line);
			return;
		}
	}
	// ---- the screen's statements: their arguments evaluated, then the host's ---------------------------------------
	*gfx (s)
	{
		const h = this.host;
		if (!h.gfx) throw new BasicError (s.op + ' is not available here', s.line);
		const ev = function* (self, e) { return e === null || e === undefined ? null : yield* self.eval (e); };
		const pt = function* (self, p) { return p ? { step: p.step, x: num (yield* self.eval (p.x), s.line), y: num (yield* self.eval (p.y), s.line) } : null; };
		let a;
		switch (s.op)
		{
		case 'LINE': a = { a: yield* pt (this, s.a), b: yield* pt (this, s.b), c: yield* ev (this, s.c), box: s.box, style: yield* ev (this, s.style) }; break;
		case 'PSET': case 'PRESET': a = { p: yield* pt (this, s.p), c: yield* ev (this, s.c) }; break;
		case 'CIRCLE': { const rest = []; let fill = false; for (const r of s.rest) { if (r && r.fill) fill = true; else rest.push (yield* ev (this, r)); } a = { p: yield* pt (this, s.p), r: num (yield* this.eval (s.r), s.line), c: rest[0], start: rest[1], end: rest[2], aspect: rest[3], fill }; break; }
		case 'PAINT': { const rest = []; for (const r of s.rest) rest.push (yield* ev (this, r)); a = { p: yield* pt (this, s.p), c: rest[0], border: rest[1] }; break; }
		case 'GET':
		{
			const arr = this.arrayOf (s.v.name, 1, s.line); if (!arr) throw new BasicError ('Type mismatch', s.line);
			const at = s.v.idx ? Math.round (num (yield* this.eval (s.v.idx[0]), s.line)) : 0;
			const spr = h.gfx ('GET', { a: yield* pt (this, s.a), b: yield* pt (this, s.b) });
			let m = this.sprites.get (arr); if (!m) this.sprites.set (arr, m = new Map ());
			m.set (at, spr);
			return;
		}
		case 'PUT':
		{
			const arr = this.arrayOf (s.v.name, 1, s.line); if (!arr) throw new BasicError ('Type mismatch', s.line);
			const at = s.v.idx ? Math.round (num (yield* this.eval (s.v.idx[0]), s.line)) : 0;
			const m = this.sprites.get (arr), spr = m && m.get (at);
			if (!spr) throw new BasicError ('Illegal function call', s.line);
			a = { p: yield* pt (this, s.p), spr, mode: s.mode };
			break;
		}
		default: { a = []; for (const e of s.args) a.push (yield* ev (this, e)); }
		}
		let r;
		try { r = h.gfx (s.op, a); }
		catch (e) { if (e instanceof BasicError && !e.line) e.line = s.line; throw e; }
		if (r && r.wait) yield r;
	}
}

// PRINT USING: # digits, . the point, , thousands, + - signs, $$ ** ^^^^; & ! \ \ for strings
function using (fmt, vals, line)
{
	let out = '', vi = 0, i = 0, any = false;
	while (i < fmt.length)
	{
		const rest = fmt.slice (i);
		const mNum = /^([+]?)(\*\*\$?|\$\$|)([#,]*)(\.#*)?(\^\^\^\^)?([+-]?)/.exec (rest);
		if (mNum && (mNum[3].includes ('#') || (mNum[4] && mNum[4].length > 1)) )
		{
			if (vi >= vals.length) { if (!any) throw new BasicError ('Illegal function call', line); vi = 0; }
			const v = num (vals[vi++], line); any = true;
			const intW = mNum[3].length + mNum[2].length, dec = mNum[4] ? mNum[4].length - 1 : 0, comma = mNum[3].includes (',');
			let s = Math.abs (v).toFixed (dec);
			if (comma) { const [ip, fp] = s.split ('.'); s = ip.replace (/\B(?=(\d{3})+(?!\d))/g, ',') + (fp !== undefined ? '.' + fp : ''); }
			if (mNum[2].includes ('$')) s = '$' + s;
			const sign = v < 0 ? '-' : mNum[1] ? '+' : '';
			if (!mNum[6]) s = sign + s;
			const w = intW + (mNum[4] ? mNum[4].length : 0) + mNum[1].length;
			if (s.length > w) s = '%' + s; else s = s.padStart (w, mNum[2].startsWith ('**') ? '*' : ' ');
			if (mNum[6]) s += v < 0 ? '-' : mNum[6] === '+' ? '+' : ' ';
			out += s; i += mNum[0].length; continue;
		}
		const c = fmt[i];
		if (c === '&' || c === '!' || c === '\\')
		{
			let w = 1;
			if (c === '\\') { const e = fmt.indexOf ('\\', i + 1); if (e < 0) { out += c; i++; continue; } w = e - i + 1; }
			if (vi >= vals.length) { if (!any) throw new BasicError ('Illegal function call', line); vi = 0; }
			const v = str (vals[vi++], line); any = true;
			out += c === '&' ? v : v.slice (0, w).padEnd (w, ' ');
			i += c === '\\' ? w : 1; continue;
		}
		if (c === '_' && i + 1 < fmt.length) { out += fmt[i + 1]; i += 2; continue; }
		out += c; i++;
	}
	return out;
}

// A message of the language turned into French, word by word (BASIC's and the host's words named in French)
function frenchMessage (msg, more)
{
	const SAID = [['Expected ', 'il manque '], [' without its ', ' sans son '], [' without ', ' sans '], [' inside a block', ' dans un bloc'],
		['Duplicate definition', 'Définition en double'], ['Subscript out of range', 'Indice hors limites'],
		['Illegal function call', 'Appel de fonction impossible'], ['Wrong number of dimensions', 'Pas le bon nombre de dimensions'],
		['is not available here (no files in a web page)', "n'existe pas ici (pas de fichiers dans une page web)"],
		['is not available here', "n'existe pas ici"], ['outside a', 'hors d\'un'], ['Label not defined', 'Étiquette inconnue'],
		['Duplicate label', 'Étiquette en double'], ['Out of DATA', 'Plus de DATA à lire'], ['Overflow', 'Dépassement de capacité'],
		['Array already dimensioned', 'Tableau déjà dimensionné'], ['No RESUME', 'Il manque RESUME'], ['RESUME without error', 'RESUME sans erreur']];
	let out = msg;
	for (const [en, fr] of SAID) out = out.split (en).join (fr);
	return out.replace (/\b[A-Z][A-Z0-9$]*\b/g, (w) => (more && more[w]) || SHOWN_FR[w] || w);
}

const Basic = {
	BasicError, Endless, KEYWORDS, FRENCH, SHOWN_FR, BUILTINS, HOSTFN, plain, fmtNum, frenchMessage, using,
	compile (src, dialect) { return new Parser (tokenize (src, dialect), dialect).program (); },
	// at once: a program that would wait (INPUT, SLEEP...) cannot run so
	run (prog, host, dialect)
	{
		const g = new Interp (prog, host, dialect).run ();
		for (let r = g.next (); !r.done; r = g.next ())
			if (r.value && r.value.wait && r.value.wait !== 'slice') throw new BasicError ('This instruction is not available here', 0);
	},
	start (prog, host, dialect) { return new Interp (prog, host, dialect).run (); },
	tokenize };
if (typeof module !== 'undefined' && module.exports) module.exports = Basic; else global.Basic = Basic;
}) (typeof window !== 'undefined' ? window : globalThis);
