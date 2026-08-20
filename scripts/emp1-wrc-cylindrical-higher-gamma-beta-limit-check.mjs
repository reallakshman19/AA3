#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseCylindricalExactGammaPackage } from './emp1-wrc-cylindrical-exact-gamma-lib.mjs';

const ledgerPath='validation/emp1/wrc537-2013/cylindrical-higher-gamma-beta-limit-ledger-v1.json';
const inheritedDomainPath='validation/emp1/wrc537-2013/cylindrical-original-bounded-domain-v1.json';
const extractionPath='docs/emp1/WRC537_2013_Tables_and_Charts.md';
const outputPath=process.argv[2]??null;
const [ledger,domain,markdown]=await Promise.all([readJson(ledgerPath),readJson(inheritedDomainPath),readFile(extractionPath,'utf8')]);
const pkg=parseCylindricalExactGammaPackage(markdown);

const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const expectedFigures=['1A','2A','3A','4A','1B-1','2B-1','3B','4B','1C','1C-1','2C','2C-1','3C','4C'];
const higherGammas=[7.5,10,15,25,35,50,75,100,150,200,300];
const probeFigures=['1C','2C'];

assert.equal(ledger.schema,'emp1-wrc537-cylindrical-higher-gamma-beta-limit-ledger/v1');
assert.equal(ledger.status,'BLOCKED_SOURCE_REPRESENTATION_REQUIRES_GRAPHICAL_DIGITIZATION');
assert.equal(ledger.productionRouteExpansionAuthority,false);
assert.equal(ledger.productionObservationUsedToSetAuthority,false);
assert.equal(ledger.source.rawPdfSha256,sourceSha);
assert.equal(domain.source.rawPdfSha256,sourceSha);
assert.equal(pkg.source.rawPdfSha256,sourceSha);
assert.equal(ledger.source.curveLimitAuthority.section,'4.4');
assert.equal(ledger.source.curveLimitAuthority.rule,'ORIGINAL_CURVES_MUST_NOT_BE_USED_BEYOND_LIMITS_INDICATED');
assert.equal(ledger.routeIntersectionPolicy.digitizationAllowedForProductionAuthority,false);
assert.equal(ledger.routeIntersectionPolicy.rationalFitUsedToInferChartEndpoint,false);
assert.equal(ledger.routeIntersectionPolicy.graphicalCoordinateReadingCountsAsDigitization,true);
assert.deepEqual(ledger.requiredTable5OriginalFigures.map((row)=>row.figure),expectedFigures);
assert.deepEqual(ledger.firstFailProbeFigures.map((row)=>row.figure),probeFigures);
assert.equal(domain.sourceChartReview.figure1COriginal.higherGammaCurvesHaveSourceDeletedOuterSegments,true);
assert.equal(domain.sourceChartReview.figure2COriginal.higherGammaCurvesHaveSourceDeletedOuterSegments,true);
assert.deepEqual(domain.qualifiedProductDomain.gamma.allowedValues,[5]);
assert.equal(domain.qualifiedProductDomain.beta.maximum,0.5);
assert.equal(ledger.existingQualifiedGamma5Route.gamma,5);
assert.equal(ledger.existingQualifiedGamma5Route.betaMinimum,0.05);
assert.equal(ledger.existingQualifiedGamma5Route.betaMaximum,0.5);
assert.equal(ledger.existingQualifiedGamma5Route.status,'PASS_ALREADY_QUALIFIED_IN_PR1291');

assert.equal(ledger.visualReobservation.status,'PASS_SOURCE_CHARTS_REOBSERVED_NO_EXACT_NUMERIC_HIGHER_GAMMA_ENDPOINTS');
assert.equal(ledger.visualReobservation.workflowRunId,32357165433);
assert.equal(ledger.visualReobservation.workflowRunNumber,1);
assert.equal(ledger.visualReobservation.artifactId,9402093459);
assert.equal(ledger.visualReobservation.renderDpi,220);
assert.equal(ledger.visualReobservation.renderMethod,'POPPLER_PDFTOPPM_NO_OCR');
assert.equal(ledger.visualReobservation.digitizationPerformed,false);
assert.equal(ledger.visualReobservation.productionObservationUsed,false);

const originalCurves=pkg.curves.filter((row)=>row.variant==='ORIGINAL');
const figureGammaSets=new Map();
for(const figure of expectedFigures){
  const gammas=originalCurves.filter((row)=>row.figure===figure).map((row)=>row.gamma).sort((a,b)=>a-b);
  figureGammaSets.set(figure,gammas);
  assert.ok(gammas.includes(5),`gamma=5 missing from ${figure}`);
}

const coefficientPresence=[];
for(const gamma of higherGammas){
  const assessment=ledger.higherExactTabulatedGammaAssessments.find((row)=>row.gamma===gamma);
  assert.ok(assessment,`ledger assessment missing gamma=${gamma}`);
  assert.equal(assessment.coefficientRowsPresentInProbeFigures,true);
  assert.equal(assessment.probeCurveEndpointBetaMaximum,null,`gamma=${gamma} must not carry inferred endpoint`);
  assert.equal(assessment.routeBetaIntersection,null,`gamma=${gamma} must not carry inferred route intersection`);
  assert.equal(assessment.status,'BLOCKED_SOURCE_ENDPOINT_REQUIRES_DIGITIZATION');
  const presence={gamma,figures:{}};
  for(const figure of probeFigures){
    const present=figureGammaSets.get(figure)?.includes(gamma)===true;
    presence.figures[figure]=present;
    assert.equal(present,true,`source coefficient row missing ${figure} gamma=${gamma}`);
  }
  coefficientPresence.push(presence);
}

for(const row of ledger.firstFailProbeFigures){
  assert.equal(row.visualReobservationStatus,'PASS_REOBSERVED_GRAPHICAL_ENDPOINT_NOT_NUMERICALLY_ANNOTATED');
  assert.equal(row.higherGammaCurvesTerminateBeforeGamma5Range,true);
  assert.equal(row.perCurveEndpointBetaNumericallyPrinted,false);
  assert.equal(row.exactHigherGammaEndpointStatus,'BLOCKED_REQUIRES_GRAPHICAL_DIGITIZATION');
  assert.match(row.renderSha256,/^[a-f0-9]{64}$/u);
  assert.ok(Number.isInteger(row.chartPdfPage)&&row.chartPdfPage>0);
  assert.ok(Number.isInteger(row.coefficientTablePdfPage)&&row.coefficientTablePdfPage===row.chartPdfPage+1);
}
for(const prohibition of [
  'DO_NOT_INFER_BETA_ENDPOINT_FROM_RATIONAL_COEFFICIENTS',
  'DO_NOT_DIGITIZE_CURVE_ENDPOINT_FOR_PRODUCTION_AUTHORITY',
  'DO_NOT_REUSE_GAMMA5_BETA_MAXIMUM_FOR_HIGHER_GAMMA',
  'DO_NOT_USE_EXTRAPOLATED_CURVE_AS_ORIGINAL_FALLBACK',
  'DO_NOT_AUTHORIZE_ROUTE_WHILE_ANY_REQUIRED_FIGURE_ENDPOINT_IS_UNRESOLVED',
]) assert.ok(ledger.prohibitions.includes(prohibition));
assert.equal(ledger.authorization.higherGammaProductionComparisonAllowed,false);
assert.equal(ledger.authorization.higherGammaRouteRegistrationAllowed,false);
assert.equal(ledger.authorization.globalEmp1CRouteRegistrationAllowed,false);

const semanticPayload={
  sourceSha256:sourceSha,
  curveLimitAuthority:ledger.source.curveLimitAuthority,
  routeIntersectionPolicy:ledger.routeIntersectionPolicy,
  requiredFigures:ledger.requiredTable5OriginalFigures,
  probeFigures:ledger.firstFailProbeFigures.map(({renderSha256,...row})=>row),
  existingQualifiedGamma5Route:ledger.existingQualifiedGamma5Route,
  higherGammaAssessments:ledger.higherExactTabulatedGammaAssessments,
  prohibitions:ledger.prohibitions,
  visualConclusion:{status:ledger.visualReobservation.status,digitizationPerformed:false},
};
const result={
  schema:'emp1-wrc537-cylindrical-higher-gamma-beta-limit-check/v2',
  status:'PASS_HIGHER_GAMMA_FULL_TABLE5_ROUTE_BLOCKED_SOURCE_ENDPOINT_NOT_NUMERICALLY_ANNOTATED',
  engineeringAuthority:true,
  productionRouteExpansionAuthority:false,
  sourceSha256:sourceSha,
  exactTabulatedHigherGammas:higherGammas,
  requiredTable5Figures:expectedFigures.length,
  firstFailProbeFigures:probeFigures,
  coefficientRowsPresentForAllProbeGammas:true,
  coefficientPresence,
  higherGammaRoutesBlocked:higherGammas.length,
  higherGammaRoutesAuthorized:0,
  exactNumericEndpointLabelsFound:0,
  endpointInferenceUsed:false,
  chartDigitizationUsedForProductionAuthority:false,
  inheritedGamma5RoutePreserved:true,
  nextAuthority:'AUTHORITATIVE_NUMERIC_HIGHER_GAMMA_ORIGINAL_CURVE_BETA_LIMIT_SOURCE_REQUIRED',
  semanticHashSha256:sha256Canonical(semanticPayload),
};
if(outputPath){await mkdir(outputPath.split('/').slice(0,-1).join('/')||'.',{recursive:true});await writeFile(outputPath,JSON.stringify(result,null,2)+'\n','utf8');}
console.log(JSON.stringify(result,null,2));

async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}
function sha256Canonical(value){return createHash('sha256').update(JSON.stringify(sortValue(value)),'utf8').digest('hex');}
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=sortValue(value[key]);return out;}return value;}
