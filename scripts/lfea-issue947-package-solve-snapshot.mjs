#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
import { compareBenchmarkResultRows } from '../src/core/fea-benchmarks/qualification-comparison.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('Usage: node scripts/lfea-issue947-package-solve-snapshot.mjs --package <canonical-package.json> [--out <json>]');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
assert.equal(pkg?.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB SHA-256 drift.');
const actual = solveCaesarAccdbLinearBenchmark(pkg);
const cases = {};
for (const caseId of ['L19', 'L20']) {
  const comparison = compareBenchmarkResultRows({
    caseId,
    referenceRows: pkg.references[caseId].rows,
    actualRows: actual.cases[caseId].rows,
    tolerances: pkg.profile.tolerances,
  });
  const failures = comparison.rows.filter((row) => row.status === 'FAIL').map((row) => ({
    identity: [row.entityKind, row.entityId, row.quantity, row.component].join('|'),
    entityKind: row.entityKind,
    entityId: row.entityId,
    quantity: row.quantity,
    component: row.component,
    referenceValue: row.referenceValue,
    actualValue: row.actualValue,
    absoluteError: row.absoluteError,
    relativeError: row.relativeError,
    percentError: row.percentError,
    unit: row.unit,
  }));
  cases[caseId] = {
    counts: comparison.counts,
    failures,
    executionStatus: actual.mechanics.cases[caseId].executionStatus,
    node20390Uz: comparison.rows.find((row) => row.entityKind === 'NODE'
      && String(row.entityId) === '20390' && row.quantity === 'FORCE' && row.component === 'UZ') ?? null,
    node20090Uy: comparison.rows.find((row) => row.entityKind === 'NODE'
      && String(row.entityId) === '20090' && row.quantity === 'FORCE' && row.component === 'UY') ?? null,
  };
}
const output = {
  schema: 'lfea-issue947-package-solve-snapshot/v1',
  issue: 947,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  cases,
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

function parseArgs(tokens) {
  const result = { package: null, out: null };
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index]; const value = tokens[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
