export const EMP1_WRC537_PRESSURE_THRUST_SCHEMA='emp1-wrc537-pressure-thrust-policy/v1';
export const EMP1_WRC537_PRESSURE_THRUST_MODES=Object.freeze([
  'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',
  'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
  'NOT_APPLICABLE_BY_QUALIFIED_METHOD',
]);

export function resolveEmp1Wrc537PressureThrust(policy,eP){
  validateUnitVector(eP);
  if(!policy||policy.schema!==EMP1_WRC537_PRESSURE_THRUST_SCHEMA) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_POLICY_SCHEMA');
  if(!EMP1_WRC537_PRESSURE_THRUST_MODES.includes(policy.mode)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_MODE');
  if(!nonEmpty(policy.policyRecordHash)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_POLICY_HASH_REQUIRED');

  if(policy.mode==='SOURCE_LOAD_ALREADY_INCLUDES_THRUST'){
    if(policy.sourceLoadThrustCustody!=='VERIFIED_INCLUDED') throw thrustError('EMP1_WRC537_PRESSURE_THRUST_INCLUDED_CUSTODY');
    if(!nonEmpty(policy.sourceLoadCustodyHash)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_INCLUDED_HASH');
    forbidAddInputs(policy);
    return result(policy,0,0,[0,0,0],'NO_ADDITION_SOURCE_LOAD_ALREADY_INCLUDES_THRUST');
  }
  if(policy.mode==='NOT_APPLICABLE_BY_QUALIFIED_METHOD'){
    if(!nonEmpty(policy.qualifiedMethodReason)||!nonEmpty(policy.qualifiedMethodRecordHash)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_NA_AUTHORITY');
    forbidAddInputs(policy);
    return result(policy,0,0,[0,0,0],'NO_ADDITION_NOT_APPLICABLE_BY_QUALIFIED_METHOD');
  }

  const pressure=finite(policy.pressure,'PRESSURE');
  const nozzleId=finite(policy.nozzleInsideDiameter,'NOZZLE_INSIDE_DIAMETER');
  if(pressure<0||nozzleId<=0) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_INPUT_DOMAIN');
  if(policy.directionAlongEP!==1&&policy.directionAlongEP!==-1) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_DIRECTION_REQUIRED');
  if(!nonEmpty(policy.directionAuthority)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_DIRECTION_AUTHORITY');
  if(policy.sourceLoadThrustCustody!=='VERIFIED_EXCLUDED') throw thrustError('EMP1_WRC537_PRESSURE_THRUST_DOUBLE_COUNT_GUARD');
  if(!nonEmpty(policy.sourceLoadCustodyHash)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_EXCLUDED_HASH');
  const area=Math.PI*nozzleId**2/4;
  const magnitude=pressure*area;
  const signedP=policy.directionAlongEP*magnitude;
  return result(policy,area,magnitude,eP.map((component)=>canonicalZero(component*signedP)),'ADD_EXPLICIT_SIGNED_PRESSURE_THRUST');
}

export function applyEmp1Wrc537PressureThrustToP(existingP,resolution){
  if(!Number.isFinite(existingP)) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_EXISTING_P_INVALID');
  if(!resolution||resolution.schema!=='emp1-wrc537-pressure-thrust-resolution/v1') throw thrustError('EMP1_WRC537_PRESSURE_THRUST_RESOLUTION_INVALID');
  return canonicalZero(existingP+resolution.addedP);
}

function result(policy,area,magnitude,vector,disposition){
  const addedP=policy.mode==='ADD_PRESSURE_THRUST_FROM_NOZZLE_ID'?canonicalZero(policy.directionAlongEP*magnitude):0;
  return deepFreeze({
    schema:'emp1-wrc537-pressure-thrust-resolution/v1',
    mode:policy.mode,
    pressureThrustArea:canonicalZero(area),
    pressureThrustMagnitude:canonicalZero(magnitude),
    directionAlongEP:policy.mode==='ADD_PRESSURE_THRUST_FROM_NOZZLE_ID'?policy.directionAlongEP:null,
    addedP,
    addedForceGlobal:vector.map(canonicalZero),
    disposition,
    doubleCountGuardQualified:true,
    policyRecordHash:policy.policyRecordHash,
  });
}
function forbidAddInputs(policy){for(const key of ['pressure','nozzleInsideDiameter','directionAlongEP']) if(policy[key]!=null) throw thrustError(`EMP1_WRC537_PRESSURE_THRUST_CONFLICTING_INPUT:${key}`);}
function validateUnitVector(v){if(!Array.isArray(v)||v.length!==3||v.some((x)=>!Number.isFinite(x))) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_EP_VECTOR');const n=Math.sqrt(v.reduce((s,x)=>s+x*x,0));if(Math.abs(n-1)>1e-10) throw thrustError('EMP1_WRC537_PRESSURE_THRUST_EP_NOT_UNIT');}
function finite(value,label){if(!Number.isFinite(value)) throw thrustError(`EMP1_WRC537_PRESSURE_THRUST_${label}_INVALID`);return value;}
function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}
function canonicalZero(value){return Object.is(value,-0)||value===0?0:value;}
function thrustError(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
