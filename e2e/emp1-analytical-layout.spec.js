import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_ANALYTICAL_LAYOUT__?.controller?.destroy?.();
  delete globalThis.__EMP1_ANALYTICAL_LAYOUT__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('EMP.1 analytical layout preserves one surface instance, task navigation and responsive hierarchy', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1058 });
  await mountEmp1Workbench(page);

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();
  const workflow = workbench.locator('[data-role="emp1-workflow"]');
  await expect(workflow.locator('[data-role="emp1-professional-authority-summary"]'))
    .toContainText('LOCAL RESULT CURRENT');

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await assertUniqueLayoutSurfaceManifest(analytical);
  await assertEngineerFacingCardinality(analytical);

  const primary = analytical.locator('[data-role="emp1-analytical-primary-work"]');
  const basis = analytical.locator('[data-role="emp1-analytical-engineering-basis"]');
  const detail = analytical.locator('[data-role="emp1-analytical-full-width-detail"]');
  const lanes = analytical.locator('[data-role="emp1-analytical-layout-lanes"]');
  await expect(primary).toHaveCount(1);
  await expect(basis).toHaveCount(1);
  await expect(detail).toHaveCount(1);
  await expect(lanes).toHaveCount(1);

  const desktopGeometry = await regionGeometry(analytical);
  expect(desktopGeometry.primary.width).toBeGreaterThan(0);
  expect(desktopGeometry.basis.width).toBeGreaterThan(0);
  expect(desktopGeometry.primary.right).toBeLessThanOrEqual(desktopGeometry.basis.left + 1);
  expect(Math.abs(desktopGeometry.primary.top - desktopGeometry.basis.top)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.detail.width).toBeGreaterThanOrEqual(desktopGeometry.lanes.width - 1);
  expect(desktopGeometry.pageScrollWidth).toBeLessThanOrEqual(desktopGeometry.viewportWidth + 1);

  const desktopManifest = await liveManifest(analytical);

  await professionalStep(workflow, 4, 'Load Transfer').click();
  await expect(workbench.locator('[data-role="lafea-analytical-calc"]'))
    .toHaveAttribute('data-backing-stage-id', 'LAFEA.1');
  await expect(workbench.locator('[data-guided-target="results"]')).toBeInViewport();
  await expect(workbench.locator('[data-guided-target="results"]')).toHaveCount(1);

  const refreshedWorkflow = workbench.locator('[data-role="emp1-workflow"]');
  await professionalStep(refreshedWorkflow, 6, 'Local Correlation').click();
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]')).toBeInViewport();
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]')).toHaveCount(1);

  await professionalStep(workbench.locator('[data-role="emp1-workflow"]'), 7, 'Review & Evidence').click();
  const reviewCandidates = workbench.locator(
    '[data-role="emp1-engineering-review-panel"], [data-role="emp1-product-execution-summary"], [data-role="emp1-benchmark-evidence-panel"]',
  );
  await expect(reviewCandidates.first()).toBeInViewport();

  await page.setViewportSize({ width: 720, height: 900 });
  const narrowAnalytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  await expect(narrowAnalytical).toBeVisible();
  const narrowGeometry = await regionGeometry(narrowAnalytical);
  expect(Math.abs(narrowGeometry.primary.left - narrowGeometry.basis.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(narrowGeometry.primary.width - narrowGeometry.basis.width)).toBeLessThanOrEqual(1);
  expect(narrowGeometry.basis.top).toBeGreaterThanOrEqual(narrowGeometry.primary.bottom - 1);
  expect(narrowGeometry.pageScrollWidth).toBeLessThanOrEqual(narrowGeometry.viewportWidth + 1);

  await assertUniqueLayoutSurfaceManifest(narrowAnalytical);
  await assertEngineerFacingCardinality(narrowAnalytical);
  const narrowManifest = await liveManifest(narrowAnalytical);
  expect(narrowManifest.roles).toEqual(desktopManifest.roles);
  expect(narrowManifest.guidedTargets).toEqual(desktopManifest.guidedTargets);

  await testInfo.attach('emp1-analytical-layout-geometry', {
    body: Buffer.from(`${JSON.stringify({ desktopGeometry, narrowGeometry }, null, 2)}\n`, 'utf8'),
    contentType: 'application/json',
  });
});

async function assertUniqueLayoutSurfaceManifest(analytical) {
  const manifest = await analytical.locator('[data-emp1-layout-surface]').evaluateAll((nodes) => nodes.map((node) => ({
    surfaceId: node.dataset.emp1LayoutSurface,
    regionId: node.dataset.emp1LayoutRegion,
  })));
  const ids = manifest.map((entry) => entry.surfaceId);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain('workflow');
  expect(ids).toContain('route');
  expect(ids).toContain('source');
  expect(ids).toContain('runConfiguration');
  expect(ids).toContain('settings');
  expect(ids).toContain('engineeringEvidence');
  expect(ids).toContain('boundedCorrelation');
  expect(ids).toContain('transactionSummary');
  expect(ids).toContain('correlationResult');
  expect(ids).toContain('results');
  expect(ids).toContain('lineage');
  expect(manifest.filter((entry) => entry.regionId === 'PRIMARY_WORK').length).toBe(4);
  expect(manifest.filter((entry) => entry.regionId === 'ENGINEERING_BASIS').length).toBeGreaterThanOrEqual(4);
  expect(manifest.filter((entry) => entry.regionId === 'FULL_WIDTH_DETAIL').length).toBeGreaterThanOrEqual(2);
}

async function assertEngineerFacingCardinality(analytical) {
  for (const selector of [
    '[data-role="emp1-workflow"]',
    '[data-guided-target="source"]',
    '[data-role="emp1-c-run-configuration"]',
    '[data-role="emp1-product-execution-summary"]',
    '[data-role="emp1-c-result-evidence"]',
    '[data-guided-target="results"]',
    '[data-guided-target="lineage"]',
  ]) {
    await expect(analytical.locator(selector)).toHaveCount(1);
  }
  const governedInputs = analytical.locator('[data-role="lafea-governed-input"]');
  expect(await governedInputs.count()).toBeGreaterThan(0);
}

async function liveManifest(analytical) {
  return analytical.evaluate((root) => {
    const count = (selector) => root.querySelectorAll(selector).length;
    return {
      roles: {
        workflow: count('[data-role="emp1-workflow"]'),
        runConfiguration: count('[data-role="emp1-c-run-configuration"]'),
        executionSummary: count('[data-role="emp1-product-execution-summary"]'),
        correlationResult: count('[data-role="emp1-c-result-evidence"]'),
        governedInputs: count('[data-role="lafea-governed-input"]'),
      },
      guidedTargets: {
        route: count('[data-guided-target="analytical-route"]'),
        source: count('[data-guided-target="source"]'),
        profile: count('[data-guided-target="profile"]'),
        results: count('[data-guided-target="results"]'),
        lineage: count('[data-guided-target="lineage"]'),
      },
    };
  });
}

async function regionGeometry(analytical) {
  return analytical.evaluate((root) => {
    const box = (role) => {
      const rect = root.querySelector(`[data-role="${role}"]`).getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      primary: box('emp1-analytical-primary-work'),
      basis: box('emp1-analytical-engineering-basis'),
      detail: box('emp1-analytical-full-width-detail'),
      lanes: box('emp1-analytical-layout-lanes'),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageScrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    };
  });
}

function professionalStep(workflow, ordinal, label) {
  return workflow.getByRole('button', { name: new RegExp(`^${ordinal} ${escapeRegExp(label)}`, 'u') });
}

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_ANALYTICAL_LAYOUT__ = { controller };
    return controller.getState().activeStageId;
  }, { controllerUrl: CONTROLLER_URL });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
