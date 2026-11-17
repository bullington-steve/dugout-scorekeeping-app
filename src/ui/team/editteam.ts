/*
 * Edit Team (SPEC §9): the score bug pinned on top, name and short name, Primary and Secondary
 * colors (all 18 at once in a 6 × 3 grid, Nov 15), and Big League Colors. Changing a color by
 * hand drops the preset's label. Everything saves as it changes, so the red ✕ beside the title is
 * the only way out (Steve's merged spec, Nov 15). Team Name and Short Name share a row (about
 * 70/30).
 */
import type { App } from '../../app/app.ts';
import { defaultAbbr } from '../../store/model.ts';
import { selectField, textField } from '../controls.ts';
import { h, setAttr } from '../dom.ts';
import { BIG_LEAGUE, PALETTE_NAMES, badgeColors, teamColor, titleCaseColor } from '../palette.ts';
import { BulbText } from '../game/bulbs.ts';
import { openSheet } from '../sheet.ts';

export function teamBadge(abbr: string, primary: string, secondary: string): HTMLElement {
  const { bg, ring, ink } = badgeColors(primary, secondary);
  // The badge is the team's mark, so like a logo it's held to the 4.5:1 minimum (a unit test checks
  // every color pair), not the 7:1 aim: a team's real red is the point (data-contrast-skip).
  const b = h('span', { class: 'tm-badge', 'aria-hidden': 'true', 'data-contrast-skip': '' }, abbr || '?');
  b.style.setProperty('--badge-bg', bg);
  b.style.setProperty('--badge-ink', ink);
  b.style.setProperty('--badge-ring', ring);
  return b;
}

/**
 * The team's colors, shared by Edit Team and setup's Pick Your Colors (Steve, Nov 16): one grid of
 * all 18 colors with a Primary / Secondary switch above it (each side names the color picked), then
 * Big League Colors as one menu, so the step fits one screen.
 */
export function colorGroups(app: App, onChange: () => void, _compact = true): HTMLElement[] {
  const team = app.ensureTeam();
  let which: 'primary' | 'secondary' = 'primary';
  const now = () => app.team ?? team;
  const grid = h('div', { class: 'tm-swatches', role: 'radiogroup' });
  const swatches = PALETTE_NAMES.map((name) => {
    const b = h('button', { type: 'button', role: 'radio', class: 'tm-swatch', 'aria-label': titleCaseColor(name) });
    b.style.setProperty('--swatch', teamColor(name));
    b.addEventListener('click', () => {
      app.updateTeam((t) => {
        t.colors[which] = name;
        delete t.look;
      });
      if (lookMenu) lookMenu.value = '';
      refresh();
      onChange();
    });
    return b;
  });
  grid.append(...swatches);

  const seg = (side: 'primary' | 'secondary') => {
    const b = h('button', { type: 'button', class: 'sk-seg tm-color-side', 'aria-pressed': String(side === which) });
    b.addEventListener('click', () => {
      which = side;
      refresh();
    });
    return b;
  };
  const sides = { primary: seg('primary'), secondary: seg('secondary') };
  const switcher = h('div', { class: 'sk-segmented tm-color-switch', role: 'group', 'aria-label': 'Which Color' }, sides.primary, sides.secondary);

  function refresh(): void {
    const c = now().colors;
    for (const side of ['primary', 'secondary'] as const) {
      const label = side === 'primary' ? 'Primary' : 'Secondary';
      const dot = h('span', { class: 'tm-dot', 'aria-hidden': 'true' });
      dot.style.setProperty('--swatch', teamColor(c[side]));
      sides[side].replaceChildren(dot, `${label}: ${titleCaseColor(c[side])}`);
      setAttr(sides[side], 'aria-pressed', String(side === which));
    }
    setAttr(grid, 'aria-label', which === 'primary' ? 'Primary Color' : 'Secondary Color');
    for (const [i, b] of swatches.entries()) setAttr(b, 'aria-checked', String(PALETTE_NAMES[i] === c[which]));
  }

  let lookMenu: HTMLSelectElement | null = null;
  const menu = selectField(
    'Big League Colors',
    [{ value: '', label: 'Pick a city look (optional)' }, ...BIG_LEAGUE.map((p) => ({ value: p.label, label: p.label }))],
    now().look ?? '',
    (v) => {
      const p = BIG_LEAGUE.find((x) => x.label === v);
      if (!p) return;
      app.updateTeam((t) => {
        t.colors = { primary: p.primary, secondary: p.secondary };
        t.look = p.label;
      });
      refresh();
      onChange();
    },
  );
  lookMenu = menu.querySelector('select');
  refresh();
  return [h('section', { class: 'sk-group tm-colors' }, h('h3', { class: 'sk-label' }, 'Team Colors'), switcher, grid), menu];
}

/**
 * The colors preview, like the first build's (Steve's v1 screenshots, Nov 14): a broadcast score
 * bug in the team's colors. Your badge over the other team's, each with its runs, the inning, the
 * bases with runners on first and third, and the outs. Live as the name and colors change.
 */
/** A number in the scoreboard's LED bulbs, in the boards' housing (Steve, Nov 16: live numbers in bulbs). */
function bulbs(text: string, className: string, template = '0'): HTMLElement {
  const b = new BulbText(template, `${className}-bulbs`);
  b.set(text);
  return h('span', { class: `gm-housing ${className}` }, b.el);
}

export function scorebugPreview(app: App): { el: HTMLElement; draw: () => void } {
  const el = h('div', { class: 'tm-bug', 'aria-hidden': 'true' });
  const draw = () => {
    const t = app.team;
    const abbr = (t?.abbr || defaultAbbr(t?.name ?? '') || 'DOGS').slice(0, 6);
    const row = (badge: HTMLElement, runs: string, up: boolean) =>
      h('div', { class: `tm-bug-row${up ? ' up' : ''}` }, h('span', { class: 'tm-bug-at', 'aria-hidden': 'true' }, up ? '▸' : ''), badge, bulbs(runs, 'tm-bug-runs'));
    const them = h('span', { class: 'tm-bug-opp' }, 'OPP');
    const bag = (on: boolean) => h('span', { class: `tm-bug-bag${on ? ' on' : ''}` });
    el.replaceChildren(
      h('div', { class: 'tm-bug-teams' }, row(teamBadge(abbr, t?.colors.primary ?? 'navy', t?.colors.secondary ?? 'red'), '5', true), row(them, '3', false)),
      h('div', { class: 'tm-bug-inning' }, bulbs('▲6', 'tm-bug-inn', '^0')),
      h(
        'div',
        { class: 'tm-bug-field' },
        h('span', { class: 'tm-bug-bags' }, bag(true), bag(false), bag(true)),
        h('span', { class: 'tm-bug-outs' }, h('span', { class: 'tm-bug-out on' }), h('span', { class: 'tm-bug-out' }), h('span', { class: 'tm-bug-out-label' }, 'Out')),
      ),
    );
  };
  draw();
  return { el, draw };
}

export function openEditTeam(app: App): void {
  const team = app.ensureTeam();
  // Like the first build's Edit Team and setup (Steve, Nov 14): the score bug on top, the color
  // circles, and Big League Colors as one menu instead of a long list.
  const bug = scorebugPreview(app);
  const preview = bug.el;
  const drawPreview = bug.draw;

  openSheet({
    title: 'Edit Team',
    full: true,
    className: 'tm-edit',
    body: [
      h('div', { class: 'tm-pin' }, preview),
      h(
        'div',
        { class: 'tm-names' },
        textField('Team Name', team.name, (v) => {
          app.updateTeam((t) => (t.name = v.trim() || t.name));
          drawPreview();
        }, { autocapitalize: 'words' }),
        textField('Short Name', team.abbr, (v) => {
          app.updateTeam((t) => (t.abbr = v.trim().toUpperCase().slice(0, 6)));
          drawPreview();
        }, { maxlength: '6', autocapitalize: 'characters', placeholder: defaultAbbr(team.name) }),
      ),
      ...colorGroups(app, drawPreview, true),
    ],
    cancel: false,
  });
}
