' zoomo.bas -- ZOOMO!, the cartoon anti-gravity racer, in BASIC (Code is Fun's free mode; Onyx BASIC's 3D).
' The little brother of Antigrav (the example), all in sunshine: a candy-striped track that climbs, dives and
' banks on its pillars, rainbow arches, lollipop trees and puffy clouds, a sun with a face, and six cartoon
' pilots in their hover pods -- a turtle, a cat, a bunny, a pig, a bear and a dragon.
'
'   Left / Right ...... steer             Down ........... brake (the craft goes by itself)
'   Space ............. use what a ? box gave you: a rocket, gum, a bubble, a turbo
'   P ................. pause             Esc ............ back to the title (Esc there: quit)
'   A gamepad: the d-pad or the stick, A use, B brake, Start pause.
'   A finger or the mouse: hold the left or the right half of the screen.
'
' Three circuits (Candy Hills, Sunny Beach, Star Loop), three laps, five rivals who fight back. The blue
' arrows on the track throw you forward. Finish first!
'
' Shows: the pictures drawn with CIRCLE ... F, LINE, PAINT and DRAWTEXT, then taken with GRAB3D (magenta =
' see-through) and shown as billboards facing the camera (the craft, the trees, the clouds, the sun);
' the track made of VERTEX3D quads coloured one by one; CUBE3D pillars lit by LIGHT3D; BLEND3D 1 (see-
' through) and 3 (the shadows: a multiply); KEYDOWN / PAD / MOUSEB; NOTEON sounds, MIDINOTE music;
' SUBs and FUNCTIONs on SHARED arrays.
'
' MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.

CONST PI = 3.14159265
CONST NSEG = 400, HW = 6, WALLH = 1.1, NSHIP = 6, NPROJ = 24, MAXDECO = 160, NCIRC = 3, LAPS = 3

' ---- the circuit -------------------------------------------------------------------------------
DIM SHARED px(NSEG), py(NSEG), pz(NSEG), tx(NSEG), ty(NSEG), tz(NSEG)
DIM SHARED rx(NSEG), ry(NSEG), rz(NSEG), ux(NSEG), uy(NSEG), uz(NSEG), cv(NSEG)
DIM SHARED kind(NSEG), lane(NSEG)                ' 1 tunnel, 2 speed pad, 4 ? boxes, 8 a rainbow; the pad's lane
DIM SHARED dxs(4 * NSEG + 4), dys(4 * NSEG + 4), dzs(4 * NSEG + 4), dl(4 * NSEG + 4)
DIM SHARED dkx(MAXDECO), dky(MAXDECO), dkz(MAXDECO), dkk(MAXDECO), dks(MAXDECO), dkseg(MAXDECO), ndeco
DIM SHARED mmx(50), mmy(50)
DIM SHARED seglen, tlen, groundY, circ, cname$(NCIRC)
DIM SHARED wx, wy, wz, ftx, fty, ftz, frx, fry, frz, fux, fuy, fuz, fcv, fkind, flane

' ---- the colours of the three circuits -----------------------------------------------------------
' sky top, horizon, ground 1, ground 2, track 1, track 2, kerb, wall 1, wall 2, skirt, pillar, tunnel 1, tunnel 2
DIM SHARED tc(NCIRC, 13), night(NCIRC), decoA(NCIRC), decoB(NCIRC)

' ---- the craft ---------------------------------------------------------------------------------
DIM SHARED sd(NSHIP), lx(NSHIP), v(NSHIP), vl(NSHIP), steer(NSHIP), thrust(NSHIP), brake(NSHIP)
DIM SHARED item(NSHIP), shield(NSHIP), turbo(NSHIP), spin(NSHIP), stuck(NSHIP), skill(NSHIP), aioff(NSHIP)
DIM SHARED arrived(NSHIP), fintime(NSHIP), lapst(NSHIP), bestlap(NSHIP), place(NSHIP), firewait(NSHIP), pilot(NSHIP), order(NSHIP)
DIM SHARED powT(NSHIP), pow$(NSHIP), bonkT(NSHIP)
DIM SHARED pname$(5), pkind(5), pc1(5), pc2(5), pskin(5)

' ---- the shots, the gum, the ? boxes -------------------------------------------------------------
DIM SHARED pk(NPROJ), ps(NPROJ), pl(NPROJ), pv(NPROJ), pown(NPROJ), ptgt(NPROJ), plife(NPROJ)
DIM SHARED boxwait(NSEG * 3)

' ---- the game ----------------------------------------------------------------------------------
DIM SHARED tex.track, tex.boost, tex.box, tex.sun, tex.moon, tex.cloud, tex.shadow, tex.check, tex.rocket, tex.gum, tex.pow, tex.ground
DIM SHARED texShip(5), texDeco(6), dsize(6), dhigh(6)
DIM SHARED vmax, state, racet, cdown, paused, demo, vdist, mypilot, menuSel
DIM SHARED cex, cey, cez, ctx, cty, ctz, crx, cry, crz, cux, cuy, cuz
DIM SHARED t, dt, msg$, msgT, best(NCIRC), lastBeep, padprev, camL, camH
DIM SHARED sndOn, musOn, engF, sfxEnd(16), mstep, mnext, mbar, mbass, mleadOn
DIM SHARED lang$, trE$(60), trF$(60), ntr, fontch$, glyph$(48), itemName$(4)
DIM SHARED INK, MAGENTA

RANDOMIZE TIMER
LoadWords
fontch$ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-!.:/<>?"
RESTORE BigFont
FOR i = 1 TO LEN(fontch$): READ glyph$(i): NEXT
RESTORE Pilots
FOR i = 0 TO 5: READ pname$(i), pkind(i), a, b, c: pc1(i) = Hex2Rgb(a): pc2(i) = Hex2Rgb(b): pskin(i) = Hex2Rgb(c): NEXT
RESTORE Colours
FOR c = 1 TO NCIRC
  READ cname$(c), night(c), decoA(c), decoB(c)
  FOR k = 1 TO 13: READ a: tc(c, k) = Hex2Rgb(a): NEXT
NEXT
itemName$(1) = T$("ROCKET"): itemName$(2) = T$("GUM"): itemName$(3) = T$("BUBBLE"): itemName$(4) = T$("TURBO")
INK = RGB(43, 35, 64): MAGENTA = RGB(255, 0, 255)    ' (magenta: see-through in a GRAB3D picture)

SCREEN 12
sndOn = -1: musOn = -1
ON ERROR GOTO NoSound
NOTEON 15, 100, 1, 0: NOTEOFF 15
ON ERROR GOTO NoMusic
MIDIPROGRAM 0, 33: MIDINOTE 0, 40, 0
ON ERROR GOTO 0

MakeTextures
circ = 1: mypilot = 0
BuildCircuit circ
DO
  TitleScreen
  Race
LOOP

NoSound:
  sndOn = 0: musOn = 0
  RESUME NEXT
NoMusic:
  musOn = 0
  RESUME NEXT

Pilots:      ' name, kind (0 turtle 1 cat 2 bunny 3 pig 4 bear 5 dragon), craft colour, its stripe, the head
DATA "TITO", 0, &H2FB24A, &HFFD23F, &H8CD867
DATA "MIMI", 1, &HFF8A1C, &HFFFDF8, &HFFB35C
DATA "LULU", 2, &HFF5FA8, &HFFFFFF, &HFFE6F0
DATA "PEPIN", 3, &H2E8BFF, &HFFD23F, &HFFA7BC
DATA "BRUNO", 4, &H9B5CFF, &HFFC83D, &HB9804E
DATA "DRAKO", 5, &HE8383F, &HFFD23F, &H4CC94A

Colours:     ' name, night, the two scenery pictures; then the 13 colours (see tc above)
DATA "CANDY HILLS", 0, 1, 2
DATA &H3FA9F5, &HCFF1FF, &H7CCB4E, &H6BBB42, &HC9B8F2, &HB9A6EA, &HFF4F6E, &HFF6FA6, &HFFFFFF, &H8A5FC4, &HFFD23F, &HFF8FC0, &HFFFFFF
DATA "SUNNY BEACH", 0, 3, 4
DATA &H22B8F0, &HFFF1C1, &H1FC2D6, &H17AFC4, &HFFE2A8, &HF6D08E, &HFF6A3D, &H3FA7FF, &HFFFFFF, &HE0904A, &HFFF1C9, &H3DD68C, &HFFFFFF
DATA "STAR LOOP", -1, 5, 6
DATA &H0B0B2E, &H4A2A86, &H140F33, &H1A1440, &H3A3170, &H322A63, &H35F0FF, &HB06CFF, &H35F0FF, &H241C52, &H6A5ACD, &HB06CFF, &H2B2268

Words:       ' English, French (SD:/etc/system.ini's language=fr)
DATA "LAP", "TOUR", "LAST LAP!", "DERNIER TOUR !", "GO!", "PARTEZ !", "FINISH!", "ARRIVEE !"
DATA "ROCKET", "FUSEE", "GUM", "CHEWING-GUM", "BUBBLE", "BULLE", "TURBO", "TURBO"
DATA "POW!", "BAM !", "SPLAT!", "SPLAF !", "POP!", "PLOP !", "BONK!", "BONK !"
DATA "PILOT", "PILOTE", "CIRCUIT", "CIRCUIT", "START", "PARTEZ", "QUIT", "QUITTER"
DATA "PAUSED", "PAUSE", "YOU WIN!", "GAGNE !", "PODIUM!", "PODIUM !", "BEST LAP", "MEILLEUR TOUR"
DATA "CANDY HILLS", "COLLINES BONBONS", "SUNNY BEACH", "PLAGE SOLEIL", "STAR LOOP", "BOUCLE ETOILES"
DATA "Up/Down choose  Left/Right change  Enter play  Esc quit", "Haut/Bas choisir  Gauche/Droite changer  Entree jouer  Esc quitter"
DATA "Arrows steer  Down brake  Space use  P pause", "Fleches tourner  Bas freiner  Espace utiliser  P pause"
DATA "Enter: back to the title", "Entree : retour au titre", "P: resume   Esc: title", "P : reprendre   Esc : titre"
DATA "", ""

BigFont:     ' 5 x 7 letters: 35 dots a glyph (# lit), in the order of FONTCH$
DATA ".###.#...##...#######...##...##...#", "####.#...##...#####.#...##...#####.", ".###.#...##....#....#....#...#.###."
DATA "####.#...##...##...##...##...#####.", "######....#....####.#....#....#####", "######....#....####.#....#....#...."
DATA ".###.#...##....#.####...##...#.####", "#...##...##...#######...##...##...#", ".###...#....#....#....#....#...###."
DATA "..###...#....#....#.#..#.#..#..##..", "#...##..#.#.#..##...#.#..#..#.#...#", "#....#....#....#....#....#....#####"
DATA "#...###.###.#.##.#.##...##...##...#", "#...##...###..##.#.##..###...##...#", ".###.#...##...##...##...##...#.###."
DATA "####.#...##...#####.#....#....#....", ".###.#...##...##...##.#.##..#..##.#", "####.#...##...#####.#.#..#..#.#...#"
DATA ".#####....#.....###.....#....#####.", "#####..#....#....#....#....#....#..", "#...##...##...##...##...##...#.###."
DATA "#...##...##...##...##...#.#.#...#..", "#...##...##...##.#.##.#.##.#.#.#.#.", "#...##...#.#.#...#...#.#.#...##...#"
DATA "#...##...#.#.#...#....#....#....#..", "#####....#...#...#...#...#....#####", ".###.#...##..###.#.###..##...#.###."
DATA "..#...##....#....#....#....#...###.", ".###.#...#....#...#...#...#...#####", "####.....#....#.###.....#....#####."
DATA "...#...##..#.#.#..#.#####...#....#.", "######....####.....#....##...#.###.", ".###.#....#....####.#...##...#.###."
DATA "#####....#...#...#...#....#....#...", ".###.#...##...#.###.#...##...#.###.", ".###.#...##...#.####....#....#.###."
DATA "...............#####...............", "..#....#....#....#....#.........#..", "..........................##...##.."
DATA "......##...##........##...##.......", "....#....#...#...#...#...#....#....", "...#...#...#...#.....#.....#.....#."
DATA ".#.....#.....#.....#...#...#...#...", ".###.#...#....#...#....#.........#."

' ================================================================================================
' Words, colours
' ================================================================================================
FUNCTION Hex2Rgb (h)
  Hex2Rgb = RGB((h \ 65536) AND 255, (h \ 256) AND 255, h AND 255)
END FUNCTION

SUB LoadWords
  lang$ = "en"
  IF FILEEXISTS("SD:/etc/system.ini") THEN
    f = FREEFILE
    OPEN "SD:/etc/system.ini" FOR INPUT AS #f
    DO WHILE NOT EOF(f)
      LINE INPUT #f, l$
      l$ = LCASE$(TRIM$(l$))
      IF LEFT$(l$, 9) = "language=" THEN lang$ = TRIM$(MID$(l$, 10))
    LOOP
    CLOSE #f
  END IF
  RESTORE Words
  ntr = 0
  DO
    READ e$, f$
    IF e$ = "" THEN EXIT DO
    ntr = ntr + 1: trE$(ntr) = e$: trF$(ntr) = f$
  LOOP
END SUB

FUNCTION T$ (e$)
  T$ = e$
  IF lang$ <> "fr" THEN EXIT FUNCTION
  FOR i = 1 TO ntr
    IF trE$(i) = e$ THEN T$ = trF$(i): EXIT FUNCTION
  NEXT
END FUNCTION

' ================================================================================================
' The pictures: drawn on the screen with an ink outline, then taken (GRAB3D; magenta = see-through)
' ================================================================================================
' A filled disc (or an ellipse: asp = height / width) with its ink outline
SUB Disc (x, y, r, c, asp)
  IF asp = 0 THEN asp = 1
  CIRCLE (x, y), r + 1.5, INK, , , asp, F
  CIRCLE (x, y), r, c, , , asp, F
END SUB

' A filled triangle with its ink outline
SUB Tri (x1, y1, x2, y2, x3, y3, c)
  LINE (x1, y1)-(x2, y2), INK: LINE (x2, y2)-(x3, y3), INK: LINE (x3, y3)-(x1, y1), INK
  PAINT ((x1 + x2 + x3) / 3, (y1 + y2 + y3) / 3), c, INK
  LINE (x1, y1)-(x2, y2), INK: LINE (x2, y2)-(x3, y3), INK: LINE (x3, y3)-(x1, y1), INK
END SUB

' A pilot's head, r its radius: from the front (face = -1, for the menus) or from behind (in the craft)
SUB Head (p, x, y, r, face, mood)
  k = pkind(p): sk = pskin(p)
  SELECT CASE k
    CASE 1     ' the cat: pointed ears
      Tri x - r * .95, y - r * .25, x - r * .75, y - r * 1.25, x - r * .15, y - r * .8, sk
      Tri x + r * .95, y - r * .25, x + r * .75, y - r * 1.25, x + r * .15, y - r * .8, sk
    CASE 2     ' the bunny: long ears
      Disc x - r * .45, y - r * 1.25, r * .3, sk, 2.4: Disc x + r * .45, y - r * 1.25, r * .3, sk, 2.4
      IF face THEN CIRCLE (x - r * .45, y - r * 1.25), r * .14, RGB(255, 150, 190), , , 2.6, F: CIRCLE (x + r * .45, y - r * 1.25), r * .14, RGB(255, 150, 190), , , 2.6, F
    CASE 3     ' the pig: floppy ears
      Tri x - r * .9, y - r * .35, x - r * .7, y - r * 1.05, x - r * .2, y - r * .8, RGB(240, 130, 160)
      Tri x + r * .9, y - r * .35, x + r * .7, y - r * 1.05, x + r * .2, y - r * .8, RGB(240, 130, 160)
    CASE 4     ' the bear: round ears
      Disc x - r * .75, y - r * .75, r * .35, sk, 1: Disc x + r * .75, y - r * .75, r * .35, sk, 1
      CIRCLE (x - r * .75, y - r * .75), r * .17, RGB(120, 76, 40), , , , F: CIRCLE (x + r * .75, y - r * .75), r * .17, RGB(120, 76, 40), , , , F
    CASE 5     ' the dragon: horns
      Tri x - r * .7, y - r * .55, x - r * .55, y - r * 1.35, x - r * .2, y - r * .85, RGB(255, 225, 120)
      Tri x + r * .7, y - r * .55, x + r * .55, y - r * 1.35, x + r * .2, y - r * .85, RGB(255, 225, 120)
  END SELECT
  Disc x, y, r, sk, 1
  IF k = 0 THEN                ' the turtle's red bandana (its knot flaps behind)
    CIRCLE (x, y), r, RGB(230, 50, 60), PI * .15, PI * .85, 1
    LINE (x - r * .85, y - r * .45)-(x + r * .85, y - r * .45), RGB(230, 50, 60)
    PAINT (x, y - r * .75), RGB(230, 50, 60), RGB(230, 50, 60)
    IF NOT face THEN Tri x + r * .6, y - r * .3, x + r * 1.35, y - r * .65, x + r * 1.2, y + r * .05, RGB(230, 50, 60)
  END IF
  IF NOT face THEN
    LINE (x - r * .9, y + r * .1)-(x + r * .9, y + r * .1), INK          ' the goggles' strap
    EXIT SUB
  END IF
  ' the face
  IF k = 3 THEN Disc x, y + r * .35, r * .32, RGB(255, 150, 175), .7: PSET (x - r * .1, y + r * .35), INK: PSET (x + r * .1, y + r * .35), INK
  IF k = 4 THEN Disc x, y + r * .38, r * .38, RGB(232, 200, 160), .75: CIRCLE (x, y + r * .25), r * .1, INK, , , , F
  IF k = 5 THEN PSET (x - r * .15, y + r * .3), INK: PSET (x + r * .15, y + r * .3), INK
  IF k = 1 THEN LINE (x - r * .9, y + r * .25)-(x - r * .45, y + r * .3), INK: LINE (x + r * .9, y + r * .25)-(x + r * .45, y + r * .3), INK
  IF mood = 1 THEN             ' ouch: the eyes shut tight
    LINE (x - r * .5, y - r * .25)-(x - r * .2, y - r * .05), INK: LINE (x - r * .5, y - r * .05)-(x - r * .2, y - r * .25), INK
    LINE (x + r * .2, y - r * .25)-(x + r * .5, y - r * .05), INK: LINE (x + r * .2, y - r * .05)-(x + r * .5, y - r * .25), INK
    CIRCLE (x, y + r * .55), r * .15, INK
  ELSE
    Disc x - r * .35, y - r * .15, r * .25, RGB(255, 255, 255), 1.2: Disc x + r * .35, y - r * .15, r * .25, RGB(255, 255, 255), 1.2
    CIRCLE (x - r * .3, y - r * .1), r * .12, INK, , , , F: CIRCLE (x + r * .4, y - r * .1), r * .12, INK, , , , F
    PSET (x - r * .34, y - r * .16), RGB(255, 255, 255): PSET (x + r * .36, y - r * .16), RGB(255, 255, 255)
    IF k <> 3 AND k <> 4 THEN CIRCLE (x, y + r * .2), r * .4, INK, 3.5, 5.9
    IF k = 3 OR k = 4 THEN CIRCLE (x, y + r * .45), r * .35, INK, 3.7, 5.7
  END IF
END SUB

' The craft from behind, in a 64 x 48 box at (ox, oy)
SUB ShipPic (p, ox, oy)
  LINE (ox, oy)-(ox + 63, oy + 47), MAGENTA, BF
  c1 = pc1(p): c2 = pc2(p)
  x = ox + 32: y = oy + 32
  ' the fins, the body, its stripe
  Tri x - 30, y + 4, x - 14, y - 8, x - 14, y + 8, c2
  Tri x + 30, y + 4, x + 14, y - 8, x + 14, y + 8, c2
  Disc x, y, 21, c1, .5
  LINE (x - 19, y - 2)-(x + 19, y + 1), c2, BF
  ' the cockpit's bubble, the head in it
  Disc x, y - 9, 11, RGB(170, 230, 255), .9
  Head p, x, y - 13, 6.5, 0, 0
  CIRCLE (x - 5, y - 15), 2, RGB(255, 255, 255), , , , F
  ' the two thrusters
  Disc x - 10, y + 6, 5, RGB(60, 60, 80), 1: Disc x + 10, y + 6, 5, RGB(60, 60, 80), 1
  CIRCLE (x - 10, y + 6), 3, RGB(120, 240, 255), , , , F: CIRCLE (x + 10, y + 6), 3, RGB(120, 240, 255), , , , F
  CIRCLE (x - 10, y + 6), 1.5, RGB(255, 255, 255), , , , F: CIRCLE (x + 10, y + 6), 1.5, RGB(255, 255, 255), , , , F
  ' the antenna
  LINE (x + 15, y - 6)-(x + 19, y - 20), INK: Disc x + 19, y - 21, 2, c2, 1
END SUB

SUB MakeTextures
  CLS
  ' the track: soft tiles, the lanes' dashes
  LINE (0, 0)-(63, 63), RGB(236, 232, 250), BF
  FOR i = 1 TO 120: PSET (RND * 63, RND * 63), RGB(222, 216, 244): NEXT
  LINE (20, 6)-(22, 26), RGB(255, 255, 255), BF: LINE (41, 6)-(43, 26), RGB(255, 255, 255), BF
  tex.track = GRAB3D(0, 0, 64, 64)
  ' a speed pad: chevrons
  LINE (0, 0)-(31, 31), RGB(30, 95, 217), BF
  FOR k = 0 TO 1
    FOR w = 0 TO 4
      LINE (4, 13 + k * 16 + w)-(16, 3 + k * 16 + w), RGB(127, 243, 255)
      LINE (28, 13 + k * 16 + w)-(16, 3 + k * 16 + w), RGB(127, 243, 255)
    NEXT
  NEXT
  LINE (0, 0)-(31, 31), INK, B
  tex.boost = GRAB3D(0, 0, 32, 32)
  ' the ? box
  LINE (0, 0)-(31, 31), MAGENTA, BF
  LINE (1, 1)-(30, 30), INK, BF: LINE (3, 3)-(28, 28), RGB(255, 200, 40), BF
  LINE (3, 3)-(28, 12), RGB(255, 230, 120), BF
  FOR i = 0 TO 3: LINE (3 + i, 3 + i)-(28 - i, 28 - i), RGB(255, 140 + i * 20, 60), B: NEXT
  DRAWTEXT 12, 8, "?", INK: DRAWTEXT 13, 8, "?", INK
  tex.box = GRAB3D(0, 0, 32, 32)
  ' the sun, with a face
  LINE (0, 0)-(63, 63), MAGENTA, BF
  FOR a = 0 TO 11
    an = a * PI / 6
    Tri 32 + 24 * COS(an - .2), 32 + 24 * SIN(an - .2), 32 + 31 * COS(an), 32 + 31 * SIN(an), 32 + 24 * COS(an + .2), 32 + 24 * SIN(an + .2), RGB(255, 170, 40)
  NEXT
  Disc 32, 32, 22, RGB(255, 215, 60), 1
  Disc 24, 28, 3.5, RGB(255, 255, 255), 1.2: Disc 40, 28, 3.5, RGB(255, 255, 255), 1.2
  CIRCLE (25, 29), 1.8, INK, , , , F: CIRCLE (41, 29), 1.8, INK, , , , F
  CIRCLE (32, 34), 9, INK, 3.6, 5.8
  CIRCLE (18, 37), 3, RGB(255, 140, 120), , , .6, F: CIRCLE (46, 37), 3, RGB(255, 140, 120), , , .6, F
  tex.sun = GRAB3D(0, 0, 64, 64)
  ' the moon (for the night)
  LINE (0, 0)-(63, 63), MAGENTA, BF
  Disc 32, 32, 26, RGB(255, 245, 200), 1
  CIRCLE (40, 22), 5, RGB(235, 220, 170), , , , F: CIRCLE (24, 40), 7, RGB(235, 220, 170), , , , F
  Disc 26, 28, 3, RGB(255, 255, 255), 1.2: CIRCLE (27, 29), 1.5, INK, , , , F
  CIRCLE (36, 34), 7, INK, 3.8, 5.6
  tex.moon = GRAB3D(0, 0, 64, 64)
  ' a puffy cloud
  LINE (0, 0)-(63, 31), MAGENTA, BF
  Disc 18, 20, 10, RGB(255, 255, 255), 1: Disc 32, 14, 13, RGB(255, 255, 255), 1: Disc 47, 20, 10, RGB(255, 255, 255), 1
  LINE (10, 21)-(54, 28), RGB(255, 255, 255), BF: LINE (10, 29)-(54, 29), INK
  CIRCLE (18, 20), 10, RGB(255, 255, 255), , , , F: CIRCLE (32, 14), 13, RGB(255, 255, 255), , , , F: CIRCLE (47, 20), 10, RGB(255, 255, 255), , , , F
  LINE (12, 24)-(52, 26), RGB(225, 238, 255), BF
  tex.cloud = GRAB3D(0, 0, 64, 32)
  ' a shadow (multiplied: white changes nothing)
  LINE (0, 0)-(31, 15), RGB(255, 255, 255), BF
  CIRCLE (16, 8), 14, RGB(150, 140, 170), , , .5, F
  tex.shadow = GRAB3D(0, 0, 32, 16)
  ' the start's chequered banner
  FOR y = 0 TO 3: FOR x = 0 TO 15
    IF (x + y) MOD 2 THEN c = RGB(250, 250, 250) ELSE c = INK
    LINE (x * 4, y * 4)-(x * 4 + 3, y * 4 + 3), c, BF
  NEXT: NEXT
  tex.check = GRAB3D(0, 0, 64, 16)
  ' a rocket (from behind: its fins and its flame)
  LINE (0, 0)-(31, 31), MAGENTA, BF
  Tri 16, 4, 5, 24, 27, 24, RGB(255, 255, 255)
  Disc 16, 16, 8, RGB(255, 80, 80), 1
  Disc 16, 16, 4, RGB(255, 210, 60), 1
  tex.rocket = GRAB3D(0, 0, 32, 32)
  ' a gum splat (lying on the track)
  LINE (0, 0)-(31, 31), MAGENTA, BF
  Disc 16, 16, 12, RGB(255, 120, 200), 1
  Disc 6, 8, 4, RGB(255, 120, 200), 1: Disc 26, 24, 4, RGB(255, 120, 200), 1: Disc 25, 6, 3, RGB(255, 120, 200), 1
  CIRCLE (12, 12), 4, RGB(255, 200, 235), , , , F
  tex.gum = GRAB3D(0, 0, 32, 32)
  ' a comic POW
  LINE (0, 0)-(63, 47), MAGENTA, BF
  FOR a = 0 TO 13
    an = a * PI / 7
    Tri 32 + 14 * COS(an - .25), 24 + 10 * SIN(an - .25), 32 + 31 * COS(an), 24 + 23 * SIN(an), 32 + 14 * COS(an + .25), 24 + 10 * SIN(an + .25), RGB(255, 210, 50)
  NEXT
  Disc 32, 24, 18, RGB(255, 210, 50), .7
  BigText T$("POW!"), 32, 17, 2, RGB(255, 90, 60)
  tex.pow = GRAB3D(0, 0, 64, 48)
  ' the grass (two greens: they show the speed)
  LINE (0, 0)-(31, 31), RGB(255, 255, 255), BF
  LINE (0, 0)-(15, 15), RGB(225, 235, 225), BF: LINE (16, 16)-(31, 31), RGB(225, 235, 225), BF
  tex.ground = GRAB3D(0, 0, 32, 32)
  ' the scenery: 1 a lollipop, 2 a round tree, 3 a palm, 4 a beach umbrella, 5 a ringed planet, 6 a rocky asteroid
  FOR d = 1 TO 6
    LINE (0, 0)-(63, 95), MAGENTA, BF
    SELECT CASE d
      CASE 1
        LINE (30, 40)-(34, 95), INK, BF: LINE (31, 40)-(33, 95), RGB(255, 255, 255), BF
        Disc 32, 26, 24, RGB(255, 90, 150), 1
        FOR r = 18 TO 4 STEP -7: CIRCLE (32, 26), r, RGB(255, 255, 255): CIRCLE (32, 26), r - 1, RGB(255, 255, 255): NEXT
        CIRCLE (24, 18), 4, RGB(255, 200, 225), , , , F
        dsize(d) = 9: dhigh(d) = 13
      CASE 2
        LINE (28, 56)-(36, 95), INK, BF: LINE (30, 56)-(34, 95), RGB(160, 100, 50), BF
        Disc 20, 44, 14, RGB(60, 170, 70), 1: Disc 44, 44, 14, RGB(60, 170, 70), 1: Disc 32, 26, 20, RGB(70, 190, 80), 1
        CIRCLE (20, 44), 14, RGB(60, 170, 70), , , , F: CIRCLE (44, 44), 14, RGB(60, 170, 70), , , , F
        CIRCLE (26, 20), 5, RGB(140, 225, 120), , , , F
        Disc 40, 30, 3, RGB(255, 80, 80), 1: Disc 22, 40, 3, RGB(255, 80, 80), 1
        dsize(d) = 10: dhigh(d) = 15
      CASE 3
        FOR y = 30 TO 95 STEP 6: Disc 32 + (95 - y) / 12, y, 4, RGB(190, 130, 70), .8: NEXT
        FOR a = 0 TO 4
          an = PI * (1.1 + a * .2)
          Tri 36, 28, 36 + 28 * COS(an - .15), 28 + 18 * SIN(an - .15) + 14, 36 + 28 * COS(an + .15), 28 + 18 * SIN(an + .15) + 14, RGB(60, 190, 90)
        NEXT
        Disc 32, 33, 3, RGB(130, 80, 40), 1: Disc 39, 33, 3, RGB(130, 80, 40), 1
        dsize(d) = 9: dhigh(d) = 14
      CASE 4
        LINE (31, 30)-(33, 95), INK, BF
        Tri 2, 34, 32, 8, 62, 34, RGB(255, 90, 90)
        Tri 22, 34, 32, 8, 42, 34, RGB(255, 255, 255)
        dsize(d) = 6: dhigh(d) = 9
      CASE 5
        Disc 32, 48, 20, RGB(255, 160, 80), 1
        LINE (12, 44)-(52, 46), RGB(240, 120, 60), BF: LINE (14, 54)-(50, 56), RGB(240, 120, 60), BF
        CIRCLE (32, 50), 30, INK, , , .25: CIRCLE (32, 50), 29, RGB(255, 230, 140), , , .25: CIRCLE (32, 50), 28, RGB(255, 230, 140), , , .25
        CIRCLE (25, 40), 5, RGB(255, 210, 160), , , , F
        dsize(d) = 18: dhigh(d) = 26
      CASE 6
        Disc 32, 50, 22, RGB(150, 130, 170), .8
        Disc 24, 44, 5, RGB(110, 95, 135), 1: Disc 40, 56, 4, RGB(110, 95, 135), 1
        CIRCLE (22, 42), 3, RGB(190, 175, 210), , , , F
        dsize(d) = 12: dhigh(d) = 14
    END SELECT
    texDeco(d) = GRAB3D(0, 0, 64, 96)
  NEXT
  ' the craft, one a pilot
  FOR p = 0 TO 5
    ShipPic p, 0, 0
    texShip(p) = GRAB3D(0, 0, 64, 48)
  NEXT
  CLS
END SUB

' ================================================================================================
' The circuit, from its number (Antigrav's way: a star-shaped loop that climbs and dives)
' ================================================================================================
SUB BuildCircuit (c)
  RANDOMIZE c * 1201 + 13
  M = 4 * NSEG
  f1 = 2 + INT(RND * 2): f2 = f1 + 1 + INT(RND * 2): f3 = 5 + INT(RND * 3)
  p1 = RND * 2 * PI: p2 = RND * 2 * PI: p3 = RND * 2 * PI
  g1 = 1 + INT(RND * 3): g2 = 3 + INT(RND * 3): q1 = RND * 2 * PI: q2 = RND * 2 * PI
  h1 = 6 + RND * 8 + c * 2: h2 = 2 + RND * 3
  amp = 1
  DO
    a1 = (.16 + RND * .14) * amp: a2 = (.08 + RND * .1) * amp: a3 = (.03 + RND * .05) * amp
    lh = 0: ox = 0: oz = 0
    FOR i = 0 TO M
      th = i * 2 * PI / M
      r = 1 + a1 * SIN(f1 * th + p1) + a2 * SIN(f2 * th + p2) + a3 * SIN(f3 * th + p3)
      x = r * COS(th): z = r * SIN(th)
      IF i > 0 THEN lh = lh + SQR((x - ox) ^ 2 + (z - oz) ^ 2)
      ox = x: oz = z
    NEXT
    r0 = NSEG * 5 / lh
    FOR i = 0 TO M
      th = i * 2 * PI / M
      r = r0 * (1 + a1 * SIN(f1 * th + p1) + a2 * SIN(f2 * th + p2) + a3 * SIN(f3 * th + p3))
      dxs(i) = r * COS(th): dzs(i) = -r * SIN(th)
      dys(i) = h1 * SIN(g1 * th + q1) + h2 * SIN(g2 * th + q2)
      IF i = 0 THEN dl(i) = 0 ELSE dl(i) = dl(i - 1) + SQR((dxs(i) - dxs(i - 1)) ^ 2 + (dys(i) - dys(i - 1)) ^ 2 + (dzs(i) - dzs(i - 1)) ^ 2)
    NEXT
    tlen = dl(M): seglen = tlen / NSEG
    j = 0
    FOR i = 0 TO NSEG - 1
      d = i * seglen
      DO WHILE dl(j + 1) < d: j = j + 1: LOOP
      f = (d - dl(j)) / (dl(j + 1) - dl(j) + .000001)
      px(i) = dxs(j) + (dxs(j + 1) - dxs(j)) * f
      py(i) = dys(j) + (dys(j + 1) - dys(j)) * f
      pz(i) = dzs(j) + (dzs(j + 1) - dzs(j)) * f
    NEXT
    px(NSEG) = px(0): py(NSEG) = py(0): pz(NSEG) = pz(0)
    FOR i = 0 TO NSEG - 1
      a = (i + NSEG - 1) MOD NSEG: b = (i + 1) MOD NSEG
      x = px(b) - px(a): y = py(b) - py(a): z = pz(b) - pz(a)
      l = SQR(x * x + y * y + z * z)
      tx(i) = x / l: ty(i) = y / l: tz(i) = z / l
    NEXT
    kmax = 0
    FOR i = 0 TO NSEG - 1
      a = (i + NSEG - 1) MOD NSEG: b = (i + 1) MOD NSEG
      hx = -tz(i): hz = tx(i): l = SQR(hx * hx + hz * hz): hx = hx / l: hz = hz / l
      cv(i) = ((tx(b) - tx(a)) * hx + (tz(b) - tz(a)) * hz) / (2 * seglen)
      IF ABS(cv(i)) > kmax THEN kmax = ABS(cv(i))
    NEXT
    IF kmax < 1 / 22 THEN EXIT DO
    amp = amp * .85
  LOOP
  FOR i = 0 TO NSEG - 1: dl(i) = 0: FOR k = -5 TO 5: dl(i) = dl(i) + cv((i + k + NSEG) MOD NSEG): NEXT: dl(i) = dl(i) / 11: NEXT
  FOR i = 0 TO NSEG - 1: cv(i) = dl(i): NEXT
  ' the frames: up tilted to the inside of the turns
  groundY = 1E+09
  FOR i = 0 TO NSEG - 1
    hx = -tz(i): hz = tx(i): l = SQR(hx * hx + hz * hz): hx = hx / l: hz = hz / l
    bank = cv(i) * 14: IF bank > .55 THEN bank = .55
    IF bank < -.55 THEN bank = -.55
    upx = hx * bank: upy = 1: upz = hz * bank
    x = ty(i) * upz - tz(i) * upy: y = tz(i) * upx - tx(i) * upz: z = tx(i) * upy - ty(i) * upx
    l = SQR(x * x + y * y + z * z): rx(i) = x / l: ry(i) = y / l: rz(i) = z / l
    ux(i) = ry(i) * tz(i) - rz(i) * ty(i): uy(i) = rz(i) * tx(i) - rx(i) * tz(i): uz(i) = rx(i) * ty(i) - ry(i) * tx(i)
    IF py(i) < groundY THEN groundY = py(i)
  NEXT
  rx(NSEG) = rx(0): ry(NSEG) = ry(0): rz(NSEG) = rz(0): ux(NSEG) = ux(0): uy(NSEG) = uy(0): uz(NSEG) = uz(0)
  groundY = groundY - 14
  ' a tunnel, rainbows, pads, ? boxes
  FOR i = 0 TO NSEG: kind(i) = 0: lane(i) = 0: NEXT
  a = 120 + INT(RND * 120): b = a + 20 + INT(RND * 14)
  FOR i = a TO b: kind(i MOD NSEG) = kind(i MOD NSEG) OR 1: NEXT
  FOR i = 26 TO NSEG - 12 STEP 30 + INT(RND * 6)
    IF (kind(i) AND 1) = 0 THEN kind(i) = kind(i) OR 8
  NEXT
  kind(0) = kind(0) OR 8
  i = 18: nb = 0
  DO WHILE i < NSEG - 10
    IF ABS(cv(i)) < .02 AND (kind(i) AND 9) = 0 AND (kind(i + 1) AND 9) = 0 THEN
      IF nb < 2 OR RND < .45 THEN kk = 4: nb = nb + 1 ELSE kk = 2
      kind(i) = kind(i) OR kk: lane(i) = INT(RND * 3) - 1
      i = i + 16 + INT(RND * 16)
    ELSE
      i = i + 3
    END IF
  LOOP
  FOR i = 0 TO NSEG * 3: boxwait(i) = 0: NEXT
  ' the scenery: on the ground beside the track, never on it (the planets float)
  ndeco = 0
  FOR i = 0 TO NSEG - 1 STEP 3
    IF ndeco < MAXDECO AND RND < .8 THEN
      IF RND < .55 THEN dk = decoA(c) ELSE dk = decoB(c)
      sd0 = 1: IF RND < .5 THEN sd0 = -1
      offs = HW + 7 + RND * RND * 40 + dsize(dk) * .4
      hx = -tz(i): hz = tx(i): l = SQR(hx * hx + hz * hz): hx = hx / l: hz = hz / l
      x = px(i) + hx * offs * sd0: z = pz(i) + hz * offs * sd0
      ok = -1
      FOR k = 0 TO NSEG - 1 STEP 3
        IF (px(k) - x) ^ 2 + (pz(k) - z) ^ 2 < (HW + 2 + dsize(dk) * .5) ^ 2 THEN ok = 0: EXIT FOR
      NEXT
      IF ok THEN
        ndeco = ndeco + 1
        dkx(ndeco) = x: dkz(ndeco) = z: dkk(ndeco) = dk: dks(ndeco) = .8 + RND * .5: dkseg(ndeco) = i
        IF night(c) THEN dky(ndeco) = py(i) - 6 + RND * 20 ELSE dky(ndeco) = groundY
      END IF
    END IF
  NEXT
  ' the little map
  mx0 = 1E+09: mx1 = -1E+09: mz0 = 1E+09: mz1 = -1E+09
  FOR i = 0 TO NSEG - 1
    IF px(i) < mx0 THEN mx0 = px(i)
    IF px(i) > mx1 THEN mx1 = px(i)
    IF pz(i) < mz0 THEN mz0 = pz(i)
    IF pz(i) > mz1 THEN mz1 = pz(i)
  NEXT
  sc = 2 / MAX(mx1 - mx0, mz1 - mz0)
  FOR k = 0 TO 49
    i = k * 8
    mmx(k) = (px(i) - (mx0 + mx1) / 2) * sc: mmy(k) = (pz(i) - (mz0 + mz1) / 2) * sc
  NEXT
  mmx(50) = mmx(0): mmy(50) = mmy(0)
  RANDOMIZE TIMER
END SUB

' Where a distance along the circuit is (d right, h up): wx, wy, wz; its frame (ft.. fr.. fu..)
SUB TrackAt (s, d, h)
  sw = s - INT(s / tlen) * tlen
  f = sw / seglen: i = INT(f): f = f - i
  IF i >= NSEG THEN i = 0
  j = i + 1: IF j >= NSEG THEN j = 0
  g = 1 - f
  ftx = tx(i) * g + tx(j) * f: fty = ty(i) * g + ty(j) * f: ftz = tz(i) * g + tz(j) * f
  frx = rx(i) * g + rx(j) * f: fry = ry(i) * g + ry(j) * f: frz = rz(i) * g + rz(j) * f
  fux = ux(i) * g + ux(j) * f: fuy = uy(i) * g + uy(j) * f: fuz = uz(i) * g + uz(j) * f
  fcv = cv(i) * g + cv(j) * f: fkind = kind(i): flane = lane(i)
  wx = px(i) * g + px(j) * f + frx * d + fux * h
  wy = py(i) * g + py(j) * f + fry * d + fuy * h
  wz = pz(i) * g + pz(j) * f + frz * d + fuz * h
END SUB

' A point on the track's node i (d right, h up)
SUB Node (i, d, h)
  wx = px(i) + rx(i) * d + ux(i) * h: wy = py(i) + ry(i) * d + uy(i) * h: wz = pz(i) + rz(i) * d + uz(i) * h
END SUB

' A quad between nodes i and i + 1, from d0 to d1 across, at the heights h0 (at d0) and h1 (at d1)
SUB Band (i, d0, h0, d1, h1, c)
  j = i + 1
  COLOR3D c
  Node i, d0, h0: x0 = wx: y0 = wy: z0 = wz
  Node i, d1, h1: x1 = wx: y1 = wy: z1 = wz
  Node j, d1, h1: x2 = wx: y2 = wy: z2 = wz
  Node j, d0, h0: x3 = wx: y3 = wy: z3 = wz
  VERTEX3D x0, y0, z0: VERTEX3D x1, y1, z1: VERTEX3D x2, y2, z2
  VERTEX3D x0, y0, z0: VERTEX3D x2, y2, z2: VERTEX3D x3, y3, z3
END SUB

' ================================================================================================
' Drawing a frame
' ================================================================================================
FUNCTION Fog (c, k)
  ' far away: towards the horizon's colour
  f = (k / vdist) ^ 1.6 * .8: IF f > .8 THEN f = .8
  h = tc(circ, 2)
  r1 = (c \ 65536) AND 255: g1 = (c \ 256) AND 255: b1 = c AND 255
  r2 = (h \ 65536) AND 255: g2 = (h \ 256) AND 255: b2 = h AND 255
  Fog = RGB(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f)
END FUNCTION

SUB DrawWorld (camS)
  SCENE3D tc(circ, 1)
  CAMERA3D cex, cey, cez, ctx, cty, ctz, 70
  fx = ctx - cex: fy = cty - cey: fz = ctz - cez: l = SQR(fx * fx + fy * fy + fz * fz): fx = fx / l: fy = fy / l: fz = fz / l
  crx = -fz: cry = 0: crz = fx: l = SQR(crx * crx + crz * crz): crx = crx / l: crz = crz / l
  cux = cry * fz - crz * fy: cuy = crz * fx - crx * fz: cuz = crx * fy - cry * fx

  ' the sky: a ring from the horizon's colour up to the sky's
  LIGHT3D 0, 0, 0: DEPTH3D 0: CULL3D 0: TEXTURE3D 0
  FOR k = 0 TO 15
    a0 = k * PI / 8: a1 = (k + 1) * PI / 8
    x0 = 800 * COS(a0): z0 = 800 * SIN(a0): x1 = 800 * COS(a1): z1 = 800 * SIN(a1)
    COLOR3D tc(circ, 2): VERTEX3D cex + x0, cey - 80, cez + z0: VERTEX3D cex + x1, cey - 80, cez + z1
    COLOR3D tc(circ, 1): VERTEX3D cex + x1, cey + 380, cez + z1
    COLOR3D tc(circ, 2): VERTEX3D cex + x0, cey - 80, cez + z0
    COLOR3D tc(circ, 1): VERTEX3D cex + x1, cey + 380, cez + z1: VERTEX3D cex + x0, cey + 380, cez + z0
  NEXT
  ' the sun (or the moon), the clouds far away (see-through pictures facing the eye)
  TEXTURE3D tex.sun, 1: BLEND3D 1
  IF night(circ) THEN TEXTURE3D tex.moon, 1
  COLOR3D RGB(255, 255, 255)
  Sprite cex + 520, cey + 330, cez - 400, 64, 64, 0
  IF night(circ) = 0 THEN
    TEXTURE3D tex.cloud, 1
    FOR k = 0 TO 9
      a = k * .63 + .4
      Sprite cex + 640 * COS(a), cey + 60 + (k MOD 3) * 50, cez + 640 * SIN(a), 90 + (k MOD 2) * 40, 45 + (k MOD 2) * 20, 0
    NEXT
  ELSE
    ' the stars
    TEXTURE3D 0: BLEND3D 0
    FOR k = 0 TO 70
      a = k * 2.399: e = 60 + ((k * 37) MOD 300)
      x = cex + 700 * COS(a): z = cez + 700 * SIN(a): y = cey + e
      COLOR3D RGB(255, 255, 220): VERTEX3D x - 2, y, z: VERTEX3D x + 2, y, z: VERTEX3D x, y + 3, z
    NEXT
  END IF
  BLEND3D 0: DEPTH3D 1

  ' the ground (two greens, a big chequer that shows the speed)
  IF night(circ) = 0 THEN
    gx = INT(cex / 40) * 40: gz = INT(cez / 40) * 40
    TEXTURE3D tex.ground, 0, 0: COLOR3D tc(circ, 3)
    VERTEX3D gx - 900, groundY, gz - 900, 0, 0: VERTEX3D gx - 900, groundY, gz + 900, 0, 45: VERTEX3D gx + 900, groundY, gz + 900, 45, 45
    VERTEX3D gx - 900, groundY, gz - 900, 0, 0: VERTEX3D gx + 900, groundY, gz + 900, 45, 45: VERTEX3D gx + 900, groundY, gz - 900, 45, 0
  END IF

  c0 = INT(camS / seglen) - 2
  ' the floor (tinted by the circuit's colours, a band every three segments)
  TEXTURE3D tex.track, 1, 0
  FOR k = 0 TO vdist
    i = (c0 + k + NSEG * 4) MOD NSEG: j = i + 1
    IF (i \ 3) MOD 2 THEN c = tc(circ, 5) ELSE c = tc(circ, 6)
    c = Fog(c, k)
    t0 = (i MOD 8) * .5: t1 = t0 + .5
    COLOR3D c
    Node i, -HW, 0: x0 = wx: y0 = wy: z0 = wz
    Node i, HW, 0: x1 = wx: y1 = wy: z1 = wz
    Node j, HW, 0: x2 = wx: y2 = wy: z2 = wz
    Node j, -HW, 0: x3 = wx: y3 = wy: z3 = wz
    VERTEX3D x0, y0, z0, 0, t0: VERTEX3D x1, y1, z1, 1, t0: VERTEX3D x2, y2, z2, 1, t1
    VERTEX3D x0, y0, z0, 0, t0: VERTEX3D x2, y2, z2, 1, t1: VERTEX3D x3, y3, z3, 0, t1
  NEXT
  ' the pads
  TEXTURE3D tex.boost, 1
  FOR k = 0 TO vdist
    i = (c0 + k + NSEG * 4) MOD NSEG
    IF kind(i) AND 2 THEN
      a = lane(i) * 3 - 1.5: COLOR3D Fog(RGB(255, 255, 255), k)
      Node i, a, .04: x0 = wx: y0 = wy: z0 = wz
      Node i, a + 3, .04: x1 = wx: y1 = wy: z1 = wz
      Node i + 1, a + 3, .04: x2 = wx: y2 = wy: z2 = wz
      Node i + 1, a, .04: x3 = wx: y3 = wy: z3 = wz
      VERTEX3D x0, y0, z0, 0, 1: VERTEX3D x1, y1, z1, 1, 1: VERTEX3D x2, y2, z2, 1, 0
      VERTEX3D x0, y0, z0, 0, 1: VERTEX3D x2, y2, z2, 1, 0: VERTEX3D x3, y3, z3, 0, 0
    END IF
  NEXT
  ' the kerbs, the candy-striped walls, their ink, the slab's sides, the start line
  TEXTURE3D 0
  FOR k = 0 TO vdist
    i = (c0 + k + NSEG * 4) MOD NSEG
    IF (i \ 2) MOD 2 THEN kc = Fog(tc(circ, 7), k) ELSE kc = Fog(RGB(255, 255, 255), k)
    Band i, -HW, .02, -HW + .9, .02, kc
    Band i, HW - .9, .02, HW, .02, kc
    IF i MOD 2 THEN wc = Fog(tc(circ, 8), k) ELSE wc = Fog(tc(circ, 9), k)
    Band i, -HW, 0, -HW, WALLH, wc
    Band i, HW, 0, HW, WALLH, wc
    ic = Fog(INK, k)
    Band i, -HW - .45, WALLH, -HW, WALLH + .12, ic
    Band i, HW, WALLH + .12, HW + .45, WALLH, ic
    sc = Fog(tc(circ, 10), k)
    Band i, -HW - .45, -1, -HW - .45, WALLH, sc
    Band i, HW + .45, -1, HW + .45, WALLH, sc
    Band i, -HW - .45, -1.05, HW + .45, -1.05, Fog(tc(circ, 10), k)
    IF i = 0 THEN
      FOR q = 0 TO 7
        IF q MOD 2 THEN c = RGB(255, 255, 255) ELSE c = INK
        Band 0, -HW + q * 1.5, .03, -HW + q * 1.5 + 1.5, .03, c
      NEXT
    END IF
  NEXT
  ' the pillars (lit), the tunnels' vaults, the rainbows
  LIGHT3D .4, 1, .3, 45: CULL3D 1
  IF night(circ) = 0 THEN
    FOR k = 0 TO vdist
      i = (c0 + k + NSEG * 4) MOD NSEG
      IF i MOD 8 = 4 AND (kind(i) AND 1) = 0 THEN
        h = py(i) - 1 - groundY
        PUSH3D
        TRANSLATE3D px(i), groundY + h / 2, pz(i)
        SCALE3D 1.6, h, 1.6
        COLOR3D tc(circ, 11)
        CUBE3D 1
        POP3D
      END IF
    NEXT
  END IF
  LIGHT3D 0, 0, 0: CULL3D 0
  FOR k = 0 TO vdist
    i = (c0 + k + NSEG * 4) MOD NSEG
    IF kind(i) AND 1 THEN
      FOR q = 0 TO 4
        a0 = q * PI / 5: a1 = (q + 1) * PI / 5
        IF ((i \ 2) + q) MOD 2 THEN c = tc(circ, 12) ELSE c = tc(circ, 13)
        COLOR3D Fog(c, k)
        Node i, -(HW + .45) * COS(a0), WALLH + 6 * SIN(a0): x0 = wx: y0 = wy: z0 = wz
        Node i, -(HW + .45) * COS(a1), WALLH + 6 * SIN(a1): x1 = wx: y1 = wy: z1 = wz
        Node i + 1, -(HW + .45) * COS(a1), WALLH + 6 * SIN(a1): x2 = wx: y2 = wy: z2 = wz
        Node i + 1, -(HW + .45) * COS(a0), WALLH + 6 * SIN(a0): x3 = wx: y3 = wy: z3 = wz
        VERTEX3D x0, y0, z0: VERTEX3D x1, y1, z1: VERTEX3D x2, y2, z2
        VERTEX3D x0, y0, z0: VERTEX3D x2, y2, z2: VERTEX3D x3, y3, z3
      NEXT
    END IF
    IF kind(i) AND 8 THEN Rainbow i, k
  NEXT
  ' what stands on the track and around it: from far to near (see-through pictures, the depth tested, not written)
  BLEND3D 1: DEPTH3D 1, 0
  FOR k = vdist TO 0 STEP -1
    i = (c0 + k + NSEG * 4) MOD NSEG
    ' the scenery
    FOR d = 1 TO ndeco
      IF dkseg(d) = i THEN
        dk = dkk(d): TEXTURE3D texDeco(dk), 0: COLOR3D Fog(RGB(255, 255, 255), k)
        w = dsize(dk) * dks(d): h = dhigh(dk) * dks(d)
        IF night(circ) THEN Sprite dkx(d), dky(d), dkz(d), w, h, 0 ELSE Sprite dkx(d), dky(d) + h / 2, dkz(d), w, h, 0
      END IF
    NEXT
    ' the ? boxes
    IF kind(i) AND 4 THEN
      TEXTURE3D tex.box, 0: COLOR3D RGB(255, 255, 255)
      FOR q = 0 TO 2
        IF boxwait(i * 3 + q) <= 0 THEN
          TrackAt (i + .5) * seglen, (q - 1) * 3.2, 1.3 + .2 * SIN(t * 3 + q)
          Sprite wx, wy, wz, 1.5, 1.5, .3 * SIN(t * 2 + q)
        END IF
      NEXT
    END IF
    ' the shots, the gum
    FOR p = 0 TO NPROJ - 1
      IF pk(p) THEN
        IF INT((ps(p) - INT(ps(p) / tlen) * tlen) / seglen) = i THEN
          IF pk(p) = 1 THEN
            TEXTURE3D tex.rocket, 0: TrackAt ps(p), pl(p), .8: Sprite wx, wy, wz, 1, 1, t * 8
          ELSE
            TEXTURE3D tex.gum, 0: TrackAt ps(p), pl(p), .06
            Flat ps(p), pl(p), .06, 1.2
          END IF
        END IF
      END IF
    NEXT
    ' the craft (their shadow first)
    FOR n = 0 TO NSHIP - 1
      IF INT((sd(n) - INT(sd(n) / tlen) * tlen) / seglen) = i THEN DrawShip n
    NEXT
  NEXT
  BLEND3D 0: DEPTH3D 1: CULL3D 1: TEXTURE3D 0
  RENDER3D
END SUB

' A picture facing the camera, centred on (x, y, z), w wide and h high, turned by ang
SUB Sprite (x, y, z, w, h, ang)
  ca = COS(ang): sa = SIN(ang)
  ax = (crx * ca + cux * sa) * w / 2: ay = (cry * ca + cuy * sa) * w / 2: az = (crz * ca + cuz * sa) * w / 2
  bx = (cux * ca - crx * sa) * h / 2: by = (cuy * ca - cry * sa) * h / 2: bz = (cuz * ca - crz * sa) * h / 2
  VERTEX3D x - ax - bx, y - ay - by, z - az - bz, 0, 1: VERTEX3D x + ax - bx, y + ay - by, z + az - bz, 1, 1: VERTEX3D x + ax + bx, y + ay + by, z + az + bz, 1, 0
  VERTEX3D x - ax - bx, y - ay - by, z - az - bz, 0, 1: VERTEX3D x + ax + bx, y + ay + by, z + az + bz, 1, 0: VERTEX3D x - ax + bx, y - ay + by, z - az + bz, 0, 0
END SUB

' A picture lying on the track at (s, d, h), r its half size
SUB Flat (s, d, h, r)
  TrackAt s - r, d - r, h: x0 = wx: y0 = wy: z0 = wz
  TrackAt s - r, d + r, h: x1 = wx: y1 = wy: z1 = wz
  TrackAt s + r, d + r, h: x2 = wx: y2 = wy: z2 = wz
  TrackAt s + r, d - r, h: x3 = wx: y3 = wy: z3 = wz
  VERTEX3D x0, y0, z0, 0, 1: VERTEX3D x1, y1, z1, 1, 1: VERTEX3D x2, y2, z2, 1, 0
  VERTEX3D x0, y0, z0, 0, 1: VERTEX3D x2, y2, z2, 1, 0: VERTEX3D x3, y3, z3, 0, 0
END SUB

' A rainbow over the track (the start's: a chequered banner on two posts)
SUB Rainbow (i, k)
  IF i = 0 THEN
    Band 0, -HW - 1.1, 0, -HW - .4, 0, INK
    FOR sd0 = -1 TO 1 STEP 2
      COLOR3D RGB(255, 255, 255)
      Node 0, sd0 * (HW + .4), 0: x0 = wx: y0 = wy: z0 = wz
      Node 0, sd0 * (HW + 1.1), 0: x1 = wx: y1 = wy: z1 = wz
      Node 0, sd0 * (HW + 1.1), 8: x2 = wx: y2 = wy: z2 = wz
      Node 0, sd0 * (HW + .4), 8: x3 = wx: y3 = wy: z3 = wz
      VERTEX3D x0, y0, z0: VERTEX3D x1, y1, z1: VERTEX3D x2, y2, z2
      VERTEX3D x0, y0, z0: VERTEX3D x2, y2, z2: VERTEX3D x3, y3, z3
    NEXT
    TEXTURE3D tex.check, 0, 0: COLOR3D RGB(255, 255, 255)
    Node 0, -HW - 1.1, 6.4: x0 = wx: y0 = wy: z0 = wz
    Node 0, HW + 1.1, 6.4: x1 = wx: y1 = wy: z1 = wz
    Node 0, HW + 1.1, 8: x2 = wx: y2 = wy: z2 = wz
    Node 0, -HW - 1.1, 8: x3 = wx: y3 = wy: z3 = wz
    VERTEX3D x0, y0, z0, 0, 1: VERTEX3D x1, y1, z1, 4, 1: VERTEX3D x2, y2, z2, 4, 0
    VERTEX3D x0, y0, z0, 0, 1: VERTEX3D x2, y2, z2, 4, 0: VERTEX3D x3, y3, z3, 0, 0
    TEXTURE3D 0
    EXIT SUB
  END IF
  FOR b = 0 TO 5
    SELECT CASE b
      CASE 0: c = RGB(255, 80, 90)
      CASE 1: c = RGB(255, 160, 40)
      CASE 2: c = RGB(255, 225, 60)
      CASE 3: c = RGB(70, 215, 120)
      CASE 4: c = RGB(60, 160, 255)
      CASE ELSE: c = INK
    END SELECT
    COLOR3D Fog(c, k)
    r0 = HW + 5.2 - b * .8: r1 = r0 + .8
    IF b = 5 THEN r0 = HW + 1.2: r1 = HW + 1.4
    FOR q = 0 TO 9
      a0 = q * PI / 10: a1 = (q + 1) * PI / 10
      Node i, -r0 * COS(a0), r0 * SIN(a0) * .8: x0 = wx: y0 = wy: z0 = wz
      Node i, -r0 * COS(a1), r0 * SIN(a1) * .8: x1 = wx: y1 = wy: z1 = wz
      Node i, -r1 * COS(a1), r1 * SIN(a1) * .8: x2 = wx: y2 = wy: z2 = wz
      Node i, -r1 * COS(a0), r1 * SIN(a0) * .8: x3 = wx: y3 = wy: z3 = wz
      VERTEX3D x0, y0, z0: VERTEX3D x1, y1, z1: VERTEX3D x2, y2, z2
      VERTEX3D x0, y0, z0: VERTEX3D x2, y2, z2: VERTEX3D x3, y3, z3
    NEXT
  NEXT
END SUB

SUB DrawShip (n)
  hov = .75 + .07 * SIN(t * 6 + n)
  ' the shadow (multiplied on the floor)
  BLEND3D 3: TEXTURE3D tex.shadow, 1: COLOR3D RGB(255, 255, 255)
  Flat sd(n), lx(n), .05, 1.4
  BLEND3D 1
  TrackAt sd(n), lx(n), hov + .2
  roll = -steer(n) * .3 + SIN(spin(n) * 18) * spin(n) * .6
  TEXTURE3D texShip(pilot(n)), 0: COLOR3D RGB(255, 255, 255)
  IF stuck(n) > 0 THEN COLOR3D RGB(255, 170, 220)
  Sprite wx, wy, wz, 2.8, 2.1, roll
  ' the flames, the bubble, the POW
  IF turbo(n) > 0 OR thrust(n) THEN
    TEXTURE3D tex.sun, 1: BLEND3D 2
    IF turbo(n) > 0 THEN f = .9 ELSE f = .5
    COLOR3D RGB(255, 170, 60)
    TrackAt sd(n) - .6, lx(n) - .45, hov - .05: Sprite wx, wy, wz, f, f, t * 9
    TrackAt sd(n) - .6, lx(n) + .45, hov - .05: Sprite wx, wy, wz, f, f, t * 9
    BLEND3D 1
  END IF
  IF shield(n) > 0 THEN
    TEXTURE3D 0: COLOR3D RGB(120, 220, 255), 70
    TrackAt sd(n), lx(n), hov + .3: Sprite wx, wy, wz, 3.6, 3, 0
  END IF
  IF powT(n) > 0 THEN
    TEXTURE3D tex.pow, 0: COLOR3D RGB(255, 255, 255)
    TrackAt sd(n), lx(n), 2.8: s = 1.6 + (.7 - powT(n)) * 1.2: Sprite wx, wy, wz, s, s * .75, .2
  END IF
END SUB

' ================================================================================================
' The race
' ================================================================================================
SUB SetupGrid
  vmax = 90
  FOR n = 0 TO NSHIP - 1: order(n) = n: NEXT
  FOR n = NSHIP - 1 TO 1 STEP -1: k = INT(RND * (n + 1)): SWAP order(n), order(k): NEXT
  ' the player at the back (the fun: passing them all)
  IF NOT demo THEN
    FOR g = 0 TO NSHIP - 1: IF order(g) = 0 THEN SWAP order(g), order(NSHIP - 1)
    NEXT
  END IF
  k = 0
  FOR n = 0 TO NSHIP - 1
    IF n = 0 THEN pilot(n) = mypilot ELSE IF k = mypilot THEN k = k + 1
    IF n > 0 THEN pilot(n) = k: k = k + 1
  NEXT
  FOR g = 0 TO NSHIP - 1
    n = order(g)
    sd(n) = -6 - g * 5.5: lx(n) = 2.4 * (1 - 2 * (g MOD 2))
    v(n) = 0: vl(n) = 0: steer(n) = 0: thrust(n) = 0: item(n) = 0: shield(n) = 0: turbo(n) = 0: spin(n) = 0: stuck(n) = 0
    arrived(n) = 0: fintime(n) = 0: lapst(n) = 0: bestlap(n) = 0: firewait(n) = 1: powT(n) = 0: bonkT(n) = 0
    skill(n) = .92 + RND * .05 + circ * .01: aioff(n) = (RND - .5) * 2.4
    IF n = 0 AND NOT demo THEN skill(n) = 1
  NEXT
  FOR p = 0 TO NPROJ - 1: pk(p) = 0: NEXT
  racet = 0: msgT = 0
END SUB

SUB Race
  demo = 0
  SetupGrid
  state = 1: cdown = 3.99: paused = 0: lastBeep = 4: vdist = 56
  camL = lx(0) * .6: camH = 3
  last = TIMER
  DO
    now = TIMER: dt = now - last: last = now
    IF dt < 0 OR dt > .05 THEN dt = .05
    k$ = UCASE$(INKEY$)
    p = PAD
    IF state = 3 THEN
      IF k$ = CHR$(13) OR k$ = CHR$(27) OR k$ = " " OR ((p AND 16) <> 0 AND (padprev AND 16) = 0) THEN padprev = p: EXIT DO
    ELSEIF k$ = "P" OR ((p AND 8192) <> 0 AND (padprev AND 8192) = 0) THEN
      paused = NOT paused
      IF paused THEN SoundsOff
    ELSEIF k$ = CHR$(27) THEN
      SoundsOff: EXIT DO
    ELSEIF k$ = " " AND state = 2 AND NOT paused THEN
      UseItem 0
    END IF
    IF (p AND 16) <> 0 AND (padprev AND 16) = 0 AND state = 2 AND NOT paused THEN UseItem 0
    padprev = p
    IF NOT paused THEN
      t = t + dt
      IF state = 1 THEN
        cdown = cdown - dt
        IF INT(cdown) < lastBeep AND cdown > 0 THEN lastBeep = INT(cdown): Sfx 10, 440, 0, 160, .15
        IF cdown <= 0 THEN state = 2: Sfx 10, 880, 0, 180, .35: Say T$("GO!"), 1
      ELSE
        racet = racet + dt
      END IF
      Controls
      Physics
      Shots
      MusicTick
      Engine
      IF state = 2 AND arrived(0) THEN
        state = 3
        FOR n = 0 TO NSHIP - 1
          IF arrived(n) = 0 THEN fintime(n) = racet + (LAPS * tlen - sd(n)) / (v(n) + 40)
        NEXT
        SoundsOff
        Sfx 10, 523, 0, 160, .15: Sfx 11, 659, 0, 160, .3: Sfx 12, 784, 0, 160, .5
      END IF
    END IF
    Camera 0
    DrawWorld sd(0) - 8
    Hud
    IF paused THEN
      Panel 200, 170, 240, 110
      BigText T$("PAUSED"), 320, 190, 5, RGB(255, 210, 60)
      a$ = T$("P: resume   Esc: title"): DRAWTEXT 320 - LEN(a$) * 4, 248, a$, INK
    END IF
    IF state = 3 THEN Results
    SfxTick
    PAUSE 1
  LOOP
  SoundsOff
END SUB

SUB Camera (n)
  k = dt * 5: IF k > 1 THEN k = 1
  camL = camL + (lx(n) * .6 - camL) * k
  camH = camH + (3 + v(n) * .006 - camH) * k
  TrackAt sd(n) - 8, camL, camH
  cex = wx: cey = wy: cez = wz
  TrackAt sd(n) + 10, camL * .8, 1.1
  ctx = wx: cty = wy: ctz = wz
END SUB

SUB Say (a$, secs)
  IF demo THEN EXIT SUB
  msg$ = a$: msgT = secs
END SUB

SUB Controls
  FOR n = 0 TO NSHIP - 1
    IF state = 1 THEN
      steer(n) = 0: thrust(n) = 0
    ELSEIF n = 0 AND NOT demo AND arrived(0) = 0 THEN
      p = PAD: s = 0
      IF KEYDOWN("LEFT") OR (p AND 4) THEN s = s - 1
      IF KEYDOWN("RIGHT") OR (p AND 8) THEN s = s + 1
      IF MOUSEB THEN
        IF MOUSEX < 320 THEN s = s - 1 ELSE s = s + 1
      END IF
      st = STICK(0): IF ABS(st - 100) > 18 THEN s = (st - 100) / 99
      IF s > 1 THEN s = 1
      IF s < -1 THEN s = -1
      steer(0) = steer(0) + (s - steer(0)) * MIN(1, dt * 10)
      brake(0) = KEYDOWN("DOWN") OR (p AND 2) OR (p AND 32)
      IF brake(0) THEN thrust(0) = 0 ELSE thrust(0) = 1
    ELSE
      Think n
    END IF
  NEXT
END SUB

' The computer's pilots: the inside of the coming turn, around the craft ahead, the pads and the boxes
SUB Think (n)
  TrackAt sd(n) + 22 + v(n) * .25, 0, 0
  ka = fcv
  tg = ka * 70 + aioff(n): IF tg > HW - 1.6 THEN tg = HW - 1.6
  IF tg < -HW + 1.6 THEN tg = -HW + 1.6
  FOR m = 0 TO NSHIP - 1
    IF m <> n THEN
      d = sd(m) - sd(n): d = d - tlen * INT(d / tlen + .5)
      IF d > 0 AND d < 10 AND ABS(lx(m) - tg) < 2.2 THEN
        IF lx(m) > 0 THEN tg = lx(m) - 2.6 ELSE tg = lx(m) + 2.6
      END IF
    END IF
  NEXT
  TrackAt sd(n) + 14, 0, 0
  IF (fkind AND 2) OR ((fkind AND 4) AND item(n) = 0) THEN tg = flane * 3
  s = (tg - lx(n)) * .55 - vl(n) * .3
  IF s > 1 THEN s = 1
  IF s < -1 THEN s = -1
  steer(n) = steer(n) + (s - steer(n)) * MIN(1, dt * 8)
  lim = vmax * skill(n)
  IF ABS(ka) > .001 THEN vt = SQR(62 / (.1 * ABS(ka))): IF vt < lim THEN lim = vt
  IF NOT demo AND n > 0 THEN
    d = sd(n) - sd(0)
    IF d > 90 THEN lim = lim * .94
    IF d < -90 THEN lim = lim * 1.06
  END IF
  IF v(n) < lim THEN thrust(n) = 1 ELSE thrust(n) = 0: v(n) = v(n) - (v(n) - lim) * 1.2 * dt
  IF item(n) THEN
    firewait(n) = firewait(n) - dt
    IF firewait(n) < 0 THEN
      w = item(n)
      IF w >= 3 THEN
        UseItem n
      ELSEIF w = 2 THEN
        IF Behind(n, 40) >= 0 THEN UseItem n
      ELSEIF Ahead(n, 80) >= 0 THEN
        UseItem n
      END IF
      firewait(n) = .4 + RND * 1.2
    END IF
  END IF
END SUB

FUNCTION Ahead (n, dmax)
  bd = dmax: Ahead = -1
  FOR m = 0 TO NSHIP - 1
    IF m <> n THEN
      d = sd(m) - sd(n): d = d - tlen * INT(d / tlen + .5)
      IF d > 0 AND d < bd THEN bd = d: Ahead = m
    END IF
  NEXT
END FUNCTION
FUNCTION Behind (n, dmax)
  bd = dmax: Behind = -1
  FOR m = 0 TO NSHIP - 1
    IF m <> n THEN
      d = sd(n) - sd(m): d = d - tlen * INT(d / tlen + .5)
      IF d > 0 AND d < bd THEN bd = d: Behind = m
    END IF
  NEXT
END FUNCTION

SUB Physics
  FOR n = 0 TO NSHIP - 1
    TrackAt sd(n), lx(n), 0
    top = vmax * skill(n)
    IF turbo(n) > 0 THEN top = top * 1.45: turbo(n) = turbo(n) - dt
    IF turbo(n) < 0 THEN turbo(n) = 0
    IF stuck(n) > 0 THEN top = top * .5: stuck(n) = stuck(n) - dt
    IF thrust(n) THEN
      v(n) = v(n) + (top - v(n)) * .75 * dt
    ELSEIF brake(n) AND n = 0 THEN
      v(n) = v(n) - v(n) * 1.4 * dt
    ELSE
      v(n) = v(n) - v(n) * .45 * dt
    END IF
    IF v(n) > top THEN v(n) = v(n) - (v(n) - top) * 1.5 * dt
    v(n) = v(n) - fty * 18 * dt
    IF v(n) < 0 THEN v(n) = 0
    vl(n) = vl(n) + steer(n) * 46 * dt - fcv * v(n) * v(n) * .085 * dt
    vl(n) = vl(n) - vl(n) * 3 * dt
    lx(n) = lx(n) + vl(n) * dt
    lim = HW - 1.2
    IF ABS(lx(n)) > lim THEN
      lx(n) = lim * SGN(lx(n)): vl(n) = -vl(n) * .4
      v(n) = v(n) - v(n) * 1.6 * dt
      IF n = 0 AND NOT demo AND bonkT(0) <= 0 AND v(0) > 20 THEN bonkT(0) = .6: Sfx 11, 120, 2, 140, .12: Pow 0, T$("BONK!")
    END IF
    IF bonkT(n) > 0 THEN bonkT(n) = bonkT(n) - dt
    IF powT(n) > 0 THEN powT(n) = powT(n) - dt
    sold = sd(n)
    sd(n) = sd(n) + v(n) * dt
    IF spin(n) > 0 THEN spin(n) = spin(n) - dt * 1.2: IF spin(n) < 0 THEN spin(n) = 0
    IF shield(n) > 0 THEN shield(n) = shield(n) - dt: IF shield(n) < 0 THEN shield(n) = 0
    ' a speed pad
    IF (fkind AND 2) AND ABS(lx(n) - flane * 3) < 1.8 THEN
      IF turbo(n) < .5 THEN turbo(n) = .5: v(n) = v(n) + 10: IF n = 0 AND NOT demo THEN Sfx 12, 220, 2, 150, .3
    END IF
    ' the ? boxes
    IF (fkind AND 4) THEN
      i = INT((sd(n) - INT(sd(n) / tlen) * tlen) / seglen)
      FOR q = 0 TO 2
        IF boxwait(i * 3 + q) <= 0 AND ABS(lx(n) - (q - 1) * 3.2) < 1.8 THEN
          boxwait(i * 3 + q) = 3
          IF item(n) = 0 THEN
            r = RND
            IF place(n) <= 2 THEN
              IF r < .45 THEN item(n) = 2 ELSE IF r < .75 THEN item(n) = 3 ELSE IF r < .9 THEN item(n) = 1 ELSE item(n) = 4
            ELSEIF place(n) >= 5 THEN
              IF r < .45 THEN item(n) = 4 ELSE IF r < .85 THEN item(n) = 1 ELSE item(n) = 3
            ELSE
              item(n) = 1 + INT(r * 4)
            END IF
            firewait(n) = .6 + RND * 1.5
            IF n = 0 AND NOT demo THEN Sfx 12, 880, 0, 120, .15: Say itemName$(item(0)), 1
          END IF
        END IF
      NEXT
    END IF
    ' a lap
    IF INT(sd(n) / tlen) > INT(sold / tlen) AND sd(n) > 0 AND arrived(n) = 0 THEN
      lt = racet - lapst(n)
      IF INT(sold / tlen) >= 0 THEN
        IF bestlap(n) = 0 OR lt < bestlap(n) THEN bestlap(n) = lt
      END IF
      lapst(n) = racet
      IF sd(n) >= LAPS * tlen THEN
        arrived(n) = -1: fintime(n) = racet
      ELSEIF n = 0 AND NOT demo AND INT(sold / tlen) >= 0 THEN
        lp = INT(sd(0) / tlen) + 1
        IF lp = LAPS THEN Say T$("LAST LAP!"), 1.5 ELSE Say T$("LAP") + " " + LTRIM$(STR$(lp)), 1.2
        Sfx 12, 523, 1, 140, .25
      END IF
    END IF
  NEXT
  FOR i = 0 TO NSEG * 3 - 1: IF boxwait(i) > 0 THEN boxwait(i) = boxwait(i) - dt
  NEXT
  ' the craft against each other
  FOR a = 0 TO NSHIP - 2
    FOR b = a + 1 TO NSHIP - 1
      d = sd(b) - sd(a): d = d - tlen * INT(d / tlen + .5)
      IF ABS(d) < 2.8 AND ABS(lx(b) - lx(a)) < 2.2 THEN
        push = (2.2 - ABS(lx(b) - lx(a))) / 2 + .02
        IF lx(b) >= lx(a) THEN lx(b) = lx(b) + push: lx(a) = lx(a) - push ELSE lx(b) = lx(b) - push: lx(a) = lx(a) + push
        x = vl(a): vl(a) = vl(b) * .6: vl(b) = x * .6
        IF d > 0 THEN v(a) = v(a) * .985 ELSE v(b) = v(b) * .985
        IF a = 0 AND NOT demo AND state = 2 THEN Sfx 11, 90, 2, 110, .08
      END IF
    NEXT
  NEXT
  ' the places
  FOR n = 0 TO NSHIP - 1
    place(n) = 1
    FOR m = 0 TO NSHIP - 1
      IF m <> n THEN
        IF arrived(m) AND arrived(n) THEN
          IF fintime(m) < fintime(n) THEN place(n) = place(n) + 1
        ELSEIF arrived(m) THEN
          place(n) = place(n) + 1
        ELSEIF arrived(n) = 0 AND sd(m) > sd(n) THEN
          place(n) = place(n) + 1
        END IF
      END IF
    NEXT
  NEXT
END SUB

SUB UseItem (n)
  w = item(n)
  IF w = 0 THEN EXIT SUB
  item(n) = 0
  mine = (n = 0 AND NOT demo)
  SELECT CASE w
    CASE 1          ' a rocket: it follows the craft ahead
      NewShot 1, sd(n) + 3, lx(n), v(n) + 60, n, Ahead(n, 160), 4
      IF mine THEN Sfx 13, 300, 4, 150, .3
    CASE 2          ' gum, dropped behind
      NewShot 2, sd(n) - 3.5, lx(n), 0, n, -1, 40
      IF mine THEN Sfx 13, 200, 1, 150, .2
    CASE 3
      shield(n) = 6
      IF mine THEN Sfx 13, 600, 1, 130, .3
    CASE 4
      turbo(n) = 1.8: v(n) = v(n) + 22
      IF mine THEN Sfx 13, 160, 4, 160, .6
  END SELECT
END SUB

SUB NewShot (k, s, l, sp, own, tgt, life)
  FOR p = 0 TO NPROJ - 1
    IF pk(p) = 0 THEN
      pk(p) = k: ps(p) = s: pl(p) = l: pv(p) = sp: pown(p) = own: ptgt(p) = tgt: plife(p) = life
      EXIT SUB
    END IF
  NEXT
END SUB

SUB Shots
  FOR p = 0 TO NPROJ - 1
    IF pk(p) THEN
      plife(p) = plife(p) - dt
      IF plife(p) <= 0 THEN pk(p) = 0
    END IF
    IF pk(p) THEN
      ps(p) = ps(p) + pv(p) * dt
      IF pk(p) = 1 AND ptgt(p) >= 0 THEN pl(p) = pl(p) + SGN(lx(ptgt(p)) - pl(p)) * MIN(ABS(lx(ptgt(p)) - pl(p)), 12 * dt)
      IF ABS(pl(p)) > HW - .6 AND pk(p) = 1 THEN pk(p) = 0
      FOR n = 0 TO NSHIP - 1
        IF pk(p) AND (n <> pown(p) OR (pk(p) = 2 AND plife(p) < 39.4)) THEN
          d = sd(n) - ps(p): d = d - tlen * INT(d / tlen + .5)
          IF ABS(d) < 2 AND ABS(lx(n) - pl(p)) < 1.5 THEN
            Hit n, pk(p)
            pk(p) = 0
          END IF
        END IF
      NEXT
    END IF
  NEXT
END SUB

SUB Hit (n, k)
  IF shield(n) > 0 THEN shield(n) = 0: Pow n, T$("POP!"): Sfx 9, 900, 1, 120, .1: EXIT SUB
  IF k = 2 THEN
    stuck(n) = 1.6: v(n) = v(n) * .55: Pow n, T$("SPLAT!"): Sfx 9, 160, 1, 140, .2
  ELSE
    v(n) = v(n) * .35: spin(n) = 1: vl(n) = vl(n) + (RND - .5) * 20: Pow n, T$("POW!"): Sfx 9, 80, 4, 180, .4
  END IF
END SUB

SUB Pow (n, a$)
  powT(n) = .7: pow$(n) = a$
END SUB

' ================================================================================================
' What is written over the picture
' ================================================================================================
SUB Hud
  IF state = 1 THEN
    n = INT(cdown) + 1: IF n > 3 THEN n = 3
    IF cdown > 0 THEN
      IF n = 3 THEN c = RGB(255, 90, 95) ELSE IF n = 2 THEN c = RGB(255, 160, 40) ELSE c = RGB(255, 220, 60)
      BigText LTRIM$(STR$(n)), 320, 120, 12 + 6 * (cdown - INT(cdown)), c
    END IF
  END IF
  IF msgT > 0 THEN
    msgT = msgT - dt
    BigText msg$, 320, 110, 7, RGB(255, 255, 255)
  END IF
  ' the POWs written (the picture is in 3D, the word over it)
  IF demo THEN EXIT SUB
  ' the place, the lap, the time
  pl$ = LTRIM$(STR$(place(0)))
  IF place(0) = 1 THEN c = RGB(255, 210, 60) ELSE c = RGB(255, 255, 255)
  BigText pl$, 34, 14, 8, c
  BigText "/" + LTRIM$(STR$(NSHIP)), 90, 40, 3, RGB(255, 255, 255)
  lp = INT(sd(0) / tlen) + 1: IF lp < 1 THEN lp = 1
  IF lp > LAPS THEN lp = LAPS
  BigText T$("LAP") + " " + LTRIM$(STR$(lp)) + "/" + LTRIM$(STR$(LAPS)), 70, 82, 3, RGB(255, 255, 255)
  Panel 14, 108, 110, 24: DRAWTEXT 26, 112, Clock$(racet), INK
  ' the item
  Panel 290, 8, 60, 52
  IF item(0) THEN
    a$ = itemName$(item(0))
    SELECT CASE item(0)
      CASE 1: Disc 320, 30, 12, RGB(255, 80, 80), 1: Disc 320, 30, 5, RGB(255, 210, 60), 1
      CASE 2: Disc 320, 30, 13, RGB(255, 120, 200), .7: CIRCLE (315, 27), 3, RGB(255, 210, 235), , , , F
      CASE 3: Disc 320, 30, 14, RGB(150, 225, 255), 1: CIRCLE (314, 24), 4, RGB(255, 255, 255), , , , F
      CASE 4: Tri 308, 42, 320, 14, 332, 42, RGB(255, 160, 40): Tri 313, 42, 320, 26, 327, 42, RGB(255, 230, 80)
    END SELECT
    DRAWTEXT 320 - LEN(a$) * 4, 64, a$, RGB(255, 255, 255)
  ELSE
    DRAWTEXT 316, 26, "?", RGB(180, 170, 200)
  END IF
  ' the speed
  sp = INT(v(0) * 2.6)
  Panel 494, 440, 136, 30
  wb = v(0) / (vmax * 1.45) * 112: IF wb > 112 THEN wb = 112
  IF turbo(0) > 0 THEN c = RGB(255, 160, 40) ELSE c = RGB(60, 210, 130)
  IF wb > 1 THEN LINE (506, 454)-(506 + wb, 462), c, BF
  DRAWTEXT 506, 444, LTRIM$(STR$(sp)) + " km/h", INK
  ' the map, the racers on it
  MiniMap 572, 120, 52
  ' the order: faces
  FOR n = 0 TO NSHIP - 1: order(n) = n: NEXT
  FOR a = 0 TO NSHIP - 2: FOR b = a + 1 TO NSHIP - 1
    IF place(order(b)) < place(order(a)) THEN SWAP order(a), order(b)
  NEXT: NEXT
  FOR k = 0 TO NSHIP - 1
    n = order(k): y = 200 + k * 30
    IF n = 0 THEN CIRCLE (604, y), 14, RGB(255, 210, 60), , , , F
    IF spin(n) > 0 OR stuck(n) > 0 THEN md = 1 ELSE md = 0
    Head pilot(n), 604, y + 1, 10, -1, md
    DRAWTEXT 572, y - 6, LTRIM$(STR$(k + 1)), RGB(255, 255, 255)
  NEXT
  FOR n = 0 TO NSHIP - 1
    IF powT(n) > .3 AND n = 0 THEN BigText pow$(n), 320, 200, 4, RGB(255, 240, 120)
  NEXT
END SUB

SUB MiniMap (x, y, r)
  Panel x - r - 8, y - r - 8, 2 * r + 16, 2 * r + 16
  FOR k = 0 TO 49: LINE (x + mmx(k) * r, y + mmy(k) * r)-(x + mmx(k + 1) * r, y + mmy(k + 1) * r), INK: NEXT
  FOR n = NSHIP - 1 TO 0 STEP -1
    i = INT((sd(n) - tlen * INT(sd(n) / tlen)) / seglen) \ 8: IF i > 49 THEN i = 49
    IF n = 0 THEN q = 4 ELSE q = 3
    CIRCLE (x + mmx(i) * r, y + mmy(i) * r), q + 1, INK, , , , F
    CIRCLE (x + mmx(i) * r, y + mmy(i) * r), q, pc1(pilot(n)), , , , F
  NEXT
END SUB

' A cartoon panel: cream, an ink border
SUB Panel (x, y, w, h)
  LINE (x - 2, y - 2)-(x + w + 2, y + h + 2), INK, BF
  LINE (x, y)-(x + w, y + h), RGB(255, 253, 248), BF
  LINE (x, y + h - 3)-(x + w, y + h), RGB(235, 226, 210), BF
END SUB

FUNCTION Clock$ (s)
  IF s < 0 THEN s = 0
  m = INT(s / 60): r = s - m * 60
  c = INT(r * 10 + .5): IF c >= 600 THEN c = 599
  a$ = LTRIM$(STR$(c \ 10)): IF LEN(a$) < 2 THEN a$ = "0" + a$
  Clock$ = LTRIM$(STR$(m)) + ":" + a$ + "." + LTRIM$(STR$(c MOD 10))
END FUNCTION

' Big letters with a thick ink outline (the 5 x 7 font), centred on x; s = the size of a dot
SUB BigText (a$, x, y, s, c)
  a$ = UCASE$(a$)
  w = LEN(a$) * 6 * s - s
  x0 = x - w / 2
  FOR pass = 0 TO 1
    FOR i = 1 TO LEN(a$)
      k = INSTR(fontch$, MID$(a$, i, 1))
      IF k THEN
        g$ = glyph$(k)
        FOR r = 0 TO 6
          FOR q = 0 TO 4
            IF MID$(g$, r * 5 + q + 1, 1) = "#" THEN
              xx = x0 + (i - 1) * 6 * s + q * s: yy = y + r * s
              IF pass = 0 THEN LINE (xx - 2, yy - 2)-(xx + s + 1, yy + s + 3), INK, BF ELSE LINE (xx, yy)-(xx + s - 1, yy + s - 1), c, BF
            END IF
          NEXT
        NEXT
      END IF
    NEXT
  NEXT
END SUB

SUB Results
  Panel 150, 96, 340, 300
  IF place(0) = 1 THEN a$ = T$("YOU WIN!") ELSE IF place(0) <= 3 THEN a$ = T$("PODIUM!") ELSE a$ = T$("FINISH!")
  BigText a$, 320, 108, 5, RGB(255, 200, 40)
  FOR n = 0 TO NSHIP - 1: order(n) = n: NEXT
  FOR a = 0 TO NSHIP - 2
    FOR b = a + 1 TO NSHIP - 1
      IF fintime(order(b)) < fintime(order(a)) THEN SWAP order(a), order(b)
    NEXT
  NEXT
  FOR k = 0 TO NSHIP - 1
    n = order(k): y = 168 + k * 30
    IF n = 0 THEN LINE (164, y - 13)-(476, y + 13), RGB(255, 236, 160), BF
    DRAWTEXT 176, y - 8, LTRIM$(STR$(k + 1)) + ".", INK
    Head pilot(n), 222, y + 1, 10, -1, 0
    DRAWTEXT 246, y - 8, pname$(pilot(n)), INK
    DRAWTEXT 380, y - 8, Clock$(fintime(n)), INK
  NEXT
  ' the stars: three for the first, two for the podium, one for the finish
  IF place(0) = 1 THEN ns = 3 ELSE IF place(0) <= 3 THEN ns = 2 ELSE ns = 1
  FOR k = 0 TO 2
    IF k < ns THEN c = RGB(255, 210, 60) ELSE c = RGB(217, 208, 191)
    Star 280 + k * 40, 362, 15, c
  NEXT
  DRAWTEXT 170, 336, T$("BEST LAP") + " " + Clock$(bestlap(0)), INK
END SUB

SUB Star (x, y, r, c)
  FOR q = 0 TO 4
    a = -PI / 2 + q * 2 * PI / 5
    Tri x, y, x + r * COS(a - .63) * .45, y + r * SIN(a - .63) * .45, x + r * COS(a), y + r * SIN(a), c
    Tri x, y, x + r * COS(a + .63) * .45, y + r * SIN(a + .63) * .45, x + r * COS(a), y + r * SIN(a), c
  NEXT
END SUB

' ================================================================================================
' The title: a race goes on by itself behind the menu
' ================================================================================================
SUB TitleScreen
  demo = -1
  mp0 = mypilot: mypilot = INT(RND * 6)
  SetupGrid
  mypilot = mp0
  state = 2: racet = 0: menuSel = 2: paused = 0: vdist = 50
  last = TIMER
  DO
    now = TIMER: dt = now - last: last = now
    IF dt < 0 OR dt > .05 THEN dt = .05
    t = t + dt
    k$ = UCASE$(INKEY$)
    p = PAD
    up = k$ = CHR$(0) + "H" OR ((p AND 1) <> 0 AND (padprev AND 1) = 0)
    dn = k$ = CHR$(0) + "P" OR ((p AND 2) <> 0 AND (padprev AND 2) = 0)
    lf = k$ = CHR$(0) + "K" OR ((p AND 4) <> 0 AND (padprev AND 4) = 0)
    rt = k$ = CHR$(0) + "M" OR ((p AND 8) <> 0 AND (padprev AND 8) = 0)
    go = k$ = CHR$(13) OR k$ = " " OR ((p AND 16) <> 0 AND (padprev AND 16) = 0) OR ((p AND 8192) <> 0 AND (padprev AND 8192) = 0)
    padprev = p
    IF k$ = CHR$(27) THEN SoundsOff: CLS: END
    IF up THEN menuSel = (menuSel + 3) MOD 4: Sfx 12, 700, 1, 90, .05
    IF dn THEN menuSel = (menuSel + 1) MOD 4: Sfx 12, 700, 1, 90, .05
    IF lf OR rt THEN
      d = 1: IF lf THEN d = -1
      IF menuSel = 0 THEN mypilot = (mypilot + d + 6) MOD 6
      IF menuSel = 1 THEN circ = (circ - 1 + d + NCIRC) MOD NCIRC + 1: BuildCircuit circ: SetupGrid: state = 2: racet = 0
      Sfx 12, 900, 1, 90, .05
    END IF
    IF go THEN
      IF menuSel = 3 THEN SoundsOff: CLS: END
      IF menuSel = 2 THEN EXIT DO
      menuSel = 2
    END IF
    Controls
    Physics
    Shots
    MusicTick
    ' the camera: behind the leader, swaying
    lead = 0
    FOR n = 1 TO NSHIP - 1: IF sd(n) > sd(lead) THEN lead = n
    NEXT
    TrackAt sd(lead) - 10 + 3 * SIN(t * .3), 3 * SIN(t * .4), 4 + 1.2 * SIN(t * .23)
    cex = wx: cey = wy: cez = wz
    TrackAt sd(lead) + 6, lx(lead), .8
    ctx = wx: cty = wy: ctz = wz
    DrawWorld sd(lead) - 10
    ' the menu
    BigText "ZOOMO!", 324, 34, 11, RGB(255, 160, 40)
    Panel 170, 178, 300, 196
    MenuLine 0, T$("PILOT"), pname$(mypilot)
    MenuLine 1, T$("CIRCUIT"), T$(cname$(circ))
    MenuLine 2, T$("START"), ""
    MenuLine 3, T$("QUIT"), ""
    Head mypilot, 200, 206, 14, -1, 0
    Panel 0, 430, 639, 46
    a$ = T$("Up/Down choose  Left/Right change  Enter play  Esc quit"): DRAWTEXT 320 - LEN(a$) * 4, 436, a$, INK
    a$ = T$("Arrows steer  Down brake  Space use  P pause"): DRAWTEXT 320 - LEN(a$) * 4, 454, a$, INK
    SfxTick
    PAUSE 1
  LOOP
  SoundsOff
END SUB

SUB MenuLine (k, a$, b$)
  y = 194 + k * 44
  IF menuSel = k THEN c = RGB(255, 160, 40): LINE (180, y - 8)-(460, y + 26), RGB(255, 236, 160), BF ELSE c = RGB(140, 130, 160)
  IF b$ = "" THEN
    BigText a$, 320, y, 3, c
  ELSE
    BigText a$, 270, y, 2, c
    IF menuSel = k THEN b$ = "< " + b$ + " >"
    DRAWTEXT 330, y + 3, b$, INK
  END IF
END SUB

' ================================================================================================
' Sound: a bouncy tune on the General MIDI synthesizer, the engine and the effects on the voices
' ================================================================================================
SUB MusicTick
  IF NOT musOn THEN EXIT SUB
  IF mnext = 0 THEN
    mnext = TIMER: mstep = 0: mbar = 0
    MIDIPROGRAM 0, 33: MIDIPROGRAM 1, 80
    MIDICONTROL 0, 7, 100: MIDICONTROL 1, 7, 70: MIDICONTROL 9, 7, 100
  END IF
  now = TIMER
  IF now < mnext - 1 OR now > mnext + 1 THEN mnext = now
  DO WHILE now >= mnext
    ' C major, cheerful: C Am F G, a bar each
    sel = mbar MOD 4
    IF sel = 0 THEN root = 48 ELSE IF sel = 1 THEN root = 45 ELSE IF sel = 2 THEN root = 41 ELSE root = 43
    s = mstep
    IF s MOD 4 = 0 THEN MIDINOTE 9, 36, 110
    IF s = 4 OR s = 12 THEN MIDINOTE 9, 38, 90
    IF s MOD 2 = 1 THEN MIDINOTE 9, 42, 60
    IF s MOD 2 = 0 THEN
      IF mbass THEN MIDINOTE 0, mbass, 0
      mbass = root - 12 + 12 * ((s \ 2) MOD 2): MIDINOTE 0, mbass, 100
    END IF
    IF mleadOn THEN MIDINOTE 1, mleadOn, 0: mleadOn = 0
    IF (mbar MOD 4) <> 3 OR s < 8 THEN
      third = 4: IF sel = 1 THEN third = 3
      SELECT CASE s MOD 8
        CASE 0: nn = 0
        CASE 2: nn = third
        CASE 3: nn = 7
        CASE 4: nn = 12
        CASE 6: nn = 7
        CASE ELSE: nn = -1
      END SELECT
      IF nn >= 0 THEN mleadOn = root + 24 + nn: MIDINOTE 1, mleadOn, 70
    END IF
    mstep = mstep + 1
    IF mstep >= 16 THEN mstep = 0: mbar = mbar + 1
    mnext = mnext + 60 / 150 / 4
  LOOP
END SUB

SUB Engine
  IF NOT sndOn OR demo THEN EXIT SUB
  f = 50 + v(0) * 1 + turbo(0) * 40
  IF ABS(f - engF) > 3 THEN
    engF = f
    NOTEON 14, f, 3, 30
  END IF
END SUB

' An effect on voice vc: frequency, wave (0 square, 1 sine, 2 triangle, 3 saw, 4 noise), volume, seconds
SUB Sfx (vc, f, w, vol, dur)
  IF NOT sndOn THEN EXIT SUB
  NOTEON vc, f, w, vol
  sfxEnd(vc) = TIMER + dur
END SUB

SUB SfxTick
  IF NOT sndOn THEN EXIT SUB
  now = TIMER
  FOR vc = 9 TO 13
    IF sfxEnd(vc) > 0 AND now > sfxEnd(vc) THEN NOTEOFF vc: sfxEnd(vc) = 0
  NEXT
END SUB

SUB SoundsOff
  IF sndOn THEN NOTEOFF: engF = 0
  IF musOn THEN MIDIOFF: mnext = 0: mbass = 0: mleadOn = 0
END SUB
