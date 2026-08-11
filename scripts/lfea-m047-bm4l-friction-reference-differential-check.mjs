import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const authorityPath = path.resolve(args.authority ?? 'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-reference-authority.json');
const reportPath = path.resolve(required(args.report, '--report'));
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const reportBytes = fs.readFileSync(reportPath);
const report = JSON.parse(reportBytes.toString('utf8'));

assert(authority.schema === 'm047-bm4l-friction-reference-authority/v1', 'authority schema mismatch');
assert(authority.benchmarkId === 'BM4_L', 'authority benchmark mismatch');
assert(authority.policy?.newMechanicsAuthorized === false, 'reference evidence must not authorize mechanics');
assert(authority.policy?.responseValuesMayAuthorizeSlideMultiplier === false, 'response fitting must remain prohibited');
assert(sha256(reportBytes) === authority.sourceArtifact.reportSha256, 'report SHA-256 mismatch');
assert(report.schema === 'lfea-caesar-accdb-benchmark-report/v1', 'report schema mismatch');
assert(report.benchmarkId === 'BM4_L', 'report benchmark mismatch');

const byCase = new Map(report.cases.map((row) => [row.caseId, row]));
const summaries = authority.pairs.map((pair) => summarizePair(pair));
const algebra = authority.derivedControls.map((row) => summarizeAlgebra(row));
const snapshot = {
  schema: 'm047-bm4l-friction-reference-snapshot/v1',
  reportSha256: sha256(reportBytes),
  pairs: summaries,
  algebra,
  policy: authority.policy,
};
if (args.expected) {
  const expected = JSON.parse(fs.readFileSync(path.resolve(args.expected), 'utf8'));
  assert(JSON.stringify(snapshot) === JSON.stringify(expected), 'reference snapshot mismatch');
}

console.log(JSON.stringify({
  check: 'm047-bm4l-friction-reference-differential',
  status: 'PASS',
  authorityPath,
  reportPath,
  reportSha256: sha256(reportBytes),
  pairs: summaries,
  algebra,
  policy: authority.policy,
  bm4lProductionFrictionAuthorized: false,
}, null, 2));

function summarizePair(pair) {
  const off = requireCase(pair.frictionOff);
  const on = requireCase(pair.frictionOn);
  assert(off.referenceRows.length === 2496 && on.referenceRows.length === 2496, `${pair.frictionOff}/${pair.frictionOn} reference row count mismatch`);
  assertCounts(off.referenceCounts, authority.expectedReferenceCountsPerPrimaryCase, pair.frictionOff);
  assertCounts(on.referenceCounts, authority.expectedReferenceCountsPerPrimaryCase, pair.frictionOn);
  const offMap = rowMap(off.referenceRows);
  const onMap = rowMap(on.referenceRows);
  assert(sameKeys(offMap, onMap), `${pair.frictionOff}/${pair.frictionOn} row-key surface mismatch`);
  const byQuantity = new Map();
  for (const [key, onRow] of onMap) {
    const delta = onRow.value - offMap.get(key).value;
    if (!byQuantity.has(onRow.quantity)) byQuantity.set(onRow.quantity, []);
    byQuantity.get(onRow.quantity).push(delta);
  }
  const quantitySummary = Object.fromEntries([...byQuantity.entries()].sort().map(([quantity, deltas]) => [quantity, {
    rowCount: deltas.length,
    changedRows: deltas.filter((value) => value !== 0).length,
    maxAbsoluteDelta: Math.max(...deltas.map(Math.abs)),
    rmsDelta: Math.sqrt(deltas.reduce((sum, value) => sum + value * value, 0) / deltas.length),
  }]));
  return {
    frictionOff: pair.frictionOff,
    frictionOn: pair.frictionOn,
    nominalLoads: pair.nominalLoads,
    referenceRowCount: on.referenceRows.length,
    sameReferenceKeys: true,
    equilibrium: {
      off: off.equilibrium?.counts ?? null,
      on: on.equilibrium?.counts ?? null,
    },
    quantitySummary,
    largestSupportForceDeltaNodes: largestSupportForceDeltaNodes(offMap, onMap, 8),
  };
}

function summarizeAlgebra(control) {
  const derived = requireCase(control.caseId);
  assert(derived.formula === control.formula, `${control.caseId} formula mismatch`);
  const match = /^([^=]+)=([^-]+)-(.+)$/.exec(control.formula);
  assert(match, `${control.caseId} formula parser mismatch`);
  const left = rowMap(requireCase(match[2]).referenceRows);
  const right = rowMap(requireCase(match[3]).referenceRows);
  const result = rowMap(derived.referenceRows);
  assert(sameKeys(left, right) && sameKeys(left, result), `${control.caseId} algebra key surface mismatch`);
  const residualByUnit = new Map();
  for (const [key, row] of result) {
    const residual = row.value - (left.get(key).value - right.get(key).value);
    if (!residualByUnit.has(row.unit)) residualByUnit.set(row.unit, []);
    residualByUnit.get(row.unit).push(residual);
  }
  return {
    caseId: control.caseId,
    formula: control.formula,
    rowCount: result.size,
    keySurfaceExact: true,
    storedRepresentationResidual: Object.fromEntries([...residualByUnit.entries()].sort().map(([unit, residuals]) => [unit, {
      nonzeroRows: residuals.filter((value) => value !== 0).length,
      maxAbsoluteResidual: Math.max(...residuals.map(Math.abs)),
    }])),
    residualUsedAsAcceptanceTolerance: false,
  };
}

function largestSupportForceDeltaNodes(offMap, onMap, limit) {
  const nodes = new Map();
  for (const [key, onRow] of onMap) {
    if (onRow.quantity !== 'FORCE' || onRow.entityKind !== 'NODE') continue;
    const offRow = offMap.get(key);
    if (!nodes.has(onRow.entityId)) nodes.set(onRow.entityId, { UX: 0, UY: 0, UZ: 0 });
    nodes.get(onRow.entityId)[onRow.component] = onRow.value - offRow.value;
  }
  return [...nodes.entries()].map(([nodeId, delta]) => ({
    nodeId,
    deltaForceN: delta,
    deltaNormN: Math.hypot(delta.UX, delta.UY, delta.UZ),
  })).sort((a, b) => b.deltaNormN - a.deltaNormN || Number(a.nodeId) - Number(b.nodeId)).slice(0, limit);
}

function requireCase(caseId) {
  const row = byCase.get(caseId);
  assert(row, `missing report case ${caseId}`);
  assert(Array.isArray(row.referenceRows), `${caseId} missing referenceRows`);
  return row;
}

function rowMap(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = [row.quantity, row.entityKind, row.entityId, row.component, row.unit].join('|');
    assert(!result.has(key), `duplicate reference row ${key}`);
    result.set(key, row);
  }
  return result;
}

function assertCounts(actual, expected, label) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  assert(JSON.stringify(actualKeys) === JSON.stringify(expectedKeys), `${label} reference count keys mismatch`);
  for (const key of expectedKeys) assert(actual[key] === expected[key], `${label} reference count ${key} mismatch`);
}

function sameKeys(a, b) {
  if (a.size !== b.size) return false;
  for (const key of a.keys()) if (!b.has(key)) return false;
  return true;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith('--')) throw new Error(`unexpected argument ${key}`);
    const value = values[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}

function required(value, label) {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
