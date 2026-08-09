#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  distributedLoadLocalVector,
  frameLocalStiffness,
  frameTransformationMatrix,
  thermalInitialStrainVector,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import {
  FRAME_LOCAL_AXIS_PROFILE,
  resolveFrameLocalAxes,
} from '../src/core/centerline-beam-fea/index.js';
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const ACTION_LABELS = Object.freeze([
  'FROM:FX','FROM:FY','FROM:FZ','FROM:MX','FROM:MY','FROM:MZ',
  'TO:FX','TO:FY','TO:FZ','TO:MX','TO:MY','TO:MZ',
]);
const BENDING_SHEAR_COMPONENTS = Object.freeze([
  'FROM:FY','FROM:MZ','TO:FY','TO:MZ',
  'FROM:FZ','FROM:MY','TO:FZ','TO:MY',
]);

const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('Usage: node scripts/lfea-issue947-e80-production-parity-inverse-shear.mjs --package <canonical-package.json> [--out <json>]');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);

const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.map((row) => [String(row.ELEMENTID), row]));
const e80 = requireSourceRow(sourceRows, '80');
assert.equal(Number(e80.BEND_PTR), 0);
assert.equal(Number(e80.RIGID_PTR), 0);
assert.equal(Number(e80.REDUCER_PTR), 0);
assert.equal(String(e80.FROM_NODE), '22130');
assert.equal(String(e80.TO_NODE), '22140');

const coordinates = sourceCoordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const pointI = requireCoordinate(coordinates, '22130');
const pointJ = requireCoordinate(coordinates, '22140');
const section = annularSection(e80);
const material = materialState(e80);
const axesResult = resolveFrameLocalAxes({
  nodeI: pointI,
  nodeJ: pointJ,
  referenceVector: [0, 0, 1],
  profile: FRAME_LOCAL_AXIS_PROFILE,
});
const transformation = frameTransformationMatrix(axesResult.axes);
const length = Math.hypot(pointJ[0]-pointI[0], pointJ[1]-pointI[1], pointJ[2]-pointI[2]);
const lineWeight = physicalLineWeight(e80, section, pkg.profile.linearSolve.gravityAcceleration);
const pressureStrain = closedEndPressureAxialStrain(e80, material.elasticModulus);

const production = solveCaesarAccdbLinearBenchmark(pkg);
const productionRows = production.cases.L19.rows;
const referenceRows = pkg.references.L19.rows;
const sourceEntityId = sourceResultElementId(e80);
const productionAction = actionVector(productionRows, sourceEntityId);
const referenceAction = actionVector(referenceRows, sourceEntityId);
const lfeaBoundaryDof = boundaryDofVector(productionRows, ['22130','22140']);
const caesarBoundaryDof = boundaryDofVector(referenceRows, ['22130','22140']);

const productionParityAction = evaluateAtKappa(0.5, lfeaBoundaryDof);
const productionParityResidual = subtract(productionParityAction, productionAction);
const productionParityMaxAbs = Math.max(...productionParityResidual.map(Math.abs));
assert.ok(productionParityMaxAbs <= 1e-3, `E80 production parity failed: ${productionParityMaxAbs}`);

const currentCaesarInjection = evaluateAtKappa(0.5, caesarBoundaryDof);
const currentResidual = subtract(currentCaesarInjection, referenceAction);
const roots = {};
for (const label of BENDING_SHEAR_COMPONENTS) {
  const index = ACTION_LABELS.indexOf(label);
  roots[label] = findPositiveKappaRoots((kappa) => evaluateAtKappa(kappa, caesarBoundaryDof)[index] - referenceAction[index]);
}

const candidateKappas = [...new Set(Object.values(roots).flat().map((entry) => Number(entry.kappa.toPrecision(12))))].sort((a,b)=>a-b);
const candidateCrossChecks = candidateKappas.map((kappa) => {
  const action = evaluateAtKappa(kappa, caesarBoundaryDof);
  const residual = subtract(action, referenceAction);
  return {
    kappa,
    residual,
    normalizedResidual: normalizeResidual(residual, referenceAction, pkg.profile.tolerances),
  };
}).map((entry) => ({
  ...entry,
  normalizedResidualL2: Math.hypot(...entry.normalizedResidual),
  maxAbsNormalizedResidual: Math.max(...entry.normalizedResidual.map(Math.abs)),
  governingResidualDof: ACTION_LABELS[argmax(entry.normalizedResidual.map(Math.abs))],
}));

const output = {
  schema: 'lfea-issue947-e80-production-parity-inverse-shear/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  sourceElementId: '80',
  sourceNodes: ['22130','22140'],
  referenceUsage: 'DIAGNOSTIC_ONLY_INVERSE_IDENTIFICATION_NO_PARAMETER_FIT_NO_UPDATE_RULE',
  governingEquation: 'q_g=T^T[K_local(kappa) T d_g - f_g(phi_load=0) - f_p]',
  productionParity: {
    kappa: 0.5,
    lfeaBoundaryDof,
    productionAction,
    standaloneAction: productionParityAction,
    residual: productionParityResidual,
    maxAbsResidual: productionParityMaxAbs,
    status: 'PASS',
  },
  caesarInjectionAtCurrentAuthority: {
    kappa: 0.5,
    boundaryDof: caesarBoundaryDof,
    referenceAction,
    action: currentCaesarInjection,
    residual: currentResidual,
    normalizedResidual: normalizeResidual(currentResidual, referenceAction, pkg.profile.tolerances),
  },
  inverseKappaRootsByActionComponent: roots,
  candidateCrossChecks,
  falsificationRule: 'A universal shear-correction hypothesis is falsified if conjugate force/moment components require materially different positive kappa roots or if a root that matches one component worsens the coupled residual vector. No inverse root is production authority.',
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('Issue 947 E80 production parity and inverse shear audit PASS');

function evaluateAtKappa(kappa, displacementGlobal) {
  if (!(kappa > 0)) throw new TypeError(`kappa must be positive; got ${kappa}`);
  const stiffness = frameLocalStiffness({
    elasticModulus: material.elasticModulus,
    shearModulus: material.shearModulus,
    area: section.area,
    secondMomentY: section.secondMomentY,
    secondMomentZ: section.secondMomentZ,
    polarMoment: section.polarMoment,
    length,
    shearDeformation: true,
    shearCorrectionFactorY: kappa,
    shearCorrectionFactorZ: kappa,
  });
  const equivalentLocal = distributedLoadLocalVector({
    primitive: {
      kind: 'DISTRIBUTED_LOAD', basis: 'GLOBAL',
      startIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
      endIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
    },
    axes: axesResult.axes,
    length,
    phiXY: 0,
    phiXZ: 0,
  });
  const initialLocal = thermalInitialStrainVector({
    elasticModulus: material.elasticModulus,
    area: section.area,
    axialStrain: pressureStrain,
  });
  const localDof = transformDisplacementToLocal(displacementGlobal, transformation);
  const elasticLocal = multiply12(stiffness.matrix, localDof);
  const actionLocal = elasticLocal.map((value,index) => value - equivalentLocal[index] - initialLocal[index]);
  return transformLoadToGlobal(actionLocal, transformation);
}

function findPositiveKappaRoots(fn) {
  const grid = [];
  const logMin = Math.log(0.05);
  const logMax = Math.log(20);
  for (let i=0;i<=500;i+=1) grid.push(Math.exp(logMin + (logMax-logMin)*i/500));
  const roots = [];
  let a = grid[0];
  let fa = fn(a);
  for (let i=1;i<grid.length;i+=1) {
    const b = grid[i];
    const fb = fn(b);
    if (Number.isFinite(fa) && Number.isFinite(fb)) {
      if (Math.abs(fa) < 1e-10) roots.push({ kappa:a, residual:fa });
      if (fa * fb < 0) roots.push(bisect(fn,a,b,fa,fb));
    }
    a=b; fa=fb;
  }
  return dedupeRoots(roots);
}

function bisect(fn, a0, b0, fa0, fb0) {
  let a=a0,b=b0,fa=fa0,fb=fb0;
  for (let iteration=0;iteration<100;iteration+=1) {
    const mid=0.5*(a+b); const fm=fn(mid);
    if (Math.abs(fm) <= 1e-9 || Math.abs(b-a) <= 1e-12*Math.max(1,Math.abs(mid))) return { kappa:mid, residual:fm };
    if (fa*fm<=0) { b=mid; fb=fm; } else { a=mid; fa=fm; }
  }
  const mid=0.5*(a+b); return { kappa:mid, residual:fn(mid) };
}
function dedupeRoots(roots) {
  const sorted=[...roots].sort((a,b)=>a.kappa-b.kappa); const out=[];
  for (const root of sorted) if (!out.length || Math.abs(root.kappa-out[out.length-1].kappa)>1e-8*Math.max(1,root.kappa)) out.push(root);
  return out;
}

function actionVector(rows, entityId) {
  const quantities = [
    ['GLOBAL_END_FORCE_FROM','FX'],['GLOBAL_END_FORCE_FROM','FY'],['GLOBAL_END_FORCE_FROM','FZ'],
    ['GLOBAL_END_MOMENT_FROM','MX'],['GLOBAL_END_MOMENT_FROM','MY'],['GLOBAL_END_MOMENT_FROM','MZ'],
    ['GLOBAL_END_FORCE_TO','FX'],['GLOBAL_END_FORCE_TO','FY'],['GLOBAL_END_FORCE_TO','FZ'],
    ['GLOBAL_END_MOMENT_TO','MX'],['GLOBAL_END_MOMENT_TO','MY'],['GLOBAL_END_MOMENT_TO','MZ'],
  ];
  return quantities.map(([quantity,component]) => requireResult(rows,entityId,quantity,component));
}
function requireResult(rows, entityId, quantity, component) {
  const row=rows.find((entry)=>entry.entityKind==='ELEMENT'&&entry.entityId===entityId&&entry.quantity===quantity&&entry.component===component);
  if (!row) throw new TypeError(`Missing ${entityId} ${quantity}:${component}`);
  return Number(row.value);
}
function boundaryDofVector(rows,nodeIds) {
  return nodeIds.flatMap((nodeId)=>DOFS.map((dof)=>{
    const quantity=dof.startsWith('U')?'DISPLACEMENT':'ROTATION';
    const row=rows.find((entry)=>entry.entityKind==='NODE'&&String(entry.entityId)===String(nodeId)&&entry.quantity===quantity&&entry.component===dof);
    if (!row) throw new TypeError(`Missing ${nodeId}:${dof}`);
    return Number(row.value);
  }));
}
function sourceResultElementId(row) { return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}|${String(row.ELEMENT_NAME??'').trim()}`; }
function annularSection(row) {
  const outerDiameter=Number(row.DIAMETER)*MM_TO_M; const wallThickness=Number(row.WALL_THICK)*MM_TO_M; const innerDiameter=outerDiameter-2*wallThickness;
  const area=Math.PI*(outerDiameter**2-innerDiameter**2)/4; const I=Math.PI*(outerDiameter**4-innerDiameter**4)/64;
  return {outerDiameter,wallThickness,innerDiameter,area,secondMomentY:I,secondMomentZ:I,polarMoment:2*I};
}
function materialState(row) { const elasticModulus=Number(row.MODULUS)*KPA_TO_PA; const poissonRatio=Number(row.POISSONS); return {elasticModulus,poissonRatio,shearModulus:elasticModulus/(2*(1+poissonRatio))}; }
function physicalLineWeight(row,section,g) {
  const pipeDensity=Number(row.PIPE_DENSITY)*KG_PER_CM3_TO_KG_PER_M3; const fluidDensity=Number(row.FLUID_DENSITY)*KG_PER_CM3_TO_KG_PER_M3; const insulationDensity=Number(row.INSUL_DENSITY)*KG_PER_CM3_TO_KG_PER_M3;
  const insulationThickness=Number(row.INSUL_THICK)*MM_TO_M; const fluidArea=Math.PI*section.innerDiameter**2/4; const insulatedOd=section.outerDiameter+2*insulationThickness; const insulationArea=Math.PI*(insulatedOd**2-section.outerDiameter**2)/4;
  return g*(pipeDensity*section.area+fluidDensity*fluidArea+insulationDensity*insulationArea);
}
function closedEndPressureAxialStrain(row,E) { const Do=Number(row.DIAMETER)*MM_TO_M; const t=Number(row.WALL_THICK)*MM_TO_M; const Di=Do-2*t; const p=Number(row.PRESSURE1)*KPA_TO_PA; const nu=Number(row.POISSONS); return (1-2*nu)*p*Di**2/(E*(Do**2-Di**2)); }
function sourceCoordinateIndex(rows) { const out=new Map(); for (const row of rows) { setCoordinate(out,row.FROM_NODE,[row.FROM_NODE_X,row.FROM_NODE_Y,row.FROM_NODE_Z]); setCoordinate(out,row.TO_NODE,[row.TO_NODE_X,row.TO_NODE_Y,row.TO_NODE_Z]); } return out; }
function setCoordinate(index,id,mm) { const point=mm.map((v)=>Number(v)*MM_TO_M); const key=String(id); const prior=index.get(key); if (prior) assert.ok(Math.hypot(...prior.map((v,i)=>v-point[i]))<=1e-9); index.set(key,point); }
function requireCoordinate(index,id) { const p=index.get(String(id)); if (!p) throw new TypeError(`Missing coordinate ${id}`); return p; }
function requireSourceRow(index,id) { const row=index.get(String(id)); if (!row) throw new TypeError(`Missing source row ${id}`); return row; }
function requirePinnedPackage(value) { if (!value||value.schema!=='caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical package required.'); assert.equal(value.source.sha256,EXPECTED_SOURCE_SHA256); assert.equal(value.cases.find((c)=>c.caseId==='L19')?.formula,'W+P1'); }
function multiply12(matrix,vector) { return new Array(12).fill(0).map((_v,i)=>{let sum=0;for(let j=0;j<12;j+=1)sum+=matrix[i*12+j]*vector[j];return sum;}); }
function subtract(a,b){return a.map((v,i)=>v-b[i]);}
function normalizeResidual(residual,reference,tolerances) { const floors=[...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_FROM.scaleFloor)),...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_FROM.scaleFloor)),...new Array(3).fill(Number(tolerances.GLOBAL_END_FORCE_TO.scaleFloor)),...new Array(3).fill(Number(tolerances.GLOBAL_END_MOMENT_TO.scaleFloor))]; return residual.map((v,i)=>v/Math.max(Math.abs(reference[i]),floors[i])); }
function argmax(values){let index=0;for(let i=1;i<values.length;i+=1)if(values[i]>values[index])index=i;return index;}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=1){if(argv[i]==='--package')out.package=argv[++i];else if(argv[i]==='--out')out.out=argv[++i];}return out;}
