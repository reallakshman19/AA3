import { expect, test } from '@playwright/test';

const HOST_URL = '/lafea.html';

test('standalone LAFEA entry boots without combined, LFEA, demo, or generic benchmark authority', async ({ page }) => {
  await page.goto(HOST_URL);

  const appRoot = page.locator('[data-lafea-app-root]');
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(appRoot).toHaveCount(1);
  await expect(workbench).toHaveCount(1);
  await expect(workbench.locator('.lafea-workbench__stages [data-stage-id]')).toHaveCount(6);
  await expect(workbench.locator('.lafea-workbench__status')).toHaveText('TBA');
  await expect(workbench.locator('[data-role="lafea-tba-stage"]')).toBeVisible();
  await expect(workbench.locator('[data-role="lafea-tba-stage"]')).toContainText(
    'no finite-element geometry, mesh, element controls, viewport, solver controls, contours, convergence, results, or simulated FE content',
  );
  await expect(workbench.locator('[data-role="lafea-mock"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-benchmark"]')).toHaveCount(0);
  await expect(workbench.locator('[data-role="lafea-benchmark-host"]')).toHaveCount(0);

  const authority = await page.evaluate(() => ({
    combinedWorkspacePublished: Object.hasOwn(globalThis, 'AnalysisWorkspace'),
    scripts: [...document.scripts].map((script) => script.getAttribute('src') ?? ''),
  }));
  expect(authority.combinedWorkspacePublished).toBe(false);
  expect(authority.scripts.some((src) => src.includes('/src/main.js'))).toBe(false);
  expect(authority.scripts.some((src) => src.includes('/src/lfea/'))).toBe(false);
});
