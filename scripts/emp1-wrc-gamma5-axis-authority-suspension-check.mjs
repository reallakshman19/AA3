#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
  evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate,
  runEmp1Wrc537Gamma5ZeroDpRoute,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';

const methodDefinition=await readFile('docs/01_WRC537_METHOD_DEFINITION.md','utf8');
assert.match(methodDefinition,/\| FX \(circ\. shear\) \| V_C \|[^\n]*\*\*UNRESOLVED\*\*/u);
assert.match(methodDefinition,/\| FY \(long\. shear\) \| V_L \|[^\n]*\*\*UNRESOLVED\*\*/u);
assert.match(methodDefinition,/\| MX \(circ\. moment\) \| M_C \|[^\n]*\*\*UNRESOLVED\*\*/u);
assert.match(methodDefinition,/\| MY \(long\. moment\) \| M_L \|[^\n]*\*\*UNRESOLVED\*\*/u);
assert.match(methodDefinition,/\| MZ \(torsion\) \| M. \|[^\n]*\*\*UNRESOLVED\*\*/u);

assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,false);
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON]);
const registry=emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.ok(registry);
assert.equal(registry.registered,false);
assert.equal(registry.engineeringUseAuthorized,false);
assert.equal(registry.comparisonQualificationAvailable,true);
assert.deepEqual(registry.suspensionReasons,[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON]);

const result=calculateLocalAttachmentFoundation(routeFixture());
assert.equal(result.qualification.state,'ACCEPTED');
const input={
  loadTransferResult:result,
  loadCaseIdentity:'LC-1',pressureResultIdentity:'PR-1',wrcReferencePointGlobal:[0,0,0],
  geometry:{meanRadius:100,shellThickness:20,attachmentRadius:17.714285714285715,gamma:5,beta:0.155},
  axes:{vesselCenterlineGlobal:[1,0,0],nozzleCenterlineGlobal:[0,0,1]},
  stressConcentration:{Kn:1,Kb:1},
};
const comparison=evaluateEmp1Wrc537Gamma5ZeroDpRouteCandidate(input);
assert.equal(comparison.state,'PASS_BOUNDED_ROUTE_COMPARISON_CANDIDATE');
assert.equal(comparison.engineeringUseAuthorized,false);
assert.equal(comparison.engineeringComparisonUseAuthorized,true);
assert.equal(comparison.productionRouteAuthority,false);
assert.deepEqual(comparison.routeSuspensionReasons,[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON]);
assert.equal(comparison.stresses.stressIntensity.length,8);
assert.ok(comparison.stresses.stressIntensity.every(Number.isFinite));

let caught=null;
try{runEmp1Wrc537Gamma5ZeroDpRoute(input);}catch(error){caught=error;}
assert.ok(caught,'production route must fail closed while cylindrical load-axis signs are unresolved');
assert.equal(caught.code,'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED');
assert.deepEqual(caught.reasons,[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON]);

console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma5-axis-authority-suspension/v1',
  status:'PASS_FAIL_CLOSED_AXIS_AUTHORITY_SUSPENSION',
  sourceAuthority:'docs/01_WRC537_METHOD_DEFINITION.md#9.3',
  unresolved:[EMP1_C_WRC537_GAMMA5_SUSPENSION_REASON],
  comparisonKernelReobserved:true,
  productionRouteAuthorized:false,
  registered:false,
  stressIntensityPoints:comparison.stresses.stressIntensity.length,
},null,2));

function routeFixture(){return canonicalFixture((source)=>{
  source.loadCases[0].force.value=[-400,-250,-1000];
  source.loadCases[0].moment.value=[-750000,1000000,-700000];
  source.pressureDefinitions.forEach((row)=>{row.internalPressure.value=0;row.externalPressure.value=0;});
});}
