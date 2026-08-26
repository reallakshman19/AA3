import assert from 'node:assert/strict';
import { auditWrcDatasetPackage, collectUnresolvedPaths, inspectNumericalCsv, parseCsv } from './emp1-wrc-dataset-readiness-lib.mjs';

const readyDataset = {
  schema: 'wrc537-source-extraction/v1',
  extractionStatus: 'READY_FOR_IMPLEMENTATION',
  extractionCaveat: 'Primary source verified.',
  semanticHash: 'abc123',
  numericalData: [{ id: 'N1', value: 1.2 }],
  openIssues: [],
  geometryDefinitions: [{ symbol: 'Rm', definition: 'Mean radius' }],
};
const readyCsv = [
  'coefficient_value,parameter_3_value,review_status',
  '1.25,0.5,VERIFIED',
].join('\n');
const pass = auditWrcDatasetPackage({ methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION', dataset: readyDataset, numericalCsv: readyCsv });
assert.equal(pass.status, 'PASS');
assert.equal(pass.metrics.numericalCsv.numericCoefficientRows, 1);

const blockedDataset = {
  ...readyDataset,
  extractionStatus: 'NOT_READY_FOR_IMPLEMENTATION',
  extractionCaveat: 'The licensed WRC 537 PDF was NOT available to the extractor.',
  semanticHash: null,
  numericalData: [],
  openIssues: ['Sign verification'],
  loads: [{ positive: 'UNRESOLVED' }],
};
const blockedCsv = [
  'coefficient_value,parameter_3_value,review_status',
  'UNRESOLVED,UNRESOLVED,EXTRACTED',
].join('\n');
const blocked = auditWrcDatasetPackage({ methodText: '> EXTRACTION STATUS: NOT_READY_FOR_IMPLEMENTATION', dataset: blockedDataset, numericalCsv: blockedCsv });
assert.equal(blocked.status, 'BLOCKED');
assert.ok(blocked.blockers.some((row) => row.code === 'BLOCK_UNRESOLVED_DATASET_FIELDS'));
assert.ok(blocked.blockers.some((row) => row.code === 'BLOCK_NO_NUMERIC_COEFFICIENT_VALUES'));
assert.equal(blocked.metrics.unresolvedPathCount, 1);

const failure = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION',
  dataset: readyDataset,
  numericalCsv: readyCsv,
  artifactIdentity: [{ id: 'dataset', expectedByteCount: 10, actualByteCount: 11, expectedGitBlobSha1: 'a', actualGitBlobSha1: 'b' }],
});
assert.equal(failure.status, 'FAIL');
assert.equal(failure.failures.length, 2);

assert.deepEqual(collectUnresolvedPaths({ a: 'UNRESOLVED', b: ['ok', 'x UNRESOLVED y'] }), ['$.a', '$.b[1]']);
assert.deepEqual(parseCsv('a,b\n"x,y",z'), [['a', 'b'], ['x,y', 'z']]);
assert.equal(inspectNumericalCsv(readyCsv).numericCoefficientRows, 1);
console.log('EMP.1 WRC dataset readiness self-test: PASS');
