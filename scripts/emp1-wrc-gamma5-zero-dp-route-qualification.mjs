#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
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
assert.equal(routeRecord.status,'PASS_REOBSERVED_AUTHORIZED_BOUNDED_ZERO_DP_ROUTE');
assert.equal(routeRecord.engineeringAuthority,true);
assert.equal(routeRecord.productionRouteAuthority,true);
assert.equal(routeRecord.globalEmp1CRouteAuthority,false);
assert.equal(routeRecord.productionObservationUsedToSetAuthority,false);
assert.equal(routeRecord.reobservation?.status,'PASS_STRICT_FAIL_CLOSED_WORKFLOW');
assert.equal(routeRecord.reobservation?.stressComparisonsPassed,32);
assert.equal(routeRecord.reobservation?.routeFalsifiersPassed,8);
assert.equal(routeRecord.authorization?.boundedRouteRegistrationAllowed,true);
assert.equal(routeRecord.authorization?.nonzeroDifferentialPressureAllowed,false);
assert.equal(routeRecord.authorization?.nonUnityStressConcentrationAllowed,false);
assert.equal(routeRecord.authorization?.globalEmp1CRouteRegistrationAllowed,false);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,true);
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
assert.equal(candidate.productionRouteAuthority,false);
assert.equal(candidate.globalEmp1CRouteAuthority,false);
assert.equal(candidate.methodGate.state,'METHOD_QUALIFIED');
assert.equal(candidate.numerics.loadCustody.productionRouteInputAuthorized,true);

const authorized=runEmp1Wrc537Gamma5ZeroDpRoute(input);
assert.equal(authorized.state,'EVALUATED_AUTHORIZED_BOUNDED_GAMMA5_ZERO_DP_ROUTE');
assert.equal(authorized.engineeringUseAuthorized,true);
assert.equal(authorized.productionRouteAuthority,true);
assert.equal(authorized.globalEmp1CRouteAuthority,false);
assert.equal(authorized.routeQualificationSha256,routeHash);
assert.equal(authorized.loadCustody.status,'PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE');
assert.equal(authorized.loadCustody.producerQualification.qualificationRecordHash,producerRecord.semanticHashSha256);
assert.equal(authorized.numerics.qualifiedInputAuthority,true);
assert.equal(authorized.numerics.loadCustody.productionRouteInputAuthorized,true);
assert.deepEqual(authorized.numerics.wrcLoads,oracle.semanticPayload.case.loads);

let stressComparisons=0;
for(const key of ['circumferential','longitudinal','shear','stressIntensity']){
  authorized.stresses[key].forEach((value,index)=>{close(value,oracle.semanticPayload.expected[key][index],`${key}[${index}]`);stressComparisons+=1;});
}
assert.equal(stressComparisons,32);

const falsifiers=[];
runFalsifier('nonzero-dp',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,loadTransferResult:calculateLocalAttachmentFoundation(nonzeroDpRouteFixture())}),'EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE');
runFalsifier('nonunity-kn',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,stressConcentration:{Kn:1.01,Kb:1}}),'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
runFalsifier('nonunity-kb',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,stressConcentration:{Kn:1,Kb:0.99}}),'EMP1_WRC537_GAMMA5_ZERO_DP_UNITY_STRESS_CONCENTRATION_REQUIRED');
runFalsifier('gamma15',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,geometry:{...input.geometry,meanRadius:300,gamma:15,beta:0.155,attachmentRadius:53.142857142857146}}),'EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED');
runFalsifier('beta-high',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,geometry:{...input.geometry,attachmentRadius:60,beta:0.525}}),'EMP1_LOCAL_CORRELATION_NOT_AUTHORIZED');
runFalsifier('reference-mismatch',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,wrcReferencePointGlobal:[0,0,1]}),'EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
const hashTamper=structuredClone(result);hashTamper.semanticHashes.resultPayloadSemanticHash='fnv1a64:0000000000000000';
runFalsifier('upstream-hash-drift',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,loadTransferResult:hashTamper}),'EMP1_A_WRC_ZERO_DP_RESULT_HASH_DRIFT:resultPayloadSemanticHash');
runFalsifier('nonorthogonal-frame',()=>runEmp1Wrc537Gamma5ZeroDpRoute({...input,axes:{vesselCenterlineGlobal:[1,0,0],nozzleCenterlineGlobal:[1,0,1]}}),'EMP1_WRC537_FRAME_NON_ORTHOGONAL');

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma5-zero-dp-route-qualification/v3',
  status:'PASS_AUTHORIZED_ROUTE_END_TO_END_REOBSERVED',
  engineeringAuthority:true,productionRouteAuthority:true,globalEmp1CRouteAuthority:false,
  routeQualificationSha256:routeHash,loadProducerQualificationSha256:producerRecord.semanticHashSha256,
  upstreamResultHashes:result.semanticHashes,
  transferredGlobal:{force:transferred.transformedForceGlobal,moment:transferred.transformedMomentGlobal},
  qualifiedLoadCustody:{status:authorized.loadCustody.status,producerQualificationHash:authorized.loadCustody.producerQualification.qualificationRecordHash,normalizedRouteInputAuthorized:authorized.numerics.loadCustody.productionRouteInputAuthorized},
  wrcLoads:authorized.numerics.wrcLoads,
  oracleSemanticHash:oracle.semanticHash,
  stressComparisons,
  falsifiersPassed:falsifiers.length,falsifiers,
  remainingBlocked:{nonzeroDifferentialPressure:true,nonUnityStressConcentration:true,gammaOtherThan5:true,betaOutsideQualifiedDomain:true,globalEmp1CRoute:true},
},null,2));

function routeFixture(){return canonicalFixture((source)=>{
  source.loadCases[0].force.value=[-400,-250,-1000];
  source.loadCases[0].moment.value=[-750000,1000000,-700000];
  source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=0;row.externalPressure.value=0;});
});}
function nonzeroDpRouteFixture(){return canonicalFixture((source)=>{
  source.loadCases[0].force.value=[-400,-250,-1000];
  source.loadCases[0].moment.value=[-750000,1000000,-700000];
  source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=1;row.externalPressure.value=0;});
});}
function runFalsifier(name,fn,code){expectCode(name,fn,code);falsifiers.push(name);}
function expectCode(name,fn,prefix){let caught=null;try{fn();}catch(error){caught=error;}assert.ok(caught,`${name}: expected failure`);assert.ok(String(caught.code??caught.message).startsWith(prefix),`${name}: actual=${caught.code??caught.message}`);}
function close(a,e,label){const t=Math.max(1,Math.abs(e))*1e-11;assert.ok(Math.abs(a-e)<=t,`${label}: actual=${a} expected=${e} tol=${t}`);}
function sha256Canonical(value){return createHash('sha256').update(JSON.stringify(sortValue(value)),'utf8').digest('hex');}
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=sortValue(value[key]);return out;}return value;}
