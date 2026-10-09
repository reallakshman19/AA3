#!/usr/bin/env node
import assert from 'node:assert/strict';
import { requireReducerAxialPressureBasis } from '../src/core/linear-piping-analysis-consumer/reducer-condensation-augmentation.js';

const frame=(pressure)=>({pressure});
const pressure=(axialThrustApplied,axialStrain)=>({
  primitiveId:'E75:P1',axialThrustApplied,axialStrain,
});
assert.doesNotThrow(()=>requireReducerAxialPressureBasis(frame(null),'IXP.E75'),
  'Unpressurized reducer research mode remains permitted');
assert.doesNotThrow(()=>requireReducerAxialPressureBasis(
  frame(pressure(false,0.0001)),'IXP.E75'),
'Pressure for non-axial-stress-only effects does not imply an axial load');
assert.doesNotThrow(()=>requireReducerAxialPressureBasis(
  frame(pressure(true,0)),'IXP.E75'),
'Zero pressure axial strain must not require an invented nonzero resultant');
for(const signedStrain of [0.0001,-0.0001]){
  assert.throws(()=>requireReducerAxialPressureBasis(
    frame(pressure(true,signedStrain)),'IXP.E75'),
    (error)=>error?.code==='REDUCER_TAPERED_AXIAL_PRESSURE_BASIS_UNQUALIFIED'
      && error?.message?.includes('thermal-only ten-cylinder'),
    'Nonzero signed axial pressure strain must always block the candidate');
}
console.log(JSON.stringify({
  check:'lfea-reducer-pressure-custody-guard',
  status:'PASS_FAIL_CLOSED_WHEN_AXIAL_PRESSURE_BASIS_MISSING',
  nonzeroAxialPressureCasesBlocked:2,
  noPressureAndZeroPressureCasesPermitted:3,
  productionProfileChanged:false,
  pressureTaperFormulaInferred:false,
}));
