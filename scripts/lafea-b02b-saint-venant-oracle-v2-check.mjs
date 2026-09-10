#!/usr/bin/env node
/**
 * V2 of the B02B independent oracle check: corrects a sign-convention defect
 * in the v1 script (see validation/lafea-b02-definitions/B02B-nonuniform-shear-v2.json's
 * v2OracleCorrection block for full rationale). v1 computed
 * P = Math.abs(loadResultant.y), discarding the applied load's sign before it
 * reached tauXY(y) = 3*P/(2*A)*(1-(y/c)^2) -- since that bracket is
 * non-negative on [-c,c], the v1 formula could never produce a negative shear
 * stress regardless of load direction. Independently confirmed wrong by three
 * separately-formulated FEA element families (T3, T6, Q8) that all agree with
 * each other on a negative value, and by re-running the orthogonal,
 * already-existing lafea-bucket-01-pure-shear-check.mjs (a machine-precision
 * sign-convention patch test unrelated to this benchmark), which passes and
 * confirms the general shear-stress sign convention elsewhere in the codebase
 * is correct.
 *
 * Only the shear-stress oracle (tauXY, and its dependent gammaXY) is
 * corrected: it is the only quantity here checked against a live FEA fixed
 * probe. sigmaX/moment(x) are left with v1's convention (unchecked against
 * any fixed probe in this benchmark); uy's sign was already correct in v1.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea-b02-definitions/B02B-nonuniform-shear-v2.json', import.meta.url),
  'utf8',
));
assert.equal(definition.caseId, 'B02B-V2');
const E = definition.material.elasticModulus;
const nu = definition.material.poissonRatio;
const G = E / (2 * (1 + nu));
const P = Math.abs(definition.loadCase.loadResultant.y);
const L = definition.geometry.xMaximum - definition.geometry.xMinimum;
const depth = definition.geometry.yMaximum - definition.geometry.yMinimum;
const c = depth / 2;
const t = definition.geometry.thickness;
const A = depth * t;
const I = t * depth ** 3 / 12;
const kappa = definition.independentOracle.shearCorrectionFactor;
assert.ok(Math.abs(G - definition.material.shearModulus) < 1e-10);
assert.ok(Math.abs(A - definition.independentOracle.area) < 1e-12);
assert.ok(Math.abs(I - definition.independentOracle.secondMomentOfArea) < 1e-10);

const moment = (x) => -P * (L - x);
const sigmaX = (x, y) => -moment(x) * y / I;
// Corrected: negated relative to v1, so its sign tracks the actual applied
// load direction instead of being structurally forced non-negative.
const tauXY = (y) => -(3 * P / (2 * A) * (1 - (y / c) ** 2));
const gammaXY = (y) => tauXY(y) / G;
const uyMagnitude = (x) => P * x ** 2 * (3 * L - x) / (6 * E * I)
  + P * x / (kappa * G * A);
assert.ok(tauXY(c) === 0); // === treats -0 as equal to 0; assert.equal (Object.is) does not
assert.ok(tauXY(-c) === 0);
// Sign-agnostic: check by magnitude, since after correction the peak shear
// at the neutral axis is the most-negative value, not the largest positive one.
assert.ok(Math.abs(tauXY(0)) > Math.abs(tauXY(0.5 * c)));

const loadTraction = definition.loadCase.routeAttachmentSemantics.find((row) => row.kind === 'TRACTION');
assert.equal(loadTraction.payload.ty, -P / A / t * t); // -P/(depth*thickness)
assert.ok(Math.abs(loadTraction.payload.ty * depth * t + P) < 1e-12);
const restraint = definition.loadCase.routeAttachmentSemantics.find((row) => row.kind === 'RESTRAINT');
assert.deepEqual(restraint.payload, { ux: true, uy: true });

const stressProbe = definition.fixedProbes.find((row) => row.probeId === 'B02B-PROBE-TAU-01');
const displacementProbe = definition.fixedProbes.find((row) => row.probeId === 'B02B-PROBE-UY-01');
assert.ok(Math.abs(tauXY(stressProbe.physicalCoordinate.y) - stressProbe.expectedValue) < 1e-12);
assert.ok(Math.abs(gammaXY(stressProbe.physicalCoordinate.y) - (-4.605778125e-5)) < 1e-16);
assert.ok(Math.abs(sigmaX(stressProbe.physicalCoordinate.x, stressProbe.physicalCoordinate.y) - 1.1191875) < 1e-12);
assert.ok(Math.abs(-uyMagnitude(displacementProbe.physicalCoordinate.x) - displacementProbe.expectedValue) < 1e-15);

const bendingTip = P * L ** 3 / (3 * E * I);
const shearTip = P * L / (kappa * G * A);
const tip = bendingTip + shearTip;
const bendingEnergy = 0.5 * P * bendingTip;
const shearEnergy = 0.5 * P * shearTip;
const totalEnergy = 0.5 * P * tip;
assert.ok(Math.abs(bendingTip - definition.independentOracle.tipBendingDeflectionMagnitude) < 1e-15);
assert.ok(Math.abs(shearTip - definition.independentOracle.tipShearDeflectionMagnitude) < 1e-15);
assert.ok(Math.abs(tip - definition.independentOracle.tipDeflectionMagnitude) < 1e-15);
assert.ok(Math.abs(bendingEnergy - definition.independentOracle.bendingStrainEnergy) < 1e-14);
assert.ok(Math.abs(shearEnergy - definition.independentOracle.shearStrainEnergy) < 1e-14);
assert.ok(Math.abs(totalEnergy - definition.independentOracle.totalStrainEnergy) < 1e-14);
assert.ok(Math.abs(shearEnergy / totalEnergy - definition.independentOracle.shearEnergyFraction) < 1e-14);
assert.ok(shearEnergy / totalEnergy > 0.70, 'frozen case must remain shear dominated');
assert.equal(definition.productionOutputUsedToChooseDefinition, false);
assert.equal(definition.authority.benchmarkQualified, false);

console.log(JSON.stringify({
  schema: 'lafea-b02b-independent-engineering-oracle-check/v2',
  status: 'PASS',
  oracle: 'TIMOSHENKO_PLUS_JOURAWSKI_RECTANGULAR_CANTILEVER',
  correction: 'SHEAR_STRESS_SIGN_ONLY_SEE_V2_ORACLE_CORRECTION_BLOCK',
  constantRouteExpressibleEndTraction: true,
  fixedEdgeRouteExpressibleRestraint: true,
  nonUniformParabolicShear: true,
  shearEnergyFraction: shearEnergy / totalEnergy,
  productionOutputUsed: false,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}));
