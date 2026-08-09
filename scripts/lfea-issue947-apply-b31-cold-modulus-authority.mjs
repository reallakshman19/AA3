#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
let text = fs.readFileSync(path, 'utf8');

const oldCall = '  const material = buildMaterial(sourceRows, caseMode, solveProfile, benchmarkPackage);';
const newCall = '  const material = buildMaterial(sourceRows, solveProfile, benchmarkPackage);';
assert.equal(count(text, oldCall), 1, 'expected exactly one legacy buildMaterial call');
text = text.replace(oldCall, newCall);

const oldBlock = `function buildMaterial(sourceRows, caseMode, solveProfile, benchmarkPackage) {
  const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(caseMode.thermal ? row.HOT_MOD1 : row.MODULUS)));
  const poissonValues = uniqueNumbers(sourceRows.map((row) => Number(row.POISSONS)));
  const densityValues = uniqueNumbers(sourceRows.map((row) => density(row.PIPE_DENSITY)));
  if (elasticValues.length !== 1 || poissonValues.length !== 1 || densityValues.length !== 1) {
    throw new TypeError('The current ACCDB linear solve requires one material state per selected case.');
  }
  const evaluationTemperature = caseMode.thermal
    ? Math.max(...sourceRows.map((row) => Number(row.TEMP_EXP_C1) + CELSIUS_TO_KELVIN))
    : benchmarkPackage.model.installationTemperatureK;
  const elasticModulus = elasticValues[0] * KPA_TO_PA;
`;

const newBlock = `function buildMaterial(sourceRows, solveProfile, benchmarkPackage) {
  // CAESAR II flexibility analysis for B31.3 uses the cold/reference elastic
  // modulus Ec. HOT_MOD1 (Eh) is retained as source custody but must not be
  // selected merely because a physical case contains temperature loading.
  const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(row.MODULUS)));
  const poissonValues = uniqueNumbers(sourceRows.map((row) => Number(row.POISSONS)));
  const densityValues = uniqueNumbers(sourceRows.map((row) => density(row.PIPE_DENSITY)));
  if (elasticValues.length !== 1 || poissonValues.length !== 1 || densityValues.length !== 1) {
    throw new TypeError('The current ACCDB linear solve requires one material state per selected case.');
  }
  const evaluationTemperature = benchmarkPackage.model.installationTemperatureK;
  const elasticModulus = elasticValues[0] * KPA_TO_PA;
`;
assert.equal(count(text, oldBlock), 1, 'expected exactly one legacy hot/cold material-selection block');
text = text.replace(oldBlock, newBlock);

const oldState = "      materialStateId: `ACCDB-MAT-${caseMode.thermal ? 'HOT1' : 'AMBIENT'}`,";
const newState = "      materialStateId: 'ACCDB-MAT-COLD-EC',";
assert.equal(count(text, oldState), 1, 'expected exactly one legacy temperature-dependent material state id');
text = text.replace(oldState, newState);

const limitationAnchor = "        'Bend stiffness uses the qualified B31.3/B31J factor calculator and true tangent-to-tangent arc components.',";
const limitation = "        'B31.3 flexibility stiffness uses the cold/reference elastic modulus Ec (ACCDB MODULUS); HOT_MOD1/Eh is not selected by thermal-case presence.',";
assert.equal(count(text, limitationAnchor), 1, 'expected one mechanics limitation anchor');
assert.equal(count(text, limitation), 0, 'cold-modulus limitation already present');
text = text.replace(limitationAnchor, `${limitationAnchor}\n${limitation}`);

assert.equal(text.includes('caseMode.thermal ? row.HOT_MOD1 : row.MODULUS'), false);
assert.equal(text.includes("materialStateId: 'ACCDB-MAT-COLD-EC'"), true);
fs.writeFileSync(path, text);
console.log(JSON.stringify({
  check: 'lfea-issue947-apply-b31-cold-modulus-authority',
  status: 'PASS',
  path,
  rule: 'B31_3_FLEXIBILITY_USES_COLD_EC',
  sourceField: 'INPUT_BASIC_ELEMENT_DATA.MODULUS',
  excludedAsCaseSelector: 'INPUT_BASIC_ELEMENT_DATA.HOT_MOD1',
}, null, 2));

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}
