/**
 * Bundled default master-data assets.
 *
 * Small files (weight, material map) are statically imported by Vite and
 * bundled into the app — they are tiny enough to parse synchronously.
 *
 * Large files (piping class — 2.4 MB) are NOT statically imported here.
 * They live in public/master-data/ and are fetched asynchronously by the
 * controller so they never block the main thread.
 *
 * SHA-256 values are hard-coded from the source files and match the
 * project-data-profile evidence contract (componentWeightSource.sourceHash).
 */

import weightRawRows from './wtValveweights.json' with { type: 'json' };

// Vite's `?raw` suffix inlines PCF_MAT_MAP.txt into a plain string constant
// at build time, so the browser bundle never touches the filesystem. Plain
// Node (the `node scripts/*.mjs` check/test convention this repo already
// uses everywhere) has no such transform and throws ERR_UNKNOWN_FILE_EXTENSION
// on that same static import, so it reads the identical file from disk
// instead. Both branches are literal specifiers so Vite's dependency scan
// still finds and inlines the `?raw` import regardless of which branch it
// sits in.
const isNodeRuntime = typeof process !== 'undefined' && Boolean(process.versions?.node) && typeof window === 'undefined';
let matMapText;
if (isNodeRuntime) {
  const { readFileSync } = await import('node:fs');
  matMapText = readFileSync(new URL('./PCF_MAT_MAP.txt', import.meta.url), 'utf8');
} else {
  ({ default: matMapText } = await import('./PCF_MAT_MAP.txt?raw'));
}

export const BUNDLED_WEIGHT_MASTER = Object.freeze({
  fileName: 'wtValveweights.json',
  sheetName: '',
  sourceHash: '72e266002256e2ac0b0c0c9c722dde2bb65e93deec2075d209c7ab78d219cda2',
  byteLength: 280747,
  rawRows: weightRawRows,
  normalizedRows: [],
  fieldMap: {},
  diagnostics: [],
});

/**
 * Parse the fixed-width PCF_MAT_MAP.TXT format into row objects.
 * Format: each line is "  <code> <materialName>" where leading whitespace and
 * the integer code precede the material string.
 * First line is the year token and is skipped.
 */
function parseMatMapText(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) continue;
    const code = trimmed.slice(0, spaceIdx).trim();
    const material = trimmed.slice(spaceIdx + 1).trim();
    if (code && material) rows.push({ code, material });
  }
  return rows;
}

export const BUNDLED_MAT_MAP_MASTER = Object.freeze({
  fileName: 'PCF_MAT_MAP.txt',
  sheetName: '',
  sourceHash: '84b2e94488e5bceb135557a9272b0a75a87d9a53c46783865373b18f7c4dda29',
  byteLength: 6639,
  rawRows: parseMatMapText(matMapText),
  normalizedRows: [],
  fieldMap: {},
  diagnostics: [],
});

/**
 * Descriptor for the large piping-class master that lives in public/.
 * The actual rows are NOT stored here — the controller fetches the file
 * asynchronously so the main thread is never blocked.
 */
export const PIPING_CLASS_MASTER_DESCRIPTOR = Object.freeze({
  /** Path relative to the Vite base URL — resolved at runtime. */
  publicPath: 'master-data/Piping_class_master.json',
  fileName: 'Piping_class_master.json',
  sourceHash: '74997209ffbbf4c5e1eacc9948ec89a5e2f59ad87cc3dd7cfca6d24166d7fab1',
  byteLength: 2439490,
});
