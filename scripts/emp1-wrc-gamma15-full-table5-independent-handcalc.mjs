#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independent qualification calculation: Node built-ins only. No src/core
// imports, no exact-gamma selector import, and no production dataset import.
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const sourceText=await readFile(resolve(root,'docs/emp1/WRC537_2013_Tables_and_Charts.md'),'utf8');
const domain=JSON.parse(await readFile(resolve(root,'validation/emp1/wrc537-2013/cylindrical-original-gamma15-bounded-domain-v1.json'),'utf8'));
const frozenPath=resolve(root,'validation/emp1/wrc537-2013/gamma15-full-table5-oracle-v1.json');
let frozen=null;
try{frozen=JSON.parse(await readFile(frozenPath,'utf8'));}catch{}

const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const gamma=15;
const beta=0.155;
assert.equal(domain.source.rawPdfSha256,sourceSha);
assert.ok(beta>=domain.qualifiedProductDomain.beta.minimum&&beta<=domain.qualifiedProductDomain.beta.maximum);
const geometry={meanRadius:300,shellThickness:20,attachmentRadius:beta*300/0.875,beta,gamma};
assert.equal(geometry.meanRadius/geometry.shellThickness,gamma);
const stressConcentration={Kn:1,Kb:1};
const loads={P:-1000,Vc:250,Vl:-400,Mc:500000,Ml:-600000,Mt:700000};
const figureMap={
  circ:{Pmem_AB:'4C',Pmem_CD:'3C',Pbend_AB:'2C-1',Pbend_CD:'1C',Mcmem:'3A',Mcbend:'1A',Mlmem:'3B',Mlbend:'1B-1'},
  long:{Pmem_AB:'3C',Pmem_CD:'4C',Pbend_AB:'1C-1',Pbend_CD:'2C',Mcmem:'4A',Mcbend:'2A',Mlmem:'4B',Mlbend:'2B-1'},
};
const requiredFigures=[...new Set([...Object.values(figureMap.circ),...Object.values(figureMap.long)])];
assert.equal(requiredFigures.length,14);
const coefficients={};
const ordinates={};
for(const figure of requiredFigures){
  const row=parseGammaOriginal(sourceText,figure,gamma);
  coefficients[figure]=row;
  ordinates[figure]=rational(row.coefficients,beta);
}
const q={
  circ:Object.fromEntries(Object.entries(figureMap.circ).map(([key,figure])=>[key,ordinates[figure]])),
  long:Object.fromEntries(Object.entries(figureMap.long).map(([key,figure])=>[key,ordinates[figure]])),
};
const LOC=['Au','Al','Bu','Bl','Cu','Cl','Du','Dl'];
const SIGN={
  pMem:[-1,-1,-1,-1,-1,-1,-1,-1],pBend:[-1,1,-1,1,-1,1,-1,1],
  mcMem:[0,0,0,0,-1,-1,1,1],mcBend:[0,0,0,0,-1,1,1,-1],
  mlMem:[-1,-1,1,1,0,0,0,0],mlBend:[-1,1,1,-1,0,0,0,0],
  vc:[1,1,-1,-1,0,0,0,0],vl:[0,0,0,0,-1,-1,1,1],mt:[1,1,1,1,1,1,1,1],
};
const Rm=geometry.meanRadius,T=geometry.shellThickness,r0=geometry.attachmentRadius,Kn=stressConcentration.Kn,Kb=stressConcentration.Kb;
const scale={
  pMem:Math.abs(loads.P)*Kn/(Rm*T),pBend:6*Math.abs(loads.P)*Kb/T**2,
  mcMem:Math.abs(loads.Mc)*Kn/(Rm**2*beta*T),mcBend:6*Math.abs(loads.Mc)*Kb/(Rm*beta*T**2),
  mlMem:Math.abs(loads.Ml)*Kn/(Rm**2*beta*T),mlBend:6*Math.abs(loads.Ml)*Kb/(Rm*beta*T**2),
  vcShear:Math.abs(loads.Vc)/(Math.PI*r0*T),vlShear:Math.abs(loads.Vl)/(Math.PI*r0*T),mtShear:Math.abs(loads.Mt)/(2*Math.PI*r0**2*T),
};
const circComponents={
  Pmem:apply(SIGN.pMem,loads.P,grouped(q.circ.Pmem_AB*scale.pMem,q.circ.Pmem_CD*scale.pMem)),
  Pbend:apply(SIGN.pBend,loads.P,grouped(q.circ.Pbend_AB*scale.pBend,q.circ.Pbend_CD*scale.pBend)),
  Mcmem:apply(SIGN.mcMem,loads.Mc,q.circ.Mcmem*scale.mcMem),Mcbend:apply(SIGN.mcBend,loads.Mc,q.circ.Mcbend*scale.mcBend),
  Mlmem:apply(SIGN.mlMem,loads.Ml,q.circ.Mlmem*scale.mlMem),Mlbend:apply(SIGN.mlBend,loads.Ml,q.circ.Mlbend*scale.mlBend),
};
const longComponents={
  Pmem:apply(SIGN.pMem,loads.P,grouped(q.long.Pmem_AB*scale.pMem,q.long.Pmem_CD*scale.pMem)),
  Pbend:apply(SIGN.pBend,loads.P,grouped(q.long.Pbend_AB*scale.pBend,q.long.Pbend_CD*scale.pBend)),
  Mcmem:apply(SIGN.mcMem,loads.Mc,q.long.Mcmem*scale.mcMem),Mcbend:apply(SIGN.mcBend,loads.Mc,q.long.Mcbend*scale.mcBend),
  Mlmem:apply(SIGN.mlMem,loads.Ml,q.long.Mlmem*scale.mlMem),Mlbend:apply(SIGN.mlBend,loads.Ml,q.long.Mlbend*scale.mlBend),
};
const shearComponents={Vc:apply(SIGN.vc,loads.Vc,scale.vcShear),Vl:apply(SIGN.vl,loads.Vl,scale.vlShear),Mt:apply(SIGN.mt,loads.Mt,scale.mtShear)};
const circumferential=sum(circComponents),longitudinal=sum(longComponents),shear=sum(shearComponents);
const stressIntensity=LOC.map((_,i)=>tresca(circumferential[i],longitudinal[i],shear[i]));
const semanticPayload={
  sourceDocumentSha256:sourceSha,sourceExtraction:'docs/emp1/WRC537_2013_Tables_and_Charts.md',
  domainRecord:'validation/emp1/wrc537-2013/cylindrical-original-gamma15-bounded-domain-v1.json',
  case:{shellFamily:'CYLINDRICAL',attachmentShape:'ROUND',variant:'ORIGINAL',gamma,beta,geometry,stressConcentration,loads},
  figureMap,sourceRows:coefficients,curveOrdinates:q,scale,
  expected:{locations:LOC,circumferential,longitudinal,shear,stressIntensity},
};
const semanticHash=createHash('sha256').update(canonical(semanticPayload)).digest('hex');
if(frozen?.semanticHash){
  assert.equal(frozen.semanticHash,semanticHash,'gamma15 full Table5 oracle semantic hash drift');
  assert.deepEqual(frozen.semanticPayload,semanticPayload,'gamma15 full Table5 oracle payload drift');
}
console.log(JSON.stringify({
  schema:'emp1-wrc537-gamma15-full-table5-independent-handcalc/v1',
  status:frozen?.semanticHash?'PASS_REOBSERVED_FROZEN_FULL_TABLE5_ORACLE':'PASS_CANDIDATE_FULL_TABLE5_ORACLE',
  engineeringAuthority:Boolean(frozen?.semanticHash),productionAuthority:false,productionImports:[],productionObservationUsed:false,
  semanticHash,semanticPayload,
},null,2));

function parseGammaOriginal(markdown,figure,targetGamma){
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
    const row=mdRows.find((cells)=>cells.length===11&&Number(cells[0])===targetGamma&&cells.slice(1).every((x)=>Number.isFinite(Number(x))));
    assert(row,`gamma${targetGamma} row missing:${figure}`);
    return {pdfPage:page,gamma:targetGamma,coefficients:Object.fromEntries(coefficientOrder.map((name,i)=>[name,Number(row[i+1])]))};
  }
  const coeffRows=mdRows.filter((row)=>coefficientOrder.includes(row[0]));
  assert.equal(coeffRows.length,10,`coefficient row count:${figure}`);
  const count=coeffRows[0].length-1;assert(count>0&&coeffRows.every((row)=>row.length-1===count),`coefficient shape:${figure}`);
  const firstCoeffLineIndex=lines.findIndex((line)=>{const r=parseRow(line);return r&&coefficientOrder.includes(r[0]);});
  const candidates=lines.slice(0,firstCoeffLineIndex).map(parseRow).filter((row)=>row&&row.length===count+1);
  const gammaHeader=[...candidates].reverse().find((row)=>row[0]==='');assert(gammaHeader,`gamma header missing:${figure}`);
  const column=gammaHeader.slice(1).findIndex((x)=>Number(x)===targetGamma);assert(column>=0,`gamma${targetGamma} column missing:${figure}`);
  return {pdfPage:page,gamma:targetGamma,coefficients:Object.fromEntries(coeffRows.map((row)=>[row[0],Number(row[column+1])]))};
}
function rational(c,x){const numerator=c.a+c.c*x+c.e*x**2+c.g*x**3+c.i*x**4;const denominator=1+c.b*x+c.d*x**2+c.f*x**3+c.h*x**4+c.j*x**5;assert(Number.isFinite(denominator)&&denominator!==0);return numerator/denominator;}
function parseRow(line){const t=String(line??'').trim();if(!t.startsWith('|')||!t.endsWith('|'))return null;return t.slice(1,-1).split('|').map((x)=>x.trim());}
function apply(signs,load,magnitude){const values=Array.isArray(magnitude)?magnitude:Array(signs.length).fill(magnitude);const direction=load<0?-1:1;return signs.map((s,i)=>zero(s*direction*values[i]));}
function grouped(ab,cd){return[ab,ab,ab,ab,cd,cd,cd,cd];}
function sum(components){const rows=Object.values(components);return LOC.map((_,i)=>zero(rows.reduce((a,row)=>a+row[i],0)));}
function tresca(a,b,t){const d=Math.sqrt((a-b)**2+4*t**2),p1=.5*(a+b+d),p2=.5*(a+b-d),p3=0;return Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1));}
function zero(v){return Object.is(v,-0)?0:v;}
function canonical(value){if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map((k)=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;return JSON.stringify(value);}
