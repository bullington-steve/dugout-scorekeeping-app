/*
 * The player card and the player editor (SPEC §9). The editor saves on Done,
 * so a half-typed change is never half saved.
 */
import { walkupGroup } from '../sound/walkup.ts';
import type { App } from '../../app/app.ts';
import type { LineupPos } from '../../engine/types.ts';
import { POSITION_ABBR } from '../../engine/words.ts';
import { newId, type Player } from '../../store/model.ts';
import { group, segmented, selectField, switchRow, textField } from '../controls.ts';
import { h, setAttr } from '../dom.ts';
import { shrinkPhoto } from '../photo.ts';
import { confirm, openSheet } from '../sheet.ts';

export const POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((p) => ({ value: String(p), label: POSITION_ABBR[p] })),
  { value: 'EH', label: 'EH' },
];

export function posLabel(p: LineupPos): string {
  return p === 'EH' ? 'EH' : POSITION_ABBR[p];
}

export function positionsText(p: Player): string {
  return p.positions.map(posLabel).join(' · ');
}

/** A round photo, or the number, or initials. */
export function avatar(p: Player, size = 40): HTMLElement {
  if (p.photo) return h('img', { class: 'tm-avatar', src: p.photo, alt: '', width: size, height: size });
  const text = p.number || p.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  return h('span', { class: 'tm-avatar tm-avatar-text', 'aria-hidden': 'true' }, text);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Edit Player, or a new one when `existing` is missing. Resolves the saved player, or null. */
export function openPlayerEditor(app: App, existing?: Player, opts: { reserve?: boolean } = {}): Promise<Player | null> {
  const p: Player = existing ? structuredClone(existing) : { id: newId(), name: '', number: '', positions: [], ...(opts.reserve ? { reserve: true } : {}) };
  return new Promise((resolve) => {
    let saved = false;
    const photoBox = h('div', { class: 'tm-photo' }, avatar(p, 72));
    const photoInput = h('input', { type: 'file', accept: 'image/*', class: 'sk-file', 'aria-label': 'Take or Choose Photo' });
    const photoBtn = h('label', { class: 'sk-key sk-file-button' }, h('span', { 'aria-hidden': 'true' }, 'Take or Choose Photo'), photoInput);
    const removePhoto = h('button', { type: 'button', class: 'sk-quiet-danger', hidden: !p.photo }, 'Remove Photo');
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0];
      photoInput.value = '';
      if (!file) return;
      try {
        p.photo = await shrinkPhoto(file);
        photoBox.replaceChildren(avatar(p, 72));
        removePhoto.hidden = false;
      } catch {
        // A photo that can't be read is simply skipped.
      }
    });
    removePhoto.addEventListener('click', () => {
      delete p.photo;
      photoBox.replaceChildren(avatar(p, 72));
      removePhoto.hidden = true;
    });

    const posSelect = (label: string, i: number) =>
      selectField(label, POSITION_OPTIONS, p.positions[i] === undefined ? '' : String(p.positions[i]), (v) => {
        const list = [p.positions[0], p.positions[1], p.positions[2]];
        list[i] = v === '' ? undefined : v === 'EH' ? 'EH' : (Number(v) as LineupPos);
        p.positions = list.filter((x): x is LineupPos => x !== undefined);
      });

    const stars = h('div', { class: 'tm-stars', role: 'group', 'aria-label': 'Hitter Rating' });
    const drawStars = () => {
      stars.replaceChildren(
        ...[1, 2, 3, 4, 5].map((n) => {
          const b = h('button', { type: 'button', class: 'tm-star', 'aria-label': `${n} ${n === 1 ? 'star' : 'stars'}`, 'aria-pressed': String((p.rating ?? 0) === n) }, (p.rating ?? 0) >= n ? '★' : '☆');
          b.addEventListener('click', () => {
            if (p.rating === n) delete p.rating;
            else p.rating = n;
            drawStars();
          });
          return b;
        }),
      );
    };
    drawStars();

    const [bm, bd] = (p.birthday ?? '').split('-');
    const birthday = { m: bm ?? '', d: bd ?? '' };
    const setBirthday = () => {
      if (birthday.m && birthday.d) p.birthday = `${birthday.m}-${birthday.d}`;
      else delete p.birthday;
    };

    const del = h('button', { type: 'button', class: 'sk-quiet-danger', hidden: !existing }, 'Delete Player');
    const sheet = openSheet({
      title: existing ? 'Edit Player' : 'New Player',
      full: true,
      body: [
        group('Photo', h('div', { class: 'tm-photo-row' }, photoBox, h('div', { class: 'sk-stack' }, photoBtn, removePhoto))),
        group(
          'Player',
          textField('Name', p.name, (v) => (p.name = v), { autocapitalize: 'words', placeholder: 'Jess Kowalczyk' }),
          textField('Number', p.number, (v) => (p.number = v.replace(/\D/g, '').slice(0, 3)), { inputmode: 'numeric', maxlength: '3' }),
        ),
        group('Positions', posSelect('Main Position', 0), posSelect('Second Position', 1), posSelect('Third Position', 2)),
        group(
          'Batting',
          segmented(
            'Bats',
            [
              { value: 'R', label: 'Right' },
              { value: 'L', label: 'Left' },
              { value: 'S', label: 'Switch' },
            ],
            p.bats ?? '',
            (v) => (p.bats = v as Player['bats']),
          ),
          h('p', { class: 'sk-field-label' }, 'Hitter Rating'),
          stars,
          h('p', { class: 'sk-row-note' }, 'Suggest Order puts a strong bat (4 or 5 stars) every third spot.'),
        ),
        group(
          'Playing Time',
          segmented(
            'Bench',
            [
              { value: 'first', label: 'Sits First' },
              { value: 'normal', label: 'Normal' },
              { value: 'last', label: 'Sits Last' },
            ],
            p.bench ?? 'normal',
            (v) => (p.bench = v as Player['bench']),
          ),
          switchRow('Limited Mobility', !!p.limitedMobility, (v) => (p.limitedMobility = v || undefined), 'Auto-Rotate plays them in right field.'),
          switchRow('Reserve', !!p.reserve, (v) => (p.reserve = v || undefined), 'Reserves aren’t in Who’s Here unless you add them.'),
        ),
        walkupGroup(app, p),
        group(
          'More',
          selectField('Birthday Month', [{ value: '', label: 'None' }, ...MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))], birthday.m, (v) => {
            birthday.m = v;
            setBirthday();
          }),
          selectField('Birthday Day', [{ value: '', label: 'None' }, ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }))], birthday.d, (v) => {
            birthday.d = v;
            setBirthday();
          }),
          segmented(
            'Gender',
            [
              { value: 'm', label: 'Male' },
              { value: 'f', label: 'Female' },
              { value: 'x', label: 'Other' },
            ],
            p.gender ?? '',
            (v) => (p.gender = v as Player['gender']),
          ),
          h('p', { class: 'sk-row-note' }, 'Only used for the Mixed League lineup check.'),
          textField('Phone', p.phone ?? '', (v) => (p.phone = v.trim() || undefined), { type: 'tel', inputmode: 'tel', autocomplete: 'tel' }),
        ),
        del,
      ],
      cancel: 'Cancel',
      done: {
        label: 'Done',
        onClick: () => {
          p.name = p.name.trim() || 'Fill-in';
          if (p.walkup && !p.walkup.tune && !p.walkup.fileId) delete p.walkup;
          for (const k of Object.keys(p) as (keyof Player)[]) if (p[k] === undefined) delete p[k];
          app.savePlayer(p);
          saved = true;
          resolve(p);
        },
      },
      onClose: () => {
        if (!saved) resolve(null);
      },
    });
    del.addEventListener('click', async () => {
      if (!(await confirm('Delete This Player?', `${p.name || 'This player'} comes off the roster. Saved games keep their plays.`, 'Delete Player'))) return;
      app.deletePlayer(p.id);
      saved = true;
      resolve(null);
      sheet.close();
    });
    if (!existing) requestAnimationFrame(() => (sheet.body.querySelector('input[type="text"]') as HTMLInputElement | null)?.focus());
    setAttr(photoInput, 'capture', null);
  });
}
