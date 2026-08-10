import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  candidateSha,
  closePanel,
  expectVisibleIcon,
  openPanel,
  openSectionControls,
  openTopologyEdit,
  selectFirstNodeThroughObjectTree,
} from './helpers/topology-edit-icon-qualification.js';
import {
  applyCustodyRunContext,
  collectWebglEvidence,
  engineeringEvidence,
  FIXTURE,
  REPORT_DIR,
  REPORT_PATH,
  SCREENSHOT_PATH,
  stableIdentity,
  statusOutput,
} from './helpers/topology-edit-icon-custody-support.js';

applyCustodyRunContext(test);

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
