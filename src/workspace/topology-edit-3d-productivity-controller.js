import {
  TopologyEdit3DViewController as AuthoringController,
} from './topology-edit-3d-authoring-controller.js';
import {
  TopologyEditCleanShellRuntime,
} from './viewport-productivity/topology-edit-clean-shell-runtime.js';
import {
  TopologyEditSupportPositionRuntime,
} from './viewport-productivity/topology-edit-support-position-runtime.js';
import './topology-edit-productivity.css';

/** Adds presentation-only productivity behavior without acquiring topology authority. */
export class TopologyEdit3DViewController extends AuthoringController {
  constructor(eventBus, lifecycleOptions = {}) {
    super(eventBus, lifecycleOptions);
    this.cleanShellRuntime = new TopologyEditProductivityCleanShellRuntime(this);
    this.supportPositionRuntime = new TopologyEditSupportPositionRuntime(this);
    this.supportHostDragRuntime = null;
    this.supportHostDragPromise = null;
    this.supportHostDragGeneration = 0;
    this.iconPresentationRuntime = null;
    this.iconReferenceRuntime = null;
    this.iconRuntimePromise = null;
    this.iconRuntimeGeneration = 0;
    this.tableAdapter = null;
    this.tableAdapterPromise = null;
    this.sourceVisualCache = null;
    this.sourceVisualCacheDataset = null;
    this.sourceVisualCacheKey = '';
    const getProfessionalViewState = this.lifecycle.getViewState;
    this.lifecycle.getViewState = () => ({
      ...getProfessionalViewState(),
      cleanShell: this.cleanShellRuntime.viewState(),
    });
  }

  async activate() {
    await super.activate();
    if (!this.hostElement) return;
    const supportDragPromise = this.mountSupportHostDragRuntime();
    this.mountIconRuntimes();
    await Promise.all([
      this.iconRuntimePromise,
      this.mountTableAdapter(),
      supportDragPromise,
    ]);
    this.supportPositionRuntime.selectionChanged({
      selection: this.editorStore?.getState?.().selection,
    });
    this.supportHostDragRuntime?.selectionChanged();
  }

  async mountTableAdapter() {
    if (this.tableAdapter) return this.tableAdapter;
    if (this.tableAdapterPromise) return this.tableAdapterPromise;
    if (!this.hostElement) return null;
    const activationHost = this.hostElement;
    this.tableAdapterPromise = import(
      './viewport-productivity/topology-edit-table-productivity-adapter.js'
    ).then(({ createTopologyEditTableProductivityAdapter }) => {
      if (!this.hostElement || this.hostElement !== activationHost) return null;
      const adapter = createTopologyEditTableProductivityAdapter(this).mount();
      this.tableAdapter = adapter;
      return adapter;
    }).finally(() => { this.tableAdapterPromise = null; });
    return this.tableAdapterPromise;
  }

  mountSupportHostDragRuntime() {
    if (this.supportHostDragRuntime) return Promise.resolve(this.supportHostDragRuntime);
    if (this.supportHostDragPromise) return this.supportHostDragPromise;
    if (!this.hostElement) return Promise.resolve(null);
    const activationHost = this.hostElement;
    const activationGeneration = ++this.supportHostDragGeneration;
    let runtime = null;
    const isCurrentActivation = () => (
      this.supportHostDragGeneration === activationGeneration
      && this.hostElement === activationHost
    );
    const promise = import(
      './viewport-productivity/topology-edit-support-host-drag-runtime.js'
    ).then(({ TopologyEditSupportHostDragRuntime }) => {
      if (!isCurrentActivation()) return null;
      runtime = new TopologyEditSupportHostDragRuntime(
        this,
        this.supportPositionRuntime,
      ).mount();
      if (!isCurrentActivation()) {
        runtime.destroy();
        runtime = null;
        return null;
      }
      this.supportHostDragRuntime = runtime;
      activationHost.dataset.topologyEditSupportDragRuntimeStatus = 'READY';
      delete activationHost.dataset.topologyEditSupportDragRuntimeError;
      return runtime;
    }).catch((error) => {
      runtime?.destroy();
      if (this.supportHostDragRuntime === runtime) this.supportHostDragRuntime = null;
      if (isCurrentActivation()) {
        activationHost.dataset.topologyEditSupportDragRuntimeStatus = 'ERROR';
        activationHost.dataset.topologyEditSupportDragRuntimeError =
          error instanceof Error ? error.message : String(error);
      }
      return null;
    }).finally(() => {
      if (this.supportHostDragGeneration === activationGeneration
          && this.supportHostDragPromise === promise) {
        this.supportHostDragPromise = null;
      }
    });
    this.supportHostDragPromise = promise;
    return promise;
  }

  mountIconRuntimes() {
    if (this.iconRuntimePromise || this.iconPresentationRuntime
      || this.iconReferenceRuntime || !this.hostElement) return;
    const activationHost = this.hostElement;
    const activationGeneration = ++this.iconRuntimeGeneration;
    let presentationRuntime = null;
    let referenceRuntime = null;
    const isCurrentActivation = () => (
      this.iconRuntimeGeneration === activationGeneration
      && this.hostElement === activationHost
    );

    const promise = import(
      './viewport-productivity/topology-edit-icon-presentation-runtime.js'
    ).then(({ TopologyEditIconPresentationRuntime }) => {
      if (!isCurrentActivation()) return null;
      presentationRuntime = new TopologyEditIconPresentationRuntime().mount(activationHost);
      if (!isCurrentActivation()) {
        presentationRuntime.destroy();
        presentationRuntime = null;
        return null;
      }
      this.iconPresentationRuntime = presentationRuntime;
      return import(
        './viewport-productivity/topology-edit-icon-reference-runtime.js'
      ).then(({ TopologyEditIconReferenceRuntime }) => {
        if (!isCurrentActivation()) return null;
        referenceRuntime = new TopologyEditIconReferenceRuntime().mount(activationHost);
        if (!isCurrentActivation()) {
          referenceRuntime.destroy();
          referenceRuntime = null;
          return null;
        }
        this.iconReferenceRuntime = referenceRuntime;
        return referenceRuntime;
      });
    }).catch((error) => {
      referenceRuntime?.destroy();
      presentationRuntime?.destroy();
      if (this.iconReferenceRuntime === referenceRuntime) this.iconReferenceRuntime = null;
      if (this.iconPresentationRuntime === presentationRuntime) this.iconPresentationRuntime = null;
      if (isCurrentActivation()) {
        activationHost.dataset.topologyEditIconPresentationStatus = 'ERROR';
        activationHost.dataset.topologyEditIconPresentationError =
          error instanceof Error ? error.message : String(error);
      }
      return null;
    }).finally(() => {
      if (this.iconRuntimeGeneration === activationGeneration
          && this.iconRuntimePromise === promise) {
        this.iconRuntimePromise = null;
      }
    });
    this.iconRuntimePromise = promise;
  }

  buildShell() {
    super.buildShell();
    const primaryNavigation = this.hostElement?.querySelector(
      '.topology-edit-clean-shell__navigation-primary',
    );
    const fitSelection = this.hostElement?.querySelector(
      '[data-navigation-action="fit-selection"]',
    );
    if (primaryNavigation && fitSelection) primaryNavigation.append(fitSelection);
    const sidecar = this.hostElement?.querySelector('[data-role="topology-edit-sidecar"]');
    if (!sidecar) throw new Error('TopologyEditProductivityController: sidecar is unavailable.');
    sidecar.tabIndex = -1;
    this.supportPositionRuntime.mount(this.hostElement);
    this.cleanShellRuntime.mount(this.hostElement);
  }

  deriveVisual(canonical, modelRole) {
    const role = String(modelRole || 'DRAFT').toUpperCase();
    if (role !== 'SOURCE') return super.deriveVisual(canonical, modelRole);
    const key = sourceVisualKey(canonical);
    if (
      this.sourceVisualCache
      && this.sourceVisualCacheDataset === this.workspaceDataset
      && this.sourceVisualCacheKey === key
    ) {
      if (this.hostElement) this.hostElement.dataset.topologyEditSourceVisualCache = 'HIT';
      return this.sourceVisualCache;
    }
    const result = super.deriveVisual(canonical, modelRole);
    this.sourceVisualCache = result;
    this.sourceVisualCacheDataset = this.workspaceDataset;
    this.sourceVisualCacheKey = key;
    if (this.hostElement) this.hostElement.dataset.topologyEditSourceVisualCache = 'MISS';
    return result;
  }

  refreshView(canonical) {
    super.refreshView(canonical);
    this.tableAdapter?.canonicalChanged(canonical);
    this.supportPositionRuntime.canonicalChanged(canonical);
    this.supportHostDragRuntime?.canonicalChanged(canonical);
  }

  deactivate() {
    this.supportHostDragGeneration += 1;
    this.supportHostDragRuntime?.destroy();
    this.supportHostDragRuntime = null;
    this.supportHostDragPromise = null;
    this.supportPositionRuntime.destroy();
    this.tableAdapter?.destroy();
    this.tableAdapter = null;
    this.tableAdapterPromise = null;
    this.iconRuntimeGeneration += 1;
    this.iconReferenceRuntime?.destroy();
    this.iconPresentationRuntime?.destroy();
    this.iconReferenceRuntime = null;
    this.iconPresentationRuntime = null;
    this.iconRuntimePromise = null;
    this.cleanShellRuntime.destroy();
    this.sourceVisualCache = null;
    this.sourceVisualCacheDataset = null;
    this.sourceVisualCacheKey = '';
    super.deactivate();
  }

  handleHostClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (this.cleanShellRuntime.handleAction(action)) {
      if (action === 'open-engineering-table') {
        if (this.tableAdapter) {
          this.tableAdapter.showWindow();
        } else {
          void this.mountTableAdapter().then((adapter) => adapter?.showWindow());
        }
      }
      return;
    }
    return super.handleHostClick(event);
  }

  restoreDisplayState(viewState = {}) {
    super.restoreDisplayState(viewState);
    this.cleanShellRuntime.restoreViewState(viewState.cleanShell);
  }

  reloadDraft() {
    const draftPanelWasOpen = Boolean(
      this.hostElement?.querySelector('details[data-panel-kind="draft"]')?.open,
    );
    const result = super.reloadDraft();
    if (draftPanelWasOpen) this.cleanShellRuntime.openPanel('draft');
    return result;
  }

  handleUnifiedSelectionChanged(payload) {
    super.handleUnifiedSelectionChanged(payload);
    this.tableAdapter?.selectionChanged(payload);
    this.supportPositionRuntime.selectionChanged(payload);
    this.supportHostDragRuntime?.selectionChanged(payload);
    this.cleanShellRuntime.selectionChanged(payload);
  }

  undo() {
    if (this.tableAdapter?.undoIfCurrent()) return true;
    return super.undo();
  }

  redo() {
    if (this.tableAdapter?.redoIfCurrent()) return true;
    return super.redo();
  }

  runCommandAction(actionId) {
    this.tableAdapter?.clearCandidate();
    return super.runCommandAction(actionId);
  }

  applyInteractionPreview() {
    this.tableAdapter?.clearCandidate();
    return super.applyInteractionPreview();
  }

  acceptAutofix() {
    this.tableAdapter?.clearCandidate();
    return super.acceptAutofix();
  }

  renderCheckerPanel() {
    super.renderCheckerPanel();
    this.cleanShellRuntime.issuesChanged({
      issueCount: this.issues?.length ?? 0,
      suggestionCount: this.autofixSuggestions?.length ?? 0,
    });
  }

  updateLifecycleEvidence() {
    super.updateLifecycleEvidence();
    this.cleanShellRuntime?.updateDraftStatus();
  }

  updateActionButtons() {
    super.updateActionButtons();
    this.cleanShellRuntime?.updateAvailability();
  }
}

class TopologyEditProductivityCleanShellRuntime extends TopologyEditCleanShellRuntime {
  updateAvailability() {
    super.updateAvailability();
    const tableButton = this.host?.querySelector('[data-action="open-engineering-table"]');
    const tablePanel = this.host?.querySelector('details[data-panel-kind="table"]');
    if (tableButton) {
      tableButton.setAttribute(
        'aria-expanded',
        String(Boolean(this.state.inspectorOpen && tablePanel?.open)),
      );
    }
  }
}

function sourceVisualKey(canonical) {
  return `${String(canonical?.sourceHash || '')}:${String(canonical?.canonicalTopologyHash || '')}`;
}
