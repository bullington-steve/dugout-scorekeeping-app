import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, mailtoUrl } from '../../src/share/contact.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('contact email (Steve, Nov 25)', () => {
  it('addresses ScoreKept with the subject and body encoded, CRLF line breaks', () => {
    const url = mailtoUrl('ScoreKept Feedback (1)', 'Hi & bye?\nLine two');
    expect(url.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
    const q = new URLSearchParams(url.split('?')[1]!.replace(/\+/g, '%2B'));
    expect(q.get('subject')).toBe('ScoreKept Feedback (1)');
    expect(q.get('body')).toBe('Hi & bye?\r\nLine two');
    expect(url).not.toContain('+');
  });

  it('trims a long body at a line break so the link stays short', () => {
    const body = Array.from({ length: 200 }, (_, i) => `Problem ${i}: something broke here`).join('\n');
    const q = new URLSearchParams(mailtoUrl('S', body).split('?')[1]!);
    const got = q.get('body')!;
    expect(got.length).toBeLessThan(1900);
    expect(got.endsWith('\r\n…')).toBe(true);
    expect(got.split('\r\n').slice(-2)[0]).toMatch(/^Problem \d+: something broke here$/);
  });

  it('a short body is left alone (must-fail check on the trim)', () => {
    const q = new URLSearchParams(mailtoUrl('S', 'short').split('?')[1]!);
    expect(q.get('body')).toBe('short');
  });

  it('only the app’s own address appears in the app and docs, never a personal one', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|md|css|html|json)$/.test(f)) files.push(p);
      }
    };
    for (const d of ['src', 'docs']) walk(d);
    files.push('README.md', 'CLAUDE.md', 'index.html');
    const addresses = new Set<string>();
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/[\w.+-]+@[\w-]+\.(?:com|net|org|io)\b/gi)) addresses.add(m[0]);
    for (const a of addresses) expect(a.toLowerCase() === CONTACT_EMAIL.toLowerCase() || /noreply@anthropic\.com/i.test(a)).toBe(true);
  });
});
