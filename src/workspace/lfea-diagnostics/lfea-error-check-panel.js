import {
  LFEA_ERROR_CHECK_CATEGORIES,
  LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
  buildLfeaErrorCheckPresentation,
  selectLfeaErrorCheckSections,
} from './lfea-error-check-presentation.js';

export const LFEA_COMMON_ERROR_CHECK_PANEL_SCHEMA = 'lfea-common-error-check-panel/v1';

/**
 * Mount one common Error Check presentation over the active governed pre-flight.
 * Authorization remains in the existing source/pre-flight controller.
 */
export function mountLfeaCommonErrorCheckPanel(hostElement, options = {}) {
  if (!hostElement || typeof hostElement.append !== 'function') {
    throw new TypeError('Common LFEA Error Check requires a host element.');
  }
  if (typeof options.getPreFlight !== 'function') {
    throw new TypeError('Common LFEA Error Check requires options.getPreFlight.');
  }
  const documentRef = options.documentRef ?? hostElement.ownerDocument ?? document;
  return new LfeaCommonErrorCheckPanelController(hostElement, documentRef, options).init();
}

export class LfeaCommonErrorCheckPanelController {
  constructor(hostElement, documentRef, options) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.presentation = buildLfeaErrorCheckPresentation(null);
    this.activeCategory = 'ALL';
    this.elements = null;
    this.onRefreshRequested = () => this.refresh();
  }

  init() {
    if (this.elements) return this;
    this.elements = createElements(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.hostElement.addEventListener?.('lfea-source-presentation-refresh', this.onRefreshRequested);
    this.refresh();
    return this;
  }

  refresh() {
    this.presentation = buildLfeaErrorCheckPresentation(this.options.getPreFlight());
    if (this.activeCategory !== 'ALL'
      && !this.presentation.sections.some((section) => section.categoryId === this.activeCategory)) {
      this.activeCategory = 'ALL';
    }
    this.render();
    return this;
  }

  setCategoryFilter(categoryId) {
    const token = String(categoryId ?? 'ALL').trim().toUpperCase();
    selectLfeaErrorCheckSections(this.presentation, token);
    this.activeCategory = token;
    this.render();
    return this.getSnapshot();
  }

  render() {
    const { section, summary, filters, body, evidence } = this.elements;
    section.dataset.errorCheckState = this.presentation.empty ? 'EMPTY' : 'READY';
    section.dataset.activeCategory = this.activeCategory;
    section.dataset.preFlightStatus = this.presentation.preFlightStatus ?? 'UNAVAILABLE';
    section.dataset.solveAuthorized = this.presentation.solveAuthorized ? 'true' : 'false';

    summary.textContent = this.presentation.empty
      ? 'Load and prepare a model to review governed engineering findings.'
      : [
        `Pre-flight ${this.presentation.preFlightStatus}`,
        `BLOCK ${this.presentation.counts.BLOCK}`,
        `CONDITIONAL ${this.presentation.counts.CONDITIONAL}`,
        `ADVISORY ${this.presentation.counts.ADVISORY}`,
        `PASS ${this.presentation.counts.PASS}`,
      ].join(' · ');

    renderFilters(this, filters);
    body.replaceChildren();

    if (this.presentation.empty) {
      const message = paragraph(this.documentRef,
        'No governed pre-flight is available. Source/provider intake evidence and unit errors remain visible in the active source panel.');
      message.dataset.role = 'lfea-common-error-check-empty';
      body.append(message);
    } else {
      for (const category of selectLfeaErrorCheckSections(this.presentation, this.activeCategory)) {
        body.append(renderCategory(this.documentRef, category));
      }
      const note = paragraph(this.documentRef,
        'Presentation only. Finding IDs, governed categories and sealed dispositions are copied from the current pre-flight; this view does not authorize or reclassify them.');
      note.dataset.role = 'lfea-common-error-check-authority-note';
      body.append(note);
    }

    evidence.replaceChildren(renderEvidenceSummary(this.documentRef, this.presentation));
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_COMMON_ERROR_CHECK_PANEL_SCHEMA,
      presentationSchema: LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
      activeCategory: this.activeCategory,
      preFlightStatus: this.presentation.preFlightStatus,
      solveAuthorized: this.presentation.solveAuthorized,
      findingCount: this.presentation.findingCount,
      findingIds: Object.freeze(this.presentation.rows.map((row) => row.findingId)),
      preparationSemanticHash: this.presentation.preparationSemanticHash,
      editable: false,
      authorizes: false,
    });
  }

  destroy() {
    this.hostElement.removeEventListener?.('lfea-source-presentation-refresh', this.onRefreshRequested);
    this.elements?.section.remove();
    this.elements = null;
  }
}

function createElements(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-common-error-check';
  section.dataset.role = 'lfea-common-error-check-panel';

  const header = doc.createElement('div');
  header.className = 'lfea-common-error-check__header';
  const title = doc.createElement('h3');
  title.textContent = 'Engineering Error Check';
  const summary = doc.createElement('p');
  summary.dataset.role = 'lfea-common-error-check-summary';
  header.append(title, summary);

  const filters = doc.createElement('div');
  filters.className = 'lfea-common-error-check__filters';
  filters.dataset.role = 'lfea-common-error-check-filters';
  filters.setAttribute('aria-label', 'Error Check engineering category filter');

  const body = doc.createElement('div');
  body.className = 'lfea-common-error-check__body';
  body.dataset.role = 'lfea-common-error-check-body';

  const evidence = doc.createElement('details');
  evidence.className = 'lfea-common-error-check__evidence';
  evidence.dataset.role = 'lfea-common-error-check-evidence';

  section.append(header, filters, body, evidence);
  return { section, summary, filters, body, evidence };
}

function renderFilters(controller, root) {
  root.replaceChildren();
  const categories = [
    Object.freeze({ categoryId: 'ALL', title: 'All' }),
    ...LFEA_ERROR_CHECK_CATEGORIES.filter((entry) =>
      controller.presentation.sections.some((section) => section.categoryId === entry.categoryId)),
  ];
  for (const category of categories) {
    const button = controller.documentRef.createElement('button');
    button.type = 'button';
    button.dataset.action = 'lfea-error-check-category-filter';
    button.dataset.categoryId = category.categoryId;
    button.dataset.active = category.categoryId === controller.activeCategory ? 'true' : 'false';
    button.textContent = category.title;
    button.addEventListener('click', () => controller.setCategoryFilter(category.categoryId));
    root.append(button);
  }
}

function renderCategory(doc, category) {
  const section = doc.createElement('section');
  section.className = 'lfea-common-error-check__category';
  section.dataset.role = 'lfea-common-error-check-category';
  section.dataset.categoryId = category.categoryId;

  const heading = doc.createElement('h4');
  heading.textContent = `${category.title} — ${category.findingCount}`;
  const counts = paragraph(doc, [
    `BLOCK ${category.counts.BLOCK}`,
    `CONDITIONAL ${category.counts.CONDITIONAL}`,
    `ADVISORY ${category.counts.ADVISORY}`,
    `PASS ${category.counts.PASS}`,
  ].join(' · '));
  counts.dataset.role = 'lfea-common-error-check-category-counts';
  section.append(heading, counts);

  const list = doc.createElement('div');
  list.className = 'lfea-common-error-check__findings';
  for (const row of category.rows) {
    list.append(renderFinding(doc, row));
  }
  section.append(list);
  return section;
}

function renderFinding(doc, row) {
  const details = doc.createElement('details');
  details.className = 'lfea-common-error-check__finding';
  details.dataset.role = 'lfea-common-error-check-finding';
  details.dataset.findingId = row.findingId;
  details.dataset.governedCategory = row.governedCategory;
  details.dataset.disposition = row.disposition;
  details.dataset.presentationLevel = row.presentationLevel;

  const summary = doc.createElement('summary');
  summary.textContent = `${row.presentationLabel} · ${row.plainMessage} · ${row.code}`;
  details.append(summary);

  details.append(
    labelledParagraph(doc, 'Finding ID', row.findingId, 'lfea-common-error-check-finding-id'),
    labelledParagraph(doc, 'Governed category', row.governedCategory, 'lfea-common-error-check-governed-category'),
    labelledParagraph(doc, 'Authority message', row.message, 'lfea-common-error-check-authority-message'),
  );
  if (row.technicalBasis) {
    details.append(labelledParagraph(doc, 'Technical basis', row.technicalBasis, 'lfea-common-error-check-technical-basis'));
  }
  if (row.sourceFeatureIds.length > 0) {
    details.append(labelledParagraph(doc, 'Source features', row.sourceFeatureIds.join(', '), 'lfea-common-error-check-source-features'));
  }
  if (row.canonicalEntityIds.length > 0) {
    details.append(labelledParagraph(doc, 'Canonical entities', row.canonicalEntityIds.join(', '), 'lfea-common-error-check-canonical-entities'));
  }
  if (row.physicalCaseIds.length > 0) {
    details.append(labelledParagraph(doc, 'Physical cases', row.physicalCaseIds.join(', '), 'lfea-common-error-check-cases'));
  }
  if (row.remediation) {
    details.append(labelledParagraph(doc, 'Remediation', row.remediation, 'lfea-common-error-check-remediation'));
  }
  return details;
}

function renderEvidenceSummary(doc, presentation) {
  const fragment = doc.createDocumentFragment();
  const summary = doc.createElement('summary');
  summary.textContent = 'Governed evidence summary';
  fragment.append(summary);

  const evidence = presentation.evidenceSummary;
  const rows = [
    ['Preparation semantic hash', presentation.preparationSemanticHash ?? 'UNAVAILABLE'],
    ['Preparation evidence hash', presentation.preparationEvidenceHash ?? 'UNAVAILABLE'],
    ['Diagnostics semantic hash', evidence.diagnosticsSemanticHash ?? 'UNAVAILABLE'],
    ['Diagnostics evidence hash', evidence.diagnosticsEvidenceHash ?? 'UNAVAILABLE'],
    ['Requested profile', evidence.requestedProfileId ?? 'UNAVAILABLE'],
    ['Source nodes', evidence.sourceNodeCount ?? 'UNAVAILABLE'],
    ['Source elements', evidence.sourceElementCount ?? 'UNAVAILABLE'],
    ['Topology status', evidence.topologyStatus ?? 'UNAVAILABLE'],
    ['Proximity status', evidence.proximityStatus ?? 'UNAVAILABLE'],
    ['Representability status', evidence.representabilityStatus ?? 'UNAVAILABLE'],
    ['Blocked capabilities', evidence.blockedCapabilityIds.join(', ') || 'None'],
    ['Conditional capabilities', evidence.conditionalCapabilityIds.join(', ') || 'None'],
    ['Authorized capabilities', evidence.authorizedCapabilityIds.join(', ') || 'None'],
  ];
  const table = doc.createElement('table');
  table.dataset.role = 'lfea-common-error-check-evidence-table';
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = String(value);
    tr.append(th, td);
    table.append(tr);
  }
  fragment.append(table);
  return fragment;
}

function labelledParagraph(doc, label, value, role) {
  const line = paragraph(doc, `${label}: ${value}`);
  line.dataset.role = role;
  return line;
}

function paragraph(doc, text) {
  const value = doc.createElement('p');
  value.textContent = text;
  return value;
}
