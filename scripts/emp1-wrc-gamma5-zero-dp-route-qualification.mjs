#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { calculateLocalAttachmentFoundation, reconstructResultHashes } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate,
  runEmp1Wrc537Gamma5ZeroDpRoute,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';

const routeRecord=JSON.parse(await readFile('validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v1.json','utf8'));
const producerRecord=JSON.parse(await readFile('validation/emp1/wrc537-2013/emp1-a-zero-dp-wrc-load-producer-qualification-v1.json','utf8'));
const oracle=JSON.parse(await readFile('validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json','utf8'));
const routeHash=sha256Canonical(routeRecord.semanticPayload);
assert.equal(routeHash,routeRecord.qualificationRecordSha256);
assert.equal(routeHash,EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256);
assert.equal(routeRecord.status,'PASS_METHOD_AUTHORITY_PENDING_ROUTE_REOBSERVATION');
assert.equal(routeRecord.engineeringAuthority,true);
assert.equal(routeRecord.productionRouteAuthority,false);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,false);
assert.equal(producerRecord.status,'PASS_REOBSERVED_INDEPENDENT_ZERO_DP_LOAD_PRODUCER');
assert.equal(producerRecord.engineeringAuthority,true);
assert.equal(producerRecord.semanticHashSha256,routeRecord.semanticPayload.loadProducerQualificationSha256);
assert.equal(oracle.status,'PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE');
assert.equal(oracle.semanticHash,routeRecord.semanticPayload.benchmarkQualification.benchmarkHash);

const result=calculateLocalAttachmentFoundation(routeFixture());
assert.equal(result.qualification.state,'ACCEPTED');
const transferred=result.transformedLoadCases.find((row)=>row.identity==='LC-1');
const expectedGlobalForce=[-400,-250,-1000];
const expectedGlobalMoment=[-500000,600000,-700000];
assert.deepEqual(transferred.transformedForceGlobal,expectedGlobalForce);
assert.deepEqual(transferred.transformedMomentGlobal,expectedGlobalMoment);

const input={
  loadTransferResult:result,
  loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0],
  geometry:{meanRadius:100,shellThickness:20,attachmentRadius:17.714285714285715,gamma:5,beta:0.155},
  axes:{vesselCenterlineGlobal:[1,0,0],nozzleCenterlineGlobal:[0,0,1]},
  stressConcentration:{Kn:1,Kb:1},
};
const candidate=evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate(input);
assert.equal(candidate.state,'PASS_BOUNDED_ROUTE_CANDIDATE');
assert.equal(candidate.engineeringUseAuthorized,true);
assert.equal(candidate.productionRouteAuthority,false);
assert.equal(candidate.globalEmp1CRouteAuthority,false);
assert.equal(candidate.methodGate.state,'METHOD_QUALIFIED');
assert.equal(candidate.methodGate.scopeStatus,'PASS_BOUNDED_SCOPE');
assert.equal(candidate.loadCustody.productionRouteInputAuthorized,false,'raw custody record is immutable input evidence; qualified numerics revalidates it separately');
assert.equal(candidate.numerics.qualifiedInputAuthority,true);
assert.equal(candidate.numerics.state,'EVALUATED_BOUNDED_GAMMA5_TABLE5_QUALIFIED_INPUT');
assert.deepEqual(candidate.numerics.wrcLoads,oracle.semanticPayload.case.loads);
let stressComparisons=0;
for(const key of ['circumferential','longitudinal','shear','stressIntensity']){
  candidate.stresses[key].forEach((value,index)=>{close(value,oracle.semanticPayload.expected[key][index],`${key}[${index}]`);stressComparisons+=1;});
}
assert.equal(stressComparisons,32);
expectCode('premature-route-registration',()=>runEmp1Wrc537Gamma5ZeroDpRoute(input),'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_NOT_AUTHORIZED');

const falsifiers=[];
runFalsifier('nonzero-dp',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,loadTransferResult:calculateLocalAttachmentFoundation(nonzeroDpRouteFixture())}),'EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE');
runFalsifier('nonunity-kn',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,stressConcentration:{Kn:1.01,Kb:1}}),'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
runFalsifier('nonunity-kb',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,stressConcentration:{Kn:1,Kb:0.99}}),'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
runFalsifier('gamma15',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,geometry:{...input.geometry,meanRadius:300,gamma:15,beta:0.155,attachmentRadius:53.142857142857146}}),'EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED');
runFalsifier('beta-high',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,geometry:{...input.geometry,attachmentRadius:60,beta:0.525}}),'EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED');
runFalsifier('reference-mismatch',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,wrcReferencePointGlobal:[0,0,1]}),'EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
const hashTamper=structuredClone(result);hashTamper.semanticHashes.resultPayloadSemanticHash='fnv1a64:0000000000000000';
runFalsifier('upstream-hash-drift',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,loadTransferResult:hashTamper}),'EMP1_A_WRC_ZERO_DP_RESULT_HASH_DRIFT:resultPayloadSemanticHash');
runFalsifier('nonorthogonal-frame',()=>evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate({...input,axes:{vesselCenterlineGlobal:[1,0,0],nozzleCenterlineGlobal:[1,0,1]}}),'EMP1_WRC537_FRAME_NON_ORTHOGONAL');

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma5-zero-dp-route-qualification/v1',
  status:'PASS_ROUTE_CANDIDATE_END_TO_END',
  engineeringAuthority:true,productionRouteAuthority:false,globalEmp1CRouteAuthority:false,
  routeQualificationSha256:routeHash,loadProducerQualificationSha256:producerRecord.semanticHashSha256,
  upstreamResultHashes:result.semanticHashes,
  transferredGlobal:{force:transferred.transformedForceGlobal,moment:transferred.transformedMomentGlobal},
  wrcLoads:candidate.numerics.wrcLoads,
  oracleSemanticHash:oracle.semanticHash,
  stressComparisons,
  falsifiersPassed:falsifiers.length,falsifiers,
},null,2));

function routeFixture(){return canonicalFixture((source)=>{
  source.loadCases[0].pipeForceGlobal.value=[-400,-250,-1000];
  source.loadCases[0].pipeMomentGlobal.value=[-750000,1000000,-700000];
  source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=0;row.externalPressure.value=0;});
});}
function nonzeroDpRouteFixture(){return canonicalFixture((source)=>{
  source.loadCases[0].pipeForceGlobal.value=[-400,-250,-1000];
  source.loadCases[0].pipeMomentGlobal.value=[-750000,1000000,-700000];
  source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=1;row.externalPressure.value=0;});
});}
function runFalsifier(name,fn,code){expectCode(name,fn,code);falsifiers.push(name);}
function expectCode(name,fn,prefix){let caught=null;try{fn();}catch(error){caught=error;}assert.ok(caught,`${name}: expected failure`);assert.ok(String(caught.code??caught.message).startsWith(prefix),`${name}: actual=${caught.code??caught.message}`);}
function close(a,e,label){const t=Math.max(1,Math.abs(e))*1e-11;assert.ok(Math.abs(a-e)<=t,`${label}: actual=${a} expected=${e} tol=${t}`);}
function sha256Canonical(value){return createHash('sha256').update(JSON.stringify(sortValue(value)),'utf8').digest('hex');}
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=sortValue(value[key]);return out;}return value;}
