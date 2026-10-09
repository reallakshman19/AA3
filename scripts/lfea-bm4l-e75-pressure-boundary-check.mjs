#!/usr/bin/env node
/**
 * BM4_L authentic ACCDB signed uniform-pressure CONTROL VOLUME and geometry
 * custody. Fluid-wall forces are never applied to LFEA beam DOFs.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import MDBReader from 'mdb-reader';
import { idealizedFluidPressureControlVolume } from './lib/lfea-reducer-pressure-control-volume.mjs';

const SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const SIZE=5136384;
const args=new Map();
for(let i=0;i<process.argv.slice(2).length;i+=2){
  const pair=process.argv.slice(2);
  assert.ok(['--accdb','--pressure-research','--source-section','--out'].includes(pair[i])
    && pair[i+1],'Use --accdb --pressure-research --source-section --out');
  assert.ok(!args.has(pair[i]),'Duplicate option '+pair[i]);
  args.set(pair[i],pair[i+1]);
}
for(const key of ['--accdb','--pressure-research','--source-section','--out'])
  assert.ok(args.has(key),'Missing '+key);
const raw=readFileSync(resolve(args.get('--accdb')));
assert.equal(raw.length,SIZE,'E75_PRESSURE_BOUNDARY_ACCDB_LENGTH_INVALID');
assert.equal(createHash('sha256').update(raw).digest('hex'),SHA,
  'E75_PRESSURE_BOUNDARY_ACCDB_HASH_INVALID');
const reader=new MDBReader(raw);
const originalElements=reader.getTable('INPUT_BASIC_ELEMENT_DATA').getData();
const originalReducers=reader.getTable('INPUT_REDUCERS').getData();
const element=originalElements.filter(row=>Number(row.ELEMENTID)===75);
assert.equal(element.length,1,'E75_ORIGINAL_BASIC_ELEMENT_NOT_UNIQUE');
assert.equal(Number(element[0].FROM_NODE),22100);
assert.equal(Number(element[0].TO_NODE),22110);
const reducerPointer=Number(element[0].REDUCER_PTR);
assert.equal(reducerPointer,4,'E75_SOURCE_REDUCER_PTR_CHANGED');
const reducer=originalReducers.filter(row=>Number(row.RED_PTR)===reducerPointer);
assert.equal(reducer.length,1,'E75_ORIGINAL_REDUCER_NOT_UNIQUE');

const source=JSON.parse(readFileSync(resolve(args.get('--source-section')),'utf8'));
const research=JSON.parse(readFileSync(resolve(args.get('--pressure-research')),'utf8'));
assert.equal(source.schema,'lfea-bm4l-e75-source-section-load-custody/v1');
assert.equal(research.schema,'lfea-bm4l-e75-axial-pressure-hypothesis-receipt/v1');
assert.equal(research.authenticAccdbSha256,SHA);
assert.equal(source.sourceSegmentId,'ACCDB.E75');
assert.equal(source.nativeElementId,'IXP.E75');
assert.equal(research.candidateProductionPressureBlocked,true);
assert.equal(research.candidateSourceCodedPressureEnabled,false);
assert.equal(research.researchOnlyHypothesis.productionUseAuthorized,false);
assert.equal(research.productionNumericalParityClaimed,false);
assert.equal(research.researchOnlyHypothesis.slopedInnerWallPressureForceModelled,false);
assert.equal(source.candidatePressureRejectedByFailClosedGate,true);
assert.equal(source.activeProductionReducerExactMechanics,false);
const pressurePa=research.researchOnlyHypothesis.pressurePa;
assert.equal(pressurePa,source.caseEvidence['IXP-WP'].active.pressure.pressure);
assert.equal(pressurePa,source.caseEvidence['IXP-WPT'].active.pressure.pressure);
const innerIn=source.from.innerDiameterM;
const innerOut=source.to.innerDiameterM;
const cv=idealizedFluidPressureControlVolume({
  pressurePa,
  inletInnerDiameterM:innerIn,
  outletInnerDiameterM:innerOut,
});
assert.ok(cv.relativeEquilibriumResidual<=1e-12);
assert.ok(cv.inletAreaM2<cv.outletAreaM2);
assert.ok(cv.wallPressureOnFluidN>0,'Real E75 expansion yields positive wall-on-fluid projection');
assert.ok(cv.fluidPressureOnSolidSidewallN<0);
const previous=research.idealizedInnerWallPressureAreaControl;
assert.equal(previous.schema,'fea-reducer-idealized-sidewall-pressure-area-control/v1');
const scale=Math.max(1,cv.wallPressureOnFluidN);
assert.ok(Math.abs(Math.abs(cv.wallPressureOnFluidN)-previous.axialResultantMagnitudeN)/scale<1e-12,
  'Signed control volume must agree with prior source area magnitude');
assert.ok(Math.abs(cv.pressureEndFaceSumOnFluidN+cv.wallPressureOnFluidN)/scale<1e-12);
const rawFields=reducer[0];
for(const fld of ['ALPHA','R1','R2','DIAMETER2','THICKNESS2'])
  assert.ok(Object.hasOwn(rawFields,fld),'Missing original reducer declaration field '+fld);
const normalizedReducer=source.sourceReducer;
const signedEccentricitySourceStatus='UNKNOWN_REDUCER_R1_R2_MEANING_NOT_QUALIFIED';
if(normalizedReducer?.alpha!=null)
  assert.equal(Number(rawFields.ALPHA),normalizedReducer.alpha,
    'Reducer source ALPHA must retain exact original numeric value');
for(const [rawKey,normKey] of [['R1','r1SourceUnits'],['R2','r2SourceUnits']])
  if(normalizedReducer?.[normKey]!=null)
    assert.equal(Number(rawFields[rawKey]),normalizedReducer[normKey],
      'Original reducer '+rawKey+' source units drifted');

const receipt={
  schema:'lfea-bm4l-e75-pressure-boundary-and-source-geometry/v1',
  status:'IDEALIZED_FLUID_PRESSURE_BOUNDARY_CLOSED_SOURCE_ECCENTRICITY_UNQUALIFIED',
  sourceAccdbSha256:SHA,
  sourceAccdbByteLength:SIZE,
  sourceElementId:75,
  nativeElementId:'IXP.E75',
  sourceNodeFrom:22100,sourceNodeTo:22110,
  sourceReducerPointer:reducerPointer,
  originalElementRow:element[0],
  originalReducerDeclaration:rawFields,
  normalizedReducerSourceMetadata:normalizedReducer,
  reducerGeometryInterpretation:signedEccentricitySourceStatus,
  r1R2UnitsConvertedOrUsedAsEccentricity:false,
  alphaUsedToInferWallPressureNormal:false,
  idealizedControlVolume:cv,
  originalMagnitudeCrossCheckN:previous.axialResultantMagnitudeN,
  researchCylinderInitialStrainEndForceN:research.researchOnlyHypothesis.algebraicAxialLoadN,
  activePrismaticInitialStrainEndForceN:research.nativePrismaticPressureEndForceN,
  fluidWallResultantAssignedToNodes:false,
  pressureInitialStrainAndWallResultantsCombined:false,
  physicalReducerBoundaryMomentsResolved:false,
  candidatePressureSourceQualified:false,
  productionReducerExactMechanics:false,
  caesarIIParityQualified:false,
};
const out=resolve(args.get('--out'));mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify(receipt,null,2)+'\n','utf8');
console.log('BM4L_E75_PRESSURE_BOUNDARY '+JSON.stringify({
  status:receipt.status,
  fluidInletPressureN:cv.inletPressureOnFluidN,
  fluidOutletPressureN:cv.outletPressureOnFluidN,
  sidewallOnFluidAxialN:cv.wallPressureOnFluidN,
  fluidOnSolidSidewallAxialN:cv.fluidPressureOnSolidSidewallN,
  netFluidExternalAxialN:cv.netFluidExternalAxialForceN,
  relativeEquilibriumResidual:cv.relativeEquilibriumResidual,
  sourceReducerPointer:reducerPointer,
  rawReducerFields:{ALPHA:rawFields.ALPHA,R1:rawFields.R1,R2:rawFields.R2},
  eccentricPressureGeometryQualified:false,
  fluidPressureWallAllocatedToNativeBeam:false,
  productionReducerPromoted:false,
  sourceCaesarParityQualified:false,
}));
