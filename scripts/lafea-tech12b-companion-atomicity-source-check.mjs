#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../src/workspace/lafea-workbench-mesh-generation-actions.js', import.meta.url),
  'utf8',
);

// Source-wiring guard only. Runtime custody behavior is exercised separately by
// the TECH12B retained-parent-normal companion regression.
assert.match(source, /function rollbackCompanionCustody\(stageId, midsurface\)/u);
assert.match(source, /meshGeneration\.invalidate\(stageId\)/u);
assert.match(
  source,
  /meshGeneration\.registerShellMidsurface\(midsurface, readStageState\(stageId\)\)/u,
);
assert.match(
  source,
  /const prevalidatedCompanion = parentNormalCompanionForEvidence\(stageId, validated\)/u,
);
assert.match(
  source,
  /prevalidatedCompanion\.semanticHash !== retainedCompanion\.semanticHash/u,
);
assert.match(source, /rollbackCompanionCustody\(stageId, currentMidsurface\)/u);
assert.match(
  source,
  /const parentNormalCompanion = parentNormalCompanionForEvidence\(stageId, result\.evidence\)/u,
);

console.log(JSON.stringify({
  check: 'lafea-tech12b-companion-atomicity-source-wiring',
  status: 'PASS',
  guards: {
    recoveryPrevalidatesCompanionBeforeMeshRecovery: true,
    generatedOrRecoveredChildDiscardedOnCompanionFailure: true,
    currentMidsurfaceRestoredAfterRollback: true,
    recoveryCompanionReplayHashChecked: true,
  },
  classification: 'SOURCE_WIRING_ONLY_NOT_RUNTIME_ENGINEERING_QUALIFICATION',
}, null, 2));
