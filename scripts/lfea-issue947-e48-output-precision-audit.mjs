#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const CASE_ID = 19;
const E48_NODES = Object.freeze(['20760', '21720']);
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const RAW_FIELDS = Object.freeze(['DX', 'DY', 'DZ', 'RX', 'RY', 'RZ']);
const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;
const COMPONENT_LIMIT = 0.1;

const args = parseArgs(process.argv.slice(2));
if (!args.raw || !args.e48 || !args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e48-output-precision-audit.mjs --raw <raw-export.json> --e48 <e48-condensation.json> --package <canonical-package.json> [--out <json>]');
}
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
const e48 = JSON.parse(readFileSync(args.e48, 'utf8'));
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));

assert.equal(raw?.source?.sha256, EXPECTED_SOURCE_SHA256, 'Raw ACCDB SHA drift.');
assert.equal(e48?.sourceAccdbSha256, EXPECTED_SOURCE_SHA256, 'E48 audit ACCDB SHA drift.');
assert.equal(pkg?.source?.sha256, EXPECTED_SOURCE_SHA256, 'Canonical package ACCDB SHA drift.');
assert.equal(String(e48?.sourceElement?.sourceElementId), '48', 'Expected E48 condensation evidence.');
assert.equal(e48?.gates?.productionParity, 'PASS', 'E48 production parity prerequisite failed.');
assert.equal(e48?.gates?.referenceBoundaryUnrestrained, 'PASS', 'E48 boundary restraint custody prerequisite failed.');
const stiffness = e48?.diagnosticCondensedStiffnessGlobal12x12;
if (!Array.isArray(stiffness) || stiffness.length !== 144 || stiffness.some((value) => !Number.isFinite(Number(value)))) {
  throw new TypeError('E48 diagnostic condensed stiffness must contain 144 finite entries.');
}
const rawRows = raw?.tables?.OUTPUT_DISPLACEMENTS?.rows;
if (!Array.isArray(rawRows) || rawRows.length === 0) throw new TypeError('Raw OUTPUT_DISPLACEMENTS rows missing.');

const caseSummaries = [...new Set(rawRows.map((row) => Number(row.LCASE_NUM)))].sort((a, b) => a - b).map((caseId) => {
  const rows = rawRows.filter((row) => Number(row.LCASE_NUM) === caseId);
  const translationValues = rows.flatMap((row) => ['DX', 'DY', 'DZ'].map((field) => ({
    node: String(row.NODE), field, valueMm: Number(row[field]), magnitudeMm: Math.abs(Number(row[field])),
  }))).filter((entry) => Number.isFinite(entry.valueMm) && entry.magnitudeMm > 0).sort((a, b) => a.magnitudeMm - b.magnitudeMm);
  return {
    lcaseNum: caseId,
    caseName: String(rows[0]?.CASE ?? ''),
    rowCount: rows.length,
    minimumNonzeroTranslation: translationValues[0] ?? null,
    zeroTranslationComponentCount: rows.reduce((count, row) => count + ['DX', 'DY', 'DZ'].filter((field) => Number(row[field]) === 0).length, 0),
  };
});

const e48RawRows = E48_NODES.map((nodeId) => {
  const matches = rawRows.filter((row) => Number(row.LCASE_NUM) === CASE_ID && String(row.NODE) === nodeId);
  if (matches.length !== 1) throw new TypeError(`Expected one raw LCASE ${CASE_ID} row for node ${nodeId}; found ${matches.length}.`);
  return matches[0];
});
const dofPrecision = [];
const rawBoundarySi = [];
for (const row of e48RawRows) {
  for (let local = 0; local < 6; local += 1) {
    const field = RAW_FIELDS[local];
    const rawValue = Number(row[field]);
    if (!Number.isFinite(rawValue)) throw new TypeError(`Non-finite raw E48 ${row.NODE}:${field}.`);
    const unitScale = local < 3 ? MM_TO_M : DEG_TO_RAD;
    const f32 = Math.fround(rawValue);
    const exactlyFloat32 = Object.is(f32, rawValue) || f32 === rawValue;
    const ulpRaw = float32Ulp(rawValue);
    const halfUlpSi = ulpRaw * unitScale / 2;
    rawBoundarySi.push(rawValue * unitScale);
    dofPrecision.push({
      nodeId: String(row.NODE),
      dof: DOFS[local],
      rawField: field,
      rawValue,
      rawUnit: local < 3 ? 'mm' : 'deg',
      exactlyRepresentableAsFloat32: exactlyFloat32,
      float32UlpRaw: ulpRaw,
      halfUlpSi,
      siUnit: local < 3 ? 'm' : 'rad',
    });
  }
}

const caesarBoundary = e48.caesarInjection.boundaryDisplacement.map(Number);
const boundaryCustodyResidual = caesarBoundary.map((value, index) => value - rawBoundarySi[index]);
const halfUlp = dofPrecision.map((entry) => entry.halfUlpSi);
const actionQuantizationBound = new Array(12).fill(0).map((_unused, row) => {
  let sum = 0;
  for (let col = 0; col < 12; col += 1) sum += Math.abs(Number(stiffness[row * 12 + col])) * halfUlp[col];
  return sum;
});
const referenceAction = e48.caesarInjection.inferredSourceAction.map(Number);
const residual = e48.caesarInjection.residual.map(Number);
const scales = actionScales(referenceAction, pkg.profile.tolerances);
const normalizedQuantizationBound = actionQuantizationBound.map((value, index) => value / scales[index]);
const robustLowerBoundAbsNormalizedResidual = residual.map((value, index) =>
  Math.max(0, Math.abs(value) - actionQuantizationBound[index]) / scales[index]);
const robustFailures = robustLowerBoundAbsNormalizedResidual.map((value, index) => ({ component: actionLabel(index), lowerBound: value }))
  .filter((entry) => entry.lowerBound > COMPONENT_LIMIT);
const allBoundaryValuesExactFloat32 = dofPrecision.every((entry) => entry.exactlyRepresentableAsFloat32);
const boundarySiMatchesRawConversion = maxAbs(boundaryCustodyResidual) <= 1e-15;
const rawFailureCount = e48.caesarInjection.normalizedResidual.filter((value) => Math.abs(Number(value)) > COMPONENT_LIMIT).length;
const quantizationCanExplainAllRawFailures = rawFailureCount > 0 && robustFailures.length === 0;

const output = {
  schema: 'lfea-issue947-e48-output-precision-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceElementId: '48',
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'PINNED_OUTPUT_CUSTODY_AND_EXACT_FLOAT32_ULP_PROPAGATION_NO_MECHANICS_OR_REFERENCE_MUTATION',
  rawUnits: { translations: 'mm', rotations: 'deg' },
  caseSummaries,
  e48BoundaryPrecision: dofPrecision,
  boundaryCustody: {
    rawConvertedSi: rawBoundarySi,
    condensationAuditBoundarySi: caesarBoundary,
    residual: boundaryCustodyResidual,
    maxAbsResidual: maxAbs(boundaryCustodyResidual),
  },
  actionPropagation: {
    rule: 'delta_q_i <= sum_j |Kc_ij| * (0.5 ULP_j), using the exact condensed E48 production stiffness and the raw ACCDB float32 spacing of each nonzero boundary DOF.',
    actionQuantizationBound,
    normalizedActionQuantizationBound: normalizedQuantizationBound,
    rawNormalizedResidual: e48.caesarInjection.normalizedResidual,
    robustLowerBoundAbsNormalizedResidual,
    robustFailuresAboveExistingTenPercentGate: robustFailures,
  },
  gates: {
    rawBoundaryValuesExactlyRepresentableAsFloat32: allBoundaryValuesExactFloat32 ? 'PASS' : 'FAIL',
    condensationBoundaryKinematicsMatchRawUnitConversion: boundarySiMatchesRawConversion ? 'PASS' : 'FAIL',
    productionParity: e48.gates.productionParity,
    referenceBoundaryUnrestrained: e48.gates.referenceBoundaryUnrestrained,
  },
  classification: allBoundaryValuesExactFloat32 && boundarySiMatchesRawConversion && rawFailureCount > 0 && !quantizationCanExplainAllRawFailures
    ? 'E48_FLOAT32_OUTPUT_QUANTIZATION_FALSIFIED_AS_FULL_RESIDUAL_EXPLANATION'
    : quantizationCanExplainAllRawFailures
      ? 'E48_RESIDUAL_NON_RESOLVING_WITHIN_PINNED_FLOAT32_OUTPUT_PRECISION'
      : 'E48_OUTPUT_PRECISION_HYPOTHESIS_NOT_ESTABLISHED',
  falsificationRule: 'Do not attribute E48 source-action residuals to output precision unless half-ULP uncertainty from every raw boundary DOF, propagated through the exact condensed production stiffness, removes every component above the unchanged 10% comparison gate.',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 E48 output precision audit: ${output.classification}`);

function float32Ulp(value) {
  const f = Math.fround(value);
  if (!Number.isFinite(f)) throw new TypeError('float32Ulp requires a finite value.');
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, f, false);
  let bits = view.getUint32(0, false);
  if (f === 0) bits = 1;
  else if (f > 0) bits += 1;
  else bits -= 1;
  view.setUint32(0, bits, false);
  const next = view.getFloat32(0, false);
  return Math.abs(next - f);
}
function actionScales(reference, tolerances) {
  const floors = [
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_TO.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_TO.scaleFloor)),
  ];
  return reference.map((value, index) => Math.max(Math.abs(value), floors[index]));
}
function actionLabel(index) {
  const end = index < 6 ? 'FROM' : 'TO';
  const local = index % 6;
  const component = local < 3 ? ['FX', 'FY', 'FZ'][local] : ['MX', 'MY', 'MZ'][local - 3];
  return `${end}:${component}`;
}
function maxAbs(values) { return Math.max(...values.map((value) => Math.abs(Number(value)))); }
function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}
