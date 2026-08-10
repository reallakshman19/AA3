/**
 * Source enrichment pre-flight review surface (Phase 1 live UI).
 *
 * Read-only. This module renders the indexed Phase-1 review source and its
 * bounded viewport. It resolves nothing, publishes no Project Data, mutates no
 * shared model, and carries no solver, empirical-load or topology authority.
 *
 * Both axes are virtualized. The scroller owns the scrollbar, a sizer carries
 * the full logical extent of the filtered result so the scrollbar reflects the
 * whole dataset, and only the row and column window the viewport model reports
 * is materialized. Live DOM is therefore a function of viewport size and the
 * declared overscan, never of dataset size — the fixed 500-row and 200-component
 * caps this surface used to rely on are retired.
 *
 * Grouping, filtering, sorting, queue membership and selection are all resolved
 * against the indexed model. This module never reads state back out of rendered
 * DOM.
 */
import {
  LFEA_PREFLIGHT_COLUMN_PRESETS,
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_EXCEPTION_QUEUE,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from './lfea-preflight-phase1-schema.js';
import {
  LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
  createLfeaPreflightPhase1ReviewSource,
} from './lfea-preflight-phase1-review-source.js';
import {
  createLfeaPreflightPhase1Viewport,
  expandLfeaPreflightPhase1Line,
  getLfeaPreflightPhase1ViewportModel,
  moveLfeaPreflightPhase1Selection,
  selectLfeaPreflightPhase1Cell,
  setLfeaPreflightPhase1ColumnPreset,
  setLfeaPreflightPhase1Filter,
  setLfeaPreflightPhase1Queue,
  setLfeaPreflightPhase1Scroll,
  setLfeaPreflightPhase1Sort,
  setLfeaPreflightPhase1ViewportSize,
} from './lfea-preflight-phase1-viewport.js';
import { masterDataController } from './master-data-controller.js';
import { projectPreflightModel } from './lfea-preflight-resolution.js';

export {
  PREFLIGHT_MATCH_STATUS,
  buildNormalizedKeyBuckets,
  deriveWallThicknessFromDtxr,
  projectPreflightModel,
  resolveLineKeyCandidates,
} from './lfea-preflight-resolution.js';

/** Declared window padding. Live DOM is bounded by viewport size plus these. */
export const GRID_ROW_OVERSCAN = 4;
export const GRID_COLUMN_OVERSCAN = 2;

/** Fixed geometry, so row and cell placement is computed, never content-driven. */
export const GRID_ROW_HEIGHT = 28;
export const GRID_HEAD_HEIGHT = 26;
export const GRID_COLUMN_WIDTH = 180;
export const GRID_LINE_COLUMN_WIDTH = 320;

const QUEUE_LABELS = Object.freeze([
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.MISSING, label: 'Missing' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.AMBIGUOUS, label: 'Ambiguous' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.CONFLICTING, label: 'Conflicting' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.STALE, label: 'Stale' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.PROPOSED, label: 'Proposed' }),
  Object.freeze({ queueId: LFEA_PREFLIGHT_EXCEPTION_QUEUE.DEFERRED, label: 'Deferred' }),
]);

const SORT_LABELS = Object.freeze([
  Object.freeze({ sortId: 'TARGET_ID_ASC', label: 'Stable target ID' }),
  Object.freeze({ sortId: 'LINE_KEY_ASC', label: 'Line key' }),
  Object.freeze({ sortId: 'SERVICE_ASC', label: 'Service' }),
  Object.freeze({ sortId: 'READINESS_ASC', label: 'Readiness' }),
]);

const STATUS_NAME_BY_VALUE = Object.freeze(Object.fromEntries(
  Object.entries(LFEA_PREFLIGHT_FIELD_STATUS).map(([name, value]) => [value, name]),
));

const TRACE_EMPTY = 'Select an engineering cell to inspect source, method, status and locator evidence.';

/**
 * Render the read-only pre-flight review surface into a host element.
 *
 * @param {Element} container Host element.
 * @param {unknown} model Shared-model carrier, or null.
 * @param {Function|undefined} renderCallback Optional re-render request.
 * @returns {object} The legacy projection that backs this render.
 */
export function renderPreflightGrid(container, model, renderCallback) {
  if (!container || typeof container.replaceChildren !== 'function') {
    throw new TypeError('Preflight grid requires a DOM host.');
  }
  return createSurface(container, model, renderCallback).projection;
}

function createSurface(container, model, renderCallback) {
  const doc = container.ownerDocument ?? document;
  const lineRows = normalizedLineRows();
  const projection = projectPreflightModel(model, lineRows);
  const source = createLfeaPreflightPhase1ReviewSource(model, lineRows);

  const root = create(doc, 'section', 'lfea-preflight-phase1');
  root.dataset.role = 'lfea-preflight-grid';
  root.dataset.blocked = source.blocked ? 'true' : 'false';

  if (source.blocked) {
    root.append(header(doc, null, renderCallback), blockedNotice(doc, projection.blocked));
    container.replaceChildren(root);
    return { projection, viewport: null };
  }

  const viewport = createLfeaPreflightPhase1Viewport(source, {
    providers: LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
    rowHeight: GRID_ROW_HEIGHT,
    columnWidth: GRID_COLUMN_WIDTH,
    rowOverscan: GRID_ROW_OVERSCAN,
    columnOverscan: GRID_COLUMN_OVERSCAN,
  });

  const parts = buildShell(doc, root, viewport, renderCallback);
  container.replaceChildren(root);
  measureAndPaint(parts, viewport);
  return { projection, viewport };
}

function buildShell(doc, root, viewport, renderCallback) {
  const headerBlock = header(doc, viewport, renderCallback);
  const toolbar = create(doc, 'div', 'lfea-preflight-phase1__toolbar');
  const scroller = create(doc, 'div', 'lfea-preflight-phase1__scroller');
  scroller.dataset.role = 'lfea-preflight-scroller';
  scroller.tabIndex = 0;
  const sizer = create(doc, 'div', 'lfea-preflight-phase1__sizer');
  const headRow = create(doc, 'div', 'lfea-preflight-phase1__headrow');
  const rowsLayer = create(doc, 'div');
  sizer.append(headRow, rowsLayer);
  scroller.append(sizer);
  const componentsBlock = create(doc, 'div', 'lfea-preflight-phase1__components');
  componentsBlock.dataset.role = 'lfea-preflight-components';
  const traceBlock = create(doc, 'div', 'lfea-preflight-phase1__trace');
  traceBlock.dataset.role = 'lfea-preflight-trace';
  const budget = create(doc, 'p', 'lfea-preflight-phase1__budget');
  budget.dataset.role = 'lfea-preflight-budget';
  root.append(headerBlock, toolbar, scroller, componentsBlock, traceBlock, budget);

  const parts = {
    doc, root, headerBlock, toolbar, scroller, sizer, headRow, rowsLayer,
    componentsBlock, traceBlock, budget, summary: headerBlock.summary,
  };

  scroller.addEventListener('scroll', () => {
    setLfeaPreflightPhase1Scroll(viewport, { top: scroller.scrollTop, left: scroller.scrollLeft });
    paint(parts, viewport);
  });
  scroller.addEventListener('keydown', (event) => {
    const step = keyboardStep(event.key);
    if (step === null) return;
    event.preventDefault();
    moveLfeaPreflightPhase1Selection(viewport, step.rowDelta, step.columnDelta);
    paint(parts, viewport);
  });
  buildToolbar(parts, viewport, renderCallback);
  return parts;
}

/** Arrow keys move the indexed selection; the grid never derives it from DOM. */
function keyboardStep(key) {
  if (key === 'ArrowUp') return { rowDelta: -1, columnDelta: 0 };
  if (key === 'ArrowDown') return { rowDelta: 1, columnDelta: 0 };
  if (key === 'ArrowLeft') return { rowDelta: 0, columnDelta: -1 };
  if (key === 'ArrowRight') return { rowDelta: 0, columnDelta: 1 };
  return null;
}

function buildToolbar(parts, viewport, renderCallback) {
  const { doc, toolbar } = parts;
  const queues = create(doc, 'div', 'lfea-preflight-phase1__queues');
  const all = queueButton(doc, null, 'All', () => {
    setLfeaPreflightPhase1Queue(viewport, null);
    paint(parts, viewport);
  });
  queues.append(all);
  for (const entry of QUEUE_LABELS) {
    queues.append(queueButton(doc, entry.queueId, entry.label, () => {
      setLfeaPreflightPhase1Queue(viewport, entry.queueId);
      paint(parts, viewport);
    }));
  }
  toolbar.append(queues);

  const model = getLfeaPreflightPhase1ViewportModel(viewport);
  parts.serviceSelect = facetSelect(doc, toolbar, 'Service', 'All services',
    facetValues(model, 'service'), () => applyFacets(parts, viewport));
  parts.ratingSelect = facetSelect(doc, toolbar, 'Rating', 'All ratings',
    facetValues(model, 'rating'), () => applyFacets(parts, viewport));

  parts.presetSelect = labelledSelect(doc, toolbar, 'Columns',
    Object.keys(LFEA_PREFLIGHT_COLUMN_PRESETS).map((id) => ({ value: id, label: id })), () => {
      setLfeaPreflightPhase1ColumnPreset(viewport, parts.presetSelect.value);
      measureAndPaint(parts, viewport);
    });
  parts.presetSelect.value = model.presetId;

  parts.sortSelect = labelledSelect(doc, toolbar, 'Sort',
    SORT_LABELS.map((row) => ({ value: row.sortId, label: row.label })), () => {
      setLfeaPreflightPhase1Sort(viewport, parts.sortSelect.value);
      paint(parts, viewport);
    });
  parts.sortSelect.value = model.sortId;

  if (typeof renderCallback === 'function') {
    const refresh = create(doc, 'button', 'lfea-preflight-phase1__refresh');
    refresh.type = 'button';
    refresh.dataset.role = 'lfea-preflight-refresh';
    refresh.textContent = 'Reload source and master data';
    refresh.addEventListener('click', () => renderCallback());
    toolbar.append(refresh);
  }
}

function applyFacets(parts, viewport) {
  const clauses = [];
  if (parts.serviceSelect.value !== '') {
    clauses.push({ facetId: 'service', mode: 'OR', values: [parts.serviceSelect.value] });
  }
  if (parts.ratingSelect.value !== '') {
    clauses.push({ facetId: 'rating', mode: 'OR', values: [parts.ratingSelect.value] });
  }
  setLfeaPreflightPhase1Filter(viewport, { combine: 'AND', clauses });
  paint(parts, viewport);
}

function facetValues(model, facetId) {
  const counts = model.facetCounts?.[facetId] ?? {};
  return Object.keys(counts).sort(compareAscii).map((value) => ({
    value,
    label: `${value} (${counts[value]})`,
  }));
}

function measureAndPaint(parts, viewport) {
  const height = parts.scroller.clientHeight;
  const width = parts.scroller.clientWidth;
  if (height > 0 && width > 0) {
    setLfeaPreflightPhase1ViewportSize(viewport, { height, width });
  }
  paint(parts, viewport);
}

function paint(parts, viewport) {
  const { doc } = parts;
  const model = getLfeaPreflightPhase1ViewportModel(viewport);
  // The window record reports extents in pixels, not counts. The sizer carries
  // the full logical extent so the scrollbar reflects the whole filtered result
  // while only the window is materialized.
  const gridWidth = GRID_LINE_COLUMN_WIDTH + model.columnWindow.totalPx;
  const totalColumns = Math.round(model.columnWindow.totalPx / GRID_COLUMN_WIDTH);

  parts.sizer.style.height = `${GRID_HEAD_HEIGHT + model.rowWindow.totalPx}px`;
  parts.sizer.style.width = `${gridWidth}px`;
  parts.headRow.style.width = `${gridWidth}px`;

  parts.root.setAttribute('aria-rowcount', String(model.filteredRowCount));
  parts.root.setAttribute('aria-colcount', String(totalColumns + 1));

  paintHead(doc, parts.headRow, model);
  paintRows(doc, parts, viewport, model, gridWidth);
  paintComponents(doc, parts.componentsBlock, model);
  paintTrace(doc, parts.traceBlock, model);

  parts.summary.textContent = summaryText(model);
  parts.budget.textContent = [
    `Live line rows ${model.liveLineRowCount} of ${model.filteredRowCount} filtered`,
    `row DOM upper bound ${model.rowDomUpperBound}`,
    `live cells ${model.liveEngineeringCellCount}`,
    `columns ${model.visibleColumns.length} of ${totalColumns}`,
    `dataset ${model.targetCount} lines / ${model.componentCount} components`,
  ].join(' | ');
}

function paintHead(doc, headRow, model) {
  const cells = [];
  const lineHead = create(doc, 'div', 'lfea-preflight-phase1__headcell');
  lineHead.style.left = '0px';
  lineHead.style.width = `${GRID_LINE_COLUMN_WIDTH}px`;
  lineHead.textContent = 'Line key / readiness';
  cells.push(lineHead);
  model.visibleColumns.forEach((column, index) => {
    const ordinalOffset = model.columnWindow.start + index;
    const cell = create(doc, 'div', 'lfea-preflight-phase1__headcell');
    cell.style.left = `${GRID_LINE_COLUMN_WIDTH + ordinalOffset * GRID_COLUMN_WIDTH}px`;
    cell.style.width = `${GRID_COLUMN_WIDTH}px`;
    cell.title = column.fieldId;
    cell.textContent = column.label ?? column.fieldId;
    cells.push(cell);
  });
  headRow.replaceChildren(...cells);
}

function paintRows(doc, parts, viewport, model, gridWidth) {
  const rendered = model.visibleRows.map((row) => {
    const element = create(doc, 'div', 'lfea-preflight-phase1__row');
    element.style.top = `${GRID_HEAD_HEIGHT + row.virtualOrdinal * GRID_ROW_HEIGHT}px`;
    element.style.width = `${gridWidth}px`;
    element.dataset.targetId = row.targetId;
    element.setAttribute('role', 'row');
    element.setAttribute('aria-rowindex', String(row.virtualOrdinal + 1));
    element.setAttribute('aria-selected', row.selected ? 'true' : 'false');
    element.append(lineCell(doc, parts, viewport, row));
    row.cells.forEach((cell, index) => {
      element.append(engineeringCell(doc, parts, viewport, model, row, cell, index));
    });
    return element;
  });
  parts.rowsLayer.replaceChildren(...rendered);
}

function lineCell(doc, parts, viewport, row) {
  const cell = create(doc, 'div', 'lfea-preflight-phase1__linecell');
  cell.style.top = '0px';
  cell.style.width = `${GRID_LINE_COLUMN_WIDTH}px`;
  const expand = create(doc, 'button', 'lfea-preflight-phase1__expand');
  expand.type = 'button';
  expand.dataset.role = 'lfea-preflight-expand';
  expand.setAttribute('aria-expanded', row.expanded ? 'true' : 'false');
  expand.textContent = `${row.expanded ? '▾' : '▸'} ${row.normalizedKey}`;
  expand.addEventListener('click', () => {
    expandLfeaPreflightPhase1Line(viewport, row.expanded ? null : row.targetId);
    paint(parts, viewport);
  });
  const readiness = create(doc, 'span', `lfea-preflight-phase1__status lfea-preflight-phase1__status--${row.readiness}`);
  readiness.textContent = row.readiness;
  const meta = create(doc, 'span');
  meta.textContent = `${row.service} / ${row.rating} · ${row.itemCount}`;
  cell.append(expand, readiness, meta);
  return cell;
}

function engineeringCell(doc, parts, viewport, model, row, cellRecord, index) {
  const ordinalOffset = model.columnWindow.start + index;
  const statusName = STATUS_NAME_BY_VALUE[cellRecord.status] ?? 'NOT_APPLICABLE';
  const cell = create(doc, 'div', 'lfea-preflight-phase1__cell');
  cell.style.left = `${GRID_LINE_COLUMN_WIDTH + ordinalOffset * GRID_COLUMN_WIDTH}px`;
  cell.style.width = `${GRID_COLUMN_WIDTH}px`;
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-colindex', String(ordinalOffset + 2));
  const selected = model.selection !== null
    && model.selection.targetId === row.targetId
    && model.selection.fieldOrdinal === cellRecord.fieldOrdinal;
  cell.setAttribute('aria-selected', selected ? 'true' : 'false');
  if (cellRecord.value === null || cellRecord.value === undefined) {
    const badge = create(doc, 'span', `lfea-preflight-phase1__status lfea-preflight-phase1__status--${statusName}`);
    badge.textContent = statusName;
    cell.append(badge);
  } else {
    cell.textContent = String(cellRecord.value);
  }
  cell.addEventListener('click', () => {
    selectLfeaPreflightPhase1Cell(viewport, row.targetId, cellRecord.fieldOrdinal);
    paint(parts, viewport);
  });
  return cell;
}

function paintComponents(doc, block, model) {
  const drawer = model.componentViewport;
  if (drawer === null || drawer === undefined) {
    block.hidden = true;
    block.replaceChildren();
    return;
  }
  block.hidden = false;
  const heading = create(doc, 'h4');
  heading.textContent = `Components — showing ${drawer.liveComponentRowCount} in a bounded drill-down viewport`;
  const rendered = drawer.rows.map((component) => {
    const line = create(doc, 'div', 'lfea-preflight-phase1__component');
    line.dataset.targetId = component.targetId;
    const name = create(doc, 'span');
    name.textContent = `${component.type} ${component.name}`;
    const bore = create(doc, 'span');
    bore.textContent = component.bore === null || component.bore === undefined
      ? 'BLOCKED' : `bore ${component.bore}`;
    const locator = create(doc, 'code');
    locator.textContent = component.provenancePath;
    line.append(name, bore, locator);
    return line;
  });
  block.replaceChildren(heading, ...rendered);
}

function paintTrace(doc, block, model) {
  const heading = create(doc, 'h4');
  heading.textContent = 'Trace';
  if (model.selection === null) {
    const empty = create(doc, 'p');
    empty.textContent = TRACE_EMPTY;
    block.replaceChildren(heading, empty);
    return;
  }
  const record = model.selection;
  const cell = model.visibleRows
    .find((row) => row.targetId === record.targetId)?.cells
    .find((entry) => entry.fieldOrdinal === record.fieldOrdinal) ?? null;
  const list = create(doc, 'dl');
  const rows = [
    ['Stable target ID', record.targetId],
    ['Field', LFEA_PREFLIGHT_ENGINEERING_FIELDS[record.fieldOrdinal]],
    ['Status', cell === null ? 'off-viewport' : (STATUS_NAME_BY_VALUE[cell.status] ?? 'NOT_APPLICABLE')],
    ['Value', cell === null || cell.value === null ? 'BLOCKED' : String(cell.value)],
    ['Source kind', cell === null ? 'off-viewport' : String(cell.sourceKind)],
    ['Source hash', cell === null ? 'off-viewport' : String(cell.sourceHash)],
    ['Method', cell === null ? 'off-viewport' : String(cell.method)],
    ['Locator', cell === null ? 'off-viewport' : String(cell.locator)],
    ['Candidates', cell === null ? 'off-viewport' : String(cell.candidateCount)],
    ['In filtered set', record.inFilteredSet ? 'yes' : 'no'],
  ];
  for (const [term, value] of rows) {
    const dt = create(doc, 'dt');
    dt.textContent = term;
    const dd = create(doc, 'dd');
    dd.textContent = value;
    list.append(dt, dd);
  }
  block.replaceChildren(heading, list);
}

function summaryText(model) {
  const queue = model.queueCounts ?? {};
  return [
    `${model.targetCount} line keys`,
    `${model.componentCount} components`,
    `${model.filteredRowCount} in current view`,
    `Missing ${queue.MISSING ?? 0}`,
    `Ambiguous ${queue.AMBIGUOUS ?? 0}`,
    `Conflicting ${queue.CONFLICTING ?? 0}`,
    `Stale ${queue.STALE ?? 0}`,
  ].join(' | ');
}

function header(doc, viewport, renderCallback) {
  const block = create(doc, 'header', 'lfea-preflight-phase1__header');
  const title = create(doc, 'h3');
  title.textContent = 'Source Enrichment Pre-Flight';
  const summary = create(doc, 'p', 'lfea-preflight-phase1__summary');
  summary.dataset.role = 'lfea-preflight-summary';
  summary.textContent = viewport === null ? 'No source model.' : '';
  const note = create(doc, 'p', 'lfea-preflight-phase1__note');
  note.textContent = 'Read-only review. Values are shown only where the source or an exactly resolved '
    + 'master row supplies them; ambiguous, conflicting and missing evidence stays blocked and is never '
    + 'filled from a candidate.';
  block.append(title, summary, note);
  if (viewport === null && typeof renderCallback === 'function') {
    const refresh = create(doc, 'button', 'lfea-preflight-phase1__refresh');
    refresh.type = 'button';
    refresh.dataset.role = 'lfea-preflight-refresh';
    refresh.textContent = 'Reload source and master data';
    refresh.addEventListener('click', () => renderCallback());
    block.append(refresh);
  }
  block.summary = summary;
  return block;
}

function blockedNotice(doc, message) {
  const notice = create(doc, 'p', 'lfea-preflight-phase1__blocked');
  notice.dataset.role = 'lfea-preflight-blocked';
  notice.setAttribute('role', 'status');
  notice.textContent = message;
  return notice;
}

function normalizedLineRows() {
  const master = masterDataController.getMasterData()?.lineList?.normalizedRows;
  if (Array.isArray(master) && master.length) return master;
  const legacy = masterDataController.getLegacyContext()?.lineRows;
  return Array.isArray(legacy) ? legacy : [];
}

function queueButton(doc, queueId, label, onClick) {
  const button = create(doc, 'button', 'lfea-preflight-phase1__queue');
  button.type = 'button';
  button.dataset.queueId = queueId ?? '';
  button.setAttribute('aria-pressed', 'false');
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function labelledSelect(doc, toolbar, labelText, options, onChange) {
  const label = create(doc, 'label', 'lfea-preflight-phase1__control');
  label.append(doc.createTextNode(`${labelText} `));
  const select = create(doc, 'select');
  for (const option of options) {
    const node = create(doc, 'option');
    node.value = option.value;
    node.textContent = option.label;
    select.append(node);
  }
  select.addEventListener('change', onChange);
  label.append(select);
  toolbar.append(label);
  return select;
}

function facetSelect(doc, toolbar, labelText, allLabel, options, onChange) {
  return labelledSelect(doc, toolbar, labelText, [{ value: '', label: allLabel }, ...options], onChange);
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function create(doc, tagName, className) {
  const element = doc.createElement(tagName);
  if (className) element.className = className;
  return element;
}

/**
 * Mount the pre-flight review surface on a stable application root.
 *
 * @param {Element} applicationRoot Application root containing the host.
 * @param {{getModel?:Function,selector?:string}} options Explicit model source.
 * @returns {{render:Function,getProjection:Function,destroy:Function}} Handle.
 */
export function mountLfeaPreflightUi(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Preflight UI requires the application root.');
  }
  const selector = options.selector ?? '[data-role="lfea-preflight-root"]';
  const host = applicationRoot.querySelector(selector);
  if (!host) throw new TypeError(`Preflight UI could not find ${selector}.`);
  const getModel = typeof options.getModel === 'function' ? options.getModel : () => null;
  let projection = null;
  const handle = {
    render() {
      const surface = createSurface(host, getModel(), () => handle.render());
      projection = surface.projection;
      return handle;
    },
    getProjection() {
      return projection;
    },
    destroy() {
      projection = null;
      host.replaceChildren();
    },
  };
  return handle.render();
}
