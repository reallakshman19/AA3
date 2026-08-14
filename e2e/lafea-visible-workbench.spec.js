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
  await expect(overview).toContainText('CURRENT_PASS');
  await expect(overview).toContainText('T3_T6_Q8_LINEAR_CONTINUUM');
  await expect(overview).toContainText('54 / 54 PASS');

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
  await expect(results).toContainText('Engineering result summary');
  await expect(results).toContainText('Max displacement');
  await expect(results).toContainText('Max von Mises');
  await expect(results).toContainText('Total strain energy');
  await expect(results).toContainText('integration-point stress is authoritative');

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

  // Bounded viewport captures are deliberate: fullPage produced an extremely tall
  // image that was unreadable when rendered as a chat/file preview.
  await overview.scrollIntoViewIfNeeded();
  const topScreenshotPath = testInfo.outputPath('lafea-visible-workbench-top.png');
  await page.screenshot({ path: topScreenshotPath, fullPage: false });
  await testInfo.attach('lafea-visible-workbench-top', { path: topScreenshotPath, contentType: 'image/png' });

  await results.scrollIntoViewIfNeeded();
  const resultScreenshotPath = testInfo.outputPath('lafea-visible-workbench-results.png');
  await page.screenshot({ path: resultScreenshotPath, fullPage: false });
  await testInfo.attach('lafea-visible-workbench-results', { path: resultScreenshotPath, contentType: 'image/png' });
});

test('production application LAFEA tab mounts the engineering workbench', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
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

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
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
