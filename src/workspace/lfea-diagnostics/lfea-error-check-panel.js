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
      : `${this.presentation.distinctIssueCount} distinct issues across ${this.presentation.findingCount} findings · Pre-flight ${this.presentation.preFlightStatus}`;

    renderFilters(this, filters);
    body.replaceChildren();
    if (!this.presentation.empty) {
      body.append(renderTriageBanner(this.documentRef, this.presentation));
    }

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

/** Headline triage: what stops the run, what needs sign-off, what is just noted. */
function renderTriageBanner(doc, presentation) {
  const banner = doc.createElement('div');
  banner.className = 'lfea-common-error-check__triage';
  banner.dataset.role = 'lfea-common-error-check-triage';
  for (const bucket of presentation.triage) {
    const card = doc.createElement('div');
    card.className = 'lfea-common-error-check__triage-card';
    card.dataset.role = 'lfea-common-error-check-triage-card';
    card.dataset.triageId = bucket.triageId;
    card.dataset.cleared = bucket.cleared ? 'true' : 'false';

    const count = doc.createElement('strong');
    count.dataset.role = 'lfea-common-error-check-triage-count';
    count.textContent = bucket.cleared ? '0' : String(bucket.distinctIssueCount);
    const title = doc.createElement('span');
    title.className = 'lfea-common-error-check__triage-title';
    title.textContent = bucket.title;
    const detail = paragraph(doc, bucket.cleared
      ? bucket.clearedText
      : `${bucket.distinctIssueCount} distinct · ${bucket.findingCount} occurrence${bucket.findingCount === 1 ? '' : 's'}`);
    detail.className = 'lfea-common-error-check__triage-detail';
    card.append(count, title, detail);
    banner.append(card);
  }
  return banner;
}

function renderCategory(doc, category) {
  const section = doc.createElement('section');
  section.className = 'lfea-common-error-check__category';
  section.dataset.role = 'lfea-common-error-check-category';
  section.dataset.categoryId = category.categoryId;

  const heading = doc.createElement('h4');
  const distinct = category.groups.length;
  heading.textContent = `${category.title} — ${distinct} issue${distinct === 1 ? '' : 's'}`;
  const counts = paragraph(doc, `${category.findingCount} finding${category.findingCount === 1 ? '' : 's'} in total`);
  counts.dataset.role = 'lfea-common-error-check-category-counts';
  section.append(heading, counts);

  const list = doc.createElement('div');
  list.className = 'lfea-common-error-check__findings';
  for (const group of category.groups) {
    list.append(renderGroup(doc, group));
  }
  section.append(list);
  return section;
}

/**
 * One reviewable item per distinct finding, with the number of places it
 * applies rather than one row per place. The individual findings stay inside.
 */
function renderGroup(doc, group) {
  const details = doc.createElement('details');
  details.className = 'lfea-common-error-check__finding';
  details.dataset.role = 'lfea-common-error-check-finding-group';
  details.dataset.groupCode = group.code;
  details.dataset.disposition = group.disposition;
  details.dataset.presentationLevel = group.presentationLevel;
  details.dataset.triageId = group.triageId;
  details.dataset.occurrences = String(group.occurrences);

  const summary = doc.createElement('summary');
  const badge = doc.createElement('span');
  badge.className = 'lfea-common-error-check__badge';
  badge.dataset.role = 'lfea-common-error-check-occurrence-badge';
  badge.textContent = group.occurrences > 1 ? `${group.occurrences}×` : '1×';
  const text = doc.createElement('span');
  text.className = 'lfea-common-error-check__finding-text';
  text.textContent = group.plainMessage;
  summary.append(badge, text);
  details.append(summary);

  if (group.suggestedAction) {
    const action = paragraph(doc, group.suggestedAction);
    action.className = 'lfea-common-error-check__action';
    action.dataset.role = 'lfea-common-error-check-suggested-action';
    details.append(action);
  }

  details.append(labelledParagraph(doc, 'Applies to',
    `${group.occurrences} location${group.occurrences === 1 ? '' : 's'}`,
    'lfea-common-error-check-occurrences'));
  if (group.sourceFeatureIds.length > 0) {
    details.append(labelledParagraph(doc, 'Source features',
      summarizeList(group.sourceFeatureIds), 'lfea-common-error-check-source-features'));
  }
  details.append(
    labelledParagraph(doc, 'Finding code', group.code, 'lfea-common-error-check-code'),
    labelledParagraph(doc, 'Governed disposition', group.disposition, 'lfea-common-error-check-governed-disposition'),
    labelledParagraph(doc, 'Authority message', group.rows[0].message, 'lfea-common-error-check-authority-message'),
  );
  if (group.rows[0].technicalBasis) {
    details.append(labelledParagraph(doc, 'Technical basis', group.rows[0].technicalBasis, 'lfea-common-error-check-technical-basis'));
  }
  if (group.rows[0].remediation) {
    details.append(labelledParagraph(doc, 'Remediation', group.rows[0].remediation, 'lfea-common-error-check-remediation'));
  }
  details.append(labelledParagraph(doc, 'Finding IDs',
    summarizeList(group.findingIds), 'lfea-common-error-check-finding-id'));
  return details;
}

/** Keep long identifier lists readable without hiding how many there are. */
function summarizeList(values, limit = 12) {
  if (values.length <= limit) return values.join(', ');
  return `${values.slice(0, limit).join(', ')} … and ${values.length - limit} more`;
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
