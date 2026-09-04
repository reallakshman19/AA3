import {
  LFEA_ERROR_CHECK_CATEGORIES,
  LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
  buildLfeaErrorCheckPresentation,
  selectLfeaErrorCheckSections,
} from './lfea-error-check-presentation.js';
import { lfeaPipelineIcon } from '../lfea-pipeline-icon-manifest.js';

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
    this.preFlight = null;
    this.activeCategory = 'ALL';
    this.acknowledgedGroupIds = new Set();
    this.reviewedGroupIds = new Set();
    this.preparationIdentity = null;
    this.reviewerIdentity = '';
    this.reviewReason = '';
    this.authorizationError = '';
    this.authorizing = false;
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
    const preFlight = this.options.getPreFlight();
    const nextPresentation = buildLfeaErrorCheckPresentation(preFlight);
    const nextIdentity = nextPresentation.preparationSemanticHash ?? null;
    if (nextIdentity !== this.preparationIdentity) {
      this.acknowledgedGroupIds.clear();
      this.reviewedGroupIds.clear();
      this.reviewerIdentity = '';
      this.reviewReason = '';
      this.authorizationError = '';
      this.preparationIdentity = nextIdentity;
    }
    this.preFlight = preFlight;
    this.presentation = nextPresentation;
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

  toggleAcknowledgement(groupId) {
    const group = findGroup(this.presentation, groupId);
    if (!group || group.disposition !== 'CONDITIONAL' || this.presentation.solveAuthorized) {
      throw new TypeError(`Conditional Error Check group ${JSON.stringify(groupId)} is not available for acknowledgement.`);
    }
    toggleSetValue(this.acknowledgedGroupIds, group.groupId);
    this.authorizationError = '';
    this.render();
    return this.getSnapshot();
  }

  toggleInformationalReview(groupId) {
    const group = findGroup(this.presentation, groupId);
    if (!group || !['PASS', 'ADVISORY'].includes(group.disposition)) {
      throw new TypeError(`Informational Error Check group ${JSON.stringify(groupId)} is not available for review.`);
    }
    toggleSetValue(this.reviewedGroupIds, group.groupId);
    this.render();
    return this.getSnapshot();
  }

  authorizeRun() {
    const state = authorizationState(this);
    if (!state.ready) {
      this.authorizationError = state.blockedReason;
      this.renderAuthorization();
      return null;
    }
    this.authorizing = true;
    this.authorizationError = '';
    this.renderAuthorization();
    try {
      const authorized = this.options.onAuthorizePreFlight({
        approverIdentity: this.reviewerIdentity,
        reason: this.reviewReason,
      });
      this.refresh();
      return authorized;
    } catch (error) {
      this.authorizationError = error instanceof Error ? error.message : String(error);
      this.renderAuthorization();
      return null;
    } finally {
      this.authorizing = false;
      this.renderAuthorization();
    }
  }

  continueToLoadCase() {
    this.options.onContinue?.();
  }

  render() {
    const { section, summary, status, filters, body, evidence } = this.elements;
    section.dataset.errorCheckState = this.presentation.empty ? 'EMPTY' : 'READY';
    section.dataset.activeCategory = this.activeCategory;
    section.dataset.preFlightStatus = this.presentation.preFlightStatus ?? 'UNAVAILABLE';
    section.dataset.solveAuthorized = this.presentation.solveAuthorized ? 'true' : 'false';
    section.dataset.authorizationState = authorizationState(this).stateId;

    summary.textContent = this.presentation.empty
      ? 'Load and prepare a model to review governed engineering findings.'
      : `${this.presentation.distinctIssueCount} distinct issues across ${this.presentation.findingCount} findings · Pre-flight ${this.presentation.preFlightStatus}`;
    status.textContent = errorCheckStatusLabel(this.presentation);
    status.dataset.status = errorCheckStatusToken(this.presentation);

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
        body.append(renderCategory(this, category));
      }
      const note = paragraph(this.documentRef,
        'Acknowledgement records review. Finding IDs, governed categories and sealed dispositions remain copied from the current pre-flight and are not reclassified here.');
      note.dataset.role = 'lfea-common-error-check-authority-note';
      body.append(note);
    }

    this.renderAuthorization();
    evidence.replaceChildren(renderEvidenceSummary(this.documentRef, this.presentation));
  }

  renderAuthorization() {
    if (!this.elements) return;
    const { authorization } = this.elements;
    authorization.replaceChildren(renderAuthorizationPanel(this));
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
      conditionalGroupCount: conditionalGroups(this.presentation).length,
      acknowledgedGroupIds: Object.freeze([...this.acknowledgedGroupIds].sort(compareAscii)),
      readyToAuthorize: authorizationState(this).ready,
      editable: true,
      authorizes: false,
      delegatesAuthorization: typeof this.options.onAuthorizePreFlight === 'function',
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
  const status = doc.createElement('span');
  status.className = 'lfea-common-error-check__status';
  status.dataset.role = 'lfea-common-error-check-status';
  header.append(title, summary, status);

  const filters = doc.createElement('div');
  filters.className = 'lfea-common-error-check__filters';
  filters.dataset.role = 'lfea-common-error-check-filters';
  filters.setAttribute('aria-label', 'Error Check engineering category filter');

  const body = doc.createElement('div');
  body.className = 'lfea-common-error-check__body';
  body.dataset.role = 'lfea-common-error-check-body';

  const authorization = doc.createElement('aside');
  authorization.className = 'lfea-common-error-check__authorization';
  authorization.dataset.role = 'lfea-common-error-check-authorization';

  const content = doc.createElement('div');
  content.className = 'lfea-common-error-check__content';
  content.append(body, authorization);

  const evidence = doc.createElement('details');
  evidence.className = 'lfea-common-error-check__evidence';
  evidence.dataset.role = 'lfea-common-error-check-evidence';

  section.append(header, filters, content, evidence);
  return { section, summary, status, filters, body, authorization, evidence };
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

function renderCategory(controller, category) {
  const doc = controller.documentRef;
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
    list.append(renderGroup(controller, group));
  }
  section.append(list);
  return section;
}

/**
 * One reviewable item per distinct finding, with the number of places it
 * applies rather than one row per place. The individual findings stay inside.
 */
function renderGroup(controller, group) {
  const doc = controller.documentRef;
  const card = doc.createElement('article');
  card.className = 'lfea-common-error-check__finding';
  card.dataset.role = 'lfea-common-error-check-finding-group';
  card.dataset.groupCode = group.code;
  card.dataset.disposition = group.disposition;
  card.dataset.presentationLevel = group.presentationLevel;
  card.dataset.triageId = group.triageId;
  card.dataset.occurrences = String(group.occurrences);

  const details = doc.createElement('details');
  details.className = 'lfea-common-error-check__finding-details';

  const summary = doc.createElement('summary');
  const badge = doc.createElement('span');
  badge.className = 'lfea-common-error-check__badge';
  badge.dataset.role = 'lfea-common-error-check-occurrence-badge';
  badge.textContent = group.occurrences > 1 ? `${group.occurrences}×` : '1×';
  const text = doc.createElement('span');
  text.className = 'lfea-common-error-check__finding-text';
  text.textContent = group.plainMessage;
  const disposition = doc.createElement('span');
  disposition.className = 'lfea-common-error-check__disposition';
  disposition.dataset.disposition = group.disposition;
  disposition.textContent = group.disposition === 'PASS' ? 'PASS · INFO' : group.disposition;
  summary.append(badge, text, disposition);
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
  card.append(details, renderGroupAction(controller, group));
  return card;
}

function renderGroupAction(controller, group) {
  const doc = controller.documentRef;
  const row = doc.createElement('div');
  row.className = 'lfea-common-error-check__group-action';
  row.dataset.role = 'lfea-common-error-check-group-action';

  if (group.disposition === 'CONDITIONAL') {
    const acknowledged = controller.presentation.solveAuthorized
      || controller.acknowledgedGroupIds.has(group.groupId);
    const button = actionButton(doc, acknowledged
      ? 'Acknowledged for this run'
      : 'Acknowledge this limitation', 'icon-step-error-check');
    button.dataset.action = 'lfea-error-check-acknowledge-limitation';
    button.dataset.groupId = group.groupId;
    button.dataset.acknowledged = acknowledged ? 'true' : 'false';
    button.disabled = controller.presentation.solveAuthorized;
    button.addEventListener('click', () => controller.toggleAcknowledgement(group.groupId));
    const note = paragraph(doc, 'This acknowledgement does not change the governed disposition.');
    row.append(button, note);
    return row;
  }

  if (group.disposition === 'BLOCK') {
    const lock = actionButton(doc, 'Fix in source and reload', 'icon-step-input');
    lock.disabled = true;
    lock.dataset.action = 'lfea-error-check-fix-in-source';
    row.append(lock, paragraph(doc, 'BLOCK findings cannot be authorized.'));
    return row;
  }

  const reviewed = controller.reviewedGroupIds.has(group.groupId);
  const button = actionButton(doc, reviewed ? 'Reviewed' : 'Mark reviewed', 'icon-status-complete');
  button.dataset.action = 'lfea-error-check-mark-reviewed';
  button.dataset.groupId = group.groupId;
  button.dataset.reviewed = reviewed ? 'true' : 'false';
  button.addEventListener('click', () => controller.toggleInformationalReview(group.groupId));
  row.append(button, paragraph(doc, 'Informational only; no authorization is required.'));
  return row;
}

function renderAuthorizationPanel(controller) {
  const doc = controller.documentRef;
  const state = authorizationState(controller);
  const fragment = doc.createDocumentFragment();
  const heading = doc.createElement('h4');
  heading.textContent = 'Run authorization';
  fragment.append(heading);

  const stateLine = doc.createElement('div');
  stateLine.className = 'lfea-common-error-check__authorization-state';
  stateLine.dataset.role = 'lfea-error-check-authorization-state';
  stateLine.dataset.state = state.stateId;
  stateLine.append(lfeaPipelineIcon(doc, state.iconId));
  const stateText = doc.createElement('strong');
  stateText.textContent = state.title;
  stateLine.append(stateText);
  fragment.append(stateLine, paragraph(doc, state.detail));

  if (state.stateId === 'CONDITIONAL_PENDING') {
    fragment.append(renderAuthorizationForm(controller, state));
  } else if (state.stateId === 'AUTHORIZED' || state.stateId === 'PASS') {
    const continueButton = actionButton(doc, 'Continue to Load case', 'icon-step-load-case');
    continueButton.classList.add('lfea-common-error-check__primary-action');
    continueButton.dataset.action = 'lfea-error-check-continue';
    continueButton.disabled = typeof controller.options.onContinue !== 'function';
    continueButton.addEventListener('click', () => controller.continueToLoadCase());
    fragment.append(continueButton);
  }

  if (controller.authorizationError) {
    const error = paragraph(doc, controller.authorizationError);
    error.className = 'lfea-common-error-check__authorization-error';
    error.dataset.role = 'lfea-error-check-authorization-error';
    error.setAttribute('role', 'alert');
    fragment.append(error);
  }

  if (!controller.presentation.empty) {
    const warning = paragraph(doc,
      'Changing the source, B31 authority, smooth-90 rule, profile or load-case selection invalidates this authorization.');
    warning.className = 'lfea-common-error-check__invalidation';
    fragment.append(warning, renderAuthorizationEvidence(doc, controller));
  }
  return fragment;
}

function renderAuthorizationForm(controller, state) {
  const doc = controller.documentRef;
  const fragment = doc.createDocumentFragment();
  const progress = doc.createElement('div');
  progress.className = 'lfea-common-error-check__progress';
  const label = doc.createElement('label');
  label.textContent = `${state.acknowledgedCount} of ${state.conditionalCount} limitation groups acknowledged`;
  label.setAttribute('for', 'lfea-error-check-progress');
  const meter = doc.createElement('progress');
  meter.id = 'lfea-error-check-progress';
  meter.max = Math.max(1, state.conditionalCount);
  meter.value = state.acknowledgedCount;
  progress.append(label, meter);

  const reviewer = labelledInput(doc, 'Reviewer', 'lfea-error-check-reviewer', controller.reviewerIdentity);
  const reason = labelledTextarea(doc, 'Reason', 'lfea-error-check-reason', controller.reviewReason);
  const authorize = actionButton(doc,
    `Authorize run with ${state.conditionalCount} limitation${state.conditionalCount === 1 ? '' : 's'}`,
    'icon-step-error-check');
  authorize.classList.add('lfea-common-error-check__primary-action');
  authorize.dataset.action = 'authorize-lfea-error-check-limitations';
  authorize.disabled = !state.ready || controller.authorizing;
  authorize.addEventListener('click', () => controller.authorizeRun());
  const updateDraft = () => {
    controller.reviewerIdentity = reviewer.input.value;
    controller.reviewReason = reason.input.value;
    controller.authorizationError = '';
    authorize.disabled = !authorizationState(controller).ready || controller.authorizing;
  };
  reviewer.input.addEventListener('input', updateDraft);
  reason.input.addEventListener('input', updateDraft);
  fragment.append(progress, reviewer.label, reason.label, authorize);
  return fragment;
}

function renderAuthorizationEvidence(doc, controller) {
  const list = doc.createElement('dl');
  list.className = 'lfea-common-error-check__authorization-evidence';
  const rows = [
    ['Preparation hash', shortHash(controller.presentation.preparationSemanticHash)],
    ['Diagnostics hash', shortHash(controller.presentation.evidenceSummary.diagnosticsSemanticHash)],
    ['Profile', controller.presentation.evidenceSummary.requestedProfileId ?? 'UNAVAILABLE'],
  ];
  for (const [label, value] of rows) {
    const term = doc.createElement('dt');
    term.textContent = label;
    const description = doc.createElement('dd');
    description.textContent = value;
    list.append(term, description);
  }
  return list;
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

function labelledInput(doc, labelText, role, value) {
  const label = doc.createElement('label');
  label.className = 'lfea-common-error-check__field';
  const text = doc.createElement('span');
  text.textContent = labelText;
  const input = doc.createElement('input');
  input.type = 'text';
  input.value = value;
  input.dataset.role = role;
  input.autocomplete = 'name';
  label.append(text, input);
  return { label, input };
}

function labelledTextarea(doc, labelText, role, value) {
  const label = doc.createElement('label');
  label.className = 'lfea-common-error-check__field';
  const text = doc.createElement('span');
  text.textContent = labelText;
  const input = doc.createElement('textarea');
  input.value = value;
  input.maxLength = 200;
  input.rows = 3;
  input.dataset.role = role;
  label.append(text, input);
  return { label, input };
}

function actionButton(doc, text, iconId) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'lfea-common-error-check__button';
  button.append(lfeaPipelineIcon(doc, iconId));
  const label = doc.createElement('span');
  label.textContent = text;
  button.append(label);
  return button;
}

function authorizationState(controller) {
  const presentation = controller.presentation;
  if (presentation.empty) {
    return state('EMPTY', 'Load a model first', 'Import and prepare a source on the Input step.', 'icon-step-input', false, 0, 0,
      'No governed pre-flight is available.');
  }
  const blocked = presentation.rows.some((row) => row.disposition === 'BLOCK');
  if (blocked) {
    return state('BLOCKED', 'Fix source findings', 'BLOCK findings cannot be authorized. Correct the source and reload it.', 'icon-step-input', false, 0, 0,
      'BLOCK findings must be fixed in source.');
  }
  const groups = conditionalGroups(presentation);
  const acknowledgedCount = groups.filter((group) => controller.acknowledgedGroupIds.has(group.groupId)).length;
  if (presentation.solveAuthorized) {
    const reviewer = controller.preFlight?.approverIdentity ?? 'the current reviewer';
    return state('AUTHORIZED', 'Run authorized', `The current limitation set is sealed by ${reviewer}.`, 'icon-status-complete', false,
      groups.length, groups.length, 'The current pre-flight is already authorized.');
  }
  if (groups.length === 0) {
    return state('PASS', 'No authorization required', 'The current pre-flight has no conditional limitations.', 'icon-status-complete', false, 0, 0,
      'No conditional limitations require authorization.');
  }
  const reviewerReady = controller.reviewerIdentity.trim() !== '';
  const reasonReady = controller.reviewReason.trim() !== '';
  const callbackReady = typeof controller.options.onAuthorizePreFlight === 'function';
  const allAcknowledged = acknowledgedCount === groups.length;
  const ready = allAcknowledged && reviewerReady && reasonReady && callbackReady;
  const blockedReason = !allAcknowledged
    ? `Acknowledge all ${groups.length} limitation groups before authorizing.`
    : !reviewerReady
      ? 'Enter the reviewer name before authorizing.'
      : !reasonReady
        ? 'Enter an acceptance reason before authorizing.'
        : !callbackReady
          ? 'The active source does not expose an authorization controller.'
          : '';
  return state('CONDITIONAL_PENDING', ready ? 'Ready to authorize' : 'Review required',
    `${acknowledgedCount} of ${groups.length} limitation groups acknowledged.`, 'icon-step-error-check', ready,
    groups.length, acknowledgedCount, blockedReason);
}

function state(stateId, title, detail, iconId, ready, conditionalCount, acknowledgedCount, blockedReason) {
  return Object.freeze({ stateId, title, detail, iconId, ready, conditionalCount, acknowledgedCount, blockedReason });
}

function conditionalGroups(presentation) {
  return presentation.sections.flatMap((section) => section.groups)
    .filter((group) => group.disposition === 'CONDITIONAL');
}

function findGroup(presentation, groupId) {
  return presentation.sections.flatMap((section) => section.groups)
    .find((group) => group.groupId === groupId) ?? null;
}

function toggleSetValue(values, key) {
  if (values.has(key)) values.delete(key);
  else values.add(key);
}

function errorCheckStatusLabel(presentation) {
  if (presentation.empty) return 'Waiting for model';
  if (presentation.solveAuthorized) return 'Authorized';
  if (presentation.rows.some((row) => row.disposition === 'BLOCK')) return 'Blocked';
  if (presentation.rows.some((row) => row.disposition === 'CONDITIONAL')) return 'Needs acceptance';
  return 'Ready';
}

function errorCheckStatusToken(presentation) {
  return errorCheckStatusLabel(presentation).toUpperCase().replaceAll(' ', '_');
}

function shortHash(value) {
  const text = String(value ?? 'UNAVAILABLE');
  return text.length <= 16 ? text : `${text.slice(0, 8)}…${text.slice(-6)}`;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
