import { expect, test } from '@playwright/test';

// Pyodide's first load in a test run can take longer than the default
// timeout (WASM runtime download + real python3-equivalent execution),
// so this spec gets a longer budget than the Phase-1 shell spec.
test.setTimeout(90000);

test('StagedJSON converts to real InputXML and hands off to the existing pre-flight panel', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  const stagedPanel = page.locator('[data-role="lfea-pipeline-stagedjson-input-panel"]');
  const inputXmlPanel = page.locator('[data-role="linear-piping-inputxml-source-workflow"]');
  await expect(stagedPanel).toBeVisible();
  await expect(inputXmlPanel).toBeVisible();

  await page.locator('[data-role="lfea-pipeline-stagedjson-infer-od"]').check();
  await page.locator('[data-role="lfea-pipeline-stagedjson-source-file"]')
    .setInputFiles('public/Sjson.json');

  const stagedStatus = page.locator('[data-role="lfea-pipeline-stagedjson-status"]');
  await expect(stagedStatus).toContainText(/Converted|failed/i, { timeout: 60000 });
  await expect(stagedStatus).toContainText('Converted');
  await expect(stagedStatus).toContainText('0 errors');

  const diagnosticsSummary = page.locator('[data-role="stagedjson-conversion-diagnostics-summary"]');
  await expect(diagnosticsSummary).toContainText('READY');
  await expect(diagnosticsSummary).toContainText('Errors0');

  // The concrete proof this is a real handoff, not just a converter demo:
  // the InputXML panel -- completely unmodified by this feature -- now
  // shows a real, non-placeholder pre-flight verdict for the converted
  // model. Which verdict (PASS/WARN/BLOCK) depends on this specific
  // fixture's own data completeness, not on this wiring, so this
  // asserts a real computed status was reached and real counts are
  // shown, not a specific verdict.
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-status', /PASS|WARN|BLOCK/);
  await expect(inputXmlPanel.getByText('142')).toBeVisible();
  await expect(inputXmlPanel.getByText('139')).toBeVisible();

  // Clearing the StagedJSON panel also clears the InputXML panel it fed,
  // rather than leaving a stale converted result next to an emptied
  // source panel.
  await page.locator('[data-action="clear-lfea-pipeline-stagedjson-source"]').click();
  await expect(inputXmlPanel).toHaveAttribute('data-source-status', 'EMPTY');
});
