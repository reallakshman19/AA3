import assert from 'node:assert/strict';
import test from 'node:test';

import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import { planMoveConnectedRun } from '../src/workspace/topology-edit/professional/topology-edit-route-operations.js';
import { createTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch-planner.js';
import {
  deriveTopologyEditTableNodePositionCapability,
} from '../src/workspace/topology-edit/table/topology-edit-table-edit-capability.js';
import { createTopologyEditTableIntent } from '../src/workspace/topology-edit/table/topology-edit-table-intent.js';
import { buildTopologyEditTableProjection } from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';

const BALL = Object.freeze({
  catalogueHash: 'sha256:valves-v2', sourceHash: 'sha256:valves-source-v2',
  recordId: 'BALL-DN80-C150', recordHash: 'sha256:ball-80-150',
  componentType: 'VALVE', nominalSizeMm: 80, outsideDiameterMm: 88.9,
  pipingClass: 'PCL-80', pressureClass: '150', materialSpecification: 'A216-WCB',
  componentMassKg: 24, endConnectionFrom: 'FLANGED', endConnectionTo: 'FLANGED',
  valveType: 'BALL', valveFaceToFaceMm: 300,
  sourceReference: { documentId: 'VALVES', revision: 'R2', path: '/BALL/80/150' },
});

function topology(supportHost = 'pipe:tail') {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'dataset-support-geometry', datasetVersion: 1,
    sourceHash: 'sha256:support-geometry-source', topologyGraphHash: 'sha256:support-geometry-graph',
    nodes: [
      node('node:n1', 0), node('node:n2', 1000), node('node:n3', 1200), node('node:n4', 2200),
    ],
    edges: [
      pipe('edge:p1', 'pipe:p1', 'node:n1', 'node:n2'),
      gateValve(),
      pipe('edge:tail', 'pipe:tail', 'node:n3', 'node:n4'),
    ],
    junctions: [], boundaries: [], rigids: [], bends: [],
    supports: [{
      id: 'support:s1', entityId: 'S-001', hostEntityId: supportHost, stationMm: 100,
      restraint: { id: 'restraint:r1', type: 'GUIDE', gapMm: 2, direction: 'Y' },
    }],
  });
}
function node(id, x) { return { id, position: { x, y: 0, z: 0 }, portKeys: [] }; }
function pipe(id, componentKey, fromNodeId, toNodeId) {
  return { id, componentKey, fromNodeId, toNodeId, entityType: 'PIPE',
    diameterMm: 80, outsideDiameterMm: 88.9, diameterAuthority: 'OUTSIDE_DIAMETER' };
}
function gateValve() {
  return {
    id: 'edge:valve', componentKey: 'valve:v1', fromNodeId: 'node:n2', toNodeId: 'node:n3',
    entityType: 'VALVE', diameterMm: 80, outsideDiameterMm: 88.9,
    diameterAuthority: 'OUTSIDE_DIAMETER', valveType: 'GATE', componentLengthMm: 200,
    pipingClass: 'PCL-80', pressureClass: '150',
    endConnectionFrom: 'FLANGED', endConnectionTo: 'FLANGED',
  };
}
function projection(model) { return buildTopologyEditTableProjection({ canonicalTopology: model }); }
function row(table, id) { return table.rows.find((entry) => entry.identity.canonicalId === id); }
function expectSupportPolicy(operation) {
  assert.throws(operation, (error) => (
    error instanceof RangeError
    && error.code === 'SUPPORT_GEOMETRY_POLICY_REQUIRED'
    && /support:s1/.test(error.message)
  ));
}

test('generic connected-run movement fails closed for a support hosted on the translated run', () => {
  const model = topology();
  expectSupportPolicy(() => planMoveConnectedRun({
    topology: model,
    nodeIds: ['node:n3', 'node:n4'],
    boundaryNodeIds: ['node:n2'],
    deltaMm: { x: 100, y: 0, z: 0 },
  }));
});

test('PIPE_LENGTH propagation fails closed for edge-hosted support geometry', () => {
  const model = topology();
  const session = new TopologyEditCertifiedSession(model);
  const table = projection(model);
  const intent = createTopologyEditTableIntent({
    projection: table, sessionSnapshot: session.snapshot(), canonicalId: 'edge:p1',
    intentKind: 'PIPE_LENGTH', requestedValue: { lengthMm: 1100 },
    geometryPolicy: { anchor: 'FROM', propagation: 'DOWNSTREAM' },
  });
  expectSupportPolicy(() => planTopologyEditTableBatch({
    batch: createTopologyEditTableBatch({ intents: [intent] }),
    projection: table,
    canonicalTopology: model,
  }));
});

test('valve F2F propagation fails closed for edge-hosted support geometry', () => {
  const model = topology();
  const session = new TopologyEditCertifiedSession(model);
  const table = projection(model);
  const intent = createTopologyEditTableIntent({
    projection: table, sessionSnapshot: session.snapshot(), canonicalId: 'edge:valve',
    intentKind: 'VALVE_REPLACEMENT',
    requestedValue: { catalogueBinding: BALL, direction: 'FROM_TO' },
    geometryPolicy: { anchor: 'FROM', propagation: 'DOWNSTREAM' },
  });
  expectSupportPolicy(() => planTopologyEditTableBatch({
    batch: createTopologyEditTableBatch({ intents: [intent] }),
    projection: table,
    canonicalTopology: model,
  }));
});

test('NODE_POSITION capability and NODE_ONLY planning both block support-host geometry', () => {
  const model = topology('pipe:p1');
  const session = new TopologyEditCertifiedSession(model);
  const table = projection(model);
  const edgeRow = row(table, 'edge:p1');
  const capability = deriveTopologyEditTableNodePositionCapability({
    row: edgeRow, endpoint: 'TO', projection: table, canonicalTopology: model,
  });
  assert.equal(capability.status, 'UNREPRESENTABLE');
  assert.equal(capability.reasonCode, 'SUPPORT_GEOMETRY_POLICY_REQUIRED');

  const intent = createTopologyEditTableIntent({
    projection: table, sessionSnapshot: session.snapshot(), canonicalId: 'edge:p1',
    intentKind: 'NODE_POSITION',
    requestedValue: {
      endpoint: 'TO', nodeId: 'node:n2', expectedPosition: { x: 1000, y: 0, z: 0 },
      position: { x: 1050, y: 0, z: 0 },
    },
    geometryPolicy: { movementMode: 'NODE_ONLY' },
  });
  expectSupportPolicy(() => planTopologyEditTableBatch({
    batch: createTopologyEditTableBatch({ intents: [intent] }),
    projection: table,
    canonicalTopology: model,
  }));
});
