#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);
const FORCE_CLOSURE_TOLERANCE_N = 0.02;
const MOMENT_CLOSURE_TOLERANCE_NM = 0.01;

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError(
    'Usage: node scripts/lfea-issue947-e36-bend-aware-equilibrium-audit.mjs '
    + '--package <canonical-package.json> [--out <json>]',
  );
}

const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
assert.equal(pkg.cases.find((entry) => entry.caseId === 'L19')?.formula, 'W+P1');

const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
  .map((row) => [String(row.ELEMENTID), row]));
const bendRows = new Map(pkg.model.tables.INPUT_BENDS.rows
  .map((row) => [Number(row.BEND_PTR), row]));
const coordinates = sourceCoordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const refRows = pkg.references.L19.rows;

const runIn = requireSourceRow(sourceRows, '17');
const runOut = requireSourceRow(sourceRows, '18');
const branchBend = requireSourceRow(sourceRows, '36');
const branchOut = requireSourceRow(sourceRows, '37');

assert.equal(String(runIn.TO_NODE), '20295');
assert.equal(String(runOut.FROM_NODE), '20295');
assert.equal(String(branchBend.FROM_NODE), '20295');
assert.equal(String(branchBend.TO_NODE), '21430');
assert.equal(String(branchOut.FROM_NODE), '21430');
assert.ok(Number(branchBend.BEND_PTR) > 0, 'E36 must remain a bend-carrying source element.');

const bend = bendRows.get(Number(branchBend.BEND_PTR));
if (!bend) throw new TypeError(`Missing bend declaration ${branchBend.BEND_PTR}.`);

const inferredReference = {
  from: negate(add6(referenceActionEnd(refRows, runIn, 'TO'), referenceActionEnd(refRows, runOut, 'FROM'))),
  to: negate(referenceActionEnd(refRows, branchOut, 'FROM')),
};

const junction = requireCoordinate(coordinates, '20295');
const intersection = requireCoordinate(coordinates, '21430');
const outletEnd = requireCoordinate(coordinates, String(branchOut.TO_NODE));
const incomingDirection = unit(subtract(intersection, junction));
const outgoingDirection = unit(subtract(outletEnd, intersection));
const bendAngle = Math.acos(clamp(dot(incomingDirection, outgoingDirection), -1, 1));
const bendRadius = Number(bend.RADIUS) * MM_TO_M;
const tangentLength = bendRadius * Math.tan(bendAngle / 2);
const tangentStart = subtract(intersection, scale(incomingDirection, tangentLength));
const tangentEnd = add3(intersection, scale(outgoingDirection, tangentLength));

const runOuterDiameter = Number(runIn.DIAMETER) * MM_TO_M;
const branchSurfaceOffset = scale(incomingDirection, runOuterDiameter / 2);
const branchSurface = add3(junction, branchSurfaceOffset);
const incomingStraightLength = distance(branchSurface, tangentStart);
const bendArcLength = bendRadius * bendAngle;
const physicalLoadedLength = incomingStraightLength + bendArcLength;
const legacyStraightAuditLength = distance(branchSurface, intersection);

const sec = section(branchBend);
const lineWeight = physicalLineWeight(
  branchBend,
  sec,
  pkg.profile.linearSolve.gravityAcceleration,
);
const expectedWeight = lineWeight * physicalLoadedLength;
const legacyStraightAuditWeight = lineWeight * legacyStraightAuditLength;

const endForceResultant = add3(inferredReference.from.slice(0, 3), inferredReference.to.slice(0, 3));
const forceClosure = [
  endForceResultant[0],
  endForceResultant[1] - expectedWeight,
  endForceResultant[2],
];

// End actions are forces/moments exerted by the element on its boundary nodes.
// Therefore q_I + q_J + F_external = 0.  About source node 20295 the straight
// branch portion contributes no gravity moment because its x/z offsets are zero.
// For the 90-degree bend arc, x(s)=R(1-cos(theta)), ds=R dtheta, hence
// integral(x ds)=R^2(theta-sin(theta)).  Global gravity is -Y, so Mz_external
// is -w * integral(x ds).
const endMomentAboutJunction = add3(
  add3(inferredReference.from.slice(3, 6), inferredReference.to.slice(3, 6)),
  cross(subtract(tangentEnd, junction), inferredReference.to.slice(0, 3)),
);
const gravityMomentAboutJunction = [
  0,
  0,
  -lineWeight * bendRadius ** 2 * (bendAngle - Math.sin(bendAngle)),
];
const momentClosure = add3(endMomentAboutJunction, gravityMomentAboutJunction);

assert.ok(
  Math.max(...forceClosure.map(Math.abs)) <= FORCE_CLOSURE_TOLERANCE_N,
  `E36 bend-aware force equilibrium does not close: ${JSON.stringify(forceClosure)} N.`,
);
assert.ok(
  Math.max(...momentClosure.map(Math.abs)) <= MOMENT_CLOSURE_TOLERANCE_NM,
  `E36 bend-aware moment equilibrium does not close: ${JSON.stringify(momentClosure)} N*m.`,
);
assert.ok(
  Math.abs(endForceResultant[1] - legacyStraightAuditWeight) > 50,
  'The legacy one-straight-span diagnostic unexpectedly reproduces E36 gravity equilibrium.',
);

const E = Number(branchBend.MODULUS) * KPA_TO_PA;
const pressureAxialStrain = closedEndPressureAxialStrain(branchBend, E);
const incomingStraightPressureFreeGrowth = pressureAxialStrain * incomingStraightLength;

const output = {
  schema: 'lfea-issue947-e36-bend-aware-equilibrium-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  sourceElementId: '36',
  bendPointer: Number(branchBend.BEND_PTR),
  referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_UPDATE_RULE',
  geometry: {
    junctionNode: '20295',
    sourceToNode: '21430',
    outgoingSourceElementId: '37',
    bendAngleRadians: bendAngle,
    bendAngleDegrees: bendAngle * 180 / Math.PI,
    bendRadiusM: bendRadius,
    tangentLengthM: tangentLength,
    tangentStartM: tangentStart,
    tangentEndM: tangentEnd,
    branchSurfaceOffsetM: branchSurfaceOffset,
    branchSurfaceM: branchSurface,
    incomingStraightLengthM: incomingStraightLength,
    bendArcLengthM: bendArcLength,
    physicalLoadedLengthM: physicalLoadedLength,
    legacyStraightAuditLengthM: legacyStraightAuditLength,
  },
  loadAuthority: {
    gravityAccelerationMPerS2: pkg.profile.linearSolve.gravityAcceleration,
    lineWeightNPerM: lineWeight,
    expectedPhysicalWeightN: expectedWeight,
    legacyStraightAuditWeightN: legacyStraightAuditWeight,
    pressureAxialStrain,
    incomingStraightPressureFreeGrowthM: incomingStraightPressureFreeGrowth,
  },
  inferredCaesarSourceAction: {
    rule: 'q_E36_FROM=-(q_E17_TO+q_E18_FROM); q_E36_TO=-q_E37_FROM; L19=W+P1 and nodes 20295/21430 carry no active nodal force term',
    fromGlobal: inferredReference.from,
    toGlobal: inferredReference.to,
  },
  equilibrium: {
    endForceResultantN: endForceResultant,
    forceClosureN: forceClosure,
    endMomentAboutJunctionNm: endMomentAboutJunction,
    gravityMomentAboutJunctionNm: gravityMomentAboutJunction,
    momentClosureNm: momentClosure,
    forceClosureToleranceN: FORCE_CLOSURE_TOLERANCE_N,
    momentClosureToleranceNm: MOMENT_CLOSURE_TOLERANCE_NM,
  },
  falsification: {
    hypothesis: 'E36 may be treated as one straight branch span from the tee surface to source node 21430 for the injected-displacement tee audit.',
    result: 'FALSIFIED',
    reason: 'E36 carries a 90-degree bend. The one-straight-span model misses the bend arc/tangent geometry and underpredicts the gravity resultant by more than 50 N, while the bend-aware geometry closes CAESAR force and moment equilibrium to the declared tight diagnostic tolerances.',
    legacyWeightMismatchN: endForceResultant[1] - legacyStraightAuditWeight,
  },
  nextGate: 'STATIC_CONDENSE_PRODUCTION_E36_DESCENDANTS_TO_SOURCE_20295_21430_AND_INJECT_CAESAR_SOURCE_DOF',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('Issue 947 E36 bend-aware equilibrium audit PASS');

function referenceActionEnd(rows, row, end) {
  const entityId = sourceResultElementId(row);
  const out = [];
  for (const component of FORCE_COMPONENTS) {
    out.push(requireReference(rows, entityId, `GLOBAL_END_FORCE_${end}`, component));
  }
  for (const component of MOMENT_COMPONENTS) {
    out.push(requireReference(rows, entityId, `GLOBAL_END_MOMENT_${end}`, component));
  }
  return out;
}
function requireReference(rows, entityId, quantity, component) {
  const match = rows.find((row) => row.entityKind === 'ELEMENT'
    && row.entityId === entityId
    && row.quantity === quantity
    && row.component === component);
  if (!match) throw new TypeError(`Missing reference ${entityId} ${quantity} ${component}.`);
  return Number(match.value);
}
function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}
function sourceCoordinateIndex(rows) {
  const result = new Map();
  for (const row of rows) {
    setCoordinate(result, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]);
    setCoordinate(result, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]);
  }
  return result;
}
function setCoordinate(index, nodeId, millimetres) {
  const id = String(nodeId);
  const point = millimetres.map((value) => Number(value) * MM_TO_M);
  const prior = index.get(id);
  if (prior && distance(prior, point) > 1e-9) {
    throw new TypeError(`Node ${id} has inconsistent source coordinates.`);
  }
  index.set(id, point);
}
function requireCoordinate(index, nodeId) {
  const value = index.get(String(nodeId));
  if (!value) throw new TypeError(`Missing source coordinate ${nodeId}.`);
  return value;
}
function requireSourceRow(index, elementId) {
  const value = index.get(String(elementId));
  if (!value) throw new TypeError(`Missing source element ${elementId}.`);
  return value;
}
function section(row) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  return { outerDiameter, wallThickness, innerDiameter, area };
}
function physicalLineWeight(row, sec, gravityAcceleration) {
  const pipe = density(row.PIPE_DENSITY) * sec.area * gravityAcceleration;
  const contentsArea = Math.PI * sec.innerDiameter ** 2 / 4;
  const contents = density(row.FLUID_DENSITY) * contentsArea * gravityAcceleration;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOd = sec.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOd ** 2 - sec.outerDiameter ** 2) / 4;
  const insulation = density(row.INSUL_DENSITY) * insulationArea * gravityAcceleration;
  return pipe + contents + insulation;
}
function closedEndPressureAxialStrain(row, elasticModulus) {
  const sec = section(row);
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return (1 - 2 * poissonRatio) * pressure * sec.innerDiameter ** 2
    / (elasticModulus * (sec.outerDiameter ** 2 - sec.innerDiameter ** 2));
}
function density(value) { return Number(value) * KG_PER_CM3_TO_KG_PER_M3; }
function negate(vector) { return vector.map((value) => -value); }
function add6(left, right) { return left.map((value, index) => value + right[index]); }
function add3(left, right) { return left.map((value, index) => value + right[index]); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function scale(vector, factor) { return vector.map((value) => value * factor); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
function norm(vector) { return Math.hypot(...vector); }
function unit(vector) {
  const length = norm(vector);
  if (!(length > 0)) throw new TypeError('Cannot normalize a zero vector.');
  return scale(vector, 1 / length);
}
function distance(left, right) { return norm(subtract(left, right)); }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function requirePinnedPackage(pkg) {
  assert.equal(pkg.benchmarkId, 'BM4_NL');
  assert.equal(pkg.source.sha256, EXPECTED_SOURCE_SHA256);
  assert.ok(pkg.profile?.linearSolve, 'Pinned package has no linearSolve profile.');
  assert.ok(pkg.references?.L19?.rows, 'Pinned package has no L19 reference rows.');
}
function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new TypeError(`Missing value for ${token}.`);
    result[key] = value;
    index += 1;
  }
  return result;
}
