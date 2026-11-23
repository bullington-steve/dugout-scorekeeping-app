/*
 * Every board's dividers meet the painted frame in clean T-joints (Steve, Nov 23): a cream rule
 * may touch the frame stripe but never run past it, on any board, at any width.
 */
import { expect, test, type Page } from '@playwright/test';
import { freshApp, key } from '../helpers/app.ts';

/** Rules that poke past the frame's outer edge, or stop short of its inner edge when they reach for it. */
async function frameProblems(page: Page, board: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const out: string[] = [];
    // The cream rule's color, as the browser resolves it.
    const probe = document.createElement('i');
    probe.style.color = 'var(--sk-board-rule)';
    document.body.append(probe);
    const rule = getComputedStyle(probe).color;
    probe.remove();
    const roots = [...document.querySelectorAll<HTMLElement>(sel)].filter((r) => r.getClientRects().length);
    if (!roots.length) return [`no ${sel} on screen`];
    for (const root of roots) {
      const cs = getComputedStyle(root);
      const inset = -parseFloat(cs.outlineOffset) - parseFloat(cs.outlineWidth); // the frame's outer edge, from the board's edge
      const inner = inset + parseFloat(cs.outlineWidth); // the frame's inner edge
      const box = root.getBoundingClientRect();
      const frame = { l: box.left + inset, r: box.right - inset, t: box.top + inset, b: box.bottom - inset };
      const inn = { l: box.left + inner, r: box.right - inner, t: box.top + inner, b: box.bottom - inner };
      const reach = 10; // a rule ending this close to the frame is meant to join it
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        if (!el.getClientRects().length) continue;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const name = `${el.className || el.tagName}`.toString().split(' ')[0];
        // A divider is a cream rule on one or two sides; an outlined box (a badge) isn't one.
        const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((k) => s.getPropertyValue(`border-${k.toLowerCase()}-style`) === 'solid' && parseFloat(s.getPropertyValue(`border-${k.toLowerCase()}-width`)) >= 1.5 && s.getPropertyValue(`border-${k.toLowerCase()}-color`) === rule);
        if (sides.length === 0 || sides.length === 4) continue;
        const horiz = sides.includes('Top') || sides.includes('Bottom');
        const vert = sides.includes('Left') || sides.includes('Right');
        if (horiz) {
          if (r.left < frame.l - 0.5) out.push(`${name} runs ${(frame.l - r.left).toFixed(1)} past the frame at the left`);
          if (r.right > frame.r + 0.5) out.push(`${name} runs ${(r.right - frame.r).toFixed(1)} past the frame at the right`);
          if (r.left > inn.l + 0.5 && r.left - inn.l < reach) out.push(`${name} stops ${(r.left - inn.l).toFixed(1)} short of the frame at the left`);
          if (r.right < inn.r - 0.5 && inn.r - r.right < reach) out.push(`${name} stops ${(inn.r - r.right).toFixed(1)} short of the frame at the right`);
        }
        if (vert) {
          if (r.top < frame.t - 0.5) out.push(`${name} runs ${(frame.t - r.top).toFixed(1)} past the frame at the top`);
          if (r.bottom > frame.b + 0.5) out.push(`${name} runs ${(r.bottom - frame.b).toFixed(1)} past the frame at the bottom`);
          if (r.top > inn.t + 0.5 && r.top - inn.t < reach) out.push(`${name} stops ${(r.top - inn.t).toFixed(1)} short of the frame at the top`);
          if (r.bottom < inn.b - 0.5 && inn.b - r.bottom < reach) out.push(`${name} stops ${(inn.b - r.bottom).toFixed(1)} short of the frame at the bottom`);
        }
      }
    }
    return [...new Set(out)];
  }, board);
}

for (const width of [320, 375, 393, 430]) {
  test(`at ${width} every board's dividers end at the frame, never past it (Steve, Nov 23)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await freshApp(page);
    await key(page, 'Look Around with Sample Data').click();
    await page.evaluate(() => document.fonts.ready);
    for (const [tab, board] of [
      ['Game', '.gm-board'],
      ['Book', '.bk-face'],
    ] as const) {
      await page.getByRole('tab', { name: tab }).click();
      await page.locator(board).first().waitFor();
      await page.waitForTimeout(100);
      expect(await frameProblems(page, board), `${tab} at ${width}`).toEqual([]);
    }
    // The Team colors preview in Edit Team.
    await page.getByRole('tab', { name: 'Team' }).click();
    await key(page, 'Edit Team').click();
    await page.locator('.tm-bug').first().waitFor();
    expect(await frameProblems(page, '.tm-bug'), `Edit Team at ${width}`).toEqual([]);
  });
}
