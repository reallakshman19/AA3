export class ModelDiscrepancyError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'ModelDiscrepancyError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new ModelDiscrepancyError(code, path, message);
};

const finiteNumber = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail('NON_FINITE_NUMBER', path, 'value must be a finite number');
  }
  return value;
};

const nonEmptyString = (value, path) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('MISSING_STRING', path, 'value must be a non-empty string');
  }
  return value;
};

function validateAuthority(authority) {
  if (!authority || typeof authority !== 'object') {
    fail('MISSING_AUTHORITY', '$.authority', 'authority metadata is required');
  }
  if (authority.referenceModelDiscrepancyExecutionAuthorized !== true) {
    fail('REFERENCE_AUTHORITY_REQUIRED', '$.authority.referenceModelDiscrepancyExecutionAuthorized', 'reference model-discrepancy execution must be explicitly authorized');
  }
  const falseFields = [
    'productionModelDiscrepancyAuthorized',
    'productionCalibrationFactorAuthorized',
    'productionStatisticalExecutionAuthorized',
    'productionSensitivityAuthorized',
    'productionValidationAcceptanceAuthorized',
    'b03ActivationAuthorized',
    'programReleaseAuthority',
    'programTemperatureAuthority',
  ];
  for (const field of falseFields) {
    if (authority[field] !== false) {
      fail('PRODUCTION_AUTHORITY_LEAKAGE', `$.authority.${field}`, `${field} must remain false`);
    }
  }
  if (authority.activeProductionNumericStochasticSourceCount !== 0) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.activeProductionNumericStochasticSourceCount', 'active production numeric stochastic-source count must remain zero');
  }
  if (authority.productionReliabilityTargetAuthority !== 'NONE') {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.productionReliabilityTargetAuthority', 'production reliability-target authority must remain NONE');
  }
}

function validateNormalDistribution(distribution, path, expectedSource, label) {
  if (!distribution || typeof distribution !== 'object') {
    fail(`MISSING_${label}_DISTRIBUTION`, path, `${label.toLowerCase()} distribution is required`);
  }
  if (distribution.family !== 'NORMAL') {
    fail(`UNSUPPORTED_${label}_DISTRIBUTION`, `${path}.family`, 'only NORMAL is qualified');
  }
  const mean = finiteNumber(distribution.mean, `${path}.mean`);
  const standardDeviation = finiteNumber(distribution.standardDeviation, `${path}.standardDeviation`);
  if (standardDeviation < 0) {
    fail(`NEGATIVE_${label}_STANDARD_DEVIATION`, `${path}.standardDeviation`, `${label.toLowerCase()} standard deviation must be nonnegative`);
  }
  if (distribution.meanSource !== expectedSource) {
    fail(`UNSUPPORTED_${label}_MEAN_SOURCE`, `${path}.meanSource`, `${label.toLowerCase()} mean source changed`);
  }
  if (distribution.standardDeviationSource !== expectedSource) {
    fail(`UNSUPPORTED_${label}_STANDARD_DEVIATION_SOURCE`, `${path}.standardDeviationSource`, `${label.toLowerCase()} standard-deviation source changed`);
  }
  return {
    family: distribution.family,
    mean,
    standardDeviation,
    meanSource: distribution.meanSource,
    standardDeviationSource: distribution.standardDeviationSource,
  };
}

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') {
    fail('MISSING_PLAN', '$.plan', 'propagation plan is required');
  }
  const unit = nonEmptyString(plan.unit, '$.plan.unit');
  if (!Array.isArray(plan.requiredHoldoutIds) || plan.requiredHoldoutIds.length === 0) {
    fail('INVALID_REQUIRED_HOLDOUT_IDS', '$.plan.requiredHoldoutIds', 'requiredHoldoutIds must be a non-empty array');
  }
  const requiredHoldoutIds = [];
  const seen = new Set();
  for (let index = 0; index < plan.requiredHoldoutIds.length; index += 1) {
    const id = nonEmptyString(plan.requiredHoldoutIds[index], `$.plan.requiredHoldoutIds[${index}]`);
    if (seen.has(id)) {
      fail('DUPLICATE_REQUIRED_HOLDOUT_ID', `$.plan.requiredHoldoutIds[${index}]`, `duplicate required holdout ID: ${id}`);
    }
    seen.add(id);
    requiredHoldoutIds.push(id);
  }
  if (plan.propagationEquation !== 'Y_EQUALS_FACTOR_TIMES_DETERMINISTIC_MODEL_PLUS_ADDITIVE_DISCREPANCY') {
    fail('UNSUPPORTED_PROPAGATION_EQUATION', '$.plan.propagationEquation', 'unsupported propagation equation');
  }
  if (plan.factorDiscrepancyDependence !== 'INDEPENDENT_REFERENCE_ONLY') {
    fail('UNSUPPORTED_FACTOR_DISCREPANCY_DEPENDENCE', '$.plan.factorDiscrepancyDependence', 'only the frozen independent reference dependence is qualified');
  }
  const covariance = finiteNumber(plan.factorDiscrepancyCovariance, '$.plan.factorDiscrepancyCovariance');
  if (covariance !== 0) {
    fail('UNSUPPORTED_FACTOR_DISCREPANCY_COVARIANCE', '$.plan.factorDiscrepancyCovariance', 'nonzero factor/discrepancy covariance has no qualified oracle in this case');
  }
  if (plan.intervalConstruction !== 'CENTRAL_TWO_SIDED_NORMAL_REFERENCE') {
    fail('UNSUPPORTED_INTERVAL_CONSTRUCTION', '$.plan.intervalConstruction', 'unsupported interval construction');
  }
  const nominalIntervalLevel = finiteNumber(plan.nominalIntervalLevel, '$.plan.nominalIntervalLevel');
  if (!(nominalIntervalLevel > 0 && nominalIntervalLevel < 1)) {
    fail('INVALID_NOMINAL_INTERVAL_LEVEL', '$.plan.nominalIntervalLevel', 'nominal interval level must lie in (0,1)');
  }
  if (nominalIntervalLevel !== 0.95) {
    fail('UNSUPPORTED_NOMINAL_INTERVAL_LEVEL', '$.plan.nominalIntervalLevel', 'only the frozen 0.95 reference interval is qualified');
  }
  const normalQuantileZ = finiteNumber(plan.normalQuantileZ, '$.plan.normalQuantileZ');
  if (!(normalQuantileZ > 0)) {
    fail('INVALID_NORMAL_QUANTILE', '$.plan.normalQuantileZ', 'normal quantile must be positive');
  }
  if (normalQuantileZ !== 1.959963984540054) {
    fail('UNSUPPORTED_NORMAL_QUANTILE', '$.plan.normalQuantileZ', 'normal quantile changed from frozen z_0.975');
  }
  if (plan.standardizedResidualConvention !== 'TEST_MINUS_MEAN_OVER_COMBINED_SD') {
    fail('UNSUPPORTED_STANDARDIZED_RESIDUAL_CONVENTION', '$.plan.standardizedResidualConvention', 'unsupported standardized-residual convention');
  }
  if (plan.holdoutDerivedFactorParametersAuthorized !== false) {
    fail('HOLDOUT_DERIVED_FACTOR_PARAMETERS_FORBIDDEN', '$.plan.holdoutDerivedFactorParametersAuthorized', 'holdout-derived factor parameters are forbidden');
  }
  if (plan.holdoutDerivedDiscrepancyParametersAuthorized !== false) {
    fail('HOLDOUT_DERIVED_DISCREPANCY_PARAMETERS_FORBIDDEN', '$.plan.holdoutDerivedDiscrepancyParametersAuthorized', 'holdout-derived discrepancy parameters are forbidden');
  }
  return { unit, requiredHoldoutIds, nominalIntervalLevel, normalQuantileZ, covariance };
}

function validateObservation(observation, id, expectedUnit, path, seenProvenance) {
  if (!observation || typeof observation !== 'object') {
    fail('MISSING_OBSERVATION', path, 'observation object is required');
  }
  const pairId = nonEmptyString(observation.pairId, `${path}.pairId`);
  if (pairId !== id) {
    fail('PAIR_BINDING_MISMATCH', `${path}.pairId`, `observation pairId ${pairId} does not match ${id}`);
  }
  const value = finiteNumber(observation.value, `${path}.value`);
  const unit = nonEmptyString(observation.unit, `${path}.unit`);
  if (unit !== expectedUnit) {
    fail('UNIT_MISMATCH', `${path}.unit`, `observation unit ${unit} does not match ${expectedUnit}`);
  }
  const provenance = nonEmptyString(observation.provenance, `${path}.provenance`);
  if (seenProvenance.has(provenance)) {
    fail('DUPLICATE_PROVENANCE', `${path}.provenance`, `duplicate provenance token: ${provenance}`);
  }
  seenProvenance.add(provenance);
  return { pairId, value, unit, provenance };
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function runModelDiscrepancyReference({ factorDistribution, discrepancyDistribution, holdoutPairs, plan, authority }) {
  validateAuthority(authority);
  const factor = validateNormalDistribution(
    factorDistribution,
    '$.factorDistribution',
    'SYNTHETIC_REFERENCE_INDEPENDENT_FREEZE',
    'FACTOR',
  );
  const discrepancy = validateNormalDistribution(
    discrepancyDistribution,
    '$.discrepancyDistribution',
    'SYNTHETIC_REFERENCE_INDEPENDENT_DISCREPANCY_FREEZE',
    'DISCREPANCY',
  );
  const validatedPlan = validatePlan(plan);

  if (!Array.isArray(holdoutPairs)) {
    fail('MISSING_HOLDOUT_PAIRS', '$.holdoutPairs', 'holdoutPairs must be an array');
  }
  const requiredSet = new Set(validatedPlan.requiredHoldoutIds);
  const seenIds = new Set();
  const seenProvenance = new Set();
  const byId = new Map();

  for (let index = 0; index < holdoutPairs.length; index += 1) {
    const pair = holdoutPairs[index];
    if (!pair || typeof pair !== 'object') {
      fail('MISSING_HOLDOUT_PAIR', `$.holdoutPairs[${index}]`, 'holdout pair object is required');
    }
    const id = nonEmptyString(pair.id, `$.holdoutPairs[${index}].id`);
    if (seenIds.has(id)) {
      fail('DUPLICATE_HOLDOUT_ID', `$.holdoutPairs[${index}].id`, `duplicate holdout ID: ${id}`);
    }
    if (!requiredSet.has(id)) {
      fail('UNEXPECTED_HOLDOUT_ID', `$.holdoutPairs[${index}].id`, `unexpected holdout ID: ${id}`);
    }
    seenIds.add(id);
    const model = validateObservation(pair.model, id, validatedPlan.unit, `$.holdoutPairs[${index}].model`, seenProvenance);
    const test = validateObservation(pair.test, id, validatedPlan.unit, `$.holdoutPairs[${index}].test`, seenProvenance);
    byId.set(id, { id, model, test });
  }

  for (const id of validatedPlan.requiredHoldoutIds) {
    if (!seenIds.has(id)) {
      fail('MISSING_HOLDOUT_ID', '$.holdoutPairs', `missing required holdout ID: ${id}`);
    }
  }
  if (seenIds.size !== validatedPlan.requiredHoldoutIds.length) {
    fail('UNEXPECTED_HOLDOUT_COUNT', '$.holdoutPairs', 'holdout pair count must match required IDs exactly');
  }

  const canonicalPairs = validatedPlan.requiredHoldoutIds.map((id) => byId.get(id));
  const factorVarianceContributions = [];
  const discrepancyVarianceContributions = [];
  const combinedVariances = [];
  const propagatedMeans = [];
  const propagatedStandardDeviations = [];
  const lowerBounds = [];
  const upperBounds = [];
  const standardizedResiduals = [];
  const standardizedResidualApplicability = [];
  const coverageIndicators = [];

  for (const pair of canonicalPairs) {
    const factorVariance = (pair.model.value ** 2) * (factor.standardDeviation ** 2);
    const discrepancyVariance = discrepancy.standardDeviation ** 2;
    const combinedVariance = factorVariance + discrepancyVariance + (2 * pair.model.value * validatedPlan.covariance);
    if (combinedVariance < 0) {
      fail('NEGATIVE_COMBINED_VARIANCE', '$.plan.factorDiscrepancyCovariance', 'combined variance cannot be negative');
    }
    const propagatedMean = (factor.mean * pair.model.value) + discrepancy.mean;
    const propagatedStandardDeviation = Math.sqrt(combinedVariance);
    const halfWidth = validatedPlan.normalQuantileZ * propagatedStandardDeviation;
    const lower = propagatedMean - halfWidth;
    const upper = propagatedMean + halfWidth;

    factorVarianceContributions.push(factorVariance);
    discrepancyVarianceContributions.push(discrepancyVariance);
    combinedVariances.push(combinedVariance);
    propagatedMeans.push(propagatedMean);
    propagatedStandardDeviations.push(propagatedStandardDeviation);
    lowerBounds.push(lower);
    upperBounds.push(upper);
    coverageIndicators.push(pair.test.value >= lower && pair.test.value <= upper);

    if (propagatedStandardDeviation === 0) {
      standardizedResiduals.push(null);
      standardizedResidualApplicability.push('NOT_APPLICABLE_ZERO_COMBINED_UNCERTAINTY');
    } else {
      standardizedResiduals.push((pair.test.value - propagatedMean) / propagatedStandardDeviation);
      standardizedResidualApplicability.push('APPLICABLE');
    }
  }

  return {
    unit: validatedPlan.unit,
    canonicalHoldoutIds: [...validatedPlan.requiredHoldoutIds],
    factorDistribution: { ...factor },
    discrepancyDistribution: { ...discrepancy },
    factorDiscrepancyDependence: plan.factorDiscrepancyDependence,
    factorDiscrepancyCovariance: validatedPlan.covariance,
    factorVarianceContributions,
    discrepancyVarianceContributions,
    combinedVariances,
    propagatedMeans,
    propagatedStandardDeviations,
    lowerBounds,
    upperBounds,
    standardizedResiduals,
    standardizedResidualApplicability,
    coverageIndicators,
    observedDiagnosticCoverageFraction: mean(coverageIndicators.map((value) => (value ? 1 : 0))),
    intervalConstruction: plan.intervalConstruction,
    nominalIntervalLevel: validatedPlan.nominalIntervalLevel,
    normalQuantileZ: validatedPlan.normalQuantileZ,
    standardizedResidualConvention: plan.standardizedResidualConvention,
  };
}

export function authorityFromReferenceCase(referenceCase) {
  return {
    referenceModelDiscrepancyExecutionAuthorized: referenceCase.referenceModelDiscrepancyExecutionAuthorized,
    productionModelDiscrepancyAuthorized: referenceCase.productionModelDiscrepancyAuthorized,
    productionCalibrationFactorAuthorized: referenceCase.productionCalibrationFactorAuthorized,
    productionStatisticalExecutionAuthorized: referenceCase.productionStatisticalExecutionAuthorized,
    activeProductionNumericStochasticSourceCount: referenceCase.activeProductionNumericStochasticSourceCount,
    productionSensitivityAuthorized: referenceCase.productionSensitivityAuthorized,
    productionValidationAcceptanceAuthorized: referenceCase.productionValidationAcceptanceAuthorized,
    productionReliabilityTargetAuthority: referenceCase.productionReliabilityTargetAuthority,
    b03ActivationAuthorized: referenceCase.b03ActivationAuthorized,
    programReleaseAuthority: referenceCase.programReleaseAuthority,
    programTemperatureAuthority: referenceCase.programTemperatureAuthority,
  };
}
