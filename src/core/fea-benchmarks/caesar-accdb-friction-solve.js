/**
 * Nonlinear CAESAR friction solver for pinned ACCDB benchmarks.
 *
 * CAESAR II documents a stiffness method for friction: a tangential spring of
 * stiffness `k_f` resists relative motion at a support until the resultant
 * tangential force reaches the Coulomb capacity `mu * |N|`. Once that capacity
 * is reached the spring contribution is removed and replaced, for the next
 * iteration, by a constant force of magnitude `mu * |N|` opposing the direction
 * of sliding. The active set of stick/slide supports is iterated until neither
 * the states nor the solution move.
 *
 * This module owns only that nonlinear layer. Every element, load, restraint and
 * recovery decision is taken from the already-qualified linear ACCDB assembly
 * through `prepareCaesarAccdbCaseState` / `executeCaesarAccdbCaseState`, so a
 * friction run cannot silently re-tune bend, tee, thermal, pressure, reducer,
 * rigid or recovery mechanics.
 *
 * Derived combination cases are never iterated. They are reconstructed
 * algebraically from two independently converged primitive states, because a
 * nonlinear state has no valid linear decomposition.
 */
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  CAESAR_ACCDB_CASE_GATES,
  executeCaesarAccdbCaseState,
  prepareCaesarAccdbCaseState,
} from './caesar-accdb-linear-solve.js';
import { classifyCaesarCaseFormula, resolveCaesarFrictionAuthority } from './caesar-friction-authority.js';

const TRANSLATION_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const CAESAR_ANCHOR_RESTRAINT_TYPE = 1;
const AXIS_ALIGNMENT_TOLERANCE = 1e-9;
const FRICTION_COLUMN_PATTERN =
  /^(?:MU|FRICTION|FRIC_COEF|FRICT(?:ION)?_?(?:COEF|COEFF|COEFFICIENT)?|COEF(?:F)?_?FRICT(?:ION)?)$/u;
/** ACCDB friction coefficients are stored as float32, so 0.3 reads back as 0.30000001192092896. */
const FLOAT32_COEFFICIENT_TOLERANCE = 1e-6;

/**
 * Versioned nonlinear friction solver profile.
 *
 * CAESAR does not publish the initialization, relaxation, load-stepping or
 * convergence limits of its friction iteration, so these are declared here as
 * this project's own numerics. They are visible, versioned and must never be
 * retuned to change a benchmark failure count.
 */
export const CAESAR_FRICTION_SOLVER_PROFILE = deepFreeze({
  schema: 'caesar-accdb-friction-solver-profile/v1',
  profileId: 'CAESAR-ACCDB-FRICTION-SOLVER-R1',
  frictionLaw: 'CAESAR_TANGENTIAL_SPRING_WITH_COULOMB_CAP_V1',
  /**
   * Solution strategy for that law.
   *
   * CAESAR describes deleting the tangential spring at breakaway and applying a
   * constant force. That form leaves the sliding DOF unsupported inside the
   * iteration, and on a run with many coupled sliding supports the direction and
   * capacity updates limit-cycle instead of contracting.
   *
   * This solver keeps the tangential spring assembled and adds the offset load
   * `k_f * u_slip` that makes the net tangential force equal the capped Coulomb
   * force. At the fixed point the two forms are indistinguishable - a spring force
   * and an applied force of the same magnitude and direction are the same nodal
   * force - so the governed converged state is unchanged while the iteration
   * matrix stays positive definite.
   */
  solutionStrategy: 'RETAINED_TANGENTIAL_SPRING_WITH_RETURN_MAPPED_SLIP_OFFSET_V1',
  fixedPointEquivalenceRule: 'NET_TANGENTIAL_FORCE_EQUALS_CAPPED_COULOMB_FORCE_AT_CONVERGENCE_V1',
  initialization: 'ALL_FRICTION_SUPPORTS_STICK_ZERO_SLIP_V1',
  relaxation: 'NONE_RETURN_MAPPING_IS_SELF_LIMITING_V1',
  /**
   * Convergence acceleration.
   *
   * The return-mapped slip iteration is monotone on BM4_L but barely contracting:
   * with 20 restraints sliding, the measured reduction is under one percent per
   * iteration, because the friction stiffness is four orders above the structural
   * tangential stiffness and any lag in the slip becomes a large force error.
   *
   * Aitken/Irons-Tuck extrapolation on the concatenated slip vector fixes the rate
   * without touching the law: it only chooses the next trial slip. Every accepted
   * iterate is still checked by the same physics gates, and the residual it drives
   * to zero is the same one, so the converged state is unchanged.
   */
  acceleration: 'COMPONENTWISE_SECANT_ON_SLIP_VECTOR_V1',
  accelerationMinimumIterations: 3,
  accelerationFactorLimit: 200,
  accelerationStepRatioLimit: 500,
  slipUpdateLimitM: 1e-10,
  loadStepping: 'NONE_SINGLE_STEP_V1',
  stateScope: 'PER_FRICTION_RESTRAINT_TANGENTIAL_RESULTANT_V1',
  slipDirectionRule: 'UNIT_RELATIVE_TANGENTIAL_DISPLACEMENT_V1',
  normalDirectionRule: 'SIGNED_RESTRAINT_DIRECTION_COSINE_PROJECTION_V1',
  stateBoundaryRule: 'SLIDE_IMMEDIATELY_ABOVE_CAP_RETURN_TO_STICK_ONLY_BELOW_CAP_TIMES_ONE_MINUS_H_V1',
  /**
   * Hysteresis band on the stick/slide label.
   *
   * Return mapping leaves a support that slid sitting exactly on the Coulomb
   * surface, where an unbanded test flips its label on numerical noise. The band is
   * applied only to the return to stick: a trial force above the cap always yields,
   * so no labelled state can hold an inadmissible force, while a support already on
   * the surface stops chattering. Without it the active set never stabilises and the
   * accelerator restarts every few iterations.
   */
  stateHysteresisRelative: 0.001,
  capacityRule: 'BIDIRECTIONAL_SUPPORT_USES_NORMAL_REACTION_MAGNITUDE_V1',
  liftOffRule: 'NOT_IMPLEMENTED_SUPPORTS_REMAIN_BIDIRECTIONAL_V1',
  maximumIterations: 400,
  stateBoundaryAbsoluteN: 1e-6,
  stateBoundaryRelative: 1e-9,
  /**
   * Iteration-update limits, set against the benchmark's own governed tolerances so
   * they are engineering statements rather than arbitrary tightness:
   *
   *   reaction update 1e-2 N   = 0.2 % of the 5 N nodal equilibrium tolerance, and
   *                              far below CAESAR's printed force resolution;
   *   slip update     1e-10 m  = 1e-2 N of friction force at k_f = 1e8 N/m, so it
   *                              is the same statement expressed as a movement;
   *   displacement    1e-10 m  = 1/1000 of the smallest displacement the comparison
   *                              treats as nonzero (1e-7 m).
   *
   * The achieved residuals are recorded per iteration, so the margin is visible.
   */
  displacementUpdateLimitM: 1e-10,
  reactionUpdateLimitN: 1e-2,
  capViolationAbsoluteN: 1e-6,
  capViolationRelative: 1e-9,
  stickResidualLimitN: 1e-6,
  slideResidualAbsoluteN: 1e-6,
  slideResidualRelative: 1e-9,
  oppositionCosineLimit: -0.999999,
  zeroTangentialMotionFloorM: 1e-15,
  determinismRepeatRuns: 2,
  frictionCoefficientSourceRule: 'PER_RESTRAINT_ACCDB_MODEL_INPUT_COEFFICIENT_WITH_BLANK_RESOLVING_TO_LOWER_LAYERS_V1',
  source: 'HEXAGON_CAESAR_II_14_MODELING_FRICTION_EFFECTS_AND_FRICTION_STIFFNESS_PLUS_M047_STAGE2_DECLARED_NUMERICS',
});

export const CAESAR_FRICTION_ACTUAL_SCHEMA = 'lfea-accdb-benchmark-actual/v1';
export const CAESAR_FRICTION_EVIDENCE_SCHEMA = 'lfea-accdb-friction-solve-evidence/v1';

/**
 * Solve selected friction cases against a pinned ACCDB package.
 *
 * Primitive friction cases are iterated; derived combination cases are rebuilt
 * from their converged primitives. Cases are solved in dependency order so a
 * combination always sees stored constituent states.
 *
 * @param {Record<string, unknown>} benchmarkPackage Canonical ACCDB package.
 * @param {Array<string>} selectedCaseIds Case IDs to solve.
 * @param {object} [options] Run options.
 * @param {number} [options.frictionStiffnessScale] Diagnostic stiffness scale; nominal is 1.
 * @param {Record<string, unknown>} [options.profile] Friction solver profile override.
 * @returns {Record<string, unknown>} Frozen actual-result package with friction evidence.
 */
export function solveCaesarAccdbFrictionBenchmark(benchmarkPackage, selectedCaseIds, options = {}) {
  requireBenchmarkPackage(benchmarkPackage);
  const profile = normalizeFrictionProfile(options.profile ?? CAESAR_FRICTION_SOLVER_PROFILE);
  const stiffnessScale = normalizeStiffnessScale(options.frictionStiffnessScale ?? 1);
  const solveProfile = benchmarkPackage.profile.linearSolve;
  if (solveProfile === null) throw new TypeError('The ACCDB profile does not declare linearSolve authorities.');
  if (!Array.isArray(selectedCaseIds) || selectedCaseIds.length === 0) {
    throw new TypeError('At least one ACCDB friction-solve case ID is required.');
  }
  const ordered = orderCasesByDependency(benchmarkPackage, selectedCaseIds);
  const cases = {};
  const caseEvidence = {};
  const states = new Map();
  for (const caseRecord of ordered) {
    const frictionAuthority = resolveCaesarFrictionAuthority({
      authority: benchmarkPackage.profile.configurationAuthority,
      cases: benchmarkPackage.cases,
      caseId: caseRecord.caseId,
      inputUnitRows: benchmarkPackage.model.tables.INPUT_UNITS.rows,
    });
    if (!frictionAuthority.frictionActive) {
      throw new TypeError(
        `${caseRecord.caseId} resolves effective friction ${frictionAuthority.effectiveCoefficient}; `
        + 'the friction solver accepts only governed friction-active cases.',
      );
    }
    const solved = frictionAuthority.kind === 'DERIVED_COMBINATION'
      ? combineDerivedCase({ benchmarkPackage, caseRecord, frictionAuthority, states, profile })
      : solvePrimitiveCase({
        benchmarkPackage, caseRecord, solveProfile, frictionAuthority, profile, stiffnessScale,
      });
    states.set(caseRecord.caseId, solved);
    cases[caseRecord.caseId] = {
      executionSemanticHash: solved.executionSemanticHash,
      executionEvidenceHash: solved.executionEvidenceHash,
      stiffnessStateHash: solved.stiffnessStateHash,
      rows: solved.rows,
    };
    caseEvidence[caseRecord.caseId] = solved.evidence;
  }
  return deepFreeze({
    schema: CAESAR_FRICTION_ACTUAL_SCHEMA,
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    cases,
    mechanics: {
      schema: CAESAR_FRICTION_EVIDENCE_SCHEMA,
      sourceModelSemanticHash: benchmarkPackage.model.semanticHash,
      linearSolveProfile: solveProfile,
      frictionSolverProfile: profile,
      frictionStiffnessScale: stiffnessScale,
      nominalRun: stiffnessScale === 1,
      cases: caseEvidence,
      limitations: [
        'Friction is applied only to non-anchor translational restraints; anchors have no free tangential direction and are excluded explicitly.',
        'Supports remain bidirectional. Lift-off, one-directional contact and gaps are not implemented and no case may rely on them.',
        'The Coulomb capacity of a bidirectional support uses the magnitude of the resolved normal reaction, which itself carries the friction coupling of the same iteration.',
        'Initialization, relaxation, load stepping and convergence limits are this project declared numerics, not published CAESAR authority.',
        'Derived combination cases carry no nonlinear iteration; they are algebraic differences of two independently converged primitive states.',
        'Stress, EXP stress, HYD stress and code checks remain out of scope for this stage.',
      ],
    },
  });
}

/**
 * Run a declared diagnostic friction-stiffness sensitivity study.
 *
 * The nominal 1x run remains the governed result. The study exists to expose
 * state flips and reaction sensitivity, never to select a stiffness.
 *
 * @param {Record<string, unknown>} benchmarkPackage Canonical ACCDB package.
 * @param {Array<string>} caseIds Primitive friction cases to study.
 * @param {Array<number>} [scales] Stiffness scales; must contain the nominal 1.
 * @returns {Record<string, unknown>} Frozen sensitivity record.
 */
export function runCaesarAccdbFrictionStiffnessSensitivity(benchmarkPackage, caseIds, scales = [0.5, 1, 2]) {
  const ordered = [...new Set(scales.map(Number))].sort((left, right) => left - right);
  if (!ordered.includes(1)) throw new TypeError('A friction-stiffness sensitivity study must include the nominal 1x run.');
  const runs = ordered.map((scale) => {
    const actual = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, caseIds, { frictionStiffnessScale: scale });
    return {
      scale,
      nominal: scale === 1,
      cases: Object.fromEntries(caseIds.map((caseId) => {
        const evidence = actual.mechanics.cases[caseId];
        return [caseId, {
          iterationCount: evidence.iterationCount,
          convergedStates: evidence.convergedStates,
          frictionStiffnessSiValue: evidence.frictionStiffness.appliedSiValue,
          restraintReactions: restraintReactionVector(actual.cases[caseId].rows),
          rowsSemanticHash: semanticHash(actual.cases[caseId].rows),
        }];
      })),
    };
  });
  const nominal = runs.find((run) => run.nominal);
  const comparisons = runs.filter((run) => !run.nominal).map((run) => ({
    scale: run.scale,
    cases: Object.fromEntries(caseIds.map((caseId) => {
      const base = nominal.cases[caseId];
      const trial = run.cases[caseId];
      const flips = Object.keys(base.convergedStates)
        .filter((nodeId) => base.convergedStates[nodeId] !== trial.convergedStates[nodeId])
        .sort(compareText);
      return [caseId, {
        stateFlipCount: flips.length,
        stateFlipNodeIds: flips,
        iterationCountDelta: trial.iterationCount - base.iterationCount,
        maximumReactionChangeN: maximumVectorDifference(base.restraintReactions, trial.restraintReactions),
      }];
    })),
  }));
  return deepFreeze({
    schema: 'lfea-accdb-friction-stiffness-sensitivity/v1',
    rule: 'DIAGNOSTIC_ONLY_NOMINAL_1X_REMAINS_THE_GOVERNED_RESULT',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    caseIds: [...caseIds],
    runs,
    comparisons,
  });
}

/**
 * Compare repeated nominal friction runs for determinism.
 *
 * @param {Record<string, unknown>} benchmarkPackage Canonical ACCDB package.
 * @param {Array<string>} caseIds Cases to repeat.
 * @param {number} [runCount] Number of repeats; at least two.
 * @returns {Record<string, unknown>} Frozen determinism record.
 */
export function verifyCaesarAccdbFrictionDeterminism(benchmarkPackage, caseIds, runCount = 2) {
  const repeats = Math.max(2, Number(runCount));
  const hashes = [];
  for (let run = 0; run < repeats; run += 1) {
    const actual = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, caseIds);
    hashes.push(Object.fromEntries(caseIds.map((caseId) => [caseId, semanticHash(actual.cases[caseId].rows)])));
  }
  const mismatches = caseIds.filter((caseId) =>
    new Set(hashes.map((entry) => entry[caseId])).size !== 1);
  return deepFreeze({
    schema: 'lfea-accdb-friction-determinism/v1',
    runCount: repeats,
    caseIds: [...caseIds],
    runHashes: hashes,
    status: mismatches.length === 0 ? 'PASS' : 'FAIL',
    mismatchedCaseIds: mismatches,
  });
}

/**
 * Build the paired-delta root-cause topology for friction isolation.
 *
 * Each pair subtracts a non-friction control from its friction twin on both the
 * CAESAR reference rows and the solved rows, so a friction-law error cannot be
 * hidden inside an already-qualified W, T1 or P1 mechanic.
 *
 * @param {object} input Delta input.
 * @param {Record<string, Array<Record<string, unknown>>>} input.referenceRowsByCase Reference rows.
 * @param {Record<string, Array<Record<string, unknown>>>} input.actualRowsByCase Solved rows.
 * @param {Array<Array<string>>} input.pairs `[frictionCaseId, controlCaseId]` pairs.
 * @returns {Record<string, unknown>} Frozen paired-delta record.
 */
export function buildFrictionPairedDeltaRca(input) {
  const pairs = input.pairs.map(([frictionCaseId, controlCaseId]) => {
    const referenceDelta = subtractRows(
      requireRows(input.referenceRowsByCase, frictionCaseId, 'reference'),
      requireRows(input.referenceRowsByCase, controlCaseId, 'reference'),
      `${frictionCaseId}-${controlCaseId}`,
    );
    const actualDelta = subtractRows(
      requireRows(input.actualRowsByCase, frictionCaseId, 'actual'),
      requireRows(input.actualRowsByCase, controlCaseId, 'actual'),
      `${frictionCaseId}-${controlCaseId}`,
    );
    const actualByIdentity = new Map(actualDelta.map((row) => [rowIdentity(row), row]));
    const rows = referenceDelta
      .filter((row) => actualByIdentity.has(rowIdentity(row)))
      .map((row) => {
        const actual = actualByIdentity.get(rowIdentity(row));
        const absoluteError = actual.value - row.value;
        return {
          entityKind: row.entityKind,
          entityId: row.entityId,
          quantity: row.quantity,
          component: row.component,
          unit: row.unit,
          referenceDelta: row.value,
          actualDelta: actual.value,
          absoluteError,
          relativeError: row.value === 0 ? null : Math.abs(absoluteError / row.value),
        };
      });
    const missing = referenceDelta
      .filter((row) => !actualByIdentity.has(rowIdentity(row)))
      .map((row) => rowIdentity(row))
      .sort(compareText);
    return {
      frictionCaseId,
      controlCaseId,
      isolatedMechanic: `${frictionCaseId}-${controlCaseId}`,
      comparedRowCount: rows.length,
      unmatchedReferenceIdentities: missing,
      maximumAbsoluteError: maximum(rows.map((row) => Math.abs(row.absoluteError))),
      rows,
    };
  });
  return deepFreeze({
    schema: 'lfea-accdb-friction-paired-delta-rca/v1',
    rule: 'FRICTION_IS_ISOLATED_BY_REAL_DATA_PAIRED_DIFFERENCES_BEFORE_ANY_MECHANIC_IS_CHANGED',
    pairs,
  });
}

function solvePrimitiveCase(input) {
  const { benchmarkPackage, caseRecord, solveProfile, frictionAuthority, profile, stiffnessScale } = input;
  const plan = buildFrictionRestraintPlan({ benchmarkPackage, frictionAuthority, profile, stiffnessScale });
  const prepared = prepareCaesarAccdbCaseState({
    benchmarkPackage,
    caseRecord,
    solveProfile,
    gate: CAESAR_ACCDB_CASE_GATES.NONLINEAR_EFFECTIVE_FRICTION,
    frictionDofKeys: plan.frictionDofKeys,
  });
  let states = new Map(plan.supports.map((support) => [support.restraintId, 'STICK']));
  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));
  const acceleration = createSlipAccelerator(profile);
  const iterations = [];
  let previous = null;
  for (let iteration = 1; iteration <= profile.maximumIterations; iteration += 1) {
    const overlay = buildOverlay({ plan, slips, caseRecord, iteration, benchmarkPackage });
    const executed = executeCaesarAccdbCaseState({ prepared, overlay });
    const measured = measureSupports({ plan, executed, states, slips, overlay, profile });
    const nextStates = new Map(measured.map((entry) => [entry.restraintId, entry.nextState]));
    const mappedSlips = new Map(measured.map((entry) => [entry.restraintId, entry.nextSlip]));
    const stateChangedThisIteration = measured.some((entry) => entry.state !== entry.nextState);
    const accelerated = acceleration.next({
      order: plan.supports.map((support) => support.restraintId),
      current: slips,
      mapped: mappedSlips,
      stateChanged: stateChangedThisIteration,
    });
    const nextSlips = accelerated.slips;
    const stateChanges = measured
      .filter((entry) => entry.state !== entry.nextState)
      .map((entry) => ({
        restraintId: entry.restraintId,
        nodeId: entry.nodeId,
        from: entry.state,
        to: entry.nextState,
      }));
    const updates = updateNorms(previous, executed, measured);
    iterations.push(Object.freeze({
      iteration,
      overlay: executed.overlay.evidence,
      stateChangeCount: stateChanges.length,
      stateChanges: deepFreeze(stateChanges),
      displacementUpdateNormM: updates.displacementUpdateNormM,
      reactionUpdateNormN: updates.reactionUpdateNormN,
      slipResidualNormM: accelerated.residualNormM,
      accelerationApplied: accelerated.applied,
      accelerationFactor: accelerated.factor,
      executionStatus: executed.execution.status,
      executionSemanticHash: executed.execution.semanticHash,
      recoveredEquilibriumStatus: executed.recoveredEquilibrium.status,
      supports: deepFreeze(measured.map((entry) => entry.ledger)),
    }));
    const gates = evaluateConvergenceGates({ measured, stateChanges, updates, executed, profile, iteration });
    if (gates.status === 'CONVERGED') {
      return buildPrimitiveResult({
        caseRecord, frictionAuthority, plan, prepared, executed, measured, states, iterations, gates, profile,
      });
    }
    previous = executed;
    states = nextStates;
    slips = nextSlips;
  }
  const error = new Error(
    `${caseRecord.caseId} friction active set did not converge within ${profile.maximumIterations} iterations.`,
  );
  error.code = 'CAESAR_ACCDB_FRICTION_NOT_CONVERGED';
  error.iterations = iterations;
  throw error;
}

function buildPrimitiveResult(input) {
  const { caseRecord, frictionAuthority, plan, executed, measured, iterations, gates, profile } = input;
  const rows = applyFrictionReactionRows(executed.rows, measured);
  return {
    kind: 'PRIMITIVE',
    caseId: caseRecord.caseId,
    rows,
    executionSemanticHash: executed.execution.semanticHash,
    executionEvidenceHash: executed.execution.evidenceHash,
    stiffnessStateHash: executed.execution.stiffnessStateHash,
    supports: measured,
    evidence: deepFreeze({
      kind: 'PRIMITIVE',
      formula: caseRecord.formula,
      caseClass: caseRecord.caseClass,
      frictionAuthority,
      frictionStiffness: {
        governedSiValue: plan.frictionStiffnessSiValue,
        appliedSiValue: plan.appliedFrictionStiffnessSiValue,
        scale: plan.stiffnessScale,
        displayedValue: frictionAuthority.frictionStiffness.displayedValue,
        displayedUnit: frictionAuthority.frictionStiffness.displayedUnit,
        conversionFactor: frictionAuthority.frictionStiffness.conversionFactor,
        conversionRule: frictionAuthority.frictionStiffness.conversionRule,
      },
      frictionPlan: plan.evidence,
      caseOverlay: executed.overlay.evidence,
      iterationCount: iterations.length,
      iterations: deepFreeze(iterations),
      convergedStates: Object.fromEntries(measured.map((entry) => [entry.restraintId, entry.regime])),
      convergedElasticStates: Object.fromEntries(measured.map((entry) => [entry.restraintId, entry.state])),
      slidRestraintCount: measured.filter((entry) => entry.regime === 'SLID').length,
      convergenceGates: gates,
      solverProfileId: profile.profileId,
      executionStatus: executed.execution.status,
      solverDiagnostics: executed.execution.diagnostics,
      stiffnessStateHash: executed.execution.stiffnessStateHash,
      recoveredEquilibrium: executed.recoveredEquilibrium,
      globalRecoveryDisagreement: executed.recovered.globalRecoveryDisagreement,
      independentNonlinearSolve: true,
    }),
  };
}

function combineDerivedCase(input) {
  const { caseRecord, frictionAuthority, states, profile } = input;
  const minuend = requireStoredState(states, frictionAuthority.constituents.minuendCaseId, caseRecord);
  const subtrahend = requireStoredState(states, frictionAuthority.constituents.subtrahendCaseId, caseRecord);
  for (const constituent of [minuend, subtrahend]) {
    if (constituent.kind !== 'PRIMITIVE') {
      throw new TypeError(
        `${caseRecord.caseId} requires independently converged primitive states; ${constituent.caseId} is ${constituent.kind}.`,
      );
    }
  }
  const rows = subtractRows(minuend.rows, subtrahend.rows, caseRecord.caseId);
  const conditioning = derivedConditioning(minuend.rows, subtrahend.rows, rows);
  const identity = verifyCombinationIdentity(minuend.rows, subtrahend.rows, rows);
  return {
    kind: 'DERIVED_COMBINATION',
    caseId: caseRecord.caseId,
    rows,
    executionSemanticHash: null,
    executionEvidenceHash: null,
    stiffnessStateHash: null,
    supports: [],
    evidence: deepFreeze({
      kind: 'DERIVED_COMBINATION',
      formula: caseRecord.formula,
      caseClass: caseRecord.caseClass,
      frictionAuthority,
      combination: {
        rule: 'ALGEBRAIC_DIFFERENCE_OF_TWO_CONVERGED_NONLINEAR_STATES_V1',
        minuendCaseId: minuend.caseId,
        subtrahendCaseId: subtrahend.caseId,
        minuendExecutionSemanticHash: minuend.executionSemanticHash,
        subtrahendExecutionSemanticHash: subtrahend.executionSemanticHash,
        minuendIterationCount: minuend.evidence.iterationCount,
        subtrahendIterationCount: subtrahend.evidence.iterationCount,
        minuendConvergedStates: minuend.evidence.convergedStates,
        subtrahendConvergedStates: subtrahend.evidence.convergedStates,
        superpositionProhibitionRule:
          'NEITHER_CONSTITUENT_MAY_BE_DECOMPOSED_BY_LINEAR_SUPERPOSITION_BECAUSE_ITS_ACTIVE_SET_IS_LOAD_DEPENDENT',
      },
      identityProof: identity,
      conditioning,
      solverProfileId: profile.profileId,
      independentNonlinearSolve: false,
    }),
  };
}

/**
 * Resolve which restraints carry friction and in which directions.
 *
 * The coefficient is a per-restraint model input: CAESAR stores it in the
 * restraint row (`FRIC_COEF`), which is the highest authority layer. A blank row
 * carries CAESAR's blank sentinel and resolves to the layers below the model
 * input, so a support the model leaves frictionless stays frictionless. A
 * declared row value must agree with the file-level model-input declaration
 * within single-precision storage, otherwise the run stops.
 *
 * Friction acts in the plane normal to the restraint that declares it. A
 * tangential direction that is separately restrained at the same node (a guide or
 * line stop) is not treated as a friction direction: its load is carried by that
 * restraint's own stiffness, which is four orders of magnitude above the friction
 * stiffness. Every such exclusion is recorded rather than left implicit.
 */
/**
 * Componentwise secant (Steffensen) accelerator for the return-mapped slip sequence.
 *
 * The fixed-point map is `mapped = G(current)`, residual `r = mapped - current`. On
 * BM4_L the plain iteration is monotone but barely contracting: with 20 restraints
 * sliding, the measured reduction is under two percent per iteration, because the
 * friction stiffness is four orders above the structural tangential stiffness, so a
 * slip lag becomes a large force error. The slow modes are local to each restraint,
 * so each slip component gets its own secant estimate of the local map slope:
 *
 *   g_i  ~ (mapped_i^k - mapped_i^{k-1}) / (current_i^k - current_i^{k-1})
 *   next_i = current_i + r_i / (1 - g_i)
 *
 * Safeguards: the history is cleared whenever the active set moves, a component
 * with a negligible change keeps the plain iterate, and the amplification is
 * clamped to a declared range. Acceleration chooses trial iterates only. The
 * residual it drives to zero, the gates that accept a state and therefore the
 * converged result are unchanged - the same state is reached with acceleration
 * disabled, only more slowly.
 *
 * @param {Record<string, unknown>} profile Friction solver profile.
 * @returns {Record<string, Function>} Accelerator with a per-iteration step.
 */
function createSlipAccelerator(profile) {
  let previous = null;
  let iteration = 0;
  return {
    next({ order, current, mapped, stateChanged }) {
      iteration += 1;
      const currentVector = flattenSlips(order, current);
      const mappedVector = flattenSlips(order, mapped);
      const residual = mappedVector.map((value, index) => value - currentVector[index]);
      const residualNormM = norm(residual);
      let applied = false;
      let amplification = 1;
      let nextVector = mappedVector;
      const eligible = !stateChanged
        && previous !== null
        && iteration >= profile.accelerationMinimumIterations
        && residualNormM > 0;
      if (eligible) {
        const scale = Math.max(...currentVector.map(Math.abs), profile.zeroTangentialMotionFloorM);
        const candidate = currentVector.map((value, index) => {
          const deltaCurrent = value - previous.current[index];
          const deltaMapped = mappedVector[index] - previous.mapped[index];
          if (Math.abs(deltaCurrent) <= 1e-6 * scale) return mappedVector[index];
          const slope = deltaMapped / deltaCurrent;
          if (!Number.isFinite(slope) || slope >= 1) return mappedVector[index];
          const factor = clamp(1 / (1 - slope), 1, profile.accelerationFactorLimit);
          amplification = Math.max(amplification, factor);
          return value + factor * residual[index];
        });
        const stepNorm = norm(candidate.map((value, index) => value - mappedVector[index]));
        if (stepNorm <= profile.accelerationStepRatioLimit * residualNormM) {
          nextVector = candidate;
          applied = true;
        } else {
          amplification = 1;
        }
      }
      previous = stateChanged ? null : { current: currentVector, mapped: mappedVector };
      return {
        slips: expandSlips(order, current, nextVector),
        residualNormM,
        applied,
        factor: amplification,
      };
    },
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function flattenSlips(order, slips) {
  return order.flatMap((restraintId) => [...slips.get(restraintId)]);
}

function expandSlips(order, template, vector) {
  const result = new Map();
  let cursor = 0;
  for (const restraintId of order) {
    const length = template.get(restraintId).length;
    result.set(restraintId, vector.slice(cursor, cursor + length));
    cursor += length;
  }
  return result;
}

function buildFrictionRestraintPlan(input) {
  const { benchmarkPackage, frictionAuthority, profile, stiffnessScale } = input;
  const restraintRows = benchmarkPackage.model.tables.INPUT_RESTRAINTS.rows;
  const fileCoefficient = frictionAuthority.coefficient.value;
  const frictionStiffnessSiValue = frictionAuthority.frictionStiffness.siValue;
  const appliedFrictionStiffnessSiValue = frictionStiffnessSiValue * stiffnessScale;
  const byNode = new Map();
  for (const row of restraintRows) {
    const nodeId = String(row.NODE_NUM);
    const entry = byNode.get(nodeId) ?? {
      nodeId, rowCount: 0, anchor: false, restrainedDofs: new Set(), frictionRows: [],
    };
    entry.rowCount += 1;
    if (Number(row.RES_TYPEID) === CAESAR_ANCHOR_RESTRAINT_TYPE) {
      entry.anchor = true;
      for (const dof of DOFS) entry.restrainedDofs.add(dof);
    } else {
      entry.restrainedDofs.add(axisAlignedTranslationDof(row));
    }
    const declared = resolveRowCoefficient(row, fileCoefficient);
    if (declared.coefficient > 0) entry.frictionRows.push({ row, declared });
    byNode.set(nodeId, entry);
  }
  const supports = [];
  const excluded = [];
  for (const entry of [...byNode.values()].sort((left, right) => compareText(left.nodeId, right.nodeId))) {
    if (entry.frictionRows.length === 0) {
      excluded.push({
        nodeId: entry.nodeId,
        reason: entry.anchor
          ? 'ANCHOR_DECLARES_NO_FRICTION_AND_HAS_NO_FREE_TANGENTIAL_DIRECTION'
          : 'MODEL_INPUT_DECLARES_NO_FRICTION_COEFFICIENT_AT_THIS_RESTRAINT',
        coefficientLevel: 'NONE',
      });
      continue;
    }
    if (entry.frictionRows.length > 1) {
      throw new TypeError(
        `ACCDB node ${entry.nodeId} declares friction on ${entry.frictionRows.length} restraints; `
        + 'multi-plane friction at one node is not implemented.',
      );
    }
    const { row, declared } = entry.frictionRows[0];
    if (entry.anchor) {
      throw new TypeError(`ACCDB anchor node ${entry.nodeId} declares a friction coefficient; that is unsupported.`);
    }
    const normalDof = normalDofOf(row);
    const candidates = TRANSLATION_DOFS.filter((dof) => dof !== normalDof);
    const frictionDofs = candidates.filter((dof) => !entry.restrainedDofs.has(dof));
    const restrainedTangentialDofs = candidates.filter((dof) => entry.restrainedDofs.has(dof));
    if (frictionDofs.length === 0) {
      excluded.push({
        nodeId: entry.nodeId,
        reason: 'EVERY_TANGENTIAL_DIRECTION_IS_SEPARATELY_RESTRAINED_AT_THIS_NODE',
        coefficientLevel: declared.level,
        coefficientOfFriction: declared.coefficient,
        restrainedTangentialDofs,
      });
      continue;
    }
    supports.push(Object.freeze({
      // A friction support is one ACCDB restraint row, not a node: identity,
      // normal direction and coefficient all come from that row.
      restraintId: `${entry.nodeId}:REST_PTR${Number(row.REST_PTR ?? 0)}:TYPE${Number(row.RES_TYPEID)}:${normalDofOf(row)}`,
      nodeId: entry.nodeId,
      nodeName: String(row.NODE_NAME ?? '').trim(),
      restraintPointer: Number(row.REST_PTR ?? 0),
      restraintRowCount: entry.rowCount,
      restraintTypeId: Number(row.RES_TYPEID),
      normalUnitVector: Object.freeze(signedNormalUnitVector(row)),
      coefficientLevel: declared.level,
      coefficientSource: declared.source,
      normalDofs: Object.freeze([normalDof]),
      frictionDofs: Object.freeze(frictionDofs),
      restrainedTangentialDofs: Object.freeze(restrainedTangentialDofs),
      coefficientOfFriction: declared.coefficient,
      frictionStiffnessSiValue: appliedFrictionStiffnessSiValue,
    }));
  }
  if (supports.length === 0) {
    throw new TypeError('No restraint in this model carries an active friction direction.');
  }
  const frictionDofKeys = supports.flatMap((support) =>
    support.frictionDofs.map((dof) => `${support.nodeId}:${dof}`));
  return {
    supports,
    frictionDofKeys,
    stiffnessScale,
    frictionStiffnessSiValue,
    appliedFrictionStiffnessSiValue,
    evidence: deepFreeze({
      rule: profile.frictionCoefficientSourceRule,
      fileCoefficientLevel: frictionAuthority.coefficient.level,
      fileCoefficientSource: frictionAuthority.coefficient.source,
      fileCoefficientOfFriction: fileCoefficient,
      coefficientOfFriction: maximum(supports.map((support) => support.coefficientOfFriction)),
      supportCount: supports.length,
      supports: deepFreeze(supports),
      excludedRestraints: deepFreeze(excluded),
      restraintRowCount: restraintRows.length,
      restraintNodeCount: byNode.size,
      activeFrictionDofCount: frictionDofKeys.length,
    }),
  };
}

/** Reject a skewed support: a rotated tangent plane is not implemented. */
/** Signed unit normal of one axis-aligned restraint row. */
function signedNormalUnitVector(row) {
  const cosines = [Number(row.XCOSINE), Number(row.YCOSINE), Number(row.ZCOSINE)];
  const dof = axisAlignedTranslationDof(row);
  const index = TRANSLATION_DOFS.indexOf(dof);
  const sign = cosines[index] >= 0 ? 1 : -1;
  return [0, 1, 2].map((axis) => (axis === index ? sign : 0));
}

function normalDofOf(row) {
  return axisAlignedTranslationDof(row);
}

function axisAlignedTranslationDof(row) {
  const cosines = [Number(row.XCOSINE), Number(row.YCOSINE), Number(row.ZCOSINE)];
  if (!cosines.every((value) => Number.isFinite(value))) {
    throw new TypeError(`Restraint at node ${row.NODE_NUM} has a non-finite direction cosine.`);
  }
  const magnitudes = cosines.map(Math.abs);
  const dominant = Math.max(...magnitudes);
  if (!(dominant > 0)) throw new TypeError(`Restraint at node ${row.NODE_NUM} has no direction cosine.`);
  const dominantIndex = magnitudes.indexOf(dominant);
  const skewed = magnitudes
    .some((value, index) => index !== dominantIndex && value > AXIS_ALIGNMENT_TOLERANCE * dominant);
  if (skewed) {
    throw new TypeError(
      `Restraint at node ${row.NODE_NUM} is skewed; a rotated friction tangent plane is not implemented.`,
    );
  }
  return TRANSLATION_DOFS[dominantIndex];
}

/**
 * Resolve the coefficient of friction of one restraint row.
 *
 * CAESAR writes a blank numeric input field as a negative sentinel, so a negative
 * value is "not declared at the model-input layer" rather than a coefficient. A
 * declared value is the model input and therefore the highest authority; it is
 * required to agree with the file-level declaration within single-precision
 * storage, because the ACCDB stores these fields as float32.
 */
function resolveRowCoefficient(row, fileCoefficient) {
  const columns = Object.keys(row)
    .filter((column) => FRICTION_COLUMN_PATTERN.test(column))
    .sort(compareText);
  for (const column of columns) {
    const value = Number(row[column]);
    if (!Number.isFinite(value) || value < 0) continue;
    if (value > 0 && Math.abs(value - fileCoefficient) > FLOAT32_COEFFICIENT_TOLERANCE) {
      throw new TypeError(
        `ACCDB restraint node ${row.NODE_NUM} declares ${column}=${value}, `
        + `which contradicts the file-level model-input coefficient ${fileCoefficient}; `
        + 'resolve the authority before solving.',
      );
    }
    return {
      coefficient: value,
      level: 'MODEL_INPUT',
      source: `ACCDB:INPUT_RESTRAINTS:${column}`,
    };
  }
  return {
    coefficient: 0,
    level: 'BLANK_MODEL_INPUT_RESOLVES_TO_LOWER_LAYERS',
    source: 'ACCDB:INPUT_RESTRAINTS:BLANK_SENTINEL',
  };
}

function buildOverlay(input) {
  const { plan, slips, caseRecord, iteration, benchmarkPackage } = input;
  const constraints = [];
  const nodalLoads = [];
  for (const support of plan.supports) {
    // The tangential spring is always assembled. Sliding is imposed by the offset
    // load below, not by deleting stiffness from the system.
    for (const dof of support.frictionDofs) {
      constraints.push({
        declarationId: `ACCDB-FRICTION-${support.nodeId}-${dof}`,
        kind: 'PARTIAL_RELEASE_SPRING',
        nodeId: support.nodeId,
        dof,
        stiffness: support.frictionStiffnessSiValue,
      });
    }
    const slip = slips.get(support.restraintId);
    if (slip === undefined) throw new TypeError(`Friction restraint ${support.restraintId} has no slip state.`);
    if (norm(slip) === 0) continue;
    // Net tangential force = -k_f u_t + k_f u_slip = -k_f (u_t - u_slip).
    const force = { fx: 0, fy: 0, fz: 0 };
    support.frictionDofs.forEach((dof, index) => {
      force[`f${dof.slice(1).toLowerCase()}`] = support.frictionStiffnessSiValue * slip[index];
    });
    nodalLoads.push({
      schema: 'fea-linear-load-primitive/v1',
      primitiveId: `ACCDB-${caseRecord.caseId}-FRICTION-SLIP-${support.nodeId}-IT${iteration}`,
      kind: 'NODAL_FORCE_MOMENT',
      nodeId: support.nodeId,
      basis: { kind: 'GLOBAL' },
      force,
      moment: { mx: 0, my: 0, mz: 0 },
      units: { force: 'N', moment: 'N*m', length: 'm' },
      signConvention: 'APPLIED_TO_STRUCTURE',
      sourceEvidence: sourceEvidence(
        `ACCDB:FRICTION:${support.restraintId}:${caseRecord.caseId}`,
        `${benchmarkPackage.source.sha256}:${slip.join(',')}`,
      ),
    });
  }
  return {
    overlayId: `${caseRecord.caseId}-FRICTION-IT${iteration}`,
    constraints,
    nodalLoads,
  };
}

/** Recover the friction state of every support from one executed iteration. */
function measureSupports(input) {
  const { plan, executed, states, slips, overlay, profile } = input;
  const displacement = new Map(executed.execution.displacement.map((entry) => {
    const shift = executed.displacementShiftByNode.get(entry.nodeId) ?? null;
    const shiftValue = shift === null ? 0 : shift[DOFS.indexOf(entry.dof)];
    return [`${entry.nodeId}:${entry.dof}`, entry.value + shiftValue];
  }));
  const reactions = new Map(executed.execution.reactions
    .map((entry) => [`${entry.nodeId}:${entry.dof}`, entry.value]));
  const appliedByNode = new Map(overlay.nodalLoads.map((load) => [String(load.nodeId), load.force]));
  return plan.supports.map((support) => {
    const state = states.get(support.restraintId);
    const slip = slips.get(support.restraintId);
    const stiffness = support.frictionStiffnessSiValue;
    const tangentialDisplacement = support.frictionDofs
      .map((dof) => displacement.get(`${support.nodeId}:${dof}`) ?? 0);
    const tangentialMotion = norm(tangentialDisplacement);
    // The Coulomb normal is this restraint's own reaction projected on its own
    // signed direction cosine. A co-located guide or line stop is a different
    // restraint and never contributes to this capacity.
    const normalDof = support.normalDofs[0];
    const normalIndex = TRANSLATION_DOFS.indexOf(normalDof);
    const normalReaction = reactions.get(`${support.nodeId}:${normalDof}`) ?? 0;
    const signedNormalProjection = normalReaction * support.normalUnitVector[normalIndex];
    const normalMagnitude = Math.abs(signedNormalProjection);
    const capacityN = support.coefficientOfFriction * normalMagnitude;
    // Net tangential force actually carried this iteration: the retained spring
    // reaction plus the declared slip offset load.
    const springReaction = support.frictionDofs.map((dof) => reactions.get(`${support.nodeId}:${dof}`) ?? 0);
    const appliedOffset = support.frictionDofs.map((dof) => {
      const force = appliedByNode.get(support.nodeId);
      return force === undefined ? 0 : Number(force[`f${dof.slice(1).toLowerCase()}`]);
    });
    const netForce = springReaction.map((value, index) => value + appliedOffset[index]);
    const netMagnitude = norm(netForce);
    // Elastic trial force of the return map, measured from the stored slip.
    const elasticStretch = tangentialDisplacement.map((value, index) => value - slip[index]);
    const trialForce = elasticStretch.map((value) => -stiffness * value);
    const trialMagnitude = norm(trialForce);
    const boundary = Math.max(
      profile.stateBoundaryAbsoluteN,
      profile.stateBoundaryRelative * Math.max(capacityN, trialMagnitude),
    );
    // The band is one-sided on purpose. Yielding is enforced as soon as the trial
    // force passes the Coulomb surface, so no state can hold a force above the cap;
    // only the return to stick is delayed, which is what removes label chatter for a
    // support sitting on the surface.
    const band = profile.stateHysteresisRelative * capacityN;
    const nextState = trialMagnitude > capacityN + boundary
      ? 'SLIDE'
      : trialMagnitude < capacityN - boundary - band
        ? 'STICK'
        : state;
    // Return mapping: project the trial force onto the Coulomb cap and carry the
    // difference as slip. A sticking support keeps its slip unchanged.
    const nextSlip = nextState === 'SLIDE' && trialMagnitude > 0
      ? tangentialDisplacement.map((value, index) =>
        value + (capacityN / trialMagnitude) * trialForce[index] / stiffness)
      : [...slip];
    const slipUpdateM = norm(nextSlip.map((value, index) => value - slip[index]));
    const slipIncrement = nextSlip.map((value, index) => value - slip[index]);
    const slipIncrementMagnitude = norm(slipIncrement);
    // Three distinct outcomes, kept separate because they satisfy different laws:
    //   SLIDING            currently on the Coulomb surface, force = mu|N|;
    //   LOCKED_AFTER_SLIP  permanent slip from earlier, now elastic below the cap;
    //   STUCK              never slipped.
    // The current elastic condition, not the slip history, decides which residual
    // governs: a support that slid and then unloaded legitimately carries less than
    // its capacity.
    const accumulatedSlipM = norm(slip);
    const regime = nextState === 'SLIDE'
      ? 'SLIDING'
      : accumulatedSlipM > 0 ? 'LOCKED_AFTER_SLIP' : 'STUCK';
    const stickResidualN = norm(netForce
      .map((value, index) => value + stiffness * elasticStretch[index]));
    const slideResidualN = Math.abs(netMagnitude - capacityN);
    const oppositionCosine = tangentialMotion > profile.zeroTangentialMotionFloorM && netMagnitude > 0
      ? dot(netForce, tangentialDisplacement) / (netMagnitude * tangentialMotion)
      : null;
    const slipOppositionCosine = accumulatedSlipM > profile.zeroTangentialMotionFloorM && netMagnitude > 0
      ? dot(netForce, slip) / (netMagnitude * accumulatedSlipM)
      : null;
    // A sliding support must oppose its plastic flow. The accumulated slip is that
    // flow for a single monotonic load step; before any slip has accumulated the
    // elastic tangential stretch is the only motion available to oppose.
    const stretchMagnitude = norm(elasticStretch);
    const stretchCosine = stretchMagnitude > profile.zeroTangentialMotionFloorM && netMagnitude > 0
      ? dot(netForce, elasticStretch) / (netMagnitude * stretchMagnitude)
      : null;
    const frictionDirectionCosine = slipOppositionCosine ?? stretchCosine;
    return {
      restraintId: support.restraintId,
      nodeId: support.nodeId,
      support,
      state,
      nextState,
      regime,
      accumulatedSlipM,
      nextSlip,
      slipUpdateM,
      tangentialDisplacement,
      normalMagnitude,
      capacityN,
      appliedForce: netForce,
      appliedMagnitude: netMagnitude,
      trialMagnitude,
      stickResidualN,
      slideResidualN,
      oppositionCosine,
      slipOppositionCosine,
      frictionDirectionCosine,
      ledger: Object.freeze({
        restraintId: support.restraintId,
        nodeId: support.nodeId,
        nodeName: support.nodeName,
        restraintPointer: support.restraintPointer,
        restraintTypeId: support.restraintTypeId,
        restraintRowCount: support.restraintRowCount,
        normalDof,
        normalUnitVector: support.normalUnitVector,
        normalDirectionRule: profile.normalDirectionRule,
        frictionDofs: support.frictionDofs,
        restrainedTangentialDofs: support.restrainedTangentialDofs,
        relativeTangentialDisplacementM: deepFreeze([...tangentialDisplacement]),
        relativeTangentialDisplacementRule: 'SUPPORT_NODE_MINUS_GROUND_NO_CNODE_V1',
        accumulatedSlipM: deepFreeze([...slip]),
        elasticTangentialStretchM: deepFreeze([...elasticStretch]),
        normalReactionComponentN: normalReaction,
        signedNormalProjectionN: signedNormalProjection,
        normalReactionMagnitudeN: normalMagnitude,
        coefficientOfFriction: support.coefficientOfFriction,
        coefficientLevel: support.coefficientLevel,
        coefficientSource: support.coefficientSource,
        frictionStiffnessNPerM: stiffness,
        capacityN,
        trialTangentialSpringForceN: deepFreeze([...trialForce]),
        trialTangentialSpringForceMagnitudeN: trialMagnitude,
        state,
        nextState,
        stateChanged: state !== nextState,
        regime,
        regimeRule: 'SLIDING_WHEN_ON_THE_CAP_LOCKED_AFTER_SLIP_WHEN_PERMANENT_SLIP_IS_NOW_ELASTIC_STUCK_OTHERWISE',
        accumulatedSlipMagnitudeM: accumulatedSlipM,
        springReactionN: deepFreeze([...springReaction]),
        slipOffsetLoadN: deepFreeze([...appliedOffset]),
        appliedFrictionForceN: deepFreeze([...netForce]),
        appliedFrictionForceMagnitudeN: netMagnitude,
        appliedCapacityBasis: 'RETAINED_SPRING_REACTION_PLUS_RETURN_MAPPED_SLIP_OFFSET',
        slipIncrementM: deepFreeze([...slipIncrement]),
        slipUpdateM,
        slipDirectionUnit: slipIncrementMagnitude > 0
          ? deepFreeze(slipIncrement.map((value) => value / slipIncrementMagnitude))
          : null,
        // Each residual is reported only where its law applies, so a sliding
        // support never publishes a stick residual that governs nothing.
        stickResidualN: nextState === 'STICK' ? stickResidualN : null,
        slideResidualN: nextState === 'SLIDE' ? slideResidualN : null,
        frictionDirectionCosine,
        oppositionCosine,
        slipOppositionCosine,
      }),
    };
  });
}

/**
 * Reject a numerically stationary but physically invalid friction state.
 *
 * Displacement convergence alone is never sufficient: complementarity, the
 * Coulomb cap, the friction direction, active-set stability and recovered
 * physical equilibrium are all separate gates and each can fail on its own.
 */
function evaluateConvergenceGates(input) {
  const { measured, stateChanges, updates, executed, profile, iteration } = input;
  const gates = [];
  gates.push(gate('ACTIVE_SET_STABILITY', stateChanges.length === 0, {
    stateChangeCount: stateChanges.length,
    stateChanges,
  }));
  gates.push(gate(
    'DISPLACEMENT_UPDATE_NORM',
    updates.displacementUpdateNormM !== null && updates.displacementUpdateNormM <= profile.displacementUpdateLimitM,
    { value: updates.displacementUpdateNormM, limit: profile.displacementUpdateLimitM },
  ));
  gates.push(gate(
    'REACTION_UPDATE_NORM',
    updates.reactionUpdateNormN !== null && updates.reactionUpdateNormN <= profile.reactionUpdateLimitN,
    { value: updates.reactionUpdateNormN, limit: profile.reactionUpdateLimitN },
  ));
  const capViolations = measured.filter((entry) => entry.appliedMagnitude > entry.capacityN
    + Math.max(profile.capViolationAbsoluteN, profile.capViolationRelative * entry.capacityN));
  gates.push(gate('COULOMB_CAP_COMPLEMENTARITY', capViolations.length === 0, {
    violations: capViolations.map((entry) => ({
      restraintId: entry.restraintId,
      appliedMagnitudeN: entry.appliedMagnitude,
      capacityN: entry.capacityN,
    })),
  }));
  const stickFailures = measured.filter((entry) =>
    entry.nextState === 'STICK' && entry.stickResidualN > profile.stickResidualLimitN);
  gates.push(gate('STICK_SPRING_RESIDUAL', stickFailures.length === 0, {
    limit: profile.stickResidualLimitN,
    failures: stickFailures.map((entry) => ({ restraintId: entry.restraintId, residualN: entry.stickResidualN })),
  }));
  const slideFailures = measured.filter((entry) => entry.nextState === 'SLIDE'
    && entry.slideResidualN > Math.max(
      profile.slideResidualAbsoluteN,
      profile.slideResidualRelative * entry.capacityN,
    ));
  gates.push(gate('SLIDE_CAPACITY_RESIDUAL', slideFailures.length === 0, {
    failures: slideFailures.map((entry) => ({
      restraintId: entry.restraintId,
      residualN: entry.slideResidualN,
      capacityN: entry.capacityN,
    })),
  }));
  // The accumulated slip must itself have stopped moving, otherwise the iteration
  // is still travelling even when the active set looks stable.
  const slipFailures = measured.filter((entry) => entry.slipUpdateM > profile.slipUpdateLimitM);
  gates.push(gate('SLIP_UPDATE_NORM', slipFailures.length === 0, {
    limit: profile.slipUpdateLimitM,
    failures: slipFailures.map((entry) => ({
      restraintId: entry.restraintId,
      slipUpdateM: entry.slipUpdateM,
    })),
  }));
  // Friction must oppose the slip increment produced by the return map. The
  // total-displacement cosine is reported alongside it but does not govern: a
  // support can arrive at its final position along a path that is not parallel to
  // its final slip increment.
  const directionFailures = measured.filter((entry) => entry.nextState === 'SLIDE'
    && (entry.frictionDirectionCosine === null
      || entry.frictionDirectionCosine > profile.oppositionCosineLimit));
  gates.push(gate('FRICTION_OPPOSES_SLIP', directionFailures.length === 0, {
    limit: profile.oppositionCosineLimit,
    rule: 'COSINE_BETWEEN_NET_FRICTION_FORCE_AND_ACCUMULATED_SLIP',
    failures: directionFailures.map((entry) => ({
      restraintId: entry.restraintId,
      frictionDirectionCosine: entry.frictionDirectionCosine,
      slipOppositionCosine: entry.slipOppositionCosine,
      totalDisplacementCosine: entry.oppositionCosine,
    })),
  }));
  gates.push(gate('RECOVERED_PHYSICAL_EQUILIBRIUM', executed.recoveredEquilibrium.status === 'PASS', {
    status: executed.recoveredEquilibrium.status,
    counts: executed.recoveredEquilibrium.counts,
    maximumAbsoluteResidual: executed.recoveredEquilibrium.maximumAbsoluteResidual,
  }));
  gates.push(gate('SOLVER_EXECUTION_QUALIFIED', executed.execution.status === 'QUALIFIED', {
    status: executed.execution.status,
  }));
  const failed = gates.filter((entry) => entry.status !== 'PASS');
  return deepFreeze({
    schema: 'lfea-accdb-friction-convergence-gates/v1',
    iteration,
    status: failed.length === 0 ? 'CONVERGED' : 'NOT_CONVERGED',
    failedGates: failed.map((entry) => entry.gate),
    gates,
  });
}

function updateNorms(previous, executed, measured) {
  if (previous === null) {
    return { displacementUpdateNormM: null, reactionUpdateNormN: null, measuredCount: measured.length };
  }
  const previousDisplacement = new Map(previous.execution.displacement
    .map((entry) => [`${entry.nodeId}:${entry.dof}`, entry.value]));
  const previousReactions = new Map(previous.execution.reactions
    .map((entry) => [`${entry.nodeId}:${entry.dof}`, entry.value]));
  const displacementUpdateNormM = maximum(executed.execution.displacement
    .filter((entry) => entry.dof.startsWith('U'))
    .map((entry) => Math.abs(entry.value - (previousDisplacement.get(`${entry.nodeId}:${entry.dof}`) ?? 0))));
  const reactionUpdateNormN = maximum(executed.execution.reactions
    .filter((entry) => entry.dof.startsWith('U'))
    .map((entry) => Math.abs(entry.value - (previousReactions.get(`${entry.nodeId}:${entry.dof}`) ?? 0))));
  return { displacementUpdateNormM, reactionUpdateNormN, measuredCount: measured.length };
}

/**
 * Report the net friction force of every friction restraint as its restraint load.
 *
 * The tangential spring reaction alone is not the reported load once a support
 * slides: the declared slip offset carries part of that force. The reported
 * component is therefore the net of both, which is exactly the force CAESAR prints
 * for the friction direction.
 */
function applyFrictionReactionRows(rows, measured) {
  const overrides = new Map();
  for (const entry of measured) {
    entry.support.frictionDofs.forEach((dof, index) => {
      overrides.set(`${entry.nodeId}:${dof}`, entry.appliedForce[index]);
    });
  }
  if (overrides.size === 0) return rows.map((row) => ({ ...row }));
  return rows.map((row) => {
    if (row.entityKind !== 'NODE' || row.quantity !== 'FORCE') return { ...row };
    const key = `${row.entityId}:${row.component}`;
    if (!overrides.has(key)) return { ...row };
    return { ...row, value: overrides.get(key) };
  });
}

function orderCasesByDependency(benchmarkPackage, selectedCaseIds) {
  const selected = [...new Set(selectedCaseIds.map(String))];
  const records = selected.map((caseId) => {
    const record = benchmarkPackage.cases.find((row) => row.caseId === caseId);
    if (!record) throw new TypeError(`Unknown ACCDB friction-solve case ${caseId}.`);
    return record;
  });
  const primitives = records.filter((record) => classifyCaesarCaseFormula(record).kind === 'PRIMITIVE');
  const derived = records.filter((record) => classifyCaesarCaseFormula(record).kind === 'DERIVED_COMBINATION');
  return [
    ...primitives.sort((left, right) => left.lcaseNumber - right.lcaseNumber),
    ...derived.sort((left, right) => left.lcaseNumber - right.lcaseNumber),
  ];
}

function requireStoredState(states, caseId, owner) {
  const state = states.get(caseId);
  if (!state) {
    throw new TypeError(
      `${owner.caseId} requires the converged state of ${caseId}; solve it in the same run before the combination.`,
    );
  }
  return state;
}

/** Prove the reconstructed combination equals the stored difference exactly. */
function verifyCombinationIdentity(minuendRows, subtrahendRows, derivedRows) {
  const minuend = new Map(minuendRows.map((row) => [rowIdentity(row), row]));
  const subtrahend = new Map(subtrahendRows.map((row) => [rowIdentity(row), row]));
  let maximumDeviation = 0;
  for (const row of derivedRows) {
    const identity = rowIdentity(row);
    const expected = Number(minuend.get(identity).value) - Number(subtrahend.get(identity).value);
    maximumDeviation = Math.max(maximumDeviation, Math.abs(expected - Number(row.value)));
  }
  return deepFreeze({
    rule: 'EVERY_DERIVED_ROW_EQUALS_MINUEND_MINUS_SUBTRAHEND_AT_THE_SAME_IDENTITY_V1',
    comparedRowCount: derivedRows.length,
    maximumAbsoluteDeviation: maximumDeviation,
    status: maximumDeviation === 0 ? 'PASS' : 'FAIL',
  });
}

/** Report cancellation conditioning of a derived combination without hiding it. */
function derivedConditioning(minuendRows, subtrahendRows, derivedRows) {
  const minuend = new Map(minuendRows.map((row) => [rowIdentity(row), Number(row.value)]));
  const subtrahend = new Map(subtrahendRows.map((row) => [rowIdentity(row), Number(row.value)]));
  const rows = derivedRows.map((row) => {
    const identity = rowIdentity(row);
    const left = minuend.get(identity);
    const right = subtrahend.get(identity);
    const scale = Math.max(Math.abs(left), Math.abs(right));
    return {
      identity,
      quantity: row.quantity,
      unit: row.unit,
      minuendValue: left,
      subtrahendValue: right,
      derivedValue: Number(row.value),
      operandScale: scale,
      retainedFraction: scale === 0 ? null : Math.abs(Number(row.value)) / scale,
    };
  });
  const cancelling = rows
    .filter((row) => row.retainedFraction !== null && row.retainedFraction < 1e-6)
    .sort((left, right) => right.operandScale - left.operandScale);
  return deepFreeze({
    rule: 'DERIVED_CANCELLATION_IS_REPORTED_SEPARATELY_AND_NEVER_ABSORBED_INTO_A_PERCENTAGE_V1',
    comparedRowCount: rows.length,
    severeCancellationRowCount: cancelling.length,
    severeCancellationRows: deepFreeze(cancelling.slice(0, 50)),
    maximumOperandScale: maximum(rows.map((row) => row.operandScale)),
  });
}

function subtractRows(minuendRows, subtrahendRows, caseId) {
  const minuend = new Map(minuendRows.map((row) => [rowIdentity(row), row]));
  const subtrahend = new Map(subtrahendRows.map((row) => [rowIdentity(row), row]));
  const identities = [...new Set([...minuend.keys(), ...subtrahend.keys()])].sort(compareText);
  return identities.map((identity) => {
    const left = minuend.get(identity);
    const right = subtrahend.get(identity);
    if (left === undefined || right === undefined) {
      throw new TypeError(`Combination ${caseId} has incomplete row coverage at ${identity}.`);
    }
    if (left.unit !== right.unit) {
      throw new TypeError(`Combination ${caseId} row ${identity} has incompatible units.`);
    }
    return {
      entityKind: left.entityKind,
      entityId: left.entityId,
      quantity: left.quantity,
      component: left.component,
      value: Number(left.value) - Number(right.value),
      unit: left.unit,
    };
  });
}

function restraintReactionVector(rows) {
  return Object.fromEntries(rows
    .filter((row) => row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity))
    .map((row) => [`${row.entityId}:${row.quantity}:${row.component}`, Number(row.value)])
    .sort(([left], [right]) => compareText(left, right)));
}

function maximumVectorDifference(left, right) {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  return maximum(keys.map((key) => Math.abs((left[key] ?? 0) - (right[key] ?? 0))));
}

function normalizeFrictionProfile(value) {
  if (!value || value.schema !== CAESAR_FRICTION_SOLVER_PROFILE.schema) {
    throw new TypeError('A versioned caesar-accdb-friction-solver-profile/v1 is required.');
  }
  for (const key of Object.keys(CAESAR_FRICTION_SOLVER_PROFILE)) {
    if (value[key] === undefined) throw new TypeError(`Friction solver profile is missing ${key}.`);
  }
  if (!(Number(value.maximumIterations) > 0)) {
    throw new TypeError('Friction solver profile maximumIterations must be positive.');
  }
  return deepFreeze({ ...value });
}

function normalizeStiffnessScale(value) {
  const scale = Number(value);
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new TypeError('Friction stiffness scale must be finite and positive.');
  }
  return scale;
}

function gate(name, passed, evidence) {
  return Object.freeze({ gate: name, status: passed ? 'PASS' : 'FAIL', evidence: deepFreeze(evidence) });
}

function requireRows(rowsByCase, caseId, label) {
  const rows = rowsByCase[caseId];
  if (!Array.isArray(rows)) throw new TypeError(`Missing ${label} rows for ${caseId}.`);
  return rows;
}

function requireBenchmarkPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
}

function sourceEvidence(sourceId, sourceRevision) {
  const identity = { sourceId, sourceRevision };
  return { ...identity, sourceSemanticHash: semanticHash(identity) };
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function norm(values) {
  return Math.hypot(...values);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function maximum(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
