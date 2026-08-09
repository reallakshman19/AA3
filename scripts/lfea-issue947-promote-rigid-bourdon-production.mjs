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
  const anchor = `/**
 * Build the consistent local gravity vector for a compiled authority.`;
  assert.equal(count(source, anchor), 1, 'Rigid gravity-function anchor drifted.');
  const helper = `/**
 * Convert activated CAESAR Bourdon pressure effects into the axial free state
 * of a rigid element. CAESAR rigid stiffness uses the original ID with ten
 * times the entered wall thickness; the Bourdon pressure action remains the
 * physical closed-end force F_B = (1 - 2 nu) P A_i. Dividing that force by
 * the rigid axial rigidity gives the equivalent free strain of the artificial
 * stiffness section without multiplying physical-pipe strain by rigid EA.
 *
 * SOURCE: Hexagon CAESAR II rigid-element application and Bourdon/code-note
 * authorities. The helper owns only the local axial pressure free state; job
 * activation remains an adapter/load-case responsibility.
 */
export function rigidElementBourdonPressureEffect(authority, input) {
  const accepted = requireRigidElementAuthority(authority);
  const pressure = input?.pressure;
  const poissonRatio = input?.poissonRatio;
  if (typeof pressure !== 'number' || !Number.isFinite(pressure) || pressure < 0) {
    throw new TypeError('Rigid Bourdon pressure must be a finite nonnegative pressure.');
  }
  if (typeof poissonRatio !== 'number' || !Number.isFinite(poissonRatio)
    || !(poissonRatio > -1 && poissonRatio < 0.5)) {
    throw new TypeError('Rigid Bourdon Poisson ratio must satisfy -1 < nu < 0.5.');
  }
  const insideArea = Math.PI * accepted.geometry.originalInsideDiameter ** 2 / 4;
  const axialForce = (1 - 2 * poissonRatio) * pressure * insideArea;
  const equivalentAxialStrain = axialForce / accepted.rigidities.axial;
  const initialStrainLoad = new Array(12).fill(0);
  initialStrainLoad[0] = cleanNumber(-axialForce);
  initialStrainLoad[6] = cleanNumber(axialForce);
  return Object.freeze({
    rule: 'BOURDON_FORCE_ON_RIGID_STIFFNESS_SECTION_V1',
    pressure: cleanNumber(pressure),
    poissonRatio: cleanNumber(poissonRatio),
    insideArea: cleanNumber(insideArea),
    axialForce: cleanNumber(axialForce),
    equivalentAxialStrain: cleanNumber(equivalentAxialStrain),
    freeExpansion: cleanNumber(equivalentAxialStrain * accepted.geometry.length),
    initialStrainLoad: Object.freeze(initialStrainLoad),
  });
}

`;
  source = source.replace(anchor, helper + anchor);
  writeFileSync(RIGID_FILE, source, 'utf8');
}

function patchRigidIndex() {
  let source = readFileSync(RIGID_INDEX, 'utf8');
  const anchor = `  compileCaesarRigidElementAuthority,
  rigidElementGravityLocalVector,`;
  assert.equal(count(source, anchor), 1, 'Rigid export anchor drifted.');
  source = source.replace(anchor,
    `  compileCaesarRigidElementAuthority,
  rigidElementBourdonPressureEffect,
  rigidElementGravityLocalVector,`);
  writeFileSync(RIGID_INDEX, source, 'utf8');
}

function patchAccdbAdapter() {
  let source = readFileSync(ACCDB_SOLVE, 'utf8');
  const importAnchor = `  compileCaesarRigidElementAuthority,
  sealRigidElementRequest,`;
  assert.equal(count(source, importAnchor), 1, 'ACCDB rigid import anchor drifted.');
  source = source.replace(importAnchor,
    `  compileCaesarRigidElementAuthority,
  rigidElementBourdonPressureEffect,
  sealRigidElementRequest,`);

  const pressurePattern = /\? closedEndPressureAxialStrain\(input\.row, frame\.material\.elasticModulus\)\s*\n\s*\* input\.pressureLengthScale/g;
  assert.equal([...source.matchAll(pressurePattern)].length, 1,
    'Expected exactly one generic straight pressure-strain expression.');
  source = source.replace(pressurePattern,
    `? (input.pressureAxialStrainOverride ?? (
        closedEndPressureAxialStrain(input.row, frame.material.elasticModulus)
        * input.pressureLengthScale))`);

  const authorityEnd = `    semanticHash: '',
  }));
  const rigidSection = input.sectionRegistry.resolve(`;
  assert.equal(count(source, authorityEnd), 1, 'ACCDB rigid authority completion anchor drifted.');
  source = source.replace(authorityEnd,
    `    semanticHash: '',
  }));
  const pressureEffect = rigidElementBourdonPressureEffect(authority, {
    pressure: Number(input.row.PRESSURE1) * KPA_TO_PA,
    poissonRatio: Number(input.row.POISSONS),
  });
  const rigidSection = input.sectionRegistry.resolve(`);

  const rigidBuild = `    kind: 'RIGID',
    pressureLengthScale: 0,`;
  assert.equal(count(source, rigidBuild), 1, 'ACCDB rigid build anchor drifted.');
  source = source.replace(rigidBuild,
    `    kind: 'RIGID',
    pressureLengthScale: 0,
    pressureAxialStrainOverride: pressureEffect.equivalentAxialStrain,`);
  writeFileSync(ACCDB_SOLVE, source, 'utf8');
}

function patchCanonicalCheck() {
  let source = readFileSync(RIGID_CHECK, 'utf8');
  const importAnchor = `  requireRigidElementAuthority,
  rigidElementGravityLocalVector,`;
  assert.equal(count(source, importAnchor), 1, 'B-3.22 import anchor drifted.');
  source = source.replace(importAnchor,
    `  requireRigidElementAuthority,
  rigidElementBourdonPressureEffect,
  rigidElementGravityLocalVector,`);

  const checkAnchor = `close(authority.thermal.freeExpansion, 12e-6 * 200 * 1.2, 'free thermal expansion');
`;
  assert.equal(count(source, checkAnchor), 1, 'B-3.22 pressure-check insertion anchor drifted.');
  const pressureCheck = `
const pressureEffect = rigidElementBourdonPressureEffect(authority, {
  pressure: 8e6,
  poissonRatio: 0.3,
});
const expectedInsideArea = Math.PI * 0.2 ** 2 / 4;
const expectedBourdonForce = (1 - 2 * 0.3) * 8e6 * expectedInsideArea;
close(pressureEffect.insideArea, expectedInsideArea, 'rigid Bourdon inside area');
close(pressureEffect.axialForce, expectedBourdonForce, 'rigid Bourdon axial force');
close(pressureEffect.equivalentAxialStrain,
  expectedBourdonForce / authority.rigidities.axial, 'rigid Bourdon equivalent strain');
close(pressureEffect.freeExpansion,
  expectedBourdonForce / authority.rigidities.axial * 1.2, 'rigid Bourdon free expansion');
close(pressureEffect.initialStrainLoad[0], -expectedBourdonForce, 'rigid Bourdon I load');
close(pressureEffect.initialStrainLoad[6], expectedBourdonForce, 'rigid Bourdon J load');
assert.equal(pressureEffect.initialStrainLoad.filter((value, index) => ![0, 6].includes(index) && value !== 0).length, 0);
assert.throws(() => rigidElementBourdonPressureEffect(authority, { pressure: 1e6, poissonRatio: 0.5 }), TypeError);
`;
  source = source.replace(checkAnchor, checkAnchor + pressureCheck);
  writeFileSync(RIGID_CHECK, source, 'utf8');
}

function count(source, needle) {
  return source.split(needle).length - 1;
}
