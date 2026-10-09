#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  sealReducerCondensationRequest,
} from '../src/core/linear-fea-reducer-condensation/index.js';
import { compileTenCylinderAxialPressureHypothesis } from '../src/core/linear-fea-reducer-condensation/reducer-condensation.js';
import { closedEndPressureAxialStrain } from '../src/core/linear-fea-frame-element/frame-element.js';

const E=2.0e11,G=7.7e10,L=1.5, nu=0.3,P=6.0e6;
const from={outerDiameter:0.32385,wallThickness:0.0127};
const to={outerDiameter:0.2191,wallThickness:0.00818};
function request(toSection=to) {
  return sealReducerCondensationRequest({
    schema:REDUCER_CONDENSATION_REQUEST_SCHEMA,
    reducerId:'PRESSURE-RESEARCH-ONLY',
    length:L,fromSection:from,toSection,
    segmentCount:REDUCER_SEGMENT_COUNT,samplingRule:REDUCER_SAMPLING_RULE,
    material:{
      elasticModulus:E,shearModulus:G,massDensity:7850,
      thermalExpansionCoefficient:12e-6,
    },
    gravity:{
      enabled:false,acceleration:9.80665,directionLocal:[0,-1,0],
      fluidDensity:0,insulationThickness:0,insulationDensity:0,
    },
    thermal:{installationTemperature:20,operatingTemperature:20},
    sourceEvidence:{
      sourceId:'MATHEMATICAL_SYNTHETIC_RESEARCH_NOT_CAESAR',
      sourceRevision:'v1',sourceSemanticHash:'fnv1a64:0000000000000001',
    },semanticHash:'',
  });
}
const hypo=(r,p=P,v=nu)=>compileTenCylinderAxialPressureHypothesis(
  r,{pressurePa:p,poissonRatio:v});
const uniform=hypo(request(from));
assert.equal(uniform.midpointCylinderCount,10);
assert.equal(uniform.productionUseAuthorized,false);
assert.equal(uniform.globalCaesarIIParityQualified,false);
assert.equal(uniform.slopedInnerWallPressureForceModelled,false);
assert.equal(uniform.sourceTaperPressureAuthorityEstablished,false);
assert.ok(uniform.freeExpansionConsistencyRelativeResidual<2e-8);
assert.ok(uniform.stiffnessReassemblyRelativeResidual<2e-8);

function almost(actual,expected,name,relative=2e-8){
  assert.ok(Number.isFinite(actual));
  assert.ok(Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),
    `${name}: actual ${actual}, expected ${expected}`);
}
const eps=closedEndPressureAxialStrain({
  pressure:P,outerDiameter:from.outerDiameter,
  innerDiameter:from.outerDiameter-2*from.wallThickness,
  poissonRatio:nu,elasticModulus:E,elementId:'SYNTHETIC_UNIFORM',
});
const area=Math.PI*(from.outerDiameter**2-(from.outerDiameter-2*from.wallThickness)**2)/4;
almost(uniform.equivalentFreeAxialExtensionM,eps*L,'uniform analytical pressure free extension');
almost(uniform.algebraicAxialLoadN,E*area*eps,'uniform closed-end force');
almost(uniform.condensedPressureInitialStrainLocalVector[0],-E*area*eps,'uniform pressure local end I');
almost(uniform.condensedPressureInitialStrainLocalVector[6],E*area*eps,'uniform pressure local end J');
for(let i=0;i<12;i++)if(i!==0&&i!==6)
  almost(uniform.condensedPressureInitialStrainLocalVector[i],0,`uniform vector[${i}]`,1e-8);

const tapered=hypo(request());
const negative=hypo(request(),-P);
const zero=hypo(request(),0);
const doubled=hypo(request(),2*P);
assert.ok(tapered.freeExpansionConsistencyRelativeResidual<2e-8);
assert.ok(tapered.stiffnessReassemblyRelativeResidual<2e-8);
assert.equal(tapered.cylinders.length,10);
assert.ok(tapered.cylinders.some((c,i)=>i>0 && c.initialStrainEquivalentAxialForceN
  !==tapered.cylinders[0].initialStrainEquivalentAxialForceN),
'Variable annular section must produce nonconstant cylinder pressure forces');
for(let i=0;i<12;i++){
  const a=tapered.condensedPressureInitialStrainLocalVector[i];
  almost(negative.condensedPressureInitialStrainLocalVector[i],-a,`negative-pressure sign ${i}`);
  almost(doubled.condensedPressureInitialStrainLocalVector[i],2*a,`pressure-linearity ${i}`);
  almost(zero.condensedPressureInitialStrainLocalVector[i],0,`zero-pressure ${i}`);
}
almost(negative.equivalentFreeAxialExtensionM,-tapered.equivalentFreeAxialExtensionM,'negative free extension');
assert.throws(()=>hypo(request(),P,0.5),/REDUCER_PRESSURE_RESEARCH_PHYSICAL_STATE_INVALID/);
assert.throws(()=>hypo(request(),Infinity),/REDUCER_PRESSURE_RESEARCH_PHYSICAL_STATE_INVALID/);
assert.throws(()=>compileTenCylinderAxialPressureHypothesis(request(),{pressurePa:P}),
  /REDUCER_PRESSURE_RESEARCH_EXACT_STATE_REQUIRED/);
assert.throws(()=>compileTenCylinderAxialPressureHypothesis(request(),{pressurePa:P,poissonRatio:nu,authorised:true}),
  /REDUCER_PRESSURE_RESEARCH_EXACT_STATE_REQUIRED/);
console.log(JSON.stringify({
  check:'lfea-s4-taper-pressure-mathematical-hypothesis',
  status:'MATHEMATICALLY_SELF_CONSISTENT_NOT_CAESAR_QUALIFIED',
  uniformAnalyticalPressureEndForceN:E*area*eps,
  uniformCondensedEndForceN:uniform.algebraicAxialLoadN,
  taperedAxialEndForceN:tapered.algebraicAxialLoadN,
  taperedFreeExtensionM:tapered.equivalentFreeAxialExtensionM,
  candidateRule:tapered.ruleId,
  sourcePressureOnConicalWallAuthority:false,
  numericalToleranceModified:false,
  productionPromotion:false,
},null,2));
