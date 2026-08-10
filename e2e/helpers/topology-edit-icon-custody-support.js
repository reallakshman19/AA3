import { expect } from '@playwright/test';
import { resolve } from 'node:path';

export const REPORT_DIR = resolve('reports/qualification');
export const REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-custody.json');
export const REMOUNT_REPORT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-remount-custody.json');
export const STALE_IMPORT_REPORT_PATH = resolve(
  REPORT_DIR,
  'topology-edit-icon-stale-import-custody.json',
);
export const SCREENSHOT_PATH = resolve(REPORT_DIR, 'topology-edit-icon-state-custody.png');
export const FIXTURE = 'public/fixtures/topology-edit-20-element-demo.staged.json';

/**
 * Shared destructive-run setup for the real WebGL custody suites: fresh
 * storage, a fixed large viewport, and the production WebGL backend.
 */
export function applyCustodyRunContext(test) {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.addInitScript(() => {
      globalThis.localStorage?.clear();
      globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'webgl';
    });
  });
}

export async function loadDemoAndEnterWithoutIconWait(page) {
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

export async function collectWebglEvidence(host) {
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

export async function engineeringEvidence(host) {
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

export async function stableIdentity(locator) {
  return locator.evaluate((control) => ({
    action: control.dataset.action ?? null,
    navigationMode: control.dataset.navigationMode ?? null,
    navigationAction: control.dataset.navigationAction ?? null,
    standardView: control.dataset.standardView ?? null,
    commandAction: control.dataset.commandAction ?? null,
  }));
}

export function statusOutput(host) {
  return host.locator('[data-role="topology-edit-status"]');
}
