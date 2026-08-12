import {
  topologyEditValidationIdentityStaleFields,
} from '../topology-edit/professional/topology-edit-validation-identity.js';
import {
  deriveAllSupportRestraintGeometry,
  projectSupportGeometryToViewport,
} from '../topology-edit/support-restraint-family.js';
import {
  applyTopologyEditTableTransaction,
  prepareTopologyEditTablePreview,
  redoTopologyEditTableTransaction,
  undoTopologyEditTableTransaction,
  validateTopologyEditTablePreview,
} from '../topology-edit/table/topology-edit-table-transaction.js';
import {
  createTopologyEditRuntimeValidationIdentity,
} from './topology-edit-validation-runtime-identity.js';

export async function previewTopologyEditTableRuntime(runtime) {
  if (runtime.pending || !runtime.batchPlan || runtime.staleResult) return true;
  try {
    runtime.pending = true;
    runtime.error = null;
    runtime.preview = await prepareTopologyEditTablePreview({
      session: runtime.controller.session,
      batchPlan: runtime.batchPlan,
    });
    runtime.validation = null;
    renderTopologyEditTablePreviewGhost(runtime);
    runtime.message = `${runtime.preview.candidate.commandCount} governed command(s) ready in non-mutating Preview.`;
  } catch (error) {
    runtime.error = errorMessage(error);
  } finally {
    runtime.pending = false;
    runtime.render();
  }
  return true;
}

export async function validateTopologyEditTableRuntime(runtime) {
  if (runtime.pending || !runtime.preview || !runtime.batchPlan) return true;
  const preview = runtime.preview;
  const operationPlan = runtime.batchPlan.operationPlan;
  const currentIdentity = () => createTopologyEditRuntimeValidationIdentity({
    controller: runtime.controller,
    operationPlan,
  });
  const identity = currentIdentity();
  try {
    runtime.pending = true;
    runtime.error = null;
    const result = await runtime.validationClient.validate({
      identity,
      getCurrentIdentity: currentIdentity,
      operationPlan,
      canonicalTopology: preview.candidate.canonicalTopology,
      previousDiagnostics: runtime.controller.issues ?? [],
      performancePolicy: { fastPathBudgetMs: 16, warningBudgetMs: 100, hysteresisMs: 4 },
      blockingSeverities: ['HIGH'],
    });
    const staleIdentityFields = topologyEditValidationIdentityStaleFields(
      identity,
      currentIdentity(),
    );
    if (staleIdentityFields.length) {
      throw new RangeError(
        `TopologyEditTableWorkflow: validation completed against stale ${staleIdentityFields[0]}.`,
      );
    }
    if (runtime.preview?.previewHash !== preview.previewHash
      || runtime.controller.session.currentTopology().canonicalTopologyHash !== preview.priorCanonicalHash) {
      throw new RangeError('TopologyEditTableWorkflow: validation completed against a stale Preview.');
    }
    runtime.validation = validateTopologyEditTablePreview({ preview, workerReceipt: result.receipt });
    runtime.message = runtime.validation.status === 'READY_TO_APPLY'
      ? 'Final-state validation passed; Apply is enabled.'
      : `${runtime.validation.blockingIssueCount} blocking validation issue(s).`;
  } catch (error) {
    if (error?.name !== 'AbortError') runtime.error = errorMessage(error);
  } finally {
    runtime.pending = false;
    runtime.render();
  }
  return true;
}

export async function applyTopologyEditTableRuntime(runtime) {
  if (runtime.pending || !runtime.validation || !runtime.preview || !runtime.batchPlan) return true;
  const priorVersion = runtime.controller.session.journal.sessionVersion;
  try {
    runtime.pending = true;
    const transaction = await applyTopologyEditTableTransaction({
      session: runtime.controller.session,
      batchPlan: runtime.batchPlan,
      preview: runtime.preview,
      tableValidation: runtime.validation,
    });
    runtime.transaction = transaction;
    runtime.redoTransaction = null;
    runtime.resetStaged(false);
    runtime.controller.refreshView(runtime.controller.session.currentTopology());
    runtime.controller.autosaveAfterTransition?.(priorVersion);
    runtime.message = `Atomic ${transaction.commandCount}-command Table transaction accepted.`;
    runtime.error = null;
  } catch (error) {
    runtime.error = errorMessage(error);
  } finally {
    runtime.pending = false;
    runtime.render();
  }
  return true;
}

export function undoTopologyEditTableRuntime(runtime) {
  if (!runtime.transaction) return false;
  const priorVersion = runtime.controller.session.journal.sessionVersion;
  undoTopologyEditTableTransaction(runtime.controller.session, runtime.transaction);
  runtime.redoTransaction = runtime.transaction;
  runtime.transaction = null;
  runtime.controller.refreshView(runtime.controller.session.currentTopology());
  runtime.controller.autosaveAfterTransition?.(priorVersion);
  runtime.message = 'Table transaction undone as one exact command group.';
  runtime.render();
  return true;
}

export function redoTopologyEditTableRuntime(runtime) {
  if (!runtime.redoTransaction) return false;
  const priorVersion = runtime.controller.session.journal.sessionVersion;
  redoTopologyEditTableTransaction(runtime.controller.session, runtime.redoTransaction);
  runtime.transaction = runtime.redoTransaction;
  runtime.redoTransaction = null;
  runtime.controller.refreshView(runtime.controller.session.currentTopology());
  runtime.controller.autosaveAfterTransition?.(priorVersion);
  runtime.message = 'Table transaction redone exactly.';
  runtime.render();
  return true;
}

export function renderTopologyEditTablePreviewGhost(runtime) {
  const candidate = runtime.preview?.candidate;
  if (!candidate) return;
  const projection = runtime.controller.deriveVisual(candidate.canonicalTopology, 'DRAFT').projection;
  const changed = new Set(candidate.changedCanonicalIds ?? []);
  const governedSupportProjection = changedGovernedSupportProjection(
    runtime.controller.sjsonSupportBundle?.supportProjection,
    changed,
  );
  const engineeringSupportProjection = governedSupportProjection
    ? null
    : changedEngineeringSupportProjection(runtime, candidate, changed);
  const supportIds = supportProjectionIds(
    governedSupportProjection ?? engineeringSupportProjection,
  );
  if (governedSupportProjection) {
    // SJSON deriveVisual owns a transient support-projection cache on the viewport.
    // Restore the mounted canonical projection after capturing the candidate packet;
    // only the ghost group may show the candidate before Apply.
    runtime.controller.deriveVisual(runtime.controller.session.currentTopology(), 'DRAFT');
  }
  const accepted = (row) => changed.has(row.pickTarget?.objectId ?? row.entityId ?? row.id);
  const representedBySupport = (row) => supportIds.has(
    row.pickTarget?.supportId
      ?? row.pickTarget?.objectId
      ?? row.canonicalEntityId
      ?? row.entityId
      ?? row.id,
  );
  runtime.controller.viewportBackend?.renderGhost({
    elements: (projection.compactElements ?? projection.elements ?? [])
      .filter((row) => accepted(row) && !representedBySupport(row)),
    segments: (projection.compactSegments ?? projection.segments ?? [])
      .filter((row) => accepted(row) && !representedBySupport(row)),
    primitives: (projection.primitives ?? [])
      .filter((row) => changed.has(row.canonicalEntityId) && !representedBySupport(row)),
    governedSupportProjection,
    engineeringSupportProjection,
  });
}

function changedGovernedSupportProjection(projection, changed) {
  if (!projection || !changed.size) return null;
  const belongsToChangedSupport = (row) => changed.has(
    row?.pickTarget?.supportId ?? row?.pickTarget?.objectId ?? row?.entityId ?? row?.id,
  );
  const elements = (projection.elements ?? []).filter(belongsToChangedSupport);
  const segments = (projection.segments ?? []).filter(belongsToChangedSupport);
  if (!elements.length && !segments.length) return null;
  const glyphOverlays = (projection.glyphOverlays ?? [])
    .filter((overlay) => changed.has(overlay?.supportId));
  return Object.freeze({
    ...projection,
    elements: Object.freeze(elements),
    segments: Object.freeze(segments),
    glyphOverlays: Object.freeze(glyphOverlays),
  });
}

function changedEngineeringSupportProjection(runtime, candidate, changed) {
  const overlays = deriveAllSupportRestraintGeometry({
    canonicalTopology: candidate.canonicalTopology,
    verticalAxis: 'Z',
  }).filter((overlay) => changed.has(overlay.supportId));
  if (!overlays.length) return null;
  return projectSupportGeometryToViewport(overlays, {
    markerSizeMm: supportMarkerSizeMm(runtime),
  });
}

function supportProjectionIds(projection) {
  if (!projection) return new Set();
  return new Set([
    ...(projection.glyphOverlays ?? []).map((overlay) => overlay?.supportId),
    ...(projection.elements ?? []).map((row) => (
      row?.pickTarget?.supportId ?? row?.pickTarget?.objectId ?? row?.entityId ?? row?.id
    )),
  ].filter(Boolean));
}

function supportMarkerSizeMm(runtime) {
  const markerSizeMm = Number(
    runtime.controller.viewportBackend?.navigationConfiguration?.supportMarkerSize,
  );
  if (!Number.isFinite(markerSizeMm) || markerSizeMm <= 0) {
    throw new Error('TOPOLOGY_EDIT_SUPPORT_MARKER_POLICY_MISSING: Approved supportMarkerSize is required.');
  }
  return markerSizeMm;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
