#!/usr/bin/env node
/**
 * M047 Stage 2 H2: measure the L1 WW contents-density routing defect.
 *
 * Baseline ordinary spans already use hydrotestBasis.testFluidDensityKgPerM3,
 * while rigid/reducer gravity builders still read INPUT_BASIC_ELEMENT_DATA
 * FLUID_DENSITY. The variant changes only FLUID_DENSITY on rigid/reducer source
 * rows to the declared hydrotest density. HP, insulation, friction and gates stay
 * unchanged. This script is experimental evidence only; it cannot promote H2.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { CAESAR_FRICTION_SOLVER_PROFILE, solveCaesarAccdbFrictionBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const CASE_ID = 'L1';
const DENSITY_FACTOR = 1e6; // ACCDB kg/cm3 -> SI kg/m3.
const GOAL = 0.1;

export async function runL1HydrotestFluidRoutingExperiment(input) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const hydroDensity = Number(profile.linearSolve?.hydrotestBasis?.testFluidDensityKgPerM3);
  if (!(hydroDensity > 0)) throw new TypeError('Resolved hydrotest density is required.');
  const rawExport = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });
  const baselinePackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const mutation = hydroDensityVariant(rawExport, hydroDensity);
  const variantPackage = buildCaesarAccdbBenchmarkPackage({ rawExport: mutation.rawExport, profile });
  assertInvariant(baselinePackage, variantPackage, 'HYDRO_PRESSURE');
  assertInvariant(baselinePackage, variantPackage, 'INSUL_THICK');
  if (semanticHash(baselinePackage.references.L1.rows) !== semanticHash(variantPackage.references.L1.rows)) {
    throw new TypeError('H2 changed CAESAR reference rows.');
  }
  const solverProfile = { ...CAESAR_FRICTION_SOLVER_PROFILE, maximumIterations: 800 };
  const baseline = solveAndSummarize(baselinePackage, solverProfile);
  const variant = solveAndSummarize(variantPackage, solverProfile);
  const record = {
    schema: 'm047-bm4l-stage2-l1-hydrotest-fluid-routing-experiment/v1',
    caseId: CASE_ID,
    promotionEligible: false,
    sourceAccdbSha256: baselinePackage.source.sha256,
    solverProfileId: solverProfile.profileId,
    mechanicsChange: {
      id: 'H2_HYDROTEST_CONTENTS_DENSITY_ROUTING',
      scope: 'L1_WW_RIGID_AND_REDUCER_GRAVITY_ONLY',
      hydrotestDensityKgPerM3: hydroDensity,
      unchanged: ['HP', 'INSULATION', 'FRICTION_LAW', 'FRICTION_STIFFNESS', 'CONVERGENCE_GATES', 'TOLERANCES'],
    },
    mutation: mutation.evidence,
    baseline,
    variant,
    delta: baseline.converged && variant.converged ? {
      normalWithinGoal: variant.summary.normalWithinGoal - baseline.summary.normalWithinGoal,
      worstNormalPercentError: variant.summary.worstNormalPercentError - baseline.summary.worstNormalPercentError,
      tangentialWithinGoal: variant.summary.tangentialWithinGoal - baseline.summary.tangentialWithinGoal,
    } : null,
  };
  return { ...record, evidenceSemanticHash: semanticHash(record) };
}

function hydroDensityVariant(rawExport, hydroDensity) {
  const table = rawExport.tables.INPUT_BASIC_ELEMENT_DATA;
  const storageDensity = hydroDensity / DENSITY_FACTOR;
  const targets = [];
  const rows = table.rows.map((row) => {
    const rigid = Number(row.RIGID_PTR) > 0;
    const reducer = Number(row.REDUCER_PTR) > 0;
    if (!rigid && !reducer) return row;
    targets.push({
      elementId: String(row.ELEMENTID),
      kind: rigid ? 'RIGID' : 'REDUCER',
      baselineDensityKgPerM3: Number(row.FLUID_DENSITY) * DENSITY_FACTOR,
      variantDensityKgPerM3: hydroDensity,
    });
    return { ...row, FLUID_DENSITY: storageDensity };
  });
  if (targets.length === 0) throw new TypeError('H2 has no rigid/reducer targets in this model.');
  return {
    rawExport: { ...rawExport, tables: { ...rawExport.tables, INPUT_BASIC_ELEMENT_DATA: { ...table, rows } } },
    evidence: {
      mode: 'SYNTHETIC_ONE_FIELD_DISCRIMINATOR_NOT_SOURCE_TRUTH',
      field: 'FLUID_DENSITY',
      targetElementCount: targets.length,
      targets,
      baselineRowsSemanticHash: semanticHash(table.rows),
      variantRowsSemanticHash: semanticHash(rows),
    },
  };
}

function assertInvariant(left, right, field) {
  const values = (pkg) => pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
    .map((row) => [String(row.ELEMENTID), row[field]]);
  if (semanticHash(values(left)) !== semanticHash(values(right))) {
    throw new TypeError(`H2 changed ${field}.`);
  }
}

function solveAndSummarize(benchmarkPackage, profile) {
  const started = Date.now();
  try {
    const actual = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, [CASE_ID], { profile, frictionStiffnessScale: 1 });
    const supports = actual.mechanics.cases.L1.iterations.at(-1).supports;
    const reference = forceByNode(benchmarkPackage.references.L1.rows);
    const rows = supports.map((support) => {
      const ref = reference.get(support.nodeId) ?? {};
      const normalRef = Math.abs(ref[support.normalDof] ?? 0);
      const normalError = normalRef === 0 ? null : 100 * (support.normalReactionMagnitudeN - normalRef) / Math.abs(normalRef);
      const tangentialRef = support.frictionDofs.map((dof) => ref[dof] ?? 0);
      const tangentialSolved = support.frictionDofs.map((dof) => support.appliedFrictionForceN[support.frictionDofs.indexOf(dof)] ?? 0);
      const refMag = Math.hypot(...tangentialRef);
      const vectorError = Math.hypot(...tangentialSolved.map((value, index) => value - tangentialRef[index]));
      return { restraintId: support.restraintId, nodeId: support.nodeId, normalPercentError: normalError,
        tangentialVectorRelativeError: refMag === 0 ? null : vectorError / refMag };
    });
    return {
      converged: true,
      elapsedMs: Date.now() - started,
      iterationCount: actual.mechanics.cases.L1.iterationCount,
      summary: {
        normalWithinGoal: rows.filter((row) => row.normalPercentError !== null && Math.abs(row.normalPercentError) <= GOAL * 100).length,
        worstNormalPercentError: Math.max(...rows.map((row) => Math.abs(row.normalPercentError ?? 0))),
        tangentialWithinGoal: rows.filter((row) => row.tangentialVectorRelativeError !== null && row.tangentialVectorRelativeError <= GOAL).length,
      },
      restraints: rows,
    };
  } catch (error) {
    return { converged: false, elapsedMs: Date.now() - started, iterationCount: error.iterations?.length ?? null,
      failure: { code: error.code ?? null, message: error.message, failedGates: error.iterations?.at(-1)?.failedGates ?? null } };
  }
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const accdbPath = args.get('--accdb');
  if (!accdbPath) throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--out <evidence.json>]');
  const record = await runL1HydrotestFluidRoutingExperiment({ accdbPath });
  const out = args.get('--out');
  if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(resolve(out), `${canonicalPrettyStringify(record)}\n`); }
  process.stdout.write(`${canonicalPrettyStringify(record)}\n`);
}
