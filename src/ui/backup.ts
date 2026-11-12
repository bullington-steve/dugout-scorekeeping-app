/*
 * Backup & Restore (SPEC §16). Save Backup shares ONE file and nothing else
 * (LESSONS 8). Restore reads this app's backups and the first version's.
 * Restoring replaces everything on this iPhone, so it asks first.
 */
import type { App } from '../app/app.ts';
import { makeBackup, readBackup } from '../store/backup.ts';
import { shareFile } from '../store/share.ts';
import { SoundStore } from '../store/sounds.ts';
import { QUARANTINE_PREFIX } from '../store/storage.ts';
import { shortDate } from './controls.ts';
import { offlineReady } from './offline.ts';
import { h, setText } from './dom.ts';
import { confirm, openSheet } from './sheet.ts';

function sounds(): SoundStore | null {
  try {
    return typeof indexedDB === 'undefined' ? null : new SoundStore();
  } catch {
    return null;
  }
}

export async function saveBackup(app: App): Promise<boolean> {
  const store = sounds();
  const files = store ? await store.all().catch(() => []) : [];
  const { name, text } = makeBackup(app.data, files, new Date());
  const outcome = await shareFile(name, text);
  if (outcome !== 'cancelled') app.markBackedUp();
  return outcome !== 'cancelled';
}

export function openBackup(app: App): void {
  const last = h('p', { class: 'sh-message' });
  const status = h('p', { class: 'sh-status', role: 'status' });
  const refresh = () =>
    setText(last, app.data.lastBackup ? `Last backup: ${shortDate(app.data.lastBackup)}.` : 'No backup yet on this iPhone.');
  refresh();

  const save = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Save Backup');
  save.addEventListener('click', async () => {
    if (await saveBackup(app)) {
      refresh();
      setText(status, 'Backup saved.');
    }
  });

  // The file picker covers its button exactly, so the button is the 44-point target.
  const input = h('input', { type: 'file', accept: '.json,application/json', class: 'sk-file', id: 'restore-file', 'aria-label': 'Restore from Backup' });
  const pick = h('label', { class: 'sk-key sk-file-button' }, h('span', { 'aria-hidden': 'true' }, 'Restore from Backup'), input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const result = readBackup(await file.text());
    if (!result.ok) {
      const why = {
        'not-json': 'That file isn’t a ScoreKept backup.',
        'not-a-backup': 'That file isn’t a ScoreKept backup.',
        newer: 'That backup is from a newer version of ScoreKept. Close the app fully, reopen it to update, then try again.',
        damaged: 'That backup is damaged and can’t be restored.',
      }[result.why];
      setText(status, why);
      return;
    }
    const teams = result.data.teams;
    const games = teams.reduce((n, t) => n + t.games.length, 0);
    const players = teams.reduce((n, t) => n + t.players.length, 0);
    const lines = [
      `${teams.map((t) => t.name).join(', ') || 'No teams'}: ${players} players, ${games} ${games === 1 ? 'game' : 'games'}.`,
    ];
    if (result.report) {
      const skipped = result.report.games.reduce((n, g) => n + g.refused.length + g.warnings.length, 0) + result.report.warnings.length;
      lines.push(skipped ? `${skipped} ${skipped === 1 ? 'note' : 'notes'} about plays that couldn’t be placed.` : 'Every play came across.');
    }
    const ok = await confirm(
      'Replace Everything?',
      `${lines.join(' ')} Restoring replaces everything on this iPhone with this backup.`,
      'Restore This Backup',
    );
    if (!ok) return;
    app.replaceData(result.data);
    const store = sounds();
    if (store) await store.replaceAll(result.sounds).catch(() => undefined);
    setText(status, 'Restored.');
    refresh();
  });

  const parts: Node[] = [
    last,
    save,
    h('p', { class: 'sk-row-note' }, 'Save it to Files or iCloud Drive. One file holds everything, song files included.'),
    pick,
    h('p', { class: 'sk-row-note' }, 'Works with backups from any version of ScoreKept.'),
    status,
  ];

  // The safety checklist (SPEC §16): last backup, protected storage, and the offline copy.
  const check = (label: string) => {
    const value = h('span', { class: 'sk-row-detail' }, '…');
    return { row: h('div', { class: 'sk-row sk-row-info' }, h('span', { class: 'sk-row-label' }, label), value), value };
  };
  const lastRow = check('Last Backup');
  const kept = check('Protected Storage');
  const offline = check('Works Offline');
  setText(lastRow.value, app.data.lastBackup ? shortDate(app.data.lastBackup) : 'Never');
  void (navigator.storage?.persisted?.() ?? Promise.resolve(false)).then((p) => setText(kept.value, p ? 'On ✓' : 'Not yet'));
  void offlineReady.then((ok) => setText(offline.value, ok ? 'Ready ✓' : 'Not yet'));
  parts.push(h('section', { class: 'sk-group' }, h('h3', { class: 'sk-label' }, 'Safety Check'), h('div', { class: 'sk-group-rows' }, lastRow.row, kept.row, offline.row)));

  // Anything set aside because it couldn't be read can be saved as a file.
  const asideKeys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(QUARANTINE_PREFIX)) asideKeys.push(k);
    }
  } catch {
    // Storage unavailable: nothing to show.
  }
  if (asideKeys.length) {
    const aside = h('button', { type: 'button', class: 'sk-key' }, 'Save Set-Aside Data');
    aside.addEventListener('click', () => {
      const text = asideKeys.map((k) => localStorage.getItem(k) ?? '').join('\n');
      void shareFile('scorekept-set-aside.json', text);
    });
    parts.push(h('p', { class: 'sh-message' }, 'Some saved data couldn’t be read, so it was set aside instead of being lost.'), aside);
  }

  openSheet({ title: 'Backup & Restore', body: parts, done: { label: 'Done', onClick: () => undefined }, cancel: false });
}
