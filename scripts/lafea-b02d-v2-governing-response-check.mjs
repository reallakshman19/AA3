#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
} from '../src/core/local-continuum/index.js';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_B02D_POLAR_V2_PROFILE_SOURCE_REVISION,
  b02dProfileIdentityV2,
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFINITION_PATH = path.join(ROOT, 'validation/lafea-b02-definitions/B02D-lug-pinhole-v2.json');
const METHOD = 'T6';
const LEVEL_ID = 'L4';
const STAGE_ID = 'LAFEA.3';
const CASE_ID = 'LC1';

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    schema: 'lafea-b02d-v2-governing-response-observer-failure/v1',
    status: 'NOT_OBSERVED',
    message: String(error?.message ?? error).split('\n')[0].slice(0, 1000),
    b02NumericalAuthorityGranted: false,
    responseSolverRepairAuthorized: false,
    reactionEquilibriumRepairAuthorized: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  }, null, 2));
  process.exit(1);
}

function main() {
  const definition = JSON.parse(fs.readFileSync(DEFINITION_PATH, 'utf8'));
  requireFrozenDefinition(definition);
  const level = definition.globalResponseLadder.levels.find((row) => row.levelId === LEVEL_ID);
  assert.ok(level, 'B02D-V2 frozen L4 definition missing.');

  const sourceHash = canonicalLafeaSha256({
    schema: 'lafea-b02d-v2-governing-response-source-binding/v1',
    definition,
    method: METHOD,
    levelId: LEVEL_ID,
  });
  const geometry = annulusGeometry(definition);
  const meshStage = meshAuthorityStage(definition, sourceHash, geometry);
  const configuration = lafeaMeshGenerationConfiguration(v2MeshProfile(METHOD, level.h), {
    curvatureToleranceDegrees: level.curvatureToleranceDegrees,
  });
  const produced = produceLafeaAnalysisMeshEvidence(meshStage, configuration);
  assert.equal(produced.evidence.qualification, 'PASS');
  assert.equal(produced.evidence.releaseQualified, false);
  assert.equal(produced.planned.generated.strategy, 'B02D_PROBE_STABLE_POLAR_V2');
  assert.equal(produced.planned.generated.policyId, 'B02D_PROBE_STABLE_POLAR_POLICY_V2');
  assert.equal(produced.evidence.mesh.elements.every((row) => row.elementType === METHOD), true);

  const load = consistentFeatureResultant(
    produced.evidence.mesh,
    produced.planned.generated.featureMapping.loadEdges,
    definition.loadCase.resultant,
  );
  const restraintNodeIds = produced.planned.generated.featureMapping.restraintNodeIds;
  const source = canonicalSource(definition, produced.evidence.mesh, restraintNodeIds, load);
  const canonicalInput = createCanonicalLocalContinuumModel(source);
  const result = calculateLocalContinuum(canonicalInput);

  const base = {
    schema: 'lafea-b02d-v2-governing-response-observation/v1',
    status: 'OBSERVED',
    caseId: definition.caseId,
    method: METHOD,
    levelId: LEVEL_ID,
    h: level.h,
    definitionHash: canonicalLafeaSha256(definition),
    sourceHash,
    meshPolicyId: produced.planned.generated.policyId,
    meshStrategy: produced.planned.generated.strategy,
    meshHash: produced.evidence.meshHash,
    meshProfileHash: produced.evidence.meshProfileHash,
    nodeCount: produced.evidence.mesh.nodes.length,
    elementCount: produced.evidence.mesh.elements.length,
    canonicalModelHash: canonicalInput.semanticHash,
    loadResultant: load.resultant,
    loadDistribution: load.distribution,
    productionQualification: result.qualification.state,
    productionDiagnostics: result.diagnostics ?? [],
    resultSemanticHashes: result.semanticHashes ?? null,
    b02NumericalAuthorityGranted: false,
    responseSolverRepairAuthorized: false,
    reactionEquilibriumRepairAuthorized: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  };

  if (result.qualification.state !== 'ACCEPTED') {
    const code = result.diagnostics?.[0]?.code ?? 'UNKNOWN_REJECTED_RESULT';
    console.log(JSON.stringify({
      ...base,
      disposition: rejectedDisposition(code),
      governingResponseAccepted: false,
      acceptedResponseEvidence: null,
    }, null, 2));
    return;
  }

  const resultCase = result.loadCaseResults.find((row) => row.loadCaseId === CASE_ID);
  assert.ok(resultCase, 'B02D-V2 LC1 accepted result missing.');
  const acceptedResponseEvidence = acceptedEvidence(definition, result, resultCase);
  const gateFailures = frozenGateFailures(definition, acceptedResponseEvidence);
  console.log(JSON.stringify({
    ...base,
    disposition: gateFailures.length ? 'ACCEPTED_RESPONSE_GATE_FAILURE_RCA_REQUIRED' : 'GOVERNING_RESPONSE_ACCEPTED',
    governingResponseAccepted: gateFailures.length === 0,
    gateFailures,
    acceptedResponseEvidence,
  }, null, 2));
}

function acceptedEvidence(definition, result, resultCase) {
  const nodeById = new Map(result.meshEvidence.dofOrdering.map((identity) => {
    const nodeId = identity.slice(0, identity.lastIndexOf(':'));
    const node = resultCase.nodalDisplacements.find((row) => row.nodeId === nodeId);
    return [nodeId, node];
  }).filter(([, node]) => node));
  const canonicalNodes = new Map();
  for (const row of resultCase.nodalDisplacements) canonicalNodes.set(row.nodeId, row);

  const modelNodes = new Map();
  for (const row of resultCase.nodalDisplacements) modelNodes.set(row.nodeId, row);
  const coordinates = new Map();
  for (const element of result.meshEvidence.elementEvidence) {
    element.nodeIds.forEach((nodeId, index) => {
      const c = element.canonicalCoordinates?.[index];
      if (c && !coordinates.has(nodeId)) coordinates.set(nodeId, { x: c.x, y: c.y });
    });
  }
  if (!coordinates.size) {
    throw new Error('B02D_V2_ACCEPTED_RESULT_NODE_COORDINATES_UNAVAILABLE');
  }

  const forceVector = vectorFromDofs(result.meshEvidence.dofOrdering, resultCase.forceEvidence.forceVector);
  const reactionVector = vectorFromReactions(resultCase.supportReactions);
  const applied = resultant(forceVector, coordinates);
  const reaction = resultant(reactionVector, coordinates);
  const total = {
    forceX: applied.forceX + reaction.forceX,
    forceY: applied.forceY + reaction.forceY,
    momentZ: applied.momentZ + reaction.momentZ,
  };
  const targetForce = Math.max(1, Math.hypot(definition.loadCase.resultant.x, definition.loadCase.resultant.y));
  const targetMoment = Math.max(1, Math.abs(definition.loadCase.expectedMomentAboutCenter));
  const free = freeResidualSummary(resultCase.freeDofResiduals);

  return Object.freeze({
    applied,
    reaction,
    total,
    loadResultantRelativeError: Math.hypot(
      applied.forceX - definition.loadCase.resultant.x,
      applied.forceY - definition.loadCase.resultant.y,
    ) / targetForce,
    loadMomentRelativeError: Math.abs(applied.momentZ - definition.loadCase.expectedMomentAboutCenter) / targetMoment,
    totalForceRelativeResidual: Math.hypot(total.forceX, total.forceY) / targetForce,
    totalMomentRelativeResidual: Math.abs(total.momentZ) / targetMoment,
    reactionMomentRelativeError: Math.abs(
      reaction.momentZ - definition.loadCase.expectedReactionMomentAboutCenter,
    ) / targetMoment,
    freeResiduals: free,
    solverEvidence: resultCase.solverEvidence,
    solverEquilibrium: resultCase.equilibrium,
    totalStrainEnergy: resultCase.totalStrainEnergy,
  });
}

function frozenGateFailures(definition, evidence) {
  const A = definition.acceptance;
  return [
    gate('LOAD_RESULTANT', evidence.loadResultantRelativeError, A.loadResultantRelativeMaximum),
    gate('LOAD_MOMENT', evidence.loadMomentRelativeError, A.loadMomentRelativeMaximum),
    gate('FORCE_EQUILIBRIUM', evidence.totalForceRelativeResidual, A.forceEquilibriumRelativeMaximum),
    gate('MOMENT_EQUILIBRIUM', evidence.totalMomentRelativeResidual, A.momentEquilibriumRelativeMaximum),
    gate('REACTION_MOMENT', evidence.reactionMomentRelativeError, A.momentEquilibriumRelativeMaximum),
  ].filter(Boolean);
}

function gate(id, actual, limit) {
  return actual <= limit ? null : Object.freeze({ id, actual, limit });
}

function rejectedDisposition(code) {
  if (code === 'REACTION_EQUILIBRIUM_FAILURE') return 'REACTION_EQUILIBRIUM_FAILURE_RCA_REQUIRED';
  if (code === 'ITERATIVE_SOLVER_DID_NOT_CONVERGE') return 'ITERATIVE_SOLVER_FAILURE_RCA_REQUIRED';
  if (code === 'FREE_DOF_RESIDUAL_FAILURE') return 'FREE_DOF_RESIDUAL_FAILURE_RCA_REQUIRED';
  return 'OTHER_GOVERNING_RESPONSE_RCA_REQUIRED';
}

function requireFrozenDefinition(definition) {
  assert.equal(definition.schema, 'lafea-b02-frozen-benchmark-definition/v2');
  assert.equal(definition.caseId, 'B02D-V2');
  assert.equal(definition.supersedesCaseId, 'B02D');
  assert.equal(definition.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
  assert.equal(definition.productionOutputUsedToChooseDefinition, false);
  assert.equal(definition.formulation, 'PLANE_STRESS');
  assert.deepEqual(definition.globalResponseLadder.commonRequestPolicy.refinementFeatureIds, []);
}

function v2MeshProfile(method, h) {
  const fields = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: b02dProfileIdentityV2(method, h),
    sourceRevision: LAFEA_B02D_POLAR_V2_PROFILE_SOURCE_REVISION,
    semanticHash: undefined,
    fields: {
      ...fields,
      continuumElement: method,
      globalTargetSize: h,
      adjacentSizeRatioMax: 1.5,
    },
  });
}

function meshAuthorityStage(definition, sourceHash, geometry) {
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: STAGE_ID,
    sourceHash,
    applicationRef: 'B02D-V2/GOVERNING-RESPONSE',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: definition.formulation,
    region: { regionId: 'R1', materialRef: 'MAT' },
    physicalCases: [{ caseId: CASE_ID }],
    attachments: [],
  }, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1',
    stageId: STAGE_ID,
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'B02D-V2/GOVERNING-RESPONSE',
    profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return Object.freeze({
    stageId: STAGE_ID,
    sourceAuthority: Object.freeze({ stageId: STAGE_ID, sourceHash }),
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: Object.freeze({ state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash }),
    analysisGeometryProjection: Object.freeze({ state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash }),
  });
}

function canonicalSource(definition, mesh, restraintNodeIds, load) {
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `B02D_V2_${METHOD}_${mesh.meshIdentity}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: 'B02D-V2-FROZEN-DEFINITION',
      sourceVersion: 'FROZEN-DEFINITION-V2',
      adapterIdentity: 'LAFEA_B02D_V2_REGISTERED_POLAR_MESH_TO_CANONICAL_CONTINUUM',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: definition.formulation,
    materials: [{
      materialId: 'MAT',
      elasticModulus: definition.material.elasticModulus,
      poissonRatio: definition.material.poissonRatio,
      sourceReference: 'B02D-V2#FROZEN_MATERIAL',
    }],
    nodes: mesh.nodes.map((row) => ({
      nodeId: row.nodeId,
      x: row.x,
      y: row.y,
      sourceReference: `B02D_V2_POLAR_MESH#${row.nodeId}`,
    })),
    elements: mesh.elements.map((row) => ({
      elementId: row.elementId,
      elementType: row.elementType,
      nodeIds: [...row.nodeIds],
      materialId: 'MAT',
      thickness: definition.geometry.thickness,
      sourceReference: `B02D_V2_POLAR_MESH#${row.elementId}`,
    })),
    elementTypePolicy: {
      allowT3Fallback: false,
      sourceReference: 'B02D-V2#HIGH_ORDER_FAMILY_REQUIRED',
    },
    constraints: restraintNodeIds.flatMap((nodeId) => ['UX', 'UY'].map((dof) => ({
      constraintId: `B02D-V2-REST/${nodeId}/${dof}`,
      nodeId,
      dof,
      value: 0,
      sourceReference: 'B02D-V2#RADIAL_QUARTER_2_BOUNDARY_ZERO',
    }))),
    loadCases: [{
      loadCaseId: CASE_ID,
      nodalForces: load.nodalForces.map((row) => ({
        loadId: `B02D-V2-LOAD/${row.nodeId}`,
        nodeId: row.nodeId,
        fx: row.fx,
        fy: row.fy,
        sourceReference: 'B02D-V2#RADIAL_QUARTER_0_CONSISTENT_LINE_RESULTANT',
      })),
      edgeTractions: [], pressureLoads: [], bodyForces: [], temperatureLoads: [], imposedDisplacements: [],
      sourceReference: 'B02D-V2#LC1_FROZEN_RESULTANT',
    }],
    resultRequests: { loadCaseIds: [CASE_ID] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: [
      'B02D_V2_PROBE_STABLE_POLAR_GOVERNING_RESPONSE_ROUTE',
      'NO_GENERAL_INTERNAL_FEATURE_AUTHORING_AUTHORITY',
      'NO_RELEASE_AUTHORITY_FROM_GOVERNING_RESPONSE_OBSERVATION',
    ],
  };
}

function consistentFeatureResultant(mesh, edges, resultantTarget) {
  if (!Array.isArray(edges) || !edges.length) throw new TypeError('LAFEA_B02D_V2_LOAD_EDGES_REQUIRED');
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const segments = edges.map((edge) => {
    if (![2, 3].includes(edge.length)) throw new TypeError('LAFEA_B02D_V2_LOAD_EDGE_ORDER_INVALID');
    const first = nodeById.get(edge[0]);
    const last = nodeById.get(edge.at(-1));
    if (!first || !last) throw new TypeError('LAFEA_B02D_V2_LOAD_EDGE_NODE_MISSING');
    const length = Math.hypot(last.x - first.x, last.y - first.y);
    if (!(length > 0)) throw new TypeError('LAFEA_B02D_V2_LOAD_EDGE_LENGTH_INVALID');
    return { edge, length };
  });
  const totalLength = segments.reduce((sum, row) => sum + row.length, 0);
  const forceByNode = new Map();
  for (const segment of segments) {
    const weights = segment.edge.length === 2 ? [0.5, 0.5] : [1 / 6, 4 / 6, 1 / 6];
    segment.edge.forEach((nodeId, index) => {
      const fraction = segment.length / totalLength * weights[index];
      const row = forceByNode.get(nodeId) ?? { nodeId, fx: 0, fy: 0 };
      row.fx += resultantTarget.x * fraction;
      row.fy += resultantTarget.y * fraction;
      forceByNode.set(nodeId, row);
    });
  }
  const nodalForces = [...forceByNode.values()].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const recovered = nodalForces.reduce((sum, row) => {
    const node = nodeById.get(row.nodeId);
    return {
      forceX: sum.forceX + row.fx,
      forceY: sum.forceY + row.fy,
      momentZ: sum.momentZ + node.x * row.fy - node.y * row.fx,
    };
  }, { forceX: 0, forceY: 0, momentZ: 0 });
  return Object.freeze({
    nodalForces: Object.freeze(nodalForces.map(Object.freeze)),
    totalLength,
    resultant: Object.freeze(recovered),
    distribution: 'CONSISTENT_UNIFORM_LINE_RESULTANT_T2_Q3_EDGE_V1',
  });
}

function vectorFromDofs(ordering, values) {
  const vector = new Map();
  ordering.forEach((identity, index) => setDof(vector, identity, values[index]));
  return vector;
}
function vectorFromReactions(rows) {
  const vector = new Map();
  rows.forEach((row) => setDof(vector, row.dofIdentity, row.value));
  return vector;
}
function setDof(vector, identity, value) {
  const separator = identity.lastIndexOf(':');
  const nodeId = identity.slice(0, separator);
  const dof = identity.slice(separator + 1);
  const row = vector.get(nodeId) ?? { fx: 0, fy: 0 };
  if (dof === 'UX') row.fx = value;
  else if (dof === 'UY') row.fy = value;
  vector.set(nodeId, row);
}
function resultant(vector, coordinates) {
  let forceX = 0; let forceY = 0; let momentZ = 0;
  for (const [nodeId, force] of vector) {
    const node = coordinates.get(nodeId);
    if (!node) throw new Error(`B02D_V2_COORDINATE_MISSING:${nodeId}`);
    forceX += force.fx;
    forceY += force.fy;
    momentZ += node.x * force.fy - node.y * force.fx;
  }
  return Object.freeze({ forceX, forceY, momentZ });
}
function freeResidualSummary(rows) {
  const totals = { UX: 0, UY: 0 };
  let maximumAbsolute = 0;
  for (const row of rows) {
    maximumAbsolute = Math.max(maximumAbsolute, Math.abs(row.value));
    totals[row.dofIdentity.endsWith(':UX') ? 'UX' : 'UY'] += row.value;
  }
  return Object.freeze({
    maximumAbsolute,
    summedUx: totals.UX,
    summedUy: totals.UY,
    count: rows.length,
  });
}

function annulusGeometry(definition) {
  const { holeRadius: a, outerRadius: r } = definition.geometry;
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: STAGE_ID,
    geometryId: 'B02D-V2-ANNULUS',
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      vertex('OE', r, 0), vertex('ON', 0, r), vertex('OW', -r, 0), vertex('OS', 0, -r),
      vertex('HE', a, 0), vertex('HN', 0, a), vertex('HW', -a, 0), vertex('HS', 0, -a),
    ],
    segments: [
      arc('O1', 'OE', 'ON', r, 'CCW'), arc('O2', 'ON', 'OW', r, 'CCW'),
      arc('O3', 'OW', 'OS', r, 'CCW'), arc('O4', 'OS', 'OE', r, 'CCW'),
      arc('H1', 'HE', 'HS', a, 'CW'), arc('H2', 'HS', 'HW', a, 'CW'),
      arc('H3', 'HW', 'HN', a, 'CW'), arc('H4', 'HN', 'HE', a, 'CW'),
    ],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['O1', 'O2', 'O3', 'O4'] },
      { loopId: 'HOLE', role: 'HOLE', segmentIds: ['H1', 'H2', 'H3', 'H4'] },
    ],
  });
}
function vertex(vertexId, x, y) { return { vertexId, x, y }; }
function arc(segmentId, startVertexId, endVertexId, radius, sweep) {
  return { segmentId, type: 'CIRCULAR_ARC', startVertexId, endVertexId, centerX: 0, centerY: 0, radius, sweep };
}
