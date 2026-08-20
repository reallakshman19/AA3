#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC_PRIMARY_PDF_SHA256,
  parseCylindricalExactGammaPackage,
} from './emp1-wrc-cylindrical-exact-gamma-lib.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const sourcePath=resolve(root,'docs/emp1/WRC537_2013_Tables_and_Charts.md');
const outputPath=resolve(root,process.argv[2]??'test-results/emp1-cylindrical-production-package.json');
const markdown=await readFile(sourcePath,'utf8');
const observed=parseCylindricalExactGammaPackage(markdown);
if (observed.counts.qualifiedCurves!==321 || observed.counts.unresolvedCurves!==1 || observed.counts.sourceQualifiedScalars!==3210) {
  throw new Error(`EMP1_WRC_PRODUCTION_PACKAGE_SOURCE_CARDINALITY:${JSON.stringify(observed.counts)}`);
}

const curves=observed.curves
  .map((row)=>({
    figure:row.figure,
    variant:row.variant,
    gamma:row.gamma,
    pdfPage:row.sourceLocator.pdfPage,
    coefficients:['a','b','c','d','e','f','g','h','i','j'].map((name)=>row.coefficients[name]),
  }))
  .sort(compareCurve);

for (let i=1;i<curves.length;i+=1) {
  if (compareCurve(curves[i-1],curves[i])===0) throw new Error(`EMP1_WRC_PRODUCTION_PACKAGE_DUPLICATE:${JSON.stringify(curves[i])}`);
}

const semanticPayload={
  sourceDocumentSha256:EMP1_WRC_PRIMARY_PDF_SHA256,
  curveFitModel:'RATIONAL_5_OVER_6',
  independentVariable:'BETA',
  gammaSelectionPolicy:'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
  originalVsExtrapolated:'EXPLICIT_VARIANT_REQUIRED_NO_FALLBACK',
  machineRoundOffRelativeTolerance:1e-12,
  coefficientOrder:['a','b','c','d','e','f','g','h','i','j'],
  curves,
};
const datasetHash=createHash('sha256').update(canonicalJson(semanticPayload)).digest('hex');
const packageRecord={
  schema:'emp1-wrc537-cylindrical-production-package/v1',
  status:'CANDIDATE_PENDING_PRIMARY_PDF_CROSSCHECK',
  engineeringAuthority:false,
  productionAuthority:false,
  generatedFrom:'docs/emp1/WRC537_2013_Tables_and_Charts.md',
  sourceDocumentSha256:EMP1_WRC_PRIMARY_PDF_SHA256,
  datasetHash,
  counts:{
    curves:curves.length,
    scalarCoefficients:curves.length*10,
    originalCurves:curves.filter((row)=>row.variant==='ORIGINAL').length,
    extrapolatedCurves:curves.filter((row)=>row.variant==='EXTRAPOLATED').length,
    unresolvedExcludedCurves:observed.counts.unresolvedCurves,
    unresolvedExcludedScalars:observed.counts.sourceUnresolvedScalars,
  },
  excludedSourceRows:observed.unresolvedRows.map((row)=>({
    figure:row.figure,
    variant:row.variant,
    gamma:null,
    pdfPage:row.sourceLocator.pdfPage,
    reason:'SOURCE_GAMMA_IDENTITY_UNRESOLVED',
  })),
  semanticPayload,
};
await mkdir(dirname(outputPath),{recursive:true});
await writeFile(outputPath,`${JSON.stringify(packageRecord,null,2)}\n`,'utf8');
console.log(JSON.stringify({
  schema:'emp1-wrc537-cylindrical-production-package-generation/v1',
  status:'PASS_CANDIDATE_GENERATED',
  outputPath,
  datasetHash,
  counts:packageRecord.counts,
  firstCurve:curves[0],
  lastCurve:curves.at(-1),
},null,2));

function compareCurve(a,b){return a.figure.localeCompare(b.figure,'en',{numeric:true})||a.variant.localeCompare(b.variant)||a.gamma-b.gamma||a.pdfPage-b.pdfPage;}
function canonicalJson(value){
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value&&typeof value==='object') return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
