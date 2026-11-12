/*
 * Add to Home Screen (SPEC §12, LESSONS 1, 2, 13): on iPhone or iPad in a
 * Safari tab, the first visit shows how to put ScoreKept on the Home Screen,
 * where it opens like an app and Safari can't clear it. Only a small dim ✕
 * closes it. Not shown on computers or in the Home Screen app itself.
 */
import { h } from '../dom.ts';
import { isIPad } from '../platform.ts';
import { coverApp } from './welcome.ts';

export function openHomeScreenGuide(then: () => void = () => undefined): void {
  const ipad = isIPad();
  const steps = ipad
    ? [
        'Tap Share at the top right.',
        'Tap View More, then Add to Home Screen.',
        'Leave Open as Web App on, and tap Add.',
        'Open ScoreKept from your Home Screen.',
      ]
    : [
        'Tap ≡ in the address bar, then Share.',
        'Scroll down and tap Add to Home Screen. (Tap View More if you don’t see it.)',
        'Leave Open as Web App on, and tap Add.',
        'Open ScoreKept from your Home Screen.',
      ];
  const close = h('button', { type: 'button', class: 'hs-close', 'aria-label': 'Close' }, '✕');
  const pointer = h('span', { class: `hs-pointer ${ipad ? 'hs-pointer-ipad' : 'hs-pointer-iphone'}`, 'aria-hidden': 'true' }, ipad ? '↗' : '≡');
  const el = h(
    'div',
    { class: 'wl-layer hs-guide', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hs-title' },
    close,
    h(
      'div',
      { class: 'hs-inner' },
      h('h1', { id: 'hs-title', class: 'sk-wordmark hs-title' }, 'Add ScoreKept to Your Home Screen'),
      h('p', { class: 'hs-why' }, 'It opens like an app and keeps your season safe. Backups are available in the app. Deleting the Home Screen icon deletes all its data.'),
      h('ol', { class: 'hs-steps' }, ...steps.map((s) => h('li', {}, s))),
      ipad ? null : h('p', { class: 'hs-small' }, 'On an older iPhone, tap Share at the bottom of the screen.'),
    ),
    pointer,
  );
  document.body.append(el);
  document.documentElement.classList.add('sheet-open');
  coverApp(true);
  close.addEventListener('click', () => {
    el.remove();
    if (!document.querySelector('.wl-layer')) coverApp(false);
    if (!document.querySelector('.wl-layer, .sh-layer')) document.documentElement.classList.remove('sheet-open');
    then();
  });
  close.focus();
}
