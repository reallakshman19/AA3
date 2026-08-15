/**
 * Portable CAESAR ACCDB table-reading core — no Node built-ins.
 *
 * This is the half of the ACCDB reader that runs identically in Node and in a
 * browser: opening the database, matching table names, and coercing driver
 * rows to canonical-JSON-safe scalars. The Node-only file/custody boundary
 * (path resolution, `readFileSync`, SHA-256 over the file on disk) stays in
 * `caesar-accdb-reader.js`, and the browser boundary in
 * `caesar-accdb-browser-reader.js`, so both surfaces share exactly one
 * implementation of the table-matching semantics rather than two that can
 * drift apart.
 *
 * Table-matching semantics are those of the upstream reader in
 * reallaksh19/XML_Compare_Utilities, `parser/accdb-mdb.js` @ d83c6221:
 * exact (case-insensitive) match first, then a punctuation-insensitive key.
 */

/**
 * CDN specifiers are a last-resort fallback only.
 *
 * The primary imports below use literal specifiers so a bundler can resolve
 * them at build time and emit them as their own lazily-loaded chunk. A
 * computed specifier would be left as a bare runtime import that a browser
 * cannot resolve — and would then fall through to a network fetch that an
 * offline or locked-down host blocks.
 */
const MDB_CDN = 'https://esm.sh/mdb-reader@2';
const BUFFER_CDN = 'https://esm.sh/buffer@6';

/**
 * Read specific named tables out of an ACCDB/MDB buffer.
 *
 * @param {Uint8Array} bytes ACCDB file bytes.
 * @param {Array<string>} tableNames Wanted table names.
 * @param {Array<Record<string, unknown>>} [log] Mutable log array.
 * @returns {Promise<Record<string, unknown>>} `{ TABLE: { columns, rows } }`.
 */
export async function readAccdbNamedTables(bytes, tableNames, log = []) {
  const opened = await openAccdbReader(bytes, log);
  const out = {};
  for (const wanted of tableNames) {
    const match = findAccdbTableName(opened.tableNames, wanted);
    if (!match) {
      log.push({ level: 'WARN', message: `Table not found: ${wanted}` });
      continue;
    }
    const table = opened.reader.getTable(match);
    const columns = table.getColumnNames().map(String);
    const rows = table.getData().map((row) => normalizeRow(row, columns));
    out[wanted] = { columns, rows };
    log.push({ level: 'OK', message: `Loaded ${match} as ${wanted}: ${rows.length} row(s).` });
  }
  return out;
}

/**
 * Open an ACCDB buffer and list its tables.
 *
 * `mdb-reader` uses Node `Buffer` methods internally even in its browser
 * build, so a Buffer implementation is installed on `globalThis` first when
 * the host does not already provide one. Some of its transitive crypto/inflate
 * dependencies also expect a `process` global; a minimal stand-in is installed
 * for the same reason. Both are additive and never replace a host-provided
 * implementation.
 */
export async function openAccdbReader(bytes, log = []) {
  let MDBReader;
  try {
    await ensureNodeGlobals();
    const module = await importWithCdnFallback(
      () => import('mdb-reader'),
      MDB_CDN,
      'mdb-reader',
    );
    MDBReader = module.default ?? module.MDBReader ?? module;
    if (typeof MDBReader !== 'function') throw new Error('MDBReader is not a constructor.');
  } catch (error) {
    throw new Error(`mdb-reader failed to load: ${error.message}`, { cause: error });
  }
  const reader = new MDBReader(globalThis.Buffer.from(bytes));
  const tableNames = reader.getTableNames().map(String);
  log.push({ level: 'INFO', message: `ACCDB opened with ${tableNames.length} table(s).` });
  return { reader, tableNames };
}

/** List every table in an ACCDB buffer without selecting any of them. */
export async function listAccdbTableNames(bytes, log = []) {
  const opened = await openAccdbReader(bytes, log);
  return opened.tableNames;
}

async function ensureNodeGlobals() {
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = {
      env: {},
      browser: true,
      version: '',
      nextTick: (callback, ...args) => queueMicrotask(() => callback(...args)),
    };
  }
  if (typeof globalThis.Buffer === 'undefined' || typeof globalThis.Buffer.from !== 'function') {
    const bufferModule = await importWithCdnFallback(
      () => import('buffer'),
      BUFFER_CDN,
      'buffer',
    );
    globalThis.Buffer = bufferModule.Buffer ?? bufferModule.default?.Buffer ?? bufferModule.default;
  }
}

async function importWithCdnFallback(loadPrimary, cdnSpecifier, label) {
  const errors = [];
  try {
    return await loadPrimary();
  } catch (error) {
    errors.push(`bundled: ${error.message}`);
  }
  try {
    return await import(/* @vite-ignore */ cdnSpecifier);
  } catch (error) {
    errors.push(`${cdnSpecifier}: ${error.message}`);
  }
  throw new Error(`Cannot import ${label}: ${errors.join(' | ')}`);
}

export function findAccdbTableName(tableNames, wanted) {
  const exact = tableNames.find((name) => name.toUpperCase() === String(wanted).toUpperCase());
  if (exact) return exact;
  const wantedKey = tableKey(wanted);
  return tableNames.find((name) => tableKey(name) === wantedKey) ?? '';
}

function tableKey(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/gu, '');
}

/**
 * Coerce one driver row into canonical-JSON-safe scalars.
 *
 * Dates and binary columns are stringified rather than dropped, so an unexpected
 * column type is visible in the custody record instead of silently becoming null.
 */
function normalizeRow(row, columns) {
  const normalized = {};
  for (const column of columns) {
    const value = row[column];
    if (value === undefined || value === null) {
      normalized[column] = null;
    } else if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      normalized[column] = value;
    } else if (value instanceof Date) {
      normalized[column] = value.toISOString();
    } else if (value instanceof Uint8Array) {
      normalized[column] = `base64:${globalThis.Buffer.from(value).toString('base64')}`;
    } else {
      normalized[column] = String(value);
    }
  }
  return normalized;
}
