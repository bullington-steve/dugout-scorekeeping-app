/*
 * No rubber-band bounce ONLY on the Game screen, only when it fits, only
 * with no sheet open (LESSONS 5, 11). Re-checked after render, resize,
 * fonts loading, and size changes.
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
    !root.classList.contains('sheet-open') &&
    root.scrollHeight <= window.innerHeight + 1;
  root.classList.toggle('fits', fits);
}
