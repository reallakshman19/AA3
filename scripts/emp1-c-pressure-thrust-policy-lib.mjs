export const EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA = 'emp1-c-pressure-thrust-policy/v1';
export const PRESSURE_THRUST_MODES = Object.freeze([
  'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',
  'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID',
  'NOT_APPLICABLE_BY_QUALIFIED_METHOD',
]);

/**
 * Resolve the pressure-thrust contribution without inferring whether a supplied
 * external load already contains thrust and without inferring sign from the load.
 * eP is the qualified nozzle/radial unit vector in the cylindrical WRC frame.
 */
export function resolvePressureThrust(policy, eP) {
  validateUnitVector(eP);
  if (!policy || policy.schema !== EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA) throw new TypeError('EMP1_C_PRESSURE_THRUST_POLICY_SCHEMA');
  if (!PRESSURE_THRUST_MODES.includes(policy.mode)) throw new TypeError('EMP1_C_PRESSURE_THRUST_MODE');

  if (policy.mode === 'SOURCE_LOAD_ALREADY_INCLUDES_THRUST') {
    if (policy.sourceLoadThrustCustody !== 'VERIFIED_INCLUDED') throw new TypeError('EMP1_C_PRESSURE_THRUST_INCLUDED_CUSTODY');
    if (!nonEmpty(policy.sourceLoadCustodyHash)) throw new TypeError('EMP1_C_PRESSURE_THRUST_INCLUDED_HASH');
    forbidAddInputs(policy);
    return result(policy, 0, 0, [0,0,0], 'NO_ADDITION_SOURCE_LOAD_ALREADY_INCLUDES_THRUST');
  }

  if (policy.mode === 'NOT_APPLICABLE_BY_QUALIFIED_METHOD') {
    if (!nonEmpty(policy.qualifiedMethodReason) || !nonEmpty(policy.qualifiedMethodRecordHash)) throw new TypeError('EMP1_C_PRESSURE_THRUST_NA_AUTHORITY');
    forbidAddInputs(policy);
    return result(policy, 0, 0, [0,0,0], 'NO_ADDITION_NOT_APPLICABLE_BY_QUALIFIED_METHOD');
  }

  const pressure = finite(policy.pressure, 'pressure');
  const nozzleId = finite(policy.nozzleInsideDiameter, 'nozzleInsideDiameter');
  if (pressure < 0 || nozzleId <= 0) throw new RangeError('EMP1_C_PRESSURE_THRUST_INPUT_DOMAIN');
  if (policy.directionAlongEP !== 1 && policy.directionAlongEP !== -1) throw new TypeError('EMP1_C_PRESSURE_THRUST_DIRECTION_REQUIRED');
  if (!nonEmpty(policy.directionAuthority)) throw new TypeError('EMP1_C_PRESSURE_THRUST_DIRECTION_AUTHORITY');
  if (policy.sourceLoadThrustCustody !== 'VERIFIED_EXCLUDED') throw new TypeError('EMP1_C_PRESSURE_THRUST_DOUBLE_COUNT_GUARD');
  if (!nonEmpty(policy.sourceLoadCustodyHash)) throw new TypeError('EMP1_C_PRESSURE_THRUST_EXCLUDED_HASH');

  const area = Math.PI * nozzleId ** 2 / 4;
  const magnitude = pressure * area;
  const signedP = policy.directionAlongEP * magnitude;
  const vector = eP.map((component) => component * signedP);
  return result(policy, area, magnitude, vector, 'ADD_EXPLICIT_SIGNED_PRESSURE_THRUST');
}

export function applyPressureThrustToWrcP(existingP, resolved) {
  const P = finite(existingP, 'existingP');
  if (!resolved || resolved.schema !== 'emp1-c-pressure-thrust-resolution/v1') throw new TypeError('EMP1_C_PRESSURE_THRUST_RESOLUTION');
  return P + resolved.addedP;
}

function result(policy, area, magnitude, vector, disposition) {
  const addedP = policy.mode === 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID' ? policy.directionAlongEP * magnitude : 0;
  return Object.freeze({
    schema: 'emp1-c-pressure-thrust-resolution/v1',
    mode: policy.mode,
    pressureThrustArea: area,
    pressureThrustMagnitude: magnitude,
    directionAlongEP: policy.mode === 'ADD_PRESSURE_THRUST_FROM_NOZZLE_ID' ? policy.directionAlongEP : null,
    addedP,
    addedForceGlobal: Object.freeze([...vector]),
    disposition,
    doubleCountGuardQualified: true,
    policyRecordHash: policy.policyRecordHash ?? null,
  });
}
function forbidAddInputs(policy) {
  for (const key of ['pressure','nozzleInsideDiameter','directionAlongEP']) {
    if (policy[key] != null) throw new TypeError(`EMP1_C_PRESSURE_THRUST_CONFLICTING_INPUT:${key}`);
  }
}
function validateUnitVector(v) {
  if (!Array.isArray(v) || v.length !== 3 || v.some((x)=>!Number.isFinite(x))) throw new TypeError('EMP1_C_PRESSURE_THRUST_EP_VECTOR');
  const n=Math.sqrt(v.reduce((s,x)=>s+x*x,0));
  if (Math.abs(n-1)>1e-10) throw new TypeError('EMP1_C_PRESSURE_THRUST_EP_NOT_UNIT');
}
function finite(value,name){if(!Number.isFinite(value))throw new TypeError(`EMP1_C_PRESSURE_THRUST_NONFINITE:${name}`);return value;}
function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}
