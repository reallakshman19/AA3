import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { requireEmpiricalElbowFlexibilityAuthority } from '../../../core/empirical-piping-mechanics/circular-elbow-flexibility.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import { requireEngineeringQuantityAuthority } from '../../../core/empirical-v3-safety/quantity-authority.js';
import { requireCanonicalComponentRomRoute } from './canonical-component-rom-route.js';
import { requireEmpiricalV3SourceBoundMixedRestraintBinding } from './empirical-v3-source-bound-mixed-restraint-binding.js';

export const EMPIRICAL_V3_SOURCE_BOUND_MIXED_COMPONENT_ROM_INPUT_SCHEMA = 'empirical-v3-source-bound-mixed-component-rom-input/v1';
const EXACT_CLASSES = new Set(['SOURCE_EXACT','APPROVED_MASTER_EXACT','DERIVED_EXACT']);
const COMMON_QUANTITIES = Object.freeze({
  ELASTIC_MODULUS:['Pa','elasticModulusPa'],SHEAR_MODULUS:['Pa','shearModulusPa'],AREA:['m2','areaM2'],
  SECOND_MOMENT_Y:['m4','secondMomentYM4'],SECOND_MOMENT_Z:['m4','secondMomentZM4'],TORSION_CONSTANT:['m4','torsionConstantM4'],
  REFERENCE_TEMPERATURE:['degC','referenceTemperatureC'],ANALYSIS_TEMPERATURE:['degC','analysisTemperatureC'],EXPANSION_COEFFICIENT:['1/K','expansionCoefficientPerK'],
});
const ELBOW_BINDING_QUANTITIES = Object.freeze({OUTER_DIAMETER:['m','outerDiameterM'],WALL_THICKNESS:['m','wallThicknessM'],PRESSURE:['Pa','pressurePa']});

/** Produces frozen mixed ROM input; no solve, support split, inference, or numerical tuning. */
export function buildEmpiricalV3SourceBoundMixedComponentRomInput(input) {
  exactKeys(input,['route','componentRows','restraintBinding','options'],'mixed-component producer input');
  const route=requireCanonicalComponentRomRoute(input.route);requireEmptyOptions(input.options);
  const binding=requireEmpiricalV3SourceBoundMixedRestraintBinding(input.restraintBinding);
  if(binding.routeRef.semanticHash!==route.semanticHash||binding.routeRef.ref!==route.connectedComponentId)throw new Error('Mixed restraint binding does not belong to the supplied canonical route.');
  const rows=requireComponentRows(input.componentRows,route.components),byId=new Map(rows.map((row)=>[row.componentId,row]));
  const authorityRecords=[];
  const mechanicsComponents=route.components.map((component)=>{
    const row=byId.get(component.componentId),requiredKinds=component.kind==='CIRCULAR_ELBOW'?[...Object.keys(COMMON_QUANTITIES),...Object.keys(ELBOW_BINDING_QUANTITIES)]:Object.keys(COMMON_QUANTITIES);
    requireExactQuantityKeys(row.quantities,requiredKinds,component.componentId);
    const common=requireQuantitySet(row.quantities,COMMON_QUANTITIES,component.componentId);authorityRecords.push(...Object.values(common));
    let flexibilityAuthority=null;
    if(component.kind==='CIRCULAR_ELBOW'){
      const elbow=requireQuantitySet(row.quantities,ELBOW_BINDING_QUANTITIES,component.componentId);authorityRecords.push(...Object.values(elbow));
      flexibilityAuthority=requireSourceBoundElbowAuthority(row.flexibilityAuthority,component,common,elbow);
    }else if(row.flexibilityAuthority!==null)throw new Error(`Straight component ${component.componentId} cannot carry elbow flexibility authority.`);
    return deepFreeze({componentId:component.componentId,kind:component.kind,nodeAId:component.nodeAId,nodeBId:component.nodeBId,properties:projectProperties(common),thermal:projectThermal(common),geometry:component.kind==='CIRCULAR_ELBOW'?component.geometry:null,flexibilityAuthority});
  });
  const romInput=deepFreeze({
    nodes:route.nodes.map((node)=>({id:node.id,pointM:node.pointM})),components:mechanicsComponents,rootNodeId:binding.root.nodeId,
    coordinates:binding.coordinates.map((row)=>({coordinateId:row.coordinateId,nodeId:row.nodeId,direction:row.direction,targetDisplacementM:row.targetDisplacementM,supportStiffnessNPerM:row.supportStiffnessNPerM})),options:{},
  });
  const authorityRefs=uniqueRefs([
    {ref:binding.bindingId,semanticHash:binding.semanticHash},...authorityRecords.map(quantityRef),
    ...mechanicsComponents.filter((row)=>row.flexibilityAuthority).map((row)=>({ref:row.flexibilityAuthority.authorityId,semanticHash:row.flexibilityAuthority.semanticHash})),
  ]);
  const material={
    schema:EMPIRICAL_V3_SOURCE_BOUND_MIXED_COMPONENT_ROM_INPUT_SCHEMA,routeRef:{ref:route.connectedComponentId,semanticHash:route.semanticHash},
    restraintBinding:binding,bindingRef:{ref:binding.bindingId,semanticHash:binding.semanticHash},romInput,authorityRefs,authorityRecords:dedupeQuantities(authorityRecords),
    policy:{exactQuantityAuthorityOnly:true,governedRestraintBindingRequired:true,sourceBackedSupportMovementOnly:true,existingCanonicalRouteNodesOnly:true,supportStationSplittingPerformed:false,chainageConsumed:false,toleranceTopologyConsumed:false,benchmarkElbowFlexibilityAccepted:false,mechanicsSolved:false,numericalOptionsOverridden:false,executionEnabled:false},
  };
  const hash=semanticHash(material);return deepFreeze({...material,producerId:`mixed-rom-input:${hash.slice('fnv1a64:'.length)}`,semanticHash:hash});
}

export function requireEmpiricalV3SourceBoundMixedComponentRomInput(value){if(!value||value.schema!==EMPIRICAL_V3_SOURCE_BOUND_MIXED_COMPONENT_ROM_INPUT_SCHEMA)throw new TypeError(`Expected schema ${EMPIRICAL_V3_SOURCE_BOUND_MIXED_COMPONENT_ROM_INPUT_SCHEMA}.`);const{producerId,semanticHash:actual,...material}=value,expected=semanticHash(material);if(actual!==expected||producerId!==`mixed-rom-input:${expected.slice('fnv1a64:'.length)}`)throw new Error('Source-bound mixed-component ROM input identity mismatch.');requireEmpiricalV3SourceBoundMixedRestraintBinding(value.restraintBinding);return deepFreeze(value);}
function requireComponentRows(value,components){if(!Array.isArray(value)||value.length!==components.length)throw new TypeError('componentRows must cover every route component exactly once.');const map=new Map();for(const[index,row]of value.entries()){exactKeys(row,['componentId','quantities','flexibilityAuthority'],`componentRows[${index}]`);const id=text(row.componentId,`componentRows[${index}].componentId`);if(map.has(id))throw new Error(`Duplicate component row ${id}.`);map.set(id,row);}for(const component of components)if(!map.has(component.componentId))throw new Error(`Missing component row ${component.componentId}.`);return[...map.values()];}
function requireExactQuantityKeys(value,keys,componentId){if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort()))throw new TypeError(`Quantities for ${componentId} must contain exactly the qualified quantity kinds.`);}
function requireQuantitySet(value,definitions,componentId){const accepted={};for(const[kind,[unit]]of Object.entries(definitions))accepted[kind]=requireExactQuantity(value[kind],kind,componentId,unit);return accepted;}
function requireExactQuantity(value,kind,scopeRef,unit){const quantity=requireEngineeringQuantityAuthority(value);if(quantity.quantityKind!==kind||quantity.scopeRef!==scopeRef||quantity.unit!==unit)throw new Error(`${kind} authority must bind ${scopeRef} in ${unit}.`);if(!EXACT_CLASSES.has(quantity.authorityClass))throw new Error(`${kind} for ${scopeRef} is not exact source/master/derived authority.`);return quantity;}
function requireSourceBoundElbowAuthority(value,component,common,elbow){const authority=requireEmpiricalElbowFlexibilityAuthority(value);if(authority.componentId!==component.componentId)throw new Error(`Elbow flexibility authority component mismatch for ${component.componentId}.`);if(authority.source.standard!=='ASME_B31J'||/BENCHMARK/i.test(authority.source.edition))throw new Error(`Elbow ${component.componentId} requires non-benchmark ASME B31J flexibility authority.`);const expected={bendRadiusM:component.geometry.radiusM,outerDiameterM:elbow.OUTER_DIAMETER.value,wallThicknessM:elbow.WALL_THICKNESS.value,pressurePa:elbow.PRESSURE.value,elasticModulusPa:common.ELASTIC_MODULUS.value};for(const[field,expectedValue]of Object.entries(expected))if(authority.geometryBinding[field]!==expectedValue)throw new Error(`Elbow ${component.componentId} ${field} binding does not match sealed source authority.`);return authority;}
function projectProperties(q){return Object.fromEntries(Object.entries(COMMON_QUANTITIES).filter(([,v])=>v[1].endsWith('Pa')||v[1].endsWith('M2')||v[1].endsWith('M4')).map(([kind,[,field]])=>[field,q[kind].value]));}
function projectThermal(q){return{referenceTemperatureC:q.REFERENCE_TEMPERATURE.value,analysisTemperatureC:q.ANALYSIS_TEMPERATURE.value,expansionCoefficientPerK:q.EXPANSION_COEFFICIENT.value,coefficientBasis:'CONSTANT_OVER_TEMPERATURE_RANGE'};}
function quantityRef(q){return{ref:q.quantityId,semanticHash:q.semanticHash};}function dedupeQuantities(rows){const map=new Map(rows.map((q)=>[q.quantityId,q]));return[...map.values()].sort((a,b)=>a.quantityId.localeCompare(b.quantityId));}
function uniqueRefs(rows){const map=new Map(rows.map((r)=>{const ref=requireRef(r,'authorityRef');return[`${ref.ref}\u0000${ref.semanticHash}`,ref];}));return[...map.values()].sort((a,b)=>a.ref.localeCompare(b.ref)||a.semanticHash.localeCompare(b.semanticHash));}
function requireRef(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object.`);return{ref:text(value.ref,`${label}.ref`),semanticHash:text(value.semanticHash,`${label}.semanticHash`)};}
function requireEmptyOptions(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length)throw new Error('Mixed-component source-bound qualification uses frozen default numerical options only.');}
function exactKeys(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort()))throw new TypeError(`${label} contains unexpected or missing keys.`);}function text(value,label){const result=String(value??'').trim();if(!result)throw new TypeError(`${label} is required.`);return result;}
