/** Governed retention/projection for detailed numerical verification evidence. */
import {
  LAFEA_CONTROLLED_CONTINUUM_RECEIPT_SCHEMA,
  validateControlledContinuumExecutionReceipt,
} from '../core/lafea-application-templates/controlled-continuum-pilot-contract.js';
import {
  LAFEA_BUCKET_01_CONVERGENCE_EVIDENCE_SCHEMA,
  validateLafeaBucket01ConvergenceEvidence,
} from './lafea-bucket-01-convergence.js';

export const LAFEA_WORKBENCH_VERIFICATION_BINDING_SCHEMA =
  'lafea-workbench-verification-binding/v1';
export const LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA =
  'lafea-workbench-verification-intake/v1';
export const LAFEA_WORKBENCH_VERIFICATION_BINDING_STATUSES = Object.freeze([
  'ABSENT', 'HASH_ONLY', 'DIAGNOSTIC', 'CURRENT', 'STALE',
]);

export function createLafeaWorkbenchVerificationState(stageIds) {
  const ids = requireStageIds(stageIds);
  const records = Object.fromEntries(ids.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireKnownStage(records, stageId);
    return freeze({ retainedNumericalVerificationEvidence: records[stageId] });
  }

  function register(value, stageValue) {
    const stage = requireStage(stageValue);
    requireKnownStage(records, stage.stageId);
    const retained = normalizeEvidence(value);
    const projection = projectLafeaWorkbenchVerificationBinding(stage, retained);
    if (!['CURRENT', 'DIAGNOSTIC'].includes(projection.bindingStatus)) {
      throw verificationError(
        projection.reasons[0] ?? 'LAFEA_NUMERICAL_VERIFICATION_BINDING_NOT_CURRENT',
      );
    }
    const previous = records[stage.stageId];
    const changed = retainedIdentity(previous) !== retainedIdentity(retained);
    records[stage.stageId] = retained;
    return freeze({ changed, retained, projection });
  }

  function select(stageId) {
    requireKnownStage(records, stageId);
    return records[stageId];
  }

  return Object.freeze({ fields, register, select });
}

export function projectLafeaWorkbenchVerificationBinding(stageValue, retainedValue = null) {
  const stage = requireStage(stageValue);
  const convergence = currentConvergenceArtifact(stage);
  if (!retainedValue) {
    return projection(stage.stageId, {
      bindingStatus: convergence ? 'HASH_ONLY' : 'ABSENT',
      method: convergence ? 'LIFECYCLE_HASH_ONLY' : null,
      lifecycleArtifactHash: convergence?.artifactHash ?? null,
      retainedIdentity: null,
      evidence: null,
      reasons: convergence ? ['CONVERGENCE_DETAIL_EVIDENCE_NOT_RETAINED'] : [],
    });
  }

  let retained;
  try {
    retained = normalizeEvidence(retainedValue);
  } catch {
    return projection(stage.stageId, {
      bindingStatus: 'STALE',
      method: null,
      lifecycleArtifactHash: convergence?.artifactHash ?? null,
      retainedIdentity: null,
      evidence: null,
      reasons: ['CONVERGENCE_DETAIL_EVIDENCE_INVALID'],
    });
  }

  if (!convergence) return diagnosticProjection(stage, retained);

  const reasons = retained.method === 'BUCKET_01_GCI'
    ? bucket01BindingReasons(convergence, retained.evidence)
    : controlledReceiptBindingReasons(stage, convergence, retained.evidence);
  return projection(stage.stageId, {
    bindingStatus: reasons.length ? 'STALE' : 'CURRENT',
    method: retained.method,
    lifecycleArtifactHash: convergence.artifactHash,
    retainedIdentity: retainedIdentity(retained),
    evidence: retained.evidence,
    reasons,
  });
}

function diagnosticProjection(stage, retained) {
  const reasons = sourceBindingReasons(stage, retained);
  const diagnosticAllowed = reasons.length === 0
    && detailedEvidenceStatus(retained) === 'BLOCKED';
  return projection(stage.stageId, {
    bindingStatus: diagnosticAllowed ? 'DIAGNOSTIC' : 'STALE',
    method: retained.method,
    lifecycleArtifactHash: null,
    retainedIdentity: retainedIdentity(retained),
    evidence: retained.evidence,
    reasons: diagnosticAllowed
      ? ['CONVERGENCE_SOURCE_BOUND_DIAGNOSTIC_ONLY']
      : unique(['CONVERGENCE_LIFECYCLE_ARTIFACT_NOT_CURRENT', ...reasons]),
  });
}

function bucket01BindingReasons(convergence, evidence) {
  const reasons = [];
  if (evidence.status !== 'PASS') reasons.push('CONVERGENCE_DETAIL_NOT_ACCEPTED');
  if (convergence.artifactHash !== evidence.semanticHash) {
    reasons.push('CONVERGENCE_DETAIL_ARTIFACT_HASH_STALE');
  }
  return reasons;
}

function controlledReceiptBindingReasons(stage, convergence, receipt) {
  const reasons = sourceBindingReasons(stage, normalizeEvidence(receipt));
  if (receipt.status !== 'ACCEPTED' || receipt.convergenceReady !== true
    || receipt.pilotConvergence?.status !== 'PASS') {
    reasons.push('CONVERGENCE_DETAIL_NOT_ACCEPTED');
  }
  if (convergence.artifactHash !== receipt.pilotConvergence?.semanticHash) {
    reasons.push('CONVERGENCE_DETAIL_ARTIFACT_HASH_STALE');
  }
  return unique(reasons);
}

function sourceBindingReasons(stage, retained) {
  const reasons = [];
  const sourceHash = stage.sourceAuthority?.sourceHash
    ?? stage.lifecycle?.source?.sourceHash ?? null;
  const currentDigest = stage.lifecycleBinding?.currentDocumentDigest ?? null;
  if (retained.method === 'CONTROLLED_CONTINUUM_RELATIVE_CHANGE') {
    const receipt = retained.evidence;
    if (receipt.request.stageId !== stage.stageId) reasons.push('CONVERGENCE_DETAIL_STAGE_MISMATCH');
    if (receipt.exactSourceHash !== sourceHash) reasons.push('CONVERGENCE_DETAIL_SOURCE_HASH_STALE');
    if (receipt.currentDocumentRevisionDigest !== currentDigest) reasons.push('CONVERGENCE_DETAIL_DOCUMENT_REVISION_STALE');
    return unique(reasons);
  }
  const intake = retained.intake;
  if (!intake) return ['CONVERGENCE_DIAGNOSTIC_SOURCE_BINDING_REQUIRED'];
  if (intake.stageId !== stage.stageId) reasons.push('CONVERGENCE_DETAIL_STAGE_MISMATCH');
  if (intake.sourceHash !== sourceHash) reasons.push('CONVERGENCE_DETAIL_SOURCE_HASH_STALE');
  if (intake.documentRevisionDigest !== currentDigest) reasons.push('CONVERGENCE_DETAIL_DOCUMENT_REVISION_STALE');
  return unique(reasons);
}

function normalizeEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw verificationError('CONVERGENCE_DETAIL_EVIDENCE_INVALID');
  }
  if (value.method && value.evidence) {
    return normalizeEvidence(value.intake
      ? { schema: LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA, ...value.intake, evidence: value.evidence }
      : value.evidence);
  }
  if (value.schema === LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA) {
    return normalizeIntake(value);
  }
  return normalizeRawEvidence(value, null);
}

function normalizeIntake(value) {
  const keys = Object.keys(value).sort().join('|');
  if (keys !== ['documentRevisionDigest', 'evidence', 'schema', 'sourceHash', 'stageId'].sort().join('|')) {
    throw verificationError('CONVERGENCE_DIAGNOSTIC_INTAKE_SHAPE_INVALID');
  }
  if (typeof value.stageId !== 'string' || !value.stageId
    || typeof value.sourceHash !== 'string' || !value.sourceHash
    || typeof value.documentRevisionDigest !== 'string' || !value.documentRevisionDigest) {
    throw verificationError('CONVERGENCE_DIAGNOSTIC_INTAKE_IDENTITY_INVALID');
  }
  const intake = freeze({
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    documentRevisionDigest: value.documentRevisionDigest,
  });
  return normalizeRawEvidence(value.evidence, intake);
}

function normalizeRawEvidence(value, intake) {
  const evidence = freeze(structuredClone(value));
  if (evidence.schema === LAFEA_BUCKET_01_CONVERGENCE_EVIDENCE_SCHEMA) {
    const validation = validateLafeaBucket01ConvergenceEvidence(evidence);
    if (!validation.ok) throw verificationError(validation.errors[0]);
    return freeze({ method: 'BUCKET_01_GCI', intake, evidence });
  }
  if (evidence.schema === LAFEA_CONTROLLED_CONTINUUM_RECEIPT_SCHEMA) {
    const validation = validateControlledContinuumExecutionReceipt(evidence);
    if (!validation.ok) throw verificationError('CONTROLLED_CONTINUUM_RECEIPT_INVALID');
    return freeze({ method: 'CONTROLLED_CONTINUUM_RELATIVE_CHANGE', intake: null, evidence });
  }
  throw verificationError('CONVERGENCE_DETAIL_SCHEMA_NOT_SUPPORTED');
}

function detailedEvidenceStatus(retained) {
  return retained.method === 'BUCKET_01_GCI'
    ? retained.evidence.status
    : retained.evidence.pilotConvergence?.status;
}
function currentConvergenceArtifact(stage) {
  const value = stage.lifecycle?.artifacts?.CONVERGENCE;
  return value?.status === 'CURRENT' && value?.qualification === 'PASS'
    ? value : null;
}
function retainedIdentity(value) {
  if (!value) return null;
  if (value.method === 'BUCKET_01_GCI') return value.evidence.semanticHash;
  return value.evidence.evidenceHash;
}
function projection(stageId, value) {
  if (!LAFEA_WORKBENCH_VERIFICATION_BINDING_STATUSES.includes(value.bindingStatus)) {
    throw new TypeError('LAFEA_WORKBENCH_VERIFICATION_BINDING_STATUS_INVALID');
  }
  return freeze({
    schema: LAFEA_WORKBENCH_VERIFICATION_BINDING_SCHEMA,
    stageId,
    bindingStatus: value.bindingStatus,
    method: value.method,
    lifecycleArtifactHash: value.lifecycleArtifactHash,
    retainedIdentity: value.retainedIdentity,
    evidence: value.evidence,
    reasons: unique(value.reasons),
  });
}
function requireStageIds(value) {
  if (!Array.isArray(value) || !value.length
    || value.some((stageId) => typeof stageId !== 'string' || !stageId)) {
    throw new TypeError('LAFEA_WORKBENCH_VERIFICATION_STAGE_IDS_REQUIRED');
  }
  return [...new Set(value)];
}
function requireKnownStage(records, stageId) {
  if (!Object.hasOwn(records, stageId)) throw verificationError('LAFEA_WORKBENCH_VERIFICATION_STAGE_NOT_FOUND');
}
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_WORKBENCH_VERIFICATION_STAGE_REQUIRED');
  }
  return value;
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function verificationError(code) { const error = new TypeError(code); error.code = code; return error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
