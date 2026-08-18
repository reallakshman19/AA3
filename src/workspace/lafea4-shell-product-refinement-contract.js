import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import { LAFEA_SHELL_ELEMENT } from './lafea-shell-mesh-producer.js';

export const LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_SCHEMA =
  'lafea4-shell-product-refinement-scope/v1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_ID =
  'LAFEA4-CURVED-TRI3-LOCAL-REFINEMENT-PRODUCT-SCOPE-V1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE =
  'LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_TECH13E_QUALIFICATION';

export const LAFEA4_SHELL_PRODUCT_REFINEMENT_ALLOWED_SURFACE_KINDS = Object.freeze([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);

const ALLOWED_SURFACES = new Set(LAFEA4_SHELL_PRODUCT_REFINEMENT_ALLOWED_SURFACE_KINDS);
const TARGET_TYPES = new Set(['ELEMENT']);

/**
 * TECH-13A owns only the bounded product scope. It deliberately does not
 * activate execution: TECH-13B/C must bind the reused TECH-7 kernel to product
 * custody, and TECH-13E must qualify the exact integrated head before UI/run
 * authority can be enabled.
 */
export function evaluateLafea4ShellProductRefinementScope(value) {
  const stage = requireObject(value?.stage, 'LAFEA4_SHELL_PRODUCT_REFINEMENT_STAGE_REQUIRED');
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(value?.parentEvidence);
  const midsurfaceEvidence = validateLafeaAnyShellMidsurfaceEvidence(value?.midsurfaceEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(value?.meshProfile);
  const request = requireObject(value?.request, 'LAFEA4_SHELL_PRODUCT_REFINEMENT_REQUEST_REQUIRED');

  if (stage.stageId !== 'LAFEA.4' || parentEvidence.stageId !== 'LAFEA.4'
    || midsurfaceEvidence.stageId !== 'LAFEA.4') {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_STAGE_NOT_QUALIFIED');
  }
  if (stage.lifecycleBinding?.status !== 'CURRENT') {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_SOURCE_BINDING_NOT_CURRENT');
  }
  if (parentEvidence.status !== 'CURRENT' || parentEvidence.qualification !== 'PASS') {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_PARENT_NOT_CURRENT_PASS');
  }
  if (parentEvidence.meshProfileHash !== meshProfile.semanticHash) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_PROFILE_PARENT_MISMATCH');
  }
  if (meshProfile.fields?.shellElement !== LAFEA_SHELL_ELEMENT) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_ELEMENT_FAMILY_NOT_QUALIFIED');
  }

  const surfaceKind = shellMidsurfaceKind(midsurfaceEvidence);
  if (!ALLOWED_SURFACES.has(surfaceKind)) {
    fail(surfaceKind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC
      ? 'LAFEA4_SHELL_PRODUCT_REFINEMENT_PERIODIC_NOT_QUALIFIED'
      : 'LAFEA4_SHELL_PRODUCT_REFINEMENT_SURFACE_NOT_QUALIFIED');
  }

  if (parentEvidence.sourceHash !== midsurfaceEvidence.sourceHash
    || parentEvidence.analysisDomainHash !== midsurfaceEvidence.analysisDomainHash
    || parentEvidence.analysisGeometryHash !== midsurfaceEvidence.analysisGeometryHash) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_MIDSURFACE_PARENT_MISMATCH');
  }

  const targetType = text(request.targetType, 'TARGET_TYPE');
  if (!TARGET_TYPES.has(targetType)) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_TARGET_TYPE_NOT_QUALIFIED');
  }
  const targetIds = ids(request.targetIds);
  const targetElementLength = positive(request.targetElementLength, 'TARGET_ELEMENT_LENGTH');
  const lengthUnit = text(request.lengthUnit, 'LENGTH_UNIT');
  if (lengthUnit !== midsurfaceEvidence.geometry?.lengthUnit) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_LENGTH_UNIT_MISMATCH');
  }
  if (!(targetElementLength < meshProfile.fields.globalTargetSize)) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_TARGET_NOT_SMALLER_THAN_GLOBAL');
  }

  const core = {
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_SCHEMA,
    scopeId: LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_ID,
    stageId: 'LAFEA.4',
    surfaceKind,
    elementFamily: LAFEA_SHELL_ELEMENT,
    parentMeshArtifactHash: parentEvidence.artifactHash,
    parentMeshHash: parentEvidence.meshHash,
    sourceHash: parentEvidence.sourceHash,
    analysisDomainHash: parentEvidence.analysisDomainHash,
    analysisGeometryHash: parentEvidence.analysisGeometryHash,
    midsurfaceEvidenceHash: midsurfaceEvidence.semanticHash,
    meshProfileHash: meshProfile.semanticHash,
    targetType,
    targetIds,
    targetElementLength,
    globalTargetElementLength: meshProfile.fields.globalTargetSize,
    adjacentSizeRatioMax: meshProfile.fields.adjacentSizeRatioMax,
    aspectRatioBlock: meshProfile.fields.aspectRatioBlock,
    scaledJacobianBlock: meshProfile.fields.scaledJacobianBlock,
    currentParentRequired: true,
    exactMidsurfaceParentRequired: true,
    conformingTri3Required: true,
    parentNormalQualificationRequired: true,
    atomicPublicationRequired: true,
    executionAuthorized: false,
    productBindingAuthorized: false,
    uiBindingAuthorized: false,
    releaseQualified: false,
    activationStatus: 'PENDING_TECH13B_13C_13E',
    diagnosticCode: LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-product-refinement-scope-hash-input/v1',
      scope: core,
    }),
  });
}

export function validateLafea4ShellProductRefinementScope(value) {
  if (!value || value.schema !== LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_SCHEMA
    || value.scopeId !== LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_ID
    || value.stageId !== 'LAFEA.4'
    || !ALLOWED_SURFACES.has(value.surfaceKind)
    || value.elementFamily !== LAFEA_SHELL_ELEMENT
    || value.currentParentRequired !== true
    || value.exactMidsurfaceParentRequired !== true
    || value.conformingTri3Required !== true
    || value.parentNormalQualificationRequired !== true
    || value.atomicPublicationRequired !== true
    || value.executionAuthorized !== false
    || value.productBindingAuthorized !== false
    || value.uiBindingAuthorized !== false
    || value.releaseQualified !== false
    || value.activationStatus !== 'PENDING_TECH13B_13C_13E'
    || value.diagnosticCode !== LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE
    || typeof value.semanticHash !== 'string'
    || !/^sha256:[0-9a-f]{64}$/u.test(value.semanticHash)) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_INVALID');
  }
  const base = { ...value };
  delete base.semanticHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea4-shell-product-refinement-scope-hash-input/v1',
    scope: base,
  });
  if (expected !== value.semanticHash) fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_SCOPE_TAMPERED');
  return value;
}

function ids(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_TARGET_IDS_INVALID');
  }
  const out = value.map((row) => text(row, 'TARGET_ID')).sort((a, b) => a.localeCompare(b));
  if (new Set(out).size !== out.length) fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_TARGET_IDS_DUPLICATE');
  return freeze(out);
}
function positive(value, field) {
  if (!Number.isFinite(value) || value <= 0) fail(`LAFEA4_SHELL_PRODUCT_REFINEMENT_${field}_INVALID`);
  return value;
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA4_SHELL_PRODUCT_REFINEMENT_${field}_INVALID`);
  return value.trim();
}
function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
