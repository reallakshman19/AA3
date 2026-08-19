export const LFEA_PIPELINE_RESULTS_PANEL_SCHEMA = 'lfea-pipeline-results-panel/v1';

const TRANSLATION_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
const ROTATION_DOFS = Object.freeze(['RX', 'RY', 'RZ']);
const ALL_DOFS = Object.freeze([...TRANSLATION_DOFS, ...ROTATION_DOFS]);

/**
 * The Output step: what an engineer actually came for -- nodal displacements,
 * support loads and element end forces for the analyzed cases, per node rather
 * than per DOF row, with CSV export.
 *
 * Values are converted for display only (metres to millimetres, radians to
 * degrees); nothing here re-derives an engineering quantity. The solver's own
 * qualification verdict is shown alongside, and where a case is BLOCKED the
 * failing check is named rather than replaced with a generic failure -- a
 * blocked case still has real displacements and reactions, and hiding them
 * behind "run failed" would tell the user less than the truth.
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
      section.append(emptyParagraph(this.documentRef, 'No analysis has been run yet. Select load cases and choose Analyze.'));
      return this;
    }
    section.append(this.caseTabs(cases));
    const active = this.activeCase();
    if (active === null) return this;
    section.append(this.caseStatus(active));
    if (active.unilateralSummary !== null) section.append(this.accuracyWarning(active));
    section.append(this.viewTabs());
    section.append(this.activeTable(active));
    section.append(this.exportBar(active));
    return this;
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
      button.addEventListener('click', () => { this.activeCaseId = row.caseId; this.render(); });
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
      button.addEventListener('click', () => { this.activeView = view; this.render(); });
      bar.append(button);
    }
    return bar;
  }

  activeTable(active) {
    if (this.activeView === 'DISPLACEMENTS') {
      return nodeTable(this.documentRef, displacementRows(active.displacements), [
        'Node', 'DX [mm]', 'DY [mm]', 'DZ [mm]', 'RX [deg]', 'RY [deg]', 'RZ [deg]',
      ]);
    }
    if (this.activeView === 'REACTIONS') {
      return nodeTable(this.documentRef, reactionRows(active.reactions), [
        'Node', 'FX [N]', 'FY [N]', 'FZ [N]', 'MX [N·m]', 'MY [N·m]', 'MZ [N·m]',
      ]);
    }
    const recovered = this.recoveredActionsFor(active.caseId);
    if (recovered === null) {
      return emptyParagraph(this.documentRef, this.elementForceUnavailableReason(active));
    }
    return elementActionTable(this.documentRef, recovered);
  }

  /** Say WHICH case failed to qualify, not just that recovery was refused. */
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

  exportBar(active) {
    const bar = this.documentRef.createElement('div');
    bar.className = 'lfea-pipeline-results__export';
    const button = this.documentRef.createElement('button');
    button.type = 'button';
    button.dataset.action = 'lfea-pipeline-results-csv';
    button.textContent = 'Download CSV';
    button.addEventListener('click', () => this.options.onExportCsv?.(this.csvFor(active), csvName(active.caseId, this.activeView)));
    bar.append(button);
    return bar;
  }

  csvFor(active) {
    if (this.activeView === 'REACTIONS') {
      return toCsv(['Node', 'FX_N', 'FY_N', 'FZ_N', 'MX_Nm', 'MY_Nm', 'MZ_Nm'], reactionRows(active.reactions));
    }
    if (this.activeView === 'DISPLACEMENTS') {
      return toCsv(['Node', 'DX_mm', 'DY_mm', 'DZ_mm', 'RX_deg', 'RY_deg', 'RZ_deg'], displacementRows(active.displacements));
    }
    const recovered = this.recoveredActionsFor(active.caseId) ?? [];
    return toCsv(
      ['Element', 'End', 'FX_N', 'FY_N', 'FZ_N', 'MX_Nm', 'MY_Nm', 'MZ_Nm'],
      recovered.map((row) => [row.elementId, row.end,
        ...['fx', 'fy', 'fz', 'mx', 'my', 'mz'].map((field) => formatNumber(row[field] ?? row.actions?.[field]))]),
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

/** Group per-DOF solver rows into one row per node, in display units. */
function groupByNode(rows, scaleFor) {
  const byNode = new Map();
  for (const row of rows ?? []) {
    const node = String(row.nodeId).replace(/^.*\.N/u, '');
    if (!byNode.has(node)) byNode.set(node, {});
    byNode.get(node)[row.dof] = row.value * scaleFor(row.dof);
  }
  return [...byNode.entries()]
    .sort((left, right) => compareNodes(left[0], right[0]))
    .map(([node, values]) => [node, ...ALL_DOFS.map((dof) => formatNumber(values[dof] ?? 0))]);
}

function displacementRows(rows) {
  // Solver works in metres and radians; engineers read millimetres and degrees.
  return groupByNode(rows, (dof) => (ROTATION_DOFS.includes(dof) ? 180 / Math.PI : 1000));
}

function reactionRows(rows) {
  // Forces and moments are already N and N*m.
  return groupByNode(rows, () => 1);
}

function compareNodes(left, right) {
  const a = Number(left);
  const b = Number(right);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  return left < right ? -1 : left > right ? 1 : 0;
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

function csvName(caseId, view) {
  return `${caseId}-${view.toLowerCase()}.csv`;
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
