import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import {
  LFEA_PREFLIGHT_COLUMN_PRESETS,
  LFEA_PREFLIGHT_COLUMN_SCHEMA,
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
} from './lfea-preflight-phase1-schema.js';
import {
  countLfeaPreflightPhase1Facet,
  getLfeaPreflightPhase1Queue,
  queryLfeaPreflightPhase1Index,
} from './lfea-preflight-phase1-index.js';
import {
  getLfeaPreflightPhase1ComponentsForLine,
} from './lfea-preflight-phase1-component-index.js';
import {
  getLfeaPreflightPhase1Cell,
  getLfeaPreflightPhase1ComponentRecord,
  getLfeaPreflightPhase1LineRecord,
} from './lfea-preflight-phase1-adapter.js';

export const LFEA_PREFLIGHT_PHASE1_VIEWPORT_SCHEMA = 'lfea-preflight-phase1-viewport/v1';

const VIEWPORT_STATE = new WeakMap();
const SORT_IDS = Object.freeze([
  'TARGET_ID_ASC',
  'LINE_KEY_ASC',
  'SERVICE_ASC',
  'READINESS_ASC',
]);
const DEFAULT_PROVIDERS = Object.freeze({
  getLine: getLfeaPreflightPhase1LineRecord,
  getCell: getLfeaPreflightPhase1Cell,
  getComponent: getLfeaPreflightPhase1ComponentRecord,
});

/**
 * Create one indexed viewport. Providers are a data-access seam, not a second
 * authority layer: the default providers read the production review source,
 * while qualification may inject lazy read-only providers over the same frozen
 * line/component indexes without importing fixtures into production code.
 */
export function createLfeaPreflightPhase1Viewport(source, options = {}) {
  if (!source || source.blocked || !source.lineIndex || !source.componentIndex) {
    throw viewportError('E_P06_VIEW_SOURCE_REQUIRED', 'A non-blocked Phase-1 indexed review source is required.');
  }
  const state = {
    source,
    providers: requireProviders(options.providers ?? DEFAULT_PROVIDERS),
    viewportHeight: positive(options.viewportHeight ?? 420, 'viewportHeight'),
    viewportWidth: positive(options.viewportWidth ?? 900, 'viewportWidth'),
    rowHeight: positive(options.rowHeight ?? 32, 'rowHeight'),
    rowOverscan: nonnegative(options.rowOverscan ?? 4, 'rowOverscan'),
    columnWidth: positive(options.columnWidth ?? 180, 'columnWidth'),
    columnOverscan: nonnegative(options.columnOverscan ?? 2, 'columnOverscan'),
    componentViewportRows: positiveInteger(options.componentViewportRows ?? 8, 'componentViewportRows'),
    scrollTop: 0,
    scrollLeft: 0,
    queueId: null,
    filter: Object.freeze({ combine: 'AND', clauses: Object.freeze([]) }),
    sortId: 'TARGET_ID_ASC',
    presetId: normalizePreset(options.presetId ?? 'REVIEW'),
    selection: null,
    expandedLineTargetId: null,
    componentStart: 0,
  };
  const viewport = Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_VIEWPORT_SCHEMA,
    sourceStructuralHash: source.structuralHash,
  });
  VIEWPORT_STATE.set(viewport, state);
  return viewport;
}

export function setLfeaPreflightPhase1ViewportSize(viewport, input) {
  const state = requireViewport(viewport);
  state.viewportHeight = positive(input?.height ?? state.viewportHeight, 'height');
  state.viewportWidth = positive(input?.width ?? state.viewportWidth, 'width');
  clampScroll(state);
  return viewport;
}

export function setLfeaPreflightPhase1Scroll(viewport, input) {
  const state = requireViewport(viewport);
  state.scrollTop = nonnegative(input?.top ?? state.scrollTop, 'scrollTop');
  state.scrollLeft = nonnegative(input?.left ?? state.scrollLeft, 'scrollLeft');
  clampScroll(state);
  return viewport;
}

export function setLfeaPreflightPhase1Filter(viewport, filter) {
  const state = requireViewport(viewport);
  state.filter = freezeFilter(filter ?? {});
  state.scrollTop = 0;
  reconcileSelection(state);
  return viewport;
}

export function setLfeaPreflightPhase1Queue(viewport, queueId) {
  const state = requireViewport(viewport);
  state.queueId = queueId === null || queueId === undefined || String(queueId).trim() === ''
    ? null
    : String(queueId).trim().toUpperCase();
  if (state.queueId !== null) getLfeaPreflightPhase1Queue(state.source.lineIndex, state.queueId);
  state.scrollTop = 0;
  reconcileSelection(state);
  return viewport;
}

export function setLfeaPreflightPhase1Sort(viewport, sortId) {
  const state = requireViewport(viewport);
  const normalized = String(sortId ?? '').trim().toUpperCase();
  if (!SORT_IDS.includes(normalized)) {
    throw viewportError('E_P06_SORT_UNKNOWN', `Unknown Phase-1 sort: ${sortId}`);
  }
  state.sortId = normalized;
  state.scrollTop = 0;
  reconcileSelection(state);
  return viewport;
}

export function setLfeaPreflightPhase1ColumnPreset(viewport, presetId) {
  const state = requireViewport(viewport);
  state.presetId = normalizePreset(presetId);
  state.scrollLeft = 0;
  reconcileSelection(state);
  return viewport;
}

export function selectLfeaPreflightPhase1Cell(viewport, targetId, fieldOrdinal) {
  const state = requireViewport(viewport);
  const target = requireLine(state, targetId);
  const ordinal = requireFieldOrdinal(fieldOrdinal);
  state.selection = Object.freeze({ targetId: target.targetId, fieldOrdinal: ordinal });
  return viewport;
}

export function moveLfeaPreflightPhase1Selection(viewport, rowDelta, columnDelta) {
  const state = requireViewport(viewport);
  const rows = orderedTargetIds(state);
  const columns = presetOrdinals(state);
  if (rows.length === 0 || columns.length === 0) return viewport;
  let rowIndex = state.selection ? rows.indexOf(state.selection.targetId) : 0;
  if (rowIndex < 0) rowIndex = 0;
  let columnIndex = state.selection ? columns.indexOf(state.selection.fieldOrdinal) : 0;
  if (columnIndex < 0) columnIndex = 0;
  rowIndex = clamp(rowIndex + signedInteger(rowDelta, 'rowDelta'), 0, rows.length - 1);
  columnIndex = clamp(columnIndex + signedInteger(columnDelta, 'columnDelta'), 0, columns.length - 1);
  state.selection = Object.freeze({ targetId: rows[rowIndex], fieldOrdinal: columns[columnIndex] });
  ensureSelectionInView(state, rowIndex, columnIndex, rows.length, columns.length);
  return viewport;
}

export function expandLfeaPreflightPhase1Line(viewport, targetId) {
  const state = requireViewport(viewport);
  const target = targetId === null || targetId === undefined ? null : String(targetId);
  if (target !== null) requireLine(state, target);
  state.expandedLineTargetId = state.expandedLineTargetId === target ? null : target;
  state.componentStart = 0;
  return viewport;
}

export function setLfeaPreflightPhase1ComponentStart(viewport, start) {
  const state = requireViewport(viewport);
  state.componentStart = nonnegative(start, 'componentStart');
  return viewport;
}

export function getLfeaPreflightPhase1ViewportModel(viewport) {
  const state = requireViewport(viewport);
  const rows = orderedTargetIds(state);
  const columns = presetOrdinals(state);
  clampScroll(state, rows.length, columns.length);

  const rowWindow = computeWindow({
    totalCount: rows.length,
    itemSize: state.rowHeight,
    viewportSize: state.viewportHeight,
    scrollOffset: state.scrollTop,
    overscan: state.rowOverscan,
  });
  const columnWindow = computeWindow({
    totalCount: columns.length,
    itemSize: state.columnWidth,
    viewportSize: state.viewportWidth,
    scrollOffset: state.scrollLeft,
    overscan: state.columnOverscan,
  });
  const visibleRowTargetIds = rows.slice(rowWindow.start, rowWindow.end);
  const visibleColumnOrdinals = Object.freeze(columns.slice(columnWindow.start, columnWindow.end));
  const visibleColumns = Object.freeze(visibleColumnOrdinals.map((ordinal) => LFEA_PREFLIGHT_COLUMN_SCHEMA[ordinal]));
  const visibleRows = Object.freeze(visibleRowTargetIds.map((targetId, localIndex) => {
    const line = requireLine(state, targetId);
    const cells = Object.freeze(visibleColumnOrdinals.map((fieldOrdinal) => requireCell(
      state,
      targetId,
      fieldOrdinal,
    )));
    return Object.freeze({
      virtualOrdinal: rowWindow.start + localIndex,
      targetId,
      lineKey: line.fullLineKeyName,
      normalizedKey: line.isolatedLineKeyToken,
      service: line.service,
      rating: line.rating,
      pipingClass: line.pipingClass,
      bore: line.bore,
      itemCount: line.itemCount,
      readiness: lineReadiness(line),
      resolutionStatus: line.resolution?.status ?? line.resolutionStatus ?? lineReadiness(line),
      cells,
      selected: state.selection?.targetId === targetId,
      expanded: state.expandedLineTargetId === targetId,
    });
  }));
  const componentViewport = componentModel(state);
  const selection = selectionModel(state, rows, columns, visibleRowTargetIds, visibleColumnOrdinals);
  const queueCounts = Object.freeze({ ...state.source.lineIndex.queueCounts });
  const facetCounts = Object.freeze({
    service: countLfeaPreflightPhase1Facet(state.source.lineIndex, 'service', state.filter),
    rating: countLfeaPreflightPhase1Facet(state.source.lineIndex, 'rating', state.filter),
    pipingClass: countLfeaPreflightPhase1Facet(state.source.lineIndex, 'pipingClass', state.filter),
    readiness: countLfeaPreflightPhase1Facet(state.source.lineIndex, 'readiness', state.filter),
  });
  return Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_VIEWPORT_SCHEMA,
    sourceStructuralHash: state.source.structuralHash,
    targetCount: state.source.targetCount,
    componentCount: state.source.componentCount,
    filteredRowCount: rows.length,
    presetId: state.presetId,
    sortId: state.sortId,
    queueId: state.queueId,
    filter: state.filter,
    queueCounts,
    facetCounts,
    rowWindow: Object.freeze(rowWindow),
    columnWindow: Object.freeze(columnWindow),
    visibleColumnOrdinals,
    visibleColumns,
    visibleRows,
    componentViewport,
    selection,
    liveLineRowCount: visibleRows.length,
    liveEngineeringCellCount: visibleRows.length * visibleColumns.length,
    rowDomUpperBound: Math.ceil(state.viewportHeight / state.rowHeight) + state.rowOverscan * 2 + 1,
    columnDomUpperBound: Math.ceil(state.viewportWidth / state.columnWidth) + state.columnOverscan * 2 + 1,
    structuralDigest: semanticHash({
      source: state.source.structuralHash,
      rows: rows.length,
      rowWindow,
      columns: visibleColumnOrdinals,
      queueId: state.queueId,
      sortId: state.sortId,
      selection,
      componentViewport: componentViewport?.digest ?? null,
    }),
  });
}

function orderedTargetIds(state) {
  const clauses = [...state.filter.clauses];
  if (state.queueId !== null) {
    clauses.push(Object.freeze({
      queueId: state.queueId,
      mode: 'OR',
      values: Object.freeze([state.queueId]),
    }));
  }
  const targetIds = [...queryLfeaPreflightPhase1Index(state.source.lineIndex, {
    combine: state.filter.combine,
    clauses,
  }).targetIds];
  if (state.sortId === 'TARGET_ID_ASC') return targetIds;
  targetIds.sort((left, right) => compareLineTargets(state, left, right));
  return targetIds;
}

function compareLineTargets(state, leftId, rightId) {
  const left = requireLine(state, leftId);
  const right = requireLine(state, rightId);
  if (state.sortId === 'LINE_KEY_ASC') {
    return compareAscii(left.fullLineKeyName, right.fullLineKeyName) || compareAscii(leftId, rightId);
  }
  if (state.sortId === 'SERVICE_ASC') {
    return compareAscii(left.service, right.service)
      || compareAscii(left.fullLineKeyName, right.fullLineKeyName)
      || compareAscii(leftId, rightId);
  }
  if (state.sortId === 'READINESS_ASC') {
    return compareAscii(lineReadiness(left), lineReadiness(right))
      || compareAscii(left.fullLineKeyName, right.fullLineKeyName)
      || compareAscii(leftId, rightId);
  }
  return compareAscii(leftId, rightId);
}

function componentModel(state) {
  if (state.expandedLineTargetId === null) return null;
  const viewport = getLfeaPreflightPhase1ComponentsForLine(
    state.source.componentIndex,
    state.source.lineIndex,
    state.expandedLineTargetId,
    state.componentStart,
    state.componentViewportRows,
  );
  const rows = Object.freeze(viewport.targetIds.map((targetId) => {
    const component = state.providers.getComponent(state.source, targetId);
    if (component === null || component === undefined) {
      throw viewportError('E_P06_COMPONENT_RECORD_MISSING', `Missing component record: ${targetId}`);
    }
    return Object.freeze(component);
  }));
  return Object.freeze({
    ...viewport,
    rows,
    liveComponentRowCount: rows.length,
    viewportRowUpperBound: state.componentViewportRows,
  });
}

function selectionModel(state, rows, columns, visibleRowTargetIds, visibleColumnOrdinals) {
  if (state.selection === null) return null;
  const inFilteredSet = rows.includes(state.selection.targetId);
  const inPreset = columns.includes(state.selection.fieldOrdinal);
  const inViewport = visibleRowTargetIds.includes(state.selection.targetId)
    && visibleColumnOrdinals.includes(state.selection.fieldOrdinal);
  return Object.freeze({
    ...state.selection,
    fieldId: LFEA_PREFLIGHT_ENGINEERING_FIELDS[state.selection.fieldOrdinal],
    inFilteredSet,
    inPreset,
    inViewport,
    visible: inViewport,
  });
}

function lineReadiness(line) {
  if (typeof line.readiness === 'string' && line.readiness) return line.readiness;
  const priorities = [
    'BLOCKED_CONFLICT',
    'BLOCKED_AMBIGUOUS',
    'BLOCKED_MISSING',
    'BLOCKED_STALE_SOURCE',
    'PROPOSED_REVIEW',
    'RESOLVED_DERIVED',
    'RESOLVED_EXACT',
    'NOT_APPLICABLE',
  ];
  const statuses = new Set((line.cells ?? []).map((cell) => cell.statusText));
  return priorities.find((value) => statuses.has(value)) ?? 'NOT_APPLICABLE';
}

function computeWindow({ totalCount, itemSize, viewportSize, scrollOffset, overscan }) {
  if (totalCount === 0) {
    return { start: 0, end: 0, count: 0, beforePx: 0, afterPx: 0, totalPx: 0 };
  }
  const visibleStart = Math.floor(scrollOffset / itemSize);
  const visibleCount = Math.ceil(viewportSize / itemSize) + 1;
  const start = clamp(visibleStart - overscan, 0, totalCount);
  const end = clamp(visibleStart + visibleCount + overscan, start, totalCount);
  return {
    start,
    end,
    count: end - start,
    beforePx: start * itemSize,
    afterPx: Math.max(0, (totalCount - end) * itemSize),
    totalPx: totalCount * itemSize,
  };
}

function ensureSelectionInView(state, rowIndex, columnIndex, rowCount, columnCount) {
  const rowTop = rowIndex * state.rowHeight;
  const rowBottom = rowTop + state.rowHeight;
  if (rowTop < state.scrollTop) state.scrollTop = rowTop;
  if (rowBottom > state.scrollTop + state.viewportHeight) state.scrollTop = rowBottom - state.viewportHeight;
  const columnLeft = columnIndex * state.columnWidth;
  const columnRight = columnLeft + state.columnWidth;
  if (columnLeft < state.scrollLeft) state.scrollLeft = columnLeft;
  if (columnRight > state.scrollLeft + state.viewportWidth) state.scrollLeft = columnRight - state.viewportWidth;
  clampScroll(state, rowCount, columnCount);
}

function reconcileSelection(state) {
  if (state.selection === null) return;
  const line = state.providers.getLine(state.source, state.selection.targetId);
  if (line === null || line === undefined) state.selection = null;
}

function clampScroll(state, rowCount, columnCount) {
  const rows = rowCount ?? orderedTargetIds(state).length;
  const columns = columnCount ?? presetOrdinals(state).length;
  state.scrollTop = clamp(state.scrollTop, 0, Math.max(0, rows * state.rowHeight - state.viewportHeight));
  state.scrollLeft = clamp(state.scrollLeft, 0, Math.max(0, columns * state.columnWidth - state.viewportWidth));
}

function presetOrdinals(state) {
  return LFEA_PREFLIGHT_COLUMN_PRESETS[state.presetId];
}

function requireLine(state, targetId) {
  const line = state.providers.getLine(state.source, targetId);
  if (line === null || line === undefined) {
    throw viewportError('E_P06_TARGET_UNKNOWN', `Unknown Phase-1 line target: ${targetId}`);
  }
  if (String(line.targetId) !== String(targetId)) {
    throw viewportError('E_P06_PROVIDER_IDENTITY_STALE', `Phase-1 line provider returned stale identity for ${targetId}.`);
  }
  return line;
}

function requireCell(state, targetId, fieldOrdinal) {
  const cell = state.providers.getCell(state.source, targetId, fieldOrdinal);
  if (cell === null || cell === undefined) {
    throw viewportError('E_P06_CELL_RECORD_MISSING', `Missing Phase-1 cell ${targetId}/${fieldOrdinal}.`);
  }
  if (cell.fieldOrdinal !== fieldOrdinal
    || cell.fieldId !== LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal]) {
    throw viewportError('E_P06_PROVIDER_IDENTITY_STALE', `Phase-1 cell provider returned stale identity for ${targetId}/${fieldOrdinal}.`);
  }
  return cell;
}

function requireProviders(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.getLine !== 'function'
    || typeof value.getCell !== 'function'
    || typeof value.getComponent !== 'function') {
    throw viewportError('E_P06_VIEW_PROVIDER_INVALID', 'Phase-1 viewport providers must expose getLine/getCell/getComponent functions.');
  }
  return Object.freeze({
    getLine: value.getLine,
    getCell: value.getCell,
    getComponent: value.getComponent,
  });
}

function requireFieldOrdinal(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= LFEA_PREFLIGHT_ENGINEERING_FIELDS.length) {
    throw viewportError('E_P06_FIELD_ORDINAL_INVALID', `Phase-1 field ordinal is invalid: ${value}`);
  }
  return value;
}

function normalizePreset(value) {
  const preset = String(value ?? '').trim().toUpperCase();
  if (!(preset in LFEA_PREFLIGHT_COLUMN_PRESETS)) {
    throw viewportError('E_P06_COLUMN_PRESET_UNKNOWN', `Unknown Phase-1 column preset: ${value}`);
  }
  return preset;
}

function freezeFilter(value) {
  const combine = String(value?.combine ?? 'AND').trim().toUpperCase();
  if (!['AND', 'OR'].includes(combine)) {
    throw viewportError('E_P06_FILTER_MODE_INVALID', `Unknown filter combine mode: ${combine}`);
  }
  const clauses = Object.freeze((value?.clauses ?? []).map((clause) => Object.freeze({
    ...(clause.facetId === undefined ? {} : { facetId: String(clause.facetId) }),
    ...(clause.queueId === undefined ? {} : { queueId: String(clause.queueId).toUpperCase() }),
    mode: String(clause.mode ?? 'OR').toUpperCase(),
    values: Object.freeze([...(clause.values ?? [])].map(String)),
  })));
  return Object.freeze({ combine, clauses });
}

function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw viewportError('E_P06_VIEWPORT_RANGE', `${field} must be positive.`);
  }
  return number;
}

function nonnegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw viewportError('E_P06_VIEWPORT_RANGE', `${field} must be non-negative.`);
  }
  return number;
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw viewportError('E_P06_VIEWPORT_RANGE', `${field} must be a positive integer.`);
  }
  return value;
}

function signedInteger(value, field) {
  if (!Number.isSafeInteger(value)) {
    throw viewportError('E_P06_VIEWPORT_RANGE', `${field} must be an integer.`);
  }
  return value;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function compareAscii(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function requireViewport(viewport) {
  const state = VIEWPORT_STATE.get(viewport);
  if (!state) throw viewportError('E_P06_VIEWPORT_REQUIRED', 'A Phase-1 viewport is required.');
  return state;
}

function viewportError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_VIEWPORT';
  return error;
}
