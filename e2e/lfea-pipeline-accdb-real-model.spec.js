import fs from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Import a real CAESAR II .ACCDB through the actual UI and assert the verdict.
 *
 * No .accdb binary is committed to this repo, so the file is supplied by
 * path: set LFEA_ACCDB_FIXTURE (and optionally LFEA_ACCDB_ELEMENTS /
 * LFEA_ACCDB_NODES for the expected counts) to run it. Without that the spec
 * skips rather than fabricating a database binary or silently passing.
 *
 * Developed against BM4_L.ACCDB (96 elements, 97 nodes), which is what
 * exposed both real defects in this path: a density unit label the adapter
 * rejected, and a closure tolerance that ignored the single-precision
 * coordinates CAESAR actually stores.
 */
const fixturePath = process.env.LFEA_ACCDB_FIXTURE ?? '';
const expectedElements = process.env.LFEA_ACCDB_ELEMENTS ?? '';
const expectedNodes = process.env.LFEA_ACCDB_NODES ?? '';

test.describe('LFEA ACCDB real-model import', () => {
  test.skip(
    fixturePath === '' || !fs.existsSync(fixturePath),
    'Set LFEA_ACCDB_FIXTURE to a real CAESAR II .ACCDB to run this spec.',
  );

  test('imports a real ACCDB and reports a scoped, grouped verdict', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();

    const panel = page.locator('[data-role="lfea-pipeline-accdb-input-panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-model-health-status', 'NOT_LOADED');

    // With nothing loaded, Input is the only step to do.
    const guidance = page.locator('[data-role="lfea-pipeline-guidance"]');
    await expect(guidance).toContainText('Next: Input');

    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);

    const status = page.locator('[data-role="lfea-pipeline-accdb-status"]');
    await expect(status).toContainText('element(s)', { timeout: 60000 });
    await expect(status).not.toContainText('failed');
    await expect(panel.locator('[data-role="lfea-pipeline-accdb-error"]')).toBeHidden();

    if (expectedElements !== '') await expect(status).toContainText(`${expectedElements} element(s)`);
    if (expectedNodes !== '') await expect(status).toContainText(`${expectedNodes} node(s)`);

    // Source acceptance is the capability the density-label defect blocked;
    // it must now pass on a real file.
    const sourceRow = panel.locator('[data-role="lfea-pipeline-accdb-capabilities"] tr').first();
    await expect(sourceRow).toContainText('SOURCE_ACCEPTANCE');
    await expect(sourceRow).toHaveAttribute('data-status', 'PASS');

    // The verdict is read through the selected profile, and findings arrive
    // grouped into sections rather than one flat per-element list.
    await expect(panel).toHaveAttribute('data-requested-profile', 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1');
    const sections = panel.locator('[data-role="lfea-pipeline-accdb-finding-section"]');
    expect(await sections.count()).toBeGreaterThan(0);
    const groupRows = panel.locator('[data-role="lfea-pipeline-accdb-finding-groups"] > li');
    const groupCount = await groupRows.count();
    expect(groupCount).toBeGreaterThan(0);
    // Grouping is the point: far fewer rows than occurrences.
    const occurrenceTotal = await groupRows.evaluateAll(
      (rows) => rows.reduce((total, row) => total + Number(row.dataset.count ?? 0), 0),
    );
    expect(occurrenceTotal).toBeGreaterThan(groupCount);

    // Switching to the strict profile must block on strictly more.
    const blockingFor = () => panel
      .locator('[data-role="lfea-pipeline-accdb-finding-groups"] > li[data-severity="error"]')
      .evaluateAll((rows) => rows.reduce((total, row) => total + Number(row.dataset.count ?? 0), 0));
    const approximateBlocking = await blockingFor();
    await page.locator('[data-role="lfea-pipeline-accdb-profile"]')
      .selectOption('STRICT_INPUTXML_LINEAR_STATIC_V1');
    await expect(panel).toHaveAttribute('data-requested-profile', 'STRICT_INPUTXML_LINEAR_STATIC_V1');
    expect(await blockingFor()).toBeGreaterThan(approximateBlocking);

    // The property table is real: it lists the imported values per element.
    await page.locator('[data-action="toggle-lfea-pipeline-accdb-properties"]').click();
    const propertyRows = panel.locator('[data-role="lfea-pipeline-accdb-element-properties"] tr');
    expect(await propertyRows.count()).toBeGreaterThan(1);
    expect(await panel.locator('[data-role="accdb-override-input"]').count()).toBeGreaterThan(0);

    // The stepper says where the session got to and what blocks it. BM4_L
    // carries 7 real collinear-overlap findings, so its pre-flight fails
    // closed and Load case names that rather than sitting there empty --
    // the ACCDB source itself now reaches the pre-flight the step runs from.
    await expect(guidance).toContainText('complete.');
    const loadCaseStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]');
    await expect(loadCaseStep).toHaveAttribute('data-step-status', 'BLOCKED');
    await expect(loadCaseStep).toHaveAttribute('title', /pre-flight/iu);

    expect(pageErrors).toEqual([]);
  });
});
