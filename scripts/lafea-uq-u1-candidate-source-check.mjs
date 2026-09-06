import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const sourceSelection = readJson('../validation/lafea-benchmark-data/UQ/sources/source-selection-requirements.json');
const uncertaintyModels = readJson('../validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json');
const correlationModels = readJson('../validation/lafea-benchmark-data/UQ/inputs/correlation-models.json');
const b02a = readJson('../validation/lafea-b02-definitions/B02A-nonuniform-bending.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

assert.equal(sourceRegistry.schema, 'lafea-uq-source-registry/v1');
assert.equal(sourceRegistry.numericStochasticSourceCount, 0);
assert.equal(sourceRegistry.candidateReferencePriorCount, 1);
assert.equal(sourceRegistry.statisticalExecutionAuthorized, false);

const candidate = sourceRegistry.sources.find((source) => source.sourceId === 'SRC-UQ-PRIOR-JCSS-STRUCTURAL-STEEL-E');
assert.ok(candidate, 'JCSS structural-steel modulus candidate prior must be retained');
assert.equal(candidate.sourceClass, 'CANDIDATE_REFERENCE_PRIOR_ONLY');
assert.equal(candidate.distributionFamily, 'LOGNORMAL');
assert.equal(candidate.arithmeticMean, 200000);
assert.equal(candidate.canonicalUnit, 'MPa');
assert.equal(candidate.coefficientOfVariation, 0.03);
assert.equal(candidate.numericStochasticParameterAuthority, false);
assert.equal(candidate.candidateNumericDataRetained, true);
assert.equal(candidate.applicabilityState, 'BLOCKED_MATERIAL_IDENTITY_UNSPECIFIED');

const mean = candidate.arithmeticMean;
const cov = candidate.coefficientOfVariation;
assert.ok(mean > 0, 'lognormal mean must be positive');
assert.ok(cov >= 0, 'COV must be non-negative');
const logVariance = Math.log(1 + cov ** 2);
const logSigma = Math.sqrt(logVariance);
const logMean = Math.log(mean) - 0.5 * logVariance;
const reconstructedMean = Math.exp(logMean + 0.5 * logVariance);
const reconstructedVariance = (Math.exp(logVariance) - 1) * Math.exp(2 * logMean + logVariance);
const reconstructedSd = Math.sqrt(reconstructedVariance);
assert.ok(Math.abs(reconstructedMean - 200000) <= 1e-8, 'candidate lognormal mean reconstruction failed');
assert.ok(Math.abs(reconstructedSd - 6000) <= 1e-8, 'candidate lognormal standard-deviation reconstruction failed');

assert.equal(sourceSelection.schema, 'lafea-uq-source-selection-requirements/v1');
assert.equal(sourceSelection.activeNumericStochasticSourceCount, 0);
assert.equal(sourceSelection.candidateReferencePriorCount, 1);
assert.equal(sourceSelection.statisticalExecutionAuthorized, false);
assert.equal(sourceSelection.inputSelectionRequirements.length, uncertaintyModels.inputs.length);
for (const requirement of sourceSelection.inputSelectionRequirements) {
  assert.equal(requirement.activationEligible, false, `${requirement.inputId} may not activate in LEG-003`);
  assert.ok(requirement.blocker, `${requirement.inputId} must retain an explicit blocker`);
}

const elasticSelection = sourceSelection.inputSelectionRequirements.find((row) => row.inputId === 'UQ-IN-L3-ELASTIC-MODULUS');
assert.ok(elasticSelection);
assert.deepEqual(elasticSelection.candidateSourceIds, ['SRC-UQ-PRIOR-JCSS-STRUCTURAL-STEEL-E']);
assert.equal(elasticSelection.currentContextState, 'MATERIAL_IDENTITY_UNSPECIFIED_IN_B02A');

for (const input of uncertaintyModels.inputs) {
  assert.equal(input.stochasticSourceId, null, `${input.inputId} candidate data leaked into active source authority`);
  assert.equal(input.aleatoryEpistemicClass, null, `${input.inputId} uncertainty class must remain unauthorised`);
  assert.equal(input.distributionFamily, null, `${input.inputId} distribution must remain inactive`);
  assert.equal(input.mean, null, `${input.inputId} mean must remain inactive`);
  assert.equal(input.standardDeviation, null, `${input.inputId} standard deviation must remain inactive`);
  assert.equal(input.coefficientOfVariation, null, `${input.inputId} COV must remain inactive`);
  assert.equal(input.lowerBound, null, `${input.inputId} lower bound must remain inactive`);
  assert.equal(input.upperBound, null, `${input.inputId} upper bound must remain inactive`);
  assert.equal(input.sampleCount, null, `${input.inputId} sample count must remain inactive`);
  assert.equal(input.sourceAuthorityState, 'BLOCKED_SOURCE_AUTHORITY');
}
assert.equal(uncertaintyModels.statisticalExecutionAuthorized, false);

assert.equal(correlationModels.defaultCorrelationPolicy, 'UNSPECIFIED_IS_UNKNOWN_NOT_ZERO');
assert.equal(correlationModels.statisticalExecutionAuthorized, false);
for (const pair of correlationModels.correlationCandidates) {
  assert.equal(pair.correlationCoefficient, null);
  assert.equal(pair.stochasticSourceId, null);
  assert.equal(pair.authorityState, 'BLOCKED_SOURCE_AUTHORITY');
}

assert.equal(b02a.material.elasticModulus, 200000);
assert.equal(b02a.material.poissonRatio, 0.3);
for (const forbiddenIdentityKey of ['materialFamily', 'grade', 'specification', 'productForm', 'manufacturingProcess', 'heatLotPopulation']) {
  assert.equal(Object.hasOwn(b02a.material, forbiddenIdentityKey), false, `B02A unexpectedly supplies applicability identity: ${forbiddenIdentityKey}`);
}

assert.equal(program.activeCaseId, 'B02');
assert.deepEqual(program.futureQueue.map((row) => row.caseId), ['B03', 'B04', 'B05', 'B06']);
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);

console.log(JSON.stringify({
  schema: 'lafea-uq-u1-candidate-source-check/v1',
  issue: 1673,
  stage: 'U1',
  status: 'PASS',
  candidateReferencePriorCount: 1,
  activeNumericStochasticSourceCount: 0,
  candidatePrior: {
    sourceId: candidate.sourceId,
    distributionFamily: candidate.distributionFamily,
    arithmeticMeanMPa: candidate.arithmeticMean,
    coefficientOfVariation: candidate.coefficientOfVariation,
    reconstructedStandardDeviationMPa: reconstructedSd,
    logMean,
    logSigma,
    applicabilityState: candidate.applicabilityState,
  },
  statisticalExecutionAuthorized: false,
  blocker: 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED',
  nextAuthorityBoundary: 'IDENTIFY_MATERIAL_LOAD_GEOMETRY_BOUNDARY_POPULATIONS_OR_AUTHORIZE_REFERENCE_PRIOR_CONTEXT',
}));
