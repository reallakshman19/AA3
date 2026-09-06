import { readFileSync } from 'node:fs';
import {
  ValidationMetricError,
  aggregateValidationMetric,
  authorityFromReferenceCase,
  normalizeUncertaintyComponent,
} from './lib/lafea-uq-reference-validation-metric.mjs';

const fixture = JSON.parse(readFileSync(
  new URL('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-VALIDATION-METRIC-01.json', import.meta.url),
  'utf8',
));

const clone = (value) => JSON.parse(JSON.stringify(value));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const nearlyEqual = (actual, expected, tolerance = 1e-12) => {
  const scale = Math.max(1, Math.abs(expected));
  return Math.abs(actual - expected) <= tolerance * scale;
};

assert(fixture.schema === 'lafea-uq-reference-validation-metric/v1', 'unexpected reference schema');
assert(fixture.issue === 1694, 'unexpected issue id');
assert(fixture.parentIssue === 1673, 'unexpected parent issue id');
assert(fixture.dependencyIssue === 1692, 'unexpected dependency issue id');
assert(fixture.caseId === 'UQ-REF-VALIDATION-METRIC-01', 'unexpected case id');
assert(fixture.scope === 'REFERENCE_BENCHMARK_ONLY', 'reference scope must remain isolated');
assert(fixture.universalZAcceptanceThreshold === null, 'universal z threshold must remain undefined');
assert(fixture.productionApplicabilityBlocker === 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED', 'production applicability blocker changed');

const authority = authorityFromReferenceCase(fixture);
const baseInput = () => ({
  modelValue: clone(fixture.positiveCase.modelValue),
  testValue: clone(fixture.positiveCase.testValue),
  components: clone(fixture.positiveCase.components),
  authority: clone(authority),
});

const positive = aggregateValidationMetric(baseInput());
const oracle = fixture.positiveCase.oracle;
assert(positive.unit === 'REFERENCE_QOI', 'positive unit mismatch');
assert(nearlyEqual(positive.signedError, oracle.signedError), 'signed-error oracle mismatch');
assert(nearlyEqual(positive.varianceSum, oracle.varianceSum), 'variance-sum oracle mismatch');
assert(nearlyEqual(positive.validationStandardUncertainty, oracle.validationStandardUncertainty), 'u_val oracle mismatch');
assert(nearlyEqual(positive.normalizedAbsoluteErrorZ, oracle.normalizedAbsoluteErrorZ), 'z oracle mismatch');
assert(positive.zApplicability === oracle.zApplicability, 'z applicability mismatch');

const expandedControl = fixture.expandedUncertaintyControl;
const normalizedExpanded = normalizeUncertaintyComponent(
  clone(expandedControl.component),
  'REFERENCE_QOI',
  '$.expandedUncertaintyControl.component',
);
assert(nearlyEqual(normalizedExpanded.standardUncertainty, expandedControl.expectedStandardUncertainty), 'expanded-to-standard conversion mismatch');
assert(nearlyEqual(normalizedExpanded.originalExpandedUncertainty, expandedControl.retainExpandedValue), 'expanded uncertainty provenance not retained');
assert(nearlyEqual(normalizedExpanded.coverageFactorK, expandedControl.retainCoverageFactorK), 'coverage factor provenance not retained');
assert(typeof normalizedExpanded.coverageStatement === 'string' && normalizedExpanded.coverageStatement.length > 0, 'coverage statement not retained');

const reversedInput = baseInput();
[reversedInput.modelValue, reversedInput.testValue] = [reversedInput.testValue, reversedInput.modelValue];
const reversed = aggregateValidationMetric(reversedInput);
assert(nearlyEqual(reversed.signedError, fixture.signReversalControl.expectedSignedError), 'sign-reversal signed error mismatch');
assert(nearlyEqual(reversed.normalizedAbsoluteErrorZ, fixture.signReversalControl.expectedNormalizedAbsoluteErrorZ), 'absolute z must be sign-invariant');

const zeroInput = baseInput();
zeroInput.components.forEach((component) => {
  component.basis = 'STANDARD';
  component.value = 0;
  delete component.coverageFactorK;
  delete component.coverageStatement;
});
const zero = aggregateValidationMetric(zeroInput);
assert(zero.validationStandardUncertainty === fixture.zeroUncertaintyControl.expectedValidationStandardUncertainty, 'zero-uncertainty u_val mismatch');
assert(zero.normalizedAbsoluteErrorZ === fixture.zeroUncertaintyControl.expectedZ, 'zero-uncertainty z must be null');
assert(zero.zApplicability === fixture.zeroUncertaintyControl.expectedZApplicability, 'zero-uncertainty applicability mismatch');

const expectFailure = (label, mutator, expectedCode) => {
  const candidate = baseInput();
  mutator(candidate);
  try {
    aggregateValidationMetric(candidate);
  } catch (error) {
    assert(error instanceof ValidationMetricError, `${label}: expected ValidationMetricError`);
    assert(error.code === expectedCode, `${label}: expected ${expectedCode}, received ${error.code}`);
    assert(typeof error.path === 'string' && error.path.startsWith('$.'), `${label}: structured path missing`);
    return { label, code: error.code, path: error.path };
  }
  throw new Error(`${label}: expected fail-closed rejection`);
};

const negativeCases = [
  expectFailure('model-test-unit-mismatch', (x) => { x.testValue.unit = 'OTHER_QOI'; }, 'UNIT_MISMATCH'),
  expectFailure('component-unit-mismatch', (x) => { x.components[0].unit = 'OTHER_QOI'; }, 'UNIT_MISMATCH'),
  expectFailure('negative-uncertainty', (x) => { x.components[0].value = -0.1; }, 'NEGATIVE_UNCERTAINTY'),
  expectFailure('nonfinite-model-value', (x) => { x.modelValue.value = Number.NaN; }, 'NON_FINITE_NUMBER'),
  expectFailure('nonfinite-uncertainty', (x) => { x.components[1].value = Number.POSITIVE_INFINITY; }, 'NON_FINITE_NUMBER'),
  expectFailure('missing-component-role', (x) => { x.components.pop(); }, 'MISSING_COMPONENT_ROLE'),
  expectFailure('duplicate-component-role', (x) => { x.components[3].role = 'TEST_MEASUREMENT'; }, 'DUPLICATE_COMPONENT_ROLE'),
  expectFailure('unsupported-component-role', (x) => { x.components[3].role = 'CALIBRATION_UNKNOWN'; }, 'UNSUPPORTED_COMPONENT_ROLE'),
  expectFailure('unsupported-uncertainty-basis', (x) => { x.components[0].basis = 'BOUNDED_SET'; }, 'UNSUPPORTED_UNCERTAINTY_BASIS'),
  expectFailure('expanded-missing-k', (x) => {
    x.components[0].basis = 'EXPANDED';
    x.components[0].coverageStatement = 'synthetic coverage';
    delete x.components[0].coverageFactorK;
  }, 'INVALID_COVERAGE_FACTOR'),
  expectFailure('expanded-nonpositive-k', (x) => {
    x.components[0].basis = 'EXPANDED';
    x.components[0].coverageFactorK = 0;
    x.components[0].coverageStatement = 'synthetic coverage';
  }, 'INVALID_COVERAGE_FACTOR'),
  expectFailure('expanded-missing-coverage', (x) => {
    x.components[0].basis = 'EXPANDED';
    x.components[0].coverageFactorK = 2;
    delete x.components[0].coverageStatement;
  }, 'MISSING_STRING'),
  expectFailure('duplicate-variance-contribution', (x) => { x.components[1].varianceContributionKey = x.components[0].varianceContributionKey; }, 'DUPLICATE_VARIANCE_CONTRIBUTION'),
  expectFailure('reference-authority-missing', (x) => { x.authority.referenceValidationMetricExecutionAuthorized = false; }, 'REFERENCE_AUTHORITY_REQUIRED'),
  expectFailure('production-statistical-authority-leak', (x) => { x.authority.productionStatisticalExecutionAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-source-authority-leak', (x) => { x.authority.activeProductionNumericStochasticSourceCount = 1; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-sensitivity-authority-leak', (x) => { x.authority.productionSensitivityAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-validation-authority-leak', (x) => { x.authority.productionValidationAcceptanceAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('production-reliability-target-leak', (x) => { x.authority.productionReliabilityTargetAuthority = 'SYNTHETIC_TARGET'; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('b03-authority-leak', (x) => { x.authority.b03ActivationAuthorized = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('release-authority-leak', (x) => { x.authority.programReleaseAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
  expectFailure('temperature-authority-leak', (x) => { x.authority.programTemperatureAuthority = true; }, 'PRODUCTION_AUTHORITY_LEAKAGE'),
];

assert(negativeCases.length === fixture.negativeCaseCount, 'negative-case count mismatch');
assert(fixture.referenceValidationMetricExecutionAuthorized === true, 'reference validation execution authority must be true');
assert(fixture.productionStatisticalExecutionAuthorized === false, 'production statistical execution must remain false');
assert(fixture.activeProductionNumericStochasticSourceCount === 0, 'production stochastic-source count must remain zero');
assert(fixture.productionSensitivityAuthorized === false, 'production sensitivity must remain false');
assert(fixture.productionValidationAcceptanceAuthorized === false, 'production validation acceptance must remain false');
assert(fixture.productionReliabilityTargetAuthority === 'NONE', 'production reliability target authority must remain NONE');
assert(fixture.b03ActivationAuthorized === false, 'B03 activation must remain false');
assert(fixture.programReleaseAuthority === false, 'release authority must remain false');
assert(fixture.programTemperatureAuthority === false, 'temperature authority must remain false');

const output = {
  schema: 'lafea-uq-reference-validation-metric-check/v1',
  issue: fixture.issue,
  parentIssue: fixture.parentIssue,
  dependencyIssue: fixture.dependencyIssue,
  caseId: fixture.caseId,
  status: 'PASS',
  referenceValidationMetricQualified: true,
  referenceValidationMetricExecutionAuthorized: true,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: 0,
  productionSensitivityAuthorized: false,
  productionValidationAcceptanceAuthorized: false,
  productionReliabilityTargetAuthority: 'NONE',
  analyticalOracle: {
    signedError: positive.signedError,
    varianceSum: positive.varianceSum,
    validationStandardUncertainty: positive.validationStandardUncertainty,
    normalizedAbsoluteErrorZ: positive.normalizedAbsoluteErrorZ,
    zApplicability: positive.zApplicability,
  },
  expandedUncertaintyProvenanceQualified: true,
  signReversalAbsoluteZInvariant: true,
  zeroUncertaintyControlQualified: true,
  zeroUncertaintyZApplicability: zero.zApplicability,
  negativeCaseCount: negativeCases.length,
  validationMetricPlanFailClosedQualified: true,
  universalZAcceptanceThreshold: null,
  productionApplicabilityBlocker: fixture.productionApplicabilityBlocker,
  nextBoundary: fixture.nextBoundary,
};

process.stdout.write(`${JSON.stringify(output)}\n`);
