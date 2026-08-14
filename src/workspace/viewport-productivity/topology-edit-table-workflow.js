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

export function invalidateTopologyEditTablePreviewRequests(runtime) {
  runtime.previewGenerationRevision = (runtime.previewGenerationRevision ?? 0) + 1;
  runtime.autoPreviewRequest = null;
  runtime.autoPreviewQueuedRequest = null;
}

export function requestTopologyEditTableAutoPreview(runtime) {
  const planHash = runtime.batchPlan?.planHash ?? null;
  if (!planHash || runtime.staleResult) return false;
  const request = Object.freeze({
    planHash,
    generationRevision: runtime.previewGenerationRevision ?? 0,
  });
  runtime.autoPreviewRequest = request;
  queueTopologyEditTableAutoPreview(runtime, request);
  return true;
}

export async function previewTopologyEditTableRuntime(runtime, options = {}) {
  const batchPlan = runtime.batchPlan;
  if (runtime.pending || !batchPlan || runtime.staleResult) return true;
  const expectedPlanHash = options.expectedPlanHash ?? batchPlan.planHash;
  const generationRevision = options.generationRevision ?? runtime.previewGenerationRevision ?? 0;
  const automatic = options.automatic === true;
  if (batchPlan.planHash !== expectedPlanHash) return true;
  try {
    runtime.pending = true;
    runtime.error = null;
    const preview = await prepareTopologyEditTablePreview({
      session: runtime.controller.session,
      batchPlan,
    });
    if (!previewRequestIsCurrent(runtime, batchPlan, generationRevision)) return true;
    runtime.preview = preview;
    runtime.validation = null;
    renderTopologyEditTablePreviewGhost(runtime);
    runtime.message = automatic
      ? `${runtime.preview.candidate.commandCount} governed command(s) refreshed automatically in non-mutating Preview. Validate explicitly before Apply.`
      : `${runtime.preview.candidate.commandCount} governed command(s) ready in non-mutating Preview.`;
  } catch (error) {
    if (previewRequestIsCurrent(runtime, batchPlan, generationRevision)) {
      runtime.error = errorMessage(error);
    }
  } finally {
    runtime.pending = false;
    if (runtime.preview?.batchPlanHash === runtime.autoPreviewRequest?.planHash) {
      runtime.autoPreviewRequest = null;
    }
    runtime.render();
    flushTopologyEditTableAutoPreview(runtime);
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
    flushTopologyEditTableAutoPreview(runtime);
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
    flushTopologyEditTableAutoPreview(runtime);
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

function queueTopologyEditTableAutoPreview(runtime, request) {
  if (!request || runtime.autoPreviewQueuedRequest === request) return;
  runtime.autoPreviewQueuedRequest = request;
  queueMicrotask(() => {
    if (runtime.autoPreviewQueuedRequest === request) runtime.autoPreviewQueuedRequest = null;
    if (runtime.autoPreviewRequest !== request || runtime.pending) return;
    if (runtime.staleResult
      || runtime.batchPlan?.planHash !== request.planHash
      || (runtime.previewGenerationRevision ?? 0) !== request.generationRevision) return;
    void previewTopologyEditTableRuntime(runtime, {
      automatic: true,
      expectedPlanHash: request.planHash,
      generationRevision: request.generationRevision,
    });
  });
}

function flushTopologyEditTableAutoPreview(runtime) {
  const request = runtime.autoPreviewRequest;
  if (!request || runtime.pending) return;
  if (runtime.preview?.batchPlanHash === request.planHash) {
    runtime.autoPreviewRequest = null;
    return;
  }
  queueTopologyEditTableAutoPreview(runtime, request);
}

function previewRequestIsCurrent(runtime, batchPlan, generationRevision) {
  return runtime.batchPlan?.planHash === batchPlan.planHash
    && !runtime.staleResult
    && (runtime.previewGenerationRevision ?? 0) === generationRevision
    && runtime.controller.session.currentTopology().canonicalTopologyHash === batchPlan.basisHash;
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
