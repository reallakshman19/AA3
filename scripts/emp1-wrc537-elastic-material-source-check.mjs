import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';

const ledgerPath = new URL('../validation/emp1/wrc537-2013/elastic-material-source-qualification-v1.json', import.meta.url);
const professionalPath = new URL('../validation/emp1/release/emp1-professional-release-current-state-v1.json', import.meta.url);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const professional = JSON.parse(fs.readFileSync(professionalPath, 'utf8'));

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

assert.equal(ledger.authorityScope, 'THIS_SOURCE_RECORD_ONLY_NOT_LIVE_ROUTE_STATE');
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

const route = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find(
  (entry) => entry.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
);
assert.ok(route, 'CURRENT_BOUNDED_ROUTE_REQUIRED');
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, true);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.engineeringUseAuthorized, true);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized, true);
assert.equal(route.registered, true);
assert.equal(route.engineeringUseAuthorized, true);
assert.deepEqual([...route.suspensionReasons], []);
assert.equal(route.globalEmp1CRouteAuthority, false);
assert.equal(route.releaseQualified, false);

assert.equal(ledger.currentLiveRouteState.routeId, EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.equal(ledger.currentLiveRouteState.boundedRouteAuthorized, true);
assert.equal(ledger.currentLiveRouteState.registryRegistered, true);
assert.equal(ledger.currentLiveRouteState.boundedEngineeringUseAuthorized, true);
assert.equal(ledger.currentLiveRouteState.boundedProductionUseAuthorized, true);
assert.equal(ledger.currentLiveRouteState.globalEmp1CRouteAuthority, false);
assert.equal(ledger.currentLiveRouteState.codeComplianceAuthority, false);
assert.equal(ledger.currentLiveRouteState.releaseQualified, false);
assert.equal(ledger.currentLiveRouteState.professionalReleaseReady, false);

assert.equal(professional.runtimeAuthority.boundedProductionRouteAuthorized, true);
assert.equal(professional.runtimeAuthority.registryRegistered, true);
assert.equal(professional.runtimeAuthority.boundedEngineeringUseAuthorized, true);
assert.equal(professional.runtimeAuthority.globalEmp1CRouteAuthority, false);
assert.equal(professional.runtimeAuthority.codeComplianceAuthorized, false);
assert.equal(professional.runtimeAuthority.releaseQualified, false);
assert.equal(professional.sequenceStatus.professionalReleaseReady, false);
assert.equal(professional.releaseReady, false);

assert.equal(ledger.authoritySeparation.materialTheorySourceAuthority, false);
assert.equal(ledger.authoritySeparation.currentRouteMayExecuteUnderSeparateBoundedAuthorization, true);
assert.equal(ledger.authoritySeparation.currentRouteExecutionProvesMaterialTheoryAuthority, false);
assert.equal(ledger.authoritySeparation.routeAuthorizationMayBackPropagateIntoMaterialTheorySourceAuthority, false);
assert.equal(
  ledger.authoritySeparation.rule,
  'BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_ELASTIC_MATERIAL_OR_SHELL_THEORY_SOURCE_AUTHORITY',
);

for (const code of [
  'DO_NOT_TREAT_TABLE5_EXPLICIT_E_NON_USE_AS_PROOF_OF_ABSOLUTE_MODULUS_INDEPENDENCE',
  'DO_NOT_TREAT_TABLE5_EXPLICIT_NU_NON_USE_AS_PROOF_OF_POISSON_RATIO_IRRELEVANCE',
  'DO_NOT_TREAT_ABSENT_MATERIAL_INPUT_AS_UNIVERSAL_MATERIAL_INDEPENDENCE',
  'DO_NOT_INVENT_POISSON_RATIO_OR_MODULUS_CORRECTION',
  'DO_NOT_INFER_MATERIAL_OR_SHELL_THEORY_SOURCE_AUTHORITY_FROM_BOUNDED_ROUTE_AUTHORIZATION',
]) assert.ok(ledger.prohibitedInferences.includes(code), `MISSING_PROHIBITION:${code}`);

for (const key of [
  'productionMaterialInputsChanged',
  'productionNumericsChanged',
  'table5EvaluatorChanged',
  'routeRegistryChanged',
  'aggregateP0GateChanged',
  'thisRecordWidensBoundedRouteAuthority',
  'thisRecordGrantsMaterialTheorySourceAuthority',
  'globalEmp1CAuthorityChanged',
  'codeComplianceAuthorityChanged',
  'releaseAuthorityChanged',
  'codeComplianceAuthority',
  'releaseAuthority',
]) assert.equal(ledger.authorityEffect[key], false, `AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

assert.equal(ledger.collateralAuthorityWidened, false);
assert.equal(ledger.productionNumericsChanged, false);

console.log('PASS_CURRENT_AUTHORIZED_ROUTE_TABLE5_MATERIAL_INPUT_NON_USE_MATERIAL_THEORY_STILL_BLOCKED');
