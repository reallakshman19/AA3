#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inspectCaesarAccdbLinearCaseMechanics } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const SHA='85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const SOURCE='48';
const MID='21719';
const CASE_A=17;
const CASE_B=19;
const LIMIT=0.1;
const MM=1e-3, DEG=Math.PI/180;
const FORCE=['FX','FY','FZ'], MOM=['MX','MY','MZ'];

const args=parseArgs(process.argv.slice(2));
if(!args.package||!args.raw) throw new TypeError('Usage: --package <canonical-package.json> --raw <raw-export.json> [--out <json>]');
const pkg=JSON.parse(readFileSync(args.package,'utf8'));
const raw=JSON.parse(readFileSync(args.raw,'utf8'));
assert.equal(pkg.source.sha256,SHA);
const source=requireSource(pkg,SOURCE);
const from=String(source.FROM_NODE),to=String(source.TO_NODE);
const inspection=inspectCaesarAccdbLinearCaseMechanics(pkg,'L19');
assert.equal(inspection.executionStatus,'QUALIFIED');
const chain=ordered(inspection.elements.filter(e=>String(e.sourceElementId)===SOURCE),from,to);
const split=chain.findIndex(e=>String(e.nodeJ)===MID);
if(split<0||split>=chain.length-1) throw new TypeError('E48 midpoint split missing.');
const near=chain.slice(0,split+1), far=chain.slice(split+1);

const labelsA=rawCaseLabels(raw,CASE_A),labelsB=rawCaseLabels(raw,CASE_B);
if(!/W\+P1/u.test(labelsA.forceCase)||!/W\+P1/u.test(labelsB.forceCase)) throw new Error(`Expected W+P1 pair; got ${labelsA.forceCase} / ${labelsB.forceCase}`);
if(/T1/u.test(labelsA.forceCase)||/T1/u.test(labelsB.forceCase)) throw new Error('Differential pair must not contain thermal primitive.');

const nearResult=auditHalf('NEAR_HALF',near,from,MID,raw,pkg.profile.tolerances);
const farResult=auditHalf('FAR_HALF',far,MID,to,raw,pkg.profile.tolerances);
const classification=nearResult.maxAbsNormalizedResidual<=LIMIT&&farResult.maxAbsNormalizedResidual<=LIMIT
  ?'E48_SAME_LOAD_DIFFERENTIAL_STIFFNESS_PASSES_BOTH_HALVES'
  :nearResult.maxAbsNormalizedResidual>LIMIT&&farResult.maxAbsNormalizedResidual<=LIMIT
    ?'E48_NEAR_HALF_STIFFNESS_SHAPE_MISMATCH_FAR_HALF_PASSES_SAME_LOAD_DIFFERENTIAL'
    :nearResult.maxAbsNormalizedResidual<=LIMIT
      ?'E48_FAR_HALF_STIFFNESS_MISMATCH_NEAR_HALF_PASSES_SAME_LOAD_DIFFERENTIAL'
      :'E48_BOTH_HALVES_STIFFNESS_MISMATCH_SAME_LOAD_DIFFERENTIAL';
const output={
 schema:'lfea-issue947-e48-same-load-differential-stiffness-audit/v1',issue:947,sourceAccdbSha256:SHA,sourceElementId:SOURCE,
 differentialCases:{caseA:CASE_A,caseB:CASE_B,caseALabel:labelsA.forceCase,caseBLabel:labelsB.forceCase,
   cancellation:'Both raw cases are SUS W+P1; subtracting element equations cancels identical gravity, pressure, Bourdon/MEC21 and all other element initial/equivalent loads exactly.'},
 governingEquation:'For q_c = K d_c - f under identical element load primitives f, q_17-q_19 = K (d_17-d_19).',
 purpose:'STIFFNESS_SHAPE_FUNCTION_FALSIFICATION_WITH_INITIAL_LOADS_ELIMINATED_NO_PARAMETER_FIT_NO_PRODUCTION_UPDATE',
 mesh:{nearDescendantCount:near.length,farDescendantCount:far.length,totalDescendantCount:chain.length},
 nearHalf:nearResult,farHalf:farResult,
 gates:{nearExistingTenPercentDifferentialActionGate:nearResult.maxAbsNormalizedResidual<=LIMIT?'PASS':'FAIL',farExistingTenPercentDifferentialActionGate:farResult.maxAbsNormalizedResidual<=LIMIT?'PASS':'FAIL'},
 classification,
 disposition:classification.includes('NEAR_HALF_STIFFNESS_SHAPE_MISMATCH')
   ?'The E48 near-half discrepancy survives exact cancellation of all W+P1 element load vectors, so pressure/Bourdon/MEC21 load-vector changes are not admissible explanations. Investigate bend stiffness/axial-shape ownership.'
   :'Use the per-half differential result to decide whether the remaining L19 discrepancy belongs to stiffness or load-vector custody; do not alter mechanics from fit.',
 falsificationRule:'No pressure/free-load hypothesis can explain a same-W+P1 differential failure because identical element load vectors cancel algebraically. A stiffness/shape conclusion is admissible only when the raw case labels match, direct raw endpoint actions/DOFs exist in both cases, and the unchanged 10% differential action gate is exceeded.'
};
if(args.out) writeFileSync(args.out,`${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify(output,null,2));
console.log(`Issue 947 E48 differential stiffness audit: ${classification}`);

function auditHalf(label,entries,nodeI,nodeJ,raw,tolerances){
 const K=condensedStiffness(entries);
 const dA=[...rawDof(raw,CASE_A,nodeI),...rawDof(raw,CASE_A,nodeJ)];
 const dB=[...rawDof(raw,CASE_B,nodeI),...rawDof(raw,CASE_B,nodeJ)];
 const qA=rawAction(raw,CASE_A,nodeI,nodeJ),qB=rawAction(raw,CASE_B,nodeI,nodeJ);
 const dd=subtract(dA,dB),dq=subtract(qA,qB),pred=multiplyFlat12(K,dd),res=subtract(pred,dq);
 const scales=actionScales(dq,tolerances),norm=res.map((v,i)=>v/scales[i]),abs=norm.map(Math.abs),max=Math.max(...abs),idx=abs.indexOf(max);
 return {label,nodeI,nodeJ,descendantCount:entries.length,deltaDofCase17Minus19:dd,rawDeltaActionCase17Minus19:dq,predictedDeltaActionFromCurrentK:pred,residual:res,scales,normalizedResidual:norm,normalizedResidualL2:Math.hypot(...norm),maxAbsNormalizedResidual:max,governingComponent:actionLabel(idx),statusAtExistingTenPercentGate:max<=LIMIT?'PASS':'FAIL'};
}
function rawCaseLabels(raw,n){const f=raw.tables.OUTPUT_GLOBAL_ELEMENT_FORCES.rows.find(r=>Number(r.LCASE_NUM)===n&&String(r.FROM_NODE)==='20760'&&String(r.TO_NODE)===MID);const d=raw.tables.OUTPUT_DISPLACEMENTS.rows.find(r=>Number(r.LCASE_NUM)===n&&String(r.NODE)==='20760');if(!f||!d)throw new TypeError(`Missing raw case ${n}`);return{forceCase:String(f.CASE),displacementCase:String(d.CASE)};}
function rawDof(raw,n,id){const m=raw.tables.OUTPUT_DISPLACEMENTS.rows.filter(r=>Number(r.LCASE_NUM)===n&&String(r.NODE)===id);if(m.length!==1)throw new TypeError(`Raw displacement case ${n} node ${id}: ${m.length}`);const r=m[0];return[Number(r.DX)*MM,Number(r.DY)*MM,Number(r.DZ)*MM,Number(r.RX)*DEG,Number(r.RY)*DEG,Number(r.RZ)*DEG];}
function rawAction(raw,n,i,j){const m=raw.tables.OUTPUT_GLOBAL_ELEMENT_FORCES.rows.filter(r=>Number(r.LCASE_NUM)===n&&String(r.FROM_NODE)===i&&String(r.TO_NODE)===j);if(m.length!==1)throw new TypeError(`Raw force case ${n} ${i}->${j}: ${m.length}`);const r=m[0];return[Number(r.FXF),Number(r.FYF),Number(r.FZF),Number(r.MXF),Number(r.MYF),Number(r.MZF),Number(r.FXT),Number(r.FYT),Number(r.FZT),Number(r.MXT),Number(r.MYT),Number(r.MZT)];}
function condensedStiffness(entries){const nodeIds=[String(entries[0].nodeI),...entries.map(e=>String(e.nodeJ))],idx=new Map(nodeIds.map((id,i)=>[id,i])),n=nodeIds.length*6,K=matrix(n,n);for(const e of entries)addElementMatrix(K,e.globalStiffness,idx.get(String(e.nodeI)),idx.get(String(e.nodeJ)));const b=[...Array.from({length:6},(_,i)=>i),...Array.from({length:6},(_,i)=>(nodeIds.length-1)*6+i)],ii=Array.from({length:Math.max(0,(nodeIds.length-2)*6)},(_,i)=>6+i);if(!ii.length)return flatten(submatrix(K,b,b));const Kbb=submatrix(K,b,b),Kbi=submatrix(K,b,ii),Kib=submatrix(K,ii,b),Kii=submatrix(K,ii,ii),X=solveColumns(Kii,Kib);return flatten(subtractMatrix(Kbb,multiplyMatrices(Kbi,X)));}
function requireSource(pkg,id){const m=pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter(r=>String(r.ELEMENTID)===id);if(m.length!==1)throw new TypeError(`E${id} count=${m.length}`);return m[0];}
function ordered(entries,from,to){const rem=new Map(entries.map(e=>[e.elementId,e])),out=[];let n=from;while(n!==to){const c=[...rem.values()].filter(e=>String(e.nodeI)===n);if(c.length!==1)throw new TypeError(`Chain ${n} outgoing=${c.length}`);const e=c[0];out.push(e);rem.delete(e.elementId);n=String(e.nodeJ);}if(rem.size)throw new TypeError(`Disconnected=${rem.size}`);return out;}
function actionScales(ref,t){const floors=[...new Array(3).fill(Number(t.GLOBAL_END_FORCE_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_FORCE_TO.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_TO.scaleFloor))];return ref.map((v,i)=>Math.max(Math.abs(v),floors[i]));}
function actionLabel(i){const end=i<6?'FROM':'TO',l=i%6,c=l<3?FORCE[l]:MOM[l-3];return`${end}:${c}`;}
function addElementMatrix(g,l,ni,nj){const map=[...Array.from({length:6},(_,i)=>ni*6+i),...Array.from({length:6},(_,i)=>nj*6+i)];for(let r=0;r<12;r++)for(let c=0;c<12;c++)g[map[r]][map[c]]+=l[r*12+c];}
function matrix(r,c){return Array.from({length:r},()=>new Array(c).fill(0));}function submatrix(A,r,c){return r.map(i=>c.map(j=>A[i][j]));}function flatten(A){return A.flat();}function subtractMatrix(A,B){return A.map((r,i)=>r.map((v,j)=>v-B[i][j]));}function multiplyMatrices(A,B){const o=matrix(A.length,B[0].length);for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++){const a=A[i][k];if(a===0)continue;for(let j=0;j<B[0].length;j++)o[i][j]+=a*B[k][j];}return o;}function solveColumns(A,B){const o=matrix(A.length,B[0].length);for(let c=0;c<B[0].length;c++){const x=solveDense(A,B.map(r=>r[c]));for(let r=0;r<A.length;r++)o[r][c]=x[r];}return o;}function solveDense(A,rhs){const n=A.length,M=A.map((r,i)=>[...r,rhs[i]]);for(let p=0;p<n;p++){let b=p;for(let r=p+1;r<n;r++)if(Math.abs(M[r][p])>Math.abs(M[b][p]))b=r;if(!(Math.abs(M[b][p])>1e-18))throw new Error(`SINGULAR_${p}`);[M[p],M[b]]=[M[b],M[p]];const d=M[p][p];for(let c=p;c<=n;c++)M[p][c]/=d;for(let r=0;r<n;r++){if(r===p)continue;const f=M[r][p];if(f===0)continue;for(let c=p;c<=n;c++)M[r][c]-=f*M[p][c];}}return M.map(r=>r[n]);}
function multiplyFlat12(A,x){return Array.from({length:12},(_,r)=>{let s=0;for(let c=0;c<12;c++)s+=A[r*12+c]*x[c];return s;});}function subtract(a,b){return a.map((v,i)=>v-b[i]);}
function parseArgs(tokens){const r={};for(let i=0;i<tokens.length;i++){const t=tokens[i];if(!t.startsWith('--'))throw new TypeError(`Unexpected ${t}`);const v=tokens[i+1];if(v===undefined||v.startsWith('--'))throw new TypeError(`Missing ${t}`);r[t.slice(2)]=v;i++;}return r;}
