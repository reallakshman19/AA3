#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MODEL_SCHEMA, QUALIFICATION_PROFILE } from '../src/core/local-continuum/index.js';
import { assembleMesh } from '../src/core/local-continuum/assembly.js';
import { buildElementEvidence } from '../src/core/local-continuum/element.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import { matrixVector, zeros } from '../src/core/local-continuum/matrix.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const B01=path.join(ROOT,'validation/lafea-benchmark-data/B01');
const casesDoc=read(path.join(B01,'oracle/cases.json'));
const rigid=casesDoc.cases.find((row)=>row.caseId==='LAFEA3-AFFINE-RIGID-04');
const summaries=read(path.join(B01,'meshes/mesh-generation-summary.json')).meshes;
const generator=path.join(B01,'mesh-generator.py');
const composition=requireLafeaStageComposition('LAFEA.3');
const gate=1e-10;
const variants=['CURRENT','DIRECT_COMPENSATED','DIRECT_COMPENSATED_SYMMETRIC'];
const diagnostics=summaries.map(diagnose);
process.stdout.write(`${JSON.stringify({schema:'lafea-b01-stiffness-construction-diagnostic/v1',issue:1100,exactHead:git(['rev-parse','HEAD']),caseId:rigid.caseId,purpose:'Evidence-only test of element stiffness B^T D B numerical construction. No production matrix, assembly, solver, oracle, mesh or tolerance is changed.',productionMechanicsChangedByDiagnostic:false,variants,normalizedFreeResidualGate:gate,diagnostics},null,2)}\n`);

function diagnose(summary){
  try{
    const compact=JSON.parse(runPython([generator,'--emit','--family',summary.family,'--mesh',summary.meshId],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024}));
    const physical=materialize(compact,rigid); const source=makeSource(rigid,physical);
    const normalized=composition.normalizeDocument(source); const model=composition.canonicalize(normalized);
    const elements=buildElementEvidence(model); const currentMesh=assembleMesh(model,elements);
    const loadCase=model.loadCases.find((r)=>r.loadCaseId==='AFFINE'); const load=assembleLoadCase(model,currentMesh,elements,loadCase);
    if(currentMesh.globalStiffnessStorage!=='DENSE') return {family:summary.family,meshId:summary.meshId,status:'NOT_APPLICABLE',storage:currentMesh.globalStiffnessStorage};
    const exact=exactDisplacement(model,currentMesh.dofOrdering,rigid.affine);
    const partition=partitionIndices(currentMesh.dofOrdering,load.imposedDisplacements);
    const dofIndex=new Map(currentMesh.dofOrdering.map((id,i)=>[id,i]));
    const results=variants.map((variant)=>evaluateVariant(variant,elements,currentMesh,load,exact,partition,dofIndex));
    return {family:summary.family,meshId:summary.meshId,status:'EVALUATED',results,bestByNormalizedFreeResidual:[...results].sort((a,b)=>a.normalizedFreeResidual-b.normalizedFreeResidual)[0].variant};
  }catch(error){return {family:summary.family,meshId:summary.meshId,status:'DIAGNOSTIC_FAILURE',error:{code:error?.code??error?.name??'ERROR',path:error?.path??'diagnostic',message:error instanceof Error?error.message:String(error)}};}
}
function evaluateVariant(variant,elements,currentMesh,load,exact,partition,dofIndex){
  const global=zeros(currentMesh.dofOrdering.length,currentMesh.dofOrdering.length); let maxLocal=0; let maxSymmetry=0;
  for(const element of elements){
    const K=variant==='CURRENT'?element.localStiffnessMatrix:rebuild(element,variant==='DIRECT_COMPENSATED_SYMMETRIC');
    const localExact=element.localDofOrdering.map((id)=>exact[dofIndex.get(id)]); maxLocal=Math.max(maxLocal,maxAbs(matrixVector(K,localExact)));
    for(let i=0;i<K.length;i++) for(let j=0;j<K.length;j++){const gi=dofIndex.get(element.localDofOrdering[i]),gj=dofIndex.get(element.localDofOrdering[j]);global[gi][gj]+=K[i][j];}
    for(let i=0;i<K.length;i++)for(let j=i+1;j<K.length;j++)maxSymmetry=Math.max(maxSymmetry,Math.abs(K[i][j]-K[j][i]));
  }
  const residual=matrixVector(global,exact).map((v,i)=>v-load.forceVector[i]); const free=partition.free.map((i)=>residual[i]); const constrained=partition.constrained.map((i)=>residual[i]); const scale=Math.max(1,maxAbs(constrained),maxAbs(load.forceVector));
  return {variant,maxLocalElementRigidAction:maxLocal,maxElementSymmetryResidual:maxSymmetry,freeResidualInfinity:maxAbs(free),normalizationScale:scale,normalizedFreeResidual:maxAbs(free)/scale,passesGate:maxAbs(free)/scale<=gate};
}
function rebuild(element,symmetric){
  const n=element.localStiffnessMatrix.length; const out=zeros(n,n);
  if(element.elementType==='T3'){
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)out[i][j]=element.thickness*element.canonicalArea*btDb(element.bMatrix,element.dMatrix,i,j);
  }else{
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const terms=element.gaussEvidence.map((gp)=>element.thickness*gp.jacobianDeterminant*gp.weight*btDb(gp.B,element.dMatrix,i,j)); out[i][j]=compensatedSum(terms);
    }
  }
  if(symmetric){for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const v=(out[i][j]+out[j][i])/2;out[i][j]=v;out[j][i]=v;}}
  return out;
}
function btDb(B,D,i,j){const terms=[];for(let a=0;a<3;a++)for(let b=0;b<3;b++)terms.push(B[a][i]*D[a][b]*B[b][j]);return compensatedSum(terms);}
function compensatedSum(values){let sum=0,c=0;for(const term of values){const next=sum+term;c+=Math.abs(sum)>=Math.abs(term)?(sum-next)+term:(term-next)+sum;sum=next;}return sum+c;}
function partitionIndices(ordering,imposed){const index=new Map(ordering.map((id,i)=>[id,i]));const constrained=imposed.map((r)=>index.get(`${r.nodeId}:${r.dof}`)).sort((a,b)=>a-b);const set=new Set(constrained);return {constrained,free:Array.from({length:ordering.length},(_,i)=>i).filter((i)=>!set.has(i))};}
function exactDisplacement(model,ordering,aff){const a=num(aff),nodes=new Map(model.nodes.map((n)=>[n.nodeId,n]));return ordering.map((id)=>{const cut=id.lastIndexOf(':'),node=nodes.get(id.slice(0,cut)),dof=id.slice(cut+1),u=affineAt(a,node.x,node.y);return dof==='UX'?u.ux:u.uy;});}
function makeSource(c,mesh){const a=num(c.affine);const imposedDisplacements=mesh.nodes.filter((n)=>n.boundarySides.length).flatMap((n,i)=>{const u=affineAt(a,n.x,n.y),k=String(i+1).padStart(4,'0');return [{imposedDisplacementId:`ID-${k}-UX`,nodeId:n.nodeId,dof:'UX',value:u.ux,sourceReference:'B01#STIFFNESS_DIAGNOSTIC'},{imposedDisplacementId:`ID-${k}-UY`,nodeId:n.nodeId,dof:'UY',value:u.uy,sourceReference:'B01#STIFFNESS_DIAGNOSTIC'}];});return {schema:MODEL_SCHEMA,modelIdentity:`B01_STIFFNESS_DIAGNOSTIC_${mesh.meshId}`,modelVersion:'1',sourceAncestry:{sourceModelIdentity:c.caseId,sourceVersion:casesDoc.schema,adapterIdentity:'LAFEA3_B01_STIFFNESS_DIAGNOSTIC',adapterVersion:'1'},units:{length:'mm',force:'N',stress:'MPa',modulus:'MPa'},formulation:c.formulation,materials:[{materialId:'MAT',elasticModulus:Number(c.material.elasticModulus),poissonRatio:Number(c.material.poissonRatio),sourceReference:'B01#MAT'}],nodes:mesh.nodes.map((n)=>({nodeId:n.nodeId,x:n.x,y:n.y,sourceReference:`B01#${mesh.meshId}#${n.nodeId}`})),elements:mesh.elements.map((e)=>({elementId:e.elementId,elementType:e.elementType,nodeIds:e.nodeIds,materialId:'MAT',thickness:Number(c.geometry.thickness),sourceReference:`B01#${mesh.meshId}#${e.elementId}`})),elementTypePolicy:{allowT3Fallback:mesh.family==='T3',sourceReference:'B01#STIFFNESS_DIAGNOSTIC'},constraints:[],loadCases:[{loadCaseId:'AFFINE',nodalForces:[],edgeTractions:[],pressureLoads:[],bodyForces:[],temperatureLoads:[],imposedDisplacements,sourceReference:'B01#STIFFNESS_DIAGNOSTIC'}],resultRequests:{loadCaseIds:['AFFINE']},qualificationProfile:JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),limitations:['B01_STIFFNESS_DIAGNOSTIC_ONLY','NO_RELEASE_AUTHORITY_FROM_B01']};}
function materialize(m,c){const W=Number(c.geometry.width),H=Number(c.geometry.height);return {meshId:m.meshId,family:m.family,nodes:m.nodes.map((r)=>({nodeId:r[0],x:Number(r[1])*W,y:Number(r[2])*H,boundarySides:r[3]})),elements:m.elements.map((r)=>({elementId:r[0],elementType:m.family,nodeIds:r[1]}))};}
function affineAt(a,x,y){return {ux:a.u0+a.ux*x+a.uy*y,uy:a.v0+a.vx*x+a.vy*y};}function num(o){return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Number(v)]));}function maxAbs(v){return v.reduce((m,x)=>Math.max(m,Math.abs(x??0)),0);}function read(f){return JSON.parse(fs.readFileSync(f,'utf8'));}function git(a){return execFileSync('git',a,{cwd:ROOT,encoding:'utf8'}).trim();}
