#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const checks = [
  ['Canvas2D render-model v3 bootstrap regression', 'scripts/non-fea-canvas-v3-bootstrap-check.mjs'],
  ['Project Data authority contract', 'scripts/non-fea-project-data-authority-check.mjs'],
  ['Product-default authority and hash binding', 'scripts/non-fea-product-default-profile-check.mjs'],
  ['Effective-value authority resolver', 'scripts/non-fea-effective-value-resolver-check.mjs'],
  ['Authorized baseline effective-value ledger', 'scripts/authorized-empirical-effective-value-ledger-check.mjs'],
  ['Ledger-only gravity execution projection', 'scripts/authorized-empirical-effective-execution-projection-check.mjs'],
  ['Effective execution selector-collision falsifier', 'scripts/authorized-empirical-effective-execution-projection-collision-check.mjs'],
  ['V2/V3 effective-value execution cutover', 'scripts/authorized-empirical-v2-effective-execution-check.mjs'],
  ['Authorized profile product-default convergence', 'scripts/authorized-empirical-product-default-convergence-check.mjs'],
  ['Configured-default resolver convergence', 'scripts/non-fea-configured-default-resolution-check.mjs'],
  ['Load-case authority convergence', 'scripts/non-fea-load-case-authority-check.mjs'],
  ['Mass-ledger authority convergence', 'scripts/non-fea-mass-ledger-convergence-check.mjs'],
  ['Common engineering foundation convergence', 'scripts/non-fea-engineering-foundation-check.mjs'],
  ['Common analysis topology and eligibility', 'scripts/non-fea-analysis-topology-check.mjs'],
  ['Common thermal free-movement convergence', 'scripts/non-fea-thermal-free-movement-check.mjs'],
  ['Enrichment migration', 'scripts/non-fea-enrichment-migration-check.mjs'],
  ['Common checker and seal', 'scripts/non-fea-common-checker-check.mjs'],
  ['Analysis plan', 'scripts/non-fea-analysis-plan-check.mjs'],
  ['Method consumption', 'scripts/non-fea-method-consumption-check.mjs'],
  ['Empirical gravity AUTO method selection', 'scripts/empirical-gravity-method-selection-check.mjs'],
  ['Support-load force and first-moment accounting', 'scripts/support-load-static-accounting-check.mjs'],
  ['Support-load partial distribution', 'scripts/support-load-partial-distribution-check.mjs'],
  ['Support-load route-local equilibrium', 'scripts/support-load-route-equilibrium-check.mjs'],
  ['Empirical scenario compatibility', 'scripts/empirical-load-calc-scenario-check.mjs'],
  ['Non-FEA 3D investigation', 'scripts/non-fea-3d-investigation-check.mjs'],
  ['First-cut launcher source guard', 'scripts/first-cut-workbench-launcher-source-guard.mjs'],
  ['Empirical beam/contact runtime', 'scripts/empirical-beam-contact-runtime-check.mjs'],
  ['Empirical restraint network V1', 'scripts/empirical-restraint-network-check.mjs'],
  ['Empirical restraint network V2', 'scripts/empirical-coupled-restraint-network-check.mjs'],
  ['Empirical operating reaction', 'scripts/empirical-operating-reaction-check.mjs'],
  ['Empirical result overlay', 'scripts/empirical-result-overlay-check.mjs'],
  ['Release qualification regression', 'scripts/non-fea-release-qualification-check.mjs'],
  ['Registered empirical method-basis coverage', 'scripts/empirical-method-basis-register-check.mjs'],
];

for (const [label, script] of checks) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\nNon-FEA check suite stopped at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nNon-FEA Load Calc checks: PASS (${checks.length} checks)`);
