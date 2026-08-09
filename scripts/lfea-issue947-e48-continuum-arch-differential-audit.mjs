#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inspectCaesarAccdbLinearCaseMechanics } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const SHA='85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const SOURCE='48', MID='21719', ACASE=17, BCASE=19;
const MM=1e-3, KPA=1000, DEG=Math.PI/180, LIMIT=0.1, KAPPA=0.5;
const FORCE=['FX','FY','FZ'], MOM=['MX','MY','MZ'];
const args=parseArgs(process.argv.slice(2));
if(!args.package||!args.raw)throw new TypeError('Usage: --package <json> --raw <json> [--out <json>]');
const pkg=JSON.parse(readFileSync(args.package,'utf8')), raw=JSON.parse(readFileSync(args.raw,'utf8'));
assert.equal(pkg.source.sha256,SHA);
const source=requireSource(pkg,SOURCE), sourceRows=pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const from=String(source.FROM_NODE), farNode=String(source.TO_NODE);
const outgoing=sourceRows.filter(r=>String(r.FROM_NODE)===farNode); assert.equal(outgoing.length,1);
const inspection=inspectCaesarAccdbLinearCaseMechanics(pkg,'L19'); assert.equal(inspection.executionStatus,'QUALIFIED');
const chain=ordered(inspection.elements.filter(e=>String(e.sourceElementId)===SOURCE),from,farNode);
const split=chain.findIndex(e=>String(e.nodeJ)===MID); if(split<0||split>=chain.length-1)throw new TypeError('Midpoint split missing.');
const nearChain=chain.slice(0,split+1),farChain=chain.slice(split+1);
const firstArc=chain.find(e=>e.kind==='BEND_ARC'); if(!firstArc)throw new TypeError('E48 arc missing.');

const materialSection=resolveMaterialSection(source,firstArc);
const geometry=resolveGeometry(pkg,source,outgoing[0]);
const nearPath=[
  straightPath(geometry.sourcePoint,geometry.tangentStart),
  arcPath(geometry.centre,geometry.radiusM,geometry.turnAxis,geometry.startRadial,0,geometry.bendAngle/2),
];
const farPath=[arcPath(geometry.centre,geometry.radiusM,geometry.turnAxis,geometry.startRadial,geometry.bendAngle/2,geometry.bendAngle)];

const nearContinuum=continuumStiffness(nearPath,materialSection);
const farContinuum=continuumStiffness(farPath,materialSection);
const nearChord=condensedStiffness(nearChain),farChord=condensedStiffness(farChain);
const nearRaw=differentialRaw(raw,from,MID),farRaw=differentialRaw(raw,MID,farNode);
const nearContCompare=compare(nearContinuum,nearRaw.deltaDof,nearRaw.deltaAction,pkg.profile.tolerances);
const farContCompare=compare(farContinuum,farRaw.deltaDof,farRaw.deltaAction,pkg.profile.tolerances);
const nearChordCompare=compare(nearChord,nearRaw.deltaDof,nearRaw.deltaAction,pkg.profile.tolerances);
const farChordCompare=compare(farChord,farRaw.deltaDof,farRaw.deltaAction,pkg.profile.tolerances);
const nearMatrixDelta=matrixDelta(nearContinuum,nearChord),farMatrixDelta=matrixDelta(farContinuum,farChord);

const selfCheck=straightLimitSelfCheck(materialSection);
const classification=farContCompare.maxAbsNormalizedResidual<=LIMIT&&farMatrixDelta.relativeFrobenius<=0.02
  ?(nearContCompare.maxAbsNormalizedResidual<=LIMIT
    ?'E48_CONTINUUM_ARCH_PASSES_RAW_DIFFERENTIAL_NEAR_AND_FAR'
    :'E48_CAESAR_NEAR_HALF_DIFFERS_FROM_INDEPENDENT_CONTINUUM_ARCH_WHILE_FAR_HALF_MATCHES')
  :'E48_CONTINUUM_ARCH_IMPLEMENTATION_OR_PROPERTY_MAPPING_REQUIRES_REVIEW';
const output={
 schema:'lfea-issue947-e48-continuum-arch-differential-audit/v1',issue:947,sourceAccdbSha256:SHA,sourceElementId:SOURCE,
 purpose:'INDEPENDENT_CIRCULAR_ARCH_STRAIN_ENERGY_BENCHMARK_AGAINST_SAME_LOAD_RAW_DIFFERENTIAL_NO_PARAMETER_FIT_NO_PRODUCTION_UPDATE',
 authority:{
   continuumEnergy:'U=1/2 integral [N^2/(EA)+V.V/(kappa GA)+T^2/(GJ)+Mb.Mb/(EIeff)] ds',
   endpointFlexibility:'F_ab=partial^2 U/(partial Q_a partial Q_b); K_tip=F^-1; K_12=B^T K_tip B',
   b31jMapping:'EIeff is measured directly from the sealed current corrected arc local stiffness; no flexibility coefficient is fitted in this audit.',
   shearCoefficient:KAPPA,
 },
 materialSection,
 geometry,
 numericalIntegration:{method:'COMPOSITE_SIMPSON',panelsPerPath:4096,straightLimitSelfCheck:selfCheck},
 differentialCases:{caseA:ACASE,caseB:BCASE,formula:'SUS W+P1 in both raw cases',initialLoadCancellation:'Delta q = K Delta d'},
 nearHalf:{raw:nearRaw,continuum:nearContCompare,refinedChord:nearChordCompare,matrixComparisonContinuumVsRefinedChord:nearMatrixDelta},
 farHalf:{raw:farRaw,continuum:farContCompare,refinedChord:farChordCompare,matrixComparisonContinuumVsRefinedChord:farMatrixDelta},
 existingActionLimit:LIMIT,
 gates:{
   continuumStraightLimit:selfCheck.maxRelativeError<=1e-5?'PASS':'FAIL',
   farContinuumVsRefinedChordMatrix:farMatrixDelta.relativeFrobenius<=0.02?'PASS':'FAIL',
   farContinuumRawDifferential:farContCompare.maxAbsNormalizedResidual<=LIMIT?'PASS':'FAIL',
   nearContinuumRawDifferential:nearContCompare.maxAbsNormalizedResidual<=LIMIT?'PASS':'FAIL',
 },
 classification,
 disposition:classification==='E48_CAESAR_NEAR_HALF_DIFFERS_FROM_INDEPENDENT_CONTINUUM_ARCH_WHILE_FAR_HALF_MATCHES'
   ?'The refined repository chain is converging to ordinary Timoshenko circular-arch mechanics, and that continuum mechanics agrees with CAESAR on the far half but not the source-to-midpoint half. This supports a CAESAR-specific near-half bend axial-shape/element interpolation mechanic rather than generic beam or pressure tuning. Keep production unchanged until that CAESAR operator is independently specified and whole-model falsified.'
   :'Use the self-check, matrix comparison, and raw differential gates before drawing any bend-law conclusion.',
 falsificationRule:'The continuum benchmark is admissible only if its straight-arc limiting case reproduces the closed-form straight Timoshenko cantilever flexibility, its far-half stiffness converges to the independently refined chord chain, and raw same-W+P1 differential actions are compared with all initial loads algebraically cancelled.'
};
if(output.gates.continuumStraightLimit!=='PASS')throw new Error(`Continuum self-check failed: ${JSON.stringify(selfCheck)}`);
if(args.out)writeFileSync(args.out,`${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify(output,null,2)); console.log(`Issue 947 E48 continuum arch differential: ${classification}`);

function resolveMaterialSection(row,arc){
 const E=Number(row.MODULUS)*KPA,nu=Number(row.POISSONS),G=E/(2*(1+nu)),Do=Number(row.DIAMETER)*MM,t=Number(row.WALL_THICK)*MM,Di=Do-2*t;
 const A=Math.PI/4*(Do**2-Di**2),I=Math.PI/64*(Do**4-Di**4),J=2*I,EA=E*A,EI=E*I,GJ=G*J,KGA=KAPPA*G*A;
 const k=arc.effectiveLocalStiffness; const L=EA/Number(k[0]);
 const eiy=((Number(k[4*12+4])-Number(k[4*12+10]))*L)/2;
 const eiz=((Number(k[5*12+5])-Number(k[5*12+11]))*L)/2;
 const EIeff=(eiy+eiz)/2, factor=EI/EIeff;
 return {elasticModulusPa:E,poissonRatio:nu,shearModulusPa:G,outerDiameterM:Do,wallThicknessM:t,areaM2:A,secondMomentM4:I,polarMomentM4:J,EA_N:EA,physicalEI_Nm2:EI,effectiveBendEI_Nm2:EIeff,measuredBendingFlexibilityFactor:factor,GJ_Nm2:GJ,kappa:KAPPA,kappaGA_N:KGA,measurementChordLengthM:L,measuredEIY_Nm2:eiy,measuredEIZ_Nm2:eiz};
}
function resolveGeometry(pkg,row,out){
 const S=coord(pkg,row.FROM_NODE),I=coord(pkg,row.TO_NODE),O=coord(pkg,out.TO_NODE),t0=unit(subtract(I,S)),t1=unit(subtract(O,I)),beta=Math.acos(clamp(dot(t0,t1),-1,1));
 const bend=pkg.model.tables.INPUT_BENDS.rows.find(b=>Number(b.BEND_PTR)===Number(row.BEND_PTR));if(!bend)throw new TypeError('Bend declaration missing.');
 const R=Number(bend.RADIUS)*MM,L=R*Math.tan(beta/2),T0=subtract(I,scale(t0,L)),T1=add(I,scale(t1,L)),axis=unit(cross(t0,t1)),centre=add(T0,scale(unit(cross(axis,t0)),R)),startRadial=unit(subtract(T0,centre)),M=add(centre,scale(rotate(startRadial,axis,beta/2),R));
 return{sourcePoint:S,tangentIntersection:I,tangentStart:T0,midpoint:M,tangentEnd:T1,centre,radiusM:R,bendAngle:beta,turnAxis:axis,startRadial,nearStraightLengthM:norm(subtract(T0,S)),tangentLengthM:L};
}
function straightPath(a,b){const delta=subtract(b,a),L=norm(delta),t=unit(delta);return{kind:'STRAIGHT',length:L,sample:x=>({r:add(a,scale(delta,x)),t})};}
function arcPath(c,R,axis,r0,a0,a1){const sweep=a1-a0;return{kind:'ARC',length:R*sweep,sample:x=>{const ang=a0+sweep*x,rad=rotate(r0,axis,ang),r=add(c,scale(rad,R)),t=unit(cross(axis,rad));return{r,t};}};}
function continuumStiffness(paths,p){
 const rI=paths[0].sample(0).r,rJ=paths.at(-1).sample(1).r,F=matrix(6,6),basis=Array.from({length:6},(_,j)=>({force:j<3?unitBasis(j):[0,0,0],moment:j>=3?unitBasis(j-3):[0,0,0]}));
 for(const path of paths){const n=4096,h=1/n;for(let i=0;i<=n;i++){const w=(i===0||i===n)?1:(i%2?4:2),s=path.sample(i/n),ds=path.length*h/3*w,states=basis.map(b=>sectionState(b,s.r,s.t,rJ));for(let a=0;a<6;a++)for(let b=a;b<6;b++){const A=states[a],B=states[b],v=A.N*B.N/p.EA_N+dot(A.V,B.V)/p.kappaGA_N+A.T*B.T/p.GJ_Nm2+dot(A.Mb,B.Mb)/p.effectiveBendEI_Nm2;F[a][b]+=v*ds;if(a!==b)F[b][a]+=v*ds;}}}
 const Ktip=invert(F),dr=subtract(rJ,rI),B=matrix(6,12);for(let i=0;i<3;i++){B[i][i]=-1;B[i][6+i]=1;B[3+i][3+i]=-1;B[3+i][9+i]=1;}const S=skew(dr);for(let r=0;r<3;r++)for(let c=0;c<3;c++)B[r][3+c]=S[r][c];return flatten(multiplyMatrices(transpose(B),multiplyMatrices(Ktip,B)));
}
function sectionState(load,r,t,rJ){const F=load.force,M=add(load.moment,cross(subtract(rJ,r),F)),N=dot(F,t),V=subtract(F,scale(t,N)),T=dot(M,t),Mb=subtract(M,scale(t,T));return{N,V,T,Mb};}
function straightLimitSelfCheck(p){
 const L=0.123,paths=[straightPath([0,0,0],[L,0,0])],K=continuumStiffness(paths,{...p,effectiveBendEI_Nm2:p.physicalEI_Nm2}),tip=tipFlexibilityFromK(K,L),expected={axial:L/p.EA_N,torsion:L/p.GJ_Nm2,shearBend:L**3/(3*p.physicalEI_Nm2)+L/p.kappaGA_N,rotation:L/p.physicalEI_Nm2};
 const observed={axial:tip[0][0],torsion:tip[3][3],shearBendY:tip[1][1],shearBendZ:tip[2][2],rotationY:tip[4][4],rotationZ:tip[5][5]};
 const errors=[rel(observed.axial,expected.axial),rel(observed.torsion,expected.torsion),rel(observed.shearBendY,expected.shearBend),rel(observed.shearBendZ,expected.shearBend),rel(observed.rotationY,expected.rotation),rel(observed.rotationZ,expected.rotation)];return{lengthM:L,observed,expected,maxRelativeError:Math.max(...errors)};
}
function tipFlexibilityFromK(Kflat,L){const K=unflatten(Kflat),free=[6,7,8,9,10,11],Kff=submatrix(K,free,free);return invert(Kff);}
function differentialRaw(raw,i,j){const dA=[...rawDof(raw,ACASE,i),...rawDof(raw,ACASE,j)],dB=[...rawDof(raw,BCASE,i),...rawDof(raw,BCASE,j)],qA=rawAction(raw,ACASE,i,j),qB=rawAction(raw,BCASE,i,j);return{deltaDof:subtract(dA,dB),deltaAction:subtract(qA,qB)};}
function compare(K,dd,dq,t){const pred=multiplyFlat12(K,dd),res=subtract(pred,dq),sc=actionScales(dq,t),nr=res.map((v,i)=>v/sc[i]),abs=nr.map(Math.abs),m=Math.max(...abs);return{predictedDeltaAction:pred,residual:res,normalizedResidual:nr,normalizedResidualL2:Math.hypot(...nr),maxAbsNormalizedResidual:m,governingComponent:actionLabel(abs.indexOf(m)),statusAtExistingTenPercentGate:m<=LIMIT?'PASS':'FAIL'};}
function matrixDelta(A,B){const d=A.map((v,i)=>v-B[i]),na=Math.hypot(...A),nb=Math.hypot(...B);return{absoluteFrobenius:Math.hypot(...d),continuumFrobenius:na,chordFrobenius:nb,relativeFrobenius:Math.hypot(...d)/Math.max(na,nb,1)};}
function condensedStiffness(entries){const ids=[String(entries[0].nodeI),...entries.map(e=>String(e.nodeJ))],idx=new Map(ids.map((id,i)=>[id,i])),n=ids.length*6,K=matrix(n,n);for(const e of entries)addElementMatrix(K,e.globalStiffness,idx.get(String(e.nodeI)),idx.get(String(e.nodeJ)));const b=[...Array.from({length:6},(_,i)=>i),...Array.from({length:6},(_,i)=>(ids.length-1)*6+i)],ii=Array.from({length:Math.max(0,(ids.length-2)*6)},(_,i)=>6+i);if(!ii.length)return flatten(submatrix(K,b,b));const Kbb=submatrix(K,b,b),Kbi=submatrix(K,b,ii),Kib=submatrix(K,ii,b),Kii=submatrix(K,ii,ii),X=solveColumns(Kii,Kib);return flatten(subtractMatrix(Kbb,multiplyMatrices(Kbi,X)));}
function rawDof(raw,n,id){const m=raw.tables.OUTPUT_DISPLACEMENTS.rows.filter(r=>Number(r.LCASE_NUM)===n&&String(r.NODE)===id);if(m.length!==1)throw new TypeError(`Raw dof ${n} ${id}: ${m.length}`);const r=m[0];return[Number(r.DX)*MM,Number(r.DY)*MM,Number(r.DZ)*MM,Number(r.RX)*DEG,Number(r.RY)*DEG,Number(r.RZ)*DEG];}
function rawAction(raw,n,i,j){const m=raw.tables.OUTPUT_GLOBAL_ELEMENT_FORCES.rows.filter(r=>Number(r.LCASE_NUM)===n&&String(r.FROM_NODE)===i&&String(r.TO_NODE)===j);if(m.length!==1)throw new TypeError(`Raw action ${n} ${i}->${j}: ${m.length}`);const r=m[0];return[Number(r.FXF),Number(r.FYF),Number(r.FZF),Number(r.MXF),Number(r.MYF),Number(r.MZF),Number(r.FXT),Number(r.FYT),Number(r.FZT),Number(r.MXT),Number(r.MYT),Number(r.MZT)];}
function coord(pkg,id){const rows=pkg.model.tables.INPUT_NODAL_COORDINATES.rows,c=[];for(const r of rows){if(String(r.FROM_NODE)===String(id))c.push([Number(r.FROM_NODE_X),Number(r.FROM_NODE_Y),Number(r.FROM_NODE_Z)]);if(String(r.TO_NODE)===String(id))c.push([Number(r.TO_NODE_X),Number(r.TO_NODE_Y),Number(r.TO_NODE_Z)]);}if(!c.length)throw new TypeError(`Coordinate ${id} missing`);return c[0].map(v=>v*MM);}
function requireSource(pkg,id){const m=pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter(r=>String(r.ELEMENTID)===id);if(m.length!==1)throw new TypeError(`E${id} count=${m.length}`);return m[0];}
function ordered(entries,from,to){const rem=new Map(entries.map(e=>[e.elementId,e])),out=[];let n=from;while(n!==to){const c=[...rem.values()].filter(e=>String(e.nodeI)===n);if(c.length!==1)throw new TypeError(`Chain ${n} outgoing=${c.length}`);const e=c[0];out.push(e);rem.delete(e.elementId);n=String(e.nodeJ);}if(rem.size)throw new TypeError(`Disconnected ${rem.size}`);return out;}
function actionScales(ref,t){const floors=[...new Array(3).fill(Number(t.GLOBAL_END_FORCE_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_FORCE_TO.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_TO.scaleFloor))];return ref.map((v,i)=>Math.max(Math.abs(v),floors[i]));}
function actionLabel(i){const end=i<6?'FROM':'TO',l=i%6,c=l<3?FORCE[l]:MOM[l-3];return`${end}:${c}`;}
function addElementMatrix(g,l,ni,nj){const map=[...Array.from({length:6},(_,i)=>ni*6+i),...Array.from({length:6},(_,i)=>nj*6+i)];for(let r=0;r<12;r++)for(let c=0;c<12;c++)g[map[r]][map[c]]+=l[r*12+c];}
function unitBasis(i){const a=[0,0,0];a[i]=1;return a;}function skew(r){return[[0,-r[2],r[1]],[r[2],0,-r[0]],[-r[1],r[0],0]];}function rotate(v,a,x){const c=Math.cos(x),s=Math.sin(x);return add(add(scale(v,c),scale(cross(a,v),s)),scale(a,dot(a,v)*(1-c)));}
function matrix(r,c){return Array.from({length:r},()=>new Array(c).fill(0));}function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}function submatrix(A,r,c){return r.map(i=>c.map(j=>A[i][j]));}function flatten(A){return A.flat();}function unflatten(v){return Array.from({length:12},(_,r)=>v.slice(r*12,r*12+12));}function invert(A){return solveColumns(A,identity(A.length));}function identity(n){const A=matrix(n,n);for(let i=0;i<n;i++)A[i][i]=1;return A;}function subtractMatrix(A,B){return A.map((r,i)=>r.map((v,j)=>v-B[i][j]));}function multiplyMatrices(A,B){const o=matrix(A.length,B[0].length);for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++){const a=A[i][k];if(a===0)continue;for(let j=0;j<B[0].length;j++)o[i][j]+=a*B[k][j];}return o;}function solveColumns(A,B){const o=matrix(A.length,B[0].length);for(let c=0;c<B[0].length;c++){const x=solveDense(A,B.map(r=>r[c]));for(let r=0;r<A.length;r++)o[r][c]=x[r];}return o;}function solveDense(A,rhs){const n=A.length,M=A.map((r,i)=>[...r,rhs[i]]);for(let p=0;p<n;p++){let b=p;for(let r=p+1;r<n;r++)if(Math.abs(M[r][p])>Math.abs(M[b][p]))b=r;if(!(Math.abs(M[b][p])>1e-24))throw new Error(`SINGULAR_${p}`);[M[p],M[b]]=[M[b],M[p]];const d=M[p][p];for(let c=p;c<=n;c++)M[p][c]/=d;for(let r=0;r<n;r++){if(r===p)continue;const f=M[r][p];if(f===0)continue;for(let c=p;c<=n;c++)M[r][c]-=f*M[p][c];}}return M.map(r=>r[n]);}function multiplyFlat12(A,x){return Array.from({length:12},(_,r)=>{let s=0;for(let c=0;c<12;c++)s+=A[r*12+c]*x[c];return s;});}
function add(a,b){return a.map((v,i)=>v+b[i]);}function subtract(a,b){return a.map((v,i)=>v-b[i]);}function scale(a,s){return a.map(v=>v*s);}function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0);}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function norm(a){return Math.hypot(...a);}function unit(a){const n=norm(a);if(!(n>0))throw new TypeError('Degenerate vector');return scale(a,1/n);}function clamp(v,a,b){return Math.min(b,Math.max(a,v));}function rel(a,b){return Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),1e-30);}
function parseArgs(tokens){const r={};for(let i=0;i<tokens.length;i++){const t=tokens[i];if(!t.startsWith('--'))throw new TypeError(`Unexpected ${t}`);const v=tokens[i+1];if(v===undefined||v.startsWith('--'))throw new TypeError(`Missing ${t}`);r[t.slice(2)]=v;i++;}return r;}
