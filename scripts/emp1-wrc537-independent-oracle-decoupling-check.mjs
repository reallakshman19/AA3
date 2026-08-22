#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deriveIndependentWrc537Table5Authority } from './oracles/emp1-wrc537/source-authority.mjs';
import { evaluateIndependentWrc537Table5 } from './oracles/emp1-wrc537/table5-handcalc.mjs';

const [wrc,caux,reviewed,gamma5Source,gamma5Frozen,gamma15Frozen]=await Promise.all([
  readFile('docs/emp1/WRC537_2013_Tables_and_Charts.md','utf8'),
  readFile('docs/emp1/CAUx_2017_WRC01f_pages_24-31.md','utf8'),
  readFile('validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json','utf8').then(JSON.parse),
  readFile('scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs','utf8'),
  readFile('validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json','utf8').then(JSON.parse),
  readFile('validation/emp1/wrc537-2013/main-baseline-gamma15-handcalc-v1.json','utf8').then(JSON.parse),
]);
const authority=deriveIndependentWrc537Table5Authority({wrcMarkdown:wrc,cauxMarkdown:caux,reviewedInterpretation:reviewed});
const gamma5Map={circ:authority.historicalFigureMap.circumferential,long:authority.historicalFigureMap.longitudinal};
assert.deepEqual(gamma5Map,gamma5Frozen.semanticPayload.figureMap,'gamma5 frozen figure map must match reviewed/source-derived historical interpretation');
assert.deepEqual(authority.historicalFigureMap,gamma15Frozen.figureMap,'gamma15 frozen figure map must match reviewed/source-derived historical interpretation');
assert.match(gamma5Source,/oracles\/emp1-wrc537\/source-authority\.mjs/u);
assert.match(gamma5Source,/oracles\/emp1-wrc537\/table5-handcalc\.mjs/u);
assert.doesNotMatch(gamma5Source,/const\s+SIGN\s*=\s*\{/u,'gamma5 oracle must not own a sign matrix');
assert.doesNotMatch(gamma5Source,/Pmem_AB\s*:\s*['"]4C['"]/u,'gamma5 oracle must not own the figure map');
assert.equal(authority.productionImports.length,0);
assert.equal(authority.productionObservationUsedToSetAuthority,false);

const b=gamma15Frozen;
const gamma15=evaluateIndependentWrc537Table5({
  geometry:b.case.geometry,
  stressConcentration:{Kn:b.domain.Kn,Kb:b.domain.Kb},
  loads:b.case.loadsAtWrcAttachmentReferencePoint,
  curveOrdinates:{circ:b.expected.curveOrdinates.circumferential,long:b.expected.curveOrdinates.longitudinal},
  signs:authority.signs,
  locations:authority.locations,
});
compareObject(gamma15.scale,b.expected.scaleFactors,b,'gamma15 scale source replay');
compare(gamma15.stresses.circumferential,b.expected.circumferentialStress,b,'gamma15 circ source replay');
compare(gamma15.stresses.longitudinal,b.expected.longitudinalStress,b,'gamma15 long source replay');
compare(gamma15.stresses.shear,b.expected.shearStress,b,'gamma15 shear source replay');
compare(gamma15.stresses.stressIntensity,b.expected.stressIntensity,b,'gamma15 intensity source replay');

console.log(JSON.stringify({
  schema:'emp1-wrc537-independent-oracle-decoupling/v2',
  status:'PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED',
  authorityHash:authority.authorityHash,
  hashes:authority.hashes,
  productionImports:authority.productionImports,
  productionObservationUsedToSetAuthority:false,
  gamma5:{figureMapReviewedAndSourceChecked:true,signsSourceDerived:true,frozenSemanticPayloadPreserved:true},
  gamma15:{frozenFigureMapIndependentlyVerified:true,isolatedSourceDerivedNumericalReplay:true,historicalArtifactUnchanged:true},
  productionAuthority:false,
  sourceCustody:authority.sourceCustody,
},null,2));

// EMP1-16 Gate A: this entrypoint is already owned by the independent-oracle
// workflow. Importing the scripts-only refreeze here makes the new physical
// oracle executable under that existing gate without modifying workflow YAML.
await import('./emp1-wrc-gamma5-post-authority-independent-refreeze.mjs');

function compare(actual,expected,baseline,label){assert.equal(actual.length,expected.length,`${label}:length`);const rel=baseline.comparisonTolerance.floatingPointRelative,abs=baseline.comparisonTolerance.floatingPointAbsolute;actual.forEach((value,index)=>{const tol=Math.max(abs,Math.max(1,Math.abs(expected[index]))*rel);assert.ok(Math.abs(value-expected[index])<=tol,`${label}[${index}] actual=${value} expected=${expected[index]} tol=${tol}`);});}
function compareObject(actual,expected,baseline,label){for(const [key,value] of Object.entries(expected)){const rel=baseline.comparisonTolerance.floatingPointRelative,abs=baseline.comparisonTolerance.floatingPointAbsolute,tol=Math.max(abs,Math.max(1,Math.abs(value))*rel);assert.ok(Math.abs(actual[key]-value)<=tol,`${label}.${key} actual=${actual[key]} expected=${value} tol=${tol}`);}}
