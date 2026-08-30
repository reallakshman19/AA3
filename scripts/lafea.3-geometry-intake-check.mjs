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
const PENTAGON_AREA = 11400;
const HOLED_AREA = 10400;
const AREA_TOLERANCE = 1e-8;

const source = triangleSource();
const composition = requireLafeaStageComposition(STAGE_ID);
const normalizedSource = composition.normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalizedSource,
  'LAFEA3_GEOMETRY_INTAKE_CHECK',
);
const profile = createLafeaMockMeshProfile(STAGE_ID);

const pentagonDeclaration = declaration(pentagonGeometry(), pentagonAttachments(), 'PENTAGON');
const pentagonPermutation = permuteDeclaration(pentagonDeclaration);
const directA = createLafeaContinuumGeometryIntake(normalizedSource, pentagonDeclaration);
const directB = createLafeaContinuumGeometryIntake(normalizedSource, pentagonPermutation);

assert.equal(directA.meshGenerated, false);
assert.equal(directA.solverExecuted, false);
assert.equal(directA.releaseQualified, false);
assert.equal(directA.analysisGeometryHash, directB.analysisGeometryHash,
  'permitted source-array permutation must preserve canonical geometry identity');
assert.equal(directA.analysisDomainHash, directB.analysisDomainHash,
  'permitted attachment/source-array permutation must preserve canonical domain identity');
assert.equal(directA.canonicalSourceModelHash, directB.canonicalSourceModelHash);
assert.deepEqual(directA.physicalCaseIds, ['L1', 'L2']);
assert.equal(independentGeometryArea(directA.analysisGeometry), PENTAGON_AREA);

assert.throws(
  () => createLafeaContinuumGeometryIntake(
    normalizedSource,
    { ...pentagonDeclaration, materialRef: 'NOT-MAT' },
  ),
  (error) => error?.code === 'LAFEA_CONTINUUM_GEOMETRY_INTAKE_MATERIAL_BINDING_INVALID',
  'unknown material binding must fail closed',
);
assert.throws(
  () => createLafeaContinuumGeometryIntake(
    normalizedSource,
    declaration(pentagonGeometry(), [
      ...pentagonAttachments(),
      attachment('BAD-CASE', 'CONCENTRATED_LOAD', 'VERTEX', 'P4', ['UNKNOWN'], {
        fx: 1, fy: 0, unit: 'N',
      }),
    ], 'BAD-CASE'),
  ),
  (error) => error?.code === 'LAFEA_CONTINUUM_DOMAIN_ATTACHMENT_CASE_UNKNOWN',
  'attachment case IDs must come from the current source',
);
assert.throws(
  () => createLafeaContinuumGeometryIntake(
    normalizedSource,
    declaration(pentagonGeometry(), [
      attachment('BAD-MESH-AUTHORITY', 'CONCENTRATED_LOAD', 'VERTEX', 'P4', ['L1'], {
        fx: 1, fy: 0, unit: 'N', nodeId: 'MESH-NODE-1',
      }),
    ], 'BAD-MESH-AUTHORITY'),
  ),
  (error) => error?.code === 'LAFEA_CONTINUUM_DOMAIN_MESH_AUTHORITY_FORBIDDEN',
  'intake attachments must not smuggle mesh authority',
);

const simple = runOrdinaryRoute(pentagonDeclaration, PENTAGON_AREA);
assert.equal(simple.registration.intake.analysisGeometryHash, directA.analysisGeometryHash);
assert.equal(simple.registration.intake.analysisDomainHash, directA.analysisDomainHash);
assert.equal(simple.replay.changed, false,
  'canonical replay of the same engineering intake must be custody-idempotent');
assert.equal(simple.plan.strategy, 'CONSTRAINED_DELAUNAY');
assert.ok(['UNSTRUCTURED_INTERIOR_REFINEMENT', 'MAPPED_TOPOLOGY_NOT_AVAILABLE'].includes(simple.plan.strategyReason));
assert.equal(simple.preflight.projection.state, 'CURRENT_PASS');
assert.equal(simple.preflight.projection.usableForAuthorization, true);
assert.equal(simple.solverModel.parents.analysisGeometryHash, directA.analysisGeometryHash);
assert.equal(simple.solverModel.parents.analysisDomainHash, directA.analysisDomainHash);
assert.equal(simple.solverModel.parents.meshHash, simple.generated.evidence.meshHash);
assert.equal(simple.solverModel.nodes.length, simple.generated.evidence.mesh.nodes.length);
assert.equal(simple.solverModel.elements.length, simple.generated.evidence.mesh.elements.length);

const holedDeclaration = declaration(holedGeometry(), holeAttachments(), 'OUTER-WITH-HOLE');
const holedDirect = createLafeaContinuumGeometryIntake(normalizedSource, holedDeclaration);
assert.equal(independentGeometryArea(holedDirect.analysisGeometry), HOLED_AREA);
const holed = runOrdinaryRoute(holedDeclaration, HOLED_AREA);
assert.equal(holed.plan.strategy, 'CONSTRAINED_DELAUNAY');
assert.equal(holed.plan.strategyReason, 'MULTIPLY_CONNECTED_REGION_CONSTRAINED');
assert.equal(holed.generated.evidence.qualification, 'PASS');
assert.equal(holed.preflight.projection.state, 'CURRENT_PASS');
assert.equal(holed.generated.evidence.meshHash, holed.replayGenerated.evidence.meshHash,
  'repeat generation must retain byte-stable canonical mesh identity');
assert.equal(
  JSON.stringify(holed.generated.evidence.mesh),
  JSON.stringify(holed.replayGenerated.evidence.mesh),
  'repeat generation must be byte-identical for the same source/geometry/profile',
);

console.log(JSON.stringify({
  check: 'lafea.3-geometry-intake',
  status: 'PASS',
  stageId: STAGE_ID,
  elementFamily: profile.fields.continuumElement,
  simple: {
    geometryArea: PENTAGON_AREA,
    meshArea: meshCornerArea(simple.generated.evidence.mesh),
    meshHash: simple.generated.evidence.meshHash,
    nodeCount: simple.generated.evidence.mesh.nodes.length,
    elementCount: simple.generated.evidence.mesh.elements.length,
    preflight: simple.preflight.projection.state,
  },
  holed: {
    geometryArea: HOLED_AREA,
    meshArea: meshCornerArea(holed.generated.evidence.mesh),
    meshHash: holed.generated.evidence.meshHash,
    nodeCount: holed.generated.evidence.mesh.nodes.length,
    elementCount: holed.generated.evidence.mesh.elements.length,
    strategyReason: holed.plan.strategyReason,
    deterministicReplay: true,
    preflight: holed.preflight.projection.state,
  },
  negativeControls: [
    'BAD_MATERIAL_BINDING_REJECTED',
    'UNKNOWN_PHYSICAL_CASE_REJECTED',
    'MESH_AUTHORITY_PAYLOAD_REJECTED',
  ],
}));

function runOrdinaryRoute(inputDeclaration, expectedArea) {
  const store = createLafeaWorkbenchStore({
    initialStage: STAGE_ID,
    initialDocument: normalizedSource,
    initialSourceHash: authority.sourceHash,
  });
  try {
    const registration = store.registerContinuumGeometryIntake(inputDeclaration);
    assert.equal(registration.status, 'CURRENT');
    assert.equal(registration.meshGenerated, false);
    assert.equal(registration.solverExecuted, false);
    assert.equal(registration.analysisDomainProjection.state, 'CURRENT_PASS');
    assert.equal(registration.analysisGeometryProjection.state, 'CURRENT_PASS');

    const replay = store.registerContinuumGeometryIntake(permuteDeclaration(inputDeclaration));
    assert.equal(replay.intake.analysisGeometryHash, registration.intake.analysisGeometryHash);
    assert.equal(replay.intake.analysisDomainHash, registration.intake.analysisDomainHash);

    store.bindAnalysisMeshProfile(profile);
    const generated = store.generateAnalysisMesh();
    assert.ok(generated?.evidence, 'ordinary intake must reach the existing generated-mesh route');
    assert.equal(generated.evidence.qualification, 'PASS');
    assert.equal(generated.evidence.meshProfileHash, profile.semanticHash);
    assert.ok(generated.evidence.mesh.elements.length > 0);
    assert.equal(
      generated.evidence.mesh.elements.every((row) => row.elementType === 'T6'),
      true,
      'ordinary T6 profile must remain uniform T6 without silent fallback',
    );
    assertNear(meshCornerArea(generated.evidence.mesh), expectedArea, AREA_TOLERANCE,
      'generated material-domain area must match independent geometry area');

    const plan = store.selectAnalysisMeshPlan();
    assert.equal(plan.generationMode, 'AUTOMATIC_MESH');
    assert.notEqual(plan.resourceDisposition, 'BLOCK');

    const preflight = store.prepareContinuumForRun();
    assert.equal(preflight.projection.state, 'CURRENT_PASS');
    const solverModel = store.compileContinuumSolverModel();
    assert.equal(solverModel.executionAuthorized, false,
      'compiler output must not self-authorize execution');
    assert.equal(solverModel.releaseQualified, false);

    const replayGenerated = store.generateAnalysisMesh();
    assertNear(meshCornerArea(replayGenerated.evidence.mesh), expectedArea, AREA_TOLERANCE,
      'deterministic replay must preserve material-domain area');

    return { registration, replay, generated, replayGenerated, plan, preflight, solverModel };
  } finally {
    store.destroy();
  }
}

function declaration(geometry, attachments, label) {
  return {
    schema: LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA,
    geometry,
    applicationRef: `LAFEA3-1535/${label}`,
    regionId: 'REGION-1',
    materialRef: 'MAT',
    attachments,
    producerRef: 'LAFEA3-1535/ORDINARY-GEOMETRY-INTAKE',
    temperatureUnit: 'C',
  };
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
  return geometry('PENTAGON-11400', vertices, segments, [
    { loopId: 'OUTER', role: 'OUTER', segmentIds: segments.map((row) => row.segmentId) },
  ]);
}

function pentagonAttachments() {
  return [
    attachment('BC-P1', 'RESTRAINT', 'VERTEX', 'P1', ['L1', 'L2'], { ux: true, uy: true }),
    attachment('BC-P2-UY', 'RESTRAINT', 'VERTEX', 'P2', ['L1', 'L2'], { uy: true }),
    attachment('LOAD-L1-P4', 'CONCENTRATED_LOAD', 'VERTEX', 'P4', ['L1'], { fx: 1000, fy: -500, unit: 'N' }),
    attachment('LOAD-L2-P4', 'CONCENTRATED_LOAD', 'VERTEX', 'P4', ['L2'], { fx: -500, fy: 250, unit: 'N' }),
  ];
}

function holedGeometry() {
  const vertices = [
    vertex('O1', 0, 0), vertex('O2', 120, 0), vertex('O3', 120, 100), vertex('O4', 0, 100),
    vertex('H1', 40, 30), vertex('H2', 40, 70), vertex('H3', 80, 70), vertex('H4', 80, 30),
  ];
  const segments = [
    line('O-S1', 'O1', 'O2'), line('O-S2', 'O2', 'O3'),
    line('O-S3', 'O3', 'O4'), line('O-S4', 'O4', 'O1'),
    line('H-S1', 'H1', 'H2'), line('H-S2', 'H2', 'H3'),
    line('H-S3', 'H3', 'H4'), line('H-S4', 'H4', 'H1'),
  ];
  return geometry('RECTANGLE-WITH-RECTANGULAR-HOLE', vertices, segments, [
    { loopId: 'OUTER', role: 'OUTER', segmentIds: ['O-S1', 'O-S2', 'O-S3', 'O-S4'] },
    { loopId: 'HOLE-1', role: 'HOLE', segmentIds: ['H-S1', 'H-S2', 'H-S3', 'H-S4'] },
  ]);
}

function holeAttachments() {
  return [
    attachment('BC-O1', 'RESTRAINT', 'VERTEX', 'O1', ['L1', 'L2'], { ux: true, uy: true }),
    attachment('BC-O2-UY', 'RESTRAINT', 'VERTEX', 'O2', ['L1', 'L2'], { uy: true }),
    attachment('LOAD-L1-O3', 'CONCENTRATED_LOAD', 'VERTEX', 'O3', ['L1'], { fx: 800, fy: -400, unit: 'N' }),
    attachment('LOAD-L2-O3', 'CONCENTRATED_LOAD', 'VERTEX', 'O3', ['L2'], { fx: -400, fy: 200, unit: 'N' }),
  ];
}

function geometry(geometryId, vertices, segments, loops) {
  return {
    schema: 'lafea-analysis-geometry/v1',
    stageId: STAGE_ID,
    geometryId,
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices,
    segments,
    loops,
  };
}
function vertex(vertexId, x, y) { return { vertexId, x, y }; }
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function permuteDeclaration(value) {
  const copy = structuredClone(value);
  copy.geometry.vertices.reverse();
  copy.geometry.segments.reverse();
  copy.geometry.loops.reverse();
  copy.attachments.reverse();
  copy.attachments.forEach((row) => row.physicalCaseIds.reverse());
  return copy;
}

function independentGeometryArea(geometryValue) {
  const vertexById = new Map(geometryValue.vertices.map((row) => [row.vertexId, row]));
  const segmentById = new Map(geometryValue.segments.map((row) => [row.segmentId, row]));
  let total = 0;
  for (const loop of geometryValue.loops) {
    const points = loop.segmentIds.map((segmentId) => {
      const segment = segmentById.get(segmentId);
      assert.equal(segment.type, 'LINE', 'focused area oracle supports straight-edge fixtures only');
      return vertexById.get(segment.startVertexId);
    });
    total += signedPolygonArea(points);
  }
  return Math.abs(total);
}

function meshCornerArea(mesh) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  return mesh.elements.reduce((sum, element) => {
    assert.ok(['T3', 'T6'].includes(element.elementType),
      'focused route expects triangular continuum elements');
    const [a, b, c] = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    return sum + Math.abs(cross(a, b, c)) / 2;
  }, 0);
}
function signedPolygonArea(points) {
  let twice = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    twice += a.x * b.y - a.y * b.x;
  }
  return twice / 2;
}
function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function assertNear(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`);
}
