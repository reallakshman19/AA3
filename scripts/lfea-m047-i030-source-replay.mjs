#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const LOCKED_SHA='85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const DOFS=['UX','UY','UZ','RX','RY','RZ'];
const ACTIONS=['FX','FY','FZ','MX','MY','MZ'];

function cli(argv){const m=new Map();for(let i=0;i<argv.length;i+=2){if(!argv[i]?.startsWith('--')||argv[i+1]===undefined)throw new TypeError(`Invalid argument near ${String(argv[i])}`);m.set(argv[i].slice(2),resolve(argv[i+1]));}for(const k of ['raw','benchmark','actual','out','summary'])if(!m.has(k))throw new TypeError(`Missing --${k}`);return Object.fromEntries(m);}
function parseJson(path){return JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/u,''));}
function text(v){return String(v??'').trim();}
function num(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function sha256(t){return createHash('sha256').update(t,'utf8').digest('hex');}
function caseReport(report,id){const c=report.qualification?.cases?.find((x)=>x.caseId===id);if(!c)throw new Error(`Missing benchmark case ${id}`);return c;}
function matrix(n){return Array.from({length:n},()=>new Float64Array(n));}
function vector(n){return new Float64Array(n);}
function addElement(K,f,nodeIndex,e){
  const ids=[...Array(6).keys()].map((d)=>nodeIndex.get(text(e.nodeI))*6+d).concat([...Array(6).keys()].map((d)=>nodeIndex.get(text(e.nodeJ))*6+d));
  if(!Array.isArray(e.globalStiffness)||e.globalStiffness.length!==144)throw new Error(`Element ${e.elementId} lacks 12x12 matrix evidence.`);
  if(!Array.isArray(e.equivalentLoadGlobal)||e.equivalentLoadGlobal.length!==12||!Array.isArray(e.initialStrainLoadGlobal)||e.initialStrainLoadGlobal.length!==12)throw new Error(`Element ${e.elementId} lacks load evidence.`);
  for(let a=0;a<12;a++){
    f[ids[a]]+=Number(e.equivalentLoadGlobal[a])+Number(e.initialStrainLoadGlobal[a]);
    for(let b=0;b<12;b++)K[ids[a]][ids[b]]+=Number(e.globalStiffness[a*12+b]);
  }
}
function luFactor(A){
  const n=A.length;const lu=A.map((r)=>Float64Array.from(r));const piv=Int32Array.from({length:n},(_,i)=>i);
  let maxA=0;for(const r of lu)for(const x of r)maxA=Math.max(maxA,Math.abs(x));const tol=Math.max(1e-18,maxA*1e-13);
  for(let k=0;k<n;k++){
    let p=k;let best=Math.abs(lu[k][k]);for(let i=k+1;i<n;i++){const v=Math.abs(lu[i][k]);if(v>best){best=v;p=i;}}
    if(!(best>tol))throw new Error(`I030 source condensation singular/ill-conditioned pivot ${k}: ${best} <= ${tol}`);
    if(p!==k){const tr=lu[k];lu[k]=lu[p];lu[p]=tr;const tp=piv[k];piv[k]=piv[p];piv[p]=tp;}
    for(let i=k+1;i<n;i++){lu[i][k]/=lu[k][k];const lik=lu[i][k];for(let j=k+1;j<n;j++)lu[i][j]-=lik*lu[k][j];}
  }
  return {lu,piv};
}
function luSolve(fac,b){
  const {lu,piv}=fac,n=lu.length;const x=new Float64Array(n);for(let i=0;i<n;i++)x[i]=b[piv[i]];
  for(let i=0;i<n;i++)for(let j=0;j<i;j++)x[i]-=lu[i][j]*x[j];
  for(let i=n-1;i>=0;i--){for(let j=i+1;j<n;j++)x[i]-=lu[i][j]*x[j];x[i]/=lu[i][i];}
  return x;
}
function condense(K,f,boundary){
  const n=K.length;const bset=new Set(boundary);const internal=[];for(let i=0;i<n;i++)if(!bset.has(i))internal.push(i);
  const nb=boundary.length;
  const Kbb=matrix(nb);const fb=vector(nb);
  for(let a=0;a<nb;a++){fb[a]=f[boundary[a]];for(let b=0;b<nb;b++)Kbb[a][b]=K[boundary[a]][boundary[b]];}
  if(internal.length===0)return {Kc:Kbb,fc:fb,internalDofCount:0};
  const ni=internal.length;const Kii=matrix(ni), Kib=matrix(ni), Kbi=matrix(nb), fi=vector(ni);
  for(let i=0;i<ni;i++){fi[i]=f[internal[i]];for(let j=0;j<ni;j++)Kii[i][j]=K[internal[i]][internal[j]];for(let b=0;b<nb;b++)Kib[i][b]=K[internal[i]][boundary[b]];}
  for(let b=0;b<nb;b++)for(let i=0;i<ni;i++)Kbi[b][i]=K[boundary[b]][internal[i]];
  const fac=luFactor(Kii);const yi=luSolve(fac,fi);const X=Array.from({length:nb},(_,col)=>luSolve(fac,Float64Array.from(Kib.map((r)=>r[col]))));
  const Kc=matrix(nb),fc=vector(nb);
  for(let a=0;a<nb;a++){
    let sf=0;for(let i=0;i<ni;i++)sf+=Kbi[a][i]*yi[i];fc[a]=fb[a]-sf;
    for(let b=0;b<nb;b++){let sk=0;for(let i=0;i<ni;i++)sk+=Kbi[a][i]*X[b][i];Kc[a][b]=Kbb[a][b]-sk;}
  }
  return {Kc,fc,internalDofCount:ni};
}
function mul(A,x){const y=new Float64Array(A.length);for(let i=0;i<A.length;i++){let s=0;for(let j=0;j<x.length;j++)s+=A[i][j]*x[j];y[i]=s;}return y;}
function displacementMap(rows){const m=new Map();for(const r of rows){if(r.entityKind!=='NODE'||!['DISPLACEMENT','ROTATION'].includes(r.quantity))continue;m.set(`${text(r.entityId)}:${r.component}`,Number(r.referenceValue));}return m;}
function sourceActionRows(rows,sourceId){return rows.filter((r)=>r.entityKind==='ELEMENT'&&text(r.entityId).startsWith(`INPUT_ELEMENT:${sourceId}|`)&&r.quantity.startsWith('GLOBAL_END_'));}
function orderedReferenceActions(rows,sourceId){
  const candidates=sourceActionRows(rows,sourceId);const result=[];
  for(const end of ['FROM','TO'])for(const comp of ACTIONS){const suffix=comp.startsWith('M')?'MOMENT':'FORCE';const q=`GLOBAL_END_${suffix}_${end}`;const hits=candidates.filter((r)=>r.quantity===q&&r.component===comp);if(hits.length!==1)throw new Error(`Expected one source action ${sourceId} ${end} ${comp}; found ${hits.length}`);result.push(hits[0]);}
  return result;
}
function normError(actual,row){const floor=Number(row.tolerance?.scaleFloor);const scale=Number.isFinite(floor)&&floor>0?Math.max(Math.abs(Number(row.referenceValue)),floor):Math.max(Math.abs(Number(row.referenceValue)),1);return Math.abs(actual-Number(row.referenceValue))/scale;}
function endpointVector(disp,from,to){const x=[];for(const node of [from,to])for(const d of DOFS){const v=disp.get(`${node}:${d}`);if(!Number.isFinite(v))throw new Error(`Missing CAESAR endpoint DOF ${node}:${d}`);x.push(v);}return Float64Array.from(x);}
function sourceReplay(sourceRow,ledger,comparisonRows){
  const sid=text(sourceRow.ELEMENTID), descendants=ledger.filter((e)=>text(e.sourceElementId)===sid);
  if(descendants.length===0)throw new Error(`Source ${sid} has no descendants.`);
  const nodes=[...new Set(descendants.flatMap((e)=>[text(e.nodeI),text(e.nodeJ)]))].sort();const nodeIndex=new Map(nodes.map((id,i)=>[id,i]));
  const from=text(sourceRow.FROM_NODE),to=text(sourceRow.TO_NODE);if(!nodeIndex.has(from)||!nodeIndex.has(to))throw new Error(`Source ${sid} descendants do not retain source endpoints ${from}->${to}.`);
  const nd=nodes.length*6,K=matrix(nd),f=vector(nd);for(const e of descendants)addElement(K,f,nodeIndex,e);
  const boundary=[...Array(6).keys()].map((d)=>nodeIndex.get(from)*6+d).concat([...Array(6).keys()].map((d)=>nodeIndex.get(to)*6+d));
  const {Kc,fc,internalDofCount}=condense(K,f,boundary);const disp=displacementMap(comparisonRows);const db=endpointVector(disp,from,to);const q=mul(Kc,db);for(let i=0;i<12;i++)q[i]-=fc[i];
  const refs=orderedReferenceActions(comparisonRows,sid);const systemRows=refs;const components=refs.map((r,i)=>{
    const replayValue=q[i], replayNormalizedError=normError(replayValue,r), systemNormalizedError=normError(Number(r.actualValue),r);
    return {end:i<6?'FROM':'TO',component:ACTIONS[i%6],quantity:r.quantity,unit:r.unit,referenceValue:Number(r.referenceValue),systemActualValue:Number(r.actualValue),replayValue,replayNormalizedError,systemNormalizedError,replayPass:replayNormalizedError<=0.1,systemPass:r.status!=='FAIL'};
  });
  const replayFail=components.filter((x)=>!x.replayPass),systemFail=components.filter((x)=>!x.systemPass);
  let classification='LOCAL_AND_SYSTEM_PASS';
  if(replayFail.length&&systemFail.length)classification='LOCAL_FORMULATION_OR_LOAD_MISMATCH_PRESENT';
  else if(!replayFail.length&&systemFail.length)classification='NETWORK_REDISTRIBUTION_DOMINANT';
  else if(replayFail.length&&!systemFail.length)classification='LOCAL_MISMATCH_COMPENSATED_IN_SYSTEM';
  return {sourceElementId:sid,fromNode:from,toNode:to,descendantCount:descendants.length,internalDofCount,kindSet:[...new Set(descendants.map((e)=>e.kind))].sort(),classification,replayFailingComponentCount:replayFail.length,systemFailingComponentCount:systemFail.length,maxReplayNormalizedError:Math.max(...components.map((x)=>x.replayNormalizedError)),maxSystemNormalizedError:Math.max(...components.map((x)=>x.systemNormalizedError)),components};
}

const input=cli(process.argv.slice(2));const rawText=readFileSync(input.raw,'utf8').replace(/^\uFEFF/u,'');const raw=JSON.parse(rawText);if(raw?.source?.sha256!==LOCKED_SHA)throw new Error('I030 locked ACCDB mismatch.');
const benchmark=parseJson(input.benchmark),actual=parseJson(input.actual);if(actual.sourceAccdbSha256!==LOCKED_SHA)throw new Error('I030 actual source custody mismatch.');
const sourceRows=raw.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;if(!Array.isArray(sourceRows)||sourceRows.length!==96)throw new Error(`I030 expected 96 source rows; found ${sourceRows?.length}.`);
const cases={};
for(const caseId of ['L19','L20']){
  const report=caseReport(benchmark,caseId), rows=report.comparison.rows, ledger=actual.mechanics?.cases?.[caseId]?.elementLedger;
  if(!Array.isArray(ledger)||ledger.some((e)=>!Array.isArray(e.globalStiffness)))throw new Error(`I030 ${caseId} lacks matrix evidence.`);
  const sources=sourceRows.map((row)=>sourceReplay(row,ledger,rows));
  const local=sources.filter((s)=>s.classification==='LOCAL_FORMULATION_OR_LOAD_MISMATCH_PRESENT'||s.classification==='LOCAL_MISMATCH_COMPENSATED_IN_SYSTEM');
  const redistribution=sources.filter((s)=>s.classification==='NETWORK_REDISTRIBUTION_DOMINANT');
  cases[caseId]={sourceCount:sources.length,localMismatchSourceCount:local.length,networkRedistributionSourceCount:redistribution.length,sources,topReplayErrors:[...sources].sort((a,b)=>b.maxReplayNormalizedError-a.maxReplayNormalizedError).slice(0,25).map((s)=>({sourceElementId:s.sourceElementId,fromNode:s.fromNode,toNode:s.toNode,kindSet:s.kindSet,classification:s.classification,replayFailingComponentCount:s.replayFailingComponentCount,systemFailingComponentCount:s.systemFailingComponentCount,maxReplayNormalizedError:s.maxReplayNormalizedError,maxSystemNormalizedError:s.maxSystemNormalizedError}))};
}
const result={schema:'lfea-m047-i030-source-replay/v1',issueId:'M047',iterationId:'M047-I030',sourceAccdbSha256:LOCKED_SHA,rawExportSha256:sha256(rawText),mechanics:'M047-I029_SMOOTH90_ONLY',equation:'q_b=(K_bb-K_bi*K_ii^-1*K_ib)*d_caesar-(f_b-K_bi*K_ii^-1*f_i)',cases};
writeFileSync(input.out,`${JSON.stringify(result,null,2)}\n`,'utf8');
const lines=['# M047 I030 source prescribed-DOF replay','',`- ACCDB: \`${LOCKED_SHA}\``,'- mechanics: I029 smooth-90 only; no shear candidate',''];
for(const cid of ['L19','L20']){const c=cases[cid];lines.push(`## ${cid}`,`- sources replayed: ${c.sourceCount}`,`- sources with local replay >10%: ${c.localMismatchSourceCount}`,`- system-failing sources that replay <=10%: ${c.networkRedistributionSourceCount}`,'','Top replay errors:');for(const s of c.topReplayErrors.slice(0,15))lines.push(`- source ${s.sourceElementId} ${s.fromNode}->${s.toNode} [${s.kindSet.join('+')}]: replay max ${(100*s.maxReplayNormalizedError).toFixed(3)}%, system max ${(100*s.maxSystemNormalizedError).toFixed(3)}%, replay fails ${s.replayFailingComponentCount}, system fails ${s.systemFailingComponentCount}, ${s.classification}`);lines.push('');}
writeFileSync(input.summary,`${lines.join('\n')}\n`,'utf8');
console.log(JSON.stringify({L19:{local:cases.L19.localMismatchSourceCount,redistribution:cases.L19.networkRedistributionSourceCount,top:cases.L19.topReplayErrors.slice(0,8)},L20:{local:cases.L20.localMismatchSourceCount,redistribution:cases.L20.networkRedistributionSourceCount,top:cases.L20.topReplayErrors.slice(0,5)}}));
