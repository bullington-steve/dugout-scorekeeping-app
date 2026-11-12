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

// Splash screens (apple-touch-startup-image): shown while the Home Screen app opens. The icon on
// navy with the wordmark, one per iPhone screen size (portrait). iOS only uses an exact size match.
// The colors are the app's fixed navy, cream, and red (tokens.css).
export const SPLASHES = [
  { w: 393, h: 852, r: 3 }, // iPhone 16, 15, 15 Pro, 14 Pro
  { w: 402, h: 874, r: 3 }, // iPhone 16 Pro
  { w: 430, h: 932, r: 3 }, // iPhone 16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max
  { w: 440, h: 956, r: 3 }, // iPhone 16 Pro Max
  { w: 390, h: 844, r: 3 }, // iPhone 14, 13, 12
  { w: 375, h: 667, r: 2 }, // iPhone SE
];
for (const { w, h, r } of SPLASHES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: r });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: 'Alfa Slab One'; src: url(${fontUrl}) format('woff2'); }
    html, body { margin: 0; height: 100%; background: #13213d; }
    body { display: grid; place-content: center; justify-items: center; gap: 22px; }
    .icon { width: 128px; height: 128px; border-radius: 28px; overflow: hidden; }
    .icon svg { display: block; width: 128px; height: 128px; }
    h1 { margin: 0; font: 40px 'Alfa Slab One', serif; color: #f6eedb; text-shadow: 2px 2px 0 #13213d, 4px 4px 0 #930b22; }
  </style></head><body><div class="icon">${svg}</div><h1>ScoreKept</h1></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await writeFile(new URL(`public/icons/splash-${w * r}x${h * r}.png`, root), png);
  console.log(`splash-${w * r}x${h * r}.png`);
  await page.close();
}
await browser.close();
