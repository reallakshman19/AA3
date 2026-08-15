import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { createEmpiricalV3Wp2rProductFixture } from './fixtures/empirical-v3-wp2r-product-fixture.js';

const fixture = createEmpiricalV3Wp2rProductFixture();

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d'; });
  await page.goto('/');
});

test('Branch Basis and Safety Gate present one governed risk identity without bulk approval', async ({ page }) => {
  await loadPackage(page, fixture.packages.blocked);
  const workbench = page.locator('[data-role="empirical-v3-safety-workbench"]');
  await expect(workbench).toContainText('Empirical V3 Safety & Evidence');

  const branchContent = workbench.locator('.empirical-v3-safety__content');
  await expect(branchContent).toContainText('180 degC');
  await expect(branchContent).toContainText('210 degC');
  await expect(branchContent).toContainText('P101 · PIPE');
  await expect(branchContent).toContainText('P203 · PIPE');
  await expect(branchContent).toContainText('HIGH_BLOCK');
  await expect(branchContent).toContainText('HIGH_CONFIRM');

  await workbench.getByRole('tab', { name: 'Safety Gate' }).click();
  await expect(branchContent).toContainText('Workflow: HIGH_BLOCK_PRESENT');
  await expect(branchContent).toContainText('BLOCKERS 1');
  await expect(branchContent).toContainText('HIGH REVIEW 1');
  await expect(branchContent).toContainText('WARNINGS 1');

  const blocker = branchContent.locator(`[data-risk-id="${fixture.risks.blocker.riskId}"]`);
  const reviewable = branchContent.locator(`[data-risk-id="${fixture.risks.highConfirm.riskId}"]`);
  await expect(blocker).toContainText('BLOCKED — no confirmation path');
  await expect(blocker.getByText('Review assumption')).toHaveCount(0);
  await expect(blocker.getByRole('button', { name: 'Create confirmation receipt' })).toHaveCount(0);
  await expect(reviewable).toContainText('REVIEW REQUIRED');
  await expect(reviewable.getByText('Review assumption')).toHaveCount(1);
  await expect(branchContent.getByText(/Accept all High/i)).toHaveCount(0);
  await expect(branchContent.locator('[data-action="empirical-v3-run"]')).toBeDisabled();

  const branchRiskId = await page.evaluate((riskId) => {
    AnalysisWorkspace.openEmpiricalV3SafetyRisk(riskId);
    return document.querySelector('[data-role="empirical-v3-safety-workbench"] [data-focused="true"]')?.dataset.riskId || null;
  }, fixture.risks.highConfirm.riskId);
  expect(branchRiskId).toBe(fixture.risks.highConfirm.riskId);

  await loadPackage(page, fixture.packages.reviewRequired);
  await workbench.getByRole('tab', { name: 'Safety Gate' }).click();
  await expect(branchContent).toContainText('Workflow: HIGH_CONFIRM_PENDING');
  await expect(branchContent).toContainText('BLOCKERS 0');
  await expect(branchContent).toContainText('HIGH REVIEW 1');
  await expect(branchContent.locator(`[data-risk-id="${fixture.risks.highConfirm.riskId}"]`)).toContainText('REVIEW REQUIRED');

  // Sealed authorization alone does not make browser Run ready; exact prepared
  // source-bound execution custody is separately required.
  await loadPackage(page, fixture.packages.authorized);
  await workbench.getByRole('tab', { name: 'Safety Gate' }).click();
  await expect(branchContent).toContainText('Workflow: CALCULATION_AUTHORIZED');
  await expect(branchContent.locator('[data-action="empirical-v3-run"]')).toBeDisabled();
});

test('Explain modes, result review, audit export and stale rollback share sealed identities', async ({ page }) => {
  await loadPackage(page, fixture.packages.resultRequired);
  const workbench = page.locator('[data-role="empirical-v3-safety-workbench"]');
  await workbench.getByRole('tab', { name: 'Explain Calculation' }).click();
  const content = workbench.locator('.empirical-v3-safety__content');

  const before = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyState());
  expect(before.explainMode).toBe('SUMMARY');
  await expect(content).toContainText('Result summary');
  await expect(content).toContainText('TIP-X');
  await expect(content).toContainText('TIP-Y');
  await expect(content).not.toContainText('Sealed coupled system');

  await content.locator('[data-explain-mode="TRACE"]').click();
  await expect(content).toContainText('Coupled equations');
  await expect(content).toContainText('(F+S) R = delta_target - delta_reference');
  await expect(content).toContainText('Sealed coupled system');
  await expect(content).toContainText('E102 · CIRCULAR_ELBOW');
  await expect(content).not.toContainText('Full audit references');

  await content.locator('[data-explain-mode="FULL_AUDIT"]').click();
  await expect(content).toContainText('Evidence custody');
  await expect(content).toContainText('Full audit references');
  await expect(content).toContainText(fixture.risks.highConfirm.riskId);
  await expect(content).toContainText(fixture.confirmation.receiptId);
  await expect(content).toContainText('UI/report may solve mechanics');
  await expect(content).toContainText('false');

  const afterModes = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyState());
  expect(afterModes.packageSemanticHash).toBe(before.packageSemanticHash);
  expect(afterModes.riskSetSemanticHash).toBe(before.riskSetSemanticHash);
  expect(afterModes.calculationEvidenceSemanticHash).toBe(before.calculationEvidenceSemanticHash);
  expect(afterModes.explainMode).toBe('FULL_AUDIT');

  await workbench.getByLabel('Reviewer').fill('WP2R browser engineer');
  await workbench.getByLabel('Review conclusion / comment').fill('Sealed coupled evidence reviewed against the fixture oracle.');
  await workbench.getByRole('button', { name: 'Record result review' }).click();
  await expect(content).toContainText('Current review:');
  await expect(content).toContainText('Audit readiness is a separate governed transition.');
  const reviewed = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyState());
  expect(reviewed.workflowState).toBe('RESULT_REVIEWED');
  expect(reviewed.resultReviewReceiptId).toBeTruthy();
  expect(reviewed.auditReadinessId).toBeNull();

  await workbench.getByRole('button', { name: 'Prepare audit' }).click();
  const auditReady = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyState());
  expect(auditReady.workflowState).toBe('AUDIT_EXPORT_READY');
  expect(auditReady.auditReadinessId).toBeTruthy();
  await expect(workbench.getByRole('button', { name: 'Download Audit JSON' })).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    workbench.getByRole('button', { name: 'Download Audit JSON' }).click(),
  ]);
  const audit = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(audit.calculationEvidence.semanticHash).toBe(fixture.evidence.semanticHash);
  expect(audit.governedSafetyPackage.riskSet.risks.map((row) => row.riskId)).toContain(fixture.risks.highConfirm.riskId);
  expect(audit.governedSafetyPackage.confirmations.map((row) => row.riskRef.riskId)).toContain(fixture.risks.highConfirm.riskId);
  expect(audit.governedSafetyPackage.records.some((row) => row.kind === 'ENGINEERING_EVENT' && row.record.eventType === 'AUDIT_EXPORTED')).toBe(true);

  const currentBasis = currentAuthorizationBasis();
  const mutatedBasis = {
    ...currentBasis,
    dependencies: currentBasis.dependencies.map((row, index) => index === 0
      ? { ...row, semanticHash: 'fnv1a64:ffffffffffffffff' }
      : row),
  };
  const stale = await page.evaluate((basis) => AnalysisWorkspace.reconcileEmpiricalV3CurrentAuthorization(basis), mutatedBasis);
  expect(stale.current).toBe(false);
  expect(stale.reasons).toContain('DEPENDENCY_IDENTITY_CHANGED');

  const staleState = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyState());
  expect(staleState.workflowState).toBe('SAFETY_CLEARED');
  expect(staleState.calculationEvidenceId).toBeNull();
  const stalePackage = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyPresentationPackage());
  expect(stalePackage.workflow.facts.calculationResult.current).toBe(false);
  expect(stalePackage.workflow.facts.resultReview.current).toBe(false);
  expect(stalePackage.workflow.facts.audit.current).toBe(false);
  expect(stalePackage.records.some((row) => row.kind === 'CALCULATION_EVIDENCE' && row.semanticHash === fixture.evidence.semanticHash)).toBe(true);

  // Re-loading the same sealed pre-stale result reconstructs the same evidence
  // without manufacturing a new confirmation receipt.
  await loadPackage(page, fixture.packages.resultRequired);
  const remounted = await page.evaluate(() => AnalysisWorkspace.getEmpiricalV3SafetyState());
  expect(remounted.workflowState).toBe('RESULT_REVIEW_REQUIRED');
  expect(remounted.calculationEvidenceSemanticHash).toBe(fixture.evidence.semanticHash);
  expect(remounted.lastConfirmationReceiptId).toBeNull();
});

async function loadPackage(page, packageValue) {
  await page.evaluate((value) => AnalysisWorkspace.loadEmpiricalV3SafetyPresentationPackage(value), packageValue);
}

function currentAuthorizationBasis() {
  return {
    runId: fixture.runId,
    policyId: 'EMPIRICAL_V3_WP2R_PRODUCT_POLICY',
    policyVersion: '1',
    dependencies: fixture.dependencies,
    riskSet: fixture.riskSets.review,
    confirmations: [fixture.confirmation],
  };
}
