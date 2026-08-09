import {
  compileLinearPipingPresentation,
  createLinearPipingAuditJsonExport,
  createQualifiedLinearPipingEngineeringExports,
} from '../core/linear-piping-presentation/index.js';
import { requireLinearPipingQualifiedApplicationResult } from '../core/linear-piping-code-application/index.js';
import { renderLinearPipingResultsView } from './linear-piping-results-view.js';
import { runLinearPipingWorkbenchAnalysis } from './linear-piping-run-analysis.js';
import {
  LINEAR_PIPING_PRERUN_PROFILE_IDS,
  authorizeLinearPipingPreRunCheck,
  checkLinearPipingRunRequest,
} from './linear-piping-prerun-check.js';
import { renderLinearPipingPreRunView } from './linear-piping-prerun-view.js';

export const LINEAR_PIPING_WORKSPACE_PACKAGE_SCHEMA = 'linear-piping-workspace-result-package/v1';
export const LINEAR_PIPING_WORKSPACE_PACKAGE_KEYS = Object.freeze([
  'schema',
  'applicationResult',
  'analysisResults',
  'interfaceSet',
  'interfaceRecoveries',
  'nozzleAssessments',
  'b31Application',
]);

/**
 * Mounts the current-only piping result surface in the active LFEA view.
 *
 * The controller runs governed pre-FEA diagnostics/preparation/authorization,
 * imports sealed Phase 4/5 records, or delegates an authorized InputXML request
 * to the existing production orchestration. It renders governed outcomes but
 * does not implement model compilation, solving, recovery, interface mechanics,
 * nozzle assessment or code stress.
 */
export function mountLinearPipingResultsWorkbench(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Linear piping results integration requires the application root.');
  }
  const panelContainer = applicationRoot.querySelector(
    '[data-role="linear-piping-consumer-root"]',
  ) ?? applicationRoot.querySelector(
    '[data-panel="properties"] .panel-collapsible-content',
  );
  if (!panelContainer) {
    throw new TypeError('Linear piping results integration could not find a mount root.');
  }
  const documentRef = options.documentRef ?? applicationRoot.ownerDocument ?? document;
  const urlApi = options.urlApi ?? documentRef.defaultView?.URL ?? globalThis.URL;
  const controller = new LinearPipingResultsWorkbenchController(
    panelContainer,
    documentRef,
    urlApi,
  );
  controller.init();
  return controller;
}

export class LinearPipingResultsWorkbenchController {
  constructor(panelContainer, documentRef, urlApi) {
    if (!panelContainer || typeof panelContainer.append !== 'function') {
      throw new TypeError('Linear piping results panel container is required.');
    }
    if (!documentRef || typeof documentRef.createElement !== 'function') {
      throw new TypeError('Linear piping results document is required.');
    }
    this.panelContainer = panelContainer;
    this.documentRef = documentRef;
    this.urlApi = urlApi;
    this.applicationResult = null;
    this.presentation = null;
    this.liveRunResult = null;
    this.runStatus = 'IDLE';
    this.runFailure = null;
    this.preRunCheck = null;
    this.preRunRequest = null;
    this.elements = null;
    this.message = 'Run Analysis requires a current governed pre-run authorization, or import a sealed result package.';
    this.error = '';
    this.initialized = false;
  }

  init() {
    if (this.initialized) return this;
    this.elements = createWorkbenchSection(this.documentRef);
    this.panelContainer.append(this.elements.section);
    this.elements.preRunButton.addEventListener('click', () => this.elements.preRunFileInput.click());
    this.elements.preRunFileInput.addEventListener('change', () => this.checkSelectedFile());
    this.elements.profileSelect.addEventListener('change', () => this.invalidatePreRun(
      'Pre-run authorization invalidated because the requested profile changed.',
    ));
    this.elements.authorizeButton.addEventListener('click', () => this.authorizePreRun());
    this.elements.runButton.addEventListener('click', () => this.elements.runFileInput.click());
    this.elements.runFileInput.addEventListener('change', () => this.runSelectedFile());
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', () => this.importSelectedFile());
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.elements.auditButton.addEventListener('click', () => this.downloadAuditExport());
    this.elements.engineeringButton.addEventListener('click', () => this.downloadEngineeringExports());
    this.initialized = true;
    this.render();
    return this;
  }

  loadPackage(value, options = {}) {
    try {
      const accepted = requireWorkspacePackage(value);
      const applicationResult = requireLinearPipingQualifiedApplicationResult(
        accepted.applicationResult,
      );
      const presentation = compileLinearPipingPresentation({
        applicationResult,
        analysisResults: accepted.analysisResults,
        interfaceSet: accepted.interfaceSet,
        interfaceRecoveries: accepted.interfaceRecoveries,
        nozzleAssessments: accepted.nozzleAssessments,
        b31Application: accepted.b31Application,
      });
      this.applicationResult = applicationResult;
      this.presentation = presentation;
      if (options.source !== 'RUN') {
        this.liveRunResult = null;
        this.runStatus = 'IDLE';
        this.runFailure = null;
      }
      this.error = '';
      this.message = [
        `Loaded ${presentation.applicationId}.`,
        `Status ${presentation.status}.`,
        `Export ${presentation.exportEligibility}.`,
      ].join(' ');
      this.render();
      return presentation;
    } catch (error) {
      this.clearCurrentResult();
      if (options.source !== 'RUN') {
        this.liveRunResult = null;
        this.runStatus = 'IDLE';
        this.runFailure = null;
        this.message = 'No current linear piping result package is loaded.';
        this.error = errorMessage(error);
        this.render();
      }
      throw error;
    }
  }

  runRequest(value) {
    if (!this.preRunCheck?.solveAuthorized || !this.preRunCheck.gate) {
      const error = new TypeError('Run Analysis requires a current sealed pre-FEA authorization.');
      error.code = 'PIPING_RUN_GATE_AUTHORIZATION_REQUIRED';
      error.evidence = this.preRunCheck === null ? null : {
        status: this.preRunCheck.status,
        gateSemanticHash: this.preRunCheck.gateSemanticHash,
      };
      error.analysisStage = 'PRE_FEA_RUN_GATE';
      this.blockRun(error, error.analysisStage);
      throw error;
    }
    this.beginRun();
    try {
      const runResult = runLinearPipingWorkbenchAnalysis(value, this.preRunCheck.gate);
      const application = runResult.multicaseApplication;
      const presentation = this.loadPackage(workspacePackageFromApplication(application), {
        source: 'RUN',
      });
      this.liveRunResult = runResult;
      this.runStatus = 'SUCCEEDED';
      this.runFailure = null;
      this.error = '';
      this.message = [
        `Run Analysis completed for ${presentation.applicationId}.`,
        `Gate ${this.preRunCheck.gateSemanticHash}.`,
        `Status ${presentation.status}.`,
        `Export ${presentation.exportEligibility}.`,
      ].join(' ');
      this.render();
      return runResult;
    } catch (error) {
      this.blockRun(error, error?.analysisStage ?? 'RUN_ANALYSIS');
      throw error;
    }
  }

  clear() {
    this.clearCurrentResult();
    this.liveRunResult = null;
    this.runStatus = 'IDLE';
    this.runFailure = null;
    this.preRunCheck = null;
    this.preRunRequest = null;
    this.error = '';
    this.message = 'Linear piping workbench cleared.';
    if (this.elements) {
      this.elements.fileInput.value = '';
      this.elements.runFileInput.value = '';
      this.elements.preRunFileInput.value = '';
      this.elements.reviewerIdentityInput.value = '';
      this.elements.reviewReasonInput.value = '';
    }
    this.render();
  }

  getSnapshot() {
    return Object.freeze({
      status: this.presentation ? 'CURRENT' : 'EMPTY',
      runStatus: this.runStatus,
      runFailure: this.runFailure,
      preRunStatus: this.preRunCheck?.status ?? 'NOT_RUN',
      preRunSolveAuthorized: this.preRunCheck?.solveAuthorized ?? false,
      preRunGateSemanticHash: this.preRunCheck?.gateSemanticHash ?? null,
      preRunRequestSemanticHash: this.preRunCheck?.runRequestSemanticHash ?? null,
      preRunSourceBundleSemanticHashes: this.preRunCheck?.sourceBundleSemanticHashes ?? Object.freeze([]),
      preRunAuthorizationSemanticHashes: this.preRunCheck?.authorizationSemanticHashes ?? Object.freeze([]),
      applicationId: this.presentation?.applicationId ?? null,
      applicationResultSemanticHash: this.presentation?.applicationResultSemanticHash ?? null,
      presentationSemanticHash: this.presentation?.semanticHash ?? null,
      presentationEvidenceHash: this.presentation?.evidenceHash ?? null,
      qualificationStatus: this.presentation?.status ?? null,
      exportEligibility: this.presentation?.exportEligibility ?? null,
      message: this.message,
      error: this.error || null,
    });
  }

  getPresentation() {
    return this.presentation;
  }

  getLiveRunResult() {
    return this.liveRunResult;
  }

  createAuditExport() {
    this.requireCurrent();
    return createLinearPipingAuditJsonExport(this.presentation, this.applicationResult);
  }

  createEngineeringExports() {
    this.requireCurrent();
    return createQualifiedLinearPipingEngineeringExports(
      this.presentation,
      this.applicationResult,
    );
  }

  downloadAuditExport() {
    this.attempt(() => {
      const record = this.createAuditExport();
      downloadRecord(this.documentRef, this.urlApi, record);
      this.message = `Downloaded ${record.fileName}.`;
    });
  }

  downloadEngineeringExports() {
    this.attempt(() => {
      const records = this.createEngineeringExports();
      for (const record of records) downloadRecord(this.documentRef, this.urlApi, record);
      this.message = `Downloaded ${records.length} qualified engineering exports.`;
    });
  }

  /**
   * Run governed pre-FEA diagnostics, preparation and authorization policy.
   * No solver runtime is created here.
   */
  checkRequest(value) {
    try {
      const retainedRequest = cloneJsonRecord(value);
      this.preRunCheck = checkLinearPipingRunRequest(retainedRequest, {
        requestedProfileId: this.elements?.profileSelect.value,
      });
      this.preRunRequest = retainedRequest;
      this.error = '';
      if (this.preRunCheck.status === 'PASS') {
        this.message = [
          `Pre-run gate PASS for ${this.preRunCheck.applicationId}.`,
          `Automatic PASS authorization sealed as ${this.preRunCheck.gateSemanticHash}.`,
        ].join(' ');
      } else if (this.preRunCheck.status === 'WARN') {
        this.message = [
          `Pre-run gate WARN for ${this.preRunCheck.applicationId}.`,
          'Run remains disabled until an engineer explicitly accepts the complete disclosed limitation set.',
        ].join(' ');
      } else {
        this.message = [
          `Pre-run gate BLOCK for ${this.preRunCheck.applicationId}.`,
          'Run is disabled and BLOCK has no authorization bypass.',
        ].join(' ');
      }
      this.render();
      return this.preRunCheck;
    } catch (error) {
      this.preRunCheck = null;
      this.preRunRequest = null;
      this.error = errorMessage(error);
      this.message = 'Pre-run check rejected the supplied request.';
      this.render();
      throw error;
    }
  }

  authorizePreRun() {
    try {
      this.preRunCheck = authorizeLinearPipingPreRunCheck(this.preRunCheck, {
        approverIdentity: this.elements?.reviewerIdentityInput.value ?? '',
        reason: this.elements?.reviewReasonInput.value ?? '',
      });
      this.error = '';
      this.message = [
        `Conditional authorization sealed for ${this.preRunCheck.applicationId}.`,
        `Gate ${this.preRunCheck.gateSemanticHash}.`,
        `Accepted limitations: ${this.preRunCheck.cases
          .flatMap((entry) => entry.limitationsAccepted).join(', ') || 'none'}.`,
      ].join(' ');
      this.render();
      return this.preRunCheck;
    } catch (error) {
      this.error = errorMessage(error);
      this.message = 'Conditional authorization was rejected.';
      this.render();
      throw error;
    }
  }

  getPreRunCheck() {
    return this.preRunCheck;
  }

  async checkSelectedFile() {
    const file = this.elements?.preRunFileInput.files?.[0];
    if (!file) return;
    let value;
    try {
      value = JSON.parse(await file.text());
    } catch (error) {
      this.preRunCheck = null;
      this.preRunRequest = null;
      this.error = errorMessage(error);
      this.message = 'The supplied pre-run file is not valid JSON.';
      this.render();
      if (this.elements) this.elements.preRunFileInput.value = '';
      return;
    }
    try {
      this.checkRequest(value);
    } catch {
      // checkRequest already recorded and rendered the rejection.
    } finally {
      if (this.elements) this.elements.preRunFileInput.value = '';
    }
  }

  async runSelectedFile() {
    const file = this.elements?.runFileInput.files?.[0];
    if (!file) return;
    try {
      const value = JSON.parse(await file.text());
      this.runRequest(value);
    } catch (error) {
      if (this.runStatus !== 'BLOCKED') this.blockRun(error, 'REQUEST_JSON_PARSE');
    } finally {
      if (this.elements) this.elements.runFileInput.value = '';
    }
  }

  async importSelectedFile() {
    const file = this.elements?.fileInput.files?.[0];
    if (!file) return;
    try {
      const value = JSON.parse(await file.text());
      this.loadPackage(value);
    } catch (error) {
      this.clearCurrentResult();
      this.liveRunResult = null;
      this.runStatus = 'IDLE';
      this.runFailure = null;
      this.message = 'Imported package was rejected; prior results were cleared.';
      this.error = errorMessage(error);
      this.render();
    } finally {
      if (this.elements) this.elements.fileInput.value = '';
    }
  }

  render() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    const running = this.runStatus === 'RUNNING';
    const warnPending = this.preRunCheck?.status === 'WARN' && !this.preRunCheck.solveAuthorized;
    const runAuthorized = Boolean(this.preRunCheck?.solveAuthorized && this.preRunRequest);
    this.elements.error.hidden = !this.error || this.runStatus === 'BLOCKED';
    this.elements.error.textContent = this.error;
    renderRunOutcome(this.documentRef, this.elements.runOutcome, this.runStatus, this.runFailure);
    renderLinearPipingPreRunView(this.elements.preRunRoot, this.preRunCheck);
    this.elements.preRunRoot.hidden = !this.preRunCheck;
    const hasCurrent = Boolean(this.presentation && this.applicationResult);
    this.elements.preRunButton.disabled = running;
    this.elements.profileSelect.disabled = running;
    this.elements.reviewerIdentityLabel.hidden = !warnPending;
    this.elements.reviewReasonLabel.hidden = !warnPending;
    this.elements.authorizeButton.hidden = !warnPending;
    this.elements.authorizeButton.disabled = running || !warnPending;
    this.elements.runButton.disabled = running || !runAuthorized;
    this.elements.importButton.disabled = running;
    this.elements.clearButton.disabled = running
      || (!hasCurrent && this.runStatus === 'IDLE' && !this.preRunCheck);
    this.elements.auditButton.disabled = running || !hasCurrent;
    this.elements.engineeringButton.disabled = running || !hasCurrent
      || this.presentation.exportEligibility !== 'ENGINEERING_EXPORT_ALLOWED';
    this.elements.section.dataset.current = hasCurrent ? 'true' : 'false';
    this.elements.section.dataset.runStatus = this.runStatus;
    this.elements.section.dataset.preRunStatus = this.preRunCheck?.status ?? 'NOT_RUN';
    this.elements.section.dataset.runAuthorized = runAuthorized ? 'true' : 'false';
    this.elements.section.dataset.qualificationStatus = this.presentation?.status ?? 'EMPTY';
    if (hasCurrent) {
      renderLinearPipingResultsView(
        this.elements.resultsRoot,
        this.presentation,
        this.applicationResult,
      );
      return;
    }
    const empty = this.documentRef.createElement('p');
    empty.className = 'linear-piping-results-workbench__empty';
    empty.textContent = 'No CURRENT sealed piping application result is loaded.';
    this.elements.resultsRoot.replaceChildren(empty);
  }

  attempt(action) {
    try {
      action();
      this.error = '';
    } catch (error) {
      this.error = errorMessage(error);
    }
    this.render();
  }

  requireCurrent() {
    if (!this.presentation || !this.applicationResult) {
      const error = new TypeError('A CURRENT sealed linear piping result package is required.');
      error.code = 'PIPING_WORKSPACE_RESULT_REQUIRED';
      throw error;
    }
  }

  destroy() {
    this.clearCurrentResult();
    this.liveRunResult = null;
    this.runStatus = 'IDLE';
    this.runFailure = null;
    this.preRunCheck = null;
    this.preRunRequest = null;
    this.error = '';
    this.message = '';
    this.elements?.section.remove();
    this.elements = null;
    this.initialized = false;
  }

  beginRun() {
    this.clearCurrentResult();
    this.liveRunResult = null;
    this.runStatus = 'RUNNING';
    this.runFailure = null;
    this.error = '';
    this.message = `Run Analysis is executing under gate ${this.preRunCheck?.gateSemanticHash ?? 'UNKNOWN'}.`;
    this.render();
  }

  blockRun(error, analysisStage) {
    this.clearCurrentResult();
    this.liveRunResult = null;
    this.runStatus = 'BLOCKED';
    this.runFailure = runFailureRecord(error, analysisStage);
    this.message = `Run Analysis blocked at ${this.runFailure.analysisStage}.`;
    this.error = errorMessage(error);
    this.render();
  }

  invalidatePreRun(message) {
    if (this.runStatus === 'RUNNING') return;
    this.preRunCheck = null;
    this.preRunRequest = null;
    this.error = '';
    this.message = message;
    this.render();
  }

  clearCurrentResult() {
    this.applicationResult = null;
    this.presentation = null;
  }
}

function requireWorkspacePackage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failPackage('Result package must be a record.', 'PIPING_WORKSPACE_PACKAGE_RECORD_REQUIRED');
  }
  const actual = Object.keys(value).sort(compareAscii);
  const expected = [...LINEAR_PIPING_WORKSPACE_PACKAGE_KEYS].sort(compareAscii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failPackage('Result package keys are invalid.', 'PIPING_WORKSPACE_PACKAGE_KEYS_INVALID');
  }
  if (value.schema !== LINEAR_PIPING_WORKSPACE_PACKAGE_SCHEMA) {
    failPackage('Result package schema is invalid.', 'PIPING_WORKSPACE_PACKAGE_SCHEMA_INVALID');
  }
  return Object.freeze({ ...value });
}

function workspacePackageFromApplication(application) {
  return Object.freeze({
    schema: LINEAR_PIPING_WORKSPACE_PACKAGE_SCHEMA,
    applicationResult: application.applicationResult,
    analysisResults: application.cases.map((entry) => (
      entry.inputXmlAnalysisContext.sourceAnalysisContext.analysisResult
    )),
    interfaceSet: application.interfaceSet,
    interfaceRecoveries: application.interfaceRecoveries,
    nozzleAssessments: application.nozzleGoverningAssessments,
    b31Application: application.b31Application,
  });
}

function runFailureRecord(error, analysisStage) {
  return Object.freeze({
    analysisStage,
    code: error?.code ?? 'PIPING_WORKBENCH_RUN_FAILED',
    message: error?.message ?? String(error),
    evidence: error?.evidence ?? null,
  });
}

function renderRunOutcome(doc, root, status, failure) {
  root.dataset.status = status;
  root.hidden = status === 'IDLE';
  if (status === 'IDLE') {
    root.replaceChildren();
    return;
  }
  const heading = doc.createElement('strong');
  heading.textContent = status;
  if (status === 'RUNNING') {
    const detail = doc.createElement('p');
    detail.textContent = 'The authorized production compile, solve, recovery and application chain is running.';
    root.replaceChildren(heading, detail);
    return;
  }
  if (status === 'SUCCEEDED') {
    const detail = doc.createElement('p');
    detail.textContent = 'A sealed application result was produced under the retained pre-FEA authorization receipt.';
    root.replaceChildren(heading, detail);
    return;
  }
  const stage = doc.createElement('p');
  stage.textContent = `Stage: ${failure?.analysisStage ?? 'RUN_ANALYSIS'}`;
  const code = doc.createElement('p');
  code.textContent = `Code: ${failure?.code ?? 'PIPING_WORKBENCH_RUN_FAILED'}`;
  const message = doc.createElement('p');
  message.textContent = `Message: ${failure?.message ?? 'Run Analysis failed.'}`;
  const children = [heading, stage, code, message];
  if (failure?.evidence !== null && failure?.evidence !== undefined) {
    const evidence = doc.createElement('pre');
    evidence.textContent = JSON.stringify(failure.evidence, null, 2);
    children.push(evidence);
  }
  root.replaceChildren(...children);
}

function createWorkbenchSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'linear-piping-results';
  section.dataset.role = 'linear-piping-results-workbench';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'Linear Piping FEA Results';
  const headerActions = doc.createElement('div');
  headerActions.className = 'accordion-header-actions';
  const toggle = doc.createElement('span');
  toggle.className = 'accordion-toggle-icon';
  toggle.textContent = '▼';
  headerActions.append(toggle);
  header.append(title, headerActions);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'linear-piping-results-workbench__toolbar';
  const profileLabel = doc.createElement('label');
  profileLabel.className = 'linear-piping-results-workbench__profile';
  profileLabel.textContent = 'Pre-run profile ';
  const profileSelect = doc.createElement('select');
  profileSelect.dataset.role = 'linear-piping-prerun-profile';
  for (const profileId of LINEAR_PIPING_PRERUN_PROFILE_IDS) {
    const option = doc.createElement('option');
    option.value = profileId;
    option.textContent = profileId;
    profileSelect.append(option);
  }
  profileSelect.value = LINEAR_PIPING_PRERUN_PROFILE_IDS[0];
  profileLabel.append(profileSelect);
  const preRunButton = button(doc, 'Pre-Run Check');
  preRunButton.dataset.action = 'check-linear-piping-analysis';
  const preRunFileInput = doc.createElement('input');
  preRunFileInput.type = 'file';
  preRunFileInput.accept = '.json,application/json';
  preRunFileInput.hidden = true;
  preRunFileInput.dataset.role = 'linear-piping-prerun-request-file';
  const reviewerIdentityLabel = doc.createElement('label');
  reviewerIdentityLabel.textContent = 'Reviewer ';
  reviewerIdentityLabel.hidden = true;
  const reviewerIdentityInput = doc.createElement('input');
  reviewerIdentityInput.type = 'text';
  reviewerIdentityInput.dataset.role = 'linear-piping-prerun-reviewer';
  reviewerIdentityLabel.append(reviewerIdentityInput);
  const reviewReasonLabel = doc.createElement('label');
  reviewReasonLabel.textContent = 'Acceptance reason ';
  reviewReasonLabel.hidden = true;
  const reviewReasonInput = doc.createElement('input');
  reviewReasonInput.type = 'text';
  reviewReasonInput.dataset.role = 'linear-piping-prerun-review-reason';
  reviewReasonLabel.append(reviewReasonInput);
  const authorizeButton = button(doc, 'Accept WARN Limitations');
  authorizeButton.dataset.action = 'authorize-linear-piping-analysis';
  authorizeButton.hidden = true;
  const runButton = button(doc, 'Run Analysis');
  runButton.dataset.action = 'run-linear-piping-analysis';
  const runFileInput = doc.createElement('input');
  runFileInput.type = 'file';
  runFileInput.accept = '.json,application/json';
  runFileInput.hidden = true;
  runFileInput.dataset.role = 'linear-piping-run-request-file';
  const analyzerLink = doc.createElement('a');
  analyzerLink.className = 'linear-piping-results-workbench__analyzer-link';
  analyzerLink.dataset.role = 'linear-piping-analyzer-link';
  analyzerLink.href = 'analyze.html';
  analyzerLink.target = '_blank';
  analyzerLink.rel = 'noopener';
  analyzerLink.textContent = 'Open InputXML Analyzer';
  const importButton = button(doc, 'Import Sealed Result Package');
  importButton.dataset.action = 'import-linear-piping-results';
  const clearButton = button(doc, 'Clear');
  clearButton.dataset.action = 'clear-linear-piping-results';
  const auditButton = button(doc, 'Download Audit JSON');
  auditButton.dataset.action = 'download-linear-piping-audit';
  const engineeringButton = button(doc, 'Download Engineering CSVs');
  engineeringButton.dataset.action = 'download-linear-piping-engineering';
  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  fileInput.dataset.role = 'linear-piping-result-package-file';
  toolbar.append(
    profileLabel,
    preRunButton,
    preRunFileInput,
    reviewerIdentityLabel,
    reviewReasonLabel,
    authorizeButton,
    runButton,
    runFileInput,
    importButton,
    clearButton,
    auditButton,
    engineeringButton,
    fileInput,
    analyzerLink,
  );

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'linear-piping-results-status';
  status.setAttribute('aria-live', 'polite');
  const runOutcome = doc.createElement('section');
  runOutcome.className = 'linear-piping-results-workbench__run-outcome';
  runOutcome.dataset.role = 'linear-piping-run-outcome';
  runOutcome.setAttribute('aria-live', 'assertive');
  runOutcome.hidden = true;
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'linear-piping-results-error';
  error.hidden = true;
  const preRunRoot = doc.createElement('div');
  preRunRoot.className = 'linear-piping-results-workbench__prerun';
  preRunRoot.dataset.role = 'linear-piping-prerun-root';
  preRunRoot.hidden = true;
  const resultsRoot = doc.createElement('div');
  resultsRoot.className = 'linear-piping-results-workbench__results';
  resultsRoot.dataset.role = 'linear-piping-results-root';
  body.append(toolbar, status, runOutcome, error, preRunRoot, resultsRoot);
  section.append(header, body);
  return {
    section,
    profileSelect,
    preRunButton,
    preRunFileInput,
    preRunRoot,
    reviewerIdentityLabel,
    reviewerIdentityInput,
    reviewReasonLabel,
    reviewReasonInput,
    authorizeButton,
    runButton,
    runFileInput,
    importButton,
    clearButton,
    auditButton,
    engineeringButton,
    fileInput,
    status,
    runOutcome,
    error,
    resultsRoot,
  };
}

function button(doc, label) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  return value;
}

function downloadRecord(doc, urlApi, record) {
  if (!urlApi || typeof urlApi.createObjectURL !== 'function'
    || typeof urlApi.revokeObjectURL !== 'function') {
    const error = new TypeError('Browser object URL API is unavailable.');
    error.code = 'PIPING_WORKSPACE_DOWNLOAD_API_UNAVAILABLE';
    throw error;
  }
  const blob = new Blob([record.content], { type: `${record.mediaType};charset=utf-8` });
  const href = urlApi.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = href;
  anchor.download = record.fileName;
  anchor.hidden = true;
  const parent = doc.body ?? doc.documentElement;
  parent.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    urlApi.revokeObjectURL(href);
  }
}

function cloneJsonRecord(value) {
  return JSON.parse(JSON.stringify(value));
}

function failPackage(message, code) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

function errorMessage(error) {
  const prefix = error?.code ? `${error.code}: ` : '';
  return `${prefix}${error?.message ?? String(error)}`;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
