import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// Side-by-side error groups + model canvas: the canvas sits left of the
// grouped findings, clicking a group highlights every resolved occurrence in
// the SOURCE geometry, and a highlighted element stays actionable through the
// existing inspector. Consent-free acceptance controls stay untouched.
const fixture = fileURLToPath(new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url));
const originalSha = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';

test.describe('AA3 error-check group locate with side-by-side model canvas', () => {
  test.skip(!fs.existsSync(fixture), 'Committed BM4_L source is required.');

  test.beforeAll(() => {
    const bytes = fs.readFileSync(fixture);
    expect(bytes.length).toBe(5136384);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(originalSha);
  });

  async function importSource(page) {
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixture);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    await expect(page.locator('[data-role="topbar-dataset"]')).toHaveText('BM4_L.ACCDB');
    const workspace = page.locator('[data-role="lfea-accdb-repair-workspace"]');
    const svg = workspace.locator('[data-role="lfea-accdb-repair-svg-host"] svg[data-representation="SOURCE"]');
    await expect(svg).toBeVisible();
    return { workspace, svg };
  }

  test('canvas and grouped findings render side by side, canvas on the left', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await importSource(page);
    const main = page.locator('[data-role="lfea-common-error-check-main"]');
    await expect(main).toBeVisible();
    const columns = await main.evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(2);
    const firstRole = await main.evaluate((el) => el.children[0]?.getAttribute('data-role'));
    const secondRole = await main.evaluate((el) => el.children[1]?.getAttribute('data-role'));
    expect(firstRole).toBe('lfea-common-error-check-model-host');
    expect(secondRole).toBe(null); // content wrapper div
    expect(errors).toEqual([]);
  });

  test('"Show all in model" highlights every occurrence without expanding the group', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const { workspace, svg } = await importSource(page);
    const panel = page.locator('[data-role="lfea-common-error-check-panel"]');
    // The 7x overlapping-pipe-runs group resolves to exact spans and nodes.
    const group = panel.locator('[data-role="lfea-common-error-check-finding-group"][data-group-code="TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP"]');
    await expect(group).toBeVisible();
    await expect(group).toHaveAttribute('data-occurrences', '7');
    const details = group.locator('details');
    await expect(details).not.toHaveAttribute('open', '');
    await group.locator('[data-action="lfea-error-check-locate-group"]').click();
    await expect(details).not.toHaveAttribute('open', '');
    const selected = svg.locator('[data-selected="true"]');
    expect(await selected.count()).toBeGreaterThan(1);
    await expect(workspace.locator('[data-role="lfea-accdb-repair-status"]'))
      .toContainText(/Located \d+ of 7 occurrences/);
    // The first resolved element is selected, so the inspector is actionable.
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    await expect(inspector.locator(':scope > strong')).toContainText('Node');
    expect(errors).toEqual([]);
  });

  test('expanding a group locates it; a highlighted node opens the inspector', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const { workspace, svg } = await importSource(page);
    const panel = page.locator('[data-role="lfea-common-error-check-panel"]');
    // The 3x "two node numbers very close together" advisory group.
    const group = panel.locator('[data-role="lfea-common-error-check-finding-group"][data-group-code="TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT"]');
    await expect(group).toBeVisible();
    await expect(group).toHaveAttribute('data-occurrences', '3');
    await group.locator('summary').click();
    await expect(group.locator('details')).toHaveAttribute('open', '');
    const selected = svg.locator('[data-selected="true"]');
    expect(await selected.count()).toBeGreaterThan(1);
    await expect(workspace.locator('[data-role="lfea-accdb-repair-status"]'))
      .toContainText(/Located \d+ of 3 occurrences/);
    const node = svg.locator('circle[data-node-id][data-selected="true"]').first();
    await node.click();
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    await expect(inspector.locator(':scope > strong')).toContainText('Node');
    expect(errors).toEqual([]);
  });

  test('compact review: source evidence is labelled and identity-less occurrences are review-only', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await importSource(page);
    const panel = page.locator('[data-role="lfea-common-error-check-panel"]');
    // Defect 1 port: recorded source facts are labelled as evidence, not
    // repair actions (the friction PASS group lives in a category header).
    const evidence = panel.locator('[data-role="lfea-common-error-check-source-evidence"]');
    await expect(evidence.first()).toContainText('Source evidence');
    await expect(evidence.first()).toContainText('not repair actions');
    // Defect 3 port: the friction group carries no source identity anywhere,
    // so its occurrences must not offer source edit, only review-only.
    const group = panel.locator('[data-role="lfea-common-error-check-finding-group"][data-group-code="ACCDB_RESTRAINT_FRICTION_NOT_MODELED"]');
    await group.locator('summary').click();
    await expect(group.locator('details')).toHaveAttribute('open', '');
    await expect(group.locator('[data-role="lfea-error-check-review-only"]').first()).toBeVisible();
    await expect(group.locator('[data-action="lfea-error-check-edit-occurrence"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('auto fix queue lists eligible topology findings and skips mechanics classes', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const { workspace } = await importSource(page);
    const queue = page.locator('[data-role="lfea-error-check-fix-queue"]');
    await expect(queue).toBeVisible();
    // The overlap and near-coincident topology groups are EDITABLE_INPUT with
    // exact source identity → eligible.
    await expect(queue.locator('[data-role="lfea-error-check-fix-item"][data-group-code="TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP"]')).toBeVisible();
    await expect(queue.locator('[data-role="lfea-error-check-fix-item"][data-group-code="TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT"]')).toBeVisible();
    // The friction mechanics class must never appear as fixable.
    await expect(queue.locator('[data-group-code="ACCDB_RESTRAINT_FRICTION_NOT_MODELED"]')).toHaveCount(0);
    // Fix opens the governed workspace inspector (no direct write).
    await queue.locator('[data-action="lfea-error-check-fix-item"][data-group-code="TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT"]').click();
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    await expect(inspector.locator(':scope > strong')).toContainText('Node');
    expect(errors).toEqual([]);
  });

  test('fix queue batch: collapsible panel, Skip all empties the queue', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await importSource(page);
    const queue = page.locator('[data-role="lfea-error-check-fix-queue"]');
    await expect(queue).toBeVisible();
    await expect(queue.locator('[data-action="lfea-error-check-fix-all"]')).toBeVisible();
    // Skip all removes every queued item for this preparation.
    await queue.locator('[data-action="lfea-error-check-skip-all"]').click();
    await expect(queue.locator('[data-role="lfea-error-check-fix-item"]')).toHaveCount(0);
    await expect(queue).toContainText('none fixable in-app');
    // Per-item skip works on a fresh reload.
    await page.reload();
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    await page.getByRole('button', { name: /Reference BM4_L/ }).click();
    await page.getByText(/Loaded BM4_L\.ACCDB: 96 element/).waitFor({ timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    const queue2 = page.locator('[data-role="lfea-error-check-fix-queue"]');
    await expect(queue2.locator('[data-role="lfea-error-check-fix-item"]')).toHaveCount(3);
    await queue2.locator('[data-action="lfea-error-check-fix-skip"]').first().click();
    await expect(queue2.locator('[data-role="lfea-error-check-fix-item"]')).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test('fix walk: governed correction applies and the walk advances with a ledger entry', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const { workspace } = await importSource(page);
    const queue = page.locator('[data-role="lfea-error-check-fix-queue"]');
    // Park the overlap item so the walk starts at the near-coincident group.
    await queue.locator('[data-action="lfea-error-check-fix-skip"][data-group-id="TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP::ADVISORY"]').click();
    await queue.locator('[data-action="lfea-error-check-fix-all"]').click();
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    await expect(inspector.locator(':scope > strong')).toContainText('Node');
    // Governed transaction: review, preview, apply (mirrors the issue #49
    // regression correction; the near-coincident pair here is element-
    // connected, so no automatic alignment is suggested — by design).
    await workspace.locator('[data-role="lfea-repair-approver"]').fill('Regression engineer');
    await workspace.locator('[data-role="lfea-repair-reason"]').fill('Walk correction with explicit review');
    const rawText = await inspector.locator('p').filter({ hasText: /Raw source X:/u }).first().textContent();
    const raw = /Raw source X:\s*([-+]?\d+(?:\.\d+)?)/iu.exec(rawText);
    expect(raw).toBeTruthy();
    await workspace.locator('[data-role="lfea-repair-coordinate-value"]').fill(String(Number(raw[1]) + 0.5));
    await workspace.locator('[data-action="lfea-repair-preview"]').click();
    await workspace.locator('[data-action="lfea-repair-apply"]').click();
    // The ledger records the governed apply and treats the item as handled;
    // the walk then advances (or ends, if the correction cleared the
    // remaining topology findings).
    await expect(queue.locator('[data-role="lfea-error-check-fix-ledger"] p[data-status="APPLIED"]'))
      .toContainText('TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT', { timeout: 60000 });
    expect(errors).toEqual([]);
  });
});
