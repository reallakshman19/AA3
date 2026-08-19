#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
const diagnosticPath = path.join(root, 'test-results', 'emp1-stage17-diagnostic.json');
if (!fs.existsSync(cli)) {
  writeDiagnostic({ phase: 'SETUP', target: 'playwright-cli', exitStatus: 2, code: 'LAFEA_A17_BROWSER_PLAYWRIGHT_NOT_INSTALLED' });
  console.error('LAFEA_A17_BROWSER_PLAYWRIGHT_NOT_INSTALLED');
  process.exit(2);
}

function runNodeScript(relativePath) {
  const result = spawnSync(process.execPath, [path.join(root, relativePath)], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  const status = result.status ?? 1;
  if (status !== 0) {
    writeDiagnostic({ phase: 'NODE_PREREQUISITE', target: relativePath, exitStatus: status });
    process.exit(status);
  }
}

function runPlaywright(args) {
  const result = spawnSync(process.execPath, [cli, 'test', '--config=playwright.lafea-visible.config.js', ...args], {
    cwd: root,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
    stdio: 'inherit',
  });
  const status = result.status ?? 1;
  if (status !== 0) {
    writeDiagnostic({ phase: 'PLAYWRIGHT', target: args.join(' '), exitStatus: status });
    process.exit(status);
  }
}

function writeDiagnostic({ phase, target, exitStatus, code = null }) {
  fs.mkdirSync(path.dirname(diagnosticPath), { recursive: true });
  fs.writeFileSync(diagnosticPath, `${JSON.stringify({
    schema: 'lafea-stage17-first-failure/v1',
    status: 'FAIL',
    phase,
    target,
    exitStatus,
    code,
    head: process.env.EXPECTED_HEAD ?? null,
  }, null, 2)}\n`, 'utf8');
}

// EMP.1 analytical qualification prerequisites run before Playwright tests and
// before the unrelated LAFEA.3 B01/B02 gate. The retained WRC numerical and
// dimensional contract is self-tested first. The supplemental Hexagon pressure-
// thrust oracle is then replayed as a bounded numerical sanity check only; it
// cannot satisfy CAUx A4 or WRC authority. The separate runtime-contract test
// proves axis mapping, pressure-thrust/double-count policy, and stress-intensity
// semantics cannot be inferred or promoted without source-bound evidence. C
// derivation finally re-observes the immutable retained bytes.
runNodeScript('scripts/emp1-wrc-dataset-readiness-self-test.mjs');
runNodeScript('scripts/emp1-independent-precheck-qualification-self-test.mjs');
runNodeScript('scripts/emp1-independent-precheck-qualification-check.mjs');
runNodeScript('scripts/emp1-c-runtime-contract-self-test.mjs');
runNodeScript('scripts/emp1-c-qualification-evidence-self-test.mjs');
runNodeScript('scripts/emp1-c-qualification-evidence-check.mjs');
runNodeScript('scripts/emp1-c-qualification-state-check.mjs');
runNodeScript('scripts/emp1-public-product-check.mjs');
runNodeScript('scripts/emp1-a-to-b-refresh-check.mjs');
runNodeScript('scripts/emp1-a-result-presentation-check.mjs');
runNodeScript('scripts/emp1-simulated-a-b-custody-check.mjs');

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
if ((gate.status ?? 1) !== 0) {
  writeDiagnostic({
    phase: 'B01_B02_GATE',
    target: 'scripts/lafea-b01-b02-gate0-diagnostic.mjs',
    exitStatus: gate.status ?? 1,
  });
  process.exit(gate.status ?? 1);
}

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