#!/usr/bin/env python3
# port-amanda.py -- Amanda 2.7 (Rémi Poulin, 2001) brought to Code is Fun's free mode: AMANDA.BAS (code page 437)
# to UTF-8, its memory MEMOIRE.DAT turned into DATA lines (a web page has no files), the file statements replaced
# by RESTORE / READ. Everything else is the original program.
#   python3 tools/port-amanda.py AMANDA.BAS MEMOIRE.DAT > turtle/bas/amanda.bas
# MIT License (this script) -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
import sys
src = open (sys.argv[1], 'rb').read ().decode ('cp437').replace ('\r\n', '\n').replace ('\r', '\n')
mem = open (sys.argv[2], 'rb').read ().decode ('cp437').replace ('\r\n', '\n').replace ('\r', '\n')

def sub (a, b):
	global src
	assert src.count (a) == 1, a
	src = src.replace (a, b)

sub ("""' └─══════════════════════════════════─┘
""", """' └─══════════════════════════════════─┘
'
' Ported to Code is Fun's free mode (2026): the program is Rémi Poulin's, unchanged but for its files --
' a web page has none: its memory, MEMOIRE.DAT, is in DATA lines at the end of the module (label memoire),
' read with RESTORE / READ; info.ama (the name kept from one talk to the next) is not written: Amanda asks
' the name each time. Its WAIT &H3DA (the screen's retrace) and ON TIMER work as in QBasic.
' Keys: type a sentence, Enter; F1 help, F2 info, F3 speed, Esc quit.
""")
sub ("""OPEN "info.ama" FOR INPUT AS #1
INPUT #1, n$: IF n$ = "" THEN a$ = "Bonjour, quel est votre nom?": nom = 1
IF n$ <> "" THEN CALL bienvenue(a$, n$)
CLOSE #1
GOTO reponse""", """' (Port: no info.ama in a web page -- the name is asked each time)
a$ = "Bonjour, quel est votre nom?": nom = 1
GOTO reponse""")
sub ("""OPEN "memoire.dat" FOR INPUT AS #1
""", """RESTORE memoire   ' (Port: the memory in DATA, at the end of the module)
""")
sub ("""    IF EOF(1) = -1 THEN GOTO sortie
    INPUT #1, d1$
""", """    READ d1$: IF d1$ = "*FIN*" THEN GOTO sortie
""")
sub ("""    INPUT #1, car%, d2$: lm% = LEN(d1$)""", """    READ car%, d2$: lm% = LEN(d1$)""")
sub ("""LOOP UNTIL EOF(1) = -1
sortie:
m$ = m2$
CLOSE #1
""", """LOOP
sortie:
m$ = m2$
""")
sub ("""OPEN "info.ama" FOR OUTPUT AS #1
WRITE #1, n$
CLOSE #1
""", """' (Port: info.ama is not written -- no files in a web page)
""")

# Three names that are Onyx BASIC's French words (REPETER = REPEAT, NON = NOT, FIN = END): renamed, outside the
# strings and the comments
import re
RENAME = { 'repeter': 'redire', 'non': 'repnon', 'fin': 'fini' }
def rename (line):
	out, i, q = '', 0, False
	parts = re.split (r'("[^"]*"?)', line)
	for k, part in enumerate (parts):
		if k % 2: out += part; continue
		c = part.find ("'")
		code, rest = (part, '') if c < 0 else (part[:c], part[c:])
		code = re.sub (r'(?<![\w$%.])(repeter|non|fin)(?![\w$%])', lambda m: RENAME[m.group (1).lower ()], code, flags = re.I)
		out += code + rest
		if c >= 0: out += ''.join (parts[k + 1:]); break
	return out
src = '\n'.join (rename (l) if not l.lstrip ().upper ().startswith (("REM", "'")) else l for l in src.split ('\n'))
sub ("' Keys: type a sentence", "' Three names are Onyx BASIC's French keywords there (REPETER, NON, FIN): the SUBs repeter and non are\n' called redire and repnon, the variable fin is fini.\n' Keys: type a sentence")

# MEMOIRE.DAT: one entry a line -- word, category, answer (QBasic's INPUT # fields: a quoted one as it is)
def fields (line):
	out, i = [], 0
	while True:
		while i < len (line) and line[i] in ' \t': i += 1
		if i < len (line) and line[i] == '"':
			j = line.find ('"', i + 1); j = len (line) if j < 0 else j
			out.append ((line[i + 1:j], True)); i = j + 1
			while i < len (line) and line[i] != ',': i += 1
		else:
			j = line.find (',', i); j = len (line) if j < 0 else j
			out.append ((line[i:j].strip (), False)); i = j
		if i < len (line) and line[i] == ',': i += 1; continue
		return out
data, bad = [], 0
for n, line in enumerate (mem.split ('\n'), 1):
	if not line.strip () or line.lstrip ().startswith ('#'): continue
	f = fields (line)
	# (an unquoted answer with a " in it -- j"aime, a typo for j'aime: QBasic reads it as it is; DATA cannot)
	f = [(v.replace ('"', "'") if not q else v, q) for v, q in f]
	if len (f) != 3 or not f[1][0].strip ().lstrip ('-').isdigit () or any ('"' in v for v, q in f):
		print ('MEMOIRE.DAT line %d: %r' % (n, line), file = sys.stderr); bad += 1; continue
	data.append ('DATA "%s", %s, "%s"' % (f[0][0], f[1][0].strip (), f[2][0]))
block = "\n' ---- MEMOIRE.DAT, Amanda's memory: word, category, answer (211 = category 21 + 1 masculine, 2 feminine, 0 none) ----\n"
block += "memoire:\n" + '\n'.join (data) + '\nDATA "*FIN*"\n\n'
i = src.index ('\nSUB accent') + 1
src = src[:i] + block + src[i:]
sys.stdout.write (src)
print ('%d entries, %d refused' % (len (data), bad), file = sys.stderr)
