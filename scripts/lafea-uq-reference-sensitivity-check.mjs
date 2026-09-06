import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  SensitivityValidationError,
  assertReferenceAuthority,
  evaluatePolynomialModel,
  runMorrisAdditiveReference,
  runSobolReference,
} from './lib/lafea-uq-reference-sensitivity.mjs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const reference = readJson('../validation/lafea-benchmark-data/UQ/reference/UQ-REF-SENSITIVITY-01.json');
const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const tolerance = reference.acceptance.analyticReconstructionRelativeTolerance;
const morrisTolerance = reference.acceptance.morrisAbsoluteTolerance;
const maxNormalizedError = reference.acceptance.finalNormalizedErrorMaximum;

const close = (actual, expected, absoluteTolerance, label) => {
  assert.ok(Number.isFinite(actual), `${label} must be finite`);
  assert.ok(Math.abs(actual - expected) <= absoluteTolerance, `${label}: ${actual} != ${expected}`);
};

const relativeClose = (actual, expected, relativeTolerance, label) => {
  const scale = Math.max(1, Math.abs(expected));
  close(actual, expected, relativeTolerance * scale, label);
};

const clone = (value) => JSON.parse(JSON.stringify(value));

assert.equal(reference.schema, 'lafea-uq-reference-sensitivity/v1');
assert.equal(reference.issue, 1692);
assert.equal(reference.parentIssue, 1673);
assert.equal(reference.dependencyIssue, 1689);
assert.equal(reference.definitionState, 'FROZEN_BEFORE_EXECUTION');
assert.equal(reference.authorityClass, 'REFERENCE_BENCHMARK_ONLY');
assert.equal(reference.productionOutputUsedToChooseDefinition, false);
assert.deepEqual(reference.variableIds, ['X1', 'X2', 'X3']);
assertReferenceAuthority(reference.authority);

assert.equal(sourceRegistry.numericStochasticSourceCount, 0);
assert.equal(sourceRegistry.statisticalExecutionAuthorized, false);

const distributionMap = new Map(reference.inputModel.distributions.map((distribution) => [distribution.variableId, distribution]));
const varianceById = {};
const meanById = {};
for (const id of reference.variableIds) {
  const distribution = distributionMap.get(id);
  assert.equal(distribution.family, 'UNIFORM');
  meanById[id] = (distribution.minimum + distribution.maximum) / 2;
  varianceById[id] = (distribution.maximum - distribution.minimum) ** 2 / 12;
  close(meanById[id], 0, tolerance, `${id} frozen mean`);
  close(varianceById[id], 1 / 3, tolerance, `${id} frozen variance`);
}

function reconstructVariance(model) {
  const firstComponents = {};
  for (const term of model.linearTerms) {
    firstComponents[term.variableId] = term.coefficient ** 2 * varianceById[term.variableId];
  }
  const pairComponents = {};
  for (const term of model.interactionTerms) {
    const [left, right] = term.variableIds;
    assert.equal(meanById[left], 0, 'interaction oracle reconstruction requires centered frozen variables');
    assert.equal(meanById[right], 0, 'interaction oracle reconstruction requires centered frozen variables');
    pairComponents[[left, right].sort().join(':')] = term.coefficient ** 2 * varianceById[left] * varianceById[right];
  }
  const variance = [...Object.values(firstComponents), ...Object.values(pairComponents)].reduce((sum, value) => sum + value, 0);
  return { firstComponents, pairComponents, variance };
}

const additiveReconstruction = reconstructVariance(reference.additiveCase.model);
relativeClose(additiveReconstruction.variance, reference.additiveCase.analyticalOracle.variance, tolerance, 'additive variance oracle');
for (const id of reference.variableIds) {
  const expected = additiveReconstruction.firstComponents[id] / additiveReconstruction.variance;
  relativeClose(expected, reference.additiveCase.analyticalOracle.sobolFirstOrder[id], tolerance, `additive S ${id}`);
  relativeClose(expected, reference.additiveCase.analyticalOracle.sobolTotal[id], tolerance, `additive ST ${id}`);
}
close(reference.additiveCase.analyticalOracle.pairInteractionX1X2, 0, tolerance, 'additive interaction oracle');

const interactionReconstruction = reconstructVariance(reference.interactionCase.model);
relativeClose(interactionReconstruction.variance, reference.interactionCase.analyticalOracle.variance, tolerance, 'interaction variance oracle');
for (const id of reference.variableIds) {
  relativeClose(
    interactionReconstruction.firstComponents[id],
    reference.interactionCase.analyticalOracle.varianceComponents[id],
    tolerance,
    `interaction variance component ${id}`,
  );
  const expectedFirst = interactionReconstruction.firstComponents[id] / interactionReconstruction.variance;
  relativeClose(expectedFirst, reference.interactionCase.analyticalOracle.sobolFirstOrder[id], tolerance, `interaction S ${id}`);
}
const pairKey = 'X1:X2';
relativeClose(
  interactionReconstruction.pairComponents[pairKey],
  reference.interactionCase.analyticalOracle.varianceComponents[pairKey],
  tolerance,
  'interaction pair variance component',
);
const expectedPair = interactionReconstruction.pairComponents[pairKey] / interactionReconstruction.variance;
relativeClose(expectedPair, reference.interactionCase.analyticalOracle.sobolPairInteractions[pairKey], tolerance, 'interaction S12');
const expectedTotals = {
  X1: (interactionReconstruction.firstComponents.X1 + interactionReconstruction.pairComponents[pairKey]) / interactionReconstruction.variance,
  X2: (interactionReconstruction.firstComponents.X2 + interactionReconstruction.pairComponents[pairKey]) / interactionReconstruction.variance,
  X3: interactionReconstruction.firstComponents.X3 / interactionReconstruction.variance,
};
for (const id of reference.variableIds) {
  relativeClose(expectedTotals[id], reference.interactionCase.analyticalOracle.sobolTotal[id], tolerance, `interaction ST ${id}`);
}

const baseSpec = (model, overrides = {}) => ({
  variableIds: reference.variableIds,
  designOrder: reference.variableIds,
  expectedVariableIds: reference.variableIds,
  distributions: reference.inputModel.distributions,
  model,
  samplePlan: reference.sobolPlan,
  ...overrides,
});

const morris = runMorrisAdditiveReference({
  variableIds: reference.variableIds,
  designOrder: reference.variableIds,
  expectedVariableIds: reference.variableIds,
  distributions: reference.inputModel.distributions,
  model: reference.additiveCase.model,
  morrisPlan: reference.morrisPlan,
});
for (const id of reference.variableIds) {
  close(morris.mu[id], reference.additiveCase.analyticalOracle.morris.mu[id], morrisTolerance, `Morris mu ${id}`);
  close(morris.muStar[id], reference.additiveCase.analyticalOracle.morris.muStar[id], morrisTolerance, `Morris mu* ${id}`);
  close(morris.sigma[id], reference.additiveCase.analyticalOracle.morris.sigma[id], morrisTolerance, `Morris sigma ${id}`);
}
assert.deepEqual(morris.rankingDescending, reference.additiveCase.analyticalOracle.morris.rankingDescending);

const additiveSobol = runSobolReference(baseSpec(reference.additiveCase.model));
const interactionSobol = runSobolReference(baseSpec(reference.interactionCase.model));

const normalizedErrors = {};
const retainNormalizedError = (label, summary, oracle) => {
  assert.ok(summary.standardError > 0 && Number.isFinite(summary.standardError), `${label} block standard error must be finite and positive`);
  const normalized = Math.abs(summary.mean - oracle) / summary.standardError;
  assert.ok(normalized <= maxNormalizedError, `${label} normalized error ${normalized} exceeds ${maxNormalizedError}`);
  normalizedErrors[label] = normalized;
};

retainNormalizedError('additive.variance', additiveSobol.variance, reference.additiveCase.analyticalOracle.variance);
for (const id of reference.variableIds) {
  retainNormalizedError(`additive.S.${id}`, additiveSobol.firstOrder[id], reference.additiveCase.analyticalOracle.sobolFirstOrder[id]);
  retainNormalizedError(`additive.ST.${id}`, additiveSobol.total[id], reference.additiveCase.analyticalOracle.sobolTotal[id]);
}
retainNormalizedError('additive.S12', additiveSobol.pairInteractionX1X2, reference.additiveCase.analyticalOracle.pairInteractionX1X2);

retainNormalizedError('interaction.variance', interactionSobol.variance, reference.interactionCase.analyticalOracle.variance);
for (const id of reference.variableIds) {
  retainNormalizedError(`interaction.S.${id}`, interactionSobol.firstOrder[id], reference.interactionCase.analyticalOracle.sobolFirstOrder[id]);
  retainNormalizedError(`interaction.ST.${id}`, interactionSobol.total[id], reference.interactionCase.analyticalOracle.sobolTotal[id]);
}
retainNormalizedError('interaction.S12', interactionSobol.pairInteractionX1X2, reference.interactionCase.analyticalOracle.sobolPairInteractions[pairKey]);

const additiveEstimatedRanking = [...reference.variableIds].sort((left, right) => additiveSobol.total[right].mean - additiveSobol.total[left].mean);
assert.deepEqual(additiveEstimatedRanking, ['X3', 'X2', 'X1']);

const additiveReplay = runSobolReference(baseSpec(reference.additiveCase.model));
const sameSeedReplayExact = JSON.stringify(additiveReplay) === JSON.stringify(additiveSobol);
assert.equal(sameSeedReplayExact, true);

const differentSeedPlan = { ...reference.sobolPlan, seedUint32: reference.sobolPlan.seedUint32 + 1 };
const additiveDifferentSeed = runSobolReference(baseSpec(reference.additiveCase.model, { samplePlan: differentSeedPlan }));
const differentSeedSummaryChanged = JSON.stringify(additiveDifferentSeed) !== JSON.stringify(additiveSobol);
assert.equal(differentSeedSummaryChanged, true);

const permutation = ['X3', 'X1', 'X2'];
const permutedDistributions = permutation.map((id) => reference.inputModel.distributions.find((distribution) => distribution.variableId === id));
const permutedModel = {
  ...reference.additiveCase.model,
  linearTerms: permutation.map((id) => reference.additiveCase.model.linearTerms.find((term) => term.variableId === id)),
};
const permutedSobol = runSobolReference(baseSpec(permutedModel, {
  variableIds: permutation,
  designOrder: permutation,
  distributions: permutedDistributions,
}));
const consistentPermutationExact = JSON.stringify(permutedSobol) === JSON.stringify(additiveSobol);
assert.equal(consistentPermutationExact, true);

const negativeCases = [];
const expectFail = (name, expectedCode, operation) => {
  try {
    operation();
  } catch (error) {
    assert.ok(error instanceof SensitivityValidationError, `${name} must fail with SensitivityValidationError`);
    assert.equal(error.code, expectedCode, `${name} code`);
    assert.equal(typeof error.path, 'string', `${name} path`);
    negativeCases.push({ name, code: error.code, path: error.path });
    return;
  }
  assert.fail(`${name} did not fail closed`);
};

expectFail('missing-variable-ids', 'MISSING_VARIABLE_ID', () => runSobolReference(baseSpec(reference.additiveCase.model, { variableIds: [], designOrder: [] })));
expectFail('duplicate-variable-id', 'DUPLICATE_VARIABLE_ID', () => runSobolReference(baseSpec(reference.additiveCase.model, { variableIds: ['X1', 'X1', 'X3'], designOrder: ['X1', 'X1', 'X3'] })));
expectFail('variable-id-set-mismatch', 'VARIABLE_ID_SET_MISMATCH', () => runSobolReference(baseSpec(reference.additiveCase.model, { variableIds: ['X1', 'X2', 'X4'], designOrder: ['X1', 'X2', 'X4'] })));
expectFail('inconsistent-variable-order', 'VARIABLE_ORDER_MISMATCH', () => runSobolReference(baseSpec(reference.additiveCase.model, { variableIds: permutation, designOrder: reference.variableIds, distributions: permutedDistributions })));

const unsupportedDistribution = clone(reference.inputModel.distributions);
unsupportedDistribution[0].family = 'NORMAL';
expectFail('unsupported-distribution', 'UNSUPPORTED_DISTRIBUTION', () => runSobolReference(baseSpec(reference.additiveCase.model, { distributions: unsupportedDistribution })));

const invalidBounds = clone(reference.inputModel.distributions);
invalidBounds[0].minimum = 1;
invalidBounds[0].maximum = -1;
expectFail('invalid-bounds', 'INVALID_BOUNDS', () => runSobolReference(baseSpec(reference.additiveCase.model, { distributions: invalidBounds })));

const nonNumericModel = clone(reference.additiveCase.model);
nonNumericModel.linearTerms[0].coefficient = Number.NaN;
expectFail('non-numeric-model-parameter', 'NON_NUMERIC_ENTRY', () => runSobolReference(baseSpec(nonNumericModel)));

const unknownModelVariable = clone(reference.additiveCase.model);
unknownModelVariable.interactionTerms.push({ variableIds: ['X1', 'X4'], coefficient: 1 });
expectFail('unknown-model-variable', 'UNKNOWN_MODEL_VARIABLE', () => runSobolReference(baseSpec(unknownModelVariable)));

expectFail('invalid-sample-count', 'INVALID_SAMPLE_PLAN', () => runSobolReference(baseSpec(reference.additiveCase.model, { samplePlan: { ...reference.sobolPlan, finalSampleCount: 1 } })));
expectFail('invalid-block-count', 'INVALID_SAMPLE_PLAN', () => runSobolReference(baseSpec(reference.additiveCase.model, { samplePlan: { ...reference.sobolPlan, blockCount: 1 } })));
expectFail('nondivisible-block-plan', 'INVALID_SAMPLE_PLAN', () => runSobolReference(baseSpec(reference.additiveCase.model, { samplePlan: { ...reference.sobolPlan, blockCount: 31 } })));
expectFail('zero-random-seed', 'INVALID_RANDOM_SEED', () => runSobolReference(baseSpec(reference.additiveCase.model, { samplePlan: { ...reference.sobolPlan, seedUint32: 0 } })));
expectFail('unsupported-estimator', 'UNSUPPORTED_ESTIMATOR', () => runSobolReference(baseSpec(reference.additiveCase.model, { samplePlan: { ...reference.sobolPlan, estimator: 'UNKNOWN' } })));

const invalidMorrisPlan = { ...reference.morrisPlan, delta: 2 };
expectFail('invalid-morris-step', 'INVALID_MORRIS_STEP', () => runMorrisAdditiveReference({
  variableIds: reference.variableIds,
  designOrder: reference.variableIds,
  expectedVariableIds: reference.variableIds,
  distributions: reference.inputModel.distributions,
  model: reference.additiveCase.model,
  morrisPlan: invalidMorrisPlan,
}));

const invalidTrajectoryPlan = clone(reference.morrisPlan);
invalidTrajectoryPlan.trajectoryOrders[0] = ['X1', 'X1', 'X3'];
expectFail('invalid-morris-design', 'INVALID_MORRIS_DESIGN', () => runMorrisAdditiveReference({
  variableIds: reference.variableIds,
  designOrder: reference.variableIds,
  expectedVariableIds: reference.variableIds,
  distributions: reference.inputModel.distributions,
  model: reference.additiveCase.model,
  morrisPlan: invalidTrajectoryPlan,
}));

const overflowModel = clone(reference.additiveCase.model);
overflowModel.linearTerms.forEach((term) => { term.coefficient = Number.MAX_VALUE; });
expectFail('non-finite-model-output', 'NON_FINITE_MODEL_VALUE', () => evaluatePolynomialModel(overflowModel, { X1: 1, X2: 1, X3: 1 }));

const authorityLeak = { ...reference.authority, productionSensitivityAuthorized: true };
expectFail('production-authority-leakage', 'PRODUCTION_AUTHORITY_LEAKAGE', () => assertReferenceAuthority(authorityLeak));

assert.equal(negativeCases.length, 17);
const observedNormalizedErrorMaximum = Math.max(...Object.values(normalizedErrors));

console.log(JSON.stringify({
  schema: 'lafea-uq-reference-sensitivity-check/v1',
  issue: 1692,
  parentIssue: 1673,
  dependencyIssue: 1689,
  caseId: reference.caseId,
  status: 'PASS',
  referenceSensitivityQualified: true,
  referenceSensitivityExecutionAuthorized: true,
  productionStatisticalExecutionAuthorized: false,
  activeProductionNumericStochasticSourceCount: sourceRegistry.numericStochasticSourceCount,
  productionSensitivityAuthorized: false,
  morris: {
    muStar: morris.muStar,
    sigma: morris.sigma,
    rankingDescending: morris.rankingDescending,
  },
  finalSampleCount: reference.sobolPlan.finalSampleCount,
  blockCount: reference.sobolPlan.blockCount,
  additiveSobol,
  interactionSobol,
  normalizedErrors,
  observedNormalizedErrorMaximum,
  normalizedErrorAcceptanceMaximum: maxNormalizedError,
  sameSeedReplayExact,
  differentSeedSummaryChanged,
  consistentPermutationExact,
  inconsistentOrderFailClosed: negativeCases.some((entry) => entry.name === 'inconsistent-variable-order'),
  negativeCaseCount: negativeCases.length,
  sensitivityPlanFailClosedQualified: true,
  productionApplicabilityBlocker: 'ENGINEERING_POPULATION_APPLICABILITY_REQUIRED',
  productionReliabilityTargetAuthority: 'NONE',
  nextBoundary: 'RECONCILE_REFERENCE_SENSITIVITY_PASS_TO_PARENT_1673_AND_PLAN_NEXT_REFERENCE_VALIDATION_CASE',
}));
