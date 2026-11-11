/*
 * Four layouts, picked automatically and re-checked on rotate or resize
 * (SPEC §17): iPhone upright, iPhone sideways, iPad upright, iPad sideways
 * or computer.
 */
export type Layout = 'phone' | 'phone-wide' | 'tablet' | 'wide';

export const LAYOUT_NAMES: Record<Layout, string> = {
  phone: 'iPhone upright',
  'phone-wide': 'iPhone sideways',
  tablet: 'iPad upright',
  wide: 'iPad sideways or computer',
};

export function layoutFor(width: number, height: number): Layout {
  const small = Math.min(width, height) < 600;
  if (small) return height >= width ? 'phone' : 'phone-wide';
  return height >= width ? 'tablet' : 'wide';
}

let current: Layout = 'phone';

export function currentLayout(): Layout {
  return current;
}

export function watchLayout(onChange: (l: Layout) => void): void {
  const apply = () => {
    const next = layoutFor(window.innerWidth, window.innerHeight);
    const root = document.documentElement;
    for (const l of Object.keys(LAYOUT_NAMES)) root.classList.toggle(`layout-${l}`, l === next);
    if (next !== current) {
      current = next;
      onChange(next);
    }
  };
  current = layoutFor(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', apply);
  apply();
}

/**
 * After the keyboard closes, iOS can leave fixed bars stuck a keyboard-height
 * up (LESSONS 6). Nudge the page to lay out again.
 */
export function watchKeyboard(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  let shrunk = false;
  vv.addEventListener('resize', () => {
    const open = vv.height < window.innerHeight * 0.8;
    if (shrunk && !open) {
      window.scrollTo(window.scrollX, window.scrollY);
      document.body.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => (document.body.style.transform = ''));
    }
    shrunk = open;
  });
}
