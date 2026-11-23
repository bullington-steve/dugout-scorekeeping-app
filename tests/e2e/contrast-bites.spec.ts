/*
 * The contrast check must still bite (Steve, Nov 23). After the checker learned to map text into
 * each shape's own coordinates and to blend see-through shapes, these permanent "must fail" pictures
 * prove it still catches real failures, and one control proves a far-away mark isn't counted.
 */
import { expect, test, type Page } from '@playwright/test';
import { contrastProblems } from '../helpers/checks.ts';
import { freshApp } from '../helpers/app.ts';

/** One small picture on the page, the way the Book draws a box: shapes first, then the text. */
async function picture(page: Page, inner: string): Promise<void> {
  await page.evaluate((html) => {
    document.querySelector('#bite')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'bite';
    wrap.style.cssText = 'position:fixed;left:20px;top:20px;z-index:9999;background:#f3efe4;padding:8px';
    wrap.innerHTML = `<svg viewBox="0 0 60 60" width="120" height="120">${html}</svg>`;
    document.body.append(wrap);
  }, inner);
}

const problemsFor = async (page: Page, text: string) => (await contrastProblems(page, { normal: 7, large: 4.5 })).filter((p) => p.includes(`"${text}"`));

// A scaled-down pen stroke, like the Book's: a big square drawn in "font units" shrunk by a transform.
const stroke = (x: number, y: number) => `<path d="M0 0H600V600H0Z" transform="translate(${x} ${y}) scale(0.03)" fill="#182238"/>`;

test.beforeEach(async ({ page }) => {
  await freshApp(page);
});

test('must fail: a play code in gray on the yellow highlighter (it would pass on plain paper)', async ({ page }) => {
  // #3d3d3d is over 9:1 on the cream page but about 6.5:1 on the see-through highlighter: only
  // counting the highlighter catches it.
  await picture(page, `<polygon points="30,8 52,30 30,52 8,30" fill="#f2b728" fill-opacity="0.85"/><text x="30" y="35" font-size="12" text-anchor="middle" fill="#3d3d3d">2B</text>`);
  expect(await problemsFor(page, '2B')).toHaveLength(1);
  // The same code on paper passes.
  await picture(page, `<text x="30" y="35" font-size="12" text-anchor="middle" fill="#3d3d3d">2B</text>`);
  expect(await problemsFor(page, '2B')).toEqual([]);
});

test('must fail: an out number on a dark filled shape (the Book’s own red, which passes on paper)', async ({ page }) => {
  await picture(page, `<circle cx="30" cy="30" r="12" fill="#182238"/><text x="30" y="34" font-size="12" text-anchor="middle" fill="#930b22">1</text>`);
  expect(await problemsFor(page, '1')).toHaveLength(1);
});

test('must fail: a scaled-down hand mark that really does cover the text', async ({ page }) => {
  // The 18-unit mark sits right under the 3: dark on dark.
  await picture(page, `${stroke(21, 21)}<text x="30" y="34" font-size="12" text-anchor="middle" fill="#2b3550">3</text>`);
  expect(await problemsFor(page, '3')).toHaveLength(1);
});

test('control: the same scaled-down mark off to one side isn’t counted as behind the text', async ({ page }) => {
  // In its own raw units the mark would "contain" the text; on screen it's in the corner, so the 3 is on paper.
  await picture(page, `${stroke(0, 0)}<text x="40" y="50" font-size="12" text-anchor="middle" fill="#2b3550">3</text>`);
  expect(await problemsFor(page, '3')).toEqual([]);
});
