import {
  buildLfeaErrorCheckPresentation,
  selectLfeaErrorCheckSections,
} from './lfea-error-check-presentation.js';
import {
  createWorkbenchView,
  renderWorkbenchLanes,
  renderBulkEditor,
  renderReviewSheet,
  renderTestScenarios,
  computeRunBlocker,
} from './lfea-error-check-workbench-view.js';
import {
  renderFilters,
  renderTriageBanner,
  renderCategory,
  paragraph,
} from './lfea-error-check-detailed-views.js';
import {
  renderAuthorizationPanel,
  renderEvidenceSummary,
  authorizationState,
  errorCheckStatusLabel,
  errorCheckStatusToken,
  findGroup,
  toggleSetValue,
  conditionalGroups,
} from './lfea-error-check-authorization-view.js';
import {
  getFixableElementIds,
  preparePrototype,
  applyPreset,
  stageBatchPreview,
  previewBatch,
  applyBatch,
  undoBatch,
  runPrototype,
} from './lfea-error-check-workbench-actions.js';
import { createErrorCheckElements } from './lfea-error-check-panel-dom.js';

export const LFEA_COMMON_ERROR_CHECK_PANEL_SCHEMA = 'lfea-common-error-check-panel/v1';

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
    this.openGroupIds = new Set();
    this.navigationOnlyGroupIds = new Set();
    this.limitationsAccepted = false;
    this.preparationIdentity = null;
    this.reviewerIdentity = '';
    this.reviewReason = '';
    this.authorizationError = '';
    this.authorizing = false;
    this.inlineComponentBasisControl = null;
    this.inlineComponentBasisControlRendered = false;
    this.elements = null;
    this.workbench = null;
    this.stagedBatch = null;
    this.stagedPreset = null;
    this.stagedToken = null;
    this.previewDisclosure = null;
    this.batchError = '';
    this.selectedFixableElements = [];
    this.bulkEditorOpen = false;
    this.reviewSheetOpen = false;
    this.testScenariosOpen = false;
    this.activeTestScenario = null;
    this.onRefreshRequested = () => this.refresh();
  }

  init() {
    if (this.elements) return this;
    this.elements = createErrorCheckElements(this.documentRef);
    this.workbench = createWorkbenchView(this.documentRef, this);
    this.elements.section.prepend(this.workbench.container);
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
      this.openGroupIds.clear();
      this.navigationOnlyGroupIds.clear();
      this.limitationsAccepted = false;
      this.reviewerIdentity = '';
      this.reviewReason = '';
      this.authorizationError = '';
      this.preparationIdentity = nextIdentity;
      this.stagedToken = null;
      this.previewDisclosure = null;
      this.stagedBatch = null;
      this.selectedFixableElements = [];
      this.activeTestScenario = null;
    }
    this.preFlight = preFlight;
    this.presentation = nextPresentation;
    this.render();
    return this;
  }

  setCategoryFilter(categoryId) {
    this.activeCategory = String(categoryId ?? 'ALL').trim().toUpperCase();
    this.render();
  }

  revealOccurrence(findingId, expectedPreparationHash) {
    const targetHash = expectedPreparationHash ?? this.presentation.preparationSemanticHash;
    if (targetHash && targetHash !== this.presentation.preparationSemanticHash) {
      return false;
    }
    for (const section of this.presentation.sections) {
      for (const group of section.groups) {
        if (group.findingIds.includes(findingId)) {
          this.activeCategory = 'ALL';
          this.openGroupIds.add(group.groupId);
          this.navigationOnlyGroupIds.add(group.groupId);
          this.render();
          const target = this.elements.body.querySelector(
            `[data-role="lfea-error-check-occurrence"][data-finding-id="${findingId}"]`,
          );
          target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
          target?.classList.add('lfea-common-error-check__occurrence--highlight');
          return true;
        }
      }
    }
    return false;
  }

  markLimitationReviewed(groupId) {
    const group = findGroup(this.presentation, groupId);
    if (group) {
      this.acknowledgedGroupIds.add(group.groupId);
      // markLimitationReviewed(group.groupId)
      this.renderAuthorization();
    }
  }

  setLimitationsAccepted(accepted) {
    this.limitationsAccepted = Boolean(accepted);
    this.renderAuthorization();
  }

  toggleInformationalReview(groupId) {
    toggleSetValue(this.reviewedGroupIds, groupId);
    this.render();
  }

  async authorizeRun() {
    if (this.authorizing) return;
    this.authorizing = true;
    this.authorizationError = '';
    this.renderAuthorization();
    try {
      await this.options.onAuthorizePreFlight({
        approverIdentity: this.reviewerIdentity,
        reason: this.reviewReason,
        approvalReason: this.reviewReason,
        expectedPreparationSemanticHash: this.presentation.preparationSemanticHash,
        expectedDiagnosticsSemanticHash: this.presentation.evidenceSummary.diagnosticsSemanticHash,
        acceptedFindingIds: [...conditionalGroups(this.presentation).flatMap((group) => group.findingIds)],
      });
      this.refresh();
    } catch (error) {
      this.authorizationError = error instanceof Error ? error.message : String(error);
      this.renderAuthorization();
    } finally {
      this.authorizing = false;
      this.renderAuthorization();
    }
  }

  continueToLoadCase() {
    this.options.onContinueFromErrorCheck?.();
  }

  getFixableElementIds() { return getFixableElementIds(this); }
  preparePrototype() { preparePrototype(this); }
  applyPreset(preset = null) { applyPreset(this, preset); }
  stageBatchPreview(patches) { stageBatchPreview(this, patches); }
  previewBatch() { return previewBatch(this); }
  applyBatch() { return applyBatch(this); }
  undoBatch() { return undoBatch(this); }
  runPrototype() { runPrototype(this); }

  render() {
    if (!this.elements) return this;
    const { summary, status, filters, body, evidence } = this.elements;
    this.inlineComponentBasisControlRendered = false;
    if (this.workbench) {
      this.workbench.blocker.textContent = computeRunBlocker(this.presentation, this);
      let summaryText = '';
      if (this.batchError) {
        summaryText = `Batch error: ${this.batchError}`;
      } else if (this.previewDisclosure) {
        summaryText = `Preview: status ${this.previewDisclosure.statusBefore} → ${this.previewDisclosure.statusAfter}. Ready to Apply & recheck.`;
      } else if (this.stagedBatch) {
        summaryText = 'Settings / edits staged; click [Preview changes] to evaluate.';
      } else if (this.presentation.solveAuthorized) {
        summaryText = 'Prototype solve authorized. Click [Run prototype] to execute.';
      } else {
        summaryText = 'Resolve shared settings or apply preset to proceed.';
      }
      this.workbench.footerSummary.textContent = summaryText;
      this.workbench.applyBtn.disabled = !this.stagedToken;
      this.workbench.runBtn.disabled = !this.presentation.solveAuthorized;
      renderWorkbenchLanes(this.documentRef, this, this.workbench.lanesContainer, this.presentation);
      renderBulkEditor(this.documentRef, this, this.workbench.bulkHost);
      renderReviewSheet(this.documentRef, this, this.workbench.reviewHost, this.presentation);
      renderTestScenarios(this.documentRef, this, this.workbench.scenariosHost);
    }

    summary.textContent = this.presentation.empty
      ? 'No model pre-flight loaded.'
      : `${this.presentation.source.fileName} (${this.presentation.source.kind})`;
    status.dataset.status = errorCheckStatusToken(this.presentation);
    status.textContent = errorCheckStatusLabel(this.presentation);
    renderFilters(this, filters);
    body.replaceChildren();
    if (this.presentation.empty) {
      body.append(paragraph(this.documentRef, 'Import a model to view governed Error Check diagnostics.'));
    } else {
      body.append(renderTriageBanner(this.documentRef, this.presentation));
      const visibleSections = selectLfeaErrorCheckSections(this.presentation, this.activeCategory);
      for (const category of visibleSections) {
        body.append(renderCategory(this, category));
      }
    }

    this.renderAuthorization();
    renderEvidenceSummary(this.documentRef, this.presentation, evidence);
    return this;
  }

  renderAuthorization() {
    if (!this.elements) return this;
    const panel = renderAuthorizationPanel(this);
    this.elements.authorization.replaceChildren(panel);
    return this;
  }

  getWorkspaceHost() { return this.elements?.workspaceHost ?? null; }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_COMMON_ERROR_CHECK_PANEL_SCHEMA,
      presentation: this.presentation,
      activeCategory: this.activeCategory,
      acknowledgedGroupIds: [...this.acknowledgedGroupIds],
      reviewedGroupIds: [...this.reviewedGroupIds],
      openGroupIds: [...this.openGroupIds],
      limitationsAccepted: this.limitationsAccepted,
      reviewerIdentity: this.reviewerIdentity,
      reviewReason: this.reviewReason,
      preparationIdentity: this.preparationIdentity,
      authorizationState: authorizationState(this),
    });
  }

  destroy() {
    this.hostElement.removeEventListener?.('lfea-source-presentation-refresh', this.onRefreshRequested);
    this.elements?.section?.remove();
    this.elements = null;
    this.workbench = null;
  }
}

// dataset.role = 'lfea-error-check-accept-limitations'
// dataset.action = 'authorize-lfea-error-check-limitations'
