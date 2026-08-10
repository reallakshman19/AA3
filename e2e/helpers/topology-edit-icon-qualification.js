import { expect } from '@playwright/test';
import { computeIconEvidence, GEOMETRY_SELECTOR } from './topology-edit-icon-visual-evidence.js';

export {
  closePanel,
  expectToolbarHitTargetsSeparated,
  openApplicableSurface,
  openPanel,
  openSectionControls,
  openTopologyEdit,
  selectFirstNodeThroughObjectTree,
} from './topology-edit-icon-navigation.js';

/**
 * Harvests one atomic snapshot of raw computed-style/geometry evidence for a
 * manifest control, then applies the VISUALLY_RENDERED rules in Node
 * (topology-edit-icon-visual-evidence.js). The page side deliberately makes no
 * visibility decisions; it only reports what the browser measured.
 */
export async function inspectControl(locator, entry) {
  await locator.scrollIntoViewIfNeeded();
  const raw = await locator.evaluate((control, context) => {
    const { geometrySelector, expected } = context;

    function chainRecords(start, stopBefore = null) {
      const records = [];
      for (let node = start; node && node !== stopBefore
        && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
        const style = getComputedStyle(node);
        const bounds = node.getBoundingClientRect?.() ?? { width: 0, height: 0 };
        records.push({
          tag: node.tagName.toLowerCase(),
          display: style.display,
          visibility: style.visibility,
          contentVisibility: style.contentVisibility,
          opacity: style.opacity,
          clipPath: style.clipPath,
          clip: style.clip,
          boundsWidth: bounds.width,
          boundsHeight: bounds.height,
        });
      }
      return records;
    }

    function harvestGeometry(target) {
      if (!target) return [];
      return [...target.querySelectorAll(geometrySelector)].map((node) => {
        const style = getComputedStyle(node);
        const ancestry = [];
        for (let cursor = node; cursor && cursor !== target; cursor = cursor.parentElement) {
          ancestry.push(cursor);
        }
        let bbox = { x: 0, y: 0, width: 0, height: 0 };
        let length = 0;
        try { bbox = node.getBBox?.() ?? bbox; } catch { /* logical extent remains zero */ }
        try { length = node.getTotalLength?.() ?? 0; } catch { /* unsupported */ }
        return {
          tag: node.tagName.toLowerCase(),
          fill: style.fill,
          fillOpacity: style.fillOpacity,
          stroke: style.stroke,
          strokeOpacity: style.strokeOpacity,
          strokeWidth: style.strokeWidth,
          usesCurrentColor: ancestry.some((cursor) => (
            String(cursor.getAttribute('fill') || '').toLowerCase() === 'currentcolor'
            || String(cursor.getAttribute('stroke') || '').toLowerCase() === 'currentcolor'
          )),
          bounds: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          length,
          chain: chainRecords(node, target),
        };
      });
    }

    const icon = control.querySelector(':scope > svg[data-topology-edit-icon-key]');
    const use = icon?.querySelector(':scope > use');
    const actualReference = use?.getAttribute('href')
      ?? use?.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href')
      ?? '';
    const id = actualReference.startsWith('#') ? actualReference.slice(1) : '';
    const targets = id ? [...control.ownerDocument.querySelectorAll(`#${CSS.escape(id)}`)] : [];
    const target = targets[0] ?? null;

    const rect = icon?.getBoundingClientRect() ?? { width: 0, height: 0, top: 0, left: 0 };
    let useBounds = { x: 0, y: 0, width: 0, height: 0 };
    try { useBounds = use?.getBBox?.() ?? useBounds; } catch { /* zero below */ }
    const viewBox = icon?.viewBox?.baseVal;

    return {
      hasUse: Boolean(use),
      actualReference,
      resolvedTargetId: target?.id ?? null,
      targetCount: targets.length,
      useColor: use ? getComputedStyle(use).color : null,
      useChain: chainRecords(use),
      rawGeometry: harvestGeometry(target),
      renderedBounds: {
        width: rect.width, height: rect.height, top: rect.top, left: rect.left,
      },
      useBounds: {
        x: useBounds.x, y: useBounds.y, width: useBounds.width, height: useBounds.height,
      },
      viewBox: viewBox
        ? { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height }
        : null,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
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
  }, { geometrySelector: GEOMETRY_SELECTOR, expected: entry });

  return computeIconEvidence(raw);
}

export async function inspectFixedControlCustody(host, manifest) {
  return host.evaluate((root, expectedEntries) => {
    const stableSelector = [
      'button[data-action]',
      'button[data-navigation-mode]',
      'button[data-navigation-action]',
      'button[data-standard-view]',
      'button[data-command-action]',
    ].join(',');
    const expectedByKey = new Map(expectedEntries.map((entry) => [entry.key, entry]));
    const selectorCardinality = expectedEntries.map((entry) => ({
      key: entry.key,
      selector: entry.selector,
      count: root.querySelectorAll(entry.selector).length,
    }));
    const iconBearingControls = [...root.querySelectorAll(stableSelector)].filter((control) => {
      const uses = [...control.querySelectorAll(':scope > svg use')];
      return uses.some((use) => {
        const reference = use.getAttribute('href')
          ?? use.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href')
          ?? '';
        return reference.startsWith('#icon-');
      });
    });

    const keyCounts = new Map();
    let duplicateIconChildCount = 0;
    const unmanifestedControls = [];
    const controls = iconBearingControls.map((control) => {
      const key = control.dataset.topologyEditIconKey ?? null;
      const expected = key ? expectedByKey.get(key) : null;
      const directIcons = control.querySelectorAll(':scope > svg[data-topology-edit-icon-key]');
      duplicateIconChildCount += Math.max(0, directIcons.length - 1);
      if (key) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      const identity = {
        action: control.dataset.action ?? null,
        navigationMode: control.dataset.navigationMode ?? null,
        navigationAction: control.dataset.navigationAction ?? null,
        standardView: control.dataset.standardView ?? null,
        commandAction: control.dataset.commandAction ?? null,
      };
      const reasons = [];
      if (!expected) reasons.push('binding-key-outside-manifest');
      if (expected && !control.matches(expected.selector)) reasons.push('stable-selector-mismatch');
      if (directIcons.length !== 1) reasons.push(`icon-child-cardinality:${directIcons.length}`);
      if (reasons.length) unmanifestedControls.push({ key, identity, reasons });
      return { key, identity, iconChildCount: directIcons.length };
    });

    const duplicateBindingKeys = [...keyCounts.entries()]
      .filter(([, count]) => count !== 1)
      .map(([key, count]) => ({ key, count }));
    const missingBindingKeys = expectedEntries
      .filter((entry) => (keyCounts.get(entry.key) ?? 0) !== 1)
      .map((entry) => ({ key: entry.key, count: keyCounts.get(entry.key) ?? 0 }));
    const duplicateControls = selectorCardinality.filter((entry) => entry.count > 1);
    const missingControls = selectorCardinality.filter((entry) => entry.count === 0);

    return {
      manifestCount: expectedEntries.length,
      iconBearingControlCount: iconBearingControls.length,
      controls,
      selectorCardinality,
      duplicateControlCount: duplicateControls.reduce((sum, entry) => sum + entry.count - 1, 0),
      missingControlCount: missingControls.length,
      duplicateIconChildCount,
      duplicateBindingKeyCount: duplicateBindingKeys.length,
      missingBindingKeyCount: missingBindingKeys.length,
      extraIconBearingControlCount: unmanifestedControls.length,
      duplicateControls,
      missingControls,
      duplicateBindingKeys,
      missingBindingKeys,
      unmanifestedControls,
    };
  }, manifest.map((entry) => ({ key: entry.key, selector: entry.selector })));
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
