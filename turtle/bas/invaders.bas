' invaders.bas -- Space Invaders in SCREEN 13 (320 x 200, 256 colours), for Code is Fun's free mode
' (Onyx BASIC / QBasic).
'
'   Left / Right, the mouse or a finger ... move the cannon
'   Space, a click or a tap ............... fire
'   P pause      Esc back to the title (Esc there: quit)
'
' 55 invaders march down, faster as they fall; four shields wear away shot by shot; now and then a
' mystery ship crosses the sky. Each wave starts lower.
'
' Shows: sprites drawn once with PSET and kept with GET, then drawn with PUT; KEYDOWN, MOUSEX /
' MOUSEB; PLAY "MB" (the sounds play in the background); POINT to find the shields' pixels; DATA;
' SUBs and FUNCTIONs working on SHARED arrays.
'
' MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.

CONST NCOL = 11, NROW = 5, AW = 12, AH = 8, DXS = 16, DYS = 12   ' the invaders' grid
CONST PY = 178, PW = 13, GROUND = 189                             ' the cannon, the ground
CONST SHY = 150, SHC = 2                                          ' the shields: their top, their colour
CONST MAXBOMB = 3, SPR = 100                                      ' bombs at once; a sprite's room in sp()

DIM SHARED alive(NCOL - 1, NROW - 1), nAlive
DIM SHARED fx, fy, fdir, anim, stepT, ox, oy, odrawn, marchN
DIM SHARED px, opx, bulOn, bulX, bulY, obulY, bulDrawn
DIM SHARED bOn(MAXBOMB), bX(MAXBOMB), bY(MAXBOMB), obY(MAXBOMB), bDrawn(MAXBOMB)
DIM SHARED ufoOn, ufoX, ufoDir, oufoX, ufoWait, ufoMsgT, ufoMsgX
DIM SHARED boomT, boomX, boomY
DIM SHARED score, hiscore, lives, wave, nextT, sfx$
DIM SHARED sp(10 * SPR), tx(1500), ty(1500), ntl, tw, th

SCREEN 13
RANDOMIZE TIMER
MakeSprites
DO WHILE TitleScreen
  PlayGame
LOOP
CLS
END

Sprites:     ' 0-5 the invaders (3 kinds x 2 steps), 6 the cannon, 7 a hit, 8 the mystery ship, 9 the cannon hit
DATA 12, 8, 13
DATA ".....XX.....", "....XXXX....", "...XXXXXX...", "..XX.XX.XX..", "..XXXXXXXX..", "....X..X....", "...X.XX.X...", "..X.X..X.X.."
DATA 12, 8, 13
DATA ".....XX.....", "....XXXX....", "...XXXXXX...", "..XX.XX.XX..", "..XXXXXXXX..", ".....XX.....", "....X..X....", "...X....X..."
DATA 12, 8, 11
DATA "..X.....X...", "...X...X....", "..XXXXXXX...", ".XX.XXX.XX..", "XXXXXXXXXXX.", "X.XXXXXXX.X.", "X.X.....X.X.", "...XX.XX...."
DATA 12, 8, 11
DATA "..X.....X...", "X..X...X..X.", "X.XXXXXXX.X.", "XXX.XXX.XXX.", "XXXXXXXXXXX.", ".XXXXXXXXX..", "..X.....X...", ".X.......X.."
DATA 12, 8, 14
DATA "....XXXX....", ".XXXXXXXXXX.", "XXXXXXXXXXXX", "XXX..XX..XXX", "XXXXXXXXXXXX", "...XX..XX...", "..XX.XX.XX..", "XX........XX"
DATA 12, 8, 14
DATA "....XXXX....", ".XXXXXXXXXX.", "XXXXXXXXXXXX", "XXX..XX..XXX", "XXXXXXXXXXXX", "..XXX..XXX..", ".XX..XX..XX.", "..XX....XX.."
DATA 13, 8, 10
DATA "......X......", ".....XXX.....", ".....XXX.....", ".XXXXXXXXXXX.", "XXXXXXXXXXXXX", "XXXXXXXXXXXXX", "XXXXXXXXXXXXX", "XXXXXXXXXXXXX"
DATA 12, 8, 15
DATA "...X....X...", "X...X..X...X", ".X........X.", "..X......X..", "XX........XX", "..X......X..", ".X..X..X..X.", "X..X....X..X"
DATA 16, 7, 12
DATA ".....XXXXXX.....", "...XXXXXXXXXX...", "..XXXXXXXXXXXX..", ".XX.XX.XX.XX.XX.", "XXXXXXXXXXXXXXXX", "..XXX..XX..XXX..", "...X........X..."
DATA 13, 8, 10
DATA "....X...X....", "..X...X....X.", "X...XXX..X...", "..XXX.XXX...X", ".XXXXX.XXXX..", "XXX.XXXXX.XXX", "XXXXXXXXXXXXX", "X.XXXXX.XXX.X"

' ---- the title: TRUE = play, FALSE = quit ------------------------------------------------
FUNCTION TitleScreen
  CLS
  ' the big title: the 8 x 16 font, each pixel a 3 x 3 block, green to yellow downwards
  COLOR 15: LOCATE 2, 16: PRINT "S P A C E";
  x0 = (320 - tw * 3) \ 2
  FOR i = 0 TO ntl - 1
    x = x0 + tx(i) * 3: y = 22 + ty(i) * 3
    LINE (x, y)-(x + 2, y + 2), 47 + (ty(i) * 4) \ (th + 1), BF
  NEXT
  COLOR 15: LOCATE 11, 12: PRINT "SCORE ADVANCE TABLE";
  PUT (106, 104), sp(8 * SPR), PSET
  PUT (108, 120), sp(0 * SPR), PSET
  PUT (108, 136), sp(2 * SPR), PSET
  PUT (108, 152), sp(4 * SPR), PSET
  COLOR 7
  LOCATE 14, 17: PRINT "= ? MYSTERY";
  LOCATE 16, 17: PRINT "= 30 POINTS";
  LOCATE 18, 17: PRINT "= 20 POINTS";
  LOCATE 20, 17: PRINT "= 10 POINTS";
  COLOR 8: LOCATE 24, 1: PRINT "ARROWS / MOUSE MOVE  SPACE / CLICK FIRE";
  COLOR 7: LOCATE 25, 13: PRINT "HIGH SCORE"; hiscore;
  DO WHILE MOUSEB AND 1: PAUSE 10: LOOP
  DO
    k$ = UCASE$(INKEY$)
    IF k$ = CHR$(27) THEN TitleScreen = 0: EXIT FUNCTION
    IF k$ = " " OR k$ = CHR$(13) OR (MOUSEB AND 1) THEN EXIT DO
    IF (TICKS \ 400) MOD 2 THEN COLOR 10 ELSE COLOR 0
    LOCATE 22, 7: PRINT "PRESS SPACE OR CLICK TO PLAY";
    PAUSE 20
  LOOP
  DO WHILE MOUSEB AND 1: PAUSE 10: LOOP
  TitleScreen = -1
END FUNCTION

' ---- a game: waves until no life is left ---------------------------------------------------
SUB PlayGame
  score = 0: lives = 3: wave = 1
  DO
    IF PlayWave = 0 THEN EXIT DO
    wave = wave + 1
  LOOP
  IF score > hiscore THEN hiscore = score
END SUB

' One wave: 1 = all the invaders shot, 0 = game over or Esc.
FUNCTION PlayWave
  CLS
  FOR c = 0 TO NCOL - 1
    FOR r = 0 TO NROW - 1: alive(c, r) = -1: NEXT
  NEXT
  nAlive = NCOL * NROW
  fx = 24: fy = 28 + 8 * ((wave - 1) MOD 6): fdir = 1: anim = 0: stepT = 0: odrawn = 0: marchN = 0
  ufoOn = 0: ufoWait = 600 + INT(RND * 600): ufoMsgT = 0: boomT = 0
  DrawShields
  LINE (0, GROUND)-(319, GROUND), 10
  DrawHud
  Serve
  DrawInvaders
  Banner "WAVE" + STR$(wave)
  lastM = MOUSEX: oldB = 0: oldS = 0
  nextT = TICKS
  DO
    k$ = UCASE$(INKEY$)
    kl = KEYDOWN("LEFT"): kr = KEYDOWN("RIGHT"): ks = KEYDOWN("SPACE")
    m = MOUSEX: mb = MOUSEB AND 1
    IF k$ = CHR$(27) THEN PlayWave = 0: EXIT FUNCTION
    IF k$ = "P" THEN PauseGame
    IF k$ = CHR$(0) + "K" AND kl = 0 THEN px = px - 6     ' no held keys: a press moves a step
    IF k$ = CHR$(0) + "M" AND kr = 0 THEN px = px + 6
    IF kl THEN px = px - 2
    IF kr THEN px = px + 2
    IF m <> lastM THEN px = m - PW \ 2: lastM = m
    IF px < 4 THEN px = 4
    IF px > 315 - PW THEN px = 315 - PW
    fire = (k$ = " ") OR (ks AND NOT oldS) OR (mb AND NOT oldB)
    oldS = ks: oldB = mb
    IF fire AND bulOn = 0 THEN
      bulOn = -1: bulX = px + PW \ 2: bulY = PY - 4: bulDrawn = 0
      Sfx "T255 L64 O5 C"
    END IF

    MoveInvaders
    MoveBullet
    MoveBombs
    MoveUfo
    DrawCannon
    IF boomT > 0 THEN
      boomT = boomT - 1
      IF boomT = 0 THEN LINE (boomX, boomY)-(boomX + AW - 1, boomY + AH - 1), 0, BF
    END IF
    FlushSfx

    IF nAlive = 0 THEN
      Sfx "T160 L16 O4 C E G > C8": FlushSfx
      Banner "WAVE" + STR$(wave) + " CLEARED"
      PlayWave = 1: EXIT FUNCTION
    END IF
    IF CannonHit THEN
      LoseLife
      IF lives = 0 THEN Banner "GAME OVER": PlayWave = 0: EXIT FUNCTION
      Serve
      nextT = TICKS
    END IF
    IF fy + Lowest * DYS + AH >= PY THEN            ' the invaders landed
      lives = 1: LoseLife
      Banner "GAME OVER": PlayWave = 0: EXIT FUNCTION
    END IF
    WaitFrame
  LOOP
END FUNCTION

' ---- the invaders ----------------------------------------------------------------------------
FUNCTION Lowest                                     ' the lowest row with an invader
  Lowest = 0
  FOR r = NROW - 1 TO 0 STEP -1
    FOR c = 0 TO NCOL - 1
      IF alive(c, r) THEN Lowest = r: EXIT FUNCTION
    NEXT
  NEXT
END FUNCTION

SUB DrawInvaders                                    ' the grid erased where it was, drawn where it is
  IF odrawn THEN LINE (ox, oy)-(ox + (NCOL - 1) * DXS + AW - 1, oy + (NROW - 1) * DYS + AH - 1), 0, BF
  FOR r = 0 TO NROW - 1
    kind = (r + 1) \ 2
    FOR c = 0 TO NCOL - 1
      IF alive(c, r) THEN PUT (fx + c * DXS, fy + r * DYS), sp((kind * 2 + anim) * SPR), PSET
    NEXT
  NEXT
  ox = fx: oy = fy: odrawn = -1
END SUB

' A step every so many frames: fewer invaders, quicker steps. At an edge: down, and back.
SUB MoveInvaders
  stepT = stepT + 1
  IF stepT < 1 + nAlive \ 2 THEN EXIT SUB
  stepT = 0
  minC = NCOL: maxC = -1
  FOR c = 0 TO NCOL - 1
    FOR r = 0 TO NROW - 1
      IF alive(c, r) THEN
        IF c < minC THEN minC = c
        IF c > maxC THEN maxC = c
      END IF
    NEXT
  NEXT
  IF maxC < 0 THEN EXIT SUB
  nx = fx + 3 * fdir
  IF nx + minC * DXS < 4 OR nx + maxC * DXS + AW > 316 THEN
    fy = fy + 6: fdir = -fdir
  ELSE
    fx = nx
  END IF
  anim = 1 - anim
  DrawInvaders
  marchN = (marchN + 1) MOD 4
  Sfx "T255 L32 O1 " + MID$("GFED", marchN + 1, 1)
  ' a bomb, now and then, from the lowest invader of a column
  IF RND < .35 + wave * .05 THEN DropBomb
END SUB

SUB DropBomb
  FOR i = 0 TO MAXBOMB
    IF bOn(i) = 0 THEN
      FOR tries = 1 TO 8
        c = INT(RND * NCOL)
        FOR r = NROW - 1 TO 0 STEP -1
          IF alive(c, r) THEN
            bOn(i) = -1: bX(i) = fx + c * DXS + AW \ 2: bY(i) = fy + r * DYS + AH + 1: bDrawn(i) = 0
            EXIT SUB
          END IF
        NEXT
      NEXT
      EXIT SUB
    END IF
  NEXT
END SUB

' The invader at (x, y), if a living one is there -> its column + row * 100, -1 none
FUNCTION InvaderAt (x, y)
  InvaderAt = -1
  IF x < fx OR y < fy THEN EXIT FUNCTION
  c = (x - fx) \ DXS: r = (y - fy) \ DYS
  IF c >= NCOL OR r >= NROW THEN EXIT FUNCTION
  IF (x - fx) MOD DXS >= AW OR (y - fy) MOD DYS >= AH THEN EXIT FUNCTION
  IF alive(c, r) THEN InvaderAt = c + r * 100
END FUNCTION

' ---- the cannon, its shot -------------------------------------------------------------------
SUB Serve
  FOR i = 0 TO MAXBOMB
    IF bDrawn(i) THEN LINE (bX(i), obY(i))-(bX(i) + 1, obY(i) + 3), 0, BF
    bOn(i) = 0: bDrawn(i) = 0
  NEXT
  IF bulDrawn THEN LINE (bulX, obulY)-(bulX, obulY + 3), 0
  bulOn = 0: bulDrawn = 0
  LINE (0, PY)-(319, PY + 7), 0, BF
  px = 160 - PW \ 2: opx = -1
  DrawCannon
END SUB

SUB DrawCannon
  IF px = opx THEN EXIT SUB
  IF opx >= 0 THEN LINE (opx, PY)-(opx + PW - 1, PY + 7), 0, BF
  PUT (px, PY), sp(6 * SPR), PSET
  opx = px
END SUB

SUB MoveBullet
  IF bulOn = 0 THEN EXIT SUB
  IF bulDrawn THEN LINE (bulX, obulY)-(bulX, obulY + 3), 0: bulDrawn = 0
  FOR s = 1 TO 4                                     ' pixel by pixel: nothing is jumped over
    bulY = bulY - 1
    IF bulY < 9 THEN bulOn = 0: EXIT SUB
    hit = InvaderAt(bulX, bulY)
    IF hit >= 0 THEN KillInvader hit MOD 100, hit \ 100: bulOn = 0: EXIT SUB
    IF ufoOn AND bulY <= 16 AND bulX >= ufoX AND bulX < ufoX + 16 THEN HitUfo: bulOn = 0: EXIT SUB
    IF POINT(bulX, bulY) = SHC THEN Blast bulX, bulY - 2: bulOn = 0: EXIT SUB
    FOR i = 0 TO MAXBOMB                             ' a bomb met: both gone
      IF bOn(i) AND ABS(bX(i) - bulX) <= 1 AND bulY >= bY(i) AND bulY <= bY(i) + 3 THEN
        IF bDrawn(i) THEN LINE (bX(i), obY(i))-(bX(i) + 1, obY(i) + 3), 0, BF
        bOn(i) = 0: bDrawn(i) = 0: bulOn = 0: EXIT SUB
      END IF
    NEXT
  NEXT
  LINE (bulX, bulY)-(bulX, bulY + 3), 15
  obulY = bulY: bulDrawn = -1
END SUB

SUB KillInvader (c, r)
  alive(c, r) = 0: nAlive = nAlive - 1
  kind = (r + 1) \ 2
  score = score + 10 * (3 - kind)
  DrawHud
  IF boomT > 0 THEN LINE (boomX, boomY)-(boomX + AW - 1, boomY + AH - 1), 0, BF
  boomX = fx + c * DXS: boomY = fy + r * DYS: boomT = 8
  LINE (boomX, boomY)-(boomX + AW - 1, boomY + AH - 1), 0, BF
  PUT (boomX, boomY), sp(7 * SPR), PSET
  Sfx "T255 L64 O3 C < G"
END SUB

' A hole in a shield: a ragged blob of black around (x, y)
SUB Blast (x, y)
  FOR i = 1 TO 14
    LINE (x - 2 + INT(RND * 5), y - 1 + INT(RND * 5))-STEP(0, 0), 0
  NEXT
  LINE (x - 1, y)-(x + 1, y + 2), 0, BF
  Sfx "T255 L64 O2 C"
END SUB

' ---- the bombs -------------------------------------------------------------------------------
SUB MoveBombs
  FOR i = 0 TO MAXBOMB
    IF bOn(i) THEN
      IF bDrawn(i) THEN LINE (bX(i), obY(i))-(bX(i) + 1, obY(i) + 3), 0, BF: bDrawn(i) = 0
      FOR s = 1 TO 2 - (wave > 3)
        bY(i) = bY(i) + 1
        tip = bY(i) + 3
        IF tip >= GROUND THEN bOn(i) = 0: EXIT FOR
        IF POINT(bX(i), tip) = SHC OR POINT(bX(i) + 1, tip) = SHC THEN Blast bX(i), tip: bOn(i) = 0: EXIT FOR
      NEXT
      IF bOn(i) THEN
        ' a zigzag, two pixels wide
        IF (bY(i) \ 2) MOD 2 THEN LINE (bX(i), bY(i))-(bX(i) + 1, bY(i) + 3), 12, B ELSE LINE (bX(i), bY(i))-(bX(i) + 1, bY(i) + 3), 15, BF
        obY(i) = bY(i): bDrawn(i) = -1
      END IF
    END IF
  NEXT
END SUB

FUNCTION CannonHit
  CannonHit = 0
  FOR i = 0 TO MAXBOMB
    IF bOn(i) AND bX(i) + 1 >= px AND bX(i) <= px + PW - 1 AND bY(i) + 3 >= PY + 2 THEN CannonHit = -1
  NEXT
END FUNCTION

' ---- the mystery ship ------------------------------------------------------------------------
SUB MoveUfo
  IF ufoMsgT > 0 THEN
    ufoMsgT = ufoMsgT - 1
    IF ufoMsgT = 0 THEN LINE (ufoMsgX, 9)-(ufoMsgX + 31, 24), 0, BF
  END IF
  IF ufoOn = 0 THEN
    ufoWait = ufoWait - 1
    IF ufoWait <= 0 AND nAlive > 8 THEN
      ufoOn = -1
      IF RND < .5 THEN ufoX = 0: ufoDir = 1 ELSE ufoX = 303: ufoDir = -1
      oufoX = -1
    END IF
    EXIT SUB
  END IF
  IF oufoX >= 0 THEN LINE (oufoX, 10)-(oufoX + 15, 16), 0, BF
  ufoX = ufoX + ufoDir
  IF ufoX < 0 OR ufoX > 303 THEN ufoOn = 0: ufoWait = 900 + INT(RND * 900): EXIT SUB
  PUT (ufoX, 10), sp(8 * SPR), PSET
  oufoX = ufoX
  IF ufoX MOD 8 = 0 THEN Sfx "T255 L64 O4 E"
END SUB

SUB HitUfo
  LINE (ufoX, 10)-(ufoX + 15, 16), 0, BF
  ufoOn = 0: ufoWait = 900 + INT(RND * 900)
  pts = 50 * (1 + INT(RND * 6))
  score = score + pts: DrawHud
  ufoMsgX = ufoX: IF ufoMsgX > 288 THEN ufoMsgX = 288
  ufoMsgT = 60
  DRAWTEXT ufoMsgX, 9, LTRIM$(STR$(pts)), 12
  Sfx "T200 L32 O5 C E G E C"
END SUB

' ---- the shields, the score, the lives ------------------------------------------------------
SUB DrawShields
  FOR i = 0 TO 3
    x = 40 + i * 72
    LINE (x, SHY + 3)-(x + 21, SHY + 15), SHC, BF
    LINE (x + 3, SHY)-(x + 18, SHY + 2), SHC, BF
    LINE (x + 1, SHY + 2)-(x + 20, SHY + 2), SHC
    LINE (x + 6, SHY + 11)-(x + 15, SHY + 15), 0, BF
    LINE (x + 7, SHY + 10)-(x + 14, SHY + 10), 0
  NEXT
END SUB

SUB DrawHud
  IF score > hiscore THEN hiscore = score
  COLOR 15: LOCATE 1, 1: PRINT "SCORE";
  COLOR 10: PRINT USING "#####"; score;
  COLOR 15: LOCATE 1, 15: PRINT "HI";
  COLOR 10: PRINT USING "#####"; hiscore;
  COLOR 15: LOCATE 1, 30: PRINT "WAVE";
  COLOR 10: PRINT USING "##"; wave;
  DrawLives
END SUB

SUB DrawLives
  LINE (0, GROUND + 2)-(319, 199), 0, BF
  COLOR 10: LOCATE 25, 1: PRINT LTRIM$(STR$(lives));
  FOR i = 1 TO lives - 1
    IF i <= 6 THEN PUT (10 + (i - 1) * 16, GROUND + 3), sp(6 * SPR), PSET
  NEXT
END SUB

SUB LoseLife
  Sfx "T120 L16 O2 G E C < G4": FlushSfx
  FOR f = 1 TO 10                                   ' the cannon breaks up
    LINE (px, PY)-(px + PW - 1, PY + 7), 0, BF
    IF f MOD 2 THEN PUT (px, PY), sp(9 * SPR), PSET ELSE PUT (px, PY), sp(6 * SPR), PSET
    PAUSE 80
  NEXT
  LINE (px, PY)-(px + PW - 1, PY + 7), 0, BF
  lives = lives - 1
  DrawLives
  PAUSE 600
END SUB

' Two lines in the middle of the screen, 1.5 s
SUB Banner (a$)
  COLOR 15: LOCATE 13, 21 - LEN(a$) \ 2: PRINT a$;
  FlushSfx
  t = TICKS
  DO WHILE TICKS - t < 1500 AND TICKS >= t
    k$ = INKEY$
    PAUSE 20
  LOOP
  LINE (0, 96)-(319, 103), 0, BF
  IF nAlive > 0 THEN odrawn = 0: DrawInvaders
END SUB

SUB PauseGame
  COLOR 14: LOCATE 13, 18: PRINT "PAUSED";
  DO
    k$ = UCASE$(INKEY$)
    PAUSE 20
  LOOP UNTIL k$ = "P" OR k$ = " " OR k$ = CHR$(27)
  LOCATE 13, 18: PRINT "      ";
  odrawn = 0: DrawInvaders
  nextT = TICKS
END SUB

SUB WaitFrame                                       ' 50 frames a second
  nextT = nextT + 20
  t = TICKS
  IF t > nextT + 100 OR t < nextT - 100 THEN nextT = t
  DO WHILE TICKS < nextT
    PAUSE 5
  LOOP
END SUB

SUB Sfx (m$)                                        ' a sound for the end of the frame (the first wins)
  IF sfx$ = "" THEN sfx$ = m$
END SUB

SUB FlushSfx
  IF sfx$ <> "" THEN
    IF PLAY(0) < 6 THEN PLAY "MB " + sfx$
  END IF
  sfx$ = ""
END SUB

' ---- the sprites, made once (PSET, then GET); the title's letters (POINT) -------------------
SUB MakeSprites
  RESTORE Sprites
  FOR n = 0 TO 9
    READ w, h, c
    CLS
    FOR y = 0 TO h - 1
      READ row$
      FOR x = 0 TO w - 1
        IF MID$(row$, x + 1, 1) = "X" THEN PSET (x, y), c
      NEXT
    NEXT
    GET (0, 0)-(w - 1, h - 1), sp(n * SPR)
  NEXT
  CLS
  DRAWTEXT 0, 0, "INVADERS", 15
  ntl = 0: tw = 0: th = 0
  FOR y = 0 TO 15
    FOR x = 0 TO 63
      IF POINT(x, y) THEN
        tx(ntl) = x: ty(ntl) = y: ntl = ntl + 1
        IF x + 1 > tw THEN tw = x + 1
        IF y + 1 > th THEN th = y + 1
      END IF
    NEXT
  NEXT
  CLS
END SUB
