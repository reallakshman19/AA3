import {
  LFEA_RESULTS_ALL_DOFS,
  LFEA_RESULTS_ROTATION_DOFS,
  extremeNodeIds,
  filterResultRows,
  nodeResultRows,
  sortResultRows,
  summarizeCaseResults,
} from './lfea-pipeline-results-view-model.js';
import { lfeaPipelineIcon } from './lfea-pipeline-icon-manifest.js';

export const LFEA_PIPELINE_RESULTS_PANEL_SCHEMA = 'lfea-pipeline-results-panel/v1';

/**
 * The Output step: nodal displacements, support loads and element end forces
 * for analyzed cases. Display conversion never re-derives engineering values.
 */
export function mountLfeaPipelineResultsPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('Results panel requires a host element.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaPipelineResultsPanelController(hostElement, documentRef, options).init();
}

export class LfeaPipelineResultsPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.elements = null;
    this.initialized = false;
    this.state = null;
    this.activeCaseId = null;
    this.activeView = 'DISPLACEMENTS';
    this.sortColumn = 'nodeId';
    this.sortDirection = 'ASC';
    this.nodeFilter = '';
  }

  init() {
    if (this.initialized) return this;
    this.elements = createResultsSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.initialized = true;
    this.render();
    return this;
  }

  setState(state) {
    this.state = state ?? null;
    const cases = this.state?.cases ?? [];
    if (!cases.some((row) => row.caseId === this.activeCaseId)) {
      this.activeCaseId = cases[0]?.caseId ?? null;
    }
    this.render();
    return this;
  }

  activeCase() {
    return (this.state?.cases ?? []).find((row) => row.caseId === this.activeCaseId) ?? null;
  }

  render() {
    const { section } = this.elements;
    section.replaceChildren(heading(this.documentRef, 'Results'));
    const cases = this.state?.cases ?? [];
    if (cases.length === 0) {
      section.append(emptyParagraph(this.documentRef, 'No analysis result is available yet. Complete Run first.'));
      return this;
    }
    section.append(this.caseTabs(cases));
    const active = this.activeCase();
    if (active === null) return this;
    section.append(this.caseStatus(active));
    if (active.unilateralSummary !== null) section.append(this.accuracyWarning(active));
    section.append(this.summaryStrip(active));
    section.append(this.viewTabs());
    section.append(this.tableControls());
    section.append(this.activeTable(active));
    return this;
  }

  summaryStrip(active) {
    const doc = this.documentRef;
    const summary = summarizeCaseResults(this.displacementRows(active), this.reactionRows(active));
    const strip = doc.createElement('dl');
    strip.className = 'lfea-pipeline-results__summary';
    strip.dataset.role = 'lfea-pipeline-results-summary';
    const tiles = [
      ['Nodes', String(summary.nodeCount), null],
      ['Restrained nodes', String(summary.restrainedNodeCount), null],
      ['Max displacement', summary.maxTranslation && `${formatNumber(summary.maxTranslation.magnitude)} mm`, summary.maxTranslation?.nodeId],
      ['Max rotation', summary.maxRotation && `${formatNumber(summary.maxRotation.magnitude)} deg`, summary.maxRotation?.nodeId],
      ['Max support force', summary.maxForce && `${formatNumber(summary.maxForce.magnitude)} N`, summary.maxForce?.nodeId],
      ['Max support moment', summary.maxMoment && `${formatNumber(summary.maxMoment.magnitude)} N·m`, summary.maxMoment?.nodeId],
    ];
    for (const [label, value, nodeId] of tiles) {
      if (value === null || value === undefined) continue;
      const dt = doc.createElement('dt');
      dt.textContent = label;
      const dd = doc.createElement('dd');
      dd.dataset.metric = label;
      dd.textContent = nodeId === null || nodeId === undefined ? value : `${value} @ node ${nodeId}`;
      strip.append(dt, dd);
    }
    return strip;
  }

  tableControls() {
    const doc = this.documentRef;
    const bar = doc.createElement('div');
    bar.className = 'lfea-pipeline-results__controls';
    bar.dataset.role = 'lfea-pipeline-results-controls';
    const label = doc.createElement('label');
    label.textContent = 'Filter by node ';
    const input = doc.createElement('input');
    input.type = 'search';
    input.dataset.role = 'lfea-pipeline-results-filter';
    input.value = this.nodeFilter;
    input.addEventListener('input', () => {
      this.nodeFilter = input.value;
      this.render();
      const refreshed = this.elements.section.querySelector('[data-role="lfea-pipeline-results-filter"]');
      if (refreshed) {
        refreshed.focus();
        refreshed.setSelectionRange(refreshed.value.length, refreshed.value.length);
      }
    });
    label.append(input);
    bar.append(label);
    return bar;
  }

  displacementRows(active) {
    return nodeResultRows(active.displacements, (dof) => (
      LFEA_RESULTS_ROTATION_DOFS.includes(dof) ? 180 / Math.PI : 1000
    ));
  }

  reactionRows(active) {
    return nodeResultRows(active.reactions, () => 1);
  }

  presentRows(rows) {
    return sortResultRows(filterResultRows(rows, this.nodeFilter), this.sortColumn, this.sortDirection);
  }

  sortBy(columnKey) {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = columnKey === 'nodeId' ? 'ASC' : 'DESC';
    }
    this.render();
  }

  caseTabs(cases) {
    const bar = this.documentRef.createElement('div');
    bar.className = 'lfea-pipeline-results__cases';
    bar.dataset.role = 'lfea-pipeline-results-cases';
    for (const row of cases) {
      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.textContent = caseLabel(row.caseId);
      button.dataset.caseId = row.caseId;
      button.dataset.active = String(row.caseId === this.activeCaseId);
      button.addEventListener('click', () => {
        this.activeCaseId = row.caseId;
        this.render();
      });
      bar.append(button);
    }
    return bar;
  }

  caseStatus(active) {
    const p = this.documentRef.createElement('p');
    p.dataset.role = 'lfea-pipeline-results-status';
    p.dataset.status = active.executionStatus;
    if (active.blockingChecks.length === 0) {
      p.textContent = `${caseLabel(active.caseId)} — solved (${active.executionStatus}).`;
      return p;
    }
    const named = active.blockingChecks
      .map((check) => `${check.checkId} = ${formatNumber(check.value)} against a limit of ${formatNumber(check.limit)}`)
      .join('; ');
    p.textContent = `${caseLabel(active.caseId)} — the solver did not qualify this case: ${named}. `
      + 'Displacements and support loads below are the real solved values; element end forces are withheld '
      + 'because recovery is refused for an unqualified case.';
    return p;
  }

  accuracyWarning(active) {
    const box = this.documentRef.createElement('p');
    box.className = 'lfea-pipeline-results__warning';
    box.dataset.role = 'lfea-pipeline-results-unilateral-warning';
    box.textContent = active.unilateralSummary;
    return box;
  }

  viewTabs() {
    const bar = this.documentRef.createElement('div');
    bar.className = 'lfea-pipeline-results__views';
    bar.dataset.role = 'lfea-pipeline-results-views';
    for (const [view, label] of [
      ['DISPLACEMENTS', 'Displacements'],
      ['REACTIONS', 'Support loads'],
      ['ELEMENT_FORCES', 'Element forces'],
    ]) {
      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.view = view;
      button.dataset.active = String(view === this.activeView);
      button.addEventListener('click', () => {
        this.activeView = view;
        this.render();
      });
      bar.append(button);
    }
    return bar;
  }

  activeTable(active) {
    if (this.activeView === 'DISPLACEMENTS') {
      return this.resultTable(this.displacementRows(active), [
        ['Node', 'nodeId'], ['DX [mm]', 'UX'], ['DY [mm]', 'UY'], ['DZ [mm]', 'UZ'],
        ['RX [deg]', 'RX'], ['RY [deg]', 'RY'], ['RZ [deg]', 'RZ'],
        ['|D| [mm]', 'translationResultant'],
      ], active);
    }
    if (this.activeView === 'REACTIONS') {
      return this.resultTable(this.reactionRows(active), [
        ['Node', 'nodeId'], ['FX [N]', 'UX'], ['FY [N]', 'UY'], ['FZ [N]', 'UZ'],
        ['MX [N·m]', 'RX'], ['MY [N·m]', 'RY'], ['MZ [N·m]', 'RZ'],
        ['|F| [N]', 'translationResultant'],
      ], active);
    }
    const recovered = this.recoveredActionsFor(active.caseId);
    if (recovered === null) {
      return emptyParagraph(this.documentRef, this.elementForceUnavailableReason(active));
    }
    return elementActionTable(this.documentRef, recovered);
  }

  resultTable(rows, columns, active) {
    const doc = this.documentRef;
    const extremes = extremeNodeIds(summarizeCaseResults(
      this.displacementRows(active),
      this.reactionRows(active),
    ));
    const presented = this.presentRows(rows);
    const table = doc.createElement('table');
    table.className = 'lfea-pipeline-results__table';
    table.dataset.role = 'lfea-pipeline-results-table';
    table.dataset.sortColumn = this.sortColumn;
    table.dataset.sortDirection = this.sortDirection;
    const head = doc.createElement('tr');
    for (const [label, columnKey] of columns) {
      const th = doc.createElement('th');
      th.scope = 'col';
      const button = doc.createElement('button');
      button.type = 'button';
      button.dataset.role = 'lfea-pipeline-results-sort';
      button.dataset.columnKey = columnKey;
      const isActiveSort = this.sortColumn === columnKey;
      const labelNode = doc.createElement('span');
      labelNode.textContent = label;
      button.append(labelNode);
      th.setAttribute('aria-sort', isActiveSort
        ? (this.sortDirection === 'ASC' ? 'ascending' : 'descending')
        : 'none');
      if (isActiveSort) {
        const icon = lfeaPipelineIcon(doc, this.sortDirection === 'ASC' ? 'icon-sort-asc' : 'icon-sort-desc');
        icon.setAttribute('width', '11');
        icon.setAttribute('height', '11');
        icon.setAttribute('aria-hidden', 'true');
        icon.style.marginInlineStart = '4px';
        button.append(icon);
        button.setAttribute('aria-label', `${label}, sorted ${this.sortDirection === 'ASC' ? 'ascending' : 'descending'}`);
      } else {
        button.setAttribute('aria-label', `${label}, activate to sort`);
      }
      button.addEventListener('click', () => this.sortBy(columnKey));
      th.append(button);
      head.append(th);
    }
    table.append(head);
    for (const row of presented) {
      const tr = doc.createElement('tr');
      tr.dataset.nodeId = row.nodeId;
      if (extremes.has(row.nodeId)) tr.dataset.extreme = 'true';
      for (const [, columnKey] of columns) {
        const td = doc.createElement('td');
        td.textContent = columnKey === 'nodeId'
          ? row.nodeId
          : formatNumber(columnKey === 'translationResultant'
            ? row.translationResultant
            : row.values[columnKey] ?? 0);
        tr.append(td);
      }
      table.append(tr);
    }
    if (presented.length === 0) {
      const tr = doc.createElement('tr');
      const td = doc.createElement('td');
      td.colSpan = columns.length;
      td.textContent = `No node matches "${this.nodeFilter}".`;
      tr.append(td);
      table.append(tr);
    }
    return scrollWrap(doc, table);
  }

  elementForceUnavailableReason(active) {
    if (active.blockingChecks.length > 0) {
      const named = active.blockingChecks.map((check) => check.checkId).join(', ');
      return `Element end forces are withheld for ${caseLabel(active.caseId)} because the solver did not `
        + `qualify it (${named}). Its displacements and support loads above are still the real solved values.`;
    }
    if (this.state?.recoveryRefusal) return this.state.recoveryRefusal;
    return 'Element end forces are not available for this run.';
  }

  recoveredActionsFor(caseId) {
    const recovery = this.state?.recovery ?? null;
    if (recovery === null) return null;
    const row = recovery.caseRecoveries.find((entry) => entry.caseId === caseId);
    return row?.recovery?.elementActions ?? null;
  }

  csvFor(active) {
    const csvRows = (rows) => this.presentRows(rows).map((row) => [
      row.nodeId,
      ...LFEA_RESULTS_ALL_DOFS.map((dof) => formatNumber(row.values[dof] ?? 0)),
      formatNumber(row.translationResultant),
    ]);
    if (this.activeView === 'REACTIONS') {
      return toCsv(['Node', 'FX_N', 'FY_N', 'FZ_N', 'MX_Nm', 'MY_Nm', 'MZ_Nm', 'Fresultant_N'], csvRows(this.reactionRows(active)));
    }
    if (this.activeView === 'DISPLACEMENTS') {
      return toCsv(['Node', 'DX_mm', 'DY_mm', 'DZ_mm', 'RX_deg', 'RY_deg', 'RZ_deg', 'Dresultant_mm'], csvRows(this.displacementRows(active)));
    }
    const recovered = this.recoveredActionsFor(active.caseId) ?? [];
    return toCsv(
      ['Element', 'End', 'FX_N', 'FY_N', 'FZ_N', 'MX_Nm', 'MY_Nm', 'MZ_Nm'],
      recovered.map((row) => [
        row.elementId,
        row.end,
        ...['fx', 'fy', 'fz', 'mx', 'my', 'mz'].map((field) => formatNumber(row[field] ?? row.actions?.[field])),
      ]),
    );
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_RESULTS_PANEL_SCHEMA,
      caseCount: (this.state?.cases ?? []).length,
      activeCaseId: this.activeCaseId,
      activeView: this.activeView,
    });
  }

  destroy() {
    if (this.elements) this.elements.section.remove();
    this.elements = null;
    this.initialized = false;
  }
}

function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  if (value !== 0 && Math.abs(value) < 1e-4) return value.toExponential(3);
  return value.toFixed(3);
}

function caseLabel(caseId) {
  return caseId.slice(caseId.indexOf('-') + 1).replace(/^W$/u, 'W').replace(/^WPT$/u, 'W+P1+T1')
    .replace(/^WP$/u, 'W+P1').replace(/^WT$/u, 'W+T1');
}

function toCsv(header, rows) {
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function createResultsSection(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-pipeline-results';
  section.dataset.role = 'lfea-pipeline-results-panel';
  return { section };
}

function heading(doc, text) {
  const node = doc.createElement('h2');
  node.textContent = text;
  return node;
}

function emptyParagraph(doc, text) {
  const p = doc.createElement('p');
  p.className = 'panel-empty';
  p.textContent = text;
  return p;
}

function nodeTable(doc, rows, labels) {
  const table = doc.createElement('table');
  table.className = 'lfea-pipeline-results__table';
  table.dataset.role = 'lfea-pipeline-results-table';
  const head = doc.createElement('tr');
  for (const label of labels) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const row of rows) {
    const tr = doc.createElement('tr');
    for (const cell of row) {
      const td = doc.createElement('td');
      td.textContent = String(cell);
      tr.append(td);
    }
    table.append(tr);
  }
  return scrollWrap(doc, table);
}

function elementActionTable(doc, actions) {
  const rows = actions.map((row) => [
    row.elementId,
    row.end,
    ...['fx', 'fy', 'fz', 'mx', 'my', 'mz'].map((field) => formatNumber(row[field] ?? row.actions?.[field])),
  ]);
  return nodeTable(doc, rows, ['Element', 'End', 'FX [N]', 'FY [N]', 'FZ [N]', 'MX [N·m]', 'MY [N·m]', 'MZ [N·m]']);
}

function scrollWrap(doc, node) {
  const wrap = doc.createElement('div');
  wrap.className = 'lfea-pipeline-results__scroll';
  wrap.append(node);
  return wrap;
}
