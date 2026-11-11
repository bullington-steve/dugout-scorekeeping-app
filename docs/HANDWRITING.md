# Your Handwriting: How to Make the Next Sheets

The Book is written in your own handwriting. Today it has one copy of every letter, so two of the same letter side by side look stamped ("Bobby", "Scott", "1–1"). Real handwriting never repeats exactly. This guide is what to write, how to write it, and how to send it so the Book looks like a page you filled in at the field.

You do the writing; the build script does the font work. You don't need any font software, and you don't need a paid Calligraphr plan.

> **Tip:** None of this is urgent. Do one sheet whenever you have 20 minutes and a good pen. Each sheet makes the Book look better on its own.

## The Basics (Every Sheet)

- **Use the same pen as your first sheets.** Same pen, same pressure. Your letters can wobble, tilt, and bounce, but the stroke weight should stay the same. That's what keeps it looking like one person wrote it. (The app turns your black ink into graphite pencil, chalk in Dark Mode, or blue or black pen; you always write in black.)
- **Write at your normal speed.** Don't slow down to make it neat. Don't trace over a letter, and don't copy your first sheet. The point is a second and third version that come out a little different, the way they do every time you write.
- **Print, the way you write in a scorebook.** Not cursive. Letters don't need to connect.
- **A mistake? Leave the box empty or redo it on a fresh sheet.** Don't scribble over it.
- **Getting it to me:** in Calligraphr, export the sheet as a font (TTF), and also save a scan or photo of the filled-in sheet. A scanner at 300 dpi or more is best. A phone photo works if the page is flat, evenly lit, and has no shadow. Send both in a chat and say which sheet it is.

## The Sheets, Most Useful First

### Sheet A and Sheet B: Second and Third Copies of Everything

Fill out the same Calligraphr template you used before, **two more times, on two different days.** Lowercase matters most, then numbers, then capitals.

- **Numbers count double.** The Book is mostly numbers: positions (6-3, F8), outs, scores, the inning row. If you only have time for part of a sheet, do 0 through 9, three times.
- Most-used letters after that: e, a, o, r, i, n, s, t, l, and capital K (strikeouts).

### Sheet C: Whole Words and Codes

On a blank page (or a Calligraphr sheet with wide boxes), write each of these **two or three times**, as you'd write them in a book:

- **Words:** Scored by · Complete Book · Rare Plays · Player of the Game · Scorer's Notes · Final · Cycle · Double Play · Triple Play · Grand Slam · Walk-Off · Perfect Inning · Inside the Park · Courtesy Runner · Tiebreak · Last Inning · Sub · Weather · Diamond Dogs · vs
- **Codes:** 1B 2B 3B HR BB K ꓘ (a backwards K) SF DP TP FC E SAC LOB ROE CR TB IP PH PR WP LP 3U
- **Common plays:** 6-3 · 4-3 · 5-3 · 1-3 · F7 · F8 · F9 · L6 · P4 · E6
- **Your teammates' names, if you like.** First names or how you'd write them in the book. (These stay on your device's font only if you want; tell me, since the repo is public.)

### Sheet D: Letter Pairs

Write each pair as one piece, two or three times. In real writing, neighbors change each other's shape.

- th · ch · sh · er · ing · oo · ee · ll · ss · tt · ff
- For **tt** and **ff**, draw **one crossbar across both stems**, the way your hand does it.

### Sheet E: Scorekeeping Marks

These are already built from your strokes, but anything you draw yourself replaces my version and looks more natural. Two or three of each:

- → (arrow) and \* (asterisk): **the two most worth drawing.** My built versions look a little assembled.
- Tally marks: a single mark, and a group of five (four with a slash through)
- The end-of-inning marks: a heavy slash across a corner, and a heavy straight line
- ✕ (out on the bases), ✓, ★, a circle (the kind you'd draw around an out), and an underline swoosh
- A cross-out line (a word struck through), for subs who came out of the game

### Sheet F: A Page of Free Writing

On plain paper with no boxes, write a few sentences the way you naturally would, for example:

- "The quick brown fox jumps over the lazy dog."
- "Diamond Dogs win 13–7 at Rolland Moore Park. Maya doubles in the 6th."
- A few lines of your own: a play you remember, the weather, anything.

I don't cut letters out of this page. I use it to measure **your** natural spacing, how much your letters tilt, and how they ride up and down off the line. That's what makes typed words in the Book sit together like real writing instead of evenly spaced blocks.

## What I Do With What You Send (So You Know What to Expect)

- **Rotate your copies (contextual alternates).** With two or three versions of each letter, the font switches between them so letters side by side never match ("Bobby", "1–1", "Scott"). It's **rules, not random:** a name looks the same every time it appears, the way your own signature stays recognizable.
- **Whole words and pairs (ligatures).** When the Book writes "Double Play" or "th," the font uses the piece you wrote in one go.
- **Rhythm from your own hand.** The bounce off the line and the tilt come from the differences between your copies and from your free-writing page, not from a computer jiggling letters. Stroke weight stays steady.
- **Spacing (kerning).** I tighten awkward gaps, like under T, V, W, and Y and between small lowercase letters, using your free-writing page as the guide.
- **Anything you draw always wins** over a character I built from your strokes.
- I rebuild the font and send you a new alphabet sheet to compare (like `reference/handwriting-alphabet.png`), so you can say "that one's off" before it goes in the app.

A few things from typical font advice that we're skipping, on purpose:

- **Entry and exit strokes at the start and end of words.** These are for connected cursive. Print doesn't need them.
- **Fake texture, ink-bleed filters, or computer-made wobble.** The house style rules them out. Your real pen gives the texture.

## Other Personal Touches You Can Make Yourself

All of these cost you no tokens to make. Only putting them in the app does, and each is a small job once it's ready.

- **Old-app screenshots:** the Book's board, the light shows, the intro, anything with sound. These are the best guide to the "flair."
- **Photos for the drawn objects** (your own photos only): a rubber base (clean and dirty, side and top), a lit scoreboard bulb close up, the aluminum edge of a portable scoreboard, a chain-stitched patch, an enamel pin tilted toward the light.
- **Sheet music** for the organ tunes (Phase 7). See the list in BACKLOG under "Sheet music."
- **Your own recordings:** crowd noise at your field, a bat on a ball, the team cheering. Real recordings beat synthesized ones.
- **Lines in your own voice.** The app never uses AI-written text, so any fixed line has to be written by a person. You could write:
  - PA announcer lines ("Now batting, number 7…"), walk-up intros, and end-of-game calls;
  - short descriptions for each Rare Play;
  - Scout hints in your words;
  - What's New lines, if you like writing them.
- **Logo sketches:** a rough drawing of the Diamond Dogs pin you picture. I'll turn it into the flat enamel-pin style.
- **The original 300-page transcript:** send it as one file. I'll search it per phase instead of reading it all.

## Where It Lives

- Your fonts and traced symbols: `tools/fonts/`
- The build script: `tools/build-hand-font.py` (the comment at the top lists every built character)
- The current alphabet: `reference/handwriting-alphabet.png`
- What's still open: BACKLOG, "Waiting on Steve"
