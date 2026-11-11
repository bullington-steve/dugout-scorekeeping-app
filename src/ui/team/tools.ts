/*
 * Team tools (SPEC §9): the depth chart and dues.
 */
import type { App } from '../../app/app.ts';
import { depthChart, duesKey, duesSummary, emptyDues, money, parseMoney, type DuesLine } from '../../app/teamtools.ts';
import { POSITION_ABBR, POSITION_NAMES } from '../../engine/words.ts';
import type { Dues } from '../../store/model.ts';
import { switchRow, textField } from '../controls.ts';
import { h } from '../dom.ts';
import { openSheet } from '../sheet.ts';

const cap = (s: string) => s.replace(/(^|[\s-])(\w)/g, (_, a: string, b: string) => a + b.toUpperCase());
const RANK = ['main', '2nd', '3rd'];

/** Every position's options, main first; thin spots in red; reserves apart. */
export function openDepthChart(app: App): void {
  const team = app.team;
  if (!team) return;
  const rows = depthChart(team.players);
  const list = h(
    'div',
    { class: 'dp-list' },
    ...rows.map((r) => {
      const only = r.players.length === 1 ? `only ${r.players[0]!.player.name.split(/\s+/)[0]}` : r.players.length === 0 ? 'nobody yet' : '';
      return h(
        'section',
        { class: `dp-row${r.thin ? ' dp-thin' : ''}`, 'aria-label': `${cap(POSITION_NAMES[r.pos])}${only ? `, ${only}` : ''}` },
        h('h3', { class: 'dp-pos' }, h('span', { class: 'dp-abbr' }, POSITION_ABBR[r.pos]), only ? h('span', { class: 'dp-flag' }, `(${only})`) : null),
        r.players.length
          ? h('ol', { class: 'dp-names' }, ...r.players.map((x) => h('li', {}, x.player.name, h('span', { class: 'dp-rank' }, ` ${RANK[x.rank] ?? ''}`))))
          : null,
        r.reserves.length ? h('p', { class: 'dp-reserves' }, `Reserves: ${r.reserves.map((p) => p.name).join(', ')}`) : null,
      );
    }),
  );
  openSheet({
    title: 'Depth Chart',
    full: true,
    body: [h('p', { class: 'sk-row-note' }, 'Who can play each position, from the positions on each player’s card. Red means one option or none.'), list],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

export function duesDetail(app: App): string {
  const team = app.team;
  if (!team) return '';
  const s = duesSummary(team);
  if (!s.fee) return 'Not set';
  return s.toGo ? `${money(s.toGo)} to go` : 'All paid ✓';
}

/** The league fee split across payers; who has paid. */
export function openDues(app: App, onChange: () => void): void {
  const team = app.team;
  if (!team) return;
  const key = duesKey(team);
  const season = team.seasons.find((x) => x.id === team.currentSeasonId)?.name;
  const current = (): Dues => structuredClone(app.team?.dues?.[key] ?? emptyDues());
  const save = (change: (d: Dues) => void) => {
    app.updateTeam((t) => {
      const d = structuredClone(t.dues?.[key] ?? emptyDues());
      change(d);
      t.dues = { ...(t.dues ?? {}), [key]: d };
    });
    render();
    onChange();
  };

  const summary = h('div', { class: 'du-summary', 'aria-live': 'polite' });
  const list = h('div', { class: 'sk-stack' });
  const rows = new Map<string, { button: HTMLButtonElement; status: HTMLElement; line: DuesLine }>();
  const feeField = textField('League Fee', current().fee ? (current().fee / 100).toFixed(2) : '', (v) => {
    const cents = parseMoney(v);
    if (cents !== null) save((d) => (d.fee = cents));
  }, { inputmode: 'decimal', placeholder: '$0.00' });

  function render(): void {
    const t = app.team;
    if (!t) return;
    const s = duesSummary(t);
    summary.replaceChildren(
      h('p', { class: 'du-split' }, s.payers ? `${money(s.fee)} ÷ ${s.payers} = ${money(s.share)} each` : 'Add players to split the fee.'),
      h('p', { class: 'du-totals' }, h('span', {}, `Collected ${money(s.collected)}`), h('span', {}, `To Go ${money(s.toGo)}`)),
    );
    // Update rows in place: a redraw under a finger loses the tap (LESSONS 67).
    const ids = s.lines.map((l) => l.player.id).join(',');
    if (list.dataset.ids !== ids) {
      rows.clear();
      list.replaceChildren(...s.lines.map((l) => duesRow(l)));
      list.dataset.ids = ids;
    }
    for (const l of s.lines) {
      const row = rows.get(l.player.id);
      if (!row) continue;
      row.line = l;
      row.status.textContent = status(l);
      row.button.classList.toggle('du-paid', l.owes === 0);
    }
  }

  function status(l: DuesLine): string {
    if (l.exempt) return 'Doesn’t Pay';
    if (l.owes === 0 && l.paid > 0) return 'Paid ✓';
    if (l.paid > 0) return `Paid ${money(l.paid)}, owes ${money(l.owes)}`;
    return `Owes ${money(l.owes)}`;
  }

  function duesRow(l: DuesLine): HTMLElement {
    const st = h('span', { class: 'sk-row-detail du-status' }, status(l));
    const b = h('button', { type: 'button', class: 'sk-row du-row' }, h('span', { class: 'sk-row-label' }, l.player.name), st);
    const row = { button: b, status: st, line: l };
    rows.set(l.player.id, row);
    b.addEventListener('click', () => openPayer(row.line));
    return b;
  }

  function openPayer(l: DuesLine): void {
    const t = app.team;
    if (!t) return;
    const s = duesSummary(t);
    let amount = l.paid ? (l.paid / 100).toFixed(2) : '';
    let exempt = l.exempt;
    const error = h('p', { class: 'sk-row-note', 'aria-live': 'polite' });
    const full = h('button', { type: 'button', class: 'sk-key sk-primary' }, `Paid in Full (${money(s.share)})`);
    const sheet = openSheet({
      title: l.player.name,
      body: [
        full,
        textField('Amount Paid', amount, (v) => (amount = v), { inputmode: 'decimal', placeholder: '$0.00' }),
        error,
        switchRow('Doesn’t Pay', exempt, (v) => (exempt = v), 'A sponsor, a manager, or anyone the team covers. The fee splits across everyone else.'),
      ],
      cancel: 'Cancel',
      done: {
        label: 'Done',
        onClick: () => {
          const cents = amount.trim() === '' ? 0 : parseMoney(amount);
          if (cents === null) {
            error.textContent = 'Enter an amount like 59.10.';
            return false;
          }
          save((d) => {
            d.paid[l.player.id] = cents;
            if (!cents) delete d.paid[l.player.id];
            d.exempt = d.exempt.filter((id) => id !== l.player.id);
            if (exempt) d.exempt.push(l.player.id);
          });
        },
      },
    });
    full.addEventListener('click', () => {
      save((d) => {
        d.paid[l.player.id] = s.share;
        d.exempt = d.exempt.filter((id) => id !== l.player.id);
      });
      sheet.close();
    });
  }

  render();
  openSheet({
    title: season ? `Dues, ${season}` : 'Dues',
    full: true,
    body: [feeField, h('p', { class: 'sk-row-note' }, 'The fee splits evenly across everyone on the roster who pays, rounded up to the cent. Tap a name to mark what they’ve paid.'), summary, list],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}
