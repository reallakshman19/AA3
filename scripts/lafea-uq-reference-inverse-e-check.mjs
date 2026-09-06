import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const contexts = readJson('../validation/lafea-benchmark-data/UQ/reference/reference-contexts.json');
const reference = readJson('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-E-INVERSE-01.json');
const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const productionInputs = readJson('../validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json');
const productionCorrelations = readJson('../validation/lafea-benchmark-data/UQ/inputs/correlation-models.json');
const b02a = readJson('../validation/lafea-b02-definitions/B02A-nonuniform-bending.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

const relativeError = (actual, expected) => Math.abs(actual - expected) / Math.max(1, Math.abs(expected));
const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(Number.isFinite(actual), `${label}: actual must be finite`);
  assert.ok(Number.isFinite(expected), `${label}: expected must be finite`);
  assert.ok(relativeError(actual, expected) <= tolerance, `${label}: ${actual} != ${expected}`);
};

assert.equal(contexts.schema, 'lafea-uq-reference-contexts/v1');
assert.equal(contexts.issue, 1673);
assert.equal(contexts.stage, 'REFERENCE_ENGINE_VERIFICATION');
assert.equal(contexts.contexts.length, 1);
const context = contexts.contexts[0];
assert.equal(context.contextId, 'UQ-REF-E-INVERSE-01');
assert.equal(context.authorityClass, 'REFERENCE_BENCHMARK_ONLY');
assert.equal(context.sourcePriorId, 'SRC-UQ-PRIOR-JCSS-STRUCTURAL-STEEL-E');
assert.equal(context.referenceStatisticalExecutionAuthorized, true);
assert.equal(context.productionStatisticalExecutionAuthorized, false);
assert.equal(context.productionPopulationApplicability, false);
assert.equal(context.productionApplicabilityBlocker, 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED');

assert.equal(reference.schema, 'lafea-uq-reference-case/v1');
assert.equal(reference.issue, 1673);
assert.equal(reference.caseId, context.contextId);
assert.equal(reference.definitionState, 'FROZEN_BEFORE_REFERENCE_EXECUTION');
assert.equal(reference.productionOutputUsedToChooseDefinition, false);
assert.equal(reference.authorityClass, 'REFERENCE_BENCHMARK_ONLY');
assert.equal(reference.sourcePriorId, context.sourcePriorId);

const prior = sourceRegistry.sources.find((row) => row.sourceId === reference.sourcePriorId);
assert.ok(prior, 'retained JCSS candidate prior missing');
assert.equal(prior.sourceClass, 'CANDIDATE_REFERENCE_PRIOR_ONLY');
assert.equal(prior.distributionFamily, 'LOGNORMAL');
assert.equal(prior.arithmeticMean, 200000);
assert.equal(prior.canonicalUnit, 'MPa');
assert.equal(prior.coefficientOfVariation, 0.03);
assert.equal(prior.numericStochasticParameterAuthority, false);
assert.equal(prior.candidateNumericDataRetained, true);
assert.equal(prior.applicabilityState, 'BLOCKED_MATERIAL_IDENTITY_UNSPECIFIED');
assert.equal(sourceRegistry.numericStochasticSourceCount, 0);
assert.equal(sourceRegistry.statisticalExecutionAuthorized, false);

const m = prior.arithmeticMean;
const c = prior.coefficientOfVariation;
const sigmaLn = Math.sqrt(Math.log(1 + c ** 2));
const muLn = Math.log(m) - 0.5 * sigmaLn ** 2;
assertClose(reference.inputModel.logMean, muLn, 1e-12, 'lognormal logMean');
assertClose(reference.inputModel.logStandardDeviation, sigmaLn, 1e-12, 'lognormal logStandardDeviation');

assert.equal(b02a.caseId, 'B02A');
assert.equal(b02a.formulation, 'PLANE_STRESS');
assert.equal(b02a.material.elasticModulus, 200000);
assert.equal(b02a.material.poissonRatio, 0.3);
assertClose(
  b02a.material.shearModulus,
  b02a.material.elasticModulus / (2 * (1 + b02a.material.poissonRatio)),
  1e-12,
  'B02A shear modulus relation',
);
assert.equal(b02a.independentOracle.productionOutputUsed, false);
assert.equal(b02a.independentOracle.tipDeflectionMagnitude, 2.0156);

const e0 = reference.deterministicReference.nominalElasticModulusMPa;
const d0 = reference.deterministicReference.nominalTipDeflectionMagnitudeMm;
const k = d0 * e0;
assert.equal(e0, b02a.material.elasticModulus);
assert.equal(d0, b02a.independentOracle.tipDeflectionMagnitude);
assertClose(reference.deterministicReference.responseConstantK_MPa_mm, k, 1e-12, 'response constant K');

const meanD = d0 * (1 + c ** 2);
const sdD = meanD * c;
const varianceD = sdD ** 2;
const muD = Math.log(k) - muLn;
const z05 = -1.6448536269514722;
const z95 = 1.6448536269514722;
const p05 = Math.exp(muD + sigmaLn * z05);
const p50 = Math.exp(muD);
const p95 = Math.exp(muD + sigmaLn * z95);
const tolerance = reference.acceptance.analyticReconstructionRelativeTolerance;

assertClose(reference.closedFormOracle.meanMm, meanD, tolerance, 'closed-form mean');
assertClose(reference.closedFormOracle.standardDeviationMm, sdD, tolerance, 'closed-form standard deviation');
assertClose(reference.closedFormOracle.varianceMm2, varianceD, tolerance, 'closed-form variance');
assertClose(reference.closedFormOracle.p05Mm, p05, tolerance, 'closed-form p05');
assertClose(reference.closedFormOracle.p50Mm, p50, tolerance, 'closed-form p50');
assertClose(reference.closedFormOracle.p95Mm, p95, tolerance, 'closed-form p95');

assert.equal(reference.authority.referenceStatisticalExecutionAuthorized, true);
assert.equal(reference.authority.productionStatisticalExecutionAuthorized, false);
assert.equal(reference.authority.reliabilityTargetAuthorized, false);
assert.equal(reference.authority.codeQualificationAuthorized, false);
assert.equal(reference.authority.releaseAuthorityGranted, false);
assert.equal(reference.authority.temperatureAuthorityGranted, false);
assert.equal(reference.authority.productionMeshUqQualified, false);

for (const input of productionInputs.inputs) {
  assert.equal(input.stochasticSourceId, null, `production stochastic source leaked into ${input.inputId}`);
  assert.equal(input.distributionFamily, null, `production distribution leaked into ${input.inputId}`);
  assert.equal(input.sourceAuthorityState, 'BLOCKED_SOURCE_AUTHORITY');
}
assert.equal(productionInputs.statisticalExecutionAuthorized, false);
for (const correlation of productionCorrelations.correlationCandidates) {
  assert.equal(correlation.correlationCoefficient, null, `production correlation leaked into ${correlation.pairId}`);
  assert.equal(correlation.stochasticSourceId, null, `production correlation source leaked into ${correlation.pairId}`);
  assert.equal(correlation.authorityState, 'BLOCKED_SOURCE_AUTHORITY');
}
assert.equal(productionCorrelations.statisticalExecutionAuthorized, false);

assert.equal(program.activeCaseId, 'B02');
assert.deepEqual(program.futureQueue.map((row) => row.caseId), ['B03', 'B04', 'B05', 'B06']);
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);

console.log(JSON.stringify({
  schema: 'lafea-uq-reference-inverse-e-check/v1',
  issue: 1673,
  caseId: 'UQ-REF-E-INVERSE-01',
  status: 'PASS',
  referenceStatisticalExecutionAuthorized: true,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: 0,
  closedFormOracle: {
    meanMm: meanD,
    standardDeviationMm: sdD,
    p05Mm: p05,
    p50Mm: p50,
    p95Mm: p95,
  },
  productionApplicabilityBlocker: 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED',
  nextReferenceBoundary: 'IMPLEMENT_AND_QUALIFY_REFERENCE_SAMPLER_PROPAGATION',
}));
