#!/usr/bin/env node
/**
 * M047 Stage 2 capacity-timing discriminator: accepted D1 direction plus
 * previous-iteration own-restraint normal in the Coulomb capacity.
 *
 * One mechanic changes relative to D1: from iteration 2 onward,
 *   capacity_i = mu * |N_{i-1}|
 * where N is the same restraint's own signed normal reaction. Iteration 1 has
 * no predecessor and therefore uses its current own normal as the deterministic
 * seed. Direction, stiffness, return map, active-set boundaries, acceleration,
 * convergence gates, maximum iterations, and comparison rules remain unchanged.
 */
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { buildD1SolverSource } from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const root = resolve(scriptsDir, '..');
const solverPath = resolve(root, 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath = resolve(scriptsDir, 'lfea-m047-stage2-friction-tuning-loop.mjs');

const VARIANT = 'D1-C2-previous-iteration-own-normal-capacity';
const PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-PREVIOUS-ITERATION-OWN-NORMAL-CAPACITY';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`C2 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`C2 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildLaggedNormalSolverSource(source) {
  let patched = buildD1SolverSource(source);

  patched = replaceExactly(
    patched,
    "  profileId: 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-TOTAL-DISPLACEMENT-DIRECTION',",
    `  profileId: '${PROFILE_ID}',`,
    'D1 profile id',
  );

  patched = replaceExactly(
    patched,
    "  capacityRule: 'BIDIRECTIONAL_SUPPORT_USES_NORMAL_REACTION_MAGNITUDE_V1',",
    "  capacityRule: 'PREVIOUS_NONLINEAR_ITERATION_OWN_NORMAL_REACTION_MAGNITUDE_C2_V1',",
    'capacity rule metadata',
  );

  patched = replaceExactly(
    patched,
    '    const measured = measureSupports({ plan, executed, states, slips, overlay, profile });',
    '    const measured = measureSupports({ plan, executed, states, slips, overlay, profile, previous });',
    'measureSupports previous-iteration argument',
  );

  patched = replaceExactly(
    patched,
    '  const { plan, executed, states, slips, overlay, profile } = input;',
    '  const { plan, executed, states, slips, overlay, profile, previous } = input;',
    'measureSupports input destructuring',
  );

  patched = replaceExactly(
    patched,
`  const reactions = new Map(executed.execution.reactions
    .map((entry) => [\`${'${entry.nodeId}:${entry.dof}'}\`, entry.value]));
  const appliedByNode = new Map(overlay.nodalLoads.map((load) => [String(load.nodeId), load.force]));`,
`  const reactions = new Map(executed.execution.reactions
    .map((entry) => [\`${'${entry.nodeId}:${entry.dof}'}\`, entry.value]));
  const previousReactions = previous === null
    ? null
    : new Map(previous.execution.reactions.map((entry) => [\`${'${entry.nodeId}:${entry.dof}'}\`, entry.value]));
  const appliedByNode = new Map(overlay.nodalLoads.map((load) => [String(load.nodeId), load.force]));`,
    'previous reaction map',
  );

  patched = replaceExactly(
    patched,
`    const normalReaction = reactions.get(\`${'${support.nodeId}:${normalDof}'}\`) ?? 0;
    const signedNormalProjection = normalReaction * support.normalUnitVector[normalIndex];
    const normalMagnitude = Math.abs(signedNormalProjection);
    const capacityN = support.coefficientOfFriction * normalMagnitude;`,
`    const normalReaction = reactions.get(\`${'${support.nodeId}:${normalDof}'}\`) ?? 0;
    const signedNormalProjection = normalReaction * support.normalUnitVector[normalIndex];
    const normalMagnitude = Math.abs(signedNormalProjection);
    // C2 capacity timing only: iteration 1 has no predecessor and seeds from the
    // current own normal. From iteration 2 onward, use the immediately previous
    // nonlinear iterate's reaction of this same restraint/direction.
    const capacityNormalReaction = previousReactions === null
      ? normalReaction
      : (previousReactions.get(\`${'${support.nodeId}:${normalDof}'}\`) ?? 0);
    const capacitySignedNormalProjection = capacityNormalReaction * support.normalUnitVector[normalIndex];
    const capacityNormalMagnitude = Math.abs(capacitySignedNormalProjection);
    const capacityN = support.coefficientOfFriction * capacityNormalMagnitude;`,
    'capacity normal timing',
  );

  patched = replaceExactly(
    patched,
`        normalReactionComponentN: normalReaction,
        signedNormalProjectionN: signedNormalProjection,
        normalReactionMagnitudeN: normalMagnitude,
        coefficientOfFriction: support.coefficientOfFriction,`,
`        normalReactionComponentN: normalReaction,
        signedNormalProjectionN: signedNormalProjection,
        normalReactionMagnitudeN: normalMagnitude,
        capacityNormalTimingRule: previousReactions === null
          ? 'CURRENT_OWN_NORMAL_SEED_ITERATION_1'
          : 'PREVIOUS_NONLINEAR_ITERATION_OWN_NORMAL_C2_V1',
        capacityNormalReactionComponentN: capacityNormalReaction,
        capacitySignedNormalProjectionN: capacitySignedNormalProjection,
        capacityNormalMagnitudeN: capacityNormalMagnitude,
        coefficientOfFriction: support.coefficientOfFriction,`,
    'capacity timing ledger',
  );

  return patched;
}

function parseArguments(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError('Expected --name value pairs.');
    args.set(argv[i], argv[i + 1]);
  }
  const accdbPath = args.get('--accdb');
  if (!accdbPath) throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--out <json>]');
  return {
    accdbPath,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
  };
}

async function runExperiment(input) {
  const token = `${process.pid}-${Date.now()}`;
  const solverName = `caesar-accdb-friction-solve.d1-c2-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.d1-c2-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);
  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildLaggedNormalSolverSource(originalSolver);
  const originalTuning = readFileSync(tuningPath, 'utf8');
  const patchedTuning = replaceExactly(
    originalTuning,
    '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js',
    `../src/core/fea-benchmarks/${solverName}`,
    'tuning-loop solver import',
  );
  const solverSha256 = createHash('sha256').update(patchedSolver).digest('hex');
  try {
    writeFileSync(tempSolverPath, patchedSolver, 'utf8');
    writeFileSync(tempTuningPath, patchedTuning, 'utf8');
    const { runFrictionTuningIteration } = await import(`${pathToFileURL(tempTuningPath).href}?c2=${token}`);
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      caseId: input.caseId,
      variant: VARIANT,
      maxIterations: input.maxIterations,
    });
    if (record.solverProfileId !== PROFILE_ID) {
      throw new Error(`C2 profile guard failed: expected ${PROFILE_ID}, got ${record.solverProfileId}.`);
    }
    const published = {
      ...record,
      c2Evidence: {
        experimentId: VARIANT,
        changedMechanic: 'COULOMB_CAPACITY_NORMAL_TIMING_ONLY',
        capacityRule: 'ITERATION_1_CURRENT_OWN_NORMAL_SEED_THEN_PREVIOUS_ITERATION_OWN_NORMAL',
        currentNormalStillReported: true,
        unchangedMechanics: [
          'D1_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT_DIRECTION',
          'FRICTION_STIFFNESS',
          'OWN_RESTRAINT_NORMAL_DEFINITION',
          'RETURN_MAPPED_SLIP_OFFSET_FORM',
          'STATE_BOUNDARIES_AND_HYSTERESIS',
          'SLIP_ACCELERATION',
          'MAXIMUM_ITERATIONS_400',
          'CONVERGENCE_GATES',
          'ACCURACY_COMPARISON_RULES',
        ],
        ephemeralSolverSha256: solverSha256,
        productionSolverModified: false,
      },
    };
    if (input.outPath !== null) {
      const out = resolve(input.outPath);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, `${canonicalPrettyStringify(published)}\n`, 'utf8');
    }
    process.stdout.write([
      `variant           ${VARIANT}`,
      `solver profile    ${record.solverProfileId}`,
      `source ACCDB      ${record.sourceAccdbSha256}`,
      `patched solver    ${solverSha256}`,
      `converged         ${record.converged}`,
      ...(record.summary ? [
        `vectors within +-10% ${record.summary.tangentialVectorsWithinGoal}/${record.summary.tangentialVectorsCompared}`,
        `normals within +-10% ${record.summary.normalWithinGoal}/${record.summary.frictionRestraintCount}`,
        `worst vector error   ${(100 * record.summary.tangentialWorstRelativeError).toFixed(3)}%`,
      ] : [
        `iterations        ${record.failure?.iterationCount ?? 'n/a'}`,
        `failed gates      ${JSON.stringify(record.failure?.lastFailedGates ?? null)}`,
      ]),
      input.outPath ? `artifact          ${resolve(input.outPath)}` : '',
    ].filter(Boolean).join('\n') + '\n');
    return published;
  } finally {
    rmSync(tempTuningPath, { force: true });
    rmSync(tempSolverPath, { force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await runExperiment(parseArguments(process.argv.slice(2)));
}

export { PROFILE_ID, VARIANT, buildLaggedNormalSolverSource, runExperiment };
