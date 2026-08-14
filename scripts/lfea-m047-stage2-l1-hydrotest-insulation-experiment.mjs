#!/usr/bin/env node
/**
 * M047 Stage 2 — L1 hydrotest insulation discriminator.
 *
 * This is deliberately an EXPERIMENT, not a production mechanic. It runs the
 * real pinned BM4_L ACCDB twice under the production R2/D1 friction law and the
 * established L1 800-iteration ceiling:
 *
 *   baseline: current WW + HP implementation;
 *   H1:       identical model/case, except nonzero INPUT_BASIC_ELEMENT_DATA
 *             INSUL_THICK values are set to zero before package construction.
 *
 * The single synthetic input mutation represents CAESAR II v14's governed
 * "Include Insulation in Hydrotest = False" behavior for a HYD load case. HP,
 * water density, friction law, stiffness, tolerances and convergence gates are
 * unchanged. The script refuses to claim promotion: it only emits evidence for
 * deciding whether the production hydrotest basis should gain an explicit
 * include-insulation authority.
 *
 * Official CAESAR II v14 help states that WW normally includes insulation, but
 * a HYD case excludes insulation/cladding when Include Insulation in Hydrotest
 * is False; False is the default.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-l1-hydrotest-insulation-experiment.mjs \
 *     --accdb <BM4_L.ACCDB> [--out <evidence.json>]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalPrettyStringify,
  semanticHash,
} from '../src/core/shared-piping-model/canonical-json.js';
import {
  buildCaesarAccdbBenchmarkPackage,
  requiredCaesarAccdbTables,
} from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import {
  CAESAR_FRICTION_SOLVER_PROFILE,
  solveCaesarAccdbFrictionBenchmark,
} from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const CASE_ID = 'L1';
const MAXIMUM_ITERATIONS = 800;
const GOAL_RELATIVE = 0.1;
const REGIME_SURFACE_TOLERANCE = 0.02;

export async function runL1HydrotestInsulationExperiment(input) {
  const profilePath = resolve(input.profilePath ?? PROFILE_PATH);
  const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });

  const baselinePackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const mutation = excludeHydrotestInsulation(rawExport);
  const variantPackage = buildCaesarAccdbBenchmarkPackage({
    rawExport: mutation.rawExport,
    profile,
  });
  requireInvariantHydroPressure(baselinePackage, variantPackage);
  requireInvariantReferences(baselinePackage, variantPackage);

  const solverProfile = Object.freeze({
    ...CAESAR_FRICTION_SOLVER_PROFILE,
    maximumIterations: MAXIMUM_ITERATIONS,
  });

  const baseline = timedSolve(baselinePackage, solverProfile, 'BASELINE_CURRENT_WW_HP');
  const variant = timedSolve(variantPackage, solverProfile, 'H1_HYD_INSULATION_EXCLUDED');

  const record = {
    schema: 'm047-bm4l-stage2-l1-hydrotest-insulation-experiment/v1',
    caseId: CASE_ID,
    promotionEligible: false,
    sourceAccdbSha256: baselinePackage.source.sha256,
    sourceAccdbByteLength: baselinePackage.source.byteLength,
    profileId: baselinePackage.profile.profileId,
    solverProfileId: solverProfile.profileId,
    maximumIterations: solverProfile.maximumIterations,
    mechanicsChange: {
      id: 'H1_HYDROTEST_INSULATION_EXCLUSION',
      scope: 'L1_WW_WEIGHT_BASIS_ONLY',
      baseline: 'CURRENT_WW_INCLUDES_INPUT_INSULATION_WEIGHT',
      variant: 'HYD_WW_EXCLUDES_INSULATION_WEIGHT',
      unchanged: [
        'HP_HYDRO_PRESSURE_FIELD',
        'HYDROTEST_WATER_DENSITY',
        'D1_TOTAL_RELATIVE_TANGENTIAL_DIRECTION',
        'FRICTION_STIFFNESS',
        'COULOMB_CAP',
        'CONVERGENCE_GATES',
        'ACCEPTANCE_TOLERANCES',
      ],
      authority: {
        product: 'CAESAR II',
        version: '14',
        setting: 'Include Insulation in Hydrotest',
        documentedDefault: false,
        documentedEffect: 'HYD WW excludes insulation and cladding when False',
      },
    },
    syntheticInputMutation: mutation.evidence,
    packageIdentity: {
      baselineModelSemanticHash: baselinePackage.model.semanticHash,
      variantModelSemanticHash: variantPackage.model.semanticHash,
      baselineReferenceSemanticHash: semanticHash(baselinePackage.references[CASE_ID].rows),
      variantReferenceSemanticHash: semanticHash(variantPackage.references[CASE_ID].rows),
    },
    baseline,
    variant,
    comparison: compareRuns(baseline, variant),
  };
  return Object.freeze({ ...record, evidenceSemanticHash: semanticHash(record) });
}

function excludeHydrotestInsulation(rawExport) {
  const table = rawExport?.tables?.INPUT_BASIC_ELEMENT_DATA;
  if (!table || !Array.isArray(table.rows)) {
    throw new TypeError('INPUT_BASIC_ELEMENT_DATA rows are required for the L1 insulation experiment.');
  }
  const changedElements = [];
  const rows = table.rows.map((row) => {
    const token = row.INSUL_THICK;
    if (token === null || token === undefined || String(token).trim() === '') return row;
    const thickness = Number(token);
    if (!Number.isFinite(thickness) || thickness < 0) {
      throw new TypeError(`Invalid INSUL_THICK on element ${String(row.ELEMENTID)}: ${String(token)}.`);
    }
    if (thickness === 0) return row;
    changedElements.push({
      elementId: String(row.ELEMENTID),
      fromNode: String(row.FROM_NODE),
      toNode: String(row.TO_NODE),
      baselineInsulationThickness: thickness,
      variantInsulationThickness: 0,
    });
    return { ...row, INSUL_THICK: 0 };
  });
  if (changedElements.length === 0) {
    throw new TypeError('The pinned model has no nonzero insulation thickness to discriminate.');
  }
  return {
    rawExport: {
      ...rawExport,
      tables: {
        ...rawExport.tables,
        INPUT_BASIC_ELEMENT_DATA: { ...table, rows },
      },
    },
    evidence: {
      mode: 'SYNTHETIC_ONE_FIELD_DISCRIMINATOR_NOT_SOURCE_TRUTH',
      table: 'INPUT_BASIC_ELEMENT_DATA',
      field: 'INSUL_THICK',
      operation: 'NONZERO_TO_ZERO',
      changedElementCount: changedElements.length,
      changedElements,
      baselineRowsSemanticHash: semanticHash(table.rows),
      variantRowsSemanticHash: semanticHash(rows),
    },
  };
}

function requireInvariantHydroPressure(baselinePackage, variantPackage) {
  const baseline = baselinePackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
    .map((row) => [String(row.ELEMENTID), row.HYDRO_PRESSURE]);
  const variant = variantPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
    .map((row) => [String(row.ELEMENTID), row.HYDRO_PRESSURE]);
  if (semanticHash(baseline) !== semanticHash(variant)) {
    throw new TypeError('H1 discriminator changed HYDRO_PRESSURE; experiment is invalid.');
  }
}

function requireInvariantReferences(baselinePackage, variantPackage) {
  const baseline = semanticHash(baselinePackage.references[CASE_ID].rows);
  const variant = semanticHash(variantPackage.references[CASE_ID].rows);
  if (baseline !== variant) {
    throw new TypeError('H1 discriminator changed CAESAR reference rows; experiment is invalid.');
  }
}

function timedSolve(benchmarkPackage, solverProfile, label) {
  const started = Date.now();
  try {
    const actual = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, [CASE_ID], {
      profile: solverProfile,
      frictionStiffnessScale: 1,
    });
    const restraints = compareRestraints({ benchmarkPackage, actual });
    return {
      label,
      converged: true,
      elapsedMs: Date.now() - started,
      failure: null,
      iterationCount: actual.mechanics.cases[CASE_ID].iterationCount,
      iterationSemanticHash: actual.mechanics.cases[CASE_ID].iterationSemanticHash,
      summary: summarize(restraints),
      restraints,
    };
  } catch (error) {
    return {
      label,
      converged: false,
      elapsedMs: Date.now() - started,
      failure: {
        message: error.message,
        code: error.code ?? null,
        iterationCount: error.iterations?.length ?? null,
        lastFailedGates: error.iterations?.at(-1)?.failedGates ?? null,
        lastFailedGateEvidence: error.iterations?.at(-1)?.failedGateEvidence ?? null,
        displacementUpdateTail: (error.iterations ?? []).slice(-8)
          .map((entry) => entry.displacementUpdateNormM),
        reactionUpdateTail: (error.iterations ?? []).slice(-8)
          .map((entry) => entry.reactionUpdateNormN),
      },
      iterationCount: error.iterations?.length ?? null,
      iterationSemanticHash: null,
      summary: null,
      restraints: null,
    };
  }
}

function compareRestraints({ benchmarkPackage, actual }) {
  const reference = vectorsByNode(benchmarkPackage.references[CASE_ID].rows);
  const solved = vectorsByNode(actual.cases[CASE_ID].rows);
  const evidence = actual.mechanics.cases[CASE_ID];
  const supports = evidence.iterations.at(-1).supports;
  return supports.map((support) => {
    const referenceVector = reference.get(support.nodeId) ?? {};
    const solvedVector = solved.get(support.nodeId) ?? {};
    const frictionDofs = support.frictionDofs;
    const referenceTangential = frictionDofs.map((dof) => referenceVector[dof] ?? 0);
    const solvedTangential = frictionDofs.map((dof) => solvedVector[dof] ?? 0);
    const referenceNormal = Math.abs(referenceVector[support.normalDof] ?? 0);
    const referenceCapacity = support.coefficientOfFriction * referenceNormal;
    const referenceMagnitude = norm(referenceTangential);
    const solvedMagnitude = norm(solvedTangential);
    const vectorError = norm(solvedTangential.map((value, index) => value - referenceTangential[index]));
    const referenceRegime = referenceCapacity === 0
      ? 'NONE'
      : referenceMagnitude >= referenceCapacity * (1 - REGIME_SURFACE_TOLERANCE) ? 'SLID' : 'STUCK';
    return {
      restraintId: support.restraintId,
      nodeId: support.nodeId,
      normal: {
        referenceN: referenceNormal,
        solvedN: support.normalReactionMagnitudeN,
        percentError: percentError(support.normalReactionMagnitudeN, referenceNormal),
      },
      tangential: {
        referenceN: referenceTangential,
        solvedN: solvedTangential,
        referenceMagnitudeN: referenceMagnitude,
        solvedMagnitudeN: solvedMagnitude,
        vectorErrorN: vectorError,
        vectorRelativeError: referenceMagnitude === 0 ? null : vectorError / referenceMagnitude,
      },
      regime: {
        reference: referenceRegime,
        solved: support.regime,
        match: referenceRegime === support.regime,
      },
    };
  }).sort((left, right) => Math.abs(right.normal.percentError ?? 0) - Math.abs(left.normal.percentError ?? 0));
}

function summarize(restraints) {
  const tangentialCompared = restraints.filter((row) => row.tangential.vectorRelativeError !== null);
  const tangentialWithin = tangentialCompared.filter((row) => row.tangential.vectorRelativeError <= GOAL_RELATIVE);
  const normalWithin = restraints.filter((row) => row.normal.percentError !== null
    && Math.abs(row.normal.percentError) <= GOAL_RELATIVE * 100);
  return {
    goalRelative: GOAL_RELATIVE,
    frictionRestraintCount: restraints.length,
    normalWithinGoal: normalWithin.length,
    normalWorstPercentError: Math.max(...restraints.map((row) => Math.abs(row.normal.percentError ?? 0))),
    tangentialVectorsCompared: tangentialCompared.length,
    tangentialVectorsWithinGoal: tangentialWithin.length,
    tangentialWorstRelativeError: tangentialCompared.length === 0
      ? null
      : Math.max(...tangentialCompared.map((row) => row.tangential.vectorRelativeError)),
    regimeMismatchCount: restraints.filter((row) => !row.regime.match).length,
  };
}

function compareRuns(baseline, variant) {
  if (!baseline.converged || !variant.converged) {
    return {
      comparable: false,
      reason: 'BOTH_RUNS_MUST_CONVERGE_BEFORE_ACCURACY_DELTA_IS_INTERPRETED',
    };
  }
  const baselineById = new Map(baseline.restraints.map((row) => [row.restraintId, row]));
  const rows = variant.restraints.map((row) => {
    const prior = baselineById.get(row.restraintId);
    if (!prior) throw new TypeError(`Variant restraint ${row.restraintId} is absent from baseline.`);
    return {
      restraintId: row.restraintId,
      nodeId: row.nodeId,
      baselineNormalPercentError: prior.normal.percentError,
      variantNormalPercentError: row.normal.percentError,
      absoluteNormalErrorImprovementPoints:
        Math.abs(prior.normal.percentError ?? 0) - Math.abs(row.normal.percentError ?? 0),
      baselineTangentialVectorRelativeError: prior.tangential.vectorRelativeError,
      variantTangentialVectorRelativeError: row.tangential.vectorRelativeError,
      regimeBaseline: prior.regime.solved,
      regimeVariant: row.regime.solved,
    };
  }).sort((left, right) => right.absoluteNormalErrorImprovementPoints - left.absoluteNormalErrorImprovementPoints);
  return {
    comparable: true,
    normalWithinGoalDelta: variant.summary.normalWithinGoal - baseline.summary.normalWithinGoal,
    normalWorstPercentErrorDelta:
      variant.summary.normalWorstPercentError - baseline.summary.normalWorstPercentError,
    tangentialVectorsWithinGoalDelta:
      variant.summary.tangentialVectorsWithinGoal - baseline.summary.tangentialVectorsWithinGoal,
    rows,
  };
}

function vectorsByNode(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || !['FORCE', 'MOMENT'].includes(row.quantity)) continue;
    const vector = map.get(String(row.entityId)) ?? {};
    vector[row.component] = Number(row.value);
    map.set(String(row.entityId), vector);
  }
  return map;
}

function percentError(solved, reference) {
  if (reference === 0) return null;
  return ((solved - reference) / Math.abs(reference)) * 100;
}

function norm(values) {
  return Math.hypot(...values);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const accepted = new Map();
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 2) accepted.set(argv[index], argv[index + 1]);
  const accdbPath = accepted.get('--accdb');
  if (!accdbPath) {
    throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--out <evidence.json>]');
  }
  const record = await runL1HydrotestInsulationExperiment({ accdbPath });
  const outPath = accepted.get('--out') ?? null;
  if (outPath !== null) {
    mkdirSync(dirname(resolve(outPath)), { recursive: true });
    writeFileSync(resolve(outPath), `${canonicalPrettyStringify(record)}\n`, 'utf8');
  }
  process.stdout.write(`${canonicalPrettyStringify(record)}\n`);
}
