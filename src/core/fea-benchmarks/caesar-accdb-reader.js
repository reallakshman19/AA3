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
import { readAccdbNamedTables } from './caesar-accdb-reader-core.js';

export const CAESAR_ACCDB_RAW_EXPORT_SCHEMA = 'caesar-accdb-raw-export/v1';
export const CAESAR_ACCDB_JS_PROVIDER = 'JS_MDB_READER_PORT_OF_XML_COMPARE_UTILITIES_ACCDB_MDB_V1';

export { readAccdbNamedTables };

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
