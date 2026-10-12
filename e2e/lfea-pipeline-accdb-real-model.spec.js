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

  test('issue #49: exact source inspector opens current finding IDs by pointer and Enter; stale and missing identities refuse', async ({ page }) => {
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
    const prepHash = await page.evaluate(() =>
      globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight.semanticHash);
    // Start with a genuine current governed finding that resolves to a
    // renderable source node/span; do not assume proximity implies custody.
    const groups = errorCheck.locator('[data-role="lfea-common-error-check-finding-group"]');
    let found = false;
    for (let index = 0; index < Math.min(await groups.count(), 22); index += 1) {
      const group = groups.nth(index);
      const details = group.locator('details').first();
      if (!(await details.count())) continue;
      if (!(await details.evaluate((node) => node.open))) {
        await group.locator('summary').first().click();
      }
      const locators = group.locator('[data-action="lfea-error-check-locate-occurrence"]');
      if (!(await locators.count())) continue;
      await locators.first().click();
      const location = workspace.locator('[data-role="lfea-accdb-finding-location"]');
      if ((await location.count()) && (await location.textContent()).includes('EXACT')
        && await workspace.locator('[data-action="lfea-repair-open-related-finding"]').count()) {
        found = true;
        break;
      }
    }
    expect(found, 'a true source-bound finding and selectable source object must exist').toBe(true);
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    const selectedSourceLabel = await inspector.locator('strong').first().textContent();
    const related = workspace.locator('[data-role="lfea-repair-related-findings"]');
    await expect(related.locator('li[data-finding-id]')).not.toHaveCount(0);
    const link = related.locator('[data-action="lfea-repair-open-related-finding"]').first();
    const id = await link.getAttribute('data-finding-id');
    expect(id).toBeTruthy();
    await expect(link).toContainText(id);
    const reviewCount = await errorCheck.locator('[data-role="lfea-common-error-check-reviewed"]').count();
    await link.click();
    const exactRow = errorCheck.locator('[data-role="lfea-error-check-occurrence"][data-finding-id="' + id + '"]');
    await expect(exactRow).toBeVisible();
    expect(await exactRow.evaluate((node) => node === document.activeElement)).toBe(true);
    await expect(inspector.locator('strong').first()).toHaveText(selectedSourceLabel);
    expect(await errorCheck.locator('[data-role="lfea-common-error-check-reviewed"]').count())
      .toBe(reviewCount, 'navigation must not silently review a conditional limitation');
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(exactRow).toBeVisible();
    expect(await exactRow.evaluate((node) => node === document.activeElement)).toBe(true);
    expect(await page.evaluate(() =>
      globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight.semanticHash))
      .toBe(prepHash);
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'false');

    // Unknown source identities must neither guess the nearest node nor
    // silently change the inspector selection.
    await workspace.locator('[data-role="lfea-repair-object-search"]').fill('NOT-A-SOURCE-IDENTITY');
    await workspace.locator('[data-action="lfea-repair-find"]').click();
    await expect(workspace.locator('[data-role="lfea-accdb-repair-status"]'))
      .toContainText('No exact SOURCE source object found');
    await expect(inspector.locator('strong').first()).toHaveText(selectedSourceLabel);

    // Save a reference to the old genuine DOM action, then change native
    // preparation authority. A stale detached action must refuse by hash.
    await page.evaluate(() => {
      globalThis.__issue49OldRelatedFinding = document.querySelector(
        '[data-action="lfea-repair-open-related-finding"]');
    });
    const basis = page.locator(
      '[data-role="linear-piping-consumer-root"] > [data-role="lfea-bend-factor-authority-control"]');
    await basis.locator('[data-role="lfea-bend-factor-edition"]')
      .selectOption('B31_3_2024_B31J_2023');
    await basis.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('NO');
    expect(await page.evaluate(() =>
      globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight.semanticHash))
      .not.toBe(prepHash);
    await page.evaluate(() => {
      globalThis.__issue49OldRelatedFinding.click();
      delete globalThis.__issue49OldRelatedFinding;
    });
    await expect(workspace.locator('[data-role="lfea-accdb-repair-status"]'))
      .toContainText('Stale related finding');
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'false');
  });

  test('issue #47: correction history, saved draft error recovery and blocked exploratory-edit control', async ({ page }) => {
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
    const savedDraft = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
    expect(savedDraft.originalAccdbByteSha256).toMatch(/^sha256:[a-f0-9]{64}$/u);
    if (fixturePath === committedFixturePath) {
      expect(savedDraft.originalAccdbByteSha256).toBe(
        'sha256:64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8',
      );
    }
    await workspace.locator('[data-role="lfea-repair-load-file"]').setInputFiles({
      name: 'wrong-accdb-binary.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        ...savedDraft, originalAccdbByteSha256: 'sha256:' + '0'.repeat(64),
      })),
    });
    const draftStatus = workspace.locator('[data-role="lfea-accdb-repair-status"]');
    await expect(draftStatus).toHaveAttribute('data-status', 'error');
    await expect(draftStatus).toContainText('does not match the original ACCDB binary SHA-256');
    await expect(workspace.locator('[data-action="lfea-repair-apply-loaded"]')).toHaveCount(0,
      'wrong-binary draft must not remain loaded');
    await workspace.locator('[data-role="lfea-repair-load-file"]').setInputFiles(savedPath);
    await expect(draftStatus).toHaveAttribute('data-status', 'ok');
    await expect(draftStatus).toContainText('Saved correction loaded for preview');
    await expect(draftStatus).not.toContainText('does not match');
    await expect(workspace.locator('[data-action="lfea-repair-apply-loaded"]')).toHaveCount(1);
    await workspace.locator('[data-action="lfea-repair-apply-loaded"]').click();
    await expect(draftStatus).toHaveAttribute('data-status', 'ok');
    await expect(draftStatus).toContainText('Saved correction applied');
    await expect(draftStatus).not.toContainText('does not match');
    await expect(workspace.locator('[data-action="lfea-repair-apply-loaded"]')).toHaveCount(0);
    await expect(workspace.locator('[data-role="lfea-accdb-correction-ledger"] li'))
      .not.toHaveCount(0);
    expect((await preFlightState()).solveAuthorized).toBe(false);

    // This exploratory branch intentionally uses the FIRST finding-linked
    // source node and a large +10 mm delta under 2022/YES. It is NOT the
    // documented positive 20010/+0.5 mm, 2024/NO sequence. Its observed
    // BLOCK is diagnostic evidence, never permission to expose acceptance.
    const control = await page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      const authority = p.preparation?.stiffnessPreflight?.bendFactorAuthority ?? null;
      return {
        status: p.status, solveAuthorized: p.solveAuthorized,
        intakeHash: p.intake.semanticHash, preparationHash: p.semanticHash,
        retainedBasis: authority && {
          edition: authority.editionProfileId,
          smooth90: authority.smooth90FlexibilityCorrection,
          sourceRevision: authority.sourceEvidence?.sourceRevision,
          semanticHash: authority.semanticHash,
        },
        blockers: (p.preparation?.findings ?? [])
          .filter((finding) => finding.disposition === 'BLOCK')
          .map((finding) => ({ code: finding.code, message: finding.message })),
      };
    });
    expect(control.solveAuthorized).toBe(false);
    expect(control.status).toBe('BLOCK');
    expect(control.blockers.length).toBeGreaterThan(0);
    await expect(errorCheck).toHaveAttribute('data-pre-flight-status', 'BLOCK');
    await expect(errorCheck.locator('[data-role="lfea-error-check-accept-limitations"]'))
      .toHaveCount(0, { timeout: 10000 });
    // Retain real source/gate evidence; do not misclassify missing authority
    // versus a physically invalid edit from the absence of a checkbox.
    // Differential pre-flight ONLY: no Run or approval. Switch the explicit
    // factor edition/rule on the SAME +10mm edited tables, then undo to the
    // authentic original and redo. This separates profile-specific limits,
    // geometry-dependent qualification and lost authority custody.
    const topBasis = page.locator(
      '[data-role="linear-piping-consumer-root"] > [data-role="lfea-bend-factor-authority-control"]',
    );
    await topBasis.locator('[data-role="lfea-bend-factor-edition"]')
      .selectOption('B31_3_2024_B31J_2023');
    await topBasis.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('NO');
    const currentPreflight = () => page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      const basis = p.preparation?.stiffnessPreflight?.bendFactorAuthority ?? null;
      return {
        status: p.status, authorized: p.solveAuthorized,
        intakeHash: p.intake.semanticHash, preflightHash: p.semanticHash,
        basis: basis && {
          edition: basis.editionProfileId, smooth90: basis.smooth90FlexibilityCorrection,
          sourceRevision: basis.sourceEvidence?.sourceRevision,
        },
        blockers: (p.preparation?.findings ?? [])
          .filter((f) => f.disposition === 'BLOCK').map((f) => f.code),
      };
    });
    const edited2024 = await currentPreflight();
    expect(edited2024.intakeHash).toBe(control.intakeHash,
      'switching the edition must not silently reimport or discard the +10mm input');
    expect(edited2024.authorized).toBe(false);
    await workspace.locator('[data-action="lfea-repair-undo"]').click();
    const original2024 = await currentPreflight();
    expect(original2024.status).toBe('WARN',
      'the authentic unedited source with explicit 2024/NO must regain its governed WARN');
    expect(original2024.authorized).toBe(false);
    expect(original2024.intakeHash).not.toBe(edited2024.intakeHash);
    expect(original2024.basis).toMatchObject({
      edition: 'B31_3_2024_B31J_2023', smooth90: false,
      sourceRevision: 'INTAKE-' + original2024.intakeHash,
    });
    await workspace.locator('[data-action="lfea-repair-redo"]').click();
    const reedited2024 = await currentPreflight();
    expect(reedited2024).toEqual(edited2024,
      'redo must recreate the same edited intake and factor-basis verdict deterministically');
    const classification = edited2024.status === 'WARN'
      ? '2022/YES-BLOCK-2024/NO-WARN-ON-SAME-EDIT'
      : edited2024.status === 'BLOCK'
        ? 'EDIT-SPECIFIC-BLOCK-WITH-ORIGINAL-WARN'
        : 'OTHER-STATUS-REQUIRES-INVESTIGATION';
    test.info().annotations.push({
      type: 'exploratory-edit-negative-control',
      description: JSON.stringify({ original2022YesEdited: control,
        edited2024, original2024, reedited2024, classification }),
    });
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

  test('issue #49: derived analysis node announces read-only identity and exposes no source editor', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    const workspace = page.locator('[data-role="lfea-accdb-repair-workspace"]');
    await workspace.locator('[data-action="lfea-repair-representation-ANALYSIS"]').click();
    const svg = workspace.locator('[data-role="lfea-accdb-repair-svg-host"] svg');
    await expect(svg).toHaveAttribute('data-representation', 'ANALYSIS');
    const derived = svg.locator('circle[data-node-id="ACCDB.E33.A2"][role="button"]');
    await expect(derived).toBeVisible();
    await expect(derived).toHaveAttribute('aria-label', /Inspect derived analysis node ACCDB\.E33\.A2.*read-only/u);
    await expect(derived).not.toHaveAttribute('aria-label', /Select source node/u);
    await derived.focus();
    await page.keyboard.press('Enter');
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    await expect(inspector).toContainText('ACCDB.E33.A2');
    await expect(inspector).toContainText(/read-only|analysis/u);
    await expect(inspector.locator('[data-role="lfea-repair-coordinate-axis"]')).toHaveCount(0);
    await expect(inspector.locator('[data-role="lfea-repair-coordinate-value"]')).toHaveCount(0);
    await workspace.locator('[data-action="lfea-repair-representation-SOURCE"]').click();
    const sourceSvg = workspace.locator('[data-role="lfea-accdb-repair-svg-host"] svg');
    await expect(sourceSvg).toHaveAttribute('data-representation', 'SOURCE');
    await expect(sourceSvg.locator('line[data-segment-id="ACCDB.E33"]')).toHaveCount(1);
    // Retained source segment is separately addressable; derived node selection
    // did not turn any conditioned topology into editable imported ACCDB data.
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
    const correctedIntake = await page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      return { intakeHash: p.intake.semanticHash, preFlightHash: p.semanticHash,
        authority: p.preparation?.stiffnessPreflight?.bendFactorAuthority ?? null };
    });
    expect(correctedIntake.authority).toBeNull();

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
      const basis = p.preparation?.stiffnessPreflight?.bendFactorAuthority ?? null;
      const branch = p.preparation?.stiffnessPreflight?.branchFactorAuthority ?? null;
      return {
        status: p.status, authorized: p.solveAuthorized,
        intakeHash: p.intake.semanticHash, preFlightHash: p.semanticHash,
        sealedBasis: basis && {
          edition: basis.editionProfileId, smooth90: basis.smooth90FlexibilityCorrection,
          sourceRevision: basis.sourceEvidence?.sourceRevision, semanticHash: basis.semanticHash,
        },
        sealedBranchEdition: branch?.editionProfileId ?? null,
        blockerCodes: (p.preparation?.findings ?? [])
          .filter((finding) => finding.disposition === 'BLOCK').map((finding) => finding.code),
      };
    });
    expect(currentPreflight.status).toBe('WARN');
    expect(currentPreflight.authorized).toBe(false);
    expect(currentPreflight.intakeHash).toBe(correctedIntake.intakeHash,
      'basis must be sealed against the current corrected ACCDB, never a reimported source');
    expect(currentPreflight.preFlightHash).not.toBe(correctedIntake.preFlightHash,
      'the explicit selected authority must generate a fresh preparation');
    expect(currentPreflight.sealedBasis).toMatchObject({
      edition: 'B31_3_2024_B31J_2023',
      smooth90: false,
      sourceRevision: 'INTAKE-' + correctedIntake.intakeHash,
    });
    expect(currentPreflight.sealedBasis.semanticHash).toBeTruthy();
    expect(currentPreflight.sealedBranchEdition).toBe('B31_3_2024_B31J_2023');
    expect(currentPreflight.blockerCodes).not.toContain('BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED');
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
    await expect(page.locator('[data-role="topbar-dataset-kind"]')).toHaveText('Source:');
    await expect(page.locator('[data-role="topbar-dataset"]')).toHaveText('BM4_L.ACCDB');
    await expect(page.locator('[data-role="lfea-topbar-run-status"]')).toContainText('Run blocked');
    await expect(page.locator('[data-role="topbar-dataset"]')).toBeVisible();
    await expect(page.locator('[data-role="lfea-topbar-run-status"]')).toBeVisible();
    const layout = await page.evaluate(() => {
      const box = (element) => {
        const r = element.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          width: r.width, height: r.height, scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth };
      };
      const navigation = document.querySelector('[data-role="application-navigation"]');
      const buttons = [...navigation.querySelectorAll('button')].filter((node) =>
        getComputedStyle(node).display !== 'none');
      return {
        viewport: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        header: box(document.querySelector('.application-navigation-shell')),
        nav: box(navigation),
        source: box(document.querySelector('[data-role="topbar-dataset"]')),
        sourceLabel: box(document.querySelector('[data-role="topbar-dataset-kind"]')),
        runStatus: box(document.querySelector('[data-role="lfea-topbar-run-status"]')),
        authorize: box(document.querySelector('[data-action="authorize-lfea-error-check-limitations"]')),
        navButtons: buttons.map((button) => ({ text: button.textContent.trim(), ...box(button) })),
      };
    });
    expect(layout.navButtons.length).toBeGreaterThanOrEqual(4);
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(391);
    for (const [name, rect] of Object.entries({
      header: layout.header, navigation: layout.nav, source: layout.source,
      sourceLabel: layout.sourceLabel, runStatus: layout.runStatus,
      authorize: layout.authorize,
      ...Object.fromEntries(layout.navButtons.map((button, i) => ['navButton' + i, button])),
    })) {
      expect(rect.width, name + ' has visible width').toBeGreaterThan(0);
      expect(rect.left, name + ' left edge').toBeGreaterThanOrEqual(-1);
      expect(rect.right, name + ' right edge').toBeLessThanOrEqual(391);
      expect(rect.scrollWidth, name + ' content not clipped').toBeLessThanOrEqual(rect.clientWidth + 2);
    }
    for (let i = 0; i < layout.navButtons.length; i += 1) {
      for (let j = i + 1; j < layout.navButtons.length; j += 1) {
        const a = layout.navButtons[i]; const b = layout.navButtons[j];
        const overlaps = a.left < b.right - 1 && b.left < a.right - 1
          && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        expect(overlaps, 'navigation must not overlap: ' + a.text + ' / ' + b.text).toBe(false);
      }
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
