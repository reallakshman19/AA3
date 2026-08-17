import assert from 'node:assert/strict';
import {
  calculateLocalAttachmentCorrelation,
  createCorrelationProfile,
  syntheticCorrelationProfile,
  syntheticCorrelationRequest,
} from '../src/core/local-attachment-correlation/index.js';

const TOL = 1e-10;
const profile = syntheticCorrelationProfile();
assert.equal(profile.authority.engineeringUseAuthorized, false);
assert.equal(profile.authority.authorizationBasis, 'SYNTHETIC_QUALIFICATION_ONLY');
assert.match(profile.coefficientDatasetHash, /^fnv1a64:[0-9a-f]{16}$/u);

const full = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest(), profile);
assert.equal(full.qualification.state, 'ACCEPTED');
assert.equal(full.qualification.engineeringUseAuthorized, false);
close(full.geometryParameters.diameterRatio, 0.25, 'd/D');
close(full.geometryParameters.diameterThicknessRatio, 30, 'D/t');

const byLoad = Object.fromEntries(full.contributions.map((row) => [row.loadComponent, row]));
expectContribution(byLoad.FX, 30, 1.5, 45);
expectContribution(byLoad.FY, 10, 2, 20);
expectContribution(byLoad.FZ, 20, -0.5, -10);
expectContribution(byLoad.MX, 2, 1, 2);
expectContribution(byLoad.MY, 10, 5, 50);
expectContribution(byLoad.MZ, 3, 3, 9);
close(byLoad.FX.interpolationEvidence.x.weight, 0.5, 'FX d/D interpolation weight');
close(byLoad.FX.interpolationEvidence.y.weight, 0.5, 'FX D/t interpolation weight');
assert.deepEqual(byLoad.FX.interpolationEvidence.cornerValues, {
  q11: 1, q12: 1.4, q21: 1.6, q22: 2,
});

const target = only(full.targetResults);
assert.equal(target.targetId, 'CROWN_OUTER');
expectComponent(target.components.SIGMA_X, 35, 50, 0, 15, 100);
expectComponent(target.components.SIGMA_THETA, 20, 9, 0, 30, 59);
expectComponent(target.components.SIGMA_R, 0, 0, 0, 0, 0);
expectComponent(target.components.TAU_XTHETA, 0, 0, 2, 0, 2);
close(target.vonMises, 87.13782186857783, 'full hand-case von Mises');

const isolated = {
  FX: { load: 90000, component: 'SIGMA_X', expected: 45 },
  FY: { load: 30000, component: 'SIGMA_THETA', expected: 20 },
  FZ: { load: 60000, component: 'SIGMA_X', expected: -10 },
  MX: { load: 1800000, component: 'TAU_XTHETA', expected: 2 },
  MY: { load: 9000000, component: 'SIGMA_X', expected: 50 },
  MZ: { load: 2700000, component: 'SIGMA_THETA', expected: 9 },
};
for (const [loadComponent, definition] of Object.entries(isolated)) {
  const loads = { FX: 0, FY: 0, FZ: 0, MX: 0, MY: 0, MZ: 0, [loadComponent]: definition.load };
  const result = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest({
    requestIdentity: `ISOLATED-${loadComponent}`,
    loads,
    pressureByTarget: [zeroPressure()],
  }), profile);
  assert.equal(result.qualification.state, 'ACCEPTED');
  const isolatedTarget = only(result.targetResults);
  close(isolatedTarget.components[definition.component].totalSurface, definition.expected,
    `${loadComponent} isolated stress`);
  const nonzero = result.contributions.filter((row) => Math.abs(row.stressContribution) > TOL);
  assert.equal(nonzero.length, 1, `${loadComponent} must create one nonzero synthetic response.`);
  assert.equal(nonzero[0].loadComponent, loadComponent);
}

const lowerKnot = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest({
  requestIdentity: 'EXACT-LOWER-KNOT',
  geometry: { attachmentDiameter: 60, pipeThickness: 15 },
}), profile);
assert.equal(lowerKnot.qualification.state, 'ACCEPTED');
const lowerByLoad = Object.fromEntries(lowerKnot.contributions.map((row) => [row.loadComponent, row]));
close(lowerByLoad.FX.coefficient, 1, 'FX lower-knot coefficient');
close(lowerByLoad.MY.coefficient, 2, 'MY lower-knot coefficient');
assert.equal(lowerByLoad.FX.interpolationEvidence.x.exactKnot, true);
assert.equal(lowerByLoad.FX.interpolationEvidence.y.exactKnot, true);

const outsideRatio = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest({
  requestIdentity: 'OUTSIDE-D-RATIO',
  geometry: { attachmentDiameter: 93 },
}), profile);
assert.equal(outsideRatio.qualification.state, 'OUTSIDE_DOMAIN');
assert.equal(outsideRatio.diagnostics[0].code, 'OUTSIDE_CORRELATION_DOMAIN');
assert.deepEqual(outsideRatio.diagnostics[0].domain, { minimum: 0.2, maximum: 0.3, value: 0.31 });
assert.equal(outsideRatio.targetResults.length, 0);

const outsideDt = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest({
  requestIdentity: 'OUTSIDE-DT',
  geometry: { pipeThickness: 300 / 41 },
}), profile);
assert.equal(outsideDt.qualification.state, 'OUTSIDE_DOMAIN');
assert.equal(outsideDt.diagnostics[0].code, 'OUTSIDE_CORRELATION_DOMAIN');

const tampered = structuredClone(profile);
tampered.responses.find((row) => row.responseId === 'FX-SIGMA-X-MEMBRANE').coefficients[0][0] = 9;
assert.throws(() => createCorrelationProfile(tampered),
  (error) => error?.code === 'CORRELATION_DATASET_HASH_MISMATCH');
const tamperedResult = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest(), tampered);
assert.equal(tamperedResult.qualification.state, 'REJECTED_REQUEST');
assert.equal(tamperedResult.diagnostics[0].code, 'CORRELATION_DATASET_HASH_MISMATCH');

const invalidWall = calculateLocalAttachmentCorrelation(syntheticCorrelationRequest({
  requestIdentity: 'INVALID-WALL',
  geometry: { pipeThickness: 150 },
}), profile);
assert.equal(invalidWall.qualification.state, 'REJECTED_REQUEST');
assert.equal(invalidWall.diagnostics[0].code, 'CORRELATION_WALL_GEOMETRY_INVALID');

console.log(JSON.stringify({
  check: 'lafea-local-attachment-correlation-synthetic-qualification',
  status: 'PASS',
  methodIdentity: profile.methodIdentity,
  engineeringUseAuthorized: false,
  coefficientDatasetHash: profile.coefficientDatasetHash,
  parameters: full.geometryParameters,
  coefficients: Object.fromEntries(Object.entries(byLoad).map(([key, row]) => [key, row.coefficient])),
  totalStressMpa: {
    sigmaX: target.components.SIGMA_X.totalSurface,
    sigmaTheta: target.components.SIGMA_THETA.totalSurface,
    sigmaR: target.components.SIGMA_R.totalSurface,
    tauXTheta: target.components.TAU_XTHETA.totalSurface,
    vonMises: target.vonMises,
  },
  outsideDomainRejected: true,
  datasetTamperRejected: true,
  sixLoadIsolationQualified: true,
}));

function zeroPressure() {
  return { targetId: 'CROWN_OUTER', SIGMA_X: 0, SIGMA_THETA: 0, SIGMA_R: 0, TAU_XTHETA: 0 };
}
function expectContribution(row, basisStress, coefficient, contribution) {
  close(row.basisStress, basisStress, `${row.loadComponent} basis stress`);
  close(row.coefficient, coefficient, `${row.loadComponent} coefficient`);
  close(row.stressContribution, contribution, `${row.loadComponent} stress contribution`);
}
function expectComponent(row, membrane, bending, shear, pressure, total) {
  close(row.membrane, membrane, 'membrane');
  close(row.bending, bending, 'bending');
  close(row.shear, shear, 'shear');
  close(row.pressure, pressure, 'pressure');
  close(row.mechanicalSurface, membrane + bending + shear, 'mechanical surface');
  close(row.totalSurface, total, 'total surface');
}
function only(rows) { assert.equal(rows.length, 1); return rows[0]; }
function close(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label} must be finite.`);
  assert.ok(Math.abs(actual - expected) <= TOL,
    `${label}: expected ${expected}, received ${actual}, |Δ|=${Math.abs(actual - expected)}.`);
}
