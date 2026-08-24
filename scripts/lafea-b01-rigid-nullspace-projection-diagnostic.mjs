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
const rigid=casesDoc.cases.find((r)=>r.caseId==='LAFEA3-AFFINE-RIGID-04');
const summaries=read(path.join(B01,'meshes/mesh-generation-summary.json')).meshes;
const generator=path.join(B01,'mesh-generator.py');
const composition=requireLafeaStageComposition('LAFEA.3');
const gate=1e-10;
const diagnostics=summaries.map(diagnose);
process.stdout.write(`${JSON.stringify({schema:'lafea-b01-rigid-nullspace-projection-diagnostic/v1',issue:1100,exactHead:git(['rev-parse','HEAD']),caseId:rigid.caseId,purpose:'Evidence-only test of symmetric orthogonal projection of each element stiffness onto the complement of the exact 2D rigid-body modes. No production stiffness is changed.',productionMechanicsChangedByDiagnostic:false,normalizedFreeResidualGate:gate,diagnostics},null,2)}\n`);

function diagnose(summary){
  try{
    const compact=JSON.parse(runPython([generator,'--emit','--family',summary.family,'--mesh',summary.meshId],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024}));
    const physical=materialize(compact,rigid),source=makeSource(rigid,physical),normalized=composition.normalizeDocument(source),model=composition.canonicalize(normalized),elements=buildElementEvidence(model),mesh=assembleMesh(model,elements),loadCase=model.loadCases.find((r)=>r.loadCaseId==='AFFINE'),load=assembleLoadCase(model,mesh,elements,loadCase);
    if(mesh.globalStiffnessStorage!=='DENSE')return {family:summary.family,meshId:summary.meshId,status:'NOT_APPLICABLE',storage:mesh.globalStiffnessStorage};
    const exact=exactDisplacement(model,mesh.dofOrdering,rigid.affine),partition=partitionIndices(mesh.dofOrdering,load.imposedDisplacements),dofIndex=new Map(mesh.dofOrdering.map((id,i)=>[id,i])),nodeMap=new Map(model.nodes.map((n)=>[n.nodeId,n]));
    const current=evaluate('CURRENT',elements,mesh,load,exact,partition,dofIndex,nodeMap,false);
    const projected=evaluate('RIGID_NULLSPACE_PROJECTED',elements,mesh,load,exact,partition,dofIndex,nodeMap,true);
    return {family:summary.family,meshId:summary.meshId,status:'EVALUATED',current,projected,projectionQualifiesResidual:projected.normalizedFreeResidual<=gate,maximumRelativeElementStiffnessChange:projected.maximumRelativeElementStiffnessChange,maximumAffineEnergyRelativeChange:projected.maximumAffineEnergyRelativeChange};
  }catch(error){return {family:summary.family,meshId:summary.meshId,status:'DIAGNOSTIC_FAILURE',error:{code:error?.code??error?.name??'ERROR',path:error?.path??'diagnostic',message:error instanceof Error?error.message:String(error)}};}
}
function evaluate(variant,elements,mesh,load,exact,partition,dofIndex,nodeMap,project){
  const global=zeros(mesh.dofOrdering.length,mesh.dofOrdering.length);let maxLocal=0,maxRelK=0,maxEnergyRel=0;
  for(const element of elements){const K0=element.localStiffnessMatrix;const K=project?projectRigid(K0,element.localDofOrdering,nodeMap):K0;const localExact=element.localDofOrdering.map((id)=>exact[dofIndex.get(id)]);maxLocal=Math.max(maxLocal,maxAbs(matrixVector(K,localExact)));if(project){maxRelK=Math.max(maxRelK,maxMatrixDiff(K,K0)/Math.max(1,maxMatrix(K0)));maxEnergyRel=Math.max(maxEnergyRel,affineEnergyChange(K0,K,element.localDofOrdering,nodeMap));}for(let i=0;i<K.length;i++)for(let j=0;j<K.length;j++)global[dofIndex.get(element.localDofOrdering[i])][dofIndex.get(element.localDofOrdering[j])]+=K[i][j];}
  const residual=matrixVector(global,exact).map((v,i)=>v-load.forceVector[i]),free=partition.free.map((i)=>residual[i]),constrained=partition.constrained.map((i)=>residual[i]),scale=Math.max(1,maxAbs(constrained),maxAbs(load.forceVector));return {variant,maxLocalElementRigidAction:maxLocal,freeResidualInfinity:maxAbs(free),normalizationScale:scale,normalizedFreeResidual:maxAbs(free)/scale,passesGate:maxAbs(free)/scale<=gate,maximumRelativeElementStiffnessChange:maxRelK,maximumAffineEnergyRelativeChange:maxEnergyRel};
}
function projectRigid(K,ordering,nodeMap){const modes=rigidModes(ordering,nodeMap),Q=orthonormalize(modes),n=K.length,P=zeros(n,n);for(let i=0;i<n;i++)P[i][i]=1;for(const q of Q)for(let i=0;i<n;i++)for(let j=0;j<n;j++)P[i][j]-=q[i]*q[j];const KP=matmul(K,P),PKP=matmul(P,KP);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const v=(PKP[i][j]+PKP[j][i])/2;PKP[i][j]=v;PKP[j][i]=v;}return PKP;}
function rigidModes(ordering,nodeMap){return [['TX',(n,d)=>d==='UX'?1:0],['TY',(n,d)=>d==='UY'?1:0],['RZ',(n,d)=>d==='UX'?-n.y:n.x]].map(([,f])=>ordering.map((id)=>{const c=id.lastIndexOf(':'),n=nodeMap.get(id.slice(0,c)),d=id.slice(c+1);return f(n,d);}));}
function orthonormalize(vectors){const Q=[];for(const original of vectors){let v=[...original];for(const q of Q){const a=dot(v,q);v=v.map((x,i)=>x-a*q[i]);}const norm=Math.sqrt(dot(v,v));if(!(norm>0))throw new Error('Rigid-mode orthonormalization failed.');Q.push(v.map((x)=>x/norm));}return Q;}
function matmul(A,B){const out=zeros(A.length,B[0].length);for(let i=0;i<A.length;i++)for(let j=0;j<B[0].length;j++){const terms=[];for(let k=0;k<B.length;k++)terms.push(A[i][k]*B[k][j]);out[i][j]=sum(terms);}return out;}
function dot(a,b){return sum(a.map((x,i)=>x*b[i]));}function sum(values){let s=0,c=0;for(const t of values){const n=s+t;c+=Math.abs(s)>=Math.abs(t)?(s-n)+t:(t-n)+s;s=n;}return s+c;}
function affineEnergyChange(K0,K,ordering,nodeMap){const fields=[(n,d)=>d==='UX'?n.x:0,(n,d)=>d==='UY'?n.y:0,(n,d)=>d==='UX'?n.y/2:n.x/2];let m=0;for(const f of fields){const u=ordering.map((id)=>{const c=id.lastIndexOf(':'),n=nodeMap.get(id.slice(0,c)),d=id.slice(c+1);return f(n,d);});const e0=.5*dot(u,matrixVector(K0,u)),e=.5*dot(u,matrixVector(K,u));m=Math.max(m,Math.abs(e-e0)/Math.max(1,Math.abs(e0)));}return m;}
function maxMatrix(K){return K.reduce((m,r)=>Math.max(m,maxAbs(r)),0);}function maxMatrixDiff(A,B){let m=0;for(let i=0;i<A.length;i++)for(let j=0;j<A.length;j++)m=Math.max(m,Math.abs(A[i][j]-B[i][j]));return m;}
function partitionIndices(ordering,imposed){const index=new Map(ordering.map((id,i)=>[id,i])),constrained=imposed.map((r)=>index.get(`${r.nodeId}:${r.dof}`)).sort((a,b)=>a-b),set=new Set(constrained);return {constrained,free:Array.from({length:ordering.length},(_,i)=>i).filter((i)=>!set.has(i))};}
function exactDisplacement(model,ordering,aff){const a=num(aff),nodes=new Map(model.nodes.map((n)=>[n.nodeId,n]));return ordering.map((id)=>{const c=id.lastIndexOf(':'),n=nodes.get(id.slice(0,c)),d=id.slice(c+1),u=affineAt(a,n.x,n.y);return d==='UX'?u.ux:u.uy;});}
function makeSource(c,mesh){const a=num(c.affine),imposedDisplacements=mesh.nodes.filter((n)=>n.boundarySides.length).flatMap((n,i)=>{const u=affineAt(a,n.x,n.y),k=String(i+1).padStart(4,'0');return [{imposedDisplacementId:`ID-${k}-UX`,nodeId:n.nodeId,dof:'UX',value:u.ux,sourceReference:'B01#PROJECTION_DIAGNOSTIC'},{imposedDisplacementId:`ID-${k}-UY`,nodeId:n.nodeId,dof:'UY',value:u.uy,sourceReference:'B01#PROJECTION_DIAGNOSTIC'}];});return {schema:MODEL_SCHEMA,modelIdentity:`B01_PROJECTION_DIAGNOSTIC_${mesh.meshId}`,modelVersion:'1',sourceAncestry:{sourceModelIdentity:c.caseId,sourceVersion:casesDoc.schema,adapterIdentity:'LAFEA3_B01_PROJECTION_DIAGNOSTIC',adapterVersion:'1'},units:{length:'mm',force:'N',stress:'MPa',modulus:'MPa'},formulation:c.formulation,materials:[{materialId:'MAT',elasticModulus:Number(c.material.elasticModulus),poissonRatio:Number(c.material.poissonRatio),sourceReference:'B01#MAT'}],nodes:mesh.nodes.map((n)=>({nodeId:n.nodeId,x:n.x,y:n.y,sourceReference:`B01#${mesh.meshId}#${n.nodeId}`})),elements:mesh.elements.map((e)=>({elementId:e.elementId,elementType:e.elementType,nodeIds:e.nodeIds,materialId:'MAT',thickness:Number(c.geometry.thickness),sourceReference:`B01#${mesh.meshId}#${e.elementId}`})),elementTypePolicy:{allowT3Fallback:mesh.family==='T3',sourceReference:'B01#PROJECTION_DIAGNOSTIC'},constraints:[],loadCases:[{loadCaseId:'AFFINE',nodalForces:[],edgeTractions:[],pressureLoads:[],bodyForces:[],temperatureLoads:[],imposedDisplacements,sourceReference:'B01#PROJECTION_DIAGNOSTIC'}],resultRequests:{loadCaseIds:['AFFINE']},qualificationProfile:JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),limitations:['B01_PROJECTION_DIAGNOSTIC_ONLY','NO_RELEASE_AUTHORITY_FROM_B01']};}
function materialize(m,c){const W=Number(c.geometry.width),H=Number(c.geometry.height);return {meshId:m.meshId,family:m.family,nodes:m.nodes.map((r)=>({nodeId:r[0],x:Number(r[1])*W,y:Number(r[2])*H,boundarySides:r[3]})),elements:m.elements.map((r)=>({elementId:r[0],elementType:m.family,nodeIds:r[1]}))};}function affineAt(a,x,y){return {ux:a.u0+a.ux*x+a.uy*y,uy:a.v0+a.vx*x+a.vy*y};}function num(o){return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Number(v)]));}function maxAbs(v){return v.reduce((m,x)=>Math.max(m,Math.abs(x??0)),0);}function read(f){return JSON.parse(fs.readFileSync(f,'utf8'));}function git(a){return execFileSync('git',a,{cwd:ROOT,encoding:'utf8'}).trim();}
