import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const REPORT = 'reports/qualification/topology-edit-a3d002-save-reopen.json';
const FIXTURE_ID = 'public/fixtures/topology-edit-20-element-demo.staged.json#XYZ-10-COMPONENT-BRANCH';

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('A3D-002 visible edit survives exact Undo Redo Save destroy remount Reload', async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page);
  const { host, editTab } = await openXyzTable(page);
  const baseline = await authorityEvidence(page);
  expect(baseline.webglContextType).toMatch(/WebGL/i);
  expect(baseline.webglContextLost).toBe(false);
  expect(baseline.rendererSceneSignature.length).toBeGreaterThan(0);

  const supportId = await selectTableRowByTag(page, 'S-007', 'SUPPORT');
  const editor = page.locator(`[data-table-support-placement-editor="${supportId}"]`);
  const station = editor.locator('[data-table-edit-support-station]');
  await expect(station).toBeVisible();
  const currentStation = Number(await station.inputValue());
  const hostLength = Number(await station.getAttribute('max'));
  const requestedStation = Math.min(hostLength, currentStation + Math.min(100, (hostLength - currentStation) / 2));
  expect(requestedStation).toBeGreaterThan(currentStation);

  await station.fill(String(requestedStation));
  assertEngineeringAuthority(await authorityEvidence(page), baseline);

  await editor.locator('[data-table-support-placement-stage]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.intentCount)).toBe(1);
  const staged = await authorityEvidence(page);
  assertEngineeringAuthority(staged, baseline);

  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const previewed = await authorityEvidence(page);
  assertEngineeringAuthority(previewed, baseline);
  expect(previewed.ghostChildCount).toBeGreaterThan(0);

  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  const validated = await authorityEvidence(page);
  assertEngineeringAuthority(validated, baseline);

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash)).not.toBe(baseline.canonicalHash);
  const applied = await authorityEvidence(page);
  const appliedSupport = await supportEvidence(page, supportId);
  expect(appliedSupport.canonicalPlacementOverride?.authority).toBe('CERTIFIED_TABLE_OVERRIDE');
  expect(appliedSupport.canonicalPlacementOverride?.stationMm).toBeCloseTo(requestedStation, 9);
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(applied.activeCommandCount).toBe(baseline.activeCommandCount + 1);
  expect(applied.visualModelHash).not.toBe(baseline.visualModelHash);
  expect(applied.ghostChildCount).toBe(0);

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash)).toBe(baseline.canonicalHash);
  const undone = await authorityEvidence(page);
  expect(undone.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(undone.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect(undone.sourceHash).toBe(baseline.sourceHash);
  expect(undone.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(undone.visualModelHash).toBe(baseline.visualModelHash);
  expect(undone.rendererSceneSignature).toEqual(baseline.rendererSceneSignature);
  expect((await supportEvidence(page, supportId)).canonicalPlacementOverride).toBeNull();

  await page.locator('[data-action="redo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash)).toBe(applied.canonicalHash);
  const redone = await authorityEvidence(page);
  const redoneSupport = await supportEvidence(page, supportId);
  expect(redone.activeLedgerHash).toBe(applied.activeLedgerHash);
  expect(redone.activeCommandIds).toEqual(applied.activeCommandIds);
  expect(redone.visualModelHash).toBe(applied.visualModelHash);
  expect(redone.rendererSceneSignature).toEqual(applied.rendererSceneSignature);
  expect(redone.renderGroupCounts).toEqual(applied.renderGroupCounts);
  expect(redoneSupport).toEqual(appliedSupport);

  const saveButton = host.getByRole('button', { name: 'Save draft', exact: true });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(host.locator('[data-role="topology-edit-status"]')).toContainText('Draft saved:');
  await expect.poll(() => host.getAttribute('data-topology-edit-draft-package-hash')).toBeTruthy();
  const saved = await authorityEvidence(page);
  expect(saved.draftPackageHash).toBeTruthy();
  expect(saved.canonicalHash).toBe(redone.canonicalHash);
  expect(saved.journalHash).toBe(redone.journalHash);
  expect(saved.visualModelHash).toBe(redone.visualModelHash);
  expect(saved.rendererSceneSignature).toEqual(redone.rendererSceneSignature);

  await rememberPreExitController(page);
  await host.getByRole('button', { name: 'Exit 3D Edit', exact: true }).click();
  await expect(host).toBeHidden();
  const destroyed = await destroyedEditorEvidence(page);
  expect(destroyed.mountedControllerReferencePresent).toBe(false);
  expect(destroyed.oldControllerSessionIsNull).toBe(true);
  expect(destroyed.oldControllerViewportBackendIsNull).toBe(true);
  expect(destroyed.webglCanvasCount).toBe(0);
  expect(destroyed.hostChildCount).toBe(0);

  await editTab.click();
  await expect(host).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-canonical-hash')).toBeTruthy();
  const remounted = await authorityEvidence(page);
  const remountCustody = await remountCustodyEvidence(page);
  expect(remountCustody.mountedControllerReferencePresent).toBe(true);
  expect(remountCustody.controllerIsDistinctFromPreExit).toBe(true);
  expect(remountCustody.webglCanvasCount).toBe(1);
  expect(remounted.canonicalHash).toBe(baseline.canonicalHash);
  expect(remounted.sourceHash).toBe(baseline.sourceHash);
  expect(remounted.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(remounted.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect(remounted.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(remounted.visualModelHash).toBe(baseline.visualModelHash);
  expect(remounted.rendererSceneSignature).toEqual(baseline.rendererSceneSignature);
  expect(remounted.webglContextLost).toBe(false);

  const reloadButton = host.getByRole('button', { name: 'Reload draft', exact: true });
  await expect(reloadButton).toBeEnabled();
  await reloadButton.click();
  await expect(host.locator('[data-role="topology-edit-status"]')).toContainText('Draft restored at session version');
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash)).toBe(redone.canonicalHash);
  const restored = await authorityEvidence(page);

  expect(restored.canonicalHash).toBe(redone.canonicalHash);
  expect(restored.sourceHash).toBe(redone.sourceHash);
  expect(restored.sourceByteHash).toBe(redone.sourceByteHash);
  expect(restored.journalHash).toBe(redone.journalHash);
  expect(restored.activeLedgerHash).toBe(redone.activeLedgerHash);
  expect(restored.activeCommandIds).toEqual(redone.activeCommandIds);
  expect(restored.activeCommandCount).toBe(redone.activeCommandCount);
  expect(restored.sessionVersion).toBe(redone.sessionVersion);
  expect(restored.visualModelHash).toBe(redone.visualModelHash);
  expect(restored.rendererSceneSignature).toEqual(redone.rendererSceneSignature);
  expect(restored.renderGroupCounts).toEqual(redone.renderGroupCounts);
  expect(restored.webglContextType).toMatch(/WebGL/i);
  expect(restored.webglContextLost).toBe(false);
  expect(restored.ghostChildCount).toBe(0);
  expect(restored.draftPackageHash).toBe(saved.draftPackageHash);

  await openEngineeringTable(page);
  const restoredSupportId = await selectTableRowByTag(page, 'S-007', 'SUPPORT');
  expect(restoredSupportId).toBe(supportId);
  const restoredSupport = await supportEvidence(page, supportId);
  expect(restoredSupport).toEqual(redoneSupport);

  await assertDiagnostics(diagnostics);
  const evidence = {
    schema: 'TopologyEditA3D002SaveReopenEvidence.v3',
    status: 'PASS',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    fixture: FIXTURE_ID,
    visibleFlow: [
      'LOAD_FIXTURE', 'ENTER_3D_EDIT', 'TABLE_SELECT_S-007', 'STAGE_SUPPORT_STATION',
      'PREVIEW', 'VALIDATE', 'APPLY', 'UNDO', 'REDO', 'SAVE_DRAFT',
      'CAPTURE_PRE_EXIT_CONTROLLER', 'EXIT_3D_EDIT', 'VERIFY_DESTROYED',
      'REENTER_3D_EDIT', 'VERIFY_DISTINCT_CONTROLLER', 'RELOAD_DRAFT',
      'REOPEN_TABLE_AND_VERIFY_S-007',
    ],
    supportId, currentStation, requestedStation, hostLength,
    baseline, staged, previewed, validated, applied, undone, redone, saved,
    destroyed, remountCustody, remounted, restored,
    appliedSupport, redoneSupport, restoredSupport,
    canonicalRestoreExact: restored.canonicalHash === redone.canonicalHash,
    journalRestoreExact: restored.journalHash === redone.journalHash,
    sourceRestoreExact: restored.sourceHash === redone.sourceHash && restored.sourceByteHash === redone.sourceByteHash,
    renderProjectionRestoreExact: restored.visualModelHash === redone.visualModelHash
      && JSON.stringify(restored.rendererSceneSignature) === JSON.stringify(redone.rendererSceneSignature)
      && JSON.stringify(restored.renderGroupCounts) === JSON.stringify(redone.renderGroupCounts),
    destructiveRemountExact: destroyed.oldControllerSessionIsNull
      && destroyed.oldControllerViewportBackendIsNull
      && !destroyed.mountedControllerReferencePresent
      && remountCustody.controllerIsDistinctFromPreExit,
  };
  await mkdir('reports/qualification', { recursive: true });
  await writeFile(REPORT, `${JSON.stringify(evidence, null, 2)}\n`);
  await testInfo.attach('a3d-002-save-reopen-ledger', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await testInfo.attach('a3d-002-save-reopen', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

async function openXyzTable(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' }).getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-xyz-branch-demo"]').click();
  await expect(page.locator('[data-role="summary-supports"]')).toContainText('7');
  const editTab = page.getByRole('button', { name: '3D Edit', exact: true });
  await editTab.click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-canonical-hash')).toBeTruthy();
  await openEngineeringTable(page);
  return { host, editTab };
}

async function openEngineeringTable(page) {
  const trigger = page.locator('[data-action="open-engineering-table"]');
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
}

async function selectTableRowByTag(page, tag, expectedElementType) {
  const filter = page.locator('[data-table-filter]');
  await filter.fill(tag);
  const row = page.locator(`[data-role="topology-edit-table"] tbody tr[data-canonical-id][data-element-type="${expectedElementType}"]`);
  await expect(row).toHaveCount(1);
  const canonicalId = await row.getAttribute('data-canonical-id');
  expect(canonicalId).toBeTruthy();
  await row.locator('[data-table-select]').click();
  await expect(page.locator('[data-table-all-properties]')).toBeVisible();
  return canonicalId;
}

async function rememberPreExitController(page) {
  await page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    globalThis.__a3d002PreExitController = host?.__topologyEditAuthoringController ?? null;
  });
}

async function destroyedEditorEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const oldController = globalThis.__a3d002PreExitController;
    return {
      mountedControllerReferencePresent: Boolean(host?.__topologyEditAuthoringController),
      oldControllerSessionIsNull: oldController?.session === null,
      oldControllerViewportBackendIsNull: oldController?.viewportBackend === null,
      webglCanvasCount: document.querySelectorAll('canvas[data-viewport-backend="topology-edit-webgl"]').length,
      hostChildCount: host?.childElementCount ?? -1,
    };
  });
}

async function remountCustodyEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const mounted = host?.__topologyEditAuthoringController ?? null;
    return {
      mountedControllerReferencePresent: Boolean(mounted),
      controllerIsDistinctFromPreExit: Boolean(mounted) && mounted !== globalThis.__a3d002PreExitController,
      webglCanvasCount: document.querySelectorAll('canvas[data-viewport-backend="topology-edit-webgl"]').length,
    };
  });
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime;
    const journal = controller?.session?.journal;
    const groups = controller?.viewportBackend?.groups;
    const context = controller?.viewportBackend?.renderer?.getContext?.();
    const round = (value) => Number.isFinite(value) ? Number(value.toFixed(9)) : null;
    const pick = (input = {}) => ({
      modelRole: String(input.modelRole || ''), objectKind: String(input.objectKind || ''),
      objectId: String(input.objectId || ''), nodeId: String(input.nodeId || ''),
      partRole: String(input.partRole || ''), supportId: String(input.supportId || ''),
      restraintId: String(input.restraintId || ''), restraintFamily: String(input.restraintFamily || ''),
    });
    const rendererSceneSignature = [];
    for (const [groupName, group] of [['source', groups?.sourceGroup], ['draft', groups?.draftGroup], ['supports', groups?.supportGroup]]) {
      group?.traverse((object) => {
        if (object === group) return;
        const userData = object.userData || {};
        rendererSceneSignature.push({
          group: groupName, type: String(object.type || ''), geometryType: String(object.geometry?.type || ''),
          position: [round(object.position?.x), round(object.position?.y), round(object.position?.z)],
          quaternion: [round(object.quaternion?.x), round(object.quaternion?.y), round(object.quaternion?.z), round(object.quaternion?.w)],
          scale: [round(object.scale?.x), round(object.scale?.y), round(object.scale?.z)],
          pick: pick(userData.pickTarget || userData),
          pickTable: Array.isArray(userData.pickTable) ? userData.pickTable.map(pick) : [],
        });
      });
    }
    rendererSceneSignature.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return {
      canonicalHash: controller?.session?.currentTopology?.()?.canonicalTopologyHash ?? null,
      sourceHash: controller?.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller?.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal?.journalHash ?? null,
      activeLedgerHash: journal?.activeLedgerHash ?? null,
      activeCommandIds: [...(journal?.activeCommandIds ?? [])],
      activeCommandCount: journal?.activeCommandIds?.length ?? 0,
      sessionVersion: journal?.sessionVersion ?? null,
      visualModelHash: controller?.visualModelHash ?? null,
      rendererSceneSignature,
      renderGroupCounts: {
        source: groups?.sourceGroup?.children?.length ?? 0,
        draft: groups?.draftGroup?.children?.length ?? 0,
        supports: groups?.supportGroup?.children?.length ?? 0,
      },
      webglContextType: context?.constructor?.name ?? '',
      webglContextLost: Boolean(context?.isContextLost?.()),
      ghostChildCount: groups?.ghostGroup?.children?.length ?? 0,
      previewHash: runtime?.preview?.previewHash ?? '',
      intentCount: runtime?.batch?.intentCount ?? 0,
      draftPackageHash: host?.dataset?.topologyEditDraftPackageHash ?? '',
    };
  });
}

async function supportEvidence(page, supportId) {
  return page.evaluate((id) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')?.__topologyEditAuthoringController;
    const support = controller.session.currentTopology().supports.find((row) => row.id === id);
    const tableRow = controller.tableAdapter.runtime.projection.rows.find((row) => row.identity.canonicalId === id);
    return {
      canonicalPlacementOverride: support?.placementOverride ?? null,
      importedOrigin: support?.origin ?? null,
      attachmentId: support?.attachmentId ?? null,
      attachmentSegmentParameter: support?.attachmentSegmentParameter ?? null,
      tableStationMm: Number(tableRow?.fields?.stationMm),
      tableStationAuthority: tableRow?.fieldAuthority?.stationMm ?? null,
    };
  }, supportId);
}

function assertEngineeringAuthority(actual, expected) {
  expect(actual.canonicalHash).toBe(expected.canonicalHash);
  expect(actual.journalHash).toBe(expected.journalHash);
  expect(actual.activeLedgerHash).toBe(expected.activeLedgerHash);
  expect(actual.activeCommandIds).toEqual(expected.activeCommandIds);
  expect(actual.activeCommandCount).toBe(expected.activeCommandCount);
  expect(actual.sessionVersion).toBe(expected.sessionVersion);
  expect(actual.sourceHash).toBe(expected.sourceHash);
  expect(actual.sourceByteHash).toBe(expected.sourceByteHash);
  expect(actual.visualModelHash).toBe(expected.visualModelHash);
  expect(actual.rendererSceneSignature).toEqual(expected.rendererSceneSignature);
  expect(actual.renderGroupCounts).toEqual(expected.renderGroupCounts);
}

function collectDiagnostics(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  return { pageErrors, consoleErrors };
}

async function assertDiagnostics(diagnostics) {
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
}
