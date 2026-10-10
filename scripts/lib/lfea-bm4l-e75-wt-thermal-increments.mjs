import assert from 'node:assert/strict';
import { compileInputXmlExecutionElementAuthorities }
  from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlStiffnessFrameElementProfile, inputXmlStiffnessSolverProfile }
  from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE }
  from '../../src/core/linear-piping-analysis-consumer/production-capability-profile.js';
import { compileSolverExecution, requireElementContribution }
  from '../../src/core/linear-fea-solver/index.js';

const E75='IXP.E75';
const SUPPORTS=['22120','22140'];
const DOFS=['UX','UY','UZ','RX','RY','RZ'];
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const diff=(a,b)=>a.map((x,i)=>x-b[i]);
const maxAbs=(v)=>Math.max(...v.map(Math.abs));
const node=(x)=>'IXP.N'+x;
const get=(entries,nodeId,dof)=>{
  const arr=entries.filter(v=>v.nodeId===nodeId&&v.dof===dof);
  assert.equal(arr.length,1,'E75_WT_DISPLACEMENT_DOF_AMBIGUOUS:'+nodeId+':'+dof);
  assert.ok(Number.isFinite(arr[0].value));return arr[0].value;
};
function sourceLocalIncrement(execution,axes){
  const a=['RX','RY','RZ'].map(dof=>get(execution.displacement,node('22100'),dof));
  const b=['RX','RY','RZ'].map(dof=>get(execution.displacement,node('22110'),dof));
  const delta=diff(b,a);
  return [axes.x,axes.y,axes.z].map(v=>dot(v,delta));
}
function compareExecutions(execution,original,label){
  assert.deepEqual(execution.displacement.map(x=>[x.nodeId,x.dof]),
    original.displacement.map(x=>[x.nodeId,x.dof]),
    'E75_WT_AUTHORIZED_DISPLACEMENT_DOF_IDENTITY:'+label);
  assert.deepEqual(execution.reactions.map(x=>[x.nodeId,x.dof]),
    original.reactions.map(x=>[x.nodeId,x.dof]),
    'E75_WT_AUTHORIZED_REACTIONS_DOF_IDENTITY:'+label);
  for(const key of ['displacement','reactions']){
    const delta=execution[key].map((x,i)=>x.value-original[key][i].value);
    assert.ok(maxAbs(delta)<1e-9,'E75_WT_OFFICIAL_BASELINE_DRIFT:'+key+':'+label);
  }
}
function same(a,b,label){
  assert.equal(a.length,b.length,label+' shape');
  for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<1e-9*
    Math.max(1,Math.abs(a[i]),Math.abs(b[i])),label+':'+i);
}
function support(execution,sourceId){
  return execution.reactions.filter(x=>x.nodeId===node(sourceId))
    .map(x=>({dof:x.dof,value:x.value}));
}
function fmt(execution,axes){
  return {
    localRotationIncrementRad:sourceLocalIncrement(execution,axes),
    sourceNodeGlobalRotation: Object.fromEntries(['22100','22110','22120','22140']
      .map(s=>[s,['RX','RY','RZ'].map(dof=>
        get(execution.displacement,node(s),dof))])),
    downstreamSupportReactions:Object.fromEntries(SUPPORTS.map(s=>
      [s,support(execution,s)])),
  };
}
export function measureE75ThermalOnlyFullSystem(preparation,officialWT,originalWReceipt){
  assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics,false);
  assert.equal(originalWReceipt.schema,
    'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1');
  assert.equal(originalWReceipt.originalProductionExecutionNumericallyReproduced,true);
  assert.equal(originalWReceipt.physicalCaseId,'IXP-W');
  const structural=preparation.structuralPreparation;
  const preflight=preparation.stiffnessPreflight;
  const model=structural.compilation.model;
  const physicalWT=preparation.physicalPreparation?.physicalCases.find(x=>x.caseId==='IXP-WT');
  const physicalW=preparation.physicalPreparation?.physicalCases.find(x=>x.caseId==='IXP-W');
  assert.ok(physicalWT?.loadCase&&physicalW?.loadCase,
    'SOURCE_IXP_WT_AND_IXP_W_REQUIRED');
  const profile=inputXmlStiffnessFrameElementProfile();
  const solverProfile=inputXmlStiffnessSolverProfile();
  assert.equal(profile.semanticHash,preflight.frameElementProfileSemanticHash);
  assert.equal(solverProfile.semanticHash,preflight.solverProfileSemanticHash);
  const opts={
    sourcePreparation:preparation.sourcePreparation,
    bendFactorAuthority:preflight.bendFactorAuthority,
    branchFactorAuthority:preflight.branchFactorAuthority,
  };
  const native=compileInputXmlExecutionElementAuthorities(
    structural,profile,physicalWT.loadCase,opts);
  const candidate=compileInputXmlExecutionElementAuthorities(
    structural,profile,physicalWT.loadCase,{
      ...opts,capabilityProfile:{...PRODUCTION_CAPABILITY_PROFILE,reducerExactMechanics:true},
    });
  assert.equal(native.effectiveStiffnessStateHash,
    preflight.effectiveStiffnessStateHash,
    'UNALTERED_WT_SOURCE_STIFFNESS_PREFLIGHT_REQUIRED');
  const n=native.elementContributions.find(v=>v.elementId===E75);
  const t=candidate.elementContributions.find(v=>v.elementId===E75);
  const nativeFrame=native.frameElements.find(v=>v.elementId===E75);
  const candidateFrame=candidate.frameElements.find(v=>v.elementId===E75);
  assert.ok(n&&t&&nativeFrame&&candidateFrame,'E75_SOURCE_AND_CANDIDATE_REQUIRED');
  assert.equal(nativeFrame.pressure,null,'E75_WT_MUST_BE_PRESSURELESS');
  assert.equal(candidateFrame.pressure,null,'CANDIDATE_WT_MUST_BE_PRESSURELESS');
  assert.deepEqual(nativeFrame.localAxes,candidateFrame.localAxes);
  assert.deepEqual(nativeFrame.rigidOffsets,candidateFrame.rigidOffsets);
  assert.deepEqual(nativeFrame.transformation,candidateFrame.transformation);
  const axes=nativeFrame.localAxes.axes;
  same(n.globalStiffness,originalWReceipt.isolatedE75OriginalGlobalStiffness,
    'ACTUAL_W_AND_WT_NATIVE_STIFFNESS_MUST_AGREE');
  same(t.globalStiffness,originalWReceipt.isolatedE75CandidateGlobalStiffness,
    'ACTUAL_W_AND_WT_TAPERED_STIFFNESS_MUST_AGREE');
  same(n.equivalentLoadGlobal,originalWReceipt.isolatedE75OriginalGravityGlobal,
    'ACTUAL_W_AND_WT_SOURCE_GRAVITY_MUST_AGREE');
  same(t.equivalentLoadGlobal,originalWReceipt.isolatedE75CandidateGravityGlobal,
    'ACTUAL_W_AND_WT_CANDIDATE_GRAVITY_MUST_AGREE');
  assert.ok(maxAbs(n.initialStrainLoadGlobal)>0,'ORIGINAL_E75_TEMPERATURE_VECTOR_REQUIRED');
  assert.ok(maxAbs(t.initialStrainLoadGlobal)>0,'CANDIDATE_E75_TEMPERATURE_VECTOR_REQUIRED');
  const originalWById=new Map(originalWReceipt.scenarios.map(v=>[v.scenarioId,v]));
  assert.equal(originalWById.size,4);
  const results=[];
  for(const stiffness of ['NATIVE','TEN_CYLINDER']){
    for(const gravity of ['NATIVE','TEN_CYLINDER']){
      const wId=stiffness==='NATIVE'
        ? (gravity==='NATIVE'?'BASELINE_AUTHORIZED_EQUIVALENT':'E75_GRAVITY_ONLY')
        : (gravity==='NATIVE'?'E75_STIFFNESS_ONLY':'E75_STIFFNESS_AND_GRAVITY');
      const priorW=originalWById.get(wId);
      assert.ok(priorW,'PREVIOUS_ORIGINAL_W_SCENARIO_MISSING:'+wId);
      const sameFrameN=stiffness==='NATIVE',sameGravityN=gravity==='NATIVE';
      for(const thermal of ['NATIVE','TEN_CYLINDER']){
        const id='K_'+stiffness+'_G_'+gravity+'_T_'+thermal;
        const local=requireElementContribution({
          elementId:E75,
          globalStiffness:[...(sameFrameN?n.globalStiffness:t.globalStiffness)],
          equivalentLoadGlobal:[...(sameGravityN?n.equivalentLoadGlobal:t.equivalentLoadGlobal)],
          initialStrainLoadGlobal:[...(thermal==='NATIVE'?
            n.initialStrainLoadGlobal:t.initialStrainLoadGlobal)],
        });
        const contributions=native.elementContributions.map(x=>
          x.elementId===E75?local:x);
        assert.equal(contributions.length,model.elements.length);
        assert.equal(contributions.filter((x,i)=>
          x!==native.elementContributions[i]).length,1,
          'ONLY_E75_WT_CONTRIBUTION_MAY_BE_REPLACED');
        const executed=compileSolverExecution({
          compilation:structural.compilation,
          elementContributions:contributions,
          loadCase:physicalWT.loadCase,
          solverProfile,
        });
        assert.notEqual(executed.status,'BLOCKED','E75_WT_RESEARCH_SOLVER_BLOCKED:'+id);
        if(sameFrameN&&sameGravityN&&thermal==='NATIVE'){
          compareExecutions(executed,officialWT,id);
        }
        const answer=fmt(executed,axes);
        const thermalChange=diff(answer.localRotationIncrementRad,
          priorW.sourceLocalIncrementRotationRad);
        results.push({
          scenarioId:id,stiffness,gravity,thermal,
          matchingOriginalWScenarioId:wId,
          physics:'W+T_ONLY_NO_PRESSURE',
          sourceLocalIncrementRotationRad:answer.localRotationIncrementRad,
          sourceLocalThermalDifferenceFromCorrespondingWScenarioRad:thermalChange,
          downstreamSourceSupportReactions:answer.downstreamSupportReactions,
          sourceNodeGlobalRotation:answer.sourceNodeGlobalRotation,
          solverStatus:executed.status,
          solverForceEquilibriumStatus:executed.diagnostics.forceEquilibrium.status,
          sourceOriginalCaesarWTCaseExists:false,
          pressureBasisUnchangedAndNotUsed:true,
          onlyE75ContributionVaried:true,
          alternateStiffnessOutsideProductionPreflight:true,
        });
      }
    }
  }
  assert.equal(results.length,8);
  const nativeWT=results.find(x=>x.scenarioId==='K_NATIVE_G_NATIVE_T_NATIVE');
  const correctedWT=results.find(x=>
    x.scenarioId==='K_TEN_CYLINDER_G_TEN_CYLINDER_T_TEN_CYLINDER');
  const thermalOnlyDelta=[];
  for(const st of ['NATIVE','TEN_CYLINDER']){
    for(const gr of ['NATIVE','TEN_CYLINDER']){
      const base=results.find(x=>x.stiffness===st&&x.gravity===gr&&x.thermal==='NATIVE');
      const alt=results.find(x=>x.stiffness===st&&x.gravity===gr&&x.thermal==='TEN_CYLINDER');
      thermalOnlyDelta.push({
        stiffness:st,gravity:gr,
        thermalBasisChangeRad:diff(
          alt.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad,
          base.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad),
      });
    }
  }
  return {
    schema:'lfea-bm4l-e75-unpressurized-wt-full-system-thermal-counterfactual/v1',
    status:'ORIGINAL_SOURCE_WT_FULL_SYSTEM_UNQUALIFIED_THERMAL_MECHANICS_RESEARCH',
    sourceOriginalCaseId:'IXP-WT',
    sourceBaselineCaseId:'IXP-W',
    sourceWTPhysicalLoadCaseHash:physicalWT.loadCase.semanticHash,
    originalWReceiptSourceCaseHash:originalWReceipt.sourceCaseSemanticHash,
    originalUnpressurizedWTAuthorizedExecutionReproduced:true,
    originalWAuthorizedExecutionReproducedInPreviousExperiment:true,
    originalNativeWTMinusWLocalRotationRad:
      nativeWT.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad,
    originalCandidateAllWTMinusWLocalRotationRad:
      correctedWT.sourceLocalThermalDifferenceFromCorrespondingWScenarioRad,
    sourceLocalAxes:axes,elementId:E75,sourceEndpoints:['22100','22110'],
    originalNativeE75ThermalGlobal:n.initialStrainLoadGlobal,
    researchTenCylinderE75ThermalGlobal:t.initialStrainLoadGlobal,
    experimentScenarios:results,
    thermalBasisSwapsAtFixedKAndGravity:thermalOnlyDelta,
    pressureLoadsExcludedInAllResearchCases:true,
    caesarL5MinusL6NotAnIndependentPressurelessWTReference:true,
    caesarCaseDifferenceMayIncludePressureStiffeningOrLoadInteractions:true,
    originalTenCylinderSamplingRuleUnqualified:true,
    engineeringPromotionAuthorized:false,
    productionMechanicsChanged:false,
  };
}
