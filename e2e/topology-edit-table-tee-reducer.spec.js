import { expect, test } from '@playwright/test';
import {
  engineeringEditorFixture,
  openTopologyEditTableEngineeringFixture,
} from './helpers/topology-edit-table-engineering-fixture.js';

test('M10 reducer choices follow the explicit TEE branch without pre-Stage mutation', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openTopologyEditTableEngineeringFixture(page);
  const panel = host.locator('details[data-panel-kind="table"]');
  if (!(await panel.evaluate((node) => node.open))) await panel.locator(':scope > summary').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-projection-hash')).toBeTruthy();

  const fixture = await engineeringEditorFixture(page);
  const branchCase = fixture.branchReducerCases[0];
  const reducerCase = branchCase.reducerCandidates[0];
  const filter = page.locator('[data-table-filter]');
  const table = page.locator('[data-role="topology-edit-table"]');
  const before = await authority(page);

  await filter.fill(fixture.teeId);
  const row = table.locator(`[data-canonical-id="${fixture.teeId}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();

  const branch = page.locator('[data-table-edit-tee-branch-port]');
  const reducer = page.locator('[data-table-edit-tee-reducer]');
  const stage = page.locator('[data-table-action="stage-tee-reducer-relation"]');
  await expect(reducer).toBeDisabled();
  await expect(stage).toBeDisabled();
  expect(await optionValues(reducer)).toEqual([]);
  expect(await authority(page)).toEqual(before);

  await branch.selectOption(branchCase.portKey);
  await expect(reducer).toBeEnabled();
  expect(await optionValues(reducer)).toEqual(branchCase.reducerIds);
  await expect(stage).toBeDisabled();
  expect(await authority(page)).toEqual(before);

  await reducer.selectOption(reducerCase.reducerId);
  await page.locator('[data-table-edit-tee-run-dn]').fill(String(branchCase.runNominalSizeMm));
  await page.locator('[data-table-edit-tee-branch-dn]').fill(String(reducerCase.branchNominalSizeMm));
  await page.locator('[data-table-edit-tee-downstream-dn]').fill(String(reducerCase.downstreamNominalSizeMm));
  await expect(stage).toBeEnabled();
  await expect(page.locator('[data-table-tee-capability]')).toHaveAttribute(
    'data-table-capability-status', 'AVAILABLE',
  );
  expect(await authority(page)).toEqual(before);

  await stage.click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  const staged = await authority(page);
  expect(staged.canonicalHash).toBe(before.canonicalHash);
  expect(staged.batchHash).not.toBe('');
  expect(staged.intentCount).toBe(1);
});

async function optionValues(select) {
  return select.locator('option').evaluateAll(
    (options) => options.slice(1).map((option) => option.value).sort(),
  );
}

async function authority(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime;
    return {
      canonicalHash: controller?.session?.currentTopology?.()?.canonicalTopologyHash ?? '',
      batchHash: runtime?.batch?.batchHash ?? '',
      intentCount: runtime?.batch?.intentCount ?? 0,
    };
  });
}
