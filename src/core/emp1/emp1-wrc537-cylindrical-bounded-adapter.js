import { EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY,evaluateEmp1Wrc537DatasetCurve,selectEmp1Wrc537CylindricalDatasetCurve } from './emp1-wrc537-cylindrical-index.js';
import { requireEmp1Wrc537BoundedDomain } from './emp1-wrc537-cylindrical-bounded-domain.js';
import { buildEmp1Wrc537CylindricalFrame,emp1GlobalLoadsToWrc537 } from './emp1-wrc537-cylindrical-frame.js';
import { evaluateEmp1Wrc537CylindricalTable5 } from './emp1-wrc537-cylindrical-table5.js';
import { requireEmp1Wrc537ComparisonLoadCustody,requireEmp1Wrc537QualifiedLoadCustody } from './emp1-wrc537-load-custody.js';
import { resolveEmp1Wrc537LongitudinalMomentBendingSelection } from './emp1-wrc537-longitudinal-moment-curve-selection.js';
import { evaluateEmp1Wrc537CylindricalApplicability,requireEmp1Wrc537CylindricalApplicabilityForNumerics } from './emp1-wrc537-cylindrical-applicability.js';
export const EMP1_WRC537_BOUNDED_ADAPTER_SCHEMA='emp1-wrc537-cylindrical-bounded-adapter-result/v8';
export const EMP1_WRC537_R0_BASIS='OUTSIDE_RADIUS_AT_SHELL_JUNCTURE';
const FIGURE_BASE=deepFreeze({circ:{Pmem_AB:'4C',Pmem_CD:'3C',Pbend_AB:'2C-1',Pbend_CD:'1C',Mcmem:'3A',Mcbend:'1A',Mlmem:'3B'},long:{Pmem_AB:'3C',Pmem_CD:'4C',Pbend_AB:'1C-1',Pbend_CD:'2C',Mcmem:'4A',Mcbend:'2A',Mlmem:'4B'}});
const UNIT_SYSTEMS=deepFreeze({SI_MM:{force:'N',length:'mm',moment:'N*mm',stress:'N/mm^2'},US_IN:{force:'lbf',length:'in',moment:'lbf*in',stress:'psi'}});const ROUND_OFF_RELATIVE_TOLERANCE=1e-12;
export function evaluateEmp1Wrc537CylindricalBoundedAdapter(input){const custody=requireEmp1Wrc537ComparisonLoadCustody(input?.loadCustody);return evaluateWithCustody(input,custody,'EVALUATED_BOUNDED_GAMMA5_TABLE5_COMPARISON',false);}
export function evaluateEmp1Wrc537CylindricalBoundedQualifiedNumerics(input,{expectedProducerQualificationHash}={}){const custody=requireEmp1Wrc537QualifiedLoadCustody(input?.loadCustody,{expectedProducerQualificationHash});return evaluateWithCustody(input,custody,'EVALUATED_BOUNDED_GAMMA5_TABLE5_QUALIFIED_INPUT',true);}
export function deriveEmp1Wrc537CylindricalBoundedGeometry(value){return deriveGeometry(value,true);}
function evaluateWithCustody(input,loadCustody,state,qualifiedInputAuthority){
  if(!input||typeof input!=='object'||Array.isArray(input)) throw adapterError('EMP1_WRC537_BOUNDED_ADAPTER_INPUT_REQUIRED');
  const units=normalizeUnits(input.units),geometry=deriveGeometry(input.geometry,qualifiedInputAuthority),lmSelection=resolveEmp1Wrc537LongitudinalMomentBendingSelection(input.longitudinalMomentBendingSelection),figures=figureMap(lmSelection);
  const sourceDocumentSha256=requiredString(input.sourceDocumentSha256,'SOURCE_SHA256'),datasetHash=requiredString(input.datasetHash,'DATASET_HASH'),variant=requiredString(input.variant,'VARIANT');
  const domain=requireEmp1Wrc537BoundedDomain({shellFamily:input.shellFamily,attachmentShape:input.attachmentShape,sourceDocumentSha256,datasetHash,variant,gamma:geometry.gamma,beta:geometry.beta});
  const frame=buildEmp1Wrc537CylindricalFrame({vesselCenterlineGlobal:input.axes?.vesselCenterlineGlobal,nozzleCenterlineGlobal:input.axes?.nozzleCenterlineGlobal});
  const wrcLoads=emp1GlobalLoadsToWrc537(frame,{forceGlobal:input.loadsAtWrcReference?.forceGlobal,momentGlobal:input.loadsAtWrcReference?.momentGlobal});
  const applicability=evaluateEmp1Wrc537CylindricalApplicability({meanRadius:geometry.meanRadius,loads:wrcLoads,evidence:input.applicabilityEvidence});
  requireEmp1Wrc537CylindricalApplicabilityForNumerics(applicability);
  const curveEvaluation=evaluateFigureSet({figures,variant,gamma:geometry.gamma,beta:geometry.beta});
  const table5=evaluateEmp1Wrc537CylindricalTable5({geometry:{meanRadius:geometry.meanRadius,shellThickness:geometry.shellThickness,attachmentRadius:geometry.attachmentOutsideRadius,beta:geometry.beta},stressConcentration:input.stressConcentration,loads:wrcLoads,curveOrdinates:curveEvaluation.ordinates});
  return deepFreeze({schema:EMP1_WRC537_BOUNDED_ADAPTER_SCHEMA,state,engineeringComparisonUseAuthorized:true,engineeringApplicabilityAuthorized:false,qualifiedInputAuthority,productionRouteAuthority:false,globalEmp1CRouteAuthority:false,sourceDocumentSha256,datasetHash,datasetIdentity:EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY,units,domain,geometry,applicability,stressScope:table5.stressScope,extremaScope:table5.extremaScope,loadCustody,frame,wrcLoads,longitudinalMomentBendingSelection:lmSelection,curveFigureMap:figures,curveSelections:curveEvaluation.selections,curveOrdinates:curveEvaluation.ordinates,table5,stresses:table5.stresses});
}
function figureMap(selection){return deepFreeze({circ:{...FIGURE_BASE.circ,Mlbend:selection.circumferentialFigure},long:{...FIGURE_BASE.long,Mlbend:selection.longitudinalFigure}});}
function deriveGeometry(value,requireOutsideRadiusAuthority=false){
  if(!value||typeof value!=='object'||Array.isArray(value)) throw adapterError('EMP1_WRC537_BOUNDED_GEOMETRY_REQUIRED');
  const meanRadius=positive(value.meanRadius,'MEAN_RADIUS'),shellThickness=positive(value.shellThickness,'SHELL_THICKNESS');
  const hasOutside=value.attachmentOutsideRadius!=null,hasLegacy=value.attachmentRadius!=null;
  if(requireOutsideRadiusAuthority&&!hasOutside) throw adapterError('EMP1_WRC537_BOUNDED_ATTACHMENT_OUTSIDE_RADIUS_REQUIRED');
  if(!hasOutside&&!hasLegacy) throw adapterError('EMP1_WRC537_BOUNDED_ATTACHMENT_OUTSIDE_RADIUS_REQUIRED');
  const attachmentOutsideRadius=positive(hasOutside?value.attachmentOutsideRadius:value.attachmentRadius,hasOutside?'ATTACHMENT_OUTSIDE_RADIUS':'ATTACHMENT_RADIUS');
  if(hasOutside&&hasLegacy&&!roundOffEquivalent(value.attachmentRadius,attachmentOutsideRadius)) throw adapterError('EMP1_WRC537_BOUNDED_ATTACHMENT_RADIUS_ALIAS_MISMATCH');
  const attachmentRadiusBasis=hasOutside?EMP1_WRC537_R0_BASIS:'LEGACY_UNQUALIFIED_ATTACHMENT_RADIUS';
  const gamma=meanRadius/shellThickness,beta=0.875*attachmentOutsideRadius/meanRadius;
  if(value.gamma!=null&&!roundOffEquivalent(value.gamma,gamma)) throw adapterError('EMP1_WRC537_BOUNDED_DECLARED_GAMMA_MISMATCH');
  if(value.beta!=null&&!roundOffEquivalent(value.beta,beta)) throw adapterError('EMP1_WRC537_BOUNDED_DECLARED_BETA_MISMATCH');
  return deepFreeze({meanRadius,shellThickness,attachmentOutsideRadius,attachmentRadius:attachmentOutsideRadius,attachmentRadiusBasis,gamma,beta,gammaEquation:'Rm/T',betaEquation:'0.875*r0/Rm',r0Definition:'OUTSIDE_RADIUS_OF_CYLINDRICAL_ATTACHMENT_AT_SHELL_JUNCTURE',declaredGamma:value.gamma??null,declaredBeta:value.beta??null});
}
function evaluateFigureSet({figures,variant,gamma,beta}){const selections={circ:{},long:{}} ,ordinates={circ:{},long:{}};for(const family of ['circ','long']) for(const [quantity,figure] of Object.entries(figures[family])){const curve=selectEmp1Wrc537CylindricalDatasetCurve({figure,variant,gamma}),evaluation=evaluateEmp1Wrc537DatasetCurve(curve,beta);if(evaluation.y<0) throw adapterError(`EMP1_WRC537_BOUNDED_NEGATIVE_ORDINATE:${figure}:${evaluation.y}`);selections[family][quantity]=deepFreeze({figure:curve.figure,variant:curve.variant,sourceGamma:curve.gamma,pdfPage:curve.pdfPage,sourceDocumentSha256:curve.sourceDocumentSha256,datasetHash:curve.datasetHash,interpolationUsed:curve.interpolationUsed,extrapolationFallbackUsed:curve.extrapolationFallbackUsed});ordinates[family][quantity]=evaluation.y;}return deepFreeze({selections,ordinates});}
function normalizeUnits(value){if(!value||typeof value!=='object'||Array.isArray(value)) throw adapterError('EMP1_WRC537_BOUNDED_UNITS_REQUIRED');for(const [system,contract] of Object.entries(UNIT_SYSTEMS)) if(Object.entries(contract).every(([key,expected])=>value[key]===expected)) return deepFreeze({system,...contract});throw adapterError('EMP1_WRC537_BOUNDED_UNITS_UNSUPPORTED');}
function positive(value,label){if(!Number.isFinite(value)||value<=0) throw adapterError(`EMP1_WRC537_BOUNDED_${label}_INVALID`);return Number(value);}function requiredString(value,label){if(typeof value!=='string'||!value.trim()) throw adapterError(`EMP1_WRC537_BOUNDED_${label}_REQUIRED`);return value.trim();}function roundOffEquivalent(actual,source){return Number.isFinite(actual)&&Math.abs(actual-source)<=Math.max(1,Math.abs(source))*ROUND_OFF_RELATIVE_TOLERANCE;}function adapterError(code){const error=new TypeError(code);error.code=code;return error;}function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
