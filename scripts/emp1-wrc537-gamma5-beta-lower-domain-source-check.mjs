#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ledgerPath='validation/emp1/wrc537-2013/gamma5-beta-lower-domain-source-qualification-v1.json';
const domainPath='validation/emp1/wrc537-2013/cylindrical-original-bounded-domain-v1.json';
const table5Path='validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json';
const longitudinalPath='src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js';
const routeQualificationPath='validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json';

const [ledger,domain,table5,longitudinalSource,routeQualification]=await Promise.all([
  readJson(ledgerPath),
  readJson(domainPath),
  readJson(table5Path),
  readFile(longitudinalPath,'utf8'),
  readJson(routeQualificationPath),
]);

const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const expectedRouteFigures=[
  '1A','2A','3A','4A',
  '1B','2B','3B','4B',
  '1C','1C-1','2C','2C-1','3C','4C',
];

assert.equal(ledger.schema,'emp1-wrc537-gamma5-beta-lower-domain-source-qualification/v1');
assert.equal(ledger.status,'BLOCKED_BETA_BELOW_0P05_PRIMARY_LOWER_ENDPOINT_UNQUALIFIED');
assert.equal(ledger.engineeringAuthority,true);
assert.equal(ledger.productionRouteExpansionAuthority,false);
assert.equal(ledger.gamma5ProductionRouteAuthority,false);
assert.equal(ledger.globalEmp1CRouteAuthority,false);
assert.equal(ledger.releaseQualified,false);
assert.equal(ledger.productionObservationUsedToSetAuthority,false);
assert.equal(ledger.grounding.sourceDocumentSha256,sourceSha);
assert.equal(domain.source.rawPdfSha256,sourceSha);

assert.deepEqual(domain.qualifiedProductDomain.gamma.allowedValues,[5]);
assert.equal(domain.qualifiedProductDomain.variant,'ORIGINAL');
assert.equal(domain.qualifiedProductDomain.beta.minimum,0.05);
assert.equal(domain.qualifiedProductDomain.beta.minimumInclusive,true);
assert.equal(domain.qualifiedProductDomain.beta.minimumClassification,'CONSERVATIVE_PRODUCT_BOUNDARY_INSIDE_ALL_REVIEWED_GAMMA5_CURVES_NOT_CLAIMED_AS_GENERAL_WRC_LIMIT');
assert.equal(domain.qualifiedProductDomain.beta.maximum,0.5);
assert.equal(domain.qualifiedProductDomain.beta.maximumInclusive,true);
assert.equal(domain.qualifiedProductDomain.beta.maximumClassification,'PRIMARY_CHART_LIMIT_FOR_GAMMA5_REQUIRED_ORIGINAL_CURVES');

assert.deepEqual(ledger.actualEightPointRouteOriginalFigures,expectedRouteFigures);
assert.equal(new Set(ledger.actualEightPointRouteOriginalFigures).size,14);

const table5Figures=new Set();
for(const family of Object.values(table5.figureAuthority)){
  for(const row of Object.values(family)){
    for(const figure of row.allowedFigures??[]) table5Figures.add(figure);
  }
}
for(const figure of ['1A','2A','3A','4A','3B','4B','1C','1C-1','2C','2C-1','3C','4C']) assert.ok(table5Figures.has(figure),`Table5 source interpretation missing ${figure}`);
assert.match(longitudinalSource,/circumferentialFigure: '1B'/u);
assert.match(longitudinalSource,/longitudinalFigure: '2B'/u);
assert.match(longitudinalSource,/circumferentialFigure: '1B-1'/u);
assert.match(longitudinalSource,/longitudinalFigure: '2B-1'/u);
assert.match(longitudinalSource,/authorizedByThisRoute: false/u);

assert.equal(ledger.retainedSourceEvidence.curveLimitSection,'4.4');
assert.equal(ledger.retainedSourceEvidence.curveLimitRule,'ORIGINAL_CURVES_MUST_NOT_BE_USED_BEYOND_LIMITS_INDICATED');
assert.equal(ledger.retainedSourceEvidence.gamma5CoverageObservedForCurrentProductBand,true);
assert.deepEqual(ledger.retainedSourceEvidence.observedProductBand,{minimum:0.05,maximum:0.5});
assert.equal(ledger.retainedSourceEvidence.exactNumericLowerEndpointsRetainedForCompleteRouteSet,false);
assert.equal(ledger.retainedSourceEvidence.directPrimaryPageReobservationForLowerEndpoints,'NOT_RUN_IN_CURRENT_CONNECTED_ENVIRONMENT');
assert.equal(ledger.retainedSourceEvidence.graphicalDigitizationAuthorizedForProductionAuthority,false);
assert.equal(ledger.retainedSourceEvidence.rationalFitEndpointInferenceAuthorized,false);
assert.equal(ledger.retainedSourceEvidence.coefficientPresenceIsDomainAuthority,false);
assert.equal(ledger.lowerDomainDecision.betaBelow0p05Authorized,false);
assert.equal(ledger.lowerDomainDecision.exactQualifiedMinimumBeta,0.05);
assert.ok(ledger.unresolvedSourceItems.length>=15);

for(const prohibition of [
  'DO_NOT_INFER_LOWER_BETA_ENDPOINT_FROM_RATIONAL_FIT_BEHAVIOR',
  'DO_NOT_TREAT_COEFFICIENT_EXISTENCE_AS_CURVE_DOMAIN_AUTHORITY',
  'DO_NOT_DIGITIZE_GRAPHICAL_LOWER_ENDPOINT_FOR_PRODUCTION_AUTHORITY_WITHOUT_SEPARATE_AUTHORIZATION',
  'DO_NOT_USE_EXTRAPOLATED_CURVES_AS_ORIGINAL_FALLBACK',
  'DO_NOT_SUBSTITUTE_OFF_AXIS_1B_MINUS_1_2B_MINUS_1_INTO_EIGHT_POINT_ROUTE',
  'DO_NOT_WIDEN_BETA_ABOVE_0P5',
  'DO_NOT_ENABLE_BETA_BELOW_0P05_PRODUCTION_ROUTE',
]) assert.ok(ledger.prohibitions.includes(prohibition));

assert.equal(routeQualification.semanticPayload.scope.gamma,5);
assert.equal(routeQualification.semanticPayload.scope.betaMinimum,0.05);
assert.equal(routeQualification.semanticPayload.scope.betaMaximum,0.5);
assert.equal(routeQualification.productionRouteAuthority,false);
assert.equal(routeQualification.authorization.boundedRouteRegistrationAllowed,false);
assert.ok(routeQualification.semanticPayload.prohibitions.includes('BETA_OUTSIDE_0P05_TO_0P5'));

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma5-beta-lower-domain-source-check/v1',
  status:'PASS_EXPECTED_BLOCKED_BETA_BELOW_0P05',
  sourceSha256:sourceSha,
  actualEightPointRouteOriginalFigures:expectedRouteFigures,
  routeFigureCount:expectedRouteFigures.length,
  qualifiedBetaMinimum:0.05,
  qualifiedBetaMaximum:0.5,
  betaBelow0p05Authorized:false,
  betaAbove0p5Authorized:false,
  primaryNumericLowerEndpointsComplete:false,
  productionRouteExpansionAuthority:false,
  globalEmp1CRouteAuthority:false,
  releaseQualified:false,
},null,2));

async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}
