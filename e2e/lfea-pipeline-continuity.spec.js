import { expect, test } from '@playwright/test';

/** Fixture-free contract for the LFEA shell's visual/task continuity. */
test.describe('LFEA pipeline continuity', () => {
  test('renders one connected six-step workflow with native task hosts', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();

    const steps = page.locator('[data-role="lfea-pipeline-step"]');
    await expect(steps).toHaveCount(6);
    await expect(page.locator('[data-role="lfea-pipeline-step-connector"]')).toHaveCount(5);

    const expected = [
      ['INPUT', 'Input'],
      ['ERROR_CHECK', 'Error check'],
      ['LOAD_CASE', 'Load case'],
      ['RUN', 'Run'],
      ['OUTPUT', 'Output'],
      ['EXPORT', 'Export'],
    ];
    for (let index = 0; index < expected.length; index += 1) {
      const [stepId, label] = expected[index];
      const step = page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${stepId}"]`);
      await expect(step).toContainText(label);
      await expect(step.locator('.lfea-pipeline-icon')).toHaveCount(1);
      await expect(step.locator('[data-role="lfea-pipeline-step-index"]')).toHaveText(String(index + 1));
    }

    for (const hostGroup of ['SOURCE', 'LOAD_CASE', 'RUN', 'OUTPUT', 'EXPORT']) {
      await expect(page.locator(`[data-host-group="${hostGroup}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-host-group="SOURCE"]')).toBeVisible();
    for (const hostGroup of ['LOAD_CASE', 'RUN', 'OUTPUT', 'EXPORT']) {
      await expect(page.locator(`[data-host-group="${hostGroup}"]`)).toBeHidden();
    }

    const context = page.locator('[data-role="lfea-pipeline-active-step-context"]');
    await expect(context).toHaveAttribute('data-step-id', 'INPUT');
    await expect(context.locator('[data-role="lfea-pipeline-active-step-position"]')).toHaveText('Step 1 of 6');
    await expect(context.locator('[data-role="lfea-pipeline-active-step-title"]')).toHaveText('Input');

    for (const action of [
      'lfea-pipeline-load-sample',
      'lfea-pipeline-assemble-and-run',
      'lfea-pipeline-toggle-verification-drawer',
    ]) {
      await expect(page.locator(`[data-action="${action}"] .lfea-pipeline-icon`)).toHaveCount(1);
    }
    await expect(page.locator('.lfea-pipeline-shell__authority .lfea-pipeline-icon')).toHaveCount(1);
    await expect(page.locator('[data-role="lfea-pipeline-optional-tools-label"]')).toHaveText('Optional tools');

    const stagedOptions = page.locator('[data-role="lfea-source-acquisition-staged-options"]');
    await expect(stagedOptions).toHaveCount(1);
    await expect(stagedOptions).not.toHaveAttribute('open', '');
    await expect(stagedOptions.locator('summary')).toHaveText('StagedJSON options');

    for (const stepId of ['ERROR_CHECK', 'LOAD_CASE', 'RUN', 'OUTPUT', 'EXPORT']) {
      await expect(page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${stepId}"]`))
        .toHaveAttribute('data-step-status', 'BLOCKED');
    }
    await expect(page.locator('[data-role="lfea-pipeline-guidance"]')).toContainText('Next: Input');
    expect(pageErrors).toEqual([]);
  });

  test('owns Analyze on Run, results on Output and CSV on Export', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();

    const runPanel = page.locator('[data-host-group="RUN"] [data-role="lfea-pipeline-run-panel"]');
    await expect(runPanel).toHaveCount(1);
    await expect(runPanel.locator('[data-action="lfea-pipeline-analyze"]')).toHaveCount(1);
    await expect(page.locator('[data-role="lfea-pipeline-case-selection-panel"] [data-action="lfea-pipeline-analyze"]'))
      .toHaveCount(0);

    await expect(page.locator('[data-host-group="OUTPUT"] [data-role="lfea-pipeline-results-panel"]')).toHaveCount(1);
    await expect(page.locator('[data-host-group="OUTPUT"] [data-role="lfea-results-authority-panel"]')).toHaveCount(1);
    await expect(page.locator('[data-host-group="OUTPUT"] [data-action="lfea-pipeline-results-csv"]')).toHaveCount(0);

    const exportPanel = page.locator('[data-host-group="EXPORT"] [data-role="lfea-pipeline-export-panel"]');
    await expect(exportPanel).toHaveCount(1);
    await expect(exportPanel.locator('[data-action="lfea-pipeline-results-csv"]')).toHaveCount(1);
  });
});
