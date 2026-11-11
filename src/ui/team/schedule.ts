/*
 * Seasons and the schedule (SPEC §10): Spring, Summer, Fall + year; New
 * Season suggests the next one and refuses duplicates and mid-game starts.
 * Schedule entries: date, time, opponent, field, home/away or Not Sure Yet.
 */
import type { App } from '../../app/app.ts';
import { localDate } from '../../app/app.ts';
import { resultFor, stateOf } from '../../stats/index.ts';
import { newId, type ScheduledGame } from '../../store/model.ts';
import { group, segmented, selectField, textField } from '../controls.ts';
import { h } from '../dom.ts';
import { choose, confirm, openSheet } from '../sheet.ts';
import { dayText, timeText } from '../when.ts';

const TERMS = ['Spring', 'Summer', 'Fall'] as const;

/** The season after the newest one ("Fall 2026" → "Spring 2027"). */
export function nextSeasonName(names: readonly string[], today: string): string {
  const parsed = names
    .map((n) => n.match(/^(Spring|Summer|Fall) (\d{4})$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ term: TERMS.indexOf(m[1] as (typeof TERMS)[number]), year: Number(m[2]) }))
    .sort((a, b) => a.year - b.year || a.term - b.term);
  const last = parsed[parsed.length - 1];
  if (!last) {
    const [y, m] = today.split('-').map(Number) as [number, number];
    return `${m <= 5 ? 'Spring' : m <= 8 ? 'Summer' : 'Fall'} ${y}`;
  }
  return last.term === 2 ? `Spring ${last.year + 1}` : `${TERMS[last.term + 1]} ${last.year}`;
}

export function openNewSeason(app: App): void {
  const team = app.ensureTeam();
  const suggestion = nextSeasonName(team.seasons.map((s) => s.name), localDate(Date.now()));
  const [term0, year0] = suggestion.split(' ') as [string, string];
  const pick = { term: term0, year: year0 };
  const thisYear = new Date().getFullYear();
  const message = h('p', { class: 'sh-status', role: 'status' });
  openSheet({
    title: 'New Season',
    body: [
      segmented('Season', TERMS.map((t) => ({ value: t, label: t })), pick.term, (v) => (pick.term = v)),
      selectField('Year', [thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: String(y) })), pick.year, (v) => (pick.year = v)),
      h('p', { class: 'sk-row-note' }, 'Your roster carries over. Stats start fresh for the new season.'),
      message,
    ],
    cancel: 'Cancel',
    done: {
      label: 'Start Season',
      onClick: () => {
        const r = app.newSeason(`${pick.term} ${pick.year}`);
        if (r.ok) return true;
        message.textContent = r.why === 'mid-game' ? 'Finish the game in progress first.' : 'That season already exists.';
        return false;
      },
    },
  });
}

export function openScheduleEntry(app: App, existing?: ScheduledGame): void {
  const team = app.ensureTeam();
  if (!team.currentSeasonId) {
    const name = nextSeasonName([], localDate(Date.now()));
    app.newSeason(name);
  }
  const e: ScheduledGame = existing
    ? { ...existing }
    : { id: newId(), seasonId: team.currentSeasonId!, date: localDate(Date.now()), time: '18:30', opponent: '', park: app.data.parks[0] ?? '', side: null };
  const opponents = [...new Set([...team.games.map((g) => g.opponent), ...team.schedule.map((s) => s.opponent)].filter(Boolean))];
  const oppList = h('datalist', { id: 'sch-opponents' }, ...opponents.map((o) => h('option', { value: o })));
  const parkList = h('datalist', { id: 'sch-parks' }, ...app.data.parks.map((p) => h('option', { value: p })));
  const del = h('button', { type: 'button', class: 'sk-quiet-danger', hidden: !existing }, 'Delete From Schedule');
  const sheet = openSheet({
    title: existing ? 'Scheduled Game' : 'Add a Game',
    body: [
      textField('Date', e.date, (v) => (e.date = v), { type: 'date' }),
      textField('Time', e.time, (v) => (e.time = v), { type: 'time' }),
      textField('Opponent', e.opponent, (v) => (e.opponent = v), { list: 'sch-opponents', autocapitalize: 'words' }),
      textField('Park & Field', e.park, (v) => (e.park = v), { list: 'sch-parks', autocapitalize: 'words', placeholder: 'Rolland Moore Park #3' }),
      segmented(
        'Home or Away',
        [
          { value: 'home', label: 'Home' },
          { value: 'away', label: 'Away' },
          { value: '', label: 'Not Sure Yet' },
        ],
        e.side ?? '',
        (v) => (e.side = v === '' ? null : (v as 'home' | 'away')),
      ),
      oppList,
      parkList,
      del,
    ],
    cancel: 'Cancel',
    done: {
      label: 'Save',
      onClick: () => {
        e.opponent = e.opponent.trim() || 'Opponent';
        app.saveScheduled(e);
      },
    },
  });
  del.addEventListener('click', async () => {
    if (!(await confirm('Delete This Game?', 'It comes off the schedule.', 'Delete'))) return;
    app.deleteScheduled(e.id);
    sheet.close();
  });
}

/** One row of the schedule: when, who, where, and the result once played. */
export function scheduleRow(app: App, e: ScheduledGame): HTMLButtonElement {
  const team = app.team!;
  const game = team.games.find((g) => g.id === e.gameId);
  let status = e.side === 'home' ? 'Home' : e.side === 'away' ? 'Away' : '';
  if (game) {
    const res = resultFor(game);
    const s = stateOf(game);
    const ours = s.score[game.setup.us];
    const theirs = s.score[game.setup.us === 'home' ? 'away' : 'home'];
    status = game.saved && res ? `${res} ${ours}–${theirs}` : 'Live';
  }
  const b = h(
    'button',
    { type: 'button', class: 'sk-row tm-sched' },
    h(
      'span',
      { class: 'tm-sched-main' },
      h('span', { class: 'sk-row-label' }, `${dayText(e.date)}${e.time ? ` · ${timeText(e.time)}` : ''}`),
      h('span', { class: 'tm-sched-sub' }, `vs ${e.opponent}${e.park ? ` · ${e.park}` : ''}`),
    ),
    h('span', { class: 'sk-row-detail' }, status),
  );
  b.addEventListener('click', () => openScheduleEntry(app, e));
  return b;
}

export async function pickSeason(app: App): Promise<void> {
  const team = app.team;
  if (!team) return;
  const id = await choose('Season', team.seasons.map((s) => ({ label: s.name, value: s.id, kind: s.id === team.currentSeasonId ? ('primary' as const) : undefined })));
  if (id) app.setSeason(id);
}

export { group };
