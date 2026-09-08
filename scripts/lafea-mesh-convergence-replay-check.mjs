#!/usr/bin/env node
/**
 * Replay retained M4 histories through the shared production convergence API.
 * CLI inputs: historical M4 audit path and new evidence JSON output path.
 * Preserve old classifications and exact raw histories; reject changed limits,
 * relative changes or source audit hashes. No solver is executed or substituted.
 * Missing/invalid input throws, and output refuses overwrite without fallback.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { canonicalQuantityHistory, qualifyConvergenceSet } from '../src/core/lafea-meshing/mesh-convergence-framework.js';
import { finalizeAuditRecord } from './lib/lafea-benchmark-audit.mjs';

const [auditPath, outputPath] = process.argv.slice(2);
assert.ok(auditPath && outputPath, 'Usage: node scripts/lafea-mesh-convergence-replay-check.mjs <old M4 audit> <new output JSON>');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const { recordHash, ...body } = audit;
assert.equal(recordHash, finalizeAuditRecord(body).recordHash);
assert.equal(audit.stageId, 'M4');
assert.equal(audit.caseStatus, 'FAIL', 'Use the retained pre-fix failure, not a newly passing baseline');
const observations = audit.methodResults[0].evidence.observations;
assert.equal(observations.length, 4);
const replay = observations.map((row) => {
  const histories = row.histories.map((history) => canonicalQuantityHistory(history.quantity, history.valuesByLevel));
  const result = qualifyConvergenceSet(histories, {});
  assert.equal(result.accepted, true, `${row.ladderId} retained patch history must qualify`);
  const comparisons = result.results.map((current, index) => {
    const previous = row.convergence.results[index];
    assert.equal(current.limit, previous.limit);
    assert.equal(current.relativeChange, previous.relativeChange);
    assert.deepEqual(histories[index].valuesByLevel, row.histories[index].valuesByLevel);
    return { historyId: row.histories[index].historyId, valuesByLevel: row.histories[index].valuesByLevel,
      previous, current };
  });
  return { ladderId: row.ladderId, previousStatus: row.status, status: 'PASS', comparisons };
});
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
assert.equal(head.status, 0, head.stderr);
const evidence = {
  schema: 'lafea-mesh-convergence-replay/v1',
  inputBasis: '[SIMULATED] frozen M4 analytical fixture histories; actual production convergence API',
  historicalCodeHead: audit.exactHeadSha,
  historicalAuditHash: recordHash,
  replayCodeHead: head.stdout.trim(),
  status: 'PASS',
  replay,
  percentageLimitsAndRelativeChangesUnchanged: true,
  solverExecutedByReplay: false,
};
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`PASS: replayed ${replay.reduce((sum, row) => sum + row.comparisons.length, 0)} histories with original limits and values.\n`);
