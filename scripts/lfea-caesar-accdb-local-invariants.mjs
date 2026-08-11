import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaesarAccdbLocalInvariantDiagnostics } from '../src/core/fea-benchmarks/caesar-accdb-local-invariants.js';

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid command argument near ${String(key)}.`);
    }
    if (accepted.has(key)) throw new TypeError(`Duplicate command argument ${key}.`);
    accepted.set(key, value);
  }
  const known = new Set([
    '--actual',
    '--out',
    '--csv',
    '--closure-relative-limit',
    '--conditioning-warning',
    '--physical-floor',
  ]);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  const actualPath = accepted.get('--actual');
  if (!actualPath) {
    throw new TypeError(
      'Usage: --actual <actual.json> [--out <diagnostics.json>] [--csv <rows.csv>] '
      + '[--closure-relative-limit <number>] [--conditioning-warning <number>] [--physical-floor <number>].',
    );
  }
  return Object.freeze({
    actualPath,
    outPath: accepted.get('--out') ?? null,
    csvPath: accepted.get('--csv') ?? null,
    options: Object.freeze({
      ...optionalNumber(accepted, '--closure-relative-limit', 'closureRelativeLimit'),
      ...optionalNumber(accepted, '--conditioning-warning', 'conditioningWarning'),
      ...optionalNumber(accepted, '--physical-floor', 'physicalFloor'),
    }),
  });
}

function optionalNumber(accepted, argument, key) {
  if (!accepted.has(argument)) return {};
  const value = Number(accepted.get(argument));
  if (!Number.isFinite(value) || !(value > 0)) {
    throw new TypeError(`${argument} must be finite and > 0.`);
  }
  return { [key]: value };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read actual result ${path}: ${error.message}`, { cause: error });
  }
}

function writeJson(value, path) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (path === null) {
    process.stdout.write(content);
    return;
  }
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, content, 'utf8');
  process.stdout.write(`${resolved}\n`);
}

function writeCsv(rows, path) {
  if (path === null) return;
  const columns = [
    'caseId', 'sourceElementId', 'elementId', 'end', 'dof', 'quantity', 'component', 'unit',
    'displacement', 'recordedElasticAction', 'equivalentLoad', 'initialStrainLoad', 'recoveredAction',
    'qIdentityResidual', 'qIdentityRelativeResidual', 'closureStatus',
    'transformedLocalRecoveredAction', 'localToGlobalResidual', 'localToGlobalRelativeResidual',
    'conditioning', 'conditioningClass',
  ];
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(','));
  }
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${lines.join('\n')}\n`, 'utf8');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function run(argv) {
  const input = parseArguments(argv);
  const actual = readJson(input.actualPath);
  const diagnostics = buildCaesarAccdbLocalInvariantDiagnostics(actual, input.options);
  writeCsv(diagnostics.rows, input.csvPath);
  writeJson(diagnostics, input.outPath);
  if (diagnostics.summary.closureStatus === 'FAIL') process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
