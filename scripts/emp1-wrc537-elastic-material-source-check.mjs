import assert from 'node:assert/strict';
import fs from 'node:fs';

const ledgerPath = new URL('../validation/emp1/wrc537-2013/elastic-material-source-qualification-v1.json', import.meta.url);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

assert.equal(
  ledger.status,
  'BLOCKED_PRIMARY_ELASTIC_MATERIAL_AND_SHELL_THEORY_AUTHORITY_UNRESOLVED',
);
assert.equal(ledger.sourceCustody.primaryBinaryPageReobservedThisIncrement, false);
assert.equal(
  ledger.sourceCustody.primaryBinaryObservationStatus,
  'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT',
);

const table5 = ledger.sourceCustody.retainedPrimaryTranscription;
assert.equal(table5.path, 'docs/emp1/WRC537_2013_Tables_and_Charts.md');
assert.equal(table5.table, 'Table 5 - Computation Sheet for Local Stresses in Cylindrical Shells');
assert.deepEqual(table5.pdfPages, [41, 42]);
assert.deepEqual(table5.explicitInputGroups.appliedLoads, ['P', 'Mc', 'Ml', 'Mt', 'Vc', 'Vl']);
assert.deepEqual(table5.explicitInputGroups.geometry, ['T', 'r0', 'Rm']);
assert.deepEqual(table5.explicitInputGroups.geometricParameters, ['gamma', 'beta']);
assert.deepEqual(table5.explicitInputGroups.stressConcentrationFactors, ['Kn', 'Kb']);
assert.equal(table5.explicitMaterialModulusInputPresent, false);
assert.equal(table5.explicitPoissonRatioInputPresent, false);
assert.equal(table5.displayedStressEquationsContainExplicitMaterialModulus, false);
assert.equal(table5.displayedStressEquationsContainExplicitPoissonRatio, false);
assert.equal(
  table5.qualificationBoundary,
  'TABLE5_COMPUTATION_SHEET_EXPLICIT_INPUT_AND_DISPLAYED_EQUATION_CONTENT_ONLY',
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

for (const key of [
  'explicitMaterialModulusInputAbsent',
  'explicitPoissonRatioInputAbsent',
  'displayedStressEquationsExplicitMaterialModulusFree',
  'displayedStressEquationsExplicitPoissonRatioFree',
]) assert.equal(ledger.retainedTable5Conclusions[key], true, `TABLE5_CONCLUSION_MUST_BE_TRUE:${key}`);

for (const key of [
  'provesAbsoluteModulusIndependence',
  'provesPoissonRatioIrrelevance',
  'provesUniversalMaterialApplicability',
  'provesConstitutiveOrShellTheoryApplicability',
]) assert.equal(ledger.retainedTable5Conclusions[key], false, `TABLE5_INFERENCE_MUST_REMAIN_FALSE:${key}`);

assert.equal(ledger.authority.table5ExplicitMaterialInputNonUseQualified, true);
assert.equal(ledger.authority.table5DisplayedStressEquationExplicitMaterialInputNonUseQualified, true);
for (const key of [
  'modulusRoleQualified',
  'absoluteModulusIndependenceQualified',
  'poissonRatioTreatmentQualified',
  'homogeneousIsotropicLinearElasticAssumptionQualified',
  'thinShellSmallDeformationAssumptionQualified',
  'hostAttachmentMaterialRelationshipQualified',
  'temperatureDependentModulusTreatmentQualified',
  'nonlinearPlasticCreepApplicabilityQualified',
  'anisotropicOrthotropicCompositeApplicabilityQualified',
  'materialDiscontinuityApplicabilityQualified',
  'engineeringUseAuthorized',
  'productionUseAuthorized',
]) assert.equal(ledger.authority[key], false, `${key} must remain false`);

for (const code of [
  'DO_NOT_TREAT_TABLE5_EXPLICIT_E_NON_USE_AS_PROOF_OF_ABSOLUTE_MODULUS_INDEPENDENCE',
  'DO_NOT_TREAT_TABLE5_EXPLICIT_NU_NON_USE_AS_PROOF_OF_POISSON_RATIO_IRRELEVANCE',
  'DO_NOT_TREAT_ABSENT_MATERIAL_INPUT_AS_UNIVERSAL_MATERIAL_INDEPENDENCE',
  'DO_NOT_INVENT_POISSON_RATIO_OR_MODULUS_CORRECTION',
]) assert.ok(ledger.prohibitedInferences.includes(code), `MISSING_PROHIBITION:${code}`);

for (const key of [
  'productionMaterialInputsChanged',
  'productionNumericsChanged',
  'table5EvaluatorChanged',
  'routeRegistryChanged',
  'aggregateP0GateChanged',
  'codeComplianceAuthority',
  'releaseAuthority',
]) assert.equal(ledger.authorityEffect[key], false, `AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

assert.equal(ledger.collateralAuthorityWidened, false);
assert.equal(ledger.productionNumericsChanged, false);

console.log('PASS_RETAINED_TABLE5_MATERIAL_INPUT_NON_USE_PHYSICAL_MATERIAL_THEORY_STILL_BLOCKED');
