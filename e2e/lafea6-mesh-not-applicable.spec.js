import { expect, test } from '@playwright/test';

test('LAFEA.6 presents mesh as not applicable without dead mesh controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.6"]').click();

  const mesh = workbench.locator('[data-role="lafea-discretization"]');
  await expect(mesh).toBeVisible();
  await expect(mesh).toHaveAttribute('data-mesh-applicable', 'false');
  await expect(mesh.locator('[data-role="lafea-mesh-workspace-summary"]')).toHaveAttribute(
    'data-mesh-applicable',
    'false',
  );
  await expect(mesh.locator('.lafea-mesh-workspace-summary__state')).toHaveText('Not applicable');
  await expect(mesh).toContainText('This stage does not use an analysis mesh.');

  await expect(mesh.locator('.lafea-mesh-workspace-summary__grid')).toHaveCount(0);
  await expect(mesh.locator('[data-discretization-section="generation"]')).toHaveCount(0);
  await expect(mesh.locator('[data-discretization-section="quality"]')).toHaveCount(0);
  await expect(mesh.locator('[data-discretization-section="actions"]')).toHaveCount(0);
  await expect(mesh.locator('[data-role="lafea-discretization-technical-evidence"]')).toHaveCount(0);
  await expect(mesh.locator('[data-role="lafea-discretization-advance"]')).toHaveCount(0);
});
