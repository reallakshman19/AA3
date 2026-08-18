import { expect, test } from '@playwright/test';

test('Empirical LAFEA.1 applies a load group atomically with one undo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-application-nav="EMPIRICAL"]').click();
  await expect.poll(() => page.evaluate(
    () => globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null,
  )).toBe('EMPIRICAL');

  const root = page.locator('[data-role="empirical-lafea-consumer-root"]');
  const workbench = root.locator('[data-role="lafea-workbench"]');
  const mock = workbench.locator('[data-role="lafea-mock"]');
  if (await mock.isVisible()) await mock.click();

  await expect(workbench.locator('[data-role="lafea-apply-descriptor"]')).toHaveCount(0);
  const loadGroup = workbench.locator('.lafea-doc-group-editor[data-input-group="LOAD_CASES"]');
  await expect(loadGroup).toBeVisible();
  const forceX = loadGroup.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.x"]',
  ).first();
  const forceY = loadGroup.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.y"]',
  ).first();
  await expect(forceX).toBeVisible();
  await expect(forceY).toBeVisible();

  const entityId = await forceX.getAttribute('data-entity-id');
  expect(entityId).toBeTruthy();
  await expect(forceY).toHaveAttribute('data-entity-id', entityId);
  const beforeX = await forceX.inputValue();
  const beforeY = await forceY.inputValue();
  const nextX = String(Number(beforeX) + 11);
  const nextY = String(Number(beforeY) - 7);
  const historyBefore = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState().stages['LAFEA.1'];
    return { pastLength: stage.past.length, futureLength: stage.future.length };
  });

  await forceX.fill(nextX);
  await forceY.fill(nextY);
  const sourceBeforeApply = await page.evaluate((id) => {
    const stage = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState().stages['LAFEA.1'];
    const row = stage.document.loadCases.find((entry) => entry.identity === id);
    return [row.force.value[0], row.force.value[1]];
  }, entityId);
  expect(sourceBeforeApply).toEqual([Number(beforeX), Number(beforeY)]);

  const apply = loadGroup.locator('[data-role="lafea-apply-group"][data-input-group="LOAD_CASES"]');
  await expect(apply).toBeEnabled();
  await apply.click();

  const refreshedGroup = workbench.locator('.lafea-doc-group-editor[data-input-group="LOAD_CASES"]');
  const refreshedX = refreshedGroup.locator(
    `[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.x"][data-entity-id="${entityId}"]`,
  );
  const refreshedY = refreshedGroup.locator(
    `[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.y"][data-entity-id="${entityId}"]`,
  );
  await expect(refreshedX).toHaveValue(nextX);
  await expect(refreshedY).toHaveValue(nextY);

  const stateAfter = await page.evaluate((id) => {
    const stage = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState().stages['LAFEA.1'];
    const row = stage.document.loadCases.find((entry) => entry.identity === id);
    return {
      force: [row.force.value[0], row.force.value[1]],
      pastLength: stage.past.length,
      futureLength: stage.future.length,
      execution: stage.execution,
    };
  }, entityId);
  expect(stateAfter.force).toEqual([Number(nextX), Number(nextY)]);
  expect(stateAfter.pastLength).toBe(historyBefore.pastLength + 1);
  expect(stateAfter.futureLength).toBe(0);
  expect(stateAfter.execution).toBeNull();

  const undo = workbench.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeEnabled();
  await undo.click();

  const undoneGroup = workbench.locator('.lafea-doc-group-editor[data-input-group="LOAD_CASES"]');
  await expect(undoneGroup.locator(
    `[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.x"][data-entity-id="${entityId}"]`,
  )).toHaveValue(beforeX);
  await expect(undoneGroup.locator(
    `[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.load.force.y"][data-entity-id="${entityId}"]`,
  )).toHaveValue(beforeY);
  const stateUndo = await page.evaluate((id) => {
    const stage = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState().stages['LAFEA.1'];
    const row = stage.document.loadCases.find((entry) => entry.identity === id);
    return {
      force: [row.force.value[0], row.force.value[1]],
      pastLength: stage.past.length,
      futureLength: stage.future.length,
    };
  }, entityId);
  expect(stateUndo.force).toEqual([Number(beforeX), Number(beforeY)]);
  expect(stateUndo.futureLength).toBe(1);
  expect(stateUndo.pastLength).toBe(historyBefore.pastLength);
});
