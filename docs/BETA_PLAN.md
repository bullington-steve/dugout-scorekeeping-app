# Beta plan

> **No feature freeze, no beta date (Steve, Nov 16).** We build features as we go. Nothing in this plan holds back a new feature; the gates, tester list, invite text, and readiness checks below stay here for whenever Steve picks a date. Still in force: never push on a game day during the season (no limit in the winter off-season), tests pass before every push, and no saved-data change without a migration and a backup test (CLAUDE.md).

What has to be true before ScoreKept goes to testers beyond Steve, who does each part, and where it stands. Started Nov 15, 2026, from the handler's beta review. Keep it current: when a gate closes, mark it and say how it was checked.

## The gates

| Gate | Who | Status |
| --- | --- | --- |
| **Scoring is right through the real buttons** | Claude | **Done.** The dugout simulator taps 16 simulated games into the real app in Chromium and WebKit on every push: Basic Slowpitch and Fort Collins 2+ HR (on a faked clock, so the 55-minute limit, the HR limit, the run rule, and the 3-ball, 2-strike count all run), both modes, hit locations, Undo, and Edit Play. Every score and batting stat must match the hand scorer. |
| **Steve's real fall season imports** from the first version's backup | Steve sent the file; Claude checked | **Done (Nov 15).** `scorekept-backup-2026-10-29.json` holds one game: Oct 28 at Rolland Moore Park #3, 13–23 to MGN, ended by the run rule after the top of the 5th. It imports with no plays refused. A copy with names replaced is a permanent test (`tests/fixtures/v1-backup-real-game.json`). Steve: restore it on your iPhone and check the score and the box look like you remember. |
| **Saved data can't be broken by an update** | Claude | **Done.** Saved data carries `schemaVersion` (now 1). Any future change adds a migration; the app keeps a copy from before migrating and sets aside anything it can't read instead of losing it. Tests: step-by-step migration, a missing migration sets data aside, data from a newer version is left alone, every older schema has a migration, and a frozen copy of schema-1 data (`tests/fixtures/schema-1-saved-data.json`, never regenerated) must still load and replay to 13–23. |
| **Error log with Send Feedback** | Claude | **Done.** Script errors are kept on the iPhone (the last 20, under `scorekept:errors`), and Send Feedback offers **Include Error Log**, on when there's something to include, with the lines shown under **Show the Error Log**. Nothing is sent by the app. |
| **Privacy note** | Claude | **Done.** Settings, **Privacy**, and Help, Privacy: everything stays on the iPhone; the app goes online only for weather (rounded location, Open-Meteo, with permission) and Discord posts Steve sets up. |
| **Known-issues list** | Claude | **Done.** Help, Known Issues. Keep it honest and short; update it when testers report something. |
| **Sample names that don't sound generated** | Claude | **Done (Nov 14).** New rosters with nicknames, a Jr., uneven lengths, and bar-league opponents. |
| **Backup and restore on Steve's iPhone** | **Steve** | Not yet. Save a backup, delete nothing, restore it, and check the season. Then try restoring the old `scorekept-backup-2026-10-29.json`. |
| **Airplane-mode test** | **Steve** | Not yet. Open ScoreKept once with signal, turn on Airplane Mode, close the app fully, reopen it, and score a few plays. |
| **Cold-start test** | **Steve** and a friend | Not yet. Hand the iPhone (or the link) to someone who's never seen it and say nothing. Note where they get stuck. |
| **Feedback email** for an **Email It** button | **Steve** | Not yet. Make the Gmail address; Claude adds the button. |
| **Trademark check** on the name ScoreKept | Steve, with Claude's help | Partly. The handler searched the App Store (Nov 15): no "ScoreKept", but several "ScoreKeep" apps, one in Sports ("ScoreKeep - Social Scoring"). Fine for a free web beta; before any App Store version or real promotion, search tmsearch.uspto.gov. |
| **Stadium Sounds sources** | Steve | **Closed (Nov 16):** the soundboard sounds stay out; no Pixabay credit needed. |
| **Organ status bar** | Claude built; **Steve** confirms | Built in 2026.11.17-4. From the Home Screen, open the Organ: do the clock and battery turn light on green? Close it: are they back to normal? |
| **Sounds through Silent** | Claude built; **Steve** confirms | Built in 2026.11.15-3. Check on the iPhone: Silent on, game sounds on, a play makes its sound, and music in another app pauses. |

## Simulator coverage, and what it still doesn't tap

Covered: every pad key, Ball, Strike, and Foul, the HR sheets (Over the Fence, Inside the Park, Over the Limit), the "tap which runner was out" banner, the runner menus and More Choices, courtesy runners, subs through Lineups, Dugout Mode's quick buttons and End Their Half-Inning Now, Undo, hit locations (the field, the kind of hit, and Fielder Buttons), time running out during and between innings, and Edit Play (fixing a play scored wrong mid-game, and changing a single to a double and back).

Not yet: Mixed League walks (To First, To Second) through the screen, the Defense card changed mid-game, Switch Home and Away, extra innings past one on a tie, and a real game from Steve's notes. Steals and wild pitches stay out on purpose: slowpitch has none.

## After the gates

Pick three to five testers (teammates who score sometimes), send the link with Add to Home Screen steps, and ask for one game each. Read every Send Feedback note; each real problem gets a test before it's fixed (LESSONS).
