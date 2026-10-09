import assert from 'node:assert/strict';
import { compileInputXmlExecutionElementAuthorities }
  from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlStiffnessFrameElementProfile, inputXmlStiffnessSolverProfile }
  from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE }
  from '../../src/core/linear-piping-analysis-consumer/production-capability-profile.js';
import { compileSolverExecution, requireElementContribution }
  from '../../src/core/linear-fea-solver/index.js';
import { computeWNeighborhoodEndActions }
  from './lfea-bm4l-e75-w-action-recovery.mjs';

const SOURCE_NODES=['22100','22110','22115','22120','22125','22130','22140'];
const SUPPORT_NODES=['22120','22140'];
const E75='IXP.E75';
const DOFS=['UX','UY','UZ','RX','RY','RZ'];
const abs=(x)=>Math.abs(x);
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const norm=(v)=>Math.hypot(...v);
const diff=(a,b)=>a.map((x,i)=>x-b[i]);
const normDiff=(a,b)=>norm(diff(a,b));
const relative=(x,y)=>abs(x-y)/Math.max(1,abs(x),abs(y));

function ensureValue(v,label) {
  assert.ok(typeof v==='number'&&Number.isFinite(v),label+' MUST be finite');
  return v;
}
function getNodeId(model,sourceNode) {
  const ids=model.nodes.map(n=>n.nodeId).filter(id=>id.endsWith('N'+sourceNode));
  assert.equal(ids.length,1,'SOURCE_NODE_MAPPING_AMBIGUOUS:'+sourceNode);
  return ids[0];
}
function vectorAt(entries,nodeId,components){
  return components.map(dof=>{
    const matches=entries.filter(x=>x.nodeId===nodeId && x.dof===dof);
    assert.equal(matches.length,1,'MISSING_OR_DUPLICATE_DOF:'+nodeId+':'+dof);
    return ensureValue(matches[0].value,'DOF:'+nodeId+':'+dof);
  });
}
function supportAt(entries,nodeId) {
  // Reactions need not include unrestricted DOFs; these are exact response
  // values returned by the sealed solver for support springs and constraints.
  return entries.filter(x=>x.nodeId===nodeId)
    .sort((a,b)=>a.dof.localeCompare(b.dof))
    .map(x=>({dof:x.dof,value:ensureValue(x.value,'SUPPORT_REACTION')}));
}
function signedLocalRotationIncrement(execution,from,to,axes){
  const fromRot=vectorAt(execution.displacement,from,['RX','RY','RZ']);
  const toRot=vectorAt(execution.displacement,to,['RX','RY','RZ']);
  const delta=diff(toRot,fromRot);
  return [dot(axes.x,delta),dot(axes.y,delta),dot(axes.z,delta)];
}
function identicalArrays(a,b,label){
  assert.equal(a.length,b.length,label+' length');
  for(let i=0;i<a.length;i++)assert.equal(a[i],b[i],label+' changed at '+i);
}
function compareAuthorized(execution,official){
  assert.equal(execution.displacement.length,official.displacement.length);
  assert.equal(execution.reactions.length,official.reactions.length);
  const key=(x)=>x.nodeId+':'+x.dof;
  for(const item of ['displacement','reactions']){
    const a=new Map(execution[item].map(row=>[key(row),row.value]));
    const b=new Map(official[item].map(row=>[key(row),row.value]));
    assert.equal(a.size,b.size,'W_BASELINE_AUTHORIZED_'+item+'_COUNT');
    for(const [id,v] of a){
      assert.ok(b.has(id),'W_BASELINE_AUTHORIZED_'+item+'_MISSING:'+id);
      assert.ok(relative(v,b.get(id))<1e-10,
        'W_BASELINE_UNAUTHORIZED_NUMERICAL_DRIFT:'+item+':'+id);
    }
  }
}
export function measureBm4lE75WSystemPerturbation(
  preparation,authorizedWExecution,sourceBasicRows
){
  assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics,false,
    'E75 production must remain uniform prismatic');
  const structural=preparation.structuralPreparation;
  const preflight=preparation.stiffnessPreflight;
  const physical=preparation.physicalPreparation?.physicalCases?.find(
    row=>row.caseId==='IXP-W');
  assert.ok(physical&&physical.loadCase,'AUTHENTIC_W_CASE_REQUIRED');
  const model=structural.compilation.model;
  const element=model.elements.find(el=>el.elementId===E75);
  assert.ok(element,'E75_MODEL_ELEMENT_REQUIRED');
  const frameProfile=inputXmlStiffnessFrameElementProfile();
  const solverProfile=inputXmlStiffnessSolverProfile();
  assert.equal(solverProfile.semanticHash,preflight.solverProfileSemanticHash);
  assert.equal(frameProfile.semanticHash,preflight.frameElementProfileSemanticHash);
  const opts={
    sourcePreparation:preparation.sourcePreparation,
    bendFactorAuthority:preflight.bendFactorAuthority,
    branchFactorAuthority:preflight.branchFactorAuthority,
  };
  const production=compileInputXmlExecutionElementAuthorities(
    structural,frameProfile,physical.loadCase,opts);
  const counterfactual=compileInputXmlExecutionElementAuthorities(
    structural,frameProfile,physical.loadCase,{
      ...opts,capabilityProfile:{...PRODUCTION_CAPABILITY_PROFILE,reducerExactMechanics:true},
    });
  assert.equal(production.effectiveStiffnessStateHash,preflight.effectiveStiffnessStateHash,
    'Actual W assembly must match approved preflight stiffness');
  const a=production.elementContributions.find(x=>x.elementId===E75);
  const b=counterfactual.elementContributions.find(x=>x.elementId===E75);
  const frameA=production.frameElements.find(x=>x.elementId===E75);
  const frameB=counterfactual.frameElements.find(x=>x.elementId===E75);
  assert.ok(a&&b&&frameA&&frameB,'TWO_E75_CONTRIBUTIONS_REQUIRED');
  assert.deepEqual(frameA.localAxes,frameB.localAxes);
  assert.deepEqual(frameA.transformation,frameB.transformation);
  assert.deepEqual(frameA.rigidOffsets,frameB.rigidOffsets);
  assert.equal(frameA.pressure,null);
  assert.equal(frameB.pressure,null);
  identicalArrays(a.initialStrainLoadGlobal,b.initialStrainLoadGlobal,
    'W_NO_INITIAL_STRAIN_CHANGE');
  assert.ok(normDiff(a.equivalentLoadGlobal,b.equivalentLoadGlobal)>1,
    'E75_WEIGHT_DIFFERENCE_REQUIRED');
  assert.ok(normDiff(a.globalStiffness,b.globalStiffness)>1,
    'E75_STIFFNESS_DIFFERENCE_REQUIRED');
  const sourceToNative=Object.fromEntries(SOURCE_NODES.map(n=>[n,getNodeId(model,n)]));
  assert.equal(element.nodeI,sourceToNative['22100']);
  assert.equal(element.nodeJ,sourceToNative['22110']);
  const axes=frameA.localAxes.axes;
  const scenarios=[
    {id:'BASELINE_AUTHORIZED_EQUIVALENT',K:a.globalStiffness,F:a.equivalentLoadGlobal},
    {id:'E75_STIFFNESS_ONLY',K:b.globalStiffness,F:a.equivalentLoadGlobal},
    {id:'E75_GRAVITY_ONLY',K:a.globalStiffness,F:b.equivalentLoadGlobal},
    {id:'E75_STIFFNESS_AND_GRAVITY',K:b.globalStiffness,F:b.equivalentLoadGlobal},
  ];
  const scenarioEvidence=[];
  for(const scenario of scenarios){
    const contribution=requireElementContribution({
      elementId:E75,
      globalStiffness:[...scenario.K],
      equivalentLoadGlobal:[...scenario.F],
      initialStrainLoadGlobal:[...a.initialStrainLoadGlobal],
    });
    const contributions=production.elementContributions.map(entry=>
      entry.elementId===E75?contribution:entry);
    assert.equal(contributions.length,model.elements.length);
    assert.equal(contributions.filter((entry,index)=>
      entry!==production.elementContributions[index]).length,1,
      'Exactly E75 one contribution replaced in experimental assembly');
    // WARNING: alternative E75 matrices are NOT authorized by the source
    // preflight hash in model compilation. Never call production gateway here.
    // Each solver call uses its own internal factorization cache (cache omitted),
    // so a stiffness-variant cannot inherit another variant's numerical factor.
    const execution=compileSolverExecution({
      compilation:structural.compilation,
      elementContributions:contributions,
      loadCase:physical.loadCase,
      solverProfile,
    });
    assert.notEqual(execution.status,'BLOCKED',
      'EXPERIMENTAL_W_CASE_SOLVER_BLOCKED:'+scenario.id);
    if(scenario.id==='BASELINE_AUTHORIZED_EQUIVALENT'){
      compareAuthorized(execution,authorizedWExecution);
    }
    const localIncrement=signedLocalRotationIncrement(
      execution,sourceToNative['22100'],sourceToNative['22110'],axes);
    const nodes=Object.fromEntries(SOURCE_NODES.map(n=>[
      n,{
        nodeId:sourceToNative[n],
        displacementGlobalM:vectorAt(execution.displacement,sourceToNative[n],['UX','UY','UZ']),
        rotationGlobalRad:vectorAt(execution.displacement,sourceToNative[n],['RX','RY','RZ']),
      },
    ]));
    const reactions=Object.fromEntries(SUPPORT_NODES.map(n=>[
      n,supportAt(execution.reactions,sourceToNative[n]),
    ]));
    assert.ok(Object.values(reactions).some(x=>x.length>0),
      'SUPPORT_REACTIONS_NOT_RECOVERED');
    scenarioEvidence.push({
      scenarioId:scenario.id,
      e75SectionStiffnessSource:scenario.K===a.globalStiffness
        ?'PRODUCTION_UNIFORM_FROM_END':'INACTIVE_MIDPOINT_TEN_CYLINDER',
      e75GravityLoadSource:scenario.F===a.equivalentLoadGlobal
        ?'PRODUCTION_ORIGINAL_SOURCE_W':'INACTIVE_TAPER_PHYSICAL_WEIGHT',
      e75InitialStrainLoadAlwaysOriginal:true,
      solverStatus:execution.status,
      conditionEstimate:execution.factorization.conditionEstimate,
      normalizedResidual:execution.diagnostics.residual.value,
      forceEquilibriumStatus:execution.diagnostics.forceEquilibrium.status,
      sourceLocalIncrementRotationRad:localIncrement,
      sourceNeighborhoodNodes:nodes,
      downstreamSourceSupportReactions:reactions,
      sourceOriginalElementEndActions:computeWNeighborhoodEndActions({
        model,sourceBasicRows,
        segmentBindings:structural.segmentBindings,
        nativeElements:production.elementContributions,
        nativeFrames:production.frameElements,
        execution,e75Contribution:contribution,
        scenarioId:scenario.id,
      }),
      fullAssemblyElementContributionCount:contributions.length,
      nonE75ModelElementContributionHashChanged:false,
      authorizedProductionSolve:false,
    });
  }
  const baseline=scenarioEvidence[0];
  const perturbation=s=>diff(s.sourceLocalIncrementRotationRad,
    baseline.sourceLocalIncrementRotationRad);
  const stiffness=perturbation(scenarioEvidence[1]);
  const gravity=perturbation(scenarioEvidence[2]);
  const combined=perturbation(scenarioEvidence[3]);
  const interaction=diff(combined,stiffness.map((x,i)=>x+gravity[i]));
  return {
    schema:'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1',
    status:'RESEARCH_VARIANTS_SOLVED_ORIGINAL_W_SUPPORTS_NOT_PRODUCTION_QUALIFIED',
    benchmarkId:'BM4_L',
    physicalCaseId:'IXP-W',
    sourceCaseSemanticHash:physical.loadCase.semanticHash,
    nativeElementId:E75,
    sourceNodes:sourceToNative,
    originalPhysicalCaseAndAllSupportConstraintsPreserved:true,
    originalProductionExecutionNumericallyReproduced:true,
    onlyE75ContributionVaried:true,
    productionReducerRemainsPrismatic:PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics===false,
    pressureBearingCandidateNotEvaluated:true,
    baselineProfileHash:frameProfile.semanticHash,
    solverProfileHash:solverProfile.semanticHash,
    isolatedE75OriginalGlobalStiffness:a.globalStiffness,
    isolatedE75CandidateGlobalStiffness:b.globalStiffness,
    isolatedE75OriginalGravityGlobal:a.equivalentLoadGlobal,
    isolatedE75CandidateGravityGlobal:b.equivalentLoadGlobal,
    E75LocalAxes:axes,
    scenarios:scenarioEvidence,
    signedSourceLocalRotationChangesRelativeNativeRad:{
      stiffnessOnly:stiffness,
      gravityOnly:gravity,
      both:combined,
      nonadditiveInteraction:interaction,
    },
    notACaesarIIControlledReducerExperiment:true,
    sourceGravityOwnershipAndSectionSamplingRemainUnqualified:true,
    noAlternativeAssemblyPassedProductionPreflight:true,
    sourceReferenceOrAcceptanceToleranceChanged:false,
    engineeringProductionPromotionAuthorized:false,
  };
}
