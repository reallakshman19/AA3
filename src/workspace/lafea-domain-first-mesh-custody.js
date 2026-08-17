/** Pure custody classifier for governed v2 analysis-mesh evidence. */
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { validateLafeaAnyShellMidsurfaceEvidence } from './lafea-shell-midsurface-dispatch.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
} from './lafea4-parent-normal-production-gate.js';

export const LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA = 'lafea-domain-first-mesh-custody/v1';
export const LAFEA_SHELL_SOLVER_MESH_BINDING_REQUIRED =
  'SHELL_RETAINED_MESH_NOT_BOUND_TO_SOLVER_MODEL';

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
    runBlockingReasons: [],
    meshHash: null,
    meshProfileHash: null,
    solverModelHash: null,
    solverModelBindingHash: null,
  });
  if (!retainedEvidence) {
    return result(stage?.stageId ?? null, 'ABSENT', denied(), ['ANALYSIS_MESH_EVIDENCE_V2_ABSENT']);
  }
  let evidence;
  try { evidence = validateLafeaAnalysisMeshEvidenceV2(retainedEvidence); } catch (error) {
    return result(stage?.stageId ?? null, 'INVALID', denied(), [
      error.code ?? 'ANALYSIS_MESH_EVIDENCE_V2_INVALID',
    ]);
  }
  if (evidence.stageId !== stage.stageId) {
    return result(stage.stageId, 'INVALID', denied(), ['ANALYSIS_MESH_V2_STAGE_MISMATCH'], evidence);
  }

  const reasons = domainFirst
    ? continuumParentReasons(stage, evidence)
    : shellParentReasons(stage, evidence);
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null;
  if (evidence.sourceHash !== sourceHash) reasons.push('ANALYSIS_MESH_V2_SOURCE_PARENT_STALE');
  if (reasons.length) return result(stage.stageId, 'STALE', denied(), reasons, evidence);
  if (evidence.qualification === 'BLOCK') {
    return result(stage.stageId, 'CURRENT_BLOCK', denied(), ['ANALYSIS_MESH_QUALITY_BLOCK'], evidence);
  }
  if (shellMidsurface) {
    // Mesh generation/adoption and engineering review are qualified here. Run
    // authority is promoted only by bindLafeaShellMeshCustodyToSolverModel
    // after the non-executing compiler proves retained meshHash -> solverModelHash.
    return result(
      stage.stageId,
      'CURRENT_PASS',
      { advance: true, authorization: true, run: false },
      [],
      evidence,
      [LAFEA_SHELL_SOLVER_MESH_BINDING_REQUIRED],
    );
  }
  return result(stage.stageId, 'CURRENT_PASS', allowed(), [], evidence);
}

/**
 * Promote only the Run permission of an already-current shell mesh after the
 * non-executing solver compiler binds it. A trusted production parent-normal
 * BLOCK is stronger: it promotes derived custody to CURRENT_BLOCK and denies
 * advance/authorization/run without rewriting the underlying v2 mesh evidence.
 */
export function bindLafeaShellMeshCustodyToSolverModel(custodyValue, bindingValue) {
  const custody = custodyValue;
  const binding = bindingValue;
  if (!custody || custody.state !== 'CURRENT_PASS' || !custody.meshHash) return custody;
  const bindingReasons = binding?.reasons?.length
    ? [...new Set(binding.reasons)]
    : [LAFEA_SHELL_SOLVER_MESH_BINDING_REQUIRED];
  if (bindingReasons.includes(LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE)) {
    return freeze({
      ...custody,
      state: 'CURRENT_BLOCK',
      usableForAdvance: false,
      usableForAuthorization: false,
      usableForRun: false,
      canFocusFindings: false,
      advancePolicy: 'DENY',
      authorizationPolicy: 'DENY',
      runPolicy: 'DENY',
      runBlockingReasons: [LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE],
      solverModelHash: null,
      solverModelBindingHash: null,
    });
  }
  if (!binding || binding.state !== 'CURRENT_PASS' || binding.usableForRun !== true
    || binding.meshHash !== custody.meshHash || !binding.solverModelHash
    || !binding.solverModelBindingHash) {
    return freeze({
      ...custody,
      usableForRun: false,
      runPolicy: 'DENY',
      runBlockingReasons: bindingReasons,
      solverModelHash: null,
      solverModelBindingHash: null,
    });
  }
  return freeze({
    ...custody,
    usableForRun: true,
    runPolicy: 'ALLOW',
    runBlockingReasons: [],
    solverModelHash: binding.solverModelHash,
    solverModelBindingHash: binding.solverModelBindingHash,
  });
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
  try { parent = validateLafeaAnyShellMidsurfaceEvidence(retained); } catch (error) {
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

function result(stageId, state, permissions, reasons, evidence = null, runBlockingReasons = []) {
  return freeze({
    schema: LAFEA_DOMAIN_FIRST_MESH_CUSTODY_SCHEMA,
    stageId,
    state,
    usableForAdvance: permissions.advance,
    usableForAuthorization: permissions.authorization,
    usableForRun: permissions.run,
    canView: Boolean(evidence),
    canFocusFindings: state === 'CURRENT_BLOCK',
    advancePolicy: permissions.advance ? 'ALLOW' : 'DENY',
    authorizationPolicy: permissions.authorization ? 'ALLOW' : 'DENY',
    runPolicy: permissions.run ? 'ALLOW' : 'DENY',
    runBlockingReasons: freeze([...runBlockingReasons]),
    staleReasons: state === 'STALE' ? reasons : [],
    invalidReasons: state === 'INVALID' ? reasons : [],
    absenceReasons: state === 'ABSENT' ? reasons : [],
    meshHash: evidence?.meshHash ?? null,
    meshProfileHash: evidence?.meshProfileHash ?? null,
    analysisDomainHash: evidence?.analysisDomainHash ?? null,
    analysisGeometryHash: evidence?.analysisGeometryHash ?? null,
    producerRef: evidence?.authority?.producerRef ?? null,
    gateResults: evidence?.quality?.gateResults ?? [],
    shellOrientationTopology: evidence?.quality?.shellOrientationTopology ?? null,
    warningElementIds: evidence?.quality?.warningElementIds ?? [],
    blockingElementIds: evidence?.quality?.blockingElementIds ?? [],
    solverModelHash: null,
    solverModelBindingHash: null,
  });
}
function allowed() { return { advance: true, authorization: true, run: true }; }
function denied() { return { advance: false, authorization: false, run: false }; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
