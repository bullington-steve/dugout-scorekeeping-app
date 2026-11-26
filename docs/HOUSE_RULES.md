# Steve's App House Rules

Nov 25, 2026 · Steve

## How to use this

These are the standing rules for every app Steve builds. They hold no matter what the app looks like; each app's own colors, fonts and objects go in that app's CLAUDE.md.

- **Coordinators** (a chat assistant reviewing work and writing handoffs): read this first, then the app's CLAUDE.md. Hold every handoff and outside suggestion to both.
- **Coding bots:** copy this into the repo as `docs/HOUSE_RULES.md` and have CLAUDE.md point to it. The app's CLAUDE.md is the final word for that app, because the bot can always read it. When the two disagree, the bot lists each conflict and waits for Steve; the winner goes into CLAUDE.md. Changes to this document reach a repo only with Steve's yes (Steve, Nov 26).
- **Outside reviewers:** their suggestions are filtered against these rules before anything reaches the bot.

**Fixed across apps:** the workflow, approvals, testing, platform, accessibility numbers, writing rules, privacy. **Changes per app:** the palette, fonts, the real-world objects screens are modeled on, and anything recorded in that app's Decisions log.

Changing a rule here needs Steve's explicit yes, a dated note at the end of the section, and the same change copied into every active app's repo.

## Roles and workflow

Steve decides, the coordinator filters and writes, the bot builds. Nothing reaches the bot that the coordinator hasn't checked against these rules.

| Role | Does | Doesn't |
| --- | --- | --- |
| Steve | Makes every product and look decision; approves held work; tests on his own iPhone; carries messages between chats | Write code |
| Head Architect (the coordinator) | Reviews screenshots, reports and specialist findings; writes the only handoffs the bot receives; verifies in the repo; keeps these rules current | Build or push; pass anything through unfiltered |
| Coding bot | Builds, tests, documents, pushes; stops and asks on conflicts | Decide product questions; push held work |
| Design and accessibility reviewer (a chat) | Reviews screenshots and mockups against these rules and the app's CLAUDE.md, checking the repo before claiming anything; covers looks, contrast, Dark Mode, VoiceOver | Write handoffs to the bot; decide |
| Writer (a chat) | Help, tours, What's New, README, store text, checked against the app as it is | Change app behavior; write handoffs to the bot |
| Release checker (a fresh chat, big releases only) | Reads the bot's report cold and checks it against what Steve approved | Review its own work; stay on as a standing role |
| Outside reviewers | Offer ideas | Speak for Steve; their text never goes to the bot verbatim |

Specialists report to the Head Architect through Steve. Every chat works from the repo's CLAUDE.md, DECISIONS and BACKLOG plus these rules, not from its own memory.

**The loop:**

1. Steve shares a screenshot, report or idea.
2. The coordinator checks it against these rules and the app's CLAUDE.md, says what holds up and what doesn't, and why.
3. The coordinator writes one ready-to-paste handoff block.
4. Steve sends it, or changes it first.
5. The bot builds, tests, and reports back with commit, version, what changed, and questions.
6. The coordinator checks the report (and the repo, when it can) before the next batch.

**Handoff block rules:**

- One block per batch, in a code block, ready to paste. Start with the topic, Steve's name and the date: `Book fixes (Steve, Nov 23):`.
- Say what to build, the numbers (sizes, contrast, counts), and the test that proves it.
- Say what is not being done, so it isn't built anyway.
- Mark anything that needs a look first: "Screenshot first," "Mockup first," or "Report only, don't build."
- Use the app's real token and file names only. Never invent token names.

**Filtering outside feedback:** keep what serves the user and fits the rules; reject anything that contradicts a recorded decision, adds decoration, copies another product's look, or invents names. Say which is which, briefly. Check its facts: reviewers often describe old builds.

## Approvals and decisions

Nothing held for Steve ships without an explicit yes about that item, and every decision is written down with its date.

- **Explicit yes:** held work ships only after Steve says yes to that specific item. A new request in the same message is not approval. If unsure, ask.
- **Conflicts stop the work:** if a request contradicts an earlier rule or decision, the bot lists the conflicts and waits. It builds the parts that don't conflict.
- **Decisions log:** every answer goes into the app's Decisions log with a date and Steve's name, so no later session reopens it.
- **Mockup first** for anything that changes how a screen looks as a whole: a new screen, a redesign, an icon. Small fixes can build directly.
- **Screenshot first** when a change is judged by eye (hand-drawn marks, sizes, colors): the bot sends light and Dark Mode before pushing.
- **Approved with changes** means build with those changes; no second screenshot unless Steve asks for one.
- **Questions come as a list:** the bot ends each report with what it needs, each answerable with yes, no, or a pick.

## Build and release discipline

The live app is something people rely on during real events, so nothing reaches it untested or at a bad moment.

- **Tests before every push:** the full unit suite plus end-to-end tests in both Chromium and WebKit (Safari's engine). A red test blocks the push, with no exceptions.
- **Must-fail tests:** whenever a test or a checker is changed, add a test that proves it still catches the failure it exists for. A checker that can't fail is worse than none.
- **Quiet periods:** never push on the app's busy days (for ScoreKept, game days). Each app's CLAUDE.md names its quiet periods.
- **Version format:** YYYY.MM.DD-n (for example 2026.11.25-1). Every report from the bot names the version and the commit it pushed.
- **Saved-data changes:** any change to how data is stored ships with a migration, a test that restores an old backup, and a note in the report saying so.
- **What's New:** written in plain words about what the user will notice, not how it was built. No exclamation points, no hype.
- **Small batches:** one theme per release when possible, so a problem can be traced to one change.
- **Rollback ready:** if a release breaks something people rely on, revert first and investigate second.

## Platform rules

Steve's apps live on iPhone first, so they should feel like they belong there.

- **Match the current release:** follow how Apple's own apps look and behave on the current released iOS. Betas are for checking that nothing breaks, never for setting the design.
- **Use what the system gives:** native menus, pickers, the share sheet, keyboards and date controls. Don't rebuild them.
- **Our own sheets** follow Apple's layout: title at the top, close button where Apple puts it, actions at the bottom.
- **Status bar** color is set per screen so it matches what's under it.
- **No pinch-zoom** on app screens; text scales with the system instead.
- **Home Screen web apps:** saved data is tied to the web address. Never rename the account or move the repository of a live app; it wipes everyone's data.
- **Install help** is written for the current iOS first, with the previous version as a fallback, and checked by a real person in a private tab before it ships.
- **Other devices:** must work on iPad and desktop browsers, but don't need to be designed for them unless the app's CLAUDE.md says so.

## Accessibility rules

These numbers are fixed for every app. Colors and fonts change between apps; these don't.

| Rule | Minimum |
| --- | --- |
| Tap targets | 44 × 44 pt |
| Body text | 17 pt; nothing below 12 pt |
| Text contrast | 4.5 : 1 |
| Marks, lines, icons | 3 : 1 |
| The most important reading (the app's core data, the selected row) | 7 : 1 |
| Test widths | 375 pt and 430 pt |

- **Never color alone:** every color meaning also has a shape, word, or position.
- **System settings are honored:** Reduce Motion (swap movement for a color change), Reduce Transparency (glass becomes solid), Increase Contrast (outlines thicken, faint colors darken), and Bold Text.
- **VoiceOver:** every control has a spoken label; disabled controls say why they're disabled; live numbers announce changes.
- **Dark Mode is designed, not inverted:** each color job gets its own dark value, checked against the contrast table.
- **Contrast is tested in code:** a checker runs with the tests and fails the build if any pair drops below its minimum, with must-fail tests to prove it works.
- **A real-device pass** with VoiceOver on before any major release.

## Design system structure

Every app gets its own look, but each look is built from the same parts, defined in its CLAUDE.md before any screen is drawn.

- **Identity:** a real-world object the app is modeled on (ScoreKept is a dugout: scoreboards, scorebooks, pennants). Each screen names which object it is.
- **Color jobs, not color names:** each color has one job (structure, paper, live data, now, alerts). A new color needs a new job and Steve's yes.
- **Type roles:** a small set, each with one purpose (labels, live numbers, things a person writes by hand, typed text). No new fonts mid-project.
- **Four button roles** (primary, secondary, quiet, destructive), each with a real press state, and a dimmed state that looks the same across all roles.
- **One way to close things:** pick one dismissal pattern per app and use it everywhere. Save as you go, so closing never loses work.
- **Edges:** surfaces that represent a real object may bleed edge to edge; controls keep 16 pt margins.
- **Printed vs written:** parts that would be printed stay clean and exact; parts a person would write by hand may look hand-made.
- **No invented values:** every color, size and spacing comes from the app's tokens. If a value is missing, add it to the tokens with a reason.
- **Reference apps** are for layout and behavior only, never their look or branding.

## Writing rules

Words in the app should sound like a helpful person on the team, not a manual or an ad.

- **Plain language:** short sentences, everyday words, the terms the app's users already say.
- **Capitalization:** follow the app's object (ScoreKept uses caps on boards, Title Case on controls); define it once per app and stick to it.
- **Numbers follow the real-world habit** of the app's domain (in ScoreKept, "3." for a batting spot, "#" for a jersey).
- **No exclamation points** in UI text, Help or What's New, except where the object itself would shout (PLAY BALL!).
- **Errors say what happened and what to do next,** never just "Something went wrong."
- **Help and tours are written in our own words** and checked against the app as it is today; tests confirm every tour step still points at something real.
- **No product or brand names** in the app's features, labels or names unless Steve approves; naming follows the trademark check in the next section.

## Data, privacy and legal

People's data stays on their own device unless they choose to send it somewhere.

- **Local first, no accounts:** data lives on the device. Backups are files the user controls.
- **Secrets stay on the device:** webhooks, bot IDs and keys are never in backups, exports, logs or the repository.
- **Real names stay out of public repos:** tests and samples use made-up people.
- **Steve's personal email** and other contact details are never put in the app or the repo; each app gets its own contact address.
- **Minors:** any app that may hold information about kids gets a privacy review before launch.
- **Third-party services:** ask Steve before adding anything that sends data off the device, costs money, or needs an account.
- **Copyright:** only public-domain material (in the US, works published 1930 or earlier) or material we made. Never copy copyrighted text, music, art or logos.
- **Names:** run a USPTO trademark search and an app-store search before settling on a name.

## New app starter checklist

Before the first screen is built, a new app's repository has these:

- [ ] **docs/HOUSE_RULES.md:** a copy of this document
- [ ] **CLAUDE.md:** identity object, color jobs (light and Dark Mode), type roles, button roles, dismissal pattern, capitalization, quiet periods
- [ ] **docs/BACKLOG.md:** Now, Next, Later and Held lists
- [ ] **docs/DECISIONS.md:** dated log, starting with the name and identity
- [ ] **docs/LESSONS.md:** mistakes and their fixes, so no session repeats them
- [ ] **Tests:** unit tests, Chromium and WebKit end-to-end tests, and the contrast checker with must-fail tests
- [ ] **Deploy:** GitHub Pages workflow that runs the tests first; the address chosen so it never has to move
- [ ] **Icon:** drafted in a mockup, checked at small sizes and in Dark Mode
- [ ] **Contact:** the app's own feedback email address
- [ ] **Name check:** trademark and app-store search done and logged in Decisions
