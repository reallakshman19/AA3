#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea-b02-definitions/B02B-nonuniform-shear.json', import.meta.url),
  'utf8',
));
const E = definition.material.elasticModulus;
const nu = definition.material.poissonRatio;
const G = E / (2 * (1 + nu));
const P = definition.loadCase.shearResultant;
const L = definition.geometry.xMaximum - definition.geometry.xMinimum;
const c = definition.geometry.yMaximum;
const t = definition.geometry.thickness;
const I = 2 * t * c ** 3 / 3;
assert.ok(Math.abs(G - definition.material.shearModulus) < 1e-10);
assert.ok(Math.abs(I - definition.independentOracle.secondMomentOfArea) < 1e-10);

const sigmaX = (x, y) => P * x * y / I;
const tauXY = (y) => P * (c ** 2 - y ** 2) / (2 * I);
const gammaXY = (y) => tauXY(y) / G;
const ux = (x, y) => P * x ** 2 * y / (2 * E * I)
  + P * y ** 3 * (nu / E - 1 / G) / (6 * I);
const uy = (x, y) => P * c ** 2 * x / (2 * I * G)
  - P * x ** 3 / (6 * E * I)
  - nu * P * x * y ** 2 / (2 * E * I);

for (const y of [-0.7 * c, -0.2 * c, 0, 0.4 * c, 0.8 * c]) {
  const dSigmaDx = P * y / I;
  const dTauDy = -P * y / I;
  assert.ok(Math.abs(dSigmaDx + dTauDy) < 1e-14, '2D equilibrium must be exact');
}
assert.equal(tauXY(c), 0);
assert.equal(tauXY(-c), 0);
const shearResultant = 2 * P * c ** 3 / (3 * I);
assert.ok(Math.abs(shearResultant - P / t) < 1e-12);

const probeStress = definition.fixedProbes.find((row) => row.probeId === 'B02B-PROBE-TAU-01');
const probeDisp = definition.fixedProbes.find((row) => row.probeId === 'B02B-PROBE-UY-01');
assert.ok(Math.abs(tauXY(probeStress.physicalCoordinate.y) - probeStress.expectedValue) < 1e-12);
assert.ok(Math.abs(uy(probeDisp.physicalCoordinate.x, probeDisp.physicalCoordinate.y) - probeDisp.expectedValue) < 1e-15);
assert.ok(Math.abs(sigmaX(7.3, 4.7) - 0.6433125) < 1e-12);
assert.ok(Math.abs(gammaXY(4.7) - 4.605778125e-5) < 1e-16);
assert.ok(Math.abs(ux(7.3, 4.7) - 8.0093140625e-6) < 1e-16);

const bendingEnergy = P ** 2 * L ** 3 / (6 * E * I);
const shearEnergy = 2 * P ** 2 * L * t * c ** 5 / (15 * G * I ** 2);
const totalEnergy = bendingEnergy + shearEnergy;
assert.ok(Math.abs(bendingEnergy - definition.independentOracle.bendingStrainEnergy) < 1e-14);
assert.ok(Math.abs(shearEnergy - definition.independentOracle.shearStrainEnergy) < 1e-14);
assert.ok(Math.abs(totalEnergy - definition.independentOracle.totalStrainEnergy) < 1e-14);
assert.ok(Math.abs(shearEnergy / totalEnergy - definition.independentOracle.shearEnergyFraction) < 1e-14);
assert.ok(shearEnergy / totalEnergy > 0.70, 'case must remain shear dominated');
assert.equal(definition.productionOutputUsedToChooseDefinition, false);
assert.equal(definition.authority.benchmarkQualified, false);

console.log(JSON.stringify({
  schema: 'lafea-b02b-saint-venant-independent-oracle-check/v1',
  status: 'PASS',
  exact2dEquilibrium: true,
  tractionFreeTopBottom: true,
  nonUniformParabolicShear: true,
  shearEnergyFraction: shearEnergy / totalEnergy,
  productionOutputUsed: false,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false
}));
