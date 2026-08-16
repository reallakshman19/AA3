import { expect, test } from '@playwright/test';

const LAFEA_STAGE_TABS_WITH_DEMO_SOURCE = ['LAFEA.3', 'LAFEA.4', 'LAFEA.5', 'LAFEA.6'];
const ANALYTICAL_ROUTES = ['LAFEA.1', 'LAFEA.2'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
});

test('every Advanced tab loads deterministic [SIMULATED] input through its UI', async ({ page }) => {
  await page.getByRole('button', { name: '[SIMULATED] Load Mock Data', exact: true }).click();
  await expect.poll(() => page.evaluate(() => AnalysisWorkspace.getSnapshot().status)).toBe('ready');
  expect(await page.evaluate(() => AnalysisWorkspace.getSnapshot().dataset.summary)).toMatchObject({
    pipes: 2,
    supports: 2,
  });

  await page.locator('[data-application-nav="LOAD_CALC"]').click();
  const loadCalc = page.locator('[data-role="load-calc-consumer"]');
  await expect(loadCalc).toContainText('EMPTY');
  await loadCalc.locator('[data-load-calc-action="load-mock-data"]').click();
  await expect.poll(() => page.evaluate(
    () => AnalysisWorkspace.getApplicationViewState().activeViewId,
  )).toBe('WORKSPACE');
  await page.locator('[data-application-nav="LOAD_CALC"]').click();
  await expect(loadCalc).toContainText('SIMULATED-ADVANCED-WORKSPACE-V1');

  await page.locator('[data-application-nav="LAFEA"]').click();
  for (const stageId of LAFEA_STAGE_TABS_WITH_DEMO_SOURCE) {
    await page.locator(`.lafea-workbench__stages [data-stage-id="${stageId}"]`).click();
    await page.locator('[data-role="lafea-mock"]').click();
    await expect(page.locator('.lafea-workbench__status')).toHaveText('READY');
    const stage = await page.evaluate((id) => AnalysisWorkspace.getLafeaWorkbenchState().stages[id], stageId);
    expect(stage.document).not.toBeNull();
    expect(stage.execution).toBeNull();

    if (stageId === 'LAFEA.4') {
      expect(stage.domainFirstProfileActive).toBe(false);
      expect(stage.shellMidsurfaceProfileActive).toBe(true);
      expect(stage.document.modelIdentity).toBe('CYLINDRICAL_PIPE_SHELL_BENCHMARK');
      expect(stage.document.nodes).toHaveLength(26);
      expect(stage.document.elements).toHaveLength(24);
      expect(stage.retainedShellMidsurfaceEvidence).toMatchObject({
        stageId: 'LAFEA.4',
        qualification: 'PASS',
        geometry: {
          surface: { kind: 'CYLINDER', radius: 100 },
        },
      });
    }

    if (stageId === 'LAFEA.5') {
      expect(stage.domainFirstProfileActive).toBe(false);
      expect(stage.shellMidsurfaceProfileActive).toBe(false);
      expect(stage.document.workflowIdentity).toBe('TRUNNION-WORKFLOW-1');
      expect(stage.document.shellTemplate.nodes).toHaveLength(24);
      expect(stage.document.shellTemplate.elements).toHaveLength(24);
      expect(stage.retainedShellMidsurfaceEvidence).toBeNull();
    }
  }

  for (const stageId of ANALYTICAL_ROUTES) {
    await page.locator(`.lafea-workbench__stages [data-stage-id="${stageId}"]`).click();
    await expect(page.locator('[data-role="lafea-tba-stage"]')).toBeVisible();
    await expect(page.locator('.lafea-workbench__status')).toHaveText('TBA');
    await expect(page.locator('[data-role="lafea-mock"]')).toHaveCount(0);
  }

  await page.locator('[data-lafea-tab="ANALYTICAL_CALC"]').click();
  for (const stageId of ANALYTICAL_ROUTES) {
    await page.locator(`[data-analytical-route-id="${stageId}"]`).click();
    await page.locator('[data-role="lafea-mock"]').click();
    await expect(page.locator('.lafea-workbench__status')).toHaveText('READY');
    await expect(page.locator('[data-role="lafea-analytical-calc"]')).toHaveAttribute(
      'data-backing-stage-id',
      stageId,
    );
    const analyticalStage = await page.evaluate(
      (id) => AnalysisWorkspace.getLafeaWorkbenchState().stages[id],
      stageId,
    );
    expect(analyticalStage.document).not.toBeNull();
    expect(analyticalStage.execution).toBeNull();
  }

  await page.locator('[data-application-nav="LFEA"]').click();
  await page.locator('[data-role="lfea-mock"]').click();
  await expect(page.locator('.lfea-workbench__status')).toHaveText('READY');
  const collectionSelect = page.locator('.lfea-workbench__records select');
  const collectionPaths = await collectionSelect.locator('option').evaluateAll(
    (options) => options.map((option) => option.value),
  );
  for (const collectionPath of collectionPaths) {
    await collectionSelect.selectOption(collectionPath);
    await page.locator('[data-role="lfea-collection-mock"]').click();
    const state = await page.evaluate(() => AnalysisWorkspace.getLfeaWorkbenchState());
    expect(state.packageValue.schema).toBe('lfea-mesh-package/v1');
    expect(state.execution).toBeNull();
  }
});
