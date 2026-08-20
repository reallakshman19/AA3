import {
  EMP1_WRC537_CYL_COEFFICIENT_ORDER,
  EMP1_WRC537_CYL_CURVES,
  EMP1_WRC537_CYL_DATASET_HASH,
  EMP1_WRC537_CYL_EXCLUDED,
  EMP1_WRC537_CYL_PACKAGE_COUNTS,
  EMP1_WRC537_CYL_SOURCE_SHA256,
} from './emp1-wrc537-cylindrical-data.generated.js';

const ROUND_OFF_RELATIVE_TOLERANCE=1e-12;
const VARIANT_CODE=Object.freeze({ORIGINAL:'O',EXTRAPOLATED:'E'});
const FIGURE_ALIASES=Object.freeze({
  '1B1':'1B-1','1C1':'1C-1','2B1':'2B-1','2C1':'2C-1',
});
const index=new Map();
for(const row of EMP1_WRC537_CYL_CURVES){
  const [figure,variantCode,gamma,pdfPage,...coefficients]=row;
  const key=curveKey(figure,variantCode,gamma);
  if(index.has(key)) throw new TypeError(`EMP1_WRC537_DATASET_DUPLICATE:${key}`);
  index.set(key,Object.freeze({figure,variant:variantCode==='O'?'ORIGINAL':'EXTRAPOLATED',gamma,pdfPage,coefficients:Object.freeze([...coefficients])}));
}
if(index.size!==321) throw new TypeError(`EMP1_WRC537_DATASET_CARDINALITY:${index.size}`);

export const EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY=Object.freeze({
  sourceDocumentSha256:EMP1_WRC537_CYL_SOURCE_SHA256,
  datasetHash:EMP1_WRC537_CYL_DATASET_HASH,
  curveFitModel:'RATIONAL_5_OVER_6',
  independentVariable:'BETA',
  gammaSelectionPolicy:'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
  machineRoundOffRelativeTolerance:ROUND_OFF_RELATIVE_TOLERANCE,
  counts:EMP1_WRC537_CYL_PACKAGE_COUNTS,
});

export function selectEmp1Wrc537CylindricalDatasetCurve({figure,variant,gamma}){
  const canonicalFigure=canonicalizeFigure(figure);
  const variantCode=VARIANT_CODE[variant];
  if(!variantCode) throw datasetError('EMP1_WRC537_DATASET_VARIANT_REQUIRED');
  if(!Number.isFinite(gamma)||gamma<=0) throw datasetError('EMP1_WRC537_DATASET_GAMMA_INVALID');
  const exactCandidates=[];
  for(const row of index.values()){
    if(row.figure!==canonicalFigure||VARIANT_CODE[row.variant]!==variantCode) continue;
    if(roundOffEquivalent(gamma,row.gamma)) exactCandidates.push(row);
  }
  if(exactCandidates.length>1) throw datasetError(`EMP1_WRC537_DATASET_AMBIGUOUS:${canonicalFigure}:${variant}:${gamma}`);
  if(exactCandidates.length===1) return materializeCurve(exactCandidates[0],gamma);

  const excluded=EMP1_WRC537_CYL_EXCLUDED.filter((row)=>row[0]===canonicalFigure&&row[1]===variantCode);
  if(excluded.length) throw datasetError(`EMP1_WRC537_DATASET_SOURCE_PARAMETER_UNRESOLVED:${canonicalFigure}:${variant}`);
  const family=[...index.values()].filter((row)=>row.figure===canonicalFigure&&VARIANT_CODE[row.variant]===variantCode);
  if(!family.length) throw datasetError(`EMP1_WRC537_DATASET_FIGURE_VARIANT_NOT_FOUND:${canonicalFigure}:${variant}`);
  throw datasetError(`EMP1_WRC537_DATASET_NON_TABULATED_GAMMA:${canonicalFigure}:${variant}:${gamma}`);
}

export function evaluateEmp1Wrc537DatasetCurve(curve,beta){
  if(!curve||curve.datasetHash!==EMP1_WRC537_CYL_DATASET_HASH) throw datasetError('EMP1_WRC537_DATASET_CURVE_IDENTITY_INVALID');
  if(!Number.isFinite(beta)||beta<0) throw datasetError('EMP1_WRC537_DATASET_BETA_INVALID');
  const [a,b,c,d,e,f,g,h,i,j]=curve.coefficients;
  const numerator=a+c*beta+e*beta**2+g*beta**3+i*beta**4;
  const denominator=1+b*beta+d*beta**2+f*beta**3+h*beta**4+j*beta**5;
  if(!Number.isFinite(denominator)||denominator===0) throw datasetError('EMP1_WRC537_DATASET_RATIONAL_DENOMINATOR_INVALID');
  const y=numerator/denominator;
  if(!Number.isFinite(y)) throw datasetError('EMP1_WRC537_DATASET_RATIONAL_RESULT_INVALID');
  return Object.freeze({figure:curve.figure,variant:curve.variant,gamma:curve.gamma,beta,y,numerator,denominator,datasetHash:curve.datasetHash});
}

export function getEmp1Wrc537AvailableGammas(figure,variant){
  const canonicalFigure=canonicalizeFigure(figure);
  const variantCode=VARIANT_CODE[variant];
  if(!variantCode) throw datasetError('EMP1_WRC537_DATASET_VARIANT_REQUIRED');
  return Object.freeze([...index.values()].filter((row)=>row.figure===canonicalFigure&&VARIANT_CODE[row.variant]===variantCode).map((row)=>row.gamma).sort((a,b)=>a-b));
}

function materializeCurve(row,requestedGamma){
  return Object.freeze({
    figure:row.figure,
    variant:row.variant,
    requestedGamma,
    gamma:row.gamma,
    pdfPage:row.pdfPage,
    coefficientOrder:EMP1_WRC537_CYL_COEFFICIENT_ORDER,
    coefficients:row.coefficients,
    sourceDocumentSha256:EMP1_WRC537_CYL_SOURCE_SHA256,
    datasetHash:EMP1_WRC537_CYL_DATASET_HASH,
    sourceParameterResolved:true,
    interpolationUsed:false,
    extrapolationFallbackUsed:false,
  });
}
function canonicalizeFigure(value){if(typeof value!=='string'||!value.trim()) throw datasetError('EMP1_WRC537_DATASET_FIGURE_REQUIRED');const trimmed=value.trim().toUpperCase();return FIGURE_ALIASES[trimmed]??trimmed;}
function curveKey(figure,variantCode,gamma){return `${figure}|${variantCode}|${gamma}`;}
function roundOffEquivalent(actual,source){return Math.abs(actual-source)<=Math.max(1,Math.abs(source))*ROUND_OFF_RELATIVE_TOLERANCE;}
function datasetError(code){const error=new TypeError(code);error.code=code;return error;}
