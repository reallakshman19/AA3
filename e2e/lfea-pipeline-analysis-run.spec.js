import { expect, test } from '@playwright/test';

/**
 * The whole pipeline in one pass: import a model, clear Error check, choose
 * load cases, analyze, and read the Output step -- driven through the real UI
 * against a committed benchmark model.
 *
 * Guards two things no unit check can: that the stepper reports where the
 * session actually is at each stage (it previously rendered six identical
 * buttons regardless), and that the Output step's summary reports governing
 * values from a real solve rather than from fixture rows.
 */
test.setTimeout(180000);

test('imports, authorizes, analyzes, and reports governing values', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'LFEA', exact: true }).click();

  // Nothing loaded: Input is the only step to do.
  const guidance = page.locator('[data-role="lfea-pipeline-guidance"]');
  await expect(guidance).toContainText('Next: Input');
  const step = (stepId) => page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${stepId}"]`);
  await expect(step('LOAD_CASE')).toHaveAttribute('data-step-status', 'BLOCKED');

  await page.locator('input[type="file"][accept*="xml"]').first()
    .setInputFiles('benchmarks/LFEA/BM4/InputXML_BM4.repaired.xml');
  await expect(step('INPUT')).toHaveAttribute('data-step-status', 'COMPLETE', { timeout: 60000 });
  // The same routing in the other direction: an InputXML model owns the host,
  // and the ACCDB panel stays out of it.
  await expect(page.locator('[data-host-group="SOURCE"]')).toHaveAttribute('data-active-source', 'INPUTXML');
  await expect(page.locator('[data-role="lfea-pipeline-accdb-input-panel"]')).toBeHidden();
  // A loaded but unauthorized model: Error check is next, Load case says why
  // it cannot be reached rather than sitting there empty.
  await expect(guidance).toContainText('Next: Error check');
  await expect(step('LOAD_CASE')).toHaveAttribute('data-step-status', 'BLOCKED');
  await expect(step('LOAD_CASE')).toHaveAttribute('title', /Error check/u);

  await page.locator('[data-role="linear-piping-inputxml-reviewer"]').fill('A. Engineer');
  await page.locator('[data-role="linear-piping-inputxml-review-reason"]')
    .fill('Declared approximations reviewed and accepted.');
  await page.locator('[data-action="authorize-linear-piping-inputxml-prefea"]').click();

  await expect(step('ERROR_CHECK')).toHaveAttribute('data-step-status', 'COMPLETE', { timeout: 60000 });
  await expect(guidance).toContainText('Next: Load case');

  await step('LOAD_CASE').click();
  const caseBoxes = page.locator('[data-role="lfea-pipeline-case-checkbox"]');
  expect(await caseBoxes.count()).toBeGreaterThan(0);
  await caseBoxes.first().check();
  await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
  await expect(page.locator('[data-role="lfea-pipeline-case-selection-status"]')).toContainText('case(s)');
  await page.locator('[data-action="lfea-pipeline-analyze"]').click();

  // Output: governing values first, then the table they came from.
  const summary = page.locator('[data-role="lfea-pipeline-results-summary"]');
  await expect(summary).toBeVisible({ timeout: 120000 });
  await expect(summary).toContainText('Max displacement');
  await expect(summary).toContainText('@ node');
  await expect(summary).toContainText('Max support force');

  const table = page.locator('[data-role="lfea-pipeline-results-table"]');
  await expect(table).toBeVisible();
  const rowCount = await page.locator('[data-role="lfea-pipeline-results-table"] tr[data-node-id]').count();
  expect(rowCount).toBeGreaterThan(1);
  // The row the summary points at is marked, so it need not be hunted for.
  expect(await page.locator('[data-role="lfea-pipeline-results-table"] tr[data-extreme="true"]').count())
    .toBeGreaterThan(0);

  // Sorting is real: ordering by resultant descending puts the largest first,
  // and that row is one the summary named.
  await page.locator('[data-role="lfea-pipeline-results-sort"][data-column-key="translationResultant"]').click();
  await expect(table).toHaveAttribute('data-sort-column', 'translationResultant');
  await expect(table).toHaveAttribute('data-sort-direction', 'DESC');
  const firstRow = page.locator('[data-role="lfea-pipeline-results-table"] tr[data-node-id]').first();
  await expect(firstRow).toHaveAttribute('data-extreme', 'true');

  // Filtering narrows the table to matching nodes.
  const topNodeId = await firstRow.getAttribute('data-node-id');
  await page.locator('[data-role="lfea-pipeline-results-filter"]').fill(topNodeId);
  await expect(page.locator(`[data-role="lfea-pipeline-results-table"] tr[data-node-id="${topNodeId}"]`)).toBeVisible();
  const filtered = await page.locator('[data-role="lfea-pipeline-results-table"] tr[data-node-id]').count();
  expect(filtered).toBeLessThan(rowCount);

  expect(pageErrors).toEqual([]);
});
