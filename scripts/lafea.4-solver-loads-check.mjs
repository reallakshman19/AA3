import assert from 'node:assert/strict';
import {
  calculateLocalShell,
  createCanonicalLocalShellModel,
  DOFS,
  FORMULA_IDS,
  QUALIFICATION_STATES,
} from '../src/core/local-shell/index.js';
import {
  assembleDenseGlobalSystem,
  assembleSparseGlobalSystem,
  DENSE_SHELL_STIFFNESS_DOF_LIMIT,
  SPARSE_SHELL_STIFFNESS_STORAGE,
} from '../src/core/local-shell/assembly.js';
import { buildShellElementEvidence } from '../src/core/local-shell/element.js';
import { ShellSingularSystemError } from '../src/core/local-shell/errors.js';
import { assembleLoadCase } from '../src/core/local-shell/loads.js';
import { recoverLoadCase } from '../src/core/local-shell/recovery.js';
import { solveLoadCase } from '../src/core/local-shell/solver.js';
import {
  baseSource,
  flatNode,
  prescribedPatchSource,
  triangleSource,
} from './lafea.4-fixtures.mjs';

const base = solve(triangleSource());
const row = base.loadCaseResults[0];
assert.equal(row.solverEvidence.method, 'DETERMINISTIC_DENSE_CHOLESKY');
assert.ok(row.solverEvidence.pivots.length > 0);
assert.ok(row.solverEvidence.minimumPivot > row.solverEvidence.pivotTolerance);
assert.ok(row.freeDofResidualQualification.accepted);
assert.ok(row.forceEquilibrium.qualification.accepted);
assert.ok(row.momentEquilibrium.qualification.accepted);
assert.ok(row.reactions.some((reaction) => reaction.kind === 'FORCE'));
assert.ok(row.reactions.some((reaction) => reaction.kind === 'MOMENT'));

const doubled = solve(triangleSource((source) => scaleLoads(source, 2)));
const reversed = solve(triangleSource((source) => scaleLoads(source, -1)));
compareDisplacements(doubled, base, 2);
compareDisplacements(reversed, base, -1);

const momentOnly = solve(triangleSource((source) => {
  const load = source.loadCases[0].nodalLoads[0];
  load.fx = 0; load.fy = 0; load.fz = 0; load.m1 = 500; load.m2 = -200;
}));
assert.ok(momentOnly.loadCaseResults[0].nodalDisplacements.some((node) => Math.abs(node.r1) + Math.abs(node.r2) > 0));
assert.ok(momentOnly.loadCaseResults[0].momentEquilibrium.qualification.accepted);

const multiple = triangleSource((source) => {
  source.loadCases.push({
    ...JSON.parse(JSON.stringify(source.loadCases[0])),
    loadCaseId: 'SECOND',
    sourceReference: 'SECOND-SRC',
    nodalLoads: source.loadCases[0].nodalLoads.map((load) => ({ ...load, loadId: `${load.loadId}-SECOND`, fx: -0.5 * load.fx, fy: -0.5 * load.fy, fz: -0.5 * load.fz, m1: -0.5 * load.m1, m2: -0.5 * load.m2 })),
  });
});
const multipleResult = solve(multiple);
assert.equal(multipleResult.loadCaseResults.length, 2);
const first = multipleResult.loadCaseResults.find((item) => item.loadCaseId === 'LC');
const second = multipleResult.loadCaseResults.find((item) => item.loadCaseId === 'SECOND');
compareRows(second, first, -0.5);

const fully = solve(prescribedPatchSource({ epsilonX: 0, epsilonY: 0, gammaXY: 0, curvature: [0, 0, 0] }));
assert.equal(fully.loadCaseResults[0].solverEvidence.method, 'FULLY_CONSTRAINED_NO_FREE_SOLVE');
assert.deepEqual(fully.loadCaseResults[0].solverEvidence.pivots, []);
assert.equal(fully.formulaTrace.includes(FORMULA_IDS.CHOLESKY), false);
assert.equal(fully.formulaTrace.includes(FORMULA_IDS.PCG), false);

const singularSource = triangleSource((source) => { source.constraints = []; });
const singular = calculateLocalShell(createCanonicalLocalShellModel(singularSource));
assert.equal(singular.qualification.state, QUALIFICATION_STATES.SINGULAR_SYSTEM);
assert.equal('loadCaseResults' in singular, false);
assert.equal('meshEvidence' in singular, false);

const duplicateConstraint = triangleSource((source) => source.constraints.push({ ...source.constraints[0], constraintId: 'DUP' }));
assert.throws(() => createCanonicalLocalShellModel(duplicateConstraint), /Duplicate prescribed DOF/);

verifyDenseSparseParity();
verifySparseAssemblySymmetryEvidence();
verifyAutomaticSparseProductionRoute();
verifySparseSingularRejection();

console.log('LAFEA.4 exact partitioning, dense/PCG parity, assembled symmetry evidence, automatic scalable sparse routing, loads, reactions and singular rejection passed.');

function verifyDenseSparseParity() {
  const model = createCanonicalLocalShellModel(triangleSource());
  const elements = buildShellElementEvidence(model);
  const denseAssembly = assembleDenseGlobalSystem(model, elements);
  const sparseAssembly = assembleSparseGlobalSystem(model, elements);
  const denseLoads = assembleLoadCase(model, model.loadCases[0], denseAssembly, elements);
  const sparseLoads = assembleLoadCase(model, model.loadCases[0], sparseAssembly, elements);
  assert.deepEqual(sparseLoads.forceVector, denseLoads.forceVector);
  const denseSolution = solveLoadCase(model, denseAssembly, denseLoads);
  const sparseSolution = solveLoadCase(model, sparseAssembly, sparseLoads);
  assert.equal(sparseSolution.solverEvidence.method, 'DETERMINISTIC_JACOBI_PCG');
  assert.equal(sparseSolution.solverEvidence.accepted, true);
  assert.ok(sparseSolution.solverEvidence.finalResidualInfinity <= sparseSolution.solverEvidence.convergenceTarget);
  compareVectors(sparseSolution.displacement, denseSolution.displacement);
  compareVectors(sparseSolution.reaction, denseSolution.reaction);
  const denseRecovered = recoverLoadCase(model, denseAssembly, elements, denseLoads, denseSolution);
  const sparseRecovered = recoverLoadCase(model, sparseAssembly, elements, sparseLoads, sparseSolution);
  compareRecovered(sparseRecovered, denseRecovered);
}

function verifySparseAssemblySymmetryEvidence() {
  const model = createCanonicalLocalShellModel(triangleSource());
  const ordering = model.nodes.flatMap((node) => DOFS.map((dof) => `${node.nodeId}:${dof}`));
  const delta = 1e-8;
  const matrix = Array.from({ length: ordering.length }, (_, rowIndex) =>
    Array.from({ length: ordering.length }, (_, columnIndex) => rowIndex === columnIndex ? 1 : 0));
  matrix[0][1] = 0.25 + delta;
  matrix[1][0] = 0.25;
  const elements = ['ASYM-1', 'ASYM-2'].map((elementId) => ({
    elementId,
    globalDofOrdering: ordering,
    globalStiffness: matrix.map((rowValues) => [...rowValues]),
  }));
  const dense = assembleDenseGlobalSystem(model, elements);
  const sparse = assembleSparseGlobalSystem(model, elements);
  assert.ok(dense.symmetry.actual > delta);
  close(sparse.symmetry.actual, dense.symmetry.actual, 1e-12);
  assert.equal(sparse.symmetry.accepted, dense.symmetry.accepted);
}

function verifyAutomaticSparseProductionRoute() {
  const source = sparseStripSource();
  assert.ok(source.nodes.length * 5 > DENSE_SHELL_STIFFNESS_DOF_LIMIT);
  const result = solve(source);
  const loadCase = result.loadCaseResults[0];
  assert.equal(result.meshEvidence.globalStiffness.storage, SPARSE_SHELL_STIFFNESS_STORAGE);
  assert.equal(result.meshEvidence.globalStiffness.size, source.nodes.length * 5);
  assert.ok(result.meshEvidence.globalStiffness.nonzeroCount < result.meshEvidence.globalStiffness.size ** 2);
  assert.equal(loadCase.solverEvidence.method, 'DETERMINISTIC_JACOBI_PCG');
  assert.equal(loadCase.solverEvidence.algorithmRevision, 'DETERMINISTIC_JACOBI_PCG_RELIABLE_RESIDUAL_V2');
  assert.equal(loadCase.solverEvidence.preconditioner, 'JACOBI');
  assert.equal(loadCase.solverEvidence.accepted, true);
  assert.equal(loadCase.freeDofIdentities.length, 1);
  assert.ok(loadCase.solverEvidence.finalResidualInfinity <= loadCase.solverEvidence.convergenceTarget);
  assert.ok(loadCase.freeDofResidualQualification.accepted);
  assert.ok(loadCase.forceEquilibrium.qualification.accepted);
  assert.ok(loadCase.momentEquilibrium.qualification.accepted);
  assert.ok(loadCase.energyQualification.accepted);
  assert.ok(result.formulaTrace.includes(FORMULA_IDS.PCG));
  assert.equal(result.formulaTrace.includes(FORMULA_IDS.CHOLESKY), false);
}

function verifySparseSingularRejection() {
  const model = createCanonicalLocalShellModel(triangleSource((source) => { source.constraints = []; }));
  const elements = buildShellElementEvidence(model);
  const assembly = assembleSparseGlobalSystem(model, elements);
  const loads = assembleLoadCase(model, model.loadCases[0], assembly, elements);
  assert.throws(
    () => solveLoadCase(model, assembly, loads),
    (error) => error instanceof ShellSingularSystemError,
  );
}

function sparseStripSource() {
  const columns = Math.floor(DENSE_SHELL_STIFFNESS_DOF_LIMIT / 10) + 2;
  const nodes = [];
  for (let index = 0; index < columns; index += 1) {
    nodes.push(flatNode(`L${index}`, index * 10, 0));
    nodes.push(flatNode(`U${index}`, index * 10, 10));
  }
  const elements = [];
  for (let index = 0; index < columns - 1; index += 1) {
    elements.push({
      elementId: `E${index}-A`,
      nodeIds: [`L${index}`, `L${index + 1}`, `U${index + 1}`],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: `E${index}-A-SRC`,
    });
    elements.push({
      elementId: `E${index}-B`,
      nodeIds: [`L${index}`, `U${index + 1}`, `U${index}`],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: `E${index}-B-SRC`,
    });
  }
  const tip = `L${columns - 1}`;
  const dofs = ['UX', 'UY', 'UZ', 'R1', 'R2'];
  const constraints = nodes.flatMap((node) => dofs
    .filter((dof) => node.nodeId !== tip || dof !== 'UX')
    .map((dof) => ({
      constraintId: `C-${node.nodeId}-${dof}`,
      nodeId: node.nodeId,
      dof,
      value: 0,
      sourceReference: `C-${node.nodeId}-${dof}-SRC`,
    })));
  return baseSource({
    modelIdentity: 'SHELL-SPARSE-AUTO-ROUTE',
    nodes,
    elements,
    constraints,
    loadCases: [{
      loadCaseId: 'SPARSE',
      nodalLoads: [{
        loadId: 'TIP-FX',
        nodeId: tip,
        fx: 1000,
        fy: 0,
        fz: 0,
        m1: 0,
        m2: 0,
        sourceReference: 'TIP-FX-SRC',
      }],
      pressureLoads: [],
      sourceReference: 'SPARSE-SRC',
    }],
  });
}

function solve(source) {
  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.state, QUALIFICATION_STATES.ACCEPTED, result.qualification.summary);
  return result;
}

function scaleLoads(source, factor) {
  for (const loadCase of source.loadCases) {
    for (const load of loadCase.nodalLoads) {
      for (const field of ['fx', 'fy', 'fz', 'm1', 'm2']) load[field] *= factor;
    }
  }
}

function compareDisplacements(actual, expected, factor) {
  compareRows(actual.loadCaseResults[0], expected.loadCaseResults[0], factor);
}

function compareRows(actual, expected, factor) {
  for (let index = 0; index < actual.nodalDisplacements.length; index += 1) {
    for (const field of ['ux', 'uy', 'uz', 'r1', 'r2']) close(actual.nodalDisplacements[index][field], factor * expected.nodalDisplacements[index][field]);
  }
}

function compareVectors(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], 1e-8));
}

function compareRecovered(actual, expected) {
  close(actual.membraneStrainEnergy, expected.membraneStrainEnergy, 1e-8);
  close(actual.bendingStrainEnergy, expected.bendingStrainEnergy, 1e-8);
  close(actual.totalStrainEnergy, expected.totalStrainEnergy, 1e-8);
  close(actual.globalStrainEnergy, expected.globalStrainEnergy, 1e-8);
  assert.equal(actual.elementResults.length, expected.elementResults.length);
  actual.elementResults.forEach((element, elementIndex) => {
    const baseline = expected.elementResults[elementIndex];
    element.integrationPoints.forEach((point, pointIndex) => {
      point.surfaces.forEach((surface, surfaceIndex) => {
        const baselineSurface = baseline.integrationPoints[pointIndex].surfaces[surfaceIndex];
        for (const field of ['sigmaX', 'sigmaY', 'tauXY']) {
          close(surface.combinedStress[field], baselineSurface.combinedStress[field], 1e-8);
        }
        close(surface.vonMises, baselineSurface.vonMises, 1e-8);
      });
    });
  });
}

function close(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}
