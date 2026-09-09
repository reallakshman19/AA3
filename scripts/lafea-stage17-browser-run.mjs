#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  inspectProjectLocalChromium,
  resolvePlaywrightRuntimeEnv,
} from './lib/project-local-playwright-browser.mjs';

const root = process.cwd();
const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
const browserPreflight = inspectProjectLocalChromium(root);
console.log(JSON.stringify({
  schema: 'lafea-stage17-browser-preflight/v1',
  ...browserPreflight,
}, null, 2));
if (!browserPreflight.ok) process.exit(2);

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
    env: resolvePlaywrightRuntimeEnv(browserPreflight),
    stdio: 'inherit',
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

// Issue #1371 series-order guard. Before PR-B is present this reports
// NOT_APPLICABLE. On the intended A -> B -> C -> D integration head it must
// rebuild the LAFEA.3 governed parents from the edited source itself and prove
// all physical restraints/load attachments remain source-faithful.
runNodeScript('scripts/lafea1371-pr-b-merge-order-guard.mjs');

// Issue #1371 PR-D anti-drift gate. This is a test-only Node prerequisite
// carried by the existing Chromium qualification entrypoint; it adds no new
// browser contract or workflow authority.
runNodeScript('scripts/lafea1371-cross-stage-anti-drift-check.mjs');

// The EMP.1 product, A-to-B refresh, presentation-layout and benchmark-evidence
// contracts are analytical qualification prerequisites. They do not depend on
// the LAFEA.3 B01/B02 gate.
runNodeScript('scripts/emp1-public-product-check.mjs');
runNodeScript('scripts/emp1-a-to-b-refresh-check.mjs');
runNodeScript('scripts/emp1-qualification-sample-orchestration-check.mjs');
runNodeScript('scripts/emp1-analytical-layout-check.mjs');
runNodeScript('scripts/emp1-benchmark-evidence-ui-check.mjs');
runNodeScript('scripts/emp1-issue1651-acceptance-check.mjs');

// Qualify both public EMP.1 surfaces and the user-driven A→B currentness refresh
// independently before the inherited LAFEA.3 B01/B02 production gate. The FEM
// gate remains mandatory below; this ordering only preserves analytical evidence.
runPlaywright([
  'e2e/lafea-visible-workbench.spec.js',
  '--grep',
  'Empirical analytical surface presents one truthful EMP.1 product and page-owned vertical scrolling',
]);
runPlaywright([
  'e2e/lafea-visible-workbench.spec.js',
  '--grep',
  'production exposes one EMP.1 product with A/B retained engines and C visibly blocked',
]);
runPlaywright(['e2e/lafea-emp1-a-to-b-refresh.spec.js']);
runPlaywright(['e2e/lafea-empirical-grouped-edit.spec.js']);
runPlaywright(['e2e/emp1-human-presentation-tokens.spec.js']);
runPlaywright(['e2e/emp1-qualification-sample-orchestration.spec.js']);
runPlaywright(['e2e/emp1-analytical-layout.spec.js']);
runPlaywright(['e2e/emp1-presentation-coherence.spec.js']);
runPlaywright(['e2e/emp1-benchmark-evidence.spec.js']);

// Test-only UI08 execution carrier: this uses the same real Vite production
// application and Chromium runtime as the authorized visible-workbench lane.
// It changes no workflow YAML and no LFEA engineering authority.
runPlaywright(['e2e/lafea-lfea-ui08-production.spec.js']);

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
  'e2e/lafea-emp1-a-to-b-refresh.spec.js',
  'e2e/lafea-empirical-grouped-edit.spec.js',
  'e2e/emp1-human-presentation-tokens.spec.js',
  'e2e/emp1-qualification-sample-orchestration.spec.js',
  'e2e/emp1-analytical-layout.spec.js',
  'e2e/emp1-presentation-coherence.spec.js',
  'e2e/emp1-benchmark-evidence.spec.js',
  'e2e/lafea3-sample-mesh.spec.js',
  'e2e/lafea-shell-sample-mesh.spec.js',
  'e2e/lafea-b02-g3-custody.spec.js',
]);
