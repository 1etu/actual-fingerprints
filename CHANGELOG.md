# Changelog

## 0.1.0 - 2026-09-04

First release.

- `generate`, `ink`, `toSVG`, `toRGBA` and `compare` from the root entry. No platform imports, so it bundles for Node, browsers, and FiveM client or NUI scripts alike.
- `toPNG`, `toDataURL` and `seedFor` from `actual-fingerprints/node`, which is the only place `node:zlib` and `node:crypto` appear.
- `compare` accepts anything shaped `{ minutiae, width, height }`, so minutiae stored in a database match without regenerating the print.
- Same seed, same bytes, on every engine: no `Math` transcendental functions anywhere in the pipeline, integer growth loop, golden hashes pinned for six seeds and one inked print.
- Build targets Node 16 syntax. Tested on 22 and 24; the packed tarball is installed and exercised on 16, 18 and 20 in CI.
