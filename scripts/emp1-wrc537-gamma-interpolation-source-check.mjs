#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ledgerPath='validation/emp1/wrc537-2013/non-tabulated-gamma-interpolation-source-qualification-v1.json';
const capabilityPath='validation/emp1/wrc537-2013/exact-gamma-capability-v1.json';
const routePath='validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json';
const reconciliationPath='docs/emp1/EMP1_MAIN_RECONCILIATION_20260820.md';

const [ledger,capability,route,reconciliation]=await Promise.all([
  readJson(ledgerPath),
  readJson(capabilityPath),
  readJson(routePath),
  readFile(reconciliationPath,'utf8'),
]);

const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';

assert.equal(ledger.schema,'emp1-wrc537-non-tabulated-gamma-interpolation-source-qualification/v1');
assert.equal(ledger.status,'BLOCKED_PRIMARY_GAMMA_INTERPOLATION_RULE_UNQUALIFIED');
assert.equal(ledger.engineeringAuthority,true);
assert.equal(ledger.productionInterpolationAuthority,false);
assert.equal(ledger.productionRouteExpansionAuthority,false);
assert.equal(ledger.globalEmp1CRouteAuthority,false);
assert.equal(ledger.releaseQualified,false);
assert.equal(ledger.productionObservationUsedToSetAuthority,false);
assert.equal(ledger.grounding.sourceDocumentSha256,sourceSha);

assert.equal(capability.source.rawPdfSha256,sourceSha);
assert.equal(capability.status,'PASS_BOUNDED_EXACT_TABULATED_GAMMA_SELECTION');
assert.equal(capability.engineeringAuthority,true);
assert.equal(capability.productionAuthority,false);
assert.equal(capability.fullMethodAuthority,false);
assert.equal(capability.qualifiedDomain.gammaSelection,'EXACT_SOURCE_TABULATED_GAMMA_ONLY');
assert.equal(capability.qualifiedDomain.machineRoundOffRelativeTolerance,1e-12);
assert.equal(capability.qualifiedDomain.nonTabulatedGamma,'BLOCKED_NO_INTERPOLATION_AUTHORITY');
assert.equal(capability.qualifiedDomain.interpolationUsed,false);
assert.equal(capability.qualifiedDomain.originalVsExtrapolated,'EXPLICIT_VARIANT_REQUIRED_NO_FALLBACK');
assert.equal(capability.qualifiedDomain.blankGammaRows,'UNSELECTABLE');
assert.equal(capability.qualificationEvidence.nonTabulatedMidpointFalsifier,'PASS_BLOCKED');
assert.equal(capability.qualificationEvidence.crossVariantFallbackFalsifier,'PASS_BLOCKED');
assert.equal(capability.authorization.nonTabulatedGammaEngineeringUse,false);

assert.equal(ledger.existingExactGammaAuthority.gammaSelection,capability.qualifiedDomain.gammaSelection);
assert.equal(ledger.existingExactGammaAuthority.machineRoundOffRelativeTolerance,capability.qualifiedDomain.machineRoundOffRelativeTolerance);
assert.equal(ledger.existingExactGammaAuthority.nonTabulatedGamma,capability.qualifiedDomain.nonTabulatedGamma);
assert.equal(ledger.existingExactGammaAuthority.interpolationUsed,false);
assert.equal(ledger.existingExactGammaAuthority.independentExactGammaOracleHash,capability.qualificationEvidence.independentExactGammaOracleHash);

assert.equal(ledger.retainedSourceObservation.rationalCurveFitIndependentVariable,'BETA');
assert.equal(ledger.retainedSourceObservation.exactGammaRowsPresent,true);
assert.equal(ledger.retainedSourceObservation.explicitGammaInterpolationRuleRetained,false);
assert.equal(ledger.retainedSourceObservation.directPrimaryPageReobservationForGammaInterpolation,'NOT_RUN_IN_CURRENT_CONNECTED_ENVIRONMENT');

for(const key of ['interpolationQuantity','interpolationCoordinate','bracketingPolicy','betaDomainPolicy']){
  assert.equal(ledger.requiredProductionSemanticsBeforeImplementation[key],null,`${key} must remain unresolved/null`);
}
assert.equal(ledger.requiredProductionSemanticsBeforeImplementation.variantMixingAllowed,false);
assert.equal(ledger.requiredProductionSemanticsBeforeImplementation.blankRowCrossingAllowed,false);
assert.equal(ledger.requiredProductionSemanticsBeforeImplementation.gammaExtrapolationAllowed,false);
assert.ok(ledger.unresolvedInterpolationAuthority.length>=13);

for(const prohibition of [
  'DO_NOT_ASSUME_LINEAR_GAMMA_INTERPOLATION',
  'DO_NOT_ASSUME_LOG_GAMMA_INTERPOLATION',
  'DO_NOT_INTERPOLATE_RATIONAL_COEFFICIENTS_WITHOUT_PRIMARY_SOURCE_AUTHORITY',
  'DO_NOT_INFER_INTERPOLATION_RULE_FROM_SMOOTH_NUMERICAL_OUTPUT',
  'DO_NOT_INTERPOLATE_ACROSS_BLANK_GAMMA_ROW',
  'DO_NOT_MIX_ORIGINAL_AND_EXTRAPOLATED_VARIANTS_WITHOUT_SOURCE_AUTHORITY',
  'DO_NOT_BYPASS_BETA_CURVE_DOMAIN_LIMITS_DURING_GAMMA_INTERPOLATION',
  'DO_NOT_EXTRAPOLATE_GAMMA_OUTSIDE_SOURCE_ROWS',
  'DO_NOT_ENABLE_NON_TABULATED_GAMMA_PRODUCTION',
]) assert.ok(ledger.prohibitions.includes(prohibition));

assert.equal(ledger.currentDecision.authorizedSelectionPolicy,'EXACT_SOURCE_TABULATED_GAMMA_ONLY');
assert.equal(ledger.currentDecision.nonTabulatedGammaAuthorized,false);
assert.equal(ledger.currentDecision.gammaInterpolationAuthorized,false);
assert.equal(ledger.currentDecision.gammaExtrapolationAuthorized,false);

assert.equal(route.semanticPayload.scope.gammaSelectionPolicy,'EXACT_SOURCE_TABULATED_GAMMA_ONLY');
assert.equal(route.semanticPayload.scope.interpolationAllowed,false);
assert.equal(route.productionRouteAuthority,false);
assert.equal(route.authorization.boundedRouteRegistrationAllowed,false);
assert.ok(route.semanticPayload.prohibitions.includes('NON_TABULATED_GAMMA'));
assert.ok(route.semanticPayload.prohibitions.includes('INTERPOLATION'));

assert.match(reconciliation,/non-tabulated γ interpolation: BLOCKED/u);
assert.match(reconciliation,/additional exact-tabulated γ routes/u);

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma-interpolation-source-check/v1',
  status:'PASS_EXPECTED_BLOCKED_NON_TABULATED_GAMMA_INTERPOLATION',
  sourceSha256:sourceSha,
  authorizedGammaSelection:'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
  machineRoundOffRelativeTolerance:1e-12,
  interpolationRuleQualified:false,
  interpolationQuantity:null,
  interpolationCoordinate:null,
  betaDomainPolicy:null,
  nonTabulatedGammaAuthorized:false,
  gammaExtrapolationAuthorized:false,
  productionRouteExpansionAuthority:false,
  globalEmp1CRouteAuthority:false,
  releaseQualified:false,
},null,2));

async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}
