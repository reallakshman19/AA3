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
const definition = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'validation/lafea4-refinement/parent-normal-activation-record-v1.json'),
  'utf8',
));
assert.deepEqual(
  definition.requiredEngineeringStepIds,
  [...LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS],
);
assert.equal(definition.currentProductEffect.hardGateActivated, false);
assert.equal(definition.currentProductEffect.productionBindingAuthorized, false);

const expectedHead = '1234567890abcdef1234567890abcdef12345678';
const wrongHead = 'abcdef1234567890abcdef1234567890abcdef12';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-tech12d-'));
const generator = path.join(scriptDir, 'lafea-tech12d-parent-normal-activation-record.mjs');
const rows = [];

try {
  // Fully PASS, exact-head, integrity-valid fixture. This authorizes only a
  // future promotion change; TECH-12D itself must still report zero product
  // effect.
  const passBundle = makeBundle('pass', expectedHead);
  const passRun = runGenerator(passBundle, expectedHead, 'pass-record.json');
  assert.equal(passRun.status, 0, passRun.stderr);
  const passRecord = readRecord('pass-record.json');
  validateLafea4ParentNormalActivationRecord(passRecord);
  assert.equal(passRecord.status, LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS);
  assert.deepEqual(passRecord.reasons, []);
  assert.equal(passRecord.hardGateActivated, false);
  assert.equal(passRecord.retainedMeshAcceptanceChanged, false);
  assert.equal(passRecord.solverAuthorizationChanged, false);
  assert.equal(passRecord.releaseQualificationChanged, false);
  assert.equal(passRecord.productionBindingAuthorized, false);
  rows.push({ case: 'EXACT_HEAD_FULL_PASS', status: passRecord.status });

  // An integrity-valid NOT_RUN result must produce a blocked record, not an
  // engineering PASS and not a generic evidence-integrity error.
  const notRunBundle = makeBundle('not-run', expectedHead, ({ manifest, commands }) => {
    const target = commands.records.find((row) => row.id === 'TECH12C_SOLVER_EXECUTION_COMPANION_BINDING');
    target.disposition = 'NOT_RUN';
    manifest.disposition = 'NOT_RUN';
    manifest.qualificationComplete = false;
  });
  const notRun = runGenerator(notRunBundle, expectedHead, 'not-run-record.json');
  assert.equal(notRun.status, 2, notRun.stderr);
  const notRunRecord = readRecord('not-run-record.json');
  assert.equal(notRunRecord.status, LAFEA4_PARENT_NORMAL_BLOCKED_STATUS);
  assert.ok(notRunRecord.reasons.includes('MANIFEST_DISPOSITION_NOT_PASS'));
  assert.ok(notRunRecord.reasons.includes(
    'REQUIRED_STEP_NOT_PASS:TECH12C_SOLVER_EXECUTION_COMPANION_BINDING:NOT_RUN',
  ));
  rows.push({ case: 'INTEGRITY_VALID_NOT_RUN', status: notRunRecord.status });

  // The bundle may itself be internally exact-head consistent yet still be for
  // another commit. Passing a different requested activation head must block.
  const wrongHeadBundle = makeBundle('wrong-head', wrongHead);
  const wrongHeadRun = runGenerator(wrongHeadBundle, expectedHead, 'wrong-head-record.json');
  assert.equal(wrongHeadRun.status, 2, wrongHeadRun.stderr);
  const wrongHeadRecord = readRecord('wrong-head-record.json');
  assert.ok(wrongHeadRecord.reasons.includes('EXACT_HEAD_BINDING_INVALID'));
  rows.push({ case: 'WRONG_HEAD', status: wrongHeadRecord.status });

  // Browser skip cannot authorize promotion even if all command rows were
  // otherwise marked PASS.
  const browserSkippedBundle = makeBundle('browser-skipped', expectedHead, ({ manifest }) => {
    manifest.browserRequested = false;
    manifest.browserProvisionSucceeded = false;
  });
  const browserSkipped = runGenerator(
    browserSkippedBundle, expectedHead, 'browser-skipped-record.json',
  );
  assert.equal(browserSkipped.status, 2, browserSkipped.stderr);
  const browserRecord = readRecord('browser-skipped-record.json');
  assert.ok(browserRecord.reasons.includes('BROWSER_NOT_REQUESTED'));
  assert.ok(browserRecord.reasons.includes('BROWSER_NOT_PROVISIONED'));
  rows.push({ case: 'BROWSER_SKIPPED', status: browserRecord.status });

  // Omitting a required engineering step from both plan and command output can
  // still look like a generic PASS to the base verifier. TECH-12D must reject
  // it because its promotion envelope is stricter than generic bundle validity.
  const missingStepBundle = makeBundle('missing-step', expectedHead, ({ plan, commands }) => {
    const missing = 'TECH11_PARENT_NORMAL_SAMPLE';
    plan.steps = plan.steps.filter((row) => row.id !== missing);
    commands.records = commands.records.filter((row) => row.id !== missing);
  });
  const missingStep = runGenerator(missingStepBundle, expectedHead, 'missing-step-record.json');
  assert.equal(missingStep.status, 2, missingStep.stderr);
  const missingRecord = readRecord('missing-step-record.json');
  assert.ok(missingRecord.reasons.includes('REQUIRED_STEP_NOT_IN_PLAN:TECH11_PARENT_NORMAL_SAMPLE'));
  assert.ok(missingRecord.reasons.includes('REQUIRED_STEP_RESULT_MISSING:TECH11_PARENT_NORMAL_SAMPLE'));
  rows.push({ case: 'REQUIRED_STEP_MISSING', status: missingRecord.status });

  // A standalone-math-only bundle is never promotion evidence.
  const standaloneOnlyBundle = makeBundle('standalone-only', expectedHead, ({ plan, commands }) => {
    plan.steps = plan.steps.filter((row) => row.id === 'TECH11_PARENT_NORMAL_STANDALONE_MATH');
    commands.records = commands.records.filter(
      (row) => row.id === 'TECH11_PARENT_NORMAL_STANDALONE_MATH',
    );
  });
  const standaloneOnly = runGenerator(
    standaloneOnlyBundle, expectedHead, 'standalone-only-record.json',
  );
  assert.equal(standaloneOnly.status, 2, standaloneOnly.stderr);
  const standaloneRecord = readRecord('standalone-only-record.json');
  assert.ok(standaloneRecord.reasons.some((row) => row.startsWith('REQUIRED_STEP_NOT_IN_PLAN:')));
  rows.push({ case: 'STANDALONE_MATH_ONLY', status: standaloneRecord.status });

  // Tampering after hashes are written must be rejected by the TECH-8 verifier
  // before any activation record is emitted.
  const tamperedBundle = makeBundle('tampered', expectedHead);
  fs.appendFileSync(path.join(tamperedBundle, 'plan.json'), '\n');
  const tampered = runGenerator(tamperedBundle, expectedHead, 'tampered-record.json');
  assert.equal(tampered.status, 1);
  assert.match(tampered.stderr, /BUNDLE_INTEGRITY_REJECTED/u);
  assert.equal(fs.existsSync(path.join(tempRoot, 'tampered-record.json')), false);
  rows.push({ case: 'TAMPERED_BUNDLE', status: 'REJECTED_NO_RECORD' });

  // Even an otherwise valid authorized record cannot be transformed into a
  // product gate record by flipping a flag and retaining the old hash.
  const mutated = structuredClone(passRecord);
  mutated.hardGateActivated = true;
  assert.throws(
    () => validateLafea4ParentNormalActivationRecord(mutated),
    (error) => error?.code === 'LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_CONTRACT_INVALID',
  );

  // Product files must not consume TECH-12D in this batch. Promotion is a
  // future explicit change, not a side effect of adding the record generator.
  for (const relative of [
    'src/workspace/lafea-analysis-mesh-quality.js',
    'src/workspace/lafea-workbench-mesh-generation-actions.js',
    'src/workspace/lafea-shell-solver-model.js',
    'src/workspace/lafea-workbench-shell-run-actions.js',
    'src/workspace/lafea4-shell-retained-mesh-parent-normal-companion.js',
    'src/workspace/lafea4-shell-solver-companion-custody.js',
  ]) {
    const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
    assert.equal(
      text.includes('lafea4-parent-normal-activation-record'),
      false,
      `${relative} must not product-bind TECH-12D activation record`,
    );
  }

  console.log(JSON.stringify({
    check: 'lafea-tech12d-activation-record-policy',
    status: 'PASS',
    qualificationId: definition.qualificationId,
    cases: rows,
    authorizedFixtureProductEffect: {
      hardGateActivated: passRecord.hardGateActivated,
      retainedMeshAcceptanceChanged: passRecord.retainedMeshAcceptanceChanged,
      solverAuthorizationChanged: passRecord.solverAuthorizationChanged,
      releaseQualificationChanged: passRecord.releaseQualificationChanged,
      productionBindingAuthorized: passRecord.productionBindingAuthorized,
    },
    productionBindingAuthorized: false,
    releaseQualified: false,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function makeBundle(name, head, mutate = null) {
  const bundle = path.join(tempRoot, name);
  fs.mkdirSync(bundle, { recursive: true });
  const plan = {
    schema: 'lafea-independent-qualification-plan/v1',
    qualificationId: 'LAFEA4-INDEPENDENT-QUALIFICATION-V1',
    steps: LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS.map((id) => ({
      id,
      classification: 'ENGINEERING',
      required: true,
      executable: 'node',
      args: ['fixture'],
    })),
  };
  const commands = {
    schema: 'lafea-independent-qualification-commands/v1',
    qualificationId: plan.qualificationId,
    expectedHead: head,
    records: LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS.map((id) => ({
      id,
      classification: 'ENGINEERING',
      required: true,
      disposition: 'PASS',
    })),
  };
  const manifest = {
    schema: 'lafea-independent-qualification-manifest/v1',
    qualificationId: plan.qualificationId,
    expectedHead: head,
    currentHead: head,
    disposition: 'PASS',
    qualificationComplete: true,
    preflightAccepted: true,
    postflightAccepted: true,
    dependencyInstallSucceeded: true,
    browserRequested: true,
    browserProvisionSucceeded: true,
    planSha256: null,
  };
  mutate?.({ plan, commands, manifest });
  const planText = jsonText(plan);
  manifest.planSha256 = sha256(Buffer.from(planText, 'utf8'));
  const files = {
    'plan.json': planText,
    'commands.json': jsonText(commands),
    'manifest.json': jsonText(manifest),
    'environment.json': jsonText({ schema: 'fixture-environment/v1', expectedHead: head }),
    'summary.md': '# TECH-12D synthetic evidence fixture\n',
  };
  for (const [relative, text] of Object.entries(files)) {
    fs.writeFileSync(path.join(bundle, relative), text);
  }
  const hashRows = Object.keys(files).sort().map((relative) =>
    `${sha256(fs.readFileSync(path.join(bundle, relative)))}  ${relative}`);
  const hashesText = `${hashRows.join('\n')}\n`;
  fs.writeFileSync(path.join(bundle, 'hashes.sha256'), hashesText);
  fs.writeFileSync(
    path.join(bundle, 'evidence-digest.txt'),
    `${sha256(Buffer.from(hashesText, 'utf8'))}\n`,
  );
  return bundle;
}

function runGenerator(bundle, head, outputName) {
  return spawnSync(process.execPath, [
    generator,
    bundle,
    '--expected-head', head,
    '--output', path.join(tempRoot, outputName),
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}
function readRecord(name) {
  return JSON.parse(fs.readFileSync(path.join(tempRoot, name), 'utf8'));
}
function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
