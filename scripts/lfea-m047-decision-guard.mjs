#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';

export function validateM047IterationDecision(evidence) {
  assert.equal(evidence?.schema, 'lfea-caesar-accdb-iteration-evidence/v1', 'iteration evidence schema');
  assert.equal(evidence.issueId, 'M047', 'issue identity');
  assert.equal(evidence.source?.accdbSha256, LOCKED_ACCDB_SHA256, 'locked ACCDB source');
  assert.match(String(evidence.git?.baseCommitSha ?? ''), /^[a-f0-9]{40}$/u, 'base commit SHA');
  assert.match(String(evidence.git?.candidateCommitSha ?? ''), /^[a-f0-9]{40}$/u, 'candidate commit SHA');
  assert.ok(Array.isArray(evidence.git.changedPaths), 'changedPaths must be an array');
  assert.equal(
    new Set(evidence.git.changedPaths).size,
    evidence.git.changedPaths.length,
    'changedPaths must not contain duplicates',
  );

  const match = /^M047-I(\d{3})$/u.exec(String(evidence.iterationId));
  assert.ok(match, 'iteration ID must use M047-I###');
  const iterationNumber = Number(match[1]);
  if (iterationNumber === 0) {
    assert.equal(evidence.parentIterationId, null, 'I000 must not have a parent');
    assert.equal(evidence.improvements, null, 'I000 must not report parent-relative improvements');
    assert.equal(evidence.decision.verdict, 'BASELINE', 'I000 verdict');
  } else {
    const expectedParent = `M047-I${String(iterationNumber - 1).padStart(3, '0')}`;
    assert.equal(evidence.parentIterationId, expectedParent, `${evidence.iterationId} sequential parent`);
    assert.ok(evidence.improvements, `${evidence.iterationId} must record improvements`);
  }

  assertMetricFailureConsistency(evidence);

  switch (evidence.decision.verdict) {
    case 'BASELINE':
      assert.equal(iterationNumber, 0, 'BASELINE is only valid for I000');
      break;
    case 'INSTRUMENTATION':
      assert.ok(iterationNumber > 0, 'INSTRUMENTATION requires a parent');
      assertAllInvariants(evidence);
      assertZeroImprovementDelta(evidence);
      break;
    case 'ACCEPT':
      assert.ok(iterationNumber > 0, 'ACCEPT requires a parent comparison');
      assertAllInvariants(evidence);
      break;
    case 'REJECT':
    case 'INCONCLUSIVE':
      assert.ok(iterationNumber > 0, `${evidence.decision.verdict} requires a parent comparison`);
      break;
    default:
      assert.fail(`unsupported verdict ${String(evidence.decision.verdict)}`);
  }

  return true;
}

function assertAllInvariants(evidence) {
  assert.equal(evidence.invariants.lockedSourceHash, true, 'locked source invariant');
  assert.equal(evidence.invariants.qualificationPresent, true, 'qualification invariant');
  assert.equal(evidence.invariants.executionHashesPresent, true, 'execution hash invariant');
  assert.equal(evidence.invariants.bendCoverage, true, 'bend coverage invariant');
  assert.equal(evidence.invariants.nodalEquilibrium, true, 'nodal equilibrium invariant');
  for (const [caseId, row] of Object.entries(evidence.invariants.cases ?? {})) {
    assert.equal(row.bendCoverage.status, 'PASS', `${caseId} bend coverage`);
    assert.equal(row.nodalEquilibrium.status, 'PASS', `${caseId} nodal equilibrium`);
    assert.equal(row.executionHashes.status, 'PASS', `${caseId} execution hashes`);
  }
}

function assertZeroImprovementDelta(evidence) {
  for (const [caseId, metrics] of Object.entries(evidence.improvements.metrics.cases)) {
    for (const family of ['restraints', 'displacement', 'sourceEndActions']) {
      for (const field of [
        'failingComponentDelta',
        'failingEntityDelta',
        'maximumPercentErrorDelta',
        'maximumAcceptanceRatioDelta',
      ]) {
        assert.equal(metrics[family][field], 0, `${caseId} ${family} ${field}`);
      }
    }
    for (const field of [
      'failingComponentDelta',
      'maximumAbsoluteForceResidualNDelta',
      'maximumAbsoluteMomentResidualNmDelta',
    ]) {
      assert.equal(metrics.equilibrium[field], 0, `${caseId} equilibrium ${field}`);
    }
  }
  for (const [caseId, families] of Object.entries(evidence.improvements.failures.cases)) {
    for (const [family, row] of Object.entries(families)) {
      assert.equal(row.netDelta, 0, `${caseId} ${family} failure netDelta`);
      assert.equal(row.resolvedCount, 0, `${caseId} ${family} resolvedCount`);
      assert.equal(row.introducedCount, 0, `${caseId} ${family} introducedCount`);
      assert.deepEqual(row.resolved, [], `${caseId} ${family} resolved identities`);
      assert.deepEqual(row.introduced, [], `${caseId} ${family} introduced identities`);
    }
  }
}

function assertMetricFailureConsistency(evidence) {
  for (const [caseId, metrics] of Object.entries(evidence.metrics ?? {})) {
    const identities = evidence.failureIdentities?.[caseId];
    assert.ok(identities, `${caseId} failure identities`);
    for (const family of ['restraints', 'displacement', 'sourceEndActions']) {
      assert.equal(
        metrics[family].failingComponentCount,
        identities[family].length,
        `${caseId} ${family} failure count must match failure identities`,
      );
    }
    assert.equal(
      metrics.equilibrium.failingComponentCount,
      identities.equilibrium.length,
      `${caseId} equilibrium failure count must match identities`,
    );
  }
}

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== '--evidence') {
    throw new TypeError('Usage: --evidence <iteration.json>.');
  }
  return resolve(argv[1]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const path = parseArguments(process.argv.slice(2));
    const evidence = JSON.parse(readFileSync(path, 'utf8'));
    validateM047IterationDecision(evidence);
    process.stdout.write(`lfea-m047-decision-guard: PASS ${evidence.iterationId} ${evidence.decision.verdict}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
