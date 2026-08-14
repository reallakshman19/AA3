import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTopologyEditEditorStore,
} from '../src/workspace/topology-edit/editor-state/topology-edit-editor-store.js';
import {
  TOPOLOGY_EDIT_SELECTION_SOURCES,
  normalizeTopologyEditSelectionSource,
} from '../src/workspace/topology-edit/editor-state/topology-edit-selection-contract.js';
import {
  handleTopologyEditTableCompoundCellClick,
  topologyEditTableDirectCellHtml,
} from '../src/workspace/viewport-productivity/topology-edit-table-cell-edit.js';

function store() {
  return createTopologyEditEditorStore({
    dataset: {
      sourceHash: 'source-a',
      canonicalHash: 'canonical-a',
      sessionVersion: 7,
    },
  });
}

function compoundRow(elementType, canonicalKind, canonicalId, fields = {}) {
  return {
    rowId: `table:${canonicalId}`,
    elementType,
    identity: { canonicalKind, canonicalId, portBindings: [] },
    fields: { tag: canonicalId, ...fields },
    custody: {},
  };
}

function nodeRow() {
  return {
    rowId: 'table:edge:E-010',
    elementType: 'PIPE',
    identity: {
      canonicalKind: 'EDGE',
      canonicalId: 'edge:E-010',
      portBindings: [
        { endpoint: 'FROM', nodeId: 'node:A', portKey: 'start' },
        { endpoint: 'TO', nodeId: 'node:B', portKey: 'end' },
      ],
    },
    fields: { tag: 'P-010', lengthMm: 100 },
    custody: {},
  };
}

function nodeTopology(hash = 'canonical-a') {
  return {
    canonicalTopologyHash: hash,
    nodes: [
      { id: 'node:A', position: { x: 10, y: 20, z: 30 } },
      { id: 'node:B', position: { x: 110, y: 20, z: 30 } },
    ],
    edges: [{ id: 'edge:E-010', fromNodeId: 'node:A', toNodeId: 'node:B' }],
    supports: [], junctions: [], boundaries: [], rigids: [], bends: [],
  };
}

test('shared canonical selection contract authorizes Table origin explicitly', () => {
  assert.ok(TOPOLOGY_EDIT_SELECTION_SOURCES.includes('table'));
  assert.equal(normalizeTopologyEditSelectionSource('TABLE'), 'table');
});

test('production editor store accepts exact Table canonical selection and retains origin', () => {
  const editorStore = store();
  const first = editorStore.getState().actions.replaceSelection(
    ['edge:E-001'],
    'table',
    { primaryId: 'edge:E-001', anchorId: 'edge:E-001' },
  );
  assert.equal(first.disposition, 'CHANGED');
  assert.deepEqual(first.selection.canonicalIds, ['edge:E-001']);
  assert.equal(first.selection.primaryId, 'edge:E-001');
  assert.equal(first.selection.anchorId, 'edge:E-001');
  assert.equal(first.selection.source, 'table');
  assert.equal(first.selection.revision, 1);

  const echo = editorStore.getState().actions.replaceSelection(
    ['edge:E-001'],
    'table',
    { primaryId: 'edge:E-001', anchorId: 'edge:E-001' },
  );
  assert.equal(echo.disposition, 'UNCHANGED');
  assert.equal(echo.selection.revision, 1);
  assert.equal(editorStore.getState().selection.selectionHash, echo.selection.selectionHash);
});

test('Table source remains compatible with stale request custody', () => {
  const editorStore = store();
  const result = editorStore.getState().actions.applySelectionRequest({
    action: 'REPLACE',
    canonicalIds: ['edge:E-002'],
    primaryId: 'edge:E-002',
    anchorId: 'edge:E-002',
    source: 'table',
    expectedDatasetSessionVersion: 7,
    expectedCanonicalHash: 'canonical-a',
    expectedSelectionRevision: 0,
  });
  assert.equal(result.disposition, 'CHANGED');
  assert.equal(result.selection.source, 'table');

  const stale = editorStore.getState().actions.applySelectionRequest({
    action: 'REPLACE',
    canonicalIds: ['edge:E-003'],
    source: 'table',
    expectedDatasetSessionVersion: 7,
    expectedCanonicalHash: 'canonical-a',
    expectedSelectionRevision: 0,
  });
  assert.equal(stale.disposition, 'STALE');
  assert.deepEqual(stale.staleFields, ['selectionRevision']);
  assert.deepEqual(editorStore.getState().selection.canonicalIds, ['edge:E-002']);
});

test('NEEDS_INPUT valve and tee cells render governed compound affordances only', () => {
  const valve = compoundRow('VALVE', 'EDGE', 'edge:V-001', { valveType: 'GATE' });
  const tee = compoundRow('TEE', 'JUNCTION', 'junction:T-001', { branchDnMm: 50 });
  const runtime = {
    projection: { authority: { canonicalTopologyHash: 'canonical-a' } },
    intents: [],
    staleResult: null,
    cellDrafts: new Map(),
  };
  const valveHtml = topologyEditTableDirectCellHtml(runtime, valve, { key: 'valveType', label: 'Valve Type' });
  const teeHtml = topologyEditTableDirectCellHtml(runtime, tee, { key: 'branchDnMm', label: 'Branch DN' });
  assert.match(valveHtml, /data-table-compound-edit="VALVE_REPLACEMENT"/);
  assert.match(teeHtml, /data-table-compound-edit="TEE_REDUCER_RELATION"/);
  assert.doesNotMatch(valveHtml, /data-canonical-id=/);
  assert.doesNotMatch(teeHtml, /data-canonical-id=/);
});

test('certified node coordinate renders direct input and stale basis remains visible read-only', () => {
  const row = nodeRow();
  const topology = nodeTopology();
  const runtime = {
    projection: { authority: { canonicalTopologyHash: 'canonical-a' }, rows: [row] },
    controller: { session: { currentTopology: () => topology } },
    intents: [],
    staleResult: null,
    cellDrafts: new Map(),
    transientNodeDrafts: {},
  };
  const direct = topologyEditTableDirectCellHtml(runtime, row, { key: 'fromX', label: 'From X' });
  assert.match(direct, /data-table-cell-edit="NODE_POSITION"/);
  assert.match(direct, /data-table-cell-draft-key="NODE_POSITION:edge:E-010:FROM:X"/);
  assert.match(direct, /value="10"/);
  assert.doesNotMatch(direct, /data-table-compound-edit=/);

  const staleRuntime = {
    ...runtime,
    controller: { session: { currentTopology: () => nodeTopology('canonical-b') } },
  };
  const readOnly = topologyEditTableDirectCellHtml(staleRuntime, row, { key: 'fromX', label: 'From X' });
  assert.doesNotMatch(readOnly, /<input/);
  assert.match(readOnly, /data-table-cell-state="blocked"/);
  assert.match(readOnly, />10<\/td>/);
});

test('compound cell activation changes exact selection and focus only', async () => {
  const row = compoundRow('VALVE', 'EDGE', 'edge:V-001', { valveType: 'GATE' });
  const calls = [];
  let focused = false;
  const button = {
    dataset: {
      tableCellCanonicalId: row.identity.canonicalId,
      tableCompoundEdit: 'VALVE_REPLACEMENT',
    },
  };
  const runtime = {
    projection: { rows: [row] },
    coordinator: {
      tableSelection: (...args) => calls.push(args),
    },
    element: {
      contains: (candidate) => candidate === button,
      querySelector: (selector) => selector === '[data-table-edit-valve-catalogue-record]'
        ? { scrollIntoView() {}, focus() { focused = true; } }
        : null,
    },
    render() { throw new Error('activation must not directly rerender/stage'); },
  };
  const event = { target: { closest: () => button } };
  assert.equal(handleTopologyEditTableCompoundCellClick(runtime, event), true);
  assert.deepEqual(calls, [['REPLACE', [row.rowId], row.rowId]]);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(focused, true);
});
