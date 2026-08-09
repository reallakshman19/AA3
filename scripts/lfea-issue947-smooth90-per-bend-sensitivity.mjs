#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { solveCaesarAccdbLinearBenchmark as solveBaseline } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
import { compareBenchmarkResultRows } from '../src/core/fea-benchmarks/qualification-comparison.js';

const SOURCE_SHA = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const TARGETS = Object.freeze([
  { node: '22000', quantity: 'DISPLACEMENT', component: 'UX' },
  { node: '22140', quantity: 'DISPLACEMENT', component: 'UZ' },
  { node: '22190', quantity: 'DISPLACEMENT', component: 'UZ' },
]);

const args = parse(process.argv.slice(2));
if (!args.package) throw new TypeError('--package required');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
assert.equal(pkg.source.sha256, SOURCE_SHA, 'ACCDB source drift');
assert.equal(pkg.profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, false,
  'Per-bend sensitivity requires the fail-closed all-false baseline profile.');

const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const bends = sourceRows.filter((row) => Number(row.BEND_PTR) > 0)
  .sort((left, right) => Number(left.BEND_PTR) - Number(right.BEND_PTR));
assert.equal(bends.length, 12, 'BM4_NL bend population drift');

const solverPath = fileURLToPath(new URL('../src/core/fea-benchmarks/caesar-accdb-linear-solve.js', import.meta.url));
const original = readFileSync(solverPath, 'utf8');
const old = '        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled,';
assert.equal(original.split(old).length - 1, 1, 'smooth90 factor-selection site drift');

const baselineActual = solveBaseline(pkg);
const baseline = compareL19(baselineActual.cases.L19.rows);
const baselineFailed = new Set(baseline.rows.filter((row) => row.status === 'FAIL').map((row) => row.identity));
const output = {
  schema: 'lfea-issue947-smooth90-per-bend-sensitivity/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: SOURCE_SHA,
  purpose: 'ONE_BEND_AT_A_TIME_SMOOTH90_SENSITIVITY_ONLY_NO_PRODUCTION_UPDATE',
  rule: 'Each variant changes only one source bend from the baseline 1.65/h path to the existing B31J smooth-90 1.3/h path. This localizes propagation and does not authorize the mechanic by residual fit.',
  baseline: {
    counts: baseline.counts,
    targetRows: targetRows(baseline),
  },
  variants: [],
};

for (const bend of bends) {
  const sourceElementId = String(bend.ELEMENTID);
  const pointer = Number(bend.BEND_PTR);
  const replacement = `        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled || sourceElementId === '${sourceElementId}',`;
  const candidateSource = original.replace(old, replacement);
  const candidatePath = fileURLToPath(new URL(`../src/core/fea-benchmarks/.issue947-smooth90-bend-${pointer}.mjs`, import.meta.url));
  let candidateActual;
  writeFileSync(candidatePath, candidateSource);
  try {
    const mod = await import(pathToFileURL(candidatePath).href + `?v=${Date.now()}-${pointer}`);
    candidateActual = mod.solveCaesarAccdbLinearBenchmark(pkg);
  } finally {
    try { unlinkSync(candidatePath); } catch {}
  }
  const comparison = compareL19(candidateActual.cases.L19.rows);
  const failed = new Set(comparison.rows.filter((row) => row.status === 'FAIL').map((row) => row.identity));
  output.variants.push({
    bendPointer: pointer,
    sourceElementId,
    fromNode: String(bend.FROM_NODE),
    toNode: String(bend.TO_NODE),
    counts: comparison.counts,
    failureCountDelta: comparison.counts.failed - baseline.counts.failed,
    removedFailures: [...baselineFailed].filter((identity) => !failed.has(identity)).sort(),
    addedFailures: [...failed].filter((identity) => !baselineFailed.has(identity)).sort(),
    targetRows: targetRows(comparison),
  });
}

output.targetAttribution = Object.fromEntries(TARGETS.map((target) => {
  const key = `${target.node}:${target.quantity}:${target.component}`;
  const baselineRow = output.baseline.targetRows[key];
  const variants = output.variants.map((variant) => {
    const row = variant.targetRows[key];
    return {
      bendPointer: variant.bendPointer,
      sourceElementId: variant.sourceElementId,
      actualValue: row.actualValue,
      referenceValue: row.referenceValue,
      absoluteError: row.absoluteError,
      relativeError: row.relativeError,
      acceptanceLimit: row.acceptanceLimit,
      status: row.status,
      deltaAbsoluteError: row.absoluteError - baselineRow.absoluteError,
      deltaActualValue: row.actualValue - baselineRow.actualValue,
    };
  }).sort((left, right) => Math.abs(right.deltaAbsoluteError) - Math.abs(left.deltaAbsoluteError));
  return [key, { baseline: baselineRow, rankedByAbsErrorChange: variants }];
}));

output.classification = 'DIAGNOSTIC_SENSITIVITY_COMPLETE_NO_MECHANIC_ACCEPTANCE';
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

function compareL19(actualRows) {
  return compareBenchmarkResultRows({
    caseId: 'L19',
    referenceRows: pkg.references.L19.rows,
    actualRows,
    tolerances: pkg.profile.tolerances,
  });
}

function targetRows(comparison) {
  return Object.fromEntries(TARGETS.map((target) => {
    const row = comparison.rows.find((entry) => entry.entityKind === 'NODE'
      && String(entry.entityId) === target.node
      && entry.quantity === target.quantity
      && entry.component === target.component);
    if (!row) throw new TypeError(`Missing target ${target.node} ${target.quantity}:${target.component}.`);
    return [`${target.node}:${target.quantity}:${target.component}`, row];
  }));
}

function parse(argv) {
  const result = { package: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
