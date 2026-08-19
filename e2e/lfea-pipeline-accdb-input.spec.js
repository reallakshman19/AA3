import { expect, test } from '@playwright/test';

// Disclosed scope: no real CAESAR II .accdb binary is committed to this
// repo (the one used during Phase 4 development lives only in a sibling
// repo, and fabricating a synthetic Access-database binary good enough
// for mdb-reader to parse is out of proportion for this phase -- see the
// LFEA revamp plan's Phase 7 note). This spec proves the panel itself is
// real and correctly wired -- mounted, disclosing its synthetic
// PIPINGELEMENT identity, and offering a real import control -- not a
// full ACCDB solve through the real file input.
test('ACCDB panel mounts with its synthetic-identity disclosure and a real import control', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  const accdbPanel = page.locator('[data-role="lfea-pipeline-accdb-input-panel"]');
  await expect(accdbPanel).toBeVisible();
  // The panel's own title, not "any text mentioning ACCDB" -- five separate
  // elements legitimately say ACCDB (title, import button, status line,
  // identity disclosure, empty-state), which made the loose matcher a strict
  // mode violation rather than a check of anything.
  await expect(accdbPanel.locator('.accordion-section-title')).toContainText('ACCDB');

  const disclosure = page.locator('[data-role="accdb-identity-disclosure"]');
  await expect(disclosure).toBeVisible();
  await expect(disclosure).toContainText('synthetic');
  await expect(disclosure).toContainText('PIPINGELEMENT');

  const importButton = page.locator('[data-action="import-lfea-pipeline-accdb-source"]');
  await expect(importButton).toBeVisible();
  await expect(importButton).toBeEnabled();

  const fileInput = page.locator('[data-role="lfea-pipeline-accdb-source-file"]');
  await expect(fileInput).toHaveAttribute('accept', /accdb/);

  // Before any file is loaded, the panel discloses "no source" rather
  // than a fabricated verdict.
  await expect(accdbPanel).toHaveAttribute('data-model-health-status', 'NOT_LOADED');

  // The verdict is read through a chosen analysis profile. The default is
  // the disclosed approximation profile (matching the InputXML surface):
  // strict is the stricter claim and is selected deliberately, never landed
  // on. Without this control the panel showed every declared-approximation
  // finding at the strict profile's BLOCK severity.
  const profileSelect = page.locator('[data-role="lfea-pipeline-accdb-profile"]');
  await expect(profileSelect).toBeVisible();
  await expect(profileSelect).toHaveValue('DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1');
  await expect(accdbPanel).toHaveAttribute('data-requested-profile', 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1');
  await expect(profileSelect.locator('option')).toHaveCount(2);

  await profileSelect.selectOption('STRICT_INPUTXML_LINEAR_STATIC_V1');
  await expect(accdbPanel).toHaveAttribute('data-requested-profile', 'STRICT_INPUTXML_LINEAR_STATIC_V1');

  // No source is loaded, so there are no element properties to override and
  // no override custody to offer.
  await expect(accdbPanel).toHaveAttribute('data-override-count', '0');
  await expect(page.locator('[data-action="toggle-lfea-pipeline-accdb-properties"]')).toHaveCount(0);
});
