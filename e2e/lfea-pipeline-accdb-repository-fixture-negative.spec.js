import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixturePath = fileURLToPath(new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url));
const authenticBytes = fs.existsSync(fixturePath) ? fs.readFileSync(fixturePath) : null;
const referenceAction = '[data-action="lfea-source-acquisition-reference-bm4l"]';
const referenceStatus = '[data-role="lfea-source-acquisition-reference-status"]';
function isBm4lBinaryRequest(urlString) {
  const url = new URL(urlString);
  // Vite may request a tiny ?url ESM module at startup. Only the actual binary
  // body is a transfer; intercepting the ESM import would break app boot.
  return /\/BM4_L(?:-[A-Za-z0-9_-]+)?\.ACCDB$/iu.test(url.pathname)
    && !url.searchParams.has('url') && !url.searchParams.has('import');
}

const accdbUrl = (url) => isBm4lBinaryRequest(url);

test.describe('BM4_L shortcut fail-closed and interaction boundaries', () => {
  test.setTimeout(300000);
  test.skip(!authenticBytes, 'Committed BM4_L original fixture must be available.');

  async function openSource(page) {
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await expect(page.locator(referenceAction)).toBeVisible();
  }
  async function assertNoUnauthorizedSource(page) {
    await expect(page.locator('[data-host-group="SOURCE"]')).toHaveAttribute('data-active-source', 'NONE');
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
  }

  for (const httpCode of [404, 503]) {
    test(`HTTP ${httpCode} is announced and never imports an ACCDB`, async ({ page }) => {
      await page.route(accdbUrl, (route) => route.fulfill({ status: httpCode, body: 'Unavailable' }));
      await openSource(page);
      await page.locator(referenceAction).click();
      await expect(page.locator(referenceStatus)).toContainText(new RegExp(`HTTP ${httpCode}`));
      await assertNoUnauthorizedSource(page);
      await expect(page.locator(referenceAction)).toBeEnabled();
    });
  }

  test('connection failure is recoverable without granting Run authority', async ({ page }) => {
    await page.route(accdbUrl, (route) => route.abort('failed'));
    await openSource(page);
    await page.locator(referenceAction).click();
    await expect(page.locator(referenceStatus)).toContainText(/failed to fetch|network|fetch failed/iu);
    await assertNoUnauthorizedSource(page);
    await expect(page.locator(referenceAction)).toBeEnabled();
  });

  for (const corruption of ['truncated', 'extra-length', 'one-byte-mutated']) {
    test(`${corruption} fixture is rejected before engineering import`, async ({ page }) => {
      const mutated = corruption === 'truncated'
        ? authenticBytes.subarray(0, -1)
        : corruption === 'extra-length'
          ? Buffer.concat([authenticBytes, Buffer.of(0)])
          : Buffer.from(authenticBytes);
      if (corruption === 'one-byte-mutated') mutated[600] ^= 1;
      await page.route(accdbUrl, (route) => route.fulfill({
        status: 200, contentType: 'application/octet-stream', body: mutated,
      }));
      await openSource(page);
      await page.locator(referenceAction).click();
      await expect(page.locator(referenceStatus))
        .toContainText(corruption === 'one-byte-mutated' ? /SHA-256 mismatch/iu : /size mismatch/iu);
      await assertNoUnauthorizedSource(page);
    });
  }

  test('missing browser SHA-256 capability fails closed before any binary GET', async ({ page }) => {
    let transferred = 0;
    await page.route(accdbUrl, async (route) => {
      transferred += 1;
      await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: authenticBytes });
    });
    await openSource(page);
    await page.evaluate(() => {
      Object.defineProperty(window.crypto, 'subtle', { configurable: true, value: undefined });
    });
    await page.locator(referenceAction).click();
    await expect(page.locator(referenceStatus)).toContainText(/requires browser SHA-256 support/iu);
    expect(transferred).toBe(0);
    await assertNoUnauthorizedSource(page);
  });

  test('failed shortcut retains existing governed manual source', async ({ page }) => {
    await openSource(page);
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 90000 });
    const prior = await page.evaluate(
      () => globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().source.identityKey,
    );
    await page.route(accdbUrl, (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
    await page.locator(referenceAction).click();
    await expect(page.locator(referenceStatus)).toContainText(/HTTP 503/iu);
    await expect(page.locator('[data-host-group="SOURCE"]')).toHaveAttribute('data-active-source', 'ACCDB');
    const after = await page.evaluate(
      () => globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().source.identityKey,
    );
    expect(after).toBe(prior);
  });

  test('newer manual file selection wins over delayed shortcut download', async ({ page }) => {
    let releaseRoute;
    let requestSeen;
    const requested = new Promise((resolve) => { requestSeen = resolve; });
    const release = new Promise((resolve) => { releaseRoute = resolve; });
    await page.route(accdbUrl, async (route) => {
      requestSeen();
      await release;
      try {
        await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: authenticBytes });
      } catch {
        // Cancellation may already have aborted the intercepted request.
      }
    });
    await openSource(page);
    await page.locator(referenceAction).click();
    await requested;
    await expect(page.locator(referenceAction)).toBeDisabled();
    await expect(page.locator(referenceAction)).toHaveAttribute('aria-busy', 'true');
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles({
      name: 'newer-manual.accdb',
      mimeType: 'application/vnd.ms-access',
      buffer: authenticBytes,
    });
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('Loaded newer-manual.accdb: 96 element(s), 97 node(s)', { timeout: 90000 });
    releaseRoute();
    await expect(page.locator(referenceStatus)).toContainText(/cancelled/iu);
    await expect(page.locator('[data-role="lfea-source-acquisition-summary"]'))
      .toContainText('newer-manual.accdb');
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
  });

  test('reference click supersedes an older manual parse before reference download completes', async ({ page }) => {
    // Hold a real manual File.arrayBuffer(), then click the newer reference
    // selection while its binary GET is itself held. A stale manual model must
    // not commit in the interval between click and reference download.
    let releaseRoute;
    let requestSeen;
    const requested = new Promise((resolve) => { requestSeen = resolve; });
    const pendingNetwork = new Promise((resolve) => { releaseRoute = resolve; });
    await page.route(accdbUrl, async (route) => {
      requestSeen();
      await pendingNetwork;
      try {
        await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: authenticBytes });
      } catch {
        // A failed or interrupted test may already have disposed this route.
      }
    });
    await openSource(page);
    await page.evaluate(() => {
      const readFile = File.prototype.arrayBuffer;
      let releaseManual;
      const pendingManual = new Promise((resolve) => { releaseManual = resolve; });
      window.__bm4lOlderManualRead = { entered: false, release: releaseManual };
      File.prototype.arrayBuffer = async function guardedManualRead() {
        if (this.name === 'older-manual.accdb') {
          window.__bm4lOlderManualRead.entered = true;
          await pendingManual;
        }
        return readFile.call(this);
      };
    });
    try {
      await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles({
        name: 'older-manual.accdb',
        mimeType: 'application/vnd.ms-access',
        buffer: authenticBytes,
      });
      await expect.poll(() => page.evaluate(() => window.__bm4lOlderManualRead.entered))
        .toBe(true);
      await page.locator(referenceAction).click();
      await requested;
      await expect(page.locator(referenceAction)).toBeDisabled();
      // Deterministic click-time cancellation assertion: this failed before
      // the fix even if a slow runner had not yet finished parsing the old file.
      await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
        .toContainText('superseded by a newer source selection');
      await page.evaluate(() => window.__bm4lOlderManualRead.release());
      // Give the old parser time to complete if it was not invalidated.
      // The race's ordering is deterministic (manual read released while
      // reference GET is still pending), not based on network timing.
      await page.waitForTimeout(2000);
      await assertNoUnauthorizedSource(page);
      await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
        .not.toContainText('Loaded older-manual.accdb');
      releaseRoute();
      await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
        .toContainText('Loaded BM4_L.ACCDB: 96 element(s), 97 node(s)', { timeout: 120000 });
      const source = await page.evaluate(() => globalThis.AnalysisWorkspace.getLfeaEngineeringSessionState().source);
      expect(source.kind).toBe('ACCDB');
      expect(source.fileName).toBe('BM4_L.ACCDB');
      await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
        .toHaveAttribute('data-step-status', 'BLOCKED');
    } finally {
      await page.evaluate(() => window.__bm4lOlderManualRead?.release?.()).catch(() => {});
      releaseRoute?.();
    }
  });

  test('rapid clicks cause only one fetch while busy', async ({ page }) => {
    let count = 0;
    await page.route(accdbUrl, async (route) => {
      count += 1;
      await route.fulfill({ status: 503, body: 'Unavailable' });
    });
    await openSource(page);
    await page.locator(referenceAction).evaluate((button) => {
      button.click();
      button.click();
      button.click();
    });
    await expect(page.locator(referenceStatus)).toContainText(/HTTP 503/iu);
    expect(count).toBe(1);
    await expect(page.locator(referenceAction)).toBeEnabled();
  });

  test('keyboard use preserves focus and announces error status', async ({ page }) => {
    await page.route(accdbUrl, (route) => route.fulfill({ status: 404, body: 'Unavailable' }));
    await openSource(page);
    const button = page.locator(referenceAction);
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-label', /authentic repository ACCDB/iu);
    await page.keyboard.press('Enter');
    await expect(page.locator(referenceStatus)).toContainText(/HTTP 404/iu);
    await expect(button).toBeFocused();
    await expect(button).toBeEnabled();
    await expect(page.locator(referenceStatus)).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator(referenceStatus)).toHaveAttribute('data-status', 'error');
    await page.keyboard.press('Space');
    await expect(page.locator(referenceStatus)).toContainText(/HTTP 404/iu);
  });

  test('no ACCDB request happens before reference click or after a normal reload', async ({ page }) => {
    const requests = [];
    page.on('request', (request) => {
      if (isBm4lBinaryRequest(request.url())) requests.push(request.url());
    });
    await openSource(page);
    expect(requests).toEqual([]);
    await page.reload();
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    expect(requests).toEqual([]);
    await page.locator(referenceAction).click();
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    expect(requests).toHaveLength(1);
    await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
      .toHaveAttribute('data-step-status', 'BLOCKED');
  });
});
