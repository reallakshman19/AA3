import { TopologyEdit3DViewController as ReviewResponseController } from './topology-edit-3d-review-response-controller.js';
import { axisDirection, isTopologyEditTextControl, topologyEditKeyboardNudge, TopologyEditInteractionControllerRuntime } from './viewport-productivity/topology-edit-interaction-controller-runtime.js';
import { assertCurrentTopologyEditInteractionPreview, createTopologyEditNudgeSessionPreview, createTopologyEditNumericSessionPreview, selectedTopologyEditNodeContext, verifyTopologyEditInteractionAcceptance } from './viewport-productivity/topology-edit-interaction-session.js';
import { readTopologyEditInteractionValues, renderTopologyEditInteractionPanel, topologyEditInteractionModeValues, updateTopologyEditInteractionPanelState } from './viewport-productivity/topology-edit-interaction-panel.js';
import { installTopologyEditTangencyClockingSnapIndex } from './viewport-interaction/topology-edit-tangency-clocking-snap-index.js';

const AUTO_PREVIEW_ROLES = new Set([
  'interaction-value-x', 'interaction-value-y', 'interaction-value-z',
  'interaction-magnitude', 'interaction-axis',
]);

export class TopologyEdit3DViewController extends ReviewResponseController {
  constructor(eventBus, lifecycleOptions = {}) {
    super(eventBus, lifecycleOptions);
    this.interactionElement = null;
    this.interactionPreview = null;
    this.interactionAcceptance = null;
    this.interactionError = null;
    this.interactionValues = topologyEditInteractionModeValues();
    this.interactionValueNodeId = null;
    this.nudgeIncrementMm = 1;
    this.interactionControllerRuntime = new TopologyEditInteractionControllerRuntime(this);
    installTopologyEditTangencyClockingSnapIndex(this.interactionControllerRuntime);
    this.interactionKeyHandler = (event) => this.handleInteractionKey(event);
    this.interactionChangeHandler = (event) => this.handleInteractionChange(event);
  }

  async activate() {
    await super.activate();
    this.configureContextualMoveSurface();
    this.interactionControllerRuntime.mount();
  }

  buildShell() {
    super.buildShell();
    const section = this.hostElement?.ownerDocument.createElement('section');
    if (!section || !this.checkerElement) throw new Error('TopologyEditInteractionController: panel host is unavailable.');
    section.dataset.role = 'topology-edit-professional-interaction';
    section.className = 'topology-edit-professional-interaction';
    section.setAttribute('aria-label', 'Move selected node');
    this.checkerElement.before(section);
    this.interactionElement = section;
    this.hostElement.tabIndex = this.hostElement.tabIndex >= 0 ? this.hostElement.tabIndex : 0;
    this.hostElement.addEventListener('keydown', this.interactionKeyHandler);
    this.interactionElement.addEventListener('change', this.interactionChangeHandler);
    this.renderInteractionPanel();
    this.updateInteractionEvidence();
  }

  deactivate() {
    this.interactionControllerRuntime.destroy();
    this.hostElement?.removeEventListener('keydown', this.interactionKeyHandler);
    this.interactionElement?.removeEventListener('change', this.interactionChangeHandler);
    this.clearInteractionState(false, true, true);
    this.interactionElement = null;
    super.deactivate();
  }

  refreshView(canonical) {
    super.refreshView(canonical);
    this.renderInteractionPanel();
    this.updateInteractionEvidence();
    this.interactionControllerRuntime.sync();
  }

  handleCanvasPointer(event) {
    if (event.topologyEditInteractionHandled) return;
    const before = selectionKey(this.selection);
    super.handleCanvasPointer(event);
    if (selectionKey(this.selection) !== before) this.clearInteractionState(false, true, true);
  }

  handleHostClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'preview-professional-interaction') return this.previewNumericInteraction();
    if (action === 'apply-professional-interaction') return this.applyInteractionPreview();
    if (action === 'cancel-professional-interaction') return this.cancelInteractionPreview();
    if (action === 'nudge-professional-interaction') {
      const button = event.target.closest('[data-axis][data-sign]');
      return this.nudgeInteraction(button?.dataset.axis, Number(button?.dataset.sign));
    }
    return super.handleHostClick(event);
  }

  handleInteractionChange(event) {
    const role = event.target?.dataset?.role;
    if (role === 'interaction-nudge-increment') {
      const increment = Number(event.target.value);
      if (Number.isFinite(increment) && increment > 0) this.nudgeIncrementMm = increment;
      return;
    }
    this.interactionValues = readTopologyEditInteractionValues(this.interactionElement, this.interactionValues);
    if (role === 'interaction-entry-mode') {
      this.interactionValues = topologyEditInteractionModeValues(this.interactionContext(), this.interactionValues.entryMode);
      this.interactionPreview = null;
      this.interactionError = null;
      this.renderInteractionPanel();
      this.updateInteractionEvidence();
      this.interactionControllerRuntime.sync();
      return;
    }
    if (!AUTO_PREVIEW_ROLES.has(role) || !this.session || !this.shouldAutoPreview(role)) return;
    const nodeIds = Array.isArray(this.selection?.nodeIds) ? this.selection.nodeIds : [...(this.selection?.nodeIds ?? [])];
    if (nodeIds.length === 1) this.previewNumericInteraction({ announce: false, render: false });
  }

  shouldAutoPreview(role) {
    if (role === 'interaction-axis' || role === 'interaction-magnitude') return this.interactionValues.entryMode === 'MAGNITUDE';
    return this.interactionValues.entryMode !== 'MAGNITUDE';
  }

  handleInteractionKey(event) {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && this.interactionPreview) {
      event.preventDefault(); this.cancelInteractionPreview(); return;
    }
    if (event.key === 'Enter' && this.interactionPreview && !isTopologyEditTextControl(event.target)) {
      event.preventDefault(); this.applyInteractionPreview(); return;
    }
    if (isTopologyEditTextControl(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    const nudge = topologyEditKeyboardNudge(event.key);
    if (!nudge) return;
    event.preventDefault();
    this.nudgeInteraction(nudge.axis, nudge.directionSign, event.shiftKey ? 10 : 1);
  }

  previewNumericInteraction({ announce = true, render = true } = {}) {
    try {
      this.interactionValues = readTopologyEditInteractionValues(this.interactionElement, this.interactionValues);
      const { entryMode, x, y, z, magnitude, axis } = this.interactionValues;
      const preview = createTopologyEditNumericSessionPreview({
        topology: this.session?.currentTopology(), selection: this.selection, entryMode,
        values: { x, y, z }, magnitudeMm: magnitude, direction: axisDirection(axis),
        transformMode: entryMode === 'MAGNITUDE' ? `AXIS_${axis}` : 'FREE',
      });
      this.retainInteractionPreview(preview, 'Move preview updated', announce, render);
    } catch (error) { this.rejectInteraction(error); }
  }

  nudgeInteraction(axis, directionSign, incrementMultiplier = 1) {
    try {
      const baseIncrement = Number(this.control('interaction-nudge-increment')?.value ?? this.nudgeIncrementMm);
      const multiplier = Number(incrementMultiplier);
      const preview = createTopologyEditNudgeSessionPreview({
        topology: this.session?.currentTopology(), selection: this.selection, preview: this.interactionPreview,
        axis, directionSign, incrementMm: baseIncrement * multiplier,
      });
      this.nudgeIncrementMm = baseIncrement;
      const prefix = multiplier === 1 ? '' : `${multiplier}× `;
      this.retainInteractionPreview(preview, `${prefix}${directionSign < 0 ? 'negative' : 'positive'} ${axis} nudge preview created`);
    } catch (error) { this.rejectInteraction(error); }
  }

  retainInteractionPreview(preview, prefix, announce = true, render = true) {
    this.interactionPreview = preview;
    this.interactionAcceptance = null;
    this.interactionError = null;
    if (render) this.renderInteractionPanel();
    else updateTopologyEditInteractionPanelState(this.interactionElement, {
      context: this.interactionContext(), preview, acceptance: null,
    });
    this.updateInteractionEvidence();
    this.interactionControllerRuntime.sync();
    if (announce) this.setStatus(`${prefix}: ${preview.previewHash.slice(0, 12)}; display-only and not journaled.`);
  }

  applyInteractionPreview() {
    if (!this.interactionPreview || !this.session) return;
    const preview = this.interactionPreview;
    const priorVersion = this.session.journal.sessionVersion;
    try {
      assertCurrentTopologyEditInteractionPreview({ preview, topology: this.session.currentTopology(), selection: this.selection });
      const transition = this.session.execute('MOVE_NODE', preview.movePayload);
      if (transition.disposition !== 'ACCEPTED') throw new Error(`Certified MOVE_NODE rejected: ${transition.reason || 'candidate validation failed'}.`);
      const acceptance = verifyTopologyEditInteractionAcceptance({ preview, transition, priorSessionVersion: priorVersion });
      this.interactionPreview = null;
      this.interactionAcceptance = acceptance;
      this.interactionError = null;
      this.resetInteractionValues();
      this.refreshView(this.session.currentTopology());
      this.autosaveAfterTransition?.(priorVersion);
      this.setStatus(`MOVE_NODE accepted from exact preview ${acceptance.previewHash.slice(0, 12)} at session version ${acceptance.sessionVersion}.`);
    } catch (error) { this.rejectInteraction(error); }
  }

  cancelInteractionPreview(announce = true) {
    const hadPreview = Boolean(this.interactionPreview);
    this.interactionPreview = null;
    this.interactionError = null;
    this.resetInteractionValues();
    this.renderInteractionPanel();
    this.updateInteractionEvidence();
    this.interactionControllerRuntime.sync();
    if (hadPreview && announce) this.setStatus('Move preview cancelled; no journal or workspace change occurred.');
  }

  clearInteractionState(announce = false, clearAcceptance = false, resetValues = false) {
    const hadPreview = Boolean(this.interactionPreview);
    this.interactionPreview = null;
    this.interactionError = null;
    if (clearAcceptance) this.interactionAcceptance = null;
    if (resetValues) this.resetInteractionValues();
    this.renderInteractionPanel();
    this.updateInteractionEvidence();
    this.interactionControllerRuntime.sync();
    if (announce && hadPreview) this.setStatus('Move preview cleared by review-state change.');
  }

  rejectInteraction(error) {
    this.interactionError = error instanceof Error ? error.message : String(error);
    this.renderInteractionPanel();
    this.updateInteractionEvidence();
    this.interactionControllerRuntime.sync();
    this.setStatus(`Move blocked: ${this.interactionError}`);
  }

  refreshFromWorkspace() { this.clearInteractionState(false, true, true); return super.refreshFromWorkspace(); }
  activateSearchResult(result, options = {}) { this.clearInteractionState(false, true, true); return super.activateSearchResult(result, options); }
  focusIssue(entry) { this.clearInteractionState(false, true, true); return super.focusIssue(entry); }
  runCommandAction(actionId) { this.clearInteractionState(false, true, true); return super.runCommandAction(actionId); }
  undo() { this.clearInteractionState(false, true, true); return super.undo(); }
  redo() { this.clearInteractionState(false, true, true); return super.redo(); }
  acceptAutofix() { this.clearInteractionState(false, true, true); return super.acceptAutofix(); }

  interactionContext() {
    try { return selectedTopologyEditNodeContext(this.session?.currentTopology(), this.selection); }
    catch { return null; }
  }

  resetInteractionValues() {
    const context = this.interactionContext();
    this.interactionValueNodeId = context?.nodeId ?? null;
    this.interactionValues = topologyEditInteractionModeValues(context);
  }

  renderInteractionPanel() {
    if (!this.interactionElement) return;
    const context = this.interactionContext();
    if ((context?.nodeId ?? null) !== this.interactionValueNodeId) this.resetInteractionValues();
    renderTopologyEditInteractionPanel(this.interactionElement, {
      context, values: this.interactionValues, preview: this.interactionPreview,
      acceptance: this.interactionAcceptance, error: this.interactionError, nudgeIncrementMm: this.nudgeIncrementMm,
    });
  }

  configureContextualMoveSurface() {
    const movePanel = this.interactionElement?.closest('details[data-panel-kind="topology-edit-professional-interaction"]');
    const moveSummary = movePanel?.querySelector(':scope > summary');
    if (moveSummary) moveSummary.textContent = 'Edit selected node';
    if (movePanel) movePanel.dataset.contextualEdit = 'MOVE_NODE';
    const commandSummary = this.hostElement?.querySelector('details[data-panel-kind="commands"] > summary');
    if (commandSummary) commandSummary.textContent = 'Advanced commands';
  }

  updateInteractionEvidence() {
    if (!this.hostElement) return;
    const preview = this.interactionPreview;
    const acceptance = this.interactionAcceptance;
    this.hostElement.dataset.topologyEditInteractionPreviewHash = preview?.previewHash ?? '';
    this.hostElement.dataset.topologyEditInteractionIntentHash = preview?.intentHash ?? '';
    this.hostElement.dataset.topologyEditInteractionBasisHash = preview?.basisHash ?? '';
    this.hostElement.dataset.topologyEditInteractionAcceptanceHash = acceptance?.acceptanceHash ?? '';
    this.hostElement.dataset.topologyEditInteractionCertificationHash = acceptance?.certificationHash ?? '';
    this.hostElement.dataset.topologyEditInteractionCandidateHash = acceptance?.candidateDraftHash ?? '';
  }

  control(role) { return this.interactionElement?.querySelector(`[data-role="${role}"]`) ?? null; }
}

function selectionKey(selection) { return `${(selection?.nodeIds ?? []).join('|')}::${selection?.edgeId ?? ''}`; }
