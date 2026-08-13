#!/usr/bin/env node
/**
 * M047 Stage 2 — L7 load-step readiness plan.
 *
 * Planning only. No solve or production mechanic is changed here. The plan is
 * emitted only after the post-direction residual RCA explicitly clears L13.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const STEP_COUNTS = Object.freeze([1, 5, 10]);

export function buildL7LoadStepPlan(residualRca) {
  if (residualRca?.schema !== 'm047-bm4l-stage2-post-direction-residual-rca/v1') {
    throw new TypeError('L7 stepping requires the governed post-direction residual RCA artifact.');
  }
  if (residualRca.caseId !== 'L13') {
    throw new TypeError(`L7 stepping gate requires L13 RCA; received ${residualRca.caseId}.`);
  }
  if (residualRca.next?.decision !== 'L13_RCA_CLEARED_FOR_L7_LOAD_STEPPING'
      || residualRca.next?.l7LoadSteppingAllowed !== true) {
    const error = new Error(
      `L7 load stepping is blocked by L13 RCA decision ${residualRca.next?.decision ?? '<missing>'}.`,
    );
    error.code = 'M047_L7_LOAD_STEPPING_BLOCKED_BY_L13_RCA';
    throw error;
  }

  const plan = {
    schema: 'm047-bm4l-stage2-l7-load-step-plan/v1',
    sourceAccdbSha256: residualRca.sourceAccdbSha256,
    sourceL13ResidualRcaSemanticHash: residualRca.semanticHash,
    caseId: 'L7',
    caseClass: 'OPE',
    formula: 'W+T1+P1',
    frictionlessTwinCaseId: 'L5',
    mechanic: 'EQUAL_LOAD_INCREMENT_CONTINUATION_WITH_CARRIED_FRICTION_STATE_V1',
    stepCounts: [...STEP_COUNTS],
    variants: STEP_COUNTS.map((count) => ({
      label: `L7-EQUAL-STEPS-${count}`,
      stepCount: count,
      incrementFraction: 1 / count,
      carrySlipStateBetweenIncrements: true,
      carryActiveSetBetweenIncrements: true,
      solveEachIncrementToExistingNonlinearConvergenceGates: true,
      finalComparisonAtFullLoadOnly: true,
    })),
    unchangedMechanics: [
      'FRICTION_DIRECTION_RULE',
      'FRICTION_STIFFNESS',
      'COULOMB_CAPACITY_RULE',
      'NORMAL_REACTION_BASIS',
      'STATE_BOUNDARY_AND_HYSTERESIS',
      'CONVERGENCE_LIMITS',
      'RESULT_COMPARISON_THRESHOLDS',
      'L5_CONTROL_MECHANICS',
    ],
    selectionRule:
      'LOAD_STEPPING_MAY_BE_PROMOTED_ONLY_IF_A_DECLARED_STEP_COUNT_IMPROVES_L7_WITHOUT_CHANGING_L13_OR_CONTROL_MECHANICS_V1',
    mechanicsChanged: false,
    toleranceChanged: false,
    comparisonPolicyChanged: false,
  };
  return Object.freeze({ ...plan, semanticHash: semanticHash(plan) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 2) args.set(argv[index], argv[index + 1]);
  const rcaPath = args.get('--l13-rca');
  if (!rcaPath) throw new TypeError('Usage: --l13-rca <post-direction-residual-rca.json> [--out <plan.json>]');
  const rca = JSON.parse(readFileSync(resolve(rcaPath), 'utf8'));
  const plan = buildL7LoadStepPlan(rca);
  const out = args.get('--out');
  if (out) {
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(resolve(out), `${canonicalPrettyStringify(plan)}\n`, 'utf8');
  }
  process.stdout.write(`${canonicalPrettyStringify(plan)}\n`);
}
