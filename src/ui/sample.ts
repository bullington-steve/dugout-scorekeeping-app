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

// Hide lasts until the app is closed (Steve, Nov 17): kept in memory only, never saved.
let hiddenUntilClose = false;

/**
 * The slim strip shown under each screen's title while the sample season is loaded (Steve, Nov 17):
 * "Sample season · Clear", and Hide.
 */
function sampleStrip(app: App, refresh: () => void): HTMLElement {
  const clear = h('button', { type: 'button', class: 'sk-sample-clear', 'aria-label': 'Clear Sample Data' }, 'Clear');
  clear.addEventListener('click', async () => {
    const ok = await confirm('Clear Sample Data?', 'The made-up Diamond Dogs, their games, and their schedule go away, and you start fresh with your own team.', 'Clear Sample Data');
    if (!ok) return;
    app.clearSample();
    announce('Sample data cleared.');
    // Now the real start: the welcome screen and setup (SPEC §19).
    openWelcome(app);
  });
  const hide = h('button', { type: 'button', class: 'sk-sample-hide' }, 'Hide');
  hide.addEventListener('click', () => {
    hiddenUntilClose = true;
    announce('Sample season note hidden until you close ScoreKept.');
    refresh();
  });
  return h(
    'aside',
    { class: 'sk-sample', 'aria-label': 'Sample Season' },
    h('span', { class: 'sk-sample-text' }, 'Sample season'),
    h('span', { class: 'sk-sample-dot', 'aria-hidden': 'true' }, '·'),
    clear,
    hide,
  );
}

/**
 * Keep the strip right under the title on each screen it's given (every tab but Game), however the
 * screen redraws. Returns a function to call when the data changes.
 */
export function watchSampleStrip(app: App, screens: HTMLElement[]): () => void {
  const place = (el: HTMLElement) => {
    const head = el.querySelector<HTMLElement>(':scope > .sk-header');
    const existing = el.querySelector<HTMLElement>(':scope > .sk-sample');
    if (!head || !app.data.sample || hiddenUntilClose) {
      existing?.remove();
      return;
    }
    if (existing && existing.previousElementSibling === head) return;
    existing?.remove();
    head.after(sampleStrip(app, refreshAll));
  };
  const refreshAll = () => screens.forEach(place);
  for (const el of screens) new MutationObserver(() => place(el)).observe(el, { childList: true });
  refreshAll();
  return refreshAll;
}
