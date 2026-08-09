/**
 * Generation and custody slice for domain-first (v2) analysis-mesh evidence.
 *
 * The legacy v1 slice in `lafea-workbench-mesh-state.js` retains a mesh the
 * user imported. This slice retains the bound mesh profile and the mesh the
 * qualified producer generated, so the domain-first custody projection has
 * something to classify. It holds no listeners and publishes nothing itself.
 *
 * Custody is only mutated after evidence has been fully built and validated
 * (`NO_CUSTODY_MUTATION_UNTIL_FULL_EVIDENCE_ACCEPTED`): a generation or
 * recovery that throws leaves the previously retained mesh exactly as it was.
 */
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import {
  lafeaMeshGenerationConfiguration,
  planLafeaAnalysisMesh,
  produceLafeaAnalysisMeshEvidence,
} from './lafea-mesh-producer-binding.js';

export function createLafeaWorkbenchMeshGenerationState(stageIds) {
  const profiles = new Map(stageIds.map((stageId) => [stageId, null]));
  const evidence = new Map(stageIds.map((stageId) => [stageId, null]));
  const lastPlan = new Map(stageIds.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireStage(stageId);
    return freeze({
      retainedAnalysisMeshProfile: profiles.get(stageId),
      retainedAnalysisMeshEvidenceV2: evidence.get(stageId),
      lastAnalysisMeshPlan: lastPlan.get(stageId),
    });
  }

  /**
   * Bind the governed mesh profile. Its semantic hash is the binding the
   * custody layer checks, so rebinding a different profile discards any mesh
   * generated under the previous one rather than leaving a mismatched pair.
   */
  function bindMeshProfile(value, stageId) {
    requireStage(stageId);
    const profile = canonicalLafeaAnalysisMeshProfile(value);
    const current = profiles.get(stageId);
    if (current?.semanticHash === profile.semanticHash) {
      return freeze({ changed: false, meshProfile: current });
    }
    profiles.set(stageId, profile);
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, meshProfile: profile });
  }

  /** Run the producer and describe the result without touching custody. */
  function planMesh(stage, overrides = {}) {
    const stageId = stage.stageId;
    const configuration = configurationFor(stageId, overrides);
    const planned = planLafeaAnalysisMesh(stage, configuration);
    lastPlan.set(stageId, summarize(planned));
    return freeze({ configuration, planned, summary: lastPlan.get(stageId) });
  }

  /** Generate, validate, and only then retain as the stage's analysis mesh. */
  function generateMesh(stage, overrides = {}) {
    const stageId = stage.stageId;
    const configuration = configurationFor(stageId, overrides);
    const produced = produceLafeaAnalysisMeshEvidence(stage, configuration);
    const validated = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
    evidence.set(stageId, validated);
    lastPlan.set(stageId, summarize(produced.planned));
    return freeze({
      changed: true,
      evidence: validated,
      summary: lastPlan.get(stageId),
    });
  }

  function validateEvidence(value) {
    return validateLafeaAnalysisMeshEvidenceV2(value);
  }

  /**
   * Recover a portable v2 evidence artifact after its profile has been rebound
   * by the orchestrator action. Parent currentness is deliberately not guessed
   * here; the domain-first custody projection classifies the retained evidence
   * as CURRENT_PASS/CURRENT_BLOCK/STALE after publication.
   */
  function recoverEvidence(value, stageId) {
    requireStage(stageId);
    const validated = validateEvidence(value);
    if (validated.stageId !== stageId) {
      fail('LAFEA_ANALYSIS_MESH_V2_RECOVERY_STAGE_MISMATCH');
    }
    const profile = profiles.get(stageId);
    if (!profile || profile.semanticHash !== validated.meshProfileHash) {
      fail('LAFEA_ANALYSIS_MESH_V2_RECOVERY_PROFILE_NOT_BOUND');
    }
    const retained = evidence.get(stageId);
    if (sameEvidence(retained, validated)) {
      return freeze({ changed: false, evidence: retained, meshProfile: profile });
    }
    if (retained) fail('LAFEA_ANALYSIS_MESH_V2_RECOVERY_CONFLICTING_REPLAY');
    evidence.set(stageId, validated);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, evidence: validated, meshProfile: profile });
  }

  function selectEvidence(stageId) { requireStage(stageId); return evidence.get(stageId); }
  function selectMeshProfile(stageId) { requireStage(stageId); return profiles.get(stageId); }
  function selectPlan(stageId) { requireStage(stageId); return lastPlan.get(stageId); }
  function exportEvidence(stageId) { return selectEvidence(stageId); }

  /** Any change to the source, domain or geometry invalidates a generated mesh. */
  function invalidate(stageId) {
    requireStage(stageId);
    if (!evidence.get(stageId) && !lastPlan.get(stageId)) return false;
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
    return true;
  }

  function clear(stageId) {
    requireStage(stageId);
    profiles.set(stageId, null);
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
  }

  return Object.freeze({
    fields, bindMeshProfile, planMesh, generateMesh,
    validateEvidence, recoverEvidence, exportEvidence,
    selectEvidence, selectMeshProfile, selectPlan, invalidate, clear,
  });

  function configurationFor(stageId, overrides) {
    const profile = profiles.get(stageId);
    if (!profile) fail('LAFEA_ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
    return lafeaMeshGenerationConfiguration(profile, overrides);
  }
  function requireStage(stageId) {
    if (!profiles.has(stageId)) fail('LAFEA_ANALYSIS_MESH_GENERATION_STAGE_NOT_FOUND');
  }
}

/** The plan facts the Discretization surface displays, without the mesh itself. */
function summarize(planned) {
  return freeze({
    schema: 'lafea-analysis-mesh-plan-summary/v1',
    stageId: planned.plan.stageId,
    elementFamily: planned.plan.elementFamily,
    strategy: planned.generated.strategy,
    strategyReason: planned.generated.strategyReason,
    nodeCount: planned.plan.estimatedNodes,
    elementCount: planned.plan.estimatedElements,
    estimatedDofs: planned.plan.estimatedDofs,
    boundarySegmentCount: planned.generated.boundarySegmentCount,
    characteristicLengthMin: planned.plan.characteristicLengthMin,
    characteristicLengthMedian: planned.plan.characteristicLengthMedian,
    characteristicLengthMax: planned.plan.characteristicLengthMax,
    resourceDisposition: planned.plan.resourceDisposition,
    intentHash: planned.intent.semanticHash,
    planHash: planned.plan.planHash,
    capabilityHash: planned.capabilityHash,
    qualificationHash: planned.qualificationHash,
    producerRef: planned.producerRef,
  });
}

function sameEvidence(left, right) {
  return Boolean(left)
    && left.artifactHash === right.artifactHash
    && JSON.stringify(left) === JSON.stringify(right);
}

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
