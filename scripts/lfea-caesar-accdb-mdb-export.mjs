#!/usr/bin/env node

/**
 * Cross-platform CAESAR ACCDB extraction using the same browser-side engine
 * pattern as reallaksh19/XML_Compare_Utilities parser/accdb-mdb.js.
 *
 * Source custody for the adapted extraction boundary:
 *   repository: reallaksh19/XML_Compare_Utilities
 *   commit: d83c62214b7a6486c17698225ea4e11bc3121cb6
 *   parser blob: 2ea596b6e9fb65e386e5cbb256f4141ce7bb595b
 *   parser imports: mdb-reader@2 and buffer@6
 *
 * This adapter deliberately copies only the raw named-table extraction
 * boundary. Advanced_Analysis remains the sole authority for CAESAR table
 * interpretation, units, model assembly and qualification.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const XML_UTILITIES_SOURCE = Object.freeze({
  repository: 'reallaksh19/XML_Compare_Utilities',
  commit: 'd83c62214b7a6486c17698225ea4e11bc3121cb6',
  parserPath: 'parser/accdb-mdb.js',
  parserBlobSha: '2ea596b6e9fb65e386e5cbb256f4141ce7bb595b',
});
const MDB_READER_URL = 'https://esm.sh/mdb-reader@2.2.6';
const BUFFER_URL = 'https://esm.sh/buffer@6.0.3';
const PROVIDER_ID = 'XML_COMPARE_UTILITIES_MDB_READER_V2_BROWSER';
const MODULE_READY_TIMEOUT_MS = 60_000;

/**
 * Read an ACCDB/MDB file and return the existing caesar-accdb-raw-export/v1
 * contract without requiring Microsoft ACE/OLE DB.
 */
export async function extractCaesarAccdbWithMdbReader(input) {
  const accdbPath = resolve(nonempty(input?.accdbPath, 'accdbPath'));
  const tableNames = normalizeTableNames(input?.tableNames);
  const bytes = readFileSync(accdbPath);
  const file = statSync(accdbPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const browser = await launchBrowser();
  try {
    const page = await browser.instance.newPage();
    await page.setContent(extractorHtml(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => globalThis.__lfeaAccdbReady === true, null, {
      timeout: MODULE_READY_TIMEOUT_MS,
    });
    const result = await page.evaluate(
      async ({ databaseBase64, requestedTables }) => globalThis.__lfeaReadAccdbNamedTables(
        databaseBase64,
        requestedTables,
      ),
      {
        databaseBase64: bytes.toString('base64'),
        requestedTables: tableNames,
      },
    );
    if (!result || typeof result !== 'object') {
      throw new TypeError('mdb-reader extraction returned no table payload.');
    }
    if (Array.isArray(result.missing) && result.missing.length > 0) {
      throw new TypeError(`ACCDB is missing required tables: ${result.missing.join(', ')}.`);
    }
    const tables = {};
    for (const tableName of tableNames) {
      const table = result.tables?.[tableName];
      if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
        throw new TypeError(`mdb-reader extraction did not materialize required table ${tableName}.`);
      }
      tables[tableName] = {
        columns: table.columns,
        rows: table.rows,
      };
    }
    return Object.freeze({
      schema: 'caesar-accdb-raw-export/v1',
      source: Object.freeze({
        path: accdbPath,
        fileName: basename(accdbPath),
        byteLength: file.size,
        lastWriteTimeUtc: file.mtime.toISOString(),
        sha256,
      }),
      provider: `${PROVIDER_ID}:${browser.mode}`,
      providerEvidence: Object.freeze({
        engine: 'mdb-reader',
        mdbReaderUrl: MDB_READER_URL,
        bufferUrl: BUFFER_URL,
        source: XML_UTILITIES_SOURCE,
        browserMode: browser.mode,
      }),
      tables: Object.freeze(tables),
    });
  } finally {
    await browser.instance.close();
  }
}

async function launchBrowser() {
  const requestedChannel = String(process.env.LFEA_ACCDB_BROWSER_CHANNEL ?? '').trim();
  if (requestedChannel) {
    return {
      instance: await chromium.launch({ headless: true, channel: requestedChannel }),
      mode: `PLAYWRIGHT_CHANNEL_${requestedChannel.toUpperCase()}`,
    };
  }
  try {
    return {
      instance: await chromium.launch({ headless: true }),
      mode: 'PLAYWRIGHT_BUNDLED_CHROMIUM',
    };
  } catch (primaryError) {
    try {
      return {
        instance: await chromium.launch({ headless: true, channel: 'chrome' }),
        mode: 'PLAYWRIGHT_SYSTEM_CHROME',
      };
    } catch (channelError) {
      throw new Error(
        'The XML_Compare_Utilities ACCDB engine requires a Playwright Chromium/Chrome runtime. '
        + 'Install Playwright Chromium or set LFEA_ACCDB_BROWSER_CHANNEL to an installed Playwright channel.',
        { cause: new AggregateError([primaryError, channelError], 'No usable Chromium runtime.') },
      );
    }
  }
}

function extractorHtml() {
  const importMap = JSON.stringify({
    imports: {
      'mdb-reader': MDB_READER_URL,
      buffer: BUFFER_URL,
    },
  }).replaceAll('<', '\\u003c');
  return `<!doctype html>
<meta charset="utf-8">
<script type="importmap">${importMap}</script>
<script type="module">
  import MDBReader from 'mdb-reader';
  import { Buffer } from 'buffer';
  globalThis.Buffer = globalThis.Buffer || Buffer;

  function normalizeCell(value) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'bigint') {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) {
        throw new TypeError('ACCDB bigint exceeds JavaScript safe-integer range.');
      }
      return number;
    }
    if (Buffer.isBuffer(value)) return value.toString('base64');
    if (value instanceof Uint8Array) return Buffer.from(value).toString('base64');
    if (['string', 'number', 'boolean'].includes(typeof value)) return value;
    throw new TypeError('Unsupported ACCDB value type: ' + Object.prototype.toString.call(value));
  }

  globalThis.__lfeaReadAccdbNamedTables = async (databaseBase64, requestedTables) => {
    const reader = new MDBReader(Buffer.from(databaseBase64, 'base64'));
    const available = reader.getTableNames();
    const availableByUpper = new Map(available.map(name => [String(name).toUpperCase(), name]));
    const tables = {};
    const missing = [];
    for (const requested of requestedTables) {
      const actual = availableByUpper.get(String(requested).toUpperCase());
      if (!actual) {
        missing.push(requested);
        continue;
      }
      const table = reader.getTable(actual);
      const columns = table.getColumnNames();
      const rows = table.getData().map(row => Object.fromEntries(
        columns.map(column => [column, normalizeCell(row[column])]),
      ));
      tables[requested] = { columns, rows };
    }
    return { tables, missing };
  };
  globalThis.__lfeaAccdbReady = true;
</script>`;
}

function normalizeTableNames(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('tableNames must be a non-empty array.');
  }
  const names = value.map((entry, index) => {
    const name = nonempty(entry, `tableNames[${index}]`).toUpperCase();
    if (!/^[A-Z0-9_]+$/u.test(name)) throw new TypeError(`Unsafe ACCDB table name ${name}.`);
    return name;
  });
  if (new Set(names).size !== names.length) throw new TypeError('tableNames contains duplicates.');
  return Object.freeze(names);
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required.`);
  return text;
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (values.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    values.set(key, value);
  }
  const known = new Set(['--accdb', '--tables']);
  const unknown = [...values.keys()].filter(key => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  const accdbPath = values.get('--accdb');
  const tables = String(values.get('--tables') ?? '').split(',').map(value => value.trim()).filter(Boolean);
  if (!accdbPath || tables.length === 0) {
    throw new TypeError('Usage: --accdb <file.accdb> --tables <TABLE_A,TABLE_B,...>.');
  }
  return { accdbPath, tableNames: tables };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await extractCaesarAccdbWithMdbReader(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
