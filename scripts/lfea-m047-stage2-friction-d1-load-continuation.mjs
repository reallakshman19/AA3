#!/usr/bin/env node
/**
 * M047 Stage 2 LP1 experiment: proportional physical load continuation on D1.
 *
 * Baseline mechanics are the accepted D1 total-relative-displacement sliding
 * direction. The only added mechanic is the physical load path for L13 W+P1:
 * begin from the all-stick zero-load state and solve N proportional increments
 * to full W+P1, carrying the converged friction state/slip history between load
 * steps. Each load step uses the unchanged D1 constitutive law, secant
 * accelerator, state law, Coulomb cap, normal basis, and convergence gates.
 *
 * N=1 must reproduce D1. N=5 and N=10 are the governed discriminators.
 */
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { D1_PROFILE_ID, D1_VARIANT, buildD1SolverSource } from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const root = resolve(scriptsDir, '..');
const solverPath = resolve(root, 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const tuningPath = resolve(scriptsDir, 'lfea-m047-stage2-friction-tuning-loop.mjs');

const LP_PROFILE_ID = 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-PHYSICAL-LOAD-CONTINUATION';
const LP_VARIANT_PREFIX = 'LP1-D1-proportional-physical-load-continuation';

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`LP1 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`LP1 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildLoadContinuationSolverSource(productionSource, stepCount) {
  if (!Number.isInteger(stepCount) || stepCount < 1) {
    throw new TypeError('LP1 load step count must be a positive integer.');
  }
  let patched = buildD1SolverSource(productionSource);

  patched = replaceExactly(
    patched,
    `  profileId: '${D1_PROFILE_ID}',`,
    `  profileId: '${LP_PROFILE_ID}',`,
    'D1 profile id',
  );
  patched = replaceExactly(
    patched,
    "  loadStepping: 'NONE_SINGLE_STEP_V1',",
    `  loadStepping: 'PROPORTIONAL_PHYSICAL_LOAD_CONTINUATION_ZERO_TO_FULL_V1',\n  physicalLoadStepCount: ${stepCount},`,
    'load stepping declaration',
  );

  const solveMarker = 'function solvePrimitiveCase(input) {';
  const helper = `function scaleL13BenchmarkPackageForLoadFactor(benchmarkPackage, loadFactor) {\n  const factor = Number(loadFactor);\n  if (!Number.isFinite(factor) || factor <= 0 || factor > 1) {\n    throw new TypeError(\`LP1 load factor must be in (0,1], got \${String(loadFactor)}.\`);\n  }\n  const basic = benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA;\n  const rows = basic.rows.map((row) => {\n    const pressure = Number(row.PRESSURE1);\n    if (!Number.isFinite(pressure)) {\n      throw new TypeError(\`LP1 L13 row \${String(row.ELEMENTID)} has non-finite PRESSURE1.\`);\n    }\n    return Object.freeze({ ...row, PRESSURE1: pressure * factor });\n  });\n  return Object.freeze({\n    ...benchmarkPackage,\n    model: Object.freeze({\n      ...benchmarkPackage.model,\n      tables: Object.freeze({\n        ...benchmarkPackage.model.tables,\n        INPUT_BASIC_ELEMENT_DATA: Object.freeze({ ...basic, rows: Object.freeze(rows) }),\n      }),\n    }),\n  });\n}\n\n${solveMarker}`;
  patched = replaceExactly(patched, solveMarker, helper, 'load-factor helper insertion');

  const start = `  const plan = buildFrictionRestraintPlan({ benchmarkPackage, frictionAuthority, profile, stiffnessScale });\n  const prepared = prepareCaesarAccdbCaseState({\n    benchmarkPackage,\n    caseRecord,\n    solveProfile,\n    gate: CAESAR_ACCDB_CASE_GATES.NONLINEAR_EFFECTIVE_FRICTION,\n    frictionDofKeys: plan.frictionDofKeys,\n  });\n  let states = new Map(plan.supports.map((support) => [support.restraintId, 'STICK']));\n  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));\n  const acceleration = createSlipAccelerator(profile);\n  const iterations = [];\n  let previous = null;\n  for (let iteration = 1; iteration <= profile.maximumIterations; iteration += 1) {`;
  const startReplacement = `  if (caseRecord.caseId !== 'L13' || caseRecord.formula !== 'W+P1') {\n    throw new TypeError(\`LP1 is restricted to governed L13 W+P1; got \${caseRecord.caseId} \${caseRecord.formula}.\`);\n  }\n  const plan = buildFrictionRestraintPlan({ benchmarkPackage, frictionAuthority, profile, stiffnessScale });\n  let states = new Map(plan.supports.map((support) => [support.restraintId, 'STICK']));\n  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));\n  const iterations = [];\n  const loadStepCount = Number(profile.physicalLoadStepCount);\n  if (!Number.isInteger(loadStepCount) || loadStepCount < 1) {\n    throw new TypeError(\`LP1 profile physicalLoadStepCount must be a positive integer; got \${String(profile.physicalLoadStepCount)}.\`);\n  }\n  for (let loadStep = 1; loadStep <= loadStepCount; loadStep += 1) {\n    const loadFactor = loadStep / loadStepCount;\n    const stepBenchmarkPackage = scaleL13BenchmarkPackageForLoadFactor(benchmarkPackage, loadFactor);\n    const stepSolveProfile = Object.freeze({\n      ...solveProfile,\n      gravityAcceleration: Number(solveProfile.gravityAcceleration) * loadFactor,\n    });\n    const prepared = prepareCaesarAccdbCaseState({\n      benchmarkPackage: stepBenchmarkPackage,\n      caseRecord,\n      solveProfile: stepSolveProfile,\n      gate: CAESAR_ACCDB_CASE_GATES.NONLINEAR_EFFECTIVE_FRICTION,\n      frictionDofKeys: plan.frictionDofKeys,\n    });\n    const acceleration = createSlipAccelerator(profile);\n    let previous = null;\n    let stepConverged = false;\n    for (let iteration = 1; iteration <= profile.maximumIterations; iteration += 1) {`;
  patched = replaceExactly(patched, start, startReplacement, 'primitive continuation loop start');

  patched = replaceExactly(
    patched,
    `    iterations.push(Object.freeze({\n      iteration,`,
    `    iterations.push(Object.freeze({\n      globalIteration: iterations.length + 1,\n      loadStep,\n      loadStepCount,\n      loadFactor,\n      iteration,`,
    'iteration load-path evidence',
  );

  const end = `    if (gates.status === 'CONVERGED') {\n      return buildPrimitiveResult({\n        caseRecord, frictionAuthority, plan, prepared, executed, measured, states, iterations, gates, profile,\n      });\n    }\n    previous = executed;\n    states = nextStates;\n    slips = nextSlips;\n  }\n  const error = new Error(\n    \`\${caseRecord.caseId} friction active set did not converge within \${profile.maximumIterations} iterations.\`,\n  );\n  error.code = 'CAESAR_ACCDB_FRICTION_NOT_CONVERGED';\n  error.iterations = iterations;\n  throw error;\n}`;
  const endReplacement = `    if (gates.status === 'CONVERGED') {\n      stepConverged = true;\n      if (loadStep === loadStepCount) {\n        return buildPrimitiveResult({\n          caseRecord, frictionAuthority, plan, prepared, executed, measured, states, iterations, gates, profile,\n        });\n      }\n      break;\n    }\n    previous = executed;\n    states = nextStates;\n    slips = nextSlips;\n    }\n    if (!stepConverged) {\n      const error = new Error(\n        \`\${caseRecord.caseId} LP1 load step \${loadStep}/\${loadStepCount} (factor \${loadFactor}) did not converge within \${profile.maximumIterations} iterations.\`,\n      );\n      error.code = 'CAESAR_ACCDB_FRICTION_NOT_CONVERGED';\n      error.loadStep = loadStep;\n      error.loadFactor = loadFactor;\n      error.iterations = iterations;\n      throw error;\n    }\n  }\n  throw new Error('LP1 continuation reached an unreachable end state.');\n}`;
  patched = replaceExactly(patched, end, endReplacement, 'primitive continuation loop end');

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
  if (!accdbPath) throw new TypeError('LP1 requires --accdb <BM4_L.ACCDB>.');
  const steps = Number(args.get('--steps') ?? 1);
  if (!Number.isInteger(steps) || steps < 1) throw new TypeError('--steps must be a positive integer.');
  return {
    accdbPath,
    steps,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    profilePath: args.get('--profile'),
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
    stiffnessScale: args.has('--stiffness-scale') ? Number(args.get('--stiffness-scale')) : undefined,
  };
}

async function runLoadContinuation(input) {
  if (input.caseId !== 'L13') throw new TypeError('LP1 is restricted to L13.');
  const token = `${process.pid}-${Date.now()}-${input.steps}`;
  const solverName = `caesar-accdb-friction-solve.lp1-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.lp1-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);
  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildLoadContinuationSolverSource(originalSolver, input.steps);
  const originalTuning = readFileSync(tuningPath, 'utf8');
  const patchedTuning = replaceExactly(
    originalTuning,
    '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js',
    `../src/core/fea-benchmarks/${solverName}`,
    'tuning-loop solver import',
  );
  const patchSha256 = createHash('sha256').update(patchedSolver).digest('hex');
  const variant = `${LP_VARIANT_PREFIX}-N${input.steps}`;

  try {
    writeFileSync(tempSolverPath, patchedSolver, 'utf8');
    writeFileSync(tempTuningPath, patchedTuning, 'utf8');
    const { runFrictionTuningIteration } = await import(
      `${pathToFileURL(tempTuningPath).href}?lp1=${encodeURIComponent(token)}`
    );
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath,
      caseId: input.caseId,
      variant,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });
    if (record.solverProfileId !== LP_PROFILE_ID) {
      throw new Error(`LP1 expected solver profile ${LP_PROFILE_ID}, got ${record.solverProfileId}.`);
    }
    const published = {
      ...record,
      loadContinuationEvidence: {
        experimentId: variant,
        baselineVariant: D1_VARIANT,
        baselineProfileId: D1_PROFILE_ID,
        changedMechanic: 'PHYSICAL_LOAD_PATH_ONLY',
        loadPathRule: 'PROPORTIONAL_ZERO_TO_FULL_W_PLUS_P1',
        loadStepCount: input.steps,
        loadFactors: Array.from({ length: input.steps }, (_value, index) => (index + 1) / input.steps),
        perStepMaximumIterations: input.maxIterations ?? 400,
        unchangedMechanics: [
          'D1_TOTAL_RELATIVE_TANGENTIAL_DIRECTION',
          'FRICTION_STIFFNESS',
          'COULOMB_CAP_MAGNITUDE',
          'NORMAL_REACTION_BASIS',
          'STATE_BOUNDARIES_AND_HYSTERESIS',
          'RETURN_MAPPED_SLIP_OFFSET_FORM',
          'SECANT_ACCELERATION',
          'CONVERGENCE_GATES_AND_LIMITS',
          'COMPARISON_GOAL',
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
    const s = published.summary;
    process.stdout.write([
      `variant           ${variant}`,
      `steps             ${input.steps}`,
      `case              ${published.caseId}`,
      `source ACCDB      ${published.sourceAccdbSha256}`,
      `solver profile    ${published.solverProfileId}`,
      `patched solver    ${patchSha256}`,
      `converged         ${published.converged}`,
      ...(s === null ? [] : [
        `vectors +-10%    ${s.tangentialVectorsWithinGoal}/${s.tangentialVectorsCompared}`,
        `normals +-10%    ${s.normalWithinGoal}/${s.frictionRestraintCount}`,
        `worst vector     ${s.tangentialWorstRelativeError}`,
      ]),
      input.outPath === null ? '' : `artifact          ${resolve(input.outPath)}`,
    ].filter(Boolean).join('\n') + '\n');
    return published;
  } finally {
    for (const path of [tempTuningPath, tempSolverPath]) {
      try { rmSync(path, { force: true }); } catch { /* cleanup best effort */ }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await runLoadContinuation(parseArguments(process.argv.slice(2)));
}

export { LP_PROFILE_ID, LP_VARIANT_PREFIX, buildLoadContinuationSolverSource, runLoadContinuation };
