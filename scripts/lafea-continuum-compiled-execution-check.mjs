#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  calculateLocalContinuum,
} from '../src/core/local-continuum/index.js';
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
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';
import { triangleSource } from './lafea.3-fixtures.mjs';

const fixture = parityFixture();
assert.equal(fixture.compiled.sourceModel.modelIdentity, fixture.canonical.modelIdentity);
assert.deepEqual(fixture.compiled.sourceModel.elementTypePolicy, fixture.canonical.elementTypePolicy);
assert.equal(fixture.compiled.executionAuthorized, false);
assert.equal(fixture.compiled.releaseQualified, false);

const legacy = calculateLocalContinuum(fixture.canonical);
const parity = executeLafeaContinuumCompiledForParity(fixture.compiled);
const parityAgain = executeLafeaContinuumCompiledForParity(fixture.compiled);
assert.equal(legacy.qualification.state, 'ACCEPTED');
assert.equal(parity.qualificationState, 'ACCEPTED');
assert.equal(parity.mode, 'PARITY_ONLY_NOT_RETAINED');
assert.equal(parity.lifecycleExecutionPublished, false);
assert.equal(parity.lifecycleRecoveryPublished, false);
assert.equal(parity.releaseQualified, false);
assert.equal(parity.solverModelHash, fixture.compiled.solverModelHash);
assert.deepEqual(parity, parityAgain, 'same compiled model must execute deterministically');
assert.deepEqual(numericalProjection(parity.executionResult), numericalProjection(legacy));

const payloadTamper = clone(fixture.compiled);
payloadTamper.attachments.find((row) => row.attachmentId === 'F1').payload.extra = 1;
reseal(payloadTamper);
expectCode(
  () => executeLafeaContinuumCompiledForParity(payloadTamper),
  'LAFEA_CONTINUUM_COMPILED_ATTACHMENT_PAYLOAD_INVALID',
);

const caseSpecificRestraint = clone(fixture.compiled);
caseSpecificRestraint.attachments.find((row) => row.attachmentId === 'FIX-A').physicalCaseIds = ['L1'];
reseal(caseSpecificRestraint);
expectCode(
  () => executeLafeaContinuumCompiledForParity(caseSpecificRestraint),
  'LAFEA_CONTINUUM_COMPILED_CASE_SPECIFIC_RESTRAINT_UNSUPPORTED',
);

const authorityTamper = clone(fixture.compiled);
authorityTamper.executionAuthorized = true;
reseal(authorityTamper);
expectCode(
  () => executeLafeaContinuumCompiledForParity(authorityTamper),
  'LAFEA_CONTINUUM_COMPILED_AUTHORITY_STATE_INVALID',
);
const compilerTamper = clone(fixture.compiled); compilerTamper.compilerRevision = 'INCOMPATIBLE'; reseal(compilerTamper);
expectCode(() => executeLafeaContinuumCompiledForParity(compilerTamper), 'LAFEA_CONTINUUM_COMPILED_COMPILER_IDENTITY_INVALID');

// Domain-first TEMPERATURE attachments still provide a temperature delta, not
// the already-authorized canonical thermalStrain. No governed alpha/reference-
// temperature material mapping exists on this path yet, so it remains
// deliberately fail-closed even though direct local-continuum thermalStrain is
// independently qualified by the kernel tests.
const temperatureDelta = clone(fixture.compiled);
temperatureDelta.attachments.push({
  attachmentId: 'TEMP', kind: 'TEMPERATURE', targetType: 'REGION', targetId: 'REGION-1',
  physicalCaseIds: ['L1'], payload: { value: 50, unit: 'C' },
  compiledTarget: {
    targetType: 'REGION', featureId: 'REGION-1', nodeIds: [], edgeNodePaths: [],
    elementIds: temperatureDelta.elements.map((row) => row.elementId),
  },
});
reseal(temperatureDelta);
expectCode(
  () => executeLafeaContinuumCompiledForParity(temperatureDelta),
  'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED',
);

const workbench = executeThroughWorkbench();
assert.equal(workbench.parity.qualificationState, 'ACCEPTED');
assert.equal(workbench.executionBefore, null);
assert.equal(workbench.executionAfter, null);
assert.equal(workbench.releaseBefore, 'RELEASE_NOT_QUALIFIED');
assert.equal(workbench.releaseAfter, 'RELEASE_NOT_QUALIFIED');
assert.equal(workbench.parity.lifecycleExecutionPublished, false);
assert.equal(workbench.parity.releaseQualified, false);

console.log(JSON.stringify({
  schema: 'lafea-continuum-compiled-execution-check/v1',
  check: 'lafea-continuum-compiled-execution',
  status: 'PASS',
  stageId: 'LAFEA.3',
  existingNumericalKernelReused: true,
  legacyCompiledNumericalParity: true,
  deterministicCompiledExecution: true,
  compilerIdentityFailsClosed: true,
  directCanonicalThermalStrainKernelQualifiedSeparately: true,
  temperatureDeltaFailsClosedWithoutThermalExpansionAuthority: true,
  workbenchParityConsumerIntegrated: true,
  authoritativeRunChanged: false,
  lifecycleExecutionPublished: false,
  releaseAuthorityChanged: false,
}));

function parityFixture() {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(triangleSource());
  const canonical = composition.canonicalize(source);
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'STAGE12B-PARITY');
  const geometry = triangleGeometry();
  const domain = sourceEquivalentDomain(authority.sourceHash, geometry);
  const geometryEvidence = geometryEvidenceFor(authority.sourceHash, domain, geometry);
  const profile = meshProfile('T3', 100);
  const meshEvidence = meshEvidenceFor(
    authority.sourceHash, domain, geometry, sourceT3Mesh(), profile,
  );
  const compiled = compileLafeaContinuumSolverModel({
    sourceAuthority: authority,
    source,
    canonicalInput: canonical,
    analysisDomain: domain,
    geometryEvidence,
    meshEvidence,
  });
  return { source, canonical, authority, geometry, domain, geometryEvidence, meshEvidence, compiled };
}

function executeThroughWorkbench() {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(triangleSource());
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'STAGE12B-WORKBENCH');
  const geometry = triangleGeometry();
  const domain = sourceEquivalentDomain(authority.sourceHash, geometry);
  const geometryEvidence = geometryEvidenceFor(authority.sourceHash, domain, geometry);
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3', initialDocument: source, initialSourceHash: authority.sourceHash,
  });
  try {
    store.activateDomainFirstProfile();
    assert.equal(store.registerAnalysisDomain(domain).projection.state, 'CURRENT_PASS');
    assert.equal(store.registerAnalysisGeometryEvidence(geometryEvidence).projection.state, 'CURRENT_PASS');
    store.bindAnalysisMeshProfile(meshProfile('T6', 25));
    assert.equal(store.generateAnalysisMesh().evidence.qualification, 'PASS');
    const before = store.getState().stages['LAFEA.3'];
    const parity = store.executeContinuumCompiledForParity();
    const after = store.getState().stages['LAFEA.3'];
    return {
      parity,
      executionBefore: before.execution,
      executionAfter: after.execution,
      releaseBefore: before.lifecycleReadiness.releaseState,
      releaseAfter: after.lifecycleReadiness.releaseState,
    };
  } finally {
    store.destroy();
  }
}

function sourceEquivalentDomain(sourceHash, geometry) {
  const allCases = ['L1', 'L2'];
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash,
    applicationRef: 'STAGE12B/SOURCE_EQUIVALENT_DOMAIN',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'REGION-1', materialRef: 'MAT' },
    physicalCases: allCases.map((caseId) => ({ caseId })),
    attachments: [
      attachment('FIX-A', 'RESTRAINT', 'VERTEX', 'A', allCases, { ux: true, uy: true }),
      attachment('FIX-B-Y', 'RESTRAINT', 'VERTEX', 'B', allCases, { uy: true }),
      attachment('F1', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L1'], { fx: 1000, fy: 0, unit: 'N' }),
      attachment('F2', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L2'], { fx: -500, fy: 0, unit: 'N' }),
    ],
  }, geometry);
}

function triangleGeometry() {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'TRIANGLE-DOMAIN', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm', orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'A', x: 0, y: 0 },
      { vertexId: 'B', x: 100, y: 0 },
      { vertexId: 'C', x: 0, y: 100 },
    ],
    segments: [line('S1', 'A', 'B'), line('S2', 'B', 'C'), line('S3', 'C', 'A')],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
  });
}

function sourceT3Mesh() {
  return {
    schema: 'lafea-analysis-mesh/v1', meshIdentity: 'STAGE12B-SOURCE-T3',
    nodes: [node('A', 0, 0), node('B', 100, 0), node('C', 0, 100)],
    elements: [{ elementId: 'E1', elementType: 'T3', nodeIds: ['A', 'B', 'C'] }],
  };
}

function geometryEvidenceFor(sourceHash, domain, geometry) {
  return createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3', sourceHash, analysisDomain: domain, geometry,
    producerRef: 'STAGE12B/GEOMETRY', profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
}

function meshEvidenceFor(sourceHash, domain, geometry, mesh, profile) {
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  return createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.3', sourceHash,
    analysisDomainHash: domain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    meshProfile: profile,
    mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.3', authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT', producerRef: 'STAGE12B/PARITY-MESH',
      sourceHash, analysisDomainHash: domain.semanticHash,
      analysisGeometryHash: geometry.semanticHash, meshProfileHash: profile.semanticHash,
      meshHash, capabilityHash: hash('CAPABILITY'), qualificationHash: hash('QUALIFICATION'),
      planHash: hash('PLAN'),
    },
  });
}

function meshProfile(element, globalTargetSize) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `STAGE12B-${element}`,
    sourceRevision: '12B.2', semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: element,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
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

function reseal(model) {
  delete model.solverModelHash;
  model.solverModelHash = canonicalLafeaSha256({
    schema: 'lafea-continuum-solver-model-hash-input/v1', model,
  });
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function node(nodeId, x, y) { return { nodeId, x, y, z: 0 }; }
function hash(value) { return canonicalLafeaSha256({ schema: 'stage12b-test-hash/v1', value }); }
function clone(value) { return structuredClone(value); }
function expectCode(action, code) {
  assert.throws(action, (error) => error?.code === code, `expected ${code}`);
}
