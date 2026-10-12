import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
// Include case preference/regeneration browser regressions in the existing exact-head CI suite.
import './lfea-pipeline-case-selection-persistence.spec.js';

/**
 * Import a real CAESAR II .ACCDB through the actual UI and assert the verdict.
 *
 * BM4_L is a committed real CAESAR II source. An external fixture can still
 * be selected through LFEA_ACCDB_FIXTURE for another project model.
 */
const committedFixturePath = fileURLToPath(
  new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url),
);
const fixturePath = process.env.LFEA_ACCDB_FIXTURE ?? committedFixturePath;
const expectedElements = process.env.LFEA_ACCDB_ELEMENTS ?? '96';
const expectedNodes = process.env.LFEA_ACCDB_NODES ?? '97';

test.describe('LFEA ACCDB real-model import', () => {
  test.describe.configure({ mode: 'serial', timeout: 300000 });

  test.skip(
    fixturePath === '' || !fs.existsSync(fixturePath),
    'Set LFEA_ACCDB_FIXTURE to a real CAESAR II .ACCDB to run this spec.',
  );

  test('imports a real ACCDB and reports a scoped, grouped verdict', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();

    const sourceHost = page.locator('[data-host-group="SOURCE"]');
    await expect(sourceHost).toHaveAttribute('data-active-source', 'NONE');
    const panel = page.locator('[data-role="lfea-pipeline-accdb-input-panel"]');
    await expect(panel).toBeHidden();
    await expect(panel).toHaveAttribute('data-model-health-status', 'NOT_LOADED');
    await expect(page.locator('[data-action="lfea-source-acquisition-import"][data-source-kind="ACCDB"]'))
      .toBeVisible();

    const guidance = page.locator('[data-role="lfea-pipeline-guidance"]');
    await expect(guidance).toContainText('Next: Input');
    for (const stepId of ['RUN', 'OUTPUT', 'EXPORT']) {
      await expect(page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${stepId}"]`))
        .toHaveAttribute('data-step-status', 'BLOCKED');
    }

    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);

    const status = page.locator('[data-role="lfea-pipeline-accdb-status"]');
    await expect(status).toContainText('element(s)', { timeout: 60000 });
    await expect(status).not.toContainText('failed');
    await expect(panel.locator('[data-role="lfea-pipeline-accdb-error"]')).toBeHidden();

    if (expectedElements !== '') await expect(status).toContainText(`${expectedElements} element(s)`);
    if (expectedNodes !== '') await expect(status).toContainText(`${expectedNodes} node(s)`);

    const sourceRow = panel.locator('[data-role="lfea-pipeline-accdb-capabilities"] tr').first();
    await expect(sourceRow).toHaveAttribute('data-status', 'PASS');
    await expect(sourceRow).toContainText('Read the file');
    await expect(sourceRow).toContainText('Ready');
    await expect(sourceRow.locator('th')).toHaveAttribute('title', 'SOURCE_ACCEPTANCE');

    await expect(panel).toHaveAttribute('data-requested-profile', 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1');
    const sections = panel.locator('[data-role="lfea-pipeline-accdb-finding-section"]');
    expect(await sections.count()).toBeGreaterThan(0);
    const groupRows = panel.locator('[data-role="lfea-pipeline-accdb-finding-groups"] > li');
    const groupCount = await groupRows.count();
    expect(groupCount).toBeGreaterThan(0);
    const occurrenceTotal = await groupRows.evaluateAll(
      (rows) => rows.reduce((total, row) => total + Number(row.dataset.count ?? 0), 0),
    );
    expect(occurrenceTotal).toBeGreaterThan(groupCount);

    const blockingFor = () => panel
      .locator('[data-role="lfea-pipeline-accdb-finding-groups"] > li[data-severity="error"]')
      .evaluateAll((rows) => rows.reduce((total, row) => total + Number(row.dataset.count ?? 0), 0));
    const approximateBlocking = await blockingFor();
    await page.locator('[data-role="lfea-pipeline-accdb-profile"]')
      .selectOption('STRICT_INPUTXML_LINEAR_STATIC_V1');
    await expect(panel).toHaveAttribute('data-requested-profile', 'STRICT_INPUTXML_LINEAR_STATIC_V1');
    expect(await blockingFor()).toBeGreaterThan(approximateBlocking);

    await page.locator('[data-action="toggle-lfea-pipeline-accdb-properties"]').click();
    const propertyRows = panel.locator('[data-role="lfea-pipeline-accdb-element-properties"] tr');
    expect(await propertyRows.count()).toBeGreaterThan(1);
    expect(await panel.locator('[data-role="accdb-override-input"]').count()).toBeGreaterThan(0);

    await expect(guidance).toContainText('1 of 6 steps complete');
    await expect(guidance).toContainText('Next: Error check');
    const loadCaseStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]');
    await expect(loadCaseStep).toHaveAttribute('data-step-status', 'BLOCKED');
    await expect(loadCaseStep).toHaveAttribute('title', /pre-flight/iu);

    expect(pageErrors).toEqual([]);
  });

  test('resolves component-basis BLOCK inline and preserves the governed review flow', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('element(s)', { timeout: 90000 });

    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    const errorCheck = page.locator('[data-role="lfea-common-error-check-panel"]');
    await expect(errorCheck).toBeVisible();
    const bendBlock = errorCheck.locator(
      '[data-role="lfea-common-error-check-finding-group"]'
        + '[data-group-code="BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED"][data-disposition="BLOCK"]',
    );
    const branchBlock = errorCheck.locator(
      '[data-role="lfea-common-error-check-finding-group"]'
        + '[data-group-code="BRANCH_FACTOR_EDITION_AUTHORITY_UNRESOLVED"][data-disposition="BLOCK"]',
    );
    // BM4_L has a bend authority gate; a separate branch/tee gate depends
    // on whether that source exercises B31J branch components.
    await expect(bendBlock).toHaveCount(1);
    const inline = errorCheck.locator('.lfea-bend-factor-authority-control--inline');
    await expect(inline).toBeVisible();
    const top = page.locator(
      '[data-role="linear-piping-consumer-root"] > [data-role="lfea-bend-factor-authority-control"]',
    );
    await expect(top).toHaveCount(1);

    // An edition alone clears neither the bend's incomplete authority gate
    // nor the need for explicit smooth-90 policy. All edits re-run pre-flight.
    await inline.locator('[data-role="lfea-bend-factor-edition"]')
      .selectOption('B31_3_2024_B31J_2023');
    await expect(bendBlock).toHaveCount(1);
    await expect(inline.locator('[data-role="lfea-bend-smooth90-policy"]')).toHaveValue('');

    await inline.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('NO');
    await expect(bendBlock).toHaveCount(0);
    await expect(branchBlock).toHaveCount(0);

    // Inline -> top synchronization, then top -> detached inline -> reattach.
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="INPUT"]').click();
    await expect(top.locator('[data-role="lfea-bend-factor-edition"]'))
      .toHaveValue('B31_3_2024_B31J_2023');
    await expect(top.locator('[data-role="lfea-bend-smooth90-policy"]')).toHaveValue('NO');
    await top.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('');
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    await expect(bendBlock).toHaveCount(1);
    await expect(inline).toBeVisible();
    await expect(inline.locator('[data-role="lfea-bend-smooth90-policy"]')).toHaveValue('');

    await inline.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('NO');
    await expect(bendBlock).toHaveCount(0);
    await expect(branchBlock).toHaveCount(0);
    const conditionalGroups = errorCheck.locator(
      '[data-role="lfea-common-error-check-finding-group"][data-disposition="CONDITIONAL"]',
    );
    if (fixturePath === committedFixturePath) {
      await expect(conditionalGroups).toHaveCount(11);
    }
    await acknowledgeAndAuthorize(errorCheck);
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
      .toBeEnabled();

    // This workflow is already run by the required real-ACCDB browser CI.
    // Re-import via the new shortcut after a manual, explicitly approved
    // import: it must load the original raw counts and withdraw the previous
    // source's approval, without starting a solver run.
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="INPUT"]').click();
    await page.locator('[data-action="lfea-source-acquisition-reference-bm4l"]').click();
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('Loaded BM4_L.ACCDB: 96 element(s), 97 node(s)', { timeout: 120000 });
    await expect(page.locator('[data-role="lfea-source-acquisition-reference-status"]'))
      .toContainText('import completed');
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');

    // A16: manual selection after a verified shortcut must replace its source,
    // discarding any old authorization even when the ACCDB bytes are identical.
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles({
      name: 'manual-after-reference.accdb',
      mimeType: 'application/vnd.ms-access',
      // A16 is pinned to the repository model even if this legacy test
      // suite was invoked with an alternate LFEA_ACCDB_FIXTURE override.
      buffer: fs.readFileSync(committedFixturePath),
    });
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('Loaded manual-after-reference.accdb: 96 element(s), 97 node(s)', { timeout: 120000 });
    await expect(page.locator('[data-role="lfea-source-acquisition-summary"]'))
      .toContainText('manual-after-reference.accdb');
    const manualState = await page.evaluate(() => {
      const state = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState();
      return {
        kind: state.source?.kind,
        fileName: state.source?.fileName,
        solveAuthorized: state.preparation?.preFlight?.solveAuthorized,
        approver: state.preparation?.preFlight?.approverIdentity ?? null,
      };
    });
    expect(manualState).toEqual({
      kind: 'ACCDB',
      fileName: 'manual-after-reference.accdb',
      solveAuthorized: false,
      approver: null,
    });
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
    expect(pageErrors).toEqual([]);
  });

  test('runs the imported ACCDB model through Load case, Run and Output', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();

    await page.locator('[data-action="lfea-source-acquisition-import"][data-source-kind="ACCDB"]')
      .click();
    await page.locator('[data-role="lfea-bend-factor-edition"]').selectOption('B31_3_2022_B31J_2017');
    await page.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('YES');

    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('element(s)', { timeout: 90000 });

    const firstFinding = page.locator('[data-role="lfea-pipeline-accdb-finding-groups"] > li summary').first();
    await expect(firstFinding).toContainText(/[a-z]{4,} [a-z]{3,}/u);
    await expect(firstFinding).toContainText('×');

    const sourceHost = page.locator('[data-host-group="SOURCE"]');
    await expect(sourceHost).toHaveAttribute('data-active-source', 'ACCDB');
    await expect(page.locator('[data-role="linear-piping-inputxml-source-workflow"]')).toBeHidden();
    await expect(page.locator('[data-role="lfea-pipeline-stagedjson-input-panel"]')).toBeHidden();

    const panel = page.locator('[data-role="lfea-pipeline-accdb-input-panel"]');
    await expect(panel.locator('[data-role="lfea-pipeline-accdb-source-view"]')).toBeVisible();
    await expect(panel.locator('[data-role="lfea-pipeline-accdb-review-view"]')).toBeHidden();

    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-role="lfea-pipeline-accdb-review-view"]')).toBeVisible();
    await expect(panel.locator('[data-role="lfea-pipeline-accdb-source-view"]')).toBeHidden();
    expect(await panel.locator('[data-role="lfea-pipeline-accdb-finding-section"]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-role="linear-piping-inputxml-source-workflow"]')).toBeHidden();

    const preFlightStatus = page.locator('[data-role="lfea-pipeline-accdb-preflight-status"]');
    await expect(preFlightStatus).toBeVisible();
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
    const errorCheck = page.locator('[data-role="lfea-common-error-check-panel"]');
    await acknowledgeAndAuthorize(errorCheck);

    await expect(page.locator('[data-role="lfea-pipeline-guidance"]'))
      .toContainText('Next: Load case', { timeout: 60000 });

    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();
    const caseBoxes = page.locator('[data-role="lfea-pipeline-case-checkbox"]');
    expect(await caseBoxes.count()).toBeGreaterThan(0);
    await caseBoxes.first().check();
    await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
    await expect(page.locator('[data-role="lfea-pipeline-case-selection-status"]')).toContainText('case(s)');
    await expect(page.locator('[data-role="lfea-pipeline-case-selection-panel"] [data-action="lfea-pipeline-analyze"]'))
      .toHaveCount(0);

    // Applying a case selection regenerates the pre-flight and may invalidate
    // the earlier acceptance. Re-authorize if that control is shown again.
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    if (await errorCheck.locator('[data-role="lfea-error-check-authorization-state"][data-state="CONDITIONAL_PENDING"]').count() > 0) {
      await expect(errorCheck.locator('[data-role="lfea-error-check-authorization-state"]'))
        .toHaveAttribute('data-state', 'CONDITIONAL_PENDING');
      await acknowledgeAndAuthorize(errorCheck);
    }

    // Run is now a real task: the same sealed case IDs are summarized here and
    // the only Analyze action belongs to this surface.
    const runStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]');
    await expect(runStep).toBeEnabled({ timeout: 60000 });
    await runStep.click();
    const runPanel = page.locator('[data-role="lfea-pipeline-run-panel"]');
    await expect(runPanel).toBeVisible();
    await expect(runPanel.locator('[data-role="lfea-pipeline-run-cases"] li[data-case-id]')).not.toHaveCount(0);
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="OUTPUT"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
    await runPanel.locator('[data-action="lfea-pipeline-analyze"]').click();

    const summary = page.locator('[data-role="lfea-pipeline-results-summary"]');
    await expect(summary).toBeVisible({ timeout: 180000 });
    await expect(page.locator('[data-role="lfea-pipeline-active-step-context"]'))
      .toHaveAttribute('data-step-id', 'OUTPUT');
    await expect(summary).toContainText('Max displacement');
    await expect(summary).toContainText('Max support force');
    await expect(summary).toContainText('@ node');
    expect(await page.locator('[data-role="lfea-pipeline-results-table"] tr[data-node-id]').count())
      .toBeGreaterThan(1);

    // Export is distinct from Output; the old inline export action is not a
    // visible duplicate and the Export step owns the downloadable projection.
    await expect(page.locator('[data-role="lfea-pipeline-results-panel"] .lfea-pipeline-results__export')).toBeHidden();
    const exportStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="EXPORT"]');
    await expect(exportStep).toBeEnabled();
    await exportStep.click();
    await expect(page.locator('[data-role="lfea-pipeline-export-panel"]')).toBeVisible();
    await expect(page.locator('[data-role="lfea-pipeline-export-summary"]')).toContainText('File');
    await expect(page.locator('[data-role="lfea-pipeline-export-panel"] [data-action="lfea-pipeline-results-csv"]')).toBeEnabled();

    expect(pageErrors).toEqual([]);
  });

  test('issue #47: find exact source, preview/cancel/apply real ACCDB coordinate, undo/redo and four Output cases', async ({ page }) => {
    test.setTimeout(300000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-bend-factor-edition"]').selectOption('B31_3_2022_B31J_2017');
    await page.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('YES');
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    const step = (id) => page.locator('[data-role="lfea-pipeline-step"][data-step-id="' + id + '"]');
    await step('ERROR_CHECK').click();
    const errorCheck = page.locator('[data-role="lfea-common-error-check-panel"]');
    const workspace = errorCheck.locator('[data-role="lfea-accdb-repair-workspace"]');
    await expect(workspace).toBeVisible();
    await expect(workspace.locator('[data-role="lfea-accdb-repair-svg-host"] svg'))
      .toHaveAttribute('data-representation', 'SOURCE');
    const groups = errorCheck.locator('[data-role="lfea-common-error-check-finding-group"]');
    let located = false;
    for (let i = 0; i < Math.min(await groups.count(), 18); i += 1) {
      const group = groups.nth(i);
      const summary = group.locator('summary');
      if (!(await group.locator('details').count())) continue;
      await summary.click();
      const buttons = group.locator('[data-action="lfea-error-check-locate-occurrence"]');
      if (await buttons.count()) {
        await buttons.first().click();
        const detail = await errorCheck.locator('[data-role="lfea-accdb-finding-location"]').textContent();
        if (detail?.includes('EXACT')) { located = true; break; }
      }
      await summary.click();
    }
    expect(located).toBe(true);
    await expect(errorCheck.locator('[data-role="lfea-accdb-finding-location"]'))
      .toContainText('EXACT');
    const nodeAction = workspace.locator('[data-action="lfea-repair-select-node"]').first();
    if (await nodeAction.count()) await nodeAction.click();
    else {
      // A near-node finding can select its source node directly.
      await expect(workspace.locator('[data-role="lfea-repair-coordinate-axis"]')).toBeVisible();
    }
    await workspace.locator('[data-role="lfea-repair-approver"]').fill('Issue 47 test engineer');
    await workspace.locator('[data-role="lfea-repair-reason"]')
      .fill('Source-node coordinate input correction; affected elements inspected');
    const current = await workspace.locator('p').filter({ hasText: /Raw source X:/u }).first().textContent();
    const match = /Raw source X:\s*([-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?)/iu.exec(current);
    expect(match).toBeTruthy();
    const newRaw = Number(match[1]) + 10;
    const preFlightState = () => page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      return { hash: p.semanticHash, authorization: p.authorization?.semanticHash ?? null, solveAuthorized: p.solveAuthorized };
    });
    const before = await preFlightState();
    await workspace.locator('[data-role="lfea-repair-coordinate-value"]').fill(String(newRaw));
    await workspace.locator('[data-action="lfea-repair-preview"]').click();
    await expect(workspace.locator('[data-role="lfea-accdb-coordinate-preview"]'))
      .toContainText('affected elements');
    expect((await preFlightState()).hash).toBe(before.hash, 'preview must not mutate the consumed preparation');
    await workspace.locator('[data-action="lfea-repair-cancel"]').click();
    expect((await preFlightState()).hash).toBe(before.hash, 'Cancel must not mutate the consumed preparation');
    await workspace.locator('[data-action="lfea-repair-preview"]').click();
    await workspace.locator('[data-action="lfea-repair-apply"]').click();
    await expect(workspace.locator('[data-role="lfea-accdb-repair-status"]'))
      .toContainText('fresh diagnostics');
    const after = await preFlightState();
    expect(after.hash).not.toBe(before.hash);
    expect(after.solveAuthorized).toBe(false);
    await workspace.locator('[data-action="lfea-repair-undo"]').click();
    expect((await preFlightState()).hash).toBe(before.hash);
    await workspace.locator('[data-action="lfea-repair-redo"]').click();
    expect((await preFlightState()).hash).toBe(after.hash);
    const dl = page.waitForEvent('download');
    await workspace.locator('[data-action="lfea-repair-save"]').click();
    const download = await dl;
    expect(download.suggestedFilename()).toContain('ACCDB-coordinate-corrections');
    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();
    await workspace.locator('[data-role="lfea-repair-load-file"]').setInputFiles(savedPath);
    await expect(workspace.locator('[data-role="lfea-accdb-repair-status"]'))
      .toContainText('loaded for preview');
    await workspace.locator('[data-action="lfea-repair-apply-loaded"]').click();
    expect((await preFlightState()).solveAuthorized).toBe(false);

    // This is a new preflight; the prior owner's diagnostic acceptance must
    // not be carried into the changed geometry.
    const conditional = errorCheck.locator(
      '[data-role="lfea-common-error-check-finding-group"][data-disposition="CONDITIONAL"] summary',
    );
    expect(await conditional.count()).toBeGreaterThan(0);
    for (let i = 0; i < await conditional.count(); i += 1) {
      const item = conditional.nth(i);
      if (!(await item.locator('..').evaluate((node) => node.open))) await item.click();
    }
    await errorCheck.locator('[data-role="lfea-error-check-accept-limitations"]').check();
    await errorCheck.locator('[data-role="lfea-error-check-reviewer"]').fill('Issue 47 test engineer');
    await errorCheck.locator('[data-role="lfea-error-check-reason"]')
      .fill('Reviewed the entire new preparation after coordinate correction.');
    await errorCheck.locator('[data-action="authorize-lfea-error-check-limitations"]').click();
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'true');

    await step('LOAD_CASE').click();
    const caseRows = page.locator('.lfea-pipeline-case-selection__row');
    const requested = new Set(['W', 'W+P1', 'W+P1+T1', 'W+T1']);
    const seen = new Set();
    for (let i = 0; i < await caseRows.count(); i += 1) {
      const row = caseRows.nth(i);
      const label = (await row.locator('strong').textContent()).trim();
      const checkbox = row.locator('input[type="checkbox"]');
      if (requested.has(label)) { seen.add(label); await checkbox.check(); }
      else await checkbox.uncheck();
    }
    expect(seen).toEqual(requested);
    await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
    await step('ERROR_CHECK').click();
    const freshConditional = errorCheck.locator(
      '[data-role="lfea-common-error-check-finding-group"][data-disposition="CONDITIONAL"] summary',
    );
    for (let i = 0; i < await freshConditional.count(); i += 1) {
      await freshConditional.nth(i).click();
    }
    await errorCheck.locator('[data-role="lfea-error-check-accept-limitations"]').check();
    await errorCheck.locator('[data-role="lfea-error-check-reviewer"]').fill('Issue 47 test engineer');
    await errorCheck.locator('[data-role="lfea-error-check-reason"]')
      .fill('Explicit renewed authorization for the selected four-case preflight.');
    await errorCheck.locator('[data-action="authorize-lfea-error-check-limitations"]').click();
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'true');
    await step('RUN').click();
    await page.locator('[data-role="lfea-pipeline-run-panel"] [data-action="lfea-pipeline-analyze"]').click();
    await expect(page.locator('[data-role="lfea-pipeline-results-summary"]'))
      .toBeVisible({ timeout: 180000 });
    await expect(page.locator('[data-role="lfea-pipeline-active-step-context"]'))
      .toHaveAttribute('data-step-id', 'OUTPUT');
    await expect(page.locator('[data-role="topbar-dataset"]')).toHaveText('BM4_L.ACCDB');
    await expect(page.locator('[data-role="lfea-topbar-run-status"]'))
      .toContainText('linear result available');
    const caseTabs = page.locator('[data-role="lfea-pipeline-results-cases"] button');
    const labels = (await caseTabs.allTextContents()).map((label) => label.trim());
    expect(new Set(labels)).toEqual(requested);
    for (const name of requested) {
      const index = labels.findIndex((label) => label === name);
      expect(index).toBeGreaterThanOrEqual(0);
      await caseTabs.nth(index).click();
      await expect(page.locator('[data-role="lfea-pipeline-results-status"]')).toContainText(name);
      await expect(page.locator('[data-role="lfea-pipeline-results-table"] tr[data-node-id]'))
        .not.toHaveCount(0);
    }
    expect(pageErrors).toEqual([]);
  });

  test('issue #49: actual pointer and keyboard selection reach the source inspector', async ({ page }) => {
    test.setTimeout(180000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-bend-factor-edition"]').selectOption('B31_3_2022_B31J_2017');
    await page.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('YES');
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();

    await expect(page.locator('[data-role="topbar-dataset-kind"]')).toHaveText('Source:');
    await expect(page.locator('[data-role="topbar-dataset"]')).toHaveText('BM4_L.ACCDB');
    await expect(page.locator('[data-role="lfea-topbar-run-status"]'))
      .toContainText('Run blocked');
    await expect(page.locator('[data-role="tab-benchmark-status"]')).toBeHidden();
    const workspace = page.locator('[data-role="lfea-accdb-repair-workspace"]');
    const svg = workspace.locator('[data-role="lfea-accdb-repair-svg-host"] svg');
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    const node = () => svg.locator('circle[data-node-id="20010"][role="button"]');
    await expect(node()).toBeVisible();
    // Playwright's real pointer click must select, not only keyboard Enter:
    // an SVG-root pointer capture used to swallow this click after pointerdown.
    await node().click();
    await expect(inspector.locator('strong')).toContainText('Node 20010');
    await expect(inspector.locator('[data-role="lfea-repair-coordinate-axis"]')).toBeVisible();
    await node().focus();
    await page.keyboard.press('Enter');
    await expect(inspector.locator('strong')).toContainText('Node 20010');

    // The separate projected node 20020 used to cover 20010's mouse
    // target on the authentic BM4_L. Click each *real* SVG hit area and
    // observe the actual source ID; an intended locator is not proof of a
    // dispatched target.
    const otherNode = svg.locator('circle[data-node-id="20020"][role="button"]');
    await expect(otherNode).toBeVisible();
    await expect(node()).toHaveAttribute('data-hit-target-offset', 'DISPLAY_ONLY');
    await expect(otherNode).toHaveAttribute('data-hit-target-offset', 'DISPLAY_ONLY');
    await otherNode.click();
    await expect(inspector.locator('strong')).toContainText('Node 20020');
    await node().click();
    await expect(inspector.locator('strong')).toContainText('Node 20010');

    // A source segment is selectable by pointer too, with provenance and
    // whitelisted properties instead of a fabricated derived-record editor.
    const line = svg.locator('line[data-segment-id][role="button"]').first();
    const segmentId = await line.getAttribute('data-segment-id');
    expect(segmentId).toBeTruthy();
    await line.click();
    await expect(inspector.locator('strong')).toContainText(segmentId);
    await expect(inspector.locator('[data-role="lfea-repair-property-field"]')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('issue #49: correction before explicit component basis rebuilds current ACCDB without acceptance', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();

    const errorCheck = page.locator('[data-role="lfea-common-error-check-panel"]');
    const workspace = errorCheck.locator('[data-role="lfea-accdb-repair-workspace"]');
    const bendBlock = errorCheck.locator(
      '[data-role="lfea-common-error-check-finding-group"]'
        + '[data-group-code="BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED"][data-disposition="BLOCK"]',
    );
    await expect(bendBlock).toHaveCount(1);
    await workspace.locator('[data-role="lfea-repair-object-search"]').fill('20010');
    await workspace.locator('[data-action="lfea-repair-find"]').click();
    await expect(workspace.locator('[data-role="lfea-accdb-repair-inspector"] strong'))
      .toContainText('Node 20010');

    await workspace.locator('[data-role="lfea-repair-approver"]').fill('Regression engineer');
    await workspace.locator('[data-role="lfea-repair-reason"]')
      .fill('Source coordinate correction with explicit review, no run acceptance');
    const current = await workspace.locator('p').filter({ hasText: /Raw source X:/u }).first().textContent();
    const raw = /Raw source X:\s*([-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?)/iu.exec(current);
    expect(raw).toBeTruthy();
    await workspace.locator('[data-role="lfea-repair-coordinate-value"]').fill(String(Number(raw[1]) + 0.5));
    await workspace.locator('[data-action="lfea-repair-preview"]').click();
    await workspace.locator('[data-action="lfea-repair-apply"]').click();
    await workspace.locator('[data-action="lfea-repair-undo"]').click();
    await workspace.locator('[data-action="lfea-repair-redo"]').click();
    await expect(bendBlock).toHaveCount(1);

    const top = page.locator(
      '[data-role="linear-piping-consumer-root"] > [data-role="lfea-bend-factor-authority-control"]',
    );
    await top.locator('[data-role="lfea-bend-factor-edition"]')
      .selectOption('B31_3_2024_B31J_2023');
    await expect(bendBlock).toHaveCount(1); // edition alone is insufficient
    await top.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('NO');
    await expect(top.locator('[data-role="lfea-bend-factor-edition"]'))
      .toHaveValue('B31_3_2024_B31J_2023');
    await expect(top.locator('[data-role="lfea-bend-smooth90-policy"]')).toHaveValue('NO');
    await expect(bendBlock).toHaveCount(0, { timeout: 60000 });
    const currentPreflight = await page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      return { status: p.status, authorized: p.solveAuthorized };
    });
    expect(currentPreflight.status).toBe('WARN');
    expect(currentPreflight.authorized).toBe(false);
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'false');
    // No acceptance or Output execution for the changed preparation.
  });

  test('issue #49: 390px navigation and authorization remain inside viewport', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-bend-factor-edition"]').selectOption('B31_3_2024_B31J_2023');
    await page.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('NO');
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    const authorize = page.locator('[data-action="authorize-lfea-error-check-limitations"]');
    await expect(authorize).toBeVisible();
    const boxes = await page.evaluate(() => {
      const rect = (selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      };
      return {
        header: rect('.application-navigation-shell'),
        navigation: rect('[data-role="application-navigation"]'),
        authorize: rect('[data-action="authorize-lfea-error-check-limitations"]'),
      };
    });
    for (const [name, rect] of Object.entries(boxes)) {
      expect(rect.left, name + ' left edge').toBeGreaterThanOrEqual(-1);
      expect(rect.right, name + ' right edge').toBeLessThanOrEqual(391);
      expect(rect.width, name + ' width').toBeLessThanOrEqual(391);
    }
  });

  test('issue #47 real ACCDB transaction and exact-source locator regression', () => {
    const output = execFileSync(process.execPath, ['scripts/lfea-accdb-repair-transaction-check.mjs'],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 180000 });
    const result = JSON.parse(output.trim());
    expect(result.status).toBe('PASS');
    expect(result.originalBytesUnchanged).toBe(true);
    expect(result.preparationHashChanged).toBe(true);
  });

});

async function acknowledgeAndAuthorize(errorCheck) {
  // Conditional groups are reviewed by expanding their details. The older
  // per-group acknowledgement buttons were intentionally removed in PR #4.
  const conditionalSummaries = errorCheck.locator(
    '[data-role="lfea-common-error-check-finding-group"][data-disposition="CONDITIONAL"] summary',
  );
  const count = await conditionalSummaries.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await conditionalSummaries.nth(index).click();
    await expect(errorCheck.locator('#lfea-error-check-progress')).toHaveJSProperty('value', index + 1);
  }
  await errorCheck.locator('[data-role="lfea-error-check-accept-limitations"]').check();
  await errorCheck.locator('[data-role="lfea-error-check-reviewer"]').fill('A. Engineer');
  await errorCheck.locator('[data-role="lfea-error-check-reason"]').fill('Reviewed and accepted.');
  const authorize = errorCheck.locator('[data-action="authorize-lfea-error-check-limitations"]');
  await expect(authorize).toBeEnabled();
  await authorize.click();
  await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'true', { timeout: 60000 });
}
