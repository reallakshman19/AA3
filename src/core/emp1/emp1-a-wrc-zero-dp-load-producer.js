import { semanticHash } from '../shared-primitives/canonical-json.js';
import { reconstructResultHashes } from '../local-stress/index.js';

export const EMP1_A_WRC_ZERO_DP_PRODUCER_ID='EMP1_A_LAFEA1_ZERO_DP_WRC_REFERENCE_V1';
export const EMP1_A_WRC_ZERO_DP_PRODUCER_AUTHORITY_CLASS='WRC_REFERENCE_POINT_LOAD_PRODUCER';
export const EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256='47a9157ba88a5646021fabd41cd803028e1880c8d6f712095afda429f2c2622b';
export const EMP1_A_WRC_ZERO_DP_PRODUCER_ROUTE_AUTHORIZED=false;
export const EMP1_A_WRC_ZERO_DP_CANDIDATE_SCHEMA='emp1-a-zero-dp-wrc-load-package-candidate/v1';

/**
 * Convert an already-qualified retained LAFEA.1 result into a candidate WRC
 * reference-point load package, but only for exactly zero differential
 * pressure. This function proves mechanics/custody; it does NOT grant route
 * authority until the producer qualification record is independently
 * reobserved and the authorization constant is promoted in a later commit.
 */
export function deriveEmp1AZeroDpWrcLoadPackageCandidate({
  result,
  loadCaseIdentity,
  pressureResultIdentity,
  wrcReferencePointGlobal,
  productionObservationUsedToSetAuthority=false,
}={}){
  if(productionObservationUsedToSetAuthority!==false) throw producerError('EMP1_A_WRC_ZERO_DP_PRODUCTION_OBSERVATION_PROHIBITED');
  validateUpstreamResult(result);
  const hashes=verifyResultHashes(result);
  const load=selectUnique(result.transformedLoadCases,loadCaseIdentity,'LOAD_CASE');
  const pressure=selectUnique(result.pressureStressResults,pressureResultIdentity,'PRESSURE_RESULT');
  const accounting=selectUnique(result.forceMomentAccounting,loadCaseIdentity,'ACCOUNTING','loadCaseIdentity');
  const reference=vector3(wrcReferencePointGlobal,'WRC_REFERENCE_POINT');
  const profile=result.qualification.qualificationProfile;
  const lengthTolerance=toleranceFor(profile,'length',...load.targetPointGlobal,...reference);
  const referenceResidual=load.targetPointGlobal.map((value,index)=>value-reference[index]);
  if(referenceResidual.some((value)=>Math.abs(value)>lengthTolerance)) throw producerError('EMP1_A_WRC_ZERO_DP_REFERENCE_POINT_MISMATCH');
  if(pressure.internalPressure!==pressure.externalPressure) throw producerError('EMP1_A_WRC_ZERO_DP_NONZERO_DIFFERENTIAL_PRESSURE');
  verifyAccounting(accounting);
  verifyLoadResiduals(load);

  const semanticPayload={
    producerId:EMP1_A_WRC_ZERO_DP_PRODUCER_ID,
    authorityClass:EMP1_A_WRC_ZERO_DP_PRODUCER_AUTHORITY_CLASS,
    upstreamResultPayloadSemanticHash:hashes.resultPayloadSemanticHash,
    upstreamExecutionEvidenceHash:hashes.executionEvidenceHash,
    upstreamQualificationEvidenceHash:hashes.qualificationEvidenceHash,
    loadCaseIdentity:load.identity,
    pressureResultIdentity:pressure.identity,
    wrcReferencePointGlobal:reference,
    targetPointGlobal:[...load.targetPointGlobal],
    referenceResidual,
    lengthTolerance,
    forceGlobal:[...load.transformedForceGlobal],
    momentGlobal:[...load.transformedMomentGlobal],
    forceResidualGlobal:[...load.forceResidualGlobal],
    momentResidualGlobal:[...load.momentResidualGlobal],
    commonOriginMomentResidualGlobal:[...load.commonOriginMomentResidualGlobal],
    internalPressure:pressure.internalPressure,
    externalPressure:pressure.externalPressure,
    differentialPressure:0,
    pressureThrust:0,
    pressureMode:'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',
    loadReference:'WRC_ATTACHMENT_REFERENCE_POINT',
    productionObservationUsedToSetAuthority:false,
  };
  const loadPackageSemanticHash=semanticHash(semanticPayload);
  return deepFreeze({
    schema:EMP1_A_WRC_ZERO_DP_CANDIDATE_SCHEMA,
    status:'PASS_ZERO_DP_WRC_LOAD_PACKAGE_CANDIDATE',
    engineeringMechanicsQualified:true,
    productionRouteInputAuthorized:false,
    producerQualificationSha256:EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
    semanticPayload,
    loadPackageSemanticHash,
    sourceLoadCustodyHash:hashes.executionEvidenceHash,
    loadsAtWrcReference:{
      forceGlobal:[...load.transformedForceGlobal],
      momentGlobal:[...load.transformedMomentGlobal],
    },
  });
}

export function createEmp1AZeroDpWrcQualifiedLoadCustody(candidate){
  if(EMP1_A_WRC_ZERO_DP_PRODUCER_ROUTE_AUTHORIZED!==true) throw producerError('EMP1_A_WRC_ZERO_DP_PRODUCER_NOT_AUTHORIZED');
  validateCandidate(candidate);
  return deepFreeze({
    schema:'emp1-wrc537-upstream-load-custody/v1',
    status:'PASS_QUALIFIED_UPSTREAM_LOAD_PACKAGE',
    engineeringUseAuthorized:true,
    sourceId:candidate.semanticPayload.upstreamResultPayloadSemanticHash,
    loadCaseId:candidate.semanticPayload.loadCaseIdentity,
    loadReference:'WRC_ATTACHMENT_REFERENCE_POINT',
    pressureThrustDisposition:'PRESSURE_THRUST_RESOLVED_UPSTREAM',
    sourceLoadCustodyHash:candidate.sourceLoadCustodyHash,
    loadPackageSemanticHash:candidate.loadPackageSemanticHash,
    productionObservationUsedToSetAuthority:false,
    producerQualification:{
      producerId:EMP1_A_WRC_ZERO_DP_PRODUCER_ID,
      authorityClass:EMP1_A_WRC_ZERO_DP_PRODUCER_AUTHORITY_CLASS,
      status:'PASS_QUALIFIED_WRC_REFERENCE_LOAD_PRODUCER',
      qualificationRecordHash:EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
      productionObservationUsedToSetAuthority:false,
    },
    pressureThrust:{
      status:'PASS_RESOLVED_UPSTREAM',
      mode:'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',
      doubleCountGuardQualified:true,
      sourceLoadContainsPressureThrust:false,
      policyRecordHash:EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256,
      productionObservationUsedToSetAuthority:false,
    },
  });
}

function validateUpstreamResult(result){
  if(!record(result)) throw producerError('EMP1_A_WRC_ZERO_DP_RESULT_REQUIRED');
  if(result.schema!=='local-attachment-foundation-result/v1') throw producerError('EMP1_A_WRC_ZERO_DP_RESULT_SCHEMA');
  if(result.qualification?.state!=='ACCEPTED') throw producerError('EMP1_A_WRC_ZERO_DP_RESULT_NOT_ACCEPTED');
  if(result.qualification?.engineeringLevel!=='LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY') throw producerError('EMP1_A_WRC_ZERO_DP_ENGINEERING_LEVEL');
  if(!Array.isArray(result.transformedLoadCases)||!Array.isArray(result.pressureStressResults)||!Array.isArray(result.forceMomentAccounting)) throw producerError('EMP1_A_WRC_ZERO_DP_RESULT_EVIDENCE_MISSING');
}
function verifyResultHashes(result){
  if(!record(result.semanticHashes)) throw producerError('EMP1_A_WRC_ZERO_DP_RESULT_HASHES_REQUIRED');
  const actual=reconstructResultHashes(result);
  for(const [key,value] of Object.entries(actual)) if(result.semanticHashes[key]!==value) throw producerError(`EMP1_A_WRC_ZERO_DP_RESULT_HASH_DRIFT:${key}`);
  return actual;
}
function verifyAccounting(accounting){
  if(accounting.accepted!==true) throw producerError('EMP1_A_WRC_ZERO_DP_ACCOUNTING_NOT_ACCEPTED');
  for(const [key,toleranceKey] of [['forceResidualGlobal','force'],['momentResidualGlobal','moment'],['commonOriginMomentResidualGlobal','commonOriginMoment']]){
    const residual=vector3(accounting[key],`ACCOUNTING_${key}`);const tolerance=accounting.tolerances?.[toleranceKey];
    if(!Number.isFinite(tolerance)||tolerance<0) throw producerError(`EMP1_A_WRC_ZERO_DP_ACCOUNTING_TOLERANCE:${toleranceKey}`);
    if(residual.some((value)=>Math.abs(value)>tolerance)) throw producerError(`EMP1_A_WRC_ZERO_DP_ACCOUNTING_RESIDUAL:${key}`);
  }
}
function verifyLoadResiduals(load){
  for(const [key,toleranceKey] of [['forceResidualGlobal','force'],['momentResidualGlobal','moment'],['commonOriginMomentResidualGlobal','commonOriginMoment']]){
    const residual=vector3(load[key],`LOAD_${key}`);const tolerance=load.tolerances?.[toleranceKey];
    if(!Number.isFinite(tolerance)||tolerance<0) throw producerError(`EMP1_A_WRC_ZERO_DP_LOAD_TOLERANCE:${toleranceKey}`);
    if(residual.some((value)=>Math.abs(value)>tolerance)) throw producerError(`EMP1_A_WRC_ZERO_DP_LOAD_RESIDUAL:${key}`);
  }
}
function validateCandidate(value){
  if(!record(value)||value.schema!==EMP1_A_WRC_ZERO_DP_CANDIDATE_SCHEMA||value.status!=='PASS_ZERO_DP_WRC_LOAD_PACKAGE_CANDIDATE') throw producerError('EMP1_A_WRC_ZERO_DP_CANDIDATE_INVALID');
  if(value.producerQualificationSha256!==EMP1_A_WRC_ZERO_DP_PRODUCER_QUALIFICATION_SHA256) throw producerError('EMP1_A_WRC_ZERO_DP_CANDIDATE_QUALIFICATION_HASH');
  if(value.loadPackageSemanticHash!==semanticHash(value.semanticPayload)) throw producerError('EMP1_A_WRC_ZERO_DP_CANDIDATE_HASH_DRIFT');
}
function selectUnique(rows,identity,label,key='identity'){
  if(typeof identity!=='string'||!identity.trim()) throw producerError(`EMP1_A_WRC_ZERO_DP_${label}_IDENTITY_REQUIRED`);
  const matches=rows.filter((row)=>row?.[key]===identity);
  if(matches.length!==1) throw producerError(`EMP1_A_WRC_ZERO_DP_${label}_NOT_UNIQUE`);
  return matches[0];
}
function toleranceFor(profile,quantity,...values){
  const rule=profile?.tolerances?.[quantity];
  if(!record(rule)||!Number.isFinite(rule.absolute)||!Number.isFinite(rule.relative)||rule.absolute<0||rule.relative<0) throw producerError(`EMP1_A_WRC_ZERO_DP_TOLERANCE_PROFILE:${quantity}`);
  return rule.absolute+rule.relative*Math.max(1,...values.map((value)=>Math.abs(value)));
}
function vector3(value,label){if(!Array.isArray(value)||value.length!==3||value.some((v)=>!Number.isFinite(v))) throw producerError(`EMP1_A_WRC_ZERO_DP_${label}_INVALID`);return value.map(Number);}
function record(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function producerError(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
