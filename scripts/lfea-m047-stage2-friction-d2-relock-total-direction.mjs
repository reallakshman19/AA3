#!/usr/bin/env node
/**
 * M047 Stage 2 D2 experiment: extend the accepted D1 total-displacement direction
 * rule to post-breakaway restraints that have re-locked below the Coulomb cap.
 *
 * Baseline: accepted measured D1. One additional mechanic only:
 *   for nextState=STICK with nonzero accumulated slip, preserve the current
 *   elastic trial-force magnitude but orient that force opposite the current
 *   total relative tangential displacement, then choose the slip offset that
 *   realizes that force with the same retained tangential spring.
 *
 * State boundaries, cap magnitude, normal basis, stiffness, acceleration,
 * convergence gates and qualified linear mechanics are unchanged. Production is
 * not edited; the transformed solver exists only for this run.
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

const D2_VARIANT = 'D2-relocked-total-relative-tangential-displacement-direction';
const D2_PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-D2-RELOCK-TOTAL-DIRECTION';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`D2 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`D2 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildD2SolverSource(source) {
  let patched = buildD1SolverSource(source);
  patched = replaceExactly(
    patched,
    `  profileId: '${D1_PROFILE_ID}',`,
    `  profileId: '${D2_PROFILE_ID}',`,
    'D1 solver profile id',
  );
  patched = replaceExactly(
    patched,
    `    const cappedForce = nextState === 'SLIDE'
      && tangentialMotion > profile.zeroTangentialMotionFloorM
      ? tangentialDisplacement.map((value) => -capacityN * value / tangentialMotion)
      : null;
    const nextSlip = cappedForce !== null
      ? tangentialDisplacement.map((value, index) => value + cappedForce[index] / stiffness)
      : [...slip];`,
    `    const cappedForce = nextState === 'SLIDE'
      && tangentialMotion > profile.zeroTangentialMotionFloorM
      ? tangentialDisplacement.map((value) => -capacityN * value / tangentialMotion)
      : null;
    // D2 adds one rule to accepted D1: if a restraint has already slipped and is
    // now below the cap, preserve its elastic trial magnitude but orient that
    // re-locked force opposite current total relative tangential displacement.
    // The slip offset is then the kinematic value that realizes exactly that
    // force with the same retained spring. No cap/state/tolerance is changed.
    const relockedDirectionForce = nextState === 'STICK'
      && norm(slip) > profile.zeroTangentialMotionFloorM
      && tangentialMotion > profile.zeroTangentialMotionFloorM
      && trialMagnitude > 0
      ? tangentialDisplacement.map((value) => -trialMagnitude * value / tangentialMotion)
      : null;
    const nextSlip = cappedForce !== null
      ? tangentialDisplacement.map((value, index) => value + cappedForce[index] / stiffness)
      : relockedDirectionForce !== null
        ? tangentialDisplacement.map((value, index) => value + relockedDirectionForce[index] / stiffness)
        : [...slip];`,
    'D1 return-map projection',
  );
  return patched;
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Expected --name value pairs; got ${String(key)} ${String(value)}.`);
    }
    args.set(key, value);
  }
  const accdbPath = args.get('--accdb');
  if (!accdbPath) throw new TypeError('D2 requires --accdb <BM4_L.ACCDB>.');
  return {
    accdbPath,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    profilePath: args.get('--profile'),
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
    stiffnessScale: args.has('--stiffness-scale') ? Number(args.get('--stiffness-scale')) : undefined,
  };
}

async function runD2(input) {
  const token = `${process.pid}-${Date.now()}`;
  const solverName = `caesar-accdb-friction-solve.d2-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.d2-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);
  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildD2SolverSource(originalSolver);
  const originalTuning = readFileSync(tuningPath, 'utf8');
  const patchedTuning = replaceExactly(
    originalTuning,
    '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js',
    `../src/core/fea-benchmarks/${solverName}`,
    'tuning-loop solver import',
  );
  const patchSha256 = createHash('sha256').update(patchedSolver).digest('hex');
  try {
    writeFileSync(tempSolverPath, patchedSolver, 'utf8');
    writeFileSync(tempTuningPath, patchedTuning, 'utf8');
    const { runFrictionTuningIteration } = await import(
      `${pathToFileURL(tempTuningPath).href}?d2=${encodeURIComponent(token)}`
    );
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath,
      caseId: input.caseId,
      variant: D2_VARIANT,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });
    if (record.solverProfileId !== D2_PROFILE_ID) {
      throw new Error(`D2 source guard failed: expected ${D2_PROFILE_ID}, got ${record.solverProfileId}.`);
    }
    const published = {
      ...record,
      d2Evidence: {
        experimentId: D2_VARIANT,
        baseline: 'ACCEPTED_D1_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT_DIRECTION',
        changedMechanic: 'POST_BREAKAWAY_RELOCK_FORCE_DIRECTION_ONLY',
        rule: 'PRESERVE_RELOCKED_TRIAL_MAGNITUDE_BUT_OPPOSE_CURRENT_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT',
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
      `variant           ${D2_VARIANT}`,
      `case              ${published.caseId}`,
      `solver profile    ${published.solverProfileId}`,
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

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await runD2(parseArguments(process.argv.slice(2)));
}

export { D2_PROFILE_ID, D2_VARIANT, buildD2SolverSource, runD2 };
