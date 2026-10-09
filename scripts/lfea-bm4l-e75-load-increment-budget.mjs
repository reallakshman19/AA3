#!/usr/bin/env node
/**
 * Source-bound case-DIFFERENCE attribution for E75 signed local RX/RY/RZ
 * endpoint rotation increments. Differences of W, W+P and W+P+T can diagnose
 * pressure/thermal response differences but do NOT independently qualify
 * constituent mechanics or assume linear superposition in the CAESAR source.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const componentNames=['LOCAL_RX_AXIAL','LOCAL_RY_BENDING','LOCAL_RZ_BENDING'];
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const norm=(a)=>Math.hypot(...a);
const rel=(a,b)=>norm(subtract(a,b))/Math.max(1,norm(a),norm(b));
function vector(value,label) {
  assert.ok(Array.isArray(value)&&value.length===3,label+'_VECTOR_NOT_3');
  for(const v of value)assert.ok(typeof v==='number'&&Number.isFinite(v),
    label+'_VECTOR_NONFINITE');
  return value;
}
export function classifyE75SourceCaseDifferences(input){
  assert.equal(input.schema,'lfea-bm4l-e75-rotation-basis-parity-diagnostic/v1');
  assert.equal(input.sourceAccdbSha256,SHA,'E75_CASE_DIFFERENCES_SHA_MISMATCH');
  assert.equal(input.elementId,'IXP.E75');
  assert.equal(input.sourceSegmentId,'ACCDB.E75');
  assert.deepEqual(input.sourceEndNodes,['22100','22110']);
  assert.equal(input.activeProductionReducerExactMechanics,false);
  assert.equal(input.candidateWholeModelCaesarParityRun,false);
  assert.equal(input.tolerancesModified,false);
  const cases=input.cases;
  assert.ok(Array.isArray(cases)&&cases.length===3,'E75_EXPECTED_THREE_REFERENCE_CASES');
  const byCase=new Map(cases.map((r)=>[r.caseId,r]));
  assert.equal(byCase.size,3,'E75_DUPLICATE_CASES');
  for(const id of ['L2','L6','L5']){
    const row=byCase.get(id);
    assert.ok(row,'E75_REQUIRED_CAESAR_CASE_MISSING:'+id);
    assert.equal(row.fromNode,'22100');
    assert.equal(row.toNode,'22110');
    for(const [key,sourceKey] of [
      ['reference','referenceLocalIncrementRad'],
      ['production','productionLocalIncrementRad'],
      ['error','signedLocalIncrementDiscrepancyRad']]){
      vector(row[sourceKey],id+':'+key);
    }
    assert.ok(rel(subtract(row.productionLocalIncrementRad,row.referenceLocalIncrementRad),
      row.signedLocalIncrementDiscrepancyRad)<1e-12,
    'E75_ERROR_VECTOR_MUST_MATCH_MEASURED_REFERENCE_DIFFERENCE:'+id);
  }
  const project=(newCase,oldCase,label)=>{
    const newer=byCase.get(newCase),older=byCase.get(oldCase);
    const reference=subtract(newer.referenceLocalIncrementRad,older.referenceLocalIncrementRad);
    const native=subtract(newer.productionLocalIncrementRad,older.productionLocalIncrementRad);
    const mismatch=subtract(native,reference);
    const errorDifference=subtract(newer.signedLocalIncrementDiscrepancyRad,
      older.signedLocalIncrementDiscrepancyRad);
    assert.ok(rel(mismatch,errorDifference)<=1e-12,
      'E75_CASE_DIFFERENCE_DISCREPANCY_NOT_CONSERVED:'+label);
    const signedByComponent=Object.fromEntries(componentNames.map((key,i)=>
      [key,{sourceReferenceRad:reference[i],nativeProductionRad:native[i],
        signedDifferenceRad:mismatch[i]}]));
    return {
      label,
      subtrahendCaseId:oldCase,
      minuendCaseId:newCase,
      componentOrder:componentNames,
      sourceReferenceLocalRotationCaseDifferenceRad:reference,
      nativeProductionLocalRotationCaseDifferenceRad:native,
      signedLocalDiscrepancyCaseDifferenceRad:mismatch,
      localAxialMagnitudeRad:Math.abs(mismatch[0]),
      localTransverseMagnitudeRad:Math.hypot(mismatch[1],mismatch[2]),
      byComponent:signedByComponent,
      sourceCaseDifferenceIsIsolatedConstitutiveLoadProof:false,
    };
  };
  const weight=project('L2','L2','BASELINE_WEIGHT_CASE');
  const pressure=project('L6','L2','PRESSURE_CASE_DIFFERENCE_WP_MINUS_W');
  const thermal=project('L5','L6','TEMPERATURE_CASE_DIFFERENCE_WPT_MINUS_WP');
  // For the baseline, the actual W mismatch—not L2-L2 = 0—is retained.
  weight.signedLocalDiscrepancyCaseDifferenceRad=
    [...byCase.get('L2').signedLocalIncrementDiscrepancyRad];
  weight.sourceReferenceLocalRotationCaseDifferenceRad=
    [...byCase.get('L2').referenceLocalIncrementRad];
  weight.nativeProductionLocalRotationCaseDifferenceRad=
    [...byCase.get('L2').productionLocalIncrementRad];
  weight.localAxialMagnitudeRad=Math.abs(weight.signedLocalDiscrepancyCaseDifferenceRad[0]);
  weight.localTransverseMagnitudeRad=Math.hypot(
    weight.signedLocalDiscrepancyCaseDifferenceRad[1],
    weight.signedLocalDiscrepancyCaseDifferenceRad[2]);
  weight.byComponent=Object.fromEntries(componentNames.map((key,i)=>[
    key,{
      sourceReferenceRad:weight.sourceReferenceLocalRotationCaseDifferenceRad[i],
      nativeProductionRad:weight.nativeProductionLocalRotationCaseDifferenceRad[i],
      signedDifferenceRad:weight.signedLocalDiscrepancyCaseDifferenceRad[i],
    }]));
  weight.subtrahendCaseId=null;
  const reconstructed=weight.signedLocalDiscrepancyCaseDifferenceRad.map((v,i)=>
    v+pressure.signedLocalDiscrepancyCaseDifferenceRad[i]+
    thermal.signedLocalDiscrepancyCaseDifferenceRad[i]);
  assert.ok(rel(reconstructed,byCase.get('L5').signedLocalIncrementDiscrepancyRad)<1e-12,
    'E75_CASE_DIFFERENCE_TELESCOPING_IDENTITY_FAILED');
  return {
    schema:'lfea-bm4l-e75-source-local-load-case-rotation-attribution/v1',
    status:'CASE_DIFFERENCES_MEASURED_NOT_INDEPENDENT_MECHANICS_QUALIFICATION',
    sourceAccdbSha256:SHA,
    sourceElementId:'ACCDB.E75',
    localComponentOrder:componentNames,
    sourceEndNodes:['22100','22110'],
    sourceLocalAxes:input.localAxes,
    caseIdentity:{baseline:'L2=W',pressureIncrement:'L6=(W+P1)-W',
      thermalIncrement:'L5=(W+P1+T1)-(W+P1)'},
    weightBaseline:weight,
    pressureDifference:pressure,
    temperatureDifference:thermal,
    reconstructedL5LocalDiscrepancyRad:reconstructed,
    sourceCAESARAndProductionAreSeparateMeasurements:true,
    pressureAndThermalCasesQualifiedIndependently:false,
    materialStiffnessDefectAttributed:false,
    releaseOrNumericalParityClaimed:false,
    productionReducerMechanicsChanged:false,
  };
}
function selfTest(){
  const v=(x,y,z)=>[x,y,z];
  const mk=(caseId,source,production)=>({
    caseId,fromNode:'22100',toNode:'22110',
    referenceLocalIncrementRad:source,productionLocalIncrementRad:production,
    signedLocalIncrementDiscrepancyRad:subtract(production,source),
  });
  const base={
    schema:'lfea-bm4l-e75-rotation-basis-parity-diagnostic/v1',
    sourceAccdbSha256:SHA,elementId:'IXP.E75',sourceSegmentId:'ACCDB.E75',
    sourceEndNodes:['22100','22110'],activeProductionReducerExactMechanics:false,
    candidateWholeModelCaesarParityRun:false,tolerancesModified:false,
    localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},
    cases:[
      mk('L2',v(1,2,3),v(3,5,8)),
      mk('L6',v(4,2,5),v(9,5,12)),
      mk('L5',v(7,10,5),v(17,18,12)),
    ],
  };
  const r=classifyE75SourceCaseDifferences(base);
  assert.deepEqual(r.weightBaseline.signedLocalDiscrepancyCaseDifferenceRad,[2,3,5]);
  assert.deepEqual(r.pressureDifference.signedLocalDiscrepancyCaseDifferenceRad,[3,0,2]);
  assert.deepEqual(r.temperatureDifference.signedLocalDiscrepancyCaseDifferenceRad,[5,5,0]);
  assert.deepEqual(r.reconstructedL5LocalDiscrepancyRad,[10,8,7]);
  assert.throws(()=>classifyE75SourceCaseDifferences({
    ...base,sourceAccdbSha256:'not original',
  }),/E75_CASE_DIFFERENCES_SHA_MISMATCH/);
  assert.throws(()=>classifyE75SourceCaseDifferences({
    ...base,cases:[base.cases[0],base.cases[0],base.cases[2]],
  }),/E75_DUPLICATE_CASES/);
  const mutated=structuredClone(base);mutated.cases[1].signedLocalIncrementDiscrepancyRad[0]=123;
  assert.throws(()=>classifyE75SourceCaseDifferences(mutated),
    /E75_ERROR_VECTOR_MUST_MATCH_MEASURED_REFERENCE_DIFFERENCE/);
  console.log('BM4L_E75_CASE_DIFFERENCE_NEGATIVE_CONTROLS PASS');
}
function main(argv){
  if(argv.length===1&&argv[0]==='--self-test'){selfTest();return;}
  assert.equal(argv.length,4,'Use --rotation-budget <json> --out <json>');
  assert.equal(argv[0],'--rotation-budget');
  assert.equal(argv[2],'--out');
  const record=classifyE75SourceCaseDifferences(JSON.parse(readFileSync(resolve(argv[1]),'utf8')));
  const out=resolve(argv[3]);mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(record,null,2)+'\n','utf8');
  for(const key of ['weightBaseline','pressureDifference','temperatureDifference']){
    const v=record[key];
    console.log('BM4L_E75_CASE_DIFFERENCE '+JSON.stringify({
      label:v.label,
      signedLocalDiscrepancyMicrorad:v.signedLocalDiscrepancyCaseDifferenceRad.map(x=>x*1e6),
      referenceLocalIncrementMicrorad:v.sourceReferenceLocalRotationCaseDifferenceRad.map(x=>x*1e6),
      productionLocalIncrementMicrorad:v.nativeProductionLocalRotationCaseDifferenceRad.map(x=>x*1e6),
      independentMechanicsQualified:false,
    }));
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv.slice(2));
