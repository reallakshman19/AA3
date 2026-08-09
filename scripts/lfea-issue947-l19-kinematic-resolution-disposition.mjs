#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const CASE_ID = 'L19';
const LCASE_NUM = 19;
const OBSERVED_ROTATION_FLOOR_DEG = 1e-4;
const OBSERVED_ROTATION_FLOOR_RAD = OBSERVED_ROTATION_FLOOR_DEG * Math.PI / 180;
const ROTATIONS = Object.freeze(['RX', 'RY', 'RZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.raw || !args.report) {
  throw new TypeError('Usage: node scripts/lfea-issue947-l19-kinematic-resolution-disposition.mjs --raw <raw-export.json> --report <bm4nl-report.json> [--out <json>]');
}
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
const report = JSON.parse(readFileSync(args.report, 'utf8'));
assert.equal(raw?.source?.sha256, EXPECTED_SOURCE_SHA256, 'raw ACCDB source SHA drift');
assert.equal(report?.source?.sha256, EXPECTED_SOURCE_SHA256, 'qualification report source SHA drift');

const rawRows = raw?.tables?.OUTPUT_DISPLACEMENTS?.rows;
if (!Array.isArray(rawRows) || rawRows.length === 0) throw new TypeError('raw OUTPUT_DISPLACEMENTS rows missing');
const allNonzero = [];
for (const row of rawRows) {
  for (const component of ROTATIONS) {
    const signedDeg = Number(row[component]);
    if (!Number.isFinite(signedDeg)) throw new TypeError(`non-finite raw ${component} at LCASE ${row.LCASE_NUM} node ${row.NODE}`);
    const magnitudeDeg = Math.abs(signedDeg);
    if (magnitudeDeg > 0) allNonzero.push({
      lcaseNum: Number(row.LCASE_NUM),
      node: String(row.NODE),
      component,
      signedDeg,
      magnitudeDeg,
    });
  }
}
allNonzero.sort((a, b) => a.magnitudeDeg - b.magnitudeDeg);
const minimumStoredNonzero = allNonzero[0] ?? null;
const storedNonzeroBelowFloor = allNonzero.filter((entry) => entry.magnitudeDeg < OBSERVED_ROTATION_FLOOR_DEG);
if (storedNonzeroBelowFloor.length !== 0) {
  throw new Error(`Pinned-output floor falsified by ${JSON.stringify(storedNonzeroBelowFloor.slice(0, 5))}`);
}

const qualificationCase = report?.qualification?.cases?.find((entry) => String(entry.caseId) === CASE_ID);
if (!qualificationCase) throw new TypeError('L19 qualification case missing');
const failedRows = qualificationCase.comparison.rows.filter((row) => row.status === 'FAIL');
const originalFailureCount = failedRows.length;
const originalFailedNodeIds = unique(failedRows.map((row) => String(row.entityId)));

const rawL19Index = new Map();
for (const row of rawRows.filter((entry) => Number(entry.LCASE_NUM) === LCASE_NUM)) {
  for (const component of ROTATIONS) {
    rawL19Index.set(`${String(row.NODE)}:${component}`, Number(row[component]));
  }
}

const nonResolving = [];
const actionable = [];
for (const row of failedRows) {
  const record = {
    identity: row.identity,
    entityId: String(row.entityId),
    quantity: row.quantity,
    component: row.component,
    referenceValue: Number(row.referenceValue),
    actualValue: Number(row.actualValue),
    absoluteError: Number(row.absoluteError),
    acceptanceLimit: Number(row.acceptanceLimit),
    originalStatus: row.status,
    originalNote: row.note,
  };
  if (row.quantity === 'ROTATION'
      && ROTATIONS.includes(row.component)
      && Number(row.referenceValue) === 0
      && Math.abs(Number(row.actualValue)) < OBSERVED_ROTATION_FLOOR_RAD) {
    const rawDeg = rawL19Index.get(`${String(row.entityId)}:${row.component}`);
    if (!Number.isFinite(rawDeg)) throw new TypeError(`raw L19 rotation missing for ${row.entityId}:${row.component}`);
    if (rawDeg !== 0) throw new Error(`report zero-reference rotation disagrees with raw L19 ${row.entityId}:${row.component}=${rawDeg} deg`);
    nonResolving.push({
      ...record,
      rawReferenceDeg: rawDeg,
      actualDeg: Number(row.actualValue) * 180 / Math.PI,
      observedFloorDeg: OBSERVED_ROTATION_FLOOR_DEG,
      observedFloorRad: OBSERVED_ROTATION_FLOOR_RAD,
      disposition: 'NON_RESOLVING_PINNED_OUTPUT_PRECISION_RETAIN_ORIGINAL_FAIL',
    });
  } else {
    actionable.push({ ...record, disposition: 'ACTIONABLE_OR_OTHERWISE_REQUIRES_MECHANICAL_CUSTODY' });
  }
}

const nonResolvingNodeIds = unique(nonResolving.map((row) => row.entityId));
const actionableNodeIds = unique(actionable.map((row) => row.entityId));
const output = {
  schema: 'lfea-issue947-l19-kinematic-resolution-disposition/v1',
  issue: 947,
  caseId: CASE_ID,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'SOURCE_OUTPUT_RESOLUTION_DISPOSITION_ONLY_NO_REFERENCE_MUTATION_NO_TOLERANCE_CHANGE_NO_PASS_RECLASSIFICATION',
  observedPinnedExportResolution: {
    floorDeg: OBSERVED_ROTATION_FLOOR_DEG,
    floorRad: OBSERVED_ROTATION_FLOOR_RAD,
    minimumStoredNonzeroRotation: minimumStoredNonzero,
    storedNonzeroBelowFloorCount: storedNonzeroBelowFloor.length,
    scope: 'Pinned BM4_NL ACCDB OUTPUT_DISPLACEMENTS only; not a universal CAESAR output claim.',
  },
  originalQualification: {
    failedComponentCount: originalFailureCount,
    failedNodeCount: originalFailedNodeIds.length,
    failedNodeIds: originalFailedNodeIds,
    originalRowsRemainFailed: true,
    comparisonToleranceChanged: false,
    sourceReferenceChanged: false,
  },
  nonResolvingPinnedOutputPrecision: {
    componentCount: nonResolving.length,
    nodeCount: nonResolvingNodeIds.length,
    nodeIds: nonResolvingNodeIds,
    rows: nonResolving,
  },
  actionableAfterResolutionDisposition: {
    componentCount: actionable.length,
    nodeCount: actionableNodeIds.length,
    nodeIds: actionableNodeIds,
    rows: actionable,
  },
  gates: {
    noStoredNonzeroRotationBelowObservedFloor: storedNonzeroBelowFloor.length === 0 ? 'PASS' : 'FAIL',
    everyDispositionedRowIsRawZeroReferenceRotation: nonResolving.every((row) => row.rawReferenceDeg === 0 && row.quantity === 'ROTATION') ? 'PASS' : 'FAIL',
    everyDispositionedActualMagnitudeIsBelowObservedFloor: nonResolving.every((row) => Math.abs(row.actualDeg) < OBSERVED_ROTATION_FLOOR_DEG) ? 'PASS' : 'FAIL',
    originalFailureCountPreserved: originalFailureCount === nonResolving.length + actionable.length ? 'PASS' : 'FAIL',
    originalComparisonRowsRemainFailed: 'PASS',
  },
  classification: 'L19_PINNED_OUTPUT_RESOLUTION_DISPOSITIONS_SEPARATE_NONRESOLVING_ROTATIONS_FROM_ACTIONABLE_KINEMATIC_FAILURES',
  qualificationUse: 'Do not count the sub-floor zero-reference rotations as passed. Preserve their original FAIL rows and raw zeros. They are non-resolving source-output witnesses for constitutive qualification and require action/equilibrium evidence when mechanically relevant. Continue mechanics work against the actionable remainder.',
  falsificationRule: 'A row may be dispositioned as non-resolving only if the raw L19 export stores exactly zero, the compared quantity is rotation, the solver magnitude is below 0.0001 deg, and the pinned export contains no stored nonzero rotation below that observed floor. Any violation returns the row to actionable status without changing the comparison gate.',
};

if (Object.values(output.gates).some((status) => status !== 'PASS')) {
  throw new Error(`L19 kinematic resolution disposition gate failure: ${JSON.stringify(output.gates)}`);
}
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 L19 kinematic resolution disposition: ${nonResolving.length} non-resolving / ${actionable.length} actionable of ${originalFailureCount} original failures`);

function unique(values) { return [...new Set(values)]; }
function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}`);
    result[key.slice(2)] = value;
  }
  return result;
}
