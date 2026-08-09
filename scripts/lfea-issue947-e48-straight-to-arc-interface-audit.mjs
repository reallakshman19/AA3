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
if (!args.package || !args.raw) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e48-straight-to-arc-interface-audit.mjs --package <canonical-package.json> --raw <raw-export.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
assert.equal(pkg.source.sha256, EXPECTED_SOURCE_SHA256);
const source = requireSourceRow(pkg, SOURCE_ELEMENT_ID);
const sourceFrom = String(source.FROM_NODE);
const sourceTo = String(source.TO_NODE);
const inspection = inspectCaesarAccdbLinearCaseMechanics(pkg, CASE_ID);
assert.equal(inspection.executionStatus, 'QUALIFIED');
const descendants = requireOrderedChain(
  inspection.elements.filter((entry) => String(entry.sourceElementId) === SOURCE_ELEMENT_ID),
  sourceFrom,
  sourceTo,
);
const straight = descendants.filter((entry) => entry.kind === 'BEND_INCOMING_STRAIGHT');
assert.equal(straight.length, 1, 'E48 must have exactly one incoming straight descendant.');
assert.equal(descendants[0].elementId, straight[0].elementId, 'E48 incoming straight must be first descendant.');
const tangentNode = String(straight[0].nodeJ);
const midpointSplit = descendants.findIndex((entry) => String(entry.nodeJ) === MID_NODE_ID);
if (midpointSplit < 1) throw new TypeError('E48 midpoint must occur after incoming straight and at least one arc descendant.');
const nearArc = descendants.slice(1, midpointSplit + 1);
assert.ok(nearArc.every((entry) => entry.kind === 'BEND_ARC'));
assert.equal(String(nearArc[0].nodeI), tangentNode);
assert.equal(String(nearArc.at(-1).nodeJ), MID_NODE_ID);

const rawNear = rawNearHalf(raw, sourceFrom, MID_NODE_ID);
const dSource = rawNodeDof(raw, sourceFrom);
const dMid = rawNodeDof(raw, MID_NODE_ID);
const straightTransfer = solveStraightTangentState(straight[0], dSource, rawNear.action.slice(0,6));
const arcReference = [
  ...straightTransfer.tangentAction.map((value) => -value),
  ...rawNear.action.slice(6,12),
];
const arcAssembly = assembleChain(nearArc);
const arcCondensed = condense(arcAssembly);
const arcBoundary = [...straightTransfer.tangentDof, ...dMid];
const arcPredicted = recoverAction(arcCondensed, arcBoundary);
const arcComparison = compareAction(arcPredicted, arcReference, pkg.profile.tolerances);

// Independent equilibrium witness: inferred arc action at the tangent must
// balance the straight J action exactly by construction, while the midpoint
// reference is the direct raw CAESAR TO action of the near half-bend row.
const tangentEquilibrium = add(straightTransfer.tangentAction, arcReference.slice(0,6));
const rawNearWhole = recoverWholeNear(descendants.slice(0, midpointSplit + 1), [...dSource, ...dMid]);
const rawNearComparison = compareAction(rawNearWhole, rawNear.action, pkg.profile.tolerances);

const classification = arcComparison.maxAbsNormalizedResidual <= COMPONENT_LIMIT
  ? 'E48_REFINED_NEAR_ARC_PASSES_AFTER_QUALIFIED_STRAIGHT_STUB_TRANSFER'
  : arcComparison.maxAbsNormalizedResidual < rawNearComparison.maxAbsNormalizedResidual
    ? 'E48_STRAIGHT_TO_ARC_TRANSFER_IMPROVES_BUT_NEAR_ARC_REMAINS_ADMISSIBLY_DIVERGENT'
    : 'E48_STRAIGHT_TO_ARC_INTERFACE_TRANSFER_FALSIFIED_AS_NEAR_HALF_EXPLANATION';

const output = {
  schema: 'lfea-issue947-e48-straight-to-arc-interface-audit/v1',
  issue: 947,
  caseId: CASE_ID,
  sourceElementId: SOURCE_ELEMENT_ID,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'QUALIFIED_STRAIGHT_TRANSFER_PLUS_REFINED_ARC_INTERFACE_FALSIFICATION_NO_PARAMETER_FIT_NO_PRODUCTION_UPDATE',
  prerequisites: {
    expectedRefinedBendMaxAngleDegrees: 0.625,
    actualNearArcDescendantCount: nearArc.length,
    incomingStraightElementId: straight[0].elementId,
    tangentNodeId: tangentNode,
    midpointNodeId: MID_NODE_ID,
    straightPressureAxialStrain: straight[0].pressureAxialStrain,
    straightGravityWeightN: straight[0].gravityWeightN,
  },
  governingEquations: {
    straightIAction: 'q_I = K_II d_I + K_IJ d_J - f_eq,I - f_0,I',
    solvedTangentDof: 'd_J = K_IJ^-1 (q_I + f_eq,I + f_0,I - K_II d_I)',
    straightJAction: 'q_J = K_JI d_I + K_JJ d_J - f_eq,J - f_0,J',
    tangentEquilibrium: 'q_arc,I = -q_straight,J',
    refinedArcRecovery: 'q_arc = Kc_arc d_[T,M] - f_eq,c - f_0,c',
  },
  rawCaesarNearHalf: {
    sourceNodeId: sourceFrom,
    midpointNodeId: MID_NODE_ID,
    sourceDof: dSource,
    midpointDof: dMid,
    action: rawNear.action,
  },
  straightTransfer: {
    tangentNodeId: tangentNode,
    tangentDof: straightTransfer.tangentDof,
    tangentAction: straightTransfer.tangentAction,
    sourceActionClosureResidual: straightTransfer.sourceActionClosureResidual,
    sourceActionClosureMaxAbs: maxAbs(straightTransfer.sourceActionClosureResidual),
    tangentMinusRigidTransfer: subtract(straightTransfer.tangentDof, rigidTransferDof(dSource, straight[0])),
  },
  tangentEquilibrium: {
    residual: tangentEquilibrium,
    maxAbsResidual: maxAbs(tangentEquilibrium),
  },
  refinedNearArc: {
    descendantCount: nearArc.length,
    descendantElementIds: nearArc.map((entry) => entry.elementId),
    boundaryDof: arcBoundary,
    referenceAction: arcReference,
    predictedAction: arcPredicted,
    ...arcComparison,
  },
  wholeNearHalfAtSameRefinedMesh: {
    predictedAction: rawNearWhole,
    referenceAction: rawNear.action,
    ...rawNearComparison,
  },
  gates: {
    straightSourceActionClosure: maxAbs(straightTransfer.sourceActionClosureResidual) <= 1e-6 ? 'PASS' : 'FAIL',
    tangentActionEquilibrium: maxAbs(tangentEquilibrium) <= 1e-9 ? 'PASS' : 'FAIL',
    refinedNearArcExistingTenPercentActionGate: arcComparison.maxAbsNormalizedResidual <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
  },
  classification,
  disposition: classification === 'E48_REFINED_NEAR_ARC_PASSES_AFTER_QUALIFIED_STRAIGHT_STUB_TRANSFER'
    ? 'The independently transferred 0.400 mm straight and refined arc are individually compatible with CAESAR. The whole-near mismatch is then a source/interface representation issue; do not invent a new bend stiffness law. A production candidate must preserve straight Bourdon physics and demonstrate whole-model L19 improvement with no new failures.'
    : 'The accepted straight transfer does not fully resolve the near arc. Do not change the straight Bourdon law from residual fit; continue with bend near-end axial-shape/interface formulation authority.',
  falsificationRule: 'The interface hypothesis passes only if the tangent state is solved from the direct raw CAESAR source action using the unchanged accepted straight element, source action closure is <=1e-6, tangent equilibrium is exact, and the refined arc alone closes every direct/inferred endpoint action component inside the unchanged 10% gate.',
};
if (output.gates.straightSourceActionClosure !== 'PASS' || output.gates.tangentActionEquilibrium !== 'PASS') {
  throw new Error(`E48 straight transfer prerequisite failed: ${JSON.stringify(output.gates)}`);
}
if (args.out) writeFileSync(args.out, `${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify(output,null,2));
console.log(`Issue 947 E48 straight-to-arc interface audit: ${classification}`);

function solveStraightTangentState(entry, dI, qI) {
  const K = unflatten12(entry.globalStiffness);
  const KII = submatrix(K,[0,1,2,3,4,5],[0,1,2,3,4,5]);
  const KIJ = submatrix(K,[0,1,2,3,4,5],[6,7,8,9,10,11]);
  const KJI = submatrix(K,[6,7,8,9,10,11],[0,1,2,3,4,5]);
  const KJJ = submatrix(K,[6,7,8,9,10,11],[6,7,8,9,10,11]);
  const fI = add(entry.equivalentLoadGlobal.slice(0,6), entry.initialStrainLoadGlobal.slice(0,6));
  const fJ = add(entry.equivalentLoadGlobal.slice(6,12), entry.initialStrainLoadGlobal.slice(6,12));
  const rhs = add(add(qI, fI), scale(multiplyVector(KII,dI),-1));
  const dJ = solveDense(KIJ,rhs);
  const qICheck = subtract(add(multiplyVector(KII,dI), multiplyVector(KIJ,dJ)), fI);
  const qJ = subtract(add(multiplyVector(KJI,dI), multiplyVector(KJJ,dJ)), fJ);
  return { tangentDof:dJ, tangentAction:qJ, sourceActionClosureResidual:subtract(qICheck,qI) };
}
function rigidTransferDof(dI, entry) {
  const r = subtract(entry.nodeJPosition ?? [0,0,0], entry.nodeIPosition ?? [0,0,0]);
  if (maxAbs(r) === 0) return dI;
  const u = dI.slice(0,3), th=dI.slice(3,6), du=cross(th,r);
  return [...add(u,du),...th];
}
function recoverWholeNear(chain,boundary){const c=condense(assembleChain(chain));return recoverAction(c,boundary);}
function rawNearHalf(raw,from,mid){const rows=raw.tables?.OUTPUT_GLOBAL_ELEMENT_FORCES?.rows;if(!Array.isArray(rows))throw new TypeError('Raw force table missing.');const m=rows.filter((r)=>Number(r.LCASE_NUM)===19&&String(r.FROM_NODE)===from&&String(r.TO_NODE)===mid);if(m.length!==1)throw new TypeError(`Expected one raw near half row; found ${m.length}.`);return {action:rawAction(m[0])};}
function rawAction(r){return [Number(r.FXF),Number(r.FYF),Number(r.FZF),Number(r.MXF),Number(r.MYF),Number(r.MZF),Number(r.FXT),Number(r.FYT),Number(r.FZT),Number(r.MXT),Number(r.MYT),Number(r.MZT)];}
function rawNodeDof(raw,id){const rows=raw.tables?.OUTPUT_DISPLACEMENTS?.rows;const m=rows.filter((r)=>Number(r.LCASE_NUM)===19&&String(r.NODE)===id);if(m.length!==1)throw new TypeError(`Expected raw node ${id}; found ${m.length}.`);const r=m[0];return [Number(r.DX)*MM_TO_M,Number(r.DY)*MM_TO_M,Number(r.DZ)*MM_TO_M,Number(r.RX)*DEG_TO_RAD,Number(r.RY)*DEG_TO_RAD,Number(r.RZ)*DEG_TO_RAD];}
function requireSourceRow(pkg,id){const m=pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter((r)=>String(r.ELEMENTID)===id);if(m.length!==1)throw new TypeError(`Expected one E${id}; found ${m.length}.`);return m[0];}
function requireOrderedChain(entries,from,to){const rem=new Map(entries.map((e)=>[e.elementId,e]));const out=[];let n=from;while(n!==to){const c=[...rem.values()].filter((e)=>String(e.nodeI)===n);if(c.length!==1)throw new TypeError(`Chain ${n} outgoing=${c.length}`);const e=c[0];out.push(e);rem.delete(e.elementId);n=String(e.nodeJ);}if(rem.size)throw new TypeError(`Disconnected ${rem.size}`);return out;}
function assembleChain(chain){const nodeIds=[String(chain[0].nodeI),...chain.map((e)=>String(e.nodeJ))];const idx=new Map(nodeIds.map((id,i)=>[id,i]));const n=nodeIds.length*6,K=matrix(n,n),eq=new Array(n).fill(0),init=new Array(n).fill(0);for(const e of chain){const i=idx.get(String(e.nodeI)),j=idx.get(String(e.nodeJ));addElementMatrix(K,e.globalStiffness,i,j);addElementVector(eq,e.equivalentLoadGlobal,i,j);addElementVector(init,e.initialStrainLoadGlobal,i,j);}return{nodeIds,stiffness:K,equivalent:eq,initial:init};}
function condense(full){const n=full.nodeIds.length,b=[...Array.from({length:6},(_,i)=>i),...Array.from({length:6},(_,i)=>(n-1)*6+i)],ii=Array.from({length:Math.max(0,(n-2)*6)},(_,i)=>6+i);if(!ii.length)return{stiffness:flatten(submatrix(full.stiffness,b,b)),equivalent:subvector(full.equivalent,b),initial:subvector(full.initial,b)};const Kbb=submatrix(full.stiffness,b,b),Kbi=submatrix(full.stiffness,b,ii),Kib=submatrix(full.stiffness,ii,b),Kii=submatrix(full.stiffness,ii,ii),X=solveColumns(Kii,Kib),Kc=subtractMatrix(Kbb,multiplyMatrices(Kbi,X));const load=(v)=>{const fb=subvector(v,b),fi=subvector(v,ii),yi=solveDense(Kii,fi),corr=multiplyVector(Kbi,yi);return fb.map((x,i)=>x-corr[i]);};return{stiffness:flatten(Kc),equivalent:load(full.equivalent),initial:load(full.initial)};}
function recoverAction(c,d){const kd=multiplyFlat12(c.stiffness,d);return kd.map((v,i)=>v-c.equivalent[i]-c.initial[i]);}
function compareAction(pred,ref,t){const scales=actionScales(ref,t),res=subtract(pred,ref),norm=res.map((v,i)=>v/scales[i]),abs=norm.map(Math.abs),max=Math.max(...abs);return{residual:res,scales,normalizedResidual:norm,normalizedResidualL2:Math.hypot(...norm),maxAbsNormalizedResidual:max,governingComponent:actionLabel(abs.indexOf(max)),statusAtExistingTenPercentGate:max<=COMPONENT_LIMIT?'PASS':'FAIL'};}
function actionScales(ref,t){const floors=[...new Array(3).fill(Number(t.GLOBAL_END_FORCE_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_FROM.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_FORCE_TO.scaleFloor)),...new Array(3).fill(Number(t.GLOBAL_END_MOMENT_TO.scaleFloor))];return ref.map((v,i)=>Math.max(Math.abs(v),floors[i]));}
function actionLabel(i){const end=i<6?'FROM':'TO',l=i%6,c=l<3?FORCE[l]:MOMENT[l-3];return`${end}:${c}`;}
function unflatten12(v){return Array.from({length:12},(_,r)=>v.slice(r*12,r*12+12));}
function addElementMatrix(g,l,ni,nj){const map=[...Array.from({length:6},(_,i)=>ni*6+i),...Array.from({length:6},(_,i)=>nj*6+i)];for(let r=0;r<12;r++)for(let c=0;c<12;c++)g[map[r]][map[c]]+=l[r*12+c];}
function addElementVector(g,l,ni,nj){const map=[...Array.from({length:6},(_,i)=>ni*6+i),...Array.from({length:6},(_,i)=>nj*6+i)];for(let i=0;i<12;i++)g[map[i]]+=l[i];}
function matrix(r,c){return Array.from({length:r},()=>new Array(c).fill(0));}function submatrix(A,r,c){return r.map((i)=>c.map((j)=>A[i][j]));}function subvector(v,r){return r.map((i)=>v[i]);}function flatten(A){return A.flat();}function subtractMatrix(A,B){return A.map((r,i)=>r.map((v,j)=>v-B[i][j]));}function multiplyMatrices(A,B){const o=matrix(A.length,B[0].length);for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++){const a=A[i][k];if(a===0)continue;for(let j=0;j<B[0].length;j++)o[i][j]+=a*B[k][j];}return o;}function multiplyVector(A,x){return A.map((r)=>r.reduce((s,v,i)=>s+v*x[i],0));}function multiplyFlat12(A,x){return Array.from({length:12},(_,r)=>{let s=0;for(let c=0;c<12;c++)s+=A[r*12+c]*x[c];return s;});}function solveColumns(A,B){const o=matrix(A.length,B[0].length);for(let c=0;c<B[0].length;c++){const x=solveDense(A,B.map((r)=>r[c]));for(let r=0;r<A.length;r++)o[r][c]=x[r];}return o;}function solveDense(A,rhs){const n=A.length,M=A.map((r,i)=>[...r,rhs[i]]);for(let p=0;p<n;p++){let b=p;for(let r=p+1;r<n;r++)if(Math.abs(M[r][p])>Math.abs(M[b][p]))b=r;if(!(Math.abs(M[b][p])>1e-18))throw new Error(`SINGULAR_${p}`);[M[p],M[b]]=[M[b],M[p]];const d=M[p][p];for(let c=p;c<=n;c++)M[p][c]/=d;for(let r=0;r<n;r++){if(r===p)continue;const f=M[r][p];if(f===0)continue;for(let c=p;c<=n;c++)M[r][c]-=f*M[p][c];}}return M.map((r)=>r[n]);}
function add(a,b){return a.map((v,i)=>v+b[i]);}function subtract(a,b){return a.map((v,i)=>v-b[i]);}function scale(a,s){return a.map((v)=>v*s);}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function maxAbs(v){return Math.max(...v.map(Math.abs));}
function parseArgs(tokens){const r={};for(let i=0;i<tokens.length;i++){const t=tokens[i];if(!t.startsWith('--'))throw new TypeError(`Unexpected ${t}`);const v=tokens[i+1];if(v===undefined||v.startsWith('--'))throw new TypeError(`Missing ${t}`);r[t.slice(2)]=v;i++;}return r;}
