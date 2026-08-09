import { expect } from '@playwright/test';
import { TOPOLOGY_EDIT_ICON_SURFACE } from '../../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';

const PANEL_BY_SURFACE = Object.freeze({
  [TOPOLOGY_EDIT_ICON_SURFACE.VIEWS]: 'views',
  [TOPOLOGY_EDIT_ICON_SURFACE.ENGINEERING_COMMAND]: 'commands',
  [TOPOLOGY_EDIT_ICON_SURFACE.DRAFT_AUDIT]: 'draft',
  [TOPOLOGY_EDIT_ICON_SURFACE.DISPLAY]: 'display',
});

export async function openTopologyEdit(page) {
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

export async function openApplicableSurface(host, surface) {
  const kind = PANEL_BY_SURFACE[surface];
  if (kind) await openPanel(host, kind);
}

export async function openPanel(host, kind) {
  const details = host.locator(`details[data-panel-kind="${kind}"]`);
  await expect(details).toHaveCount(1);
  if (!(await details.evaluate((element) => element.open))) {
    await details.locator(':scope > summary').click();
  }
  await expect(details).toHaveAttribute('open', '');
}

export async function selectFirstNodeThroughObjectTree(host) {
  await openPanel(host, 'topology-edit-object-tree');
  const tree = host.locator('[data-role="topology-edit-object-tree"]');
  const group = tree.locator('details[data-object-tree-group="nodes"]');
  if (!(await group.evaluate((element) => element.open))) {
    await group.locator(':scope > summary').click();
  }
  await group.locator('[data-object-tree-select]').first().click();
  await expect.poll(async () => Number(
    await host.getAttribute('data-topology-edit-selection-count'),
  )).toBeGreaterThan(0);
}

export async function inspectControl(locator, entry) {
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
    try { bbox = use?.getBBox?.() ?? bbox; } catch { /* zero below */ }
    let visible = Boolean(icon && use);
    let node = icon;
    while (visible && node && node.nodeType === Node.ELEMENT_NODE) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden'
          || style.visibility === 'collapse' || Number(style.opacity) <= 0) visible = false;
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

export async function expectVisibleIcon(locator, symbolId) {
  const icon = locator.locator(':scope > svg[data-topology-edit-icon-key]');
  await expect(icon).toBeVisible();
  await expect(icon.locator('use')).toHaveAttribute('href', `#${symbolId}`);
}

export async function installBrokenProbe(page) {
  await page.locator('[data-role="topology-edit-render-host"]').evaluate((host) => {
    const svg = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.dataset.staleIconProbe = 'true';
    use.setAttribute('href', '#icon-undo-broken');
    svg.append(use);
    host.append(svg);
  });
  return page.locator('[data-stale-icon-probe="true"]');
}

export function identityFromSelector(selector) {
  const identity = {
    action: null,
    navigationMode: null,
    navigationAction: null,
    standardView: null,
    commandAction: null,
  };
  for (const [attribute, key] of [
    ['data-action', 'action'],
    ['data-navigation-mode', 'navigationMode'],
    ['data-navigation-action', 'navigationAction'],
    ['data-standard-view', 'standardView'],
    ['data-command-action', 'commandAction'],
  ]) {
    const match = selector.match(new RegExp(`\\[${attribute}="([^"]+)"\\]`));
    if (match) identity[key] = match[1];
  }
  return identity;
}

export function candidateSha(testInfo) {
  return process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA
    ?? process.env.GITHUB_SHA
    ?? testInfo.config.metadata?.candidateSha
    ?? 'LOCAL_UNSEALED';
}
