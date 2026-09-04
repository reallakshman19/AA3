import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

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
    if (await errorCheck.locator('[data-action="lfea-error-check-acknowledge-limitation"]').count() > 0) {
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
});

async function acknowledgeAndAuthorize(errorCheck) {
  const acknowledgements = errorCheck.locator('[data-action="lfea-error-check-acknowledge-limitation"]');
  const count = await acknowledgements.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await acknowledgements.nth(index).click();
  }
  await errorCheck.locator('[data-role="lfea-error-check-reviewer"]').fill('A. Engineer');
  await errorCheck.locator('[data-role="lfea-error-check-reason"]').fill('Reviewed and accepted.');
  const authorize = errorCheck.locator('[data-action="authorize-lfea-error-check-limitations"]');
  await expect(authorize).toBeEnabled();
  await authorize.click();
  await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'true', { timeout: 60000 });
}
