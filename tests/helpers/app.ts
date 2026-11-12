/* Driving the app the way a person would: by roles and names. */
import { expect, type Page } from '@playwright/test';
import { fontsReady } from './checks.ts';
import { emptyData } from '../../src/store/model.ts';

export interface GameOptions {
  opponent?: string;
  mode?: 'Dugout Mode' | 'Scorekeeper Mode';
  ruleSet?: string;
  count?: boolean;
  hitLocation?: boolean;
  side?: 'away' | 'home';
}

/**
 * A fresh device. By default it has already been through the welcome screen
 * (most tests start from the empty app); pass { welcome: true } for a device
 * opening ScoreKept for the very first time.
 */
export async function freshApp(page: Page, opts: { welcome?: boolean } = {}): Promise<void> {
  await page.goto('./');
  const doc = opts.welcome ? null : JSON.stringify({ ...emptyData(), onboarded: true });
  await page.evaluate((d) => {
    localStorage.clear();
    sessionStorage.clear();
    if (d) {
      localStorage.setItem('scorekept:data', d);
      localStorage.setItem('scorekept:seen:homescreen', '1');
    }
  }, doc);
  await page.reload();
  await fontsReady(page);
}

export const key = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

export async function startGame(page: Page, o: GameOptions = {}): Promise<void> {
  await key(page, 'New Game').click();
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  const next = () => sheet.getByRole('button', { name: 'Next', exact: true }).click();
  // Who's Here: a brand-new team starts with fill-ins.
  const fillIns = sheet.getByRole('button', { name: 'Start With Ten Fill-In Players' });
  if (await fillIns.isVisible()) await fillIns.click();
  await next();
  // Lineup.
  await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
  await next();
  // Game Details.
  await sheet.getByLabel('Opponent').fill(o.opponent ?? 'Oak Hollow Sluggers');
  if (o.mode) await sheet.getByRole('button', { name: o.mode, exact: true }).click();
  const setSwitch = async (name: string, want: boolean | undefined) => {
    if (want === undefined) return;
    const sw = sheet.getByRole('switch', { name, exact: true });
    if ((await sw.getAttribute('aria-checked')) !== String(want)) await sw.click();
  };
  await setSwitch('Balls and Strikes', o.count ?? false);
  await setSwitch('Hit Location', o.hitLocation ?? false);
  if (o.ruleSet) {
    await sheet.getByText('League Rules', { exact: true }).click();
    await sheet.getByLabel('Rule Set', { exact: true }).selectOption({ label: o.ruleSet });
  }
  await next();
  // Coin toss.
  await sheet.getByRole('button', { name: o.side === 'home' ? 'We’re Home (Bat Second)' : 'We’re Visitors (Bat First)' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

/** The words VoiceOver reads for the board ("… Top of the first, 0 outs."). */
export async function boardWords(page: Page): Promise<string> {
  return (await page.locator('.gm-board .sk-visually-hidden').textContent()) ?? '';
}

export async function restoreFile(page: Page, name: string, text: string): Promise<void> {
  await page.locator('#restore-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('dialog', { name: 'Replace Everything?' }).getByRole('button', { name: 'Restore This Backup' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Restored.' })).toBeVisible();
}
