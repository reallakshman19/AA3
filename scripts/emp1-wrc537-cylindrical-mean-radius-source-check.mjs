import assert from 'node:assert/strict';
import fs from 'node:fs';

const ledgerPath = new URL('../validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json', import.meta.url);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

assert.equal(
  ledger.status,
  'BLOCKED_PRIMARY_CYLINDRICAL_RADIUS_DEFINITION_UNRESOLVED',
);
assert.equal(ledger.sourceCustody.legacyExtraction.status, 'NOT_READY_FOR_IMPLEMENTATION');
assert.equal(ledger.sourceCustody.legacyExtraction.retainedCylindricalNotation, 'Rc');
assert.equal(
  ledger.sourceCustody.legacyExtraction.exactGeometricDefinition,
  'UNRESOLVED_EXACT_DEFINITION_NOT_OCR_READABLE',
);
assert.equal(
  ledger.currentSoftwareObservation.derivation,
  'meanRadius = pipeOutsideDiameter/2 - assessmentPipeThickness/2',
);
assert.equal(
  ledger.currentSoftwareObservation.classification,
  'INTERNALLY_DETERMINISTIC_SOFTWARE_DERIVATION_NOT_PRIMARY_WRC_RADIUS_AUTHORITY',
);

for (const key of [
  'cylindricalSourceSymbolQualified',
  'cylindricalMeanRadiusDefinitionQualified',
  'outsideDiameterToMeanRadiusConstructionQualified',
  'insideDiameterToMeanRadiusConstructionQualified',
  'assessmentGeometryConsistencyQualified',
  'localDiameterOrOvalityTreatmentQualified',
  'locallyThickenedOrTaperedShellTreatmentQualified',
  'sphericalRadiusSemanticsTransferAuthorized',
  'engineeringUseAuthorized',
  'productionUseAuthorized',
]) {
  assert.equal(ledger.authority[key], false, `${key} must remain false`);
}

assert.equal(ledger.collateralAuthorityWidened, false);
assert.equal(ledger.productionNumericsChanged, false);
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_IMPORT_SPHERICAL_RM_DEFINITION_INTO_CYLINDRICAL_ROUTE',
));
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_CURRENT_OD_OVER_2_MINUS_T_OVER_2_AS_UNIVERSAL_WRC_RULE',
));

console.log('EMP1-33 cylindrical mean-radius source boundary retained');
