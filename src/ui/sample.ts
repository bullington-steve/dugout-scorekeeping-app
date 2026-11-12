/*
 * The sample season (SPEC §19): Look Around with Sample Data on a fresh
 * device, and the banner with Clear Sample Data while it's loaded. The games
 * load only when asked for, so they never slow down opening the app.
 */
import { openWelcome } from './welcome/welcome.ts';
import type { App } from '../app/app.ts';
import { sampleTeam, type SampleSeason } from '../app/sample.ts';
import { announce } from './announce.ts';
import { h } from './dom.ts';
import { confirm } from './sheet.ts';

export async function loadSample(app: App): Promise<void> {
  const sample = (await import('../content/sample-season.json')).default as unknown as SampleSeason;
  if (app.loadSample(sampleTeam(sample, Date.now()))) announce('Sample season loaded. The Diamond Dogs are in the fourth inning.');
}

/** The banner shown while the sample season is loaded. */
export function sampleBar(app: App): HTMLElement {
  const clear = h('button', { type: 'button', class: 'sk-key sk-sample-clear' }, 'Clear Sample Data');
  clear.addEventListener('click', async () => {
    const ok = await confirm('Clear Sample Data?', 'The made-up Diamond Dogs, their games, and their schedule go away, and you start fresh with your own team.', 'Clear Sample Data');
    if (!ok) return;
    app.clearSample();
    announce('Sample data cleared.');
    // Now the real start: the welcome screen and setup (SPEC §19).
    openWelcome(app);
  });
  return h(
    'aside',
    { class: 'sk-sample sk-card', 'aria-label': 'Sample Season', hidden: true },
    h('p', { class: 'sk-sample-text' }, 'This is a ', h('strong', {}, 'made-up sample season'), ' so you can see how everything works.'),
    clear,
  );
}
