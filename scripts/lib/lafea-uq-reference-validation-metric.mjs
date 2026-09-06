export class ValidationMetricError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'ValidationMetricError';
    this.code = code;
    this.path = path;
  }
}

const REQUIRED_ROLES = [
  'TEST_MEASUREMENT',
  'NUMERICAL',
  'INPUT_PROPAGATION',
  'MODEL_FORM',
];

const fail = (code, path, message) => {
  throw new ValidationMetricError(code, path, message);
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
  if (authority.referenceValidationMetricExecutionAuthorized !== true) {
    fail('REFERENCE_AUTHORITY_REQUIRED', '$.authority.referenceValidationMetricExecutionAuthorized', 'reference execution must be explicitly authorized');
  }
  if (authority.productionStatisticalExecutionAuthorized !== false) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.productionStatisticalExecutionAuthorized', 'production statistical execution must remain false');
  }
  if (authority.activeProductionNumericStochasticSourceCount !== 0) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.activeProductionNumericStochasticSourceCount', 'active production stochastic-source count must remain zero');
  }
  if (authority.productionSensitivityAuthorized !== false) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.productionSensitivityAuthorized', 'production sensitivity must remain unauthorized');
  }
  if (authority.productionValidationAcceptanceAuthorized !== false) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.productionValidationAcceptanceAuthorized', 'production validation acceptance must remain unauthorized');
  }
  if (authority.productionReliabilityTargetAuthority !== 'NONE') {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.productionReliabilityTargetAuthority', 'production reliability-target authority must remain NONE');
  }
  if (authority.b03ActivationAuthorized !== false) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.b03ActivationAuthorized', 'B03 activation must remain false');
  }
  if (authority.programReleaseAuthority !== false) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.programReleaseAuthority', 'program release authority must remain false');
  }
  if (authority.programTemperatureAuthority !== false) {
    fail('PRODUCTION_AUTHORITY_LEAKAGE', '$.authority.programTemperatureAuthority', 'program temperature authority must remain false');
  }
}

function validateScalarValue(valueSpec, path) {
  if (!valueSpec || typeof valueSpec !== 'object') {
    fail('MISSING_SCALAR_VALUE', path, 'scalar value specification is required');
  }
  const value = finiteNumber(valueSpec.value, `${path}.value`);
  const unit = nonEmptyString(valueSpec.unit, `${path}.unit`);
  return { value, unit };
}

export function normalizeUncertaintyComponent(component, expectedUnit, path = '$.component') {
  if (!component || typeof component !== 'object') {
    fail('MISSING_UNCERTAINTY_COMPONENT', path, 'uncertainty component is required');
  }
  const id = nonEmptyString(component.id, `${path}.id`);
  const role = nonEmptyString(component.role, `${path}.role`);
  if (!REQUIRED_ROLES.includes(role)) {
    fail('UNSUPPORTED_COMPONENT_ROLE', `${path}.role`, `unsupported uncertainty role: ${role}`);
  }
  const unit = nonEmptyString(component.unit, `${path}.unit`);
  if (unit !== expectedUnit) {
    fail('UNIT_MISMATCH', `${path}.unit`, `uncertainty unit ${unit} does not match ${expectedUnit}`);
  }
  const varianceContributionKey = nonEmptyString(component.varianceContributionKey, `${path}.varianceContributionKey`);
  const basis = nonEmptyString(component.basis, `${path}.basis`);
  const value = finiteNumber(component.value, `${path}.value`);
  if (value < 0) {
    fail('NEGATIVE_UNCERTAINTY', `${path}.value`, 'uncertainty magnitude must not be negative');
  }

  if (basis === 'STANDARD') {
    return {
      id,
      role,
      unit,
      basis,
      varianceContributionKey,
      standardUncertainty: value,
      originalExpandedUncertainty: null,
      coverageFactorK: null,
      coverageStatement: null,
    };
  }

  if (basis === 'EXPANDED') {
    const coverageFactorK = finiteNumber(component.coverageFactorK, `${path}.coverageFactorK`);
    if (!(coverageFactorK > 0)) {
      fail('INVALID_COVERAGE_FACTOR', `${path}.coverageFactorK`, 'coverage factor k must be positive');
    }
    const coverageStatement = nonEmptyString(component.coverageStatement, `${path}.coverageStatement`);
    return {
      id,
      role,
      unit,
      basis,
      varianceContributionKey,
      standardUncertainty: value / coverageFactorK,
      originalExpandedUncertainty: value,
      coverageFactorK,
      coverageStatement,
    };
  }

  fail('UNSUPPORTED_UNCERTAINTY_BASIS', `${path}.basis`, `unsupported uncertainty basis: ${basis}`);
}

export function aggregateValidationMetric({ modelValue, testValue, components, authority }) {
  validateAuthority(authority);
  const model = validateScalarValue(modelValue, '$.modelValue');
  const test = validateScalarValue(testValue, '$.testValue');
  if (model.unit !== test.unit) {
    fail('UNIT_MISMATCH', '$.testValue.unit', `test unit ${test.unit} does not match model unit ${model.unit}`);
  }
  if (!Array.isArray(components)) {
    fail('MISSING_UNCERTAINTY_COMPONENTS', '$.components', 'components must be an array');
  }

  const normalized = [];
  const seenRoles = new Set();
  const seenVarianceKeys = new Set();
  for (let index = 0; index < components.length; index += 1) {
    const item = normalizeUncertaintyComponent(components[index], model.unit, `$.components[${index}]`);
    if (seenRoles.has(item.role)) {
      fail('DUPLICATE_COMPONENT_ROLE', `$.components[${index}].role`, `duplicate uncertainty role: ${item.role}`);
    }
    if (seenVarianceKeys.has(item.varianceContributionKey)) {
      fail('DUPLICATE_VARIANCE_CONTRIBUTION', `$.components[${index}].varianceContributionKey`, `duplicate variance contribution: ${item.varianceContributionKey}`);
    }
    seenRoles.add(item.role);
    seenVarianceKeys.add(item.varianceContributionKey);
    normalized.push(item);
  }

  for (const role of REQUIRED_ROLES) {
    if (!seenRoles.has(role)) {
      fail('MISSING_COMPONENT_ROLE', '$.components', `missing uncertainty role: ${role}`);
    }
  }
  if (normalized.length !== REQUIRED_ROLES.length) {
    fail('UNEXPECTED_COMPONENT_COUNT', '$.components', `expected exactly ${REQUIRED_ROLES.length} uncertainty components`);
  }

  const signedError = model.value - test.value;
  const varianceSum = normalized.reduce(
    (sum, item) => sum + item.standardUncertainty * item.standardUncertainty,
    0,
  );
  const validationStandardUncertainty = Math.sqrt(varianceSum);

  if (validationStandardUncertainty === 0) {
    return {
      unit: model.unit,
      signedError,
      varianceSum,
      validationStandardUncertainty: 0,
      normalizedAbsoluteErrorZ: null,
      zApplicability: 'NOT_APPLICABLE_ZERO_UNCERTAINTY',
      normalizedComponents: normalized,
    };
  }

  return {
    unit: model.unit,
    signedError,
    varianceSum,
    validationStandardUncertainty,
    normalizedAbsoluteErrorZ: Math.abs(signedError) / validationStandardUncertainty,
    zApplicability: 'APPLICABLE',
    normalizedComponents: normalized,
  };
}

export function authorityFromReferenceCase(referenceCase) {
  return {
    referenceValidationMetricExecutionAuthorized: referenceCase.referenceValidationMetricExecutionAuthorized,
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
