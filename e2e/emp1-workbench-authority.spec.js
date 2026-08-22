import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_AUTHORITY_BROWSER__?.controller?.destroy?.();
  delete globalThis.__EMP1_AUTHORITY_BROWSER__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('complete EMP.1 qualification sample reaches prepared C and remains fail-closed', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  const sample = workbench.locator('[data-role="emp1-load-complete-qualification-sample"]');
  await expect(sample).toBeVisible();
  await sample.click();

  const summary = workbench.locator('[data-role="emp1-product-execution-summary"]');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('A 1 · B 1 · prepare C 1 · production C 0');

  const cRun = workbench.locator('[data-role="emp1-run-c"]');
  await expect(cRun).toBeDisabled();
  await expect(cRun).toHaveAttribute('data-c-state', 'ROUTE_SUSPENDED');

  const cStep = workbench.locator('[data-role="emp1-step"][data-emp1-step="C"]');
  await expect(cStep).toBeEnabled();
  await expect(cStep).toContainText('PREPARED · ROUTE SUSPENDED');

  const blocker = workbench.locator('[data-role="emp1-c-blocker"]');
  await expect(blocker).toHaveAttribute('data-qualification-state', 'ROUTE_SUSPENDED');
  await expect(blocker.locator(
    '[data-blocker-code="WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE"]',
  )).toHaveCount(1);

  await expect(workbench.locator('[data-role="emp1-c-result-evidence"]')).toHaveCount(0);
  await expect(summary.getByRole('row').filter({ hasText: 'C production route executed' }))
    .toContainText('NO');
  await expect(summary.getByRole('row').filter({ hasText: 'Code compliance produced' }))
    .toContainText('NO');
  await expect(summary.getByRole('row').filter({ hasText: 'Release qualified' }))
    .toContainText('NO');

  const evidence = await page.evaluate(() => {
    const execution = globalThis.__EMP1_AUTHORITY_BROWSER__.controller.getEmp1Execution();
    return {
      status: execution?.status ?? null,
      invocations: execution?.invocations ?? null,
      prepared: execution?.authority?.boundedLocalRoutePrepared ?? null,
      executed: execution?.authority?.boundedLocalRouteExecuted ?? null,
      stressesPresent: execution?.result?.localCorrelation?.stresses != null,
      codeComplianceProduced: execution?.authority?.codeComplianceProduced ?? null,
      releaseQualified: execution?.authority?.releaseQualified ?? null,
      routeAuthorityHash: execution?.authority?.routeAuthoritySnapshot?.semanticHash ?? null,
    };
  });
  expect(evidence).toEqual({
    status: 'PREPARED_C_BLOCKED',
    invocations: {
      loadTransfer: 1,
      sectionScreening: 1,
      localPreparation: 1,
      localCorrelation: 0,
    },
    prepared: true,
    executed: false,
    stressesPresent: false,
    codeComplianceProduced: false,
    releaseQualified: false,
    routeAuthorityHash: expect.any(String),
  });
});

test('C setup stays navigable while production C remains disabled', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  const cStep = workbench.locator('[data-role="emp1-step"][data-emp1-step="C"]');
  const cRun = workbench.locator('[data-role="emp1-run-c"]');
  await expect(cStep).toBeEnabled();
  await expect(cRun).toBeDisabled();
  await cStep.click();
  await expect(workbench.locator('[data-role="emp1-c-run-configuration"]')).toBeVisible();
  await expect(workbench.locator('[data-role="emp1-c-production-authority"]'))
    .toContainText('C production execution suspended');
});

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_AUTHORITY_BROWSER__ = { controller };
    const state = controller.getState();
    return { stageId: state.activeStageId, status: state.status };
  }, { controllerUrl: CONTROLLER_URL });
}
