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

const ledgerPath = new URL('../validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json', import.meta.url);
const retainedPath = new URL('../docs/emp1/WRC537_2013_Tables_and_Charts.md', import.meta.url);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const retained = fs.readFileSync(retainedPath, 'utf8');

assert.equal(
  ledger.status,
  'BLOCKED_PARTIAL_PRIMARY_4_2_1_MID_RADIUS_QUALIFIED_ASSESSMENT_GEOMETRY_BASIS_UNQUALIFIED',
);
assert.equal(ledger.sourceCustody.rawSha256,
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');
assert.equal(ledger.sourceCustody.gitBlobSha1,
  'ce861233928154145a9257efbbf8dbef3f5a17d1');
assert.equal(ledger.sourceCustody.primaryBinaryPageReobservedThisIncrement, false);
assert.equal(ledger.sourceCustody.primaryBinaryObservationState,
  'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT');

const observed = ledger.sourceCustody.externalPrimaryTextObservation;
assert.equal(observed.state, 'DIRECT_PRIMARY_DOCUMENT_TEXT_OBSERVED_EXTERNAL_RENDERING');
assert.equal(observed.documentTitle,
  'WRC 537 - Local Stresses in Spherical and Cylindrical Shells Due to External Loading');
assert.equal(observed.editionYear, 2013);
assert.equal(observed.copyrightOwner, 'Welding Research Council');
assert.equal(observed.renderingUrl, 'https://studylib.net/doc/25312294/wrc-537-');
assert.equal(observed.pinnedPdfByteIdentityWithRendering, 'UNPROVEN');
assert.equal(observed.classification,
  'PRIMARY_DOCUMENT_CONTENT_OBSERVATION_NOT_PINNED_BINARY_BYTE_REOBSERVATION');
assert.deepEqual(
  observed.locators.map((row) => row.section),
  [
    '1.3 Nomenclature Applicable to Cylindrical Shells',
    '4.2.1 Shell Parameter',
    '4.2.2.1 Round Attachment',
    '4.5 Limits On Application',
  ],
);
assert.equal(observed.locators[1].equation, 25);
assert.equal(observed.locators[2].equation, 26);

assert.equal(ledger.sourceCustody.retainedTable5.table, 'Table 5');
assert.equal(ledger.sourceCustody.retainedTable5.pages, '41-42');
assert.equal(ledger.sourceCustody.retainedTable5.geometryLabel, 'Vessel Radius');
assert.equal(ledger.sourceCustody.retainedTable5.renderedSymbol, 'R_m');
assert.equal(ledger.sourceCustody.retainedTable5.gammaRelationship, 'gamma = R_m / T');
assert.equal(ledger.sourceCustody.retainedTable5.betaRelationship, 'beta = 0.875 * r_o / R_m');

assert.match(retained, /Table 5[^\n]*Computation Sheet for Local Stresses in Cylindrical Shells/i);
assert.match(retained, /Pages 41[^0-9]*42/);
assert.match(retained, /Vessel Radius\s*\|\s*R\s*=\s*m/i);
assert.match(retained, /R\s*γ=\s*m\s*=\s*T/i);
assert.match(retained, /r\s*β=\(0\.875\)\s*o\s*=\s*R\s*m/i);

for (const key of [
  'cylindricalSourceSymbolRmQualified',
  'cylindricalMeanRadiusMeaningQualified',
  'cylindricalMidRadiusMeaningQualified',
  'shellThicknessSymbolTQualified',
  'rmUsedInGammaQualified',
  'rmUsedInBetaQualified',
  'section45UsesSameCylindricalRmQualified',
]) {
  assert.equal(ledger.sourceAuthority[key], true, key);
}
for (const key of [
  'odIdThicknessAssessmentConstructionQualified',
  'corrosionOrAssessmentGeometryPolicyQualified',
  'localDiameterOrOvalityTreatmentQualified',
  'locallyThickenedOrTaperedShellTreatmentQualified',
]) {
  assert.equal(ledger.sourceAuthority[key], false, `UNRESOLVED_MUST_REMAIN_FALSE:${key}`);
}

assert.equal(
  ledger.engineeringGeometryIdentity.classification,
  'ELEMENTARY_CYLINDRICAL_GEOMETRY_NOT_WRC_CORROSION_POLICY',
);
assert.match(ledger.engineeringGeometryIdentity.conditionalIdentity, /R_m = .*D_o\/2 - T\/2/);
assert.equal(ledger.engineeringGeometryIdentity.wrcSpecificSourceRuleClaimed, false);

assert.equal(
  ledger.authorityScope,
  'THIS_SOURCE_QUALIFICATION_RECORD_ONLY_NOT_CURRENT_BOUNDED_ROUTE_AUTHORITY',
);
for (const key of [
  'cylindricalSourceSymbolQualified',
  'cylindricalRadiusParameterRoleQualified',
  'cylindricalMeanRadiusPhysicalDefinitionQualified',
  'section45CylindricalRadiusIdentityQualified',
  'outsideDiameterToMeanRadiusGeometryIdentityQualifiedConditionally',
  'insideDiameterToMeanRadiusGeometryIdentityQualifiedConditionally',
]) {
  assert.equal(ledger.authority[key], true, key);
}
for (const key of [
  'assessmentGeometryConsistencyQualified',
  'corrosionGeometryPolicyQualified',
  'localDiameterOrOvalityTreatmentQualified',
  'locallyThickenedOrTaperedShellTreatmentQualified',
  'sphericalRadiusSemanticsTransferAuthorized',
  'engineeringUseAuthorized',
  'productionUseAuthorized',
]) {
  assert.equal(ledger.authority[key], false, `${key} must remain false`);
}

const route = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find(
  (entry) => entry.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
);
assert.ok(route, 'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_REGISTRY_ROW_REQUIRED');
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, true);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.engineeringUseAuthorized, true);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized, true);
assert.equal(route.registered, true);
assert.equal(route.engineeringUseAuthorized, true);
assert.equal(route.globalEmp1CRouteAuthority, false);
assert.equal(route.releaseQualified, false);
assert.deepEqual(ledger.currentBoundedRouteState, {
  routeId: EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  routeAuthorized: true,
  registryRegistered: true,
  boundedEngineeringUseAuthorized: true,
  boundedProductionUseAuthorized: true,
  globalEmp1CRouteAuthority: false,
  codeComplianceAuthority: false,
  releaseQualified: false,
});
assert.equal(
  ledger.authorityInvariant,
  'PRIMARY_RM_MID_RADIUS_SEMANTICS_DO_NOT_AUTHORIZE_UNPROVEN_ASSESSMENT_OR_CORROSION_GEOMETRY_POLICY',
);

assert.equal(
  ledger.currentSoftwareObservation.derivation,
  'meanRadius = pipeOutsideDiameter/2 - assessmentPipeThickness/2',
);
assert.equal(
  ledger.currentSoftwareObservation.upstreamSectionConstruction,
  'innerRadius = outsideDiameter/2 - assessmentPipeThickness',
);
assert.equal(ledger.currentSoftwareObservation.productionNumericsChangedByThisReconciliation, false);
assert.equal(ledger.collateralAuthorityWidened, false);
assert.equal(ledger.productionNumericsChanged, false);
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_EXTERNAL_TEXT_RENDERING_AS_PINNED_PDF_BYTE_REOBSERVATION',
));
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_PRIMARY_MID_RADIUS_DEFINITION_AS_NOMINAL_CORRODED_OR_MEASURED_GEOMETRY_POLICY',
));
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_CURRENT_OD_OVER_2_MINUS_T_OVER_2_AS_VALID_IF_OD_AND_T_DESCRIBE_DIFFERENT_PHYSICAL_STATES',
));

console.log('PASS_PRIMARY_CYLINDRICAL_MID_RADIUS_SEMANTICS_ASSESSMENT_GEOMETRY_POLICY_STILL_BLOCKED');
