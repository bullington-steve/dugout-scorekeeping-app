# Photoshop files of the Game and Book screens

Steve tweaks screens in Photoshop. These tools take the real app (the sample season) and save one transparent picture per element, then stack them into a layered `.psd`.

1. Run the app: `npx vite --port 4199`
2. Export the layers (light appearance; `dark` works too):

   ```
   cp tools/psd/export-game.mjs .x.mjs && node .x.mjs http://localhost:4199/ /tmp/game-layers light; rm .x.mjs
   cp tools/psd/export-book.mjs .x.mjs && node .x.mjs http://localhost:4199/ /tmp/book-layers light; rm .x.mjs
   ```

   (Copied into the project folder so Node finds Playwright.)
3. Build the file, named with the app version (CLAUDE.md): `python3 tools/psd/make-psd.py /tmp/game-layers ScoreKept-Game-light-<APP_VERSION>.psd` (needs `pip install psd-tools`).

**The coverage check:** before exporting, each script lists every visible word, icon, picture, and lamp on the screen and stops with "NOT ON ANY LAYER" if one isn't on a layer. When the app gains something new on these screens, add it to the script's layer list (LESSONS 96).
