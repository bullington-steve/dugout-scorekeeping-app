/*
 * No rubber-band bounce on any screen whose content fits (Steve, Nov 12:
 * "pages that fit all their content onto a single screen should not be
 * scrollable or have a bounce"). Only while it fits (LESSONS 5). Re-checked
 * after render, tab changes, sheets, resize, fonts loading, and size changes.
 */
let target: HTMLElement | null = null;
let active = () => false;

export function watchFits(el: HTMLElement, isActive: () => boolean): void {
  target = el;
  active = isActive;
  new ResizeObserver(() => updateFits()).observe(el);
  window.addEventListener('resize', updateFits);
  void document.fonts?.ready.then(updateFits);
  updateFits();
}

export function updateFits(): void {
  const root = document.documentElement;
  const fits =
    !!target &&
    active() &&
    root.scrollHeight <= window.innerHeight + 1;
  root.classList.toggle('fits', fits);
}
