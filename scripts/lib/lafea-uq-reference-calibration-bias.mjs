export class CalibrationBiasError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'CalibrationBiasError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new CalibrationBiasError(code, path, message);
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
  if (authority.referenceCalibrationBiasExecutionAuthorized !== true) {
    fail('REFERENCE_AUTHORITY_REQUIRED', '$.authority.referenceCalibrationBiasExecutionAuthorized', 'reference calibration/bias execution must be explicitly authorized');
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

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') {
    fail('MISSING_PLAN', '$.plan', 'calibration plan is required');
  }
  const unit = nonEmptyString(plan.unit, '$.plan.unit');
  if (!Array.isArray(plan.requiredPairIds) || plan.requiredPairIds.length < 2) {
    fail('INVALID_REQUIRED_PAIR_IDS', '$.plan.requiredPairIds', 'at least two required pair IDs are needed');
  }
  const requiredPairIds = [];
  const seen = new Set();
  for (let index = 0; index < plan.requiredPairIds.length; index += 1) {
    const id = nonEmptyString(plan.requiredPairIds[index], `$.plan.requiredPairIds[${index}]`);
    if (seen.has(id)) {
      fail('DUPLICATE_REQUIRED_PAIR_ID', `$.plan.requiredPairIds[${index}]`, `duplicate required pair ID: ${id}`);
    }
    seen.add(id);
    requiredPairIds.push(id);
  }
  if (plan.ratioOrientation !== 'TEST_OVER_MODEL') {
    fail('UNSUPPORTED_RATIO_ORIENTATION', '$.plan.ratioOrientation', 'only TEST_OVER_MODEL is qualified');
  }
  if (plan.biasEstimator !== 'ARITHMETIC_MEAN_OF_PAIR_RATIOS') {
    fail('UNSUPPORTED_BIAS_ESTIMATOR', '$.plan.biasEstimator', 'only arithmetic mean of pair ratios is qualified');
  }
  if (plan.scatterConvention !== 'SAMPLE_STANDARD_DEVIATION_N_MINUS_1') {
    fail('UNSUPPORTED_SCATTER_CONVENTION', '$.plan.scatterConvention', 'only N-1 sample standard deviation is qualified');
  }
  if (plan.scatterDenominator !== 'N_MINUS_1') {
    fail('SCATTER_DENOMINATOR_MISMATCH', '$.plan.scatterDenominator', 'selected scatter denominator must remain N_MINUS_1');
  }
  if (plan.residualSign !== 'TEST_MINUS_CALIBRATED_MODEL') {
    fail('UNSUPPORTED_RESIDUAL_SIGN', '$.plan.residualSign', 'only TEST_MINUS_CALIBRATED_MODEL is qualified');
  }
  return { unit, requiredPairIds };
}

function validateObservation(observation, pairId, expectedUnit, path, seenProvenance) {
  if (!observation || typeof observation !== 'object') {
    fail('MISSING_OBSERVATION', path, 'observation object is required');
  }
  const observationPairId = nonEmptyString(observation.pairId, `${path}.pairId`);
  if (observationPairId !== pairId) {
    fail('PAIR_BINDING_MISMATCH', `${path}.pairId`, `observation pairId ${observationPairId} does not match ${pairId}`);
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
  return { pairId: observationPairId, value, unit, provenance };
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const rmse = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);

export function runCalibrationBiasReference({ pairs, plan, authority }) {
  validateAuthority(authority);
  const validatedPlan = validatePlan(plan);

  if (!Array.isArray(pairs)) {
    fail('MISSING_PAIRS', '$.pairs', 'pairs must be an array');
  }
  if (pairs.length < 2) {
    fail('INSUFFICIENT_SAMPLE_COUNT', '$.pairs', 'at least two pairs are required for N-1 sample scatter');
  }

  const requiredSet = new Set(validatedPlan.requiredPairIds);
  const seenPairIds = new Set();
  const seenProvenance = new Set();
  const byId = new Map();

  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index];
    if (!pair || typeof pair !== 'object') {
      fail('MISSING_PAIR', `$.pairs[${index}]`, 'pair object is required');
    }
    const id = nonEmptyString(pair.id, `$.pairs[${index}].id`);
    if (seenPairIds.has(id)) {
      fail('DUPLICATE_PAIR_ID', `$.pairs[${index}].id`, `duplicate pair ID: ${id}`);
    }
    if (!requiredSet.has(id)) {
      fail('UNEXPECTED_PAIR_ID', `$.pairs[${index}].id`, `unexpected pair ID: ${id}`);
    }
    seenPairIds.add(id);

    const model = validateObservation(pair.model, id, validatedPlan.unit, `$.pairs[${index}].model`, seenProvenance);
    const test = validateObservation(pair.test, id, validatedPlan.unit, `$.pairs[${index}].test`, seenProvenance);
    if (model.value === 0) {
      fail('ZERO_MODEL_DENOMINATOR', `$.pairs[${index}].model.value`, 'model value must be nonzero for TEST_OVER_MODEL ratio');
    }
    byId.set(id, { id, model, test });
  }

  for (const id of validatedPlan.requiredPairIds) {
    if (!seenPairIds.has(id)) {
      fail('MISSING_PAIR_ID', '$.pairs', `missing required pair ID: ${id}`);
    }
  }
  if (seenPairIds.size !== validatedPlan.requiredPairIds.length) {
    fail('UNEXPECTED_PAIR_COUNT', '$.pairs', 'pair count must match required pair IDs exactly');
  }

  const canonicalPairs = validatedPlan.requiredPairIds.map((id) => byId.get(id));
  const ratios = canonicalPairs.map((pair) => pair.test.value / pair.model.value);
  const biasFactor = mean(ratios);
  const centeredSquareSum = ratios.reduce((sum, value) => {
    const delta = value - biasFactor;
    return sum + delta * delta;
  }, 0);
  const selectedSampleRatioStandardDeviation = Math.sqrt(centeredSquareSum / (ratios.length - 1));
  const populationRatioStandardDeviationCrosscheck = Math.sqrt(centeredSquareSum / ratios.length);
  const rawResiduals = canonicalPairs.map((pair) => pair.test.value - pair.model.value);
  const calibratedModelValues = canonicalPairs.map((pair) => biasFactor * pair.model.value);
  const calibratedResiduals = canonicalPairs.map((pair, index) => pair.test.value - calibratedModelValues[index]);

  return {
    unit: validatedPlan.unit,
    canonicalPairIds: [...validatedPlan.requiredPairIds],
    ratios,
    biasFactor,
    selectedSampleRatioStandardDeviation,
    populationRatioStandardDeviationCrosscheck,
    calibratedModelValues,
    rawResiduals,
    calibratedResiduals,
    rawResidualRmse: rmse(rawResiduals),
    calibratedResidualRmse: rmse(calibratedResiduals),
    ratioOrientation: plan.ratioOrientation,
    biasEstimator: plan.biasEstimator,
    scatterConvention: plan.scatterConvention,
    scatterDenominator: plan.scatterDenominator,
    residualSign: plan.residualSign,
  };
}

export function authorityFromReferenceCase(referenceCase) {
  return {
    referenceCalibrationBiasExecutionAuthorized: referenceCase.referenceCalibrationBiasExecutionAuthorized,
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
