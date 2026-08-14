import * as THREE from 'three';
import {
  engineeringPointToRender,
  renderPointToEngineering,
} from '../topology-edit/topology-edit-coordinate-transform.js';
import {
  createTopologyEditTransientSupportPlacementDraft,
} from '../topology-edit/draft/topology-edit-transient-support-placement-draft.js';

const NOOP_PATTERN = /placement is a no-op/u;

/**
 * Pointer-only presentation adapter for support placement. It never owns
 * canonical mutation authority: drag motion creates only a transient support
 * draft, which must still be promoted through the Table SUPPORT_PLACEMENT path.
 */
export class TopologyEditSupportHostDragRuntime {
  constructor(controller, supportPositionRuntime) {
    if (!controller || !supportPositionRuntime) {
      throw new TypeError('TopologyEditSupportHostDragRuntime requires controller and support position runtime.');
    }
    this.controller = controller;
    this.supportPositionRuntime = supportPositionRuntime;
    this.canvas = null;
    this.group = null;
    this.active = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownHandler = (event) => this.handlePointerDown(event);
    this.pointerMoveHandler = (event) => this.handlePointerMove(event);
    this.pointerUpHandler = (event) => this.handlePointerUp(event);
    this.pointerCancelHandler = (event) => this.handlePointerCancel(event);
  }

  mount() {
    this.destroy();
    const backend = this.controller.viewportBackend;
    const canvas = backend?.renderer?.domElement;
    if (!backend?.groups?.transientGroup || !canvas) {
      throw new Error('TopologyEditSupportHostDragRuntime: mounted topology viewport is required.');
    }
    this.canvas = canvas;
    this.group = new THREE.Group();
    this.group.userData.nonPickable = true;
    backend.groups.transientGroup.add(this.group);
    canvas.addEventListener('pointerdown', this.pointerDownHandler, true);
    canvas.addEventListener('pointermove', this.pointerMoveHandler, true);
    canvas.addEventListener('pointerup', this.pointerUpHandler, true);
    canvas.addEventListener('pointercancel', this.pointerCancelHandler, true);
    this.syncEvidence();
    return this;
  }

  handlePointerDown(event) {
    if (event.button !== 0 || this.active || !this.canvas) return;
    const context = this.supportPositionRuntime.context();
    if (!context?.supportId || !context.hostEdgeId || !Number.isFinite(context.hostLengthMm)) return;
    const pick = this.controller.viewportBackend?.pickAt(event.clientX, event.clientY);
    if (pick?.objectKind !== 'support'
      || (pick.supportId ?? pick.objectId) !== context.supportId) return;
    markHandled(event);
    this.canvas.focus?.({ preventScroll: true });
    this.canvas.setPointerCapture?.(event.pointerId);
    this.active = {
      pointerId: event.pointerId,
      supportId: context.supportId,
      basisHash: this.controller.session?.currentTopology?.()?.canonicalTopologyHash ?? null,
      moved: false,
    };
    this.renderGuide(context, context.currentOrigin);
    this.controller.setStatus?.(
      `Dragging support ${context.supportId} along ${context.hostEdgeId}; transient only until Stage + Preview.`,
    );
    this.syncEvidence();
  }

  handlePointerMove(event) {
    if (!this.isActivePointer(event)) return;
    markHandled(event);
    const targetPoint = this.pointerTarget(event);
    if (!targetPoint) return;
    this.active.moved = true;
    this.acceptTargetPoint(targetPoint, false);
  }

  handlePointerUp(event) {
    if (!this.isActivePointer(event)) return;
    markHandled(event);
    const targetPoint = this.pointerTarget(event);
    if (targetPoint) this.acceptTargetPoint(targetPoint, true);
    const moved = this.active?.moved;
    this.releasePointer();
    if (moved && this.supportPositionRuntime.draft) {
      this.controller.setStatus?.(
        `Support station ${format(this.supportPositionRuntime.draft.stationMm)} mm prepared; Stage + Preview is required before validation.`,
      );
    }
    this.syncEvidence();
  }

  handlePointerCancel(event) {
    if (!this.isActivePointer(event)) return;
    markHandled(event);
    this.releasePointer();
    this.clearGuide();
    this.controller.setStatus?.('Support drag cancelled; canonical authority unchanged.');
    this.syncEvidence();
  }

  acceptTargetPoint(targetPoint, renderPanel) {
    const topology = this.controller.session?.currentTopology?.();
    const supportId = this.active?.supportId;
    if (!topology || !supportId || topology.canonicalTopologyHash !== this.active?.basisHash) {
      this.releasePointer();
      this.clearGuide();
      return null;
    }
    this.supportPositionRuntime.clearStageEvidence?.();
    try {
      const draft = createTopologyEditTransientSupportPlacementDraft({
        topology,
        supportId,
        targetPoint,
        source: 'CANVAS_DRAG',
      });
      this.supportPositionRuntime.draft = draft;
      this.supportPositionRuntime.error = null;
      this.supportPositionRuntime.message = `Transient support station ${format(draft.stationMm)} mm prepared by host drag; not journaled.`;
      this.renderGuide(this.supportPositionRuntime.context(), draft.targetOrigin);
      this.supportPositionRuntime.publishEvidence?.();
      if (renderPanel) this.supportPositionRuntime.render();
      else this.updatePanelControls(draft.stationMm);
      this.syncEvidence(draft);
      return draft;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (NOOP_PATTERN.test(message)) {
        this.supportPositionRuntime.draft = null;
        this.supportPositionRuntime.error = null;
        this.supportPositionRuntime.message = 'Dragged support position equals the current certified placement.';
      } else {
        this.supportPositionRuntime.draft = null;
        this.supportPositionRuntime.error = message;
        this.supportPositionRuntime.message = 'Support drag is not stageable.';
      }
      this.supportPositionRuntime.publishEvidence?.();
      if (renderPanel) this.supportPositionRuntime.render();
      this.syncEvidence();
      return null;
    }
  }

  pointerTarget(event) {
    const canvas = this.canvas;
    const backend = this.controller.viewportBackend;
    const camera = backend?.activeCamera;
    const context = this.supportPositionRuntime.context();
    const topology = this.controller.session?.currentTopology?.();
    if (!canvas || !camera || !context?.fromNodeId || !context?.toNodeId || !topology) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, camera);
    const from = exactNode(topology, context.fromNodeId).position;
    const to = exactNode(topology, context.toNodeId).position;
    const renderFrom = renderVector(from);
    const renderTo = renderVector(to);
    const pointOnRay = new THREE.Vector3();
    const pointOnSegment = new THREE.Vector3();
    this.raycaster.ray.distanceSqToSegment(
      renderFrom,
      renderTo,
      pointOnRay,
      pointOnSegment,
    );
    const engineering = renderPointToEngineering({
      x: pointOnSegment.x,
      y: pointOnSegment.y,
      z: pointOnSegment.z,
    });
    return { x: engineering.x, y: engineering.y, z: engineering.z };
  }

  updatePanelControls(stationMm) {
    const element = this.supportPositionRuntime.element;
    if (!element) return;
    for (const selector of ['[data-support-position-station]', '[data-support-position-slider]']) {
      const control = element.querySelector(selector);
      if (control) control.value = String(stationMm);
    }
    const stage = element.querySelector('[data-support-position-action="stage"]');
    const reset = element.querySelector('[data-support-position-action="reset"]');
    if (stage) stage.disabled = false;
    if (reset) reset.disabled = false;
    const message = element.querySelector('[data-support-position-message]');
    if (message) message.textContent = this.supportPositionRuntime.message;
  }

  renderGuide(context, targetOrigin) {
    if (!this.group || !context?.fromNodeId || !context?.toNodeId || !targetOrigin) return;
    const topology = this.controller.session?.currentTopology?.();
    if (!topology) return;
    this.clearGuide();
    const from = exactNode(topology, context.fromNodeId).position;
    const to = exactNode(topology, context.toNodeId).position;
    const points = [
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.72 }),
    );
    const markerSize = positive(
      this.controller.viewportBackend?.navigationConfiguration?.supportMarkerSize,
      10,
    );
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(markerSize * 0.32, 1), 12, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.88 }),
    );
    marker.position.set(targetOrigin.x, targetOrigin.y, targetOrigin.z);
    this.group.add(line, marker);
    this.controller.viewportBackend?.invalidate?.('support-host-drag-guide');
  }

  clearGuide() {
    if (!this.group) return;
    const geometries = new Set();
    const materials = new Set();
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const rows = Array.isArray(object.material) ? object.material : [object.material];
      rows.filter(Boolean).forEach((material) => materials.add(material));
    });
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.controller.viewportBackend?.invalidate?.('support-host-drag-guide-clear');
  }

  canonicalChanged() {
    if (this.active) this.releasePointer();
    this.clearGuide();
    this.syncEvidence();
  }

  selectionChanged() {
    if (this.active) this.releasePointer();
    if (!this.supportPositionRuntime.supportId) this.clearGuide();
    this.syncEvidence();
  }

  isActivePointer(event) {
    return Boolean(this.active && event.pointerId === this.active.pointerId);
  }

  releasePointer() {
    const active = this.active;
    if (!active) return false;
    if (this.canvas?.hasPointerCapture?.(active.pointerId)) {
      this.canvas.releasePointerCapture(active.pointerId);
    }
    this.active = null;
    return true;
  }

  syncEvidence(draft = this.supportPositionRuntime.draft) {
    const host = this.controller.hostElement;
    if (!host) return;
    host.dataset.topologyEditSupportDragActive = String(Boolean(this.active));
    host.dataset.topologyEditSupportDragDraftHash = draft?.source === 'CANVAS_DRAG'
      ? draft.draftHash
      : '';
    host.dataset.topologyEditSupportDragStationMm = draft?.source === 'CANVAS_DRAG'
      ? String(draft.stationMm)
      : '';
    host.dataset.topologyEditSupportDragGuideVisible = String(Boolean(this.group?.children?.length));
  }

  destroy() {
    this.releasePointer();
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.pointerDownHandler, true);
      this.canvas.removeEventListener('pointermove', this.pointerMoveHandler, true);
      this.canvas.removeEventListener('pointerup', this.pointerUpHandler, true);
      this.canvas.removeEventListener('pointercancel', this.pointerCancelHandler, true);
    }
    this.clearGuide();
    this.group?.parent?.remove(this.group);
    this.group = null;
    this.canvas = null;
    this.active = null;
    this.syncEvidence();
  }
}

function renderVector(point) {
  const mapped = engineeringPointToRender(point);
  return new THREE.Vector3(mapped.x, mapped.y, mapped.z);
}
function exactNode(topology, nodeId) {
  const matches = (topology?.nodes ?? []).filter((node) => node?.id === nodeId);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditSupportHostDragRuntime: node ${nodeId} resolved ${matches.length} records.`,
    );
  }
  return matches[0];
}
function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
function format(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(6)));
}
function markHandled(event) {
  event.topologyEditInteractionHandled = true;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}
