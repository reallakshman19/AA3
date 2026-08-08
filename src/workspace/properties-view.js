import { renderAnalysisLedger } from './analysis-ledger-view.js';
import { renderAnalysisCapabilities } from './analysis-readiness-view.js';
import { renderAnalysisSession } from './analysis-session-view.js';
import { flattenProperties } from './property-flattener.js';
import { SupportLoadPresenter } from './sequential-sketcher/support-load-presenter.js';
import { buildPropertyInspector } from './sequential-sketcher/property-inspector-view.js';

const sharedSupportPresenter = new SupportLoadPresenter();

export function renderPropertiesContent(
  documentRef,
  selection,
  capabilities,
  analysisState,
  analysisSession = null,
  analysisLedger = null,
  ledgerStatus = {},
  searchQuery = ''
) {
  const fragment = documentRef.createDocumentFragment();
  if (!selection || !selection.entityId || selection.entityId === 'Unknown entity') {
    const empty = documentRef.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = 'Select a source entity or canonical support site.';
    fragment.append(empty);
    return fragment;
  }
  const activeSelection = selection;

  const entityType = (activeSelection.entityType || activeSelection.type || 'COMPONENT').toUpperCase();
  const entityObj = activeSelection.entity || {
    entityId: activeSelection.entityId,
    name: activeSelection.name || activeSelection.entityId,
    entityType: entityType,
    category: activeSelection.category || 'component',
    properties: activeSelection.properties || {},
  };

  fragment.append(buildPropertyInspector(documentRef, entityObj, sharedSupportPresenter, null));

  const supportLoads = entityObj.properties?.engineeringSupportLoads;
  if (supportLoads && supportLoads.loadCases?.some((lc) => lc.anchorDecomposition)) {
    fragment.append(renderSupportLoadSection(documentRef, supportLoads));
  }

  fragment.append(renderAnalysisCapabilities(documentRef, capabilities, analysisSession));
  fragment.append(renderAnalysisSession(documentRef, analysisSession));
  fragment.append(renderAnalysis(documentRef, analysisState));
  fragment.append(renderAnalysisLedger(documentRef, analysisLedger, ledgerStatus));
  return fragment;
}

function renderSelectionHeader(documentRef, selection) {
  const heading = documentRef.createElement('div');
  heading.className = 'properties-selection';
  const label = documentRef.createElement('span');
  label.textContent = 'Selected entity';
  const identity = documentRef.createElement('strong');
  identity.textContent = selection.entityId;
  const type = documentRef.createElement('em');
  type.textContent = selection.entityType;
  heading.append(label, identity, type);
  return heading;
}

function renderAnalysis(documentRef, state) {
  const section = documentRef.createElement('section');
  section.className = 'analysis-result';
  section.dataset.role = 'analysis-result';
  const heading = documentRef.createElement('h3');
  heading.textContent = 'Analysis result';
  const status = documentRef.createElement('output');
  status.dataset.role = 'analysis-status';
  status.textContent = analysisStatusText(state);
  section.append(heading, status);

  if (state.status === 'completed') {
    section.append(renderRows(documentRef, {
      summary: state.result.summary,
      results: state.result.results,
      warnings: state.result.warnings,
      diagnostics: state.result.diagnostics,
    }, 'Analysis completed without displayable result fields.', 120));
  }
  if (state.status === 'failed') {
    const error = documentRef.createElement('p');
    error.className = 'analysis-error';
    error.textContent = `${state.code}: ${state.message}`;
    section.append(error);
    if (state.details && Object.keys(state.details).length) {
      section.append(renderRows(documentRef, state.details, '', 40));
    }
  }
  return section;
}

function renderRows(documentRef, value, emptyText, limit = 240, searchQuery = '') {
  let rows = flattenProperties(value, limit);
  
  if (searchQuery) {
    rows = rows.filter(row => 
      row.path.toLowerCase().includes(searchQuery) || 
      row.value.toLowerCase().includes(searchQuery)
    );
  }

  if (!rows.length) {
    const empty = documentRef.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = emptyText;
    return empty;
  }

  const table = documentRef.createElement('dl');
  table.className = 'properties-grid';
  rows.forEach((row) => {
    const term = documentRef.createElement('dt');
    term.textContent = row.path;
    term.title = row.path;
    const description = documentRef.createElement('dd');
    description.textContent = row.value;
    description.title = row.value;
    table.append(term, description);
  });
  return table;
}

function analysisStatusText(state) {
  if (state.status === 'running') return `Running ${state.analysisType} for ${state.targetId}…`;
  if (state.status === 'completed') return `${state.analysisType} completed · ${state.result.status}`;
  if (state.status === 'failed') return `${state.analysisType} failed`;
  return 'No analysis has been run for this selection.';
}

function renderSupportLoadSection(documentRef, supportLoads) {
  const section = documentRef.createElement('section');
  section.className = 'support-load-results';
  
  const heading = documentRef.createElement('h3');
  heading.textContent = 'Support Loads';
  section.append(heading);

  for (const lc of supportLoads.loadCases) {
    if (!lc.anchorDecomposition) continue;
    const article = documentRef.createElement('article');
    article.className = 'support-load-case';

    // Header: load case + contact state badge
    const header = documentRef.createElement('div');
    header.className = 'support-load-case__header';
    const caseLabel = documentRef.createElement('strong');
    caseLabel.textContent = lc.loadCaseId;
    const contactBadge = documentRef.createElement('span');
    contactBadge.className = 'status-badge';
    contactBadge.textContent = lc.contactState || 'UNKNOWN';
    header.append(caseLabel, contactBadge);
    article.append(header);

    // Projected loads dl
    const anchor = lc.anchorDecomposition;
    const dl = documentRef.createElement('dl');
    dl.className = 'support-load-dl';
    function addRow(label, value, unit) {
      const dt = documentRef.createElement('dt');
      dt.textContent = label;
      const dd = documentRef.createElement('dd');
      dd.textContent = Number.isFinite(value) 
        ? `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
        : '—';
      dl.append(dt, dd);
    }
    addRow('Fv — vertical (rest)', anchor.componentsN?.rest, 'N');
    addRow('Fl — guide (lateral)', anchor.componentsN?.guide, 'N');
    addRow('Fa — lineStop (axial)', anchor.componentsN?.lineStop, 'N');
    article.append(dl);

    // Basis accordion <details>
    const details = documentRef.createElement('details');
    details.className = 'support-load-basis';
    const summary = documentRef.createElement('summary');
    summary.textContent = 'Calculation basis ›';
    details.append(summary);

    const basisDl = documentRef.createElement('dl');
    basisDl.className = 'support-load-basis__dl';
    function addBasisRow(label, value) {
      const dt = documentRef.createElement('dt');
      dt.textContent = label;
      const dd = documentRef.createElement('dd');
      dd.textContent = Array.isArray(value) 
        ? `[${value.map((v) => Number.isFinite(v) ? v.toFixed(4) : '—').join(', ')}]`
        : String(value ?? '—');
      basisDl.append(dt, dd);
    }
    addBasisRow('Labels', anchor.labels?.join(' · '));
    addBasisRow('lineStop axis', anchor.basis?.lineStop);
    addBasisRow('rest axis', anchor.basis?.transverse1);
    addBasisRow('guide axis', anchor.basis?.transverse2);
    addBasisRow('Method', supportLoads.method);
    addBasisRow('Freshness', supportLoads.freshness?.status);
    details.append(basisDl);
    article.append(details);

    section.append(article);
  }
  return section;
}
