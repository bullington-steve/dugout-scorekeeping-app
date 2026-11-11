# ScoreKept

A softball scorebook for iPhone and iPad. ScoreKept installs to your Home Screen from Safari, works with no signal, needs no account, and keeps your season on your own device.

*ScoreKept is a working name. This is a rebuild of a first version; see [the rebuild plan](docs/BUILD_PLAN.md).*

**Open it:** https://bullington-steve.github.io/dugout-scorekeeping-app/

## Where the rebuild stands

| Phase | What it brings | Status |
| --- | --- | --- |
| 0. Foundation | Installs to the Home Screen, follows your iPhone’s light appearance, Dark Mode, and text size, automatic tests in Safari’s engine and Chrome’s | Done |
| 1. Scoring engine and stats | Every play, rule, and stat, checked against a simulated scorekeeper | Done |
| 2. Storage, backup, import | Saving that can’t lose your season, backups, and importing first-version backups | Done |
| 3. App shell and the Game tab | The tab bar and scoring a whole game on your iPhone | Done |
| 4. Teams, players, New Game | Editing your team, the full lineup builder, seasons and the schedule | Done |
| 5. Book, Stats, Scout | The scorebook in your handwriting, every stat, spray charts, scouting | Next |
| 6–9 | The Defense card, sound and walk-ups, offline and first launch, sharing and Discord | |
| 10. Parity check | Every feature of the first version back, then new ideas from the backlog | |

The Game tab is back: score a whole game on your iPhone, in Dugout Mode or Scorekeeper Mode, with or without balls and strikes and hit location. The Book, Stats, Scout, and Team tabs return in the next phases.

<p>
  <img src="docs/screenshots/game-light.png" alt="The Game tab in the light appearance: the field scoreboard, the green and red scoring buttons, and the tab bar" width="300">
  <img src="docs/screenshots/game-dark.png" alt="The Game tab in Dark Mode" width="300">
</p>

## Setting up your team

1. On the **Team** tab, tap **Edit Team** for your name, short name, and colors (or pick from **Big League Colors**).
2. Tap **+ Add Player** for each player: name, number, up to three positions, which side they bat from, and a photo if you like. Reserves go under **+ Add Reserve**, with a phone number for the **Text** button.
3. Add the season’s games with **+ Add a Game**. The next one shows as **Up Next** on the Game tab.

## Scoring a game

1. On the Game tab, tap **New Game** (or **Start This Game** under Up Next). Check **Who’s Here**, build the batting order by tapping players (drag **☰** to reorder, or try **Auto-Fill**, **Same as Last Game**, or **Suggest Order**), then fill in **Game Details**.
2. At the coin toss, tap **We’re Visitors (Bat First)** or **We’re Home (Bat Second)**. The clock starts.
3. Tap the green buttons when a batter reaches and the red ones when a batter’s out. With **Hit Location** on, tap where the ball went, then **Save** (or **Skip**).
4. Tap a lit base to move a runner: **Advance**, **Scored on the Play**, **Out**, or **Courtesy Runner**.
5. When the game ends, tap **Save to Season**, then **Back Up Now**.

> **Tip:** **Undo** takes back the last tap. The gear during a game opens **Game Settings**: switch modes, turn the count or hit location on or off, switch home and away between innings, or **End Game Now**.

## Bring your season over from the old app

1. In the old ScoreKept, save a backup (Settings, Backup & Restore, **Save Backup**) to Files or iCloud Drive.
2. In this app, open **Settings**, then **Backup & Restore**, then **Restore from Backup**, and pick that file.
3. Check the summary, then tap **Restore This Backup**.

## Add it to your Home Screen

1. Open the link above in **Safari** on your iPhone.
2. Tap **≡** in the address bar, then **Share**. (Older iPhones: tap **Share** at the bottom.)
3. Scroll down and tap **Add to Home Screen**. Tap **View More** if you don’t see it.
4. Leave **Open as Web App** on, then tap **Add**.

> **Tip:** After an update, close the app fully (swipe up from the bottom and swipe ScoreKept away), then open it again. The version number at the bottom of the page shows which version you have.

> **Tip:** The Home Screen app keeps its own data. Deleting the Home Screen icon deletes that data, so always back up first once backups arrive in Phase 2.

## For whoever works on the code

Read [CLAUDE.md](CLAUDE.md) first, then the files in [docs](docs).

- `src/engine`: the scoring engine (a game is a list of events, replayed into state)
- `src/stats`: stats as pure functions of saved events
- `src/store`: saving (with quarantine and migrations), backups, song files, and importing first-version backups
- `src/ui`: screens; `src/styles/tokens.css` holds every color
- `src/audio`: the ballpark organ
- `tests/unit` (Vitest), `tests/e2e` (Playwright, Chromium and WebKit), `tests/helpers` (shared contrast, 44-point tap, zoom, and fit checks)
- `tests/sim/hand-scorer.ts`: the hand scorer, an independent scorekeeper that plays random seasons; the engine and stats must match its sheet exactly
- `tools/`: the icon renderer (`npm run icons` turns `tools/icon.svg` into the Home Screen icons)

```bash
npm ci
```

```bash
npm test
```

`npm test` runs the type check, unit tests, a build, and the browser tests. Every push to `main` runs the same tests on GitHub in Chromium and WebKit, and the app is published to GitHub Pages only when all of them pass.

## Credits

- Alfa Slab One by The Alfa Slab One Project Authors (SIL Open Font License 1.1), self-hosted in `src/assets/fonts`.
- The Book’s handwriting is Steve’s own, made with Calligraphr (`steve-hand.woff2`), with Kalam by Indian Type Foundry (SIL Open Font License 1.1) for the few characters it doesn’t have.
