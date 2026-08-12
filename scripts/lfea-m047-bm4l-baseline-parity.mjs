#!/usr/bin/env node
/**
 * Prove that evidence-only M047 instrumentation has not changed governed BM4_L
 * result rows relative to the immutable pre-investigation implementation.
 *
 * A separately recorded count declaration is treated as evidence, not as an
 * authority capable of overriding the pinned source + baseline implementation.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const DECLARED_FROZEN_COUNTS = Object.freeze({
  L2: Object.freeze({ restraint: 4, displacementRotation: 115, globalElementEndAction: 142 }),
  L3: Object.freeze({ restraint: 9, displacementRotation: 98, globalElementEndAction: 179 }),
  L4: Object.freeze({ restraint: 6, displacementRotation: 66, globalElementEndAction: 86 }),
  L5: Object.freeze({ restraint: 3, displacementRotation: 72, globalElementEndAction: 162 }),
  L6: Object.freeze({ restraint: 1, displacementRotation: 64, globalElementEndAction: 50 }),
  L14: Object.freeze({ restraint: 9, displacementRotation: 98, globalElementEndAction: 179 }),
});

export function compareBm4lBaselineParity({ current, baseline }) {
  requireReport(current, 'current report');
  requireReport(baseline, 'baseline report');
  if (current.source?.sha256 !== baseline.source?.sha256) {
    throw new TypeError(`Source hash mismatch: current=${current.source?.sha256}, baseline=${baseline.source?.sha256}.`);
  }
  if (current.benchmarkId !== baseline.benchmarkId || current.profileId !== baseline.profileId) {
    throw new TypeError('Current and baseline reports do not identify the same governed benchmark/profile.');
  }

  const rowParity = {};
  const implementationCounts = {};
  const declarationConflicts = [];
  let allRowsIdentical = true;

  for (const caseId of CASES) {
    const currentRows = comparisonRows(current, caseId);
    const baselineRows = comparisonRows(baseline, caseId);
    const currentMap = new Map(currentRows.map((row) => [rowKey(row), row]));
    const baselineMap = new Map(baselineRows.map((row) => [rowKey(row), row]));
    const keys = [...new Set([...currentMap.keys(), ...baselineMap.keys()])].sort(compareText);
    const differences = [];
    for (const key of keys) {
      const left = currentMap.get(key);
      const right = baselineMap.get(key);
      if (!left || !right) {
        differences.push({ key, kind: left ? 'BASELINE_ROW_MISSING' : 'CURRENT_ROW_MISSING' });
        continue;
      }
      const fieldDifferences = compareFields(left, right);
      if (fieldDifferences.length > 0) differences.push({ key, kind: 'ROW_DIFFERENCE', fields: fieldDifferences });
    }
    if (differences.length > 0) allRowsIdentical = false;
    rowParity[caseId] = {
      currentRowCount: currentRows.length,
      baselineRowCount: baselineRows.length,
      differenceCount: differences.length,
      differences: differences.slice(0, 100),
      status: differences.length === 0 ? 'PASS' : 'FAIL',
    };

    const counts = countsFromReport(baseline, caseId);
    implementationCounts[caseId] = counts;
    const declared = DECLARED_FROZEN_COUNTS[caseId];
    for (const family of Object.keys(declared)) {
      if (counts[family] !== declared[family]) {
        declarationConflicts.push({
          caseId,
          family,
          declaredCount: declared[family],
          baselineImplementationCount: counts[family],
          classification: 'CONTRADICTED_BY_PINNED_SOURCE_AND_BASELINE_IMPLEMENTATION',
        });
      }
    }
  }

  return {
    schema: 'lfea-bm4l-baseline-parity/v1',
    benchmarkId: current.benchmarkId,
    profileId: current.profileId,
    sourceAccdbSha256: current.source.sha256,
    baselineImplementation: '617d2e574c04692ee2fc136930af60f81d5dc952',
    currentPackageSemanticHash: current.packageSemanticHash,
    baselinePackageSemanticHash: baseline.packageSemanticHash,
    rowParity,
    allGovernedComparisonRowsIdentical: allRowsIdentical,
    implementationCounts,
    declaredFrozenCounts: DECLARED_FROZEN_COUNTS,
    declarationConflicts,
    authorityRule: 'PINNED_SOURCE_PLUS_BASELINE_IMPLEMENTATION_OVERRIDES_CONTRADICTED_COUNT_DECLARATION',
    status: allRowsIdentical ? (declarationConflicts.length === 0 ? 'PASS' : 'PASS_WITH_DECLARATION_CONFLICT') : 'FAIL',
  };
}

function requireReport(value, label) {
  if (value?.schema !== 'lfea-caesar-accdb-benchmark-report/v1') {
    throw new TypeError(`${label} must use lfea-caesar-accdb-benchmark-report/v1.`);
  }
}

function comparisonRows(report, caseId) {
  const record = report.qualification?.cases?.find((entry) => entry.caseId === caseId);
  if (!record || !Array.isArray(record.comparison?.rows)) throw new TypeError(`Missing comparison rows for ${caseId}.`);
  return record.comparison.rows;
}

function rowKey(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component, row.unit].map((value) => String(value ?? '')).join('|');
}

function compareFields(left, right) {
  const fields = [
    'status', 'referenceValue', 'actualValue', 'absoluteError', 'rawRelativeError', 'relativeError',
  ];
  const differences = [];
  for (const field of fields) {
    const a = left[field] ?? null;
    const b = right[field] ?? null;
    if (!sameScalar(a, b)) differences.push({ field, current: a, baseline: b });
  }
  return differences;
}

function sameScalar(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return Object.is(left, right) || left === right;
  return left === right;
}

function countsFromReport(report, caseId) {
  const restraint = report.restraintBasis?.cases?.[caseId]?.exceedingComponentCount;
  const displacementRotation = report.displacementBasis?.cases?.[caseId]?.exceedingComponentCount;
  const globalElementEndAction = report.elementBasis?.cases?.[caseId]?.exceedingComponentCount;
  for (const [name, value] of Object.entries({ restraint, displacementRotation, globalElementEndAction })) {
    if (!Number.isInteger(value)) throw new TypeError(`Missing ${name} count for ${caseId}.`);
  }
  return { restraint, displacementRotation, globalElementEndAction };
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function parseArguments(argv) {
  const args = { currentPath: null, baselinePath: null, outPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--current') args.currentPath = value, index += 1;
    else if (flag === '--baseline') args.baselinePath = value, index += 1;
    else if (flag === '--out') args.outPath = value, index += 1;
    else throw new TypeError(`Unknown argument ${flag}.`);
  }
  if (!args.currentPath || !args.baselinePath) {
    throw new TypeError('Usage: node scripts/lfea-m047-bm4l-baseline-parity.mjs --current <current-report.json> --baseline <baseline-report.json> [--out <parity.json>]');
  }
  return args;
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function main(argv) {
  const args = parseArguments(argv);
  const result = compareBm4lBaselineParity({
    current: readJson(args.currentPath, 'current report'),
    baseline: readJson(args.baselinePath, 'baseline report'),
  });
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (args.outPath) writeFileSync(resolve(args.outPath), serialized, 'utf8');
  else process.stdout.write(serialized);
  if (result.status === 'FAIL') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
