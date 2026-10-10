import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixture = fileURLToPath(new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url));
const storageKey = 'aa3.lfea.caseSelection.v1';
const step = (page, id) => page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${id}"]`);

test.describe('LFEA persistent case preferences and no-op Apply', () => {
  test.setTimeout(300000);
  test.skip(!fs.existsSync(fixture), 'Real tracked BM4_L.ACCDB is required.');

  async function importModel(page) {
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-bend-factor-edition"]')
      .selectOption('B31_3_2022_B31J_2017');
    await page.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('YES');
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixture);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
  }

  async function authorize(page) {
    await step(page, 'ERROR_CHECK').click();
    const check = page.locator('[data-role="lfea-common-error-check-panel"]');
    if (await check.getAttribute('data-solve-authorized') === 'true') return;
    const summary = check.locator(
      '[data-role="lfea-common-error-check-finding-group"][data-disposition="CONDITIONAL"] summary',
    );
    const count = await summary.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      await summary.nth(index).click();
      await expect(check.locator('#lfea-error-check-progress')).toHaveJSProperty('value', index + 1);
    }
    await check.locator('[data-role="lfea-error-check-accept-limitations"]').check();
    await check.locator('[data-role="lfea-error-check-reviewer"]').fill('A. Engineer');
    await check.locator('[data-role="lfea-error-check-reason"]').fill('Reviewed this exact current preparation.');
    await check.locator('[data-action="authorize-lfea-error-check-limitations"]').click();
    await expect(check).toHaveAttribute('data-solve-authorized', 'true', { timeout: 60000 });
  }

  test('repeated Apply and in-app navigation preserve the exact authorized pre-flight', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await importModel(page);
    await authorize(page);
    await step(page, 'LOAD_CASE').click();
    await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
    await authorize(page); // Actual case changes must still be explicitly reviewed.
    const before = await page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      return { semanticHash: p.semanticHash, authorization: p.authorization?.semanticHash, solveAuthorized: p.solveAuthorized };
    });
    expect(before.solveAuthorized).toBe(true);
    expect(before.authorization).toBeTruthy();
    await step(page, 'LOAD_CASE').click();
    await page.locator('[data-action="lfea-pipeline-apply-cases"]').click();
    await expect(page.locator('[data-role="lfea-pipeline-case-selection-status"]')).toContainText('unchanged');
    const after = await page.evaluate(() => {
      const p = globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight;
      return { semanticHash: p.semanticHash, authorization: p.authorization?.semanticHash, solveAuthorized: p.solveAuthorized };
    });
    expect(after).toEqual(before);
    await step(page, 'ERROR_CHECK').click();
    await expect(page.locator('[data-role="lfea-common-error-check-panel"]'))
      .toHaveAttribute('data-solve-authorized', 'true');
    await expect(step(page, 'RUN')).toBeEnabled();
    expect(pageErrors).toEqual([]);
  });

  test('saved checkbox draft is restored only for matching source; never restores authorization', async ({ page }) => {
    await importModel(page);
    await authorize(page);
    await step(page, 'LOAD_CASE').click();
    const checkbox = page.locator('[data-role="lfea-pipeline-case-checkbox"]').first();
    await checkbox.uncheck();
    const expected = await page.evaluate(() => globalThis.AnalysisWorkspace.getLfeaCaseSelectionState().selectedCaseIds);
    expect(expected.length).toBeGreaterThan(0);
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    expect(stored.selectedCaseIds).toEqual([...expected].sort());
    expect(Object.keys(stored).sort()).toEqual(['schema', 'selectedCaseIds', 'sourceSemanticHash']);
    expect(JSON.stringify(stored)).not.toMatch(/approv|authoriz|review|preflight/iu);

    await importModel(page); // Reloads a new browser document and explicitly re-imports the file.
    const restored = await page.evaluate(async () => {
      await globalThis.AnalysisWorkspace.whenLfeaAnalysisSurfaceReady();
      return globalThis.AnalysisWorkspace.getLfeaCaseSelectionState().selectedCaseIds;
    });
    expect(restored).toEqual(expected);
    const preFlight = await page.evaluate(() =>
      globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().preparation.preFlight);
    expect(preFlight.solveAuthorized).toBe(false);
    await expect(step(page, 'RUN')).toHaveAttribute('data-step-status', 'BLOCKED');
  });
});
