# Backlog

Everything decided, proposed, or parked but not built. This is the one running list of outstanding items; BUILD_PLAN.md tracks the phases (all built through Phase 9 as of 2026.11.12-3; Phase 10, the parity check, is next). Update this file as items ship or change.

## Next up (Steve's order, Nov 15, 2026)

After the Game polish (2026.11.15-1), in this order. Mock up visual changes before building.

0. **Before beta:** the gates are in `docs/BETA_PLAN.md`. Claude's are done (Nov 15: Fort Collins rules on a faked clock, hit locations, and Edit Play in the dugout simulator; saved-data version tests; error log; Privacy; Known Issues). Left for Steve: restore the backup on his iPhone, the airplane-mode and cold-start tests, the feedback Gmail, and the trademark check. Simulator next: Mixed League walks, the Defense card mid-game, Switch Home and Away, and real games from Steve's notes.
1. **Confirm Steve's real season imported** (Nov 15: his `scorekept-backup-2026-10-29.json` imports cleanly, one game, 13–23 to MGN, run rule after the top of the 5th; a names-replaced copy is a test; he still checks it on his iPhone) from the first version's backup (`scorekept-backup-YYYY-MM-DD.json`): Restore from Backup on his iPhone, then check the games, stats, and Book against the old app. His data comes first. (Needs the file or a check on his iPhone; the importer and its tests are built.)
2. **Team logos:** upload your own logo, plus the enamel-pin logo set.
3. **Edge-to-edge screens** (Steve's reference apps).
4. **Realistic bases and board** from Steve's reference photos, with the one-glow-per-bulb speed fix.
5. **Setup's first question:** "What are you setting up?"
6. **Spring prep:** ~~Add to Calendar files for the schedule~~ (built 2026.11.24-2), and the remaining rule sets.

Then from the Master Spec, for slowpitch: the spatial Defense field view (a second view of the Defense card, never replacing the inning grid), Lineups with Active and Bench, Scout batter cards (AVG, HR, RBI, spray tendencies), the rules matrix for the league's own rule sets, iPad split view.

## Later: baseball and App Store only

Behind a future baseball (or fastpitch) rule set, not next: Bullpen, Throws handedness, steal threats in Scout, the PITCHES counter, the fastpitch and baseball scoreboard modules, and simulator steals. CS, PO, WP, and PB are already built and already hidden unless a rule set turns stealing or wild-pitch advances on. Core Haptics needs an App Store app (Apple's paid developer program): ask Steve first. The scoreboard power-on splash is dropped (static launch image only).

## Back burner (Steve, Nov 12, 2026: "keep all of those decisions on the back burner")

Questions put to Steve that he parked. Don't build these until he picks one up; mention them only when they bear on the work at hand.

- **Tab icons (answered Nov 12):** the spray chart for Stats is built (2026.11.12-9); the rest stay as they are for now. The ball cap for Team was dropped: it doesn't read as a hat at tab size. When the tab icons get their next pass (Phase 12), stay clear of what other sports apps already use, from Steve's App Store screenshots: Sunday Sluggers (home plate Home, a chart with a magnifier for Stats, two people for Roster, a 2:0 scoreboard for Games, headphones for Press Room, on cream with a green pill); GameChanger (house, calendar, speech bubble, person in a circle); MLB (filled home plate Home, a 3 × 2 grid for Scores, a TV for Watch, a storefront for Shop, a page for News, in a floating pill bar); MiLB (star My Team, magnifier Discover, an R H E grid for Scores, a pennant for Standings, three dots for More). Our Game diamond with bases, open book, spray chart, binoculars, and jersey don't repeat any of them.
- **Pitch count on the board** (FOX's "P: 48"): only once there's a **baseball mode** (Steve, Nov 12). Until then, Balls and Strikes stay off the boards whenever the count isn't kept (already true on the Game board and the Book's board), which is most softball games.
- **The count beside the inning (answered Nov 12):** keep the bulbs. No numerals beside the inning.
- **Today's at-bats as little Book boxes (answered Nov 12: "do this"):** built 2026.11.12-9.
- **Where to use the no sign** (🚫, his drawing): nowhere yet (Steve, Nov 12), "but it might have a place."
- **QR codes at fields (Steve, Nov 12):** leave QR codes at the fields that open the app's page, to find new users and maybe some feedback. Needs: a printable card (the app's name, the icon, one line, the QR code), the address it opens (the GitHub Pages site, or a short page with Add to Home Screen steps), and how feedback comes back (Send Feedback today copies text; Email It needs his address). Ask before printing anything with his name or email on it.
- **Font weight comparison sheet** (today's weight and two heavier), offered when he asked about thin strokes.
- **Funiculì, Funiculà:** a PDF or a free IMSLP edition (the screenshot is too small to read).
- **The Star-Spangled Banner and the 1812 Overture finale:** sheet music again (the first version used his lead sheet and letter sheet; neither is here). Not written from memory: a wrong note in the anthem would be noticed.
- **Gameday data (Steve, Nov 12: "integrating time, weather, location, etc. into our gameday data"):**
  - **Time:** built 2026.11.12-17. The Book footer shows first pitch, final, and the game's length from what was already saved.
  - **Weather at first pitch:** built 2026.11.14-3, turned off 2026.11.14-7 (Steve: useful, find it a place later; the live board is not it). The code and saved data stay. Candidate homes: the Book's game header, the Recap picture, Stats (record in the cold?). Needs signal, so it must hide cleanly offline.
  - **Location (with permission, asked once, never tracked):** the nearest saved park first in Game Details, and the team's home city for the night-game lights so sunset is right outside Fort Collins. No third party. Steve's pick: Now, Later, or Drop.
- **Library of Congress tunes:** candidates and skips are tracked in `docs/ORGAN_TUNES.md`; Steve downloads the PDFs.
- **Sheet music hunt (Steve, Nov 12: "as many as possible recreated from sheet music"):** from memory today and wanted from a sheet: The Irish Washerwoman, William Tell Galop, Cavalry Charge, Hallelujah Chorus, Ode to Joy, Mexican Hat Dance, Happy Birthday to You, Reveille, Toccata in D Minor, Three Blind Mice, Shave and a Haircut, Charge! Partial from a sheet: The Base Ball Polka (intro and first strain so far; Steve's sheet is complete, so the second strain and the Trio on pages 4–5 can come next), Tally One for Me (the chorus; the verse is optional). Whole: Take Me Out to the Ball Game (the chorus; the verse is optional). Public-domain editions only (IMSLP, Mutopia, Levy Sheet Music Collection, Library of Congress); a modern arrangement's melody is fine, its accompaniment isn't. Received Nov 12 and built: Home Run Galop (Read, 1903; its Trio is still on the sheet), Over the Fence Is Out! (Skelly, 1895; the verse is on the sheet too), Funiculì, Funiculà (Denza, 1880; the refrain). Nov 13: The Star-Spangled Banner, the 1812 Overture Finale, Mars, and Rex Tremendae built; Stravinsky's Infernal Dance score received, to read next (full orchestra). Nov 13: The Star-Spangled Banner, the 1812 Overture Finale, Mars, and Rex Tremendae built; Stravinsky's Infernal Dance score received, to read next (full orchestra).
- **Tunes to add (proposed Nov 12, all public domain):** The Star-Spangled Banner (pregame), the 1812 Overture finale (already wanted; Funiculì, Funiculà is built), Sweet Georgia Brown (1925), The Entertainer (Joplin, 1902), Turkey in the Straw, When the Saints Go Marching In, Hava Nagila, La Cucaracha, In the Hall of the Mountain King (Grieg), Entry of the Gladiators (Fučík, 1897), Can-Can (Offenbach), The Stars and Stripes Forever (Sousa, 1896), Pop Goes the Weasel, Flight of the Bumblebee (Rimsky-Korsakov). Each from a sheet Steve finds.
- ~~Organ voices~~: Hammond only since 2026.11.12-15 (Steve).
- **Check from-memory tunes against sheets:** Hallelujah Chorus, William Tell Galop, Toccata, Mexican Hat Dance, The Irish Washerwoman (README lists sources).
- **The rest of The Base Ball Polka** (its trio and second strain) if he'd like the whole piece; and the Tally One for Me verse.
- **Sounds and Walk-Ups tour** (sound is built; the tour isn't yet).
- **Game Replay (Steve, Nov 12):** an animated play-by-play of a whole game on the field drawing: a line out toward where each ball went, a yellow runner appearing at the base reached and moving around as the order goes, outs and runs ticking on a small board, the play-by-play line as a caption; play, pause, step, speed, jump to an inning; Reduce Motion steps without movement. Runs on the iPhone from the saved plays (no server). Dugout Mode halves show as summary cards; plays with no hit location aim at the fielder's usual spot. Plan: a one-inning mockup first, then a Replay button on the Book and Share Recap; saving a clip as video is a separate, later step.
- **Home Screen icon:** replaced in 2026.11.22-1 by the Board Green diamond (MASTER_SPEC, App icon). Earlier: built 2026.11.12-5 from Steve's pick, C "Dirt and Chalk" (mockups: https://claude.ai/artifact/MoUxBTbaLVCweTnRNuSJSF), with his note to put the chalk where it really is: plate 17 in, batter's boxes 3 × 7 ft, 6 in off the plate, centered on its middle, drawn at 9 px per inch so the boxes' inner lines frame the plate. A real-size scorebook (about 10 × 13 in) sits on the plate. "We will tweak it down the line": candidates are a bigger plate, a scuffed back line, and dirt that holds up at 29 points. Rendered by `npm run icons` from `tools/icon.svg`. iOS keeps the icon it saw when the app was added, so the new one shows only after re-adding (back up first).
- **Game Replay reference:** Steve's screenshots include MLB Gameday (a field with the ball's path, the play list, and the box score side by side) as the feel for Game Replay.
- **Leftovers from the phases:** drawn portraits for the sample players (Phase 8); lights pulsing on the organ's beat (Phase 9).
- Still open from before: app name, feedback email, body font options, Add to Calendar, the "Not marked yet" table below.
- **Answered (Nov 12):** the bases hang off the board's bottom edge with depth (built 2026.11.12-1); he wants them photorealistic eventually, which the house style allows for real objects, built from his own photos of a base.

## Next up (Steve decided these; ready to build after parity)

These are now grouped into Phases 11–15 in BUILD_PLAN.md: the look (1, 2, 6, 10, tab icons) in Phase 12, team identity (3, 7, 8) in Phase 13.

1. **Edge-to-edge screens** like Steve's reference apps, with a minimal floating tab bar.
2. **Bigger scoreboards** on Game and Book, filling the full width with bigger bulbs and lettering. The Game screen still fits one iPhone screen with 12 points to spare.
3. **Full names** on the board for the batter, on deck, and due up. The team mostly goes by first names.
4. ~~Base shadows shaped like the bases~~: built 2026.11.12-1 with the hanging bases.
5. ~~Triple play~~: moved into the rebuild (Phase 1), Steve's decision.
6. **Material photos for the ballpark keys (Steve offered, Nov 14):** a close-up of the league's game ball (seam, stitching, leather, and its color, white or optic yellow) for Ball, Strike, and Foul; the aluminum edge of a portable scoreboard or a dugout rail (brushed grain, top highlight, bottom lip) for Undo, Lineups, and Defense; infield clay and a chalk line up close for the out keys; a base's molded tread from the side for the reach keys' strip.
6a. **Realistic real objects:** board frame, bulbs, and rubber bases drawn like high-definition real things from Steve's photo references (he'll send: rubber base side and top, clean and dirty; a lit scoreboard bulb close up; the aluminum edge of a portable board; a chain-stitched patch; an enamel pin tilted to the light). Pair with the glow performance fix (one soft glow per bulb, animate opacity only) and add a speed check to the batch report: does scoring a play still feel instant in WebKit?
7. **Team logos:**
   - Upload your own (Edit Team), shrunk on the device like player photos, saved with the team and in backups.
   - A built-in set of **flat enamel pins** (two to four flat colors: the team's two colors, cream, and a gold metal outline; emblems break past the circle the way die-cut pins do; fine details drop out below 40 points; readable at 24 points in both appearances). Picked from a **Team Logo** dropdown grouped like the walk-up menu, with a small badge beside each name. A **monogram** (team initials) is the default stand-in.
   - The set from the mockups (32): Ballpark (crossed bats, diamond, home plate, star holding a softball, storm cloud with bolt, ace of diamonds, trophy, flaming ball), Animals (dog, bear, owl, hornet, fox, wolf, hawk in flight, bat), Colorado (Horsetooth Rock, elk, bison head-on, trout, pine tree, wagon wheel, cowboy hat, spur, sheriff's star), Sky (sun, moon and stars, ghost), Extras (anchor, grill, gem, initials). Removed for resembling real marks: head-on bull, horseshoe, bolt on a disc, plain outlined star, fierce hawk head. Steve liked the set but called it rudimentary; animals that look good head-on or in profile should be drawn that way.
   - **Placement (Steve decided):** Team tab, the score bug, and the team switcher. **Not on the scoreboard.** Answered by Steve's screenshots (Nov 2026): the **score bug** is the Game tab's board (his first mockup was a FOX-style bug, and FOX puts each team's logo in its panel beside the runs); the **scoreboard** is the Book's hand-hung board. So logos go beside DOGS and the opponent's short name on the Game board, not on the Book's board. Check the fit at 260 points when built.
   - **Sample season renamed with logos:** Diamond Dogs (dog), Oak Hollow Owls, Lakeside Lightning (keeps its name; storm cloud and bolt), Mill Creek Hornets, Westbrook Bison, Pine Ridge Elk, Harbor City Anchors. Extra candidate teams from Steve's name lists: Dirt Dogs, Tailgaters (grill), Pioneers (wagon wheel), Wahoos (cowboy hat), Bombers (flaming ball), Scared Hitless (ghost), Aces of Bases (ace of diamonds), Bat Intentions (bat), Hall of Shamers (trophy), Stampede (spur), Diamond Cutters (gem), Enforcers (sheriff's star). Left off as crude, violent, or unclear: Ball Breakers, Ump Yours, Hitmen, Assassins, Reapers, Bomb Squad, Swingers, Misfits, Prodigies, Game Changers, Intimidators, Untouchables.
   - **Mockups:** `reference/scorebug-and-board-mockups.pdf` pages 12 and 15–18 (the 32 pins by group, the renamed sample teams, the extra candidate teams, and every pin at 24 points in both appearances); page 13 shows Edit Team's Team Logo card (a dropdown grouped Ballpark / Animals / Colorado with a small pin beside each name, and **Use Your Own Picture**).
   - **Score bug:** pages 1–9 of the same PDF are options for a compact score bug, about 110 points tall ("half of today's board plus batter card"). Steve picked page 10, the full board, as the one they went with (built in 2026.11.11-2). His logo placement ("Team tab, score bug, team switcher; not the scoreboard") still needs pinning down when logos are built: ask which spot on the board, if any, he meant by "score bug."
   - **Book handwriting mockups:** `reference/book-handwriting-mockups.pdf` (the Book grid and Scorecard picture in each font, both appearances). Settled: the font already in the repo is the one to use everywhere (Steve, Nov 2026).
8. **"What are you setting up?"** as the first setup question: your team, a pickup game, or a kids' team; then I play, I coach, or both. Answers set the mode and rules (I coach → Dugout Mode; I keep the book → Scorekeeper Mode; kids' team → kid-friendly rules).
9. ~~Leftovers~~: built 2026.11.12-11. The setup color preview is now the board's score row with your stripe and team badge; the iPad's repeated on-deck list was never rebuilt (SPEC §5).
10. **Better use of space** with more grouping (Steve marked this Now).

## Waiting on Steve

- **GroupMe (Steve, Nov 25: check first, then report):** checked Nov 25. GroupMe's bot endpoint (`https://api.groupme.com/v3/bots/post`) answers a browser's CORS check with `access-control-allow-origin: *` on the preflight and the app's own address on the post, so a recap or a Who's In? line could post straight from ScoreKept, with the bot ID kept on the iPhone and never in a backup, like the Discord links. Limits: a bot posts text only (a picture needs a person's own GroupMe access token, which ScoreKept shouldn't hold), and a bot can't make a real GroupMe poll, so Who's In? would be a text line asking for replies. Not built until Steve answers.
- **Share text and picture together (Steve, Nov 25):** conflicts with the earlier call that Share Picture and Share Text stay separate because iOS drops the text when both go to the share sheet together. Suggested: keep them separate. Waiting on Steve.
- **A share point on the player card (Steve, Nov 25):** there isn't one today; what should it share (a picture of the card, or the text line)? Waiting on Steve.

- **Compare Styles for Suggest Order (Steve, Nov 24: "show me first"):** run the game simulator about 2,000 games per style with the players' own season rates and show estimated runs per game ("Spread: about 11.2 runs a game"), with a note on small samples ("early season, rough estimate"). Needs a mockup and Steve's yes before building.

- **Backup proof (Steve, Nov 24):** the Oct 29 file is no longer needed (Steve won't keep that game; it stays in the tests with names replaced). Steve proves backup and restore on his iPhone with a full round trip: save a backup, remove the Home Screen app, add it again, restore. He reports the result.

- **Hand-drawn highlighter (Steve, Nov 24):** the sheet is `docs/sheets/ScoreKept-Highlighter-Sheet.pdf` (HANDWRITING.md, Sheet G). Waiting on Steve's scan. Then: each scribble to a tintable mask (overlap darkness kept as opacity), cropped and scaled to the Book's diamond; one per run, seeded from the play; color from the app's light and Dark Mode values; codes 7:1 over the darkest part and paths 3:1, else lightened or dropped; screenshots (light, dark, Normal, Close-up) before pushing.

- **Test upkeep (no Steve needed):** two WebKit welcome-screen tests have each timed out once under a full run (2026.11.13), then passed on rerun. Find the slow step and give it a sturdier wait before it becomes a habit.

- **Steve's guide for all handwriting sheets: `docs/HANDWRITING.md`** (sheets A–F, how to send them, what the build does). When sheets arrive: merge copies into `calt` alternates (fixed rotation, not random), add whole-word and pair ligatures (tt and ff with one crossbar), set kerning from his free-writing page, keep stroke weight steady, no computer-made wobble. **Steve's method (Nov 2026):** he writes each letter quickly, then doubles over it once or twice to fix thin or thick edges, so stroke weight varies a little by design. Keep his doubled strokes (don't flatten them to one weight); close hairline gaps where two passes don't overlap; normalize only the overall weight so new sheets match the first.
- **Built 2026.11.11-10 from Steve's Nov 11 sheets** (see SPEC §6): his second copy of every letter and digit taking turns (`calt`), pairs, codes, whole words, his drawn symbols, and word spacing. Still open: a **third copy** (Sheet B in HANDWRITING.md) would let letters rotate through three; his third ★, ①–③, and ꓘ are already on disk. His slashed circle is a **no sign** (Ghostbusters style), now 🚫 in the font; no app use yet. "Scored by" isn't on a sheet yet.
- **Handwriting variety:** two copies of every letter already take turns (`calt`, fixed, not random). A third sheet (HANDWRITING.md Sheet B) would let them rotate through three. Phase 14.
- **Whole words in his hand.** Steve will write common Book entries two or three times each on blank paper: codes (1B 2B 3B HR BB K ꓘ 6-3 F8 SF DP TP FC E), phrases ("Scored by", "Rare Plays", "Cycle", "Triple Play"), maybe teammates' names. Trace them with `tools/trace-sheet.py` and add them as ligatures, with alternates between the copies.
- **Book ink:** built 2026.11.11-6 (Pencil, Black Pen, Blue Pen) and picked in setup since 2026.11.12-1. Steve, Nov 24: keep those three, no other colors.
- ~~Half-inning end marks in the Book~~: built 2026.11.12-12 with Steve's own slash, heavy and leaning across the corner of the last box of each finished half-inning (SPEC §6).
- **Personal touches from Steve's scorebooks** (pick with him; all fixed text or what the scorer types, never generated): **Player of the Game** written on the page; a **Scorer's Notes** line ("Windy", "Anderson enters after injury"); a headline line ("Dogs sweep the doubleheader"); weather and temperature; game start, finish, and length; the umpires; subs written under the starter with an arrow and the inning they came in. Several already exist elsewhere (Stars of the Game on the Recap, start time from the clock).
- **Symbols built (2026.11.11-7):** | \\ ✕ × → \* and tally marks, from his strokes (see SPEC §6). A hand-drawn → and \* would still look more natural; anything he draws replaces the built one.
- **Whole-words sheet list (sent to Steve, Nov 2026)** for him to write two or three times each: Scored by, Complete Book, Rare Plays, Player of the Game, Scorer's Notes, Final, Cycle, Triple Play, Double Play, Grand Slam, Walk-Off, Perfect Inning, Inside the Park, Courtesy Runner, Tiebreak, Last Inning, Sub, Weather, Diamond Dogs, vs. Codes and symbols: SAC, LOB, ROE, U (as in 3U), CR, TB, IP, PH, PR, WP, LP, a slash /, a heavy vertical bar |, an arrow →, an ✕, tally marks, a dot •, an asterisk *, and a small 1–3 in a box corner.
- **Redraw @**: the sheet-2 @ came out a little heavy. Low priority; a font do-over could fix it alongside the variety sheets.

- **Pitcher on the scorebug (Steve, Nov 13, back burner):** when pitchers or pitches are tracked, the pitcher's name and pitch count need a spot on the Game board. Waits for pitch tracking.
- **Ideas from Steve's screenshots (Nov 2026):** all answered. The bases hang off the board's bottom edge (built 2026.11.12-1); pitch count waits for a baseball mode, the count stays as bulbs, and the at-bat boxes are built (Back burner, Nov 12).
- **Sheet music received: Funiculì, Funiculà** (L. Denza, 1880, public domain). Steve sent a screenshot of the 8notes.com piano arrangement; that arrangement is copyrighted (© 2014 Red Balloon Technology), so use the melody only, never its accompaniment, and don't put the sheet in the repo. The screenshot is too small to read every note: ask for the PDF, or use a free edition from IMSLP or Mutopia. Build it with the organ in Phase 7 and add it to the tune list.
- **Feedback email** for an **Email It** button in Send Feedback: left off until Steve creates the address (Steve, Nov 24).
- **App name.** "ScoreKept" is a working name; Steve won't settle until he's sure it isn't in use. A Nov 2026 web search found no app named ScoreKept, but several App Store apps are named **ScoreKeep** (one letter off), including "ScoreKeep - Baseball Scoring". The repo is `dugout-scorekeeping-app` until the name is final. Renaming the repo changes the web address, which means back up, delete the Home Screen icon, re-add, restore; rename before real data goes in. Steve, Nov 24: keep ScoreKept for now, pending his trademark search.
- **Body font.** Steve, Nov 24: keep the iPhone's own font for body text; no comparison needed.
- ~~Add to Calendar files~~: built 2026.11.24-2 (MASTER_SPEC).
- **Sheet music** for tunes written from memory. For each: send a sheet, pull it until a sheet arrives, or keep as is: Take Me Out to the Ball Game, Happy Birthday to You, Ode to Joy, Toccata in D Minor, Hallelujah Chorus, William Tell Galop, The Irish Washerwoman, Three Blind Mice, Mexican Hat Dance, Reveille, Cavalry Charge, Shave and a Haircut, Charge!
- **New public-domain tunes** to add (he'll mark and send sheets; free editions from IMSLP, Mutopia, Library of Congress): If You're Happy and You Know It, Head Shoulders Knees and Toes, Sweet Georgia Brown (1925), The Entertainer, The Stars and Stripes Forever, Entry of the Gladiators, In the Hall of the Mountain King, Can-Can, Turkey in the Straw, Camptown Races, When the Saints Go Marching In, Yankee Doodle, Pop Goes the Weasel, Cotton-Eyed Joe (traditional tune only). Also unbuilt for lack of sheets: Home! Sweet Home!, Say Au Revoir But Not Goodbye.
- **Sound files:** CC0 crowd and broken-glass recordings to replace the weakest sounds, plus generic walk-up clips. Steve also wants more variety eventually, possibly copyright-free modern beats.
- **More surprise ideas** that help the team and the scorekeeper. Surprises must be earned in a game (repeatable, about two seconds) or tied to a date (once a season). No hidden taps. Unpicked candidates: Opening Day lights at the first pitch of the season, last-game-of-season lights out with "See You Next Season" on the park sign, comeback surge (taking the lead after trailing by three or more), Fourth of July week bursts, Friday the 13th / Halloween flickering bulb, scorekeeper's card in Stats, milestone games scored on the park sign.
- **His VoiceOver test on iPhone** (about 10 minutes) before any claim about blind scorekeepers.
- **Logo feedback:** which pins work, which need another pass.
- **Reference photos** for the realistic objects (item 6 above).

## Later (Steve marked these)

- **Discord, everything else:** live play-by-play to the game channel (each play one short line, off by default, catches up when the signal returns), plus any other Discord options.
- **Pitcher and fielding scouting** in Scorekeeper Mode (more useful for baseball).

## League calendar feed import (Steve, Nov 25: BACKLOG)

If a league site publishes a calendar feed (.ics or webcal://), ScoreKept could subscribe to it and fill the schedule, which covers "schedule import" without scraping league webpages. Needs the feed's site to allow the app to read it (CORS), or the person downloading the .ics and opening it in ScoreKept. Fort Collins standings for Recreational aren't online; check whether the city's schedules have a feed.

## Steve's Now / Later / Drop (Nov 24)

- **Now, built 2026.11.24-2:** each team remembers its own rule set (schema 4); the README rewrite; Add to Calendar files for the schedule (MASTER_SPEC).
- **Later:** walk-ups by batting spot (a speedy tune for the leadoff hitter, a big one for cleanup); a recorded voice pack for the PA and umpire (may need a paid service, ask first); more rule sets and a baseball-or-softball first question (waits on Steve's rulebooks); Google Drive backup; an App Store version (needs a Mac and $99 a year); schedule import from league webpages; Steve's own organ recordings; polishing each screen per display; milestone celebrations (first hit, 10th RBI); scoring styles (the research below).
- **Drop:** see Decided against.

## Not marked yet (Now / Later / Drop)

| Item | Pro | Con |
| --- | --- | --- |
| iPhone capability ideas (record sounds in the app, voice scoring, video recap, at-bat clips, push reminders, keyboard shortcuts): see `docs/IPHONE_CAPABILITIES.md` section 3 | Uses what iPhone already allows | Each needs Steve's pick |
| Full-screen status bar (`black-translucent`) for edge-to-edge | The paper or scoreboard runs under the clock | iOS draws the clock in white, unreadable on cream: needs a dark strip or a light-appearance rethink in the Phase 12 look pass |

## Parked

- **Apple Music walk-ups:** only if the app ever goes to the App Store ($99 a year developer account, MusicKit keys expire every six months, every batter needs a subscription, needs signal, Apple Music's terms don't cover public play). Owned song files work today.

## Decided against

- **Steve, Nov 24:** lifetime totals on the player card (the Career row covers it); the scorecard-style buttons mockup; live sync between devices (needs a server, which breaks local-only); day and night lighting on the board; a manual screen-layout override in Settings.

- Hidden-tap surprises (tap the name, touch and hold the board). Nobody finds them.
- Apple Sports as a design reference.
- Chicken Dance and Hokey Pokey (still copyrighted).
- The arched "ScoreKept" logo with a swash tail (not natural enough).
- Flattening the scoreboard to cartoon style (real objects stay realistic).
- A printable umpire lineup card (umpires want it handwritten; no printers at the field).
- In-app light/dark or large-text switches (follow the iPhone instead).
- The Python lessons that were part of the first repo (dropped from the rebuild).
- A built-in team chant ("Let's Go Dogs").

- **Stadium Sounds (Nov 16): no.** Steve's call: the 14 soundboard sounds stay out for good. New recorded sounds only from a known, shareable source (CC0 or Steve's own), with the source written down in the repo.
- **Blurry header on Steve's iPhone (Nov 15):** in Steve's Home Screen screenshots the ScoreKept wordmark and the three header icons are blurred and faded; in the headless test browsers they're sharp. It looks like iOS 26's top-edge effect over web apps (not documented for Home Screen web apps; developers report status-bar behavior changing between 26.0 and 26.1). Steve to check: does it show on the other tabs, in a plain Safari tab, and which iOS version (Settings, General, About)? Then try a fix on his iPhone (for example, starting the header a little lower). **Nov 16:** Steve sees it in his screenshots too, on iOS developer beta 27.2. Held under the platform rule: confirm it on a released iOS (26 or 27.1) before changing code.

## Screens pass 1 (Steve, Nov 16)

- **Built (2026.11.17-6):** the four app-wide rules in CLAUDE.md; both team colors on every badge; the Book's grid edge to edge with the Batter column at a third, pitch marks about 10 points, the run ◆ in Help; Edit Team's one color grid, LED preview, and pickers in the athletic face (MASTER_SPEC).
- **Built (2026.11.17-7):** Stats as the back of a baseball card and Team as a roster card, from the approved mockups with Steve's answers (MASTER_SPEC).
- **Built (2026.11.17-8):** Steve's answers: the Book sizes and 3:1 lines, the audit's fixes, the sample strip, first names in the Book with the Book Names setting, and the Game header exception (MASTER_SPEC).
- **Later, with baseball teams:** a baseball team's Book Names defaults to Last (every team today is softball, so all start on First).
- **Waiting on Steve:** Scout and Settings screenshots for the last pass.

## Scoring styles (Steve, Nov 23: research summary; Steve, Nov 24: Later)

Games are saved as events, so a style is just another way of drawing the same game: no saved-data change.

- **Notation dialect** (Settings, Book): fly outs as "F7" or "7"; throws as "6-3" or "63"; a called strikeout as a backward K, or "K" looking with "K2" swinging; positions 1–9 (with 10 for a fourth outfielder or short fielder).
- **Pitch detail:** none, the count only, or the full sequence (called, swinging, and foul strikes apart).
- **Run marks:** highlighter plus ◆ (the default) or the classic filled-in diamond.
- **Another Book view:** a play-by-play log in the Project Scoresheet style, one line per play in order, from the same data.
- **Later, maybe:** draw-to-score input (finger-drawn marks in a box, like Japan's Scorebook app), and a Japanese Waseda-style rendering.
- **Where ScoreKept stands:** GameChanger scores and streams, with fan subscriptions; iScore has deep rule variants (10 fielders, 1–1 counts, EH, DH, and DP-Flex, courtesy runners, the international tiebreaker) and device-to-device sharing. ScoreKept is offline, with no account and no subscription, and has its ballpark identity, the Organ, and the hand-written Book.
- **iScore's rule list** is the checklist for the rule-set presets work below.

## Rule sets as presets (Steve, Nov 23: structure now; no new presets until Steve sends sources)

Rule sets already work as presets: a named bundle of settings (`RuleSet` in `src/engine/rules.ts`), with built-ins (Fort Collins 2+ HR, 1 HR, Recreational, Basic Slowpitch) and the team's own saved ones (**Save as Rule Set**, stored in `data.ruleSets`). New Game picks one; any setting can be changed for that game in New Game or Game Settings. Presets are our own summaries; a built-in's `source` names its rulebook. Never include rulebook text.

**Settings the engine already plays (Nov 23):**
- Innings; a time limit, with the clock from the coin toss, and "an inning that starts with fewer than N minutes left is the last" (`timeLimit`, `runLimitFinalMinutes`).
- The run rule (several "N runs after inning X" steps) and a per-inning run limit, with no limit in the last inning (`runRule`, `runLimit`).
- Home run limits: a differential (+2) or per game, and an over-the-limit homer is an out (HRO) (`hr`).
- The count: balls for a walk, strikes for an out, a 1–1 or 0–0 start, a foul on the last strike as an out, and one courtesy foul (`count`).
- Courtesy runners per inning (`courtesyPerInning`).
- Stealing (SB, CS, PO), wild pitches and passed balls, and out for leaving early (`stealing`, `wildPitchAdvance`, `leftEarlyOut`).
- Extra innings: a number or until decided, ties allowed or not, and the tiebreak runner on second (`extras`, `allowTie`, `tbRunner`).
- Coed: the walk rule (a walk to the man before a woman sends him to second) and lineup ratio checks (`mixed`).
- The batting order: any length, so batting the whole roster works; an EH (extra hitter) is a lineup position.

**Needs engine work before a preset can use it:**
- What happens over the HR limit besides an out: a single, or a dead ball with no penalty.
- A choice of what happens when time runs out: finish the inning, a hard stop, or "no new inning after N minutes" (only the last exists now).
- The number of fielders as a rule (9 or 10, a fourth outfielder, a short fielder): positions 1–12 exist, but nothing checks the count.
- Bunting allowed or not as a setting (today it's only a League Note: "Bunting is an out").
- A link to the official rulebook for each preset (the `source` is text today; a link on saved presets would be a saved-data change with a migration).
- Coed variations beyond the walk rule (alternating batters as a hard rule, women's distance or outfield rules).

## League mode (Steve, Nov 17: audit only, not planned)

A league scorekeeper is neutral: two equal teams, both rosters, both teams' stats, no cheering for either. Today the app is written from one team's point of view. Done toward it: opponents are saved teams with colors (2026.11.17-15), and new code treats home and visitors as equals (CLAUDE.md). Every place that still assumes one side is "us", and what league mode would need:

- **Saved games:** `GameSetup.us` names our side, `lineups` are keyed `us` / `them`, and events carry `team: 'us' | 'them'`; each game lives inside one of our teams (`Team.games`), its opponent a name plus `opponentId`. League mode: games keyed by `home` / `away`, each pointing at a team record, stored by league or season, with "our side" a viewing choice; a schema migration that maps `us` / `them` through `setup.us`.
- **Rosters and players:** only our team has `Player` records; the other side's lineup is typed names ("Batter 1"). League mode: both rosters as players, picked in New Game.
- **Dugout Mode:** keeps the other side's half-innings as totals only. League mode: Scorekeeper Mode for both, or Dugout Mode for neither.
- **Stats:** batting, fielding, spray charts, playing time, leaders, and the record are ours (`scopedBatting(sc)` reads our side; the record is W/L for us). League mode: stats per team and per player for both sides, standings instead of a record.
- **Defense card, depth chart, Who's Here, dues:** ours only. League mode: per team, or left to each team (dues and Rare Plays likely stay team features).
- **Walk-ups and the Organ:** walk-ups exist only for our players; the sound director cheers our runs and our outs' opposite (rally, celebrate, "strikeout" for theirs). League mode: neutral cues, or per-side walk-ups with no rooting.
- **Recaps and Discord:** "Final" from our side, WIN / LOSS / TIE for us, Stars of the Game from our players, "we" in text, polls ask our players. League mode: "Rats 3, Dogs 10" with no result word, stars from both sides, no polls.
- **Scout:** exists to study opponents. League mode: folded into per-team stats.
- **The Book:** pages are "us" and "them": our page links to player cards, shows jersey numbers and positions, and follows Book Names; theirs is plain names. League mode: both pages the same.
- **Game board and pad:** the banner shows our batter's name, number, and position but "Batter 4" for theirs; the walk-up ♪ is ours. League mode: both sides alike once both rosters exist.
- **New Game and the schedule:** our lineup builder, their typed order, the coin toss "We're Home". League mode: pick two teams, both lineups, "Home" / "Visitors".
- **Team tab and Settings:** one team at a time, others as separate teams. League mode: a league view with all teams.

## Organ (Steve, Nov 16)

- **MIDI export:** built 2026.11.24-2 (Settings, Sounds & Walk-Up Songs, Export as MIDI Files; MASTER_SPEC).
- **Organ menus:** back burner until Steve sends his iPod notes (Steve, Nov 24).

- **Built Nov 16 (2026.11.16-14):** the Organ in ScoreKept's own skin, from the approved mockup (MASTER_SPEC).
- **Not now (Steve, Nov 16):** scrubbing, hold to fast-forward, and a Composers menu.
- **Later: playlists.** First "Team Walk-Ups" (the current lineup's walk-ups in batting order); custom playlists later.
- **Later: an Android version of the player** with its own ScoreKept design and name (no Microsoft names or look).
- **A name for the Organ.** It's "Organ" for now; Steve picks a name of its own. Rules (Nov 16): not the word "player" (in ScoreKept a player is a person: player cards, player stats, "each player's walk-up"); no "i" prefix; no real product or brand names (no organ makers like Hammond or Wurlitzer). Candidates: **The Loft** (where a ballpark organist sits; the suggested pick), **Press Box**, **The Booth**, **Calliope** (note: an early build had a Calliope sound choice, now played as the Hammond), **Pocket Organ**. Give the pick a quick USPTO search, like ScoreKept.
