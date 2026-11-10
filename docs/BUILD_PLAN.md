# Rebuild plan

Goal: reach the first version's feature set (docs/SPEC.md) on a cleaner foundation, then continue with docs/BACKLOG.md. Each phase ends live on GitHub Pages with tests passing in Chromium and WebKit, a version bump, README and What's New updated, and a short report to Steve with the game-day line.

Build in this order. Don't start a phase until the one before it is green. Steve's priorities, in his words: **bulletproof first** (never lose data, works at the field), then display and ease of use, then features.

## Before Phase 0 (Steve)

1. **Save a backup from the old app now.** The old ScoreKept on his iPhone Home Screen still works offline from its cached copy even if the old site is gone. Open it, go to Settings → Backup & Restore → Save Backup, and save `scorekept-backup-YYYY-MM-DD.json` to Files or iCloud Drive. **Don't delete the old icon** until the new app has imported that file.
2. Create the new GitHub account and an empty **public** repo (suggested name `scorekept`, or `dugout-scorebook`). Public is needed for free GitHub Pages.
3. Connect GitHub to Claude and attach the repo to the session.
4. Gather the assets the first build used, into a `reference/` folder or straight into chat:
   - His Calligraphr handwriting fonts (the pen version "Steve30" is the chosen one; the marker version "Steve25_110_110-Regular.ttf" is the alternate).
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

## Phase 1: Scoring engine and stats (no UI)

- Event model, replay, undo, edit-past-event with re-scoring, home/away switch.
- Every result in SPEC §2, runners and RBI rules, walk-off, Dugout quick events, optional count with all rule options, every rule in SPEC §3 (clock, run rule, HR limits incl. inside-the-park exemption, ties and extra innings, run limit with final-inning rule, tiebreak runner, courtesy runner, mixed walk), and triple play (new).
- Rule sets as data: the four built-ins from FORT_COLLINS_RULES.md, Custom detection, saved sets.
- Stats in SPEC §7 as pure functions, including playing time and fielding by Defense card.
- **The hand scorer:** an independent simulator that plays random seasons and keeps its own sheet; stats must match exactly. Permanent seeds covering every play type, extra innings, and a walk-off. Plant an error to prove it bites.
- Done when: the engine and stats unit suite passes, including 40 random seasons matching.

## Phase 2: Storage, backup, import

- `schemaVersion`, migrations, quarantine of unreadable data, loud failed-save banner, `navigator.storage.persist()`.
- Backup and restore (one file, no title passed to share), sound files in IndexedDB and base64 in backups, Discord links excluded.
- **Importer for first-version backups** using Steve's real file. Show him his imported season before moving on.
- Multiple teams in the data model from day one (`teams` list), even before the UI exists.
- Done when: round-trip tests pass (including a 5 MB song), and Steve's real data imports.

## Phase 3: App shell and the Game tab

- Tab bar (Game, Book, Stats, Scout, Team), four automatic layouts, sheets that close only with ✕/Cancel/Done, Settings skeleton, version row.
- Game tab: field scoreboard (SPEC §5, latest design with full names), scoring pad with situation-aware dimming, runners from the bases, Undo/Lineups/Defense strip under the pad, Dugout Mode quick buttons, hit location (field first, Skip, Fielder Buttons, zone list, visible positions only, fence clamping), Final banner, Saved to Season panel, live-region announcements.
- Scoped no-bounce, keyboard-close nudge, `touch-action: manipulation`, Show Where Taps Land.
- Done when: a whole game can be scored on an iPhone 16, the fit test passes in both appearances with count and clock on and off, and Steve confirms taps on his phone.

## Phase 4: Teams, players, New Game

- Team tab, Edit Team (colors, 18-color palette with peek and hint, Big League Colors), roster, player editor and all player fields, photos.
- New Game flow: team confirm, Who's Here, Lineup builder (drag ☰ with real touch, groups, Auto-Fill, Same as Last Game, Suggest Order with order check, + New Player, add back, position locking), Game Details (opponent and short name, park dropdown, rule set, opponent order rows, pregame checklist), coin toss start.
- Game Settings (everything editable mid-game), Lineups (subs, bench).
- Seasons and schedule, Up Next card.
- Done when: Steve can set up the Diamond Dogs and run a real game night start to finish.

## Phase 5: Book, Stats, Scout

- Book board, scorebook grid in Steve's handwriting font (thickened, self-hosted woff2, Kalam fallback), pencil/pen/highlighter inks and non-color run mark, ball lines, Edit Play from boxes and play-by-play, truncated play-by-play, scorekeeper footer (signature, Complete Book, Rare Plays).
- Stats sub-tabs, player card, spray charts with draggable dots and game context, Lineups history, Innings, All Teams lifetime.
- Scout.
- Done when: every table matches the hand scorer in the UI test and contrast passes in both appearances.

## Phase 6: Defense and team tools

- Defense card (swap, carry forward, pins, Auto-Rotate with bench rules, plan innings, Reset, whiteboard picture), depth chart, dues, reserves with Text, multiple-teams UI.

## Phase 7: Sound

- Organ engine (voices, echo), crowd layer, sound director with queue and fades, game sounds and situations, packs and per-moment picker, walk-ups (built-in, library, files with trims, auto-play default on, birthday), between-innings music, Organ pad (album-style), PA Announcer and Umpire Calls, `tools/render-sounds.js` and the listen-only `/sounds/` page.
- Tunes: rebuild from sheet music where Steve supplies it; note each tune's source in code and README.

## Phase 8: First launch, help, and safety nets

- Service worker (offline, 4-second fallback, cache name bump), Add to Home Screen guide (iPhone and iPad steps), intro (PLAY BALL!, bat and cheer, bases rounding, flip numbers, Reduce Motion skip, sideways layout), welcome, setup steps, tours, Help sections, What's New, backup reminders, post-game backup offer, one-time Safari reminder, keep screen awake with the video fallback.
- Sample season (Diamond Dogs, portraits, schedule, some bench innings).

## Phase 9: Sharing, Discord, lights

- Recap and Scorecard pictures, Share Picture / Share Text, Discord settings with two webhooks and Discord's symbol, Who's In? polls, Post to Discord.
- Light shows (Scorekeeper Mode only), night-game lights from computed Fort Collins sunset, drawn efficiently (one glow per bulb).

## Phase 10: Parity check, then the backlog

- Walk every section of SPEC.md and tick it off. Largest text, zoom, sideways, VoiceOver-by-roles test, both appearances.
- Ask Steve to score a real or practice game and send notes and screenshots.
- Then start BACKLOG "Next up" in order, batching as Steve prefers.
