import './lfea-preflight-phase1.css';
import { masterDataController } from './master-data-controller.js';
import { renderProjectDataView } from './project-data/project-data-view.js';
import {
  LFEA_PREFLIGHT_COLUMN_PRESETS,
  LFEA_PREFLIGHT_EXCEPTION_QUEUE,
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
  setLfeaPreflightPhase1ComponentStart,
  setLfeaPreflightPhase1Filter,
  setLfeaPreflightPhase1Queue,
  setLfeaPreflightPhase1Scroll,
  setLfeaPreflightPhase1Sort,
} from './lfea-preflight-phase1-viewport.js';
import { mountLfeaPreflightPhase1ReviewSurface } from './lfea-preflight-phase1-review-surface.js';

export {
  PREFLIGHT_MATCH_STATUS,
  buildNormalizedKeyBuckets,
  deriveWallThicknessFromDtxr,
  projectPreflightModel,
  resolveLineKeyCandidates,
} from './lfea-preflight-resolution.js';

const ROW_HEIGHT = 32;
const COLUMN_WIDTH = 180;
const VIEWPORT_HEIGHT = 420;
const VIEWPORT_WIDTH = 900;
const IDENTITY_WIDTH = 320;
const QUEUES = Object.freeze(Object.values(LFEA_PREFLIGHT_EXCEPTION_QUEUE));
const SORTS = Object.freeze(['TARGET_ID_ASC', 'LINE_KEY_ASC', 'SERVICE_ASC', 'READINESS_ASC']);

export function renderProjectConfiguration(container, renderCallback) {
  renderProjectDataView(container, renderCallback);
}

/**
 * Compatibility one-shot renderer. The mounted application uses
 * mountLfeaPreflightUi so review-session identity survives viewport recycling.
 */
export function renderPreflightGrid(container, model) {
  if (!container || typeof container.replaceChildren !== 'function') {
    throw new TypeError('Preflight grid requires a DOM host.');
  }
  const documentRef = container.ownerDocument ?? document;
  const source = createLfeaPreflightPhase1ReviewSource(model, normalizedLineRows());
  const shell = createShell(documentRef);
  container.replaceChildren(shell.root);
  if (source.blocked) {
    renderBlocked(shell, source.reason ?? source.projection?.blocked ?? 'No active shared model is loaded.');
    return source.projection;
  }
  const viewport = createLfeaPreflightPhase1Viewport(source, {
    providers: LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
    viewportHeight: VIEWPORT_HEIGHT,
    viewportWidth: VIEWPORT_WIDTH,
    rowHeight: ROW_HEIGHT,
    columnWidth: COLUMN_WIDTH,
  });
  renderViewport(documentRef, shell, viewport, () => {});
  return source.projection;
}

/**
 * Mount the indexed Phase-1 review surface behind the existing application API.
 * Source/master data stay read-only; grouping/filtering/counts/selection are
 * index operations and rendered rows/cells are bounded to the viewport.
 */
export function mountLfeaPreflightUi(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Preflight UI requires the application root.');
  }
  const selector = options.selector ?? '[data-role="lfea-preflight-root"]';
  const host = applicationRoot.querySelector(selector);
  if (!host) throw new TypeError(`Preflight UI could not find ${selector}.`);
  const documentRef = options.documentRef ?? host.ownerDocument ?? document;
  const getModel = typeof options.getModel === 'function' ? options.getModel : () => null;

  let source = null;
  let viewport = null;
  let viewportModel = null;
  let shell = null;
  let phase1ReviewSurfaceHandle = null;
  let destroyed = false;

  const handle = Object.freeze({
    render() {
      if (destroyed) return handle;
      phase1ReviewSurfaceHandle?.destroy();
      source = createLfeaPreflightPhase1ReviewSource(getModel(), normalizedLineRows());
      shell = createShell(documentRef);
      host.replaceChildren(shell.root);
      if (source.blocked) {
        viewport = null;
        viewportModel = null;
        renderBlocked(shell, source.reason ?? source.projection?.blocked ?? 'No active shared model is loaded.');
      } else {
        viewport = createLfeaPreflightPhase1Viewport(source, {
          providers: LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS,
          viewportHeight: VIEWPORT_HEIGHT,
          viewportWidth: VIEWPORT_WIDTH,
          rowHeight: ROW_HEIGHT,
          rowOverscan: 4,
          columnWidth: COLUMN_WIDTH,
          columnOverscan: 2,
          componentViewportRows: 8,
          presetId: 'REVIEW',
        });
        wireControls(shell, source, viewport, refreshViewport);
        refreshViewport();
      }
      phase1ReviewSurfaceHandle = mountLfeaPreflightPhase1ReviewSurface(shell.reviewHost, {
        documentRef,
        getSource: () => source,
        getViewportModel: () => viewportModel,
        nowUtc: () => new Date().toISOString(),
      });
      phase1ReviewSurfaceHandle.refresh();
      return handle;
    },
    getProjection() {
      return source?.projection ?? null;
    },
    getReviewSource() {
      return source;
    },
    getViewportModel() {
      return viewportModel;
    },
    getReviewSessionSnapshot() {
      return phase1ReviewSurfaceHandle?.getSessionSnapshot() ?? null;
    },
    destroy() {
      destroyed = true;
      phase1ReviewSurfaceHandle?.destroy();
      phase1ReviewSurfaceHandle = null;
      source = null;
      viewport = null;
      viewportModel = null;
      host.replaceChildren();
    },
  });

  function refreshViewport() {
    if (!viewport || !shell) return;
    viewportModel = renderViewport(documentRef, shell, viewport, refreshViewport);
    renderControls(shell, source, viewportModel);
    phase1ReviewSurfaceHandle?.refresh();
  }

  return handle.render();
}

function normalizedLineRows() {
  const master = masterDataController.getMasterData()?.lineList?.normalizedRows;
  if (Array.isArray(master) && master.length) return master;
  const legacy = masterDataController.getLegacyContext()?.lineRows;
  return Array.isArray(legacy) ? legacy : [];
}

function createShell(doc) {
  const root = el(doc, 'section', 'lfea-phase1-review');
  root.dataset.role = 'lfea-preflight-grid';
  root.dataset.phase = '1';

  const header = el(doc, 'header', 'lfea-phase1-review__header');
  const title = textEl(doc, 'h3', 'Source Enrichment Review — Phase 1');
  const summary = textEl(doc, 'p', 'No source model.');
  summary.className = 'lfea-phase1-review__summary';
  const note = textEl(
    doc,
    'p',
    'Read-only indexed review. Blocked values remain null; proposals and review events are evidence only and do not mutate source or master data.',
  );
  note.className = 'lfea-phase1-review__note';
  header.append(title, summary, note);

  const queueBar = el(doc, 'div', 'lfea-phase1-review__queues');
  const toolbar = el(doc, 'div', 'lfea-phase1-review__toolbar');
  const service = select(doc, 'Service facet');
  service.dataset.role = 'lfea-phase1-service-filter';
  const rating = select(doc, 'Rating facet');
  rating.dataset.role = 'lfea-phase1-rating-filter';
  const preset = select(doc, 'Column preset');
  preset.dataset.role = 'lfea-phase1-column-preset';
  for (const name of Object.keys(LFEA_PREFLIGHT_COLUMN_PRESETS)) addOption(doc, preset, name, name);
  preset.value = 'REVIEW';
  const sort = select(doc, 'Sort');
  sort.dataset.role = 'lfea-phase1-sort';
  for (const name of SORTS) addOption(doc, sort, name, name.replaceAll('_', ' '));
  toolbar.append(service, rating, preset, sort);

  const gridHost = el(doc, 'div');
  gridHost.dataset.role = 'lfea-phase1-grid-host';
  const components = el(doc, 'section', 'lfea-phase1-review__components');
  components.dataset.role = 'lfea-phase1-components';
  const reviewHost = el(doc, 'div');
  reviewHost.dataset.role = 'lfea-phase1-review-host';
  root.append(header, queueBar, toolbar, gridHost, components, reviewHost);
  return { root, summary, queueBar, toolbar, service, rating, preset, sort, gridHost, components, reviewHost };
}

function renderBlocked(shell, reason) {
  shell.root.dataset.blocked = 'true';
  shell.summary.textContent = 'Source review blocked.';
  shell.queueBar.replaceChildren();
  shell.toolbar.hidden = true;
  shell.gridHost.replaceChildren(textEl(shell.gridHost.ownerDocument, 'p', reason));
  shell.gridHost.firstChild.className = 'lfea-phase1-review__blocked';
  shell.components.replaceChildren();
}

function wireControls(shell, source, viewport, refresh) {
  shell.root.dataset.blocked = 'false';
  shell.toolbar.hidden = false;
  populateFacet(shell.service, source.lineIndex.facetValues.service);
  populateFacet(shell.rating, source.lineIndex.facetValues.rating);

  shell.service.addEventListener('change', () => {
    applyFacetFilter(shell, viewport);
    refresh();
  });
  shell.rating.addEventListener('change', () => {
    applyFacetFilter(shell, viewport);
    refresh();
  });
  shell.preset.addEventListener('change', () => {
    setLfeaPreflightPhase1ColumnPreset(viewport, shell.preset.value);
    refresh();
  });
  shell.sort.addEventListener('change', () => {
    setLfeaPreflightPhase1Sort(viewport, shell.sort.value);
    refresh();
  });
}

function renderControls(shell, source, model) {
  shell.summary.textContent = [
    `${source.targetCount} indexed line targets`,
    `${source.componentCount} indexed components`,
    `${model.filteredRowCount} in current review set`,
    `${model.liveLineRowCount} live rows`,
    `${model.visibleColumns.length} live / 40 engineering columns`,
    `schema ${source.columnSchemaHash}`,
  ].join(' | ');

  const doc = shell.queueBar.ownerDocument;
  const fragment = doc.createDocumentFragment();
  const all = button(doc, `All · ${source.targetCount}`);
  all.className = 'lfea-phase1-review__queue';
  all.dataset.queueId = '';
  all.setAttribute('aria-pressed', model.queueId === null ? 'true' : 'false');
  all.addEventListener('click', () => {
    const viewportHandle = currentViewport(shell);
    if (!viewportHandle) return;
    setLfeaPreflightPhase1Queue(viewportHandle.viewport, null);
    viewportHandle.refresh();
  });
  fragment.append(all);
  for (const queueId of QUEUES) {
    const control = button(doc, `${titleCase(queueId)} · ${model.queueCounts[queueId] ?? 0}`);
    control.className = 'lfea-phase1-review__queue';
    control.dataset.queueId = queueId;
    control.dataset.count = String(model.queueCounts[queueId] ?? 0);
    control.setAttribute('aria-pressed', model.queueId === queueId ? 'true' : 'false');
    control.addEventListener('click', () => {
      const viewportHandle = currentViewport(shell);
      if (!viewportHandle) return;
      setLfeaPreflightPhase1Queue(viewportHandle.viewport, queueId);
      viewportHandle.refresh();
    });
    fragment.append(control);
  }
  shell.queueBar.replaceChildren(fragment);
}

function renderViewport(doc, shell, viewport, refresh) {
  const model = getLfeaPreflightPhase1ViewportModel(viewport);
  shell.gridHost.dataset.viewportDigest = model.structuralDigest;
  shell.gridHost.dataset.liveRows = String(model.liveLineRowCount);
  shell.gridHost.dataset.liveColumns = String(model.visibleColumns.length);

  const scroller = el(doc, 'div', 'lfea-phase1-review__scroller');
  scroller.dataset.role = 'lfea-phase1-virtual-scroller';
  scroller.tabIndex = 0;
  scroller.scrollTop = model.rowWindow.start * ROW_HEIGHT;
  scroller.scrollLeft = model.columnWindow.start * COLUMN_WIDTH;
  scroller.addEventListener('scroll', () => {
    setLfeaPreflightPhase1Scroll(viewport, {
      top: scroller.scrollTop,
      left: scroller.scrollLeft,
    });
    refresh();
  });
  scroller.addEventListener('keydown', (event) => {
    const delta = keyboardDelta(event.key);
    if (!delta) return;
    event.preventDefault();
    moveLfeaPreflightPhase1Selection(viewport, delta.row, delta.column);
    refresh();
  });

  const table = el(doc, 'table', 'lfea-phase1-review__table');
  table.style.width = `${IDENTITY_WIDTH + model.columnWindow.totalPx}px`;
  const head = el(doc, 'thead');
  const headRow = el(doc, 'tr');
  const identityHead = textEl(doc, 'th', 'Line / status');
  identityHead.className = 'lfea-phase1-review__identity';
  identityHead.scope = 'col';
  headRow.append(identityHead);
  appendHorizontalSpacer(doc, headRow, model.columnWindow.beforePx);
  for (const column of model.visibleColumns) {
    const th = textEl(doc, 'th', column.label);
    th.scope = 'col';
    th.dataset.fieldId = column.fieldId;
    th.style.width = `${COLUMN_WIDTH}px`;
    th.style.minWidth = `${COLUMN_WIDTH}px`;
    headRow.append(th);
  }
  appendHorizontalSpacer(doc, headRow, model.columnWindow.afterPx);
  head.append(headRow);

  const body = el(doc, 'tbody');
  appendVerticalSpacer(doc, body, model.rowWindow.beforePx, model.visibleColumns.length + 3);
  for (const row of model.visibleRows) body.append(renderLineRow(doc, row, model, viewport, refresh));
  appendVerticalSpacer(doc, body, model.rowWindow.afterPx, model.visibleColumns.length + 3);
  table.append(head, body);
  scroller.append(table);
  shell.gridHost.replaceChildren(scroller);
  renderComponents(doc, shell.components, model, viewport, refresh);
  shell._phase1Viewport = { viewport, refresh };
  return model;
}

function renderLineRow(doc, row, model, viewport, refresh) {
  const tr = el(doc, 'tr', 'lfea-phase1-review__row');
  tr.dataset.targetId = row.targetId;
  tr.dataset.selected = row.selected ? 'true' : 'false';
  const identity = el(doc, 'td', 'lfea-phase1-review__identity');
  const toggle = button(doc, `${row.expanded ? '▾' : '▸'} ${row.normalizedKey}`);
  toggle.className = 'lfea-phase1-review__toggle';
  toggle.setAttribute('aria-expanded', row.expanded ? 'true' : 'false');
  toggle.addEventListener('click', () => {
    expandLfeaPreflightPhase1Line(viewport, row.targetId);
    refresh();
  });
  const meta = textEl(doc, 'span', `${row.readiness} · ${row.service ?? '—'} / ${row.pipingClass ?? '—'} · ${row.itemCount} components`);
  meta.className = 'lfea-phase1-review__meta';
  identity.append(toggle, meta);
  tr.append(identity);
  appendHorizontalSpacer(doc, tr, model.columnWindow.beforePx);
  for (const cell of row.cells) {
    const td = el(doc, 'td');
    td.style.width = `${COLUMN_WIDTH}px`;
    td.style.minWidth = `${COLUMN_WIDTH}px`;
    const control = button(doc, formatCell(cell));
    control.className = 'lfea-phase1-review__cell';
    control.dataset.fieldId = cell.fieldId;
    control.dataset.status = cell.statusText;
    control.dataset.selected = model.selection?.targetId === row.targetId
      && model.selection.fieldOrdinal === cell.fieldOrdinal ? 'true' : 'false';
    control.title = `${cell.statusText} · ${cell.sourceKind} · ${cell.method}`;
    control.addEventListener('click', () => {
      selectLfeaPreflightPhase1Cell(viewport, row.targetId, cell.fieldOrdinal);
      refresh();
    });
    td.append(control);
    tr.append(td);
  }
  appendHorizontalSpacer(doc, tr, model.columnWindow.afterPx);
  return tr;
}

function renderComponents(doc, root, model, viewport, refresh) {
  const component = model.componentViewport;
  if (!component) {
    root.replaceChildren(
      textEl(doc, 'h4', 'Component viewport'),
      textEl(doc, 'p', 'Expand one line target to inspect its bounded component descendants.'),
    );
    return;
  }
  const title = textEl(doc, 'h4', `Components for ${component.lineTargetId}`);
  const status = textEl(
    doc,
    'p',
    `Showing ${component.start + 1}-${component.start + component.count} of ${component.totalComponentCount}; live component rows ${component.liveComponentRowCount}/${component.viewportRowUpperBound}.`,
  );
  const list = el(doc, 'ul', 'lfea-phase1-review__component-list');
  for (const row of component.rows) {
    list.append(textEl(doc, 'li', `${row.type} · ${row.name} · ${row.sourceEntityId} · ${row.provenancePath}`));
  }
  const controls = el(doc, 'div', 'lfea-phase1-review__toolbar');
  const previous = button(doc, 'Previous components');
  previous.className = 'lfea-phase1-review__button';
  previous.disabled = component.start === 0;
  previous.addEventListener('click', () => {
    setLfeaPreflightPhase1ComponentStart(viewport, Math.max(0, component.start - component.viewportRowUpperBound));
    refresh();
  });
  const next = button(doc, 'Next components');
  next.className = 'lfea-phase1-review__button';
  next.disabled = component.start + component.count >= component.totalComponentCount;
  next.addEventListener('click', () => {
    setLfeaPreflightPhase1ComponentStart(viewport, component.start + component.viewportRowUpperBound);
    refresh();
  });
  controls.append(previous, next);
  root.replaceChildren(title, status, list, controls);
}

function applyFacetFilter(shell, viewport) {
  const clauses = [];
  if (shell.service.value) clauses.push({ facetId: 'service', mode: 'OR', values: [shell.service.value] });
  if (shell.rating.value) clauses.push({ facetId: 'rating', mode: 'OR', values: [shell.rating.value] });
  setLfeaPreflightPhase1Filter(viewport, { combine: 'AND', clauses });
}

function populateFacet(control, values) {
  const doc = control.ownerDocument;
  const current = control.value;
  control.replaceChildren();
  addOption(doc, control, '', control.dataset.role?.includes('service') ? 'All services' : 'All ratings');
  for (const value of values) addOption(doc, control, value, value);
  control.value = values.includes(current) ? current : '';
}

function appendHorizontalSpacer(doc, row, width) {
  if (width <= 0) return;
  const cell = el(doc, row.tagName === 'TR' && row.parentNode?.tagName === 'THEAD' ? 'th' : 'td', 'lfea-phase1-review__spacer');
  cell.style.width = `${width}px`;
  cell.style.minWidth = `${width}px`;
  cell.setAttribute('aria-hidden', 'true');
  row.append(cell);
}

function appendVerticalSpacer(doc, body, height, colSpan) {
  if (height <= 0) return;
  const row = el(doc, 'tr');
  row.setAttribute('aria-hidden', 'true');
  const cell = el(doc, 'td', 'lfea-phase1-review__spacer');
  cell.colSpan = colSpan;
  cell.style.height = `${height}px`;
  row.append(cell);
  body.append(row);
}

function currentViewport(shell) {
  return shell._phase1Viewport ?? null;
}

function keyboardDelta(key) {
  if (key === 'ArrowUp') return { row: -1, column: 0 };
  if (key === 'ArrowDown') return { row: 1, column: 0 };
  if (key === 'ArrowLeft') return { row: 0, column: -1 };
  if (key === 'ArrowRight') return { row: 0, column: 1 };
  return null;
}

function formatCell(cell) {
  if (cell.value === null || cell.value === undefined || cell.value === '') return cell.statusText;
  return typeof cell.value === 'object' ? JSON.stringify(cell.value) : String(cell.value);
}

function select(doc, ariaLabel) {
  const node = el(doc, 'select', 'lfea-phase1-review__control');
  node.setAttribute('aria-label', ariaLabel);
  return node;
}

function addOption(doc, selectNode, value, label) {
  const option = el(doc, 'option');
  option.value = String(value);
  option.textContent = String(label);
  selectNode.append(option);
}

function button(doc, label) {
  const node = textEl(doc, 'button', label);
  node.type = 'button';
  return node;
}

function textEl(doc, tagName, text) {
  const node = el(doc, tagName);
  node.textContent = String(text);
  return node;
}

function el(doc, tagName, className) {
  const node = doc.createElement(tagName);
  if (className) node.className = className;
  return node;
}

function titleCase(value) {
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/^./u, (char) => char.toUpperCase());
}
