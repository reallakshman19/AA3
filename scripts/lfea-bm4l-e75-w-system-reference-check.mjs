#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SOURCE_SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const minDiff=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const finite3=(v)=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x));
export function analyzeE75WeightPerturbation(experiment,budget){
  assert.equal(experiment.schema,'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1');
  assert.equal(budget.schema,'lfea-bm4l-e75-rotation-basis-parity-diagnostic/v1');
  assert.equal(budget.sourceAccdbSha256,SOURCE_SHA,'UNPINNED_W_CAESAR_REFERENCE');
  assert.equal(experiment.physicalCaseId,'IXP-W');
  assert.equal(experiment.nativeElementId,'IXP.E75');
  assert.equal(budget.elementId,'IXP.E75');
  assert.equal(experiment.productionReducerRemainsPrismatic,true);
  assert.equal(experiment.noAlternativeAssemblyPassedProductionPreflight,true);
  assert.equal(experiment.originalProductionExecutionNumericallyReproduced,true);
  assert.equal(experiment.onlyE75ContributionVaried,true);
  assert.equal(experiment.pressureBearingCandidateNotEvaluated,true);
  assert.equal(experiment.scenarios.length,4);
  const ref=budget.cases.find(row=>row.caseId==='L2');
  assert.ok(ref&&finite3(ref.referenceLocalIncrementRad)
    &&finite3(ref.productionLocalIncrementRad));
  const expectedIds=[
    'BASELINE_AUTHORIZED_EQUIVALENT',
    'E75_STIFFNESS_ONLY','E75_GRAVITY_ONLY','E75_STIFFNESS_AND_GRAVITY',
  ];
  assert.deepEqual(experiment.scenarios.map(x=>x.scenarioId),expectedIds);
  const axes=experiment.E75LocalAxes;
  for(const key of ['x','y','z']){
    assert.ok(finite3(axes[key]));
    assert.ok(minDiff(axes[key],budget.localAxes[key])<2e-10,
      'SOURCE_LOCAL_AXES_CHANGED:'+key);
  }
  const measured=experiment.scenarios[0].sourceLocalIncrementRotationRad;
  assert.ok(finite3(measured));
  // Independently compare the unmodified sealed baseline against the *actual*
  // source model's W-case L2 output used by the prior CAESAR comparator.
  // This is a forensic data identity bound, not a new CAESAR pass threshold.
  const baselineActualDrift=maxComponentRelative(measured,ref.productionLocalIncrementRad);
  assert.ok(minDiff(measured,ref.productionLocalIncrementRad)<2e-9,
    'UNMODIFIED_W_CASE_DOES_NOT_REPRODUCE_PRIOR_PRODUCTION_E75_LOCAL_ROTATION');
  const observed=experiment.scenarios.map(s=>{
    const vector=s.sourceLocalIncrementRotationRad;
    assert.ok(finite3(vector));
    const delta=subtract(vector,measured);
    const signedError=subtract(vector,ref.referenceLocalIncrementRad);
    const nativeError=subtract(measured,ref.referenceLocalIncrementRad);
    const extra=subtract(signedError,nativeError);
    assert.ok(minDiff(extra,delta)<5e-12,
      'E75_W_COUNTERFACTUAL_CASE_DIFFERENCE_IDENTITY_CHANGED');
    return {
      scenarioId:s.scenarioId,
      stiffnessSource:s.e75SectionStiffnessSource,
      gravitySource:s.e75GravityLoadSource,
      sourceLocalIncrementMicrorad:vector.map(x=>x*1e6),
      changeFromNativeMicrorad:delta.map(x=>x*1e6),
      signedErrorToOriginalCaesarL2Microrad:signedError.map(x=>x*1e6),
      originalCaesarSourceLocalIncrementMicrorad:ref.referenceLocalIncrementRad.map(x=>x*1e6),
      originalL2CaesarParityCertified:false,
      hypotheticalScenarioWasRunInCAESAR:false,
      sourceDownstreamSupportReactions:s.downstreamSourceSupportReactions,
    };
  });
  const expectedInteraction=experiment.signedSourceLocalRotationChangesRelativeNativeRad
    .nonadditiveInteraction;
  assert.ok(finite3(expectedInteraction));
  const computedInteraction=subtract(subtract(
    observed[3].changeFromNativeMicrorad,
    observed[1].changeFromNativeMicrorad),
    observed[2].changeFromNativeMicrorad);
  assert.ok(minDiff(computedInteraction,expectedInteraction.map(x=>x*1e6))<5e-6);
  const rankedByAbsoluteLocalZError=[...observed].sort((a,b)=>
    Math.abs(a.signedErrorToOriginalCaesarL2Microrad[2])
    -Math.abs(b.signedErrorToOriginalCaesarL2Microrad[2]));
  return {
    schema:'lfea-bm4l-e75-w-only-perturbation-versus-original-caesar-l2/v1',
    status:'CONTROLLED_LFEA_W_ONLY_COUNTERFACTUALS_WITH_FIXED_CAESAR_REFERENCE_NOT_PARITY_CERTIFICATION',
    originalAccdbSha256:SOURCE_SHA,
    physicalWeightCaseId:'IXP-W',
    referenceCaesarCaseId:'L2',
    sourceLocalAxes:axes,
    baselineSolverVsRetainedProductionLocalRotationDifferenceMaxRad:
      minDiff(measured,ref.productionLocalIncrementRad),
    baselineProductionRelativeRotationDifferenceMax:baselineActualDrift,
    originalCaesarSourceLocalIncrementMicrorad:ref.referenceLocalIncrementRad.map(x=>x*1e6),
    originalNativeSourceLocalIncrementMicrorad:ref.productionLocalIncrementRad.map(x=>x*1e6),
    outcomes:observed,
    rankedByAbsoluteLocalZError:rankedByAbsoluteLocalZError.map(row=>({
      scenarioId:row.scenarioId,
      absOriginalCaesarLocalZRotationGapMicrorad:
        Math.abs(row.signedErrorToOriginalCaesarL2Microrad[2]),
    })),
    stiffnessGravityInteractionMicrorad:computedInteraction,
    candidateCaesarIIReferenceSolveExists:false,
    noOriginalSourceQuantitiesOrNumericalToleranceModified:true,
    interpretation:'Finite perturbation of E75 alone in the full original LFEA W constraints, NOT source-qualified CAESAR reducer mechanics.',
    engineeringProductionPromotionAuthorized:false,
  };
}
function maxComponentRelative(a,b){
  return Math.max(...a.map((x,i)=>Math.abs(x-b[i])/Math.max(1,Math.abs(x),Math.abs(b[i]))));
}
function selfTest(){
  const mk=(scenarioId,v)=>({
    scenarioId,sourceLocalIncrementRotationRad:v,
    e75SectionStiffnessSource:'TEST',
    e75GravityLoadSource:'TEST',
    sourceDownstreamSupportReactions:{},
  });
  const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
  const baseline=[0.1,0.2,0.3],ref=[0.09,0.18,0.25];
  const exp={
    schema:'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1',
    physicalCaseId:'IXP-W',nativeElementId:'IXP.E75',
    productionReducerRemainsPrismatic:true,
    noAlternativeAssemblyPassedProductionPreflight:true,
    originalProductionExecutionNumericallyReproduced:true,
    onlyE75ContributionVaried:true,
    pressureBearingCandidateNotEvaluated:true,
    E75LocalAxes:axes,
    scenarios:[mk('BASELINE_AUTHORIZED_EQUIVALENT',baseline),
      mk('E75_STIFFNESS_ONLY',[0.11,0.19,0.27]),
      mk('E75_GRAVITY_ONLY',[0.13,0.22,0.33]),
      mk('E75_STIFFNESS_AND_GRAVITY',[0.15,0.21,0.35])],
    signedSourceLocalRotationChangesRelativeNativeRad:{
      nonadditiveInteraction:[0.01,0,0.05],
    },
  };
  // Actual interaction = (0.05,0.01,0.05) - (0.01,-0.01,-0.03)
  //                      - (0.03,0.02,0.03) => (0.01,0,+0.05).
  // Keep the expectation independently arithmetically computed.
  exp.signedSourceLocalRotationChangesRelativeNativeRad.nonadditiveInteraction=[
    0.01,0,0.05,
  ];
  const budget={
    schema:'lfea-bm4l-e75-rotation-basis-parity-diagnostic/v1',
    sourceAccdbSha256:SOURCE_SHA,elementId:'IXP.E75',localAxes:axes,
    cases:[{caseId:'L2',referenceLocalIncrementRad:ref,productionLocalIncrementRad:baseline}],
  };
  const out=analyzeE75WeightPerturbation(exp,budget);
  assert.equal(out.outcomes.length,4);
  assert.ok(Math.abs(out.outcomes[0].signedErrorToOriginalCaesarL2Microrad[2]-50000)<1e-8);
  assert.equal(out.rankedByAbsoluteLocalZError[0].scenarioId,'E75_STIFFNESS_ONLY');
  assert.throws(()=>analyzeE75WeightPerturbation(exp,{
    ...budget,sourceAccdbSha256:'unqualified',
  }),/UNPINNED_W_CAESAR_REFERENCE/);
  const altered=structuredClone(exp);
  altered.scenarios[0].sourceLocalIncrementRotationRad=[0.1,0.2,0.31];
  assert.throws(()=>analyzeE75WeightPerturbation(altered,budget),
    /UNMODIFIED_W_CASE_DOES_NOT_REPRODUCE_PRIOR_PRODUCTION_E75_LOCAL_ROTATION/);
  console.log('BM4L_E75_W_SYSTEM_NEGATIVE_CONTROLS PASS');
}
function main(argv){
  if(argv.length===1&&argv[0]==='--self-test'){selfTest();return;}
  assert.equal(argv.length,6,'Use --experiment <json> --rotation-budget <json> --out <json>');
  assert.equal(argv[0],'--experiment');
  assert.equal(argv[2],'--rotation-budget');
  assert.equal(argv[4],'--out');
  const experiment=JSON.parse(readFileSync(resolve(argv[1]),'utf8'));
  const budget=JSON.parse(readFileSync(resolve(argv[3]),'utf8'));
  const out=analyzeE75WeightPerturbation(experiment,budget);
  const to=resolve(argv[5]);mkdirSync(dirname(to),{recursive:true});
  writeFileSync(to,JSON.stringify(out,null,2)+'\n');
  console.log('BM4L_E75_W_SYSTEM_REFERENCE '+JSON.stringify({
    status:out.status,
    baselineIdentityDriftRad:out.baselineSolverVsRetainedProductionLocalRotationDifferenceMaxRad,
    originalCaesarLocalZMicrorad:out.originalCaesarSourceLocalIncrementMicrorad[2],
    scenarios:out.outcomes.map(x=>({
      id:x.scenarioId,
      signedLocalMicrorad:x.sourceLocalIncrementMicrorad,
      signedDifferenceToCaesarMicrorad:x.signedErrorToOriginalCaesarL2Microrad,
    })),
    interactionLocalMicrorad:out.stiffnessGravityInteractionMicrorad,
    originalCaesarNumericalParityNotCertified:true,
    originalProductionNotAltered:true,
  }));
}
main(process.argv.slice(2));
