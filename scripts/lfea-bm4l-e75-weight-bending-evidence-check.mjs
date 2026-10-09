#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const input=process.argv[2];assert.ok(input,'Expected authentic E75 gravity/bending receipt path');
const e=JSON.parse(readFileSync(input,'utf8'));
assert.equal(e.schema,'lfea-bm4l-e75-weight-bending-compliance-forensic/v1');
assert.equal(e.status,'MEASURED_WEIGHT_AND_CANTILEVER_BENDING_SENSITIVITIES_NOT_CAESAR_PARITY');
assert.equal(e.sourceSegmentId,'ACCDB.E75');assert.equal(e.elementId,'IXP.E75');
assert.equal(e.productionReducerExactMechanics,false);assert.equal(e.condenserCandidateOnly,true);
assert.ok(e.sourceWeightPhysicalLoadCaseSemanticHash);
assert.equal(e.sourceGravityPrimitive.primitiveId,'IXP.E75-W');
assert.equal(e.nativeLocalGravityVector.length,12);
assert.equal(e.tenCylinderLocalGravityVector.length,12);
assert.ok(e.nativeWeightMagnitudeN>0 && e.candidateWeightMagnitudeN>0);
const same=(a,b,name,eps=2e-6)=>assert.ok(
  Math.abs(a-b)<=eps*Math.max(1e-14,Math.abs(a),Math.abs(b)),name+' inconsistent: '+a+' vs '+b);
same(e.sourceWeightMagnitudeN,e.nativeWeightMagnitudeN,'authentic W-force conservation',1e-10);
same(e.nativeEndMomentZRotationalComplianceRadPerNm,
  e.nativeAnalyticalMomentComplianceRadPerNm,'native Mz');
same(e.nativeEndMomentYRotationalComplianceRadPerNm,
  e.nativeAnalyticalMomentComplianceRadPerNm,'native My');
same(e.nativeEndForceYRotationRadPerN,
  e.nativeAnalyticalEndForceRotationRadPerN,'native Fy rotation');
same(e.nativeEndForceYDisplacementMPerN,
  e.nativeAnalyticalEndForceDisplacementMPerN,'native Fy displacement');
same(e.tenCylinderEndMomentZRotationalComplianceRadPerNm,
  e.independentTenCylinderSeriesMomentComplianceRadPerNm,'candidate Mz');
same(e.tenCylinderEndMomentYRotationalComplianceRadPerNm,
  e.independentTenCylinderSeriesMomentComplianceRadPerNm,'candidate My');
assert.ok(e.candidateToNativeBendingMomentComplianceRatio>0
  && e.candidateToNativeBendingMomentComplianceRatio<1,
  'Large-to-small E75 taper ought to stiffen the independent candidate under isolated end moment');
assert.equal(e.sourceMidpointCylinderComplianceSlices.length,10);
assert.equal(e.adjacentE74ThroughE80.length,7);
assert.deepEqual(e.adjacentE74ThroughE80.map(s=>s.sourceId),
  ['ACCDB.E74','ACCDB.E75','ACCDB.E76','ACCDB.E77','ACCDB.E78','ACCDB.E79','ACCDB.E80']);
assert.equal(e.nativeRigidsAndSupportLoadRedistributionSolved,false);
assert.equal(e.caesarIIOriginalReducerSamplingAndWeightOwnershipQualified,false);
assert.equal(e.fixtureOrNumericalAcceptanceModified,false);
assert.equal(e.productionMechanicsChanged,false);
console.log('BM4L_E75_W_BENDING_RECEIPT '+JSON.stringify({
  nativeWeightN:e.nativeWeightMagnitudeN,
  inactiveTenCylinderWeightN:e.candidateWeightMagnitudeN,
  candidateToNativeWeightRatio:e.candidateToNativeWeightRatio,
  nativeEndMomentComplianceRadPerNm:e.nativeEndMomentZRotationalComplianceRadPerNm,
  inactiveTenCylinderEndMomentComplianceRadPerNm:
    e.tenCylinderEndMomentZRotationalComplianceRadPerNm,
  ratio:e.candidateToNativeBendingMomentComplianceRatio,
  neighborSourceElementIds:e.adjacentE74ThroughE80.map(s=>s.sourceId),
  downstreamConstraintBindings:e.downstreamStructuralConstraintBindings.length,
  weightCaseCaesarQualified:false,productionCandidatePromoted:false,
}));
