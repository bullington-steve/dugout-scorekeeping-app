# ScoreKept Master Specification and Color Token Sheet

Steve, Nov 14, 2026. The scoreboard on the Game screen is locked to this spec; the rest of the app follows it screen by screen. Design principle: **"Nothing the real object doesn't have."** Authentic stadium scoreboard hardware and paper scorebook realism, paired with clean, untextured, high-contrast daylight controls.

Each item is marked **Built** (with the version), **Next** (on the roadmap in `docs/BACKLOG.md`), or **Differs** (built another way, with the reason; Steve can overrule).

## Part 1: Color tokens

Locked in `src/styles/tokens.css` as `--sk-*` (Built, 2026.11.14-11). Every other color token points at one of these.

| Token | Value | Use |
| --- | --- | --- |
| `--sk-green-deep` | #0F291A | Recessed LAST PLAY strip, bezel dividers, dark edges |
| `--sk-green-primary` | #163B25 | The scoreboard, AT BAT banner, Book line score |
| `--sk-green-surface` | #1E4D31 | Raised cards, active rows |
| `--sk-green-action` | #245C3A | Reach keys (1B, 2B, 3B, HR, BB, E, FC) |
| `--sk-green-muted` | #7A9684 | A dimmed green key |
| `--sk-cream-canvas` | #F3EFE4 | The scorebook paper behind every screen |
| `--sk-cream-ruled` | #E3DEC9 | Ruled lines, card dividers |
| `--sk-button-chalk` | #FAF8F2 | Ball, Strike, Foul |
| `--sk-metal-utility` | #D6D9DD | Undo, Lineups, Defense |
| `--sk-metal-lip` | #9EA4AC | Their bottom edge |
| `--sk-base-white` | #F4F4F0 | Empty bases and home plate |
| `--sk-light-housing` | #2A3038 | Field light towers (Book) |
| `--sk-light-lens-off` | #B8C0C8 | Unlit lenses |
| `--sk-light-lens-on` | #FFFDF5 | Lit lenses, light shows |
| `--sk-navy-anchor` | #1B2A4A | Tab bar, wordmark, active switches |
| `--sk-gold-runner` | #F2B728 | Occupied bases, possession lamp, runs and RBI |
| `--sk-led-amber` | #F7A81B | Bulb digits, lit Ball lamps |
| `--sk-led-unlit` | #24382B | Unlit bulbs and lamps |
| `--sk-clay-out` | #B8432E | Out keys' frames, OUT tags |
| `--sk-clay-tint` | #F8EFEA | Inside an out key |
| `--sk-ink-light` | #F8F6F0 | Ink on green and navy |
| `--sk-ink-muted-green` | #A8C4B2 | Labels on green |
| `--sk-ink-dark` | #182238 | Ink on chalk, cream, and metal |

**Differs (house style: 7:1 for text):** three spec colors measure under 7:1 as small text, so a text shade sits beside each, and the spec value stays for frames and fills: `--sk-gold-ink` #F4BE36 (gold on the green was 6.9:1), `--sk-clay-ink` #8E2F1F (clay words in an out key were 4.8:1), `--sk-ink-muted-text` #B4CEBD (muted labels were 6.6:1). The app's gray, red, and green text on the new cream were darkened a hair for the same reason. Lit Strike and Out lamps stay bright LED red rather than clay, since a lit lamp is a light.

## Part 2: Functional and visual spec

### 1. Batter and On Deck banner (Game)
- **Uniform name type:** Built. One size for first and last; Settings, Batter's Name, can still set First Name Big (Steve asked for that choice earlier the same day). Long names shrink to stay on one line, never cut off.
- **AT BAT label** beside the spot badge, in the same small muted caps as ON DECK: Built. `[6] AT BAT MARCUS HILL #12 SS`.
- **Two-line stat stack:** Built, under the name (an iPhone is too narrow to put it beside a long name with the ♪).
  - Today: hits for at-bats and each trip. **Differs:** "1-for-2" rather than "1-2" (on a board with a ball-strike count, "1-2" reads as a count), and trips in plain words ("Foul Out, 2B") as decided earlier on Nov 14; K stays K.
  - Season: `.329 AVG` then up to three nonzero stats in order HR, RBI, R, 2B, 3B, updated live with today's game. Stolen bases aren't tracked yet.
  - Before the first trip today: `.329 AVG · .410 OBP` over the counting stats.
  - The iPhone SE keeps today's line and leaves the season line to Stats.
- **ON DECK row** at the bottom of the banner, full width: Built.
- **Walk-Up ♪** at the far right: Built (44-point round button; gold on a birthday).

### 2. Jersey numbers
- `#XX` after the name when the player has a number; the slot collapses when not: Built on the Game banner. **Next:** the same on On Deck, base tags, and the fallbacks (first name and position, or order and position) everywhere.

### 3. Scoreboard, diamond, LAST PLAY
- **LAST PLAY strip** along the bottom of the board under home plate, on the deep green, behind a thin bezel line: Built. The badge is pinned; a long play waits 1.5 seconds, slides across with soft edges, and back. Runs and RBI in gold. With Reduce Motion it shrinks to fit instead of sliding. **Differs:** the badge is a gold-outlined pill on the deep green (gold on the lighter surface green measured 5.4:1).
- **Scoreboard modules by rule set:** slowpitch is Built (lamps follow the rule set's count, TIME counting down, LAST INN and 0:00, HR lamps). **Next:** fastpitch and baseball modules (pitch counter, E and LOB, H and E), which need those rule sets first.
- **Weather and clock in the Book's box score:** start and end times are Built. Weather is **parked** (Steve turned it off Nov 14 until it has a home).
- **Unified diamond:** bases and home plate share one angle with plain rubber tops: Built. **Differs (question for Steve):** the spec says "flat 2D top-down"; the house style (and the earlier review Steve agreed with) asks for real objects drawn in depth, so the diamond is one consistent three-quarter angle. Say the word for straight-down flat bases.

### 4. Visual consistency and the four fonts
- Four fonts: Built on the Game screen. **Next:** screen and sheet titles move from Alfa Slab to the athletic face, so Alfa Slab is only the wordmark.
- Matte keys with crisp borders and a solid bottom lip; flat header icons: Built.

### 5. Bases, runners, undo
- Auto-advance on 1B, 2B, 3B, HR, BB, SF, GO with no blocking popups: Built (the engine's defaults).
- **Next:** tap an occupied base for a compact pill menu (Advance, Score, Out on Base, Move Back after a play; SB, WP/PB, CS, PO, CR between pitches). Today a tap opens the runner sheet.
- **Next:** FC and DP with several runners on: a non-blocking "Tap which runner was out" banner with the bases lit. Today FC asks in a sheet.
- Atomic undo: Built (every pitch, play, runner move, and sub is its own event; Undo takes back one).

### 6. Rules matrix and box score
- **Next:** one `RuleSetConfig` (starting count, courtesy foul at two strikes, HR limit, co-ed two-base walk, stealing, infield fly, clock mode, pitch limit, mercy rules). Most exist as rule fields today.
- **Next:** earned and unearned runs; courtesy-runner runs and steals credited correctly.

### 7. Book, light towers, and the tab dock
- **Next:** the scroll-hide dock as two parts: a navy circle with a four-square tab switcher, and a green mini scorebug pill with ‹ back to Game. Today the bar tucks into one circle with a scorebug beside it.
- **Next:** the Book's twin six-bulb light towers in steel with silver lenses by day, lit at night, with short light shows on home runs and reliever entrances (Reduce Motion respected).
- **Next:** the Book line score on the primary green, the team switch in navy, the + column lined up with the innings, wide notations scaled into the diamonds, and room at the bottom so the dock never covers the play-by-play.

### 8. Feel, splash, haptics
- Keys sink 2 points when pressed: Built. Sounds on the speaker switch: Built (Key Clicks).
- **Next:** a two-stage splash (the static launch image, then a quick scoreboard power-on under 1.2 seconds, tap to skip, Reduce Motion respected).
- **Waiting on a native app:** Core Haptics. A web app on iPhone can't vibrate; this needs an App Store wrapper, which means Apple's paid developer program. Steve decides that.

## Part 3: Verified on Steve's iPhone

(Moves here as Steve checks each item.)
