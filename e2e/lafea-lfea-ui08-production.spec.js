import { expect, test } from '@playwright/test';

const INPUTXML = `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
  <UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
    <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
    <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS>
  <PIPINGMODEL xmlns="" JOBNAME="UI08-PRODUCTION-E2E">
    <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1200" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="168.3" WALL_THICK="7.11" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
      <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
    </PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DELTA_X="1200" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100"/>
  </PIPINGMODEL>
</CAESARII>`;

const step = (page, id) => page.locator(`[data-role="lfea-pipeline-step"][data-step-id="${id}"]`);

test('UI08 exact production LFEA InputXML six-step workflow and profile currentness', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'LFEA', exact: true }).click();

  const shell = page.locator('[data-role="lfea-pipeline-shell"]');
  await expect(shell).toBeVisible();
  await expect(page.locator('[data-role="lfea-pipeline-step"]')).toHaveCount(6);

  const sourceHost = page.locator('.lfea-pipeline-shell__host[data-host-group="SOURCE"]');
  const sourceAcquisition = sourceHost.locator('[data-role="lfea-source-acquisition"]');
  const inputXmlPanel = sourceHost.locator('[data-role="linear-piping-inputxml-source-workflow"]');

  const chooserPromise = page.waitForEvent('filechooser');
  await sourceAcquisition.getByRole('button', { name: 'CAESAR II InputXML', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'ui08-production-e2e.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(INPUTXML, 'utf8'),
  });

  await expect(inputXmlPanel).toBeVisible();
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-status', 'WARN', { timeout: 15000 });
  await expect(sourceAcquisition.locator('[data-role="lfea-source-acquisition-active"]'))
    .toContainText('CAESAR II InputXML');
  await expect(step(page, 'INPUT')).toHaveClass(/lfea-pipeline-shell__step--complete/u);

  await step(page, 'ERROR_CHECK').click();
  const errorCheck = sourceHost.locator('[data-role="lfea-common-error-check-panel"]');
  await expect(errorCheck).toBeVisible();
  await expect(errorCheck).toHaveAttribute('data-pre-flight-status', 'WARN');
  await acknowledgeAndAuthorize(errorCheck);
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-authorized', 'true');
  await expect(errorCheck).toHaveAttribute('data-solve-authorized', 'true');
  await expect(step(page, 'ERROR_CHECK')).toHaveClass(/lfea-pipeline-shell__step--complete/u);

  await step(page, 'LOAD_CASE').click();
  const casePanel = page.locator('[data-role="lfea-pipeline-case-selection-panel"]');
  await expect(casePanel).toBeVisible();
  await expect(casePanel.locator('[data-role="lfea-pipeline-case-checkbox"]:checked').first()).toBeVisible();
  await casePanel.locator('[data-action="lfea-pipeline-apply-cases"]').click();

  // Applying a case selection re-runs governed preparation, which seals a new
  // preparation identity and invalidates the previous pre-flight
  // authorization. Re-authorize before analyzing, proving currentness is
  // enforced rather than silently carried over.
  await step(page, 'ERROR_CHECK').click();
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-status', 'WARN');
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-authorized', 'false');
  await expect(errorCheck).toHaveAttribute('data-authorization-state', 'CONDITIONAL_PENDING');
  await acknowledgeAndAuthorize(errorCheck);
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-authorized', 'true');

  const runStep = step(page, 'RUN');
  await expect(runStep).toBeEnabled();
  await runStep.click();
  await page.locator('[data-role="lfea-pipeline-run-panel"] [data-action="lfea-pipeline-analyze"]')
    .click();

  const resultsHost = page.locator('.lfea-pipeline-shell__host[data-host-group="RESULTS"]');
  await expect(resultsHost).toBeVisible({ timeout: 15000 });
  await expect(resultsHost).toHaveAttribute('data-active-step', 'OUTPUT');
  await expect(step(page, 'LOAD_CASE')).toHaveClass(/lfea-pipeline-shell__step--complete/u);
  await expect(step(page, 'RUN')).toHaveClass(/lfea-pipeline-shell__step--complete/u);
  const resultPanel = resultsHost.locator('[data-role="lfea-pipeline-results-panel"]');
  await expect(resultPanel.locator('[data-role="lfea-pipeline-results-summary"]')).toBeVisible();
  await expect(resultPanel).not.toContainText('No analysis has been run yet.');

  await step(page, 'RUN').click();
  await expect(resultsHost).toHaveAttribute('data-active-step', 'RUN');
  await expect(resultsHost.locator('[data-role="lfea-pipeline-run-panel"]')).toBeVisible();
  await step(page, 'OUTPUT').click();
  await expect(resultsHost).toHaveAttribute('data-active-step', 'OUTPUT');
  await expect(resultPanel.locator('[data-role="lfea-pipeline-results-summary"]')).toBeVisible();

  await step(page, 'EXPORT').click();
  await expect(resultsHost).toHaveAttribute('data-active-step', 'EXPORT');
  const csv = resultsHost.locator('[data-role="lfea-pipeline-export-panel"] [data-action="lfea-pipeline-results-csv"]');
  await expect(csv).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await csv.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/u);

  // A governing profile change must invalidate the solved presentation. This
  // uses the visible Input control and then re-opens Output to prove old result
  // DOM cannot silently remain current.
  await step(page, 'INPUT').click();
  const profile = inputXmlPanel.locator('[data-role="linear-piping-inputxml-profile"]');
  const otherProfile = await profile.locator('option').evaluateAll((options, current) => (
    options.map((option) => option.value).find((value) => value !== current) ?? null
  ), await profile.inputValue());
  expect(otherProfile).not.toBeNull();
  await profile.selectOption(otherProfile);
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-authorized', 'false');

  await expect(step(page, 'OUTPUT')).toHaveAttribute('data-step-status', 'BLOCKED');
  await expect(resultPanel).toContainText('No analysis has been run yet.');
  await expect(resultPanel.locator('[data-role="lfea-pipeline-results-summary"]')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

async function acknowledgeAndAuthorize(errorCheck) {
  const acknowledgements = errorCheck.locator('[data-action="lfea-error-check-acknowledge-limitation"]');
  const count = await acknowledgements.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await acknowledgements.nth(index).click();
  }
  await errorCheck.locator('[data-role="lfea-error-check-reviewer"]').fill('ui08-production-browser');
  await errorCheck.locator('[data-role="lfea-error-check-reason"]')
    .fill('Exact-head browser qualification of disclosed InputXML limitations.');
  const authorize = errorCheck.locator('[data-action="authorize-lfea-error-check-limitations"]');
  await expect(authorize).toBeEnabled();
  await authorize.click();
}
