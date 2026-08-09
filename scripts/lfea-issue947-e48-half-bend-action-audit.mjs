#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inspectCaesarAccdbLinearCaseMechanics } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const CASE_ID = 'L19';
const SOURCE_ELEMENT_ID = '48';
const MID_NODE_ID = '21719';
const COMPONENT_LIMIT = 0.1;
const DOFS = Object.freeze(['UX','UY','UZ','RX','RY','RZ']);
const FORCE = Object.freeze(['FX','FY','FZ']);
const MOMENT = Object.freeze(['MX','MY','MZ']);
const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.raw || !args.e48) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e48-half-bend-action-audit.mjs --package <canonical-package.json> --raw <raw-export.json> --e48 <e48-condensation.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
const e48 = JSON.parse(readFileSync(args.e48, 'utf8'));
assert.equal(pkg.source.sha256, EXPECTED_SOURCE_SHA256);
assert.equal(e48.sourceAccdbSha256, EXPECTED_SOURCE_SHA256);
assert.ok(e48.productionParity.maxAbsResidual <= 1e-3);

const source = requireSourceRow(pkg, SOURCE_ELEMENT_ID);
const fromNode = String(source.FROM_NODE);
const toNode = String(source.TO_NODE);
const inspection = inspectCaesarAccdbLinearCaseMechanics(pkg, CASE_ID);
assert.equal(inspection.executionStatus, 'QUALIFIED');
const descendants = inspection.elements.filter((entry) => String(entry.sourceElementId) === SOURCE_ELEMENT_ID);
const chain = requireOrderedChain(descendants, fromNode, toNode);
const splitIndex = chain.findIndex((entry) => String(entry.nodeJ) === MID_NODE_ID);
if (splitIndex < 0 || splitIndex >= chain.length - 1) throw new TypeError('E48 midpoint does not split descendant chain into two nonempty halves.');
const nearChain = chain.slice(0, splitIndex + 1);
const farChain = chain.slice(splitIndex + 1);
assert.equal(String(nearChain.at(-1).nodeJ), MID_NODE_ID);
assert.equal(String(farChain[0].nodeI), MID_NODE_ID);

const rawNodes = new Map([fromNode, MID_NODE_ID, toNode].map((id) => [id, rawNodeDof(raw, id)]));
const rawForceRows = rawE48ForceRows(raw, fromNode, MID_NODE_ID, toNode);

const near = auditHalf({ label: 'NEAR_HALF', chain: nearChain, nodeI: fromNode, nodeJ: MID_NODE_ID,
  boundary: [...rawNodes.get(fromNode), ...rawNodes.get(MID_NODE_ID)], referenceAction: rawForceRows.near });
const far = auditHalf({ label: 'FAR_HALF', chain: farChain, nodeI: MID_NODE_ID, nodeJ: toNode,
  boundary: [...rawNodes.get(MID_NODE_ID), ...rawNodes.get(toNode)], referenceAction: rawForceRows.far });

const junctionEquilibrium = add(near.referenceAction.slice(6,12), far.referenceAction.slice(0,6));
const junctionPredictedEquilibrium = add(near.predictedAction.slice(6,12), far.predictedAction.slice(0,6));
const classification = near.maxAbsNormalizedResidual <= COMPONENT_LIMIT && far.maxAbsNormalizedResidual <= COMPONENT_LIMIT
  ? 'E48_BOTH_RAW_HALF_BEND_ACTIONS_PASS_CURRENT_PRODUCTION_DESCENDANTS'
  : near.maxAbsNormalizedResidual > COMPONENT_LIMIT && far.maxAbsNormalizedResidual > COMPONENT_LIMIT
    ? 'E48_BOTH_HALF_BENDS_ADMISSIBLY_DIVERGE_FROM_RAW_CAESAR_ACTIONS'
    : near.maxAbsNormalizedResidual > COMPONENT_LIMIT
      ? 'E48_NEAR_HALF_BEND_ADMISSIBLY_DIVERGES_FAR_HALF_PASSES'
      : 'E48_FAR_HALF_BEND_ADMISSIBLY_DIVERGES_NEAR_HALF_PASSES';

const output = {
  schema: 'lfea-issue947-e48-half-bend-action-audit/v1',
  issue: 947,
  caseId: CASE_ID,
  sourceElementId: SOURCE_ELEMENT_ID,
  bendPointer: Number(source.BEND_PTR),
  midpointNodeId: MID_NODE_ID,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'DIRECT_RAW_CAESAR_HALF_BEND_ACTION_FALSIFICATION_NO_NEIGHBOR_EQUILIBRIUM_INFERENCE_NO_PARAMETER_FIT_NO_PRODUCTION_UPDATE',
  governingEquations: {
    internalRecovery: 'K_ii u_i = f_eq,i + f_0,i - K_ib u_b',
    boundaryAction: 'q_b = K_c u_b - f_eq,c - f_0,c',
  },
  rawBoundaryDof: Object.fromEntries(rawNodes),
  rawJunctionActionEquilibrium: {
    residual: junctionEquilibrium,
    maxAbsResidual: maxAbs(junctionEquilibrium),
  },
  predictedJunctionActionEquilibrium: {
    residual: junctionPredictedEquilibrium,
    maxAbsResidual: maxAbs(junctionPredictedEquilibrium),
  },
  nearHalf: near,
  farHalf: far,
  gates: {
    wholeE48ProductionCondensationParity: e48.productionParity.maxAbsResidual <= 1e-3 ? 'PASS' : 'FAIL',
    rawHalfJunctionEquilibrium: maxAbs(junctionEquilibrium) <= 1e-3 ? 'PASS' : 'FAIL',
    nearHalfExistingTenPercentActionGate: near.maxAbsNormalizedResidual <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
    farHalfExistingTenPercentActionGate: far.maxAbsNormalizedResidual <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
  },
  classification,
  disposition: 'Use the failing half and governing raw action components to localize E48. No bend stiffness/free-field production change is authorized by this diagnostic alone.',
  falsificationRule: 'A half-bend mismatch is admissible only when the exact current production descendants are statically condensed to the same raw CAESAR half-bend endpoints, the raw midpoint action pair equilibrates, the whole-E48 production parity prerequisite remains <=1e-3 N/Nm, and the direct raw CAESAR half-bend action exceeds the unchanged 10% gate without any neighboring-element inference.',
};
if (maxAbs(junctionEquilibrium) > 1e-3) throw new Error(`Raw E48 midpoint action does not equilibrate: ${maxAbs(junctionEquilibrium)}`);
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 E48 half-bend action audit: ${classification}`);

function auditHalf({ label, chain, nodeI, nodeJ, boundary, referenceAction }) {
  const assembled = assembleChain(chain);
  assert.equal(assembled.nodeIds[0], nodeI);
  assert.equal(assembled.nodeIds.at(-1), nodeJ);
  const condensed = condense(assembled);
  const predictedAction = recoverAction(condensed, boundary);
  const scales = actionScales(referenceAction, pkg.profile.tolerances);
  const residual = subtract(predictedAction, referenceAction);
  const normalizedResidual = residual.map((value,index) => value / scales[index]);
  const abs = normalizedResidual.map(Math.abs);
  const max = Math.max(...abs);
  return {
    label,
    nodeI,
    nodeJ,
    descendantCount: chain.length,
    descendantElementIds: chain.map((entry) => entry.elementId),
    boundaryDof: boundary,
    referenceAction,
    predictedAction,
    residual,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: max,
    governingComponent: actionLabel(abs.indexOf(max)),
    statusAtExistingTenPercentGate: max <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
  };
}

function rawE48ForceRows(raw, fromNode, midNode, toNode) {
  const rows = raw.tables?.OUTPUT_GLOBAL_ELEMENT_FORCES?.rows;
  if (!Array.isArray(rows)) throw new TypeError('Raw custody lacks OUTPUT_GLOBAL_ELEMENT_FORCES.');
  const l19 = rows.filter((row) => Number(row.LCASE_NUM) === 19);
  const near = l19.filter((row) => String(row.FROM_NODE) === fromNode && String(row.TO_NODE) === midNode);
  const far = l19.filter((row) => String(row.FROM_NODE) === midNode && String(row.TO_NODE) === toNode);
  if (near.length !== 1 || far.length !== 1) throw new TypeError(`Expected one raw E48 half row each; near=${near.length}, far=${far.length}.`);
  return { near: rawAction(near[0]), far: rawAction(far[0]) };
}
function rawAction(row) {
  return [Number(row.FXF),Number(row.FYF),Number(row.FZF),Number(row.MXF),Number(row.MYF),Number(row.MZF),
    Number(row.FXT),Number(row.FYT),Number(row.FZT),Number(row.MXT),Number(row.MYT),Number(row.MZT)];
}
function rawNodeDof(raw, nodeId) {
  const rows = raw.tables?.OUTPUT_DISPLACEMENTS?.rows;
  const matches = rows.filter((row) => Number(row.LCASE_NUM) === 19 && String(row.NODE) === nodeId);
  if (matches.length !== 1) throw new TypeError(`Expected one raw L19 node ${nodeId}; found ${matches.length}.`);
  const r = matches[0];
  return [Number(r.DX)*MM_TO_M,Number(r.DY)*MM_TO_M,Number(r.DZ)*MM_TO_M,
    Number(r.RX)*DEG_TO_RAD,Number(r.RY)*DEG_TO_RAD,Number(r.RZ)*DEG_TO_RAD];
}
function requireSourceRow(pkg,id) {
  const matches=pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter((row)=>String(row.ELEMENTID)===id);
  if(matches.length!==1) throw new TypeError(`Expected one E${id}; found ${matches.length}.`);
  return matches[0];
}
function requireOrderedChain(entries,fromNode,toNode) {
  const remaining=new Map(entries.map((e)=>[e.elementId,e])); const ordered=[]; let node=fromNode;
  while(node!==toNode){const c=[...remaining.values()].filter((e)=>String(e.nodeI)===node); if(c.length!==1) throw new TypeError(`Chain ${node} has ${c.length} outgoing.`); const e=c[0]; ordered.push(e); remaining.delete(e.elementId); node=String(e.nodeJ);}
  if(remaining.size) throw new TypeError(`Disconnected descendants: ${remaining.size}`); return ordered;
}
function assembleChain(chain) {
  const nodeIds=[String(chain[0].nodeI),...chain.map((e)=>String(e.nodeJ))]; const idx=new Map(nodeIds.map((id,i)=>[id,i])); const n=nodeIds.length*6;
  const stiffness=matrix(n,n), equivalent=new Array(n).fill(0), initial=new Array(n).fill(0);
  for(const e of chain){const i=idx.get(String(e.nodeI)),j=idx.get(String(e.nodeJ)); addElementMatrix(stiffness,e.globalStiffness,i,j); addElementVector(equivalent,e.equivalentLoadGlobal,i,j); addElementVector(initial,e.initialStrainLoadGlobal,i,j);}
  return {nodeIds,stiffness,equivalent,initial};
}
function condense(full) {
  const n=full.nodeIds.length; const boundary=[...Array.from({length:6},(_,i)=>i),...Array.from({length:6},(_,i)=>(n-1)*6+i)]; const internal=Array.from({length:Math.max(0,(n-2)*6)},(_,i)=>6+i);
  if(!internal.length) return {stiffness:flatten(submatrix(full.stiffness,boundary,boundary)),equivalent:subvector(full.equivalent,boundary),initial:subvector(full.initial,boundary)};
  const Kbb=submatrix(full.stiffness,boundary,boundary),Kbi=submatrix(full.stiffness,boundary,internal),Kib=submatrix(full.stiffness,internal,boundary),Kii=submatrix(full.stiffness,internal,internal);
  const X=solveColumns(Kii,Kib); const Kc=subtractMatrix(Kbb,multiplyMatrices(Kbi,X));
  const load=(v)=>{const fb=subvector(v,boundary),fi=subvector(v,internal),yi=solveDense(Kii,fi),corr=multiplyVector(Kbi,yi); return fb.map((x,i)=>x-corr[i]);};
  return {stiffness:flatten(Kc),equivalent:load(full.equivalent),initial:load(full.initial)};
}
function recoverAction(c,d){const kd=multiplyFlat12(c.stiffness,d); return kd.map((v,i)=>v-c.equivalent[i]-c.initial[i]);}
function actionScales(ref,t){const floors=[...new Array(3).fill(Number(t.GLOBAL_END_FORCE_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_FORCE_TO.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_TO.scaleFloor))]; return ref.map((v,i)=>Math.max(Math.abs(v),floors[i]));}
function actionLabel(i){const end=i<6?'FROM':'TO',local=i%6,comp=local<3?FORCE[local]:MOMENT[local-3];return `${end}:${comp}`;}
function addElementMatrix(g,l,ni,nj){const map=[...Array.from({length:6},(_,i)=>ni*6+i),...Array.from({length:6},(_,i)=>nj*6+i)];for(let r=0;r<12;r++)for(let c=0;c<12;c++)g[map[r]][map[c]]+=l[r*12+c];}
function addElementVector(g,l,ni,nj){const map=[...Array.from({length:6},(_,i)=>ni*6+i),...Array.from({length:6},(_,i)=>nj*6+i)];for(let i=0;i<12;i++)g[map[i]]+=l[i];}
function matrix(r,c){return Array.from({length:r},()=>new Array(c).fill(0));} function submatrix(A,r,c){return r.map((i)=>c.map((j)=>A[i][j]));} function subvector(v,r){return r.map((i)=>v[i]);} function flatten(A){return A.flat();}
function subtractMatrix(A,B){return A.map((r,i)=>r.map((v,j)=>v-B[i][j]));} function multiplyMatrices(A,B){const o=matrix(A.length,B[0].length);for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++){const a=A[i][k];if(a===0)continue;for(let j=0;j<B[0].length;j++)o[i][j]+=a*B[k][j];}return o;}
function multiplyVector(A,x){return A.map((r)=>r.reduce((s,v,i)=>s+v*x[i],0));} function multiplyFlat12(A,x){return new Array(12).fill(0).map((_,r)=>{let s=0;for(let c=0;c<12;c++)s+=A[r*12+c]*x[c];return s;});}
function solveColumns(A,B){const o=matrix(A.length,B[0].length);for(let c=0;c<B[0].length;c++){const x=solveDense(A,B.map((r)=>r[c]));for(let r=0;r<A.length;r++)o[r][c]=x[r];}return o;}
function solveDense(A,rhs){const n=A.length,M=A.map((r,i)=>[...r,rhs[i]]);for(let p=0;p<n;p++){let b=p;for(let r=p+1;r<n;r++)if(Math.abs(M[r][p])>Math.abs(M[b][p]))b=r;if(!(Math.abs(M[b][p])>1e-18))throw new Error(`SINGULAR_${p}`);[M[p],M[b]]=[M[b],M[p]];const d=M[p][p];for(let c=p;c<=n;c++)M[p][c]/=d;for(let r=0;r<n;r++){if(r===p)continue;const f=M[r][p];if(f===0)continue;for(let c=p;c<=n;c++)M[r][c]-=f*M[p][c];}}return M.map((r)=>r[n]);}
function add(a,b){return a.map((v,i)=>v+b[i]);} function subtract(a,b){return a.map((v,i)=>v-b[i]);} function maxAbs(v){return Math.max(...v.map(Math.abs));}
function parseArgs(tokens){const r={};for(let i=0;i<tokens.length;i++){const t=tokens[i];if(!t.startsWith('--'))throw new TypeError(`Unexpected ${t}`);const v=tokens[i+1];if(v===undefined||v.startsWith('--'))throw new TypeError(`Missing ${t}`);r[t.slice(2)]=v;i++;}return r;}
