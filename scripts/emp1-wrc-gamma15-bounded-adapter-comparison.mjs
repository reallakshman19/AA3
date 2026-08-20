import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY } from '../src/core/emp1/emp1-wrc537-cylindrical-index.js';
import { evaluateEmp1Wrc537CylindricalGamma15ComparisonAdapter } from '../src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js';

const ORACLE_PATH='validation/emp1/wrc537-2013/gamma15-full-table5-oracle-v1.json';
const EXPECTED_ORACLE_HASH='d34827bfdfebad9f175e5fbcdfeab5fdc799d28de5c298ed2ae578886f72ae98';
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
    schema:'emp1-wrc537-upstream-load-custody/v1',status:'PASS_COMPARISON_FIXTURE_ONLY',engineeringUseAuthorized:false,
    sourceId:'WRC537_GAMMA15_INDEPENDENT_ORACLE',loadCaseId:'GAMMA15_BETA0P155_FULL_TABLE5',loadReference:'WRC_ATTACHMENT_REFERENCE_POINT',
    pressureThrustDisposition:'PRESSURE_THRUST_RESOLVED_UPSTREAM',sourceLoadCustodyHash:oracle.semanticHash,loadPackageSemanticHash:oracle.semanticHash,
    productionObservationUsedToSetAuthority:false,
    producerQualification:{producerId:'INDEPENDENT_ORACLE_HANDCALC',authorityClass:'WRC_REFERENCE_POINT_LOAD_PRODUCER',status:'COMPARISON_FIXTURE_ONLY',qualificationRecordHash:oracle.semanticHash,productionObservationUsedToSetAuthority:false},
    pressureThrust:{status:'PASS_RESOLVED_UPSTREAM',mode:'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',doubleCountGuardQualified:true,sourceLoadContainsPressureThrust:false,policyRecordHash:oracle.semanticHash,productionObservationUsedToSetAuthority:false},
  },
  stressConcentration:{...c.stressConcentration},
};

const actual=evaluateEmp1Wrc537CylindricalGamma15ComparisonAdapter(input);
assert.equal(actual.state,'EVALUATED_BOUNDED_GAMMA15_TABLE5_COMPARISON');
assert.equal(actual.engineeringComparisonUseAuthorized,true);
assert.equal(actual.qualifiedInputAuthority,false);
assert.equal(actual.productionRouteAuthority,false);
assert.equal(actual.globalEmp1CRouteAuthority,false);
assert.equal(actual.domain.status,'PASS_GAMMA15_BOUNDED_DOMAIN');
assert.equal(actual.geometry.gamma,15);
close(actual.geometry.beta,0.155,'derived beta');
for(const key of ['P','Vc','Vl','Mc','Ml','Mt']) close(actual.wrcLoads[key],c.loads[key],`load ${key}`);
let curveComparisons=0;
for(const family of ['circ','long']) for(const [key,expected] of Object.entries(oracle.semanticPayload.curveOrdinates[family])){
  close(actual.curveOrdinates[family][key],expected,`${family}.${key}`);
  const selection=actual.curveSelections[family][key];
  assert.equal(selection.variant,'ORIGINAL');assert.equal(selection.sourceGamma,15);
  assert.equal(selection.interpolationUsed,false);assert.equal(selection.extrapolationFallbackUsed,false);
  curveComparisons+=1;
}
assert.equal(curveComparisons,16);
assert.equal(new Set([...Object.values(actual.curveSelections.circ).map((r)=>r.figure),...Object.values(actual.curveSelections.long).map((r)=>r.figure)]).size,14);
let stressComparisons=0;
for(const key of ['circumferential','longitudinal','shear','stressIntensity']){
  actual.stresses[key].forEach((value,index)=>{close(value,oracle.semanticPayload.expected[key][index],`${key}[${index}]`);stressComparisons+=1;});
}
assert.equal(stressComparisons,32);

const falsifiers=[
  ['gamma5-not-gamma15',mutate(input,(x)=>{x.geometry.meanRadius=100;delete x.geometry.gamma;delete x.geometry.beta;x.geometry.attachmentRadius=17.714285714285715;}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['gamma14',mutate(input,(x)=>{x.geometry.meanRadius=280;delete x.geometry.gamma;delete x.geometry.beta;x.geometry.attachmentRadius=49.6;}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['beta-low',mutate(input,(x)=>{x.geometry.attachmentRadius=10;delete x.geometry.beta;}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['beta-high',mutate(input,(x)=>{x.geometry.attachmentRadius=110;delete x.geometry.beta;}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['variant-fallback',mutate(input,(x)=>{x.variant='EXTRAPOLATED';}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['source-sha-substitution',mutate(input,(x)=>{x.sourceDocumentSha256='0'.repeat(64);}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['dataset-hash-substitution',mutate(input,(x)=>{x.datasetHash='f'.repeat(64);}),'EMP1_WRC537_OUTSIDE_GAMMA15_BOUNDED_DOMAIN'],
  ['declared-beta-drift',mutate(input,(x)=>{x.geometry.beta=0.156;}),'EMP1_WRC537_BOUNDED_DECLARED_BETA_MISMATCH'],
  ['declared-gamma-drift',mutate(input,(x)=>{x.geometry.gamma=15.01;}),'EMP1_WRC537_BOUNDED_DECLARED_GAMMA_MISMATCH'],
  ['custody-missing',mutate(input,(x)=>{delete x.loadCustody;}),'EMP1_WRC537_LOAD_CUSTODY_REQUIRED'],
  ['nonorthogonal-frame',mutate(input,(x)=>{x.axes.nozzleCenterlineGlobal=[1,0,1];}),'EMP1_WRC537_FRAME_NON_ORTHOGONAL'],
];
for(const [name,candidate,code] of falsifiers) expectCode(name,()=>evaluateEmp1Wrc537CylindricalGamma15ComparisonAdapter(candidate),code);

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma15-bounded-adapter-comparison/v1',
  status:'PASS_GAMMA15_PRODUCTION_NUMERICS_MATCH_FROZEN_INDEPENDENT_ORACLE',
  engineeringAuthority:true,productionRouteAuthority:false,globalEmp1CRouteAuthority:false,
  sourceDocumentSha256:actual.sourceDocumentSha256,datasetHash:actual.datasetHash,oracleSemanticHash:oracle.semanticHash,
  geometry:{gamma:actual.geometry.gamma,beta:actual.geometry.beta,qualifiedBetaBand:[0.05,0.30]},wrcLoads:actual.wrcLoads,
  uniqueSourceFigures:14,curveComparisons,stressComparisons,falsifiersPassed:falsifiers.length,
  authorization:{routeRegistrationAllowed:false,globalRouteRegistrationAllowed:false},
},null,2));
function mutate(value,fn){const copy=structuredClone(value);fn(copy);return copy;}
function close(a,e,label){const t=Math.max(1,Math.abs(e))*1e-11;assert.ok(Math.abs(a-e)<=t,`${label}: actual=${a} expected=${e} tol=${t}`);}
function expectCode(name,fn,prefix){let caught=null;try{fn();}catch(error){caught=error;}assert.ok(caught,`${name}: expected failure`);assert.ok(String(caught.code??caught.message).startsWith(prefix),`${name}: ${caught.code??caught.message}`);}
