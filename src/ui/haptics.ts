/*
 * A light tap you can feel (iPhone, iOS 18 and later). Safari has no vibration
 * call, but flipping a native on/off switch plays the system's own tick, so a
 * hidden switch is flipped for each step. It follows the iPhone's System
 * Haptics setting, and does nothing where it isn't supported.
 */
let label: HTMLLabelElement | null = null;

export function tick(): void {
  if (!label) {
    const box = document.createElement('div');
    box.className = 'sk-visually-hidden';
    box.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'sk-haptic';
    input.tabIndex = -1;
    label = document.createElement('label');
    label.htmlFor = 'sk-haptic';
    box.append(input, label);
    document.body.append(box);
  }
  label.click();
}
