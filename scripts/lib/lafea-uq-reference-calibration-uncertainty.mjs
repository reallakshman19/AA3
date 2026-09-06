export class CalibrationUncertaintyError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'CalibrationUncertaintyError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new CalibrationUncertaintyError(code, path, message);
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
  if (authority.referenceCalibrationUncertaintyExecutionAuthorized !== true) {
    fail('REFERENCE_AUTHORITY_REQUIRED', '$.authority.referenceCalibrationUncertaintyExecutionAuthorized', 'reference calibration uncertainty execution must be explicitly authorized');
  }
  const falseFields = [
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

function validateFactorDistribution(factor) {
  if (!factor || typeof factor !== 'object') {
    fail('MISSING_FACTOR_DISTRIBUTION', '$.factorDistribution', 'factor distribution is required');
  }
  if (factor.family !== 'NORMAL') {
    fail('UNSUPPORTED_FACTOR_DISTRIBUTION', '$.factorDistribution.family', 'only NORMAL is qualified');
  }
  const mean = finiteNumber(factor.mean, '$.factorDistribution.mean');
  const standardDeviation = finiteNumber(factor.standardDeviation, '$.factorDistribution.standardDeviation');
  if (standardDeviation < 0) {
    fail('NEGATIVE_FACTOR_STANDARD_DEVIATION', '$.factorDistribution.standardDeviation', 'factor standard deviation must be nonnegative');
  }
  const expectedSource = 'SYNTHETIC_REFERENCE_INDEPENDENT_FREEZE';
  if (factor.meanSource !== expectedSource) {
    fail('UNSUPPORTED_FACTOR_MEAN_SOURCE', '$.factorDistribution.meanSource', 'factor mean source must remain the independent synthetic freeze');
  }
  if (factor.standardDeviationSource !== expectedSource) {
    fail('UNSUPPORTED_FACTOR_STANDARD_DEVIATION_SOURCE', '$.factorDistribution.standardDeviationSource', 'factor standard-deviation source must remain the independent synthetic freeze');
  }
  return { family: factor.family, mean, standardDeviation, meanSource: factor.meanSource, standardDeviationSource: factor.standardDeviationSource };
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
  if (plan.propagationEquation !== 'Y_EQUALS_FACTOR_TIMES_DETERMINISTIC_MODEL') {
    fail('UNSUPPORTED_PROPAGATION_EQUATION', '$.plan.propagationEquation', 'only Y=factor*deterministic-model is qualified');
  }
  if (plan.intervalConstruction !== 'CENTRAL_TWO_SIDED_NORMAL_REFERENCE') {
    fail('UNSUPPORTED_INTERVAL_CONSTRUCTION', '$.plan.intervalConstruction', 'only the frozen central two-sided normal reference interval is qualified');
  }
  const nominalIntervalLevel = finiteNumber(plan.nominalIntervalLevel, '$.plan.nominalIntervalLevel');
  if (!(nominalIntervalLevel > 0 && nominalIntervalLevel < 1)) {
    fail('INVALID_NOMINAL_INTERVAL_LEVEL', '$.plan.nominalIntervalLevel', 'nominal interval level must lie in (0,1)');
  }
  if (nominalIntervalLevel !== 0.95) {
    fail('UNSUPPORTED_NOMINAL_INTERVAL_LEVEL', '$.plan.nominalIntervalLevel', 'only the frozen 0.95 reference interval level is qualified');
  }
  const normalQuantileZ = finiteNumber(plan.normalQuantileZ, '$.plan.normalQuantileZ');
  if (!(normalQuantileZ > 0)) {
    fail('INVALID_NORMAL_QUANTILE', '$.plan.normalQuantileZ', 'normal quantile must be positive');
  }
  if (normalQuantileZ !== 1.959963984540054) {
    fail('UNSUPPORTED_NORMAL_QUANTILE', '$.plan.normalQuantileZ', 'normal quantile must remain the frozen z_0.975 value');
  }
  if (plan.standardizedResidualConvention !== 'TEST_MINUS_MEAN_OVER_PROPAGATED_SD') {
    fail('UNSUPPORTED_STANDARDIZED_RESIDUAL_CONVENTION', '$.plan.standardizedResidualConvention', 'unsupported standardized-residual convention');
  }
  if (plan.holdoutDerivedFactorParametersAuthorized !== false) {
    fail('HOLDOUT_DERIVED_FACTOR_PARAMETERS_FORBIDDEN', '$.plan.holdoutDerivedFactorParametersAuthorized', 'holdout-derived factor parameters are forbidden');
  }
  return { unit, requiredHoldoutIds, nominalIntervalLevel, normalQuantileZ };
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

export function runCalibrationUncertaintyReference({ factorDistribution, holdoutPairs, plan, authority }) {
  validateAuthority(authority);
  const factor = validateFactorDistribution(factorDistribution);
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
  const propagatedMeans = [];
  const propagatedStandardDeviations = [];
  const lowerBounds = [];
  const upperBounds = [];
  const standardizedResiduals = [];
  const standardizedResidualApplicability = [];
  const coverageIndicators = [];

  for (const pair of canonicalPairs) {
    const propagatedMean = factor.mean * pair.model.value;
    const propagatedStandardDeviation = Math.abs(pair.model.value) * factor.standardDeviation;
    const halfWidth = validatedPlan.normalQuantileZ * propagatedStandardDeviation;
    const lower = propagatedMean - halfWidth;
    const upper = propagatedMean + halfWidth;

    propagatedMeans.push(propagatedMean);
    propagatedStandardDeviations.push(propagatedStandardDeviation);
    lowerBounds.push(lower);
    upperBounds.push(upper);
    coverageIndicators.push(pair.test.value >= lower && pair.test.value <= upper);

    if (propagatedStandardDeviation === 0) {
      standardizedResiduals.push(null);
      standardizedResidualApplicability.push('NOT_APPLICABLE_ZERO_FACTOR_UNCERTAINTY');
    } else {
      standardizedResiduals.push((pair.test.value - propagatedMean) / propagatedStandardDeviation);
      standardizedResidualApplicability.push('APPLICABLE');
    }
  }

  return {
    unit: validatedPlan.unit,
    canonicalHoldoutIds: [...validatedPlan.requiredHoldoutIds],
    factorDistribution: { ...factor },
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
    referenceCalibrationUncertaintyExecutionAuthorized: referenceCase.referenceCalibrationUncertaintyExecutionAuthorized,
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
