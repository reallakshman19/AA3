#!/usr/bin/env node
/**
 * M047 Stage 2 R3 nonlinear discriminator: accepted D1 direction + per-axis box cap.
 *
 * One mechanic changes relative to D1: the Coulomb surface is interpreted as an
 * independent cap on each free tangential component, |F_i| <= mu |N|, instead
 * of a resultant circle ||F_t|| <= mu |N|. The D1 force direction remains the
 * ray opposite current total relative tangential displacement. Thus, on slide,
 * the force lies where that D1 ray intersects the per-axis box.
 *
 * A one-free-tangent support is mathematically identical to D1; node 20710 is
 * therefore a decisive negative control rather than a tunable exception.
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

const VARIANT = 'D1-R3-per-axis-box-cap';
const PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-PER-AXIS-BOX-CAP';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`R3 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`R3 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildPerAxisSolverSource(source) {
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
    "  capacityRule: 'OWN_NORMAL_REACTION_MAGNITUDE_PER_FREE_TANGENTIAL_AXIS_BOX_R3_V1',",
    'capacity rule metadata',
  );

  patched = replaceExactly(
    patched,
`    const boundary = Math.max(
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
    // D1 mechanics variant: preserve the governed Coulomb-cap magnitude and
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
`    // R3 per-axis box: breakaway is governed by the largest absolute tangential
    // trial-force component. The existing absolute/relative boundary and one-sided
    // hysteresis values are unchanged; only the capacity geometry changes.
    const trialMaximumAxisMagnitudeN = Math.max(...trialForce.map((value) => Math.abs(value)));
    const boundary = Math.max(
      profile.stateBoundaryAbsoluteN,
      profile.stateBoundaryRelative * Math.max(capacityN, trialMaximumAxisMagnitudeN),
    );
    const band = profile.stateHysteresisRelative * capacityN;
    const nextState = trialMaximumAxisMagnitudeN > capacityN + boundary
      ? 'SLIDE'
      : trialMaximumAxisMagnitudeN < capacityN - boundary - band
        ? 'STICK'
        : state;
    // Keep accepted D1 direction exactly. Intersect that ray with the independent
    // per-axis box |F_i| <= mu|N|. For one tangent axis this is identical to D1.
    const directionUnit = tangentialMotion > profile.zeroTangentialMotionFloorM
      ? tangentialDisplacement.map((value) => -value / tangentialMotion)
      : null;
    const directionMaximumAxis = directionUnit === null
      ? 0
      : Math.max(...directionUnit.map((value) => Math.abs(value)));
    const boxBoundaryResultantCapacityN = directionMaximumAxis > 0
      ? capacityN / directionMaximumAxis
      : capacityN;
    const cappedForce = nextState === 'SLIDE' && directionUnit !== null
      ? directionUnit.map((value) => boxBoundaryResultantCapacityN * value)
      : null;
    const nextSlip = cappedForce !== null
      ? tangentialDisplacement.map((value, index) => value + cappedForce[index] / stiffness)
      : [...slip];`,
    'D1 circle state/return map',
  );

  patched = replaceExactly(
    patched,
    '    const slideResidualN = Math.abs(netMagnitude - capacityN);',
`    const maximumAppliedAxisMagnitudeN = Math.max(...netForce.map((value) => Math.abs(value)));
    const slideResidualN = Math.abs(maximumAppliedAxisMagnitudeN - capacityN);`,
    'slide residual geometry',
  );

  patched = replaceExactly(
    patched,
`        capacityN,
        trialTangentialSpringForceN: deepFreeze([...trialForce]),
        trialTangentialSpringForceMagnitudeN: trialMagnitude,`,
`        capacityN,
        capacityPartitionRule: 'PER_FREE_TANGENTIAL_AXIS_BOX_R3_V1',
        boxBoundaryResultantCapacityN,
        maximumAppliedAxisMagnitudeN,
        trialTangentialSpringForceN: deepFreeze([...trialForce]),
        trialTangentialSpringForceMagnitudeN: trialMagnitude,
        trialMaximumAxisMagnitudeN,`,
    'ledger capacity partition evidence',
  );

  patched = replaceExactly(
    patched,
`  const capViolations = measured.filter((entry) => entry.appliedMagnitude > entry.capacityN
    + Math.max(profile.capViolationAbsoluteN, profile.capViolationRelative * entry.capacityN));
  gates.push(gate('COULOMB_CAP_COMPLEMENTARITY', capViolations.length === 0, {
    violations: capViolations.map((entry) => ({
      restraintId: entry.restraintId,
      appliedMagnitudeN: entry.appliedMagnitude,
      capacityN: entry.capacityN,
    })),
  }));`,
`  const capViolations = measured.filter((entry) => entry.appliedForce.some((value) => Math.abs(value)
    > entry.capacityN + Math.max(profile.capViolationAbsoluteN, profile.capViolationRelative * entry.capacityN)));
  gates.push(gate('COULOMB_CAP_COMPLEMENTARITY', capViolations.length === 0, {
    rule: 'PER_FREE_TANGENTIAL_AXIS_BOX_R3_V1',
    violations: capViolations.map((entry) => ({
      restraintId: entry.restraintId,
      appliedForceN: [...entry.appliedForce],
      maximumAppliedAxisMagnitudeN: Math.max(...entry.appliedForce.map((value) => Math.abs(value))),
      capacityPerAxisN: entry.capacityN,
    })),
  }));`,
    'Coulomb complementarity gate geometry',
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
  const solverName = `caesar-accdb-friction-solve.d1-r3-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.d1-r3-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);
  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildPerAxisSolverSource(originalSolver);
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
    const { runFrictionTuningIteration } = await import(`${pathToFileURL(tempTuningPath).href}?r3=${token}`);
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      caseId: input.caseId,
      variant: VARIANT,
      maxIterations: input.maxIterations,
    });
    if (record.solverProfileId !== PROFILE_ID) {
      throw new Error(`R3 profile guard failed: expected ${PROFILE_ID}, got ${record.solverProfileId}.`);
    }
    const published = {
      ...record,
      r3Evidence: {
        experimentId: VARIANT,
        changedMechanic: 'COULOMB_CAP_GEOMETRY_RESULTANT_CIRCLE_TO_PER_AXIS_BOX_ONLY',
        capRule: 'ABS_EACH_FREE_TANGENTIAL_FORCE_COMPONENT_LE_MU_TIMES_OWN_NORMAL',
        slidingDirectionRule: 'D1_OPPOSE_CURRENT_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT_UNCHANGED',
        oneAxisNegativeControl: '20710 must be mechanically identical to D1 because it has one free tangent axis',
        unchangedMechanics: [
          'D1_TOTAL_DISPLACEMENT_DIRECTION',
          'FRICTION_STIFFNESS',
          'OWN_CURRENT_CASE_NORMAL_BASIS',
          'RETURN_MAPPED_SLIP_OFFSET_FORM',
          'STATE_BOUNDARY_TOLERANCES',
          'STATE_HYSTERESIS_TOLERANCE',
          'SECANT_ACCELERATION',
          'MAXIMUM_ITERATIONS_400',
          'QUALIFICATION_TOLERANCES',
        ],
        ephemeralSolverSha256: solverSha256,
        productionSolverModified: false,
      },
    };
    if (input.outPath) {
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

export { PROFILE_ID, VARIANT, buildPerAxisSolverSource, runExperiment };
