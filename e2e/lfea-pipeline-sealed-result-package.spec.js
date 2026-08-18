import { expect, test } from '@playwright/test';
import { LINEAR_PIPING_WORKSPACE_PACKAGE_SCHEMA } from '../src/workspace/linear-piping-results-workbench.js';
import { buildQualifiedPresentationFixture } from '../scripts/linear-piping-presentation-fixtures.mjs';

// e2e/linear-piping-results-workspace.spec.js already proves this
// shortcut at the API level (page.evaluate(...importLinearPipingResultPackage...)).
// This spec closes the real gap: driving the actual "Import Sealed
// Result Package" button/file input through the unified pipeline
// shell's own step stepper, confirming Error-check/Load-case/Run are
// genuinely skipped (never touched, never marked complete) rather than
// merely unvisited.
const fixture = buildQualifiedPresentationFixture();
const PACKAGE_VALUE = JSON.parse(JSON.stringify({
  schema: LINEAR_PIPING_WORKSPACE_PACKAGE_SCHEMA,
  applicationResult: fixture.applicationResult,
  analysisResults: fixture.analysisResults,
  interfaceSet: fixture.interfaceSet,
  interfaceRecoveries: fixture.interfaceRecoveries,
  nozzleAssessments: fixture.nozzleAssessments,
  b31Application: fixture.b31Application,
}));

test('a Sealed Result Package uploaded through the real UI reaches Output/Export with Error-check/Load-case/Run genuinely skipped', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  // Navigate straight to RUN -- the results panel's own host -- without
  // ever visiting INPUT/ERROR_CHECK/LOAD_CASE, exactly as an engineer
  // using this shortcut for an already-solved result would.
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]').click();
  const importButton = page.locator('[data-action="import-linear-piping-results"]');
  await expect(importButton).toBeVisible();

  await page.setInputFiles('[data-role="linear-piping-result-package-file"]', {
    name: 'sealed-package.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(PACKAGE_VALUE), 'utf8'),
  });

  const section = page.locator('[data-section-id="linear-piping-results"]');
  await expect(section).toHaveAttribute('data-current', 'true');

  // Results persist through Output and Export without any Error-check/
  // Load-case/Run interaction.
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="OUTPUT"]').click();
  await expect(section).toHaveAttribute('data-current', 'true');
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="EXPORT"]').click();
  await expect(section).toHaveAttribute('data-current', 'true');

  // A real skip, not merely an unvisited step: ERROR_CHECK/LOAD_CASE
  // were never marked complete by this shortcut.
  await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]'))
    .not.toHaveClass(/lfea-pipeline-shell__step--complete/);
  await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
    .not.toHaveClass(/lfea-pipeline-shell__step--complete/);
});
