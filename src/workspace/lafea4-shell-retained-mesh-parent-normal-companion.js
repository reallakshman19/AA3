import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import {
  evaluateLafea4ShellParentNormalShadowGate,
  validateLafea4ShellParentNormalShadowGate,
} from './lafea4-shell-parent-normal-shadow-gate.js';

export const LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_SCHEMA =
  'lafea4-shell-retained-mesh-parent-normal-companion/v1';
export const LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_AUTHORITY =
  'REQUIRED_RETAINED_CUSTODY_COMPANION_SHADOW_ONLY_V1';
export const LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE =
  'DISABLED_PENDING_EXACT_HEAD_INTEGRATED_QUALIFICATION';

const SUPPORTED_SURFACES = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);
const OUTPUT_KEYS = Object.freeze([
  'schema', 'stageId', 'authority', 'surfaceKind',
  'companionRequiredForRetainedCustody', 'hardGateStatus',
  'sourceHash', 'analysisDomainHash', 'analysisGeometryHash',
  'meshArtifactHash', 'meshHash', 'meshProfileHash', 'midsurfaceEvidenceHash',
  'shadowGateHash', 'shadowGate', 'retainedMeshQualification',
  'candidateQualification', 'wouldBlockIfActivated', 'custodyStatus',
  'retainedMeshAcceptanceChanged', 'productionBindingAuthorized',
  'releaseQualified', 'semanticHash',
]);

/**
 * Build the mandatory TECH-12B companion for a retained LAFEA.4 mesh.
 *
 * The companion is deliberately reconstructed from the retained mesh and its
 * authoritative midsurface rather than stored as an independently mutable
 * copy. That makes stale companion custody detectable by exact parent hashes.
 * Candidate BLOCK is retained as evidence only; hard acceptance remains off.
 */
export function createLafea4RetainedMeshParentNormalCompanion({
  meshEvidence,
  midsurfaceEvidence,
}) {
  const retained = validateLafeaAnalysisMeshEvidenceV2(meshEvidence);
  const midsurface = validateLafeaAnyShellMidsurfaceEvidence(midsurfaceEvidence);
  if (retained.stageId !== 'LAFEA.4' || midsurface.stageId !== 'LAFEA.4') {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_STAGE_INVALID');
  }
  const surfaceKind = shellMidsurfaceKind(midsurface.geometry);
  if (!SUPPORTED_SURFACES.has(surfaceKind)) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_SURFACE_NOT_QUALIFIED');
  }
  const shadowGate = validateLafea4ShellParentNormalShadowGate(
    evaluateLafea4ShellParentNormalShadowGate({
      meshEvidence: retained,
      midsurfaceEvidence: midsurface,
    }),
  );
  requireShadowParents(shadowGate, retained, midsurface);

  const custodyStatus = shadowGate.candidateQualification === 'PASS'
    ? 'CURRENT_COMPANION_PASS'
    : 'CURRENT_COMPANION_WOULD_BLOCK_IF_ACTIVATED';
  const core = {
    schema: LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_SCHEMA,
    stageId: 'LAFEA.4',
    authority: LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_AUTHORITY,
    surfaceKind,
    companionRequiredForRetainedCustody: true,
    hardGateStatus: LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
    sourceHash: retained.sourceHash,
    analysisDomainHash: retained.analysisDomainHash,
    analysisGeometryHash: retained.analysisGeometryHash,
    meshArtifactHash: retained.artifactHash,
    meshHash: retained.meshHash,
    meshProfileHash: retained.meshProfileHash,
    midsurfaceEvidenceHash: midsurface.semanticHash,
    shadowGateHash: shadowGate.semanticHash,
    shadowGate,
    retainedMeshQualification: retained.qualification,
    candidateQualification: shadowGate.candidateQualification,
    wouldBlockIfActivated: shadowGate.wouldBlockIfPromoted,
    custodyStatus,
    retainedMeshAcceptanceChanged: false,
    productionBindingAuthorized: false,
    releaseQualified: false,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-retained-mesh-parent-normal-companion-hash-input/v1',
      companion: core,
    }),
  });
}

export function validateLafea4RetainedMeshParentNormalCompanion(value) {
  exactKeys(value, OUTPUT_KEYS, 'LAFEA4_PARENT_NORMAL_COMPANION_KEYS_INVALID');
  if (value.schema !== LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || value.authority !== LAFEA4_RETAINED_MESH_PARENT_NORMAL_COMPANION_AUTHORITY
    || !SUPPORTED_SURFACES.has(value.surfaceKind)
    || value.companionRequiredForRetainedCustody !== true
    || value.hardGateStatus !== LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE
    || !['PASS', 'BLOCK'].includes(value.retainedMeshQualification)
    || !['PASS', 'BLOCK'].includes(value.candidateQualification)
    || value.wouldBlockIfActivated !== (value.candidateQualification === 'BLOCK')
    || value.retainedMeshAcceptanceChanged !== false
    || value.productionBindingAuthorized !== false
    || value.releaseQualified !== false) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_CONTRACT_INVALID');
  }
  const expectedStatus = value.candidateQualification === 'PASS'
    ? 'CURRENT_COMPANION_PASS'
    : 'CURRENT_COMPANION_WOULD_BLOCK_IF_ACTIVATED';
  if (value.custodyStatus !== expectedStatus) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_STATUS_INVALID');
  }
  for (const hash of [
    value.sourceHash, value.analysisDomainHash, value.analysisGeometryHash,
    value.meshArtifactHash, value.meshHash, value.midsurfaceEvidenceHash,
    value.shadowGateHash, value.semanticHash,
  ]) requireSha256(hash);
  if (typeof value.meshProfileHash !== 'string' || !value.meshProfileHash) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_PROFILE_HASH_INVALID');
  }
  const shadowGate = validateLafea4ShellParentNormalShadowGate(value.shadowGate);
  if (shadowGate.semanticHash !== value.shadowGateHash
    || shadowGate.candidateQualification !== value.candidateQualification
    || shadowGate.wouldBlockIfPromoted !== value.wouldBlockIfActivated) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_SHADOW_BINDING_INVALID');
  }
  const core = { ...value };
  delete core.semanticHash;
  const expectedHash = canonicalLafeaSha256({
    schema: 'lafea4-shell-retained-mesh-parent-normal-companion-hash-input/v1',
    companion: core,
  });
  if (value.semanticHash !== expectedHash) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

/**
 * Prove an exported/recovered companion still belongs to the exact retained
 * mesh and midsurface. Rebuilding is authoritative; a stale copied companion
 * cannot be silently accepted.
 */
export function requireCurrentLafea4RetainedMeshParentNormalCompanion(
  value,
  { meshEvidence, midsurfaceEvidence },
) {
  const candidate = validateLafea4RetainedMeshParentNormalCompanion(value);
  const current = createLafea4RetainedMeshParentNormalCompanion({
    meshEvidence,
    midsurfaceEvidence,
  });
  if (candidate.semanticHash !== current.semanticHash) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_STALE_OR_PARENT_MISMATCH');
  }
  return current;
}

export function isLafea4ParentNormalCompanionSurfaceQualified(midsurfaceEvidence) {
  const midsurface = validateLafeaAnyShellMidsurfaceEvidence(midsurfaceEvidence);
  return midsurface.stageId === 'LAFEA.4'
    && SUPPORTED_SURFACES.has(shellMidsurfaceKind(midsurface.geometry));
}

function requireShadowParents(shadow, retained, midsurface) {
  const expected = {
    sourceHash: retained.sourceHash,
    analysisDomainHash: retained.analysisDomainHash,
    analysisGeometryHash: retained.analysisGeometryHash,
    meshArtifactHash: retained.artifactHash,
    meshHash: retained.meshHash,
    meshProfileHash: retained.meshProfileHash,
    midsurfaceEvidenceHash: midsurface.semanticHash,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (shadow[key] !== value) {
      fail('LAFEA4_PARENT_NORMAL_COMPANION_PARENT_MISMATCH');
    }
  }
}
function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    fail(code);
  }
}
function requireSha256(value) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail('LAFEA4_PARENT_NORMAL_COMPANION_HASH_INVALID');
  }
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
