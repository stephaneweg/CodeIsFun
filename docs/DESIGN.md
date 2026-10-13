# Code is Fun — design direction

The direction the web versions of Turtle Quest and Circuits follow (written by a UX review at the start of the port).

## Visual direction

Onyx's warm, physical look, without the desktop chrome: flat surfaces, cards with a 1px warm border and a soft
shadow, rounder corners, filled pill buttons. The boards are drawn on a `<canvas>` as in Onyx and never change with
the theme. The tokens are in `shared/site.css` (`:root`): cream background, teal accent (`#2F7F93`), gold stars,
purple lessons, green chips for the turtle's words, lilac chips for the blocks; system fonts, a monospaced font for
code. Dark theme: the chrome only; the boards and the code editor stay light.

## Layouts

| | Turtle Quest | Circuits |
|---|---|---|
| Desktop (≥ 1100 px) | levels · program · level card + board + message | levels · card + palette + board + message · bench (truth table, gate count, Step / Reset / Check) |
| Tablet (700–1099 px) | levels in a drawer; the card over two columns: program · board | levels in a drawer; middle · bench (under 900 px the bench goes under the board) |
| Phone (< 700 px) | levels in a bottom sheet; card (2 lines, *More*), tabs **Program / Board**, a sticky bottom bar (Run, Step, Stop/Reset, speed). Run and Step switch to the board; an error offers *Show the line* | levels in a bottom sheet; card, a sticky palette, the board fitted to the width, the message, the truth table (36 px rows); Step / Reset / Check in a bottom bar. Landscape: board and bench side by side; a one-time tip suggests turning the phone |

## Touch and keyboard

- Targets ≥ 44 px (chips 36 px with 8 px between them).
- Circuits: tap a gate in the palette, then tap the board (a ghost follows the finger); a pin is caught within
  22 px of a finger; tap a gate or a wire to select it, then the trash; a right click deletes at once with a mouse.
  The board takes the touches (`touch-action: none`): the page scrolls only outside it.
- Keys (F5, F7 and F1 belong to the browser): Ctrl/Cmd+Enter Run / Check, F8 Step, F9 Reset, Esc Stop / cancel,
  Shift+F8 back to live (Circuits), H the hint, L the lesson, 1–6 a gate, Del, Ctrl+Z / Ctrl+Y, the arrows move the
  selected gate.

## Language

An FR | EN toggle in the header, kept in the browser (the browser's language at first; `?lang=fr` forces it). In
Turtle Quest a program is written in English or in French (or both) whatever the toggle: it only changes the
interface's words.

## Accessibility

Focus rings (`:focus-visible`), `aria-label` on the icon buttons, `aria-pressed` on toggles, the message bar is a
live region (errors `role=alert`), lessons and results are `<dialog>`s (Esc closes them), locked levels are marked,
the stars carry text, the boards have a summary label; `prefers-reduced-motion` starts the turtle at full speed and
removes the drawer's slide.
