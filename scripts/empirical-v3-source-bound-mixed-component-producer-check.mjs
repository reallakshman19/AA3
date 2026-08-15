import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEmpiricalElbowFlexibilityAuthority, normalizeCircularElbowGeometry } from '../src/core/empirical-piping-mechanics/circular-elbow-flexibility.js';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import { ENGINEERING_QUANTITY_AUTHORITY_SCHEMA, sealEngineeringQuantityAuthority } from '../src/core/empirical-v3-safety/quantity-authority.js';
import { buildEmpiricalV3SourceBoundMixedComponentRomInput, requireEmpiricalV3SourceBoundMixedComponentRomInput } from '../src/workspace/engineering-loads/adapters/empirical-v3-source-bound-mixed-component-producer.js';

const route=mixedRoute();
const input={route,componentRows:route.components.map(componentRow),restraintBinding:binding(route),options:{}};
const produced=buildEmpiricalV3SourceBoundMixedComponentRomInput(input);
assert.equal(requireEmpiricalV3SourceBoundMixedComponentRomInput(produced),produced);
assert.equal(produced.romInput.components.length,3);
assert.equal(produced.romInput.rootNodeId,'N0');
assert.equal(produced.romInput.coordinates[0].nodeId,'N3');
assert.equal(produced.romInput.components.find((row)=>row.componentId==='E1').flexibilityAuthority.source.standard,'ASME_B31J');
assert.equal(produced.policy.governedRestraintBindingRequired,true);
assert.equal(produced.policy.sourceBackedSupportMovementOnly,true);
assert.equal(produced.policy.executionEnabled,false);

const inferred=structuredClone(input);
inferred.componentRows[0].quantities.ELASTIC_MODULUS=inferredQuantity('P1','ELASTIC_MODULUS',200e9,'Pa');
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(inferred),/not exact source\/master\/derived authority/);
const extra=structuredClone(input);
extra.componentRows[0].quantities.CHAINAGE=exactQuantity('P1','CHAINAGE',1,'m');
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(extra),/exactly the qualified quantity kinds/);
const wrongRoute=structuredClone(input);
wrongRoute.restraintBinding={...wrongRoute.restraintBinding,routeRef:{...wrongRoute.restraintBinding.routeRef,semanticHash:'fnv1a64:9999999999999999'}};
wrongRoute.restraintBinding=rehashBinding(wrongRoute.restraintBinding);
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(wrongRoute),/does not belong to the supplied canonical route/);
const benchmark=structuredClone(input);
benchmark.componentRows.find((row)=>row.componentId==='E1').flexibilityAuthority=elbowFlexibility('BENCHMARK');
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(benchmark),/non-benchmark ASME B31J/);
const stale=structuredClone(input);
const elbow=stale.componentRows.find((row)=>row.componentId==='E1');
const base=authorityInput('2023');
elbow.flexibilityAuthority=createEmpiricalElbowFlexibilityAuthority({...base,geometryBinding:{...base.geometryBinding,wallThicknessM:0.011}});
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(stale),/wallThicknessM binding does not match/);
const straight=structuredClone(input);
straight.componentRows.find((row)=>row.componentId==='P1').flexibilityAuthority=elbowFlexibility('2023');
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(straight),/cannot carry elbow flexibility authority/);
const tuned=structuredClone(input);tuned.options={maximumCompatibilityResidualM:1e-6};
assert.throws(()=>buildEmpiricalV3SourceBoundMixedComponentRomInput(tuned),/frozen default numerical options only/);

const producerSource=readFileSync(new URL('../src/workspace/engineering-loads/adapters/empirical-v3-source-bound-mixed-component-producer.js',import.meta.url),'utf8');
assert.doesNotMatch(producerSource,/solveRooted|solveLinear|calculatePrismatic|calculateCircularElbowVirtualWork|chainageDistribution|topology-edit/i);
assert.match(producerSource,/requireEmpiricalV3SourceBoundMixedRestraintBinding/);
assert.match(producerSource,/governedRestraintBindingRequired:true/);
assert.match(producerSource,/executionEnabled:false/);
const bindingSource=readFileSync(new URL('../src/workspace/engineering-loads/adapters/empirical-v3-source-bound-mixed-restraint-binding.js',import.meta.url),'utf8');
assert.match(bindingSource,/requireSjsonEmpiricalPipingRequest/);
assert.match(bindingSource,/validateSupportAttachmentModel/);
assert.match(bindingSource,/validateRestraintCapabilityModel/);
assert.match(bindingSource,/requirePreproductionThermalLiftoffDisplacementAuthority/);
assert.match(bindingSource,/READY_FOR_RUNTIME_BRIDGE/);
assert.match(bindingSource,/qualification !== 'EXPLICIT'/);
assert.match(bindingSource,/SOURCE_BACKED_SUPPORT_DISPLACEMENT/);
assert.match(bindingSource,/attachedPortKey/);
assert.match(bindingSource,/supportStationSplittingPerformed: false/);
assert.match(bindingSource,/targetDisplacementDerivedHere: true/);
assert.doesNotMatch(bindingSource,/solveRooted|solveLinear|chainageDistribution|topology-edit/i);
console.log('PASS empirical v3 mixed restraint binding / component input producer qualification');

function binding(routeValue){
  const material={
    schema:'empirical-v3-source-bound-mixed-restraint-binding/v1',
    requestRef:{ref:'SCENARIO:1',semanticHash:'fnv1a64:3000000000000001'},
    attachmentModelRef:{ref:'MIXED:SOURCE',semanticHash:'fnv1a64:3000000000000002'},
    restraintModelRef:{ref:'MIXED:SOURCE',semanticHash:'fnv1a64:3000000000000003'},
    routeRef:{ref:routeValue.connectedComponentId,semanticHash:routeValue.semanticHash},
    loadCaseId:'OPE',
    root:{restraintId:'R0',supportSiteId:'S0',attachmentId:'A0',nodeId:'N0',movementAuthorityRef:{ref:'M0',semanticHash:'fnv1a64:3000000000000004'}},
    coordinates:[{coordinateId:'TIP-X',restraintId:'TIP-X',supportSiteId:'S1',attachmentId:'A1',nodeId:'N3',direction:[1,0,0],targetDisplacementM:0,supportStiffnessNPerM:null,movementAuthorityRef:{ref:'M1',semanticHash:'fnv1a64:3000000000000005'}}],
    movementRecords:[],
    policy:{explicitRestraintQualificationOnly:true,sourceBackedSupportMovementOnly:true,qualifiedMovementOnly:true,existingCanonicalRouteNodesOnly:true,attachedPortOnly:true,supportStationSplittingPerformed:false,chainageConsumed:false,contactGapFrictionSolved:false,targetDisplacementDerivedHere:true,mechanicsSolved:false},
  };
  const hash=semanticHash(material);
  return Object.freeze({...material,bindingId:`mixed-restraint:${hash.slice('fnv1a64:'.length)}`,semanticHash:hash});
}
function rehashBinding(value){const{bindingId:_id,semanticHash:_hash,...material}=value;const hash=semanticHash(material);return{...material,bindingId:`mixed-restraint:${hash.slice('fnv1a64:'.length)}`,semanticHash:hash};}
function mixedRoute(){
  const geometry=normalizeCircularElbowGeometry({componentId:'E1',startPointM:[0,0,0],endPointM:[1,1,0],centerPointM:[0,1,0],planeNormal:[0,0,1]});
  const material={schema:'empirical-canonical-component-rom-route/v1',datasetId:'MIXED:SOURCE',connectedComponentId:'REGION:1',topologyGraphSemanticHash:'fnv1a64:1000000000000001',sharedModelSemanticHash:'fnv1a64:1000000000000002',nodes:[node('N0',-2,0,0,'P1:A'),node('N1',0,0,0,'P1:B','E1:A'),node('N2',1,1,0,'E1:B','P2:A'),node('N3',1,3,0,'P2:B')],components:[{componentId:'P1',sourceType:'PIPE',kind:'STRAIGHT',nodeAId:'N0',nodeBId:'N1',sourcePortKeys:['P1:A','P1:B'],geometry:null,geometryAuthoritySemanticHash:null},{componentId:'E1',sourceType:'BEND',kind:'CIRCULAR_ELBOW',nodeAId:'N1',nodeBId:'N2',sourcePortKeys:['E1:A','E1:B'],geometry,geometryAuthoritySemanticHash:'fnv1a64:1000000000000003'},{componentId:'P2',sourceType:'PIPE',kind:'STRAIGHT',nodeAId:'N2',nodeBId:'N3',sourcePortKeys:['P2:A','P2:B'],geometry:null,geometryAuthoritySemanticHash:null}],evidence:{topologyAuthority:'VALIDATED_EXACT_PIPING_PORT_TOPOLOGY_GRAPH',toleranceInferredTopologyConsumed:false,finiteElementDiscretizationCreated:false}};
  return Object.freeze({...material,semanticHash:semanticHash(material)});
}
function componentRow(component){const quantities=commonQuantities(component.componentId);if(component.kind==='CIRCULAR_ELBOW'){quantities.OUTER_DIAMETER=exactQuantity(component.componentId,'OUTER_DIAMETER',0.2,'m');quantities.WALL_THICKNESS=exactQuantity(component.componentId,'WALL_THICKNESS',0.01,'m');quantities.PRESSURE=exactQuantity(component.componentId,'PRESSURE',0,'Pa');}return{componentId:component.componentId,quantities,flexibilityAuthority:component.kind==='CIRCULAR_ELBOW'?elbowFlexibility('2023'):null};}
function commonQuantities(scopeRef){return{ELASTIC_MODULUS:exactQuantity(scopeRef,'ELASTIC_MODULUS',200e9,'Pa'),SHEAR_MODULUS:exactQuantity(scopeRef,'SHEAR_MODULUS',76.923076923e9,'Pa'),AREA:exactQuantity(scopeRef,'AREA',0.004,'m2'),SECOND_MOMENT_Y:exactQuantity(scopeRef,'SECOND_MOMENT_Y',8e-6,'m4'),SECOND_MOMENT_Z:exactQuantity(scopeRef,'SECOND_MOMENT_Z',8e-6,'m4'),TORSION_CONSTANT:exactQuantity(scopeRef,'TORSION_CONSTANT',1.6e-5,'m4'),REFERENCE_TEMPERATURE:exactQuantity(scopeRef,'REFERENCE_TEMPERATURE',20,'degC'),ANALYSIS_TEMPERATURE:exactQuantity(scopeRef,'ANALYSIS_TEMPERATURE',120,'degC'),EXPANSION_COEFFICIENT:exactQuantity(scopeRef,'EXPANSION_COEFFICIENT',1e-5,'1/K')};}
function exactQuantity(scopeRef,quantityKind,value,unit){return sealEngineeringQuantityAuthority({schema:ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,quantityId:`Q:${scopeRef}:${quantityKind}`,quantityKind,scopeRef,value,unit,authorityClass:'SOURCE_EXACT',sourceBinding:{sourceType:'GOVERNED_FIXTURE',sourceReference:`fixture:${scopeRef}:${quantityKind}`,sourceSemanticHash:`source:${scopeRef}`,evidenceRef:`evidence:${scopeRef}:${quantityKind}`,evidenceHash:`hash:${scopeRef}:${quantityKind}`},derivation:null,riskRefs:[],confirmationRef:null});}
function inferredQuantity(scopeRef,quantityKind,value,unit){return sealEngineeringQuantityAuthority({schema:ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,quantityId:`Q:${scopeRef}:${quantityKind}:INF`,quantityKind,scopeRef,value,unit,authorityClass:'INFERRED_REVIEW_REQUIRED',sourceBinding:null,derivation:null,riskRefs:['risk:inferred'],confirmationRef:null});}
function elbowFlexibility(edition){return createEmpiricalElbowFlexibilityAuthority(authorityInput(edition));}
function authorityInput(edition){return{schema:'empirical-elbow-flexibility-authority/v1',authorityId:`B31J:E1:${edition}`,componentId:'E1',basis:'CODE_COMPONENT_FLEXIBILITY',inPlaneFlexibilityFactor:2.5,outOfPlaneFlexibilityFactor:2.5,torsionalFlexibilityFactor:1,source:{standard:'ASME_B31J',edition,ruleId:'B31J:FLEX',sourceSemanticHash:'fnv1a64:2000000000000001',factorResultSemanticHash:'fnv1a64:2000000000000002'},geometryBinding:{bendRadiusM:1,outerDiameterM:0.2,wallThicknessM:0.01,pressurePa:0,elasticModulusPa:200e9}};}
function node(id,x,y,z,...ports){return{id,pointM:{x,y,z},sourcePortKeys:ports};}
