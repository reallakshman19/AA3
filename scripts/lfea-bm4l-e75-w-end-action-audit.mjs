#!/usr/bin/env node
/**
 * E74–E80 W-case GLOBAL end action research audit: exact original source
 * baseline and unqualified E75 stiffness/gravity full-system perturbations.
 * No hypothetical scenario is a validated CAESAR II solve.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const SCENARIOS=[
  'BASELINE_AUTHORIZED_EQUIVALENT','E75_STIFFNESS_ONLY',
  'E75_GRAVITY_ONLY','E75_STIFFNESS_AND_GRAVITY',
];
const GROUPS=[
  {name:'GLOBAL_END_FORCE_FROM',action:'globalFrom',unit:'N',components:['FX','FY','FZ']},
  {name:'GLOBAL_END_MOMENT_FROM',action:'globalFrom',unit:'N*m',components:['MX','MY','MZ']},
  {name:'GLOBAL_END_FORCE_TO',action:'globalTo',unit:'N',components:['FX','FY','FZ']},
  {name:'GLOBAL_END_MOMENT_TO',action:'globalTo',unit:'N*m',components:['MX','MY','MZ']},
];
const mag=(a)=>Math.hypot(...a);
const num=(x,label)=>{assert.ok(typeof x==='number'&&Number.isFinite(x),
  'E75_W_ELEMENT_ACTION_NONFINITE:'+label);return x;};
const near=(a,b)=>Math.abs(a-b)<=5e-7*Math.max(1,Math.abs(a),Math.abs(b));
const compare=(a,b,label)=>assert.ok(near(a,b),
  'BASELINE_W_END_ACTION_NOT_RETAINED_PRODUCTION:'+label+':'+a+' vs '+b);
export function auditWSourceEndActions(experiment,report,topology){
  assert.equal(report.schema,'lfea-caesar-accdb-benchmark-report/v1');
  assert.equal(report.source?.sha256,SHA,'ORIGINAL_CAESAR_W_END_ACTION_SOURCE_SHA_MISMATCH');
  assert.equal(topology.schema,'lfea-bm4l-rx-source-topology-forensic/v1');
  assert.equal(topology.sourceAccdbSha256,SHA,'ORIGINAL_W_RESTRAINT_TOPOLOGY_SOURCE_SHA_MISMATCH');
  assert.equal(experiment.schema,'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1');
  assert.equal(experiment.nativeElementId,'IXP.E75');
  assert.equal(experiment.physicalCaseId,'IXP-W');
  assert.equal(experiment.originalProductionExecutionNumericallyReproduced,true);
  assert.equal(experiment.onlyE75ContributionVaried,true);
  assert.equal(experiment.productionReducerRemainsPrismatic,true);
  assert.equal(experiment.noAlternativeAssemblyPassedProductionPreflight,true);
  assert.deepEqual(experiment.scenarios.map(s=>s.scenarioId),SCENARIOS);
  const caesar=report.qualification.cases.find(x=>x.caseId==='L2');
  assert.ok(caesar,'ORIGINAL_CAESAR_L2_W_CASE_REQUIRED');
  const allRows=caesar.comparison.rows.filter(x=>x.entityKind==='ELEMENT');
  const records=GROUPS.map(group=>{
    const all=[];
    for(let j=0;j<7;j++){
      const number=String(74+j);
      const spans=experiment.scenarios.map(s=>
        s.sourceOriginalElementEndActions?.find(r=>r.sourceElementNumber===number));
      assert.ok(spans.every(Boolean),'MISSING_EXPERIMENTAL_END_ACTION_SOURCE_SPAN:'+number);
      const entityId=spans[0].originalCaesarEntityId;
      assert.ok(spans.every(s=>s.originalCaesarEntityId===entityId),
        'END_ACTION_SOURCE_ENTITY_CHANGED:'+number);
      for(const component of group.components){
        const matches=allRows.filter(x=>x.entityId===entityId
          && x.quantity===group.name&&x.component===component);
        assert.equal(matches.length,1,
          'ORIGINAL_CAESAR_ACTION_MISSING_OR_DUPLICATE:'+number+':'+group.name+':'+component);
        const row=matches[0];
        const ref=num(row.referenceValue,'reference');
        const actual=num(row.actualValue,'originalActual');
        assert.ok(['PASS','FAIL'].includes(row.status));
        const samples=spans.map((x,i)=>{
          const current=num(x[group.action][component],'scenario:'+number);
          if(i===0)compare(current,actual,entityId+':'+group.name+':'+component);
          return {
            scenarioId:SCENARIOS[i],value:current,
            deltaFromOriginalProduction:current-spans[0][group.action][component],
            signedDifferenceFromOriginalCaesar:current-ref,
            originalCaesarCaseWasNotAltered:true,
          };
        });
        all.push({
          sourceElementNumber:number,originalCaesarEntityId:entityId,
          quantity:group.name,component,unit:group.unit,
          originalCaesarReference:ref,originalProductionActual:actual,
          originalComparatorStatus:row.status,
          sourceElementWasOriginalAccdbInput:true,
          samples,
        });
      }
    }
    const baseline=all.map(x=>Math.abs(x.originalProductionActual-x.originalCaesarReference));
    const comparisons=SCENARIOS.map((scenarioId,index)=>{
      const err=all.map(x=>Math.abs(x.samples[index].signedDifferenceFromOriginalCaesar));
      const change=err.map((e,i)=>e-baseline[i]);
      const sourceE75=all.filter(x=>x.sourceElementNumber==='75');
      return {
        scenarioId,comparedOriginalSourceComponents:all.length,
        baselineOriginalComparatorFailCount:all.filter(x=>x.originalComparatorStatus==='FAIL').length,
        absoluteErrorSumOriginalCaesarUnits:err.reduce((a,b)=>a+b,0),
        worstAbsoluteErrorOriginalCaesarUnits:Math.max(...err),
        componentsImprovedOverOriginalNative:change.filter(x=>x<0).length,
        componentsWorsenedOverOriginalNative:change.filter(x=>x>0).length,
        componentsNumericallyUnchanged:change.filter(x=>x===0).length,
        E75OriginalCaesarAbsoluteErrorSum:sourceE75.reduce((s,r)=>s+
          Math.abs(r.samples[index].signedDifferenceFromOriginalCaesar),0),
        originalCaesarParityStatusNotRegraded:true,
      };
    });
    assert.equal(all.length,21);
    return {name:group.name,unit:group.unit,originalCaseId:'L2',
      exactOriginalRowsValidated:true,
      originalAcceptanceRuleNotEvaluatedOnHypotheticals:true,
      records:all,comparisons};
  });
  const nodes=['22120','22140'];
  const reactions=nodes.map(nodeId=>{
    const source=topology.nodes.find(n=>n.nodeId===nodeId);
    assert.ok(source,'SOURCE_NODE_NOT_IN_TOPOLOGY:'+nodeId);
    const original=caesar.comparison.rows.filter(r=>
      r.entityKind==='NODE'&&String(r.entityId)===nodeId
      &&['FORCE','MOMENT'].includes(r.quantity));
    assert.equal(original.length,6,
      'ORIGINAL_L2_SOURCE_REACTION_SIX_COMPONENT_COVERAGE_REQUIRED:'+nodeId);
    const reactions=Object.fromEntries(['FORCE','MOMENT'].map(quantity=>{
      const dos=quantity==='FORCE'?['UX','UY','UZ']:['RX','RY','RZ'];
      const rows=dos.map(component=>{
        const lookup=original.filter(x=>x.quantity===quantity&&x.component===component);
        assert.equal(lookup.length,1,
          'ORIGINAL_REACTION_DOF_LABEL_MISSING_OR_DUPLICATE:'+nodeId+':'+component);
        const row=lookup[0];
        const actual=num(row.actualValue,'SOURCE_REACTION_ACTUAL');
        const ref=num(row.referenceValue,'SOURCE_REACTION_REFERENCE');
        const alternative=experiment.scenarios.map(s=>{
          const originalEntries=s.downstreamSourceSupportReactions[nodeId];
          assert.ok(Array.isArray(originalEntries),'RESEARCH_SUPPORT_REACTIONS_REQUIRED');
          const prediction=originalEntries.filter(x=>x.dof===component)
            .reduce((sum,x)=>sum+num(x.value,'SUPPORT_REACTION'),0);
          if(s.scenarioId==='BASELINE_AUTHORIZED_EQUIVALENT')
            compare(prediction,actual,'SUPPORT:'+nodeId+':'+quantity+':'+component);
          return {scenarioId:s.scenarioId,value:prediction,
            signedDifferenceFromOriginalCaesar:prediction-ref,
            originalSourceReferenceNotCounterfactual:true};
        });
        return {component,originalSourceReference:ref,
          originalProductionActual:actual,
          originalComparatorStatus:row.status,
          originalSourceComponentIsDofName:true,
          experiments:alternative};
      });
      return [quantity,rows];
    }));
    return {
      sourceNodeId:nodeId,
      originalAccdbRestraintRowCount:source.sourceRestraintRows.length,
      originalAccdbRestraintRows:source.sourceRestraintRows,
      originalCaesarL2ForceMomentReferenceRowCount:original.length,
      originalCaesarReferenceReactionsPresent:true,
      originalCaesarReferenceValuesMappedByDofNames:true,
      originalSourceReactionComponents:reactions,
    };
  });
  assert.ok(reactions.every(x=>x.originalAccdbRestraintRowCount>0),
    'SOURCE_RESTRAINT_INPUT_MISSING_AT_NAMED_DOWNSTREAM_NODE');
  return {
    schema:'lfea-bm4l-e75-w-original-source-element-end-action-custody/v1',
    status:'ORIGINAL_L2_SEVEN_ELEMENT_END_ACTIONS_COMPARED_HYPOTHETICALS_NOT_VALIDATED',
    originalAccdbSha256:SHA,
    sourceInputElementNumbers:['74','75','76','77','78','79','80'],
    originalCaesarCaseId:'L2',
    experimentalLfeaCaseId:'IXP-W',
    expectedFourScenarios:SCENARIOS,
    sourceComparisonGroups:records,
    originalFullBaselineElementActionsRecoveredFromKTimesUminusF:true,
    originalBaselineIndependentlyVerifiedAgainstNativeFrameRecovery:true,
    originalCaesarReferenceNotRecomputedForAlternatives:true,
    recoveredOriginalCaesar22120And22140SupportReactions:reactions,
    originalSourceRestraintsAndCaesarOutputReactionRowsPresent:true,
    originalL2ComparatorReactionsLabelForcesWithUXAndMomentsWithRX:true,
    originalNumericalAcceptanceNeverChanged:true,
    sourceCylinderSamplingAndPressureBasisStillUnqualified:true,
    noProductionReducerPromotion:true,
  };
}
function selfTest(){
  const original={
    schema:'lfea-bm4l-e75-w-only-whole-system-counterfactual/v1',
    nativeElementId:'IXP.E75',physicalCaseId:'IXP-W',
    originalProductionExecutionNumericallyReproduced:true,
    onlyE75ContributionVaried:true,productionReducerRemainsPrismatic:true,
    noAlternativeAssemblyPassedProductionPreflight:true,
    scenarios:SCENARIOS.map(scenarioId=>({
      scenarioId,sourceOriginalElementEndActions:Array.from({length:7},(_,i)=>{
        const id=String(i+74);return {
          sourceElementNumber:id,originalCaesarEntityId:'INPUT_ELEMENT:'+id+'|x->y|',
          globalFrom:{FX:1,FY:2,FZ:3,MX:4,MY:5,MZ:6},
          globalTo:{FX:-1,FY:-2,FZ:-3,MX:-4,MY:-5,MZ:-6},
        };
      }),downstreamSourceSupportReactions:{'22120':[],'22140':[]},
    })),
  };
  const rows=[];
  for(let i=74;i<=80;i++){
    for(const g of GROUPS)for(const c of g.components)rows.push({
      entityKind:'ELEMENT',entityId:'INPUT_ELEMENT:'+i+'|x->y|',
      quantity:g.name,component:c,referenceValue:1,
      actualValue:original.scenarios[0].sourceOriginalElementEndActions[i-74][g.action][c],
      status:'PASS',
    });
  }
  for(const nodeId of ['22120','22140']){
    for(const quantity of ['FORCE','MOMENT']){
      for(const component of quantity==='FORCE'?['UX','UY','UZ']:['RX','RY','RZ']){
        rows.push({entityKind:'NODE',entityId:nodeId,quantity,component,
          referenceValue:0,actualValue:0,status:'PASS'});
      }
    }
  }
  const report={schema:'lfea-caesar-accdb-benchmark-report/v1',source:{sha256:SHA},
    qualification:{cases:[{caseId:'L2',comparison:{rows}}]}};
  const topology={schema:'lfea-bm4l-rx-source-topology-forensic/v1',
    sourceAccdbSha256:SHA,
    nodes:['22120','22140'].map(nodeId=>({nodeId,sourceRestraintRows:[{NODE:nodeId}]}))};
  const out=auditWSourceEndActions(original,report,topology);
  assert.equal(out.sourceComparisonGroups.length,4);
  assert.ok(out.sourceComparisonGroups.every(x=>x.records.length===21));
  assert.equal(out.recoveredOriginalCaesar22120And22140SupportReactions.length,2);
  assert.ok(out.recoveredOriginalCaesar22120And22140SupportReactions
    .every(r=>r.originalCaesarL2ForceMomentReferenceRowCount===6));
  assert.throws(()=>auditWSourceEndActions(original,{
    ...report,source:{sha256:'BAD'},
  },topology),/ORIGINAL_CAESAR_W_END_ACTION_SOURCE_SHA_MISMATCH/);
  const modified=structuredClone(original);
  modified.scenarios[0].sourceOriginalElementEndActions[1].globalFrom.FX+=10;
  assert.throws(()=>auditWSourceEndActions(modified,report,topology),
    /BASELINE_W_END_ACTION_NOT_RETAINED_PRODUCTION/);
  const deleted=structuredClone(report);
  deleted.qualification.cases[0].comparison.rows.splice(0,1);
  assert.throws(()=>auditWSourceEndActions(original,deleted,topology),
    /ORIGINAL_CAESAR_ACTION_MISSING_OR_DUPLICATE/);
  console.log('BM4L_E75_W_END_ACTION_NEGATIVE_CONTROLS PASS');
}
function main(args){
  if(args.length===1&&args[0]==='--self-test'){selfTest();return;}
  assert.equal(args.length,8);
  assert.deepEqual(args.filter((_,i)=>i%2===0),
    ['--experiment','--full-report','--source-topology','--out']);
  const input=i=>JSON.parse(readFileSync(resolve(args[i]),'utf8'));
  const result=auditWSourceEndActions(input(1),input(3),input(5));
  const dest=resolve(args[7]);mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
  console.log('BM4L_E75_W_END_ACTION_AUDIT '+JSON.stringify({
    status:result.status,
    groups:result.sourceComparisonGroups.map(g=>({
      type:g.name,unit:g.unit,
      originalRows:g.records.length,
      baselineOriginalFails:g.comparisons[0].baselineOriginalComparatorFailCount,
      scenarios:g.comparisons.map(x=>({
        id:x.scenarioId,absoluteErrorSum:x.absoluteErrorSumOriginalCaesarUnits,
        E75AbsoluteErrorSum:x.E75OriginalCaesarAbsoluteErrorSum,
        improved:x.componentsImprovedOverOriginalNative,
        worsened:x.componentsWorsenedOverOriginalNative,
      })),
    })),
    sourcedDownstreamReactions:result.recoveredOriginalCaesar22120And22140SupportReactions
      .map(x=>({nodeId:x.sourceNodeId,sourceRestraintRows:x.originalAccdbRestraintRowCount,
        sourceReactionRows:x.originalCaesarL2ForceMomentReferenceRowCount,
        originalCaseOriginalReferenceAndExperiments:x.originalSourceReactionComponents})),
    noOriginalCaseAcceptanceAltered:true,
    hypotheticalCaesarParityQualified:false,
  }));
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href)main(process.argv.slice(2));
