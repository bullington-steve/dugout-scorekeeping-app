# CLAUDE.md: ScoreKept

Read this file first, every session. Then read `docs/MASTER_SPEC.md` (the one spec: house rules for words and numbers, the color tokens, and every feature) before touching features, and `docs/LESSONS.md` before touching layout, storage, audio, or iOS behavior.

## What this is

ScoreKept (working name; formerly "Dugout Scorebook" and "ScoreKeep") is a softball scorebook web app for iPhone and iPad. It is installed to the Home Screen from Safari, works with no signal, needs no account, and keeps all data on the device. It is hosted for free on GitHub Pages.

The owner is Steve. He is not a coder; this is vibe coding. He describes what he wants and how it should feel; you handle the code, tests, and GitHub. He manages a men's/coed rec softball team (the Diamond Dogs) in Fort Collins, Colorado, and scores games on an iPhone 16 in the dugout.

This is a **rebuild from scratch**. A first version reached about 180 automated tests and roughly 100 releases before the repo was lost. `docs/MASTER_SPEC.md` (Part 5) describes that version in full. The goal is to reach the same feature set with a cleaner foundation, then continue with `docs/BACKLOG.md`.

## Files in this repo's docs

| File | What it holds |
| --- | --- |
| `docs/BUILD_PLAN.md` | The phase-by-phase rebuild order, with what "done" means for each phase |
| `docs/BACKLOG.md` | Work that was decided or proposed but never built, plus open questions for Steve |
| `docs/LESSONS.md` | Bugs, iOS quirks, and process mistakes from the first build. Do not repeat them |
| `docs/ORGAN_TUNES.md` | Music research: public-domain sheet music and classical pieces for the Organ, with picks, moments, and skips |
| `docs/IPHONE_CAPABILITIES.md` | What an iPhone web app can and can't use, mapped to ScoreKept, with upgrade and feature ideas |
| `docs/FORT_COLLINS_RULES.md` | The city rulebook Steve supplied, the source for the built-in rule sets |
| `docs/BETA_PLAN.md` | The beta gates: what has to be true before testers, who does each part, and the dugout simulator's coverage |
| `docs/PARITY.md` | Phase 10's section-by-section check of SPEC against the rebuild, and what only Steve can check |
| `docs/HANDWRITING.md` | Steve's guide to the next handwriting sheets, what the font build does with them, and personal touches he can make himself |
| `docs/MASTER_SPEC.md` | **The single source of truth** (Steve, Nov 15): house rules for words and numbers, the color tokens, the Master Spec items with status, and every feature, rule, screen, and data field (Part 5, formerly `docs/SPEC.md`) |

Keep all of these current. When a backlog item ships, move it into MASTER_SPEC (Part 5). When you learn a new lesson, add it to LESSONS.

## How to work with Steve

- **One session, one repo, this file.** There is no separate "overseer" bot anymore. The house style below is the whole rulebook, and you may suggest changes to it, but ask Steve before editing the House style section.
- **Work on `main`.** Pull before starting and before pushing. Use a short-lived scratch branch only when Steve wants to approve something before it goes live (he has done this for welcome-screen polish). Delete it after merging.
- **Push only after tests pass:** `npm test && git push`. Never chain a push that can run after a failing test.
- **Every push that changes the app:** bump `APP_VERSION` (format `YYYY.MM.DD-N`), update `README.md`, Help, and What's New in the same commit. Retake README screenshots if those screens changed.
- **Conflicts stop the build** (Steve, Nov 15). When a new instruction conflicts with this file, MASTER_SPEC, or an earlier instruction, stop and list each conflict in one line with your suggested choice, and wait for Steve's answer before building that part. Parts with no conflict can go ahead. Record every decision in **Decisions** at the end of this file, with the date, so later sessions don't undo it.
- **Ask first** before anything hard to undo: deleting a feature or files, changing how saved data is stored, adding anything paid, or adding a third-party service.
- **Batch work.** Steve prefers fewer, bigger batches to save tokens. When he sends a list, build it all, then report once.
- **Mockups first for big visual changes.** For a new look (scoreboard, logos, a redesign), publish a mockup page and let him pick before building. For small fixes, just build.
- **End every batch with a short report:** what changed, the commit hash and version, test results (both browsers), any new saved-data keys, what's left, and one line saying **what a teammate would notice on game day** (say "nothing" when that's the truth).
- **Explain GitHub in plain words.** This is Steve's first GitHub project. Mention the branch, commit, and whether it's live. Say "close the app fully and reopen it" after updates.
- **Read his markups for intent.** When Steve draws on a screenshot, build what it communicates, cleanly, in the app's style; don't copy his exact strokes, and change only the part he asks about (LESSONS 85).
- **Photoshop files carry the version.** Name each .psd `ScoreKept-<Screen>-<appearance>-<APP_VERSION>.psd` (for example `ScoreKept-Game-light-2026.11.13-13.psd`), so Steve can tell them apart in Downloads. Make them with `tools/psd/` (its README); the exporters stop if anything on screen isn't on a layer.
- **He tests on a real iPhone 16 (393 x 852 points), usually in Dark Mode.** He cannot test Android or a Raspberry Pi. Your tests run in headless browsers, so say plainly when something can only be confirmed on his iPhone.

## Tech approach for the rebuild

Confirmed with Steve and built (Phases 0–10):

- **Vite + vanilla TypeScript, no UI framework.** ES modules under `src/`. GitHub Actions builds and deploys to Pages.
- **The scoring engine is a pure module** (`src/engine/`): a game is a list of events; state is computed by replaying them. No DOM in the engine. Undo, play editing, home/away switching, and every stat depend on this.
- **Stats are pure functions of saved events**, so any new stat covers old games automatically.
- **Storage layer** (`src/store/`) with a `schemaVersion`, migrations, quarantine of unreadable data, and a backup format that can also **import the first version's backup files** (`scorekept-backup-YYYY-MM-DD.json`). Steve's real season lives in one of those.
- **Tests:** unit tests for the engine and stats (Vitest), and Playwright end-to-end tests in **Chromium and WebKit** on every push. The season simulator ("hand scorer") from the first build must come back early.
- **PWA:** web app manifest, service worker with offline cache, Home Screen icon set.
- Fonts and sounds are self-hosted in the repo so everything works offline.

## House style

These rules applied to the first build and still apply.

### Platform
- **Match Apple's own apps** (Steve, Nov 15): navigation, sheets, scrolling, and controls follow how Apple's apps behave on the latest released iOS (26/27). When Apple's apps differ, pick the pattern of the apps most like ScoreKept and record the choice in Decisions. Steve tests on iOS developer betas, so confirm anything odd on a released iOS before changing code for it.
- **iOS draws system pieces; ScoreKept draws the page** (Steve, Nov 16). Menus, pickers, the share sheet, confirmation dialogs, date and time pickers, and the keyboard are the iPhone's own, never restyled. Everything on the page (boards, the scorebook, cards, buttons, labels) is ScoreKept's. The Book's ink menu and game menu are native menus. Use the real iOS piece only where the web gives a clean one (menus, pickers, share sheet, keyboard); a web app's native alert shows the site's address, so elsewhere our sheets follow Apple's layout: the destructive action in red, Cancel separate and bold, and two-tap Delete stays.
- **iPhone and iPad only.** Safari/WebKit is the engine that matters. No Android-specific work. Use iPhone patterns, never Material ones (no floating + buttons, snackbars, or ripple effects).
- **Follow the device:** light or Dark Mode, text size (Dynamic Type), Reduce Motion, Increase Contrast, Reduce Transparency, and VoiceOver. **No in-app appearance or text-size switches.**
- **Every tappable control is at least 44 x 44 points.** When a control grows to 44, check the cell or column it sits in too.
- **Sizing follows Apple's numbers** (Steve, Nov 15): tap targets 44 points minimum (the drawn shape can be smaller, like a 36-point circle in a 44-point target); body and field text 17 points, scaled with Dynamic Type; labels 13–15; fields and ordinary buttons 44–50 tall; 16–20 point side margins; spacing in multiples of 8. Sheets keep the first build's rule: the red ✕ beside the title (44 points) closes them, and tapping outside never does. A sheet that saves as you go has the ✕ alone, no bottom Done bar; a sheet that confirms changes has Cancel and Done in the top bar instead of the ✕. In forms: fields and menus 44–48 tall with 17-point text, labels 13–15 points sitting 4–8 above their field, about 16 between fields and 24 before a new section; short related fields share a row (Team Name and Short Name, about 70/30); no sub-header that repeats the sheet's title; color pickers show every color at once in a grid, never a swipe row. Use extra space for more content or a grid, never for bigger controls. Measure screenshots in points, not pixels (LESSONS 112).
- **Text sizes are never in px.** Use `calc(N * var(--u))`, where `--u` scales with `-apple-system-body`. A test enforces this. Canvas pictures may use px.
- **No pinch-zoom** (Steve, Nov 2026: "the screen is what it is"). Text size still follows Dynamic Type, and iOS's own Zoom (Settings, Accessibility) still works. Every screen still works from 260 points wide to 520 (Display Zoom, iPad Split View, the largest text). Wide tables scroll inside their own box. Grids use `minmax(min(Npx, 100%), 1fr)`.
- **No bounce on a screen that fits.** A screen whose content fits on one screen doesn't scroll or rubber-band (`html.fits`, LESSONS 5); longer screens scroll as usual.
- **Safe areas:** nothing important under the notch, Dynamic Island, or Home indicator. The status bar is iOS's own (`default` style, Nov 14): the app starts below the clock, not under it.
- **The Game screen fits an iPhone 16 Home Screen app (393 x 759 usable) with no scrolling and at least 12 points to spare**, in both appearances, with and without the count and clock.

### Look
- **Light appearance is "scorebook by day":** cream paper with faint ruled lines, navy ink, section labels in navy underlined in red, buttons with a thicker bottom edge, a floating glass tab bar. **Dark Mode is "scoreboard by night."** Both keep the app's own navy, red, gold, and cream; dark is never just gray.
- **Contrast:** 7:1 for normal text and 4.5:1 for large or bold, in **both appearances** (Steve, Nov 13: "always more visible"; sunlight at the field). A test checks every screen.
- **Text is never smaller than 12 points** (`calc(12 * var(--u))`), and anything read during a game aims bigger. A test enforces the floor.
- **Never color alone** (Steve, Nov 13: color blindness). Anything color means also shows in shape, fill, or words: reaching base is a solid green key and outs are cream outlined in red pen (the button system, Nov 15), the out pitch carries an Out tag, runs get a solid diamond, spray-chart hits and outs differ in shape. Check new screens in a red-green color-blindness simulation.
- **All colors are named tokens** in one light set and one dark set at the top of the stylesheet. Never hard-code a color in a rule. Things that look the same in real life in both modes (the field scoreboard, the green field) live in a fixed set used by both. Canvas and SVG picture colors live in one named `PICTURE` set in code.
- **The app's theme is fixed** (navy, ballpark red, gold, cream). Team colors appear only where they mean "your team": the team badge and team logo pins (the board's team-color stripe came off Nov 15; the lit at-bat lamp marks who's batting).
- **The Master Spec palette (Steve, Nov 14) is locked:** the `--sk-*` tokens at the top of `src/styles/tokens.css` (greens deep / primary / surface / action / muted; cream canvas and ruled; button chalk; metal utility and lip; base white; light housing and lenses; navy anchor; gold runner; LED amber and unlit; clay out and tint; ink light, muted green, and dark). Every other color token points at one of these. Where a spec color is under 7:1 as text, a text shade sits beside it (`--sk-gold-ink`, `--sk-clay-ink`, `--sk-ink-muted-text`) and the spec value stays for frames and fills. Dark Mode keeps its own set for paper and ink; the scoreboard looks the same in both, and the cream keys turn dark slate (the button system, Nov 15).
- **Tab identities** (Steve, Nov 16): every tab shares one visual language but has its own physical object. **Game:** the stadium (scoreboard and keypad). **Book:** the paper scorebook. **Stats:** the back of a baseball card. **Scout:** a coach's clipboard with spray charts. **Team:** a roster card or the clubhouse wall. Shared on every tab: color jobs (navy = structure, cream = paper, green = boards, gold = now and runners, red = outs and alerts), the athletic face for every label, bulb digits only for live numbers, handwriting only for what a scorer writes by hand; one button system (four roles), no new button styles on any tab; every board uses the same frame and line tokens.
- **One principle: "nothing the real object doesn't have."** The scoreboard is the one detailed piece (bulbs, lamps, and its painted-sign frame; no rivets since Nov 16). Controls are clean and matte, with crisp borders.
- **The button system** (Steve, Nov 15). Every button looks like it belongs to a scorebook. Two shapes, four roles, one press:
  - **Shapes, as tokens:** `--sk-radius-control` (10 points) for every rectangular button, field, menu, row, and card; `--sk-radius-pill` (fully round) for badges (OUT, WALK, runner tags), switches, icon buttons (✕, ♪), and swatches. Drawn real objects (the scoreboard, bases, Book marks, the player) keep their own shapes. No one-off radii.
  - **Roles:** (a) **Hits / reaches** (1B, 2B, 3B, HR, BB, E, FC): solid dugout green, cream words, a bottom lip. (b) **Outs** (K, ꓘ, GO, F, L, P, FBO, IF, SF, DP, TP, HRO): cream paper with one red-pen border and red-ink words, a lip; no inner ring, no tint. (c) **Count** (Ball, Strike, Foul): cream, thin navy border, navy words, a lip; the OUT and WALK pills say how a pitch ends. (d) **Tools** (Undo, Lineups, Defense, Share, and every other secondary action): cream, a 1-point navy line, navy words (Undo, Lineups, and Defense about 17 points, not growing with the scoring keys), no lip; no gray anywhere. The one primary action on a sheet is solid navy (gold in Dark Mode) with a lip. Role tokens: `--role-paper`, `--role-navy-line`, `--role-navy-ink`, `--role-red-line`, `--role-red-ink`, `--role-dim-ink`.
  - **Press:** a lipped key drops 2 points into its lip and the lip goes flat; a tool darkens. Reduce Motion: no movement, a slightly darker color. Nothing that isn't pressable gets a lip, shadow, or 3D edge.
  - **Dimmed:** the same key in the same spot, solid, at 40%, `aria-disabled`, with the reason in `aria-description` ("Sac Fly, dimmed: needs a runner on third with fewer than two outs"). No dashed outlines, no hidden keys. Increase Contrast: thicker borders, and a dimmed key becomes a muted fill (`--role-dim-fill`) with no visible border or lip and `--role-dim-ink` words, so it never looks like a tool or any other role (Steve has Increase Contrast on, Nov 15).
  - **Dark Mode:** green stays green; red ink turns lighter red; cream turns dark slate with light words. Contrast stays 7:1 in both appearances.
  - **Sheets:** a sheet that confirms changes has Cancel at the top left and Done at the top right in place of the ✕; a question with a list of answers (an iPhone alert) keeps its answers and Cancel in the body.
  - **Tests:** every key has one role and one of the two radii, tools have no lip and the rest do, nothing is dashed, a lipped key moves 2 points on press and doesn't with Reduce Motion, dimmed keys keep their place, contrast and 44-point taps pass, and the Game screen still fits 393 x 759 with 12 points to spare.
- **Four fonts, each from a real object (Master Spec §4):** (1) Alfa Slab One for the ScoreKept wordmark, title case, with the jersey shadow; (2) the athletic condensed face (Barlow Condensed) for every live control, button, label, and tab; (3) the bulb digits for the scoreboard's numbers; (4) Steve's handwriting, only in the Book, only for what a scorekeeper writes by hand. The iPhone's own font stays for long reading (Help, Settings explanations). No trendy geometric or monospace "app" fonts. Screen and sheet titles, buttons, and labels are all in the athletic face (done Nov 14–15).
- **Icons:** one set, one stroke weight (`--icon-stroke`), drawn from the subject's own things (a diamond, a bat, a book). No generic tech symbols (lightning bolts, sparkles, rockets) in the interface. That rule is for interface icons only; a team crest may be a bolt. Another company's mark (Discord) may appear unchanged where it names that service.
- **Glass** is allowed only on the tab bar or a toolbar, iPhone-style, and must turn solid with Increase Contrast or Reduce Transparency, with labels readable over anything scrolling behind.
- **Drawn art:**
  - **Real objects** (scoreboard bulbs, rubber bases, metal frames, stitching, leather, metal pins) are drawn like high-definition versions of the real thing, from photo references: real light, depth, and wear, nothing the real object doesn't have. No plastic sheen, glow on everything, or grunge filters. Numbers on them still pass contrast. Depth comes from shapes and a few gradients, not stacked blur and shadow filters; animate only cheap properties. References are for looking, never tracing; a photo goes in only if Steve took it or it's CC0.
  - **Logos, crests, badges** stay flat, from one real craft (the team logos are enamel pins): two to four flat colors, solid outlines, few points, readable at 24 points in both appearances, and checked against real pro and college marks.
- **Steve's reference apps** for arrangement only (never their look): Burger King, McDonald's, Walmart, PlayStation, Apple Music, MLB, Fulham, Sunday Sluggers. What he likes: content edge to edge, a minimal floating five-icon tab bar, header pill buttons, a lot packed in with clear grouping. He declined Apple Sports as a reference. Design decisions come from apps he knows and likes and from Apple Design Award winners.

### Words
- Follow the **Apple Style Guide**. Specifically:
  - "iPhone" and "iPad", never "phone" or "the iPhone". "Home Screen", "Dark Mode", "light appearance" (never "Light Mode"), "Settings".
  - Tap (not "tap on"), touch and hold (not "long press"), swipe, turn on/turn off (never enable/disable/toggle), dimmed (not disabled or grayed out).
  - No "please", "we recommend", "e.g.", "etc.", or "via".
  - Curly quotes and apostrophes in visible text, serial commas, en dashes for scores and ranges (13–7). Spell out one through nine in sentences; numerals for scores, stats, times, and money.
- **Title case** for buttons, tabs, screen titles, and every Settings row (switches included, like "Extra Innings When Tied"). Explanations under rows stay sentence case. Mode names are **Dugout Mode** and **Scorekeeper Mode**. **Caps on the board, Title Case on the keys** (Steve, Nov 15): what's painted on the green scoreboard and its banner displays in caps (through CSS; VoiceOver reads Title Case); every key below it is Title Case, with play codes uppercase. **Jersey numbers always carry #; batting spots never do** ("3.", "#9"). Details in MASTER_SPEC Part 0.
- **No em dashes. No emoji**, except an icon-only button named once (Settings ⚙️) and plain symbols: ✕ ✓ ☰ ✎ ♪ ★.
- Dates and times on screen come from `toLocaleDateString` / `toLocaleTimeString` ("Sat, Oct 17", "6:30 PM"); add the year only when it isn't this year. File names keep `YYYY-MM-DD`. Polls say "at", not "@". Subject words win over Apple's ("vs" in schedules; "We're Home").
- Button names in **bold** in docs; tips go in `> **Tip:**` callouts.
- Delete actions are quiet plain-text buttons that keep a 44-point target and need a confirm tap.
- **No AI-generated content in the app.** Every line is fixed text written in advance; recaps and play-by-play come from what was scored.
- Commit messages: `Area: what changed`. No prefixes, no trailing period, no emoji.
- What's New is written in the voice of a ballpark PA announcer or scorekeeper, not a changelog. No exclamation-point pileups.

## Decisions

Newest first. One line each, with the date and where the detail lives. Later sessions follow these unless Steve changes one; a change gets its own new line.

- **Nov 16 (Book board edge to edge):** on iPhone the Book's scoreboard runs edge to edge like the Game board, inset painted frame all around. The stadium lights stay removed and confirmations stay ScoreKept's sheets (earlier Nov 16 calls), unless Steve says otherwise.
- **Nov 16 (board frame):** every board (Game, Book, the Team mini board) has the painted-sign frame: a full-cream 3-point stripe (`--sk-board-frame`) inset 4 points inside the green edge, full-cream 2-point dividers (`--sk-board-rule`) meeting it in T- and L-joints, square corners, the same in both appearances; the grey metal frame and all rivets are gone; the homer and walk-off flash stays. The Book's AT BAT row keeps AT BAT, BALL, STRIKE, and OUT on one row, and H and E get their own row when they can't fit. Confirmations stay ScoreKept's sheets and two-tap Delete (a web app's native alert shows the site's address).
- **Nov 16 (Book answers):** color jobs are "gold = now and runners; red = outs and alerts" (house style, tab identities); the team switcher reads "Visitors · RAT" / "Home · DOGS"; the game menu stays the iPhone's own, its closed field has a thin navy border (red only in the LIVE badge), and entries drop the weekday ("Nov 15 vs Poudre River Rats · Live"); iOS draws system pieces and ScoreKept draws the page (house style, Platform). Both boards get the painted-sign frame (3-point cream frame, 2-point cream dividers, no rivets), mockup first.
- **Nov 16 (Book handoff):** tab identities added to house style; the Book's header is the large title with Share and pencil icons (Ink is the iPhone's own menu), the game picker has the athletic face and a red LIVE badge, the stadium lights (and night-game lights) are gone, + is a plate in the inning row, the count lights share one 16-point size on both boards, and the scorecard opens on the current inning with 72-point rows and names that shrink to fit one line (MASTER_SPEC, Book screen). Held for Steve: the boards' frame (neither has a cream frame today), the color-jobs wording, and the team switcher's caps (BACKLOG).
- **Nov 16 (tab bar, cream glass):** replaces the navy glass: cream glass at 78% with a blur, a 1.5-point navy outline, a soft shadow, the pill shape, navy icons and labels, the current tab in a navy capsule with gold; Dark Mode is dark glass with cream icons, a cream outline at 35%, and the capsule gets that outline too; solid with a 2-point outline under Increase Contrast or Reduce Transparency; labels stay 14 points and 7:1 (Steve's answers to the mockup's four questions; MASTER_SPEC §18).
- **Nov 16 (sheet-music excerpts):** every tune is a clean 4- or 8-bar phrase ending on the home chord, melody only; the stretch is Take Me Out (the chorus straight in, no verse pickup, about 36 s; Steve, Nov 16 later: "just get to the song") in the middle of the inning two before the last scheduled one, never twice, with a Stretch button in the Organ; an HR Out plays "Over the Fence Is Out!" in place of the home run cue; Tiger Rag's 1932 words never appear; PDFs stay out of the repo (ORGAN_TUNES, Excerpts).
- **Nov 16 (Pixabay sounds no):** the 14 Stadium Sounds from Steve's soundboard stay out of ScoreKept for good, so there's no Pixabay credit. Any new recorded sound needs a known, shareable source (CC0, or Steve's own recording), recorded in the repo. (Replaces the Nov 15 "on hold" line.)
- **Nov 16 (About, glass, Rare Plays):** Settings has About (version, credits for the fonts, music, and weather, and Privacy); the tab bar was navy frosted glass (replaced by cream glass the same day, below); the Rare Plays checklist stays printed, and its ✓ and the date and park are written in by hand only once a play happens.
- **Nov 16 (play-by-play):** each run said once: homers name their size (two-run, three-run, grand slam), scorers share one sentence, and the RBI is named only when it isn't the batter's.
- **Nov 16 (Book):** anything handwritten in the Book is in Steve's handwriting: names, jersey numbers, positions and moves, sub notes, play codes, totals, the signature, and the times; printed parts (order numbers, column heads, the board) stay printed.
- **Nov 15 (tab bar):** the tab bar stays visible at all times, like App Store, Games, News, Books, and TV on iOS 26/27; it never collapses, hides, moves, or resizes on scroll (replaces the Nov 13 pick that tucked it into a circle and mini scorebug, now removed with their code, styles, and tests). Every screen's last row scrolls fully above it. One tap from any tab to any other.
- **Nov 15 (platform):** match Apple's current apps on the latest released iOS; Steve's developer-beta oddities get confirmed on a released iOS before code changes.
- **Nov 15 (game fixes):** no sound at all for a ball, strike, or foul that doesn't end the at-bat, and the walk-up plays once per new batter; the board keeps its shape when the visitors bat; Last Play is one size, still or sliding (the sliding size Steve liked).
- **Nov 15 (refinements):** a dimmed key looks like its own role faded, and with Increase Contrast a muted fill with no border, never like a tool (a test checks both); tools are about 17 points with a 1-point line; the wordmark's shadow is one solid offset with no paper gap; the inning arrow has a stem (one size up); the walk-up button stays 44 points (it already was).
- **Nov 15 (board notes):** no team-color stripe beside either team's name on the board (the lit at-bat lamp marks the batting team); the walk-up button uses the Organ's music icon at the header icons' size; one stat line under the batter (SEASON before the first trip, TODAY after), so the name, number, and position get bigger; the inning's top/bottom arrow is drawn in LED bulbs inside the inning housing.
- **Nov 15 (button system):** Steve's six calls: outs are cream with a red-pen border (replaces pick E's pale clay); tool keys have no lip (house style updated); contrast stays 7:1 in both appearances; cream keys turn dark slate in Dark Mode (replaces "keys the same in both"); plays that can't happen are the same key dimmed at 40% (replaces the Nov 14 chalk-outline slots); sheets that confirm changes put Cancel and Done in the top bar instead of the ✕. Details in House style, the button system.

- **Nov 15:** Sheets close with the red ✕ beside the title (44 points); tapping outside never closes one. A sheet that saves as you go has the ✕ alone, with no bottom Done bar (done app-wide in 2026.11.15-6). Sheets that confirm changes keep Cancel and Done, in the top bar since the button system. (Edit Team tried a top-right Done in -4; Steve's merged spec brought the ✕ back in -5.)
- **Nov 15:** Sizing follows Apple's numbers (Platform, above); short related fields share a row; color pickers are a grid showing every color, never a swipe row.
- **Nov 15:** Sounds play through Silent once a sound actually plays; the speaker button is the one mute, and the first sound pauses other apps' music (MASTER_SPEC §13).
- **Nov 15:** Stadium Sounds are on hold until Steve confirms where each came from. Pixabay sounds may play inside the app with a credit line ("Sounds from Pixabay") and are never offered as downloads; CC0 is fine anywhere; untraceable ones get replaced (BACKLOG).
- **Nov 15:** MASTER_SPEC is the single source of truth (SPEC merged into it word for word).
- **Nov 15:** Steve's handwriting font stays in the Book, never removed.
- **Nov 15:** Night colors come only from the iPhone's Dark Mode (`prefers-color-scheme`); no in-app switch.
- **Nov 15:** The Defense inning grid stays the main view; a field diagram is only an extra view.
- **Nov 15:** Baseball and App Store features (Bullpen, Throws, steal threats, pitch counter, haptics) wait for "Later".
- **Nov 15:** The splash is a static image, no power-on animation.
- **Nov 15:** Caps on the board, Title Case on the keys below it; jersey numbers carry #, batting spots don't (MASTER_SPEC Part 0).
- **Nov 14:** The Master Spec palette (`--sk-*` tokens) is locked; text shades sit beside spec colors that are under 7:1.
- **Nov 14:** The status bar is iOS's own (`default`); the app starts below the clock.
- **Nov 13:** Scoring keys: reaching base is dark turf, outs are pale clay inside a chalk line (Steve's pick E); never color alone. (Outs changed to cream with a red-pen border, Nov 15.)
- **Nov 13:** Contrast 7:1 for normal text and 4.5:1 for large or bold, in both appearances.
- **Nov 12:** No pinch-zoom; Dynamic Type and iOS Zoom still work.
