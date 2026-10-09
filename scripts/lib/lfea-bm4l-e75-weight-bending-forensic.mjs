import assert from 'node:assert/strict';
import { compileInputXmlExecutionElementAuthorities }
  from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlStiffnessFrameElementProfile }
  from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE }
  from '../../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

const IDS=['74','75','76','77','78','79','80'];
const dot=(a,b)=>a.reduce((t,v,i)=>t+v*b[i],0);
const total=(v,i,j)=>v[i]+v[j];
const mag=(a)=>Math.hypot(...a);
const relative=(a,b)=>Math.abs(a-b)/Math.max(1,Math.abs(a),Math.abs(b));
const finite=(x,name)=>{assert.ok(typeof x==='number'&&Number.isFinite(x),name);return x;};

function solveEndJFixedI(localStiffness,forceIndex){
  // Fixed-From-end is an *isolated comparative boundary condition*, not the
  // support state of the full piping model. Invert the actual 6x6 J block,
  // rather than a hand-approximated tapered beam stiffness.
  assert.equal(localStiffness.length,144);
  const n=6;
  const rows=Array.from({length:n},(_,i)=>[
    ...Array.from({length:n},(_,j)=>finite(localStiffness[(i+6)*12+j+6],'Kjj')),
    i===forceIndex?1:0,
  ]);
  for(let i=0;i<n;i++){
    let pivot=i;
    for(let j=i+1;j<n;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;
    assert.ok(Math.abs(rows[pivot][i])>1e-16,'E75_J_END_STIFFNESS_SINGULAR');
    [rows[i],rows[pivot]]=[rows[pivot],rows[i]];
    const d=rows[i][i];
    for(let j=i;j<=n;j++)rows[i][j]/=d;
    for(let k=0;k<n;k++){
      if(k===i)continue;
      const scale=rows[k][i];
      for(let j=i;j<=n;j++)rows[k][j]-=scale*rows[i][j];
    }
  }
  const displacement=rows.map(row=>row[n]);
  const residual=Array.from({length:n},(_,i)=>
    Array.from({length:n},(_,j)=>localStiffness[(i+6)*12+j+6]*displacement[j])
      .reduce((a,b)=>a+b,0)-(i===forceIndex?1:0));
  assert.ok(mag(residual)<2e-6,'E75_FIXED_FROM_END_UNIT_LOAD_EQUILIBRIUM_INVALID');
  return {localDisplacementJ:displacement,absoluteLinearSolveResidual:mag(residual)};
}
const roundtrip=(a,b,name,rel=2e-6)=>{
  assert.ok(relative(a,b)<rel,`E75_${name}_MISMATCH:${a} vs ${b}`);
};
const sec=(od,t)=>{
  const inside=od-2*t;
  assert.ok(inside>0);
  return {inside,area:Math.PI*(od**2-inside**2)/4,
    Iz:Math.PI*(od**4-inside**4)/64};
};

export function buildBm4lE75WeightBendingForensic(preparation) {
  assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics,false,
    'Production reducer must remain disabled');
  const structural=preparation.structuralPreparation;
  const source=preparation.sourcePreparation;
  const opts={
    sourcePreparation:source,
    bendFactorAuthority:preparation.stiffnessPreflight.bendFactorAuthority,
    branchFactorAuthority:preparation.stiffnessPreflight.branchFactorAuthority,
  };
  const w=preparation.physicalPreparation?.physicalCases?.find(row=>row.caseId==='IXP-W');
  assert.ok(w,'Authentic weight-only physical load case required');
  const frameProfile=inputXmlStiffnessFrameElementProfile();
  const production=compileInputXmlExecutionElementAuthorities(
    structural,frameProfile,w.loadCase,opts);
  const research=compileInputXmlExecutionElementAuthorities(
    structural,frameProfile,w.loadCase,{
      ...opts,capabilityProfile:{...PRODUCTION_CAPABILITY_PROFILE,reducerExactMechanics:true},
    });
  const byId=(set,id)=>set.frameElements.find(row=>row.elementId===id);
  const bindings=new Map(structural.segmentBindings.map(row=>[
    String(row.sourceSegmentId),row.elementId,
  ]));
  const modelElements=new Map(structural.compilation.model.elements.map(row=>[row.elementId,row]));
  const spanEvidence=IDS.map(n=>{
    const sourceId='ACCDB.E'+n;
    const elementId=bindings.get(sourceId);
    assert.ok(elementId,'Source span binding missing '+sourceId);
    const el=modelElements.get(elementId);
    assert.ok(el,'Native element missing '+elementId);
    const active=byId(production,elementId);
    return {
      sourceId,elementId,
      nativeFrameCompiled:active!==undefined,
      modelNodeI:el.nodeI,modelNodeJ:el.nodeJ,
      segmentLengthM:active?.geometry.length??null,
      sourceSectionStateId:el.sectionStateId,
      sourceMaterialStateId:el.materialStateId,
      localGravityForceN:active?[
        total(active.equivalentLoadVector.local,0,6),
        total(active.equivalentLoadVector.local,1,7),
        total(active.equivalentLoadVector.local,2,8),
      ]:null,
      sourceWPrimitiveId:elementId+'-W',
    };
  });
  const id=bindings.get('ACCDB.E75');
  assert.equal(id,'IXP.E75');
  const active=byId(production,id),candidate=byId(research,id);
  assert.ok(active&&candidate,'Both source E75 weight frames required');
  assert.deepEqual(active.localAxes,candidate.localAxes);
  assert.equal(active.geometry.length,candidate.geometry.length);
  assert.equal(active.pressure,null);
  assert.equal(candidate.pressure,null);
  const original=w.loadCase.primitives.filter(p=>p.elementId===id
    && p.kind==='DISTRIBUTED_LOAD');
  assert.equal(original.length,1,'E75 must own one original W primitive');
  assert.equal(original[0].primitiveId,id+'-W');
  assert.equal(original[0].basis,'GLOBAL');
  assert.deepEqual(original[0].startIntensity,original[0].endIntensity);
  const axes=active.localAxes.axes;
  const load=original[0];
  const globalWeightIntensity=[
    load.startIntensity.fx,load.startIntensity.fy,load.startIntensity.fz,
  ];
  const sourceLocalWeightIntensity=[
    dot(axes.x,globalWeightIntensity),
    dot(axes.y,globalWeightIntensity),
    dot(axes.z,globalWeightIntensity),
  ];
  const L=active.geometry.length;
  const sourceTotal=sourceLocalWeightIntensity.map(v=>v*L);
  const nativeLocal=active.equivalentLoadVector.local;
  const researchLocal=candidate.equivalentLoadVector.local;
  const nativeForces=[
    total(nativeLocal,0,6),total(nativeLocal,1,7),total(nativeLocal,2,8),
  ];
  const candidateForces=[
    total(researchLocal,0,6),total(researchLocal,1,7),total(researchLocal,2,8),
  ];
  for(let i=0;i<3;i++)
    roundtrip(sourceTotal[i],nativeForces[i],'SOURCE_W_FORCE_'+i,1e-10);
  const weightMagnitudePerLength=mag(globalWeightIntensity);
  assert.ok(weightMagnitudePerLength>0);
  const sourceSection=structural.sectionResolutions.find(row=>
    row.sectionState.sectionStateId===modelElements.get(id).sectionStateId);
  const material=structural.materialResolutions.find(row=>
    row.materialState.materialStateId===modelElements.get(id).materialStateId);
  assert.ok(sourceSection&&material);
  const geometry=source.normalizedGeometry.segments.find(row=>row.id==='ACCDB.E75');
  assert.ok(geometry?.meta?.reducer,'Source reducer geometry unresolved');
  const from=sec(sourceSection.dimensions.outerDiameter,sourceSection.dimensions.wallThickness);
  const to=sec(geometry.meta.reducer.toOuterDiameter,geometry.meta.reducer.toWallThickness);
  const E=material.materialState.elasticModulus;
  const G=material.materialState.shearModulus;
  const kappa=0.5;
  const nativeMz=solveEndJFixedI(active.localStiffness,5);
  const candidateMz=solveEndJFixedI(candidate.localStiffness,5);
  const nativeMy=solveEndJFixedI(active.localStiffness,4);
  const candidateMy=solveEndJFixedI(candidate.localStiffness,4);
  const nativeFy=solveEndJFixedI(active.localStiffness,1);
  const candidateFy=solveEndJFixedI(candidate.localStiffness,1);
  const expectedUniformEndMomentRotation=L/(E*from.Iz);
  const expectedUniformEndForceRotation=L**2/(2*E*from.Iz);
  const expectedUniformEndForceDisplacement=
    L**3/(3*E*from.Iz)+L/(kappa*G*from.area);
  roundtrip(nativeMz.localDisplacementJ[5],expectedUniformEndMomentRotation,
    'UNIFORM_CANTILEVER_END_MZ_ROTATION',2e-6);
  roundtrip(nativeMy.localDisplacementJ[4],expectedUniformEndMomentRotation,
    'UNIFORM_CANTILEVER_END_MY_ROTATION',2e-6);
  roundtrip(nativeFy.localDisplacementJ[5],expectedUniformEndForceRotation,
    'UNIFORM_CANTILEVER_END_FY_ROTATION',2e-6);
  roundtrip(nativeFy.localDisplacementJ[1],expectedUniformEndForceDisplacement,
    'UNIFORM_CANTILEVER_END_FY_DISPLACEMENT',2e-6);
  // Analytical EI reciprocal-series compliance for 10 midpoint sections.
  const slices=Array.from({length:10},(_,i)=>{
    const fraction=(i+0.5)/10;
    const OD=sourceSection.dimensions.outerDiameter+
      fraction*(geometry.meta.reducer.toOuterDiameter-sourceSection.dimensions.outerDiameter);
    const t=sourceSection.dimensions.wallThickness+
      fraction*(geometry.meta.reducer.toWallThickness-sourceSection.dimensions.wallThickness);
    const section=sec(OD,t);
    return {index:i,fraction,odM:OD,wallM:t,
      sectionAreaM2:section.area,I_m4:section.Iz,
      contributionToMomentRotationRadPerNm:(L/10)/(E*section.Iz)};
  });
  const independentlySeriesMomentRotation=slices
    .reduce((sum,c)=>sum+c.contributionToMomentRotationRadPerNm,0);
  roundtrip(candidateMz.localDisplacementJ[5],independentlySeriesMomentRotation,
    'CONDENSED_TEN_CYLINDER_MZ_COMPLIANCE',2e-6);
  roundtrip(candidateMy.localDisplacementJ[4],independentlySeriesMomentRotation,
    'CONDENSED_TEN_CYLINDER_MY_COMPLIANCE',2e-6);
  assert.ok(candidateMz.localDisplacementJ[5]<nativeMz.localDisplacementJ[5],
    'E75 expansion taper should have lower fixed-end MZ rotational compliance');
  // Candidate W is compiled from source metal + insulation + contents, but
  // original W is the retained load authority. No assertion they are identical:
  // that is an unresolved ownership question.
  const analysis=geometry.meta.analysis??{};
  const totalCandidateWeightN=mag(candidateForces);
  const totalProductionWeightN=mag(nativeForces);
  const candidateEquivalentWeightDirection=totalCandidateWeightN===0?null:
    candidateForces.map(v=>v/totalCandidateWeightN);
  const sourceGravityDirection=sourceTotal.map(v=>v/mag(sourceTotal));
  if(candidateEquivalentWeightDirection!==null){
    assert.ok(mag(candidateEquivalentWeightDirection.map((v,i)=>v-sourceGravityDirection[i]))<1e-9,
      'Candidate gravity direction drifted from W source');
  }
  const restraints=(structural.constraintBindings??[]).filter(row=>
    ['22120','22140'].some(node=>String(row.targetNodeId??'').endsWith(node)));
  return {
    schema:'lfea-bm4l-e75-weight-bending-compliance-forensic/v1',
    status:'MEASURED_WEIGHT_AND_CANTILEVER_BENDING_SENSITIVITIES_NOT_CAESAR_PARITY',
    sourceSegmentId:'ACCDB.E75',elementId:id,
    productionReducerExactMechanics:false,condenserCandidateOnly:true,
    sourceWeightPhysicalLoadCaseSemanticHash:w.loadCase.semanticHash,
    sourceGravityPrimitive:{primitiveId:load.primitiveId,
      intensityGlobalNPerM:globalWeightIntensity,
      intensityLocalNPerM:sourceLocalWeightIntensity,
      totalSourceLocalWeightN:sourceTotal,
    },
    nativeLocalGravityVector:nativeLocal,
    tenCylinderLocalGravityVector:researchLocal,
    nativeLocalWeightResultantN:nativeForces,
    candidateLocalWeightResultantN:candidateForces,
    sourceWeightMagnitudeN:mag(sourceTotal),
    nativeWeightMagnitudeN:totalProductionWeightN,
    candidateWeightMagnitudeN:totalCandidateWeightN,
    candidateToNativeWeightRatio:totalCandidateWeightN/totalProductionWeightN,
    sourceSectionFrom:{outerDiameterM:sourceSection.dimensions.outerDiameter,
      wallThicknessM:sourceSection.dimensions.wallThickness,areaM2:from.area,I_m4:from.Iz},
    sourceSectionTo:{outerDiameterM:geometry.meta.reducer.toOuterDiameter,
      wallThicknessM:geometry.meta.reducer.toWallThickness,areaM2:to.area,I_m4:to.Iz},
    sourceAnalysisGravityOwnership:{
      fluidDensity:analysis.fluidDensity??null,
      insulationThickness:analysis.insulationThickness??null,
      insulationDensity:analysis.insulationDensity??null,
      pipeMassDensity:material.materialState.massDensity,
      sourceDeclaredWeightNPerM:weightMagnitudePerLength,
      tenCylinderGravitySourceMayDifferFromSourceW:true,
    },
    sourceFrameLengthM:L,elasticModulusPa:E,shearModulusPa:G,
    hypotheticalBoundary:'FIXED_FROM_END_FREE_TO_END_FOR_UNIT_MOMENT_OR_FORCE',
    nativeEndMomentZRotationalComplianceRadPerNm:nativeMz.localDisplacementJ[5],
    tenCylinderEndMomentZRotationalComplianceRadPerNm:candidateMz.localDisplacementJ[5],
    nativeEndMomentYRotationalComplianceRadPerNm:nativeMy.localDisplacementJ[4],
    tenCylinderEndMomentYRotationalComplianceRadPerNm:candidateMy.localDisplacementJ[4],
    nativeEndForceYRotationRadPerN:nativeFy.localDisplacementJ[5],
    tenCylinderEndForceYRotationRadPerN:candidateFy.localDisplacementJ[5],
    nativeEndForceYDisplacementMPerN:nativeFy.localDisplacementJ[1],
    tenCylinderEndForceYDisplacementMPerN:candidateFy.localDisplacementJ[1],
    candidateToNativeBendingMomentComplianceRatio:
      candidateMz.localDisplacementJ[5]/nativeMz.localDisplacementJ[5],
    nativeAnalyticalMomentComplianceRadPerNm:expectedUniformEndMomentRotation,
    nativeAnalyticalEndForceRotationRadPerN:expectedUniformEndForceRotation,
    nativeAnalyticalEndForceDisplacementMPerN:expectedUniformEndForceDisplacement,
    independentTenCylinderSeriesMomentComplianceRadPerNm:independentlySeriesMomentRotation,
    sourceMidpointCylinderComplianceSlices:slices,
    adjacentE74ThroughE80:spanEvidence,
    downstreamStructuralConstraintBindings:restraints,
    nativeRigidsAndSupportLoadRedistributionSolved:false,
    caesarIIOriginalReducerSamplingAndWeightOwnershipQualified:false,
    fixtureOrNumericalAcceptanceModified:false,
    productionMechanicsChanged:false,
  };
}
