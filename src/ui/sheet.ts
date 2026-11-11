/*
 * Sheets (popups). They close ONLY with the red ✕ beside the title, Cancel,
 * or Done: tapping outside never closes one, because that once threw away a
 * half-built lineup (LESSONS 22). The page behind is never locked (LESSONS 5).
 * The ✕ stays fixed beside the title (LESSONS 21).
 */
import { h } from './dom.ts';
import { updateFits } from './fits.ts';

export interface Sheet {
  el: HTMLElement;
  body: HTMLElement;
  close: () => void;
}

export interface SheetOptions {
  title: string;
  body: Node | Node[];
  /** Footer buttons. Cancel and the ✕ just close. */
  cancel?: string | false;
  done?: { label: string; onClick: () => void | boolean | Promise<void | boolean> };
  /** Fill the screen (the field, long settings). */
  full?: boolean;
  onClose?: () => void;
  className?: string;
}

let depth = 0;
let counter = 0;

export function openSheet(opts: SheetOptions): Sheet {
  const id = `sh-title-${++counter}`;
  const before = document.activeElement as HTMLElement | null;
  const title = h('h2', { id, class: 'sh-title', tabindex: '-1' }, opts.title);
  const closeBtn = h('button', { type: 'button', class: 'sh-close', 'aria-label': 'Close' }, '✕');
  const body = h('div', { class: 'sh-body' });
  body.append(...(Array.isArray(opts.body) ? opts.body : [opts.body]));
  const footer = h('div', { class: 'sh-foot' });
  const dialog = h(
    'div',
    { class: `sh-sheet${opts.full ? ' sh-full' : ''} ${opts.className ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id },
    h('div', { class: 'sh-head' }, title, closeBtn),
    body,
  );
  const scrim = h('div', { class: 'sh-scrim', 'aria-hidden': 'true' });
  const layer = h('div', { class: 'sh-layer' }, scrim, dialog);
  depth += 1;
  layer.style.zIndex = String(1000 + depth * 10);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    layer.remove();
    depth -= 1;
    document.documentElement.classList.toggle('sheet-open', depth > 0);
    opts.onClose?.();
    before?.focus?.();
    updateFits();
  };
  closeBtn.addEventListener('click', close);
  if (opts.cancel !== false && (opts.cancel || opts.done)) {
    footer.append(h('button', { type: 'button', class: 'sk-key sh-cancel' }, opts.cancel || 'Cancel'));
    footer.lastElementChild!.addEventListener('click', close);
  }
  if (opts.done) {
    const done = h('button', { type: 'button', class: 'sk-key sk-primary sh-done' }, opts.done.label);
    done.addEventListener('click', async () => {
      const keep = await opts.done!.onClick();
      if (keep !== false) close();
    });
    footer.append(done);
  }
  if (footer.childElementCount) dialog.append(footer);
  // VoiceOver's escape gesture, and the keyboard, close it like ✕.
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });
  document.body.append(layer);
  document.documentElement.classList.add('sheet-open');
  updateFits();
  requestAnimationFrame(() => title.focus({ preventScroll: true }));
  return { el: dialog, body, close };
}

export interface Choice<T> {
  label: string;
  value: T;
  /** A second line under the label. */
  sub?: string;
  kind?: 'primary' | 'hit' | 'out' | 'danger';
}

/** Ask one question with a list of answers. Resolves null when closed. */
export function choose<T>(title: string, choices: Choice<T>[], message?: string): Promise<T | null> {
  return new Promise((resolve) => {
    let answered = false;
    const list = h('div', { class: 'sh-choices' });
    const sheet = openSheet({
      title,
      body: [message ? h('p', { class: 'sh-message' }, message) : document.createTextNode(''), list],
      cancel: 'Cancel',
      onClose: () => {
        if (!answered) resolve(null);
      },
    });
    for (const c of choices) {
      const b = h(
        'button',
        { type: 'button', class: `sk-key sh-choice${c.kind ? ` sk-${c.kind}` : ''}` },
        h('span', { class: 'sh-choice-label' }, c.label),
        c.sub ? h('span', { class: 'sh-choice-sub' }, c.sub) : null,
      );
      b.addEventListener('click', () => {
        answered = true;
        resolve(c.value);
        sheet.close();
      });
      list.append(b);
    }
  });
}

/** A yes-or-no check before something hard to undo. */
export async function confirm(title: string, message: string, yes: string, danger = true): Promise<boolean> {
  return (await choose(title, [{ label: yes, value: true, kind: danger ? 'danger' : 'primary' }], message)) === true;
}
