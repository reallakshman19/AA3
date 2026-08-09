#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const RIGID_FILE = 'src/core/linear-fea-rigid-element/rigid-element.js';
const RIGID_INDEX = 'src/core/linear-fea-rigid-element/index.js';
const ACCDB_SOLVE = 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
const RIGID_CHECK = 'scripts/lfea-b3.22-rigid-element-authority-check.mjs';

patchRigidAuthority();
patchRigidIndex();
patchAccdbAdapter();
patchCanonicalCheck();
console.log('Issue 947 rigid Bourdon production promotion patch applied.');

function patchRigidAuthority() {
  let source = readFileSync(RIGID_FILE, 'utf8');
  assert.equal(source.includes('rigidElementBourdonPressureEffect'), false,
    'Rigid Bourdon pressure effect already exists; refuse a second promotion.');
  const anchor = `/**\n * Build the consistent local gravity vector for a compiled authority.`;
  assert.equal(count(source, anchor), 1, 'Rigid gravity-function anchor drifted.');
  const helper = `/**\n * Convert activated CAESAR Bourdon pressure effects into the axial free state\n * of a rigid element. CAESAR rigid stiffness uses the original ID with ten\n * times the entered wall thickness; the Bourdon pressure action remains the\n * physical closed-end force F_B = (1 - 2 nu) P A_i. Dividing that force by\n * the rigid axial rigidity gives the equivalent free strain of the artificial\n * stiffness section without multiplying physical-pipe strain by rigid EA.\n *\n * SOURCE: Hexagon CAESAR II rigid-element application and Bourdon/code-note\n * authorities. The helper owns only the local axial pressure free state; job\n * activation remains an adapter/load-case responsibility.\n */\nexport function rigidElementBourdonPressureEffect(authority, input) {\n  const accepted = requireRigidElementAuthority(authority);\n  const pressure = input?.pressure;\n  const poissonRatio = input?.poissonRatio;\n  if (typeof pressure !== 'number' || !Number.isFinite(pressure) || pressure < 0) {\n    throw new TypeError('Rigid Bourdon pressure must be a finite nonnegative pressure.');\n  }\n  if (typeof poissonRatio !== 'number' || !Number.isFinite(poissonRatio)\n    || !(poissonRatio > -1 && poissonRatio < 0.5)) {\n    throw new TypeError('Rigid Bourdon Poisson ratio must satisfy -1 < nu < 0.5.');\n  }\n  const insideArea = Math.PI * accepted.geometry.originalInsideDiameter ** 2 / 4;\n  const axialForce = (1 - 2 * poissonRatio) * pressure * insideArea;\n  const equivalentAxialStrain = axialForce / accepted.rigidities.axial;\n  const initialStrainLoad = new Array(12).fill(0);\n  initialStrainLoad[0] = cleanNumber(-axialForce);\n  initialStrainLoad[6] = cleanNumber(axialForce);\n  return Object.freeze({\n    rule: 'BOURDON_FORCE_ON_RIGID_STIFFNESS_SECTION_V1',\n    pressure: cleanNumber(pressure),\n    poissonRatio: cleanNumber(poissonRatio),\n    insideArea: cleanNumber(insideArea),\n    axialForce: cleanNumber(axialForce),\n    equivalentAxialStrain: cleanNumber(equivalentAxialStrain),\n    freeExpansion: cleanNumber(equivalentAxialStrain * accepted.geometry.length),\n    initialStrainLoad: Object.freeze(initialStrainLoad),\n  });\n}\n\n`;
  source = source.replace(anchor, helper + anchor);
  writeFileSync(RIGID_FILE, source, 'utf8');
}

function patchRigidIndex() {
  let source = readFileSync(RIGID_INDEX, 'utf8');
  const anchor = `  compileCaesarRigidElementAuthority,\n  rigidElementGravityLocalVector,`;
  assert.equal(count(source, anchor), 1, 'Rigid export anchor drifted.');
  source = source.replace(anchor,
    `  compileCaesarRigidElementAuthority,\n  rigidElementBourdonPressureEffect,\n  rigidElementGravityLocalVector,`);
  writeFileSync(RIGID_INDEX, source, 'utf8');
}

function patchAccdbAdapter() {
  let source = readFileSync(ACCDB_SOLVE, 'utf8');
  const importAnchor = `  compileCaesarRigidElementAuthority,\n  sealRigidElementRequest,`;
  assert.equal(count(source, importAnchor), 1, 'ACCDB rigid import anchor drifted.');
  source = source.replace(importAnchor,
    `  compileCaesarRigidElementAuthority,\n  rigidElementBourdonPressureEffect,\n  sealRigidElementRequest,`);

  const pressurePattern = /\? closedEndPressureAxialStrain\(input\.row, frame\.material\.elasticModulus\)\s*\n\s*\* input\.pressureLengthScale/g;
  assert.equal([...source.matchAll(pressurePattern)].length, 1,
    'Expected exactly one generic straight pressure-strain expression.');
  source = source.replace(pressurePattern,
    `? (input.pressureAxialStrainOverride ?? (\n        closedEndPressureAxialStrain(input.row, frame.material.elasticModulus)\n        * input.pressureLengthScale))`);

  const authorityEnd = `    semanticHash: '',\n  }));\n  const rigidSection = input.sectionRegistry.resolve(`;
  assert.equal(count(source, authorityEnd), 1, 'ACCDB rigid authority completion anchor drifted.');
  source = source.replace(authorityEnd,
    `    semanticHash: '',\n  }));\n  const pressureEffect = rigidElementBourdonPressureEffect(authority, {\n    pressure: Number(input.row.PRESSURE1) * KPA_TO_PA,\n    poissonRatio: Number(input.row.POISSONS),\n  });\n  const rigidSection = input.sectionRegistry.resolve(`);

  const rigidBuild = `    kind: 'RIGID',\n    pressureLengthScale: 0,`;
  assert.equal(count(source, rigidBuild), 1, 'ACCDB rigid build anchor drifted.');
  source = source.replace(rigidBuild,
    `    kind: 'RIGID',\n    pressureLengthScale: 0,\n    pressureAxialStrainOverride: pressureEffect.equivalentAxialStrain,`);
  writeFileSync(ACCDB_SOLVE, source, 'utf8');
}

function patchCanonicalCheck() {
  let source = readFileSync(RIGID_CHECK, 'utf8');
  const importAnchor = `  requireRigidElementAuthority,\n  rigidElementGravityLocalVector,`;
  assert.equal(count(source, importAnchor), 1, 'B-3.22 import anchor drifted.');
  source = source.replace(importAnchor,
    `  requireRigidElementAuthority,\n  rigidElementBourdonPressureEffect,\n  rigidElementGravityLocalVector,`);

  const checkAnchor = `close(authority.thermal.freeExpansion, 12e-6 * 200 * 1.2, 'free thermal expansion');\n`;
  assert.equal(count(source, checkAnchor), 1, 'B-3.22 pressure-check insertion anchor drifted.');
  const pressureCheck = `\nconst pressureEffect = rigidElementBourdonPressureEffect(authority, {\n  pressure: 8e6,\n  poissonRatio: 0.3,\n});\nconst expectedInsideArea = Math.PI * 0.2 ** 2 / 4;\nconst expectedBourdonForce = (1 - 2 * 0.3) * 8e6 * expectedInsideArea;\nclose(pressureEffect.insideArea, expectedInsideArea, 'rigid Bourdon inside area');\nclose(pressureEffect.axialForce, expectedBourdonForce, 'rigid Bourdon axial force');\nclose(pressureEffect.equivalentAxialStrain,\n  expectedBourdonForce / authority.rigidities.axial, 'rigid Bourdon equivalent strain');\nclose(pressureEffect.freeExpansion,\n  expectedBourdonForce / authority.rigidities.axial * 1.2, 'rigid Bourdon free expansion');\nclose(pressureEffect.initialStrainLoad[0], -expectedBourdonForce, 'rigid Bourdon I load');\nclose(pressureEffect.initialStrainLoad[6], expectedBourdonForce, 'rigid Bourdon J load');\nassert.equal(pressureEffect.initialStrainLoad.filter((value, index) => ![0, 6].includes(index) && value !== 0).length, 0);\nassert.throws(() => rigidElementBourdonPressureEffect(authority, { pressure: 1e6, poissonRatio: 0.5 }), TypeError);\n`;
  source = source.replace(checkAnchor, checkAnchor + pressureCheck);
  writeFileSync(RIGID_CHECK, source, 'utf8');
}

function count(source, needle) {
  return source.split(needle).length - 1;
}
