#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  applyPressureThrustToWrcP,
  resolvePressureThrust,
} from './emp1-c-pressure-thrust-policy-lib.mjs';

const eP=[1,0,0];
const hexagon=resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
  pressure:275,
  nozzleInsideDiameter:12,
  directionAlongEP:-1,
  directionAuthority:'SUPPLEMENTAL_HEXAGON_REPORTED_TOTAL_LOAD_SIGN_SANITY_ONLY',
  sourceLoadThrustCustody:'VERIFIED_EXCLUDED',
  sourceLoadCustodyHash:'sha256:synthetic-source-load-excludes-thrust',
  policyRecordHash:'sha256:synthetic-add-policy',
},eP);
const expectedArea=Math.PI*12**2/4;
const expectedThrust=275*expectedArea;
assert(Math.abs(hexagon.pressureThrustArea-expectedArea)<1e-12);
assert(Math.abs(hexagon.pressureThrustMagnitude-expectedThrust)<1e-9);
assert(Math.abs(hexagon.addedP+expectedThrust)<1e-9);
assert(Math.abs(applyPressureThrustToWrcP(-26,hexagon)-(-31127.76727053895))<1e-9);
assert.deepEqual(hexagon.addedForceGlobal,[-expectedThrust,0,0]);

const cauxNoThrust=resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'NOT_APPLICABLE_BY_QUALIFIED_METHOD',
  qualifiedMethodReason:'CAUX2017_WRC01F_PP24_31_BENCHMARK_EXPLICIT_INCLUDE_PRESSURE_THRUST_NO',
  qualifiedMethodRecordHash:'sha256:8d97539f03f077321eef1e496e315a6a7700a9d83a6c8cd4ff1b83382ebe45fe',
  sourceLoadThrustCustody:'BENCHMARK_DECLARED_NO_ADD',
  policyRecordHash:'sha256:synthetic-caux-no-thrust-policy',
},eP);
assert.equal(cauxNoThrust.addedP,0);
assert.equal(applyPressureThrustToWrcP(-161,cauxNoThrust),-161);

const alreadyIncluded=resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',
  sourceLoadThrustCustody:'VERIFIED_INCLUDED',
  sourceLoadCustodyHash:'sha256:synthetic-included-load-custody',
  policyRecordHash:'sha256:synthetic-included-policy',
},eP);
assert.equal(alreadyIncluded.addedP,0);
assert.equal(applyPressureThrustToWrcP(123,alreadyIncluded),123);

assert.throws(()=>resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',pressure:275,nozzleInsideDiameter:12,
  directionAlongEP:-1,directionAuthority:'TEST',sourceLoadThrustCustody:'VERIFIED_INCLUDED',sourceLoadCustodyHash:'x',policyRecordHash:'y'
},eP),/EMP1_C_PRESSURE_THRUST_DOUBLE_COUNT_GUARD/u);
assert.throws(()=>resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',pressure:275,nozzleInsideDiameter:12,
  sourceLoadThrustCustody:'VERIFIED_EXCLUDED',sourceLoadCustodyHash:'x',policyRecordHash:'y'
},eP),/EMP1_C_PRESSURE_THRUST_DIRECTION_REQUIRED/u);
assert.throws(()=>resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',pressure:275,sourceLoadThrustCustody:'VERIFIED_INCLUDED',sourceLoadCustodyHash:'x',policyRecordHash:'y'
},eP),/EMP1_C_PRESSURE_THRUST_CONFLICTING_INPUT/u);
assert.throws(()=>resolvePressureThrust({
  schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,
  mode:'NOT_APPLICABLE_BY_QUALIFIED_METHOD',qualifiedMethodReason:'x',sourceLoadThrustCustody:'x',policyRecordHash:'y'
},eP),/EMP1_C_PRESSURE_THRUST_NA_AUTHORITY/u);
assert.throws(()=>resolvePressureThrust({schema:EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA,mode:'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',pressure:1,nozzleInsideDiameter:1,directionAlongEP:1,directionAuthority:'x',sourceLoadThrustCustody:'VERIFIED_EXCLUDED',sourceLoadCustodyHash:'x'},[2,0,0]),/EMP1_C_PRESSURE_THRUST_EP_NOT_UNIT/u);

console.log(JSON.stringify({
  schema:'emp1-c-pressure-thrust-policy-self-test/v1',status:'PASS',
  engineeringAuthority:'SOFTWARE_POLICY_PLUS_BOUNDED_NUMERICAL_SANITY',productionAuthority:false,
  hexagonSanity:{insideDiameter:12,pressure:275,area:expectedArea,thrust:expectedThrust,restraintP:-26,totalP:applyPressureThrustToWrcP(-26,hexagon)},
  cauxBenchmark:{mode:'NOT_APPLICABLE_BY_QUALIFIED_METHOD',existingP:-161,totalP:applyPressureThrustToWrcP(-161,cauxNoThrust)},
  rules:[
    'mode is mutually exclusive',
    'ADD requires source-load VERIFIED_EXCLUDED custody before adding thrust',
    'ADD requires explicit +eP/-eP direction and authority; sign is never inferred from existing load',
    'SOURCE_LOAD_ALREADY_INCLUDES_THRUST adds zero and requires VERIFIED_INCLUDED custody',
    'NOT_APPLICABLE requires a qualified method reason and record hash',
    'no ADD inputs are accepted in non-ADD modes'
  ],
  negativeProofs:['DOUBLE_COUNT_REJECTED','MISSING_DIRECTION_REJECTED','CONFLICTING_MODE_INPUT_REJECTED','NA_WITHOUT_AUTHORITY_REJECTED','NON_UNIT_EP_REJECTED']
},null,2));
