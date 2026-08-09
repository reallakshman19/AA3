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
const EXPECTED_NON_BEND_COUNT = 84;
const WITNESS_IDS = Object.freeze(['78', '79', '80', '81']);
const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const RIGID_WALL_MULTIPLIER = 10;
const RIGID_INSULATION_WEIGHT_MULTIPLIER = 1.75;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const Z_MY_PLANE = Object.freeze([2, 4, 8, 10]);
const CONTROL_NORMALIZED_EQUIVALENCE_LIMIT = 1e-6;

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-element-delta-geometry-custody-audit.mjs --package <canonical-package.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);

const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const sourceById = new Map(sourceRows.map((row) => [String(row.ELEMENTID), row]));
const coordinateMm = sourceCoordinateMmIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const nonBendRows = sourceRows.filter((row) => Number(row.BEND_PTR) === 0);
assert.equal(nonBendRows.length, EXPECTED_NON_BEND_COUNT, 'BM4_NL non-bend source population drift.');

const precisionRecords = nonBendRows
  .map(sourcePrecisionRecord)
  .sort((left, right) => Number(left.sourceElementId) - Number(right.sourceElementId));
const unexplained = precisionRecords.filter((record) => !record.coordinateDeltaDifferenceExplainedByFloat32Storage);
const sourceFloat32RoundTrip = precisionRecords.every((record) => record.sourceValuesRoundTripFloat32);
assert.equal(unexplained.length, 0,
  `Non-bend coordinate/delta disagreement exceeds float32 source-storage bounds: ${unexplained.map((x) => x.sourceElementId).join(',')}.`);

const production = solveCaesarAccdbLinearBenchmark(pkg);
const productionRows = production.cases.L19.rows;
const referenceRows = pkg.references.L19.rows;
const witnesses = WITNESS_IDS.map((sourceElementId) => auditWitness(requireSourceRow(sourceById, sourceElementId)));
const productionParityMaxAbs = Math.max(...witnesses.map((record) => record.productionParity.maxAbsResidual));
assert.ok(productionParityMaxAbs <= 1e-3,
  `Witness standalone production parity failed: ${productionParityMaxAbs}.`);

const control = witnesses.find((record) => record.sourceElementId === '78');
const affected = witnesses.filter((record) => ['79', '80', '81'].includes(record.sourceElementId));
if (!control) throw new TypeError('E78 geometry control missing.');
const controlGeometryEquivalent = control.geometry.lengthDifferenceMm <= 1e-9
  && Math.abs(control.caesarReplay.deltaGeometry.zMyPlaneNormalizedL2
    - control.caesarReplay.coordinateGeometry.zMyPlaneNormalizedL2) <= CONTROL_NORMALIZED_EQUIVALENCE_LIMIT;
const affectedImprove = affected.every((record) =>
  record.caesarReplay.deltaGeometry.zMyPlaneNormalizedL2
    < record.caesarReplay.coordinateGeometry.zMyPlaneNormalizedL2);
const e79 = witnesses.find((record) => record.sourceElementId === '79');
const e80 = witnesses.find((record) => record.sourceElementId === '80');
if (!e79 || !e80) throw new TypeError('E79/E80 witness missing.');

const output = {
  schema: 'lfea-issue947-element-delta-geometry-custody-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  purpose: 'SOURCE_GEOMETRY_CUSTODY_AND_INJECTED_ACTION_DIAGNOSTIC_NO_PRODUCTION_UPDATE',
  controlNumericalEquivalence: {
    normalizedLimit: CONTROL_NORMALIZED_EQUIVALENCE_LIMIT,
    source: 'EXISTING_NORMALIZED_RESIDUAL_LIMIT_1E-6',
  },
  sourceMechanism: {
    statement: 'Absolute INPUT_NODAL_COORDINATES are single-precision-like large-magnitude coordinates; subtracting them can lose short-span precision. INPUT_BASIC_ELEMENT_DATA.DELTA_X/Y/Z stores the element relative vector at the span magnitude and therefore has materially finer relative resolution.',
    independentBound: '|(xJ-xI)-DELTA| <= 0.5*ULP32(xI)+0.5*ULP32(xJ)+0.5*ULP32(DELTA) component-wise for a difference explained solely by source float32 storage.',
    topologyRule: 'Nodal coordinates remain source topology/location evidence. This audit tests DELTA only as the better-conditioned constitutive relative-vector witness for non-bend source elements.',
    bendExclusion: 'BEND_PTR elements are excluded because bend tangent/intersection geometry has separate semantics and must be qualified independently.',
  },
  sourcePrecision: {
    nonBendElementCount: precisionRecords.length,
    sourceValuesRoundTripFloat32: sourceFloat32RoundTrip,
    allCoordinateDeltaDifferencesWithinFloat32StorageBound: unexplained.length === 0,
    unexplainedSourceElementIds: unexplained.map((record) => record.sourceElementId),
    records: precisionRecords,
  },
  productionParity: {
    maxAbsResidual: productionParityMaxAbs,
    status: productionParityMaxAbs <= 1e-3 ? 'PASS' : 'FAIL',
    rule: 'Coordinate-geometry standalone evaluators must reproduce current production source actions under production endpoint DOFs before the DELTA geometry A/B replay is admissible.',
  },
  witnesses,
  gates: {
    nonBendSourceDifferenceExplainedByFloat32Storage: unexplained.length === 0 ? 'PASS' : 'FAIL',
    sourceValuesRoundTripFloat32: sourceFloat32RoundTrip ? 'PASS' : 'FAIL',
    productionParity: productionParityMaxAbs <= 1e-3 ? 'PASS' : 'FAIL',
    e78NoMismatchControlIsInvariant: controlGeometryEquivalent ? 'PASS' : 'FAIL',
    e79E80E81DeltaGeometryImprovesTargetPlane: affectedImprove ? 'PASS' : 'FAIL',
    e79DeltaGeometryAloneClosesExisting10PercentGate:
      e79.caesarReplay.deltaGeometry.zMyPlaneMaxNormalizedComponent <= 0.1 ? 'PASS' : 'FAIL',
  },
  classification: unexplained.length === 0
    && sourceFloat32RoundTrip
    && productionParityMaxAbs <= 1e-3
    && controlGeometryEquivalent
    && affectedImprove
    ? 'NONBEND_DELTA_VECTOR_SUPPORTED_AS_BETTER_CONDITIONED_CONSTITUTIVE_GEOMETRY_WITNESS'
    : 'NONBEND_DELTA_GEOMETRY_AUTHORITY_NOT_YET_ESTABLISHED',
  qualificationBoundary: e79.caesarReplay.deltaGeometry.zMyPlaneMaxNormalizedComponent > 0.1
    ? 'E79 retains a residual remainder after DELTA geometry; do not claim geometry is the only remaining rigid-plane mechanism.'
    : 'E79 target plane closes the existing comparison gate under DELTA geometry.',
  falsificationRule: 'Reject DELTA as a constitutive geometry authority if non-bend coordinate/delta differences are not explained by source storage precision, if the current coordinate evaluator fails production parity, if the zero-mismatch E78 control changes, or if DELTA geometry worsens the precision-affected E79/E80/E81 target-plane CAESAR replay.',
  nextGate: 'BUILD_COHERENT_TREE_RELATIVE_GEOMETRY_FROM_DELTA_WITH_NODAL_COORDINATES_AS_ABSOLUTE_ANCHOR_THEN_RUN_CANONICAL_AND_FULL_L19_AB_REPLAY_BEFORE_ANY_PRODUCTION_ACCEPTANCE',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 element DELTA geometry custody audit: ${output.classification}`);

function sourcePrecisionRecord(row) {
  const from = requireCoordinateMm(coordinateMm, row.FROM_NODE);
  const to = requireCoordinateMm(coordinateMm, row.TO_NODE);
  const coordinateVectorMm = to.map((value, index) => value - from[index]);
  const deltaVectorMm = [Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)];
  const differenceMm = coordinateVectorMm.map((value, index) => value - deltaVectorMm[index]);
  const storageBoundMm = differenceMm.map((_value, index) =>
    0.5 * float32Ulp(from[index])
    + 0.5 * float32Ulp(to[index])
    + 0.5 * float32Ulp(deltaVectorMm[index]));
  const explained = differenceMm.every((value, index) =>
    Math.abs(value) <= storageBoundMm[index] + 1e-12);
  const dominantIndex = dominantComponentIndex(deltaVectorMm);
  const coordinateUlpMm = Math.max(float32Ulp(from[dominantIndex]), float32Ulp(to[dominantIndex]));
  const deltaUlpMm = float32Ulp(deltaVectorMm[dominantIndex]);
  return {
    sourceElementId: String(row.ELEMENTID),
    fromNode: String(row.FROM_NODE),
    toNode: String(row.TO_NODE),
    coordinateVectorMm,
    deltaVectorMm,
    differenceMm,
    storageBoundMm,
    coordinateDeltaDifferenceExplainedByFloat32Storage: explained,
    sourceValuesRoundTripFloat32: [...from, ...to, ...deltaVectorMm].every(roundTripsFloat32),
    dominantComponent: ['X', 'Y', 'Z'][dominantIndex],
    dominantCoordinateUlpMm: coordinateUlpMm,
    dominantDeltaUlpMm: deltaUlpMm,
    relativeVectorPrecisionAdvantage: deltaUlpMm === 0 ? null : coordinateUlpMm / deltaUlpMm,
    coordinateLengthMm: Math.hypot(...coordinateVectorMm),
    deltaLengthMm: Math.hypot(...deltaVectorMm),
    lengthDifferenceMm: Math.hypot(...coordinateVectorMm) - Math.hypot(...deltaVectorMm),
  };
}

function auditWitness(row) {
  assert.equal(Number(row.BEND_PTR), 0);
  assert.equal(Number(row.REDUCER_PTR), 0);
  const fromNode = String(row.FROM_NODE);
  const toNode = String(row.TO_NODE);
  const coordinateEvaluator = buildEvaluator(row, 'COORDINATE');
  const deltaEvaluator = buildEvaluator(row, 'DELTA');
  const entityId = sourceResultElementId(row);
  const productionBoundary = boundaryDofVector(productionRows, [fromNode, toNode]);
  const caesarBoundary = boundaryDofVector(referenceRows, [fromNode, toNode]);
  const productionAction = actionVector(productionRows, entityId);
  const referenceAction = actionVector(referenceRows, entityId);
  const coordinateProductionAction = coordinateEvaluator(productionBoundary);
  const parityResidual = subtract(coordinateProductionAction, productionAction);
  const coordinateReplay = replayRecord(coordinateEvaluator(caesarBoundary), referenceAction);
  const deltaReplay = replayRecord(deltaEvaluator(caesarBoundary), referenceAction);
  const precision = precisionRecords.find((record) => record.sourceElementId === String(row.ELEMENTID));
  if (!precision) throw new TypeError(`Missing precision record E${row.ELEMENTID}.`);
  return {
    sourceElementId: String(row.ELEMENTID),
    fromNode,
    toNode,
    kind: Number(row.RIGID_PTR) > 0 ? 'RIGID' : 'PLAIN_FRAME',
    productionParity: {
      maxAbsResidual: Math.max(...parityResidual.map(Math.abs)),
      residual: parityResidual,
    },
    geometry: {
      coordinateLengthMm: precision.coordinateLengthMm,
      deltaLengthMm: precision.deltaLengthMm,
      lengthDifferenceMm: Math.abs(precision.lengthDifferenceMm),
      coordinateVectorMm: precision.coordinateVectorMm,
      deltaVectorMm: precision.deltaVectorMm,
      differenceMm: precision.differenceMm,
      storageBoundMm: precision.storageBoundMm,
      relativeVectorPrecisionAdvantage: precision.relativeVectorPrecisionAdvantage,
    },
    caesarReplay: {
      coordinateGeometry: coordinateReplay,
      deltaGeometry: deltaReplay,
      zMyPlaneNormalizedL2Ratio:
        deltaReplay.zMyPlaneNormalizedL2 / Math.max(coordinateReplay.zMyPlaneNormalizedL2, 1e-30),
    },
  };
}

function replayRecord(action, referenceAction) {
  const residual = subtract(action, referenceAction);
  const scales = actionScales(referenceAction, pkg.profile.tolerances);
  const normalized = normalize(residual, scales);
  const planeNormalized = Z_MY_PLANE.map((index) => normalized[index]);
  return {
    action,
    residual,
    normalizedResidualL2: Math.hypot(...normalized),
    maxNormalizedComponent: Math.max(...normalized.map(Math.abs)),
    zMyPlaneResidual: Z_MY_PLANE.map((index) => residual[index]),
    zMyPlaneNormalizedResidual: planeNormalized,
    zMyPlaneNormalizedL2: Math.hypot(...planeNormalized),
    zMyPlaneMaxNormalizedComponent: Math.max(...planeNormalized.map(Math.abs)),
  };
}

function buildEvaluator(row, geometryAuthority) {
  const points = geometryPoints(row, geometryAuthority);
  const axesResult = resolveFrameLocalAxes({
    nodeI: points.I,
    nodeJ: points.J,
    referenceVector: [0, 0, 1],
    profile: FRAME_LOCAL_AXIS_PROFILE,
  });
  const transformation = frameTransformationMatrix(axesResult.axes);
  const length = distance(points.I, points.J);
  const physical = annularSection(row);
  const material = materialState(row);
  const isRigid = Number(row.RIGID_PTR) > 0;
  const section = isRigid ? rigidStiffnessSection(physical) : physical;
  const stiffness = frameLocalStiffness({
    elasticModulus: material.elasticModulus,
    shearModulus: material.shearModulus,
    area: section.area,
    secondMomentY: section.secondMomentY,
    secondMomentZ: section.secondMomentZ,
    polarMoment: section.polarMoment,
    length,
    shearDeformation: true,
    shearCorrectionFactorY: 0.5,
    shearCorrectionFactorZ: 0.5,
  }).matrix;
  const lineWeight = isRigid
    ? rigidLineWeight({
        row,
        physical,
        length,
        enteredRigidWeight: rigidDeclarationWeight(row),
        gravityAcceleration: pkg.profile.linearSolve.gravityAcceleration,
      })
    : ordinaryPipeLineWeight(row, physical, pkg.profile.linearSolve.gravityAcceleration);
  const equivalentLocal = lineWeight === 0
    ? new Array(12).fill(0)
    : gravityVector({ axes: axesResult.axes, length, lineWeight });
  const pressureForce = isRigid
    ? rigidBourdonAxialForce(row, physical.innerDiameter)
    : physicalPressureAxialForce(row, physical, material.elasticModulus);
  const initialLocal = new Array(12).fill(0);
  initialLocal[0] = -pressureForce;
  initialLocal[6] = pressureForce;
  return (globalDof) => recover(stiffness, transformation, globalDof, equivalentLocal, initialLocal);
}

function geometryPoints(row, authority) {
  if (authority === 'COORDINATE') {
    return {
      I: requireCoordinateMm(coordinateMm, row.FROM_NODE).map((value) => value * MM_TO_M),
      J: requireCoordinateMm(coordinateMm, row.TO_NODE).map((value) => value * MM_TO_M),
    };
  }
  if (authority === 'DELTA') {
    return {
      I: [0, 0, 0],
      J: [Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)]
        .map((value) => value * MM_TO_M),
    };
  }
  throw new TypeError(`Unknown geometry authority ${authority}.`);
}

function recover(stiffness, transformation, displacementGlobal, equivalentLocal, initialLocal) {
  const localDof = transformDisplacementToLocal(displacementGlobal, transformation);
  const elasticLocal = multiply12(stiffness, localDof);
  const actionLocal = elasticLocal.map((value, index) =>
    value - equivalentLocal[index] - initialLocal[index]);
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

function rigidStiffnessSection(physical) {
  const wallThickness = RIGID_WALL_MULTIPLIER * physical.wallThickness;
  const outerDiameter = physical.innerDiameter + 2 * wallThickness;
  return {
    outerDiameter,
    wallThickness,
    innerDiameter: physical.innerDiameter,
    ...annulusProperties(outerDiameter, physical.innerDiameter),
  };
}

function rigidBourdonAxialForce(row, innerDiameter) {
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  const insideArea = Math.PI * innerDiameter ** 2 / 4;
  return (1 - 2 * poissonRatio) * pressure * insideArea;
}

function physicalPressureAxialForce(row, section, elasticModulus) {
  const strain = closedEndPressureAxialStrain(row, elasticModulus);
  return elasticModulus * section.area * strain;
}

function rigidDeclarationWeight(row) {
  const declaration = pkg.model.tables.INPUT_RIGIDS.rows.find((candidate) =>
    Number(candidate.RIGID_PTR) === Number(row.RIGID_PTR));
  if (!declaration) throw new TypeError(`Missing INPUT_RIGIDS pointer ${row.RIGID_PTR}.`);
  return Number(declaration.RIGID_WGT);
}

function rigidLineWeight({ row, physical, length, enteredRigidWeight, gravityAcceleration }) {
  if (!(enteredRigidWeight > 0)) return 0;
  const fluidArea = Math.PI * physical.innerDiameter ** 2 / 4;
  const fluidWeight = density(row.FLUID_DENSITY) * fluidArea * length * gravityAcceleration;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOutsideDiameter = physical.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI
    * (insulatedOutsideDiameter ** 2 - physical.outerDiameter ** 2) / 4;
  const insulationWeight = RIGID_INSULATION_WEIGHT_MULTIPLIER
    * density(row.INSUL_DENSITY) * insulationArea * length * gravityAcceleration;
  return (enteredRigidWeight + fluidWeight + insulationWeight) / length;
}

function ordinaryPipeLineWeight(row, section, gravityAcceleration) {
  const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOutsideDiameter = section.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI
    * (insulatedOutsideDiameter ** 2 - section.outerDiameter ** 2) / 4;
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
  return {
    outerDiameter,
    wallThickness,
    innerDiameter,
    ...annulusProperties(outerDiameter, innerDiameter),
  };
}

function annulusProperties(outerDiameter, innerDiameter) {
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return {
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

function closedEndPressureAxialStrain(row, elasticModulus) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return (1 - 2 * poissonRatio) * pressure * innerDiameter ** 2
    / (elasticModulus * (outerDiameter ** 2 - innerDiameter ** 2));
}

function sourceCoordinateMmIndex(rows) {
  const out = new Map();
  for (const row of rows) {
    setCoordinateMm(out, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]);
    setCoordinateMm(out, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]);
  }
  return out;
}

function setCoordinateMm(index, id, values) {
  const point = values.map(Number);
  const key = String(id);
  const prior = index.get(key);
  if (prior) {
    assert.ok(distance(prior, point) <= 1e-7, `Coordinate drift at ${key}.`);
  } else {
    index.set(key, point);
  }
}

function requireCoordinateMm(index, id) {
  const point = index.get(String(id));
  if (!point) throw new TypeError(`Missing coordinate ${id}.`);
  return point;
}

function float32Ulp(value) {
  const magnitude = Math.abs(Number(value));
  if (!Number.isFinite(magnitude)) throw new TypeError('float32Ulp requires a finite value.');
  if (magnitude === 0) return 2 ** -149;
  const exponent = Math.floor(Math.log2(magnitude));
  if (exponent < -126) return 2 ** -149;
  return 2 ** (exponent - 23);
}

function roundTripsFloat32(value) {
  return Object.is(Math.fround(Number(value)), Number(value));
}

function dominantComponentIndex(vector) {
  let index = 0;
  for (let candidate = 1; candidate < vector.length; candidate += 1) {
    if (Math.abs(vector[candidate]) > Math.abs(vector[index])) index = candidate;
  }
  return index;
}

function actionVector(rows, entityId) {
  const quantities = [
    ['GLOBAL_END_FORCE_FROM', 'FX'], ['GLOBAL_END_FORCE_FROM', 'FY'], ['GLOBAL_END_FORCE_FROM', 'FZ'],
    ['GLOBAL_END_MOMENT_FROM', 'MX'], ['GLOBAL_END_MOMENT_FROM', 'MY'], ['GLOBAL_END_MOMENT_FROM', 'MZ'],
    ['GLOBAL_END_FORCE_TO', 'FX'], ['GLOBAL_END_FORCE_TO', 'FY'], ['GLOBAL_END_FORCE_TO', 'FZ'],
    ['GLOBAL_END_MOMENT_TO', 'MX'], ['GLOBAL_END_MOMENT_TO', 'MY'], ['GLOBAL_END_MOMENT_TO', 'MZ'],
  ];
  return quantities.map(([quantity, component]) => requireElementResult(rows, entityId, quantity, component));
}

function requireElementResult(rows, entityId, quantity, component) {
  const row = rows.find((entry) =>
    entry.entityKind === 'ELEMENT'
    && entry.entityId === entityId
    && entry.quantity === quantity
    && entry.component === component);
  if (!row) throw new TypeError(`Missing ${entityId} ${quantity}:${component}.`);
  return Number(row.value);
}

function boundaryDofVector(rows, nodeIds) {
  return nodeIds.flatMap((nodeId) => DOFS.map((dof) => {
    const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
    const row = rows.find((entry) =>
      entry.entityKind === 'NODE'
      && String(entry.entityId) === String(nodeId)
      && entry.quantity === quantity
      && entry.component === dof);
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

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function requireSourceRow(index, id) {
  const row = index.get(String(id));
  if (!row) throw new TypeError(`Missing source row ${id}.`);
  return row;
}

function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('Canonical package required.');
  }
  assert.equal(value.source.sha256, EXPECTED_SOURCE_SHA256);
  assert.equal(value.cases.find((entry) => entry.caseId === 'L19')?.formula, 'W+P1');
}

function density(value) {
  return Number(value) * KG_PER_CM3_TO_KG_PER_M3;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normalize(residual, scales) {
  return residual.map((value, index) => value / scales[index]);
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function multiply12(matrix, vector) {
  return new Array(12).fill(0).map((_unused, row) => {
    let sum = 0;
    for (let column = 0; column < 12; column += 1) {
      sum += matrix[row * 12 + column] * vector[column];
    }
    return sum;
  });
}

function parseArgs(argv) {
  const result = { package: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid argument near ${String(key)}.`);
    }
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
