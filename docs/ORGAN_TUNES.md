# Music research: organ tune candidates

Sources so far: the Library of Congress Baseball Sheet Music collection (three batches), the Library of Congress bibliography "Baseball's Greatest Hits" (third revised edition, Clermont and Walden, 2023), Brian Lauritzen's "Mozart at the Bat" (2015), and the All is Yar follow-up list (2015).

Steve is collecting public-domain sheet music from the Library of Congress baseball sheet-music collection for the Organ. This file tracks which titles are worth adding. The coding bot can't reach loc.gov, so Steve downloads each PDF and sends it. Take the melody (and basic harmony) from the piano part; note the source in code and README.

**Public-domain check:** anything published in the US in 1930 or earlier is public domain. Items marked "date?" have no date in the listing; confirm the year on the PDF's title page before using.

**Full catalog:** `docs/LOC_BASEBALL_PD.csv` lists all 395 public-domain-era entries (1930 or earlier) from the 2023 bibliography, with year, composer, format and LC call number. 97 are instrumental (marches, two-steps, rags, galops, polkas, waltzes). The bibliography is a catalog only; the scores themselves are in the LoC Baseball Sheet Music digital collection (most pre-1923 items are scanned).

**Proposed home on the Organ:** a new **Vintage Ballpark** playlist, plus the moment noted for each tune.

## Top picks

| Tune | Composer | Year | Excerpt to use | Length | Best moment |
| --- | --- | --- | --- | --- | --- |
| Take Me Out to the Ball Game | Von Tilzer / Norworth | 1908 | Last 4 bars of the verse as a pickup, then the full chorus once. Skip the Katie Casey verse. See the Excerpts section. | 35–40 s | The stretch: 7th inning (9 innings), 5th (7 innings), plus a manual button |
| Tiger Rag | Nick LaRocca | 1917 | Final strain, the call with the break after it, first 8 bars. Music only (the 1932 "Hold that tiger" words are still protected). | 8 s | Rally |
| Over the Fence Is Out | J. P. Skelly (also McMillan, Basler) | 1895–98 | The 8 bars of the chorus where the title is sung | 6–8 s | HR Out (over the league limit), auto-plays |
| 1 Strike, 2 Strikes, 3 Strikes, Out!! | Ed Gardenier / Ed Rogers | 1901 | The chorus line that counts the strikes, ending on "Out!" | 5–6 s | Strikeout |
| Casey at the Bat | Sidney Homer (Op. 37 No. 3) | 1920 | The closing bars (the setting of "mighty Casey has struck out"), music only | 6–8 s | Strikeout of the other team's best hitter (manual) |
| Home Run Galop | Edward M. Read (1903); F. W. Root (1867); Fortier "Home Run Gallop" (1909) | 1867–1909 | Opening strain, first 8 bars, at full galop tempo. Pick the one scan with the clearest print. | 6–8 s | Home run |
| Slide, Kelly, Slide! | J. W. Kelly | 1889 | The chorus phrase where the title is sung, 4–8 bars | 5–6 s | Runner scores on a close play, stolen base |
| Let's Get the Umpire's Goat | Nora Bayes / Jack Norworth | 1909 | The title phrase from the chorus, 4 bars | 4–5 s | A bad call (manual only) |
| The Easy Winners | Scott Joplin | 1901 | First strain (A), 16 bars, can loop with a fade | 20–30 s | Between innings, after a win |
| I Won't Go Home 'Til the Last Man's Out | Rivarde / Kurtz / Brautigam | 1912 | The title phrase from the chorus, 8 bars | 6–8 s | Start of the last inning (or LAST INN on the clock) |

## Excerpts for the first five (Steve's downloads, 2026-11-15)

These five are downloaded; their excerpts are firm. Excerpts in the other tables are the plan; confirm the bars once Steve sends each PDF.

General rules (apply to every tune in this file): strikeout/HR/out cues 4–8 s; rally 6–10 s; between innings 20–60 s with a fade; the stretch is the only full chorus. Cut on phrase boundaries (4 or 8 bars) and end on the home chord, never mid-phrase. Use the melody and a simple bass line from the piano part; no lyrics on screen or in code. Log the bar range in `sources.txt`. If a score has words under the notes, use them to find the hook bar.

| File | Excerpt | Length | Trigger |
| --- | --- | --- | --- |
| `von-tilzer_take-me-out_to_the_ball_game_1908_imslp.pdf` (IMSLP #574949, the 1908 York scan; not the CC-licensed trombone arrangement) | Last 4 bars of the verse as a pickup, then the full chorus ("Take me out to the ball game…") once. Skip the Katie Casey verse. | About 35–40 s | The stretch: middle of inning (scheduled innings − 2). 7th in a 9-inning game, **5th in a 7-inning game**, 4th in a 6-inning game. Plays after the top half ends. Also a manual Stretch button on the Organ, since time-limited games may end before the auto cue. Never plays twice in one game. |
| `la-rocca_tiger-rag_1917_imslp.pdf` (IMSLP scans are later Feist printings of the 1917 plate) | The final strain: the famous call with the break after it, first 8 bars. Music only. The "Hold that tiger" words are Harry De Costa's 1932 lyrics and stay under copyright until 2028. If the printing has words, ignore them. | About 8 s | Rally: runners in scoring position, or a run scores while trailing |
| `skelly_over-the-fence-is-out_1895_loc.pdf` | The chorus phrase where the title is sung, 8 bars, located by the lyric under the notes | About 6–8 s | **HR Out**: a home run over the league limit is scored as an out (Fort Collins rule). Auto-plays on that event only, replacing the normal home run cue. |
| `bauer_three-strikes-two-step_1902_levy.pdf` (Johns Hopkins Levy collection) | The intro plus the first 4 bars of the first strain, ending on a cadence. If the intro has a three-note or three-chord figure, end on it. | About 5 s | Strikeout (a looking or swinging third strike) |
| `sousa_the-national-game_1925_imslp.pdf` (band parts only, 32 pp.) | Pregame: intro plus the first strain, no repeat. Win: the last 16 bars of the final trio. Melody from the solo/1st cornet part, bass from the tuba part. The LoC also holds the 1925 piano score (M28.S), which is easier if Steve can get it. | About 20 s pregame, about 15 s for the win | Pregame / Play Ball, and Final: our team wins |

Keep the downloaded PDFs out of the public repo. Only the transcribed notes and the source credit go in code.

## New finds from the 2023 bibliography

Instrumental pieces are the best fit: a piano score is already an organ part. Look for these in the LoC Baseball Sheet Music collection.

| Tune | Composer | Year | Format | Excerpt to use | Best moment |
| --- | --- | --- | --- | --- | --- |
| The National Game | John Philip Sousa | 1925 | Band parts (IMSLP); piano score at LoC | Pregame: intro + first strain. Win: last 16 bars of the final trio. | Pregame / Play Ball; our team wins. The biggest find. |
| Pennant Rag | Percy Wenrich | 1913 | Piano score | First strain, 16 bars, loops with a fade | Between innings |
| The Climbers Rag | Arthur Sizemore | 1911 | Piano score (Stark, Joplin's publisher) | First strain, 16 bars, loops with a fade | Between innings |
| Base Ball Rag | Mata Wulff | 1910 | Piano score | First strain, 8 bars | Rally (alternate to Tiger Rag) |
| Slivers: Rag Eccentric | Harry Cook | 1909 | Piano score | The most lopsided-sounding 4 bars (the "eccentric" figure) | Error by the other team (manual) |
| Medley Overture: Slide Kelly Slide | J. W. Kelly, arr. Faetkenheuer | 1889 | Orchestral parts | Skip; use the song version above unless that scan is unreadable | — |
| Three Strikes Two-Step | A. W. Bauer | 1902 | Piano score | Intro + first 4 bars of the first strain | Strikeout |
| Home Run Quick Step | John Zebley Jr. | 1861 | Piano score | First strain, 8 bars | Home run (alternate to the Galop) |
| Over the Fence Is Out Waltz | Horace R. Basler | 1896 | Piano score | Opening theme, 8 bars (it quotes the song's hook) | HR Out alternate |
| Play Ball, A Descriptive One Step | Walter B. Rogers | 1917 | Piano score | Intro + first 8 bars | First pitch |
| Rooters March-Two-Step | John F. Barth | 1911 | Piano score | First strain, 8 bars | Crowd rally |
| The Temple Cup Two-Step March | John W. Cavanagh | 1894 | Piano score | Intro + first strain | Pregame for playoff / championship games |
| World's Champion March | J. Palladino | 1911 | Piano score | Final trio, last 16 bars | Championship win |
| Take Your Girl to the Ball Game | George M. Cohan and others | 1908 | Piano-vocal | The full chorus once | Stretch alternate |
| The Base Ball Glide | Harry Von Tilzer | 1911 | Piano-vocal | Chorus, 16 bars | Between innings |
| Did He Run? | Albert Von Tilzer | 1909 | Piano-vocal | The title phrase from the chorus, 4 bars | Stolen base |

**Watch out:**
- Only Sidney Homer's 1920 "Casey at the Bat" is public domain. The 1945 Disney score and every later setting (Schuman, Kapilow and others) are still protected.
- "Take Me Out to the Ball Game" exists in 1908 and 1927 editions; both are public domain. The 1908 is the original.
- Appendix C (titles not held by the Music Division) and Appendix D (post-1978 unpublished copyright deposits) aren't useful: no scans, and nearly all are still under copyright.

## Good for variety

| Tune | Composer | Year | Moment |
| --- | --- | --- | --- |
| Take Your Girl to the Ball Game | George M. Cohan, Jerome, Schwartz | 1908 | Between innings |
| Put the Ball Over the Pan, McCann | W. F. Peters | 1910 | Opponent pitcher walking people |
| The Umpire Is a Most Unhappy Man | Joseph E. Howard (from The Umpire) | 1905 | Bad call, alternate |
| Finnegan the Umpire | Monroe Rosenfeld | date? | Bad call, alternate |
| Steal! Slide! Anyway! | Mascotte / Duncan | date? | Close play on the bases |
| Batter Up, Uncle Sam Is at the Plate | Harry Von Tilzer | date? (likely 1917–18) | Walk-up |
| Three Strikes: Two-Step | Bauer | 1902 | Strikeout alternate, walk-up |
| Home Run Polka | W. J. Bodell | 1867 | Home run alternate |
| Home Run Quick Step | John Zebley Jr. | date? | Home run alternate |
| Three Cheers! Base-Ball Is a Grand Old Game | Gaskill / Parker | date? | Pregame |
| Rooters March | John F. Barth | date? | Rally, pregame |
| Play Ball: March-Two Step | John Lind | 1910 | Pregame |
| Pennant Rag | Percy Wenrich | date? | Between innings |
| World's Champions March / Our Champion's March / The Triumphant March | Palladino / Franklin / Hunt & Glass | date? | We win |
| The Baseball Glide | Harry Von Tilzer | date? | Between innings |
| King of Clubs | William Brede | date? | Between innings |
| National League Two Step; Gotham March; Ball Club March; Union Base Ball March | various | 1882–1896 and date? | Pregame marches |
| Base Ball Polka, Base Ball Quadrille, Base Ball Quickstep, Base Ball Waltz | various | 1885 and date? | Vintage filler, between innings |
| Bat and Ball March | Julius E. Müller | 1880 | Easy children's piece; Little League pack |
| Attaboy ("That's the Boy") | Bert C. Wilson / Robert H. Brennen | 1917 | A great play by our team, or a walk-up |
| The Baseball Smile: An American Marching Song | Ernest Bradley / Dorothy Deane | 1918 | Pregame march |
| Excelsior Galop | A. C. Gerhard | 1876 | Home run or rally alternate |
| Bat and Ball | E. Mack | 1880 | Vintage filler |

## Classical walk-ups (from two blog lists: Brian Lauritzen's "Mozart at the Bat" and a follow-up on All is Yar)

Most of that list is still under copyright in the US. Public domain means published in 1930 or earlier; publication date counts, not when it was written. Free sheet music for the usable ones is on IMSLP (imslp.org); Steve downloads the PDFs.

**Usable (public domain):**

| Piece | Year | Moment | Organ fit |
| --- | --- | --- | --- |
| Holst, "Mars, the Bringer of War" (The Planets) | published 1921 | Taking the field, a big out, cleanup walk-up | Excellent: the pounding 5/4 rhythm and brass chords are recognizable and very organ-friendly |
| Mozart, Requiem, "Rex tremendae" | 1791 | Cleanup walk-up (Prince Fielder's real MLB walk-up) | Excellent: choral chords made for a pipe organ |
| Stravinsky, The Firebird, "Infernal Dance" | 1910 | Walk-up that makes the stands jump | Good: that first slammed chord. Use the original 1910 ballet score; the 1919 and 1945 suites are newer editions |
| Berlioz, Symphonie fantastique, "March to the Scaffold" | 1830 | Opponent's big hitter, or a rally | Good: a march with big brass stabs |
| Berlioz, Requiem, "Tuba mirum" | 1837 | Cleanup walk-up | Good: brass fanfares |
| Brahms, Symphony No. 1, opening | 1876 | Number 3 hitter | Good: heavy pounding pedal notes |
| Mahler, Symphony No. 8, opening ("Veni, creator spiritus") | 1910 | Cleanup hitter walk-up, pregame | Excellent: it opens on a huge organ chord |
| Chopin, Étude Op. 10 No. 12 "Revolutionary" | 1833 | Bases loaded, tense at-bat | Good: the storming left-hand run and big chords |
| Gershwin, Piano Concerto in F, 1st movement (opening) | 1925 (published 1927) | Big hitter walk-up | Fair: the Charleston rhythm works; the full piece is long, so use a short cut |
| Stravinsky, The Rite of Spring | 1913 | Intimidating walk-up | Fair: the stomping "Augurs" chords work on organ better than "Dance of the Earth" |
| Prokofiev, Scythian Suite, "Dance of the Pagan Monsters" | published 1923 | Intimidating walk-up | Fair: chaotic on an organ |
| Bartók, The Miraculous Mandarin, opening | published 1925–27 | Intimidating walk-up | Poor: frantic strings; confirm the edition's date before using |
| Haydn, Symphony No. 48 "Maria Theresa," opening | about 1769 | Between innings | Fair: bright fanfare, but low recognition |

**Not usable (still under copyright):** Orff, "O Fortuna" from Carmina Burana (1937); John Adams, Harmonielehre; the rock walk-ups the post mentions (Crazy Train, Hells Bells, Enter Sandman, Turn Down for What, Shake It Off); Andrew Norman, Gran Turismo; Copland, The Red Pony; Meredith Willson, "Ya Got Trouble"; Bernard Herrmann, Psycho; Revueltas, Ocho por Radio (1933); Bernstein, "Jeremiah"; John Adams, Short Ride in a Fast Machine; Ives, Three Places in New England (published 1935); Lutosławski, Concerto for Orchestra; Shostakovich, Symphony No. 10.

**Ideas worth borrowing (as originals, never copies):** short shrieking organ "stabs" for a bases-loaded cleanup hitter, and a fast patter tune for a leadoff hitter. The bigger idea is walk-ups matched to batting-order roles (see BACKLOG).

## Dramatic classics for the Organ (Steve's sheet-music shopping list)

Every piece here was published long before 1931, so the music is public domain in the US. Download from **IMSLP (imslp.org)** and pick an edition published before 1931 (modern arrangements can carry their own copyright). A piano reduction or organ arrangement is easiest for the bot to read. Take only the excerpt listed. Already in the app or listed above, so not repeated: Toccata in D minor, Hallelujah Chorus, William Tell Galop, Ode to Joy, 1812 finale, Funiculì, Mars, Rex tremendae, Firebird, March to the Scaffold, Mahler 8, and the others above.

### Big hits, home runs, rallies

| Piece | Composer, year | Excerpt to use | Moment |
| --- | --- | --- | --- |
| Ride of the Valkyries | Wagner, 1870 | The main horn theme over the galloping rhythm | Home run, a big rally |
| Also sprach Zarathustra, opening | Richard Strauss, 1896 | The sunrise fanfare (C–G–C, the big chord, the timpani) | Home run, a towering fly, a cleanup walk-up |
| In the Hall of the Mountain King | Grieg, 1876 | The theme from quiet to fast and loud | Rally that builds batter by batter |
| Zadok the Priest | Handel, 1727 | The long build to the choir's first shout | Pregame, a huge at-bat (the Champions League anthem is a modern arrangement based on it; use Handel's original only) |
| Toreador Song, and the Prelude to Act 1 | Bizet, Carmen, 1875 | The Toreador refrain; the prelude's opening march | Big hitter walk-up, rally |
| Light Cavalry Overture | Suppé, 1866 | The cavalry gallop | Rally, runners in motion |
| Anvil Chorus | Verdi, Il trovatore, 1853 | The hammer-beat chorus | Clap-along rally |
| Hungarian Rhapsody No. 2 | Liszt, 1851 | The fast friska ending | Rally, a wild inning |
| Trepak (Russian Dance) | Tchaikovsky, The Nutcracker, 1892 | The whole one-minute dance | Fast rally, extra-base hit |
| Flight of the Bumblebee | Rimsky-Korsakov, 1900 | The racing chromatic line | Speedy runner, infield hit |

### Tension: full counts, bases loaded, their big hitter

| Piece | Composer, year | Excerpt to use | Moment |
| --- | --- | --- | --- |
| Symphony No. 5, opening | Beethoven, 1808 | "Da-da-da-DUM" and the next few bars | Two strikes, full count |
| Dies irae (Requiem) | Verdi, 1874 | The crashing opening chords | Their slugger, bases loaded |
| Dies irae (Requiem) | Mozart, 1791 | The opening choral outburst | Bases loaded |
| Night on Bald Mountain | Mussorgsky (Rimsky-Korsakov edition, 1886) | The opening string storm | Opponent rally, late-inning tension |
| Prelude in C-sharp minor | Rachmaninoff, 1892 | The three bell chords | A big moment, two outs |
| Danse macabre | Saint-Saëns, 1874 | The fiddle theme | Spooky moment, Halloween game |
| The Sorcerer's Apprentice | Dukas, 1897 | The marching broom theme | Things getting out of hand |
| Toccata (Suite gothique) | Boëllmann, 1895 | The pounding opening | Last inning, close game |
| Little Fugue in G minor, BWV 578 | Bach, about 1707 | The opening subject | Between innings, tight game (an organ original) |

### Wins, walk-offs, celebrations

| Piece | Composer, year | Excerpt to use | Moment |
| --- | --- | --- | --- |
| Toccata (Organ Symphony No. 5) | Widor, 1879 | The opening, the most famous organ showpiece after Bach | Walk-off, win |
| Organ Symphony, finale | Saint-Saëns, 1886 | The huge organ entrance | Win, walk-off |
| Carillon de Westminster | Vierne, 1927 | The chime-tune opening | Final out, win |
| Pomp and Circumstance March No. 1 | Elgar, 1901 | The trio tune ("Land of Hope and Glory") | Win, season finale |
| See, the Conquering Hero Comes | Handel, 1747 | The chorus tune | Win, player of the game |
| Triumphal March | Verdi, Aida, 1871 | The trumpet theme | Win, taking the lead |
| The Great Gate of Kiev | Mussorgsky, Pictures at an Exhibition (piano original, 1874) | The opening chorale | Win, championship |
| Jupiter, middle theme | Holst, The Planets, published 1921 | The broad hymn tune | Season-ending win |
| The Stars and Stripes Forever | Sousa, 1897 | The trio and piccolo strain | Fourth of July game, win |
| The Liberty Bell March | Sousa, 1893 | The main march | Between innings |

### Fun and taunts

| Piece | Composer, year | Excerpt to use | Moment |
| --- | --- | --- | --- |
| Funeral March (Piano Sonata No. 2) | Chopin, 1840 | The opening "dum dum da-dum" | Strikeout taunt, opponent eliminated |
| Entry of the Gladiators | Fučík, 1897 | The circus run | An error |
| Can-Can (Galop infernal) | Offenbach, 1858 | The can-can tune | Runs scoring, a sloppy inning |
| Dance of the Hours | Ponchielli, 1876 | The fast finale | Between innings |
| Hungarian Dance No. 5 | Brahms, 1869 | The main theme | Between innings |
| Largo al factotum ("Figaro, Figaro") | Rossini, 1816 | The "Figaro" calls | A player doing everything |
| Wedding March | Mendelssohn, 1843 | The opening fanfare | A teammate's wedding week |
| Twelfth Street Rag | Euday Bowman, 1914 | The main rag | Between innings |
| The Blue Danube | Johann Strauss II, 1867 | The main waltz | Calm between innings, rain delay |

### People will ask for these, but they're still under copyright (don't use)

Sabre Dance (Khachaturian, 1942), "O Fortuna" (Orff, 1937), the Imperial March and Star Wars themes, the Jaws theme, the Psycho strings, the Mission: Impossible theme, "Seven Nation Army", "Zombie Nation", "We Will Rock You", and the modern Champions League anthem.

## Ready-made public domain recordings (no sheet music needed)

Real recordings Steve can use as files, separate from the organ tunes the bot builds from sheet music:

- **Musopen (musopen.org):** recordings of classical pieces released into the public domain. Check each recording's page; free accounts have a daily download limit. Good for many pieces in the dramatic-classics list.
- **United States Marine Band (marineband.marines.mil):** recordings by a US government band are public domain. "The Complete Marches of John Philip Sousa" offers free recordings and scores of the public-domain marches (The Stars and Stripes Forever, The Liberty Bell, The Washington Post, and more).
- **US recordings published in 1925 or earlier** are public domain (one more year joins every January 1). That includes period recordings of Take Me Out to the Ball Game (1908), Tiger Rag (Original Dixieland Jass Band, 1918), and 1925 old-time country by Uncle Dave Macon and Ernest Stoneman. Find them through UCSB's Discography of American Historical Recordings and the Library of Congress National Jukebox. Use an archive transfer of the original, not a modern remaster, and confirm the original recording year.

## Skipped, and why

- **Ethnic or racial caricature** (common in comic songs of that era, and the app shows tune titles on screen): Hi! Yi! Yer Off Now!, The Yiddisher Baseball Game, Jake! Jake! The Yiddisher Ball-Player, Ikey My Base-Ball Mash, Abie the Agent, One-a-Strike (likely an Italian-dialect comic song), Husky Hans (likely a German-dialect comic song), Base Ball: Cake Walk, Base Ball by George Cragg / The Dockstaders (minstrel troupe), and the Slide Kelly Slide medley overture (it includes a song with a slur in its title).
- **Real players or pro teams in the title:** the Babe Ruth and Ty Cobb songs, Red Sox, Cubs, Tigers, Phillies, Orioles, Reds, Giants, White Sox, and Federal League songs. Fine historically, but they put real names in the app for little payoff. (The White Sox March and Gotham March melodies are fine if retitled; ask Steve.)
- **Love songs with baseball puns** (You've Made a Home Run with Me, The Game of Love, Hitting a Thousand in the Game of Love, and similar): the melodies are fine, but the titles don't fit a ballpark moment.
- **World War I songs** (Uncle Sam Will Strike the Kaiser Out, Bobby the Bomber, Buy a Liberty Bond, Playing Baseball on the Western Front): wartime titles that don't fit a rec game.
- **Not a ballpark fit:** Re-incarnation, Chippewa Mazurka, The Schoolboy. Dat's Me and Martha Ann (1874) is likely a minstrel dialect song.
- **The Baseball Rag (Noël Coward):** undated, and Coward's work may be newer than 1930. Skip unless the PDF shows 1930 or earlier.

## Built so far (status, kept by Claude)

In `src/sound/tunes.ts`, each with its publisher and library (shown in Settings, About, From the Sheet Music). Bar ranges are in `src/sound/sources.txt`.

- **Shipped 2026.11.16-5 and -6 from the excerpts above:** Take Me Out (pickup + chorus, about 35 s, the stretch rule and the Organ's **Stretch** button); Tiger Rag (8 bars, Rally album); Over the Fence Is Out! (8 bars, auto on every HR Out); Three Strikes Two-Step (intro + the first strain's opening run to the home chord, about 6 s; pickable for Strikeout); The National Game (pregame, about 22 s, read from the Marine Band edition's solo cornet line; Finale, the last 16 bars, pickable for We Win).
- **Earlier:** The Base Ball Polka, Tally One for Me, Home Run Galop (Read, 1903), Funiculì, Funiculà, The Star-Spangled Banner, the 1812 finale, Mars, Rex Tremendae.
- **Open:** the Vintage Ballpark playlist (today these sit in Rally, Celebrate, Pregame, and Between Innings); whether Three Strikes and the National Game Finale become the default Strikeout and We Win sounds (asked Nov 16); `docs/LOC_BASEBALL_PD.csv` is referenced above but isn't in the repo yet.
