# Rebuild plan

Goal: reach the first version's feature set (docs/SPEC.md) on a cleaner foundation, then continue with docs/BACKLOG.md. Each phase ends live on GitHub Pages with tests passing in Chromium and WebKit, a version bump, README and What's New updated, and a short report to Steve with the game-day line.

Build in this order. Don't start a phase until the one before it is green. **Steve's decision (Nov 2026): rebuild everything to parity before any new backlog feature** (triple play is the one exception, built in Phase 1). Keep scouting, the whiteboard picture, and the depth chart; the Python lessons stay out. Steve's priorities, in his words: **bulletproof first** (never lose data, works at the field), then display and ease of use, then features.

## Before Phase 0 (Steve)

1. **Save a backup from the old app now.** The old ScoreKept on his iPhone Home Screen still works offline from its cached copy even if the old site is gone. Open it, go to Settings → Backup & Restore → Save Backup, and save `scorekept-backup-YYYY-MM-DD.json` to Files or iCloud Drive. **Don't delete the old icon** until the new app has imported that file.
2. Create the new GitHub account and an empty **public** repo (suggested name `scorekept`, or `dugout-scorebook`). Public is needed for free GitHub Pages.
3. Connect GitHub to Claude and attach the repo to the session.
4. Gather the assets the first build used, into a `reference/` folder or straight into chat:
   - His Calligraphr handwriting fonts. Received Nov 2026: the marker version ("Steve25_110_110-Regular.ttf"), which Steve chose for all handwriting; it's in `src/assets/fonts/steve-hand.woff2`.
   - The intro crowd cheer from Pixabay (the original 33-second file).
   - Sheet music: the B-flat anthem lead sheet, the Funiculì sheet (8notes), the 1812 letter sheet.
   - Discord's brand kit symbol SVG (white).
   - Screenshots of the old app if he has them, and his reference-app screenshots.
   - The backup file from step 1 (for the importer and as real test data).

## Phase 0: Foundation

- Confirm the tech approach in CLAUDE.md with Steve (Vite + TypeScript, no framework).
- Scaffold: `src/engine`, `src/stats`, `src/store`, `src/ui`, `src/audio`, `public/` (icons, fonts, sounds), `tests/unit`, `tests/e2e`, `tools/`.
- GitHub Actions: install, unit tests, Playwright in **Chromium and WebKit** (cache the browsers; pin the runner image; see LESSONS 36), build, deploy to Pages. Push only after `npm test` passes locally.
- Stylesheet tokens: one light set, one dark set, `FIELD_BOARD` fixed set, `--u` text unit, `--icon-stroke`. Shared test helpers: contrast checker (4.5/3, both appearances), 44-point tap checker, no-px-font-size check, zoom widths 260/520, the 393 x 759 fit check with 12-point headroom.
- `APP_VERSION`, web app manifest, the standard ScoreKept icon (180/192/512).
- Done when: a "Hello, ScoreKept" page is live on Pages, installs to the Home Screen, and both browser jobs pass.
- **Done 2026.11.10.** Live on Pages, both browser jobs pass on every push (runner pinned to ubuntu-24.04; browser tests in Playwright's own image since LESSONS 65). Icon redrawn 2026.11.12-5 (Steve's pick, "Dirt and Chalk").

## Phase 1: Scoring engine and stats (no UI)

- Event model, replay, undo, edit-past-event with re-scoring, home/away switch.
- Every result in SPEC §2, runners and RBI rules, walk-off, Dugout quick events, optional count with all rule options, every rule in SPEC §3 (clock, run rule, HR limits incl. inside-the-park exemption, ties and extra innings, run limit with final-inning rule, tiebreak runner, courtesy runner, mixed walk), and triple play (new).
- Rule sets as data: the four built-ins from FORT_COLLINS_RULES.md, Custom detection, saved sets.
- Stats in SPEC §7 as pure functions, including playing time and fielding by Defense card.
- **The hand scorer:** an independent simulator that plays random seasons and keeps its own sheet; stats must match exactly. Permanent seeds covering every play type, extra innings, and a walk-off. Plant an error to prove it bites.
- Done when: the engine and stats unit suite passes, including 40 random seasons matching.
- **Done 2026.11.11-1.** 40 random seasons match on every run (and a 1,000-season stress run passed); permanent seeds cover every play type, extra innings, and a walk-off; two planted mistakes are caught.

## Phase 2: Storage, backup, import

- `schemaVersion`, migrations, quarantine of unreadable data, loud failed-save banner, `navigator.storage.persist()`.
- Backup and restore (one file, no title passed to share), sound files in IndexedDB and base64 in backups, Discord links excluded.
- **Importer for first-version backups** using Steve's real file. Show him his imported season before moving on.
- Multiple teams in the data model from day one (`teams` list), even before the UI exists.
- Done when: round-trip tests pass (including a 5 MB song), and Steve's real data imports.
- **Built 2026.11.11-1; one check open.** Round trips pass with a 5 MB song; the importer is tested against a made-up first-version backup in the same format. **Open:** importing Steve's real `scorekept-backup-YYYY-MM-DD.json` and showing him his season (he restores it himself in Settings, Backup & Restore; the file never goes in the repo).

## Phase 3: App shell and the Game tab

- Tab bar (Game, Book, Stats, Scout, Team), four automatic layouts, sheets that close only with ✕/Cancel/Done, Settings skeleton, version row.
- Game tab: field scoreboard (SPEC §5, latest design with full names), scoring pad with situation-aware dimming, runners from the bases, Undo/Lineups/Defense strip under the pad, Dugout Mode quick buttons, hit location (field first, Skip, Fielder Buttons, zone list, visible positions only, fence clamping), Final banner, Saved to Season panel, live-region announcements.
- Scoped no-bounce, keyboard-close nudge, `touch-action: manipulation`, Show Where Taps Land.
- Done when: a whole game can be scored on an iPhone 16, the fit test passes in both appearances with count and clock on and off, and Steve confirms taps on his phone.
- **Built 2026.11.11-1; one check open.** Whole games are scored in WebKit at 393 × 759 with the fit test passing in both appearances, count and clock on and off. **Open:** Steve confirming taps land right on his iPhone 16 (Show Where Taps Land helps).

## Phase 4: Teams, players, New Game

- Team tab, Edit Team (colors, 18-color palette with peek and hint, Big League Colors), roster, player editor and all player fields, photos.
- New Game flow: team confirm, Who's Here, Lineup builder (drag ☰ with real touch, groups, Auto-Fill, Same as Last Game, Suggest Order with order check, + New Player, add back, position locking), Game Details (opponent and short name, park dropdown, rule set, opponent order rows, pregame checklist), coin toss start.
- Game Settings (everything editable mid-game), Lineups (subs, bench).
- Seasons and schedule, Up Next card.
- Done when: Steve can set up the Diamond Dogs and run a real game night start to finish.
- **Built 2026.11.11-4; one check open.** Every step is covered by browser tests in both browsers. **Open:** Steve running a real (or practice) game night start to finish, which is also Phase 10's first ask.

## Phase 5: Book, Stats, Scout

- Book board, scorebook grid in Steve's handwriting font (thickened, self-hosted woff2, Kalam fallback), pencil/pen/highlighter inks and non-color run mark, ball lines, Edit Play from boxes and play-by-play, truncated play-by-play, scorekeeper footer (signature, Complete Book, Rare Plays).
- Stats sub-tabs, player card, spray charts with draggable dots and game context, Lineups history, Innings, All Teams lifetime.
- Scout.
- Done when: every table matches the hand scorer in the UI test and contrast passes in both appearances.
- **Done 2026.11.11-6.** Seasons 12 and 28 match cell for cell in Chromium and WebKit; Book, Stats (every section and table), Scout, Edit Play, and the player card pass contrast, 44-point taps, and words in both appearances, with no sideways scroll at 260, 393, and 520 points.

## Phase 6: Defense and team tools

- Defense card (swap, carry forward, pins, Auto-Rotate with bench rules, plan innings, Reset, whiteboard picture), depth chart, dues, reserves with Text, multiple-teams UI.
- **Done 2026.11.11-8.** Auto-Rotate's fairness, pins, bench order, limited mobility, played innings, and short-handed games are unit tested; the Defense card, whiteboard, depth chart, and dues pass contrast, 44-point taps, and words in both appearances in Chromium and WebKit, with no sideways scroll at 260 and 393 points. Reserves with Text and Switch Team and Add Team came in Phase 4. The sample season's Defense card now comes from Auto-Rotate.

## Phase 7: Sound

- Organ engine (voices, echo), crowd layer, sound director with queue and fades, game sounds and situations, packs and per-moment picker, walk-ups (built-in, library, files with trims, auto-play default on, birthday), between-innings music, Organ pad (album-style), PA Announcer and Umpire Calls, `tools/render-sounds.js` and the listen-only `/sounds/` page.
- Tunes: rebuild from sheet music where Steve supplies it; note each tune's source in code and README.
- **Done 2026.11.12-2** (after Phase 8, at Steve's call): the organ engine (three voices, three echoes, drums, crowd; notes scheduled in small batches ahead), 31 tunes in `src/sound/tunes.ts` with sources (Take Me Out to the Ball Game, The Base Ball Polka, and Tally One for Me from Steve's sheets), eight original walk-ups, game sounds, the director (play sound, then walk-up, then situation; fades on the next play or Undo), four packs and a tune per moment, walk-ups from the library or a song file with Start At, Play For, and Volume, birthdays, between-innings music and the seventh-inning stretch, the album-style Organ pad, ♪ Walk-Up on the board, the speaker button, PA Announcer and Umpire Calls, and `sounds.html`, a listen-only page that plays everything live (instead of pre-rendered MP3s, so it never goes stale). Not yet: The Star-Spangled Banner, Funiculì, Funiculà, and the 1812 finale (waiting on readable sheets), and the Sounds and Walk-Ups tour.

## Phase 8: First launch, help, and safety nets

- Service worker (offline, 4-second fallback, cache name bump), Add to Home Screen guide (iPhone and iPad steps), intro (PLAY BALL!, bat and cheer, bases rounding, flip numbers, Reduce Motion skip, sideways layout), welcome, setup steps, tours, Help sections, What's New, backup reminders, post-game backup offer, one-time Safari reminder, keep screen awake with the video fallback.
- Sample season (Diamond Dogs, portraits, schedule, some bench innings). **Built early, in 2026.11.11-5** (Steve asked for it); Phase 8 adds the portraits and moves the button to the welcome screen.
- **Done 2026.11.12-1** (Steve skipped Phase 7 for now): the offline copy (service worker, 4-second fallback, cache name from the version and file list), the Offline note, Keep the Screen On (Wake Lock, silent video fallback), the Add to Home Screen guide, the intro with generated bat and cheer sounds (his recordings replace them by file name), the welcome, seven setup steps (Book Ink added), four tours and Settings, Tutorials, the weekly backup reminder, the one-time Safari reminder, the Safety Check on Backup & Restore, Run the Welcome Setup Again, and the welcome after Clear Sample Data. Also the hanging bases (Steve, Nov 12). Not yet: sample portraits (drawn art), the Sounds and Walk-Ups tour (Phase 7).

## Phase 9: Sharing, Discord, lights

- Recap and Scorecard pictures, Share Picture / Share Text, Discord settings with two webhooks and Discord's symbol, Who's In? polls, Post to Discord.
- Light shows (Scorekeeper Mode only), night-game lights from computed Fort Collins sunset, drawn efficiently (one glow per bulb).
- **Done 2026.11.12-3:** `src/share/recap.ts` (pure recap and Discord text), `src/ui/share/pictures.ts` (Recap 1080×1720 and Scorecard canvases in `PICTURE` colors), the Share Recap sheet (Book **Share**, and Saved to Season), `src/share/discord.ts` (device-only links in `scorekept:discord`, Save & Test, real polls with `duration` until game time, picture posts as multipart), the Discord row with the official mark, Who's In? Poll on Up Next (`scorekept:polls` remembers posted ones), and `src/ui/lights.ts` (home run sweep, walk-off flashes, win glow, bases-loaded heartbeat, night games from NOAA sunset at Fort Collins). Not yet: lights pulsing on the organ's beat.

## Phase 10: Parity check, then the backlog

- Walk every section of SPEC.md and tick it off. Largest text, zoom, sideways, VoiceOver-by-roles test, both appearances.
- Ask Steve to score a real or practice game and send notes and screenshots.
- Then start BACKLOG "Next up" in order, batching as Steve prefers.
