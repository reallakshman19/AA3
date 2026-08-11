import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const authorityPath = process.argv[2];
const reportPath = process.argv[3];
if (!authorityPath || !reportPath) {
  throw new Error('usage: node lfea-m047-bm4l-residual-invariant-check.mjs <authority.json> <bm4l-report.json>');
}
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const reportBytes = fs.readFileSync(reportPath);
const report = JSON.parse(reportBytes.toString('utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const DOFS = ['UX','UY','UZ','RX','RY','RZ'];
const translationK = 1e14;
const rotationK = 1e12 * 180 / Math.PI;

assert.equal(authority.schema, 'm047-bm4l-residual-invariant-authority/v1');
assert.equal(report.benchmarkId, 'BM4_L');
assert.equal(sha256(reportBytes), authority.source.qualificationArtifact.reportSha256);
assert.equal(authority.source.accdbSha256, '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8');

function qualificationRows(caseId) {
  const record = report.qualification.cases.find((row) => row.caseId === caseId);
  assert.ok(record, `missing qualification case ${caseId}`);
  return record.comparison.rows;
}
function findRow(caseId, entityKind, entityId, quantity, component) {
  const row = qualificationRows(caseId).find((entry) => entry.status !== 'NOT_COMPARED'
    && entry.entityKind === entityKind && String(entry.entityId) === String(entityId)
    && entry.quantity === quantity && entry.component === component);
  assert.ok(row, `missing ${caseId}:${entityKind}:${entityId}:${quantity}:${component}`);
  return row;
}
function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);
}
function norm(values) { return Math.hypot(...values); }

// Reconstruct f-Ku directly from retained element recovery evidence. No dense solve is required.
const l2Recs = report.mechanics.cases.L2.recoveryLedger;
const residualByNode = new Map();
const displacementByNode = new Map();
function addNode(nodeId, values) {
  const current = residualByNode.get(nodeId) ?? new Array(6).fill(0);
  for (let i = 0; i < 6; i += 1) current[i] += values[i];
  residualByNode.set(nodeId, current);
}
for (const rec of l2Recs) {
  const applied = rec.equivalentLoadGlobal.map((value, index) => value + rec.initialStrainLoadGlobal[index]);
  const balance = applied.map((value, index) => value - rec.globalElasticAction[index]);
  addNode(String(rec.nodeI), balance.slice(0, 6));
  addNode(String(rec.nodeJ), balance.slice(6));
  for (const [nodeId, offset] of [[String(rec.nodeI),0],[String(rec.nodeJ),6]]) {
    const d = rec.jointDisplacement12.slice(offset, offset + 6);
    const prior = displacementByNode.get(nodeId);
    if (prior) d.forEach((value,index) => close(value, prior[index], 1e-12, `joint displacement ${nodeId}:${DOFS[index]}`));
    else displacementByNode.set(nodeId, d);
  }
}
let supportCount = 0;
let maxSupportRel = 0;
for (const [nodeId, residual] of residualByNode) {
  const d = displacementByNode.get(nodeId);
  for (let i = 0; i < 6; i += 1) {
    if (Math.abs(residual[i]) <= 1e-6 || d[i] === 0) continue;
    const ratio = residual[i] / d[i];
    const expected = i < 3 ? translationK : rotationK;
    const rel = Math.abs(ratio - expected) / expected;
    if (rel <= 1e-8) {
      supportCount += 1;
      maxSupportRel = Math.max(maxSupportRel, rel);
    }
  }
}
assert.equal(supportCount, authority.operatorReconstruction.finiteRestraintDofCount);
assert.equal(supportCount, 51);
close(translationK, authority.operatorReconstruction.translationStiffnessNPerM, 1e-4, 'translation support stiffness');
close(rotationK, authority.operatorReconstruction.rotationStiffnessNmPerRad, 1e-2, 'rotation support stiffness');
assert.ok(maxSupportRel <= 1e-8);

// The generator solved K_total u_source = f_source. Verify the retained ledger is algebraically
// consistent with the report totals and with the declared cancellation factor.
for (const metric of authority.unaffectedPrimitiveRows.nodalCancellation) {
  const row = findRow(metric.caseId, 'NODE', metric.nodeId, metric.quantity, metric.component);
  close(row.actualValue, metric.actualValue, 1e-15, `${metric.caseId}:${metric.nodeId}:${metric.component} actual`);
  close(row.referenceValue, metric.referenceValue, 1e-15, `${metric.caseId}:${metric.nodeId}:${metric.component} reference`);
  close(metric.sourceContributionSum, metric.actualValue, 2e-12, `${metric.caseId}:${metric.nodeId}:${metric.component} source superposition`);
  close(metric.sourceAbsoluteContributionSum / Math.abs(metric.actualValue), metric.sourceCancellationFactor, 1e-9,
    `${metric.caseId}:${metric.nodeId}:${metric.component} cancellation factor`);
  assert.ok(metric.sourceCancellationFactor >= authority.conditioningPolicy.globalCancellationDominatedThreshold);
  assert.equal(metric.classification, 'GLOBAL_CANCELLATION_DOMINATED');
}

// Recompute coordinate-invariant source-end vector norms from the benchmark comparison rows.
for (const metric of authority.unaffectedPrimitiveRows.directSourceEndVectors) {
  const rows = qualificationRows(metric.caseId).filter((row) => row.entityKind === 'ELEMENT'
    && row.entityId === metric.entityId && row.quantity === metric.quantity
    && (row.status === 'PASS' || row.status === 'FAIL'));
  assert.equal(rows.length, 3, `${metric.caseId}:${metric.entityId}:${metric.quantity} component count`);
  const refNorm = norm(rows.map((row) => row.referenceValue));
  const errNorm = norm(rows.map((row) => row.actualValue - row.referenceValue));
  close(refNorm, metric.referenceVectorNorm, 1e-10, 'source vector reference norm');
  close(errNorm, metric.errorVectorNorm, 1e-10, 'source vector error norm');
  close(errNorm / refNorm, metric.vectorRelativeError, 1e-12, 'source vector relative error');
  assert.ok(metric.vectorRelativeError <= authority.conditioningPolicy.sourceVectorPassThreshold);
  assert.equal(metric.classification, 'COMPONENT_ILL_CONDITIONED_VECTOR_PASS');
  for (const failed of metric.failedComponents) {
    const row = rows.find((entry) => entry.component === failed.component);
    assert.equal(row.status, 'FAIL');
    assert.ok(row.rawRelativeError > 0.1);
    close(refNorm / Math.abs(row.referenceValue), failed.componentConditioning, 1e-8, 'component conditioning');
  }
}

assert.equal(authority.unaffectedPrimitiveRows.primitiveFailureRowsCovered, 12);
assert.equal(authority.resolvedThermalPublishedEvidence.primitiveFailureRows, 5);
assert.equal(authority.closure.primitiveFailureRowsTotal, 17);
assert.equal(authority.closure.primitiveFailureRowsClassified, 17);
assert.equal(authority.closure.newMechanicsAuthorized, false);
assert.equal(authority.closure.qst006Status, 'COMPLETE_NO_NEW_MECHANICS');
console.log('PASS m047 BM4_L residual invariant authority');
