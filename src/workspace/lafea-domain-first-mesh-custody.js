/** Pure custody classifier for governed v2 analysis-mesh evidence. */
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { validateLafeaShellMidsurfaceEvidence } from './lafea-shell-midsurface-contract.js';

export const LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA = 'lafea-domain-first-mesh-custody/v1';

export function buildLafeaDomainFirstMeshCustodyProjection(stage, retainedEvidence = null) {
  const domainFirst = stage?.domainFirstProfileActive === true;
  const shellMidsurface = stage?.shellMidsurfaceProfileActive === true;
  if (!domainFirst && !shellMidsurface) return freeze({
    schema: LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA,
    stageId: stage?.stageId ?? null,
    state: 'NOT_APPLICABLE',
    usableForAdvance: true,
    usableForAuthorization: true,
    usableForRun: true,
    reasons: [],
    meshHash: null,
    meshProfileHash: null,
  });
  if (!retainedEvidence) {
    return result(stage?.stageId ?? null, 'ABSENT', false, ['ANALYSIS_MESH_EVIDENCE_V2_ABSENT']);
  }
  let evidence;
  try { evidence = validateLafeaAnalysisMeshEvidenceV2(retainedEvidence); } catch (error) {
    return result(stage?.stageId ?? null, 'INVALID', false, [
      error.code ?? 'ANALYSIS_MESH_EVIDENCE_V2_INVALID',
    ]);
  }
  if (evidence.stageId !== stage.stageId) {
    return result(stage.stageId, 'INVALID', false, ['ANALYSIS_MESH_V2_STAGE_MISMATCH'], evidence);
  }

  const reasons = domainFirst
    ? continuumParentReasons(stage, evidence)
    : shellParentReasons(stage, evidence);
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null;
  if (evidence.sourceHash !== sourceHash) reasons.push('ANALYSIS_MESH_V2_SOURCE_PARENT_STALE');
  if (reasons.length) return result(stage.stageId, 'STALE', false, reasons, evidence);
  if (evidence.qualification === 'BLOCK') {
    return result(stage.stageId, 'CURRENT_BLOCK', false, ['ANALYSIS_MESH_QUALITY_BLOCK'], evidence);
  }
  return result(stage.stageId, 'CURRENT_PASS', true, [], evidence);
}

function continuumParentReasons(stage, evidence) {
  const reasons = [];
  if (stage.analysisDomainProjection?.state !== 'CURRENT_PASS'
    || evidence.analysisDomainHash !== stage.analysisDomainProjection?.analysisDomainHash) {
    reasons.push('ANALYSIS_MESH_V2_DOMAIN_PARENT_STALE');
  }
  if (stage.analysisGeometryProjection?.state !== 'CURRENT_PASS'
    || evidence.analysisGeometryHash !== stage.analysisGeometryProjection?.analysisGeometryHash) {
    reasons.push('ANALYSIS_MESH_V2_GEOMETRY_PARENT_STALE');
  }
  return reasons;
}

function shellParentReasons(stage, evidence) {
  const reasons = [];
  const retained = stage.retainedShellMidsurfaceEvidence;
  if (!retained) return ['ANALYSIS_MESH_V2_SHELL_MIDSURFACE_PARENT_ABSENT'];
  let parent;
  try { parent = validateLafeaShellMidsurfaceEvidence(retained); } catch (error) {
    return [error.code ?? 'ANALYSIS_MESH_V2_SHELL_MIDSURFACE_PARENT_INVALID'];
  }
  if (parent.stageId !== stage.stageId) reasons.push('ANALYSIS_MESH_V2_SHELL_STAGE_PARENT_STALE');
  if (parent.qualification !== 'PASS') reasons.push('ANALYSIS_MESH_V2_SHELL_PARENT_NOT_QUALIFIED');
  if (evidence.analysisDomainHash !== parent.analysisDomainHash) {
    reasons.push('ANALYSIS_MESH_V2_DOMAIN_PARENT_STALE');
  }
  if (evidence.analysisGeometryHash !== parent.analysisGeometryHash) {
    reasons.push('ANALYSIS_MESH_V2_GEOMETRY_PARENT_STALE');
  }
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null;
  if (parent.sourceHash !== sourceHash) reasons.push('ANALYSIS_MESH_V2_SHELL_SOURCE_PARENT_STALE');
  return reasons;
}

function result(stageId, state, usable, reasons, evidence = null) {
  return freeze({
    schema: LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA,
    stageId,
    state,
    usableForAdvance: usable,
    usableForAuthorization: usable,
    usableForRun: usable,
    canView: Boolean(evidence),
    canFocusFindings: state === 'CURRENT_BLOCK',
    advancePolicy: usable ? 'ALLOW' : 'DENY',
    authorizationPolicy: usable ? 'ALLOW' : 'DENY',
    runPolicy: usable ? 'ALLOW' : 'DENY',
    staleReasons: state === 'STALE' ? reasons : [],
    invalidReasons: state === 'INVALID' ? reasons : [],
    absenceReasons: state === 'ABSENT' ? reasons : [],
    meshHash: evidence?.meshHash ?? null,
    meshProfileHash: evidence?.meshProfileHash ?? null,
    analysisDomainHash: evidence?.analysisDomainHash ?? null,
    analysisGeometryHash: evidence?.analysisGeometryHash ?? null,
    producerRef: evidence?.authority?.producerRef ?? null,
    gateResults: evidence?.quality?.gateResults ?? [],
    warningElementIds: evidence?.quality?.warningElementIds ?? [],
    blockingElementIds: evidence?.quality?.blockingElementIds ?? [],
  });
}
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
