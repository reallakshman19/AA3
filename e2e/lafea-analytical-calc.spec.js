import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();
  await expect.poll(() => page.evaluate(
    () => globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null,
  )).toBe('LAFEA');
});

test('LAFEA.2 is TBA and exposes no fake FE or mesh workbench', async ({ page }) => {
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-stage-id="LAFEA.2"]').click();

  await expect(workbench.locator('[data-role="lafea-tba-stage"]')).toBeVisible();
  await expect(workbench.locator('.lafea-workbench__status')).toHaveText('TBA');
  await expect(workbench.locator('h1')).toHaveText('LAFEA.2 — TBA');
  await expect(workbench.locator('[data-role="lafea-tba-stage"]')).toContainText(
    'no finite-element geometry, mesh, element controls, viewport, solver controls, contours, convergence, results, or simulated FE content',
  );

  await expect(workbench.locator('[data-guided-target="viewport"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="discretization"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="numerical-verification"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-run"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-import"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-mock"]')).toHaveCount(0);
});

test('Analytical Calc owns the former LAFEA.2 analytical content without FE chrome', async ({ page }) => {
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-lafea-tab="ANALYTICAL_CALC"]').click();

  await expect(workbench.locator('[data-role="lafea-analytical-calc"]')).toBeVisible();
  await expect(workbench.locator('h1')).toHaveText('Analytical Calc');
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]')).toContainText(
    'This tab is not a finite-element stage and does not create or display an FE mesh.',
  );
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]')).toContainText('Analytical inputs');
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]')).toContainText('Analytical results');
  await expect(workbench.locator('[data-guided-target="viewport"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="discretization"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="numerical-verification"]')).toHaveCount(0);
  await expect(workbench.locator('.lafea-workbench__svg')).toHaveCount(0);

  const state = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(state.activeStageId).toBe('LAFEA.2');
});
