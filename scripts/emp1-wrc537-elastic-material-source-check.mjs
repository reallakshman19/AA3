import assert from 'node:assert/strict';
import fs from 'node:fs';

const ledgerPath = new URL('../validation/emp1/wrc537-2013/elastic-material-source-qualification-v1.json', import.meta.url);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

assert.equal(
  ledger.status,
  'BLOCKED_PRIMARY_ELASTIC_MATERIAL_AND_SHELL_THEORY_AUTHORITY_UNRESOLVED',
);
assert.equal(ledger.sourceCustody.legacyExtraction.status, 'NOT_READY_FOR_IMPLEMENTATION');
assert.equal(
  ledger.sourceCustody.legacyExtraction.retainedNomenclature.E,
  'MODULUS_OF_ELASTICITY_OF_SHELL_MATERIAL',
);
assert.equal(ledger.currentSoftwareObservation.materialModulusConsumed, false);
assert.equal(ledger.currentSoftwareObservation.poissonRatioConsumed, false);
assert.equal(ledger.currentSoftwareObservation.yieldStrengthConsumed, false);
assert.equal(ledger.currentSoftwareObservation.constitutiveModelConsumed, false);
assert.equal(
  ledger.currentSoftwareObservation.classification,
  'SOFTWARE_NON_USE_IS_NOT_ENGINEERING_MATERIAL_INDEPENDENCE_AUTHORITY',
);

for (const [key, value] of Object.entries(ledger.authority)) {
  assert.equal(value, false, `${key} must remain false`);
}

assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_ABSENT_MATERIAL_INPUT_AS_UNIVERSAL_MATERIAL_INDEPENDENCE',
));
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_INVENT_POISSON_RATIO_OR_MODULUS_CORRECTION',
));
assert.equal(ledger.collateralAuthorityWidened, false);
assert.equal(ledger.productionNumericsChanged, false);

console.log('EMP1-34 elastic material/source-theory boundary retained');
