#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const finite3=(v)=>Array.isArray(v)&&v.length===3&&
  v.every(x=>typeof x==='number'&&Number.isFinite(x));
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
const tolerance=(a,b)=>Math.max(...diff(a,b).map(Math.abs));
export function auditWTThermalCaseDifference(record,attribution,originalW){
  assert.equal(record.schema,
    'lfea-bm4l-e75-unpressurized-wt-full-system-thermal-counterfactual/v1');
  assert.equal(attribution.schema,
    'lfea-bm4l-e75-source-local-load-case-rotation-attribution/v1');
  assert.equal(attribution.sourceAccdbSha256,SHA,
    'CAESAR_CASE_INCREMENT_SOURCE_UNPINNED');
  assert.equal(record.elementId,'IXP.E75');
  assert.equal(record.sourceOriginalCaseId,'IXP-WT');
  assert.equal(record.sourceBaselineCaseId,'IXP-W');
  assert.equal(record.originalUnpressurizedWTAuthorizedExecutionReproduced,true);
  assert.equal(record.originalWAuthorizedExecutionReproducedInPreviousExperiment,true);
  assert.equal(record.engineeringPromotionAuthorized,false);
  assert.equal(record.pressureLoadsExcludedInAllResearchCases,true);
  assert.equal(record.caesarL5MinusL6NotAnIndependentPressurelessWTReference,true);
  assert.equal(record.experimentScenarios.length,8);
  assert.equal(originalW.schema,'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1');
  assert.equal(originalW.originalProductionExecutionNumericallyReproduced,true);
  assert.equal(originalW.physicalCaseId,'IXP-W');
  assert.equal(originalW.sourceCaseSemanticHash,record.originalWReceiptSourceCaseHash);
  assert.equal(attribution.sourceLocalAxes.x.length,3);
  for(const axis of ['x','y','z']){
    assert.ok(tolerance(record.sourceLocalAxes[axis],attribution.sourceLocalAxes[axis])<1e-10,
      'WT_SOURCE_LOCAL_ROTATION_AXIS_DRIFT:'+axis);
  }
  const thermal=attribution.temperatureDifference;
  assert.equal(thermal.minuendCaseId,'L5');
  assert.equal(thermal.subtrahendCaseId,'L6');
  const caesar=thermal.sourceReferenceLocalRotationCaseDifferenceRad;
  const nativeCaesar=thermal.nativeProductionLocalRotationCaseDifferenceRad;
  assert.ok(finite3(caesar)&&finite3(nativeCaesar));
  const w=new Map(originalW.scenarios.map(x=>[x.scenarioId,x]));
  const results=record.experimentScenarios.map(row=>{
    const baseW=w.get(row.matchingOriginalWScenarioId);
    assert.ok(baseW,'E75_WT_NO_MATCHING_W_BASELINE');
    assert.ok(finite3(row.sourceLocalIncrementRotationRad));
    assert.ok(finite3(baseW.sourceLocalIncrementRotationRad));
    assert.ok(finite3(row.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad));
    assert.ok(tolerance(diff(row.sourceLocalIncrementRotationRad,
      baseW.sourceLocalIncrementRotationRad),
      row.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad)<1e-9,
      'E75_WT_MINUS_W_NOT_CLOSED:'+row.scenarioId);
    const out=row.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad;
    return {
      scenarioId:row.scenarioId,
      matchingOriginalWScenarioId:row.matchingOriginalWScenarioId,
      sourceLfeaWTminusWRad:out,
      sourceLfeaWTminusWMicrorad:out.map(x=>x*1e6),
      differenceFromOriginalCaesarL5minusL6Microrad:
        diff(out,caesar).map(x=>x*1e6),
      sourceCaesarL5minusL6ReferenceNotAPressurelessWTExperiment:true,
      sourceCaesarCaseDifferenceNotIndependentlyThermalQualified:true,
      originalSourceReferenceNoAcceptanceRegrading:true,
    };
  });
  assert.equal(results.filter(row=>
    row.scenarioId==='K_NATIVE_G_NATIVE_T_NATIVE').length,1);
  assert.equal(record.thermalBasisSwapsAtFixedKAndGravity.length,4);
  for(const swap of record.thermalBasisSwapsAtFixedKAndGravity){
    const base=record.experimentScenarios.find(x=>x.stiffness===swap.stiffness
      &&x.gravity===swap.gravity&&x.thermal==='NATIVE');
    const other=record.experimentScenarios.find(x=>x.stiffness===swap.stiffness
      &&x.gravity===swap.gravity&&x.thermal==='TEN_CYLINDER');
    assert.ok(base&&other&&finite3(swap.thermalBasisChangeRad));
    assert.ok(tolerance(diff(
      other.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad,
      base.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad),
      swap.thermalBasisChangeRad)<1e-9,
      'E75_WT_INITIAL_STRAIN_BASIS_SWAP_DIFFERENCE_NOT_CLOSED');
  }
  const sourceBaseline=results.find(x=>x.scenarioId==='K_NATIVE_G_NATIVE_T_NATIVE');
  const originalSourceDelta=diff(
    sourceBaseline.sourceLfeaWTminusWRad,nativeCaesar);
  return {
    schema:'lfea-bm4l-e75-wt-pressureless-vs-caesar-pressurized-case-difference-audit/v1',
    status:'SOURCE_SIGNED_CASE_DIFFERENCE_CONTEXT_ONLY_NO_THERMAL_CAUSAL_PARITY_CLAIM',
    originalAccdbSha256:SHA,
    originalCaesarCaseDifference:'L5_WPT_MINUS_L6_WP',
    nativePressurelessCaseDifference:'IXP-WT_MINUS_IXP-W',
    caesarThermalCaseDifferenceLocalMicrorad:caesar.map(x=>x*1e6),
    productionSameCaesarCasesL5minusL6LocalMicrorad:nativeCaesar.map(x=>x*1e6),
    productionUnpressurizedWTminusWLocalMicrorad:
      sourceBaseline.sourceLfeaWTminusWMicrorad,
    differenceBetweenProductionUnpressurizedWTminusWAndProductionL5minusL6Microrad:
      originalSourceDelta.map(x=>x*1e6),
    sourceAndProductionPressureStateDifferencesMustNotBeConflated:true,
    sourceLocalResearchThermalDifferences:results,
    fourFixedStiffnessAndGravityThermalLoadBasisEffectsMicrorad:
      record.thermalBasisSwapsAtFixedKAndGravity.map(x=>({
        stiffness:x.stiffness,gravity:x.gravity,
        localMicrorad:x.thermalBasisChangeRad.map(y=>y*1e6),
      })),
    candidateUnpressurizedCaseCouldImproveObservedSourceDifferenceWithoutConstitutingParity:true,
    originalTenCylinderSectionSamplingUnqualified:true,
    noPressureBearingAlternativeAssembled:true,
    actualCaesarWTReferenceNotAvailable:true,
    originalComparatorAcceptanceOrSourceModified:false,
    engineeringProductionPromotionAuthorized:false,
  };
}
function selfTest(){
  const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
  const sampleW=[1e-5,2e-5,3e-5];
  const id='BASELINE_AUTHORIZED_EQUIVALENT';
  const originalW={schema:'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1',
    originalProductionExecutionNumericallyReproduced:true,
    physicalCaseId:'IXP-W',sourceCaseSemanticHash:'W',
    scenarios:[{scenarioId:id,sourceLocalIncrementRotationRad:sampleW}]};
  const change=[1e-5,4e-5,2e-5];
  const build=thermal=>({
    scenarioId:'K_NATIVE_G_NATIVE_T_'+thermal,
    matchingOriginalWScenarioId:id,
    sourceLocalIncrementRotationRad:sampleW.map((x,i)=>x+change[i]+(thermal==='TEN_CYLINDER'?1e-6:0)),
    sourceLocalThermalDifferenceFromCorrespondingWScenarioRad:
      change.map(x=>x+(thermal==='TEN_CYLINDER'?1e-6:0)),
    stiffness:'NATIVE',gravity:'NATIVE',thermal,
  });
  const wt={schema:'lfea-bm4l-e75-unpressurized-wt-full-system-thermal-counterfactual/v1',
    elementId:'IXP.E75',sourceOriginalCaseId:'IXP-WT',sourceBaselineCaseId:'IXP-W',
    originalUnpressurizedWTAuthorizedExecutionReproduced:true,
    originalWAuthorizedExecutionReproducedInPreviousExperiment:true,
    engineeringPromotionAuthorized:false,pressureLoadsExcludedInAllResearchCases:true,
    caesarL5MinusL6NotAnIndependentPressurelessWTReference:true,
    sourceLocalAxes:axes,originalWReceiptSourceCaseHash:'W',
    experimentScenarios:[build('NATIVE'),build('TEN_CYLINDER')],
    thermalBasisSwapsAtFixedKAndGravity:[{
      stiffness:'NATIVE',gravity:'NATIVE',thermalBasisChangeRad:[1e-6,1e-6,1e-6],
    }],
  };
  // Exact eight-case source-shape.
  wt.experimentScenarios=[...Array.from({length:4},(_,i)=>{
    const first=i===0?build('NATIVE'): {...build('NATIVE'),
      scenarioId:'K_'+i+'_G_'+i+'_T_NATIVE'};
    const second=i===0?build('TEN_CYLINDER'):{...build('TEN_CYLINDER'),
      scenarioId:'K_'+i+'_G_'+i+'_T_TEN_CYLINDER'};
    return [first,second];
  }).flat()];
  wt.thermalBasisSwapsAtFixedKAndGravity=[...Array.from({length:4},(_,i)=>({
    stiffness:i===0?'NATIVE':String(i),gravity:i===0?'NATIVE':String(i),
    thermalBasisChangeRad:[1e-6,1e-6,1e-6],
  }))];
  wt.experimentScenarios.forEach((x,i)=>{
    if(i>1){x.stiffness=String(Math.floor(i/2));x.gravity=String(Math.floor(i/2));}
  });
  const attribution={schema:'lfea-bm4l-e75-source-local-load-case-rotation-attribution/v1',
    sourceAccdbSha256:SHA,sourceLocalAxes:axes,
    temperatureDifference:{minuendCaseId:'L5',subtrahendCaseId:'L6',
      sourceReferenceLocalRotationCaseDifferenceRad:[1e-5,2e-5,3e-5],
      nativeProductionLocalRotationCaseDifferenceRad:change},
  };
  const out=auditWTThermalCaseDifference(wt,attribution,originalW);
  assert.equal(out.sourceLocalResearchThermalDifferences.length,8);
  assert.throws(()=>auditWTThermalCaseDifference(wt,{
    ...attribution,sourceAccdbSha256:'bad'},originalW),
    /CAESAR_CASE_INCREMENT_SOURCE_UNPINNED/);
  const wrong=structuredClone(wt);
  wrong.experimentScenarios[0].sourceLocalThermalDifferenceFromCorrespondingWScenarioRad[0]+=0.1;
  assert.throws(()=>auditWTThermalCaseDifference(wrong,attribution,originalW),
    /E75_WT_MINUS_W_NOT_CLOSED/);
  console.log('BM4L_E75_WT_THERMAL_INCREMENT_NEGATIVE_CONTROLS PASS');
}
function main(args){
  if(args.length===1&&args[0]==='--self-test'){selfTest();return;}
  assert.equal(args.length,8);
  assert.deepEqual(args.filter((_,i)=>i%2===0),
    ['--experiment','--attribution','--original-w','--out']);
  const load=i=>JSON.parse(readFileSync(resolve(args[i]),'utf8'));
  const out=auditWTThermalCaseDifference(load(1),load(3),load(5));
  const dest=resolve(args[7]);mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,JSON.stringify(out,null,2)+'\n');
  console.log('BM4L_E75_WT_THERMAL '+JSON.stringify({
    status:out.status,
    sourceCaesarL5minusL6Microrad:out.caesarThermalCaseDifferenceLocalMicrorad,
    originalNativeL5minusL6Microrad:out.productionSameCaesarCasesL5minusL6LocalMicrorad,
    originalNativeUnpressurizedWTminusWMicrorad:
      out.productionUnpressurizedWTminusWLocalMicrorad,
    nativePressureContextDeltaMicrorad:
      out.differenceBetweenProductionUnpressurizedWTminusWAndProductionL5minusL6Microrad,
    scenarios:out.sourceLocalResearchThermalDifferences.map(s=>({
      id:s.scenarioId,localWTMinusWMicrorad:s.sourceLfeaWTminusWMicrorad,
      differenceFromSourceCaesarL5MinusL6Microrad:
        s.differenceFromOriginalCaesarL5minusL6Microrad,
    })),
    E75ThermalLoadOnlyChanges:out.fourFixedStiffnessAndGravityThermalLoadBasisEffectsMicrorad,
    candidateActualCaesarWTParityClaimed:false,
    pressureBasisDisplaced:false,
    productionChanged:false,
  }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv.slice(2));
