#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_SHELL_PERIODIC_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION,
  LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY,
  createLafeaPeriodicHoleShellAnalysisDomain,
  createLafeaPeriodicHoleShellMidsurfaceEvidence,
  createLafeaPeriodicHoleShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-periodic-hole-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';

const SOURCE_HASH = `sha256:${'f'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const RADIUS = 100;
const HOLE = Object.freeze({ holeId: 'SEAM-HOLE-LADDER', uMin: 300, uMax: 328, vMin: 40, vMax: 80 });
const QUALITY = Object.freeze({
  aspectRatioWarn: 5,
  aspectRatioBlock: 10,
  scaledJacobianWarn: 0.6,
  scaledJacobianBlock: 0.2,
});
const REJECTED_TARGETS = Object.freeze([60, 22.5]);
const QUALIFIED_TARGETS = Object.freeze([20, 15, 10, 8]);
const rows = [];

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = parentFor(stageId);
  for (const target of REJECTED_TARGETS) {
    assert.throws(
      () => planLafeaShellAnalysisMesh({
        midsurfaceEvidence: parent,
        meshProfile: profileFor(stageId, target, 'REJECT'),
      }),
      (error) => error?.code === 'LAFEA_SHELL_PERIODIC_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT',
      `${stageId} periodic seam-hole target ${target} must fail before meshing`,
    );
  }

  const levels = [];
  let previous = null;
  for (const target of QUALIFIED_TARGETS) {
    const profile = profileFor(stageId, target, 'QUALIFIED');
    const result = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
    assert.equal(result.evidence.qualification, 'PASS');
    assert.equal(result.evidence.quality.blockingElementIds.length, 0);
    assert.equal(result.plan.minimumMaterialLigament, 40);
    assert.equal(result.plan.maximumQualifiedTargetElementLength, 20);
    assert.equal(result.plan.minimumElementsAcrossLigament, 2);
    assert.equal(result.plan.holeCount, 1);
    assert.equal(result.plan.periodicDirection, 'U');
    assert.equal(result.plan.seamGapCount, 1);
    assert.equal(result.plan.physicalBoundaryLoopCount, 3);
    assert.equal(result.plan.eulerCharacteristic, -1);
    assert.equal(result.plan.seamPairCount, result.plan.seamNodeCount);
    assert.equal(result.plan.seamEdgeCount, result.plan.seamNodeCount - 2);
    assert.equal(
      result.evidence.quality.gateResults.find((row) => row.metric === 'ASPECT_RATIO').blockingThreshold,
      QUALITY.aspectRatioBlock,
    );
    const sj = result.evidence.quality.gateResults.find((row) => row.metric === 'SCALED_JACOBIAN');
    assert.equal(sj.blockingThreshold, QUALITY.scaledJacobianBlock);
    assert.ok(sj.value >= QUALITY.scaledJacobianBlock,
      `${stageId} periodic seam-hole target ${target}: minimum SJ ${sj.value} must remain above block floor`);

    const replay = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
    assert.equal(replay.plan.planHash, result.plan.planHash);
    assert.equal(replay.evidence.meshHash, result.evidence.meshHash);
    assert.equal(replay.evidence.artifactHash, result.evidence.artifactHash);
    assert.equal(JSON.stringify(replay.evidence.mesh), JSON.stringify(result.evidence.mesh));

    const nodeCount = result.evidence.mesh.nodes.length;
    const elementCount = result.evidence.mesh.elements.length;
    if (previous) {
      assert.ok(nodeCount > previous.nodeCount,
        `${stageId}: node density must strictly increase as periodic-hole target decreases`);
      assert.ok(elementCount > previous.elementCount,
        `${stageId}: element density must strictly increase as periodic-hole target decreases`);
    }
    previous = { nodeCount, elementCount };
    levels.push(Object.freeze({
      targetElementLength: target,
      effectiveTargetElementLength: result.plan.effectiveTargetElementLength,
      nodeCount,
      elementCount,
      estimatedDofs: result.plan.estimatedDofs,
      seamNodeCount: result.plan.seamNodeCount,
      seamEdgeCount: result.plan.seamEdgeCount,
      seamGapCount: result.plan.seamGapCount,
      physicalBoundaryLoopCount: result.plan.physicalBoundaryLoopCount,
      eulerCharacteristic: result.plan.eulerCharacteristic,
      blockingElementCount: result.evidence.quality.blockingElementIds.length,
      minimumScaledJacobian: sj.value,
      meshHash: result.evidence.meshHash,
      artifactHash: result.evidence.artifactHash,
    }));
  }

  rows.push(Object.freeze({
    stageId,
    minimumMaterialLigament: 40,
    maximumQualifiedTargetElementLength: 20,
    rejectedTargets: [...REJECTED_TARGETS],
    qualifiedTargets: [...QUALIFIED_TARGETS],
    levels,
  }));
}

console.log(JSON.stringify({
  schema: 'lafea-shell-periodic-hole-ladder-check/v1',
  status: 'PASS',
  surface: 'ANALYTIC_FULL_CYLINDER_ONE_CANONICAL_SEAM_CROSSING_RECTANGULAR_HOLE',
  seedingRevision: 'LAFEA.10.CDT-HOLES-TRI.V4',
  boundaryClearanceFactor: 0.25,
  qualityThresholdsRelaxed: false,
  quality: QUALITY,
  minimumElementsAcrossLigament: 2,
  expectedPhysicalBoundaryLoops: 3,
  expectedEulerCharacteristic: -1,
  expectedSeamGapCount: 1,
  deterministicReplayAtEveryQualifiedLevel: true,
  zeroBlockingElementsAtEveryQualifiedLevel: true,
  strictDensityIncreaseAcrossRetainedLevels: true,
  rows,
}, null, 2));

function parentFor(stageId) {
  const geometry = createLafeaPeriodicHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `PERIODIC-HOLE-LADDER-${stageId}`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: RADIUS,
    },
    axialRange: { vMin: 0, vMax: 120 },
    seamCrossingHole: HOLE,
    orientationPolicy: LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION,
  });
  const domain = createLafeaPeriodicHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_PERIODIC_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `PERIODIC-HOLE-LADDER-DOMAIN-${stageId}`,
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY,
  });
  return createLafeaPeriodicHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'PERIODIC-SEAM-HOLE-LADDER',
  });
}

function profileFor(stageId, target, label) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `PERIODIC_HOLE_LADDER_${stageId.replace('.', '_')}_${label}_${target}`,
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
