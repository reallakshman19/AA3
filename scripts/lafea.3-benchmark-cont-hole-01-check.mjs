import assert from 'node:assert/strict';
import {
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
  q8ShapeFunctionsAndDerivatives,
  QUALIFICATION_STATES,
} from '../src/core/local-continuum/index.js';
import { boundaryEdgesWhere, mappedAnnulusSectorQ8 } from './lafea.3-benchmark-mesh-adapter.mjs';
import {
  loadB02ExpectedCase,
  semanticHashes,
  writeBmSCaseEvidence,
} from './lib/lafea.3-bm-s-evidence.mjs';

const oracle = loadB02ExpectedCase('CONT-HOLE-01');
const { inputs, derived, acceptance } = oracle;
const a = inputs.holeRadiusMm;
const R = inputs.outerTruncationRadiusMm;
const S = inputs.remoteStressMPa;
const E = inputs.elasticModulusMPa;
const nu = inputs.poissonRatio;
const thickness = inputs.thicknessMm;
const expectedKt = derived.holeEdge.stressConcentrationFactor;

function kirschPolar(radius, angle) {
  const a2 = (a / radius) ** 2;
  const a4 = (a / radius) ** 4;
  return {
    sigmaRR: (S / 2) * (1 - a2)
      + (S / 2) * (1 - 4 * a2 + 3 * a4) * Math.cos(2 * angle),
    sigmaTT: (S / 2) * (1 + a2)
      - (S / 2) * (1 + 3 * a4) * Math.cos(2 * angle),
    sigmaRT: -(S / 2) * (1 + 2 * a2 - 3 * a4) * Math.sin(2 * angle),
  };
}

const levelDefinitions = [
  { levelId: 'L1', radialElements: 3, circumferentialElements: 6 },
  { levelId: 'L2', radialElements: 6, circumferentialElements: 12 },
  { levelId: 'L3', radialElements: 10, circumferentialElements: 20 },
];
const levels = levelDefinitions.map((level) => ({
  ...level,
  ...solveQuarter(level.radialElements, level.circumferentialElements),
}));
const observations = levels.map((level) => ({
  levelId: level.levelId,
  radialElements: level.radialElements,
  circumferentialElements: level.circumferentialElements,
  qualificationState: level.result.qualification.state,
  nearHoleGaussPeakFactor: peakHoopFactorNearHole(level),
  maxNormalizedFieldError: maxNormalizedFieldError(level),
  semanticHashes: semanticHashes(level.result),
}));
const peakFactors = observations.map((row) => row.nearHoleGaussPeakFactor);
const peakErrors = peakFactors.map((factor) => Math.abs(factor - expectedKt) / expectedKt);
const fieldErrors = observations.map((row) => row.maxNormalizedFieldError);
const checks = [
  check('ALL_LEVELS_ACCEPTED', observations.every((row) => row.qualificationState === QUALIFICATION_STATES.ACCEPTED)),
  check('HOLE_FACTOR_IMPROVES', peakErrors[2] < peakErrors[0], { actual: peakErrors[2], reference: peakErrors[0] }),
  check(
    'FINE_HOLE_FACTOR_WITHIN_LIMIT',
    peakErrors[2] < acceptance.finestHoleEdgeFactorRelativeErrorLimit,
    { actual: peakErrors[2], limit: acceptance.finestHoleEdgeFactorRelativeErrorLimit },
  ),
  check('LEVEL_2_FIELD_IMPROVES', fieldErrors[1] < fieldErrors[0], { actual: fieldErrors[1], reference: fieldErrors[0] }),
  check('LEVEL_3_FIELD_IMPROVES', fieldErrors[2] < fieldErrors[1], { actual: fieldErrors[2], reference: fieldErrors[1] }),
  check(
    'FINE_FIELD_ERROR_WITHIN_LIMIT',
    fieldErrors[2] < acceptance.finestMaxNormalizedFieldErrorLimit,
    { actual: fieldErrors[2], limit: acceptance.finestMaxNormalizedFieldErrorLimit },
  ),
];
const passed = checks.every((row) => row.accepted);
const evidence = {
  schema: 'lafea3-bm-s-s1-case-evidence/v1',
  benchmarkId: 'BM-S',
  benchmarkStage: 'S1',
  caseId: oracle.caseId,
  oracleRef: 'validation/lafea-benchmark-data/B02/oracle/expected-values.json#CONT-HOLE-01',
  oracleCitation: oracle.citation,
  productionOutputGeneratedExpectedValues: false,
  expectedStressConcentrationFactor: expectedKt,
  fixedProbeRichardsonGciAuthority: acceptance.fixedProbeIsRichardsonGciAuthority,
  movingPeakOrFieldMaximumRichardsonGciAuthority: acceptance.movingPeakOrFieldMaximumIsRichardsonGciAuthority,
  observations,
  checks,
  status: passed ? 'PASS' : 'FAIL',
  releaseQualified: false,
};
writeBmSCaseEvidence('LAFEA_BM_S_CONT_HOLE_REPORT_PATH', evidence);

console.log(`CONT-HOLE-01 near-hole Gauss peak factor by level: ${peakFactors.map((value) => value.toFixed(4)).join(' -> ')} (Kirsch boundary Kt: ${expectedKt})`);
console.log(`CONT-HOLE-01 full-field error by level: ${fieldErrors.map((value) => `${(value * 100).toFixed(3)}%`).join(' -> ')}`);
assert.ok(passed, `CONT-HOLE-01 benchmark failed: ${checks.filter((row) => !row.accepted).map((row) => row.checkId).join(', ')}`);
console.log('LAFEA.3 CONT-HOLE-01 benchmark (Kirsch circular hole vs. cited closed form) passed.');

function solveQuarter(radialElements, circumferentialElements) {
  const { nodes, elements } = mappedAnnulusSectorQ8(
    a,
    R,
    Math.PI / 2,
    radialElements,
    circumferentialElements,
    40,
  );
  const nodesById = new Map(nodes.map((row) => [row.nodeId, row]));
  const constraints = [];
  nodes.forEach((row) => {
    if (Math.abs(row.y) < 1e-6) constraints.push(constraint(row.nodeId, 'UY', 0));
    if (Math.abs(row.x) < 1e-6) constraints.push(constraint(row.nodeId, 'UX', 0));
  });
  const outerEdges = boundaryEdgesWhere(
    elements,
    nodesById,
    (node) => Math.hypot(node.x, node.y) >= R * 0.9,
  );
  assert.ok(outerEdges.length > 0, 'outer-radius boundary edges must be found');
  const edgeTractions = outerEdges.map((edge, index) => {
    const midNode = nodesById.get(edge.edgeNodeSequence[1]);
    const angle = Math.atan2(midNode.y, midNode.x);
    const { sigmaRR, sigmaRT } = kirschPolar(R, angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      tractionId: `T${index}`,
      elementId: edge.elementId,
      edgeNodeIds: edge.edgeNodeIds,
      tx: sigmaRR * cos - sigmaRT * sin,
      ty: sigmaRR * sin + sigmaRT * cos,
      sourceReference: `TRACTION#T${index}`,
    };
  });
  const model = {
    schema: 'local-continuum-model/v1',
    modelIdentity: 'CONT_HOLE_01',
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: 'BENCHMARK', sourceVersion: '1',
      adapterIdentity: 'LAFEA3_BENCHMARK', adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: inputs.formulation,
    materials: [{
      materialId: 'MAT', elasticModulus: E, poissonRatio: nu, sourceReference: 'MATERIAL#MAT',
    }],
    nodes: nodes.map((row) => ({
      nodeId: row.nodeId, x: row.x, y: row.y, sourceReference: `NODE#${row.nodeId}`,
    })),
    elements: elements.map((row) => ({
      elementId: row.elementId,
      elementType: row.elementType,
      nodeIds: row.nodeIds,
      materialId: 'MAT',
      thickness,
      sourceReference: `ELEMENT#${row.elementId}`,
    })),
    elementTypePolicy: { allowT3Fallback: false, sourceReference: 'CONT_HOLE_01_Q8_DEFAULT' },
    constraints,
    loadCases: [{
      loadCaseId: 'REMOTE_TENSION',
      nodalForces: [], edgeTractions, pressureLoads: [],
      bodyForces: [], temperatureLoads: [], imposedDisplacements: [],
      sourceReference: 'CASE#REMOTE_TENSION',
    }],
    resultRequests: { loadCaseIds: ['REMOTE_TENSION'] },
    qualificationProfile: {
      schema: 'local-continuum-qualification-profile/v1',
      identity: 'BENCHMARK_PROFILE',
      tolerances: toleranceTable(),
    },
    limitations: [],
  };
  const canonical = createCanonicalLocalContinuumModel(model);
  return { result: calculateLocalContinuum(canonical), canonicalNodes: canonical.nodes };
}

function peakHoopFactorNearHole({ result, canonicalNodes }) {
  let peak = 0;
  forEachGaussPoint(result, canonicalNodes, ({ radius, sigmaHoop }) => {
    if (radius > 1.35 * a) return;
    peak = Math.max(peak, sigmaHoop);
  });
  return peak / S;
}

function maxNormalizedFieldError({ result, canonicalNodes }) {
  let maxError = 0;
  forEachGaussPoint(result, canonicalNodes, ({
    radius, angle, sigmaRadial, sigmaHoop, sigmaShear,
  }) => {
    const expected = kirschPolar(radius, angle);
    maxError = Math.max(
      maxError,
      Math.abs(sigmaRadial - expected.sigmaRR) / S,
      Math.abs(sigmaHoop - expected.sigmaTT) / S,
      Math.abs(sigmaShear - expected.sigmaRT) / S,
    );
  });
  return maxError;
}

function forEachGaussPoint(result, canonicalNodes, visit) {
  const nodesById = new Map(canonicalNodes.map((row) => [row.nodeId, row]));
  result.loadCaseResults[0].elementResults.forEach((elementResult, elementIndex) => {
    const elementNodes = result.meshEvidence.elementEvidence[elementIndex].nodeIds
      .map((id) => nodesById.get(id));
    elementResult.gaussPointResults.forEach((gp) => {
      const { N } = q8ShapeFunctionsAndDerivatives(gp.xi, gp.eta);
      let x = 0;
      let y = 0;
      N.forEach((value, index) => {
        x += value * elementNodes[index].x;
        y += value * elementNodes[index].y;
      });
      const radius = Math.hypot(x, y);
      const cos = x / radius;
      const sin = y / radius;
      const { sigmaX, sigmaY, tauXY } = gp.stress;
      visit({
        radius,
        angle: Math.atan2(y, x),
        sigmaRadial: sigmaX * cos ** 2 + sigmaY * sin ** 2 + 2 * tauXY * sin * cos,
        sigmaHoop: sigmaX * sin ** 2 + sigmaY * cos ** 2 - 2 * tauXY * sin * cos,
        sigmaShear: (sigmaY - sigmaX) * sin * cos + tauXY * (cos ** 2 - sin ** 2),
      });
    });
  });
}

function check(checkId, accepted, details = {}) {
  return { checkId, accepted, ...details };
}

function constraint(nodeId, dof, value) {
  return {
    constraintId: `${nodeId}-${dof}`,
    nodeId,
    dof,
    value,
    sourceReference: `CONSTRAINT#${nodeId}-${dof}`,
  };
}

function toleranceTable() {
  const tight = { absolute: 1e-9, relative: 1e-9 };
  const loose = { absolute: 1e-4, relative: 1e-4 };
  return {
    minimumElementArea: tight,
    stiffnessSymmetry: tight,
    constitutiveSymmetry: tight,
    choleskyPivot: tight,
    freeDofResidual: loose,
    reactionEquilibrium: loose,
    strainEnergy: loose,
    rigidBodyStrain: tight,
    patchTestStress: tight,
  };
}
