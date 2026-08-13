#!/usr/bin/env node
/**
 * M047 Stage 2 D1-N2 experiment: accepted D1 with active-set-preserving secant
 * acceleration. The raw return map remains authoritative for state transitions;
 * an extrapolated slip candidate is rejected if, at the current solved position,
 * it crosses an existing governed stick/slide boundary that the raw map did not.
 *
 * One numerical mechanic only. No new tolerance or node-specific rule.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { buildD1SolverSource, D1_PROFILE_ID } from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath=fileURLToPath(import.meta.url), scriptsDir=dirname(scriptPath), root=resolve(scriptsDir,'..');
const solverPath=resolve(root,'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath=resolve(scriptsDir,'lfea-m047-stage2-friction-tuning-loop.mjs');
const N2_VARIANT='D1-N2-active-set-preserving-secant-acceleration';
const N2_PROFILE_ID='CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-N2-ACTIVE-SET-SAFE-ACCELERATION';

function replaceExactly(source,before,after,label){const i=source.indexOf(before);if(i<0)throw new Error(`N2 source guard failed: ${label} not found.`);if(source.indexOf(before,i+before.length)>=0)throw new Error(`N2 source guard failed: ${label} matched more than once.`);return source.slice(0,i)+after+source.slice(i+before.length);}
function buildN2SolverSource(source){
 let p=buildD1SolverSource(source);
 p=replaceExactly(p,`  profileId: '${D1_PROFILE_ID}',`,`  profileId: '${N2_PROFILE_ID}',`,'D1 profile id');
 p=replaceExactly(p,"  acceleration: 'COMPONENTWISE_SECANT_ON_SLIP_VECTOR_V1',","  acceleration: 'COMPONENTWISE_SECANT_ACTIVE_SET_PRESERVING_V2',",'acceleration metadata');
 p=replaceExactly(p,
`    const accelerated = acceleration.next({
      order: plan.supports.map((support) => support.restraintId),
      current: slips,
      mapped: mappedSlips,
      stateChanged: stateChangedThisIteration,
    });
    const nextSlips = accelerated.slips;`,
`    const accelerationCandidate = acceleration.next({
      order: plan.supports.map((support) => support.restraintId),
      current: slips,
      mapped: mappedSlips,
      stateChanged: stateChangedThisIteration,
    });
    // N2 numerical safeguard: acceleration may shorten the route to the raw
    // fixed point, but it may not invent a different active-set transition. Test
    // the extrapolated slip at the current solved displacement using the same
    // governed cap, boundary and hysteresis already used by the return map.
    const accelerationCrossesStateBoundary = accelerationCandidate.applied
      && measured.some((entry) => {
        const candidateSlip = accelerationCandidate.slips.get(entry.restraintId);
        const candidateStretch = entry.tangentialDisplacement
          .map((value, index) => value - candidateSlip[index]);
        const candidateTrialMagnitude = entry.support.frictionStiffnessSiValue * norm(candidateStretch);
        const candidateBoundary = Math.max(
          profile.stateBoundaryAbsoluteN,
          profile.stateBoundaryRelative * Math.max(entry.capacityN, candidateTrialMagnitude),
        );
        const candidateBand = profile.stateHysteresisRelative * entry.capacityN;
        if (entry.nextState === 'STICK') {
          return candidateTrialMagnitude > entry.capacityN + candidateBoundary;
        }
        return candidateTrialMagnitude < entry.capacityN - candidateBoundary - candidateBand;
      });
    const accelerated = accelerationCrossesStateBoundary
      ? { ...accelerationCandidate, slips: mappedSlips, applied: false, factor: 1 }
      : accelerationCandidate;
    const nextSlips = accelerated.slips;`,
'acceleration acceptance');
 return p;
}
function parse(argv){const m=new Map();for(let i=0;i<argv.length;i+=2)m.set(argv[i],argv[i+1]);const accdbPath=m.get('--accdb');if(!accdbPath)throw new TypeError('N2 requires --accdb <BM4_L.ACCDB>.');return{accdbPath,caseId:m.get('--case')??'L13',outPath:m.get('--out')??null,profilePath:m.get('--profile')}}
async function runN2(input){
 const token=`${process.pid}-${Date.now()}`,solverName=`caesar-accdb-friction-solve.n2-${token}.mjs`,tuningName=`lfea-m047-stage2-friction-tuning-loop.n2-${token}.mjs`,tempSolver=resolve(dirname(solverPath),solverName),tempTuning=resolve(scriptsDir,tuningName);
 const solverSource=buildN2SolverSource(readFileSync(solverPath,'utf8')), tuningSource=replaceExactly(readFileSync(tuningPath,'utf8'),'../src/core/fea-benchmarks/caesar-accdb-friction-solve.js',`../src/core/fea-benchmarks/${solverName}`,'tuning import'), sha=createHash('sha256').update(solverSource).digest('hex');
 try{writeFileSync(tempSolver,solverSource,'utf8');writeFileSync(tempTuning,tuningSource,'utf8');const {runFrictionTuningIteration}=await import(`${pathToFileURL(tempTuning).href}?n2=${encodeURIComponent(token)}`);const record=await runFrictionTuningIteration({accdbPath:input.accdbPath,profilePath:input.profilePath,caseId:input.caseId,variant:N2_VARIANT});if(record.solverProfileId!==N2_PROFILE_ID)throw new Error(`N2 profile mismatch ${record.solverProfileId}`);const published={...record,n2Evidence:{experimentId:N2_VARIANT,baseline:'ACCEPTED_D1',changedMechanic:'ACCELERATION_ACTIVE_SET_SAFEGUARD_ONLY',rule:'REJECT_SECANT_EXTRAPOLATION_IF_IT_CROSSES_GOVERNED_STATE_BOUNDARY_RELATIVE_TO_RAW_RETURN_MAP',unchangedMechanics:['D1_DIRECTION','FRICTION_STIFFNESS','COULOMB_CAP_MAGNITUDE','NORMAL_REACTION_BASIS','STATE_BOUNDARIES','MAXIMUM_ITERATIONS','CONVERGENCE_GATES','QUALIFIED_LINEAR_MECHANICS'],ephemeralSolverSha256:sha,productionSolverModified:false}};if(input.outPath){const out=resolve(input.outPath);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,`${canonicalPrettyStringify(published)}\n`,'utf8');}process.stdout.write(`${canonicalPrettyStringify({variant:N2_VARIANT,converged:published.converged,elapsedMs:published.elapsedMs,summary:published.summary,failure:published.failure,ephemeralSolverSha256:sha})}\n`);return published;}finally{for(const f of[tempTuning,tempSolver])try{rmSync(f,{force:true})}catch{}}
}
if(process.argv[1]&&resolve(process.argv[1])===scriptPath)await runN2(parse(process.argv.slice(2)));
export{buildN2SolverSource,runN2,N2_PROFILE_ID,N2_VARIANT};
