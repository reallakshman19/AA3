import { expect, test } from '@playwright/test';
import {
  authorityEvidence,
  expectAuthorityNoop,
  geometryEvidence,
  openNodePositionDemo,
  openNodePositionQ3,
  q3ConnectedRunAuthority,
  rowAuthority,
  selectTableRow,
} from './helpers/topology-edit-table-node-position-fixture.js';

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('NODE_ONLY Table path is non-mutating until Apply and journal Undo/Redo is exact', async ({ page }) => {
  const host = await openNodePositionDemo(page);
  const target = await rowAuthority(page, 'P-003');
  const baseline = await authorityEvidence(page);
  const requested = { ...target.toPosition, z: target.toPosition.z + 100 };

  await selectTableRow(page, target.canonicalId);
  const panel = page.locator('[data-table-node-endpoint="TO"]');
  await expect(panel.locator('[data-table-node-capability="TO"]'))
    .toHaveAttribute('data-table-capability-status', 'AVAILABLE');
  await fillNodeDraft(panel, 'TO', requested, 'NODE_ONLY');
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  await panel.locator('[data-table-node-position-stage="TO"]').click();
  const staged = await authorityEvidence(page);
  expectAuthorityNoop(staged, baseline);
  expect(staged.batchHash).not.toBe('');
  expect(staged.intentCount).toBe(1);

  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const previewed = await authorityEvidence(page);
  expectAuthorityNoop(previewed, baseline);
  expect(previewed.ghostChildCount).toBeGreaterThan(0);

  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  const validated = await authorityEvidence(page);
  expectAuthorityNoop(validated, baseline);
  expect(validated.validationStatus).toBe('READY_TO_APPLY');

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .not.toBe(baseline.canonicalHash);
  const applied = await authorityEvidence(page);
  const moved = await geometryEvidence(page, [target.toNodeId]);
  expect(moved.positions[target.toNodeId]).toEqual(requested);
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(applied.rendererCount).toBe(1);
  expect(applied.activeCommandCount).toBe(baseline.activeCommandCount + 1);

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(baseline.canonicalHash);
  const undone = await authorityEvidence(page);
  expect(undone.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(undone.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect((await geometryEvidence(page, [target.toNodeId])).positions[target.toNodeId])
    .toEqual(target.toPosition);

  await page.locator('[data-action="redo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(applied.canonicalHash);
  const redone = await authorityEvidence(page);
  expect(redone.activeLedgerHash).toBe(applied.activeLedgerHash);
  expect(redone.activeCommandIds).toEqual(applied.activeCommandIds);
  expect((await geometryEvidence(page, [target.toNodeId])).positions[target.toNodeId])
    .toEqual(requested);
});

test('support-dependent P-001 NODE_POSITION is disabled and mutation-free', async ({ page }) => {
  await openNodePositionDemo(page);
  const target = await rowAuthority(page, 'P-001');
  const baseline = await authorityEvidence(page);
  await selectTableRow(page, target.canonicalId);

  const panel = page.locator('[data-table-node-endpoint="TO"]');
  const capability = panel.locator('[data-table-node-capability="TO"]');
  await expect(capability).toHaveAttribute('data-table-capability-status', 'UNREPRESENTABLE');
  await expect(capability).toContainText('support movement policy must be certified');
  await expect(panel.locator('[data-table-node-position-stage="TO"]')).toBeDisabled();
  await expect(panel.locator('[data-table-edit-node-mode="TO"]')).toBeDisabled();

  const blocked = await authorityEvidence(page);
  expectAuthorityNoop(blocked, baseline);
  expect(blocked.batchHash).toBe('');
  expect(blocked.intentCount).toBe(0);
});

test('CONNECTED_RUN translates the exact downstream component and preserves its internal lengths', async ({ page }) => {
  const host = await openNodePositionQ3(page);
  const target = await q3ConnectedRunAuthority(page);
  const baseline = await authorityEvidence(page);
  const before = await geometryEvidence(
    page,
    [...target.movedNodeIds, target.anchorNodeId],
    target.internalEdgeIds,
  );
  const selectedBefore = before.positions[target.nodeId];
  const delta = subtract(target.requestedPosition, selectedBefore);

  await selectTableRow(page, target.canonicalId);
  const panel = page.locator('[data-table-node-endpoint="TO"]');
  await expect(panel.locator('[data-table-node-capability="TO"]'))
    .toHaveAttribute('data-table-capability-status', 'AVAILABLE');
  await fillNodeDraft(panel, 'TO', target.requestedPosition, 'CONNECTED_RUN');
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  await panel.locator('[data-table-node-position-stage="TO"]').click();
  expectAuthorityNoop(await authorityEvidence(page), baseline);
  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const previewed = await authorityEvidence(page);
  expectAuthorityNoop(previewed, baseline);
  expect(previewed.ghostChildCount).toBeGreaterThan(0);

  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .not.toBe(baseline.canonicalHash);
  const applied = await authorityEvidence(page);
  const after = await geometryEvidence(
    page,
    [...target.movedNodeIds, target.anchorNodeId],
    target.internalEdgeIds,
  );
  for (const nodeId of target.movedNodeIds) {
    expect(after.positions[nodeId]).toEqual(add(before.positions[nodeId], delta));
  }
  expect(after.positions[target.anchorNodeId]).toEqual(before.positions[target.anchorNodeId]);
  for (const edgeId of target.internalEdgeIds) {
    expect(after.lengths[edgeId]).toBeCloseTo(before.lengths[edgeId], 9);
  }
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(applied.rendererCount).toBe(1);
  expect(applied.activeCommandCount).toBe(
    baseline.activeCommandCount + target.movedNodeIds.length,
  );

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(baseline.canonicalHash);
  expect((await authorityEvidence(page)).activeLedgerHash).toBe(baseline.activeLedgerHash);
  const undoGeometry = await geometryEvidence(page, [...target.movedNodeIds, target.anchorNodeId]);
  expect(undoGeometry.positions).toEqual(before.positions);

  await page.locator('[data-action="redo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(applied.canonicalHash);
  const redone = await authorityEvidence(page);
  expect(redone.activeLedgerHash).toBe(applied.activeLedgerHash);
  expect(redone.activeCommandIds).toEqual(applied.activeCommandIds);
});

async function fillNodeDraft(panel, endpoint, position, mode) {
  await panel.locator(`[data-table-edit-node-x="${endpoint}"]`).fill(String(position.x));
  await panel.locator(`[data-table-edit-node-y="${endpoint}"]`).fill(String(position.y));
  await panel.locator(`[data-table-edit-node-z="${endpoint}"]`).fill(String(position.z));
  await panel.locator(`[data-table-edit-node-mode="${endpoint}"]`).selectOption(mode);
}
function subtract(left, right) {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}
function add(left, right) {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}
