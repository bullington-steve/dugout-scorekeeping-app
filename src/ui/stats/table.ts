/*
 * Stats tables (SPEC §7): sort by any column (tap its header), names pinned
 * while the columns scroll sideways, team leaders underlined, a Team row at
 * the bottom that never sorts.
 */
import { h } from '../dom.ts';

export interface Column<R> {
  key: string;
  label: string;
  /** What VoiceOver says for the header ("Batting Average"). */
  name?: string;
  value: (row: R) => number | null;
  text: (row: R) => string;
  /** Leaders get underlined; off for stats where more isn't better (K). */
  lead?: boolean;
}

export interface TableOptions<R> {
  caption: string;
  rowName: (row: R) => string;
  onName?: (row: R) => void;
  total?: R;
  sort: { key: string; desc: boolean };
  onSort: (key: string, desc: boolean) => void;
}

export function statsTable<R>(rows: readonly R[], cols: readonly Column<R>[], o: TableOptions<R>): HTMLElement {
  const col = cols.find((c) => c.key === o.sort.key);
  const sorted = [...rows];
  if (col) {
    sorted.sort((a, b) => {
      const va = col.value(a);
      const vb = col.value(b);
      if (va === null && vb === null) return o.rowName(a).localeCompare(o.rowName(b));
      if (va === null) return 1;
      if (vb === null) return -1;
      return o.sort.desc ? vb - va : va - vb;
    });
  } else sorted.sort((a, b) => o.rowName(a).localeCompare(o.rowName(b)));

  const best = new Map<string, number>();
  for (const c of cols) {
    if (c.lead === false) continue;
    let m = -Infinity;
    for (const r of rows) {
      const v = c.value(r);
      if (v !== null && v > m) m = v;
    }
    if (m > 0 && rows.length > 1) best.set(c.key, m);
  }

  const nameSort = o.sort.key === 'name';
  const head = h(
    'tr',
    {},
    h('th', { scope: 'col', class: 'st-name', 'aria-sort': nameSort ? 'ascending' : 'none' }, sortButton('Player', 'name', nameSort, false, o)),
    ...cols.map((c) => {
      const on = o.sort.key === c.key;
      return h('th', { scope: 'col', 'aria-sort': on ? (o.sort.desc ? 'descending' : 'ascending') : 'none' }, sortButton(c.label, c.key, on, o.sort.desc, o, c.name));
    }),
  );
  const line = (r: R, total: boolean) =>
    h(
      'tr',
      { class: total ? 'st-total' : '' },
      h('th', { scope: 'row', class: 'st-name' }, !total && o.onName ? nameButton(r, o) : o.rowName(r)),
      ...cols.map((c) => {
        const v = c.value(r);
        const lead = !total && v !== null && best.get(c.key) === v;
        return h('td', { class: lead ? 'st-lead' : '' }, c.text(r), lead ? h('span', { class: 'sk-visually-hidden' }, ' (team leader)') : '');
      }),
    );
  return h(
    'div',
    { class: 'st-table-wrap', tabindex: '0', role: 'region', 'aria-label': o.caption },
    h('table', { class: 'st-table' }, h('caption', { class: 'sk-visually-hidden' }, o.caption), h('thead', {}, head), h('tbody', {}, ...sorted.map((r) => line(r, false)), ...(o.total ? [line(o.total, true)] : []))),
  );
}

function sortButton<R>(label: string, key: string, on: boolean, desc: boolean, o: TableOptions<R>, name?: string): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'st-sort', 'aria-label': `${name ?? label}${on ? (desc ? ', sorted high to low' : ', sorted') : ''}. Sort.` }, label, on ? h('span', { class: 'st-arrow', 'aria-hidden': 'true' }, desc ? '▼' : '▲') : '');
  b.addEventListener('click', () => o.onSort(key, on ? !desc : key !== 'name'));
  return b;
}

function nameButton<R>(r: R, o: TableOptions<R>): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'st-player' }, o.rowName(r));
  b.addEventListener('click', () => o.onName!(r));
  return b;
}

// ---- number formats ---------------------------------------------------------------------------

/** .333, 1.050, or – when there's nothing to divide. */
export function rate3(v: number | null): string {
  if (v === null) return '–';
  const s = v.toFixed(3);
  return v < 1 ? s.replace(/^0/, '') : s;
}

export const percent = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
export const two = (v: number | null) => (v === null ? '–' : v.toFixed(2));
export const one = (v: number | null) => (v === null ? '–' : v.toFixed(1));
