#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_REFINEMENT_SELECTOR_V3_SCHEMA,
  LAFEA_REFINEMENT_REQUEST_V3_SCHEMA,
  LAFEA_REFINEMENT_ANCESTRY_V3_SCHEMA,
  createLafeaRefinementSelectorV3,
  createLafeaRefinementRequestV3,
  createLafeaRefinementAncestryV3,
} from '../src/workspace/lafea-refinement-evidence-v3.js';

const selector = createLafeaRefinementSelectorV3({
  schema: LAFEA_REFINEMENT_SELECTOR_V3_SCHEMA,
  stageId: 'LAFEA.3', analysisGeometryHash: hash('G'),
  selectorKind: 'MANUAL_GEOMETRY_REGION', featureHash: hash('FILLET-1'),
  physicalRegionHash: hash('REGION'), errorIndicatorFieldHash: null,
  selectorPolicyHash: hash('SELECTOR_POLICY'),
});
assert.equal(selector.engineeringAuthority, false);
assert.throws(() => createLafeaRefinementSelectorV3({
  schema: LAFEA_REFINEMENT_SELECTOR_V3_SCHEMA,
  stageId: 'LAFEA.3', analysisGeometryHash: hash('G'),
  selectorKind: 'MANUAL_GEOMETRY_REGION', featureHash: hash('FILLET-1'),
  physicalRegionHash: hash('REGION'), errorIndicatorFieldHash: null,
  selectorPolicyHash: hash('SELECTOR_POLICY'), elementIds: ['E10'],
}), (error) => error?.code === 'LAFEA_REFINEMENT_V3_SELECTOR_KEYS_INVALID');

const request = createLafeaRefinementRequestV3({
  schema: LAFEA_REFINEMENT_REQUEST_V3_SCHEMA,
  stageId: 'LAFEA.3', parentMeshContentHash: hash('M1'), parentEvidenceHash: hash('E1'),
  meshDependencyHash: hash('D'), selectorHash: selector.selectorHash,
  targetElementLength: 4, lengthUnit: 'mm', refinementMode: 'MANUAL_LOCAL',
});
assert.equal(request.executionAuthorized, false);

const ancestryInput = {
  schema: LAFEA_REFINEMENT_ANCESTRY_V3_SCHEMA,
  stageId: 'LAFEA.3', parentMeshContentHash: hash('M1'), parentEvidenceHash: hash('E1'),
  childMeshContentHash: hash('M2'), childMeshDependencyHash: hash('D'),
  selectorHash: selector.selectorHash, parentToChildMappingHash: hash('MAP'),
  replacedParentRegionHash: hash('REPLACED'), childCoverageHash: hash('COVERAGE'),
  boundaryTransferHash: hash('BOUNDARY'), loadBcTransferHash: hash('LOAD_BC_TRANSFER'),
  materialPropertyTransferHash: hash('PROPERTY_TRANSFER'),
  selectedFeatureContinuityHash: hash('FEATURE_CONTINUITY'),
  conformityPolicyHash: hash('CONFORMITY'), hangingNodePolicy: 'FORBIDDEN',
};
const ancestry = createLafeaRefinementAncestryV3(ancestryInput);
assert.equal(ancestry.engineeringAuthority, false);
assert.throws(() => createLafeaRefinementAncestryV3({
  ...ancestryInput, hangingNodePolicy: 'ALLOW_UNQUALIFIED',
}), (error) => error?.code === 'LAFEA_REFINEMENT_V3_HANGING_NODE_POLICY_INVALID');
assert.notEqual(ancestry.ancestryHash, createLafeaRefinementAncestryV3({
  ...ancestryInput, loadBcTransferHash: hash('OTHER_LOAD_TRANSFER'),
}).ancestryHash);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch10', status: 'PASS',
  selectorIsGeometryRegionAnchoredNotElementIdAnchored: true,
  refinementRequestRemainsNonExecutable: true,
  ancestryBindsCoverageBoundaryLoadsAndProperties: true,
  unqualifiedHangingNodesRejected: true,
  transferChangesAlterAncestryIdentity: true,
}));

function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
