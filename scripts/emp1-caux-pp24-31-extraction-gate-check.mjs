#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const path = resolve(repoRoot, 'validation/emp1/caux2017-wrc01f/pp24-31-extraction-state-v1.json');
const state = JSON.parse(await readFile(path, 'utf8'));

assert.equal(state.schema, 'emp1-caux-pp24-31-extraction-state/v1');
assert.equal(state.status, 'NOT_RUN_PRIMARY_PDF_REQUIRED');
assert.equal(state.benchmarkAuthority, false);
assert.equal(state.productionObservationAllowed, false);
assert.equal(state.source.classification, 'BENCHMARK_SOURCE');
assert.equal(state.source.rawPdfSha256, null);
assert.equal(state.source.custodyState, 'UNRESOLVED_RAW_BYTES');
assert.deepEqual(state.source.pdfPages, [24, 25, 26, 27, 28, 29, 30, 31]);
assert.equal(state.repositoryAudit.retainedIndependentPp24_31ExtractionFound, false);
assert.match(state.repositoryAudit.supplementalArtifactAuthority, /SUPPLEMENTAL_ONLY_NOT_CAUX_PP24_31/u);
assert.equal(state.requiredExtraction.expectedValues, null);
assert.equal(state.requiredExtraction.expectedValuesFrozen, false);
assert.equal(state.requiredExtraction.independentHandCalculation, null);
assert.equal(state.requiredExtraction.independentHandCalculationFrozen, false);
assert.equal(state.requiredExtraction.benchmarkSemanticHash, null);
assert.equal(state.qualification.sourceCustody, 'BLOCKED');
assert.equal(state.qualification.pageExtraction, 'NOT_RUN');
assert.equal(state.qualification.expectedValueFreeze, 'NOT_RUN');
assert.equal(state.qualification.independentHandCalculation, 'NOT_RUN');
assert.equal(state.qualification.emp1CBenchmarkAuthority, 'BLOCKED');
assert.match(state.qualification.productionComparison, /^PROHIBITED_/u);

const sequence = state.freezeSequence;
assert.equal(sequence.length, 7);
assert.match(sequence[0], /raw CAUx PDF SHA-256/u);
assert.match(sequence[2], /without production imports/u);
assert.match(sequence[4], /without production EMP\.1\.C imports/u);
assert.match(sequence[6], /only then execute production EMP\.1\.C/u);

const prohibited = state.disallowedSubstitutions.join('\n');
assert.match(prohibited, /Hexagon supplemental/u);
assert.match(prohibited, /CEI WRC example/u);
assert.match(prohibited, /production EMP\.1\.C output/u);
assert.match(prohibited, /reverse-engineered/u);

console.log(JSON.stringify({
  schema: 'emp1-caux-pp24-31-extraction-gate-check/v1',
  status: 'PASS_EXPECTED_NOT_RUN',
  sourceCustody: state.source.custodyState,
  requiredPages: state.source.pdfPages,
  expectedValuesFrozen: state.requiredExtraction.expectedValuesFrozen,
  independentHandCalculationFrozen: state.requiredExtraction.independentHandCalculationFrozen,
  productionObservationAllowed: state.productionObservationAllowed,
  benchmarkAuthority: state.benchmarkAuthority,
  disallowedSubstitutionCount: state.disallowedSubstitutions.length,
}, null, 2));
