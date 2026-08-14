import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  createTopologyEditTransientSupportPlacementDraft,
} from '../src/workspace/topology-edit/draft/topology-edit-transient-support-placement-draft.js';
import {
  planTopologyEditTableDraft,
} from '../src/workspace/topology-edit/table/topology-edit-table-draft-plan.js';
import {
  buildTopologyEditTableProjection,
} from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
import {
  createTopologyEditTableSupportIntentFromTransientDraft,
} from '../src/workspace/topology-edit/table/topology-edit-table-transient-support-bridge.js';

function fixture() {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'transient-support-bridge', datasetVersion: 1,
    sourceHash: 'sha256:transient-support-bridge-source',
    topologyGraphHash: 'sha256:transient-support-bridge-graph',
    nodes: [
      { id: 'node:n1', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:n2', position: { x: 1000, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{
      id: 'edge:p1', componentKey: 'pipe:p1', fromNodeId: 'node:n1', toNodeId: 'node:n2',
      entityType: 'PIPE', diameterMm: 100, outsideDiameterMm: 114,
      diameterAuthority: 'OUTSIDE_DIAMETER',
    }],
    junctions: [], boundaries: [], rigids: [], bends: [],
    supports: [{
      id: 'support:s1', entityId: 'support-source:s1', nodeId: 'node:n1',
      hostEntityId: 'pipe:p1', stationMm: 250, resolved: true,
      origin: { x: 250, y: 0, z: 0 }, originAuthority: 'ATTACHMENT_PROJECTED_POINT',
      attachmentId: 'attachment:s1', attachmentSegmentParameter: 0.25,
      restraints: [{ id: 'restraint:source:1', type: 'REST', direction: '+Z', gapMm: 1 }],
    }],
  });
}

test('transient support projection promotes to the existing certified SUPPORT_PLACEMENT plan', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const draft = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:s1',
    targetPoint: { x: 650, y: 75, z: -25 },
    source: 'CANVAS_DRAG',
    previewHash: 'fnv1a64:support-drag-preview',
  });
  const bridge = createTopologyEditTableSupportIntentFromTransientDraft({
    draft,
    projection,
    sessionSnapshot: session.snapshot(),
    canonicalTopology: topology,
  });
  assert.equal(bridge.supportId, 'support:s1');
  assert.equal(bridge.hostEdgeId, 'edge:p1');
  assert.equal(bridge.stationMm, 650);
  assert.equal(bridge.intent.intentKind, 'SUPPORT_PLACEMENT');
  assert.deepEqual(bridge.intent.priorValue, { hostEntityId: 'pipe:p1', stationMm: 250 });
  assert.equal(bridge.intent.requestedValue.hostEdgeId, 'edge:p1');
  assert.equal(bridge.intent.requestedValue.stationMm, 650);

  const planned = planTopologyEditTableDraft({
    intent: bridge.intent,
    projection,
    canonicalTopology: topology,
  });
  assert.deepEqual(planned.batchPlan.operationPlan.commandIntents, [{
    sequence: 0,
    commandType: 'UPDATE_SUPPORT_PLACEMENT',
    payload: bridge.intent.requestedValue,
  }]);
  assert.ok(planned.batchPlan.dependencyRevisions['support:s1']);
  assert.ok(planned.batchPlan.dependencyRevisions['edge:p1']);
  assert.ok(planned.batchPlan.dependencyRevisions['node:n1']);
  assert.ok(planned.batchPlan.dependencyRevisions['node:n2']);
});

test('transient support bridge rejects a projection from a different canonical basis', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const draft = createTopologyEditTransientSupportPlacementDraft({
    topology,
    supportId: 'support:s1',
    stationMm: 700,
    source: 'CANVAS_NUMERIC',
  });
  const changed = finalizeCanonicalTopology({
    ...JSON.parse(JSON.stringify(topology)),
    edges: topology.edges.map((edge) => edge.id === 'edge:p1'
      ? { ...edge, outsideDiameterMm: 120 }
      : edge),
  });
  const changedProjection = buildTopologyEditTableProjection({ canonicalTopology: changed });
  assert.throws(() => createTopologyEditTableSupportIntentFromTransientDraft({
    draft,
    projection: changedProjection,
    sessionSnapshot: session.snapshot(),
    canonicalTopology: topology,
  }), /projection basis differs/);
});
