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
      'Green buttons are for a batter who reaches base. Red buttons are for a batter who’s out. Some buttons are dimmed when they can’t happen, like Sac Fly with nobody on third; tap one to hear why.',
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
    paragraphs: ['Undo, under the scoring buttons, takes back the last tap. Tap it again to go back further.'],
  },
  {
    title: 'Ending a Game',
    paragraphs: [
      'ScoreKept ends the game by your league’s rules: the last inning, the run rule, a walk-off, or the time limit. Then tap Save to Season.',
      'To end early, tap Settings during the game, then End Game Now.',
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
