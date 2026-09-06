import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const sourceRegistry = readJson('../validation/lafea-benchmark-data/UQ/sources/source-registry.json');
const inputModels = readJson('../validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json');
const correlationModels = readJson('../validation/lafea-benchmark-data/UQ/inputs/correlation-models.json');
const u0Context = readJson('../validation/lafea-benchmark-data/UQ/context/quantities-of-interest.json');
const limitStates = readJson('../validation/lafea-benchmark-data/UQ/reliability/limit-states.json');
const b02a = readJson('../validation/lafea-b02-definitions/B02A-nonuniform-bending.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

assert.equal(sourceRegistry.schema, 'lafea-uq-source-registry/v1');
assert.equal(sourceRegistry.issue, 1673);
assert.equal(sourceRegistry.stage, 'U1');
assert.equal(sourceRegistry.definitionState, 'SOURCE_AUTHORITY_GAP_CONFIRMED');
assert.equal(sourceRegistry.statisticalExecutionAuthorized, false);
const numericalSources = sourceRegistry.sources.filter((row) => row.numericStochasticParameterAuthority === true);
assert.equal(numericalSources.length, 0, 'U1 must not claim numerical stochastic source authority without retained evidence');
assert.equal(sourceRegistry.numericStochasticSourceCount, numericalSources.length);
for (const row of sourceRegistry.sources) {
  assert.equal(typeof row.sourceId, 'string');
  assert.ok(row.sourceId.length > 0);
  assert.equal(typeof row.sourceClass, 'string');
  assert.equal(typeof row.purpose, 'string');
  assert.equal(row.numericStochasticParameterAuthority, false);
}

assert.equal(inputModels.schema, 'lafea-uq-input-models/v1');
assert.equal(inputModels.issue, 1673);
assert.equal(inputModels.stage, 'U1');
assert.equal(inputModels.definitionState, 'IDENTITIES_FROZEN_NUMERIC_MODELS_BLOCKED_SOURCE_AUTHORITY');
assert.equal(inputModels.statisticalExecutionAuthorized, false);
const expectedInputIds = [
  'UQ-IN-L3-ELASTIC-MODULUS',
  'UQ-IN-L3-POISSON-RATIO',
  'UQ-IN-L3-THICKNESS',
  'UQ-IN-L3-GEOMETRY-XY',
  'UQ-IN-L3-TRACTION-PRESSURE',
  'UQ-IN-L3-PRESCRIBED-DISPLACEMENT',
];
assert.deepEqual(inputModels.inputs.map((row) => row.inputId), expectedInputIds);
assert.equal(new Set(expectedInputIds).size, expectedInputIds.length);
for (const row of inputModels.inputs) {
  assert.equal(row.sourceAuthorityState, 'BLOCKED_SOURCE_AUTHORITY');
  assert.equal(row.stochasticSourceId, null);
  assert.equal(row.aleatoryEpistemicClass, null);
  assert.equal(row.distributionFamily, null);
  assert.equal(row.mean, null);
  assert.equal(row.standardDeviation, null);
  assert.equal(row.coefficientOfVariation, null);
  assert.equal(row.lowerBound, null);
  assert.equal(row.upperBound, null);
  assert.equal(row.sampleCount, null);
  assert.equal(typeof row.semanticPath, 'string');
  assert.ok(row.semanticPath.length > 0);
  assert.equal(typeof row.canonicalUnit, 'string');
  assert.ok(row.canonicalUnit.length > 0);
}

assert.equal(correlationModels.schema, 'lafea-uq-correlation-models/v1');
assert.equal(correlationModels.issue, 1673);
assert.equal(correlationModels.stage, 'U1');
assert.equal(correlationModels.definitionState, 'DEPENDENCIES_FROZEN_NUMERIC_CORRELATIONS_BLOCKED_SOURCE_AUTHORITY');
assert.equal(correlationModels.defaultCorrelationPolicy, 'UNSPECIFIED_IS_UNKNOWN_NOT_ZERO');
assert.equal(correlationModels.statisticalExecutionAuthorized, false);

const dependencies = new Map(correlationModels.dependencyRules.map((row) => [row.dependencyId, row]));
const shear = dependencies.get('DEP-L3-SHEAR-MODULUS');
assert.deepEqual(shear.primitiveInputIds, ['UQ-IN-L3-ELASTIC-MODULUS', 'UQ-IN-L3-POISSON-RATIO']);
assert.equal(shear.maySampleDerivedQuantityIndependently, false);
const resultant = dependencies.get('DEP-L3-EDGE-RESULTANT');
assert.deepEqual(resultant.primitiveInputIds, ['UQ-IN-L3-TRACTION-PRESSURE', 'UQ-IN-L3-THICKNESS', 'UQ-IN-L3-GEOMETRY-XY']);
assert.equal(resultant.maySampleDerivedQuantityIndependently, false);
for (const row of correlationModels.correlationCandidates) {
  assert.equal(row.correlationCoefficient, null, `${row.pairId}: absent evidence must not become zero correlation`);
  assert.equal(row.stochasticSourceId, null);
  assert.equal(row.authorityState, 'BLOCKED_SOURCE_AUTHORITY');
  assert.equal(row.inputIds.length, 2);
  for (const inputId of row.inputIds) assert.ok(expectedInputIds.includes(inputId));
}

// Numerical production-trace reconstruction from the frozen deterministic B02A definition.
assert.equal(b02a.definitionState, 'FROZEN_BEFORE_PRODUCTION_OBSERVATION');
assert.equal(b02a.productionOutputUsedToChooseDefinition, false);
const E = b02a.material.elasticModulus;
const nu = b02a.material.poissonRatio;
const reconstructedG = E / (2 * (1 + nu));
assert.ok(Math.abs(reconstructedG - b02a.material.shearModulus) <= Number.EPSILON * E * 4);
assert.equal(E, 200000);
assert.equal(nu, 0.3);
assert.equal(b02a.geometry.thickness, 1);
const traction = b02a.loadCase.routeAttachmentSemantics.find((row) => row.kind === 'TRACTION');
assert.ok(traction);
assert.equal(traction.payload.ty, -10);
const loadedEdgeLength = b02a.geometry.yMaximum - b02a.geometry.yMinimum;
const resultantY = traction.payload.ty * loadedEdgeLength * b02a.geometry.thickness;
assert.equal(resultantY, b02a.loadCase.loadResultant.y);
assert.equal(resultantY, -100);

// Preserve U0 and benchmark-program authority boundaries.
assert.equal(u0Context.claimBoundary.statisticalReliabilityQualified, false);
assert.equal(u0Context.claimBoundary.numericReliabilityTargetAuthorized, false);
assert.equal(u0Context.claimBoundary.releaseAuthorityGranted, false);
assert.equal(limitStates.governingReliabilityStandard, null);
assert.equal(limitStates.numericReliabilityTarget, null);
assert.equal(limitStates.codeAllowable, null);
for (const row of limitStates.limitStates) {
  assert.equal(row.reliabilityBearingAuthorized, false);
  assert.equal(row.pfTarget, null);
  assert.equal(row.betaTarget, null);
}
assert.equal(program.activeCaseId, 'B02');
assert.deepEqual(program.futureQueue.map((row) => row.caseId), ['B03', 'B04', 'B05', 'B06']);
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);

console.log(JSON.stringify({
  schema: 'lafea-uq-u1-source-authority-check/v1',
  issue: 1673,
  stage: 'U1',
  status: 'PASS',
  sourceAuthorityGuardEstablished: true,
  deterministicInputTraceReconstructed: true,
  numericStochasticSourceCount: numericalSources.length,
  u1NumericModelsComplete: false,
  statisticalExecutionAuthorized: false,
  blocker: 'SOURCE_BACKED_STOCHASTIC_DATA_REQUIRED',
  nextAuthorityBoundary: 'OWNER_OR_ENGINEERING_SOURCE_DATA_SELECTION',
}));
