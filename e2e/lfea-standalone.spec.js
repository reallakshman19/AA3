import { expect, test } from '@playwright/test';
import {
  lfeaStandaloneInputXmlX,
  lfeaStandaloneInputXmlY,
  lfeaStandaloneMalformedInputXml,
} from './fixtures/lfea-standalone-inputxml-fixtures.js';

const LFEA_URL = '/Advanced_Analysis/lfea.html';
const STATUS = '[data-role="lfea-standalone-status"]';
const SOURCE_INPUT = 'section[data-view-id="source"] input[type="file"]';
const view = (id) => `section[data-view-id="${id}"]`;

async function openStandalone(page) {
  await page.goto(LFEA_URL);
  await expect(page.locator('[data-role="lfea-standalone-shell"]')).toBeVisible();
  await expect(page.locator('[data-role="lafea-consumer-root"]')).toHaveCount(0);
  await expect(page.locator('[data-role="lfea-consumer-root"]')).toHaveCount(1);
}

async function uploadXml(page, name, content) {
  await page.locator(SOURCE_INPUT).setInputFiles({
    name,
    mimeType: 'text/xml',
    buffer: Buffer.from(content),
  });
}

async function authorizeIfRequired(page) {
  const run = page.getByRole('button', { name: 'Run native analysis' });
  if (await run.isEnabled()) return;
  const candidates = [
    page.getByRole('button', { name: /accept warn limitations/i }),
    page.getByRole('button', { name: /authorize.*pre.?flight/i }),
    page.getByRole('button', { name: /accept.*limitations/i }),
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      await expect(run).toBeEnabled();
      return;
    }
  }
  await expect(run).toBeEnabled();
}

async function runNative(page) {
  await page.locator('button[data-view-id="analysis"]').click();
  const run = page.getByRole('button', { name: 'Run native analysis' });
  await authorizeIfRequired(page);
  await run.click();
  await expect(page.locator(view('results'))).toBeVisible();
  await expect(page.getByText('Raw B-3.3 displacement — GLOBAL basis')).toBeVisible();
  await expect(page.getByText('Recovered B-3.4 element-end actions')).toBeVisible();
}

async function createDossier(page) {
  await page.locator('button[data-view-id="verification"]').click();
  await expect(page.getByRole('heading', { name: 'Native piping Verification' })).toBeVisible();
  await expect(page.getByText('CURRENT', { exact: true }).first()).toBeVisible();
  const create = page.getByRole('button', { name: 'Create current evidence dossier' });
  await expect(create).toBeEnabled();
  await create.click();
  await expect(page.getByText('CURRENT_EVIDENCE_ONLY', { exact: true })).toBeVisible();
  await expect(page.getByText('NO', { exact: true })).toBeVisible();
  await expect(page.getByText('SUPPORT_ACTIONS_PUBLICATION_BLOCKED')).toBeVisible();
  await expect(page.getByText('B31_CODE_PUBLICATION_BLOCKED')).toBeVisible();
}

async function historyRunIds(page) {
  await page.locator('button[data-view-id="history"]').click();
  const runs = page.locator(`${view('history')} [data-run-id]`);
  return runs.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id')).filter(Boolean));
}

test.describe('LFEA standalone governed browser journey', () => {
  test('Source → Run → Results → Verification/Dossier → stale → rerun → Compare → reload', async ({ page }) => {
    await openStandalone(page);

    await uploadXml(page, 'standalone-x.xml', lfeaStandaloneInputXmlX());
    await expect(page.locator(STATUS)).not.toContainText('Import a governed');
    await expect(page.getByText(/standalone-x\.xml/i)).toBeVisible();

    await page.locator('button[data-view-id="review"]').click();
    await expect(page.locator(view('review'))).toBeVisible();
    await page.locator('button[data-view-id="model"]').click();
    await expect(page.locator(view('model'))).toBeVisible();

    await runNative(page);
    await expect(page.getByText('Support actions Fa / Fl / Fv')).toBeVisible();
    await expect(page.getByText('GOVERNED_INTERFACE_SET_REQUIRED')).toBeVisible();
    await expect(page.getByText('COMPONENT_CODE_POINT_RECOVERY_REQUIRED')).toBeVisible();
    await createDossier(page);

    let runs = await historyRunIds(page);
    expect(runs.length).toBe(1);
    const firstRun = runs[0];
    await expect(page.locator(`[data-run-id="${firstRun}"]`)).toContainText('CURRENT');

    await page.locator('button[data-view-id="source"]').click();
    await uploadXml(page, 'standalone-y.xml', lfeaStandaloneInputXmlY());
    await page.locator('button[data-view-id="verification"]').click();
    await expect(page.getByText('CURRENT_RAW_EXECUTION_REQUIRED')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create current evidence dossier' })).toHaveCount(0);

    runs = await historyRunIds(page);
    await expect(page.locator(`[data-run-id="${firstRun}"]`)).toContainText('STALE');

    await runNative(page);
    runs = await historyRunIds(page);
    expect(runs.length).toBe(2);
    const secondRun = runs.find((runId) => runId !== firstRun);
    expect(secondRun).toBeTruthy();
    await expect(page.locator(`[data-run-id="${secondRun}"]`)).toContainText('CURRENT');

    await page.locator('button[data-view-id="compare"]').click();
    await page.locator('[data-role="lfea-compare-left"]').selectOption(firstRun);
    await page.locator('[data-role="lfea-compare-right"]').selectOption(secondRun);
    await page.getByRole('button', { name: 'Compare selected runs' }).click();
    await expect(page.getByText('NOT_DIRECTLY_COMPARABLE', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('BASIS_MISMATCH').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-role="lfea-standalone-shell"]')).toBeVisible();
    await expect(page.locator(STATUS)).toContainText('Recent source metadata only');
    await expect(page.locator(STATUS)).toContainText('Re-import is required');
    await expect(page.getByText('CURRENT_EVIDENCE_ONLY', { exact: true })).toHaveCount(0);
    await page.locator('button[data-view-id="history"]').click();
    await expect(page.locator(`${view('history')} [data-run-id]`)).toHaveCount(0);
  });

  test('malformed source cannot become runnable engineering authority', async ({ page }) => {
    await openStandalone(page);
    await uploadXml(page, 'malformed.xml', lfeaStandaloneMalformedInputXml());
    await expect(page.locator(view('source'))).toContainText(/failed|invalid|error|block/i);
    await page.locator('button[data-view-id="analysis"]').click();
    await expect(page.getByRole('button', { name: 'Run native analysis' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Create current evidence dossier' })).toHaveCount(0);
  });
});