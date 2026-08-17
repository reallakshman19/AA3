import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  qualifyLafea4ShellParentNormalOrientation,
  validateLafea4ShellParentNormalQualification,
} from './lafea4-shell-parent-normal-qualification.js';

export const LAFEA4_PARENT_NORMAL_SHADOW_GATE_SCHEMA =
  'lafea4-shell-parent-normal-shadow-gate/v1';
export const LAFEA4_PARENT_NORMAL_SHADOW_GATE_MODE =
  'SHADOW_ONLY_NOT_PRODUCT_AUTHORITY';

/**
 * Evaluate the TECH-11 parent-normal criterion at a real mesh custody point
 * without changing retained mesh acceptance. This is deliberately a shadow
 * adapter: consumers may display/retain the result, but MUST NOT use it to
 * authorize production or release until the separate qualification programme
 * promotes the criterion.
 */
export function evaluateLafea4ShellParentNormalShadowGate({
  meshEvidence,
  midsurfaceEvidence,
}) {
  const qualification = validateLafea4ShellParentNormalQualification(
    qualifyLafea4ShellParentNormalOrientation({ meshEvidence, midsurfaceEvidence }),
  );
  const core = {
    schema: LAFEA4_PARENT_NORMAL_SHADOW_GATE_SCHEMA,
    stageId: 'LAFEA.4',
    mode: LAFEA4_PARENT_NORMAL_SHADOW_GATE_MODE,
    criterion: qualification.criterion,
    roundoffPolicy: qualification.roundoffPolicy,
    sourceHash: qualification.sourceHash,
    analysisDomainHash: qualification.analysisDomainHash,
    analysisGeometryHash: qualification.analysisGeometryHash,
    meshArtifactHash: qualification.meshArtifactHash,
    meshHash: qualification.meshHash,
    meshProfileHash: qualification.meshProfileHash,
    midsurfaceEvidenceHash: qualification.midsurfaceEvidenceHash,
    minimumParentDirectedJacobian: qualification.minimumParentDirectedJacobian,
    minimumAlignmentCosine: qualification.minimumAlignmentCosine,
    blockedElementCount: qualification.blockedElementCount,
    blockingElementIds: [...qualification.blockingElementIds],
    candidateQualification: qualification.qualification,
    wouldBlockIfPromoted: qualification.qualification === 'BLOCK',
    retainedMeshAcceptanceChanged: false,
    productionBindingAuthorized: false,
    releaseQualified: false,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-parent-normal-shadow-gate-hash-input/v1',
      shadowGate: core,
    }),
  });
}

export function validateLafea4ShellParentNormalShadowGate(value) {
  const expected = [
    'schema', 'stageId', 'mode', 'criterion', 'roundoffPolicy', 'sourceHash',
    'analysisDomainHash', 'analysisGeometryHash', 'meshArtifactHash', 'meshHash',
    'meshProfileHash', 'midsurfaceEvidenceHash', 'minimumParentDirectedJacobian',
    'minimumAlignmentCosine', 'blockedElementCount', 'blockingElementIds',
    'candidateQualification', 'wouldBlockIfPromoted', 'retainedMeshAcceptanceChanged',
    'productionBindingAuthorized', 'releaseQualified', 'semanticHash',
  ];
  exactKeys(value, expected);
  if (value.schema !== LAFEA4_PARENT_NORMAL_SHADOW_GATE_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || value.mode !== LAFEA4_PARENT_NORMAL_SHADOW_GATE_MODE
    || !['PASS', 'BLOCK'].includes(value.candidateQualification)
    || value.wouldBlockIfPromoted !== (value.candidateQualification === 'BLOCK')
    || value.retainedMeshAcceptanceChanged !== false
    || value.productionBindingAuthorized !== false
    || value.releaseQualified !== false) {
    fail('LAFEA4_PARENT_NORMAL_SHADOW_GATE_CONTRACT_INVALID');
  }
  if (!Number.isSafeInteger(value.blockedElementCount) || value.blockedElementCount < 0
    || !Array.isArray(value.blockingElementIds)
    || value.blockingElementIds.length !== value.blockedElementCount
    || !Number.isFinite(value.minimumParentDirectedJacobian)
    || !Number.isFinite(value.minimumAlignmentCosine)) {
    fail('LAFEA4_PARENT_NORMAL_SHADOW_GATE_CONTENT_INVALID');
  }
  for (const hash of [
    value.sourceHash, value.analysisDomainHash, value.analysisGeometryHash,
    value.meshArtifactHash, value.meshHash, value.midsurfaceEvidenceHash,
    value.semanticHash,
  ]) requireSha256(hash);
  if (typeof value.meshProfileHash !== 'string' || !value.meshProfileHash) {
    fail('LAFEA4_PARENT_NORMAL_SHADOW_GATE_PROFILE_HASH_INVALID');
  }
  const core = { ...value };
  delete core.semanticHash;
  const expectedHash = canonicalLafeaSha256({
    schema: 'lafea4-shell-parent-normal-shadow-gate-hash-input/v1',
    shadowGate: core,
  });
  if (value.semanticHash !== expectedHash) {
    fail('LAFEA4_PARENT_NORMAL_SHADOW_GATE_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    fail('LAFEA4_PARENT_NORMAL_SHADOW_GATE_KEYS_INVALID');
  }
}
function requireSha256(value) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail('LAFEA4_PARENT_NORMAL_SHADOW_GATE_HASH_INVALID');
  }
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
