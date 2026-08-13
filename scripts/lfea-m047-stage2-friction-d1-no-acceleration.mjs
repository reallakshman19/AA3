#!/usr/bin/env node
/**
 * M047 Stage 2 D1-N1 experiment: accepted D1 friction law with the componentwise
 * secant slip accelerator disabled. One numerical mechanic changes only: the
 * fixed-point map uses its plain return-mapped slip update every iteration.
 *
 * Same source, D1 force law, k_f, cap, normal basis, state thresholds, 400-iteration
 * budget, convergence gates and qualified linear mechanics. Production untouched.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { buildD1SolverSource, D1_PROFILE_ID } from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath=fileURLToPath(import.meta.url);
const scriptsDir=dirname(scriptPath);
const root=resolve(scriptsDir,'..');
const solverPath=resolve(root,'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath=resolve(scriptsDir,'lfea-m047-stage2-friction-tuning-loop.mjs');
const N1_VARIANT='D1-N1-plain-return-map-no-secant-acceleration';
const N1_PROFILE_ID='CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-N1-NO-ACCELERATION';

function replaceExactly(source,before,after,label){
 const first=source.indexOf(before); if(first<0) throw new Error(`N1 source guard failed: ${label} not found.`);
 if(source.indexOf(before,first+before.length)>=0) throw new Error(`N1 source guard failed: ${label} matched more than once.`);
 return source.slice(0,first)+after+source.slice(first+before.length);
}
function buildN1SolverSource(source){
 let patched=buildD1SolverSource(source);
 patched=replaceExactly(patched,`  profileId: '${D1_PROFILE_ID}',`,`  profileId: '${N1_PROFILE_ID}',`,'D1 profile id');
 patched=replaceExactly(patched,"  acceleration: 'COMPONENTWISE_SECANT_ON_SLIP_VECTOR_V1',","  acceleration: 'NONE_PLAIN_RETURN_MAPPING_V1',",'acceleration metadata');
 patched=replaceExactly(patched,
`      const eligible = !stateChanged
        && previous !== null
        && iteration >= profile.accelerationMinimumIterations
        && residualNormM > 0;`,
`      // N1 numerical variant: use the raw return-map fixed-point update only.
      // No convergence gate, tolerance, state rule or iteration budget changes.
      const eligible = false;`,
'componentwise secant eligibility');
 return patched;
}
function parse(argv){const m=new Map();for(let i=0;i<argv.length;i+=2)m.set(argv[i],argv[i+1]);const accdbPath=m.get('--accdb');if(!accdbPath)throw new TypeError('N1 requires --accdb <BM4_L.ACCDB>.');return{accdbPath,caseId:m.get('--case')??'L13',outPath:m.get('--out')??null,profilePath:m.get('--profile')}}
async function runN1(input){
 const token=`${process.pid}-${Date.now()}`; const solverName=`caesar-accdb-friction-solve.n1-${token}.mjs`; const tuningName=`lfea-m047-stage2-friction-tuning-loop.n1-${token}.mjs`;
 const tempSolver=resolve(dirname(solverPath),solverName), tempTuning=resolve(scriptsDir,tuningName);
 const patchedSolver=buildN1SolverSource(readFileSync(solverPath,'utf8'));
 const patchedTuning=replaceExactly(readFileSync(tuningPath,'utf8'),'../src/core/fea-benchmarks/caesar-accdb-friction-solve.js',`../src/core/fea-benchmarks/${solverName}`,'tuning import');
 const sha=createHash('sha256').update(patchedSolver).digest('hex');
 try{
  writeFileSync(tempSolver,patchedSolver,'utf8'); writeFileSync(tempTuning,patchedTuning,'utf8');
  const {runFrictionTuningIteration}=await import(`${pathToFileURL(tempTuning).href}?n1=${encodeURIComponent(token)}`);
  const record=await runFrictionTuningIteration({accdbPath:input.accdbPath,profilePath:input.profilePath,caseId:input.caseId,variant:N1_VARIANT});
  if(record.solverProfileId!==N1_PROFILE_ID) throw new Error(`N1 profile mismatch ${record.solverProfileId}`);
  const published={...record,n1Evidence:{experimentId:N1_VARIANT,baseline:'ACCEPTED_D1',changedMechanic:'SLIP_FIXED_POINT_ACCELERATION_ONLY',rule:'PLAIN_RETURN_MAP_NO_COMPONENTWISE_SECANT',unchangedMechanics:['D1_DIRECTION','FRICTION_STIFFNESS','COULOMB_CAP_MAGNITUDE','NORMAL_REACTION_BASIS','STATE_BOUNDARIES','MAXIMUM_ITERATIONS','CONVERGENCE_GATES','QUALIFIED_LINEAR_MECHANICS'],ephemeralSolverSha256:sha,productionSolverModified:false}};
  if(input.outPath){const out=resolve(input.outPath);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,`${canonicalPrettyStringify(published)}\n`,'utf8');}
  process.stdout.write(`${canonicalPrettyStringify({variant:N1_VARIANT,converged:published.converged,elapsedMs:published.elapsedMs,summary:published.summary,failure:published.failure,ephemeralSolverSha256:sha})}\n`);
  return published;
 } finally {for(const p of [tempTuning,tempSolver])try{rmSync(p,{force:true})}catch{}}
}
if(process.argv[1]&&resolve(process.argv[1])===scriptPath) await runN1(parse(process.argv.slice(2)));
export {buildN1SolverSource,runN1,N1_PROFILE_ID,N1_VARIANT};
