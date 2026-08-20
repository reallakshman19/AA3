import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY } from '../src/core/emp1/emp1-wrc537-cylindrical-index.js';
import { evaluateEmp1Wrc537CylindricalBoundedAdapter } from '../src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js';

const ORACLE_PATH='validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json';
const EXPECTED_ORACLE_HASH='5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa';
const oracle=JSON.parse(await readFile(ORACLE_PATH,'utf8'));
assert.equal(oracle.status,'PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE');
assert.equal(oracle.engineeringAuthority,true);
assert.equal(oracle.productionAuthority,false);
assert.equal(oracle.productionObservationUsed,false);
assert.equal(oracle.semanticHash,EXPECTED_ORACLE_HASH);
assert.equal(oracle.reobservation?.status,'PASS');
assert.deepEqual(oracle.reobservation?.productionImports,[]);
assert.equal(oracle.authorization?.boundedAdapterProductionComparisonAllowed,true);
assert.equal(oracle.authorization?.boundedRouteRegistrationAllowed,false);
assert.equal(oracle.authorization?.globalEmp1CRouteRegistrationAllowed,false);

const c=oracle.semanticPayload.case;
const input={
  sourceDocumentSha256:oracle.semanticPayload.sourceDocumentSha256,
  datasetHash:EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY.datasetHash,
  shellFamily:'CYLINDRICAL',attachmentShape:'ROUND',variant:'ORIGINAL',
  units:{force:'N',length:'mm',moment:'N*mm',stress:'N/mm^2'},
  geometry:{meanRadius:c.geometry.meanRadius,shellThickness:c.geometry.shellThickness,attachmentRadius:c.geometry.attachmentRadius,gamma:c.geometry.gamma,beta:c.geometry.beta},
  axes:{vesselCenterlineGlobal:[1,0,0],nozzleCenterlineGlobal:[0,0,1]},
  loadsAtWrcReference:{forceGlobal:[c.loads.Vl,-c.loads.Vc,c.loads.P],momentGlobal:[-c.loads.Mc,-c.loads.Ml,-c.loads.Mt]},
  loadCustody:{
    schema:'emp1-wrc537-upstream-load-custody/v1',
    status:'PASS_COMPARISON_FIXTURE_ONLY',
    engineeringUseAuthorized:false,
    sourceId:'WRC537_GAMMA5_INDEPENDENT_ORACLE',
    loadCaseId:'GAMMA5_BETA0P155_FULL_TABLE5',
    loadReference:'WRC_ATTACHMENT_REFERENCE_POINT',
    pressureThrustDisposition:'PRESSURE_THRUST_RESOLVED_UPSTREAM',
    sourceLoadCustodyHash:oracle.semanticHash,
    loadPackageSemanticHash:oracle.semanticHash,
    productionObservationUsedToSetAuthority:false,
    producerQualification:{
      producerId:'INDEPENDENT_ORACLE_HANDCALC',
      authorityClass:'WRC_REFERENCE_POINT_LOAD_PRODUCER',
      status:'COMPARISON_FIXTURE_ONLY',
      qualificationRecordHash:oracle.semanticHash,
      productionObservationUsedToSetAuthority:false,
    },
    pressureThrust:{
      status:'PASS_RESOLVED_UPSTREAM',
      mode:'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',
      doubleCountGuardQualified:true,
      sourceLoadContainsPressureThrust:false,
      policyRecordHash:oracle.semanticHash,
      productionObservationUsedToSetAuthority:false,
    },
  },
  stressConcentration:{...c.stressConcentration},
};

const actual=evaluateEmp1Wrc537CylindricalBoundedAdapter(input);
assert.equal(actual.state,'EVALUATED_BOUNDED_GAMMA5_TABLE5_COMPARISON');
assert.equal(actual.engineeringComparisonUseAuthorized,true);
assert.equal(actual.productionRouteAuthority,false);
assert.equal(actual.globalEmp1CRouteAuthority,false);
assert.equal(actual.loadCustody.status,'PASS_COMPARISON_FIXTURE_ONLY');
assert.equal(actual.loadCustody.engineeringUseAuthorized,false);
assert.equal(actual.loadCustody.productionRouteInputAuthorized,false);
assert.equal(actual.domain.status,'PASS_BOUNDED_DOMAIN');
assert.equal(actual.geometry.gamma,5);
close(actual.geometry.beta,0.155,'derived beta');
for(const key of ['P','Vc','Vl','Mc','Ml','Mt']) close(actual.wrcLoads[key],c.loads[key],`load ${key}`);

let curveComparisons=0;
for(const family of ['circ','long']) for(const [key,expected] of Object.entries(oracle.semanticPayload.curveOrdinates[family])){
  close(actual.curveOrdinates[family][key],expected,`${family}.${key}`);
  const selection=actual.curveSelections[family][key];
  assert.equal(selection.variant,'ORIGINAL');assert.equal(selection.sourceGamma,5);
  assert.equal(selection.interpolationUsed,false);assert.equal(selection.extrapolationFallbackUsed,false);
  curveComparisons+=1;
}
assert.equal(new Set([...Object.values(actual.curveSelections.circ).map((r)=>r.figure),...Object.values(actual.curveSelections.long).map((r)=>r.figure)]).size,14);
let stressComparisons=0;
for(const key of ['circumferential','longitudinal','shear','stressIntensity']){
  const expected=oracle.semanticPayload.expected[key];
  actual.stresses[key].forEach((value,index)=>{close(value,expected[index],`${key}[${index}]`);stressComparisons+=1;});
}
assert.equal(stressComparisons,32);

const falsifiers=[
  ['gamma-low',mutate(input,(x)=>{x.geometry.meanRadius=99.9;delete x.geometry.gamma;delete x.geometry.beta;}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['gamma-high',mutate(input,(x)=>{x.geometry.shellThickness=19.9;delete x.geometry.gamma;}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['beta-low',mutate(input,(x)=>{x.geometry.attachmentRadius=5;delete x.geometry.beta;}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['beta-high',mutate(input,(x)=>{x.geometry.attachmentRadius=60;delete x.geometry.beta;}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['declared-beta-drift',mutate(input,(x)=>{x.geometry.beta=0.156;}),'EMP1_WRC537_BOUNDED_DECLARED_BETA_MISMATCH'],
  ['declared-gamma-drift',mutate(input,(x)=>{x.geometry.gamma=5.01;}),'EMP1_WRC537_BOUNDED_DECLARED_GAMMA_MISMATCH'],
  ['source-sha-substitution',mutate(input,(x)=>{x.sourceDocumentSha256='0'.repeat(64);}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['dataset-hash-substitution',mutate(input,(x)=>{x.datasetHash='f'.repeat(64);}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['variant-fallback',mutate(input,(x)=>{x.variant='EXTRAPOLATED';}),'EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN'],
  ['custody-missing',mutate(input,(x)=>{delete x.loadCustody;}),'EMP1_WRC537_LOAD_CUSTODY_REQUIRED'],
  ['custody-schema',mutate(input,(x)=>{x.loadCustody.schema='other';}),'EMP1_WRC537_LOAD_CUSTODY_SCHEMA'],
  ['pressure-unresolved',mutate(input,(x)=>{x.loadCustody.pressureThrustDisposition='UNRESOLVED';}),'EMP1_WRC537_LOAD_CUSTODY_PRESSURE_DISPOSITION'],
  ['wrong-load-reference',mutate(input,(x)=>{x.loadCustody.loadReference='NOZZLE_FACE';}),'EMP1_WRC537_LOAD_CUSTODY_REFERENCE'],
  ['fake-engineering-authority',mutate(input,(x)=>{x.loadCustody.engineeringUseAuthorized=true;}),'EMP1_WRC537_LOAD_CUSTODY_FIXTURE_CANNOT_CLAIM_ENGINEERING_AUTHORITY'],
  ['producer-escalation',mutate(input,(x)=>{x.loadCustody.producerQualification.status='PASS_QUALIFIED_WRC_REFERENCE_LOAD_PRODUCER';}),'EMP1_WRC537_LOAD_CUSTODY_FIXTURE_PRODUCER_STATUS'],
  ['double-count-guard-off',mutate(input,(x)=>{x.loadCustody.pressureThrust.doubleCountGuardQualified=false;}),'EMP1_WRC537_LOAD_CUSTODY_DOUBLE_COUNT_GUARD'],
  ['production-contaminated',mutate(input,(x)=>{x.loadCustody.productionObservationUsedToSetAuthority=true;}),'EMP1_WRC537_LOAD_CUSTODY_PRODUCTION_OBSERVATION_PROHIBITED'],
  ['custody-hash-invalid',mutate(input,(x)=>{x.loadCustody.sourceLoadCustodyHash='not-a-hash';}),'EMP1_WRC537_LOAD_CUSTODY_SOURCE_LOAD_CUSTODY_HASH_INVALID'],
  ['nonorthogonal-frame',mutate(input,(x)=>{x.axes.nozzleCenterlineGlobal=[1,0,1];}),'EMP1_WRC537_FRAME_NON_ORTHOGONAL'],
  ['unsupported-units',mutate(input,(x)=>{x.units={force:'kN',length:'mm',moment:'kN*m',stress:'MPa'};}),'EMP1_WRC537_BOUNDED_UNITS_UNSUPPORTED'],
];
for(const [name,candidate,code] of falsifiers) expectCode(name,()=>evaluateEmp1Wrc537CylindricalBoundedAdapter(candidate),code);

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma5-bounded-adapter-comparison/v2',
  status:'PASS_BOUNDED_ADAPTER_MATCHES_FROZEN_INDEPENDENT_ORACLE',
  engineeringAuthority:true,productionRouteAuthority:false,
  sourceDocumentSha256:actual.sourceDocumentSha256,datasetHash:actual.datasetHash,oracleSemanticHash:oracle.semanticHash,
  geometry:{gamma:actual.geometry.gamma,beta:actual.geometry.beta},wrcLoads:actual.wrcLoads,
  uniqueSourceFigures:14,curveComparisons,stressComparisons,falsifiersPassed:falsifiers.length,
  loadCustody:'COMPARISON_FIXTURE_ONLY_STRUCTURALLY_ENFORCED',
  pressureThrustDisposition:'RESOLVED_UPSTREAM_PREREQUISITE_NOT_ROUTE_AUTHORITY',
},null,2));
function mutate(value,fn){const copy=structuredClone(value);fn(copy);return copy;}
function close(a,e,label){const t=Math.max(1,Math.abs(e))*1e-11;assert.ok(Math.abs(a-e)<=t,`${label}: actual=${a} expected=${e} tol=${t}`);}
function expectCode(name,fn,prefix){let caught=null;try{fn();}catch(error){caught=error;}assert.ok(caught,`${name}: expected failure`);assert.ok(String(caught.code??caught.message).startsWith(prefix),`${name}: ${caught.code??caught.message}`);}
