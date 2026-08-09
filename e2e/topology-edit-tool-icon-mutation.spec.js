import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPOLOGY_EDIT_ICON_MANIFEST } from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';

const REPORT_DIR = resolve('reports/qualification');
const REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-mutation-sanity.json');
const UNDO = TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'history.undo');
const REDO = TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'history.redo');

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('production icon qualification detects adversarial DOM mutations and recovers', async ({ page }, testInfo) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  let host = await openTopologyEdit(page);
  const observations = [];

  const undoSymbolHtml = await page.locator('#icon-undo').evaluate((symbol) => symbol.outerHTML);
  await page.locator('#icon-undo').evaluate((symbol) => symbol.remove());
  observations.push(await observe('missing-symbol', host, UNDO));
  expect(observations.at(-1).status).toBe('UNRESOLVED');
  await restoreSymbol(host, undoSymbolHtml);
  await expect.poll(async () => (await classify(host, UNDO)).status).toBe('VISUALLY_RENDERED');

  const redoGeometry = await page.locator('#icon-redo').evaluate((symbol) => symbol.innerHTML);
  await page.locator('#icon-redo').evaluate((symbol) => symbol.replaceChildren());
  observations.push(await observe('empty-geometry', host, REDO));
  expect(observations.at(-1).status).toBe('RESOLVED');
  expect(observations.at(-1).drawableGeometryCount).toBe(0);
  await page.locator('#icon-redo').evaluate((symbol, html) => { symbol.innerHTML = html; }, redoGeometry);
  await expect.poll(async () => (await classify(host, REDO)).status).toBe('VISUALLY_RENDERED');

  const undoUse = host.locator(`${UNDO.selector} > svg[data-topology-edit-icon-key] use`);
  const wrongReference = await undoUse.evaluate((use) => {
    use.setAttribute('href', '#icon-redo');
    return use.getAttribute('href');
  });
  observations.push({ mutation: 'wrong-symbol', expected: '#icon-undo', actual: wrongReference });
  expect(wrongReference).not.toBe(`#${UNDO.symbolId}`);
  await undoUse.evaluate((use) => use.setAttribute('href', '#icon-undo'));

  const brokenImmediate = await undoUse.evaluate((use) => {
    use.setAttribute('href', '#icon-undo-broken');
    return use.getAttribute('href')?.endsWith('-broken') ? 'BROKEN' : 'OTHER';
  });
  observations.push({ mutation: 'broken-reference', immediateStatus: brokenImmediate });
  expect(brokenImmediate).toBe('BROKEN');
  await expect.poll(() => undoUse.getAttribute('href')).toBe('#icon-undo');
  observations.at(-1).recoveredReference = await undoUse.getAttribute('href');

  const undoIcon = host.locator(`${UNDO.selector} > svg[data-topology-edit-icon-key]`);
  await undoIcon.evaluate((icon) => { icon.style.display = 'none'; });
  observations.push(await observe('css-hidden', host, UNDO));
  expect(observations.at(-1).status).toBe('RESOLVED');
  expect(observations.at(-1).visible).toBe(false);
  await undoIcon.evaluate((icon) => { icon.style.removeProperty('display'); });
  await expect.poll(async () => (await classify(host, UNDO)).status).toBe('VISUALLY_RENDERED');

  const duplicate = await page.locator('svg[data-role="topology-edit-icon-sprite"]').evaluateHandle((sprite) => {
    const clone = sprite.cloneNode(true);
    clone.dataset.iconMutationDuplicate = 'true';
    sprite.after(clone);
    return clone;
  });
  observations.push(await observe('duplicate-sprite', host, UNDO));
  expect(observations.at(-1).targetCount).toBe(2);
  expect(observations.at(-1).status).toBe('UNRESOLVED');
  await page.locator('svg[data-icon-mutation-duplicate="true"]').remove();
  await duplicate.dispose();
  await expect.poll(async () => (await classify(host, UNDO)).status).toBe('VISUALLY_RENDERED');

  await host.locator('svg[data-topology-edit-icon-key]').evaluateAll((icons) => icons.forEach((icon) => icon.remove()));
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'NO_SVG_ICONS');
  observations.push({ mutation: 'remove-all-production-uses', status: 'NO_SVG_ICONS' });

  await page.reload({ waitUntil: 'domcontentloaded' });
  host = await openTopologyEditFromWorkspace(page);
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
  await expect(host.locator('svg[data-topology-edit-icon-key]')).toHaveCount(42);

  writeFileSync(REPORT_PATH, `${JSON.stringify({
    candidateSha: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA ?? process.env.GITHUB_SHA ?? 'LOCAL_UNSEALED',
    observations,
    restoredAuthoritativeRun: true,
  }, null, 2)}\n`);
  await testInfo.attach('icon-mutation-sanity', { path: REPORT_PATH, contentType: 'application/json' });
});

async function observe(mutation, host, entry) {
  return { mutation, ...(await classify(host, entry)) };
}

async function classify(host, entry) {
  return host.locator(entry.selector).evaluate((control) => {
    const icon = control.querySelector(':scope > svg[data-topology-edit-icon-key]');
    const use = icon?.querySelector('use');
    if (!use) return { status: 'NO_SVG_ICONS', targetCount: 0, drawableGeometryCount: 0, visible: false };
    const reference = use.getAttribute('href') ?? '';
    if (reference.endsWith('-broken')) {
      return { status: 'BROKEN', reference, targetCount: 0, drawableGeometryCount: 0, visible: false };
    }
    const id = reference.startsWith('#') ? reference.slice(1) : '';
    const targets = id ? [...control.ownerDocument.querySelectorAll(`#${CSS.escape(id)}`)] : [];
    const target = targets[0] ?? null;
    const drawableGeometryCount = target?.querySelectorAll(
      'path,rect,circle,ellipse,line,polyline,polygon',
    ).length ?? 0;
    if (targets.length !== 1) {
      return { status: 'UNRESOLVED', reference, targetCount: targets.length, drawableGeometryCount, visible: false };
    }
    const rect = icon.getBoundingClientRect();
    let bbox = { width: 0, height: 0 };
    try { bbox = use.getBBox(); } catch { /* resolved but not drawable */ }
    let visible = rect.width > 0 && rect.height > 0;
    for (let node = icon; visible && node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse'
          || Number(style.opacity) <= 0) visible = false;
      if (node === control) break;
    }
    const rendered = drawableGeometryCount > 0 && bbox.width > 0 && bbox.height > 0 && visible;
    return {
      status: rendered ? 'VISUALLY_RENDERED' : 'RESOLVED',
      reference,
      targetCount: targets.length,
      drawableGeometryCount,
      visible,
      renderedBounds: { width: rect.width, height: rect.height },
      useBounds: { width: bbox.width, height: bbox.height },
    };
  });
}

async function restoreSymbol(host, symbolHtml) {
  await host.evaluate((element, html) => {
    const sprite = element.ownerDocument.querySelector('svg[data-role="topology-edit-icon-sprite"]');
    sprite?.insertAdjacentHTML('beforeend', html);
  }, symbolHtml);
}

async function openTopologyEdit(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  return openTopologyEditFromWorkspace(page);
}

async function openTopologyEditFromWorkspace(page) {
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  if (await navigation.getByRole('button', { name: 'Workspace', exact: true }).count()) {
    await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  }
  if ((await page.locator('[data-action="load-topology-edit-demo"]').count())
      && (await page.evaluate(() => (
        globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
      ))) !== 20) {
    await page.locator('[data-action="load-topology-edit-demo"]').click();
    await expect.poll(() => page.evaluate(() => (
      globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
    ))).toBe(20);
  }
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible({ timeout: 60_000 });
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  return host;
}
