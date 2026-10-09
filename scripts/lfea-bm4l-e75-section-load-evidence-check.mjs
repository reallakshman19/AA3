#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const filename=process.argv[2];
assert.ok(filename,'Usage: node scripts/lfea-bm4l-e75-section-load-evidence-check.mjs <receipt.json>');
const r=JSON.parse(readFileSync(filename,'utf8'));
assert.equal(r.schema,'lfea-bm4l-e75-source-section-load-custody/v1');
assert.equal(r.status,'SOURCE_SECTION_AND_CASE_LOADS_MEASURED_NO_PRODUCTION_PROMOTION');
assert.equal(r.sourceSegmentId,'ACCDB.E75');
assert.equal(r.nativeElementId,'IXP.E75');
assert.equal(r.activeProductionReducerExactMechanics,false);
assert.equal(r.inactiveCandidateOnly,true);
assert.equal(r.analyticalSourceSectionParityVerified,true);
assert.equal(r.caesarWholeModelParityQualified,false);
assert.equal(r.sourcePrismaticKinematicModel,'TIMOSHENKO_UNIFORM_FROM_END_SECTION');
assert.equal(r.sourceShearCorrectionFactor,0.5);
assert.ok(r.from.outerDiameterM>r.from.innerDiameterM && r.to.outerDiameterM>r.to.innerDiameterM);
assert.ok(r.lengthM>0 && r.phiXY>0 && r.phiXZ>0);
for(const k of ['axial','torsion','shearY','shearZ','bendY','bendZ']){
  const expected=r.independentPrismaticTerms[k],observed=r.actualPrismaticTerms[k];
  assert.ok(Number.isFinite(expected)&&Number.isFinite(observed));
  assert.ok(Math.abs(expected-observed)<=1e-11*Math.max(1,Math.abs(expected)),
    'SOURCE_NATIVE_TIMOSHENKO_CLOSED_FORM_MISMATCH:'+k);
}
for(const id of ['IXP-W','IXP-WP','IXP-WT','IXP-WPT']){
  assert.ok(r.caseEvidence[id],'E75_CASE_CUSTODY_MISSING:'+id);
  assert.ok(r.caseEvidence[id].sourcePhysicalLoadCaseSemanticHash);
  const record=r.caseEvidence[id];
  assert.equal(record.active.equivalentLocal.length,12);
  assert.equal(record.active.initialStrainLocal.length,12);
  if(id==='IXP-WP'||id==='IXP-WPT'){
    assert.equal(record.inactiveCandidate,null,
      'Candidate under physical pressure MUST be withheld, not silently drop axial load');
    assert.equal(record.inactiveCandidateBlocker?.code,
      'REDUCER_TAPERED_AXIAL_PRESSURE_BASIS_UNQUALIFIED');
  } else {
    assert.equal(record.inactiveCandidateBlocker,null);
    assert.equal(record.inactiveCandidate.equivalentLocal.length,12);
    assert.equal(record.inactiveCandidate.initialStrainLocal.length,12);
  }
}
assert.equal(r.candidatePressureRejectedByFailClosedGate,true);
assert.equal(r.pressureLoadCarried.inNative,true);
assert.equal(r.pressureLoadCarried.inInactiveCandidate,null);
assert.equal(r.pressureMagnitudes.candidatePressureInitialStrainWPairedN,null);
assert.equal(r.pressureMagnitudes.candidatePressureInitialStrainThermalPairedN,null);
assert.ok(r.pressureMagnitudes.nativePressureInitialStrainWPairedN>0);
assert.ok(r.pressureMagnitudes.nativePressureInitialStrainThermalPairedN>0);
assert.equal(r.candidatePressureInitialStrainRequiresSeparateQualification,true);
console.log('BM4L_E75_SECTION_LOAD_RECEIPT '+JSON.stringify({
  status:r.status,
  sectionFrom:{odM:r.from.outerDiameterM,wallM:r.from.wallThicknessM,
    areaM2:r.from.areaM2,I_m4:r.from.secondMomentM4},
  sectionTo:{odM:r.to.outerDiameterM,wallM:r.to.wallThicknessM,
    areaM2:r.to.areaM2,I_m4:r.to.secondMomentM4},
  toFromAreaRatio:r.sourceSectionAreaRatioToFrom,
  toFromSecondMomentRatio:r.sourceSectionSecondMomentRatioToFrom,
  prismaticShearPhi:r.phiXY,
  recordedPressureStrainForceNorms:r.pressureMagnitudes,
  inactiveCandidatePressureInputUnresolved:
    r.candidatePressureInitialStrainRequiresSeparateQualification,
  inactiveCandidatePressureRejectedByFailClosedGate:
    r.candidatePressureRejectedByFailClosedGate,
  productionReducerPromoted:false,
  caesarParityCertified:false,
}));
