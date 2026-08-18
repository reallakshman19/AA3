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
  const loadGroup = workbench.locator('[data-input-group="LOAD_CASES"]').last();
  const inputs = loadGroup.locator('[data-role="lafea-governed-input"]');
  expect(await inputs.count()).toBeGreaterThanOrEqual(2);
  const before0 = await inputs.nth(0).inputValue();
  const before1 = await inputs.nth(1).inputValue();
  const next0 = String(Number(before0 || 0) + 11);
  const next1 = String(Number(before1 || 0) - 7);

  await inputs.nth(0).fill(next0);
  await inputs.nth(1).fill(next1);
  const apply = loadGroup.locator('[data-role="lafea-apply-group"]');
  await expect(apply).toBeEnabled();
  await apply.click();

  const refreshed = workbench.locator('[data-input-group="LOAD_CASES"]').last()
    .locator('[data-role="lafea-governed-input"]');
  await expect(refreshed.nth(0)).toHaveValue(next0);
  await expect(refreshed.nth(1)).toHaveValue(next1);

  const stateAfter = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.1'];
    return { pastLength: stage.past.length, futureLength: stage.future.length };
  });
  expect(stateAfter.futureLength).toBe(0);

  const undo = workbench.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeEnabled();
  await undo.click();

  const undone = workbench.locator('[data-input-group="LOAD_CASES"]').last()
    .locator('[data-role="lafea-governed-input"]');
  await expect(undone.nth(0)).toHaveValue(before0);
  await expect(undone.nth(1)).toHaveValue(before1);
  const stateUndo = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getLafeaWorkbenchState().stages['LAFEA.1'];
    return { pastLength: stage.past.length, futureLength: stage.future.length };
  });
  expect(stateUndo.futureLength).toBe(1);
  expect(stateUndo.pastLength).toBe(stateAfter.pastLength - 1);
});
