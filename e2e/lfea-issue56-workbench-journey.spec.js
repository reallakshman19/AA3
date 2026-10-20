import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const BM4L_REFERENCE_BYTE_LENGTH = 5_136_384;
const BM4L_REFERENCE_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';

test.describe('Issue #56: LFEA Error Check Action Workbench and Prototype Run', () => {
  test('AC1–AC12: 4-lane workbench, bulk property editor, atomic batch transactions, 7-click reference journey, and prototype Run', async ({ page }) => {
    test.setTimeout(120000);
    // Independently hash actual fixture bytes at test runtime; a producer's
    // manifest declaration is not an authenticity check.
    const authenticBytes = fs.readFileSync('benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
    expect(authenticBytes.length).toBe(BM4L_REFERENCE_BYTE_LENGTH);
    expect(createHash('sha256').update(authenticBytes).digest('hex')).toBe(BM4L_REFERENCE_SHA256);
    const actionLedger = [];
    const logAction = (action, target, detail = '') => {
      actionLedger.push({ action, target, detail, time: new Date().toISOString() });
    };

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { timeout: 120000 });

    // 1. Switch to LFEA application view
    const lfeaNavBtn = page.locator('button[data-application-nav="LFEA"]');
    await expect(lfeaNavBtn).toBeVisible({ timeout: 15000 });
    await lfeaNavBtn.click();
    logAction('click', 'button[data-application-nav="LFEA"]', 'Switch to LFEA');

    // 2. Load authentic BM4_L fixture reference
    const refBtn = page.locator('[data-action="lfea-source-acquisition-reference-bm4l"]');
    await expect(refBtn).toBeVisible({ timeout: 30000 });
    await refBtn.click();
    logAction('click', 'ref-bm4l', 'Load BM4_L reference');

    const activeBadge = page.locator('[data-role="lfea-source-acquisition-active"]');
    await expect(activeBadge).toContainText('ACCDB', { timeout: 30000 });

    // 3. Navigate to Error Check step
    const errorCheckStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]');
    await errorCheckStep.click();
    logAction('click', 'step-ERROR_CHECK', 'Navigate to Error Check');

    // AC1: Action-first Error Check with 4 lanes and dynamic blocker
    const workbenchView = page.locator('[data-role="lfea-workbench-view"]');
    await expect(workbenchView).toBeVisible();

    const modeBadge = page.locator('[data-role="lfea-workbench-mode"]');
    await expect(modeBadge).toHaveText('Mode: PROTOTYPE');

    const runBlocker = page.locator('[data-role="lfea-workbench-run-blocker"]');
    await expect(runBlocker).toContainText('Run blocked: Choose B31/B31J component basis in Resolve shared settings');

    // Verify 4 lanes
    await expect(page.locator('.lfea-workbench-lane--fix_inputs')).toBeVisible();
    await expect(page.locator('.lfea-workbench-lane--resolve_settings')).toBeVisible();
    await expect(page.locator('.lfea-workbench-lane--prototype_assumptions')).toBeVisible();
    await expect(page.locator('.lfea-workbench-lane--information')).toBeVisible();

    // AC2: Bulk property editor with declared units, target scoping, and Cancel
    const selectFixableBtn = page.locator('[data-action="lfea-workbench-select-fixable"]');
    await expect(selectFixableBtn).toBeVisible();
    await selectFixableBtn.click();

    const bulkEditBtn = page.locator('[data-action="lfea-workbench-bulk-edit"]');
    await bulkEditBtn.click();
    const bulkEditor = page.locator('[data-role="lfea-workbench-bulk-editor"]');
    await expect(bulkEditor).toBeVisible();
    await expect(bulkEditor).toContainText('New value (mm');

    const scopeSelect = page.locator('[data-role="lfea-workbench-bulk-scope"]');
    await expect(scopeSelect).toContainText('All elements (96)');
    await expect(scopeSelect).toContainText('Selected fixable elements (0)');

    const bulkCancelBtn = page.locator('[data-action="lfea-workbench-bulk-cancel"]');
    await bulkCancelBtn.click();
    await expect(bulkEditor).toBeHidden();

    // AC7: Primary 5–7 click reference path
    // Click 1: [Prepare prototype]
    const prepareBtn = page.locator('[data-action="lfea-workbench-prepare-prototype"]');
    await prepareBtn.click();
    logAction('click', 'prepare-prototype', 'Click 1/7');

    // Click 2: [Use preset]
    const presetBtn = page.locator('[data-action="lfea-workbench-use-preset"]');
    await presetBtn.click();
    logAction('click', 'use-preset', 'Click 2/7');

    // Click 3: [Preview changes]
    const previewBtn = page.locator('[data-action="lfea-workbench-preview"]');
    await previewBtn.click();
    logAction('click', 'preview-changes', 'Click 3/7');

    const footerSummary = page.locator('[data-role="lfea-workbench-footer-summary"]');
    await expect(footerSummary).toContainText(/Preview: status BLOCK → (WARN|CONDITIONAL)/);

    // Click 4: [Apply & recheck]
    const applyBtn = page.locator('[data-action="lfea-workbench-apply"]');
    await applyBtn.click();
    logAction('click', 'apply-and-recheck', 'Click 4/7');

    await expect(runBlocker).toContainText('Run blocked: Review and accept prototype assumptions');
    await expect(page.locator('.lfea-workbench-lane--resolve_settings')).toContainText('Component basis resolved');

    // Click 5: [Review together]
    const reviewBtn = page.locator('[data-action="lfea-workbench-review-together"]');
    await reviewBtn.click();
    logAction('click', 'review-together', 'Click 5/7');

    const reviewSheet = page.locator('[data-role="lfea-workbench-review-sheet"]');
    await expect(reviewSheet).toBeVisible();

    // AC5: Verify empty/whitespace input cases and disabled Accept (Claim 1)
    const reviewerInput = reviewSheet.locator('[data-role="lfea-error-check-reviewer"]');
    const reasonInput = reviewSheet.locator('[data-role="lfea-error-check-reason"]');
    const acceptBtn = reviewSheet.locator('button[data-role="lfea-error-check-accept-limitations"]');
    // Neither settings preset nor Preview may fabricate approval identity.
    await expect(reviewerInput).toHaveValue('');
    await expect(reasonInput).toHaveValue('');
    await expect(acceptBtn).toBeDisabled();

    await reviewerInput.fill('');
    await reasonInput.fill('');
    await expect(acceptBtn).toBeDisabled();

    await reviewerInput.fill('   ');
    await reasonInput.fill('   ');
    await expect(acceptBtn).toBeDisabled();

    await reviewerInput.fill('Verified Lead Stress Engineer');
    await reasonInput.fill('');
    await expect(acceptBtn).toBeDisabled();

    await reasonInput.fill('Verified prototype review for preliminary sizing');
    await expect(acceptBtn).toBeEnabled();

    // Click 6: [Accept these assumptions for this prototype run]
    await acceptBtn.click();
    logAction('click', 'accept-limitations', 'Click 6/7 (with confirmed reviewer and reason)');
    await expect(reviewSheet).toBeHidden();

    await expect(runBlocker).toContainText('Run authorized: Ready for prototype execution');

    // Click 7: [Run prototype] -> executes solver
    const runBtn = page.locator('[data-action="lfea-workbench-run"]');
    await expect(runBtn).toBeEnabled();
    await runBtn.click();
    logAction('click', 'run-prototype', 'Click 7/7: Solves exact requested cases');

    // AC8 & AC9: Prototype Output and Results Verification
    const outputStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="OUTPUT"]');
    await expect(outputStep).toHaveClass(/--active/, { timeout: 30000 });

    const resultsSummary = page.locator('[data-role="lfea-pipeline-results-summary"]');
    await expect(resultsSummary).toBeVisible();
    await expect(resultsSummary).toContainText('Nodes');
    await expect(resultsSummary).toContainText('Max displacement');

    const codeAssessmentStatus = page.locator('[data-role="lfea-results-authority-code-status"]');
    await expect(codeAssessmentStatus).toContainText('NOT_PERFORMED');

    // AC8: Select the actual signed I/J element end-action view, NOT displacements.
    const selectedCase = page.locator('[data-role="lfea-pipeline-results-cases"] [data-case-id][data-active="true"]');
    const caseId = await selectedCase.getAttribute('data-case-id');
    expect(caseId).toBeTruthy();
    const forcesView = page.locator('[data-role="lfea-pipeline-results-views"] [data-view="ELEMENT_FORCES"]');
    await forcesView.click();
    logAction('click', 'view-ELEMENT_FORCES', 'Switch to Element forces view');
    await expect(forcesView).toHaveAttribute('data-active', 'true');
    await expect(page.locator('[data-role="lfea-pipeline-element-actions-basis"]'))
      .toContainText('signed joint-on-element I/J end actions');
    const outputRows = page.locator('[data-role="lfea-pipeline-results-table"] tr');
    await expect(outputRows.nth(1)).toBeVisible();
    const firstDisplayed = await outputRows.nth(1).locator('td').allTextContents();

    // Save Output screenshot
    await page.screenshot({ path: 'evidence/aa3-56/output-screenshot.png' });

    // AC8: Export selected case/view exactly as shown on Output.
    const exportStep = page.locator('[data-role="lfea-pipeline-step"][data-step-id="EXPORT"]');
    await expect(exportStep).toBeEnabled();
    await exportStep.click();

    const exportPanel = page.locator('[data-role="lfea-pipeline-export-panel"]');
    await expect(exportPanel).toBeVisible();
    await expect(page.locator('[data-role="lfea-pipeline-export-summary"]')).toContainText('Element forces');

    const csvBtn = exportPanel.locator('[data-action="lfea-pipeline-results-csv"]');
    await expect(csvBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      csvBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe(`${caseId}-element_forces.csv`);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csvBuffer = Buffer.concat(chunks);
    const csvText = csvBuffer.toString('utf-8');

    // Retain exact downloaded CSV and action ledger
    fs.mkdirSync('evidence/aa3-56', { recursive: true });
    fs.writeFileSync('evidence/aa3-56/downloaded-results.csv', csvBuffer);
    fs.writeFileSync('evidence/aa3-56/action-ledger.json', JSON.stringify(actionLedger, null, 2));

    // Numerical, format and coordinate frame assertions on downloaded CSV
    expect(csvText).toContain('Element,End,FX_N,FY_N,FZ_N,MX_Nm,MY_Nm,MZ_Nm');
    const lines = csvText.trim().split(/\r?\n/);
    expect(lines.length).toBe(337); // 1 header + 168 elements x 2 ends (I/J)
    const seen = new Map();
    for (const line of lines.slice(1)) {
      const [element, end, ...signed] = line.split(',');
      expect(element.trim()).not.toBe('');
      expect(['I', 'J']).toContain(end);
      expect(signed).toHaveLength(6);
      for (const val of signed) expect(Number.isFinite(Number(val))).toBe(true);
      seen.set(element, new Set([...(seen.get(element) ?? []), end]));
    }
    for (const ends of seen.values()) expect([...ends].sort()).toEqual(['I', 'J']);
    const firstCsv = lines[1].split(',');
    expect(firstCsv.slice(0, 2)).toEqual(firstDisplayed.slice(0, 2));
    expect(firstCsv.slice(2).map(Number)).toEqual(firstDisplayed.slice(2).map(Number));
    // Numerical oracle check for element IXP.E10
    const rowE10I = lines.find((l) => l.startsWith('IXP.E10,I,'));
    expect(rowE10I).toBeDefined();
    const partsE10I = rowE10I.split(',').map((s) => s.trim());
    expect(partsE10I).toEqual(['IXP.E10', 'I', '-129.940', '2873.514', '-3.482e-9', '2711.784', '200.238', '-82.357']);
    const rowE10J = lines.find((l) => l.startsWith('IXP.E10,J,'));
    expect(rowE10J).toBeDefined();
    const partsE10J = rowE10J.split(',').map((s) => s.trim());
    expect(partsE10J).toEqual(['IXP.E10', 'J', '129.940', '-1330.947', '3.482e-9', '-487.624', '-62.761', '82.364']);
    expect(Math.abs(Number(partsE10I[2]) + Number(partsE10J[2]))).toBeLessThan(1e-3);

    // AC10: Test Scenarios demonstration on isolated disposable candidate (Claim 3)
    await errorCheckStep.click();
    const scenariosBtn = page.locator('[data-action="lfea-workbench-toggle-scenarios"]');
    await scenariosBtn.click();
    const scenariosDialog = page.locator('[data-role="lfea-workbench-test-scenarios"]');
    await expect(scenariosDialog).toBeVisible();

    // 1. Unset basis negative scenario
    const unsetBasisBtn = page.locator('[data-action="lfea-workbench-test-unset-basis"]');
    await unsetBasisBtn.click();
    const scenarioResult = page.locator('[data-role="lfea-workbench-scenario-result"]');
    await expect(scenarioResult).toBeVisible();
    await expect(scenarioResult).toContainText('BLOCK');
    await expect(scenarioResult).toContainText('Run blocked: Choose B31/B31J component basis in Resolve shared settings');
    await expect(scenarioResult).toContainText('live state unchanged');

    // 2. Missing property negative scenario
    const missingPropBtn = page.locator('[data-action="lfea-workbench-test-missing-property"]');
    await missingPropBtn.click();
    await expect(scenarioResult).toContainText('BLOCK');
    await expect(scenarioResult).toContainText('Run blocked: Correct model input defect in Fix inputs');

    // 3. Stale override negative scenario
    const staleOverrideBtn = page.locator('[data-action="lfea-workbench-test-stale-override"]');
    await staleOverrideBtn.click();
    await expect(scenarioResult).toContainText('BLOCK');
    await expect(scenarioResult).toContainText('Rejected: Workbench token is stale');

    // 4. Recovery
    const recoverBtn = page.locator('[data-action="lfea-workbench-recover-scenario"]');
    await recoverBtn.click();
    await expect(scenarioResult).toContainText('Recovery verified: disposable scenario cleared');
    await expect(scenarioResult).toContainText('checked live snapshot, preparation, source, overrides and shared component basis unchanged');

    const closeScenariosBtn = page.locator('[data-action="lfea-workbench-close-scenarios"]');
    await closeScenariosBtn.click();
    await expect(scenariosDialog).toBeHidden();

    // AC11: Responsive layout test (<880px)
    await page.setViewportSize({ width: 780, height: 900 });
    await expect(workbenchView).toBeVisible();
    await expect(page.locator('.lfea-workbench-lane--fix_inputs')).toBeVisible();
    await expect(runBtn).toBeVisible();
    // Keyboard/focus smoke test, distinct from pointer click ledger.
    await presetBtn.focus();
    await expect(presetBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(previewBtn).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(presetBtn).toBeFocused();
    const primary = actionLedger.filter(({ detail }) => /^Click [1-7]\/7/u.test(detail));
    expect(primary.map((item) => item.target)).toEqual([
      'prepare-prototype', 'use-preset', 'preview-changes', 'apply-and-recheck',
      'review-together', 'accept-limitations', 'run-prototype',
    ]);
  });
});
