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

test('production user can enter a continuum model and generate the retained SVG mesh', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
  await page.goto('/');
  await page.locator('[data-application-nav="LAFEA"]').click();

  const productionView = page.locator('[data-application-view="LAFEA"]');
  await expect(productionView).toBeVisible();
  await productionView.locator('[data-stage-id="LAFEA.3"]').click();

  const workflow = productionView.locator('[data-role="lafea-analysis-workflow-panel"]');
  await expect(workflow).toHaveAttribute('data-stage-id', 'LAFEA.3');
  const form = workflow.locator('[data-role="lafea-left-continuum-form"]');
  await expect(form).toBeVisible();

  await form.locator('[data-role="lafea-left-model-name"]').fill('USER_RECTANGLE');
  await form.locator('[data-role="lafea-left-width"]').fill('160');
  await form.locator('[data-role="lafea-left-height"]').fill('80');
  await form.locator('[data-role="lafea-left-thickness"]').fill('8');
  await form.locator('[data-role="lafea-left-modulus"]').fill('210000');
  await form.locator('[data-role="lafea-left-poisson"]').fill('0.3');
  await form.locator('[data-role="lafea-left-force-x"]').fill('1200');
  await form.locator('[data-role="lafea-left-force-y"]').fill('-300');
  await form.locator('[data-role="lafea-left-create-model"]').click();

  await expect(workflow.locator('[data-role="lafea-left-model-name"]')).toHaveValue('USER_RECTANGLE');
  await expect(productionView.locator('[data-role="lafea-engineering-overview"]')).toContainText('LOADED');
  const viewport = productionView.locator('[data-guided-target="viewport"]');
  await expect.poll(() => viewport.locator('svg [data-element-id]').count()).toBeGreaterThanOrEqual(2);

  await workflow.locator('[data-role="lafea-left-mesh-family"]').selectOption('T6');
  await workflow.locator('[data-role="lafea-left-mesh-target"]').fill('20');
  await workflow.locator('[data-role="lafea-left-generate-mesh"]').click();

  const miniMesh = workflow.locator('[data-role="lafea-left-retained-mesh-svg"]');
  await expect(miniMesh).toBeVisible();
  await expect.poll(() => miniMesh.locator('polygon').count()).toBeGreaterThan(2);
  const meshSection = workflow.locator('[data-role="lafea-left-mesh-settings"]');
  await expect(meshSection).toContainText('CURRENT_PASS');
  await expect(productionView.locator('[data-role="lafea-viewport-mode-panel"]')).toContainText('ELEMENTS · SVG');

  const prepare = workflow.locator('[data-role="lafea-left-prepare"]');
  await expect(prepare).toBeEnabled();
  await prepare.click();
  await expect(workflow.locator('[data-role="lafea-left-run"]')).toBeEnabled();

  const modelSection = workflow.locator('[data-role="lafea-left-model-input"]');
  const inputShot = testInfo.outputPath('lafea-production-model-input.png');
  await modelSection.screenshot({ path: inputShot });
  await testInfo.attach('lafea-production-model-input', { path: inputShot, contentType: 'image/png' });

  const meshSettingsShot = testInfo.outputPath('lafea-production-mesh-settings.png');
  await meshSection.screenshot({ path: meshSettingsShot });
  await testInfo.attach('lafea-production-mesh-settings', { path: meshSettingsShot, contentType: 'image/png' });

  const viewportShot = testInfo.outputPath('lafea-production-svg-mesh.png');
  await viewport.screenshot({ path: viewportShot });
  await testInfo.attach('lafea-production-svg-mesh', { path: viewportShot, contentType: 'image/png' });
});
