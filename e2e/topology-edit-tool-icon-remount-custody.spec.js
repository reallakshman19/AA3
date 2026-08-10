import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { TOPOLOGY_EDIT_ICON_MANIFEST } from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';
import {
  candidateSha,
  closePanel,
  inspectFixedControlCustody,
  installBrokenProbe,
  openPanel,
  openTopologyEdit,
  selectFirstNodeThroughObjectTree,
} from './helpers/topology-edit-icon-qualification.js';
import {
  applyCustodyRunContext,
  collectWebglEvidence,
  engineeringEvidence,
  FIXTURE,
  loadDemoAndEnterWithoutIconWait,
  REMOUNT_REPORT_PATH,
  REPORT_DIR,
  STALE_IMPORT_REPORT_PATH,
  statusOutput,
} from './helpers/topology-edit-icon-custody-support.js';

applyCustodyRunContext(test);

test('three deactivate/reactivate cycles retain one sprite, one command effect, and no stale repair', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  let host = await openTopologyEdit(page);
  const baseline = await engineeringEvidence(host);
  const cycles = [];

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
    await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);
    const custody = await inspectFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST);
    expect(custody.iconBearingControlCount).toBe(42);
    expect(custody.duplicateIconChildCount).toBe(0);
    expect(custody.extraIconBearingControlCount).toBe(0);
    expect((await collectWebglEvidence(host)).live).toBe(true);

    await selectFirstNodeThroughObjectTree(host);
    await closePanel(host, 'topology-edit-object-tree');
    await openPanel(host, 'commands');
    const move = host.locator('[data-command-action="move-positive-z"]');
    const beforeMove = await engineeringEvidence(host);
    expect(beforeMove.activeCommandCount).toBe(0);
    await move.click();
    await expect(statusOutput(host)).toContainText('MOVE_NODE accepted');
    const moved = await engineeringEvidence(host);
    expect(moved.activeCommandCount).toBe(1);
    expect(moved.sessionVersion).toBe(beforeMove.sessionVersion + 1);
    expect(moved.canonicalHash).not.toBe(beforeMove.canonicalHash);
    await closePanel(host, 'commands');
    await host.locator('[data-action="undo"]').click();
    const restored = await engineeringEvidence(host);
    expect(restored.activeCommandCount).toBe(0);
    expect(restored.canonicalHash).toBe(baseline.canonicalHash);

    await host.locator('[data-action="exit-topology-edit"]').click();
    await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(0);
    await expect(page.locator('canvas[data-viewport-backend="topology-edit-webgl"]')).toHaveCount(0);
    const staleProbe = await installBrokenProbe(page);
    await page.waitForTimeout(150);
    await expect(staleProbe).toHaveAttribute('href', '#icon-undo-broken');
    const staleReference = await staleProbe.getAttribute('href');
    await staleProbe.evaluate((element) => element.closest('svg')?.remove());

    await page.getByRole('button', { name: '3D Edit', exact: true }).click();
    host = page.locator('[data-role="topology-edit-render-host"]');
    await expect(host).toBeVisible();
    await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
    await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
    await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
    await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);

    cycles.push({
      cycle,
      activeSpriteCount: 1,
      activeIconCount: 42,
      duplicateIconChildCount: custody.duplicateIconChildCount,
      extraIconBearingControlCount: custody.extraIconBearingControlCount,
      activeCommandCountAfterSingleMove: moved.activeCommandCount,
      sessionVersionDeltaAfterSingleMove: moved.sessionVersion - beforeMove.sessionVersion,
      singleMoveCommandEffect: moved.activeCommandCount === 1
        && moved.sessionVersion === beforeMove.sessionVersion + 1,
      topologyRestored: restored.canonicalHash === baseline.canonicalHash,
      inactiveSpriteCount: 0,
      inactiveWebglCanvasCount: 0,
      staleProbeReferenceAfterDelay: staleReference,
      staleRepairObserved: staleReference !== '#icon-undo-broken',
    });
  }

  expect(cycles.every((row) => row.singleMoveCommandEffect)).toBe(true);
  expect(cycles.every((row) => row.topologyRestored)).toBe(true);
  expect(cycles.every((row) => row.staleRepairObserved === false)).toBe(true);
  writeFileSync(REMOUNT_REPORT_PATH, `${JSON.stringify({
    schema: 'TopologyEditIconRemountCustodyEvidence.v2',
    status: 'PASS_THREE_CLEAN_REMOUNTS',
    candidateSha: candidateSha(testInfo),
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    fixture: FIXTURE,
    cycles,
  }, null, 2)}\n`);
  await testInfo.attach('icon-remount-custody-ledger', { path: REMOUNT_REPORT_PATH, contentType: 'application/json' });
});

test('delayed lazy icon import cannot mount a stale activation after exit and re-entry', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  let releaseImport;
  const importGate = new Promise((resolveGate) => { releaseImport = resolveGate; });
  let interceptedRequests = 0;
  let firstRequestReleased = false;

  await page.route('**/topology-edit-icon-presentation-runtime.js*', async (route) => {
    interceptedRequests += 1;
    if (!firstRequestReleased) {
      await importGate;
      firstRequestReleased = true;
    }
    await route.continue();
  });

  let host = await loadDemoAndEnterWithoutIconWait(page);
  await expect.poll(() => interceptedRequests).toBeGreaterThan(0);
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(0);

  await host.locator('[data-action="exit-topology-edit"]').click();
  await expect(page.getByRole('button', { name: '3D Edit', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  host = page.locator('[data-role="topology-edit-render-host"]');
  releaseImport();

  await expect(host).toBeVisible();
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND', {
    timeout: 60_000,
  });
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
  await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);
  const custody = await inspectFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST);
  expect(custody.duplicateIconChildCount).toBe(0);
  expect(custody.extraIconBearingControlCount).toBe(0);

  const repairedBefore = Number(
    await host.getAttribute('data-topology-edit-icon-repaired-reference-count') ?? 0,
  );
  const activeProbe = await installBrokenProbe(page);
  await expect.poll(() => activeProbe.getAttribute('href')).toBe('#icon-undo');
  const repairedAfter = Number(
    await host.getAttribute('data-topology-edit-icon-repaired-reference-count') ?? 0,
  );
  expect(repairedAfter).toBeGreaterThan(repairedBefore);
  await activeProbe.evaluate((element) => element.closest('svg')?.remove());

  writeFileSync(STALE_IMPORT_REPORT_PATH, `${JSON.stringify({
    schema: 'TopologyEditIconStaleImportCustodyEvidence.v1',
    status: 'PASS_STALE_IMPORT_GENERATION_GUARD',
    candidateSha: candidateSha(testInfo),
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    fixture: FIXTURE,
    interceptedRequests,
    activeSpriteCount: 1,
    activeIconCount: 42,
    duplicateIconChildCount: custody.duplicateIconChildCount,
    extraIconBearingControlCount: custody.extraIconBearingControlCount,
    activeRepairObserved: repairedAfter > repairedBefore,
    staleMountObserved: false,
  }, null, 2)}\n`);
  await testInfo.attach('icon-stale-import-custody-ledger', {
    path: STALE_IMPORT_REPORT_PATH,
    contentType: 'application/json',
  });
});
