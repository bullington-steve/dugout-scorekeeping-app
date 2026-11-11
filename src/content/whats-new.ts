// What's New is written in the voice of a ballpark PA announcer or
// scorekeeper, never a changelog. A unit test checks the house rules
// (no emoji, no exclamation points, no em dashes, no changelog words).

export interface WhatsNewEntry {
  version: string;
  headline: string;
  lines: string[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: '2026.11.11-7',
    headline: 'A Few More Marks in the Pencil Box',
    lines: [
      'The scorekeeper’s handwriting picked up a straight line, an X for an out on the bases, an arrow, an asterisk for a great play, and tally marks, all drawn from strokes already in the book.',
    ],
  },
  {
    version: '2026.11.11-6',
    headline: 'The Book Is Open',
    lines: [
      'Every at-bat goes in the Book in your own handwriting: the path around the bases, outs circled in red, runs in highlighter, under a hand-hung board with the lights on. Tap any box to change a play, and everything after it is scored again.',
      'Stats is back with the record, team leaders, every batting table, spray charts, lineups by game, and fair-share innings. Scout shows where every opponent hits the ball.',
      'The scoring buttons have their big codes back, GO over Grounder and K over Swinging, and the count keys say what the next pitch makes it.',
      'Pick your Book ink in Settings: pencil, black pen, or blue pen.',
    ],
  },
  {
    version: '2026.11.11-5',
    headline: 'Tonight’s Game Is Already Underway',
    lines: [
      'On a new iPhone or iPad, tap Look Around with Sample Data and the made-up Diamond Dogs take the field: six games in the books, tonight’s in the fourth, and two more on the schedule.',
      'When you’re done looking, Clear Sample Data clears the field for your own team.',
    ],
  },
  {
    version: '2026.11.11-4',
    headline: 'Now Batting, Your Whole Team',
    lines: [
      'The Team tab is open: your colors, your badge, every player with a photo, a number, positions, and a rating.',
      'New Game walks through Who’s Here, a lineup card you build by tapping and dragging, Game Details with a pregame checklist, and the coin toss.',
      'Put the season’s games on the schedule, and Up Next will be waiting on the Game tab. Subs and late arrivals go in from Lineups during the game.',
    ],
  },
  {
    version: '2026.11.11-3',
    headline: 'Five Minutes to Go',
    lines: [
      'The clock keeps it simple: minutes left, until the last five, when the seconds start counting down.',
    ],
  },
  {
    version: '2026.11.11-2',
    headline: 'New Paint on the Board',
    lines: [
      'The scoreboard is back in its home colors: the batter’s name up top in ballpark lettering, runs in housed bulbs, and the clock counting down the minutes and seconds.',
      'The bases are thick and lit gold when someone’s aboard. Ball, strike, and out lamps have their own row, and On Deck runs along the bottom.',
    ],
  },
  {
    version: '2026.11.11-1',
    headline: 'Batter Up',
    lines: [
      'The scoreboard is lit and the Game tab is open for business.',
      'Score a whole game, pitch by pitch or one tap per batter, with your league’s rules keeping time: the run rule, the home run limit, the clock, and the walk-off.',
      'Tap a lit base to move a runner. Tap where the ball went for spray charts down the road.',
      'Bring your team and your season over from the old ScoreKept with Settings, Backup & Restore.',
    ],
  },
  {
    version: '2026.11.10-1',
    headline: 'The Lights Come On',
    lines: [
      'Good evening, and welcome to a brand-new ballpark.',
      'The grounds crew is rebuilding ScoreKept from the dirt up: new foundation, fresh chalk, and a scoreboard on the way.',
      'Tonight’s page is small, but it already installs to your Home Screen and follows your iPhone’s light appearance, Dark Mode, and text size.',
      'Scoring returns soon. Your season will make the trip with it.',
    ],
  },
];
