import assert from 'node:assert/strict';
import {
  BASE_LIMITATIONS,
  CANONICAL_UNITS,
  FORMULATION,
  MODEL_SCHEMA,
  RESULT_REQUEST,
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../src/core/local-shell/index.js';
import {
  cylindricalSource,
  flatNode,
  pressurePatchSource,
  qualificationProfile,
} from './lafea.4-fixtures.mjs';

const CASES = Object.freeze({
  CYL: 'LAFEA4-CYL-01',
  PRESS: 'LAFEA4-PRESS-01',
  COMB: 'LAFEA4-COMB-01',
});

// ---------------------------------------------------------------------------
// LAFEA4-CYL-01 — production cylindrical geometry/basis + membrane recovery.
// Independent oracle: prescribed circumferential strain and plane-stress D.
// The faceted cylinder is intentionally checked as a mesh ladder rather than
// freezing one production value; geometry discretization error must converge.
// ---------------------------------------------------------------------------
{
  const strain = 0.001;
  const radius = 100;
  const expectedStress = 200000 / (1 - 0.3 ** 2) * strain;
  const levels = [4, 8, 16].map((segments) => {
    const source = cylindricalSource(segments);
    source.modelIdentity = `${CASES.CYL}-N${segments}`;
    source.loadCases = [{
      loadCaseId: CASES.CYL,
      nodalLoads: [],
      pressureLoads: [],
      sourceReference: `${CASES.CYL}-SRC`,
    }];
    source.constraints = source.nodes.flatMap((node) => {
      const angle = Math.atan2(node.position[1], node.position[2]);
      const displacement = node.rotationBasis2.map((value) => value * strain * radius * angle);
      return prescribed(node.nodeId, [...displacement, 0, 0]);
    });
    const result = solve(source);
    let strainError = 0;
    let stressError = 0;
    for (const elementResult of result.loadCaseResults[0].elementResults) {
      const element = result.meshEvidence.elements.find((row) => row.elementId === elementResult.elementId);
      const tangent = circumferentialTangent(source, element.nodeIds);
      const [a, b] = localDirection(tangent, element.localFrame);
      const hoopStrain = projectStrain(elementResult.membraneStrain, a, b);
      const hoopStress = projectStress(elementResult.membraneStress, a, b);
      strainError = Math.max(strainError, Math.abs(hoopStrain - strain));
      stressError = Math.max(stressError, Math.abs(hoopStress - expectedStress));
      assert.equal(element.nodalBasisTransformation.rigidReproduction.accepted, true);
    }
    assert.equal(result.loadCaseResults[0].forceEquilibrium.qualification.accepted, true);
    assert.equal(result.loadCaseResults[0].momentEquilibrium.qualification.accepted, true);
    return { segments, strainError, stressError };
  });
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(
      levels[index].strainError < levels[index - 1].strainError / 3.5,
      `${CASES.CYL}: circumferential strain error must converge geometrically`,
    );
    assert.ok(
      levels[index].stressError < levels[index - 1].stressError / 3.5,
      `${CASES.CYL}: circumferential stress error must converge geometrically`,
    );
  }
  console.log(`✅ ${CASES.CYL}: direct calculateLocalShell cylindrical basis/recovery converges to the prescribed membrane oracle.`);
}

// ---------------------------------------------------------------------------
// LAFEA4-PRESS-01 — exact planar traction/free-body oracle.
// The fixture is fully fixed; therefore q=0 and every generalized reaction is
// exactly -F. Force and first moment are independently obtained from p*A at
// the patch centroid, not frozen from solver output.
// ---------------------------------------------------------------------------
{
  const source = pressurePatchSource('ALONG_ELEMENT_NORMAL');
  source.modelIdentity = CASES.PRESS;
  source.loadCases[0].loadCaseId = CASES.PRESS;
  const result = solve(source);
  const loadCase = result.loadCaseResults[0];
  const p = 2.5;
  const area = 100 * 50;
  const total = p * area;
  const expectedForce = [0, 0, total];
  const expectedMoment = [25 * total, -50 * total, 0];
  vectorClose(loadCase.appliedLoadEvidence.appliedForce, expectedForce);
  vectorClose(loadCase.appliedLoadEvidence.appliedMomentAboutOrigin, expectedMoment);
  loadCase.reactions.forEach((reaction) => {
    const index = result.meshEvidence.dofOrdering.indexOf(`${reaction.nodeId}:${reaction.dof}`);
    close(reaction.value, -loadCase.appliedLoadEvidence.forceVector[index]);
  });
  assert.equal(loadCase.forceEquilibrium.qualification.accepted, true);
  assert.equal(loadCase.momentEquilibrium.qualification.accepted, true);

  const opposite = pressurePatchSource('OPPOSITE_ELEMENT_NORMAL');
  opposite.modelIdentity = `${CASES.PRESS}-REVERSED`;
  opposite.loadCases[0].loadCaseId = `${CASES.PRESS}-REVERSED`;
  const reversed = solve(opposite).loadCaseResults[0].appliedLoadEvidence;
  vectorClose(reversed.appliedForce, expectedForce.map((value) => -value));
  vectorClose(reversed.appliedMomentAboutOrigin, expectedMoment.map((value) => -value));
  console.log(`✅ ${CASES.PRESS}: direct production pressure route satisfies p*A, centroid first moment, R=-F and sense reversal.`);
}

// ---------------------------------------------------------------------------
// LAFEA4-COMB-01 — combined prescribed membrane + constant curvature +
// reference pressure on the same production calculation. Independent oracles:
// exact affine membrane strain, exact quadratic Kirchhoff curvature, plane-
// stress top/bottom stress, analytical membrane+bending energy and pressure
// force/moment. No production value is copied into the expected set.
// ---------------------------------------------------------------------------
{
  const E = 200000;
  const nu = 0.3;
  const t = 2;
  const epsilon = [0.0004, -0.0001, 0.00015];
  const curvature = [0.00008, -0.00003, 0.00001];
  const pressure = 0.2;
  const source = combinedPatchSource({ E, nu, t, epsilon, curvature, pressure });
  const result = solve(source);
  const loadCase = result.loadCaseResults[0];
  const D = planeStressMatrix(E, nu);

  for (const element of loadCase.elementResults) {
    const frame = result.meshEvidence.elements
      .find((row) => row.elementId === element.elementId).localFrame;
    const localEpsilon = rotateStrain(epsilon, frame);
    const localCurvature = rotateStrain(curvature, frame);
    vectorRecordClose(element.membraneStrain, localEpsilon, ['epsilonX', 'epsilonY', 'gammaXY'], 1e-8);
    for (const point of element.integrationPoints) {
      vectorRecordClose(point.curvature, localCurvature, ['kappaX', 'kappaY', 'kappaXY'], 1e-8);
      for (const surface of point.surfaces) {
        const z = surface.surface === 'TOP' ? t / 2 : surface.surface === 'BOTTOM' ? -t / 2 : 0;
        const combinedStrain = localEpsilon.map((value, index) => value + z * localCurvature[index]);
        const expectedStress = matVec(D, combinedStrain);
        vectorRecordClose(
          surface.combinedStress,
          expectedStress,
          ['sigmaX', 'sigmaY', 'tauXY'],
          1e-8,
        );
      }
    }
  }

  const area = 100 * 50;
  const expectedMembraneEnergy = 0.5 * area * t * dot(epsilon, matVec(D, epsilon));
  const expectedBendingEnergy = 0.5 * area * t ** 3 / 12 * dot(curvature, matVec(D, curvature));
  close(loadCase.membraneStrainEnergy, expectedMembraneEnergy, 1e-8);
  close(loadCase.bendingStrainEnergy, expectedBendingEnergy, 1e-8);
  close(loadCase.totalStrainEnergy, expectedMembraneEnergy + expectedBendingEnergy, 1e-8);
  assert.equal(loadCase.energyQualification.accepted, true);

  const pressureTotal = pressure * area;
  vectorClose(loadCase.appliedLoadEvidence.appliedForce, [0, 0, pressureTotal]);
  vectorClose(
    loadCase.appliedLoadEvidence.appliedMomentAboutOrigin,
    [25 * pressureTotal, -50 * pressureTotal, 0],
  );
  assert.equal(loadCase.forceEquilibrium.qualification.accepted, true);
  assert.equal(loadCase.momentEquilibrium.qualification.accepted, true);
  console.log(`✅ ${CASES.COMB}: direct production route recovers analytical membrane+curvature surface stress, energy and pressure equilibrium in one case.`);
}

console.log('\n✅ Issue #1536 production-route benchmarks LAFEA4-CYL-01 / PRESS-01 / COMB-01 passed.');

function combinedPatchSource({ E, nu, t, epsilon, curvature, pressure }) {
  const nodes = [
    flatNode('A', 0, 0), flatNode('B', 100, 0),
    flatNode('C', 100, 50), flatNode('D', 0, 50),
  ];
  const elements = [
    element('E1', ['A', 'B', 'C'], t),
    element('E2', ['A', 'C', 'D'], t),
  ];
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: CASES.COMB,
    modelVersion: '1',
    sourceAncestry: ['benchmark/issue-1536-production-route/v1'],
    units: { ...CANONICAL_UNITS },
    formulation: FORMULATION,
    materials: [{ materialId: 'MAT', elasticModulus: E, poissonRatio: nu, sourceReference: 'MAT-SRC' }],
    nodes,
    elements,
    constraints: prescribedMembraneCurvature(nodes, epsilon, curvature),
    loadCases: [{
      loadCaseId: CASES.COMB,
      nodalLoads: [],
      pressureLoads: elements.map((row, index) => ({
        pressureLoadId: `P-${index + 1}`,
        elementId: row.elementId,
        pressure,
        sense: 'ALONG_ELEMENT_NORMAL',
        sourceReference: `P-${index + 1}-SRC`,
      })),
      sourceReference: `${CASES.COMB}-SRC`,
    }],
    resultRequests: {
      stressSurfaces: [...RESULT_REQUEST.stressSurfaces],
      dktIntegrationRule: RESULT_REQUEST.dktIntegrationRule,
      retainElementMatrices: true,
    },
    qualificationProfile: qualificationProfile(),
    limitations: [...BASE_LIMITATIONS],
  };
}

function prescribedMembraneCurvature(nodes, epsilon, curvature) {
  const [ex, ey, gxy] = epsilon;
  const [kx, ky, kxy] = curvature;
  return nodes.flatMap((node) => {
    const [x, y] = node.position;
    const values = [
      ex * x + 0.5 * gxy * y,
      ey * y + 0.5 * gxy * x,
      -0.5 * kx * x ** 2 - 0.5 * ky * y ** 2 - 0.5 * kxy * x * y,
      -ky * y - 0.5 * kxy * x,
      kx * x + 0.5 * kxy * y,
    ];
    return prescribed(node.nodeId, values);
  });
}

function prescribed(nodeId, values) {
  return ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof, index) => ({
    constraintId: `C-${nodeId}-${dof}`,
    nodeId,
    dof,
    value: values[index],
    sourceReference: `C-${nodeId}-${dof}-SRC`,
  }));
}

function element(elementId, nodeIds, thickness) {
  return { elementId, nodeIds, materialId: 'MAT', thickness, sourceReference: `${elementId}-SRC` };
}

function solve(source) {
  const model = createCanonicalLocalShellModel(source);
  const result = calculateLocalShell(model);
  assert.equal(result.qualification.accepted, true, `${source.modelIdentity}: ${result.qualification.summary}`);
  return result;
}

function circumferentialTangent(source, nodeIds) {
  const centroid = nodeIds.map((nodeId) => source.nodes.find((node) => node.nodeId === nodeId).position)
    .reduce((total, position) => total.map((value, index) => value + position[index]), [0, 0, 0])
    .map((value) => value / 3);
  const angle = Math.atan2(centroid[1], centroid[2]);
  return [0, Math.cos(angle), -Math.sin(angle)];
}

function localDirection(global, frame) {
  let a = dot(global, frame.ex);
  let b = dot(global, frame.ey);
  const length = Math.hypot(a, b);
  a /= length;
  b /= length;
  return [a, b];
}

// Rotates a global engineering (X, Y, XY) triple — strain or curvature,
// both using the doubled engineering-shear/twist convention — into an
// element's local frame. membraneStrain and curvature are element-local
// quantities (see meshEvidence.localFrame), so a single global closed-form
// oracle must be rotated per element before comparison, not compared as-is.
function rotateStrain([x, y, xy], frame) {
  const c = frame.ex[0];
  const s = frame.ex[1];
  return [
    c ** 2 * x + s ** 2 * y + c * s * xy,
    s ** 2 * x + c ** 2 * y - c * s * xy,
    2 * c * s * (y - x) + (c ** 2 - s ** 2) * xy,
  ];
}

function projectStrain(strain, a, b) {
  return a ** 2 * strain.epsilonX + b ** 2 * strain.epsilonY + a * b * strain.gammaXY;
}

function projectStress(stress, a, b) {
  return a ** 2 * stress.sigmaX + b ** 2 * stress.sigmaY + 2 * a * b * stress.tauXY;
}

function planeStressMatrix(E, nu) {
  const factor = E / (1 - nu ** 2);
  return [
    [factor, factor * nu, 0],
    [factor * nu, factor, 0],
    [0, 0, factor * (1 - nu) / 2],
  ];
}

function matVec(matrix, vector) {
  return matrix.map((row) => dot(row, vector));
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function vectorRecordClose(record, expected, fields, tolerance) {
  fields.forEach((field, index) => close(record[field], expected[index], tolerance));
}

function vectorClose(actual, expected, tolerance = 1e-9) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], tolerance));
}

function close(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
}
