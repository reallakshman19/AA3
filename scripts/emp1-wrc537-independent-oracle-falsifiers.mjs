#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateEmp1Wrc537CylindricalTable5 } from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';
import {
  assertIndependentHistoricalFigureMap,
  assertIndependentSignMatrix,
  deriveIndependentWrc537Table5Authority,
} from './oracles/emp1-wrc537/source-authority.mjs';
import {
  assertLoadReversal,
  assertSuperposition,
  assertZeroIsolation,
  evaluateIndependentWrc537Table5,
} from './oracles/emp1-wrc537/table5-handcalc.mjs';

const [wrcMarkdown,cauxMarkdown,reviewedInterpretation]=await Promise.all([
  readFile('docs/emp1/WRC537_2013_Tables_and_Charts.md','utf8'),
  readFile('docs/emp1/CAUx_2017_WRC01f_pages_24-31.md','utf8'),
  readFile('validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json','utf8').then(JSON.parse),
]);
const authority=deriveIndependentWrc537Table5Authority({wrcMarkdown,cauxMarkdown,reviewedInterpretation});

const geometry={meanRadius:100,shellThickness:20,attachmentRadius:17.714285714285715,beta:0.155};
const stressConcentration={Kn:1,Kb:1};
const curveOrdinates={
  circ:{Pmem_AB:1.1,Pmem_CD:1.2,Pbend_AB:1.3,Pbend_CD:1.4,Mcmem:1.5,Mcbend:1.6,Mlmem:1.7,Mlbend:1.8},
  long:{Pmem_AB:2.1,Pmem_CD:2.2,Pbend_AB:2.3,Pbend_CD:2.4,Mcmem:2.5,Mcbend:2.6,Mlmem:2.7,Mlbend:2.8},
};
const magnitudes={P:1000,Vc:250,Vl:400,Mc:500000,Ml:600000,Mt:700000};
const singles=[];
const comparisonCases=[];
for(const [load,magnitude] of Object.entries(magnitudes)){
  const positive=run({[load]:magnitude});
  const negative=run({[load]:-magnitude});
  compareResult(positive.independent,positive.production,`${load}+`);
  compareResult(negative.independent,negative.production,`${load}-`);
  assertZeroIsolation(positive.independent,load);
  assertZeroIsolation(positive.production,load);
  assertLoadReversal(positive.independent,negative.independent,`independent:${load}`);
  assertLoadReversal(positive.production,negative.production,`production:${load}`);
  singles.push(positive.independent);
  comparisonCases.push(`${load}+`,`${load}-`);
}
const combined=run(magnitudes);
compareResult(combined.independent,combined.production,'ALL+');
assertSuperposition(combined.independent,singles);
const productionSingles=Object.entries(magnitudes).map(([load,magnitude])=>run({[load]:magnitude}).production);
assertSuperposition(combined.production,productionSingles);

// F1/F2 — historical 1B-1/2B-1 worked-case selections are independent
// evidence identities. Changing either to the alternate WRC figure must be
// detected; this does not grant production off-axis authority.
const figureCirc=structuredClone(authority.historicalFigureMap);
figureCirc.circumferential.Mlbend='1B';
assert.throws(()=>assertIndependentHistoricalFigureMap(figureCirc,authority),
  (error)=>error?.code==='WRC_TABLE5_FIGURE_SELECTION_MISMATCH');
const figureLong=structuredClone(authority.historicalFigureMap);
figureLong.longitudinal.Mlbend='2B';
assert.throws(()=>assertIndependentHistoricalFigureMap(figureLong,authority),
  (error)=>error?.code==='WRC_TABLE5_FIGURE_SELECTION_MISMATCH');
assert.equal(authority.figureAuthority.circumferential.Mlbend.selectionRequiresSeparateProductionAuthority,true);
assert.equal(authority.figureAuthority.longitudinal.Mlbend.selectionRequiresSeparateProductionAuthority,true);

// F3 — exactly one source sign corruption must fail.
const signCorruption=structuredClone(authority.signs);
signCorruption.pMem[0]*=-1;
assert.throws(()=>assertIndependentSignMatrix(signCorruption,authority),
  (error)=>error?.code==='WRC_TABLE5_SIGN_MATRIX_MISMATCH');

// F4 — an A/B-axis versus C/D-axis sign-family swap must fail even if a final
// envelope could remain numerically similar.
const axisSwap=structuredClone(authority.signs);
axisSwap.mlMem=[...authority.signs.mcMem];
assert.throws(()=>assertIndependentSignMatrix(axisSwap,authority),
  (error)=>error?.code==='WRC_TABLE5_SIGN_MATRIX_MISMATCH');

console.log(JSON.stringify({
  schema:'emp1-wrc537-independent-oracle-falsifiers/v1',
  status:'PASS_COMMON_MODE_FALSIFIERS',
  authorityHash:authority.authorityHash,
  hashes:authority.hashes,
  productionComparisonCases:[...comparisonCases,'ALL+'],
  singleLoadCases:Object.keys(magnitudes).length,
  loadReversalCases:Object.keys(magnitudes).length,
  zeroIsolationCases:Object.keys(magnitudes).length,
  superpositionCases:2,
  deliberateFigureCorruptionsDetected:2,
  deliberateSignCorruptionsDetected:2,
  productionImportsInOracle:authority.productionImports,
  productionObservationUsedToSetAuthority:authority.productionObservationUsedToSetAuthority,
  productionAuthority:false,
},null,2));

// EMP1-16 extends this owned falsifier gate with the independent physical
// benchmark mutations. The imported script has zero production imports.
await import('./emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs');

function run(partialLoads){
  const loads=Object.fromEntries(Object.keys(magnitudes).map((key)=>[key,Number(partialLoads[key]??0)]));
  const independent=evaluateIndependentWrc537Table5({geometry,stressConcentration,loads,curveOrdinates,signs:authority.signs,locations:authority.locations});
  const production=evaluateEmp1Wrc537CylindricalTable5({geometry,stressConcentration,loads,curveOrdinates});
  return {independent,production};
}
function compareResult(a,b,label){
  compareObject(a.scale,b.scale,`${label}:scale`);
  compareObject(a.components,b.components,`${label}:components`);
  compareObject(a.stresses,b.stresses,`${label}:stresses`);
}
function compareObject(a,b,label,path=''){
  if(Array.isArray(a)){assert(Array.isArray(b),`${label}:${path}:array`);assert.equal(a.length,b.length,`${label}:${path}:length`);a.forEach((value,index)=>compareObject(value,b[index],label,`${path}[${index}]`));return;}
  if(a&&typeof a==='object'){assert(b&&typeof b==='object',`${label}:${path}:object`);for(const key of Object.keys(a))compareObject(a[key],b[key],label,path?`${path}.${key}`:key);return;}
  if(typeof a==='number'){const tol=Math.max(1,Math.abs(a),Math.abs(b))*1e-12;assert.ok(Math.abs(a-b)<=tol,`${label}:${path}:actual=${b}:oracle=${a}:tol=${tol}`);return;}
  assert.equal(b,a,`${label}:${path}`);
}
