import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep } from '../dataset-utils.js';
import {
  composeCommonEnrichedCandidateWithConfiguredDefaults,
  createNonFeaCommonEnrichedConfiguredDefaultOverlay,
} from '../project-data/non-fea-common-enriched-configured-default-overlay.js';
import {
  composeCommonEnrichedCandidateWithProductDefaults,
  createNonFeaCommonEnrichedProductDefaultOverlay,
} from '../project-data/non-fea-common-enriched-product-default-overlay.js';
import {
  LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1,
} from '../project-data/non-fea-product-engineering-default-profile.js';

export const NON_FEA_COMMON_ENRICHED_EFFECTIVE_DEFAULT_AUTHORING_SCHEMA =
  'non-fea-common-enriched-effective-default-authoring/v1';

/**
 * Single pre-publication authoring seam for Issue #1321 engineering defaults.
 *
 * Ordering is intentionally fixed:
 *
 *   exact source/master candidate
 *     -> PROJECT_CONFIGURED_DEFAULT
 *     -> PRODUCT_DEFAULT
 *     -> candidate eligible for the existing publication/readiness workflow.
 *
 * The underlying overlay contracts fill only absent/BLOCKED_MISSING fields and
 * fail closed for ambiguity, conflict and stale-source states. This composer
 * does not publish or authorize anything; the existing common-enriched
 * publication decision remains a separate authority boundary.
 *
 * The shipped product engineering profile is empty. Therefore this function
 * cannot invent OD, wall, material/fluid/insulation density or component mass
 * unless the caller explicitly supplies a versioned product engineering table.
 */
export function authorCommonEnrichedCandidateWithEffectiveDefaults({
  exactCandidate,
  sourceModel,
  inventory,
  projectDataProfile,
  productEngineeringDefaultProfile = LOAD_CALC_ENGINEERING_PRODUCT_DEFAULTS_EMPTY_V1,
  requestedMethods = ['WEIGHT_AND_GRAVITY'],
  projectCompositionIdentity,
  finalCompositionIdentity,
} = {}) {
  const projectIdentity = requireCompositionIdentity(
    projectCompositionIdentity,
    'projectCompositionIdentity',
  );
  const finalIdentity = requireCompositionIdentity(
    finalCompositionIdentity,
    'finalCompositionIdentity',
  );
  if (finalIdentity.revision <= projectIdentity.revision) {
    throw codedError(
      'Final default-composed candidate revision must be later than the Project-default candidate revision.',
      'EFFECTIVE_DEFAULT_AUTHORING_REVISION_ORDER_INVALID',
    );
  }

  const projectDefaultOverlay = createNonFeaCommonEnrichedConfiguredDefaultOverlay({
    profile: projectDataProfile,
    sourceModel,
    inventory,
    requestedMethods,
  });
  const projectDefaultComposition = composeCommonEnrichedCandidateWithConfiguredDefaults({
    candidate: exactCandidate,
    overlay: projectDefaultOverlay,
    ...projectIdentity,
  });

  const productDefaultOverlay = createNonFeaCommonEnrichedProductDefaultOverlay({
    defaultProfile: productEngineeringDefaultProfile,
    sourceModel,
    inventory,
    requestedMethods,
  });
  const productDefaultComposition = composeCommonEnrichedCandidateWithProductDefaults({
    candidate: projectDefaultComposition.candidate,
    overlay: productDefaultOverlay,
    ...finalIdentity,
  });

  const material = {
    schema: NON_FEA_COMMON_ENRICHED_EFFECTIVE_DEFAULT_AUTHORING_SCHEMA,
    authorityOrder: [
      'EXACT_SOURCE_MASTER_CANDIDATE',
      'PROJECT_CONFIGURED_DEFAULT',
      'PRODUCT_DEFAULT',
    ],
    sourceCandidateSemanticHash: exactCandidate?.semanticHash || null,
    sourceModelSemanticHash: sourceModel?.semanticHash || null,
    inventorySemanticHash: inventory?.semanticHash || null,
    projectDataProfileSemanticHash: semanticHash(projectDataProfile),
    productEngineeringDefaultProfileSemanticHash:
      productEngineeringDefaultProfile?.semanticHash || semanticHash(productEngineeringDefaultProfile),
    requestedMethods: [...requestedMethods],
    projectDefaultOverlay,
    projectDefaultComposition,
    productDefaultOverlay,
    productDefaultComposition,
    finalCandidate: productDefaultComposition.candidate,
    publicationAuthorityGranted: false,
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

function requireCompositionIdentity(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw codedError(
      `${label} is required.`,
      'EFFECTIVE_DEFAULT_AUTHORING_IDENTITY_INVALID',
    );
  }
  const candidateId = requiredText(value.candidateId, `${label}.candidateId`);
  if (!Number.isInteger(value.revision) || value.revision < 1) {
    throw codedError(
      `${label}.revision must be a positive integer.`,
      'EFFECTIVE_DEFAULT_AUTHORING_IDENTITY_INVALID',
    );
  }
  const createdAt = requiredText(value.createdAt, `${label}.createdAt`);
  if (new Date(createdAt).toISOString() !== createdAt) {
    throw codedError(
      `${label}.createdAt must be canonical ISO-8601 UTC.`,
      'EFFECTIVE_DEFAULT_AUTHORING_IDENTITY_INVALID',
    );
  }
  return freezeDeep({ candidateId, revision: value.revision, createdAt });
}

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw codedError(
      `${label} must be a non-empty trimmed string.`,
      'EFFECTIVE_DEFAULT_AUTHORING_IDENTITY_INVALID',
    );
  }
  return value;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
