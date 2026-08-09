#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';
import {
  FRAME_LOCAL_AXIS_PROFILE,
  resolveFrameLocalAxes,
} from '../src/core/centerline-beam-fea/index.js';
import {
  condenseEndConditions,
  distributedLoadLocalVector,
  frameLocalStiffness,
  frameOffsetMatrix,
  frameTransformationMatrix,
  thermalInitialStrainVector,
  transformLoadToGlobal,
  transformStiffnessToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';
const KAPPA = 0.5;
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-tee20295-constitutive-audit.mjs --package <canonical-package.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.map((row) => [String(row.ELEMENTID), row]));
const refRows = pkg.references.L19.rows;
const coordinateIndex = sourceCoordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const displacementIndex = referenceDisplacementIndex(refRows);

const runIn = requireSourceRow(sourceRows, '17');
const runOut = requireSourceRow(sourceRows, '18');
const branch = requireSourceRow(sourceRows, '36');
const nextBranch = requireSourceRow(sourceRows, '37');
assert.equal(String(runIn.TO_NODE), '20295');
assert.equal(String(runOut.FROM_NODE), '20295');
assert.equal(String(branch.FROM_NODE), '20295');
assert.equal(String(branch.TO_NODE), '21430');
assert.equal(String(nextBranch.FROM_NODE), '21430');
assertNoNodalPrimitive(pkg, '20295');
assertNoNodalPrimitive(pkg, '21430');

const caesarReference = {
  from: negate(add6(referenceActionEnd(refRows, runIn, 'TO'), referenceActionEnd(refRows, runOut, 'FROM'))),
  to: negate(referenceActionEnd(refRows, nextBranch, 'FROM')),
};
const referenceGlobal = [...caesarReference.from, ...caesarReference.to];
const jointDisplacementGlobal = [
  ...referenceNodeDisplacement(displacementIndex, '20295'),
  ...referenceNodeDisplacement(displacementIndex, '21430'),
];

const runSection = section(runIn);
const branchSection = section(branch);
const E = Number(branch.MODULUS) * KPA_TO_PA;
const nu = Number(branch.POISSONS);
const G = E / (2 * (1 + nu));
const factorResult = calculateB31Factors({
  schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculationId: 'ISSUE947-TEE-20295-FACTORS',
  componentId: 'ISSUE947-TEE-20295',
  editionProfileId: FACTOR_PROFILE_ID,
  componentType: 'WELDING_TEE',
  geometry: {
    schema: COMPONENT_GEOMETRY_SCHEMA,
    componentType: 'WELDING_TEE',
    lengthUnit: 'm',
    runOuterDiameter: runSection.outerDiameter,
    runWallThickness: runSection.wallThickness,
    branchOuterDiameter: runSection.outerDiameter,
    branchWallThickness: branchSection.wallThickness,
    fittingQuality: 'UNVERIFIED',
    sourceEvidence: { sourceId: 'ACCDB:INPUT_SIFTEES:TYPE3:NODE:20295', sourceRevision: pkg.source.sha256 },
  },
  momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
  semanticHash: '',
});
assert.equal(factorResult.status, 'QUALIFIED');
const branchFactor = factorResult.factors.flexibility.branch.inPlane;
assert.ok(branchFactor > 1);
const branchSpring = E * branchSection.secondMoment / (branchFactor * branchSection.outerDiameter);

const junction = requireCoordinate(coordinateIndex, '20295');
const far = requireCoordinate(coordinateIndex, '21430');
const runOther = requireCoordinate(coordinateIndex, String(runIn.FROM_NODE));
const branchDirection = unit(subtract(far, junction));
const runDirection = unit(subtract(runOther, junction));
const planeNormal = unit(cross(runDirection, branchDirection));
const rigidOffset = scale(branchDirection, runSection.outerDiameter / 2);
const surface = add3(junction, rigidOffset);

const variants = {
  CURRENT_B31J_SURFACE_SPRING: evaluate({ surfaceOffset: true, spring: true }),
  SURFACE_RIGID_NO_SPRING: evaluate({ surfaceOffset: true, spring: false }),
  CENTERLINE_SPRING_NO_OFFSET: evaluate({ surfaceOffset: false, spring: true }),
  PLAIN_CENTERLINE: evaluate({ surfaceOffset: false, spring: false }),
};

const output = {
  schema: 'lfea-issue947-tee20295-constitutive-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  junctionNode: '20295',
  branchSourceElementId: '36',
  inferredCaesarSourceAction: {
    rule: 'q_E36_FROM=-(q_E17_TO+q_E18_FROM), q_E36_TO=-q_E37_FROM; nodes 20295 and 21430 have no restraint or concentrated nodal load',
    fromGlobal: caesarReference.from,
    toGlobal: caesarReference.to,
  },
  b31jAuthority: {
    factorProfileId: FACTOR_PROFILE_ID,
    branchInPlaneFlexibility: branchFactor,
    springRule: 'K=EI/(k*d)',
    springStiffnessNmPerRad: branchSpring,
    fittingQuality: 'UNVERIFIED',
    branchSurfaceOffsetM: rigidOffset,
  },
  frameAuthority: {
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearCorrectionFactorY: KAPPA,
    shearCorrectionFactorZ: KAPPA,
  },
  referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_UPDATE_RULE',
  variants,
  conclusion: rank(variants),
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('Issue 947 tee 20295 constitutive audit PASS');

function evaluate({ surfaceOffset, spring }) {
  const pointI = surfaceOffset ? surface : junction;
  const pointJ = far;
  const axesResult = resolveFrameLocalAxes({
    nodeI: pointI,
    nodeJ: pointJ,
    referenceVector: planeNormal,
    profile: FRAME_LOCAL_AXIS_PROFILE,
  });
  const length = axesResult.elementDirection.length;
  const localK = frameLocalStiffness({
    elasticModulus: E,
    shearModulus: G,
    area: branchSection.area,
    secondMomentY: branchSection.secondMoment,
    secondMomentZ: branchSection.secondMoment,
    polarMoment: branchSection.polarMoment,
    length,
    shearDeformation: true,
    shearCorrectionFactorY: KAPPA,
    shearCorrectionFactorZ: KAPPA,
  });
  const lineWeight = physicalLineWeight(branch, branchSection, pkg.profile.linearSolve.gravityAcceleration);
  const equivalentLocalBase = distributedLoadLocalVector({
    primitive: {
      kind: 'DISTRIBUTED_LOAD', basis: 'GLOBAL',
      startIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
      endIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
    },
    axes: axesResult.axes,
    length,
    phiXY: localK.phiXY,
    phiXZ: localK.phiXZ,
  });
  const epsilonP = closedEndPressureAxialStrain(branch, E);
  const initialLocalBase = thermalInitialStrainVector({
    elasticModulus: E,
    area: branchSection.area,
    axialStrain: epsilonP,
  });
  const condensed = spring
    ? condenseEndConditions(
        localK.matrix,
        [equivalentLocalBase, initialLocalBase],
        [{ index: 4, stiffness: branchSpring }],
        1e-12,
      )
    : { matrix: localK.matrix, vectors: [equivalentLocalBase, initialLocalBase] };
  const T = frameTransformationMatrix(axesResult.axes);
  let Kglobal = transformStiffnessToGlobal(condensed.matrix, T);
  let equivalentGlobal = transformLoadToGlobal(condensed.vectors[0], T);
  let initialGlobal = transformLoadToGlobal(condensed.vectors[1], T);
  if (surfaceOffset) {
    const R = frameOffsetMatrix({ I: rigidOffset, J: null });
    Kglobal = transformStiffnessToGlobal(Kglobal, R);
    equivalentGlobal = transformLoadToGlobal(equivalentGlobal, R);
    initialGlobal = transformLoadToGlobal(initialGlobal, R);
  }
  const actionGlobal = multiply12(Kglobal, jointDisplacementGlobal)
    .map((value, index) => value - equivalentGlobal[index] - initialGlobal[index]);
  const residualGlobal = actionGlobal.map((value, index) => value - referenceGlobal[index]);
  const normalizedResidual = normalizeResidual(residualGlobal, referenceGlobal, pkg.profile.tolerances);
  const maxIndex = argmax(normalizedResidual.map(Math.abs));
  return {
    surfaceOffset,
    spring,
    physicalBeamLengthM: length,
    phiXY: localK.phiXY,
    phiXZ: localK.phiXZ,
    actionGlobal,
    residualGlobal,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: Math.abs(normalizedResidual[maxIndex]),
    governingResidualDof: actionDofLabel(maxIndex),
  };
}

function rank(variants) {
  return Object.entries(variants)
    .map(([name, value]) => ({ name, normalizedResidualL2: value.normalizedResidualL2, maxAbsNormalizedResidual: value.maxAbsNormalizedResidual }))
    .sort((a, b) => a.normalizedResidualL2 - b.normalizedResidualL2);
}
function referenceActionEnd(rows, row, end) {
  const entityId = sourceResultElementId(row);
  const out = [];
  for (const component of FORCE_COMPONENTS) out.push(requireReference(rows, entityId, `GLOBAL_END_FORCE_${end}`, component));
  for (const component of MOMENT_COMPONENTS) out.push(requireReference(rows, entityId, `GLOBAL_END_MOMENT_${end}`, component));
  return out;
}
function requireReference(rows, entityId, quantity, component) {
  const match = rows.find((row) => row.entityKind === 'ELEMENT' && row.entityId === entityId && row.quantity === quantity && row.component === component);
  if (!match) throw new TypeError(`Missing CAESAR reference ${entityId} ${quantity} ${component}.`);
  return Number(match.value);
}
function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}|${String(row.ELEMENT_NAME ?? '').trim()}`;
}
function referenceDisplacementIndex(rows) {
  return new Map(rows.filter((row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity))
    .map((row) => [`${row.entityId}:${row.component}`, Number(row.value)]));
}
function referenceNodeDisplacement(index, nodeId) {
  return DOFS.map((dof) => {
    const value = index.get(`${nodeId}:${dof}`);
    if (!Number.isFinite(value)) throw new TypeError(`Missing CAESAR displacement ${nodeId}:${dof}.`);
    return value;
  });
}
function assertNoNodalPrimitive(pkg, nodeId) {
  const restraints = pkg.model.tables.INPUT_RESTRAINTS.rows.filter((row) => String(row.NODE_NUM) === nodeId);
  assert.equal(restraints.length, 0, `Node ${nodeId} unexpectedly has a restraint.`);
  const forcmnt = pkg.model.tables.INPUT_FORCMNT.rows.filter((row) => [row.NODE, row.NODE_NUM, row.FROM_NODE, row.TO_NODE].some((value) => String(value) === nodeId));
  assert.equal(forcmnt.length, 0, `Node ${nodeId} unexpectedly has a concentrated force/moment primitive.`);
}
function section(row) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return { outerDiameter, wallThickness, innerDiameter, area, secondMoment, polarMoment: 2 * secondMoment };
}
function physicalLineWeight(row, sec, g) {
  const pipe = density(row.PIPE_DENSITY) * sec.area * g;
  const contents = density(row.FLUID_DENSITY) * (Math.PI * sec.innerDiameter ** 2 / 4) * g;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOd = sec.outerDiameter + 2 * insulationThickness;
  const insulation = density(row.INSUL_DENSITY) * (Math.PI * (insulatedOd ** 2 - sec.outerDiameter ** 2) / 4) * g;
  return pipe + contents + insulation;
}
function closedEndPressureAxialStrain(row, E) {
  const sec = section(row);
  const p = Number(row.PRESSURE1) * KPA_TO_PA;
  const nu = Number(row.POISSONS);
  return (1 - 2 * nu) * p * sec.innerDiameter ** 2 / (E * (sec.outerDiameter ** 2 - sec.innerDiameter ** 2));
}
function normalizeResidual(residual, reference, tolerances) {
  const floors = [
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_FROM.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_TO.scaleFloor)),
    ...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_TO.scaleFloor)),
  ];
  return residual.map((value, index) => value / Math.max(Math.abs(reference[index]), floors[index]));
}
function actionDofLabel(index) {
  const end = index < 6 ? 'FROM' : 'TO';
  const local = index % 6;
  const component = local < 3 ? FORCE_COMPONENTS[local] : MOMENT_COMPONENTS[local - 3];
  return `${end}:${component}`;
}
function sourceCoordinateIndex(rows) {
  const out = new Map();
  for (const row of rows) {
    setCoordinate(out, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]);
    setCoordinate(out, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]);
  }
  return out;
}
function setCoordinate(index, nodeId, mm) {
  const point = mm.map((value) => Number(value) * MM_TO_M);
  const id = String(nodeId);
  const prior = index.get(id);
  if (prior) assert.ok(norm(subtract(prior, point)) <= 1e-9, `Inconsistent coordinate for ${id}.`);
  index.set(id, point);
}
function requireCoordinate(index, nodeId) { const point = index.get(String(nodeId)); if (!point) throw new TypeError(`Missing coordinate ${nodeId}.`); return point; }
function requireSourceRow(index, id) { const row = index.get(String(id)); if (!row) throw new TypeError(`Missing source element ${id}.`); return row; }
function multiply12(matrix, vector) {
  return new Array(12).fill(0).map((_unused, row) => {
    let sum = 0;
    for (let col = 0; col < 12; col += 1) sum += matrix[row * 12 + col] * vector[col];
    return sum;
  });
}
function argmax(values) { let best = 0; for (let i = 1; i < values.length; i += 1) if (values[i] > values[best]) best = i; return best; }
function density(value) { const n = Number(value); return n > 0 ? n * KG_PER_CM3_TO_KG_PER_M3 : 0; }
function add6(a, b) { return a.map((value, index) => value + b[index]); }
function negate(a) { return a.map((value) => -value); }
function add3(a, b) { return a.map((value, index) => value + b[index]); }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function scale(a, factor) { return a.map((value) => value * factor); }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function norm(a) { return Math.hypot(...a); }
function unit(a) { const n = norm(a); if (!(n > 0)) throw new TypeError('Degenerate vector.'); return scale(a, 1/n); }
function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical ACCDB package required.');
  if (String(value.source?.sha256).toLowerCase() !== EXPECTED_SOURCE_SHA256) throw new TypeError(`Expected source SHA-256 ${EXPECTED_SOURCE_SHA256}.`);
  assert.equal(value.cases.find((entry) => entry.caseId === 'L19')?.formula, 'W+P1');
}
function parseArgs(tokens) {
  const out = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const name = token.slice(2); const value = tokens[i+1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for --${name}.`);
    out[name] = value; i += 1;
  }
  return out;
}
