import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPOLOGY_EDIT_ICON_MANIFEST } from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';
import {
  candidateSha,
  inspectControl,
  openTopologyEdit,
} from './helpers/topology-edit-icon-qualification.js';

const REPORT_DIR = resolve('reports/qualification');
const REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-clipping-sanity.json');
const UNDO = TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'history.undo');

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('production qualification fails closed for clipping, opacity, and fixed-control custody mutations', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  const host = await openTopologyEdit(page);
  const control = host.locator(UNDO.selector);
  const icon = control.locator(':scope > svg[data-topology-edit-icon-key]');
  const symbolGeometry = page.locator(`#${UNDO.symbolId} path, #${UNDO.symbolId} rect, #${UNDO.symbolId} circle, #${UNDO.symbolId} ellipse, #${UNDO.symbolId} line, #${UNDO.symbolId} polyline, #${UNDO.symbolId} polygon`);
  await expect(control).toHaveCount(1);
  await expect(icon).toBeVisible();
  await expect(symbolGeometry).not.toHaveCount(0);

  const baseline = await inspectControl(control, UNDO);
  expect(baseline.referenceStatus).toBe('VISUALLY_RENDERED');
  expect(baseline.computedVisibility.visible).toBe(true);
  expect(baseline.computedVisibility.clipPaths).toEqual([]);
  expect(baseline.computedVisibility.opacityThreshold).toBe(0.01);

  await icon.evaluate((node) => { node.style.clipPath = 'inset(50%)'; });
  const insetClipped = await inspectControl(control, UNDO);
  expect(insetClipped.referenceStatus).toBe('RESOLVED');
  expect(insetClipped.computedVisibility.visible).toBe(false);
  expect(insetClipped.computedVisibility.clipPaths).toEqual(expect.arrayContaining([
    expect.objectContaining({
      kind: 'INSET',
      certifiable: true,
      fullyClipped: true,
      visibleWidth: 0,
      visibleHeight: 0,
    }),
  ]));

  await icon.evaluate((node) => { node.style.removeProperty('clip-path'); });
  await expect.poll(async () => (await inspectControl(control, UNDO)).referenceStatus)
    .toBe('VISUALLY_RENDERED');

  await icon.evaluate((node) => { node.style.clipPath = 'circle(0 at 50% 50%)'; });
  const circleClipped = await inspectControl(control, UNDO);
  expect(circleClipped.referenceStatus).toBe('RESOLVED');
  expect(circleClipped.computedVisibility.visible).toBe(false);
  expect(circleClipped.computedVisibility.clipPaths).toEqual(expect.arrayContaining([
    expect.objectContaining({
      kind: 'CIRCLE',
      certifiable: true,
      fullyClipped: true,
      radius: 0,
    }),
  ]));

  await icon.evaluate((node) => { node.style.removeProperty('clip-path'); });
  await expect.poll(async () => (await inspectControl(control, UNDO)).referenceStatus)
    .toBe('VISUALLY_RENDERED');

  await icon.evaluate((node) => { node.style.clipPath = 'url("#topology-edit-unproven-clip")'; });
  const unprovenClip = await inspectControl(control, UNDO);
  expect(unprovenClip.referenceStatus).toBe('RESOLVED');
  expect(unprovenClip.computedVisibility.visible).toBe(false);
  expect(unprovenClip.computedVisibility.clipPaths).toEqual(expect.arrayContaining([
    expect.objectContaining({
      kind: 'UNPROVEN',
      certifiable: false,
      fullyClipped: null,
    }),
  ]));

  await icon.evaluate((node) => { node.style.removeProperty('clip-path'); });
  await expect.poll(async () => (await inspectControl(control, UNDO)).referenceStatus)
    .toBe('VISUALLY_RENDERED');

  await icon.evaluate((node) => { node.style.opacity = '0.005'; });
  const nearTransparentPresentation = await inspectControl(control, UNDO);
  expect(nearTransparentPresentation.referenceStatus).toBe('RESOLVED');
  expect(nearTransparentPresentation.computedVisibility.visible).toBe(false);
  expect(nearTransparentPresentation.computedVisibility.effectiveOpacity).toBeLessThanOrEqual(
    nearTransparentPresentation.computedVisibility.opacityThreshold,
  );

  await icon.evaluate((node) => { node.style.removeProperty('opacity'); });
  await expect.poll(async () => (await inspectControl(control, UNDO)).referenceStatus)
    .toBe('VISUALLY_RENDERED');

  await symbolGeometry.evaluateAll((nodes) => nodes.forEach((node) => {
    node.style.fillOpacity = '0.005';
    node.style.strokeOpacity = '0.005';
  }));
  const nearTransparentPaint = await inspectControl(control, UNDO);
  expect(nearTransparentPaint.referenceStatus).toBe('RESOLVED');
  expect(nearTransparentPaint.computedVisibility.visible).toBe(false);
  expect(nearTransparentPaint.drawableGeometryCount).toBe(0);

  await symbolGeometry.evaluateAll((nodes) => nodes.forEach((node) => {
    node.style.removeProperty('fill-opacity');
    node.style.removeProperty('stroke-opacity');
  }));
  const restored = await inspectControl(control, UNDO);
  expect(restored.referenceStatus).toBe('VISUALLY_RENDERED');
  expect(restored.actualReference).toBe(`#${UNDO.symbolId}`);
  expect(restored.computedVisibility.visible).toBe(true);

  const custodyBaseline = await inspectStrictFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST);
  expect(custodyBaseline.iconBearingControlCount).toBe(42);
  expect(custodyBaseline.extraIconBearingControlCount).toBe(0);
  expect(custodyBaseline.duplicateIconChildCount).toBe(0);
  expect(custodyBaseline.violationControlCount).toBe(0);

  await control.evaluate((button) => {
    const clone = button.cloneNode(true);
    clone.dataset.action = 'qualification-rogue-icon-control';
    clone.dataset.topologyEditIconKey = 'qualification.rogue';
    clone.dataset.iconMutationRogueControl = 'true';
    clone.removeAttribute('id');
    const use = clone.querySelector('svg use');
    use?.setAttribute('href', '#qualification-rogue-symbol');
    button.parentElement?.append(clone);
  });
  const rogueControlCustody = await inspectStrictFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST);
  expect(rogueControlCustody.iconBearingControlCount).toBe(43);
  expect(rogueControlCustody.extraIconBearingControlCount).toBe(1);
  expect(rogueControlCustody.violationControlCount).toBe(1);
  expect(rogueControlCustody.violations).toEqual(expect.arrayContaining([
    expect.objectContaining({
      key: 'qualification.rogue',
      references: expect.arrayContaining(['#qualification-rogue-symbol']),
      reasons: expect.arrayContaining(['binding-key-outside-manifest']),
    }),
  ]));
  await host.locator('[data-icon-mutation-rogue-control="true"]').evaluate((node) => node.remove());
  await expect.poll(async () => (
    await inspectStrictFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST)
  ).extraIconBearingControlCount).toBe(0);

  await icon.evaluate((node) => {
    const duplicate = node.cloneNode(true);
    duplicate.removeAttribute('data-topology-edit-icon-key');
    duplicate.dataset.iconMutationDuplicateChild = 'true';
    node.parentElement?.append(duplicate);
  });
  const duplicateChildCustody = await inspectStrictFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST);
  expect(duplicateChildCustody.iconBearingControlCount).toBe(42);
  expect(duplicateChildCustody.extraIconBearingControlCount).toBe(0);
  expect(duplicateChildCustody.duplicateIconChildCount).toBe(1);
  expect(duplicateChildCustody.violationControlCount).toBe(1);
  expect(duplicateChildCustody.violations).toEqual(expect.arrayContaining([
    expect.objectContaining({
      key: UNDO.key,
      reasons: expect.arrayContaining(['icon-child-cardinality:2']),
    }),
  ]));
  await control.locator(':scope > svg[data-icon-mutation-duplicate-child="true"]')
    .evaluate((node) => node.remove());

  const custodyRestored = await inspectStrictFixedControlCustody(host, TOPOLOGY_EDIT_ICON_MANIFEST);
  expect(custodyRestored.iconBearingControlCount).toBe(42);
  expect(custodyRestored.extraIconBearingControlCount).toBe(0);
  expect(custodyRestored.duplicateIconChildCount).toBe(0);
  expect(custodyRestored.violationControlCount).toBe(0);

  writeFileSync(REPORT_PATH, `${JSON.stringify({
    schema: 'TopologyEditIconPresentationAndCustodySanityEvidence.v4',
    status: 'PASS_FAIL_CLOSED_PRESENTATION_AND_FIXED_CONTROL_CUSTODY_SANITY',
    candidateSha: candidateSha(testInfo),
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    manifestKey: UNDO.key,
    selector: UNDO.selector,
    expectedSymbolId: UNDO.symbolId,
    baseline,
    insetClipped,
    circleClipped,
    unprovenClip,
    nearTransparentPresentation,
    nearTransparentPaint,
    restored,
    strictCustody: {
      baseline: custodyBaseline,
      rogueControl: rogueControlCustody,
      duplicateChild: duplicateChildCustody,
      restored: custodyRestored,
    },
    candidateRestoredUnchanged: true,
    qualificationAuthority: [
      'inspectControl shared production visual-custody predicate',
      'direct fixed-control SVG child custody independent of fragment naming',
    ],
  }, null, 2)}\n`);
  await testInfo.attach('icon-clipping-sanity', {
    path: REPORT_PATH,
    contentType: 'application/json',
  });
});

async function inspectStrictFixedControlCustody(host, manifest) {
  return host.evaluate((root, expectedEntries) => {
    const stableSelector = [
      'button[data-action]',
      'button[data-navigation-mode]',
      'button[data-navigation-action]',
      'button[data-standard-view]',
      'button[data-command-action]',
    ].join(',');
    const expectedByKey = new Map(expectedEntries.map((entry) => [entry.key, entry]));
    const stableControls = [...root.querySelectorAll(stableSelector)];
    const iconBearingControls = stableControls.filter((button) => (
      button.querySelectorAll(':scope > svg').length > 0
    ));
    const violations = [];
    let extraIconBearingControlCount = 0;
    let duplicateIconChildCount = 0;

    const controls = iconBearingControls.map((button) => {
      const key = button.dataset.topologyEditIconKey ?? null;
      const expected = key ? expectedByKey.get(key) : null;
      const directIcons = [...button.querySelectorAll(':scope > svg')];
      const boundIcons = directIcons.filter((svg) => svg.hasAttribute('data-topology-edit-icon-key'));
      const references = directIcons.flatMap((svg) => [...svg.querySelectorAll('use')])
        .map((use) => use.getAttribute('href')
          ?? use.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href')
          ?? '');
      const reasons = [];
      if (!expected) {
        reasons.push('binding-key-outside-manifest');
        extraIconBearingControlCount += 1;
      }
      if (expected && !button.matches(expected.selector)) reasons.push('stable-selector-mismatch');
      if (directIcons.length !== 1) reasons.push(`icon-child-cardinality:${directIcons.length}`);
      if (boundIcons.length !== 1) reasons.push(`bound-icon-child-cardinality:${boundIcons.length}`);
      duplicateIconChildCount += Math.max(0, directIcons.length - 1);
      if (reasons.length) {
        violations.push({
          key,
          references,
          reasons,
          identity: {
            action: button.dataset.action ?? null,
            navigationMode: button.dataset.navigationMode ?? null,
            navigationAction: button.dataset.navigationAction ?? null,
            standardView: button.dataset.standardView ?? null,
            commandAction: button.dataset.commandAction ?? null,
          },
        });
      }
      return {
        key,
        references,
        iconChildCount: directIcons.length,
        boundIconChildCount: boundIcons.length,
      };
    });

    return {
      manifestCount: expectedEntries.length,
      stableControlCount: stableControls.length,
      iconBearingControlCount: iconBearingControls.length,
      extraIconBearingControlCount,
      duplicateIconChildCount,
      violationControlCount: violations.length,
      violations,
      controls,
    };
  }, manifest.map((entry) => ({
    key: entry.key,
    selector: entry.selector,
  })));
}
