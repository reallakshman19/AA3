import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  jacobianDeterminantStatisticsOf,
} from '../src/core/lafea-meshing/index.js';
import { buildMeshQualityPanel } from '../src/workspace/lafea-mesh-quality-panel.js';

const ROOT = new URL('../', import.meta.url);
const TOL = 1e-12;

const affineT6 = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 3 },
  { x: 1, y: 0 },
  { x: 1, y: 1.5 },
  { x: 0, y: 1.5 },
];
const affineT6Stats = jacobianDeterminantStatisticsOf('T6', affineT6);
assert.equal(affineT6Stats.sampleCount, 6);
assertClose(affineT6Stats.minimum, 6, 'affine T6 detJ minimum');
assertClose(affineT6Stats.maximum, 6, 'affine T6 detJ maximum');
assertClose(affineT6Stats.positiveDeterminantRatio, 1, 'affine T6 detJ ratio');
assert.equal(affineT6Stats.nonPositiveSampleCount, 0);

const distortedT6 = affineT6.map((node) => ({ ...node }));
distortedT6[3] = { x: 1, y: 0.2 };
const distortedT6Stats = jacobianDeterminantStatisticsOf('T6', distortedT6);
assertClose(distortedT6Stats.minimum, 4.4, 'distorted T6 detJ minimum');
assertClose(distortedT6Stats.maximum, 6, 'distorted T6 detJ maximum');
assertClose(
  distortedT6Stats.positiveDeterminantRatio,
  11 / 15,
  'distorted T6 detJ ratio',
);
assert.equal(distortedT6Stats.nonPositiveSampleCount, 0);

const affineQ8 = [
  { x: 0, y: -2 },
  { x: 4, y: -2 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
  { x: 2, y: -2 },
  { x: 4, y: 1 },
  { x: 2, y: 4 },
  { x: 0, y: 1 },
];
const affineQ8Stats = jacobianDeterminantStatisticsOf('Q8', affineQ8);
assert.equal(affineQ8Stats.sampleCount, 13);
assertClose(affineQ8Stats.minimum, 6, 'affine Q8 detJ minimum');
assertClose(affineQ8Stats.maximum, 6, 'affine Q8 detJ maximum');
assertClose(affineQ8Stats.positiveDeterminantRatio, 1, 'affine Q8 detJ ratio');
assert.equal(affineQ8Stats.nonPositiveSampleCount, 0);

const quality = {
  elementResults: [
    {
      elementId: 'E-OK',
      metrics: [
        { metric: 'ASPECT_RATIO', value: 2, status: 'OK' },
        { metric: 'SCALED_JACOBIAN', value: 0.8, status: 'OK' },
        { metric: 'MINIMUM_ANGLE_DEGREES', value: 50, status: 'OK' },
      ],
    },
    {
      elementId: 'E-WARN',
      metrics: [
        { metric: 'ASPECT_RATIO', value: 4, status: 'WARNING' },
        { metric: 'SCALED_JACOBIAN', value: 0.4, status: 'WARNING' },
        { metric: 'MINIMUM_ANGLE_DEGREES', value: 24, status: 'WARNING' },
      ],
    },
  ],
  adjacentSizeRatio: null,
  shellOrientationTopology: null,
};
const panel = buildMeshQualityPanel([
  {
    metric: 'ASPECT_RATIO',
    value: 4,
    status: 'WARNING',
    warningThreshold: 3,
    blockingThreshold: 10,
  },
  {
    metric: 'SCALED_JACOBIAN',
    value: 0.4,
    status: 'WARNING',
    warningThreshold: 0.5,
    blockingThreshold: 0.2,
  },
], {
  stageId: 'LAFEA.3',
  meshProfileIdentity: 'TEST_PROFILE',
  quality,
});
assert.deepEqual(panel.rows[0].affectedElementIds, ['E-WARN']);
assert.deepEqual(panel.rows[1].affectedElementIds, ['E-WARN']);
assert.equal(panel.worstStatus, 'WARNING');
assert.equal(panel.blocksAdvance, false);

const viewModelSource = source('src/workspace/lafea-discretization-view-model.js');
const panelSource = source('src/workspace/lafea-discretization-panel.js');
const qualityPanelSource = source('src/workspace/lafea-mesh-quality-panel.js');
const retainedQualitySource = source('src/workspace/lafea-analysis-mesh-quality.js');

assert.match(viewModelSource, /DERIVED_INSPECTION_ONLY_NO_QUALIFIED_LIMIT/);
assert.match(viewModelSource, /jacobianDeterminantStatisticsOf/);
assert.match(panelSource, /No qualified determinant-ratio limit is applied/);
assert.match(panelSource, /lafea-high-order-mapping-inspection/);
assert.match(qualityPanelSource, /lafea-quality-row-focus-element/);
assert.match(qualityPanelSource, /affectedElementIds/);
assert.equal(
  retainedQualitySource.includes('jacobianDeterminantStatisticsOf'),
  false,
  'derived mapping inspection must not silently enter retained quality/artifact identity',
);

console.log(JSON.stringify({
  status: 'PASS',
  analytical: {
    affineT6: affineT6Stats,
    distortedT6: distortedT6Stats,
    affineQ8: affineQ8Stats,
  },
  qualityTrace: panel.rows.map((row) => ({
    metric: row.metric,
    status: row.status,
    affectedElementIds: row.affectedElementIds,
  })),
  retainedArtifactIdentityChangedByInspection: false,
}, null, 2));

function source(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, ROOT)), 'utf8');
}

function assertClose(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label} must be finite`);
  assert.ok(Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, received ${actual}`);
}
