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
  'BLOCKED_PARTIAL_TABLE5_RM_SYMBOL_AND_PARAMETER_ROLE_PHYSICAL_RADIUS_DEFINITION_UNQUALIFIED',
);
assert.equal(ledger.sourceCustody.rawSha256,
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');
assert.equal(ledger.sourceCustody.gitBlobSha1,
  'ce861233928154145a9257efbbf8dbef3f5a17d1');
assert.equal(ledger.sourceCustody.primaryBinaryPageReobservedThisIncrement, false);
assert.equal(ledger.sourceCustody.primaryBinaryObservationState,
  'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT');

assert.equal(ledger.sourceCustody.retainedTable5.table, 'Table 5');
assert.equal(ledger.sourceCustody.retainedTable5.pages, '41-42');
assert.equal(ledger.sourceCustody.retainedTable5.geometryLabel, 'Vessel Radius');
assert.equal(ledger.sourceCustody.retainedTable5.renderedSymbol, 'R_m');
assert.equal(ledger.sourceCustody.retainedTable5.gammaRelationship, 'gamma = R_m / T');
assert.equal(ledger.sourceCustody.retainedTable5.betaRelationship, 'beta = 0.875 * r_o / R_m');

// Retained Table-5 transcription must contain the cylindrical geometry block and use R_m in gamma/beta.
assert.match(retained, /Table 5[^\n]*Computation Sheet for Local Stresses in Cylindrical Shells/i);
assert.match(retained, /Pages 41[^0-9]*42/);
assert.match(retained, /Vessel Radius\s*\|\s*R\s*=\s*m/i);
assert.match(retained, /R\s*γ=\s*m\s*=\s*T/i);
assert.match(retained, /r\s*β=\(0\.875\)\s*o\s*=\s*R\s*m/i);

for (const key of [
  'cylindricalSourceSymbolRmQualified',
  'vesselRadiusGeometryInputRoleQualified',
  'rmUsedInGammaQualified',
  'rmUsedInBetaQualified',
]) {
  assert.equal(ledger.retainedTable5Authority[key], true, key);
}

for (const key of [
  'physicalMeanOrMidsurfaceMeaningQualified',
  'odIdThicknessConstructionQualified',
  'corrosionOrAssessmentGeometryBasisQualified',
  'section45RadiusIdentityQualifiedByThisIncrement',
]) {
  assert.equal(ledger.retainedTable5Authority[key], false, `UNRESOLVED_MUST_REMAIN_FALSE:${key}`);
}

assert.equal(
  ledger.authorityScope,
  'THIS_SOURCE_QUALIFICATION_RECORD_ONLY_NOT_CURRENT_BOUNDED_ROUTE_AUTHORITY',
);
assert.equal(ledger.authority.cylindricalSourceSymbolQualified, true);
assert.equal(ledger.authority.cylindricalRadiusParameterRoleQualified, true);
for (const key of [
  'cylindricalMeanRadiusPhysicalDefinitionQualified',
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

// Current bounded runtime authority is independent of this source-record authority.
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
  'BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CYLINDRICAL_RM_PHYSICAL_DEFINITION_SOURCE_AUTHORITY',
);

assert.equal(
  ledger.currentSoftwareObservation.derivation,
  'meanRadius = pipeOutsideDiameter/2 - assessmentPipeThickness/2',
);
assert.equal(ledger.currentSoftwareObservation.productionNumericsChangedByThisReconciliation, false);
assert.equal(ledger.collateralAuthorityWidened, false);
assert.equal(ledger.productionNumericsChanged, false);
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_TABLE5_RM_SYMBOL_AS_PROOF_OF_MIDSURFACE_OR_MEAN_RADIUS_PHYSICAL_DEFINITION',
));
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_CURRENT_OD_OVER_2_MINUS_T_OVER_2_AS_UNIVERSAL_WRC_RULE',
));
assert.ok(ledger.prohibitedInferences.includes(
  'DO_NOT_TREAT_BOUNDED_ROUTE_AUTHORIZATION_AS_PRIMARY_SOURCE_PROOF_OF_RM_PHYSICAL_CONSTRUCTION',
));

console.log('PASS_CURRENT_AUTHORIZED_ROUTE_TABLE5_RM_ROLE_PHYSICAL_RADIUS_DEFINITION_STILL_BLOCKED');
