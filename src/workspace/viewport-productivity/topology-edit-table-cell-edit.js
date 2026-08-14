import { deriveTopologyEditTableCellCapability } from '../topology-edit/table/topology-edit-table-edit-capability.js';
import { topologyEditTableVisibleRows } from '../topology-edit/table/topology-edit-table-view-state.js';
import { topologyEditTableVirtualGeometryFields } from '../topology-edit/table/topology-edit-table-virtual-geometry.js';
import {
  stageTopologyEditNodePosition,
  stageTopologyEditNodePositionValue,
  stageTopologyEditSupportPlacement,
  stageTopologyEditSupportRestraint,
} from './topology-edit-table-engineering-runtime.js';
import { stageTopologyEditTablePipeLength } from './topology-edit-table-pipe-length-runtime.js';
import {
  TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX,
  topologyEditTableRowWindow,
  topologyEditTableWindowStartForRow,
} from './topology-edit-table-row-window.js';

const PIPE_CELL_KIND = 'PIPE_LENGTH';
const NODE_CELL_KIND = 'NODE_POSITION';
const DEFAULT_POLICY = Object.freeze({ anchor: 'FROM', propagation: 'DOWNSTREAM' });
const COMPOUND_FOCUS = Object.freeze({
  VALVE_REPLACEMENT: '[data-table-edit-valve-catalogue-record]',
  TEE_REDUCER_RELATION: '[data-table-edit-tee-branch-port]',
  SUPPORT_PLACEMENT: '[data-table-edit-support-station]',
  SUPPORT_RESTRAINT: '[data-table-edit-support-family]',
});

export function topologyEditTableDirectCellHtml(runtime, row, column) {
  const canonicalTopology = runtime.controller?.session?.currentTopology?.();
  const capability = deriveTopologyEditTableCellCapability({
    row,
    columnKey: column.key,
    projection: runtime.projection,
    canonicalTopology,
  });
  const intentKind = capability.details?.intentKind;
  if (capability.status === 'AVAILABLE' && intentKind === PIPE_CELL_KIND) {
    return directPipeCellHtml(runtime, row, column);
  }
  if (intentKind === NODE_CELL_KIND) {
    return capability.status === 'AVAILABLE'
      ? directNodeCellHtml(runtime, row, column, capability, canonicalTopology)
      : readOnlyNodeCellHtml(runtime, row, column, capability, canonicalTopology);
  }
  if (capability.status === 'NEEDS_INPUT' && COMPOUND_FOCUS[intentKind]) {
    return compoundCellHtml(runtime, row, column, capability);
  }
  return null;
}

export function handleTopologyEditTableCompoundCellClick(runtime, event) {
  const nodeStage = event.target.closest?.('[data-table-node-position-stage]');
  if (nodeStage?.dataset?.tableNodePositionStage && runtime.element?.contains(nodeStage)) {
    return stageTopologyEditNodePosition(
      runtime,
      nodeStage.dataset.canonicalId,
      nodeStage.dataset.tableNodePositionStage,
    );
  }
  const placementStage = event.target.closest?.('[data-table-support-placement-stage]');
  if (placementStage?.dataset?.tableSupportPlacementStage !== undefined
      && runtime.element?.contains(placementStage)) {
    return stageTopologyEditSupportPlacement(runtime, placementStage.dataset.canonicalId);
  }
  const supportStage = event.target.closest?.('[data-table-support-restraint-stage]');
  if (supportStage?.dataset?.tableSupportRestraintStage !== undefined
      && runtime.element?.contains(supportStage)) {
    return stageTopologyEditSupportRestraint(runtime, supportStage.dataset.canonicalId);
  }
  const button = event.target.closest?.('[data-table-compound-edit]');
  if (!button || !runtime.element?.contains(button)) return false;
  const canonicalId = button.dataset.tableCellCanonicalId;
  const intentKind = button.dataset.tableCompoundEdit;
  const row = runtime.projection?.rows.find((candidate) => candidate.identity?.canonicalId === canonicalId);
  const focusSelector = COMPOUND_FOCUS[intentKind];
  if (!row || !focusSelector || !runtime.coordinator) {
    runtime.error = 'Engineering Table: exact compound editor authority is unavailable.';
    runtime.render();
    return true;
  }
  runtime.coordinator.tableSelection('REPLACE', [row.rowId], row.rowId);
  queueMicrotask(() => focusCompoundEditor(runtime, focusSelector));
  return true;
}

export function handleTopologyEditTableCellInput(runtime, event) {
  const input = directInput(event.target, runtime.element);
  if (!input) return false;
  const draftKey = inputDraftKey(input);
  runtime.cellDrafts.set(draftKey, input.value);
  if (runtime.cellErrorId === draftKey) {
    runtime.cellErrorId = null;
    runtime.error = null;
  }
  input.closest('td')?.setAttribute('data-table-cell-state', 'draft');
  input.setAttribute('aria-invalid', 'false');
  return true;
}

export function handleTopologyEditTableCellKeyDown(runtime, event) {
  const input = directInput(event.target, runtime.element);
  if (!input) return false;
  const draftKey = inputDraftKey(input);
  if (event.key === 'Escape') {
    event.preventDefault();
    runtime.cellDrafts.delete(draftKey);
    if (runtime.cellErrorId === draftKey) runtime.error = null;
    runtime.cellErrorId = null;
    runtime.render();
    focusDirectCell(runtime, draftKey);
    return true;
  }
  if (event.key !== 'Enter' && event.key !== 'Tab') return false;
  event.preventDefault();
  return input.dataset.tableCellEdit === NODE_CELL_KIND
    ? stageDirectNodeCell(runtime, input, draftKey, event.shiftKey ? -1 : 1)
    : stageDirectPipeCell(runtime, input, draftKey, event.shiftKey ? -1 : 1);
}

export function resetTopologyEditTableCellEditing(runtime) {
  runtime.cellDrafts.clear();
  runtime.cellErrorId = null;
}

function stageDirectPipeCell(runtime, input, draftKey, direction) {
  const canonicalId = input.dataset.tableCellCanonicalId;
  const nextId = adjacentPipeCellId(runtime, canonicalId, direction);
  const policy = pipePolicy(runtime, canonicalId);
  const result = stageTopologyEditTablePipeLength(runtime, {
    canonicalId,
    lengthMm: input.value,
    anchor: policy.anchor,
    propagation: policy.propagation,
  });
  if (result.ok) {
    runtime.cellDrafts.delete(draftKey);
    runtime.cellErrorId = null;
  } else {
    runtime.cellErrorId = draftKey;
  }
  const focusId = result.ok ? nextId ?? canonicalId : canonicalId;
  prepareCellWindow(runtime, focusId);
  runtime.render();
  focusPipeCell(runtime, focusId);
  return true;
}

function stageDirectNodeCell(runtime, input, draftKey, direction) {
  const canonicalId = input.dataset.tableCellCanonicalId;
  const endpoint = input.dataset.tableCellEndpoint;
  const staged = stagedNodeIntent(runtime, canonicalId, endpoint);
  const position = nodeDraftPosition(runtime, canonicalId, endpoint, staged);
  const nextKey = adjacentDirectDraftKey(runtime, draftKey, direction);
  const result = stageTopologyEditNodePositionValue(runtime, {
    canonicalId,
    endpoint,
    position,
    movementMode: staged?.geometryPolicy?.movementMode ?? 'NODE_ONLY',
  });
  if (result.ok) {
    clearNodeEndpointDrafts(runtime, canonicalId, endpoint);
    runtime.cellErrorId = null;
  } else {
    runtime.cellErrorId = draftKey;
  }
  runtime.render();
  focusDirectCell(runtime, result.ok ? nextKey ?? draftKey : draftKey);
  return true;
}

function directPipeCellHtml(runtime, row, column) {
  const canonicalId = row.identity.canonicalId;
  const staged = stagedIntent(runtime, canonicalId, PIPE_CELL_KIND);
  const draftKey = canonicalId;
  const hasDraft = runtime.cellDrafts.has(draftKey);
  const value = hasDraft
    ? runtime.cellDrafts.get(draftKey)
    : staged?.requestedValue?.lengthMm ?? row.fields?.lengthMm ?? '';
  const state = cellState(runtime, draftKey, staged, hasDraft);
  const invalid = state === 'invalid' ? 'true' : 'false';
  return `<td data-table-property="${escapeHtml(column.key)}" data-table-column-key="${escapeHtml(column.key)}" data-table-cell-state="${state}">
    <input class="topology-edit-table__cell-input" type="number" step="any" min="0" value="${escapeHtml(value)}" data-table-cell-edit="${PIPE_CELL_KIND}" data-table-cell-draft-key="${escapeHtml(draftKey)}" data-table-cell-canonical-id="${escapeHtml(canonicalId)}" aria-label="${escapeHtml(`Length for ${row.fields?.tag ?? canonicalId}`)}" aria-invalid="${invalid}">
  </td>`;
}

function directNodeCellHtml(runtime, row, column, capability, canonicalTopology) {
  const canonicalId = row.identity.canonicalId;
  const endpoint = capability.details.endpoint;
  const axis = nodeColumnAxis(column.key);
  const draftKey = nodeDraftKey(canonicalId, endpoint, axis);
  const staged = stagedNodeIntent(runtime, canonicalId, endpoint);
  const hasDraft = runtime.cellDrafts.has(draftKey);
  const virtual = topologyEditTableVirtualGeometryFields(
    row,
    canonicalTopology,
    runtime.transientNodeDrafts ?? {},
  );
  const value = hasDraft
    ? runtime.cellDrafts.get(draftKey)
    : staged?.requestedValue?.position?.[axis] ?? virtual[column.key] ?? '';
  const state = cellState(runtime, draftKey, staged, hasDraft);
  const invalid = state === 'invalid' ? 'true' : 'false';
  return `<td data-table-property="${escapeHtml(column.key)}" data-table-column-key="${escapeHtml(column.key)}" data-table-cell-state="${state}" title="${escapeHtml(capability.reason)}">
    <input class="topology-edit-table__cell-input" type="number" step="any" value="${escapeHtml(value)}" data-table-cell-edit="${NODE_CELL_KIND}" data-table-cell-draft-key="${escapeHtml(draftKey)}" data-table-cell-canonical-id="${escapeHtml(canonicalId)}" data-table-cell-endpoint="${escapeHtml(endpoint)}" data-table-cell-axis="${escapeHtml(axis.toUpperCase())}" aria-label="${escapeHtml(`${column.label} for ${row.fields?.tag ?? canonicalId}`)}" aria-invalid="${invalid}">
  </td>`;
}

function readOnlyNodeCellHtml(runtime, row, column, capability, canonicalTopology) {
  const virtual = topologyEditTableVirtualGeometryFields(
    row,
    canonicalTopology,
    runtime.transientNodeDrafts ?? {},
  );
  const value = displayValue(virtual[column.key]);
  const state = capability.status === 'UNREPRESENTABLE' ? 'unrepresentable' : 'blocked';
  return `<td data-table-property="${escapeHtml(column.key)}" data-table-column-key="${escapeHtml(column.key)}" data-table-cell-state="${state}" title="${escapeHtml(capability.reason)}">${escapeHtml(value)}</td>`;
}

function compoundCellHtml(runtime, row, column, capability) {
  const canonicalId = row.identity.canonicalId;
  const intentKind = capability.details.intentKind;
  const staged = stagedIntent(runtime, canonicalId, intentKind);
  const state = runtime.staleResult && staged ? 'stale' : staged ? 'staged' : 'needs-input';
  const value = displayValue(column.key === 'elementType' ? row.elementType : row.fields?.[column.key]);
  const label = `Edit ${column.label} for ${row.fields?.tag ?? canonicalId}`;
  return `<td data-table-property="${escapeHtml(column.key)}" data-table-column-key="${escapeHtml(column.key)}" data-table-cell-state="${state}">
    <button type="button" data-table-compound-edit="${escapeHtml(intentKind)}" data-table-cell-canonical-id="${escapeHtml(canonicalId)}" data-table-cell-column-key="${escapeHtml(column.key)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(capability.reason)}">${escapeHtml(value)} ↗</button>
  </td>`;
}

function nodeDraftPosition(runtime, canonicalId, endpoint, staged) {
  const row = runtime.projection?.rows.find((candidate) => candidate.identity?.canonicalId === canonicalId);
  if (!row) throw new RangeError(`Engineering Table: exact row ${canonicalId} is unavailable.`);
  const virtual = topologyEditTableVirtualGeometryFields(
    row,
    runtime.controller?.session?.currentTopology?.(),
  );
  const prefix = endpoint === 'FROM' ? 'from' : 'to';
  const base = staged?.requestedValue?.position ?? {
    x: virtual[`${prefix}X`],
    y: virtual[`${prefix}Y`],
    z: virtual[`${prefix}Z`],
  };
  const position = {};
  for (const axis of ['x', 'y', 'z']) {
    const key = nodeDraftKey(canonicalId, endpoint, axis);
    const candidate = runtime.cellDrafts.has(key) ? runtime.cellDrafts.get(key) : base[axis];
    const number = Number(candidate);
    if (!Number.isFinite(number)) {
      throw new RangeError(`Engineering Table: ${endpoint} ${axis.toUpperCase()} must be finite.`);
    }
    position[axis] = number;
  }
  return position;
}

function clearNodeEndpointDrafts(runtime, canonicalId, endpoint) {
  for (const axis of ['x', 'y', 'z']) {
    runtime.cellDrafts.delete(nodeDraftKey(canonicalId, endpoint, axis));
  }
}

function nodeColumnAxis(columnKey) {
  const match = String(columnKey ?? '').match(/^(?:from|to)([XYZ])$/);
  if (!match) throw new RangeError(`Engineering Table: ${columnKey} is not a node coordinate column.`);
  return match[1].toLowerCase();
}

function nodeDraftKey(canonicalId, endpoint, axis) {
  return `${NODE_CELL_KIND}:${canonicalId}:${endpoint}:${String(axis).toUpperCase()}`;
}

function focusCompoundEditor(runtime, selector) {
  const target = runtime.element?.querySelector(selector);
  target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  target?.focus?.();
}

function cellState(runtime, draftKey, staged, hasDraft) {
  if (runtime.cellErrorId === draftKey) return 'invalid';
  if (runtime.staleResult && staged) return 'stale';
  if (hasDraft) return 'draft';
  if (staged) return 'staged';
  return 'available';
}

function pipePolicy(runtime, canonicalId) {
  const primary = runtime.projection?.rows.find((row) => row.rowId === runtime.viewState.primaryRowId);
  if (primary?.identity?.canonicalId === canonicalId) {
    return {
      anchor: runtime.element.querySelector('[data-table-edit-anchor]')?.value ?? DEFAULT_POLICY.anchor,
      propagation: runtime.element.querySelector('[data-table-edit-propagation]')?.value ?? DEFAULT_POLICY.propagation,
    };
  }
  return stagedIntent(runtime, canonicalId, PIPE_CELL_KIND)?.geometryPolicy ?? DEFAULT_POLICY;
}

function adjacentPipeCellId(runtime, canonicalId, direction) {
  const ids = topologyEditTableVisibleRows(runtime.projection, runtime.viewState)
    .filter((row) => deriveTopologyEditTableCellCapability({
      row,
      columnKey: 'lengthMm',
      projection: runtime.projection,
      canonicalTopology: runtime.controller?.session?.currentTopology?.(),
    }).status === 'AVAILABLE')
    .map((row) => row.identity.canonicalId);
  const index = ids.indexOf(canonicalId);
  if (index < 0 || ids.length < 2) return canonicalId;
  return ids[(index + direction + ids.length) % ids.length];
}

function adjacentDirectDraftKey(runtime, draftKey, direction) {
  const keys = [...(runtime.element?.querySelectorAll?.('[data-table-cell-draft-key]') ?? [])]
    .map((input) => input.dataset.tableCellDraftKey)
    .filter(Boolean);
  const index = keys.indexOf(draftKey);
  if (index < 0 || keys.length < 2) return draftKey;
  return keys[(index + direction + keys.length) % keys.length];
}

function prepareCellWindow(runtime, canonicalId) {
  const rows = topologyEditTableVisibleRows(runtime.projection, runtime.viewState);
  const index = rows.findIndex((row) => row.identity.canonicalId === canonicalId);
  if (index < 0) return;
  const current = topologyEditTableRowWindow(rows.length, runtime.tableWindowStart);
  if (index >= current.start && index < current.end) return;
  runtime.tableWindowStart = topologyEditTableWindowStartForRow(index);
  runtime.tableScrollTop = index * TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX;
}

function focusPipeCell(runtime, canonicalId) {
  const input = [...runtime.element.querySelectorAll(`[data-table-cell-edit="${PIPE_CELL_KIND}"]`)]
    .find((candidate) => candidate.dataset.tableCellCanonicalId === canonicalId);
  input?.focus();
  input?.select?.();
}

function focusDirectCell(runtime, draftKey) {
  const input = [...(runtime.element?.querySelectorAll?.('[data-table-cell-draft-key]') ?? [])]
    .find((candidate) => candidate.dataset.tableCellDraftKey === draftKey);
  input?.focus?.();
  input?.select?.();
}

function stagedNodeIntent(runtime, canonicalId, endpoint) {
  return (runtime.intents ?? []).find((intent) => (
    intent.target?.canonicalId === canonicalId
    && intent.intentKind === NODE_CELL_KIND
    && intent.requestedValue?.endpoint === endpoint
  )) ?? null;
}

function stagedIntent(runtime, canonicalId, intentKind) {
  return (runtime.intents ?? []).find((intent) => (
    intent.target?.canonicalId === canonicalId
    && (!intentKind || intent.intentKind === intentKind)
  )) ?? null;
}

function inputDraftKey(input) {
  return input.dataset.tableCellDraftKey ?? input.dataset.tableCellCanonicalId;
}

function directInput(target, root) {
  if (!target?.matches?.('[data-table-cell-edit]') || !root?.contains(target)) return null;
  return [PIPE_CELL_KIND, NODE_CELL_KIND].includes(target.dataset.tableCellEdit) ? target : null;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
  return String(value);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
