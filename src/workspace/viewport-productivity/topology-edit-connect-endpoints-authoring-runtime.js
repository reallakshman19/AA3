import { CONNECT_ENDPOINTS_TRANSACTION_SCHEMA } from '../topology-edit/authoring/topology-edit-connect-endpoints-transaction.js';
import {
  updateTopologyEditAuthoringProperties,
} from '../topology-edit/authoring/topology-edit-authoring-session.js';
import { TopologyEditStartRouteAuthoringRuntime } from './topology-edit-start-route-authoring-runtime.js';
import {
  applyConnectEndpointsAuthoring,
  cancelConnectEndpointsAuthoring,
  captureConnectEndpoint,
  connectEndpointsPipeOptions,
  prepareConnectEndpointsAuthoring,
  prepareConnectEndpointsPlanning,
  validateConnectEndpointsAuthoring,
} from './topology-edit-connect-endpoints-authoring-service.js';
import {
  createConnectEndpointsHudValues,
  readConnectElbowSelections,
  readConnectEndpointsHud,
  renderConnectEndpointsRuntime,
  updateConnectEndpointsEvidence,
} from './topology-edit-connect-endpoints-hud.js';
import {
  assertCurrentConnectEndpointsCandidate,
  clearConnectEndpointsCandidate,
  clearConnectEndpointsPlanning,
  connectEndpointsPhase,
  refreshConnectEndpointsElbowOptions,
  transitionConnectEndpointsHistory,
} from './topology-edit-connect-endpoints-runtime-support.js';
import {
  applyConnectWorkflowDefaults,
  applyStartRouteWorkflowDefaults,
  connectWorkflowReadyForPlanning,
  continueRouteWorkflowActive,
  renderRouteConnectConsolidation,
  startRouteWorkflowReady,
} from './topology-edit-route-connect-consolidation.js';

export class TopologyEditConnectEndpointsAuthoringRuntime
  extends TopologyEditStartRouteAuthoringRuntime {
  constructor(controller) {
    super(controller);
    this.connectEndpointsActive = false;
    this.connectValues = createConnectEndpointsHudValues();
    this.connectStartEndpoint = null;
    this.connectEndEndpoint = null;
    this.connectIntent = null;
    this.connectPlan = null;
    this.connectOperation = null;
    this.connectElbowOptions = [];
    this.connectWorkerReceipt = null;
    this.routeConnectWorkflowRevision = 0;
  }

  handleAction(action) {
    if (action === 'activate-authoring-connect-ends') return this.activateConnectEndpoints();
    if (!this.connectEndpointsActive) return super.handleAction(action);
    if (action?.startsWith('activate-authoring-')) {
      this.clear(false, false);
      return super.handleAction(action);
    }
    const actions = {
      'capture-connect-start': () => this.captureEndpoint('start'),
      'capture-connect-end': () => this.captureEndpoint('end'),
      'plan-connect-alternatives': () => this.planAlternatives(),
      'preview-authoring-operation': () => this.previewOperation(),
      'validate-authoring-operation': () => this.validateOperation(),
      'apply-authoring-operation': () => this.applyOperation(),
      'cancel-authoring-operation': () => this.clear(true, false),
      'undo-connect-ends-operation': () => this.undoOperation(),
      'redo-connect-ends-operation': () => this.redoOperation(),
    };
    return actions[action]?.() ?? false;
  }

  activateTool(tool) {
    const handled = super.activateTool(tool);
    if (handled && tool === 'ROUTE_ELBOW') {
      this.routeConnectWorkflowRevision += 1;
      this.message = 'Continue route: select one graph-open pipe end and enter the route offset.';
      this.publish();
    }
    return handled;
  }

  activateStartRoute() {
    const handled = super.activateStartRoute();
    applyStartRouteWorkflowDefaults(this);
    this.routeConnectWorkflowRevision += 1;
    this.message = 'Start Route: set start and end from exact viewport snaps, then choose the governed pipe.';
    this.publish();
    return handled;
  }

  activateConnectEndpoints() {
    super.clear(false, false);
    this.connectEndpointsActive = true;
    this.connectValues = createConnectEndpointsHudValues();
    applyConnectWorkflowDefaults(this);
    this.connectStartEndpoint = null;
    this.connectEndEndpoint = null;
    clearConnectEndpointsPlanning(this);
    this.routeConnectWorkflowRevision += 1;
    this.error = null;
    this.message = 'Connect Ends: select the first graph-open pipe endpoint, then the second.';
    this.captureSelectedConnectEndpoint(false);
    this.publish();
    this.queueConnectQualification();
    return true;
  }

  selectionChanged() {
    if (!this.connectEndpointsActive) return super.selectionChanged();
    this.captureSelectedConnectEndpoint(true);
    this.publish();
    this.queueConnectQualification();
    return true;
  }
  reconcileSelection() {
    if (!this.connectEndpointsActive) return super.reconcileSelection();
  }
  canonicalChanged(canonical) {
    if (!this.connectEndpointsActive) return super.canonicalChanged(canonical);
    if (this.connectPlan?.basis?.priorCanonicalHash
      && this.connectPlan.basis.priorCanonicalHash !== canonical?.canonicalTopologyHash) {
      this.connectStartEndpoint = null;
      this.connectEndEndpoint = null;
      clearConnectEndpointsPlanning(this);
      this.routeConnectWorkflowRevision += 1;
      this.message = 'Connect plan cleared because its exact canonical endpoint basis changed.';
    }
    this.render();
    this.updateEvidence();
  }

  handleFieldChange(event) {
    if (this.startRouteActive) {
      const handled = super.handleFieldChange(event);
      this.routeConnectWorkflowRevision += 1;
      this.queueStartRouteQualification();
      return handled;
    }
    if (continueRouteWorkflowActive(this)) {
      try {
        this.state = updateTopologyEditAuthoringProperties(
          this.state,
          this.readProperties(),
          'USER_INPUT',
        );
        this.clearCandidateState();
        this.error = null;
        this.message = 'Continue route values changed; updating the governed ghost and validation.';
      } catch (error) {
        this.reject(error, 'Continue route inputs are not valid.');
      }
      this.routeConnectWorkflowRevision += 1;
      this.publish();
      this.queueContinueRouteQualification();
      return;
    }
    if (!this.connectEndpointsActive) return super.handleFieldChange(event);
    this.connectValues = readConnectEndpointsHud(this.element, this.connectValues);
    const alternativeChanged = event.target?.dataset?.connectField === 'alternativeId';
    const elbowChanged = Boolean(event.target?.dataset?.connectElbowTurnHash);
    if (alternativeChanged && this.connectPlan) {
      clearConnectEndpointsCandidate(this, false);
      refreshConnectEndpointsElbowOptions(this);
      this.message = 'Ranked route selected; updating the governed ghost and validation.';
    } else if (elbowChanged) {
      clearConnectEndpointsCandidate(this, false);
      this.message = 'Governed elbow selection changed; updating the route preview.';
    } else {
      clearConnectEndpointsPlanning(this);
      this.message = 'Connection inputs changed; updating deterministic route alternatives.';
    }
    this.routeConnectWorkflowRevision += 1;
    this.error = null;
    this.publish();
    this.queueConnectQualification();
  }

  captureSnap(role) {
    const handled = super.captureSnap(role);
    this.routeConnectWorkflowRevision += 1;
    this.queueStartRouteQualification();
    return handled;
  }

  captureEndpoint(role) {
    try {
      const endpoint = captureConnectEndpoint(this.controller);
      if (role === 'start') this.connectStartEndpoint = endpoint;
      else this.connectEndEndpoint = endpoint;
      clearConnectEndpointsPlanning(this);
      this.routeConnectWorkflowRevision += 1;
      this.error = null;
      this.message = `Exact ${role} endpoint ${endpoint.nodeId} captured from canonical selection.`;
    } catch (error) {
      this.reject(error, `Connect ${role} endpoint capture blocked.`);
    }
    this.publish();
    this.queueConnectQualification();
    return true;
  }

  captureSelectedConnectEndpoint(announce) {
    let endpoint;
    try {
      endpoint = captureConnectEndpoint(this.controller);
    } catch {
      return false;
    }
    if (this.connectStartEndpoint?.nodeId === endpoint.nodeId
      || this.connectEndEndpoint?.nodeId === endpoint.nodeId) return false;
    if (!this.connectStartEndpoint) {
      this.connectStartEndpoint = endpoint;
      clearConnectEndpointsPlanning(this);
      this.routeConnectWorkflowRevision += 1;
      if (announce) this.message = `Start endpoint ${endpoint.nodeId} captured; select the second endpoint.`;
      return true;
    }
    if (!this.connectEndEndpoint) {
      this.connectEndEndpoint = endpoint;
      clearConnectEndpointsPlanning(this);
      this.routeConnectWorkflowRevision += 1;
      this.message = `End endpoint ${endpoint.nodeId} captured; choose the governed pipe.`;
      return true;
    }
    return false;
  }

  planAlternatives() {
    if (this.pending || !this.controller.session) return true;
    try {
      this.connectValues = readConnectEndpointsHud(this.element, this.connectValues);
      const prepared = prepareConnectEndpointsPlanning({
        controller: this.controller,
        values: this.connectValues,
        startEndpoint: this.connectStartEndpoint,
        endEndpoint: this.connectEndEndpoint,
        catalogue: this.requiredCatalogue(),
      });
      this.connectIntent = prepared.intent;
      this.connectPlan = prepared.plan;
      this.connectValues.alternativeId = '';
      clearConnectEndpointsCandidate(this, false);
      this.connectElbowOptions = [];
      const viable = prepared.plan.alternatives.filter((row) => !row.blockerCodes.length);
      if (viable.length === 1) {
        this.connectValues.alternativeId = viable[0].alternativeId;
        refreshConnectEndpointsElbowOptions(this);
      }
      this.error = null;
      this.message = prepared.plan.compatibilityStatus === 'COMPATIBLE'
        ? viable.length === 1
          ? 'One deterministic compatible route found; updating its ghost and validation.'
          : `${prepared.plan.alternatives.length} deterministic route alternative(s) ranked; choose one.`
        : `Connection requires a governed transition: ${prepared.plan.compatibilityDifferences.join(', ')}.`;
    } catch (error) {
      this.reject(error, 'Connect route planning blocked.');
    }
    this.publish();
    return true;
  }

  async previewOperation() {
    if (!this.connectEndpointsActive) return super.previewOperation();
    if (this.pending || !this.connectPlan || !this.connectValues.alternativeId) return true;
    try {
      this.pending = true;
      this.error = null;
      const prepared = await prepareConnectEndpointsAuthoring({
        controller: this.controller,
        plan: this.connectPlan,
        alternativeId: this.connectValues.alternativeId,
        elbowSelections: readConnectElbowSelections(this.element),
        catalogue: this.requiredCatalogue(),
      });
      this.connectOperation = prepared.operation;
      this.candidate = prepared.candidate;
      this.preview = prepared.preview;
      this.validation = null;
      this.connectWorkerReceipt = null;
      this.renderCandidateGhost();
      this.message = `Connect preview ready: ${prepared.operation.segmentCount} pipe segment(s), ${prepared.operation.bendCount} governed elbow(s), ${prepared.candidate.commandCount} certified command(s).`;
    } catch (error) {
      this.reject(error, 'Connect preview blocked.');
    } finally {
      this.pending = false;
      this.publish();
    }
    return true;
  }

  async validateOperation() {
    if (!this.connectEndpointsActive) return super.validateOperation();
    if (this.pending || !this.connectOperation || !this.candidate) return true;
    const operation = this.connectOperation;
    const candidate = this.candidate;
    try {
      this.pending = true;
      this.error = null;
      this.message = 'Validating the exact Connect candidate in the module worker…';
      this.publish();
      const result = await validateConnectEndpointsAuthoring({
        controller: this.controller,
        validationClient: this.validationClient,
        operation,
        candidate,
      });
      assertCurrentConnectEndpointsCandidate(this, operation, candidate);
      this.validation = result.validation;
      this.connectWorkerReceipt = result.workerReceipt;
      this.message = this.validation.status === 'READY_TO_APPLY'
        ? `Route is ready to apply; ${candidate.commandCount} certified commands passed final-state validation.`
        : `Connect blocked by ${this.validation.blockingIssueCount} new high-severity issue(s).`;
    } catch (error) {
      if (error?.name !== 'AbortError') this.reject(error, 'Connect validation blocked.');
    } finally {
      this.pending = false;
      this.publish();
    }
    return true;
  }

  async applyOperation() {
    if (!this.connectEndpointsActive) return super.applyOperation();
    if (this.pending || !this.connectOperation || !this.candidate || !this.preview || !this.validation) return true;
    const priorVersion = this.controller.session.journal.sessionVersion;
    try {
      this.pending = true;
      this.transaction = await applyConnectEndpointsAuthoring({
        controller: this.controller,
        operation: this.connectOperation,
        candidate: this.candidate,
        preview: this.preview,
        validation: this.validation,
        catalogue: this.requiredCatalogue(),
      });
      this.redoTransaction = null;
      const commandCount = this.transaction.commandCount;
      this.connectStartEndpoint = null;
      this.connectEndEndpoint = null;
      clearConnectEndpointsPlanning(this);
      this.routeConnectWorkflowRevision += 1;
      this.controller.refreshView(this.controller.session.currentTopology());
      this.controller.autosaveAfterTransition?.(priorVersion);
      this.message = `Atomic ${commandCount}-command Connect Existing Ends operation accepted.`;
      this.error = null;
    } catch (error) {
      this.reject(error, 'Connect apply blocked.');
    } finally {
      this.pending = false;
      this.publish();
    }
    return true;
  }

  queueStartRouteQualification() {
    const revision = this.routeConnectWorkflowRevision;
    queueMicrotask(() => this.runAutomaticQualification('START_ROUTE', revision));
  }
  queueConnectQualification() {
    const revision = this.routeConnectWorkflowRevision;
    queueMicrotask(() => this.runAutomaticQualification('CONNECT_ENDS', revision));
  }
  queueContinueRouteQualification() {
    const revision = this.routeConnectWorkflowRevision;
    queueMicrotask(() => this.runAutomaticQualification('CONTINUE_ROUTE', revision));
  }

  async runAutomaticQualification(kind, revision) {
    if (revision !== this.routeConnectWorkflowRevision || this.pending) return;
    if (kind === 'START_ROUTE') {
      if (!this.startRouteActive || !startRouteWorkflowReady(this)) return;
    } else if (kind === 'CONNECT_ENDS') {
      if (!this.connectEndpointsActive || !connectWorkflowReadyForPlanning(this)) return;
      if (!this.connectPlan) this.planAlternatives();
      if (revision !== this.routeConnectWorkflowRevision || !this.connectPlan) return;
      if (!this.connectValues.alternativeId) return;
    } else if (!continueRouteWorkflowActive(this) || !this.state.target) return;

    await this.previewOperation();
    if (revision !== this.routeConnectWorkflowRevision) {
      this.discardStaleAutomaticCandidate(kind);
      return;
    }
    if (!this.candidate) return;
    await this.validateOperation();
    if (revision !== this.routeConnectWorkflowRevision) this.discardStaleAutomaticCandidate(kind);
  }

  discardStaleAutomaticCandidate(kind) {
    if (kind === 'START_ROUTE') this.clearStartRouteCandidate();
    else if (kind === 'CONNECT_ENDS') clearConnectEndpointsCandidate(this);
    else this.clearCandidateState();
    this.message = 'Route inputs changed while qualification was running; the stale ghost was discarded.';
    this.publish();
  }

  undoOperation() {
    if (this.transaction?.schema === CONNECT_ENDPOINTS_TRANSACTION_SCHEMA) {
      return transitionConnectEndpointsHistory(this, 'undo', this.transaction);
    }
    return super.undoOperation();
  }
  redoOperation() {
    if (this.redoTransaction?.schema === CONNECT_ENDPOINTS_TRANSACTION_SCHEMA) {
      return transitionConnectEndpointsHistory(this, 'redo', this.redoTransaction);
    }
    return super.redoOperation();
  }

  clear(announce = false, clearTransaction = false) {
    this.routeConnectWorkflowRevision += 1;
    if (!this.connectEndpointsActive) return super.clear(announce, clearTransaction);
    this.cancelPendingValidation();
    try { cancelConnectEndpointsAuthoring(this.controller, this.preview); } catch { /* non-authoritative */ }
    this.connectEndpointsActive = false;
    this.connectStartEndpoint = null;
    this.connectEndEndpoint = null;
    clearConnectEndpointsPlanning(this);
    return super.clear(announce, clearTransaction);
  }
  render() {
    super.render();
    renderConnectEndpointsRuntime(this, connectEndpointsPipeOptions(this.catalogue()));
    renderRouteConnectConsolidation(this);
  }
  updateEvidence() {
    super.updateEvidence();
    updateConnectEndpointsEvidence(this);
  }
  connectPhase() { return connectEndpointsPhase(this); }
  requiredCatalogue() {
    const catalogue = this.catalogue();
    if (!catalogue) throw new RangeError('The governed piping catalogue is not loaded.');
    return catalogue;
  }
}
