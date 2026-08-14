#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calculateLocalContinuum } from '../src/core/local-continuum/index.js';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
  createLafeaAnalysisGeometryEvidence,
} from '../src/workspace/lafea-analysis-geometry-evidence.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
  LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
  createLafeaAnalysisGeometry,
} from '../src/workspace/lafea-analysis-geometry-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
  createLafeaContinuumAnalysisDomain,
} from '../src/workspace/lafea-continuum-analysis-domain.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { executeLafeaContinuumCompiledForParity } from '../src/workspace/lafea-continuum-compiled-execution.js';
import { compileLafeaContinuumSolverModel } from '../src/workspace/lafea-continuum-solver-model.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { triangleSource } from './lafea.3-fixtures.mjs';

const cases = [
  tractionCase(),
  pressureCase(),
  bodyForceCase(),
  imposedDisplacementCase(),
];

for (const testCase of cases) {
  const fixture = compileFixture(testCase);
  const legacy = calculateLocalContinuum(fixture.canonical);
  const parity = executeLafeaContinuumCompiledForParity(fixture.compiled);
  const repeated = executeLafeaContinuumCompiledForParity(fixture.compiled);
  assert.equal(legacy.qualification.state, 'ACCEPTED', `${testCase.kind}: legacy rejected`);
  assert.equal(parity.qualificationState, 'ACCEPTED', `${testCase.kind}: compiled rejected`);
  assert.equal(parity.mode, 'PARITY_ONLY_NOT_RETAINED');
  assert.equal(parity.lifecycleExecutionPublished, false);
  assert.equal(parity.lifecycleRecoveryPublished, false);
  assert.equal(parity.releaseQualified, false);
  assert.deepEqual(parity, repeated, `${testCase.kind}: compiled execution must be deterministic`);
  assert.deepEqual(
    numericalProjection(parity.executionResult),
    numericalProjection(legacy),
    `${testCase.kind}: legacy/compiled numerical mismatch`,
  );
}

console.log(JSON.stringify({
  schema: 'lafea-continuum-compiled-load-parity-check/v1',
  check: 'lafea-continuum-compiled-load-parity',
  status: 'PASS',
  stageId: 'LAFEA.3',
  parityKinds: cases.map((row) => row.kind),
  sameExistingNumericalKernel: true,
  deterministicCompiledExecution: true,
  lifecycleExecutionPublished: false,
  releaseAuthorityChanged: false,
  authoritativeRunChanged: false,
}));

function compileFixture(testCase) {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(testCase.source);
  const canonical = composition.canonicalize(source);
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, `STAGE12B-PARITY/${testCase.kind}`);
  const geometry = triangleGeometry();
  const caseIds = canonical.loadCases.map((row) => row.loadCaseId);
  const domain = createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: authority.sourceHash,
    applicationRef: `STAGE12B/LOAD_PARITY/${testCase.kind}`,
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'REGION-1', materialRef: 'MAT' },
    physicalCases: caseIds.map((caseId) => ({ caseId })),
    attachments: [
      attachment('FIX-A', 'RESTRAINT', 'VERTEX', 'A', caseIds, { ux: true, uy: true }),
      attachment('FIX-B-Y', 'RESTRAINT', 'VERTEX', 'B', caseIds, { uy: true }),
      ...testCase.attachments,
    ],
  }, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: authority.sourceHash, analysisDomain: domain, geometry,
    producerRef: 'STAGE12B/LOAD-PARITY-GEOMETRY',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
  const profile = meshProfile();
  const mesh = sourceT3Mesh();
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  const meshEvidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: authority.sourceHash,
    analysisDomainHash: domain.semanticHash, analysisGeometryHash: geometry.semanticHash,
    meshProfile: profile, mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.3', authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT', producerRef: 'STAGE12B/LOAD-PARITY-MESH',
      sourceHash: authority.sourceHash, analysisDomainHash: domain.semanticHash,
      analysisGeometryHash: geometry.semanticHash, meshProfileHash: profile.semanticHash,
      meshHash, capabilityHash: hash('CAPABILITY'), qualificationHash: hash('QUALIFICATION'),
      planHash: hash('PLAN'),
    },
  });
  const compiled = compileLafeaContinuumSolverModel({
    sourceAuthority: authority, source, canonicalInput: canonical,
    analysisDomain: domain, geometryEvidence, meshEvidence,
  });
  return { canonical, compiled };
}

function tractionCase() {
  const source = singleCaseSource('TRACTION');
  source.loadCases[0].edgeTractions.push({
    tractionId: 'T1', elementId: 'E1', edgeNodeIds: ['B', 'C'],
    tx: 10, ty: -2, sourceReference: 'TRACTION#T1',
  });
  return {
    kind: 'TRACTION', source,
    attachments: [attachment('T1', 'TRACTION', 'SEGMENT', 'S2', ['TRACTION'], { tx: 10, ty: -2, unit: 'MPa' })],
  };
}

function pressureCase() {
  const source = singleCaseSource('PRESSURE');
  source.loadCases[0].pressureLoads.push({
    pressureLoadId: 'P1', elementId: 'E1', edgeNodeIds: ['B', 'C'],
    pressure: 3, sourceReference: 'PRESSURE#P1',
  });
  return {
    kind: 'PRESSURE', source,
    attachments: [attachment('P1', 'PRESSURE', 'SEGMENT', 'S2', ['PRESSURE'], { pressure: 3, unit: 'MPa' })],
  };
}

function bodyForceCase() {
  const source = singleCaseSource('BODY_FORCE');
  source.loadCases[0].bodyForces.push({
    bodyForceId: 'BF1', elementId: 'E1', bx: 0.002, by: -0.004,
    sourceReference: 'BODYFORCE#BF1',
  });
  return {
    kind: 'BODY_FORCE', source,
    attachments: [attachment('BF1', 'BODY_FORCE', 'REGION', 'REGION-1', ['BODY_FORCE'], {
      bx: 0.002, by: -0.004, unit: 'N/mm^3',
    })],
  };
}

function imposedDisplacementCase() {
  const source = singleCaseSource('IMPOSED_DISPLACEMENT');
  source.loadCases[0].imposedDisplacements.push({
    imposedDisplacementId: 'D1', nodeId: 'C', dof: 'UX', value: 5,
    sourceReference: 'IMPOSED#D1',
  });
  return {
    kind: 'IMPOSED_DISPLACEMENT', source,
    attachments: [attachment('D1', 'IMPOSED_DISPLACEMENT', 'VERTEX', 'C', ['IMPOSED_DISPLACEMENT'], {
      ux: 5, unit: 'mm',
    })],
  };
}

function singleCaseSource(loadCaseId) {
  const source = triangleSource();
  source.loadCases = [{
    loadCaseId, nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
    temperatureLoads: [], imposedDisplacements: [], sourceReference: `CASE#${loadCaseId}`,
  }];
  source.resultRequests = { loadCaseIds: [loadCaseId] };
  return source;
}

function triangleGeometry() {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'TRIANGLE-DOMAIN', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm', orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'A', x: 0, y: 0 }, { vertexId: 'B', x: 100, y: 0 },
      { vertexId: 'C', x: 0, y: 100 },
    ],
    segments: [line('S1', 'A', 'B'), line('S2', 'B', 'C'), line('S3', 'C', 'A')],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
  });
}

function sourceT3Mesh() {
  return {
    schema: 'lafea-analysis-mesh/v1', meshIdentity: 'STAGE12B-LOAD-PARITY-T3',
    nodes: [node('A', 0, 0), node('B', 100, 0), node('C', 0, 100)],
    elements: [{ elementId: 'E1', elementType: 'T3', nodeIds: ['A', 'B', 'C'] }],
  };
}

function meshProfile() {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: 'STAGE12B-LOAD-PARITY-T3',
    sourceRevision: '12B.3', semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: 'T3',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: 100,
    },
  });
}

function numericalProjection(result) {
  return result.loadCaseResults.map((row) => ({
    loadCaseId: row.loadCaseId,
    nodalDisplacements: row.nodalDisplacements.map(({ nodeId, ux, uy }) => ({ nodeId, ux, uy })),
    supportReactions: row.supportReactions,
    freeDofResiduals: row.freeDofResiduals,
    equilibrium: row.equilibrium,
    totalStrainEnergy: row.totalStrainEnergy,
    elementResults: row.elementResults.map((element) => ({
      elementId: element.elementId,
      nodeIds: element.nodeIds,
      strain: element.strain,
      stress: element.stress,
      principalMaximum: element.principalMaximum,
      principalMinimum: element.principalMinimum,
      maximumInPlaneShear: element.maximumInPlaneShear,
      vonMises: element.vonMises,
      strainEnergy: element.strainEnergy,
    })),
  }));
}

function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function node(nodeId, x, y) { return { nodeId, x, y, z: 0 }; }
function hash(value) { return canonicalLafeaSha256({ schema: 'stage12b-load-parity-hash/v1', value }); }
