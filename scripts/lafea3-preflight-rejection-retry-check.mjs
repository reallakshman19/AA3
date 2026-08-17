#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
  createLafeaContinuumAnalysisDomain,
} from '../src/workspace/lafea-continuum-analysis-domain.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';
import { triangleSource } from './lafea.3-fixtures.mjs';

const FAILURE_MODE = Object.freeze({ failureMode: 'DIAGNOSTIC_UI' });

const thermal = buildWorkbench({ includeTemperature: true, generateMesh: true });
try {
  const before = thermal.store.getState().stages['LAFEA.3'];
  const beforeMeshHash = before.retainedAnalysisMeshEvidenceV2.meshHash;
  const beforeMeshArtifactHash = before.retainedAnalysisMeshEvidenceV2.artifactHash;

  assert.throws(
    () => thermal.store.prepareContinuumForRun(),
    (error) => error?.code === 'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED',
    'strict engineering preflight API must continue to throw',
  );

  const attempt = thermal.store.prepareContinuumForRun('LAFEA.3', FAILURE_MODE);
  assert.equal(attempt.attemptStatus, 'BLOCKED');
  assert.equal(attempt.changed, false);
  assert.equal(attempt.evidence, null);
  assert.equal(attempt.projection.state, 'ABSENT');
  assert.equal(
    attempt.diagnostic.code,
    'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED',
  );

  const after = thermal.store.getState();
  const stage = after.stages['LAFEA.3'];
  assert.equal(after.status, 'FAILED');
  assert.equal(after.diagnostics.length, 1);
  assert.equal(after.diagnostics[0].severity, 'ERROR');
  assert.equal(
    after.diagnostics[0].code,
    'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED',
  );
  assert.equal(stage.retainedContinuumPreflightEvidence, null);
  assert.equal(stage.execution, null);
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.retainedAnalysisMeshEvidenceV2.meshHash, beforeMeshHash);
  assert.equal(stage.retainedAnalysisMeshEvidenceV2.artifactHash, beforeMeshArtifactHash);
  assert.equal(stage.lifecycle.artifacts.EXECUTION.status, 'ABSENT');
  assert.equal(stage.lifecycle.artifacts.RECOVERY.status, 'ABSENT');
  assert.equal(stage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');
} finally {
  thermal.store.destroy();
}

const retry = buildWorkbench({ includeTemperature: false, generateMesh: false });
try {
  let state = retry.store.getState();
  let stage = state.stages['LAFEA.3'];
  assert.equal(stage.retainedAnalysisMeshEvidenceV2, null);
  assert.equal(stage.preparationProjection.state, 'ABSENT');

  const firstAttempt = retry.store.prepareContinuumForRun('LAFEA.3', FAILURE_MODE);
  assert.equal(firstAttempt.attemptStatus, 'BLOCKED');
  assert.equal(firstAttempt.changed, false);
  assert.equal(firstAttempt.evidence, null);
  assert.equal(
    firstAttempt.diagnostic.code,
    'LAFEA_CONTINUUM_SOLVER_ANALYSIS_MESH_NOT_CURRENT_PASS',
  );

  state = retry.store.getState();
  assert.equal(state.status, 'FAILED');
  assert.equal(
    state.diagnostics[0].code,
    'LAFEA_CONTINUUM_SOLVER_ANALYSIS_MESH_NOT_CURRENT_PASS',
  );
  stage = state.stages['LAFEA.3'];
  assert.equal(stage.retainedContinuumPreflightEvidence, null);
  assert.equal(stage.execution, null);

  const generated = retry.store.generateAnalysisMesh();
  assert.equal(generated?.evidence?.qualification, 'PASS');
  const generatedMeshHash = generated.evidence.meshHash;

  state = retry.store.getState();
  assert.notEqual(state.status, 'FAILED');
  assert.equal(state.diagnostics.length, 0);
  stage = state.stages['LAFEA.3'];
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.retainedAnalysisMeshEvidenceV2.meshHash, generatedMeshHash);
  assert.equal(stage.retainedContinuumPreflightEvidence, null);

  const secondAttempt = retry.store.prepareContinuumForRun('LAFEA.3', FAILURE_MODE);
  assert.equal(secondAttempt.attemptStatus, 'PASS');
  assert.equal(secondAttempt.diagnostic, null);
  assert.equal(secondAttempt.projection.state, 'CURRENT_PASS');
  assert.equal(secondAttempt.projection.usableForAuthorization, true);

  state = retry.store.getState();
  assert.notEqual(state.status, 'FAILED');
  assert.equal(state.diagnostics.length, 0);
  stage = state.stages['LAFEA.3'];
  assert.equal(stage.retainedContinuumPreflightEvidence.meshHash, generatedMeshHash);
  assert.equal(stage.retainedContinuumPreflightEvidence.solverExecuted, false);
  assert.equal(stage.retainedContinuumPreflightEvidence.executionAuthorized, true);
  assert.equal(stage.orchestration.sections.AUTHORIZATION.state, 'READY');
  assert.equal(stage.execution, null);
} finally {
  retry.store.destroy();
}

assert.throws(
  () => buildInvalidOptionsWorkbench(),
  (error) => error?.message === 'LAFEA_CONTINUUM_PREFLIGHT_OPTIONS_INVALID',
  'unknown UI failure-mode contracts must fail closed',
);

const controllerSource = await readFile(
  new URL('../src/workspace/lafea-workbench-controller.js', import.meta.url),
  'utf8',
);
assert.match(
  controllerSource,
  /onPrepareContinuum:\s*\(\)\s*=>\s*this\.attemptContinuumPreflight\(\)/u,
  'visible preflight control must use the diagnostic-safe controller path',
);
assert.match(
  controllerSource,
  /attemptContinuumPreflight\([\s\S]*failureMode:\s*'DIAGNOSTIC_UI'/u,
  'controller attempt path must select DIAGNOSTIC_UI failure semantics',
);
assert.match(
  controllerSource,
  /prepareContinuumForRun\([\s\S]*this\.store\.prepareContinuumForRun\(s\);/u,
  'strict controller API must remain available without UI failure-mode coercion',
);

console.log(JSON.stringify({
  schema: 'lafea3-preflight-rejection-retry-check/v1',
  check: 'lafea3-preflight-rejection-retry',
  status: 'PASS',
  strictApiStillThrows: true,
  uiAttemptPublishesDiagnostic: true,
  rejectedAttemptRetainsNoPreflight: true,
  rejectedAttemptPreservesCurrentMesh: true,
  retryWithoutReload: true,
  successfulRetryClearsDiagnostic: true,
  successfulRetryAuthorizesExecution: true,
  releaseAuthorityChanged: false,
}));

function buildWorkbench({ includeTemperature, generateMesh }) {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(triangleSource());
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'PREFLIGHT-RETRY/CHECK');
  const geometry = triangleGeometry();
  const domain = sourceEquivalentDomain(authority.sourceHash, geometry, includeTemperature);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: authority.sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'PREFLIGHT-RETRY/GEOMETRY',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3',
    initialDocument: source,
    initialSourceHash: authority.sourceHash,
  });
  store.activateDomainFirstProfile();
  assert.equal(store.registerAnalysisDomain(domain).projection.state, 'CURRENT_PASS');
  assert.equal(store.registerAnalysisGeometryEvidence(geometryEvidence).projection.state, 'CURRENT_PASS');
  store.bindAnalysisMeshProfile(meshProfile());
  if (generateMesh) {
    const generated = store.generateAnalysisMesh();
    assert.equal(generated?.evidence?.qualification, 'PASS');
  }
  return { store, source, authority, geometry, domain };
}

function buildInvalidOptionsWorkbench() {
  const candidate = buildWorkbench({ includeTemperature: false, generateMesh: false });
  try {
    return candidate.store.prepareContinuumForRun('LAFEA.3', { failureMode: 'SWALLOW_ALL_ERRORS' });
  } finally {
    candidate.store.destroy();
  }
}

function sourceEquivalentDomain(sourceHash, geometry, includeTemperature) {
  const allCases = ['L1', 'L2'];
  const attachments = [
    attachment('FIX-A', 'RESTRAINT', 'VERTEX', 'A', allCases, { ux: true, uy: true }),
    attachment('FIX-B-Y', 'RESTRAINT', 'VERTEX', 'B', allCases, { uy: true }),
    attachment('F1', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L1'], { fx: 1000, fy: 0, unit: 'N' }),
    attachment('F2', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L2'], { fx: -500, fy: 0, unit: 'N' }),
  ];
  if (includeTemperature) {
    attachments.push(
      attachment('TEMP', 'TEMPERATURE', 'REGION', 'REGION-1', ['L1'], { value: 50, unit: 'C' }),
    );
  }
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash,
    applicationRef: includeTemperature
      ? 'PREFLIGHT-RETRY/TEMPERATURE-VETO'
      : 'PREFLIGHT-RETRY/DOMAIN',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'REGION-1', materialRef: 'MAT' },
    physicalCases: allCases.map((caseId) => ({ caseId })),
    attachments,
  }, geometry);
}

function triangleGeometry() {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3',
    geometryId: 'PREFLIGHT-RETRY-TRIANGLE',
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'A', x: 0, y: 0 },
      { vertexId: 'B', x: 100, y: 0 },
      { vertexId: 'C', x: 0, y: 100 },
    ],
    segments: [line('S1', 'A', 'B'), line('S2', 'B', 'C'), line('S3', 'C', 'A')],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
  });
}

function meshProfile() {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: 'PREFLIGHT-RETRY-T6-H25',
    sourceRevision: 'PREFLIGHT-RETRY-1',
    semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: 'T6',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: 25,
    },
  });
}

function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
