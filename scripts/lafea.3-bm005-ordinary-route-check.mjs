#!/usr/bin/env node
import assert from 'node:assert/strict';
import { triangleSource } from './lafea.3-fixtures.mjs';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA } from '../src/workspace/lafea-continuum-geometry-intake.js';
import { createLafeaMockMeshProfile } from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';

const STAGE_ID = 'LAFEA.3';
const source = triangleSource();
const composition = requireLafeaStageComposition(STAGE_ID);
const normalizedSource = composition.normalizeDocument(source);
const authority = issueLafeaSourceAuthority(STAGE_ID, normalizedSource, 'LAFEA3_BM005_ORDINARY_ROUTE');
const profile = createLafeaMockMeshProfile(STAGE_ID);

const declaration = {
  schema: LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA,
  geometry: pentagonGeometry(),
  applicationRef: 'LAFEA3-1535/BM005-ORDINARY-ROUTE',
  regionId: 'REGION-1',
  materialRef: 'MAT',
  attachments: [
    attachment('BC-P1', 'RESTRAINT', 'VERTEX', 'P1', ['L1'], { ux: true, uy: true }),
    attachment('BC-P2-UY', 'RESTRAINT', 'VERTEX', 'P2', ['L1'], { uy: true }),
    attachment('LOAD-L1-P4', 'CONCENTRATED_LOAD', 'VERTEX', 'P4', ['L1'], {
      fx: 1000, fy: -500, unit: 'N',
    }),
  ],
  producerRef: 'LAFEA3-1535/BM005-QUALIFICATION',
  temperatureUnit: 'C',
};

const store = createLafeaWorkbenchStore({
  initialStage: STAGE_ID,
  initialDocument: normalizedSource,
  initialSourceHash: authority.sourceHash,
});

try {
  const registration = store.registerContinuumGeometryIntake(declaration);
  assert.equal(registration.status, 'CURRENT');
  assert.equal(registration.analysisDomainProjection.state, 'CURRENT_PASS');
  assert.equal(registration.analysisGeometryProjection.state, 'CURRENT_PASS');

  store.bindAnalysisMeshProfile(profile, STAGE_ID);
  const generated = store.generateAnalysisMesh({}, STAGE_ID);
  assert.equal(generated.evidence.qualification, 'PASS');
  assert.equal(generated.evidence.mesh.elements.every((row) => row.elementType === 'T6'), true);

  const preflight = store.prepareContinuumForRun();
  assert.equal(preflight.projection.state, 'CURRENT_PASS');
  assert.equal(preflight.projection.usableForAuthorization, true);

  store.run();
  const oneMeshStage = store.getState().stages[STAGE_ID];
  assert.equal(oneMeshStage.execution.status, 'QUALIFIED');
  assert.equal(oneMeshStage.lifecycle.artifacts.RECOVERY.status, 'CURRENT');
  assert.equal(oneMeshStage.lifecycle.artifacts.RECOVERY.qualification, 'PASS');
  assert.equal(oneMeshStage.lifecycleReadiness.resultReady, false,
    'one qualified mesh must not publish LAFEA.3 Results');
  assert.equal(oneMeshStage.lifecycleReadiness.resultState, 'RESULT_NOT_READY');
  assert.ok(oneMeshStage.lifecycleReadiness.blockingReasons
    .includes('LAFEA3_CONVERGENCE_NOT_CURRENT_AND_QUALIFIED'));

  const convergence = store.runContinuumConvergenceStudy({
    schema: 'lafea-continuum-convergence-study-request/v1',
    studyId: 'LAFEA3-1535-BM005-DISPLACEMENT',
    probe: {
      schema: 'lafea-continuum-physical-probe/v1',
      probeId: 'BM005-PROBE-CENTER',
      physicalCoordinate: { x: 50, y: 50 },
      coordinateFrame: 'GLOBAL_XY',
      loadCaseId: 'L1',
      quantityId: 'DISPLACEMENT_MAGNITUDE',
      representation: 'PHYSICAL_POINT_DIRECT',
      recoveryMethod: 'ELEMENT_SHAPE_INTERPOLATION',
      units: 'mm',
      singularityClassification: 'NOT_APPLICABLE',
    },
    levels: [
      { levelId: 'COARSE', h: 30 },
      { levelId: 'MEDIUM', h: 15 },
      { levelId: 'FINE', h: 7.5 },
    ],
  });

  assert.equal(convergence.status, 'CURRENT_PASS',
    'actual ordinary-route probe convergence must be publishable');
  assert.equal(convergence.projection.state, 'CURRENT_PASS');
  assert.equal(convergence.projection.usableForResultPublication, true);
  assert.equal(convergence.resultReady, true);
  assert.equal(convergence.releaseQualified, false);

  const finalStage = store.getState().stages[STAGE_ID];
  assert.equal(finalStage.lifecycleReadiness.resultReady, true);
  assert.equal(finalStage.lifecycleReadiness.resultState, 'RESULT_READY');
  assert.equal(finalStage.lifecycleReadiness.releaseState, 'RELEASE_NOT_QUALIFIED');
  assert.equal(finalStage.continuumConvergenceProjection.state, 'CURRENT_PASS');
  assert.equal(finalStage.lifecycle.artifacts.CONVERGENCE.status, 'CURRENT');
  assert.equal(finalStage.lifecycle.artifacts.CONVERGENCE.qualification, 'PASS');

  const rows = convergence.study.levels.map((row) => ({
    levelId: row.levelId,
    h: row.h,
    meshHash: row.meshHash,
    solverModelHash: row.solverModelHash,
    executionHash: row.executionHash,
    recoveryHash: row.recoveryHash,
    probeEvidenceHash: row.probeEvidenceHash,
    value: row.authoritativeValue,
    units: row.authoritativeUnits,
  }));
  assert.equal(new Set(rows.map((row) => row.meshHash)).size, 3);
  assert.equal(new Set(rows.map((row) => row.executionHash)).size, 3);

  console.log(JSON.stringify({
    check: 'lafea.3-bm005-ordinary-route',
    status: 'PASS',
    stageId: STAGE_ID,
    sourceHash: authority.sourceHash,
    analysisGeometryHash: registration.intake.analysisGeometryHash,
    analysisDomainHash: registration.intake.analysisDomainHash,
    oneMesh: {
      executionStatus: oneMeshStage.execution.status,
      recoveryStatus: oneMeshStage.lifecycle.artifacts.RECOVERY.status,
      resultState: oneMeshStage.lifecycleReadiness.resultState,
      convergenceBlocker: 'LAFEA3_CONVERGENCE_NOT_CURRENT_AND_QUALIFIED',
    },
    convergence: {
      studyId: convergence.study.studyId,
      classification: convergence.study.classification,
      observedOrder: convergence.study.convergenceEvidence.observedOrder,
      richardsonExtrapolatedValue: convergence.study.convergenceEvidence.richardsonExtrapolatedValue,
      gciFinePercent: convergence.study.convergenceEvidence.gciFinePercent,
      levels: rows,
      resultState: finalStage.lifecycleReadiness.resultState,
      releaseState: finalStage.lifecycleReadiness.releaseState,
    },
  }, null, 2));
} finally {
  store.destroy();
}

function pentagonGeometry() {
  const vertices = [
    vertex('P1', 0, 0),
    vertex('P2', 100, 0),
    vertex('P3', 140, 60),
    vertex('P4', 70, 120),
    vertex('P5', 0, 60),
  ];
  const segments = [
    line('S1', 'P1', 'P2'),
    line('S2', 'P2', 'P3'),
    line('S3', 'P3', 'P4'),
    line('S4', 'P4', 'P5'),
    line('S5', 'P5', 'P1'),
  ];
  return {
    schema: 'lafea-analysis-geometry/v1',
    stageId: STAGE_ID,
    geometryId: 'BM005-PENTAGON',
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices,
    segments,
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: segments.map((row) => row.segmentId) }],
  };
}
function vertex(vertexId, x, y) { return { vertexId, x, y }; }
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
