#!/usr/bin/env node
/**
 * M047 Stage 2 D1 experiment: total-relative-displacement friction direction.
 *
 * This is a fail-closed one-mechanic experiment harness. It does not alter the
 * production friction solver source. At runtime it creates an ephemeral sibling
 * module whose only mechanics change is the sliding Coulomb-force direction:
 *
 *   F_t = -mu |N| u_t / |u_t|
 *
 * The cap magnitude, normal-force basis, friction stiffness, state boundaries,
 * return-mapped slip-offset formulation, convergence gates and qualified linear
 * mechanics remain unchanged.
 *
 * The source transformation is guarded by exact single-match replacements. If
 * the production solver drifts, this experiment stops rather than silently
 * patching a different implementation.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-friction-d1-total-direction.mjs \
 *     --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
 *     --case L13 \
 *     --out reports/lfea-m047-stage2-friction-iteration-L13-D1.json
 */
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const root = resolve(scriptsDir, '..');
const solverPath = resolve(root, 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath = resolve(scriptsDir, 'lfea-m047-stage2-friction-tuning-loop.mjs');

const D1_VARIANT = 'D1-total-relative-tangential-displacement-direction';
const D1_PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-TOTAL-DISPLACEMENT-DIRECTION';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`D1 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`D1 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildD1SolverSource(source) {
  let patched = source;

  patched = replaceExactly(
    patched,
    "  profileId: 'CAESAR-ACCDB-FRICTION-SOLVER-R1',",
    `  profileId: '${D1_PROFILE_ID}',`,
    'solver profile id',
  );

  patched = replaceExactly(
    patched,
    `    // Return mapping: project the trial force onto the Coulomb cap and carry the
    // difference as slip. A sticking support keeps its slip unchanged.
    const nextSlip = nextState === 'SLIDE' && trialMagnitude > 0
      ? tangentialDisplacement.map((value, index) =>
        value + (capacityN / trialMagnitude) * trialForce[index] / stiffness)
      : [...slip];`,
    `    // D1 mechanics variant: preserve the governed Coulomb-cap magnitude and
    // return-mapped slip-offset formulation, but orient the sliding force opposite
    // the current total relative tangential displacement. The real BM4_L L13
    // reference vectors identify this direction directly. No state boundary,
    // normal basis, stiffness or convergence tolerance is changed.
    const cappedForce = nextState === 'SLIDE'
      && tangentialMotion > profile.zeroTangentialMotionFloorM
      ? tangentialDisplacement.map((value) => -capacityN * value / tangentialMotion)
      : null;
    const nextSlip = cappedForce !== null
      ? tangentialDisplacement.map((value, index) => value + cappedForce[index] / stiffness)
      : [...slip];`,
    'return-map cap projection',
  );

  patched = replaceExactly(
    patched,
    '    const frictionDirectionCosine = stretchCosine;',
    `    // D1 governs sliding direction against current total relative tangential
    // displacement. Elastic-stretch and accumulated-slip cosines remain diagnostic.
    const frictionDirectionCosine = oppositionCosine;`,
    'friction direction cosine',
  );

  patched = replaceExactly(
    patched,
    "    rule: 'COSINE_BETWEEN_NET_FRICTION_FORCE_AND_CURRENT_ELASTIC_TANGENTIAL_STRETCH',",
    "    rule: 'COSINE_BETWEEN_NET_FRICTION_FORCE_AND_CURRENT_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT_D1',",
    'direction convergence-gate rule',
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
  if (!accdbPath) throw new TypeError('D1 requires --accdb <BM4_L.ACCDB>.');
  return {
    accdbPath,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    profilePath: args.get('--profile'),
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
    stiffnessScale: args.has('--stiffness-scale') ? Number(args.get('--stiffness-scale')) : undefined,
  };
}

async function runD1(input) {
  const token = `${process.pid}-${Date.now()}`;
  const solverName = `caesar-accdb-friction-solve.d1-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.d1-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);

  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildD1SolverSource(originalSolver);
  const originalTuning = readFileSync(tuningPath, 'utf8');
  const patchedTuning = replaceExactly(
    originalTuning,
    "../src/core/fea-benchmarks/caesar-accdb-friction-solve.js",
    `../src/core/fea-benchmarks/${solverName}`,
    'tuning-loop solver import',
  );
  const patchSha256 = createHash('sha256').update(patchedSolver).digest('hex');

  try {
    writeFileSync(tempSolverPath, patchedSolver, 'utf8');
    writeFileSync(tempTuningPath, patchedTuning, 'utf8');

    const moduleUrl = `${pathToFileURL(tempTuningPath).href}?d1=${encodeURIComponent(token)}`;
    const { runFrictionTuningIteration } = await import(moduleUrl);
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath,
      caseId: input.caseId,
      variant: D1_VARIANT,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });

    if (record.solverProfileId !== D1_PROFILE_ID) {
      throw new Error(
        `D1 source guard failed: expected solver profile ${D1_PROFILE_ID}, got ${record.solverProfileId}.`,
      );
    }

    const published = {
      ...record,
      d1Evidence: {
        experimentId: D1_VARIANT,
        changedMechanic: 'SLIDING_COULOMB_FORCE_DIRECTION_ONLY',
        directionRule: 'OPPOSE_CURRENT_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT',
        unchangedMechanics: [
          'FRICTION_STIFFNESS',
          'COULOMB_CAP_MAGNITUDE',
          'NORMAL_REACTION_BASIS',
          'STATE_BOUNDARIES',
          'RETURN_MAPPED_SLIP_OFFSET_FORM',
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
      `variant           ${D1_VARIANT}`,
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
      try {
        rmSync(path, { force: true });
      } catch {
        // The experiment result is still valid if cleanup is delayed by the host.
      }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await runD1(parseArguments(process.argv.slice(2)));
}

export { D1_PROFILE_ID, D1_VARIANT, buildD1SolverSource, runD1 };
