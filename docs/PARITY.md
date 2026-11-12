# Parity Check (Phase 10)

Every section of SPEC.md, checked against the rebuild as of 2026.11.12-6. **Built** means it's in the app and covered by tests. **Changed** means it's built differently on purpose, with the reason. **Open** means it isn't done yet; each open item is also in BACKLOG.md.

## The sweep

`tests/e2e/parity.spec.ts` opens every screen (Game, Organ, Defense card, Lineups, Game Settings, Book, Share Recap, all five Stats sections, Scout, Team, Depth Chart, Dues, the player card, Edit Player, the welcome, and all seven setup steps) in Chromium and WebKit, in the light appearance and Dark Mode, at:

| Setting | Size |
| --- | --- |
| iPhone 16 upright | 393 × 759 |
| 150% zoom | 260 wide |
| 75% zoom | 520 wide |
| Sideways | 852 × 393 |
| Largest text (Larger Text at its maximum) | 393 × 759, text at 312% |

On each, it checks that the page never scrolls sideways, every control is at least 44 × 44 points, every control and picture has a name VoiceOver can read, and (upright) contrast and house words. **Result: all pass in both browsers.** It found, and this batch fixes: the ♪ Walk-Up pill, Clear Sample Data, the team name, the Undo / Lineups / Defense strip, the leader names, and the game rows running off the side at the largest text; the setup player row squeezing the name box to 26 points; and a Reduce Motion bug that made every color change lag a frame.

## Section by section

| SPEC section | Status | Notes |
| --- | --- | --- |
| 1. Product | Built | Home Screen web app, no account, data on the device, free on GitHub Pages. |
| 2. Scoring engine | Built | Every result, runners and RBI, count, Dugout Mode quick events, ending games, play editing, triple play. 40 random seasons match the hand scorer every run. |
| 3. Rules and rule sets | Built | Clock, run rule, HR limits, run limit, tiebreak runner, courtesy runner, Mixed League; the four Fort Collins sets and saved sets. |
| 4. New Game flow | Built | Who's Here, the lineup builder (drag, Auto-Fill, Same as Last Game, Suggest Order), Game Details, coin toss. |
| 5. Game tab | Built | The page-10 board, code-over-word pad, hanging bases (Steve, Nov 12), ♪ Walk-Up, Organ and speaker in the header, Undo / Lineups / Defense, Up Next with Who's In? Poll. **Open:** full first and last names on the board (BACKLOG Next up 3). |
| 6. Book tab | Built | The board with stadium lights, the grid in Steve's hand (two copies taking turns), AB R H RBI, Edit Play, play-by-play, footer, Rare Plays, ink choice, Share. Half-inning end marks (2026.11.12-12). **Open:** personal touches (Player of the Game, Scorer's Notes). |
| 7. Stats tab | Built | Overview (first-version header and W/L rows), Batting (four tables), Charts, Lineups, Innings (42 of 44), player card. |
| 8. Scout tab | Built | |
| 9. Team tab and players | Built | Roster, reserves with Text, every player field and photo, Defense card with Auto-Rotate and the whiteboard, depth chart, dues, more than one team. **Open:** team logos (BACKLOG). |
| 10. Seasons and schedule | Built | |
| 11. Settings | Built | Every group, row summaries, Discord, Tutorials, Send Feedback (Copy; **Open:** Email It needs Steve's address), Run the Welcome Setup Again, Add to Home Screen. |
| 12. First launch | Built | Home Screen guide, PLAY BALL! intro, welcome, seven setup steps, tours. **Open:** the Sounds and Walk-Ups tour. |
| 13. Sound | Built | Organ, 31 tunes, walk-ups, director, packs, PA and umpire, `sounds.html`. **Changed:** between-innings music plays automatically, and any tune is one tap away on the Organ's Between Innings album, instead of a separate ♪ Music button. `sounds.html` plays live rather than from pre-rendered MP3s. **Open:** Star-Spangled Banner, Funiculì, Funiculà, 1812 finale (need readable sheets). |
| 14. Lights | Built | Home run sweep, walk-off flashes, win glow, bases-loaded heartbeat, night games from Fort Collins sunset, Reduce Motion. **Changed:** the Game board's frame glows rather than its bulbs chasing. **Open:** lights pulsing on the organ's beat. |
| 15. Sharing and Discord | Built | Recap and Scorecard pictures, Share Picture / Text / Copy, Discord links (device only), polls, Post to Discord. |
| 16. Data, backups, offline | Built | Schema and migrations, quarantine, backups with song files, first-version import, works offline, Safety Check, reminders, keep the screen on. |
| 17. Layouts and accessibility | Built | Four layouts, the sweep above, VoiceOver names, live announcements, a whole game scored by roles and names only. **Open:** Steve's real VoiceOver test on his iPhone. |
| 18. Visual design | Built | Tokens for both appearances, navy tab bar with gold pill, Alfa Slab One and Barlow Condensed, the hand only in the Book, the new Home Screen icon. |
| 19. Sample data | Built | Six games, tonight in the fourth, two ahead, Defense cards from Auto-Rotate. **Open:** drawn portraits. |
| 20. Tests | Built | The first build had about 179 tests; the rebuild has 286 unit tests and 145 browser tests, each browser test run in Chromium and WebKit on every push. |

## What only Steve can check

1. **His real season imports** (Phase 2): Settings, Backup & Restore, Restore from Backup, with his `scorekept-backup-YYYY-MM-DD.json`.
2. **Taps land right** on his iPhone 16 (Phase 3): Show Where Taps Land helps.
3. **A real or practice game night**, start to finish (Phase 4 and Phase 10), with notes and screenshots.
4. **VoiceOver** for about ten minutes, before any claim about blind scorekeepers.
5. **Sound on the iPhone:** the organ, the PA voice (an Enhanced voice helps), and the intro's bat and cheer.
6. **Offline:** close the app, turn on Airplane Mode, and open it.

When those come back, Phase 10 is done, and the work moves to BACKLOG's Next up and Back burner, in his order.
