import { expect, test, type Page } from '@playwright/test';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key, startGame } from '../helpers/app.ts';

async function sample(page: Page): Promise<void> {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

async function checks(page: Page): Promise<void> {
  expect(await contrastProblems(page)).toEqual([]);
  expect(await tapTargetProblems(page)).toEqual([]);
  expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
  expect(await sideScroll(page)).toBe(0);
}

test('the Organ’s wheel: slide to scroll, the middle to choose, MENU to go back; VoiceOver has the list', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  const screen = organ.locator('.cw-screen');
  await expect(screen).toContainText('Rally');
  await expect(organ.locator('.cw-sel')).toHaveText(/^Rally/);
  // Slide a half turn around the wheel, clockwise: the highlight moves down.
  const box = (await organ.locator('.cw-wheel').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = box.width * 0.42;
  // Start between the keys (they sit at 0, 90, 180, and 270 degrees).
  await page.mouse.move(cx + r * Math.cos(Math.PI / 4), cy + r * Math.sin(Math.PI / 4));
  await page.mouse.down();
  // At a finger's pace: a fast spin moves two or three rows a step (Nov 16).
  for (let deg = 45; deg <= 145; deg += 5) {
    await page.mouse.move(cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180));
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await expect(organ.locator('.cw-sel')).toHaveText(/^Between Innings/);
  await organ.locator('.cw-hub').click();
  await expect(organ.locator('.cw-where')).toHaveText('Between Innings');
  await expect(organ.locator('.cw-sel')).toHaveText(/^Take Me Out to the Ball Game/);
  await organ.locator('.cw-hub').click();
  await expect(organ.locator('.cw-where')).toHaveText('Now Playing');
  await expect(screen).toContainText('Albert Von Tilzer and Jack Norworth, 1908');
  await expect(screen).toContainText('Between Innings');
  await organ.locator('.cw-next').click();
  await expect(screen).toContainText('The Base Ball Polka');
  await organ.locator('.cw-menu').click();
  await expect(organ.locator('.cw-sel')).toHaveText(/^The Base Ball Polka/);
  await organ.locator('.cw-play').click();
  // VoiceOver: the wheel is hidden from it, and every tune is a plain button.
  await expect(organ.locator('.cw-player')).toHaveAttribute('aria-hidden', 'true');
  const tune = organ.getByRole('button', { name: /^Tally One for Me, / });
  await expect(tune).toHaveAttribute('aria-pressed', 'false');
  // VoiceOver activates it without a tap; a hidden button isn't clickable by pointer.
  await tune.evaluate((b: HTMLButtonElement) => b.click());
  await expect(tune).toHaveAttribute('aria-pressed', 'true');
});

test('the speaker turns game sounds off and on, and remembers', async ({ page }) => {
  await sample(page);
  const speaker = page.getByRole('button', { name: 'Sound', exact: true });
  await expect(speaker).toHaveAttribute('aria-pressed', 'true');
  await speaker.click();
  await expect(speaker).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('♪ Walk-Up plays our batter’s song and reads Stop while it plays', async ({ page }) => {
  await sample(page);
  // Tonight the Diamond Dogs are batting. The round ♪ is 44 points.
  const walkup = page.getByRole('button', { name: 'Walk-Up', exact: true });
  await expect(walkup).toBeVisible();
  const box = (await walkup.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  await walkup.click();
  await expect(page.getByRole('button', { name: 'Stop Walk-Up' })).toHaveText('■');
  await page.getByRole('button', { name: 'Stop Walk-Up' }).click();
  await expect(walkup).toBeVisible();
});

test('Sounds & Walk-Up Songs: the pack sets each moment, and a pick sticks', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Sounds & Walk-Up Songs/ }).click();
  const s = page.getByRole('dialog', { name: 'Sounds & Walk-Up Songs' });
  await expect(s.getByRole('button', { name: /^Strikeout/ })).toContainText('Strikeout');
  await s.getByLabel('Sound Pack').selectOption('little');
  await expect(s.getByRole('button', { name: /^Strikeout/ })).toContainText('No Sound');
  await s.getByRole('button', { name: /^Win/ }).click();
  await page.getByRole('dialog', { name: 'Win' }).getByRole('button', { name: /^Hallelujah Chorus/ }).click();
  await expect(s.getByRole('button', { name: /^Win/ })).toContainText('Hallelujah Chorus');
});

test('Edit Player has a walk-up song', async ({ page }) => {
  await sample(page);
  await page.getByRole('tab', { name: 'Team' }).click();
  await page.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
  await page.getByRole('button', { name: 'Edit Player' }).click();
  const ed = page.getByRole('dialog', { name: 'Edit Player' });
  await ed.getByLabel('Song', { exact: true }).selectOption('wu-heat');
  await expect(ed.getByText('Plays Bring the Heat.')).toBeVisible();
  await ed.getByRole('button', { name: 'Done' }).click();
  const close = page.getByRole('button', { name: 'Close' });
  if (await close.count()) await close.last().click();
  await page.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
  await page.getByRole('button', { name: 'Edit Player' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit Player' }).getByLabel('Song', { exact: true })).toHaveValue('wu-heat');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('the Organ pad, Sounds settings, and the Game header: contrast, taps, words', async ({ page }) => {
      await sample(page);
      await checks(page);
      await page.getByRole('button', { name: 'Organ', exact: true }).click();
      await page.getByRole('dialog', { name: 'Organ' }).locator('.cw-hub').click();
      await checks(page);
      await page.screenshot({ path: `test-results/organ-${colorScheme}.png` });
      await page.getByRole('dialog', { name: 'Organ' }).getByRole('button', { name: 'Close' }).click();
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'All Settings' }).click();
      await page.getByRole('button', { name: /^Sounds & Walk-Up Songs/ }).click();
      await checks(page);
    });
  });
}

test('the Organ is the sound hub: Settings at the bottom of its menu opens the sound settings', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  // Step down to Settings (the last row; it scrolls into view) with the forward key, then press the middle.
  for (let i = 0; i < 7; i++) await organ.locator('.cw-next').click();
  await expect(organ.locator('.cw-sel')).toHaveText(/^Settings/);
  await organ.locator('.cw-hub').click();
  await expect(page.getByRole('dialog', { name: 'Sounds & Walk-Up Songs' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Big Speaker Mode' })).toBeVisible();
});

test('sound plays through Silent, but only once something plays (other apps’ music isn’t paused by a tap)', async ({ page }) => {
  // A stand-in for Safari's audio session (iPhone, Safari 16.4 and later).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true });
  });
  await sample(page);
  const type = () => page.evaluate(() => (navigator as Navigator & { audioSession: { type: string } }).audioSession.type);
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.getByRole('tab', { name: 'Game' }).click();
  expect(await type()).toBe('auto');
  await page.getByRole('button', { name: 'Walk-Up', exact: true }).click();
  await expect.poll(type).toBe('playback');
});

// ---- The Organ in ScoreKept's colors (Steve, Nov 16) ----------------------------------------------

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [375, 430]) {
    test(`the Organ at ${width} points, ${colorScheme}: 44-point wheel, whole rows, 7:1 selected row, no sideways scroll`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 759 });
      await freshApp(page);
      await key(page, 'Look Around with Sample Data').click();
      await page.getByRole('button', { name: 'Organ', exact: true }).click();
      const organ = page.locator('.cw-sheet');
      await expect(organ.locator('.cw-list li').first()).toBeVisible();
      await page.waitForTimeout(200);
      // Every wheel target is at least 44 points.
      for (const sel of ['.cw-menu', '.cw-prev', '.cw-next', '.cw-play', '.cw-hub']) {
        const b = (await organ.locator(sel).boundingBox())!;
        expect(Math.min(b.width, b.height), sel).toBeGreaterThanOrEqual(44);
      }
      const look = await organ.evaluate((o) => {
        const view = o.querySelector('.cw-view')!.getBoundingClientRect();
        const rows = [...o.querySelectorAll('.cw-list li')].map((li) => li.getBoundingClientRect());
        const sel = o.querySelector('.cw-list li.cw-sel')!;
        const cs = getComputedStyle(sel);
        const rgb = (c: string) => c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
        const lum = (c: number[]) => { const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!); };
        const a = lum(rgb(cs.color)), b = lum(rgb(cs.backgroundColor));
        return { whole: rows.every((r) => r.bottom <= view.bottom + 0.5), filled: Math.abs(rows[rows.length - 1]!.bottom - view.bottom) <= 1, compact: rows.every((r) => r.height >= 28 && r.height <= 34), wheel: o.querySelector('.cw-wheel')!.getBoundingClientRect().width, rows: rows.length, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), side: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(look.whole).toBe(true);
      // No dead strip under the last row (Steve, Nov 16).
      expect(look.filled).toBe(true);
      // The whole main menu on the first screen in compact rows (they're picked with the wheel,
      // never tapped), and the wheel at its full size, the same as before the eight-row change.
      expect(look.rows).toBe(8);
      expect(look.compact).toBe(true);
      expect(Math.abs(look.wheel - Math.min(300, 0.38 * 759))).toBeLessThanOrEqual(1.5);
      expect(look.ratio).toBeGreaterThanOrEqual(7);
      expect(look.side).toBeLessThanOrEqual(0);
    });
  }
}

test('the Organ’s header names the teams like the board; Now Playing shows time left, Up Next, and a Now Playing row in the menu', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.locator('.cw-sheet');
  // The sample game: RAT 3, DOGS 10, in the 4th.
  await expect(organ.locator('.cw-live')).toHaveText(/4 · RAT 3 DOGS 10/);
  await expect(organ.locator('.cw-arrow')).toHaveCount(1);
  // No Now Playing row until something plays.
  await expect(organ.locator('.cw-list li').first()).not.toContainText('Now Playing');
  await page.getByRole('button', { name: 'Stretch: Take Me Out to the Ball Game' }).click();
  await expect(organ.locator('.cw-title')).toHaveText('Take Me Out to the Ball Game');
  await expect(organ.locator('.cw-times span').last()).toHaveText(/^-\d+:\d\d$/);
  await expect(organ.locator('.cw-next-up')).toContainText('Up Next');
  await organ.locator('.cw-menu').click();
  await organ.locator('.cw-menu').click();
  await expect(organ.locator('.cw-list li').first()).toContainText('Now Playing');
});

test('a fast spin moves more than one row a step', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  const box = (await organ.locator('.cw-wheel').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = box.width * 0.42;
  await page.mouse.move(cx + r * Math.cos(Math.PI / 4), cy + r * Math.sin(Math.PI / 4));
  await page.mouse.down();
  // A quick flick: 60 degrees in two big jumps.
  await page.mouse.move(cx + r * Math.cos((75 * Math.PI) / 180), cy + r * Math.sin((75 * Math.PI) / 180));
  await page.mouse.move(cx + r * Math.cos((105 * Math.PI) / 180), cy + r * Math.sin((105 * Math.PI) / 180));
  await page.mouse.up();
  // A slow 60 degrees is two rows (Pregame); a fast one goes further.
  await expect(organ.locator('.cw-sel')).not.toHaveText(/^(Rally|Celebrate|Pregame)/);
});

for (const width of [375, 430]) {
  test(`the Organ’s ✕ is fully on screen at ${width} points, inside the body’s corner, clear of the screen and the score (Steve, Nov 16)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 759 });
    await sample(page);
    await page.getByRole('button', { name: 'Organ', exact: true }).click();
    await page.waitForTimeout(200);
    const at = await page.locator('.cw-sheet').evaluate((o) => {
      const body = o.querySelector('.cw-player')!.getBoundingClientRect();
      const scr = o.querySelector('.cw-screen')!.getBoundingClientRect();
      const x = o.querySelector('.sh-close')!.getBoundingClientRect();
      return {
        top: body.top,
        inView: x.left >= 0 && x.top >= 0 && x.right <= innerWidth && x.bottom <= innerHeight,
        fromEdge: innerWidth - x.right,
        inBody: x.left >= body.left && x.right <= body.right && x.top >= body.top,
        overScreen: !(x.bottom <= scr.top || x.right <= scr.left || x.left >= scr.right),
      };
    });
    expect(at.top).toBeLessThanOrEqual(12);
    expect(at.inView).toBe(true);
    expect(at.fromEdge).toBeGreaterThanOrEqual(16);
    expect(at.inBody).toBe(true);
    expect(at.overScreen).toBe(false);
  });
}

test('a newly started game shows its live score in the Organ’s header, and it follows each run (Steve, Nov 16)', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.locator('.cw-sheet');
  await expect(organ.locator('.cw-live')).toHaveText(/^1 · \S+ 0 \S+ 0$/);
  await page.locator('.cw-sheet .sh-close').click();
  await page.getByRole('button', { name: /^Home Run(,|$)/ }).click();
  const over = page.getByRole('dialog', { name: 'Home Run' }).getByRole('button', { name: 'Over the Fence' });
  if (await over.count()) await over.click();
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.count()) await skip.click();
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  await expect(organ.locator('.cw-live')).toHaveText(/^1 · \S+ (1 \S+ 0|0 \S+ 1)$/);
});

test('a spin can start on MENU or an arrow, and a still tap on a key is still a tap (Steve, Nov 17)', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  await expect(organ.locator('.cw-sel')).toHaveText(/^Rally/);
  const box = (await organ.locator('.cw-wheel').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = box.width * 0.4;
  // Start right on the forward arrow (3 o'clock) and slide a quarter turn clockwise at a finger's pace.
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  for (let deg = 0; deg <= 100; deg += 5) {
    await page.mouse.move(cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180));
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  // About three rows down, and the arrow's own tap (one row) didn't fire on top of it.
  await expect(organ.locator('.cw-sel')).toHaveText(/^(Pregame|Between Innings)/);
  const before = await organ.locator('.cw-sel').textContent();
  // A plain tap on the forward arrow still moves exactly one row.
  await organ.locator('.cw-next').click();
  await expect(organ.locator('.cw-sel')).not.toHaveText(before!);
  await expect(organ.locator('.cw-wheel')).not.toHaveClass(/cw-spinning/);
});

