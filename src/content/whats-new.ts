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
    version: '2026.11.12-4',
    headline: 'The Stats Page, the Way It Was Kept Before',
    lines: [
      'Stats leads with your team’s name, the season beside it, and the games and record underneath. Each game in the list gets a big W or L.',
      'Innings shows each player’s innings in the field against their fair share, like 42 of 44, with what the arrows mean at the bottom.',
      'Setup’s colors step fits on one screen now, with the city looks in a menu.',
    ],
  },
  {
    version: '2026.11.12-3',
    headline: 'Tonight’s Box Score, Hot off the Press',
    lines: [
      'Share Recap turns any game into a picture: the final, the line score, and the Stars of the Game, or the whole Scorecard in the scorekeeper’s hand. Share the picture, the text, or both. Find it on the Book, and after Save to Season.',
      'Connect your team’s Discord channels in Settings: post the Who’s In? poll from the Up Next card, and send recaps straight to the game channel.',
      'In Scorekeeper Mode the lights get into it now: the stadium lights come on one by one for a home run, flash for a walk-off, and stay on for night games.',
    ],
  },
  {
    version: '2026.11.12-2',
    headline: 'The Organist Has Arrived',
    lines: [
      'The ballpark organ is warmed up: a sting for every hit, the Charge fanfare for a home run, the wah-wah when they strike out, and Shave and a Haircut to retire the side. Tap the keyboard at the top of the Game tab for the whole songbook.',
      'Every player walks up to a song now: one of eight originals, any tune on the organ, or their own song file. Tap Walk-Up on the scoreboard to play it, and on a birthday it’s Happy Birthday.',
      'Between innings, the organ plays Take Me Out to the Ball Game, played from the 1908 sheet music, plus two songs from the 1860s and ’70s: The Base Ball Polka and Tally One for Me.',
      'The Book adds at-bats, runs, hits, and RBI at the end of each row.',
    ],
  },
  {
    version: '2026.11.12-1',
    headline: 'Play Ball, Even Where There’s No Signal',
    lines: [
      'ScoreKept keeps a full copy of itself on your iPhone now, so it opens in the dugout with no signal at all.',
      'New here? Tap Play Ball and the bat cracks, the crowd goes up, and a minute of setup gets your team on the board. Short tours light up the real buttons, and they live in Settings, Tutorials.',
      'The bases hang off the bottom of the scoreboard now, thick rubber with real shadows, the way they do on TV.',
      'The screen stays on during games, and a friendly reminder turns up on the other tabs when a week goes by without a backup.',
    ],
  },
  {
    version: '2026.11.11-11',
    headline: 'A Few More Marks, in the Same Hand',
    lines: [
      'The pencil box picked up a no sign, arrows pointing every way, an open star, a degree mark for the weather, and an ellipsis, all made from the scorekeeper’s own strokes.',
      'Names like José, Zoë, and François get their accents written the same way.',
    ],
  },
  {
    version: '2026.11.11-10',
    headline: 'The Scorekeeper Sharpened His Pencil',
    lines: [
      'The Book now writes every letter and number two ways, from two sheets in the scorekeeper’s own hand, and they take turns, so Bobby and 1–1 never look stamped.',
      'Pairs like th and tt, the codes 1B, 2B, 3B, HR, and BB, and the circled out numbers are written the way he writes them in one go, and the arrows, stars, and checks are his own.',
    ],
  },
  {
    version: '2026.11.11-9',
    headline: 'Back in the Old Colors',
    lines: [
      'The tab bar is back in navy with a gold light on the tab you’re on, the way the first ScoreKept had it.',
      'Settings groups its rows on one card again, and each row says what’s inside: your team and roster size, your New Game defaults, and when you last saved a backup.',
    ],
  },
  {
    version: '2026.11.11-8',
    headline: 'The Defense Card Is Posted',
    lines: [
      'Tap Defense during a game for the whole card: every player down the side, every inning across. Tap a box to move someone, and whoever had that spot trades places.',
      'Auto-Rotate fills the innings still to come so everybody sits once before anybody sits twice. Pin a player to keep them put; your pitcher and catcher start pinned.',
      'Whiteboard draws the card the way it goes up in the dugout, innings 1 and 5 side by side, ready to send to the team.',
      'On the Team tab, Team Tools has the depth chart, with thin spots in red, and dues: the league fee split across the roster, who’s paid, and what’s left to collect.',
    ],
  },
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
