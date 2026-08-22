import fs from 'node:fs';
import { expect, test } from '@playwright/test';

// Disclosed scope: no real CAESAR II .accdb binary is committed to this
// repo (the one used during Phase 4 development lives only in a sibling
// repo, and fabricating a synthetic Access-database binary good enough
// for mdb-reader to parse is out of proportion for this phase -- see the
// LFEA revamp plan's Phase 7 note). This spec proves the panel itself is
// real and correctly wired -- mounted, disclosing its synthetic
// PIPINGELEMENT identity, and offering a real import control -- not a
// full ACCDB solve through the real file input.
//
// UI04 gated every source panel's visibility behind data-active-source,
// which the shared engineering session only sets once a file has parsed
// far enough to yield a real element count (see
// syncLfeaEngineeringSessionFromControllers in src/main.js). That is
// correct -- a garbage upload must not silently claim the session -- but
// it also means this panel cannot be mounted and visible without a file
// that is at least structurally valid enough to parse, same as the
// sibling real-model spec. Reuse its fixture gate rather than asserting
// against a state (a visible panel with no successful parse) the current,
// intentional architecture cannot produce.
const fixturePath = process.env.LFEA_ACCDB_FIXTURE ?? '';

test.skip(
  fixturePath === '' || !fs.existsSync(fixturePath),
  'Set LFEA_ACCDB_FIXTURE to a real CAESAR II .accdb to run this spec.',
);

test('ACCDB panel mounts with its synthetic-identity disclosure and a real import control', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);

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

  // The panel only becomes visible once the fixture has actually parsed
  // (see the fixture-gate note above), so a real verdict is already in,
  // not the pre-parse NOT_LOADED placeholder.
  await expect(accdbPanel).toHaveAttribute('data-model-health-status', /BLOCK|CONDITIONAL|PASS/);

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

  // No manual override has been applied yet -- the loaded model's own
  // element-property override custody is exercised by the real-model spec.
  await expect(accdbPanel).toHaveAttribute('data-override-count', '0');
});
