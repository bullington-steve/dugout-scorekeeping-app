/*
 * Prove each shared check bites (LESSONS 33): plant a known mistake and
 * make sure the check reports it, and that a clean page passes.
 */
import { expect, test } from '@playwright/test';
import { FIT_HEADROOM, IPHONE_16, contrastProblems, headroom, sideScroll, tapTargetProblems } from '../helpers/checks.ts';

test('contrast check catches gray on gray and passes navy on cream', async ({ page }) => {
  await page.setContent(`
    <body style="margin:0;background:#f6eedb">
      <p id="bad" style="color:#8a8a8a;background:#9a9a9a">Hard to read</p>
      <p style="color:#13213d">Easy to read</p>
      <p style="color:#c9c0a8;font-size:30px">Large but too faint</p>
    </body>`);
  const problems = await contrastProblems(page);
  expect(problems).toHaveLength(2);
  expect(problems[0]).toContain('Hard to read');
  expect(problems[1]).toContain('Large but too faint');
});

test('contrast check blends see-through backgrounds', async ({ page }) => {
  await page.setContent(`
    <body style="margin:0;background:#000">
      <div style="background:rgb(255 255 255 / 0.5)"><p style="color:#fff">White on gray</p></div>
    </body>`);
  expect(await contrastProblems(page)).toHaveLength(1);
});

test('tap check catches a 30-point button and passes a 44-point one', async ({ page }) => {
  await page.setContent(`
    <button style="width:30px;height:30px">Small</button>
    <button style="width:44px;height:44px">OK</button>
    <a href="#" style="display:inline-block;width:120px;height:20px">Thin link</a>`);
  const problems = await tapTargetProblems(page);
  expect(problems).toEqual(['"Small" is 30 x 30', '"Thin link" is 120 x 20']);
});

test('sideways-scroll check catches a too-wide box', async ({ page }) => {
  await page.setViewportSize({ width: 260, height: 600 });
  await page.setContent(`<body style="margin:0"><div style="width:300px;height:10px"></div></body>`);
  expect(await sideScroll(page)).toBe(40);
  await page.setContent(`<body style="margin:0"><div style="width:100%;height:10px"></div></body>`);
  expect(await sideScroll(page)).toBe(0);
});

test('fit check measures spare points on an iPhone 16 Home Screen app', async ({ page }) => {
  await page.setViewportSize(IPHONE_16);
  await page.setContent(`<body style="margin:0"><div id="s" style="height:740px"></div></body>`);
  expect(await headroom(page, '#s')).toBe(19);
  await page.setContent(`<body style="margin:0"><div id="s" style="height:750px"></div></body>`);
  expect(await headroom(page, '#s')).toBeLessThan(FIT_HEADROOM);
  await page.setContent(`<body style="margin:0"><div id="s" style="height:900px"></div></body>`);
  expect(await headroom(page, '#s')).toBeLessThan(0);
});
