import {
  createLafea4RetainedMeshParentNormalCompanion,
  isLafea4ParentNormalCompanionSurfaceQualified,
} from './lafea4-shell-retained-mesh-parent-normal-companion.js';
import {
  evaluateLafea4ParentNormalProductionGate,
} from './lafea4-parent-normal-production-gate.js';

export const LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_PROJECTION_SCHEMA =
  'lafea4-parent-normal-production-gate-projection/v1';

/**
 * Derive read-only parent-normal production-gate state from the exact retained
 * mesh + midsurface parents. No independent cache or caller authority exists.
 */
export function projectLafea4ParentNormalProductionGate(stage) {
  const stageId = stage?.stageId ?? null;
  if (stageId !== 'LAFEA.4' || stage?.shellMidsurfaceProfileActive !== true) {
    return projection(stageId, 'NOT_APPLICABLE');
  }
  const meshEvidence = stage?.retainedAnalysisMeshEvidenceV2 ?? null;
  const midsurfaceEvidence = stage?.retainedShellMidsurfaceEvidence ?? null;
  if (!meshEvidence || !midsurfaceEvidence) {
    return projection(stageId, 'ABSENT', {
      reasons: [
        !meshEvidence ? 'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_MESH_ABSENT' : null,
        !midsurfaceEvidence ? 'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_MIDSURFACE_ABSENT' : null,
      ].filter(Boolean),
    });
  }
  try {
    if (!isLafea4ParentNormalCompanionSurfaceQualified(midsurfaceEvidence)) {
      return projection(stageId, 'NOT_APPLICABLE', {
        meshHash: meshEvidence.meshHash ?? null,
      });
    }
    const companion = createLafea4RetainedMeshParentNormalCompanion({
      meshEvidence,
      midsurfaceEvidence,
    });
    const gate = evaluateLafea4ParentNormalProductionGate({ companion });
    const state = gate.gateDisposition === 'BLOCK'
      ? 'CURRENT_BLOCK'
      : gate.hardGateActivated
        ? 'CURRENT_PASS'
        : 'CURRENT_SHADOW';
    return projection(stageId, state, {
      reasons: gate.gateDisposition === 'BLOCK' ? [gate.diagnosticCode] : [],
      meshHash: meshEvidence.meshHash,
      meshArtifactHash: meshEvidence.artifactHash,
      companionHash: companion.semanticHash,
      productionGateHash: gate.semanticHash,
      authorityStatus: gate.authorityStatus,
      hardGateActivated: gate.hardGateActivated,
      productionBindingAuthorized: gate.productionBindingAuthorized,
      candidateQualification: gate.candidateQualification,
      gateDisposition: gate.gateDisposition,
      retainedMeshAccepted: gate.retainedMeshAccepted,
      solverExecutionAuthorized: gate.solverExecutionAuthorized,
      diagnosticCode: gate.diagnosticCode,
      blockingElementIds: gate.gateDisposition === 'BLOCK'
        ? [...(companion.shadowGate?.blockingElementIds ?? [])]
        : [],
    });
  } catch (error) {
    return projection(stageId, 'INVALID', {
      reasons: [typeof error?.code === 'string'
        ? error.code
        : 'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_PROJECTION_INVALID'],
      meshHash: meshEvidence?.meshHash ?? null,
      meshArtifactHash: meshEvidence?.artifactHash ?? null,
    });
  }
}

function projection(stageId, state, fields = {}) {
  const reasons = [...new Set((fields.reasons ?? []).filter(Boolean))];
  return freeze({
    schema: LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_PROJECTION_SCHEMA,
    stageId,
    state,
    reasons,
    meshHash: fields.meshHash ?? null,
    meshArtifactHash: fields.meshArtifactHash ?? null,
    companionHash: fields.companionHash ?? null,
    productionGateHash: fields.productionGateHash ?? null,
    authorityStatus: fields.authorityStatus ?? null,
    hardGateActivated: fields.hardGateActivated ?? false,
    productionBindingAuthorized: fields.productionBindingAuthorized ?? false,
    candidateQualification: fields.candidateQualification ?? null,
    gateDisposition: fields.gateDisposition ?? null,
    retainedMeshAccepted: fields.retainedMeshAccepted ?? true,
    solverExecutionAuthorized: fields.solverExecutionAuthorized ?? true,
    diagnosticCode: fields.diagnosticCode ?? null,
    blockingElementIds: freeze([...(fields.blockingElementIds ?? [])]),
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
