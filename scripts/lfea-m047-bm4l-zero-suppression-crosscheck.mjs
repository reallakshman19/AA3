import assert from 'node:assert/strict';
import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const actual = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const expected = JSON.parse(fs.readFileSync(
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-zero-suppression-crosscheck.json',
  'utf8',
));
const caseId = 'L2';
const targetNode = '20440';
const boundaryRad = 0.0001 * Math.PI / 180;
const caseReport = report.cases.find((entry) => entry.caseId === caseId);
assert.ok(caseReport);
const rows = caseReport.referenceRows;

const nodeVector = (nodeId) => {
  const map = new Map(rows
    .filter((row) => row.entityKind === 'NODE' && String(row.entityId) === String(nodeId))
    .map((row) => [`${row.quantity}:${row.component}`, Number(row.value)]));
  return [
    map.get('DISPLACEMENT:UX') ?? 0,
    map.get('DISPLACEMENT:UY') ?? 0,
    map.get('DISPLACEMENT:UZ') ?? 0,
    map.get('ROTATION:RX') ?? 0,
    map.get('ROTATION:RY') ?? 0,
    map.get('ROTATION:RZ') ?? 0,
  ];
};

const sourceQ = (sourceId) => {
  const entityId = rows.find((row) =>
    row.entityKind === 'ELEMENT'
    && String(row.entityId).startsWith(`INPUT_ELEMENT:${sourceId}|`))?.entityId;
  assert.ok(entityId);
  const map = new Map(rows
    .filter((row) => row.entityKind === 'ELEMENT' && row.entityId === entityId)
    .map((row) => [`${row.quantity}:${row.component}`, Number(row.value)]));
  return [
    map.get('GLOBAL_END_FORCE_FROM:FX'), map.get('GLOBAL_END_FORCE_FROM:FY'), map.get('GLOBAL_END_FORCE_FROM:FZ'),
    map.get('GLOBAL_END_MOMENT_FROM:MX'), map.get('GLOBAL_END_MOMENT_FROM:MY'), map.get('GLOBAL_END_MOMENT_FROM:MZ'),
    map.get('GLOBAL_END_FORCE_TO:FX'), map.get('GLOBAL_END_FORCE_TO:FY'), map.get('GLOBAL_END_FORCE_TO:FZ'),
    map.get('GLOBAL_END_MOMENT_TO:MX'), map.get('GLOBAL_END_MOMENT_TO:MY'), map.get('GLOBAL_END_MOMENT_TO:MZ'),
  ];
};

const matVec = (matrix, vector) => Array.from({ length: 12 }, (_, row) => {
  let sum = 0;
  for (let column = 0; column < 12; column += 1) sum += matrix[row * 12 + column] * vector[column];
  return sum;
});

const solveLeastSquares2 = (A, b) => {
  let aa = 0; let ab = 0; let bb = 0; let ar = 0; let br = 0;
  for (let row = 0; row < A.length; row += 1) {
    aa += A[row][0] * A[row][0];
    ab += A[row][0] * A[row][1];
    bb += A[row][1] * A[row][1];
    ar += A[row][0] * b[row];
    br += A[row][1] * b[row];
  }
  const determinant = aa * bb - ab * ab;
  assert.ok(Math.abs(determinant) > 0);
  return [(ar * bb - br * ab) / determinant, (br * aa - ar * ab) / determinant];
};

const reconstruct = (sourceId) => {
  const ledger = actual.mechanics.cases[caseId].recoveryLedger.find((entry) =>
    entry.sourceElementId === sourceId && entry.elementId === `ACCDB.E${sourceId}`);
  assert.ok(ledger);
  const K = ledger.globalStiffness.map(Number);
  const load = ledger.equivalentLoadGlobal.map((value, index) =>
    Number(value) + Number(ledger.initialStrainLoadGlobal[index]));
  const q = sourceQ(sourceId);
  const u = [...nodeVector(ledger.nodeI), ...nodeVector(ledger.nodeJ)];
  const planeRows = [1, 5, 7, 11];
  let unknown;
  if (sourceId === '23') {
    assert.equal(ledger.nodeJ, targetNode);
    u[1] = 0;
    u[7] = 0;
    u[11] = 0;
    unknown = [7, 11];
  } else {
    assert.equal(sourceId, '24');
    assert.equal(ledger.nodeI, targetNode);
    u[1] = 0;
    u[5] = 0;
    unknown = [1, 5];
  }
  const base = matVec(K, u);
  const rhs = planeRows.map((row) => q[row] + load[row] - base[row]);
  const A = planeRows.map((row) => unknown.map((column) => K[row * 12 + column]));
  const solution = solveLeastSquares2(A, rhs);
  const residuals = A.map((row, index) =>
    row[0] * solution[0] + row[1] * solution[1] - rhs[index]);
  return {
    sourceId,
    inferredRotationRad: solution[1],
    inferredRotationDeg: solution[1] * 180 / Math.PI,
    maximumEquationResidual: Math.max(...residuals.map(Math.abs)),
  };
};

assert.equal(nodeVector(targetNode)[5], 0);
const reconstructions = [reconstruct('23'), reconstruct('24')];
for (const row of reconstructions) assert.ok(Math.abs(row.inferredRotationRad) < boundaryRad);
const mean = reconstructions.reduce((sum, row) => sum + row.inferredRotationRad, 0) / reconstructions.length;
const relativeDisagreement = Math.abs(
  reconstructions[0].inferredRotationRad - reconstructions[1].inferredRotationRad,
) / Math.abs(mean);
assert.ok(relativeDisagreement < 0.01);

const actualRow = actual.cases[caseId].rows.find((row) =>
  row.entityKind === 'NODE' && String(row.entityId) === targetNode
  && row.quantity === 'ROTATION' && row.component === 'RZ');
assert.ok(actualRow);
assert.ok(Math.abs(Number(actualRow.value)) > boundaryRad);

for (const observed of reconstructions) {
  const pinned = expected.reconstructions.find((row) => row.sourceElementId === observed.sourceId);
  assert.ok(pinned);
  assert.ok(Math.abs(observed.inferredRotationRad - pinned.inferredRotationRad) < 1e-18);
  assert.ok(Math.abs(observed.maximumEquationResidual - pinned.maximumEquationResidual) < 1e-9);
}
assert.ok(Math.abs(mean - expected.crossCheck.meanInferredRotationRad) < 1e-18);
assert.ok(Math.abs(relativeDisagreement - expected.crossCheck.relativeDisagreement) < 1e-12);
assert.equal(expected.crossCheck.lfeaActualMagnitudeAboveNativeBoundary, true);

console.log('PASS m047 BM4_L zero-suppression cross-check');
