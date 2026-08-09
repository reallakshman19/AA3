#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalPrettyStringify,
  semanticHash,
} from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const CASE_WP = 'L19';
const CASE_WPT = 'L20';
const TARGET_QUANTITIES = new Set([
  'DISPLACEMENT',
  'ROTATION',
  'FORCE',
  'MOMENT',
  'GLOBAL_END_FORCE_FROM',
  'GLOBAL_END_FORCE_TO',
  'GLOBAL_END_MOMENT_FROM',
  'GLOBAL_END_MOMENT_TO',
]);

export function buildM047ResidualDecomposition(report) {
  requireReport(report);
  const cases = new Map(report.qualification.cases.map((entry) => [entry.caseId, entry]));
  const l19 = requireCase(cases, CASE_WP);
  const l20 = requireCase(cases, CASE_WPT);
  const left = indexComparableRows(l19.comparison.rows, CASE_WP);
  const right = indexComparableRows(l20.comparison.rows, CASE_WPT);
  requireSameIdentitySet(left, right);

  const rows = [...left.keys()].sort().map((identity) => {
    const row19 = left.get(identity);
    const row20 = right.get(identity);
    requireCompatibleRows(row19, row20, identity);
    const wpResidual = row19.actualValue - row19.referenceValue;
    const actualThermalIncrement = row20.actualValue - row19.actualValue;
    const referenceThermalIncrement = row20.referenceValue - row19.referenceValue;
    const thermalResidual = actualThermalIncrement - referenceThermalIncrement;
    const scaleFloor = requirePositiveScaleFloor(row19, identity);
    const wpScale = Math.max(Math.abs(row19.referenceValue), scaleFloor);
    const thermalScale = Math.max(Math.abs(referenceThermalIncrement), scaleFloor);
    return Object.freeze({
      identity,
      family: familyOf(row19),
      entityKind: row19.entityKind,
      entityId: row19.entityId,
      quantity: row19.quantity,
      component: row19.component,
      unit: row19.unit,
      scaleFloor,
      l19: Object.freeze({ actual: row19.actualValue, reference: row19.referenceValue }),
      l20: Object.freeze({ actual: row20.actualValue, reference: row20.referenceValue }),
      wpResidual,
      wpNormalizedResidual: Math.abs(wpResidual) / wpScale,
      thermal: Object.freeze({
        actualIncrement: actualThermalIncrement,
        referenceIncrement: referenceThermalIncrement,
        residual: thermalResidual,
        normalizedResidual: Math.abs(thermalResidual) / thermalScale,
      }),
    });
  });

  const base = {
    schema: 'lfea-m047-residual-decomposition/v1',
    issueId: 'M047',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: report.source.sha256,
    caseAlgebra: Object.freeze({
      wpCase: CASE_WP,
      wptCase: CASE_WPT,
      wpMeaning: 'W+P1',
      thermalIncrementMeaning: 'L20-L19 = T1 response under the case-specific model state',
    }),
    rowCount: rows.length,
    summaries: summarize(rows),
    tracked: trackedRows(rows),
    rows,
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function requireReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('Benchmark report must be an object.');
  }
  if (report.source?.sha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError(`M047 residual decomposition requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  }
  if (!report.qualification || !Array.isArray(report.qualification.cases)) {
    throw new TypeError('Benchmark report must contain qualification cases.');
  }
}

function requireCase(cases, caseId) {
  const value = cases.get(caseId);
  if (!value?.comparison || !Array.isArray(value.comparison.rows)) {
    throw new TypeError(`Qualification case ${caseId} is missing comparison rows.`);
  }
  return value;
}

function indexComparableRows(rows, caseId) {
  const result = new Map();
  for (const row of rows) {
    if (!TARGET_QUANTITIES.has(row.quantity)) continue;
    if (!Number.isFinite(row.actualValue) || !Number.isFinite(row.referenceValue)) continue;
    const identity = physicalIdentity(row);
    if (result.has(identity)) throw new TypeError(`${caseId} contains duplicate physical identity ${identity}.`);
    result.set(identity, row);
  }
  if (result.size === 0) throw new TypeError(`${caseId} contains no comparable M047 physical rows.`);
  return result;
}

function physicalIdentity(row) {
  return `${row.entityKind}:${row.entityId}:${row.quantity}:${row.component}`;
}

function requireSameIdentitySet(left, right) {
  const leftOnly = [...left.keys()].filter((key) => !right.has(key)).sort();
  const rightOnly = [...right.keys()].filter((key) => !left.has(key)).sort();
  if (leftOnly.length || rightOnly.length) {
    throw new TypeError(
      `L19/L20 physical identity mismatch: L19-only=${JSON.stringify(leftOnly.slice(0, 10))}, L20-only=${JSON.stringify(rightOnly.slice(0, 10))}.`,
    );
  }
}

function requireCompatibleRows(left, right, identity) {
  if (left.unit !== right.unit) throw new TypeError(`${identity} changes unit from ${left.unit} to ${right.unit}.`);
  const leftFloor = Number(left.tolerance?.scaleFloor ?? 0);
  const rightFloor = Number(right.tolerance?.scaleFloor ?? 0);
  if (leftFloor !== rightFloor) throw new TypeError(`${identity} changes scale floor from ${leftFloor} to ${rightFloor}.`);
}

function requirePositiveScaleFloor(row, identity) {
  const value = Number(row.tolerance?.scaleFloor);
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${identity} must declare a finite positive scale floor.`);
  return value;
}

function familyOf(row) {
  if (row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) return 'DISPLACEMENT_ROTATION';
  if (row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity)) return 'SUPPORT_REACTION';
  if (row.entityKind === 'ELEMENT' && row.quantity.startsWith('GLOBAL_END_')) return 'SOURCE_END_ACTION';
  throw new TypeError(`Unsupported M047 physical row ${physicalIdentity(row)}.`);
}

function summarize(rows) {
  const families = {};
  for (const family of ['DISPLACEMENT_ROTATION', 'SUPPORT_REACTION', 'SOURCE_END_ACTION']) {
    families[family] = summarizeRows(rows.filter((row) => row.family === family));
  }
  return Object.freeze({ all: summarizeRows(rows), families: Object.freeze(families) });
}

function summarizeRows(rows) {
  return Object.freeze({
    rowCount: rows.length,
    wp: residualStats(rows, (row) => row.wpResidual, (row) => row.wpNormalizedResidual),
    thermal: residualStats(rows, (row) => row.thermal.residual, (row) => row.thermal.normalizedResidual),
  });
}

function residualStats(rows, residualOf, normalizedOf) {
  if (rows.length === 0) {
    return Object.freeze({ rowCount: 0, l2: 0, rms: 0, maximumAbsolute: null, maximumNormalized: null, topNormalized: Object.freeze([]) });
  }
  const sortedAbsolute = [...rows].sort(
    (a, b) => Math.abs(residualOf(b)) - Math.abs(residualOf(a)) || a.identity.localeCompare(b.identity),
  );
  const sortedNormalized = [...rows].sort(
    (a, b) => normalizedOf(b) - normalizedOf(a) || a.identity.localeCompare(b.identity),
  );
  const sumSquares = rows.reduce((sum, row) => sum + residualOf(row) ** 2, 0);
  return Object.freeze({
    rowCount: rows.length,
    l2: Math.sqrt(sumSquares),
    rms: Math.sqrt(sumSquares / rows.length),
    maximumAbsolute: witness(sortedAbsolute[0], residualOf(sortedAbsolute[0]), normalizedOf(sortedAbsolute[0])),
    maximumNormalized: witness(sortedNormalized[0], residualOf(sortedNormalized[0]), normalizedOf(sortedNormalized[0])),
    topNormalized: Object.freeze(sortedNormalized.slice(0, 20).map(
      (row) => witness(row, residualOf(row), normalizedOf(row)),
    )),
  });
}

function witness(row, residual, normalizedResidual) {
  return Object.freeze({
    identity: row.identity,
    family: row.family,
    entityKind: row.entityKind,
    entityId: row.entityId,
    quantity: row.quantity,
    component: row.component,
    unit: row.unit,
    residual,
    normalizedResidual,
  });
}

function trackedRows(rows) {
  const specs = [
    ['L19_20090_FY', 'NODE', '20090', 'FORCE', 'UY'],
    ['L20_20350_FY', 'NODE', '20350', 'FORCE', 'UY'],
    ['L20_20390_FZ', 'NODE', '20390', 'FORCE', 'UZ'],
    ['L20_20550_FZ', 'NODE', '20550', 'FORCE', 'UZ'],
    ['L20_22140_FX', 'NODE', '22140', 'FORCE', 'UX'],
    ['L20_22490_FX', 'NODE', '22490', 'FORCE', 'UX'],
  ];
  return Object.freeze(Object.fromEntries(specs.map(([label, entityKind, entityId, quantity, component]) => {
    const identity = `${entityKind}:${entityId}:${quantity}:${component}`;
    const row = rows.find((entry) => entry.identity === identity);
    if (!row) throw new TypeError(`Tracked M047 identity ${identity} is missing.`);
    return [label, row];
  })));
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const report = args.get('--report');
  const out = args.get('--out');
  if (!report || !out) {
    throw new TypeError('Usage: --report <benchmark.json> --out <residuals.json> [--summary-out <summary.md>].');
  }
  const unknown = [...args.keys()].filter((key) => !['--report', '--out', '--summary-out'].includes(key));
  if (unknown.length) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return { report, out, summaryOut: args.get('--summary-out') ?? null };
}

function writeJson(value, path) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, canonicalPrettyStringify(value), 'utf8');
}

function writeSummary(value, path) {
  const lines = [
    '# M047 residual decomposition',
    '',
    `- Evidence hash: \`${value.semanticHash}\``,
    `- Locked ACCDB SHA-256: \`${value.sourceAccdbSha256}\``,
    `- Comparable physical rows: ${value.rowCount}`,
    '- `r_WP = L19_LFEA - L19_CAESAR`.',
    '- `r_T = (L20-L19)_LFEA - (L20-L19)_CAESAR`.',
    '',
  ];
  for (const [family, stats] of Object.entries(value.summaries.families)) {
    lines.push(
      `## ${family}`,
      '',
      `Rows: ${stats.rowCount}`,
      '',
      '### Largest normalized W+P residuals',
      '',
      '| Identity | Residual | Normalized | Unit |',
      '|---|---:|---:|---|',
    );
    for (const row of stats.wp.topNormalized.slice(0, 10)) {
      lines.push(`| ${row.identity} | ${format(row.residual)} | ${format(row.normalizedResidual)} | ${row.unit} |`);
    }
    lines.push(
      '',
      '### Largest normalized thermal-increment residuals',
      '',
      '| Identity | Residual | Normalized | Unit |',
      '|---|---:|---:|---|',
    );
    for (const row of stats.thermal.topNormalized.slice(0, 10)) {
      lines.push(`| ${row.identity} | ${format(row.residual)} | ${format(row.normalizedResidual)} | ${row.unit} |`);
    }
    lines.push('');
  }
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${lines.join('\n').trim()}\n`, 'utf8');
}

function format(value) {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e-3 && Math.abs(value) < 1e6) return Number(value.toFixed(6)).toString();
  return value.toExponential(6);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(resolve(input.report), 'utf8'));
  const result = buildM047ResidualDecomposition(report);
  writeJson(result, input.out);
  if (input.summaryOut) writeSummary(result, input.summaryOut);
  process.stdout.write(`M047 residual decomposition: ${result.rowCount} rows, ${result.semanticHash}\n`);
}
