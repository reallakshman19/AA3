import { deriveTopologyEditTableCellCapability } from '../topology-edit/table/topology-edit-table-edit-capability.js';
import { topologyEditTableVisibleRows } from '../topology-edit/table/topology-edit-table-view-state.js';
import { stageTopologyEditNodePosition } from './topology-edit-table-engineering-runtime.js';
import { stageTopologyEditTablePipeLength } from './topology-edit-table-pipe-length-runtime.js';
import {
  TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX,
  topologyEditTableRowWindow,
  topologyEditTableWindowStartForRow,
} from './topology-edit-table-row-window.js';

const CELL_KIND = 'PIPE_LENGTH';
const DEFAULT_POLICY = Object.freeze({ anchor: 'FROM', propagation: 'DOWNSTREAM' });
const COMPOUND_FOCUS = Object.freeze({
  VALVE_REPLACEMENT: '[data-table-edit-valve-catalogue-record]',
  TEE_REDUCER_RELATION: '[data-table-edit-tee-branch-port]',
});

export function topologyEditTableDirectCellHtml(runtime, row, column) {
  const capability = deriveTopologyEditTableCellCapability({
    row,
    columnKey: column.key,
    projection: runtime.projection,
  });
  const intentKind = capability.details?.intentKind;
  if (capability.status === 'AVAILABLE' && intentKind === CELL_KIND) {
    return directPipeCellHtml(runtime, row, column);
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
  runtime.cellDrafts.set(input.dataset.tableCellCanonicalId, input.value);
  if (runtime.cellErrorId === input.dataset.tableCellCanonicalId) {
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
  const canonicalId = input.dataset.tableCellCanonicalId;
  if (event.key === 'Escape') {
    event.preventDefault();
    runtime.cellDrafts.delete(canonicalId);
    if (runtime.cellErrorId === canonicalId) runtime.error = null;
    runtime.cellErrorId = null;
    runtime.render();
    focusCell(runtime, canonicalId);
    return true;
  }
  if (event.key !== 'Enter' && event.key !== 'Tab') return false;
  event.preventDefault();
  const nextId = adjacentCellId(runtime, canonicalId, event.shiftKey ? -1 : 1);
  const policy = pipePolicy(runtime, canonicalId);
  const result = stageTopologyEditTablePipeLength(runtime, {
    canonicalId,
    lengthMm: input.value,
    anchor: policy.anchor,
    propagation: policy.propagation,
  });
  if (result.ok) {
    runtime.cellDrafts.delete(canonicalId);
    runtime.cellErrorId = null;
  } else {
    runtime.cellErrorId = canonicalId;
  }
  const focusId = result.ok ? nextId ?? canonicalId : canonicalId;
  prepareCellWindow(runtime, focusId);
  runtime.render();
  focusCell(runtime, focusId);
  return true;
}

export function resetTopologyEditTableCellEditing(runtime) {
  runtime.cellDrafts.clear();
  runtime.cellErrorId = null;
}

function directPipeCellHtml(runtime, row, column) {
  const canonicalId = row.identity.canonicalId;
  const staged = stagedIntent(runtime, canonicalId);
  const hasDraft = runtime.cellDrafts.has(canonicalId);
  const value = hasDraft
    ? runtime.cellDrafts.get(canonicalId)
    : staged?.requestedValue?.lengthMm ?? row.fields?.lengthMm ?? '';
  const state = cellState(runtime, canonicalId, staged, hasDraft);
  const invalid = state === 'invalid' ? 'true' : 'false';
  return `<td data-table-property="${escapeHtml(column.key)}" data-table-column-key="${escapeHtml(column.key)}" data-table-cell-state="${state}">
    <input class="topology-edit-table__cell-input" type="number" step="any" min="0" value="${escapeHtml(value)}" data-table-cell-edit="${CELL_KIND}" data-table-cell-canonical-id="${escapeHtml(canonicalId)}" aria-label="${escapeHtml(`Length for ${row.fields?.tag ?? canonicalId}`)}" aria-invalid="${invalid}">
  </td>`;
}

function compoundCellHtml(runtime, row, column, capability) {
  const canonicalId = row.identity.canonicalId;
  const staged = stagedIntent(runtime, canonicalId);
  const state = runtime.staleResult && staged ? 'stale' : staged ? 'staged' : 'needs-input';
  const intentKind = capability.details.intentKind;
  const value = displayValue(column.key === 'elementType' ? row.elementType : row.fields?.[column.key]);
  const label = `Edit ${column.label} for ${row.fields?.tag ?? canonicalId}`;
  return `<td data-table-property="${escapeHtml(column.key)}" data-table-column-key="${escapeHtml(column.key)}" data-table-cell-state="${state}">
    <button type="button" data-table-compound-edit="${escapeHtml(intentKind)}" data-table-cell-canonical-id="${escapeHtml(canonicalId)}" data-table-cell-column-key="${escapeHtml(column.key)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(capability.reason)}">${escapeHtml(value)} ↗</button>
  </td>`;
}

function focusCompoundEditor(runtime, selector) {
  const target = runtime.element?.querySelector(selector);
  target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  target?.focus?.();
}

function cellState(runtime, canonicalId, staged, hasDraft) {
  if (runtime.cellErrorId === canonicalId) return 'invalid';
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
  return stagedIntent(runtime, canonicalId)?.geometryPolicy ?? DEFAULT_POLICY;
}

function adjacentCellId(runtime, canonicalId, direction) {
  const ids = topologyEditTableVisibleRows(runtime.projection, runtime.viewState)
    .filter((row) => deriveTopologyEditTableCellCapability({
      row, columnKey: 'lengthMm', projection: runtime.projection,
    }).status === 'AVAILABLE')
    .map((row) => row.identity.canonicalId);
  const index = ids.indexOf(canonicalId);
  if (index < 0 || ids.length < 2) return canonicalId;
  return ids[(index + direction + ids.length) % ids.length];
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

function focusCell(runtime, canonicalId) {
  const input = [...runtime.element.querySelectorAll(`[data-table-cell-edit="${CELL_KIND}"]`)]
    .find((candidate) => candidate.dataset.tableCellCanonicalId === canonicalId);
  input?.focus();
  input?.select?.();
}

function stagedIntent(runtime, canonicalId) {
  return runtime.intents.find((intent) => intent.target.canonicalId === canonicalId) ?? null;
}

function directInput(target, root) {
  if (!target?.matches?.(`[data-table-cell-edit="${CELL_KIND}"]`) || !root?.contains(target)) return null;
  return target;
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
