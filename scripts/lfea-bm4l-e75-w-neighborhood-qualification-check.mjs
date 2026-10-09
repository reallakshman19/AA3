#!/usr/bin/env node
/**
 * Source-bound BM4_L W-case neighborhood/support counterfactual audit.
 * CAESAR II supplies only the ORIGINAL L2 reference, never the experimental
 * ten-cylinder E75 model. No hypothetical scenario receives a PASS/FAIL claim.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const SOURCE_NODES=['22100','22110','22115','22120','22125','22130','22140'];
const SUPPORT_NODES=['22120','22140'];
const COMPARISON_GROUPS=[
  {id:'NEIGHBOR_TRANSLATION',quantity:'DISPLACEMENT',components:['UX','UY','UZ'],
    nodes:SOURCE_NODES,unit:'m'},
  {id:'NEIGHBOR_ROTATION',quantity:'ROTATION',components:['RX','RY','RZ'],
    nodes:SOURCE_NODES,unit:'rad'},
  {id:'DOWNSTREAM_SUPPORT_FORCE',quantity:'FORCE',components:['FX','FY','FZ'],
    nodes:SUPPORT_NODES,unit:'N'},
  {id:'DOWNSTREAM_SUPPORT_MOMENT',quantity:'MOMENT',components:['MX','MY','MZ'],
    nodes:SUPPORT_NODES,unit:'N*m'},
];
const EXPERIMENT_IDS=[
  'BASELINE_AUTHORIZED_EQUIVALENT','E75_STIFFNESS_ONLY',
  'E75_GRAVITY_ONLY','E75_STIFFNESS_AND_GRAVITY',
];
const finite=(v,l)=>{assert.ok(typeof v==='number'&&Number.isFinite(v),
  'W_NEIGHBOR_NONFINITE:'+l);return v;};
const compareActual=(a,b,l)=>assert.ok(Math.abs(a-b)<
  2e-11*Math.max(1,Math.abs(a),Math.abs(b)),'W_NEIGHBOR_BASELINE_DRIFT:'+l+':'+a+':'+b);
const moment=(od,t)=>Math.PI*(od**4-(od-2*t)**4)/64;
const approx=(a,b)=>Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b));

export function calculateSectionSamplingBounds(receipt) {
  assert.equal(receipt.schema,'lfea-bm4l-e75-weight-bending-compliance-forensic/v1');
  assert.equal(receipt.elementId,'IXP.E75');
  assert.equal(receipt.productionReducerExactMechanics,false);
  assert.equal(receipt.condenserCandidateOnly,true);
  const {outerDiameterM:od1,wallThicknessM:t1,I_m4:I1}=receipt.sourceSectionFrom;
  const {outerDiameterM:od2,wallThicknessM:t2,I_m4:I2}=receipt.sourceSectionTo;
  const E=finite(receipt.elasticModulusPa,'E'),L=finite(receipt.sourceFrameLengthM,'L');
  assert.ok(E>0&&L>0&&od1>2*t1&&od2>2*t2&&od2>od1);
  assert.ok(approx(moment(od1,t1),I1)&&approx(moment(od2,t2),I2));
  const labels=['LEFT_ENDPOINT','MIDPOINT','RIGHT_ENDPOINT'];
  const stations=Object.fromEntries(labels.map((name,j)=>{
    const offset=j/2, step=L/10;
    const sections=Array.from({length:10},(_,index)=>{
      const f=(index+offset)/10;
      const od=od1+f*(od2-od1),wall=t1+f*(t2-t1);
      const I=moment(od,wall);
      assert.ok(I>0,'SAMPLING_SECTION_NOT_POSITIVE');
      return {
        stationIndex:index,
        sourceLengthFraction:f,
        sectionI_m4:I,
        isolatedEndMomentComplianceContributionRadPerNm:step/(E*I),
      };
    });
    return [name,{
      samplingRule:'RESEARCH_ONLY_'+name+'_LINEAR_SECTION',
      sections,
      isolatedCantileverEndMomentComplianceRadPerNm:sections.reduce(
        (s,x)=>s+x.isolatedEndMomentComplianceContributionRadPerNm,0),
    }];
  }));
  const left=stations.LEFT_ENDPOINT.isolatedCantileverEndMomentComplianceRadPerNm;
  const mid=stations.MIDPOINT.isolatedCantileverEndMomentComplianceRadPerNm;
  const right=stations.RIGHT_ENDPOINT.isolatedCantileverEndMomentComplianceRadPerNm;
  assert.ok(left>mid&&mid>right,'SAMPLING_BOUND_MONOTONICITY_CHANGED');
  assert.ok(approx(mid,receipt.tenCylinderEndMomentZRotationalComplianceRadPerNm),
    'SAMPLING_MIDPOINT_OWN_CANDIDATE_COMPLIANCE_CHANGED');
  const prismatic=receipt.nativeEndMomentZRotationalComplianceRadPerNm;
  assert.ok(approx(prismatic,L/(E*I1)),'SOURCE_PRISMATIC_BENDING_BASIS_CHANGED');
  return {
    schema:'lfea-e75-ten-cylinder-section-sampling-sensitivity/v1',
    status:'SECTION_SAMPLING_ENVELOPE_RESEARCH_ONLY_NO_CAESAR_STATION_AUTHORITY',
    sourceE75LengthM:L,
    sourceFromI_m4:I1,
    sourceToI_m4:I2,
    segmentCount:10,
    interpolationAssumption:'OD_AND_WALL_THICKNESS_LINEAR_ALONG_DECLARED_SOURCE_AXIS',
    sourceRuleForActualCaesarSamplingIdentified:false,
    tenCylinderKnownCountFromDocumentation:10,
    candidateMidpointOnlyWasFullSystemSolved:true,
    hypotheticalBoundary:'E75_FIXED_FROM_END_UNIT_MOMENT_FREE_TO_END',
    stations,
    leftToRightComplianceRatio:left/right,
    midpointVsLeftPercent:(mid/left-1)*100,
    midpointVsRightPercent:(mid/right-1)*100,
    candidateMidpointToNativeUniformComplianceRatio:mid/prismatic,
    supportCoupledLeftAndRightScenariosWereSolved:false,
    originalCaesarOrSourceRulesChanged:false,
    productionMechanicsPromoted:false,
  };
}
function extractModelValue(scenario,group,node,component){
  const raw=scenario.sourceNeighborhoodNodes[node];
  assert.ok(raw,'W_NEIGHBOR_MODEL_NODE_MISSING:'+node);
  const translation=group.id==='NEIGHBOR_TRANSLATION';
  const rotation=group.id==='NEIGHBOR_ROTATION';
  if(translation||rotation){
    const values=translation?raw.displacementGlobalM:raw.rotationGlobalRad;
    const index=(translation?['UX','UY','UZ']:['RX','RY','RZ']).indexOf(component);
    assert.ok(index>=0&&Array.isArray(values)&&values.length===3);
    return finite(values[index],node+':'+component);
  }
  const reactions=scenario.downstreamSourceSupportReactions[node];
  assert.ok(Array.isArray(reactions),'W_NEIGHBOR_REACTIONS_MISSING:'+node);
  const matchingDof=({
    FX:'UX',FY:'UY',FZ:'UZ',MX:'RX',MY:'RY',MZ:'RZ',
  })[component];
  const values=reactions.filter(x=>x.dof===matchingDof);
  // The production original comparator uses zero-filled restrained nodes,
  // never fabricate a nonzero free-DOF force. If two physical contributions
  // target the same DOF their net source-node reaction is the sum.
  return values.reduce((s,x)=>s+finite(x.value,node+':'+component),0);
}
function referenceRow(report,sourceGroup,node,component){
  const caseRecord=report.qualification?.cases?.find(x=>x.caseId==='L2');
  assert.ok(caseRecord,'BM4L_REFERENCE_L2_REQUIRED');
  const rows=caseRecord.comparison?.rows?.filter(row=>
    row.entityKind==='NODE' && String(row.entityId)===node
      && row.quantity===sourceGroup.quantity && row.component===component)??[];
  assert.equal(rows.length,1,'BM4L_REFERENCE_ROW_DUPLICATED_OR_MISSING:'+
    sourceGroup.quantity+':'+node+':'+component);
  const row=rows[0];
  assert.ok(['PASS','FAIL'].includes(row.status),'BM4L_REFERENCE_ROW_UNSCORABLE');
  return row;
}
export function auditE75WNeighborhood(experiment,report,receipt){
  assert.equal(experiment.schema,'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1');
  assert.equal(report.schema,'lfea-caesar-accdb-benchmark-report/v1');
  assert.equal(report.source?.sha256,SHA,'BM4L_W_NEIGHBOR_SOURCE_SHA_MISMATCH');
  assert.equal(experiment.benchmarkId,'BM4_L');
  assert.equal(experiment.nativeElementId,'IXP.E75');
  assert.equal(experiment.physicalCaseId,'IXP-W');
  assert.equal(experiment.originalProductionExecutionNumericallyReproduced,true);
  assert.equal(experiment.onlyE75ContributionVaried,true);
  assert.equal(experiment.productionReducerRemainsPrismatic,true);
  assert.equal(experiment.pressureBearingCandidateNotEvaluated,true);
  assert.equal(experiment.noAlternativeAssemblyPassedProductionPreflight,true);
  assert.deepEqual(experiment.scenarios.map(x=>x.scenarioId),EXPERIMENT_IDS);
  const caseRecords=COMPARISON_GROUPS.map(group=>{
    const records=[];
    for(const nodeId of group.nodes){
      for(const component of group.components){
        const row=referenceRow(report,group,nodeId,component);
        const referenceValue=finite(row.referenceValue,'SOURCE_REF');
        const actualValue=finite(row.actualValue,'SOURCE_ORIGINAL_ACTUAL');
        const all=experiment.scenarios.map(s=>{
          const value=extractModelValue(s,group,nodeId,component);
          return {scenarioId:s.scenarioId,value,
            deltaFromNative:value-actualValue,
            signedDifferenceToOriginalCaesar:value-referenceValue,
            originalCaesarReferenceNotCounterfactual:true};
        });
        compareActual(all[0].value,actualValue,
          'L2:'+group.quantity+':'+nodeId+':'+component);
        records.push({
          sourceNodeId:nodeId,quantity:group.quantity,component,unit:group.unit,
          originalCaesarValue:referenceValue,
          originalProductionValue:actualValue,
          originalComparatorStatus:row.status,
          scenarioResults:all,
        });
      }
    }
    const baselineErrors=records.map(row=>
      Math.abs(row.originalProductionValue-row.originalCaesarValue));
    const summary=EXPERIMENT_IDS.map((scenarioId,index)=>{
      const errors=records.map(row=>Math.abs(
        row.scenarioResults[index].signedDifferenceToOriginalCaesar));
      const changes=errors.map((e,i)=>e-baselineErrors[i]);
      const deltas=records.map(row=>row.scenarioResults[index].deltaFromNative);
      return {
        scenarioId,
        sourceRowCount:records.length,
        baselineOriginalComparatorFailCount:
          records.filter(row=>row.originalComparatorStatus==='FAIL').length,
        totalAbsoluteDifferenceToOriginalCaesar:
          errors.reduce((sum,v)=>sum+v,0),
        worstAbsoluteDifferenceToOriginalCaesar:Math.max(...errors),
        changeInTotalAbsoluteDifferenceFromNative:
          changes.reduce((sum,v)=>sum+v,0),
        improvedComponentCount:changes.filter(v=>v<0).length,
        worsenedComponentCount:changes.filter(v=>v>0).length,
        exactlyUnchangedComponentCount:changes.filter(v=>v===0).length,
        largestAbsoluteChangeFromNative:Math.max(...deltas.map(Math.abs)),
        sourceCaesarParityCertificationGranted:false,
      };
    });
    assert.equal(records.length,group.nodes.length*group.components.length);
    return {
      comparisonGroupId:group.id,physicalQuantity:group.quantity,unit:group.unit,
      sourceNodeIds:group.nodes,sourceComponents:group.components,
      comparatorToleranceRetained:true,
      records,summary,
    };
  });
  return {
    schema:'lfea-bm4l-e75-w-neighborhood-and-sampling-audit/v1',
    status:'ORIGINAL_CAESAR_L2_NEIGHBOR_EVIDENCE_VS_UNQUALIFIED_W_COUNTERFACTUALS',
    benchmarkId:'BM4_L',
    originalAccdbSha256:SHA,
    productionWCaseId:'IXP-W',
    originalCaesarCaseId:'L2',
    researchCounterfactuals:EXPERIMENT_IDS,
    baselineOriginalComparatorRowsReconciled:true,
    sourceNeighborNodes:SOURCE_NODES,
    downstreamSupportNodes:SUPPORT_NODES,
    comparisonGroups:caseRecords,
    sectionSamplingBounds:calculateSectionSamplingBounds(receipt),
    comparatorStatusesOnlyOriginalProduction:true,
    hypotheticalModelsNotSourceValidated:true,
    hypotheticalElementActionsNotCompared:true,
    noRealCandidateCaesarSourceCaseAvailable:true,
    noProductionMechanicsOrTolerancesChanged:true,
    releaseAuthorized:false,
  };
}
function synthetic(){
  const r={
    schema:'lfea-bm4l-e75-weight-bending-compliance-forensic/v1',
    elementId:'IXP.E75',productionReducerExactMechanics:false,condenserCandidateOnly:true,
    sourceFrameLengthM:0.1,elasticModulusPa:2e11,
    sourceSectionFrom:{outerDiameterM:0.1,wallThicknessM:0.008,
      I_m4:moment(0.1,0.008)},
    sourceSectionTo:{outerDiameterM:0.2,wallThicknessM:0.01,
      I_m4:moment(0.2,0.01)},
  };
  const left=Array.from({length:10},(_,i)=>{
    const f=(i+0.5)/10;
    return moment(0.1+f*0.1,0.008+f*0.002);
  });
  r.tenCylinderEndMomentZRotationalComplianceRadPerNm=
    left.reduce((a,I)=>a+0.01/(2e11*I),0);
  r.nativeEndMomentZRotationalComplianceRadPerNm=0.1/(2e11*moment(0.1,0.008));
  const b=calculateSectionSamplingBounds(r);
  assert.ok(b.stations.LEFT_ENDPOINT.isolatedCantileverEndMomentComplianceRadPerNm
    >b.stations.MIDPOINT.isolatedCantileverEndMomentComplianceRadPerNm);
  assert.ok(b.stations.MIDPOINT.isolatedCantileverEndMomentComplianceRadPerNm
    >b.stations.RIGHT_ENDPOINT.isolatedCantileverEndMomentComplianceRadPerNm);
  assert.throws(()=>calculateSectionSamplingBounds({...r,
    tenCylinderEndMomentZRotationalComplianceRadPerNm:-10}),
  /SAMPLING_MIDPOINT_OWN_CANDIDATE_COMPLIANCE_CHANGED/);
  assert.throws(()=>calculateSectionSamplingBounds({...r,
    sourceSectionTo:{...r.sourceSectionTo,wallThicknessM:0.002}}),
  /SAMPLING_BOUND_MONOTONICITY_CHANGED|SAMPLING_SECTION_NOT_POSITIVE|SAMPLING_/);
  console.log('BM4L_E75_NEIGHBOR_SAMPLING_NEGATIVE_CONTROLS PASS');
}
function main(argv){
  if(argv.length===1&&argv[0]==='--self-test'){synthetic();return;}
  assert.equal(argv.length,8,'Use --experiment --full-report --weight-bending --out');
  assert.deepEqual(argv.filter((_,i)=>i%2===0),
    ['--experiment','--full-report','--weight-bending','--out']);
  const read=idx=>JSON.parse(readFileSync(resolve(argv[idx]),'utf8'));
  const audit=auditE75WNeighborhood(read(1),read(3),read(5));
  const out=resolve(argv[7]);mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(audit,null,2)+'\n');
  console.log('BM4L_E75_W_NEIGHBORHOOD '+JSON.stringify({
    status:audit.status,
    sections:audit.comparisonGroups.map(g=>({
      quantity:g.physicalQuantity,
      unit:g.unit,
      originalBaselineFailed:g.summary[0].baselineOriginalComparatorFailCount,
      sourceRows:g.records.length,
      totalAbsoluteSourceErrorByScenario:g.summary.map(x=>({
        scenario:x.scenarioId,total:x.totalAbsoluteDifferenceToOriginalCaesar,
        improved:x.improvedComponentCount,worsened:x.worsenedComponentCount,
        maxDeltaFromNative:x.largestAbsoluteChangeFromNative,
      })),
    })),
    midpointMomentComplianceRadPerNm:
      audit.sectionSamplingBounds.stations.MIDPOINT.isolatedCantileverEndMomentComplianceRadPerNm,
    leftMomentComplianceRadPerNm:
      audit.sectionSamplingBounds.stations.LEFT_ENDPOINT.isolatedCantileverEndMomentComplianceRadPerNm,
    rightMomentComplianceRadPerNm:
      audit.sectionSamplingBounds.stations.RIGHT_ENDPOINT.isolatedCantileverEndMomentComplianceRadPerNm,
    originalCaesarTenCylinderSamplingNotQualified:true,
    engineeringRelease:false,
  }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv.slice(2));
