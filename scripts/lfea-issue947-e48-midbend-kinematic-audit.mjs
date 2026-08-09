#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inspectCaesarAccdbLinearCaseMechanics } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const CASE_ID = 'L19';
const SOURCE_ELEMENT_ID = '48';
const MID_NODE_ID = '21719';
const COMPONENT_LIMIT = 0.1;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 1e-3;

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.raw || !args.e48) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e48-midbend-kinematic-audit.mjs --package <canonical-package.json> --raw <raw-export.json> --e48 <e48-condensation.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
const e48 = JSON.parse(readFileSync(args.e48, 'utf8'));
requirePinned(pkg, e48);

const sourceRow = requireSourceRow(pkg, SOURCE_ELEMENT_ID);
assert.equal(Number(sourceRow.BEND_PTR), 10, 'E48 bend pointer drift.');
const bendDeclaration = pkg.model.tables.INPUT_BENDS.rows.find((row) => Number(row.BEND_PTR) === Number(sourceRow.BEND_PTR));
if (!bendDeclaration) throw new TypeError('E48 bend declaration missing.');
assert.equal(String(Number(bendDeclaration.NODE1)), MID_NODE_ID, 'E48 midpoint NODE1 drift.');

const inspection = inspectCaesarAccdbLinearCaseMechanics(pkg, CASE_ID);
assert.equal(inspection.executionStatus, 'QUALIFIED');
const descendants = inspection.elements.filter((entry) => String(entry.sourceElementId) === SOURCE_ELEMENT_ID);
const chain = requireOrderedChain(descendants, String(sourceRow.FROM_NODE), String(sourceRow.TO_NODE));
const assembled = assembleChain(chain);
const midNodeIndex = assembled.nodeIds.indexOf(MID_NODE_ID);
if (!(midNodeIndex > 0 && midNodeIndex < assembled.nodeIds.length - 1)) {
  throw new TypeError(`Expected ${MID_NODE_ID} as an internal E48 descendant node; index=${midNodeIndex}.`);
}

const boundaryNodes = [String(sourceRow.FROM_NODE), String(sourceRow.TO_NODE)];
const caesarBoundary = boundaryDisplacement(pkg.references[CASE_ID].rows, boundaryNodes);
const recovered = recoverInternal(assembled, caesarBoundary);
const predictedMid = recovered.fullDisplacement.slice(midNodeIndex * 6, midNodeIndex * 6 + 6);
const rawMid = rawL19NodeDisplacement(raw, MID_NODE_ID);
const comparison = compareDof(predictedMid, rawMid, pkg.profile.tolerances);

const internalEquilibriumResidual = internalResidual(assembled, recovered.fullDisplacement);
const rawHalfUlp = rawMid.map((value) => 0.5 * float32Ulp(value));
const robustNormalizedLowerBound = comparison.residual.map((value, index) => {
  const remaining = Math.max(0, Math.abs(value) - rawHalfUlp[index]);
  return remaining / comparison.scales[index];
});
const robustFailures = robustNormalizedLowerBound
  .map((value, index) => ({ dof: DOFS[index], lowerBound: value }))
  .filter((entry) => entry.lowerBound > COMPONENT_LIMIT);

const gates = {
  sourceCondensationParity: e48.productionParity.maxAbsResidual <= 1e-3 ? 'PASS' : 'FAIL',
  midpointIsExactProductionDescendantNode: midNodeIndex > 0 ? 'PASS' : 'FAIL',
  internalEquilibrium: internalEquilibriumResidual.maxAbs <= 1e-5 ? 'PASS' : 'FAIL',
  midpointKinematicsWithinExistingTenPercentGate: comparison.maxAbsNormalizedResidual <= COMPONENT_LIMIT ? 'PASS' : 'FAIL',
  midpointFailureRobustToRawFloat32HalfUlp: robustFailures.length > 0 ? 'FAIL' : 'PASS',
};

const classification = comparison.maxAbsNormalizedResidual <= COMPONENT_LIMIT
  ? 'E48_INTERNAL_BEND_KINEMATICS_PASS_CAESAR_MIDPOINT_WITNESS'
  : robustFailures.length > 0
    ? 'E48_INTERNAL_BEND_KINEMATICS_ADMISSIBLY_DIVERGE_FROM_CAESAR_MIDPOINT_WITNESS'
    : 'E48_INTERNAL_BEND_KINEMATICS_NONRESOLVING_AT_RAW_OUTPUT_PRECISION';

const output = {
  schema: 'lfea-issue947-e48-midbend-kinematic-audit/v1',
  issue: 947,
  caseId: CASE_ID,
  sourceElementId: SOURCE_ELEMENT_ID,
  bendPointer: Number(sourceRow.BEND_PTR),
  midpointNodeId: MID_NODE_ID,
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'INTERNAL_BEND_KINEMATIC_FALSIFICATION_USING_RAW_CAESAR_MIDPOINT_NO_PARAMETER_FIT_NO_PRODUCTION_UPDATE',
  governingEquation: 'K_ii u_i = f_eq,i + f_0,i - K_ib u_b',
  sourceBoundaryNodes: boundaryNodes,
  sourceBoundaryDisplacementFromPinnedCaesar: caesarBoundary,
  descendantTopology: {
    descendantCount: chain.length,
    nodeCount: assembled.nodeIds.length,
    internalNodeCount: assembled.nodeIds.length - 2,
    nodeIds: assembled.nodeIds,
    midpointNodeIndex: midNodeIndex,
  },
  internalEquilibriumResidual,
  midpoint: {
    predictedFromExactProductionDescendants: predictedMid,
    rawCaesar: rawMid,
    residual: comparison.residual,
    scales: comparison.scales,
    normalizedResidual: comparison.normalizedResidual,
    normalizedResidualL2: comparison.normalizedResidualL2,
    maxAbsNormalizedResidual: comparison.maxAbsNormalizedResidual,
    governingDof: comparison.governingDof,
    rawFloat32HalfUlp: rawHalfUlp,
    robustLowerBoundAbsNormalizedResidual: robustNormalizedLowerBound,
    robustFailingDofs: robustFailures,
  },
  gates,
  classification,
  disposition: classification === 'E48_INTERNAL_BEND_KINEMATICS_ADMISSIBLY_DIVERGE_FROM_CAESAR_MIDPOINT_WITNESS'
    ? 'The E48 mismatch exists inside the bend descendant interpolation/free-deformation field under fixed CAESAR source-boundary kinematics. Do not attribute it solely to source-boundary action custody or output precision.'
    : classification === 'E48_INTERNAL_BEND_KINEMATICS_PASS_CAESAR_MIDPOINT_WITNESS'
      ? 'The production bend interior is compatible with the independent CAESAR midpoint witness; continue boundary action/reference ownership investigation rather than changing bend interpolation.'
      : 'The raw midpoint output precision is insufficient to distinguish the candidate mechanisms. No production mechanic is authorized.',
  falsificationRule: 'No bend-law conclusion is admissible unless the exact current production descendant matrices/load vectors satisfy internal equilibrium, the source condensation parity gate remains <=1e-3 N/Nm, and any midpoint disagreement survives the raw float32 half-ULP bound while exceeding the unchanged 10% displacement/rotation comparison gate.',
};

if (Object.values(gates).slice(0, 3).some((status) => status !== 'PASS')) {
  throw new Error(`E48 midpoint audit prerequisite failed: ${JSON.stringify(gates)}`);
}
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 E48 midpoint kinematic audit: ${classification}`);

function requirePinned(pkg, e48) {
  assert.equal(pkg.schema, 'caesar-accdb-benchmark-package/v1');
  assert.equal(String(pkg.source?.sha256).toLowerCase(), EXPECTED_SOURCE_SHA256);
  assert.equal(e48.sourceAccdbSha256, EXPECTED_SOURCE_SHA256);
  assert.equal(e48.caseId, CASE_ID);
  assert.equal(String(e48.sourceElement?.sourceElementId), SOURCE_ELEMENT_ID);
  assert.ok(e48.productionParity.maxAbsResidual <= 1e-3);
}

function requireSourceRow(pkg, id) {
  const matches = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter((row) => String(row.ELEMENTID) === id);
  if (matches.length !== 1) throw new TypeError(`Expected one source E${id}; found ${matches.length}.`);
  return matches[0];
}

function requireOrderedChain(entries, fromNode, toNode) {
  const remaining = new Map(entries.map((entry) => [entry.elementId, entry]));
  const ordered = [];
  let node = fromNode;
  while (node !== toNode) {
    const candidates = [...remaining.values()].filter((entry) => String(entry.nodeI) === node);
    if (candidates.length !== 1) throw new TypeError(`E48 chain from ${node} expected one outgoing descendant; found ${candidates.length}.`);
    const entry = candidates[0];
    ordered.push(entry);
    remaining.delete(entry.elementId);
    node = String(entry.nodeJ);
    if (ordered.length > entries.length) throw new TypeError('E48 descendant cycle detected.');
  }
  if (remaining.size !== 0) throw new TypeError(`E48 has ${remaining.size} disconnected descendants.`);
  return ordered;
}

function assembleChain(chain) {
  const nodeIds = [String(chain[0].nodeI), ...chain.map((entry) => String(entry.nodeJ))];
  const nodeIndex = new Map(nodeIds.map((id, index) => [id, index]));
  const size = nodeIds.length * 6;
  const stiffness = matrix(size, size);
  const load = new Array(size).fill(0);
  for (const entry of chain) {
    const i = nodeIndex.get(String(entry.nodeI));
    const j = nodeIndex.get(String(entry.nodeJ));
    addElementMatrix(stiffness, entry.globalStiffness, i, j);
    addElementVector(load, entry.equivalentLoadGlobal, i, j);
    addElementVector(load, entry.initialStrainLoadGlobal, i, j);
  }
  return { nodeIds, stiffness, load };
}

function recoverInternal(full, boundaryDof) {
  const n = full.nodeIds.length;
  const boundary = [...Array.from({ length: 6 }, (_, i) => i), ...Array.from({ length: 6 }, (_, i) => (n - 1) * 6 + i)];
  const internal = Array.from({ length: (n - 2) * 6 }, (_, i) => 6 + i);
  const Kib = submatrix(full.stiffness, internal, boundary);
  const Kii = submatrix(full.stiffness, internal, internal);
  const fi = subvector(full.load, internal);
  const rhs = subtract(fi, multiplyVector(Kib, boundaryDof));
  const ui = solveDense(Kii, rhs);
  const displacement = new Array(n * 6).fill(0);
  boundary.forEach((globalIndex, index) => { displacement[globalIndex] = boundaryDof[index]; });
  internal.forEach((globalIndex, index) => { displacement[globalIndex] = ui[index]; });
  return { fullDisplacement: displacement, internalDofCount: internal.length };
}

function internalResidual(full, displacement) {
  const n = full.nodeIds.length;
  const internal = Array.from({ length: (n - 2) * 6 }, (_, i) => 6 + i);
  const Kd = multiplyVector(full.stiffness, displacement);
  const residual = internal.map((index) => Kd[index] - full.load[index]);
  return { maxAbs: maxAbs(residual), l2: Math.hypot(...residual) };
}

function boundaryDisplacement(rows, nodeIds) {
  const index = new Map(rows.filter((row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity))
    .map((row) => [`${row.entityId}:${row.component}`, Number(row.value)]));
  return nodeIds.flatMap((nodeId) => DOFS.map((dof) => {
    const value = index.get(`${nodeId}:${dof}`);
    if (!Number.isFinite(value)) throw new TypeError(`Missing CAESAR boundary ${nodeId}:${dof}.`);
    return value;
  }));
}

function rawL19NodeDisplacement(raw, nodeId) {
  const rows = raw.tables?.OUTPUT_DISPLACEMENTS?.rows;
  if (!Array.isArray(rows)) throw new TypeError('Raw custody lacks OUTPUT_DISPLACEMENTS rows.');
  const matches = rows.filter((row) => Number(row.LCASE_NUM) === 19 && String(row.NODE) === nodeId);
  if (matches.length !== 1) throw new TypeError(`Expected one raw L19 node ${nodeId}; found ${matches.length}.`);
  const row = matches[0];
  assert.match(String(row.DUNITS), /mm/i);
  assert.match(String(row.RUNITS), /deg/i);
  return [Number(row.DX) * MM_TO_M, Number(row.DY) * MM_TO_M, Number(row.DZ) * MM_TO_M,
    Number(row.RX) * DEG_TO_RAD, Number(row.RY) * DEG_TO_RAD, Number(row.RZ) * DEG_TO_RAD];
}

function compareDof(predicted, reference, tolerances) {
  const scales = reference.map((value, index) => {
    const tolerance = index < 3 ? tolerances.DISPLACEMENT : tolerances.ROTATION;
    return Math.max(Math.abs(value), Number(tolerance.scaleFloor));
  });
  const residual = subtract(predicted, reference);
  const normalizedResidual = residual.map((value, index) => value / scales[index]);
  const abs = normalizedResidual.map(Math.abs);
  const max = Math.max(...abs);
  return {
    residual,
    scales,
    normalizedResidual,
    normalizedResidualL2: Math.hypot(...normalizedResidual),
    maxAbsNormalizedResidual: max,
    governingDof: DOFS[abs.indexOf(max)],
  };
}

function float32Ulp(value) {
  if (!Number.isFinite(value)) return Infinity;
  const v = Math.fround(value);
  if (v === 0) return 2 ** -149;
  const buffer = new ArrayBuffer(4);
  const f = new Float32Array(buffer);
  const u = new Uint32Array(buffer);
  f[0] = v;
  const bits = u[0];
  const nextBits = v > 0 ? bits + 1 : bits - 1;
  u[0] = nextBits;
  const next = f[0];
  return Math.abs(next - v);
}

function addElementMatrix(global, local, nodeI, nodeJ) {
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let r = 0; r < 12; r += 1) for (let c = 0; c < 12; c += 1) global[map[r]][map[c]] += local[r * 12 + c];
}
function addElementVector(global, local, nodeI, nodeJ) {
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let i = 0; i < 12; i += 1) global[map[i]] += local[i];
}
function matrix(rows, cols) { return Array.from({ length: rows }, () => new Array(cols).fill(0)); }
function submatrix(A, rows, cols) { return rows.map((r) => cols.map((c) => A[r][c])); }
function subvector(v, rows) { return rows.map((r) => v[r]); }
function multiplyVector(A, x) { return A.map((row) => row.reduce((sum, value, index) => sum + value * x[index], 0)); }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function maxAbs(values) { return Math.max(...values.map(Math.abs)); }
function solveDense(A, rhs) {
  const n = A.length;
  const M = A.map((row, index) => [...row, rhs[index]]);
  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row += 1) if (Math.abs(M[row][pivot]) > Math.abs(M[best][pivot])) best = row;
    if (!(Math.abs(M[best][pivot]) > 1e-18)) throw new Error(`E48_INTERNAL_MATRIX_SINGULAR_AT_${pivot}`);
    [M[pivot], M[best]] = [M[best], M[pivot]];
    const divisor = M[pivot][pivot];
    for (let col = pivot; col <= n; col += 1) M[pivot][col] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = M[row][pivot];
      if (factor === 0) continue;
      for (let col = pivot; col <= n; col += 1) M[row][col] -= factor * M[pivot][col];
    }
  }
  return M.map((row) => row[n]);
}
function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}
