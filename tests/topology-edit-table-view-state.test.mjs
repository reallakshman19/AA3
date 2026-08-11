import test from 'node:test';
import assert from 'node:assert/strict';
import { deepFreeze, semanticHash } from '../src/core/shared-piping-model/index.js';
import {
  createTopologyEditTableViewState,
  reduceTopologyEditTableViewState,
  topologyEditTableSelectionCanonicalIds,
  topologyEditTableVisibleRows,
} from '../src/workspace/topology-edit/table/topology-edit-table-view-state.js';
import {
  TopologyEditTableCanvasCoordinator,
} from '../src/workspace/viewport-productivity/topology-edit-table-canvas-coordinator.js';
import {
  TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX,
  TOPOLOGY_EDIT_TABLE_WINDOW_ROWS,
  topologyEditTableRowWindow,
  topologyEditTableWindowStart,
  topologyEditTableWindowStartForRow,
} from '../src/workspace/viewport-productivity/topology-edit-table-row-window.js';

function projection() {
  const rows = [
    row('r-pipe', 'edge:pipe-a', 'PIPE', { tag: 'M04', lengthMm: 2200, sourceStatus: 'IMPORTED' }),
    row('r-valve', 'edge:valve-a', 'VALVE', { tag: 'M06', lengthMm: 350, sourceStatus: 'IMPORTED' }),
    row('r-tee', 'junction:tee-a', 'TEE', { tag: 'M10', branchDnMm: 80, sourceStatus: 'IMPORTED' }),
  ];
  const material = {
    schema: 'TopologyEditTableProjection.v1',
    authority: {
      datasetId: 'dataset-a', datasetVersion: 7, sourceHash: 'source-a',
      topologyGraphHash: 'graph-a', canonicalTopologyHash: 'canonical-a',
    },
    rows,
  };
  return deepFreeze({ ...material, projectionHash: semanticHash(material) });
}
function row(rowId, canonicalId, elementType, fields) {
  return deepFreeze({
    schema: 'TopologyEditTableRow.v1', rowId, elementType,
    identity: { canonicalKind: canonicalId.startsWith('junction:') ? 'JUNCTION' : 'EDGE', canonicalId, componentKey: null, entityId: null, sourceEntityId: null, nodeIds: [], portBindings: [] },
    columnKeys: Object.keys(fields), fields, fieldAuthority: {}, custody: {}, targetRevision: `revision:${rowId}`,
  });
}

test('filter sort and selection are structural no-ops on engineering authority', () => {
  const table = projection();
  const engineering = deepFreeze({
    canonicalHash: 'canonical-a', journalHash: 'journal-a', sourceHash: 'source-a', rendererCount: 1,
  });
  const before = semanticHash({ table, engineering });
  let state = createTopologyEditTableViewState();
  state = reduceTopologyEditTableViewState(state, { type: 'QUERY', query: 'm0' });
  state = reduceTopologyEditTableViewState(state, { type: 'SORT', sortKey: 'lengthMm', sortDirection: 'DESC' });
  state = reduceTopologyEditTableViewState(state, {
    type: 'SELECTION', selectedRowIds: ['r-valve', 'r-pipe'], primaryRowId: 'r-valve', anchorRowId: 'r-pipe',
  });
  assert.deepEqual(topologyEditTableVisibleRows(table, state).map((row) => row.rowId), ['r-pipe', 'r-valve']);
  assert.deepEqual(topologyEditTableSelectionCanonicalIds(table, state), ['edge:pipe-a', 'edge:valve-a']);
  assert.equal(semanticHash({ table, engineering }), before);
  assert.equal(engineering.rendererCount, 1);
});

test('visible projection order is deterministic independent of input row order', () => {
  const first = projection();
  const material = { schema: first.schema, authority: first.authority, rows: [...first.rows].reverse() };
  const reversed = deepFreeze({ ...material, projectionHash: semanticHash(material) });
  const state = createTopologyEditTableViewState({ sortKey: 'tag', sortDirection: 'ASC' });
  assert.deepEqual(
    topologyEditTableVisibleRows(first, state).map((row) => row.identity.canonicalId),
    topologyEditTableVisibleRows(reversed, state).map((row) => row.identity.canonicalId),
  );
});

test('Table to Canvas selection uses exact canonical IDs and Canvas echo creates no edit', () => {
  const table = projection();
  const requests = [];
  const externalSelections = [];
  const controller = {
    selectionCoordinator: {
      requestCanonical: (...args) => { requests.push(args); return { disposition: 'ACCEPTED' }; },
    },
  };
  const runtime = {
    projection: table,
    applyCanonicalSelection: (value) => externalSelections.push(value),
  };
  const coordinator = new TopologyEditTableCanvasCoordinator(controller, runtime);
  coordinator.tableSelection('REPLACE', ['r-valve'], 'r-valve');
  assert.deepEqual(requests[0].slice(0, 3), ['REPLACE', ['edge:valve-a'], 'table']);
  assert.equal(requests[0][3].primaryId, 'edge:valve-a');

  coordinator.selectionChanged({ selection: {
    selectionHash: 'selection-1', canonicalIds: ['edge:pipe-a', 'junction:tee-a'],
    primaryId: 'junction:tee-a', anchorId: 'edge:pipe-a',
  } });
  coordinator.selectionChanged({ selection: {
    selectionHash: 'selection-1', canonicalIds: ['edge:pipe-a', 'junction:tee-a'],
    primaryId: 'junction:tee-a', anchorId: 'edge:pipe-a',
  } });
  assert.deepEqual(externalSelections, [{
    rowIds: ['r-pipe', 'r-tee'], primaryRowId: 'r-tee', anchorRowId: 'r-pipe',
  }]);
  assert.equal(requests.length, 1, 'selection echo must not emit a second selection/edit request');
});

test('row window keeps short projections complete and unspaced', () => {
  assert.deepEqual(topologyEditTableRowWindow(20, 999), {
    totalRows: 20, start: 0, end: 20, renderedRows: 20, topSpacerPx: 0, bottomSpacerPx: 0,
  });
});

test('row window bounds large projection DOM and preserves full scroll extent', () => {
  const first = topologyEditTableRowWindow(1000, 0);
  assert.equal(first.renderedRows, TOPOLOGY_EDIT_TABLE_WINDOW_ROWS);
  assert.equal(first.topSpacerPx, 0);
  assert.equal(first.bottomSpacerPx, (1000 - TOPOLOGY_EDIT_TABLE_WINDOW_ROWS) * TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX);

  const middleStart = topologyEditTableWindowStart(700 * TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX);
  const middle = topologyEditTableRowWindow(1000, middleStart);
  assert.ok(middle.start <= 700 && middle.end > 700);
  assert.equal(middle.renderedRows, TOPOLOGY_EDIT_TABLE_WINDOW_ROWS);

  const last = topologyEditTableRowWindow(
    1000,
    topologyEditTableWindowStart(999 * TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX),
  );
  assert.equal(last.end, 1000);
  assert.equal(last.renderedRows, TOPOLOGY_EDIT_TABLE_WINDOW_ROWS);
  assert.equal(last.bottomSpacerPx, 0);
});

test('row-target window start keeps keyboard target inside bounded window', () => {
  const start = topologyEditTableWindowStartForRow(521);
  const targetWindow = topologyEditTableRowWindow(1000, start);
  assert.ok(targetWindow.start <= 521 && targetWindow.end > 521);
});
