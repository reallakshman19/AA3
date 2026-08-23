import {
  compileSolverExecution,
  requireSolverExecution,
} from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import { compileInputXmlExecutionElementAuthorities } from './inputxml-linear-execution-elements.js';
import { requireInputXmlLinearPreFeaPreparation } from './inputxml-linear-prefea-preparation.js';
import {
  inputXmlStiffnessFrameElementProfile,
  inputXmlStiffnessSolverProfile,
} from './inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from './production-capability-profile.js';

export const INPUTXML_LINEAR_RAW_EXECUTION_BATCH_SCHEMA =
  'fea-inputxml-linear-raw-execution-batch/v1';

export function executeInputXmlAuthorizedRawCases({
  preparation,
  authorization,
  requestedCaseIds,
  selectedCases,
}) {
  const accepted = requireInputXmlLinearPreFeaPreparation(preparation);
  const frameProfile = inputXmlStiffnessFrameElementProfile();
  const solverProfile = inputXmlStiffnessSolverProfile();
  const preflight = accepted.stiffnessPreflight;

  requireQualifiedProfileCustody(preflight, frameProfile, solverProfile);
  requireCurrentCapabilityCustody(preflight);

  const physicalCases = new Map((accepted.physicalPreparation?.physicalCases ?? [])
    .map((row) => [row.caseId, row]));
  const selectedById = new Map((selectedCases ?? []).map((row) => [row.caseId, row]));
  const cases = [];

  for (const caseId of requestedCaseIds) {
    const physical = physicalCases.get(caseId) ?? null;
    const selected = selectedById.get(caseId) ?? null;
    if (physical === null || selected === null) {
      throw executionError('INPUTXML_EXECUTION_CASE_AUTHORITY_MISSING',
        `Authorized physical case ${caseId} is missing from retained preparation.`);
    }
    requireCaseIdentity(selected, physical);

    const elements = compileInputXmlExecutionElementAuthorities(
      accepted.structuralPreparation,
      frameProfile,
      physical.loadCase,
      {
        sourcePreparation: accepted.sourcePreparation,
        bendFactorAuthority: preflight.bendFactorAuthority,
        branchFactorAuthority: preflight.branchFactorAuthority,
        capabilityProfile: PRODUCTION_CAPABILITY_PROFILE,
      },
    );
    requireEffectiveStiffnessCustody(accepted, preflight, elements);

    const runtimeExecution = compileSolverExecution({
      compilation: accepted.structuralPreparation.compilation,
      elementContributions: elements.elementContributions,
      loadCase: physical.loadCase,
      solverProfile,
    });
    const execution = retainedSolverExecution(runtimeExecution);

    cases.push({
      caseId,
      caseRole: physical.caseRole,
      loadCaseSemanticHash: physical.loadCase.semanticHash,
      physicalLoadCaseHash: physical.loadCase.physicalLoadCaseHash,
      frameElementProfileSemanticHash: frameProfile.semanticHash,
      solverProfileSemanticHash: solverProfile.semanticHash,
      elementLedger: elements.elementLedger,
      execution,
      executionHash: execution.executionHash,
      executionSemanticHash: execution.semanticHash,
      executionEvidenceHash: execution.evidenceHash,
      executionStatus: execution.status,
    });
  }

  const status = aggregateStatus(cases.map((row) => row.executionStatus));
  const identity = {
    schema: INPUTXML_LINEAR_RAW_EXECUTION_BATCH_SCHEMA,
    preparationSemanticHash: accepted.semanticHash,
    preparationEvidenceHash: accepted.evidenceHash,
    authorizationSemanticHash: authorization.semanticHash,
    authorizationEvidenceHash: authorization.evidenceHash,
    sourceBundleSemanticHash: accepted.sourceBundleSemanticHash,
    sourceBundleEvidenceHash: accepted.sourceBundleEvidenceHash,
    modelSemanticHash: accepted.modelSemanticHash,
    stiffnessStateHash: accepted.stiffnessStateHash,
    loadStateHash: accepted.loadStateHash,
    requestedProfileId: accepted.requestedProfileId,
    requestedCaseIds: [...requestedCaseIds],
    frameElementProfileSemanticHash: frameProfile.semanticHash,
    solverProfileSemanticHash: solverProfile.semanticHash,
    caseExecutions: cases.map(caseIdentity),
    status,
  };
  const executionBatchId = `IXRUN-${semanticHash(identity).slice('fnv1a64:'.length).toUpperCase()}`;
  const draft = {
    ...identity,
    executionBatchId,
    caseExecutions: cases,
    semanticHash: '',
  };
  draft.semanticHash = semanticHash(rawExecutionSemanticProjection(draft));
  return deepFreeze(draft);
}

export function rawExecutionSemanticProjection(record) {
  return {
    schema: record.schema,
    executionBatchId: record.executionBatchId,
    preparationSemanticHash: record.preparationSemanticHash,
    preparationEvidenceHash: record.preparationEvidenceHash,
    authorizationSemanticHash: record.authorizationSemanticHash,
    authorizationEvidenceHash: record.authorizationEvidenceHash,
    sourceBundleSemanticHash: record.sourceBundleSemanticHash,
    sourceBundleEvidenceHash: record.sourceBundleEvidenceHash,
    modelSemanticHash: record.modelSemanticHash,
    stiffnessStateHash: record.stiffnessStateHash,
    loadStateHash: record.loadStateHash,
    requestedProfileId: record.requestedProfileId,
    requestedCaseIds: record.requestedCaseIds,
    frameElementProfileSemanticHash: record.frameElementProfileSemanticHash,
    solverProfileSemanticHash: record.solverProfileSemanticHash,
    caseExecutions: record.caseExecutions.map(caseIdentity),
    status: record.status,
  };
}

function retainedSolverExecution(runtimeExecution) {
  const {
    factorizationHandle: ignoredFactorizationHandle,
    prescribedValueDiagnostics: ignoredPrescribedDiagnostics,
    nodalForceDiagnostics: ignoredNodalDiagnostics,
    ...record
  } = runtimeExecution;
  void ignoredFactorizationHandle;
  void ignoredPrescribedDiagnostics;
  void ignoredNodalDiagnostics;
  return requireSolverExecution(record);
}

function requireQualifiedProfileCustody(preflight, frameProfile, solverProfile) {
  if (!preflight || preflight.frameElementProfileSemanticHash !== frameProfile.semanticHash) {
    throw executionError('INPUTXML_EXECUTION_FRAME_PROFILE_STALE',
      'Runtime frame-element profile is not the profile qualified by stiffness pre-flight.');
  }
  if (preflight.solverProfileSemanticHash !== solverProfile.semanticHash) {
    throw executionError('INPUTXML_EXECUTION_SOLVER_PROFILE_STALE',
      'Runtime solver profile is not the profile qualified by stiffness pre-flight.');
  }
}

function requireCurrentCapabilityCustody(preflight) {
  const current = semanticHash(PRODUCTION_CAPABILITY_PROFILE);
  if (preflight.productionCapabilityProfileHash !== current) {
    throw executionError('INPUTXML_EXECUTION_CAPABILITY_PROFILE_STALE',
      'Production component capability changed after stiffness pre-flight; create a new pre-flight.');
  }
}

function requireEffectiveStiffnessCustody(preparation, preflight, elements) {
  const runtimeHash = elements.effectiveStiffnessStateHash;
  if (runtimeHash !== preflight.effectiveStiffnessStateHash
    || runtimeHash !== preparation.stiffnessStateHash) {
    throw executionError('INPUTXML_EXECUTION_EFFECTIVE_STIFFNESS_STALE',
      'Runtime effective stiffness does not match the stiffness authorized by pre-flight.');
  }
  const qualified = semanticHash(preflight.elementLedger.map(stiffnessLedgerProjection));
  const current = semanticHash(elements.elementLedger.map(stiffnessLedgerProjection));
  if (qualified !== current) {
    throw executionError('INPUTXML_EXECUTION_ELEMENT_STIFFNESS_LEDGER_STALE',
      'Runtime span/component stiffness ownership differs from stiffness pre-flight.');
  }
}

function stiffnessLedgerProjection(row) {
  return {
    elementId: row.elementId,
    authorityKind: row.authorityKind,
    globalStiffnessHash: row.globalStiffnessHash,
    pipingComponentProfileSemanticHash: row.pipingComponentProfileSemanticHash,
    flexibilityFactorSetId: row.flexibilityFactorSetId,
    flexibilityFactor: row.flexibilityFactor,
    flexibilityGeometryBasis: row.flexibilityGeometryBasis,
    flexibilityDoubleCountGuardAccepted: row.flexibilityDoubleCountGuardAccepted,
    branchModifierApplied: row.branchModifierApplied,
    branchJunctionNodeId: row.branchJunctionNodeId,
    branchRole: row.branchRole,
    branchFactorResultSemanticHash: row.branchFactorResultSemanticHash,
    branchSpringRule: row.branchSpringRule,
    branchRotationalSpringCount: row.branchRotationalSpringCount,
    branchRigidOffset: row.branchRigidOffset,
  };
}

function requireCaseIdentity(selected, physical) {
  const expectedLoadCase = physical.loadCase?.semanticHash ?? null;
  const expectedPhysical = physical.loadCase?.physicalLoadCaseHash ?? null;
  if (selected.loadCaseSemanticHash !== expectedLoadCase
    || selected.physicalLoadCaseHash !== expectedPhysical) {
    throw executionError('INPUTXML_EXECUTION_CASE_IDENTITY_STALE',
      `Physical case ${physical.caseId} no longer matches the authorized case candidate.`);
  }
}

function caseIdentity(row) {
  return {
    caseId: row.caseId,
    caseRole: row.caseRole,
    loadCaseSemanticHash: row.loadCaseSemanticHash,
    physicalLoadCaseHash: row.physicalLoadCaseHash,
    frameElementProfileSemanticHash: row.frameElementProfileSemanticHash,
    solverProfileSemanticHash: row.solverProfileSemanticHash,
    elementLedgerHash: semanticHash(row.elementLedger),
    executionHash: row.executionHash,
    executionSemanticHash: row.executionSemanticHash,
    executionEvidenceHash: row.executionEvidenceHash,
    executionStatus: row.executionStatus,
  };
}

function aggregateStatus(statuses) {
  if (statuses.some((status) => status === 'BLOCKED')) return 'BLOCKED';
  if (statuses.some((status) => status === 'CONDITIONAL')) return 'CONDITIONAL';
  return 'QUALIFIED';
}

function executionError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_AUTHORIZED_EXECUTION';
  return error;
}
