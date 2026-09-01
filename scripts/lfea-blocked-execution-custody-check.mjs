import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const deliberateBreak = process.argv.includes('--deliberate-break');
const read = (path) => readFileSync(path, 'utf8');

const consumer = read('src/core/linear-piping-analysis-consumer/consumer.js');
let retained = read('src/core/linear-piping-analysis-consumer/retained-result-chain.js');
const contracts = read('src/core/linear-piping-analysis-consumer/contracts.js');
const recovery = read('src/core/linear-fea-result-recovery/recovery.js');

if (deliberateBreak) {
  // Simulate regression of the newly explicit retained-composition guard.
  // The ordinary run path and recovery path remain fail closed; this mode is
  // specifically intended to prove this check detects loss of the retained
  // composition boundary introduced for issue #1551 support-result custody.
  retained = retained.replace(
    "if (publicExecution.status === 'BLOCKED') {",
    "if (publicExecution.status === 'BROKEN-GUARD') {",
  );
}

assert.match(
  consumer,
  /if \(execution\.status === 'BLOCKED'\)[\s\S]*PIPING_ANALYSIS_EXECUTION_BLOCKED/u,
  'ordinary linear-piping orchestration must refuse a blocked solver execution before recovery',
);
assert.match(
  recovery,
  /if \(execution\.status === 'BLOCKED'\)[\s\S]*RECOVERY_EXECUTION_BLOCKED/u,
  'B-3.4 recovery must independently refuse a blocked solver execution',
);
assert.match(
  retained,
  /if \(publicExecution\.status === 'BLOCKED'\)[\s\S]*PIPING_ANALYSIS_EXECUTION_BLOCKED/u,
  'retained B-3.3/B-3.4 composition must explicitly refuse a blocked execution',
);
assert.match(
  contracts,
  /if \(execution\.status === 'BLOCKED'\)[\s\S]*PIPING_ANALYSIS_EXECUTION_BLOCKED/u,
  'public result relationship validation must independently refuse a blocked execution',
);

console.log('PASS lfea blocked execution custody guards');
