# What an iPhone web app can use, mapped to ScoreKept

> **Where the rebuild stands (2026.11.12-17):** built since this list was written: the splash screen (`apple-touch-startup-image`, six iPhone sizes, icon and wordmark on navy), Media Session for the Organ's tunes (title, artist, and album on the Lock Screen, where iOS shows it), the game's first pitch, final, and length in the Book footer, and the switch-flip haptic tick on the Organ's click wheel (section 3's "unofficial trick"; it already runs there). Wake Lock with the silent-video fallback, persistent storage, Web Share, and Web Audio were built in Phases 2–8. **Held back, with reasons:** the `black-translucent` status bar draws the clock in white, unreadable on the light appearance's cream paper, so it waits for the Phase 12 look pass; SVG icons in the manifest, because the icon's lettering needs the app's own font, which an SVG icon can't load; App Badging, because iOS shows badges only after notification permission, which the app never asks for. Geolocation and anything needing a server wait for Steve's pick (BACKLOG).

Source: Maximiliano Firtman's "iOS PWA Compatibility" tracker (firt.dev/notes/pwa-ios, last updated October 13, 2026), supplied by Steve. Version numbers are iOS/iPadOS versions. "Installed" means added to the Home Screen. Always use feature detection, and confirm anything new on Steve's iPhone; tests in headless browsers don't prove iOS behavior.

## 1. Already used by the first build (keep, and note the corrections)

| Capability | iOS support | How ScoreKept uses it | Note for the rebuild |
| --- | --- | --- | --- |
| Service worker, Cache Storage | 11.3 | Works offline | Navigation Preload (15.4) can speed up the online-with-fallback load |
| Installation from the browser | 11.3; since 26.0 every site opens as a web app | Add to Home Screen guide | No install prompt exists on iOS (`beforeinstallprompt` is unsupported), so the custom guide stays. Installation also works from non-Safari browsers since 16.4 if the browser opts in; check Chrome on iPhone and update the guide if it works there |
| Storage not shared with the browser | n/a | Backups, one-time Safari reminder | Confirms LESSONS 1: the Home Screen app's data is separate from Safari's |
| Manifest `name`, `short_name`, `icons`, `display`, `start_url`, `id`, `theme_color` | 11.3–16.4 | App name and icon | `orientation` and `background_color` are ignored. An `apple-touch-icon` link overrides manifest icons. **SVG icons work in the manifest since 26.0** |
| `black-translucent` status bar meta | 2.0 | Not used | **Still the only way to get a true full-screen app.** Needed for Steve's edge-to-edge request |
| `apple-touch-startup-image` | 8.0 | Not used | The only way to show a splash screen while the app loads (needs the `apple-mobile-web-app-capable` meta). Show the scorebook icon on navy |
| Persistent storage | 15.2 | `navigator.storage.persist()` | Keep. Quotas scale with free space (17.0), not a hard 50 MB |
| IndexedDB | 8.0 | Sound files | See OPFS below |
| Screen Wake Lock | 16.4; **18.4 for installed apps** | Screen stays on during games | Keep the silent-video fallback for installed apps before 18.4 |
| Web Audio | 6.0 | The organ | Needs a tap first (User Activation, 16.4) |
| Web Speech Synthesis | 7.0 | PA Announcer and Umpire Calls | Keep |
| Web Share 2.0 (files) | 15.0 | Backups, recap pictures | Share the file alone (LESSONS 8) |
| Clipboard | 12.0 | Copy Text, paste lineups | Keep |
| File input (camera and library) | 6.0 | Player photos, song files | Keep |
| Screen Orientation | 16.4, partial | Layout detection | Locking isn't supported (LESSONS 10) |

## 2. Upgrades for features already in the rebuild

- **Origin Private File System (15.2; writable streams 26.0)** for sound files, photos, and logos instead of IndexedDB blobs. Better for big files. Backups keep the same format.
- **Media Session (15.0):** when a walk-up or between-innings song plays from a file, show its name and play/pause on the Lock Screen and Control Center ("ScoreKept · Charge Up"). It also makes Bluetooth speaker controls work.
- **App Badging (16.4, installed only):** a red number on the Home Screen icon when a backup is overdue, or a finished game hasn't been saved to the season. Badges update only when the app runs; there's no background updating.
- **Page Visibility (7.0):** save immediately when the app goes to the background, and send any waiting Discord posts when it comes back. There's no Background Sync on iOS, so a post waiting for signal can only go out while the app is open.
- **Geolocation (2.0, with permission):** (a) on the Park & Field box, offer the nearest saved park first; (b) set the team's home city once for the night-game lights, so sunset is right outside Fort Collins (the first build hard-coded Fort Collins). Ask once; never track.
- **Splash screen and full screen:** see the two meta tags in section 1, for the edge-to-edge backlog item.

## 3. New feature ideas (for Steve to mark Now, Later, or Drop)

| Idea | Uses | Pro | Con |
| --- | --- | --- | --- |
| **Record your own sounds in the app**: walk-up intros, a PA voice for each player's name, your own organ or crowd clips, straight from the microphone | Media Recorder (14.5), microphone (13.0) | No hunting for files; fixes the "robot voice" of the built-in announcer; personal | Recording quality depends on the iPhone and the room |
| **Voice scoring**: say "single to left" or "ground out to short" and the play is entered | Web Speech Recognition (14.5), microphone | Hands-free for a coach in Dugout Mode | Noisy fields; may need signal; has had problems in Home Screen apps on some iOS versions, so prototype on Steve's iPhone first |
| **Photo the umpire's lineup card** to fill in the opponent's order | Camera, plus iOS Live Text | Zero typing | No new code needed: iOS can already copy text from a photo, and the opponent-order box splits pasted lists into rows. Add it as a Help tip |
| **Video recap**: a 10–15 second clip of the scoreboard lights and the organ for Discord | Canvas capture, Media Recorder, Web Codecs (16.4) | Shareable, fun, nobody else does it | Real work; files are large |
| **Short at-bat clips** attached to a Book box | Camera, Media Recorder, OPFS | Review swings after the game | Video fills storage fast; keep off backups |
| **Game reminders and "Who's in?" alerts** on teammates' iPhones | Web Push (16.4), Declarative Web Push (18.4) | Real notifications, like a native app | Needs a small server to send them; pairs with live sync. Ask before adding anything paid |
| **Haptic tap** on scoring buttons | Not officially available (Vibration API is unsupported). An unofficial trick using the iOS switch control exists | Feels like a native app | Unofficial; could break with any iOS update. Prototype only |
| **Keyboard and remote shortcuts** on iPad (1 = single, K = strikeout, U = undo) | Keyboard events; Gamepad (10.3) for a Bluetooth controller | Fast scoring from a press box or a mounted iPad | Niche |

## 4. Not possible as a web app (so don't plan on them)

Bluetooth device control, NFC, vibration and haptics (officially), background sync or fetch, scheduled local notifications without a server, Lock Screen widgets and Live Activities, Home Screen widgets, reading the Contacts list (the Contact Picker is still experimental), locking rotation, sharing storage with Safari, and playing Apple Music tracks. Apple Pay, Sign in with Apple, and passkeys are available but only matter if ScoreKept ever has accounts and a server.

## 5. Not useful for ScoreKept

Augmented reality (Quick Look, `<model>`), WebGPU and WebGL (canvas is enough), Digital Credentials, WebTransport, Picture-in-Picture, Payment Request.
