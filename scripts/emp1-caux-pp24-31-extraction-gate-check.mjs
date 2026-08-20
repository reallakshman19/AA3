#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const statePath = resolve(repoRoot, 'validation/emp1/caux2017-wrc01f/pp24-31-extraction-state-v1.json');
const state = JSON.parse(await readFile(statePath, 'utf8'));

assert.equal(state.schema, 'emp1-caux-pp24-31-extraction-state/v1');

if (state.status === 'NOT_RUN_PRIMARY_PDF_REQUIRED') {
  verifyLegacyNotRunState(state);
  console.log(JSON.stringify({
    schema: 'emp1-caux-pp24-31-extraction-gate-check/v2',
    status: 'PASS_EXPECTED_NOT_RUN',
    authorityState: 'HISTORICAL_PRE_SOURCE',
    productionComparisonAllowed: false,
  }, null, 2));
  process.exit(0);
}

assert.equal(state.status, 'SUPERSEDED_BY_QUALIFIED_V2');
assert.equal(state.supersededBy?.qualificationStatus, 'PASS_INDEPENDENT_BENCHMARK_QUALIFICATION');
assert.equal(state.currentAuthority?.sourceCustody, 'PASS');
assert.equal(state.currentAuthority?.pageExtraction, 'PASS');
assert.equal(state.currentAuthority?.expectedValueFreeze, 'PASS');
assert.equal(state.currentAuthority?.independentHandCalculation, 'PASS_REOBSERVED');
assert.equal(state.currentAuthority?.productionComparison, 'ALLOWED_BY_BENCHMARK_GATE_BUT_REQUIRES_METHOD_RUNTIME_AUTHORITY');
assert.equal(state.currentAuthority?.emp1CRouteRegistration, 'NOT_AUTHORIZED_BY_THIS_RECORD');
assert.match(state.supersededBy?.sourceRawPdfSha256 ?? '', /^[a-f0-9]{64}$/u);
assert.match(state.supersededBy?.sourceBenchmarkSemanticHash ?? '', /^[a-f0-9]{64}$/u);
assert.match(state.supersededBy?.independentHandCalculationSemanticHash ?? '', /^[a-f0-9]{64}$/u);

const rules = state.antiSubstitutionRulesStillBinding ?? [];
assert(rules.length >= 5, 'superseded state must preserve anti-substitution rules');
const prohibited = rules.join('\n');
assert.match(prohibited, /Hexagon supplemental/u);
assert.match(prohibited, /CEI WRC example/u);
assert.match(prohibited, /production EMP\.1\.C output/u);
assert.match(prohibited, /reverse-engineered/u);
assert.match(prohibited, /digitized\/inferred/u);

const qualified = JSON.parse(await readFile(resolve(repoRoot, state.supersededBy.benchmarkQualification), 'utf8'));
assert.equal(qualified.status, 'PASS_INDEPENDENT_BENCHMARK_QUALIFICATION');
assert.equal(qualified.productionObservationUsed, false);
assert.equal(qualified.authorization?.handCalculationReobserved, true);
assert.equal(qualified.authorization?.productionComparisonAllowed, true);
assert.equal(qualified.authorization?.emp1CRouteRegistrationAllowed, false);
assert.equal(qualified.source?.rawPdfSha256, state.supersededBy.sourceRawPdfSha256);
assert.equal(qualified.sourceBenchmark?.semanticHash, state.supersededBy.sourceBenchmarkSemanticHash);
assert.equal(qualified.independentHandCalculation?.semanticHash, state.supersededBy.independentHandCalculationSemanticHash);

console.log(JSON.stringify({
  schema: 'emp1-caux-pp24-31-extraction-gate-check/v2',
  status: 'PASS_SUPERSEDED_HISTORY_AND_ANTI_SUBSTITUTION',
  authorityState: qualified.status,
  sourceRawPdfSha256: qualified.source.rawPdfSha256,
  sourceBenchmarkSemanticHash: qualified.sourceBenchmark.semanticHash,
  independentHandCalculationSemanticHash: qualified.independentHandCalculation.semanticHash,
  productionObservationUsed: qualified.productionObservationUsed,
  productionComparisonAllowedByBenchmarkGate: qualified.authorization.productionComparisonAllowed,
  routeRegistrationAllowedByBenchmarkGate: qualified.authorization.emp1CRouteRegistrationAllowed,
  antiSubstitutionRuleCount: rules.length,
}, null, 2));

function verifyLegacyNotRunState(value) {
  assert.equal(value.benchmarkAuthority, false);
  assert.equal(value.productionObservationAllowed, false);
  assert.equal(value.source.classification, 'BENCHMARK_SOURCE');
  assert.equal(value.source.rawPdfSha256, null);
  assert.equal(value.source.custodyState, 'UNRESOLVED_RAW_BYTES');
  assert.deepEqual(value.source.pdfPages, [24, 25, 26, 27, 28, 29, 30, 31]);
  assert.equal(value.repositoryAudit.retainedIndependentPp24_31ExtractionFound, false);
  assert.match(value.repositoryAudit.supplementalArtifactAuthority, /SUPPLEMENTAL_ONLY_NOT_CAUX_PP24_31/u);
  assert.equal(value.requiredExtraction.expectedValues, null);
  assert.equal(value.requiredExtraction.expectedValuesFrozen, false);
  assert.equal(value.requiredExtraction.independentHandCalculation, null);
  assert.equal(value.requiredExtraction.independentHandCalculationFrozen, false);
  assert.equal(value.requiredExtraction.benchmarkSemanticHash, null);
  assert.equal(value.qualification.sourceCustody, 'BLOCKED');
  assert.equal(value.qualification.pageExtraction, 'NOT_RUN');
  assert.equal(value.qualification.expectedValueFreeze, 'NOT_RUN');
  assert.equal(value.qualification.independentHandCalculation, 'NOT_RUN');
  assert.equal(value.qualification.emp1CBenchmarkAuthority, 'BLOCKED');
  assert.match(value.qualification.productionComparison, /^PROHIBITED_/u);
  const sequence = value.freezeSequence;
  assert.equal(sequence.length, 7);
  assert.match(sequence[0], /raw CAUx PDF SHA-256/u);
  assert.match(sequence[2], /without production imports/u);
  assert.match(sequence[4], /without production EMP\.1\.C imports/u);
  assert.match(sequence[6], /only then execute production EMP\.1\.C/u);
  const prohibited = value.disallowedSubstitutions.join('\n');
  assert.match(prohibited, /Hexagon supplemental/u);
  assert.match(prohibited, /CEI WRC example/u);
  assert.match(prohibited, /production EMP\.1\.C output/u);
  assert.match(prohibited, /reverse-engineered/u);
}
