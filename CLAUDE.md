# CLAUDE.md: ScoreKept

Read this file first, every session. Then read `docs/SPEC.md` before touching features, and `docs/LESSONS.md` before touching layout, storage, audio, or iOS behavior.

## What this is

ScoreKept (working name; formerly "Dugout Scorebook" and "ScoreKeep") is a softball scorebook web app for iPhone and iPad. It is installed to the Home Screen from Safari, works with no signal, needs no account, and keeps all data on the device. It is hosted for free on GitHub Pages.

The owner is Steve. He is not a coder; this is vibe coding. He describes what he wants and how it should feel; you handle the code, tests, and GitHub. He manages a men's/coed rec softball team (the Diamond Dogs) in Fort Collins, Colorado, and scores games on an iPhone 16 in the dugout.

This is a **rebuild from scratch**. A first version reached about 180 automated tests and roughly 100 releases before the repo was lost. `docs/SPEC.md` describes that version in full. The goal is to reach the same feature set with a cleaner foundation, then continue with `docs/BACKLOG.md`.

## Files in this repo's docs

| File | What it holds |
| --- | --- |
| `docs/SPEC.md` | Every feature, rule, screen, and data field of the first version |
| `docs/BUILD_PLAN.md` | The phase-by-phase rebuild order, with what "done" means for each phase |
| `docs/BACKLOG.md` | Work that was decided or proposed but never built, plus open questions for Steve |
| `docs/LESSONS.md` | Bugs, iOS quirks, and process mistakes from the first build. Do not repeat them |
| `docs/ORGAN_TUNES.md` | Music research: public-domain sheet music and classical pieces for the Organ, with picks, moments, and skips |
| `docs/IPHONE_CAPABILITIES.md` | What an iPhone web app can and can't use, mapped to ScoreKept, with upgrade and feature ideas |
| `docs/FORT_COLLINS_RULES.md` | The city rulebook Steve supplied, the source for the built-in rule sets |
| `docs/PARITY.md` | Phase 10's section-by-section check of SPEC against the rebuild, and what only Steve can check |
| `docs/HANDWRITING.md` | Steve's guide to the next handwriting sheets, what the font build does with them, and personal touches he can make himself |

Keep all of these current. When a backlog item ships, move it into SPEC. When you learn a new lesson, add it to LESSONS.

## How to work with Steve

- **One session, one repo, this file.** There is no separate "overseer" bot anymore. The house style below is the whole rulebook, and you may suggest changes to it, but ask Steve before editing the House style section.
- **Work on `main`.** Pull before starting and before pushing. Use a short-lived scratch branch only when Steve wants to approve something before it goes live (he has done this for welcome-screen polish). Delete it after merging.
- **Push only after tests pass:** `npm test && git push`. Never chain a push that can run after a failing test.
- **Every push that changes the app:** bump `APP_VERSION` (format `YYYY.MM.DD-N`), update `README.md`, Help, and What's New in the same commit. Retake README screenshots if those screens changed.
- **Ask first** before anything hard to undo: deleting a feature or files, changing how saved data is stored, adding anything paid, or adding a third-party service.
- **Batch work.** Steve prefers fewer, bigger batches to save tokens. When he sends a list, build it all, then report once.
- **Mockups first for big visual changes.** For a new look (scoreboard, logos, a redesign), publish a mockup page and let him pick before building. For small fixes, just build.
- **End every batch with a short report:** what changed, the commit hash and version, test results (both browsers), any new saved-data keys, what's left, and one line saying **what a teammate would notice on game day** (say "nothing" when that's the truth).
- **Explain GitHub in plain words.** This is Steve's first GitHub project. Mention the branch, commit, and whether it's live. Say "close the app fully and reopen it" after updates.
- **Read his markups for intent.** When Steve draws on a screenshot, build what it communicates, cleanly, in the app's style; don't copy his exact strokes, and change only the part he asks about (LESSONS 85).
- **Photoshop files carry the version.** Name each .psd `ScoreKept-<Screen>-<appearance>-<APP_VERSION>.psd` (for example `ScoreKept-Game-light-2026.11.13-13.psd`), so Steve can tell them apart in Downloads.
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
- **iPhone and iPad only.** Safari/WebKit is the engine that matters. No Android-specific work. Use iPhone patterns, never Material ones (no floating + buttons, snackbars, or ripple effects).
- **Follow the device:** light or Dark Mode, text size (Dynamic Type), Reduce Motion, Increase Contrast, Reduce Transparency, and VoiceOver. **No in-app appearance or text-size switches.**
- **Every tappable control is at least 44 x 44 points.** When a control grows to 44, check the cell or column it sits in too.
- **Text sizes are never in px.** Use `calc(N * var(--u))`, where `--u` scales with `-apple-system-body`. A test enforces this. Canvas pictures may use px.
- **No pinch-zoom** (Steve, Nov 2026: "the screen is what it is"). Text size still follows Dynamic Type, and iOS's own Zoom (Settings, Accessibility) still works. Every screen still works from 260 points wide to 520 (Display Zoom, iPad Split View, the largest text). Wide tables scroll inside their own box. Grids use `minmax(min(Npx, 100%), 1fr)`.
- **No bounce on a screen that fits.** A screen whose content fits on one screen doesn't scroll or rubber-band (`html.fits`, LESSONS 5); longer screens scroll as usual.
- **Safe areas:** nothing important under the notch, Dynamic Island, or Home indicator.
- **The Game screen fits an iPhone 16 Home Screen app (393 x 759 usable) with no scrolling and at least 12 points to spare**, in both appearances, with and without the count and clock.

### Look
- **Light appearance is "scorebook by day":** cream paper with faint ruled lines, navy ink, section labels in navy underlined in red, buttons with a thicker bottom edge, a floating glass tab bar. **Dark Mode is "scoreboard by night."** Both keep the app's own navy, red, gold, and cream; dark is never just gray.
- **Contrast:** 7:1 for normal text and 4.5:1 for large or bold, in **both appearances** (Steve, Nov 13: "always more visible"; sunlight at the field). A test checks every screen.
- **Text is never smaller than 12 points** (`calc(12 * var(--u))`), and anything read during a game aims bigger. A test enforces the floor.
- **Never color alone** (Steve, Nov 13: color blindness). Anything color means also shows in shape, fill, or words: outs are outlined and reaching base is filled, the out pitch carries an Out tag, runs get a solid diamond, spray-chart hits and outs differ in shape. Check new screens in a red-green color-blindness simulation.
- **All colors are named tokens** in one light set and one dark set at the top of the stylesheet. Never hard-code a color in a rule. Things that look the same in real life in both modes (the field scoreboard, the green field) live in a fixed set used by both. Canvas and SVG picture colors live in one named `PICTURE` set in code.
- **The app's theme is fixed** (navy, ballpark red, gold, cream). Team colors appear only where they mean "your team": the team badge, the score stripe, team logo pins.
- **Type comes from the subject.** Titles in Alfa Slab One, title case ("ScoreKept", never all caps), with a jersey-style shadow that has a thin gap between letter and shadow. Scoreboard numbers in a scoreboard face. **Handwriting appears only in the Book**, only for things a scorekeeper would write by hand. (The Game tab's little at-bat boxes, an exception for a while, were removed at Steve's call, Nov 13.) No trendy geometric or monospace "app" fonts.
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
- **Title case** for buttons, tabs, screen titles, and every Settings row (switches included, like "Extra Innings When Tied"). Explanations under rows stay sentence case. Mode names are **Dugout Mode** and **Scorekeeper Mode**.
- **No em dashes. No emoji**, except an icon-only button named once (Settings ⚙️) and plain symbols: ✕ ✓ ☰ ✎ ♪ ★.
- Dates and times on screen come from `toLocaleDateString` / `toLocaleTimeString` ("Sat, Oct 17", "6:30 PM"); add the year only when it isn't this year. File names keep `YYYY-MM-DD`. Polls say "at", not "@". Subject words win over Apple's ("vs" in schedules; "We're Home").
- Button names in **bold** in docs; tips go in `> **Tip:**` callouts.
- Delete actions are quiet plain-text buttons that keep a 44-point target and need a confirm tap.
- **No AI-generated content in the app.** Every line is fixed text written in advance; recaps and play-by-play come from what was scored.
- Commit messages: `Area: what changed`. No prefixes, no trailing period, no emoji.
- What's New is written in the voice of a ballpark PA announcer or scorekeeper, not a changelog. No exclamation-point pileups.
