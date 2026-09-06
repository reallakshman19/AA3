import {
  CalibrationBiasError,
  runCalibrationBiasReference,
} from './lafea-uq-reference-calibration-bias.mjs';

export class CalibrationHoldoutError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'CalibrationHoldoutError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, path, message) => {
  throw new CalibrationHoldoutError(code, path, message);
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

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const rmse = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);

function validateAuthority(authority) {
  if (!authority || typeof authority !== 'object') {
    fail('MISSING_AUTHORITY', '$.authority', 'authority metadata is required');
  }
  if (authority.referenceCalibrationHoldoutExecutionAuthorized !== true) {
    fail('REFERENCE_AUTHORITY_REQUIRED', '$.authority.referenceCalibrationHoldoutExecutionAuthorized', 'reference calibration holdout execution must be explicitly authorized');
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

function uniqueIds(values, path) {
  if (!Array.isArray(values) || values.length === 0) {
    fail('INVALID_REQUIRED_PAIR_IDS', path, 'required pair IDs must be a non-empty array');
  }
  const ids = [];
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    const id = nonEmptyString(values[index], `${path}[${index}]`);
    if (seen.has(id)) {
      fail('DUPLICATE_REQUIRED_PAIR_ID', `${path}[${index}]`, `duplicate required pair ID: ${id}`);
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') {
    fail('MISSING_PLAN', '$.plan', 'holdout plan is required');
  }
  const unit = nonEmptyString(plan.unit, '$.plan.unit');
  const calibrationRequiredPairIds = uniqueIds(plan.calibrationRequiredPairIds, '$.plan.calibrationRequiredPairIds');
  const holdoutRequiredPairIds = uniqueIds(plan.holdoutRequiredPairIds, '$.plan.holdoutRequiredPairIds');
  if (calibrationRequiredPairIds.length < 2) {
    fail('INSUFFICIENT_CALIBRATION_SAMPLE_COUNT', '$.plan.calibrationRequiredPairIds', 'at least two calibration pairs are required');
  }
  const calibrationSet = new Set(calibrationRequiredPairIds);
  for (const id of holdoutRequiredPairIds) {
    if (calibrationSet.has(id)) {
      fail('SPLIT_ID_OVERLAP', '$.plan.holdoutRequiredPairIds', `pair ID appears in both calibration and holdout splits: ${id}`);
    }
  }
  if (plan.calibrationSplitLabel !== 'CALIBRATION') {
    fail('UNSUPPORTED_SPLIT_LABEL', '$.plan.calibrationSplitLabel', 'calibration split label must remain CALIBRATION');
  }
  if (plan.holdoutSplitLabel !== 'HOLDOUT') {
    fail('UNSUPPORTED_SPLIT_LABEL', '$.plan.holdoutSplitLabel', 'holdout split label must remain HOLDOUT');
  }
  if (plan.ratioOrientation !== 'TEST_OVER_MODEL') {
    fail('UNSUPPORTED_RATIO_ORIENTATION', '$.plan.ratioOrientation', 'only TEST_OVER_MODEL is qualified');
  }
  if (plan.biasEstimator !== 'ARITHMETIC_MEAN_OF_PAIR_RATIOS') {
    fail('UNSUPPORTED_BIAS_ESTIMATOR', '$.plan.biasEstimator', 'only arithmetic mean of calibration pair ratios is qualified');
  }
  if (plan.factorSource !== 'CALIBRATION_SPLIT_ONLY') {
    fail('INVALID_FACTOR_SOURCE', '$.plan.factorSource', 'factor source must remain CALIBRATION_SPLIT_ONLY');
  }
  if (plan.holdoutRefitAuthorized !== false) {
    fail('HOLDOUT_REFIT_FORBIDDEN', '$.plan.holdoutRefitAuthorized', 'holdout refit/re-estimation is forbidden');
  }
  if (plan.rawResidualSign !== 'TEST_MINUS_MODEL') {
    fail('UNSUPPORTED_RESIDUAL_SIGN', '$.plan.rawResidualSign', 'raw residual sign must remain TEST_MINUS_MODEL');
  }
  if (plan.holdoutResidualSign !== 'TEST_MINUS_CALIBRATED_MODEL') {
    fail('UNSUPPORTED_RESIDUAL_SIGN', '$.plan.holdoutResidualSign', 'holdout residual sign must remain TEST_MINUS_CALIBRATED_MODEL');
  }
  if (plan.rmseConvention !== 'ROOT_MEAN_SQUARE_POPULATION_N') {
    fail('UNSUPPORTED_RMSE_CONVENTION', '$.plan.rmseConvention', 'RMSE convention must remain ROOT_MEAN_SQUARE_POPULATION_N');
  }
  return { unit, calibrationRequiredPairIds, holdoutRequiredPairIds };
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
    fail('DUPLICATE_PROVENANCE', `${path}.provenance`, `duplicate provenance token across split inputs: ${provenance}`);
  }
  seenProvenance.add(provenance);
  return { pairId: observationPairId, value, unit, provenance };
}

function validateSplitPairs({ pairs, requiredIds, expectedSplit, expectedUnit, pathRoot, otherRequiredIds, seenProvenance }) {
  if (!Array.isArray(pairs)) {
    fail('MISSING_PAIRS', pathRoot, `${expectedSplit} pairs must be an array`);
  }
  const requiredSet = new Set(requiredIds);
  const otherSet = new Set(otherRequiredIds);
  const seenIds = new Set();
  const byId = new Map();

  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index];
    const pairPath = `${pathRoot}[${index}]`;
    if (!pair || typeof pair !== 'object') {
      fail('MISSING_PAIR', pairPath, 'pair object is required');
    }
    const id = nonEmptyString(pair.id, `${pairPath}.id`);
    if (seenIds.has(id)) {
      fail('DUPLICATE_PAIR_ID', `${pairPath}.id`, `duplicate pair ID in ${expectedSplit} split: ${id}`);
    }
    if (!requiredSet.has(id)) {
      if (otherSet.has(id)) {
        fail('SPLIT_MEMBERSHIP_MISMATCH', `${pairPath}.id`, `pair ${id} belongs to the opposite split`);
      }
      fail('UNEXPECTED_PAIR_ID', `${pairPath}.id`, `unexpected ${expectedSplit} pair ID: ${id}`);
    }
    seenIds.add(id);
    if (pair.split !== expectedSplit) {
      fail('SPLIT_LABEL_MISMATCH', `${pairPath}.split`, `pair ${id} must carry split label ${expectedSplit}`);
    }
    const model = validateObservation(pair.model, id, expectedUnit, `${pairPath}.model`, seenProvenance);
    const test = validateObservation(pair.test, id, expectedUnit, `${pairPath}.test`, seenProvenance);
    if (model.value === 0) {
      fail('ZERO_MODEL_DENOMINATOR', `${pairPath}.model.value`, 'model value must be nonzero for TEST_OVER_MODEL ratios');
    }
    byId.set(id, { id, split: expectedSplit, model, test });
  }

  for (const id of requiredIds) {
    if (!seenIds.has(id)) {
      fail('MISSING_PAIR_ID', pathRoot, `missing required ${expectedSplit} pair ID: ${id}`);
    }
  }
  if (seenIds.size !== requiredIds.length) {
    fail('UNEXPECTED_PAIR_COUNT', pathRoot, `${expectedSplit} pair count must match required IDs exactly`);
  }
  return requiredIds.map((id) => byId.get(id));
}

export function runCalibrationHoldoutReference({ calibrationPairs, holdoutPairs, plan, authority }) {
  validateAuthority(authority);
  const validatedPlan = validatePlan(plan);
  const seenProvenance = new Set();

  const canonicalCalibrationPairs = validateSplitPairs({
    pairs: calibrationPairs,
    requiredIds: validatedPlan.calibrationRequiredPairIds,
    expectedSplit: 'CALIBRATION',
    expectedUnit: validatedPlan.unit,
    pathRoot: '$.calibrationPairs',
    otherRequiredIds: validatedPlan.holdoutRequiredPairIds,
    seenProvenance,
  });
  const canonicalHoldoutPairs = validateSplitPairs({
    pairs: holdoutPairs,
    requiredIds: validatedPlan.holdoutRequiredPairIds,
    expectedSplit: 'HOLDOUT',
    expectedUnit: validatedPlan.unit,
    pathRoot: '$.holdoutPairs',
    otherRequiredIds: validatedPlan.calibrationRequiredPairIds,
    seenProvenance,
  });

  let calibration;
  try {
    calibration = runCalibrationBiasReference({
      pairs: canonicalCalibrationPairs,
      plan: {
        unit: validatedPlan.unit,
        requiredPairIds: validatedPlan.calibrationRequiredPairIds,
        ratioOrientation: plan.ratioOrientation,
        biasEstimator: plan.biasEstimator,
        scatterConvention: 'SAMPLE_STANDARD_DEVIATION_N_MINUS_1',
        scatterDenominator: 'N_MINUS_1',
        residualSign: 'TEST_MINUS_CALIBRATED_MODEL',
      },
      authority: {
        referenceCalibrationBiasExecutionAuthorized: true,
        productionCalibrationFactorAuthorized: authority.productionCalibrationFactorAuthorized,
        productionStatisticalExecutionAuthorized: authority.productionStatisticalExecutionAuthorized,
        activeProductionNumericStochasticSourceCount: authority.activeProductionNumericStochasticSourceCount,
        productionSensitivityAuthorized: authority.productionSensitivityAuthorized,
        productionValidationAcceptanceAuthorized: authority.productionValidationAcceptanceAuthorized,
        productionReliabilityTargetAuthority: authority.productionReliabilityTargetAuthority,
        b03ActivationAuthorized: authority.b03ActivationAuthorized,
        programReleaseAuthority: authority.programReleaseAuthority,
        programTemperatureAuthority: authority.programTemperatureAuthority,
      },
    });
  } catch (error) {
    if (error instanceof CalibrationBiasError) {
      fail(`CALIBRATION_${error.code}`, error.path, `calibration prerequisite rejected input: ${error.message}`);
    }
    throw error;
  }

  const biasFactor = calibration.biasFactor;
  const holdoutRatios = canonicalHoldoutPairs.map((pair) => pair.test.value / pair.model.value);
  const calibratedHoldoutModelValues = canonicalHoldoutPairs.map((pair) => biasFactor * pair.model.value);
  const rawHoldoutResiduals = canonicalHoldoutPairs.map((pair) => pair.test.value - pair.model.value);
  const calibratedHoldoutResiduals = canonicalHoldoutPairs.map((pair, index) => pair.test.value - calibratedHoldoutModelValues[index]);
  const rawHoldoutRmse = rmse(rawHoldoutResiduals);
  const calibratedHoldoutRmse = rmse(calibratedHoldoutResiduals);

  return {
    unit: validatedPlan.unit,
    calibrationPairIds: [...validatedPlan.calibrationRequiredPairIds],
    holdoutPairIds: [...validatedPlan.holdoutRequiredPairIds],
    calibrationRatios: [...calibration.ratios],
    calibrationBiasFactor: biasFactor,
    holdoutRatios,
    holdoutRatioMeanPostHocOnly: mean(holdoutRatios),
    calibratedHoldoutModelValues,
    rawHoldoutResiduals,
    calibratedHoldoutResiduals,
    rawHoldoutMeanSignedResidual: mean(rawHoldoutResiduals),
    calibratedHoldoutMeanSignedResidual: mean(calibratedHoldoutResiduals),
    rawHoldoutRmse,
    calibratedHoldoutRmse,
    calibratedToRawRmseRatio: calibratedHoldoutRmse / rawHoldoutRmse,
    factorSource: plan.factorSource,
    holdoutRefitAuthorized: plan.holdoutRefitAuthorized,
    ratioOrientation: plan.ratioOrientation,
    biasEstimator: plan.biasEstimator,
    rawResidualSign: plan.rawResidualSign,
    holdoutResidualSign: plan.holdoutResidualSign,
    rmseConvention: plan.rmseConvention,
  };
}

export function authorityFromReferenceCase(referenceCase) {
  return {
    referenceCalibrationHoldoutExecutionAuthorized: referenceCase.referenceCalibrationHoldoutExecutionAuthorized,
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
