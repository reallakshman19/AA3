#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { calculateLocalAttachmentFoundation, reconstructResultHashes } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
  EMP1_A_WRC_ZERO_DP_PRODUCER_ROUTE_AUTHORIZED,
  createEmp1AZeroDpWrcQualifiedLoadCustody,
  deriveEmp1AZeroDpWrcLoadPackageCandidate,
} from '../src/core/emp1/emp1-a-wrc-zero-dp-load-producer.js';
import { requireEmp1Wrc537QualifiedLoadCustody } from '../src/core/emp1/emp1-wrc537-load-custody.js';

const RECORD_PATH='validation/emp1/wrc537-2013/emp1-a-zero-dp-wrc-load-producer-qualification-v1.json';
const record=JSON.parse(await readFile(RECORD_PATH,'utf8'));
const recordHash=sha256Canonical(record.semanticPayload);
assert.equal(recordHash,record.semanticHashSha256,'qualification record semantic hash');
assert.equal(recordHash,EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,'production producer must bind exact qualification contract');
assert.equal(record.status,'PASS_REOBSERVED_INDEPENDENT_ZERO_DP_LOAD_PRODUCER');
assert.equal(record.engineeringAuthority,true);
assert.equal(record.productionRouteAuthority,true);
assert.equal(record.productionObservationUsedToSetAuthority,false);
assert.equal(record.reobservation?.status,'PASS');
assert.equal(record.reobservation?.qualificationRecordSha256,recordHash);
assert.equal(record.authorization?.zeroDifferentialPressureLoadProducerAllowed,true);
assert.equal(record.authorization?.nonzeroDifferentialPressureAllowed,false);
assert.equal(EMP1_A_WRC_ZERO_DP_PRODUCER_ROUTE_AUTHORIZED,true);

const model=zeroDpFixture();
const result=calculateLocalAttachmentFoundation(model);
assert.equal(result.qualification.state,'ACCEPTED');
assert.equal(result.qualification.engineeringLevel,'LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY');

// Independent vector statics. Source at [0,0,1000], target at origin,
// F=[1000,0,0], M_source=[0,0,0]. r x F = [0,1e6,0] N.mm.
const expectedForce=[1000,0,0],expectedMoment=[0,1_000_000,0];
const load=result.transformedLoadCases.find((row)=>row.identity==='LC-1');
assert.deepEqual(load.transformedForceGlobal,expectedForce);assert.deepEqual(load.transformedMomentGlobal,expectedMoment);
const pressure=result.pressureStressResults.find((row)=>row.identity==='PR-1');
assert.equal(pressure.internalPressure,0);assert.equal(pressure.externalPressure,0);assert.equal(pressure.internalPressure-pressure.externalPressure,0);

const candidate=deriveEmp1AZeroDpWrcLoadPackageCandidate({result,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0],productionObservationUsedToSetAuthority:false});
assert.equal(candidate.status,'PASS_ZERO_DP_WRC_LOAD_PACKAGE_CANDIDATE');
assert.equal(candidate.productionRouteInputAuthorized,false);
assert.deepEqual(candidate.loadsAtWrcReference.forceGlobal,expectedForce);assert.deepEqual(candidate.loadsAtWrcReference.momentGlobal,expectedMoment);
assert.equal(candidate.semanticPayload.differentialPressure,0);assert.equal(candidate.semanticPayload.pressureThrust,0);
assert.match(candidate.loadPackageSemanticHash,/^fnv1a64:[a-f0-9]{16}$/u);assert.match(candidate.sourceLoadCustodyHash,/^fnv1a64:[a-f0-9]{16}$/u);

const custody=createEmp1AZeroDpWrcQualifiedLoadCustody(candidate);
assert.equal(custody.status,'PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE');
assert.equal(custody.engineeringUseAuthorized,true);
assert.equal(custody.pressureThrust.mode,'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED');
assert.equal(custody.pressureThrust.sourceLoadContainsPressureThrust,false);
assert.equal(custody.producerQualification.qualificationRecordHash,recordHash);
const bound=requireEmp1Wrc537QualifiedLoadCustody(custody,{expectedProducerQualificationHash:recordHash});
assert.equal(bound.productionRouteInputAuthorized,true);

const falsifiers=[];
runFalsifier('nonzero-dp',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result:calculateLocalAttachmentFoundation(nonzeroDpFixture()),loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0]}),'EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE');
runFalsifier('wrc-reference-mismatch',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,1]}),'EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
const rejected=calculateLocalAttachmentFoundation(canonicalFixture((source)=>{source.pipeCoordinateSystem.circumferentialHint.value=[0,-1,0];source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=0;row.externalPressure.value=0;});}));
runFalsifier('upstream-not-accepted',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result:rejected,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0]}),'EMP1_A_WRC_ZERO_DP_RESULT_NOT_ACCEPTED');
const hashTamper=structuredClone(result);hashTamper.semanticHashes.executionEvidenceHash='fnv1a64:0000000000000000';
runFalsifier('hash-drift',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result:hashTamper,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0]}),'EMP1_A_WRC_ZERO_DP_RESULT_HASH_DRIFT:executionEvidenceHash');
const residualTamper=structuredClone(result);residualTamper.forceMomentAccounting[0].forceResidualGlobal=[1,0,0];residualTamper.semanticHashes=reconstructResultHashes(residualTamper);
runFalsifier('accounting-residual',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result:residualTamper,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0]}),'EMP1_A_WRC_ZERO_DP_ACCOUNTING_RESIDUAL:forceResidualGlobal');
const loadResidualTamper=structuredClone(result);loadResidualTamper.transformedLoadCases[0].momentResidualGlobal=[0,1,0];loadResidualTamper.semanticHashes=reconstructResultHashes(loadResidualTamper);
runFalsifier('load-residual',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result:loadResidualTamper,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0]}),'EMP1_A_WRC_ZERO_DP_LOAD_RESIDUAL:momentResidualGlobal');
const pressureMissing=structuredClone(result);pressureMissing.pressureStressResults=[];pressureMissing.semanticHashes=reconstructResultHashes(pressureMissing);
runFalsifier('pressure-missing',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result:pressureMissing,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0]}),'EMP1_A_WRC_ZERO_DP_PRESSURE_RESULT_NOT_UNIQUE');
runFalsifier('production-contaminated',()=>deriveEmp1AZeroDpWrcLoadPackageCandidate({result,loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0],productionObservationUsedToSetAuthority:true}),'EMP1_A_WRC_ZERO_DP_PRODUCTION_OBSERVATION_PROHIBITED');
const custodyTamper=structuredClone(custody);custodyTamper.producerQualification.qualificationRecordHash='0'.repeat(64);
runFalsifier('producer-qualification-substitution',()=>requireEmp1Wrc537QualifiedLoadCustody(custodyTamper,{expectedProducerQualificationHash:recordHash}),'EMP1_WRC537_LOAD_CUSTODY_PRODUCER_QUALIFICATION_HASH_MISMATCH');

console.log(JSON.stringify({
  schema:'emp1-a-zero-dp-wrc-load-producer-qualification/v2',status:'PASS_REOBSERVED_PROMOTED_ZERO_DP_LOAD_PRODUCER',
  engineeringAuthority:true,productionRouteAuthority:true,nonzeroDifferentialPressureAuthority:false,
  qualificationRecordSha256:recordHash,upstreamResultHashes:result.semanticHashes,
  expected:{forceGlobal:expectedForce,momentGlobal:expectedMoment,differentialPressure:0,pressureThrust:0},
  actual:{forceGlobal:candidate.loadsAtWrcReference.forceGlobal,momentGlobal:candidate.loadsAtWrcReference.momentGlobal,differentialPressure:candidate.semanticPayload.differentialPressure,pressureThrust:candidate.semanticPayload.pressureThrust},
  loadPackageSemanticHash:candidate.loadPackageSemanticHash,sourceLoadCustodyHash:candidate.sourceLoadCustodyHash,
  qualifiedCustodyProducerHash:custody.producerQualification.qualificationRecordHash,
  falsifiersPassed:falsifiers.length,falsifiers,
},null,2));

function zeroDpFixture(){return canonicalFixture((source)=>{source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=0;row.externalPressure.value=0;});});}
function nonzeroDpFixture(){return canonicalFixture((source)=>{source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=1;row.externalPressure.value=0;});});}
function runFalsifier(name,fn,code){expectCode(name,fn,code);falsifiers.push(name);}
function expectCode(name,fn,prefix){let caught=null;try{fn();}catch(error){caught=error;}assert.ok(caught,`${name}: expected failure`);assert.ok(String(caught.code??caught.message).startsWith(prefix),`${name}: actual=${caught.code??caught.message}`);}
function sha256Canonical(value){return createHash('sha256').update(JSON.stringify(sortValue(value)),'utf8').digest('hex');}
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=sortValue(value[key]);return out;}return value;}
