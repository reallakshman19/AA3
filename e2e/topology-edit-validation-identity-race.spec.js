import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const FIXTURE = resolve('public/fixtures/topology-edit-table-q3-exact.staged.json');
const FIXTURE_ID = 'topology-edit-table-q3-exact.staged.json';

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => {
    globalThis.localStorage?.clear();
    const NativeWorker = globalThis.Worker;
    globalThis.__a3d001HoldValidationMessages = true;
    globalThis.__a3d001ValidationResponsePending = false;
    globalThis.__a3d001ValidationWorkers = [];
    class ControlledWorker {
      constructor(url, options) {
        this.native = new NativeWorker(url, options);
        this.controlled = String(url).includes('topology-edit-validation-worker.js');
        this.listeners = new Map([
          ['message', new Set()],
          ['error', new Set()],
        ]);
        this.pendingMessages = [];
        this.native.addEventListener('message', (event) => {
          if (this.controlled && globalThis.__a3d001HoldValidationMessages) {
            this.pendingMessages.push(event);
            globalThis.__a3d001ValidationResponsePending = true;
            return;
          }
          this.dispatch('message', event);
        });
        this.native.addEventListener('error', (event) => this.dispatch('error', event));
        if (this.controlled) globalThis.__a3d001ValidationWorkers.push(this);
      }

      addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(listener);
      }

      removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
      }

      postMessage(...args) { return this.native.postMessage(...args); }
      terminate() { return this.native.terminate(); }

      dispatch(type, event) {
        for (const listener of this.listeners.get(type) ?? []) listener.call(this, event);
      }

      release() {
        const messages = this.pendingMessages.splice(0);
        messages.forEach((event) => this.dispatch('message', event));
      }
    }
    globalThis.Worker = ControlledWorker;
  });
});

test('late validation result cannot authorize Apply after visible selection changes', async ({ page }, testInfo) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const host = await openQ3(page);
  const ids = await q3CanonicalIds(page);
  const initial = await authorityEvidence(page);
  expect(initial.webglContextType).toMatch(/WebGL/i);
  expect(initial.webglContextLost).toBe(false);

  await stagePipe(page, ids.pipeId, 2800);
  const before = await authorityEvidence(page);
  expect(before.selectionPrimaryId).toBe(ids.pipeId);
  assertEngineeringAuthorityUnchanged(expect, initial, before);

  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => tableEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const previewEvidence = await tableEvidence(page);
  const ghostCountBefore = await ghostCount(page);
  expect(ghostCountBefore).toBeGreaterThan(0);
  assertEngineeringAuthorityUnchanged(expect, initial, await authorityEvidence(page));

  await page.locator('[data-table-action="validate"]').click();
  await page.waitForFunction(() => globalThis.__a3d001ValidationResponsePending === true);
  const request = await activeValidationRequest(page);
  expect(request.requestId).toBeTruthy();
  expect(request.sourceHash).toBe(before.sourceHash);
  expect(request.basisHash).toBe(before.canonicalHash);
  expect(request.sessionVersion).toBe(before.sessionVersion);
  expect(request.selectionRevision).toBe(before.selectionRevision);
  expect(request.interactionId).toBeTruthy();

  await selectTableRow(page, ids.valveId);
  await expect(host).toHaveAttribute('data-topology-edit-selection-primary-id', ids.valveId);
  const changedSelection = await authorityEvidence(page);
  expect(changedSelection.selectionRevision).toBeGreaterThan(request.selectionRevision);
  assertEngineeringAuthorityUnchanged(expect, initial, changedSelection);

  await page.evaluate(() => {
    globalThis.__a3d001HoldValidationMessages = false;
    globalThis.__a3d001ValidationWorkers.forEach((worker) => worker.release());
  });
  await expect.poll(() => tableEvidence(page).then((row) => row.pending)).toBe(false);

  const after = await authorityEvidence(page);
  const table = await tableEvidence(page);
  const ghostCountAfter = await ghostCount(page);
  assertEngineeringAuthorityUnchanged(expect, initial, after);
  expect(after.webglContextLost).toBe(false);
  expect(table.validationStatus).toBe('');
  expect(table.acceptedResponse).toBeNull();
  expect(table.activeRequest).toBeNull();
  expect(table.error).toMatch(/stale validation response selectionRevision/i);
  expect(ghostCountAfter).toBe(ghostCountBefore);
  await expect(page.locator('[data-table-action="apply"]')).toBeDisabled();

  await assertBrowserDiagnostics(diagnostics);
  const ledger = {
    schema: 'TopologyEditA3D001RaceEvidence.v1',
    fixture: FIXTURE_ID,
    visibleFlow: [
      'WORKSPACE',
      'LOAD_FIXTURE',
      'ENTER_3D_EDIT',
      'TABLE_SELECT_PIPE',
      'STAGE',
      'PREVIEW',
      'VALIDATE_RESPONSE_HELD',
      'TABLE_SELECT_VALVE',
      'RELEASE_OLD_VALIDATION_RESPONSE',
      'ASSERT_STALE_REJECTION',
    ],
    canonicalIds: ids,
    initialAuthority: initial,
    frozenValidationBasis: before,
    preview: {
      previewHash: previewEvidence.previewHash,
      ghostCount: ghostCountBefore,
    },
    frozenValidationRequest: request,
    afterVisibleSelectionChange: changedSelection,
    afterLateResponse: after,
    validationState: table,
    ghostCountAfter,
    canonicalMutationCount: after.activeCommandCount - initial.activeCommandCount,
  };
  await testInfo.attach('a3d-001-stale-validation-ledger', {
    body: JSON.stringify(ledger, null, 2),
    contentType: 'application/json',
  });
  await testInfo.attach('a3d-001-stale-validation-race', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

async function openQ3(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-role="dataset-file"]').setInputFiles(FIXTURE);
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(8);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime?.projection
  ))).toBe(true);
  const tablePanel = host.locator('details[data-panel-kind="table"]');
  if (!(await tablePanel.evaluate((node) => node.open))) {
    await tablePanel.locator(':scope > summary').click();
  }
  return host;
}

async function q3CanonicalIds(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController;
    const rows = controller.tableAdapter.runtime.projection.rows;
    const row = (key) => rows.find((item) => item.identity.componentKey === key);
    const pipeId = row('P-M04')?.identity?.canonicalId;
    const valveId = row('V-M06')?.identity?.canonicalId;
    if (!pipeId || !valveId) throw new Error('Q3 canonical Table identities are unavailable.');
    return { pipeId, valveId };
  });
}

async function selectTableRow(page, canonicalId) {
  const row = page.locator(
    `[data-role="topology-edit-table"] [data-canonical-id="${canonicalId}"]`,
  );
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();
}

async function stagePipe(page, canonicalId, lengthMm) {
  await selectTableRow(page, canonicalId);
  await page.locator('[data-table-edit-length]').fill(String(lengthMm));
  await page.locator('[data-table-edit-anchor]').selectOption('FROM');
  await page.locator('[data-table-edit-propagation]').selectOption('DOWNSTREAM');
  await page.locator('[data-table-action="stage-pipe-length"]').click();
}

async function activeValidationRequest(page) {
  return page.evaluate(() => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController.tableAdapter.runtime;
    return runtime.validationClient.snapshot().activeRequest;
  });
}

async function tableEvidence(page) {
  return page.evaluate(() => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController.tableAdapter.runtime;
    return {
      pending: runtime.pending,
      previewHash: runtime.preview?.previewHash ?? '',
      validationStatus: runtime.validation?.status ?? '',
      error: runtime.error ?? '',
      acceptedResponse: runtime.validationClient.snapshot().acceptedResponse,
      activeRequest: runtime.validationClient.snapshot().activeRequest,
    };
  });
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController;
    const editor = controller.editorStore.getState();
    const topology = controller.session.currentTopology();
    const webgl = controller.viewportBackend.renderer?.getContext?.();
    return {
      canonicalHash: topology.canonicalTopologyHash,
      journalHash: controller.session.journal.journalHash,
      activeLedgerHash: controller.session.journal.activeLedgerHash,
      activeCommandCount: controller.session.journal.activeCommandIds.length,
      sessionVersion: controller.session.journal.sessionVersion,
      sourceHash: controller.workspaceDataset.sourceSnapshot.sourceSemanticHash,
      selectionRevision: editor.selection.revision,
      selectionPrimaryId: editor.selection.primaryId,
      webglContextType: webgl?.constructor?.name ?? '',
      webglContextLost: Boolean(webgl?.isContextLost?.()),
    };
  });
}

async function ghostCount(page) {
  return page.evaluate(() => (
    document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController.viewportBackend.groups.ghostGroup.children.length
  ));
}

function assertEngineeringAuthorityUnchanged(expectApi, baseline, current) {
  expectApi(current.canonicalHash).toBe(baseline.canonicalHash);
  expectApi(current.journalHash).toBe(baseline.journalHash);
  expectApi(current.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expectApi(current.activeCommandCount).toBe(baseline.activeCommandCount);
  expectApi(current.sessionVersion).toBe(baseline.sessionVersion);
  expectApi(current.sourceHash).toBe(baseline.sourceHash);
}

function collectBrowserDiagnostics(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

async function assertBrowserDiagnostics(diagnostics) {
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => (
    /ReferenceError|Failed to fetch dynamically imported module|WebGL context lost/iu.test(message)
  ))).toEqual([]);
}
