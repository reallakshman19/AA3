export const EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES=Object.freeze({
  AXIS_OF_SYMMETRY:'AXIS_OF_SYMMETRY',
  OFF_AXIS_MAXIMUM:'OFF_AXIS_MAXIMUM',
});
export const EMP1_WRC537_CONNECTION_FLEXIBILITY=Object.freeze({
  FLEXIBLE_NOZZLE:'FLEXIBLE_NOZZLE',
  RIGID_OR_OTHER:'RIGID_OR_OTHER',
  UNRESOLVED:'UNRESOLVED',
});

/**
 * WRC537 Table 5 calls for 1B or 1B-1 and 2B or 2B-1 under longitudinal moment.
 * Section 4.4 identifies the -1 curves as maximum stresses off the axes of
 * symmetry and limits their stated applicability to a round, flexible nozzle
 * connection. Selection is therefore explicit and never inferred from ROUND.
 */
export function resolveEmp1Wrc537LongitudinalMomentBendingSelection(value){
  if(!record(value)) throw selectionError('EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_REQUIRED');
  const mode=value.mode;
  if(mode===EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY){
    return deepFreeze({mode,circumferentialFigure:'1B',longitudinalFigure:'2B',recoveryMeaning:'AXIS_OF_SYMMETRY_VALUE',offAxisMaximum:false,sourceLocator:'WRC537_2013_TABLE5_AND_SECTION_4_4'});
  }
  if(mode===EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.OFF_AXIS_MAXIMUM){
    if(value.attachmentShape!=='ROUND') throw selectionError('EMP1_WRC537_OFF_AXIS_MAXIMUM_REQUIRES_ROUND_ATTACHMENT');
    if(value.connectionFlexibility!==EMP1_WRC537_CONNECTION_FLEXIBILITY.FLEXIBLE_NOZZLE) throw selectionError('EMP1_WRC537_OFF_AXIS_MAXIMUM_REQUIRES_FLEXIBLE_NOZZLE');
    if(typeof value.applicabilitySourceRef!=='string'||!value.applicabilitySourceRef.trim()) throw selectionError('EMP1_WRC537_OFF_AXIS_MAXIMUM_APPLICABILITY_SOURCE_REQUIRED');
    return deepFreeze({mode,circumferentialFigure:'1B-1',longitudinalFigure:'2B-1',recoveryMeaning:'OFF_AXIS_MAXIMUM_VALUE',offAxisMaximum:true,attachmentShape:'ROUND',connectionFlexibility:EMP1_WRC537_CONNECTION_FLEXIBILITY.FLEXIBLE_NOZZLE,applicabilitySourceRef:value.applicabilitySourceRef.trim(),sourceLocator:'WRC537_2013_SECTION_4_4'});
  }
  throw selectionError(`EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODE_UNSUPPORTED:${mode}`);
}
function record(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function selectionError(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
