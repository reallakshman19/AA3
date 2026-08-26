/**
 * LAFEA.3 production bridge from the qualified continuum mesher into Mesh Workspace v3.
 *
 * This module does not replace the qualified v2 numerical producer. It consumes the
 * exact generated v2 plan/output/evidence and derives v3 identity, dependencies,
 * independent FEM validation, quarantine lifecycle and fail-closed CAS custody.
 * Trusted authority is deliberately not manufactured here: a PASS candidate retains
 * as CURRENT_BLOCK until a protected authority service verifies and issues a receipt.
 */
import { createLafeaAnalysisMeshEvidenceV3, LAFEA_ANALYSIS_MESH_EVIDENCE_V3_SCHEMA } from './lafea-analysis-mesh-evidence-v3.js';
import { createLafeaAnalysisMeshIdentityV3 } from './lafea-analysis-mesh-identity-v3.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { qualifyLafeaContinuumGeneratedMeshDomainV3 } from './lafea-continuum-mesh-domain-conformance-v3.js';
import { validateLafeaContinuumAnalysisDomain } from './lafea-continuum-analysis-domain.js';
import { lafeaMeshAdapterCapabilityV3 } from './lafea-mesh-adapter-capability-v3.js';
import { createLafeaContinuumMeshAdapterPayloadV3 } from './lafea-mesh-adapter-payload-v3.js';
import {
  createLafeaMeshArtifactLifecycleV3,
  LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
  transitionLafeaMeshArtifactLifecycleV3,
} from './lafea-mesh-artifact-lifecycle-v3.js';
import { createLafeaMeshDependencyProjectionV3, LAFEA_MESH_DEPENDENCY_V3_SCHEMA } from './lafea-mesh-dependency-v3.js';
import { qualifyLafeaHighOrderJacobiansV3 } from './lafea-high-order-jacobian-qualification-v3.js';
import { commitLafeaMeshRetentionCasV3, LAFEA_MESH_RETENTION_V3_SCHEMA } from './lafea-mesh-retention-cas-v3.js';
import { qualifyLafeaMeshTopologyV3 } from './lafea-mesh-topology-qualification-v3.js';
import {
  createLafeaMeshValidationBundleV3,
  lafeaMeshValidationPolicyV3,
  LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA,
} from './lafea-mesh-validation-bundle-v3.js';
import {
  createLafeaMeshWorkspaceCapabilityV3,
  createLafeaMeshWorkspaceCommandV3,
  createLafeaMeshWorkspaceStateV3,
  expectedLafeaMeshCommandParentsV3,
  LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
  LAFEA_MESH_WORKSPACE_CAPABILITY_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA,
  LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
} from './lafea-mesh-workspace-v3.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import { buildLafeaMeshTopology } from './lafea-mesh-geometry-topology-adapter.js';

export const LAFEA_CONTINUUM_MESH_V3_CANDIDATE_SCHEMA = 'lafea-continuum-mesh-candidate/v3';
export const LAFEA_CONTINUUM_MESH_V3_FAILURE_SCHEMA = 'lafea-continuum-mesh-candidate-failure/v3';

export function buildLafeaContinuumMeshCandidateV3({ stage, meshProfile, produced }) {
  requireStage(stage);
  const domain = validateLafeaContinuumAnalysisDomain(stage.retainedAnalysisDomain);
  const geometryEvidence = stage.retainedAnalysisGeometryEvidence;
  const geometry = geometryEvidence?.geometry;
  if (!geometry || geometryEvidence.analysisDomainHash !== domain.semanticHash) {
    fail('LAFEA_CONTINUUM_MESH_V3_GEOMETRY_DOMAIN_PARENT_INVALID');
  }
  if (produced?.evidence?.stageId !== 'LAFEA.3' || produced?.output?.stageId !== 'LAFEA.3') {
    fail('LAFEA_CONTINUUM_MESH_V3_PRODUCED_STAGE_INVALID');
  }
  if (produced.evidence.qualification === 'BLOCK') {
    fail('LAFEA_CONTINUUM_MESH_V3_V2_QUALITY_BLOCKED');
  }
  if (produced.output.meshProfileHash !== meshProfile?.semanticHash) {
    fail('LAFEA_CONTINUUM_MESH_V3_PROFILE_PARENT_INVALID');
  }
  requireProducerParents(produced);

  const adapterTopology = buildLafeaMeshTopology(geometry);
  const dependency = dependencyProjection(stage, domain, geometryEvidence, meshProfile, adapterTopology);
  const adapterCapability = lafeaMeshAdapterCapabilityV3('LAFEA.3');
  const intent = produced.planned?.intent;
  if (!intent) fail('LAFEA_CONTINUUM_MESH_V3_PRODUCER_INTENT_REQUIRED');
  const adapterPayload = createLafeaContinuumMeshAdapterPayloadV3({
    schema: 'lafea-continuum-mesh-adapter-payload/v3',
    stageId: 'LAFEA.3',
    meshDependencyHash: dependency.meshDependencyHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: produced.output.elementFamily,
    sizingMode: 'ISOTROPIC_SCALAR_ONLY',
    targetElementLength: intent.targetElementLength,
    lengthUnit: intent.lengthUnit,
    curvatureToleranceDegrees: intent.curvatureToleranceDegrees,
    growthLimit: intent.growthLimit,
    fallbackPolicy: 'NONE',
  });
  if (adapterPayload.adapterCapabilityHash !== adapterCapability.capabilityHash) {
    fail('LAFEA_CONTINUUM_MESH_V3_ADAPTER_CAPABILITY_DRIFT');
  }

  const identity = createLafeaAnalysisMeshIdentityV3(produced.output.mesh);
  const topology = qualifyLafeaMeshTopologyV3(produced.output.mesh);
  const highOrder = qualifyLafeaHighOrderJacobiansV3(produced.output.mesh);
  const localQuality = localQualityGate(produced.evidence, identity.meshContentHash);
  const resources = structuralResourceGate(produced.output.mesh, produced);
  const domainGate = domainConformanceGate({
    domain,
    geometry,
    mesh: produced.output.mesh,
    meshContentHash: identity.meshContentHash,
    propertyBoundaryHash: dependency.propertyBoundaryHash,
  });

  const policy = lafeaMeshValidationPolicyV3('LAFEA.3', produced.output.elementFamily);
  const gates = [
    gate('DOMAIN_CONFORMANCE', domainGate.evidenceHash, domainGate.status),
    gate('GLOBAL_TOPOLOGY', topology.qualificationHash, topology.qualification),
    gate('LOCAL_ELEMENT_QUALITY', localQuality.evidenceHash, localQuality.status),
    gate('RUNTIME_RESOURCES', resources.evidenceHash, resources.status),
  ];
  if (produced.output.elementFamily === 'T6' || produced.output.elementFamily === 'Q8') {
    gates.push(gate('HIGH_ORDER_MAPPING', highOrder.qualificationHash, highOrder.qualification));
  }
  const validation = createLafeaMeshValidationBundleV3({
    schema: LAFEA_MESH_VALIDATION_BUNDLE_V3_SCHEMA,
    stageId: 'LAFEA.3',
    meshContentHash: identity.meshContentHash,
    meshDependencyHash: dependency.meshDependencyHash,
    policyHash: policy.policyHash,
    gates,
  }, policy);

  const evidenceV3 = createLafeaAnalysisMeshEvidenceV3({
    schema: LAFEA_ANALYSIS_MESH_EVIDENCE_V3_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: produced.output.sourceHash,
    meshDependencyHash: dependency.meshDependencyHash,
    meshContentHash: identity.meshContentHash,
    meshArtifactHash: identity.meshArtifactHash,
    meshProfileHash: produced.output.meshProfileHash,
    adapterCapabilityHash: adapterCapability.capabilityHash,
    producerCapabilityHash: produced.output.capabilityHash,
    producerQualificationHash: produced.output.qualificationHash,
    producerId: produced.output.producerId,
    producerRevision: produced.output.producerRevision,
    planHash: produced.output.planHash,
    outputHash: produced.output.outputHash,
    validationHash: validation.validationHash,
    transferHash: null,
  }, validation, policy);

  const workspace = workspaceScaffold(
    dependency,
    adapterCapability,
    adapterPayload,
    produced.output.qualificationHash,
    evidenceV3,
    validation,
    identity,
  );

  const core = freeze({
    schema: LAFEA_CONTINUUM_MESH_V3_CANDIDATE_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: produced.output.sourceHash,
    analysisDomainHash: domain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    dependency,
    adapterCapability,
    adapterPayload,
    identity,
    gates: freeze({ topology, highOrder, localQuality, resources, domain: domainGate }),
    validation,
    evidence: evidenceV3,
    artifactLifecycle: workspace.artifactLifecycle,
    workspaceState: workspace.workspaceState,
    generationCommandHash: workspace.generationCommand.commandHash,
    retentionCommandHash: workspace.retentionCommand?.commandHash ?? null,
    retentionCommitHash: workspace.retentionCommit?.commitHash ?? null,
    status: validation.qualification === 'PASS'
      ? 'VALIDATED_PENDING_TRUSTED_AUTHORITY'
      : 'BLOCKED_VALIDATION',
    engineeringAuthority: false,
    executionAuthorized: false,
  });
  return freeze({
    ...core,
    candidateHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-mesh-candidate-hash-input/v3', candidate: core,
    }),
  });
}

export function createLafeaContinuumMeshCandidateFailureV3(stage, error) {
  const code = typeof error?.code === 'string' ? error.code : 'LAFEA_CONTINUUM_MESH_V3_CANDIDATE_BUILD_FAILED';
  const record = freeze({
    schema: LAFEA_CONTINUUM_MESH_V3_FAILURE_SCHEMA,
    stageId: stage?.stageId ?? 'LAFEA.3',
    status: 'BLOCKED',
    code,
    engineeringAuthority: false,
    executionAuthorized: false,
  });
  return freeze({
    ...record,
    candidateHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-mesh-candidate-failure-hash-input/v3', candidate: record,
    }),
  });
}

function dependencyProjection(stage, domain, geometryEvidence, meshProfile, topologyAdapter) {
  const sourceHash = currentSourceHash(stage);
  if (domain.sourceHash !== sourceHash || geometryEvidence.sourceHash !== sourceHash) {
    fail('LAFEA_CONTINUUM_MESH_V3_SOURCE_PARENT_INVALID');
  }
  return createLafeaMeshDependencyProjectionV3({
    schema: LAFEA_MESH_DEPENDENCY_V3_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash,
    geometryTopologyHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-geometry-topology-parent/v3',
      topologySemanticHash: topologyAdapter.topology.semanticHash,
    }),
    analysisGeometryHash: geometryEvidence.analysisGeometryHash,
    propertyBoundaryHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-property-boundary-parent/v3',
      regionId: domain.region.regionId,
      geometryId: domain.region.geometryId,
      analysisGeometryHash: domain.region.analysisGeometryHash,
      partitionPolicy: 'SINGLE_REGION_NO_INTERNAL_PROPERTY_BOUNDARY',
    }),
    meshProfileHash: meshProfile.semanticHash,
    meshAffectingPropertyHash: null,
    geometryPredicateProfileHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-mesh-predicate-profile/v3',
      stageId: 'LAFEA.3',
      domainConformanceOperator: 'LAFEA3_LINE_BOUNDARY_POSITIVE_MAPPING_AREA_CLOSURE_V1',
      solverFeatureMappingToleranceRelative: 1e-8,
      domainAreaClosureRelative: 1e-8,
      highOrderMappingPolicy: 'OUTWARD_ROUNDED_INTERVAL_POLYNOMIAL_FULL_PARENT_DOMAIN_V3',
    }),
  });
}

function localQualityGate(v2Evidence, meshContentHash) {
  const worst = v2Evidence?.quality?.worstStatus;
  const status = worst === 'BLOCK' ? 'BLOCK' : worst === 'WARNING' ? 'WARNING' : 'PASS';
  const core = freeze({
    schema: 'lafea-continuum-local-element-quality-gate/v3',
    meshContentHash,
    v2MeshHash: v2Evidence.meshHash,
    quality: v2Evidence.quality,
    status,
    oracle: 'QUALIFIED_EXISTING_LOCAL_ELEMENT_QUALITY_POLICY',
  });
  return freeze({
    ...core,
    evidenceHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-local-element-quality-gate-hash-input/v3', gate: core,
    }),
  });
}

/**
 * This gate binds only dimensions the qualified producer actually records on the
 * generated artifact. Peak memory/time are not invented here and remain explicitly
 * outside this first v3 resource oracle.
 */
function structuralResourceGate(mesh, produced) {
  const intent = produced.planned?.intent;
  if (!intent) fail('LAFEA_CONTINUUM_MESH_V3_RESOURCE_INTENT_REQUIRED');
  const observedDofs = estimateLafeaMeshDofs('LAFEA.3', mesh.nodes.length);
  const violations = freeze([
    limit('NODES', mesh.nodes.length, intent.maximumNodes),
    limit('ELEMENTS', mesh.elements.length, intent.maximumElements),
    limit('DOFS', observedDofs, intent.maximumEstimatedDofs),
  ].filter((row) => row.exceeded));
  const core = freeze({
    schema: 'lafea-continuum-runtime-structural-resource-gate/v3',
    producerCapabilityHash: produced.output.capabilityHash,
    producerQualificationHash: produced.output.qualificationHash,
    observedNodes: mesh.nodes.length,
    observedElements: mesh.elements.length,
    observedDofs,
    maximumNodes: intent.maximumNodes,
    maximumElements: intent.maximumElements,
    maximumDofs: intent.maximumEstimatedDofs,
    measuredDimensions: freeze(['NODES', 'ELEMENTS', 'DOFS']),
    explicitlyUnmeasuredDimensions: freeze(['PEAK_RESIDENT_BYTES', 'ELAPSED_MILLISECONDS']),
    violations,
    status: violations.length ? 'BLOCK' : 'PASS',
    engineeringAuthority: false,
  });
  return freeze({
    ...core,
    evidenceHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-runtime-structural-resource-gate-hash-input/v3', gate: core,
    }),
  });
}

function domainConformanceGate(input) {
  try {
    const proof = qualifyLafeaContinuumGeneratedMeshDomainV3(input);
    return freeze({
      ...proof,
      evidenceHash: proof.evidence.qualificationHash,
      status: proof.evidence.qualification,
    });
  } catch (error) {
    const core = freeze({
      schema: 'lafea-continuum-domain-conformance-block/v3',
      stageId: 'LAFEA.3',
      meshContentHash: input.meshContentHash,
      code: typeof error?.code === 'string'
        ? error.code
        : 'LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_UNPROVEN',
      status: 'BLOCK',
      engineeringAuthority: false,
    });
    return freeze({
      ...core,
      evidenceHash: canonicalLafeaSha256({
        schema: 'lafea-continuum-domain-conformance-block-hash-input/v3', gate: core,
      }),
    });
  }
}

function workspaceScaffold(
  dependency,
  adapterCapability,
  adapterPayload,
  producerQualificationHash,
  evidence,
  validation,
  identity,
) {
  const capability = createLafeaMeshWorkspaceCapabilityV3({
    schema: LAFEA_MESH_WORKSPACE_CAPABILITY_V3_SCHEMA,
    stageId: 'LAFEA.3',
    adapterId: adapterCapability.adapterId,
    adapterRevision: adapterCapability.adapterRevision,
    adapterCapabilityHash: adapterCapability.capabilityHash,
    qualificationHash: producerQualificationHash,
    allowedCommands: ['GENERATE', 'RETAIN', 'INSPECT', 'EXPORT'],
  });
  const initialState = createLafeaMeshWorkspaceStateV3({
    schema: LAFEA_MESH_WORKSPACE_STATE_V3_SCHEMA,
    stageId: 'LAFEA.3',
    authorityVersion: LAFEA_MESH_WORKSPACE_AUTHORITY_VERSION,
    custodyState: 'ABSENT',
    meshDependencyHash: dependency.meshDependencyHash,
    retainedMeshContentHash: null,
    retainedEvidenceHash: null,
    retainedAuthorityReceiptHash: null,
    capabilityHash: capability.capabilityHash,
    qualificationHash: producerQualificationHash,
    adapterId: adapterCapability.adapterId,
    adapterRevision: adapterCapability.adapterRevision,
    concurrencyVersion: 0,
  });
  const generationCommand = createLafeaMeshWorkspaceCommandV3({
    schema: LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA,
    commandId: `LAFEA.3/V3/GENERATE/${adapterPayload.payloadHash}`,
    commandKind: 'GENERATE',
    stageId: 'LAFEA.3',
    expectedParents: expectedLafeaMeshCommandParentsV3(initialState),
    adapterId: adapterCapability.adapterId,
    adapterRevision: adapterCapability.adapterRevision,
    payloadHash: adapterPayload.payloadHash,
  });
  const temporary = createLafeaMeshArtifactLifecycleV3({
    schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
    artifactHash: identity.meshArtifactHash,
    sourceCommandHash: generationCommand.commandHash,
    state: 'TEMPORARY',
    partial: false,
    validationHash: null,
    quarantineReasonHash: null,
    previousStateHash: null,
  });
  const quarantine = transitionLafeaMeshArtifactLifecycleV3(temporary, {
    schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
    artifactHash: identity.meshArtifactHash,
    sourceCommandHash: generationCommand.commandHash,
    state: 'QUARANTINED',
    partial: false,
    validationHash: null,
    quarantineReasonHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-mesh-v3-quarantine-reason/v1',
      reason: 'ENGINEERING_VALIDATION_PENDING',
      evidenceHash: evidence.evidenceHash,
    }),
    previousStateHash: temporary.stateHash,
  });

  if (validation.qualification !== 'PASS') {
    return freeze({
      capability,
      generationCommand,
      artifactLifecycle: quarantine,
      workspaceState: initialState,
      retentionCommand: null,
      retentionCommit: null,
    });
  }

  const validated = transitionLafeaMeshArtifactLifecycleV3(quarantine, {
    schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
    artifactHash: identity.meshArtifactHash,
    sourceCommandHash: generationCommand.commandHash,
    state: 'VALIDATED',
    partial: false,
    validationHash: validation.validationHash,
    quarantineReasonHash: null,
    previousStateHash: quarantine.stateHash,
  });
  const retained = transitionLafeaMeshArtifactLifecycleV3(validated, {
    schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
    artifactHash: identity.meshArtifactHash,
    sourceCommandHash: generationCommand.commandHash,
    state: 'RETAINED',
    partial: false,
    validationHash: validation.validationHash,
    quarantineReasonHash: null,
    previousStateHash: validated.stateHash,
  });
  const retentionCommand = createLafeaMeshWorkspaceCommandV3({
    schema: LAFEA_MESH_WORKSPACE_COMMAND_V3_SCHEMA,
    commandId: `LAFEA.3/V3/RETAIN/${evidence.evidenceHash}`,
    commandKind: 'RETAIN',
    stageId: 'LAFEA.3',
    expectedParents: expectedLafeaMeshCommandParentsV3(initialState),
    adapterId: adapterCapability.adapterId,
    adapterRevision: adapterCapability.adapterRevision,
    payloadHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-mesh-v3-retention-payload/v1',
      evidenceHash: evidence.evidenceHash,
      validationHash: validation.validationHash,
      artifactStateHash: retained.stateHash,
    }),
  });
  const retentionCommit = commitLafeaMeshRetentionCasV3(
    retentionCommand,
    initialState,
    {
      schema: LAFEA_MESH_RETENTION_V3_SCHEMA,
      stageId: 'LAFEA.3',
      commandHash: retentionCommand.commandHash,
      meshDependencyHash: dependency.meshDependencyHash,
      meshContentHash: identity.meshContentHash,
      evidenceHash: evidence.evidenceHash,
      validationHash: validation.validationHash,
      authorityReceiptHash: null,
      custodyState: 'CURRENT_BLOCK',
    },
  );
  return freeze({
    capability,
    generationCommand,
    artifactLifecycle: retained,
    workspaceState: retentionCommit.nextState,
    retentionCommand,
    retentionCommit,
  });
}

function requireProducerParents(produced) {
  const plan = produced?.planned?.plan;
  const intent = produced?.planned?.intent;
  const output = produced?.output;
  if (!plan || !intent || !output) fail('LAFEA_CONTINUUM_MESH_V3_PRODUCER_PARENT_INVALID');
  if (output.capabilityHash !== plan.capabilityHash
    || output.capabilityHash !== produced.planned.capabilityHash
    || output.qualificationHash !== plan.qualificationHash
    || output.qualificationHash !== produced.planned.qualificationHash
    || output.producerId !== plan.producerId
    || output.producerRevision !== plan.producerRevision) {
    fail('LAFEA_CONTINUUM_MESH_V3_PRODUCER_PARENT_INVALID');
  }
  if (output.planHash !== plan.planHash || output.intentHash !== intent.semanticHash) {
    fail('LAFEA_CONTINUUM_MESH_V3_PLAN_PARENT_INVALID');
  }
  if (output.sourceHash !== intent.sourceHash
    || output.analysisDomainHash !== intent.analysisDomainHash
    || output.analysisGeometryHash !== intent.analysisGeometryHash
    || output.meshProfileHash !== intent.meshProfileHash
    || output.elementFamily !== intent.elementFamily) {
    fail('LAFEA_CONTINUUM_MESH_V3_INTENT_PARENT_INVALID');
  }
}
function requireStage(stage) {
  if (!stage || stage.stageId !== 'LAFEA.3' || !stage.domainFirstProfileActive
    || stage.analysisDomainProjection?.state !== 'CURRENT_PASS'
    || stage.analysisGeometryProjection?.state !== 'CURRENT_PASS') {
    fail('LAFEA_CONTINUUM_MESH_V3_STAGE_NOT_READY');
  }
}
function currentSourceHash(stage) {
  const value = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (!value || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail('LAFEA_CONTINUUM_MESH_V3_SOURCE_AUTHORITY_REQUIRED');
  }
  return value;
}
function gate(gateId, evidenceHash, status) {
  return freeze({ gateId, evidenceHash, status: status === 'PASS' || status === 'WARNING' ? status : 'BLOCK' });
}
function limit(metric, value, maximum) { return freeze({ metric, value, maximum, exceeded: value > maximum }); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
