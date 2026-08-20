const SHA256_HEX=/^[a-f0-9]{64}$/u;

export const EMP1_WRC537_LOAD_CUSTODY_SCHEMA='emp1-wrc537-upstream-load-custody/v1';
export const EMP1_WRC537_LOAD_REFERENCE='WRC_ATTACHMENT_REFERENCE_POINT';
export const EMP1_WRC537_PRESSURE_DISPOSITION='PRESSURE_THRUST_RESOLVED_UPSTREAM';
export const EMP1_WRC537_LOAD_CUSTODY_STATUSES=Object.freeze([
  'PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE',
  'PASS_COMPARISON_FIXTURE_ONLY',
]);
export const EMP1_WRC537_PRESSURE_MODES=Object.freeze([
  'SOURCE_LOAD_ALREADY_INCLUDES_THRUST',
  'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',
  'SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM',
]);
export const EMP1_WRC537_PRODUCER_AUTHORITY_CLASS='WRC_REFERENCE_POINT_LOAD_PRODUCER';

/**
 * Structural parser for the upstream load package used by the bounded WRC537
 * route. It intentionally does not create authority from caller data.
 * Qualification binding is performed by requireEmp1Wrc537QualifiedLoadCustody.
 */
export function normalizeEmp1Wrc537LoadCustody(value){
  if(!record(value)) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_REQUIRED');
  if(value.schema!==EMP1_WRC537_LOAD_CUSTODY_SCHEMA) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_SCHEMA');
  if(!EMP1_WRC537_LOAD_CUSTODY_STATUSES.includes(value.status)) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_STATUS');
  if(value.loadReference!==EMP1_WRC537_LOAD_REFERENCE) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_REFERENCE');
  if(value.pressureThrustDisposition!==EMP1_WRC537_PRESSURE_DISPOSITION) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRESSURE_DISPOSITION');
  const sourceId=nonEmpty(value.sourceId,'SOURCE_ID');
  const loadCaseId=nonEmpty(value.loadCaseId,'LOAD_CASE_ID');
  const sourceLoadCustodyHash=hash(value.sourceLoadCustodyHash,'SOURCE_LOAD_CUSTODY_HASH');
  const loadPackageSemanticHash=hash(value.loadPackageSemanticHash,'LOAD_PACKAGE_SEMANTIC_HASH');
  if(value.productionObservationUsedToSetAuthority!==false) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCTION_OBSERVATION_PROHIBITED');

  const producer=normalizeProducer(value.producerQualification);
  const pressure=normalizePressure(value.pressureThrust);

  if(value.status==='PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE'){
    if(value.engineeringUseAuthorized!==true) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_ENGINEERING_AUTHORITY_REQUIRED');
    if(producer.status!=='PASS_QUALIFIED_WRC_REFERENCE_LOAD_PRODUCER') throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCER_NOT_QUALIFIED');
  } else {
    if(value.engineeringUseAuthorized!==false) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_FIXTURE_CANNOT_CLAIM_ENGINEERING_AUTHORITY');
    if(producer.status!=='COMPARISON_FIXTURE_ONLY') throw custodyError('EMP1_WRC537_LOAD_CUSTODY_FIXTURE_PRODUCER_STATUS');
  }

  return deepFreeze({
    schema:EMP1_WRC537_LOAD_CUSTODY_SCHEMA,
    status:value.status,
    engineeringUseAuthorized:value.engineeringUseAuthorized,
    productionRouteInputAuthorized:false,
    sourceId,loadCaseId,
    loadReference:value.loadReference,
    pressureThrustDisposition:value.pressureThrustDisposition,
    sourceLoadCustodyHash,
    loadPackageSemanticHash,
    productionObservationUsedToSetAuthority:false,
    producerQualification:producer,
    pressureThrust:pressure,
  });
}

/**
 * Bind a runtime load package to a separately qualified producer record.
 * A syntactically valid runtime object cannot satisfy this check unless the
 * method qualification supplies the exact producer qualification SHA-256.
 */
export function requireEmp1Wrc537QualifiedLoadCustody(value,{expectedProducerQualificationHash}={}){
  const normalized=normalizeEmp1Wrc537LoadCustody(value);
  if(normalized.status!=='PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE') throw custodyError('EMP1_WRC537_LOAD_CUSTODY_COMPARISON_FIXTURE_NOT_ROUTE_AUTHORITY');
  const expected=hash(expectedProducerQualificationHash,'EXPECTED_PRODUCER_QUALIFICATION_HASH');
  if(normalized.producerQualification.qualificationRecordHash!==expected) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCER_QUALIFICATION_HASH_MISMATCH');
  return deepFreeze({...normalized,productionRouteInputAuthorized:true});
}

/** Allow only the independently frozen qualification fixture for numerical comparison. */
export function requireEmp1Wrc537ComparisonLoadCustody(value){
  const normalized=normalizeEmp1Wrc537LoadCustody(value);
  if(normalized.status!=='PASS_COMPARISON_FIXTURE_ONLY') throw custodyError('EMP1_WRC537_LOAD_CUSTODY_COMPARISON_FIXTURE_REQUIRED');
  return normalized;
}

function normalizeProducer(value){
  if(!record(value)) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCER_REQUIRED');
  if(value.authorityClass!==EMP1_WRC537_PRODUCER_AUTHORITY_CLASS) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCER_AUTHORITY_CLASS');
  const producerId=nonEmpty(value.producerId,'PRODUCER_ID');
  const qualificationRecordHash=hash(value.qualificationRecordHash,'PRODUCER_QUALIFICATION_HASH');
  if(!['PASS_QUALIFIED_WRC_REFERENCE_LOAD_PRODUCER','COMPARISON_FIXTURE_ONLY'].includes(value.status)) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCER_STATUS');
  if(value.productionObservationUsedToSetAuthority!==false) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRODUCER_PRODUCTION_OBSERVATION_PROHIBITED');
  return deepFreeze({
    producerId,
    authorityClass:value.authorityClass,
    status:value.status,
    qualificationRecordHash,
    productionObservationUsedToSetAuthority:false,
  });
}
function normalizePressure(value){
  if(!record(value)) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRESSURE_REQUIRED');
  if(value.status!=='PASS_RESOLVED_UPSTREAM') throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRESSURE_STATUS');
  if(!EMP1_WRC537_PRESSURE_MODES.includes(value.mode)) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRESSURE_MODE');
  if(value.doubleCountGuardQualified!==true) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_DOUBLE_COUNT_GUARD');
  const policyRecordHash=hash(value.policyRecordHash,'PRESSURE_POLICY_HASH');
  if(value.productionObservationUsedToSetAuthority!==false) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_PRESSURE_PRODUCTION_OBSERVATION_PROHIBITED');
  if(value.mode==='SOURCE_LOAD_ALREADY_INCLUDES_THRUST'&&value.sourceLoadContainsPressureThrust!==true) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_THRUST_INCLUDED_FLAG');
  if(value.mode!=='SOURCE_LOAD_ALREADY_INCLUDES_THRUST'&&value.sourceLoadContainsPressureThrust!==false) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_THRUST_EXCLUDED_FLAG');
  if(value.mode==='SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM'&&value.upstreamAdditionVerified!==true) throw custodyError('EMP1_WRC537_LOAD_CUSTODY_UPSTREAM_THRUST_ADDITION_UNVERIFIED');
  return deepFreeze({
    status:value.status,
    mode:value.mode,
    doubleCountGuardQualified:true,
    sourceLoadContainsPressureThrust:value.sourceLoadContainsPressureThrust,
    upstreamAdditionVerified:value.mode==='SOURCE_LOAD_EXCLUDES_THRUST_ADDED_UPSTREAM'?true:null,
    policyRecordHash,
    productionObservationUsedToSetAuthority:false,
  });
}
function hash(value,label){if(typeof value!=='string'||!SHA256_HEX.test(value)) throw custodyError(`EMP1_WRC537_LOAD_CUSTODY_${label}_INVALID`);return value;}
function nonEmpty(value,label){if(typeof value!=='string'||!value.trim()) throw custodyError(`EMP1_WRC537_LOAD_CUSTODY_${label}_REQUIRED`);return value.trim();}
function record(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function custodyError(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
