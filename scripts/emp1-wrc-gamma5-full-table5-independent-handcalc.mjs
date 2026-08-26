#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveIndependentWrc537Table5Authority } from './oracles/emp1-wrc537/source-authority.mjs';
import { evaluateIndependentWrc537Table5 } from './oracles/emp1-wrc537/table5-handcalc.mjs';

// Independent qualification calculation. WRC interpretation and Table-5
// mechanics are isolated from src/core production semantics.
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const [sourceText,cauxText,reviewedInterpretation]=await Promise.all([
  readFile(resolve(root,'docs/emp1/WRC537_2013_Tables_and_Charts.md'),'utf8'),
  readFile(resolve(root,'docs/emp1/CAUx_2017_WRC01f_pages_24-31.md'),'utf8'),
  readFile(resolve(root,'validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json'),'utf8').then(JSON.parse),
]);
const sourceAuthority=deriveIndependentWrc537Table5Authority({
  wrcMarkdown:sourceText,cauxMarkdown:cauxText,reviewedInterpretation,
});
const frozenPath=resolve(root,'validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json');
let frozen=null;
try{frozen=JSON.parse(await readFile(frozenPath,'utf8'));}catch{}

const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const gamma=5;
const beta=0.155;
const geometry={meanRadius:100,shellThickness:20,attachmentRadius:beta*100/0.875,beta,gamma};
const stressConcentration={Kn:1,Kb:1};
const loads={P:-1000,Vc:250,Vl:-400,Mc:500000,Ml:-600000,Mt:700000};
const figureMap={
  circ:sourceAuthority.historicalFigureMap.circumferential,
  long:sourceAuthority.historicalFigureMap.longitudinal,
};
const requiredFigures=[...new Set([...Object.values(figureMap.circ),...Object.values(figureMap.long)])];
assert.equal(requiredFigures.length,14);
const coefficients={};
const ordinates={};
for(const figure of requiredFigures){
  const row=parseGamma5Original(sourceText,figure);
  coefficients[figure]=row;
  ordinates[figure]=rational(row.coefficients,beta);
}
const q={
  circ:Object.fromEntries(Object.entries(figureMap.circ).map(([key,figure])=>[key,ordinates[figure]])),
  long:Object.fromEntries(Object.entries(figureMap.long).map(([key,figure])=>[key,ordinates[figure]])),
};
const independent=evaluateIndependentWrc537Table5({
  geometry,stressConcentration,loads,curveOrdinates:q,
  signs:sourceAuthority.signs,locations:sourceAuthority.locations,
});
const semanticPayload={
  sourceDocumentSha256:sourceSha,sourceExtraction:'docs/emp1/WRC537_2013_Tables_and_Charts.md',
  case:{shellFamily:'CYLINDRICAL',attachmentShape:'ROUND',variant:'ORIGINAL',gamma,beta,geometry,stressConcentration,loads},
  figureMap,sourceRows:coefficients,curveOrdinates:q,scale:independent.scale,
  expected:{
    locations:sourceAuthority.locations,
    circumferential:independent.stresses.circumferential,
    longitudinal:independent.stresses.longitudinal,
    shear:independent.stresses.shear,
    stressIntensity:independent.stresses.stressIntensity,
  },
};
const semanticHash=createHash('sha256').update(canonical(semanticPayload)).digest('hex');
if(frozen?.semanticHash){
  assert.equal(frozen.semanticHash,semanticHash,'full Table5 oracle semantic hash drift');
  assert.deepEqual(frozen.semanticPayload,semanticPayload,'full Table5 oracle payload drift');
}
console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma5-full-table5-independent-handcalc/v3',
  status:frozen?.semanticHash?'PASS_REOBSERVED_FROZEN_FULL_TABLE5_ORACLE_WITH_ISOLATED_SOURCE_AUTHORITY':'PASS_CANDIDATE_FULL_TABLE5_ORACLE_WITH_ISOLATED_SOURCE_AUTHORITY',
  comparisonClassification:'HISTORICAL_GAMMA5_COMPARISON_VECTOR',
  engineeringAuthority:Boolean(frozen?.semanticHash),
  engineeringAuthorityScope:'HISTORICAL_COMPARISON_VECTOR_ONLY',
  fullWrcSemanticAuthority:false,
  productionAuthority:false,
  productionImports:[],
  productionObservationUsed:false,
  interpretationAuthority:{
    authorityHash:sourceAuthority.authorityHash,
    sourceSemanticHash:sourceAuthority.hashes.sourceSemanticHash,
    table5InterpretationHash:sourceAuthority.hashes.table5InterpretationHash,
    signAuthorityHash:sourceAuthority.hashes.signAuthorityHash,
    historicalFigureMapHash:sourceAuthority.hashes.historicalFigureMapHash,
    allowedFigureAuthority:sourceAuthority.sourceCustody.allowedFigureAuthority,
    historicalFigureSelectionValidation:sourceAuthority.sourceCustody.historicalFigureSelectionValidation,
    productionAuthority:false,
  },
  semanticHash,semanticPayload,
},null,2));

function parseGamma5Original(markdown,figure){
  const escaped=figure.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`^### Curve Fit Coefficients for Figure ${escaped}\\s+[–-]\\s+Original\\s*$`,'mu');
  const match=re.exec(markdown);assert(match,`source heading missing:${figure}`);
  const start=match.index+match[0].length;const rest=markdown.slice(start);
  const next=rest.search(/^### Curve Fit Coefficients for Figure |^## /mu);const block=next>=0?rest.slice(0,next):rest;
  const page=Number(block.match(/\*\*PDF Page (\d+)\*\*/u)?.[1]);assert(Number.isInteger(page),`page missing:${figure}`);
  const lines=block.replace(/\r/gu,'').split('\n');
  const mdRows=lines.map(parseRow).filter(Boolean);
  const coefficientOrder=['a','b','c','d','e','f','g','h','i','j'];
  const header=mdRows.find((row)=>row.length===11&&row[0]===''&&row.slice(1).join('|')===coefficientOrder.join('|'));
  if(header){
    const row=mdRows.find((cells)=>cells.length===11&&Number(cells[0])===gamma&&cells.slice(1).every((x)=>Number.isFinite(Number(x))));
    assert(row,`gamma5 row missing:${figure}`);
    return {pdfPage:page,gamma,coefficients:Object.fromEntries(coefficientOrder.map((name,i)=>[name,Number(row[i+1])]))};
  }
  const coeffRows=mdRows.filter((row)=>coefficientOrder.includes(row[0]));
  assert.equal(coeffRows.length,10,`coefficient row count:${figure}`);
  const count=coeffRows[0].length-1;assert(count>0&&coeffRows.every((row)=>row.length-1===count),`coefficient shape:${figure}`);
  const firstCoeffLineIndex=lines.findIndex((line)=>{const row=parseRow(line);return row&&coefficientOrder.includes(row[0]);});
  const candidates=lines.slice(0,firstCoeffLineIndex).map(parseRow).filter((row)=>row&&row.length===count+1);
  const gammaHeader=[...candidates].reverse().find((row)=>row[0]==='');assert(gammaHeader,`gamma header missing:${figure}`);
  const column=gammaHeader.slice(1).findIndex((value)=>Number(value)===gamma);assert(column>=0,`gamma5 column missing:${figure}`);
  return {pdfPage:page,gamma,coefficients:Object.fromEntries(coeffRows.map((row)=>[row[0],Number(row[column+1])]))};
}
function rational(c,x){const numerator=c.a+c.c*x+c.e*x**2+c.g*x**3+c.i*x**4;const denominator=1+c.b*x+c.d*x**2+c.f*x**3+c.h*x**4+c.j*x**5;assert(Number.isFinite(denominator)&&denominator!==0);return numerator/denominator;}
function parseRow(line){const text=String(line??'').trim();if(!text.startsWith('|')||!text.endsWith('|'))return null;return text.slice(1,-1).split('|').map((cell)=>cell.trim());}
function canonical(value){if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;return JSON.stringify(value);}
