#!/usr/bin/env node
import assert from 'node:assert/strict';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { produceLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';
import { createLafea4ShellThicknessBasis } from '../src/workspace/lafea-shell-thickness-basis.js';
import {
  createLafea4ShellGeometricQualityEvidence,
  validateLafea4ShellGeometricQualityEvidence,
} from '../src/workspace/lafea4-shell-geometric-quality-evidence.js';

const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH10-SAMPLE-GEOMETRIC-QUALITY');
const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
  'LAFEA.4', authority.sourceHash, document,
);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH10_SAMPLE_CURVATURE_GOVERNED',
  sourceRevision: 'TECH10-SAMPLE-V1',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
    globalTargetSize: 100,
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 5,
    aspectRatioBlock: 10,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  },
});
const generated = produceLafeaShellAnalysisMesh({
  midsurfaceEvidence: midsurface,
  meshProfile: profile,
});
assert.equal(generated.evidence.qualification, 'PASS');
const thickness = createLafea4ShellThicknessBasis({ sourceHash: authority.sourceHash, document });
assert.equal(thickness.classification, 'UNIFORM_THICKNESS');
assert.equal(thickness.uniformThickness, 1.5);

const evidence = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: generated.evidence,
  midsurfaceEvidence: midsurface,
  thicknessBasis: thickness,
});
validateLafea4ShellGeometricQualityEvidence(evidence);

assert.equal(evidence.sourceHash, authority.sourceHash);
assert.equal(evidence.analysisDomainHash, midsurface.analysisDomainHash);
assert.equal(evidence.analysisGeometryHash, midsurface.analysisGeometryHash);
assert.equal(evidence.meshArtifactHash, generated.evidence.artifactHash);
assert.equal(evidence.meshHash, generated.evidence.meshHash);
assert.equal(evidence.meshProfileHash, profile.semanticHash);
assert.equal(evidence.midsurfaceEvidenceHash, midsurface.semanticHash);
assert.equal(evidence.thicknessBasisHash, thickness.semanticHash);
assert.equal(evidence.elementCount, generated.evidence.mesh.elements.length);
assert.equal(evidence.authority, 'MEASURED_INFORMATIONAL_NOT_QUALIFICATION_GATE');
assert.equal(evidence.gateDisposition, 'NOT_GATED');
assert.equal(evidence.qualification, 'NOT_GATED');
assert.equal(evidence.engineeringAuthority, false);
assert.equal(evidence.releaseQualified, false);

const hIndependent = maximumCharacteristicLength(generated.evidence.mesh) / thickness.uniformThickness;
close(evidence.metrics.hOverT.maximum, hIndependent, 1e-12);
assert.equal(evidence.metrics.hOverT.status, 'AVAILABLE_UNIFORM_THICKNESS');
assert.equal(evidence.metrics.hOverT.uniformThickness, 1.5);
assert.ok(Number.isFinite(evidence.metrics.signedSurfaceJacobian.minimum));
assert.ok(Number.isFinite(evidence.metrics.maximumAngleDegrees.maximum));
assert.ok(Number.isFinite(evidence.metrics.shellNormalContinuityDegrees.maximum));
assert.ok(Number.isFinite(evidence.metrics.curvatureChordMidpointDeviation.maximum));
assert.equal(evidence.metrics.facetDeterminantRatio.minimum, 1);
assert.equal(evidence.metrics.facetDeterminantRatio.maximum, 1);

// Existing 15-degree mesher ceiling provides a hand upper bound on a purely
// circumferential chord midpoint sagitta. This is a regression bound only; it
// is not copied into the TECH-10 evidence as an acceptance threshold.
const radius = midsurface.geometry.surface.radius;
const ceilingSagitta = radius * (1 - Math.cos(7.5 * Math.PI / 180));
assert.ok(evidence.metrics.curvatureChordMidpointDeviation.maximum <= ceilingSagitta + 1e-10);

console.log(JSON.stringify({
  check: 'lafea-tech10-shell-geometric-quality-sample',
  status: 'PASS',
  source: {
    sourceHash: authority.sourceHash,
    sourceElementCount: document.elements.length,
    uniformThickness: thickness.uniformThickness,
  },
  retainedMesh: {
    meshHash: generated.evidence.meshHash,
    artifactHash: generated.evidence.artifactHash,
    nodes: generated.evidence.mesh.nodes.length,
    elements: generated.evidence.mesh.elements.length,
  },
  measuredInformation: {
    minimumSignedSurfaceJacobian: evidence.metrics.signedSurfaceJacobian.minimum,
    maximumAngleDegrees: evidence.metrics.maximumAngleDegrees.maximum,
    maximumShellNormalTransitionDegrees: evidence.metrics.shellNormalContinuityDegrees.maximum,
    maximumChordMidpointDeviation: evidence.metrics.curvatureChordMidpointDeviation.maximum,
    maximumHOverT: evidence.metrics.hOverT.maximum,
    determinantRatio: evidence.metrics.facetDeterminantRatio.maximum,
  },
  qualification: 'NOT_GATED',
  releaseQualified: false,
}, null, 2));

function maximumCharacteristicLength(mesh) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  return Math.max(...mesh.elements.map((element) => {
    const nodes = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    return Math.max(
      distance(nodes[0], nodes[1]),
      distance(nodes[1], nodes[2]),
      distance(nodes[2], nodes[0]),
    );
  }));
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`);
}
