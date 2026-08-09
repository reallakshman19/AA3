#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const SOURCE_ELEMENT_ID = '48';
const COMPONENT_LIMIT = 0.1;
const MM_TO_M = 1e-3;

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.e48 || !args.actual) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e48-near-tangent-reference-custody.mjs --package <canonical-package.json> --e48 <e48-condensation.json> --actual <bm4nl-actual.json> [--out <json>]');
}

const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
const e48 = JSON.parse(readFileSync(args.e48, 'utf8'));
const actual = JSON.parse(readFileSync(args.actual, 'utf8'));
assert.equal(pkg.source.sha256, EXPECTED_SOURCE_SHA256);
assert.equal(e48.sourceAccdbSha256, EXPECTED_SOURCE_SHA256);
assert.equal(actual.sourceAccdbSha256, EXPECTED_SOURCE_SHA256);
assert.equal(e48.caseId, 'L19');
assert.equal(String(e48.sourceElement.sourceElementId), SOURCE_ELEMENT_ID);
assert.ok(Array.isArray(e48.diagnosticCondensedStiffnessGlobal12x12));
assert.equal(e48.diagnosticCondensedStiffnessGlobal12x12.length, 144);
assert.equal(e48.productionParity.maxAbsResidual <= 1e-3, true);

const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const bendRows = pkg.model.tables.INPUT_BENDS.rows;
const source = requireSourceRow(sourceRows, SOURCE_ELEMENT_ID);
const outgoing = sourceRows.filter((row) => String(row.FROM_NODE) === String(source.TO_NODE));
assert.equal(outgoing.length, 1, 'E48 must have one leaving source element.');
const bend = bendRows.find((row) => Number(row.BEND_PTR) === Number(source.BEND_PTR));
if (!bend) throw new TypeError(`Missing BEND_PTR ${source.BEND_PTR}.`);

const start = sourceCoordinate(pkg, source.FROM_NODE);
const intersection = sourceCoordinate(pkg, source.TO_NODE);
const outletEnd = sourceCoordinate(pkg, outgoing[0].TO_NODE);
const incoming = unit(subtract(intersection, start));
const outgoingDirection = unit(subtract(outletEnd, intersection));
const bendAngle = Math.acos(clamp(dot(incoming, outgoingDirection), -1, 1));
const radiusM = Number(bend.RADIUS) * MM_TO_M;
const tangentLengthM = radiusM * Math.tan(bendAngle / 2);
const tangentStart = subtract(intersection, scale(incoming, tangentLengthM));
const rSourceToTangent = subtract(tangentStart, start);
const nearStraightLengthM = norm(rSourceToTangent);
const attachmentLengthM = radiusM * 0.01;

const K = e48.diagnosticCondensedStiffnessGlobal12x12;
const dReference = e48.caesarInjection.boundaryDisplacement;
const qReference = e48.caesarInjection.inferredSourceAction;
const qBaseline = e48.caesarInjection.condensedAction;
const scales = actionScaleVector(qReference, pkg.profile.tolerances);
const baseline = comparisonRecord(qBaseline, qReference, scales);

// H1: commercial E48 FROM kinematics/actions are referenced at the exact bend
// near tangent T while the production condenser boundary is the raw source
// point S. For rigid reference transfer u_T = u_S + theta x r_ST.
const h1Displacement = [...dReference];
const thetaFrom = dReference.slice(3, 6);
const thetaCrossR = cross(thetaFrom, rSourceToTangent);
for (let i = 0; i < 3; i += 1) h1Displacement[i] -= thetaCrossR[i];
const h1ReferenceAction = shiftFromEndAction(qReference, rSourceToTangent, +1);
const h1Action = add(qBaseline, multiplyFlat12(K, subtract(h1Displacement, dReference)));
const h1 = comparisonRecord(h1Action, h1ReferenceAction, actionScaleVector(h1ReferenceAction, pkg.profile.tolerances));

// Reverse direction is a sign-control falsifier, never a production candidate.
const h2Displacement = [...dReference];
for (let i = 0; i < 3; i += 1) h2Displacement[i] += thetaCrossR[i];
const h2ReferenceAction = shiftFromEndAction(qReference, rSourceToTangent, -1);
const h2Action = add(qBaseline, multiplyFlat12(K, subtract(h2Displacement, dReference)));
const h2 = comparisonRecord(h2Action, h2ReferenceAction, actionScaleVector(h2ReferenceAction, pkg.profile.tolerances));

const actualRows = actual.cases?.L19?.rows;
if (!Array.isArray(actualRows)) throw new TypeError('Authoritative actual lacks L19 rows.');
const boundaryNodes = [String(e48.sourceElement.fromNode), String(e48.sourceElement.toNode)];
const actualBoundary = boundaryDof(actualRows, boundaryNodes);
const observedProductionDelta = subtract(actualBoundary, dReference);
const predictedRigidTransferToSource = [
  -thetaCrossR[0], -thetaCrossR[1], -thetaCrossR[2], 0, 0, 0,
];
const translationAlignment = vectorAlignment(
  observedProductionDelta.slice(0, 3),
  predictedRigidTransferToSource.slice(0, 3),
);

const h1Passes = h1.maxAbsNormalizedResidual <= COMPONENT_LIMIT;
const h2Passes = h2.maxAbsNormalizedResidual <= COMPONENT_LIMIT;
const classification = h1Passes
  ? 'E48_NEAR_TANGENT_REFERENCE_POINT_CUSTODY_SUPPORTED_FOR_GEOMETRY_REPLAY_GATE'
  : h2Passes
    ? 'E48_NEAR_TANGENT_REFERENCE_DIRECTION_ASSUMPTION_FALSIFIED_REVERSE_SIGN_PASSES'
    : h1.normalizedResidualL2 < baseline.normalizedResidualL2
      ? 'E48_NEAR_TANGENT_REFERENCE_SHIFT_IMPROVES_BUT_DOES_NOT_CLOSE_ACTION_GATE'
      : 'E48_NEAR_TANGENT_REFERENCE_SHIFT_FALSIFIED_AS_ACTION_MISMATCH_EXPLANATION';

const output = {
  schema: 'lfea-issue947-e48-near-tangent-reference-custody/v1',
  issue: 947,
  caseId: 'L19',
  sourceElementId: SOURCE_ELEMENT_ID,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'REFERENCE_POINT_CUSTODY_FALSIFICATION_NO_PRODUCTION_UPDATE_NO_PARAMETER_FIT',
  sourceGeometry: {
    fromNode: String(source.FROM_NODE),
    tangentIntersectionNode: String(source.TO_NODE),
    leavingElementId: String(outgoing[0].ELEMENTID),
    bendPointer: Number(source.BEND_PTR),
    bendRadiusM: radiusM,
    bendAngleRadians: bendAngle,
    tangentLengthM,
    sourcePointM: start,
    tangentStartM: tangentStart,
    sourceToTangentVectorM: rSourceToTangent,
    nearStraightLengthM,
    onePercentRadiusM: attachmentLengthM,
    nearStraightAsPercentRadius: 100 * nearStraightLengthM / radiusM,
    bendLengthAttachmentScope: 'NOT_INVOKED_BY_THIS AUDIT; V14 DOCUMENTATION DEFINES THE CONFIGURED ATTACHMENT FOR THE ELEMENT LEAVING THE BEND, SO THIS NEAR-SIDE TEST IS ONLY REFERENCE-POINT CUSTODY.',
  },
  kinematicTransfer: {
    equation: 'u_T = u_S + theta x r_ST',
    thetaFromReferenceRad: thetaFrom,
    thetaCrossSourceToTangentM: thetaCrossR,
    predictedTangentToSourceTranslationCorrectionM: predictedRigidTransferToSource.slice(0, 3),
    authoritativeActualBoundaryDof: actualBoundary,
    commercialReferenceBoundaryDof: dReference,
    observedProductionMinusReferenceBoundaryDof: observedProductionDelta,
    fromTranslationAlignment: translationAlignment,
  },
  baseline,
  tangentReferenceToRawSource: h1,
  reverseSignControl: h2,
  gates: {
    productionCondensationParity: e48.productionParity.maxAbsResidual <= 1e-3 ? 'PASS' : 'FAIL',
    baselineReproduced: Math.abs(baseline.maxAbsNormalizedResidual - e48.caesarInjection.maxAbsNormalizedResidual) <= 1e-12 ? 'PASS' : 'FAIL',
    tangentReferenceTransformClosesExistingTenPercentGate: h1Passes ? 'PASS' : 'FAIL',
    reverseSignControlClosesExistingTenPercentGate: h2Passes ? 'PASS' : 'FAIL',
  },
  classification,
  disposition: h1Passes
    ? 'Diagnostic support only. A production geometry change still requires independent CAESAR geometry authority plus whole-model L19 replay with no new failures.'
    : 'Do not modify production geometry from this hypothesis. Retain raw source coordinates and continue E48 constitutive/source-boundary investigation.',
  falsificationRule: 'The reference-point hypothesis is not accepted unless the exact rigid transform, with no fitted distance or scale, closes every E48 source-action component inside the existing 10% gate using the exact production condensed stiffness. The offset is derived only from pinned source coordinates and BEND_PTR radius.',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 E48 near-tangent reference custody: ${classification}`);

function requireSourceRow(rows, id) {
  const matches = rows.filter((row) => String(row.ELEMENTID) === String(id));
  if (matches.length !== 1) throw new TypeError(`Expected one source E${id}; found ${matches.length}.`);
  return matches[0];
}

function sourceCoordinate(pkg, nodeId) {
  const rows = pkg.model.tables.INPUT_NODAL_COORDINATES.rows;
  const candidates = [];
  for (const row of rows) {
    if (String(row.FROM_NODE) === String(nodeId)) candidates.push([Number(row.FROM_NODE_X), Number(row.FROM_NODE_Y), Number(row.FROM_NODE_Z)]);
    if (String(row.TO_NODE) === String(nodeId)) candidates.push([Number(row.TO_NODE_X), Number(row.TO_NODE_Y), Number(row.TO_NODE_Z)]);
  }
  if (candidates.length === 0) throw new TypeError(`No coordinate for node ${nodeId}.`);
  const first = candidates[0];
  for (const candidate of candidates.slice(1)) assert.deepEqual(candidate, first);
  return first.map((value) => value * MM_TO_M);
}

function shiftFromEndAction(q, r, sign) {
  const result = [...q];
  const force = q.slice(0, 3);
  const momentShift = cross(r, force).map((value) => sign * value);
  for (let i = 0; i < 3; i += 1) result[3 + i] += momentShift[i];
  return result;
}

function boundaryDof(rows, nodes) {
  const components = [['DISPLACEMENT','UX'],['DISPLACEMENT','UY'],['DISPLACEMENT','UZ'],['ROTATION','RX'],['ROTATION','RY'],['ROTATION','RZ']];
  return nodes.flatMap((nodeId) => components.map(([quantity, component]) => {
    const matches = rows.filter((row) => row.entityKind === 'NODE' && String(row.entityId) === nodeId && row.quantity === quantity && row.component === component);
    if (matches.length !== 1) throw new TypeError(`Missing ${nodeId} ${quantity}:${component}.`);
    return Number(matches[0].value);
  }));
}

function comparisonRecord(action, reference, scales) {
  const residual = subtract(action, reference);
  const normalizedResidual = residual.map((value, index) => value / scales[index]);
  const abs = normalizedResidual.map(Math.abs);
  const max = Math.max(...abs);
  const index = abs.indexOf(max);
  return {
    action,
    referenceAction: reference,
    residual,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: max,
    governingComponent: actionLabel(index),
    statusAtExistingTenPercentGate: max <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
  };
}

function actionScaleVector(reference, tolerances) {
  return reference.map((value, index) => {
    const family = index % 6 < 3 ? 'FORCE' : 'MOMENT';
    const tolerance = tolerances[family];
    return Math.max(Math.abs(value), Number(tolerance.scaleFloor));
  });
}

function actionLabel(index) {
  const end = index < 6 ? 'FROM' : 'TO';
  const labels = ['FX','FY','FZ','MX','MY','MZ'];
  return `${end}:${labels[index % 6]}`;
}

function multiplyFlat12(matrix, vector) {
  const result = new Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 12; col += 1) result[row] += matrix[row * 12 + col] * vector[col];
  }
  return result;
}

function vectorAlignment(a, b) {
  const na = norm(a), nb = norm(b);
  return {
    observedNormM: na,
    predictedNormM: nb,
    cosine: na > 0 && nb > 0 ? dot(a, b) / (na * nb) : null,
  };
}

function add(a, b) { return a.map((value, index) => value + b[index]); }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function scale(a, factor) { return a.map((value) => value * factor); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function norm(a) { return Math.hypot(...a); }
function unit(a) { const n = norm(a); if (!(n > 0)) throw new TypeError('Degenerate vector.'); return scale(a, 1/n); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

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
