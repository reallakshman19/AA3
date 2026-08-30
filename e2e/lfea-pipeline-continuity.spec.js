import { expect, test } from '@playwright/test';

/** Fixture-free contract for the LFEA shell's visual/task continuity. */
test.describe('LFEA pipeline continuity', () => {
  test('renders one connected six-step workflow with stable icon identities', async ({ page }) => {
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
      const step = steps.filter({ has: page.locator(`[data-step-id="${stepId}"]`) });
      const byId = page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${stepId}"]`);
      await expect(byId).toContainText(label);
      await expect(byId.locator('.lfea-pipeline-icon')).toHaveCount(1);
      await expect(byId.locator('[data-role="lfea-pipeline-step-index"]')).toHaveText(String(index + 1));
      expect(await step.count()).toBeLessThanOrEqual(1);
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

    // Without a model, later tasks are visibly blocked rather than looking
    // like unrelated tabs that happen to be empty.
    for (const stepId of ['ERROR_CHECK', 'LOAD_CASE', 'RUN', 'OUTPUT', 'EXPORT']) {
      await expect(page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${stepId}"]`))
        .toHaveAttribute('data-step-status', 'BLOCKED');
    }
    await expect(page.locator('[data-role="lfea-pipeline-guidance"]')).toContainText('Next: Input');

    expect(pageErrors).toEqual([]);
  });

  test('owns Analyze on Run and CSV on Export, not on neighboring tasks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Application views' })
      .getByRole('button', { name: 'LFEA', exact: true }).click();

    const runPanel = page.locator('[data-role="lfea-pipeline-run-panel"]');
    await expect(runPanel).toHaveCount(1);
    await expect(runPanel.locator('[data-action="lfea-pipeline-analyze"]')).toHaveCount(1);
    await expect(page.locator('[data-role="lfea-pipeline-case-selection-panel"] [data-action="lfea-pipeline-analyze"]'))
      .toHaveCount(0);

    const exportPanel = page.locator('[data-role="lfea-pipeline-export-panel"]');
    await expect(exportPanel).toHaveCount(1);
    await expect(exportPanel.locator('[data-action="lfea-pipeline-results-csv"]')).toHaveCount(1);

    // The only legacy CSV action remaining inside the results controller is
    // presentation-hidden; Export is the visible task owner.
    const inlineExport = page.locator('[data-role="lfea-pipeline-results-panel"] .lfea-pipeline-results__export');
    if (await inlineExport.count()) await expect(inlineExport).toBeHidden();
  });
});
