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

test('Empirical LAFEA.1 Pressure renders five identities by Internal/External and preserves cell custody', async ({ page }) => {
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

  // The shipped LAFEA.1 demo intentionally contains four definitions. Add the
  // retained asymmetric qualification identity through the normal document-import
  // boundary so this browser proof exercises the issue's exact 5x2 acceptance
  // without changing the production demonstration fixture.
  await page.evaluate(() => {
    const state = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState();
    const documentValue = structuredClone(state.stages['LAFEA.1'].document);
    const basis = documentValue.pressureDefinitions.find((row) => row.identity === 'P-CLOSED');
    if (!basis) throw new Error('P-CLOSED fixture basis required');
    const external = structuredClone(basis);
    external.identity = 'P-EXTERNAL';
    external.internalPressure = {
      ...external.internalPressure,
      value: 0,
      sourceRef: 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
    };
    external.externalPressure = {
      ...external.externalPressure,
      value: 1,
      sourceRef: 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
    };
    documentValue.pressureDefinitions.push(external);
    globalThis.AnalysisWorkspace.importEmpiricalDocument(documentValue, 'LAFEA.1');
  });

  const pressureGroup = workbench.locator('.lafea-doc-group-editor[data-input-group="PRESSURE"]');
  await expect(pressureGroup).toBeVisible();
  await expect(pressureGroup.getByRole('columnheader', { name: 'Internal' })).toBeVisible();
  await expect(pressureGroup.getByRole('columnheader', { name: 'External' })).toBeVisible();

  const rows = pressureGroup.locator('tr[data-matrix-group="LAFEA.1.pressure"]');
  await expect(rows).toHaveCount(5);
  await expect(pressureGroup.locator('[data-role="lafea-governed-input"]')).toHaveCount(10);
  await expect(pressureGroup.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.internal"]',
  )).toHaveCount(5);
  await expect(pressureGroup.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.external"]',
  )).toHaveCount(5);

  const pExternal = pressureGroup.locator(
    'tr[data-matrix-group="LAFEA.1.pressure"][data-row-id="P-EXTERNAL"]',
  );
  await expect(pExternal).toHaveCount(1);
  const internal = pExternal.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.internal"][data-entity-id="P-EXTERNAL"]',
  );
  const externalPressure = pExternal.locator(
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.external"][data-entity-id="P-EXTERNAL"]',
  );
  await expect(internal).toHaveValue('0');
  await expect(externalPressure).toHaveValue('1');
  await expect(pExternal.locator('[data-matrix-column="INTERNAL"]'))
    .toHaveAttribute('data-source-ref', 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal');
  await expect(pExternal.locator('[data-matrix-column="EXTERNAL"]'))
    .toHaveAttribute('data-source-ref', 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external');

  const sourceBefore = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState().stages['LAFEA.1'];
    const row = stage.document.pressureDefinitions.find((entry) => entry.identity === 'P-EXTERNAL');
    return {
      values: [row.internalPressure.value, row.externalPressure.value],
      refs: [row.internalPressure.sourceRef, row.externalPressure.sourceRef],
      pastLength: stage.past.length,
    };
  });
  expect(sourceBefore.values).toEqual([0, 1]);
  expect(sourceBefore.values[0] - sourceBefore.values[1]).toBe(-1);

  await internal.fill('0.5');
  await externalPressure.fill('1.25');
  const beforeApply = await page.evaluate(() => {
    const row = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState()
      .stages['LAFEA.1'].document.pressureDefinitions
      .find((entry) => entry.identity === 'P-EXTERNAL');
    return [row.internalPressure.value, row.externalPressure.value];
  });
  expect(beforeApply).toEqual([0, 1]);

  const apply = pressureGroup.locator(
    '[data-role="lafea-apply-group"][data-input-group="PRESSURE"]',
  );
  await expect(apply).toBeEnabled();
  await apply.click();

  const afterApply = await page.evaluate(() => {
    const stage = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState().stages['LAFEA.1'];
    const row = stage.document.pressureDefinitions.find((entry) => entry.identity === 'P-EXTERNAL');
    return {
      values: [row.internalPressure.value, row.externalPressure.value],
      refs: [row.internalPressure.sourceRef, row.externalPressure.sourceRef],
      pastLength: stage.past.length,
      futureLength: stage.future.length,
    };
  });
  expect(afterApply.values).toEqual([0.5, 1.25]);
  expect(afterApply.refs).toEqual(sourceBefore.refs);
  expect(afterApply.pastLength).toBe(sourceBefore.pastLength + 1);
  expect(afterApply.futureLength).toBe(0);

  const undo = workbench.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeEnabled();
  await undo.click();
  const afterUndo = await page.evaluate(() => {
    const row = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState()
      .stages['LAFEA.1'].document.pressureDefinitions
      .find((entry) => entry.identity === 'P-EXTERNAL');
    return [row.internalPressure.value, row.externalPressure.value];
  });
  expect(afterUndo).toEqual([0, 1]);

  const redo = workbench.getByRole('button', { name: 'Redo' });
  await expect(redo).toBeEnabled();
  await redo.click();
  const afterRedo = await page.evaluate(() => {
    const row = globalThis.AnalysisWorkspace.getEmpiricalWorkbenchState()
      .stages['LAFEA.1'].document.pressureDefinitions
      .find((entry) => entry.identity === 'P-EXTERNAL');
    return [row.internalPressure.value, row.externalPressure.value];
  });
  expect(afterRedo).toEqual([0.5, 1.25]);
});
