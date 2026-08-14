import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import { buildTopologyEditTableProjection } from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
import { createTopologyEditTableIntent } from '../src/workspace/topology-edit/table/topology-edit-table-intent.js';
import {
  planTopologyEditTableDraft,
  topologyEditTableDraftIntentKey,
} from '../src/workspace/topology-edit/table/topology-edit-table-draft-plan.js';

function fixture() {
  const topology = finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'dataset-draft-plan', datasetVersion: 1,
    sourceHash: 'sha256:draft-plan-source', topologyGraphHash: 'sha256:draft-plan-graph',
    nodes: [
      { id: 'node:a', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:b', position: { x: 1000, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{
      id: 'edge:pipe', componentKey: 'pipe:1', entityType: 'PIPE',
      fromNodeId: 'node:a', toNodeId: 'node:b', diameterMm: 100,
    }],
    junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
  });
  const session = new TopologyEditCertifiedSession(topology);
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  return { topology, session, projection };
}

function nodeIntent(context, endpoint, position) {
  const nodeId = endpoint === 'FROM' ? 'node:a' : 'node:b';
  const expectedPosition = endpoint === 'FROM'
    ? { x: 0, y: 0, z: 0 }
    : { x: 1000, y: 0, z: 0 };
  return createTopologyEditTableIntent({
    projection: context.projection,
    sessionSnapshot: context.session.snapshot(),
    canonicalId: 'edge:pipe',
    intentKind: 'NODE_POSITION',
    requestedValue: { endpoint, nodeId, expectedPosition, position },
    geometryPolicy: { movementMode: 'NODE_ONLY' },
  });
}

function lengthIntent(context, lengthMm) {
  return createTopologyEditTableIntent({
    projection: context.projection,
    sessionSnapshot: context.session.snapshot(),
    canonicalId: 'edge:pipe',
    intentKind: 'PIPE_LENGTH',
    requestedValue: { lengthMm },
    geometryPolicy: { anchor: 'FROM', propagation: 'DOWNSTREAM' },
  });
}

test('NODE_POSITION draft keys distinguish FROM and TO while certified batch authority stays fail-closed', () => {
  const context = fixture();
  const from = nodeIntent(context, 'FROM', { x: -100, y: 0, z: 0 });
  const to = nodeIntent(context, 'TO', { x: 1100, y: 0, z: 0 });

  assert.notEqual(topologyEditTableDraftIntentKey(from), topologyEditTableDraftIntentKey(to));

  const first = planTopologyEditTableDraft({
    intents: [], intent: from, projection: context.projection, canonicalTopology: context.topology,
  });
  assert.equal(first.intents.length, 1);
  assert.equal(first.intents[0].requestedValue.endpoint, 'FROM');

  assert.throws(() => planTopologyEditTableDraft({
    intents: first.intents, intent: to, projection: context.projection, canonicalTopology: context.topology,
  }), /duplicate intent target edge:pipe \/ NODE_POSITION/);
});

test('restaging one endpoint replaces that endpoint slot deterministically', () => {
  const context = fixture();
  const from1 = nodeIntent(context, 'FROM', { x: -100, y: 0, z: 0 });
  const from2 = nodeIntent(context, 'FROM', { x: -200, y: 0, z: 0 });

  const first = planTopologyEditTableDraft({
    intents: [], intent: from1, projection: context.projection, canonicalTopology: context.topology,
  });
  const second = planTopologyEditTableDraft({
    intents: first.intents, intent: from2, projection: context.projection, canonicalTopology: context.topology,
  });

  assert.equal(second.intents.length, 1);
  assert.equal(second.intents[0].requestedValue.endpoint, 'FROM');
  assert.equal(second.intents[0].requestedValue.position.x, -200);
  assert.equal(second.batch.intentCount, 1);
});

test('different intent kinds on one canonical edge occupy different draft keys', () => {
  const context = fixture();
  const length = lengthIntent(context, 1200);
  const from = nodeIntent(context, 'FROM', { x: -100, y: 0, z: 0 });
  assert.notEqual(topologyEditTableDraftIntentKey(length), topologyEditTableDraftIntentKey(from));
});
