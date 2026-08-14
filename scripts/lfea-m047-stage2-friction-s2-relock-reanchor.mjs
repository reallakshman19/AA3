#!/usr/bin/env node
/**
 * M047 Stage 2 S2 experiment: re-anchor the tangential spring when a D1 sliding
 * restraint re-locks below the cap.
 *
 * Baseline: accepted measured D1. One additional state-path mechanic only:
 * when state transitions SLIDE -> STICK, set the retained spring's slip reference
 * to the current total tangential displacement so the re-engaged spring starts
 * unstressed. Subsequent sticking uses the normal retained-spring law.
 *
 * D1 sliding direction, breakaway/re-lock thresholds, cap magnitude, normal basis,
 * stiffness, acceleration, convergence gates and linear mechanics are frozen.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { buildD1SolverSource, D1_PROFILE_ID } from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const root = resolve(scriptsDir, '..');
const solverPath = resolve(root, 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath = resolve(scriptsDir, 'lfea-m047-stage2-friction-tuning-loop.mjs');

const S2_VARIANT = 'S2-relock-spring-reanchor-at-current-position';
const S2_PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-S2-RELOCK-REANCHOR';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`S2 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`S2 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildS2SolverSource(source) {
  let patched = buildD1SolverSource(source);
  patched = replaceExactly(
    patched,
    `  profileId: '${D1_PROFILE_ID}',`,
    `  profileId: '${S2_PROFILE_ID}',`,
    'D1 solver profile id',
  );
  patched = replaceExactly(
    patched,
    `    const nextSlip = cappedForce !== null
      ? tangentialDisplacement.map((value, index) => value + cappedForce[index] / stiffness)
      : [...slip];`,
    `    // S2 adds one state-path rule to accepted D1. A spring that was on the
    // Coulomb surface and now re-locks is reintroduced at the current position,
    // initially unstressed, instead of inheriting the old sliding reference.
    // Once re-locked, ordinary sticking again keeps that new reference fixed.
    const relockReanchor = state === 'SLIDE' && nextState === 'STICK';
    const nextSlip = cappedForce !== null
      ? tangentialDisplacement.map((value, index) => value + cappedForce[index] / stiffness)
      : relockReanchor
        ? [...tangentialDisplacement]
        : [...slip];`,
    'D1 next-slip mapping',
  );
  return patched;
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Expected --name value pairs; got ${String(key)} ${String(value)}.`);
    args.set(key, value);
  }
  const accdbPath = args.get('--accdb');
  if (!accdbPath) throw new TypeError('S2 requires --accdb <BM4_L.ACCDB>.');
  return {
    accdbPath,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    profilePath: args.get('--profile'),
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
    stiffnessScale: args.has('--stiffness-scale') ? Number(args.get('--stiffness-scale')) : undefined,
  };
}

async function runS2(input) {
  const token = `${process.pid}-${Date.now()}`;
  const solverName = `caesar-accdb-friction-solve.s2-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.s2-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);
  const patchedSolver = buildS2SolverSource(readFileSync(solverPath, 'utf8'));
  const patchedTuning = replaceExactly(
    readFileSync(tuningPath, 'utf8'),
    '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js',
    `../src/core/fea-benchmarks/${solverName}`,
    'tuning-loop solver import',
  );
  const patchSha256 = createHash('sha256').update(patchedSolver).digest('hex');
  try {
    writeFileSync(tempSolverPath, patchedSolver, 'utf8');
    writeFileSync(tempTuningPath, patchedTuning, 'utf8');
    const { runFrictionTuningIteration } = await import(`${pathToFileURL(tempTuningPath).href}?s2=${encodeURIComponent(token)}`);
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath,
      caseId: input.caseId,
      variant: S2_VARIANT,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });
    if (record.solverProfileId !== S2_PROFILE_ID) throw new Error(`S2 source guard failed: expected ${S2_PROFILE_ID}, got ${record.solverProfileId}.`);
    const published = {
      ...record,
      s2Evidence: {
        experimentId: S2_VARIANT,
        baseline: 'ACCEPTED_D1_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT_DIRECTION',
        changedMechanic: 'RELOCK_SPRING_REFERENCE_ONLY',
        rule: 'ON_SLIDE_TO_STICK_REANCHOR_RETAINED_TANGENTIAL_SPRING_AT_CURRENT_POSITION_ZERO_INITIAL_ELASTIC_FORCE',
        unchangedMechanics: [
          'D1_SLIDING_DIRECTION', 'FRICTION_STIFFNESS', 'COULOMB_CAP_MAGNITUDE',
          'NORMAL_REACTION_BASIS', 'STATE_BOUNDARIES', 'ACCELERATION',
          'CONVERGENCE_LIMITS', 'QUALIFIED_LINEAR_MECHANICS',
        ],
        ephemeralSolverSha256: patchSha256,
        productionSolverModified: false,
      },
    };
    if (input.outPath !== null) {
      const out = resolve(input.outPath);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, `${canonicalPrettyStringify(published)}\n`, 'utf8');
    }
    process.stdout.write([
      `variant           ${S2_VARIANT}`,
      `case              ${published.caseId}`,
      `source ACCDB      ${published.sourceAccdbSha256}`,
      `patched solver    ${patchSha256}`,
      `converged         ${published.converged}`,
      ...(published.summary === null ? [] : [
        `tangential vectors within +-10% ${published.summary.tangentialVectorsWithinGoal}/${published.summary.tangentialVectorsCompared}`,
        `normal reactions within +-10%   ${published.summary.normalWithinGoal}/${published.summary.frictionRestraintCount}`,
        `worst vector relative error      ${published.summary.tangentialWorstRelativeError}`,
      ]),
      input.outPath === null ? '' : `artifact          ${resolve(input.outPath)}`,
    ].filter(Boolean).join('\n') + '\n');
    return published;
  } finally {
    for (const path of [tempTuningPath, tempSolverPath]) {
      try { rmSync(path, { force: true }); } catch { /* cleanup only */ }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) await runS2(parseArguments(process.argv.slice(2)));

export { S2_PROFILE_ID, S2_VARIANT, buildS2SolverSource, runS2 };
