/*
 * Edit Team (SPEC §9): name, short name, Primary and Secondary color rows
 * (18 colors, one swiping row each, half the next swatch peeking), and Big
 * League Colors. Changing a color by hand drops the preset's label.
 */
import type { App } from '../../app/app.ts';
import { defaultAbbr } from '../../store/model.ts';
import { group, textField } from '../controls.ts';
import { h, setAttr } from '../dom.ts';
import { BIG_LEAGUE, PALETTE_NAMES, badgeColors, teamColor, titleCaseColor } from '../palette.ts';
import { openSheet } from '../sheet.ts';

export function teamBadge(abbr: string, primary: string, secondary: string): HTMLElement {
  const { bg, ink } = badgeColors(primary, secondary);
  const b = h('span', { class: 'tm-badge', 'aria-hidden': 'true' }, abbr || '?');
  b.style.setProperty('--badge-bg', bg);
  b.style.setProperty('--badge-ink', ink);
  return b;
}

export function openEditTeam(app: App): void {
  const team = app.ensureTeam();
  const preview = h('div', { class: 'tm-preview' });
  const drawPreview = () => preview.replaceChildren(teamBadge(team.abbr || defaultAbbr(team.name), team.colors.primary, team.colors.secondary), h('span', { class: 'tm-preview-look' }, team.look ?? ''));
  drawPreview();

  const rows: Record<'primary' | 'secondary', HTMLElement> = { primary: h('div'), secondary: h('div') };
  const swatchRow = (which: 'primary' | 'secondary') => {
    const row = h('div', { class: 'tm-swatches', role: 'radiogroup', 'aria-label': which === 'primary' ? 'Primary Color' : 'Secondary Color' });
    for (const name of PALETTE_NAMES) {
      const b = h('button', { type: 'button', role: 'radio', class: 'tm-swatch', 'aria-label': titleCaseColor(name), 'aria-checked': String(team.colors[which] === name) });
      b.style.setProperty('--swatch', teamColor(name));
      b.addEventListener('click', () => {
        app.updateTeam((t) => {
          t.colors[which] = name;
          delete t.look;
        });
        for (const other of row.children) setAttr(other, 'aria-checked', String(other === b));
        drawPreview();
      });
      row.append(b);
    }
    rows[which] = row;
    return row;
  };

  const presets = h(
    'div',
    { class: 'tm-presets' },
    ...BIG_LEAGUE.map((p) => {
      const dot = (c: string) => {
        const s = h('span', { class: 'tm-dot', 'aria-hidden': 'true' });
        s.style.setProperty('--swatch', teamColor(c));
        return s;
      };
      const b = h('button', { type: 'button', class: 'sk-row tm-preset' }, h('span', { class: 'tm-dots' }, dot(p.primary), dot(p.secondary)), h('span', { class: 'sk-row-label' }, p.label));
      b.addEventListener('click', () => {
        app.updateTeam((t) => {
          t.colors = { primary: p.primary, secondary: p.secondary };
          t.look = p.label;
        });
        for (const which of ['primary', 'secondary'] as const)
          for (const sw of rows[which].children) setAttr(sw, 'aria-checked', String(sw.getAttribute('aria-label') === titleCaseColor(team.colors[which])));
        drawPreview();
      });
      return b;
    }),
  );

  openSheet({
    title: 'Edit Team',
    full: true,
    body: [
      preview,
      group(
        'Team',
        textField('Team Name', team.name, (v) => {
          app.updateTeam((t) => (t.name = v.trim() || t.name));
          drawPreview();
        }, { autocapitalize: 'words' }),
        textField('Short Name', team.abbr, (v) => {
          app.updateTeam((t) => (t.abbr = v.trim().toUpperCase().slice(0, 5)));
          drawPreview();
        }, { maxlength: '5', autocapitalize: 'characters', placeholder: defaultAbbr(team.name) }),
      ),
      group('Primary Color', swatchRow('primary'), h('p', { class: 'sk-row-note' }, '18 colors · swipe →')),
      group('Secondary Color', swatchRow('secondary'), h('p', { class: 'sk-row-note' }, '18 colors · swipe →')),
      group('Big League Colors', presets),
    ],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}
