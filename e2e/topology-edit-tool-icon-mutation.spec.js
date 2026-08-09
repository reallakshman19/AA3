import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPOLOGY_EDIT_ICON_MANIFEST } from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';
import {
  candidateSha,
  inspectControl,
  openApplicableSurface,
  openTopologyEdit,
} from './helpers/topology-edit-icon-qualification.js';

const REPORT_DIR = resolve('reports/qualification');
const REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-mutation-sanity.json');
const UNDO = TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'history.undo');
const REDO = TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'history.redo');

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('production icon qualification rejects adversarial mutations and restores exact candidate', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  let host = await openTopologyEdit(page);
  const observations = [];

  const initialUndo = await inspectControl(host.locator(UNDO.selector), UNDO);
  const initialRedo = await inspectControl(host.locator(REDO.selector), REDO);
  expect(qualificationPass(UNDO, initialUndo)).toBe(true);
  expect(qualificationPass(REDO, initialRedo)).toBe(true);

  const undoSymbolHtml = await page.locator('#icon-undo').evaluate((symbol) => symbol.outerHTML);
  await page.locator('#icon-undo').evaluate((symbol) => symbol.remove());
  const missing = await inspectControl(host.locator(UNDO.selector), UNDO);
  observations.push(observation('missing-symbol', UNDO, missing, 'UNRESOLVED'));
  expect(missing.referenceStatus).toBe('UNRESOLVED');
  expect(qualificationPass(UNDO, missing)).toBe(false);
  await restoreSymbol(host, undoSymbolHtml);
  await expect.poll(async () => qualificationPass(
    UNDO,
    await inspectControl(host.locator(UNDO.selector), UNDO),
  )).toBe(true);

  const redoGeometry = await page.locator('#icon-redo').evaluate((symbol) => symbol.innerHTML);
  await page.locator('#icon-redo').evaluate((symbol) => symbol.replaceChildren());
  const empty = await inspectControl(host.locator(REDO.selector), REDO);
  observations.push(observation('empty-geometry', REDO, empty, 'NOT_VISUALLY_RENDERED'));
  expect(empty.referenceStatus).toBe('RESOLVED');
  expect(empty.drawableGeometryCount).toBe(0);
  expect(qualificationPass(REDO, empty)).toBe(false);
  await page.locator('#icon-redo').evaluate((symbol, html) => { symbol.innerHTML = html; }, redoGeometry);
  await expect.poll(async () => qualificationPass(
    REDO,
    await inspectControl(host.locator(REDO.selector), REDO),
  )).toBe(true);

  const undoUse = host.locator(`${UNDO.selector} > svg[data-topology-edit-icon-key] use`);
  await undoUse.evaluate((use) => use.setAttribute('href', '#icon-redo'));
  const wrong = await inspectControl(host.locator(UNDO.selector), UNDO);
  observations.push(observation('wrong-symbol', UNDO, wrong, 'SYMBOL_MISMATCH'));
  expect(wrong.referenceStatus).toBe('VISUALLY_RENDERED');
  expect(wrong.actualReference).toBe('#icon-redo');
  expect(qualificationPass(UNDO, wrong)).toBe(false);
  await undoUse.evaluate((use) => use.setAttribute('href', '#icon-undo'));
  await expect.poll(async () => qualificationPass(
    UNDO,
    await inspectControl(host.locator(UNDO.selector), UNDO),
  )).toBe(true);

  const brokenImmediate = await undoUse.evaluate((use) => {
    use.setAttribute('href', '#icon-undo-broken');
    return use.getAttribute('href');
  });
  expect(brokenImmediate).toBe('#icon-undo-broken');
  const brokenObservation = {
    mutation: 'broken-reference',
    manifestKey: UNDO.key,
    expectedReference: '#icon-undo',
    immediateReference: brokenImmediate,
    immediateQualificationPass: false,
    expectedOutcome: 'BROKEN_THEN_REPAIRED',
  };
  await expect.poll(() => undoUse.getAttribute('href')).toBe('#icon-undo');
  const repaired = await inspectControl(host.locator(UNDO.selector), UNDO);
  expect(qualificationPass(UNDO, repaired)).toBe(true);
  observations.push({
    ...brokenObservation,
    recoveredReference: repaired.actualReference,
    recoveredStatus: repaired.referenceStatus,
    recoveredQualificationPass: qualificationPass(UNDO, repaired),
  });

  const undoIcon = host.locator(`${UNDO.selector} > svg[data-topology-edit-icon-key]`);
  await undoIcon.evaluate((icon) => { icon.style.display = 'none'; });
  const hidden = await inspectControl(host.locator(UNDO.selector), UNDO);
  observations.push(observation('css-hidden', UNDO, hidden, 'NOT_VISUALLY_RENDERED'));
  expect(hidden.referenceStatus).toBe('RESOLVED');
  expect(hidden.computedVisibility.visible).toBe(false);
  expect(qualificationPass(UNDO, hidden)).toBe(false);
  await undoIcon.evaluate((icon) => { icon.style.removeProperty('display'); });
  await expect.poll(async () => qualificationPass(
    UNDO,
    await inspectControl(host.locator(UNDO.selector), UNDO),
  )).toBe(true);

  const duplicate = await page.locator('svg[data-role="topology-edit-icon-sprite"]').evaluateHandle((sprite) => {
    const clone = sprite.cloneNode(true);
    clone.dataset.iconMutationDuplicate = 'true';
    sprite.after(clone);
    return clone;
  });
  const duplicated = await inspectControl(host.locator(UNDO.selector), UNDO);
  observations.push(observation('duplicate-sprite', UNDO, duplicated, 'UNRESOLVED'));
  expect(duplicated.targetCount).toBe(2);
  expect(duplicated.referenceStatus).toBe('UNRESOLVED');
  expect(qualificationPass(UNDO, duplicated)).toBe(false);
  await page.locator('svg[data-icon-mutation-duplicate="true"]').evaluate((sprite) => sprite.remove());
  await duplicate.dispose();
  await expect.poll(async () => qualificationPass(
    UNDO,
    await inspectControl(host.locator(UNDO.selector), UNDO),
  )).toBe(true);

  await host.locator('svg[data-topology-edit-icon-key]').evaluateAll((icons) => icons.forEach((icon) => icon.remove()));
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'NO_SVG_ICONS');
  observations.push({
    mutation: 'remove-all-production-uses',
    expectedOutcome: 'NO_SVG_ICONS_HARD_FAILURE',
    referenceStatus: 'NO_SVG_ICONS',
    qualificationPass: false,
  });

  host = await openTopologyEdit(page);
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
  await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);

  const restoredRows = [];
  for (const entry of TOPOLOGY_EDIT_ICON_MANIFEST) {
    await openApplicableSurface(host, entry);
    const evidence = await inspectControl(host.locator(entry.selector), entry);
    expect(qualificationPass(entry, evidence), entry.key).toBe(true);
    restoredRows.push({
      manifestKey: entry.key,
      referenceStatus: evidence.referenceStatus,
      actualReference: evidence.actualReference,
      qualificationPass: true,
    });
  }

  expect(observations.filter((entry) => entry.mutation !== 'broken-reference')
    .every((entry) => entry.qualificationPass === false)).toBe(true);
  expect(observations.find((entry) => entry.mutation === 'broken-reference')
    ?.recoveredQualificationPass).toBe(true);

  writeFileSync(REPORT_PATH, `${JSON.stringify({
    schema: 'TopologyEditIconMutationSanityEvidence.v2',
    candidateSha: candidateSha(testInfo),
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    observations,
    restoredAuthoritativeRun: true,
    restoredQualifiedCount: restoredRows.length,
    restoredRows,
  }, null, 2)}\n`);
  await testInfo.attach('icon-mutation-sanity', { path: REPORT_PATH, contentType: 'application/json' });
});

function qualificationPass(entry, evidence) {
  return evidence.actualReference === `#${entry.symbolId}`
    && evidence.bindingKey === entry.key
    && evidence.bindingSymbol === entry.symbolId
    && evidence.targetCount === 1
    && evidence.drawableGeometryCount > 0
    && evidence.computedVisibility?.visible === true
    && evidence.referenceStatus === 'VISUALLY_RENDERED';
}

function observation(mutation, entry, evidence, expectedOutcome) {
  return {
    mutation,
    manifestKey: entry.key,
    expectedReference: `#${entry.symbolId}`,
    expectedOutcome,
    actualReference: evidence.actualReference,
    referenceStatus: evidence.referenceStatus,
    targetCount: evidence.targetCount,
    drawableGeometryCount: evidence.drawableGeometryCount,
    computedVisibility: evidence.computedVisibility,
    qualificationPass: qualificationPass(entry, evidence),
  };
}

async function restoreSymbol(host, symbolHtml) {
  await host.evaluate((element, html) => {
    const sprite = element.ownerDocument.querySelector('svg[data-role="topology-edit-icon-sprite"]');
    sprite?.insertAdjacentHTML('beforeend', html);
  }, symbolHtml);
}
