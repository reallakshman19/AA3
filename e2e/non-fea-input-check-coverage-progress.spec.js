import { expect, test } from '@playwright/test';

const PARTIAL_MASS_PACKAGE = {
  schema: 'inputxml-managed-stage/v1',
  packageHash: 'NON-FEA-PARTIAL-MASS-COVERAGE',
  unit: 'mm',
  objects: [
    {
      id: 'PIPES', name: 'Pipes', type: 'BRANCH',
      children: [
        pipe('PIPE-A', [0, 0, 0], [1000, 0, 0], { unitPipeWeightKgPerM: 10, opeFluidWeightKgPerM: 2 }),
        pipe('PIPE-B', [1000, 0, 0], [2000, 0, 0], { unitPipeWeightKgPerM: 10 }),
        pipe('PIPE-C', [2000, 0, 0], [3000, 0, 0], {}),
      ],
    },
    {
      id: 'SUPPORTS', name: 'Supports', type: 'GROUP',
      children: [
        support('SUP-START', [0, 0, 0], 'PIPE-A:port:start'),
        support('SUP-END', [3000, 0, 0], 'PIPE-C:port:end'),
      ],
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d'; });
});

test('shows unique-entity progress and coherent cause navigation while mass coverage stays fail-closed', async ({ page }) => {
  await page.goto('/');
  await uploadJson(page, 'partial-mass-coverage.json', PARTIAL_MASS_PACKAGE);
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();

  const consumer = page.locator('[data-role="load-calc-consumer"]');
  await loadCalcTab(consumer, 'preflight').click();

  const inputCheck = page.locator('[data-role="non-fea-input-check"]');
  const massCause = inputCheck.locator('[data-root-cause-code="MASS_COVERAGE_INCOMPLETE"]');
  await expect(massCause).toBeVisible();
  await expect(massCause).toHaveAttribute('data-cause-kind', 'shared');
  await expect(inputCheck).toHaveAttribute('data-state', 'BLOCKED');

  const causeLegend = inputCheck.locator('[aria-label="Blocker grouping legend"]');
  await expect(causeLegend.locator('[data-cause-kind="shared"]')).toContainText('SHARED CAUSE');
  await expect(causeLegend.locator('[data-cause-kind="single"]')).toContainText('SINGLE CAUSE');
  await expect(causeLegend.locator('[data-cause-kind="rollup"]')).toContainText('GATE ROLLUP');
  await expect(inputCheck.locator('[data-rollup="true"]').filter({ hasText: 'F_METHOD_READINESS' })).toBeVisible();

  const initialProgress = massCause.locator('[data-coverage-code="MASS_COVERAGE_INCOMPLETE"]');
  await expect(initialProgress).toHaveAttribute('data-coverage-total', '3');
  await expect(initialProgress).toHaveAttribute('data-coverage-resolved-entities', '1');
  await expect(initialProgress).toHaveAttribute('data-coverage-unresolved-entities', '2');
  await expect(initialProgress).toHaveAttribute('data-coverage-missing-obligations', '3');
  await expect(initialProgress).toHaveAttribute('data-coverage-checker-covered', '0');
  await expect(initialProgress).toContainText('1 of 3 governed entities resolved');
  await expect(initialProgress).toContainText('2 unresolved entities');
  await expect(initialProgress).toContainText('3 missing evidence obligations');
  await expect(initialProgress).toContainText('Calculation remains BLOCKED');

  const initialDetail = massCause.locator('[data-coverage-entity-detail="MASS_COVERAGE_INCOMPLETE"]');
  await initialDetail.locator('summary').click();
  await expect(initialDetail.locator('li')).toHaveCount(2);
  await expect(initialDetail).toContainText('OPERATING_FLUID');
  await expect(initialDetail).toContainText('PIPE_MASS');
  await expect(consumer.locator('[data-load-calc-run]')).toBeDisabled();

  await massCause.getByRole('button', { name: 'Open Enrichment & Overrides' }).click();
  const enrichment = page.locator('[data-role="non-fea-enrichment"]');
  await expect(enrichment).toBeVisible();
  await expect(enrichment.locator('.nfe__boundary')).toContainText('only the common checker can clear a blocker');

  const form = enrichment.locator('[data-enrichment-proposal-form]');
  await fillProposal(form, {
    recordId: 'PARTIAL-PIPE-B-OPE',
    selectorKey: 'PIPE-B',
    fieldId: 'OPERATING_FLUID_WEIGHT',
    value: '2',
    unit: 'kg/m',
    rationale: 'Resolve only PIPE-B operating-fluid evidence; leave PIPE-C deliberately unresolved.',
  });
  await form.getByRole('button', { name: 'Stage proposal' }).click();

  const proposals = enrichment.locator('[data-role="enrichment-proposals"]');
  const opeProposal = proposals.locator('tr').filter({ hasText: 'PARTIAL-PIPE-B-OPE' });
  await expect(opeProposal).toBeVisible();
  await expect(opeProposal.locator('[data-validate-input-cause="MASS_COVERAGE_INCOMPLETE"]')).toBeVisible();
  await opeProposal.getByRole('button', { name: 'Accept exact' }).click();

  const accepted = enrichment.locator('[data-role="enrichment-accepted"]');
  const acceptedOpe = accepted.locator('tr').filter({ hasText: 'PARTIAL-PIPE-B-OPE' });
  await expect(acceptedOpe).toBeVisible();
  await expect(acceptedOpe.locator('[data-validate-input-cause="MASS_COVERAGE_INCOMPLETE"]')).toBeVisible();
  const acceptanceMessage = enrichment.locator('.message')
    .filter({ hasText: 'Accepted exact enrichment record PARTIAL-PIPE-B-OPE.' });
  await expect(acceptanceMessage).toContainText('MASS_COVERAGE_INCOMPLETE');
  await expect(acceptanceMessage).toContainText('Validate Input must re-evaluate before any blocker can be considered cleared');

  await fillProposal(form, {
    recordId: 'PARTIAL-PIPE-C-OD',
    selectorKey: 'PIPE-C',
    fieldId: 'PIPE_OUTER_DIAMETER',
    value: '114.3',
    unit: 'mm',
    rationale: 'Exercise cross-tab dependency disclosure without accepting section evidence.',
  });
  await form.getByRole('button', { name: 'Stage proposal' }).click();
  const odProposal = proposals.locator('tr').filter({ hasText: 'PARTIAL-PIPE-C-OD' });
  await expect(odProposal.locator('[data-validate-input-cause="SECTION_COVERAGE_INCOMPLETE"]')).toBeVisible();
  await expect(odProposal.locator('[data-validate-input-cause="FLEXURAL_COVERAGE_INCOMPLETE"]')).toBeVisible();
  await expect(odProposal.locator('[data-validate-input-cause="MASS_COVERAGE_INCOMPLETE"]')).toBeVisible();
  await odProposal.getByRole('button', { name: 'Reject' }).click();
  await expect(proposals.locator('tr').filter({ hasText: 'PARTIAL-PIPE-C-OD' })).toHaveCount(0);

  await enrichment.getByRole('button', { name: 'Open Validate Input' }).click();
  const updatedMassCause = inputCheck.locator('[data-root-cause-code="MASS_COVERAGE_INCOMPLETE"]');
  await expect(updatedMassCause).toBeVisible();
  const updatedProgress = updatedMassCause.locator('[data-coverage-code="MASS_COVERAGE_INCOMPLETE"]');
  await expect(updatedProgress).toHaveAttribute('data-coverage-total', '3');
  await expect(updatedProgress).toHaveAttribute('data-coverage-resolved-entities', '2');
  await expect(updatedProgress).toHaveAttribute('data-coverage-unresolved-entities', '1');
  await expect(updatedProgress).toHaveAttribute('data-coverage-missing-obligations', '2');
  await expect(updatedProgress).toHaveAttribute('data-coverage-checker-covered', '1');
  await expect(updatedProgress).toContainText('2 of 3 governed entities resolved');
  await expect(updatedProgress).toContainText('1 unresolved entity');
  await expect(updatedProgress).toContainText('2 missing evidence obligations');
  await expect(updatedProgress).toContainText('Calculation remains BLOCKED');

  const updatedDetail = updatedMassCause.locator('[data-coverage-entity-detail="MASS_COVERAGE_INCOMPLETE"]');
  await updatedDetail.locator('summary').click();
  await expect(updatedDetail.locator('li')).toHaveCount(1);
  await expect(updatedDetail).toContainText('OPERATING_FLUID');
  await expect(updatedDetail).toContainText('PIPE_MASS');
  await expect(inputCheck).toHaveAttribute('data-state', 'BLOCKED');
  await expect(consumer.locator('[data-load-calc-run]')).toBeDisabled();
});

function loadCalcTab(consumer, tabId) {
  const primary = consumer.locator('.empirical-load-calc__workflow').locator(`[data-load-calc-tab="${tabId}"]`);
  const advanced = consumer.locator('.empirical-load-calc__advanced');
  return {
    async click() {
      if (await primary.count()) {
        await primary.click();
        return;
      }
      if (await advanced.getAttribute('open') === null) await advanced.locator('summary').click();
      await advanced.locator('.empirical-load-calc__tabs').locator(`[data-load-calc-tab="${tabId}"]`).click();
    },
  };
}

async function uploadJson(page, name, payload) {
  await page.locator('[data-role="dataset-file"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
}

async function fillProposal(form, { recordId, selectorKey, fieldId, value, unit, rationale }) {
  await form.locator('[name="recordId"]').fill(recordId);
  await form.locator('[name="selectorKind"]').selectOption('ENTITY');
  await form.locator('[name="selectorKey"]').fill(selectorKey);
  await form.locator('[name="fieldId"]').selectOption(fieldId);
  await form.locator('[name="value"]').fill(value);
  await form.locator('[name="unit"]').fill(unit);
  await form.locator('[name="authority"]').selectOption('ACCEPTED_OVERRIDE');
  await form.locator('[name="sourceId"]').fill('PARTIAL-COVERAGE-TEST');
  await form.locator('[name="revision"]').fill('1');
  await form.locator('[name="rationale"]').fill(rationale);
}

function pipe(id, startPoint, endPoint, massEvidence) {
  const sourceAttributes = {
    LINE_ID: 'LINE-NON-FEA', SYSTEM_ID: 'SYS-NON-FEA',
    EI_N_M2: 2000000,
    INSULATION_THICKNESS_MM: 0,
    FLUID_WT_HYD_KG_M: 3,
  };
  if (Number.isFinite(massEvidence.unitPipeWeightKgPerM)) {
    sourceAttributes.UNIT_PIPE_WEIGHT_KG_PER_M = massEvidence.unitPipeWeightKgPerM;
  }
  if (Number.isFinite(massEvidence.opeFluidWeightKgPerM)) {
    sourceAttributes.FLUID_WT_OPE_KG_M = massEvidence.opeFluidWeightKgPerM;
  }
  return {
    id, name: id, type: 'PIPE', sourcePath: `/MODEL/PIPES/${id}`,
    sourceAttributes,
    nativeParams: { startPoint, endPoint },
  };
}

function support(id, position, attachedPortId) {
  return {
    id, name: id, type: 'SUPPORT', sourcePath: `/MODEL/SUPPORTS/${id}`,
    sourceAttributes: {
      LINE_ID: 'LINE-NON-FEA', SYSTEM_ID: 'SYS-NON-FEA',
      POS: { x: position[0], y: position[1], z: position[2] },
      ATTACHED_PORT_ID: attachedPortId, SUPPORT_TYPE: 'ANCHOR', VERTICAL_CAPABILITY: 'RESTRAINED',
    },
  };
}
