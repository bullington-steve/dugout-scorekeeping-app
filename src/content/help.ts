/*
 * Help & How to Score. Fixed text written in advance (no generated
 * content). Grows phase by phase; see docs/SPEC.md §11 for the full list.
 */
export interface HelpSection {
  title: string;
  paragraphs: string[];
}

/** Privacy (beta, Nov 15): what stays on the iPhone, and the only two times the app goes online. */
export const PRIVACY: string[] = [
  'Everything you score stays on this iPhone: your team, games, stats, sounds, and settings. There’s no account, no sign-in, no ads, and no tracking. ScoreKept doesn’t collect anything about you or your team.',
  'It goes online for two things, and only when you use them. Weather: once a game is under way, ScoreKept asks your iPhone for its location (you can say no), rounds it to about a kilometer, and asks Open-Meteo for the weather at the field. Discord: when you add a channel link in Settings and post a poll or a recap, that post goes to your channel. The links stay on this iPhone and are never in a backup.',
  'Backups are files you save yourself, in Files or iCloud Drive or wherever you choose. Send Feedback copies your note (and, if you leave it on, the error log) for you to paste; nothing is sent until you send it.',
  'Updates come from the same web address the app was installed from. Deleting ScoreKept from the Home Screen deletes everything it kept.',
];

/** About (Steve, Nov 16): who made what, in plain words. Keep in step with the README's Credits. */
export const CREDITS: { title: string; lines: string[] }[] = [
  {
    title: 'Fonts',
    lines: [
      'Alfa Slab One, by The Alfa Slab One Project Authors (SIL Open Font License 1.1), for the ScoreKept name.',
      'Barlow Condensed, by The Barlow Project Authors (SIL Open Font License 1.1), for buttons, labels, and the scoreboard’s words.',
      'The Book’s handwriting is Steve’s own, with Kalam by Indian Type Foundry (SIL Open Font License 1.1) for the few characters it doesn’t have.',
    ],
  },
  {
    title: 'Music',
    lines: [
      'Out of the box, their strikeouts get Three Strikes and our wins get The National Game finale; Settings, Sounds lets you pick the wah-wah, Victory Fanfare, or anything else for each moment.',
      'The Organ plays public-domain music from the original sheet music (IMSLP, the Library of Congress, the Levy Sheet Music Collection, and OpenScore), traditional ballpark tunes, and originals written for ScoreKept. Each tune names its composer in the Organ.',
    ],
  },
  {
    title: 'Weather',
    lines: ['Weather data by Open-Meteo.com (CC BY 4.0).'],
  },
];

/** Known Issues (beta, Nov 15): what testers might run into, said plainly. Keep current. */
export const KNOWN_ISSUES: string[] = [
  'Your scores live on one iPhone. There’s no syncing between iPhones yet; to move to another one, save a backup and restore it there.',
  'Weather needs a signal and your OK to use location. Without either, the board just shows no weather.',
  'When ScoreKept plays a sound, music playing in another app pauses. Start your music again after the game, or turn game sounds off with the speaker on the Game tab.',
  'Slowpitch only for now. Steals, wild pitches, and a pitch counter are planned for baseball and fastpitch later.',
  'In Dugout Mode, the other team’s half-innings are kept as totals, so their page in the Book has no boxes for those innings.',
  'After an update, close the app fully and reopen it to pick it up.',
];

export const HELP: HelpSection[] = [
  {
    title: 'Looking Around First',
    paragraphs: [
      'On a new iPhone or iPad, tap PLAY BALL!, then Look Around with Sample Data First on the welcome screen. The made-up Diamond Dogs have six games played, tonight’s game in the fourth inning, and two more on the schedule. Score a few plays to try it.',
      'When you’re ready for your own team, tap Clear on the Sample season line under any tab’s title. Hide tucks the line away until you close ScoreKept.',
    ],
  },
  {
    title: 'Setting Up Your Team',
    paragraphs: [
      'On the Team tab, tap Edit Team for your team’s name, short name, and colors. One grid shows all 18 colors; tap Primary or Secondary above it to pick which one you’re choosing. The score bug at the top stays in view and shows them as you pick, and the Big League Colors menu fills in a city’s look in one tap. Everything saves as you go; tap ✕ when you’re finished.',
      'The Team tab is your roster card: one row per player, with the jersey number in its block. Tap + at the top to add another team; with two or more, tap your team’s name to switch.',
      'Tap + Add Player for each player: name, number, up to three positions, and which side they bat from. Reserves go under + Add Reserve; add a phone number and the Text button sends them a message.',
      'Add the season’s games with + Add a Game. The next one shows as Up Next on the Game tab, with Start This Game.',
    ],
  },
  {
    title: 'Starting a Game',
    paragraphs: [
      'Tap New Game on the Game tab. First check Who’s Here, then tap players into the batting order. Drag ☰ to move someone, or tap a name for Move Up, Move Down, and Take Out of the Order.',
      'Auto-Fill builds an order from everyone here, Same as Last Game copies the last one, and Suggest Order spreads out your strongest bats. Each player’s position picker dims positions already taken.',
      'Game Details holds the opponent, the park, Dugout Mode or Scorekeeper Mode, and your league’s rules. In Scorekeeper Mode, type their batting order one name per row (+ Add Batter for more), or paste a whole list into the first row. Blank rows are skipped; leave them all blank to use Batter 1, Batter 2, and so on. The pregame checklist shows anything still missing.',
      'At the coin toss, tap We’re Visitors or We’re Home. The game and its clock start then. When time runs out, the clock reads 0:00 and its label says Last Inn.',
    ],
  },
  {
    title: 'Subs and Late Arrivals',
    paragraphs: [
      'During a game, tap Lineups. Sub swaps a player in from the bench (or a new player) in the same spot. Add a Late Arrival puts someone at the bottom of the order.',
    ],
  },
  {
    title: 'The Scoring Buttons',
    paragraphs: [
      'The solid green buttons are for a batter who reaches base. The cream buttons outlined in red pen are for a batter who’s out. Ball, Strike, and Foul are cream with a navy outline, and Undo, Lineups, and Defense are the plain ones under them. A pressed scoring key sinks into its bottom edge. Every key keeps its place. Infield Fly, Sac Fly, Double Play, Triple Play, and HR Out are dimmed until they can happen (Infield Fly with runners on first and second and fewer than two outs, for example); tap a dimmed one to hear why. With Increase Contrast on (Settings, Accessibility, Display & Text Size), a dimmed key is plain gray instead of faded. The Last Play strip at the bottom of the board says what you just scored, and Undo names what it will take back. When the next pitch would end the at-bat, its button says Out or Walk. Each shows the code you’d write in the book over a plain word: GO over Grounder, K over Swinging. Some are dimmed when they can’t happen, like Sac Fly with nobody on third, or HRO before your team is over its home-run limit; tap one to hear why.',
      'The top of the scoreboard shows the batter: their spot in the order (3.), AT BAT, their name, then their jersey number and position (#9 · 1B). Under it is one line: SEASON (.329 AVG · 2 HR · 5 RBI) before their first trip to the plate today, then TODAY (hits for at-bats and each trip, like 1-for-2 · Foul Out, 2B). On Deck is the banner’s last row. The round music button plays the batter’s walk-up. The inning’s arrow is in the bulbs: up for the top, down for the bottom. Settings, Batter’s Name, can set the first name larger.',
      'The Last Play strip along the bottom of the scoreboard says what you just scored, with runs and RBI in gold. A long play slides across so you can read it all.',
      'The tab bar at the bottom stays put while you scroll, so every tab is always one tap away. The tab you’re on sits in a navy capsule with a gold icon and label.',
      'With Balls and Strikes on, tap Ball, Strike, or Foul for each pitch; the B, S, and O lamps beside the inning keep the count. Ball turns green when it would be ball four, and Strike and Foul turn red when they’d make the out. Strike on the out pitch records a swinging strikeout; tap K Looking instead for a called one. BB stays for an intentional walk.',
      'With Hit Location on, the field opens after a ball in play. Tap where the ball went, then Save. Skip records the play without a spot.',
      'In Dugout Mode, the other team’s half uses quick buttons: +1 Run, +1 Out, + Hit, + Our Error, and + Their HR.',
      'The Game screen sizes itself to your iPhone or iPad. Upright, the buttons grow to fill the screen; turn it sideways and the scoreboard sits on the left with the buttons on the right. On an iPad, the last four plays show under the buttons when there’s room.',
    ],
  },
  {
    title: 'Moving Runners',
    paragraphs: [
      'Hits and walks move runners on their own. For anything else, tap a lit base: a small menu opens on the scoreboard.',
      'Right after a play: +1 Advance, Score (with the RBI to the batter, or without), Out, and −1 Move Back for a runner who went one base too far. Between pitches, the menu follows the game’s rules: in slowpitch, just Out (Left Early, where your league calls that) and a courtesy runner. Where the rules allow stealing, SB, CS, and PO appear, and WP and PB where runners advance on wild pitches; set these in the rules under Running Between Pitches. CR puts in a courtesy runner, and More has the full list. Undo takes back each one by itself.',
      'A ground out moves forced runners up one base, and a walk or hit pushes everyone forced. Tap a runner afterward to change anything.',
      'With more than one runner on, a fielder’s choice or double play asks you to tap the runner who was out; the runners’ bases get a gold ring. Tap Cancel, or any other key, to back out.',
    ],
  },
  {
    title: 'Fixing Mistakes',
    paragraphs: ['Undo, under the scoring buttons, takes back the last tap. Tap it again to go back further.', 'For a play further back, tap its box in the Book to Edit Play.'],
  },
  {
    title: 'The Defense Card',
    paragraphs: [
      'During a game, tap Defense. Players run down the side and innings across. Tap a box to pick a position or Sit; if someone already has that position, the two trade places. An inning you haven’t set copies the one before it.',
      'A red ! over an inning means it’s missing a pitcher, a catcher, or an infielder. The last column counts each player’s innings in the field and on the bench.',
      'Tap a name to pin that player in place; your pitcher and catcher start pinned. Auto-Rotate fills the innings not played yet: nobody sits twice until everyone has sat once, Sits First players sit first and Sits Last players last, and players go back to their main position when they can. Innings already played never change.',
      'Plan for sets how many innings Auto-Rotate fills; later innings show “if needed.” Reset clears the innings not played yet. Whiteboard draws the card the dugout way, innings 1 and 5, 2 and 6, and 3 and 7 sharing a column, with Share Picture to send it.',
    ],
  },
  {
    title: 'Depth Chart and Dues',
    paragraphs: [
      'On the Team tab, under Team Tools, Depth Chart lists who can play each position from the positions on each player’s card, main position first. A position with one option or none is outlined in red. Reserves are listed under each position separately.',
      'Dues splits the league fee across everyone on the roster who pays, rounded up to the cent. Tap a name for Paid in Full, an amount paid so far, or Doesn’t Pay for anyone the team covers. The top shows what’s collected and what’s left to go.',
    ],
  },
  {
    title: 'Ending a Game',
    paragraphs: [
      'ScoreKept ends the game by your league’s rules: the last inning, the run rule, a walk-off, or the time limit. Then tap Save to Season.',
      'To end early, tap Settings during the game, then End Game Now.',
    ],
  },
  {
    title: 'The Book',
    paragraphs: [
      'Every at-bat goes in its box: the path around the bases in pencil, outs circled in red with which out it was, runs in yellow highlighter, and a thin line toward where the ball went. A run also gets a small solid ◆ in the box’s bottom-left corner, so you can spot runs without the highlighter’s color. Along the top are the pitches (a filled dot a strike, an open dot a ball, a dash a foul), and short strokes in the top-right corner count the RBI. A heavy pencil slash across the corner after a box marks where a half-inning ended, so you can see where the next inning picks up.',
      'The Book writes first names, the way a scorer does. When two players share a first name, both get an initial (Cody W. and Cody M.). For last names instead, go to Settings, Book, Book Names.',
      'Under each name, in your handwriting, is what a scorekeeper jots down: the jersey number, where the player played, each move with its inning (SS → P (5) means they went to pitcher in the 5th), and for a sub, the inning they came in. The left column is the batting order: 1., 2., and so on.',
      'The Scorekeeper section at the bottom shows, written in by hand, when the first pitch was thrown, when the game ended, and how long it took.',
      'Under it, Rare Plays is a checklist: a double play, a triple play, the cycle, an inside-the-park homer, a grand slam, a perfect inning, and a walk-off. The first time your team has one, it gets a check and the date and park, written in by hand.',
      'Watch Replay, above the play-by-play, plays the game back on the field: the ball’s line out to where it landed, runners moving around the bases, and the score ticking along. Play runs it, Back and Next step through, and the menu jumps to any half-inning.',
      'Tap any box or play-by-play line to Edit Play: change the result, move the ball, change where each runner ended and who gets the RBI, or Delete This Play (tap twice). Everything after it is re-scored, on saved games too, and the stats follow.',
      'Use Visitors and Home above the page to switch teams, the Game menu for another game (LIVE marks the one being scored), the pencil at the top to choose Pencil, Black Pen, or Blue Pen, and the share icon beside it to share the game. During a game, the Book opens with the inning being played fully in view (even after batting around), and the batter at the plate has a gold box; swipe the page sideways for the others, and the names stay put.',
    ],
  },
  {
    title: 'Stats and Scout',
    paragraphs: [
      'Stats is the back of your team’s baseball card. Tap the season in the navy band to pick another, or All Seasons. The calendar at the top opens the schedule, and ••• holds New Season. Overview has the stat line (G, W, L, RS for runs scored, RA for runs allowed), the team leaders (tap a name for the player’s card), and every game with View and Delete. Batting has four tables; tap a column’s name to sort by it. Charts shows where every ball went; tap near one to see the play, move it, or View Game.',
      'Tap any name for the player card: season numbers, the last three games, recent form, positions, and a spray chart.',
      'Scout lists every team you’ve played. Tap one to see where they hit the ball, as a team and hitter by hitter, with a tip for your defense.',
    ],
  },
  {
    title: 'Sounds and Walk-Ups',
    paragraphs: [
      'The music notes at the top of the Game tab open the Organ, ScoreKept’s own player with a wheel and albums for Rally, Celebrate, Pregame, Between Innings, Drama, Send-Offs, and Walk-Ups. Slide around the wheel to scroll, press the middle to open an album or play a tune, and MENU to go back. The arrows change tunes, and play and pause stops. With VoiceOver, the Organ is a plain list of tunes instead. The Organ plays even when game sounds are off. Settings, at the bottom of its menu, opens every sound setting. The Organ fills the whole screen; the Stretch button under its wheel plays Take Me Out to the Ball Game any time; once it plays, the stretch won’t play by itself again that game. Spin anywhere on the wheel’s ring, even starting over MENU or an arrow; a quick tap still works as a tap. Spin fast to move through a long list quicker. While a tune plays, Now Playing sits at the top of the menu, with the time left and what’s up next, and the top of the Organ’s screen keeps the inning and score in view.',
      'The speaker next to it turns game sounds on and off. It shows sound waves and plays a short tune when sound comes on; off, the speaker is slashed. Key Clicks, in Sounds, adds a short click for each scoring key: leather, turf, clay, or aluminum.',
      'Sounds play even when your iPhone is set to Silent, so the speaker button is the one way to quiet ScoreKept. The first sound pauses music playing in another app.',
      'The speaker turns game sounds on and off. Each play gets its sound, then the next batter’s walk-up, then anything special, like taking the lead. Balls, strikes, and fouls are quiet unless they end the at-bat. Scoring the next play or tapping Undo fades whatever is playing.',
      'Pick each player’s walk-up on their card: one of eight originals, any organ tune, or their own song file, with where to start and how long to play. The round ♪ button on the scoreboard plays it anytime. On a player’s birthday, their first at-bat is Happy Birthday.',
      'Settings, Sounds & Walk-Up Songs has the sound pack, Big Speaker Mode (the spinning swirl and a big echo, for a Bluetooth speaker at the field), the echo (from Off to Big Stadium), the crowd, the PA announcer, umpire calls (ball four and strike three only, never every pitch), music between innings, and a tune for each moment.',
    ],
  },
  {
    title: 'Sharing and Discord',
    paragraphs: [
      'Tap Share on the Book (or Share Recap after Save to Season) for the Recap picture, with the final, the line score, and the Stars of the Game, or the Scorecard, with your Book page. Share Picture and Share Text are separate buttons because iPhone drops the text when both go together. Copy Text works anywhere.',
      'In Settings, Discord, paste a webhook link for your polls channel and one for game updates (in Discord: the channel’s settings, Integrations, Webhooks, New Webhook, Copy Webhook URL), then Save & Test. The links stay on this iPhone and are never in a backup.',
      'Who’s In? Poll on the Up Next card posts a real Discord poll that closes at game time. Votes stay in Discord. Without a Discord link, it copies the poll text instead.',
    ],
  },
  {
    title: 'Lights',
    paragraphs: [
      'In Scorekeeper Mode, the Game scoreboard’s frame flashes for your home run and a walk-off, and glows for a win. Reduce Motion keeps it still.',
    ],
  },
  {
    title: 'Tutorials',
    paragraphs: [
      'Settings, Tutorials has short walk-throughs: The Basics, Starting a Game, Scoring a Game, and Stats and the Book. Each one lights up the real buttons and switches tabs for you. Skip anytime; finished ones get a ✓.',
      'To see the welcome screen and setup again, tap Settings, Run the Welcome Setup Again.',
      'Something off, or an idea? Settings, Send Feedback: write a note, tap Copy, and paste it in a text, an email, or Discord. It adds the app’s version for you, and if something has gone wrong on this iPhone, a short error log you can turn off.',
    ],
  },
  {
    title: 'No Signal at the Field',
    paragraphs: [
      'After you’ve opened ScoreKept once with a connection, it keeps a full copy on your iPhone and opens with no signal. A small Offline note shows at the top while you’re offline; everything still works and saves.',
      'With a connection, it checks for a newer version each time it opens. Close the app fully and reopen it to pick up an update.',
      'During a game the screen stays on, so it doesn’t lock between pitches. Turn it off in Settings, New Game Defaults.',
    ],
  },
  {
    title: 'Keeping Your Data Safe',
    paragraphs: [
      'Everything stays on this iPhone. Save a backup often from Settings, Backup & Restore, and keep it in Files or iCloud Drive. The Safety Check there shows your last backup, whether your iPhone is protecting the app’s storage, and whether it works offline.',
      'If a week goes by without a backup, a reminder shows on the Book, Stats, Scout, and Team tabs. It never shows on Game.',
      'Keep ScoreKept on your Home Screen. In a Safari tab, Safari can clear a website’s data after about a week without a visit; on the Home Screen it’s kept. Settings, Add to Home Screen shows how.',
      'Deleting the ScoreKept icon from the Home Screen deletes its data. Back up first.',
    ],
  },
  { title: 'Privacy', paragraphs: PRIVACY },
  { title: 'Known Issues', paragraphs: KNOWN_ISSUES },
];
