/* One polite live region: plays, side changes, and finals, read by VoiceOver. */
let region: HTMLElement | null = null;

export function mountAnnouncer(parent: HTMLElement): HTMLElement {
  region = document.createElement('div');
  region.className = 'sk-live';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('role', 'status');
  parent.append(region);
  return region;
}

export function announce(text: string): void {
  if (!region || !text) return;
  // Clear first so the same words twice are still read.
  region.textContent = '';
  requestAnimationFrame(() => {
    if (region) region.textContent = text;
  });
}
