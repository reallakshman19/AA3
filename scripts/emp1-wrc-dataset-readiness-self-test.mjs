import assert from 'node:assert/strict';
import {
  WRC_CURVE_FIT_COEFFICIENT_NAMES,
  auditWrcDatasetPackage,
  collectUnresolvedPaths,
  inspectNumericalCsv,
  inspectWrcMethodDimensionalContract,
  parseCsv,
} from './emp1-wrc-dataset-readiness-lib.mjs';

const readyDataset = {
  schema: 'wrc537-source-extraction/v1',
  extractionStatus: 'READY_FOR_IMPLEMENTATION',
  extractionCaveat: 'Primary source verified.',
  semanticHash: 'abc123',
  numericalData: [{ id: 'N1', value: 1.2 }],
  openIssues: [],
  geometryDefinitions: [{ symbol: 'Rm', definition: 'Mean radius' }],
  coefficientFamilies: [
    { id: 'SP_NX', symbol: 'NxT/P' },
    { id: 'SP_NY', symbol: 'NyT/P' },
    { id: 'SM_NX', symbol: 'NxT√(RmT)/M' },
    { id: 'SM_NY', symbol: 'NyT√(RmT)/M' },
  ],
  equations: [
    { id: 'EQ_RADIAL_MEMBRANE', machine: 'coeff_Nphi * P / (T**2)' },
    { id: 'EQ_MOMENT_MEMBRANE', machine: 'coeff_Nphi * M / (T**2 * sqrt(Rm * T))' },
  ],
};

const wideHeader = [...WRC_CURVE_FIT_COEFFICIENT_NAMES, 'independent_variable', 'review_status'];
const readyCsv = [
  wideHeader.join(','),
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'U', 'VERIFIED'].join(','),
].join('\n');
const pass = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION',
  dataset: readyDataset,
  numericalCsv: readyCsv,
});
assert.equal(pass.status, 'PASS');
assert.equal(pass.metrics.dimensionalContract.status, 'PASS');
assert.equal(pass.metrics.numericalCsv.curveRows, 1);
assert.equal(pass.metrics.numericalCsv.coefficientsPerCurve, 10);
assert.equal(pass.metrics.numericalCsv.requiredScalarCoefficientCount, 10);
assert.equal(pass.metrics.numericalCsv.numericScalarCoefficientCount, 10);
assert.equal(pass.metrics.numericalCsv.coefficientSchemaQualified, true);
assert.equal(pass.metrics.numericalCsv.independentVariableQualified, true);

const dimensionallyWrongDataset = structuredClone(readyDataset);
dimensionallyWrongDataset.equations.find((row) => row.id === 'EQ_RADIAL_MEMBRANE').machine = 'coeff_Nphi * P / T';
dimensionallyWrongDataset.equations.find((row) => row.id === 'EQ_MOMENT_MEMBRANE').machine = 'coeff_Nphi * M / (T * sqrt(Rm * T))';
const dimensional = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION',
  dataset: dimensionallyWrongDataset,
  numericalCsv: readyCsv,
});
assert.equal(dimensional.status, 'BLOCKED');
assert.equal(dimensional.metrics.dimensionalContract.status, 'BLOCKED');
assert.equal(dimensional.metrics.dimensionalContract.violations.length, 2);
assert.ok(dimensional.blockers.some((row) => row.code === 'BLOCK_METHOD_DIMENSIONAL_CONTRACT'));
assert.deepEqual(
  dimensional.metrics.dimensionalContract.violations.map((row) => row.id),
  [
    'SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH',
    'SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH',
  ],
);
assert.equal(inspectWrcMethodDimensionalContract(dimensionallyWrongDataset).status, 'BLOCKED');

const legacySingleValueCsv = [
  'coefficient_value,parameter_3_name,parameter_3_value,review_status',
  '1.25,U,0.5,VERIFIED',
].join('\n');
const legacy = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION',
  dataset: readyDataset,
  numericalCsv: legacySingleValueCsv,
});
assert.equal(legacy.status, 'BLOCKED');
assert.equal(legacy.metrics.numericalCsv.curveRows, 1);
assert.equal(legacy.metrics.numericalCsv.requiredScalarCoefficientCount, 10);
assert.equal(legacy.metrics.numericalCsv.numericScalarCoefficientCount, 0);
assert.equal(legacy.metrics.numericalCsv.legacyNumericValueRows, 1);
assert.equal(legacy.metrics.numericalCsv.coefficientSchema, 'LEGACY_SINGLE_VALUE_PER_CURVE');
assert.equal(legacy.metrics.numericalCsv.independentVariableRepresentation, 'LEGACY_PARAMETER_3_ROW_ORDINATE');
assert.ok(legacy.blockers.some((row) => row.code === 'BLOCK_COEFFICIENT_SCHEMA_REQUIRES_A_TO_J'));
assert.ok(legacy.blockers.some((row) => row.code === 'BLOCK_NO_NUMERIC_SCALAR_COEFFICIENT_VALUES'));
assert.ok(legacy.blockers.some((row) => row.code === 'BLOCK_INDEPENDENT_VARIABLE_CUSTODY'));

const missingJ = [
  wideHeader.join(','),
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', 'U', 'VERIFIED'].join(','),
].join('\n');
const partial = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION',
  dataset: readyDataset,
  numericalCsv: missingJ,
});
assert.equal(partial.status, 'BLOCKED');
assert.equal(partial.metrics.numericalCsv.numericScalarCoefficientCount, 9);
assert.equal(partial.metrics.numericalCsv.missingScalarCoefficientCount, 1);
assert.ok(partial.blockers.some((row) => row.code === 'BLOCK_INCOMPLETE_SCALAR_COEFFICIENT_SET'));

const unresolvedDataset = {
  ...readyDataset,
  extractionStatus: 'NOT_READY_FOR_IMPLEMENTATION',
  extractionCaveat: 'The licensed WRC 537 PDF was NOT available to the extractor.',
  semanticHash: null,
  numericalData: [],
  openIssues: ['Sign verification'],
  loads: [{ positive: 'UNRESOLVED' }],
};
const unresolvedCsv = [
  wideHeader.join(','),
  ['UNRESOLVED', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'U', 'EXTRACTED'].join(','),
].join('\n');
const blocked = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: NOT_READY_FOR_IMPLEMENTATION',
  dataset: unresolvedDataset,
  numericalCsv: unresolvedCsv,
});
assert.equal(blocked.status, 'BLOCKED');
assert.ok(blocked.blockers.some((row) => row.code === 'BLOCK_UNRESOLVED_DATASET_FIELDS'));
assert.ok(blocked.blockers.some((row) => row.code === 'BLOCK_UNRESOLVED_SCALAR_COEFFICIENT_VALUES'));
assert.equal(blocked.metrics.unresolvedPathCount, 1);
assert.equal(blocked.metrics.numericalCsv.unresolvedScalarCoefficientCount, 1);

const failure = auditWrcDatasetPackage({
  methodText: '> EXTRACTION STATUS: READY_FOR_IMPLEMENTATION',
  dataset: readyDataset,
  numericalCsv: readyCsv,
  artifactIdentity: [{
    id: 'dataset',
    expectedByteCount: 10,
    actualByteCount: 11,
    expectedGitBlobSha1: 'a',
    actualGitBlobSha1: 'b',
  }],
});
assert.equal(failure.status, 'FAIL');
assert.equal(failure.failures.length, 2);

assert.deepEqual(collectUnresolvedPaths({ a: 'UNRESOLVED', b: ['ok', 'x UNRESOLVED y'] }), ['$.a', '$.b[1]']);
assert.deepEqual(parseCsv('a,b\n"x,y",z'), [['a', 'b'], ['x,y', 'z']]);
assert.equal(inspectNumericalCsv(readyCsv).numericScalarCoefficientCount, 10);

console.log(JSON.stringify({
  schema: 'emp1-wrc-dataset-readiness-self-test/v3',
  status: 'PASS',
  oracleClassification: 'SOFTWARE_CONTRACT_ONLY_NOT_WRC_ENGINEERING_EVIDENCE',
  verifiedGuardrails: [
    'dimensionless retained SP membrane coefficient cannot feed a force/length stress expression',
    'dimensionless retained SM membrane coefficient cannot feed a force/length stress expression',
    'one anonymous numeric value per response curve cannot satisfy a-j coverage',
    'nine of ten named scalar coefficients cannot satisfy one curve',
    'all ten named scalar coefficients plus explicit runtime U can satisfy the synthetic shape gate',
    'unresolved a-j scalar values remain blocked',
  ],
}, null, 2));
