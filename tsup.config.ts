import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts', node: 'src/node.ts' },
    format: ['esm', 'cjs'],
    target: 'node16',
    dts: true,
    splitting: false,
    clean: true,
  },
  {
    entry: { demo: 'src/index.ts' },
    format: ['iife'],
    target: 'es2020',
    globalName: 'AF',
    outDir: 'docs',
    outExtension: () => ({ js: '.js' }),
    minify: true,
  },
])
