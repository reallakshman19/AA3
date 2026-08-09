#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const files = {
  contract: fileURLToPath(new URL('../src/core/linear-fea-reducer-condensation/contract.js', import.meta.url)),
  reducer: fileURLToPath(new URL('../src/core/linear-fea-reducer-condensation/reducer-condensation.js', import.meta.url)),
  adapter: fileURLToPath(new URL('../src/core/fea-benchmarks/caesar-accdb-linear-solve.js', import.meta.url)),
  check: fileURLToPath(new URL('./lfea-b3.23-reducer-condensation-check.mjs', import.meta.url)),
  bm3: fileURLToPath(new URL('./lfea-m028-bm3-fixtures.mjs', import.meta.url)),
  audit: fileURLToPath(new URL('./lfea-issue947-reducer-pressure-shear-audit.mjs', import.meta.url)),
};

patch(files.contract, [
  [
`  'material',
  'gravity',
  'thermal',`,
`  'material',
  'frame',
  'pressure',
  'gravity',
  'thermal',`,
  ],
  [
`export const GRAVITY_KEYS = Object.freeze([`,
`export const FRAME_KEYS = Object.freeze([
  'shearDeformation',
  'shearCorrectionFactorY',
  'shearCorrectionFactorZ',
  'source',
]);
export const PRESSURE_KEYS = Object.freeze([
  'enabled',
  'pressure',
  'poissonRatio',
  'ruleId',
  'source',
]);
export const GRAVITY_KEYS = Object.freeze([`,
  ],
  [
`  requireFinite(request.material.thermalExpansionCoefficient, 'request.material.thermalExpansionCoefficient');
  requireExactKeys(request.gravity, GRAVITY_KEYS, 'request.gravity');`,
`  requireFinite(request.material.thermalExpansionCoefficient, 'request.material.thermalExpansionCoefficient');
  requireExactKeys(request.frame, FRAME_KEYS, 'request.frame');
  if (typeof request.frame.shearDeformation !== 'boolean') fail('request.frame.shearDeformation must be boolean.', 'REDUCER_CONDENSATION_INPUT_INVALID');
  requirePositive(request.frame.shearCorrectionFactorY, 'request.frame.shearCorrectionFactorY');
  requirePositive(request.frame.shearCorrectionFactorZ, 'request.frame.shearCorrectionFactorZ');
  if (typeof request.frame.source !== 'string' || request.frame.source.trim().length === 0) fail('request.frame.source must be nonempty.', 'REDUCER_CONDENSATION_INPUT_INVALID');
  requireExactKeys(request.pressure, PRESSURE_KEYS, 'request.pressure');
  if (typeof request.pressure.enabled !== 'boolean') fail('request.pressure.enabled must be boolean.', 'REDUCER_CONDENSATION_INPUT_INVALID');
  requireNonnegative(request.pressure.pressure, 'request.pressure.pressure');
  const poissonRatio = requireFinite(request.pressure.poissonRatio, 'request.pressure.poissonRatio');
  if (!(poissonRatio > -1 && poissonRatio < 0.5)) fail('request.pressure.poissonRatio must lie in (-1, 0.5).', 'REDUCER_CONDENSATION_INPUT_INVALID');
  if (request.pressure.ruleId !== 'CLOSED_END_PIPE_AXIAL_STRAIN_V1') fail('request.pressure.ruleId is unsupported.', 'REDUCER_CONDENSATION_INPUT_INVALID');
  if (typeof request.pressure.source !== 'string' || request.pressure.source.trim().length === 0) fail('request.pressure.source must be nonempty.', 'REDUCER_CONDENSATION_INPUT_INVALID');
  if (request.pressure.enabled && !(request.pressure.pressure > 0)) fail('request.pressure.pressure must be positive when pressure is enabled.', 'REDUCER_CONDENSATION_INPUT_INVALID');
  requireExactKeys(request.gravity, GRAVITY_KEYS, 'request.gravity');`,
  ],
]);

patch(files.reducer, [
  [
`  const gravityFull = vector(globalSize);
  const thermalFull = vector(globalSize);`,
`  const gravityFull = vector(globalSize);
  const thermalFull = vector(globalSize);
  const pressureFull = vector(globalSize);`,
  ],
  [
`  let totalWeight = 0;
  let firstWeightMoment = 0;`,
`  let totalWeight = 0;
  let firstWeightMoment = 0;
  let pressureFreeGrowth = 0;`,
  ],
  [
`      length: segmentLength,
      shearDeformation: false,
    }).matrix;`,
`      length: segmentLength,
      shearDeformation: accepted.frame.shearDeformation,
      shearCorrectionFactorY: accepted.frame.shearCorrectionFactorY,
      shearCorrectionFactorZ: accepted.frame.shearCorrectionFactorZ,
    }).matrix;`,
  ],
  [
`    addElementVector(thermalFull, thermal, index, index + 1);

    const metalLineWeight`,
`    addElementVector(thermalFull, thermal, index, index + 1);

    const pressureAxialStrain = accepted.pressure.enabled
      ? (1 - 2 * accepted.pressure.poissonRatio)
        * accepted.pressure.pressure
        * section.innerDiameter ** 2
        / (accepted.material.elasticModulus
          * (section.outerDiameter ** 2 - section.innerDiameter ** 2))
      : 0;
    const pressure = thermalInitialStrainVector({
      elasticModulus: accepted.material.elasticModulus,
      area: section.area,
      axialStrain: pressureAxialStrain,
    });
    addElementVector(pressureFull, pressure, index, index + 1);
    pressureFreeGrowth += pressureAxialStrain * segmentLength;

    const metalLineWeight`,
  ],
  [
`      section,
      lineWeights: {`,
`      section,
      pressureAxialStrain: cleanNumber(pressureAxialStrain),
      lineWeights: {`,
  ],
  [
`  const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull });`,
`  const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull, pressure: pressureFull });`,
  ],
  [
`      localStiffness: condensed.stiffness,
      gravityLocalVector: condensed.loads.gravity,
      thermalInitialStrainLocalVector: condensed.loads.thermal,`,
`      localStiffness: condensed.stiffness,
      gravityLocalVector: condensed.loads.gravity,
      thermalInitialStrainLocalVector: condensed.loads.thermal,
      pressureInitialStrainLocalVector: condensed.loads.pressure,`,
  ],
  [
`    thermal: {
      temperatureDifference: cleanNumber(temperatureDifference),
      axialStrain: cleanNumber(axialStrain),
      rule: 'TEN_CYLINDER_THERMAL_STRAIN',
    },`,
`    frame: {
      shearDeformation: accepted.frame.shearDeformation,
      shearCorrectionFactorY: accepted.frame.shearCorrectionFactorY,
      shearCorrectionFactorZ: accepted.frame.shearCorrectionFactorZ,
      source: accepted.frame.source,
      rule: accepted.frame.shearDeformation ? 'TEN_CYLINDER_TIMOSHENKO_FRAME' : 'TEN_CYLINDER_EULER_BERNOULLI_FRAME',
    },
    pressure: {
      enabled: accepted.pressure.enabled,
      pressure: cleanNumber(accepted.pressure.pressure),
      poissonRatio: cleanNumber(accepted.pressure.poissonRatio),
      freeGrowth: cleanNumber(pressureFreeGrowth),
      meanAxialStrain: cleanNumber(pressureFreeGrowth / accepted.length),
      ruleId: accepted.pressure.ruleId,
      source: accepted.pressure.source,
    },
    thermal: {
      temperatureDifference: cleanNumber(temperatureDifference),
      axialStrain: cleanNumber(axialStrain),
      rule: 'TEN_CYLINDER_THERMAL_STRAIN',
    },`,
  ],
  [
`      'Eccentricity is represented by the caller-declared element axis; this authority varies section properties along that axis.',`,
`      'Eccentricity is represented by the caller-declared element axis; this authority varies section properties along that axis.',
      'Pressure free strain is evaluated independently on each of the ten pipe cylinders using the declared closed-end pipe axial-strain rule and condensed with the same stiffness partition.',`,
  ],
]);

patch(files.adapter, [
  [
`    material: {
      elasticModulus: materialState.elasticModulus,
      shearModulus: materialState.shearModulus,
      massDensity: materialState.massDensity,
      thermalExpansionCoefficient: input.solveProfile.thermalExpansionCoefficientPerKelvin,
    },
    gravity: {`,
`    material: {
      elasticModulus: materialState.elasticModulus,
      shearModulus: materialState.shearModulus,
      massDensity: materialState.massDensity,
      thermalExpansionCoefficient: input.solveProfile.thermalExpansionCoefficientPerKelvin,
    },
    frame: {
      shearDeformation: true,
      shearCorrectionFactorY: 0.5,
      shearCorrectionFactorZ: 0.5,
      source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2',
    },
    pressure: {
      enabled: input.caseMode.pressure && input.solveProfile.bourdonPressureEffects.mode !== 'DISABLED',
      pressure: Number(input.row.PRESSURE1) * KPA_TO_PA,
      poissonRatio: Number(input.row.POISSONS),
      ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
      source: input.solveProfile.bourdonPressureEffects.source,
    },
    gravity: {`,
  ],
  [
`  const initialLocal = input.caseMode.thermal
    ? [...authority.condensed.thermalInitialStrainLocalVector]
    : zero12();`,
`  const thermalInitialLocal = input.caseMode.thermal
    ? [...authority.condensed.thermalInitialStrainLocalVector]
    : zero12();
  const pressureInitialLocal = authority.pressure.enabled
    ? [...authority.condensed.pressureInitialStrainLocalVector]
    : zero12();
  const initialLocal = add(thermalInitialLocal, pressureInitialLocal);`,
  ],
  [
`    pressureAxialStrain: 0,
    bourdonRotationRadians: 0,`,
`    pressureAxialStrain: authority.pressure.enabled ? authority.pressure.meanAxialStrain : 0,
    bourdonRotationRadians: 0,`,
  ],
]);

patch(files.check, [
  [
`    material: {
      elasticModulus: 200e9,
      shearModulus: 77e9,
      massDensity: 7850,
      thermalExpansionCoefficient: 12e-6,
    },
    gravity: {`,
`    material: {
      elasticModulus: 200e9,
      shearModulus: 77e9,
      massDensity: 7850,
      thermalExpansionCoefficient: 12e-6,
    },
    frame: {
      shearDeformation: false,
      shearCorrectionFactorY: 1,
      shearCorrectionFactorZ: 1,
      source: 'B-3.23-EULER-BERNOULLI-BASELINE',
    },
    pressure: {
      enabled: false,
      pressure: 0,
      poissonRatio: 0.3,
      ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
      source: 'B-3.23-PRESSURE-DISABLED-BASELINE',
    },
    gravity: {`,
  ],
  [
`assert.equal(authority.condensed.thermalInitialStrainLocalVector.length, 12);`,
`assert.equal(authority.condensed.thermalInitialStrainLocalVector.length, 12);
assert.equal(authority.condensed.pressureInitialStrainLocalVector.length, 12);`,
  ],
  [
`assert.ok(thermal[0] < 0 && thermal[6] > 0);

const uniformRequest`,
`assert.ok(thermal[0] < 0 && thermal[6] > 0);
assert.deepEqual(authority.condensed.pressureInitialStrainLocalVector, new Array(12).fill(0));

const pressureRequest = sealReducerCondensationRequest({
  ...request({
    reducerId: 'REDUCER-CONDENSATION-PRESSURE-TIMOSHENKO',
    frame: {
      shearDeformation: true,
      shearCorrectionFactorY: 0.5,
      shearCorrectionFactorZ: 0.5,
      source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2',
    },
    pressure: {
      enabled: true,
      pressure: 5e6,
      poissonRatio: 0.3,
      ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
      source: 'B-3.23-CLOSED-END-PRESSURE-FREE-STRAIN',
    },
    gravity: { ...request().gravity, enabled: false },
    thermal: { installationTemperature: 20, operatingTemperature: 20 },
  }),
  semanticHash: '',
});
const pressureAuthority = compileTenCylinderReducerAuthority(pressureRequest);
const pressureUniformRequest = sealReducerCondensationRequest({
  ...request({
    reducerId: 'REDUCER-CONDENSATION-PRESSURE-UNIFORM',
    toSection: { outerDiameter: 0.32385, wallThickness: 0.0127 },
    frame: { ...pressureRequest.frame },
    pressure: { ...pressureRequest.pressure },
    gravity: { ...request().gravity, enabled: false },
    thermal: { installationTemperature: 20, operatingTemperature: 20 },
  }),
  semanticHash: '',
});
const pressureUniform = compileTenCylinderReducerAuthority(pressureUniformRequest);
const pressureUniformProperties = annulus(0.32385, 0.0127);
const directTimoshenko = frameLocalStiffness({
  elasticModulus: 200e9,
  shearModulus: 77e9,
  area: pressureUniformProperties.area,
  secondMomentY: pressureUniformProperties.I,
  secondMomentZ: pressureUniformProperties.I,
  polarMoment: pressureUniformProperties.J,
  length: 1.5,
  shearDeformation: true,
  shearCorrectionFactorY: 0.5,
  shearCorrectionFactorZ: 0.5,
}).matrix;
for (let index = 0; index < 144; index += 1) {
  close(pressureUniform.condensed.localStiffness[index], directTimoshenko[index], `uniform Timoshenko condensed stiffness[${index}]`, 3e-8, 1e-3);
}
const uniformInner = 0.32385 - 2 * 0.0127;
const uniformPressureStrain = (1 - 2 * 0.3) * 5e6 * uniformInner ** 2
  / (200e9 * (0.32385 ** 2 - uniformInner ** 2));
const directPressure = [
  -200e9 * pressureUniformProperties.area * uniformPressureStrain, 0, 0, 0, 0, 0,
  200e9 * pressureUniformProperties.area * uniformPressureStrain, 0, 0, 0, 0, 0,
];
for (let index = 0; index < 12; index += 1) {
  close(pressureUniform.condensed.pressureInitialStrainLocalVector[index], directPressure[index], `uniform pressure vector[${index}]`, 3e-8, 1e-5);
}
const uniformFree = new Array(12).fill(0);
uniformFree[6] = pressureUniform.pressure.freeGrowth;
const uniformFreeAction = directTimoshenko.map((_unused, row) => {
  let sum = 0;
  for (let column = 0; column < 12; column += 1) sum += directTimoshenko[row * 12 + column] * uniformFree[column];
  return sum - pressureUniform.condensed.pressureInitialStrainLocalVector[row];
});
assert.ok(Math.max(...uniformFreeAction.map(Math.abs)) < 1e-4, 'uniform reducer pressure free-growth action');
const taperedFree = new Array(12).fill(0);
taperedFree[6] = pressureAuthority.pressure.freeGrowth;
const taperedFreeAction = pressureAuthority.condensed.localStiffness.map((_unused, row) => {
  let sum = 0;
  for (let column = 0; column < 12; column += 1) sum += pressureAuthority.condensed.localStiffness[row * 12 + column] * taperedFree[column];
  return sum - pressureAuthority.condensed.pressureInitialStrainLocalVector[row];
});
assert.ok(Math.max(...taperedFreeAction.map(Math.abs)) < 1e-4, 'tapered reducer pressure free-growth action');

const uniformRequest`,
  ],
]);

patch(files.bm3, [[
`      material: {
        elasticModulus: material.materialState.elasticModulus,
        shearModulus: material.materialState.shearModulus,
        massDensity: material.materialState.massDensity,
        thermalExpansionCoefficient: material.materialState.thermalExpansionCoefficient,
      },
      gravity: {`,
`      material: {
        elasticModulus: material.materialState.elasticModulus,
        shearModulus: material.materialState.shearModulus,
        massDensity: material.materialState.massDensity,
        thermalExpansionCoefficient: material.materialState.thermalExpansionCoefficient,
      },
      frame: {
        shearDeformation: false,
        shearCorrectionFactorY: 1,
        shearCorrectionFactorZ: 1,
        source: 'M028-BM3-EULER-BERNOULLI-BASELINE',
      },
      pressure: {
        enabled: false,
        pressure: 0,
        poissonRatio: material.materialState.poissonRatio,
        ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
        source: 'M028-BM3-PRESSURE-HANDLED-OUTSIDE-REDUCER-CANDIDATE',
      },
      gravity: {`,
]]);

patch(files.audit, [[
`    material: {
      elasticModulus: material.elasticModulus,
      shearModulus: material.shearModulus,
      massDensity: material.massDensity,
      thermalExpansionCoefficient: input.benchmarkPackage.profile.linearSolve.thermalExpansionCoefficientPerKelvin,
    },
    gravity: common.gravity,`,
`    material: {
      elasticModulus: material.elasticModulus,
      shearModulus: material.shearModulus,
      massDensity: material.massDensity,
      thermalExpansionCoefficient: input.benchmarkPackage.profile.linearSolve.thermalExpansionCoefficientPerKelvin,
    },
    frame: {
      shearDeformation: true,
      shearCorrectionFactorY: KAPPA,
      shearCorrectionFactorZ: KAPPA,
      source: KAPPA_SOURCE,
    },
    pressure: {
      enabled: true,
      pressure: common.pressure,
      poissonRatio: material.poissonRatio,
      ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
      source: input.benchmarkPackage.profile.linearSolve.bourdonPressureEffects.source,
    },
    gravity: common.gravity,`,
], [
`  compareVector(
    variants.CURRENT_EB_NO_PRESSURE.localStiffness,
    production.condensed.localStiffness,
    \`E\${row.ELEMENTID} current reducer stiffness\`,
    2e-8,
  );
  compareVector(
    variants.CURRENT_EB_NO_PRESSURE.gravityLocal,
    production.condensed.gravityLocalVector,
    \`E\${row.ELEMENTID} current reducer gravity\`,
    2e-8,
  );`,
`  compareVector(
    variants.TIMOSHENKO_WITH_PRESSURE.localStiffness,
    production.condensed.localStiffness,
    \`E\${row.ELEMENTID} production reducer stiffness\`,
    2e-8,
  );
  compareVector(
    variants.TIMOSHENKO_WITH_PRESSURE.gravityLocal,
    production.condensed.gravityLocalVector,
    \`E\${row.ELEMENTID} production reducer gravity\`,
    2e-8,
  );
  compareVector(
    variants.TIMOSHENKO_WITH_PRESSURE.pressureLocal,
    production.condensed.pressureInitialStrainLocalVector,
    \`E\${row.ELEMENTID} production reducer pressure\`,
    2e-8,
  );`,
]]);

console.log(JSON.stringify({
  patch: 'issue-947-reducer-pressure-shear-authority',
  status: 'APPLIED',
  files: Object.values(files),
  mechanics: [
    'ten-cylinder reducer uses caller-declared EB/Timoshenko frame authority',
    'closed-end pressure axial strain evaluated per cylinder and statically condensed',
    'ACCDB reducer uses CAESAR-specific kappa=0.5 and active P1 pressure strain in pressure cases',
  ],
}, null, 2));

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [before, after] of replacements) {
    const count = text.split(before).length - 1;
    if (count !== 1) throw new Error(`${path}: expected one exact patch target, found ${count}.`);
    text = text.replace(before, after);
  }
  writeFileSync(path, text);
}
