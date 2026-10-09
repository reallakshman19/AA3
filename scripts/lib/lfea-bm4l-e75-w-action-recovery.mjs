import assert from 'node:assert/strict';
import { gatherJointDisplacement12, recoverElementEndAction }
  from '../../src/core/linear-fea-result-recovery/element-end-actions.js';

const SOURCE_ELEMENTS=['74','75','76','77','78','79','80'];
const DOFS=['UX','UY','UZ','RX','RY','RZ'];
const COMPONENTS=['FX','FY','FZ','MX','MY','MZ'];
const norm=(v)=>Math.hypot(...v);
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
const ensure=(v,label)=>{
  assert.ok(typeof v==='number'&&Number.isFinite(v),label+' must be finite');
  return v;
};
const near=(x,y,tol=1e-7)=>
  Math.abs(x-y)<=tol*Math.max(1,Math.abs(x),Math.abs(y));

function globalEndAction(contribution,displacement12) {
  const {globalStiffness:K,equivalentLoadGlobal:F,
    initialStrainLoadGlobal:thermal}=contribution;
  assert.equal(K.length,144);assert.equal(F.length,12);
  assert.equal(thermal.length,12);
  return Array.from({length:12},(_,i)=>
    ensure(Array.from({length:12},(_,j)=>K[12*i+j]*displacement12[j])
      .reduce((a,b)=>a+b,0)-F[i]-thermal[i],'GLOBAL_END_ACTION'));
}
/**
 * Exact global joint-on-element action for every W-only counterfactual.
 * Keep CAESAR parity/engineering scoring entirely outside this module.
 * Each native result is independently checked against B-3.4's full
 * frame-local recovery and its documented global transformation.
 */
export function computeWNeighborhoodEndActions({
  model,sourceBasicRows,segmentBindings,nativeElements,nativeFrames,
  candidateE75Frame,execution,e75Contribution
}){
  assert.ok(Array.isArray(sourceBasicRows)&&sourceBasicRows.length===96,
    'FULL_96_ORIGINAL_CAESAR_INPUT_ELEMENTS_REQUIRED');
  const elementById=new Map(model.elements.map(e=>[e.elementId,e]));
  const nativeById=new Map(nativeElements.map(e=>[e.elementId,e]));
  const frameById=new Map(nativeFrames.map(e=>[e.elementId,e]));
  assert.equal(candidateE75Frame.elementId,'IXP.E75');
  const disp=new Map(execution.displacement.map(x=>[
    x.nodeId+':'+x.dof,ensure(x.value,'DISPLACEMENT')
  ]));
  assert.equal(disp.size,execution.displacement.length);
  const rows=SOURCE_ELEMENTS.map(number=>{
    const raw=sourceBasicRows.filter(x=>String(x.ELEMENTID)===number);
    assert.equal(raw.length,1,'SOURCE_ELEMENT_NAME_AMBIGUOUS:'+number);
    const sourceId='ACCDB.E'+number;
    const binds=segmentBindings.filter(x=>String(x.sourceSegmentId)===sourceId);
    assert.equal(binds.length,1,'SOURCE_CHAIN_SINGLE_SPAN_REQUIRED:'+number);
    const id=binds[0].elementId;
    assert.equal(id,'IXP.E'+number,'UNEXPECTED_NAMED_SOURCE_ELEMENT_BINDING');
    const originalElement=elementById.get(id);
    const original=nativeById.get(id);
    const originalFrame=frameById.get(id);
    assert.ok(originalElement&&original&&originalFrame,
      'ORIGINAL_BARE_FRAME_REQUIRED:'+number);
    const used=id==='IXP.E75'?e75Contribution:original;
    const rawI=String(raw[0].FROM_NODE),rawJ=String(raw[0].TO_NODE);
    assert.equal(originalElement.nodeI,'IXP.N'+rawI);
    assert.equal(originalElement.nodeJ,'IXP.N'+rawJ);
    const joint=gatherJointDisplacement12(disp,originalElement.nodeI,originalElement.nodeJ);
    const q=globalEndAction(used,joint);
    // Baseline action is recomputed from the native sealed frame's local K
    // and its B-3.1 vectors, independently of the assembly-level global K.
    const nativeRebuild=recoverElementEndAction({
      frameElementRecord:originalFrame,
      effectiveLocalStiffness:originalFrame.localStiffness,
      jointDisplacement12:joint,
    }).qGlobal;
    if(id!=='IXP.E75'){
      const error=norm(diff(q,nativeRebuild));
      const scale=Math.max(1,norm(q),norm(nativeRebuild));
      assert.ok(error/scale<1e-7,
        'NON_E75_INDEPENDENT_ACTION_RECOVERY_DRIFT:'+number+':'+error);
    }
    if(id==='IXP.E75'&&used===original){
      const error=norm(diff(q,nativeRebuild));
      const scale=Math.max(1,norm(q),norm(nativeRebuild));
      assert.ok(error/scale<1e-7,
        'E75_BASELINE_INDEPENDENT_ACTION_RECOVERY_DRIFT');
    }
    if(id==='IXP.E75'&&used.globalStiffness===candidateE75Frame.globalStiffness){
      // In mixed stiffness/original gravity studies no single candidate frame
      // is the complete load authority. Do not falsely use its recovered
      // vector in place of the counterfactual global Kd - applied F.
      assert.equal(e75Contribution,used);
    }
    const endAction=(offset)=>Object.fromEntries(
      COMPONENTS.map((key,i)=>[key,q[offset+i]]));
    return {
      sourceElementNumber:number,
      sourceSegmentId:sourceId,productionElementId:id,
      originalCaesarEntityId:`INPUT_ELEMENT:${number}|${rawI}->${rawJ}|${String(raw[0].ELEMENT_NAME??'').trim()}`,
      sourceFromNode:rawI,sourceToNode:rawJ,
      actionConvention:'JOINT_ON_ELEMENT_GLOBAL_KD_MINUS_EQUIVALENT_AND_INITIAL_STRAIN',
      globalFrom:endAction(0),
      globalTo:endAction(6),
      globalVector12:q,
      independentlyRecoveredProductionBareFrame:id==='IXP.E75'?used===original:true,
      originalSourceElementTopologyRetained:true,
    };
  });
  assert.equal(rows.length,7);
  assert.equal(new Set(rows.map(x=>x.originalCaesarEntityId)).size,7);
  return rows;
}
