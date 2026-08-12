#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
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

const qualified = buildWorkbench();
try {
  let stage = qualified.store.getState().stages['LAFEA.3'];
  assert.equal(stage.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(stage.preparationProjection.state, 'ABSENT');
  assert.equal(stage.orchestration.sections.AUTHORIZATION.state, 'BLOCKED');
  assert.equal(stage.execution, null);
  assert.equal(stage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');

  qualified.store.run();
  stage = qualified.store.getState().stages['LAFEA.3'];
  assert.equal(stage.execution, null, 'run without preflight must remain fail closed');
  assert.equal(stage.lifecycle.artifacts.EXECUTION.status, 'ABSENT');
  assert.equal(stage.lifecycle.artifacts.RECOVERY.status, 'ABSENT');

  const preflight = qualified.store.prepareContinuumForRun();
  assert.equal(preflight.projection.state, 'CURRENT_PASS');
  assert.equal(preflight.projection.usableForAuthorization, true);
  stage = qualified.store.getState().stages['LAFEA.3'];
  assert.equal(stage.orchestration.sections.AUTHORIZATION.state, 'READY');
  assert.ok(stage.orchestration.sections.EXECUTION.allowedActions.includes('RUN_SOLVE'));
  assert.equal(stage.retainedContinuumPreflightEvidence.solverExecuted, false);

  const lifecycleBeforeParity = structuredClone(stage.lifecycle);
  const parity = qualified.store.executeContinuumCompiledForParity();
  assert.equal(parity.mode, 'PARITY_ONLY_NOT_RETAINED');
  assert.deepEqual(qualified.store.getState().stages['LAFEA.3'].lifecycle, lifecycleBeforeParity);

  qualified.store.run();
  stage = qualified.store.getState().stages['LAFEA.3'];
  assert.notEqual(qualified.store.getState().status, 'FAILED');
  assert.equal(stage.execution.status, 'QUALIFIED');
  assert.equal(stage.execution.route, 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL');
  assert.equal(stage.execution.result.qualification.state, 'ACCEPTED');
  assert.equal(stage.execution.releaseQualified, false);
  assert.equal(stage.lifecycleReadiness.resultReady, true);
  assert.equal(stage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');
  assert.equal(stage.orchestration.sections.EXECUTION.state, 'COMPLETE');
  assert.equal(stage.orchestration.sections.RESULTS.state, 'COMPLETE');
  for (const kind of ['CANONICAL_MODEL', 'ANALYSIS_GEOMETRY', 'ANALYSIS_MESH', 'EXECUTION', 'RECOVERY']) {
    assert.equal(stage.lifecycle.artifacts[kind].status, 'CURRENT', `${kind} must be current`);
    assert.equal(stage.lifecycle.artifacts[kind].qualification, 'PASS', `${kind} must pass`);
  }
  assert.equal(
    stage.lifecycle.artifacts.ANALYSIS_GEOMETRY.artifactHash,
    stage.analysisGeometryProjection.analysisGeometryHash,
  );
  assert.equal(stage.lifecycle.artifacts.ANALYSIS_MESH.artifactHash, stage.analysisMeshCustodyProjection.meshHash);
  assert.equal(stage.lifecycle.artifacts.EXECUTION.artifactHash, stage.execution.compiledExecutionHash);

  qualified.store.generateAnalysisMesh();
  stage = qualified.store.getState().stages['LAFEA.3'];
  assert.equal(stage.execution, null, 'mesh regeneration must revoke current execution');
  assert.equal(stage.retainedContinuumPreflightEvidence, null, 'mesh regeneration must revoke preflight');
  assert.equal(stage.lifecycleReadiness.resultReady, false);
  assert.equal(stage.orchestration.sections.AUTHORIZATION.state, 'BLOCKED');
  assert.equal(stage.orchestration.sections.RESULTS.state, 'NOT_STARTED');
} finally {
  qualified.store.destroy();
}

const thermal = buildWorkbench(true);
try {
  const preflight = thermal.store.prepareContinuumForRun();
  assert.equal(preflight.projection.state, 'CURRENT_PASS');
  thermal.store.run();
  const state = thermal.store.getState();
  const stage = state.stages['LAFEA.3'];
  assert.equal(state.status, 'FAILED');
  assert.equal(state.diagnostics[0].code, 'LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED');
  assert.equal(stage.execution, null);
  assert.equal(stage.lifecycle.artifacts.EXECUTION.status, 'ABSENT');
  assert.equal(stage.lifecycle.artifacts.RECOVERY.status, 'ABSENT');
  assert.equal(stage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');
} finally {
  thermal.store.destroy();
}

console.log(JSON.stringify({
  schema: 'lafea-continuum-authoritative-run-check/v1',
  check: 'lafea-continuum-authoritative-run',
  status: 'PASS',
  stageId: 'LAFEA.3',
  explicitPreflightRequired: true,
  authoritativeCompiledRun: true,
  existingNumericalKernelReused: true,
  lifecycleExecutionRecoveryPublished: true,
  currentMeshLineageEnforced: true,
  remeshRevokesAuthority: true,
  temperatureDeltaFailsClosed: true,
  releaseAuthorityChanged: false,
}));

function buildWorkbench(includeTemperature = false) {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(triangleSource());
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'STAGE13/AUTHORITATIVE-RUN');
  const geometry = triangleGeometry();
  const domain = sourceEquivalentDomain(authority.sourceHash, geometry, includeTemperature);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: authority.sourceHash,
    analysisDomain: domain, geometry,
    producerRef: 'STAGE13/AUTHORITATIVE-GEOMETRY',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3', initialDocument: source, initialSourceHash: authority.sourceHash,
  });
  store.activateDomainFirstProfile();
  assert.equal(store.registerAnalysisDomain(domain).projection.state, 'CURRENT_PASS');
  assert.equal(store.registerAnalysisGeometryEvidence(geometryEvidence).projection.state, 'CURRENT_PASS');
  store.bindAnalysisMeshProfile(meshProfile());
  const generated = store.generateAnalysisMesh();
  assert.equal(generated?.evidence?.qualification, 'PASS');
  return { store, source, authority, geometry, domain };
}

function sourceEquivalentDomain(sourceHash, geometry, includeTemperature) {
  const allCases = ['L1', 'L2'];
  const attachments = [
    attachment('FIX-A', 'RESTRAINT', 'VERTEX', 'A', allCases, { ux: true, uy: true }),
    attachment('FIX-B-Y', 'RESTRAINT', 'VERTEX', 'B', allCases, { uy: true }),
    attachment('F1', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L1'], { fx: 1000, fy: 0, unit: 'N' }),
    attachment('F2', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L2'], { fx: -500, fy: 0, unit: 'N' }),
  ];
  if (includeTemperature) attachments.push(
    attachment('TEMP', 'TEMPERATURE', 'REGION', 'REGION-1', ['L1'], { value: 50, unit: 'C' }),
  );
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3', sourceHash,
    applicationRef: includeTemperature ? 'STAGE13/TEMPERATURE-FAIL-CLOSED' : 'STAGE13/AUTHORITATIVE-DOMAIN',
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

function meshProfile() {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: 'STAGE13-AUTHORITATIVE-T6',
    sourceRevision: '13.1', semanticHash: undefined,
    fields: {
      continuumElement: 'T6', shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: 25, adjacentSizeRatioMax: 1.5, aspectRatioWarn: 4,
      aspectRatioBlock: 8, scaledJacobianWarn: 0.25, scaledJacobianBlock: 0.05,
      adaptiveLevels: 3,
    },
  });
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
