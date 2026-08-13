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

test('NODE_POSITION draft slots distinguish FROM and TO on the same canonical edge', () => {
  const context = fixture();
  const from = nodeIntent(context, 'FROM', { x: -100, y: 0, z: 0 });
  const to = nodeIntent(context, 'TO', { x: 1100, y: 0, z: 0 });

  assert.notEqual(topologyEditTableDraftIntentKey(from), topologyEditTableDraftIntentKey(to));

  const first = planTopologyEditTableDraft({
    intents: [], intent: from, projection: context.projection, canonicalTopology: context.topology,
  });
  const second = planTopologyEditTableDraft({
    intents: first.intents, intent: to, projection: context.projection, canonicalTopology: context.topology,
  });

  assert.equal(second.intents.length, 2);
  assert.deepEqual(second.intents.map((intent) => intent.requestedValue.endpoint).sort(), ['FROM', 'TO']);
  assert.equal(second.batch.intentCount, 2);
  assert.deepEqual(second.batchPlan.operationPlan.commandIntents.map((intent) => intent.payload.nodeId).sort(), [
    'node:a', 'node:b',
  ]);
});

test('restaging one endpoint replaces only that endpoint slot', () => {
  const context = fixture();
  const from1 = nodeIntent(context, 'FROM', { x: -100, y: 0, z: 0 });
  const to = nodeIntent(context, 'TO', { x: 1100, y: 0, z: 0 });
  const from2 = nodeIntent(context, 'FROM', { x: -200, y: 0, z: 0 });

  const first = planTopologyEditTableDraft({
    intents: [], intent: from1, projection: context.projection, canonicalTopology: context.topology,
  });
  const second = planTopologyEditTableDraft({
    intents: first.intents, intent: to, projection: context.projection, canonicalTopology: context.topology,
  });
  const third = planTopologyEditTableDraft({
    intents: second.intents, intent: from2, projection: context.projection, canonicalTopology: context.topology,
  });

  assert.equal(third.intents.length, 2);
  const from = third.intents.find((intent) => intent.requestedValue.endpoint === 'FROM');
  const retainedTo = third.intents.find((intent) => intent.requestedValue.endpoint === 'TO');
  assert.equal(from.requestedValue.position.x, -200);
  assert.equal(retainedTo.requestedValue.position.x, 1100);
});

test('different intent kinds on one canonical edge occupy different draft slots', () => {
  const context = fixture();
  const length = lengthIntent(context, 1200);
  const from = nodeIntent(context, 'FROM', { x: -100, y: 0, z: 0 });
  assert.notEqual(topologyEditTableDraftIntentKey(length), topologyEditTableDraftIntentKey(from));
});
