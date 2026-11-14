/*
 * No rubber-band bounce on any screen whose content fits (Steve, Nov 12:
 * "pages that fit all their content onto a single screen should not be
 * scrollable or have a bounce"). Only while it fits (LESSONS 5). Re-checked
 * after render, tab changes, sheets, resize, fonts loading, and size changes.
 */
let target: HTMLElement | null = null;
let active = () => false;
/**
 * Not until iOS has settled the screen after launch (Steve's iPhone, Nov 14): with scrolling
 * turned off from the very first frame, a Home Screen app kept the tab bar a Home indicator's
 * height too high until a tab change turned scrolling back on. So the page starts scrollable,
 * and "fits" applies once the launch has settled.
 */
let settled = false;

export function watchFits(el: HTMLElement, isActive: () => boolean): void {
  target = el;
  active = isActive;
  new ResizeObserver(() => updateFits()).observe(el);
  window.addEventListener('resize', updateFits);
  window.visualViewport?.addEventListener('resize', () => {
    updateFits();
    // The Game screen measures the room above the tab bar on resize.
    window.dispatchEvent(new Event('resize'));
  });
  void document.fonts?.ready.then(updateFits);
  const settle = () => {
    if (settled) return;
    settled = true;
    updateFits();
    window.dispatchEvent(new Event('resize'));
  };
  // After the page has loaded and a few frames have drawn; a backup timer in case load already passed.
  const later = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(settle, 250)));
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
  setTimeout(settle, 1500);
  updateFits();
}

export function updateFits(): void {
  const root = document.documentElement;
  const fits =
    settled &&
    !!target &&
    active() &&
    root.scrollHeight <= window.innerHeight + 1;
  root.classList.toggle('fits', fits);
}
