#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  distributedLoadLocalVector,
  frameLocalStiffness,
  frameTransformationMatrix,
  thermalInitialStrainVector,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import {
  FRAME_LOCAL_AXIS_PROFILE,
  resolveFrameLocalAxes,
} from '../src/core/centerline-beam-fea/index.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const COWPER_THIN_ANNULUS_KAPPA = 0.53;
const COWPER_SOURCE = 'COWPER-1966-THIN-ANNULUS-INPUT';
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError(
    'Usage: node scripts/lfea-issue947-element-constitutive-audit.mjs --package <canonical-package.json> [--out <audit.json>] [--elements 3,4]',
  );
}

const benchmarkPackage = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(benchmarkPackage);
const sourceIds = String(args.elements ?? '3,4')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (sourceIds.length === 0) throw new TypeError('--elements must select at least one source element.');

const sourceRows = new Map(benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
  .map((row) => [String(row.ELEMENTID), row]));
const coordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);
const referenceRows = benchmarkPackage.references.L19?.rows;
if (!Array.isArray(referenceRows)) throw new TypeError('Pinned package does not contain L19 reference rows.');
const displacementIndex = referenceDisplacementIndex(referenceRows);
const toleranceProfile = benchmarkPackage.profile.tolerances;

const elements = sourceIds.map((sourceElementId) => {
  const row = sourceRows.get(sourceElementId);
  if (!row) throw new TypeError(`Source element ${sourceElementId} is absent from INPUT_BASIC_ELEMENT_DATA.`);
  if (Number(row.BEND_PTR) > 0 || Number(row.RIGID_PTR) > 0 || Number(row.REDUCER_PTR) > 0) {
    throw new TypeError(
      `Source element ${sourceElementId} is not a plain frame; this audit deliberately isolates the base straight-pipe constitutive law first.`,
    );
  }
  return auditPlainSourceElement({
    benchmarkPackage,
    row,
    coordinates,
    displacementIndex,
    referenceRows,
    toleranceProfile,
  });
});

/*
 * Falsification rule, not a fit: kappa=0.53 is fixed before reading any CAESAR
 * result and is the same Cowper thin-annulus input already used by the governed
 * B-3.1 FRAME-SHEAR-01 closed-form test. The CAESAR rows are used only to ask
 * whether that independently selected constitutive law removes the observed
 * element residual. No kappa is searched, optimized or inferred here.
 */
for (const element of elements) {
  assert.ok(
    element.timoshenko.normalizedResidualL2 < 0.1 * element.eulerBernoulli.normalizedResidualL2,
    `Element ${element.sourceElementId}: fixed Cowper Timoshenko law did not reduce the CAESAR-displacement constitutive residual by one order of magnitude.`,
  );
}

const output = {
  schema: 'lfea-issue947-element-constitutive-audit/v1',
  issue: 947,
  sourceAccdbSha256: benchmarkPackage.source.sha256,
  caseId: 'L19',
  method: 'CAESAR_NODAL_DISPLACEMENT_INJECTED_INTO_LFEA_ELEMENT_LAW_V1',
  governingEquation: 'q_global = T^T [K_local (T d_global) - f_equivalent_local - f_initial_local]',
  referenceUsage: 'DIAGNOSTIC_ONLY_NO_UPDATE_RULE_NO_PARAMETER_FIT',
  candidateShearAuthority: {
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearCorrectionFactorY: COWPER_THIN_ANNULUS_KAPPA,
    shearCorrectionFactorZ: COWPER_THIN_ANNULUS_KAPPA,
    source: COWPER_SOURCE,
    independentRegression: 'scripts/lfea-b3.1-frame-element-check.mjs / FRAME-SHEAR-01',
  },
  elements,
  conclusion: 'FIXED_COWPER_TIMOSHENKO_STRONGLY_REDUCES_FIRST_ROBUST_PLAIN_FRAME_CONSTITUTIVE_RESIDUALS',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('Issue 947 element constitutive residual audit PASS');

function auditPlainSourceElement(input) {
  const row = input.row;
  const sourceElementId = String(row.ELEMENTID);
  const nodeI = String(row.FROM_NODE);
  const nodeJ = String(row.TO_NODE);
  const pointI = requireCoordinate(input.coordinates, nodeI);
  const pointJ = requireCoordinate(input.coordinates, nodeJ);
  const length = distance(pointI, pointJ);
  const declaredDeltaLength = Math.hypot(
    Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z),
  ) * MM_TO_M;
  assert.ok(
    Math.abs(length - declaredDeltaLength) <= 1e-9 * Math.max(1, length),
    `Element ${sourceElementId} coordinate length disagrees with INPUT_BASIC_ELEMENT_DATA delta.`,
  );

  const section = annularSection(row);
  const material = materialState(row);
  const axesResult = resolveFrameLocalAxes({
    nodeI: pointI,
    nodeJ: pointJ,
    referenceVector: [0, 0, 1],
    profile: FRAME_LOCAL_AXIS_PROFILE,
  });
  const transformation = frameTransformationMatrix(axesResult.axes);
  const displacementGlobal = [
    ...referenceNodeDisplacement(input.displacementIndex, nodeI),
    ...referenceNodeDisplacement(input.displacementIndex, nodeJ),
  ];
  const displacementLocal = transformDisplacementToLocal(displacementGlobal, transformation);
  const referenceGlobal = referenceSourceAction(input.referenceRows, row);
  const gravityLineWeightNPerM = physicalLineWeight(row, section, input.benchmarkPackage.profile.linearSolve.gravityAcceleration);
  const pressureAxialStrain = closedEndPressureAxialStrain(row, material.elasticModulus);
  const initialLocal = thermalInitialStrainVector({
    elasticModulus: material.elasticModulus,
    area: section.area,
    axialStrain: pressureAxialStrain,
  });

  const eulerBernoulli = evaluateFormulation({
    formulation: 'PIPE_FRAME3D_EULER_BERNOULLI_V1',
    shearDeformation: false,
    shearCorrectionFactor: null,
    length,
    section,
    material,
    axes: axesResult.axes,
    transformation,
    displacementLocal,
    referenceGlobal,
    initialLocal,
    gravityLineWeightNPerM,
    toleranceProfile: input.toleranceProfile,
  });
  const timoshenko = evaluateFormulation({
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearDeformation: true,
    shearCorrectionFactor: COWPER_THIN_ANNULUS_KAPPA,
    length,
    section,
    material,
    axes: axesResult.axes,
    transformation,
    displacementLocal,
    referenceGlobal,
    initialLocal,
    gravityLineWeightNPerM,
    toleranceProfile: input.toleranceProfile,
  });

  return {
    sourceElementId,
    nodeI,
    nodeJ,
    lengthM: length,
    outerDiameterM: section.outerDiameter,
    wallThicknessM: section.wallThickness,
    elasticModulusPa: material.elasticModulus,
    poissonRatio: material.poissonRatio,
    gravityLineWeightNPerM,
    gravityWeightN: gravityLineWeightNPerM * length,
    pressureAxialStrain,
    referenceGlobal,
    eulerBernoulli,
    timoshenko,
    l2ReductionRatio: timoshenko.normalizedResidualL2 / eulerBernoulli.normalizedResidualL2,
  };
}

function evaluateFormulation(input) {
  const properties = {
    elasticModulus: input.material.elasticModulus,
    shearModulus: input.material.shearModulus,
    area: input.section.area,
    secondMomentY: input.section.secondMomentY,
    secondMomentZ: input.section.secondMomentZ,
    polarMoment: input.section.polarMoment,
    length: input.length,
    shearDeformation: input.shearDeformation,
  };
  if (input.shearDeformation) {
    properties.shearCorrectionFactorY = input.shearCorrectionFactor;
    properties.shearCorrectionFactorZ = input.shearCorrectionFactor;
  }
  const stiffness = frameLocalStiffness(properties);
  const equivalentLocal = distributedLoadLocalVector({
    primitive: {
      kind: 'DISTRIBUTED_LOAD',
      basis: 'GLOBAL',
      startIntensity: { fx: 0, fy: -input.gravityLineWeightNPerM, fz: 0 },
      endIntensity: { fx: 0, fy: -input.gravityLineWeightNPerM, fz: 0 },
    },
    axes: input.axes,
    length: input.length,
    phiXY: stiffness.phiXY,
    phiXZ: stiffness.phiXZ,
  });
  const elasticLocal = multiply12(stiffness.matrix, input.displacementLocal);
  const actionLocal = elasticLocal.map((value, dof) =>
    value - equivalentLocal[dof] - input.initialLocal[dof]);
  const actionGlobal = transformLoadToGlobal(actionLocal, input.transformation);
  const residualGlobal = actionGlobal.map((value, dof) => value - input.referenceGlobal[dof]);
  const normalizedResidual = normalizedActionResidual(
    residualGlobal,
    input.referenceGlobal,
    input.toleranceProfile,
  );
  return {
    formulation: input.formulation,
    shearCorrectionFactor: input.shearCorrectionFactor,
    phiXY: stiffness.phiXY,
    phiXZ: stiffness.phiXZ,
    elasticLocal,
    equivalentLocal,
    initialLocal: [...input.initialLocal],
    actionGlobal,
    residualGlobal,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: Math.max(...normalizedResidual.map(Math.abs)),
  };
}

function normalizedActionResidual(residual, reference, toleranceProfile) {
  const forceFromFloor = Number(toleranceProfile.GLOBAL_END_FORCE_FROM.scaleFloor);
  const forceToFloor = Number(toleranceProfile.GLOBAL_END_FORCE_TO.scaleFloor);
  const momentFromFloor = Number(toleranceProfile.GLOBAL_END_MOMENT_FROM.scaleFloor);
  const momentToFloor = Number(toleranceProfile.GLOBAL_END_MOMENT_TO.scaleFloor);
  const floors = [
    forceFromFloor, forceFromFloor, forceFromFloor,
    momentFromFloor, momentFromFloor, momentFromFloor,
    forceToFloor, forceToFloor, forceToFloor,
    momentToFloor, momentToFloor, momentToFloor,
  ];
  return residual.map((value, index) => value / Math.max(Math.abs(reference[index]), floors[index]));
}

function referenceSourceAction(rows, row) {
  const entityId = sourceResultElementId(row);
  const index = new Map(rows
    .filter((entry) => entry.entityKind === 'ELEMENT' && entry.entityId === entityId)
    .map((entry) => [`${entry.quantity}:${entry.component}`, Number(entry.value)]));
  const value = (quantity, component) => {
    const found = index.get(`${quantity}:${component}`);
    if (!Number.isFinite(found)) throw new TypeError(`${entityId} lacks ${quantity}:${component}.`);
    return found;
  };
  return [
    ...FORCE_COMPONENTS.map((component) => value('GLOBAL_END_FORCE_FROM', component)),
    ...MOMENT_COMPONENTS.map((component) => value('GLOBAL_END_MOMENT_FROM', component)),
    ...FORCE_COMPONENTS.map((component) => value('GLOBAL_END_FORCE_TO', component)),
    ...MOMENT_COMPONENTS.map((component) => value('GLOBAL_END_MOMENT_TO', component)),
  ];
}

function referenceDisplacementIndex(rows) {
  return new Map(rows
    .filter((row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity))
    .map((row) => [`${row.entityId}:${row.component}`, Number(row.value)]));
}

function referenceNodeDisplacement(index, nodeId) {
  return DOFS.map((dof) => {
    const value = index.get(`${nodeId}:${dof}`);
    if (!Number.isFinite(value)) throw new TypeError(`L19 lacks reference ${nodeId}:${dof}.`);
    return value;
  });
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
  if (prior) {
    assert.ok(distance(prior, point) <= 1e-9, `Node ${id} has inconsistent ACCDB coordinates.`);
  }
  index.set(id, point);
}

function requireCoordinate(index, nodeId) {
  const point = index.get(String(nodeId));
  if (!point) throw new TypeError(`ACCDB node ${nodeId} has no coordinate.`);
  return point;
}

function annularSection(row) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  if (!(innerDiameter > 0 && outerDiameter > innerDiameter)) {
    throw new TypeError(`Element ${row.ELEMENTID} has invalid annular dimensions.`);
  }
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return {
    outerDiameter,
    wallThickness,
    innerDiameter,
    area,
    secondMomentY: secondMoment,
    secondMomentZ: secondMoment,
    polarMoment: 2 * secondMoment,
  };
}

function materialState(row) {
  const elasticModulus = Number(row.MODULUS) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return {
    elasticModulus,
    poissonRatio,
    shearModulus: elasticModulus / (2 * (1 + poissonRatio)),
  };
}

function physicalLineWeight(row, section, gravityAcceleration) {
  const pipeDensity = Number(row.PIPE_DENSITY) * KG_PER_CM3_TO_KG_PER_M3;
  const fluidDensity = Number(row.FLUID_DENSITY) * KG_PER_CM3_TO_KG_PER_M3;
  const insulationDensity = Number(row.INSUL_DENSITY) * KG_PER_CM3_TO_KG_PER_M3;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
  const insulatedOd = section.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOd ** 2 - section.outerDiameter ** 2) / 4;
  return gravityAcceleration * (
    pipeDensity * section.area
    + fluidDensity * fluidArea
    + insulationDensity * insulationArea
  );
}

function closedEndPressureAxialStrain(row, elasticModulus) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return (1 - 2 * poissonRatio) * pressure * innerDiameter ** 2
    / (elasticModulus * (outerDiameter ** 2 - innerDiameter ** 2));
}

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function multiply12(matrix, vector) {
  if (!Array.isArray(matrix) || matrix.length !== 144 || !Array.isArray(vector) || vector.length !== 12) {
    throw new TypeError('Constitutive audit requires a 12x12 matrix and a 12-component vector.');
  }
  return new Array(12).fill(0).map((_unused, row) => {
    let sum = 0;
    for (let column = 0; column < 12; column += 1) sum += matrix[row * 12 + column] * vector[column];
    return sum;
  });
}

function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
  if (String(value.source?.sha256).toLowerCase() !== EXPECTED_SOURCE_SHA256) {
    throw new TypeError(
      `Issue 947 audit requires BM4_NL.ACCDB SHA-256 ${EXPECTED_SOURCE_SHA256}; received ${String(value.source?.sha256)}.`,
    );
  }
  const l19 = value.cases?.find((entry) => entry.caseId === 'L19');
  if (!l19 || l19.formula !== 'W+P1') throw new TypeError('Issue 947 audit requires L19 = W+P1.');
}

function distance(left, right) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const name = token.slice(2);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for --${name}.`);
    result[name] = value;
    index += 1;
  }
  return result;
}
