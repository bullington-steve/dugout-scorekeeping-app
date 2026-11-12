/*
 * Help & How to Score. Fixed text written in advance (no generated
 * content). Grows phase by phase; see docs/SPEC.md §11 for the full list.
 */
export interface HelpSection {
  title: string;
  paragraphs: string[];
}

export const HELP: HelpSection[] = [
  {
    title: 'Looking Around First',
    paragraphs: [
      'On a new iPhone or iPad, tap PLAY BALL!, then Look Around with Sample Data First on the welcome screen. The made-up Diamond Dogs have six games played, tonight’s game in the fourth inning, and two more on the schedule. Score a few plays to try it.',
      'When you’re ready for your own team, tap Clear Sample Data on the banner at the top of the Team tab.',
    ],
  },
  {
    title: 'Setting Up Your Team',
    paragraphs: [
      'On the Team tab, tap Edit Team for your team’s name, short name, and colors. Big League Colors fills in a pro team’s colors in one tap.',
      'Tap + Add Player for each player: name, number, up to three positions, and which side they bat from. Reserves go under + Add Reserve; add a phone number and the Text button sends them a message.',
      'Add the season’s games with + Add a Game. The next one shows as Up Next on the Game tab, with Start This Game.',
    ],
  },
  {
    title: 'Starting a Game',
    paragraphs: [
      'Tap New Game on the Game tab. First check Who’s Here, then tap players into the batting order. Drag ☰ to move someone, or tap a name for Move Up, Move Down, and Take Out of the Order.',
      'Auto-Fill builds an order from everyone here, Same as Last Game copies the last one, and Suggest Order spreads out your strongest bats. Each player’s position picker dims positions already taken.',
      'Game Details holds the opponent, the park, Dugout Mode or Scorekeeper Mode, and your league’s rules. The pregame checklist shows anything still missing.',
      'At the coin toss, tap We’re Visitors or We’re Home. The game and its clock start then.',
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
      'Green buttons (Batter Reaches) are for a batter who reaches base. Red buttons (Batter Out) are for a batter who’s out. Each shows the code you’d write in the book over a plain word: GO over Grounder, K over Swinging. Some are dimmed when they can’t happen, like Sac Fly with nobody on third, or HRO before your team is over its home-run limit; tap one to hear why.',
      'The batter’s card shows today’s trips to the plate as little boxes from the Book.',
      'With Balls and Strikes on, the count keys say what the next pitch makes it: Ball 2, Strike 3, Walk, or Strikeout.',
      'With Hit Location on, the field opens after a ball in play. Tap where the ball went, then Save. Skip records the play without a spot.',
      'In Dugout Mode, the other team’s half uses quick buttons: +1 Run, +1 Out, + Hit, + Our Error, and + Their HR.',
    ],
  },
  {
    title: 'Moving Runners',
    paragraphs: [
      'Hits move runners by the hit’s bases. For anything else, tap a lit base on the scoreboard: Advance, Scored, Out, or Courtesy Runner.',
      'Right after a play, a runner who scores can be credited to the batter with Scored on the Play.',
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
      'Every at-bat goes in its box: the path around the bases in pencil, outs circled in red with which out it was, runs in yellow highlighter with a small solid diamond, and a thin line toward where the ball went. A heavy pencil slash across the corner after a box marks where a half-inning ended, so you can see where the next inning picks up.',
      'Tap any box or play-by-play line to Edit Play: change the result, move the ball, change where each runner ended and who gets the RBI, or Delete This Play (tap twice). Everything after it is re-scored, on saved games too, and the stats follow.',
      'Use the short team names above the page to switch teams, the Game menu for another game, and ✎ to choose Pencil, Black Pen, or Blue Pen.',
    ],
  },
  {
    title: 'Stats and Scout',
    paragraphs: [
      'Stats counts the season in the Season menu, or All Seasons. Overview has the record, team leaders, and every game with View and Delete. Batting has four tables; tap a column’s name to sort by it. Charts shows where every ball went; tap near one to see the play, move it, or View Game.',
      'Tap any name for the player card: season numbers, the last three games, recent form, positions, and a spray chart.',
      'Scout lists every team you’ve played. Tap one to see where they hit the ball, as a team and hitter by hitter, with a tip for your defense.',
    ],
  },
  {
    title: 'Sounds and Walk-Ups',
    paragraphs: [
      'The music notes at the top of the Game tab open the Organ, a click-wheel player with Rally, Celebrate, Pregame, Between Innings, Drama, Send-Offs, and Walk-Ups. Slide around the wheel to scroll, press the middle to open an album or play a tune, and MENU to go back. The arrows change tunes, and play and pause stops. With VoiceOver, the Organ is a plain list of tunes instead. The Organ plays even when game sounds are off.',
      'The speaker next to it turns game sounds on and off. It lights up and plays a short tune when sound comes on, and goes plain and quiet when it’s off. Each play gets its sound, then the next batter’s walk-up, then anything special, like taking the lead. Scoring the next play or tapping Undo fades whatever is playing.',
      'Pick each player’s walk-up on their card: one of eight originals, any organ tune, or their own song file, with where to start and how long to play. Walk-Up on the scoreboard plays it anytime. On a player’s birthday, their first at-bat is Happy Birthday.',
      'Settings, Sounds & Walk-Up Songs has the sound pack, the organ’s voice and echo, the crowd, the PA announcer, umpire calls, music between innings, and a tune for each moment.',
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
      'In Scorekeeper Mode, the Book’s stadium lights come on bank by bank for your home run and stay on until the next play, flash for a walk-off, and beat slowly with the bases loaded. The scoreboard glows for a win. Games that start around sunset or later in Fort Collins keep the lights on all game. Reduce Motion turns them on and off without moving.',
    ],
  },
  {
    title: 'Tutorials',
    paragraphs: [
      'Settings, Tutorials has short walk-throughs: The Basics, Starting a Game, Scoring a Game, and Stats and the Book. Each one lights up the real buttons and switches tabs for you. Skip anytime; finished ones get a ✓.',
      'To see the welcome screen and setup again, tap Settings, Run the Welcome Setup Again.',
      'Something off, or an idea? Settings, Send Feedback: write a note, tap Copy, and paste it in a text, an email, or Discord. It adds the app’s version for you.',
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
];
