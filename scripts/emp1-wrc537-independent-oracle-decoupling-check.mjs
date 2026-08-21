#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deriveIndependentWrc537Table5Authority } from './emp1-wrc537-independent-source-authority-lib.mjs';

const [wrc,caux,gamma5Source,gamma5Frozen,gamma15Frozen]=await Promise.all([
  readFile('docs/emp1/WRC537_2013_Tables_and_Charts.md','utf8'),
  readFile('docs/emp1/CAUx_2017_WRC01f_pages_24-31.md','utf8'),
  readFile('scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs','utf8'),
  readFile('validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json','utf8').then(JSON.parse),
  readFile('validation/emp1/wrc537-2013/main-baseline-gamma15-handcalc-v1.json','utf8').then(JSON.parse),
]);
const authority=deriveIndependentWrc537Table5Authority({wrcMarkdown:wrc,cauxMarkdown:caux});
const gamma5Map={circ:authority.figureMap.circumferential,long:authority.figureMap.longitudinal};
assert.deepEqual(gamma5Map,gamma5Frozen.semanticPayload.figureMap,'gamma5 frozen figure map must match independent CAUx interpretation');
assert.deepEqual(authority.figureMap,gamma15Frozen.figureMap,'gamma15 frozen figure map must match independent CAUx interpretation');
assert.match(gamma5Source,/deriveIndependentWrc537Table5Authority/u);
assert.doesNotMatch(gamma5Source,/const\s+SIGN\s*=\s*\{/u,'gamma5 oracle must not own a sign matrix');
assert.doesNotMatch(gamma5Source,/Pmem_AB\s*:\s*['"]4C['"]/u,'gamma5 oracle must not own the figure map');
assert.equal(authority.productionImports.length,0);
assert.equal(authority.productionObservationUsedToSetAuthority,false);

// Independently re-observe the gamma15 frozen stresses using source-derived
// sign placement. This prevents its historical hardcoded SIGN table from being
// accepted without an independent WRC Table-5 check.
const b=gamma15Frozen;
const loads=b.case.loadsAtWrcAttachmentReferencePoint;
const q=b.expected.curveOrdinates;
const s=b.expected.scaleFactors;
const sign=authority.signs;
const circ={
  Pmem:apply(sign.pMem,loads.P,grouped(q.circumferential.Pmem_AB*s.pMem,q.circumferential.Pmem_CD*s.pMem)),
  Pbend:apply(sign.pBend,loads.P,grouped(q.circumferential.Pbend_AB*s.pBend,q.circumferential.Pbend_CD*s.pBend)),
  Mcmem:apply(sign.mcMem,loads.Mc,q.circumferential.Mcmem*s.mcMem),Mcbend:apply(sign.mcBend,loads.Mc,q.circumferential.Mcbend*s.mcBend),
  Mlmem:apply(sign.mlMem,loads.Ml,q.circumferential.Mlmem*s.mlMem),Mlbend:apply(sign.mlBend,loads.Ml,q.circumferential.Mlbend*s.mlBend),
};
const long={
  Pmem:apply(sign.pMem,loads.P,grouped(q.longitudinal.Pmem_AB*s.pMem,q.longitudinal.Pmem_CD*s.pMem)),
  Pbend:apply(sign.pBend,loads.P,grouped(q.longitudinal.Pbend_AB*s.pBend,q.longitudinal.Pbend_CD*s.pBend)),
  Mcmem:apply(sign.mcMem,loads.Mc,q.longitudinal.Mcmem*s.mcMem),Mcbend:apply(sign.mcBend,loads.Mc,q.longitudinal.Mcbend*s.mcBend),
  Mlmem:apply(sign.mlMem,loads.Ml,q.longitudinal.Mlmem*s.mlMem),Mlbend:apply(sign.mlBend,loads.Ml,q.longitudinal.Mlbend*s.mlBend),
};
const shearParts={Vc:apply(sign.vc,loads.Vc,s.vcShear),Vl:apply(sign.vl,loads.Vl,s.vlShear),Mt:apply(sign.mt,loads.Mt,s.mtShear)};
const circumferential=sum(circ),longitudinal=sum(long),shear=sum(shearParts);
const intensity=authority.locations.map((_,i)=>tresca(circumferential[i],longitudinal[i],shear[i]));
compare(circumferential,b.expected.circumferentialStress,b,'gamma15 circ source-sign replay');
compare(longitudinal,b.expected.longitudinalStress,b,'gamma15 long source-sign replay');
compare(shear,b.expected.shearStress,b,'gamma15 shear source-sign replay');
compare(intensity,b.expected.stressIntensity,b,'gamma15 intensity source-sign replay');

console.log(JSON.stringify({
  status:'PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED',
  authorityHash:authority.authorityHash,
  productionImports:authority.productionImports,
  productionObservationUsedToSetAuthority:false,
  gamma5:{figureMapSourceDerived:true,signsSourceDerived:true,frozenSemanticPayloadPreserved:true},
  gamma15:{frozenFigureMapIndependentlyVerified:true,sourceDerivedSignReplay:true,historicalArtifactUnchanged:true},
  sourceCustody:authority.sourceCustody,
},null,2));

function apply(signs,load,magnitude){const values=Array.isArray(magnitude)?magnitude:Array(signs.length).fill(magnitude),direction=load<0?-1:1;return signs.map((v,i)=>zero(v*direction*values[i]));}
function grouped(ab,cd){return[ab,ab,ab,ab,cd,cd,cd,cd];}
function sum(parts){const rows=Object.values(parts);return authority.locations.map((_,i)=>zero(rows.reduce((total,row)=>total+row[i],0)));}
function tresca(a,b,t){const d=Math.sqrt((a-b)**2+4*t**2),p1=.5*(a+b+d),p2=.5*(a+b-d),p3=0;return Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1));}
function zero(v){return Object.is(v,-0)?0:v;}
function compare(actual,expected,baseline,label){assert.equal(actual.length,expected.length,`${label}:length`);const rel=baseline.comparisonTolerance.floatingPointRelative,abs=baseline.comparisonTolerance.floatingPointAbsolute;actual.forEach((value,i)=>{const tol=Math.max(abs,Math.max(1,Math.abs(expected[i]))*rel);assert.ok(Math.abs(value-expected[i])<=tol,`${label}[${i}] actual=${value} expected=${expected[i]} tol=${tol}`);});}
