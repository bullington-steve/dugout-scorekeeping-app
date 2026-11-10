# Lessons from the first build

Each of these cost real time the first time. Read before working on the related area.

## iPhone and Safari behavior

1. **Home Screen apps keep their own storage**, separate from Safari tabs. Deleting the Home Screen icon deletes that app's data. Re-adding gives an empty app. The first build once told Steve the opposite, which was wrong. Always say: back up, delete, re-add, restore.
2. **Safari can clear a website's data after about a week without a visit** (WebKit's 7-day storage policy). Home Screen apps are exempt. This is why the app pushes people to the Home Screen and to backups.
3. **The icon and its name are snapshotted when added.** A new icon or app name only appears after re-adding (with the backup steps above).
4. **Updates need a full close.** Swiping home doesn't close a Home Screen app. A half-loaded update (part old code, part new) once made taps land in the wrong place for a whole session. After every push, tell Steve to swipe the app away and reopen it, and show the version in Settings.
5. **Page-wide `overscroll-behavior: none` and locking the page (`overflow: hidden` on html while a sheet is open) are suspected of offsetting iPhone taps.** Both were removed. No-bounce is now scoped: an `html.fits` class only on the Game screen, only when it fits, only when no panel is open, re-checked after render, resize, `document.fonts.ready`, and via a ResizeObserver.
6. **After the keyboard closes, iOS can leave fixed bars stuck** a keyboard-height up. Nudge the page to re-layout on keyboard close.
7. **Audio needs a user tap first.** That's why the intro starts with PLAY BALL!. Decode intro audio *before* the tap so it plays instantly.
8. **`navigator.share` with a title plus a file makes iOS offer "Save as 2 Items"** with no file name. Share the file alone.
9. **Wake Lock is ignored by Home Screen apps before iOS 18.4.** A tiny silent looping video keeps the screen on as a fallback.
10. **iPhone Safari won't lock rotation** for websites or Home Screen apps. Design a sideways layout instead.
11. **The ring/silent switch** on older iPads mutes Safari audio.
12. **Usable height** for a Home Screen app on iPhone 16 is about 393 x 759, not 852: the status bar and home indicator take about 93 points. Test at the real usable height.
13. **iOS 26 Safari moved Share** behind the ≡ menu in the address bar; iPad has Share at the top right and "View More" before Add to Home Screen. "Open as Web App" must stay on.
14. **Tinted/dark Home Screen icon styles** recolor icons; a silver icon may look gray in screenshots.

## Rendering and layout

15. **Re-rendering a whole panel on every input** swallowed the first tap on Play Ball, lost focus between text boxes, and wiped half-typed values. Save text input quietly without redrawing the panel.
16. **Rebuilding a list under the finger** (the Organ pad rebuilt itself on each tap and when a tune ended) made taps hit the wrong row on iPhone. Update the changed element in place.
17. **Class name collisions** broke layout twice: the scoreboard's `.empty` cells picked up the "No game in progress" panel's styles, and a generic `.play` rule hit the intro states. Namespace classes per component.
18. **Fonts render slightly wider on GitHub's runners** than locally. A Game screen that fit by 9 points locally failed in CI. Keep **at least 12 points of headroom** and keep new button labels no longer than existing ones.
19. **Measure after fonts load.** Fit checks that ran before web fonts finished gave false results.
20. **When a control grows to 44 points, check its container.** The + (add inning) button grew but its column stayed 30 px and collided with R.
21. **Floating close buttons** that follow scrolling ended up over a remove button. Keep ✕ fixed beside the title.
22. **Tap outside to dismiss** threw away a half-built lineup. Sheets close only via ✕, Cancel, or Done.
23. **Pinned table columns** leaked slivers through 1 px seams; use a border model that leaves no gaps.
24. **Wide display fonts** (Graduate, then Alfa Slab One) pushed header icons to a second line on small phones; cap the wordmark by its container's width, and make sure sideways rules aren't overridden by later upright rules.
25. **Taps on the full-screen field** must clamp to the field; converting screen to field coordinates needs a small tolerance in tests.
26. **Kalam's digit 1 reads as a capital I** ("F11" looked like "FII"). Play codes must be readable at a glance; test F11 and 6-3.
27. **Every lit bulb with its own glow filter, plus animated filters, is expensive.** Draw one soft glow behind each bulb and animate only opacity.
28. **Contrast checks can't see what scrolls under glass.** Test the tab bar by mixing its tint over white, black, and paper.

## Engine and stats

29. **Walk-off:** the game ends when the winning run scores, unless it's a home run. Don't let every runner score on a walk-off hit.
30. **The first playing-time math counted one extra inning** (used the inning the game ended on). Count only innings the other team actually batted, and only games the player attended.
31. **Turning a feature back on with an old setting key** would have switched it on for old games (old saved data had the count on). Use a new key with a safe default.
32. **Old saved events must keep loading** after a feature is removed (steals load as advances; removed tunes map to a replacement).

## Testing and process

33. **Prove a test bites.** The stat comparison passed on a season with no sac flies, so a planted OBP error went unnoticed. Pick seeds that cover every play type.
34. **Tests can pass for the wrong reason:** a backup test matched words in the app's own source instead of the restore message. Check what's actually saved.
35. **Never chain a push after tests in a way that pushes on failure.** One commit reached GitHub with a failing test.
36. **The GitHub WebKit job sometimes hangs installing its browser** (over 40 minutes). Cancel and rerun that job; consider caching the browser and pinning the runner image.
37. **Playwright WebKit can't intercept requests sent by a service worker**, so tests that fake the network (Discord) run with `serviceWorkers: "block"`. WebKit also can't fake offline with a service worker; run the offline test in Chromium only.
38. **Headless tests can't reproduce iPhone touch handling or real VoiceOver.** Say so, and ask Steve to confirm on his iPhone.
39. **Check the light appearance and Dark Mode both.** Steve reviews in Dark Mode; the first tests only ran light. Both run now.
40. **Two copies of the app** (a working copy plus a copy step into the repo) caused drift. One copy, in the repo.
41. **Keep the README current in the same commit** as each feature; it drifted once (old tab names, missing buttons).
42. **The cloud session's network allowlist blocked** Freesound, Pixabay, Wikimedia, webkit.org, discord.com, and corebook.io. Ask Steve to send files or paste text instead of retrying with other tools.
51. **The cloud session can't download Playwright's WebKit** (rebuild, Nov 2026), so local runs are Chromium only and `playwright.config.ts` says so out loud. GitHub runs both browsers, and the deploy job waits for both, so nothing reaches Pages without passing WebKit.
52. **The cloud session can't create repos or change repo settings** (create repo, turn on Pages) through its GitHub proxy. Steve does those on github.com; give him exact clicks.

## Copyright and content

43. **Only public-domain melodies are played as written.** Tunes that evoke modern songs must be original melodies, not their hooks (the "So Long" send-off was checked against "na na na na, hey hey"). Chicken Dance and Hokey Pokey are still under copyright. Happy Birthday is public domain in the US since 2016. Charge! is uncertain (kept by Steve's choice).
44. **Modern editions of old tunes can be copyrighted.** From an arranged sheet, take only the melody and basic harmony.
45. **Memory isn't sheet music.** The anthem written from memory had three wrong rhythms when checked against Steve's sheet. Note each tune's source.
46. **Sound libraries:** Pixabay and Mixkit allow use but not redistributing files on their own; bundled clips should be CC0 or made for the app. The intro cheer is from Pixabay and credited in `sounds/README.md`.
47. **Stock art (Vecteezy and similar) usually forbids logo use** and redistribution from a public repo. Draw originals.
48. **Logos must not resemble real marks:** a head-on red bull (Chicago Bulls), a blue horseshoe (Colts), a bolt on a disc (Tampa Bay Lightning), a star with an inner outline (Dallas Cowboys), a fierce hawk head (Seahawks) were all removed or changed in mockups.
49. **Synthesized sound effects can sound bad** (the first bat ping was tinny; the first crowd sounded like a train). For realistic sounds, use real recordings Steve supplies.
50. **Claims in the README must be true and tested.** Don't claim "every word written by people" or "works for blind scorekeepers" until it's true and confirmed on a real iPhone.
