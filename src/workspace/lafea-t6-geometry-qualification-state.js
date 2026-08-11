/** Retention and live workbench binding for governed T6 geometry qualification. */
import { lafeaAnalysisMeshContentHash } from './lafea-analysis-mesh-evidence.js';
import {
  LAFEA_T6_GEOMETRY_QUALIFICATION_STAGE_ID,
  createLafeaT6GeometryQualificationCustody,
  validateLafeaT6GeometryQualificationCustody,
} from './lafea-t6-geometry-qualification-custody.js';

export const LAFEA_T6_GEOMETRY_QUALIFICATION_PROJECTION_SCHEMA =
  'lafea-t6-geometry-qualification-projection/v1';
export const LAFEA_T6_GEOMETRY_QUALIFICATION_STATES = Object.freeze([
  'ABSENT', 'CURRENT_PASS', 'CURRENT_BLOCK', 'STALE', 'INVALID',
]);

const CURRENT_MESH_STATES = Object.freeze(new Set([
  'CURRENT_PASS', 'CURRENT_WARNING', 'CURRENT_BLOCK',
]));

export function createLafeaT6GeometryQualificationState(stageIds, options = {}) {
  const ids = requireStageIds(stageIds);
  const records = Object.fromEntries(ids.map((stageId) => [stageId, null]));
  const currentCandidateHeadSha = options.currentCandidateHeadSha ?? null;

  function fields(stageId) {
    requireKnownStage(records, stageId);
    return freeze({ retainedT6GeometryQualification: records[stageId] });
  }

  function register(intakeValue, stageValue) {
    const stage = requireStage(stageValue);
    requireKnownStage(records, stage.stageId);
    const retained = createLafeaT6GeometryQualificationCustody(intakeValue);
    const projection = projectLafeaT6GeometryQualification(
      stage,
      retained,
      currentCandidateHeadSha,
    );
    if (!['CURRENT_PASS', 'CURRENT_BLOCK'].includes(projection.state)) {
      throw stateError(
        projection.reasons[0] ?? 'LAFEA_T6_GEOMETRY_BINDING_NOT_CURRENT',
      );
    }
    const previous = records[stage.stageId];
    const changed = previous?.evidenceSemanticHash !== retained.evidenceSemanticHash
      || previous?.parentMeshPackageDigest !== retained.parentMeshPackageDigest;
    records[stage.stageId] = retained;
    return freeze({ changed, retained, projection });
  }

  function select(stageId) {
    requireKnownStage(records, stageId);
    return records[stageId];
  }

  function project(stageValue) {
    const stage = requireStage(stageValue);
    requireKnownStage(records, stage.stageId);
    return projectLafeaT6GeometryQualification(
      stage,
      records[stage.stageId],
      currentCandidateHeadSha,
    );
  }

  return Object.freeze({ fields, register, select, project });
}

export function projectLafeaT6GeometryQualification(
  stageValue,
  retainedValue,
  currentCandidateHeadSha,
) {
  const stage = requireStage(stageValue);
  if (!retainedValue) {
    return projection(stage.stageId, 'ABSENT', null, [], null);
  }
  const validation = validateLafeaT6GeometryQualificationCustody(retainedValue);
  if (!validation.ok) {
    return projection(
      stage.stageId,
      'INVALID',
      retainedValue,
      validation.errors,
      null,
    );
  }

  const reasons = bindingReasons(stage, retainedValue, currentCandidateHeadSha);
  if (reasons.length) {
    return projection(stage.stageId, 'STALE', retainedValue, reasons, null);
  }
  const state = retainedValue.status === 'PASS' ? 'CURRENT_PASS' : 'CURRENT_BLOCK';
  return projection(
    stage.stageId,
    state,
    retainedValue,
    retainedValue.status === 'BLOCKED' ? retainedValue.evidence.reasons : [],
    currentMeshEvidence(stage),
  );
}

function bindingReasons(stage, retained, currentCandidateHeadSha) {
  const reasons = [];
  if (stage.stageId !== LAFEA_T6_GEOMETRY_QUALIFICATION_STAGE_ID
    || retained.stageId !== stage.stageId) {
    reasons.push('LAFEA_T6_GEOMETRY_STAGE_MISMATCH');
  }
  if (typeof currentCandidateHeadSha !== 'string' || !currentCandidateHeadSha) {
    reasons.push('LAFEA_T6_GEOMETRY_CURRENT_HEAD_REQUIRED');
  } else if (retained.exactHeadSha !== currentCandidateHeadSha) {
    reasons.push('LAFEA_T6_GEOMETRY_CANDIDATE_HEAD_STALE');
  }

  const custody = stage.analysisMeshCustodyProjection;
  const meshEvidence = currentMeshEvidence(stage);
  if (custody?.canView !== true
    || !CURRENT_MESH_STATES.has(custody?.state)
    || !meshEvidence?.mesh) {
    reasons.push('LAFEA_T6_GEOMETRY_ANALYSIS_MESH_NOT_CURRENT');
    return unique(reasons);
  }
  let currentMeshHash;
  try {
    currentMeshHash = lafeaAnalysisMeshContentHash(meshEvidence.mesh);
  } catch {
    reasons.push('LAFEA_T6_GEOMETRY_ANALYSIS_MESH_INVALID');
    return unique(reasons);
  }
  if (currentMeshHash !== retained.analysisMeshHash) {
    reasons.push('LAFEA_T6_GEOMETRY_ANALYSIS_MESH_STALE');
  }
  if (meshEvidence.mesh.meshIdentity !== retained.meshIdentity) {
    reasons.push('LAFEA_T6_GEOMETRY_MESH_IDENTITY_STALE');
  }
  if (typeof meshEvidence.meshHash === 'string'
    && meshEvidence.meshHash !== retained.analysisMeshHash) {
    reasons.push('LAFEA_T6_GEOMETRY_RETAINED_MESH_HASH_STALE');
  }
  return unique(reasons);
}

function currentMeshEvidence(stage) {
  return stage.domainFirstProfileActive === true
    || stage.shellMidsurfaceProfileActive === true
    ? stage.retainedAnalysisMeshEvidenceV2 ?? null
    : stage.retainedAnalysisMeshEvidence ?? null;
}
function projection(stageId, state, retained, reasons, meshEvidence) {
  if (!LAFEA_T6_GEOMETRY_QUALIFICATION_STATES.includes(state)) {
    throw new TypeError('LAFEA_T6_GEOMETRY_PROJECTION_STATE_INVALID');
  }
  return freeze({
    schema: LAFEA_T6_GEOMETRY_QUALIFICATION_PROJECTION_SCHEMA,
    stageId,
    state,
    current: state === 'CURRENT_PASS' || state === 'CURRENT_BLOCK',
    qualified: state === 'CURRENT_PASS',
    blocked: state === 'CURRENT_BLOCK',
    reasons: unique(reasons),
    exactHeadSha: retained?.exactHeadSha ?? null,
    qualificationProfileHash: retained?.qualificationProfileHash ?? null,
    declaredMeshPackageHash: retained?.declaredMeshPackageHash ?? null,
    parentMeshPackageDigest: retained?.parentMeshPackageDigest ?? null,
    analysisMeshHash: retained?.analysisMeshHash ?? null,
    meshIdentity: retained?.meshIdentity ?? null,
    evidenceSemanticHash: retained?.evidenceSemanticHash ?? null,
    meshCustodyState: meshEvidence
      ? null
      : null,
    releaseQualified: false,
  });
}
function requireStageIds(value) {
  if (!Array.isArray(value) || !value.length
    || value.some((stageId) => typeof stageId !== 'string' || !stageId)) {
    throw new TypeError('LAFEA_T6_GEOMETRY_STAGE_IDS_REQUIRED');
  }
  return [...new Set(value)];
}
function requireKnownStage(records, stageId) {
  if (!Object.hasOwn(records, stageId)) {
    throw stateError('LAFEA_T6_GEOMETRY_STAGE_NOT_FOUND');
  }
}
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_T6_GEOMETRY_WORKBENCH_STAGE_REQUIRED');
  }
  return value;
}
function unique(values) { return [...new Set((values ?? []).filter(Boolean))]; }
function stateError(code) { const error = new TypeError(code); error.code = code; return error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
