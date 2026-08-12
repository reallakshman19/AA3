/**
 * M047 Stage 2 nonlinear friction adapter for CAESAR ACCDB benchmarks.
 *
 * The qualified ACCDB adapter remains the sole authority for element assembly,
 * W/T1/P1 load construction, finite restraints and result recovery. This file
 * intercepts only its final equation solve, adds Coulomb tangential terms, and
 * returns the converged displacement/reaction state to the existing recovery
 * path. L15 is always formed algebraically from converged L7 and L13 states.
 */

import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import { buildDofMap, dofIndexOf } from '../linear-fea-solver/dof-map.js';
import { assembleGlobalSystem } from '../linear-fea-solver/assembly.js';
import { factorizeFreePartition } from '../linear-fea-solver/factorization.js';
import {
  matVec,
  solveCholesky,
  solveLdlt,
} from '../linear-fea-solver/linear-algebra.js';
import { applyDiagonalScalingToVector } from '../linear-fea-solver/scaling.js';
import { resolveSolverPolicies } from '../linear-fea-solver/solver-contract.js';
import { withSolverExecutionInterceptor } from '../linear-fea-solver/execution-interceptor.js';
import {
  migrateCaesarFrictionAuthorityV1ToV2,
} from './caesar-configuration-authority.js';
import { solveCaesarAccdbLinearBenchmark } from './caesar-accdb-linear-solve.js';
import { selectBm4lAccdbFrictionRows } from './caesar-accdb-friction-restraint-selection.js';
import {
  combineCaesarAlgebraicResultRows,
  compareDeterministicCaesarFrictionRuns,
  resolveCaesarFrictionCaseSettings,
  runDeterministicCaesarFrictionActiveSet,
} from './caesar-friction-active-set.js';

export const BM4L_FRICTION_PRIMITIVE_CASE_IDS = Object.freeze(['L13', 'L7', 'L1']);
export const BM4L_FRICTION_EXECUTION_ORDER = Object.freeze(['L13', 'L7', 'L15', 'L1']);
export const BM4L_FRICTION_MULTIPLIERS = Object.freeze({
  L1: 1,
  L2: 0,
  L3: 0,
  L4: 0,
  L5: 0,
  L6: 0,
  L7: 1,
  L13: 1,
});

const TRANSLATION_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
const ROTATION_DOFS = Object.freeze(['RX', 'RY', 'RZ']);
const DENSE_BACKEND = 'FEA_DENSE_DIRECT_CHOLESKY_LDLT_V1';

/**
 * Qualify BM4_L primitive friction states in owner-governed order.
 *
 * L1 remains fail-closed until the qualified ACCDB mechanics own WW+HP. The
 * current frozen mechanics deliberately implement only W/T1/P1, and this
 * adapter will not infer hydrotest weight from operating-fluid fields.
 */
export function solveCaesarAccdbFrictionBenchmark(benchmarkPackage, options = {}) {
  requireBenchmarkPackage(benchmarkPackage);
  if (benchmarkPackage.benchmarkId !== 'BM4_L') {
    throw new TypeError('The current M047 Stage 2 adapter is qualified only for BM4_L.');
  }
  const requested = options.caseIds ?? BM4L_FRICTION_EXECUTION_ORDER;
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new TypeError('At least one friction-stage case is required.');
  }
  const unknown = requested.filter((caseId) => !BM4L_FRICTION_EXECUTION_ORDER.includes(String(caseId)));
  if (unknown.length > 0) throw new TypeError(`Unsupported BM4_L friction cases: ${unknown.join(', ')}.`);

  const authority = migrateCaesarFrictionAuthorityV1ToV2(
    benchmarkPackage.profile.configurationAuthority,
    BM4L_FRICTION_MULTIPLIERS,
  );
  const profile = options.frictionSolverProfile;
  if (!profile || profile.schema !== 'caesar-friction-solver-profile/v1') {
    throw new TypeError('frictionSolverProfile/v1 is required and must be loaded before solving.');
  }
  const translationUnit = requireTranslationStiffnessUnit(benchmarkPackage);
  const cases = {};
  const evidence = {};
  let overallStatus = 'PASS';

  for (const caseId of BM4L_FRICTION_EXECUTION_ORDER.filter((entry) => requested.includes(entry))) {
    if (caseId === 'L15') {
      if (!cases.L7 || !cases.L13) {
        throw new TypeError('L15 requires converged L7 and L13 states in the same run.');
      }
      const combined = combineCaesarAlgebraicResultRows({
        caseId: 'L15',
        minuendCaseId: 'L7',
        subtrahendCaseId: 'L13',
        minuendRows: cases.L7.rows,
        subtrahendRows: cases.L13.rows,
      });
      const identity = semanticHash({ formula: combined.formula, rows: combined.rows });
      cases.L15 = deepFreeze({
        executionSemanticHash: identity,
        executionEvidenceHash: identity,
        stiffnessStateHash: null,
        rows: combined.rows,
      });
      evidence.L15 = deepFreeze({
        kind: 'DERIVED_ALGEBRAIC',
        formula: 'L15=L7-L13',
        combinationMethod: 'ALG',
        independentSolvePerformed: false,
        sourceCases: ['L7', 'L13'],
        configuration: resolveCaesarFrictionCaseSettings(authority, 'L15', {
          derived: true,
          translationUnit,
        }),
      });
      continue;
    }

    if (caseId === 'L1') {
      cases.L1 = deepFreeze({
        executionSemanticHash: null,
        executionEvidenceHash: null,
        stiffnessStateHash: null,
        rows: [],
      });
      evidence.L1 = deepFreeze({
        kind: 'PRIMITIVE_NONLINEAR',
        formula: 'WW+HP',
        status: 'BLOCKED',
        code: 'CAESAR_ACCDB_HYDROTEST_LOAD_BASIS_NOT_QUALIFIED',
        reason: 'The frozen ACCDB mechanics do not yet construct WW+HP; hydrotest weight is not inferred from operating-fluid fields.',
        configuration: resolveCaesarFrictionCaseSettings(authority, 'L1', { translationUnit }),
      });
      overallStatus = 'BLOCKED';
      continue;
    }

    const solved = solvePrimitiveFrictionCase({
      benchmarkPackage,
      authority,
      caseId,
      profile,
      translationUnit,
      repeatCount: options.repeatCount ?? profile.repeatCount ?? 2,
    });
    cases[caseId] = solved.caseResult;
    evidence[caseId] = solved.evidence;
    if (solved.evidence.status !== 'PASS') overallStatus = 'BLOCKED';
  }

  return deepFreeze({
    schema: 'lfea-accdb-friction-benchmark-actual/v1',
    benchmarkId: benchmarkPackage.benchmarkId,
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    status: overallStatus,
    executionOrder: BM4L_FRICTION_EXECUTION_ORDER.filter((entry) => requested.includes(entry)),
    cases,
    mechanics: {
      schema: 'lfea-accdb-friction-solve-evidence/v1',
      configurationAuthority: authority,
      solverProfile: profile,
      cases: evidence,
      limitations: [
        'The nonlinear adapter changes only tangential support stiffness/load terms; qualified element, W/T1/P1, restraint-normal and recovery mechanics are reused unchanged.',
        'Friction surfaces are selected only from positive-FRIC_COEF ACCDB type-Y rows; GUI/LIM/ANC rows remain ordinary qualified restraints and cannot create friction surfaces.',
        'Supports are bidirectional and remain active; no lift-off or one-directional contact logic is introduced.',
        'L15 is algebraic only and never enters the nonlinear iteration.',
        'L1 WW+HP is blocked until hydrotest weight/pressure construction is independently qualified in the ACCDB mechanics.',
      ],
    },
  });
}

function solvePrimitiveFrictionCase(input) {
  const settings = resolveCaesarFrictionCaseSettings(input.authority, input.caseId, {
    translationUnit: input.translationUnit,
  });
  const restraints = buildFrictionRestraints(input.benchmarkPackage, settings);
  if (restraints.length === 0) {
    throw new TypeError(`${input.caseId} has nonzero effective friction but no directional friction restraints.`);
  }
  const runCount = positiveInteger(input.repeatCount, 'repeatCount');
  const runs = [];
  let lastLegacy = null;
  for (let repeat = 1; repeat <= runCount; repeat += 1) {
    let nonlinearRun = null;
    let finalIteration = null;
    const compatibilityPackage = zeroFrictionCapturePackage(input.benchmarkPackage, input.caseId);
    const legacy = withSolverExecutionInterceptor((solverArgs) => {
      const solved = solveCapturedNonlinearSystem({
        ...input,
        solverArgs,
        restraints,
      });
      nonlinearRun = solved.run;
      finalIteration = solved.finalIteration;
      return solved.execution;
    }, () => solveCaesarAccdbLinearBenchmark(compatibilityPackage, [input.caseId]));
    if (nonlinearRun === null || finalIteration === null) {
      throw new Error(`${input.caseId} did not enter the nonlinear solver interceptor.`);
    }
    const legacyEvidence = legacy.mechanics.cases[input.caseId];
    const physicalEquilibrium = legacyEvidence.recoveredEquilibrium;
    const runStatus = nonlinearRun.status === 'CONVERGED' && physicalEquilibrium.status === 'PASS'
      ? 'PASS'
      : 'FAIL';
    runs.push(deepFreeze({
      repeat,
      status: runStatus,
      activeSet: nonlinearRun,
      physicalEquilibrium,
      finalEquationResidual: finalIteration.equilibrium,
    }));
    lastLegacy = legacy;
  }
  const repeatDeterminism = runs.length < 2
    ? deepFreeze({ status: 'NOT_RUN', identical: null })
    : compareDeterministicCaesarFrictionRuns(runs[0].activeSet, runs[1].activeSet);
  const status = runs.every((run) => run.status === 'PASS')
    && (repeatDeterminism.status === 'PASS' || repeatDeterminism.status === 'NOT_RUN')
    ? 'PASS'
    : 'FAIL';
  const legacyCase = lastLegacy.cases[input.caseId];
  const legacyEvidence = lastLegacy.mechanics.cases[input.caseId];
  return deepFreeze({
    caseResult: legacyCase,
    evidence: {
      kind: 'PRIMITIVE_NONLINEAR',
      formula: legacyEvidence.formula,
      status,
      configuration: settings,
      frictionRestraints: restraints,
      repeats: runs,
      repeatDeterminism,
      qualifiedMechanicsReuse: {
        baseSourceModelSemanticHash: lastLegacy.mechanics.sourceModelSemanticHash,
        analysisNodeCount: legacyEvidence.analysisNodeCount,
        analysisElementCount: legacyEvidence.analysisElementCount,
        sourceElementCount: legacyEvidence.sourceElementCount,
        bootstrapLinearFrictionOverrideUsedOnlyForCapture: true,
        bootstrapResultAcceptedAsQualification: false,
      },
    },
  });
}

function solveCapturedNonlinearSystem(input) {
  const { compilation, elementContributions, loadCase, solverProfile } = input.solverArgs;
  if (solverProfile.backend !== DENSE_BACKEND) {
    throw new TypeError(`M047 friction adapter currently requires ${DENSE_BACKEND}.`);
  }
  const model = compilation.model;
  const dofMap = buildDofMap(model);
  const baseAssembly = assembleGlobalSystem({
    model,
    dofMap,
    elementContributions,
    backend: solverProfile.backend,
  });
  if (!Array.isArray(baseAssembly.K)) {
    throw new TypeError('M047 friction adapter requires retained dense global stiffness.');
  }
  if (loadCase.primitives.some((primitive) => primitive.kind === 'PRESCRIBED_MOVEMENT')) {
    throw new TypeError('M047 friction adapter does not permit prescribed movements in BM4_L friction cases.');
  }
  const baseLoad = addExistingNodalLoads([...baseAssembly.elementLoad], dofMap, loadCase);
  const policies = resolveSolverPolicies(solverProfile);
  let previousDisplacement = new Array(dofMap.dofCount).fill(0);
  let previousNormalReactions = new Map(input.restraints.map((restraint) => [restraint.restraintId, 0]));
  let finalIteration = null;

  const run = runDeterministicCaesarFrictionActiveSet({
    profile: input.profile,
    maximumIterations: input.profile.maximumIterations ?? 100,
    boundaryForceN: input.profile.boundaryForceN ?? 0,
    restraints: input.restraints,
    solveIteration: ({ iteration, assemblyTerms }) => {
      const solved = solveOneFrictionLinearization({
        model,
        dofMap,
        baseAssembly,
        baseLoad,
        policies,
        backend: solverProfile.backend,
        assemblyTerms,
        restraints: input.restraints,
      });
      const normalReactions = normalReactionMap(input.restraints, model, dofMap, solved.displacementVector);
      const displacementUpdateNorm = normalizedUpdate(solved.displacementVector, previousDisplacement);
      const normalValues = input.restraints.map((restraint) => normalReactions.get(restraint.restraintId));
      const previousNormalValues = input.restraints.map((restraint) => previousNormalReactions.get(restraint.restraintId));
      const reactionUpdateNorm = normalizedUpdate(normalValues, previousNormalValues);
      const relativeTangentialDisplacements = Object.fromEntries(input.restraints.map((restraint) => [
        restraint.restraintId,
        translationalDisplacement(dofMap, solved.displacementVector, restraint.nodeId),
      ]));
      previousDisplacement = [...solved.displacementVector];
      previousNormalReactions = normalReactions;
      finalIteration = solved;
      return {
        relativeTangentialDisplacements,
        normalReactions: Object.fromEntries(normalReactions),
        displacementUpdateNorm,
        reactionUpdateNorm,
        equilibriumForceResidualN: solved.equilibrium.forceN,
        equilibriumMomentResidualNm: solved.equilibrium.momentNm,
        solverEvidence: {
          iteration,
          factorizationKind: solved.factorization.kind,
          conditionEstimate: solved.factorization.conditionEstimate,
          freeDofCount: baseAssembly.freeIndices.length,
        },
      };
    },
  });
  if (finalIteration === null) throw new Error('Friction active set performed no linearized solve.');
  const finalStates = run.finalStates;
  const reactions = totalSupportReactionEntries({
    model,
    dofMap,
    displacement: finalIteration.displacementVector,
    frictionStates: finalStates,
    restraints: input.restraints,
  });
  const displacement = dofMap.entries.map((entry, index) => ({
    nodeId: entry.nodeId,
    dof: entry.dof,
    value: clean(finalIteration.displacementVector[index]),
  }));
  const identity = semanticHash({
    caseId: input.caseId,
    displacement,
    reactions,
    activeSet: run.ledger.map((row) => row.states.map((state) => ({
      restraintId: state.restraintId,
      state: state.state,
      appliedFrictionForce: state.appliedFrictionForce,
    }))),
  });
  const execution = deepFreeze({
    semanticHash: identity,
    evidenceHash: semanticHash({ identity, runStatus: run.status }),
    stiffnessStateHash: compilation.stiffnessStateHash,
    status: run.status === 'CONVERGED' ? 'QUALIFIED' : 'BLOCKED',
    displacement,
    reactions,
    diagnostics: {
      nonlinearFriction: {
        status: run.status,
        iterations: run.iterations,
        finalEquationResidual: finalIteration.equilibrium,
      },
    },
  });
  return { run, finalIteration, execution };
}

function solveOneFrictionLinearization(input) {
  const K = [...input.baseAssembly.K];
  const F = [...input.baseLoad];
  for (const term of input.assemblyTerms) {
    const restraint = input.restraints.find((entry) => entry.restraintId === term.restraintId);
    if (!restraint) throw new TypeError(`Unknown friction restraint ${term.restraintId}.`);
    const translationalIndices = TRANSLATION_DOFS.map((dof) => dofIndexOf(input.dofMap, restraint.nodeId, dof));
    if (term.mode === 'INSERT_TANGENTIAL_STIFFNESS') {
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          K[translationalIndices[row] * input.baseAssembly.n + translationalIndices[column]] +=
            term.tangentialStiffness3x3NPerM[row * 3 + column];
        }
      }
    } else if (term.mode === 'CAPPED_OPPOSING_LOAD') {
      for (let index = 0; index < 3; index += 1) {
        F[translationalIndices[index]] += term.cappedLoadVectorN[index];
      }
    } else {
      throw new TypeError(`Unsupported friction assembly mode ${term.mode}.`);
    }
  }
  const augmentedAssembly = {
    ...input.baseAssembly,
    K,
  };
  const factorization = factorizeFreePartition({
    model: input.model,
    dofMap: input.dofMap,
    assembly: augmentedAssembly,
    policies: input.policies,
    backend: input.backend,
  });
  const Ffree = input.baseAssembly.freeIndices.map((index) => F[index]);
  const scaledRhs = applyDiagonalScalingToVector(Ffree, factorization.scaling.factors);
  const scaledSolution = factorization.kind === 'CHOLESKY'
    ? solveCholesky(factorization.L, factorization.m, scaledRhs)
    : solveLdlt(factorization.L, factorization.D, factorization.m, scaledRhs);
  const Uf = applyDiagonalScalingToVector(scaledSolution, factorization.scaling.factors);
  const U = new Array(input.baseAssembly.n).fill(0);
  input.baseAssembly.freeIndices.forEach((globalIndex, row) => { U[globalIndex] = Uf[row]; });
  const residual = matVec(K, input.baseAssembly.n, U).map((value, index) => value - F[index]);
  const freeResiduals = input.baseAssembly.freeIndices.map((globalIndex) => ({
    dof: input.dofMap.entries[globalIndex].dof,
    value: residual[globalIndex],
  }));
  return {
    displacementVector: U,
    factorization,
    equilibrium: {
      forceN: maximum(freeResiduals.filter((entry) => TRANSLATION_DOFS.includes(entry.dof))
        .map((entry) => Math.abs(entry.value))),
      momentNm: maximum(freeResiduals.filter((entry) => ROTATION_DOFS.includes(entry.dof))
        .map((entry) => Math.abs(entry.value))),
    },
  };
}

function buildFrictionRestraints(benchmarkPackage, settings) {
  const rows = benchmarkPackage.model.tables.INPUT_RESTRAINTS.rows;
  const candidates = selectBm4lAccdbFrictionRows(rows, settings.modelCoefficient.value);
  return candidates.map((candidate) => deepFreeze({
    restraintId: `ACCDB-FRICTION-${candidate.nodeId}-${candidate.sourceRowIndex}`,
    nodeId: candidate.nodeId,
    sourceRowIndex: candidate.sourceRowIndex,
    sourceRestraintTypeId: candidate.sourceRestraintTypeId,
    sourceRestraintType: candidate.sourceRestraintType,
    sourceFrictionCoefficient: candidate.sourceFrictionCoefficient,
    governedModelCoefficient: candidate.governedModelCoefficient,
    normalDirection: candidate.normalDirection,
    normalDof: dominantTranslationDof(candidate.normalDirection),
    effectiveCoefficient: settings.effectiveCoefficient,
    frictionStiffnessNPerM: settings.frictionStiffness.siValueNPerM,
  }));
}

function normalReactionMap(restraints, model, dofMap, displacement) {
  const result = new Map();
  for (const restraint of restraints) {
    const constraint = model.constraints.find((entry) =>
      entry.nodeId === restraint.nodeId
      && entry.dof === restraint.normalDof
      && entry.behavior === 'LINEAR_SPRING');
    if (!constraint) {
      throw new TypeError(`${restraint.restraintId} cannot bind its qualified normal restraint spring.`);
    }
    const component = -constraint.stiffness * displacement[
      dofIndexOf(dofMap, restraint.nodeId, restraint.normalDof)
    ];
    const axis = TRANSLATION_DOFS.indexOf(restraint.normalDof);
    result.set(restraint.restraintId, component * Math.sign(restraint.normalDirection[axis] || 1));
  }
  return result;
}

function totalSupportReactionEntries(input) {
  const byDof = new Map();
  for (const constraint of input.model.constraints.filter((entry) => entry.behavior === 'LINEAR_SPRING')) {
    const key = `${constraint.nodeId}:${constraint.dof}`;
    const value = -constraint.stiffness * input.displacement[
      dofIndexOf(input.dofMap, constraint.nodeId, constraint.dof)
    ];
    byDof.set(key, (byDof.get(key) ?? 0) + value);
  }
  for (const state of input.frictionStates) {
    const restraint = input.restraints.find((entry) => entry.restraintId === state.restraintId);
    TRANSLATION_DOFS.forEach((dof, index) => {
      const key = `${restraint.nodeId}:${dof}`;
      byDof.set(key, (byDof.get(key) ?? 0) + state.appliedFrictionForce[index]);
    });
  }
  return [...byDof.entries()]
    .map(([key, value]) => {
      const separator = key.lastIndexOf(':');
      return { nodeId: key.slice(0, separator), dof: key.slice(separator + 1), value: clean(value) };
    })
    .sort((left, right) => compareText(`${left.nodeId}:${left.dof}`, `${right.nodeId}:${right.dof}`));
}

function zeroFrictionCapturePackage(benchmarkPackage, caseId) {
  const authority = benchmarkPackage.profile.configurationAuthority;
  if (authority.schema !== 'caesar-configuration-authority/v1') {
    throw new TypeError('The capture bootstrap expects the frozen BM4_L v1 authority profile.');
  }
  const originalCases = authority.layers.loadCase.cases;
  const cases = Object.fromEntries(Object.entries(originalCases).map(([id, settings]) => [
    id,
    id === caseId ? { ...settings, COEFFICIENT_OF_FRICTION_MU: 0 } : { ...settings },
  ]));
  return {
    ...benchmarkPackage,
    profile: {
      ...benchmarkPackage.profile,
      configurationAuthority: {
        ...authority,
        layers: {
          ...authority.layers,
          loadCase: { ...authority.layers.loadCase, cases },
        },
      },
    },
  };
}

function addExistingNodalLoads(load, dofMap, loadCase) {
  for (const primitive of loadCase.primitives) {
    if (primitive.kind !== 'NODAL_FORCE_MOMENT') continue;
    if (primitive.basis.kind !== 'GLOBAL') {
      throw new TypeError('M047 captured nodal loads must use the global basis.');
    }
    const values = [
      primitive.force.fx, primitive.force.fy, primitive.force.fz,
      primitive.moment.mx, primitive.moment.my, primitive.moment.mz,
    ];
    [...TRANSLATION_DOFS, ...ROTATION_DOFS].forEach((dof, index) => {
      load[dofIndexOf(dofMap, primitive.nodeId, dof)] += values[index];
    });
  }
  return load;
}

function translationalDisplacement(dofMap, displacement, nodeId) {
  return TRANSLATION_DOFS.map((dof) => displacement[dofIndexOf(dofMap, nodeId, dof)]);
}

function normalizedUpdate(current, previous) {
  const delta = Math.hypot(...current.map((value, index) => value - previous[index]));
  const scale = Math.max(1, Math.hypot(...current));
  return delta / scale;
}

function requireTranslationStiffnessUnit(benchmarkPackage) {
  const rows = benchmarkPackage.model.tables.INPUT_UNITS.rows;
  if (rows.length !== 1 || rows[0].TRANS !== 'N./cm.') {
    throw new TypeError('BM4_L friction stiffness conversion requires ACCDB INPUT_UNITS TRANS=N./cm.');
  }
  return rows[0].TRANS;
}

function dominantTranslationDof(direction) {
  const values = direction.map(Math.abs);
  return TRANSLATION_DOFS[values.indexOf(Math.max(...values))];
}
function unit3(value, field) {
  const magnitude = Math.hypot(...value);
  if (!(magnitude > 0) || value.some((entry) => !Number.isFinite(entry))) {
    throw new TypeError(`${field} must contain a finite nonzero direction.`);
  }
  return value.map((entry) => entry / magnitude);
}
function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new TypeError(`${field} must be a positive integer.`);
  return number;
}
function maximum(values) { return values.length === 0 ? 0 : Math.max(...values); }
function clean(value) { return Object.is(value, -0) || Math.abs(value) < 1e-12 ? 0 : value; }
function compareText(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }
function requireBenchmarkPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
}
