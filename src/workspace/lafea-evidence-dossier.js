/** Evidence-only LAFEA calculation/verification dossier. No solver or recovery work occurs here. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  lafeaRunExecutionIdentity,
  projectLafeaRunStageCurrentAuthority,
  validateLafeaRunHistoryEntry,
} from './lafea-run-history.js';

export const LAFEA_EVIDENCE_DOSSIER_SCHEMA = 'lafea-calculation-verification-dossier/v1';

export function createLafeaRunEvidenceDossier(entryValue, options = {}) {
  const entry = validateLafeaRunHistoryEntry(entryValue);
  const currentRunId = typeof options.currentRunId === 'string' ? options.currentRunId : null;
  const liveStage = options.currentStage && typeof options.currentStage === 'object'
    ? options.currentStage : null;
  const liveAuthority = liveStage ? projectLafeaRunStageCurrentAuthority(liveStage) : null;
  const liveExecutionHash = liveStage?.execution?.status === 'QUALIFIED'
    ? lafeaRunExecutionIdentity(liveStage.execution) : null;
  const liveExecutionMatches = liveExecutionHash === null
    ? null : liveExecutionHash === entry.evidence.execution.resultHash;
  const custody = dossierCustody({
    entry,
    currentRunId,
    liveStage,
    liveAuthority,
    liveExecutionMatches,
  });
  const evidence = entry.evidence;
  const base = {
    schema: LAFEA_EVIDENCE_DOSSIER_SCHEMA,
    application: 'LAFEA',
    dossierRevision: 'A17.2',
    calculationIdentity: {
      runId: entry.runId,
      runOrdinal: entry.ordinal,
      runSemanticHash: entry.semanticHash,
      evidenceHash: entry.evidenceHash,
      custody,
    },
    currentAuthority: {
      atCapture: evidence.currentAuthority ?? null,
      live: liveAuthority,
      liveExecutionMatches,
      currentResultAuthorityGrantedByDossier: false,
    },
    build: evidence.build,
    sourceLifecycleProfile: {
      stageId: entry.stageId,
      sourceHash: evidence.source.sourceHash,
      sourceAuthority: evidence.source.sourceAuthority,
      lifecycleBinding: evidence.source.lifecycleBinding,
      lifecycleProfileId: evidence.profile.lifecycleProfileId,
      domainFirstProfileId: evidence.profile.domainFirstProfileId,
    },
    sourceDocument: evidence.source.document,
    geometryIdealization: {
      analysisDomainHash: evidence.geometry.analysisDomainHash,
      analysisGeometryHash: evidence.geometry.analysisGeometryHash,
      analysisDomain: evidence.geometry.analysisDomain,
      analysisGeometryEvidence: evidence.geometry.analysisGeometryEvidence,
    },
    meshCustody: {
      meshHash: evidence.mesh.meshHash,
      profile: evidence.profile.meshProfile,
      custody: evidence.mesh.custody,
      summary: evidence.mesh.summary,
      quality: evidence.mesh.evidence?.quality ?? null,
      t6GeometryQualification: evidence.mesh.t6GeometryQualification,
      retainedT6GeometryQualification: evidence.mesh.retainedT6GeometryQualification,
    },
    solverResult: {
      route: evidence.execution.route,
      solverModelHash: evidence.execution.solverModelHash,
      compiledExecutionHash: evidence.execution.compiledExecutionHash,
      resultHash: evidence.execution.resultHash,
      executionStatus: evidence.execution.status,
      quantities: evidence.execution.quantities,
      retainedExecution: evidence.execution.evidence,
    },
    numericalVerification: {
      bindingStatus: evidence.verification.bindingStatus,
      method: evidence.verification.method,
      lifecycleArtifactHash: evidence.verification.lifecycleArtifactHash,
      retainedIdentity: evidence.verification.retainedIdentity,
      projection: evidence.verification.projection,
      retainedEvidence: evidence.verification.retainedEvidence,
    },
    assumptionsLimitations: evidence.limitations,
    reviewEvents: lifecycleReviewEvents(evidence.lifecycle),
    release: {
      bindingStatus: evidence.release.bindingStatus,
      releaseQualified: evidence.release.releaseQualified,
      authorityState: evidence.release.authorityState,
      recordId: evidence.release.recordId,
      semanticHash: evidence.release.semanticHash,
      evidenceHash: evidence.release.evidenceHash,
      projection: evidence.release.projection,
      retainedRecord: evidence.release.retainedRecord,
      currentReleaseAuthorityGrantedByDossier: false,
    },
    trace: evidenceTrace(entry),
  };
  return deepFreeze({ ...base, semanticHash: canonicalLafeaSha256(base) });
}

export function validateLafeaRunEvidenceDossier(value) {
  if (!value || value.schema !== LAFEA_EVIDENCE_DOSSIER_SCHEMA
    || value.application !== 'LAFEA'
    || value.release?.currentReleaseAuthorityGrantedByDossier !== false
    || value.currentAuthority?.currentResultAuthorityGrantedByDossier !== false
    || typeof value.semanticHash !== 'string') {
    throw dossierError('LAFEA_EVIDENCE_DOSSIER_INVALID');
  }
  const { semanticHash: _semanticHash, ...base } = value;
  if (canonicalLafeaSha256(base) !== value.semanticHash) {
    throw dossierError('LAFEA_EVIDENCE_DOSSIER_HASH_INVALID');
  }
  return value;
}

function dossierCustody({ entry, currentRunId, liveStage, liveAuthority, liveExecutionMatches }) {
  if (currentRunId !== entry.runId) return 'HISTORIC_RUN_SNAPSHOT';
  if (!liveStage) return 'LATEST_RUN_SNAPSHOT_AUTHORITY_UNVERIFIED';
  if (liveStage.stageId !== entry.stageId
    || liveAuthority?.currentResultAccepted !== true
    || liveExecutionMatches !== true) {
    return 'LATEST_RUN_HISTORIC_NOT_CURRENT';
  }
  return 'CURRENT_RUN_SNAPSHOT';
}

function evidenceTrace(entry) {
  const e = entry.evidence;
  const artifacts = e.lifecycle?.artifacts ?? {};
  const rows = [
    trace('RUN_ENTRY', entry.semanticHash),
    trace('RUN_EVIDENCE', entry.evidenceHash),
    trace('SOURCE', e.source.sourceHash),
    trace('ANALYSIS_DOMAIN', e.geometry.analysisDomainHash),
    trace('ANALYSIS_GEOMETRY', e.geometry.analysisGeometryHash),
    trace('ANALYSIS_MESH', e.mesh.meshHash),
    trace('SOLVER_MODEL', e.execution.solverModelHash),
    trace('EXECUTION', e.execution.compiledExecutionHash),
    trace('RESULT', e.execution.resultHash),
    trace('VERIFICATION', e.verification.retainedIdentity),
    trace('RELEASE_RECORD', e.release.semanticHash),
  ];
  for (const [kind, record] of Object.entries(artifacts)) {
    if (record?.artifactHash) rows.push(trace(`LIFECYCLE_${kind}`, record.artifactHash));
  }
  return deepFreeze(rows.filter((row) => row.hash !== null));
}

function lifecycleReviewEvents(lifecycle) {
  const rows = [];
  if (lifecycle?.lastEvent) rows.push({ kind: 'LIFECYCLE_EVENT', value: lifecycle.lastEvent });
  if (lifecycle?.lastRegistration) rows.push({ kind: 'LIFECYCLE_REGISTRATION', value: lifecycle.lastRegistration });
  return rows;
}
function trace(kind, hash) { return { kind, hash: hash ?? null }; }
function dossierError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(deepFreeze); return Object.freeze(value); }
