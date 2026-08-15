import assert from 'node:assert/strict';
import {
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
  FORMULATION_GUARDS,
  FORMULATIONS,
  QUALIFICATION_STATES,
} from '../src/core/local-continuum/index.js';
import { patchSource } from './lafea.3-fixtures.mjs';

for (const formulation of [FORMULATIONS.PLANE_STRESS, FORMULATIONS.PLANE_STRAIN]) {
  checkPatch(formulation);
}
checkPlaneStrainQualificationEnvelope();
console.log('LAFEA.3 two-triangle extension patch, traction parity, scaling, independent cases and plane-strain qualification guard passed.');

function checkPatch(formulation) {
  const result = calculateLocalContinuum(createCanonicalLocalContinuumModel(patchSource({ formulation })));
  assert.equal(result.qualification.state, QUALIFICATION_STATES.ACCEPTED);
  const traction = caseBy(result, 'TRACTION');
  const nodal = caseBy(result, 'NODAL');
  const reverse = caseBy(result, 'REVERSE');
  const double = caseBy(result, 'DOUBLE');
  compareDisplacements(traction, nodal, 1);
  compareDisplacements(reverse, nodal, -1);
  compareDisplacements(double, nodal, 2);
  for (const element of traction.elementResults) {
    close(element.stress.sigmaX, 10);
    close(element.stress.sigmaY, 0);
    close(element.stress.tauXY, 0);
    if (formulation === FORMULATIONS.PLANE_STRESS) close(element.stress.sigmaZ, 0);
    else close(element.stress.sigmaZ, 3);
  }
  assert.ok(traction.supportReactions.length === 3);
  assert.equal(traction.equilibrium.accepted, true);
}

function checkPlaneStrainQualificationEnvelope() {
  const accepted = patchSource({ formulation: FORMULATIONS.PLANE_STRAIN });
  accepted.materials[0].poissonRatio = FORMULATION_GUARDS.planeStrainPoissonBlock - 0.01;
  assert.doesNotThrow(() => createCanonicalLocalContinuumModel(accepted));

  const blocked = patchSource({ formulation: FORMULATIONS.PLANE_STRAIN });
  blocked.materials[0].poissonRatio = FORMULATION_GUARDS.planeStrainPoissonBlock;
  assert.throws(
    () => createCanonicalLocalContinuumModel(blocked),
    (error) => error?.code === 'PLANE_STRAIN_NEAR_INCOMPRESSIBLE_NOT_QUALIFIED',
  );

  // The displacement-locking boundary is a plane-strain qualification policy,
  // not a generic material-law limit. Plane stress remains admissible up to
  // the canonical material contract's nu < 0.5 boundary.
  const planeStress = patchSource({ formulation: FORMULATIONS.PLANE_STRESS });
  planeStress.materials[0].poissonRatio = 0.49;
  assert.doesNotThrow(() => createCanonicalLocalContinuumModel(planeStress));
}

function caseBy(result, id) {
  return result.loadCaseResults.find((row) => row.loadCaseId === id);
}
function compareDisplacements(actual, expected, factor) {
  actual.nodalDisplacements.forEach((row, index) => {
    close(row.ux, factor * expected.nodalDisplacements[index].ux);
    close(row.uy, factor * expected.nodalDisplacements[index].uy);
  });
}
function close(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) <= 1e-7 * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
