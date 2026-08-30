import { buildLafeaWorkbenchOrchestrationProjection } from './lafea-workbench-orchestration-projection.js';
import {
  governLafeaWorkbenchReleaseBindingForResultCurrentness,
} from './lafea-workbench-release-binding.js';

export const LAFEA_CONTINUUM_CONVERGENCE_PROJECTION_SCHEMA =
  'lafea-continuum-convergence-projection/v1';

const STAGE_ID = 'LAFEA.3';
const RESULT_BLOCK_REASON = 'LAFEA3_CONVERGENCE_NOT_CURRENT_AND_QUALIFIED';

export function enrichLafeaContinuumConvergenceState(state, retained) {
  const stage = state?.stages?.[STAGE_ID];
  if (!stage) return state;
  const stages = { ...state.stages };
  const projection = projectLafeaContinuumConvergence(retained, stage);
  const readiness = gateLafea3ResultPublication(stage.lifecycleReadiness, projection);
  const enriched = freeze({
    ...stage,
    retainedContinuumConvergenceStudy: retained,
    continuumConvergenceProjection: projection,
    lifecycleReadiness: readiness,
  });
  stages[STAGE_ID] = freeze({
    ...enriched,
    orchestration: buildLafeaWorkbenchOrchestrationProjection(enriched),
  });
  return freeze({ ...state, stages: freeze(stages) });
}

export function projectLafeaContinuumConvergence(retained, stage) {
  if (!retained) return projection('ABSENT', false, ['CONVERGENCE_STUDY_NOT_RUN']);
  if (retained.status === 'FAILED') {
    return projection('FAILED', false, [retained.errorCode], retained);
  }
  const reasons = currentnessReasons(retained, stage);
  if (reasons.length) return projection('STALE', false, reasons, retained);
  return projection(
    retained.usableForResultPublication ? 'CURRENT_PASS' : 'CURRENT_BLOCK',
    retained.usableForResultPublication,
    retained.publicationReasons,
    retained,
  );
}

export function gateLafea3ResultPublication(readiness, projectionValue) {
  if (!readiness || readiness.domainFirstProfileActive !== true) return readiness;
  const convergenceReady = projectionValue.state === 'CURRENT_PASS';
  const resultReady = readiness.resultReady === true && convergenceReady;
  const releaseBinding = governLafeaWorkbenchReleaseBindingForResultCurrentness(
    readiness.releaseBinding,
    { governedMesh: true, resultReady },
  );
  return freeze({
    ...readiness,
    resultReady,
    resultState: resultReady ? 'RESULT_READY' : 'RESULT_NOT_READY',
    convergenceApplicable: true,
    convergenceReady,
    releaseBinding,
    releaseState: releaseBinding.releaseQualified ? 'RELEASE_QUALIFIED' : 'RELEASE_NOT_QUALIFIED',
    releaseBlockingReasons: [...releaseBinding.reasons],
    blockingReasons: convergenceReady
      ? readiness.blockingReasons.filter((reason) => reason !== RESULT_BLOCK_REASON)
      : unique([...readiness.blockingReasons, RESULT_BLOCK_REASON]),
  });
}

function currentnessReasons(retained, stage) {
  const reasons = [];
  const sourceHash = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (retained.sourceHash !== sourceHash) reasons.push('CONVERGENCE_SOURCE_STALE');
  if (retained.analysisDomainHash !== stage?.analysisDomainProjection?.analysisDomainHash) {
    reasons.push('CONVERGENCE_DOMAIN_STALE');
  }
  if (retained.analysisGeometryHash !== stage?.analysisGeometryProjection?.analysisGeometryHash) {
    reasons.push('CONVERGENCE_GEOMETRY_STALE');
  }
  const artifact = stage?.lifecycle?.artifacts?.CONVERGENCE;
  const expectedStatus = retained.usableForResultPublication ? 'CURRENT' : 'BLOCKED';
  if (artifact?.artifactHash !== retained.semanticHash || artifact?.status !== expectedStatus) {
    reasons.push('CONVERGENCE_LIFECYCLE_CUSTODY_STALE');
  }
  return unique(reasons);
}

function projection(state, usableForResultPublication, reasons, retained = null) {
  return freeze({
    schema: LAFEA_CONTINUUM_CONVERGENCE_PROJECTION_SCHEMA,
    stageId: STAGE_ID,
    state,
    usableForResultPublication,
    reasons: unique(reasons),
    studyId: retained?.studyId ?? null,
    evidenceHash: retained?.semanticHash ?? null,
    classification: retained?.classification ?? null,
    releaseQualified: false,
  });
}

function unique(values) { return [...new Set((values ?? []).filter(Boolean))]; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
