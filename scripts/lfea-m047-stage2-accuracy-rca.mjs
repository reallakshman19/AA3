#!/usr/bin/env node
/**
 * M047 Stage 2 accuracy RCA over a committed real-ACCDB friction iteration artifact.
 *
 * This is diagnostic only. It does not modify solver mechanics, tolerances, comparison
 * rules, or qualification status. It decomposes the existing tangential-vector error
 * into direction, magnitude, state-path, and reference-resolution signals so the next
 * one-mechanic tuning run is selected from evidence rather than failure counts.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-accuracy-rca.mjs \
 *     --iteration reports/lfea-m047-stage2-friction-iteration-L13.json \
 *     [--print-resolution-mm 0.001] [--out reports/...json]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EXPECTED_SCHEMA = 'm047-bm4l-stage2-friction-tuning-iteration/v1';
const GOVERNED_FRICTION_STIFFNESS_N_PER_M = 1.751270055770874e8;
const VECTOR_GOAL_RELATIVE = 0.1;
const REFERENCE_SURFACE_BAND = 0.02;
const DIRECTION_ALIGNMENT_COSINE = -0.999;

export function buildAccuracyRca(iteration, options = {}) {
  if (iteration?.schema !== EXPECTED_SCHEMA) {
    throw new TypeError(`iteration must use ${EXPECTED_SCHEMA}.`);
  }
  if (!iteration.converged || !Array.isArray(iteration.restraints)) {
    throw new TypeError('accuracy RCA requires a converged friction tuning artifact with restraint rows.');
  }

  const printResolutionMm = Number(options.printResolutionMm ?? 0.001);
  if (!(printResolutionMm > 0)) throw new TypeError('print resolution must be positive.');
  const halfPrintStepM = printResolutionMm * 1e-3 / 2;
  const displacementDerivedForceHalfStepN = GOVERNED_FRICTION_STIFFNESS_N_PER_M * halfPrintStepM;

  const rows = iteration.restraints.map((row) => analyzeRow(row, displacementDerivedForceHalfStepN));
  const rawMatches = rows.filter((row) => row.state.rawMatch).length;
  const constitutiveMatches = rows.filter((row) => row.state.constitutiveMatch).length;
  const overMobilized = rows.filter((row) => row.state.overMobilizedCandidate);
  const prematureRelock = rows.filter((row) => row.state.prematureRelockCandidate);
  const directionDominated = rows.filter((row) => row.vector.directionDominatedFailure);
  const sourceDirectionMatches = rows.filter((row) =>
    row.direction.referenceForceVsReferenceTotalDisplacementCosine !== null
    && row.direction.referenceForceVsReferenceTotalDisplacementCosine <= DIRECTION_ALIGNMENT_COSINE);
  const solverElasticMatches = rows.filter((row) =>
    row.direction.solvedForceVsElasticStretchCosine !== null
    && row.direction.solvedForceVsElasticStretchCosine <= DIRECTION_ALIGNMENT_COSINE);
  const singleAxisOverCap = rows.filter((row) => row.capacity.singleAxisReferenceOverCap);
  const belowResolutionFloor = rows.filter((row) => row.resolution.referenceForceBelowHalfStepFloor);

  const directionCounterfactualComparable = rows.filter((row) =>
    row.vector.totalDisplacementDirectionCounterfactualRelativeError !== null);
  const directionCounterfactualWithinGoal = directionCounterfactualComparable.filter((row) =>
    row.vector.totalDisplacementDirectionCounterfactualRelativeError <= VECTOR_GOAL_RELATIVE);

  return {
    schema: 'm047-bm4l-stage2-accuracy-rca/v1',
    sourceIteration: {
      caseId: iteration.caseId,
      variant: iteration.variant,
      sourceAccdbSha256: iteration.sourceAccdbSha256,
      iterationSemanticHash: iteration.iterationSemanticHash,
      solverProfileId: iteration.solverProfileId,
      solutionStrategy: iteration.solutionStrategy,
    },
    rules: {
      vectorGoalRelative: VECTOR_GOAL_RELATIVE,
      referenceSurfaceBand: REFERENCE_SURFACE_BAND,
      directionAlignmentCosine: DIRECTION_ALIGNMENT_COSINE,
      governedFrictionStiffnessNPerM: GOVERNED_FRICTION_STIFFNESS_N_PER_M,
      printResolutionMm,
      displacementDerivedForceHalfStepN,
      regimeNormalization:
        'REFERENCE_SLID_MATCHES_SOLVER_SLIDING; REFERENCE_STUCK_MATCHES_SOLVER_STUCK_OR_LOCKED_AFTER_SLIP',
      counterfactualBoundary:
        'ROTATE_ONLY_THE_EXISTING_SOLVED_TANGENTIAL_MAGNITUDE_OPPOSITE_SOLVED_TOTAL_TANGENTIAL_DISPLACEMENT; DO_NOT_TREAT_AS_EQUILIBRIUM_OR_QUALIFICATION',
    },
    summary: {
      frictionRestraintCount: rows.length,
      baselineTangentialVectorsWithinGoal: iteration.summary?.tangentialVectorsWithinGoal ?? null,
      baselineTangentialVectorsCompared: iteration.summary?.tangentialVectorsCompared ?? null,
      rawRegimeMatchCount: rawMatches,
      constitutiveRegimeMatchCount: constitutiveMatches,
      genuineRegimeMismatchCount: rows.length - constitutiveMatches,
      overMobilizedCandidateCount: overMobilized.length,
      overMobilizedRestraintIds: overMobilized.map((row) => row.restraintId),
      prematureRelockCandidateCount: prematureRelock.length,
      prematureRelockRestraintIds: prematureRelock.map((row) => row.restraintId),
      directionDominatedFailureCount: directionDominated.length,
      directionDominatedRestraintIds: directionDominated.map((row) => row.restraintId),
      referenceForceOpposesReferenceTotalDisplacementCount: sourceDirectionMatches.length,
      solverForceOpposesElasticStretchCount: solverElasticMatches.length,
      totalDisplacementDirectionCounterfactualWithinGoal: directionCounterfactualWithinGoal.length,
      totalDisplacementDirectionCounterfactualCompared: directionCounterfactualComparable.length,
      singleAxisReferenceOverCapCount: singleAxisOverCap.length,
      singleAxisReferenceOverCapRestraintIds: singleAxisOverCap.map((row) => row.restraintId),
      referenceForceBelowDisplacementDerivedHalfStepFloorCount: belowResolutionFloor.length,
      referenceForceBelowDisplacementDerivedHalfStepFloorRestraintIds: belowResolutionFloor.map((row) => row.restraintId),
    },
    priority: buildPriority(rows, {
      sourceDirectionMatches,
      overMobilized,
      prematureRelock,
      singleAxisOverCap,
    }),
    rows,
  };
}

function analyzeRow(row, displacementDerivedForceHalfStepN) {
  const referenceForce = finiteVector(row.tangential?.referenceN);
  const solvedForce = finiteVector(row.tangential?.solvedN);
  const referenceDisplacement = nullableVector(row.tangentialDisplacement?.referenceM);
  const solvedDisplacement = finiteVector(row.tangentialDisplacement?.solvedM);
  const elasticStretch = finiteVector(row.tangentialDisplacement?.elasticStretchM);
  const referenceMagnitudeN = norm(referenceForce);
  const solvedMagnitudeN = norm(solvedForce);
  const vectorRelativeError = referenceMagnitudeN === 0
    ? null
    : norm(solvedForce.map((value, index) => value - referenceForce[index])) / referenceMagnitudeN;
  const magnitudeRelativeError = referenceMagnitudeN === 0
    ? null
    : Math.abs(solvedMagnitudeN - referenceMagnitudeN) / referenceMagnitudeN;

  const referenceForceVsReferenceTotalDisplacementCosine = cosine(referenceForce, referenceDisplacement);
  const solvedForceVsSolvedTotalDisplacementCosine = cosine(solvedForce, solvedDisplacement);
  const solvedForceVsElasticStretchCosine = cosine(solvedForce, elasticStretch);

  const counterfactual = oppositeDirectionWithMagnitude(solvedDisplacement, solvedMagnitudeN);
  const counterfactualError = counterfactual === null || referenceMagnitudeN === 0
    ? null
    : norm(counterfactual.map((value, index) => value - referenceForce[index])) / referenceMagnitudeN;

  const referenceState = String(row.regime?.reference ?? 'UNKNOWN');
  const solvedState = String(row.regime?.solved ?? 'UNKNOWN');
  const normalizedSolvedState = solvedState === 'SLIDING'
    ? 'SLID'
    : ['STUCK', 'LOCKED_AFTER_SLIP'].includes(solvedState) ? 'STUCK' : solvedState;
  const constitutiveMatch = referenceState === normalizedSolvedState;
  const referenceUtilisation = nullableNumber(row.regime?.referenceUtilisation);
  const solvedUtilisation = nullableNumber(row.regime?.solvedUtilisation);

  const overMobilizedCandidate = referenceState === 'STUCK'
    && normalizedSolvedState === 'SLID'
    && referenceUtilisation !== null
    && referenceUtilisation >= 0.9
    && referenceUtilisation < 1;
  const prematureRelockCandidate = referenceState === 'SLID'
    && normalizedSolvedState === 'STUCK';

  const singleAxisReferenceOverCap = Array.isArray(row.frictionDofs)
    && row.frictionDofs.length === 1
    && referenceUtilisation !== null
    && referenceUtilisation > 1 + REFERENCE_SURFACE_BAND;

  return {
    restraintId: row.restraintId,
    nodeId: row.nodeId,
    frictionDofs: row.frictionDofs,
    state: {
      reference: referenceState,
      solvedRaw: solvedState,
      solvedConstitutive: normalizedSolvedState,
      rawMatch: Boolean(row.regime?.match),
      constitutiveMatch,
      referenceUtilisation,
      solvedUtilisation,
      overMobilizedCandidate,
      prematureRelockCandidate,
    },
    normal: {
      referenceN: nullableNumber(row.normal?.referenceN),
      solvedN: nullableNumber(row.normal?.solvedN),
      percentError: nullableNumber(row.normal?.percentError),
    },
    capacity: {
      referenceN: nullableNumber(row.capacity?.referenceN),
      solvedN: nullableNumber(row.capacity?.solvedN),
      singleAxisReferenceOverCap,
    },
    vector: {
      referenceForceN: referenceForce,
      solvedForceN: solvedForce,
      referenceMagnitudeN,
      solvedMagnitudeN,
      vectorRelativeError,
      magnitudeRelativeError,
      directionDominatedFailure: vectorRelativeError !== null
        && vectorRelativeError > VECTOR_GOAL_RELATIVE
        && magnitudeRelativeError !== null
        && magnitudeRelativeError <= VECTOR_GOAL_RELATIVE,
      totalDisplacementDirectionCounterfactualForceN: counterfactual,
      totalDisplacementDirectionCounterfactualRelativeError: counterfactualError,
    },
    direction: {
      referenceTotalTangentialDisplacementM: referenceDisplacement,
      solvedTotalTangentialDisplacementM: solvedDisplacement,
      solvedElasticTangentialStretchM: elasticStretch,
      referenceForceVsReferenceTotalDisplacementCosine,
      solvedForceVsSolvedTotalDisplacementCosine,
      solvedForceVsElasticStretchCosine,
    },
    resolution: {
      displacementDerivedForceHalfStepN,
      referenceForceBelowHalfStepFloor: referenceMagnitudeN < displacementDerivedForceHalfStepN,
      halfStepToReferenceForceRatio: referenceMagnitudeN === 0
        ? null
        : displacementDerivedForceHalfStepN / referenceMagnitudeN,
      scope:
        'DIAGNOSTIC_OF_DISPLACEMENT_DERIVED_FRICTION_INFERENCE_ONLY; IT_DOES_NOT_WIDEN_THE_FORCE_COMPARISON_TOLERANCE',
    },
  };
}

function buildPriority(rows, context) {
  const twoDimensional = rows.filter((row) => row.frictionDofs?.length === 2);
  const sourceDirectionExact = twoDimensional.filter((row) =>
    row.direction.referenceForceVsReferenceTotalDisplacementCosine !== null
    && row.direction.referenceForceVsReferenceTotalDisplacementCosine <= DIRECTION_ALIGNMENT_COSINE);
  return [
    {
      order: 1,
      mechanism: 'DIRECTION_RULE_TOTAL_RELATIVE_DISPLACEMENT',
      status: sourceDirectionExact.length > 0 ? 'SOURCE_SIGNAL_PRESENT' : 'NOT_ESTABLISHED',
      evidence:
        `${sourceDirectionExact.length}/${twoDimensional.length} two-dimensional restraints have CAESAR reference force anti-parallel to reference total tangential displacement at cosine <= ${DIRECTION_ALIGNMENT_COSINE}.`,
      nextRun:
        'ONE_MECHANIC_VARIANT: for a sliding restraint, project the capped force opposite current total relative tangential displacement; retain all existing stiffness, cap, convergence and control gates.',
    },
    {
      order: 2,
      mechanism: 'STATE_PATH_AND_RELOCK_RULE',
      status: context.overMobilized.length + context.prematureRelock.length > 0 ? 'SOURCE_SIGNAL_PRESENT' : 'NOT_ESTABLISHED',
      evidence:
        `${context.overMobilized.length} reference-nonsliding restraints are solver-sliding while ${context.prematureRelock.length} reference-sliding restraints are solver-relocked.`,
      nextRun:
        'After direction is isolated, test the documented deleted-spring/state-stable strategy as a separately declared diagnostic; do not weaken qualification convergence gates.',
    },
    {
      order: 3,
      mechanism: 'CAPACITY_BASIS_OR_PARTITION',
      status: context.singleAxisOverCap.length > 0 ? 'SOURCE_SIGNAL_PRESENT' : 'NOT_ESTABLISHED',
      evidence:
        `${context.singleAxisOverCap.length} one-dimensional friction restraints exceed the current-case resultant mu|N| reference capacity beyond the 2% diagnostic surface band.`,
      nextRun:
        'Before changing the cap law, compare CAESAR reference |Ft| against mu|N| from the friction case and its frictionless twin; only then test resultant versus per-axis partition.',
    },
  ];
}

function oppositeDirectionWithMagnitude(vector, magnitude) {
  const vectorMagnitude = norm(vector);
  if (!(vectorMagnitude > 0) || !(magnitude >= 0)) return null;
  return vector.map((value) => -magnitude * value / vectorMagnitude);
}

function cosine(left, right) {
  if (left === null || right === null || left.length !== right.length) return null;
  const leftNorm = norm(left);
  const rightNorm = norm(right);
  if (!(leftNorm > 0) || !(rightNorm > 0)) return null;
  return clamp(dot(left, right) / (leftNorm * rightNorm), -1, 1);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function norm(values) {
  return Math.hypot(...values);
}

function finiteVector(value) {
  if (!Array.isArray(value) || value.length === 0 || !value.every((entry) => Number.isFinite(Number(entry)))) {
    throw new TypeError('RCA vector is missing or non-finite.');
  }
  return value.map(Number);
}

function nullableVector(value) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => entry === null)) return null;
  if (!value.every((entry) => Number.isFinite(Number(entry)))) return null;
  return value.map(Number);
}

function nullableNumber(value) {
  const number = Number(value);
  return value === null || value === undefined || !Number.isFinite(number) ? null : number;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) values.set(argv[index], argv[index + 1]);
  const iterationPath = values.get('--iteration');
  if (!iterationPath) throw new TypeError('Usage: --iteration <iteration.json> [--print-resolution-mm <mm>] [--out <rca.json>]');
  return {
    iterationPath,
    printResolutionMm: values.has('--print-resolution-mm') ? Number(values.get('--print-resolution-mm')) : 0.001,
    outPath: values.get('--out') ?? null,
  };
}

if (process.argv[1]?.endsWith('lfea-m047-stage2-accuracy-rca.mjs')) {
  const args = parseArgs(process.argv.slice(2));
  const iteration = JSON.parse(readFileSync(resolve(args.iterationPath), 'utf8'));
  const report = buildAccuracyRca(iteration, { printResolutionMm: args.printResolutionMm });
  const content = `${JSON.stringify(report, null, 2)}\n`;
  if (args.outPath === null) {
    process.stdout.write(content);
  } else {
    const output = resolve(args.outPath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content, 'utf8');
    process.stdout.write(`${output}\n`);
  }
}
