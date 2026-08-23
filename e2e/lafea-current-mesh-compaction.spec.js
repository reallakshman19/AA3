import { expect, test } from '@playwright/test';

test('current retained mesh moves generation controls behind Change mesh disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.3"]').click();
  await workbench.locator('[data-role="lafea-mock"]').click();

  const generate = workbench.locator('[data-role="lafea-generation-generate"]');
  await expect(generate).toBeVisible();
  await expect(generate).toBeEnabled();
  await expect(workbench.locator('[data-role="lafea-generation-disclosure"]')).toHaveCount(0);
  await generate.click();

  await expect.poll(() => page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.3'];
    return {
      custody: stage.analysisMeshCustodyProjection?.state ?? null,
      qualification: stage.retainedAnalysisMeshEvidenceV2?.qualification ?? null,
    };
  })).toEqual({ custody: 'CURRENT_PASS', qualification: 'PASS' });

  const disclosure = workbench.locator('[data-role="lafea-generation-disclosure"]');
  await expect(disclosure).toBeVisible();
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(disclosure.locator('[data-role="lafea-generation-disclosure-summary"]'))
    .toHaveText('Change mesh');

  const retainedSummary = workbench.locator('[data-role="lafea-mesh-workspace-summary"]');
  await expect(retainedSummary).toContainText('T6');
  await expect(retainedSummary).toContainText('30 mm');

  await expect(disclosure.locator('[data-role="lafea-generation-plan"]')).not.toBeVisible();
  await expect(disclosure.locator('[data-role="lafea-generation-generate"]')).not.toBeVisible();
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('[data-role="lafea-generation-plan"]')).toBeVisible();
  await expect(disclosure.locator('[data-role="lafea-generation-generate"]')).toBeVisible();
});
