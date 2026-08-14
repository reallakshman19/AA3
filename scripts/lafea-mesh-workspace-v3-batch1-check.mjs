#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_ANALYSIS_MESH_SCHEMA,
} from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  createLafeaAnalysisMeshIdentityV3,
  lafeaAnalysisMeshArtifactHashV3,
  lafeaAnalysisMeshContentHashV3,
} from '../src/workspace/lafea-analysis-mesh-identity-v3.js';
import {
  LAFEA_MESH_DEPENDENCY_V3_SCHEMA,
  createLafeaMeshDependencyProjectionV3,
  sameLafeaMeshDependencyV3,
  validateLafeaMeshDependencyProjectionV3,
} from '../src/workspace/lafea-mesh-dependency-v3.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';

const meshA = mesh('MESH-A', [
  node('N2', 10, 0),
  node('N1', 0, 0),
  node('N3', 0, 10),
]);
const meshB = mesh('MESH-B', [
  node('N3', 0, 10),
  node('N1', 0, 0),
  node('N2', 10, 0),
]);

// Numerical identity excludes meshIdentity and remains canonical-order stable.
assert.equal(lafeaAnalysisMeshContentHashV3(meshA), lafeaAnalysisMeshContentHashV3(meshB));
assert.notEqual(lafeaAnalysisMeshArtifactHashV3(meshA), lafeaAnalysisMeshArtifactHashV3(meshB));
const identityA = createLafeaAnalysisMeshIdentityV3(meshA);
assert.equal(identityA.meshContentHash, lafeaAnalysisMeshContentHashV3(meshA));
assert.equal(identityA.meshArtifactHash, lafeaAnalysisMeshArtifactHashV3(meshA));
assert.equal(identityA.engineeringAuthority, false);
assert.ok(Object.isFrozen(identityA));

const moved = structuredClone(meshA);
moved.nodes.find((row) => row.nodeId === 'N2').x += 0.25;
assert.notEqual(lafeaAnalysisMeshContentHashV3(meshA), lafeaAnalysisMeshContentHashV3(moved));
assert.notEqual(lafeaAnalysisMeshArtifactHashV3(meshA), lafeaAnalysisMeshArtifactHashV3(moved));

const baseDependencies = dependencyInput({
  sourceHash: hash('SOURCE-A'),
});
const depA = createLafeaMeshDependencyProjectionV3(baseDependencies);
assert.deepEqual(validateLafeaMeshDependencyProjectionV3(depA), depA);
assert.ok(Object.isFrozen(depA));

// Whole-source provenance may change without forcing a remesh.
const depSourceOnly = createLafeaMeshDependencyProjectionV3(dependencyInput({
  sourceHash: hash('SOURCE-B'),
}));
assert.equal(depA.meshDependencyHash, depSourceOnly.meshDependencyHash);
assert.notEqual(depA.projectionHash, depSourceOnly.projectionHash);
assert.equal(sameLafeaMeshDependencyV3(depA, depSourceOnly), true);

// Every governed mesh-affecting parent must change mesh custody identity.
for (const [field, replacement] of [
  ['geometryTopologyHash', hash('TOPOLOGY-B')],
  ['analysisGeometryHash', hash('GEOMETRY-B')],
  ['propertyBoundaryHash', hash('PROPERTY-BOUNDARY-B')],
  ['meshProfileHash', 'fnv1a64:mesh-profile-b'],
  ['meshAffectingPropertyHash', hash('MESH-PROPERTY-B')],
  ['geometryPredicateProfileHash', hash('PREDICATES-B')],
]) {
  const changed = createLafeaMeshDependencyProjectionV3(dependencyInput({ [field]: replacement }));
  assert.notEqual(depA.meshDependencyHash, changed.meshDependencyHash, field);
  assert.equal(sameLafeaMeshDependencyV3(depA, changed), false, field);
}

const stageChanged = createLafeaMeshDependencyProjectionV3(dependencyInput({
  stageId: 'LAFEA.4',
}));
assert.notEqual(depA.meshDependencyHash, stageChanged.meshDependencyHash);

// Load/BC and display/report hashes do not belong in this projection; adapters
// must project only a genuine mesh-affecting consequence into governed fields.
assert.throws(
  () => createLafeaMeshDependencyProjectionV3({
    ...baseDependencies,
    loadBcHash: hash('LOAD-BC'),
  }),
  (error) => error?.code === 'LAFEA_MESH_DEPENDENCY_V3_KEYS_INVALID',
);

const tampered = structuredClone(depA);
tampered.meshDependencyHash = hash('ATTACKER');
assert.throws(
  () => validateLafeaMeshDependencyProjectionV3(tampered),
  (error) => error?.code === 'LAFEA_MESH_DEPENDENCY_V3_HASH_INVALID',
);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch1',
  status: 'PASS',
  meshIdentitySeparatedFromNumericalContent: true,
  canonicalOrderingStable: true,
  numericalMutationChangesContentIdentity: true,
  sourceAuditChangeDoesNotForceRemesh: true,
  governedDependencyMutationsForceRemesh: true,
  stageIsPartOfDependencyIdentity: true,
  nonMeshDependenciesRejectedFromProjection: true,
  dependencyTamperRejected: true,
}));

function dependencyInput(overrides = {}) {
  return {
    schema: LAFEA_MESH_DEPENDENCY_V3_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: hash('SOURCE-A'),
    geometryTopologyHash: hash('TOPOLOGY-A'),
    analysisGeometryHash: hash('GEOMETRY-A'),
    propertyBoundaryHash: hash('PROPERTY-BOUNDARY-A'),
    meshProfileHash: 'fnv1a64:mesh-profile-a',
    meshAffectingPropertyHash: hash('MESH-PROPERTY-A'),
    geometryPredicateProfileHash: hash('PREDICATES-A'),
    ...overrides,
  };
}

function mesh(meshIdentity, nodes) {
  return {
    schema: LAFEA_ANALYSIS_MESH_SCHEMA,
    meshIdentity,
    nodes,
    elements: [{
      elementId: 'E1',
      elementType: 'T3',
      nodeIds: ['N1', 'N2', 'N3'],
    }],
  };
}

function node(nodeId, x, y) {
  return { nodeId, x, y, z: 0 };
}

function hash(value) {
  return canonicalLafeaSha256({
    schema: 'lafea-mesh-workspace-v3-batch1-fixture/v1',
    value,
  });
}
