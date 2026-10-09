#!/usr/bin/env node
import assert from 'node:assert/strict';
import { idealizedFluidPressureControlVolume as cv } from './lib/lfea-reducer-pressure-control-volume.mjs';

const P=6e6, d1=0.075, d2=0.14;
const expansion=cv({pressurePa:P,inletInnerDiameterM:d1,outletInnerDiameterM:d2});
assert.equal(expansion.schema,'lfea-idealized-fluid-pressure-control-volume/v1');
assert.ok(expansion.wallPressureOnFluidN>0);
assert.ok(expansion.fluidPressureOnSolidSidewallN<0);
assert.ok(expansion.pressureEndFaceSumOnFluidN<0);
assert.equal(expansion.productionPressurePromotionAuthorized,false);
assert.equal(expansion.wallPressureLoadAllocatedToBeamNodes,false);
assert.ok(expansion.relativeEquilibriumResidual<=1e-12);
const contraction=cv({pressurePa:P,inletInnerDiameterM:d2,outletInnerDiameterM:d1});
const reverse=cv({pressurePa:-P,inletInnerDiameterM:d1,outletInnerDiameterM:d2});
const uniform=cv({pressurePa:P,inletInnerDiameterM:d1,outletInnerDiameterM:d1});
const zero=cv({pressurePa:0,inletInnerDiameterM:d1,outletInnerDiameterM:d2});
const rel=(a,b)=>Math.abs(a-b)/Math.max(1,Math.abs(a),Math.abs(b));
for(const [name,result] of [['expansion',expansion],['contraction',contraction],
  ['reverse',reverse],['uniform',uniform],['zero',zero]]) {
  assert.ok(result.relativeEquilibriumResidual<=1e-12,name+' must be equilibrium closed');
  assert.ok(rel(result.fluidPressureOnSolidSidewallN,-result.wallPressureOnFluidN)<=1e-12);
}
assert.ok(rel(contraction.wallPressureOnFluidN,-expansion.wallPressureOnFluidN)<=1e-12);
assert.ok(rel(reverse.wallPressureOnFluidN,-expansion.wallPressureOnFluidN)<=1e-12);
assert.equal(uniform.wallPressureOnFluidN,0);
assert.equal(zero.wallPressureOnFluidN,0);
assert.ok(Math.abs(expansion.pressureEndFaceSumOnFluidN)>1000);
assert.ok(rel(
  expansion.pressureEndFaceSumOnFluidN + expansion.wallPressureOnFluidN,
  0)<=1e-12);
assert.ok(Math.abs(
  expansion.pressureEndFaceSumOnFluidN + 2*expansion.wallPressureOnFluidN
)>1000,'Double-counting the wall resultant MUST break fluid force closure');
assert.throws(()=>cv({pressurePa:Infinity,inletInnerDiameterM:d1,outletInnerDiameterM:d2}),
  /REDUCER_PRESSURE_CV_NONFINITE/);
assert.throws(()=>cv({pressurePa:P,inletInnerDiameterM:0,outletInnerDiameterM:d2}),
  /REDUCER_PRESSURE_CV_DIAMETERS_MUST_BE_POSITIVE/);
console.log('REDUCER_PRESSURE_CV_NEGATIVE_CONTROLS '+JSON.stringify({
  status:'PASS_SIGNED_FACE_WALL_EQUILIBRIUM_AND_DOUBLE_COUNT_NEGATIVE_CONTROL',
  expansionWallOnFluidN:expansion.wallPressureOnFluidN,
  contractionWallOnFluidN:contraction.wallPressureOnFluidN,
  doubleCountErrorN:expansion.wallPressureOnFluidN,
  sourceEccentricityQualified:false,
  nodalLoadsAssigned:false,
}));
