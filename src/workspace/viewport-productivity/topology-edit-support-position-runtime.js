import {
  assertCurrentTopologyEditTransientSupportPlacementDraft,
  createTopologyEditTransientSupportPlacementDraft,
} from '../topology-edit/draft/topology-edit-transient-support-placement-draft.js';
import {
  createTopologyEditTableSupportIntentFromTransientDraft,
} from '../topology-edit/table/topology-edit-table-transient-support-bridge.js';
import {
  topologyEditSupportPlacementContext,
} from '../topology-edit/topology-edit-support-placement.js';
import {
  stageTopologyEditPreparedTableIntent,
} from './topology-edit-table-prepared-intent-runtime.js';

const PANEL_KIND = 'support-position';
const NOOP_PATTERN = /placement is a no-op/u;

/**
 * Contextual presentation/runtime bridge for editing one selected support along
 * its already-certified straight host. Free XYZ support movement is deliberately
 * not exposed here.
 */
export class TopologyEditSupportPositionRuntime {
  constructor(controller) {
    this.controller = controller;
    this.details = null;
    this.element = null;
    this.supportId = null;
    this.draft = null;
    this.bridgeHash = null;
    this.intentHash = null;
    this.message = 'Select one support glyph to edit its station on the certified host.';
    this.error = null;
    this.onInput = (event) => this.handleInput(event);
    this.onClick = (event) => this.handleClick(event);
  }

  mount(host = this.controller.hostElement) {
    if (!host?.ownerDocument) return this;
    this.destroyPanel();
    const sidecar = host.querySelector('[data-role="topology-edit-sidecar"]');
    if (!sidecar) {
      throw new Error('TopologyEditSupportPositionRuntime: clean-shell sidecar is unavailable.');
    }
    const panel = createPanel(host.ownerDocument);
    sidecar.append(panel.details);
    this.details = panel.details;
    this.element = panel.section;
    this.element.addEventListener('input', this.onInput);
    this.element.addEventListener('click', this.onClick);
    this.selectionChanged({ selection: this.controller.editorStore?.getState?.().selection });
    return this;
  }

  selectionChanged(payload) {
    const selection = payload?.selection ?? this.controller.editorStore?.getState?.().selection;
    const topology = this.controller.session?.currentTopology?.();
    const primaryId = String(selection?.primaryId ?? '').trim();
    const support = exactSupportOrNull(topology, primaryId);
    const nextSupportId = support?.id ?? null;
    if (nextSupportId !== this.supportId) {
      this.supportId = nextSupportId;
      this.draft = null;
      this.clearStageEvidence();
      this.error = null;
      this.message = support
        ? 'Support selected. Adjust station along its exact certified host; canonical topology remains unchanged until Apply.'
        : 'Select one support glyph to edit its station on the certified host.';
    }
    if (support && this.details) this.details.open = true;
    this.render();
  }

  canonicalChanged(canonical = this.controller.session?.currentTopology?.()) {
    let authorityChanged = false;
    if (this.draft) {
      try {
        assertCurrentTopologyEditTransientSupportPlacementDraft(this.draft, canonical);
      } catch {
        this.draft = null;
        authorityChanged = true;
        this.message = 'Support position draft cleared because canonical support/host authority changed.';
      }
    }
    if (this.supportId && !exactSupportOrNull(canonical, this.supportId)) {
      this.supportId = null;
      this.draft = null;
      authorityChanged = true;
    }
    if (authorityChanged) this.clearStageEvidence();
    this.render();
  }

  context() {
    const topology = this.controller.session?.currentTopology?.();
    const support = exactSupportOrNull(topology, this.supportId);
    if (!support) return null;
    try {
      return topologyEditSupportPlacementContext(topology, support);
    } catch (error) {
      return {
        supportId: support.id,
        blockedReason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  handleInput(event) {
    if (!event.target?.matches?.('[data-support-position-station], [data-support-position-slider]')) return;
    const station = event.target.value;
    const otherSelector = event.target.matches('[data-support-position-slider]')
      ? '[data-support-position-station]'
      : '[data-support-position-slider]';
    const other = this.element?.querySelector(otherSelector);
    if (other) other.value = station;
    this.prepareNumericDraft(station, true);
  }

  handleClick(event) {
    const action = event.target?.closest?.('[data-support-position-action]')?.dataset?.supportPositionAction;
    if (!action) return false;
    if (action === 'reset') {
      this.draft = null;
      this.clearStageEvidence();
      this.error = null;
      this.message = 'Support position input reset to current canonical station; any already-staged Table transaction is unchanged.';
      this.render();
      return true;
    }
    if (action === 'stage') {
      this.stageCurrentDraft();
      return true;
    }
    return false;
  }

  prepareNumericDraft(stationInput, render = true) {
    const topology = this.controller.session?.currentTopology?.();
    if (!topology || !this.supportId) return null;
    this.clearStageEvidence();
    try {
      const draft = createTopologyEditTransientSupportPlacementDraft({
        topology,
        supportId: this.supportId,
        stationMm: stationInput,
        source: 'CANVAS_NUMERIC',
      });
      this.draft = draft;
      this.error = null;
      this.message = `Transient support station ${format(draft.stationMm)} mm prepared on ${draft.hostEdgeId}; not journaled.`;
      this.publishEvidence();
      if (render) this.render();
      return draft;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (NOOP_PATTERN.test(message)) {
        this.draft = null;
        this.error = null;
        this.message = 'Requested support station equals the current certified placement.';
      } else {
        this.draft = null;
        this.error = message;
        this.message = 'Support position input is not stageable.';
      }
      this.publishEvidence();
      if (render) this.render();
      return null;
    }
  }

  stageCurrentDraft() {
    const topology = this.controller.session?.currentTopology?.();
    const tableRuntime = this.controller.tableAdapter?.runtime;
    if (!topology || !tableRuntime?.projection || !this.supportId) {
      this.error = 'Engineering Table staging authority is not available yet.';
      this.render();
      return false;
    }
    const station = this.element?.querySelector('[data-support-position-station]')?.value;
    const draft = this.draft ?? this.prepareNumericDraft(station, false);
    if (!draft) {
      this.render();
      return false;
    }
    try {
      const bridge = createTopologyEditTableSupportIntentFromTransientDraft({
        draft,
        projection: tableRuntime.projection,
        sessionSnapshot: this.controller.session.snapshot(),
        canonicalTopology: topology,
      });
      const staged = stageTopologyEditPreparedTableIntent(tableRuntime, bridge.intent);
      if (!staged.ok) throw new RangeError(staged.error);
      this.bridgeHash = bridge.bridgeHash;
      this.intentHash = bridge.intent.intentHash;
      this.error = null;
      this.message = `Support station ${format(draft.stationMm)} mm staged through SUPPORT_PLACEMENT; governed 3D Preview refresh queued. Validate remains explicit.`;
      this.render();
      return true;
    } catch (error) {
      this.clearStageEvidence();
      this.error = error instanceof Error ? error.message : String(error);
      this.message = 'Support position staging was rejected by certified Table authority.';
      this.render();
      return false;
    }
  }

  clearStageEvidence() {
    this.bridgeHash = null;
    this.intentHash = null;
  }

  publishEvidence() {
    const host = this.controller.hostElement;
    if (!host) return;
    const context = this.context();
    host.dataset.topologyEditSupportPositionId = this.supportId ?? '';
    host.dataset.topologyEditSupportPositionHostEdgeId = context?.hostEdgeId ?? '';
    host.dataset.topologyEditSupportPositionDraftHash = this.draft?.draftHash ?? '';
    host.dataset.topologyEditSupportPositionStationMm = this.draft ? String(this.draft.stationMm) : '';
    host.dataset.topologyEditSupportPositionBridgeHash = this.bridgeHash ?? '';
    host.dataset.topologyEditSupportPositionIntentHash = this.intentHash ?? '';
    host.dataset.topologyEditSupportPositionError = this.error ?? '';
  }

  render() {
    if (!this.element) return;
    const context = this.context();
    if (!context) {
      this.element.innerHTML = '<p class="panel-empty">Select one support glyph in the 3D view to edit its host station.</p>';
      this.publishEvidence();
      return;
    }
    if (context.blockedReason) {
      this.element.innerHTML = `<p class="panel-empty">${esc(context.blockedReason)}</p>`;
      this.publishEvidence();
      return;
    }
    const stationMm = this.draft?.stationMm ?? context.currentStationMm;
    const available = Number.isFinite(context.currentStationMm)
      && Number.isFinite(context.hostLengthMm)
      && context.hostLengthMm > 0;
    const value = available ? stationMm : '';
    this.element.innerHTML = `<section data-role="topology-edit-support-position" data-support-position-id="${esc(context.supportId)}" data-support-position-host-edge-id="${esc(context.hostEdgeId)}">
      <div class="topology-edit-table__identity"><strong>Support position</strong><code>${esc(context.supportId)}</code><span>UPDATE_SUPPORT_PLACEMENT</span></div>
      <p class="topology-edit-table__notice">Movement is constrained to the exact certified straight host. Free XYZ support motion and host rebinding are blocked.</p>
      <div class="topology-edit-table__editor-grid">
        <label>Station from host FROM (mm)<input type="number" min="0" max="${esc(context.hostLengthMm)}" step="any" data-support-position-station value="${esc(value)}" ${available ? '' : 'disabled'}></label>
        <label>Host station<input type="range" min="0" max="${esc(context.hostLengthMm)}" step="1" data-support-position-slider value="${esc(value)}" ${available ? '' : 'disabled'}></label>
        <button type="button" data-support-position-action="stage" ${this.draft && available ? '' : 'disabled'}>Stage + Preview</button>
        <button type="button" data-support-position-action="reset" ${this.draft ? '' : 'disabled'}>Reset input</button>
      </div>
      <div class="topology-edit-table__custody"><span>Host ${esc(context.hostEntityId ?? '—')}</span><span>Canonical ${esc(context.hostEdgeId)}</span><span>Length ${esc(format(context.hostLengthMm))} mm</span><span>Basis ${esc(context.stationAuthority)}</span></div>
      <p class="topology-edit-table__notice" data-support-position-message>${esc(this.error ? `${this.message} ${this.error}` : this.message)}</p>
    </section>`;
    this.publishEvidence();
  }

  destroy() {
    this.destroyPanel();
    this.supportId = null;
    this.draft = null;
    this.clearStageEvidence();
    this.error = null;
    this.publishEvidence();
  }

  destroyPanel() {
    this.element?.removeEventListener('input', this.onInput);
    this.element?.removeEventListener('click', this.onClick);
    this.details?.remove();
    this.details = null;
    this.element = null;
  }
}

function createPanel(documentRef) {
  const details = documentRef.createElement('details');
  details.className = 'topology-edit-clean-shell__panel';
  details.dataset.panelKind = PANEL_KIND;
  details.dataset.supportPositionContextual = 'true';
  const summary = documentRef.createElement('summary');
  summary.textContent = 'Support position';
  const body = documentRef.createElement('div');
  body.className = 'topology-edit-clean-shell__panel-body';
  const section = documentRef.createElement('section');
  section.setAttribute('aria-label', 'Support host position');
  body.append(section);
  details.append(summary, body);
  return { details, section };
}
function exactSupportOrNull(topology, supportId) {
  if (!topology || !supportId) return null;
  const matches = (topology.supports ?? []).filter((support) => support?.id === supportId);
  return matches.length === 1 ? matches[0] : null;
}
function format(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(6)));
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
