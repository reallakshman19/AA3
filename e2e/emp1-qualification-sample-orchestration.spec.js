import { expect, test } from '@playwright/test';

const HOST_URL = '/e2e/fixtures/lafea-guided-workbench.html';
const CONTROLLER_URL = '/src/workspace/lafea-workbench-controller.js';

const destroyWorkbench = async (page) => page.evaluate(() => {
  globalThis.__EMP1_SAMPLE_SEQUENCE__?.controller?.destroy?.();
  delete globalThis.__EMP1_SAMPLE_SEQUENCE__;
}).catch(() => {});

test.afterEach(async ({ page }) => destroyWorkbench(page));

test('clean complete sample executes and retains A before B/C', async ({ page }) => {
  await mountEmp1Workbench(page);
  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  await expect.poll(() => sampleState(page)).toMatchObject({
    aDocumentLoaded: true,
    aExecutionStatus: 'QUALIFIED',
    aQualificationState: 'ACCEPTED',
    bDocumentLoaded: true,
    runInputLoaded: true,
    failureCode: null,
  });

  const state = await sampleState(page);
  expect(['CALCULATED', 'PREPARED_C_BLOCKED']).toContain(state.emp1ExecutionStatus);
  expect(state.emp1ExecutionStatus).not.toBe('FAILED');
  expect(state.emp1ExecutionStatus).not.toBe('BLOCKED');
});

test('complete sample stops before B/C when A is not current and qualified', async ({ page }) => {
  await mountEmp1Workbench(page);
  await page.evaluate(() => {
    const controller = globalThis.__EMP1_SAMPLE_SEQUENCE__.controller;
    controller.run = () => controller.getState();
  });

  const workbench = page.locator('[data-role="lafea-workbench"]');
  await workbench.locator('[data-role="emp1-load-complete-qualification-sample"]').click();

  await expect.poll(() => sampleState(page)).toMatchObject({
    aDocumentLoaded: true,
    aExecutionStatus: null,
    bDocumentLoaded: false,
    runInputLoaded: false,
    emp1ExecutionStatus: null,
    failureCode: 'EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED',
  });
});

async function sampleState(page) {
  return page.evaluate(() => {
    const controller = globalThis.__EMP1_SAMPLE_SEQUENCE__.controller;
    const state = controller.getState();
    return {
      aDocumentLoaded: Boolean(state.stages?.['LAFEA.1']?.document),
      aExecutionStatus: state.stages?.['LAFEA.1']?.execution?.status ?? null,
      aQualificationState:
        state.stages?.['LAFEA.1']?.execution?.result?.qualification?.state ?? null,
      bDocumentLoaded: Boolean(state.stages?.['LAFEA.2']?.document),
      runInputLoaded: controller.getEmp1RunInput() != null,
      emp1ExecutionStatus: controller.getEmp1Execution()?.status ?? null,
      failureCode: controller.emp1RunFailure?.code ?? null,
    };
  });
}

async function mountEmp1Workbench(page) {
  await page.goto(HOST_URL);
  return page.evaluate(async ({ controllerUrl }) => {
    const { LafeaWorkbenchController } = await import(controllerUrl);
    const root = document.querySelector('#lafea-guided-browser-host');
    const controller = new LafeaWorkbenchController(root, { analyticalOnly: true });
    controller.init();
    globalThis.__EMP1_SAMPLE_SEQUENCE__ = { controller };
    return { stageId: controller.getState().activeStageId };
  }, { controllerUrl: CONTROLLER_URL });
}
