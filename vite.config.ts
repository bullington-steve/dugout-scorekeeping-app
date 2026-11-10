import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths, so the app works at any GitHub Pages address
  // (a repo rename changes the address but not the build).
  base: './',
  build: {
    target: ['safari16'],
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
