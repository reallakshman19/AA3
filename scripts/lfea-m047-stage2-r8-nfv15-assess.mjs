#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const BASELINE_SOLVER = 'CAESAR-ACCDB-FRICTION-SOLVER-R2';
const THRESHOLD = 0.15;
const GOAL = 0.10;
const CASES = ['L13', 'L7', 'L1'];

export function assessR8Nfv15({ baseline, experiment }) {
  record(baseline, 'baseline');
  record(experiment, 'experiment');
  const caseId = String(experiment.caseId ?? '');
  if (!CASES.includes(caseId) || baseline.caseId !== caseId) throw new TypeError('Baseline/experiment case mismatch.');
  if (baseline.sourceAccdbSha256 !== SHA || experiment.sourceAccdbSha256 !== SHA) throw new TypeError('Pinned ACCDB SHA required.');
  if (baseline.solverProfileId !== BASELINE_SOLVER) throw new TypeError('Baseline must be production R2.');
  if (experiment.productionPromotionAuthorized !== false || experiment.benchmarkAuthority === true) {
    throw new TypeError('R8 measurement artifact must remain non-promotional.');
  }
  const nfv = experiment.nfv15 ?? experiment.mechanic ?? null;
  record(nfv, 'experiment.nfv15');
  if (Number(nfv.threshold ?? nfv.relativeThreshold) !== THRESHOLD) throw new TypeError('R8 must use NFV=0.15 exactly.');
  if (String(nfv.capacityNormalSource ?? '') !== 'CURRENT_OWN_RESTRAINT_NORMAL_WITH_RETAINED_SLIDING_BASIS') {
    throw new TypeError('R8 capacity normal source declaration mismatch.');
  }
  if (nfv.refreshRule !== 'REFRESH_ONLY_WHEN_RELATIVE_VARIATION_GT_THRESHOLD') {
    throw new TypeError('R8 refresh rule declaration mismatch.');
  }
  if (experiment.oneMechanicOnly !== true) throw new TypeError('R8 artifact must declare oneMechanicOnly=true.');

  const before = mapRows(baseline.restraints);
  const after = mapRows(experiment.restraints);
  const ids = [...new Set([...before.keys(), ...after.keys()])].sort(text);
  const perRestraint = ids.map((id) => compareRow(id, before.get(id), after.get(id)));
  const comparable = perRestraint.filter((r) => r.comparable);
  const normalWithinGoal = comparable.filter((r) => r.experimentNormalRelativeError !== null && r.experimentNormalRelativeError <= GOAL).length;
  const tangentWithinGoal = comparable.filter((r) => r.experimentTangentialRelativeError !== null && r.experimentTangentialRelativeError <= GOAL).length;
  const regimeMatches = comparable.filter((r) => r.experimentRegimeMatch === true).length;
  const baselineNormalWithinGoal = comparable.filter((r) => r.baselineNormalRelativeError !== null && r.baselineNormalRelativeError <= GOAL).length;
  const baselineTangentWithinGoal = comparable.filter((r) => r.baselineTangentialRelativeError !== null && r.baselineTangentialRelativeError <= GOAL).length;
  const baselineRegimeMatches = comparable.filter((r) => r.baselineRegimeMatch === true).length;

  const gates = {
    custody: experiment.sourceAccdbSha256 === SHA,
    converged: experiment.converged === true,
    equilibrium: experiment.equilibriumStatus === 'PASS' || experiment.recoveredEquilibriumStatus === 'PASS',
    nonlinearGates: experiment.nonlinearGateStatus === 'PASS' || experiment.gates?.status === 'CONVERGED',
    nfvRefreshRule: experiment.nfvRefreshGateStatus === 'PASS' || nfv.refreshGateStatus === 'PASS',
    completeRestraintSet: before.size > 0 && after.size === before.size && comparable.length === before.size,
  };
  const physicsPass = Object.values(gates).every(Boolean);
  const summary = {
    comparedRestraints: comparable.length,
    baselineNormalWithinGoal,
    experimentNormalWithinGoal: normalWithinGoal,
    normalWithinGoalDelta: normalWithinGoal - baselineNormalWithinGoal,
    baselineTangentialWithinGoal: baselineTangentWithinGoal,
    experimentTangentialWithinGoal: tangentWithinGoal,
    tangentialWithinGoalDelta: tangentWithinGoal - baselineTangentWithinGoal,
    baselineRegimeMatches,
    experimentRegimeMatches: regimeMatches,
    regimeMatchDelta: regimeMatches - baselineRegimeMatches,
    worstExperimentNormalRelativeError: max(comparable.map((r) => r.experimentNormalRelativeError)),
    worstExperimentTangentialRelativeError: max(comparable.map((r) => r.experimentTangentialRelativeError)),
  };
  const nomination = !physicsPass
    ? 'REJECT_R8_MEASUREMENT_PHYSICS_OR_CUSTODY_GATE_FAILED'
    : summary.tangentialWithinGoalDelta > 0 && summary.normalWithinGoalDelta >= 0
      ? 'R8_NFV15_DIRECTIONALLY_NOMINATED_REQUIRES_NEXT_CASE_AND_CONTROLS'
      : 'R8_NFV15_NOT_NOMINATED_BY_FROZEN_ACCURACY_METRICS';
  return Object.freeze({
    schema: 'm047-bm4l-stage2-r8-nfv15-assessment/v1',
    caseId,
    sourceAccdbSha256: SHA,
    baselineSolverProfileId: BASELINE_SOLVER,
    candidate: 'R8_NFV15',
    threshold: THRESHOLD,
    goalRelative: GOAL,
    gates,
    summary,
    nomination,
    productionPromotionAuthorized: false,
    nextCase: caseId === 'L13' && nomination.startsWith('R8_NFV15_DIRECTIONALLY') ? 'L7'
      : caseId === 'L7' && nomination.startsWith('R8_NFV15_DIRECTIONALLY') ? 'L1'
        : null,
    perRestraint,
  });
}

function compareRow(restraintId, b, e) {
  const bn = rel(b?.normal?.percentError);
  const en = rel(e?.normal?.percentError);
  const bt = finite(b?.tangential?.vectorRelativeError);
  const et = finite(e?.tangential?.vectorRelativeError);
  return {
    restraintId,
    nodeId: e?.nodeId ?? b?.nodeId ?? null,
    comparable: Boolean(b && e),
    baselineNormalRelativeError: bn,
    experimentNormalRelativeError: en,
    normalAbsoluteErrorDelta: bn === null || en === null ? null : en - bn,
    baselineTangentialRelativeError: bt,
    experimentTangentialRelativeError: et,
    tangentialErrorDelta: bt === null || et === null ? null : et - bt,
    baselineRegimeMatch: b?.regime?.match ?? null,
    experimentRegimeMatch: e?.regime?.match ?? null,
    retainedNormalBasisN: finite(e?.nfv15?.retainedNormalBasisN ?? e?.retainedNormalBasisN),
    currentNormalN: finite(e?.nfv15?.currentNormalN ?? e?.currentNormalN),
    finalVariationRatio: finite(e?.nfv15?.variationRatio ?? e?.normalVariationRatio),
    refreshCount: finite(e?.nfv15?.refreshCount ?? e?.nfvRefreshCount),
  };
}
function mapRows(rows) { if (!Array.isArray(rows)) throw new TypeError('restraints must be an array.'); return new Map(rows.map((r) => [r.restraintId, r])); }
function rel(v) { const n = finite(v); return n === null ? null : Math.abs(n) / 100; }
function finite(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function max(values) { const clean = values.filter((v) => v !== null); return clean.length ? Math.max(...clean) : null; }
function record(v, label) { if (!v || typeof v !== 'object') throw new TypeError(`${label} must be an object.`); }
function text(a, b) { return String(a).localeCompare(String(b), 'en'); }

function parse(argv) {
  const a = new Map(); for (let i = 0; i < argv.length; i += 2) a.set(argv[i], argv[i + 1]);
  if (!a.get('--baseline') || !a.get('--experiment')) throw new TypeError('Usage: --baseline <R2.json> --experiment <R8.json> [--out <json>]');
  return { baseline: a.get('--baseline'), experiment: a.get('--experiment'), out: a.get('--out') ?? null };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = parse(process.argv.slice(2));
  const result = assessR8Nfv15({ baseline: JSON.parse(readFileSync(resolve(a.baseline), 'utf8')), experiment: JSON.parse(readFileSync(resolve(a.experiment), 'utf8')) });
  const textOut = `${JSON.stringify(result, null, 2)}\n`;
  if (a.out) { const p = resolve(a.out); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, textOut, 'utf8'); }
  process.stdout.write(textOut);
}
