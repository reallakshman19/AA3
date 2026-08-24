#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MODEL_SCHEMA, QUALIFICATION_PROFILE } from '../src/core/local-continuum/index.js';
import { assembleMesh } from '../src/core/local-continuum/assembly.js';
import { buildElementEvidence } from '../src/core/local-continuum/element.js';
import { assembleLoadCase } from '../src/core/local-continuum/loads.js';
import { matrixVector } from '../src/core/local-continuum/matrix.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const casesDoc = read(path.join(B01, 'oracle/cases.json'));
const rigid = casesDoc.cases.find((row) => row.caseId === 'LAFEA3-AFFINE-RIGID-04');
const meshes = read(path.join(B01, 'meshes/mesh-generation-summary.json')).meshes;
const generator = path.join(B01, 'mesh-generator.py');
const composition = requireLafeaStageComposition('LAFEA.3');
const exactHead = git(['rev-parse', 'HEAD']);
const gate = 1e-10;

const diagnostics = meshes.map(diagnose);
process.stdout.write(`${JSON.stringify({
  schema: 'lafea-b01-rigid-nullspace-diagnostic/v1', issue: 1100, exactHead,
  caseId: rigid.caseId,
  purpose: 'Apply the frozen exact rigid displacement field directly to element and assembled stiffness matrices before any linear solve, isolating whether the residual floor exists upstream of Cholesky.',
  productionMechanicsChangedByDiagnostic: false,
  normalizedFreeResidualGate: gate,
  diagnostics,
}, null, 2)}\n`);

function diagnose(summary) {
  try {
    const compact = JSON.parse(runPython([generator, '--emit', '--family', summary.family, '--mesh', summary.meshId], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
    if (compact.meshSemanticHash !== summary.meshSemanticHash) throw new Error(`mesh hash mismatch ${summary.meshId}`);
    const physical = materialize(compact, rigid);
    const source = makeSource(rigid, physical);
    const normalized = composition.normalizeDocument(source);
    const model = composition.canonicalize(normalized);
    const elementEvidence = buildElementEvidence(model);
    const mesh = assembleMesh(model, elementEvidence);
    const loadCase = model.loadCases.find((row) => row.loadCaseId === 'AFFINE');
    const load = assembleLoadCase(model, mesh, elementEvidence, loadCase);
    if (mesh.globalStiffnessStorage !== 'DENSE') return { family: summary.family, meshId: summary.meshId, status: 'NOT_APPLICABLE', storage: mesh.globalStiffnessStorage };

    const exact = exactDisplacement(model, mesh.dofOrdering, rigid.affine);
    const partition = partitionIndices(mesh.dofOrdering, load.imposedDisplacements);
    const globalResidual = matrixVector(mesh.globalStiffnessMatrix, exact).map((value, index) => value - load.forceVector[index]);
    const globalFree = partition.free.map((index) => globalResidual[index]);
    const globalConstrained = partition.constrained.map((index) => globalResidual[index]);
    const globalScale = Math.max(1, maxAbs(globalConstrained), maxAbs(load.forceVector));

    const dofIndex = new Map(mesh.dofOrdering.map((identity, index) => [identity, index]));
    const assembledElementAction = Array(mesh.dofOrdering.length).fill(0);
    let maxLocalRigidAction = 0;
    let maxElementRigidStrainQualification = 0;
    for (const element of elementEvidence) {
      const localExact = element.localDofOrdering.map((identity) => exact[dofIndex.get(identity)]);
      const localAction = matrixVector(element.localStiffnessMatrix, localExact);
      maxLocalRigidAction = Math.max(maxLocalRigidAction, maxAbs(localAction));
      maxElementRigidStrainQualification = Math.max(maxElementRigidStrainQualification, element.rigidBodyQualification?.maximumStrainResidual ?? 0);
      element.localDofOrdering.forEach((identity, localIndex) => {
        assembledElementAction[dofIndex.get(identity)] += localAction[localIndex];
      });
    }
    const elementFree = partition.free.map((index) => assembledElementAction[index] - load.forceVector[index]);
    const elementConstrained = partition.constrained.map((index) => assembledElementAction[index] - load.forceVector[index]);
    const elementScale = Math.max(1, maxAbs(elementConstrained), maxAbs(load.forceVector));

    return {
      family: summary.family, meshId: summary.meshId, status: 'EVALUATED',
      freeDofCount: partition.free.length, constrainedDofCount: partition.constrained.length,
      maxElementRigidStrainQualification,
      maxLocalElementStiffnessRigidAction: maxLocalRigidAction,
      assembledElementActionFreeInfinity: maxAbs(elementFree),
      assembledElementActionNormalizedFreeResidual: maxAbs(elementFree) / elementScale,
      globalStiffnessActionFreeInfinity: maxAbs(globalFree),
      globalStiffnessActionNormalizedFreeResidual: maxAbs(globalFree) / globalScale,
      exactRigidFieldPassesGlobalGate: maxAbs(globalFree) / globalScale <= gate,
      elementVsGlobalFreeActionInfinityDifference: maxAbs(partition.free.map((index) => assembledElementAction[index] - globalResidual[index] - load.forceVector[index])),
    };
  } catch (error) {
    return { family: summary.family, meshId: summary.meshId, status: 'DIAGNOSTIC_FAILURE', error: { code: error?.code ?? error?.name ?? 'ERROR', path: error?.path ?? 'diagnostic', message: error instanceof Error ? error.message : String(error) } };
  }
}

function partitionIndices(ordering, imposed) {
  const index = new Map(ordering.map((id, i) => [id, i]));
  const constrained = imposed.map((row) => index.get(`${row.nodeId}:${row.dof}`)).sort((a,b)=>a-b);
  const set = new Set(constrained);
  const free = Array.from({length:ordering.length},(_,i)=>i).filter((i)=>!set.has(i));
  return { free, constrained };
}
function exactDisplacement(model, ordering, affineRecord) {
  const a = num(affineRecord); const nodes = new Map(model.nodes.map((n)=>[n.nodeId,n]));
  return ordering.map((identity) => { const cut=identity.lastIndexOf(':'); const node=nodes.get(identity.slice(0,cut)); const dof=identity.slice(cut+1); const u=affineAt(a,node.x,node.y); return dof==='UX'?u.ux:u.uy; });
}
function makeSource(c, mesh) {
  const a=num(c.affine);
  const imposedDisplacements=mesh.nodes.filter((n)=>n.boundarySides.length).flatMap((n,i)=>{const u=affineAt(a,n.x,n.y);const k=String(i+1).padStart(4,'0');return [{imposedDisplacementId:`ID-${k}-UX`,nodeId:n.nodeId,dof:'UX',value:u.ux,sourceReference:'B01#RIGID_NULLSPACE'},{imposedDisplacementId:`ID-${k}-UY`,nodeId:n.nodeId,dof:'UY',value:u.uy,sourceReference:'B01#RIGID_NULLSPACE'}];});
  return { schema:MODEL_SCHEMA, modelIdentity:`B01_RIGID_NULLSPACE_${mesh.meshId}`, modelVersion:'1', sourceAncestry:{sourceModelIdentity:c.caseId,sourceVersion:casesDoc.schema,adapterIdentity:'LAFEA3_B01_RIGID_NULLSPACE_DIAGNOSTIC',adapterVersion:'1'}, units:{length:'mm',force:'N',stress:'MPa',modulus:'MPa'}, formulation:c.formulation, materials:[{materialId:'MAT',elasticModulus:Number(c.material.elasticModulus),poissonRatio:Number(c.material.poissonRatio),sourceReference:`B01#${c.caseId}#MATERIAL`}], nodes:mesh.nodes.map((n)=>({nodeId:n.nodeId,x:n.x,y:n.y,sourceReference:`B01#${mesh.meshId}#${n.nodeId}`})), elements:mesh.elements.map((e)=>({elementId:e.elementId,elementType:e.elementType,nodeIds:e.nodeIds,materialId:'MAT',thickness:Number(c.geometry.thickness),sourceReference:`B01#${mesh.meshId}#${e.elementId}`})), elementTypePolicy:{allowT3Fallback:mesh.family==='T3',sourceReference:'B01#RIGID_NULLSPACE'}, constraints:[], loadCases:[{loadCaseId:'AFFINE',nodalForces:[],edgeTractions:[],pressureLoads:[],bodyForces:[],temperatureLoads:[],imposedDisplacements,sourceReference:'B01#RIGID_NULLSPACE'}], resultRequests:{loadCaseIds:['AFFINE']}, qualificationProfile:JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)), limitations:['B01_RIGID_NULLSPACE_DIAGNOSTIC_ONLY','NO_RELEASE_AUTHORITY_FROM_B01'] };
}
function materialize(m,c){const W=Number(c.geometry.width),H=Number(c.geometry.height);return {meshId:m.meshId,family:m.family,nodes:m.nodes.map((r)=>({nodeId:r[0],x:Number(r[1])*W,y:Number(r[2])*H,boundarySides:r[3]})),elements:m.elements.map((r)=>({elementId:r[0],elementType:m.family,nodeIds:r[1]}))};}
function affineAt(a,x,y){return {ux:a.u0+a.ux*x+a.uy*y,uy:a.v0+a.vx*x+a.vy*y};}
function num(o){return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Number(v)]));}
function maxAbs(v){return v.reduce((m,x)=>Math.max(m,Math.abs(x??0)),0);}
function read(f){return JSON.parse(fs.readFileSync(f,'utf8'));}
function git(args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();}
