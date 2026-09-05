import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_BENCHMARK_HIERARCHY__?.controller?.destroy?.();
  delete globalThis.__EMP1_BENCHMARK_HIERARCHY__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('EMP.1 benchmark evidence stays authority-safe while deep CAUx audit detail is staged', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1058 });
  await mountEmp1Workbench(page);

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  const analytical = workbench.locator('[data-role="lafea-analytical-calc"]');
  const workflow = analytical.locator('[data-role="emp1-workflow"]');
  const panel = analytical.locator('[data-role="emp1-benchmark-evidence-panel"]');
  await expect(panel).toHaveCount(1);
  await expect(panel).toHaveAttribute('data-emp1-layout-surface', 'benchmarkEvidence');
  await expect(panel).toHaveAttribute('data-emp1-layout-region', 'FULL_WIDTH_DETAIL');
  await expect(workflow.locator('[data-role="emp1-benchmark-evidence-panel"]')).toHaveCount(0);

  const comparators = panel.locator('[data-role="emp1-benchmark-comparator"]');
  await expect(comparators).toHaveCount(2);

  const caux = panel.locator('[data-role="emp1-benchmark-comparator"][data-comparator-id="CAUX"]');
  const cauxStatus = caux.locator('[data-role="emp1-benchmark-comparison-status"]');
  await expect(cauxStatus).toBeVisible();
  await expect(cauxStatus).toContainText('Comparison qualified');
  await expect(cauxStatus).toContainText('Engineering use not authorized');
  await expect(cauxStatus).toHaveAttribute('data-comparison-state', 'COMPARISON_QUALIFIED');
  await expect(cauxStatus).toHaveAttribute('data-engineering-use-authorized', 'false');

  const overview = caux.locator('[data-role="emp1-benchmark-caux-overview"]');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('8 / 8 within frozen tolerance');
  await expect(overview).toContainText(/2\.0355862\s*%\s*·\s*Cu/u);
  await expect(overview).toContainText('Du reference / Du EMP.1 · Agreement: Yes');
  await expect(overview).toContainText(/Engineering use authorized\s*No/u);

  const authority = caux.locator('[data-role="emp1-benchmark-table-authority-statement"]');
  await expect(authority).toBeVisible();
  await expect(authority).toContainText('not WRC method authority');
  await expect(authority).toContainText('Does not establish code compliance');

  const audit = caux.locator('[data-role="emp1-benchmark-caux-audit-details"]');
  await expect(audit).toHaveCount(1);
  await expect(audit).not.toHaveAttribute('open', '');
  await expect(caux.locator('[data-role="emp1-benchmark-comparison-row"]')).toHaveCount(8);
  await expect(caux.locator('[data-role="emp1-benchmark-comparison-table"]')).not.toBeVisible();

  await audit.locator('summary').click();
  await expect(audit).toHaveAttribute('open', '');
  const table = caux.locator('[data-role="emp1-benchmark-comparison-table"]');
  await expect(table).toBeVisible();
  await expect(caux.locator('[data-role="emp1-benchmark-comparison-row"]')).toHaveCount(8);

  const cu = caux.locator('[data-role="emp1-benchmark-comparison-row"][data-location="Cu"]');
  await expect(cu).toContainText('975 kPa');
  await expect(cu).toContainText(/994\.84697\s*kPa/u);
  await expect(cu).toContainText(/2\.0355862\s*%/u);
  await expect(cu).toContainText('3 %');

  const du = caux.locator('[data-role="emp1-benchmark-comparison-row"][data-location="Du"]');
  await expect(du).toContainText('1754 kPa');
  await expect(du).toContainText(/1780\.7867\s*kPa/u);
  await expect(du).toContainText(/26\.78674\s*kPa/u);

  const pvElite = panel.locator('[data-role="emp1-benchmark-comparator"][data-comparator-id="PV_ELITE"]');
  const unavailable = pvElite.locator('[data-role="emp1-benchmark-reference-unavailable"]');
  await expect(unavailable).toBeVisible();
  await expect(unavailable).toContainText('Reference not available');
  await expect(pvElite).toContainText('Exact PV Elite WRC 107/537 report, input and version have not been retained and frozen.');
  await expect(pvElite).toContainText('No reference values or tolerance are inferred.');
  await expect(pvElite).toContainText(/Comparison rows\s*0/u);
  await expect(pvElite.locator('[data-role="emp1-benchmark-comparison-row"]')).toHaveCount(0);
});

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_BENCHMARK_HIERARCHY__ = { controller };
    return controller.getState().activeStageId;
  }, { controllerUrl: CONTROLLER_URL });
}
