#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const target=resolve(root,'validation/emp1/wrc537-2013/gamma15-full-table5-oracle-v1.json');
const runId=process.env.GITHUB_RUN_ID??null;
const runNumber=process.env.GITHUB_RUN_NUMBER?Number(process.env.GITHUB_RUN_NUMBER):null;
const stdout=execFileSync(process.execPath,['scripts/emp1-wrc-gamma15-full-table5-independent-handcalc.mjs'],{cwd:root,encoding:'utf8'});
const observed=JSON.parse(stdout);
if(!observed?.semanticHash||!observed?.semanticPayload) throw new Error('EMP1_GAMMA15_FULL_TABLE5_OBSERVATION_INVALID');
if(observed.productionObservationUsed!==false||!Array.isArray(observed.productionImports)||observed.productionImports.length!==0) throw new Error('EMP1_GAMMA15_FULL_TABLE5_PRODUCTION_CONTAMINATION');

let existing=null;
try{existing=JSON.parse(await readFile(target,'utf8'));}catch{}
let action='NO_CHANGE';
let record=existing;
if(!existing){
  record={
    schema:'emp1-wrc537-gamma15-full-table5-oracle/v1',
    status:'PASS_FROZEN_PENDING_REOBSERVATION',
    engineeringAuthority:false,
    productionAuthority:false,
    productionObservationUsed:false,
    source:{
      document:'WRC537_2013.pdf',
      rawPdfSha256:'698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
      extraction:'docs/emp1/WRC537_2013_Tables_and_Charts.md',
      domainRecord:'validation/emp1/wrc537-2013/cylindrical-original-gamma15-bounded-domain-v1.json',
      independentCalculation:'scripts/emp1-wrc-gamma15-full-table5-independent-handcalc.mjs'
    },
    semanticPayload:observed.semanticPayload,
    semanticHash:observed.semanticHash,
    reobservation:{status:'PENDING',workflowRunId:null,workflowRunNumber:null,productionImports:[],productionObservationUsed:false},
    authorization:{boundedAdapterProductionComparisonAllowed:false,boundedRouteRegistrationAllowed:false,globalEmp1CRouteRegistrationAllowed:false}
  };
  action='FROZEN_CANDIDATE';
}else{
  if(existing.semanticHash!==observed.semanticHash) throw new Error(`EMP1_GAMMA15_FULL_TABLE5_HASH_DRIFT:${observed.semanticHash}`);
  if(JSON.stringify(existing.semanticPayload)!==JSON.stringify(observed.semanticPayload)) throw new Error('EMP1_GAMMA15_FULL_TABLE5_PAYLOAD_DRIFT');
  if(existing.status==='PASS_FROZEN_PENDING_REOBSERVATION'){
    if(observed.status!=='PASS_REOBSERVED_FROZEN_FULL_TABLE5_ORACLE') throw new Error(`EMP1_GAMMA15_FULL_TABLE5_REOBSERVATION_STATE:${observed.status}`);
    record={...existing,
      status:'PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE',engineeringAuthority:true,
      reobservation:{status:'PASS',workflowRunId:runId,workflowRunNumber:runNumber,productionImports:[],productionObservationUsed:false},
      authorization:{boundedAdapterProductionComparisonAllowed:true,boundedRouteRegistrationAllowed:false,globalEmp1CRouteRegistrationAllowed:false}
    };
    action='PROMOTED_REOBSERVED';
  }else if(existing.status==='PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE'){
    if(observed.status!=='PASS_REOBSERVED_FROZEN_FULL_TABLE5_ORACLE') throw new Error(`EMP1_GAMMA15_FULL_TABLE5_STEADY_REOBSERVATION_STATE:${observed.status}`);
  }else throw new Error(`EMP1_GAMMA15_FULL_TABLE5_EXISTING_STATE:${existing.status}`);
}
if(action!=='NO_CHANGE') await writeFile(target,`${JSON.stringify(record,null,2)}\n`,'utf8');
console.log(JSON.stringify({schema:'emp1-wrc537-gamma15-full-table5-oracle-materialize/v1',status:'PASS',action,semanticHash:observed.semanticHash,observedStatus:observed.status,target},null,2));
