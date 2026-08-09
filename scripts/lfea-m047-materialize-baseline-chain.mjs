#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const NODE = process.execPath;
const REPORT = resolve(ROOT, 'reports/lfea-bm4nl-accdb-linear-benchmark.json');
const META_DIR = resolve(ROOT, 'benchmarks/LFEA/CAESAR_ACCDB/m047');
const DEFAULT_OUT = resolve(ROOT, 'reports/m047');
const ITERATIONS = Object.freeze(['M047-I000', 'M047-I001', 'M047-I002', 'M047-I003']);

const EXPECTED_BASELINE = Object.freeze({
  L19: Object.freeze({
    restraints: Object.freeze({ components: 1, entities: 1 }),
    displacement: Object.freeze({ components: 72, entities: 50 }),
    sourceEndActions: Object.freeze({ components: 20, entities: 13 }),
    equilibrium: Object.freeze({
      components: 3,
      maximumAbsoluteForceResidualN: 2.8942552840453573,
      maximumAbsoluteMomentResidualNm: 0.0004631888740505019,
    }),
  }),
  L20: Object.freeze({
    restraints: Object.freeze({ components: 5, entities: 5 }),
    displacement: Object.freeze({ components: 71, entities: 45 }),
    sourceEndActions: Object.freeze({ components: 137, entities: 46 }),
    equilibrium: Object.freeze({
      components: 7,
      maximumAbsoluteForceResidualN: 45.01575554162264,
      maximumAbsoluteMomentResidualNm: 0.0017931920914406874,
    }),
  }),
});

function main(argv) {
  const outRoot = parseArguments(argv).outDir ?? DEFAULT_OUT;
  mkdirSync(outRoot, { recursive: true });
  let parentPath = null;
  const evidenceByIteration = new Map();

  for (const iterationId of ITERATIONS) {
    const iterationDir = resolve(outRoot, iterationId);
    mkdirSync(iterationDir, { recursive: true });
    const iterationPath = resolve(iterationDir, 'iteration.json');
    const summaryPath = resolve(iterationDir, 'iteration-summary.md');
    const args = [
      resolve(ROOT, 'scripts/lfea-caesar-accdb-iteration.mjs'),
      '--report', REPORT,
      '--meta', resolve(META_DIR, `${iterationId}.request.json`),
      '--out', iterationPath,
      '--summary-out', summaryPath,
    ];
    if (parentPath !== null) args.push('--parent', parentPath);
    runNode(args, iterationId);
    const evidence = JSON.parse(readFileSync(iterationPath, 'utf8'));
    evidenceByIteration.set(iterationId, evidence);
    parentPath = iterationPath;
  }

  const baseline = evidenceByIteration.get('M047-I000');
  assertBaselineCounts(baseline);
  assertBaselineEquilibrium(baseline);
  assert.equal(baseline.invariants.bendCoverage, true, 'I000 must retain all 12 bends');
  assert.equal(
    baseline.invariants.nodalEquilibrium,
    false,
    'I000 strict 0.1 N equilibrium flag is frozen as a known retained-baseline failure',
  );
  assert.equal(baseline.invariants.executionHashesPresent, true, 'I000 execution hashes must be present');

  for (const iterationId of ['M047-I001', 'M047-I002', 'M047-I003']) {
    const evidence = evidenceByIteration.get(iterationId);
    assertZeroBenchmarkDelta(evidence, iterationId);
    assert.equal(evidence.invariants.bendCoverage, true, `${iterationId} must retain all 12 bends`);
    assert.equal(
      evidence.invariants.nodalEquilibrium,
      false,
      `${iterationId} must preserve the retained baseline equilibrium status exactly`,
    );
  }

  process.stdout.write(`M047 baseline chain materialized at ${outRoot}\n`);
  process.stdout.write('M047-I000..I003 retained benchmark metrics and equilibrium baseline: PASS\n');
}

function assertBaselineCounts(evidence) {
  for (const [caseId, expectedCase] of Object.entries(EXPECTED_BASELINE)) {
    const actualCase = evidence.metrics[caseId];
    assert.ok(actualCase, `I000 missing ${caseId}`);
    for (const family of ['restraints', 'displacement', 'sourceEndActions']) {
      const expected = expectedCase[family];
      assert.equal(
        actualCase[family].failingComponentCount,
        expected.components,
        `I000 ${caseId} ${family} failing components`,
      );
      assert.equal(
        actualCase[family].failingEntityCount,
        expected.entities,
        `I000 ${caseId} ${family} failing entities`,
      );
    }
  }
}

function assertBaselineEquilibrium(evidence) {
  for (const [caseId, expectedCase] of Object.entries(EXPECTED_BASELINE)) {
    const actual = evidence.metrics[caseId].equilibrium;
    const expected = expectedCase.equilibrium;
    assert.equal(
      actual.failingComponentCount,
      expected.components,
      `I000 ${caseId} equilibrium failing components`,
    );
    assert.equal(
      actual.maximumAbsoluteForceResidualN,
      expected.maximumAbsoluteForceResidualN,
      `I000 ${caseId} maximum absolute force residual`,
    );
    assert.equal(
      actual.maximumAbsoluteMomentResidualNm,
      expected.maximumAbsoluteMomentResidualNm,
      `I000 ${caseId} maximum absolute moment residual`,
    );
  }
}

function assertZeroBenchmarkDelta(evidence, iterationId) {
  assert.ok(evidence.improvements, `${iterationId} must have parent comparison evidence`);
  for (const [caseId, metrics] of Object.entries(evidence.improvements.metrics.cases)) {
    for (const family of ['restraints', 'displacement', 'sourceEndActions']) {
      assert.equal(metrics[family].failingComponentDelta, 0, `${iterationId} ${caseId} ${family} component delta`);
      assert.equal(metrics[family].failingEntityDelta, 0, `${iterationId} ${caseId} ${family} entity delta`);
      assert.equal(metrics[family].maximumPercentErrorDelta, 0, `${iterationId} ${caseId} ${family} max error delta`);
      assert.equal(metrics[family].maximumAcceptanceRatioDelta, 0, `${iterationId} ${caseId} ${family} acceptance-ratio delta`);
    }
    assert.equal(metrics.equilibrium.failingComponentDelta, 0, `${iterationId} ${caseId} equilibrium failure delta`);
    assert.equal(metrics.equilibrium.maximumAbsoluteForceResidualNDelta, 0, `${iterationId} ${caseId} force closure delta`);
    assert.equal(metrics.equilibrium.maximumAbsoluteMomentResidualNmDelta, 0, `${iterationId} ${caseId} moment closure delta`);
  }
  for (const [caseId, families] of Object.entries(evidence.improvements.failures.cases)) {
    for (const [family, result] of Object.entries(families)) {
      assert.equal(result.resolvedCount, 0, `${iterationId} ${caseId} ${family} resolved failures`);
      assert.equal(result.introducedCount, 0, `${iterationId} ${caseId} ${family} introduced failures`);
      assert.equal(result.netDelta, 0, `${iterationId} ${caseId} ${family} net failures`);
    }
  }
}

function runNode(args, label) {
  const result = spawnSync(NODE, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw new Error(`${label} materialization failed: ${result.error?.message ?? `exit ${String(result.status)}`}`);
  }
}

function parseArguments(argv) {
  if (argv.length === 0) return { outDir: null };
  if (argv.length !== 2 || argv[0] !== '--out-dir') {
    throw new TypeError('Usage: [--out-dir <directory>].');
  }
  return { outDir: resolve(argv[1]) };
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
