import { expect, test } from '@playwright/test';

test('LAFEA.6 presents mesh and solve as not applicable without dead actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await expect(workbench).toBeVisible();
  await workbench.locator('.lafea-workbench__stages [data-stage-id="LAFEA.6"]').click();

  const navigator = workbench.locator('[data-role="lafea-guided-workflow"]');
  await expect(navigator).toBeVisible();
  for (const areaId of ['MESH', 'SOLVE', 'RESULTS']) {
    const area = navigator.locator(`[data-workflow-area="${areaId}"]`);
    await expect(area).toHaveAttribute('data-ui-status', 'NOT_APPLICABLE');
    await expect(area.locator('.lafea-guided-workflow__state')).toHaveText('Not applicable');
  }
  await expect(
    navigator.locator('[data-workflow-area="SOLVE"] .lafea-guided-workflow__technical'),
  ).toHaveCount(0);

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

  // Once a source is loaded, unsupported execution is a terminal stage
  // capability fact, not a mesh/solve gate the engineer can resolve.
  await workbench.locator('[data-role="lafea-mock"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(
    globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.6'].document,
  ))).toBe(true);

  const nextAction = workbench.locator('[data-role="lafea-next-action-banner"]');
  await expect(nextAction).toHaveAttribute('data-intent', 'unsupported');
  await expect(nextAction).toContainText('No qualified analysis route is registered for this stage');
  await expect(nextAction).toContainText('Mesh generation and solve execution are not applicable.');
  await expect(nextAction.locator('.lafea-next-action-banner__button')).toHaveText('Review model inputs');
  await expect(nextAction).not.toContainText('Open mesh controls');
  await expect(nextAction).not.toContainText('Run analysis');

  const overview = workbench.locator('[data-role="lafea-engineering-overview"]');
  await expect(overview).toHaveAttribute('data-execution-supported', 'false');
  await expect(overview.locator('[data-role="lafea-overview-run"]')).toHaveCount(0);
  await expect(overview.locator('[data-role="lafea-overview-run-unavailable"]')).toHaveText(
    'Solve not available',
  );

  const solve = workbench.locator('[data-role="lafea-solve-readiness"]');
  await expect(solve).toHaveAttribute('data-status', 'NOT_APPLICABLE');
  await expect(solve).toHaveAttribute('data-execution-supported', 'false');
  await expect(solve.locator('.lafea-solve-readiness__state')).toHaveText('Solve: Not applicable');
  await expect(solve.locator('[data-role="lafea-solve-readiness-primary"]')).toContainText(
    'No qualified analysis route is registered for this stage.',
  );
  await expect(solve.locator('[data-role="lafea-solve-readiness-evidence"]')).not.toHaveAttribute('open', '');
});
