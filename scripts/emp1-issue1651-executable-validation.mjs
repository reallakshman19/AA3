#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  inspectProjectLocalChromium,
  withProjectLocalPlaywrightEnv,
} from './lib/project-local-playwright-browser.mjs';

const root = process.cwd();
const schema = 'emp1-issue1651-executable-validation/v1';
const playwrightCli = path.join(root, 'node_modules', 'playwright', 'cli.js');

const nodeGates = Object.freeze([
  'scripts/emp1-qualification-sample-orchestration-check.mjs',
  'scripts/emp1-analytical-layout-check.mjs',
  'scripts/emp1-manual-browser-audit-check.mjs',
  'scripts/emp1-issue1651-acceptance-check.mjs',
  'scripts/emp1-public-product-check.mjs',
]);

const focusedPlaywright = Object.freeze([
  '--config=playwright.lafea-visible.config.js',
  'e2e/emp1-qualification-sample-orchestration.spec.js',
]);

const stage17 = 'scripts/lafea-stage17-browser-run.mjs';
const args = new Set(process.argv.slice(2));

if (args.has('--plan')) {
  console.log(JSON.stringify({
    schema,
    status: 'PLAN_ONLY',
    failFast: true,
    projectLocalBrowserRequired: true,
    browsersPath: '0',
    nodeGates,
    focusedPlaywright,
    focusedPlaywrightExpected: '2 passed / 0 failed',
    stage17,
    humanFactorPermittedOnlyAfterExecutablePass: true,
  }, null, 2));
  process.exit(0);
}

const preflight = inspectProjectLocalChromium(root);
console.log(JSON.stringify({ schema: `${schema}/browser-preflight`, ...preflight }, null, 2));
if (!preflight.ok) process.exit(2);

if (args.has('--preflight-only')) process.exit(0);

for (const gate of nodeGates) {
  runStep({
    id: gate,
    phase: 'NODE_GATE',
    executable: process.execPath,
    args: [path.join(root, gate)],
    env: process.env,
  });
}

if (!fs.existsSync(playwrightCli)) {
  fail('FOCUSED_PLAYWRIGHT', 'PLAYWRIGHT_CLI_MISSING_AFTER_PREFLIGHT', 2, {
    cliPath: playwrightCli,
  });
}

runStep({
  id: 'focused qualification-sample Playwright',
  phase: 'FOCUSED_PLAYWRIGHT',
  executable: process.execPath,
  args: [playwrightCli, 'test', ...focusedPlaywright],
  env: withProjectLocalPlaywrightEnv(),
});

runStep({
  id: stage17,
  phase: 'STAGE17',
  executable: process.execPath,
  args: [path.join(root, stage17)],
  env: withProjectLocalPlaywrightEnv(),
});

console.log(JSON.stringify({
  schema,
  status: 'PASS_EXECUTABLE_EXACT_HEAD_GATE_SEQUENCE',
  nodeGatesPassed: nodeGates.length,
  focusedPlaywrightPassed: true,
  focusedPlaywrightExpected: '2 passed / 0 failed',
  stage17Passed: true,
  humanFactorMayProceed: true,
  engineeringAuthorityChanged: false,
}, null, 2));

function runStep({ id, phase, executable, args: stepArgs, env }) {
  console.log(JSON.stringify({
    schema: `${schema}/step`,
    status: 'RUNNING',
    phase,
    id,
  }));

  const result = spawnSync(executable, stepArgs, {
    cwd: root,
    env,
    stdio: 'inherit',
  });

  const exitCode = result.status ?? 1;
  if (exitCode !== 0) {
    fail(phase, id, exitCode);
  }
}

function fail(phase, id, exitCode, detail = {}) {
  console.error(JSON.stringify({
    schema,
    status: 'FAIL_EXECUTABLE_GATE_SEQUENCE',
    phase,
    id,
    exitCode,
    humanFactorMayProceed: false,
    ...detail,
  }, null, 2));
  process.exit(exitCode || 1);
}
