#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
  LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  createLafeaCurvedHoleShellAnalysisDomain,
  createLafeaCurvedHoleShellMidsurfaceEvidence,
  createLafeaCurvedHoleShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-curved-hole-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';

const SOURCE_HASH = `sha256:${'e'.repeat(64)}`;
const RADIUS = 100;
const HALF_SPAN = Math.PI * RADIUS / 4;
const ROOT2 = Math.sqrt(0.5);
const QUALITY = Object.freeze({
  aspectRatioWarn: 5,
  aspectRatioBlock: 10,
  scaledJacobianWarn: 0.6,
  scaledJacobianBlock: 0.2,
});
const cases = [
  Object.freeze({
    caseId: 'ONE_RECT_HOLE',
    fixture: oneHole(),
    minimumMaterialLigament: 45,
    maximumQualifiedTargetElementLength: 22.5,
    rejectedTargets: [60],
    qualifiedTargets: [22.5, 20, 15, 10, 8],
  }),
  Object.freeze({
    caseId: 'TWO_RECT_HOLES',
    fixture: twoHoles(),
    minimumMaterialLigament: 40,
    maximumQualifiedTargetElementLength: 20,
    rejectedTargets: [22.5],
    qualifiedTargets: [20, 15, 10, 8],
  }),
];

const rows = [];
for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  for (const testCase of cases) {
    const parent = parentFor(stageId, testCase.fixture);

    for (const target of testCase.rejectedTargets) {
      assert.throws(
        () => planLafeaShellAnalysisMesh({
          midsurfaceEvidence: parent,
          meshProfile: profileFor(stageId, target, `${testCase.caseId}-REJECT`),
        }),
        (error) => error?.code === 'LAFEA_SHELL_CURVED_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT',
        `${stageId} ${testCase.caseId} target ${target} must fail closed before meshing`,
      );
    }

    const levels = [];
    let previous = null;
    for (const target of testCase.qualifiedTargets) {
      const profile = profileFor(stageId, target, testCase.caseId);
      const result = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
      assert.equal(result.evidence.qualification, 'PASS');
      assert.equal(result.evidence.quality.blockingElementIds.length, 0);
      assert.equal(result.plan.minimumMaterialLigament, testCase.minimumMaterialLigament);
      assert.equal(
        result.plan.maximumQualifiedTargetElementLength,
        testCase.maximumQualifiedTargetElementLength,
      );
      assert.ok(result.plan.effectiveTargetElementLength <= testCase.maximumQualifiedTargetElementLength + 1e-12);
      assert.equal(result.evidence.quality.gateResults.find((row) => row.metric === 'ASPECT_RATIO').blockingThreshold, QUALITY.aspectRatioBlock);
      assert.equal(result.evidence.quality.gateResults.find((row) => row.metric === 'SCALED_JACOBIAN').blockingThreshold, QUALITY.scaledJacobianBlock);

      const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
      assert.equal(replay.plan.planHash, result.plan.planHash);
      assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
      assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
      assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));

      const nodeCount = result.evidence.mesh.nodes.length;
      const elementCount = result.evidence.mesh.elements.length;
      if (previous) {
        assert.ok(nodeCount > previous.nodeCount, `${stageId} ${testCase.caseId}: density must increase as target decreases`);
        assert.ok(elementCount > previous.elementCount, `${stageId} ${testCase.caseId}: element density must increase as target decreases`);
      }
      previous = { nodeCount, elementCount };
      levels.push(Object.freeze({
        targetElementLength: target,
        effectiveTargetElementLength: result.plan.effectiveTargetElementLength,
        nodeCount,
        elementCount,
        estimatedDofs: result.plan.estimatedDofs,
        blockingElementCount: result.evidence.quality.blockingElementIds.length,
        minimumScaledJacobian: result.evidence.quality.gateResults
          .find((row) => row.metric === 'SCALED_JACOBIAN').value,
        meshHash: result.evidence.meshHash,
        artifactHash: result.evidence.artifactHash,
      }));
    }

    rows.push(Object.freeze({
      stageId,
      caseId: testCase.caseId,
      minimumMaterialLigament: testCase.minimumMaterialLigament,
      maximumQualifiedTargetElementLength: testCase.maximumQualifiedTargetElementLength,
      rejectedTargets: [...testCase.rejectedTargets],
      qualifiedTargets: [...testCase.qualifiedTargets],
      levels,
    }));
  }
}

console.log(JSON.stringify({
  schema: 'lafea-shell-curved-hole-ladder-check/v1',
  status: 'PASS',
  surface: 'ANALYTIC_CYLINDER_NON_WRAPPING',
  seedingRevision: 'LAFEA.10.CDT-HOLES-TRI.V4',
  boundaryClearanceFactor: 0.25,
  qualityThresholdsRelaxed: false,
  quality: QUALITY,
  minimumElementsAcrossLigament: 2,
  deterministicReplayAtEveryQualifiedLevel: true,
  zeroBlockingElementsAtEveryQualifiedLevel: true,
  strictDensityIncreaseAcrossRetainedLevels: true,
  rows,
}, null, 2));

function parentFor(stageId, fixture) {
  const geometry = createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `CURVED-HOLE-LADDER-${stageId}-${fixture.label}`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: RADIUS,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: fixture.vertices,
    segments: fixture.segments,
    loops: fixture.loops,
  });
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `CURVED-HOLE-LADDER-DOMAIN-${stageId}-${fixture.label}`,
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  });
  return createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'CURVED-HOLE-LADDER',
  });
}

function oneHole() {
  return topology('ONE', [[
    { u: -20, v: 45 }, { u: -20, v: 75 },
    { u: 20, v: 75 }, { u: 20, v: 45 },
  ]]);
}

function twoHoles() {
  return topology('TWO', [[
    { u: -38, v: 40 }, { u: -38, v: 70 },
    { u: -20, v: 70 }, { u: -20, v: 40 },
  ], [
    { u: 20, v: 40 }, { u: 20, v: 70 },
    { u: 38, v: 70 }, { u: 38, v: 40 },
  ]]);
}

function topology(label, holes) {
  const vertices = [
    { vertexId: 'O1', u: -HALF_SPAN, v: 0 },
    { vertexId: 'O2', u: HALF_SPAN, v: 0 },
    { vertexId: 'O3', u: HALF_SPAN, v: 120 },
    { vertexId: 'O4', u: -HALF_SPAN, v: 120 },
  ];
  const segments = [
    segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
    segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
  ];
  const loops = [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] }];
  holes.forEach((polygon, holeIndex) => {
    const prefix = `H${holeIndex + 1}`;
    const ids = polygon.map((point, index) => {
      const vertexId = `${prefix}V${index + 1}`;
      vertices.push({ vertexId, ...point });
      return vertexId;
    });
    const segmentIds = ids.map((_, index) => `${prefix}S${index + 1}`);
    ids.forEach((id, index) => segments.push(segment(segmentIds[index], id, ids[(index + 1) % ids.length])));
    loops.push({ loopId: prefix, role: 'HOLE', segmentIds });
  });
  return { label, vertices, segments, loops };
}

function profileFor(stageId, target, label) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `CURVED_HOLE_LADDER_${stageId.replace('.', '_')}_${label}_${target}`,
    sourceRevision: 'R10',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: QUALITY.aspectRatioWarn,
      aspectRatioBlock: QUALITY.aspectRatioBlock,
      scaledJacobianWarn: QUALITY.scaledJacobianWarn,
      scaledJacobianBlock: QUALITY.scaledJacobianBlock,
      adaptiveLevels: 3,
    },
  });
}

function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}
