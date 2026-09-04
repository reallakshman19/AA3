import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE_SHA = 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e';
const BENCHMARK_HASH = '741bfbc21496c2f126dbbeec18b2f88d4424e90a94b1d2cc7444776a16dfb7fe';
const HANDCALC_HASH = 'e7e4e7d21188e4b6c1f53c2d7b89a73036a52ccccc61a65fd69c24f6a13ae227';
const OBS_HASH = 'b699860fbceede1cf53419ad82b56c446a4c8dfea772fe1a1b935e1230dde4e0';
const QUAL_HASH = '75c0423f429f86991dc67e4f7c2c45ae6841ace2d1baa0a43df6ab7e8bb71648';
const PAGES = [24,25,26,27,28,29,30,31];
const FALSE_AUTHORITY = {
  wrcMethodAuthority: false,
  engineeringUseAuthorized: false,
  productionUseAuthorized: false,
  codeComplianceAuthorized: false,
  releaseAuthorityGranted: false,
};

const observation = await readJson('validation/emp1/caux2017-wrc01f/caux-pp24-31-direct-pdf-observation-v1.json');
const qualification = await readJson('validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v2.json');
const historicalQualification = await readJson('validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json');

assert.equal(observation.schema, 'emp1-caux-pp24-31-direct-pdf-observation/v1');
assert.equal(observation.source.expectedSha256, SOURCE_SHA);
assert.equal(observation.source.observedSha256, SOURCE_SHA);
assert.equal(observation.source.expectedByteCount, 7260396);
assert.equal(observation.source.observedByteCount, 7260396);
assert.equal(observation.source.identityMatch, true);
assert.deepEqual(observation.execution.requiredPages, PAGES);
assert.equal(observation.execution.directPdfPageReobservation, 'PASS');
assert.equal(observation.retainedTranscription.agreement, 'PASS_CONTROLLED_FACTS_REOBSERVED');
assert.equal(observation.retainedTranscription.transcriptionMismatchFound, false);
assert.equal(observation.retainedTranscription.sourceInternalGammaRadiusDiscrepancyPreserved, true);
assert.deepEqual(observation.freeze, {
  expectedValuesChanged: false,
  toleranceChanged: false,
  productionOutputUsedToAlterReference: false,
});
assert.deepEqual(observation.authority, FALSE_AUTHORITY);
assert.equal(semanticHash(observation), OBS_HASH);

assert.equal(qualification.schema, 'emp1-caux-pp24-31-benchmark-qualification/v2');
assert.equal(qualification.benchmark.semanticHash, BENCHMARK_HASH);
assert.equal(qualification.independentHandCalculation.semanticHash, HANDCALC_HASH);
assert.equal(qualification.directPdfObservation.semanticHash, OBS_HASH);
assert.equal(qualification.directPdfObservation.status, 'PASS');
assert.equal(qualification.directPdfObservation.rawPdfSha256, SOURCE_SHA);
assert.deepEqual(qualification.directPdfObservation.requiredPages, PAGES);
assert.equal(qualification.source.directPdfPageReobservation, 'PASS');
assert.equal(
  qualification.status,
  'PASS_FINAL_CAUX_SOURCE_QUALIFICATION_DIRECT_PDF_REOBSERVED_REFERENCE_FREEZE_PRESERVED',
);
assert.equal(qualification.remaining.directPdfPageReobservation, false);
assert.equal(qualification.freeze.sourceValuesRemainFrozen, true);
assert.equal(qualification.freeze.productionOutputObservedForExpectedValueSelection, false);
assert.equal(qualification.freeze.productionOutputUsedToChooseDefinition, false);
assert.equal(qualification.independentChecks.gammaRadiusBasis.mayCloseWrcRadiusAuthority, false);
assert.match(
  qualification.independentChecks.gammaRadiusBasis.status,
  /^UNRESOLVED_SOURCE_INTERNAL_BASIS_OR_TRANSCRIPTION_DISCREPANCY_PRESERVED_/u,
);
assert.equal(qualification.releaseProfileDisposition.mayAuthorizeProduction, false);
assert.deepEqual(qualification.authority, FALSE_AUTHORITY);
assert.equal(semanticHash(qualification), QUAL_HASH);

assert.equal(
  historicalQualification.status,
  'BLOCKED_FINAL_CAUX_SOURCE_QUALIFICATION_DIRECT_PDF_REOBSERVATION_NOT_RUN_REFERENCE_FREEZE_COMPLETE',
);
assert.equal(historicalQualification.source.directPdfPageReobservation, 'NOT_RUN_EXECUTION_ENVIRONMENT');

console.log(JSON.stringify({
  schema: 'emp1-caux-pp24-31-direct-pdf-qualification-check/v1',
  status: qualification.status,
  sourceSha256: SOURCE_SHA,
  requiredPages: PAGES,
  directPdfPageReobservation: 'PASS',
  benchmarkSemanticHash: BENCHMARK_HASH,
  directObservationSemanticHash: OBS_HASH,
  qualificationSemanticHash: QUAL_HASH,
  historicalQualificationPreserved: true,
  engineeringUseAuthorized: false,
  codeComplianceAuthorized: false,
}, null, 2));
console.log('EMP1_CAUX_DIRECT_PDF_QUALIFICATION_CHECK_PASS');

function semanticHash(value) {
  const copy = structuredClone(value);
  delete copy.semanticHash;
  return createHash('sha256').update(stableJson(copy)).digest('hex');
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
