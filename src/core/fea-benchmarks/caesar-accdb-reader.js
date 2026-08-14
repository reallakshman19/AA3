/**
 * Portable CAESAR ACCDB table reader.
 *
 * Adapted from the JS Access reader in reallaksh19/XML_Compare_Utilities,
 * `parser/accdb-mdb.js` at commit d83c62214b7a6486c17698225ea4e11bc3121cb6
 * (`openAccdbReader`, `findAccdbTableName`, `readAccdbNamedTables`). The upstream
 * module targets the browser and loads `mdb-reader` from a CDN; this port keeps
 * the same table-matching semantics, adds a Node file/custody boundary and emits
 * the `caesar-accdb-raw-export/v1` contract the benchmark package already
 * consumes, so the qualification no longer depends on Windows and the Microsoft
 * ACE OLE DB provider.
 *
 * The reader is read-only: it never writes to the database file, and the caller
 * verifies the source SHA-256 before and after use.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename, resolve as resolvePath } from 'node:path';

export const CAESAR_ACCDB_RAW_EXPORT_SCHEMA = 'caesar-accdb-raw-export/v1';
export const CAESAR_ACCDB_JS_PROVIDER = 'JS_MDB_READER_PORT_OF_XML_COMPARE_UTILITIES_ACCDB_MDB_V1';

const MDB_IMPORTS = Object.freeze(['mdb-reader', 'https://esm.sh/mdb-reader@2']);
const BUFFER_IMPORTS = Object.freeze(['buffer', 'https://esm.sh/buffer@6']);

/**
 * Extract the requested tables from an ACCDB file into the raw-export contract.
 *
 * @param {object} input Extraction input.
 * @param {string} input.accdbPath Path to the ACCDB file.
 * @param {Array<string>} input.tableNames Table names required by the profile.
 * @param {string} [input.expectedSha256] Fail closed unless the file matches.
 * @returns {Promise<Record<string, unknown>>} Raw export plus a read log.
 */
export async function extractCaesarAccdbTables(input) {
  const path = resolvePath(input.accdbPath);
  const bytes = readFileSync(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (input.expectedSha256 !== undefined && sha256 !== String(input.expectedSha256).toLowerCase()) {
    throw new Error(`ACCDB custody mismatch: ${sha256} is not the expected ${input.expectedSha256}.`);
  }
  const stats = statSync(path);
  const log = [];
  const tables = await readAccdbNamedTables(bytes, input.tableNames, log);
  const missing = input.tableNames.filter((name) => tables[name] === undefined);
  if (missing.length > 0) {
    throw new Error(`ACCDB extraction is missing required tables: ${missing.join(', ')}.`);
  }
  const afterSha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (afterSha256 !== sha256) {
    throw new Error('ACCDB bytes changed during extraction; the read path must be read-only.');
  }
  return {
    schema: CAESAR_ACCDB_RAW_EXPORT_SCHEMA,
    provider: CAESAR_ACCDB_JS_PROVIDER,
    source: {
      fileName: basename(path),
      path,
      byteLength: bytes.byteLength,
      lastWriteTimeUtc: stats.mtime.toISOString(),
      sha256,
      postReadSha256: afterSha256,
    },
    tables,
    readLog: log,
  };
}

/**
 * Read specific named tables out of an ACCDB/MDB buffer.
 *
 * Table names are matched exactly first, then by a punctuation-insensitive key,
 * exactly as the upstream reader does.
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

async function openAccdbReader(bytes, log) {
  let MDBReader;
  try {
    if (typeof globalThis.Buffer === 'undefined' || typeof globalThis.Buffer.from !== 'function') {
      const bufferModule = await importFirst(BUFFER_IMPORTS, 'buffer');
      globalThis.Buffer = bufferModule.Buffer ?? bufferModule.default?.Buffer ?? bufferModule.default;
    }
    const module = await importFirst(MDB_IMPORTS, 'mdb-reader');
    MDBReader = module.default ?? module.MDBReader ?? module;
    if (typeof MDBReader !== 'function') throw new Error('MDBReader is not a constructor.');
  } catch (error) {
    throw new Error(`mdb-reader failed to load: ${error.message}`, { cause: error });
  }
  // mdb-reader uses Node Buffer methods internally, so it is handed a Buffer.
  const reader = new MDBReader(globalThis.Buffer.from(bytes));
  const tableNames = reader.getTableNames().map(String);
  log.push({ level: 'INFO', message: `ACCDB opened with ${tableNames.length} table(s).` });
  return { reader, tableNames };
}

async function importFirst(specifiers, label) {
  const errors = [];
  for (const specifier of specifiers) {
    try {
      return await import(/* @vite-ignore */ specifier);
    } catch (error) {
      errors.push(`${specifier}: ${error.message}`);
    }
  }
  throw new Error(`Cannot import ${label}: ${errors.join(' | ')}`);
}

function findAccdbTableName(tableNames, wanted) {
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
