import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// Additive consent-free acceptance controls. The original issue #49 real-model
// spec and its assertions are unchanged. No diagnostic review, edit or Run.
const fixture = fileURLToPath(new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url));
const originalSha = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';

test.describe('AA3 #51 authentic SOURCE SVG pointer and focus boundaries', () => {
  test.skip(!fs.existsSync(fixture), 'Committed BM4_L source is required.');

  test.beforeAll(() => {
    const bytes = fs.readFileSync(fixture);
    expect(bytes.length).toBe(5136384);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(originalSha);
  });

  async function importSource(page, { factorSelection = false } = {}) {
    await page.goto('/', { timeout: 120000 });
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();
    if (factorSelection) {
      await page.locator('[data-role="lfea-bend-factor-edition"]')
        .selectOption('B31_3_2022_B31J_2017');
      await page.locator('[data-role="lfea-bend-smooth90-policy"]').selectOption('YES');
    }
    await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixture);
    await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
      .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
    await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
    await expect(page.locator('[data-role="topbar-dataset"]')).toHaveText('BM4_L.ACCDB');
    await expect(page.locator('[data-role="lfea-topbar-run-status"]')).toContainText('Run blocked');
    const workspace = page.locator('[data-role="lfea-accdb-repair-workspace"]');
    const svg = workspace.locator('[data-role="lfea-accdb-repair-svg-host"] svg[data-representation="SOURCE"]');
    const inspector = workspace.locator('[data-role="lfea-accdb-repair-inspector"]');
    await expect(svg).toBeVisible();
    return { workspace, svg, inspector };
  }

  test('the real offset source node 20010 and node 20020 accept ordinary pointer hits', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Preserve the factor basis and ordinary non-forced pointer path of the
    // original failing test, including the displaced hit-selector identity.
    const { svg, inspector } = await importSource(page, { factorSelection: true });
    const node20010 = svg.locator('circle[data-node-id="20010"][role="button"]');
    const node20020 = svg.locator('circle[data-node-id="20020"][role="button"]');
    await expect(node20010).toHaveAttribute('data-hit-target-offset', 'DISPLAY_ONLY');
    await expect(node20020).toHaveAttribute('data-hit-target-offset', 'DISPLAY_ONLY');
    await expect(svg.locator('[data-role="lfea-geometry-review-caption"]'))
      .toHaveCSS('pointer-events', 'none');
    await node20010.click();
    await expect(inspector.locator(':scope > strong')).toContainText('Node 20010');
    await node20020.click();
    await expect(inspector.locator(':scope > strong')).toContainText('Node 20020');
    await node20010.click();
    await expect(inspector.locator(':scope > strong')).toContainText('Node 20010');
    expect(errors).toEqual([]);
  });

  test('native Tab→Return preserves focus on the newly rendered exact SOURCE span and next Tab', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const { workspace, svg, inspector } = await importSource(page);
    const errorCheck = page.locator('[data-role="lfea-common-error-check-panel"]');
    const run = page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]');
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'false');
    await expect(run).toHaveAttribute('data-step-status', 'BLOCKED');
    const evidence = errorCheck.locator('[data-role="lfea-common-error-check-evidence-table"] tr');
    const beforeEvidence = await evidence.allTextContents();
    const reviewed = errorCheck.locator('[data-role="lfea-common-error-check-reviewed"]');
    const beforeReviewed = await reviewed.count();
    const open = errorCheck.locator('[data-role="lfea-common-error-check-finding-group"] details[open]');
    const beforeOpen = await open.count();
    const findButton = workspace.locator('[data-action="lfea-repair-find"]');
    await findButton.focus(); // Starting toolbar anchor only; never focus the SVG target.
    await expect(findButton).toBeFocused();
    await page.keyboard.press('Tab');
    const firstSpan = svg.locator('line[data-segment-id][role="button"][tabindex="0"]').first();
    await expect(firstSpan).toBeFocused();
    const id = await firstSpan.getAttribute('data-segment-id');
    expect(id).toBe('ACCDB.E1');
    const oldNode = await firstSpan.elementHandle();
    await page.keyboard.press('Enter'); // No target refocus or direct handler invocation.
    await expect(inspector.locator(':scope > strong')).toContainText(id);
    await expect(inspector).toContainText('ACCDB ELEMENTID 1');
    await expect(inspector.locator('[data-role="lfea-repair-property-field"]')).toBeVisible();
    const newSpan = svg.locator('line[data-segment-id="ACCDB.E1"][role="button"][tabindex="0"]');
    await expect(newSpan).toBeFocused();
    expect(await oldNode.evaluate(node => node.isConnected)).toBe(false);
    expect(await newSpan.evaluate(node => node.isConnected && node === document.activeElement)).toBe(true);
    // Focus must advance naturally to the next actual DOM-ordered source
    // selector rather than to BODY, a detached span or an invented index.
    await page.keyboard.press('Tab');
    expect(await svg.evaluate(root => {
      const controls = [...root.querySelectorAll('[role="button"][tabindex="0"]')];
      const at = controls.findIndex(el => el.dataset.segmentId === 'ACCDB.E1');
      return at >= 0 && at + 1 < controls.length
        && document.activeElement === controls[at + 1];
    })).toBe(true);
    expect(await evidence.allTextContents()).toEqual(beforeEvidence);
    expect(await reviewed.count()).toBe(beforeReviewed);
    expect(await open.count()).toBe(beforeOpen);
    await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'false');
    await expect(run).toHaveAttribute('data-step-status', 'BLOCKED');
    await expect(page.locator('[data-role="topbar-dataset"]')).toHaveText('BM4_L.ACCDB');
    expect(errors).toEqual([]);
  });
});
