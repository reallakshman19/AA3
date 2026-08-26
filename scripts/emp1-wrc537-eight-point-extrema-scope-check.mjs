#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE,evaluateEmp1Wrc537CylindricalTable5 } from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';

const methodDefinition=await readFile('docs/01_WRC537_METHOD_DEFINITION.md','utf8');
const ledger=await readFile('docs/emp1/WRC537_2013_Eight_Point_Extrema.md','utf8');
const ui=await readFile('src/workspace/emp1-engineering-evidence-view.js','utf8');
assert.match(methodDefinition,/no assurance that the absolute maximum stress intensity[^\n]*eight points considered/u);
assert.match(ledger,/WRC 537 §4\.3\.6/u);
assert.match(ledger,/MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY/u);
assert.match(ui,/Eight-location shell stress trace/u);
assert.doesNotMatch(ui,/Absolute maximum shell stress/u);

const unit={Pmem_AB:1,Pmem_CD:1,Pbend_AB:1,Pbend_CD:1,Mcmem:1,Mcbend:1,Mlmem:1,Mlbend:1};
const result=evaluateEmp1Wrc537CylindricalTable5({
  geometry:{meanRadius:100,shellThickness:20,attachmentRadius:17.714285714285715,beta:0.155},
  stressConcentration:{Kn:1,Kb:1},
  loads:{P:-1000,Vc:250,Vl:-400,Mc:500000,Ml:-600000,Mt:700000},
  curveOrdinates:{circ:{...unit},long:{...unit}},
});
const values=result.stresses.stressIntensity;
const expected=Math.max(...values),index=values.indexOf(expected);
assert.equal(values.length,8);
assert.equal(result.extremaScope.evaluatedLocationCount,8);
assert.deepEqual(result.extremaScope.evaluatedLocations,['Au','Al','Bu','Bl','Cu','Cl','Du','Dl']);
assert.equal(result.extremaScope.evaluatedEightPointEnvelope.stressIntensity,expected);
assert.equal(result.extremaScope.evaluatedEightPointEnvelope.location,result.locations[index]);
assert.equal(result.extremaScope.evaluatedEightPointEnvelope.basis,'MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY');
assert.equal(result.extremaScope.evaluatedEightPointEnvelope.globalAbsoluteMaximumClaim,false);
assert.equal(result.extremaScope.absoluteShellMaximumAssured,false);
assert.equal(result.extremaScope.arbitraryLoadingGlobalMaximumAuthority,false);
assert.equal(result.extremaScope.continuousJunctureSearchPerformed,false);
assert.equal(result.extremaScope.intermediatePointSearchPerformed,false);
assert.equal(result.extremaScope.sourceSection,'WRC537_4.3.6');
assert.equal(result.extremaScope.limitationCode,'WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM');
assert.equal(EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE.absoluteShellMaximumAssured,false);
assert.equal(Object.hasOwn(result,'absoluteMaximumStressIntensity'),false);
assert.equal(Object.hasOwn(result.stresses,'maximumStressIntensity'),false);
console.log(JSON.stringify({status:'PASS_WRC_TABLE5_EIGHT_POINT_EXTREMA_SCOPE',evaluatedEightPointEnvelope:result.extremaScope.evaluatedEightPointEnvelope,absoluteShellMaximumAssured:false,continuousJunctureSearchPerformed:false,sourceSection:'WRC537_4.3.6'},null,2));
