import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCurrentTopologyEditTransientSupportPlacementDraft,
  createTopologyEditTransientSupportPlacementDraft,
  topologyEditTransientSupportPlacementDraftMap,
} from '../src/workspace/topology-edit/draft/topology-edit-transient-support-placement-draft.js';

function fixture() {
  return {
    canonicalTopologyHash: 'sha256:transient-support-basis',
    nodes: [
      { id: 'node:a', position: { x: 0, y: 0, z: 0 } },
      { id: 'node:b', position: { x: 1000, y: 0, z: 0 } },
    ],
    edges: [{
      id: 'edge:pipe',
      componentKey: 'P-001',
      entityType: 'PIPE',
      fromNodeId: 'node:a',
      toNodeId: 'node:b',
    }],
    supports: [{
      id: 'support:S-001',
      hostEntityId: 'P-001',
      stationMm: 200,
      origin: { x: 200, y: 0, z: 0 },
    }],
  };
}

test('support drag draft projects arbitrary 3D point onto exact host without canonical mutation', () => {
  const topology = fixture();
  const draft = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:S-001',
    targetPoint: { x: 650, y: 80, z: -20 },
    source: 'CANVAS_DRAG',
    previewHash: 'fnv1a64:support-preview',
  });
  assert.equal(draft.basisHash, topology.canonicalTopologyHash);
  assert.equal(draft.hostEdgeId, 'edge:pipe');
  assert.equal(draft.stationMm, 650);
  assert.equal(draft.segmentParameter, 0.65);
  assert.deepEqual(draft.targetOrigin, { x: 650, y: 0, z: 0 });
  assert.equal(draft.orthogonalDistanceMm, Math.hypot(80, 20));
  assert.deepEqual(topology.supports[0].origin, { x: 200, y: 0, z: 0 });
  assert.equal(assertCurrentTopologyEditTransientSupportPlacementDraft(draft, topology), draft);
});

test('support numeric draft retains exact host station and clamps drag projection to segment ends', () => {
  const topology = fixture();
  const numeric = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:S-001',
    stationMm: 900,
    source: 'CANVAS_NUMERIC',
  });
  assert.equal(numeric.stationMm, 900);
  assert.equal(numeric.segmentParameter, 0.9);
  assert.deepEqual(numeric.targetOrigin, { x: 900, y: 0, z: 0 });
  assert.equal(numeric.orthogonalDistanceMm, 0);

  const endpoint = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:S-001',
    targetPoint: { x: 1400, y: 25, z: 0 },
    source: 'CANVAS_DRAG',
  });
  assert.equal(endpoint.stationMm, 1000);
  assert.equal(endpoint.segmentParameter, 1);
  assert.deepEqual(endpoint.targetOrigin, { x: 1000, y: 0, z: 0 });
  assert.equal(endpoint.orthogonalDistanceMm, Math.hypot(400, 25));
});

test('support placement draft fails closed on no-op, stale basis, changed host, and conflicts', () => {
  const topology = fixture();
  assert.throws(() => createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:S-001',
    targetPoint: { x: 200, y: 30, z: 0 },
    source: 'CANVAS_DRAG',
  }), /no-op/);

  const draft = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:S-001',
    stationMm: 700,
    source: 'CANVAS_NUMERIC',
  });
  assert.throws(() => assertCurrentTopologyEditTransientSupportPlacementDraft(
    draft,
    { ...topology, canonicalTopologyHash: 'sha256:changed-basis' },
  ), /basis differs/);

  const hostChanged = fixture();
  hostChanged.edges[0] = { ...hostChanged.edges[0], id: 'edge:replacement' };
  assert.throws(() => assertCurrentTopologyEditTransientSupportPlacementDraft(draft, hostChanged), /host changed/);

  const conflicting = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:S-001',
    stationMm: 800,
    source: 'CANVAS_NUMERIC',
  });
  assert.throws(() => topologyEditTransientSupportPlacementDraftMap([draft, conflicting]), /conflicting drafts/);
});
