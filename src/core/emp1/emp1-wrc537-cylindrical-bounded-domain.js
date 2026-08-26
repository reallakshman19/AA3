export const EMP1_WRC537_BOUNDED_DOMAIN_SCHEMA='emp1-wrc537-cylindrical-bounded-domain/v1';
export const EMP1_WRC537_BOUNDED_SOURCE_SHA256='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
export const EMP1_WRC537_BOUNDED_DATASET_HASH='fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c';
export const EMP1_WRC537_BOUNDED_GAMMA=5;
export const EMP1_WRC537_BOUNDED_BETA_MIN=0.05;
export const EMP1_WRC537_BOUNDED_BETA_MAX=0.5;
export const EMP1_WRC537_BOUNDED_ROUNDOFF_RELATIVE_TOLERANCE=1e-12;
export const EMP1_WRC537_BOUNDED_VARIANT='ORIGINAL';

export function evaluateEmp1Wrc537BoundedDomain({shellFamily,attachmentShape,sourceDocumentSha256,datasetHash,variant,gamma,beta}){
  const reasons=[];
  if(shellFamily!=='CYLINDRICAL') reasons.push('EMP1_WRC537_BOUNDED_SHELL_FAMILY');
  if(attachmentShape!=='ROUND') reasons.push('EMP1_WRC537_BOUNDED_ATTACHMENT_SHAPE');
  if(sourceDocumentSha256!==EMP1_WRC537_BOUNDED_SOURCE_SHA256) reasons.push('EMP1_WRC537_BOUNDED_SOURCE_SHA');
  if(datasetHash!==EMP1_WRC537_BOUNDED_DATASET_HASH) reasons.push('EMP1_WRC537_BOUNDED_DATASET_HASH');
  if(variant!==EMP1_WRC537_BOUNDED_VARIANT) reasons.push('EMP1_WRC537_BOUNDED_VARIANT');
  if(!positiveFinite(gamma)||!roundOffEquivalent(gamma,EMP1_WRC537_BOUNDED_GAMMA)) reasons.push('EMP1_WRC537_BOUNDED_GAMMA');
  if(!Number.isFinite(beta)||beta<EMP1_WRC537_BOUNDED_BETA_MIN||beta>EMP1_WRC537_BOUNDED_BETA_MAX) reasons.push('EMP1_WRC537_BOUNDED_BETA');
  return deepFreeze({
    schema:EMP1_WRC537_BOUNDED_DOMAIN_SCHEMA,
    status:reasons.length?'BLOCKED_OUTSIDE_QUALIFIED_DOMAIN':'PASS_BOUNDED_DOMAIN',
    engineeringUseAuthorized:reasons.length===0,
    productionRouteAuthority:false,
    fullMethodAuthority:false,
    reasons,
    observed:{shellFamily,attachmentShape,sourceDocumentSha256,datasetHash,variant,gamma,beta},
    qualified:{
      shellFamily:'CYLINDRICAL',attachmentShape:'ROUND',sourceDocumentSha256:EMP1_WRC537_BOUNDED_SOURCE_SHA256,
      datasetHash:EMP1_WRC537_BOUNDED_DATASET_HASH,variant:EMP1_WRC537_BOUNDED_VARIANT,gamma:EMP1_WRC537_BOUNDED_GAMMA,
      betaMinimum:EMP1_WRC537_BOUNDED_BETA_MIN,betaMaximum:EMP1_WRC537_BOUNDED_BETA_MAX,
      machineRoundOffRelativeTolerance:EMP1_WRC537_BOUNDED_ROUNDOFF_RELATIVE_TOLERANCE,
    },
  });
}
export function requireEmp1Wrc537BoundedDomain(input){
  const result=evaluateEmp1Wrc537BoundedDomain(input);
  if(result.status!=='PASS_BOUNDED_DOMAIN'){
    const error=new TypeError(`EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN:${result.reasons.join(',')}`);
    error.code='EMP1_WRC537_OUTSIDE_BOUNDED_DOMAIN';error.reasons=result.reasons;throw error;
  }
  return result;
}
function positiveFinite(value){return Number.isFinite(value)&&value>0;}
function roundOffEquivalent(actual,source){return Math.abs(actual-source)<=Math.max(1,Math.abs(source))*EMP1_WRC537_BOUNDED_ROUNDOFF_RELATIVE_TOLERANCE;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
