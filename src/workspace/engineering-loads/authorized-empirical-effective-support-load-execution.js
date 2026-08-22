import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep } from '../dataset-utils.js';
import {
  projectDataEntry,
  projectDataValue,
} from '../project-data/project-data-contract.js';
import {
  AUTHORIZED_EMPIRICAL_EFFECTIVE_EXECUTION_PROJECTION_SCHEMA,
} from './authorized-empirical-effective-execution-projection.js';
import {
  bindAuthorizedEmpiricalSourceAxis,
} from './authorized-empirical-source-axis-binding.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
  calculateSupportLoadDistribution,
  calculateSupportLoadDistributionWithComponentCog,
} from './support-load-distribution-v3.js';

export const AUTHORIZED_EMPIRICAL_EFFECTIVE_SUPPORT_LOAD_EXECUTION_SCHEMA =
  'authorized-empirical-effective-support-load-execution/v1';

const PROJECTED_LOAD_PATHS = Object.freeze([
  'loadCalculation.pipeSectionProperties',
  'loadCalculation.materialDensitiesKgPerM3',
  'loadCalculation.operatingFluidDensitiesKgPerM3',
  'loadCalculation.hydroFluidDensitiesKgPerM3',
  'loadCalculation.insulationDensitiesKgPerM3',
  'loadCalculation.componentWeightsKg',
]);

/**
 * Guarded execution seam for ledger-bearing V1/V2 gravity calculations.
 *
 * The legacy distribution kernel still consumes Project-Data-shaped maps, but
 * on this path those maps are an immutable execution projection generated from
 * the authorized target-level effective-value ledger. This guard proves that
 * projection binding before the kernel runs and forbids the legacy `DEFAULT`
 * selector entirely. Therefore the kernel may perform only exact lookups from
 * the effective projection; raw Project Data fallback authority is unreachable.
 * The returned result is then rebound to the governed effective source up-axis
 * so the active ledger path does not publish the legacy kernel's hard-coded
 * Z-up metadata.
 *
 * Historical ledger-less callers intentionally do not use this function.
 */
export function calculateAuthorizedEmpiricalEffectiveSupportLoads({
  effectiveExecutionProjection,
  method,
  supportSiteModel,
  routePartitionModel,
  masterData,
} = {}) {
  const projection = requireAuthorizedEmpiricalEffectiveSupportProjection(
    effectiveExecutionProjection,
  );
  const requestedMethod = requireMethod(method);

  const calculationInput = {
    dataset: projection.dataset,
    profile: projection.profile,
    supportSiteModel,
    routePartitionModel,
    masterData,
  };
  const distribution = requestedMethod === EMPIRICAL_LOAD_METHOD
    ? calculateSupportLoadDistribution(calculationInput)
    : calculateSupportLoadDistributionWithComponentCog(calculationInput);

  if (distribution.method !== requestedMethod) {
    throw codedError(
      'Effective support-load execution returned a different empirical method.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_METHOD_MISMATCH',
      { requestedMethod, executedMethod: distribution.method },
    );
  }
  assertNoLegacyFallbackConsumption(distribution);
  return bindAuthorizedEmpiricalSourceAxis({
    distribution,
    profile: projection.profile,
  });
}

/**
 * Validates the complete pre-execution authority boundary without invoking the
 * support-load statics kernel. Focused falsifiers can therefore prove that a
 * stale projection, unbound projected map or legacy DEFAULT selector cannot
 * reach ledger-driven V1/V2 calculation.
 */
export function requireAuthorizedEmpiricalEffectiveSupportProjection(value) {
  const projection = requireEffectiveExecutionProjection(value);
  assertProjectedLoadEvidence(projection);
  assertNoLegacyDefaultSelectors(projection.profile);
  return projection;
}

export function requireEffectiveExecutionProjection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.schema !== AUTHORIZED_EMPIRICAL_EFFECTIVE_EXECUTION_PROJECTION_SCHEMA
      || !value.profile || !value.dataset) {
    throw codedError(
      `Expected ${AUTHORIZED_EMPIRICAL_EFFECTIVE_EXECUTION_PROJECTION_SCHEMA}.`,
      'EMPIRICAL_EFFECTIVE_SUPPORT_PROJECTION_INVALID',
    );
  }
  const {
    profile,
    dataset,
    semanticHash: suppliedSemanticHash,
    ...material
  } = value;
  if (suppliedSemanticHash !== semanticHash(material)) {
    throw codedError(
      'Effective execution projection semantic hash is stale.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_PROJECTION_HASH_MISMATCH',
    );
  }
  if (value.projectedProfileSemanticHash !== semanticHash(profile)) {
    throw codedError(
      'Effective execution profile differs from its bound projection hash.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_PROFILE_HASH_MISMATCH',
    );
  }
  if (value.projectedDatasetSemanticHash !== semanticHash(dataset)) {
    throw codedError(
      'Effective execution dataset differs from its bound projection hash.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_DATASET_HASH_MISMATCH',
    );
  }
  return freezeDeep(value);
}

function assertProjectedLoadEvidence(projection) {
  PROJECTED_LOAD_PATHS.forEach((path) => {
    const entry = projectDataEntry(projection.profile, path);
    const evidence = entry?.evidence;
    if (!entry || entry.approved !== true
        || evidence?.source !== 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER'
        || evidence?.sourceSemanticHash !== projection.effectiveValueLedgerSemanticHash
        || evidence?.authorizedInputSemanticHash !== projection.authorizedInputSemanticHash
        || evidence?.effectiveExecutionProjectionSemanticHash !== projection.projectionSemanticHash) {
      throw codedError(
        `Projected load field ${path} is not bound to the authorized effective-value ledger.`,
        'EMPIRICAL_EFFECTIVE_SUPPORT_FIELD_AUTHORITY_INVALID',
        { path },
      );
    }
  });
}

function assertNoLegacyDefaultSelectors(profile) {
  PROJECTED_LOAD_PATHS.forEach((path) => {
    const value = projectDataValue(profile, path);
    if (value && typeof value === 'object' && !Array.isArray(value)
        && Object.hasOwn(value, 'DEFAULT')) {
      throw codedError(
        `Ledger-driven support-load execution forbids legacy DEFAULT selector at ${path}.`,
        'EMPIRICAL_EFFECTIVE_SUPPORT_DEFAULT_SELECTOR_FORBIDDEN',
        { path },
      );
    }
  });
}

function assertNoLegacyFallbackConsumption(distribution) {
  const fallbackRows = (distribution.loadCases || []).flatMap((loadCase) => (
    (loadCase.contributionLedger || []).flatMap((contribution) => (
      (contribution.formula?.projectDataSources || [])
        .filter((source) => source?.fallbackUsed === true)
        .map((source) => ({
          loadCaseId: loadCase.loadCaseId,
          entityId: contribution.entityId,
          projectDataPath: source.projectDataPath,
          selector: source.selector,
        }))
    ))
  ));
  if (fallbackRows.length > 0) {
    throw codedError(
      'Ledger-driven support-load execution consumed a legacy Project Data fallback.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_LEGACY_FALLBACK_CONSUMED',
      fallbackRows,
    );
  }
  const usageRows = distribution.configuredDefaultUsageLedger?.rows || [];
  if (usageRows.length > 0) {
    throw codedError(
      'Ledger-driven support-load execution produced a legacy configured-default usage receipt.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_LEGACY_USAGE_LEDGER_NONEMPTY',
      usageRows,
    );
  }
}

function requireMethod(value) {
  if (value !== EMPIRICAL_LOAD_METHOD && value !== EMPIRICAL_LOAD_COG_METHOD) {
    throw codedError(
      'Effective support-load execution method is unsupported.',
      'EMPIRICAL_EFFECTIVE_SUPPORT_METHOD_INVALID',
      { value, allowed: [EMPIRICAL_LOAD_METHOD, EMPIRICAL_LOAD_COG_METHOD] },
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
