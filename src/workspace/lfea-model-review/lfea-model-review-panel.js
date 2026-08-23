import { buildLfeaModelReview, LFEA_MODEL_REVIEW_SCHEMA } from './lfea-model-review.js';
import {
  buildLfeaGeometryReview,
  LFEA_GEOMETRY_REVIEW_REPRESENTATIONS,
} from './lfea-geometry-review.js';
import {
  renderLfeaGeometryReviewSvg,
  LFEA_GEOMETRY_VERTICAL_AXES,
  LFEA_GEOMETRY_DEFAULT_VIEW_BOX,
  LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR,
  zoomLfeaGeometryViewBox,
} from './lfea-geometry-review-svg.js';
import { createLfeaReviewRowWindow, LFEA_MODEL_REVIEW_PAGE_SIZE } from './lfea-review-row-window.js';

export const LFEA_MODEL_REVIEW_PANEL_SCHEMA = 'lfea-model-review-panel/v1';
const VIEWS = Object.freeze(['GEOMETRY', 'ELEMENTS', 'RESTRAINTS', 'LOADS', 'TRANSFORMATIONS']);
const TABLE_VIEWS = Object.freeze(VIEWS.filter((view) => view !== 'GEOMETRY'));
let panelSequence = 0;

export function mountLfeaModelReviewPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('LFEA Model Review requires a host element.');
  }
  if (typeof options.getPreFlight !== 'function') {
    throw new TypeError('LFEA Model Review requires options.getPreFlight.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaModelReviewPanelController(hostElement, documentRef, options).init();
}

export class LfeaModelReviewPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.preFlight = null;
    this.engineeringState = null;
    this.model = buildLfeaModelReview(null);
    this.activeView = 'GEOMETRY';
    this.geometryRepresentation = 'SOURCE';
    this.verticalAxis = 'Y';
    this.geometryViewBox = null;
    this.pageIndexByView = Object.fromEntries(TABLE_VIEWS.map((view) => [view, 0]));
    this.onRefreshRequested = () => this.refresh();
  }

  init() {
    if (this.elements) return this;
    this.elements = createElements(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.hostElement.addEventListener?.('lfea-source-presentation-refresh', this.onRefreshRequested);
    for (const button of this.elements.tabs) {
      button.addEventListener('click', () => this.setActiveView(button.dataset.view));
      button.addEventListener('keydown', (event) => this.onTabKeydown(event, button.dataset.view));
    }
    this.refresh();
    return this;
  }

  refresh() {
    this.preFlight = this.options.getPreFlight();
    this.engineeringState = this.options.getEngineeringSessionState?.()
      ?? globalThis.AnalysisWorkspace?.getLfeaEngineeringSessionState?.()
      ?? null;
    this.model = buildLfeaModelReview(this.preFlight);
    this.render();
    return this;
  }

  setActiveView(view) {
    if (!VIEWS.includes(view)) throw new TypeError(`Unknown LFEA Model Review view ${String(view)}.`);
    this.activeView = view;
    this.render();
    return this.getSnapshot();
  }

  onTabKeydown(event, currentView) {
    const currentIndex = VIEWS.indexOf(currentView);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % VIEWS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + VIEWS.length) % VIEWS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = VIEWS.length - 1;
    else return;
    event.preventDefault();
    this.setActiveView(VIEWS[nextIndex]);
    this.elements.tabs[nextIndex]?.focus();
  }

  setGeometryRepresentation(representation) {
    if (!LFEA_GEOMETRY_REVIEW_REPRESENTATIONS.includes(representation)) {
      throw new TypeError(`Unknown LFEA geometry representation ${String(representation)}.`);
    }
    this.geometryRepresentation = representation;
    this.render();
    return this.getSnapshot();
  }

  setVerticalAxis(axis) {
    if (!LFEA_GEOMETRY_VERTICAL_AXES.includes(axis)) {
      throw new TypeError(`Unknown LFEA geometry vertical axis ${String(axis)}.`);
    }
    this.verticalAxis = axis;
    this.render();
    return this.getSnapshot();
  }

  zoomGeometry(factor) {
    this.geometryViewBox = zoomLfeaGeometryViewBox(this.geometryViewBox ?? LFEA_GEOMETRY_DEFAULT_VIEW_BOX, factor);
    this.render();
    return this.getSnapshot();
  }

  resetGeometryView() {
    this.geometryViewBox = null;
    this.render();
    return this.getSnapshot();
  }

  setReviewPage(view, requestedPageIndex) {
    if (!TABLE_VIEWS.includes(view)) throw new TypeError(`LFEA Model Review view ${String(view)} is not pageable.`);
    this.pageIndexByView[view] = requestedPageIndex;
    this.render();
    return this.getSnapshot();
  }

  render() {
    const { section, tabs, body, summary } = this.elements;
    section.dataset.modelReviewState = this.model.empty ? 'EMPTY' : 'READY';
    section.dataset.activeView = this.activeView;
    const activeTabId = `${this.elements.idPrefix}-tab-${this.activeView.toLowerCase()}`;
    for (const button of tabs) {
      const active = button.dataset.view === this.activeView;
      button.dataset.active = active ? 'true' : 'false';
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    }
    body.setAttribute('aria-labelledby', activeTabId);
    body.dataset.activeView = this.activeView;
    body.replaceChildren();
    if (this.model.empty) {
      summary.textContent = 'Load a model to review engineering entities and their source→analysis custody.';
      body.append(paragraph(this.documentRef, 'No prepared model is available.'));
      return;
    }
    summary.textContent = `Elements ${this.model.counts.elements} · Restraints ${this.model.counts.restraints} · Loads ${this.model.counts.loads} · Declared transformations ${this.model.counts.declaredApproximations}`;
    body.append(this.activeView === 'GEOMETRY'
      ? this.geometryView()
      : this.activeView === 'ELEMENTS'
        ? this.tableView('ELEMENTS', this.model.elements, elementsTable)
        : this.activeView === 'RESTRAINTS'
          ? this.tableView('RESTRAINTS', this.model.restraints, restraintsTable)
          : this.activeView === 'LOADS'
            ? this.tableView('LOADS', this.model.loads, loadsTable)
            : this.tableView('TRANSFORMATIONS', this.model.transformationLedger, transformationsTable));
    const note = paragraph(this.documentRef,
      'Read-only evidence view. Source, canonical and analysis identifiers are shown separately; no representation is edited or re-derived here.');
    note.dataset.role = 'lfea-model-review-readonly-note';
    body.append(note);
  }

  tableView(view, rows, renderer) {
    const window = createLfeaReviewRowWindow(rows, this.pageIndexByView[view]);
    this.pageIndexByView[view] = window.pageIndex;
    const wrapper = this.documentRef.createElement('section');
    wrapper.dataset.role = 'lfea-model-review-table-view';
    wrapper.dataset.view = view;
    wrapper.dataset.totalRows = String(window.totalRows);
    wrapper.dataset.visibleRows = String(window.rows.length);
    wrapper.append(renderer(this.documentRef, window.rows));
    if (window.pageCount > 1) wrapper.append(this.pageControls(view, window));
    return wrapper;
  }

  pageControls(view, window) {
    const controls = this.documentRef.createElement('div');
    controls.className = 'lfea-model-review__pager';
    controls.dataset.role = 'lfea-model-review-pager';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `${view.toLowerCase()} review pages`);
    const previous = this.documentRef.createElement('button');
    previous.type = 'button';
    previous.textContent = 'Previous';
    previous.disabled = window.pageIndex === 0;
    previous.addEventListener('click', () => this.setReviewPage(view, window.pageIndex - 1));
    const state = paragraph(this.documentRef,
      `Rows ${window.startRow}–${window.endRow} of ${window.totalRows} · Page ${window.pageIndex + 1} of ${window.pageCount}`);
    state.setAttribute('aria-live', 'polite');
    const next = this.documentRef.createElement('button');
    next.type = 'button';
    next.textContent = 'Next';
    next.disabled = window.pageIndex >= window.pageCount - 1;
    next.addEventListener('click', () => this.setReviewPage(view, window.pageIndex + 1));
    controls.append(previous, state, next);
    return controls;
  }

  geometryView() {
    const review = buildLfeaGeometryReview(this.preFlight, this.engineeringState, this.geometryRepresentation);
    const wrapper = this.documentRef.createElement('section');
    wrapper.className = 'lfea-geometry-review';
    wrapper.dataset.role = 'lfea-geometry-review';
    wrapper.dataset.representation = review.selectedRepresentation;

    const controls = this.documentRef.createElement('div');
    controls.className = 'lfea-geometry-review__controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Geometry representation');
    for (const representation of LFEA_GEOMETRY_REVIEW_REPRESENTATIONS) {
      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.dataset.action = 'lfea-geometry-representation';
      button.dataset.representation = representation;
      const active = representation === review.selectedRepresentation;
      button.dataset.active = active ? 'true' : 'false';
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.textContent = representation === 'SOURCE' ? 'Imported / Source' : 'Analysis';
      button.addEventListener('click', () => this.setGeometryRepresentation(representation));
      controls.append(button);
    }

    const axisControls = this.documentRef.createElement('div');
    axisControls.className = 'lfea-geometry-review__controls';
    axisControls.setAttribute('role', 'group');
    axisControls.setAttribute('aria-label', 'Vertical axis');
    const axisLabel = this.documentRef.createElement('span');
    axisLabel.className = 'lfea-geometry-review__controls-label';
    axisLabel.textContent = 'Vertical axis';
    axisControls.append(axisLabel);
    for (const axis of LFEA_GEOMETRY_VERTICAL_AXES) {
      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.dataset.action = 'lfea-geometry-vertical-axis';
      button.dataset.axis = axis;
      const active = axis === this.verticalAxis;
      button.dataset.active = active ? 'true' : 'false';
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.textContent = axis === 'Y' ? 'Y (CAESAR)' : 'Z';
      button.addEventListener('click', () => this.setVerticalAxis(axis));
      axisControls.append(button);
    }

    const viewControls = this.documentRef.createElement('div');
    viewControls.className = 'lfea-geometry-review__controls';
    viewControls.setAttribute('role', 'group');
    viewControls.setAttribute('aria-label', 'Zoom and pan');
    const zoomOut = this.documentRef.createElement('button');
    zoomOut.type = 'button';
    zoomOut.dataset.action = 'lfea-geometry-zoom-out';
    zoomOut.textContent = 'Zoom out';
    zoomOut.addEventListener('click', () => this.zoomGeometry(LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR));
    const zoomIn = this.documentRef.createElement('button');
    zoomIn.type = 'button';
    zoomIn.dataset.action = 'lfea-geometry-zoom-in';
    zoomIn.textContent = 'Zoom in';
    zoomIn.addEventListener('click', () => this.zoomGeometry(1 / LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR));
    const resetView = this.documentRef.createElement('button');
    resetView.type = 'button';
    resetView.dataset.action = 'lfea-geometry-reset-view';
    resetView.textContent = 'Fit all';
    resetView.addEventListener('click', () => this.resetGeometryView());
    viewControls.append(zoomOut, zoomIn, resetView);

    const identity = paragraph(this.documentRef, `${review.selected.label} · ${review.selected.authority}`);
    identity.dataset.role = 'lfea-geometry-review-identity';
    identity.dataset.objectPath = review.selected.objectPath;
    identity.dataset.available = review.selected.available ? 'true' : 'false';

    const svgHost = this.documentRef.createElement('div');
    svgHost.className = 'lfea-geometry-review__svg';
    svgHost.dataset.role = 'lfea-geometry-review-svg-host';
    renderLfeaGeometryReviewSvg(svgHost, review.selected, {
      verticalAxis: this.verticalAxis,
      viewBox: this.geometryViewBox ?? undefined,
      onViewBoxChange: (viewBox) => { this.geometryViewBox = viewBox; },
    });

    const custody = paragraph(this.documentRef,
      `Object: ${review.selected.objectPath} · semantic: ${review.selected.semanticHash ?? 'not retained'} · evidence: ${review.selected.evidenceHash ?? 'not retained'}`);
    custody.className = 'lfea-geometry-review__custody';
    custody.dataset.role = 'lfea-geometry-review-custody';
    const viewHint = paragraph(this.documentRef, 'Scroll to zoom, drag to pan.');
    viewHint.className = 'lfea-geometry-review__view-hint';
    wrapper.append(controls, axisControls, viewControls, identity, svgHost, viewHint, custody);
    return wrapper;
  }

  getSnapshot() {
    const geometryReview = buildLfeaGeometryReview(this.preFlight, this.engineeringState, this.geometryRepresentation);
    const activeRows = this.activeView === 'ELEMENTS' ? this.model.elements
      : this.activeView === 'RESTRAINTS' ? this.model.restraints
        : this.activeView === 'LOADS' ? this.model.loads
          : this.activeView === 'TRANSFORMATIONS' ? this.model.transformationLedger : [];
    const activeWindow = this.activeView === 'GEOMETRY'
      ? null
      : createLfeaReviewRowWindow(activeRows, this.pageIndexByView[this.activeView]);
    return Object.freeze({
      schema: LFEA_MODEL_REVIEW_PANEL_SCHEMA,
      modelSchema: LFEA_MODEL_REVIEW_SCHEMA,
      activeView: this.activeView,
      geometryRepresentation: this.geometryRepresentation,
      verticalAxis: this.verticalAxis,
      geometryAvailable: geometryReview.selected.available,
      counts: this.model.counts,
      elementCount: this.model.counts.elements,
      nodeCount: this.model.empty ? 0 : new Set(this.model.elements.flatMap((row) => [row.fromNodeId, row.toNodeId])).size,
      editable: false,
      preparationSemanticHash: this.model.preparationSemanticHash,
      pageSize: LFEA_MODEL_REVIEW_PAGE_SIZE,
      activePageIndex: activeWindow?.pageIndex ?? null,
      visibleRowCount: activeWindow?.rows.length ?? null,
    });
  }

  destroy() {
    this.hostElement.removeEventListener?.('lfea-source-presentation-refresh', this.onRefreshRequested);
    this.elements?.section.remove();
    this.elements = null;
  }
}

function createElements(doc) {
  const idPrefix = `lfea-model-review-${++panelSequence}`;
  const section = doc.createElement('section');
  section.className = 'lfea-model-review';
  section.dataset.role = 'lfea-model-review-panel';
  const header = doc.createElement('div');
  header.className = 'lfea-model-review__header';
  const title = doc.createElement('h3');
  title.textContent = 'Model Review';
  const summary = doc.createElement('p');
  summary.dataset.role = 'lfea-model-review-summary';
  header.append(title, summary);
  const tablist = doc.createElement('div');
  tablist.className = 'lfea-model-review__tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Model Review views');
  tablist.setAttribute('aria-orientation', 'horizontal');
  const labels = { GEOMETRY: 'Geometry', ELEMENTS: 'Elements', RESTRAINTS: 'Restraints', LOADS: 'Loads', TRANSFORMATIONS: 'Transformation ledger' };
  const tabs = VIEWS.map((view) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.id = `${idPrefix}-tab-${view.toLowerCase()}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `${idPrefix}-tabpanel`);
    button.dataset.action = 'lfea-model-review-view';
    button.dataset.view = view;
    button.textContent = labels[view];
    tablist.append(button);
    return button;
  });
  const body = doc.createElement('div');
  body.id = `${idPrefix}-tabpanel`;
  body.className = 'lfea-model-review__body';
  body.dataset.role = 'lfea-model-review-body';
  body.setAttribute('role', 'tabpanel');
  body.setAttribute('tabindex', '0');
  section.append(header, tablist, body);
  return { section, summary, tabs, body, idPrefix };
}

function elementsTable(doc, rows) {
  return table(doc, [
    ['sourceIndex', '#'], ['sourceFeatureId', 'Source feature'], ['sourceType', 'Source type'],
    ['canonicalSegmentId', 'Canonical segment'], ['analysisElementId', 'Analysis element'],
    ['fromNodeId', 'From'], ['toNodeId', 'To'], ['analysisType', 'Analysis type'],
    ['outsideDiameterMm', 'OD [mm]'], ['wallThicknessMm', 'Wall [mm]'], ['material', 'Material'],
    ['representabilityDisposition', 'Disposition'], ['limitationCodes', 'Declared limitation'],
  ], rows, 'lfea-model-review-elements-table');
}

function restraintsTable(doc, rows) {
  return table(doc, [
    ['sourceFeatureId', 'Source restraint'], ['inventoryId', 'Inventory ID'], ['sourceNodeId', 'Source node'],
    ['canonicalNodeId', 'Canonical node'], ['analysisDeclarationIds', 'Analysis constraints'],
    ['targetDofs', 'DOFs'], ['implementation', 'Implementation'], ['unilateralAction', 'One-way action'],
    ['limitationCodes', 'Declared limitation'],
  ], rows, 'lfea-model-review-restraints-table');
}

function loadsTable(doc, rows) {
  return table(doc, [
    ['ledgerId', 'Load ledger ID'], ['sourceKind', 'Source load'], ['sourceFeatureId', 'Source feature'],
    ['canonicalSegmentId', 'Canonical segment'], ['analysisElementId', 'Analysis element'],
    ['primitiveIds', 'Analysis primitive'], ['caseIds', 'Cases'], ['disposition', 'Disposition'],
    ['limitationCodes', 'Declared limitation'], ['evidence', 'Evidence'],
  ], rows, 'lfea-model-review-loads-table');
}

function transformationsTable(doc, rows) {
  return table(doc, [
    ['entityClass', 'Entity'], ['sourceRef', 'Source representation'], ['canonicalRef', 'Canonical model'],
    ['analysisRefs', 'Analysis model'], ['disposition', 'Transformation'],
    ['limitationCodes', 'Declared limitation'], ['evidenceRefs', 'Evidence refs'],
  ], rows, 'lfea-model-review-transformations-table');
}

function table(doc, columns, rows, role) {
  const wrap = doc.createElement('div');
  wrap.className = 'lfea-model-review__scroll';
  const value = doc.createElement('table');
  value.dataset.role = role;
  const head = doc.createElement('tr');
  for (const [, label] of columns) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.append(th);
  }
  value.append(head);
  for (const row of rows) {
    const tr = doc.createElement('tr');
    for (const [key] of columns) {
      const td = doc.createElement('td');
      td.textContent = cell(row[key]);
      tr.append(td);
    }
    value.append(tr);
  }
  wrap.append(value);
  return wrap;
}

function cell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function paragraph(doc, text) {
  const value = doc.createElement('p');
  value.textContent = text;
  return value;
}
