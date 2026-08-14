import { expect, test } from '@playwright/test';

test('PIPE length paste requires visible explicit geometry policy and stages without canonical mutation', async ({ page }) => {
  test.setTimeout(180_000);
  const diagnostics = collectDiagnostics(page);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openProductionController(page);
  const panel = page.locator('details[data-panel-kind="table"]');
  if (!(await panel.evaluate((node) => node.open))) {
    await panel.locator(':scope > summary').click();
  }
  const table = page.locator('[data-role="topology-edit-table"]');
  await page.locator('[data-table-profile="GEOMETRY"]').click();
  const filter = page.locator('[data-table-filter]');
  await filter.fill('PIPE');

  const editable = await chooseSafeTerminalPipe(page);
  await filter.fill(editable.tag);
  const row = table.locator(`tbody tr[data-canonical-id="${editable.edgeId}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-selection-primary-id')).toBe(editable.edgeId);
  await expect(table.locator('[data-table-editor-id] [data-table-edit-length]')).toBeVisible();

  const anchor = table.locator('[data-table-edit-anchor]');
  const propagation = table.locator('[data-table-edit-propagation]');
  await anchor.selectOption(editable.anchor);
  await propagation.selectOption(editable.propagation);
  const before = await authorityEvidence(page);
  const lengthInput = row.locator('[data-table-cell-edit="PIPE_LENGTH"]');
  const priorLength = Number(await lengthInput.inputValue());
  expect(priorLength).toBe(editable.currentLengthMm);
  const requestedLength = editable.currentLengthMm - 120;

  await dispatchPaste(lengthInput, String(requestedLength));
  await expect(table).toHaveAttribute('data-table-pipe-length-paste-assignment-count', '1');
  await expect(table).toHaveAttribute('data-table-pipe-length-paste-anchor', editable.anchor);
  await expect(table).toHaveAttribute('data-table-pipe-length-paste-propagation', editable.propagation);
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  expectAuthorityNoop(await authorityEvidence(page), before);

  const staged = await page.evaluate((id) => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    const intent = runtime?.intents?.find((candidate) => (
      candidate.intentKind === 'PIPE_LENGTH' && candidate.target?.canonicalId === id
    ));
    return intent ? {
      lengthMm: intent.requestedValue?.lengthMm,
      anchor: intent.geometryPolicy?.anchor,
      propagation: intent.geometryPolicy?.propagation,
      intentCount: runtime?.batch?.intentCount ?? 0,
    } : null;
  }, editable.edgeId);
  expect(staged).toEqual({
    lengthMm: requestedLength,
    anchor: editable.anchor,
    propagation: editable.propagation,
    intentCount: 1,
  });

  await page.locator('[data-table-action="discard"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), before);

  const refreshedRow = table.locator(`tbody tr[data-canonical-id="${editable.edgeId}"]`);
  const refreshedLengthInput = refreshedRow.locator('[data-table-cell-edit="PIPE_LENGTH"]');
  const unsupportedPropagation = editable.propagation === 'DOWNSTREAM' ? 'UPSTREAM' : 'DOWNSTREAM';
  await table.locator('[data-table-edit-anchor]').selectOption(editable.anchor);
  await table.locator('[data-table-edit-propagation]').selectOption(unsupportedPropagation);
  await dispatchPaste(refreshedLengthInput, String(requestedLength - 40));
  await expect(table.locator('.topology-edit-table__status')).toContainText(
    `explicit policy ${editable.anchor} / ${unsupportedPropagation} is unsupported`,
  );
  expect(await host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), before);

  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
});

async function dispatchPaste(locator, text) {
  await locator.evaluate((node, clipboardText) => {
    const data = new DataTransfer();
    data.setData('text/plain', clipboardText);
    node.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }));
  }, text);
}

async function openProductionController(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-projection-hash')).toBeTruthy();
  return host;
}

async function chooseSafeTerminalPipe(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const projection = controller?.tableAdapter?.runtime?.projection;
    const dataset = controller?.workspaceDataset;
    if (!topology || !projection || !dataset) {
      throw new Error('Table production authority is unavailable.');
    }
    const excludedComponents = new Set(['P-001', 'P-003', 'P-006']);
    for (const entity of dataset.entities ?? []) {
      const type = String(entity.entityType ?? entity.type ?? '').toUpperCase();
      if (!['REST', 'GUIDE', 'LINE_STOP', 'ANCHOR', 'SPRING', 'SUPPORT', 'RESTRAINT'].includes(type)) continue;
      const attributes = entity.properties?.sourceAttributes ?? entity.properties?.attributes ?? {};
      const attached = attributes.ATTACHED_COMPONENT_ID ?? attributes.SUPPORTED_COMPONENT_ID;
      if (attached) excludedComponents.add(String(attached));
    }
    const degree = new Map((topology.nodes ?? []).map((node) => [node.id, 0]));
    for (const edge of topology.edges ?? []) {
      degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
      degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
    }
    const candidates = (topology.edges ?? []).filter((edge) => (
      String(edge.entityType ?? '').toUpperCase() === 'PIPE'
      && !excludedComponents.has(String(edge.componentKey ?? '').replace(/^edge:/, ''))
    ));
    candidates.sort((left, right) => {
      if (left.componentKey === 'P-007') return -1;
      if (right.componentKey === 'P-007') return 1;
      return left.id.localeCompare(right.id);
    });
    for (const edge of candidates) {
      const row = projection.rows.find((candidate) => candidate.identity.canonicalId === edge.id);
      if (!row || !(row.fields.lengthMm > 240)) continue;
      if (degree.get(edge.toNodeId) === 1) {
        return {
          edgeId: edge.id,
          tag: row.fields.tag,
          currentLengthMm: row.fields.lengthMm,
          anchor: 'FROM',
          propagation: 'DOWNSTREAM',
        };
      }
      if (degree.get(edge.fromNodeId) === 1) {
        return {
          edgeId: edge.id,
          tag: row.fields.tag,
          currentLengthMm: row.fields.lengthMm,
          anchor: 'TO',
          propagation: 'UPSTREAM',
        };
      }
    }
    throw new Error('No safe graph-terminal canonical PIPE is available outside intentional defect/support zones.');
  });
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const journal = controller?.session?.journal;
    return {
      canonicalHash: topology?.canonicalTopologyHash ?? null,
      journalHash: journal?.journalHash ?? null,
      activeLedgerHash: journal?.activeLedgerHash ?? null,
      activeCommandIds: [...(journal?.activeCommandIds ?? [])],
      sessionVersion: journal?.sessionVersion ?? null,
      sourceHash: controller?.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller?.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      activeCommandCount: journal?.activeCommandIds?.length ?? 0,
      rendererCount: controller?.viewportBackend?.renderer?.domElement ? 1 : 0,
    };
  });
}
function expectAuthorityNoop(actual, expected) {
  expect(actual.canonicalHash).toBe(expected.canonicalHash);
  expect(actual.journalHash).toBe(expected.journalHash);
  expect(actual.activeLedgerHash).toBe(expected.activeLedgerHash);
  expect(actual.activeCommandIds).toEqual(expected.activeCommandIds);
  expect(actual.sessionVersion).toBe(expected.sessionVersion);
  expect(actual.sourceHash).toBe(expected.sourceHash);
  expect(actual.sourceByteHash).toBe(expected.sourceByteHash);
  expect(actual.activeCommandCount).toBe(expected.activeCommandCount);
  expect(actual.rendererCount).toBe(expected.rendererCount);
}
function collectDiagnostics(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}
