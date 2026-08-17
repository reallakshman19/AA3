import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
} from './lafea-shell-midsurface-dispatch.js';
import { LAFEA_SHELL_ELEMENT } from './lafea-shell-mesh-producer.js';
import { LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE } from './lafea4-shell-product-refinement-contract.js';

export const LAFEA4_SHELL_PRODUCT_REFINEMENT_UI_POLICY_SCHEMA =
  'lafea4-shell-product-refinement-ui-policy/v1';

const ELIGIBLE_SURFACES = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);
const MINIMUM_ANGLE_BLOCK_DEGREES = Math.asin(0.2) * 180 / Math.PI;

/**
 * Pure UI/product-readiness projection. This does not grant engineering
 * authority. It tells the Discretization surface whether the currently
 * retained LAFEA.4 mesh is inside TECH-13's bounded product scope and, until
 * TECH-13E exists as exact-head PASS evidence, why the Refine control remains
 * disabled.
 */
export function buildLafea4ShellProductRefinementUiPolicy(stageValue) {
  const stage = requireStage(stageValue);
  if (stage.stageId !== 'LAFEA.4') return notApplicable(stage);

  const parent = stage.retainedAnalysisMeshEvidenceV2 ?? null;
  const midsurface = stage.retainedShellMidsurfaceEvidence ?? null;
  const profile = stage.retainedAnalysisMeshProfile ?? null;
  const custody = stage.analysisMeshCustodyProjection ?? null;
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null;
  let surfaceKind = null;
  let surfaceSupported = false;
  try {
    surfaceKind = midsurface ? shellMidsurfaceKind(midsurface) : null;
    surfaceSupported = ELIGIBLE_SURFACES.has(surfaceKind);
  } catch {
    surfaceKind = null;
  }

  const currentSourceBinding = stage.lifecycleBinding?.status === 'CURRENT';
  const currentParent = parent?.qualification === 'PASS'
    && ['CURRENT_PASS', 'CURRENT_WARNING'].includes(custody?.state)
    && parent.sourceHash === sourceHash;
  const exactMidsurface = midsurface?.semanticHash
    && parent?.sourceHash === midsurface?.sourceHash
    && parent?.analysisDomainHash === midsurface?.analysisDomainHash
    && parent?.analysisGeometryHash === midsurface?.analysisGeometryHash;
  const exactProfile = profile?.semanticHash
    && parent?.meshProfileHash === profile.semanticHash
    && profile.fields?.shellElement === LAFEA_SHELL_ELEMENT;
  const scopeEligible = Boolean(
    currentSourceBinding && currentParent && exactMidsurface && exactProfile && surfaceSupported,
  );

  const scopeReasons = [];
  if (!currentSourceBinding) scopeReasons.push('LAFEA4_REFINEMENT_SOURCE_BINDING_NOT_CURRENT');
  if (!parent) scopeReasons.push('LAFEA4_REFINEMENT_RETAINED_PARENT_REQUIRED');
  else if (!currentParent) scopeReasons.push('LAFEA4_REFINEMENT_PARENT_NOT_CURRENT_PASS');
  if (!midsurface) scopeReasons.push('LAFEA4_REFINEMENT_MIDSURFACE_REQUIRED');
  else if (!surfaceSupported) scopeReasons.push('LAFEA4_REFINEMENT_SURFACE_NOT_IN_PRODUCT_SCOPE');
  if (midsurface && parent && !exactMidsurface) scopeReasons.push('LAFEA4_REFINEMENT_MIDSURFACE_PARENT_MISMATCH');
  if (!profile) scopeReasons.push('LAFEA4_REFINEMENT_PROFILE_REQUIRED');
  else if (!exactProfile) scopeReasons.push('LAFEA4_REFINEMENT_PROFILE_PARENT_MISMATCH');

  return freeze({
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_UI_POLICY_SCHEMA,
    stageId: 'LAFEA.4',
    applicable: true,
    scopeEligible,
    productQualified: false,
    canRefine: false,
    reason: scopeEligible
      ? LAFEA4_SHELL_PRODUCT_REFINEMENT_PENDING_CODE
      : scopeReasons[0] ?? 'LAFEA4_SHELL_PRODUCT_REFINEMENT_NOT_IN_SCOPE',
    scopeReasons,
    surfaceKind,
    elementFamily: profile?.fields?.shellElement ?? null,
    allowedTargetTypes: ['ELEMENT'],
    currentParent: parent ? {
      artifactHash: parent.artifactHash,
      meshHash: parent.meshHash,
      nodeCount: parent.mesh?.nodes?.length ?? 0,
      elementCount: parent.mesh?.elements?.length ?? 0,
      qualification: parent.qualification,
      custodyState: custody?.state ?? null,
    } : null,
    sizing: profile ? {
      globalTargetElementLength: profile.fields.globalTargetSize,
      adjacentSizeRatioMax: profile.fields.adjacentSizeRatioMax,
    } : null,
    qualityPolicy: profile ? {
      aspectRatioWarn: profile.fields.aspectRatioWarn,
      aspectRatioBlock: profile.fields.aspectRatioBlock,
      scaledJacobianWarn: profile.fields.scaledJacobianWarn,
      scaledJacobianBlock: profile.fields.scaledJacobianBlock,
      minimumAngleBlockDegrees: MINIMUM_ANGLE_BLOCK_DEGREES,
    } : null,
    requiredAcceptance: {
      boundaryConformity: true,
      v2MeshQualityPass: true,
      zeroBlockingElements: true,
      adjacentSizeRatioWithinPolicy: true,
      parentNormalPass: true,
      exactParentCustody: true,
    },
    exactHeadQualificationRequired: true,
    uiBindingAuthorized: false,
    productRetentionAuthorized: false,
    releaseQualified: false,
  });
}

function notApplicable(stage) {
  return freeze({
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_UI_POLICY_SCHEMA,
    stageId: stage.stageId,
    applicable: false,
    scopeEligible: false,
    productQualified: false,
    canRefine: false,
    reason: 'LAFEA4_SHELL_PRODUCT_REFINEMENT_NOT_APPLICABLE',
    scopeReasons: ['LAFEA4_SHELL_PRODUCT_REFINEMENT_NOT_APPLICABLE'],
    surfaceKind: null,
    elementFamily: null,
    allowedTargetTypes: [],
    currentParent: null,
    sizing: null,
    qualityPolicy: null,
    requiredAcceptance: null,
    exactHeadQualificationRequired: true,
    uiBindingAuthorized: false,
    productRetentionAuthorized: false,
    releaseQualified: false,
  });
}
function requireStage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.stageId !== 'string') {
    const error = new TypeError('LAFEA4_SHELL_PRODUCT_REFINEMENT_UI_STAGE_REQUIRED');
    error.code = 'LAFEA4_SHELL_PRODUCT_REFINEMENT_UI_STAGE_REQUIRED';
    throw error;
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
