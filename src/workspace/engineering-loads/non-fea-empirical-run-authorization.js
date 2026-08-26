import { deepFreeze, semanticHash } from '../../core/shared-piping-model/index.js';
import {
  requireCommonEnrichedPipingInput,
} from '../../core/non-fea-common-checker/index.js';
import {
  createNonFeaAuthorityRevisionVector,
  assessNonFeaAuthorityRevisionStaleness,
  requireAuthorityRevisionVector,
} from '../../core/non-fea-analysis-plan/index.js';
import {
  commonMethodsForImplementation,
} from '../../core/non-fea-method-consumption/index.js';

export const NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SCHEMA =
  'non-fea-empirical-run-authorization/v1';
export const NON_FEA_EMPIRICAL_RUN_IMPLEMENTATION_ID =
  'AUTHORIZED_EMPIRICAL_SUPPORT_LOADS_V1';
export const NON_FEA_EMPIRICAL_RUN_AUTHORITY_KIND =
  'SYSTEM_READY_COMMON_INPUT_RUN_POLICY';
export const NON_FEA_EMPIRICAL_RUN_AUTHORITY_STATEMENT =
  'Routine product-screening Run authorization derived from fully READY current Common Input; no human approval or legacy publication/handoff authority is asserted.';

const AUTHORIZATION_KEYS = Object.freeze([
  'schema',
  'authorizationId',
  'authorizedAt',
  'decision',
  'authorityKind',
  'authorityStatement',
  'humanApprovalRequired',
  'humanApprovalAsserted',
  'implementationId',
  'requiredCommonMethodIds',
  'commonInputSemanticHash',
  'commonInputSealSemanticHash',
  'authorityRevisionVector',
  'authorityRevisionVectorSemanticHash',
  'policy',
  'semanticHash',
]);
const POLICY_KEYS = Object.freeze([
  'routineProductScreening',
  'legacyPublicationOrHandoffRequired',
  'legacyPublicationOrHandoffAsserted',
  'standaloneExecutionEligibility',
  'currentnessRequiredAtExecution',
  'implementationQualificationRequiredAtExecution',
  'engineeringFoundationRequiredAtExecution',
  'qualifiedNumericalProjectionRequiredAtExecution',
  'governedMethodSelectionRequiredAtExecution',
]);

/**
 * Creates the product-policy authorization decision that was missing between a
 * fully READY routine Common Input snapshot and downstream technical execution
 * gates. This is deliberately not a legacy common-enriched publication or
 * consumer-handoff decision and does not create a numerical execution request.
 */
export function createNonFeaEmpiricalRunAuthorization(
  snapshot,
  { authorizedAt = new Date().toISOString() } = {},
) {
  const commonInput = requireReadyRunSnapshot(snapshot);
  const implementationId = NON_FEA_EMPIRICAL_RUN_IMPLEMENTATION_ID;
  const requiredCommonMethodIds = requiredMethods();
  assertRequiredMethodsSealed(commonInput, requiredCommonMethodIds);
  const authorityRevisionVector = createNonFeaAuthorityRevisionVector(commonInput);
  const base = {
    schema: NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SCHEMA,
    authorizationId: `RUN-AUTH:${implementationId}:${commonInput.semanticHash}`,
    authorizedAt: canonicalTimestamp(authorizedAt, 'authorizedAt'),
    decision: 'AUTHORIZE_ROUTINE_RUN',
    authorityKind: NON_FEA_EMPIRICAL_RUN_AUTHORITY_KIND,
    authorityStatement: NON_FEA_EMPIRICAL_RUN_AUTHORITY_STATEMENT,
    humanApprovalRequired: false,
    humanApprovalAsserted: false,
    implementationId,
    requiredCommonMethodIds,
    commonInputSemanticHash: commonInput.semanticHash,
    commonInputSealSemanticHash: semanticHashText(
      commonInput.seal?.semanticHash,
      'commonInput.seal.semanticHash',
    ),
    authorityRevisionVector,
    authorityRevisionVectorSemanticHash: authorityRevisionVector.semanticHash,
    policy: {
      routineProductScreening: true,
      legacyPublicationOrHandoffRequired: false,
      legacyPublicationOrHandoffAsserted: false,
      standaloneExecutionEligibility: false,
      currentnessRequiredAtExecution: true,
      implementationQualificationRequiredAtExecution: true,
      engineeringFoundationRequiredAtExecution: true,
      qualifiedNumericalProjectionRequiredAtExecution: true,
      governedMethodSelectionRequiredAtExecution: true,
    },
  };
  return requireNonFeaEmpiricalRunAuthorization({
    ...base,
    semanticHash: semanticHash(base),
  });
}

export function requireNonFeaEmpiricalRunAuthorization(value) {
  exact(value, AUTHORIZATION_KEYS, 'nonFeaEmpiricalRunAuthorization');
  if (value.schema !== NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SCHEMA) {
    fail(
      'Unsupported Non-FEA empirical Run authorization schema.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SCHEMA_INVALID',
    );
  }
  const expectedMethods = requiredMethods();
  const authorityRevisionVector = requireAuthorityRevisionVector(value.authorityRevisionVector);
  const result = {
    schema: value.schema,
    authorizationId: requiredText(value.authorizationId, 'authorizationId'),
    authorizedAt: canonicalTimestamp(value.authorizedAt, 'authorizedAt'),
    decision: value.decision,
    authorityKind: value.authorityKind,
    authorityStatement: value.authorityStatement,
    humanApprovalRequired: value.humanApprovalRequired,
    humanApprovalAsserted: value.humanApprovalAsserted,
    implementationId: value.implementationId,
    requiredCommonMethodIds: normalizeMethodIds(value.requiredCommonMethodIds),
    commonInputSemanticHash: semanticHashText(
      value.commonInputSemanticHash,
      'commonInputSemanticHash',
    ),
    commonInputSealSemanticHash: semanticHashText(
      value.commonInputSealSemanticHash,
      'commonInputSealSemanticHash',
    ),
    authorityRevisionVector,
    authorityRevisionVectorSemanticHash: semanticHashText(
      value.authorityRevisionVectorSemanticHash,
      'authorityRevisionVectorSemanticHash',
    ),
    policy: normalizePolicy(value.policy),
    semanticHash: semanticHashText(value.semanticHash, 'semanticHash'),
  };

  if (result.decision !== 'AUTHORIZE_ROUTINE_RUN'
      || result.authorityKind !== NON_FEA_EMPIRICAL_RUN_AUTHORITY_KIND
      || result.authorityStatement !== NON_FEA_EMPIRICAL_RUN_AUTHORITY_STATEMENT
      || result.humanApprovalRequired !== false
      || result.humanApprovalAsserted !== false
      || result.implementationId !== NON_FEA_EMPIRICAL_RUN_IMPLEMENTATION_ID
      || JSON.stringify(result.requiredCommonMethodIds) !== JSON.stringify(expectedMethods)) {
    fail(
      'Non-FEA empirical Run authorization policy or identity was altered.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_POLICY_INVALID',
    );
  }
  if (result.authorizationId
      !== `RUN-AUTH:${result.implementationId}:${result.commonInputSemanticHash}`) {
    fail(
      'Non-FEA empirical Run authorization identity is not bound to its Common Input.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_IDENTITY_MISMATCH',
    );
  }
  if (result.authorityRevisionVector.commonInputSemanticHash
      !== result.commonInputSemanticHash
      || result.authorityRevisionVector.semanticHash
        !== result.authorityRevisionVectorSemanticHash) {
    fail(
      'Run authorization authority-revision binding is inconsistent.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_REVISION_BINDING_MISMATCH',
    );
  }
  const hashMaterial = { ...result };
  delete hashMaterial.semanticHash;
  if (semanticHash(hashMaterial) !== result.semanticHash) {
    fail(
      'Non-FEA empirical Run authorization semantic hash is stale.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_HASH_MISMATCH',
    );
  }
  return deepFreeze(result);
}

/**
 * Revalidates the exact current READY snapshot and authority revision vector.
 * The authorization decision is not self-currenting: any current authority
 * change or reseal must make an older receipt unusable.
 */
export function requireCurrentNonFeaEmpiricalRunAuthorization(value, snapshot) {
  const authorization = requireNonFeaEmpiricalRunAuthorization(value);
  const commonInput = requireReadyRunSnapshot(snapshot);
  assertRequiredMethodsSealed(commonInput, authorization.requiredCommonMethodIds);
  const currentRevisionVector = createNonFeaAuthorityRevisionVector(commonInput);
  const freshness = assessNonFeaAuthorityRevisionStaleness(
    authorization.authorityRevisionVector,
    currentRevisionVector,
  );
  if (authorization.commonInputSealSemanticHash !== commonInput.seal?.semanticHash) {
    fail(
      'The Non-FEA empirical Run authorization belongs to a different Common Input seal.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SEAL_STALE',
      {
        expected: authorization.commonInputSealSemanticHash,
        actual: commonInput.seal?.semanticHash || null,
      },
    );
  }
  if (freshness.stale) {
    fail(
      'The Non-FEA empirical Run authorization is stale against current engineering authority.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_STALE',
      freshness,
    );
  }
  return deepFreeze({
    authorization,
    commonInput,
    currentRevisionVector,
    freshness,
  });
}

function requireReadyRunSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    fail(
      'A current Common Input store snapshot is required for routine Run authorization.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SNAPSHOT_INVALID',
    );
  }
  const raw = snapshot.commonInput;
  if (!raw || raw.packageState !== 'READY') {
    fail(
      'Routine Run authorization requires a fully READY Common Input.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_NOT_READY',
      {
        packageState: raw?.packageState || null,
        sealedMethodIds: Array.isArray(raw?.sealedMethodIds) ? [...raw.sealedMethodIds] : [],
        blockedMethodIds: Array.isArray(raw?.blockedMethodIds) ? [...raw.blockedMethodIds] : [],
      },
    );
  }
  if (snapshot.staleness?.stale !== false) {
    fail(
      'Routine Run authorization requires a current, non-stale Common Input seal.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_COMMON_INPUT_STALE',
      snapshot.staleness || null,
    );
  }
  if (snapshot.error) {
    fail(
      'Routine Run authorization is unavailable while Common Input has an evaluation error.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_COMMON_INPUT_ERROR',
      { error: String(snapshot.error) },
    );
  }
  const commonInput = requireCommonEnrichedPipingInput(raw);
  if (!Array.isArray(commonInput.blockedMethodIds)
      || commonInput.blockedMethodIds.length !== 0
      || !Array.isArray(commonInput.sealedMethodIds)
      || commonInput.sealedMethodIds.length === 0) {
    fail(
      'Routine Run authorization requires zero blocked methods and at least one sealed method.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_NOT_READY',
      {
        sealedMethodIds: Array.isArray(commonInput.sealedMethodIds)
          ? [...commonInput.sealedMethodIds]
          : [],
        blockedMethodIds: Array.isArray(commonInput.blockedMethodIds)
          ? [...commonInput.blockedMethodIds]
          : [],
      },
    );
  }
  return commonInput;
}

function assertRequiredMethodsSealed(commonInput, requiredCommonMethodIds) {
  const missing = requiredCommonMethodIds.filter(
    (methodId) => !commonInput.sealedMethodIds.includes(methodId),
  );
  if (missing.length) {
    fail(
      `Routine Run authorization is missing required Common Input methods: ${missing.join(', ')}.`,
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_METHOD_NOT_READY',
      {
        requiredCommonMethodIds,
        sealedMethodIds: [...commonInput.sealedMethodIds],
        missing,
      },
    );
  }
}

function requiredMethods() {
  return deepFreeze([
    ...commonMethodsForImplementation(NON_FEA_EMPIRICAL_RUN_IMPLEMENTATION_ID),
  ].sort(ascii));
}

function normalizeMethodIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(
      'Run authorization requires at least one Common Input method.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_METHODS_INVALID',
    );
  }
  const rows = [...new Set(value.map((item) => requiredText(item, 'requiredCommonMethodId')))]
    .sort(ascii);
  return deepFreeze(rows);
}

function normalizePolicy(value) {
  exact(value, POLICY_KEYS, 'nonFeaEmpiricalRunAuthorization.policy');
  const expected = {
    routineProductScreening: true,
    legacyPublicationOrHandoffRequired: false,
    legacyPublicationOrHandoffAsserted: false,
    standaloneExecutionEligibility: false,
    currentnessRequiredAtExecution: true,
    implementationQualificationRequiredAtExecution: true,
    engineeringFoundationRequiredAtExecution: true,
    qualifiedNumericalProjectionRequiredAtExecution: true,
    governedMethodSelectionRequiredAtExecution: true,
  };
  const differs = Object.entries(expected).some(([key, expectedValue]) => (
    value[key] !== expectedValue
  ));
  if (differs) {
    fail(
      'Non-FEA empirical Run authorization policy was altered.',
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_POLICY_INVALID',
    );
  }
  return deepFreeze({ ...expected });
}

function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`, 'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_TYPE_INVALID');
  }
  const actual = Object.keys(value).sort(ascii);
  const expected = [...keys].sort(ascii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${label} contains unexpected or missing keys.`,
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_KEYS_INVALID',
      { actual, expected },
    );
  }
}

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(
      `${label} must be a non-empty trimmed string.`,
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_IDENTITY_INVALID',
    );
  }
  return value;
}

function canonicalTimestamp(value, label) {
  const text = requiredText(value, label);
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== text) {
    fail(
      `${label} must be a canonical ISO-8601 timestamp.`,
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_TIMESTAMP_INVALID',
    );
  }
  return text;
}

function semanticHashText(value, label) {
  const text = requiredText(value, label);
  if (!/^fnv1a64:[0-9a-f]{16}$/u.test(text)) {
    fail(
      `${label} must be an FNV-1a semantic hash.`,
      'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_HASH_INVALID',
    );
  }
  return text;
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : deepFreeze(structuredClone(details));
  throw error;
}
