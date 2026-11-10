/*
 * Rules checked against the source files themselves (no browser needed).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export function sourceFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/** Text sizes are never in px (canvas `ctx.font = '12px …'` is allowed). */
export function pxFontSizes(source: string): string[] {
  const hits: string[] = [];
  const re = /(font-size|fontSize|(?<![.\w])font)\s*:\s*[^;{}\n]*?\d(?:\.\d+)?px/g;
  for (const m of source.matchAll(re)) hits.push(m[0]);
  return hits;
}

/** Color literals outside the token sheet (hex, rgb(), hsl(), named reds…). */
export function colorLiterals(source: string): string[] {
  const noComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|lch|hwb)\(/gi;
  return [...noComments.matchAll(re)].map((m) => m[0]);
}

export function rel(root: string, file: string): string {
  return relative(root, file);
}

export function read(file: string): string {
  return readFileSync(file, 'utf8');
}
