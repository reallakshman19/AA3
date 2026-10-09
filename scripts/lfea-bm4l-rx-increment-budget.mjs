#!/usr/bin/env node
/** Numeric forensic of repeated 221xx GLOBAL RX rotation differences.
 * Consume immutable full CAESAR comparison and raw source topology; do not
 * infer local torsional axes, change section mechanics, or promote results.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const PINNED_SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const CASES=['L2','L5','L6'];
const CHAIN_IDS=['75','76','77','78','79','80'];
const NODES=['22100','22110','22115','22120','22125','22130','22140'];

export function buildRxIncrementBudget(report, topology) {
  assert.equal(report.schema,'lfea-caesar-accdb-benchmark-report/v1');
  assert.equal(topology.schema,'lfea-bm4l-rx-source-topology-forensic/v1');
  assert.equal(report.source?.sha256,PINNED_SHA,'BM4L_RX_REPORT_SOURCE_UNVERIFIED');
  assert.equal(topology.sourceAccdbSha256,PINNED_SHA,'BM4L_RX_TOPOLOGY_SOURCE_UNVERIFIED');
  const elements = CHAIN_IDS.map((id) => {
    const element=topology.directSourceElements.find((entry)=>entry.id===id);
    assert.ok(element,`BM4L_RX_CHAIN_ELEMENT_MISSING:${id}`);
    assert.ok(NODES.includes(element.from)&&NODES.includes(element.to),
      `BM4L_RX_CHAIN_UNCONNECTED:${id}`);
    if (id==='75') assert.ok(element.reducerPointer>0,'BM4L_RX_EXPECTED_REDUCER_75');
    if (['76','77','78','79'].includes(id))
      assert.ok(element.rigidPointer>0,`BM4L_RX_EXPECTED_RIGID_${id}`);
    return {
      elementId:id,fromNode:element.from,toNode:element.to,
      classification:id==='75'?'REDUCER':element.rigidPointer>0?'RIGID':'STRAIGHT',
      sourceRigidPointer:element.rigidPointer,
      sourceReducerPointer:element.reducerPointer,
    };
  });
  const cases=CASES.map((caseId)=>{
    const record=report.qualification?.cases?.find((entry)=>entry.caseId===caseId);
    assert.ok(record,`BM4L_RX_COMPARATOR_CASE_MISSING:${caseId}`);
    const rotationRows=record.comparison?.rows?.filter((row)=>
      row.entityKind==='NODE'&&row.quantity==='ROTATION'&&row.component==='RX'
      &&NODES.includes(String(row.entityId)))??[];
    assert.equal(rotationRows.length,NODES.length,
      `BM4L_RX_ONE_ROTATION_PER_SOURCE_NODE_REQUIRED:${caseId}`);
    const rotations=Object.fromEntries(rotationRows.map((row)=>{
      const nodeId=String(row.entityId);
      const actual=Number(row.actualValue),ref=Number(row.referenceValue);
      assert.ok(Number.isFinite(actual)&&Number.isFinite(ref),
        `BM4L_RX_COMPARATOR_FINITE_VALUES_REQUIRED:${caseId}:${nodeId}`);
      assert.ok(['PASS','FAIL'].includes(row.status));
      return [nodeId,{
        sourceReferenceRad:ref,productionRad:actual,
        signedDifferenceRad:actual-ref,
        comparatorStatus:row.status,
      }];
    }));
    const increments=elements.map((element)=>{
      const from=rotations[element.fromNode],to=rotations[element.toNode];
      // A difference of GLOBAL RX between source endpoints. This alone is
      // NOT an element-local twist or a torsional stiffness diagnostic.
      const caesar=to.sourceReferenceRad-from.sourceReferenceRad;
      const prod=to.productionRad-from.productionRad;
      return {
        ...element,
        caesarGlobalRxIncrementRad:caesar,
        productionGlobalRxIncrementRad:prod,
        signedIncrementDiscrepancyRad:prod-caesar,
        absoluteIncrementDiscrepancyRad:Math.abs(prod-caesar),
      };
    });
    const ordered=[...increments].sort((a,b)=>
      b.absoluteIncrementDiscrepancyRad-a.absoluteIncrementDiscrepancyRad);
    return {
      caseId,
      sourceNodeGlobalRx:rotations,
      sourceSpanGlobalRxIncrementComparison:increments,
      largestSourceSpanGlobalRxIncrementMismatch:ordered[0],
      totalFrom22100To22140: {
        caesarGlobalRxIncrementRad:
          rotations['22140'].sourceReferenceRad-rotations['22100'].sourceReferenceRad,
        productionGlobalRxIncrementRad:
          rotations['22140'].productionRad-rotations['22100'].productionRad,
      },
    };
  });
  return {
    schema:'lfea-bm4l-source-rx-increment-budget/v1',
    status:'DIAGNOSTIC_GLOBAL_RX_DIFFERENCES_ONLY_NOT_TORSIONAL_MECHANICS_AUTHORITY',
    sourceAccdbSha256:PINNED_SHA,
    sourceSegments:elements,
    comparedCases:CASES,
    comparisonQuantity:'GLOBAL_NODAL_RX_ROTATION_RAD',
    localElementTorsionInferred:false,
    zeroReferenceAbsoluteToleranceRelaxed:false,
    numericalParityClaimed:false,
    cases,
  };
}
function main(argv){
  const args=new Map();
  for(let i=0;i<argv.length;i+=2){
    assert.ok(['--full-report','--topology','--out'].includes(argv[i])&&argv[i+1],
      'Expected --full-report <path> --topology <path> --out <path>');
    args.set(argv[i],argv[i+1]);
  }
  assert.ok(args.has('--full-report')&&args.has('--topology')&&args.has('--out'));
  const read=(key)=>JSON.parse(readFileSync(resolve(args.get(key)),'utf8'));
  const result=buildRxIncrementBudget(read('--full-report'),read('--topology'));
  const dst=resolve(args.get('--out')); mkdirSync(dirname(dst),{recursive:true});
  writeFileSync(dst,JSON.stringify(result,null,2)+'\n');
  for(const row of result.cases)
    console.log('BM4L_RX_INCREMENT_CASE '+JSON.stringify({
      caseId:row.caseId,
      sourceNodeGlobalRx:row.sourceNodeGlobalRx,
      spanIncrements:row.sourceSpanGlobalRxIncrementComparison.map((edge)=>({
        elementId:edge.elementId,classification:edge.classification,
        caesar:edge.caesarGlobalRxIncrementRad,
        production:edge.productionGlobalRxIncrementRad,
        discrepancy:edge.signedIncrementDiscrepancyRad,
      })),
      largestMismatch:row.largestSourceSpanGlobalRxIncrementMismatch,
      localElementTorsionInferred:false,
    }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
