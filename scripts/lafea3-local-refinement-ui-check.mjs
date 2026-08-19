import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  qualifyRefinedMeshAdjacentSizeRatio,
  refinementTransitionLadder,
} from '../src/core/lafea-meshing/refinement-fields.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_POLICY,
} from '../src/workspace/lafea-retained-mesh-refinement.js';

const ROOT = new URL('../', import.meta.url);
const TOL = 1e-12;

const qualified = refinementTransitionLadder(30, 7.5, 1.5);
assert.equal(qualified.growthStepCount, 4);
assertClose(qualified.localToGlobalRatio, 0.25, 'qualified local/global ratio');
assertArrayClose(
  qualified.levels,
  [7.5, 11.25, 16.875, 25.3125, 30],
  'qualified 1.5 transition ladder',
);
assert.ok(qualified.adjacentRatios.every((ratio) => ratio <= 1.5 + TOL));
assertClose(qualified.maximumObservedRatio, 1.5, 'qualified max transition ratio');

const tightened = refinementTransitionLadder(30, 7.5, 1.4);
assert.equal(tightened.growthStepCount, 5);
assertArrayClose(
  tightened.levels,
  [7.5, 10.5, 14.7, 20.58, 28.812, 30],
  'tightened 1.4 transition ladder',
);
assert.ok(tightened.adjacentRatios.every((ratio) => ratio <= 1.4 + TOL));

assertClose(
  LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio,
  0.25,
  'qualified LAFEA.3 minimum target ratio',
);
assert.ok(
  5 / 30 < LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio,
  '30 -> 5 mm must remain outside current LAFEA.3 refinement authority',
);
assertClose(
  30 * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio,
  7.5,
  'minimum qualified local target for h=30',
);

const passAdjacency = qualifyRefinedMeshAdjacentSizeRatio(
  t3Pair({ x: 0.5, y: -1 }),
  1.5,
);
assert.equal(passAdjacency.qualification, 'PASS');
assert.equal(passAdjacency.violatingAdjacencyCount, 0);
assert.ok(passAdjacency.maximumObserved < 1.5);

const blockAdjacency = qualifyRefinedMeshAdjacentSizeRatio(
  t3Pair({ x: 0.5, y: -3 }),
  1.5,
);
const expectedBlockRatio = Math.sqrt(9.25) / Math.sqrt(2);
assertClose(blockAdjacency.maximumObserved, expectedBlockRatio, 'blocking adjacency ratio');
assert.equal(blockAdjacency.qualification, 'BLOCK');
assert.equal(blockAdjacency.violatingAdjacencyCount, 1);
assert.deepEqual(blockAdjacency.blockingElementIds, ['E1', 'E2']);

const evidenceV2Source = source('src/workspace/lafea-analysis-mesh-evidence-v2.js');
const evidenceQualitySource = source('src/workspace/lafea-analysis-mesh-quality.js');
const viewModelSource = source('src/workspace/lafea-discretization-view-model.js');
const panelSource = source('src/workspace/lafea-discretization-generation-panel.js');

assert.match(evidenceV2Source, /qualifyRefinedMeshAdjacentSizeRatio/);
assert.match(evidenceV2Source, /:LOCAL_REFINEMENT:/);
assert.match(
  evidenceV2Source,
  /LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK/,
);
assert.ok(
  evidenceV2Source.indexOf('enforceLafea3RefinementAdjacency(stageId, mesh, meshProfile)')
    < evidenceV2Source.indexOf('const meshHash = lafeaAnalysisMeshContentHash(mesh)'),
  'refinement adjacency must fail before canonical evidence custody/hashing proceeds',
);
assert.match(
  evidenceQualitySource,
  /const adjacentSizeRatio = stageId === 'LAFEA\.4'/,
  'generic v2 retained quality must remain backward-compatible',
);
assert.doesNotMatch(
  evidenceQualitySource,
  /stageId === 'LAFEA\.3' \|\| stageId === 'LAFEA\.4'/,
);
assert.match(viewModelSource, /boundAdjacentSizeRatioMax/);
assert.match(viewModelSource, /DERIVED_RECOMPUTATION_OF_REFINEMENT_RETENTION_GATE/);
assert.match(viewModelSource, /qualifyRefinedMeshAdjacentSizeRatio/);
assert.match(panelSource, /lafea-refinement-transition-preview/);
assert.match(panelSource, /lafea-refinement-adjacency-evidence/);
assert.match(panelSource, /LAFEA_RETAINED_MESH_REFINEMENT_POLICY\.minimumTargetRatio/);
assert.match(panelSource, /CURRENT_UNGRADED_SHELL_REFINEMENT_ONE_ADJACENCY_STEP/);
assert.match(panelSource, /const minimumTargetRatio = 1 \/ growthRatioMax/);
assert.doesNotMatch(panelSource, /global \* 0\.25/);
assert.match(panelSource, /not source-geometry feature IDs/);
assert.match(panelSource, /preview does not certify generated topology/);

console.log(JSON.stringify({
  status: 'PASS',
  analytical: {
    qualifiedTransition: qualified,
    tightenedTransition: tightened,
    currentMinimumTargetRatio: LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio,
    global30MinimumLocal: 7.5,
    global30Local5Authorized: false,
    passAdjacency,
    blockAdjacency,
  },
  authority: {
    retainedEvidenceSchemaChanged: false,
    genericLafea3QualityHashChanged: false,
    actualRefinedChildAdjacencyGate: 'ENFORCED_IN_V2_EVIDENCE_CONSTRUCTOR_BEFORE_CUSTODY',
    uiPolicySource: 'BOUND_PROFILE_PLUS_EXISTING_REFINEMENT_POLICY',
  },
}, null, 2));

function t3Pair(lower) {
  return {
    nodes: [
      { nodeId: 'N1', x: 0, y: 0, z: 0 },
      { nodeId: 'N2', x: 1, y: 0, z: 0 },
      { nodeId: 'N3', x: 0, y: 1, z: 0 },
      { nodeId: 'N4', x: lower.x, y: lower.y, z: 0 },
    ],
    elements: [
      { elementId: 'E1', elementType: 'T3', nodeIds: ['N1', 'N2', 'N3'] },
      { elementId: 'E2', elementType: 'T3', nodeIds: ['N2', 'N1', 'N4'] },
    ],
  };
}

function source(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, ROOT)), 'utf8');
}

function assertClose(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label} must be finite`);
  assert.ok(
    Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function assertArrayClose(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  actual.forEach((value, index) => assertClose(value, expected[index], `${label}[${index}]`));
}
