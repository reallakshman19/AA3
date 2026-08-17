import { expect, test } from '@playwright/test';

const HOST_URL = '/lafea.html';

test('standalone LAFEA entry boots without combined, LFEA, demo, or generic benchmark authority', async ({ page }) => {
  await page.goto(HOST_URL);

  const appRoot = page.locator('[data-lafea-app-root]');
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(appRoot).toHaveCount(1);
  await expect(workbench).toHaveCount(1);
  await expect(workbench.locator('.lafea-workbench__stages [data-stage-id]')).toHaveCount(6);
  await expect(workbench.locator('[data-lafea-tab="ANALYTICAL_CALC"]')).toHaveCount(1);

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(analytical).toBeVisible();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator('h1')).toContainText('LAFEA.1');
  await expect(workbench.locator('[data-role="lafea-tba-stage"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-import"]')).toBeVisible();
  await expect(workbench.locator('[data-role="lafea-run"]')).toBeVisible();
  await expect(workbench.locator('[data-role="lafea-mock"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-benchmark"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-benchmark-host"]')).toHaveCount(0);

  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.2"]').click();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(workbench.locator('h1')).toContainText('LAFEA.2');
  await expect(workbench.locator('[data-guided-target="viewport"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="discretization"]')).toHaveCount(0);

  await workbench.locator('[data-lafea-tab="ANALYTICAL_CALC"]').click();
  await expect(analytical).toBeVisible();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(analytical.locator('[data-role="lafea-analytical-route-selector"] [data-analytical-route-id]')).toHaveCount(2);

  const authority = await page.evaluate(() => ({
    combinedWorkspacePublished: Object.hasOwn(globalThis, 'AnalysisWorkspace'),
    scripts: [...document.scripts].map((script) => script.getAttribute('src') ?? ''),
  }));
  expect(authority.combinedWorkspacePublished).toBe(false);
  expect(authority.scripts.some((src) => src.includes('/src/main.js'))).toBe(false);
  expect(authority.scripts.some((src) => src.includes('/src/lfea/'))).toBe(false);
});
