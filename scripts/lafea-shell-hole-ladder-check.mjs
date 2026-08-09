#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceEvidence,
  createLafeaShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';

const SOURCE_HASH = `sha256:${'9'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const TARGETS = Object.freeze([40, 30, 25, 20, 15, 10]);
const CASES = Object.freeze([
  Object.freeze({
    caseId: 'ONE_RECT_HOLE',
    holes: Object.freeze([
      Object.freeze({ x0: 80, y0: 50, x1: 160, y1: 110 }),
    ]),
  }),
  Object.freeze({
    caseId: 'TWO_RECT_HOLES',
    holes: Object.freeze([
      Object.freeze({ x0: 45, y0: 48, x1: 85, y1: 96 }),
      Object.freeze({ x0: 155, y0: 56, x1: 195, y1: 104 }),
    ]),
  }),
]);

const cases = [];
for (const testCase of CASES) {
  const parent = shellParent(testCase.caseId, testCase.holes);
  const levels = TARGETS.map((targetElementLength) => {
    const profile = shellProfile(testCase.caseId, targetElementLength);
    const plan = planLafeaShellAnalysisMesh({
      midsurfaceEvidence: parent,
      meshProfile: profile,
    });
    assert.equal(plan.resourceDisposition, 'WITHIN_LIMITS',
      `${testCase.caseId} target ${targetElementLength}: resource disposition`);
    assert.equal(plan.estimatedDofs, plan.nodeCount * 5,
      `${testCase.caseId} target ${targetElementLength}: 5 DOF/node`);

    const directQuality = qualifyLafeaAnalysisMesh('LAFEA.4', plan.mesh, profile);
    assert.notEqual(directQuality.worstStatus, 'BLOCK',
      `${testCase.caseId} target ${targetElementLength}: direct quality BLOCK; `
      + `minSJ=${directQuality.minimumScaledJacobian}, maxAR=${directQuality.maximumAspectRatio}, `
      + `blocking=${directQuality.blockingElementIds.join(',')}`);
    assert.equal(directQuality.blockingElementIds.length, 0,
      `${testCase.caseId} target ${targetElementLength}: direct blockers`);

    let produced;
    try {
      produced = produceLafeaShellAnalysisMesh({
        midsurfaceEvidence: parent,
        meshProfile: profile,
        plan,
      });
    } catch (error) {
      error.message = `${testCase.caseId} target ${targetElementLength}: ${error.message}; `
        + `direct minSJ=${directQuality.minimumScaledJacobian}, `
        + `direct maxAR=${directQuality.maximumAspectRatio}, `
        + `direct blockers=${directQuality.blockingElementIds.join(',')}`;
      throw error;
    }
    assert.equal(produced.evidence.qualification, 'PASS',
      `${testCase.caseId} target ${targetElementLength}: qualification`);
    assert.equal(produced.evidence.quality.blockingElementIds.length, 0,
      `${testCase.caseId} target ${targetElementLength}: blocking elements`);
    assert.equal(produced.evidence.mesh.elements.every((element) =>
      element.elementType === LAFEA_SHELL_ELEMENT && element.nodeIds.length === 3), true);

    const replay = produceLafeaShellAnalysisMesh({
      midsurfaceEvidence: parent,
      meshProfile: profile,
    });
    assert.equal(replay.evidence.meshHash, produced.evidence.meshHash,
      `${testCase.caseId} target ${targetElementLength}: mesh replay`);
    assert.equal(replay.evidence.artifactHash, produced.evidence.artifactHash,
      `${testCase.caseId} target ${targetElementLength}: evidence replay`);

    return Object.freeze({
      targetElementLength,
      nodeCount: plan.nodeCount,
      elementCount: plan.elementCount,
      estimatedDofs: plan.estimatedDofs,
      minimumScaledJacobian: produced.evidence.quality.minimumScaledJacobian,
      maximumAspectRatio: produced.evidence.quality.maximumAspectRatio,
      blockingElementCount: produced.evidence.quality.blockingElementIds.length,
      meshHash: produced.evidence.meshHash,
      artifactHash: produced.evidence.artifactHash,
    });
  });

  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(levels[index].nodeCount > levels[index - 1].nodeCount,
      `${testCase.caseId}: node count must increase as target decreases.`);
    assert.ok(levels[index].elementCount > levels[index - 1].elementCount,
      `${testCase.caseId}: element count must increase as target decreases.`);
  }
  cases.push(Object.freeze({ caseId: testCase.caseId, levels: Object.freeze(levels) }));
}

console.log(JSON.stringify({
  schema: 'lafea-shell-hole-ladder-check/v1',
  status: 'PASS',
  stageId: 'LAFEA.4',
  targetElementLengths: TARGETS,
  qualityThresholdsRelaxed: false,
  zeroBlockingElementsAtEveryLevel: true,
  deterministicReplayAtEveryLevel: true,
  monotonicDensityResponse: true,
  cases,
}, null, 2));

function shellParent(caseId, holes) {
  const geometry = createLafeaShellMidsurfaceGeometry(geometryValue(caseId, holes));
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: `SHELL-HOLE-LADDER-${caseId}`,
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  });
  return createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'SHELL-HOLE-LADDER-QUALIFICATION',
  });
}

function geometryValue(caseId, holes) {
  const vertices = [
    { vertexId: 'O1', u: 0, v: 0 },
    { vertexId: 'O2', u: 240, v: 0 },
    { vertexId: 'O3', u: 240, v: 160 },
    { vertexId: 'O4', u: 0, v: 160 },
  ];
  const segments = [
    segment('OS1', 'O1', 'O2'),
    segment('OS2', 'O2', 'O3'),
    segment('OS3', 'O3', 'O4'),
    segment('OS4', 'O4', 'O1'),
  ];
  const loops = [{
    loopId: 'OUTER',
    role: 'OUTER',
    segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'],
  }];

  holes.forEach((rect, index) => {
    const prefix = `H${index + 1}`;
    const points = [
      [rect.x0, rect.y0], [rect.x0, rect.y1],
      [rect.x1, rect.y1], [rect.x1, rect.y0],
    ];
    points.forEach(([u, v], pointIndex) => {
      vertices.push({ vertexId: `${prefix}V${pointIndex + 1}`, u, v });
    });
    const segmentIds = [];
    for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
      const segmentId = `${prefix}S${pointIndex + 1}`;
      segmentIds.push(segmentId);
      segments.push(segment(
        segmentId,
        `${prefix}V${pointIndex + 1}`,
        `${prefix}V${((pointIndex + 1) % 4) + 1}`,
      ));
    }
    loops.push({ loopId: `${prefix}_HOLE`, role: 'HOLE', segmentIds });
  });

  return {
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: `SHELL-HOLE-LADDER-${caseId}`,
    lengthUnit: 'mm',
    origin: { x: 12, y: -18, z: 31 },
    axisU: { x: ROOT2, y: ROOT2, z: 0 },
    axisV: { x: 0, y: 0, z: 1 },
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
    vertices,
    segments,
    loops,
  };
}

function shellProfile(caseId, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `SHELL_HOLE_LADDER_${caseId}_${globalTargetSize}`,
    sourceRevision: 'SHELL_HOLE_V2',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}
