#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const OBSERVED_RESOLUTION_FLOOR_DEG = 1e-4;
const RAD_TO_DEG = 180 / Math.PI;
const ROTATIONS = Object.freeze(['RX', 'RY', 'RZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.raw || !args.reconstruction) {
  throw new TypeError('Usage: node scripts/lfea-issue947-rotation-output-resolution-audit.mjs --raw <raw-export.json> --reconstruction <two-sided.json> [--out <json>]');
}
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
const reconstruction = JSON.parse(readFileSync(args.reconstruction, 'utf8'));

assert.equal(raw?.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB source SHA drift.');
assert.equal(reconstruction?.sourceAccdbSha256, EXPECTED_SOURCE_SHA256, 'Reconstruction source SHA drift.');
const rows = raw?.tables?.OUTPUT_DISPLACEMENTS?.rows;
if (!Array.isArray(rows) || rows.length === 0) throw new TypeError('OUTPUT_DISPLACEMENTS rows missing.');

const byCase = new Map();
for (const row of rows) {
  const key = String(row.LCASE_NUM);
  if (!byCase.has(key)) byCase.set(key, { caseName: String(row.CASE), nonzero: [], zeroCount: 0 });
  const bucket = byCase.get(key);
  for (const component of ROTATIONS) {
    const value = Number(row[component]);
    if (!Number.isFinite(value)) throw new TypeError(`Non-finite ${component} in LCASE ${key}.`);
    const magnitude = Math.abs(value);
    if (magnitude === 0) bucket.zeroCount += 1;
    else bucket.nonzero.push({ node: String(row.NODE), component, magnitudeDeg: magnitude, signedDeg: value });
  }
}

const cases = [...byCase.entries()].map(([lcaseNum, bucket]) => {
  bucket.nonzero.sort((a, b) => a.magnitudeDeg - b.magnitudeDeg);
  const minimum = bucket.nonzero[0] ?? null;
  return {
    lcaseNum: Number(lcaseNum),
    caseName: bucket.caseName,
    zeroRotationComponentCount: bucket.zeroCount,
    nonzeroRotationComponentCount: bucket.nonzero.length,
    minimumNonzero: minimum,
    countBelowObservedFloor: bucket.nonzero.filter((entry) => entry.magnitudeDeg < OBSERVED_RESOLUTION_FLOOR_DEG).length,
  };
}).sort((a, b) => a.lcaseNum - b.lcaseNum);

const node22130 = rows.filter((row) => String(row.NODE) === '22130')
  .map((row) => ({ lcaseNum: Number(row.LCASE_NUM), caseName: String(row.CASE), rzDeg: Number(row.RZ) }))
  .sort((a, b) => a.lcaseNum - b.lcaseNum);
const node22125L19 = rows.find((row) => Number(row.LCASE_NUM) === 19 && String(row.NODE) === '22125');
if (!node22125L19) throw new TypeError('LCASE 19 node 22125 row missing.');

const inferred = {
  E79: Number(reconstruction?.inference?.E79?.inferredDof),
  E80: Number(reconstruction?.inference?.E80?.inferredDof),
};
for (const [label, value] of Object.entries(inferred)) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} inferred RZ missing.`);
}
const inferredDeg = {
  E79: inferred.E79 * RAD_TO_DEG,
  E80: inferred.E80 * RAD_TO_DEG,
};

const noStoredNonzeroBelowFloor = cases.every((entry) => entry.countBelowObservedFloor === 0);
const bothReconstructionsBelowFloor = Object.values(inferredDeg).every((value) => Math.abs(value) < OBSERVED_RESOLUTION_FLOOR_DEG);
const l19Node22130Zero = node22130.some((entry) => entry.lcaseNum === 19 && entry.rzDeg === 0);
const adjacentNodeJustAboveFloor = Math.abs(Number(node22125L19.RZ)) >= OBSERVED_RESOLUTION_FLOOR_DEG;

const output = {
  schema: 'lfea-issue947-rotation-output-resolution-audit/v1',
  issue: 947,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'SOURCE_CUSTODY_ONLY_NO_MECHANICS_OR_REFERENCE_MUTATION',
  observedResolutionFloorDeg: OBSERVED_RESOLUTION_FLOOR_DEG,
  scopeStatement: 'This classifies only the pinned BM4_NL ACCDB export. It does not claim a universal CAESAR II output rule.',
  cases,
  node22130,
  l19AdjacentWitness: {
    node22125RzDeg: Number(node22125L19.RZ),
    node22130ExportedRzDeg: node22130.find((entry) => entry.lcaseNum === 19)?.rzDeg ?? null,
    inferredRzDeg: inferredDeg,
  },
  gates: {
    noStoredNonzeroRotationBelowObservedFloor: noStoredNonzeroBelowFloor ? 'PASS' : 'FAIL',
    bothIndependentNode22130ReconstructionsBelowObservedFloor: bothReconstructionsBelowFloor ? 'PASS' : 'FAIL',
    l19Node22130StoredExactlyZero: l19Node22130Zero ? 'PASS' : 'FAIL',
    adjacentL19Node22125StoredAboveObservedFloor: adjacentNodeJustAboveFloor ? 'PASS' : 'FAIL',
  },
  classification: noStoredNonzeroBelowFloor && bothReconstructionsBelowFloor && l19Node22130Zero && adjacentNodeJustAboveFloor
    ? 'PINNED_ACCDB_SUB_0_0001_DEG_ROTATION_IS_NOT_RESOLVABLE_AS_A_NONZERO_OUTPUT_WITNESS'
    : 'ROTATION_OUTPUT_SUPPRESSION_HYPOTHESIS_NOT_ESTABLISHED',
  falsificationRule: 'Falsify this pinned-export suppression hypothesis if any stored nonzero rotation component is below 0.0001 deg, if either independent node-22130 reconstruction is not below that floor, if L19 node 22130 is not exactly zero, or if the adjacent node-22125 witness is not stored above the floor.',
  qualificationUse: 'Do not overwrite CAESAR source data. Treat a zero rotation below the demonstrated export-resolution floor as non-resolving for injected-displacement constitutive qualification; retain the raw zero as source evidence and require independent action/equilibrium reconstruction when that DOF matters.',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 rotation output resolution audit: ${output.classification}`);

function parseArgs(argv) {
  const result = { raw: null, reconstruction: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--raw') result.raw = value;
    else if (key === '--reconstruction') result.reconstruction = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
