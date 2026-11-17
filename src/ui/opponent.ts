/*
 * An opponent's colors (Steve, Nov 17): the teams we play are saved with two colors, so their
 * pennant and patch show on the recap picture and Scout. The same one-grid picker as Edit Team:
 * Primary / Secondary above all 18 colors, the pennant live on top. Saves as you go.
 */
import type { App } from '../app/app.ts';
import type { Opponent } from '../store/model.ts';
import { h, setAttr } from './dom.ts';
import { PALETTE_NAMES, teamColor, titleCaseColor } from './palette.ts';
import { openSheet } from './sheet.ts';
import { pennant } from './teammark.ts';

export function colorsText(o: Pick<Opponent, 'colors'>): string {
  return `${titleCaseColor(o.colors.primary)} and ${titleCaseColor(o.colors.secondary)}`;
}

export function openOpponentColors(app: App, id: string, done?: () => void): void {
  const find = () => app.team?.opponents?.find((o) => o.id === id);
  const first = find();
  if (!first) return;
  let which: 'primary' | 'secondary' = 'primary';
  const preview = h('div', { class: 'op-preview' });
  const drawPreview = () => {
    const o = find();
    if (o) preview.replaceChildren(pennant(o.abbr, o.colors.primary, o.colors.secondary, 96, 48));
  };
  const grid = h('div', { class: 'tm-swatches', role: 'radiogroup' });
  const swatches = PALETTE_NAMES.map((name) => {
    const b = h('button', { type: 'button', role: 'radio', class: 'tm-swatch', 'aria-label': titleCaseColor(name) });
    b.style.setProperty('--swatch', teamColor(name));
    b.addEventListener('click', () => {
      app.setOpponentColors(id, { [which]: name });
      refresh();
    });
    return b;
  });
  grid.append(...swatches);
  const side = (s: 'primary' | 'secondary') => {
    const b = h('button', { type: 'button', class: 'sk-seg tm-color-side' });
    b.addEventListener('click', () => {
      which = s;
      refresh();
    });
    return b;
  };
  const sides = { primary: side('primary'), secondary: side('secondary') };
  const switcher = h('div', { class: 'sk-segmented tm-color-switch', role: 'group', 'aria-label': 'Which Color' }, sides.primary, sides.secondary);
  function refresh(): void {
    const o = find();
    if (!o) return;
    for (const s of ['primary', 'secondary'] as const) {
      const dot = h('span', { class: 'tm-dot', 'aria-hidden': 'true' });
      dot.style.setProperty('--swatch', teamColor(o.colors[s]));
      sides[s].replaceChildren(dot, `${s === 'primary' ? 'Primary' : 'Secondary'}: ${titleCaseColor(o.colors[s])}`);
      setAttr(sides[s], 'aria-pressed', String(s === which));
    }
    setAttr(grid, 'aria-label', which === 'primary' ? 'Primary Color' : 'Secondary Color');
    for (const [i, b] of swatches.entries()) setAttr(b, 'aria-checked', String(PALETTE_NAMES[i] === o.colors[which]));
    drawPreview();
  }
  refresh();
  openSheet({
    title: `${first.name} Colors`,
    body: [preview, h('section', { class: 'sk-group tm-colors' }, h('h3', { class: 'sk-label' }, 'Team Colors'), switcher, grid)],
    cancel: false,
    onClose: done,
  });
}
