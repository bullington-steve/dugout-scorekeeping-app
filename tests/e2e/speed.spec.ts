/*
 * Phase 11's speed check (BUILD_PLAN): with a full season loaded, scoring a
 * play still feels instant. A 24-game season plus a game in progress comes
 * in through Restore, then each tap is timed from the touch to the next
 * painted frame.
 */
import { expect, test } from '@playwright/test';
import { replay } from '../../src/engine/replay.ts';
import { makeBackup } from '../../src/store/backup.ts';
import { emptyData, newTeam } from '../../src/store/model.ts';
import { simulateSeason } from '../sim/hand-scorer.ts';
import { freshApp, key, restoreFile } from '../helpers/app.ts';

const GAMES = 24;
/** A tap to the painted frame. A real iPhone 16 is faster than a headless runner; this catches a slide. */
const BUDGET_MS = 120;

test(`scoring stays instant with a ${GAMES}-game season loaded`, async ({ page }) => {
  test.setTimeout(90_000);
  const roster = Array.from({ length: 12 }, (_, n) => `p${n + 1}`);
  const season = simulateSeason(7, GAMES + 1, { roster, ruleSetId: 'fc-2hr', mode: 'scorekeeper', count: true, hitLocation: true, defenseCard: true });
  const data = emptyData();
  const team = newTeam('t', 'Diamond Dogs');
  team.abbr = 'DOGS';
  team.players = roster.map((id, n) => ({ id, name: `Player ${n + 1}`, number: String(n + 1), positions: [] }));
  team.seasons = [{ id: 's', name: 'Fall 2026', start: '2026-09-01' }];
  team.currentSeasonId = 's';
  season.games.forEach((g, n) => {
    const last = n === GAMES;
    // The last game is tonight's: the first half of its plays, still in progress.
    const events = last ? g.events.slice(0, Math.floor(g.events.length / 2)) : g.events;
    team.games.push({ ...g, id: `g${n}`, events, seasonId: 's', date: `2026-09-${String(n + 1).padStart(2, '0')}`, opponent: 'Lakeside Lightning', opponentAbbr: 'LAKE', park: '', saved: !last });
  });
  team.currentGameId = `g${GAMES}`;
  data.teams.push(team);
  data.activeTeamId = 't';
  expect(replay(team.games[GAMES]!).final).toBeFalsy();

  await freshApp(page);
  await key(page, 'Restore from Backup').click();
  await restoreFile(page, 'scorekept-backup-2026-09-30.json', makeBackup(data, [], new Date()).text);
  await page.getByRole('dialog', { name: 'Backup & Restore' }).getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();

  // Each tap: Ball, then Undo, so the game stays put and every tap does the same work.
  const times = await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const find = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label);
    const out: number[] = [];
    for (let i = 0; i < 12; i++) {
      for (const label of ['Ball', 'Undo']) {
        const b = find(label);
        if (!b) throw new Error(`no ${label} key`);
        const t0 = performance.now();
        b.click();
        await frame();
        out.push(performance.now() - t0);
      }
    }
    return out;
  });
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  test.info().annotations.push({ type: 'speed', description: `median ${median.toFixed(1)} ms, slowest ${sorted.at(-1)!.toFixed(1)} ms over ${times.length} taps` });
  console.log(`speed: median ${median.toFixed(1)} ms, slowest ${sorted.at(-1)!.toFixed(1)} ms`);
  expect(median).toBeLessThan(BUDGET_MS);
});
