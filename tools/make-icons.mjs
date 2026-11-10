// Renders tools/icon.svg to the Home Screen icon PNGs in public/icons.
// Run with: npm run icons
// Uses Playwright's Chromium so the Alfa Slab One letters render exactly.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = new URL('..', import.meta.url);
const svg = await readFile(new URL('tools/icon.svg', root), 'utf8');
const font = await readFile(new URL('src/assets/fonts/alfa-slab-one.woff2', root));
const fontUrl = `data:font/woff2;base64,${font.toString('base64')}`;

const sizes = [180, 192, 512];
await mkdir(new URL('public/icons/', root), { recursive: true });

const browser = await chromium.launch();
for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: 'Alfa Slab One'; src: url(${fontUrl}) format('woff2'); }
    html, body { margin: 0; padding: 0; }
    svg { display: block; width: ${size}px; height: ${size}px; }
  </style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check('40px "Alfa Slab One"'));
  if (!ok) throw new Error('Alfa Slab One did not load for the icon');
  const png = await page.screenshot({ type: 'png', omitBackground: false });
  await writeFile(new URL(`public/icons/icon-${size}.png`, root), png);
  console.log(`icon-${size}.png`);
  await page.close();
}
await browser.close();
