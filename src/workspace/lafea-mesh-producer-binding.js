/**
 * Qualified-producer binding for the registered LAFEA core mesher.
 *
 * Governing chain:
 *   analysis geometry -> intent v2 -> plan v2 -> engine -> output v2 -> evidence v2
 *
 * The default route uses the general planar continuum mesher. The same
 * registered producer also owns one narrowly qualified automatic strategy for
 * B02D: a frozen probe-stable polar annulus selected by a source-controlled
 * qualified mesh-profile identity. Selection is not encoded as a refinement
 * feature because the frozen B02D request explicitly requires an empty
 * refinementFeatureIds list. The strategy is rejected unless the retained
 * analysis geometry is exactly the qualified 20/100 mm concentric annulus and
 * target h is one of the four frozen B02D levels.
 */
import {
  generateLafeaB02dProbeStablePolarMesh,
} from '../core/lafea-meshing/b02d-probe-stable-polar-mesh.js';
import {
  createLafeaMeshProducerCapability,
  createLafeaMeshProducerQualification,
} from './lafea-mesh-producer-contract.js';
import {
  buildLafeaMeshProducerReadinessV2,
} from './lafea-domain-first-producer-readiness.js';
import {
  LAFEA_MESH_GENERATION_INTENT_V2_SCHEMA,
  createLafeaMeshGenerationIntentV2,
} from './lafea-domain-first-requests.js';
import {
  LAFEA_MESH_PLAN_V2_SCHEMA,
  LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
  createLafeaMeshPlanV2,
  createLafeaMeshProducerOutputV2,
} from './lafea-mesh-producer-v2-contracts.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import {
  buildLafeaContinuumMeshCandidateV3,
  createLafeaContinuumMeshCandidateFailureV3,
} from './lafea-continuum-mesh-v3-production.js';
import { requireLafeaStageAnalysisAdapter } from './lafea-stage-analysis-adapter.js';
import {
  buildLafeaMeshTopology,
  lafeaMeshTopologySupported,
} from './lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from './lafea-mesh-producer-engine.js';
import {
  LAFEA_MESH_PRODUCER_ENGINE_ID,
  LAFEA_MESH_PRODUCER_ENGINE_REVISION,
  LAFEA_MESH_PRODUCER_GENERATION_MODES,
  LAFEA_MESH_PRODUCER_GOVERNANCE_REF,
  LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED,
  LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
  LAFEA_MESH_PRODUCER_QUALIFICATION_ID,
  LAFEA_MESH_PRODUCER_QUALIFICATION_REVISION,
  LAFEA_MESH_PRODUCER_QUALITY_POLICY_ID,
  LAFEA_MESH_PRODUCER_REF,
  lafeaMeshProducerBound,
  lafeaMeshProducerElementFamilies,
  lafeaMeshProducerScopes,
} from './lafea-mesh-producer-registry.js';

export { lafeaMeshProducerBound, lafeaMeshProducerElementFamilies };
export { LAFEA_MESH_PRODUCER_REF, LAFEA_MESH_PRODUCER_GOVERNANCE_REF };

export const LAFEA_MESH_PRODUCER_BINDING_SCHEMA = 'lafea-mesh-producer-binding/v1';
export const LAFEA_B02D_POLAR_PROFILE_PREFIX = 'B02D_PROBE_STABLE_POLAR_QUALIFIED';
export const LAFEA_B02D_POLAR_PROFILE_SOURCE_REVISION = 'B02D-FROZEN-POLAR-V1';

const MAXIMUM_NODES = LAFEA_MESH_PRODUCER_MAXIMUM_NODES;
const MAXIMUM_ELEMENTS = LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS;
const MAXIMUM_ESTIMATED_DOFS = LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS;

let cachedCapability = null;
let cachedQualification = null;

export function lafeaCoreMeshProducerCapability() {
  if (!cachedCapability) {
    cachedCapability = createLafeaMeshProducerCapability({
      schema: 'lafea-mesh-producer-capability/v1',
      producerId: LAFEA_MESH_PRODUCER_ENGINE_ID,
      producerRevision: LAFEA_MESH_PRODUCER_ENGINE_REVISION,
      scopes: lafeaMeshProducerScopes().map((scope) => ({
        stageId: scope.stageId,
        elementFamilies: [...scope.elementFamilies],
      })),
      generationModes: [...LAFEA_MESH_PRODUCER_GENERATION_MODES],
      supportsLocalRefinement: LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED,
      repeatabilityPolicy: 'BYTE_IDENTICAL_CANONICAL_MESH_V1',
      qualityPolicyId: LAFEA_MESH_PRODUCER_QUALITY_POLICY_ID,
      rollbackPolicy: 'NO_CUSTODY_MUTATION_UNTIL_FULL_EVIDENCE_ACCEPTED',
      publicationPolicy: 'ATOMIC_EVIDENCE_CUSTODY_AFTER_VALIDATION',
      maximumNodes: MAXIMUM_NODES,
      maximumElements: MAXIMUM_ELEMENTS,
      maximumEstimatedDofs: MAXIMUM_ESTIMATED_DOFS,
    });
  }
  return cachedCapability;
}

export function lafeaCoreMeshProducerQualification() {
  if (!cachedQualification) {
    const capability = lafeaCoreMeshProducerCapability();
    cachedQualification = createLafeaMeshProducerQualification({
      schema: 'lafea-mesh-producer-qualification/v1',
      qualificationId: LAFEA_MESH_PRODUCER_QUALIFICATION_ID,
      qualificationRevision: LAFEA_MESH_PRODUCER_QUALIFICATION_REVISION,
      capabilityHash: capability.capabilityHash,
      authorizedScopes: capability.scopes.map((scope) => ({
        stageId: scope.stageId,
        elementFamilies: [...scope.elementFamilies],
      })),
      authorizedGenerationModes: [...LAFEA_MESH_PRODUCER_GENERATION_MODES],
      localRefinementAuthorized: LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED,
      maximumNodes: MAXIMUM_NODES,
      maximumElements: MAXIMUM_ELEMENTS,
      maximumEstimatedDofs: MAXIMUM_ESTIMATED_DOFS,
      repeatabilityPolicy: capability.repeatabilityPolicy,
      qualityPolicyId: capability.qualityPolicyId,
      rollbackPolicy: capability.rollbackPolicy,
      publicationPolicy: capability.publicationPolicy,
      governanceRef: LAFEA_MESH_PRODUCER_GOVERNANCE_REF,
      invalidationPolicy: 'INVALIDATE_ON_CORE_MESHER_REVISION_CHANGE',
    });
  }
  return cachedQualification;
}

export function lafeaMeshGenerationConfiguration(meshProfileValue, overrides = {}) {
  const meshProfile = canonicalLafeaAnalysisMeshProfile(meshProfileValue);
  const elementFamily = meshProfile.fields.continuumElement;
  const targetElementLength = meshProfile.fields.globalTargetSize;
  if (overrides.elementFamily !== undefined && overrides.elementFamily !== elementFamily) {
    fail('LAFEA_MESH_GENERATION_PROFILE_ELEMENT_FAMILY_OVERRIDE_MISMATCH');
  }
  if (overrides.targetElementLength !== undefined
    && overrides.targetElementLength !== targetElementLength) {
    fail('LAFEA_MESH_GENERATION_PROFILE_TARGET_LENGTH_OVERRIDE_MISMATCH');
  }
  return Object.freeze({
    meshProfile,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily,
    targetElementLength,
    growthLimit: meshProfile.fields.adjacentSizeRatioMax,
    curvatureToleranceDegrees: overrides.curvatureToleranceDegrees ?? 15,
    maximumNodes: MAXIMUM_NODES,
    maximumElements: MAXIMUM_ELEMENTS,
    maximumEstimatedDofs: MAXIMUM_ESTIMATED_DOFS,
    refinementFeatureIds: Object.freeze([]),
  });
}

export function planLafeaAnalysisMesh(stage, configuration) {
  const geometryEvidence = requireGeometryEvidence(stage);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const intent = buildIntent(stage, configuration);
  const readiness = buildLafeaMeshProducerReadinessV2(intent, capability, qualification);
  if (!readiness.producerContractReady) {
    fail(readiness.reasons[0] ?? 'LAFEA_MESH_PRODUCER_CONTRACT_NOT_READY');
  }

  let generated;
  if (usesB02dPolarStrategy(configuration, intent)) {
    requireB02dPolarGeometry(geometryEvidence.geometry);
    generated = generateLafeaB02dProbeStablePolarMesh({
      targetElementLength: intent.targetElementLength,
      elementFamily: intent.elementFamily,
    });
  } else {
    const adapter = buildLafeaMeshTopology(geometryEvidence.geometry);
    if (!lafeaMeshTopologySupported(adapter)) {
      fail('LAFEA_MESH_GENERATION_HOLES_NOT_SUPPORTED');
    }
    generated = generateLafeaAnalysisMesh(adapter, {
      targetElementLength: intent.targetElementLength,
      curvatureToleranceDegrees: intent.curvatureToleranceDegrees,
      elementFamily: intent.elementFamily,
    });
  }

  const exceeds = generated.nodeCount > intent.maximumNodes
    || generated.elementCount > intent.maximumElements
    || generated.estimatedDofs > intent.maximumEstimatedDofs;

  const plan = createLafeaMeshPlanV2({
    schema: LAFEA_MESH_PLAN_V2_SCHEMA,
    stageId: 'LAFEA.3',
    intentHash: intent.semanticHash,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    sourceHash: intent.sourceHash,
    analysisDomainHash: intent.analysisDomainHash,
    analysisGeometryHash: intent.analysisGeometryHash,
    meshProfileHash: intent.meshProfileHash,
    elementFamily: intent.elementFamily,
    estimatedNodes: generated.nodeCount,
    estimatedElements: generated.elementCount,
    estimatedDofs: generated.estimatedDofs,
    characteristicLengthMin: generated.characteristicLengthMin,
    characteristicLengthMedian: generated.characteristicLengthMedian,
    characteristicLengthMax: generated.characteristicLengthMax,
    refinementFeatureIds: [...intent.refinementFeatureIds],
    resourceDisposition: exceeds ? 'BLOCK' : 'WITHIN_LIMITS',
  });

  return Object.freeze({
    schema: LAFEA_MESH_PRODUCER_BINDING_SCHEMA,
    intent,
    plan,
    readiness,
    generated,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerRef: LAFEA_MESH_PRODUCER_REF,
    resourceDisposition: plan.resourceDisposition,
  });
}

export function produceLafeaAnalysisMeshEvidence(stage, configuration) {
  const planned = configuration?.planned ?? planLafeaAnalysisMesh(stage, configuration);
  if (planned.plan.resourceDisposition === 'BLOCK') {
    fail('LAFEA_MESH_GENERATION_RESOURCE_LIMIT_EXCEEDED');
  }
  const { intent, plan, generated } = planned;
  const output = createLafeaMeshProducerOutputV2({
    schema: LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
    stageId: 'LAFEA.3', intentHash: intent.semanticHash, planHash: plan.planHash,
    capabilityHash: plan.capabilityHash, qualificationHash: plan.qualificationHash,
    producerId: plan.producerId, producerRevision: plan.producerRevision,
    sourceHash: plan.sourceHash, analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash, meshProfileHash: plan.meshProfileHash,
    elementFamily: plan.elementFamily, mesh: generated.mesh,
  });
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: output.sourceHash,
    analysisDomainHash: output.analysisDomainHash,
    analysisGeometryHash: output.analysisGeometryHash,
    meshProfile: requireMeshProfile(configuration, planned), mesh: output.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.3', authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT', producerRef: LAFEA_MESH_PRODUCER_REF,
      sourceHash: output.sourceHash, analysisDomainHash: output.analysisDomainHash,
      analysisGeometryHash: output.analysisGeometryHash, meshProfileHash: output.meshProfileHash,
      meshHash: output.meshHash, capabilityHash: output.capabilityHash,
      qualificationHash: output.qualificationHash, planHash: output.planHash,
    },
  });
  return Object.freeze({ planned, output, evidence });
}

/**
 * Preserve the v2 producer as the numerical authority, then derive the parallel
 * v3 engineering candidate behind this already-manual-chunked producer seam.
 * Candidate construction is fail-closed and never revokes or widens v2 authority.
 */
export function produceLafeaAnalysisMeshEvidenceWithV3Candidate(stage, configuration) {
  const produced = produceLafeaAnalysisMeshEvidence(stage, configuration);
  const meshProfile = requireMeshProfile(configuration, produced.planned);
  let candidateV3;
  try {
    candidateV3 = buildLafeaContinuumMeshCandidateV3({
      stage,
      meshProfile,
      produced,
    });
  } catch (error) {
    candidateV3 = createLafeaContinuumMeshCandidateFailureV3(stage, error);
  }
  return Object.freeze({ ...produced, candidateV3 });
}

function buildIntent(stage, configuration) {
  const adapter = requireLafeaStageAnalysisAdapter('LAFEA.3');
  return createLafeaMeshGenerationIntentV2({
    schema: LAFEA_MESH_GENERATION_INTENT_V2_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: requireSourceHash(stage),
    analysisDomainHash: requireCurrent(stage.analysisDomainProjection, 'DOMAIN').analysisDomainHash,
    analysisGeometryHash: requireCurrent(stage.analysisGeometryProjection, 'GEOMETRY').analysisGeometryHash,
    meshProfileHash: configuration.meshProfileHash,
    targetElementLength: configuration.targetElementLength,
    lengthUnit: configuration.lengthUnit ?? 'mm', elementFamily: configuration.elementFamily,
    curvatureToleranceDegrees: configuration.curvatureToleranceDegrees,
    growthLimit: configuration.growthLimit, maximumNodes: configuration.maximumNodes,
    maximumElements: configuration.maximumElements,
    maximumEstimatedDofs: configuration.maximumEstimatedDofs,
    refinementFeatureIds: configuration.refinementFeatureIds ?? [],
    allowT3Fallback: configuration.elementFamily === 'T3',
    stageAdapterId: adapter.adapterId,
    stageAdapterRevision: adapter.adapterId.split(':').at(-1),
  });
}

function usesB02dPolarStrategy(configuration, intent) {
  const profile = configuration.meshProfile;
  const selected = profile?.profileIdentity === b02dProfileIdentity(intent.elementFamily, intent.targetElementLength)
    && profile?.sourceRevision === LAFEA_B02D_POLAR_PROFILE_SOURCE_REVISION;
  if (!selected) return false;
  if (intent.refinementFeatureIds.length !== 0) {
    fail('LAFEA_B02D_POLAR_REFINEMENT_FEATURES_MUST_REMAIN_EMPTY');
  }
  return true;
}

export function b02dProfileIdentity(elementFamily, h) {
  const encoded = Number.isInteger(h) ? String(h) : String(h).replace('.', '_');
  return `${LAFEA_B02D_POLAR_PROFILE_PREFIX}_${elementFamily}_H${encoded}`;
}

function requireB02dPolarGeometry(geometry) {
  const loopsByRole = new Map(geometry.loops.map((loop) => [loop.role, loop]));
  const outer = loopsByRole.get('OUTER');
  const hole = loopsByRole.get('HOLE');
  if (!outer || !hole || geometry.loops.length !== 2) {
    fail('LAFEA_B02D_POLAR_GEOMETRY_NOT_QUALIFIED');
  }
  const segments = new Map(geometry.segments.map((row) => [row.segmentId, row]));
  requireCircularLoop(outer, segments, 100, 'CCW');
  requireCircularLoop(hole, segments, 20, 'CW');
  const owned = new Set([...outer.segmentIds, ...hole.segmentIds]);
  if (owned.size !== geometry.segments.length) fail('LAFEA_B02D_POLAR_GEOMETRY_NOT_QUALIFIED');
}
function requireCircularLoop(loop, segments, radius, sweep) {
  if (loop.segmentIds.length < 3) fail('LAFEA_B02D_POLAR_GEOMETRY_NOT_QUALIFIED');
  for (const segmentId of loop.segmentIds) {
    const segment = segments.get(segmentId);
    if (!segment || segment.type !== 'CIRCULAR_ARC' || segment.sweep !== sweep
      || Math.abs(segment.centerX) > 1e-12 || Math.abs(segment.centerY) > 1e-12
      || Math.abs(segment.radius - radius) > 1e-12) {
      fail('LAFEA_B02D_POLAR_GEOMETRY_NOT_QUALIFIED');
    }
  }
}
function requireGeometryEvidence(stage) {
  const evidence = stage?.retainedAnalysisGeometryEvidence;
  if (!evidence?.geometry) fail('LAFEA_MESH_GENERATION_ANALYSIS_GEOMETRY_ABSENT');
  return evidence;
}
function requireMeshProfile(configuration, planned) {
  const profile = configuration?.meshProfile ?? planned?.meshProfile;
  if (!profile) fail('LAFEA_MESH_GENERATION_MESH_PROFILE_REQUIRED');
  return profile;
}
function requireCurrent(projection, label) {
  if (projection?.state !== 'CURRENT_PASS') fail(`LAFEA_MESH_GENERATION_${label}_NOT_CURRENT`);
  return projection;
}
function requireSourceHash(stage) {
  const value = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (!value) fail('LAFEA_MESH_GENERATION_SOURCE_AUTHORITY_REQUIRED');
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
