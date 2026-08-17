#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const planPath = path.join(repoRoot, 'validation/lafea-independent-qualification/plan-v1.json');
const planText = fs.readFileSync(planPath, 'utf8');
const plan = JSON.parse(planText);
assert.equal(`${JSON.stringify(plan, null, 2)}\n`, planText);

const required = {
  TECH12J_RUN_HISTORY_CURRENT_AUTHORITY: [
    'scripts/lafea-tech12j-run-history-current-authority-check.mjs',
  ],
  TECH12J_PLAN_CONTRACT: [
    'scripts/lafea-tech12j-plan-contract-check.mjs',
  ],
};
for (const [id, args] of Object.entries(required)) {
  const rows = plan.steps.filter((row) => row.id === id);
  assert.equal(rows.length, 1, `${id} must occur exactly once`);
  assert.equal(rows[0].classification, 'ENGINEERING');
  assert.equal(rows[0].required, true);
  assert.equal(rows[0].executable, 'node');
  assert.deepEqual(rows[0].args, args);
}

const ids = plan.steps.map((row) => row.id);
const i = (id) => ids.indexOf(id);
assert.ok(i('TECH12I_RELEASE_RESULT_CURRENTNESS') < i('TECH12J_RUN_HISTORY_CURRENT_AUTHORITY'));
assert.ok(i('TECH12J_RUN_HISTORY_CURRENT_AUTHORITY') < i('TECH12J_PLAN_CONTRACT'));
assert.ok(i('TECH12J_PLAN_CONTRACT') < i('TECH7_GRADED_REFINEMENT_EXECUTOR'));

console.log(JSON.stringify({
  check: 'lafea-tech12j-plan-contract',
  status: 'PASS',
  canonicalPlanBytes: Buffer.byteLength(planText, 'utf8'),
  tech12jRequired: true,
  planContractRequired: true,
  ordering: 'TECH12I < TECH12J < TECH12J_PLAN_CONTRACT < TECH7',
}, null, 2));
