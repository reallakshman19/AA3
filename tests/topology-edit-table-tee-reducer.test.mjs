import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/index.js';
import {
  TOPOLOGY_EDIT_TABLE_PROJECTION_SCHEMA,
} from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
import {
  deriveTopologyEditTableTeeReducerCapability,
  resolveTopologyEditTableTeeReducerSelection,
  topologyEditTableTeeBranchBindings,
  topologyEditTableTeeReducerCandidates,
} from '../src/workspace/topology-edit/table/topology-edit-table-tee-reducer.js';

function teeRow() {
  return {
    elementType: 'TEE', targetRevision: 'sha256:tee-r1',
    identity: {
      canonicalKind: 'JUNCTION', canonicalId: 'junction:tee',
      nodeIds: ['node:a', 'node:b', 'node:c'],
      portBindings: [
        { endpoint: 'MULTIPORT', nodeId: 'node:a', portKey: 'tee:port:a' },
        { endpoint: 'MULTIPORT', nodeId: 'node:b', portKey: 'tee:port:b' },
        { endpoint: 'MULTIPORT', nodeId: 'node:c', portKey: 'tee:port:c' },
      ],
    },
    fields: { tag: 'TEE-1', runDnMm: 150, branchDnMm: 100 },
    custody: { sourceStatus: 'IMPORTED', catalogueAuthority: 'UNRESOLVED' },
  };
}

function reducerRow({
  id,
  fromNodeId,
  toNodeId,
  dnInMm,
  dnOutMm,
  exact = true,
} = {}) {
  return {
    elementType: 'REDUCER', targetRevision: `sha256:${id}-r1`,
    identity: {
      canonicalKind: 'EDGE', canonicalId: id,
      nodeIds: [fromNodeId, toNodeId].sort(),
      portBindings: [
        { endpoint: 'FROM', nodeId: fromNodeId, portKey: `${id}:from` },
        { endpoint: 'TO', nodeId: toNodeId, portKey: `${id}:to` },
      ],
    },
    fields: { tag: id.toUpperCase(), dnInMm, dnOutMm },
    custody: {
      sourceStatus: 'IMPORTED',
      catalogueAuthority: exact ? 'EXACT' : 'UNRESOLVED',
      catalogue: exact ? {
        catalogueHash: 'sha256:catalogue',
        sourceHash: 'sha256:source',
        recordId: `record:${id}`,
        recordHash: `sha256:record:${id}`,
      } : null,
    },
  };
}

function projection(rows) {
  const authority = {
    datasetId: 'dataset:test', datasetVersion: 1,
    sourceHash: 'sha256:source', topologyGraphHash: 'sha256:graph',
    canonicalTopologyHash: 'sha256:canonical',
  };
  const material = { schema: TOPOLOGY_EDIT_TABLE_PROJECTION_SCHEMA, authority, rows };
  return { ...material, projectionHash: semanticHash(material) };
}

function fixture() {
  const tee = teeRow();
  const rows = [
    tee,
    reducerRow({ id: 'edge:from-branch', fromNodeId: 'node:c', toNodeId: 'node:d', dnInMm: 100, dnOutMm: 80 }),
    reducerRow({ id: 'edge:to-branch', fromNodeId: 'node:e', toNodeId: 'node:b', dnInMm: 65, dnOutMm: 100 }),
    reducerRow({ id: 'edge:unrelated', fromNodeId: 'node:x', toNodeId: 'node:y', dnInMm: 100, dnOutMm: 80 }),
    reducerRow({ id: 'edge:unresolved', fromNodeId: 'node:c', toNodeId: 'node:u', dnInMm: 100, dnOutMm: 80, exact: false }),
    reducerRow({ id: 'edge:equal-bore', fromNodeId: 'node:c', toNodeId: 'node:q', dnInMm: 100, dnOutMm: 100 }),
    reducerRow({ id: 'edge:expanding-away', fromNodeId: 'node:c', toNodeId: 'node:z', dnInMm: 80, dnOutMm: 100 }),
  ];
  return { tee, projection: projection(rows) };
}

test('TEE branch bindings retain exact canonical port identity', () => {
  const bindings = topologyEditTableTeeBranchBindings(teeRow());
  assert.deepEqual(bindings.map((row) => [row.portKey, row.nodeId]), [
    ['tee:port:a', 'node:a'],
    ['tee:port:b', 'node:b'],
    ['tee:port:c', 'node:c'],
  ]);
});

test('reducer candidates are direct, exact-custody reductions for the selected branch only', () => {
  const { tee, projection: table } = fixture();
  const fromBranch = topologyEditTableTeeReducerCandidates({
    projection: table, row: tee, branchPortKey: 'tee:port:c',
  });
  assert.deepEqual(fromBranch.map((row) => row.reducerCanonicalId), ['edge:from-branch']);
  assert.equal(fromBranch[0].branchEndpoint, 'FROM');
  assert.equal(fromBranch[0].branchNominalSizeMm, 100);
  assert.equal(fromBranch[0].downstreamNominalSizeMm, 80);

  const toBranch = topologyEditTableTeeReducerCandidates({
    projection: table, row: tee, branchPortKey: 'tee:port:b',
  });
  assert.deepEqual(toBranch.map((row) => row.reducerCanonicalId), ['edge:to-branch']);
  assert.equal(toBranch[0].branchEndpoint, 'TO');
  assert.equal(toBranch[0].branchNominalSizeMm, 100);
  assert.equal(toBranch[0].downstreamNominalSizeMm, 65);
});

test('TEE reducer capability fails closed until exact branch, reducer and DN relationship agree', () => {
  const { tee, projection: table } = fixture();
  const base = {
    projection: table, row: tee, branchPortKey: 'tee:port:c',
    reducerCanonicalId: 'edge:from-branch', runNominalSizeMm: 150,
    teeBranchNominalSizeMm: 100, downstreamNominalSizeMm: 80,
  };
  const available = deriveTopologyEditTableTeeReducerCapability(base);
  assert.equal(available.status, 'AVAILABLE');
  assert.equal(available.details.branchNodeId, 'node:c');
  assert.deepEqual(available.details.runNodeIds, ['node:a', 'node:b']);
  assert.equal(available.details.reducerRecordId, 'record:edge:from-branch');

  assert.equal(deriveTopologyEditTableTeeReducerCapability({
    ...base, reducerCanonicalId: 'edge:unrelated',
  }).status, 'UNREPRESENTABLE');
  assert.equal(deriveTopologyEditTableTeeReducerCapability({
    ...base, teeBranchNominalSizeMm: 90,
  }).status, 'UNREPRESENTABLE');
  assert.equal(deriveTopologyEditTableTeeReducerCapability({
    ...base, downstreamNominalSizeMm: 70,
  }).status, 'UNREPRESENTABLE');
  assert.equal(deriveTopologyEditTableTeeReducerCapability({
    ...base, runNominalSizeMm: 0,
  }).status, 'UNREPRESENTABLE');
  assert.throws(() => resolveTopologyEditTableTeeReducerSelection({
    ...base, reducerCanonicalId: 'edge:unresolved',
  }), /not an exact compatible candidate/);
});
