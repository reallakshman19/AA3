#!/usr/bin/env node
/**
 * Assess one measured L1 uniform-WW experiment against the committed production
 * R2 baseline. This is attribution only: it never promotes a mechanic.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-l1-uniform-ww-assess.mjs \
 *     --experiment reports/lfea-m047-stage2-l1-uniform-ww-experiment.json \
 *     [--baseline reports/lfea-m047-stage2-r2-rebaseline/L1.json] \
 *     [--out reports/lfea-m047-stage2-l1-uniform-ww-assessment.json]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const DEFAULT_BASELINE = 'reports/lfea-m047-stage2-r2-rebaseline/L1.json';
const EXPECTED_SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const EXPECTED_SOLVER = 'CAESAR-ACCDB-FRICTION-SOLVER-R2';

export function assessL1UniformWw({ baseline, experiment }) {
  requireRecord(baseline, 'baseline');
  requireRecord(experiment, 'experiment');
  if (baseline.caseId !== 'L1' || experiment.caseId !== 'L1') throw new TypeError('Both records must be L1.');
  if (baseline.sourceAccdbSha256 !== EXPECTED_SHA || experiment.sourceAccdbSha256 !== EXPECTED_SHA) {
    throw new TypeError('Baseline and experiment must both bind to the pinned BM4_L.ACCDB SHA-256.');
  }
  if (baseline.solverProfileId !== EXPECTED_SOLVER || experiment.solverProfileId !== EXPECTED_SOLVER) {
    throw new TypeError('Baseline and experiment must both use production R2 numerics.');
  }
  if (experiment.benchmarkAuthority !== false) throw new TypeError('The uniform-WW experiment must remain non-authoritative.');

  const baselineById = new Map(baseline.restraints.map((row) => [row.restraintId, row]));
  const experimentById = new Map(experiment.restraints?.map((row) => [row.restraintId, row]) ?? []);
  const ids = [...new Set([...baselineById.keys(), ...experimentById.keys()])].sort(compareText);
  const perRestraint = ids.map((restraintId) => {
    const before = baselineById.get(restraintId) ?? null;
    const after = experimentById.get(restraintId) ?? null;
    const beforeError = before?.normal?.percentError ?? null;
    const afterError = after?.normal?.percentError ?? null;
    const beforeAbs = beforeError === null ? null : Math.abs(Number(beforeError));
    const afterAbs = afterError === null ? null : Math.abs(Number(afterError));
    return {
      restraintId,
      nodeId: after?.nodeId ?? before?.nodeId ?? null,
      baselineNormalPercentError: beforeError,
      experimentNormalPercentError: afterError,
      absoluteNormalErrorDeltaPercentPoints: beforeAbs === null || afterAbs === null ? null : afterAbs - beforeAbs,
      direction: beforeAbs === null || afterAbs === null
        ? 'NOT_COMPARABLE'
        : afterAbs < beforeAbs ? 'IMPROVED'
          : afterAbs > beforeAbs ? 'WORSENED' : 'UNCHANGED',
    };
  });
  const comparable = perRestraint.filter((row) => row.direction !== 'NOT_COMPARABLE');
  const baselineSummary = baseline.summary ?? null;
  const experimentSummary = experiment.summary ?? null;
  const evidence = {
    converged: experiment.converged === true,
    failedGates: experiment.failure?.lastFailedGates ?? [],
    changedSourceCount: Number(experiment.changedMechanic?.changedSourceCount ?? 0),
    baselineNormalWithinGoal: baselineSummary?.normalWithinGoal ?? null,
    experimentNormalWithinGoal: experimentSummary?.normalWithinGoal ?? null,
    normalWithinGoalDelta: baselineSummary?.normalWithinGoal === undefined || experimentSummary?.normalWithinGoal === undefined
      ? null
      : Number(experimentSummary.normalWithinGoal) - Number(baselineSummary.normalWithinGoal),
    baselineWorstNormalPercentError: baselineSummary?.normalWorstPercentError ?? null,
    experimentWorstNormalPercentError: experimentSummary?.normalWorstPercentError ?? null,
    worstNormalAbsoluteErrorDeltaPercentPoints:
      baselineSummary?.normalWorstPercentError === undefined || experimentSummary?.normalWorstPercentError === undefined
        ? null
        : Number(experimentSummary.normalWorstPercentError) - Number(baselineSummary.normalWorstPercentError),
    improvedRestraintCount: comparable.filter((row) => row.direction === 'IMPROVED').length,
    worsenedRestraintCount: comparable.filter((row) => row.direction === 'WORSENED').length,
    unchangedRestraintCount: comparable.filter((row) => row.direction === 'UNCHANGED').length,
  };
  const interpretation = !evidence.converged
    ? 'COUNTERFACTUAL_DID_NOT_CONVERGE_NO_MECHANICS_PROMOTION'
    : evidence.changedSourceCount === 0
      ? 'NO_SPECIAL_COMPONENT_WEIGHT_CHANGE_HYPOTHESIS_NOT_LOAD_BEARING_ON_THIS_FILE'
      : evidence.normalWithinGoalDelta > 0
        && evidence.worstNormalAbsoluteErrorDeltaPercentPoints < 0
        && evidence.improvedRestraintCount > evidence.worsenedRestraintCount
        ? 'CONSISTENT_MULTI_METRIC_SUPPORT_FOR_SPECIAL_COMPONENT_WW_DENSITY_HYPOTHESIS_REQUIRES_PRODUCTION_CONTROL_RUN_BEFORE_PROMOTION'
        : 'MIXED_OR_NEGATIVE_EVIDENCE_DO_NOT_PROMOTE_SPECIAL_COMPONENT_WW_DENSITY_HYPOTHESIS';

  const base = {
    schema: 'm047-bm4l-stage2-l1-uniform-ww-assessment/v1',
    sourceAccdbSha256: EXPECTED_SHA,
    baselineSemanticHash: baseline.iterationSemanticHash ?? semanticHash(baseline),
    experimentSemanticHash: experiment.experimentSemanticHash ?? semanticHash(experiment),
    solverProfileId: EXPECTED_SOLVER,
    evidence,
    interpretation,
    productionPromotionAuthorized: false,
    reason: 'A diagnostic comparison may nominate or reject a mechanic; only a production implementation followed by frozen controls, nominal real-file cases, equilibrium, determinism and receipt can qualify it.',
    perRestraint,
  };
  return Object.freeze({ ...base, assessmentSemanticHash: semanticHash(base) });
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object') throw new TypeError(`${label} must be a JSON object.`);
}

function compareText(left, right) { return String(left).localeCompare(String(right), 'en'); }

function parse(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 2) args.set(argv[i], argv[i + 1]);
  const experimentPath = args.get('--experiment');
  if (!experimentPath) throw new TypeError('Usage: --experiment <json> [--baseline <json>] [--out <json>]');
  return {
    experimentPath,
    baselinePath: args.get('--baseline') ?? DEFAULT_BASELINE,
    outPath: args.get('--out') ?? null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parse(process.argv.slice(2));
  const baseline = JSON.parse(readFileSync(resolve(args.baselinePath), 'utf8'));
  const experiment = JSON.parse(readFileSync(resolve(args.experimentPath), 'utf8'));
  const result = assessL1UniformWw({ baseline, experiment });
  if (args.outPath) {
    const path = resolve(args.outPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${canonicalPrettyStringify(result)}\n`, 'utf8');
  }
  process.stdout.write(`${canonicalPrettyStringify({
    interpretation: result.interpretation,
    productionPromotionAuthorized: result.productionPromotionAuthorized,
    evidence: result.evidence,
  })}\n`);
}
