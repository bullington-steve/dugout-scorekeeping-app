# ScoreKept

A softball scorebook for iPhone and iPad. ScoreKept installs to your Home Screen from Safari, works with no signal, needs no account, and keeps your season on your own device.

*ScoreKept is a working name. This is a rebuild of a first version; see [the rebuild plan](docs/BUILD_PLAN.md).*

**Open it:** https://bullington-steve.github.io/dugout-scorekeeping-app/

## Where the rebuild stands

| Phase | What it brings | Status |
| --- | --- | --- |
| 0. Foundation | Installs to the Home Screen, follows your iPhone’s light appearance, Dark Mode, and text size, automatic tests in Safari’s engine and Chrome’s | Done |
| 1. Scoring engine and stats | Every play, rule, and stat, checked against a simulated scorekeeper | Done |
| 2. Storage, backup, import | Saving that can’t lose your season, backups, and importing first-version backups | Next |
| 3–9 | The Game, Book, Stats, Scout, and Team tabs, sound, sharing, and the rest of the first version | |
| 10. Parity check | Every feature of the first version back, then new ideas from the backlog | |

Right now the app is a single welcome page. The scoring engine and stats are built and tested behind it; you’ll see them when the Game tab returns in Phase 3.

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
- `src/store`: saving, backups, and importing first-version backups
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
