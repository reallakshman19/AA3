#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  FRAME_LOCAL_AXIS_PROFILE,
  resolveFrameLocalAxes,
} from '../src/core/centerline-beam-fea/index.js';
import {
  distributedLoadLocalVector,
  frameLocalStiffness,
  frameTransformationMatrix,
  thermalInitialStrainVector,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  compileTenCylinderReducerAuthority,
  sealReducerCondensationRequest,
} from '../src/core/linear-fea-reducer-condensation/index.js';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const KAPPA = 0.5;
const KAPPA_SOURCE = 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2';
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-reducer-pressure-shear-audit.mjs --package <canonical-package.json> [--out <json>]');
}
const benchmarkPackage = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(benchmarkPackage);
const sourceRows = new Map(benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
  .map((row) => [String(row.ELEMENTID), row]));
const reducerRows = new Map(benchmarkPackage.model.tables.INPUT_REDUCERS.rows
  .map((row) => [Number(row.RED_PTR), row]));
const coordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);
const referenceRows = benchmarkPackage.references.L19.rows;
const displacementIndex = referenceDisplacementIndex(referenceRows);
const toleranceProfile = benchmarkPackage.profile.tolerances;

runCanonicalGuards();

const reducerSourceIds = ['11', '16'];
const elements = reducerSourceIds.map((sourceElementId) => auditReducer({
  benchmarkPackage,
  row: requireSourceRow(sourceRows, sourceElementId),
  declaration: reducerRows.get(Number(requireSourceRow(sourceRows, sourceElementId).REDUCER_PTR)),
  coordinates,
  displacementIndex,
  referenceRows,
  toleranceProfile,
}));

const output = {
  schema: 'lfea-issue947-reducer-pressure-shear-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: benchmarkPackage.source.sha256,
  sourceAuthorities: {
    reducerGeometry: 'HEXAGON_CAESAR_II_TEN_SUCCESSIVELY_CHANGING_PIPE_CYLINDERS',
    pressureTranslation: 'CAESAR_BOURDON_ACTIVE_STRAIGHT_PIPE_AXIAL_ELONGATION',
    pipeShear: { kappa: KAPPA, source: KAPPA_SOURCE },
  },
  governingPressureStrain: 'epsilon_p=(1-2*nu)*p*Di^2/[E*(Do^2-Di^2)]',
  governingRecovery: 'q_global=T^T[K_condensed*(T*d_global)-f_gravity_condensed-f_pressure_condensed]',
  referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_UPDATE_RULE',
  canonicalGuards: {
    uniformReducerStiffnessIdentity: 'PASS',
    uniformReducerPressureInitialLoadIdentity: 'PASS',
    taperedReducerFreePressureGrowthZeroBoundaryAction: 'PASS',
    currentEbNoPressureReconstructionMatchesProductionAuthority: 'PASS_PER_BM4_ELEMENT',
  },
  elements,
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('Issue 947 reducer pressure/shear constitutive audit PASS');

function auditReducer(input) {
  const row = input.row;
  if (!(Number(row.REDUCER_PTR) > 0) || !input.declaration) {
    throw new TypeError(`Source element ${row.ELEMENTID} does not have a reducer declaration.`);
  }
  const nodeI = String(row.FROM_NODE);
  const nodeJ = String(row.TO_NODE);
  const pointI = requireCoordinate(input.coordinates, nodeI);
  const pointJ = requireCoordinate(input.coordinates, nodeJ);
  const axesResult = resolveFrameLocalAxes({ nodeI: pointI, nodeJ: pointJ, referenceVector: [0, 0, 1], profile: FRAME_LOCAL_AXIS_PROFILE });
  const transformation = frameTransformationMatrix(axesResult.axes);
  const displacementGlobal = [
    ...referenceNodeDisplacement(input.displacementIndex, nodeI),
    ...referenceNodeDisplacement(input.displacementIndex, nodeJ),
  ];
  const displacementLocal = transformDisplacementToLocal(displacementGlobal, transformation);
  const referenceGlobal = referenceSourceAction(input.referenceRows, row);
  const fromSection = sectionFromRow(row);
  const toSection = {
    outerDiameter: Number(input.declaration.DIAMETER2) * MM_TO_M,
    wallThickness: Number(input.declaration.THICKNESS2) > 0
      ? Number(input.declaration.THICKNESS2) * MM_TO_M
      : fromSection.wallThickness,
  };
  const material = materialState(row);
  const length = axesResult.elementDirection.length;
  const gravityDirectionLocal = projectToLocal(axesResult.axes, [0, -1, 0]);
  const common = {
    length,
    fromSection,
    toSection,
    material,
    gravity: {
      enabled: true,
      acceleration: input.benchmarkPackage.profile.linearSolve.gravityAcceleration,
      directionLocal: gravityDirectionLocal,
      fluidDensity: density(row.FLUID_DENSITY),
      insulationThickness: Number(row.INSUL_THICK) * MM_TO_M,
      insulationDensity: density(row.INSUL_DENSITY),
    },
    pressure: Number(row.PRESSURE1) * KPA_TO_PA,
  };

  const variants = Object.fromEntries([
    ['CURRENT_EB_NO_PRESSURE', { shearDeformation: false, includePressure: false }],
    ['EB_WITH_PRESSURE', { shearDeformation: false, includePressure: true }],
    ['TIMOSHENKO_NO_PRESSURE', { shearDeformation: true, includePressure: false }],
    ['TIMOSHENKO_WITH_PRESSURE', { shearDeformation: true, includePressure: true }],
  ].map(([name, variant]) => {
    const condensed = compileIndependentReducer({ ...common, ...variant });
    return [name, evaluateCondensed({
      condensed,
      displacementLocal,
      transformation,
      referenceGlobal,
      toleranceProfile: input.toleranceProfile,
    })];
  }));

  const production = compileTenCylinderReducerAuthority(sealReducerCondensationRequest({
    schema: REDUCER_CONDENSATION_REQUEST_SCHEMA,
    reducerId: `ISSUE947-E${row.ELEMENTID}-CURRENT-AUTHORITY`,
    length,
    fromSection,
    toSection,
    segmentCount: REDUCER_SEGMENT_COUNT,
    samplingRule: REDUCER_SAMPLING_RULE,
    material: {
      elasticModulus: material.elasticModulus,
      shearModulus: material.shearModulus,
      massDensity: material.massDensity,
      thermalExpansionCoefficient: input.benchmarkPackage.profile.linearSolve.thermalExpansionCoefficientPerKelvin,
    },
    frame: {
      shearDeformation: true,
      shearCorrectionFactorY: KAPPA,
      shearCorrectionFactorZ: KAPPA,
      source: KAPPA_SOURCE,
    },
    pressure: {
      enabled: true,
      pressure: common.pressure,
      poissonRatio: material.poissonRatio,
      ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
      source: input.benchmarkPackage.profile.linearSolve.bourdonPressureEffects.source,
    },
    gravity: common.gravity,
    thermal: {
      installationTemperature: input.benchmarkPackage.model.installationTemperatureK,
      operatingTemperature: input.benchmarkPackage.model.installationTemperatureK,
    },
    sourceEvidence: {
      sourceId: `ISSUE947-E${row.ELEMENTID}-CURRENT-AUTHORITY`,
      sourceRevision: input.benchmarkPackage.source.sha256,
      sourceSemanticHash: semanticHash({ sourceElementId: String(row.ELEMENTID), source: input.benchmarkPackage.source.sha256 }),
    },
    semanticHash: '',
  }));
  compareVector(
    variants.TIMOSHENKO_WITH_PRESSURE.localStiffness,
    production.condensed.localStiffness,
    `E${row.ELEMENTID} production reducer stiffness`,
    2e-8,
  );
  compareVector(
    variants.TIMOSHENKO_WITH_PRESSURE.gravityLocal,
    production.condensed.gravityLocalVector,
    `E${row.ELEMENTID} production reducer gravity`,
    2e-8,
  );
  compareVector(
    variants.TIMOSHENKO_WITH_PRESSURE.pressureLocal,
    production.condensed.pressureInitialStrainLocalVector,
    `E${row.ELEMENTID} production reducer pressure`,
    2e-8,
  );

  return {
    sourceElementId: String(row.ELEMENTID),
    reducerPointer: Number(row.REDUCER_PTR),
    nodeI,
    nodeJ,
    lengthM: length,
    fromSection,
    toSection,
    pressurePa: common.pressure,
    variants,
    bestDiagnosticVariant: Object.entries(variants)
      .map(([name, result]) => ({ name, maxAbsNormalizedResidual: result.maxAbsNormalizedResidual, normalizedResidualL2: result.normalizedResidualL2 }))
      .sort((a, b) => a.normalizedResidualL2 - b.normalizedResidualL2)[0],
  };
}

function compileIndependentReducer(input) {
  const segmentLength = input.length / REDUCER_SEGMENT_COUNT;
  const size = (REDUCER_SEGMENT_COUNT + 1) * 6;
  const K = matrix(size);
  const gravity = new Array(size).fill(0);
  const pressure = new Array(size).fill(0);
  const directionNorm = Math.hypot(...input.gravity.directionLocal);
  const direction = input.gravity.directionLocal.map((value) => value / directionNorm);
  let freePressureGrowth = 0;
  const segments = [];
  for (let index = 0; index < REDUCER_SEGMENT_COUNT; index += 1) {
    const fraction = (index + 0.5) / REDUCER_SEGMENT_COUNT;
    const section = annulus(
      lerp(input.fromSection.outerDiameter, input.toSection.outerDiameter, fraction),
      lerp(input.fromSection.wallThickness, input.toSection.wallThickness, fraction),
    );
    const stiffness = frameLocalStiffness({
      elasticModulus: input.material.elasticModulus,
      shearModulus: input.material.shearModulus,
      area: section.area,
      secondMomentY: section.secondMoment,
      secondMomentZ: section.secondMoment,
      polarMoment: 2 * section.secondMoment,
      length: segmentLength,
      shearDeformation: input.shearDeformation,
      ...(input.shearDeformation ? { shearCorrectionFactorY: KAPPA, shearCorrectionFactorZ: KAPPA } : {}),
    }).matrix;
    addElementMatrix(K, stiffness, index, index + 1);
    const metalLineWeight = input.material.massDensity * section.area * input.gravity.acceleration;
    const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
    const fluidLineWeight = input.gravity.fluidDensity * fluidArea * input.gravity.acceleration;
    const insulatedOd = section.outerDiameter + 2 * input.gravity.insulationThickness;
    const insulationArea = Math.PI * (insulatedOd ** 2 - section.outerDiameter ** 2) / 4;
    const insulationLineWeight = input.gravity.insulationDensity * insulationArea * input.gravity.acceleration;
    const lineWeight = input.gravity.enabled ? metalLineWeight + fluidLineWeight + insulationLineWeight : 0;
    const intensity = { fx: direction[0] * lineWeight, fy: direction[1] * lineWeight, fz: direction[2] * lineWeight };
    const gravityLocal = distributedLoadLocalVector({
      primitive: { kind: 'DISTRIBUTED_LOAD', basis: 'ELEMENT_LOCAL', startIntensity: intensity, endIntensity: intensity },
      axes: null,
      length: segmentLength,
      phiXY: 0,
      phiXZ: 0,
    });
    addElementVector(gravity, gravityLocal, index, index + 1);
    const pressureStrain = closedEndPressureAxialStrainFromSection(section, input.pressure, input.material.elasticModulus, input.material.poissonRatio);
    freePressureGrowth += pressureStrain * segmentLength;
    if (input.includePressure) {
      const pressureLocal = thermalInitialStrainVector({
        elasticModulus: input.material.elasticModulus,
        area: section.area,
        axialStrain: pressureStrain,
      });
      addElementVector(pressure, pressureLocal, index, index + 1);
    }
    segments.push({ fraction, section, pressureStrain });
  }
  const condensed = condense(K, { gravity, pressure });
  return {
    localStiffness: condensed.stiffness,
    gravityLocal: condensed.loads.gravity,
    pressureLocal: input.includePressure ? condensed.loads.pressure : new Array(12).fill(0),
    freePressureGrowth,
    segments,
  };
}

function evaluateCondensed(input) {
  const elasticLocal = multiplyFlat12(input.condensed.localStiffness, input.displacementLocal);
  const actionLocal = elasticLocal.map((value, index) => value - input.condensed.gravityLocal[index] - input.condensed.pressureLocal[index]);
  const actionGlobal = transformLoadToGlobal(actionLocal, input.transformation);
  const residualGlobal = actionGlobal.map((value, index) => value - input.referenceGlobal[index]);
  const normalizedResidual = normalizedActionResidual(residualGlobal, input.referenceGlobal, input.toleranceProfile);
  return {
    localStiffness: input.condensed.localStiffness,
    gravityLocal: input.condensed.gravityLocal,
    pressureLocal: input.condensed.pressureLocal,
    freePressureGrowthM: input.condensed.freePressureGrowth,
    actionGlobal,
    residualGlobal,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: Math.max(...normalizedResidual.map(Math.abs)),
  };
}

function runCanonicalGuards() {
  const E = 200e9;
  const nu = 0.3;
  const G = E / (2 * (1 + nu));
  const uniformInput = {
    length: 1.5,
    fromSection: { outerDiameter: 0.32385, wallThickness: 0.0127 },
    toSection: { outerDiameter: 0.32385, wallThickness: 0.0127 },
    material: { elasticModulus: E, shearModulus: G, poissonRatio: nu, massDensity: 7850 },
    gravity: { enabled: false, acceleration: 9.80665, directionLocal: [0, -1, 0], fluidDensity: 0, insulationThickness: 0, insulationDensity: 0 },
    pressure: 5e6,
    shearDeformation: true,
    includePressure: true,
  };
  const condensed = compileIndependentReducer(uniformInput);
  const section = annulus(uniformInput.fromSection.outerDiameter, uniformInput.fromSection.wallThickness);
  const direct = frameLocalStiffness({
    elasticModulus: E,
    shearModulus: G,
    area: section.area,
    secondMomentY: section.secondMoment,
    secondMomentZ: section.secondMoment,
    polarMoment: 2 * section.secondMoment,
    length: uniformInput.length,
    shearDeformation: true,
    shearCorrectionFactorY: KAPPA,
    shearCorrectionFactorZ: KAPPA,
  }).matrix;
  compareVector(condensed.localStiffness, direct, 'uniform Timoshenko reducer stiffness identity', 3e-8);
  const epsilon = closedEndPressureAxialStrainFromSection(section, uniformInput.pressure, E, nu);
  const directPressure = thermalInitialStrainVector({ elasticModulus: E, area: section.area, axialStrain: epsilon });
  compareVector(condensed.pressureLocal, directPressure, 'uniform reducer pressure initial-load identity', 3e-8);
  const freeDof = new Array(12).fill(0);
  freeDof[6] = condensed.freePressureGrowth;
  const action = multiplyFlat12(condensed.localStiffness, freeDof)
    .map((value, index) => value - condensed.pressureLocal[index]);
  assert.ok(Math.max(...action.map(Math.abs)) <= 1e-5, `Uniform reducer free pressure state did not recover zero action: ${Math.max(...action.map(Math.abs))}.`);

  const tapered = compileIndependentReducer({
    ...uniformInput,
    toSection: { outerDiameter: 0.1683, wallThickness: 0.01097 },
  });
  const taperedFreeDof = new Array(12).fill(0);
  taperedFreeDof[6] = tapered.freePressureGrowth;
  const taperedAction = multiplyFlat12(tapered.localStiffness, taperedFreeDof)
    .map((value, index) => value - tapered.pressureLocal[index]);
  assert.ok(Math.max(...taperedAction.map(Math.abs)) <= 1e-4, `Tapered reducer free pressure state did not recover zero boundary action: ${Math.max(...taperedAction.map(Math.abs))}.`);
}

function condense(K, loads) {
  const boundary = [...Array.from({ length: 6 }, (_, index) => index), ...Array.from({ length: 6 }, (_, index) => 60 + index)];
  const internal = Array.from({ length: 54 }, (_, index) => 6 + index);
  const Kbb = submatrix(K, boundary, boundary);
  const Kbi = submatrix(K, boundary, internal);
  const Kib = submatrix(K, internal, boundary);
  const Kii = submatrix(K, internal, internal);
  const X = solveColumns(Kii, Kib);
  const condensedK = subtractMatrix(Kbb, multiply(Kbi, X));
  const condensedLoads = {};
  for (const [name, full] of Object.entries(loads)) {
    const fb = subvector(full, boundary);
    const fi = subvector(full, internal);
    const yi = solveDense(Kii, fi);
    const correction = multiplyVector(Kbi, yi);
    condensedLoads[name] = fb.map((value, index) => value - correction[index]);
  }
  return { stiffness: flattenSymmetric(condensedK), loads: condensedLoads };
}
function matrix(size) { return Array.from({ length: size }, () => new Array(size).fill(0)); }
function addElementMatrix(global, local, nodeI, nodeJ) {
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let i = 0; i < 12; i += 1) for (let j = 0; j < 12; j += 1) global[map[i]][map[j]] += local[i * 12 + j];
}
function addElementVector(global, local, nodeI, nodeJ) {
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let i = 0; i < 12; i += 1) global[map[i]] += local[i];
}
function submatrix(A, rows, cols) { return rows.map((i) => cols.map((j) => A[i][j])); }
function subvector(v, rows) { return rows.map((i) => v[i]); }
function solveDense(A, rhs) {
  const n = A.length;
  const M = A.map((row, i) => [...row, rhs[i]]);
  for (let p = 0; p < n; p += 1) {
    let best = p;
    for (let r = p + 1; r < n; r += 1) if (Math.abs(M[r][p]) > Math.abs(M[best][p])) best = r;
    if (!(Math.abs(M[best][p]) > 1e-18)) throw new Error('Diagnostic reducer matrix is singular.');
    [M[p], M[best]] = [M[best], M[p]];
    const d = M[p][p];
    for (let c = p; c <= n; c += 1) M[p][c] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === p) continue;
      const f = M[r][p];
      if (f === 0) continue;
      for (let c = p; c <= n; c += 1) M[r][c] -= f * M[p][c];
    }
  }
  return M.map((row) => row[n]);
}
function multiply(A, B) {
  return A.map((row) => B[0].map((_x, j) => row.reduce((sum, value, k) => sum + value * B[k][j], 0)));
}
function multiplyVector(A, x) { return A.map((row) => row.reduce((sum, value, i) => sum + value * x[i], 0)); }
function solveColumns(A, B) {
  const out = Array.from({ length: A.length }, () => new Array(B[0].length).fill(0));
  for (let c = 0; c < B[0].length; c += 1) {
    const x = solveDense(A, B.map((row) => row[c]));
    for (let r = 0; r < A.length; r += 1) out[r][c] = x[r];
  }
  return out;
}
function subtractMatrix(A, B) { return A.map((row, i) => row.map((value, j) => value - B[i][j])); }
function flattenSymmetric(A) {
  const out = [];
  for (let i = 0; i < A.length; i += 1) for (let j = 0; j < A.length; j += 1) out.push((A[i][j] + A[j][i]) / 2);
  return out;
}
function multiplyFlat12(A, x) {
  return new Array(12).fill(0).map((_unused, i) => {
    let sum = 0;
    for (let j = 0; j < 12; j += 1) sum += A[i * 12 + j] * x[j];
    return sum;
  });
}
function compareVector(actual, expected, label, relativeTolerance) {
  assert.equal(actual.length, expected.length, `${label} length`);
  for (let i = 0; i < actual.length; i += 1) {
    const scale = Math.max(1, Math.abs(actual[i]), Math.abs(expected[i]));
    assert.ok(Math.abs(actual[i] - expected[i]) <= relativeTolerance * scale, `${label}[${i}]: ${actual[i]} != ${expected[i]}`);
  }
}
function annulus(outerDiameter, wallThickness) {
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return { outerDiameter, wallThickness, innerDiameter, area, secondMoment };
}
function closedEndPressureAxialStrainFromSection(section, pressure, E, nu) {
  return (1 - 2 * nu) * pressure * section.innerDiameter ** 2
    / (E * (section.outerDiameter ** 2 - section.innerDiameter ** 2));
}
function lerp(a, b, f) { return a + f * (b - a); }
function projectToLocal(axes, vector) { return [axes.x, axes.y, axes.z].map((axis) => axis[0]*vector[0] + axis[1]*vector[1] + axis[2]*vector[2]); }
function density(value) { const n = Number(value); return n > 0 ? n * KG_PER_CM3_TO_KG_PER_M3 : 0; }
function sectionFromRow(row) { return { outerDiameter: Number(row.DIAMETER) * MM_TO_M, wallThickness: Number(row.WALL_THICK) * MM_TO_M }; }
function materialState(row) {
  const elasticModulus = Number(row.MODULUS) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return { elasticModulus, poissonRatio, shearModulus: elasticModulus/(2*(1+poissonRatio)), massDensity: density(row.PIPE_DENSITY) };
}
function evaluateScaleFloor(quantity, toleranceProfile) { return Number(toleranceProfile[quantity].scaleFloor); }
function normalizedActionResidual(residual, reference, toleranceProfile) {
  const quantities = [
    ...new Array(3).fill('GLOBAL_END_FORCE_FROM'), ...new Array(3).fill('GLOBAL_END_MOMENT_FROM'),
    ...new Array(3).fill('GLOBAL_END_FORCE_TO'), ...new Array(3).fill('GLOBAL_END_MOMENT_TO'),
  ];
  return residual.map((value, i) => value / Math.max(Math.abs(reference[i]), evaluateScaleFloor(quantities[i], toleranceProfile)));
}
function referenceSourceAction(rows, row) {
  const entityId = `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}|${String(row.ELEMENT_NAME ?? '').trim()}`;
  const index = new Map(rows.filter((entry) => entry.entityKind === 'ELEMENT' && entry.entityId === entityId)
    .map((entry) => [`${entry.quantity}:${entry.component}`, Number(entry.value)]));
  const value = (q, c) => { const v = index.get(`${q}:${c}`); if (!Number.isFinite(v)) throw new TypeError(`${entityId} lacks ${q}:${c}.`); return v; };
  return [
    ...FORCE_COMPONENTS.map((c) => value('GLOBAL_END_FORCE_FROM', c)), ...MOMENT_COMPONENTS.map((c) => value('GLOBAL_END_MOMENT_FROM', c)),
    ...FORCE_COMPONENTS.map((c) => value('GLOBAL_END_FORCE_TO', c)), ...MOMENT_COMPONENTS.map((c) => value('GLOBAL_END_MOMENT_TO', c)),
  ];
}
function referenceDisplacementIndex(rows) { return new Map(rows.filter((r) => r.entityKind === 'NODE' && ['DISPLACEMENT','ROTATION'].includes(r.quantity)).map((r) => [`${r.entityId}:${r.component}`, Number(r.value)])); }
function referenceNodeDisplacement(index, nodeId) { return DOFS.map((dof) => { const v=index.get(`${nodeId}:${dof}`); if (!Number.isFinite(v)) throw new TypeError(`L19 lacks ${nodeId}:${dof}.`); return v; }); }
function sourceCoordinateIndex(rows) {
  const out = new Map();
  for (const r of rows) { setCoordinate(out,r.FROM_NODE,[r.FROM_NODE_X,r.FROM_NODE_Y,r.FROM_NODE_Z]); setCoordinate(out,r.TO_NODE,[r.TO_NODE_X,r.TO_NODE_Y,r.TO_NODE_Z]); }
  return out;
}
function setCoordinate(index,nodeId,mm) { const id=String(nodeId); const p=mm.map((v)=>Number(v)*MM_TO_M); const prior=index.get(id); if(prior) assert.ok(Math.hypot(...prior.map((v,i)=>v-p[i]))<=1e-9); index.set(id,p); }
function requireCoordinate(index,nodeId) { const p=index.get(String(nodeId)); if(!p) throw new TypeError(`Missing node ${nodeId}`); return p; }
function requireSourceRow(index,id) { const r=index.get(String(id)); if(!r) throw new TypeError(`Missing source element ${id}`); return r; }
function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical ACCDB package required.');
  if (String(value.source?.sha256).toLowerCase() !== EXPECTED_SOURCE_SHA256) throw new TypeError(`Expected source ${EXPECTED_SOURCE_SHA256}.`);
  if (value.cases?.find((entry) => entry.caseId === 'L19')?.formula !== 'W+P1') throw new TypeError('Audit requires L19 = W+P1.');
}
function parseArgs(tokens) { const out={}; for(let i=0;i<tokens.length;i+=1){const t=tokens[i];if(!t.startsWith('--'))throw new TypeError(`Unexpected ${t}`);const n=t.slice(2),v=tokens[i+1];if(v===undefined||v.startsWith('--'))throw new TypeError(`Missing --${n}`);out[n]=v;i+=1;}return out; }
