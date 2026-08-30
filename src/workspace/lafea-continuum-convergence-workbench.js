import { buildLafeaWorkbenchOrchestrationProjection } from './lafea-workbench-orchestration-projection.js';
import {
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
} from './lafea-continuum-probe-convergence.js';
import {
  enrichLafeaContinuumConvergenceState,
  projectLafeaContinuumConvergence,
} from './lafea-continuum-convergence-publication.js';
import {
  createLafeaContinuumConvergenceLifecycleRegistration,
  createLafeaContinuumConvergenceStudyDefinition,
  createLafeaContinuumConvergenceStudyEvidence,
  deriveLafeaContinuumConvergenceMeshProfile,
} from './lafea-continuum-convergence-study.js';

export const LAFEA_CONTINUUM_CONVERGENCE_CUSTODY_SCHEMA =
  'lafea-continuum-convergence-custody/v1';

const STAGE_ID = 'LAFEA.3';

export function createLafeaContinuumConvergenceWorkbench(baseStore) {
  requireBaseStore(baseStore);
  let retained = null;

  function runContinuumConvergenceStudy(request) {
    let definition = null;
    const levelReceipts = [];
    try {
      const initialStage = requireActiveDomainStage(baseStore.getState());
      const baseProfile = baseStore.selectRetainedAnalysisMeshProfile(STAGE_ID);
      if (!baseProfile) fail('LAFEA3_CONVERGENCE_BASE_MESH_PROFILE_REQUIRED');
      definition = createLafeaContinuumConvergenceStudyDefinition(request);
      const parents = frozenParents(initialStage);
      retained = null;

      for (const level of definition.convergenceDefinition.levels) {
        const meshProfile = executeLevel(baseStore, baseProfile, definition, level, parents);
        const solvedStage = baseStore.getState().stages[STAGE_ID];
        const probeEvidence = baseStore.evaluateContinuumPhysicalProbe(definition.probe, STAGE_ID);
        if (!probeEvidence || probeEvidence.status !== 'PASS') {
          fail('LAFEA3_CONVERGENCE_PROBE_NOT_PASS');
        }
        levelReceipts.push(levelReceipt(level, meshProfile, solvedStage, probeEvidence));
      }

      requireDistinctLevelMeshes(levelReceipts);
      const observations = baseStore.createContinuumProbeConvergenceObservations({
        schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
        studyId: definition.studyId,
        definitionHash: definition.convergenceDefinitionHash,
        levels: levelReceipts.map((row) => ({ levelId: row.levelId, evidence: row.probeEvidence })),
      });
      const convergence = baseStore.evaluateContinuumProbeConvergence(
        definition.convergenceDefinition,
        observations,
      );
      const study = createLafeaContinuumConvergenceStudyEvidence({
        definition,
        convergence,
        levels: levelReceipts,
        ...parents,
        baseMeshProfileHash: baseProfile.semanticHash,
      });
      retainAndRegisterStudy(baseStore, study);
      const state = getState();
      return freeze({
        schema: LAFEA_CONTINUUM_CONVERGENCE_CUSTODY_SCHEMA,
        stageId: STAGE_ID,
        status: study.usableForResultPublication ? 'CURRENT_PASS' : 'CURRENT_BLOCK',
        study,
        projection: state.stages[STAGE_ID].continuumConvergenceProjection,
        resultReady: state.stages[STAGE_ID].lifecycleReadiness.resultReady,
        releaseQualified: false,
      });
    } catch (error) {
      retained = failedCustody(definition, levelReceipts, error);
      throw error;
    }
  }

  function retainAndRegisterStudy(store, study) {
    const registration = createLafeaContinuumConvergenceLifecycleRegistration(study);
    retained = study;
    store.registerLifecycleArtifact(registration.record, registration.registrationId);
    const registered = store.getState().stages[STAGE_ID]?.lifecycle?.artifacts?.CONVERGENCE;
    const expectedStatus = study.usableForResultPublication ? 'CURRENT' : 'BLOCKED';
    if (registered?.artifactHash !== study.semanticHash || registered.status !== expectedStatus) {
      fail('LAFEA3_CONVERGENCE_LIFECYCLE_REGISTRATION_DIVERGED');
    }
  }

  function getState() {
    return enrichLafeaContinuumConvergenceState(baseStore.getState(), retained);
  }
  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('LAFEA subscriber must be a function.');
    return baseStore.subscribe((state) => listener(enrichLafeaContinuumConvergenceState(state, retained)));
  }
  function buildOrchestrationProjection(stageId = baseStore.getState().activeStageId) {
    const stage = getState().stages[stageId];
    if (!stage) fail('LAFEA_WORKBENCH_STAGE_NOT_FOUND');
    return buildLafeaWorkbenchOrchestrationProjection(stage);
  }

  return Object.freeze({
    ...baseStore,
    runContinuumConvergenceStudy,
    selectRetainedContinuumConvergenceStudy: () => retained,
    buildContinuumConvergenceProjection: () =>
      projectLafeaContinuumConvergence(retained, baseStore.getState().stages[STAGE_ID]),
    getState,
    subscribe,
    buildOrchestrationProjection,
  });
}

function executeLevel(store, baseProfile, definition, level, parents) {
  assertParentsCurrent(store.getState().stages[STAGE_ID], parents);
  const meshProfile = deriveLafeaContinuumConvergenceMeshProfile(baseProfile, definition, level);
  store.bindAnalysisMeshProfile(meshProfile, STAGE_ID);
  requireStoreHealthy(store.getState(), 'LAFEA3_CONVERGENCE_PROFILE_BIND_REJECTED');
  const generated = store.generateAnalysisMesh({}, STAGE_ID);
  if (!generated?.evidence || generated.evidence.qualification !== 'PASS') {
    fail('LAFEA3_CONVERGENCE_MESH_GENERATION_NOT_PASS');
  }
  const preflight = store.prepareContinuumForRun();
  if (preflight?.projection?.state !== 'CURRENT_PASS'
    || preflight.projection.usableForAuthorization !== true) {
    fail('LAFEA3_CONVERGENCE_PREFLIGHT_NOT_CURRENT_PASS');
  }
  store.run();
  const solvedStage = store.getState().stages[STAGE_ID];
  requireQualifiedExecution(solvedStage);
  assertParentsCurrent(solvedStage, parents);
  return meshProfile;
}

function frozenParents(stage) {
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash;
  const analysisDomainHash = stage.analysisDomainProjection?.analysisDomainHash;
  const analysisGeometryHash = stage.analysisGeometryProjection?.analysisGeometryHash;
  if (!sourceHash || !analysisDomainHash || !analysisGeometryHash) {
    fail('LAFEA3_CONVERGENCE_CURRENT_PARENTS_REQUIRED');
  }
  return freeze({ sourceHash, analysisDomainHash, analysisGeometryHash });
}
function requireActiveDomainStage(state) {
  if (state?.activeStageId !== STAGE_ID) fail('LAFEA3_CONVERGENCE_ACTIVE_STAGE_REQUIRED');
  const stage = state.stages?.[STAGE_ID];
  if (!stage?.domainFirstProfileActive
    || stage.analysisDomainProjection?.state !== 'CURRENT_PASS'
    || stage.analysisGeometryProjection?.state !== 'CURRENT_PASS') {
    fail('LAFEA3_CONVERGENCE_DOMAIN_GEOMETRY_CURRENT_REQUIRED');
  }
  return stage;
}
function assertParentsCurrent(stage, parents) {
  const current = frozenParents(stage);
  if (current.sourceHash !== parents.sourceHash
    || current.analysisDomainHash !== parents.analysisDomainHash
    || current.analysisGeometryHash !== parents.analysisGeometryHash) {
    fail('LAFEA3_CONVERGENCE_STUDY_PARENT_CHANGED');
  }
}
function requireQualifiedExecution(stage) {
  if (stage?.execution?.status !== 'QUALIFIED'
    || stage.lifecycle?.artifacts?.RECOVERY?.status !== 'CURRENT'
    || stage.lifecycle.artifacts.RECOVERY.qualification !== 'PASS') {
    fail('LAFEA3_CONVERGENCE_EXECUTION_RECOVERY_NOT_CURRENT_PASS');
  }
}

function levelReceipt(level, meshProfile, stage, probeEvidence) {
  return freeze({
    levelId: level.levelId,
    h: level.h,
    meshProfileHash: meshProfile.semanticHash,
    meshHash: probeEvidence.custody.meshHash,
    solverModelHash: probeEvidence.custody.solverModelHash,
    executionHash: probeEvidence.custody.executionHash,
    recoveryHash: stage.lifecycle.artifacts.RECOVERY.artifactHash,
    probeEvidenceHash: probeEvidence.semanticHash,
    probeIdentityHash: probeEvidence.probeIdentityHash,
    quantityIdentityHash: probeEvidence.quantityIdentityHash,
    authoritativeValue: probeEvidence.authoritativeValue,
    authoritativeUnits: probeEvidence.authoritativeUnits,
    probeEvidence,
  });
}
function failedCustody(definition, rows, error) {
  return freeze({
    schema: LAFEA_CONTINUUM_CONVERGENCE_CUSTODY_SCHEMA,
    stageId: STAGE_ID,
    status: 'FAILED',
    studyId: definition?.studyId ?? null,
    definitionHash: definition?.semanticHash ?? null,
    completedLevels: rows.map((row) => freeze({
      levelId: row.levelId,
      h: row.h,
      meshHash: row.meshHash,
      executionHash: row.executionHash,
      recoveryHash: row.recoveryHash,
      probeEvidenceHash: row.probeEvidenceHash,
    })),
    errorCode: typeof error?.code === 'string' ? error.code : 'LAFEA3_CONVERGENCE_STUDY_FAILED',
    releaseQualified: false,
  });
}
function requireDistinctLevelMeshes(rows) {
  if (new Set(rows.map((row) => row.meshHash)).size !== rows.length) {
    fail('LAFEA3_CONVERGENCE_LEVEL_MESHES_NOT_DISTINCT');
  }
}
function requireStoreHealthy(state, code) { if (state?.status === 'FAILED') fail(code); }
function requireBaseStore(value) {
  const required = [
    'getState', 'subscribe', 'selectRetainedAnalysisMeshProfile', 'bindAnalysisMeshProfile',
    'generateAnalysisMesh', 'prepareContinuumForRun', 'run', 'evaluateContinuumPhysicalProbe',
    'createContinuumProbeConvergenceObservations', 'evaluateContinuumProbeConvergence',
    'registerLifecycleArtifact',
  ];
  if (!value || required.some((name) => typeof value[name] !== 'function')) {
    throw new TypeError('LAFEA3_CONVERGENCE_BASE_STORE_INVALID');
  }
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
