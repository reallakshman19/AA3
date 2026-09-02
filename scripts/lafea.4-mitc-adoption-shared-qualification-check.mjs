import assert from 'node:assert/strict';
import {
  BASE_LIMITATIONS,
  CANONICAL_UNITS,
  FORMULATION,
  MODEL_SCHEMA,
  QUALIFICATION_STATES,
  RESULT_REQUEST,
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../src/core/local-shell/index.js';
import {
  MITC4_TOPOLOGY,
  MITC_ADOPTION_MODEL_SCHEMA,
  MITC_ADOPTION_ROUTE_STATUS,
  createExperimentalMitcAdoptionModel,
} from '../src/core/local-shell/mitc-adoption-model.js';
import { recoverExperimentalMitcLoadCase } from '../src/core/local-shell/mitc-adoption-recovery.js';
import {
  MITC_ADOPTION_EXECUTION_SCHEMA,
  solveExperimentalMitcLoadCase,
} from '../src/core/local-shell/mitc-adoption-solve.js';
import { MITC4_FORMULATION } from '../src/core/local-shell/mitc4-element.js';
import { flatNode, qualificationProfile } from './lafea.4-fixtures.mjs';

const E = 200000;
const NU_BEAM = 0;
const KAPPA = 5 / 6;
const P = 1;
const L = 10;
const B = 1;
const SEGMENTS = 32;

// ---------------------------------------------------------------------------
// Shared cantilever physics: compare each route to an independent analytical
// model, never directly force one FE formulation to equal the other.
// ---------------------------------------------------------------------------
for (const row of [
  { label: 'thin', thickness: 0.1, expectShearMaterial: false },
  { label: 'moderate', thickness: 2.0, expectShearMaterial: true },
]) {
  const oracle = beamOracle(row.thickness);
  const dkt = solveDktCantilever(row.thickness);
  const mitc = solveMitcCantilever(row.thickness);

  const dktRatio = dkt / oracle.bending;
  const mitcRatio = mitc / oracle.total;
  assert.ok(
    dktRatio > 0.95 && dktRatio < 1.05,
    `${row.label}: CST/DKT must track the Kirchhoff/Euler-Bernoulli bending oracle; got ${dktRatio}`,
  );
  assert.ok(
    mitcRatio > 0.95 && mitcRatio < 1.05,
    `${row.label}: MITC must track the Timoshenko/Reissner-Mindlin oracle; got ${mitcRatio}`,
  );

  if (!row.expectShearMaterial) {
    const shearFraction = oracle.shear / oracle.total;
    assert.ok(shearFraction < 1e-3, `thin oracle must have negligible shear fraction; got ${shearFraction}`);
    assert.ok(
      Math.abs(mitc - dkt) / oracle.total < 0.05,
      `thin routes must converge to the same physical limit under the common mesh; DKT=${dkt}, MITC=${mitc}`,
    );
  } else {
    const shearFraction = oracle.shear / oracle.total;
    assert.ok(shearFraction > 0.02, `moderate case must have material shear compliance; got ${shearFraction}`);
    assert.ok(
      mitc > dkt,
      `MITC must retain additional physical shear compliance for the moderate case; DKT=${dkt}, MITC=${mitc}`,
    );
    assert.ok(
      mitc / dkt > 1.005,
      `moderate MITC response must be measurably more flexible than Kirchhoff-only DKT; ratio=${mitc / dkt}`,
    );
  }

  console.log(
    `✅ ${row.label} cantilever: DKT/EB=${dktRatio.toFixed(5)}, MITC/Timoshenko=${mitcRatio.toFixed(5)}, `
      + `analytical shear fraction=${(oracle.shear / oracle.total).toExponential(3)}.`,
  );
}

// ---------------------------------------------------------------------------
// Shared affine membrane oracle. Both formulations must recover the same
// constitutive state because transverse-shear kinematics are irrelevant here.
// ---------------------------------------------------------------------------
{
  const epsilonX = 0.0004;
  const epsilonY = -0.0001;
  const gammaXY = 0.00015;
  const nu = 0.3;
  const expected = planeStress(E, nu, epsilonX, epsilonY, gammaXY);

  const legacySource = legacyPatchSource({ thickness: 2, poissonRatio: nu });
  legacySource.constraints = prescribedAffineMembrane(
    legacySource.nodes,
    epsilonX,
    epsilonY,
    gammaXY,
  );
  const legacy = calculateLocalShell(createCanonicalLocalShellModel(legacySource));
  assert.equal(legacy.qualification.state, QUALIFICATION_STATES.ACCEPTED);

  for (const element of legacy.loadCaseResults[0].elementResults) {
    const frame = legacy.meshEvidence.elements
      .find((row) => row.elementId === element.elementId).localFrame;
    const localExpected = rotateStress(expected, frame);
    close(element.membraneStress.sigmaX, localExpected[0], 1e-8);
    close(element.membraneStress.sigmaY, localExpected[1], 1e-8);
    close(element.membraneStress.tauXY, localExpected[2], 1e-8);
  }

  const mitcModel = adoptionPatchModel({ thickness: 2, poissonRatio: nu });
  const mitcSolved = solveExperimentalMitcLoadCase(mitcModel, executionRequest({
    loadCaseId: 'MEMBRANE',
    constraints: prescribedAffineMembrane(
      mitcModel.nodes,
      epsilonX,
      epsilonY,
      gammaXY,
    ),
  }));
  const mitc = recoverExperimentalMitcLoadCase(mitcModel, mitcSolved);
  const mitcFrame = mitcSolved.meshEvidence.elements
    .find((row) => row.elementId === mitc.elementResults[0].elementId).localFrame;
  const mitcLocalExpected = rotateStress(expected, mitcFrame);
  for (const point of mitc.elementResults[0].integrationPoints) {
    for (const surface of point.surfaces) {
      close(surface.combinedStress.sigmaX, mitcLocalExpected[0], 1e-8);
      close(surface.combinedStress.sigmaY, mitcLocalExpected[1], 1e-8);
      close(surface.combinedStress.tauXY, mitcLocalExpected[2], 1e-8);
    }
    close(point.transverseShearResultant.qX, 0, 1e-8);
    close(point.transverseShearResultant.qY, 0, 1e-8);
  }
  console.log(
    '✅ CST/DKT and MITC recover the same independent affine plane-stress membrane tensor, '
      + 'each rotated into its own local element frame, with zero MITC transverse shear.',
  );
}

// ---------------------------------------------------------------------------
// Shared fully-fixed pressure equilibrium. Formulation-specific consistent
// nodal shares may differ, but total force, first moment and support balance
// must be identical for the same planar patch and pressure traction.
// ---------------------------------------------------------------------------
{
  const pressure = 2;
  const legacySource = legacyPatchSource({ thickness: 2, poissonRatio: 0.3 });
  legacySource.constraints = fullyFixed(legacySource.nodes);
  legacySource.loadCases = [{
    loadCaseId: 'PRESSURE',
    nodalLoads: [],
    pressureLoads: legacySource.elements.map((element, index) => ({
      pressureLoadId: `P-${index + 1}`,
      elementId: element.elementId,
      pressure,
      sense: 'ALONG_ELEMENT_NORMAL',
      sourceReference: `P-${index + 1}-SRC`,
    })),
    sourceReference: 'PRESSURE-SRC',
  }];
  const legacy = calculateLocalShell(createCanonicalLocalShellModel(legacySource));
  assert.equal(legacy.qualification.state, QUALIFICATION_STATES.ACCEPTED);
  const legacyCase = legacy.loadCaseResults[0];

  const mitcModel = adoptionPatchModel({ thickness: 2, poissonRatio: 0.3 });
  const mitc = solveExperimentalMitcLoadCase(mitcModel, executionRequest({
    loadCaseId: 'PRESSURE',
    constraints: fullyFixed(mitcModel.nodes),
    pressureLoads: [{
      pressureLoadId: 'P-Q1',
      elementId: 'Q1',
      pressure,
      sense: 'ALONG_ELEMENT_NORMAL',
      sourceReference: 'P-Q1-SRC',
    }],
  }));

  const expectedForce = [0, 0, pressure * 100 * 50];
  const expectedMoment = [25 * expectedForce[2], -50 * expectedForce[2], 0];
  vectorClose(legacyCase.appliedLoadEvidence.appliedForce, expectedForce, 1e-9);
  vectorClose(mitc.appliedLoadEvidence.appliedForce, expectedForce, 1e-9);
  vectorClose(legacyCase.appliedLoadEvidence.appliedMomentAboutOrigin, expectedMoment, 1e-9);
  vectorClose(mitc.appliedLoadEvidence.appliedMomentAboutOrigin, expectedMoment, 1e-9);
  assert.equal(legacyCase.forceEquilibrium.qualification.accepted, true);
  assert.equal(legacyCase.momentEquilibrium.qualification.accepted, true);
  assert.equal(mitc.forceEquilibrium.qualification.accepted, true);
  assert.equal(mitc.momentEquilibrium.qualification.accepted, true);
  console.log('✅ CST/DKT and MITC preserve the same pressure force/first-moment and fully-fixed support equilibrium despite different element topology.');
}

console.log('\n✅ LAFEA.4 shared CST/DKT ↔ MITC physical qualification checks passed.');

function beamOracle(thickness) {
  const area = B * thickness;
  const inertia = B * thickness ** 3 / 12;
  const shearModulus = E / (2 * (1 + NU_BEAM));
  const bending = P * L ** 3 / (3 * E * inertia);
  const shear = P * L / (KAPPA * shearModulus * area);
  return { bending, shear, total: bending + shear };
}

function solveDktCantilever(thickness) {
  const source = legacyStripSource(thickness);
  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.state, QUALIFICATION_STATES.ACCEPTED);
  const tipIds = new Set([`N0-${SEGMENTS}`, `N1-${SEGMENTS}`]);
  const values = result.loadCaseResults[0].nodalDisplacements
    .filter((row) => tipIds.has(row.nodeId))
    .map((row) => row.uz);
  assert.equal(values.length, 2);
  return Math.abs(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function solveMitcCantilever(thickness) {
  const model = adoptionStripModel(thickness);
  const solved = solveExperimentalMitcLoadCase(model, executionRequest({
    loadCaseId: 'TIP',
    constraints: cantileverConstraints(model.nodes),
    nodalLoads: [
      nodalTipLoad(`N0-${SEGMENTS}`, P / 2),
      nodalTipLoad(`N1-${SEGMENTS}`, P / 2),
    ],
  }));
  const dofIndex = new Map(
    solved.meshEvidence.dofOrdering.map((identity, index) => [identity, index]),
  );
  return Math.abs((
    solved.displacement[dofIndex.get(`N0-${SEGMENTS}:UZ`)]
    + solved.displacement[dofIndex.get(`N1-${SEGMENTS}:UZ`)]
  ) / 2);
}

function legacyStripSource(thickness) {
  const nodes = stripNodes();
  const elements = [];
  for (let index = 0; index < SEGMENTS; index += 1) {
    const a = `N0-${index}`;
    const b = `N0-${index + 1}`;
    const c = `N1-${index + 1}`;
    const d = `N1-${index}`;
    elements.push(
      legacyElement(`E${index}-A`, [a, b, c], thickness),
      legacyElement(`E${index}-B`, [a, c, d], thickness),
    );
  }
  return legacySource({
    modelIdentity: `DKT-CANTILEVER-${thickness}`,
    poissonRatio: NU_BEAM,
    nodes,
    elements,
    constraints: cantileverConstraints(nodes),
    loadCases: [{
      loadCaseId: 'TIP',
      nodalLoads: [
        nodalTipLoad(`N0-${SEGMENTS}`, P / 2),
        nodalTipLoad(`N1-${SEGMENTS}`, P / 2),
      ],
      pressureLoads: [],
      sourceReference: 'TIP-SRC',
    }],
  });
}

function adoptionStripModel(thickness) {
  const nodes = stripNodes();
  const elements = [];
  for (let index = 0; index < SEGMENTS; index += 1) {
    elements.push({
      elementId: `Q${index}`,
      formulation: MITC4_FORMULATION,
      topology: MITC4_TOPOLOGY,
      nodeIds: [`N0-${index}`, `N0-${index + 1}`, `N1-${index + 1}`, `N1-${index}`],
      materialId: 'MAT',
      thickness,
      sourceReference: `Q${index}-SRC`,
    });
  }
  return adoptionModel({
    modelIdentity: `MITC-CANTILEVER-${thickness}`,
    poissonRatio: NU_BEAM,
    nodes,
    elements,
  });
}

function stripNodes() {
  const nodes = [];
  for (let row = 0; row < 2; row += 1) {
    for (let index = 0; index <= SEGMENTS; index += 1) {
      nodes.push(flatNode(`N${row}-${index}`, index * L / SEGMENTS, row * B));
    }
  }
  return nodes;
}

function cantileverConstraints(nodes) {
  return nodes
    .filter((node) => node.position[0] === 0)
    .flatMap((node) => ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof) =>
      constraint(node.nodeId, dof, 0)));
}

function nodalTipLoad(nodeId, fz) {
  return {
    loadId: `F-${nodeId}`,
    nodeId,
    fx: 0,
    fy: 0,
    fz,
    m1: 0,
    m2: 0,
    sourceReference: `F-${nodeId}-SRC`,
  };
}

function legacyPatchSource({ thickness, poissonRatio }) {
  const nodes = [
    flatNode('A', 0, 0), flatNode('B', 100, 0),
    flatNode('C', 100, 50), flatNode('D', 0, 50),
  ];
  return legacySource({
    modelIdentity: 'DKT-SHARED-PATCH',
    poissonRatio,
    nodes,
    elements: [
      legacyElement('E1', ['A', 'B', 'C'], thickness),
      legacyElement('E2', ['A', 'C', 'D'], thickness),
    ],
    constraints: [],
    loadCases: [{ loadCaseId: 'LC', nodalLoads: [], pressureLoads: [], sourceReference: 'LC-SRC' }],
  });
}

function adoptionPatchModel({ thickness, poissonRatio }) {
  const nodes = [
    flatNode('A', 0, 0), flatNode('B', 100, 0),
    flatNode('C', 100, 50), flatNode('D', 0, 50),
  ];
  return adoptionModel({
    modelIdentity: 'MITC-SHARED-PATCH',
    poissonRatio,
    nodes,
    elements: [{
      elementId: 'Q1',
      formulation: MITC4_FORMULATION,
      topology: MITC4_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'],
      materialId: 'MAT',
      thickness,
      sourceReference: 'Q1-SRC',
    }],
  });
}

function legacySource({ modelIdentity, poissonRatio, nodes, elements, constraints, loadCases }) {
  return {
    schema: MODEL_SCHEMA,
    modelIdentity,
    modelVersion: '1',
    sourceAncestry: ['benchmark/shared-cst-dkt-mitc/v1'],
    units: { ...CANONICAL_UNITS },
    formulation: FORMULATION,
    materials: [{
      materialId: 'MAT', elasticModulus: E, poissonRatio, sourceReference: 'MAT-SRC',
    }],
    nodes,
    elements,
    constraints,
    loadCases,
    resultRequests: {
      stressSurfaces: [...RESULT_REQUEST.stressSurfaces],
      dktIntegrationRule: RESULT_REQUEST.dktIntegrationRule,
      retainElementMatrices: true,
    },
    qualificationProfile: qualificationProfile(),
    limitations: [...BASE_LIMITATIONS],
  };
}

function adoptionModel({ modelIdentity, poissonRatio, nodes, elements }) {
  return createExperimentalMitcAdoptionModel({
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity,
    modelVersion: '1',
    sourceAncestry: ['benchmark/shared-cst-dkt-mitc/v1'],
    units: { ...CANONICAL_UNITS },
    materials: [{
      materialId: 'MAT', elasticModulus: E, poissonRatio, sourceReference: 'MAT-SRC',
    }],
    nodes,
    elements,
    qualificationProfile: qualificationProfile(),
    mitcQualification: {
      quadPlanarity: { absolute: 1e-10, relative: 1e-10 },
      rigidBodyEnergy: { absolute: 1e-9, relative: 1e-9 },
    },
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: false,
  });
}

function legacyElement(elementId, nodeIds, thickness) {
  return { elementId, nodeIds, materialId: 'MAT', thickness, sourceReference: `${elementId}-SRC` };
}

function executionRequest({ loadCaseId, constraints, nodalLoads = [], pressureLoads = [] }) {
  return {
    schema: MITC_ADOPTION_EXECUTION_SCHEMA,
    loadCaseId,
    constraints,
    nodalLoads,
    pressureLoads,
    sourceReference: `${loadCaseId}-SRC`,
  };
}

function prescribedAffineMembrane(nodes, epsilonX, epsilonY, gammaXY) {
  return nodes.flatMap((node) => {
    const [x, y] = node.position;
    const values = [
      epsilonX * x + 0.5 * gammaXY * y,
      epsilonY * y + 0.5 * gammaXY * x,
      0,
      0,
      0,
    ];
    return ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof, index) =>
      constraint(node.nodeId, dof, values[index]));
  });
}

function fullyFixed(nodes) {
  return nodes.flatMap((node) => ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof) =>
    constraint(node.nodeId, dof, 0)));
}

function constraint(nodeId, dof, value) {
  return {
    constraintId: `C-${nodeId}-${dof}`,
    nodeId,
    dof,
    value,
    sourceReference: `C-${nodeId}-${dof}-SRC`,
  };
}

function planeStress(modulus, poisson, epsilonX, epsilonY, gammaXY) {
  const factor = modulus / (1 - poisson ** 2);
  return [
    factor * (epsilonX + poisson * epsilonY),
    factor * (poisson * epsilonX + epsilonY),
    factor * (1 - poisson) / 2 * gammaXY,
  ];
}

function vectorClose(actual, expected, tolerance) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], tolerance));
}

function close(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
}

// Rotates a global (sigmaX, sigmaY, tauXY) tensor into an element's local
// frame. membraneStress/combinedStress are element-local quantities (see
// each element's meshEvidence.localFrame), so a single global closed-form
// oracle must be rotated per element before comparison, not compared as-is.
function rotateStress([sigmaX, sigmaY, tauXY], frame) {
  const c = frame.ex[0];
  const s = frame.ex[1];
  return [
    c ** 2 * sigmaX + s ** 2 * sigmaY + 2 * c * s * tauXY,
    s ** 2 * sigmaX + c ** 2 * sigmaY - 2 * c * s * tauXY,
    c * s * (sigmaY - sigmaX) + (c ** 2 - s ** 2) * tauXY,
  ];
}
