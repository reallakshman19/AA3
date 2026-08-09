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
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const RIGID_WALL_MULTIPLIER = 10;
const RIGID_INSULATION_WEIGHT_MULTIPLIER = 1.75;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const ACTION_LABELS = Object.freeze([
  'FROM:FX','FROM:FY','FROM:FZ','FROM:MX','FROM:MY','FROM:MZ',
  'TO:FX','TO:FY','TO:FZ','TO:MX','TO:MY','TO:MZ',
]);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-node22130-two-sided-rz-reconstruction.mjs --package <canonical-package.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);

const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.map((row) => [String(row.ELEMENTID), row]));
const e79 = requireSourceRow(sourceRows, '79');
const e80 = requireSourceRow(sourceRows, '80');
assert.equal(String(e79.FROM_NODE), '22125');
assert.equal(String(e79.TO_NODE), '22130');
assert.ok(Number(e79.RIGID_PTR) > 0, 'E79 must be the adjacent rigid element.');
assert.equal(Number(e79.BEND_PTR), 0);
assert.equal(Number(e79.REDUCER_PTR), 0);
assert.equal(String(e80.FROM_NODE), '22130');
assert.equal(String(e80.TO_NODE), '22140');
assert.equal(Number(e80.RIGID_PTR), 0);
assert.equal(Number(e80.BEND_PTR), 0);
assert.equal(Number(e80.REDUCER_PTR), 0);

const coordinates = sourceCoordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const production = solveCaesarAccdbLinearBenchmark(pkg);
const productionRows = production.cases.L19.rows;
const referenceRows = pkg.references.L19.rows;

const e79Evaluator = buildRigidEvaluator(e79);
const e80Evaluator = buildPipeEvaluator(e80);
const e79EntityId = sourceResultElementId(e79);
const e80EntityId = sourceResultElementId(e80);

const e79ProductionAction = actionVector(productionRows, e79EntityId);
const e80ProductionAction = actionVector(productionRows, e80EntityId);
const e79ReferenceAction = actionVector(referenceRows, e79EntityId);
const e80ReferenceAction = actionVector(referenceRows, e80EntityId);
const e79LfeaBoundary = boundaryDofVector(productionRows, ['22125','22130']);
const e80LfeaBoundary = boundaryDofVector(productionRows, ['22130','22140']);
const e79CaesarBoundary = boundaryDofVector(referenceRows, ['22125','22130']);
const e80CaesarBoundary = boundaryDofVector(referenceRows, ['22130','22140']);

const e79Parity = parityRecord(e79Evaluator, e79LfeaBoundary, e79ProductionAction, 'E79');
const e80Parity = parityRecord(e80Evaluator, e80LfeaBoundary, e80ProductionAction, 'E80');
assert.ok(e79Parity.maxAbsResidual <= 1e-3, `E79 production parity failed: ${e79Parity.maxAbsResidual}`);
assert.ok(e80Parity.maxAbsResidual <= 1e-3, `E80 production parity failed: ${e80Parity.maxAbsResidual}`);

const e79ExportedRz = e79CaesarBoundary[11];
const e80ExportedRz = e80CaesarBoundary[5];
assert.equal(e79ExportedRz, e80ExportedRz, 'Adjacent source rows must share one exported node-22130 RZ.');

const e79Inference = inferSharedDof({
  evaluator: e79Evaluator,
  boundary: e79CaesarBoundary,
  dofIndex: 11,
  referenceAction: e79ReferenceAction,
});
const e80Inference = inferSharedDof({
  evaluator: e80Evaluator,
  boundary: e80CaesarBoundary,
  dofIndex: 5,
  referenceAction: e80ReferenceAction,
});

const inferredMean = 0.5 * (e79Inference.inferredDof + e80Inference.inferredDof);
const inferredDifference = Math.abs(e79Inference.inferredDof - e80Inference.inferredDof);
const inferredRelativeDifference = inferredDifference / Math.max(Math.abs(inferredMean), 1e-15);
const sharedInferenceAgreement = inferredRelativeDifference <= 0.01;
const exportedZero = e79ExportedRz === 0;
const bothImprove = e79Inference.correctedNormalizedResidualL2 < e79Inference.exportedNormalizedResidualL2
  && e80Inference.correctedNormalizedResidualL2 < e80Inference.exportedNormalizedResidualL2;

const output = {
  schema: 'lfea-issue947-node22130-two-sided-rz-reconstruction/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  purpose: 'DIAGNOSTIC_KINEMATIC_RECONSTRUCTION_NO_PARAMETER_FIT_NO_PRODUCTION_UPDATE',
  governingRelation: 'q_e(d)=K_e d-f_eq-f_0; vary only shared node 22130 RZ while all other CAESAR endpoint DOFs remain fixed.',
  productionParity: {
    E79: e79Parity,
    E80: e80Parity,
  },
  exportedNode22130RzRad: e79ExportedRz,
  inference: {
    E79: e79Inference,
    E80: e80Inference,
    meanRzRad: inferredMean,
    absoluteDifferenceRad: inferredDifference,
    relativeDifference: inferredRelativeDifference,
  },
  gates: {
    productionParity: {
      status: e79Parity.maxAbsResidual <= 1e-3 && e80Parity.maxAbsResidual <= 1e-3 ? 'PASS' : 'FAIL',
      rule: 'Each standalone evaluator must reproduce production source end actions under LFEA endpoint DOFs before CAESAR displacement inference is admissible.',
    },
    adjacentElementInferenceAgreement: {
      status: sharedInferenceAgreement ? 'PASS' : 'FAIL',
      rule: 'Independent E79 and E80 action reconstructions shall infer shared node-22130 RZ within 1% relative difference.',
    },
    inferredRzImprovesBothActionResiduals: {
      status: bothImprove ? 'PASS' : 'FAIL',
      rule: 'Replacing only node-22130 RZ by each element inference shall reduce the normalized full end-action residual for both adjacent elements.',
    },
    exportedRzIsExactlyZero: {
      status: exportedZero ? 'PASS' : 'FAIL',
      rule: 'The commercial OUTPUT_DISPLACEMENTS witness under investigation is exactly zero before an action-vs-displacement inconsistency can be classified.',
    },
  },
  classification: sharedInferenceAgreement && bothImprove && exportedZero
    ? 'ADJACENT_ACTIONS_REQUIRE_COMMON_NONZERO_RZ_WHILE_EXPORTED_RZ_IS_ZERO'
    : 'KINEMATIC_CUSTODY_HYPOTHESIS_NOT_YET_ESTABLISHED',
  falsificationRule: 'If production parity fails, if E79/E80 infer materially different RZ, or if changing only RZ does not improve both full action residual vectors, do not classify the commercial displacement row as inconsistent.',
  nextGate: 'COMBINE_WITH_EXACT_ACCDB_INPUT_DISPLMNT_AND_RESTRAINT_CUSTODY_BEFORE_REFERENCE_QUARANTINE_DECISION',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 node 22130 two-sided RZ reconstruction: ${output.classification}`);

function buildPipeEvaluator(row) {
  const pointI = requireCoordinate(coordinates, row.FROM_NODE);
  const pointJ = requireCoordinate(coordinates, row.TO_NODE);
  const axesResult = resolveFrameLocalAxes({ nodeI: pointI, nodeJ: pointJ, referenceVector: [0,0,1], profile: FRAME_LOCAL_AXIS_PROFILE });
  const transformation = frameTransformationMatrix(axesResult.axes);
  const length = distance(pointI, pointJ);
  const physical = annularSection(row);
  const material = materialState(row);
  const lineWeight = ordinaryPipeLineWeight(row, physical, pkg.profile.linearSolve.gravityAcceleration);
  const pressureStrain = closedEndPressureAxialStrain(row, material.elasticModulus);
  const stiffness = frameLocalStiffness({
    elasticModulus: material.elasticModulus,
    shearModulus: material.shearModulus,
    area: physical.area,
    secondMomentY: physical.secondMomentY,
    secondMomentZ: physical.secondMomentZ,
    polarMoment: physical.polarMoment,
    length,
    shearDeformation: true,
    shearCorrectionFactorY: 0.5,
    shearCorrectionFactorZ: 0.5,
  }).matrix;
  const equivalentLocal = gravityVector({ axes: axesResult.axes, length, lineWeight });
  const initialLocal = thermalInitialStrainVector({ elasticModulus: material.elasticModulus, area: physical.area, axialStrain: pressureStrain });
  return (globalDof) => recover(stiffness, transformation, globalDof, equivalentLocal, initialLocal);
}

function buildRigidEvaluator(row) {
  const pointI = requireCoordinate(coordinates, row.FROM_NODE);
  const pointJ = requireCoordinate(coordinates, row.TO_NODE);
  const axesResult = resolveFrameLocalAxes({ nodeI: pointI, nodeJ: pointJ, referenceVector: [0,0,1], profile: FRAME_LOCAL_AXIS_PROFILE });
  const transformation = frameTransformationMatrix(axesResult.axes);
  const length = distance(pointI, pointJ);
  const physical = annularSection(row);
  const material = materialState(row);
  const stiffnessWallThickness = RIGID_WALL_MULTIPLIER * physical.wallThickness;
  const stiffnessOutsideDiameter = physical.innerDiameter + 2 * stiffnessWallThickness;
  const stiffnessSection = annulusProperties(stiffnessOutsideDiameter, physical.innerDiameter);
  const declaration = pkg.model.tables.INPUT_RIGIDS.rows.find((candidate) => Number(candidate.RIGID_PTR) === Number(row.RIGID_PTR));
  if (!declaration) throw new TypeError(`Missing INPUT_RIGIDS pointer ${row.RIGID_PTR}.`);
  const lineWeight = rigidLineWeight({ row, physical, length, enteredRigidWeight: Number(declaration.RIGID_WGT), gravityAcceleration: pkg.profile.linearSolve.gravityAcceleration });
  const stiffness = frameLocalStiffness({
    elasticModulus: material.elasticModulus,
    shearModulus: material.shearModulus,
    area: stiffnessSection.area,
    secondMomentY: stiffnessSection.secondMomentY,
    secondMomentZ: stiffnessSection.secondMomentZ,
    polarMoment: stiffnessSection.polarMoment,
    length,
    shearDeformation: false,
  }).matrix;
  const equivalentLocal = lineWeight === 0 ? new Array(12).fill(0) : gravityVector({ axes: axesResult.axes, length, lineWeight });
  const initialLocal = new Array(12).fill(0);
  return (globalDof) => recover(stiffness, transformation, globalDof, equivalentLocal, initialLocal);
}

function parityRecord(evaluator, boundary, productionAction, label) {
  const standaloneAction = evaluator(boundary);
  const residual = subtract(standaloneAction, productionAction);
  return { label, standaloneAction, productionAction, residual, maxAbsResidual: Math.max(...residual.map(Math.abs)), status: 'PASS' };
}

function inferSharedDof({ evaluator, boundary, dofIndex, referenceAction }) {
  const exportedAction = evaluator(boundary);
  const exportedResidual = subtract(exportedAction, referenceAction);
  const perturbation = 1e-6;
  const perturbedBoundary = [...boundary];
  perturbedBoundary[dofIndex] += perturbation;
  const perturbedAction = evaluator(perturbedBoundary);
  const sensitivity = perturbedAction.map((value, index) => (value - exportedAction[index]) / perturbation);
  const scales = actionScales(referenceAction, pkg.profile.tolerances);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < 12; index += 1) {
    const invScale2 = 1 / (scales[index] ** 2);
    numerator += sensitivity[index] * exportedResidual[index] * invScale2;
    denominator += sensitivity[index] ** 2 * invScale2;
  }
  if (!(denominator > 0)) throw new TypeError('Node-22130 RZ has zero end-action sensitivity.');
  const correction = -numerator / denominator;
  const inferredDof = boundary[dofIndex] + correction;
  const correctedBoundary = [...boundary];
  correctedBoundary[dofIndex] = inferredDof;
  const correctedAction = evaluator(correctedBoundary);
  const correctedResidual = subtract(correctedAction, referenceAction);
  const componentRoots = Object.fromEntries(ACTION_LABELS.map((label, index) => [label,
    Math.abs(sensitivity[index]) <= 1e-8
      ? null
      : boundary[dofIndex] - exportedResidual[index] / sensitivity[index],
  ]));
  return {
    exportedDof: boundary[dofIndex],
    inferredDof,
    correction,
    sensitivityPerRadian: sensitivity,
    componentExactRootsRad: componentRoots,
    referenceAction,
    exportedAction,
    exportedResidual,
    exportedNormalizedResidual: normalize(exportedResidual, scales),
    exportedNormalizedResidualL2: Math.hypot(...normalize(exportedResidual, scales)),
    correctedAction,
    correctedResidual,
    correctedNormalizedResidual: normalize(correctedResidual, scales),
    correctedNormalizedResidualL2: Math.hypot(...normalize(correctedResidual, scales)),
    correctedMaxAbsResidual: Math.max(...correctedResidual.map(Math.abs)),
  };
}

function recover(stiffness, transformation, displacementGlobal, equivalentLocal, initialLocal) {
  const localDof = transformDisplacementToLocal(displacementGlobal, transformation);
  const elasticLocal = multiply12(stiffness, localDof);
  const actionLocal = elasticLocal.map((value, index) => value - equivalentLocal[index] - initialLocal[index]);
  return transformLoadToGlobal(actionLocal, transformation);
}

function gravityVector({ axes, length, lineWeight }) {
  return distributedLoadLocalVector({
    primitive: {
      kind: 'DISTRIBUTED_LOAD',
      basis: 'GLOBAL',
      startIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
      endIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
    },
    axes,
    length,
    phiXY: 0,
    phiXZ: 0,
  });
}

function rigidLineWeight({ row, physical, length, enteredRigidWeight, gravityAcceleration }) {
  if (!(enteredRigidWeight > 0)) return 0;
  const fluidArea = Math.PI * physical.innerDiameter ** 2 / 4;
  const fluidWeight = density(row.FLUID_DENSITY) * fluidArea * length * gravityAcceleration;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOutsideDiameter = physical.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOutsideDiameter ** 2 - physical.outerDiameter ** 2) / 4;
  const insulationWeight = RIGID_INSULATION_WEIGHT_MULTIPLIER * density(row.INSUL_DENSITY) * insulationArea * length * gravityAcceleration;
  return (enteredRigidWeight + fluidWeight + insulationWeight) / length;
}

function ordinaryPipeLineWeight(row, section, gravityAcceleration) {
  const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOutsideDiameter = section.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOutsideDiameter ** 2 - section.outerDiameter ** 2) / 4;
  return gravityAcceleration * (
    density(row.PIPE_DENSITY) * section.area
    + density(row.FLUID_DENSITY) * fluidArea
    + density(row.INSUL_DENSITY) * insulationArea
  );
}

function annularSection(row) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  return { outerDiameter, wallThickness, innerDiameter, ...annulusProperties(outerDiameter, innerDiameter) };
}

function annulusProperties(outerDiameter, innerDiameter) {
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return { area, secondMomentY: secondMoment, secondMomentZ: secondMoment, polarMoment: 2 * secondMoment };
}

function materialState(row) {
  const elasticModulus = Number(row.MODULUS) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return { elasticModulus, poissonRatio, shearModulus: elasticModulus / (2 * (1 + poissonRatio)) };
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

function density(value) { return Number(value) * KG_PER_CM3_TO_KG_PER_M3; }
function distance(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]); }

function actionVector(rows, entityId) {
  const quantities = [
    ['GLOBAL_END_FORCE_FROM','FX'],['GLOBAL_END_FORCE_FROM','FY'],['GLOBAL_END_FORCE_FROM','FZ'],
    ['GLOBAL_END_MOMENT_FROM','MX'],['GLOBAL_END_MOMENT_FROM','MY'],['GLOBAL_END_MOMENT_FROM','MZ'],
    ['GLOBAL_END_FORCE_TO','FX'],['GLOBAL_END_FORCE_TO','FY'],['GLOBAL_END_FORCE_TO','FZ'],
    ['GLOBAL_END_MOMENT_TO','MX'],['GLOBAL_END_MOMENT_TO','MY'],['GLOBAL_END_MOMENT_TO','MZ'],
  ];
  return quantities.map(([quantity, component]) => requireResult(rows, entityId, quantity, component));
}

function requireResult(rows, entityId, quantity, component) {
  const row = rows.find((entry) => entry.entityKind === 'ELEMENT' && entry.entityId === entityId && entry.quantity === quantity && entry.component === component);
  if (!row) throw new TypeError(`Missing ${entityId} ${quantity}:${component}.`);
  return Number(row.value);
}

function boundaryDofVector(rows, nodeIds) {
  return nodeIds.flatMap((nodeId) => DOFS.map((dof) => {
    const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
    const row = rows.find((entry) => entry.entityKind === 'NODE' && String(entry.entityId) === String(nodeId) && entry.quantity === quantity && entry.component === dof);
    if (!row) throw new TypeError(`Missing ${nodeId}:${dof}.`);
    return Number(row.value);
  }));
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
function normalize(residual, scales) { return residual.map((value, index) => value / scales[index]); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function multiply12(matrix, vector) { return new Array(12).fill(0).map((_unused, row) => { let sum = 0; for (let col = 0; col < 12; col += 1) sum += matrix[row*12+col] * vector[col]; return sum; }); }
function sourceResultElementId(row) { return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}|${String(row.ELEMENT_NAME ?? '').trim()}`; }

function sourceCoordinateIndex(rows) {
  const out = new Map();
  for (const row of rows) {
    setCoordinate(out, row.FROM_NODE, [row.FROM_NODE_X,row.FROM_NODE_Y,row.FROM_NODE_Z]);
    setCoordinate(out, row.TO_NODE, [row.TO_NODE_X,row.TO_NODE_Y,row.TO_NODE_Z]);
  }
  return out;
}
function setCoordinate(index, id, mm) {
  const point = mm.map((value) => Number(value) * MM_TO_M);
  const key = String(id);
  const prior = index.get(key);
  if (prior) assert.ok(distance(prior, point) <= 1e-9, `Coordinate drift at ${key}.`);
  index.set(key, point);
}
function requireCoordinate(index, id) { const point = index.get(String(id)); if (!point) throw new TypeError(`Missing coordinate ${id}.`); return point; }
function requireSourceRow(index, id) { const row = index.get(String(id)); if (!row) throw new TypeError(`Missing source row ${id}.`); return row; }
function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical package required.');
  assert.equal(value.source.sha256, EXPECTED_SOURCE_SHA256);
  assert.equal(value.cases.find((entry) => entry.caseId === 'L19')?.formula, 'W+P1');
}
function parseArgs(argv) {
  const result = { package: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
