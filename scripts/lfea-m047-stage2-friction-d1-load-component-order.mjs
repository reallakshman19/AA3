#!/usr/bin/env node
/**
 * M047 Stage 2 LO1 experiment: two-stage physical load-component ordering on D1.
 *
 * D1 is the accepted mechanics baseline. The only changed mechanic is the order
 * in which the two governed L13 load components are established:
 *   W_FIRST:  zero -> W -> W+P1
 *   P1_FIRST: zero -> P1 -> W+P1
 *
 * Each stage must converge under the unchanged D1 400-iteration/gate contract,
 * and the converged friction state/slip history is carried into the next stage.
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

const ORDER_VARIANTS = Object.freeze({
  W_FIRST: Object.freeze({
    profileId: 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-LOAD-ORDER-W-FIRST',
    variant: 'LO1-D1-load-order-W-then-P1',
    stages: Object.freeze([
      Object.freeze({ label: 'W', formula: 'W' }),
      Object.freeze({ label: 'W+P1', formula: 'W+P1' }),
    ]),
  }),
  P1_FIRST: Object.freeze({
    profileId: 'CAESAR-ACCDB-FRICTION-SOLVER-R1-D1-LOAD-ORDER-P1-FIRST',
    variant: 'LO1-D1-load-order-P1-then-W',
    stages: Object.freeze([
      Object.freeze({ label: 'P1', formula: 'P1' }),
      Object.freeze({ label: 'W+P1', formula: 'W+P1' }),
    ]),
  }),
});

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`LO1 source guard failed: ${label} was not found.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`LO1 source guard failed: ${label} matched more than once.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function buildLoadComponentOrderSolverSource(productionSource, order) {
  const spec = ORDER_VARIANTS[order];
  if (spec === undefined) throw new TypeError(`LO1 order must be W_FIRST or P1_FIRST; got ${String(order)}.`);
  let patched = buildD1SolverSource(productionSource);

  patched = replaceExactly(
    patched,
    `  profileId: '${D1_PROFILE_ID}',`,
    `  profileId: '${spec.profileId}',`,
    'D1 profile id',
  );
  patched = replaceExactly(
    patched,
    "  loadStepping: 'NONE_SINGLE_STEP_V1',",
    `  loadStepping: 'TWO_STAGE_PHYSICAL_LOAD_COMPONENT_ORDER_V1',\n  physicalLoadComponentOrder: '${order}',`,
    'load stepping declaration',
  );

  const start = `  const plan = buildFrictionRestraintPlan({ benchmarkPackage, frictionAuthority, profile, stiffnessScale });\n  const prepared = prepareCaesarAccdbCaseState({\n    benchmarkPackage,\n    caseRecord,\n    solveProfile,\n    gate: CAESAR_ACCDB_CASE_GATES.NONLINEAR_EFFECTIVE_FRICTION,\n    frictionDofKeys: plan.frictionDofKeys,\n  });\n  let states = new Map(plan.supports.map((support) => [support.restraintId, 'STICK']));\n  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));\n  const acceleration = createSlipAccelerator(profile);\n  const iterations = [];\n  let previous = null;\n  for (let iteration = 1; iteration <= profile.maximumIterations; iteration += 1) {`;

  const stagesLiteral = JSON.stringify(spec.stages);
  const startReplacement = `  if (caseRecord.caseId !== 'L13' || caseRecord.formula !== 'W+P1') {\n    throw new TypeError(\`LO1 is restricted to governed L13 W+P1; got \${caseRecord.caseId} \${caseRecord.formula}.\`);\n  }\n  const componentOrder = '${order}';\n  const componentStages = Object.freeze(${stagesLiteral}.map((entry) => Object.freeze(entry)));\n  const plan = buildFrictionRestraintPlan({ benchmarkPackage, frictionAuthority, profile, stiffnessScale });\n  let states = new Map(plan.supports.map((support) => [support.restraintId, 'STICK']));\n  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));\n  const iterations = [];\n  for (let loadStage = 1; loadStage <= componentStages.length; loadStage += 1) {\n    const stage = componentStages[loadStage - 1];\n    const stageCaseRecord = Object.freeze({ ...caseRecord, formula: stage.formula });\n    const prepared = prepareCaesarAccdbCaseState({\n      benchmarkPackage,\n      caseRecord: stageCaseRecord,\n      solveProfile,\n      gate: CAESAR_ACCDB_CASE_GATES.NONLINEAR_EFFECTIVE_FRICTION,\n      frictionDofKeys: plan.frictionDofKeys,\n    });\n    const acceleration = createSlipAccelerator(profile);\n    let previous = null;\n    let stageConverged = false;\n    for (let iteration = 1; iteration <= profile.maximumIterations; iteration += 1) {`;
  patched = replaceExactly(patched, start, startReplacement, 'primitive component-order loop start');

  patched = replaceExactly(
    patched,
    `    iterations.push(Object.freeze({\n      iteration,`,
    `    iterations.push(Object.freeze({\n      globalIteration: iterations.length + 1,\n      loadStage,\n      loadStageCount: componentStages.length,\n      componentOrder,\n      stageLabel: stage.label,\n      stageFormula: stage.formula,\n      iteration,`,
    'iteration component-order evidence',
  );

  const end = `    if (gates.status === 'CONVERGED') {\n      return buildPrimitiveResult({\n        caseRecord, frictionAuthority, plan, prepared, executed, measured, states, iterations, gates, profile,\n      });\n    }\n    previous = executed;\n    states = nextStates;\n    slips = nextSlips;\n  }\n  const error = new Error(\n    \`\${caseRecord.caseId} friction active set did not converge within \${profile.maximumIterations} iterations.\`,\n  );\n  error.code = 'CAESAR_ACCDB_FRICTION_NOT_CONVERGED';\n  error.iterations = iterations;\n  throw error;\n}`;
  const endReplacement = `    if (gates.status === 'CONVERGED') {\n      stageConverged = true;\n      if (loadStage === componentStages.length) {\n        return buildPrimitiveResult({\n          caseRecord, frictionAuthority, plan, prepared, executed, measured, states, iterations, gates, profile,\n        });\n      }\n      break;\n    }\n    previous = executed;\n    states = nextStates;\n    slips = nextSlips;\n    }\n    if (!stageConverged) {\n      const error = new Error(\n        \`\${caseRecord.caseId} LO1 \${componentOrder} stage \${loadStage}/\${componentStages.length} (\${stage.label}) did not converge within \${profile.maximumIterations} iterations.\`,\n      );\n      error.code = 'CAESAR_ACCDB_FRICTION_NOT_CONVERGED';\n      error.componentOrder = componentOrder;\n      error.loadStage = loadStage;\n      error.stageLabel = stage.label;\n      error.stageFormula = stage.formula;\n      error.iterations = iterations;\n      throw error;\n    }\n  }\n  throw new Error('LO1 component-order continuation reached an unreachable end state.');\n}`;
  patched = replaceExactly(patched, end, endReplacement, 'primitive component-order loop end');
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
  if (!accdbPath) throw new TypeError('LO1 requires --accdb <BM4_L.ACCDB>.');
  const order = String(args.get('--order') ?? '').toUpperCase();
  if (ORDER_VARIANTS[order] === undefined) throw new TypeError('--order must be W_FIRST or P1_FIRST.');
  return {
    accdbPath,
    order,
    caseId: args.get('--case') ?? 'L13',
    outPath: args.get('--out') ?? null,
    profilePath: args.get('--profile'),
    maxIterations: args.has('--max-iterations') ? Number(args.get('--max-iterations')) : undefined,
    stiffnessScale: args.has('--stiffness-scale') ? Number(args.get('--stiffness-scale')) : undefined,
  };
}

async function runLoadComponentOrder(input) {
  if (input.caseId !== 'L13') throw new TypeError('LO1 is restricted to L13.');
  const spec = ORDER_VARIANTS[input.order];
  if (spec === undefined) throw new TypeError('LO1 order must be W_FIRST or P1_FIRST.');
  const token = `${process.pid}-${Date.now()}-${input.order}`;
  const solverName = `caesar-accdb-friction-solve.lo1-${token}.mjs`;
  const tuningName = `lfea-m047-stage2-friction-tuning-loop.lo1-${token}.mjs`;
  const tempSolverPath = resolve(dirname(solverPath), solverName);
  const tempTuningPath = resolve(scriptsDir, tuningName);
  const originalSolver = readFileSync(solverPath, 'utf8');
  const patchedSolver = buildLoadComponentOrderSolverSource(originalSolver, input.order);
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
      `${pathToFileURL(tempTuningPath).href}?lo1=${encodeURIComponent(token)}`
    );
    const record = await runFrictionTuningIteration({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath,
      caseId: input.caseId,
      variant: spec.variant,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });
    if (record.solverProfileId !== spec.profileId) {
      throw new Error(`LO1 expected solver profile ${spec.profileId}, got ${record.solverProfileId}.`);
    }
    const published = {
      ...record,
      loadComponentOrderEvidence: {
        experimentId: spec.variant,
        baselineVariant: D1_VARIANT,
        baselineProfileId: D1_PROFILE_ID,
        changedMechanic: 'PHYSICAL_LOAD_COMPONENT_ORDER_ONLY',
        loadComponentOrder: input.order,
        stages: spec.stages,
        perStageMaximumIterations: input.maxIterations ?? 400,
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
      `variant           ${spec.variant}`,
      `order             ${input.order}`,
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
  await runLoadComponentOrder(parseArguments(process.argv.slice(2)));
}

export { ORDER_VARIANTS, buildLoadComponentOrderSolverSource, runLoadComponentOrder };
