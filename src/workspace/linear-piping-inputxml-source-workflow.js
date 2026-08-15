import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ROLE,
  LINEAR_PIPING_INPUTXML_DEFAULT_PROFILE_ID,
  LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS,
  LINEAR_PIPING_INPUTXML_INTAKE_PROFILE_IDS,
  createLinearPipingInputXmlIntake,
  inspectLinearPipingInputXmlSource,
} from './linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
  requireLinearPipingInputXmlPreFlight,
} from './linear-piping-inputxml-prefea.js';
import { renderLinearPipingInputXmlDiagnostics } from './linear-piping-inputxml-diagnostics-view.js';

export const LINEAR_PIPING_INPUTXML_SOURCE_WORKFLOW_SCHEMA = 'linear-piping-inputxml-source-workflow/v1';

/**
 * Mount the normal native InputXML Source → Pre-flight surface in the LFEA
 * consumer root. This surface owns source/unit/pre-FEA custody only. It does
 * not manufacture a legacy workbench run request or claim downstream execution
 * authority that is absent from the native preparation chain.
 */
export function mountLinearPipingInputXmlSourceWorkflow(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Native InputXML source workflow requires the application root.');
  }
  const panelContainer = applicationRoot.querySelector('[data-role="linear-piping-consumer-root"]')
    ?? applicationRoot.querySelector('[data-panel="properties"] .panel-collapsible-content');
  if (!panelContainer) {
    throw new TypeError('Native InputXML source workflow could not find a mount root.');
  }
  const documentRef = options.documentRef ?? applicationRoot.ownerDocument ?? document;
  return new LinearPipingInputXmlSourceWorkflowController(panelContainer, documentRef).init();
}

export class LinearPipingInputXmlSourceWorkflowController {
  constructor(panelContainer, documentRef) {
    if (!panelContainer || typeof panelContainer.append !== 'function') {
      throw new TypeError('Native InputXML source workflow panel container is required.');
    }
    if (!documentRef || typeof documentRef.createElement !== 'function') {
      throw new TypeError('Native InputXML source workflow document is required.');
    }
    this.panelContainer = panelContainer;
    this.documentRef = documentRef;
    this.sourceInput = null;
    this.inspection = null;
    this.fallbackUnit = null;
    this.intake = null;
    this.preFlight = null;
    this.requestedCaseIds = null;
    this.message = 'Import a CAESAR II InputXML source to begin governed pre-flight.';
    this.error = '';
    this.elements = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return this;
    this.elements = createSourceWorkflowSection(this.documentRef);
    this.panelContainer.append(this.elements.section);
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', () => this.loadSelectedFile());
    this.elements.unitButton.addEventListener('click', () => this.authorizeSelectedUnit());
    this.elements.authorizeButton.addEventListener('click', () => this.authorizeCurrentPreFlight());
    this.elements.profileSelect.addEventListener('change', () => this.reprepareForProfileChange());
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.initialized = true;
    this.render();
    return this;
  }

  loadSource(input, options = {}) {
    const retained = retainSourceInput(input);
    this.sourceInput = retained;
    this.inspection = inspectLinearPipingInputXmlSource(retained);
    this.fallbackUnit = null;
    this.intake = null;
    this.preFlight = null;
    this.error = '';

    if (this.inspection.status === 'BLOCK') {
      this.message = 'InputXML source inspection BLOCKED because the unit declaration is invalid.';
      this.render();
      return this.inspection;
    }
    if (this.inspection.status === 'UNIT_AUTHORITY_REQUIRED' && !options.fallbackUnit) {
      this.message = [
        'UNIT AUTHORITY REQUIRED.',
        'The selected InputXML does not declare a supported length unit; choose mm or in explicitly.',
        'No geometry-magnitude, diameter, filename, or coordinate heuristic is used.',
      ].join(' ');
      this.render();
      return this.inspection;
    }
    return this.prepareSource(options.fallbackUnit ?? null);
  }

  authorizeUnit(unit) {
    if (!this.sourceInput || this.inspection?.status !== 'UNIT_AUTHORITY_REQUIRED') {
      throw workflowError(
        'PIPING_INPUTXML_SOURCE_UNIT_AUTHORITY_NOT_REQUIRED',
        'Explicit source-unit authority is only available for a loaded InputXML without a supported LENGTH declaration.',
      );
    }
    const normalized = String(unit ?? '').trim().toLowerCase();
    if (!LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS.includes(normalized)) {
      throw workflowError(
        'PIPING_INPUTXML_SOURCE_UNIT_INVALID',
        'Native InputXML source unit must be explicitly selected as mm or in.',
      );
    }
    return this.prepareSource(normalized);
  }

  authorizePreFlight(approval) {
    if (!this.preFlight) {
      throw workflowError(
        'PIPING_INPUTXML_SOURCE_PREFLIGHT_REQUIRED',
        'A current native InputXML pre-flight record is required before limitation acceptance.',
      );
    }
    this.preFlight = authorizeLinearPipingInputXmlPreFlight(this.preFlight, approval);
    this.error = '';
    this.message = [
      `Native InputXML ${this.preFlight.status} pre-flight authorization sealed.`,
      `Authorization ${this.preFlight.authorization.semanticHash}.`,
      'Native execution handoff is not claimed by this source-intake stage.',
    ].join(' ');
    this.render();
    return this.preFlight;
  }

  getPreFlight() {
    return this.preFlight;
  }

  getSnapshot() {
    const validated = this.preFlight ? requireLinearPipingInputXmlPreFlight(this.preFlight) : null;
    return Object.freeze({
      schema: LINEAR_PIPING_INPUTXML_SOURCE_WORKFLOW_SCHEMA,
      sourceStatus: sourceStatus(this.inspection, validated, this.intake),
      fileName: this.sourceInput?.fileName ?? null,
      contentSha256: this.inspection?.contentSha256 ?? null,
      unitDeclared: this.intake?.unitAuthority.declared ?? this.inspection?.unitDeclared ?? null,
      sourceUnit: this.intake?.unitAuthority.sourceUnit ?? this.inspection?.sourceUnit ?? null,
      unitAuthority: this.intake?.unitAuthority.authority ?? null,
      requestedProfileId: this.intake?.requestedProfileId ?? this.elements?.profileSelect.value ?? null,
      requestedCaseRole: LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ROLE,
      requestedCaseIds: this.intake?.requestedCaseIds ?? Object.freeze([LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID]),
      nodeCount: validated?.sourceSummary.nodeCount ?? null,
      elementCount: validated?.sourceSummary.elementCount ?? null,
      availableCaseIds: validated?.sourceSummary.availableCaseIds ?? Object.freeze([]),
      preFlightStatus: validated?.status ?? 'NOT_PREPARED',
      preFlightSemanticHash: validated?.semanticHash ?? null,
      preFlightSolveAuthorized: validated?.solveAuthorized ?? false,
      authorizationSemanticHash: validated?.authorization?.semanticHash ?? null,
      nativeExecutionReady: false,
      message: this.message,
      error: this.error || null,
    });
  }

  clear() {
    this.sourceInput = null;
    this.inspection = null;
    this.fallbackUnit = null;
    this.intake = null;
    this.preFlight = null;
    this.error = '';
    this.message = 'Native InputXML source workflow cleared.';
    if (this.elements) {
      this.elements.fileInput.value = '';
      this.elements.reviewerIdentityInput.value = '';
      this.elements.reviewReasonInput.value = '';
    }
    this.render();
  }

  destroy() {
    this.clear();
    this.elements?.section.remove();
    this.elements = null;
    this.initialized = false;
  }

  async loadSelectedFile() {
    const file = this.elements?.fileInput.files?.[0];
    if (!file) return;
    try {
      this.loadSource({ fileName: file.name, content: await file.text() });
    } catch (error) {
      if (this.intake === null) {
        this.preFlight = null;
        this.error = errorMessage(error);
        this.message = 'Native InputXML source was rejected before source authority could be sealed.';
        this.render();
      }
    } finally {
      if (this.elements) this.elements.fileInput.value = '';
    }
  }

  authorizeSelectedUnit() {
    try {
      this.authorizeUnit(this.elements?.unitSelect.value ?? '');
    } catch (error) {
      if (this.intake === null) {
        this.error = errorMessage(error);
        this.message = 'Source-unit authorization was rejected before source authority could be sealed.';
        this.render();
      }
    }
  }

  authorizeCurrentPreFlight() {
    try {
      this.authorizePreFlight({
        approverIdentity: this.elements?.reviewerIdentityInput.value ?? '',
        reason: this.elements?.reviewReasonInput.value ?? '',
      });
    } catch (error) {
      this.error = errorMessage(error);
      this.message = 'Native InputXML conditional authorization was rejected.';
      this.render();
    }
  }

  reprepareForProfileChange() {
    if (!this.sourceInput) {
      this.render();
      return;
    }
    try {
      if (this.inspection?.status === 'UNIT_AUTHORITY_REQUIRED' && this.fallbackUnit === null) {
        this.intake = null;
        this.preFlight = null;
        this.message = 'Analysis profile changed; explicit source-unit authority is still required before pre-flight.';
        this.render();
        return;
      }
      this.prepareSource(this.fallbackUnit);
      this.message = `Analysis profile changed; native pre-flight was regenerated and any prior authorization was invalidated. ${this.message}`;
      this.render();
    } catch (error) {
      if (this.intake === null) {
        this.preFlight = null;
        this.error = errorMessage(error);
        this.message = 'Analysis profile change invalidated the prior native pre-flight; source authority could not be resealed.';
        this.render();
      } else {
        this.message = `Analysis profile changed and prior authorization was invalidated. ${this.message}`;
        this.render();
      }
    }
  }

  /**
   * Change the requested physical case selection and, if a source is
   * already loaded, re-run governed preparation against it. Any prior
   * authorization is invalidated exactly like a profile change, since the
   * requested case set is sealed into intake/preparation identity.
   */
  setRequestedCaseIds(caseIds) {
    const normalized = Object.freeze([...new Set((caseIds ?? []).map((id) => String(id).trim()).filter(Boolean))].sort());
    if (normalized.length === 0) {
      throw workflowError('LINEAR_PIPING_INPUTXML_CASE_SELECTION_EMPTY', 'At least one requested physical case is required.');
    }
    this.requestedCaseIds = normalized;
    if (!this.sourceInput) {
      this.render();
      return this.getSnapshot();
    }
    try {
      this.prepareSource(this.fallbackUnit);
      this.message = `Requested case selection changed; native pre-flight was regenerated and any prior authorization was invalidated. ${this.message}`;
    } catch (error) {
      if (this.intake === null) {
        this.preFlight = null;
        this.error = errorMessage(error);
        this.message = 'Case selection change invalidated the prior native pre-flight; source authority could not be resealed.';
      } else {
        this.message = `Requested case selection changed and prior authorization was invalidated. ${this.message}`;
      }
    }
    this.render();
    return this.getSnapshot();
  }

  prepareSource(fallbackUnit) {
    this.fallbackUnit = fallbackUnit;
    const profileId = this.elements?.profileSelect.value ?? LINEAR_PIPING_INPUTXML_DEFAULT_PROFILE_ID;
    this.intake = createLinearPipingInputXmlIntake(this.sourceInput, {
      fallbackUnit,
      requestedProfileId: profileId,
      requestedCaseIds: this.requestedCaseIds ?? [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
    });
    this.preFlight = null;
    try {
      this.preFlight = prepareLinearPipingInputXmlPreFlight(this.intake);
    } catch (error) {
      this.error = errorMessage(error);
      this.message = [
        `InputXML source authority sealed (${this.intake.unitAuthority.sourceUnit}; ${this.intake.unitAuthority.authority}).`,
        'Downstream native pre-flight failed closed.',
        'No pre-FEA authorization or execution authority exists.',
      ].join(' ');
      this.render();
      throw error;
    }
    this.error = '';
    if (this.preFlight.status === 'PASS') {
      this.message = [
        'Native InputXML pre-flight PASS.',
        'The existing system policy sealed the pre-FEA authorization.',
        'Native execution handoff is intentionally not claimed by P-07.',
      ].join(' ');
    } else if (this.preFlight.status === 'WARN') {
      this.message = [
        'Native InputXML pre-flight WARN.',
        'Review and explicitly accept the complete disclosed limitation set to seal conditional pre-FEA authorization.',
        'Native execution handoff remains disabled.',
      ].join(' ');
    } else {
      this.message = 'Native InputXML pre-flight BLOCK. No authorization bypass exists and execution remains disabled.';
    }
    this.render();
    return this.preFlight;
  }

  render() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    this.elements.error.hidden = !this.error;
    this.elements.error.textContent = this.error;
    const unitPending = this.inspection?.status === 'UNIT_AUTHORITY_REQUIRED' && this.intake === null;
    const warnPending = this.preFlight?.status === 'WARN' && !this.preFlight.solveAuthorized;
    this.elements.unitLabel.hidden = !unitPending;
    this.elements.unitButton.hidden = !unitPending;
    this.elements.reviewerIdentityLabel.hidden = !warnPending;
    this.elements.reviewReasonLabel.hidden = !warnPending;
    this.elements.authorizeButton.hidden = !warnPending;
    this.elements.clearButton.disabled = this.sourceInput === null;
    renderSourceSummary(this.documentRef, this.elements.summaryRoot, this);
    this.elements.section.dataset.sourceStatus = sourceStatus(this.inspection, this.preFlight, this.intake);
    this.elements.section.dataset.preFlightStatus = this.preFlight?.status ?? 'NOT_PREPARED';
    this.elements.section.dataset.preFlightAuthorized = this.preFlight?.solveAuthorized ? 'true' : 'false';
    this.elements.section.dataset.nativeExecutionReady = 'false';
  }
}

function createSourceWorkflowSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'linear-piping-inputxml-source';
  section.dataset.role = 'linear-piping-inputxml-source-workflow';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = '1 Source → 2 Pre-flight — CAESAR II InputXML';
  header.append(title);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'linear-piping-results-workbench__toolbar';

  const importButton = button(doc, 'Import CAESAR II InputXML');
  importButton.dataset.action = 'import-linear-piping-inputxml-source';
  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xml,.inputxml,application/xml,text/xml';
  fileInput.hidden = true;
  fileInput.dataset.role = 'linear-piping-inputxml-source-file';

  const profileLabel = doc.createElement('label');
  profileLabel.textContent = 'Analysis profile ';
  const profileSelect = doc.createElement('select');
  profileSelect.dataset.role = 'linear-piping-inputxml-profile';
  for (const profileId of LINEAR_PIPING_INPUTXML_INTAKE_PROFILE_IDS) {
    const option = doc.createElement('option');
    option.value = profileId;
    option.textContent = profileId;
    profileSelect.append(option);
  }
  profileSelect.value = LINEAR_PIPING_INPUTXML_DEFAULT_PROFILE_ID;
  profileLabel.append(profileSelect);

  const unitLabel = doc.createElement('label');
  unitLabel.textContent = 'Explicit source length unit ';
  unitLabel.hidden = true;
  const unitSelect = doc.createElement('select');
  unitSelect.dataset.role = 'linear-piping-inputxml-unit';
  for (const unit of LINEAR_PIPING_INPUTXML_FALLBACK_UNIT_IDS) {
    const option = doc.createElement('option');
    option.value = unit;
    option.textContent = unit;
    unitSelect.append(option);
  }
  unitLabel.append(unitSelect);
  const unitButton = button(doc, 'Authorize Source Unit');
  unitButton.dataset.action = 'authorize-linear-piping-inputxml-unit';
  unitButton.hidden = true;

  const reviewerIdentityLabel = doc.createElement('label');
  reviewerIdentityLabel.textContent = 'Reviewer ';
  reviewerIdentityLabel.hidden = true;
  const reviewerIdentityInput = doc.createElement('input');
  reviewerIdentityInput.type = 'text';
  reviewerIdentityInput.dataset.role = 'linear-piping-inputxml-reviewer';
  reviewerIdentityLabel.append(reviewerIdentityInput);
  const reviewReasonLabel = doc.createElement('label');
  reviewReasonLabel.textContent = 'Acceptance reason ';
  reviewReasonLabel.hidden = true;
  const reviewReasonInput = doc.createElement('input');
  reviewReasonInput.type = 'text';
  reviewReasonInput.dataset.role = 'linear-piping-inputxml-review-reason';
  reviewReasonLabel.append(reviewReasonInput);
  const authorizeButton = button(doc, 'Accept Native Pre-flight Limitations');
  authorizeButton.dataset.action = 'authorize-linear-piping-inputxml-prefea';
  authorizeButton.hidden = true;

  const clearButton = button(doc, 'Clear Source');
  clearButton.dataset.action = 'clear-linear-piping-inputxml-source';

  toolbar.append(
    importButton,
    fileInput,
    profileLabel,
    unitLabel,
    unitButton,
    reviewerIdentityLabel,
    reviewReasonLabel,
    authorizeButton,
    clearButton,
  );

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'linear-piping-inputxml-source-status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'linear-piping-inputxml-source-error';
  error.hidden = true;
  const summaryRoot = doc.createElement('div');
  summaryRoot.dataset.role = 'linear-piping-inputxml-source-summary';
  body.append(toolbar, status, error, summaryRoot);
  section.append(header, body);
  return {
    section,
    importButton,
    fileInput,
    profileSelect,
    unitLabel,
    unitSelect,
    unitButton,
    reviewerIdentityLabel,
    reviewerIdentityInput,
    reviewReasonLabel,
    reviewReasonInput,
    authorizeButton,
    clearButton,
    status,
    error,
    summaryRoot,
  };
}

function renderSourceSummary(doc, root, controller) {
  root.replaceChildren();
  if (!controller.sourceInput) {
    const empty = doc.createElement('p');
    empty.textContent = 'No native InputXML source is loaded.';
    root.append(empty);
    return;
  }
  const rows = [];
  rows.push(['File', controller.sourceInput.fileName]);
  rows.push(['Format', 'CAESAR II InputXML']);
  rows.push(['SHA-256', controller.inspection?.contentSha256 ?? 'Unavailable']);
  if (controller.intake) {
    rows.push(['Length unit', `${controller.intake.unitAuthority.sourceUnit} — ${controller.intake.unitAuthority.authority}`]);
    rows.push(['Profile', controller.intake.requestedProfileId]);
    rows.push(['Requested case', `${LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ROLE} (${controller.intake.requestedCaseIds.join(', ')})`]);
  } else {
    rows.push(['Length unit', controller.inspection?.sourceUnit ?? 'UNIT AUTHORITY REQUIRED']);
  }
  if (controller.preFlight) {
    rows.push(['Pre-flight', controller.preFlight.status]);
    rows.push(['Nodes', String(controller.preFlight.sourceSummary.nodeCount)]);
    rows.push(['Elements', String(controller.preFlight.sourceSummary.elementCount)]);
    rows.push(['Available cases', controller.preFlight.sourceSummary.availableCaseIds.join(', ') || 'None']);
    rows.push(['Pre-FEA authorization', controller.preFlight.solveAuthorized
      ? controller.preFlight.authorization.semanticHash
      : 'NOT AUTHORIZED']);
  } else if (controller.intake) {
    rows.push(['Pre-flight', controller.error ? 'FAILED CLOSED — NOT AUTHORIZED' : 'NOT PREPARED']);
    rows.push(['Pre-FEA authorization', 'NOT AUTHORIZED']);
  }

  const table = doc.createElement('table');
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    table.append(tr);
  }
  root.append(table);

  renderUnitDiagnostics(doc, root, controller.inspection);

  if (controller.preFlight) {
    const findings = controller.preFlight.preparation.findings
      .filter((row) => row.disposition !== 'PASS');
    const heading = doc.createElement('strong');
    heading.textContent = `Review findings — ${findings.length}`;
    root.append(heading);
    if (findings.length === 0) {
      const none = doc.createElement('p');
      none.textContent = 'No BLOCK or CONDITIONAL findings are retained.';
      root.append(none);
    } else {
      const list = doc.createElement('ul');
      for (const finding of findings) {
        const item = doc.createElement('li');
        item.textContent = `${finding.disposition} · ${finding.code} · ${finding.message}`;
        list.append(item);
      }
      root.append(list);
    }
    renderLinearPipingInputXmlDiagnostics(doc, root, controller.preFlight);
  }

  const execution = doc.createElement('p');
  execution.dataset.role = 'linear-piping-inputxml-execution-boundary';
  execution.textContent = 'Execution custody: NOT CONNECTED in P-07/P-08. This source/pre-flight surface never fabricates a legacy run-request JSON or downstream load authority.';
  root.append(execution);
}

/**
 * Render the per-tag unit diagnostics behind a BLOCK.
 *
 * Without this the panel says only "the unit declaration is invalid" and the
 * reader has no way to learn WHICH `<UNITS>` tag failed, what label it
 * carried, or what factor was expected — which makes an otherwise one-line
 * source problem undiagnosable from the UI.
 */
function renderUnitDiagnostics(doc, root, inspection) {
  const diagnostics = inspection?.unitDiagnostics ?? [];
  if (diagnostics.length === 0) return;
  const blocking = diagnostics.filter((row) => row.severity === 'error');
  const section = doc.createElement('div');
  section.dataset.role = 'linear-piping-inputxml-unit-diagnostics';

  const heading = doc.createElement('strong');
  heading.textContent = blocking.length > 0
    ? `Blocking <UNITS> declarations — ${blocking.length}`
    : `<UNITS> notes — ${diagnostics.length}`;
  section.append(heading);

  const list = doc.createElement('ul');
  for (const row of diagnostics) {
    const item = doc.createElement('li');
    item.dataset.severity = row.severity;
    const tag = row.data?.tagName ? `<${row.data.tagName}> ` : '';
    const detail = [];
    if (row.data?.label !== undefined) detail.push(`label ${JSON.stringify(row.data.label)}`);
    if (row.data?.factor !== undefined) detail.push(`declared factor ${row.data.factor}`);
    if (row.data?.expectedFactor !== undefined) detail.push(`expected ${row.data.expectedFactor}`);
    item.textContent = `${row.severity.toUpperCase()} · ${tag}${row.code} — ${row.message}`
      + (detail.length > 0 ? ` (${detail.join('; ')})` : '');
    list.append(item);
  }
  section.append(list);
  root.append(section);
}

function retainSourceInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.fileName !== 'string' || value.fileName.trim() === ''
    || typeof value.content !== 'string' || value.content.trim() === '') {
    throw workflowError(
      'PIPING_INPUTXML_SOURCE_FILE_REQUIRED',
      'Native InputXML source requires a non-empty fileName and exact text content.',
    );
  }
  return Object.freeze({ fileName: value.fileName, content: value.content });
}

function sourceStatus(inspection, preFlight, intake) {
  if (!inspection) return 'EMPTY';
  if (preFlight) return preFlight.status;
  if (intake) return 'SOURCE_AUTHORIZED_PREFLIGHT_NOT_READY';
  return inspection.status;
}

function button(doc, label) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  return value;
}

function workflowError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_SOURCE_WORKFLOW';
  return error;
}

function errorMessage(error) {
  const prefix = error?.code ? `${error.code}: ` : '';
  return `${prefix}${error?.message ?? String(error)}`;
}
