export const EMP1_WRC537_CYL_FRAME_SCHEMA='emp1-wrc537-cylindrical-frame/v1';

export function buildEmp1Wrc537CylindricalFrame({vesselCenterlineGlobal,nozzleCenterlineGlobal,orthogonalityTolerance=1e-10}){
  const eLong=normalize3(vesselCenterlineGlobal,'VESSEL_CENTERLINE');
  const eP=normalize3(nozzleCenterlineGlobal,'NOZZLE_CENTERLINE');
  const alignment=dot(eLong,eP);
  if(Math.abs(alignment)>orthogonalityTolerance) throw frameError(`EMP1_WRC537_FRAME_NON_ORTHOGONAL:${alignment}`);
  const eVc=normalize3(cross(eLong,eP),'CIRCUMFERENTIAL');
  const residual=Math.max(Math.abs(dot(eLong,eP)),Math.abs(dot(eLong,eVc)),Math.abs(dot(eP,eVc)));
  if(residual>orthogonalityTolerance) throw frameError(`EMP1_WRC537_FRAME_ORTHOGONALITY_RESIDUAL:${residual}`);
  return deepFreeze({
    schema:EMP1_WRC537_CYL_FRAME_SCHEMA,
    shellFamily:'CYLINDRICAL',
    axesGlobal:{eLong,eP,eVc},
    forceBasis:{P:eP,Vc:eVc,Vl:eLong},
    momentBasis:{Mc:scale(eLong,-1),Ml:eVc,Mt:scale(eP,-1)},
    orthogonalityResidual:residual,
    orthogonalityTolerance,
  });
}

export function emp1GlobalLoadsToWrc537(frame,{forceGlobal,momentGlobal}){
  validateFrame(frame);
  const F=vector3(forceGlobal,'FORCE_GLOBAL');
  const M=vector3(momentGlobal,'MOMENT_GLOBAL');
  return deepFreeze({
    P:canonicalZero(dot(F,frame.forceBasis.P)),
    Vc:canonicalZero(dot(F,frame.forceBasis.Vc)),
    Vl:canonicalZero(dot(F,frame.forceBasis.Vl)),
    Mc:canonicalZero(dot(M,frame.momentBasis.Mc)),
    Ml:canonicalZero(dot(M,frame.momentBasis.Ml)),
    Mt:canonicalZero(dot(M,frame.momentBasis.Mt)),
  });
}

export function emp1Wrc537LoadsToGlobal(frame,{P,Vc,Vl,Mc,Ml,Mt}){
  validateFrame(frame);
  for(const [name,value] of Object.entries({P,Vc,Vl,Mc,Ml,Mt})) if(!Number.isFinite(value)) throw frameError(`EMP1_WRC537_LOAD_NOT_FINITE:${name}`);
  return deepFreeze({
    forceGlobal:add(add(scale(frame.forceBasis.P,P),scale(frame.forceBasis.Vc,Vc)),scale(frame.forceBasis.Vl,Vl)).map(canonicalZero),
    momentGlobal:add(add(scale(frame.momentBasis.Mc,Mc),scale(frame.momentBasis.Ml,Ml)),scale(frame.momentBasis.Mt,Mt)).map(canonicalZero),
  });
}

function validateFrame(frame){if(!frame||frame.schema!==EMP1_WRC537_CYL_FRAME_SCHEMA) throw frameError('EMP1_WRC537_FRAME_INVALID');}
function vector3(value,label){if(!Array.isArray(value)||value.length!==3||value.some((x)=>!Number.isFinite(x))) throw frameError(`EMP1_WRC537_VECTOR_INVALID:${label}`);return value.map(Number);}
function normalize3(value,label){const v=vector3(value,label);const n=Math.sqrt(dot(v,v));if(!(n>0)) throw frameError(`EMP1_WRC537_VECTOR_ZERO:${label}`);return v.map((x)=>x/n);}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function scale(a,s){return a.map((x)=>x*s);}
function add(a,b){return a.map((x,i)=>x+b[i]);}
function canonicalZero(value){return Object.is(value,-0)||value===0?0:value;}
function frameError(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
