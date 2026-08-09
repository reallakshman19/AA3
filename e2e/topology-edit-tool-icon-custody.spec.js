import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPOLOGY_EDIT_ICON_MANIFEST } from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';
import {
  candidateSha,
  closePanel,
  expectVisibleIcon,
  inspectFixedControlCustody,
  installBrokenProbe,
  openPanel,
  openSectionControls,
  openTopologyEdit,
  selectFirstNodeThroughObjectTree,
} from './helpers/topology-edit-icon-qualification.js';

const REPORT_DIR = resolve('reports/qualification');
const REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-custody.json');
const REMOUNT_REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-remount-custody.json');
const STALE_IMPORT_REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-stale-import-custody.json');
const SCREENSHOT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-state-custody.png');
const FIXTURE = 'public/fixtures/topology-edit-20-element-demo.staged.json';

test.beforeEach(async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.addInitScript(() => {
    globalThis.localStorage?.clear();
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'webgl';
  });
});

test('real WebGL custody preserves governed edit, preview, and presentation authority', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  const host = await openTopologyEdit(page);
  const webgl = await collectWebglEvidence(host);
  expect(webgl.backend).toBe('topology-edit-webgl');
  expect(webgl.live).toBe(true);
  expect(webgl.drawingBuffer.width).toBeGreaterThan(0);
  expect(webgl.drawingBuffer.height).toBeGreaterThan(0);

  const baseline = await engineeringEvidence(host);
  expect(baseline.activeCommandCount).toBe(0);
  expect(baseline.canonicalHash).not.toBe('');
  expect(baseline.sourceHash).not.toBe('');

  const select = host.locator('[data-navigation-mode="select"]');
  const orbit = host.locator('[data-navigation-mode="orbit"]');
  const pan = host.locator('[data-navigation-mode="pan"]');
  const fit = host.locator('[data-navigation-action="fit"]');
  const navigationIdentities = {
    select: await stableIdentity(select),
    orbit: await stableIdentity(orbit),
    pan: await stableIdentity(pan),
    fit: await stableIdentity(fit),
  };
  await orbit.click();
  await expect(orbit).toHaveAttribute('aria-pressed', 'true');
  await expectVisibleIcon(orbit, 'icon-orbit');
  await pan.click();
  await expect(pan).toHaveAttribute('aria-pressed', 'true');
  await expectVisibleIcon(pan, 'icon-pan');
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await expectVisibleIcon(fit, 'icon-fit');
  await fit.click();
  expect(await stableIdentity(select)).toEqual(navigationIdentities.select);
  expect(await stableIdentity(orbit)).toEqual(navigationIdentities.orbit);
  expect(await stableIdentity(pan)).toEqual(navigationIdentities.pan);
  expect(await stableIdentity(fit)).toEqual(navigationIdentities.fit);
  expect((await engineeringEvidence(host)).canonicalHash).toBe(baseline.canonicalHash);

  const shortcuts = host.locator(
    '.topology-edit-clean-shell__utilities [data-action="toggle-shortcuts"]',
  );
  const inspector = host.locator('[data-action="toggle-inspector"]');
  const shortcutsIdentity = await stableIdentity(shortcuts);
  const inspectorIdentity = await stableIdentity(inspector);
  await shortcuts.click();
  await expect(shortcuts).toHaveAttribute('aria-expanded', 'true');
  await expectVisibleIcon(shortcuts, 'icon-shortcuts');
  await host.locator(
    '[data-role="topology-edit-shortcuts"] [data-action="toggle-shortcuts"]',
  ).click();
  await expect(shortcuts).toHaveAttribute('aria-expanded', 'false');
  await inspector.click();
  await expectVisibleIcon(inspector, 'icon-inspector');
  await inspector.click();
  expect(await stableIdentity(shortcuts)).toEqual(shortcutsIdentity);
  expect(await stableIdentity(inspector)).toEqual(inspectorIdentity);

  const previewAccept = host.locator('[data-action="accept-autofix"]');
  const previewCancel = host.locator('[data-action="cancel-autofix"]');
  const previewAcceptIdentity = await stableIdentity(previewAccept);
  const previewCancelIdentity = await stableIdentity(previewCancel);
  await expect(previewAccept).toBeDisabled();
  await expect(previewCancel).toBeDisabled();
  const snapIssue = page.locator('[data-issue-kind="SNAP_GAP"]').first();
  await expect(snapIssue).toBeVisible();
  const beforePreview = await engineeringEvidence(host);
  await snapIssue.getByRole('button', { name: 'Preview MERGE_NODES' }).click();
  await expect(statusOutput(host)).toContainText('MERGE_NODES preview certified');
  await expect(previewAccept).toBeEnabled();
  await expect(previewCancel).toBeEnabled();
  await expectVisibleIcon(previewAccept, 'icon-accept');
  await expectVisibleIcon(previewCancel, 'icon-cancel');
  expect(await stableIdentity(previewAccept)).toEqual(previewAcceptIdentity);
  expect(await stableIdentity(previewCancel)).toEqual(previewCancelIdentity);
  const previewed = await engineeringEvidence(host);
  expect(previewed.canonicalHash).toBe(beforePreview.canonicalHash);
  expect(previewed.journalHash).toBe(beforePreview.journalHash);
  expect(previewed.previewHash).not.toBe('');
  expect(previewed.previewCertificationHash).not.toBe('');
  await previewCancel.click();
  const cancelled = await engineeringEvidence(host);
  expect(cancelled.canonicalHash).toBe(beforePreview.canonicalHash);
  expect(cancelled.journalHash).toBe(beforePreview.journalHash);
  expect(cancelled.previewHash).toBe('');

  const fitSelection = host.locator('[data-navigation-action="fit-selection"]');
  const move = host.locator('[data-command-action="move-positive-z"]');
  const undo = host.locator('[data-action="undo"]');
  const redo = host.locator('[data-action="redo"]');
  await expect(fitSelection).toBeDisabled();
  await expect(move).toBeDisabled();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await selectFirstNodeThroughObjectTree(host);
  await closePanel(host, 'topology-edit-object-tree');
  await openPanel(host, 'views');
  const fitSelectionIdentity = await stableIdentity(fitSelection);
  await expect(fitSelection).toBeEnabled();
  await expectVisibleIcon(fitSelection, 'icon-fit-selection');
  await fitSelection.click();
  await expect(statusOutput(host)).toContainText('Focused 1 canonical selection object(s).');
  expect(await stableIdentity(fitSelection)).toEqual(fitSelectionIdentity);
  await closePanel(host, 'views');

  await openPanel(host, 'commands');
  const moveIdentity = await stableIdentity(move);
  await expect(move).toBeEnabled();
  await expectVisibleIcon(move, 'icon-move');
  const beforeMove = await engineeringEvidence(host);
  await move.click();
  await expect(statusOutput(host)).toContainText('MOVE_NODE accepted');
  const moved = await engineeringEvidence(host);
  expect(moved.canonicalHash).not.toBe(beforeMove.canonicalHash);
  expect(moved.journalHash).not.toBe(beforeMove.journalHash);
  expect(moved.sessionVersion).toBe(beforeMove.sessionVersion + 1);
  expect(moved.activeCommandCount).toBe(1);
  expect(await stableIdentity(move)).toEqual(moveIdentity);
  await closePanel(host, 'commands');

  const undoIdentity = await stableIdentity(undo);
  const redoIdentity = await stableIdentity(redo);
  const saveDraft = host.locator('[data-action="save-draft"]');
  const saveIdentity = await stableIdentity(saveDraft);
  await expect(undo).toBeEnabled();
  await expect(saveDraft).toBeEnabled();
  await expectVisibleIcon(undo, 'icon-undo');
  await expectVisibleIcon(saveDraft, 'icon-save');
  const beforeSave = await engineeringEvidence(host);
  await saveDraft.click();
  await expect(statusOutput(host)).toContainText('Draft saved:');
  const afterSave = await engineeringEvidence(host);
  expect(afterSave.canonicalHash).toBe(beforeSave.canonicalHash);
  expect(afterSave.journalHash).toBe(beforeSave.journalHash);
  expect(await stableIdentity(saveDraft)).toEqual(saveIdentity);

  await undo.click();
  const undone = await engineeringEvidence(host);
  expect(undone.canonicalHash).toBe(beforeMove.canonicalHash);
  expect(undone.activeCommandCount).toBe(0);
  await expect(redo).toBeEnabled();
  await expectVisibleIcon(redo, 'icon-redo');
  expect(await stableIdentity(undo)).toEqual(undoIdentity);
  expect(await stableIdentity(redo)).toEqual(redoIdentity);
  await redo.click();
  const redone = await engineeringEvidence(host);
  expect(redone.canonicalHash).toBe(moved.canonicalHash);
  expect(redone.activeCommandCount).toBe(1);
  await undo.click();
  const restored = await engineeringEvidence(host);
  expect(restored.canonicalHash).toBe(baseline.canonicalHash);
  expect(restored.activeCommandCount).toBe(0);

  await openPanel(host, 'display');
  const hide = host.locator('[data-action="hide-selected"]');
  const isolate = host.locator('[data-action="isolate-selected"]');
  const displayBaseline = await engineeringEvidence(host);
  await expect(hide).toBeEnabled();
  await expect(isolate).toBeEnabled();
  await hide.click();
  await expect(host.locator('[data-role="presentation-visibility-status"]')).toHaveText('Hidden: 1');
  await host.locator('[data-action="show-all"]').click();
  await expect(host.locator('[data-role="presentation-visibility-status"]')).toHaveText('Visibility: all');
  await isolate.click();
  await expect(host.locator('[data-role="presentation-visibility-status"]')).toHaveText('Isolated: 1');
  await host.locator('[data-action="reset-presentation"]').click();
  await expect(host.locator('[data-role="presentation-visibility-status"]')).toHaveText('Visibility: all');

  await openSectionControls(host);
  const bounds = { 'min-x': -10000, 'max-x': 10000, 'min-y': -10000, 'max-y': 10000, 'min-z': -10000, 'max-z': 10000 };
  for (const [name, value] of Object.entries(bounds)) {
    await host.locator(`[data-section-bound="${name}"]`).fill(String(value));
  }
  const applySection = host.locator('[data-action="apply-section-box"]');
  const clearSection = host.locator('[data-action="clear-section-box"]');
  await expectVisibleIcon(applySection, 'icon-section-apply');
  await applySection.click();
  await expect(host.locator('[data-role="presentation-section-status"]')).toHaveText('Section: active');
  await expectVisibleIcon(clearSection, 'icon-section-clear');
  await clearSection.click();
  await expect(host.locator('[data-role="presentation-section-status"]')).toHaveText('Section: off');
  await closePanel(host, 'display');
  const afterDisplay = await engineeringEvidence(host);
  expect(afterDisplay.canonicalHash).toBe(displayBaseline.canonicalHash);
  expect(afterDisplay.journalHash).toBe(displayBaseline.journalHash);

  const finalEngineering = await engineeringEvidence(host);
  expect(finalEngineering.canonicalHash).toBe(baseline.canonicalHash);
  expect(finalEngineering.activeCommandCount).toBe(0);
  expect(finalEngineering.previewHash).toBe('');
  expect(finalEngineering.sourceHash).toBe(baseline.sourceHash);

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify({
    schema: 'TopologyEditIconVisualCustodyEvidence.v2',
    status: 'PASS_PRODUCTION_ICON_STATE_CUSTODY',
    candidateSha: candidateSha(testInfo),
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    fixture: FIXTURE,
    webgl,
    baseline,
    moved,
    restored: finalEngineering,
    preview: {
      before: beforePreview,
      certified: previewed,
      cancelled,
      canonicalMutationDuringPreview: previewed.canonicalHash !== beforePreview.canonicalHash,
    },
    commandAuthority: 'existing governed command/journal path',
    directControllerInvocation: false,
    screenshot: 'reports/qualification/topology-edit-icon-state-custody.png',
    trace: 'Playwright trace attachment for topology-edit-tool-icon-custody.spec.js',
  }, null, 2)}\n`);
  await testInfo.attach('icon-state-custody-ledger', { path: REPORT_PATH, contentType: 'application/json' });
  await testInfo.attach('icon-state-custody-screenshot', { path: SCREENSHOT_PATH, contentType: 'image/png' });
});

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

async function loadDemoAndEnterWithoutIconWait(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible({ timeout: 60_000 });
  await expect(host).toHaveAttribute('data-topology-edit-clean-shell', 'true');
  return host;
}

async function collectWebglEvidence(host) {
  const canvas = host.locator('canvas[data-viewport-backend="topology-edit-webgl"]');
  await expect(canvas).toBeVisible();
  return canvas.evaluate((node) => {
    const gl = node.getContext('webgl2') || node.getContext('webgl');
    const debug = gl?.getExtension?.('WEBGL_debug_renderer_info');
    const webgl2Ctor = globalThis.WebGL2RenderingContext;
    return {
      backend: node.dataset.viewportBackend ?? null,
      live: Boolean(gl && !gl.isContextLost()),
      contextType: gl && webgl2Ctor && gl instanceof webgl2Ctor ? 'webgl2' : (gl ? 'webgl' : null),
      version: gl?.getParameter?.(gl.VERSION) ?? null,
      shadingLanguageVersion: gl?.getParameter?.(gl.SHADING_LANGUAGE_VERSION) ?? null,
      vendor: gl?.getParameter?.(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR) ?? null,
      renderer: gl?.getParameter?.(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) ?? null,
      drawingBuffer: { width: gl?.drawingBufferWidth ?? 0, height: gl?.drawingBufferHeight ?? 0 },
    };
  });
}

async function engineeringEvidence(host) {
  return host.evaluate((element) => ({
    canonicalHash: element.dataset.topologyEditCanonicalHash || '',
    sourceHash: element.dataset.topologyEditSourceHash || '',
    journalHash: element.dataset.topologyEditJournalHash || '',
    sessionVersion: Number(element.dataset.topologyEditSessionVersion || 0),
    activeCommandCount: Number(element.dataset.topologyEditActiveCommandCount || 0),
    previewHash: element.dataset.topologyEditPreviewHash || '',
    previewCertificationHash: element.dataset.topologyEditPreviewCertificationHash || '',
    selectionRevision: Number(element.dataset.topologyEditSelectionRevision || 0),
  }));
}

async function stableIdentity(locator) {
  return locator.evaluate((control) => ({
    action: control.dataset.action ?? null,
    navigationMode: control.dataset.navigationMode ?? null,
    navigationAction: control.dataset.navigationAction ?? null,
    standardView: control.dataset.standardView ?? null,
    commandAction: control.dataset.commandAction ?? null,
  }));
}

function statusOutput(host) {
  return host.locator('[data-role="topology-edit-status"]');
}
