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
    title: 'Starting a Game',
    paragraphs: [
      'Tap New Game on the Game tab. Name the opponent, pick Dugout Mode or Scorekeeper Mode and your league’s rules, and check who’s here.',
      'At the coin toss, tap We’re Visitors or We’re Home. The game and its clock start then.',
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
