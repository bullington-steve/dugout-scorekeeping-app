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
    version: '2026.11.22-3',
    headline: 'Written Like a Scorer Writes',
    lines: ['Names in the Book are written as big as their column allows now, short ones a little bigger and long ones a little tighter, each with its own slight lean. A long trail of moves under a name wraps to a second line instead of being cut off. And the Rare Plays list has been cleared off the bottom of the page.'],
  },
  {
    version: '2026.11.22-2',
    headline: 'Keep Your Place in a Rally',
    lines: ['When an inning bats around, its number now sits at the left of its wide column and stays beside the names while you swipe through the rally. Position moves under the names are written tighter, like SS→P (5), so more of them fit.'],
  },
  {
    version: '2026.11.22-1',
    headline: 'A New Face on the Home Screen',
    lines: ['ScoreKept has a new icon: a cream diamond on scoreboard green with a runner on second, lit in gold, inside the board’s painted frame. Your iPhone keeps the old icon until you remove ScoreKept from the Home Screen and add it again from Safari, and removing it erases what it saved, so back up first and restore after.'],
  },
  {
    version: '2026.11.21-3',
    headline: 'Right Away',
    lines: ['Tap a box or a name in the Book and it opens right away, with no wait. The Book changes size only from the reading glass now: Page, Normal, or Close-up.'],
  },
  {
    version: '2026.11.21-2',
    headline: 'Read the Book Your Way',
    lines: ['Tap the reading glass at the top of the Book for three sizes: Page, the whole game across at once; Normal; and Close-up, big boxes that follow the batter at the plate. Double-tap the page to swap Normal and Close-up. Scroll down and the inning numbers stay pinned at the top, with the names at the left.'],
  },
  {
    version: '2026.11.21-1',
    headline: 'Roomier Boxes in the Book',
    lines: ['The names in the Book are written a size smaller, and the room they gave up goes to the innings. Every box is wider now, and the diamond, the play, the pitches, and the outs are drawn bigger to fill it. An inning that bats around gets two full-width columns, and the inning being played is underlined in gold.'],
  },
  {
    version: '2026.11.18-1',
    headline: 'One Set of Paper',
    lines: ['The last of the old boxes are swept off the field. Team Tools, the schedule, the stat tables, the spray charts, and the Book’s plays and signature now run edge to edge like the rest of the paper, and Scout’s list of opponents is one clipboard sheet with each team’s patch. Tap a row and it shades for a moment, the way your iPhone’s own lists do, and the last row on every screen clears the tab bar.'],
  },
  {
    version: '2026.11.17-15',
    headline: 'The Visitors Get Colors Too',
    lines: ['Every team you play is saved now, with a pennant of its own. Pick their colors in Game Settings, Opponent Colors, and they fly on the recap and in Scout. Past opponents start in plain silver and navy until you dress them up.'],
  },
  {
    version: '2026.11.17-14',
    headline: 'Trimmed to Stand Out',
    lines: ['Every pennant and patch is trimmed in a thin outline now: your second color when it shows up on what’s behind it, cream on dark grounds and navy on the cream page when it doesn’t. A green team on the green board stands out like the rest.'],
  },
  {
    version: '2026.11.17-13',
    headline: 'Run Up the Pennant',
    lines: ['Your team flies a felt pennant now, the first color for the felt and the second down the staff and around the letters. Where it’s tight, a striped sleeve patch stands in. Light colors get a navy edge by day and every mark a cream one by night.'],
  },
  {
    version: '2026.11.17-12',
    headline: 'A Ribbon for the Batter',
    lines: ['The batter at the plate gets a gold ribbon down their row in the Book, like a bookmark, and the Book scrolls their row into view. The highlighter stays for runs.'],
  },
  {
    version: '2026.11.17-11',
    headline: 'The Coach’s Clipboard',
    lines: [
      'Scout is a clipboard now, one sheet with the field printed across it and the coach’s read written in by hand.',
      'Every chart marks the ball by shape: a ring for each base on a hit, a red circle for an out, an E for an error. A short sample is counted, not guessed at.',
    ],
  },
  {
    version: '2026.11.17-10',
    headline: 'Settings, Squared Away',
    lines: [
      'Settings is a tidy list now, grouped by the screen each one changes: Team, Games, and Book, where Ink and Book Names sit side by side.',
      'Game Settings reads the same way, the date says Tue, Nov 17, and the game clock leaves off the seconds.',
      'Every switch shows its pick in navy by day and cream by night. Gold stays for the batter and the runners.',
    ],
  },
  {
    version: '2026.11.17-9',
    headline: 'The Inning You’re In',
    lines: [
      'The Book always opens on the inning being played, all of it, even after your team bats around.',
      'The batter at the plate gets a gold box, the color of right now, and the name column is only as wide as your longest name, so there’s room for more innings.',
    ],
  },
  {
    version: '2026.11.17-8',
    headline: 'First Names in the Book',
    lines: [
      'The Book writes first names now, bigger, the way a scorer does, and two Codys each get an initial. Edit Team has Book Names if you keep score by last name.',
      'Out numbers, play codes, and the scorebook’s lines are all a size bolder, easy to read in the sun.',
      'The sample season is one slim line under each title, with Clear and Hide, and the bar at the very top now matches each screen.',
    ],
  },
  {
    version: '2026.11.17-7',
    headline: 'Flip the Card Over',
    lines: [
      'Stats now reads like the back of a baseball card: games, wins, losses, runs scored and allowed, then the team leaders in a printed table with ties on one line.',
      'The Team tab is a roster card, one ruled row per player with the number in its block. Tap + for another team, and tap the team’s name to switch.',
    ],
  },
  {
    version: '2026.11.17-6',
    headline: 'Both Colors, Wide Open Book',
    lines: [
      'Your team badge wears both colors again: the first color fills it and the second rings it, on the Team page, in Edit Team, and on the Recap.',
      'The scorebook page now runs edge to edge, and the names give the innings room, so four innings show at a glance. Pitch marks are bigger, too.',
      'Edit Team has one color grid with a Primary and Secondary switch on top, and the preview keeps score in real scoreboard bulbs.',
    ],
  },
  {
    version: '2026.11.17-5',
    headline: 'Rounded All Around',
    lines: ['The cream stripe around the Organ now rounds every corner the same, top and bottom, like a well-kept outfield sign.'],
  },
  {
    version: '2026.11.17-4',
    headline: 'The Organ Takes the Whole Field',
    lines: ['Open the Organ and the whole screen turns ballpark green, with a cream stripe painted around the edge and the Stretch button right there under the wheel.'],
  },
  {
    version: '2026.11.17-3',
    headline: 'Spin From Anywhere',
    lines: ['The Organ’s wheel answers wherever your thumb lands: begin a spin right over MENU or an arrow and it rolls right along, while a quick tap still does its job.'],
  },
  {
    version: '2026.11.17-2',
    headline: 'Full Wheel, Full Menu',
    lines: ['The Organ’s wheel is back to full size, the whole menu still fits on the first screen in neat, compact rows, and the close button sits inside the top corner of the frame.'],
  },
  {
    version: '2026.11.17-1',
    headline: 'The Whole Card at a Glance',
    lines: ['Open the Organ and every album is right there on the first screen, Rally down to Settings, no spinning needed. The close button sits neatly on the corner of the frame.'],
  },
  {
    version: '2026.11.16-15',
    headline: 'Organ, Top to Bottom',
    lines: ['The Organ now runs from the very top of the screen, with the close button tucked over its corner, and its rows stand a little taller to fill the screen edge to edge.'],
  },
  {
    version: '2026.11.16-14',
    headline: 'The Organ, in Home Colors',
    lines: [
      'The Organ steps out in ballpark green with a painted cream frame, an amber screen like the scoreboard’s, a navy wheel, and a gold button in the middle that you can feel press.',
      'It fills the screen now, keeps the inning and score at the top, shows the time left and what’s up next, and a fast spin of the wheel runs down the list in a hurry.',
    ],
  },
  {
    version: '2026.11.16-13',
    headline: 'Back in Fair Territory',
    lines: [
      'Balls from a first-version backup now land where they were hit, in fair ground, and moving one on a player’s card shows up on the chart right away.',
      'The organist plays Three Strikes on their strikeouts and Sousa’s National Game when we win, unless you picked something else. The words on the keys keep their margins, and the app’s words stay put when you touch them.',
    ],
  },
  {
    version: '2026.11.16-12',
    headline: 'Wall to Wall',
    lines: ['The Book’s scoreboard now stretches the full width of the iPhone, the same as the board on the Game tab.'],
  },
  {
    version: '2026.11.16-11',
    headline: 'Fresh Paint on the Boards',
    lines: ['Both scoreboards got a new coat: a cream stripe painted just inside the green edge and clean cream lines between every section, like the board out at the park. The rivets have been pried off for good.'],
  },
  {
    version: '2026.11.16-10',
    headline: 'Two Pages, Plainly Marked',
    lines: ['The Book’s pages now read Visitors and Home, the way a scorebook does, and the game menu keeps every game to one tidy line: “Nov 15 vs Poudre River Rats.”'],
  },
  {
    version: '2026.11.16-9',
    headline: 'The Book, Cleaned Up',
    lines: [
      'Open the Book during a game and it turns right to the inning being played, names held in place down the side, written as big as the line allows.',
      'The game you’re scoring wears a red LIVE tag, Share and the pencil for your ink sit up top by the title, the board’s count lights match the Game board’s, and the stadium lights have been taken down.',
    ],
  },
  {
    version: '2026.11.16-8',
    headline: 'Fresh Paint on the Tab Bar',
    lines: ['The tab bar is cream glass now, outlined in navy and floating just above the page, with the tab you’re on in a navy capsule lettered in gold. At night it turns to dark glass with cream letters.'],
  },
  {
    version: '2026.11.16-7',
    headline: 'Right to the Song',
    lines: ['No warm-up at the stretch anymore. The organ goes straight into “Take me out to the ball game,” the way everybody knows it.'],
  },
  {
    version: '2026.11.16-6',
    headline: 'Four Bars and Then Everybody Sing',
    lines: ['The stretch now leads in with just the last four bars of the verse before the chorus, the way the organist plays it at the old ballparks.'],
  },
  {
    version: '2026.11.16-5',
    headline: 'Straight From the Sheet Music',
    lines: [
      'Ladies and gentlemen, the stretch now comes in the middle of the inning two before the last: the 5th in a seven-inning game. It plays once, and the Organ has a Stretch button for a game that runs out of time first.',
      'Hit one over the limit and the organist answers with J. P. Skelly’s 1895 chorus about exactly that. Five tunes are read fresh from the original sheets, Sousa’s “The National Game” and “Tiger Rag” among them, and About credits every publisher and library.',
    ],
  },
  {
    version: '2026.11.16-4',
    headline: 'For the Record',
    lines: [
      'Rare Plays waits with a blank line for each one, and the day it happens, the check, the date, and the park go in by hand.',
      'Settings has an About page with who made the fonts, the music, and the weather, and the tab bar is frosted navy glass.',
    ],
  },
  {
    version: '2026.11.16-3',
    headline: 'Say It Once',
    lines: [
      'The play-by-play gets to the point: “Tasha Greer hits a grand slam to left-center field. Travis Pruitt Jr., Dev Raman, and Becca Lindqvist score.” The RBI only comes up when it didn’t go to the batter.',
    ],
  },
  {
    version: '2026.11.16-2',
    headline: 'Written in Your Hand',
    lines: [
      'The Book writes jersey numbers, positions, every move, and the inning a sub came in by hand now, the same pencil as the names and plays, and the first-pitch and final times too.',
    ],
  },
  {
    version: '2026.11.16-1',
    headline: 'The Tabs Stay Put',
    lines: [
      'The tab bar holds its spot at the bottom of every screen now, no matter how far you scroll. Every tab is one tap away, all game long.',
    ],
  },
  {
    version: '2026.11.15-9',
    headline: 'Quiet Between Pitches',
    lines: [
      'Balls, strikes, and fouls go by without a sound now, and a batter’s walk-up plays once, when they step in. When the visitors bat, the board keeps the same shape, ON DECK right where it belongs. And the Last Play line holds one size, still or sliding.',
    ],
  },
  {
    version: '2026.11.15-8',
    headline: 'Sharper Lines',
    lines: [
      'A play that can’t happen yet now looks it: a faded out key, or with Increase Contrast on, a plain gray key that can’t be mistaken for Undo or Lineups. Those three step back a little, the ScoreKept name has a crisp shadow, and the inning arrow got bigger.',
    ],
  },
  {
    version: '2026.11.15-7',
    headline: 'New Keys at the Scorer’s Table',
    lines: [
      'The buttons got a scorebook makeover. Hits are solid green, outs are cream circled in red pen, and Ball, Strike, and Foul wear a navy outline. Press a scoring key and it sinks into its edge. A play that can’t happen yet sits dimmed in its spot; tap it to hear why.',
      'Up on the board, the batter’s name gets bigger, with one line of numbers under it: the season before their first trip, today’s after. The inning arrow lights up in bulbs, and the walk-up button wears the music notes.',
      'Pages that need a yes or no now keep Cancel and Done along the top.',
    ],
  },
  {
    version: '2026.11.15-6',
    headline: 'One Way Off the Field',
    lines: [
      'Every page that saves as you go now closes the same way: the red ✕ beside its title. The extra Done bar at the bottom is gone, so there’s a little more room for what you came to see.',
    ],
  },
  {
    version: '2026.11.15-5',
    headline: 'A Tighter Lineup Card',
    lines: [
      'Edit Team tightens up: Team Name and Short Name share a row, the colors sit a touch bigger, and the red ✕ is back as the one way out. It all saves as you go.',
    ],
  },
  {
    version: '2026.11.15-4',
    headline: 'All 18 Colors, One Look',
    lines: [
      'Edit Team lays out every team color at once, six across and three down, with no swiping to find yours. The scoreboard preview stays put at the top while you scroll, and Done waits in the top corner, right where your thumb expects it.',
    ],
  },
  {
    version: '2026.11.15-3',
    headline: 'Silent Doesn’t Mean Quiet',
    lines: [
      'The organ plays even with your iPhone set to Silent. The speaker on the Game tab is now the one switch that quiets ScoreKept, and the first note pauses any music playing in another app.',
      'Stadium Sounds heads back to the press box for now, while we check where each one came from.',
    ],
  },
  {
    version: '2026.11.15-2',
    headline: 'From the Press Box',
    lines: [
      'The Organ gets a new album, Stadium Sounds: the air horn, the cowbell, the siren, the sad trombone, a swelling crowd, and nine more, straight from the soundboard.',
      'Something go wrong? Send Feedback now offers a short error log of what happened and when, and Settings has a Privacy page that says what stays on this iPhone (all of it) and the two times the app goes online.',
      'Help has a Known Issues page, so nothing catches you by surprise.',
    ],
  },
  {
    version: '2026.11.15-1',
    headline: 'By the Numbers',
    lines: [
      'Now batting: 3., AT BAT, the name, and #9 · 1B, with TODAY and SEASON on the lines below, and doubles and triples spelled out. The keys under the board are back to plain Title Case.',
      'The Book writes down where everyone played: each position, each move and the inning it happened, and when a sub came in.',
    ],
  },
  {
    version: '2026.11.14-14',
    headline: 'Your Colors, Up in Lights',
    lines: ['Edit Team and setup look like the originals again: your team on a little broadcast scoreboard up top, the color circles under it, and Big League Colors in one menu.'],
  },
  {
    version: '2026.11.14-13',
    headline: 'Batter Up, in Big Letters',
    lines: [
      'The batter’s name gets bigger, with AT BAT in gold over the jersey number, and On Deck lines up the same way. Ball, Strike, Foul, Undo, Lineups, and Defense now read as big as the hit codes, home plate is a real five-sided plate, and the umpire saves his voice for ball four and strike three.',
      'Their batting order goes in one row per batter again, with + Add Batter, and a pasted list fills the rows.',
    ],
  },
  {
    version: '2026.11.14-12',
    headline: 'Running Game',
    lines: [
      'Tap a runner for a quick menu right on the scoreboard: advance, score, out, or back one base after a play. Between pitches it follows your rules, so slowpitch keeps it to an out on the bases and a courtesy runner; steals and wild pitches show up only where the rules allow them. On a fielder’s choice or double play with traffic, just tap the runner who was out, and a ground out moves the forced runners up.',
      'Jersey numbers ride along with every name, the Book’s light towers burn at night, its boxes keep the pitches and RBI in their corners, and every title wears the team lettering.',
    ],
  },
  {
    version: '2026.11.14-11',
    headline: 'Now Batting, by the Numbers',
    lines: [
      'The scoreboard gets its new paint and a proper banner: spot, AT BAT, name, number, and position, with today over the season right underneath and On Deck along the bottom. The last play runs across the foot of the board, runs in gold.',
      'The app now starts below the iPhone’s clock, so the tab bar sits where it belongs from the first pitch, and the sample season plays like a real one: doubles to the outfield, grounders to the infield.',
    ],
  },
  {
    version: '2026.11.14-10',
    headline: 'Tab Bar Takes Its Spot',
    lines: ['The tab bar now settles just above the Home indicator the moment the app opens, not after a trip to another tab, and the buttons fill the room it leaves.'],
  },
  {
    version: '2026.11.14-9',
    headline: 'Now Batting, in Big Letters',
    lines: ['The batter gets the whole top line, first name biggest, with their position and today on the line below. Walk-Up is a round ♪ button that turns gold on a birthday, and On Deck waits in the corner by third base. Prefer the full name one size? Settings, Batter’s Name.'],
  },
  {
    version: '2026.11.14-8',
    headline: 'Plain English at the Plate',
    lines: ['The batter’s line reads in plain words now, like 1-for-2 · Foul Out, 2B, and the codes stay in the Book. The play line is called Last Play, and the tab bar settles down just above the Home indicator to give the buttons a little more room.'],
  },
  {
    version: '2026.11.14-7',
    headline: 'Fresh Chalk, Clean Bags',
    lines: [
      'The scoring keys are plain and matte now, the bases are clean rubber with home plate set at the same angle, and the whole Game screen reads in the board’s own lettering.',
      'When time runs out, the clock reads 0:00 under Last Inn. The weather takes the night off for now, and the sample team has a whole new roster.',
    ],
  },
  {
    version: '2026.11.14-6',
    headline: 'Sized for Every Seat in the House',
    lines: ['The Game screen now sizes itself to the iPhone or iPad in your hand: the smallest iPhone fits without scrolling, an iPad fills the screen with bigger keys, and turned sideways both teams keep their names and runs on the board.'],
  },
  {
    version: '2026.11.14-5',
    headline: 'Bigger Buttons, Same Places',
    lines: ['The scoring buttons grow to fill your screen with bigger words, and an out that can’t happen keeps its name in chalk so you always know what goes there.'],
  },
  {
    version: '2026.11.14-4',
    headline: 'Every Key in Its Place',
    lines: [
      'The out keys never move now: one that can’t happen leaves a chalk outline in its spot. The board says what you just scored, Undo says what it will take back, and the diamond moved inside the scoreboard with every runner’s name beside their base.',
      'The inning has its own label and arrows, a lamp lights for the team at bat, and the weather got bigger.',
    ],
  },
  {
    version: '2026.11.14-3',
    headline: 'Today’s Weather at the Ballpark',
    lines: [
      'The board reads the temperature and the sky once the game gets going, with the time of day across from it, and the Book keeps the weather for the record.',
      'The buttons up top are brushed aluminum now, and Key Clicks in Sounds gives every scoring key its own little click.',
    ],
  },
  {
    version: '2026.11.14-2',
    headline: 'Infield Fly, Batter’s Out',
    lines: ['The infield fly rule joins the out keys. It shows up only with runners on first and second and fewer than two outs, and steps aside the rest of the time, like the double play and the sac fly.'],
  },
  {
    version: '2026.11.14-1',
    headline: 'Built From the Ballpark',
    lines: [
      'Ball, Strike, and Foul are stitched leather now, the hits sit on turf with a strip of base tread, the outs are on infield clay inside a chalk line, and Undo, Lineups, and Defense are brushed aluminum.',
      'Sac Fly, Double Play, Triple Play, and HR Out only show up when they can happen, so the rest of the outs get more room.',
    ],
  },
  {
    version: '2026.11.13-15',
    headline: 'Let’s Go to the Replay',
    lines: [
      'Watch Replay on the Book plays any game back on the field: the ball goes out, the runners come around, and the score ticks along, play by play.',
      'The bases picked up their side plates and corner caps, long names shrink to fit on the board, and the Oak Hollow Sluggers are the Owls now.',
    ],
  },
  {
    version: '2026.11.13-14',
    headline: 'A Steadier Tab Bar',
    lines: ['The tab bar is solid from the first moment the app opens, with no fade-in behind its labels.'],
  },
  {
    version: '2026.11.13-13',
    headline: 'Now Batting, Underlined',
    lines: ['A gold bar marks the team at bat, the bases have a sharper edge for sunny days, unlit lamps go dark so the count jumps out, and the batter’s line trims itself instead of trailing off.'],
  },
  {
    version: '2026.11.13-12',
    headline: 'Easier on the Eyes',
    lines: [
      'Bigger words on the buttons, stronger contrast in Dark Mode, and the app now runs right up under the clock.',
      'Out buttons are outlined and the reach-base buttons stay filled, so they read apart even if red and green look alike to you. When the next pitch ends the at-bat, its button says Out or Walk.',
    ],
  },
  {
    version: '2026.11.13-11',
    headline: 'The Tab Bar Takes a Seat',
    lines: [
      'Scroll down the Book, Stats, Scout, or Team and the tab bar tucks into a circle, with a little scoreboard beside it while a game is on. Tap the scoreboard to get back to the game, or the circle for every tab.',
      'The tab you’re on now shows its icon in solid gold, and Stats has a new bar chart.',
    ],
  },
  {
    version: '2026.11.13-10',
    headline: 'Fresh Bags on the Field',
    lines: [
      'The scoreboard bases are low, rounded, and molded like the real ones, and a runner’s base turns gold without the haze.',
      'In the Book, plays slide under the names when you scroll, and when the order bats around, the second trip gets its own box beside the first.',
    ],
  },
  {
    version: '2026.11.13-9',
    headline: 'The Bags Got Bigger',
    lines: ['The bases on the scoreboard are bigger again, with first and third set lower and tucked in close to second, like the infield from the press box.'],
  },
  {
    version: '2026.11.13-8',
    headline: 'Now Batting, in Big Letters',
    lines: [
      'The batter’s name gets the top of the board in bigger letters, with today’s line beside it and On Deck right underneath. The clock counts the seconds the whole game, the bases got bigger, and short names can run six letters.',
      'In the Book, the slash where a half-inning ends is a short, light tick through the corner.',
    ],
  },
  {
    version: '2026.11.13-7',
    headline: 'A Lighter Hand on the Slash',
    lines: ['The half-inning slash is back across the corner where it belongs, now a clean pencil line instead of a heavy marker stroke.'],
  },
  {
    version: '2026.11.13-6',
    headline: 'Tuned for the Little Speaker',
    lines: ['Mars and Rex Tremendae moved up where an iPhone speaker can carry them, and The Base Ball Polka came down from the rafters.'],
  },
  {
    version: '2026.11.13-5',
    headline: 'All Rise for the Anthem',
    lines: [
      'The Star-Spangled Banner opens the Pregame album, the 1812 Overture finale fires off under Celebrate, and Mars and Mozart’s Rex Tremendae join the Walk-Ups.',
      'The slash where a half-inning ends in the Book is back to a regular stroke, just heavier, and stays inside its box.',
    ],
  },
  {
    version: '2026.11.13-4',
    headline: 'Two Strikes and You’re Out, by the Book',
    lines: [
      'Strike works on every pitch now. When the next strike is the out, Strike and Foul turn red, and Strike rings him up swinging. Called third strike? The backwards K.',
      'The Organ got bigger, and Settings at the bottom of its menu takes you straight to every sound setting.',
    ],
  },
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
      'Now Playing on the Organ shows who wrote each tune, right under its name.',
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
      'The Organ has a wheel now: slide your thumb around to scroll, press the middle to open an album or play a tune, and MENU to go back. Each click of the wheel ticks softly, and on newer iPhones you can feel it too.',
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
