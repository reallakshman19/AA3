#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_ANALYSIS_MESH_SCHEMA,
  lafeaAnalysisMeshContentHash,
} from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import {
  LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_ORIENTATION,
  LAFEA_SHELL_CURVED_TOPOLOGY,
  createLafeaCurvedShellAnalysisDomain,
  createLafeaCurvedShellMidsurfaceEvidence,
  createLafeaCurvedShellMidsurfaceGeometry,
  cylindricalShellPoint3d,
} from '../src/workspace/lafea-shell-curved-midsurface-contract.js';
import { createLafea4ShellGeometricQualityEvidence } from '../src/workspace/lafea4-shell-geometric-quality-evidence.js';
import {
  LAFEA4_PARENT_NORMAL_CRITERION,
  LAFEA4_PARENT_NORMAL_ROUNDOFF_POLICY,
  qualifyLafea4ShellParentNormalOrientation,
  validateLafea4ShellParentNormalQualification,
} from '../src/workspace/lafea4-shell-parent-normal-qualification.js';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/parent-normal-inversion-v1.json', import.meta.url),
  'utf8',
));
assert.equal(definition.productionBindingAuthorized, false);
assert.equal(definition.releaseQualified, false);

const positive = fixture(60, false, 'POSITIVE');
assert.equal(positive.evidence.qualification, 'PASS');
assert.equal(positive.evidence.quality.shellOrientationTopology.qualification, 'PASS');
const positiveQ = qualifyLafea4ShellParentNormalOrientation({
  meshEvidence: positive.evidence,
  midsurfaceEvidence: positive.parent,
});
validateLafea4ShellParentNormalQualification(positiveQ);
assert.equal(positiveQ.criterion, LAFEA4_PARENT_NORMAL_CRITERION);
assert.equal(positiveQ.roundoffPolicy, LAFEA4_PARENT_NORMAL_ROUNDOFF_POLICY);
assert.equal(positiveQ.qualification, 'PASS');
assert.equal(positiveQ.blockedElementCount, 0);
assert.equal(positiveQ.productionBindingAuthorized, false);
assert.equal(positiveQ.releaseQualified, false);
const chord120 = 2 * definition.oracle.radiusMm * Math.sin(Math.PI / 3);
const jPositive = chord120 * definition.oracle.axialLegMm;
const minPositive = jPositive * 0.5;
close(jPositive, definition.oracle.positive.expectedJacobianMagnitudeMm2, 1e-12);
close(minPositive, definition.oracle.positive.expectedMinimumParentDirectedJacobianMm2, 1e-12);
close(positiveQ.minimumParentDirectedJacobian, minPositive, 1e-12);
close(positiveQ.minimumAlignmentCosine, 0.5, 1e-12);
close(positiveQ.witness.angularSpanDegrees, 120, 1e-12);

const zero = fixture(90, false, 'ZERO');
assert.equal(zero.evidence.qualification, 'PASS');
assert.equal(zero.evidence.quality.shellOrientationTopology.qualification, 'PASS');
const zeroTech10 = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: zero.evidence,
  midsurfaceEvidence: zero.parent,
});
assert.ok(zeroTech10.metrics.signedSurfaceJacobian.minimum > 0,
  'centroid-only TECH-10 sign must remain positive for the 180-degree blind-spot fixture');
assert.equal(zeroTech10.metrics.signedSurfaceJacobian.negativeOrZeroElementCount, 0);
const zeroQ = qualifyLafea4ShellParentNormalOrientation({
  meshEvidence: zero.evidence,
  midsurfaceEvidence: zero.parent,
});
validateLafea4ShellParentNormalQualification(zeroQ);
assert.equal(zeroQ.qualification, 'BLOCK');
assert.equal(zeroQ.roundoffBandElementCount, 1);
assert.equal(zeroQ.negativeElementCount, 0);
assert.equal(zeroQ.witness.classification, 'ZERO_OR_ROUNDOFF_BAND');
assert.ok(Math.abs(zeroQ.minimumParentDirectedJacobian) <= zeroQ.witness.roundoffEnvelope);
close(zeroQ.witness.angularSpanDegrees, 180, 1e-12);
const expectedZeroCentroid = 10000 * Math.cos(Math.PI / 6);
close(zeroTech10.metrics.signedSurfaceJacobian.minimum, expectedZeroCentroid, 1e-12);

const reversed = fixture(60, true, 'REVERSED');
assert.equal(reversed.evidence.qualification, 'PASS',
  'unsigned shape metrics and single-patch topology intentionally do not detect global reversal');
assert.equal(reversed.evidence.quality.shellOrientationTopology.qualification, 'PASS');
const reversedQ = qualifyLafea4ShellParentNormalOrientation({
  meshEvidence: reversed.evidence,
  midsurfaceEvidence: reversed.parent,
});
validateLafea4ShellParentNormalQualification(reversedQ);
assert.equal(reversedQ.qualification, 'BLOCK');
assert.equal(reversedQ.negativeElementCount, 1);
assert.equal(reversedQ.roundoffBandElementCount, 0);
assert.equal(reversedQ.witness.classification, 'NEGATIVE');
close(reversedQ.minimumParentDirectedJacobian, -jPositive, 1e-12);
close(reversedQ.minimumAlignmentCosine, -1, 1e-12);

assert.notEqual(positiveQ.semanticHash, zeroQ.semanticHash);
assert.notEqual(positiveQ.semanticHash, reversedQ.semanticHash);

console.log(JSON.stringify({
  check: 'lafea-tech11-parent-normal-inversion',
  status: 'PASS',
  criterion: LAFEA4_PARENT_NORMAL_CRITERION,
  positive: {
    retainedMeshQualification: positive.evidence.qualification,
    existingOrientationTopology: positive.evidence.quality.shellOrientationTopology.qualification,
    minimumParentDirectedJacobianMm2: positiveQ.minimumParentDirectedJacobian,
    minimumAlignmentCosine: positiveQ.minimumAlignmentCosine,
    qualification: positiveQ.qualification,
  },
  zeroBoundary: {
    retainedMeshQualification: zero.evidence.qualification,
    existingOrientationTopology: zero.evidence.quality.shellOrientationTopology.qualification,
    tech10CentroidSignedJacobianMm2: zeroTech10.metrics.signedSurfaceJacobian.minimum,
    exactIntervalMinimumMm2: zeroQ.minimumParentDirectedJacobian,
    roundoffEnvelopeMm2: zeroQ.witness.roundoffEnvelope,
    classification: zeroQ.witness.classification,
    qualification: zeroQ.qualification,
  },
  reversedWinding: {
    retainedMeshQualification: reversed.evidence.qualification,
    existingOrientationTopology: reversed.evidence.quality.shellOrientationTopology.qualification,
    minimumParentDirectedJacobianMm2: reversedQ.minimumParentDirectedJacobian,
    minimumAlignmentCosine: reversedQ.minimumAlignmentCosine,
    classification: reversedQ.witness.classification,
    qualification: reversedQ.qualification,
  },
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function fixture(halfAngleDegrees, reversed, identity) {
  const radius = definition.oracle.radiusMm;
  const axialLeg = definition.oracle.axialLegMm;
  const halfAngle = halfAngleDegrees * Math.PI / 180;
  const uHalf = radius * halfAngle;
  const sourceHash = canonicalLafeaSha256({ schema: 'tech11-source/v1', identity });
  const geometry = createLafeaCurvedShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: `TECH11-${identity}-CYLINDER`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 0, y: 0, z: 0 },
      axisDirection: { x: 1, y: 0, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: -uHalf, v: 0 },
      { vertexId: 'V2', u: uHalf, v: 0 },
      { vertexId: 'V3', u: uHalf, v: axialLeg },
      { vertexId: 'V4', u: -uHalf, v: axialLeg },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
  const domain = createLafeaCurvedShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: `TECH11-${identity}-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_TOPOLOGY,
  });
  const parent = createLafeaCurvedShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: `TECH11-${identity}-PARENT`,
  });
  const a = cylindricalShellPoint3d(geometry, -uHalf, 0);
  const b = cylindricalShellPoint3d(geometry, uHalf, 0);
  const c = cylindricalShellPoint3d(geometry, uHalf, axialLeg);
  const mesh = {
    schema: LAFEA_ANALYSIS_MESH_SCHEMA,
    meshIdentity: `TECH11-${identity}-MESH`,
    nodes: [
      { nodeId: 'A', x: a.x, y: a.y, z: a.z },
      { nodeId: 'B', x: b.x, y: b.y, z: b.z },
      { nodeId: 'C', x: c.x, y: c.y, z: c.z },
    ],
    elements: [{
      elementId: 'E1',
      elementType: 'CST_DKT_TRI3_THIN_SHELL_V1',
      nodeIds: reversed ? ['A', 'C', 'B'] : ['A', 'B', 'C'],
    }],
  };
  const profile = canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `TECH11_${identity}_PROFILE`,
    sourceRevision: 'TECH11-Q1-R1',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: 250,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash,
    analysisDomainHash: domain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    meshProfile: profile,
    mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.4',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: `TECH11-${identity}-FIXTURE`,
      sourceHash,
      analysisDomainHash: domain.semanticHash,
      analysisGeometryHash: geometry.semanticHash,
      meshProfileHash: profile.semanticHash,
      meshHash,
      capabilityHash: canonicalLafeaSha256({ schema: 'tech11-capability/v1', identity }),
      qualificationHash: canonicalLafeaSha256({ schema: 'tech11-upstream-qualification/v1', identity }),
      planHash: canonicalLafeaSha256({ schema: 'tech11-plan/v1', identity }),
    },
  });
  return { parent, evidence };
}

function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`);
}
