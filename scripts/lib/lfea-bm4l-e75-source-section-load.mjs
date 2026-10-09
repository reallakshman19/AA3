import assert from 'node:assert/strict';
import { compileInputXmlExecutionElementAuthorities } from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlStiffnessFrameElementProfile } from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from '../../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

const CASE_IDS = ['IXP-W','IXP-WP','IXP-WT','IXP-WPT'];
const matrixAt = (flat,i,j)=>flat[i*12+j];
const maxRel=(x,y)=>{
  assert.equal(x.length,y.length);
  return Math.max(...x.map((v,i)=>Math.abs(v-y[i])/Math.max(1,Math.abs(v),Math.abs(y[i]))));
};
const delta=(a,b)=>a.map((x,i)=>x-b[i]);
const l2=(a)=>Math.hypot(...a);
const section=(od,t)=>{
  assert.ok(Number.isFinite(od)&&Number.isFinite(t)&&od>2*t&&t>0,'E75_INVALID_SOURCE_ANNULUS');
  const di=od-2*t;
  return {outerDiameterM:od,wallThicknessM:t,innerDiameterM:di,
    areaM2:Math.PI*(od**2-di**2)/4,
    secondMomentM4:Math.PI*(od**4-di**4)/64,
    polarMomentM4:Math.PI*(od**4-di**4)/32};
};
const getElement=(built,id)=>{
  const result=built.frameElements.find((row)=>row.elementId===id);
  assert.ok(result,`E75_MISSING_EXECUTION_FRAME:${id}`);
  return result;
};

/** Actual native and *unpromoted* candidate section/load custody for E75. */
export function diagnoseE75SourceSectionAndLoads(preparation) {
  assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics,false,
    'E75_CANDIDATE_MUST_NOT_BE_PRODUCTION_ENABLED');
  const structural=preparation.structuralPreparation;
  const source=preparation.sourcePreparation;
  const preflight=preparation.stiffnessPreflight;
  const bindings=structural.segmentBindings.filter((b)=>String(b.sourceSegmentId)==='ACCDB.E75');
  assert.equal(bindings.length,1,'E75_SOURCE_BINDING_REQUIRED');
  const bound=bindings[0];
  const nativeElementId=bound.elementId;
  const model=structural.compilation.model;
  const mechanical=model.elements.find((row)=>row.elementId===nativeElementId);
  assert.ok(mechanical,'E75_MECHANICAL_MODEL_ELEMENT_REQUIRED');
  const sourceSegment=source.normalizedGeometry.segments.find((row)=>String(row.id)===String(bound.segmentId));
  assert.ok(sourceSegment,'E75_SOURCE_SEGMENT_META_REQUIRED');
  const reducer=sourceSegment.meta?.reducer;
  assert.ok(reducer,'E75_SOURCE_REDUCER_META_REQUIRED');
  const sectionResolution=structural.sectionResolutions.find((r)=>
    r.sectionState.sectionStateId===mechanical.sectionStateId);
  assert.ok(sectionResolution,'E75_SECTION_RESOLUTION_REQUIRED');
  const from=section(sectionResolution.dimensions.outerDiameter,sectionResolution.dimensions.wallThickness);
  const to=section(reducer.toOuterDiameter,reducer.toWallThickness);
  const sectionState=sectionResolution.sectionState;
  const same=(a,b,name)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*1e-11,
    `E75_SECTION_PROPERTY_MISMATCH:${name}:${a}:${b}`);
  same(sectionState.area,from.areaM2,'A');
  same(sectionState.secondMomentY,from.secondMomentM4,'Iy');
  same(sectionState.secondMomentZ,from.secondMomentM4,'Iz');
  same(sectionState.polarMoment,from.polarMomentM4,'J');

  const opts={
    sourcePreparation:source,
    bendFactorAuthority:preflight.bendFactorAuthority,
    branchFactorAuthority:preflight.branchFactorAuthority,
  };
  const frameProfile=inputXmlStiffnessFrameElementProfile();
  assert.equal(frameProfile.shearDeformation,true);
  assert.equal(frameProfile.shearCorrectionFactorY.value,0.5);
  assert.equal(frameProfile.shearCorrectionFactorZ.value,0.5);

  const nativeBuilt=compileInputXmlExecutionElementAuthorities(structural,frameProfile,null,opts);
  const baseline=getElement(nativeBuilt,nativeElementId);
  const E=baseline.material.elasticModulus,G=baseline.material.shearModulus;
  const L=baseline.geometry.length;
  assert.ok(E>0&&G>0&&L>0);
  const phiY=12*E*from.secondMomentM4/(G*0.5*from.areaM2*L**2);
  const phiZ=phiY;
  const expected={
    axial: E*from.areaM2/L,
    torsion:G*from.polarMomentM4/L,
    shearY:12*E*from.secondMomentM4/((1+phiY)*L**3),
    shearZ:12*E*from.secondMomentM4/((1+phiZ)*L**3),
    bendY:(4+phiZ)*E*from.secondMomentM4/((1+phiZ)*L),
    bendZ:(4+phiY)*E*from.secondMomentM4/((1+phiY)*L),
  };
  const observed={
    axial:matrixAt(baseline.localStiffness,0,0),
    torsion:matrixAt(baseline.localStiffness,3,3),
    shearY:matrixAt(baseline.localStiffness,1,1),
    shearZ:matrixAt(baseline.localStiffness,2,2),
    bendY:matrixAt(baseline.localStiffness,4,4),
    bendZ:matrixAt(baseline.localStiffness,5,5),
  };
  for(const key of Object.keys(expected))same(observed[key],expected[key],key);
  assert.equal(baseline.endConditions.condensedDofs.length,0,
    'E75 source prismatic closed-form comparison requires no released end DOFs');
  assert.ok(baseline.rigidOffsets.I===null&&baseline.rigidOffsets.J===null,
    'E75 closed-form comparison requires no source end offsets');
  const cases=new Map((preparation.physicalPreparation?.physicalCases??[])
    .map((row)=>[row.caseId,row]));
  const caseEvidence={};
  for(const caseId of CASE_IDS){
    const physical=cases.get(caseId);
    assert.ok(physical,`E75_PHYSICAL_CASE_MISSING:${caseId}`);
    const active=getElement(compileInputXmlExecutionElementAuthorities(
      structural,frameProfile,physical.loadCase,opts),nativeElementId);
    const activeHasPressureAxialStrain =
      active.pressure?.axialThrustApplied === true && active.pressure.axialStrain !== 0;
    let candidate=null;
    let inactiveCandidateBlocker=null;
    try {
      candidate=getElement(compileInputXmlExecutionElementAuthorities(
        structural,frameProfile,physical.loadCase,{
          ...opts,
          capabilityProfile:{...PRODUCTION_CAPABILITY_PROFILE,reducerExactMechanics:true},
        }),nativeElementId);
    } catch(error) {
      if(!activeHasPressureAxialStrain
        || error?.code!=='REDUCER_TAPERED_AXIAL_PRESSURE_BASIS_UNQUALIFIED')throw error;
      inactiveCandidateBlocker={
        code:error.code,
        message:error.message,
        // Source model may contain other reducers evaluated before E75.
        // This is a whole-case block, not a claim about which compiled first.
        physicalCaseBlockedBeforeCandidateSolve:true,
      };
    }
    assert.equal(candidate===null,activeHasPressureAxialStrain,
      'Inactive S4 reducer candidate must reject nonzero pressure axial strain in source physical cases');
    assert.equal(active.material.elasticModulus,E);
    // Same stiffness in each physical case: loads may vary, but physical
    // case selection must not silently change the source section.
    assert.ok(maxRel(active.localStiffness,baseline.localStiffness)<1e-12);
    if(candidate!==null){
      assert.equal(candidate.material.elasticModulus,E);
      assert.deepEqual(active.localAxes,candidate.localAxes);
    }
    caseEvidence[caseId]={
      sourceCaseId:caseId,
      primitiveKinds:Object.fromEntries(
        [...new Set(physical.loadCase.primitives.map((p)=>p.kind))]
          .map((kind)=>[kind,physical.loadCase.primitives.filter((p)=>p.kind===kind).length])),
      sourcePhysicalLoadCaseSemanticHash:physical.loadCase.semanticHash,
      active:{
        pressure:active.pressure,
        thermal:active.thermal,
        equivalentLocal:active.equivalentLoadVector.local,
        initialStrainLocal:active.initialStrainLoadVector.local,
      },
      inactiveCandidate:candidate===null?null:{
        pressure:candidate.pressure,
        thermal:candidate.thermal,
        equivalentLocal:candidate.equivalentLoadVector.local,
        initialStrainLocal:candidate.initialStrainLoadVector.local,
      },
      inactiveCandidateBlocker,
    };
  }
  const w=caseEvidence['IXP-W'],wp=caseEvidence['IXP-WP'];
  const wt=caseEvidence['IXP-WT'],wpt=caseEvidence['IXP-WPT'];
  const pressure=(which,left,right)=>delta(left[which].initialStrainLocal,right[which].initialStrainLocal);
  const activePressureByWeight=pressure('active',wp,w);
  const activePressureByThermal=pressure('active',wpt,wt);
  assert.ok(wp.inactiveCandidateBlocker&&wpt.inactiveCandidateBlocker,
    'Physical pressure cases MUST fail closed when S4 taper pressure initial-strain qualification is missing');
  assert.ok(w.inactiveCandidate!==null&&wt.inactiveCandidate!==null,
    'Unpressurized and thermal-only S4 research candidates must remain measurable');
  const magnitudes={
    nativePressureInitialStrainWPairedN:l2(activePressureByWeight),
    candidatePressureInitialStrainWPairedN:null,
    nativePressureInitialStrainThermalPairedN:l2(activePressureByThermal),
    candidatePressureInitialStrainThermalPairedN:null,
  };
  const pressureLoadCarried={
    inNative: magnitudes.nativePressureInitialStrainWPairedN>1e-8,
    inInactiveCandidate:null,
  };
  const candidatePressureRejectedByFailClosedGate=true;
  const sourceRoot=(kind)=>sourceSegment.meta?.analysis?.[kind]??null;
  return {
    schema:'lfea-bm4l-e75-source-section-load-custody/v1',
    status:'SOURCE_SECTION_AND_CASE_LOADS_MEASURED_NO_PRODUCTION_PROMOTION',
    sourceSegmentId:'ACCDB.E75',nativeElementId,
    activeProductionReducerExactMechanics:false,
    inactiveCandidateOnly:true,
    sourceModelElement:{nodeI:mechanical.nodeI,nodeJ:mechanical.nodeJ,
      sectionStateId:mechanical.sectionStateId,materialStateId:mechanical.materialStateId},
    sourceReducer:{toOuterDiameterM:reducer.toOuterDiameter,toWallThicknessM:reducer.toWallThickness},
    sourceAnalysis:{...Object.fromEntries(['fluidDensity','insulationThickness','insulationDensity']
      .map((key)=>[key,sourceRoot(key)]))},
    from,to,sourceSectionAreaRatioToFrom:to.areaM2/from.areaM2,
    sourceSectionSecondMomentRatioToFrom:to.secondMomentM4/from.secondMomentM4,
    lengthM:L,elasticModulusPa:E,shearModulusPa:G,
    sourceShearCorrectionFactor:0.5,
    sourcePrismaticKinematicModel:'TIMOSHENKO_UNIFORM_FROM_END_SECTION',
    phiXY:phiY,phiXZ:phiZ,
    independentPrismaticTerms:expected,
    actualPrismaticTerms:observed,
    caseEvidence,pressureMagnitudes:magnitudes,
    pressureLoadCarried,
    candidatePressureRejectedByFailClosedGate,
    candidatePressureInitialStrainRequiresSeparateQualification:
      pressureLoadCarried.inNative&&candidatePressureRejectedByFailClosedGate,
    analyticalSourceSectionParityVerified:true,
    caesarWholeModelParityQualified:false,
  };
}
