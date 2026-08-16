import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const STAGED_PACKAGE = {
  schema: 'inputxml-managed-stage/v1',
  packageHash: 'NON-FEA-INPUT-CHECK-UI',
  unit: 'mm',
  objects: [
    {
      id: 'PIPES', name: 'Pipes', type: 'BRANCH',
      children: [
        pipe('PIPE-A', [0, 0, 0], [1000, 0, 0]),
        pipe('PIPE-B', [1000, 0, 0], [2000, 0, 0]),
      ],
    },
    {
      id: 'SUPPORTS', name: 'Supports', type: 'GROUP',
      children: [
        support('SUP-START', [0, 0, 0], 'PIPE-A:port:start'),
        support('SUP-END', [2000, 0, 0], 'PIPE-B:port:end'),
      ],
    },
  ],
};

const CERTIFIED_GAP_PACKAGE = {
  schema: 'inputxml-managed-stage/v1',
  packageHash: 'CERTIFIED-TOPOFIX-3MM',
  unit: 'mm',
  objects: [{
    id: 'PIPES',
    name: 'Pipes',
    type: 'BRANCH',
    children: [
      pipe('PIPE-GAP-A', [0, 0, 0], [1000, 0, 0]),
      pipe('PIPE-GAP-B', [1003, 0, 0], [2000, 0, 0]),
    ],
  }],
};

const CENTERLINE_CROSSING_PACKAGE = {
  schema: 'inputxml-managed-stage/v1',
  packageHash: 'CENTERLINE-CROSSING-REVIEW',
  unit: 'mm',
  objects: [{
    id: 'PIPES',
    name: 'Pipes',
    type: 'BRANCH',
    children: [
      pipe('PIPE-X', [-100, 0, 0], [100, 0, 0]),
      pipe('PIPE-Y', [0, -100, 0], [0, 100, 0]),
    ],
  }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d'; });
});

test('integrates preflight, Project Data, enrichment, checker and explicit seal inside Load Calc', async ({ page }) => {
  await page.goto('/');
  await uploadJson(page, 'non-fea-input-check.json', STAGED_PACKAGE);

  const applicationNav = page.getByRole('navigation', { name: 'Application views' });
  await applicationNav.getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();
  const consumer = page.locator('[data-role="load-calc-consumer"]');
  await expect(consumer).toHaveCount(1);
  const workflow = consumer.getByRole('navigation', { name: 'Load calculation process' });
  await expect(workflow.locator('button')).toHaveCount(7);
  await expect(workflow).toContainText('Import JSON');
  await expect(workflow).toContainText('Topology Fix');
  await expect(workflow).not.toContainText('Error Check');
  await expect(workflow).toContainText('Project Data');
  await expect(workflow).toContainText('Import Masters');
  await expect(workflow).toContainText('Validate Input');
  await expect(workflow).toContainText('Run Calc');
  await expect(workflow).toContainText('View Loads');
  await expect(workflow.locator('.empirical-load-calc__workflow-status')).toHaveText([
    'Done', 'Current', 'Next', 'Next', 'Next', 'Next', 'Next',
  ]);
  await expect(page.locator('[data-role="load-calc-topology"]')).toBeVisible();
  await expect(consumer).not.toContainText('The certified 3D topology editor is active in the shared viewport.');

  await loadCalcTab(consumer, 'preflight').click();
  const inputCheck = page.locator('[data-role="non-fea-input-check"]');
  await expect(inputCheck).toBeVisible();
  await expect(inputCheck).toContainText('PHASE 1 · PREFLIGHT CONSOLIDATION');
  await expect(inputCheck).toContainText('NON-FEA ONLY');
  await expect(inputCheck).toContainText('EIGHT-GATE WORKFLOW');
  await expect(inputCheck).toContainText('Validate Input');
  await inputCheck.locator('.non-fea-input-check__advanced > summary').click();
  await expect(inputCheck.locator('[data-role="non-fea-project-audits"] [data-preflight-workflow]')).toHaveCount(3);
  await expect(inputCheck.locator('[data-role="non-fea-source-evidence"]')).toContainText('Shared piping model');
  const routeEvidence = inputCheck.locator('[data-role="non-fea-route-evidence"]');
  await expect(routeEvidence).toContainText('Route partitions');
  await expect(routeEvidence).toContainText('Route partitions are not available.');

  const initialEnrichment = inputCheck.locator('[data-role="non-fea-enrichment-authority"]');
  await expect(initialEnrichment).toHaveAttribute('data-status', 'NOT_EVALUATED');
  await expect(initialEnrichment).toContainText('No accepted common-enrichment sidecar');
  const initialCommon = inputCheck.locator('[data-role="non-fea-common-input-authority"]');
  await expect(initialCommon).toBeVisible();
  await expect(initialCommon).toHaveAttribute('data-seal-state', 'NOT_SEALED');
  await expect(initialCommon).toContainText('COMMON CHECKER & SEAL');
  await expect(inputCheck.locator('[data-method-id]')).toHaveCount(9);
  await expect(inputCheck.locator('[data-method-id] .non-fea-chip')).toHaveText([
    ...Array(8).fill('BLOCKED'),
    'READY',
  ]);
  await expect(
    inputCheck.locator('[data-method-id="ENRICHED_STAGED_JSON_EXPORT"] .non-fea-chip'),
  ).toHaveText('READY');
  await expect(inputCheck).toContainText('Historical legacy authority');
  await expect(inputCheck).not.toContainText('First Cut');

  await loadCalcTab(consumer, 'project-data').click();
  const projectData = page.locator('[data-role="non-fea-project-data"]');
  await expect(projectData).toBeVisible();
  await expect(projectData).toHaveAttribute('data-phase', '2');
  await expect(projectData).toContainText('NON-FEA · PHASE 2');
  await expect(projectData).toContainText('Project basis: READY');
  await expect(projectData).toContainText('Import Masters: 2 field(s) checked in Step 4');
  await expect(projectData).toContainText('Advanced method policy: 16 field(s) deferred');
  await expect(projectData).toContainText('2 definitions · 0 uses');
  await expect(projectData.locator('[data-project-value="loadCalculation.gravityMPerS2"]'))
    .toHaveValue('9.80665');
  await expect(projectData.locator('[data-project-value="loadCalculation.loadFactor"]'))
    .toHaveValue('1');
  await expect(projectData.locator('label.phase2-approval:has(input[data-project-approved="loadCalculation.gravityMPerS2"])'))
    .toContainText('APPROVED');
  await expect(projectData.locator('[data-project-value="loadCalculation.hydroFluidDensitiesKgPerM3"]'))
    .toHaveValue(/"DEFAULT": 1000/);
  await expect(projectData.locator('[data-project-value="loadCalculation.insulationDensitiesKgPerM3"]'))
    .toHaveValue(/"DEFAULT": 210/);
  await expect(projectData.locator('label.phase2-approval:has(input[data-project-approved="loadCalculation.pipeSectionProperties"])'))
    .toContainText('STEP 4');
  await expect(projectData).toContainText('NO UNDOCUMENTED FALLBACK');
  await expect(projectData).toContainText('DETERMINISTIC STALENESS');
  const ownership = projectData.locator('[data-role="non-fea-field-ownership-matrix"]');
  await expect(ownership).toContainText('SOURCE_EXPLICIT');
  await expect(ownership).toContainText('EXACT_APPROVED_MASTER');
  await expect(ownership).toContainText('PROJECT_CONFIGURED_DEFAULT');
  await expect(ownership).toContainText('SUPPORT_AVAILABILITY_SENSITIVITY');
  const thermoMechanicalGroup = projectData.locator('#phase2-thermoMechanicalBasis');
  await thermoMechanicalGroup.locator('summary').click();
  const signedTemperature = projectData.locator('[data-project-value="thermoMechanicalBasis.installationTemperatureC"]');
  await expect(signedTemperature).toBeVisible();
  expect(await signedTemperature.getAttribute('min')).toBeNull();

  await loadCalcTab(consumer, 'enrichment').click();
  const enrichment = page.locator('[data-role="non-fea-enrichment"]');
  await expect(enrichment).toBeVisible();
  await expect(enrichment).toContainText('PHASE 3 · ENRICHMENT & OVERRIDES');
  await expect(enrichment).toContainText('exact selectors only');
  await expect(enrichment).toContainText('PROPOSAL / ACCEPTANCE');
  await expect(enrichment).toContainText('FIELD-RESOLUTION LEDGER');
  await expect(enrichment).toContainText('IMPACT PREVIEW');
  await expect(enrichment).toContainText('LEGACY COMPATIBILITY');
  await expect(enrichment).not.toContainText('First Cut');

  const form = enrichment.locator('[data-enrichment-proposal-form]');
  await form.locator('[name="recordId"]').fill('UI-ELASTIC-MODULUS');
  await form.locator('[name="selectorKind"]').selectOption('ENTITY');
  await form.locator('[name="selectorKey"]').fill('PIPE-A');
  await form.locator('[name="fieldId"]').selectOption('ELASTIC_MODULUS');
  await form.locator('[name="value"]').fill('200000');
  await form.locator('[name="unit"]').fill('MPa');
  await form.locator('[name="authority"]').selectOption('ACCEPTED_OVERRIDE');
  await form.locator('[name="sourceId"]').fill('UI-REVIEWED-EVIDENCE');
  await form.locator('[name="revision"]').fill('1');
  await form.getByRole('button', { name: 'Stage proposal' }).click();
  const proposals = page.locator('[data-role="enrichment-proposals"]');
  await expect(proposals).toContainText('UI-ELASTIC-MODULUS');
  const acceptExact = proposals.getByRole('button', { name: 'Accept exact' });
  await acceptExact.scrollIntoViewIfNeeded();
  await expect(acceptExact).toBeVisible();
  await acceptExact.click();
  await expect(page.locator('[data-role="enrichment-accepted"]')).toContainText('UI-ELASTIC-MODULUS');
  await expect(page.locator('[data-role="enrichment-resolution"]')).toContainText('ACCEPTED_OVERRIDE');
  const impact = page.locator('[data-role="enrichment-impact"]');
  await expect(impact).toContainText('Source mutation');
  await expect(impact).toContainText('Support removal');
  await expect(impact).toContainText('NONE');

  await loadCalcTab(consumer, 'preflight').click();
  const currentEnrichment = page.locator('[data-role="non-fea-enrichment-authority"]');
  await expect(currentEnrichment).toHaveAttribute('data-status', 'READY');
  const enrichmentGate = inputCheck.locator('[data-enrichment-gate-state="READY"]');
  await expect(enrichmentGate).toContainText('E_ENRICHMENT');

  await loadCalcTab(consumer, 'method-basis').click();
  const methodBasis = page.locator('[data-role="non-fea-method-basis"]');
  await expect(methodBasis).toBeVisible();
  await expect(methodBasis).toContainText('PHASE 4 · COMMON CHECKER + IMPLEMENTATION BINDING');
  await expect(methodBasis).toContainText('METHOD PURPOSE → IMPLEMENTATION');
  await expect(methodBasis).toContainText('Input readiness and executable implementation readiness are evaluated separately.');
  await expect(methodBasis.locator('[data-common-method-id]')).toHaveCount(9);
  await expect(methodBasis).toContainText('BLOCKED_INPUT');
  const loadCaseAuthority = methodBasis.locator('[data-role="method-basis-load-case-authority"]');
  await expect(loadCaseAuthority).toContainText('Project Data-approved load cases');
  await expect(loadCaseAuthority).toContainText('EMPTY');
  await expect(loadCaseAuthority).toContainText('OPE');
  await expect(loadCaseAuthority).toContainText('HYD');
  await expect(methodBasis).toContainText('No profile selected');
  const exportMethod = methodBasis.locator('[data-common-method-id="ENRICHED_STAGED_JSON_EXPORT"]');
  await expect(exportMethod).toContainText('COMMON_INPUT_EXPORT_V1');
  await expect(exportMethod).toContainText('READY_TO_AUTHORIZE');

  await loadCalcTab(consumer, 'seal-export').click();
  const sealExport = page.locator('[data-role="non-fea-seal-export"]');
  await expect(sealExport).toBeVisible();
  await expect(sealExport).toContainText('PHASE 4 · EXPLICIT SEAL');
  await expect(sealExport).toContainText('No common input seal');
  await expect(sealExport).toContainText('Evaluation, sealing, export and calculation remain separate explicit actions.');
  await expect(sealExport.getByRole('button', { name: 'Seal common input' })).toBeEnabled();
  await expect(sealExport.getByRole('button', { name: 'Create deterministic export' })).toBeDisabled();

  await expect(page.locator('[data-role="first-cut-workbench-root"]')).toHaveCount(0);
  await expect(page.locator('[data-section-id="first-cut"]')).toHaveCount(0);
  await expect(applicationNav.getByRole('button', { name: 'Input Check', exact: true })).toHaveCount(0);
  await expect(applicationNav.getByRole('button', { name: 'Method Basis', exact: true })).toHaveCount(0);
  await expect(applicationNav.getByRole('button', { name: 'Seal & Export', exact: true })).toHaveCount(0);
});

test('prepares certified TopoFix for an exact source-backed 3 mm gap', async ({ page }) => {
  await page.goto('/');
  await uploadJson(page, 'certified-topofix-3mm.json', CERTIFIED_GAP_PACKAGE);
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();

  const consumer = page.locator('[data-role="load-calc-consumer"]');
  const topology = consumer.locator('[data-role="load-calc-topology"]');
  await expect(topology).toContainText('SNAP_GAP');
  const tolerance = topology.locator('[data-load-calc-topology-gap-mm]');
  await expect(tolerance).toHaveValue('6');
  await tolerance.fill('3');
  await topology.locator('[data-load-calc-topology-gap-apply]').click();
  const autoFix = topology.locator('[data-load-calc-topology-autofix]');
  await expect(autoFix).toBeDisabled();
  await expect(autoFix).toContainText('Prepare auto-fix (0)');
  await expect(topology.locator('[data-load-calc-topology-policy-status]')).toContainText(
    'No certified source-backed endpoint gaps exist strictly below 3 mm',
  );
  await tolerance.fill('4');
  await topology.locator('[data-load-calc-topology-gap-apply]').click();
  await expect(autoFix).toBeEnabled();
  await expect(autoFix).toContainText('Prepare auto-fix (1)');
  await autoFix.click();

  await expect(page.locator('[data-role="topology-edit-status"]')).toContainText(
    'TopoFix accepted 1 high-confidence gap merge',
  );
  await expect(consumer.locator('[data-engineering-load-status]')).toContainText(
    'Certified TopoFix prepared 1 gap merge',
  );
  await expect(page.getByRole('button', { name: 'Commit draft' })).toBeEnabled();
});

test('groups blockers and retains reviewed skip receipts for later reporting', async ({ page }) => {
  await page.goto('/');
  await uploadJson(page, 'centerline-crossing-review.json', CENTERLINE_CROSSING_PACKAGE);
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();

  const consumer = page.locator('[data-role="load-calc-consumer"]');
  let topology = consumer.locator('[data-role="load-calc-topology"]');
  const clashGroup = topology.locator('.load-calc-topology-group')
    .filter({ hasText: 'HIGH CENTERLINE_CLASH' });
  await expect(clashGroup).toHaveCount(1);
  await clashGroup.locator('summary').click();
  const finding = clashGroup.locator('[data-topology-finding-id]').first();
  await finding.locator('[data-load-calc-topology-skip-reason]')
    .selectOption('CONFIRMED_VALID_SOURCE_GEOMETRY');
  await finding.locator('[data-load-calc-topology-skip]').click();

  topology = consumer.locator('[data-role="load-calc-topology"]');
  const skippedGroup = topology.locator('.load-calc-topology-group')
    .filter({ hasText: 'HIGH CENTERLINE_CLASH' });
  await expect(skippedGroup.locator('summary')).toContainText('1 skipped');
  const downloadPromise = page.waitForEvent('download');
  await topology.locator('[data-load-calc-topology-review-download]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('topology-review-');
  const reportPath = await download.path();
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  expect(report.schema).toBe('TopologyEditFindingReviewReport.v1');
  expect(report.skippedFindingCount).toBe(1);
  expect(report.receipts.at(-1).action).toBe('SKIP');
  expect(report.receipts.at(-1).reason).toBe('CONFIRMED_VALID_SOURCE_GEOMETRY');

  await page.reload();
  await uploadJson(page, 'centerline-crossing-review.json', CENTERLINE_CROSSING_PACKAGE);
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();
  topology = consumer.locator('[data-role="load-calc-topology"]');
  const persistedGroup = topology.locator('.load-calc-topology-group')
    .filter({ hasText: 'HIGH CENTERLINE_CLASH' });
  await expect(persistedGroup.locator('summary')).toContainText('1 skipped');
  await persistedGroup.locator('summary').click();
  await persistedGroup.locator('[data-load-calc-topology-restore]').click();
  await expect(consumer.locator('.load-calc-topology-group')
    .filter({ hasText: 'HIGH CENTERLINE_CLASH' }).locator('summary')).toContainText('1 open');
});

test('keeps only source-evidence review findings for the real Sjson topology', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-role="dataset-file"]').setInputFiles({
    name: 'Sjson.json',
    mimeType: 'application/json',
    buffer: readFileSync('benchmarks/Sjson.json'),
  });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();

  const topology = page.locator('[data-role="load-calc-topology"]');
  const canonicalCard = topology.locator('.load-calc-error-check__summary article')
    .filter({ hasText: 'Canonical findings' });
  await expect(canonicalCard).toContainText('4');
  await expect(canonicalCard).toContainText('REVIEW_REQUIRED');
  await expect(topology.locator('.load-calc-topology-group')).toHaveCount(1);
  await expect(topology).toContainText('MEDIUM UNKNOWN_RESTRAINT_FAMILY');
  await expect(topology).toContainText('4 finding(s)');
  await expect(topology.locator('.load-calc-topology-group summary')).toContainText('4 open');
  await expect(topology).toContainText('4 unresolved topology finding(s) (4 UNKNOWN_RESTRAINT_FAMILY)');
  await expect(topology).not.toContainText('Review required: 0 disconnected-branch');
  await expect(topology).not.toContainText('06fb37f9ed9478bd');
  await expect(topology).toContainText('gap limit does not apply');
  await expect(topology).not.toContainText('Model scope');
  await expect(topology).not.toContainText('No automatic fix under the current limit');
  await expect(topology).not.toContainText('BRANCH_DISCONNECTED');
  await expect(topology).not.toContainText('SHORT_ELEMENT');
  await expect(topology).not.toContainText('OVERLAPPING_ELEMENTS');
  await expect(topology).not.toContainText('UNDEFINED_KINK');
  await expect(topology).not.toContainText('UNRESOLVED_RESTRAINT_DIRECTION');
  await expect(topology).not.toContainText('HIGH CENTERLINE_CLASH');
  await expect(topology).not.toContainText('Edge centerlines are 0.00mm apart.');
  await expect(topology.locator('[data-load-calc-topology-autofix]')).toBeDisabled();
  await expect(topology.locator('[data-load-calc-topology-autofix]')).toContainText(
    'Prepare auto-fix (0)',
  );
  await topology.getByRole('button', { name: 'Review findings in 3D' }).click();
  const checker = page.locator('[data-role="topology-edit-checker"]');
  await expect(checker).toContainText('4 topology finding(s)');
  await expect(checker).not.toContainText('266 issue(s)');
  await expect(checker.locator('[data-role="topology-edit-visual-evidence"] summary'))
    .toContainText('Rendering evidence notes');
});

function loadCalcTab(consumer, tabId) {
  const primary = consumer.locator('.empirical-load-calc__workflow').locator(`[data-load-calc-tab="${tabId}"]`);
  const advanced = consumer.locator('.empirical-load-calc__advanced');
  return {
    async click() {
      if (await primary.count()) {
        await primary.click();
        return;
      }
      if (await advanced.getAttribute('open') === null) await advanced.locator('summary').click();
      await advanced.locator('.empirical-load-calc__tabs').locator(`[data-load-calc-tab="${tabId}"]`).click();
    },
  };
}

async function uploadJson(page, name, payload) {
  await page.locator('[data-role="dataset-file"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
}

function pipe(id, startPoint, endPoint) {
  return {
    id, name: id, type: 'PIPE', sourcePath: `/MODEL/PIPES/${id}`,
    sourceAttributes: {
      LINE_ID: 'LINE-NON-FEA', SYSTEM_ID: 'SYS-NON-FEA',
      EI_N_M2: 2000000, UNIT_PIPE_WEIGHT_KG_PER_M: 10,
      INSULATION_THICKNESS_MM: 0, FLUID_WT_OPE_KG_M: 2, FLUID_WT_HYD_KG_M: 3,
    },
    nativeParams: { startPoint, endPoint },
  };
}

function support(id, position, attachedPortId) {
  return {
    id, name: id, type: 'SUPPORT', sourcePath: `/MODEL/SUPPORTS/${id}`,
    sourceAttributes: {
      LINE_ID: 'LINE-NON-FEA', SYSTEM_ID: 'SYS-NON-FEA',
      POS: { x: position[0], y: position[1], z: position[2] },
      ATTACHED_PORT_ID: attachedPortId, SUPPORT_TYPE: 'ANCHOR', VERTICAL_CAPABILITY: 'RESTRAINED',
    },
  };
}
