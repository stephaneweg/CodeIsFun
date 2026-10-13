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

# Amanda's portrait (Code is Fun, 2026): pixel art in half blocks (CHR$(223) / CHR$(220): two pixels a character cell,
# 42 x 18 in the face's frame) instead of the original's ASCII face; four pictures -- normal, annoyed (the original's
# second face, for the rude words), eyes shut (she blinks while she waits) and mouth open (she talks on the vowels).
# The letters: . background, H h hair, Y its shine, S s skin, k brows, K black, W white, E iris, L lips, B blush,
# R r the bow, C c the top.
ART_L = [
	".............hhHHHHHH",  # 0  hair
	"...........hHHHYYHHHH",  # 1
	"..........hHHHYHHHHHH",  # 2
	".........hHHHHHHHHHHH",  # 3
	".........HHHHSSSSSHHh",  # 4  fringe
	"........hHHHSSkkkkSSS",  # 5  brows
	"........HHHSSSKKKKSSS",  # 6  lashes
	"........HHHSSSWEEWSSS",  # 7  eyes
	"........HHHsSSSSSSSSS",  # 8
	"........HHHsSSSSSSSSs",  # 9  nose
	".......hHHHHsSSSSSLSS",  # 10 the smile's corners
	".......HHHHHhsSSSSSLL",  # 11 the smile
	".......HHHHHHhsSSSSSS",  # 12
	".......HHHHHHHhssSSSS",  # 13 chin
	"......hHHHHHHHhhhhsSS",  # 14 neck
	"......HHHHHHHCCCCCCcS",  # 15
	"......HHHHHCCCCCCCCCc",  # 16
	"......HHHCCCCCCCCCCCC",  # 17
]
def put (A, r, c, t):
	for i, ch in enumerate (t):
		if ch != ' ': A[r] = A[r][:c + i] + ch + A[r][c + i + 1:]
NORMAL = [l + l[::-1] for l in ART_L]
put (NORMAL, 2, 10, "RR RR"); put (NORMAL, 3, 10, "RRrRR"); put (NORMAL, 4, 10, "R   R")
PICS = [NORMAL, list (NORMAL), list (NORMAL), list (NORMAL)]
A = PICS[1]   # annoyed: the brows down to the nose, blush, a frown
put (A, 5, 14, "kkkS"); put (A, 5, 24, "Skkk"); put (A, 6, 17, "k"); put (A, 6, 24, "k")
put (A, 8, 13, "BB"); put (A, 8, 27, "BB"); put (A, 10, 18, "SLLLLS"); put (A, 11, 18, "LSSSSL")
for r, t in ((6, "SSSS"), (7, "KKKK")): put (PICS[2], r, 14, t); put (PICS[2], r, 24, t)     # eyes shut
for r, t in ((10, "SLLLLS"), (11, "SKKKKS")): put (PICS[3], r, 18, t)                       # mouth open
assert all (len (l) == 42 for P in PICS for l in P)
lines = ["SUB portraitinit", "' Amanda's portrait (Code is Fun, 2026): four pictures of 42 x 18 pixels, one letter a pixel -- 0 normal,",
	"' 1 annoyed, 2 eyes shut, 3 mouth open (an empty line: the same as in the picture 0). Their colours: the",
	"' palette's 9, 10, 11 and 13, which Amanda does not use, made skin, gold, shadow and pink.",
	"PALETTE 9, 39: PALETTE 10, 38: PALETTE 11, 28: PALETTE 13, 53"]
for v, P in enumerate (PICS):
	for r, l in enumerate (P):
		if v == 0 or l != NORMAL[r]: lines.append ('art$(%d, %d) = "%s"' % (r, v, l))
lines += ["END SUB", "", "SUB dessine (v, k1, k2, c1, c2)",
	"' draws the character rows k1 to k2 (0 to 8) and the columns c1 to c2 (0 to 41) of the picture v: each cell",
	"' holds two pixels, the upper one the foreground of a " + chr (0x2580) + ", the lower one its background",
	"' (the cursor is put back where it was: Amanda may be writing her answer)",
	"r = CSRLIN: c = POS(0)",
	"FOR k = k1 TO k2",
	"  h$ = art$(2 * k, v): IF h$ = \"\" THEN h$ = art$(2 * k, 0)",
	"  b$ = art$(2 * k + 1, v): IF b$ = \"\" THEN b$ = art$(2 * k + 1, 0)",
	"  LOCATE 14 + k, 4 + c1",
	"  FOR x = c1 + 1 TO c2 + 1",
	"    ch = INSTR(\"0123456789ABCDEF\", MID$(\"5A69B60F1CDDC3FE\", INSTR(\".HhSskKWELBRrCcY\", MID$(h$, x, 1)), 1)) - 1",
	"    cb = INSTR(\"0123456789ABCDEF\", MID$(\"5A69B60F1CDDC3FE\", INSTR(\".HhSskKWELBRrCcY\", MID$(b$, x, 1)), 1)) - 1",
	"    IF ch = cb THEN",
	"      COLOR ch, 0: PRINT CHR$(219);",
	"    ELSEIF ch < 8 AND cb > 7 THEN",
	"      COLOR cb, ch: PRINT CHR$(220);",
	"    ELSE",
	"      COLOR ch, cb: PRINT CHR$(223);",
	"    END IF",
	"  NEXT x",
	"NEXT k",
	"LOCATE r, c",
	"END SUB", "", "SUB cligne (ferme)",
	"' the eyes shut (ferme = 1) or open -- only on the normal face, not over the help",
	"IF humeur <> 0 THEN EXIT SUB",
	"IF ferme THEN CALL dessine(2, 3, 3, 14, 27) ELSE CALL dessine(0, 3, 3, 14, 27)",
	"COLOR 14, 0   ' (the colour of what is typed)",
	"END SUB", "", "SUB parle (c$)",
	"' the mouth open on a vowel, shut on the rest, as she writes her answer",
	"IF humeur > 1 THEN EXIT SUB",
	"o = 0: IF c$ <> \"\" THEN IF INSTR(\"aeiouy" + "àâéèêëîïôûù" + "\", c$) THEN o = 1",
	"IF o = ouverte THEN EXIT SUB",
	"ouverte = o",
	"IF o THEN CALL dessine(3, 5, 5, 18, 23) ELSE CALL dessine(humeur, 5, 5, 18, 23)",
	"END SUB", ""]
PORTRAIT = '\n'.join (lines) + '\n'

sub ("""DECLARE SUB finir (n$)
""", """DECLARE SUB finir (n$)
DECLARE SUB portraitinit ()
DECLARE SUB dessine (v, k1, k2, c1, c2)
DECLARE SUB cligne (ferme)
DECLARE SUB parle (c$)
DIM SHARED art$(17, 3), humeur, ouverte   ' (Port: the portrait -- humeur 0 normal, 1 annoyed, 9 hidden)
""")
sub ("""CALL graphic
CALL face0(face, tim)""", """CALL graphic
CALL portraitinit
CALL face0(face, tim)""")
src = src.replace ("""  x$ = INKEY$: IF x$ <> "" THEN fo = i:""", """  clin = clin + 1: IF clin = 24 THEN CALL cligne(1)
  IF clin > 24 THEN CALL cligne(0): clin = INT(RND * 6)
  x$ = INKEY$: IF x$ <> "" THEN fo = i:""")
sub (""" PRINT MID$(a$, i, 1); : IF ma$ <> " " THEN SOUND 200, 1 / 10
""", """ PRINT MID$(a$, i, 1); : IF ma$ <> " " THEN SOUND 200, 1 / 10
 CALL parle(ma$)
""")
sub ("""NEXT i
SOUND 200, 0
IF i = 61""", """NEXT i
SOUND 200, 0
CALL parle(" ")
IF i = 61""")
# the original's two ASCII faces: now the portrait's pictures 0 and 1
i = src.index ('\nSUB face0 (face, tim)') + 1; j = src.index ('END SUB', i)
src = src[:i] + 'SUB face0 (face, tim)\n\nIF tim = 1 THEN tim = 0: EXIT SUB\nhumeur = 0: ouverte = 0: CALL dessine(0, 0, 8, 0, 41)   \' (Port: the portrait)\nface = 8\n\n' + src[j:]
i = src.index ('\nSUB face1 (face, tim)') + 1; j = src.index ('END SUB', i)
src = src[:i] + 'SUB face1 (face, tim)\n\nhumeur = 1: ouverte = 0: CALL dessine(1, 0, 8, 0, 41)   \' (Port: the portrait)\nface = 0: tim = 0\n\n' + src[j:]
# help, info and the speed are written over the portrait: no blinking nor talking over them
assert src.count ('tim = 0: face = 0\n\nEND SUB') == 2
src = src.replace ('tim = 0: face = 0\n\nEND SUB', 'tim = 0: face = 0: humeur = 9\n\nEND SUB')
sub ('tim = 0: face = 0: a$ = "ah, te revoil', 'humeur = 9: tim = 0: face = 0: a$ = "ah, te revoil')
assert src.count ('\nCOLOR 2, 5: LOCATE 15, 5: PRINT "') == 3
src = src.replace ('\nCOLOR 2, 5: LOCATE 15, 5: PRINT "', '\nCOLOR 0, 5: LOCATE 14, 4: PRINT SPACE$(42)   \' (Port: the portrait\'s top row)\nCOLOR 2, 5: LOCATE 15, 5: PRINT "')
sub ("' Keys: type a sentence", "' Her face is new: a portrait in half blocks that blinks and talks (SUB portraitinit and the next ones).\n' Keys: type a sentence")

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
src = src[:i] + block + PORTRAIT + src[i:]
sys.stdout.write (src)
print ('%d entries, %d refused' % (len (data), bad), file = sys.stderr)
