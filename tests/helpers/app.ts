/* Driving the app the way a person would: by roles and names. */
import { expect, type Page } from '@playwright/test';
import { fontsReady } from './checks.ts';

export interface GameOptions {
  opponent?: string;
  mode?: 'Dugout Mode' | 'Scorekeeper Mode';
  ruleSet?: string;
  count?: boolean;
  hitLocation?: boolean;
  side?: 'away' | 'home';
}

export async function freshApp(page: Page): Promise<void> {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await fontsReady(page);
}

export const key = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

export async function startGame(page: Page, o: GameOptions = {}): Promise<void> {
  await key(page, 'New Game').click();
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await sheet.getByLabel('Opponent').fill(o.opponent ?? 'Oak Hollow Sluggers');
  if (o.mode) await sheet.getByRole('button', { name: o.mode, exact: true }).click();
  if (o.ruleSet) await sheet.getByLabel('Rule Set').selectOption({ label: o.ruleSet });
  const setSwitch = async (name: string, want: boolean | undefined) => {
    if (want === undefined) return;
    const sw = sheet.getByRole('switch', { name });
    if ((await sw.getAttribute('aria-checked')) !== String(want)) await sw.click();
  };
  await setSwitch('Balls and Strikes', o.count ?? false);
  await setSwitch('Hit Location', o.hitLocation ?? false);
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
