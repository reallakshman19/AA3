import { expect, test } from '@playwright/test';
import { destroyStage17, mountStage17 } from './helpers/lafea-stage17-playwright.js';

test.afterEach(async ({ page }) => destroyStage17(page));

test('LAFEA.3 visibly presents governed model mesh solver and computed results', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const initial = await mountStage17(page, { buildSha: 'cccccccccccccccccccccccccccccccccccccccc', targetElementLength: 25 });
  expect(initial.meshState).toBe('CURRENT_PASS');

  const workbench = page.locator('[data-role="lafea-workbench"]');
  const overview = workbench.locator('[data-role="lafea-engineering-overview"]');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('Model → mesh → solve → results');
  const summary = overview.locator('[data-role="lafea-engineering-summary"]');
  await expect(summary).toContainText('Qualified');
  await expect(summary).toContainText('Linear continuum solver');
  await expect(summary).not.toContainText('CURRENT_PASS');
  await expect(summary).not.toContainText('T3_T6_Q8_LINEAR_CONTINUUM');
  const technical = overview.locator('[data-role="lafea-technical-evidence"]').first();
  await expect(technical).toContainText('CURRENT_PASS');
  await expect(technical).toContainText('T3_T6_Q8_LINEAR_CONTINUUM');
  await expect(technical).toContainText('Qualification profile ID');

  const mesh = workbench.locator('[data-role="lafea-mesh-workspace-summary"]');
  await expect(mesh).toBeVisible();
  await expect(mesh).toContainText('T6');
  await expect(mesh).toContainText('25 mm');

  const viewportModes = workbench.locator('[data-role="lafea-viewport-mode-panel"]');
  await expect(viewportModes).toContainText('Geometry');
  await expect(viewportModes).toContainText('Mesh');
  await expect(viewportModes).toContainText('Result contour');

  await expect(workbench.locator('[data-role="lafea-result-empty"]')).toBeVisible();
  await expect(workbench.locator('[data-role="lafea-overview-run"]')).toBeDisabled();

  const preflight = await page.evaluate(() => globalThis.__A17__.controller.store.prepareContinuumForRun().projection?.state ?? null);
  expect(preflight).toBe('CURRENT_PASS');
  await expect(workbench.locator('[data-role="lafea-overview-run"]')).toBeEnabled();
  await workbench.locator('[data-role="lafea-overview-run"]').click();

  await expect(overview).toHaveAttribute('data-execution-status', 'QUALIFIED');
  const results = workbench.locator('[data-guided-target="results"]');
  const resultHighlights = results.locator('[data-role="lafea-result-highlights"]');
  await expect(resultHighlights).toBeVisible();
  await expect(resultHighlights).toContainText('Engineering result summary');
  await expect(resultHighlights).toContainText('Max displacement');
  await expect(resultHighlights).toContainText('Max von Mises');
  await expect(resultHighlights).toContainText('Total strain energy');
  await expect(resultHighlights).toContainText('integration-point stress is authoritative');

  const retained = await page.evaluate(() => {
    const result = globalThis.__A17__.controller.getState().stages['LAFEA.3'].execution?.result;
    const loadCases = result?.loadCaseResults ?? [];
    return {
      qualification: result?.qualification?.state ?? null,
      loadCases: loadCases.length,
      energy: loadCases.every((row) => Number.isFinite(row.totalStrainEnergy)),
      displacement: loadCases.every((row) => Array.isArray(row.nodalDisplacements) && row.nodalDisplacements.length > 0),
    };
  });
  expect(retained).toEqual({ qualification: 'ACCEPTED', loadCases: 2, energy: true, displacement: true });

  await overview.scrollIntoViewIfNeeded();
  const topScreenshotPath = testInfo.outputPath('lafea-visible-workbench-top.png');
  await page.screenshot({ path: topScreenshotPath, fullPage: false });
  await testInfo.attach('lafea-visible-workbench-top', { path: topScreenshotPath, contentType: 'image/png' });

  const resultScreenshotPath = testInfo.outputPath('lafea-visible-workbench-results.png');
  await resultHighlights.screenshot({ path: resultScreenshotPath });
  await testInfo.attach('lafea-visible-workbench-results', { path: resultScreenshotPath, contentType: 'image/png' });
});

test('production application LAFEA.3 stage mounts the engineering workbench', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
  await productionView.locator('.lafea-workbench__stages [data-stage-id="LAFEA.3"]').click();
  const overview = productionView.locator('[data-role="lafea-engineering-overview"]');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('Model → mesh → solve → results');
  await expect(productionView.locator('[data-guided-target="source"]')).toContainText('Model inputs');
  await expect(productionView.locator('[data-guided-target="profile"]')).toContainText('Solver and analysis settings');
  await expect(productionView.locator('[data-guided-target="viewport"]')).toContainText('Engineering viewport');
  await expect(productionView.locator('[data-guided-target="discretization"]')).toContainText('Meshing and discretization');
  await expect(productionView.locator('[data-guided-target="results"]')).toContainText('Analysis results');

  await overview.scrollIntoViewIfNeeded();
  const screenshotPath = testInfo.outputPath('lafea-production-tab.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('lafea-production-tab', { path: screenshotPath, contentType: 'image/png' });
});

test('production LAFEA.1 and LAFEA.2 are first-class analytical stages', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const workbench = page.locator('[data-role="lafea-workbench"]');
  for (const stageId of ['LAFEA.1', 'LAFEA.2']) {
    const stageButton = workbench.locator(`.lafea-workbench__stages [data-stage-id="${stageId}"]`);
    await expect(stageButton).toBeVisible();
    await expect(stageButton).toHaveAttribute('data-method', 'ANALYTICAL');
    await stageButton.click();

    const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
    await expect(analytical).toBeVisible();
    await expect(analytical).toHaveAttribute('data-backing-stage-id', stageId);
    await expect(workbench.locator('h1')).toContainText(stageId);
    await expect(workbench.locator('[data-role="lafea-tba-stage"]')).toHaveCount(0);
    await expect(workbench.locator('[data-role="lafea-run"]')).toBeVisible();
    await expect(workbench.locator('[data-role="lafea-import"]')).toBeVisible();
    await expect(workbench.locator('[data-role="lafea-mock"]')).toBeVisible();
    await expect(workbench.locator('[data-guided-target="viewport"]')).toHaveCount(0);
    await expect(workbench.locator('[data-guided-target="discretization"]')).toHaveCount(0);

    await workbench.locator('[data-role="lafea-mock"]').click();
    await expect(workbench.locator('.lafea-workbench__status')).toHaveText('READY');
    const source = analytical.locator('[data-guided-target="source"]');
    await expect(source).toContainText('Governed stage-specific inputs');
    if (stageId === 'LAFEA.1') {
      await expect(source).toContainText('Load force X');
      await expect(source).toContainText('Load force Y');
      await expect(source).toContainText('Load force Z');
      await expect(source).toContainText('Load moment X');
      await expect(source).toContainText('Load moment Y');
      await expect(source).toContainText('Load moment Z');
    } else {
      const custody = analytical.locator('[data-role="lafea-screening-load-custody"]');
      await expect(custody).toBeVisible();
      await expect(custody).toContainText('Retained transformed resultants');
      await expect(custody).toContainText('screeningCaseId + loadCaseId');
      const factor = custody.locator(
        '[data-role="lafea-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
      );
      await expect(factor).toHaveValue('-0.5');
      await factor.fill('0.25');
      await custody.locator(
        '[data-role="lafea-apply-screening-term-factor"][data-screening-case-id="CASE-B"][data-load-case-id="LC-A"]',
      ).click();
      await expect(workbench.locator('.lafea-workbench__status')).toHaveText('READY');
      const editedFactor = await page.evaluate(() => globalThis.AnalysisWorkspace
        .getLafeaWorkbenchState().stages['LAFEA.2'].document.screeningCases
        .find((row) => row.screeningCaseId === 'CASE-B').mechanicalTerms
        .find((row) => row.loadCaseId === 'LC-A').factor);
      expect(editedFactor).toBe(0.25);
    }

    const stageBeforeRun = await page.evaluate(
      (id) => globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[id],
      stageId,
    );
    expect(stageBeforeRun.document).not.toBeNull();
    expect(stageBeforeRun.execution).toBeNull();

    const run = workbench.locator('[data-role="lafea-run"]');
    await expect(run).toBeEnabled();
    await run.click();
    const highlights = analytical.locator('[data-role="lafea-result-highlights"]');
    await expect(highlights).toBeVisible();
    await expect(highlights).toContainText('Engineering result summary');
    if (stageId === 'LAFEA.1') {
      await expect(highlights).toContainText('Max |transferred force|');
      await expect(highlights).toContainText('Max |transferred moment|');
      await expect(highlights).toContainText('Max |hoop pressure stress|');
    } else {
      await expect(highlights).toContainText('Governing nominal von Mises');
      await expect(highlights.locator('[data-role="lafea-transverse-load-warning"]')).toContainText(
        'LOCAL TRANSVERSE LOAD NOT RECOVERED',
      );
      const caseB = await page.evaluate(() => globalThis.AnalysisWorkspace
        .getLafeaWorkbenchState().stages['LAFEA.2'].execution.result.screeningCases
        .find((row) => row.screeningCaseId === 'CASE-B'));
      expect(caseB.combinedForceLocal).toEqual([-750, -25, 137.5]);
      expect(caseB.combinedMomentLocal).toEqual([-2750, -5000, 27500]);
    }
    const stageAfterRun = await page.evaluate(
      (id) => globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages[id],
      stageId,
    );
    expect(stageAfterRun.execution?.status).toBe('QUALIFIED');
  }

  const screenshotPath = testInfo.outputPath('lafea-analytical-stages.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('lafea-analytical-stages', { path: screenshotPath, contentType: 'image/png' });
});

test('Analytical Calc compatibility selector routes to the same LAFEA.1 and LAFEA.2 stages', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProductionLafea(page);

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-lafea-tab="ANALYTICAL_CALC"]').click();

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(analytical).toBeVisible();
  await expect(workbench.locator('h1')).toContainText('LAFEA.1');
  await expect(analytical).toContainText('Analytical inputs');
  await expect(analytical).toContainText('Analytical results');
  await expect(workbench).toContainText('FE mesh: NOT APPLICABLE');
  await expect(workbench.locator('[data-guided-target="viewport"]')).toHaveCount(0);
  await expect(workbench.locator('[data-guided-target="discretization"]')).toHaveCount(0);
  await expect(workbench.locator('.lafea-workbench__svg')).toHaveCount(0);

  const routeSelector = analytical.locator('[data-role="lafea-analytical-route-selector"]');
  await expect(routeSelector.locator('[data-analytical-route-id="LAFEA.1"]')).toBeVisible();
  await expect(routeSelector.locator('[data-analytical-route-id="LAFEA.2"]')).toBeVisible();
  let state = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(state.activeStageId).toBe('LAFEA.1');

  await routeSelector.locator('[data-analytical-route-id="LAFEA.2"]').click();
  await expect(analytical).toHaveAttribute('data-backing-stage-id', 'LAFEA.2');
  await expect(workbench.locator('h1')).toContainText('LAFEA.2');
  await expect(analytical).toContainText('nominal pipe-section analytical/screening calculation');
  state = await page.evaluate(() => globalThis.AnalysisWorkspace.getLafeaWorkbenchState());
  expect(state.activeStageId).toBe('LAFEA.2');

  const screenshotPath = testInfo.outputPath('analytical-calc.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await testInfo.attach('analytical-calc', { path: screenshotPath, contentType: 'image/png' });
});

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
