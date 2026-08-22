import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../../core/shared-piping-model/immutable.js';
import { clonePlain } from '../dataset-utils.js';
import { validateProjectDataProfile } from '../project-data/project-data-contract.js';
import { requireAuthorizedEmpiricalLoadInput } from './authorized-empirical-load-input.js';
import { buildAuthorizedEmpiricalLoadProfile } from './authorized-empirical-load-execution.js';
import {
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from './authorized-empirical-effective-execution-projection.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
  calculateSupportLoadDistribution,
  calculateSupportLoadDistributionWithComponentCog,
} from './support-load-distribution-v3.js';

export const AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA =
  'authorized-empirical-load-execution-request/v2';
export const AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_SCHEMA =
  'authorized-empirical-load-execution/v2';

export const AUTHORIZED_EMPIRICAL_EXECUTION_METHODS = Object.freeze([
  EMPIRICAL_LOAD_METHOD,
  EMPIRICAL_LOAD_COG_METHOD,
]);

const REQUEST_KEYS = [
  'schema', 'executionId', 'executedAt', 'method', 'authorizedInput', 'dataset',
  'profile', 'supportSiteModel', 'routePartitionModel', 'masterData',
];
const LEGACY_OUTPUT_KEYS = [
  'schema', 'executionId', 'executedAt', 'requestedMethod', 'executedMethod',
  'projectId', 'datasetId', 'datasetVersion', 'authorizedInputSemanticHash',
  'overlaySemanticHash', 'baselineSemanticHash', 'handoffSemanticHash',
  'projectionPayloadSemanticHash', 'ephemeralProfileSemanticHash',
  'distributionSemanticHash', 'status', 'summary', 'distribution', 'semanticHash',
];
const OUTPUT_KEYS = [
  ...LEGACY_OUTPUT_KEYS.filter((key) => key !== 'semanticHash'),
  'effectiveExecutionProjectionSemanticHash',
  'semanticHash',
];

export function authorizedEmpiricalLoadExecutionV2SemanticProjection(value) {
  const keys = Object.hasOwn(value || {}, 'effectiveExecutionProjectionSemanticHash')
    ? OUTPUT_KEYS
    : LEGACY_OUTPUT_KEYS;
  return Object.fromEntries(keys
    .filter((key) => key !== 'semanticHash')
    .map((key) => [key, value[key]]));
}

export function computeAuthorizedEmpiricalLoadExecutionV2SemanticHash(value) {
  return semanticHash(authorizedEmpiricalLoadExecutionV2SemanticProjection(value));
}

/**
 * Executes exactly the caller-authorized empirical method. Ledger-bearing
 * inputs use the same target-level effective execution projection as the V1
 * path. Historical inputs without that ledger retain the compatibility overlay
 * path and their historical output/hash projection.
 */
export function calculateAuthorizedEmpiricalLoadExecutionV2(value) {
  exact(value, REQUEST_KEYS, 'authorizedEmpiricalLoadExecutionV2Request');
  if (value.schema !== AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_REQUEST_SCHEMA) {
    fail(
      'Unsupported authorized empirical V2 execution request.',
      'EMPIRICAL_EXECUTION_V2_SCHEMA_INVALID',
    );
  }
  const requestedMethod = method(value.method);
  const authorizedInput = requireAuthorizedEmpiricalLoadInput(value.authorizedInput);
  const compatibilityProfile = buildAuthorizedEmpiricalLoadProfile(value.profile, authorizedInput);
  const effectiveExecutionProjection = authorizedInput.effectiveValueLedger
    ? createAuthorizedEmpiricalEffectiveExecutionProjection({
      authorizedInput,
      dataset: value.dataset,
      profile: compatibilityProfile,
    })
    : null;
  const profile = effectiveExecutionProjection?.profile || compatibilityProfile;
  const dataset = effectiveExecutionProjection?.dataset || value.dataset;
  const activeHashes = masterHashes(value.masterData, dataset);
  const errors = [
    ...validateProjectDataProfile(profile, 'loads', activeHashes).errors,
    ...validateProjectDataProfile(profile, 'topology', activeHashes).errors,
  ];
  if (errors.length > 0) {
    fail(
      'The ephemeral Project Data profile is not calculation-ready.',
      'EMPIRICAL_EXECUTION_V2_PROFILE_BLOCKED',
      { errors },
    );
  }

  const calculationInput = {
    dataset,
    profile,
    supportSiteModel: value.supportSiteModel,
    routePartitionModel: value.routePartitionModel,
    masterData: value.masterData,
  };
  const distribution = requestedMethod === EMPIRICAL_LOAD_METHOD
    ? calculateSupportLoadDistribution(calculationInput)
    : calculateSupportLoadDistributionWithComponentCog(calculationInput);
  if (distribution.method !== requestedMethod) {
    fail(
      'Executed empirical method differs from the authorized method.',
      'EMPIRICAL_EXECUTION_V2_METHOD_MISMATCH',
      { requestedMethod, executedMethod: distribution.method },
    );
  }

  const draft = {
    schema: AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_SCHEMA,
    executionId: identity(value.executionId, 'executionId'),
    executedAt: timestamp(value.executedAt, 'executedAt'),
    requestedMethod,
    executedMethod: distribution.method,
    projectId: authorizedInput.projectId,
    datasetId: identity(value.dataset?.datasetId, 'dataset.datasetId'),
    datasetVersion: nullableVersion(value.dataset?.version),
    authorizedInputSemanticHash: authorizedInput.semanticHash,
    overlaySemanticHash: authorizedInput.overlaySemanticHash,
    baselineSemanticHash: authorizedInput.baselineSemanticHash,
    handoffSemanticHash: authorizedInput.handoffSemanticHash,
    projectionPayloadSemanticHash: authorizedInput.projectionPayloadSemanticHash,
    ephemeralProfileSemanticHash: semanticHash(profile),
    ...(effectiveExecutionProjection ? {
      effectiveExecutionProjectionSemanticHash: effectiveExecutionProjection.semanticHash,
    } : {}),
    distributionSemanticHash: semanticHash(distribution),
    status: distribution.status,
    summary: summarize(distribution),
    distribution,
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return requireAuthorizedEmpiricalLoadExecutionV2({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadExecutionV2SemanticHash(draft),
  });
}

export function requireAuthorizedEmpiricalLoadExecutionV2(value) {
  exactOneOf(value, [LEGACY_OUTPUT_KEYS, OUTPUT_KEYS], 'authorizedEmpiricalLoadExecutionV2');
  if (value.schema !== AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_V2_SCHEMA) {
    fail(
      'Unsupported authorized empirical V2 execution.',
      'EMPIRICAL_EXECUTION_V2_SCHEMA_INVALID',
    );
  }
  const hasEffectiveProjection = Object.hasOwn(value, 'effectiveExecutionProjectionSemanticHash');
  const result = {
    ...value,
    executionId: identity(value.executionId, 'executionId'),
    executedAt: timestamp(value.executedAt, 'executedAt'),
    requestedMethod: method(value.requestedMethod),
    executedMethod: method(value.executedMethod),
    projectId: identity(value.projectId, 'projectId'),
    datasetId: identity(value.datasetId, 'datasetId'),
    datasetVersion: nullableVersion(value.datasetVersion),
    authorizedInputSemanticHash: hash(value.authorizedInputSemanticHash, 'authorizedInputSemanticHash'),
    overlaySemanticHash: hash(value.overlaySemanticHash, 'overlaySemanticHash'),
    baselineSemanticHash: hash(value.baselineSemanticHash, 'baselineSemanticHash'),
    handoffSemanticHash: hash(value.handoffSemanticHash, 'handoffSemanticHash'),
    projectionPayloadSemanticHash: hash(value.projectionPayloadSemanticHash, 'projectionPayloadSemanticHash'),
    ephemeralProfileSemanticHash: hash(value.ephemeralProfileSemanticHash, 'ephemeralProfileSemanticHash'),
    ...(hasEffectiveProjection ? {
      effectiveExecutionProjectionSemanticHash: hash(
        value.effectiveExecutionProjectionSemanticHash,
        'effectiveExecutionProjectionSemanticHash',
      ),
    } : {}),
    distributionSemanticHash: hash(value.distributionSemanticHash, 'distributionSemanticHash'),
    status: executionStatus(value.status),
    summary: requireSummary(value.summary),
    distribution: requireDistribution(value.distribution),
    semanticHash: hash(value.semanticHash, 'semanticHash'),
  };
  if (result.requestedMethod !== result.executedMethod
    || result.distribution.method !== result.executedMethod) {
    fail(
      'Authorized, executed and distribution methods do not agree.',
      'EMPIRICAL_EXECUTION_V2_METHOD_MISMATCH',
      {
        requestedMethod: result.requestedMethod,
        executedMethod: result.executedMethod,
        distributionMethod: result.distribution.method,
      },
    );
  }
  if (result.distribution.status !== result.status) {
    fail(
      'Execution status differs from the distribution.',
      'EMPIRICAL_EXECUTION_V2_STATUS_MISMATCH',
    );
  }
  if (result.distributionSemanticHash !== semanticHash(result.distribution)) {
    fail(
      'Distribution semantic hash is stale.',
      'EMPIRICAL_EXECUTION_V2_HASH_MISMATCH',
    );
  }
  if (semanticHash(result.summary) !== semanticHash(summarize(result.distribution))) {
    fail(
      'Execution summary is stale.',
      'EMPIRICAL_EXECUTION_V2_SUMMARY_MISMATCH',
    );
  }
  if (result.semanticHash !== computeAuthorizedEmpiricalLoadExecutionV2SemanticHash(result)) {
    fail(
      'Execution semantic hash is stale.',
      'EMPIRICAL_EXECUTION_V2_HASH_MISMATCH',
    );
  }
  return deepFreeze(result);
}

function requireDistribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.schema !== 'string' || !Array.isArray(value.loadCases)) {
    fail(
      'A support-load distribution is required.',
      'EMPIRICAL_EXECUTION_V2_DISTRIBUTION_INVALID',
    );
  }
  return clonePlain(value);
}

function summarize(distribution) {
  const cases = Array.isArray(distribution.loadCases) ? distribution.loadCases : [];
  return {
    loadCaseCount: cases.length,
    calculatedCaseCount: cases.filter((row) => (
      row.status === 'CALCULATED' || row.status === 'CALCULATED_WITH_EXCEPTIONS'
    )).length,
    blockedCaseCount: cases.filter((row) => (
      row.status === 'BLOCKED' || row.status === 'FAILED'
    )).length,
    contributionCount: cases.reduce((total, row) => (
      total + (Array.isArray(row.contributionLedger) ? row.contributionLedger.length : 0)
    ), 0),
    excludedInputCount: cases.reduce((total, row) => (
      total + (Array.isArray(row.excludedInputs) ? row.excludedInputs.length : 0)
    ), 0),
  };
}

function requireSummary(value) {
  exact(
    value,
    [
      'loadCaseCount', 'calculatedCaseCount', 'blockedCaseCount',
      'contributionCount', 'excludedInputCount',
    ],
    'summary',
  );
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    nonnegativeInteger(item, `summary.${key}`),
  ]));
}

function masterHashes(masterData, dataset) {
  return {
    dataset: dataset?.sourceSha256 || '',
    lineList: masterData?.lineList?.sourceHash || '',
    pipingClass: masterData?.pipingClass?.sourceHash || '',
    componentWeight: masterData?.weight?.sourceHash || '',
  };
}

function method(value) {
  if (!AUTHORIZED_EMPIRICAL_EXECUTION_METHODS.includes(value)) {
    fail(
      'Authorized empirical method is unsupported.',
      'EMPIRICAL_EXECUTION_V2_METHOD_INVALID',
      { value, allowed: AUTHORIZED_EMPIRICAL_EXECUTION_METHODS },
    );
  }
  return value;
}

function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`, 'EMPIRICAL_EXECUTION_V2_TYPE_INVALID');
  }
  const actual = Object.keys(value).sort(ascii);
  const expected = [...keys].sort(ascii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${label} contains unexpected or missing keys.`,
      'EMPIRICAL_EXECUTION_V2_KEYS_INVALID',
      { actual, expected },
    );
  }
}

function exactOneOf(value, keySets, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`, 'EMPIRICAL_EXECUTION_V2_TYPE_INVALID');
  }
  const actual = Object.keys(value).sort(ascii);
  const matches = keySets.some((keys) => (
    JSON.stringify(actual) === JSON.stringify([...keys].sort(ascii))
  ));
  if (!matches) {
    fail(
      `${label} contains unexpected or missing keys.`,
      'EMPIRICAL_EXECUTION_V2_KEYS_INVALID',
      { actual, expectedVariants: keySets.map((keys) => [...keys].sort(ascii)) },
    );
  }
}

function identity(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(
      `${label} must be a non-empty trimmed string.`,
      'EMPIRICAL_EXECUTION_V2_IDENTITY_INVALID',
    );
  }
  return value;
}

function timestamp(value, label) {
  const result = identity(value, label);
  if (new Date(result).toISOString() !== result) {
    fail(
      `${label} must be a canonical ISO-8601 timestamp.`,
      'EMPIRICAL_EXECUTION_V2_TIMESTAMP_INVALID',
    );
  }
  return result;
}

function hash(value, label) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    fail(
      `${label} must be an FNV-1a semantic hash.`,
      'EMPIRICAL_EXECUTION_V2_HASH_INVALID',
    );
  }
  return value;
}

function nullableVersion(value) {
  if (value === null || value === undefined) return null;
  if (Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.length > 0 && value.trim() === value) {
    return value;
  }
  fail(
    'datasetVersion must be null, an integer, or a non-empty string.',
    'EMPIRICAL_EXECUTION_V2_VERSION_INVALID',
  );
}

function nonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    fail(
      `${label} must be a non-negative integer.`,
      'EMPIRICAL_EXECUTION_V2_NUMBER_INVALID',
    );
  }
  return value;
}

function executionStatus(value) {
  const allowed = ['CALCULATED', 'CALCULATED_WITH_EXCEPTIONS', 'FAILED', 'BLOCKED'];
  if (!allowed.includes(value)) {
    fail(
      'Execution status must be CALCULATED, CALCULATED_WITH_EXCEPTIONS, FAILED, or legacy BLOCKED.',
      'EMPIRICAL_EXECUTION_V2_STATUS_INVALID',
    );
  }
  return value;
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : deepFreeze(details);
  throw error;
}
