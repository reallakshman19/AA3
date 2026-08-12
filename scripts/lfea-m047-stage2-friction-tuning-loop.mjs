#!/usr/bin/env node
/**
 * M047 Stage 2 friction tuning loop.
 *
 * One iteration of engineering work on the friction law is: solve one friction
 * case on the pinned ACCDB, attribute every restraint's error against CAESAR,
 * change exactly one declared mechanic, and measure again. This script is that
 * measurement step, so successive iterations are comparable instead of anecdotal.
 *
 * What it reports per friction restraint:
 *   - CAESAR normal reaction and tangential resultant, and the same from the solve;
 *   - the Coulomb capacity each side implies, and the utilisation ratio;
 *   - the regime each side is in (`SLID` when the tangential resultant sits on the
 *     capacity, `STUCK` when it is below it), so a regime mismatch is visible
 *     before any percentage is discussed;
 *   - per-component and vector errors against the +-10% goal.
 *
 * What it deliberately does not do: touch a tolerance, a comparison rule or a
 * convergence limit. The `variant` field records which declared mechanic was in
 * force for the run, so a change of mechanics is attributable and a change of
 * acceptance criteria is impossible here.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-friction-tuning-loop.mjs --accdb <BM4_L.ACCDB>
 *     [--case L13] [--variant <label>] [--max-iterations <n>]
 *     [--stiffness-scale <x>] [--out <iteration.json>] [--compare <previous.json>]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import {
  CAESAR_FRICTION_SOLVER_PROFILE,
  solveCaesarAccdbFrictionBenchmark,
} from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const GOAL_RELATIVE = 0.1;
/** A tangential resultant this close to the capacity is on the Coulomb surface. */
const REGIME_SURFACE_TOLERANCE = 0.02;

/** Run one measured iteration for one friction case. */
export async function runFrictionTuningIteration(input) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const solverProfile = input.maxIterations === undefined
    ? CAESAR_FRICTION_SOLVER_PROFILE
    : { ...CAESAR_FRICTION_SOLVER_PROFILE, maximumIterations: Number(input.maxIterations) };
  const started = Date.now();
  let actual = null;
  let failure = null;
  try {
    actual = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, [input.caseId], {
      profile: solverProfile,
      frictionStiffnessScale: input.stiffnessScale ?? 1,
    });
  } catch (error) {
    failure = {
      message: error.message,
      code: error.code ?? null,
      iterationCount: error.iterations?.length ?? null,
      stateChangesPerIteration: (error.iterations ?? []).map((entry) => entry.stateChangeCount),
      lastFailedGates: error.iterations?.at(-1)?.failedGates ?? null,
      lastFailedGateEvidence: error.iterations?.at(-1)?.failedGateEvidence ?? null,
      failedGateHistogram: histogram((error.iterations ?? []).flatMap((entry) => entry.failedGates ?? [])),
      displacementUpdateTail: (error.iterations ?? []).slice(-8).map((entry) => entry.displacementUpdateNormM),
      reactionUpdateTail: (error.iterations ?? []).slice(-8).map((entry) => entry.reactionUpdateNormN),
    };
  }
  const elapsedMs = Date.now() - started;
  const record = {
    schema: 'm047-bm4l-stage2-friction-tuning-iteration/v1',
    variant: input.variant ?? 'UNLABELLED',
    caseId: input.caseId,
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    solverProfileId: solverProfile.profileId,
    solutionStrategy: solverProfile.solutionStrategy,
    frictionStiffnessScale: input.stiffnessScale ?? 1,
    elapsedMs,
    converged: failure === null,
    failure,
    restraints: failure === null
      ? compareRestraints({ benchmarkPackage, actual, caseId: input.caseId })
      : null,
  };
  record.summary = record.restraints === null ? null : summarize(record.restraints);
  return Object.freeze({ ...record, iterationSemanticHash: semanticHash(record) });
}

function histogram(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([, left], [, right]) => right - left));
}

/** Attribute the friction result restraint by restraint against CAESAR. */
function compareRestraints({ benchmarkPackage, actual, caseId }) {
  const reference = vectorsByNode(benchmarkPackage.references[caseId].rows);
  const referenceDisplacements = vectorsByNode(
    benchmarkPackage.references[caseId].rows,
    ['DISPLACEMENT', 'ROTATION'],
  );
  const solved = vectorsByNode(actual.cases[caseId].rows);
  const evidence = actual.mechanics.cases[caseId];
  const supports = evidence.iterations.at(-1).supports;
  return supports.map((support) => {
    const referenceVector = reference.get(support.nodeId) ?? {};
    const referenceDisplacement = referenceDisplacements.get(support.nodeId) ?? {};
    const solvedVector = solved.get(support.nodeId) ?? {};
    const tangentialComponents = support.frictionDofs;
    const referenceTangential = tangentialComponents.map((dof) => referenceVector[dof] ?? 0);
    const solvedTangential = tangentialComponents.map((dof) => solvedVector[dof] ?? 0);
    const referenceNormal = Math.abs(referenceVector[support.normalDof] ?? 0);
    const referenceCapacity = support.coefficientOfFriction * referenceNormal;
    const referenceMagnitude = norm(referenceTangential);
    const solvedMagnitude = norm(solvedTangential);
    const referenceRegime = referenceCapacity === 0
      ? 'NONE'
      : referenceMagnitude >= referenceCapacity * (1 - REGIME_SURFACE_TOLERANCE) ? 'SLID' : 'STUCK';
    return {
      restraintId: support.restraintId,
      nodeId: support.nodeId,
      nodeName: support.nodeName,
      normalDof: support.normalDof,
      frictionDofs: tangentialComponents,
      coefficientOfFriction: support.coefficientOfFriction,
      normal: {
        referenceN: referenceNormal,
        solvedN: support.normalReactionMagnitudeN,
        percentError: percentError(support.normalReactionMagnitudeN, referenceNormal),
      },
      capacity: {
        referenceN: referenceCapacity,
        solvedN: support.capacityN,
        percentError: percentError(support.capacityN, referenceCapacity),
      },
      tangential: {
        referenceN: referenceTangential,
        solvedN: solvedTangential,
        referenceMagnitudeN: referenceMagnitude,
        solvedMagnitudeN: solvedMagnitude,
        componentPercentErrors: tangentialComponents.map((dof, index) =>
          percentError(solvedTangential[index], referenceTangential[index])),
        vectorErrorN: norm(solvedTangential.map((value, index) => value - referenceTangential[index])),
        vectorRelativeError: referenceMagnitude === 0
          ? null
          : norm(solvedTangential.map((value, index) => value - referenceTangential[index])) / referenceMagnitude,
      },
      tangentialDisplacement: {
        // Stick or slide at these supports is decided by microns: at k_f = 1e8 N/m
        // a 7 um elastic stretch is already 700 N, and CAESAR prints displacement
        // to 0.01 mm. The drag the two solvers see is therefore compared directly.
        referenceM: tangentialComponents.map((dof) => referenceDisplacement[`U${dof.slice(1)}`] ?? null),
        solvedM: [...support.relativeTangentialDisplacementM],
        accumulatedSlipM: [...support.accumulatedSlipM],
        elasticStretchM: [...support.elasticTangentialStretchM],
        trialMagnitudeN: support.trialTangentialSpringForceMagnitudeN,
      },
      regime: {
        reference: referenceRegime,
        solved: support.regime,
        match: referenceRegime === support.regime,
        referenceUtilisation: referenceCapacity === 0 ? null : referenceMagnitude / referenceCapacity,
        solvedUtilisation: support.capacityN === 0 ? null : solvedMagnitude / support.capacityN,
      },
    };
  }).sort((left, right) => (right.tangential.vectorRelativeError ?? 0) - (left.tangential.vectorRelativeError ?? 0));
}

function summarize(restraints) {
  const withReference = restraints.filter((row) => row.tangential.vectorRelativeError !== null);
  const within = withReference.filter((row) => row.tangential.vectorRelativeError <= GOAL_RELATIVE);
  const regimeMismatch = restraints.filter((row) => !row.regime.match);
  const normalWithin = restraints.filter((row) => row.normal.percentError !== null
    && Math.abs(row.normal.percentError) <= GOAL_RELATIVE * 100);
  return {
    goalRelative: GOAL_RELATIVE,
    frictionRestraintCount: restraints.length,
    tangentialVectorsCompared: withReference.length,
    tangentialVectorsWithinGoal: within.length,
    tangentialWorstRelativeError: withReference.length === 0
      ? null
      : Math.max(...withReference.map((row) => row.tangential.vectorRelativeError)),
    normalWithinGoal: normalWithin.length,
    normalWorstPercentError: Math.max(...restraints.map((row) => Math.abs(row.normal.percentError ?? 0))),
    regimeMismatchCount: regimeMismatch.length,
    regimeMismatches: regimeMismatch.map((row) => ({
      restraintId: row.restraintId,
      reference: row.regime.reference,
      solved: row.regime.solved,
      referenceUtilisation: row.regime.referenceUtilisation,
      solvedUtilisation: row.regime.solvedUtilisation,
    })),
  };
}

function vectorsByNode(rows, quantities = ['FORCE', 'MOMENT']) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || !quantities.includes(row.quantity)) continue;
    const vector = map.get(String(row.entityId)) ?? {};
    vector[row.component] = Number(row.value);
    map.set(String(row.entityId), vector);
  }
  return map;
}

function percentError(solved, reference) {
  if (reference === 0) return null;
  return ((solved - reference) / Math.abs(reference)) * 100;
}

function norm(values) {
  return Math.hypot(...values);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const accepted = new Map();
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 2) accepted.set(argv[index], argv[index + 1]);
  const accdbPath = accepted.get('--accdb');
  if (!accdbPath) throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--case L13] [--variant <label>] [--max-iterations <n>] [--stiffness-scale <x>] [--out <json>] [--compare <json>]');
  const record = await runFrictionTuningIteration({
    accdbPath,
    caseId: accepted.get('--case') ?? 'L13',
    variant: accepted.get('--variant'),
    maxIterations: accepted.get('--max-iterations'),
    stiffnessScale: accepted.has('--stiffness-scale') ? Number(accepted.get('--stiffness-scale')) : undefined,
  });
  const outPath = accepted.get('--out') ?? null;
  if (outPath !== null) {
    mkdirSync(dirname(resolve(outPath)), { recursive: true });
    writeFileSync(resolve(outPath), `${canonicalPrettyStringify(record)}\n`, 'utf8');
  }
  process.stdout.write(`${textReport(record, accepted.get('--compare'))}\n`);
}

/** Human-readable iteration report, worst restraint first. */
function textReport(record, comparePath) {
  const lines = [
    `variant           ${record.variant}`,
    `case              ${record.caseId}`,
    `strategy          ${record.solutionStrategy}`,
    `stiffness scale   ${record.frictionStiffnessScale}`,
    `elapsed           ${(record.elapsedMs / 1000).toFixed(1)} s`,
    `converged         ${record.converged}`,
  ];
  if (!record.converged) {
    lines.push(
      `failure           ${record.failure.message}`,
      `iterations        ${record.failure.iterationCount}`,
      `state changes     ${record.failure.stateChangesPerIteration.slice(0, 12).join(',')}…`,
      `failed gates      ${JSON.stringify(record.failure.lastFailedGates)}`,
      `gate histogram    ${JSON.stringify(record.failure.failedGateHistogram)}`,
      `gate evidence     ${JSON.stringify(record.failure.lastFailedGateEvidence).slice(0, 900)}`,
      `disp update tail  ${record.failure.displacementUpdateTail.map((value) => Number(value).toExponential(2)).join(', ')}`,
      `react update tail ${record.failure.reactionUpdateTail.map((value) => Number(value).toExponential(2)).join(', ')}`,
    );
    return lines.join('\n');
  }
  const summary = record.summary;
  lines.push(
    `friction restraints ${summary.frictionRestraintCount}`,
    `tangential vectors within +-10%  ${summary.tangentialVectorsWithinGoal}/${summary.tangentialVectorsCompared}`,
    `worst tangential vector error    ${(summary.tangentialWorstRelativeError * 100).toFixed(1)}%`,
    `normal reactions within +-10%    ${summary.normalWithinGoal}/${summary.frictionRestraintCount}`,
    `worst normal error               ${summary.normalWorstPercentError.toFixed(1)}%`,
    `regime mismatches                ${summary.regimeMismatchCount}`,
    '',
    'restraint                    regime ref/solved   |N| ref     |N| solved   err%    |Ft| ref    |Ft| solved  vec err%',
  );
  for (const row of record.restraints) {
    lines.push([
      row.restraintId.padEnd(28),
      `${row.regime.reference}/${row.regime.solved}`.padEnd(19),
      row.normal.referenceN.toFixed(1).padStart(10),
      row.normal.solvedN.toFixed(1).padStart(12),
      (row.normal.percentError === null ? 'n/a' : row.normal.percentError.toFixed(1)).padStart(7),
      row.tangential.referenceMagnitudeN.toFixed(1).padStart(11),
      row.tangential.solvedMagnitudeN.toFixed(1).padStart(12),
      (row.tangential.vectorRelativeError === null
        ? 'n/a'
        : (row.tangential.vectorRelativeError * 100).toFixed(1)).padStart(9),
    ].join(' '));
  }
  lines.push(
    '',
    'restraint                    drag ref (mm)        drag solved (mm)     slip (mm)            trial N',
  );
  for (const row of record.restraints) {
    lines.push([
      row.restraintId.padEnd(28),
      row.tangentialDisplacement.referenceM
        .map((value) => (value === null ? 'n/a' : (value * 1000).toFixed(3))).join('/').padStart(20),
      row.tangentialDisplacement.solvedM.map((value) => (value * 1000).toFixed(3)).join('/').padStart(20),
      row.tangentialDisplacement.accumulatedSlipM.map((value) => (value * 1000).toFixed(3)).join('/').padStart(20),
      row.tangentialDisplacement.trialMagnitudeN.toFixed(1).padStart(10),
    ].join(' '));
  }
  if (comparePath !== undefined && comparePath !== null) {
    const previous = JSON.parse(readFileSync(resolve(comparePath), 'utf8'));
    lines.push(
      '',
      `previous variant ${previous.variant}: within goal ${previous.summary?.tangentialVectorsWithinGoal ?? 'n/a'}`
      + `/${previous.summary?.tangentialVectorsCompared ?? 'n/a'}, `
      + `worst ${previous.summary === null ? 'n/a' : (previous.summary.tangentialWorstRelativeError * 100).toFixed(1)}%, `
      + `regime mismatches ${previous.summary?.regimeMismatchCount ?? 'n/a'}`,
    );
  }
  return lines.join('\n');
}
