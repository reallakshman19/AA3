#!/usr/bin/env node
/**
 * Project the exact CAESAR/reference and native 22100->22110 rotation increments
 * into the *same* E75 source-bound local triad; not a stiffness calibration.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SOURCE_SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const NODE_I = '22100', NODE_J = '22110';
const CASES = ['L2','L5','L6'];
const COMPONENTS = ['RX','RY','RZ'];

const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const add = (a,b) => a.map((v,i)=>v+b[i]);
const scale = (a,k) => a.map((v)=>k*v);
const norm = (a) => Math.hypot(...a);
const toLocal = (global,axes) => [dot(axes.x,global),dot(axes.y,global),dot(axes.z,global)];
const backToGlobal = (local,axes) => add(add(scale(axes.x,local[0]),scale(axes.y,local[1])),scale(axes.z,local[2]));
const rel = (a,b) => norm(sub(a,b))/Math.max(1,norm(a),norm(b));

export function measureE75LocalRotations(report, evidence) {
  assert.equal(report.schema,'lfea-caesar-accdb-benchmark-report/v1');
  assert.equal(report.source?.sha256,SOURCE_SHA,'E75_CAESAR_REPORT_SOURCE_MISMATCH');
  assert.equal(evidence.schema,'lfea-bm4l-native-e75-reducer-assembly-forensic/v1');
  assert.equal(evidence.sourceSegmentId,'ACCDB.E75');
  assert.equal(evidence.currentProductionReducerExactMechanics,false);
  assert.equal(evidence.counterfactualReducerExactMechanics,true);
  assert.equal(evidence.sourceReferenceCaesarParityReSolvedWithCandidate,false);
  const axes=evidence.sourceElementLocalAxis;
  const unit = ['x','y','z'].map((key)=>axes[key]);
  for (let a=0;a<3;a++) {
    assert.equal(unit[a].length,3);
    assert.ok(Math.abs(norm(unit[a])-1)<1e-10,`E75_AXIS_NOT_UNIT_${a}`);
    for (let b=a+1;b<3;b++)
      assert.ok(Math.abs(dot(unit[a],unit[b]))<1e-10,`E75_AXES_NOT_ORTHOGONAL_${a}_${b}`);
  }
  const records=CASES.map((caseId)=>{
    const cmp=report.qualification?.cases?.find((row)=>row.caseId===caseId);
    assert.ok(cmp,`E75_MISSING_CASE_${caseId}`);
    const get=(nodeId,which)=>{
      const vec=[];
      for (const component of COMPONENTS) {
        const rows=cmp.comparison?.rows?.filter((row)=>
          row.entityKind==='NODE' && String(row.entityId)===nodeId
          && row.quantity==='ROTATION' && row.component===component);
        assert.equal(rows?.length,1,`E75_SOURCE_ROTATION_MISSING_OR_DUPLICATE:${caseId}:${nodeId}:${component}`);
        const v=Number(rows[0][which]);
        assert.ok(Number.isFinite(v),`E75_NONFINITE_ROTATION:${caseId}:${nodeId}:${component}`);
        vec.push(v);
      }
      return vec;
    };
    const referenceFrom=get(NODE_I,'referenceValue');
    const referenceTo=get(NODE_J,'referenceValue');
    const productionFrom=get(NODE_I,'actualValue');
    const productionTo=get(NODE_J,'actualValue');
    const referenceGlobalIncrement=sub(referenceTo,referenceFrom);
    const productionGlobalIncrement=sub(productionTo,productionFrom);
    const globalIncrementDiscrepancy=sub(productionGlobalIncrement,referenceGlobalIncrement);
    const referenceLocalIncrement=toLocal(referenceGlobalIncrement,axes);
    const productionLocalIncrement=toLocal(productionGlobalIncrement,axes);
    const localIncrementDiscrepancy=toLocal(globalIncrementDiscrepancy,axes);
    assert.ok(rel(backToGlobal(referenceLocalIncrement,axes),referenceGlobalIncrement)<1e-12);
    assert.ok(rel(backToGlobal(productionLocalIncrement,axes),productionGlobalIncrement)<1e-12);
    assert.ok(rel(backToGlobal(localIncrementDiscrepancy,axes),globalIncrementDiscrepancy)<1e-12);
    assert.ok(rel(sub(productionLocalIncrement,referenceLocalIncrement),localIncrementDiscrepancy)<1e-12);
    const a=localIncrementDiscrepancy;
    const bendingMagnitude=Math.hypot(a[1],a[2]);
    const axialMagnitude=Math.abs(a[0]);
    const byLocalComponent={RX_AXIAL:a[0],RY_TRANSVERSE:a[1],RZ_TRANSVERSE:a[2]};
    return {
      caseId, fromNode:NODE_I,toNode:NODE_J,
      referenceGlobalIncrementRad,
      productionGlobalIncrementRad,
      signedGlobalIncrementDiscrepancyRad:globalIncrementDiscrepancy,
      referenceLocalIncrementRad:referenceLocalIncrement,
      productionLocalIncrementRad:productionLocalIncrement,
      signedLocalIncrementDiscrepancyRad:localIncrementDiscrepancy,
      byLocalComponent,
      localAxialDiscrepancyMagnitudeRad:axialMagnitude,
      localTransverseDiscrepancyMagnitudeRad:bendingMagnitude,
      transverseOverAxialMagnitude:axialMagnitude===0?null:bendingMagnitude/axialMagnitude,
      largerLocalTransverseComponent:Math.abs(a[1])>=Math.abs(a[2])?'LOCAL_RY':'LOCAL_RZ',
      globalReconstructionDifference:rel(backToGlobal(a,axes),globalIncrementDiscrepancy),
    };
  });
  return {
    schema:'lfea-bm4l-e75-rotation-basis-parity-diagnostic/v1',
    status:'MEASURED_SOURCE_LOCAL_ROTATIONS_NOT_MECHANICS_QUALIFICATION',
    sourceAccdbSha256:SOURCE_SHA,
    elementId:evidence.elementId,
    sourceSegmentId:evidence.sourceSegmentId,
    localAxes:axes,
    sourceEndNodes:[NODE_I,NODE_J],
    sourceModelAxisNotInferred:true,
    activeProductionReducerExactMechanics:false,
    candidateWholeModelCaesarParityRun:false,
    tolerancesModified:false,
    cases:records,
  };
}
function selfTest() {
  const a={x:[0,0,-1],y:[1,0,0],z:[0,-1,0]};
  const global=[7,-2,5],local=toLocal(global,a);
  assert.deepEqual(local,[ -5,7,2 ]);
  assert.ok(norm(sub(backToGlobal(local,a),global))<1e-14);
  assert.throws(()=>measureE75LocalRotations({},{}),/lfea-caesar-accdb-benchmark-report\/v1/);
  console.log('E75 local-global rotation projection negative controls PASS');
}
function main(args){
  if(args.length===1&&args[0]==='--self-test'){selfTest();return;}
  const opts=new Map();
  for(let i=0;i<args.length;i+=2){
    assert.ok(['--full-report','--matrix-evidence','--out'].includes(args[i])&&args[i+1],
      'Expected --full-report --matrix-evidence --out');
    opts.set(args[i],args[i+1]);
  }
  for(const key of ['--full-report','--matrix-evidence','--out'])assert.ok(opts.has(key));
  const read=(key)=>JSON.parse(readFileSync(resolve(opts.get(key)),'utf8'));
  const result=measureE75LocalRotations(read('--full-report'),read('--matrix-evidence'));
  const dest=resolve(opts.get('--out'));mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,JSON.stringify(result,null,2)+'\n','utf8');
  for(const row of result.cases)console.log('BM4L_E75_LOCAL_ROTATION '+JSON.stringify({
    caseId:row.caseId, localAxisX:result.localAxes.x,
    globalIncrementDiscrepancyRad:row.signedGlobalIncrementDiscrepancyRad,
    localIncrementDiscrepancyRad:row.signedLocalIncrementDiscrepancyRad,
    localTransverseMagnitudeRad:row.localTransverseDiscrepancyMagnitudeRad,
    localAxialMagnitudeRad:row.localAxialDiscrepancyMagnitudeRad,
    largerTransverseComponent:row.largerLocalTransverseComponent,
    reconstructionResidual:row.globalReconstructionDifference,
    mechanicsQualified:false,
  }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv.slice(2));
