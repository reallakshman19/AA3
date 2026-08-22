import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../../core/shared-piping-model/immutable.js';
import { clonePlain, freezeDeep } from '../dataset-utils.js';
import {
  createEvidenceValue,
  validateProjectDataProfile,
} from '../project-data/project-data-contract.js';
import { PROJECT_DATA_PROFILE_SCHEMA } from '../project-data/project-data-fields.js';
import {
  createNonFeaProductDefaultProvider,
} from '../project-data/non-fea-product-default-profile.js';
import { requireAuthorizedEmpiricalLoadInput } from './authorized-empirical-load-input.js';
import {
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from './authorized-empirical-effective-execution-projection.js';
import {
  calculateAuthorizedEmpiricalEffectiveSupportLoads,
} from './authorized-empirical-effective-support-load-execution.js';
import {
  EMPIRICAL_LOAD_METHOD,
  calculateSupportLoadDistribution,
} from './support-load-distribution-v3.js';

export const AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_REQUEST_SCHEMA = 'authorized-empirical-load-execution-request/v1';
export const AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_SCHEMA = 'authorized-empirical-load-execution/v1';

const REQUEST_KEYS = [
  'schema', 'executionId', 'executedAt', 'authorizedInput', 'dataset', 'profile',
  'supportSiteModel', 'routePartitionModel', 'masterData',
];
const LEGACY_OUTPUT_KEYS = [
  'schema', 'executionId', 'executedAt', 'projectId', 'datasetId', 'datasetVersion',
  'authorizedInputSemanticHash', 'overlaySemanticHash', 'baselineSemanticHash',
  'handoffSemanticHash', 'projectionPayloadSemanticHash', 'ephemeralProfileSemanticHash',
  'distributionSemanticHash', 'status', 'summary', 'distribution', 'semanticHash',
];
const OUTPUT_KEYS = [
  ...LEGACY_OUTPUT_KEYS.filter((key) => key !== 'semanticHash'),
  'effectiveExecutionProjectionSemanticHash',
  'semanticHash',
];
const OVERLAY_FIELDS = [
  'pipeSectionProperties', 'materialDensitiesKgPerM3',
  'operatingFluidDensitiesKgPerM3', 'hydroFluidDensitiesKgPerM3',
  'insulationDensitiesKgPerM3', 'componentWeightsKg',
];

/** Historical executions keep their old projection; ledger-enabled executions bind the new projection hash. */
export function authorizedEmpiricalLoadExecutionSemanticProjection(value) {
  const keys = Object.hasOwn(value || {}, 'effectiveExecutionProjectionSemanticHash')
    ? OUTPUT_KEYS
    : LEGACY_OUTPUT_KEYS;
  return Object.fromEntries(keys
    .filter((key) => key !== 'semanticHash')
    .map((key) => [key, value[key]]));
}

export function computeAuthorizedEmpiricalLoadExecutionSemanticHash(value) {
  return semanticHash(authorizedEmpiricalLoadExecutionSemanticProjection(value));
}

/**
 * Builds the ephemeral profile consumed by authorized gravity execution.
 * Product defaults fill only empty Project Data fields before the authorized
 * six-field compatibility overlay is applied. The stored Project Data profile
 * is never mutated. For newly compiled inputs the six fields are subsequently
 * replaced by exact target-level effective values before calculation.
 */
export function buildAuthorizedEmpiricalLoadProfile(profile, authorizedInput) {
  const input = requireAuthorizedEmpiricalLoadInput(authorizedInput);
  requireProfile(profile);
  if (profile.projectId !== input.projectId) {
    fail('Project Data and authorized input belong to different projects.', 'EMPIRICAL_EXECUTION_PROJECT_MISMATCH', {
      profileProjectId: profile.projectId,
      inputProjectId: input.projectId,
    });
  }

  const productDefaultProvider = createNonFeaProductDefaultProvider({ profile });
  const effectiveProfile = productDefaultProvider.effectiveProfile;
  const evidence = freezeDeep({
    source: 'AUTHORIZED_EMPIRICAL_LOAD_INPUT',
    sourceSchema: input.schema,
    sourceSemanticHash: input.semanticHash,
    overlaySemanticHash: input.overlaySemanticHash,
    baselineId: input.baselineId,
    baselineRevision: input.baselineRevision,
    baselineSemanticHash: input.baselineSemanticHash,
    readinessEvaluationSemanticHash: input.readinessEvaluationSemanticHash,
    readinessSemanticHash: input.readinessSemanticHash,
    handoffSemanticHash: input.handoffSemanticHash,
    projectionPayloadSemanticHash: input.projectionPayloadSemanticHash,
  });
  const loadCalculation = clonePlain(effectiveProfile.loadCalculation);
  for (const field of OVERLAY_FIELDS) {
    loadCalculation[field] = createEvidenceValue(
      input.loadCalculationOverlay[field],
      evidence,
      true,
    );
  }
  return freezeDeep({
    ...clonePlain(effectiveProfile),
    loadCalculation,
  });
}

export function calculateAuthorizedEmpiricalLoadExecution(value) {
  exact(value, REQUEST_KEYS, 'authorizedEmpiricalLoadExecutionRequest');
  if (value.schema !== AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_REQUEST_SCHEMA) {
    fail('Unsupported authorized empirical execution request.', 'EMPIRICAL_EXECUTION_SCHEMA_INVALID');
  }
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
  const loadWorkflow = effectiveExecutionProjection ? 'authorizedGravityLoads' : 'loads';
  const loadAudit = validateProjectDataProfile(profile, loadWorkflow, activeHashes);
  const topologyAudit = validateProjectDataProfile(profile, 'topology', activeHashes);
  const errors = [...loadAudit.errors, ...topologyAudit.errors];
  if (errors.length > 0) {
    fail('The ephemeral Project Data profile is not calculation-ready.', 'EMPIRICAL_EXECUTION_PROFILE_BLOCKED', { errors });
  }

  const distribution = effectiveExecutionProjection
    ? calculateAuthorizedEmpiricalEffectiveSupportLoads({
      effectiveExecutionProjection,
      method: EMPIRICAL_LOAD_METHOD,
      supportSiteModel: value.supportSiteModel,
      routePartitionModel: value.routePartitionModel,
      masterData: value.masterData,
    })
    : calculateSupportLoadDistribution({
      dataset,
      profile,
      supportSiteModel: value.supportSiteModel,
      routePartitionModel: value.routePartitionModel,
      masterData: value.masterData,
    });
  const summary = summarize(distribution);
  const draft = {
    schema: AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_SCHEMA,
    executionId: identity(value.executionId, 'executionId'),
    executedAt: timestamp(value.executedAt, 'executedAt'),
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
    summary,
    distribution,
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return requireAuthorizedEmpiricalLoadExecution({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadExecutionSemanticHash(draft),
  });
}

export function requireAuthorizedEmpiricalLoadExecution(value) {
  exactOneOf(value, [LEGACY_OUTPUT_KEYS, OUTPUT_KEYS], 'authorizedEmpiricalLoadExecution');
  if (value.schema !== AUTHORIZED_EMPIRICAL_LOAD_EXECUTION_SCHEMA) {
    fail('Unsupported authorized empirical execution.', 'EMPIRICAL_EXECUTION_SCHEMA_INVALID');
  }
  const hasEffectiveProjection = Object.hasOwn(value, 'effectiveExecutionProjectionSemanticHash');
  const result = {
    ...value,
    executionId: identity(value.executionId, 'executionId'),
    executedAt: timestamp(value.executedAt, 'executedAt'),
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
    status: status(value.status),
    summary: requireSummary(value.summary),
    distribution: requireDistribution(value.distribution),
    semanticHash: hash(value.semanticHash, 'semanticHash'),
  };
  if (result.distribution.status !== result.status) {
    fail('Execution status differs from the distribution.', 'EMPIRICAL_EXECUTION_STATUS_MISMATCH');
  }
  if (result.distributionSemanticHash !== semanticHash(result.distribution)) {
    fail('Distribution semantic hash is stale.', 'EMPIRICAL_EXECUTION_HASH_MISMATCH');
  }
  const expectedSummary = summarize(result.distribution);
  if (semanticHash(result.summary) !== semanticHash(expectedSummary)) {
    fail('Execution summary is stale.', 'EMPIRICAL_EXECUTION_SUMMARY_MISMATCH');
  }
  if (result.semanticHash !== computeAuthorizedEmpiricalLoadExecutionSemanticHash(result)) {
    fail('Execution semantic hash is stale.', 'EMPIRICAL_EXECUTION_HASH_MISMATCH');
  }
  return deepFreeze(result);
}

function requireProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)
    || profile.schema !== PROJECT_DATA_PROFILE_SCHEMA) {
    fail('A valid Project Data profile is required.', 'EMPIRICAL_EXECUTION_PROFILE_INVALID');
  }
  identity(profile.projectId, 'profile.projectId');
}

function requireDistribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.schema !== 'string' || !Array.isArray(value.loadCases)) {
    fail('A support-load distribution is required.', 'EMPIRICAL_EXECUTION_DISTRIBUTION_INVALID');
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
    contributionCount: cases.reduce((total, row) => total + (Array.isArray(row.contributionLedger) ? row.contributionLedger.length : 0), 0),
    excludedInputCount: cases.reduce((total, row) => total + (Array.isArray(row.excludedInputs) ? row.excludedInputs.length : 0), 0),
  };
}

function requireSummary(value) {
  exact(value, ['loadCaseCount', 'calculatedCaseCount', 'blockedCaseCount', 'contributionCount', 'excludedInputCount'], 'summary');
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, nonnegativeInteger(item, `summary.${key}`)]));
}

function masterHashes(masterData, dataset) {
  return {
    dataset: dataset?.sourceSha256 || '',
    lineList: masterData?.lineList?.sourceHash || '',
    pipingClass: masterData?.pipingClass?.sourceHash || '',
    componentWeight: masterData?.weight?.sourceHash || '',
  };
}

function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`, 'EMPIRICAL_EXECUTION_TYPE_INVALID');
  }
  const actual = Object.keys(value).sort(ascii);
  const expected = [...keys].sort(ascii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} contains unexpected or missing keys.`, 'EMPIRICAL_EXECUTION_KEYS_INVALID', { actual, expected });
  }
}

function exactOneOf(value, keySets, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`, 'EMPIRICAL_EXECUTION_TYPE_INVALID');
  }
  const actual = Object.keys(value).sort(ascii);
  const matches = keySets.some((keys) => (
    JSON.stringify(actual) === JSON.stringify([...keys].sort(ascii))
  ));
  if (!matches) {
    fail(`${label} contains unexpected or missing keys.`, 'EMPIRICAL_EXECUTION_KEYS_INVALID', {
      actual,
      expectedVariants: keySets.map((keys) => [...keys].sort(ascii)),
    });
  }
}

function identity(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(`${label} must be a non-empty trimmed string.`, 'EMPIRICAL_EXECUTION_IDENTITY_INVALID');
  }
  return value;
}

function timestamp(value, label) {
  identity(value, label);
  if (new Date(value).toISOString() !== value) {
    fail(`${label} must be a canonical ISO-8601 timestamp.`, 'EMPIRICAL_EXECUTION_TIMESTAMP_INVALID');
  }
  return value;
}

function hash(value, label) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    fail(`${label} must be an FNV-1a semantic hash.`, 'EMPIRICAL_EXECUTION_HASH_INVALID');
  }
  return value;
}

function nullableVersion(value) {
  if (value === null || value === undefined) return null;
  if ((typeof value !== 'string' && !Number.isInteger(value)) || (typeof value === 'string' && value.length === 0)) {
    fail('datasetVersion must be null, an integer, or a non-empty string.', 'EMPIRICAL_EXECUTION_VERSION_INVALID');
  }
  return value;
}

function nonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    fail(`${label} must be a non-negative integer.`, 'EMPIRICAL_EXECUTION_NUMBER_INVALID');
  }
  return value;
}

function status(value) {
  const allowed = ['CALCULATED', 'CALCULATED_WITH_EXCEPTIONS', 'FAILED', 'BLOCKED'];
  if (!allowed.includes(value)) {
    fail(
      'Execution status must be CALCULATED, CALCULATED_WITH_EXCEPTIONS, FAILED, or legacy BLOCKED.',
      'EMPIRICAL_EXECUTION_STATUS_INVALID',
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
