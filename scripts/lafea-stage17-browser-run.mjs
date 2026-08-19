#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
if (!fs.existsSync(cli)) {
  console.error('LAFEA_A17_BROWSER_PLAYWRIGHT_NOT_INSTALLED');
  process.exit(2);
}

function runNodeScript(relativePath) {
  const result = spawnSync(process.execPath, [path.join(root, relativePath)], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

function runPlaywright(args) {
  const result = spawnSync(process.execPath, [cli, 'test', '--config=playwright.lafea-visible.config.js', ...args], {
    cwd: root,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
    stdio: 'inherit',
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

// EMP.1 analytical qualification prerequisites run before Playwright tests and
// before the unrelated LAFEA.3 B01/B02 gate. The derivation contract is
// self-tested, then retained artifacts are checked against generated runtime
// evidence so stale or authority-escalated C evidence cannot be rendered current.
runNodeScript('scripts/emp1-c-qualification-evidence-self-test.mjs');
runNodeScript('scripts/emp1-c-qualification-evidence-check.mjs');
runNodeScript('scripts/emp1-c-qualification-state-check.mjs');
runNodeScript('scripts/emp1-public-product-check.mjs');
runNodeScript('scripts/emp1-a-to-b-refresh-check.mjs');
runNodeScript('scripts/emp1-a-result-presentation-check.mjs');

// Qualify both public EMP.1 surfaces and the user-driven A→B currentness refresh
// independently before the inherited LAFEA.3 B01/B02 production gate. The FEM
// gate remains mandatory below; this ordering only preserves analytical evidence.
runPlaywright([
  'e2e/lafea-visible-workbench.spec.js',
  '--grep',
  'Empirical analytical surface presents one truthful EMP.1 product and page-owned vertical scrolling',
]);
runPlaywright(['e2e/lafea-emp1-a-run-state.spec.js']);
runPlaywright([
  'e2e/lafea-visible-workbench.spec.js',
  '--grep',
  'production exposes one EMP.1 product with A/B retained engines and C visibly blocked',
]);
runPlaywright(['e2e/lafea-emp1-a-to-b-refresh.spec.js']);
runPlaywright(['e2e/lafea-empirical-grouped-edit.spec.js']);

const gate = spawnSync(process.execPath, [
  path.join(root, 'scripts/lafea-b01-b02-gate0-diagnostic.mjs'),
], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
if ((gate.status ?? 1) !== 0) process.exit(gate.status ?? 1);

runPlaywright([
  'e2e/lafea-standalone.spec.js',
  'e2e/lafea-standalone-golden-journey.spec.js',
  'e2e/lafea-standalone-failures.spec.js',
  'e2e/lafea-visible-workbench.spec.js',
  'e2e/lafea-emp1-a-run-state.spec.js',
  'e2e/lafea-emp1-a-to-b-refresh.spec.js',
  'e2e/lafea-empirical-grouped-edit.spec.js',
  'e2e/lafea3-sample-mesh.spec.js',
  'e2e/lafea-shell-sample-mesh.spec.js',
  'e2e/lafea-b02-g3-custody.spec.js',
]);
