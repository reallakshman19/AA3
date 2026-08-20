#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const packagePath=resolve(process.argv[2]??'test-results/emp1-cylindrical-production-package.json');
const pdfPath=resolve(process.argv[3]??'docs/emp1/WRC537_2013.pdf');
const pkg=JSON.parse(readFileSync(packagePath,'utf8'));
assert.equal(pkg.schema,'emp1-wrc537-cylindrical-production-package/v1');
assert.equal(pkg.counts?.curves,321);
assert.equal(pkg.counts?.scalarCoefficients,3210);
assert.equal(pkg.semanticPayload?.curves?.length,321);
const pdfSha=createHash('sha256').update(readFileSync(pdfPath)).digest('hex');
assert.equal(pdfSha,pkg.sourceDocumentSha256,'WRC PDF SHA-256 mismatch');

const byPage=new Map();
for(const curve of pkg.semanticPayload.curves){
  assert(Number.isInteger(curve.pdfPage)&&curve.pdfPage>0);
  const rows=byPage.get(curve.pdfPage)??[];
  rows.push(curve);
  byPage.set(curve.pdfPage,rows);
}
const temp=mkdtempSync(join(tmpdir(),'emp1-wrc-pdf-'));
let scalarMatches=0;
let gammaIdentities=0;
const pageEvidence=[];
try{
  for(const [page,curves] of [...byPage.entries()].sort((a,b)=>a[0]-b[0])){
    const out=join(temp,`page-${page}.txt`);
    execFileSync('pdftotext',['-f',String(page),'-l',String(page),'-layout',pdfPath,out],{stdio:['ignore','ignore','pipe']});
    const text=readFileSync(out,'utf8');
    const tokens=extractNumericTokens(text);
    const available=[...tokens];
    let pageScalarMatches=0;
    for(const curve of curves){
      assert(text.includes(curve.figure),`figure ${curve.figure} not observed on PDF page ${page}`);
      for(const coefficient of curve.coefficients){
        const index=findNumericMatch(available,coefficient);
        assert(index>=0,`coefficient ${coefficient} for ${curve.figure}/${curve.variant}/gamma=${curve.gamma} not observed on PDF page ${page}`);
        available.splice(index,1);
        scalarMatches+=1;
        pageScalarMatches+=1;
      }
    }
    const distinctGammas=[...new Set(curves.map((row)=>row.gamma))];
    for(const gamma of distinctGammas){
      assert(tokens.some((value)=>numericMatch(value,gamma)),`gamma ${gamma} not observed on PDF page ${page}`);
      gammaIdentities+=1;
    }
    pageEvidence.push({page,curveCount:curves.length,scalarMatches:pageScalarMatches,distinctGammaIdentities:distinctGammas.length});
  }
} finally { rmSync(temp,{recursive:true,force:true}); }
assert.equal(scalarMatches,3210,'not all packaged coefficients were independently observed in PDF text');
assert(pageEvidence.length>0);

console.log(JSON.stringify({
  schema:'emp1-wrc537-cylindrical-production-package-pdf-crosscheck/v1',
  status:'PASS_3210_OF_3210_PRIMARY_PDF_SCALARS',
  engineeringAuthority:true,
  productionAuthority:false,
  packageDatasetHash:pkg.datasetHash,
  sourceDocumentSha256:pdfSha,
  pagesChecked:pageEvidence.length,
  curvesChecked:321,
  scalarCoefficientsChecked:3210,
  scalarCoefficientsMatched:scalarMatches,
  distinctGammaPageIdentitiesChecked:gammaIdentities,
  pageEvidence,
},null,2));

function extractNumericTokens(text){
  const matches=String(text).match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/gu)??[];
  return matches.map(Number).filter(Number.isFinite);
}
function findNumericMatch(values,target){return values.findIndex((value)=>numericMatch(value,target));}
function numericMatch(actual,expected){return Math.abs(actual-expected)<=1e-12*Math.max(1,Math.abs(expected));}
