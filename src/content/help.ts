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
      'On a new iPhone or iPad, tap Look Around with Sample Data on the Game tab. The made-up Diamond Dogs have six games played, tonight’s game in the fourth inning, and two more on the schedule. Score a few plays to try it.',
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
      'Green buttons (Batter Reaches) are for a batter who reaches base. Red buttons (Batter Out) are for a batter who’s out. Each shows the code you’d write in the book over a plain word: GO over Grounder, K over Swinging. Some are dimmed when they can’t happen, like Sac Fly with nobody on third; tap one to hear why.',
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
      'Every at-bat goes in its box: the path around the bases in pencil, outs circled in red with which out it was, runs in yellow highlighter with a small solid diamond, and a thin line toward where the ball went.',
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
    title: 'Keeping Your Data Safe',
    paragraphs: [
      'Everything stays on this iPhone. Save a backup often from Settings, Backup & Restore, and keep it in Files or iCloud Drive.',
      'Deleting the ScoreKept icon from the Home Screen deletes its data. Back up first.',
    ],
  },
];
