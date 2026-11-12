import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Every file in public/, as paths relative to the site root. */
function publicFiles(dir = 'public'): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...publicFiles(p));
    else out.push(relative('public', p).split('\\').join('/'));
  }
  return out;
}

/**
 * The offline copy (SPEC §16): writes sw.js listing every file the build made,
 * so the service worker can keep all of them on the iPhone. The cache name
 * carries the app version and a hash of the file list, so it changes (and old
 * copies are cleared) whenever any cached file changes (LESSONS: bump the
 * cache name when cached assets change).
 */
function offlineCopy(): Plugin {
  return {
    name: 'scorekept-offline-copy',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', ...publicFiles().filter((f) => f !== 'sw.js').map((f) => `./${f}`), ...Object.keys(bundle).map((f) => `./${f}`)];
      const version = /APP_VERSION = '([^']+)'/.exec(readFileSync('src/version.ts', 'utf8'))?.[1] ?? 'dev';
      const hash = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 10);
      const template = readFileSync('src/sw/sw.js', 'utf8');
      const source = template.replace('__CACHE__', `scorekept-${version}-${hash}`).replace('__FILES__', JSON.stringify(files, null, 1));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // Relative paths, so the app works at any GitHub Pages address
  // (a repo rename changes the address but not the build).
  base: './',
  plugins: [offlineCopy()],
  build: {
    target: ['safari16'],
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      // The app, and the listen-only sound library page (SPEC §13).
      input: { main: 'index.html', sounds: 'sounds.html' },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
