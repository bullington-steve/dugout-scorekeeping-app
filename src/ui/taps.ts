/* Show Where Taps Land: a gold ring at each tap, for diagnosing iPhone tap offsets. */
let on = false;

export function setTapRings(value: boolean): void {
  on = value;
}

export function mountTapRings(): void {
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!on) return;
      const ring = document.createElement('div');
      ring.className = 'sk-tap-ring';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ring.setAttribute('aria-hidden', 'true');
      document.body.append(ring);
      setTimeout(() => ring.remove(), 900);
    },
    { capture: true, passive: true },
  );
}
