import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
  },
  {
    entry: { demo: 'docs/demo-entry.ts' },
    format: ['iife'],
    globalName: 'AF',
    outDir: 'docs',
    outExtension: () => ({ js: '.js' }),
    minify: true,
  },
])
