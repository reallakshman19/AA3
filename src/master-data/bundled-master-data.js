/**
 * Bundled default master-data assets.
 *
 * Both files are imported at Vite build time and bundled into the app.
 * The controller uses these only when IndexedDB has no persisted rows for a
 * given master key — i.e. on first ever load or after a clear().
 *
 * SHA-256 values are hard-coded from the source files and match the
 * project-data-profile evidence contract (componentWeightSource.sourceHash).
 */

import weightRawRows from './wtValveweights.json' with { type: 'json' };
import matMapText from './PCF_MAT_MAP.txt?raw';
import pipingClassRawRows from './Piping_class_master.json' with { type: 'json' };

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

export const BUNDLED_PIPING_CLASS_MASTER = Object.freeze({
  fileName: 'Piping_class_master.json',
  sheetName: '',
  sourceHash: '74997209ffbbf4c5e1eacc9948ec89a5e2f59ad87cc3dd7cfca6d24166d7fab1',
  byteLength: 2439490,
  rawRows: pipingClassRawRows,
  normalizedRows: [],
  fieldMap: {},
  diagnostics: [],
});
