import { expect, test } from '@playwright/test';
import {
  authorityEvidence,
  moveNodeViaCanvas,
  openNodePositionQ3,
  q3ConcurrencyAuthority,
  stageNodePosition,
} from './helpers/topology-edit-table-node-position-fixture.js';

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('staged NODE_POSITION safely rebases after a disjoint certified Canvas edit', async ({ page }) => {
  const host = await openNodePositionQ3(page);
  const target = await q3ConcurrencyAuthority(page);
  await stageTarget(page, target);
  const first = await authorityEvidence(page);
  expect(first.batchHash).not.toBe('');

  await moveNodeViaCanvas(page, host, target.unrelatedNodeId, {
    deltaX: 75, deltaY: 0, deltaZ: 0,
  });
  await expect.poll(() => authorityEvidence(page).then((row) => row.batchHash))
    .not.toBe(first.batchHash);
  const rebased = await authorityEvidence(page);
  expect(rebased.staleDisposition).toBe('');
  expect(rebased.batchBasisHash).toBe(rebased.canonicalHash);
  expect(rebased.tableMessage).toContain('rebased safely');
  expect(rebased.previewHash).toBe('');
  expect(rebased.intentCount).toBe(1);
  await expect(page.locator('[data-table-action="preview"]')).toBeEnabled();
});

test('staged NODE_POSITION fails stale when the exact target node changes', async ({ page }) => {
  const host = await openNodePositionQ3(page);
  const target = await q3ConcurrencyAuthority(page);
  await stageTarget(page, target);

  await moveNodeViaCanvas(page, host, target.targetFromNodeId, {
    deltaX: 0, deltaY: 0, deltaZ: 50,
  });
  await expect(host).toHaveAttribute('data-topology-edit-table-stale-disposition', 'STALE_CONFLICT');
  const stale = await authorityEvidence(page);
  expect(stale.staleReasonCodes).toContain('DEPENDENCY_REVISION_CHANGED');
  expect(stale.intentCount).toBe(1);
  await expect(page.locator('[data-table-action="preview"]')).toBeDisabled();
});

test('staged NODE_POSITION fails stale when the opposite endpoint changes the source-edge dependency', async ({ page }) => {
  const host = await openNodePositionQ3(page);
  const target = await q3ConcurrencyAuthority(page);
  await stageTarget(page, target);

  await moveNodeViaCanvas(page, host, target.targetToNodeId, {
    deltaX: 0, deltaY: 45, deltaZ: 0,
  });
  await expect(host).toHaveAttribute('data-topology-edit-table-stale-disposition', 'STALE_CONFLICT');
  const stale = await authorityEvidence(page);
  expect(stale.staleReasonCodes).toContain('DEPENDENCY_REVISION_CHANGED');
  expect(stale.intentCount).toBe(1);
  await expect(page.locator('[data-table-action="preview"]')).toBeDisabled();
});

test('validation result arriving after a certified canonical change cannot authorize Apply', async ({ page }) => {
  const host = await openNodePositionQ3(page);
  const target = await q3ConcurrencyAuthority(page);
  await stageTarget(page, target);
  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const preview = await authorityEvidence(page);

  await installValidationGate(page);
  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-node-position-validation-gate', 'receipt-ready');

  await moveNodeViaCanvas(page, host, target.unrelatedNodeId, {
    deltaX: 60, deltaY: 0, deltaZ: 0,
  });
  const changed = await authorityEvidence(page);
  expect(changed.canonicalHash).not.toBe(preview.canonicalHash);
  expect(changed.previewHash).toBe('');

  await releaseValidationGate(page);
  await expect.poll(() => authorityEvidence(page).then((row) => row.tableError))
    .toContain('validation completed against a stale Preview');
  const rejected = await authorityEvidence(page);
  expect(rejected.validationStatus).toBe('');
  expect(rejected.previewHash).toBe('');
  await expect(page.locator('[data-table-action="apply"]')).toBeDisabled();
});

async function stageTarget(page, target) {
  await stageNodePosition(page, {
    canonicalId: target.targetEdgeId,
    endpoint: 'FROM',
    movementMode: 'NODE_ONLY',
    position: {
      x: target.targetFromPosition.x,
      y: target.targetFromPosition.y + 80,
      z: target.targetFromPosition.z,
    },
  });
  await expect.poll(() => authorityEvidence(page).then((row) => row.intentCount)).toBe(1);
}

async function installValidationGate(page) {
  await page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const runtime = host?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    if (!runtime?.validationClient?.validate) throw new Error('Table validation client unavailable.');
    const original = runtime.validationClient.validate.bind(runtime.validationClient);
    runtime.validationClient.validate = async (input) => {
      const result = await original(input);
      host.dataset.nodePositionValidationGate = 'receipt-ready';
      await new Promise((resolve) => { runtime.__nodePositionValidationRelease = resolve; });
      return result;
    };
  });
}

async function releaseValidationGate(page) {
  await page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const runtime = host?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    const release = runtime?.__nodePositionValidationRelease;
    if (typeof release !== 'function') throw new Error('Deferred validation release is unavailable.');
    delete runtime.__nodePositionValidationRelease;
    release();
  });
}
