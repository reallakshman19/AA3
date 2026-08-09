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
const EXPECTED_RIGID_COUNT = 20;
const RIGID_WALL_MULTIPLIER = 10;
const RIGID_INSULATION_WEIGHT_MULTIPLIER = 1.75;
const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const FORCE_FLOOR_N = 50;
const MOMENT_FLOOR_NM = 5;
const COMPONENT_LIMIT = 0.1;
const COMPONENT_LABELS = Object.freeze([
  'FROM:FX','FROM:FY','FROM:FZ','FROM:MX','FROM:MY','FROM:MZ',
  'TO:FX','TO:FY','TO:FZ','TO:MX','TO:MY','TO:MZ',
]);
const TRANSVERSE_LOCAL_INDICES = Object.freeze([1,2,4,5,7,8,10,11]);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-rigid-stiffness-formulation-audit.mjs --package <canonical-package.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const rigidRows = sourceRows.filter((row) => Number(row.RIGID_PTR) > 0)
  .sort((left, right) => Number(left.ELEMENTID) - Number(right.ELEMENTID));
assert.equal(rigidRows.length, EXPECTED_RIGID_COUNT, 'BM4_NL rigid population drift.');

const coordinates = coordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const declarations = new Map(pkg.model.tables.INPUT_RIGIDS.rows.map((row) => [Number(row.RIGID_PTR), row]));
const referenceRows = pkg.references.L19.rows;
const production = solveCaesarAccdbLinearBenchmark(pkg);
const productionRows = production.cases.L19.rows;

const records = rigidRows.map((row) => auditRigid(row));
const productionParityMaxAbs = Math.max(...records.map((record) => record.productionParity.currentTimoshenkoMaxAbsResidual));
const transverse = {
  currentTimoshenko: aggregate(records, 'currentTimoshenko'),
  dedicatedRigidEulerBernoulli: aggregate(records, 'dedicatedRigidEulerBernoulli'),
};
const ebBetterCount = records.filter((record) =>
  record.caesarReplay.dedicatedRigidEulerBernoulli.transverseNormalizedL2
    < record.caesarReplay.currentTimoshenko.transverseNormalizedL2).length;
const timoBetterCount = records.filter((record) =>
  record.caesarReplay.currentTimoshenko.transverseNormalizedL2
    < record.caesarReplay.dedicatedRigidEulerBernoulli.transverseNormalizedL2).length;
const equalCount = records.length - ebBetterCount - timoBetterCount;
const e79 = records.find((record) => record.sourceElementId === '79');
if (!e79) throw new TypeError('E79 witness missing.');

const output = {
  schema: 'lfea-issue947-rigid-stiffness-formulation-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  purpose: 'ALL_RIGID_CAESAR_DOF_INJECTION_EB_VS_CURRENT_TIMOSHENKO_NO_PRODUCTION_UPDATE',
  controlledMechanics: {
    common: [
      '10x entered wall rigid stiffness section',
      'accepted rigid Bourdon pressure free state F_B=(1-2nu)P*A_i applied to rigid EA',
      'production rigid weight/fluid/insulation gravity basis',
      'same source geometry, material, local axes, CAESAR endpoint DOFs and CAESAR end actions',
    ],
    variantOnly: {
      currentTimoshenko: 'shearDeformation=true, kappaY=kappaZ=0.5 (current ACCDB adapter behavior)',
      dedicatedRigidEulerBernoulli: 'shearDeformation=false (dedicated CAESAR rigid authority behavior)',
    },
  },
  productionParity: {
    currentTimoshenkoMaxAbsResidual: productionParityMaxAbs,
    status: productionParityMaxAbs <= 1e-3 ? 'PASS' : 'FAIL',
    rule: 'The independently reconstructed current Timoshenko rigid evaluator shall reproduce production source actions under production endpoint DOFs before CAESAR injection is admissible.',
  },
  transverseCaesarReplay: {
    ...transverse,
    elementWins: { dedicatedRigidEulerBernoulli: ebBetterCount, currentTimoshenko: timoBetterCount, equal: equalCount },
  },
  e79Witness: e79,
  records,
  gates: {
    productionParity: productionParityMaxAbs <= 1e-3 ? 'PASS' : 'FAIL',
    dedicatedAuthorityReducesAggregateTransverseResidual: transverse.dedicatedRigidEulerBernoulli.normalizedRms
      < transverse.currentTimoshenko.normalizedRms ? 'PASS' : 'FAIL',
    dedicatedAuthorityReducesTransverseFailureCount: transverse.dedicatedRigidEulerBernoulli.componentsOverExisting10PercentGate
      < transverse.currentTimoshenko.componentsOverExisting10PercentGate ? 'PASS' : 'FAIL',
  },
  classification: productionParityMaxAbs <= 1e-3
    && transverse.dedicatedRigidEulerBernoulli.normalizedRms < transverse.currentTimoshenko.normalizedRms
    && transverse.dedicatedRigidEulerBernoulli.componentsOverExisting10PercentGate < transverse.currentTimoshenko.componentsOverExisting10PercentGate
    ? 'DEDICATED_RIGID_EULER_BERNOULLI_FORMULATION_SUPPORTED_FOR_NEXT_WHOLE_MODEL_GATE'
    : 'RIGID_STIFFNESS_FORMULATION_NOT_YET_RESOLVED',
  falsificationRule: 'Do not change production rigid stiffness if current-production parity fails, or if the dedicated Euler-Bernoulli rigid authority does not reduce both aggregate transverse normalized residual and the count of transverse components above the unchanged 10% comparison gate.',
  nextGate: 'WHOLE_MODEL_AB_REPLAY_CHANGING_ONLY_RIGID_STIFFNESS_FROM_CURRENT_TIMOSHENKO_TO_DEDICATED_EULER_BERNOULLI_WITH_ACCEPTED_RIGID_BOURDON_PRESSURE_HELD_FIXED',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 rigid stiffness formulation audit: ${output.classification}`);

function auditRigid(row) {
  const sourceElementId = String(row.ELEMENTID);
  const fromNode = String(row.FROM_NODE);
  const toNode = String(row.TO_NODE);
  const pointI = requireCoordinate(fromNode);
  const pointJ = requireCoordinate(toNode);
  const axesResult = resolveFrameLocalAxes({ nodeI: pointI, nodeJ: pointJ, referenceVector: [0,0,1], profile: FRAME_LOCAL_AXIS_PROFILE });
  const transformation = frameTransformationMatrix(axesResult.axes);
  const length = distance(pointI, pointJ);
  const physical = annularSection(row);
  const material = materialState(row);
  const rigidWallThickness = RIGID_WALL_MULTIPLIER * physical.wallThickness;
  const rigidOutsideDiameter = physical.innerDiameter + 2 * rigidWallThickness;
  const stiffnessSection = annulusProperties(rigidOutsideDiameter, physical.innerDiameter);
  const declaration = declarations.get(Number(row.RIGID_PTR));
  if (!declaration) throw new TypeError(`Missing INPUT_RIGIDS pointer ${row.RIGID_PTR}.`);
  const lineWeight = rigidLineWeight({ row, physical, length, enteredRigidWeight: Number(declaration.RIGID_WGT), gravityAcceleration: pkg.profile.linearSolve.gravityAcceleration });
  const equivalentLocal = lineWeight === 0 ? zero12() : gravityVector({ axes: axesResult.axes, length, lineWeight });
  const bourdonAxialForce = (1 - 2 * Number(row.POISSONS))
    * Number(row.PRESSURE1) * KPA_TO_PA
    * Math.PI * physical.innerDiameter ** 2 / 4;
  const pressureStrain = bourdonAxialForce / (material.elasticModulus * stiffnessSection.area);
  const initialLocal = thermalInitialStrainVector({
    elasticModulus: material.elasticModulus,
    area: stiffnessSection.area,
    axialStrain: pressureStrain,
  });

  const evaluators = {
    currentTimoshenko: buildEvaluator(true),
    dedicatedRigidEulerBernoulli: buildEvaluator(false),
  };
  const entityId = sourceResultElementId(row);
  const productionBoundary = boundaryDofVector(productionRows, [fromNode, toNode]);
  const caesarBoundary = boundaryDofVector(referenceRows, [fromNode, toNode]);
  const productionAction = actionVector(productionRows, entityId);
  const referenceAction = actionVector(referenceRows, entityId);
  const referenceLocal = globalActionToLocal(referenceAction, axesResult.axes);

  const productionTimoAction = evaluators.currentTimoshenko(productionBoundary);
  const productionParityResidual = subtract(productionTimoAction, productionAction);
  const replay = {};
  for (const [name, evaluator] of Object.entries(evaluators)) {
    const actionGlobal = evaluator(caesarBoundary);
    const actionLocal = globalActionToLocal(actionGlobal, axesResult.axes);
    const residualLocal = subtract(actionLocal, referenceLocal);
    const normalized = normalizedLocalResidual(residualLocal, referenceLocal);
    const transverseNormalized = TRANSVERSE_LOCAL_INDICES.map((index) => normalized[index]);
    replay[name] = {
      actionGlobal,
      actionLocal,
      residualLocal,
      normalizedLocalResidual: normalized,
      transverseNormalizedResidual: transverseNormalized,
      transverseNormalizedL2: Math.hypot(...transverseNormalized),
      transverseComponentsOverExisting10PercentGate: transverseNormalized.filter((value) => Math.abs(value) > COMPONENT_LIMIT).length,
      transverseMaxNormalizedAbs: Math.max(...transverseNormalized.map(Math.abs)),
    };
  }

  return {
    sourceElementId,
    fromNode,
    toNode,
    rigidPtr: Number(row.RIGID_PTR),
    lengthM: length,
    productionParity: {
      currentTimoshenkoMaxAbsResidual: Math.max(...productionParityResidual.map(Math.abs)),
    },
    referenceLocalAction: Object.fromEntries(COMPONENT_LABELS.map((label, index) => [label, referenceLocal[index]])),
    caesarReplay: replay,
  };

  function buildEvaluator(shearDeformation) {
    const stiffness = frameLocalStiffness({
      elasticModulus: material.elasticModulus,
      shearModulus: material.shearModulus,
      area: stiffnessSection.area,
      secondMomentY: stiffnessSection.secondMomentY,
      secondMomentZ: stiffnessSection.secondMomentZ,
      polarMoment: stiffnessSection.polarMoment,
      length,
      shearDeformation,
      ...(shearDeformation ? { shearCorrectionFactorY: 0.5, shearCorrectionFactorZ: 0.5 } : {}),
    }).matrix;
    return (globalDof) => recover(stiffness, transformation, globalDof, equivalentLocal, initialLocal);
  }
}

function aggregate(records, variant) {
  const normalized = records.flatMap((record) => record.caesarReplay[variant].transverseNormalizedResidual);
  const elementL2 = records.map((record) => record.caesarReplay[variant].transverseNormalizedL2);
  return {
    normalizedRms: Math.sqrt(normalized.reduce((sum, value) => sum + value ** 2, 0) / normalized.length),
    normalizedMeanAbs: normalized.reduce((sum, value) => sum + Math.abs(value), 0) / normalized.length,
    normalizedMaxAbs: Math.max(...normalized.map(Math.abs)),
    componentsOverExisting10PercentGate: normalized.filter((value) => Math.abs(value) > COMPONENT_LIMIT).length,
    elementRmsL2: Math.sqrt(elementL2.reduce((sum, value) => sum + value ** 2, 0) / elementL2.length),
  };
}

function normalizedLocalResidual(residual, reference) {
  return residual.map((value, index) => {
    const localComponent = index % 6;
    const floor = localComponent < 3 ? FORCE_FLOOR_N : MOMENT_FLOOR_NM;
    return value / Math.max(Math.abs(reference[index]), floor);
  });
}

function globalActionToLocal(global, axes) {
  const out = [];
  for (const offset of [0, 6]) {
    const force = global.slice(offset, offset + 3);
    const moment = global.slice(offset + 3, offset + 6);
    out.push(dot(force, axes.x), dot(force, axes.y), dot(force, axes.z));
    out.push(dot(moment, axes.x), dot(moment, axes.y), dot(moment, axes.z));
  }
  return out;
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
  const insulationWeight = RIGID_INSULATION_WEIGHT_MULTIPLIER
    * density(row.INSUL_DENSITY) * insulationArea * length * gravityAcceleration;
  return (enteredRigidWeight + fluidWeight + insulationWeight) / length;
}

function annularSection(row) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  if (!(innerDiameter > 0)) throw new TypeError(`Invalid section on source E${row.ELEMENTID}.`);
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
  return { elasticModulus, shearModulus: elasticModulus / (2 * (1 + poissonRatio)), poissonRatio };
}

function density(value) {
  return Number(value) * KG_PER_CM3_TO_KG_PER_M3;
}

function coordinateIndex(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = String(row.NODE);
    map.set(id, [Number(row.X) * MM_TO_M, Number(row.Y) * MM_TO_M, Number(row.Z) * MM_TO_M]);
  }
  return map;
}

function requireCoordinate(nodeId) {
  const value = coordinates.get(String(nodeId));
  if (!value) throw new TypeError(`Missing coordinate for node ${nodeId}.`);
  return value;
}

function boundaryDofVector(rows, nodeIds) {
  return nodeIds.flatMap((nodeId) => [
    resultValue(rows, 'NODE', nodeId, 'DISPLACEMENT', 'UX'),
    resultValue(rows, 'NODE', nodeId, 'DISPLACEMENT', 'UY'),
    resultValue(rows, 'NODE', nodeId, 'DISPLACEMENT', 'UZ'),
    resultValue(rows, 'NODE', nodeId, 'ROTATION', 'RX'),
    resultValue(rows, 'NODE', nodeId, 'ROTATION', 'RY'),
    resultValue(rows, 'NODE', nodeId, 'ROTATION', 'RZ'),
  ]);
}

function actionVector(rows, entityId) {
  return [
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_FORCE_FROM', 'FX'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_FORCE_FROM', 'FY'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_FORCE_FROM', 'FZ'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_MOMENT_FROM', 'MX'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_MOMENT_FROM', 'MY'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_MOMENT_FROM', 'MZ'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_FORCE_TO', 'FX'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_FORCE_TO', 'FY'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_FORCE_TO', 'FZ'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_MOMENT_TO', 'MX'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_MOMENT_TO', 'MY'),
    resultValue(rows, 'ELEMENT', entityId, 'GLOBAL_END_MOMENT_TO', 'MZ'),
  ];
}

function resultValue(rows, entityKind, entityId, quantity, component) {
  const matches = rows.filter((row) => row.entityKind === entityKind && String(row.entityId) === String(entityId)
    && row.quantity === quantity && row.component === component);
  if (matches.length !== 1) throw new TypeError(`Expected one ${entityKind} ${entityId} ${quantity}:${component}; found ${matches.length}.`);
  return Number(matches[0].value);
}

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function multiply12(matrix, vector) {
  return new Array(12).fill(0).map((_unused, row) => {
    let sum = 0;
    for (let col = 0; col < 12; col += 1) sum += matrix[row * 12 + col] * vector[col];
    return sum;
  });
}

function zero12() { return new Array(12).fill(0); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function distance(left, right) { return Math.hypot(...left.map((value, index) => value - right[index])); }

function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical CAESAR ACCDB package is required.');
  assert.equal(value.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB SHA-256 drift.');
  assert.ok(Array.isArray(value.model?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows));
  assert.ok(Array.isArray(value.model?.tables?.INPUT_NODAL_COORDINATES?.rows));
  assert.ok(Array.isArray(value.model?.tables?.INPUT_RIGIDS?.rows));
  assert.ok(Array.isArray(value.references?.L19?.rows));
  assert.equal(value.profile?.linearSolve?.bourdonPressureEffects?.mode, 'TRANSLATION_AND_ROTATION', 'Bourdon mode drift.');
}

function parseArgs(argv) {
  const result = { package: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
