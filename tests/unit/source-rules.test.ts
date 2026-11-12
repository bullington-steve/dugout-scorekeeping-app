import { describe, expect, it } from 'vitest';
import { colorLiterals, pxFontSizes, read, rel, sourceFiles } from '../helpers/source-rules.ts';

const root = new URL('../..', import.meta.url).pathname;
const src = `${root}src`;

describe('text sizes are never in px', () => {
  it('finds no px font sizes in any stylesheet or script', () => {
    const bad = sourceFiles(src, ['.css', '.ts']).flatMap((f) =>
      pxFontSizes(read(f)).map((hit) => `${rel(root, f)}: ${hit}`),
    );
    expect(bad).toEqual([]);
  });

  it('bites: catches planted px sizes and allows the right ones', () => {
    expect(pxFontSizes('.a { font-size: 14px; }')).toHaveLength(1);
    expect(pxFontSizes('.a { font: 700 18px/1.2 serif; }')).toHaveLength(1);
    expect(pxFontSizes("el.style.fontSize = '12px'")).toHaveLength(0); // assignment, checked below
    expect(pxFontSizes("Object.assign(s, { fontSize: '12px' })")).toHaveLength(1);
    expect(pxFontSizes('.a { font-size: calc(17 * var(--u)); }')).toHaveLength(0);
    expect(pxFontSizes(".a { border: 1px solid; font-size: 1rem; }")).toHaveLength(0);
    expect(pxFontSizes("ctx.font = '12px serif'")).toHaveLength(0);
  });

  it('finds no px sizes assigned to element styles in scripts', () => {
    const bad = sourceFiles(src, ['.ts']).flatMap((f) =>
      [...read(f).matchAll(/\.fontSize\s*=\s*[^;\n]*px/g)].map((m) => `${rel(root, f)}: ${m[0]}`),
    );
    expect(bad).toEqual([]);
  });
});

describe('colors come only from tokens', () => {
  it('no stylesheet except tokens.css has a color literal', () => {
    const bad = sourceFiles(src, ['.css'])
      .filter((f) => !f.endsWith('styles/tokens.css'))
      .flatMap((f) => colorLiterals(read(f)).map((hit) => `${rel(root, f)}: ${hit}`));
    expect(bad).toEqual([]);
  });

  it('bites: catches planted color literals', () => {
    expect(colorLiterals('.a { color: #930b22; }')).toHaveLength(1);
    expect(colorLiterals('.a { background: rgb(0 0 0 / 0.5); }')).toHaveLength(1);
    expect(colorLiterals('.a { color: var(--ink); } /* #fff in a comment */')).toHaveLength(0);
  });
});

describe('no pinch-zoom (Steve, Nov 12: "the screen is what it is")', () => {
  it('the viewport tag turns off pinch-zoom but keeps the device width', () => {
    const html = read(`${root}index.html`);
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).toMatch(/user-scalable=no/);
  });
});
