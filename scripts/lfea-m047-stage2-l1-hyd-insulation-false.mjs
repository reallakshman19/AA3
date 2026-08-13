#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { CAESAR_FRICTION_SOLVER_PROFILE, solveCaesarAccdbFrictionBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const PROFILE = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const BASELINE = 'reports/lfea-m047-stage2-r2-rebaseline/L1.json';
const SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const GOAL = 0.1;

export async function runHydInsulationFalse(input) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE), 'utf8'));
  const baseline = JSON.parse(readFileSync(resolve(input.baselinePath ?? BASELINE), 'utf8'));
  const authority = resolveSetting(profile);
  if (authority.value !== false) throw new Error(`Include Insulation in Hydrotest resolves ${authority.value}; false experiment is not authorized.`);
  const raw = await extractCaesarAccdbTables({ accdbPath: input.accdbPath, tableNames: requiredCaesarAccdbTables(profile), expectedSha256: SHA });
  const mutated = structuredClone(raw);
  const changed = [];
  for (const row of mutated.tables.INPUT_BASIC_ELEMENT_DATA.rows) {
    if (!(Number(row.INSUL_THICK) > 0) || !(Number(row.INSUL_DENSITY) > 0)) continue;
    changed.push({ elementId: String(row.ELEMENTID), thickness: Number(row.INSUL_THICK), density: Number(row.INSUL_DENSITY) });
    row.INSUL_THICK = 0;
    row.INSUL_DENSITY = 0;
  }
  if (changed.length === 0) throw new Error('No positive BM4_L insulation rows were found.');
  mutated.provider = `${raw.provider}:HYD_INSULATION_FALSE`;
  const pkg = buildCaesarAccdbBenchmarkPackage({ rawExport: mutated, profile });
  const l1 = pkg.cases.find((row) => row.caseId === 'L1');
  if (!l1 || l1.caseClass !== 'HYD' || !String(l1.formula).includes('WW')) throw new Error('L1 is not the expected HYD WW+HP primitive.');
  const started = Date.now();
  let actual;
  try {
    actual = solveCaesarAccdbFrictionBenchmark(pkg, ['L1'], { profile: CAESAR_FRICTION_SOLVER_PROFILE, frictionStiffnessScale: 1 });
  } catch (error) {
    const record = { schema: 'm047-l1-hyd-insulation-false/v1', sourceAccdbSha256: raw.source.sha256, authority, changedSourceCount: changed.length, converged: false, failure: { code: error.code ?? null, message: error.message, iterationCount: error.iterations?.length ?? null, failedGates: error.iterations?.at(-1)?.failedGates ?? null }, productionPromotionAuthorized: false };
    return { ...record, semanticHash: semanticHash(record) };
  }
  const rows = compare(pkg, actual, baseline);
  const summary = summarize(rows, baseline);
  const evidence = actual.mechanics.cases.L1;
  const record = {
    schema: 'm047-l1-hyd-insulation-false/v1',
    variant: 'L1_WW_INCLUDE_INSULATION_IN_HYDROTEST_FALSE_ONLY',
    sourceAccdbSha256: raw.source.sha256,
    authority,
    changedSourceCount: changed.length,
    changedSources: changed,
    unchanged: { testFluidDensityKgPerM3: profile.linearSolve.hydrotestBasis.testFluidDensityKgPerM3, pressureField: profile.linearSolve.hydrotestBasis.pressureField, frictionProfile: CAESAR_FRICTION_SOLVER_PROFILE.profileId },
    elapsedMs: Date.now() - started,
    converged: true,
    equilibriumStatus: evidence.recoveredEquilibrium.status,
    failedGates: evidence.convergenceGates.failedGates,
    summary,
    restraints: rows,
    finalRowsSemanticHash: semanticHash(actual.cases.L1.rows),
    productionPromotionAuthorized: false,
    nextGate: 'Only a real-file nomination may authorize a separate production implementation followed by frozen L2-L6/L14 controls and nominal repeats.',
  };
  return { ...record, semanticHash: semanticHash(record) };
}

function resolveSetting(profile) {
  const layers = profile.configurationAuthority.layers;
  const values = [
    ['OVERALL_GLOBAL_DEFAULT', layers.overallGlobalDefault?.settings?.INCLUDE_INSULATION_IN_HYDROTEST],
    ['INDIVIDUAL_FILE_SETTING', layers.individualFile?.settings?.INCLUDE_INSULATION_IN_HYDROTEST],
    ['LOAD_CASE_SETTING', layers.loadCase?.cases?.L1?.INCLUDE_INSULATION_IN_HYDROTEST],
    ['MODEL_INPUT', layers.modelInput?.settings?.INCLUDE_INSULATION_IN_HYDROTEST],
  ].filter(([, value]) => value !== undefined);
  if (values.length === 0) return { value: false, level: 'CAESAR_II_V14_DEFAULT', source: 'HEXAGON_V14_1403380' };
  const [level, raw] = values.at(-1);
  const value = typeof raw === 'object' && raw !== null ? raw.value : raw;
  if (typeof value !== 'boolean') throw new Error('Include Insulation in Hydrotest must resolve to boolean.');
  return { value, level, source: 'BM4L_CONFIGURATION_AUTHORITY' };
}

function compare(pkg, actual, baseline) {
  const ref = vectors(pkg.references.L1.rows);
  const got = vectors(actual.cases.L1.rows);
  const prior = new Map((baseline.restraints ?? []).map((row) => [row.restraintId, row]));
  return actual.mechanics.cases.L1.iterations.at(-1).supports.map((support) => {
    const r = ref.get(support.nodeId) ?? {};
    const g = got.get(support.nodeId) ?? {};
    const rn = Math.abs(r[support.normalDof] ?? 0);
    const error = rn === 0 ? null : 100 * (support.normalReactionMagnitudeN - rn) / rn;
    const old = prior.get(support.restraintId)?.normal?.percentError ?? null;
    return { restraintId: support.restraintId, nodeId: support.nodeId, referenceNormalN: rn, solvedNormalN: support.normalReactionMagnitudeN, normalPercentError: error, baselineNormalPercentError: old, absoluteErrorChangePercentPoints: error === null || old === null ? null : Math.abs(error) - Math.abs(old) };
  });
}

function vectors(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || row.quantity !== 'FORCE') continue;
    const v = map.get(String(row.entityId)) ?? {};
    v[row.component] = Number(row.value);
    map.set(String(row.entityId), v);
  }
  return map;
}

function summarize(rows, baseline) {
  const comparable = rows.filter((row) => row.normalPercentError !== null);
  const within = comparable.filter((row) => Math.abs(row.normalPercentError) <= 100 * GOAL).length;
  const worst = Math.max(...comparable.map((row) => Math.abs(row.normalPercentError)));
  const improved = comparable.filter((row) => row.absoluteErrorChangePercentPoints < 0).length;
  const worsened = comparable.filter((row) => row.absoluteErrorChangePercentPoints > 0).length;
  const oldWithin = Number(baseline.summary.normalWithinGoal);
  const oldWorst = Number(baseline.summary.normalWorstPercentError);
  return { normalWithinGoal: within, normalCompared: comparable.length, normalWorstPercentError: worst, baselineNormalWithinGoal: oldWithin, baselineNormalWorstPercentError: oldWorst, improvedNormalCount: improved, worsenedNormalCount: worsened, nominationStatus: within > oldWithin && worst < oldWorst && improved > worsened ? 'NOMINATE_FOR_SEPARATE_PRODUCTION_CHANGE' : 'DO_NOT_NOMINATE' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
  if (!args.get('--accdb')) throw new Error('Usage: --accdb <BM4_L.ACCDB> [--out file]');
  const result = await runHydInsulationFalse({ accdbPath: args.get('--accdb'), outPath: args.get('--out') });
  if (args.get('--out')) { const out = resolve(args.get('--out')); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, `${canonicalPrettyStringify(result)}\n`); }
  process.stdout.write(`${canonicalPrettyStringify({ converged: result.converged, authority: result.authority, summary: result.summary ?? null, failedGates: result.failedGates ?? result.failure?.failedGates ?? null, productionPromotionAuthorized: false })}\n`);
}
