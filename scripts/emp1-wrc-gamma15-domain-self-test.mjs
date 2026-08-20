#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCylindricalExactGammaPackage, selectExactGammaCurve } from './emp1-wrc-cylindrical-exact-gamma-lib.mjs';

const source=await readFile('docs/emp1/WRC537_2013_Tables_and_Charts.md','utf8');
const domain=JSON.parse(await readFile('validation/emp1/wrc537-2013/cylindrical-original-gamma15-bounded-domain-v1.json','utf8'));
const pkg=parseCylindricalExactGammaPackage(source);
const figures=domain.table5OriginalFigureSet;
assert.equal(domain.status,'PASS_SOURCE_QUALIFIED_CONSERVATIVE_DOMAIN');
assert.equal(domain.engineeringAuthority,true);
assert.equal(domain.productionRouteAuthority,false);
assert.equal(domain.globalEmp1CRouteAuthority,false);
assert.equal(domain.source.rawPdfSha256,pkg.source.rawPdfSha256);
assert.equal(figures.length,14);
assert.equal(new Set(figures).size,14);
assert.deepEqual(domain.qualifiedProductDomain.gamma.allowedValues,[15]);
assert.equal(domain.qualifiedProductDomain.beta.minimum,0.05);
assert.equal(domain.qualifiedProductDomain.beta.maximum,0.30);
assert.equal(domain.qualifiedProductDomain.interpolationAllowed,false);
assert.equal(domain.qualifiedProductDomain.extrapolatedCurveUseAllowed,false);
assert.equal(domain.qualifiedProductDomain.crossVariantFallbackAllowed,false);

const selected=[];
for(const figure of figures){
  const row=selectExactGammaCurve(pkg,{figure,variant:'ORIGINAL',gamma:15});
  assert.equal(row.status,'PASS_EXACT_SOURCE_TABULATED_GAMMA',`gamma15 missing:${figure}`);
  assert.equal(row.sourceGamma,15,`gamma15 source mismatch:${figure}`);
  assert.equal(row.curve.productionSelectable,true,`gamma15 unselectable:${figure}`);
  selected.push({figure,pdfPage:row.curve.sourceLocator.pdfPage,curveId:row.curve.curveId});
}

const nonTabulated=selectExactGammaCurve(pkg,{figure:'1A',variant:'ORIGINAL',gamma:14});
assert.equal(nonTabulated.status,'BLOCKED_NON_TABULATED_GAMMA');
const original1A=selected.find((row)=>row.figure==='1A');
const extrapolated=selectExactGammaCurve(pkg,{figure:'1A',variant:'EXTRAPOLATED',gamma:15});
if(extrapolated.status==='PASS_EXACT_SOURCE_TABULATED_GAMMA'){
  assert.notEqual(extrapolated.curve.curveId,original1A.curveId,'cross-variant source row reuse is prohibited');
  assert.equal(extrapolated.curve.variant,'EXTRAPOLATED');
}else{
  assert.ok([
    'BLOCKED_FIGURE_VARIANT_NOT_SOURCE_QUALIFIED',
    'BLOCKED_NON_TABULATED_GAMMA',
    'BLOCKED_GAMMA_NOT_TABULATED_AND_SOURCE_ROW_UNRESOLVED',
  ].includes(extrapolated.status),`unexpected extrapolated lookup state:${extrapolated.status}`);
}

const governing=domain.sourceChartReview.governingOuterLimitCharts;
assert.deepEqual(governing.map((row)=>row.figure),['1C','2C']);
assert.deepEqual(governing.map((row)=>row.pdfPage),[128,136]);
assert.ok(governing.every((row)=>/above beta=0\.30 and below beta=0\.35/u.test(row.observation)));

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma15-domain-self-test/v1',
  status:'PASS',
  engineeringAuthority:true,
  productionRouteAuthority:false,
  sourceSha256:pkg.source.rawPdfSha256,
  exactGamma:15,
  qualifiedBetaBand:[0.05,0.30],
  requiredFigures:selected,
  governingOuterLimitFigures:['1C','2C'],
  extrapolated1AObservation:extrapolated.status,
  negativeProofs:['NON_TABULATED_GAMMA_BLOCKED','NO_ORIGINAL_TO_EXTRAPOLATED_FALLBACK'],
},null,2));
