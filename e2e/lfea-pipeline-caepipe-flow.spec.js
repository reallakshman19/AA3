import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The CAEPIPE flow on a real CAESAR II model: load, pick standard load cases,
 * Analyze, read results. No authority-supplement JSON anywhere in it.
 *
 * This drives the real 96-element BM4 benchmark rather than a fixture written
 * for the occasion -- a trivial model passes whether or not the product works.
 */
const BM4 = readFileSync(
  fileURLToPath(new URL('../benchmarks/LFEA/BM4/InputXML_BM4.repaired.xml', import.meta.url)), 'utf8');

async function openLfeaWithBm4(page) {
  await page.goto('/');
  await page.locator('nav button', { hasText: /^F LFEA$|LFEA$/ }).first().click();
  await page.setInputFiles('[data-role="linear-piping-inputxml-source-file"]', {
    name: 'InputXML_BM4.repaired.xml', mimeType: 'text/xml', buffer: Buffer.from(BM4),
  });
  await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]')).toBeVisible();
}

test('real CAESAR model reaches results with no authority supplement', async ({ page }) => {
  test.slow();
  await openLfeaWithBm4(page);
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();

  // The model's own standard cases, not a raw force form.
  const cases = page.locator('[data-role="lfea-pipeline-case-list"] [data-case-id]');
  await expect(cases).toHaveCount(11);
  for (const label of ['W', 'W+P1', 'W+T1', 'W+P1+T1']) {
    await expect(page.locator('[data-role="lfea-pipeline-case-list"] strong', { hasText: new RegExp(`^${label.replace(/\+/gu, '\\+')}$`) })).toHaveCount(1);
  }
  // The model's seven declared force sets are offered but not selected by
  // default: they are alternative directions, never summed.
  await expect(page.locator('[data-role="lfea-pipeline-case-list"] [data-case-id$="-F1"] input')).not.toBeChecked();

  await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
  await expect(page.locator('[data-role="lfea-pipeline-case-selection-status"]')).toContainText('Requested 4 case(s)');

  await page.locator('[data-action="lfea-pipeline-analyze"]').click();

  // Real results: 97 nodes plus a header row.
  const table = page.locator('[data-role="lfea-pipeline-results-table"]');
  await expect(table.locator('tr')).toHaveCount(98, { timeout: 120000 });
  await expect(page.locator('[data-role="lfea-pipeline-results-cases"] button')).toHaveCount(4);

  // Support loads are real reactions, not placeholders.
  await page.locator('[data-role="lfea-pipeline-results-views"] button', { hasText: 'Support loads' }).click();
  await expect(table.locator('tr')).toHaveCount(31);

  // The accuracy warning that says whether this result is a prediction or an
  // upper bound must be present -- BM4 genuinely trips it.
  await expect(page.locator('[data-role="lfea-pipeline-results-unilateral-warning"]'))
    .toContainText('one-way supports');
});

test('a case the solver could not qualify names the failing check', async ({ page }) => {
  test.slow();
  await openLfeaWithBm4(page);
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();
  await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
  await page.locator('[data-action="lfea-pipeline-analyze"]').click();
  await expect(page.locator('[data-role="lfea-pipeline-results-table"] tr')).toHaveCount(98, { timeout: 120000 });

  // BM4's weight case trips the algebraic residual gate. It must say so, and
  // still show its real solved values, rather than failing opaquely.
  await page.locator('[data-role="lfea-pipeline-results-cases"] button', { hasText: /^W$/ }).click();
  const status = page.locator('[data-role="lfea-pipeline-results-status"]');
  await expect(status).toContainText('did not qualify');
  await expect(status).toContainText('ALGEBRAIC_RESIDUAL_NORMALIZED');
  await expect(page.locator('[data-role="lfea-pipeline-results-table"] tr')).toHaveCount(98);

  // One unqualified case must not withhold element forces from one that solved.
  await page.locator('[data-role="lfea-pipeline-results-cases"] button', { hasText: 'W+P1+T1' }).click();
  await page.locator('[data-role="lfea-pipeline-results-views"] button', { hasText: 'Element forces' }).click();
  await expect(page.locator('[data-role="lfea-pipeline-results-table"] tr').first()).toContainText('Element');
});

test('the layout grid shows the model, read-only, and the continuum page is gone', async ({ page }) => {
  await openLfeaWithBm4(page);
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();

  const layout = page.locator('[data-role="lfea-pipeline-layout-panel"]');
  await expect(page.locator('[data-role="lfea-pipeline-layout-summary"]'))
    .toContainText('96 elements, 97 nodes');
  await expect(layout).not.toHaveAttribute('open', '');
  await page.locator('[data-role="lfea-pipeline-layout-summary"]').click();
  await expect(page.locator('[data-role="lfea-pipeline-layout-table"] tr')).toHaveCount(97);
  await expect(page.locator('[data-role="lfea-pipeline-layout-readonly-note"]')).toContainText('Read-only');

  // The T3/Q4 continuum workbench belongs to LAFEA and must not render here.
  await expect(page.locator('[data-application-view="LFEA"] [data-role="lfea-consumer-root"]')).toHaveCount(0);
});
