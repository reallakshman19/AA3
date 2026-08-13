#!/usr/bin/env node
/**
 * M047 Stage 2 R8 — CAESAR FRICTION_NORMAL_FORCE_VARIATION = 0.15 experiment.
 *
 * This script never edits the production solver. It reads the production R2/D1
 * source, applies a fail-closed set of exact text transforms to a temporary
 * sibling module, imports that module, deletes it, and runs the pinned real ACCDB
 * through baseline R2 and the R8 variant. The sole mechanics change is the
 * Coulomb capacity normal after a restraint first yields:
 *
 *   - before first STICK -> SLIDE: capacity = mu * current |N|;
 *   - at first yield: retain that iteration's current |N|;
 *   - after activation: capacity = mu * retained |N|;
 *   - refresh retained |N| only when current differs by strictly > 15%.
 *
 * D1 direction, resultant cap, return mapping, secant acceleration, state band,
 * convergence gates, tolerances and acceptance rules remain byte-for-byte from
 * production. This is experimental evidence only and is never promotion-eligible.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-r8-normal-force-variation-experiment.mjs \
 *     --accdb <BM4_L.ACCDB> \
 *     --out reports/lfea-m047-stage2-r8-normal-force-variation-nonlinear.json
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { solveCaesarAccdbFrictionBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const SOLVER_PATH = 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js';
const CASE_IDS = Object.freeze(['L13', 'L7', 'L1']);
const NORMAL_FORCE_VARIATION = 0.15;
const GOAL_RELATIVE = 0.1;

export async function runR8NormalForceVariationExperiment(input) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const productionSourcePath = resolve(input.solverPath ?? SOLVER_PATH);
  const productionSource = readFileSync(productionSourcePath, 'utf8');
  const productionSha256 = sha256(productionSource);
  const variantSource = buildR8VariantSource(productionSource);
  const variantSha256 = sha256(variantSource);
  const variantSolve = await importEphemeralVariant(productionSourcePath, variantSource);
  if (sha256(readFileSync(productionSourcePath, 'utf8')) !== productionSha256) {
    throw new TypeError('R8 experiment changed the production solver source; refusing evidence.');
  }

  const cases = {};
  for (const caseId of CASE_IDS) {
    const baseline = runOne(() => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, [caseId]), benchmarkPackage, caseId);
    const variant = runOne(() => variantSolve(benchmarkPackage, [caseId]), benchmarkPackage, caseId);
    cases[caseId] = {
      baseline,
      variant,
      delta: baseline.converged && variant.converged ? compareSummaries(baseline.summary, variant.summary) : null,
      retention: variant.converged ? summarizeRetention(variant.iterations) : null,
    };
  }

  const record = {
    schema: 'm047-bm4l-stage2-r8-normal-force-variation-nonlinear/v1',
    measurementBoundary: 'REAL_PINNED_ACCDB_LOCAL_SOLVE_REQUIRED',
    promotionEligible: false,
    source: {
      accdbSha256: benchmarkPackage.source.sha256,
      accdbBytes: benchmarkPackage.source.byteLength,
      profileId: benchmarkPackage.profile.profileId,
      productionSolverSha256: productionSha256,
      ephemeralR8SolverSha256: variantSha256,
    },
    mechanic: {
      id: 'R8_FRICTION_NORMAL_FORCE_VARIATION',
      threshold: NORMAL_FORCE_VARIATION,
      comparison: 'STRICTLY_GREATER_THAN',
      activation: 'FIRST_STICK_TO_SLIDE_TRANSITION',
      retainedQuantity: 'ABS_OWN_RESTRAINT_NORMAL_REACTION',
      capacityAfterActivation: 'MU_TIMES_RETAINED_NORMAL',
      zeroRetainedRule: 'ZERO_TO_NONZERO_ALWAYS_REFRESHES',
      unchanged: [
        'D1_TOTAL_RELATIVE_TANGENTIAL_DISPLACEMENT_DIRECTION',
        'RESULTANT_COULOMB_CAP_SHAPE',
        'RETURN_MAPPED_SLIP',
        'SECANT_SLIP_ACCELERATOR',
        'STATE_BOUNDARY_AND_HYSTERESIS',
        'CONVERGENCE_GATES',
        'TOLERANCES',
        'ACCEPTANCE_RULES',
      ],
    },
    cases,
  };
  return { ...record, evidenceSemanticHash: semanticHash(record) };
}

function buildR8VariantSource(source) {
  let next = source;
  next = replaceOnce(next,
    "  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));\n",
    "  let slips = new Map(plan.supports.map((support) => [support.restraintId, support.frictionDofs.map(() => 0)]));\n"
      + "  let retainedNormals = new Map(plan.supports.map((support) => [support.restraintId, null]));\n");
  next = replaceOnce(next,
    "    const measured = measureSupports({ plan, executed, states, slips, overlay, profile });\n",
    "    const measured = measureSupports({ plan, executed, states, slips, retainedNormals, overlay, profile });\n");
  next = replaceOnce(next,
    "    const mappedSlips = new Map(measured.map((entry) => [entry.restraintId, entry.nextSlip]));\n",
    "    const mappedSlips = new Map(measured.map((entry) => [entry.restraintId, entry.nextSlip]));\n"
      + "    const nextRetainedNormals = new Map(measured.map((entry) => [entry.restraintId, entry.nextRetainedNormalMagnitudeN]));\n");
  next = replaceOnce(next,
    "    slips = nextSlips;\n",
    "    slips = nextSlips;\n    retainedNormals = nextRetainedNormals;\n");
  next = replaceOnce(next,
    "  const { plan, executed, states, slips, overlay, profile } = input;\n",
    "  const { plan, executed, states, slips, retainedNormals, overlay, profile } = input;\n");
  next = replaceOnce(next,
    "    const normalMagnitude = Math.abs(signedNormalProjection);\n    const capacityN = support.coefficientOfFriction * normalMagnitude;\n",
    `    const normalMagnitude = Math.abs(signedNormalProjection);\n`
      + `    const retainedNormalBeforeN = retainedNormals.get(support.restraintId) ?? null;\n`
      + `    const retainedVariation = retainedNormalBeforeN === null\n`
      + `      ? null\n`
      + `      : retainedNormalBeforeN === 0\n`
      + `        ? (normalMagnitude === 0 ? 0 : null)\n`
      + `        : Math.abs(normalMagnitude - retainedNormalBeforeN) / retainedNormalBeforeN;\n`
      + `    const retainedRefresh = retainedNormalBeforeN !== null\n`
      + `      && (retainedNormalBeforeN === 0 ? normalMagnitude !== 0 : retainedVariation > ${NORMAL_FORCE_VARIATION});\n`
      + `    const capacityNormalMagnitudeN = retainedNormalBeforeN === null\n`
      + `      ? normalMagnitude\n`
      + `      : retainedRefresh ? normalMagnitude : retainedNormalBeforeN;\n`
      + `    const capacityN = support.coefficientOfFriction * capacityNormalMagnitudeN;\n`);
  next = replaceOnce(next,
    "    const nextState = trialMagnitude > capacityN + boundary\n      ? 'SLIDE'\n      : trialMagnitude < capacityN - boundary - band\n        ? 'STICK'\n        : state;\n",
    "    const nextState = trialMagnitude > capacityN + boundary\n      ? 'SLIDE'\n      : trialMagnitude < capacityN - boundary - band\n        ? 'STICK'\n        : state;\n"
      + "    const normalForceVariationActivates = retainedNormalBeforeN === null && state === 'STICK' && nextState === 'SLIDE';\n"
      + "    const nextRetainedNormalMagnitudeN = normalForceVariationActivates\n"
      + "      ? normalMagnitude\n"
      + "      : retainedNormalBeforeN === null ? null : capacityNormalMagnitudeN;\n");
  next = replaceOnce(next,
    "      normalMagnitude,\n      capacityN,\n",
    "      normalMagnitude,\n      nextRetainedNormalMagnitudeN,\n      capacityN,\n");
  next = replaceOnce(next,
    "        normalReactionMagnitudeN: normalMagnitude,\n        coefficientOfFriction: support.coefficientOfFriction,\n",
    `        normalReactionMagnitudeN: normalMagnitude,\n`
      + `        normalForceVariationThreshold: ${NORMAL_FORCE_VARIATION},\n`
      + `        normalForceVariationActivated: normalForceVariationActivates || retainedNormalBeforeN !== null,\n`
      + `        normalForceVariationActivatesThisIteration: normalForceVariationActivates,\n`
      + `        retainedNormalBeforeN,\n`
      + `        retainedNormalVariationRelative: retainedVariation,\n`
      + `        retainedNormalVariationIsInfinite: retainedNormalBeforeN === 0 && normalMagnitude !== 0,\n`
      + `        retainedNormalRefreshedThisIteration: retainedRefresh,\n`
      + `        retainedNormalReactionMagnitudeN: nextRetainedNormalMagnitudeN,\n`
      + `        capacityNormalReactionMagnitudeN,\n`
      + `        coulombCapacityNormalBasis: 'R8_RETAINED_NORMAL_FORCE_VARIATION_15_PERCENT_AFTER_FIRST_YIELD',\n`
      + `        coefficientOfFriction: support.coefficientOfFriction,\n`);
  return next;
}

function replaceOnce(source, needle, replacement) {
  const first = source.indexOf(needle);
  if (first < 0) throw new TypeError(`R8 source transform anchor not found: ${needle.slice(0, 90)}`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    throw new TypeError(`R8 source transform anchor is not unique: ${needle.slice(0, 90)}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

async function importEphemeralVariant(productionSourcePath, source) {
  const tempPath = resolve(dirname(productionSourcePath), `.m047-r8-${process.pid}-${Date.now()}.js`);
  writeFileSync(tempPath, source, 'utf8');
  try {
    const module = await import(`${pathToFileURL(tempPath).href}?r8=${Date.now()}`);
    if (typeof module.solveCaesarAccdbFrictionBenchmark !== 'function') {
      throw new TypeError('Ephemeral R8 module did not export solveCaesarAccdbFrictionBenchmark.');
    }
    return module.solveCaesarAccdbFrictionBenchmark;
  } finally {
    try { unlinkSync(tempPath); } catch {}
  }
}

function runOne(solve, benchmarkPackage, caseId) {
  const started = Date.now();
  try {
    const actual = solve();
    const evidence = actual.mechanics.cases[caseId];
    return {
      converged: true,
      elapsedMs: Date.now() - started,
      iterationCount: evidence.iterationCount,
      rowsSemanticHash: semanticHash(actual.cases[caseId].rows),
      iterationSemanticHash: semanticHash(evidence.iterations),
      recoveredEquilibriumStatus: evidence.recoveredEquilibrium.status,
      summary: summarizeAccuracy(benchmarkPackage, caseId, evidence.iterations.at(-1).supports),
      iterations: evidence.iterations,
    };
  } catch (error) {
    return {
      converged: false,
      elapsedMs: Date.now() - started,
      failure: {
        code: error.code ?? null,
        message: error.message,
        iterationCount: error.iterations?.length ?? null,
        failedGates: error.iterations?.at(-1)?.failedGates ?? null,
        failedGateEvidence: error.iterations?.at(-1)?.failedGateEvidence ?? null,
      },
      iterations: error.iterations ?? [],
    };
  }
}

function summarizeAccuracy(benchmarkPackage, caseId, supports) {
  const reference = forceByNode(benchmarkPackage.references[caseId].rows);
  const rows = supports.map((support) => {
    const ref = reference.get(String(support.nodeId)) ?? {};
    const normalRef = Math.abs(ref[support.normalDof] ?? 0);
    const normalErr = normalRef === 0 ? null
      : 100 * (support.normalReactionMagnitudeN - normalRef) / Math.abs(normalRef);
    const tangentRef = support.frictionDofs.map((dof) => ref[dof] ?? 0);
    const tangentSolved = [...support.appliedFrictionForceN];
    const refMag = Math.hypot(...tangentRef);
    const vectorError = Math.hypot(...tangentSolved.map((value, index) => value - tangentRef[index]));
    return {
      restraintId: support.restraintId,
      nodeId: support.nodeId,
      normalPercentError: normalErr,
      tangentialVectorRelativeError: refMag === 0 ? null : vectorError / refMag,
      solvedRegime: support.regime,
    };
  });
  const tangentRows = rows.filter((row) => row.tangentialVectorRelativeError !== null);
  return {
    frictionRestraintCount: rows.length,
    goalRelative: GOAL_RELATIVE,
    normalWithinGoal: rows.filter((row) => row.normalPercentError !== null && Math.abs(row.normalPercentError) <= 10).length,
    normalWorstPercentError: Math.max(...rows.map((row) => Math.abs(row.normalPercentError ?? 0))),
    tangentialVectorsCompared: tangentRows.length,
    tangentialVectorsWithinGoal: tangentRows.filter((row) => row.tangentialVectorRelativeError <= GOAL_RELATIVE).length,
    tangentialWorstRelativeError: tangentRows.length === 0 ? null : Math.max(...tangentRows.map((row) => row.tangentialVectorRelativeError)),
    restraints: rows,
  };
}

function summarizeRetention(iterations) {
  const byRestraint = new Map();
  for (const iteration of iterations) {
    for (const support of iteration.supports) {
      const row = byRestraint.get(support.restraintId) ?? {
        restraintId: support.restraintId,
        nodeId: support.nodeId,
        activationIteration: null,
        refreshIterations: [],
        maximumFiniteVariationRelative: 0,
        sawInfiniteVariation: false,
      };
      if (support.normalForceVariationActivatesThisIteration) row.activationIteration = iteration.iteration;
      if (support.retainedNormalRefreshedThisIteration) row.refreshIterations.push(iteration.iteration);
      if (support.retainedNormalVariationRelative !== null) {
        row.maximumFiniteVariationRelative = Math.max(row.maximumFiniteVariationRelative, support.retainedNormalVariationRelative);
      }
      row.sawInfiniteVariation ||= support.retainedNormalVariationIsInfinite === true;
      row.finalRetainedNormalReactionMagnitudeN = support.retainedNormalReactionMagnitudeN;
      row.finalCurrentNormalReactionMagnitudeN = support.normalReactionMagnitudeN;
      byRestraint.set(support.restraintId, row);
    }
  }
  const rows = [...byRestraint.values()];
  return {
    activatedRestraintCount: rows.filter((row) => row.activationIteration !== null).length,
    retainedNormalRefreshCount: rows.reduce((sum, row) => sum + row.refreshIterations.length, 0),
    restraints: rows,
  };
}

function compareSummaries(baseline, variant) {
  return {
    normalWithinGoal: variant.normalWithinGoal - baseline.normalWithinGoal,
    normalWorstPercentError: variant.normalWorstPercentError - baseline.normalWorstPercentError,
    tangentialVectorsWithinGoal: variant.tangentialVectorsWithinGoal - baseline.tangentialVectorsWithinGoal,
    tangentialWorstRelativeError: variant.tangentialWorstRelativeError - baseline.tangentialWorstRelativeError,
  };
}

function forceByNode(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || row.quantity !== 'FORCE') continue;
    const vector = map.get(String(row.entityId)) ?? {};
    vector[row.component] = Number(row.value);
    map.set(String(row.entityId), vector);
  }
  return map;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const accdbPath = args.get('--accdb');
  if (!accdbPath) throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--out <evidence.json>]');
  const record = await runR8NormalForceVariationExperiment({ accdbPath });
  const out = args.get('--out');
  if (out) {
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(resolve(out), `${canonicalPrettyStringify(record)}\n`, 'utf8');
  }
  process.stdout.write(`${canonicalPrettyStringify(record)}\n`);
}
