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

const oracle = loadB02ExpectedCase('CONT-CYL-01');
const { inputs, derived, acceptance } = oracle;
const Ri = inputs.innerRadiusMm;
const Ro = inputs.outerRadiusMm;
const internalPressure = inputs.internalPressureMPa;
const E = inputs.elasticModulusMPa;
const nu = inputs.poissonRatio;
const thickness = inputs.thicknessMm;
const A = derived.A_MPa;
const B = derived.B_MPa_mm2;

function lameSigmaR(radius) { return A - B / radius ** 2; }
function lameSigmaTheta(radius) { return A + B / radius ** 2; }

const levelDefinitions = [
  { levelId: 'L1', radialElements: 2, circumferentialElements: 4 },
  { levelId: 'L2', radialElements: 4, circumferentialElements: 8 },
  { levelId: 'L3', radialElements: 8, circumferentialElements: 16 },
];
const levels = levelDefinitions.map((level) => ({
  ...level,
  ...solveSector(level.radialElements, level.circumferentialElements),
}));
const observations = levels.map((level) => ({
  levelId: level.levelId,
  radialElements: level.radialElements,
  circumferentialElements: level.circumferentialElements,
  qualificationState: level.result.qualification.state,
  maxNormalizedFieldError: maxNormalizedError(level),
  semanticHashes: semanticHashes(level.result),
}));
const errors = observations.map((row) => row.maxNormalizedFieldError);
const checks = [
  check('ALL_LEVELS_ACCEPTED', observations.every((row) => row.qualificationState === QUALIFICATION_STATES.ACCEPTED)),
  check('LEVEL_2_IMPROVES', errors[1] < errors[0], { actual: errors[1], reference: errors[0] }),
  check('LEVEL_3_IMPROVES', errors[2] < errors[1], { actual: errors[2], reference: errors[1] }),
  check(
    'FINE_FIELD_ERROR_WITHIN_LIMIT',
    errors[2] < acceptance.finestMaxNormalizedFieldErrorLimit,
    { actual: errors[2], limit: acceptance.finestMaxNormalizedFieldErrorLimit },
  ),
];
const passed = checks.every((row) => row.accepted);
const evidence = {
  schema: 'lafea3-bm-s-s1-case-evidence/v1',
  benchmarkId: 'BM-S',
  benchmarkStage: 'S1',
  caseId: oracle.caseId,
  oracleRef: 'validation/lafea-benchmark-data/B02/oracle/expected-values.json#CONT-CYL-01',
  oracleCitation: oracle.citation,
  productionOutputGeneratedExpectedValues: false,
  fixedProbeRichardsonGciAuthority: acceptance.fixedProbeIsRichardsonGciAuthority,
  movingFieldMaximumRichardsonGciAuthority: acceptance.movingFieldMaximumIsRichardsonGciAuthority,
  observations,
  checks,
  status: passed ? 'PASS' : 'FAIL',
  releaseQualified: false,
};
writeBmSCaseEvidence('LAFEA_BM_S_CONT_CYL_REPORT_PATH', evidence);

console.log(`CONT-CYL-01 error by refinement level: ${errors.map((value) => `${(value * 100).toFixed(3)}%`).join(' -> ')}`);
assert.ok(passed, `CONT-CYL-01 benchmark failed: ${checks.filter((row) => !row.accepted).map((row) => row.checkId).join(', ')}`);
console.log('LAFEA.3 CONT-CYL-01 benchmark (pressurized thick cylinder vs. cited Lamé closed form) passed.');

function solveSector(radialElements, circumferentialElements) {
  const { nodes, elements } = mappedAnnulusSectorQ8(
    Ri,
    Ro,
    Math.PI / 2,
    radialElements,
    circumferentialElements,
  );
  const nodesById = new Map(nodes.map((row) => [row.nodeId, row]));
  const constraints = [];
  nodes.forEach((row) => {
    if (Math.abs(row.y) < 1e-6) constraints.push(constraint(row.nodeId, 'UY', 0));
    if (Math.abs(row.x) < 1e-6) constraints.push(constraint(row.nodeId, 'UX', 0));
  });
  const innerEdges = boundaryEdgesWhere(
    elements,
    nodesById,
    (node) => Math.hypot(node.x, node.y) <= Ri + 1e-6,
  );
  assert.ok(innerEdges.length > 0, 'inner-radius boundary edges must be found');
  const pressureLoads = innerEdges.map((edge, index) => ({
    pressureLoadId: `P${index}`,
    elementId: edge.elementId,
    edgeNodeIds: edge.edgeNodeIds,
    pressure: internalPressure,
    sourceReference: `PRESSURE#P${index}`,
  }));
  const model = {
    schema: 'local-continuum-model/v1',
    modelIdentity: 'CONT_CYL_01',
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
    elementTypePolicy: { allowT3Fallback: false, sourceReference: 'CONT_CYL_01_Q8_DEFAULT' },
    constraints,
    loadCases: [{
      loadCaseId: 'INTERNAL_PRESSURE',
      nodalForces: [], edgeTractions: [], pressureLoads,
      bodyForces: [], temperatureLoads: [], imposedDisplacements: [],
      sourceReference: 'CASE#INTERNAL_PRESSURE',
    }],
    resultRequests: { loadCaseIds: ['INTERNAL_PRESSURE'] },
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

function maxNormalizedError({ result, canonicalNodes }) {
  const nodesById = new Map(canonicalNodes.map((row) => [row.nodeId, row]));
  let maxError = 0;
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
      const sigmaRadial = sigmaX * cos ** 2 + sigmaY * sin ** 2 + 2 * tauXY * sin * cos;
      const sigmaHoop = sigmaX * sin ** 2 + sigmaY * cos ** 2 - 2 * tauXY * sin * cos;
      maxError = Math.max(
        maxError,
        Math.abs(sigmaRadial - lameSigmaR(radius)) / internalPressure,
        Math.abs(sigmaHoop - lameSigmaTheta(radius)) / internalPressure,
      );
    });
  });
  return maxError;
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
