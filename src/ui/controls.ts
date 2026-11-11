/*
 * Shared controls. Every one is at least 44 x 44 points; labels are title
 * case and explanations under them sentence case (CLAUDE.md, Words).
 */
import { h, setAttr } from './dom.ts';

/** A Settings row that's a switch: the whole row is the 44-point target. */
export function switchRow(label: string, value: boolean, onChange: (v: boolean) => void, note?: string): HTMLElement {
  const knob = h('span', { class: 'sk-switch', 'aria-hidden': 'true' }, h('span', { class: 'sk-switch-knob' }));
  const b = h('button', { type: 'button', role: 'switch', class: 'sk-row sk-row-switch', 'aria-checked': String(value) }, h('span', { class: 'sk-row-label' }, label), knob);
  b.addEventListener('click', () => {
    value = !value;
    setAttr(b, 'aria-checked', String(value));
    onChange(value);
  });
  return note ? h('div', { class: 'sk-row-group' }, b, h('p', { class: 'sk-row-note' }, note)) : b;
}

/** A row that opens something. */
export function linkRow(label: string, onClick: () => void, detail?: string): HTMLButtonElement {
  const b = h(
    'button',
    { type: 'button', class: 'sk-row sk-row-link' },
    h('span', { class: 'sk-row-label' }, label),
    detail ? h('span', { class: 'sk-row-detail' }, detail) : null,
    h('span', { class: 'sk-chevron', 'aria-hidden': 'true' }, '›'),
  );
  b.addEventListener('click', onClick);
  return b;
}

/** A row that just shows a value. */
export function infoRow(label: string, value: string): HTMLElement {
  return h('div', { class: 'sk-row sk-row-info' }, h('span', { class: 'sk-row-label' }, label), h('span', { class: 'sk-row-detail' }, value));
}

/** Two or three choices side by side (Dugout Mode / Scorekeeper Mode). */
export function segmented<T extends string>(label: string, options: { value: T; label: string }[], value: T, onChange: (v: T) => void): HTMLElement {
  const group = h('div', { class: 'sk-segmented', role: 'group', 'aria-label': label });
  for (const o of options) {
    const b = h('button', { type: 'button', class: 'sk-seg', 'aria-pressed': String(o.value === value) }, o.label);
    b.addEventListener('click', () => {
      for (const other of group.children) setAttr(other, 'aria-pressed', String(other === b));
      onChange(o.value);
    });
    group.append(b);
  }
  return group;
}

export function group(title: string, ...rows: Node[]): HTMLElement {
  return h('section', { class: 'sk-group' }, h('h3', { class: 'sk-label' }, title), h('div', { class: 'sk-group-rows' }, ...rows));
}

/** A labeled text field that saves quietly as you type (no redraw: LESSONS 15). */
export function textField(label: string, value: string, onInput: (v: string) => void, attrs: Record<string, string> = {}): HTMLElement {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  const input = h('input', { id, class: 'sk-input', type: 'text', value, autocomplete: 'off', ...attrs });
  input.addEventListener('input', () => onInput(input.value));
  // iPhone AutoFill (a phone number from Contacts) can send only "change".
  input.addEventListener('change', () => onInput(input.value));
  return h('div', { class: 'sk-field' }, h('label', { for: id, class: 'sk-field-label' }, label), input);
}

export function selectField(label: string, options: { value: string; label: string }[], value: string, onChange: (v: string) => void): HTMLElement {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  const select = h('select', { id, class: 'sk-input' }, ...options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  select.addEventListener('change', () => onChange(select.value));
  return h('div', { class: 'sk-field' }, h('label', { for: id, class: 'sk-field-label' }, label), select);
}

/** "Sat, Oct 17"; the year only when it isn't this year (CLAUDE.md, Words). */
export function shortDate(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}
