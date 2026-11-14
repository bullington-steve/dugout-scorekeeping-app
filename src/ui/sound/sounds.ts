/*
 * Settings, Sounds & Walk-Up Songs (SPEC §13): Play Walk-Up Songs
 * Automatically at the top, then the pack, the organ's voice and echo, the
 * crowd, both teams, the PA and umpire, between-innings music, and a tune
 * for each moment.
 */
import type { App } from '../../app/app.ts';
import { ECHOES } from '../../sound/engine.ts';
import { MOMENTS, PACKS, audioPrefs, setPick, tuneFor } from '../../sound/settings.ts';
import { say } from '../../sound/speech.ts';
import { TUNES, tuneById } from '../../sound/tunes.ts';
import type { AudioPrefs } from '../../store/model.ts';
import { group, linkRow, selectField, switchRow } from '../controls.ts';
import { h, setText } from '../dom.ts';
import { choose, openSheet } from '../sheet.ts';
import { playTune } from './player.ts';

function setAudio(app: App, change: (a: AudioPrefs) => void): void {
  app.commit((d) => change((d.prefs.audio ??= {})));
}

export function openSounds(app: App): void {
  const a = audioPrefs(app.data);
  const momentRows = MOMENTS.map((m) => {
    const detail = () => tuneById(tuneFor(app.data, m.id))?.name ?? 'No Sound';
    const row = linkRow(m.name, async () => {
      const now = tuneFor(app.data, m.id);
      const pick = await choose(
        m.name,
        [
          { label: `No Sound${now === 'none' ? ' ✓' : ''}`, value: 'none' },
          ...TUNES.filter((t) => t.group !== 'walkup').map((t) => ({ label: `${t.name}${t.id === now ? ' ✓' : ''}`, value: t.id, sub: t.artist })),
        ],
        m.when,
      );
      if (pick === null) return;
      app.commit((d) => setPick(d, m.id, pick));
      setText(row.querySelector('.sk-row-detail')!, detail());
      if (pick !== 'none') void playTune(app, pick);
    }, detail());
    return row;
  });
  const packNote = h('p', { class: 'sk-row-note' }, PACKS.find((p) => p.id === a.pack)?.about ?? '');
  openSheet({
    title: 'Sounds & Walk-Up Songs',
    full: true,
    body: [
      group(
        'Walk-Ups',
        switchRow('Play Walk-Up Songs Automatically', a.autoWalkup, (v) => setAudio(app, (x) => (x.autoWalkup = v)), 'After each play, the next batter’s song plays. Pick each player’s song on their card, on the Team tab.'),
        switchRow('PA Announcer', a.announce, (v) => {
          setAudio(app, (x) => (x.announce = v));
          if (v) void say('Now batting, number 7, Jess Kowalczyk.');
        }, '“Now batting, number 7, Jess Kowalczyk,” before each walk-up. Download an Enhanced voice in iPhone Settings, Accessibility, Spoken Content, for the best sound.'),
      ),
      group(
        'Game Sounds',
        switchRow('Sound', a.on, (v) => app.commit((d) => (d.prefs.sound = v)), 'The speaker button on the Game tab turns this on and off too. The Organ still plays when you tap it.'),
        selectField(
          'Sound Pack',
          PACKS.map((p) => ({ value: p.id, label: p.name })),
          a.pack,
          (v) => {
            setAudio(app, (x) => (x.pack = v as AudioPrefs['pack']));
            packNote.textContent = PACKS.find((p) => p.id === v)?.about ?? '';
            for (const [i, m] of MOMENTS.entries()) setText(momentRows[i]!.querySelector('.sk-row-detail')!, tuneById(tuneFor(app.data, m.id))?.name ?? 'No Sound');
          },
        ),
        packNote,
        switchRow('Key Clicks', a.keyClicks, (v) => setAudio(app, (x) => (x.keyClicks = v)), 'A short click as you tap each scoring key, made to match it: leather for Ball, Strike, and Foul, turf for a hit, clay for an out, aluminum for Undo, Lineups, and Defense.'),
        switchRow('Crowd', a.crowd, (v) => setAudio(app, (x) => (x.crowd = v)), 'Cheers on your hits and runs, a roar for a home run, a groan on your strikeouts.'),
        switchRow('Sounds for Both Teams', a.bothTeams, (v) => setAudio(app, (x) => (x.bothTeams = v)), 'Off: your offense’s sounds when you bat, your defense’s when you field.'),
        switchRow('Umpire Calls', a.umpire, (v) => setAudio(app, (x) => (x.umpire = v)), 'With Balls and Strikes on: “Strike two!” and “Ball three. Take your base,” by your league’s count.'),
        switchRow('Music Between Innings', a.betweenInnings, (v) => setAudio(app, (x) => (x.betweenInnings = v)), 'After your defense gets the third out, a song from Between Innings on the Organ. Take Me Out to the Ball Game after the top of the 7th.'),
      ),
      group(
        'The Organ',
        switchRow(
          'Big Speaker Mode',
          a.leslie,
          (v) => {
            // Steve's two sounds (Nov 13): Big Speaker is the spinning Leslie with the Ballpark echo;
            // off is the standard plain organ with the Small Gym echo. Echo below can still be changed.
            setAudio(app, (x) => {
              x.leslie = v;
              x.echo = v ? 'ballpark' : 'gym';
            });
            void playTune(app, 'charge');
          },
          'For a Bluetooth speaker at the field: the spinning ballpark swirl and a big echo. Off: the organ as it sounds best from iPhone.',
        ),
        selectField('Echo', (Object.keys(ECHOES) as (keyof typeof ECHOES)[]).map((k) => ({ value: k, label: ECHOES[k].name })), a.echo, (v) => {
          setAudio(app, (x) => (x.echo = v as AudioPrefs['echo']));
          void playTune(app, 'charge');
        }),
      ),
      group('A Tune for Each Moment', ...momentRows),
      h('p', { class: 'sk-row-note' }, 'iPads with a side switch play no sound while it’s set to silent.'),
    ],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}
