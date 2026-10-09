#!/usr/bin/env node
/** Real-source BM4_L E75 mathematically consistent pressure hypothesis.
 * No post-authority production solve. Not a CAESAR pressure-on-taper claim.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  sealReducerCondensationRequest,
} from '../src/core/linear-fea-reducer-condensation/index.js';
import { compileTenCylinderAxialPressureHypothesis } from '../src/core/linear-fea-reducer-condensation/reducer-condensation.js';
import { closedEndPressureAxialStrain } from '../src/core/linear-fea-frame-element/frame-element.js';

const SOURCE_SHA='64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
function rel(a,b) {return Math.abs(a-b)/Math.max(1,Math.abs(a),Math.abs(b));}
function measure(source){
  assert.equal(source.schema,'lfea-bm4l-e75-source-section-load-custody/v1');
  assert.equal(source.sourceSegmentId,'ACCDB.E75');
  assert.equal(source.nativeElementId,'IXP.E75');
  assert.equal(source.activeProductionReducerExactMechanics,false);
  assert.equal(source.candidatePressureRejectedByFailClosedGate,true);
  assert.equal(source.caesarWholeModelParityQualified,false);
  assert.ok(source.sourcePoissonRatio>-1&&source.sourcePoissonRatio<0.5);
  assert.ok(source.sourceMassDensityKgM3>0);
  const wp=source.caseEvidence?.['IXP-WP'];
  const wpt=source.caseEvidence?.['IXP-WPT'];
  assert.equal(wp?.inactiveCandidate,null);
  assert.equal(wpt?.inactiveCandidate,null);
  assert.equal(wp?.inactiveCandidateBlocker?.code,'REDUCER_TAPERED_AXIAL_PRESSURE_BASIS_UNQUALIFIED');
  assert.equal(wpt?.inactiveCandidateBlocker?.code,'REDUCER_TAPERED_AXIAL_PRESSURE_BASIS_UNQUALIFIED');
  const pressure=wp?.active.pressure?.pressure;
  const poissonRatio=source.sourcePoissonRatio;
  assert.ok(Number.isFinite(pressure));
  assert.equal(pressure,wpt?.active.pressure?.pressure,
    'The source E75 WP and WPT pressure must be the same for isolation');
  assert.equal(wp?.active.pressure?.axialThrustApplied,true);
  assert.equal(wpt?.active.pressure?.axialThrustApplied,true);
  const fromSection={
    outerDiameter:source.from.outerDiameterM,
    wallThickness:source.from.wallThicknessM,
  };
  const toSection={
    outerDiameter:source.to.outerDiameterM,
    wallThickness:source.to.wallThicknessM,
  };
  const request=sealReducerCondensationRequest({
    schema:REDUCER_CONDENSATION_REQUEST_SCHEMA,
    reducerId:'IXP.E75',
    length:source.lengthM,fromSection,toSection,
    segmentCount:REDUCER_SEGMENT_COUNT,samplingRule:REDUCER_SAMPLING_RULE,
    material:{
      elasticModulus:source.elasticModulusPa,shearModulus:source.shearModulusPa,
      massDensity:source.sourceMassDensityKgM3,
      thermalExpansionCoefficient:0,
    },
    gravity:{
      enabled:false,acceleration:9.80665,directionLocal:[0,-1,0],
      fluidDensity:0,insulationThickness:0,insulationDensity:0,
    },
    thermal:{installationTemperature:0,operatingTemperature:0},
    sourceEvidence:{
      sourceId:'BM4_L:E75:RESEARCH_ONLY',
      sourceRevision:SOURCE_SHA,
      sourceSemanticHash:semanticHash({
        accdbSha256:SOURCE_SHA,
        fromSection,toSection,elementId:'IXP.E75',
      }),
    },
    semanticHash:'',
  });
  const research=compileTenCylinderAxialPressureHypothesis(
    request,{pressurePa:pressure,poissonRatio});
  const sourcePrismaticStrain=closedEndPressureAxialStrain({
    pressure,poissonRatio,
    outerDiameter:fromSection.outerDiameter,
    innerDiameter:source.from.innerDiameterM,
    elasticModulus:source.elasticModulusPa,
    elementId:'IXP.E75',
  });
  const sourceForce=source.elasticModulusPa*source.from.areaM2*sourcePrismaticStrain;
  const nativePressureNorm=source.pressureMagnitudes.nativePressureInitialStrainWPairedN;
  assert.ok(rel(nativePressureNorm,Math.SQRT2*Math.abs(sourceForce))<1e-10,
    'Real source native WP-W force norm must match prismatic pressure convention');
  assert.ok(rel(sourcePrismaticStrain,wp.active.pressure.axialStrain)<1e-12);
  assert.ok(research.freeExpansionConsistencyRelativeResidual<2e-8);
  assert.ok(research.stiffnessReassemblyRelativeResidual<2e-8);
  assert.equal(research.productionUseAuthorized,false);
  assert.equal(research.globalCaesarIIParityQualified,false);
  assert.equal(research.slopedInnerWallPressureForceModelled,false);
  assert.equal(research.sourceTaperPressureAuthorityEstablished,false);
  assert.ok(research.condensedPressureInitialStrainLocalVector.some((v)=>v!==0),
    'Research pressure vector must not silently zero the measured pressure input');
  return {
    schema:'lfea-bm4l-e75-axial-pressure-hypothesis-receipt/v1',
    status:'RESEARCH_PRESSURE_VECTOR_MEASURED_NOT_CAESAR_OR_PRODUCTION_AUTHORIZED',
    authenticAccdbSha256:SOURCE_SHA,
    activeNativePressureLoadUnchanged:true,
    nativePressureInitialStrainVectorNormN:nativePressureNorm,
    nativePrismaticPressureAxialStrain:sourcePrismaticStrain,
    nativePrismaticPressureEndForceN:sourceForce,
    candidateProductionPressureBlocked:true,
    candidateSourceCodedPressureEnabled:false,
    researchOnlyHypothesis:research,
    sourceOuterDiameterFromM:fromSection.outerDiameter,
    sourceOuterDiameterToM:toSection.outerDiameter,
    missingQualification:[
      'Conical sloped inner-wall axial pressure traction/cap-force mechanical basis',
      'Taper section sampling and gravity ownership',
      'Controlled CAESAR II E75 source-case numerical parity',
      'Explicit separate engineering promotion authorization',
    ],
    productionNumericalParityClaimed:false,
  };
}
function main(argv){
  assert.equal(argv.length,4,
    'Usage: --source-section <pinned-receipt.json> --out <hypothesis.json>');
  assert.equal(argv[0],'--source-section');assert.equal(argv[2],'--out');
  const input=JSON.parse(readFileSync(resolve(argv[1]),'utf8'));
  const receipt=measure(input);
  const out=resolve(argv[3]);mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('BM4L_E75_PRESSURE_RESEARCH '+JSON.stringify({
    status:receipt.status,
    prismaticPressureN:receipt.nativePrismaticPressureEndForceN,
    researchPressureN:receipt.researchOnlyHypothesis.algebraicAxialLoadN,
    researchFreeExtensionM:receipt.researchOnlyHypothesis.equivalentFreeAxialExtensionM,
    researchSelfConsistencyRelative:
      receipt.researchOnlyHypothesis.freeExpansionConsistencyRelativeResidual,
    differenceInPressureEndForceN:
      receipt.researchOnlyHypothesis.algebraicAxialLoadN-receipt.nativePrismaticPressureEndForceN,
    conicalInnerWallPressureModelled:false,
    productionPressureGuardRemainsBlocked:true,
    caesarParityClaimed:false,
  }));
}
main(process.argv.slice(2));
