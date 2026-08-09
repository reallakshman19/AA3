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

export async function openApplicableSurface(host, entry) {
  const kind = PANEL_BY_SURFACE[entry.surface];
  if (kind) await openPanel(host, kind);
  if (entry.key === 'display.apply-section' || entry.key === 'display.clear-section') {
    await openSectionControls(host);
  }
}

export async function expectToolbarHitTargetsSeparated(host) {
  const views = host.locator(
    '.topology-edit-clean-shell__navigation > details[data-panel-kind="views"] > summary',
  );
  const history = host.locator('.topology-edit-clean-shell__history');
  await expect(views).toHaveCount(1);
  await expect(history).toHaveCount(1);
  await expect.poll(async () => {
    const viewsBox = await views.boundingBox();
    const historyBox = await history.boundingBox();
    if (!viewsBox || !historyBox) return false;
    return viewsBox.x + viewsBox.width <= historyBox.x;
  }).toBe(true);
}

export async function openPanel(host, kind) {
  const details = host.locator(`details[data-panel-kind="${kind}"]`);
  await expect(details).toHaveCount(1);
  if (!(await details.evaluate((element) => element.open))) {
    await details.locator(':scope > summary').click();
  }
  await expect(details).toHaveAttribute('open', '');
}

export async function closePanel(host, kind) {
  const details = host.locator(`details[data-panel-kind="${kind}"]`);
  await expect(details).toHaveCount(1);
  if (await details.evaluate((element) => element.open)) {
    await details.locator(':scope > summary').click();
  }
  await expect(details).not.toHaveAttribute('open', '');
}

export async function openSectionControls(host) {
  const section = host.locator(
    'details[data-panel-kind="display"] .topology-edit-section-controls',
  );
  await expect(section).toHaveCount(1);
  if (!(await section.evaluate((element) => element.open))) {
    await section.locator(':scope > summary').click();
  }
  await expect(section).toHaveAttribute('open', '');
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
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((control, expected) => {
    const GEOMETRY_SELECTOR = 'path,rect,circle,ellipse,line,polyline,polygon';
    const MIN_VISIBLE_OPACITY = 0.01;

    function number(value, fallback = 0) {
      const parsed = Number.parseFloat(String(value ?? ''));
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizedAlpha(token) {
      const value = String(token ?? '').trim().toLowerCase();
      if (!value) return null;
      if (value.endsWith('%')) {
        const parsed = Number.parseFloat(value.slice(0, -1));
        return Number.isFinite(parsed) ? parsed / 100 : null;
      }
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function paintHasVisibleAlpha(value) {
      const normalized = String(value ?? '').trim().toLowerCase();
      if (!normalized || normalized === 'none' || normalized === 'transparent') return false;

      const slashAlpha = normalized.match(/\/\s*(-?(?:\d+|\d*\.\d+)%?)\s*\)$/);
      if (slashAlpha) {
        const alpha = normalizedAlpha(slashAlpha[1]);
        if (alpha !== null) return alpha > MIN_VISIBLE_OPACITY;
      }

      if (normalized.startsWith('rgba(')) {
        const body = normalized.slice(5, -1);
        const parts = body.split(',');
        if (parts.length === 4) {
          const alpha = normalizedAlpha(parts[3]);
          if (alpha !== null) return alpha > MIN_VISIBLE_OPACITY;
        }
      }
      return true;
    }

    function clipCertification(node, style) {
      const rawClipPath = String(style.clipPath || '').trim();
      const clipPath = rawClipPath.toLowerCase();
      const legacyClip = String(style.clip || '').replace(/\s+/g, '').toLowerCase();
      if (legacyClip === 'rect(0px,0px,0px,0px)' || legacyClip === 'rect(0px 0px 0px 0px)') {
        return {
          raw: rawClipPath || style.clip,
          kind: 'LEGACY_RECT',
          certifiable: true,
          fullyClipped: true,
        };
      }
      if (!clipPath || clipPath === 'none') {
        return {
          raw: rawClipPath,
          kind: 'NONE',
          certifiable: true,
          fullyClipped: false,
        };
      }

      const bounds = node?.getBoundingClientRect?.() ?? { width: 0, height: 0 };
      const inset = clipPath.match(/^inset\((.*)\)$/);
      if (inset) {
        const boxPart = inset[1].split(/\s+round\s+/)[0].trim();
        const tokens = boxPart.split(/\s+/).filter(Boolean);
        if (tokens.length >= 1 && tokens.length <= 4) {
          const expanded = expandBox(tokens);
          const top = resolveLength(expanded[0], bounds.height);
          const right = resolveLength(expanded[1], bounds.width);
          const bottom = resolveLength(expanded[2], bounds.height);
          const left = resolveLength(expanded[3], bounds.width);
          if ([top, right, bottom, left].every((item) => item !== null)) {
            const visibleWidth = Math.max(0, bounds.width - left - right);
            const visibleHeight = Math.max(0, bounds.height - top - bottom);
            return {
              raw: rawClipPath,
              kind: 'INSET',
              certifiable: true,
              fullyClipped: visibleWidth <= 0 || visibleHeight <= 0,
              visibleWidth,
              visibleHeight,
            };
          }
        }
        return { raw: rawClipPath, kind: 'UNPROVEN', certifiable: false, fullyClipped: null };
      }

      const circle = clipPath.match(/^circle\(([^\s)]+)(?:\s+at\s+[^)]*)?\)$/);
      if (circle) {
        const radius = resolveLength(circle[1], Math.min(bounds.width, bounds.height));
        if (radius !== null) {
          return {
            raw: rawClipPath,
            kind: 'CIRCLE',
            certifiable: true,
            fullyClipped: radius <= 0,
            radius,
          };
        }
        return { raw: rawClipPath, kind: 'UNPROVEN', certifiable: false, fullyClipped: null };
      }

      const ellipse = clipPath.match(/^ellipse\(([^\s)]+)\s+([^\s)]+)(?:\s+at\s+[^)]*)?\)$/);
      if (ellipse) {
        const radiusX = resolveLength(ellipse[1], bounds.width);
        const radiusY = resolveLength(ellipse[2], bounds.height);
        if (radiusX !== null && radiusY !== null) {
          return {
            raw: rawClipPath,
            kind: 'ELLIPSE',
            certifiable: true,
            fullyClipped: radiusX <= 0 || radiusY <= 0,
            radiusX,
            radiusY,
          };
        }
        return { raw: rawClipPath, kind: 'UNPROVEN', certifiable: false, fullyClipped: null };
      }

      // URL(), polygon(), path(), geometry-box, and unfamiliar clip forms are not
      // accepted as proof of visible production paint. Qualification fails closed.
      return { raw: rawClipPath, kind: 'UNPROVEN', certifiable: false, fullyClipped: null };

      function expandBox(tokens) {
        if (tokens.length === 1) return [tokens[0], tokens[0], tokens[0], tokens[0]];
        if (tokens.length === 2) return [tokens[0], tokens[1], tokens[0], tokens[1]];
        if (tokens.length === 3) return [tokens[0], tokens[1], tokens[2], tokens[1]];
        return tokens;
      }

      function resolveLength(token, axis) {
        const value = String(token || '').trim().toLowerCase();
        if (value.endsWith('%')) {
          const parsed = Number.parseFloat(value.slice(0, -1));
          return Number.isFinite(parsed) ? axis * parsed / 100 : null;
        }
        if (value.endsWith('px')) {
          const parsed = Number.parseFloat(value.slice(0, -2));
          return Number.isFinite(parsed) ? parsed : null;
        }
        if (/^-?(?:\d+|\d*\.\d+)$/.test(value)) {
          const parsed = Number.parseFloat(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      }
    }

    function presentationChain(start, stopBefore = null) {
      let visible = Boolean(start);
      let effectiveOpacity = 1;
      let hiddenBy = null;
      const clipPaths = [];
      for (let node = start; visible && node && node !== stopBefore
        && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
        const style = getComputedStyle(node);
        const opacity = number(style.opacity, 1);
        effectiveOpacity *= opacity;
        const clip = clipCertification(node, style);
        if (clip.kind !== 'NONE') {
          clipPaths.push({ tag: node.tagName.toLowerCase(), ...clip });
        }
        if (style.display === 'none' || style.visibility === 'hidden'
            || style.visibility === 'collapse' || style.contentVisibility === 'hidden'
            || effectiveOpacity <= MIN_VISIBLE_OPACITY || !clip.certifiable || clip.fullyClipped) {
          visible = false;
          hiddenBy = node === start ? 'self' : node.tagName.toLowerCase();
        }
      }
      return { visible, effectiveOpacity, hiddenBy, clipPaths };
    }

    function geometryEvidence(target, use) {
      if (!target) return {
        rawGeometryCount: 0,
        drawableGeometryCount: 0,
        maxStrokeWidth: 0,
        geometry: [],
      };
      const useColor = getComputedStyle(use).color;
      const useColorVisible = paintHasVisibleAlpha(useColor);
      const geometry = [...target.querySelectorAll(GEOMETRY_SELECTOR)].map((node) => {
        const style = getComputedStyle(node);
        const chain = presentationChain(node, target);
        const fillOpacity = number(style.fillOpacity, 1);
        const strokeOpacity = number(style.strokeOpacity, 1);
        const strokeWidth = number(style.strokeWidth, 0);
        const fillVisible = paintHasVisibleAlpha(style.fill)
          && fillOpacity > MIN_VISIBLE_OPACITY;
        const strokeVisible = paintHasVisibleAlpha(style.stroke)
          && strokeOpacity > MIN_VISIBLE_OPACITY && strokeWidth > 0;
        const ancestry = [];
        for (let cursor = node; cursor && cursor !== target; cursor = cursor.parentElement) {
          ancestry.push(cursor);
        }
        const usesCurrentColor = ancestry.some((cursor) => (
          String(cursor.getAttribute('fill') || '').toLowerCase() === 'currentcolor'
          || String(cursor.getAttribute('stroke') || '').toLowerCase() === 'currentcolor'
        ));
        let bbox = { x: 0, y: 0, width: 0, height: 0 };
        let length = 0;
        try { bbox = node.getBBox?.() ?? bbox; } catch { /* logical extent remains zero */ }
        try { length = number(node.getTotalLength?.(), 0); } catch { /* unsupported */ }
        const hasExtent = bbox.width > 0 || bbox.height > 0 || length > 0;
        const painted = (fillVisible || strokeVisible)
          && (!usesCurrentColor || useColorVisible);
        return {
          tag: node.tagName.toLowerCase(),
          painted,
          hasExtent,
          fill: style.fill,
          fillOpacity,
          stroke: style.stroke,
          strokeOpacity,
          strokeWidth,
          effectiveOpacity: chain.effectiveOpacity,
          sourceVisible: chain.visible,
          hiddenBy: chain.hiddenBy,
          usesCurrentColor,
          bounds: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          length,
        };
      });
      const drawable = geometry.filter((item) => (
        item.painted && item.hasExtent && item.sourceVisible
          && item.effectiveOpacity > MIN_VISIBLE_OPACITY
      ));
      return {
        rawGeometryCount: geometry.length,
        drawableGeometryCount: drawable.length,
        maxStrokeWidth: drawable.reduce((max, item) => Math.max(max, item.strokeWidth || 0), 0),
        geometry,
      };
    }

    const icon = control.querySelector(':scope > svg[data-topology-edit-icon-key]');
    const use = icon?.querySelector(':scope > use');
    const actualReference = use?.getAttribute('href')
      ?? use?.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href')
      ?? '';
    const id = actualReference.startsWith('#') ? actualReference.slice(1) : '';
    const targets = id ? [...control.ownerDocument.querySelectorAll(`#${CSS.escape(id)}`)] : [];
    const target = targets[0] ?? null;
    const geometry = geometryEvidence(target, use);

    const rect = icon?.getBoundingClientRect()
      ?? { width: 0, height: 0, top: 0, left: 0 };
    let bbox = { x: 0, y: 0, width: 0, height: 0 };
    try { bbox = use?.getBBox?.() ?? bbox; } catch { /* zero below */ }
    const strokePad = geometry.maxStrokeWidth;
    const paintBounds = {
      x: bbox.x - strokePad / 2,
      y: bbox.y - strokePad / 2,
      width: bbox.width + strokePad,
      height: bbox.height + strokePad,
    };

    const presentation = presentationChain(use);
    const inViewport = rect.width > 0 && rect.height > 0
      && rect.top < innerHeight && rect.left < innerWidth
      && rect.top + rect.height > 0 && rect.left + rect.width > 0;

    const viewBox = icon?.viewBox?.baseVal;
    const hasViewport = Boolean(viewBox && viewBox.width > 0 && viewBox.height > 0);
    const intersectsViewBox = Boolean(hasViewport
      && paintBounds.width > 0 && paintBounds.height > 0
      && paintBounds.x < viewBox.x + viewBox.width
      && paintBounds.x + paintBounds.width > viewBox.x
      && paintBounds.y < viewBox.y + viewBox.height
      && paintBounds.y + paintBounds.height > viewBox.y);
    const visible = presentation.visible && inViewport && intersectsViewBox
      && geometry.drawableGeometryCount > 0;

    let referenceStatus = 'RESOLVED';
    if (!use) referenceStatus = 'NO_SVG_ICONS';
    else if (actualReference.endsWith('-broken')) referenceStatus = 'BROKEN';
    else if (targets.length !== 1) referenceStatus = 'UNRESOLVED';
    else if (visible) referenceStatus = 'VISUALLY_RENDERED';

    return {
      actualReference,
      referenceStatus,
      resolvedTargetId: target?.id ?? null,
      targetCount: targets.length,
      rawGeometryCount: geometry.rawGeometryCount,
      drawableGeometryCount: geometry.drawableGeometryCount,
      drawableGeometry: geometry.geometry,
      renderedBounds: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      },
      useBounds: {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      },
      paintBounds,
      computedVisibility: {
        visible,
        inViewport,
        intersectsViewBox,
        effectiveOpacity: presentation.effectiveOpacity,
        opacityThreshold: MIN_VISIBLE_OPACITY,
        currentColor: use ? getComputedStyle(use).color : null,
        hiddenBy: presentation.hiddenBy,
        clipPaths: presentation.clipPaths,
      },
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
    const duplicateControls = selectorCardinality
      .filter((entry) => entry.count > 1);
    const missingControls = selectorCardinality
      .filter((entry) => entry.count === 0);

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
  }, manifest.map((entry) => ({
    key: entry.key,
    selector: entry.selector,
  })));
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
