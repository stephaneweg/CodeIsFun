// basic.js -- a small BASIC for Turtle Quest in the browser: the part of Onyx BASIC (QBasic's language) the turtle's
// programs use -- variables, IF / ELSEIF / ELSE, FOR / NEXT, WHILE / WEND, DO / LOOP, REPEAT / END REPEAT,
// SELECT CASE, SUB and FUNCTION (with parameters, recursion), CONST, DIM (arrays too), PRINT -- with its French
// words (SI ... ALORS, POUR ... JUSQUE ... SUITE, TANTQUE, REPETER, FONCTION...) and a host's own words (the
// turtle's: FORWARD, WALL ()...). Both languages are always known, even mixed in one program.
//
// Basic.compile (src, dialect) -> a program (or throws a BasicError: its line, its message); Basic.run (prog, host)
// runs it at once: host.onStatement (line) before each statement (false: stop -- the run is "endless"),
// host.ext (name, args) for the host's words (returns a value, or throws a BasicError), host.print (text).
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function (global) {
'use strict';

class BasicError extends Error {
	constructor (msg, line) { super (msg); this.line = line || 0; }
}
class Endless extends Error {}

// ---- the words -------------------------------------------------------------------------------------------------------
const KEYWORDS = new Set ([
	'AND', 'AS', 'CALL', 'CASE', 'CONST', 'DIM', 'DO', 'ELSE', 'ELSEIF', 'END', 'EQV', 'EXIT', 'FOR', 'FUNCTION',
	'GOSUB', 'GOTO', 'IF', 'IMP', 'INPUT', 'IS', 'LET', 'LOOP', 'MOD', 'NEXT', 'NOT', 'OR', 'PRINT', 'REM', 'RETURN',
	'SELECT', 'SHARED', 'STATIC', 'STEP', 'SUB', 'THEN', 'TO', 'UNTIL', 'WEND', 'WHILE', 'XOR', 'REPEAT', 'RANDOMIZE',
	'INTEGER', 'REAL', 'STRING', 'BYTE', 'LONG', 'SINGLE', 'DOUBLE', 'INTEGER16', 'INTEGER32', 'INTEGER64', 'REAL32', 'REAL64',
	'BYVAL', 'BYREF', 'DECLARE', 'STOP', 'SYSTEM']);
// BASIC's own French words (Onyx BASIC's bas::FRENCH): French -> English
const FRENCH = {
	SI: 'IF', ALORS: 'THEN', SINON: 'ELSE', SINONSI: 'ELSEIF', FIN: 'END',
	POUR: 'FOR', JUSQUE: 'TO', PAS: 'STEP', SUITE: 'NEXT', SUIVANT: 'NEXT',
	REPETER: 'REPEAT', REPETE: 'REPEAT', TANTQUE: 'WHILE', FINTANTQUE: 'WEND', FAIRE: 'DO', BOUCLE: 'LOOP', JUSQUA: 'UNTIL',
	FONCTION: 'FUNCTION', PROCEDURE: 'SUB', RETOUR: 'RETURN', APPELER: 'CALL', APPELLE: 'CALL', SORTIR: 'EXIT',
	COMME: 'AS', ENTIER: 'INTEGER', REEL: 'REAL', CHAINE: 'STRING', OCTET: 'BYTE',
	ENTIER16: 'INTEGER16', ENTIER32: 'INTEGER32', ENTIER64: 'INTEGER64', REEL32: 'REAL32', REEL64: 'REAL64',
	CONSTANTE: 'CONST', PARTAGE: 'SHARED', STATIQUE: 'STATIC',
	SELON: 'SELECT', CAS: 'CASE', ET: 'AND', OU: 'OR', NON: 'NOT',
	AFFICHER: 'PRINT', AFFICHE: 'PRINT', SAISIR: 'INPUT' };
// The English words as a French message shows them
const SHOWN_FR = {
	IF: 'SI', THEN: 'ALORS', ELSE: 'SINON', ELSEIF: 'SINON SI', END: 'FIN', FOR: 'POUR', TO: 'JUSQUE', STEP: 'PAS',
	NEXT: 'SUITE', REPEAT: 'REPETER', WHILE: 'TANTQUE', WEND: 'FIN TANTQUE', DO: 'FAIRE', LOOP: 'BOUCLE', UNTIL: 'JUSQUA',
	FUNCTION: 'FONCTION', SUB: 'SUB', EXIT: 'SORTIR', CALL: 'APPELER', SELECT: 'SELON', CASE: 'CAS', PRINT: 'AFFICHER',
	AND: 'ET', OR: 'OU', NOT: 'NON', CONST: 'CONSTANTE', AS: 'COMME' };

// ---- the built-in functions ------------------------------------------------------------------------------------------
function num (v, line) { if (typeof v !== 'number') throw new BasicError ('Type mismatch', line); return v; }
function str (v, line) { if (typeof v !== 'string') throw new BasicError ('Type mismatch', line); return v; }
function fmtNum (n)
{
	if (Number.isInteger (n)) return String (n);
	let s = String (Number (n.toPrecision (7)));
	if (s.startsWith ('0.')) s = s.slice (1); else if (s.startsWith ('-0.')) s = '-' + s.slice (2);
	return s;
}
const BUILTINS = {
	ABS: [1, 1, (a) => Math.abs (num (a[0]))], SGN: [1, 1, (a) => Math.sign (num (a[0]))],
	INT: [1, 1, (a) => Math.floor (num (a[0]))], FIX: [1, 1, (a) => Math.trunc (num (a[0]))],
	CINT: [1, 1, (a) => Math.round (num (a[0]))], CLNG: [1, 1, (a) => Math.round (num (a[0]))], CDBL: [1, 1, (a) => num (a[0])],
	SQR: [1, 1, (a, l) => { const x = num (a[0]); if (x < 0) throw new BasicError ('Illegal function call', l); return Math.sqrt (x); }],
	SIN: [1, 1, (a) => Math.sin (num (a[0]))], COS: [1, 1, (a) => Math.cos (num (a[0]))], TAN: [1, 1, (a) => Math.tan (num (a[0]))],
	ATN: [1, 1, (a) => Math.atan (num (a[0]))], EXP: [1, 1, (a) => Math.exp (num (a[0]))],
	LOG: [1, 1, (a, l) => { const x = num (a[0]); if (x <= 0) throw new BasicError ('Illegal function call', l); return Math.log (x); }],
	RND: [0, 1, () => Math.random ()], TIMER: [0, 0, () => (Date.now () / 1000) % 86400],
	MIN: [2, 2, (a) => Math.min (num (a[0]), num (a[1]))], MAX: [2, 2, (a) => Math.max (num (a[0]), num (a[1]))],
	LEN: [1, 1, (a) => str (a[0]).length], ASC: [1, 1, (a) => str (a[0]).charCodeAt (0) || 0],
	'CHR$': [1, 1, (a) => String.fromCharCode (num (a[0]))], 'STR$': [1, 1, (a) => { const n = num (a[0]); return (n >= 0 ? ' ' : '') + fmtNum (n); }],
	VAL: [1, 1, (a) => { const v = parseFloat (str (a[0])); return isNaN (v) ? 0 : v; }],
	'LEFT$': [2, 2, (a) => str (a[0]).slice (0, Math.max (0, num (a[1])))],
	'RIGHT$': [2, 2, (a) => { const s = str (a[0]), n = Math.max (0, num (a[1])); return n ? s.slice (-n) : ''; }],
	'MID$': [2, 3, (a) => { const s = str (a[0]), st = Math.max (1, num (a[1])); return a.length > 2 ? s.substr (st - 1, Math.max (0, num (a[2]))) : s.substr (st - 1); }],
	'UCASE$': [1, 1, (a) => str (a[0]).toUpperCase ()], 'LCASE$': [1, 1, (a) => str (a[0]).toLowerCase ()],
	'LTRIM$': [1, 1, (a) => str (a[0]).replace (/^ +/, '')], 'RTRIM$': [1, 1, (a) => str (a[0]).replace (/ +$/, '')],
	'TRIM$': [1, 1, (a) => str (a[0]).trim ()], 'SPACE$': [1, 1, (a) => ' '.repeat (Math.max (0, num (a[0])))],
	INSTR: [2, 3, (a) => { if (a.length === 3) return str (a[1]).indexOf (str (a[2]), Math.max (0, num (a[0]) - 1)) + 1; return str (a[0]).indexOf (str (a[1])) + 1; }] };

// ---- the tokens ----------------------------------------------------------------------------------------------------------
// A word's key: upper case, its accents dropped (RÉPÉTER is REPETER)
function plain (w) { return w.normalize ('NFD').replace (/[̀-ͯ]/g, '').toUpperCase (); }

function tokenize (src, dialect)
{
	const toks = [];
	const lines = src.replace (/\r/g, '').split ('\n');
	for (let ln = 0; ln < lines.length; ln++)
	{
		const s = lines[ln], line = ln + 1;
		let i = 0, stmtStart = true;
		while (i < s.length)
		{
			const c = s[i];
			if (c === ' ' || c === '\t') { i++; continue; }
			if (c === "'") break;
			if (c === '"')
			{
				let j = i + 1; while (j < s.length && s[j] !== '"') j++;
				toks.push ({ t: 'str', v: s.slice (i + 1, j), line });
				i = j + 1; stmtStart = false; continue;
			}
			if (/[0-9.]/.test (c) && (c !== '.' || /[0-9]/.test (s[i + 1] || '')))
			{
				const m = /^(\d*\.?\d*)([eE][+-]?\d+)?/.exec (s.slice (i));
				toks.push ({ t: 'num', v: parseFloat (m[0]), line });
				i += m[0].length; stmtStart = false; continue;
			}
			if (/[\p{L}_]/u.test (c))
			{
				let j = i + 1; while (j < s.length && /[\p{L}\p{N}_]/u.test (s[j])) j++;
				if (j < s.length && /[$%!#&]/.test (s[j])) j++;
				const raw = s.slice (i, j);
				let u = plain (raw);
				i = j;
				if (u === 'REM' && stmtStart) break;
				if (FRENCH[u]) u = FRENCH[u];
				else if (dialect && dialect.aliases && dialect.aliases[u]) u = dialect.aliases[u];
				if (KEYWORDS.has (u) && !(dialect && dialect.words && dialect.words[u])) toks.push ({ t: 'kw', v: u, raw, line });
				else toks.push ({ t: 'id', v: u, raw, line });
				stmtStart = false; continue;
			}
			const two = s.slice (i, i + 2);
			if (two === '<=' || two === '>=' || two === '<>') { toks.push ({ t: 'op', v: two, line }); i += 2; stmtStart = false; continue; }
			if (c === ':') { toks.push ({ t: 'sep', v: ':', line }); i++; stmtStart = true; continue; }
			if ('+-*/\\^=<>(),;'.includes (c)) { toks.push ({ t: 'op', v: c, line }); i++; stmtStart = false; continue; }
			throw new BasicError ('Syntax error', line);
		}
		toks.push ({ t: 'eol', line });
	}
	toks.push ({ t: 'eof', line: lines.length });
	return toks;
}

// ---- the parser ----------------------------------------------------------------------------------------------------------
class Parser
{
	constructor (toks, dialect) { this.toks = toks; this.p = 0; this.dialect = dialect; this.procs = {}; this.inProc = null; }
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

	program ()
	{
		const body = this.block ([], 'top');
		return { body: body.stmts, procs: this.procs };
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
			if (n.t === 'kw' && ['IF', 'SUB', 'FUNCTION', 'SELECT', 'REPEAT', 'WHILE'].includes (n.v)) return 'END ' + n.v;
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
					'END IF': 'IF', 'END SUB': 'SUB', 'END FUNCTION': 'FUNCTION', 'END SELECT': 'SELECT', 'END REPEAT': 'REPEAT' };
				if (opener !== 'top') this.err (opener + ' without ' + ends[ends.length - 1], openLine);
				this.err (c + ' without ' + OPEN[c]);
			}
			const s = this.statement (opener === 'top');
			if (s) stmts.push (s);
		}
	}
	skipEnd2 () { this.next (); this.next (); }		// END X
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
			case 'EXIT':
			{
				this.next ();
				const w = this.next ();
				if (w.t !== 'kw' || !['SUB', 'FUNCTION', 'FOR', 'DO', 'WHILE', 'REPEAT'].includes (w.v)) this.err ();
				return { k: 'exit', what: w.v, line };
			}
			case 'RETURN': this.next (); return { k: 'exit', what: this.inProc ? this.inProc.kind : 'END', line };
			case 'END': case 'STOP': case 'SYSTEM': this.next (); this.endStmt (); return { k: 'end', line };
			case 'PRINT': return this.printStmt ();
			case 'DIM': case 'STATIC': return this.dimStmt ();
			case 'SHARED':
			{
				this.next (); const names = [];
				do { const id = this.next (); if (id.t !== 'id') this.err (); names.push (id.v); if (this.isOp ('(')) { this.next (); this.expectOp (')'); } this.asType (); } while (this.isOp (',') && this.next ());
				return { k: 'shared', names, line };
			}
			case 'CONST':
			{
				this.next (); const out = [];
				do { const id = this.next (); if (id.t !== 'id') this.err (); this.asType (); this.expectOp ('='); out.push ({ k: 'const', name: id.v, expr: this.expr (), line }); } while (this.isOp (',') && this.next ());
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
			case 'INPUT': this.err ('INPUT is not available here');
			}
			this.err ();
		}
		if (t.t === 'id') return this.assignOrCall (false);
		this.err ();
	}
	asType () { if (this.isKw ('AS')) { this.next (); const ty = this.next (); if (ty.t !== 'kw' && ty.t !== 'id') this.err (); } }
	assignOrCall (letOnly)
	{
		const id = this.next (), line = id.line;
		if (this.isOp ('=')) { this.next (); const e = this.expr (); this.endStmt (); return { k: 'assign', name: id.v, idx: null, expr: e, line }; }
		if (this.isOp ('('))
		{
			const save = this.p;
			this.next (); const args = this.argList (')'); this.expectOp (')');
			if (this.isOp ('=')) { this.next (); const e = this.expr (); this.endStmt (); return { k: 'assign', name: id.v, idx: args, expr: e, line }; }
			if (letOnly) this.err ();
			if (this.stmtEnd ()) return { k: 'call', name: id.v, args, line };
			this.p = save;
		}
		if (letOnly) this.err ();
		const n = this.peek ();
		if (n.t === 'id' && this.dialect && this.dialect.words && this.dialect.words[n.v] && this.dialect.words[n.v].kind === 's')
			throw new BasicError ('Two instructions: ' + n.raw, n.line);	// (FORWARD RIGHT: two words, not a value)
		const args = this.stmtEnd () ? [] : this.argList (null);
		this.endStmt ();
		return { k: 'call', name: id.v, args, line };
	}
	argList (close)
	{
		const a = [];
		if (close && this.isOp (close)) return a;
		a.push (this.expr ());
		while (this.isOp (',')) { this.next (); a.push (this.expr ()); }
		return a;
	}
	ifStmt ()
	{
		const line = this.next ().line;
		const cond = this.expr ();
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
	// A single-line IF's statements (to ELSE when stopAtElse, or to the line's end)
	lineStmts (stopAtElse)
	{
		const out = [];
		for (;;)
		{
			const t = this.peek ();
			if (t.t === 'eol' || t.t === 'eof') break;
			if (t.t === 'sep') { this.next (); continue; }
			if (stopAtElse && this.isKw ('ELSE')) break;
			if (t.t === 'num') { this.err ('GOTO is not available here'); }
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
		if (this.peek ().t === 'id') this.next ();
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
			} while (this.isOp (',') && this.next ());
			const cb = this.block (['CASE', 'END SELECT'], 'SELECT', line);
			cases.push ({ tests, body: cb.stmts, line: cl });
			b = cb;
		}
		this.skipEnd2 ();
		return { k: 'select', e, cases, els, line };
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
				if (this.isOp ('(')) { this.next (); this.expectOp (')'); }
				this.asType ();
				params.push (p.v);
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
		this.inProc = proc;
		const b = this.block (['END ' + kw.v], kw.v, line);
		this.skipEnd2 ();
		this.inProc = null;
		proc.body = b.stmts;
	}
	printStmt ()
	{
		const line = this.next ().line, items = [];
		while (!this.stmtEnd () && !this.isKw ('ELSE'))
		{
			if (this.isOp (';') || this.isOp (',')) { items.push ({ sep: this.next ().v }); continue; }
			items.push ({ e: this.expr () });
		}
		return { k: 'print', items, line };
	}
	dimStmt ()
	{
		const line = this.next ().line, decls = [];
		let shared = false;
		if (this.isKw ('SHARED')) { this.next (); shared = true; }
		do
		{
			const id = this.next (); if (id.t !== 'id') this.err ();
			let dims = null;
			if (this.isOp ('(')) { this.next (); dims = this.argList (')'); this.expectOp (')'); }
			let isStr = id.v.endsWith ('$');
			if (this.isKw ('AS')) { this.next (); const ty = this.next (); if (ty.v === 'STRING') isStr = true; }
			decls.push ({ name: id.v, dims, isStr });
		} while (this.isOp (',') && this.next ());
		return { k: 'dim', decls, shared, line };
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
		if (t.t === 'id')
		{
			if (this.isOp ('(')) { this.next (); const args = this.argList (')'); this.expectOp (')'); return { k: 'ref', name: t.v, args, parens: true, line: t.line }; }
			return { k: 'ref', name: t.v, args: [], parens: false, line: t.line };
		}
		this.p--;
		this.err ();
	}
}

// ---- the run -------------------------------------------------------------------------------------------------------------
const MAX_DEPTH = 400;
class Exit { constructor (what) { this.what = what; } }

class Interp
{
	constructor (prog, host, dialect)
	{
		this.prog = prog; this.host = host; this.dialect = dialect || {};
		this.globals = new Map (); this.consts = new Map (); this.sharedG = new Set ();
		this.frames = [{ proc: null, vars: this.globals, shared: null, ret: 0 }];
		this.line = 0;
	}
	get frame () { return this.frames[this.frames.length - 1]; }
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
		if (s.has (name)) return s.get (name);
		return name.endsWith ('$') ? '' : 0;
	}
	setVar (name, v, line)
	{
		if (this.consts.has (name)) throw new BasicError ('Duplicate definition', line);
		if (name.endsWith ('$') ? typeof v !== 'string' : typeof v !== 'number') throw new BasicError ('Type mismatch', line);
		const s = this.scopeOf (name), old = s.get (name);
		if (old && old.arr) throw new BasicError ('Type mismatch', line);
		s.set (name, v);
	}
	run ()
	{
		try { this.block (this.prog.body); }
		catch (e)
		{
			if (e instanceof Exit) return;
			if (e instanceof BasicError && !e.line) e.line = this.line;
			if (e instanceof RangeError) throw new BasicError ('Out of stack space', this.line);
			throw e;
		}
	}
	stmt (line)
	{
		this.line = line;
		if (this.host.onStatement && this.host.onStatement (line) === false) throw new Endless ();
	}
	block (stmts)
	{
		for (const s of stmts) { const r = this.exec (s); if (r) return r; }
		return null;
	}
	truth (v, line) { return num (v, line) !== 0; }
	exec (s)
	{
		if (s.k !== 'seq') this.stmt (s.line);
		switch (s.k)
		{
		case 'seq': return this.block (s.body);
		case 'assign':
		{
			const v = this.eval (s.expr);
			const f = this.frame;
			if (!s.idx && f.proc && f.proc.kind === 'FUNCTION' && s.name === f.proc.name)
			{
				if (s.name.endsWith ('$') ? typeof v !== 'string' : typeof v !== 'number') throw new BasicError ('Type mismatch', s.line);
				f.ret = v; return null;
			}
			if (s.idx) { this.arrayCell (s.name, s.idx, s.line, v); return null; }
			this.setVar (s.name, v, s.line);
			return null;
		}
		case 'call': this.call (s.name, s.args, s.line, false, true); return null;
		case 'if':
			for (const c of s.conds)
			{
				if (c !== s.conds[0]) this.stmt (c.line);
				if (this.truth (this.eval (c.cond), c.line)) return this.block (c.body);
			}
			return s.els ? this.block (s.els) : null;
		case 'for':
		{
			const from = num (this.eval (s.from), s.line), to = num (this.eval (s.to), s.line), step = s.step ? num (this.eval (s.step), s.line) : 1;
			this.setVar (s.v, from, s.line);
			for (;;)
			{
				const i = this.getVar (s.v);
				if (step >= 0 ? i > to + 1e-9 : i < to - 1e-9) break;
				const r = this.block (s.body);
				if (r === 'FOR') break;
				if (r) return r;
				this.setVar (s.v, this.getVar (s.v) + step, s.line);
				this.stmt (s.line);
			}
			return null;
		}
		case 'while':
			for (;;)
			{
				if (!this.truth (this.eval (s.cond), s.line)) break;
				const r = this.block (s.body);
				if (r === 'WHILE') break;
				if (r) return r;
				this.stmt (s.line);
			}
			return null;
		case 'do':
			for (;;)
			{
				if (s.pre && this.truth (this.eval (s.pre.cond), s.line) === s.pre.until) break;
				const r = this.block (s.body);
				if (r === 'DO') break;
				if (r) return r;
				if (s.post) { this.stmt (s.post.line); if (this.truth (this.eval (s.post.cond), s.post.line) === s.post.until) break; }
				else this.stmt (s.line);
			}
			return null;
		case 'repeat':
		{
			const n = Math.round (num (this.eval (s.n), s.line));
			for (let i = 0; i < n; i++)
			{
				const r = this.block (s.body);
				if (r === 'REPEAT') break;
				if (r) return r;
				if (i + 1 < n) this.stmt (s.line);
			}
			return null;
		}
		case 'select':
		{
			const v = this.eval (s.e);
			for (const c of s.cases)
			{
				let hit = false;
				for (const t of c.tests)
				{
					const a = this.eval (t.a);
					if (t.op === 'TO') hit = this.compare (v, a, '>=', s.line) && this.compare (v, this.eval (t.b), '<=', s.line);
					else hit = this.compare (v, a, t.op, s.line);
					if (hit) break;
				}
				if (hit) return this.block (c.body);
			}
			return s.els ? this.block (s.els) : null;
		}
		case 'exit':
			if (s.what === 'END') throw new Exit ('END');
			if ((s.what === 'SUB' || s.what === 'FUNCTION') && !this.frame.proc) throw new BasicError ('EXIT ' + s.what + ' outside a ' + s.what, s.line);
			return s.what;
		case 'end': throw new Exit ('END');
		case 'print':
		{
			let out = '', nl = true;
			for (const it of s.items)
			{
				if (it.sep === ';') { nl = false; continue; }
				if (it.sep === ',') { out += ' '.repeat (14 - (out.length % 14)); nl = false; continue; }
				const v = this.eval (it.e);
				out += typeof v === 'number' ? (v >= 0 ? ' ' : '') + fmtNum (v) + ' ' : v;
				nl = true;
			}
			if (this.host.print) this.host.print (out + (nl ? '\n' : ''));
			return null;
		}
		case 'dim':
			for (const d of s.decls)
			{
				const scope = s.shared || !this.frame.proc ? this.globals : this.frame.vars;
				if (s.shared) this.sharedG.add (d.name);
				if (d.dims)
				{
					const dims = d.dims.map ((e) => Math.round (num (this.eval (e), s.line)) + 1);
					if (dims.some ((n) => n < 1 || n > 100000)) throw new BasicError ('Subscript out of range', s.line);
					scope.set (d.name, { arr: true, dims, data: new Array (dims.reduce ((a, b) => a * b, 1)).fill (d.isStr ? '' : 0) });
				}
				else if (!scope.has (d.name)) scope.set (d.name, d.isStr ? '' : 0);
			}
			return null;
		case 'shared':
			if (this.frame.proc) for (const n of s.names) this.frame.shared.add (n);
			return null;
		case 'const':
			if (this.consts.has (s.name)) throw new BasicError ('Duplicate definition', s.line);
			this.consts.set (s.name, this.eval (s.expr));
			return null;
		}
		return null;
	}
	arrayCell (name, idx, line, set)
	{
		const a = this.scopeOf (name).get (name);
		if (!a || !a.arr) throw new BasicError ('Sub or function not defined: ' + name, line);
		if (idx.length !== a.dims.length) throw new BasicError ('Wrong number of dimensions', line);
		let k = 0;
		for (let i = 0; i < idx.length; i++)
		{
			const v = Math.round (num (this.eval (idx[i]), line));
			if (v < 0 || v >= a.dims[i]) throw new BasicError ('Subscript out of range', line);
			k = k * a.dims[i] + v;
		}
		if (set === undefined) return a.data[k];
		if (typeof set !== typeof a.data[k]) throw new BasicError ('Type mismatch', line);
		a.data[k] = set;
		return set;
	}
	// A name called: a statement (asStmt) or in an expression
	call (name, argExprs, line, inExpr, asStmt)
	{
		const d = this.dialect;
		if (d.words && d.words[name])
		{
			const w = d.words[name];
			if (inExpr && w.kind === 's') throw new BasicError ('Type mismatch', line);
			const args = argExprs.map ((e) => this.eval (e));
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
			const args = argExprs.map ((e) => this.eval (e));
			if (this.frames.length > MAX_DEPTH) throw new BasicError ('Out of stack space', line);
			const vars = new Map ();
			p.params.forEach ((n, i) =>
			{
				if (n.endsWith ('$') ? typeof args[i] !== 'string' : typeof args[i] !== 'number') throw new BasicError ('Type mismatch', line);
				vars.set (n, args[i]);
			});
			const f = { proc: p, vars, shared: new Set (), ret: p.name.endsWith ('$') ? '' : 0 };
			this.frames.push (f);
			try { this.block (p.body); }
			finally { this.frames.pop (); this.line = line; }
			return f.ret;
		}
		if (BUILTINS[name])
		{
			const [mn, mx, fn] = BUILTINS[name];
			if (asStmt) throw new BasicError ('Syntax error', line);
			if (argExprs.length < mn || argExprs.length > mx) throw new BasicError ('Wrong number of arguments', line);
			const args = argExprs.map ((e) => this.eval (e));
			try { return fn (args, line); }
			catch (e) { if (e instanceof BasicError && !e.line) e.line = line; throw e; }
		}
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
	eval (e)
	{
		switch (e.k)
		{
		case 'num': return e.v;
		case 'str': return e.v;
		case 'ref':
		{
			const n = e.name, d = this.dialect;
			if (d.words && d.words[n]) return this.call (n, e.args, e.line, true, false);
			const p = this.prog.procs[n];
			if (p && p.kind === 'FUNCTION')
			{
				const f = this.frame;
				if (!e.parens && f.proc === p && p.params.length > 0) return f.ret;
				if (e.parens || p.params.length === 0) return this.call (n, e.args, e.line, true, false);
			}
			if (e.parens)
			{
				const a = this.scopeOf (n).get (n);
				if (a && a.arr) return this.arrayCell (n, e.args, e.line);
				return this.call (n, e.args, e.line, true, false);
			}
			if (p) throw new BasicError ('Type mismatch', e.line);
			if (BUILTINS[n] && BUILTINS[n][0] === 0) return this.call (n, [], e.line, true, false);
			const v = this.getVar (n);
			if (v && v.arr) throw new BasicError ('Type mismatch', e.line);
			return v;
		}
		case 'un':
		{
			const a = num (this.eval (e.a), this.line);
			return e.op === '-' ? -a : ~Math.round (a);
		}
		case 'bin':
		{
			const op = e.op;
			const a = this.eval (e.a), b = this.eval (e.b);
			if (['=', '<>', '<', '>', '<=', '>='].includes (op)) return this.compare (a, b, op, this.line) ? -1 : 0;
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
}

// A message of the language turned into French, word by word (BASIC's and the host's words named in French)
function frenchMessage (msg, more)
{
	const SAID = [['Expected ', 'il manque '], [' without its ', ' sans son '], [' without ', ' sans '], [' inside a block', ' dans un bloc'],
		['Duplicate definition', 'Définition en double'], ['Subscript out of range', 'Indice hors limites'],
		['Illegal function call', 'Appel de fonction impossible'], ['Wrong number of dimensions', 'Pas le bon nombre de dimensions'],
		['is not available here', "n'existe pas ici"], ['outside a', 'hors d\'un']];
	let out = msg;
	for (const [en, fr] of SAID) out = out.split (en).join (fr);
	return out.replace (/\b[A-Z][A-Z0-9$]*\b/g, (w) => (more && more[w]) || SHOWN_FR[w] || w);
}

const Basic = {
	BasicError, Endless, KEYWORDS, FRENCH, SHOWN_FR, plain, fmtNum, frenchMessage,
	compile (src, dialect) { return new Parser (tokenize (src, dialect), dialect).program (); },
	run (prog, host, dialect) { new Interp (prog, host, dialect).run (); },
	tokenize };
if (typeof module !== 'undefined' && module.exports) module.exports = Basic; else global.Basic = Basic;
}) (typeof window !== 'undefined' ? window : globalThis);
