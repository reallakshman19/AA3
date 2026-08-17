#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import {
  LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
  LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  createLafeaCurvedHoleShellAnalysisDomain,
  createLafeaCurvedHoleShellMidsurfaceEvidence,
  createLafeaCurvedHoleShellMidsurfaceGeometry,
  curvedHoleShellUvAtPoint3d,
} from '../src/workspace/lafea-shell-curved-hole-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import {
  LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
  createLafea4GradedRefinementCommand,
} from '../src/workspace/lafea4-shell-graded-refinement-authority.js';
import { previewLafea4GradedShellRefinement } from '../src/workspace/lafea4-shell-graded-refinement-executor.js';
import {
  evaluateLafea4ShellParentNormalShadowGate,
  validateLafea4ShellParentNormalShadowGate,
} from '../src/workspace/lafea4-shell-parent-normal-shadow-gate.js';

const policy = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/parent-normal-shadow-gate-v1.json', import.meta.url),
  'utf8',
));
assert.equal(policy.productionBindingAuthorized, false);
assert.equal(policy.releaseQualified, false);

const sample = realSampleCases();
const tech7 = tech7CurvedHolePreview();

assert.equal(sample.generated.shadow.candidateQualification, 'PASS');
assert.equal(sample.generated.shadow.wouldBlockIfPromoted, false);
assert.equal(sample.generated.shadow.retainedMeshAcceptanceChanged, false);
assert.equal(sample.generated.shadow.productionBindingAuthorized, false);
assert.equal(sample.generated.shadow.releaseQualified, false);
assert.equal(sample.reversed.existingMeshQualification, 'PASS');
assert.equal(sample.reversed.existingOrientationTopology, 'PASS');
assert.equal(sample.reversed.shadow.candidateQualification, 'BLOCK');
assert.equal(sample.reversed.shadow.wouldBlockIfPromoted, true);
assert.equal(sample.reversed.shadow.blockedElementCount, sample.reversed.elementCount);
assert.equal(tech7.shadow.candidateQualification, 'PASS');
assert.equal(tech7.shadow.wouldBlockIfPromoted, false);
assert.equal(tech7.shadow.retainedMeshAcceptanceChanged, false);

console.log(JSON.stringify({
  check: 'lafea-tech12-shadow-parent-normal-batch',
  status: 'PASS',
  mode: policy.mode,
  automaticProducerGuard: sample.generated.automaticProducerGuard,
  realSample: {
    existingMeshQualification: sample.generated.existingMeshQualification,
    existingOrientationTopology: sample.generated.existingOrientationTopology,
    shadowCandidateQualification: sample.generated.shadow.candidateQualification,
    shadowMinimumAlignmentCosine: sample.generated.shadow.minimumAlignmentCosine,
  },
  globallyReversedRetainedSample: {
    existingMeshQualification: sample.reversed.existingMeshQualification,
    existingOrientationTopology: sample.reversed.existingOrientationTopology,
    shadowCandidateQualification: sample.reversed.shadow.candidateQualification,
    wouldBlockIfPromoted: sample.reversed.shadow.wouldBlockIfPromoted,
    blockedElementCount: sample.reversed.shadow.blockedElementCount,
    elementCount: sample.reversed.elementCount,
    minimumAlignmentCosine: sample.reversed.shadow.minimumAlignmentCosine,
  },
  tech7CurvedHolePreview: {
    currentChildMeshQualification: tech7.childMeshQualification,
    currentMaximumAdjacentSizeRatio: tech7.maximumAdjacentSizeRatio,
    currentBlockingElementCount: tech7.blockingElementCount,
    shadowCandidateQualification: tech7.shadow.candidateQualification,
    wouldBlockIfPromoted: tech7.shadow.wouldBlockIfPromoted,
    minimumAlignmentCosine: tech7.shadow.minimumAlignmentCosine,
  },
  retainedMeshAcceptanceChanged: false,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function realSampleCases() {
  const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
  const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH12A-SAMPLE-SHADOW');
  const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
    'LAFEA.4', authority.sourceHash, document,
  );
  const profile = shellProfile('TECH12A_SAMPLE_H100', 'TECH12A-SAMPLE-V1', 100);
  const generated = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: midsurface, meshProfile: profile });
  assert.equal(generated.evidence.qualification, 'PASS');
  assert.equal(generated.evidence.quality.shellOrientationTopology.qualification, 'PASS');
  assert.ok(Number.isFinite(generated.plan.minimumFacetDirectorAlignment));
  assert.ok(generated.plan.minimumFacetDirectorAlignment
    >= generated.plan.requiredMinimumFacetDirectorAlignment - 1e-12);
  const generatedShadow = validateLafea4ShellParentNormalShadowGate(
    evaluateLafea4ShellParentNormalShadowGate({
      meshEvidence: generated.evidence,
      midsurfaceEvidence: midsurface,
    }),
  );

  const reversedMesh = {
    ...structuredClone(generated.evidence.mesh),
    meshIdentity: `${generated.evidence.mesh.meshIdentity}:TECH12A-GLOBAL-REVERSE`,
    elements: generated.evidence.mesh.elements.map((element) => ({
      ...structuredClone(element),
      nodeIds: [element.nodeIds[0], element.nodeIds[2], element.nodeIds[1]],
    })),
  };
  const reversedMeshHash = lafeaAnalysisMeshContentHash(reversedMesh);
  const reversedEvidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: authority.sourceHash,
    analysisDomainHash: midsurface.analysisDomainHash,
    analysisGeometryHash: midsurface.analysisGeometryHash,
    meshProfile: profile,
    mesh: reversedMesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.4',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: 'TECH12A-GLOBAL-REVERSE-SHADOW-FIXTURE',
      sourceHash: authority.sourceHash,
      analysisDomainHash: midsurface.analysisDomainHash,
      analysisGeometryHash: midsurface.analysisGeometryHash,
      meshProfileHash: profile.semanticHash,
      meshHash: reversedMeshHash,
      capabilityHash: canonicalLafeaSha256({ schema: 'tech12a-reverse-capability/v1' }),
      qualificationHash: canonicalLafeaSha256({ schema: 'tech12a-reverse-upstream/v1' }),
      planHash: canonicalLafeaSha256({ schema: 'tech12a-reverse-plan/v1' }),
    },
  });
  const reversedShadow = validateLafea4ShellParentNormalShadowGate(
    evaluateLafea4ShellParentNormalShadowGate({
      meshEvidence: reversedEvidence,
      midsurfaceEvidence: midsurface,
    }),
  );
  return {
    generated: {
      existingMeshQualification: generated.evidence.qualification,
      existingOrientationTopology: generated.evidence.quality.shellOrientationTopology.qualification,
      automaticProducerGuard: {
        minimumFacetDirectorAlignment: generated.plan.minimumFacetDirectorAlignment,
        requiredMinimumFacetDirectorAlignment: generated.plan.requiredMinimumFacetDirectorAlignment,
      },
      shadow: generatedShadow,
    },
    reversed: {
      existingMeshQualification: reversedEvidence.qualification,
      existingOrientationTopology: reversedEvidence.quality.shellOrientationTopology.qualification,
      elementCount: reversedEvidence.mesh.elements.length,
      shadow: reversedShadow,
    },
  };
}

function tech7CurvedHolePreview() {
  const definition = JSON.parse(fs.readFileSync(
    new URL('../validation/lafea4-refinement/graded-executor-curved-hole-v1.json', import.meta.url),
    'utf8',
  ));
  const sourceHash = `sha256:${'7'.repeat(64)}`;
  const geometry = curvedHoleGeometry(definition.geometry);
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: 'TECH12A-CURVED-HOLE-DOMAIN',
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  });
  const midsurface = createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'TECH12A-TECH7-CURVED-HOLE-PARENT',
  });
  const profile = shellProfile(
    'TECH12A_TECH7_CURVED_HOLE', 'TECH12A-TECH7-V1', definition.mesh.globalTargetMm,
  );
  const parent = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: midsurface, meshProfile: profile }).evidence;
  const target = nearestElementToUv(parent.mesh, geometry, definition.target);
  const command = createLafea4GradedRefinementCommand({
    schema: LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
    commandId: 'TECH12A-TECH7-H3_75',
    stageId: 'LAFEA.4',
    parentMeshArtifactHash: parent.artifactHash,
    parentMeshHash: parent.meshHash,
    targetType: 'ELEMENT',
    targetIds: [target.elementId],
    targetElementLength: definition.mesh.localTargetMm,
    lengthUnit: 'mm',
    reason: 'TECH12A shadow parent-normal qualification of TECH7 preview child',
  });
  const preview = previewLafea4GradedShellRefinement({
    parentEvidence: parent,
    midsurfaceEvidence: midsurface,
    meshProfile: profile,
    command,
  });
  const shadow = validateLafea4ShellParentNormalShadowGate(
    evaluateLafea4ShellParentNormalShadowGate({
      meshEvidence: preview.evidence,
      midsurfaceEvidence: midsurface,
    }),
  );
  const adjacency = preview.evidence.quality.gateResults
    .find((row) => row.metric === 'ADJACENT_SIZE_RATIO');
  return {
    childMeshQualification: preview.evidence.qualification,
    maximumAdjacentSizeRatio: adjacency?.value ?? null,
    blockingElementCount: preview.evidence.quality.blockingElementIds.length,
    shadow,
  };
}

function shellProfile(identity, revision, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: identity,
    sourceRevision: revision,
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function curvedHoleGeometry(source) {
  const h = source.hole;
  return createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: 'TECH12A-CURVED-HOLE-R100',
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 0, y: 0, z: 0 },
      axisDirection: { x: 1, y: 0, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: source.radiusMm,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: [
      { vertexId: 'O1', u: source.uMinMm, v: source.vMinMm },
      { vertexId: 'O2', u: source.uMaxMm, v: source.vMinMm },
      { vertexId: 'O3', u: source.uMaxMm, v: source.vMaxMm },
      { vertexId: 'O4', u: source.uMinMm, v: source.vMaxMm },
      { vertexId: 'H1', u: h.uMinMm, v: h.vMinMm },
      { vertexId: 'H2', u: h.uMinMm, v: h.vMaxMm },
      { vertexId: 'H3', u: h.uMaxMm, v: h.vMaxMm },
      { vertexId: 'H4', u: h.uMaxMm, v: h.vMinMm },
    ],
    segments: [
      segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
      segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
      segment('HS1', 'H1', 'H2'), segment('HS2', 'H2', 'H3'),
      segment('HS3', 'H3', 'H4'), segment('HS4', 'H4', 'H1'),
    ],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] },
      { loopId: 'HOLE', role: 'HOLE', segmentIds: ['HS1', 'HS2', 'HS3', 'HS4'] },
    ],
  });
}
function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}
function nearestElementToUv(mesh, geometry, targetUv) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let best = null;
  for (const element of mesh.elements) {
    const uvRows = element.nodeIds.map((id) => curvedHoleShellUvAtPoint3d(geometry, nodeById.get(id)));
    const u = uvRows.reduce((sum, row) => sum + row.u, 0) / uvRows.length;
    const v = uvRows.reduce((sum, row) => sum + row.v, 0) / uvRows.length;
    const distance = Math.hypot(u - targetUv.uMm, v - targetUv.vMm);
    if (!best || distance < best.distance) best = { elementId: element.elementId, distance };
  }
  assert.ok(best);
  return best;
}
