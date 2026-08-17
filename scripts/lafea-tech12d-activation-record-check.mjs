#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS,
  LAFEA4_PARENT_NORMAL_BLOCKED_STATUS,
  LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
  validateLafea4ParentNormalActivationRecord,
} from '../src/workspace/lafea4-parent-normal-activation-record.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const generator = path.join(scriptDir, 'lafea-tech12d-parent-normal-activation-record.mjs');
const planPath = path.join(repoRoot, 'validation/lafea-independent-qualification/plan-v1.json');
const runnerPath = path.join(scriptDir, 'lafea-independent-qualification.mjs');
const verifierPath = path.join(scriptDir, 'lafea-independent-qualification-verify.mjs');
const packageLockPath = path.join(repoRoot, 'package-lock.json');
const definition = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'validation/lafea4-refinement/parent-normal-activation-record-v1.json'),
  'utf8',
));
assert.deepEqual(definition.requiredEngineeringStepIds, [
  ...LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
]);
assert.equal(definition.currentProductEffect.hardGateActivated, false);
assert.equal(definition.currentProductEffect.productionBindingAuthorized, false);

const planText = fs.readFileSync(planPath, 'utf8');
const plan = JSON.parse(planText);
assert.equal(`${JSON.stringify(plan, null, 2)}\n`, planText);
assert.ok(plan.steps.some((row) => row.id === 'TECH12D_ACTIVATION_RECORD_POLICY'));
const head = git(['rev-parse', 'HEAD']).stdout.trim();
assert.match(head, /^[0-9a-f]{40}$/u);
const wrongHead = head === '0'.repeat(40) ? '1'.repeat(40) : '0'.repeat(40);
const runnerSha256 = fileSha256(runnerPath);
const verifierSha256 = fileSha256(verifierPath);
const packageLockSha256 = fileSha256(packageLockPath);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-tech12d-'));
const cases = [];

try {
  const pass = executeFixture('PASS', head);
  assert.equal(pass.run.status, 0, pass.run.stderr);
  const passRecord = pass.record;
  validateLafea4ParentNormalActivationRecord(passRecord);
  assert.equal(passRecord.status, LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS);
  assert.deepEqual(passRecord.reasons, []);
  assert.equal(passRecord.expectedHead, head);
  assert.equal(passRecord.planSha256, fileSha256(planPath));
  assert.equal(passRecord.runnerSha256, runnerSha256);
  assert.equal(passRecord.packageLockSha256, packageLockSha256);
  assert.equal(passRecord.verifierSha256, verifierSha256);
  assert.equal(passRecord.integrityVerified, true);
  assert.equal(passRecord.exactCheckoutVerified, true);
  assert.equal(passRecord.toolingParityVerified, true);
  assertNoProductEffect(passRecord);
  cases.push({ id: 'EXACT_HEAD_FULL_PASS', status: passRecord.status });

  const notRun = executeFixture('NOT_RUN', head, ({ manifest, commands }) => {
    commands.records.find(
      (row) => row.id === 'TECH12C_SOLVER_EXECUTION_COMPANION_BINDING',
    ).disposition = 'NOT_RUN';
    manifest.disposition = 'NOT_RUN';
    manifest.qualificationComplete = false;
  });
  assert.equal(notRun.run.status, 2, notRun.run.stderr);
  assert.equal(notRun.record.status, LAFEA4_PARENT_NORMAL_BLOCKED_STATUS);
  assert.ok(notRun.record.reasons.includes('MANIFEST_DISPOSITION_NOT_PASS'));
  assert.ok(notRun.record.reasons.includes(
    'REQUIRED_STEP_NOT_PASS:TECH12C_SOLVER_EXECUTION_COMPANION_BINDING:NOT_RUN',
  ));
  assertNoProductEffect(notRun.record);
  cases.push({ id: 'INTEGRITY_VALID_NOT_RUN', status: notRun.record.status });

  const wrong = executeFixture('WRONG_HEAD', wrongHead, null, { requestedHead: head });
  assert.equal(wrong.run.status, 2, wrong.run.stderr);
  assert.ok(wrong.record.reasons.includes('EXACT_HEAD_BINDING_INVALID'));
  assertNoProductEffect(wrong.record);
  cases.push({ id: 'WRONG_BUNDLE_HEAD', status: wrong.record.status });

  const browser = executeFixture('BROWSER_SKIPPED', head, ({ manifest }) => {
    manifest.browserRequested = false;
    manifest.browserProvisionSucceeded = false;
  });
  assert.equal(browser.run.status, 2, browser.run.stderr);
  assert.ok(browser.record.reasons.includes('BROWSER_NOT_REQUESTED'));
  assert.ok(browser.record.reasons.includes('BROWSER_NOT_PROVISIONED'));
  cases.push({ id: 'BROWSER_SKIPPED', status: browser.record.status });

  // This is the important strengthening over the generic verifier: omit a
  // required plan command that is not part of the parent-normal promotion
  // subset. Generic disposition can still be PASS; TECH-12D must block.
  const omittedPlanCommand = executeFixture(
    'OMITTED_REQUIRED_PLAN_COMMAND',
    head,
    ({ commands }) => {
      commands.records = commands.records.filter(
        (row) => row.id !== 'TECH3_CURVATURE_ANALYTICAL',
      );
    },
  );
  assert.equal(omittedPlanCommand.run.status, 2, omittedPlanCommand.run.stderr);
  assert.ok(omittedPlanCommand.record.reasons.includes(
    'PLAN_REQUIRED_STEP_RESULT_MISSING:TECH3_CURVATURE_ANALYTICAL',
  ));
  cases.push({ id: 'OMITTED_REQUIRED_PLAN_COMMAND', status: omittedPlanCommand.record.status });

  const missingPromotionStep = executeFixture(
    'MISSING_PROMOTION_STEP',
    head,
    ({ plan: bundlePlan, commands }) => {
      bundlePlan.steps = bundlePlan.steps.filter((row) => row.id !== 'TECH11_PARENT_NORMAL_SAMPLE');
      commands.records = commands.records.filter((row) => row.id !== 'TECH11_PARENT_NORMAL_SAMPLE');
    },
  );
  assert.equal(missingPromotionStep.run.status, 2, missingPromotionStep.run.stderr);
  assert.ok(missingPromotionStep.record.reasons.includes(
    'REQUIRED_STEP_NOT_IN_PLAN:TECH11_PARENT_NORMAL_SAMPLE',
  ));
  assert.equal(missingPromotionStep.record.toolingParityVerified, false);
  cases.push({ id: 'MISSING_PROMOTION_STEP', status: missingPromotionStep.record.status });

  const standalone = executeFixture(
    'STANDALONE_ONLY',
    head,
    ({ plan: bundlePlan, commands }) => {
      bundlePlan.steps = bundlePlan.steps.filter(
        (row) => row.id === 'TECH11_PARENT_NORMAL_STANDALONE_MATH',
      );
      const infra = new Set([bundlePlan.dependencyInstall.id, bundlePlan.browserProvision.id]);
      commands.records = commands.records.filter(
        (row) => infra.has(row.id) || row.id === 'TECH11_PARENT_NORMAL_STANDALONE_MATH',
      );
    },
  );
  assert.equal(standalone.run.status, 2, standalone.run.stderr);
  assert.ok(standalone.record.reasons.some((row) => row.startsWith('REQUIRED_STEP_NOT_IN_PLAN:')));
  assertNoProductEffect(standalone.record);
  cases.push({ id: 'STANDALONE_MATH_ONLY', status: standalone.record.status });

  const verifierMismatch = executeFixture(
    'VERIFIER_MISMATCH', head, null, { mutateBundledVerifier: true },
  );
  assert.equal(verifierMismatch.run.status, 2, verifierMismatch.run.stderr);
  assert.equal(verifierMismatch.record.toolingParityVerified, false);
  assert.ok(verifierMismatch.record.reasons.includes('ACTIVATION_TOOLING_PARITY_NOT_VERIFIED'));
  cases.push({ id: 'VERIFIER_PARITY_MISMATCH', status: verifierMismatch.record.status });

  const tamperedBundle = makeBundle('TAMPERED', head);
  fs.appendFileSync(path.join(tamperedBundle, 'plan.json'), '\n');
  const tamperedOutput = path.join(tempRoot, 'TAMPERED-record.json');
  const tamperedRun = runGenerator(tamperedBundle, head, tamperedOutput);
  assert.equal(tamperedRun.status, 1);
  assert.match(tamperedRun.stderr, /BUNDLE_INTEGRITY_REJECTED/u);
  assert.equal(fs.existsSync(tamperedOutput), false);
  cases.push({ id: 'TAMPERED_BUNDLE', status: 'REJECTED_NO_RECORD' });

  const mutatedRecord = structuredClone(passRecord);
  mutatedRecord.hardGateActivated = true;
  assert.throws(
    () => validateLafea4ParentNormalActivationRecord(mutatedRecord),
    (error) => error?.code === 'LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_CONTRACT_INVALID',
  );

  for (const relative of [
    'src/workspace/lafea-analysis-mesh-quality.js',
    'src/workspace/lafea-workbench-mesh-generation-actions.js',
    'src/workspace/lafea-shell-solver-model.js',
    'src/workspace/lafea-workbench-shell-run-actions.js',
    'src/workspace/lafea4-shell-retained-mesh-parent-normal-companion.js',
    'src/workspace/lafea4-shell-solver-companion-custody.js',
  ]) {
    assert.equal(
      fs.readFileSync(path.join(repoRoot, relative), 'utf8')
        .includes('lafea4-parent-normal-activation-record'),
      false,
      `${relative} must not consume TECH-12D activation authority`,
    );
  }

  console.log(JSON.stringify({
    check: 'lafea-tech12d-activation-record-policy',
    status: 'PASS',
    qualificationId: definition.qualificationId,
    exactHead: head,
    cases,
    authorizedFixtureRecordHash: passRecord.semanticHash,
    authorizedFixtureEvidenceDigest: passRecord.evidenceDigest,
    productHardGateActivated: false,
    productionBindingAuthorized: false,
    releaseQualified: false,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function executeFixture(name, bundleHead, mutate = null, options = {}) {
  const bundle = makeBundle(name, bundleHead, mutate, options);
  const output = path.join(tempRoot, `${name}-record.json`);
  const run = runGenerator(bundle, options.requestedHead ?? bundleHead, output);
  return {
    run,
    record: fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : null,
  };
}

function makeBundle(name, bundleHead, mutate = null, options = {}) {
  const bundle = path.join(tempRoot, name);
  const tools = path.join(bundle, 'tools');
  fs.mkdirSync(tools, { recursive: true });
  const bundlePlan = structuredClone(plan);
  const commands = {
    schema: 'lafea-independent-qualification-commands/v1',
    qualificationId: bundlePlan.qualificationId,
    expectedHead: bundleHead,
    records: [
      commandRecord(bundlePlan.dependencyInstall, 'PASS'),
      commandRecord(bundlePlan.browserProvision, 'PASS'),
      ...bundlePlan.steps.map((step) => commandRecord(step, 'PASS')),
    ],
  };
  const manifest = {
    schema: 'lafea-independent-qualification-manifest/v1',
    qualificationId: bundlePlan.qualificationId,
    runId: `TECH12D-FIXTURE-${name}`,
    expectedHead: bundleHead,
    currentHead: bundleHead,
    disposition: 'PASS',
    qualificationComplete: true,
    preflightAccepted: true,
    postflightAccepted: true,
    dependencyInstallSucceeded: true,
    browserRequested: true,
    browserProvisionSucceeded: true,
    planSha256: null,
    runnerSha256,
    packageLockSha256,
  };
  mutate?.({ plan: bundlePlan, commands, manifest });
  const bundlePlanText = `${JSON.stringify(bundlePlan, null, 2)}\n`;
  manifest.planSha256 = sha256(Buffer.from(bundlePlanText, 'utf8'));
  const textFiles = {
    'plan.json': bundlePlanText,
    'commands.json': json(manifest ? commands : commands),
    'manifest.json': json(manifest),
    'environment.json': json({ schema: 'fixture-environment/v1', expectedHead: bundleHead }),
    'summary.md': '# TECH-12D synthetic evidence fixture\n',
  };
  for (const [relative, text] of Object.entries(textFiles)) {
    fs.writeFileSync(path.join(bundle, relative), text);
  }
  fs.copyFileSync(runnerPath, path.join(tools, 'lafea-independent-qualification.mjs'));
  fs.copyFileSync(verifierPath, path.join(tools, 'lafea-independent-qualification-verify.mjs'));
  if (options.mutateBundledVerifier) {
    fs.appendFileSync(
      path.join(tools, 'lafea-independent-qualification-verify.mjs'),
      '\n// TECH12D verifier parity negative fixture\n',
    );
  }
  const hashed = [
    ...Object.keys(textFiles),
    'tools/lafea-independent-qualification.mjs',
    'tools/lafea-independent-qualification-verify.mjs',
  ].sort();
  const hashesText = `${hashed.map((relative) =>
    `${sha256(fs.readFileSync(path.join(bundle, relative)))}  ${relative}`).join('\n')}\n`;
  fs.writeFileSync(path.join(bundle, 'hashes.sha256'), hashesText);
  fs.writeFileSync(
    path.join(bundle, 'evidence-digest.txt'),
    `${sha256(Buffer.from(hashesText, 'utf8'))}\n`,
  );
  return bundle;
}

function commandRecord(step, disposition) {
  return {
    id: step.id,
    classification: step.classification,
    required: step.required === true,
    disposition,
  };
}
function runGenerator(bundle, expectedHead, output) {
  return spawnSync(process.execPath, [
    generator, bundle, '--expected-head', expectedHead, '--output', output,
  ], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}
function assertNoProductEffect(record) {
  assert.equal(record.hardGateActivated, false);
  assert.equal(record.retainedMeshAcceptanceChanged, false);
  assert.equal(record.solverAuthorizationChanged, false);
  assert.equal(record.releaseQualificationChanged, false);
  assert.equal(record.productionBindingAuthorized, false);
  assert.equal(record.releaseQualified, false);
}
function git(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result;
}
function fileSha256(file) { return sha256(fs.readFileSync(file)); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
