/**
 * Browser custody boundary for reading a user-supplied CAESAR ACCDB.
 *
 * The table-reading itself is the shared portable core; this module only adds
 * the browser-side equivalent of what `caesar-accdb-reader.js` adds on Node:
 * a custody record (file name, byte length, SHA-256) computed over the exact
 * bytes that were parsed.
 *
 * The file never leaves the machine. Bytes are read from the user's own
 * `File` object and parsed in-page; nothing is uploaded.
 *
 * Scope: this reads and inventories a database. It does not run the nonlinear
 * friction solve — that takes minutes of blocking compute per case and belongs
 * offline, not on the UI thread.
 */
import { listAccdbTableNames, readAccdbNamedTables } from './caesar-accdb-reader-core.js';

export const CAESAR_ACCDB_BROWSER_IMPORT_SCHEMA = 'caesar-accdb-browser-import/v1';
export const CAESAR_ACCDB_JS_PROVIDER = 'JS_MDB_READER_PORT_OF_XML_COMPARE_UTILITIES_ACCDB_MDB_V1';

/** Tables the friction/restraint inventory below reports on when present. */
export const CAESAR_ACCDB_INVENTORY_TABLES = Object.freeze([
  'INPUT_RESTRAINTS',
  'INPUT_UNITS',
  'RESTRAINT_TYPES',
  'INPUT_BASIC_ELEMENT_DATA',
  'INPUT_TITLE',
]);

/** CAESAR writes a blank numeric cell as this sentinel, not as NULL. */
const CAESAR_BLANK_SENTINEL = -1.01010000705719;

/**
 * Read one user-selected ACCDB file entirely in the browser.
 *
 * @param {File} file A `File` from an `<input type="file">`.
 * @returns {Promise<Record<string, unknown>>} Custody + inventory record.
 */
export async function importCaesarAccdbInBrowser(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new TypeError('An ACCDB File is required.');
  }
  const startedAt = Date.now();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const sha256 = await sha256Hex(buffer);

  const readLog = [];
  const tableNames = await listAccdbTableNames(bytes, readLog);
  const wanted = CAESAR_ACCDB_INVENTORY_TABLES.filter(
    (name) => tableNames.some((actual) => actual.toUpperCase() === name.toUpperCase()),
  );
  const tables = await readAccdbNamedTables(bytes, wanted, readLog);

  return Object.freeze({
    schema: CAESAR_ACCDB_BROWSER_IMPORT_SCHEMA,
    provider: CAESAR_ACCDB_JS_PROVIDER,
    source: Object.freeze({
      fileName: file.name,
      byteLength: bytes.byteLength,
      lastModifiedUtc: Number.isFinite(file.lastModified)
        ? new Date(file.lastModified).toISOString()
        : null,
      sha256,
    }),
    tableNames: Object.freeze([...tableNames].sort()),
    inventory: buildInventory(tables),
    elapsedMs: Date.now() - startedAt,
    readLog: Object.freeze(readLog),
    solveAuthorized: false,
  });
}

/**
 * Summarize what the database declares, without interpreting it as an
 * engineering result. Every value here is read straight from a table.
 */
function buildInventory(tables) {
  const restraints = tables.INPUT_RESTRAINTS?.rows ?? [];
  const units = tables.INPUT_UNITS?.rows?.[0] ?? null;
  const elements = tables.INPUT_BASIC_ELEMENT_DATA?.rows ?? [];
  const title = tables.INPUT_TITLE?.rows ?? [];

  const withFriction = restraints.filter((row) => isDeclared(row.FRIC_COEF));
  const coefficients = [...new Set(withFriction.map((row) => row.FRIC_COEF))].sort((a, b) => a - b);

  return Object.freeze({
    restraintRowCount: restraints.length,
    frictionRestraintRowCount: withFriction.length,
    declaredFrictionCoefficients: Object.freeze(coefficients),
    blankFrictionRowCount: restraints.length - withFriction.length,
    elementCount: elements.length,
    jobTitle: title.length > 0 ? String(title[0].TITLE ?? title[0].JOBNAME ?? '') : null,
    unitConstants: units === null ? null : Object.freeze({
      CTRANS: units.CTRANS ?? null,
      FRICT_STIF: units.FRICT_STIF ?? null,
    }),
  });
}

function isDeclared(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
    && Math.abs(value - CAESAR_BLANK_SENTINEL) > 1e-9;
}

async function sha256Hex(buffer) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto SHA-256 is unavailable; cannot establish ACCDB custody.');
  const digest = await subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
