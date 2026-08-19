import { expect, test } from '@playwright/test';

test('EMP.1.A production Run retains qualified execution and renders transferred-force evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const productionView = page.locator('[data-application-view="LAFEA"]');
  const workbench = productionView.locator('[data-role="lafea-workbench"]');
  const product = workbench.locator(':scope > [data-lafea-slot="navigation"] [data-product-id="EMP.1"]');
  await expect(product).toBeVisible();
  await product.click();

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.1');

  const mock = workbench.locator('[data-role="lafea-mock"]');
  if (await mock.isVisible()) await mock.click();

  const run = workbench.locator('[data-role="lafea-run"]');
  await expect(run).toBeEnabled();

  const before = await snapshotEmp1A(page);
  expect(before.activeStageId).toBe('LAFEA.1');
  expect(before.executionStatus).toBeNull();
  expect(before.hasResult).toBe(false);

  await run.click();

  const after = await snapshotEmp1A(page);
  console.log(JSON.stringify({
    schema: 'emp1-a-production-run-state-probe/v1',
    before,
    after,
  }, null, 2));

  expect(after.activeStageId).toBe('LAFEA.1');
  expect(after.lifecycleBindingStatus).toBe('CURRENT');
  expect(after.executionStatus).toBe('QUALIFIED');
  expect(after.hasResult).toBe(true);

  const highlights = analytical.locator('[data-role="lafea-result-highlights"]');
  await expect(highlights).toBeVisible();
  await expect(highlights).toContainText('Max |transferred force|');
});

async function snapshotEmp1A(page) {
  return page.evaluate(() => {
    const state = globalThis.AnalysisWorkspace?.getLafeaWorkbenchState?.();
    const stage = state?.stages?.['LAFEA.1'];
    return {
      activeStageId: state?.activeStageId ?? null,
      stateStatus: state?.status ?? null,
      lifecycleBindingStatus: stage?.lifecycleBinding?.status ?? null,
      lifecycleProfileId: stage?.lifecycle?.profileId ?? null,
      executionStatus: stage?.execution?.status ?? null,
      hasResult: Boolean(stage?.execution?.result),
      resultSchema: stage?.execution?.result?.schema ?? null,
      diagnostics: Array.isArray(state?.diagnostics)
        ? state.diagnostics.map((row) => row?.code ?? row?.message ?? String(row))
        : [],
    };
  });
}

async function openProductionLafea(page) {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  const nav = page.locator('[data-application-nav="LAFEA"]');
  await expect(nav).toBeVisible();
  await nav.click();
  await expect.poll(() => page.evaluate(
    () => globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null,
  )).toBe('LAFEA');
}
