/*
 * Game dates are calendar days (Steve, Nov 23: he's in Madrid; the games are in Colorado). A date is
 * saved as "2026-11-15" and shown as that same day wherever the iPhone is, never shifted through UTC
 * or the phone's time zone.
 */
import { expect, test } from '@playwright/test';
import { emptyData, newTeam } from '../../src/store/model.ts';

for (const zone of ['America/Denver', 'America/New_York', 'Europe/Madrid', 'Asia/Tokyo']) {
  test.describe(zone, () => {
    test.use({ timezoneId: zone });
    test(`a game dated Sun, Nov 15 shows as Sun, Nov 15 with the iPhone in ${zone}`, async ({ page }) => {
      const data = emptyData();
      const team = newTeam('t1', 'Diamond Dogs');
      team.schedule.push({ id: 's1', seasonId: team.currentSeasonId!, date: '2026-11-15', time: '18:30', opponent: 'Poudre River Rats', park: 'Rolland Moore Park', side: 'home' });
      data.teams.push(team);
      data.activeTeamId = team.id;
      await page.goto('./');
      await page.evaluate((d) => {
        localStorage.clear();
        localStorage.setItem('scorekept:data', d);
        localStorage.setItem('scorekept:seen:homescreen', '1');
      }, JSON.stringify({ ...data, onboarded: true }));
      await page.reload();
      await page.getByRole('tab', { name: 'Team' }).click();
      const row = page.getByRole('button', { name: /vs Poudre River Rats/ });
      await expect(row).toContainText('Sun, Nov 15');
      // And the browser really is in that zone (a Denver evening game is the next day in Tokyo).
      const offset = await page.evaluate(() => new Date(2026, 10, 15, 18, 30).getTimezoneOffset());
      expect(offset).toBe({ 'America/Denver': 420, 'America/New_York': 300, 'Europe/Madrid': -60, 'Asia/Tokyo': -540 }[zone]);
    });
  });
}
