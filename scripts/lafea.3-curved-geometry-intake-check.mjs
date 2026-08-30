#!/usr/bin/env node
import assert from 'node:assert/strict';
import { triangleSource } from './lafea.3-fixtures.mjs';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import {
  LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA,
  createLafeaContinuumGeometryIntake,
} from '../src/workspace/lafea-continuum-geometry-intake.js';
import { createLafeaMockMeshProfile } from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';

const STAGE_ID = 'LAFEA.3';
const source = triangleSource();
const composition = requireLafeaStageComposition(STAGE_ID);
const normalizedSource = composition.normalizeDocument(source);
const authority = issueLafeaSourceAuthority(STAGE_ID, normalizedSource, 'LAFEA3_CURVED_INTAKE_CHECK');
const profile = createLafeaMockMeshProfile(STAGE_ID);
const declaration = curvedDeclaration();

const direct = createLafeaContinuumGeometryIntake(normalizedSource, declaration);
assert.equal(direct.meshGenerated, false);
assert.equal(direct.solverExecuted, false);
assert.equal(direct.releaseQualified, false);
assert.equal(direct.analysisGeometry.segments.filter((row) => row.type === 'CIRCULAR_ARC').length, 1);
assert.equal(direct.analysisGeometry.loops[0].role, 'OUTER');

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

  store.bindAnalysisMeshProfile(profile);
  const generated = store.generateAnalysisMesh();
  assert.ok(generated?.evidence, 'curved ordinary intake must reach generated mesh production');
  assert.equal(generated.evidence.qualification, 'PASS');
  assert.equal(generated.evidence.mesh.elements.every((row) => row.elementType === 'T6'), true);
  assert.ok(generated.evidence.mesh.nodes.length > 4);
  assert.ok(generated.evidence.mesh.elements.length > 0);

  const plan = store.selectAnalysisMeshPlan();
  assert.equal(plan.generationMode, 'AUTOMATIC_MESH');
  assert.notEqual(plan.resourceDisposition, 'BLOCK');

  const preflight = store.prepareContinuumForRun();
  assert.equal(preflight.projection.state, 'CURRENT_PASS');
  assert.equal(preflight.projection.usableForAuthorization, true);
  const solverModel = store.compileContinuumSolverModel();
  assert.equal(solverModel.parents.analysisGeometryHash, direct.analysisGeometryHash);
  assert.equal(solverModel.parents.analysisDomainHash, direct.analysisDomainHash);
  assert.equal(solverModel.parents.meshHash, generated.evidence.meshHash);
  assert.equal(solverModel.executionAuthorized, false);
  assert.equal(solverModel.releaseQualified, false);

  const replay = store.generateAnalysisMesh();
  assert.equal(replay.evidence.meshHash, generated.evidence.meshHash,
    'curved ordinary mesh replay must be deterministic');
  assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(generated.evidence.mesh));

  console.log(JSON.stringify({
    check: 'lafea.3-curved-geometry-intake',
    status: 'PASS',
    stageId: STAGE_ID,
    geometryType: 'LINE_PLUS_CIRCULAR_ARC',
    elementFamily: profile.fields.continuumElement,
    meshHash: generated.evidence.meshHash,
    nodeCount: generated.evidence.mesh.nodes.length,
    elementCount: generated.evidence.mesh.elements.length,
    preflight: preflight.projection.state,
    deterministicReplay: true,
    releaseQualified: false,
  }));
} finally {
  store.destroy();
}

function curvedDeclaration() {
  const geometry = {
    schema: 'lafea-analysis-geometry/v1',
    stageId: STAGE_ID,
    geometryId: 'RECTANGLE-WITH-SEMICIRCULAR-CROWN',
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      vertex('P1', 0, 0),
      vertex('P2', 100, 0),
      vertex('P3', 100, 100),
      vertex('P4', 0, 100),
    ],
    segments: [
      line('S1', 'P1', 'P2'),
      line('S2', 'P2', 'P3'),
      arc('S3-ARC', 'P3', 'P4', 50, 100, 50, 'CCW'),
      line('S4', 'P4', 'P1'),
    ],
    loops: [{
      loopId: 'OUTER',
      role: 'OUTER',
      segmentIds: ['S1', 'S2', 'S3-ARC', 'S4'],
    }],
  };
  return {
    schema: LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA,
    geometry,
    applicationRef: 'LAFEA3-1535/CURVED-ORDINARY-INTAKE',
    regionId: 'REGION-1',
    materialRef: 'MAT',
    attachments: [
      attachment('BC-P1', 'RESTRAINT', 'VERTEX', 'P1', ['L1', 'L2'], { ux: true, uy: true }),
      attachment('BC-P2-UY', 'RESTRAINT', 'VERTEX', 'P2', ['L1', 'L2'], { uy: true }),
      attachment('LOAD-L1-P3', 'CONCENTRATED_LOAD', 'VERTEX', 'P3', ['L1'], {
        fx: 1000, fy: -500, unit: 'N',
      }),
      attachment('LOAD-L2-P3', 'CONCENTRATED_LOAD', 'VERTEX', 'P3', ['L2'], {
        fx: -500, fy: 250, unit: 'N',
      }),
    ],
    producerRef: 'LAFEA3-1535/CURVED-GEOMETRY-INTAKE',
    temperatureUnit: 'C',
  };
}

function vertex(vertexId, x, y) { return { vertexId, x, y }; }
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function arc(segmentId, startVertexId, endVertexId, centerX, centerY, radius, sweep) {
  return {
    segmentId, type: 'CIRCULAR_ARC', startVertexId, endVertexId,
    centerX, centerY, radius, sweep,
  };
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
