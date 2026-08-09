import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TOPOLOGY_EDIT_ICON_MANIFEST,
  TOPOLOGY_EDIT_ICON_SURFACE,
} from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';

const REPORT_DIR = resolve('reports/qualification');
const REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-manifest.json');
const SCREENSHOT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-manifest.png');
const HISTORICAL_EXPECTED = Object.freeze({
  'navigation.orbit': 'icon-orbit',
  'navigation.pan': 'icon-pan',
  'history.undo': 'icon-undo',
  'history.redo': 'icon-redo',
  'draft.save': 'icon-save',
  'command.move-positive-z': 'icon-move',
});

const PANEL_BY_SURFACE = Object.freeze({
  [TOPOLOGY_EDIT_ICON_SURFACE.VIEWS]: 'views',
  [TOPOLOGY_EDIT_ICON_SURFACE.ENGINEERING_COMMAND]: 'commands',
  [TOPOLOGY_EDIT_ICON_SURFACE.DRAFT_AUDIT]: 'draft',
  [TOPOLOGY_EDIT_ICON_SURFACE.DISPLAY]: 'display',
});

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('42-control production manifest resolves to visibly rendered SVG icons', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  const host = await openTopologyEdit(page);
  await expect(host).toHaveAttribute('data-topology-edit-icon-manifest-count', '42');
  await expect(host).toHaveAttribute('data-topology-edit-icon-binding-count', '42');
  await expect(host).toHaveAttribute('data-topology-edit-icon-symbol-count', '41');
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  await expect(host).toHaveAttribute('data-topology-edit-icon-broken-reference-count', '0');
  await expect(host).toHaveAttribute('data-topology-edit-icon-unresolved-reference-count', '0');
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);

  const rows = [];
  for (const entry of TOPOLOGY_EDIT_ICON_MANIFEST) {
    await openApplicableSurface(host, entry.surface);
    const locator = host.locator(entry.selector);
    await expect(locator, entry.key).toHaveCount(1);
    const evidence = await inspectControl(locator, entry);
    expect(evidence.bindingKey, entry.key).toBe(entry.key);
    expect(evidence.bindingSymbol, entry.key).toBe(entry.symbolId);
    expect(evidence.actualReference, entry.key).toBe(`#${entry.symbolId}`);
    expect(evidence.targetCount, entry.key).toBe(1);
    expect(evidence.drawableGeometryCount, entry.key).toBeGreaterThan(0);
    expect(evidence.renderedBounds.width, entry.key).toBeGreaterThan(0);
    expect(evidence.renderedBounds.height, entry.key).toBeGreaterThan(0);
    expect(evidence.useBounds.width, entry.key).toBeGreaterThan(0);
    expect(evidence.useBounds.height, entry.key).toBeGreaterThan(0);
    expect(evidence.computedVisibility.visible, entry.key).toBe(true);
    expect(evidence.referenceStatus, entry.key).toBe('VISUALLY_RENDERED');
    expect(evidence.bindingIdentity, entry.key).toEqual(identityFromSelector(entry.selector));
    rows.push({
      candidateSha: candidateSha(testInfo),
      manifestKey: entry.key,
      selector: entry.selector,
      label: entry.label,
      surface: entry.surface,
      expectedSymbolId: entry.symbolId,
      historicalFragmentId: entry.historicalFragmentId,
      ...evidence,
      remountCycle: 0,
    });
  }

  for (const [key, symbolId] of Object.entries(HISTORICAL_EXPECTED)) {
    expect(TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === key)?.historicalFragmentId)
      .toBe(symbolId);
  }
  expect(TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'navigation.fit')
    ?.historicalFragmentId).toBeNull();

  const aggregate = rows.reduce((summary, row) => {
    summary[row.referenceStatus] = (summary[row.referenceStatus] ?? 0) + 1;
    return summary;
  }, { BROKEN: 0, UNRESOLVED: 0, NO_SVG_ICONS: 0, RESOLVED: 0, VISUALLY_RENDERED: 0 });
  expect(aggregate).toEqual({
    BROKEN: 0,
    UNRESOLVED: 0,
    NO_SVG_ICONS: 0,
    RESOLVED: 0,
    VISUALLY_RENDERED: 42,
  });

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify({
    candidateSha: candidateSha(testInfo),
    manifestCount: TOPOLOGY_EDIT_ICON_MANIFEST.length,
    aggregate,
    duplicateSpriteCount: 0,
    rows,
  }, null, 2)}\n`);
  await testInfo.attach('production-icon-manifest', { path: REPORT_PATH, contentType: 'application/json' });
  await testInfo.attach('production-icon-shell', { path: SCREENSHOT_PATH, contentType: 'image/png' });
});

test('production icon identity survives real UI states and deactivate/reactivate cycles', async ({ page }) => {
  let host = await openTopologyEdit(page);
  const orbit = host.locator('[data-navigation-mode="orbit"]');
  const pan = host.locator('[data-navigation-mode="pan"]');
  const select = host.locator('[data-navigation-mode="select"]');
  await orbit.click();
  await expect(orbit).toHaveAttribute('aria-pressed', 'true');
  await expectVisibleIcon(orbit, 'icon-orbit');
  await pan.click();
  await expect(pan).toHaveAttribute('aria-pressed', 'true');
  await expectVisibleIcon(pan, 'icon-pan');
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');

  const shortcuts = host.locator('.topology-edit-clean-shell__utilities [data-action="toggle-shortcuts"]');
  await shortcuts.click();
  await expect(shortcuts).toHaveAttribute('aria-expanded', 'true');
  await expectVisibleIcon(shortcuts, 'icon-shortcuts');
  await host.locator('[data-role="topology-edit-shortcuts"] [data-action="toggle-shortcuts"]').click();
  await expect(shortcuts).toHaveAttribute('aria-expanded', 'false');

  const inspector = host.locator('[data-action="toggle-inspector"]');
  await inspector.click();
  await expect(inspector).toHaveAttribute('aria-pressed', 'false');
  await expectVisibleIcon(inspector, 'icon-inspector');
  await inspector.click();
  await expect(inspector).toHaveAttribute('aria-pressed', 'true');

  const fitSelection = host.locator('[data-navigation-action="fit-selection"]');
  const move = host.locator('[data-command-action="move-positive-z"]');
  const undo = host.locator('[data-action="undo"]');
  const redo = host.locator('[data-action="redo"]');
  await expect(fitSelection).toBeDisabled();
  await expect(move).toBeDisabled();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await selectFirstNodeThroughObjectTree(host);
  await expect(fitSelection).toBeEnabled();
  await openPanel(host, 'commands');
  await expect(move).toBeEnabled();
  const baselineHash = await host.getAttribute('data-topology-edit-canonical-hash');
  await move.click();
  await expect.poll(() => host.getAttribute('data-topology-edit-canonical-hash')).not.toBe(baselineHash);
  await expect(undo).toBeEnabled();
  await expectVisibleIcon(undo, 'icon-undo');
  await undo.click();
  await expect(host).toHaveAttribute('data-topology-edit-canonical-hash', baselineHash);
  await expect(redo).toBeEnabled();
  await expectVisibleIcon(redo, 'icon-redo');
  await redo.click();
  await expect.poll(() => host.getAttribute('data-topology-edit-canonical-hash')).not.toBe(baselineHash);
  await undo.click();

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
    await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);
    await host.locator('[data-action="exit-topology-edit"]').click();
    await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(0);
    const staleProbe = await installBrokenProbe(page);
    await page.waitForTimeout(100);
    await expect(staleProbe).toHaveAttribute('href', '#icon-undo-broken');
    await staleProbe.evaluate((element) => element.closest('svg')?.remove());
    await page.getByRole('button', { name: '3D Edit', exact: true }).click();
    host = page.locator('[data-role="topology-edit-render-host"]');
    await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
    await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
    await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
    await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);
  }
});

async function openTopologyEdit(page) {
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
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  return host;
}

async function openApplicableSurface(host, surface) {
  const kind = PANEL_BY_SURFACE[surface];
  if (kind) await openPanel(host, kind);
}

async function openPanel(host, kind) {
  const details = host.locator(`details[data-panel-kind="${kind}"]`);
  await expect(details).toHaveCount(1);
  if (!(await details.evaluate((element) => element.open))) {
    await details.locator(':scope > summary').click();
  }
  await expect(details).toHaveAttribute('open', '');
}

async function selectFirstNodeThroughObjectTree(host) {
  await openPanel(host, 'topology-edit-object-tree');
  const tree = host.locator('[data-role="topology-edit-object-tree"]');
  const group = tree.locator('details[data-object-tree-group="nodes"]');
  if (!(await group.evaluate((element) => element.open))) await group.locator(':scope > summary').click();
  await group.locator('[data-object-tree-select]').first().click();
  await expect.poll(async () => Number(await host.getAttribute('data-topology-edit-selection-count')))
    .toBeGreaterThan(0);
}

async function inspectControl(locator, entry) {
  return locator.evaluate((control, expected) => {
    const icon = control.querySelector(':scope > svg[data-topology-edit-icon-key]');
    const use = icon?.querySelector(':scope > use');
    const actualReference = use?.getAttribute('href') ?? '';
    const id = actualReference.startsWith('#') ? actualReference.slice(1) : '';
    const targets = id ? [...control.ownerDocument.querySelectorAll(`#${CSS.escape(id)}`)] : [];
    const target = targets[0] ?? null;
    const drawableGeometryCount = target?.querySelectorAll(
      'path,rect,circle,ellipse,line,polyline,polygon',
    ).length ?? 0;
    const rect = icon?.getBoundingClientRect() ?? { width: 0, height: 0 };
    let bbox = { width: 0, height: 0 };
    try { bbox = use?.getBBox?.() ?? bbox; } catch { /* browser reports zero below */ }
    let visible = Boolean(icon && use);
    let node = icon;
    while (visible && node && node.nodeType === Node.ELEMENT_NODE) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse'
          || Number(style.opacity) <= 0) visible = false;
      if (node === control) break;
      node = node.parentElement;
    }
    let referenceStatus = 'RESOLVED';
    if (!use) referenceStatus = 'NO_SVG_ICONS';
    else if (actualReference.endsWith('-broken')) referenceStatus = 'BROKEN';
    else if (targets.length !== 1) referenceStatus = 'UNRESOLVED';
    else if (drawableGeometryCount > 0 && rect.width > 0 && rect.height > 0
      && bbox.width > 0 && bbox.height > 0 && visible) referenceStatus = 'VISUALLY_RENDERED';
    return {
      actualReference,
      referenceStatus,
      resolvedTargetId: target?.id ?? null,
      targetCount: targets.length,
      drawableGeometryCount,
      renderedBounds: { width: rect.width, height: rect.height },
      useBounds: { width: bbox.width, height: bbox.height },
      computedVisibility: { visible },
      state: {
        disabled: Boolean(control.disabled),
        pressed: control.getAttribute('aria-pressed'),
        expanded: control.getAttribute('aria-expanded'),
      },
      bindingKey: control.dataset.topologyEditIconKey ?? null,
      bindingSymbol: control.dataset.topologyEditIconSymbol ?? null,
      bindingIdentity: {
        action: control.dataset.action ?? null,
        navigationMode: control.dataset.navigationMode ?? null,
        navigationAction: control.dataset.navigationAction ?? null,
        standardView: control.dataset.standardView ?? null,
        commandAction: control.dataset.commandAction ?? null,
      },
      expectedKey: expected.key,
    };
  }, entry);
}

async function expectVisibleIcon(locator, symbolId) {
  const icon = locator.locator(':scope > svg[data-topology-edit-icon-key]');
  await expect(icon).toBeVisible();
  await expect(icon.locator('use')).toHaveAttribute('href', `#${symbolId}`);
}

async function installBrokenProbe(page) {
  return page.locator('[data-role="topology-edit-render-host"]').evaluateHandle((host) => {
    const svg = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.dataset.staleIconProbe = 'true';
    use.setAttribute('href', '#icon-undo-broken');
    svg.append(use);
    host.append(svg);
    return use;
  }).then(() => page.locator('[data-stale-icon-probe="true"]'));
}

function identityFromSelector(selector) {
  const identity = { action: null, navigationMode: null, navigationAction: null, standardView: null, commandAction: null };
  const pairs = [
    ['data-action', 'action'],
    ['data-navigation-mode', 'navigationMode'],
    ['data-navigation-action', 'navigationAction'],
    ['data-standard-view', 'standardView'],
    ['data-command-action', 'commandAction'],
  ];
  for (const [attribute, key] of pairs) {
    const match = selector.match(new RegExp(`\\[${attribute}="([^"]+)"\\]`));
    if (match) identity[key] = match[1];
  }
  return identity;
}

function candidateSha(testInfo) {
  return process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA
    ?? process.env.GITHUB_SHA
    ?? testInfo.config.metadata?.candidateSha
    ?? 'LOCAL_UNSEALED';
}
