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
    version: '2026.11.13-3',
    headline: 'A Broadcast Booth Scoreboard',
    lines: [
      'The scoreboard runs edge to edge now. The batter’s season line rides next to the name, with today’s trips to the plate right under it, and B, S, and O sit next to the inning like on TV.',
      'Ball, Strike, Foul: one tap each. Ball goes green on ball four, Foul goes red when it would be a foul out, and strike three is K or the backwards K.',
    ],
  },
  {
    version: '2026.11.13-2',
    headline: 'Two Ways to Play It',
    lines: ['The organ now plays plain and clean from your iPhone. Hooked up to a big speaker at the field? Turn on Big Speaker Mode for the spinning swirl and the ballpark echo.'],
  },
  {
    version: '2026.11.13-1',
    headline: 'Straight From the Keys',
    lines: ['Want the organ plain? Settings, Sounds & Walk-Up Songs now has a Leslie Speaker switch for the spinning swirl, and Echo can be turned all the way Off.'],
  },
  {
    version: '2026.11.12-17',
    headline: 'Clocking the Game',
    lines: [
      'The bottom of the Book now notes the first pitch, the final, and how long the game ran.',
      'The app opens on a navy splash with the scorebook while it loads, and an Organ tune shows its name and composer on your Lock Screen.',
    ],
  },
  {
    version: '2026.11.12-16',
    headline: 'The Organ Got Its Ballpark Back',
    lines: [
      'The organist pulled out the low drawbars, doubled the melody in octaves, and put a bass line under every tune.',
      'A spinning Leslie, a touch of tube warmth, and a big stadium echo that rings after the last chord. Less tinny, a lot more ballpark.',
    ],
  },
  {
    version: '2026.11.12-15',
    headline: 'Three New Old Ones on the Organ',
    lines: [
      'Straight off the old sheet music: the Home Run Galop from 1903 and “Over the Fence Is Out” from 1895 under Celebrate, and Funiculì, Funiculà under Rally.',
      'Now Playing on the Organ shows who wrote each tune, the way an iPod shows the artist.',
      'The Hammond is the only organ now. If you had picked the calliope or the pipe organ, you’ll hear the Hammond instead.',
    ],
  },
  {
    version: '2026.11.12-14',
    headline: 'The Organist Pulled Out the Hammond',
    lines: [
      'Every tune now comes out of a Hammond B-3 through a spinning Leslie speaker: the click of the keys, the ring on every note, and that ballpark swirl.',
      'The Organ button at the top of the Game tab is two music notes now.',
    ],
  },
  {
    version: '2026.11.12-13',
    headline: 'A Cleaner Cut Between Innings',
    lines: ['The half-inning slash in the Book now runs right across the corner, from one box into the next, so you can see at a glance where one inning stops and the next begins.'],
  },
  {
    version: '2026.11.12-12',
    headline: 'Three Away, Mark It Down',
    lines: [
      'When a half-inning ends, the Book now puts a heavy pencil slash across the corner of the last batter’s box, the way a scorekeeper marks where the next inning picks up.',
      'Every color in the app got checked for reading in bright sun, and with Increase Contrast on. The gold on the scoreboard is a touch brighter, and the red pen a touch deeper.',
    ],
  },
  {
    version: '2026.11.12-11',
    headline: 'Sweeping Off the Plate',
    lines: ['Setting up a team? The color preview now looks just like the scoreboard you’ll be using, stripe and all, with your team badge beside it.'],
  },
  {
    version: '2026.11.12-10',
    headline: 'The Whole Game on One Screen Again',
    lines: [
      'The Game tab fits your iPhone again, header to tab bar, with nothing hiding under the clock at the top.',
      'The Settings gear got new teeth: eight even ones around a round hub.',
    ],
  },
  {
    version: '2026.11.12-9',
    headline: 'Your At-Bats, Right There on the Card',
    lines: [
      'The batter’s card on the Game tab now shows today’s trips to the plate as little boxes straight out of the Book.',
      'The home run out key stays dimmed until your team is over its home-run limit.',
      'The Stats tab has a spray chart for its icon. And the screen holds still now: no pinching, and no bounce on a page that fits.',
    ],
  },
  {
    version: '2026.11.12-8',
    headline: 'The Long Ball Lands Where It Should',
    lines: [
      'Home runs over the fence now land over the fence, with nobody fielding them, and a home run out only shows up once a team is past its home-run limit.',
      'The speaker at the top of the Game tab lights up and plays a little tune when sound comes on, and goes quiet and plain when it’s off.',
      'The Home Screen icon moved in close on the plate and the book.',
    ],
  },
  {
    version: '2026.11.12-7',
    headline: 'The Organist Got a Pocket Player',
    lines: [
      'The Organ is a click wheel now: slide your thumb around to scroll, press the middle to open an album or play a tune, and MENU to go back. Each click of the wheel ticks softly, and on newer iPhones you can feel it too.',
      'White by day, black by night, like the iPhone’s own look.',
    ],
  },
  {
    version: '2026.11.12-6',
    headline: 'A Look at Every Inch of the Field',
    lines: [
      'Every screen got checked at the biggest text size, zoomed in and out, sideways, and in both appearances. Anything that ran off the edge now wraps.',
      'With Reduce Motion on, colors change the moment you tap, with no lag.',
      'Send Feedback in Settings: write a note and copy it to send.',
    ],
  },
  {
    version: '2026.11.12-5',
    headline: 'A New Face on the Home Screen',
    lines: [
      'ScoreKept’s icon is now the scorebook set down on home plate, in the dirt between the chalk of the batter’s boxes.',
    ],
  },
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
