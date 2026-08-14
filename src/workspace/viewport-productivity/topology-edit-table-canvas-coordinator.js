import {
  createTopologyEditTransientNodeDraft,
} from '../topology-edit/draft/topology-edit-transient-node-draft.js';
import {
  topologyEditTableRowIdsForCanonicalSelection,
} from '../topology-edit/table/topology-edit-table-view-state.js';

/** Presentation-only bridge. Canonical selection remains owned by the existing editor store. */
export class TopologyEditTableCanvasCoordinator {
  constructor(controller, runtime) {
    if (!controller?.selectionCoordinator) {
      throw new TypeError('TopologyEditTableCanvasCoordinator: controller selectionCoordinator is required.');
    }
    if (!runtime) throw new TypeError('TopologyEditTableCanvasCoordinator: runtime is required.');
    this.controller = controller;
    this.runtime = runtime;
    this.lastSelectionHash = null;
    this.lastCanonicalHash = null;
    this.lastInteractionPreviewHash = null;
    this.interactionObserver = null;
    this.interactionRenderPending = false;
    this.mountInteractionObserver();
  }

  tableSelection(action, rowIds, primaryRowId = null) {
    const projection = this.runtime.projection;
    if (!projection) return { disposition: 'IGNORED' };
    const rows = exactRows(projection, rowIds);
    const primary = primaryRowId
      ? exactRows(projection, [primaryRowId])[0]
      : rows.at(-1) ?? null;
    return this.controller.selectionCoordinator.requestCanonical(
      action,
      rows.map((row) => row.identity.canonicalId),
      'table',
      {
        primaryId: primary?.identity.canonicalId ?? null,
        anchorId: action === 'REPLACE' ? primary?.identity.canonicalId ?? null : undefined,
      },
    );
  }

  selectionChanged(payload) {
    const selection = payload?.selection;
    if (!selection || selection.selectionHash === this.lastSelectionHash) return;
    this.lastSelectionHash = selection.selectionHash;
    const projection = this.runtime.projection;
    if (!projection) return;
    const rowIds = topologyEditTableRowIdsForCanonicalSelection(
      projection,
      selection.canonicalIds,
    );
    const primaryRowId = projection.rows.find((row) => (
      row.identity.canonicalId === selection.primaryId
    ))?.rowId ?? null;
    const anchorRowId = projection.rows.find((row) => (
      row.identity.canonicalId === selection.anchorId
    ))?.rowId ?? null;
    this.runtime.applyCanonicalSelection({ rowIds, primaryRowId, anchorRowId });
  }

  canonicalChanged(canonical) {
    const canonicalHash = canonical?.canonicalTopologyHash ?? null;
    if (!canonicalHash || canonicalHash === this.lastCanonicalHash) return;
    this.lastCanonicalHash = canonicalHash;
    this.clearTransientInteraction(false);
    this.runtime.canonicalChanged(canonical);
  }

  mountInteractionObserver() {
    const host = this.controller.hostElement;
    const Observer = host?.ownerDocument?.defaultView?.MutationObserver;
    if (!host || typeof Observer !== 'function') return;
    this.interactionObserver = new Observer((records) => {
      if (!records.some((record) => (
        record.type === 'attributes'
        && record.attributeName === 'data-topology-edit-interaction-preview-hash'
      ))) return;
      this.interactionPreviewChanged();
    });
    this.interactionObserver.observe(host, {
      attributes: true,
      attributeFilter: ['data-topology-edit-interaction-preview-hash'],
    });
    this.interactionPreviewChanged();
  }

  interactionPreviewChanged() {
    const preview = this.controller.interactionPreview ?? null;
    const previewHash = preview?.previewHash ?? null;
    if (previewHash === this.lastInteractionPreviewHash) return;
    this.lastInteractionPreviewHash = previewHash;
    const basisHash = this.runtime.projection?.authority?.canonicalTopologyHash ?? null;
    if (!preview || !basisHash || preview.basisHash !== basisHash) {
      this.clearTransientInteraction();
      return;
    }
    try {
      const draft = createTopologyEditTransientNodeDraft({
        basisHash: preview.basisHash,
        nodeId: preview.nodeId,
        targetPosition: preview.targetPosition,
        previewHash: preview.previewHash,
        source: 'INTERACTION',
      });
      this.runtime.transientNodeDrafts = { [draft.nodeId]: draft };
      this.scheduleInteractionRender();
    } catch {
      this.clearTransientInteraction();
    }
  }

  clearTransientInteraction(render = true) {
    const hadDraft = Object.keys(this.runtime.transientNodeDrafts ?? {}).length > 0;
    this.runtime.transientNodeDrafts = {};
    if (render && hadDraft) this.scheduleInteractionRender();
  }

  scheduleInteractionRender() {
    if (this.interactionRenderPending || !this.runtime.element) return;
    this.interactionRenderPending = true;
    const view = this.runtime.element.ownerDocument?.defaultView;
    const render = () => {
      this.interactionRenderPending = false;
      const details = this.runtime.element?.closest?.('details');
      if (!details || details.open) this.runtime.render();
    };
    if (typeof view?.requestAnimationFrame === 'function') view.requestAnimationFrame(render);
    else queueMicrotask(render);
  }

  reset() {
    this.interactionObserver?.disconnect();
    this.interactionObserver = null;
    this.interactionRenderPending = false;
    this.lastSelectionHash = null;
    this.lastCanonicalHash = null;
    this.lastInteractionPreviewHash = null;
    this.runtime.transientNodeDrafts = {};
  }
}

function exactRows(projection, rowIds) {
  const byId = new Map(projection.rows.map((row) => [row.rowId, row]));
  return [...new Set(rowIds ?? [])].map((rowId) => {
    const row = byId.get(rowId);
    if (!row) throw new RangeError(`TopologyEditTableCanvasCoordinator: unknown row ${rowId}.`);
    return row;
  });
}
