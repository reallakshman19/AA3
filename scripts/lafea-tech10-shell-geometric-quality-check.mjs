#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
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
import {
  LAFEA4_SHELL_GEOMETRIC_QUALITY_AUTHORITY,
  LAFEA4_SHELL_GEOMETRIC_QUALITY_GATE_DISPOSITION,
  createLafea4ShellGeometricQualityEvidence,
  validateLafea4ShellGeometricQualityEvidence,
} from '../src/workspace/lafea4-shell-geometric-quality-evidence.js';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/shell-geometric-quality-v1.json', import.meta.url),
  'utf8',
));
const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;
const R = definition.geometry.radiusMm;
const THETA = definition.geometry.circumferentialBayDegrees * Math.PI / 180;
const U = R * THETA;
const CHORD = 2 * R * Math.sin(THETA / 2);
const T = definition.geometry.thicknessMm;

close(U, definition.geometry.circumferentialBayArcLengthMm, 1e-12);
close(CHORD, definition.geometry.circumferentialChordMm, 1e-12);

const fixture = cylindricalTwoFacetFixture(false);
const thickness = thicknessBasis(SOURCE_HASH, T);
const evidence = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: fixture.meshEvidence,
  midsurfaceEvidence: fixture.midsurface,
  thicknessBasis: thickness,
});
const rebuilt = validateLafea4ShellGeometricQualityEvidence(evidence);
assert.equal(rebuilt.semanticHash, evidence.semanticHash);
assert.equal(evidence.authority, LAFEA4_SHELL_GEOMETRIC_QUALITY_AUTHORITY);
assert.equal(evidence.authority, definition.authority);
assert.equal(evidence.gateDisposition, LAFEA4_SHELL_GEOMETRIC_QUALITY_GATE_DISPOSITION);
assert.equal(evidence.gateDisposition, definition.gateDisposition);
assert.equal(evidence.qualification, 'NOT_GATED');
assert.equal(evidence.engineeringAuthority, false);
assert.equal(evidence.releaseQualified, false);
assert.equal(evidence.meshArtifactHash, fixture.meshEvidence.artifactHash);
assert.equal(evidence.meshHash, fixture.meshEvidence.meshHash);
assert.equal(evidence.midsurfaceEvidenceHash, fixture.midsurface.semanticHash);
assert.equal(evidence.thicknessBasisHash, thickness.semanticHash);
assert.equal(evidence.elementCount, 2);

const expectedJacobianMagnitude = CHORD * CHORD;
const expectedArea = expectedJacobianMagnitude / 2;
const expectedSigned = expectedJacobianMagnitude * Math.cos(THETA / 6);
const expectedSagitta = R * (1 - Math.cos(THETA / 2));
const expectedCharacteristicLength = CHORD * Math.sqrt(2);
const expectedHOverT = expectedCharacteristicLength / T;

close(expectedArea, definition.handCalculation.facetAreaMm2, 1e-12);
close(expectedJacobianMagnitude, definition.handCalculation.surfaceJacobianMagnitudeMm2, 1e-12);
close(expectedSigned, definition.handCalculation.signedSurfaceJacobianMm2, 1e-12);
close(expectedSagitta, definition.handCalculation.maximumChordMidpointDeviationMm, 1e-12);
close(expectedCharacteristicLength, definition.handCalculation.characteristicLengthMm, 1e-12);
close(expectedHOverT, definition.handCalculation.maximumHOverT, 1e-12);

const signed = evidence.metrics.signedSurfaceJacobian;
assert.equal(signed.negativeOrZeroElementCount, 0);
close(signed.minimum, expectedSigned, 1e-10);
close(signed.maximum, expectedSigned, 1e-10);
close(signed.minimumWitness.surfaceJacobianMagnitude, expectedJacobianMagnitude, 1e-10);
close(signed.minimumWitness.facetArea, expectedArea, 1e-10);
close(signed.minimumWitness.parentDirectorAlignmentCosine, Math.cos(THETA / 6), 1e-12);

assert.equal(evidence.metrics.facetDeterminantRatio.minimum, 1);
assert.equal(evidence.metrics.facetDeterminantRatio.maximum, 1);
close(evidence.metrics.maximumAngleDegrees.maximum, 90, 1e-10);
close(evidence.metrics.shellNormalContinuityDegrees.maximum,
  definition.handCalculation.adjacentFacetNormalAngleDegrees, 1e-10);
assert.equal(evidence.metrics.shellNormalContinuityDegrees.sharedEdgeCount, 1);
assert.equal(evidence.metrics.shellNormalContinuityDegrees.nonManifoldSharedEdgeCount, 0);
assert.deepEqual(
  evidence.metrics.shellNormalContinuityDegrees.witness.elementIds,
  ['E1', 'E2'],
);
close(evidence.metrics.curvatureChordMidpointDeviation.maximum, expectedSagitta, 1e-10);
assert.equal(evidence.metrics.hOverT.status, 'AVAILABLE_UNIFORM_THICKNESS');
close(evidence.metrics.hOverT.uniformThickness, T, 1e-12);
close(evidence.metrics.hOverT.maximum, expectedHOverT, 1e-10);

// Parent-normal sign is measured explicitly but is intentionally not a gate in TECH-10.
const reversedFixture = cylindricalTwoFacetFixture(true);
const reversed = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: reversedFixture.meshEvidence,
  midsurfaceEvidence: reversedFixture.midsurface,
  thicknessBasis: thickness,
});
assert.ok(reversed.metrics.signedSurfaceJacobian.minimum < 0);
assert.equal(reversed.metrics.signedSurfaceJacobian.negativeOrZeroElementCount, 1);
assert.equal(reversed.qualification, 'NOT_GATED');
assert.equal(reversed.releaseQualified, false);

// Nonuniform source thickness is not collapsed to an arbitrary representative t.
const nonuniform = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: fixture.meshEvidence,
  midsurfaceEvidence: fixture.midsurface,
  thicknessBasis: thicknessBasis(SOURCE_HASH, null, 1.5, 2),
});
assert.equal(nonuniform.metrics.hOverT.status, 'UNAVAILABLE_NONUNIFORM_THICKNESS');
assert.equal(nonuniform.metrics.hOverT.uniformThickness, null);
assert.equal(nonuniform.metrics.hOverT.maximum, null);

const withoutThickness = createLafea4ShellGeometricQualityEvidence({
  meshEvidence: fixture.meshEvidence,
  midsurfaceEvidence: fixture.midsurface,
});
assert.equal(withoutThickness.metrics.hOverT.status, 'UNAVAILABLE_THICKNESS_BASIS_NOT_SUPPLIED');

assert.throws(
  () => createLafea4ShellGeometricQualityEvidence({
    meshEvidence: fixture.meshEvidence,
    midsurfaceEvidence: fixture.midsurface,
    thicknessBasis: thicknessBasis(`sha256:${'b'.repeat(64)}`, T),
  }),
  (error) => error?.code === 'LAFEA4_SHELL_GEOMETRIC_QUALITY_THICKNESS_STALE',
);

const tampered = structuredClone(evidence);
tampered.metrics.maximumAngleDegrees.maximum += 1;
assert.throws(
  () => validateLafea4ShellGeometricQualityEvidence(tampered),
  (error) => error?.code === 'LAFEA4_SHELL_GEOMETRIC_QUALITY_HASH_INVALID',
);

const source = fs.readFileSync(
  new URL('../src/workspace/lafea4-shell-geometric-quality-evidence.js', import.meta.url),
  'utf8',
);
assert.match(source, /MEASURED_INFORMATIONAL_NOT_QUALIFICATION_GATE/u);
assert.match(source, /qualification: 'NOT_GATED'/u);
assert.match(source, /engineeringAuthority: false/u);
assert.match(source, /releaseQualified: false/u);
assert.doesNotMatch(source, /warningThreshold|blockingThreshold|qualificationLimit/u);

console.log(JSON.stringify({
  check: 'lafea-tech10-shell-geometric-quality',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  handCalculation: {
    radiusMm: R,
    circumferentialBayDegrees: definition.geometry.circumferentialBayDegrees,
    chordMm: CHORD,
    surfaceJacobianMagnitudeMm2: expectedJacobianMagnitude,
    signedSurfaceJacobianMm2: expectedSigned,
    facetAreaMm2: expectedArea,
    determinantRatio: 1,
    maximumAngleDegrees: evidence.metrics.maximumAngleDegrees.maximum,
    adjacentFacetNormalAngleDegrees: evidence.metrics.shellNormalContinuityDegrees.maximum,
    chordMidpointDeviationMm: evidence.metrics.curvatureChordMidpointDeviation.maximum,
    characteristicLengthMm: expectedCharacteristicLength,
    hOverT: evidence.metrics.hOverT.maximum,
  },
  reversedParentNormalSignObserved: reversed.metrics.signedSurfaceJacobian.minimum < 0,
  nonuniformThicknessManufactured: false,
  gateDisposition: evidence.gateDisposition,
  engineeringAuthority: false,
  releaseQualified: false,
}, null, 2));

function cylindricalTwoFacetFixture(reverseFirst) {
  const geometry = createLafeaCurvedShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: 'TECH10-R100-TWO-FACET-CYLINDER',
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 0, y: 0, z: 0 },
      axisDirection: { x: 1, y: 0, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: R,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: 0, v: 0 },
      { vertexId: 'V2', u: 2 * U, v: 0 },
      { vertexId: 'V3', u: 2 * U, v: CHORD },
      { vertexId: 'V4', u: 0, v: CHORD },
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
    domainId: 'TECH10-R100-TWO-FACET-DOMAIN',
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_TOPOLOGY,
  });
  const midsurface = createLafeaCurvedShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'TECH10-FROZEN-CYLINDER-PARENT',
  });
  const profile = canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: 'TECH10_TRI3_GEOMETRIC_QUALITY',
    sourceRevision: 'TECH10-FROZEN-V1',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: SHELL_TRI3,
      globalTargetSize: CHORD,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
  const p1 = cylindricalShellPoint3d(geometry, 0, 0);
  const p2 = cylindricalShellPoint3d(geometry, U, 0);
  const p3 = cylindricalShellPoint3d(geometry, U, CHORD);
  const p4 = cylindricalShellPoint3d(geometry, 2 * U, 0);
  const mesh = {
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: reverseFirst ? 'TECH10-REVERSED-FIRST-FACET' : 'TECH10-TWO-FACET-MESH',
    nodes: [node('N1', p1), node('N2', p2), node('N3', p3), node('N4', p4)],
    elements: [
      { elementId: 'E1', elementType: SHELL_TRI3, nodeIds: reverseFirst ? ['N1', 'N3', 'N2'] : ['N1', 'N2', 'N3'] },
      { elementId: 'E2', elementType: SHELL_TRI3, nodeIds: ['N2', 'N4', 'N3'] },
    ],
  };
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  const meshEvidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: SOURCE_HASH,
    analysisDomainHash: midsurface.analysisDomainHash,
    analysisGeometryHash: midsurface.analysisGeometryHash,
    meshProfile: profile,
    mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.4',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: 'TECH10-FROZEN-GEOMETRY-FIXTURE',
      sourceHash: SOURCE_HASH,
      analysisDomainHash: midsurface.analysisDomainHash,
      analysisGeometryHash: midsurface.analysisGeometryHash,
      meshProfileHash: profile.semanticHash,
      meshHash,
      capabilityHash: `sha256:${'c'.repeat(64)}`,
      qualificationHash: `sha256:${'d'.repeat(64)}`,
      planHash: `sha256:${'e'.repeat(64)}`,
    },
  });
  return { midsurface, meshEvidence };
}

function thicknessBasis(sourceHash, uniformThickness, minimum = uniformThickness, maximum = uniformThickness) {
  const classification = uniformThickness === null ? 'NONUNIFORM_THICKNESS' : 'UNIFORM_THICKNESS';
  const core = {
    schema: 'lafea4-shell-thickness-basis/v1',
    stageId: 'LAFEA.4',
    sourceHash,
    documentRevisionDigest: 'fnv1a64:0123456789abcdef',
    elementCount: 2,
    minimumThickness: minimum,
    maximumThickness: maximum,
    uniformThickness,
    classification,
  };
  return Object.freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-thickness-basis-hash-input/v1', basis: core,
    }),
  });
}
function node(nodeId, point) { return { nodeId, x: point.x, y: point.y, z: point.z }; }
function close(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`);
}
