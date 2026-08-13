#!/usr/bin/env node
/**
 * M047 Stage 2 sequential S1 experiment on accepted D1 baseline.
 *
 * D1 direction is inherited unchanged. The sole additional mechanic is state-path
 * memory: once a restraint enters SLIDE in a primitive static case, it cannot
 * re-lock during that case. Production source is never edited.
 */
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import {
  buildD1SolverSource,
  D1_PROFILE_ID,
  D1_VARIANT,
} from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const root = resolve(scriptsDir, '..');
const solverPath = resolve(root, 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath = resolve(scriptsDir, 'lfea-m047-stage2-friction-tuning-loop.mjs');

const D1_S1_VARIANT = 'D1-S1-no-relock-after-breakaway';
const D1_S1_PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-S1-NO-RELOCK';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`D1+S1 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`D1+S1 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildD1S1SolverSource(source) {
  let patched = buildD1SolverSource(source);
  patched = replaceExactly(
    patched,
    `  profileId: '${D1_PROFILE_ID}',`,
    `  profileId: '${D1_S1_PROFILE_ID}',`,
    'D1 solver profile id',
  );
  patched = replaceExactly(
    patched,
    "  stateBoundaryRule: 'SLIDE_IMMEDIATELY_ABOVE_CAP_RETURN_TO_STICK_ONLY_BELOW_CAP_TIMES_ONE_MINUS_H_V1',",
    "  stateBoundaryRule: 'D1_S1_SLIDE_IMMEDIATELY_ABOVE_CAP_AND_DO_NOT_RELOCK_WITHIN_STATIC_CASE_V1',",
    'state-path rule metadata',
  );
  patched = replaceExactly(
    patched,
    `    const nextState = trialMagnitude > capacityN + boundary
      ? 'SLIDE'
      : trialMagnitude < capacityN - boundary - band
        ? 'STICK'
        : state;`,
    `    // Sequential S1 mechanic on accepted D1 baseline. Initial breakaway is
    // unchanged; only re-lock is disabled after a restraint has entered SLIDE.
    const nextState = state === 'SLIDE'
      ? 'SLIDE'
      : trialMagnitude > capacityN + boundary
        ? 'SLIDE'
        : trialMagnitude < capacityN - boundary - band
          ? 'STICK'
          : state;`,
    'stick-slide transition',
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
  if (!accdbPath) throw new TypeError('D1+S1 requires --accdb <BM4_L.ACCDB>.');
  return {
    accdbPath,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    profilePath: args.get('--profile'),
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
    stiffnessScale: args.has('--stiffness-scale') ? Number(args.get('--stiffness-scale')) : undefined,
  };
}

async function runD1S1(input) {
  const token = `${process.pid}-${Date.now()}`;
  const solverName = `caesar-accdb-friction-solve.d1-s1-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.d1-s1-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);

  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildD1S1SolverSource(originalSolver);
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
    const moduleUrl = `${pathToFileURL(tempTuningPath).href}?d1s1=${encodeURIComponent(token)}`;
    const { runFrictionTuningIteration } = await import(moduleUrl);
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath,
      caseId: input.caseId,
      variant: D1_S1_VARIANT,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });
    if (record.solverProfileId !== D1_S1_PROFILE_ID) {
      throw new Error(`D1+S1 source guard failed: expected ${D1_S1_PROFILE_ID}, got ${record.solverProfileId}.`);
    }
    const published = {
      ...record,
      sequentialS1Evidence: {
        experimentId: D1_S1_VARIANT,
        baselineVariant: D1_VARIANT,
        inheritedMechanic: 'SLIDING_COULOMB_FORCE_DIRECTION_ONLY',
        changedMechanic: 'STATE_PATH_RELOCK_ONLY',
        statePathRule: 'ONCE_SLIDING_REMAINS_SLIDING_WITHIN_PRIMITIVE_STATIC_CASE',
        composedWithAcceptedD1: true,
        unchangedFromD1: [
          'FRICTION_FORCE_DIRECTION',
          'FRICTION_STIFFNESS',
          'COULOMB_CAP_MAGNITUDE',
          'NORMAL_REACTION_BASIS',
          'INITIAL_BREAKAWAY_BOUNDARY',
          'RETURN_MAPPED_SLIP_OFFSET_FORM',
          'ACCELERATION',
          'CONVERGENCE_LIMITS',
          'QUALIFIED_LINEAR_MECHANICS',
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
    const summary = published.summary;
    process.stdout.write([
      `variant           ${D1_S1_VARIANT}`,
      `baseline          ${D1_VARIANT}`,
      `case              ${published.caseId}`,
      `solver profile    ${published.solverProfileId}`,
      `source ACCDB      ${published.sourceAccdbSha256}`,
      `patched solver    ${patchSha256}`,
      `converged         ${published.converged}`,
      ...(summary === null ? [] : [
        `friction restraints             ${summary.frictionRestraintCount}`,
        `tangential vectors within +-10% ${summary.tangentialVectorsWithinGoal}/${summary.tangentialVectorsCompared}`,
        `normal reactions within +-10%   ${summary.normalWithinGoal}/${summary.frictionRestraintCount}`,
        `raw regime mismatches            ${summary.regimeMismatchCount}`,
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
  await runD1S1(parseArguments(process.argv.slice(2)));
}

export { D1_S1_PROFILE_ID, D1_S1_VARIANT, buildD1S1SolverSource, runD1S1 };
