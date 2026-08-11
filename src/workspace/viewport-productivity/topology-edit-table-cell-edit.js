import { deriveTopologyEditTableCellCapability } from '../topology-edit/table/topology-edit-table-edit-capability.js';
import { stageTopologyEditTablePipeLength } from './topology-edit-table-pipe-length-runtime.js';

const CELL_KIND = 'PIPE_LENGTH';
const DEFAULT_POLICY = Object.freeze({ anchor: 'FROM', propagation: 'DOWNSTREAM' });

export function topologyEditTableDirectCellHtml(runtime, row, column) {
  const capability = deriveTopologyEditTableCellCapability({
    row,
    columnKey: column.key,
    projection: runtime.projection,
  });
  if (capability.status !== 'AVAILABLE' || capability.details?.intentKind !== CELL_KIND) return null;
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
  runtime.render();
  focusCell(runtime, result.ok ? nextId ?? canonicalId : canonicalId);
  return true;
}

export function resetTopologyEditTableCellEditing(runtime) {
  runtime.cellDrafts.clear();
  runtime.cellErrorId = null;
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
  const inputs = [...runtime.element.querySelectorAll(`[data-table-cell-edit="${CELL_KIND}"]`)];
  const index = inputs.findIndex((input) => input.dataset.tableCellCanonicalId === canonicalId);
  if (index < 0 || inputs.length < 2) return canonicalId;
  const next = (index + direction + inputs.length) % inputs.length;
  return inputs[next].dataset.tableCellCanonicalId;
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
